import helpers
import unittest
from datetime import date, datetime, timedelta

from helpers import make_bar, make_cfg, utc
from trading.backtest import Backtester
from trading.journal import TradeJournal
from trading.killswitch import KillSwitch
from trading.marketdata import InMemoryMarketData
from trading.models import ExitReason
from trading.strategies.orb import OpeningRangeBreakout

D = date(2027, 1, 12)


def bars_for(start: datetime, extra: list[tuple], sym: str = "TEST"):
    """OR bars + 14:45 breakout at offsets from `start` (minutes), then `extra` (min_offset,o,h,l,c)."""
    rows = [(0, 100, 101, 99, 100.5), (5, 100.5, 100.8, 99.5, 100), (10, 100, 100.9, 99.2, 100.6),
            (15, 100.6, 101.6, 100.5, 101.5)] + extra
    return [make_bar(sym, start + timedelta(minutes=m), o, h, l, c) for m, o, h, l, c in rows]


BT1 = [(20, 101.6, 102, 101.2, 101.9), (25, 101.9, 107, 101.8, 106.8)]
BT2 = [(20, 101.6, 102, 101.2, 101.9), (25, 101.9, 102.5, 101.0, 102.0), (115, 102, 102.4, 101.8, 102.2)]
START = utc(2027, 1, 12, 14, 30)


def bt(extra, start=START, journal=None, ks=None):
    cfg = make_cfg()
    data = InMemoryMarketData(bars_for(start, extra))
    return Backtester(cfg, data, OpeningRangeBreakout(cfg.sleeve_a), journal=journal, kill_switch=ks)


class TestBacktest(unittest.TestCase):
    def test_target_trade(self) -> None:
        r = bt(BT1).run(D, D)
        self.assertEqual(len(r.trades), 1)
        t = r.trades[0]
        # FIX-002: fill 101.6 vs signal 101.5 -> qty 3.07 reduced to 2.95 (3.07*2.5/2.6)
        self.assertAlmostEqual(t.quantity, 2.95, places=6)
        self.assertAlmostEqual(t.entry_price, 101.6, places=6)
        self.assertAlmostEqual(t.exit_price, 106.5, places=6)
        self.assertAlmostEqual(t.net_pnl_gbp, 14.455, places=3)
        self.assertAlmostEqual(r.final_equity_gbp, 326.955, places=3)
        self.assertEqual(t.exit_reason, ExitReason.TARGET)

    def test_time_flat(self) -> None:
        r = bt(BT2).run(D, D)
        t = r.trades[0]
        self.assertEqual(t.exit_reason, ExitReason.TIME_FLAT)
        self.assertAlmostEqual(t.exit_price, 102.2, places=6)
        self.assertAlmostEqual(t.net_pnl_gbp, 1.77, places=3)

    def test_kill_switch_blocks(self) -> None:
        ks = KillSwitch(None)
        ks.activate("test", START)
        r = bt(BT1, ks=ks).run(D, D)
        self.assertEqual((r.n_signals, r.n_rejected, len(r.trades)), (1, 1, 0))

    def test_kill_event_journaled_once_without_exposure(self) -> None:
        ks = KillSwitch(None)
        ks.activate("test", START)
        j = TradeJournal(":memory:")
        bt(BT1, journal=j, ks=ks).run(D, D)
        self.assertEqual(j.count("kill_switch_events"), 1)
        j.close()

    def test_dst_mismatch_day(self) -> None:
        r = bt(BT1, start=utc(2027, 3, 15, 13, 30)).run(date(2027, 3, 15), date(2027, 3, 15))
        self.assertEqual(len(r.trades), 1)

    def test_two_symbols_same_bar_respect_daily_cap(self) -> None:
        cfg = make_cfg({"sleeve_a": {"symbols": ["TEST", "TESTC"]}})
        rows = bars_for(START, BT1) + bars_for(START, BT1, sym="TESTC")
        j = TradeJournal(":memory:")
        bk = Backtester(cfg, InMemoryMarketData(rows), OpeningRangeBreakout(cfg.sleeve_a), journal=j)
        decisions: list = []
        orig = bk._risk.evaluate

        def spy(*a, **k):
            d = orig(*a, **k)
            decisions.append(d)
            return d
        bk._risk.evaluate = spy  # type: ignore[method-assign]
        bk.run(D, D)
        self.assertEqual(len(decisions), 2)
        self.assertLessEqual(sum(d.risk_gbp for d in decisions if d.approved), 18.75 + 1e-9)
        j.close()

    def test_kill_switch_between_bars_blocks_pending_fill(self) -> None:
        ks = KillSwitch(None)
        j = TradeJournal(":memory:")
        bk = bt(BT1, journal=j, ks=ks)
        orig = bk._risk.evaluate

        def spy(*a, **k):
            d = orig(*a, **k)
            if d.approved:
                ks.activate("test", START)   # kill switch appears after submit, before the next bar
            return d
        bk._risk.evaluate = spy  # type: ignore[method-assign]
        r = bk.run(D, D)
        self.assertEqual(len(r.trades), 0)
        self.assertEqual(j.count("fills"), 0)
        self.assertEqual(j.count("orders"), 1)
        j.close()

    def test_weekend_skipped(self) -> None:
        r = bt(BT1).run(date(2027, 1, 16), date(2027, 1, 17))
        self.assertEqual(len(r.trades), 0)
        self.assertEqual(r.daily_equity, ())

    def test_journal_populated(self) -> None:
        j = TradeJournal(":memory:")
        bt(BT1, journal=j).run(D, D)
        for table, n in [("signals", 1), ("decisions", 1), ("trades", 1), ("daily_equity", 1),
                         ("config_versions", 1), ("orders", 1)]:
            self.assertEqual(j.count(table), n, table)
        self.assertEqual(j.count("fills"), 2)
        j.close()

    def test_gap_loss(self) -> None:
        j = TradeJournal(":memory:")
        r = bt([(20, 101.6, 102, 101.2, 101.9), (25, 95, 95.5, 94, 94.5)], journal=j).run(D, D)
        t = r.trades[0]
        self.assertAlmostEqual(t.exit_price, 95.0, places=6)
        self.assertAlmostEqual(t.net_pnl_gbp, 2.95 * (95 - 101.6), places=6)
        self.assertLess(t.net_pnl_gbp, -7.675)
        self.assertLess(r.daily_equity[0][1], 312.5)
        row = j.daily_equity_rows()[0]
        self.assertLess(row[2], row[1])
        j.close()

    def test_start_after_end(self) -> None:
        with self.assertRaises(ValueError):
            bt(BT1).run(date(2027, 1, 13), D)

    def test_result_stats(self) -> None:
        r = bt(BT1).run(D, D)
        self.assertEqual(r.win_rate, 1.0)
        self.assertEqual(r.max_drawdown_pct, 0.0)
        self.assertAlmostEqual(r.net_pnl_gbp, 14.455, places=3)


if __name__ == "__main__":
    unittest.main()
