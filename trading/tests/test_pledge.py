import helpers
import contextlib
import io
import tempfile
import unittest
from dataclasses import replace
from datetime import date, datetime, timezone
from pathlib import Path

from helpers import make_cfg, utc
from trading.cli import main
from trading.config import PledgeConfig, config_hash, config_from_dict, config_to_dict, default_config
from trading.errors import ConfigError
from trading.journal import TradeJournal
from trading.models import ClosedTrade, ExitReason, Side, Sleeve
from trading.pledge import accrue_step, pledge_status, update_pledge


def add_trade(j: TradeJournal, tid: str, day: int, net: float, month: int = 3) -> None:
    ts = utc(2026, month, day, 15)
    j.record_trade(ClosedTrade(tid, "p" + tid, "SPY", Side.LONG, Sleeve.A, 1.0, 100.0, 101.0, ts, ts,
                               net + 1, 1.0, net, ExitReason.TARGET, "v0001"))


class TestPledge(unittest.TestCase):
    def setUp(self) -> None:
        self.j = TradeJournal(":memory:")
        self.cfg = PledgeConfig()
        self.end = date(2026, 12, 31)

    def tearDown(self) -> None:
        self.j.close()

    def test_accrual_on_gains(self) -> None:
        add_trade(self.j, "a", 1, 200.0)
        steps = update_pledge(self.j, self.cfg, self.end)
        self.assertAlmostEqual(steps[0].accrual_gbp, 2.0)   # GBP 1 per GBP 100
        self.assertAlmostEqual(self.j.pledge_last()[3], 2.0)

    def test_none_while_below_hwm_then_only_on_excess(self) -> None:
        add_trade(self.j, "a", 1, 100.0)    # cum 100, hwm 100, accrual 1.00
        add_trade(self.j, "b", 2, -60.0)    # cum 40, below hwm
        add_trade(self.j, "c", 3, 30.0)     # cum 70, still below
        add_trade(self.j, "d", 4, 50.0)     # cum 120, 20 above hwm -> 0.20
        steps = update_pledge(self.j, self.cfg, self.end)
        self.assertEqual([round(s.accrual_gbp, 4) for s in steps], [1.0, 0.0, 0.0, 0.2])
        self.assertAlmostEqual(steps[-1].cumulative_accrued_gbp, 1.2)
        self.assertAlmostEqual(steps[-1].hwm_gbp, 120.0)

    def test_deposits_and_unrealised_excluded(self) -> None:
        self.j.record_cash_flow(utc(2026, 3, 1), "initial", 625.0)
        self.j.record_cash_flow(utc(2026, 3, 2), "topup", 100.0)
        self.j.upsert_daily_equity(date(2026, 3, 3), 725.0, 900.0, 0.0, 175.0, 0.0, 0, "v0001")
        self.assertEqual(update_pledge(self.j, self.cfg, self.end), [])
        self.assertIsNone(self.j.pledge_last())

    def test_dividends_included(self) -> None:
        self.j.record_cash_flow(utc(2026, 3, 5), "dividend", 50.0, "net of WHT")
        steps = update_pledge(self.j, self.cfg, self.end)
        self.assertAlmostEqual(steps[0].accrual_gbp, 0.5)

    def test_rate_zero_and_hundred(self) -> None:
        add_trade(self.j, "a", 1, 80.0)
        self.assertAlmostEqual(update_pledge(self.j, PledgeConfig(rate_pct=0.0), self.end)[0].accrual_gbp, 0.0)
        j2 = TradeJournal(":memory:")
        add_trade(j2, "a", 1, 80.0)
        self.assertAlmostEqual(update_pledge(j2, PledgeConfig(rate_pct=100.0), self.end)[0].accrual_gbp, 80.0)
        j2.close()

    def test_idempotent_rerun(self) -> None:
        add_trade(self.j, "a", 1, 100.0)
        first = update_pledge(self.j, self.cfg, self.end)
        again = update_pledge(self.j, self.cfg, self.end)
        self.assertEqual(len(first), 1)
        self.assertEqual(again, [])
        self.assertEqual(self.j.count("pledge_ledger"), 1)
        add_trade(self.j, "b", 2, 100.0)
        more = update_pledge(self.j, self.cfg, self.end)
        self.assertEqual(len(more), 1)
        self.assertAlmostEqual(more[0].cumulative_accrued_gbp, 2.0)
        self.assertFalse(self.j.record_pledge_row("2026-03-01", 1.0, 1.0, 1.0, 1.0))

    def test_as_of_limits_days(self) -> None:
        add_trade(self.j, "a", 1, 100.0)
        add_trade(self.j, "b", 9, 100.0)
        self.assertEqual(len(update_pledge(self.j, self.cfg, date(2026, 3, 5))), 1)

    def test_disabled_noop(self) -> None:
        add_trade(self.j, "a", 1, 100.0)
        self.assertEqual(update_pledge(self.j, PledgeConfig(enabled=False), self.end), [])

    def test_accrue_step_pure(self) -> None:
        self.assertEqual(accrue_step(0.0, 0.0, 0.0, -10.0, 1.0), (0.0, 0.0, 0.0, -10.0))

    def test_status_text(self) -> None:
        self.assertIn("UNSET", pledge_status(self.j, self.cfg))
        self.assertIn("[VERIFY]", pledge_status(self.j, self.cfg))


