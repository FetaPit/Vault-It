import helpers
import ast
import pathlib
import unittest
from dataclasses import replace

from helpers import make_cfg
from trading.broker import PaperBroker
from trading.errors import PaperOnlyViolation
from trading.fx import FxConverter
from trading.guards import FORBIDDEN_IMPORTS, assert_paper_mode

ROOT = pathlib.Path(__file__).resolve().parents[1]


def source_files() -> list[pathlib.Path]:
    return [p for p in ROOT.rglob("*.py") if "tests" not in p.relative_to(ROOT).parts]


class TestGuards(unittest.TestCase):
    def test_broker_refuses_non_paper(self) -> None:
        cfg = replace(make_cfg(), mode="live")
        with self.assertRaises(PaperOnlyViolation):
            PaperBroker(cfg, FxConverter.from_config(make_cfg()), 625.0)

    def test_no_network_imports(self) -> None:
        files = source_files()
        self.assertGreater(len(files), 20)
        bad: list[str] = []
        for p in files:
            for node in ast.walk(ast.parse(p.read_text(encoding="utf-8"))):
                names: list[str] = []
                if isinstance(node, ast.Import):
                    names = [a.name.split(".")[0] for a in node.names]
                elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
                    names = [node.module.split(".")[0]]
                bad += [f"{p.name}:{n}" for n in names if n in FORBIDDEN_IMPORTS]
        self.assertEqual(bad, [])

    def test_no_live_classes_or_files(self) -> None:
        for p in source_files():
            self.assertNotIn("live", p.name.lower(), p)
            for node in ast.walk(ast.parse(p.read_text(encoding="utf-8"))):
                if isinstance(node, ast.ClassDef):
                    self.assertNotIn("Live", node.name, f"{p.name}:{node.name}")

    def test_assert_paper_mode_ok(self) -> None:
        assert_paper_mode(make_cfg())

    def test_assert_paper_mode_raises(self) -> None:
        with self.assertRaises(PaperOnlyViolation):
            assert_paper_mode(replace(make_cfg(), mode="live"))

    def test_clear_only_called_from_cli(self) -> None:
        offenders = []
        for p in source_files():
            if p.name in ("cli.py", "killswitch.py"):
                continue
            for node in ast.walk(ast.parse(p.read_text(encoding="utf-8"))):
                if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) \
                        and node.func.attr == "clear" and "kill" in ast.unparse(node.func.value).lower():
                    offenders.append(p.name)
        self.assertEqual(offenders, [])


if __name__ == "__main__":
    unittest.main()
