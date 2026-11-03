import helpers  # noqa: F401
import json
import math
import random
import unittest

from trading.evaluation import (EvalInputs, FoldResult, LlmSignalRecord, bootstrap_mean_ci, deflated_sharpe,
                                evaluate_go_live, expected_max_sharpe, gate_benchmark, gate_blind_llm,
                                gate_cost_stress, gate_deflated_sharpe, gate_max_drawdown, gate_min_sample,
                                gate_net_expectancy, gate_probabilistic_sharpe, gate_walk_forward,
                                max_drawdown, probabilistic_sharpe, sharpe_ratio)


def noise(n: int, mu: float, sd: float, seed: int) -> list[float]:
    r = random.Random(seed)
    return [r.gauss(mu, sd) for _ in range(n)]


GOOD_FOLDS = [FoldResult(0.10, 0.08, 50.0)] * 4 + [FoldResult(0.10, 0.07, -5.0)]


def good_inputs() -> EvalInputs:
    pnl = noise(150, 5.0, 10.0, 1)
    costs = [0.5] * 150
    rets = noise(90, 0.004, 0.005, 2)
    return EvalInputs(net_pnls=pnl, gross_pnls=[p + c for p, c in zip(pnl, costs)], costs=costs,
                      daily_returns=rets, benchmark_returns=noise(90, 0.0003, 0.01, 3), n_trials=3,
                      folds=GOOD_FOLDS, paper_days=90, max_drawdown_limit=0.15,
                      llm_signals=[LlmSignalRecord("s1", True)])


class TestStats(unittest.TestCase):
    def test_psr_known_answer(self) -> None:
        self.assertAlmostEqual(probabilistic_sharpe(0.2, 101, 0.0, 3.0, 0.0), 0.97616481, places=6)
        self.assertAlmostEqual(probabilistic_sharpe(0.1, 250, -0.5, 5.0, 0.05), 0.77826050, places=6)

    def test_psr_equal_to_benchmark_is_half(self) -> None:
        self.assertAlmostEqual(probabilistic_sharpe(0.1, 100, 0, 3, 0.1), 0.5)

    def test_expected_max_sharpe_known(self) -> None:
        self.assertAlmostEqual(expected_max_sharpe(100, 0.01), 0.25306029, places=6)
        self.assertAlmostEqual(expected_max_sharpe(10, 1.0), 1.57459830, places=6)
        self.assertEqual(expected_max_sharpe(1, 1.0), 0.0)

    def test_dsr_known_answer(self) -> None:
        self.assertAlmostEqual(deflated_sharpe(0.2, 101, 0, 3, 100, 0.01), 0.29966121, places=6)
        # one trial == PSR against zero
        self.assertAlmostEqual(deflated_sharpe(0.2, 101, 0, 3, 1, 0.01), 0.97616481, places=6)

    def test_dsr_decreases_with_trials(self) -> None:
        a = deflated_sharpe(0.2, 101, 0, 3, 5)
        b = deflated_sharpe(0.2, 101, 0, 3, 500)
        self.assertGreater(a, b)

    def test_bootstrap_deterministic(self) -> None:
        xs = noise(50, 1, 3, 9)
        self.assertEqual(bootstrap_mean_ci(xs), bootstrap_mean_ci(xs))

    def test_max_drawdown(self) -> None:
        self.assertAlmostEqual(max_drawdown([0.1, -0.1, -0.1]), 0.19)
        self.assertEqual(max_drawdown([0.01, 0.01]), 0.0)

    def test_sharpe_degenerate(self) -> None:
        self.assertIsNone(sharpe_ratio([0.01, 0.01, 0.01]))
        self.assertIsNone(sharpe_ratio([0.01]))


