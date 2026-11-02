import helpers
import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path

from trading.errors import CalendarError
from trading.sleeve_b.events import Event, EventCalendar, EventType

HDR = "date,type,symbol,amount,ref_date,note\n"


def csv_cal(rows: list[str]) -> EventCalendar:
    with tempfile.TemporaryDirectory() as t:
        p = Path(t) / "c.csv"
        p.write_text(HDR + "".join(r + "\n" for r in rows))
        return EventCalendar.from_csv(p)


class TestEvents(unittest.TestCase):
    def test_parse(self) -> None:
        cal = csv_cal(["2027-03-01,ex_dividend,DIVA,0.5,,",
                       "2027-03-20,dividend_pay,DIVA,0.5,2027-03-01,",
                       "2027-03-10,earnings,DIVA,,,q1",
                       "2027-03-17,macro,,,,fomc"])
        self.assertEqual(len(cal.upcoming(date(2027, 1, 1), 365)), 4)

    def test_bad_type_line(self) -> None:
        with self.assertRaises(CalendarError) as cm:
            csv_cal(["2027-03-01,ex_dividend,DIVA,0.5,,", "2027-03-11,split,DIVA,,,"])
        self.assertIn("line 3", str(cm.exception))

    def test_pay_without_ref(self) -> None:
        with self.assertRaises(CalendarError):
            csv_cal(["2027-03-20,dividend_pay,DIVA,0.5,,"])

    def test_exdiv_without_amount(self) -> None:
        with self.assertRaises(CalendarError):
            csv_cal(["2027-03-01,ex_dividend,DIVA,,,"])

    def test_earnings_blackout_window(self) -> None:
        cal = EventCalendar([Event(date(2027, 3, 10), EventType.EARNINGS, "DIVA", None, None)])
        self.assertTrue(cal.is_blackout("DIVA", date(2027, 3, 8), 2))
        self.assertFalse(cal.is_blackout("DIVA", date(2027, 3, 7), 2))

    def test_macro_day(self) -> None:
        cal = EventCalendar([Event(date(2027, 3, 17), EventType.MACRO, None, None, None)])
        self.assertTrue(cal.is_blackout("ANY", date(2027, 3, 17), 0))
        self.assertFalse(cal.is_blackout("ANY", date(2027, 3, 16), 0))

    def test_holidays(self) -> None:
        cal = EventCalendar([Event(date(2027, 1, 18), EventType.MARKET_HOLIDAY, None, None, None)])
        self.assertEqual(cal.holidays(), frozenset({date(2027, 1, 18)}))

    def test_upcoming_sorted(self) -> None:
        d = date(2027, 1, 1)
        cal = EventCalendar([Event(d + timedelta(days=3), EventType.MACRO, None, None, None),
                             Event(d + timedelta(days=1), EventType.MACRO, None, None, None)])
        self.assertEqual([e.d for e in cal.upcoming(d, 10)], [d + timedelta(days=1), d + timedelta(days=3)])

    def test_bad_date(self) -> None:
        with self.assertRaises(CalendarError):
            csv_cal(["2027-13-01,macro,,,,"])


if __name__ == "__main__":
    unittest.main()
