"""Sleeve B cash-ledger portfolio (buys debit cash, sells credit it)."""
from __future__ import annotations

import copy
from dataclasses import dataclass, field
from typing import Mapping

from trading.errors import InsufficientCashError
from trading.mathutil import EPS


@dataclass(slots=True)
class Holding:
    symbol: str
    quantity: float
    avg_cost_gbp: float
    stop_price_gbp: float
    triggered_tranches: set[int] = field(default_factory=set)


class DividendPortfolio:
    def __init__(self, cash_gbp: float) -> None:
        if cash_gbp < 0:
            raise ValueError("cash must be >= 0")
        self._cash = cash_gbp
        self._realised = 0.0
        self._holdings: dict[str, Holding] = {}
        self._pool: dict[str, float] = {}

    @property
    def cash_gbp(self) -> float:
        return self._cash

    @property
    def realised_gbp(self) -> float:
        return self._realised

    def holdings(self) -> dict[str, Holding]:
        return copy.deepcopy(self._holdings)

    def holding(self, symbol: str) -> Holding | None:
        return self._holdings.get(symbol)

    def deposit(self, amount_gbp: float) -> None:
        if amount_gbp <= 0:
            raise ValueError("deposit must be > 0")
        self._cash += amount_gbp

    def withdraw(self, amount_gbp: float) -> None:
        if amount_gbp <= 0:
            raise ValueError("withdrawal must be > 0")
        if amount_gbp > self._cash + EPS:
            raise InsufficientCashError(f"withdraw {amount_gbp} > cash {self._cash}")
        self._cash -= amount_gbp

    def buy(self, symbol: str, quantity: float, price_gbp: float, fees_gbp: float,
            stop_price_gbp: float | None) -> None:
        if quantity <= 0 or price_gbp <= 0:
            raise ValueError("quantity and price must be > 0")
        cost = quantity * price_gbp + fees_gbp
        if cost > self._cash + EPS:
            raise InsufficientCashError(f"cost {cost} > cash {self._cash}")
        h = self._holdings.get(symbol)
        if h is None and stop_price_gbp is None:
            raise ValueError("new holding requires a stop price")
        self._cash -= cost
        if h is None:
            assert stop_price_gbp is not None
            self._holdings[symbol] = Holding(symbol, quantity, cost / quantity, stop_price_gbp)
            return
        h.avg_cost_gbp = (h.quantity * h.avg_cost_gbp + cost) / (h.quantity + quantity)
        h.quantity += quantity
        if stop_price_gbp is not None:
            h.stop_price_gbp = stop_price_gbp

    def sell(self, symbol: str, quantity: float, price_gbp: float, fees_gbp: float) -> float:
        h = self._holdings.get(symbol)
        if h is None or quantity > h.quantity + EPS or quantity <= 0:
            raise ValueError(f"cannot sell {quantity} of {symbol}")
        proceeds = quantity * price_gbp - fees_gbp
        realised = proceeds - quantity * h.avg_cost_gbp
        self._cash += proceeds
        self._realised += realised
        h.quantity -= quantity
        if h.quantity <= EPS:
            del self._holdings[symbol]
        return realised

    def credit_dividend(self, symbol: str, gross_gbp: float, withholding_pct: float) -> float:
        if gross_gbp < 0:
            raise ValueError("gross dividend must be >= 0")
        net = gross_gbp * (1 - withholding_pct)
        self._cash += net
        self._pool[symbol] = self._pool.get(symbol, 0.0) + net
        return net

    def dividend_pool(self, symbol: str) -> float:
        return self._pool.get(symbol, 0.0)

    def consume_pool(self, symbol: str, amount_gbp: float) -> None:
        self._pool[symbol] = max(0.0, self._pool.get(symbol, 0.0) - amount_gbp)

    def pool_symbols(self) -> list[str]:
        """Symbols with a positive dividend pool."""
        return [s for s, v in self._pool.items() if v > 0]

    def market_value(self, prices: Mapping[str, float]) -> float:
        total = 0.0
        for s, h in self._holdings.items():
            if s not in prices:
                raise ValueError(f"no price for {s}")
            total += h.quantity * prices[s]
        return total

    def unrealised_gbp(self, prices: Mapping[str, float]) -> float:
        total = 0.0
        for s, h in self._holdings.items():
            if s not in prices:
                raise ValueError(f"no price for {s}")
            total += h.quantity * (prices[s] - h.avg_cost_gbp)
        return total

    def equity(self, prices: Mapping[str, float]) -> float:
        return self._cash + self.market_value(prices)
