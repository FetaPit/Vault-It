import helpers
import unittest

from trading.config import TrancheRule
from trading.sleeve_b.portfolio import Holding
from trading.sleeve_b.tranches import plan_profit_taking

RULES = [TrancheRule(0.25, 0.25), TrancheRule(0.50, 0.25)]


def h(qty: float = 10, triggered: set | None = None) -> Holding:
    return Holding("X", qty, 10.0, 8.0, triggered or set())


def view(acts) -> list:
    return [(a.rule_index, a.quantity) for a in acts]


class TestTranches(unittest.TestCase):
    def test_first_tranche(self) -> None:
        self.assertEqual(view(plan_profit_taking(h(), 13.0, RULES, 0.01)), [(0, 2.5)])

    def test_both_tranches(self) -> None:
        self.assertEqual(view(plan_profit_taking(h(), 16.0, RULES, 0.01)), [(0, 2.5), (1, 1.87)])

    def test_already_triggered(self) -> None:
        self.assertEqual(plan_profit_taking(h(triggered={0}), 13.0, RULES, 0.01), [])

    def test_rounds_to_zero(self) -> None:
        self.assertEqual(plan_profit_taking(h(3), 13.0, RULES, 1.0), [])

    def test_no_gain(self) -> None:
        self.assertEqual(plan_profit_taking(h(), 10.0, RULES, 0.01), [])

    def test_bad_price(self) -> None:
        with self.assertRaises(ValueError):
            plan_profit_taking(h(), 0.0, RULES, 0.01)

    def test_does_not_mutate(self) -> None:
        hh = h()
        plan_profit_taking(hh, 16.0, RULES, 0.01)
        self.assertEqual(hh.triggered_tranches, set())


if __name__ == "__main__":
    unittest.main()
