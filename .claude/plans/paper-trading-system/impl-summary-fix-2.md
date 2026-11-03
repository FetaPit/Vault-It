# Implementation Summary: fix round 2 (review-002, FIX-101 to FIX-104)

Final: `python3 -m unittest discover -s trading/tests` -> 322 tests, all passing (run after each fix; includes the other coder's evaluation/pledge tests at the time of the run).

## Per-fix status
| Fix | Status | Files |
|-----|--------|-------|
| FIX-101 | Done | trading/broker.py (`budget_units`, `_consumed_frac`, risk_used before `_apply_entry`, `initial_risk_gbp`, `pending_risk_gbp`); tests/test_broker.py |
| FIX-102 | Done | trading/broker.py (`extra` commission reserved for fills after the first); tests/test_broker.py |
| FIX-103 | Done | trading/journal.py (`cash_flow_total`), trading/models.py (`AccountState.deposits_today_gbp`), trading/daily.py, trading/risk.py (`daily_loss_gbp`); tests/test_daily.py |
| FIX-104 | Done | tests/test_risk.py |

Tests added or changed:
- test_broker: `test_entry_drift_capped_by_risk` and `test_partial_fill_vwap` assert initial_risk ~18.70 (places=6; the 10.0 check after the first fill is intact); new `test_drift_fill_leaves_no_budget_for_second_signal`, `test_partial_fill_commissions_reserved`.
- test_daily: `test_topup_does_not_hide_daily_loss` now uses a loss of 18.75; new `test_topup_loss_still_visible_on_rerun`.
- test_risk: `test_pending_notional_equal_to_equity_blocks_cash_only`.

## PLAN_GAP items
| Location | Gap | Default Used |
|----------|-----|-------------|
| test_broker `test_drift_fill_leaves_no_budget_for_second_signal` | The review expects DAILY_LOSS_BUDGET_EXHAUSTED, but the real remaining budget is 18.75-18.70 = 0.05 (> EPS), so sizing fails one step later | Asserts counted risk (open + pending) == 18.70 and the fresh TESTC signal is rejected with FEES_EXCEED_BUDGET. Signal symbol is TESTC (not TEST, which gives DUPLICATE_POSITION) with a session window |
| test_broker `test_partial_fill_commissions_reserved` | Spec's invariant (entry fills + commissions <= risk_gbp) is satisfied pre-fix when the order is submitted at the full 18.75 budget with no reserve for the exit commission | Order qty 3.35 (= sizing of (18.75-2)/5), and one exit commission (1.0) is added to the total, so the test fails without the fix. Second fill asserted at 1.15 |
| test_daily `test_topup_loss_still_visible_on_rerun` | A same-day rerun skips already-journaled signals, so rerunning with the same prices yields no decisions to check | First run has no prices (top-up applied, no signals); the rerun supplies DIVA prices so the signal is new while the deposit is deduped. Loss 19.0 as in the spec |

## Deviations from plan
None beyond the above. No cap or tolerance was loosened.

## Notes for Reviewer
- `models.py` was touched (additive field `deposits_today_gbp` on AccountState), as required by FIX-103. `daily.py` now passes `day_start_equity_gbp` unchanged, so the cap base is `day_start * pct` (18.75).
- Edits to journal.py were a single additive method (`cash_flow_total`); evaluation.py, pledge.py and their tests were not touched.
- Nothing committed or pushed.
