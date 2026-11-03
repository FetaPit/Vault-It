"""Paper broker: bracket orders, partial fills, gaps, costs. No live counterpart exists."""
from __future__ import annotations

import dataclasses
from dataclasses import dataclass
from datetime import datetime
from typing import TYPE_CHECKING, Mapping

from trading.config import InstrumentSpec, TradingConfig
from trading.errors import OrderError
from trading.fees import fill_costs, market_fill_price
from trading.fx import FxConverter
from trading.guards import assert_paper_mode
from trading.mathutil import EPS, floor_to_step
from trading.models import (Bar, ClosedTrade, EntryType, ExitReason, Fill, OrderRequest, OrderStatus,
                            Position, Side, Sleeve)

if TYPE_CHECKING:  # pragma: no cover
    from trading.journal import TradeJournal


@dataclass(slots=True)
class _OrderState:
    order: OrderRequest
    risk_gbp: float
    status: OrderStatus = OrderStatus.PENDING
    filled_qty: float = 0.0
    n_fills: int = 0
    risk_used: float = 0.0
    budget_units: float = 0.0


class PaperBroker:
    def __init__(self, cfg: TradingConfig, fx: FxConverter, starting_cash_gbp: float,
                 journal: "TradeJournal | None" = None) -> None:
        assert_paper_mode(cfg)
        if starting_cash_gbp <= 0:
            raise ValueError("starting_cash_gbp must be > 0")
        self._cfg = cfg
        self._fx = fx
        self._cash = starting_cash_gbp
        self._journal = journal
        self._orders: dict[str, _OrderState] = {}
        self._positions: dict[str, Position] = {}
        self._opened_bar: dict[str, datetime] = {}   # position_id -> ts of the bar of first fill
        self._closed: list[ClosedTrade] = []

    # -- state
    @property
    def cash_gbp(self) -> float:
        return self._cash

    @property
    def closed_trades(self) -> tuple[ClosedTrade, ...]:
        return tuple(self._closed)

    def deposit(self, amount_gbp: float, ts: datetime) -> None:
        if amount_gbp <= 0:
            raise ValueError("deposit must be > 0")
        self._cash += amount_gbp

    def open_positions(self, sleeve: Sleeve | None = None) -> tuple[Position, ...]:
        return tuple(dataclasses.replace(p) for p in self._positions.values()
                     if sleeve is None or p.sleeve == sleeve)

    def pending_orders(self) -> tuple[OrderRequest, ...]:
        return tuple(s.order for s in self._orders.values() if self._is_live(s))

    def order_status(self, order_id: str) -> OrderStatus:
        return self._orders[order_id].status

    @staticmethod
    def _consumed_frac(st: _OrderState) -> float:
        """Fraction of an order's risk budget consumed by fills (by quantity or by real risk)."""
        by_risk = st.risk_used / st.budget_units if st.budget_units > 0 else 0.0
        return min(1.0, max(st.filled_qty / st.order.quantity, by_risk))

    @staticmethod
    def _is_live(s: _OrderState) -> bool:
        return s.status in (OrderStatus.PENDING, OrderStatus.PARTIALLY_FILLED)

    def _spec(self, symbol: str) -> tuple[InstrumentSpec, float]:
        inst = self._cfg.instrument(symbol)
        assert inst is not None
        return inst, self._fx.rate(inst.currency)

    def unrealised_gbp(self, marks: Mapping[str, float]) -> float:
        total = 0.0
        for p in self._positions.values():
            if p.symbol not in marks:
                continue
            inst, fxr = self._spec(p.symbol)
            sign = 1.0 if p.side == Side.LONG else -1.0
            total += sign * p.quantity * (marks[p.symbol] - p.entry_price) * inst.multiplier * fxr
        return total

    def equity_gbp(self, marks: Mapping[str, float]) -> float:
        return self._cash + self.unrealised_gbp(marks)

    def pending_risk_gbp(self, sleeve: Sleeve | None = None) -> float:
        """Risk still reserved by live (unfilled remainder of) orders."""
        return sum(st.risk_gbp * (1.0 - self._consumed_frac(st))
                   for st in self._orders.values()
                   if self._is_live(st) and (sleeve is None or st.order.sleeve == sleeve))

    def pending_notional_gbp(self, sleeve: Sleeve | None = None) -> float:
        """Notional still reserved by live (unfilled remainder of) orders."""
        total = 0.0
        for st in self._orders.values():
            o = st.order
            if self._is_live(st) and (sleeve is None or o.sleeve == sleeve):
                inst, fxr = self._spec(o.symbol)
                total += (o.quantity - st.filled_qty) * o.entry_price * inst.multiplier * fxr
        return total

    def open_notional_gbp(self, sleeve: Sleeve | None = None) -> float:
        total = 0.0
        for p in self._positions.values():
            if sleeve is None or p.sleeve == sleeve:
                inst, fxr = self._spec(p.symbol)
                total += p.quantity * p.entry_price * inst.multiplier * fxr
        return total

    # -- orders
    def submit_bracket(self, order: OrderRequest, risk_gbp: float) -> None:
        if order.quantity <= 0:
            raise OrderError("quantity must be > 0")
        if order.stop_price <= 0:
            raise OrderError("stop price is mandatory and must be > 0")
        if order.entry_price <= 0:
            raise OrderError("entry price must be > 0")
        if self._cfg.instrument(order.symbol) is None:
            raise OrderError(f"unknown symbol {order.symbol}")
        if order.order_id in self._orders:
            raise OrderError(f"duplicate order id {order.order_id}")
        if order.side == Side.LONG and order.stop_price >= order.entry_price:
            raise OrderError("long stop must be below entry")
        if order.side == Side.SHORT and order.stop_price <= order.entry_price:
            raise OrderError("short stop must be above entry")
        profile = self._cfg.fee_profile_for(order.symbol)
        budget_units = order.quantity * (abs(order.entry_price - order.stop_price)
                                         + 2 * (profile.half_spread + profile.slippage))
        self._orders[order.order_id] = _OrderState(order, risk_gbp, budget_units=budget_units)
        if self._journal:
            self._journal.record_order(order, OrderStatus.PENDING)

    def _set_status(self, st: _OrderState, status: OrderStatus) -> None:
        st.status = status
        if self._journal:
            self._journal.update_order_status(st.order.order_id, status)

    def cancel(self, order_id: str, ts: datetime) -> bool:
        st = self._orders.get(order_id)
        if st is None or not self._is_live(st):
            return False
        self._set_status(st, OrderStatus.CANCELLED)
        return True

    def cancel_all_pending(self, ts: datetime, sleeve: Sleeve | None = None) -> int:
        n = 0
        for st in self._orders.values():
            if self._is_live(st) and (sleeve is None or st.order.sleeve == sleeve):
                self._set_status(st, OrderStatus.CANCELLED)
                n += 1
        return n

    # -- bar processing
    def on_bar(self, bar: Bar) -> list[Fill]:
        fills: list[Fill] = []
        inst_cfg = self._cfg.instrument(bar.symbol)
        if inst_cfg is None:
            return fills
        profile = self._cfg.fee_profile_for(bar.symbol)
        hs, slip = profile.half_spread, profile.slippage

        # 1. expiry
        for st in self._orders.values():
            o = st.order
            if (o.symbol == bar.symbol and self._is_live(st) and o.expires_ts is not None
                    and bar.ts >= o.expires_ts):
                self._set_status(st, OrderStatus.CANCELLED)

        # 2. entries
        for st in list(self._orders.values()):
            o = st.order
            if o.symbol != bar.symbol or not self._is_live(st) or bar.ts < o.ts:
                continue
            existing = self._positions.get(o.order_id)
            if existing is not None and self._stop_hit(existing, bar, hs):
                self._set_status(st, OrderStatus.CANCELLED)   # remainder cancelled; exit handled below
                continue
            fill_px = self._entry_fill_price(o, bar, hs, slip)
            if fill_px is None:
                continue
            if (o.side == Side.LONG and fill_px <= o.stop_price) or (
                    o.side == Side.SHORT and fill_px >= o.stop_price):
                self._set_status(st, OrderStatus.CANCELLED)
                continue
            remaining = o.quantity - st.filled_qty
            cap = remaining if bar.volume <= 0 else floor_to_step(
                bar.volume * self._cfg.execution.participation_rate, inst_cfg.size_step)
            # Re-check planned risk at the actual fill price (entry drift must not exceed the budget).
            c = 2 * (hs + slip)
            d_plan = abs(o.entry_price - o.stop_price)
            d_act = max(0.0, abs(fill_px - o.stop_price) - (hs + slip))
            numerator = o.quantity * (d_plan + c) - st.risk_used
            max_by_risk = floor_to_step(numerator / (d_act + c), inst_cfg.size_step) if numerator > 0 else 0.0
            if max_by_risk < min(remaining, inst_cfg.min_size) - EPS:
                self._set_status(st, OrderStatus.CANCELLED)
                continue
            fill_qty = min(remaining, cap, max_by_risk)
            if fill_qty < min(remaining, inst_cfg.min_size) - EPS or fill_qty <= 0:
                continue
            st.risk_used += fill_qty * (d_act + c)
            fills.append(self._apply_entry(st, bar, fill_px, fill_qty))
            if fill_qty < remaining - EPS and max_by_risk < min(remaining, cap) - EPS:
                self._set_status(st, OrderStatus.CANCELLED)

        # 3. exits
        for pos in [p for p in self._positions.values() if p.symbol == bar.symbol]:
            fill = self._check_exit(pos, bar, hs, slip)
            if fill is not None:
                fills.append(fill)
        return fills

    @staticmethod
    def _stop_hit(pos: Position, bar: Bar, hs: float) -> bool:
        if pos.side == Side.LONG:
            return bar.low - hs <= pos.stop_price
        return bar.high + hs >= pos.stop_price

    @staticmethod
    def _entry_fill_price(o: OrderRequest, bar: Bar, hs: float, slip: float) -> float | None:
        e = o.entry_price
        long = o.side == Side.LONG
        if o.entry_type == EntryType.MARKET:
            return bar.open + hs + slip if long else bar.open - hs - slip
        if o.entry_type == EntryType.STOP:
            if long:
                return max(e, bar.open + hs) + slip if bar.high + hs >= e else None
            return min(e, bar.open - hs) - slip if bar.low - hs <= e else None
        if long:
            return min(e, bar.open + hs) if bar.low + hs <= e else None
        return max(e, bar.open - hs) if bar.high - hs >= e else None

    def _apply_entry(self, st: _OrderState, bar: Bar, fill_px: float, fill_qty: float) -> Fill:
        o = st.order
        inst, fxr = self._spec(o.symbol)
        profile = self._cfg.fee_profile_for(o.symbol)
        action = "buy" if o.side == Side.LONG else "sell"
        costs = fill_costs(inst, profile, self._fx, action, fill_qty, fill_px, bar.open)
        self._cash -= costs.total_fees_gbp
        st.n_fills += 1
        st.filled_qty += fill_qty
        pos = self._positions.get(o.order_id)
        if pos is None:
            pos = Position(o.order_id, o.order_id, o.symbol, o.side, o.sleeve, fill_qty, fill_px,
                           o.stop_price, o.target_price, bar.ts, 0.0, costs.total_fees_gbp)
            self._positions[o.order_id] = pos
            self._opened_bar[o.order_id] = bar.ts
        else:
            pos.entry_price = (pos.quantity * pos.entry_price + fill_qty * fill_px) / (pos.quantity + fill_qty)
            pos.quantity += fill_qty
            pos.entry_fees_gbp += costs.total_fees_gbp
        pos.initial_risk_gbp = st.risk_gbp * self._consumed_frac(st)
        filled = st.filled_qty >= o.quantity - EPS
        self._set_status(st, OrderStatus.FILLED if filled else OrderStatus.PARTIALLY_FILLED)
        fill = Fill(f"{o.order_id}-f{st.n_fills}", o.order_id, o.symbol, action, fill_qty, fill_px, bar.open,
                    costs.commission_gbp, costs.stamp_duty_gbp, costs.fx_cost_gbp,
                    costs.spread_slippage_gbp, bar.ts, not filled)
        if self._journal:
            self._journal.record_fill(fill)
        return fill

    def _check_exit(self, pos: Position, bar: Bar, hs: float, slip: float) -> Fill | None:
        long = pos.side == Side.LONG
        tgt = pos.target_price
        if long:
            stop_hit = bar.low - hs <= pos.stop_price
            stop_px = min(pos.stop_price, bar.open - hs) - slip
            tgt_hit = tgt is not None and bar.high - hs >= tgt
            tgt_px = max(tgt, bar.open - hs) if tgt is not None else 0.0
            gap_tgt = tgt is not None and bar.open - hs >= tgt
        else:
            stop_hit = bar.high + hs >= pos.stop_price
            stop_px = max(pos.stop_price, bar.open + hs) + slip
            tgt_hit = tgt is not None and bar.low + hs <= tgt
            tgt_px = min(tgt, bar.open + hs) if tgt is not None else 0.0
            gap_tgt = tgt is not None and bar.open + hs <= tgt
        reason: ExitReason | None
        if self._opened_bar.get(pos.position_id) == bar.ts:
            reason, px = (ExitReason.STOP, stop_px) if stop_hit else (None, 0.0)
        elif gap_tgt:
            reason, px = ExitReason.TARGET, tgt_px
        elif stop_hit:
            reason, px = ExitReason.STOP, stop_px
        elif tgt_hit:
            reason, px = ExitReason.TARGET, tgt_px
        else:
            reason, px = None, 0.0
        if reason is None:
            return None
        return self._close(pos, px, bar.open, bar.end_ts, reason)

    def _close(self, pos: Position, exit_px: float, mid: float, ts: datetime, reason: ExitReason) -> Fill:
        inst, fxr = self._spec(pos.symbol)
        profile = self._cfg.fee_profile_for(pos.symbol)
        action = "sell" if pos.side == Side.LONG else "buy"
        costs = fill_costs(inst, profile, self._fx, action, pos.quantity, exit_px, mid)
        sign = 1.0 if pos.side == Side.LONG else -1.0
        gross = sign * pos.quantity * (exit_px - pos.entry_price) * inst.multiplier * fxr
        self._cash += gross - costs.total_fees_gbp
        st = self._orders[pos.order_id]
        if self._is_live(st):
            self._set_status(st, OrderStatus.CANCELLED)
        fees = pos.entry_fees_gbp + costs.total_fees_gbp
        trade = ClosedTrade(pos.position_id, pos.position_id, pos.symbol, pos.side, pos.sleeve, pos.quantity,
                            pos.entry_price, exit_px, pos.opened_ts, ts, gross, fees, gross - fees,
                            reason, st.order.config_version)
        fill = Fill(f"{pos.position_id}-x", pos.order_id, pos.symbol, action, pos.quantity, exit_px, mid,
                    costs.commission_gbp, costs.stamp_duty_gbp, costs.fx_cost_gbp,
                    costs.spread_slippage_gbp, ts, False)
        del self._positions[pos.position_id]
        self._closed.append(trade)
        if self._journal:
            self._journal.record_fill(fill)
            self._journal.record_trade(trade)
        return fill

    def flatten(self, marks: Mapping[str, float], ts: datetime, reason: ExitReason,
                sleeve: Sleeve | None = Sleeve.A) -> list[Fill]:
        self.cancel_all_pending(ts, sleeve)
        fills: list[Fill] = []
        for pos in [p for p in self._positions.values() if sleeve is None or p.sleeve == sleeve]:
            profile = self._cfg.fee_profile_for(pos.symbol)
            action = "sell" if pos.side == Side.LONG else "buy"
            mid = marks.get(pos.symbol, pos.entry_price)
            px = market_fill_price(mid, action, profile)
            fills.append(self._close(pos, px, mid, ts, reason))
        return fills
