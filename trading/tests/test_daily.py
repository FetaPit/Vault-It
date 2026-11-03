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
        ks = self.ks = KillSwitch(None)
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

    def test_topup_does_not_hide_daily_loss(self) -> None:
        # top-up day (+100): the deposit is netted out of the loss, so a loss equal to the 3% cap
        # (18.75 on 625 day-start) still trips it
        self.broker._cash -= 18.75
        rep = self.close(date(2027, 2, 1), {"DIVA": 20.0})
        self.assertGreaterEqual(len(rep.decisions), 1)
        for d in rep.decisions:
            self.assertFalse(d.approved)
            self.assertIn("DAILY_LOSS_CAP_HIT", d.reasons)

    def test_topup_loss_still_visible_on_rerun(self) -> None:
        # FIX-103: the same-day rerun dedupes the deposit but must still net out today's top-up
        self.broker._cash -= 19.0
        first = self.close(date(2027, 2, 1))   # no prices: top-up applied, no buy signals yet
        self.assertEqual(first.decisions, ())
        self.assertAlmostEqual(self.j.cash_flow_total("topup", date(2027, 2, 1)), 100.0, places=6)
        self.assertEqual(self.j.cash_flow_total("topup", date(2027, 2, 2)), 0.0)
        second = self.close(date(2027, 2, 1), {"DIVA": 20.0})   # rerun: deposit deduped, signals now appear
        self.assertEqual(second.topups, ())
        self.assertGreaterEqual(len(second.decisions), 1)
        for d in second.decisions:
            self.assertFalse(d.approved)
            self.assertIn("DAILY_LOSS_CAP_HIT", d.reasons)

    def test_drawdown_kill_at_close(self) -> None:
        self.broker._cash += 115.0   # fund 840 after the 100 top-up, 16% below the 1000 peak
        self.pf.buy("DIVA", 1, 20.0, 0.0, 16.0)
        self.pf.credit_dividend("DIVA", 5.0, 0.0)   # DRIP would normally buy
        rep = run_daily_close(self.ctx, date(2027, 2, 1), utc(2027, 2, 1, 17, 0), {"DIVA": 20.0}, {}, 840.0,
                              1000.0, 0)
        self.assertTrue(self.ks.is_active())
        self.assertNotIn("drip_buy", [a.kind for a in rep.sleeve_b.actions])
        self.assertFalse(any(d.approved for d in rep.decisions))


if __name__ == "__main__":
    unittest.main()
