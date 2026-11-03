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
        self.assertAlmostEqual(t.quantity, 3.07, places=6)
        self.assertAlmostEqual(t.entry_price, 101.6, places=6)
        self.assertAlmostEqual(t.exit_price, 106.5, places=6)
        self.assertAlmostEqual(t.net_pnl_gbp, 15.043, places=3)
        self.assertAlmostEqual(r.final_equity_gbp, 327.543, places=3)
        self.assertEqual(t.exit_reason, ExitReason.TARGET)

    def test_time_flat(self) -> None:
        r = bt(BT2).run(D, D)
        t = r.trades[0]
        self.assertEqual(t.exit_reason, ExitReason.TIME_FLAT)
        self.assertAlmostEqual(t.exit_price, 102.2, places=6)
        self.assertAlmostEqual(t.net_pnl_gbp, 1.842, places=3)

    def test_kill_switch_blocks(self) -> None:
        ks = KillSwitch(None)
        ks.activate("test", START)
        r = bt(BT1, ks=ks).run(D, D)
        self.assertEqual((r.n_signals, r.n_rejected, len(r.trades)), (1, 1, 0))

    def test_dst_mismatch_day(self) -> None:
        r = bt(BT1, start=utc(2027, 3, 15, 13, 30)).run(date(2027, 3, 15), date(2027, 3, 15))
        self.assertEqual(len(r.trades), 1)

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
        self.assertAlmostEqual(t.net_pnl_gbp, 3.07 * (95 - 101.6), places=6)
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
        self.assertAlmostEqual(r.net_pnl_gbp, 15.043, places=3)


if __name__ == "__main__":
    unittest.main()
