import helpers
import unittest
from datetime import date

from helpers import make_cfg, utc
from trading.fx import FxConverter
from trading.killswitch import KillSwitch
from trading.models import Side, Sleeve
from trading.sleeve_b.events import Event, EventCalendar, EventType
from trading.sleeve_b.manager import SleeveBManager
from trading.sleeve_b.portfolio import DividendPortfolio

NOW = utc(2027, 3, 1, 17, 0)


def exdiv(d: date, sym: str = "DIVA", amt: float = 0.5) -> Event:
    return Event(d, EventType.EX_DIVIDEND, sym, amt, None)


def pay(d: date, ref: date, sym: str = "DIVA", amt: float = 0.5) -> Event:
    return Event(d, EventType.DIVIDEND_PAY, sym, amt, ref)


def mk(cash: float = 300.0, events=(), cfg=None, ks=None):
    cfg = cfg or make_cfg()
    pf = DividendPortfolio(cash)
    ks = ks or KillSwitch(None)
    return pf, ks, SleeveBManager(cfg, pf, EventCalendar(list(events)), ks, FxConverter.from_config(cfg))


def kinds(rep) -> list[str]:
    return [a.kind for a in rep.actions]


class TestSleeveBManager(unittest.TestCase):
    def test_exdiv_snapshot_pays(self) -> None:
        pf, _, m = mk(events=[exdiv(date(2027, 3, 1)), pay(date(2027, 3, 20), date(2027, 3, 1))])
        pf.buy("DIVA", 10, 20.0, 0.0, 16.0)
        m.daily_step(date(2027, 3, 1), {"DIVA": 20.0}, NOW)
        self.assertEqual(m.entitlements()[("DIVA", date(2027, 3, 1))], 10)
        rep = m.daily_step(date(2027, 3, 20), {"DIVA": 20.0}, NOW)
        a = [x for x in rep.actions if x.kind == "dividend_credit"][0]
        self.assertAlmostEqual(a.amount_gbp, 5.0, places=6)

    def test_same_day_rerun_no_double_credit(self) -> None:
        pf, _, m = mk(events=[exdiv(date(2027, 3, 1)), pay(date(2027, 3, 20), date(2027, 3, 1))])
        pf.buy("DIVA", 10, 20.0, 0.0, 16.0)
        m.daily_step(date(2027, 3, 1), {"DIVA": 20.0}, NOW)
        m.daily_step(date(2027, 3, 1), {"DIVA": 20.0}, NOW)   # rerun must not re-snapshot
        self.assertEqual(m.entitlements()[("DIVA", date(2027, 3, 1))], 10)
        m.daily_step(date(2027, 3, 20), {"DIVA": 20.0}, NOW)
        cash = pf.cash_gbp
        rep = m.daily_step(date(2027, 3, 20), {"DIVA": 20.0}, NOW)
        self.assertNotIn("dividend_credit", kinds(rep))
        self.assertAlmostEqual(pf.cash_gbp, cash, places=9)

    def test_bought_on_exdate_not_entitled(self) -> None:
        pf, _, m = mk(events=[exdiv(date(2027, 3, 1)), pay(date(2027, 3, 20), date(2027, 3, 1))])
        m.daily_step(date(2027, 3, 1), {"DIVA": 20.0}, NOW)
        pf.buy("DIVA", 10, 20.0, 0.0, 16.0)
        rep = m.daily_step(date(2027, 3, 20), {"DIVA": 20.0}, NOW)
        self.assertNotIn("dividend_credit", kinds(rep))

    def test_drip_fractional(self) -> None:
        pf, _, m = mk()
        pf.buy("DIVA", 1, 20.0, 0.0, 16.0)
        pf.credit_dividend("DIVA", 5.0, 0.0)
        rep = m.daily_step(date(2027, 3, 2), {"DIVA": 20.0}, NOW)
        a = [x for x in rep.actions if x.kind == "drip_buy"][0]
        self.assertAlmostEqual(a.quantity, 0.25, places=6)
        self.assertAlmostEqual(pf.dividend_pool("DIVA"), 0.0, places=6)

    def test_drip_carry_forward(self) -> None:
        cfg = make_cfg({"sleeve_b": {"targets": [{"symbol": "DIVW", "weight": 0.6}]}})
        pf, _, m = mk(cfg=cfg)
        pf.buy("DIVW", 1, 20.0, 0.0, 16.0)
        pf.credit_dividend("DIVW", 5.0, 0.0)
        rep = m.daily_step(date(2027, 3, 2), {"DIVW": 20.0}, NOW)
        self.assertNotIn("drip_buy", kinds(rep))
        self.assertAlmostEqual(pf.dividend_pool("DIVW"), 5.0, places=6)

    def test_protective_stop(self) -> None:
        pf, _, m = mk()
        pf.buy("DIVA", 10, 20.0, 0.0, 16.0)
        rep = m.daily_step(date(2027, 3, 2), {"DIVA": 15.9}, NOW)
        self.assertIn("protective_stop_sell", kinds(rep))
        self.assertIsNone(pf.holding("DIVA"))

    def test_tranche_sell(self) -> None:
        pf, _, m = mk()
        pf.buy("DIVA", 10, 10.0, 0.0, 8.0)
        rep = m.daily_step(date(2027, 3, 2), {"DIVA": 13.0}, NOW)
        a = [x for x in rep.actions if x.kind == "tranche_sell"]
        self.assertEqual(len(a), 1)
        self.assertAlmostEqual(a[0].quantity, 2.5, places=6)
        self.assertEqual(pf.holding("DIVA").triggered_tranches, {0})
        again = m.daily_step(date(2027, 3, 3), {"DIVA": 13.0}, NOW)
        self.assertNotIn("tranche_sell", kinds(again))

    def test_buy_signal_underweight(self) -> None:
        pf, _, m = mk(300.0)
        rep = m.daily_step(date(2027, 3, 2), {"DIVA": 20.0}, NOW)
        self.assertEqual(len(rep.buy_signals), 1)
        s = rep.buy_signals[0]
        self.assertEqual((s.symbol, s.sleeve, s.side), ("DIVA", Sleeve.B, Side.LONG))
        self.assertAlmostEqual(s.stop, 16.0, places=6)
        self.assertEqual(s.signal_id, "sleeveb-DIVA-20270302")

    def test_earnings_blackout(self) -> None:
        ev = Event(date(2027, 3, 3), EventType.EARNINGS, "DIVA", None, None)
        _, _, m = mk(300.0, events=[ev])
        self.assertEqual(m.daily_step(date(2027, 3, 2), {"DIVA": 20.0}, NOW).buy_signals, ())

    def test_kill_switch(self) -> None:
        ks = KillSwitch(None)
        ks.activate("x", NOW)
        pf, _, m = mk(300.0, ks=ks)
        pf.buy("DIVA", 1, 20.0, 0.0, 16.0)
        pf.credit_dividend("DIVA", 5.0, 0.0)
        rep = m.daily_step(date(2027, 3, 2), {"DIVA": 20.0}, NOW)
        self.assertNotIn("drip_buy", kinds(rep))
        self.assertEqual(rep.buy_signals, ())
        self.assertAlmostEqual(pf.dividend_pool("DIVA"), 5.0, places=6)

    def test_below_min_trade(self) -> None:
        _, _, m = mk(40.0)
        self.assertEqual(m.daily_step(date(2027, 3, 2), {"DIVA": 20.0}, NOW).buy_signals, ())

    def test_stop_exit_allowed_during_kill(self) -> None:
        ks = KillSwitch(None)
        ks.activate("x", NOW)
        pf, _, m = mk(ks=ks)
        pf.buy("DIVA", 10, 20.0, 0.0, 16.0)
        self.assertIn("protective_stop_sell", kinds(m.daily_step(date(2027, 3, 2), {"DIVA": 15.0}, NOW)))


if __name__ == "__main__":
    unittest.main()
