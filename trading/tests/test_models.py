import helpers
import unittest
from datetime import datetime

from helpers import make_bar, utc
from trading.models import Bar, Fill


class TestModels(unittest.TestCase):
    def test_bar_naive_ts_rejected(self) -> None:
        with self.assertRaises(ValueError):
            Bar("X", datetime(2027, 1, 12, 14, 30), 100, 101, 99, 100)

    def test_bar_high_below_low_rejected(self) -> None:
        with self.assertRaises(ValueError):
            make_bar("X", utc(2027, 1, 12, 14, 30), 100, 99, 101, 100)

    def test_bar_end_ts(self) -> None:
        self.assertEqual(make_bar("X", utc(2027, 1, 12, 14, 30), 100, 101, 99, 100).end_ts,
                         utc(2027, 1, 12, 14, 35))

    def test_bar_negative_volume_rejected(self) -> None:
        with self.assertRaises(ValueError):
            make_bar("X", utc(2027, 1, 12, 14, 30), 100, 101, 99, 100, v=-1)

    def test_fill_fees_property(self) -> None:
        f = Fill("f", "o", "X", "buy", 1, 1, 1, 1.0, 0.5, 0.25, 0.0, utc(2027, 1, 1), False)
        self.assertAlmostEqual(f.fees_gbp, 1.75, places=6)


if __name__ == "__main__":
    unittest.main()
