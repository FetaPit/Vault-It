"""Backtester sharing the RiskEngine + PaperBroker path used by paper trading."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

from trading.broker import PaperBroker
from trading.config import TradingConfig
from trading.fx import FxConverter
from trading.journal import TradeJournal
from trading.killswitch import KillSwitch
from trading.marketdata import MarketDataAdapter
from trading.models import AccountState, Bar, ClosedTrade, ExitReason, Sleeve
from trading.risk import RiskEngine
from trading.session import is_trading_day, session_window
from trading.sleeve_b.events import EventCalendar
from trading.strategies.base import Strategy, StrategyContext


@dataclass(frozen=True, slots=True)
class BacktestResult:
    trades: tuple[ClosedTrade, ...]
    daily_equity: tuple[tuple[date, float], ...]
    n_signals: int
    n_rejected: int
    net_pnl_gbp: float
    fees_gbp: float
    win_rate: float
    max_drawdown_pct: float
    final_equity_gbp: float


class Backtester:
    def __init__(self, cfg: TradingConfig, data: MarketDataAdapter, strategy: Strategy,
                 journal: TradeJournal | None = None, calendar: EventCalendar | None = None,
                 kill_switch: KillSwitch | None = None, fx: FxConverter | None = None,
                 other_sleeves_equity_gbp: float | None = None) -> None:
        self._cfg = cfg
        self._data = data
        self._strategy = strategy
        self._journal = journal
        self._calendar = calendar
        self._ks = kill_switch if kill_switch is not None else KillSwitch(None)
        self._fx = fx if fx is not None else FxConverter.from_config(cfg)
        self._start_equity = cfg.starting_capital_gbp * cfg.sleeve_a.allocation_pct
        self._other = (other_sleeves_equity_gbp if other_sleeves_equity_gbp is not None
                       else cfg.starting_capital_gbp * (1 - cfg.sleeve_a.allocation_pct))
        self._broker = PaperBroker(cfg, self._fx, self._start_equity, journal)
        self._risk = RiskEngine(cfg, self._ks, self._fx)
        self._marks: dict[str, float] = {}
        self._daily: list[tuple[date, float]] = []
        self._n_signals = 0
        self._n_rejected = 0
        self._peak = self._start_equity + self._other
        if journal is not None:
            journal.record_config(cfg)

    def _fund_equity(self) -> float:
        return self._broker.equity_gbp(self._marks) + self._other

    def run(self, start: date, end: date) -> BacktestResult:
        if start > end:
            raise ValueError("start must be <= end")
        d = start
        while d <= end:
            self.run_day(d)
            d += timedelta(days=1)
        trades = self._broker.closed_trades
        curve = [self._start_equity] + [e for _, e in self._daily]
        peak, mdd = curve[0], 0.0
        for eq in curve:
            peak = max(peak, eq)
            mdd = max(mdd, (peak - eq) / peak if peak > 0 else 0.0)
        wins = sum(1 for t in trades if t.net_pnl_gbp > 0)
        return BacktestResult(
            trades=trades, daily_equity=tuple(self._daily), n_signals=self._n_signals,
            n_rejected=self._n_rejected, net_pnl_gbp=sum(t.net_pnl_gbp for t in trades),
            fees_gbp=sum(t.fees_gbp for t in trades),
            win_rate=wins / len(trades) if trades else 0.0, max_drawdown_pct=mdd,
            final_equity_gbp=self._broker.equity_gbp(self._marks))

    def _account(self, trades_today: int, day_start: float) -> AccountState:
        b = self._broker
        eq = b.equity_gbp(self._marks)
        return AccountState(
            fund_equity_gbp=self._fund_equity(), day_start_equity_gbp=day_start, peak_equity_gbp=self._peak,
            trades_today=trades_today, open_positions=b.open_positions(), sleeve_equity_gbp=eq,
            sleeve_open_notional_gbp=b.open_notional_gbp(Sleeve.A), sleeve_cash_gbp=b.cash_gbp,
            pending_risk_gbp=b.pending_risk_gbp(Sleeve.A),
            pending_notional_gbp=b.pending_notional_gbp(Sleeve.A))

    def run_day(self, d: date) -> None:
        cfg, b, j = self._cfg, self._broker, self._journal
        if not is_trading_day(d, self._calendar.holidays() if self._calendar else frozenset()):
            return
        window = session_window(d, cfg.session)
        day_start = self._fund_equity()
        sleeve_start = b.equity_gbp(self._marks)
        trades_before = len(b.closed_trades)
        trades_today = 0
        halted = False
        ks_logged = False
        self._strategy.on_session_start(d, window)
        bars: list[Bar] = []
        for sym in cfg.sleeve_a.symbols:
            bars.extend(self._data.bars(sym, window.start_utc, window.end_utc))
        bars.sort(key=lambda x: (x.ts, x.symbol))

        for bar in bars:
            if self._ks.is_active():
                b.cancel_all_pending(bar.ts, Sleeve.A)   # no new entries once the kill switch is on
            b.on_bar(bar)
            self._marks[bar.symbol] = bar.close
            eq = self._fund_equity()
            self._risk.update_drawdown(eq, self._peak, bar.end_ts)
            self._peak = max(self._peak, eq)
            acct = self._account(trades_today, day_start)
            reason = self._risk.must_flatten_sleeve_a(bar.end_ts, window, acct)
            if reason in (ExitReason.KILL_SWITCH, ExitReason.DAILY_CAP) and not halted:
                had_exposure = bool(b.open_positions() or b.pending_orders())
                b.flatten(self._marks, bar.end_ts, reason)
                if reason == ExitReason.KILL_SWITCH and j is not None and not ks_logged:
                    ks_logged = True   # journal once per day, with or without exposure
                    j.record_kill_event(bar.end_ts, "flatten" if had_exposure else "active",
                                        self._ks.reason() or "kill switch")
                if had_exposure:
                    # Stop generating signals only once exposure was actually flattened; otherwise let
                    # the risk engine veto (and journal) any signal with its reason codes.
                    halted = True
            elif reason == ExitReason.TIME_FLAT:
                b.flatten(self._marks, bar.end_ts, ExitReason.TIME_FLAT)
                continue
            if halted:
                continue
            open_syms = frozenset(p.symbol for p in b.open_positions(Sleeve.A)) | frozenset(
                o.symbol for o in b.pending_orders())
            for sig in self._strategy.on_bar(bar, StrategyContext(bar.end_ts, window, open_syms)):
                self._n_signals += 1
                if j is not None:
                    j.record_signal(sig, cfg.version)
                decision = self._risk.evaluate(sig, acct, bar.end_ts, window)
                if j is not None:
                    j.record_decision(decision, bar.end_ts, cfg.version)
                if decision.approved and decision.order is not None:
                    b.submit_bracket(decision.order, decision.risk_gbp)
                    trades_today += 1
                    acct = self._account(trades_today, day_start)
                else:
                    self._n_rejected += 1

        b.flatten(self._marks, window.flat_by_utc, ExitReason.TIME_FLAT, Sleeve.A)
        b.cancel_all_pending(window.flat_by_utc)
        end_eq = b.equity_gbp(self._marks)
        self._daily.append((d, end_eq))
        if j is not None:
            realised = sum(t.net_pnl_gbp for t in b.closed_trades[trades_before:])
            j.upsert_daily_equity(d, sleeve_start, end_eq, realised, 0.0, 0.0, trades_today, cfg.version)
