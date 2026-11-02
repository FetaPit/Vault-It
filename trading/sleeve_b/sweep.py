"""Gold/silver sweep recommender. Recommends only; never buys anything."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Sequence

from trading.config import CoinSpec, TradingConfig
from trading.journal import TradeJournal
from trading.mathutil import EPS
from trading.sleeve_b.portfolio import DividendPortfolio


@dataclass(frozen=True, slots=True)
class SweepRecommendation:
    coin_name: str
    metal: str
    all_in_cost_gbp: float
    threshold_gbp: float
    eligible_profit_gbp: float
    price_as_of: date
    price_stale: bool
    action: str = "RECOMMEND_ONLY_MANUAL_PURCHASE"


def coin_all_in_cost(coin: CoinSpec) -> float:
    return (coin.price_gbp + coin.shipping_gbp) * (1 + coin.vat_rate)


def sweep_threshold(coin: CoinSpec, multiple: float) -> float:
    return multiple * coin_all_in_cost(coin)


def eligible_profit(fund_equity_gbp: float, total_contributions_gbp: float,
                    total_sweep_withdrawals_gbp: float, consumed_thresholds_gbp: float) -> float:
    return fund_equity_gbp + total_sweep_withdrawals_gbp - total_contributions_gbp - consumed_thresholds_gbp


def select_sweep(eligible_gbp: float, coins: Sequence[CoinSpec], multiple: float, today: date,
                 stale_days: int) -> SweepRecommendation | None:
    if eligible_gbp <= 0:
        return None
    best: CoinSpec | None = None
    for c in coins:
        if sweep_threshold(c, multiple) <= eligible_gbp + EPS:
            if best is None or coin_all_in_cost(c) > coin_all_in_cost(best):
                best = c
    if best is None:
        return None
    return SweepRecommendation(best.name, best.metal, coin_all_in_cost(best), sweep_threshold(best, multiple),
                               eligible_gbp, best.price_as_of, (today - best.price_as_of).days > stale_days)


class SweepTracker:
    def __init__(self, cfg: TradingConfig, journal: TradeJournal) -> None:
        self._cfg = cfg
        self._journal = journal

    def evaluate(self, today: date, fund_equity_gbp: float, ts: datetime) -> SweepRecommendation | None:
        """Record a recommendation if eligible. NEVER calls any purchase."""
        j = self._journal
        if j.open_sweep_recommendation_id() is not None:
            return None
        contributions = j.sum_cash_flows("initial") + j.sum_cash_flows("topup")
        withdrawals = -j.sum_cash_flows("sweep_withdrawal")
        consumed = j.sum_acknowledged_sweep_thresholds()
        elig = eligible_profit(fund_equity_gbp, contributions, withdrawals, consumed)
        rec = select_sweep(elig, self._cfg.sweep.coins, self._cfg.sweep.multiple, today,
                           self._cfg.sweep.stale_price_days)
        if rec is not None:
            j.record_sweep_recommendation(ts, rec)
        return rec

    def acknowledge(self, rec_id: int, actual_cost_gbp: float, ts: datetime,
                    portfolio: DividendPortfolio) -> None:
        """Human confirms a manual purchase: withdraw cash first, then mark the recommendation."""
        portfolio.withdraw(actual_cost_gbp)
        self._journal.acknowledge_sweep(rec_id, actual_cost_gbp, ts)
        self._journal.record_cash_flow(ts, "sweep_withdrawal", -actual_cost_gbp,
                                       dedupe_key=f"sweep:{rec_id}")
