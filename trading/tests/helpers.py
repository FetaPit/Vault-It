"""Shared test helpers."""
import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))

from collections.abc import Mapping  # noqa: E402
from datetime import date, datetime, timezone  # noqa: E402

from trading.config import (TradingConfig, config_from_dict, config_to_dict, deep_merge,  # noqa: E402
                            default_config)
from trading.models import (AccountState, Bar, EntryType, Position, Side, Signal, Sleeve)  # noqa: E402


def utc(y: int, mo: int, d: int, h: int = 0, mi: int = 0) -> datetime:
    return datetime(y, mo, d, h, mi, tzinfo=timezone.utc)


def make_bar(symbol: str, ts: datetime, o: float, h: float, l: float, c: float,
             v: float = 0.0, interval: int = 300) -> Bar:
    return Bar(symbol, ts, o, h, l, c, v, interval)


TEST_OVERRIDES: dict[str, object] = {
    "fees": {"costs": {"half_spread": 0.05, "slippage": 0.05, "min_commission_gbp": 1.0},
             "usd": {"fx_conversion_pct": 0.005},
             "sb": {"half_spread": 0.2, "slippage": 0.1},
             "hifee": {"min_commission_gbp": 10.0}},
    "instruments": {
        "TEST": {"kind": "share", "currency": "GBP", "min_size": 0.01, "size_step": 0.01, "fee_profile": "zero"},
        "TESTC": {"kind": "share", "currency": "GBP", "min_size": 0.01, "size_step": 0.01, "fee_profile": "costs"},
        "TESTW": {"kind": "share", "currency": "GBP", "min_size": 1.0, "size_step": 1.0, "fee_profile": "zero"},
        "TESTF": {"kind": "share", "currency": "GBP", "min_size": 0.0001, "size_step": 0.0001, "fee_profile": "zero"},
        "TESTUK": {"kind": "share", "currency": "GBP", "min_size": 0.01, "size_step": 0.01,
                   "fee_profile": "zero", "stamp_duty_rate": 0.005},
        "TESTUSD": {"kind": "share", "currency": "USD", "min_size": 0.01, "size_step": 0.01, "fee_profile": "usd"},
        "TESTCFD": {"kind": "cfd", "currency": "GBP", "min_size": 0.01, "size_step": 0.01, "fee_profile": "zero"},
        "TESTHF": {"kind": "share", "currency": "GBP", "min_size": 0.01, "size_step": 0.01, "fee_profile": "hifee"},
        "SB": {"kind": "spread_bet", "currency": "GBP", "min_size": 0.5, "size_step": 0.1, "fee_profile": "sb"},
        "DIVA": {"kind": "etf", "currency": "GBP", "min_size": 0.01, "size_step": 0.01, "fee_profile": "zero"},
        "DIVW": {"kind": "etf", "currency": "GBP", "min_size": 1.0, "size_step": 1.0,
                 "fee_profile": "uk_etf_PLACEHOLDER"}},
    "sleeve_a": {"symbols": ["TEST"], "max_or_range_pct": 0.05},
    "sleeve_b": {"targets": [{"symbol": "DIVA", "weight": 0.6}], "min_trade_gbp": 50.0},
    "fx": {"rates_gbp_per_unit": {"USD": 0.8}},
}


def make_cfg(overrides: Mapping[str, object] | None = None) -> TradingConfig:
    base = deep_merge(config_to_dict(default_config()), TEST_OVERRIDES)
    return config_from_dict(deep_merge(base, overrides or {}))


def make_signal(symbol: str = "TEST", side: Side = Side.LONG, entry: float = 100.0,
                stop: float | None = 95.0, target: float | None = None,
                ts: datetime | None = None, sleeve: Sleeve = Sleeve.A,
                signal_id: str = "sig-1") -> Signal:
    return Signal(signal_id=signal_id, ts=ts or utc(2027, 1, 12, 15, 0), symbol=symbol, side=side,
                  entry_type=EntryType.MARKET, entry=entry, stop=stop, target=target,
                  sleeve=sleeve, source="test")


def make_account(fund: float = 625.0, day_start: float = 625.0, trades_today: int = 0,
                 positions: tuple[Position, ...] = (), sleeve_equity: float = 625.0,
                 sleeve_notional: float = 0.0, sleeve_cash: float = 625.0) -> AccountState:
    return AccountState(fund_equity_gbp=fund, day_start_equity_gbp=day_start,
                        peak_equity_gbp=max(fund, day_start), trades_today=trades_today,
                        open_positions=positions, sleeve_equity_gbp=sleeve_equity,
                        sleeve_open_notional_gbp=sleeve_notional, sleeve_cash_gbp=sleeve_cash)


WINDOW_DAY: date = date(2027, 1, 12)
