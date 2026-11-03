# Architecture: paper-trading system (phase 1)

Paper only. No live broker, no network, no credentials. Stdlib Python only.

## 1. Components

| Module | Role |
|---|---|
| `errors.py` | Exception hierarchy |
| `mathutil.py` | `floor_to_step`, `step_decimals` |
| `models.py` | Enums and dataclasses (Bar, Signal, OrderRequest, Fill, Position, ClosedTrade, AccountState, RiskDecision) |
| `config.py`, `config/vNNNN.json` | Strict, versioned, validated configuration |
| `session.py` | NY-open-based window, DST mismatch, trading days |
| `fx.py`, `fees.py` | Static FX, commission, stamp duty, fill prices, per-fill costs |
| `marketdata.py` | `MarketDataAdapter`, in-memory and CSV adapters |
| `killswitch.py` | File plus memory flag, fail-closed |
| `guards.py` | `assert_paper_mode`, forbidden imports |
| `risk.py` | `RiskEngine`: veto and sizing |
| `broker.py` | `PaperBroker`: bracket orders, partial fills, gaps |
| `journal.py` | SQLite `TradeJournal` |
| `backtest.py` | `Backtester` sharing the risk + broker path |
| `signal_inbox.py` | LLM JSON proposal reader/validator |
| `topup.py`, `forecast.py` | Monthly top-ups, time-to-target |
| `review.py` | Weekly stats, walk-forward splits, proposal writer |
| `daily.py` | Daily close orchestration |
| `cli.py` | `forecast`, `killswitch`, `backtest` |
| `strategies/base.py`, `strategies/orb.py` | Strategy ABC; Sleeve A opening-range breakout |
| `sleeve_b/events.py`, `portfolio.py`, `tranches.py`, `sweep.py`, `manager.py` | Event calendar, cash ledger, profit tranches, sweep recommender, daily step |

### Data flow

```
Sleeve A (backtest = paper path)
  CsvMarketData/InMemoryMarketData
    -> Backtester.run_day (bars merged by (ts, symbol), limited to session_window)
    -> PaperBroker.on_bar (entries, then exits)
    -> marks/equity -> RiskEngine.must_flatten_sleeve_a / update_drawdown
    -> OpeningRangeBreakout.on_bar -> Signal
    -> journal.record_signal -> RiskEngine.evaluate (veto + sizing) -> journal.record_decision
    -> (approved) PaperBroker.submit_bracket -> fills/trades journaled
    -> end of day: flatten, cancel, upsert_daily_equity

LLM path
  LLM writes runtime/inbox/*.json -> read_inbox (schema; size fields rejected)
    -> Signal(source="llm") -> the SAME RiskEngine.evaluate -> broker
  (the LLM never imports or calls the broker)

Daily close (17:00 London)
  run_daily_close -> TopUpScheduler.pending (journal dedupe) -> deposits (broker, portfolio)
    -> SleeveBManager.daily_step (ex-div snapshot -> dividend credit -> DRIP -> protective stops -> tranches -> buy signals)
    -> RiskEngine.evaluate for buy signals -> DividendPortfolio.buy
    -> fund equity -> SweepTracker.evaluate (recommendation only) -> upsert_daily_equity

Weekly
  weekly_review(journal) -> ReviewReport -> (human or LLM decides changes)
    -> write_proposal -> human renames -> load_active_config picks it up next run
```

State: broker positions/cash, portfolio holdings/cash, strategy day state and the kill-switch memory flag live in memory. The SQLite journal and kill-switch file are persistent. Config files are immutable once active. Phase 1 does not rebuild broker state from the journal (phase-2 item).

Error propagation: `ConfigError` is raised at load and the CLI exits 2. `MarketDataError`/`CalendarError` are raised at construction. The risk engine never raises for business rules (it returns a `RiskDecision`; only a naive `now` raises `ValueError`). `PaperBroker` raises `PaperOnlyViolation` or `OrderError` for programming errors. `JournalError` propagates and trading stops. Inbox errors become `InboxResult.error` plus a file in `rejected/`.

## 2. Golden rule

**Deterministic code executes; the LLM never places orders.** Enforcement points:

- The LLM's only write location is `runtime/inbox/` (and `runtime/reviews/` for notes).
- The inbox schema forbids size fields (`quantity`, `qty`, `size`, `stake`, `units`, `notional`) and unknown fields.
- Every signal passes `RiskEngine.evaluate` (veto) and is journaled with its reasons.
- No credentials exist in phase 1. No live broker class exists, and a test (`test_guards.py`) enforces this by AST scan.
- Proposals cannot touch `risk.*` or `mode`.

## 3. Risk engine

Reason codes (string values equal to their names): `KILL_SWITCH_ACTIVE, MODE_NOT_PAPER, UNKNOWN_INSTRUMENT, INVALID_ENTRY_PRICE, NO_STOP, STOP_ZERO, STOP_WRONG_SIDE, STOP_TOO_TIGHT, TARGET_WRONG_SIDE, STALE_SIGNAL, SIGNAL_FROM_FUTURE, NO_SESSION_WINDOW, OUTSIDE_SESSION_WINDOW, SHORT_NOT_ALLOWED, DUPLICATE_POSITION, MAX_TRADES_PER_DAY, DAILY_LOSS_CAP_HIT, DAILY_LOSS_BUDGET_EXHAUSTED, FEES_EXCEED_BUDGET, SIZE_BELOW_MINIMUM`.

