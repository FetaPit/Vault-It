"""Monthly top-up scheduler (pure date logic; idempotency lives in the journal)."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Collection

from trading.config import TradingConfig, parse_year_month


@dataclass(frozen=True, slots=True)
class TopUpCredit:
    due_date: date
    amount_gbp: float
    sleeve_a_gbp: float
    sleeve_b_gbp: float


class TopUpScheduler:
    def __init__(self, amount_gbp: float, start_month: date, day_of_month: int, split_a: float) -> None:
        if amount_gbp <= 0:
            raise ValueError("amount must be > 0")
        if not 1 <= day_of_month <= 28:
            raise ValueError("day_of_month must be in 1..28")
        if not 0.0 <= split_a <= 1.0:
            raise ValueError("split_a must be in [0, 1]")
        if start_month.day != 1:
            raise ValueError("start_month must be the first of a month")
        self.amount_gbp = amount_gbp
        self.start_month = start_month
        self.day_of_month = day_of_month
        self.split_a = split_a

    @classmethod
    def from_config(cls, cfg: TradingConfig) -> "TopUpScheduler":
        return cls(cfg.topup.amount_gbp, parse_year_month(cfg.topup.start_month),
                   cfg.topup.day_of_month, cfg.sleeve_a.allocation_pct)

    def due_dates(self, start: date, end: date) -> list[date]:
        out: list[date] = []
        y, m = self.start_month.year, self.start_month.month
        while True:
            d = date(y, m, self.day_of_month)
            if d > end:
                break
            if d >= start:
                out.append(d)
            m += 1
            if m > 12:
                y, m = y + 1, 1
        return out

    def credit_for(self, due: date) -> TopUpCredit:
        a = round(self.amount_gbp * self.split_a, 2)
        b = round(self.amount_gbp - a, 2)
        return TopUpCredit(due, self.amount_gbp, a, b)

    def pending(self, already_applied: Collection[date], today: date) -> list[TopUpCredit]:
        return [self.credit_for(d) for d in self.due_dates(self.start_month, today)
                if d not in already_applied]
