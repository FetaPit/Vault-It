"""Strict, versioned configuration: dataclasses, JSON load, validation, hashing."""
from __future__ import annotations

import dataclasses
import hashlib
import json
import re
from dataclasses import dataclass
from datetime import date, time
from pathlib import Path
from typing import Any, Callable, Mapping

from trading.errors import ConfigError
from trading.mathutil import EPS

SCHEMA_VERSION: int = 1
VERSION_FILE_RE = re.compile(r"^v(\d{4})\.json$")
PROPOSED_FILE_RE = re.compile(r"^v(\d{4})\.proposed\.json$")
_VERSION_RE = re.compile(r"^v\d{4}$")


@dataclass(frozen=True, slots=True)
class RiskConfig:
    max_risk_per_trade_pct: float = 0.03
    daily_loss_cap_pct: float = 0.03
    max_trades_per_day: int = 3
    max_drawdown_kill_pct: float = 0.15
    leverage_mode: str = "cash_only"
    max_leverage: float = 1.0
    min_stop_distance_pct: float = 0.0005
    max_signal_age_seconds: int = 120


@dataclass(frozen=True, slots=True)
class ExecutionConfig:
    participation_rate: float = 0.1


@dataclass(frozen=True, slots=True)
class SessionConfig:
    ny_open: str = "09:30"
    window_minutes: int = 120
    opening_range_minutes: int = 15
    entry_cutoff_minutes: int = 30


@dataclass(frozen=True, slots=True)
class SleeveAConfig:
    enabled: bool = True
    allocation_pct: float = 0.5
    symbols: tuple[str, ...] = ("SPY",)
    target_r_multiple: float = 2.0
    max_or_range_pct: float = 0.02
    skip_event_days: bool = True


@dataclass(frozen=True, slots=True)
class TrancheRule:
    gain_pct: float
    sell_fraction: float


@dataclass(frozen=True, slots=True)
class TargetWeight:
    symbol: str
    weight: float


@dataclass(frozen=True, slots=True)
class SleeveBConfig:
    enabled: bool = True
    allocation_pct: float = 0.5
    reinvest_dividends: bool = True
    protective_stop_pct: float = 0.20
    earnings_blackout_days: int = 2
    rebalance_band: float = 0.05
    min_trade_gbp: float = 50.0
    targets: tuple[TargetWeight, ...] = ()
    tranches: tuple[TrancheRule, ...] = ()


@dataclass(frozen=True, slots=True)
class FeeProfile:
    commission_per_order_gbp: float = 0.0
    commission_per_unit_gbp: float = 0.0
    commission_pct: float = 0.0
    min_commission_gbp: float = 0.0
    half_spread: float = 0.0
    slippage: float = 0.0
    fx_conversion_pct: float = 0.0


@dataclass(frozen=True, slots=True)
class InstrumentSpec:
    symbol: str
    kind: str
    currency: str
    multiplier: float = 1.0
    min_size: float = 1.0
    size_step: float = 1.0
    fee_profile: str = "zero"
    stamp_duty_rate: float = 0.0
    dividend_withholding_pct: float = 0.0
    max_size: float = 1_000_000.0

    @property
    def is_margin_product(self) -> bool:
        return self.kind in ("spread_bet", "cfd")

    @property
    def can_short(self) -> bool:
        return self.is_margin_product


@dataclass(frozen=True, slots=True)
class FxConfig:
    rates_gbp_per_unit: Mapping[str, float]
    rates_as_of: str


@dataclass(frozen=True, slots=True)
class CoinSpec:
    name: str
    metal: str
    price_gbp: float
    shipping_gbp: float
    vat_rate: float
    price_as_of: date


@dataclass(frozen=True, slots=True)
class SweepConfig:
    multiple: float = 2.0
    stale_price_days: int = 7
    coins: tuple[CoinSpec, ...] = ()


@dataclass(frozen=True, slots=True)
class TopUpConfig:
    amount_gbp: float = 100.0
    start_month: str = "2027-02"
    day_of_month: int = 1


@dataclass(frozen=True, slots=True)
class GoalConfig:
    target_gbp: float = 15000.0


@dataclass(frozen=True, slots=True)
class PathsConfig:
    journal: str = "runtime/journal.sqlite"
    kill_switch: str = "runtime/KILL_SWITCH"
    inbox: str = "runtime/inbox"