Phase 1 collects **every** failing reason, in this order: kill switch; mode; unknown instrument; entry price; stop (missing / zero / wrong side / too tight); target side; stale or future signal; session window (Sleeve A: must be after the opening range and not after the entry cutoff); shorting (only `spread_bet`/`cfd`, never Sleeve B); duplicate position (same symbol and sleeve); max trades per day; daily loss cap.

Phase 2 (sizing) returns the first failure as a single reason:

- `per_trade_budget = fund_equity * max_risk_per_trade_pct`; `open_risk = sum(initial_risk of open positions)`
- `remaining = daily_cap - daily_loss - open_risk`; `budget = min(per_trade_budget, remaining)`; if `budget <= EPS`: `DAILY_LOSS_BUDGET_EXHAUSTED`
- `fixed = 2 * (min_commission + commission_per_order)`; if `budget - fixed <= EPS`: `FEES_EXCEED_BUDGET`
- `N_u = entry * multiplier * fx`; `stamp_u = N_u * stamp_rate` (long shares only)
- `per_unit_cost = 2*(half_spread+slippage)*m*fx + 2*(commission_per_unit + N_u*commission_pct) + (2*N_u*fx_conversion_pct if non-GBP) + stamp_u`
- `risk_per_unit = |entry - stop|*m*fx + per_unit_cost`
- `qty_by_risk = floor_to_step((budget - fixed)/risk_per_unit, size_step)`
- Notional cap: Sleeve B uses sleeve cash; Sleeve A uses `sleeve_equity * leverage - open_notional` (leverage 1.0 in cash-only mode). `qty_by_notional = floor_to_step((max_notional - fixed_buy)/unit_buy, size_step)`
- `quantity = min(qty_by_risk, qty_by_notional, max_size)`; if below `min_size`: `SIZE_BELOW_MINIMUM`
- `risk_gbp = quantity*risk_per_unit + fixed` (never above the budget)

Entry drift is capped at fill time: each entry fill is re-checked against the planned risk budget (`quantity*(|entry-stop|+costs)`) at the actual fill price, so a fill away from the signal price is reduced and the order remainder cancelled. Only gaps through the stop can exceed the budget. That is modelled, tested and counted toward the daily cap.

## 4. Kill switch

A file at `runtime/KILL_SWITCH` or an in-memory flag. Fail-closed: any `OSError` while checking counts as active. Auto-tripped at 15% drawdown from peak. Effects: Sleeve A flattened, pending orders cancelled, all buys including DRIP blocked, exits (stops, targets, tranche sells) still allowed. Sleeve B holdings are frozen, not liquidated. Cleared only by a human via `python3 -m trading.cli killswitch off`; no engine code calls `clear()`.

## 5. Paper-only guard (three layers)

1. `config.mode` must equal `"paper"` (`ConfigError` otherwise).
2. `PaperBroker.__init__` calls `assert_paper_mode()` (`PaperOnlyViolation`).
3. A unit test AST-scans every non-test `.py` under `trading/` for network imports and for any class whose name contains `Live`.

## 6. Learning loop

Every signal, feature, decision, order, fill, trade and daily equity row is journaled with `config_version`. There is **no daily retraining**.

- Saturday 09:00 London: `weekly_review` with a minimum of 30 trades (otherwise `INSUFFICIENT_SAMPLE` and no proposal).
- Walk-forward splits (train 60 / test 20 trading days suggested). A proposal is written only if out-of-sample improves.
- `write_proposal` writes `vNNNN.proposed.json` (plus a `.reason.txt`). A human reviews and renames it to activate. Old versions stay immutable.
- The LLM may write review notes, never configs directly.

## 7. Scheduling (Europe/London, normal weeks)

| Time | Job |
|---|---|
| 14:00 | Pre-flight: load active config, check kill switch, check data |
| 14:30 | NY open; opening range starts |
| 14:45 | Opening range ends |
| 16:00 | Entry cutoff |
| 16:30 | Sleeve A flat |
| 17:00 | Daily close job (Sleeve B on LSE closes, top-ups, sweep, equity) |
| Sat 09:00 | Weekly review |

The window is always computed from America/New_York 09:30 via `zoneinfo`. In **DST mismatch weeks** (US clocks change on the 2nd Sunday of March and the 1st Sunday of November; UK clocks change on the last Sunday of March and the last Sunday of October) the London-New York offset is 4 hours instead of 5, so the window runs **13:30-15:30 London**. Examples: 26-30 Oct 2026, 15-26 Mar 2027, 1-5 Nov 2027.

US holidays and early closes come from calendar data. Early closes (13:00 NY) do not affect the 09:30-11:30 window. The code exposes functions and a CLI only; there is no scheduling daemon (cron/systemd entries are the operator's job).

## 8. Failure modes

- Missing bars: no signal.
- Stale signal: rejected (`STALE_SIGNAL`).
- Exceptions in the loop: activate the kill switch (the phase-2 runner must wrap its loop accordingly).
- Journal failure: stop trading.

## 9. Phase-2 roadmap (not built)

A live adapter behind a separate review, a real data feed (PLAN_GAP-6), the ISA decision (PLAN_GAP-3), the broker choice (PLAN_GAP-2) and rebuilding broker state from the journal.
