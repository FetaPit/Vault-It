import helpers
import unittest
from dataclasses import replace
from datetime import date

from helpers import make_cfg, utc
from trading.config import CoinSpec
from trading.errors import InsufficientCashError
from trading.journal import TradeJournal
from trading.sleeve_b.portfolio import DividendPortfolio
from trading.sleeve_b.sweep import (SweepTracker, coin_all_in_cost, eligible_profit, select_sweep,
                                    sweep_threshold)

SILVER = CoinSpec("silver", "silver", 40.0, 5.0, 0.20, date(2026, 11, 2))
TODAY = date(2026, 11, 3)


class TestSweep(unittest.TestCase):
    def tracker(self) -> tuple[SweepTracker, TradeJournal]:
        j = TradeJournal(":memory:")
        j.record_cash_flow(utc(2026, 11, 2), "initial", 625.0, dedupe_key="initial")
        return SweepTracker(make_cfg(), j), j

    def test_all_in_and_threshold(self) -> None:
        self.assertAlmostEqual(coin_all_in_cost(SILVER), 54.0, places=6)
        self.assertAlmostEqual(sweep_threshold(SILVER, 2.0), 108.0, places=6)

    def test_just_below(self) -> None:
        self.assertIsNone(select_sweep(107.99, [SILVER], 2.0, TODAY, 7))

    def test_at_threshold(self) -> None:
        r = select_sweep(108.0, [SILVER], 2.0, TODAY, 7)
        self.assertEqual(r.coin_name, "silver")
        self.assertEqual(r.action, "RECOMMEND_ONLY_MANUAL_PURCHASE")

    def test_prefer_most_expensive_affordable(self) -> None:
        r = select_sweep(1300, make_cfg().sweep.coins, 2.0, TODAY, 7)
        self.assertEqual(r.coin_name, "gold_sovereign")
        self.assertAlmostEqual(r.threshold_gbp, 1220.0, places=6)

    def test_negative_profit(self) -> None:
        self.assertIsNone(select_sweep(-5, [SILVER], 2.0, TODAY, 7))

    def test_stale_price(self) -> None:
        r = select_sweep(200, [SILVER], 2.0, date(2026, 11, 20), 7)
        self.assertTrue(r.price_stale)
        self.assertFalse(select_sweep(200, [SILVER], 2.0, TODAY, 7).price_stale)

    def test_open_rec_suppresses(self) -> None:
        t, _ = self.tracker()
        self.assertIsNotNone(t.evaluate(TODAY, 733.0, utc(2026, 11, 3)))
        self.assertIsNone(t.evaluate(TODAY, 733.0, utc(2026, 11, 3)))

    def test_acknowledge_consumes(self) -> None:
        t, j = self.tracker()
        rec = t.evaluate(TODAY, 733.0, utc(2026, 11, 3))
        self.assertEqual(rec.coin_name, "silver_britannia_1oz")
        pf = DividendPortfolio(200.0)
        t.acknowledge(j.open_sweep_recommendation_id(), 54.0, utc(2026, 11, 4), pf)
        self.assertAlmostEqual(pf.cash_gbp, 146.0, places=6)
        self.assertAlmostEqual(j.sum_cash_flows("sweep_withdrawal"), -54.0, places=6)
        self.assertIsNone(t.evaluate(TODAY, 679.0, utc(2026, 11, 4)))

    def test_ack_insufficient_cash(self) -> None:
        t, j = self.tracker()
        t.evaluate(TODAY, 733.0, utc(2026, 11, 3))
        with self.assertRaises(InsufficientCashError):
            t.acknowledge(j.open_sweep_recommendation_id(), 54.0, utc(2026, 11, 4), DividendPortfolio(10.0))
        self.assertIsNotNone(j.open_sweep_recommendation_id())

    def test_eligible_formula(self) -> None:
        self.assertAlmostEqual(eligible_profit(800, 725, 54, 108), 21.0, places=6)


if __name__ == "__main__":
    unittest.main()
