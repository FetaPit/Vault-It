"""SQLite trade journal (signals, decisions, orders, fills, trades, equity, cash flows)."""
from __future__ import annotations

import json
import sqlite3
from datetime import date, datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING, Any

from trading.config import TradingConfig, config_hash, config_to_dict
from trading.errors import JournalError
from trading.models import (ClosedTrade, ExitReason, Fill, OrderRequest, OrderStatus, RiskDecision,
                            Side, Signal, Sleeve)

if TYPE_CHECKING:  # pragma: no cover
    from trading.sleeve_b.sweep import SweepRecommendation

SCHEMA_SQL: str = """
CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS config_versions(version TEXT PRIMARY KEY, sha256 TEXT NOT NULL, json TEXT NOT NULL, loaded_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS signals(signal_id TEXT PRIMARY KEY, ts TEXT NOT NULL, symbol TEXT NOT NULL, side TEXT NOT NULL,
  entry_type TEXT NOT NULL, entry REAL NOT NULL, stop REAL, target REAL, sleeve TEXT NOT NULL, source TEXT NOT NULL,
  rationale TEXT NOT NULL, config_version TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS features(signal_id TEXT NOT NULL REFERENCES signals(signal_id), name TEXT NOT NULL, value REAL NOT NULL,
  PRIMARY KEY(signal_id, name));
CREATE TABLE IF NOT EXISTS decisions(decision_id INTEGER PRIMARY KEY AUTOINCREMENT, signal_id TEXT NOT NULL REFERENCES signals(signal_id),
  ts TEXT NOT NULL, approved INTEGER NOT NULL, reasons TEXT NOT NULL, quantity REAL NOT NULL, risk_gbp REAL NOT NULL, config_version TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS orders(order_id TEXT PRIMARY KEY, signal_id TEXT NOT NULL, ts TEXT NOT NULL, symbol TEXT NOT NULL, side TEXT NOT NULL,
  quantity REAL NOT NULL, entry_type TEXT NOT NULL, entry_price REAL NOT NULL, stop_price REAL NOT NULL, target_price REAL,
  status TEXT NOT NULL, sleeve TEXT NOT NULL, config_version TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS fills(fill_id TEXT PRIMARY KEY, order_id TEXT NOT NULL, ts TEXT NOT NULL, symbol TEXT NOT NULL, action TEXT NOT NULL,
  quantity REAL NOT NULL, price REAL NOT NULL, mid_price REAL NOT NULL, commission_gbp REAL NOT NULL, stamp_duty_gbp REAL NOT NULL,
  fx_cost_gbp REAL NOT NULL, spread_slippage_gbp REAL NOT NULL, is_partial INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS trades(trade_id TEXT PRIMARY KEY, position_id TEXT NOT NULL, symbol TEXT NOT NULL, side TEXT NOT NULL, sleeve TEXT NOT NULL,
  quantity REAL NOT NULL, entry_price REAL NOT NULL, exit_price REAL NOT NULL, opened_ts TEXT NOT NULL, closed_ts TEXT NOT NULL,
  gross_pnl_gbp REAL NOT NULL, fees_gbp REAL NOT NULL, net_pnl_gbp REAL NOT NULL, exit_reason TEXT NOT NULL, config_version TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS daily_equity(date TEXT PRIMARY KEY, start_equity REAL NOT NULL, end_equity REAL NOT NULL, realised_gbp REAL NOT NULL,
  unrealised_gbp REAL NOT NULL, deposits_gbp REAL NOT NULL, trades_count INTEGER NOT NULL, config_version TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS cash_flows(flow_id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL, kind TEXT NOT NULL, amount_gbp REAL NOT NULL,
  note TEXT NOT NULL, dedupe_key TEXT UNIQUE);
CREATE TABLE IF NOT EXISTS sweep_recommendations(rec_id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL, coin TEXT NOT NULL, metal TEXT NOT NULL,
  all_in_cost_gbp REAL NOT NULL, threshold_gbp REAL NOT NULL, eligible_profit_gbp REAL NOT NULL, price_stale INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('open','acknowledged')), actual_cost_gbp REAL, acknowledged_ts TEXT);
CREATE TABLE IF NOT EXISTS kill_switch_events(event_id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL, action TEXT NOT NULL, reason TEXT NOT NULL);
"""

_TABLES = frozenset({"meta", "config_versions", "signals", "features", "decisions", "orders", "fills",
                     "trades", "daily_equity", "cash_flows", "sweep_recommendations", "kill_switch_events"})
_CASH_KINDS = frozenset({"initial", "topup", "dividend", "sweep_withdrawal"})


