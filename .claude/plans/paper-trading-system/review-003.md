# Review 003: fix round 2 re-review

VERDICT: ITERATE

FIX-101..104 implemented as specified; each new test fails on old code (reasoned by hand). Coder's three deviations accepted (FEES_EXCEED_BUDGET assertion with 0.05 left; commission test qty 3.35 plus one exit commission; rerun test setup). Shorts, FX, partial-fill-then-stop, kill switch, no live/network path, pledge.py has no effect on sizing: all verified OK. evaluation.py fails closed on missing/degenerate data; empty llm_signals passing is acceptable (inbox forces source="llm").

Paths under /home/user/Vault-It/trading/.

## FIX-201 [HIGH] broker.py:73-76, :102, :270: fixed commissions counted pro rata though the first fill pays them in full
Issue: sizing (risk.py:180) puts the full fixed cost `2*(min_commission_gbp + commission_per_order_gbp)` into `risk_gbp`. The first fill pays the entry commission in full and the exit pays its own, but `initial_risk_gbp = risk_gbp * frac` spreads fixed cost pro rata. If the rest of the order is then cancelled (cancel() or the cancel at :213-214), pending risk drops to 0 and the open position is counted below its real worst-case loss; the gap is handed to the next signal. Example: TESTC qty 3.22, entry 100, stop 95, risk_gbp 18.744; first fill 0.32 @100.1 then cancel: counted 1.86, real stop-out loss 0.32*5.15+1+1 = 3.65. Leak per order up to the fixed cost (1.58 GBP SPY, 6 GBP uk_etf). Bites only with more than one Sleeve A symbol.
Fix:
1. Add `PaperBroker._consumed_gbp(self, st)`: `p = self._cfg.fee_profile_for(st.order.symbol)`; `fixed = 2*(p.min_commission_gbp + p.commission_per_order_gbp)`; if `st.n_fills == 0` return 0.0; else return `min(st.risk_gbp, fixed + max(0.0, st.risk_gbp - fixed) * self._consumed_frac(st))`.
2. broker.py:270: `pos.initial_risk_gbp = self._consumed_gbp(st)`.
3. broker.py:102: sum `st.risk_gbp - self._consumed_gbp(st)` over live orders.
Test (test_broker.py): TESTC qty 3.22, entry 100, stop 95, target None, risk 18.744; one bar v=3.2 (open 100, high 101, low 99) fills 0.32; then `b.cancel("o1", T0)`. Assert `open_positions()[0].initial_risk_gbp >= 0.32*5.15 + 2.0 - 1e-9` and `pending_risk_gbp() == 0`. Currently 1.863, so it fails before the fix. Existing tests must be unchanged (TEST uses the zero-fee profile; frac is 1 at the end of TESTMC).

## FIX-202 [MEDIUM] cli.py:66 and cli.py:109-121: `evaluate` counts backtest trades/days as paper results (fails open)
Issue: `backtest --journal <path>` writes Sleeve A trades and daily_equity rows into whatever journal it is given. If that is the paper journal (cfg.paths.journal), `evaluate` reads them via `closed_trade_rows("A")` and `daily_equity_full()`; paper_days becomes the backtest's calendar span, backtest rows overwrite real paper rows (INSERT OR REPLACE), and min_sample and the statistical gates can pass with no paper history.
Fix: in `_cmd_backtest`, before opening the journal:
```
if args.journal != ":memory:" and Path(args.journal).resolve() == resolve_path(cfg.paths.journal).resolve():
    raise ValueError("backtest must not write to the paper journal")
```
(`main` already turns ValueError into a non-zero exit.)
Test (test_cli.py): call `main(["backtest", "--journal", <cfg.paths.journal>, ...])`; assert non-zero exit and no `trades` rows written.

## FIX-203 [LOW] daily.py:68: today's top-ups found by UTC date of `now`, not by `d`
Issue: a close for date `d` run after midnight UTC records the deposit with ts=now (d+1); `cash_flow_total("topup", d)` returns 0 and up to 100 GBP of loss is hidden again.
Fix: daily.py:68 use `deposits_today = j.cash_flow_total("topup", now.astimezone(timezone.utc).date())`. Also add at the top of `run_daily_close`: `if now.astimezone(timezone.utc).date() != d: raise ValueError("run_daily_close: now must fall on d (UTC)")`. Keep only the check if existing tests require it.
