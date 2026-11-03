"""LLM proposal inbox: validates JSON files into Signals. Size fields are forbidden."""
from __future__ import annotations

import json
import math
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from trading.models import EntryType, Side, Signal, Sleeve

ALLOWED_FIELDS: frozenset[str] = frozenset({"signal_id", "ts", "symbol", "side", "entry_type", "entry", "stop",
                                            "target", "sleeve", "rationale", "features", "source"})
SIZE_FIELDS: frozenset[str] = frozenset({"quantity", "qty", "size", "stake", "units", "notional"})
_REQUIRED = ("signal_id", "ts", "symbol", "side", "entry", "sleeve")


@dataclass(frozen=True, slots=True)
class InboxResult:
    path: Path
    signal: Signal | None
    error: str | None


def _is_num(v: object) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)


def _parse(data: object) -> tuple[Signal | None, str | None]:
    if not isinstance(data, dict):
        return None, "NOT_AN_OBJECT"
    if any(k in data for k in SIZE_FIELDS):
        return None, "QUANTITY_NOT_ALLOWED"
    for k in sorted(data):
        if k not in ALLOWED_FIELDS:
            return None, f"UNKNOWN_FIELD:{k}"
    for k in _REQUIRED:
        if k not in data:
            return None, f"MISSING_FIELD:{k}"
    try:
        ts = datetime.fromisoformat(str(data["ts"])) if isinstance(data["ts"], str) else None
    except ValueError:
        ts = None
    if ts is None or ts.tzinfo is None or ts.utcoffset() is None:
        return None, "INVALID_TS"
    for k in ("signal_id", "symbol"):
        if not isinstance(data[k], str) or not data[k].strip():
            return None, f"INVALID_VALUE:{k}"
    if data["side"] not in ("long", "short"):
        return None, "INVALID_VALUE:side"
    if data["sleeve"] not in ("A", "B"):
        return None, "INVALID_VALUE:sleeve"
    if not _is_num(data["entry"]) or data["entry"] <= 0:
        return None, "INVALID_VALUE:entry"
    for k in ("stop", "target"):
        if data.get(k) is not None and not _is_num(data[k]):
            return None, f"INVALID_VALUE:{k}"
    et = data.get("entry_type", "market")
    if et not in {e.value for e in EntryType}:
        return None, "INVALID_VALUE:entry_type"
    if not isinstance(data.get("rationale", ""), str):
        return None, "INVALID_VALUE:rationale"
    feats = data.get("features", {})
    if not isinstance(feats, dict) or not all(_is_num(v) for v in feats.values()):
        return None, "INVALID_VALUE:features"
    sig = Signal(
        signal_id=data["signal_id"], ts=ts, symbol=data["symbol"], side=Side(data["side"]),
        entry_type=EntryType(et), entry=float(data["entry"]),
        stop=None if data.get("stop") is None else float(data["stop"]),
        target=None if data.get("target") is None else float(data["target"]),
        sleeve=Sleeve(data["sleeve"]), source="llm", rationale=data.get("rationale", ""),
        features={k: float(v) for k, v in feats.items()})
    return sig, None


def read_inbox(inbox_dir: Path, move_files: bool = True) -> list[InboxResult]:
    """Validate every *.json file (sorted by name). The LLM can only produce signals, never orders."""
    inbox_dir = Path(inbox_dir)
    results: list[InboxResult] = []
    if not inbox_dir.is_dir():
        return results
    processed, rejected = inbox_dir / "processed", inbox_dir / "rejected"
    if move_files:
        processed.mkdir(exist_ok=True)
        rejected.mkdir(exist_ok=True)
    for path in sorted(p for p in inbox_dir.glob("*.json") if p.is_file()):
        sig: Signal | None
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            sig, err = None, "INVALID_JSON"
        else:
            sig, err = _parse(data)
        final = path
        if move_files:
            final = (processed if err is None else rejected) / path.name
            path.replace(final)
            if err is not None:
                (rejected / f"{path.name}.error.txt").write_text(err + "\n", encoding="utf-8")
        results.append(InboxResult(final, sig, err))
    return results
