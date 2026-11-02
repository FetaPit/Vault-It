"""Kill switch: file plus memory flag, fail-closed."""
from __future__ import annotations

from datetime import datetime
from pathlib import Path


class KillSwitch:
    def __init__(self, path: Path | None) -> None:
        self._path = path
        self._active = False
        self._reason: str | None = None

    def is_active(self) -> bool:
        if self._active:
            return True
        if self._path is None:
            return False
        try:
            return self._path.exists()
        except OSError:
            return True  # fail closed

    def activate(self, reason: str, ts: datetime) -> None:
        self._active = True
        self._reason = reason
        if self._path is not None:
            self._path.parent.mkdir(parents=True, exist_ok=True)
            with self._path.open("a", encoding="utf-8") as fh:
                fh.write(f"{ts.isoformat()} {reason}\n")

    def clear(self) -> None:
        """Only called by the CLI (`killswitch off`), never by engine code."""
        self._active = False
        self._reason = None
        if self._path is not None and self._path.exists():
            self._path.unlink()

    def reason(self) -> str | None:
        if self._reason is not None:
            return self._reason
        if self._path is not None:
            try:
                if self._path.exists():
                    return self._path.read_text(encoding="utf-8").strip()
            except OSError:
                return "unreadable kill switch file"
        return None
