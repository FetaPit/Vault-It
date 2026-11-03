"""Sleeve B daily step: dividends, DRIP, protective stops, tranches, buy signals."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Mapping

from trading.config import TradingConfig
from trading.fees import fill_costs, market_fill_price
from trading.fx import FxConverter
from trading.killswitch import KillSwitch
from trading.mathutil import EPS, floor_to_step
from trading.models import EntryType, Side, Signal, Sleeve
from trading.sleeve_b.events import EventCalendar, EventType
from trading.sleeve_b.portfolio import DividendPortfolio
from trading.sleeve_b.tranches import plan_profit_taking


@dataclass(frozen=True, slots=True)
class SleeveBAction:
    kind: str   # "dividend_credit" | "drip_buy" | "protective_stop_sell" | "tranche_sell"
    symbol: str
    quantity: float
    price_gbp: float
    amount_gbp: float
    fees_gbp: float
    note: str = ""


@dataclass(frozen=True, slots=True)
class SleeveBReport:
    d: date
    actions: tuple[SleeveBAction, ...]
    buy_signals: tuple[Signal, ...]


class SleeveBManager:
    def __init__(self, cfg: TradingConfig, portfolio: DividendPortfolio, calendar: EventCalendar,
                 kill_switch: KillSwitch, fx: FxConverter) -> None:
        self._cfg = cfg
        self._pf = portfolio
        self._cal = calendar
        self._ks = kill_switch
        self._fx = fx
        self._entitlements: dict[tuple[str, date], float] = {}

    def entitlements(self) -> dict[tuple[str, date], float]:
        return dict(self._entitlements)

    def daily_step(self, d: date, prices_gbp: Mapping[str, float], now: datetime) -> SleeveBReport:
        cfg, pf = self._cfg, self._pf
        bcfg = cfg.sleeve_b
        actions: list[SleeveBAction] = []

        # 1. ex-dividend snapshot (before any buy today)
        for e in self._cal.events_on(d, [EventType.EX_DIVIDEND]):
            assert e.symbol is not None
            h = pf.holding(e.symbol)
            self._entitlements[(e.symbol, d)] = h.quantity if h is not None else 0.0

        # 2. dividend payments
        for e in self._cal.events_on(d, [EventType.DIVIDEND_PAY]):
            assert e.symbol is not None and e.amount is not None and e.ref_date is not None
            qty = self._entitlements.get((e.symbol, e.ref_date), 0.0)
            inst = cfg.instrument(e.symbol)
            if qty > 0 and inst is not None:
                net = pf.credit_dividend(e.symbol, qty * e.amount, inst.dividend_withholding_pct)
                actions.append(SleeveBAction("dividend_credit", e.symbol, qty, e.amount, net, 0.0,
                                             f"ref {e.ref_date.isoformat()}"))

        # 3. DRIP
        if bcfg.reinvest_dividends and not self._ks.is_active():
            for sym in sorted(pf.pool_symbols()):
                act = self._drip(sym, prices_gbp)
                if act is not None:
                    actions.append(act)

        # 4. protective stops
        for sym, h in sorted(pf.holdings().items()):
            price = prices_gbp.get(sym)
            if price is None or price > h.stop_price_gbp:
                continue
            inst, profile = cfg.instruments[sym], cfg.fee_profile_for(sym)
            fill = market_fill_price(price, "sell", profile)
            fees = fill_costs(inst, profile, self._fx, "sell", h.quantity, fill, price).total_fees_gbp
            pf.sell(sym, h.quantity, fill, fees)
            actions.append(SleeveBAction("protective_stop_sell", sym, h.quantity, fill, h.quantity * fill - fees,
                                         fees, f"price {price} <= stop {h.stop_price_gbp}"))

        # 5. tranches
        for sym in sorted(pf.holdings()):
            price = prices_gbp.get(sym)
            live = pf.holding(sym)
            if price is None or live is None:
                continue
            inst, profile = cfg.instruments[sym], cfg.fee_profile_for(sym)
            for ta in plan_profit_taking(live, price, bcfg.tranches, inst.size_step):
                fill = market_fill_price(price, "sell", profile)
                fees = fill_costs(inst, profile, self._fx, "sell", ta.quantity, fill, price).total_fees_gbp
                pf.sell(sym, ta.quantity, fill, fees)
                live.triggered_tranches.add(ta.rule_index)
                actions.append(SleeveBAction("tranche_sell", sym, ta.quantity, fill, ta.quantity * fill - fees,
                                             fees, f"rule {ta.rule_index} gain {ta.gain_pct:.4f}"))

        # 6. buy signals
        signals: list[Signal] = []
        if not self._ks.is_active():
            sleeve_eq = pf.equity(prices_gbp)
            for t in bcfg.targets:
                price = prices_gbp.get(t.symbol)
                if price is None or sleeve_eq <= 0:
                    continue
                if self._cal.is_blackout(t.symbol, d, bcfg.earnings_blackout_days):
                    continue
                if pf.cash_gbp < bcfg.min_trade_gbp:
                    continue
                h = pf.holding(t.symbol)
                mv = h.quantity * price if h is not None else 0.0
                if mv / sleeve_eq < t.weight - bcfg.rebalance_band:
                    signals.append(Signal(
                        signal_id=f"sleeveb-{t.symbol}-{d:%Y%m%d}", ts=now, symbol=t.symbol, side=Side.LONG,
                        entry_type=EntryType.MARKET, entry=price,
                        stop=price * (1 - bcfg.protective_stop_pct), target=None, sleeve=Sleeve.B,
                        source="sleeve_b",
                        rationale=f"underweight {mv / sleeve_eq:.3f} < {t.weight - bcfg.rebalance_band:.3f}"))
        return SleeveBReport(d, tuple(actions), tuple(signals))

    def _drip(self, sym: str, prices: Mapping[str, float]) -> SleeveBAction | None:
        cfg, pf = self._cfg, self._pf
        price = prices.get(sym)
        inst = cfg.instrument(sym)
        if price is None or inst is None or pf.holding(sym) is None:
            return None   # keep the pool until we hold it and have a price
        profile = cfg.fee_profile_for(sym)
        pool = pf.dividend_pool(sym)
        fill = market_fill_price(price, "buy", profile)
        unit = fill * inst.multiplier * (1 + inst.stamp_duty_rate + profile.commission_pct) \
            + profile.commission_per_unit_gbp
        fixed = profile.min_commission_gbp + profile.commission_per_order_gbp
        qty = floor_to_step((pool - fixed) / unit, inst.size_step) if pool - fixed > 0 else 0.0
        if qty < inst.min_size - EPS:
            return None
        fees = total = 0.0
        for _ in range(1000):
            fees = fill_costs(inst, profile, self._fx, "buy", qty, fill, price).total_fees_gbp
            total = qty * fill + fees
            if total <= min(pool, pf.cash_gbp) + EPS or qty <= 0:
                break
            qty = round(qty - inst.size_step, 10)
        if qty < inst.min_size - EPS or qty <= 0 or total > min(pool, pf.cash_gbp) + EPS:
            return None
        pf.buy(sym, qty, fill, fees, None)
        pf.consume_pool(sym, total)
        return SleeveBAction("drip_buy", sym, qty, fill, total, fees)
