import helpers
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from helpers import utc
from trading.killswitch import KillSwitch


class TestKillSwitch(unittest.TestCase):
    def test_default_inactive(self) -> None:
        with tempfile.TemporaryDirectory() as t:
            self.assertFalse(KillSwitch(Path(t) / "KS").is_active())

    def test_file_activates(self) -> None:
        with tempfile.TemporaryDirectory() as t:
            p = Path(t) / "KS"
            p.touch()
            self.assertTrue(KillSwitch(p).is_active())

    def test_activate_writes_reason(self) -> None:
        with tempfile.TemporaryDirectory() as t:
            p = Path(t) / "sub" / "KS"
            ks = KillSwitch(p)
            ks.activate("test", utc(2027, 1, 1))
            self.assertTrue(p.exists())
            self.assertIn("test", p.read_text())
            self.assertEqual(ks.reason(), "test")
            self.assertEqual(KillSwitch(p).reason().split()[-1], "test")

    def test_clear(self) -> None:
        with tempfile.TemporaryDirectory() as t:
            p = Path(t) / "KS"
            ks = KillSwitch(p)
            ks.activate("x", utc(2027, 1, 1))
            ks.clear()
            self.assertFalse(ks.is_active())
            self.assertFalse(p.exists())

    def test_memory_only(self) -> None:
        ks = KillSwitch(None)
        self.assertFalse(ks.is_active())
        ks.activate("m", utc(2027, 1, 1))
        self.assertTrue(ks.is_active())

    def test_oserror_fails_closed(self) -> None:
        ks = KillSwitch(Path("/nonexistent/KS"))
        with mock.patch("pathlib.Path.exists", side_effect=PermissionError):
            self.assertTrue(ks.is_active())


if __name__ == "__main__":
    unittest.main()
