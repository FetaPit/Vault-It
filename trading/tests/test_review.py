import helpers
import json
import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path

from helpers import utc
from trading.config import config_to_dict, default_config, load_config
from trading.errors import ConfigError
from trading.journal import TradeJournal
from trading.models import ClosedTrade, ExitReason, Side, Sleeve
from trading.review import compute_stats, walk_forward_splits, weekly_review, write_proposal


def trade(i: int, net: float, day: int = 12) -> ClosedTrade:
    return ClosedTrade(f"t{i}", f"t{i}", "TEST", Side.LONG, Sleeve.A, 1.0, 100.0, 100.0 + net,
                       utc(2027, 1, day, 14, 50), utc(2027, 1, day, 15, 0), net, 0.0, net,
                       ExitReason.TARGET, "v0001")


class TestReview(unittest.TestCase):
    def setUp(self) -> None:
        self._t = tempfile.TemporaryDirectory()
        self.addCleanup(self._t.cleanup)
        self.dir = Path(self._t.name)
        (self.dir / "v0001.json").write_text(json.dumps(config_to_dict(default_config())))
        self.base = default_config()

    def test_stats(self) -> None:
        s = compute_stats([trade(i, n) for i, n in enumerate([10, -5, 20, -5])])
        self.assertEqual(s.n_trades, 4)
        self.assertAlmostEqual(s.win_rate, 0.5, places=6)
        self.assertAlmostEqual(s.avg_win_gbp, 15, places=6)
        self.assertAlmostEqual(s.avg_loss_gbp, -5, places=6)
        self.assertAlmostEqual(s.expectancy_gbp, 5, places=6)
        self.assertAlmostEqual(s.profit_factor, 3.0, places=6)
        self.assertAlmostEqual(s.net_pnl_gbp, 20, places=6)
        self.assertEqual(s.max_consecutive_losses, 1)

    def test_empty(self) -> None:
        s = compute_stats([])
        self.assertEqual((s.n_trades, s.win_rate, s.net_pnl_gbp, s.max_consecutive_losses), (0, 0.0, 0.0, 0))
        self.assertIsNone(s.profit_factor)

    def test_sample_gate(self) -> None:
        j = TradeJournal(":memory:")
        self.addCleanup(j.close)
        for i in range(29):
            j.record_trade(trade(i, 1.0))
        r = weekly_review(j, date(2027, 1, 16))
        self.assertFalse(r.sample_ok)
        self.assertTrue(r.message.startswith("INSUFFICIENT_SAMPLE"))
        j.record_trade(trade(29, 1.0))
        r2 = weekly_review(j, date(2027, 1, 16))
        self.assertTrue(r2.sample_ok)
        self.assertEqual(r2.message, "OK: n=30")
        self.assertEqual(weekly_review(j, date(2027, 1, 11)).stats.n_trades, 0)

    def test_splits(self) -> None:
        days = [date(2027, 1, 1) + timedelta(days=i) for i in range(10)]
        sp = walk_forward_splits(days, 5, 2)
        self.assertEqual(sp, [(days[0:5], days[5:7]), (days[2:7], days[7:9])])
        with self.assertRaises(ValueError):
            walk_forward_splits(days, 0, 2)

    def test_proposal_write(self) -> None:
        before = (self.dir / "v0001.json").read_text()
        p = write_proposal(self.dir, self.base, {"sleeve_a.target_r_multiple": 1.5}, "tuning")
        self.assertEqual(p.name, "v0002.proposed.json")
        data = json.loads(p.read_text())
        self.assertEqual((data["version"], data["sleeve_a"]["target_r_multiple"]), ("v0002", 1.5))
        self.assertEqual((self.dir / "v0001.json").read_text(), before)
        self.assertTrue((self.dir / "v0002.proposed.reason.txt").exists())
        self.assertEqual(load_config(p).sleeve_a.target_r_multiple, 1.5)

    def test_forbidden_key(self) -> None:
        for key in ("risk.max_risk_per_trade_pct", "mode", "paths.journal", "version"):
            with self.subTest(key), self.assertRaises(ConfigError):
                write_proposal(self.dir, self.base, {key: 0.01}, "x")
        self.assertEqual(sorted(p.name for p in self.dir.iterdir()), ["v0001.json"])

    def test_invalid_value(self) -> None:
        with self.assertRaises(ConfigError):
            write_proposal(self.dir, self.base, {"sleeve_a.target_r_multiple": -1}, "x")
        self.assertEqual(sorted(p.name for p in self.dir.iterdir()), ["v0001.json"])

    def test_numbering(self) -> None:
        (self.dir / "v0002.proposed.json").write_text("{}")
        p = write_proposal(self.dir, self.base, {"sleeve_a.target_r_multiple": 1.5}, "x")
        self.assertEqual(p.name, "v0003.proposed.json")

    def test_unknown_path(self) -> None:
        with self.assertRaises(ConfigError):
            write_proposal(self.dir, self.base, {"sleeve_a.nope": 1}, "x")


if __name__ == "__main__":
    unittest.main()
