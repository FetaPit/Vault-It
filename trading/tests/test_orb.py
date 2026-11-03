import helpers
import unittest
from datetime import date

from helpers import make_bar, utc
from trading.config import SleeveAConfig
from trading.models import Side
from trading.session import session_window
from trading.sleeve_b.events import Event, EventCalendar, EventType
from trading.strategies.base import StrategyContext
from trading.strategies.orb import OpeningRangeBreakout

D = date(2027, 1, 12)
CFG = SleeveAConfig(symbols=("TEST",), max_or_range_pct=0.05)
W = session_window(D, helpers.make_cfg().session)


def b(h: int, m: int, o: float, hi: float, lo: float, c: float, sym: str = "TEST"):
    return make_bar(sym, utc(2027, 1, 12, h, m), o, hi, lo, c)


OR_BARS = [b(14, 30, 100, 101, 99, 100.5), b(14, 35, 100.5, 100.8, 99.5, 100), b(14, 40, 100, 100.9, 99.2, 100.6)]


def ctx(bar, open_symbols=frozenset()):
    return StrategyContext(bar.end_ts, W, open_symbols)


def run(bars, cfg=CFG, calendar=None, open_symbols=frozenset()):
    s = OpeningRangeBreakout(cfg, calendar)
    s.on_session_start(D, W)
    out = []
    for bar in bars:
        out.extend(s.on_bar(bar, ctx(bar, open_symbols)))
    return out


class TestOrb(unittest.TestCase):
    def test_long_breakout(self) -> None:
        sigs = run(OR_BARS + [b(14, 45, 100.6, 101.6, 100.5, 101.5)])
        self.assertEqual(len(sigs), 1)
        s = sigs[0]
        self.assertEqual((s.side, s.entry, s.stop, s.target), (Side.LONG, 101.5, 99.0, 106.5))
        self.assertEqual((s.ts, s.signal_id), (utc(2027, 1, 12, 14, 50), "orb-TEST-20270112-1"))
        self.assertEqual(s.source, "strategy:orb")

    def test_short_breakout(self) -> None:
        s = run(OR_BARS + [b(14, 45, 100, 100.2, 98.4, 98.5)])[0]
        self.assertEqual((s.side, s.stop, s.target), (Side.SHORT, 101.0, 93.5))

    def test_no_breakout(self) -> None:
        self.assertEqual(run(OR_BARS + [b(14, 45, 100, 100.8, 100, 100.5)]), [])

    def test_one_signal_per_day(self) -> None:
        sigs = run(OR_BARS + [b(14, 45, 100.6, 101.6, 100.5, 101.5), b(14, 50, 101.5, 103, 101.4, 102.9)])
        self.assertEqual(len(sigs), 1)

    def test_range_too_wide(self) -> None:
        bars = [b(14, 30, 100, 110, 99, 100.5)] + OR_BARS[1:] + [b(14, 45, 100.6, 111.6, 100.5, 111.5)]
        self.assertEqual(run(bars), [])

    def test_zero_range(self) -> None:
        bars = [b(14, m, 100, 100, 100, 100) for m in (30, 35, 40)] + [b(14, 45, 100, 101, 100, 101)]
        self.assertEqual(run(bars), [])

    def test_after_cutoff(self) -> None:
        self.assertEqual(run(OR_BARS + [b(16, 0, 100.6, 101.6, 100.5, 101.5)]), [])

    def test_no_or_bars(self) -> None:
        self.assertEqual(run([b(14, 50, 100.6, 101.6, 100.5, 101.5)]), [])

    def test_event_day_skip(self) -> None:
        cal = EventCalendar([Event(D, EventType.MACRO, None, None, None)])
        self.assertEqual(run(OR_BARS + [b(14, 45, 100.6, 101.6, 100.5, 101.5)], calendar=cal), [])

    def test_open_position_blocks(self) -> None:
        s = OpeningRangeBreakout(CFG)
        s.on_session_start(D, W)
        for bar in OR_BARS:
            s.on_bar(bar, ctx(bar))
        brk = b(14, 45, 100.6, 101.6, 100.5, 101.5)
        self.assertEqual(s.on_bar(brk, ctx(brk, frozenset({"TEST"}))), [])
        self.assertEqual(len(s.on_bar(brk, ctx(brk))), 1)   # state was not marked done

    def test_other_symbol(self) -> None:
        self.assertEqual(run([b(14, 30, 100, 101, 99, 100, "OTHER")]), [])

    def test_features(self) -> None:
        f = run(OR_BARS + [b(14, 45, 100.6, 101.6, 100.5, 101.5)])[0].features
        for k in ("or_high", "or_low", "or_range_pct", "breakout_close", "minutes_since_open"):
            self.assertIn(k, f)
        self.assertEqual(f["minutes_since_open"], 20.0)


if __name__ == "__main__":
    unittest.main()
