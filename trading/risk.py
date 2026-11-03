"""Risk engine: veto and position sizing between every signal source and the broker."""
from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime

from trading.config import InstrumentSpec, TradingConfig
from trading.fx import FxConverter
from trading.killswitch import KillSwitch
from trading.mathutil import EPS, floor_to_step
from trading.models import (AccountState, EntryType, ExitReason, OrderRequest, RiskDecision, Side, Signal,
                            Sleeve, require_utc)
from trading.session import SessionWindow

KILL_SWITCH_ACTIVE = "KILL_SWITCH_ACTIVE"
MODE_NOT_PAPER = "MODE_NOT_PAPER"
UNKNOWN_INSTRUMENT = "UNKNOWN_INSTRUMENT"
INVALID_ENTRY_PRICE = "INVALID_ENTRY_PRICE"
NO_STOP = "NO_STOP"
STOP_ZERO = "STOP_ZERO"
STOP_WRONG_SIDE = "STOP_WRONG_SIDE"
STOP_TOO_TIGHT = "STOP_TOO_TIGHT"
TARGET_WRONG_SIDE = "TARGET_WRONG_SIDE"
STALE_SIGNAL = "STALE_SIGNAL"
SIGNAL_FROM_FUTURE = "SIGNAL_FROM_FUTURE"
NO_SESSION_WINDOW = "NO_SESSION_WINDOW"
OUTSIDE_SESSION_WINDOW = "OUTSIDE_SESSION_WINDOW"
SHORT_NOT_ALLOWED = "SHORT_NOT_ALLOWED"
DUPLICATE_POSITION = "DUPLICATE_POSITION"
MAX_TRADES_PER_DAY = "MAX_TRADES_PER_DAY"
DAILY_LOSS_CAP_HIT = "DAILY_LOSS_CAP_HIT"
DAILY_LOSS_BUDGET_EXHAUSTED = "DAILY_LOSS_BUDGET_EXHAUSTED"
FEES_EXCEED_BUDGET = "FEES_EXCEED_BUDGET"
SIZE_BELOW_MINIMUM = "SIZE_BELOW_MINIMUM"

FUTURE_TOLERANCE_SECONDS: int = 5


@dataclass(frozen=True, slots=True)
class SizingBreakdown:
    budget_gbp: float
    fixed_costs_gbp: float
    risk_per_unit_gbp: float
    qty_by_risk: float
    qty_by_notional: float
    quantity: float
    risk_gbp: float
    # PLAN_GAP: plan's SizingBreakdown has no way to carry a sizing rejection reason.
    # Implemented as: optional trailing field; None means sizing succeeded.
    reject_reason: str | None = None


