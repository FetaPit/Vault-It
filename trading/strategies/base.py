"""Strategy interface for signal producers (strategies never size or place orders)."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date, datetime
from typing import ClassVar

from trading.models import Bar, Signal, Sleeve
from trading.session import SessionWindow


@dataclass(frozen=True, slots=True)
class StrategyContext:
    now: datetime
    window: SessionWindow
    open_symbols: frozenset[str]

    def has_open_position(self, symbol: str) -> bool:
        return symbol in self.open_symbols


class Strategy(ABC):
    name: ClassVar[str]
    sleeve: ClassVar[Sleeve]

    @abstractmethod
    def on_session_start(self, d: date, window: SessionWindow) -> None:
        """Reset per-day state."""

    @abstractmethod
    def on_bar(self, bar: Bar, ctx: StrategyContext) -> list[Signal]:
        """Consume one completed bar; return zero or more signals (never orders)."""
