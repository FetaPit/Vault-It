import helpers
import unittest

from helpers import make_cfg
from trading.config import FeeProfile
from trading.fees import commission_gbp, fill_costs, market_fill_price, stamp_duty_gbp
from trading.fx import FxConverter

P = FeeProfile(min_commission_gbp=1.0, commission_pct=0.0005)


class TestFees(unittest.TestCase):
    def test_min_commission_binds(self) -> None:
        self.assertAlmostEqual(commission_gbp(P, 10, 1000), 1.0, places=6)

    def test_pct_binds(self) -> None:
        self.assertAlmostEqual(commission_gbp(P, 10, 4000), 2.0, places=6)

    def test_zero_qty_zero_commission(self) -> None:
        self.assertEqual(commission_gbp(P, 0, 1000), 0.0)

    def test_stamp_duty_uk_share_buy_only(self) -> None:
        inst = make_cfg().instruments["TESTUK"]
        self.assertAlmostEqual(stamp_duty_gbp(inst, "buy", 1000), 5.0, places=6)
        self.assertEqual(stamp_duty_gbp(inst, "sell", 1000), 0.0)

    def test_fill_prices(self) -> None:
        p = FeeProfile(half_spread=0.05, slippage=0.05)
        self.assertAlmostEqual(market_fill_price(100, "buy", p), 100.1, places=6)
        self.assertAlmostEqual(market_fill_price(100, "sell", p), 99.9, places=6)
        self.assertAlmostEqual(market_fill_price(100, "buy", p, apply_slippage=False), 100.05, places=6)

    def test_fill_costs_usd(self) -> None:
        cfg = make_cfg()
        c = fill_costs(cfg.instruments["TESTUSD"], cfg.fee_profile_for("TESTUSD"),
                       FxConverter.from_config(cfg), "buy", 3.9, 100.0, 100.0)
        self.assertAlmostEqual(c.fx_cost_gbp, 1.56, places=6)
        self.assertEqual(c.commission_gbp, 0.0)
        self.assertEqual(c.spread_slippage_gbp, 0.0)


if __name__ == "__main__":
    unittest.main()
