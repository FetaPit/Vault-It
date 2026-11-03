"""Pledge ledger: set aside pledge_rate_pct of EARNINGS. Ledger/recommendation only.

No purchase, no network, no order path. It never changes position sizing or risk equity.

Earnings = realised net P&L on closed trades (already net of fees, stamp duty, FX and slippage)
plus dividends credited (net of withholding). Deposits/top-ups/initial capital/sweep flows and
unrealised P&L are excluded.

DEFAULT CHOICE (owner can change): accrual is on earnings ABOVE the running high-water mark (HWM)
of cumulative realised earnings, so losses must be recovered before anything more is accrued.
The HWM starts at 0. Day-by-day: cum += earnings; if cum > hwm: accrual = (cum - hwm) * rate; hwm = cum.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from trading.config import PledgeConfig
from trading.journal import TradeJournal


@dataclass(frozen=True, slots=True)
class PledgeStep:
    day: str
    earnings_gbp: float
    accrual_gbp: float
    cumulative_accrued_gbp: float
    hwm_gbp: float


def accrue_step(cum_earnings_before: float, hwm: float, cum_accrued: float, day_earnings: float,
                rate_pct: float) -> tuple[float, float, float, float]:
    """Pure step. Returns (accrual, new_cum_accrued, new_hwm, new_cum_earnings)."""
    cum = cum_earnings_before + day_earnings
    accrual = 0.0
    if cum > hwm:
        accrual = (cum - hwm) * rate_pct / 100.0
        hwm = cum
    return accrual, cum_accrued + accrual, hwm, cum


def update_pledge(journal: TradeJournal, cfg: PledgeConfig, as_of: date) -> list[PledgeStep]:
    """Append ledger rows for each not-yet-recorded day with earnings, up to and including as_of.

    Idempotent: days already in the ledger are skipped (re-running changes nothing). Back-dated
    events landing on an already-recorded day are NOT re-processed (the ledger is append-only).
    Returns only the newly written steps. No-op if the pledge is disabled.
    """
    if not cfg.enabled:
        return []
    earnings = journal.daily_earnings()
    last = journal.pledge_last()
    hwm = last[4] if last else 0.0
    cum_accrued = last[3] if last else 0.0
    last_day = last[0] if last else ""
    cum_earn = 0.0
    out: list[PledgeStep] = []
    for day, e in earnings.items():
        if day > as_of.isoformat():
            break
        if day <= last_day:
            cum_earn += e  # already recorded: only rebuild cumulative earnings
            continue
        accrual, cum_accrued, hwm, cum_earn = accrue_step(cum_earn, hwm, cum_accrued, e, cfg.rate_pct)
        if journal.record_pledge_row(day, e, accrual, cum_accrued, hwm):
            out.append(PledgeStep(day, e, accrual, cum_accrued, hwm))
    return out


def pledge_status(journal: TradeJournal, cfg: PledgeConfig) -> str:
    last = journal.pledge_last()
    accrued = last[3] if last else 0.0
    hwm = last[4] if last else 0.0
    return "\n".join([
        "PLEDGE (ledger only: no purchase, no orders, no sizing/risk impact)",
        f"enabled: {cfg.enabled}",
        f"rate_pct: {cfg.rate_pct:g}",
        f"destination: {cfg.destination}",
        f"cumulative_accrued_gbp: {accrued:.2f}",
        f"high_water_mark_gbp: {hwm:.2f}",
        f"last_ledger_day: {last[0] if last else 'none'}",
        "note: accrued amount is set-aside cash until the owner verifies an eligible route [VERIFY]"
        if cfg.destination == "UNSET" else "note: destination set by owner; still a recommendation only",
    ])
