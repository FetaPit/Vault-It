"""Go-live evaluation gates: pure, deterministic, conservative. Missing data => the gate FAILS.

Live is permitted only if ALL gates pass. This module never trades and has no order path.
"""
from __future__ import annotations

import json
import math
import random
import statistics
from dataclasses import dataclass, field
from statistics import NormalDist
from typing import Sequence

MIN_TRADES: int = 100
MIN_PAPER_DAYS: int = 60
CI_LEVEL: float = 0.90
BOOTSTRAP_RESAMPLES: int = 2000
BOOTSTRAP_SEED: int = 12345
PSR_THRESHOLD: float = 0.95
DSR_THRESHOLD: float = 0.95
WF_MIN_POSITIVE_FRAC: float = 0.70
WF_MIN_SHARPE_RATIO: float = 0.50
WF_MIN_FOLDS: int = 3  # PLAN_GAP: spec gives no minimum fold count; 3 chosen so a single fold cannot pass.
EULER_GAMMA: float = 0.5772156649015329
_N = NormalDist()


@dataclass(frozen=True, slots=True)
class GateResult:
    name: str
    passed: bool
    value: float | None
    threshold: float | None
    detail: str


@dataclass(frozen=True, slots=True)
class FoldResult:
    is_sharpe: float
    oos_sharpe: float
    oos_net_pnl: float


@dataclass(frozen=True, slots=True)
class LlmSignalRecord:
    signal_id: str
    blind_tested: bool | None


def _fail(name: str, why: str, threshold: float | None = None) -> GateResult:
    return GateResult(name, False, None, threshold, f"FAIL (missing/invalid data): {why}")


def _finite(xs: Sequence[float]) -> bool:
    return all(isinstance(x, (int, float)) and math.isfinite(x) for x in xs)


# ------------------------------------------------------------- statistics

def sharpe_ratio(returns: Sequence[float]) -> float | None:
    """Per-period Sharpe (mean / sample std). None if undefined (n<2, zero variance, non-finite)."""
    if len(returns) < 2 or not _finite(returns):
        return None
    sd = statistics.stdev(returns)
    if sd <= 1e-15:
        return None
    return statistics.fmean(returns) / sd


def skew_kurtosis(returns: Sequence[float]) -> tuple[float, float]:
    """Population skewness and RAW (non-excess) kurtosis. Requires n>=2 and nonzero variance."""
    n = len(returns)
    m = statistics.fmean(returns)
    m2 = sum((x - m) ** 2 for x in returns) / n
    if m2 <= 1e-30:
        raise ValueError("zero variance")
    m3 = sum((x - m) ** 3 for x in returns) / n
    m4 = sum((x - m) ** 4 for x in returns) / n
    return m3 / m2 ** 1.5, m4 / m2 ** 2


def probabilistic_sharpe(sr: float, n: int, skew: float, kurt: float, sr_benchmark: float = 0.0) -> float:
    """Bailey & Lopez de Prado PSR: P(true SR > sr_benchmark). Per-period SR; kurt is raw (normal = 3).
    Returns nan if the variance term is non-positive or n < 2."""
    if n < 2:
        return math.nan
    var_term = 1.0 - skew * sr + (kurt - 1.0) / 4.0 * sr * sr
    if var_term <= 0:
        return math.nan
    z = (sr - sr_benchmark) * math.sqrt(n - 1) / math.sqrt(var_term)
    return 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))


def expected_max_sharpe(n_trials: int, sr_variance: float) -> float:
    """SR0 = sqrt(V) * ((1-g) Phi^-1(1-1/N) + g Phi^-1(1-1/(N e))). N=1 gives 0."""
    if n_trials < 1:
        raise ValueError("n_trials must be >= 1")
    if n_trials == 1:
        return 0.0
    return math.sqrt(sr_variance) * ((1 - EULER_GAMMA) * _N.inv_cdf(1 - 1 / n_trials)
                                     + EULER_GAMMA * _N.inv_cdf(1 - 1 / (n_trials * math.e)))


