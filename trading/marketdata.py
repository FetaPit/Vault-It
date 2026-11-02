"""Market data adapters: in-memory and CSV (no network)."""
from __future__ import annotations

import csv
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

from trading.errors import MarketDataError
from trading.models import Bar, require_utc

CSV_COLUMNS: tuple[str, ...] = ("symbol", "ts", "open", "high", "low", "close", "volume", "interval_seconds")


class MarketDataAdapter(ABC):
    @abstractmethod
    def symbols(self) -> tuple[str, ...]:
        """All symbols available."""

    @abstractmethod
    def bars(self, symbol: str, start: datetime, end: datetime) -> list[Bar]:
        """Bars with start <= bar.ts < end, ascending. Unknown symbol -> []."""

    def latest_price(self, symbol: str, at: datetime) -> float | None:
        """Close of the last bar with end_ts <= at; None if none."""
        earliest = datetime.min.replace(tzinfo=timezone.utc)
        done = [b for b in self.bars(symbol, earliest, at) if b.end_ts <= at]
        return done[-1].close if done else None


class InMemoryMarketData(MarketDataAdapter):
    def __init__(self, bars: Iterable[Bar]) -> None:
        by_symbol: dict[str, dict[datetime, Bar]] = {}
        for b in bars:
            sym = by_symbol.setdefault(b.symbol, {})
            if b.ts in sym:
                raise MarketDataError(f"duplicate bar {b.symbol} {b.ts.isoformat()}")
            sym[b.ts] = b
        self._bars = {s: sorted(d.values(), key=lambda x: x.ts) for s, d in by_symbol.items()}

    def symbols(self) -> tuple[str, ...]:
        return tuple(sorted(self._bars))

    def bars(self, symbol: str, start: datetime, end: datetime) -> list[Bar]:
        require_utc(start, "start")
        require_utc(end, "end")
        return [b for b in self._bars.get(symbol, []) if start <= b.ts < end]


class CsvMarketData(InMemoryMarketData):
    def __init__(self, path: Path) -> None:
        try:
            fh = Path(path).open(newline="", encoding="utf-8")
        except OSError as e:
            raise MarketDataError(f"cannot read {path}: {e}") from e
        parsed: list[Bar] = []
        with fh:
            reader = csv.DictReader(fh)
            missing = [c for c in CSV_COLUMNS if c not in (reader.fieldnames or [])]
            if missing:
                raise MarketDataError(f"missing columns: {', '.join(missing)}", line_no=1)
            for line_no, row in enumerate(reader, start=2):
                try:
                    ts = datetime.fromisoformat(row["ts"])
                    if ts.tzinfo is None or ts.utcoffset() is None:
                        raise MarketDataError("naive timestamp", line_no)
                    vol = row["volume"].strip()
                    itv = row["interval_seconds"].strip()
                    parsed.append(Bar(row["symbol"], ts, float(row["open"]), float(row["high"]),
                                      float(row["low"]), float(row["close"]),
                                      float(vol) if vol else 0.0, int(itv) if itv else 300))
                except MarketDataError:
                    raise
                except (ValueError, TypeError, KeyError) as e:
                    raise MarketDataError(str(e), line_no) from e
        super().__init__(parsed)
