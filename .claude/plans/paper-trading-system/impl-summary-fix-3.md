# Implementation Summary: fix round 3 (review-003)

Final: 325 tests, 325 passing, 0 failing (322 before, +3 new). Stdlib only, nothing committed.

## Per-fix status
- FIX-201 DONE. trading/broker.py: added `_consumed_gbp`; used at `pos.initial_risk_gbp` and in `pending_risk_gbp`. Test `test_partial_then_cancel_keeps_fixed_commission_risk` (test_broker.py), as specified. Fails pre-fix (verified by reverting the two uses: 1.8628 < 3.648), passes after.
- FIX-202 DONE. trading/cli.py `_cmd_backtest`: refuses the paper journal path with ValueError (exit 2). Test `test_backtest_refuses_paper_journal` (test_cli.py): asserts exit 2, message, and that the journal file is never created. Verified failing pre-fix via git stash.
- FIX-203 DONE. trading/daily.py: guard `now (UTC date) != d` raises ValueError; `deposits_today` now uses now's UTC date; added `timezone` import. Test `test_now_must_fall_on_d` (test_daily.py). Fails pre-fix (no raise), verified via git stash.

## Deviations / notes
- FIX-202: check placed at the very top of `_cmd_backtest` (spec: before opening journal) so it fires before the bars CSV is read; same effect, test needs no real CSV.
- FIX-203: both the guard and the date change were applied (existing tests all satisfy the guard). With the guard in place the `deposits_today` change is behaviourally identical, so no separate test can fail on it alone; it is defensive.
- No existing tests changed. No 3% caps or tolerances touched. No PLAN_GAP.
- Oddity for reviewer: `git diff`/`git status` does not list trading/broker.py as modified although it contains the FIX-201 edit (tracked file, flag "H"; likely earlier fix-round edits to it are already in HEAD, or the diff is hidden by local git state). Verify with `grep -n _consumed_gbp trading/broker.py`.