@dataclass(frozen=True, slots=True)
class TradingConfig:
    schema_version: int
    version: str
    mode: str
    base_currency: str
    starting_capital_gbp: float
    risk: RiskConfig
    execution: ExecutionConfig
    session: SessionConfig
    sleeve_a: SleeveAConfig
    sleeve_b: SleeveBConfig
    fees: Mapping[str, FeeProfile]
    instruments: Mapping[str, InstrumentSpec]
    fx: FxConfig
    sweep: SweepConfig
    topup: TopUpConfig
    goal: GoalConfig
    paths: PathsConfig

    def instrument(self, symbol: str) -> InstrumentSpec | None:
        return self.instruments.get(symbol)

    def fee_profile_for(self, symbol: str) -> FeeProfile:
        """Fee profile of the instrument; KeyError if the symbol is unknown."""
        return self.fees[self.instruments[symbol].fee_profile]


def trading_root() -> Path:
    return Path(__file__).resolve().parent


def resolve_path(p: str) -> Path:
    path = Path(p)
    return path if path.is_absolute() else trading_root() / path


# ---------------------------------------------------------------- parsing

def _is_num(v: object) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def _coerce(f: dataclasses.Field, value: object, path: str) -> object:
    t = f.type
    if t == "float":
        if not _is_num(value):
            raise ConfigError(f"{path}: expected number")
        return float(value)  # type: ignore[arg-type]
    if t == "int":
        if isinstance(value, bool) or not isinstance(value, int):
            raise ConfigError(f"{path}: expected integer")
        return value
    if t == "str":
        if not isinstance(value, str):
            raise ConfigError(f"{path}: expected string")
        return value
    if t == "bool":
        if not isinstance(value, bool):
            raise ConfigError(f"{path}: expected boolean")
        return value
    return value


def _section(cls: type, data: object, path: str,
             conv: Mapping[str, Callable[[object, str], object]] | None = None,
             skip: tuple[str, ...] = (), extra: Mapping[str, object] | None = None) -> Any:
    """Build dataclass `cls` from a mapping, strictly."""
    if not isinstance(data, Mapping):
        raise ConfigError(f"{path}: expected object")
    conv = conv or {}
    fields = {f.name: f for f in dataclasses.fields(cls) if f.name not in skip}
    for k in data:
        if k not in fields:
            raise ConfigError(f"unknown key: {path}.{k}" if path else f"unknown key: {k}")
    kwargs: dict[str, object] = dict(extra or {})
    for name, f in fields.items():
        sub = f"{path}.{name}" if path else name
        if name in data:
            v = data[name]
            kwargs[name] = conv[name](v, sub) if name in conv else _coerce(f, v, sub)
        elif f.default is dataclasses.MISSING and f.default_factory is dataclasses.MISSING:
            raise ConfigError(f"missing key: {sub}")
    return cls(**kwargs)


def _list_of(builder: Callable[[object, str], object]) -> Callable[[object, str], tuple]:
    def inner(v: object, path: str) -> tuple:
        if not isinstance(v, (list, tuple)):
            raise ConfigError(f"{path}: expected list")
        return tuple(builder(x, f"{path}[{i}]") for i, x in enumerate(v))
    return inner


def _str_tuple(v: object, path: str) -> tuple[str, ...]:
    if not isinstance(v, (list, tuple)) or not all(isinstance(x, str) for x in v):
        raise ConfigError(f"{path}: expected list of strings")
    return tuple(v)


def _date(v: object, path: str) -> date:
    try:
        return date.fromisoformat(str(v))
    except ValueError as e:
        raise ConfigError(f"{path}: bad date {v!r}") from e


def _fx_rates(v: object, path: str) -> dict[str, float]:
    if not isinstance(v, Mapping) or not all(_is_num(x) for x in v.values()):
        raise ConfigError(f"{path}: expected object of numbers")
    return {str(k): float(x) for k, x in v.items()}


def _mapping_of(cls: type, symbol_field: bool = False) -> Callable[[object, str], dict]:
    def inner(v: object, path: str) -> dict:
        if not isinstance(v, Mapping):
            raise ConfigError(f"{path}: expected object")
        out = {}
        for k, x in v.items():
            if symbol_field:
                out[k] = _section(cls, x, f"{path}.{k}", skip=("symbol",), extra={"symbol": k})
            else:
                out[k] = _section(cls, x, f"{path}.{k}")
        return out
    return inner


