import helpers
import unittest
from dataclasses import replace
from datetime import date, datetime

from helpers import make_account, make_cfg, make_signal, utc
from trading.fx import FxConverter
from trading.killswitch import KillSwitch
from trading.models import ExitReason, Position, Side, Sleeve
from trading.risk import RiskEngine
from trading.session import session_window


class TestRisk(unittest.TestCase):
    def setUp(self) -> None:
        self.cfg = make_cfg()
        self.ks = KillSwitch(None)
        self.fx = FxConverter.from_config(self.cfg)
        self.eng = RiskEngine(self.cfg, self.ks, self.fx)
        self.window = session_window(date(2027, 1, 12), self.cfg.session)
        self.now = utc(2027, 1, 12, 15, 0)

    def ev(self, sig=None, acct=None, now=None, window="default", eng=None):
        return (eng or self.eng).evaluate(sig or make_signal(), acct or make_account(), now or self.now,
                                          self.window if window == "default" else window)

    def pos(self, symbol: str = "TESTC", risk: float = 15.0, sleeve: Sleeve = Sleeve.A) -> Position:
        return Position("p", "p", symbol, Side.LONG, sleeve, 1.0, 100.0, 95.0, None, self.now, risk, 0.0)

    def test_happy_path_sizing(self) -> None:
        d = self.ev()
        self.assertTrue(d.approved)
        self.assertEqual(d.reasons, ())
        self.assertAlmostEqual(d.quantity, 3.75, places=6)
        self.assertAlmostEqual(d.risk_gbp, 18.75, places=6)
        self.assertEqual(d.order.order_id, "sig-1-o")
        self.assertEqual(d.order.stop_price, 95.0)
        self.assertEqual(d.order.expires_ts, utc(2027, 1, 12, 16, 0))
        self.assertEqual(d.order.config_version, "v0001")

    def test_pending_risk_reserves_daily_budget(self) -> None:
        acct = replace(make_account(), pending_risk_gbp=18.75)
        d = self.ev(acct=acct)
        self.assertFalse(d.approved)
        self.assertEqual(d.reasons, ("DAILY_LOSS_BUDGET_EXHAUSTED",))

    def test_no_stop_rejected(self) -> None:
        d = self.ev(make_signal(stop=None))
        self.assertFalse(d.approved)
        self.assertIn("NO_STOP", d.reasons)
        self.assertEqual(d.quantity, 0.0)

    def test_zero_stop_distance(self) -> None:
        d = self.ev(make_signal(stop=100.0))
        self.assertIn("STOP_ZERO", d.reasons)
        self.assertNotIn("STOP_WRONG_SIDE", d.reasons)

    def test_stop_wrong_side(self) -> None:
        self.assertIn("STOP_WRONG_SIDE", self.ev(make_signal(stop=101.0)).reasons)

    def test_stop_too_tight(self) -> None:
        self.assertIn("STOP_TOO_TIGHT", self.ev(make_signal(stop=99.97)).reasons)

    def test_costs_included_in_sizing(self) -> None:
        d = self.ev(make_signal(symbol="TESTC"))
        self.assertAlmostEqual(d.quantity, 3.22, places=6)
        self.assertAlmostEqual(d.risk_gbp, 18.744, places=6)
        self.assertLessEqual(d.risk_gbp, 18.75)

    def test_fx_cost_in_sizing(self) -> None:
        d = self.ev(make_signal(symbol="TESTUSD"))
        self.assertAlmostEqual(d.quantity, 3.9, places=6)
        self.assertAlmostEqual(d.risk_gbp, 18.72, places=6)

    def test_whole_shares(self) -> None:
        d = self.ev(make_signal(symbol="TESTW"))
        self.assertAlmostEqual(d.quantity, 3.0, places=6)
        self.assertAlmostEqual(d.risk_gbp, 15.0, places=6)

    def test_fractional_shares(self) -> None:
        d = self.ev(make_signal(symbol="TESTF", stop=93.0))
        self.assertAlmostEqual(d.quantity, 2.6785, places=6)
        self.assertAlmostEqual(d.risk_gbp, 18.7495, places=6)

    def test_daily_cap_hit(self) -> None:
        d = self.ev(acct=make_account(fund=606.25, day_start=625.0))
        self.assertIn("DAILY_LOSS_CAP_HIT", d.reasons)

    def test_partial_daily_budget(self) -> None:
        d = self.ev(acct=make_account(fund=615.0, day_start=625.0, sleeve_equity=615.0))
        self.assertTrue(d.approved)
        self.assertAlmostEqual(d.quantity, 1.75, places=6)
        self.assertAlmostEqual(d.risk_gbp, 8.75, places=6)

    def test_open_risk_consumes_budget(self) -> None:
        d = self.ev(acct=make_account(positions=(self.pos(risk=15.0),)))
        self.assertAlmostEqual(d.quantity, 0.75, places=6)

    def test_budget_exhausted(self) -> None:
        d = self.ev(acct=make_account(positions=(self.pos(risk=18.75),)))
        self.assertEqual(d.reasons, ("DAILY_LOSS_BUDGET_EXHAUSTED",))

    def test_max_trades(self) -> None:
        self.assertIn("MAX_TRADES_PER_DAY", self.ev(acct=make_account(trades_today=3)).reasons)

    def test_kill_switch(self) -> None:
        self.ks.activate("x", self.now)
        self.assertIn("KILL_SWITCH_ACTIVE", self.ev().reasons)

    def test_after_cutoff(self) -> None:
        t = utc(2027, 1, 12, 16, 5)
        self.assertIn("OUTSIDE_SESSION_WINDOW", self.ev(make_signal(ts=t), now=t).reasons)

    def test_during_opening_range(self) -> None:
        t = utc(2027, 1, 12, 14, 40)
        self.assertIn("OUTSIDE_SESSION_WINDOW", self.ev(make_signal(ts=t), now=t).reasons)

    def test_no_window_sleeve_a(self) -> None:
        self.assertIn("NO_SESSION_WINDOW", self.ev(window=None).reasons)

    def test_stale(self) -> None:
        self.assertIn("STALE_SIGNAL", self.ev(make_signal(ts=utc(2027, 1, 12, 14, 57))).reasons)

    def test_future(self) -> None:
        sig = make_signal(ts=datetime(2027, 1, 12, 15, 0, 10, tzinfo=self.now.tzinfo))
        self.assertIn("SIGNAL_FROM_FUTURE", self.ev(sig).reasons)

    def test_short_share_rejected(self) -> None:
        d = self.ev(make_signal(side=Side.SHORT, stop=105.0))
        self.assertIn("SHORT_NOT_ALLOWED", d.reasons)

    def test_short_cfd_allowed(self) -> None:
        d = self.ev(make_signal(symbol="TESTCFD", side=Side.SHORT, stop=105.0))
        self.assertTrue(d.approved)
        self.assertAlmostEqual(d.quantity, 3.75, places=6)

    def test_duplicate_position(self) -> None:
        d = self.ev(acct=make_account(positions=(self.pos("TEST", risk=0.0),)))
        self.assertIn("DUPLICATE_POSITION", d.reasons)

    def test_unknown_instrument(self) -> None:
        self.assertIn("UNKNOWN_INSTRUMENT", self.ev(make_signal(symbol="NOPE")).reasons)

    def test_spread_bet_cash_only_too_small(self) -> None:
        d = self.ev(make_signal(symbol="SB", entry=5000.0, stop=4990.0))
        self.assertEqual(d.reasons, ("SIZE_BELOW_MINIMUM",))

    def test_spread_bet_leveraged(self) -> None:
        cfg = make_cfg({"risk": {"leverage_mode": "leveraged", "max_leverage": 5.0}})
        eng = RiskEngine(cfg, self.ks, FxConverter.from_config(cfg))
        d = self.ev(make_signal(symbol="SB", entry=5000.0, stop=4990.0), eng=eng)
        self.assertTrue(d.approved, d.reasons)
        self.assertAlmostEqual(d.quantity, 0.6, places=6)
        self.assertAlmostEqual(d.risk_gbp, 6.36, places=6)

    def test_fees_exceed_budget(self) -> None:
        self.assertEqual(self.ev(make_signal(symbol="TESTHF")).reasons, ("FEES_EXCEED_BUDGET",))

    def test_multiple_reasons_ordered(self) -> None:
        self.ks.activate("x", self.now)
        d = self.ev(make_signal(stop=None), make_account(trades_today=3))
        self.assertEqual(d.reasons, ("KILL_SWITCH_ACTIVE", "NO_STOP", "MAX_TRADES_PER_DAY"))

    def test_target_wrong_side(self) -> None:
        self.assertIn("TARGET_WRONG_SIDE", self.ev(make_signal(target=99.0)).reasons)

    def test_notional_cap_binds(self) -> None:
        d = self.ev(make_signal(stop=98.0), make_account(sleeve_equity=312.5))
        self.assertAlmostEqual(d.quantity, 3.12, places=6)
        self.assertAlmostEqual(d.risk_gbp, 6.24, places=6)

    def test_sleeve_b_cash_cap(self) -> None:
        d = self.ev(make_signal(sleeve=Sleeve.B, stop=80.0), make_account(sleeve_cash=50.0), window=None)
        self.assertTrue(d.approved, d.reasons)
        self.assertAlmostEqual(d.quantity, 0.5, places=6)
        self.assertIsNone(d.order.expires_ts)

    def test_drawdown_trips_kill(self) -> None:
        self.assertTrue(self.eng.update_drawdown(531.25, 625.0, self.now))
        self.assertTrue(self.ks.is_active())

    def test_drawdown_below_threshold(self) -> None:
        self.assertFalse(self.eng.update_drawdown(540.0, 625.0, self.now))
        self.assertFalse(self.ks.is_active())

    def test_must_flatten_reasons(self) -> None:
        acct = make_account()
        self.assertIsNone(self.eng.must_flatten_sleeve_a(self.now, self.window, acct))
        self.assertEqual(self.eng.must_flatten_sleeve_a(utc(2027, 1, 12, 16, 30), self.window, acct),
                         ExitReason.TIME_FLAT)
        self.assertEqual(self.eng.must_flatten_sleeve_a(self.now, self.window, make_account(fund=606.25)),
                         ExitReason.DAILY_CAP)
        self.ks.activate("x", self.now)
        self.assertEqual(self.eng.must_flatten_sleeve_a(self.now, self.window, acct), ExitReason.KILL_SWITCH)

    def test_naive_now(self) -> None:
        with self.assertRaises(ValueError):
            self.eng.evaluate(make_signal(), make_account(), datetime(2027, 1, 12, 15, 0), self.window)

    def test_invalid_entry(self) -> None:
        self.assertIn("INVALID_ENTRY_PRICE", self.ev(make_signal(entry=0.0)).reasons)

    def test_short_sleeve_b_rejected(self) -> None:
        d = self.ev(make_signal(symbol="TESTCFD", side=Side.SHORT, stop=105.0, sleeve=Sleeve.B), window=None)
        self.assertIn("SHORT_NOT_ALLOWED", d.reasons)


if __name__ == "__main__":
    unittest.main()
