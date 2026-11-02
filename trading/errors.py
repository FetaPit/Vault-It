"""Exception hierarchy for the trading package."""
from __future__ import annotations


class TradingError(Exception):
    """Base for all package errors."""


class ConfigError(TradingError):
    """Invalid or inconsistent configuration."""


def _prefix(message: str, line_no: int | None) -> str:
    return f"line {line_no}: {message}" if line_no is not None else message


class MarketDataError(TradingError):
    """Bad market data input."""

    def __init__(self, message: str, line_no: int | None = None) -> None:
        super().__init__(_prefix(message, line_no))
        self.line_no = line_no


class CalendarError(TradingError):
    """Bad event calendar input."""

    def __init__(self, message: str, line_no: int | None = None) -> None:
        super().__init__(_prefix(message, line_no))
        self.line_no = line_no


class PaperOnlyViolation(TradingError):
    """Raised when anything other than paper mode is attempted."""


class OrderError(TradingError):
    """Malformed order reached the broker (defence in depth)."""


class JournalError(TradingError):
    """SQLite integrity/consistency problem."""


class InsufficientCashError(TradingError):
    """Cash ledger would go negative."""


class FxError(TradingError):
    """Unknown currency / bad rate."""
