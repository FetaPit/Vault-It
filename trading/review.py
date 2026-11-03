"""Weekly review: stats, walk-forward splits and versioned config proposals."""
from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from typing import Mapping, Sequence

from trading.config import (PROPOSED_FILE_RE, VERSION_FILE_RE, TradingConfig, config_from_dict,
                            config_to_dict)
from trading.errors import ConfigError
from trading.journal import TradeJournal
from trading.models import ClosedTrade


@dataclass(frozen=True, slots=True)
class ReviewStats:
    n_trades: int
    win_rate: float
    avg_win_gbp: float
    avg_loss_gbp: float
    expectancy_gbp: float
    profit_factor: float | None
    net_pnl_gbp: float
    max_consecutive_losses: int


@dataclass(frozen=True, slots=True)
class ReviewReport:
    week_end: date
    stats: ReviewStats
    sample_ok: bool
    message: str


FORBIDDEN_PROPOSAL_PREFIXES: tuple[str, ...] = ("risk.", "mode", "paths.", "schema_version", "version")


def compute_stats(trades: Sequence[ClosedTrade]) -> ReviewStats:
    n = len(trades)
    if n == 0:
        return ReviewStats(0, 0.0, 0.0, 0.0, 0.0, None, 0.0, 0)
    nets = [t.net_pnl_gbp for t in trades]
    wins = [x for x in nets if x > 0]
    losses = [x for x in nets if x <= 0]
    run = best = 0
    for x in nets:
        run = run + 1 if x <= 0 else 0
        best = max(best, run)
    pf = sum(wins) / abs(sum(losses)) if losses and sum(losses) != 0 else None
    return ReviewStats(n, len(wins) / n, sum(wins) / len(wins) if wins else 0.0,
                       sum(losses) / len(losses) if losses else 0.0, sum(nets) / n, pf, sum(nets), best)


def weekly_review(journal: TradeJournal, week_end: date, lookback_days: int = 90,
                  min_trades: int = 30) -> ReviewReport:
    def midnight(d: date) -> datetime:
        return datetime.combine(d, time(0), tzinfo=timezone.utc)

    trades = journal.trades_between(midnight(week_end - timedelta(days=lookback_days)),
                                    midnight(week_end + timedelta(days=1)))
    stats = compute_stats(trades)
    ok = stats.n_trades >= min_trades
    msg = f"OK: n={stats.n_trades}" if ok else f"INSUFFICIENT_SAMPLE: n={stats.n_trades} < {min_trades}"
    return ReviewReport(week_end, stats, ok, msg)


def walk_forward_splits(days: Sequence[date], train_days: int,
                        test_days: int) -> list[tuple[list[date], list[date]]]:
    if train_days < 1 or test_days < 1:
        raise ValueError("train_days and test_days must be >= 1")
    out: list[tuple[list[date], list[date]]] = []
    i = 0
    while i + train_days + test_days <= len(days):
        out.append((list(days[i:i + train_days]), list(days[i + train_days:i + train_days + test_days])))
        i += test_days
    return out


def write_proposal(config_dir: Path, base: TradingConfig, changes: Mapping[str, float | int | str | bool],
                   reason: str) -> Path:
    """Write vNNNN.proposed.json (never overwriting). Humans activate it by renaming."""
    for key in changes:
        if any(key.startswith(p) for p in FORBIDDEN_PROPOSAL_PREFIXES):
            raise ConfigError(f"review may not change {key}")
    data = config_to_dict(base)
    for key, value in changes.items():
        node: object = data
        parts = key.split(".")
        for part in parts[:-1]:
            if not isinstance(node, dict) or part not in node:
                raise ConfigError(f"unknown config path: {key}")
            node = node[part]
        if not isinstance(node, dict) or parts[-1] not in node:
            raise ConfigError(f"unknown config path: {key}")
        node[parts[-1]] = value
    config_dir = Path(config_dir)
    nums = [int(m.group(1)) for p in config_dir.iterdir()
            for m in (VERSION_FILE_RE.match(p.name) or PROPOSED_FILE_RE.match(p.name),) if m]
    n = 1 + max(nums, default=0)
    data["version"] = f"v{n:04d}"
    config_from_dict(data)   # validation; ConfigError means nothing is written
    path = config_dir / f"v{n:04d}.proposed.json"
    with path.open("x", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, sort_keys=True)
        fh.write("\n")
    with (config_dir / f"v{n:04d}.proposed.reason.txt").open("x", encoding="utf-8") as fh:
        fh.write(reason.rstrip() + "\n")
    return path
