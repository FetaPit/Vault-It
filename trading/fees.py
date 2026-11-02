"""Commission, stamp duty, fill prices and per-fill costs."""
from __future__ import annotations

from dataclasses import dataclass

from trading.config import FeeProfile, InstrumentSpec
from trading.fx import FxConverter
from trading.models import Action


@dataclass(frozen=True, slots=True)
class FillCosts:
    fill_price: float
    commission_gbp: float
    stamp_duty_gbp: float
    fx_cost_gbp: float
    spread_slippage_gbp: float

    @property
    def total_fees_gbp(self) -> float:
        return self.commission_gbp + self.stamp_duty_gbp + self.fx_cost_gbp


def commission_gbp(profile: FeeProfile, quantity: float, notional_gbp: float) -> float:
    if quantity == 0:
        return 0.0
    variable = quantity * profile.commission_per_unit_gbp + abs(notional_gbp) * profile.commission_pct
    return max(profile.min_commission_gbp, variable) + profile.commission_per_order_gbp


def stamp_duty_gbp(instrument: InstrumentSpec, action: Action, notional_gbp: float) -> float:
    if action == "buy" and instrument.kind == "share":
        return instrument.stamp_duty_rate * abs(notional_gbp)
    return 0.0


def market_fill_price(mid: float, action: Action, profile: FeeProfile, apply_slippage: bool = True) -> float:
    adj = profile.half_spread + (profile.slippage if apply_slippage else 0.0)
    return mid + adj if action == "buy" else mid - adj


def fill_costs(instrument: InstrumentSpec, profile: FeeProfile, fx: FxConverter, action: Action,
               quantity: float, fill_price: float, mid_price: float) -> FillCosts:
    notional = fx.to_gbp(quantity * fill_price * instrument.multiplier, instrument.currency)
    return FillCosts(
        fill_price=fill_price,
        commission_gbp=commission_gbp(profile, quantity, notional),
        stamp_duty_gbp=stamp_duty_gbp(instrument, action, notional),
        fx_cost_gbp=fx.conversion_cost_gbp(notional, instrument.currency, profile.fx_conversion_pct),
        spread_slippage_gbp=fx.to_gbp(quantity * abs(fill_price - mid_price) * instrument.multiplier,
                                      instrument.currency),
    )
