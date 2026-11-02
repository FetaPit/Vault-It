import helpers
import unittest
from datetime import date

from helpers import utc
from trading.config import SessionConfig
from trading.session import is_trading_day, session_window

CFG = SessionConfig()


class TestSession(unittest.TestCase):
    def test_winter_window(self) -> None:
        w = session_window(date(2027, 1, 12), CFG)
        self.assertEqual((w.start_utc, w.end_utc), (utc(2027, 1, 12, 14, 30), utc(2027, 1, 12, 16, 30)))
        self.assertEqual(w.london_label(), "14:30-16:30 Europe/London")
        self.assertFalse(w.dst_mismatch)

    def test_summer_window(self) -> None:
        w = session_window(date(2027, 6, 15), CFG)
        self.assertEqual(w.start_utc, utc(2027, 6, 15, 13, 30))
        self.assertEqual(w.london_label(), "14:30-16:30 Europe/London")
        self.assertFalse(w.dst_mismatch)

    def test_spring_mismatch(self) -> None:
        w = session_window(date(2027, 3, 15), CFG)
        self.assertEqual(w.start_utc, utc(2027, 3, 15, 13, 30))
        self.assertEqual(w.london_label(), "13:30-15:30 Europe/London")
        self.assertTrue(w.dst_mismatch)

    def test_autumn_mismatch(self) -> None:
        w = session_window(date(2026, 10, 27), CFG)
        self.assertEqual(w.start_utc, utc(2026, 10, 27, 13, 30))
        self.assertEqual(w.london_label(), "13:30-15:30 Europe/London")
        self.assertTrue(w.dst_mismatch)

    def test_after_both_changes(self) -> None:
        w = session_window(date(2026, 11, 2), CFG)
        self.assertEqual(w.start_utc, utc(2026, 11, 2, 14, 30))
        self.assertFalse(w.dst_mismatch)

    def test_derived_times(self) -> None:
        w = session_window(date(2027, 1, 12), CFG)
        self.assertEqual(w.opening_range_end_utc, utc(2027, 1, 12, 14, 45))
        self.assertEqual(w.entry_cutoff_utc, utc(2027, 1, 12, 16, 0))
        self.assertEqual(w.flat_by_utc, utc(2027, 1, 12, 16, 30))
        self.assertTrue(w.contains(utc(2027, 1, 12, 14, 30)))
        self.assertFalse(w.contains(utc(2027, 1, 12, 16, 30)))

    def test_weekend_not_trading(self) -> None:
        self.assertFalse(is_trading_day(date(2027, 1, 16)))
        self.assertTrue(is_trading_day(date(2027, 1, 12)))

    def test_holiday_not_trading(self) -> None:
        self.assertFalse(is_trading_day(date(2027, 1, 18), frozenset({date(2027, 1, 18)})))


if __name__ == "__main__":
    unittest.main()
