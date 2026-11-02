"""Event calendar (dividends, earnings, macro, holidays) loaded from CSV."""
from __future__ import annotations

import csv
from collections.abc import Collection
from dataclasses import dataclass
from datetime import date, timedelta
from enum import Enum
from pathlib import Path
from typing import Iterable

from trading.errors import CalendarError


class EventType(str, Enum):
    EX_DIVIDEND = "ex_dividend"
    DIVIDEND_PAY = "dividend_pay"
    EARNINGS = "earnings"
    MACRO = "macro"
    MARKET_HOLIDAY = "market_holiday"
    EARLY_CLOSE = "early_close"


@dataclass(frozen=True, slots=True)
class Event:
    d: date
    type: EventType
    symbol: str | None
    amount: float | None
    ref_date: date | None
    note: str = ""


CALENDAR_COLUMNS = ("date", "type", "symbol", "amount", "ref_date", "note")


def _validate(e: Event, line_no: int | None = None) -> None:
    if e.type in (EventType.EX_DIVIDEND, EventType.DIVIDEND_PAY):
        if not e.symbol:
            raise CalendarError(f"{e.type.value} needs a symbol", line_no)
        if e.amount is None or e.amount <= 0:
            raise CalendarError(f"{e.type.value} needs amount > 0", line_no)
    if e.type == EventType.DIVIDEND_PAY and e.ref_date is None:
        raise CalendarError("dividend_pay needs ref_date", line_no)
    if e.type == EventType.EARNINGS and not e.symbol:
        raise CalendarError("earnings needs a symbol", line_no)


class EventCalendar:
    def __init__(self, events: Iterable[Event]) -> None:
        evs = list(events)
        for e in evs:
            _validate(e)
        self._events = sorted(evs, key=lambda e: (e.d, e.type.value, e.symbol or ""))

    @classmethod
    def from_csv(cls, path: Path) -> "EventCalendar":
        events: list[Event] = []
        try:
            fh = Path(path).open(newline="", encoding="utf-8")
        except OSError as e:
            raise CalendarError(f"cannot read {path}: {e}") from e
        with fh:
            reader = csv.DictReader(fh)
            missing = [c for c in CALENDAR_COLUMNS if c not in (reader.fieldnames or [])]
            if missing:
                raise CalendarError(f"missing columns: {', '.join(missing)}", 1)
            for line_no, row in enumerate(reader, start=2):
                def cell(k: str) -> str | None:
                    v = (row.get(k) or "").strip()
                    return v or None
                try:
                    d = date.fromisoformat(cell("date") or "")
                    etype = EventType(cell("type") or "")
                    amount = float(cell("amount")) if cell("amount") is not None else None  # type: ignore[arg-type]
                    ref = date.fromisoformat(cell("ref_date")) if cell("ref_date") else None  # type: ignore[arg-type]
                except ValueError as e:
                    raise CalendarError(str(e), line_no) from e
                ev = Event(d, etype, cell("symbol"), amount, ref, cell("note") or "")
                _validate(ev, line_no)
                events.append(ev)
        return cls(events)

    def events_on(self, d: date, types: Collection[EventType] | None = None) -> list[Event]:
        return [e for e in self._events if e.d == d and (types is None or e.type in types)]

    def upcoming(self, d: date, days: int, types: Collection[EventType] | None = None) -> list[Event]:
        end = d + timedelta(days=days)
        return [e for e in self._events if d <= e.d <= end and (types is None or e.type in types)]

    def holidays(self) -> frozenset[date]:
        return frozenset(e.d for e in self._events if e.type == EventType.MARKET_HOLIDAY)

    def is_blackout(self, symbol: str, d: date, days: int) -> bool:
        for e in self._events:
            if e.type == EventType.EARNINGS and e.symbol == symbol and abs((e.d - d).days) <= days:
                return True
            if e.type == EventType.MACRO and e.d == d and e.symbol in (None, symbol):
                return True
        return False
