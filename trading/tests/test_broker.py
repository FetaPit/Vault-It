import helpers
import unittest
from dataclasses import replace

from helpers import make_bar, make_cfg, utc
from trading.broker import PaperBroker
from trading.errors import OrderError, PaperOnlyViolation
from trading.fx import FxConverter
from trading.models import EntryType, ExitReason, OrderRequest, OrderStatus, Side, Sleeve

T0 = utc(2027, 1, 12, 14, 50)


def tb(i: int):
    from datetime import timedelta
    return T0 + timedelta(minutes=5 * i)


def order(symbol: str = "TEST", side: Side = Side.LONG, qty: float = 3.75, entry: float = 100.0,
          stop: float = 95.0, target: float | None = 110.0, expires=None, oid: str = "o1") -> OrderRequest:
    return OrderRequest(oid, "s1", symbol, side, qty, EntryType.MARKET, entry, stop, target, Sleeve.A, T0,
                        expires, "v0001")


class BrokerBase(unittest.TestCase):
    def setUp(self) -> None:
        self.cfg = make_cfg()
        self.fx = FxConverter.from_config(self.cfg)
        self.b = PaperBroker(self.cfg, self.fx, 625.0)

    def submit(self, o: OrderRequest, risk: float = 18.75) -> None:
        self.b.submit_bracket(o, risk)

    def bar(self, i: int, o: float, h: float, l: float, c: float, v: float = 0.0, sym: str = "TEST"):
        return make_bar(sym, tb(i), o, h, l, c, v)


