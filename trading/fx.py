"""Static-rate FX conversion (phase 1: no FX P&L)."""
from __future__ import annotations

from typing import Mapping

from trading.config import TradingConfig
from trading.errors import FxError


class FxConverter:
    def __init__(self, rates_gbp_per_unit: Mapping[str, float]) -> None:
        rates = dict(rates_gbp_per_unit)
        for k, v in rates.items():
            if v <= 0:
                raise FxError(f"non-positive rate for {k}")
        rates["GBP"] = 1.0
        self._rates = rates

    @classmethod
    def from_config(cls, cfg: TradingConfig) -> "FxConverter":
        return cls(cfg.fx.rates_gbp_per_unit)

    def rate(self, ccy: str) -> float:
        try:
            return self._rates[ccy]
        except KeyError:
            raise FxError(f"no rate for {ccy}") from None

    def to_gbp(self, amount: float, ccy: str) -> float:
        return amount * self.rate(ccy)

    def conversion_cost_gbp(self, notional_gbp: float, ccy: str, cost_pct: float) -> float:
        return 0.0 if ccy == "GBP" else abs(notional_gbp) * cost_pct
