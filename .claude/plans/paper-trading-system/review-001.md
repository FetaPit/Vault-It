# Review 001: Paper-Trading System (phase 1)

VERDICT: ITERATE

Architecture follows the plan; guards, paper-only layers, kill-switch clear path and inbox size ban are sound. Priority 1 not met: the 3% per-trade and 3% daily caps can be exceeded by sizing, because (a) pending orders reserve no risk, and (b) market entries that fill away from the signal price are not re-checked. Local fixes, no replan. FIX-002 changes plan test B8 expected values (flag to user).

Tests: 268/268 passing. Money maths verified correct: fees/stamp, FX cost both legs, slippage (no double count), short P&L sign, dividend withholding and pool, DRIP, top-up from Feb 2027 with catch-up, forecast table, sweep rule `(price+shipping)*(1+VAT)*multiple`.

Missing coverage to add: two pending orders in same bar vs daily cap; market entry filling away from signal price; kill switch on while order pending; same-day rerun of dividend pay date; deposit on a day the daily cap is hit; NaN/Infinity/negative stop from inbox.

## Fix list (all paths under /home/user/Vault-It/trading/)

### FIX-001 [CRITICAL] Pending orders do not reserve daily-cap risk or notional
Files: models.py:172-180, broker.py (new methods), risk.py:170-171,191, backtest.py:82-88, daily.py:81-86
Issue: `size()` computes `remaining = cap - loss - sum(initial_risk(open_positions))` and `sleeve_open_notional` counts filled positions only. With 2+ Sleeve A symbols breaking out in the same bar each gets the full 18.75 budget (6% open risk vs 3% cap; cash-only notional can exceed 1x). Unfilled remainder of a partial fill is not reserved either.
Fix:
1. Add trailing defaulted fields to `AccountState`: `pending_risk_gbp: float = 0.0`, `pending_notional_gbp: float = 0.0`.
2. `PaperBroker.pending_risk_gbp(sleeve=None)`: sum over live orders of `st.risk_gbp * (o.quantity - st.filled_qty) / o.quantity`.
3. `PaperBroker.pending_notional_gbp(sleeve=None)`: sum of `(o.quantity - st.filled_qty) * o.entry_price * m * fxr`.
4. In `risk.size`: `remaining = daily_cap - daily_loss - open_risk - account.pending_risk_gbp`; for Sleeve A `max_notional = sleeve_equity*lev - sleeve_open_notional - account.pending_notional_gbp`.
5. In `Backtester._account` and `daily.py`, fill both fields from the broker (Sleeve A).
6. Tests: risk: base account with `pending_risk_gbp=18.75` gives sole reason `DAILY_LOSS_BUDGET_EXHAUSTED`. Backtest: config with TEST and TESTC both breaking out in the 14:45 bar; assert sum of approved `decision.risk_gbp` <= 18.75 + 1e-9.

