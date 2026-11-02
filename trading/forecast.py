"""Time-to-target forecast with monthly compounding and fixed top-ups."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence


@dataclass(frozen=True, slots=True)
class ForecastRow:
    start_gbp: float
    annual_rate: float
    months: int | None
    years: float | None


def monthly_rate(annual_rate: float) -> float:
    if annual_rate <= -1:
        raise ValueError("annual_rate must be > -1")
    return (1 + annual_rate) ** (1 / 12) - 1


def months_to_target(start_gbp: float, monthly_contribution_gbp: float, annual_rate: float,
                     target_gbp: float, max_months: int = 1200) -> int | None:
    if start_gbp < 0 or monthly_contribution_gbp < 0:
        raise ValueError("start and contribution must be >= 0")
    r = monthly_rate(annual_rate)
    if start_gbp >= target_gbp:
        return 0
    bal = start_gbp
    for m in range(1, max_months + 1):
        bal = bal * (1 + r) + monthly_contribution_gbp
        if bal >= target_gbp - 1e-9:
            return m
    return None


def forecast_table(starts: Sequence[float] = (500.0, 625.0, 750.0),
                   rates: Sequence[float] = (0.0, 0.05, 0.08, 0.12),
                   contribution: float = 100.0, target: float = 15000.0) -> list[ForecastRow]:
    rows: list[ForecastRow] = []
    for s in starts:
        for a in rates:
            m = months_to_target(s, contribution, a, target)
            rows.append(ForecastRow(s, a, m, None if m is None else round(m / 12, 1)))
    return rows


def goal_progress_pct(fund_equity_gbp: float, metal_cost_basis_gbp: float, target_gbp: float) -> float:
    return 100.0 * (fund_equity_gbp + metal_cost_basis_gbp) / target_gbp