def config_from_dict(data: Mapping[str, object]) -> TradingConfig:
    """Strict build from a plain mapping, then validate."""
    if not isinstance(data, Mapping):
        raise ConfigError("config: expected object")
    required = ("schema_version", "version", "mode", "base_currency", "starting_capital_gbp",
                "fees", "instruments", "fx")
    for k in required:
        if k not in data:
            raise ConfigError(f"missing key: {k}")
    top = {f.name: f for f in dataclasses.fields(TradingConfig)}
    for k in data:
        if k not in top:
            raise ConfigError(f"unknown key: {k}")

    def sec(cls: type, key: str, conv: Mapping[str, Callable] | None = None) -> Any:
        return _section(cls, data.get(key, {}), key, conv)

    cfg = TradingConfig(
        schema_version=_coerce(top["schema_version"], data["schema_version"], "schema_version"),  # type: ignore[arg-type]
        version=_coerce(top["version"], data["version"], "version"),  # type: ignore[arg-type]
        mode=_coerce(top["mode"], data["mode"], "mode"),  # type: ignore[arg-type]
        base_currency=_coerce(top["base_currency"], data["base_currency"], "base_currency"),  # type: ignore[arg-type]
        starting_capital_gbp=_coerce(top["starting_capital_gbp"], data["starting_capital_gbp"],
                                     "starting_capital_gbp"),  # type: ignore[arg-type]
        risk=sec(RiskConfig, "risk"),
        execution=sec(ExecutionConfig, "execution"),
        session=sec(SessionConfig, "session"),
        sleeve_a=sec(SleeveAConfig, "sleeve_a", {"symbols": _str_tuple}),
        sleeve_b=sec(SleeveBConfig, "sleeve_b", {
            "targets": _list_of(lambda x, p: _section(TargetWeight, x, p)),
            "tranches": _list_of(lambda x, p: _section(TrancheRule, x, p))}),
        fees=_mapping_of(FeeProfile)(data["fees"], "fees"),
        instruments=_mapping_of(InstrumentSpec, True)(data["instruments"], "instruments"),
        fx=_section(FxConfig, data["fx"], "fx", {"rates_gbp_per_unit": _fx_rates}),
        sweep=sec(SweepConfig, "sweep", {
            "coins": _list_of(lambda x, p: _section(CoinSpec, x, p, {"price_as_of": _date}))}),
        topup=sec(TopUpConfig, "topup"),
        goal=sec(GoalConfig, "goal"),
        paths=sec(PathsConfig, "paths"),
    )
    validate_config(cfg)
    return cfg


