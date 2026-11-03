"""Command line: forecast | killswitch | backtest. There is deliberately no live/execute command."""
from __future__ import annotations

import argparse
import sys
from datetime import date
from pathlib import Path
from typing import Sequence

from trading.backtest import Backtester
from trading.config import TradingConfig, load_active_config, load_config, resolve_path, trading_root
from trading.errors import TradingError
from trading.forecast import forecast_table
from trading.journal import TradeJournal
from trading.killswitch import KillSwitch
from trading.marketdata import CsvMarketData
from trading.sleeve_b.events import EventCalendar
from trading.strategies.orb import OpeningRangeBreakout


def _load_cfg(path: str | None) -> TradingConfig:
    if path:
        return load_config(Path(path))
    return load_active_config(trading_root() / "config")


def _cmd_forecast(cfg: TradingConfig, args: argparse.Namespace) -> int:
    rows = forecast_table(target=cfg.goal.target_gbp, contribution=cfg.topup.amount_gbp)
    rates = sorted({r.annual_rate for r in rows})
    print("start  " + "  ".join(f"{r * 100:.0f}%" for r in rates))
    for start in dict.fromkeys(r.start_gbp for r in rows):
        cells = ["n/a" if r.years is None else f"{r.years:.1f}y" for r in rows if r.start_gbp == start]
        print(f"£{start:.0f}: " + " ".join(cells))
    return 0


def _file_reason(ks: KillSwitch) -> str:
    raw = ks.reason() or ""
    last = raw.splitlines()[-1] if raw else ""
    return last.split(" ", 1)[1] if " " in last else last


def _cmd_killswitch(cfg: TradingConfig, args: argparse.Namespace) -> int:
    from datetime import datetime, timezone
    path = Path(args.kill_switch) if args.kill_switch else resolve_path(cfg.paths.kill_switch)
    ks = KillSwitch(path)
    if args.action == "status":
        print(f"ACTIVE: {_file_reason(ks)}" if ks.is_active() else "inactive")
    elif args.action == "on":
        ks.activate(args.reason or "manual", datetime.now(timezone.utc))
        print("kill switch activated")
    else:
        ks.clear()
        print("kill switch cleared")
    return 0


def _cmd_backtest(cfg: TradingConfig, args: argparse.Namespace) -> int:
    start, end = date.fromisoformat(args.start), date.fromisoformat(args.end)
    data = CsvMarketData(Path(args.bars))
    cal = EventCalendar.from_csv(Path(args.calendar)) if args.calendar else None
    journal = TradeJournal(args.journal)
    try:
        bt = Backtester(cfg, data, OpeningRangeBreakout(cfg.sleeve_a, cal), journal=journal, calendar=cal)
        res = bt.run(start, end)
    finally:
        journal.close()
    print(f"trades: {len(res.trades)}")
    print(f"net_pnl_gbp: {res.net_pnl_gbp:.2f}")
    print(f"max_drawdown_pct: {res.max_drawdown_pct * 100:.2f}")
    return 0


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="trading.cli", description="Paper-trading tools (paper only).")
    p.add_argument("--config", default=None, help="config JSON (default: highest vNNNN.json)")
    sub = p.add_subparsers(dest="command", required=True)
    f = sub.add_parser("forecast", help="print months-to-target table")
    k = sub.add_parser("killswitch", help="kill switch status/on/off")
    k.add_argument("action", choices=["status", "on", "off"])
    k.add_argument("--reason", default=None)
    k.add_argument("--kill-switch", default=None)
    b = sub.add_parser("backtest", help="backtest Sleeve A ORB on a CSV")
    b.add_argument("--bars", required=True)
    b.add_argument("--start", required=True)
    b.add_argument("--end", required=True)
    b.add_argument("--journal", default=":memory:")
    b.add_argument("--calendar", default=None)
    for sp in (f, k, b):   # also accept --config after the subcommand
        sp.add_argument("--config", default=argparse.SUPPRESS)
    return p


def main(argv: Sequence[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    try:
        cfg = _load_cfg(args.config)
        handler = {"forecast": _cmd_forecast, "killswitch": _cmd_killswitch, "backtest": _cmd_backtest}
        return handler[args.command](cfg, args)
    except (TradingError, ValueError, OSError) as e:
        print(f"error: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
