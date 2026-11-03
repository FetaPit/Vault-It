import helpers
import json
import tempfile
import unittest
from datetime import date
from pathlib import Path

from helpers import make_account, make_cfg, utc
from trading.fx import FxConverter
from trading.killswitch import KillSwitch
from trading.risk import RiskEngine
from trading.session import session_window
from trading.signal_inbox import read_inbox

GOOD = {"signal_id": "llm-1", "ts": "2027-01-12T15:00:00+00:00", "symbol": "TEST", "side": "long",
        "entry": 100.0, "stop": 95.0, "target": 110.0, "sleeve": "A", "rationale": "idea"}


class TestInbox(unittest.TestCase):
    def setUp(self) -> None:
        self._t = tempfile.TemporaryDirectory()
        self.d = Path(self._t.name)

    def tearDown(self) -> None:
        self._t.cleanup()

    def put(self, name: str, obj, raw: bool = False) -> None:
        (self.d / name).write_text(obj if raw else json.dumps(obj))

    def one(self):
        r = read_inbox(self.d)
        self.assertEqual(len(r), 1)
        return r[0]

    def test_valid(self) -> None:
        self.put("a.json", GOOD)
        r = self.one()
        self.assertIsNone(r.error)
        self.assertEqual(r.signal.source, "llm")
        self.assertEqual(r.path, self.d / "processed" / "a.json")
        self.assertTrue(r.path.exists())

    def test_quantity_rejected(self) -> None:
        self.put("a.json", {**GOOD, "quantity": 5})
        r = self.one()
        self.assertEqual(r.error, "QUANTITY_NOT_ALLOWED")
        self.assertIsNone(r.signal)
        self.assertEqual((self.d / "rejected" / "a.json.error.txt").read_text().strip(), "QUANTITY_NOT_ALLOWED")
        self.assertTrue((self.d / "rejected" / "a.json").exists())

    def test_invalid_json(self) -> None:
        self.put("a.json", "{bad", raw=True)
        self.assertEqual(self.one().error, "INVALID_JSON")

    def test_missing_stop_allowed(self) -> None:
        g = dict(GOOD)
        del g["stop"]
        self.put("a.json", g)
        r = self.one()
        self.assertIsNone(r.error)
        self.assertIsNone(r.signal.stop)

    def test_naive_ts(self) -> None:
        self.put("a.json", {**GOOD, "ts": "2027-01-12T15:00:00"})
        self.assertEqual(self.one().error, "INVALID_TS")

    def test_unknown_field(self) -> None:
        self.put("a.json", {**GOOD, "leverage": 5})
        self.assertEqual(self.one().error, "UNKNOWN_FIELD:leverage")

    def test_non_json_ignored(self) -> None:
        (self.d / "notes.txt").write_text("hello")
        self.assertEqual(read_inbox(self.d), [])
        self.assertTrue((self.d / "notes.txt").exists())

    def test_source_forced_llm(self) -> None:
        self.put("a.json", {**GOOD, "source": "strategy:orb"})
        self.assertEqual(self.one().signal.source, "llm")

    def test_missing_required(self) -> None:
        g = dict(GOOD)
        del g["symbol"]
        self.put("a.json", g)
        self.assertEqual(self.one().error, "MISSING_FIELD:symbol")

    def test_llm_signal_vetoed_by_risk(self) -> None:
        g = dict(GOOD)
        del g["stop"]
        self.put("a.json", g)
        sig = self.one().signal
        cfg = make_cfg()
        eng = RiskEngine(cfg, KillSwitch(None), FxConverter.from_config(cfg))
        d = eng.evaluate(sig, make_account(), sig.ts, session_window(date(2027, 1, 12), cfg.session))
        self.assertFalse(d.approved)
        self.assertIn("NO_STOP", d.reasons)

    def test_array_top_level(self) -> None:
        self.put("a.json", "[]", raw=True)
        self.assertEqual(self.one().error, "NOT_AN_OBJECT")

    def test_invalid_values(self) -> None:
        for bad in ({"side": "up"}, {"sleeve": "C"}, {"entry": -1}, {"stop": "x"}, {"entry_type": "weird"}):
            with self.subTest(bad):
                for p in self.d.glob("*.json"):
                    p.unlink()
                self.put("a.json", {**GOOD, **bad})
                self.assertEqual(self.one().error, f"INVALID_VALUE:{next(iter(bad))}")

    def test_nonfinite_values_rejected(self) -> None:
        for bad in ({"entry": float("nan")}, {"entry": float("inf")}, {"stop": float("nan")}):
            with self.subTest(bad):
                for p in self.d.glob("*.json"):
                    p.unlink()
                self.put("a.json", {**GOOD, **bad})
                self.assertEqual(self.one().error, f"INVALID_VALUE:{next(iter(bad))}")

    def test_no_move(self) -> None:
        self.put("a.json", GOOD)
        r = read_inbox(self.d, move_files=False)
        self.assertEqual(r[0].path, self.d / "a.json")
        self.assertTrue((self.d / "a.json").exists())


if __name__ == "__main__":
    unittest.main()
