import helpers
import unittest

from trading.errors import FxError
from trading.fx import FxConverter


class TestFx(unittest.TestCase):
    def test_gbp_no_cost(self) -> None:
        self.assertEqual(FxConverter({}).conversion_cost_gbp(1000, "GBP", 0.005), 0.0)

    def test_usd_conversion_and_cost(self) -> None:
        fx = FxConverter({"USD": 0.8})
        self.assertAlmostEqual(fx.to_gbp(100, "USD"), 80.0, places=6)
        self.assertAlmostEqual(fx.conversion_cost_gbp(80, "USD", 0.005), 0.4, places=6)

    def test_unknown_currency(self) -> None:
        with self.assertRaises(FxError):
            FxConverter({"USD": 0.8}).rate("JPY")

    def test_bad_rate(self) -> None:
        with self.assertRaises(FxError):
            FxConverter({"USD": 0})


if __name__ == "__main__":
    unittest.main()