class TestGates(unittest.TestCase):
    def test_min_sample(self) -> None:
        self.assertTrue(gate_min_sample(100, 60).passed)
        self.assertFalse(gate_min_sample(99, 60).passed)
        self.assertFalse(gate_min_sample(100, 59).passed)
        self.assertFalse(gate_min_sample(None, 60).passed)

    def test_expectancy_requires_ci(self) -> None:
        self.assertTrue(gate_net_expectancy(noise(200, 5, 10, 1)).passed)
        self.assertFalse(gate_net_expectancy(noise(30, 0.5, 10, 1)).passed)  # mean>0 but CI straddles 0
        self.assertFalse(gate_net_expectancy([-1.0, -2.0, -3.0]).passed)

    def test_cost_stress(self) -> None:
        self.assertTrue(gate_cost_stress([3.0, 3.0], [1.0, 1.0]).passed)    # 3-2 = 1 > 0
        self.assertFalse(gate_cost_stress([2.0, 2.0], [1.0, 1.0]).passed)   # 2-2 = 0
        self.assertFalse(gate_cost_stress([2.0], [1.0, 1.0]).passed)

    def test_benchmark(self) -> None:
        s = [0.01, 0.012, 0.009, 0.011]
        self.assertTrue(gate_benchmark(s, [0.0, 0.01, -0.01, 0.0]).passed)
        self.assertFalse(gate_benchmark(s, [0.03, 0.0, 0.03, 0.0]).passed)  # higher return
        self.assertFalse(gate_benchmark([0.2, -0.1, 0.1, 0.0], [0.04, 0.05, 0.04, 0.04]).passed)  # lower Sharpe
        self.assertFalse(gate_benchmark(s, s[:3]).passed)

    def test_walk_forward(self) -> None:
        self.assertTrue(gate_walk_forward(GOOD_FOLDS).passed)
        weak = [FoldResult(0.1, 0.02, 5.0)] * 5
        self.assertFalse(gate_walk_forward(weak).passed)  # OOS Sharpe < 50% IS
        losing = [FoldResult(0.1, 0.1, -1.0)] * 2 + [FoldResult(0.1, 0.1, 1.0)] * 3
        self.assertFalse(gate_walk_forward(losing).passed)  # 60% < 70%
        self.assertFalse(gate_walk_forward([FoldResult(0.1, 0.1, 1.0)]).passed)

    def test_max_drawdown_gate(self) -> None:
        self.assertTrue(gate_max_drawdown([0.01, -0.02, 0.01], 0.15).passed)
        self.assertFalse(gate_max_drawdown([-0.1, -0.1], 0.15).passed)
        self.assertFalse(gate_max_drawdown([0.01], None).passed)

    def test_blind_llm(self) -> None:
        self.assertTrue(gate_blind_llm([]).passed)
        self.assertTrue(gate_blind_llm([LlmSignalRecord("a", True)]).passed)
        self.assertFalse(gate_blind_llm([LlmSignalRecord("a", True), LlmSignalRecord("b", False)]).passed)
        self.assertFalse(gate_blind_llm([LlmSignalRecord("a", None)]).passed)
        self.assertFalse(gate_blind_llm(None).passed)

    def test_dsr_requires_trials(self) -> None:
        r = noise(90, 0.004, 0.005, 2)
        self.assertFalse(gate_deflated_sharpe(r, None).passed)
        self.assertFalse(gate_deflated_sharpe(r, 0).passed)


class TestReport(unittest.TestCase):
    def test_empty_inputs_fail_everything(self) -> None:
        rep = evaluate_go_live(EvalInputs())
        self.assertFalse(rep.live)
        self.assertTrue(all(not g.passed for g in rep.gates if g.name != "blind_llm"))
        self.assertFalse(any(g.passed for g in rep.gates))
        empty = EvalInputs(net_pnls=[], gross_pnls=[], costs=[], daily_returns=[], benchmark_returns=[],
                           n_trials=0, folds=[], paper_days=0, llm_signals=[])
        rep2 = evaluate_go_live(empty)
        self.assertFalse(rep2.live)
        self.assertEqual([g.name for g in rep2.gates if g.passed], ["blind_llm"])  # vacuously true, others fail

    def test_genuine_strategy_passes(self) -> None:
        rep = evaluate_go_live(good_inputs())
        self.assertTrue(rep.live, rep.to_text())
        self.assertEqual(len(rep.gates), 9)

    def test_pure_noise_fails(self) -> None:
        pnl = noise(150, 0.0, 10.0, 7)
        costs = [0.5] * 150
        inp = EvalInputs(net_pnls=pnl, gross_pnls=[p + c for p, c in zip(pnl, costs)], costs=costs,
                         daily_returns=noise(90, 0.0, 0.005, 8), benchmark_returns=noise(90, 0.0003, 0.01, 3),
                         n_trials=1, folds=[FoldResult(0.1, -0.05, -3.0)] * 5, paper_days=90,
                         max_drawdown_limit=0.15, llm_signals=[])
        rep = evaluate_go_live(inp)
        self.assertFalse(rep.live)
        failed = {g.name for g in rep.gates if not g.passed}
        self.assertIn("net_expectancy", failed)
        self.assertIn("walk_forward", failed)

    def test_lucky_strategy_with_many_trials_fails_dsr(self) -> None:
        rets = noise(120, 0.0012, 0.01, 4)   # modest SR that passes PSR alone
        alone = gate_deflated_sharpe(rets, 1)
        many = gate_deflated_sharpe(rets, 1000)
        self.assertTrue(gate_probabilistic_sharpe(rets).passed)
        self.assertTrue(alone.passed)
        self.assertFalse(many.passed)
        inp = good_inputs()
        lucky = EvalInputs(**{**{f: getattr(inp, f) for f in inp.__slots__}, "daily_returns": rets,
                              "n_trials": 1000})
        rep = evaluate_go_live(lucky)
        self.assertFalse(rep.live)
        self.assertIn("deflated_sharpe", [g.name for g in rep.gates if not g.passed])

    def test_render_text_and_json(self) -> None:
        rep = evaluate_go_live(EvalInputs())
        self.assertIn("NOT ELIGIBLE", rep.to_text())
        d = json.loads(rep.to_json())
        self.assertFalse(d["live"])
        self.assertEqual(len(d["gates"]), 9)
        self.assertTrue(all(g["value"] is None or math.isfinite(g["value"]) for g in d["gates"]))


if __name__ == "__main__":
    unittest.main()
