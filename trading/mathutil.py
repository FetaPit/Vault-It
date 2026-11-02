"""Small numeric helpers."""
from __future__ import annotations

import math
from decimal import Decimal

EPS: float = 1e-9


def step_decimals(step: float) -> int:
    """Number of decimal places in `step` (0.01 -> 2, 1.0 -> 0, 0.0001 -> 4)."""
    exp = Decimal(str(step)).normalize().as_tuple().exponent
    return max(0, -int(exp))


def floor_to_step(value: float, step: float) -> float:
    """Round value DOWN to a multiple of step; value <= 0 gives 0.0."""
    if step <= 0:
        raise ValueError("step must be > 0")
    if value <= 0:
        return 0.0
    n = math.floor(value / step + EPS)
    return round(n * step, step_decimals(step))