class TestPledgeConfig(unittest.TestCase):
    def test_defaults_and_hash_stable(self) -> None:
        c = default_config()
        self.assertEqual((c.pledge.enabled, c.pledge.rate_pct, c.pledge.destination), (True, 1.0, "UNSET"))
        self.assertNotIn("pledge", config_to_dict(c))   # default omitted: old config hashes unchanged
        self.assertEqual(config_from_dict(config_to_dict(c)), c)

    def test_custom_roundtrip_changes_hash(self) -> None:
        c = make_cfg({"pledge": {"rate_pct": 2.5}})
        self.assertEqual(c.pledge.rate_pct, 2.5)
        self.assertIn("pledge", config_to_dict(c))
        self.assertEqual(config_from_dict(config_to_dict(c)), c)
        self.assertNotEqual(config_hash(c), config_hash(make_cfg()))

    def test_validation(self) -> None:
        for rate in (0, 100):
            make_cfg({"pledge": {"rate_pct": rate}})
        for rate in (-0.1, 100.1):
            with self.assertRaises(ConfigError):
                make_cfg({"pledge": {"rate_pct": rate}})
        with self.assertRaises(ConfigError):
            make_cfg({"pledge": {"destination": " "}})
        with self.assertRaises(ConfigError):
            make_cfg({"pledge": {"bogus": 1}})


def run(argv: list[str]) -> tuple[int, str, str]:
    out, err = io.StringIO(), io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        code = main(argv)
    return code, out.getvalue(), err.getvalue()


class TestCliEvaluatePledge(unittest.TestCase):
    def test_pledge_status_and_update(self) -> None:
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "j.sqlite"
            j = TradeJournal(path)
            add_trade(j, "a", 1, 100.0)
            j.close()
            code, out, _ = run(["pledge", "status", "--journal", str(path)])
            self.assertEqual(code, 0)
            self.assertIn("cumulative_accrued_gbp: 0.00", out)
            code, out, _ = run(["pledge", "update", "--journal", str(path)])
            self.assertIn("cumulative_accrued_gbp: 1.00", out)

    def test_evaluate_empty_journal_exits_1(self) -> None:
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "j.sqlite"
            TradeJournal(path).close()
            code, out, _ = run(["evaluate", "--journal", str(path)])
            self.assertEqual(code, 1)
            self.assertIn("NOT ELIGIBLE", out)
            code, out, _ = run(["evaluate", "--journal", str(path), "--json"])
            self.assertIn('"live": false', out)

    def test_evaluate_missing_journal_is_error(self) -> None:
        self.assertEqual(run(["evaluate", "--journal", "/nonexistent/j.sqlite"])[0], 2)

    def test_trials_and_blind_flags(self) -> None:
        j = TradeJournal(":memory:")
        self.assertEqual(j.trial_count(), 0)
        j.record_trial(utc(2027, 3, 1), "v0001", "orb baseline")
        j.record_trial(utc(2027, 3, 2), "v0001", "orb variant")
        self.assertEqual(j.trial_count(), 2)
        self.assertEqual(j.count("trials"), 2)
        from helpers import make_signal
        s1 = make_signal(signal_id="x1")
        j.record_signal(replace(s1, source="llm", features={"blind_tested": 1.0}), "v0001")
        j.record_signal(replace(s1, signal_id="x2", source="llm"), "v0001")
        j.record_signal(replace(s1, signal_id="x3", source="orb"), "v0001")
        self.assertEqual(j.llm_signal_blind_flags(), [("x1", True), ("x2", False)])
        j.close()


if __name__ == "__main__":
    unittest.main()
