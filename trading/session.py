"""NY-open-based trading window, DST mismatch handling, trading days."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from trading.config import SessionConfig

LONDON: ZoneInfo = ZoneInfo("Europe/London")
NEW_YORK: ZoneInfo = ZoneInfo("America/New_York")


@dataclass(frozen=True, slots=True)
class SessionWindow:
    trading_date: date
    start_utc: datetime
    opening_range_end_utc: datetime
    entry_cutoff_utc: datetime
    end_utc: datetime
    flat_by_utc: datetime
    dst_mismatch: bool

    def london_label(self) -> str:
        s = self.start_utc.astimezone(LONDON)
        e = self.end_utc.astimezone(LONDON)
        return f"{s:%H:%M}-{e:%H:%M} Europe/London"

    def contains(self, ts: datetime) -> bool:
        return self.start_utc <= ts < self.end_utc


def ny_open_utc(d: date, ny_open: str = "09:30") -> datetime:
    hh, mm = ny_open.split(":")
    return datetime.combine(d, time(int(hh), int(mm)), tzinfo=NEW_YORK).astimezone(timezone.utc)


def is_dst_mismatch(d: date) -> bool:
    """True if London-minus-NY UTC offset at 12:00 local on d differs from 5 hours."""
    noon = time(12, 0)
    lon = datetime.combine(d, noon, tzinfo=LONDON).utcoffset()
    ny = datetime.combine(d, noon, tzinfo=NEW_YORK).utcoffset()
    assert lon is not None and ny is not None
    return (lon - ny) != timedelta(hours=5)


def session_window(d: date, cfg: SessionConfig) -> SessionWindow:
    start = ny_open_utc(d, cfg.ny_open)
    end = start + timedelta(minutes=cfg.window_minutes)
    return SessionWindow(
        trading_date=d,
        start_utc=start,
        opening_range_end_utc=start + timedelta(minutes=cfg.opening_range_minutes),
        entry_cutoff_utc=end - timedelta(minutes=cfg.entry_cutoff_minutes),
        end_utc=end,
        flat_by_utc=end,
        dst_mismatch=is_dst_mismatch(d),
    )


def is_trading_day(d: date, holidays: frozenset[date] = frozenset()) -> bool:
    return d.weekday() < 5 and d not in holidays
