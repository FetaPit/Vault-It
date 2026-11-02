"""Partial profit-taking plan (pure)."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

from trading.config import TrancheRule
from trading.mathutil import EPS, floor_to_step
from trading.sleeve_b.portfolio import Holding


@dataclass(frozen=True, slots=True)
class TrancheAction:
    rule_index: int
    quantity: float
    gain_pct: float


def plan_profit_taking(holding: Holding, price_gbp: float, rules: Sequence[TrancheRule],
                       size_step: float) -> list[TrancheAction]:
    if price_gbp <= 0 or holding.avg_cost_gbp <= 0:
        raise ValueError("price and avg cost must be > 0")
    gain = price_gbp / holding.avg_cost_gbp - 1
    remaining = holding.quantity
    out: list[TrancheAction] = []
    for i, rule in enumerate(rules):
        if i in holding.triggered_tranches:
            continue
        if gain + EPS >= rule.gain_pct:
            q = floor_to_step(remaining * rule.sell_fraction, size_step)
            if q <= 0:
                continue
            out.append(TrancheAction(i, q, gain))
            remaining -= q
    return out
