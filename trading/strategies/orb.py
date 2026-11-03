"""Sleeve A: opening-range breakout (long and short, one signal per symbol per day)."""
from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date

from trading.config import SleeveAConfig
from trading.models import Bar, EntryType, Side, Signal, Sleeve
from trading.session import SessionWindow
from trading.sleeve_b.events import EventCalendar
from trading.strategies.base import Strategy, StrategyContext


@dataclass(slots=True)
class _OrbState:
    or_high: float = -math.inf
    or_low: float = math.inf
    or_bars: int = 0
    done: bool = False
    skip: bool = False


class OpeningRangeBreakout(Strategy):
    name = "orb"
    sleeve = Sleeve.A

    def __init__(self, cfg: SleeveAConfig, calendar: EventCalendar | None = None) -> None:
        self._cfg = cfg
        self._calendar = calendar
        self._state: dict[str, _OrbState] = {}
        self._window: SessionWindow | None = None

    def on_session_start(self, d: date, window: SessionWindow) -> None:
        self._window = window
        self._state = {}
        for sym in self._cfg.symbols:
            skip = (self._cfg.skip_event_days and self._calendar is not None
                    and self._calendar.is_blackout(sym, d, 0))
            self._state[sym] = _OrbState(skip=skip)

    def on_bar(self, bar: Bar, ctx: StrategyContext) -> list[Signal]:
        window = ctx.window
        st = self._state.get(bar.symbol)
        if st is None or st.skip or st.done or bar.ts < window.start_utc:
            return []
        if bar.ts < window.opening_range_end_utc:
            st.or_high = max(st.or_high, bar.high)
            st.or_low = min(st.or_low, bar.low)
            st.or_bars += 1
            return []
        if st.or_bars == 0:
            st.done = True
            return []
        if bar.end_ts > window.entry_cutoff_utc:
            st.done = True
            return []
        rng = st.or_high - st.or_low
        mid = (st.or_high + st.or_low) / 2
        if rng <= 0 or rng / mid > self._cfg.max_or_range_pct:
            st.done = True
            return []
        if ctx.has_open_position(bar.symbol):
            return []
        r = self._cfg.target_r_multiple
        if bar.close > st.or_high:
            side, stop = Side.LONG, st.or_low
            target = bar.close + r * (bar.close - stop)
        elif bar.close < st.or_low:
            side, stop = Side.SHORT, st.or_high
            target = bar.close - r * (stop - bar.close)
        else:
            return []
        st.done = True
        return [Signal(
            signal_id=f"orb-{bar.symbol}-{window.trading_date:%Y%m%d}-1",
            ts=bar.end_ts, symbol=bar.symbol, side=side, entry_type=EntryType.MARKET,
            entry=bar.close, stop=stop, target=target, sleeve=Sleeve.A, source="strategy:orb",
            rationale=f"close {bar.close} broke OR [{st.or_low},{st.or_high}]",
            features={"or_high": st.or_high, "or_low": st.or_low, "or_range_pct": rng / mid,
                      "breakout_close": bar.close,
                      "minutes_since_open": (bar.end_ts - window.start_utc).total_seconds() / 60})]
