"""Paper-only guards."""
from __future__ import annotations

from trading.config import TradingConfig
from trading.errors import PaperOnlyViolation

FORBIDDEN_IMPORTS: frozenset[str] = frozenset({
    "socket", "ssl", "http", "urllib", "requests", "httpx", "aiohttp", "websocket", "websockets",
    "ib_insync", "ibapi", "smtplib", "ftplib", "telnetlib", "xmlrpc"})


def assert_paper_mode(cfg: TradingConfig) -> None:
    if cfg.mode != "paper":
        raise PaperOnlyViolation(f"mode={cfg.mode!r}; phase 1 is paper-only")