def _ts(ts: datetime) -> str:
    if ts.tzinfo is None or ts.utcoffset() is None:
        raise ValueError("timestamp must be timezone-aware")
    return ts.astimezone(timezone.utc).isoformat()


def _parse(s: str) -> datetime:
    return datetime.fromisoformat(s)


class TradeJournal:
    def __init__(self, path: Path | str) -> None:
        if str(path) != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(str(path))
        self._conn.execute("PRAGMA foreign_keys=ON")
        self.init_schema()

    def init_schema(self) -> None:
        with self._conn:
            for stmt in SCHEMA_SQL.split(";"):
                if stmt.strip():
                    self._conn.execute(stmt)
            self._conn.execute("INSERT OR IGNORE INTO meta(key, value) VALUES('schema_version', '1')")

    def close(self) -> None:
        self._conn.close()

    def _write(self, sql: str, params: tuple[Any, ...] = ()) -> sqlite3.Cursor:
        try:
            with self._conn:
                return self._conn.execute(sql, params)
        except sqlite3.IntegrityError as e:
            raise JournalError(str(e)) from e

    # -- config
    def record_config(self, cfg: TradingConfig) -> None:
        h = config_hash(cfg)
        row = self._conn.execute("SELECT sha256 FROM config_versions WHERE version=?", (cfg.version,)).fetchone()
        if row is not None:
            if row[0] != h:
                raise JournalError("config version reused with different content")
            return
        self._write("INSERT INTO config_versions(version, sha256, json, loaded_at) VALUES(?,?,?,?)",
                    (cfg.version, h, json.dumps(config_to_dict(cfg), sort_keys=True),
                     datetime.now(timezone.utc).isoformat()))

    # -- signals / decisions / orders / fills / trades
    def record_signal(self, signal: Signal, config_version: str) -> None:
        try:
            with self._conn:
                self._conn.execute(
                    "INSERT INTO signals VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
                    (signal.signal_id, _ts(signal.ts), signal.symbol, signal.side.value,
                     signal.entry_type.value, signal.entry, signal.stop, signal.target,
                     signal.sleeve.value, signal.source, signal.rationale, config_version))
                for name, value in signal.features.items():
                    self._conn.execute("INSERT INTO features VALUES(?,?,?)", (signal.signal_id, name, float(value)))
        except sqlite3.IntegrityError as e:
            raise JournalError(str(e)) from e

    def record_decision(self, decision: RiskDecision, ts: datetime, config_version: str) -> int:
        cur = self._write(
            "INSERT INTO decisions(signal_id, ts, approved, reasons, quantity, risk_gbp, config_version) "
            "VALUES(?,?,?,?,?,?,?)",
            (decision.signal_id, _ts(ts), int(decision.approved), json.dumps(list(decision.reasons)),
             decision.quantity, decision.risk_gbp, config_version))
        return int(cur.lastrowid or 0)

    def record_order(self, order: OrderRequest, status: OrderStatus) -> None:
        self._write("INSERT INTO orders VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    (order.order_id, order.signal_id, _ts(order.ts), order.symbol, order.side.value,
                     order.quantity, order.entry_type.value, order.entry_price, order.stop_price,
                     order.target_price, status.value, order.sleeve.value, order.config_version))

    def update_order_status(self, order_id: str, status: OrderStatus) -> None:
        cur = self._write("UPDATE orders SET status=? WHERE order_id=?", (status.value, order_id))
        if cur.rowcount == 0:
            raise JournalError(f"unknown order {order_id}")

    def record_fill(self, fill: Fill) -> None:
        self._write("INSERT INTO fills VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    (fill.fill_id, fill.order_id, _ts(fill.ts), fill.symbol, fill.action, fill.quantity,
                     fill.price, fill.mid_price, fill.commission_gbp, fill.stamp_duty_gbp,
                     fill.fx_cost_gbp, fill.spread_slippage_gbp, int(fill.is_partial)))

    def record_trade(self, t: ClosedTrade) -> None:
        self._write("INSERT INTO trades VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    (t.trade_id, t.position_id, t.symbol, t.side.value, t.sleeve.value, t.quantity,
                     t.entry_price, t.exit_price, _ts(t.opened_ts), _ts(t.closed_ts), t.gross_pnl_gbp,
                     t.fees_gbp, t.net_pnl_gbp, t.exit_reason.value, t.config_version))

    def upsert_daily_equity(self, d: date, start_equity: float, end_equity: float, realised: float,
                            unrealised: float, deposits: float, trades_count: int, config_version: str) -> None:
        self._write("INSERT OR REPLACE INTO daily_equity VALUES(?,?,?,?,?,?,?,?)",
                    (d.isoformat(), start_equity, end_equity, realised, unrealised, deposits,
                     trades_count, config_version))

    # -- cash flows
    def record_cash_flow(self, ts: datetime, kind: str, amount_gbp: float, note: str = "",
                         dedupe_key: str | None = None) -> bool:
        if kind not in _CASH_KINDS:
            raise ValueError(f"bad cash flow kind {kind!r}")
        try:
            with self._conn:
                self._conn.execute(
                    "INSERT INTO cash_flows(ts, kind, amount_gbp, note, dedupe_key) VALUES(?,?,?,?,?)",
                    (_ts(ts), kind, amount_gbp, note, dedupe_key))
            return True
        except sqlite3.IntegrityError:
            return False

    def sum_cash_flows(self, kind: str) -> float:
        row = self._conn.execute("SELECT COALESCE(SUM(amount_gbp), 0.0) FROM cash_flows WHERE kind=?",
                                 (kind,)).fetchone()
        return float(row[0])

    def cash_flow_dedupe_keys(self, prefix: str) -> set[str]:
        rows = self._conn.execute("SELECT dedupe_key FROM cash_flows WHERE dedupe_key IS NOT NULL").fetchall()
        return {r[0] for r in rows if r[0].startswith(prefix)}

    # -- sweep
    def record_sweep_recommendation(self, ts: datetime, rec: "SweepRecommendation") -> int:
        cur = self._write(
            "INSERT INTO sweep_recommendations(ts, coin, metal, all_in_cost_gbp, threshold_gbp, "
            "eligible_profit_gbp, price_stale, status) VALUES(?,?,?,?,?,?,?, 'open')",
            (_ts(ts), rec.coin_name, rec.metal, rec.all_in_cost_gbp, rec.threshold_gbp,
             rec.eligible_profit_gbp, int(rec.price_stale)))
        return int(cur.lastrowid or 0)

    def open_sweep_recommendation_id(self) -> int | None:
        row = self._conn.execute(
            "SELECT rec_id FROM sweep_recommendations WHERE status='open' ORDER BY rec_id LIMIT 1").fetchone()
        return None if row is None else int(row[0])

    def acknowledge_sweep(self, rec_id: int, actual_cost_gbp: float, ts: datetime) -> None:
        cur = self._write(
            "UPDATE sweep_recommendations SET status='acknowledged', actual_cost_gbp=?, acknowledged_ts=? "
            "WHERE rec_id=? AND status='open'", (actual_cost_gbp, _ts(ts), rec_id))
        if cur.rowcount == 0:
            raise JournalError(f"sweep recommendation {rec_id} unknown or already acknowledged")

    def sum_acknowledged_sweep_thresholds(self) -> float:
        row = self._conn.execute("SELECT COALESCE(SUM(threshold_gbp), 0.0) FROM sweep_recommendations "
                                 "WHERE status='acknowledged'").fetchone()
        return float(row[0])

    def record_kill_event(self, ts: datetime, action: str, reason: str) -> None:
        self._write("INSERT INTO kill_switch_events(ts, action, reason) VALUES(?,?,?)", (_ts(ts), action, reason))

    # -- queries
    def trades_between(self, start: datetime, end: datetime) -> list[ClosedTrade]:
        rows = self._conn.execute(
            "SELECT trade_id, position_id, symbol, side, sleeve, quantity, entry_price, exit_price, opened_ts, "
            "closed_ts, gross_pnl_gbp, fees_gbp, net_pnl_gbp, exit_reason, config_version FROM trades "
            "WHERE closed_ts >= ? AND closed_ts < ? ORDER BY closed_ts, trade_id", (_ts(start), _ts(end))).fetchall()
        return [ClosedTrade(r[0], r[1], r[2], Side(r[3]), Sleeve(r[4]), r[5], r[6], r[7], _parse(r[8]),
                            _parse(r[9]), r[10], r[11], r[12], ExitReason(r[13]), r[14]) for r in rows]

    def count(self, table: str) -> int:
        if table not in _TABLES:
            raise ValueError(f"unknown table {table!r}")
        return int(self._conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0])  # noqa: S608 (whitelisted)

    def decisions_for(self, signal_id: str) -> list[tuple[bool, tuple[str, ...]]]:
        rows = self._conn.execute("SELECT approved, reasons FROM decisions WHERE signal_id=? ORDER BY decision_id",
                                  (signal_id,)).fetchall()
        return [(bool(r[0]), tuple(json.loads(r[1]))) for r in rows]

    def daily_equity_rows(self) -> list[tuple[str, float, float]]:
        return [(r[0], r[1], r[2]) for r in self._conn.execute(
            "SELECT date, start_equity, end_equity FROM daily_equity ORDER BY date").fetchall()]
