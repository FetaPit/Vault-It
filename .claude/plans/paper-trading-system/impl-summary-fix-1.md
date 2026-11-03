# Implementation Summary: fix round 1 (review-001 FIX-001..FIX-012)

## Test Results
- Total: 280 (was 268), passing 280, failing 0.
- Command: `python3 -m unittest discover -s trading/tests` from /home/user/Vault-It.
- New tests: 12 (FIX-001 x2, FIX-002 x1 plus B8 update, FIX-003 x1, FIX-004 x1, FIX-005 x1, FIX-006 x1, FIX-007 x3, FIX-008 x1, FIX-009 subtests added to test_forbidden_key, FIX-011 x1).

## Per-fix status
| Fix | Status | Files | Tests |
|-----|--------|-------|-------|
| 001 | Done | models.py, broker.py (pending_risk_gbp / pending_notional_gbp), risk.py, backtest.py, daily.py | test_risk `test_pending_risk_reserves_daily_budget`; test_backtest `test_two_symbols_same_bar_respect_daily_cap` |
| 002 | Done (see deviation on BT1/BT2) | broker.py, docs/architecture.md | test_broker `test_entry_drift_capped_by_risk` (qty 1.87); B8 `test_partial_fill_vwap` updated (1.45, VWAP (200+146.45)/3.45, CANCELLED) |
| 003 | Done | backtest.py | `test_kill_switch_between_bars_blocks_pending_fill` |
| 004 | Done | sleeve_b/manager.py | `test_same_day_rerun_no_double_credit` |
| 005 | Done | daily.py | `test_topup_does_not_hide_daily_loss` |
| 006 | Done | daily.py, docs/architecture.md | `test_drawdown_kill_at_close` |
| 007 | Done | signal_inbox.py, risk.py | `test_nonfinite_values_rejected`, `test_negative_or_nonfinite_stop_rejected`, `test_nonfinite_entry_rejected` |
| 008 | Done | config.py | `test_sweep_multiple_below_2_rejected` |
| 009 | Done | review.py | extra keys in `test_forbidden_key` (fees.zero.slippage etc.) |
| 010 | Done | daily.py | none specified |
| 011 | Done | backtest.py | `test_kill_event_journaled_once_without_exposure` |
| 012 | Done | docs/architecture.md | none |

## PLAN_GAP / Deviations
| Item | Detail |
|------|--------|
| FIX-002 "BT1/BT2 should not change" | They DO change (5 existing tests). Signal entry 101.5, stop 99, MARKET fill at next open 101.6, so qty 3.07 is reduced to 2.95 (3.07*2.5/2.6); risk at stop 7.67 <= 7.675 planned. Applied the fix as written (no cap relaxed) and updated the expected values: test_backtest target_trade (qty 2.95, pnl 14.455, final equity 326.955), time_flat (1.77), gap_loss (2.95 qty), result_stats (14.455), test_cli backtest (14.46). All hand-checked. Reviewer should confirm this is accepted; the review's expectation was wrong. |
| FIX-005 test numbers | Review says loss 18.75 with day_start 625. With the fix the day-start is 725 on the top-up day, so cap is 21.75; test uses a 22.0 Sleeve A loss. |
| FIX-006 test numbers | Fund 840 reached via +115 Sleeve A cash on top of the 725 post-top-up equity, peak 1000. |
| FIX-011 action label | Kill event is journaled with action "flatten" when exposure existed, "active" when none (journal action text not specified). |
| FIX-004 caveat removal | The "callers must run each date once" note lives in impl-summary.md (outside trading/), not edited per scope. This summary does not carry the caveat; remove it from impl-summary.md. |
| FIX-006/007, 008/009/010 | Ran the suite after groups 006+007 and 008, then 009+010, then 011+012 together (not strictly after each); all green. |

## Notes for Reviewer
- Git: a commit "WIP: fix round 1 progress" (0c6f0ac, plus 29a99af) appeared during my run and already contains part of my edits (broker.py, models.py etc.). I did not commit or push; presumably an automatic snapshot. Working tree has remaining uncommitted changes.
- 3% caps untouched; FIX-001 reservations and FIX-002 fill-time re-check only tighten sizing.
- `_OrderState.risk_used` accumulates `fill_qty * (d_act + c)`; fixed commission costs are not included in the re-check, matching the review formula.
