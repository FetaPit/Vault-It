"""Enums and value dataclasses shared across the package."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Literal, Mapping


class Side(str, Enum):
    LONG = "long"
    SHORT = "short"


class Sleeve(str, Enum):
    A = "A"
    B = "B"


class EntryType(str, Enum):
    MARKET = "market"
    STOP = "stop"
    LIMIT = "limit"


class OrderStatus(str, Enum):
    PENDING = "pending"
    PARTIALLY_FILLED = "partially_filled"
    FILLED = "filled"
    CANCELLED = "cancelled"


class ExitReason(str, Enum):
    STOP = "stop"
    TARGET = "target"
    TIME_FLAT = "time_flat"
    DAILY_CAP = "daily_cap"
    KILL_SWITCH = "kill_switch"
    MANUAL = "manual"
    TRANCHE = "tranche"
    PROTECTIVE_STOP = "protective_stop"


Action = Literal["buy", "sell"]


def require_utc(ts: datetime, name: str) -> None:
    """Raise ValueError if ts is naive."""
    if ts.tzinfo is None or ts.utcoffset() is None:
        raise ValueError(f"{name} must be timezone-aware")


@dataclass(frozen=True, slots=True)
class Bar:
    symbol: str
    ts: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float = 0.0
    interval_seconds: int = 300

    def __post_init__(self) -> None:
        require_utc(self.ts, "ts")
        if self.high < max(self.open, self.close, self.low):
            raise ValueError("high below open/close/low")
        if self.low > min(self.open, self.close):
            raise ValueError("low above open/close")
        if min(self.open, self.high, self.low, self.close) <= 0:
            raise ValueError("prices must be > 0")
        if self.volume < 0:
            raise ValueError("volume must be >= 0")
        if self.interval_seconds <= 0:
            raise ValueError("interval_seconds must be > 0")

    @property
    def end_ts(self) -> datetime:
        return self.ts + timedelta(seconds=self.interval_seconds)


@dataclass(frozen=True, slots=True)
class Signal:
    signal_id: str
    ts: datetime
    symbol: str
    side: Side
    entry_type: EntryType
    entry: float
    stop: float | None
    target: float | None
    sleeve: Sleeve
    source: str
    rationale: str = ""
    features: Mapping[str, float] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class OrderRequest:
    order_id: str
    signal_id: str
    symbol: str
    side: Side
    quantity: float
    entry_type: EntryType
    entry_price: float
    stop_price: float
    target_price: float | None
    sleeve: Sleeve
    ts: datetime
    expires_ts: datetime | None
    config_version: str


@dataclass(frozen=True, slots=True)
class Fill:
    fill_id: str
    order_id: str
    symbol: str
    action: Action
    quantity: float
    price: float
    mid_price: float
    commission_gbp: float
    stamp_duty_gbp: float
    fx_cost_gbp: float
    spread_slippage_gbp: float
    ts: datetime
    is_partial: bool

    @property
    def fees_gbp(self) -> float:
        return self.commission_gbp + self.stamp_duty_gbp + self.fx_cost_gbp


@dataclass(slots=True)
class Position:
    position_id: str
    order_id: str
    symbol: str
    side: Side
    sleeve: Sleeve
    quantity: float
    entry_price: float
    stop_price: float
    target_price: float | None
    opened_ts: datetime
    initial_risk_gbp: float
    entry_fees_gbp: float


@dataclass(frozen=True, slots=True)
class ClosedTrade:
    trade_id: str
    position_id: str
    symbol: str
    side: Side
    sleeve: Sleeve
    quantity: float
    entry_price: float
    exit_price: float
    opened_ts: datetime
    closed_ts: datetime
    gross_pnl_gbp: float
    fees_gbp: float
    net_pnl_gbp: float
    exit_reason: ExitReason
    config_version: str


@dataclass(frozen=True, slots=True)
class AccountState:
    fund_equity_gbp: float
    day_start_equity_gbp: float
    peak_equity_gbp: float
    trades_today: int
    open_positions: tuple[Position, ...]
    sleeve_equity_gbp: float
    sleeve_open_notional_gbp: float
    sleeve_cash_gbp: float


@dataclass(frozen=True, slots=True)
class RiskDecision:
    signal_id: str
    approved: bool
    reasons: tuple[str, ...]
    quantity: float
    risk_gbp: float
    order: OrderRequest | None
