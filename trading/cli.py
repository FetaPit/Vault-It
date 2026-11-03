"""Command line: forecast | killswitch | backtest | evaluate | pledge. There is deliberately no live/execute command."""
from __future__ import annotations

import argparse
import csv
import json
import sys
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Sequence

from trading.backtest import Backtester
from trading.config import TradingConfig, load_active_config, load_config, resolve_path, trading_root
from trading.errors import TradingError
from trading.evaluation import EvalInputs, FoldResult, LlmSignalRecord, evaluate_go_live
from trading.forecast import forecast_table
from trading.journal import TradeJournal
from trading.killswitch import KillSwitch
from trading.marketdata import CsvMarketData
from trading.pledge import pledge_status, update_pledge
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
        journal.record_trial(datetime.now(timezone.utc), cfg.version,
                             f"backtest {args.start}..{args.end} bars={args.bars}")
    finally:
        journal.close()
    print(f"trades: {len(res.trades)}")
    print(f"net_pnl_gbp: {res.net_pnl_gbp:.2f}")
    print(f"max_drawdown_pct: {res.max_drawdown_pct * 100:.2f}")
    return 0


def _open_existing_journal(cfg: TradingConfig, arg: str | None) -> TradeJournal:
    path = Path(arg) if arg else resolve_path(cfg.paths.journal)
    if not path.is_file():
        raise ValueError(f"journal not found: {path}")
    return TradeJournal(path)


def _load_benchmark(path: str | None, dates: list[str]) -> list[float] | None:
    """Benchmark daily returns aligned to the journal's equity dates; None if absent or any date missing."""
    if not path:
        return None
    with open(path, newline="", encoding="utf-8") as fh:
        by_date = {r["date"]: float(r["return"]) for r in csv.DictReader(fh)}
    if not dates or any(d not in by_date for d in dates):
        return None
    return [by_date[d] for d in dates]


def _load_folds(path: str | None) -> list[FoldResult] | None:
    if not path:
        return None
    with open(path, encoding="utf-8") as fh:
        raw = json.load(fh)
    return [FoldResult(float(f["is_sharpe"]), float(f["oos_sharpe"]), float(f["oos_net_pnl"])) for f in raw]


def _cmd_evaluate(cfg: TradingConfig, args: argparse.Namespace) -> int:
    j = _open_existing_journal(cfg, args.journal)
    try:
        trades = j.closed_trade_rows("A")
        eq = j.daily_equity_full()
        dates = [r[0] for r in eq]
        rets = [(r[2] - r[1] - r[3]) / r[1] for r in eq if r[1] > 0]  # assumes end_equity includes deposits
        if len(rets) != len(eq):
            rets = []  # zero/negative start equity: treat as missing data
        days = (date.fromisoformat(dates[-1]) - date.fromisoformat(dates[0])).days + 1 if dates else None
        inp = EvalInputs(
            net_pnls=[t[3] for t in trades], gross_pnls=[t[1] for t in trades], costs=[t[2] for t in trades],
            daily_returns=rets, benchmark_returns=_load_benchmark(args.benchmark_csv, dates),
            n_trials=j.trial_count(), folds=_load_folds(args.walkforward_json), paper_days=days,
            max_drawdown_limit=cfg.risk.max_drawdown_kill_pct,
            llm_signals=[LlmSignalRecord(sid, ok) for sid, ok in j.llm_signal_blind_flags()])
    finally:
        j.close()
    report = evaluate_go_live(inp)
    print(report.to_json() if args.json else report.to_text())
    return 0 if report.live else 1


def _cmd_pledge(cfg: TradingConfig, args: argparse.Namespace) -> int:
    j = _open_existing_journal(cfg, args.journal)
    try:
        if args.action == "update":
            update_pledge(j, cfg.pledge, date.today())
        print(pledge_status(j, cfg.pledge))
    finally:
        j.close()
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
    e = sub.add_parser("evaluate", help="go-live gates from the journal (exit 1 if any gate fails)")
    e.add_argument("--journal", default=None)
    e.add_argument("--benchmark-csv", default=None, help="CSV with date,return columns (daily)")
    e.add_argument("--walkforward-json", default=None, help="JSON list of {is_sharpe,oos_sharpe,oos_net_pnl}")
    e.add_argument("--json", action="store_true")
    pl = sub.add_parser("pledge", help="pledge ledger status/update (ledger only)")
    pl.add_argument("action", choices=["status", "update"])
    pl.add_argument("--journal", default=None)
    for sp in (f, k, b, e, pl):   # also accept --config after the subcommand
        sp.add_argument("--config", default=argparse.SUPPRESS)
    return p


def main(argv: Sequence[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    try:
        cfg = _load_cfg(args.config)
        handler = {"forecast": _cmd_forecast, "killswitch": _cmd_killswitch, "backtest": _cmd_backtest,
                   "evaluate": _cmd_evaluate, "pledge": _cmd_pledge}
        return handler[args.command](cfg, args)
    except (TradingError, ValueError, OSError) as e:
        print(f"error: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
