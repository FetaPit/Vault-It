"""Daily close orchestration: top-ups, Sleeve B, buy signals, sweep recommendation, equity record."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Mapping

from trading.broker import PaperBroker
from trading.config import TradingConfig
from trading.errors import JournalError
from trading.fees import fill_costs, market_fill_price
from trading.fx import FxConverter
from trading.journal import TradeJournal
from trading.models import AccountState, RiskDecision, Sleeve
from trading.risk import RiskEngine
from trading.sleeve_b.manager import SleeveBManager, SleeveBReport
from trading.sleeve_b.portfolio import DividendPortfolio
from trading.sleeve_b.sweep import SweepRecommendation, SweepTracker
from trading.topup import TopUpCredit, TopUpScheduler


@dataclass(slots=True)
class DailyContext:
    cfg: TradingConfig
    journal: TradeJournal
    broker: PaperBroker
    portfolio: DividendPortfolio
    sleeve_b: SleeveBManager
    risk: RiskEngine
    topups: TopUpScheduler
    sweep: SweepTracker
    fx: FxConverter


@dataclass(frozen=True, slots=True)
class DailyCloseReport:
    d: date
    topups: tuple[TopUpCredit, ...]
    sleeve_b: SleeveBReport
    decisions: tuple[RiskDecision, ...]
    sweep: SweepRecommendation | None
    fund_equity_gbp: float


def ensure_initial_capital(ctx: DailyContext, ts: datetime) -> None:
    """Record the starting capital as a contribution (idempotent)."""
    ctx.journal.record_cash_flow(ts, "initial", ctx.cfg.starting_capital_gbp, dedupe_key="initial")


def run_daily_close(ctx: DailyContext, d: date, now: datetime, prices_gbp: Mapping[str, float],
                    sleeve_a_marks: Mapping[str, float], day_start_equity_gbp: float,
                    peak_equity_gbp: float, trades_today: int) -> DailyCloseReport:
    cfg, j, pf, broker = ctx.cfg, ctx.journal, ctx.portfolio, ctx.broker

    # 1. top-ups (journal dedupe makes reruns safe)
    applied = {date.fromisoformat(k[len("topup:"):]) for k in j.cash_flow_dedupe_keys("topup:")}
    credits: list[TopUpCredit] = []
    for credit in ctx.topups.pending(applied, d):
        key = f"topup:{credit.due_date.isoformat()}"
        if not j.record_cash_flow(now, "topup", credit.amount_gbp, dedupe_key=key):
            continue
        if credit.sleeve_a_gbp > 0:
            broker.deposit(credit.sleeve_a_gbp, now)
        if credit.sleeve_b_gbp > 0:
            pf.deposit(credit.sleeve_b_gbp)
        credits.append(credit)

    deposits_today = j.cash_flow_total("topup", d)   # all of today's top-ups (incl. earlier runs) must not mask losses

    # drawdown kill check at close (before Sleeve B can buy or DRIP)
    pre = broker.equity_gbp(sleeve_a_marks) + pf.equity(prices_gbp)
    ctx.risk.update_drawdown(pre, max(peak_equity_gbp, pre), now)

    # 2. Sleeve B daily step
    rep = ctx.sleeve_b.daily_step(d, prices_gbp, now)
    for a in rep.actions:
        if a.kind == "dividend_credit":
            j.record_cash_flow(now, "dividend", a.amount_gbp, note=a.symbol, dedupe_key=f"div:{a.symbol}:{d}:{a.note}")

    # 3. buy signals through the risk engine
    decisions: list[RiskDecision] = []
    for sig in rep.buy_signals:
        try:
            j.record_signal(sig, cfg.version)
        except JournalError:
            continue   # same signal id already journaled today (rerun): skip, stay idempotent
        acct = AccountState(
            fund_equity_gbp=broker.equity_gbp(sleeve_a_marks) + pf.equity(prices_gbp),
            day_start_equity_gbp=day_start_equity_gbp,
            deposits_today_gbp=deposits_today,
            peak_equity_gbp=peak_equity_gbp,
            trades_today=trades_today, open_positions=broker.open_positions(),
            sleeve_equity_gbp=pf.equity(prices_gbp), sleeve_open_notional_gbp=pf.market_value(prices_gbp),
            sleeve_cash_gbp=pf.cash_gbp,
            pending_risk_gbp=broker.pending_risk_gbp(Sleeve.A),
            pending_notional_gbp=broker.pending_notional_gbp(Sleeve.A))
        decision = ctx.risk.evaluate(sig, acct, now, None)
        j.record_decision(decision, now, cfg.version)
        decisions.append(decision)
        if decision.approved:
            inst, profile = cfg.instruments[sig.symbol], cfg.fee_profile_for(sig.symbol)
            fill = market_fill_price(prices_gbp[sig.symbol], "buy", profile)
            costs = fill_costs(inst, profile, ctx.fx, "buy", decision.quantity, fill, prices_gbp[sig.symbol])
            pf.buy(sig.symbol, decision.quantity, fill, costs.total_fees_gbp, sig.stop)
            trades_today += 1

    # 4-5. fund equity and sweep recommendation (recommendation only)
    fund = broker.equity_gbp(sleeve_a_marks) + pf.equity(prices_gbp)
    rec = ctx.sweep.evaluate(d, fund, now)

    # 6. equity record
    j.upsert_daily_equity(d, day_start_equity_gbp, fund, pf.realised_gbp,
                          pf.unrealised_gbp(prices_gbp) + broker.unrealised_gbp(sleeve_a_marks),
                          sum(c.amount_gbp for c in credits), trades_today, cfg.version)
    return DailyCloseReport(d, tuple(credits), rep, tuple(decisions), rec, fund)
