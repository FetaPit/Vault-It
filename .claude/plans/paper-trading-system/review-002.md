# Review 002: fix round 1 re-review

VERDICT: ITERATE

All 12 fixes from review-001 are implemented as specified and each has a test that fails without it. The five changed backtest/CLI expectations are derived (floor(3.07*2.5/2.6)=2.95; 2.95*4.9=14.455; 2.95*0.6=1.77; final equity 326.955), not loosened. Accepted: BT1/BT2 do change (review-001 was wrong). No live/network path, no kill-switch bypass, no pending-risk leak across days.

New holes introduced/left by the fixes (paths under /home/user/Vault-It/trading/):

## FIX-101 [CRITICAL] broker.py:255 and broker.py:93-97: a reduced fill is counted at its planned share of risk, not its real risk
Problem: `pos.initial_risk_gbp = st.risk_gbp * pos.quantity / o.quantity` treats the fill as taken at the planned price. After the line-206 cancel (or expiry of a partial fill) pending risk drops to 0, so the position is counted at the smaller figure although nearly the whole budget is at risk. Example (`test_entry_drift_capped_by_risk`): fill 1.87 @105 really risks 18.70 but is counted as 18.75*1.87/3.75 = 9.35, so a second signal gets ~9.4 of budget; total risk ~28.1 (4.5%) > 3% daily cap. B8 has the same leak: counted 17.25, real 18.70.
Fix:
- Add `budget_units: float = 0.0` to `_OrderState`. In `submit_bracket` set it to `order.quantity * (abs(order.entry_price - order.stop_price) + 2*(profile.half_spread + profile.slippage))` with `profile = self._cfg.fee_profile_for(order.symbol)`.
- Add helper `_consumed_frac(st) = min(1.0, max(st.filled_qty / st.order.quantity, st.risk_used / st.budget_units if st.budget_units > 0 else 0.0))`.
- In `on_bar`, do `st.risk_used += fill_qty * (d_act + c)` BEFORE calling `_apply_entry` (move line 205 before line 204).
- In `_apply_entry` set `pos.initial_risk_gbp = st.risk_gbp * self._consumed_frac(st)`.
- In `pending_risk_gbp` sum `st.risk_gbp * (1 - self._consumed_frac(st))` over live orders.
Tests: in `test_entry_drift_capped_by_risk` assert `initial_risk_gbp` ~ 18.70 (places=6). In `test_partial_fill_vwap` assert ~ 18.70 after the second fill; the existing 10.0 check after the first fill must still pass. Add a test: after the drift fill is cancelled, `RiskEngine.evaluate` on a fresh signal with an AccountState built from that broker returns DAILY_LOSS_BUDGET_EXHAUSTED.

## FIX-102 [HIGH] broker.py:196: extra commission on each partial fill is never reserved
Problem: sizing (risk.py:180) reserves the fixed commission for one entry fill and one exit, but every partial fill pays `min_commission_gbp + commission_per_order_gbp` again (fees.py:28): 0.79/fill for SPY, 3.0 for uk_etf. N partial fills overshoot by (N-1)*min commission.
Fix: in step 2 compute `fx_m = inst.multiplier * fxr` (from `self._spec(o.symbol)`) and `extra = (profile.min_commission_gbp + profile.commission_per_order_gbp) / fx_m if st.n_fills >= 1 else 0.0`. Use `numerator = o.quantity*(d_plan + c) - st.risk_used - extra`. After the fill do `st.risk_used += extra` as well.
Test: fee profile with `min_commission_gbp=1.0` and zero spread, volume-capped first fill and an uncapped second bar; assert `sum(fill.qty*(fill_px-stop)) + total commissions <= risk_gbp + 1e-9`.

## FIX-103 [MEDIUM] daily.py:68,89: on a top-up day, a rerun hides the day's losses and the cap base is inflated
Problem (a): `deposits_today` counts only credits applied in this run; on a same-day rerun (supported since FIX-004) the deposit is deduped so deposits_today=0 while equity still includes the deposit, hiding up to 100 of loss. (b): `day_start + deposits` is also used as the cap base, lifting the cap from 18.75 to 21.75 (3.48% of real day-start equity).
Fix: add `TradeJournal.cash_flow_total(kind: str, d: date) -> float` returning SUM(amount_gbp) of cash flows of that kind whose UTC date of `ts` equals `d` (parse `ts` with `_parse(...).astimezone(timezone.utc).date()` as journal.py:288 does). In daily.py set `deposits_today = j.cash_flow_total("topup", d)`. Add `deposits_today_gbp: float = 0.0` to AccountState and pass it; leave `day_start_equity_gbp` unchanged. In risk.py:61-62 change `daily_loss_gbp` to `max(0, day_start + deposits_today_gbp - fund)`; `daily_cap_gbp` stays `day_start * pct`.
Tests: rerun `run_daily_close` on 2027-02-01 after `self.broker._cash -= 19.0`; the second run must still reject with DAILY_LOSS_CAP_HIT. Update `test_topup_does_not_hide_daily_loss` to use a loss of 18.75 (cap 18.75).

## FIX-104 [LOW] tests/test_risk.py: add test where `pending_notional_gbp` equals sleeve equity under cash_only; expect SIZE_BELOW_MINIMUM.
