# Implementation Summary

PLAN_GAP-1 check passed (zoneinfo `America/New_York` works with the system tz database). Nothing installed. Stdlib only. All code is under `/home/user/Vault-It/trading/`. Nothing committed or pushed by me.

## Test Results
Command: `python3 -m unittest discover -s trading/tests -v` (from repo root)
- Total: 268 tests (25 test files)
- Passing: 268
- Failing: 0 (0 errors, no ResourceWarnings)
- `python3 -m trading.cli forecast` prints the table (`£625: 12.0y 9.3y 8.3y 7.3y`); `--config nope` exits 2.

## Files Created (line counts)
Production: `__init__.py` 3, `errors.py` 50, `mathutil.py` 23, `models.py` 190, `config.py` 524, `config/v0001.json` 43, `session.py` 62, `fx.py` 33, `fees.py` 52, `marketdata.py` 77, `killswitch.py` 48, `guards.py` 14, `risk.py` 205, `broker.py` 301, `journal.py` 223, `backtest.py` 150, `signal_inbox.py` 100, `topup.py` 60, `forecast.py` 49, `review.py` 110, `daily.py` 105, `cli.py` 106, `strategies/__init__.py` 0, `strategies/base.py` 33, `strategies/orb.py` 82, `sleeve_b/__init__.py` 0, `events.py` 100, `portfolio.py` 124, `tranches.py` 35, `sweep.py` 80, `manager.py` 154, `.gitignore`, `README.md` 22, `docs/feasibility.md` 117, `docs/architecture.md` 138.

Tests (`trading/tests/`): `helpers.py` 72, test_mathutil 29, test_models 32, test_config 133, test_session 59, test_fx 27, test_fees 43, test_marketdata 90, test_killswitch 54, test_guards 67, test_risk 203, test_broker 236, test_journal 97, test_orb 96, test_backtest 101, test_signal_inbox 117, test_events 67, test_portfolio 81, test_tranches 46, test_sweep 77, test_sleeve_b_manager 126, test_topup 48, test_forecast 43, test_review 99, test_daily 76, test_cli 84.

## Files Modified
None outside `trading/`. (`git status` shows only `trading/` paths.)

## PLAN_GAP Items
| Location | Gap | Default Used |
|----------|-----|-------------|
| `risk.py` SizingBreakdown | Plan gives `size()` no way to return a rejection reason | Added trailing field `reject_reason: str \| None = None`; `evaluate` turns it into the single reason |
| `broker.py` on_bar step 2 vs test B20 | Spec order (entries before exits) would fill the partial remainder before the stop check, contradicting B20 (exit 2.0 only) | If an existing position's stop is hit in the bar, the remaining entry is cancelled and no extension fill happens; the exit is handled in step 3 |
| `backtest.py` run_day step 4c/d vs BT3 | "halted" after a kill-switch flatten would stop all signals, but BT3 expects n_signals 1 / n_rejected 1 | `halted` is set only if there was actual exposure (open position or pending order) to flatten; otherwise signals still reach the risk engine, which vetoes and journals them |
| `daily.py` | Rerunning a day re-emits the same `sleeveb-SYM-YYYYMMDD` signal id, which would raise JournalError | Duplicate-signal JournalError is caught and that signal skipped (keeps DY2 idempotent) |
| `broker.py` timestamps | Fill/closed_ts not specified | Entry fills use `bar.ts`; stop/target exits use `bar.end_ts`; flatten uses the caller's ts |
| `cli.py` | `--config` placement and CL3 config | `--config` accepted before or after the subcommand; CL3 test passes a temp config built from `make_cfg()` (default config only knows SPY) |
| `cli.py` | `max_drawdown_pct` units | BacktestResult holds a fraction; CLI prints it x100 with 2 decimals |
| `config.py` | Which top-level keys are required | Required: schema_version, version, mode, base_currency, starting_capital_gbp, fees, instruments, fx; other sections default |
| `sleeve_b/portfolio.py` | DRIP needs to list symbols with a pool | Added helper `pool_symbols()` |
| `cli.py` killswitch status | File stores `<ts> <reason>` | Status prints the text after the timestamp (`ACTIVE: x`) |

## Deviations from Plan
| What | Why | Impact |
|------|-----|--------|
| Extra tests beyond the listed IDs (stop/limit entries, inbox invalid values / no-move, clear() only-in-CLI AST check, short Sleeve B, daily buy-signal flow, etc.) | Coverage of branches | More tests only |
| Plan file path `.claude/plans/...` untouched | n/a | n/a |

Remaining open PLAN_GAPs from the plan itself (user decisions, not code): GAP-2 live broker choice, GAP-3 ISA wrapper, GAP-4 `SPY` placeholder instrument, GAP-5 placeholder coin prices/FX/fees (dated 2026-11-02), GAP-6 intraday data source (CSV only).

## Notes for Reviewer
- Git history on this branch already had environment-made "WIP: trading skeleton" commits touching only `trading/`; I did not commit.
- DRIP and Sleeve B use GBP-only instruments with multiplier 1 in practice; `portfolio.buy` is given price/fees directly.
- `killswitch.clear()` is called only from `cli.py` (asserted by `test_clear_only_called_from_cli`). No network imports and no `Live*` class/file (AST test).
- Key numeric checks reproduced: R1-R36 sizing values, BT1 (qty 3.07, net 15.043, equity 327.543), forecast 12 months/years figures.
