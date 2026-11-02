import helpers
import unittest
from datetime import date

from trading.topup import TopUpScheduler

S = date(2027, 2, 1)


def sched(split: float = 0.5, day: int = 1) -> TopUpScheduler:
    return TopUpScheduler(100.0, S, day, split)


class TestTopUp(unittest.TestCase):
    def test_before_start(self) -> None:
        self.assertEqual(sched().due_dates(date(2026, 11, 1), date(2027, 1, 31)), [])

    def test_span(self) -> None:
        self.assertEqual(sched().due_dates(date(2027, 1, 15), date(2027, 4, 15)),
                         [date(2027, 2, 1), date(2027, 3, 1), date(2027, 4, 1)])

    def test_catch_up(self) -> None:
        got = [c.due_date for c in sched().pending({date(2027, 2, 1)}, date(2027, 5, 10))]
        self.assertEqual(got, [date(2027, 3, 1), date(2027, 4, 1), date(2027, 5, 1)])

    def test_split(self) -> None:
        c = sched(0.5).credit_for(S)
        self.assertEqual((c.sleeve_a_gbp, c.sleeve_b_gbp), (50.0, 50.0))

    def test_odd_split(self) -> None:
        c = sched(0.333).credit_for(S)
        self.assertEqual((c.sleeve_a_gbp, c.sleeve_b_gbp), (33.3, 66.7))

    def test_invalid_day(self) -> None:
        with self.assertRaises(ValueError):
            sched(day=31)

    def test_today_is_due(self) -> None:
        self.assertEqual([c.due_date for c in sched().pending(set(), date(2027, 2, 1))], [S])

    def test_other_validation(self) -> None:
        for args in [(0, S, 1, 0.5), (100, date(2027, 2, 2), 1, 0.5), (100, S, 1, 1.5)]:
            with self.assertRaises(ValueError):
                TopUpScheduler(*args)


if __name__ == "__main__":
    unittest.main()