class RiskEngine:
    def __init__(self, cfg: TradingConfig, kill_switch: KillSwitch, fx: FxConverter) -> None:
        self._cfg = cfg
        self._ks = kill_switch
        self._fx = fx

    # -- helpers
    def daily_loss_gbp(self, account: AccountState) -> float:
        return max(0.0, account.day_start_equity_gbp - account.fund_equity_gbp)

    def daily_cap_gbp(self, account: AccountState) -> float:
        return account.day_start_equity_gbp * self._cfg.risk.daily_loss_cap_pct

    def must_flatten_sleeve_a(self, now: datetime, window: SessionWindow | None,
                              account: AccountState) -> ExitReason | None:
        if self._ks.is_active():
            return ExitReason.KILL_SWITCH
        if self.daily_loss_gbp(account) >= self.daily_cap_gbp(account) - EPS:
            return ExitReason.DAILY_CAP
        if window is None or now >= window.flat_by_utc:
            return ExitReason.TIME_FLAT
        return None

    def update_drawdown(self, equity_gbp: float, peak_gbp: float, now: datetime) -> bool:
        if peak_gbp > 0 and (peak_gbp - equity_gbp) / peak_gbp >= self._cfg.risk.max_drawdown_kill_pct - EPS:
            self._ks.activate("MAX_DRAWDOWN", now)
            return True
        return False

    # -- evaluate
    def evaluate(self, signal: Signal, account: AccountState, now: datetime,
                 window: SessionWindow | None) -> RiskDecision:
        require_utc(now, "now")
        cfg = self._cfg
        r = cfg.risk
        inst = cfg.instrument(signal.symbol)
        reasons: list[str] = []
        if self._ks.is_active():
            reasons.append(KILL_SWITCH_ACTIVE)
        if cfg.mode != "paper":
            reasons.append(MODE_NOT_PAPER)
        if inst is None:
            reasons.append(UNKNOWN_INSTRUMENT)
        entry_ok = math.isfinite(signal.entry) and signal.entry > 0
        if not entry_ok:
            reasons.append(INVALID_ENTRY_PRICE)
        if signal.stop is None:
            reasons.append(NO_STOP)
        elif not math.isfinite(signal.stop) or signal.stop <= 0:
            reasons.append(STOP_WRONG_SIDE)
        elif entry_ok:
            dist = abs(signal.entry - signal.stop)
            if dist <= 1e-12:
                reasons.append(STOP_ZERO)
            elif ((signal.side == Side.LONG and signal.stop > signal.entry)
                  or (signal.side == Side.SHORT and signal.stop < signal.entry)):
                reasons.append(STOP_WRONG_SIDE)
            elif dist < signal.entry * r.min_stop_distance_pct:
                reasons.append(STOP_TOO_TIGHT)
        if signal.target is not None and (
                (signal.side == Side.LONG and signal.target <= signal.entry)
                or (signal.side == Side.SHORT and signal.target >= signal.entry)):
            reasons.append(TARGET_WRONG_SIDE)
        age = (now - signal.ts).total_seconds()
        if age > r.max_signal_age_seconds:
            reasons.append(STALE_SIGNAL)
        if -age > FUTURE_TOLERANCE_SECONDS:
            reasons.append(SIGNAL_FROM_FUTURE)
        if signal.sleeve == Sleeve.A:
            if window is None:
                reasons.append(NO_SESSION_WINDOW)
            elif now < window.opening_range_end_utc or now > window.entry_cutoff_utc:
                reasons.append(OUTSIDE_SESSION_WINDOW)
        if signal.side == Side.SHORT and ((inst is not None and not inst.can_short)
                                          or signal.sleeve == Sleeve.B):
            reasons.append(SHORT_NOT_ALLOWED)
        if any(p.symbol == signal.symbol and p.sleeve == signal.sleeve for p in account.open_positions):
            reasons.append(DUPLICATE_POSITION)
        if account.trades_today >= r.max_trades_per_day:
            reasons.append(MAX_TRADES_PER_DAY)
        if self.daily_loss_gbp(account) >= self.daily_cap_gbp(account) - EPS:
            reasons.append(DAILY_LOSS_CAP_HIT)
        if reasons:
            return self._reject(signal, tuple(reasons))

        assert inst is not None and signal.stop is not None
        sz = self.size(signal, inst, account)
        if sz.reject_reason is not None:
            return self._reject(signal, (sz.reject_reason,))
        order = OrderRequest(
            order_id=f"{signal.signal_id}-o", signal_id=signal.signal_id, symbol=signal.symbol,
            side=signal.side, quantity=sz.quantity, entry_type=signal.entry_type,
            entry_price=signal.entry, stop_price=signal.stop, target_price=signal.target,
            sleeve=signal.sleeve, ts=now,
            expires_ts=window.entry_cutoff_utc if signal.sleeve == Sleeve.A and window else None,
            config_version=cfg.version)
        return RiskDecision(signal.signal_id, True, (), sz.quantity, sz.risk_gbp, order)

    @staticmethod
    def _reject(signal: Signal, reasons: tuple[str, ...]) -> RiskDecision:
        return RiskDecision(signal.signal_id, False, reasons, 0.0, 0.0, None)

    # -- sizing
    def size(self, signal: Signal, instrument: InstrumentSpec, account: AccountState) -> SizingBreakdown:
        cfg = self._cfg
        assert signal.stop is not None
        inst = instrument
        fxr = self._fx.rate(inst.currency)
        m = inst.multiplier
        p = cfg.fees[inst.fee_profile]
        E = signal.entry
        dist = abs(E - signal.stop)
        non_gbp = inst.currency != "GBP"
        is_long_share = signal.side == Side.LONG and inst.kind == "share"

        def fail(reason: str, budget: float = 0.0, fixed: float = 0.0, rpu: float = 0.0,
                 qr: float = 0.0, qn: float = 0.0) -> SizingBreakdown:
            return SizingBreakdown(budget, fixed, rpu, qr, qn, 0.0, 0.0, reason)

        per_trade_budget = account.fund_equity_gbp * cfg.risk.max_risk_per_trade_pct
        open_risk = sum(pos.initial_risk_gbp for pos in account.open_positions)
        remaining = (self.daily_cap_gbp(account) - self.daily_loss_gbp(account) - open_risk
                     - account.pending_risk_gbp)
        budget = min(per_trade_budget, remaining)
        if budget <= EPS:
            return fail(DAILY_LOSS_BUDGET_EXHAUSTED, budget)
        fixed = 2 * (p.min_commission_gbp + p.commission_per_order_gbp)
        if budget - fixed <= EPS:
            return fail(FEES_EXCEED_BUDGET, budget, fixed)
        n_u = E * m * fxr
        stamp_u = n_u * inst.stamp_duty_rate if is_long_share else 0.0
        per_unit_cost = (2 * (p.half_spread + p.slippage) * m * fxr
                         + 2 * (p.commission_per_unit_gbp + n_u * p.commission_pct)
                         + (2 * n_u * p.fx_conversion_pct if non_gbp else 0.0)
                         + stamp_u)
        risk_per_unit = dist * m * fxr + per_unit_cost
        qty_by_risk = floor_to_step((budget - fixed) / risk_per_unit, inst.size_step)

        if signal.sleeve == Sleeve.B:
            max_notional = account.sleeve_cash_gbp
        else:
            lev = 1.0 if cfg.risk.leverage_mode == "cash_only" else cfg.risk.max_leverage
            max_notional = (account.sleeve_equity_gbp * lev - account.sleeve_open_notional_gbp
                            - account.pending_notional_gbp)
        fixed_buy = p.min_commission_gbp + p.commission_per_order_gbp
        unit_buy = ((E + p.half_spread + p.slippage) * m * fxr
                    * (1 + (inst.stamp_duty_rate if is_long_share else 0.0) + p.commission_pct
                       + (p.fx_conversion_pct if non_gbp else 0.0))
                    + p.commission_per_unit_gbp)
        if max_notional - fixed_buy <= 0:
            qty_by_notional = 0.0
        else:
            qty_by_notional = floor_to_step((max_notional - fixed_buy) / unit_buy, inst.size_step)
        quantity = min(qty_by_risk, qty_by_notional, inst.max_size)
        if quantity < inst.min_size - EPS:
            return fail(SIZE_BELOW_MINIMUM, budget, fixed, risk_per_unit, qty_by_risk, qty_by_notional)
        risk_gbp = quantity * risk_per_unit + fixed
        return SizingBreakdown(budget, fixed, risk_per_unit, qty_by_risk, qty_by_notional, quantity, risk_gbp)
