import helpers
import unittest
from datetime import date

from helpers import make_cfg, utc
from trading.broker import PaperBroker
from trading.daily import DailyContext, ensure_initial_capital, run_daily_close
from trading.fx import FxConverter
from trading.journal import TradeJournal
from trading.killswitch import KillSwitch
from trading.risk import RiskEngine
from trading.sleeve_b.events import EventCalendar
from trading.sleeve_b.manager import SleeveBManager
from trading.sleeve_b.portfolio import DividendPortfolio
from trading.sleeve_b.sweep import SweepTracker
from trading.topup import TopUpScheduler


class TestDaily(unittest.TestCase):
    def setUp(self) -> None:
        cfg = make_cfg()
        fx = FxConverter.from_config(cfg)
        self.j = TradeJournal(":memory:")
        self.addCleanup(self.j.close)
        self.broker = PaperBroker(cfg, fx, 312.5, self.j)
        self.pf = DividendPortfolio(312.5)
        ks = KillSwitch(None)
        self.ctx = DailyContext(cfg, self.j, self.broker, self.pf,
                                SleeveBManager(cfg, self.pf, EventCalendar([]), ks, fx),
                                RiskEngine(cfg, ks, fx), TopUpScheduler.from_config(cfg),
                                SweepTracker(cfg, self.j), fx)
        self.now = utc(2027, 2, 1, 17, 0)
        ensure_initial_capital(self.ctx, self.now)

    def close(self, d: date, prices=None, trades_today: int = 0):
        return run_daily_close(self.ctx, d, utc(d.year, d.month, d.day, 17, 0), prices or {}, {}, 625.0, 625.0,
                               trades_today)

    def test_topup_first_month(self) -> None:
        rep = self.close(date(2027, 2, 1))
        self.assertEqual(len(rep.topups), 1)
        self.assertAlmostEqual(self.broker.cash_gbp, 362.5, places=6)
        self.assertAlmostEqual(self.pf.cash_gbp, 362.5, places=6)
        self.assertAlmostEqual(self.j.sum_cash_flows("topup"), 100.0, places=6)

    def test_idempotent_rerun(self) -> None:
        self.close(date(2027, 2, 1))
        rep = self.close(date(2027, 2, 1))
        self.assertEqual(rep.topups, ())
        self.assertAlmostEqual(self.j.sum_cash_flows("topup"), 100.0, places=6)
        self.assertAlmostEqual(self.broker.cash_gbp, 362.5, places=6)

    def test_sweep_triggered(self) -> None:
        self.pf.buy("DIVA", 10, 20.0, 0.0, 16.0)
        rep = self.close(date(2026, 12, 1), {"DIVA": 30.8})
        self.assertAlmostEqual(self.pf.unrealised_gbp({"DIVA": 30.8}) + self.pf.realised_gbp, 108.0, places=6)
        self.assertAlmostEqual(rep.fund_equity_gbp, 733.0, places=6)
        self.assertEqual(rep.sweep.coin_name, "silver_britannia_1oz")
        self.assertIsNotNone(self.j.open_sweep_recommendation_id())

    def test_equity_row(self) -> None:
        self.close(date(2027, 2, 1))
        self.assertEqual([r[0] for r in self.j.daily_equity_rows()], ["2027-02-01"])

    def test_buy_signal_flows_through_risk(self) -> None:
        rep = self.close(date(2027, 3, 2), {"DIVA": 20.0})
        self.assertGreaterEqual(len(rep.decisions), 1)
        self.assertTrue(rep.decisions[0].approved, rep.decisions[0].reasons)
        self.assertIsNotNone(self.pf.holding("DIVA"))
        self.assertEqual(self.j.count("decisions"), len(rep.decisions))
        again = self.close(date(2027, 3, 2), {"DIVA": 20.0})   # same-day rerun: duplicate signal skipped
        self.assertEqual(again.decisions, ())


if __name__ == "__main__":
    unittest.main()