def deflated_sharpe(sr: float, n: int, skew: float, kurt: float, n_trials: int,
                    sr_variance: float | None = None) -> float:
    """DSR = PSR evaluated against the expected maximum SR over n_trials.
    PLAN_GAP: the cross-trial Sharpe variance is not stored in the journal; default is the null
    sampling variance of an SR estimate, 1/(n-1), a deliberately simple and conservative choice."""
    if sr_variance is None:
        sr_variance = 1.0 / (n - 1) if n > 1 else math.nan
    if not math.isfinite(sr_variance):
        return math.nan
    return probabilistic_sharpe(sr, n, skew, kurt, expected_max_sharpe(n_trials, sr_variance))


def bootstrap_mean_ci(xs: Sequence[float], level: float = CI_LEVEL, resamples: int = BOOTSTRAP_RESAMPLES,
                      seed: int = BOOTSTRAP_SEED) -> tuple[float, float]:
    """Deterministic (seeded) percentile bootstrap CI of the mean."""
    rng = random.Random(seed)
    n = len(xs)
    means = sorted(sum(xs[rng.randrange(n)] for _ in range(n)) / n for _ in range(resamples))
    alpha = (1 - level) / 2
    lo = means[int(alpha * resamples)]
    hi = means[min(resamples - 1, int((1 - alpha) * resamples))]
    return lo, hi


def max_drawdown(returns: Sequence[float]) -> float:
    """Max peak-to-trough drawdown of the compounded curve, as a positive fraction."""
    eq = peak = 1.0
    mdd = 0.0
    for r in returns:
        eq *= 1.0 + r
        peak = max(peak, eq)
        mdd = max(mdd, (peak - eq) / peak)
    return mdd


def total_return(returns: Sequence[float]) -> float:
    eq = 1.0
    for r in returns:
        eq *= 1.0 + r
    return eq - 1.0


# ------------------------------------------------------------------ gates

def gate_min_sample(n_trades: int | None, paper_days: int | None) -> GateResult:
    name = "min_sample"
    if n_trades is None or paper_days is None:
        return _fail(name, "trade count or paper days not supplied", MIN_TRADES)
    ok = n_trades >= MIN_TRADES and paper_days >= MIN_PAPER_DAYS
    return GateResult(name, ok, float(n_trades), float(MIN_TRADES),
                      f"{n_trades} closed trades (need >= {MIN_TRADES}); "
                      f"{paper_days} paper days (need >= {MIN_PAPER_DAYS})")


def gate_net_expectancy(net_pnls: Sequence[float] | None) -> GateResult:
    name = "net_expectancy"
    if not net_pnls or len(net_pnls) < 2 or not _finite(net_pnls):
        return _fail(name, "need >= 2 finite per-trade net P&L values", 0.0)
    mean = statistics.fmean(net_pnls)
    se = statistics.stdev(net_pnls) / math.sqrt(len(net_pnls))
    z = NormalDist().inv_cdf(1 - (1 - CI_LEVEL) / 2)
    t_lo = mean - z * se
    b_lo, _ = bootstrap_mean_ci(net_pnls)
    ok = mean > 0 and b_lo > 0 and t_lo > 0
    return GateResult(name, ok, mean, 0.0,
                      f"mean {mean:.4f} GBP/trade; {int(CI_LEVEL * 100)}% CI lower bound: "
                      f"bootstrap {b_lo:.4f}, t-stat {t_lo:.4f} (all must be > 0)")


def gate_cost_stress(gross_pnls: Sequence[float] | None, costs: Sequence[float] | None,
                     multiplier: float = 2.0) -> GateResult:
    name = "cost_stress"
    if not gross_pnls or not costs or len(gross_pnls) != len(costs) or not _finite(gross_pnls) \
            or not _finite(costs):
        return _fail(name, "need equal-length non-empty gross P&L and cost lists", 0.0)
    mean = statistics.fmean(g - multiplier * c for g, c in zip(gross_pnls, costs))
    return GateResult(name, mean > 0, mean, 0.0,
                      f"expectancy with costs x{multiplier:g}: {mean:.4f} GBP/trade")


