import helpers
import unittest
from dataclasses import replace
from datetime import date

from helpers import make_cfg, make_signal, utc
from trading.errors import JournalError
from trading.journal import TradeJournal
from trading.models import ClosedTrade, ExitReason, RiskDecision, Side, Sleeve
from trading.sleeve_b.sweep import SweepRecommendation


def trade() -> ClosedTrade:
    return ClosedTrade("t1", "t1", "TEST", Side.LONG, Sleeve.A, 3.75, 100.0, 110.0, utc(2027, 1, 12, 14, 50),
                       utc(2027, 1, 12, 15, 10), 37.5, 0.0, 37.5, ExitReason.TARGET, "v0001")


REC = SweepRecommendation("silver_britannia_1oz", "silver", 54.0, 108.0, 110.0, date(2026, 11, 2), False)


class TestJournal(unittest.TestCase):
    def setUp(self) -> None:
        self.j = TradeJournal(":memory:")

    def tearDown(self) -> None:
        self.j.close()

    def test_schema_idempotent(self) -> None:
        self.j.init_schema()
        self.j.init_schema()
        self.assertEqual(self.j.count("trades"), 0)

    def test_trade_roundtrip(self) -> None:
        t = trade()
        self.j.record_trade(t)
        self.assertEqual(self.j.trades_between(utc(2027, 1, 12), utc(2027, 1, 13)), [t])
        self.assertEqual(self.j.trades_between(utc(2027, 1, 13), utc(2027, 1, 14)), [])

    def test_duplicate_signal(self) -> None:
        self.j.record_signal(make_signal(), "v0001")
        with self.assertRaises(JournalError):
            self.j.record_signal(make_signal(), "v0001")

    def test_decision_reasons_json(self) -> None:
        self.j.record_signal(make_signal(), "v0001")
        d = RiskDecision("sig-1", False, ("A", "B"), 0.0, 0.0, None)
        self.j.record_decision(d, utc(2027, 1, 12, 15), "v0001")
        self.assertEqual(self.j.decisions_for("sig-1"), [(False, ("A", "B"))])

    def test_daily_equity_upsert(self) -> None:
        for end in (300.0, 310.0):
            self.j.upsert_daily_equity(date(2027, 1, 12), 312.5, end, 0, 0, 0, 1, "v0001")
        self.assertEqual(self.j.daily_equity_rows(), [("2027-01-12", 312.5, 310.0)])

    def test_cash_flow_dedupe(self) -> None:
        self.assertTrue(self.j.record_cash_flow(utc(2027, 2, 1), "topup", 100.0, dedupe_key="topup:2027-02-01"))
        self.assertFalse(self.j.record_cash_flow(utc(2027, 2, 1), "topup", 100.0, dedupe_key="topup:2027-02-01"))
        self.assertAlmostEqual(self.j.sum_cash_flows("topup"), 100.0, places=6)
        self.assertEqual(self.j.cash_flow_dedupe_keys("topup:"), {"topup:2027-02-01"})

    def test_config_version_reuse_conflict(self) -> None:
        cfg = make_cfg()
        self.j.record_config(cfg)
        with self.assertRaises(JournalError):
            self.j.record_config(replace(cfg, starting_capital_gbp=700.0))

    def test_config_same_twice(self) -> None:
        cfg = make_cfg()
        self.j.record_config(cfg)
        self.j.record_config(cfg)
        self.assertEqual(self.j.count("config_versions"), 1)

    def test_features_stored(self) -> None:
        s = replace(make_signal(), features={"a": 1.0, "b": 2.0})
        self.j.record_signal(s, "v0001")
        self.assertEqual(self.j.count("features"), 2)

    def test_sweep_lifecycle(self) -> None:
        rid = self.j.record_sweep_recommendation(utc(2027, 1, 1), REC)
        self.assertEqual(self.j.open_sweep_recommendation_id(), rid)
        self.j.acknowledge_sweep(rid, 54.0, utc(2027, 1, 2))
        self.assertIsNone(self.j.open_sweep_recommendation_id())
        self.assertAlmostEqual(self.j.sum_acknowledged_sweep_thresholds(), 108.0, places=6)
        with self.assertRaises(JournalError):
            self.j.acknowledge_sweep(rid, 54.0, utc(2027, 1, 3))

    def test_count_bad_table(self) -> None:
        with self.assertRaises(ValueError):
            self.j.count("x; drop")

    def test_bad_cash_flow_kind(self) -> None:
        with self.assertRaises(ValueError):
            self.j.record_cash_flow(utc(2027, 1, 1), "gift", 1.0)


if __name__ == "__main__":
    unittest.main()
