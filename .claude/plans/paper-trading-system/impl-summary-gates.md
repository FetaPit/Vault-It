# Implementation Summary: go-live gates + pledge

## Files Created
| File | Purpose |
|------|---------|
| trading/evaluation.py | 9 gates (PSR and DSR separate), stats helpers, EvalInputs, EvaluationReport (text/JSON), evaluate_go_live |
| trading/pledge.py | accrue_step, update_pledge (idempotent), pledge_status |
| trading/tests/test_evaluation.py | 21 tests |
| trading/tests/test_pledge.py | 17 tests (accrual, HWM, deposits, rate 0/100, idempotency, config, CLI, trials) |

## Files Modified (additive only)
| File | Change |
|------|--------|
| trading/config.py | PledgeConfig, TradingConfig.pledge (defaulted), validation 0..100, default block omitted from config_to_dict (hash of old configs unchanged) |
| trading/journal.py | tables trials, pledge_ledger; record_trial, trial_count, closed_trade_rows, llm_signal_blind_flags, daily_equity_full, pledge_* and daily_earnings |
| trading/cli.py | `evaluate`, `pledge status|update`; `backtest` now records a trial |
| trading/docs/architecture.md, feasibility.md | new section and checklist |

## Test Results
Total 318 (280 existing + 38 new), 318 passing, 0 failing.

## PLAN_GAP Items
| Location | Gap | Default Used |
|----------|-----|--------------|
| deflated_sharpe | cross-trial Sharpe variance not stored | null SR sampling variance 1/(n-1); optional override param |
| gate_walk_forward | no minimum fold count | >= 3 folds |
| blind_llm flag | where blind_tested lives | signal feature `blind_tested` = 1.0 (no schema change) |
| benchmark / folds source | no journal storage | CSV (date,return) and JSON files via CLI; absent => gate fails |
| daily returns | deposit treatment | (end - start - deposits)/start, assumes end_equity includes deposits |
| cost_stress | slippage not separate in trades table | cost = trades.fees_gbp, assumed to include spread/slippage |
| pledge enabled default | unspecified | true (harmless, ledger only) |
| dividends | withholding | cash_flows kind 'dividend' assumed already net of withholding |
| pledge back-dated events | append-only ledger | events on an already-recorded day are not re-processed |

## Deviations from Plan
- Class named EvaluationReport, not GoLiveReport: tests/test_guards forbids "Live" in class names. Function evaluate_go_live kept.
- Added `pledge update` (writes ledger rows) alongside `status`.

## Notes for Reviewer
- Untouched: risk.py, broker.py, backtest.py, daily.py, models.py, existing test expectations.
- Gate order in the report is fixed; blind_llm passes vacuously only when an empty list is supplied (None fails).
- Pledge touches no sizing/risk code; no network or order imports.