def gate_benchmark(strategy: Sequence[float] | None, benchmark: Sequence[float] | None) -> GateResult:
    name = "benchmark"
    if not strategy or not benchmark or len(strategy) != len(benchmark) or len(strategy) < 2 \
            or not _finite(strategy) or not _finite(benchmark):
        return _fail(name, "need equal-length strategy and benchmark daily returns (>= 2 days)")
    s_ret, b_ret = total_return(strategy), total_return(benchmark)
    s_sr, b_sr = sharpe_ratio(strategy), sharpe_ratio(benchmark)
    if s_sr is None or b_sr is None:
        return _fail(name, "Sharpe undefined (zero variance)")
    ok = s_ret > b_ret and s_sr > b_sr
    return GateResult(name, ok, s_ret - b_ret, 0.0,
                      f"total return {s_ret:.4%} vs {b_ret:.4%}; Sharpe {s_sr:.4f} vs {b_sr:.4f} (per day)")


def gate_probabilistic_sharpe(returns: Sequence[float] | None) -> GateResult:
    name = "probabilistic_sharpe"
    sr = sharpe_ratio(returns) if returns else None
    if sr is None or returns is None:
        return _fail(name, "daily returns missing or degenerate", PSR_THRESHOLD)
    sk, ku = skew_kurtosis(returns)
    psr = probabilistic_sharpe(sr, len(returns), sk, ku, 0.0)
    ok = math.isfinite(psr) and psr >= PSR_THRESHOLD
    return GateResult(name, ok, psr if math.isfinite(psr) else None, PSR_THRESHOLD,
                      f"PSR(SR*=0)={psr:.4f}; SR/day={sr:.4f}, skew={sk:.3f}, kurt={ku:.3f}, n={len(returns)}")


def gate_deflated_sharpe(returns: Sequence[float] | None, n_trials: int | None,
                         sr_variance: float | None = None) -> GateResult:
    name = "deflated_sharpe"
    sr = sharpe_ratio(returns) if returns else None
    if sr is None or returns is None:
        return _fail(name, "daily returns missing or degenerate", DSR_THRESHOLD)
    if n_trials is None or n_trials < 1:
        return _fail(name, "no trials recorded in journal (n_trials must be >= 1)", DSR_THRESHOLD)
    sk, ku = skew_kurtosis(returns)
    dsr = deflated_sharpe(sr, len(returns), sk, ku, n_trials, sr_variance)
    ok = math.isfinite(dsr) and dsr >= DSR_THRESHOLD
    return GateResult(name, ok, dsr if math.isfinite(dsr) else None, DSR_THRESHOLD,
                      f"DSR={dsr:.4f} with n_trials={n_trials}")


def gate_walk_forward(folds: Sequence[FoldResult] | None) -> GateResult:
    name = "walk_forward"
    if not folds or len(folds) < WF_MIN_FOLDS:
        return _fail(name, f"need >= {WF_MIN_FOLDS} walk-forward folds", WF_MIN_POSITIVE_FRAC)
    if not _finite([v for f in folds for v in (f.is_sharpe, f.oos_sharpe, f.oos_net_pnl)]):
        return _fail(name, "non-finite fold values", WF_MIN_POSITIVE_FRAC)
    frac = sum(1 for f in folds if f.oos_net_pnl > 0) / len(folds)
    is_sr = statistics.fmean(f.is_sharpe for f in folds)
    oos_sr = statistics.fmean(f.oos_sharpe for f in folds)
    ratio_ok = is_sr > 0 and oos_sr >= WF_MIN_SHARPE_RATIO * is_sr
    ok = frac >= WF_MIN_POSITIVE_FRAC and ratio_ok
    return GateResult(name, ok, frac, WF_MIN_POSITIVE_FRAC,
                      f"{frac:.0%} OOS folds net-positive (need >= 70%); mean OOS Sharpe {oos_sr:.4f} vs "
                      f"IS {is_sr:.4f} (need OOS >= 50% of a positive IS)")


