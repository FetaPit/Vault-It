import helpers
import unittest

from trading.forecast import forecast_table, goal_progress_pct, monthly_rate, months_to_target


class TestForecast(unittest.TestCase):
    def setUp(self) -> None:
        self.rows = forecast_table()

    def test_table_months(self) -> None:
        got = {(r.start_gbp, r.annual_rate): r.months for r in self.rows}
        exp = {500.0: [145, 113, 101, 89], 625.0: [144, 112, 100, 88], 750.0: [143, 110, 98, 87]}
        for s, ms in exp.items():
            for rate, m in zip((0.0, 0.05, 0.08, 0.12), ms):
                self.assertEqual(got[(s, rate)], m, (s, rate))

    def test_table_years(self) -> None:
        got = {(r.start_gbp, r.annual_rate): r.years for r in self.rows}
        exp = {500.0: [12.1, 9.4, 8.4, 7.4], 625.0: [12.0, 9.3, 8.3, 7.3], 750.0: [11.9, 9.2, 8.2, 7.2]}
        for s, ys in exp.items():
            for rate, y in zip((0.0, 0.05, 0.08, 0.12), ys):
                self.assertEqual(got[(s, rate)], y, (s, rate))

    def test_already_at_target(self) -> None:
        self.assertEqual(months_to_target(15000, 100, 0.05, 15000), 0)

    def test_unreachable(self) -> None:
        self.assertIsNone(months_to_target(100, 0, 0.0, 15000))

    def test_bad_rate(self) -> None:
        with self.assertRaises(ValueError):
            monthly_rate(-1)

    def test_monthly_rate(self) -> None:
        self.assertAlmostEqual(monthly_rate(0.12), 0.0094888, places=6)

    def test_goal_progress(self) -> None:
        self.assertAlmostEqual(goal_progress_pct(7000, 500, 15000), 50.0, places=6)


if __name__ == "__main__":
    unittest.main()
