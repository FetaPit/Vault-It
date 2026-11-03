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
  Phase 1: `read_inbox` is not wired to any runner; any runner MUST pass each Signal through `RiskEngine.evaluate` before `submit_bracket`.

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

A file at `runtime/KILL_SWITCH` or an in-memory flag. Fail-closed: any `OSError` while checking counts as active. Auto-tripped at 15% drawdown from peak (checked on every bar in the backtester and at daily close, after top-ups and before Sleeve B actions). Effects: Sleeve A flattened, pending orders cancelled, all buys including DRIP blocked, exits (stops, targets, tranche sells) still allowed. Sleeve B holdings are frozen, not liquidated. Cleared only by a human via `python3 -m trading.cli killswitch off`; no engine code calls `clear()`.

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

## 10. Go-live evaluation gates and pledge ledger

### Go-live gates (`trading/evaluation.py`, CLI `evaluate`)

Pure, deterministic functions. Live is permitted only if ALL gates pass; missing or degenerate data makes a gate FAIL, never pass. `python -m trading.cli evaluate --journal J [--benchmark-csv F] [--walkforward-json F] [--json]` prints the report and exits 1 if any gate fails. It has no order path.

| Gate | Pass condition |
|---|---|
| min_sample | >= 100 closed Sleeve A trades and >= 60 calendar paper days |
| net_expectancy | mean net P&L/trade > 0 and the lower bound of the 90% CI > 0 (seeded bootstrap AND t-stat, both) |
| cost_stress | mean(gross - 2 x cost) per trade > 0 |
| benchmark | net return after costs beats the benchmark buy-and-hold on total return and Sharpe over the same days |
| probabilistic_sharpe | PSR(SR* = 0) >= 0.95 (skew and kurtosis from the data) |
| deflated_sharpe | DSR >= 0.95 using n_trials = rows in journal table `trials` |
| walk_forward | >= 70% of OOS folds net-positive and mean OOS Sharpe >= 50% of a positive mean IS Sharpe (>= 3 folds) |
| max_drawdown | compounded daily-return drawdown <= `risk.max_drawdown_kill_pct` |
| blind_llm | every `source='llm'` signal has feature `blind_tested = 1` (tickers anonymised, dates shifted); none present passes |

Trials: `TradeJournal.record_trial(ts, config_version, description)` writes the `trials` table; the CLI `backtest` command records one per run. Every backtest or config variant must be recorded, otherwise DSR is overstated. The cross-trial Sharpe variance is not stored, so DSR uses the null sampling variance 1/(n-1) (PLAN_GAP, see impl-summary-gates.md). Daily returns are `(end - start - deposits) / start` from `daily_equity` (assumes `end_equity` includes deposits). Benchmark returns and walk-forward folds are supplied as files; if absent those gates fail.

### Pledge ledger (`trading/pledge.py`, CLI `pledge status|update`)

Ledger and recommendation only: no purchase, no network, no order path, and it never changes sizing or risk equity. Config block `pledge: {enabled, rate_pct, destination}` (defaults true, 1.0, "UNSET"; `rate_pct` must be in [0, 100]). v0001.json loads unchanged; the default block is omitted from `config_to_dict`, so stored config hashes are unaffected and no new config file is required. Journal table `pledge_ledger(id, ts, earnings_gbp, accrual_gbp, cumulative_accrued_gbp, hwm_gbp)`, one row per day with earnings (`ts` unique, so re-running a day is a no-op).

- Earnings = realised net P&L on closed trades (net of fees, stamp duty, FX, slippage) + dividends credited (net of withholding). Deposits, top-ups, initial capital, sweep flows and unrealised P&L are excluded.
- DEFAULT CHOICE the owner can change: accrual only on earnings above the running high-water mark of cumulative realised earnings (HWM starts at 0), so losses are recovered first. Changing to accrue on every positive day means removing the HWM test in `accrue_step`.
- Anthropic is a private company with no public ticker. The destination therefore stays `UNSET` and the accrued amount is simply set-aside cash until the owner verifies an eligible route [VERIFY]. Nothing is bought.
