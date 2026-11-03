import helpers
import contextlib
import io
import json
import tempfile
import unittest
from datetime import timedelta
from pathlib import Path

from helpers import make_cfg, utc
from trading.cli import main
from trading.config import config_to_dict


def run(argv: list[str]) -> tuple[int, str, str]:
    out, err = io.StringIO(), io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        code = main(argv)
    return code, out.getvalue(), err.getvalue()


class TestCli(unittest.TestCase):
    def test_forecast(self) -> None:
        code, out, _ = run(["forecast"])
        self.assertEqual(code, 0)
        self.assertIn("£625", out)
        self.assertIn("7.3y", out)
        self.assertIn("£625: 12.0y 9.3y 8.3y 7.3y", out)

    def test_killswitch_roundtrip(self) -> None:
        with tempfile.TemporaryDirectory() as t:
            ks = str(Path(t) / "KS")
            self.assertEqual(run(["killswitch", "on", "--reason", "x", "--kill-switch", ks])[0], 0)
            code, out, _ = run(["killswitch", "status", "--kill-switch", ks])
            self.assertEqual(code, 0)
            self.assertIn("ACTIVE: x", out)
            self.assertEqual(run(["killswitch", "off", "--kill-switch", ks])[0], 0)
            code, out, _ = run(["killswitch", "status", "--kill-switch", ks])
            self.assertEqual(code, 0)
            self.assertIn("inactive", out)

    def test_killswitch_default_reason(self) -> None:
        with tempfile.TemporaryDirectory() as t:
            ks = str(Path(t) / "KS")
            run(["killswitch", "on", "--kill-switch", ks])
            self.assertIn("ACTIVE: manual", run(["killswitch", "status", "--kill-switch", ks])[1])

    def test_backtest(self) -> None:
        rows = [(0, 100, 101, 99, 100.5), (5, 100.5, 100.8, 99.5, 100), (10, 100, 100.9, 99.2, 100.6),
                (15, 100.6, 101.6, 100.5, 101.5), (20, 101.6, 102, 101.2, 101.9),
                (25, 101.9, 107, 101.8, 106.8)]
        start = utc(2027, 1, 12, 14, 30)
        with tempfile.TemporaryDirectory() as t:
            csv_path = Path(t) / "bars.csv"
            csv_path.write_text("symbol,ts,open,high,low,close,volume,interval_seconds\n" + "".join(
                f"TEST,{(start + timedelta(minutes=m)).isoformat()},{o},{h},{l},{c},0,300\n"
                for m, o, h, l, c in rows))
            cfg_path = Path(t) / "cfg.json"
            cfg_path.write_text(json.dumps(config_to_dict(make_cfg())))
            code, out, _ = run(["backtest", "--config", str(cfg_path), "--bars", str(csv_path),
                                "--start", "2027-01-12", "--end", "2027-01-12"])
            self.assertEqual(code, 0)
            self.assertIn("trades: 1", out)
            self.assertIn("net_pnl_gbp: 14.46", out)
            self.assertIn("max_drawdown_pct:", out)
            code2, _, err = run(["--config", str(cfg_path), "backtest", "--bars", str(csv_path),
                                 "--start", "bad", "--end", "2027-01-12"])
            self.assertEqual(code2, 2)

    def test_backtest_refuses_paper_journal(self) -> None:
        with tempfile.TemporaryDirectory() as t:
            jp = Path(t) / "paper.sqlite"
            cfg = make_cfg()
            d = config_to_dict(cfg)
            d["paths"]["journal"] = str(jp)
            cfg_path = Path(t) / "cfg.json"
            cfg_path.write_text(json.dumps(d))
            code, _, err = run(["--config", str(cfg_path), "backtest", "--bars", str(Path(t) / "x.csv"),
                                "--start", "2027-01-12", "--end", "2027-01-12", "--journal", str(jp)])
            self.assertEqual(code, 2)
            self.assertIn("paper journal", err)
            self.assertFalse(jp.exists())

    def test_bad_config(self) -> None:
        code, _, err = run(["--config", "/nonexistent/cfg.json", "forecast"])
        self.assertEqual(code, 2)
        self.assertIn("error", err)
        self.assertEqual(run(["forecast", "--config", "/nonexistent/cfg.json"])[0], 2)

    def test_no_live_command(self) -> None:
        err = io.StringIO()
        with contextlib.redirect_stderr(err), self.assertRaises(SystemExit) as cm:
            main(["live"])
        self.assertEqual(cm.exception.code, 2)


if __name__ == "__main__":
    unittest.main()