def _plain(obj: object) -> object:
    if dataclasses.is_dataclass(obj) and not isinstance(obj, type):
        return {f.name: _plain(getattr(obj, f.name)) for f in dataclasses.fields(obj)}
    if isinstance(obj, date):
        return obj.isoformat()
    if isinstance(obj, Mapping):
        return {k: _plain(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_plain(v) for v in obj]
    return obj


def config_to_dict(cfg: TradingConfig) -> dict[str, object]:
    """JSON-serialisable dict (inverse of config_from_dict)."""
    out = _plain(cfg)
    assert isinstance(out, dict)
    for sym, spec in out["instruments"].items():  # type: ignore[union-attr]
        spec.pop("symbol", None)
    return out


def config_hash(cfg: TradingConfig) -> str:
    blob = json.dumps(config_to_dict(cfg), sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()


def deep_merge(base: Mapping[str, object], overrides: Mapping[str, object]) -> dict[str, object]:
    """Recursive merge for dicts; lists and scalars are replaced."""
    out: dict[str, object] = dict(base)
    for k, v in overrides.items():
        if isinstance(v, Mapping) and isinstance(out.get(k), Mapping):
            out[k] = deep_merge(out[k], v)  # type: ignore[arg-type]
        else:
            out[k] = v
    return out


# ------------------------------------------------------------- validation

def _check(cond: bool, key: str, msg: str) -> None:
    if not cond:
        raise ConfigError(f"{key}: {msg}")


def parse_year_month(s: str) -> date:
    """Parse 'YYYY-MM' to the first day of that month (ValueError if bad)."""
    if not re.fullmatch(r"\d{4}-\d{2}", s):
        raise ValueError(f"bad month {s!r}")
    return date(int(s[:4]), int(s[5:7]), 1)


def validate_config(cfg: TradingConfig) -> None:
    """Raise ConfigError (naming the dotted key) for any rule violation."""
    _check(cfg.schema_version == SCHEMA_VERSION, "schema_version", f"must be {SCHEMA_VERSION}")
    _check(bool(_VERSION_RE.match(cfg.version)), "version", "must look like v0001")
    _check(cfg.mode == "paper", "mode", "must be 'paper' (phase 1 is paper-only)")
    _check(cfg.base_currency == "GBP", "base_currency", "must be GBP")
    _check(cfg.starting_capital_gbp > 0, "starting_capital_gbp", "must be > 0")

    r = cfg.risk
    _check(0 < r.max_risk_per_trade_pct <= 0.03, "risk.max_risk_per_trade_pct", "must be in (0, 0.03]")
    _check(0 < r.daily_loss_cap_pct <= 0.03, "risk.daily_loss_cap_pct", "must be in (0, 0.03]")
    _check(r.max_trades_per_day >= 1, "risk.max_trades_per_day", "must be >= 1")
    _check(0 < r.max_drawdown_kill_pct <= 0.5, "risk.max_drawdown_kill_pct", "must be in (0, 0.5]")
    _check(r.leverage_mode in ("cash_only", "leveraged"), "risk.leverage_mode", "cash_only|leveraged")
    if r.leverage_mode == "cash_only":
        _check(r.max_leverage == 1.0, "risk.max_leverage", "must be 1.0 when cash_only")
    else:
        _check(1.0 < r.max_leverage <= 5.0, "risk.max_leverage", "must be in (1, 5] when leveraged")
    _check(0 <= r.min_stop_distance_pct <= 0.05, "risk.min_stop_distance_pct", "must be in [0, 0.05]")
    _check(r.max_signal_age_seconds >= 1, "risk.max_signal_age_seconds", "must be >= 1")

    _check(0 < cfg.execution.participation_rate <= 1, "execution.participation_rate", "must be in (0, 1]")

    s = cfg.session
    try:
        hh, mm = s.ny_open.split(":")
        time(int(hh), int(mm))
    except ValueError as e:
        raise ConfigError("session.ny_open: must be HH:MM") from e
    _check(1 <= s.window_minutes <= 390, "session.window_minutes", "must be in 1..390")
    _check(s.entry_cutoff_minutes >= 0, "session.entry_cutoff_minutes", "must be >= 0")
    _check(1 <= s.opening_range_minutes < s.window_minutes - s.entry_cutoff_minutes,
           "session.opening_range_minutes", "must be >= 1 and < window - entry_cutoff")

    a, b = cfg.sleeve_a, cfg.sleeve_b
    _check(0 <= a.allocation_pct <= 1, "sleeve_a.allocation_pct", "must be in [0, 1]")
    _check(0 <= b.allocation_pct <= 1, "sleeve_b.allocation_pct", "must be in [0, 1]")
    _check(abs(a.allocation_pct + b.allocation_pct - 1.0) <= 1e-9, "sleeve_a.allocation_pct",
           "sleeve_a + sleeve_b allocation must equal 1.0")
    _check(a.target_r_multiple > 0, "sleeve_a.target_r_multiple", "must be > 0")
    _check(a.max_or_range_pct > 0, "sleeve_a.max_or_range_pct", "must be > 0")
    for sym in a.symbols:
        _check(sym in cfg.instruments, "sleeve_a.symbols", f"{sym} missing from instruments")

    _check(0 < b.protective_stop_pct <= 0.5, "sleeve_b.protective_stop_pct", "must be in (0, 0.5]")
    _check(b.earnings_blackout_days >= 0, "sleeve_b.earnings_blackout_days", "must be >= 0")
    _check(0 <= b.rebalance_band <= 0.5, "sleeve_b.rebalance_band", "must be in [0, 0.5]")
    _check(b.min_trade_gbp >= 0, "sleeve_b.min_trade_gbp", "must be >= 0")
    wsum = 0.0
    for t in b.targets:
        _check(t.symbol in cfg.instruments, "sleeve_b.targets", f"{t.symbol} missing from instruments")
        _check(cfg.instruments[t.symbol].currency == "GBP", "sleeve_b.targets",
               f"{t.symbol} must be GBP-denominated")
        _check(0 < t.weight <= 1, "sleeve_b.targets.weight", "must be in (0, 1]")
        wsum += t.weight
    _check(wsum <= 1.0 + 1e-9, "sleeve_b.targets", "weights must sum to <= 1.0")
    prev = 0.0
    fsum = 0.0
    for tr in b.tranches:
        _check(tr.gain_pct > prev, "sleeve_b.tranches.gain_pct", "must be > 0 and strictly ascending")
        _check(0 < tr.sell_fraction <= 1, "sleeve_b.tranches.sell_fraction", "must be in (0, 1]")
        prev = tr.gain_pct
        fsum += tr.sell_fraction
    _check(fsum <= 1.0 + 1e-9, "sleeve_b.tranches.sell_fraction", "sum must be <= 1.0")

    for name, fp in cfg.fees.items():
        for f in dataclasses.fields(fp):
            _check(getattr(fp, f.name) >= 0, f"fees.{name}.{f.name}", "must be >= 0")

    for k, v in cfg.fx.rates_gbp_per_unit.items():
        _check(v > 0, f"fx.rates_gbp_per_unit.{k}", "must be > 0")
    for sym, i in cfg.instruments.items():
        key = f"instruments.{sym}"
        _check(i.kind in ("share", "etf", "spread_bet", "cfd"), f"{key}.kind", "unknown kind")
        _check(len(i.currency) == 3, f"{key}.currency", "must be a 3-letter code")
        _check(i.multiplier > 0, f"{key}.multiplier", "must be > 0")
        _check(i.min_size > 0, f"{key}.min_size", "must be > 0")
        _check(i.size_step > 0, f"{key}.size_step", "must be > 0")
        _check(i.min_size >= i.size_step - EPS, f"{key}.min_size", "must be >= size_step")
        _check(i.max_size > 0, f"{key}.max_size", "must be > 0")
        _check(i.fee_profile in cfg.fees, f"{key}.fee_profile", f"unknown fee profile {i.fee_profile!r}")
        _check(0 <= i.stamp_duty_rate <= 0.01, f"{key}.stamp_duty_rate", "must be in [0, 0.01]")
        if i.stamp_duty_rate > 0:
            _check(i.kind == "share" and i.currency == "GBP", f"{key}.stamp_duty_rate",
                   "only allowed for GBP shares")
        _check(0 <= i.dividend_withholding_pct <= 0.5, f"{key}.dividend_withholding_pct", "must be in [0, 0.5]")
        if i.kind == "spread_bet":
            _check(i.currency == "GBP", f"{key}.currency", "spread_bet must be GBP")
        _check(i.currency == "GBP" or i.currency in cfg.fx.rates_gbp_per_unit, f"{key}.currency",
               f"no fx rate for {i.currency}")

    sw = cfg.sweep
    _check(sw.multiple >= 2.0, "sweep.multiple", "must be >= 2.0")
    _check(sw.stale_price_days >= 1, "sweep.stale_price_days", "must be >= 1")
    for c in sw.coins:
        key = f"sweep.coins.{c.name}"
        _check(c.metal in ("gold", "silver"), f"{key}.metal", "gold|silver")
        _check(c.price_gbp > 0, f"{key}.price_gbp", "must be > 0")
        _check(c.shipping_gbp >= 0, f"{key}.shipping_gbp", "must be >= 0")
        if c.metal == "gold":
            _check(c.vat_rate == 0.0, f"{key}.vat_rate", "gold coins must be 0.0 (investment gold)")
        else:
            _check(0 <= c.vat_rate <= 0.20, f"{key}.vat_rate", "silver must be in [0, 0.20]")

    t = cfg.topup
    _check(t.amount_gbp > 0, "topup.amount_gbp", "must be > 0")
    _check(1 <= t.day_of_month <= 28, "topup.day_of_month", "must be in 1..28")
    try:
        parse_year_month(t.start_month)
    except ValueError as e:
        raise ConfigError("topup.start_month: must be YYYY-MM") from e
    _check(cfg.goal.target_gbp > 0, "goal.target_gbp", "must be > 0")


# ---------------------------------------------------------------- loading

def load_config(path: Path) -> TradingConfig:
    try:
        text = Path(path).read_text(encoding="utf-8")
    except OSError as e:
        raise ConfigError(f"cannot read {path}: {e}") from e
    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        raise ConfigError(f"invalid JSON in {path}: {e}") from e
    cfg = config_from_dict(data)
    name = Path(path).name
    m = VERSION_FILE_RE.match(name) or PROPOSED_FILE_RE.match(name)
    if m and cfg.version != f"v{m.group(1)}":
        raise ConfigError(f"version: file {name} contains version {cfg.version!r}")
    return cfg


def load_active_config(config_dir: Path) -> TradingConfig:
    best: tuple[int, Path] | None = None
    for p in Path(config_dir).iterdir() if Path(config_dir).is_dir() else ():
        m = VERSION_FILE_RE.match(p.name)
        if m and (best is None or int(m.group(1)) > best[0]):
            best = (int(m.group(1)), p)
    if best is None:
        raise ConfigError(f"no vNNNN.json config found in {config_dir}")
    return load_config(best[1])


def default_config() -> TradingConfig:
    return load_config(trading_root() / "config" / "v0001.json")
