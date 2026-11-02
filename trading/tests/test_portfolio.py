import helpers
import unittest

from trading.errors import InsufficientCashError
from trading.sleeve_b.portfolio import DividendPortfolio


def pf() -> DividendPortfolio:
    p = DividendPortfolio(500.0)
    p.buy("X", 10, 20.0, 2.0, 16.0)
    return p


class TestPortfolio(unittest.TestCase):
    def test_buy_avg_cost(self) -> None:
        p = pf()
        self.assertAlmostEqual(p.cash_gbp, 298.0, places=6)
        self.assertAlmostEqual(p.holding("X").avg_cost_gbp, 20.2, places=6)

    def test_insufficient_cash(self) -> None:
        p = DividendPortfolio(100.0)
        with self.assertRaises(InsufficientCashError):
            p.buy("X", 10, 20.0, 0.0, 16.0)
        self.assertEqual(p.cash_gbp, 100.0)
        self.assertIsNone(p.holding("X"))

    def test_sell_realised(self) -> None:
        p = pf()
        r = p.sell("X", 5, 30.0, 1.0)
        self.assertAlmostEqual(r, 48.0, places=6)
        self.assertAlmostEqual(p.realised_gbp, 48.0, places=6)
        self.assertAlmostEqual(p.cash_gbp, 447.0, places=6)

    def test_oversell(self) -> None:
        with self.assertRaises(ValueError):
            pf().sell("X", 11, 30.0, 0.0)

    def test_full_sell_removes(self) -> None:
        p = pf()
        p.sell("X", 10, 30.0, 0.0)
        self.assertIsNone(p.holding("X"))

    def test_dividend_withholding(self) -> None:
        p = pf()
        net = p.credit_dividend("X", 10.0, 0.15)
        self.assertAlmostEqual(net, 8.5, places=6)
        self.assertAlmostEqual(p.dividend_pool("X"), 8.5, places=6)
        p.consume_pool("X", 100)
        self.assertEqual(p.dividend_pool("X"), 0.0)

    def test_fractional(self) -> None:
        p = DividendPortfolio(100.0)
        p.buy("X", 2.5, 10.0, 0.0, 8.0)
        self.assertEqual(p.holding("X").quantity, 2.5)

    def test_missing_price(self) -> None:
        with self.assertRaises(ValueError):
            pf().equity({})

    def test_withdraw_too_much(self) -> None:
        with self.assertRaises(InsufficientCashError):
            DividendPortfolio(50.0).withdraw(60.0)

    def test_second_buy_keeps_stop(self) -> None:
        p = DividendPortfolio(500.0)
        p.buy("X", 1, 20.0, 0.0, 16.0)
        p.buy("X", 1, 20.0, 0.0, None)
        self.assertEqual(p.holding("X").stop_price_gbp, 16.0)

    def test_new_holding_requires_stop(self) -> None:
        with self.assertRaises(ValueError):
            DividendPortfolio(500.0).buy("X", 1, 20.0, 0.0, None)

    def test_equity_and_unrealised(self) -> None:
        p = pf()
        self.assertAlmostEqual(p.unrealised_gbp({"X": 25.0}), 10 * (25 - 20.2), places=6)
        self.assertAlmostEqual(p.equity({"X": 25.0}), 298 + 250, places=6)


if __name__ == "__main__":
    unittest.main()