### FIX-002 [CRITICAL] Entry fills away from the signal price exceed planned risk
File: broker.py:165-178 (step 2) and `_apply_entry`
Issue: Sizing assumes fill at `entry +/- (hs+slip)`. A MARKET order fills at the next bar open and partial extensions at later opens, so stop distance can grow with no re-check. Example: entry 100, stop 95, qty 3.75, next open 105 -> loss at stop ~37.5 (2x cap) with no gap through the stop. Plan's own B8 case (2.0 @100 + 1.75 @101) gives 20.5 > 18.75.
Fix:
1. Add `risk_used: float = 0.0` to `_OrderState`.
2. In step 2, after the entry-past-stop check: `c = 2*(hs+slip)`; `d_plan = abs(o.entry_price - o.stop_price)`; `d_act = max(0.0, abs(fill_px - o.stop_price) - (hs+slip))`; `budget_units = o.quantity * (d_plan + c)`; `max_by_risk = floor_to_step((budget_units - st.risk_used) / (d_act + c), inst.size_step)` (0 if numerator <= 0).
3. `fill_qty = min(remaining, cap, max_by_risk)`.
4. If `max_by_risk < min(remaining, inst.min_size) - EPS`: set order CANCELLED (position kept if `st.filled_qty > 0`), no fill; `continue`.
5. After the fill add `fill_qty * (d_act + c)` to `st.risk_used`.
6. If `fill_qty < remaining - EPS` only because of `max_by_risk`, set order CANCELLED right after the fill (that fill's `is_partial` is True).
7. Tests: new test entry 100, stop 95, zero-cost, entry bar open 105 -> fill qty 1.87. Update B8 `test_partial_fill_vwap` (tests/test_broker.py:93-103): second fill 1.45 (8.75/6 floored to 0.01), VWAP (200 + 146.45)/3.45 ~ 100.420290, final status CANCELLED. BT1/BT2 should not change; re-run to confirm. Update docs/architecture.md:90-92: entry drift is capped at fill time; only gaps through the stop can exceed the budget.

### FIX-003 [HIGH] Pending entries can fill after kill switch is on
File: backtest.py:106-107
Issue: `b.on_bar(bar)` runs before the kill-switch check, so a kill switch created between bars still lets a pending entry fill (new buy).
Fix: before `b.on_bar(bar)`: `if self._ks.is_active(): b.cancel_all_pending(bar.ts, Sleeve.A)`. Test: submit order, activate memory kill switch, feed next bar -> no entry fill, order CANCELLED.

### FIX-004 [HIGH] Same-day rerun double-credits dividend and re-snapshots entitlement
File: sleeve_b/manager.py:56-69
Fix: Step 1: `if (e.symbol, d) not in self._entitlements: self._entitlements[(e.symbol, d)] = ...`. Step 2: add `self._paid: set[tuple[str, date, date]]` in `__init__`; skip if `(sym, d, e.ref_date)` in `_paid`, else add after crediting. Test: run `daily_step` twice on the pay date -> second report has no `dividend_credit`, `pf.cash_gbp` unchanged. Remove the "callers must run each date once" caveat from the impl notes.

### FIX-005 [MEDIUM] Top-ups hide the day's losses from the daily cap
File: daily.py:81-86
Fix: `deposits_today = sum(c.amount_gbp for c in credits)`; pass `day_start_equity_gbp=day_start_equity_gbp + deposits_today` in AccountState. Test: day_start 625, Sleeve A loss 18.75, top-up day -> buy signal rejected with `DAILY_LOSS_CAP_HIT`.

### FIX-006 [MEDIUM] Drawdown kill never checked at daily close
File: daily.py:68 (before step 2)
Fix, after top-ups and before `daily_step`:
```python
pre = broker.equity_gbp(sleeve_a_marks) + pf.equity(prices_gbp)
ctx.risk.update_drawdown(pre, max(peak_equity_gbp, pre), now)
```
Test: peak 1000, fund 840 -> kill active, no `drip_buy`, no buy signals. Update docs/architecture.md:96 if needed.

### FIX-007 [MEDIUM] Non-finite or negative prices pass validation and crash the loop
Files: signal_inbox.py:24-25, risk.py:96-108
Fix: `_is_num`: `isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v)`. In `evaluate`: add `INVALID_ENTRY_PRICE` if `not math.isfinite(signal.entry) or signal.entry <= 0`. In the stop branch: if `not math.isfinite(stop) or stop <= 0`, append `STOP_WRONG_SIDE` and skip other stop checks. Tests: inbox `{"entry": NaN}` -> `INVALID_VALUE:entry`; risk long stop -1 -> `STOP_WRONG_SIDE`.

### FIX-008 [LOW] Sweep multiple can go below the 2x rule
File: config.py:471
Fix: `_check(sw.multiple >= 2.0, "sweep.multiple", "must be >= 2.0")`. Config test: 1.5 raises ConfigError.

### FIX-009 [LOW] Proposals can change cost inputs used in sizing
File: review.py:37
Fix: add `"fees."`, `"instruments."`, `"fx."`, `"sweep.multiple"` to `FORBIDDEN_PROPOSAL_PREFIXES`. Add RV6-style test for `fees.zero.slippage`.

### FIX-010 [LOW] Dividend dedupe key can collide
File: daily.py:72
Fix: `dedupe_key=f"div:{a.symbol}:{d}:{a.note}"` (note holds `ref YYYY-MM-DD`).

### FIX-011 [LOW] Kill event not journaled when no exposure
File: backtest.py:114-122
Fix: per-day `ks_logged` flag; journal the `KILL_SWITCH` event once per day whether or not there was exposure. `halted` semantics unchanged.

### FIX-012 [LOW] Docs describe an inbox path that does not exist
File: docs/architecture.md:44-46
Fix: add: "Phase 1: `read_inbox` is not wired to any runner; any runner MUST pass each Signal through `RiskEngine.evaluate` before `submit_bracket`."

## PLAN_GAP / deviation resolutions
Accepted with no action: `SizingBreakdown.reject_reason`; B20 ordering; BT3 `halted` only when exposure existed (kill cannot be bypassed because `evaluate` vetoes first; FIX-011 only adds journaling); duplicate signal JournalError skipped in daily; fill timestamps, CLI `--config`, drawdown units, required keys, `pool_symbols`, killswitch status text.
Rejected: "callers run once" caveat (FIX-004).
Plan change: B8 expected values conflict with the "never exceed 3%" rule; safety wins (FIX-002 updates B8). Flag to user.

Docs: feasibility.md has every section and [VERIFY] tags; forecast table matches code. architecture.md needs FIX-002 (90-92), FIX-006 (96), FIX-012 (44-46).