def gate_max_drawdown(returns: Sequence[float] | None, limit: float | None) -> GateResult:
    name = "max_drawdown"
    if not returns or limit is None or not _finite(returns) or not (0 < limit <= 1):
        return _fail(name, "daily returns or drawdown limit missing", limit)
    mdd = max_drawdown(returns)
    return GateResult(name, mdd <= limit, mdd, limit, f"max drawdown {mdd:.2%} vs limit {limit:.2%}")


def gate_blind_llm(records: Sequence[LlmSignalRecord] | None) -> GateResult:
    name = "blind_llm"
    if records is None:
        return _fail(name, "LLM signal records not supplied (None); an empty list means none exist")
    bad = [r.signal_id for r in records if r.blind_tested is not True]
    return GateResult(name, not bad, float(len(bad)), 0.0,
                      f"{len(records)} LLM signals, {len(bad)} without blind_tested=true"
                      + (f": {', '.join(bad[:5])}" if bad else ""))


# ----------------------------------------------------------------- report

@dataclass(frozen=True, slots=True)
class EvalInputs:
    net_pnls: Sequence[float] | None = None
    gross_pnls: Sequence[float] | None = None
    costs: Sequence[float] | None = None
    daily_returns: Sequence[float] | None = None
    benchmark_returns: Sequence[float] | None = None
    n_trials: int | None = None
    folds: Sequence[FoldResult] | None = None
    paper_days: int | None = None
    max_drawdown_limit: float | None = None
    llm_signals: Sequence[LlmSignalRecord] | None = None
    trial_sr_variance: float | None = None


@dataclass(frozen=True, slots=True)
class EvaluationReport:
    gates: tuple[GateResult, ...]
    live: bool = field(default=False)

    def to_dict(self) -> dict[str, object]:
        def num(v: float | None) -> float | None:
            return v if v is not None and math.isfinite(v) else None
        return {"live": self.live,
                "gates": [{"name": g.name, "passed": g.passed, "value": num(g.value),
                           "threshold": num(g.threshold), "detail": g.detail} for g in self.gates]}

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), sort_keys=True, indent=2)

    def to_text(self) -> str:
        lines = ["GO-LIVE EVALUATION (paper -> live requires ALL gates)"]
        for g in self.gates:
            lines.append(f"[{'PASS' if g.passed else 'FAIL'}] {g.name}: {g.detail}")
        failed = [g.name for g in self.gates if not g.passed]
        lines.append("RESULT: LIVE ELIGIBLE" if self.live else f"RESULT: NOT ELIGIBLE (failed: {', '.join(failed)})")
        return "\n".join(lines)


def evaluate_go_live(inp: EvalInputs) -> EvaluationReport:
    """Run every gate. live is True only if every gate passes (and there are gates)."""
    n_trades = None if inp.net_pnls is None else len(inp.net_pnls)
    gates = (
        gate_min_sample(n_trades, inp.paper_days),
        gate_net_expectancy(inp.net_pnls),
        gate_cost_stress(inp.gross_pnls, inp.costs),
        gate_benchmark(inp.daily_returns, inp.benchmark_returns),
        gate_probabilistic_sharpe(inp.daily_returns),
        gate_deflated_sharpe(inp.daily_returns, inp.n_trials, inp.trial_sr_variance),
        gate_walk_forward(inp.folds),
        gate_max_drawdown(inp.daily_returns, inp.max_drawdown_limit),
        gate_blind_llm(inp.llm_signals),
    )
    return EvaluationReport(gates, all(g.passed for g in gates))