class TestBroker(BrokerBase):
    def entered(self, **kw) -> None:
        self.submit(order(**kw))
        self.b.on_bar(self.bar(0, 100, 101, 99, 100.5, sym=kw.get("symbol", "TEST")))

    def test_market_entry_fill(self) -> None:
        self.submit(order())
        fills = self.b.on_bar(self.bar(0, 100, 101, 99, 100.5))
        self.assertEqual(len(fills), 1)
        self.assertEqual(fills[0].price, 100.0)
        self.assertEqual(fills[0].action, "buy")
        self.assertAlmostEqual(self.b.open_positions()[0].quantity, 3.75, places=6)

    def test_target_exit(self) -> None:
        self.entered()
        self.b.on_bar(self.bar(1, 101, 111, 100.5, 110.5))
        t = self.b.closed_trades[0]
        self.assertEqual((t.exit_price, t.exit_reason), (110.0, ExitReason.TARGET))
        self.assertAlmostEqual(t.gross_pnl_gbp, 37.5, places=6)
        self.assertAlmostEqual(self.b.cash_gbp, 662.5, places=6)

    def test_gap_through_stop(self) -> None:
        self.entered()
        self.b.on_bar(self.bar(1, 90, 91, 88, 89))
        t = self.b.closed_trades[0]
        self.assertEqual((t.exit_price, t.exit_reason), (90.0, ExitReason.STOP))
        self.assertAlmostEqual(t.net_pnl_gbp, -37.5, places=6)
        self.assertLess(t.net_pnl_gbp, -18.75)

    def test_stop_wins_same_bar(self) -> None:
        self.entered()
        self.b.on_bar(self.bar(1, 101, 111, 94, 100))
        t = self.b.closed_trades[0]
        self.assertEqual((t.exit_price, t.exit_reason), (95.0, ExitReason.STOP))

    def test_gap_beyond_target(self) -> None:
        self.entered()
        self.b.on_bar(self.bar(1, 112, 113, 111, 112))
        t = self.b.closed_trades[0]
        self.assertEqual((t.exit_price, t.exit_reason), (112.0, ExitReason.TARGET))

    def test_same_bar_entry_then_stop(self) -> None:
        self.submit(order())
        fills = self.b.on_bar(self.bar(0, 100, 111, 94, 96))
        self.assertEqual(len(fills), 2)
        t = self.b.closed_trades[0]
        self.assertEqual((t.entry_price, t.exit_price, t.exit_reason), (100.0, 95.0, ExitReason.STOP))

    def test_entry_past_stop_cancelled(self) -> None:
        self.submit(order())
        fills = self.b.on_bar(self.bar(0, 94, 96, 93, 95))
        self.assertEqual(fills, [])
        self.assertEqual(self.b.order_status("o1"), OrderStatus.CANCELLED)
        self.assertEqual(self.b.open_positions(), ())

    def test_partial_fill_vwap(self) -> None:
        self.submit(order(target=None))
        f1 = self.b.on_bar(self.bar(0, 100, 101, 99, 100.5, v=20))
        self.assertAlmostEqual(f1[0].quantity, 2.0, places=6)
        self.assertTrue(f1[0].is_partial)
        self.assertAlmostEqual(self.b.open_positions()[0].initial_risk_gbp, 10.0, places=6)
        self.assertEqual(self.b.order_status("o1"), OrderStatus.PARTIALLY_FILLED)
        f2 = self.b.on_bar(self.bar(1, 101, 102, 100, 101.5, v=20))
        # FIX-002: remaining risk budget (8.75) / 6 per unit at 101 -> 1.45, order then cancelled
        self.assertAlmostEqual(f2[0].quantity, 1.45, places=6)
        self.assertTrue(f2[0].is_partial)
        self.assertAlmostEqual(self.b.open_positions()[0].entry_price, (200 + 146.45) / 3.45, places=5)
        self.assertEqual(self.b.order_status("o1"), OrderStatus.CANCELLED)
        # FIX-101: real risk of the two fills = 2*5 + 1.45*6 = 18.70, not a pro-rata share
        self.assertAlmostEqual(self.b.open_positions()[0].initial_risk_gbp, 18.70, places=6)

    def test_partial_fill_commissions_reserved(self) -> None:
        # FIX-102: each partial fill pays the minimum commission again; it must come out of the budget
        cfg = make_cfg({"fees": {"mc": {"min_commission_gbp": 1.0}},
                        "instruments": {"TESTMC": {"kind": "share", "currency": "GBP", "min_size": 0.01,
                                                   "size_step": 0.01, "fee_profile": "mc"}}})
        b = PaperBroker(cfg, FxConverter.from_config(cfg), 625.0)
        b.submit_bracket(order(symbol="TESTMC", qty=3.35, target=None), 18.75)   # sizing: (18.75-2)/5
        fills = b.on_bar(self.bar(0, 100, 101, 99, 100.5, v=20, sym="TESTMC"))
        fills += b.on_bar(self.bar(1, 100, 101, 99, 100.5, v=0, sym="TESTMC"))
        self.assertEqual(len(fills), 2)
        self.assertAlmostEqual(fills[0].quantity, 2.0, places=6)
        # entry fills + one exit commission (1.0) must stay within the budget
        total = sum(f.quantity * (f.price - 95.0) + f.commission_gbp for f in fills) + 1.0
        self.assertLessEqual(total, 18.75 + 1e-9)
        self.assertAlmostEqual(fills[1].quantity, 1.15, places=6)

    def test_entry_drift_capped_by_risk(self) -> None:
        self.submit(order(target=None))
        f = self.b.on_bar(self.bar(0, 105, 106, 104, 105))
        self.assertAlmostEqual(f[0].quantity, 1.87, places=6)
        self.assertEqual(self.b.order_status("o1"), OrderStatus.CANCELLED)
        self.assertAlmostEqual(self.b.open_positions()[0].quantity, 1.87, places=6)
        self.assertAlmostEqual(self.b.open_positions()[0].initial_risk_gbp, 18.70, places=6)

    def test_drift_fill_leaves_no_budget_for_second_signal(self) -> None:
        from helpers import make_account, make_signal
        from dataclasses import replace as rep
        from trading.killswitch import KillSwitch
        from trading.risk import RiskEngine
        self.submit(order(target=None))
        self.b.on_bar(self.bar(0, 105, 106, 104, 105))
        self.assertEqual(self.b.order_status("o1"), OrderStatus.CANCELLED)
        acct = rep(make_account(positions=self.b.open_positions()),
                   pending_risk_gbp=self.b.pending_risk_gbp(Sleeve.A))
        eng = RiskEngine(self.cfg, KillSwitch(None), self.fx)
        from datetime import date
        from trading.session import session_window
        window = session_window(date(2027, 1, 12), self.cfg.session)
        d = eng.evaluate(make_signal(symbol="TESTC", signal_id="sig-2"), acct, utc(2027, 1, 12, 15, 0), window)
        self.assertFalse(d.approved)
        # PLAN_GAP: review-002 expected DAILY_LOSS_BUDGET_EXHAUSTED, but the real remaining budget is
        # 18.75 - 18.70 = 0.05 (> EPS), so sizing fails one step later on fixed fees.
        # Implemented as: assert total counted risk is 18.70 and the signal is rejected (FEES_EXCEED_BUDGET).
        self.assertAlmostEqual(sum(p.initial_risk_gbp for p in acct.open_positions) + acct.pending_risk_gbp,
                               18.70, places=6)
        self.assertEqual(d.reasons, ("FEES_EXCEED_BUDGET",))

    def test_zero_volume_full_fill(self) -> None:
        self.submit(order())
        f = self.b.on_bar(self.bar(0, 100, 101, 99, 100, v=0))
        self.assertAlmostEqual(f[0].quantity, 3.75, places=6)

    def test_liquidity_below_min_no_fill(self) -> None:
        self.submit(order(symbol="TESTW", qty=3.0))
        self.assertEqual(self.b.on_bar(self.bar(0, 100, 101, 99, 100, v=5, sym="TESTW")), [])
        self.assertEqual(self.b.order_status("o1"), OrderStatus.PENDING)

    def test_expiry_cancels(self) -> None:
        self.submit(order(expires=utc(2027, 1, 12, 15, 0)))
        self.assertEqual(self.b.on_bar(self.bar(2, 100, 101, 99, 100)), [])
        self.assertEqual(self.b.order_status("o1"), OrderStatus.CANCELLED)

    def test_bar_before_order_ignored(self) -> None:
        self.submit(order())
        self.assertEqual(self.b.on_bar(make_bar("TEST", utc(2027, 1, 12, 14, 45), 100, 101, 99, 100)), [])
        self.assertEqual(self.b.order_status("o1"), OrderStatus.PENDING)

    def test_short_profit(self) -> None:
        self.entered(symbol="TESTCFD", side=Side.SHORT, stop=105.0, target=90.0)
        self.b.on_bar(self.bar(1, 99, 99.5, 89, 90, sym="TESTCFD"))
        t = self.b.closed_trades[0]
        self.assertEqual(t.exit_price, 90.0)
        self.assertAlmostEqual(t.gross_pnl_gbp, 37.5, places=6)

    def test_short_gap_stop(self) -> None:
        self.entered(symbol="TESTCFD", side=Side.SHORT, stop=105.0, target=90.0)
        self.b.on_bar(self.bar(1, 110, 111, 109, 110, sym="TESTCFD"))
        t = self.b.closed_trades[0]
        self.assertEqual(t.exit_price, 110.0)
        self.assertAlmostEqual(t.gross_pnl_gbp, -37.5, places=6)

    def test_costs_round_trip(self) -> None:
        self.submit(order(symbol="TESTC", qty=3.22, target=None), risk=18.744)
        f = self.b.on_bar(self.bar(0, 100, 101, 99, 100, sym="TESTC"))
        self.assertAlmostEqual(f[0].price, 100.1, places=6)
        self.b.on_bar(self.bar(1, 96, 96, 94.9, 95, sym="TESTC"))
        t = self.b.closed_trades[0]
        self.assertAlmostEqual(t.exit_price, 94.95, places=6)
        self.assertAlmostEqual(t.fees_gbp, 2.0, places=6)
        self.assertAlmostEqual(t.net_pnl_gbp, -18.583, places=3)
        self.assertLessEqual(abs(t.net_pnl_gbp), 18.744 + 1e-9)

    def test_fx_costs(self) -> None:
        self.submit(order(symbol="TESTUSD", qty=3.9), risk=18.72)
        f = self.b.on_bar(self.bar(0, 100, 101, 99, 100, sym="TESTUSD"))
        self.assertAlmostEqual(f[0].fx_cost_gbp, 1.56, places=6)
        x = self.b.on_bar(self.bar(1, 101, 111, 100.5, 110.5, sym="TESTUSD"))
        self.assertAlmostEqual(x[0].fx_cost_gbp, 1.716, places=6)
        t = self.b.closed_trades[0]
        self.assertAlmostEqual(t.gross_pnl_gbp, 31.2, places=6)
        self.assertAlmostEqual(t.net_pnl_gbp, 27.924, places=6)

    def test_stamp_duty(self) -> None:
        self.submit(order(symbol="TESTUK", qty=10.0))
        f = self.b.on_bar(self.bar(0, 100, 101, 99, 100, sym="TESTUK"))
        self.assertAlmostEqual(f[0].stamp_duty_gbp, 5.0, places=6)
        self.assertAlmostEqual(self.b.cash_gbp, 620.0, places=6)

    def test_flatten(self) -> None:
        self.entered()
        self.submit(order(symbol="TESTC", oid="o2"))
        fills = self.b.flatten({"TEST": 102.0}, utc(2027, 1, 12, 16, 30), ExitReason.TIME_FLAT)
        self.assertEqual(fills[0].price, 102.0)
        self.assertEqual(self.b.closed_trades[0].exit_reason, ExitReason.TIME_FLAT)
        self.assertEqual(self.b.open_positions(), ())
        self.assertEqual(self.b.pending_orders(), ())

    def test_flatten_missing_mark(self) -> None:
        self.entered()
        self.b.flatten({}, utc(2027, 1, 12, 16, 30), ExitReason.TIME_FLAT)
        t = self.b.closed_trades[0]
        self.assertEqual(t.exit_price, 100.0)
        self.assertAlmostEqual(t.gross_pnl_gbp, 0.0, places=6)

    def test_stop_cancels_partial_remainder(self) -> None:
        self.submit(order(target=None))
        self.b.on_bar(self.bar(0, 100, 101, 99, 100.5, v=20))
        self.b.on_bar(self.bar(1, 99, 99.5, 94, 95, v=20))
        t = self.b.closed_trades[0]
        self.assertAlmostEqual(t.quantity, 2.0, places=6)
        self.assertEqual(t.exit_price, 95.0)
        self.assertEqual(self.b.order_status("o1"), OrderStatus.CANCELLED)
        self.b.on_bar(self.bar(2, 99, 100, 98, 99, v=20))
        self.assertEqual(self.b.open_positions(), ())

    def test_bad_order_raises(self) -> None:
        for name, o in [("qty0", order(qty=0)), ("stop0", order(stop=0)), ("stop_ge_entry", order(stop=100))]:
            with self.subTest(name), self.assertRaises(OrderError):
                self.submit(o)
        with self.subTest("dup"):
            self.submit(order())
            with self.assertRaises(OrderError):
                self.submit(order())
        with self.subTest("unknown"), self.assertRaises(OrderError):
            self.submit(order(symbol="NOPE", oid="o9"))

    def test_deposit(self) -> None:
        self.b.deposit(50, T0)
        self.assertAlmostEqual(self.b.cash_gbp, 675.0, places=6)
        with self.assertRaises(ValueError):
            self.b.deposit(-5, T0)

    def test_equity_unrealised(self) -> None:
        self.entered()
        self.assertAlmostEqual(self.b.unrealised_gbp({"TEST": 104.0}), 15.0, places=6)
        self.assertAlmostEqual(self.b.equity_gbp({"TEST": 104.0}), 640.0, places=6)
        self.assertAlmostEqual(self.b.open_notional_gbp(), 375.0, places=6)

    def test_stop_and_limit_entries(self) -> None:
        o = replace(order(), entry_type=EntryType.STOP, entry_price=102.0, target_price=None)
        self.submit(o)
        self.assertEqual(self.b.on_bar(self.bar(0, 100, 101, 99, 100)), [])
        f = self.b.on_bar(self.bar(1, 100, 103, 99, 102))
        self.assertEqual(f[0].price, 102.0)
        self.b.flatten({}, T0, ExitReason.MANUAL)
        o2 = replace(order(oid="o2"), entry_type=EntryType.LIMIT, entry_price=98.0, target_price=None)
        self.submit(o2)
        self.assertEqual(self.b.on_bar(self.bar(2, 100, 101, 99.5, 100)), [])
        f2 = self.b.on_bar(self.bar(3, 99, 100, 97.5, 99))
        self.assertEqual(f2[0].price, 98.0)

    def test_refuses_non_paper(self) -> None:
        with self.assertRaises(PaperOnlyViolation):
            PaperBroker(replace(self.cfg, mode="live"), self.fx, 625.0)


if __name__ == "__main__":
    unittest.main()
