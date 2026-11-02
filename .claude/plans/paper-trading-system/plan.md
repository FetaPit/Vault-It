# Implementation Plan: Paper-Trading System (UK retail, phase 1)

Target path: `/home/user/Vault-It/.claude/plans/paper-trading-system/plan.md`
Code root: `/home/user/Vault-It/trading/`. Existing repo files are not touched. Stdlib only. Tests run from the repo root with `python3 -m unittest discover -s trading/tests`.

---

## 1. Overview

### What we're building
A **paper-only** trading system for a UK retail trader:
- **Fund**: start capital configurable, default £625 (expected range £500–£750). £100/month top-up from Feb 2027. Goal: £15,000 in fund equity plus physical gold/silver (counted at cost). The separate £8k LISA is never part of any calculation, account or equity figure. The system has no concept of a LISA account.
- **Sleeve A**: intraday opening-range breakout (ORB), long and short. Window is NY open + 120 min (14:30–16:30 Europe/London in normal weeks). Flat by window end. Never holds overnight.
- **Sleeve B**: dividend compounding. Holds target ETFs, reinvests dividends (DRIP), keeps an event calendar, takes partial profits in tranches, and has a protective stop. A gold/silver **sweep recommender** emits a recommendation and never buys anything.
- **Risk engine** with veto between every signal source (strategy code or LLM file proposals) and the paper broker.
- **SQLite journal**, a **backtester** that shares the risk + broker code path, a **monthly top-up scheduler**, a **forecast** module, a **weekly review** (stats + walk-forward splits + proposal writer for versioned configs), and a small **CLI**.
- Two docs: `trading/docs/feasibility.md` and `trading/docs/architecture.md`.

### Key architectural decisions
1. **Deterministic code executes; the LLM never places orders.** LLM output enters only as JSON files in `runtime/inbox/`. The inbox schema forbids any quantity or size field. Every signal goes through `RiskEngine.evaluate()`. No module the LLM touches holds broker credentials, and no live broker class exists.
2. **Paper-only guard, three layers.** (a) `config.mode` must equal `"paper"` (ConfigError otherwise). (b) `PaperBroker.__init__` calls `assert_paper_mode()`. (c) A unit test AST-scans every non-test `.py` under `trading/` for network imports and for any class whose name contains `Live`.
3. **Money is `float` (GBP).** Decision: floats with explicit `1e-9` tolerances in comparisons, and `assertAlmostEqual(places=6)` in tests. Rationale: paper system, simpler for implementers, and SQLite stores REAL. Decimal is rejected as unnecessary complexity for phase 1.
4. **All datetimes are tz-aware UTC internally.** Session logic converts using `zoneinfo` (`America/New_York` 09:30 open, displayed in `Europe/London`). Naive datetimes raise `ValueError` wherever checked.
5. **Accounting is P&L based.** `cash = starting + deposits + Σ net realised P&L + dividends − withdrawals` and `equity = cash + unrealised (mid marks)`. Notional and leverage limits are enforced by the risk engine, not by cash debits. This applies to Sleeve A (`PaperBroker`). Sleeve B (`DividendPortfolio`) is a true cash ledger: buys debit cash and sells credit it.
6. **Position size comes from stop distance plus all costs.** Planned max loss (stop distance + round-trip spread/slippage + commissions + FX + stamp) must be ≤ min(3% fund equity, remaining daily loss budget). Gap fills can exceed this. That is documented, tested, and counted toward the daily cap.
7. **"3% of fund" means total fund equity** (Sleeve A broker equity + Sleeve B portfolio equity). Notional/leverage caps use **sleeve** equity.
8. **Bars are mid prices.** The bid/ask is modelled as mid ± `half_spread`. Slippage applies to market and stop orders, not limit orders.
9. **Learning loop has no daily retraining.** The journal records everything. A weekly review computes stats with a minimum sample of 30 trades. A proposal writer creates `vNNNN.proposed.json`. Only a human renaming it to `vNNNN.json` activates it. Proposals may never change `risk.*` or `mode`.

### Decisions (callouts)
- **Decision:** The forecast compounds monthly at `r_m = (1+a)^(1/12) − 1`. Each month: `balance = balance*(1+r_m) + 100`. Month 1 is the first top-up (Feb 2027). This reproduces the given figures exactly (months: £500→145/113/101/89, £625→144/112/100/88, £750→143/110/98/87).
- **Decision:** Sleeve A "flat by close" means flat at the **window end** (NY open + 120 min), not the US market close.
- **Decision:** During DST mismatch weeks the window follows New York: it runs 13:30–15:30 London.
- **Decision:** Shorting is allowed only for `kind ∈ {"spread_bet","cfd"}`. Shares/ETFs cannot be shorted (`SHORT_NOT_ALLOWED`).
- **Decision:** Sleeve B purchases also need a stop: a protective stop `protective_stop_pct` (default 20%), checked on daily closes. This keeps "3% max risk per trade" universal: max position ≈ 15% of fund.
- **Decision:** Exits and risk-reducing actions (stops, targets, tranche sells, flattening) never need risk approval. The kill switch blocks all new buys (including DRIP) but never blocks exits.
- **Decision:** The kill switch flattens Sleeve A. Sleeve B holdings are frozen (no buys) but not liquidated.
- **Decision:** `max_trades_per_day` counts all approved entries across both sleeves. DRIP is excluded.
- **Decision:** Allocation `sleeve_a.allocation_pct + sleeve_b.allocation_pct` must equal 1.0. Starting capital and top-ups are split by these percentages.
- **Decision:** FX rates are static config values in phase 1 (FX P&L is not modelled). The conversion cost is charged on every fill of a non-GBP instrument.
- **Decision:** Exits are always filled in full (no partial exits). Entries can fill partially per a participation-rate cap.
- **Decision:** When stop and target both trigger in one bar, the stop wins. Exception: if the bar *opens* beyond the target, the target fills at the open. On the bar where an entry fills, only the stop is checked.
- **Decision:** Sleeve B instruments are GBP-denominated only in phase 1.
- **Decision:** Sweep eligible profit = `fund_equity + total_sweep_withdrawals − total_contributions − Σ thresholds of acknowledged sweeps`. Each sweep "consumes" 2× its cost of profit.
- **Decision:** VAT for the sweep threshold is applied to (price + shipping): `all_in = (price + shipping) * (1 + vat_rate)`.
- **Decision:** Gold coins must have `vat_rate == 0.0` (investment gold exemption), otherwise ConfigError. Silver `vat_rate ∈ [0, 0.20]`.
- **Decision:** The daily close job runs at 17:00 Europe/London. It uses LSE closes for Sleeve B.
- **Decision:** Relative paths in config resolve against the `trading/` directory (`config.trading_root()`).

### OUT of scope (phase 1)
- Any live broker, network access, real market-data download, or broker API (IBKR/IG).
- Parameter optimisation search (grid search). The review only computes stats, splits and writes proposals given explicit changes.
- FX P&L, borrow fees, overnight financing (Sleeve A is never overnight), corporate actions other than cash dividends, US early-close handling (the window ends 11:30 NY, before any 13:00 early close), tax computation.
- Sleeve B USD instruments; Sleeve B backtesting.
- Automatic coin purchases (only recommendations are produced, ever).
- Scheduling daemons (cron/systemd). Times are documented; code exposes functions and CLI only.

### PLAN_GAPs (decisions I could not make)
- **PLAN_GAP-1:** `zoneinfo` needs the system tz database. Run `python3 -c "import zoneinfo; zoneinfo.ZoneInfo('America/New_York')"` first. If it fails, stop and report. Installing `tzdata` is a third-party dependency and is out of bounds.
- **PLAN_GAP-2:** Live broker choice (IBKR UK vs spread-bet provider) is left to the user after phase 1. It depends on the PDT/FINRA rule status and the ISA wrapper decision.
- **PLAN_GAP-3:** Whether Sleeve B lives in a Stocks & Shares ISA is the user's decision. It affects tax, not code.
- **PLAN_GAP-4:** Sleeve A paper symbol `SPY` is a placeholder. UK retail access to US-domiciled ETFs depends on the PRIIPs→CCI transition and the broker. Use an eligible instrument before any live phase.
- **PLAN_GAP-5:** Coin prices, shipping, FX rates and fee values in `v0001.json` are placeholders dated `2026-11-02`. The user must refresh them from a dealer and the broker.
- **PLAN_GAP-6:** The real intraday data source is undecided. Phase 1 is CSV only.

---

## 2. File Structure

```
trading/
├── .gitignore                       # [CREATE] runtime/, *.sqlite, __pycache__/
├── README.md                        # [CREATE] how to run tests/CLI, paper-only warning
├── __init__.py                      # [CREATE] __version__ = "0.1.0"; nothing else
├── errors.py                        # [CREATE] exception hierarchy
├── mathutil.py                      # [CREATE] floor_to_step, step_decimals
├── models.py                        # [CREATE] enums + dataclasses (Bar, Signal, OrderRequest, Fill, Position, ClosedTrade, AccountState, RiskDecision)
├── config.py                        # [CREATE] dataclass config, JSON load/validate/hash, versioned loading
├── config/
│   └── v0001.json                   # [CREATE] default active config (content in §3.4)
├── session.py                       # [CREATE] NY-open-based window, DST mismatch, trading days
├── fx.py                            # [CREATE] FxConverter (static rates + conversion cost)
├── fees.py                          # [CREATE] commission, stamp duty, fill-price, FillCosts
├── marketdata.py                    # [CREATE] MarketDataAdapter ABC, InMemoryMarketData, CsvMarketData
├── killswitch.py                    # [CREATE] KillSwitch (file + memory flag, fail-closed)
├── guards.py                        # [CREATE] assert_paper_mode, FORBIDDEN_IMPORTS
├── risk.py                          # [CREATE] RiskEngine (veto + sizing), reason codes
├── broker.py                        # [CREATE] PaperBroker (bracket orders, fills, partials, gaps)
├── journal.py                       # [CREATE] TradeJournal (SQLite)
├── backtest.py                      # [CREATE] Backtester, BacktestResult
├── signal_inbox.py                  # [CREATE] LLM JSON proposal reader/validator
├── topup.py                         # [CREATE] TopUpScheduler
├── forecast.py                      # [CREATE] months_to_target, forecast_table, goal_progress_pct
├── review.py                        # [CREATE] compute_stats, weekly_review, walk_forward_splits, write_proposal
├── daily.py                         # [CREATE] run_daily_close orchestration (top-ups, Sleeve B, sweep, equity)
├── cli.py                           # [CREATE] forecast | killswitch | backtest
├── strategies/
│   ├── __init__.py                  # [CREATE] empty
│   ├── base.py                      # [CREATE] Strategy ABC, StrategyContext
│   └── orb.py                       # [CREATE] OpeningRangeBreakout (Sleeve A)
├── sleeve_b/
│   ├── __init__.py                  # [CREATE] empty
│   ├── events.py                    # [CREATE] EventType, Event, EventCalendar (CSV)
│   ├── portfolio.py                 # [CREATE] Holding, DividendPortfolio
│   ├── tranches.py                  # [CREATE] TrancheAction, plan_profit_taking
│   ├── sweep.py                     # [CREATE] coin cost, select_sweep, SweepTracker
│   └── manager.py                   # [CREATE] SleeveBManager.daily_step
├── docs/
│   ├── feasibility.md               # [CREATE] fees/tax/comparison/returns/forecast (§3.20)
│   └── architecture.md              # [CREATE] components, rules, scheduling (§3.21)
└── tests/                           # NO __init__.py (discover uses this dir as top level)
    ├── helpers.py                   # [CREATE] utc(), make_bar(), make_cfg(), TEST_OVERRIDES, tmp dirs
    ├── test_mathutil.py
    ├── test_models.py
    ├── test_config.py
    ├── test_session.py
    ├── test_fx.py
    ├── test_fees.py
    ├── test_marketdata.py
    ├── test_killswitch.py
    ├── test_guards.py
    ├── test_risk.py
    ├── test_broker.py
    ├── test_journal.py
    ├── test_orb.py
    ├── test_backtest.py             # integration: data→strategy→risk→broker→journal
    ├── test_signal_inbox.py         # includes inbox→risk integration
    ├── test_events.py
    ├── test_portfolio.py
    ├── test_tranches.py
    ├── test_sweep.py
    ├── test_sleeve_b_manager.py
    ├── test_topup.py
    ├── test_forecast.py
    ├── test_review.py
    ├── test_daily.py                # integration: top-up + Sleeve B + sweep + journal
    └── test_cli.py
```

**Import bootstrap (every test file, first lines):**
```python
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))  # repo root
```
Production code imports absolutely, e.g. `from trading.models import Bar`. Tests import `helpers` directly (`import helpers`), because discover puts `trading/tests` on `sys.path`.

**Style:** PEP 8, full type hints with built-in generics and `X | None`, `@dataclass(frozen=True, slots=True)` for value objects (mutable `@dataclass(slots=True)` where noted), a module docstring on every file, and no print in library code (CLI only).

---

## 3. Interfaces & Signatures

### 3.1 `trading/errors.py`
```python
class TradingError(Exception): """Base for all package errors."""
class ConfigError(TradingError): """Invalid or inconsistent configuration."""
class MarketDataError(TradingError):
    def __init__(self, message: str, line_no: int | None = None) -> None  # str(e) includes "line {n}: " prefix when line_no given
class CalendarError(TradingError):
    def __init__(self, message: str, line_no: int | None = None) -> None  # same prefix rule
class PaperOnlyViolation(TradingError): """Raised when anything other than paper mode is attempted."""
class OrderError(TradingError): """Malformed order reached the broker (defence in depth)."""
class JournalError(TradingError): """SQLite integrity/consistency problem."""
class InsufficientCashError(TradingError): """Cash ledger would go negative."""
class FxError(TradingError): """Unknown currency / bad rate."""
```

### 3.2 `trading/mathutil.py`
```python
EPS: float = 1e-9
def step_decimals(step: float) -> int
    """Number of decimal places in `step` via Decimal(str(step)); 0.01→2, 1.0→0, 0.0001→4."""
def floor_to_step(value: float, step: float) -> float
    """Round value DOWN to a multiple of step. n = math.floor(value/step + EPS); return round(n*step, step_decimals(step)).
    value <= 0 → 0.0. Raises ValueError if step <= 0."""
```

### 3.3 `trading/models.py`
```python
class Side(str, Enum): LONG = "long"; SHORT = "short"
class Sleeve(str, Enum): A = "A"; B = "B"
class EntryType(str, Enum): MARKET = "market"; STOP = "stop"; LIMIT = "limit"
class OrderStatus(str, Enum): PENDING="pending"; PARTIALLY_FILLED="partially_filled"; FILLED="filled"; CANCELLED="cancelled"
class ExitReason(str, Enum): STOP="stop"; TARGET="target"; TIME_FLAT="time_flat"; DAILY_CAP="daily_cap"; KILL_SWITCH="kill_switch"; MANUAL="manual"; TRANCHE="tranche"; PROTECTIVE_STOP="protective_stop"
Action = Literal["buy", "sell"]

def require_utc(ts: datetime, name: str) -> None
    """Raise ValueError(f"{name} must be timezone-aware") if ts.tzinfo is None or ts.utcoffset() is None."""

@dataclass(frozen=True, slots=True)
class Bar:
    symbol: str
    ts: datetime              # bar START, tz-aware
    open: float; high: float; low: float; close: float
    volume: float = 0.0
    interval_seconds: int = 300
    def __post_init__(self) -> None
        """ValueError if: naive ts; high < max(open, close, low); low > min(open, close); any price <= 0;
        volume < 0; interval_seconds <= 0."""
    @property
    def end_ts(self) -> datetime   # ts + timedelta(seconds=interval_seconds)

@dataclass(frozen=True, slots=True)
class Signal:
    signal_id: str
    ts: datetime              # time the signal became actionable (tz-aware)
    symbol: str
    side: Side
    entry_type: EntryType
    entry: float              # reference price for MARKET; trigger/limit price otherwise
    stop: float | None        # None allowed here → risk engine rejects NO_STOP
    target: float | None
    sleeve: Sleeve
    source: str               # "strategy:orb" | "sleeve_b" | "llm"
    rationale: str = ""
    features: Mapping[str, float] = field(default_factory=dict)

@dataclass(frozen=True, slots=True)
class OrderRequest:
    order_id: str             # f"{signal_id}-o"
    signal_id: str
    symbol: str
    side: Side
    quantity: float
    entry_type: EntryType
    entry_price: float
    stop_price: float
    target_price: float | None
    sleeve: Sleeve
    ts: datetime              # submission time; fills only on bars with bar.ts >= ts
    expires_ts: datetime | None
    config_version: str

@dataclass(frozen=True, slots=True)
class Fill:
    fill_id: str              # f"{order_id}-f{n}" for entries, f"{position_id}-x" for exits
    order_id: str
    symbol: str
    action: Action
    quantity: float
    price: float              # effective price incl. spread+slippage
    mid_price: float          # reference mid used
    commission_gbp: float
    stamp_duty_gbp: float
    fx_cost_gbp: float
    spread_slippage_gbp: float   # informational only (already inside price): qty*|price-mid|*multiplier*fx
    ts: datetime
    is_partial: bool
    @property
    def fees_gbp(self) -> float  # commission + stamp + fx_cost

@dataclass(slots=True)        # mutable
class Position:
    position_id: str          # == order_id
    order_id: str
    symbol: str
    side: Side
    sleeve: Sleeve
    quantity: float
    entry_price: float        # VWAP of entry fills
    stop_price: float
    target_price: float | None
    opened_ts: datetime
    initial_risk_gbp: float   # prorated by filled fraction
    entry_fees_gbp: float     # accumulated entry fees

@dataclass(frozen=True, slots=True)
class ClosedTrade:
    trade_id: str             # == position_id
    position_id: str
    symbol: str
    side: Side
    sleeve: Sleeve
    quantity: float
    entry_price: float
    exit_price: float
    opened_ts: datetime
    closed_ts: datetime
    gross_pnl_gbp: float
    fees_gbp: float           # entry + exit fees
    net_pnl_gbp: float        # gross - fees
    exit_reason: ExitReason
    config_version: str

@dataclass(frozen=True, slots=True)
class AccountState:
    fund_equity_gbp: float        # Sleeve A equity + Sleeve B equity (incl. unrealised)
    day_start_equity_gbp: float   # fund equity at start of trading day
    peak_equity_gbp: float
    trades_today: int             # approved entries today, all sleeves
    open_positions: tuple[Position, ...]   # all sleeves' broker positions (Sleeve A)
    sleeve_equity_gbp: float      # equity of the signal's sleeve
    sleeve_open_notional_gbp: float
    sleeve_cash_gbp: float        # used for Sleeve B cash cap

@dataclass(frozen=True, slots=True)
class RiskDecision:
    signal_id: str
    approved: bool
    reasons: tuple[str, ...]      # empty iff approved
    quantity: float               # 0.0 if rejected
    risk_gbp: float               # planned max loss incl. costs; 0.0 if rejected
    order: OrderRequest | None
```

### 3.4 `trading/config.py` and `trading/config/v0001.json`

```python
SCHEMA_VERSION: int = 1
VERSION_FILE_RE = re.compile(r"^v(\d{4})\.json$")
PROPOSED_FILE_RE = re.compile(r"^v(\d{4})\.proposed\.json$")

@dataclass(frozen=True, slots=True)
class RiskConfig:
    max_risk_per_trade_pct: float = 0.03     # (0, 0.03]
    daily_loss_cap_pct: float = 0.03         # (0, 0.03]
    max_trades_per_day: int = 3              # >= 1
    max_drawdown_kill_pct: float = 0.15      # (0, 0.5]
    leverage_mode: str = "cash_only"         # "cash_only" | "leveraged"
    max_leverage: float = 1.0                # cash_only: must == 1.0 ; leveraged: (1.0, 5.0]
    min_stop_distance_pct: float = 0.0005    # [0, 0.05]
    max_signal_age_seconds: int = 120        # >= 1

@dataclass(frozen=True, slots=True)
class ExecutionConfig:
    participation_rate: float = 0.1          # (0, 1]

@dataclass(frozen=True, slots=True)
class SessionConfig:
    ny_open: str = "09:30"                   # "HH:MM"
    window_minutes: int = 120                # 1..390
    opening_range_minutes: int = 15          # >=1 and < window_minutes - entry_cutoff_minutes
    entry_cutoff_minutes: int = 30           # >=0, minutes before window end after which no entries

@dataclass(frozen=True, slots=True)
class SleeveAConfig:
    enabled: bool = True
    allocation_pct: float = 0.5
    symbols: tuple[str, ...] = ("SPY",)      # each must exist in instruments
    target_r_multiple: float = 2.0           # > 0
    max_or_range_pct: float = 0.02           # > 0
    skip_event_days: bool = True

@dataclass(frozen=True, slots=True)
class TrancheRule:
    gain_pct: float        # > 0, strictly ascending across rules
    sell_fraction: float   # (0, 1]; sum over rules <= 1.0

@dataclass(frozen=True, slots=True)
class TargetWeight:
    symbol: str            # must exist in instruments with currency GBP
    weight: float          # (0, 1]; sum <= 1.0

@dataclass(frozen=True, slots=True)
class SleeveBConfig:
    enabled: bool = True
    allocation_pct: float = 0.5
    reinvest_dividends: bool = True
    protective_stop_pct: float = 0.20        # (0, 0.5]
    earnings_blackout_days: int = 2          # >= 0
    rebalance_band: float = 0.05             # [0, 0.5]
    min_trade_gbp: float = 50.0              # >= 0
    targets: tuple[TargetWeight, ...] = ()
    tranches: tuple[TrancheRule, ...] = ()

@dataclass(frozen=True, slots=True)
class FeeProfile:
    commission_per_order_gbp: float = 0.0
    commission_per_unit_gbp: float = 0.0
    commission_pct: float = 0.0
    min_commission_gbp: float = 0.0
    half_spread: float = 0.0                 # price units
    slippage: float = 0.0                    # price units
    fx_conversion_pct: float = 0.0           # applied only if instrument.currency != "GBP"
    # all >= 0 else ConfigError

@dataclass(frozen=True, slots=True)
class InstrumentSpec:
    symbol: str                              # filled from dict key
    kind: str                                # "share" | "etf" | "spread_bet" | "cfd"
    currency: str                            # "GBP" | "USD" (any 3-letter with an fx rate)
    multiplier: float = 1.0                  # > 0
    min_size: float = 1.0                    # > 0
    size_step: float = 1.0                   # > 0; min_size >= size_step - EPS
    fee_profile: str = "zero"                # must exist in fees
    stamp_duty_rate: float = 0.0             # >0 only allowed if kind=="share" and currency=="GBP"; <= 0.01
    dividend_withholding_pct: float = 0.0    # [0, 0.5]
    max_size: float = 1_000_000.0
    # spread_bet must have currency "GBP"
    @property
    def is_margin_product(self) -> bool       # kind in {"spread_bet","cfd"}
    @property
    def can_short(self) -> bool               # same as is_margin_product

@dataclass(frozen=True, slots=True)
class FxConfig:
    rates_gbp_per_unit: Mapping[str, float]  # e.g. {"USD": 0.79}; each > 0; "GBP" implicit 1.0
    rates_as_of: str

@dataclass(frozen=True, slots=True)
class CoinSpec:
    name: str
    metal: str          # "gold" | "silver"
    price_gbp: float    # > 0
    shipping_gbp: float # >= 0
    vat_rate: float     # gold: must == 0.0 ; silver: [0, 0.20]
    price_as_of: date   # JSON "YYYY-MM-DD"

@dataclass(frozen=True, slots=True)
class SweepConfig:
    multiple: float = 2.0         # >= 1.0
    stale_price_days: int = 7     # >= 1
    coins: tuple[CoinSpec, ...] = ()

@dataclass(frozen=True, slots=True)
class TopUpConfig:
    amount_gbp: float = 100.0     # > 0
    start_month: str = "2027-02"  # "YYYY-MM"
    day_of_month: int = 1         # 1..28

@dataclass(frozen=True, slots=True)
class GoalConfig:
    target_gbp: float = 15000.0   # > 0

@dataclass(frozen=True, slots=True)
class PathsConfig:
    journal: str = "runtime/journal.sqlite"
    kill_switch: str = "runtime/KILL_SWITCH"
    inbox: str = "runtime/inbox"

@dataclass(frozen=True, slots=True)
class TradingConfig:
    schema_version: int
    version: str                  # "vNNNN"
    mode: str                     # must be "paper"
    base_currency: str            # must be "GBP"
    starting_capital_gbp: float   # > 0
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
    def instrument(self, symbol: str) -> InstrumentSpec | None
    def fee_profile_for(self, symbol: str) -> FeeProfile           # KeyError if unknown symbol

def trading_root() -> Path            # Path(__file__).resolve().parent
def resolve_path(p: str) -> Path      # absolute p unchanged; relative → trading_root() / p
def config_from_dict(data: Mapping[str, object]) -> TradingConfig
    """Strict: unknown key at any level → ConfigError(f"unknown key: {dotted}"). Missing required top-level key → ConfigError.
    Nested sections may omit keys (dataclass defaults apply). Lists→tuples. Then validate_config()."""
def config_to_dict(cfg: TradingConfig) -> dict[str, object]      # JSON-serialisable; dates as "YYYY-MM-DD"; tuples→lists
def validate_config(cfg: TradingConfig) -> None                  # every rule in the comments above; ConfigError(message naming the dotted key)
def config_hash(cfg: TradingConfig) -> str                        # sha256 hex of json.dumps(config_to_dict(cfg), sort_keys=True, separators=(",",":"))
def load_config(path: Path) -> TradingConfig                      # JSONDecodeError→ConfigError; if filename matches VERSION_FILE_RE or PROPOSED_FILE_RE, cfg.version must equal "v"+digits else ConfigError
def load_active_config(config_dir: Path) -> TradingConfig         # highest-numbered file matching VERSION_FILE_RE; ignores *.proposed.json; none → ConfigError
def default_config() -> TradingConfig                             # load_config(trading_root()/"config"/"v0001.json")
def deep_merge(base: Mapping[str, object], overrides: Mapping[str, object]) -> dict[str, object]  # recursive for dicts, lists replaced
```

Additional cross-field validation (all → ConfigError):
- `sleeve_a.allocation_pct + sleeve_b.allocation_pct` differs from 1.0 by more than 1e-9.
- A `sleeve_a.symbols` or `sleeve_b.targets[].symbol` entry is missing from `instruments`.
- A Sleeve B target instrument has currency != GBP.
- An instrument's `fee_profile` is missing from `fees`.
- An instrument currency is not GBP and not in `fx.rates_gbp_per_unit`.
- `topup.start_month` does not parse.

**`trading/config/v0001.json` (exact content):**
```json
{
  "schema_version": 1,
  "version": "v0001",
  "mode": "paper",
  "base_currency": "GBP",
  "starting_capital_gbp": 625.0,
  "risk": {"max_risk_per_trade_pct": 0.03, "daily_loss_cap_pct": 0.03, "max_trades_per_day": 3,
           "max_drawdown_kill_pct": 0.15, "leverage_mode": "cash_only", "max_leverage": 1.0,
           "min_stop_distance_pct": 0.0005, "max_signal_age_seconds": 120},
  "execution": {"participation_rate": 0.1},
  "session": {"ny_open": "09:30", "window_minutes": 120, "opening_range_minutes": 15, "entry_cutoff_minutes": 30},
  "sleeve_a": {"enabled": true, "allocation_pct": 0.5, "symbols": ["SPY"], "target_r_multiple": 2.0,
               "max_or_range_pct": 0.02, "skip_event_days": true},
  "sleeve_b": {"enabled": true, "allocation_pct": 0.5, "reinvest_dividends": true, "protective_stop_pct": 0.20,
               "earnings_blackout_days": 2, "rebalance_band": 0.05, "min_trade_gbp": 50.0,
               "targets": [{"symbol": "VHYL", "weight": 0.6}, {"symbol": "VUKE", "weight": 0.4}],
               "tranches": [{"gain_pct": 0.25, "sell_fraction": 0.25}, {"gain_pct": 0.50, "sell_fraction": 0.25}]},
  "fees": {
    "zero": {},
    "ibkr_us_fixed_PLACEHOLDER": {"commission_per_unit_gbp": 0.004, "min_commission_gbp": 0.79,
                                  "half_spread": 0.01, "slippage": 0.01, "fx_conversion_pct": 0.0002},
    "uk_etf_PLACEHOLDER": {"commission_pct": 0.0005, "min_commission_gbp": 3.0, "half_spread": 0.02, "slippage": 0.01},
    "spread_bet_index_PLACEHOLDER": {"half_spread": 0.2, "slippage": 0.3}
  },
  "instruments": {
    "SPY":  {"kind": "etf", "currency": "USD", "multiplier": 1.0, "min_size": 0.0001, "size_step": 0.0001,
             "fee_profile": "ibkr_us_fixed_PLACEHOLDER", "dividend_withholding_pct": 0.15},
    "US500_SB": {"kind": "spread_bet", "currency": "GBP", "multiplier": 1.0, "min_size": 0.5, "size_step": 0.1,
                 "fee_profile": "spread_bet_index_PLACEHOLDER"},
    "VHYL": {"kind": "etf", "currency": "GBP", "multiplier": 1.0, "min_size": 1.0, "size_step": 1.0,
             "fee_profile": "uk_etf_PLACEHOLDER"},
    "VUKE": {"kind": "etf", "currency": "GBP", "multiplier": 1.0, "min_size": 1.0, "size_step": 1.0,
             "fee_profile": "uk_etf_PLACEHOLDER"}
  },
  "fx": {"rates_gbp_per_unit": {"USD": 0.79}, "rates_as_of": "2026-11-02 PLACEHOLDER"},
  "sweep": {"multiple": 2.0, "stale_price_days": 7, "coins": [
    {"name": "silver_britannia_1oz", "metal": "silver", "price_gbp": 40.0, "shipping_gbp": 5.0, "vat_rate": 0.20, "price_as_of": "2026-11-02"},
    {"name": "gold_sovereign", "metal": "gold", "price_gbp": 600.0, "shipping_gbp": 10.0, "vat_rate": 0.0, "price_as_of": "2026-11-02"},
    {"name": "gold_britannia_1oz", "metal": "gold", "price_gbp": 2600.0, "shipping_gbp": 15.0, "vat_rate": 0.0, "price_as_of": "2026-11-02"}]},
  "topup": {"amount_gbp": 100.0, "start_month": "2027-02", "day_of_month": 1},
  "goal": {"target_gbp": 15000.0},
  "paths": {"journal": "runtime/journal.sqlite", "kill_switch": "runtime/KILL_SWITCH", "inbox": "runtime/inbox"}
}
```
JSON has no comments, so the placeholders are flagged in names and in `feasibility.md`. Coin prices are PLACEHOLDER (PLAN_GAP-5).

### 3.5 `trading/session.py`
```python
LONDON: ZoneInfo = ZoneInfo("Europe/London")
NEW_YORK: ZoneInfo = ZoneInfo("America/New_York")

@dataclass(frozen=True, slots=True)
class SessionWindow:
    trading_date: date
    start_utc: datetime              # NY open
    opening_range_end_utc: datetime  # start + opening_range_minutes
    entry_cutoff_utc: datetime       # end - entry_cutoff_minutes
    end_utc: datetime                # start + window_minutes
    flat_by_utc: datetime            # == end_utc
    dst_mismatch: bool
    def london_label(self) -> str    # e.g. "14:30-16:30 Europe/London"
    def contains(self, ts: datetime) -> bool   # start_utc <= ts < end_utc

def ny_open_utc(d: date, ny_open: str = "09:30") -> datetime
    """datetime.combine(d, time(hh, mm), tzinfo=NEW_YORK).astimezone(timezone.utc)."""
def is_dst_mismatch(d: date) -> bool
    """True if (London utcoffset − NY utcoffset) at 12:00 local on d != 5 hours."""
def session_window(d: date, cfg: SessionConfig) -> SessionWindow
def is_trading_day(d: date, holidays: frozenset[date] = frozenset()) -> bool
    """Mon–Fri and d not in holidays."""
```

### 3.6 `trading/fx.py`
```python
class FxConverter:
    def __init__(self, rates_gbp_per_unit: Mapping[str, float]) -> None
        """Copies rates; adds "GBP": 1.0. Rate <= 0 → FxError."""
    @classmethod
    def from_config(cls, cfg: TradingConfig) -> "FxConverter"
    def rate(self, ccy: str) -> float                       # FxError(f"no rate for {ccy}")
    def to_gbp(self, amount: float, ccy: str) -> float      # amount * rate(ccy)
    def conversion_cost_gbp(self, notional_gbp: float, ccy: str, cost_pct: float) -> float
        """0.0 if ccy == "GBP" else abs(notional_gbp) * cost_pct."""
```

### 3.7 `trading/fees.py`
```python
@dataclass(frozen=True, slots=True)
class FillCosts:
    fill_price: float
    commission_gbp: float
    stamp_duty_gbp: float
    fx_cost_gbp: float
    spread_slippage_gbp: float
    @property
    def total_fees_gbp(self) -> float   # commission + stamp + fx

def commission_gbp(profile: FeeProfile, quantity: float, notional_gbp: float) -> float
    """0.0 if quantity == 0. Else max(min_commission_gbp, quantity*commission_per_unit_gbp + abs(notional_gbp)*commission_pct) + commission_per_order_gbp."""
def stamp_duty_gbp(instrument: InstrumentSpec, action: Action, notional_gbp: float) -> float
    """instrument.stamp_duty_rate * abs(notional) if action == "buy" and instrument.kind == "share" else 0.0."""
def market_fill_price(mid: float, action: Action, profile: FeeProfile, apply_slippage: bool = True) -> float
    """buy: mid + half_spread + (slippage if apply_slippage); sell: mid − half_spread − (slippage if apply_slippage)."""
def fill_costs(instrument: InstrumentSpec, profile: FeeProfile, fx: FxConverter,
               action: Action, quantity: float, fill_price: float, mid_price: float) -> FillCosts
    """notional_gbp = fx.to_gbp(quantity*fill_price*multiplier, currency); commission, stamp, fx cost per functions above;
    spread_slippage_gbp = fx.to_gbp(quantity*abs(fill_price - mid_price)*multiplier, currency)."""
```

### 3.8 `trading/marketdata.py`
```python
CSV_COLUMNS: tuple[str, ...] = ("symbol","ts","open","high","low","close","volume","interval_seconds")

class MarketDataAdapter(ABC):
    @abstractmethod
    def symbols(self) -> tuple[str, ...]
    @abstractmethod
    def bars(self, symbol: str, start: datetime, end: datetime) -> list[Bar]
        """Bars with start <= bar.ts < end, ascending by ts. Unknown symbol → []. Naive start/end → ValueError."""
    def latest_price(self, symbol: str, at: datetime) -> float | None
        """close of the last bar with bar.end_ts <= at; None if none. Default impl uses bars(symbol, datetime.min UTC, at)."""

class InMemoryMarketData(MarketDataAdapter):
    def __init__(self, bars: Iterable[Bar]) -> None
        """Groups by symbol, sorts by ts. Duplicate (symbol, ts) → MarketDataError("duplicate bar ...")."""

class CsvMarketData(InMemoryMarketData):
    def __init__(self, path: Path) -> None
        """csv.DictReader. Header must contain CSV_COLUMNS (extra columns ignored) else MarketDataError(line_no=1).
        ts parsed by datetime.fromisoformat; naive → MarketDataError("naive timestamp", line_no). Bar ValueError → MarketDataError(str(e), line_no).
        volume empty → 0.0; interval_seconds empty → 300. line_no counts header as line 1."""
```

### 3.9 `trading/killswitch.py`
```python
class KillSwitch:
    def __init__(self, path: Path | None) -> None     # path None = memory-only (backtests)
    def is_active(self) -> bool
        """True if memory flag set, or path is not None and path.exists(). Any OSError during the check → True (fail closed)."""
    def activate(self, reason: str, ts: datetime) -> None
        """Sets memory flag; if path: mkdir(parents) and write f"{ts.isoformat()} {reason}\n" (append)."""
    def clear(self) -> None
        """Clears memory flag; unlinks file if it exists. Only called by the CLI (`killswitch off`), never by engine code."""
    def reason(self) -> str | None   # last reason from memory, else file contents stripped, else None
```

### 3.10 `trading/guards.py`
```python
FORBIDDEN_IMPORTS: frozenset[str] = frozenset({"socket","ssl","http","urllib","requests","httpx","aiohttp",
    "websocket","websockets","ib_insync","ibapi","smtplib","ftplib","telnetlib","xmlrpc"})
def assert_paper_mode(cfg: TradingConfig) -> None
    """Raise PaperOnlyViolation(f"mode={cfg.mode!r}; phase 1 is paper-only") if cfg.mode != "paper"."""
```

### 3.11 `trading/risk.py`
Reason codes are module constants, `str` values equal to their names:
`KILL_SWITCH_ACTIVE, MODE_NOT_PAPER, UNKNOWN_INSTRUMENT, INVALID_ENTRY_PRICE, NO_STOP, STOP_ZERO, STOP_WRONG_SIDE, STOP_TOO_TIGHT, TARGET_WRONG_SIDE, STALE_SIGNAL, SIGNAL_FROM_FUTURE, NO_SESSION_WINDOW, OUTSIDE_SESSION_WINDOW, SHORT_NOT_ALLOWED, DUPLICATE_POSITION, MAX_TRADES_PER_DAY, DAILY_LOSS_CAP_HIT, DAILY_LOSS_BUDGET_EXHAUSTED, FEES_EXCEED_BUDGET, SIZE_BELOW_MINIMUM`.
`FUTURE_TOLERANCE_SECONDS: int = 5`.

```python
@dataclass(frozen=True, slots=True)
class SizingBreakdown:
    budget_gbp: float; fixed_costs_gbp: float; risk_per_unit_gbp: float
    qty_by_risk: float; qty_by_notional: float; quantity: float; risk_gbp: float

class RiskEngine:
    def __init__(self, cfg: TradingConfig, kill_switch: KillSwitch, fx: FxConverter) -> None
    def evaluate(self, signal: Signal, account: AccountState, now: datetime,
                 window: SessionWindow | None) -> RiskDecision
    def size(self, signal: Signal, instrument: InstrumentSpec, account: AccountState) -> SizingBreakdown
    def daily_loss_gbp(self, account: AccountState) -> float      # max(0, day_start − fund_equity)
    def daily_cap_gbp(self, account: AccountState) -> float       # day_start * daily_loss_cap_pct
    def must_flatten_sleeve_a(self, now: datetime, window: SessionWindow | None,
                              account: AccountState) -> ExitReason | None
        """KILL_SWITCH if kill active; else DAILY_CAP if daily_loss >= cap − EPS; else TIME_FLAT if window is None or now >= window.flat_by_utc; else None."""
    def update_drawdown(self, equity_gbp: float, peak_gbp: float, now: datetime) -> bool
        """If peak > 0 and (peak − equity)/peak >= max_drawdown_kill_pct − EPS: kill_switch.activate("MAX_DRAWDOWN", now); return True. Else False."""
```

**`evaluate` algorithm (exact):**
`now` must be tz-aware (ValueError otherwise). `inst = cfg.instrument(signal.symbol)`.

Phase 1: collect **every** failing reason, in this order.
1. `KILL_SWITCH_ACTIVE` if `kill_switch.is_active()`.
2. `MODE_NOT_PAPER` if `cfg.mode != "paper"`.
3. `UNKNOWN_INSTRUMENT` if `inst is None`.
4. `INVALID_ENTRY_PRICE` if `signal.entry <= 0`.
5. `NO_STOP` if `signal.stop is None`. Only if a stop exists and the entry is > 0, compute `dist = abs(entry - stop)`:
   - `STOP_ZERO` if `dist <= 1e-12`.
   - else `STOP_WRONG_SIDE` if (LONG and stop > entry) or (SHORT and stop < entry).
   - else `STOP_TOO_TIGHT` if `dist < entry * min_stop_distance_pct`.
6. `TARGET_WRONG_SIDE` if target is not None and ((LONG and target <= entry) or (SHORT and target >= entry)).
7. `STALE_SIGNAL` if `(now - signal.ts).total_seconds() > max_signal_age_seconds`.
   `SIGNAL_FROM_FUTURE` if `(signal.ts - now).total_seconds() > FUTURE_TOLERANCE_SECONDS`.
8. If sleeve A: `NO_SESSION_WINDOW` if window is None. Otherwise `OUTSIDE_SESSION_WINDOW` if `now < window.opening_range_end_utc or now > window.entry_cutoff_utc`.
9. `SHORT_NOT_ALLOWED` if SHORT and inst is known and not `inst.can_short`. Also if SHORT and sleeve B.
10. `DUPLICATE_POSITION` if any `p in account.open_positions` with `p.symbol == signal.symbol and p.sleeve == signal.sleeve`.
11. `MAX_TRADES_PER_DAY` if `account.trades_today >= max_trades_per_day`.
12. `DAILY_LOSS_CAP_HIT` if `daily_loss_gbp >= daily_cap_gbp − EPS`.

If any reasons: return `RiskDecision(approved=False, reasons=tuple(reasons), quantity=0.0, risk_gbp=0.0, order=None)`.

Phase 2: sizing via `size()`. The first failure returns a rejection with a single reason.

`size()` formulas. Let `fxr = fx.rate(inst.currency)`, `m = inst.multiplier`, `p = cfg.fee_profile_for(symbol)`, `E = signal.entry`, `dist = |E − stop|`, `non_gbp = inst.currency != "GBP"`.
- `per_trade_budget = fund_equity * max_risk_per_trade_pct`
- `open_risk = Σ p.initial_risk_gbp for account.open_positions`
- `remaining = daily_cap − daily_loss − open_risk`
- `budget = min(per_trade_budget, remaining)`. If `budget <= EPS` → `DAILY_LOSS_BUDGET_EXHAUSTED`.
- `fixed = 2 * (p.min_commission_gbp + p.commission_per_order_gbp)`. If `budget − fixed <= EPS` → `FEES_EXCEED_BUDGET`.
- `N_u = E*m*fxr` (notional per unit, GBP)
- `stamp_u = N_u * inst.stamp_duty_rate if (LONG and inst.kind == "share") else 0`
- `per_unit_cost = 2*(p.half_spread + p.slippage)*m*fxr + 2*(p.commission_per_unit_gbp + N_u*p.commission_pct) + (2*N_u*p.fx_conversion_pct if non_gbp else 0) + stamp_u`
- `risk_per_unit = dist*m*fxr + per_unit_cost`
- `qty_by_risk = floor_to_step((budget − fixed)/risk_per_unit, inst.size_step)`
- `max_notional`:
  - Sleeve B: `account.sleeve_cash_gbp`.
  - Sleeve A: `account.sleeve_equity_gbp * lev − account.sleeve_open_notional_gbp`, where `lev = 1.0 if leverage_mode == "cash_only" else max_leverage`.
- `fixed_buy = p.min_commission_gbp + p.commission_per_order_gbp`
- `unit_buy = (E + p.half_spread + p.slippage)*m*fxr*(1 + inst.stamp_duty_rate*(kind=="share" and LONG) + p.commission_pct + (p.fx_conversion_pct if non_gbp else 0)) + p.commission_per_unit_gbp`
- `qty_by_notional = floor_to_step((max_notional − fixed_buy)/unit_buy, step)`, or 0.0 if `max_notional − fixed_buy <= 0`.
- `quantity = min(qty_by_risk, qty_by_notional, inst.max_size)`. If `quantity < inst.min_size − EPS` → `SIZE_BELOW_MINIMUM`.
- `risk_gbp = quantity*risk_per_unit + fixed` (guaranteed `<= budget + EPS`).

Approved: `OrderRequest(order_id=f"{signal.signal_id}-o", signal_id, symbol, side, quantity, entry_type=signal.entry_type, entry_price=signal.entry, stop_price=signal.stop, target_price=signal.target, sleeve, ts=now, expires_ts=(window.entry_cutoff_utc if sleeve A else None), config_version=cfg.version)`. Return `RiskDecision(approved=True, reasons=(), quantity, risk_gbp, order)`.

### 3.12 `trading/broker.py`
```python
class PaperBroker:
    def __init__(self, cfg: TradingConfig, fx: FxConverter, starting_cash_gbp: float,
                 journal: "TradeJournal | None" = None) -> None
        """Calls assert_paper_mode(cfg) FIRST (PaperOnlyViolation). starting_cash_gbp <= 0 → ValueError."""
    @property
    def cash_gbp(self) -> float
    def deposit(self, amount_gbp: float, ts: datetime) -> None            # amount <= 0 → ValueError
    def submit_bracket(self, order: OrderRequest, risk_gbp: float) -> None
        """OrderError if: quantity <= 0; stop_price <= 0; entry_price <= 0; unknown symbol; duplicate order_id;
        LONG and stop >= entry; SHORT and stop <= entry. Stores pending order (status PENDING, filled_qty 0).
        Journals order if journal set."""
    def cancel(self, order_id: str, ts: datetime) -> bool               # True if a pending/partial order was cancelled
    def cancel_all_pending(self, ts: datetime, sleeve: Sleeve | None = None) -> int
    def on_bar(self, bar: Bar) -> list[Fill]                              # rules below
    def flatten(self, marks: Mapping[str, float], ts: datetime, reason: ExitReason,
                sleeve: Sleeve | None = Sleeve.A) -> list[Fill]
        """Cancels pending orders of that sleeve (None = all), closes every open position of that sleeve at
        market_fill_price(mark, exit_action, profile). Missing mark → use position.entry_price as mid."""
    def open_positions(self, sleeve: Sleeve | None = None) -> tuple[Position, ...]   # copies
    def pending_orders(self) -> tuple[OrderRequest, ...]
    def order_status(self, order_id: str) -> OrderStatus                  # KeyError if unknown
    @property
    def closed_trades(self) -> tuple[ClosedTrade, ...]
    def unrealised_gbp(self, marks: Mapping[str, float]) -> float
        """Σ sign*qty*(mark − entry)*m*fxr; sign +1 long, −1 short; missing mark → 0 for that position."""
    def equity_gbp(self, marks: Mapping[str, float]) -> float           # cash + unrealised
    def open_notional_gbp(self, sleeve: Sleeve | None = None) -> float  # Σ qty*entry*m*fxr
```

**`on_bar(bar)` rules (exact).** Only orders and positions with `symbol == bar.symbol` are touched.

1. **Expiry:** pending orders with `expires_ts is not None and bar.ts >= expires_ts` → CANCELLED.
2. **Entries:** each pending/partial order with `bar.ts >= order.ts`. With `hs`, `slip` taken from the profile:
   - Trigger and mid-based fill:
     - MARKET: always triggers. LONG fill = `bar.open + hs + slip`. SHORT fill = `bar.open − hs − slip`.
     - STOP LONG at E: triggers if `bar.high + hs >= E`; fill = `max(E, bar.open + hs) + slip`. STOP SHORT: triggers if `bar.low − hs <= E`; fill = `min(E, bar.open − hs) − slip`.
     - LIMIT LONG at L: triggers if `bar.low + hs <= L`; fill = `min(L, bar.open + hs)`. LIMIT SHORT: triggers if `bar.high − hs >= L`; fill = `max(L, bar.open − hs)`.
   - **Entry past stop:** if (LONG and fill <= stop) or (SHORT and fill >= stop), set the order CANCELLED, produce no fill, and continue.
   - **Liquidity:** `remaining = qty − filled`. If `bar.volume <= 0`, `cap = remaining`. Else `cap = floor_to_step(bar.volume * participation_rate, step)`. `fill_qty = min(remaining, cap)`. If `fill_qty < min(remaining, inst.min_size) − EPS`, nothing fills this bar.
   - Costs come from `fill_costs(inst, profile, fx, "buy" if LONG else "sell", fill_qty, fill_price, mid=bar.open)`. The cash debit is `cash −= costs.total_fees_gbp`.
   - The position is created on the first fill (`position_id = order_id`) or extended (VWAP entry price, `quantity += fill_qty`, `entry_fees_gbp += fees`). `initial_risk_gbp = risk_gbp * position.quantity / order.quantity`.
   - Status becomes FILLED if `filled >= qty − EPS`, else PARTIALLY_FILLED. `Fill.is_partial = status == PARTIALLY_FILLED`.
3. **Exits** for each open position of the symbol. `exit_action = "sell" if LONG else "buy"`.
   - LONG:
     - `stop_hit = bar.low − hs <= stop`, `stop_px = min(stop, bar.open − hs) − slip`.
     - `tgt_hit = target and bar.high − hs >= target`, `tgt_px = max(target, bar.open − hs)`.
     - `gap_tgt = target and bar.open − hs >= target`.
   - SHORT:
     - `stop_hit = bar.high + hs >= stop`, `stop_px = max(stop, bar.open + hs) + slip`.
     - `tgt_hit = target and bar.low + hs <= target`, `tgt_px = min(target, bar.open + hs)`.
     - `gap_tgt = target and bar.open + hs <= target`.
   - If the position was opened in **this** bar: only check `stop_hit`.
   - Otherwise: if `gap_tgt` → target. Elif `stop_hit` → stop. Elif `tgt_hit` → target.
   - On exit: the full quantity closes. Fees come from `fill_costs`. `gross = sign*qty*(exit_px − entry_px)*m*fxr`. `cash += gross − exit_fees`. A `ClosedTrade` is created (`fees = entry_fees + exit_fees`, `net = gross − fees`) and journaled.
   - Any still-pending remainder of that position's entry order is CANCELLED. Exit reason is STOP or TARGET.
4. Return fills in creation order. `fill_id`: entries `f"{order_id}-f{n}"` (n from 1); exits `f"{position_id}-x"`.

### 3.13 `trading/journal.py`
```python
SCHEMA_SQL: str   # exact DDL below
class TradeJournal:
    def __init__(self, path: Path | str) -> None
        """":memory:" allowed; otherwise parent dirs created. PRAGMA foreign_keys=ON. Calls init_schema()."""
    def init_schema(self) -> None                         # idempotent (IF NOT EXISTS); meta schema_version=1
    def close(self) -> None
    def record_config(self, cfg: TradingConfig) -> None
        """INSERT version/hash/json. Same version + same hash → no-op. Same version + different hash → JournalError("config version reused with different content")."""
    def record_signal(self, signal: Signal, config_version: str) -> None   # duplicate signal_id → JournalError; also inserts features rows
    def record_decision(self, decision: RiskDecision, ts: datetime, config_version: str) -> int  # reasons stored json.dumps(list)
    def record_order(self, order: OrderRequest, status: OrderStatus) -> None
    def update_order_status(self, order_id: str, status: OrderStatus) -> None
    def record_fill(self, fill: Fill) -> None
    def record_trade(self, trade: ClosedTrade) -> None
    def upsert_daily_equity(self, d: date, start_equity: float, end_equity: float, realised: float,
                            unrealised: float, deposits: float, trades_count: int, config_version: str) -> None  # INSERT OR REPLACE
    def record_cash_flow(self, ts: datetime, kind: str, amount_gbp: float, note: str = "",
                         dedupe_key: str | None = None) -> bool   # kind ∈ {"initial","topup","dividend","sweep_withdrawal"} else ValueError; duplicate dedupe_key → False
    def sum_cash_flows(self, kind: str) -> float
    def cash_flow_dedupe_keys(self, prefix: str) -> set[str]
    def record_sweep_recommendation(self, ts: datetime, rec: "SweepRecommendation") -> int
    def open_sweep_recommendation_id(self) -> int | None
    def acknowledge_sweep(self, rec_id: int, actual_cost_gbp: float, ts: datetime) -> None   # unknown/already-acked → JournalError
    def sum_acknowledged_sweep_thresholds(self) -> float
    def record_kill_event(self, ts: datetime, action: str, reason: str) -> None
    def trades_between(self, start: datetime, end: datetime) -> list[ClosedTrade]   # closed_ts in [start, end), ordered by closed_ts
    def count(self, table: str) -> int            # table must be in the known table set else ValueError (no SQL injection)
    def decisions_for(self, signal_id: str) -> list[tuple[bool, tuple[str, ...]]]
    def daily_equity_rows(self) -> list[tuple[str, float, float]]   # (date, start, end) ordered
```
Every write runs in `with self._conn:`. `sqlite3.IntegrityError` is wrapped as `JournalError` (except the dedupe path, which returns False).

**DDL:**
```sql
CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS config_versions(version TEXT PRIMARY KEY, sha256 TEXT NOT NULL, json TEXT NOT NULL, loaded_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS signals(signal_id TEXT PRIMARY KEY, ts TEXT NOT NULL, symbol TEXT NOT NULL, side TEXT NOT NULL,
  entry_type TEXT NOT NULL, entry REAL NOT NULL, stop REAL, target REAL, sleeve TEXT NOT NULL, source TEXT NOT NULL,
  rationale TEXT NOT NULL, config_version TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS features(signal_id TEXT NOT NULL REFERENCES signals(signal_id), name TEXT NOT NULL, value REAL NOT NULL,
  PRIMARY KEY(signal_id, name));
CREATE TABLE IF NOT EXISTS decisions(decision_id INTEGER PRIMARY KEY AUTOINCREMENT, signal_id TEXT NOT NULL REFERENCES signals(signal_id),
  ts TEXT NOT NULL, approved INTEGER NOT NULL, reasons TEXT NOT NULL, quantity REAL NOT NULL, risk_gbp REAL NOT NULL, config_version TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS orders(order_id TEXT PRIMARY KEY, signal_id TEXT NOT NULL, ts TEXT NOT NULL, symbol TEXT NOT NULL, side TEXT NOT NULL,
  quantity REAL NOT NULL, entry_type TEXT NOT NULL, entry_price REAL NOT NULL, stop_price REAL NOT NULL, target_price REAL,
  status TEXT NOT NULL, sleeve TEXT NOT NULL, config_version TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS fills(fill_id TEXT PRIMARY KEY, order_id TEXT NOT NULL, ts TEXT NOT NULL, symbol TEXT NOT NULL, action TEXT NOT NULL,
  quantity REAL NOT NULL, price REAL NOT NULL, mid_price REAL NOT NULL, commission_gbp REAL NOT NULL, stamp_duty_gbp REAL NOT NULL,
  fx_cost_gbp REAL NOT NULL, spread_slippage_gbp REAL NOT NULL, is_partial INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS trades(trade_id TEXT PRIMARY KEY, position_id TEXT NOT NULL, symbol TEXT NOT NULL, side TEXT NOT NULL, sleeve TEXT NOT NULL,
  quantity REAL NOT NULL, entry_price REAL NOT NULL, exit_price REAL NOT NULL, opened_ts TEXT NOT NULL, closed_ts TEXT NOT NULL,
  gross_pnl_gbp REAL NOT NULL, fees_gbp REAL NOT NULL, net_pnl_gbp REAL NOT NULL, exit_reason TEXT NOT NULL, config_version TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS daily_equity(date TEXT PRIMARY KEY, start_equity REAL NOT NULL, end_equity REAL NOT NULL, realised_gbp REAL NOT NULL,
  unrealised_gbp REAL NOT NULL, deposits_gbp REAL NOT NULL, trades_count INTEGER NOT NULL, config_version TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS cash_flows(flow_id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL, kind TEXT NOT NULL, amount_gbp REAL NOT NULL,
  note TEXT NOT NULL, dedupe_key TEXT UNIQUE);
CREATE TABLE IF NOT EXISTS sweep_recommendations(rec_id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL, coin TEXT NOT NULL, metal TEXT NOT NULL,
  all_in_cost_gbp REAL NOT NULL, threshold_gbp REAL NOT NULL, eligible_profit_gbp REAL NOT NULL, price_stale INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('open','acknowledged')), actual_cost_gbp REAL, acknowledged_ts TEXT);
CREATE TABLE IF NOT EXISTS kill_switch_events(event_id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL, action TEXT NOT NULL, reason TEXT NOT NULL);
```
Timestamps are stored with `ts.astimezone(timezone.utc).isoformat()` and dates with `d.isoformat()`.

### 3.14 `trading/strategies/base.py` and `trading/strategies/orb.py`
```python
@dataclass(frozen=True, slots=True)
class StrategyContext:
    now: datetime
    window: SessionWindow
    open_symbols: frozenset[str]
    def has_open_position(self, symbol: str) -> bool

class Strategy(ABC):
    name: ClassVar[str]
    sleeve: ClassVar[Sleeve]
    @abstractmethod
    def on_session_start(self, d: date, window: SessionWindow) -> None
    @abstractmethod
    def on_bar(self, bar: Bar, ctx: StrategyContext) -> list[Signal]
```
```python
@dataclass(slots=True)
class _OrbState:
    or_high: float = -math.inf; or_low: float = math.inf; or_bars: int = 0; done: bool = False; skip: bool = False

class OpeningRangeBreakout(Strategy):
    name = "orb"; sleeve = Sleeve.A
    def __init__(self, cfg: SleeveAConfig, calendar: "EventCalendar | None" = None) -> None
    def on_session_start(self, d: date, window: SessionWindow) -> None
        """Reset _OrbState per cfg.symbols; skip = cfg.skip_event_days and calendar is not None and calendar.is_blackout(symbol, d, 0)."""
    def on_bar(self, bar: Bar, ctx: StrategyContext) -> list[Signal]
```
`on_bar` algorithm, in order:
1. Return `[]` if the symbol is not in `cfg.symbols`, if `st.skip` or `st.done`, or if `bar.ts < window.start_utc`.
2. If `bar.ts < window.opening_range_end_utc`: update `or_high = max(or_high, bar.high)`, `or_low = min(or_low, bar.low)`, `or_bars += 1`, and return `[]`.
3. If `st.or_bars == 0`: set `done = True` and return `[]`.
4. If `bar.end_ts > window.entry_cutoff_utc`: set `done = True` and return `[]`.
5. `rng = or_high − or_low`, `mid = (or_high + or_low)/2`. If `rng <= 0` or `rng/mid > cfg.max_or_range_pct`: set `done = True` and return `[]`.
6. If `ctx.has_open_position(symbol)`: return `[]`.
7. If `bar.close > or_high`: LONG, `entry = bar.close`, `stop = or_low`, `target = entry + R*(entry − stop)`.
   Elif `bar.close < or_low`: SHORT, `entry = bar.close`, `stop = or_high`, `target = entry − R*(stop − entry)`.
   Else return `[]`.
8. Set `done = True`. Return one `Signal`:
   - `signal_id = f"orb-{symbol}-{window.trading_date:%Y%m%d}-1"`, `ts = bar.end_ts`, `entry_type = MARKET`, `sleeve = A`, `source = "strategy:orb"`.
   - `rationale = f"close {bar.close} broke OR [{or_low},{or_high}]"`.
   - `features = {"or_high", "or_low", "or_range_pct": rng/mid, "breakout_close": bar.close, "minutes_since_open": (bar.end_ts − window.start_utc).total_seconds()/60}`.

### 3.15 `trading/backtest.py`
```python
@dataclass(frozen=True, slots=True)
class BacktestResult:
    trades: tuple[ClosedTrade, ...]
    daily_equity: tuple[tuple[date, float], ...]   # Sleeve A broker equity at end of each traded day
    n_signals: int
    n_rejected: int
    net_pnl_gbp: float
    fees_gbp: float
    win_rate: float          # wins(net>0)/n_trades; 0.0 if no trades
    max_drawdown_pct: float  # max over curve (incl. starting equity as first point) of (peak−eq)/peak
    final_equity_gbp: float

class Backtester:
    def __init__(self, cfg: TradingConfig, data: MarketDataAdapter, strategy: Strategy,
                 journal: TradeJournal | None = None, calendar: "EventCalendar | None" = None,
                 kill_switch: KillSwitch | None = None, fx: FxConverter | None = None,
                 other_sleeves_equity_gbp: float | None = None) -> None
        """starting cash = cfg.starting_capital_gbp * cfg.sleeve_a.allocation_pct; other_sleeves default = starting_capital*(1−alloc_a);
        kill_switch default KillSwitch(None); fx default FxConverter.from_config(cfg). Builds PaperBroker + RiskEngine. journal.record_config(cfg)."""
    def run(self, start: date, end: date) -> BacktestResult        # start > end → ValueError
    def run_day(self, d: date) -> None
```
`run_day` algorithm:
1. Skip unless `is_trading_day(d, calendar.holidays() if calendar else frozenset())`.
2. `window = session_window(d, cfg.session)`. `day_start = fund_equity()`, `trades_today = 0`, `halted = False`. Call `strategy.on_session_start(d, window)`.
3. Collect bars for every `cfg.sleeve_a.symbols` from `data.bars(sym, window.start_utc, window.end_utc)`. Merge and sort by `(ts, symbol)`.
4. For each bar:
   - a. `fills = broker.on_bar(bar)`. Update `marks[symbol] = bar.close`.
   - b. `eq = fund_equity()`. `peak = max(peak, eq)` after `risk.update_drawdown(eq, peak, bar.end_ts)`.
   - c. Build the AccountState. `reason = risk.must_flatten_sleeve_a(bar.end_ts, window, acct)`. If reason is KILL_SWITCH or DAILY_CAP and not halted: `broker.flatten(marks, bar.end_ts, reason)`, set `halted = True`, and journal a kill event if KILL_SWITCH. If reason is TIME_FLAT: flatten and `continue`.
   - d. If halted: `continue`. Otherwise `signals = strategy.on_bar(bar, StrategyContext(bar.end_ts, window, open symbols))`.
   - e. For each signal: `n_signals += 1`; journal the signal; `decision = risk.evaluate(signal, acct, bar.end_ts, window)`; journal the decision. If approved: `broker.submit_bracket(decision.order, decision.risk_gbp)` and `trades_today += 1`. Else `n_rejected += 1`.
5. After the bars: `broker.flatten(marks, window.flat_by_utc, ExitReason.TIME_FLAT, Sleeve.A)`. This is idempotent when already flat. Then `broker.cancel_all_pending(window.flat_by_utc)`. Append `(d, broker.equity_gbp(marks))`, and `journal.upsert_daily_equity(...)` with deposits 0.0.

`fund_equity() = broker.equity_gbp(marks) + other_sleeves_equity_gbp`. The AccountState for A is `sleeve_equity = broker.equity_gbp(marks)`, `sleeve_open_notional = broker.open_notional_gbp(Sleeve.A)`, `sleeve_cash = broker.cash_gbp`, `open_positions = broker.open_positions()`.

### 3.16 `trading/signal_inbox.py`
```python
ALLOWED_FIELDS: frozenset[str] = frozenset({"signal_id","ts","symbol","side","entry_type","entry","stop","target","sleeve","rationale","features","source"})
SIZE_FIELDS: frozenset[str] = frozenset({"quantity","qty","size","stake","units","notional"})
@dataclass(frozen=True, slots=True)
class InboxResult:
    path: Path            # final location after move
    signal: Signal | None
    error: str | None     # one of: INVALID_JSON, NOT_AN_OBJECT, QUANTITY_NOT_ALLOWED, UNKNOWN_FIELD:<k>, MISSING_FIELD:<k>, INVALID_TS, INVALID_VALUE:<k>
def read_inbox(inbox_dir: Path, move_files: bool = True) -> list[InboxResult]
```
Processing rules:
- Only `*.json` files, sorted by name. Creates `processed/` and `rejected/` subdirs.
- The first matching error wins, checked in this order: invalid JSON; top level not a dict; any SIZE_FIELDS key; any key not in ALLOWED_FIELDS (first in sorted order); missing one of `signal_id, ts, symbol, side, entry, sleeve` (first missing in that order); ts not ISO or naive; side not in {long, short}, sleeve not in {A, B}, entry not a number > 0, stop/target present but not a number, or `entry_type` not in EntryType values (default `"market"`).
- `stop` absent or null → `Signal.stop = None` (the risk engine rejects with NO_STOP). `source` is always overwritten with `"llm"`.
- Valid → move to `processed/`. Invalid → move to `rejected/` and write `rejected/<name>.error.txt` containing the error code.

### 3.17 `trading/sleeve_b/*`

**events.py**
```python
class EventType(str, Enum): EX_DIVIDEND="ex_dividend"; DIVIDEND_PAY="dividend_pay"; EARNINGS="earnings"; MACRO="macro"; MARKET_HOLIDAY="market_holiday"; EARLY_CLOSE="early_close"
@dataclass(frozen=True, slots=True)
class Event:
    d: date; type: EventType; symbol: str | None; amount: float | None; ref_date: date | None; note: str = ""
CALENDAR_COLUMNS = ("date","type","symbol","amount","ref_date","note")
class EventCalendar:
    def __init__(self, events: Iterable[Event]) -> None   # validates each: EX_DIVIDEND/DIVIDEND_PAY need symbol and amount>0; DIVIDEND_PAY needs ref_date; EARNINGS needs symbol → CalendarError
    @classmethod
    def from_csv(cls, path: Path) -> "EventCalendar"     # empty cells → None; bad date/type/amount → CalendarError(line_no); header line 1
    def events_on(self, d: date, types: Collection[EventType] | None = None) -> list[Event]
    def upcoming(self, d: date, days: int, types: Collection[EventType] | None = None) -> list[Event]   # d <= e.d <= d+days, sorted (d, type.value, symbol or "")
    def holidays(self) -> frozenset[date]                 # MARKET_HOLIDAY dates
    def is_blackout(self, symbol: str, d: date, days: int) -> bool
        """True if an EARNINGS event for symbol with |e.d − d| <= days, or any MACRO event (symbol None or == symbol) on exactly d."""
```

**portfolio.py**
```python
@dataclass(slots=True)
class Holding:
    symbol: str; quantity: float; avg_cost_gbp: float; stop_price_gbp: float
    triggered_tranches: set[int] = field(default_factory=set)
class DividendPortfolio:
    def __init__(self, cash_gbp: float) -> None             # < 0 → ValueError
    @property cash_gbp: float; @property realised_gbp: float
    def holdings(self) -> dict[str, Holding]                # deep copies
    def holding(self, symbol: str) -> Holding | None        # live object (manager mutates triggered_tranches)
    def deposit(self, amount_gbp: float) -> None            # <= 0 → ValueError
    def withdraw(self, amount_gbp: float) -> None           # <= 0 → ValueError; > cash + EPS → InsufficientCashError
    def buy(self, symbol: str, quantity: float, price_gbp: float, fees_gbp: float, stop_price_gbp: float | None) -> None
        """qty<=0 or price<=0 → ValueError. cost = qty*price + fees; cost > cash + EPS → InsufficientCashError (no state change).
        new avg = (old_qty*old_avg + qty*price + fees)/(old_qty+qty). stop: if stop_price_gbp is not None set it, else keep existing (new holding with None → ValueError)."""
    def sell(self, symbol: str, quantity: float, price_gbp: float, fees_gbp: float) -> float
        """Unknown symbol or qty > held + EPS → ValueError. proceeds = qty*price − fees; realised = proceeds − qty*avg;
        cash += proceeds; realised_gbp += realised; qty −= ; if qty <= EPS remove holding. Returns realised."""
    def credit_dividend(self, symbol: str, gross_gbp: float, withholding_pct: float) -> float
        """net = gross*(1−withholding); cash += net; pool[symbol] += net; return net. gross < 0 → ValueError."""
    def dividend_pool(self, symbol: str) -> float
    def consume_pool(self, symbol: str, amount_gbp: float) -> None   # pool −= amount (clamped at 0)
    def market_value(self, prices: Mapping[str, float]) -> float     # missing price for a held symbol → ValueError(f"no price for {s}")
    def unrealised_gbp(self, prices: Mapping[str, float]) -> float   # Σ qty*(price − avg)
    def equity(self, prices: Mapping[str, float]) -> float            # cash + market_value
```

**tranches.py**
```python
@dataclass(frozen=True, slots=True)
class TrancheAction: rule_index: int; quantity: float; gain_pct: float
def plan_profit_taking(holding: Holding, price_gbp: float, rules: Sequence[TrancheRule], size_step: float) -> list[TrancheAction]
    """price<=0 or holding.avg_cost_gbp<=0 → ValueError. gain = price/avg − 1. remaining = holding.quantity.
    For i, rule in enumerate(rules) ascending: if i in triggered → skip; if gain + EPS >= rule.gain_pct:
    q = floor_to_step(remaining*rule.sell_fraction, size_step); if q <= 0 → skip (NOT marked); else append, remaining −= q.
    Pure function: does not mutate holding (manager adds indices after executing)."""
```

**sweep.py**
```python
@dataclass(frozen=True, slots=True)
class SweepRecommendation:
    coin_name: str; metal: str; all_in_cost_gbp: float; threshold_gbp: float; eligible_profit_gbp: float
    price_as_of: date; price_stale: bool; action: str = "RECOMMEND_ONLY_MANUAL_PURCHASE"
def coin_all_in_cost(coin: CoinSpec) -> float                    # (price + shipping) * (1 + vat_rate)
def sweep_threshold(coin: CoinSpec, multiple: float) -> float     # multiple * all_in
def eligible_profit(fund_equity_gbp: float, total_contributions_gbp: float,
                    total_sweep_withdrawals_gbp: float, consumed_thresholds_gbp: float) -> float
    """fund_equity + withdrawals − contributions − consumed."""
def select_sweep(eligible_gbp: float, coins: Sequence[CoinSpec], multiple: float, today: date,
                 stale_days: int) -> SweepRecommendation | None
    """Among coins with threshold <= eligible + EPS pick the highest all-in cost (ties → first in order). None if none or eligible <= 0.
    price_stale = (today − coin.price_as_of).days > stale_days."""
class SweepTracker:
    def __init__(self, cfg: TradingConfig, journal: TradeJournal) -> None
    def evaluate(self, today: date, fund_equity_gbp: float, ts: datetime) -> SweepRecommendation | None
        """If journal.open_sweep_recommendation_id() is not None → None. contributions = sum_cash_flows("initial") + sum_cash_flows("topup");
        withdrawals = −sum_cash_flows("sweep_withdrawal") (stored negative); consumed = sum_acknowledged_sweep_thresholds().
        rec = select_sweep(...); if rec → journal.record_sweep_recommendation(ts, rec). Return rec. NEVER calls any purchase."""
    def acknowledge(self, rec_id: int, actual_cost_gbp: float, ts: datetime, portfolio: DividendPortfolio) -> None
        """portfolio.withdraw(actual_cost) FIRST (InsufficientCashError propagates, rec stays open); then journal.acknowledge_sweep
        and record_cash_flow(ts, "sweep_withdrawal", −actual_cost, dedupe_key=f"sweep:{rec_id}")."""
```

**manager.py**
```python
@dataclass(frozen=True, slots=True)
class SleeveBAction:
    kind: str   # "dividend_credit" | "drip_buy" | "protective_stop_sell" | "tranche_sell"
    symbol: str; quantity: float; price_gbp: float; amount_gbp: float; fees_gbp: float; note: str = ""
@dataclass(frozen=True, slots=True)
class SleeveBReport:
    d: date; actions: tuple[SleeveBAction, ...]; buy_signals: tuple[Signal, ...]
class SleeveBManager:
    def __init__(self, cfg: TradingConfig, portfolio: DividendPortfolio, calendar: EventCalendar,
                 kill_switch: KillSwitch, fx: FxConverter) -> None
    def daily_step(self, d: date, prices_gbp: Mapping[str, float], now: datetime) -> SleeveBReport
    def entitlements(self) -> dict[tuple[str, date], float]    # (symbol, ex_date) → qty snapshot
```
`daily_step` order:
1. **Ex-div snapshot:** for each EX_DIVIDEND on d, `entitlement[(sym, d)] = holding.quantity if held else 0.0`. This happens before any buy today.
2. **Pay:** for each DIVIDEND_PAY on d, `qty = entitlement.get((sym, e.ref_date), 0.0)`. If qty > 0: `net = portfolio.credit_dividend(sym, qty*e.amount, inst.dividend_withholding_pct)` → action `dividend_credit`.
3. **DRIP:** if `reinvest_dividends` and the kill switch is inactive, for each symbol with `pool > 0` and a price:
   - `fill = market_fill_price(price, "buy", profile)`
   - `unit = fill*m*(1 + stamp + pct) + per_unit`
   - `fixed = min_commission + per_order`
   - `qty = floor_to_step((pool − fixed)/unit, step)`
   - If `qty >= min_size`: compute `costs = fill_costs(...)` and `total = qty*fill + fees`. While `total > min(pool, cash) + EPS` and `qty > 0`: `qty −= step` and recompute (max 1000 iterations).
   - If `qty >= min_size`: `portfolio.buy(sym, qty, fill, fees, None)` (only if held; otherwise skip and keep the pool), `consume_pool(sym, total)`, action `drip_buy`.
4. **Protective stops:** for each holding with `price <= stop_price_gbp`: sell all at `market_fill_price(price, "sell", profile)` with fill_costs fees → action `protective_stop_sell`.
5. **Tranches:** for the remaining holdings with a price: `plan_profit_taking(...)`. Execute each sell at the market sell price, then add `rule_index` to `holding.triggered_tranches` → action `tranche_sell`.
6. **Buy signals:** only if the kill switch is inactive. Compute `sleeve_eq = portfolio.equity(prices)`. For each target:
   - Skip if `calendar.is_blackout(sym, d, earnings_blackout_days)`, if there is no price, or if `portfolio.cash_gbp < min_trade_gbp`.
   - Signal only if `mv_sym/sleeve_eq < weight − rebalance_band`.
   - Emit `Signal(signal_id=f"sleeveb-{sym}-{d:%Y%m%d}", ts=now, side=LONG, entry_type=MARKET, entry=price, stop=price*(1−protective_stop_pct), target=None, sleeve=B, source="sleeve_b")`.

### 3.18 `trading/topup.py`, `trading/forecast.py`, `trading/review.py`, `trading/daily.py`, `trading/cli.py`
```python
# topup.py
@dataclass(frozen=True, slots=True)
class TopUpCredit: due_date: date; amount_gbp: float; sleeve_a_gbp: float; sleeve_b_gbp: float
class TopUpScheduler:
    def __init__(self, amount_gbp: float, start_month: date, day_of_month: int, split_a: float) -> None
        """amount<=0, day not in 1..28, split_a not in [0,1], start_month.day != 1 → ValueError."""
    @classmethod
    def from_config(cls, cfg: TradingConfig) -> "TopUpScheduler"
    def due_dates(self, start: date, end: date) -> list[date]   # inclusive; dates = date(y, m, day_of_month) for months >= start_month
    def credit_for(self, due: date) -> TopUpCredit              # a = round(amount*split_a, 2); b = round(amount − a, 2)
    def pending(self, already_applied: Collection[date], today: date) -> list[TopUpCredit]
        """credits for due_dates(start_month, today) not in already_applied (catch-up of missed months), ascending."""

# forecast.py
@dataclass(frozen=True, slots=True)
class ForecastRow: start_gbp: float; annual_rate: float; months: int | None; years: float | None
def monthly_rate(annual_rate: float) -> float               # annual_rate <= −1 → ValueError; (1+a)**(1/12) − 1
def months_to_target(start_gbp: float, monthly_contribution_gbp: float, annual_rate: float,
                     target_gbp: float, max_months: int = 1200) -> int | None
    """start >= target → 0. For m in 1..max: bal = bal*(1+r) + contribution; if bal >= target − 1e-9 → m. Else None.
    Negative start/contribution → ValueError."""
def forecast_table(starts: Sequence[float] = (500.0, 625.0, 750.0), rates: Sequence[float] = (0.0, 0.05, 0.08, 0.12),
                   contribution: float = 100.0, target: float = 15000.0) -> list[ForecastRow]   # years = round(months/12, 1)
def goal_progress_pct(fund_equity_gbp: float, metal_cost_basis_gbp: float, target_gbp: float) -> float  # 100*(equity+metal)/target

# review.py
@dataclass(frozen=True, slots=True)
class ReviewStats: n_trades: int; win_rate: float; avg_win_gbp: float; avg_loss_gbp: float; expectancy_gbp: float
    profit_factor: float | None; net_pnl_gbp: float; max_consecutive_losses: int
@dataclass(frozen=True, slots=True)
class ReviewReport: week_end: date; stats: ReviewStats; sample_ok: bool; message: str
FORBIDDEN_PROPOSAL_PREFIXES: tuple[str, ...] = ("risk.", "mode", "paths.", "schema_version", "version")
def compute_stats(trades: Sequence[ClosedTrade]) -> ReviewStats
    """Empty → all zeros, profit_factor None. win = net > 0; loss = net <= 0. avg_loss is negative or 0.
    profit_factor = Σwins / |Σlosses| (None if Σlosses == 0). expectancy = net/n."""
def weekly_review(journal: TradeJournal, week_end: date, lookback_days: int = 90, min_trades: int = 30) -> ReviewReport
    """Trades closed in [week_end − lookback_days, week_end + 1 day) (UTC midnight). sample_ok = n >= min_trades;
    message "INSUFFICIENT_SAMPLE: n=<n> < <min>" or "OK: n=<n>"."""
def walk_forward_splits(days: Sequence[date], train_days: int, test_days: int) -> list[tuple[list[date], list[date]]]
    """Rolling: i = 0, step test_days; train = days[i:i+train], test = days[i+train:i+train+test]; stop when test window incomplete.
    train_days<1 or test_days<1 → ValueError."""
def write_proposal(config_dir: Path, base: TradingConfig, changes: Mapping[str, float | int | str | bool], reason: str) -> Path
    """Key matching FORBIDDEN_PROPOSAL_PREFIXES → ConfigError("review may not change <key>"). Dotted keys applied to config_to_dict(base);
    unknown path → ConfigError. next N = 1 + max N over v####.json and v####.proposed.json; set version f"v{N:04d}";
    config_from_dict() validation (ConfigError → no file written). Writes v{N:04d}.proposed.json with an extra top-level key
    NOT allowed (strict loader) → reason goes to sibling v{N:04d}.proposed.reason.txt. Never modifies existing files. Returns json path."""

# daily.py
@dataclass(slots=True)
class DailyContext:
    cfg: TradingConfig; journal: TradeJournal; broker: PaperBroker; portfolio: DividendPortfolio
    sleeve_b: SleeveBManager; risk: RiskEngine; topups: TopUpScheduler; sweep: SweepTracker; fx: FxConverter
@dataclass(frozen=True, slots=True)
class DailyCloseReport:
    d: date; topups: tuple[TopUpCredit, ...]; sleeve_b: SleeveBReport; decisions: tuple[RiskDecision, ...]
    sweep: SweepRecommendation | None; fund_equity_gbp: float
def ensure_initial_capital(ctx: DailyContext, ts: datetime) -> None
    """record_cash_flow(ts, "initial", cfg.starting_capital_gbp, dedupe_key="initial") (idempotent)."""
def run_daily_close(ctx: DailyContext, d: date, now: datetime, prices_gbp: Mapping[str, float],
                    sleeve_a_marks: Mapping[str, float], day_start_equity_gbp: float, peak_equity_gbp: float,
                    trades_today: int) -> DailyCloseReport
```
`run_daily_close` steps:
1. **Top-ups:** `applied = {date.fromisoformat(k[6:]) for k in journal.cash_flow_dedupe_keys("topup:")}`. For each credit in `topups.pending(applied, d)`: record `cash_flow(now, "topup", amount, dedupe_key=f"topup:{due.isoformat()}")`, `broker.deposit(a)` if a > 0, `portfolio.deposit(b)` if b > 0.
2. **Sleeve B:** `rep = sleeve_b.daily_step(d, prices_gbp, now)`. Each `dividend_credit` action is recorded as a cash_flow "dividend" with `dedupe_key=f"div:{symbol}:{d}"`.
3. **Buy signals:** for each signal, journal it, build an AccountState (fund = broker.equity(marks) + portfolio.equity(prices); sleeve = portfolio values; `open_positions = broker.open_positions()`), call `risk.evaluate(sig, acct, now, None)` and journal the decision. If approved: `fill = market_fill_price(price, "buy", profile)`, compute `costs`, `portfolio.buy(sym, qty, fill, fees, sig.stop)`, `trades_today += 1`.
4. **Fund equity:** `fund = broker.equity_gbp(marks) + portfolio.equity(prices)`.
5. **Sweep:** `sweep.evaluate(d, fund, now)`.
6. **Equity record:** `journal.upsert_daily_equity(d, day_start, fund, realised=portfolio.realised_gbp, unrealised=portfolio.unrealised_gbp(prices) + broker.unrealised_gbp(marks), deposits=Σtopups, trades_count=trades_today, cfg.version)`.

```python
# cli.py
def main(argv: Sequence[str] | None = None) -> int
```
Subcommands. `--config PATH` defaults to `load_active_config(trading_root()/"config")`.
- `forecast` prints a table, one row per start, with columns `0%  5%  8%  12%` in the format `£625: 12.0y 9.3y 8.3y 7.3y`. Exit 0.
- `killswitch {status,on,off} [--reason TEXT] [--kill-switch PATH]`. `status` prints `ACTIVE: <reason>` or `inactive`. `on` without `--reason` uses reason `"manual"`. Exit 0.
- `backtest --bars CSV --start YYYY-MM-DD --end YYYY-MM-DD [--journal PATH(default :memory:)] [--calendar CSV]` uses `OpeningRangeBreakout`. Prints `trades: N`, `net_pnl_gbp: X.XX`, `max_drawdown_pct: Y.YY`. Exit 0.
- Any `TradingError`/`ValueError` → message to stderr, exit 2. argparse errors exit 2 natively. **There is no live/execute command.**

### 3.19 `trading/tests/helpers.py`
```python
def utc(y: int, mo: int, d: int, h: int = 0, mi: int = 0) -> datetime         # tz=timezone.utc
def make_bar(symbol: str, ts: datetime, o: float, h: float, l: float, c: float, v: float = 0.0, interval: int = 300) -> Bar
TEST_OVERRIDES: dict[str, object]  # exact content below
def make_cfg(overrides: Mapping[str, object] | None = None) -> TradingConfig
    """config_from_dict(deep_merge(deep_merge(config_to_dict(default_config()), TEST_OVERRIDES), overrides or {}))"""
def make_signal(symbol: str = "TEST", side: Side = Side.LONG, entry: float = 100.0, stop: float | None = 95.0,
                target: float | None = None, ts: datetime | None = None, sleeve: Sleeve = Sleeve.A,
                signal_id: str = "sig-1") -> Signal          # ts default utc(2027,1,12,15,0); entry_type MARKET; source "test"
def make_account(fund: float = 625.0, day_start: float = 625.0, trades_today: int = 0,
                 positions: tuple[Position, ...] = (), sleeve_equity: float = 625.0,
                 sleeve_notional: float = 0.0, sleeve_cash: float = 625.0) -> AccountState   # peak = max(fund, day_start)
WINDOW_DAY: date = date(2027, 1, 12)     # standard-time Tuesday: window 14:30–16:30 UTC
```
`TEST_OVERRIDES`:
```python
{
 "fees": {"costs": {"half_spread": 0.05, "slippage": 0.05, "min_commission_gbp": 1.0},
          "usd": {"fx_conversion_pct": 0.005},
          "sb": {"half_spread": 0.2, "slippage": 0.1},
          "hifee": {"min_commission_gbp": 10.0}},
 "instruments": {
   "TEST":    {"kind": "share", "currency": "GBP", "min_size": 0.01, "size_step": 0.01, "fee_profile": "zero"},
   "TESTC":   {"kind": "share", "currency": "GBP", "min_size": 0.01, "size_step": 0.01, "fee_profile": "costs"},
   "TESTW":   {"kind": "share", "currency": "GBP", "min_size": 1.0, "size_step": 1.0, "fee_profile": "zero"},
   "TESTF":   {"kind": "share", "currency": "GBP", "min_size": 0.0001, "size_step": 0.0001, "fee_profile": "zero"},
   "TESTUK":  {"kind": "share", "currency": "GBP", "min_size": 0.01, "size_step": 0.01, "fee_profile": "zero", "stamp_duty_rate": 0.005},
   "TESTUSD": {"kind": "share", "currency": "USD", "min_size": 0.01, "size_step": 0.01, "fee_profile": "usd"},
   "TESTCFD": {"kind": "cfd", "currency": "GBP", "min_size": 0.01, "size_step": 0.01, "fee_profile": "zero"},
   "TESTHF":  {"kind": "share", "currency": "GBP", "min_size": 0.01, "size_step": 0.01, "fee_profile": "hifee"},
   "SB":      {"kind": "spread_bet", "currency": "GBP", "min_size": 0.5, "size_step": 0.1, "fee_profile": "sb"},
   "DIVA":    {"kind": "etf", "currency": "GBP", "min_size": 0.01, "size_step": 0.01, "fee_profile": "zero"},
   "DIVW":    {"kind": "etf", "currency": "GBP", "min_size": 1.0, "size_step": 1.0, "fee_profile": "uk_etf_PLACEHOLDER"}},
 "sleeve_a": {"symbols": ["TEST"], "max_or_range_pct": 0.05},
 "sleeve_b": {"targets": [{"symbol": "DIVA", "weight": 0.6}], "min_trade_gbp": 50.0},
 "fx": {"rates_gbp_per_unit": {"USD": 0.8}}
}
```

### 3.20 `trading/docs/feasibility.md`: required content
Header: "Phase-1 research notes, not financial or tax advice. Every line tagged **[VERIFY]** must be confirmed with the broker/HMRC/gov.uk before acting. Figures as understood at 2026-11-02."

Sections, with these facts and tags:
1. **Capital & constraints.**
   - £625 default (range £500–£750). 3% risk = £18.75 per trade. Daily cap £18.75.
   - The LISA (£8k) is excluded entirely.
   - Worked example: at £625, an index spread bet at the minimum stake (e.g. £0.50/pt on US 500 at ~6,000 pts ≈ £3,000 notional) is ~5× leverage, so **cash-only mode cannot trade index spread bets at all**. The risk engine returns SIZE_BELOW_MINIMUM [VERIFY min stakes].
2. **Costs.**
   - IBKR UK: US shares fixed ~$0.005/share, min ~$1.00, max 1% of trade value; tiered ~$0.0035, min $0.35. UK shares ~0.05%, min ~£3 (fixed) [VERIFY]. FX conversion ~0.2 bp, min ~$2 [VERIFY]. Market-data subscription fees [VERIFY].
   - Spread betting (IG/CMC/Pepperstone): costs are in the spread (US 500 ~0.4–1 pt, FTSE 100 ~1 pt in core hours), no commission, overnight funding ~benchmark ±2.5–3% p.a. (Sleeve A never holds overnight). Guaranteed stops cost extra [VERIFY].
   - Commission-free apps: FX fee ~0.15% [VERIFY].
   - Cost-drag example: 3 round trips/day × 21 days × ~£1.60 ≈ £100/month ≈ 16% of £625 per month. Conclusion: Sleeve A is uneconomic live at this size unless trades are rare and/or costs are spread-only.
3. **UK tax** (all [VERIFY]):
   - CGT annual exempt amount £3,000. Rates 18% / 24% (since 30 Oct 2024).
   - Spread-bet profits are generally exempt from CGT and income tax, and losses are not relievable. This is unless HMRC deems trading your main income.
   - CFDs: CGT applies, losses relievable, no stamp duty.
   - Stamp duty/SDRT 0.5% on purchases of UK shares. ETFs are exempt (UK-domiciled), as are AIM shares. Irish shares 1%. US shares carry no UK stamp duty.
   - Dividend allowance £500. Dividend tax rates changed from April 2026 (believed 10.75% basic / 35.75% higher / 39.35% additional).
   - US dividend withholding 15% with a W-8BEN.
   - ISA: £20k overall allowance with the LISA's £4k inside it. A Stocks & Shares ISA removes CGT/dividend tax for Sleeve B (PLAN_GAP-3). Spread bets cannot go in an ISA. Cash-ISA limit changes are announced from April 2027.
   - LISA: a 25% government withdrawal charge on unauthorised withdrawals (≈6.25% loss of own money). Exempt cases: first home ≤ £450k, age 60+, terminal illness. Reform/replacement proposals have been discussed; check gov.uk.
   - Self Assessment reporting thresholds.
4. **Gold & silver** (all [VERIFY]):
   - Britannias and Sovereigns are UK legal tender, so they are CGT-exempt.
   - Investment gold (coins ≥ 90% purity minted after 1800 and recognised legal tender, bars ≥ 995) is VAT-exempt under VAT Notice 701/21.
   - Silver coins and bars carry 20% VAT, except secondary-market stock sold under the margin scheme at some dealers.
   - Non-legal-tender coins (e.g. Krugerrand) and gold ETCs fall under CGT.
   - Dealer buy/sell spreads of 3–10% on small coins.
   - The sweep threshold rule and its worked example (silver £40 + £5 → £54 all-in → £108 threshold).
   - A gold Britannia is likely unreachable at this fund size. Coin prices in config are PLACEHOLDERS.
5. **Comparison table: IBKR UK (margin/cash) vs spread betting.** Rows:
   - Tax treatment
   - Minimum position size
   - Fractional shares
   - Leverage: IBKR Reg-T-style margin; FCA retail CFD/SB caps of 30:1 major FX, 20:1 major indices/gold, 10:1 other commodities/silver, 5:1 individual shares; 50% margin close-out; negative balance protection [VERIFY]
   - Shorting
   - Overnight cost
   - Pattern-day-trader rule: FINRA $25k PDT applies to IBKR margin accounts trading US securities; FINRA rule changes have been proposed/approved [VERIFY current status]; cash accounts avoid PDT but must use settled funds (US T+1; UK moving to T+1 in Oct 2027 [VERIFY])
   - ISA eligibility
   - Counterparty model: exchange vs market maker
   - Gap risk and guaranteed stops
   - API availability (phase 2)
   - Retail loss disclosure: providers state that ~60–80% of retail CFD accounts lose money [VERIFY current %]
   - US ETF access: PRIIPs/CCI [VERIFY] (PLAN_GAP-4)
6. **Realistic return ranges.**
   - Global equities long-run nominal ~5–8%/yr with drawdowns of 20–50% possible. UK equity income yield ~3.5–4.5%.
   - Retail day trading: studies (e.g. Barber, Lee, Liu & Odean on Taiwan; Chague, De-Losso & Giovannetti on Brazil, where ~97% of persistent day traders lost money) and broker disclosures show most lose after costs.
   - Planning assumption: Sleeve A expected return 0% (or negative) after costs. 5–8% for Sleeve B is optimistic but plausible. 12% is the stretch case.
7. **Forecast.** A table built from `forecast_table()`, in years and months:

| Start | 0% | 5% | 8% | 12% |
|---|---|---|---|---|
| £500 | 12.1y (145) | 9.4y (113) | 8.4y (101) | 7.4y (89) |
| £625 | 12.0y (144) | 9.3y (112) | 8.3y (100) | 7.3y (88) |
| £750 | 11.9y (143) | 9.2y (110) | 8.2y (98) | 7.2y (87) |

   - Method: effective-annual rate compounded monthly, £100 credited at month end. Month 1 is Feb 2027, so 144 months ≈ Jan 2039.
   - Idle Nov 2026–Jan 2027 growth is ignored.
   - Nominal terms: £15k in ~2039 is ≈ £11k in today's money at 2.5% inflation.
   - Key insight: contributions supply ~£14k of the £15k. Moving from 0% to 12% saves ~4.7 years. Raising the top-up moves the date more than any strategy.
8. **[VERIFY] checklist**: one bullet per tagged fact, with the authority to check (broker fee page, HMRC manual/gov.uk page name).

### 3.21 `trading/docs/architecture.md`: required content
1. Component list (every module in §2) and an ASCII data-flow diagram matching §4.
2. **Golden rule:** deterministic code executes; the LLM never places orders. Enforcement points:
   - The LLM's only write location is `runtime/inbox/` (and `runtime/reviews/` for notes).
   - The inbox schema forbids size fields.
   - Every signal passes `RiskEngine.evaluate` (veto) and is journaled with its reasons.
   - No credentials exist in phase 1. No live broker class exists, and a test enforces this.
   - Proposals cannot touch `risk.*` or `mode`.
3. **Risk engine:** the rules, reason codes and sizing formula (copy from §3.11).
4. **Kill switch:** a file at `runtime/KILL_SWITCH` or an in-memory flag. Fail-closed on OSError. Auto-tripped at 15% drawdown from peak. Effects: Sleeve A flattened, pending orders cancelled, all buys including DRIP blocked, exits still allowed. Cleared only by a human via `python3 -m trading.cli killswitch off`.
5. **Paper-only guard:** the three layers from §1.
6. **Learning loop:** every signal, feature, decision, order, fill, trade and daily equity row is journaled with `config_version`. There is **no daily retraining**.
   - Saturday 09:00 London: `weekly_review` with a minimum of 30 trades (otherwise INSUFFICIENT_SAMPLE and no proposal).
   - Walk-forward splits (train 60 / test 20 trading days suggested). A proposal is written only if out-of-sample improves.
   - `write_proposal` → `vNNNN.proposed.json`. A human reviews and renames it to activate. The old versions stay immutable.
   - The LLM may write review notes, never configs directly.
7. **Scheduling** (Europe/London, normal weeks):

| Time | Job |
|---|---|
| 14:00 | Pre-flight: load active config, check kill switch, check data |
| 14:30 | NY open; opening range starts |
| 14:45 | Opening range ends |
| 16:00 | Entry cutoff |
| 16:30 | Sleeve A flat |
| 17:00 | Daily close job (Sleeve B on LSE closes, top-ups, sweep, equity) |
| Sat 09:00 | Weekly review |

   - The window is always computed from America/New_York 09:30 via zoneinfo. In **DST mismatch weeks** (US clocks change 2nd Sunday of March / 1st Sunday of November; UK changes last Sunday of March / last Sunday of October) the window runs 13:30–15:30 London.
   - Examples: 26–30 Oct 2026, 15–26 Mar 2027, 1–5 Nov 2027.
   - US holidays/early closes come from calendar data. Early closes (13:00 NY) do not affect the 09:30–11:30 window.
8. **Failure modes:** missing bars → no signal; stale signal → reject; exceptions in the loop → activate the kill switch (the phase-2 runner must wrap its loop accordingly); journal failure → stop trading.
9. **Phase-2 roadmap** (not built): a live adapter behind a separate review, real data feed, ISA decision.

---

## 4. Data Flow

**Sleeve A (backtest = paper path):**
`CsvMarketData/InMemoryMarketData` → `Backtester.run_day` (bars merged by `(ts, symbol)`, restricted to `session_window`) → `PaperBroker.on_bar` (entries, then exits) → marks/equity → `RiskEngine.must_flatten_sleeve_a` / `update_drawdown` → `OpeningRangeBreakout.on_bar` → `Signal` → `journal.record_signal` → `RiskEngine.evaluate` (veto + sizing) → `journal.record_decision` → (approved) `PaperBroker.submit_bracket` → fills/trades journaled → end of day: flatten, cancel, `upsert_daily_equity`.

**LLM path:**
LLM writes `runtime/inbox/*.json` → `read_inbox` (schema; size fields rejected) → `Signal(source="llm")` → **same** `RiskEngine.evaluate` → broker. The LLM never imports or calls the broker.

**Daily close (17:00 London):**
`run_daily_close` → `TopUpScheduler.pending` (dedupe via journal) → deposits into the broker and portfolio → `SleeveBManager.daily_step` (ex-div snapshot → dividend credit → DRIP → protective stops → tranches → buy signals) → `RiskEngine.evaluate` for buy signals → `DividendPortfolio.buy` → fund equity → `SweepTracker.evaluate` (recommendation only) → `upsert_daily_equity`.

**Weekly:**
`weekly_review(journal)` → `ReviewReport` → (human or LLM decides changes) → `write_proposal` → human renames → `load_active_config` picks it up on the next run.

**State:**
- In memory: broker positions/cash, portfolio holdings/cash, strategy per-day state, kill-switch memory flag.
- Persistent: SQLite journal and kill-switch file. Config files are immutable once active.
- Phase 1 does not rebuild broker state from the journal (backtests start fresh). Documented as a phase-2 item.

**Error propagation:**
- `ConfigError` is raised at load. The CLI catches it and exits 2.
- `MarketDataError`/`CalendarError` are raised at construction. The CLI catches them and exits 2.
- The risk engine **never raises** for business rules; it returns a `RiskDecision`. It raises `ValueError` only for a naive `now`.
- `PaperBroker` raises `PaperOnlyViolation` (init) or `OrderError` (malformed order). These are programming errors: `Backtester` does not catch them, so the test or CLI fails loudly.
- `JournalError` propagates up and trading stops.
- `InsufficientCashError` in DRIP cannot occur, because the loop guarantees `total <= cash`. In `SweepTracker.acknowledge` it propagates to the caller and the recommendation stays open.
- Inbox errors never raise; they become an `InboxResult.error` plus a file in `rejected/`.

---

## 5. Edge Cases & Error Handling

IDs are referenced in §6.

### mathutil
| ID | Scenario | Input | Expected Behavior |
|---|---|---|---|
| M1 | Fractional step | floor_to_step(3.90625, 0.01) | 3.9 |
| M2 | Float noise | floor_to_step(2.9999999999, 1.0) | 3.0 |
| M3 | Zero/negative step | floor_to_step(5, 0) | ValueError |
| M4 | Negative value | floor_to_step(-1, 0.1) | 0.0 |
| M5 | Below one step | floor_to_step(0.12499, 0.1) | 0.1 |

### models
| ID | Scenario | Input | Expected Behavior |
|---|---|---|---|
| MO1 | Naive bar ts | Bar(ts=datetime(2027,1,12,14,30)) | ValueError |
| MO2 | high < low | o=100,h=99,l=101,c=100 | ValueError |
| MO3 | end_ts | ts 14:30 UTC, interval 300 | end_ts 14:35 UTC |
| MO4 | Negative volume | v=-1 | ValueError |

### config
| ID | Scenario | Input | Expected Behavior |
|---|---|---|---|
| C1 | Live mode | mode "live" | ConfigError |
| C2 | Risk > 3% | max_risk_per_trade_pct 0.031 | ConfigError |
| C3 | Daily cap > 3% | daily_loss_cap_pct 0.05 | ConfigError |
| C4 | Cash mode with leverage | cash_only, max_leverage 2.0 | ConfigError |
| C5 | Leverage too high | leveraged, max_leverage 6.0 | ConfigError |
| C6 | Typo key | risk.max_risk_pct 0.02 | ConfigError "unknown key: risk.max_risk_pct" |
| C7 | Allocation sum | A 0.5, B 0.4 | ConfigError |
| C8 | Missing fee profile | instrument fee_profile "nope" | ConfigError |
| C9 | Missing FX rate | instrument currency "EUR" | ConfigError |
| C10 | Gold with VAT | gold coin vat_rate 0.2 | ConfigError |
| C11 | Top-up day 29 | topup.day_of_month 29 | ConfigError |
| C12 | Zero capital | starting_capital_gbp 0 | ConfigError |
| C13 | Tranche sum > 1 | fractions 0.6 + 0.6 | ConfigError |
| C14 | Tranche order | gains 0.5 then 0.25 | ConfigError |
| C15 | Spread bet USD | kind spread_bet, currency USD | ConfigError |
| C16 | Stamp on ETF | etf stamp_duty_rate 0.005 | ConfigError |
| C17 | Version/filename mismatch | file v0002.json containing version "v0001" | ConfigError |
| C18 | Active version selection | dir with v0001.json, v0002.json, v0003.proposed.json | loads v0002 |
| C19 | No configs | empty dir | ConfigError |
| C20 | Invalid JSON | "{" | ConfigError |
| C21 | Hash stability | same cfg twice | identical sha256 |

### session
| ID | Scenario | Input | Expected Behavior |
|---|---|---|---|
| S1 | Winter normal | 2027-01-12 | start 14:30 UTC, end 16:30 UTC, label "14:30-16:30 Europe/London", mismatch False |
| S2 | Summer normal | 2027-06-15 | start 13:30 UTC, London label "14:30-16:30", mismatch False |
| S3 | Spring mismatch | 2027-03-15 | start 13:30 UTC, label "13:30-15:30 Europe/London", mismatch True |
| S4 | Autumn mismatch | 2026-10-27 | start 13:30 UTC, label "13:30-15:30", mismatch True |
| S5 | After both changed | 2026-11-02 | start 14:30 UTC, mismatch False |
| S6 | Derived times | 2027-01-12 | OR end 14:45, cutoff 16:00, flat_by 16:30 UTC |
| S7 | Weekend | 2027-01-16 (Sat) | is_trading_day False |
| S8 | Holiday | 2027-01-18 in holidays | False |

### fx / fees
| ID | Scenario | Input | Expected Behavior |
|---|---|---|---|
| F1 | GBP no FX cost | conversion_cost_gbp(1000,"GBP",0.005) | 0.0 |
| F2 | USD FX cost | to_gbp(100,"USD") at 0.8; cost(80,"USD",0.005) | 80.0; 0.4 |
| F3 | Unknown currency | rate("JPY") | FxError |
| F4 | Non-positive rate | FxConverter({"USD": 0}) | FxError |
| F5 | Min commission binds | profile min 1, pct 0.0005; qty 10, notional 1000 | 1.0 |
| F6 | Pct binds | same profile, notional 4000 | 2.0 |
| F7 | Zero qty | qty 0 | 0.0 |
| F8 | Stamp on UK share buy | TESTUK buy notional 1000 | 5.0; sell → 0.0 |
| F9 | Fill prices | mid 100, hs .05, slip .05 | buy 100.1, sell 99.9, buy without slip 100.05 |

### marketdata
| ID | Scenario | Input | Expected Behavior |
|---|---|---|---|
| D1 | CSV parse | 3 valid rows | 3 bars, ascending |
| D2 | Naive ts in CSV | row 3 ts "2027-01-12T14:30:00" | MarketDataError, str contains "line 3" |
| D3 | Bad OHLC in CSV | row 2 high < low | MarketDataError "line 2" |
| D4 | Duplicate bar | same symbol+ts twice | MarketDataError |
| D5 | Half-open range | bars at 14:30, 14:35, 14:40; query [14:30, 14:40) | 2 bars |
| D6 | Unknown symbol | bars("NOPE", ...) | [] |
| D7 | Latest price | at 14:40 with bars 14:30, 14:35 | close of 14:35 bar |
| D8 | Missing header column | no "close" | MarketDataError line 1 |
| D9 | Unsorted input | bars given out of order | returned sorted |

### killswitch
| ID | Scenario | Input | Expected Behavior |
|---|---|---|---|
| K1 | Default | tmp path not existing | is_active False |
| K2 | File present | touch path | True |
| K3 | Activate writes | activate("test", ts) | file exists, contains "test", reason() == "test" |
| K4 | Clear | after activate, clear() | False, file gone |
| K5 | Memory only | KillSwitch(None).activate | True |
| K6 | OSError fail-closed | Path.exists raises PermissionError (mock) | True |

### guards
| ID | Scenario | Input | Expected Behavior |
|---|---|---|---|
| G1 | Non-paper broker | cfg replaced mode "live" → PaperBroker | PaperOnlyViolation |
| G2 | No network imports | AST scan of trading/**/*.py excluding tests | no FORBIDDEN_IMPORTS |
| G3 | No live classes/files | AST scan | no ClassDef name containing "Live"; no filename containing "live" |
| G4 | assert_paper_mode ok | default cfg | no exception |

### risk (base: make_account() fund 625, cash_only; signal TEST long entry 100 stop 95 at now = signal ts = 2027-01-12 15:00 UTC; window = session_window(2027-01-12))
| ID | Scenario | Input | Expected Behavior |
|---|---|---|---|
| R1 | Happy path sizing | base | approved, qty 3.75, risk 18.75, order.stop 95, expires_ts 16:00 UTC |
| R2 | No stop | stop None | rejected, "NO_STOP" in reasons, qty 0 |
| R3 | Zero stop distance | stop 100 | rejected, reasons contain "STOP_ZERO" but not "STOP_WRONG_SIDE" |
| R4 | Stop wrong side | long stop 101 | "STOP_WRONG_SIDE" |
| R5 | Stop too tight | stop 99.97 | "STOP_TOO_TIGHT" |
| R6 | Costs included | TESTC | qty 3.22, risk ≈ 18.744 ≤ 18.75 |
| R7 | FX cost | TESTUSD | qty 3.9, risk ≈ 18.72 |
| R8 | Whole shares | TESTW | qty 3.0, risk 15.0 |
| R9 | Fractional shares | TESTF entry 100 stop 93 | qty 2.6785, risk ≈ 18.7495 |
| R10 | Daily cap hit | fund 606.25, day_start 625 | "DAILY_LOSS_CAP_HIT" |
| R11 | Partial daily budget | fund 615 | approved, qty 1.75, risk 8.75 |
| R12 | Open risk consumes budget | position (other symbol TESTC, initial_risk 15) | qty 0.75 |
| R13 | Budget exhausted | fund 625, open risk 18.75 | sole reason "DAILY_LOSS_BUDGET_EXHAUSTED" |
| R14 | Max trades | trades_today 3 | "MAX_TRADES_PER_DAY" |
| R15 | Kill switch | ks activated | "KILL_SWITCH_ACTIVE" |
| R16 | Outside window (after cutoff) | now = signal ts = 16:05 UTC | "OUTSIDE_SESSION_WINDOW" |
| R17 | During opening range | now = ts = 14:40 | "OUTSIDE_SESSION_WINDOW" |
| R18 | No window for A | window None | "NO_SESSION_WINDOW" |
| R19 | Stale | ts 14:57, now 15:00 (180 s) | "STALE_SIGNAL" |
| R20 | Future | ts 15:00:10, now 15:00 | "SIGNAL_FROM_FUTURE" |
| R21 | Short share | TEST short entry 100 stop 105 | "SHORT_NOT_ALLOWED" |
| R22 | Short CFD | TESTCFD short entry 100 stop 105 | approved, qty 3.75 |
| R23 | Duplicate position | open Position TEST sleeve A | "DUPLICATE_POSITION" |
| R24 | Unknown instrument | symbol "NOPE" | "UNKNOWN_INSTRUMENT" |
| R25 | Spread bet cash-only | SB entry 5000 stop 4990 | "SIZE_BELOW_MINIMUM" |
| R26 | Spread bet leveraged ×5 | same, leveraged 5.0 | approved, qty 0.6, risk ≈ 6.36 |
| R27 | Fees exceed budget | TESTHF | "FEES_EXCEED_BUDGET" |
| R28 | Multiple reasons | stop None + trades_today 3 + kill switch | reasons == ("KILL_SWITCH_ACTIVE","NO_STOP","MAX_TRADES_PER_DAY") |
| R29 | Target wrong side | long target 99 | "TARGET_WRONG_SIDE" |
| R30 | Notional cap binds | stop 98, sleeve_equity 312.5 | qty 3.12 (312.5/100 → 3.125 → 3.12), risk 6.24 |
| R31 | Sleeve B cash cap | sleeve B, stop 80, sleeve_cash 50, window None | approved, qty 0.5 |
| R32 | Drawdown kill | update_drawdown(531.25, 625) | True, kill switch active |
| R33 | Drawdown below threshold | update_drawdown(540, 625) | False |
| R34 | Flatten reasons | now 16:30 → TIME_FLAT; ks → KILL_SWITCH; fund 606.25 → DAILY_CAP; 15:00 normal → None | as listed |
| R35 | Naive now | now naive | ValueError |
| R36 | Invalid entry | entry 0 | "INVALID_ENTRY_PRICE" |

### broker (cash 625; TEST zero-cost unless noted; order long qty 3.75, entry 100, stop 95, target 110, submitted ts 14:50 UTC; bars at 14:50+)
| ID | Scenario | Input | Expected Behavior |
|---|---|---|---|
| B1 | Market entry fill | bar o100 h101 l99 c100.5 | 1 fill buy 3.75 @100, position open |
| B2 | Target hit | next bar o101 h111 l100.5 c110.5 | exit @110, gross 37.5, TARGET, cash 662.5 |
| B3 | Gap through stop | next bar o90 h91 l88 c89 | exit @90, net −37.5 (> 18.75 planned), STOP |
| B4 | Stop & target same bar | next bar o101 h111 l94 c100 | exit @95, STOP |
| B5 | Gap beyond target | next bar o112 h113 l111 c112 | exit @112, TARGET |
| B6 | Same-bar entry and stop | entry bar o100 h111 l94 c96 | entry @100, exit @95 same bar; target not taken |
| B7 | Entry past stop | entry bar o94 h96 l93 c95 | order CANCELLED, no fills, no position |
| B8 | Partial fill | order 3.75; bars v=20 (o100) then v=20 (o101) | fills 2.0 (is_partial True), 1.75 (False); VWAP ≈ 100.466667; FILLED |
| B9 | Zero volume = full | v=0 | full 3.75 fill |
| B10 | Liquidity below min | TESTW order qty 3, v=5 (cap 0.5→0) | no fill this bar, PENDING |
| B11 | Expiry | expires_ts 15:00, bar at 15:00 | CANCELLED, no fill |
| B12 | Bar before order ts | bar ts 14:45 (< 14:50) | ignored, PENDING |
| B13 | Short profit | TESTCFD short 3.75 @100 stop 105 target 90; bar o99 h99.5 l89 c90 | exit @90, gross 37.5 |
| B14 | Short gap stop | short; bar o110 h111 l109 c110 | exit @110, gross −37.5 |
| B15 | Costs | TESTC qty 3.22, stop 95; entry bar o100 → 100.1; next bar o96 h96 l94.9 c95 | exit @94.95; commission 1.0 each side; net ≈ −18.583; abs(net) ≤ 18.744 |
| B16 | FX costs | TESTUSD qty 3.9 @100 USD, exit target 110 | entry fx_cost 1.56, exit fx_cost 1.716, gross 31.2, net 27.924 |
| B17 | Stamp duty | TESTUK qty 10 buy @100 | entry fill stamp_duty_gbp 5.0, cash 620 |
| B18 | Flatten | open long, marks {TEST: 102} | exit @102, TIME_FLAT, no positions, pending cancelled |
| B19 | Flatten missing mark | no mark | exit at entry price, gross 0 |
| B20 | Stop hit cancels remainder | partial 2.0 filled then bar o99 l94 v=20 | exit 2.0 @95, order CANCELLED (no re-entry) |
| B21 | Bad order | qty 0 / stop 0 / long stop ≥ entry | OrderError |
| B22 | Deposit | deposit(50) / deposit(-5) | cash 675 / ValueError |
| B23 | Equity/unrealised | open 3.75 @100, mark 104 | unrealised 15.0, equity 640 |

### journal
| ID | Scenario | Input | Expected Behavior |
|---|---|---|---|
| J1 | Idempotent schema | init_schema twice | no error, count("trades") 0 |
| J2 | Trade round-trip | record_trade then trades_between | equal ClosedTrade |
| J3 | Duplicate signal | record_signal twice same id | JournalError |
| J4 | Decision reasons | rejected with 2 reasons | decisions_for → [(False, (r1, r2))] |
| J5 | Daily equity upsert | same date twice, different end | 1 row, latest end |
| J6 | Cash-flow dedupe | key "topup:2027-02-01" twice | True then False; sum 100 |
| J7 | Config reuse | same version, different content | JournalError |
| J8 | Config same | same cfg twice | no error, 1 row |
| J9 | Features stored | signal with 2 features | count("features") 2 |
| J10 | Sweep lifecycle | record rec → open id; acknowledge → None; ack again | JournalError on second ack |
| J11 | Bad table name | count("x; drop") | ValueError |
| J12 | Bad cash-flow kind | kind "gift" | ValueError |

### strategy ORB (2027-01-12, 5-min bars; OR = bars at 14:30, 14:35, 14:40 with max high 101, min low 99)
| ID | Scenario | Input | Expected Behavior |
|---|---|---|---|
| O1 | Long breakout | 14:45 bar close 101.5 | 1 LONG signal: entry 101.5, stop 99, target 106.5, ts 14:50, id "orb-TEST-20270112-1" |
| O2 | Short breakout | 14:45 bar close 98.5 | SHORT: stop 101, target 93.5 |
| O3 | No breakout | close 100.5 | [] |
| O4 | One signal per day | breakout then another breakout bar | second returns [] |
| O5 | Range too wide | OR high 110, low 99 (rng/mid ≈ 0.105 > 0.05) | [] |
| O6 | Zero range | all OR bars h=l=100; then close 101 | [] |
| O7 | After cutoff | first post-OR bar at 16:00 (end 16:05 > cutoff) | [] |
| O8 | No OR bars | first bar at 14:50 | [] |
| O9 | Event day skip | calendar MACRO on 2027-01-12 | [] |
| O10 | Open position | ctx.open_symbols {"TEST"} | [] (state not done) |
| O11 | Other symbol | bar symbol "OTHER" | [] |
| O12 | Features | O1 | features keys include or_high/or_low/or_range_pct/breakout_close/minutes_since_open; minutes_since_open 20.0 |

### backtest (integration)
| ID | Scenario | Input | Expected Behavior |
|---|---|---|---|
| BT1 | Target trade | 2027-01-12 bars §6 | 1 trade, qty 3.07, entry 101.6, exit 106.5, net ≈ 15.043; final equity ≈ 327.543 |
| BT2 | Time flat | flat scenario bars | 1 trade TIME_FLAT, exit 102.2, net ≈ 1.842 |
| BT3 | Kill switch on | pre-activated memory ks | n_signals 1, n_rejected 1, 0 trades |
| BT4 | DST mismatch day | 2027-03-15 bars starting 13:30 UTC | 1 trade |
| BT5 | Weekend skipped | range 2027-01-16..17 | 0 trades, daily_equity empty |
| BT6 | Journal populated | BT1 with :memory: journal | signals 1, decisions 1, trades 1, daily_equity 1, config_versions 1 |
| BT7 | Gap loss feeds daily cap | entry then gap to 90 | trade net < −budget; second signal same day impossible (one per day) and daily_equity end < start |
| BT8 | start > end | run(d2, d1) | ValueError |

### signal_inbox
| ID | Scenario | Input | Expected Behavior |
|---|---|---|---|
| I1 | Valid proposal | complete JSON | Signal source "llm", moved to processed/ |
| I2 | Quantity included | {"quantity": 5, ...} | error "QUANTITY_NOT_ALLOWED", in rejected/ with .error.txt |
| I3 | Invalid JSON | "{bad" | "INVALID_JSON" |
| I4 | Missing stop | no stop key | Signal.stop None (valid) |
| I5 | Naive ts | "2027-01-12T15:00:00" | "INVALID_TS" |
| I6 | Unknown field | {"leverage": 5} | "UNKNOWN_FIELD:leverage" |
| I7 | Non-JSON file | notes.txt | ignored (not in results, not moved) |
| I8 | Source spoof | "source": "strategy:orb" | Signal.source == "llm" |
| I9 | Missing required | no symbol | "MISSING_FIELD:symbol" |
| I10 | LLM → risk | I4 signal → evaluate | rejected NO_STOP |
| I11 | Array top-level | "[]" | "NOT_AN_OBJECT" |

### events
| ID | Scenario | Input | Expected Behavior |
|---|---|---|---|
| E1 | Parse | 4 valid rows | 4 events |
| E2 | Bad type | row 3 type "split" | CalendarError "line 3" |
| E3 | Pay without ref | dividend_pay no ref_date | CalendarError |
| E4 | Ex-div without amount | ex_dividend amount empty | CalendarError |
| E5 | Earnings blackout | earnings DIVA 2027-03-10; d 03-08 days 2 / 03-07 days 2 | True / False |
| E6 | Macro day | macro (no symbol) 2027-03-17 | is_blackout(any, 03-17, 0) True; 03-16 False |
| E7 | Holidays | market_holiday 2027-01-18 | holidays() == {2027-01-18} |
| E8 | Upcoming sorted | events at +3, +1 | returned [+1, +3] |
| E9 | Bad date | "2027-13-01" | CalendarError |

### portfolio
| ID | Scenario | Input | Expected Behavior |
|---|---|---|---|
| P1 | Buy avg cost incl fees | cash 500, buy 10 @20 fee 2 | cash 298, avg 20.2 |
| P2 | Insufficient cash | cash 100, buy 10 @20 | InsufficientCashError, cash unchanged |
| P3 | Sell realised | after P1, sell 5 @30 fee 1 | realised 48.0, cash 447 |
| P4 | Oversell | sell 11 | ValueError |
| P5 | Full sell removes | sell 10 | holding None |
| P6 | Dividend withholding | credit 10.0 gross, 15% | net 8.5, pool 8.5 |
| P7 | Fractional | buy 2.5 @10 | quantity 2.5 |
| P8 | Missing price | equity({}) with holding | ValueError |
| P9 | Withdraw too much | cash 50, withdraw 60 | InsufficientCashError |
| P10 | Second buy keeps stop | buy with stop 16, then buy stop None | stop stays 16 |
| P11 | New holding without stop | buy stop None first time | ValueError |

### tranches
| ID | Scenario | Input | Expected Behavior |
|---|---|---|---|
| T1 | First tranche | qty 10, avg 10, price 13 (+30%), step 0.01 | [rule 0, qty 2.5] |
| T2 | Both tranches | price 16 (+60%) | [(0, 2.5), (1, 1.87)] |
| T3 | Already triggered | triggered {0}, price 13 | [] |
| T4 | Rounds to zero | qty 3, step 1, price 13 | [] |
| T5 | No gain | price 10 | [] |
| T6 | Bad price | price 0 | ValueError |

### sweep
| ID | Scenario | Input | Expected Behavior |
|---|---|---|---|
| W1 | All-in & threshold | silver 40 + 5, VAT .2 | 54.0; 108.0 |
| W2 | Just below | eligible 107.99 (silver only) | None |
| W3 | At threshold | eligible 108 | silver rec, action "RECOMMEND_ONLY_MANUAL_PURCHASE" |
| W4 | Prefer most expensive affordable | eligible 1300 with default coins | gold_sovereign (thr 1220) |
| W5 | Negative profit | eligible −5 | None |
| W6 | Stale price | price_as_of 2026-11-02, today 2026-11-20, stale 7 | price_stale True |
| W7 | Open rec suppresses | tracker evaluate twice | second None |
| W8 | Acknowledge consumes | contributions 625, equity 733 → rec; ack cost 54 | withdrawal −54 recorded, eligible now 733−54+54−625−108 = 0 → evaluate None |
| W9 | Ack insufficient cash | portfolio cash 10, cost 54 | InsufficientCashError, rec still open |
| W10 | Eligible formula | eligible_profit(800, 725, 54, 108) | 21.0 |

### sleeve B manager
| ID | Scenario | Input | Expected Behavior |
|---|---|---|---|
| SB1 | Ex-div snapshot | hold 10 DIVA; ex 2027-03-01 amount 0.5; pay 2027-03-20 ref 03-01 | on 03-20 dividend_credit amount 5.0 |
| SB2 | Bought on ex-date not entitled | 0 held, buy after step on 03-01 | 03-20 no credit |
| SB3 | DRIP fractional | DIVA zero fees, pool 5.0, price 20 | drip_buy qty 0.25, pool 0 |
| SB4 | DRIP carry-forward | DIVW (min commission £3, min 1 share), pool 5, price 20 | no drip_buy, pool stays 5.0 |
| SB5 | Protective stop | DIVA avg 20 stop 16, price 15.9 | protective_stop_sell all, holding removed |
| SB6 | Tranche sell | DIVA qty 10 avg 10, stop 8, price 13 | tranche_sell 2.5, triggered {0} |
| SB7 | Buy signal underweight | cash 300, no holdings, price 20 | 1 signal DIVA stop 16.0, sleeve B |
| SB8 | Earnings blackout | earnings DIVA d+1 | no buy signal |
| SB9 | Kill switch | active, pool 5 | no drip_buy, no buy signals, pool 5 |
| SB10 | Below min trade | cash 40 | no buy signal |

### topup
| ID | Scenario | Input | Expected Behavior |
|---|---|---|---|
| U1 | Before start | due_dates(2026-11-01, 2027-01-31) | [] |
| U2 | Span | (2027-01-15, 2027-04-15) | [02-01, 03-01, 04-01] |
| U3 | Catch-up | applied {2027-02-01}, today 2027-05-10 | 03-01, 04-01, 05-01 |
| U4 | Split | 100, split_a 0.5 | 50.0 / 50.0 |
| U5 | Odd split | 100, split_a 0.333 | 33.3 / 66.7 |
| U6 | Invalid day | day 31 | ValueError |
| U7 | Today = due date | today 2027-02-01, none applied | [02-01] |

### forecast
| ID | Scenario | Input | Expected Behavior |
|---|---|---|---|
| FC1 | Table months | default forecast_table | months exactly: 500→[145,113,101,89]; 625→[144,112,100,88]; 750→[143,110,98,87] |
| FC2 | Table years | same | 500→[12.1,9.4,8.4,7.4]; 625→[12.0,9.3,8.3,7.3]; 750→[11.9,9.2,8.2,7.2] |
| FC3 | Already at target | start 15000 | 0 |
| FC4 | Unreachable | start 100, contrib 0, rate 0 | None |
| FC5 | Bad rate | annual −1 | ValueError |
| FC6 | Monthly rate | 0.12 | ≈ 0.0094888 (places 6) |
| FC7 | Goal progress | equity 7000, metal 500, target 15000 | 50.0 |

### review
| ID | Scenario | Input | Expected Behavior |
|---|---|---|---|
| RV1 | Stats | nets [10, −5, 20, −5] | n 4, win_rate 0.5, avg_win 15, avg_loss −5, expectancy 5, PF 3.0, net 20, max consec losses 1 |
| RV2 | Empty | [] | zeros, PF None |
| RV3 | Sample gate | 29 trades | sample_ok False, message starts "INSUFFICIENT_SAMPLE" |
| RV4 | Splits | 10 days, train 5, test 2 | 2 splits: ([d0..d4],[d5,d6]), ([d2..d6],[d7,d8]) |
| RV5 | Proposal write | change sleeve_a.target_r_multiple 1.5 | v0002.proposed.json written, version "v0002", value 1.5; v0001 unchanged; reason file exists |
| RV6 | Forbidden key | risk.max_risk_per_trade_pct | ConfigError, no file |
| RV7 | Invalid value | sleeve_a.target_r_multiple −1 | ConfigError, no file |
| RV8 | Numbering | dir has v0001.json, v0002.proposed.json | next is v0003 |
| RV9 | Unknown path | sleeve_a.nope | ConfigError |

### daily (integration)
| ID | Scenario | Input | Expected Behavior |
|---|---|---|---|
| DY1 | Top-up first month | d 2027-02-01 | 1 credit; broker cash +50, portfolio cash +50; journal topup sum 100 |
| DY2 | Idempotent rerun | same d again | no new credit; topup sum still 100 |
| DY3 | Sweep triggered | contributions 625 (initial); Sleeve B unrealised 108 | sweep silver_britannia_1oz recorded, open id not None |
| DY4 | Equity row | after DY1 | daily_equity row for date exists |

### cli
| ID | Scenario | Input | Expected Behavior |
|---|---|---|---|
| CL1 | Forecast | ["forecast"] | exit 0, output contains "£625" and "7.3y" |
| CL2 | Kill switch round trip | on --reason x → status → off → status | 0 each; "ACTIVE: x" then "inactive" |
| CL3 | Backtest | temp CSV (BT1 bars), dates 2027-01-12 | exit 0, "trades: 1" |
| CL4 | Bad config | --config nonexistent | exit 2 |
| CL5 | No live command | ["live"] | SystemExit code 2 (argparse) |

---

## 6. Test Specification

All tests use `unittest.TestCase`, are deterministic, use `tempfile.TemporaryDirectory()` for files and `":memory:"` journals, and compare money with `assertAlmostEqual(x, y, places=6)` unless stated (`places=3` where marked ≈ with 3 decimals). Each test name below maps to the edge-case ID in brackets.

```
test_mathutil.py:
  test_floor_fractional_step [M1]     Input: (3.90625, 0.01)   Expected: 3.9       Why: risk sizing rounding
  test_floor_float_noise [M2]         Input: (2.9999999999,1)  Expected: 3.0       Why: epsilon prevents lost unit
  test_floor_bad_step [M3]            Input: (5, 0)            Expected: ValueError
  test_floor_negative_value [M4]      Input: (-1, 0.1)         Expected: 0.0
  test_floor_below_one_step [M5]      Input: (0.12499, 0.1)    Expected: 0.1
  test_step_decimals                  Input: 0.01, 1.0, 0.0001 Expected: 2, 0, 4

test_models.py:
  test_bar_naive_ts_rejected [MO1]; test_bar_high_below_low_rejected [MO2];
  test_bar_end_ts [MO3] (== utc(2027,1,12,14,35)); test_bar_negative_volume_rejected [MO4]
  test_fill_fees_property: Fill(commission 1, stamp 0.5, fx 0.25) → fees_gbp 1.75

test_config.py:
  test_default_config_loads_and_is_paper: default_config().mode == "paper", starting_capital 625.0, version "v0001"
  test_roundtrip_dict: config_from_dict(config_to_dict(cfg)) == cfg
  test_hash_stable [C21]
  test_live_mode_rejected [C1] ... test_invalid_json_rejected [C20]   (one test per C1–C20; use make_cfg/deep_merge on
      config_to_dict(default_config()) and assertRaises(ConfigError); C6 also assertIn("risk.max_risk_pct", str(e)))
  test_load_active_picks_highest [C18]: write v0001 (version v0001) and v0002 (version v0002, starting 700) and
      v0003.proposed.json → load_active_config(...).version == "v0002"
  test_no_configs [C19]

test_session.py:
  test_winter_window [S1]; test_summer_window [S2]; test_spring_mismatch [S3]; test_autumn_mismatch [S4];
  test_after_both_changes [S5]; test_derived_times [S6]; test_weekend_not_trading [S7]; test_holiday_not_trading [S8]
  (assert exact UTC datetimes and london_label strings from the table)

test_fx.py:   test_gbp_no_cost [F1]; test_usd_conversion_and_cost [F2]; test_unknown_currency [F3]; test_bad_rate [F4]
test_fees.py: test_min_commission_binds [F5]; test_pct_binds [F6]; test_zero_qty_zero_commission [F7];
              test_stamp_duty_uk_share_buy_only [F8]; test_fill_prices [F9];
              test_fill_costs_usd: TESTUSD buy 3.9 @100, mid 100 → fx_cost 1.56, commission 0, spread_slippage 0

test_marketdata.py: test_csv_parse [D1]; test_csv_naive_ts_line_number [D2] (assertIn("line 3", str(e)));
  test_csv_bad_ohlc_line [D3]; test_duplicate_bar [D4]; test_half_open_range [D5]; test_unknown_symbol_empty [D6];
  test_latest_price [D7]; test_missing_header [D8]; test_unsorted_input_sorted [D9]

test_killswitch.py: test_default_inactive [K1]; test_file_activates [K2]; test_activate_writes_reason [K3];
  test_clear [K4]; test_memory_only [K5];
  test_oserror_fails_closed [K6]: with unittest.mock.patch("pathlib.Path.exists", side_effect=PermissionError) → True

test_guards.py:
  test_broker_refuses_non_paper [G1]: dataclasses.replace(make_cfg(), mode="live") → assertRaises(PaperOnlyViolation, PaperBroker, ...)
  test_no_network_imports [G2]: walk trading/ (skip tests/), ast.parse each file, collect Import names and ImportFrom.module
      top-level component (split(".")[0]); assert set ∩ FORBIDDEN_IMPORTS == ∅ (message lists file:name)
  test_no_live_classes_or_files [G3]
  test_assert_paper_mode_ok [G4]

test_risk.py:   (setUp: cfg = make_cfg(); ks = KillSwitch(None); fx = FxConverter.from_config(cfg); eng = RiskEngine(cfg, ks, fx);
                 window = session_window(date(2027,1,12), cfg.session); now = utc(2027,1,12,15,0))
  test_happy_path_sizing [R1]: approved True; reasons (); quantity 3.75; risk_gbp 18.75; order.order_id "sig-1-o";
      order.expires_ts == utc(2027,1,12,16,0); order.config_version "v0001"
  test_no_stop_rejected [R2]; test_zero_stop_distance [R3] (assertIn STOP_ZERO, assertNotIn STOP_WRONG_SIDE);
  test_stop_wrong_side [R4]; test_stop_too_tight [R5]
  test_costs_included_in_sizing [R6]: qty 3.22, risk_gbp ≈ 18.744 (places 6), risk_gbp <= 18.75
  test_fx_cost_in_sizing [R7]: qty 3.9; risk ≈ 18.72
  test_whole_shares [R8]: qty 3.0; risk 15.0
  test_fractional_shares [R9]: TESTF entry 100 stop 93 → 18.75/7 = 2.678571 → qty 2.6785; risk ≈ 18.7495
  test_daily_cap_hit [R10]; test_partial_daily_budget [R11] (qty 1.75, risk 8.75);
  test_open_risk_consumes_budget [R12]: Position(symbol "TESTC", sleeve A, initial_risk_gbp 15.0, qty 1, entry 100, stop 95,...) → qty 0.75
  test_budget_exhausted [R13]: reasons == ("DAILY_LOSS_BUDGET_EXHAUSTED",)
  test_max_trades [R14]; test_kill_switch [R15]; test_after_cutoff [R16]; test_during_opening_range [R17];
  test_no_window_sleeve_a [R18]; test_stale [R19]; test_future [R20]; test_short_share_rejected [R21];
  test_short_cfd_allowed [R22] (qty 3.75); test_duplicate_position [R23]; test_unknown_instrument [R24]
  test_spread_bet_cash_only_too_small [R25]: reasons == ("SIZE_BELOW_MINIMUM",)
  test_spread_bet_leveraged [R26]: make_cfg({"risk":{"leverage_mode":"leveraged","max_leverage":5.0}}) → qty 0.6, risk ≈ 6.36
  test_fees_exceed_budget [R27]
  test_multiple_reasons_ordered [R28]: exact tuple equality
  test_target_wrong_side [R29]
  test_notional_cap_binds [R30]: make_account(sleeve_equity=312.5), stop 98 → qty 3.12, risk ≈ 6.24
  test_sleeve_b_cash_cap [R31]: make_signal(sleeve=B, stop=80), make_account(sleeve_cash=50), window None → approved, qty 0.5, order.expires_ts None
  test_drawdown_trips_kill [R32]; test_drawdown_below_threshold [R33]
  test_must_flatten_reasons [R34]: four sub-asserts
  test_naive_now [R35]; test_invalid_entry [R36]

test_broker.py:  (helper: submit(order) with risk 18.75; bars via make_bar with ts 14:50, 14:55, ...)
  test_market_entry_fill [B1]: len(fills)==1, fills[0].price 100.0, action "buy", open_positions()[0].quantity 3.75
  test_target_exit [B2]: closed_trades[0].exit_price 110, gross 37.5, exit_reason TARGET, cash 662.5
  test_gap_through_stop [B3]: exit 90.0, net −37.5, net < −18.75
  test_stop_wins_same_bar [B4]; test_gap_beyond_target [B5]; test_same_bar_entry_then_stop [B6] (closed in same on_bar call, 2 fills)
  test_entry_past_stop_cancelled [B7]: order_status CANCELLED, fills [], open_positions () 
  test_partial_fill_vwap [B8]: make_cfg participation 0.1 default; fills[0].quantity 2.0 is_partial True;
      second 1.75 is_partial False; entry_price ≈ 100.466667 (places 5); status FILLED; initial_risk after first ≈ 10.0
  test_zero_volume_full_fill [B9]; test_liquidity_below_min_no_fill [B10]; test_expiry_cancels [B11];
  test_bar_before_order_ignored [B12]; test_short_profit [B13]; test_short_gap_stop [B14]
  test_costs_round_trip [B15]: entry fill 100.1; exit 94.95; trade.fees_gbp 2.0; net ≈ −18.583 (places 3); abs(net) <= 18.744 + 1e-9
  test_fx_costs [B16]: entry fill fx_cost 1.56; exit fx 1.716; gross 31.2; net 27.924
  test_stamp_duty [B17]; test_flatten [B18]; test_flatten_missing_mark [B19]
  test_stop_cancels_partial_remainder [B20]; test_bad_order_raises [B21] (three subTests); test_deposit [B22]
  test_equity_unrealised [B23]

test_journal.py: test_schema_idempotent [J1]; test_trade_roundtrip [J2]; test_duplicate_signal [J3];
  test_decision_reasons_json [J4]; test_daily_equity_upsert [J5]; test_cash_flow_dedupe [J6];
  test_config_version_reuse_conflict [J7]; test_config_same_twice [J8]; test_features_stored [J9];
  test_sweep_lifecycle [J10]; test_count_bad_table [J11]; test_bad_cash_flow_kind [J12]

test_orb.py: (bars OR: 14:30 o100 h101 l99 c100.5; 14:35 o100.5 h100.8 l99.5 c100; 14:40 o100 h100.9 l99.2 c100.6)
  test_long_breakout [O1] (14:45 bar o100.6 h101.6 l100.5 c101.5); test_short_breakout [O2] (14:45 o100 h100.2 l98.4 c98.5);
  test_no_breakout [O3]; test_one_signal_per_day [O4]; test_range_too_wide [O5]; test_zero_range [O6];
  test_after_cutoff [O7]; test_no_or_bars [O8]; test_event_day_skip [O9]; test_open_position_blocks [O10];
  test_other_symbol [O11]; test_features [O12]

test_backtest.py:
  BT1 bars (TEST, 2027-01-12, 5-min, volume 0): OR bars as test_orb; 14:45 o100.6 h101.6 l100.5 c101.5;
      14:50 o101.6 h102 l101.2 c101.9; 14:55 o101.9 h107 l101.8 c106.8
  test_target_trade [BT1]: len(trades)==1; quantity 3.07; entry 101.6; exit 106.5; net ≈ 15.043; final_equity ≈ 327.543
      (Why 3.07: fund 625 → budget 18.75 → 7.5 by risk; sleeve equity 312.5 / 101.5 → 3.07 by notional)
  test_time_flat [BT2]: same through 14:50, then 14:55 o101.9 h102.5 l101.0 c102.0 and 16:25 o102 h102.4 l101.8 c102.2
      → exit_reason TIME_FLAT, exit 102.2, net ≈ 1.842
  test_kill_switch_blocks [BT3]; test_dst_mismatch_day [BT4] (same bar pattern shifted to start 2027-03-15 13:30 UTC);
  test_weekend_skipped [BT5]; test_journal_populated [BT6]
  test_gap_loss [BT7]: BT1 through 14:50, then 14:55 o95 h95.5 l94 c94.5 (gap below stop 99) → exit 95.0,
      net ≈ 3.07*(95−101.6) = −20.262; assert net < −decision risk (7.675); daily_equity[0][1] < 312.5
  test_start_after_end [BT8]

test_signal_inbox.py: test_valid [I1]; test_quantity_rejected [I2] (rejected/<name>.error.txt content "QUANTITY_NOT_ALLOWED");
  test_invalid_json [I3]; test_missing_stop_allowed [I4]; test_naive_ts [I5]; test_unknown_field [I6];
  test_non_json_ignored [I7]; test_source_forced_llm [I8]; test_missing_required [I9];
  test_llm_signal_vetoed_by_risk [I10] (integration with RiskEngine; now = signal ts); test_array_top_level [I11]

test_events.py: test_parse [E1]; test_bad_type_line [E2]; test_pay_without_ref [E3]; test_exdiv_without_amount [E4];
  test_earnings_blackout_window [E5]; test_macro_day [E6]; test_holidays [E7]; test_upcoming_sorted [E8]; test_bad_date [E9]

test_portfolio.py: test_buy_avg_cost [P1] … test_new_holding_requires_stop [P11] (one per row)
test_tranches.py: test_first_tranche [T1] … test_bad_price [T6]
test_sweep.py: test_all_in_and_threshold [W1] … test_eligible_formula [W10]
  (W7–W9 use :memory: journal with record_cash_flow(ts,"initial",625,dedupe_key="initial") and DividendPortfolio)
test_sleeve_b_manager.py: test_exdiv_snapshot_pays [SB1] … test_below_min_trade [SB10]
  (SB4 uses a cfg override where sleeve_b.targets = [{"symbol":"DIVW","weight":0.6}])
test_topup.py: test_before_start [U1] … test_today_is_due [U7]
test_forecast.py:
  test_table_months [FC1]: build dict {(start, rate): months} and assertEqual for all 12
  test_table_years [FC2]; test_already_at_target [FC3]; test_unreachable [FC4]; test_bad_rate [FC5];
  test_monthly_rate [FC6]; test_goal_progress [FC7]
test_review.py: test_stats [RV1] … test_unknown_path [RV9] (temp dir: copy v0001.json content via json.dump(config_to_dict(default_config())))
test_daily.py:
  setUp: cfg = make_cfg(); journal :memory:; broker PaperBroker(cfg, fx, 312.5, journal); portfolio DividendPortfolio(312.5);
         calendar EventCalendar([]); ks KillSwitch(None); manager; risk; topups from_config; sweep tracker; ensure_initial_capital
  test_topup_first_month [DY1]; test_idempotent_rerun [DY2]
  test_sweep_triggered [DY3]: portfolio.buy("DIVA", 10, 20.0, 0.0, 16.0) (cash 112.5), prices {"DIVA": 30.8}
      → unrealised 108, fund = 312.5 + 112.5 + 308 = 733 → eligible 108 → report.sweep.coin_name "silver_britannia_1oz"
      (run on d=2026-12-01 so no top-up applies; trades_today 0; day_start 625)
  test_equity_row [DY4]
test_cli.py: test_forecast [CL1] (capture stdout with contextlib.redirect_stdout); test_killswitch_roundtrip [CL2];
  test_backtest [CL3]; test_bad_config [CL4]; test_no_live_command [CL5] (assertRaises(SystemExit) and code 2)
```

**What doesn't need testing (and why)**
- `errors.py`: plain class definitions. They are exercised by every `assertRaises` above.
- `strategies/__init__.py`, `sleeve_b/__init__.py`, `trading/__init__.py`: empty or constant only.
- `docs/*.md`: prose. Correctness of the forecast numbers is covered by FC1/FC2, and the docs must copy those values.
- `zoneinfo`/`sqlite3` internals: stdlib.
- `SessionWindow.contains`: trivial comparison. It is still used indirectly by the backtester.

---

## 7. Acceptance Criteria

**Per module**
- [ ] `mathutil`: floor_to_step passes M1–M5. No result exceeds the input value.
- [ ] `models`: all dataclasses carry type hints. Bar validation rejects naive ts and inconsistent OHLC.
- [ ] `config`: `v0001.json` loads. Every C1–C20 rule raises ConfigError naming the key. Unknown keys are rejected. Hash is stable.
- [ ] `session`: windows correct for S1–S5, including both DST-mismatch periods. Uses only zoneinfo.
- [ ] `fx`/`fees`: FX cost is applied only to non-GBP instruments. Stamp duty only on buys of `share` kind.
- [ ] `marketdata`: CSV errors report line numbers. Ranges are half-open.
- [ ] `killswitch`: fail-closed on OSError. `clear()` is called only from the CLI (grep shows no other call sites).
- [ ] `guards`: the AST test passes. No network import and no `Live*` class exists anywhere in `trading/`.
- [ ] `risk`: planned max loss including all modelled costs is ≤ min(3% fund equity, remaining daily budget) in every approved decision (asserted in R1, R6, R7, R9, R11, R26, R30). A missing stop always rejects.
- [ ] `broker`: refuses non-paper config. Bracket stop is mandatory. Gap, partial, same-bar and FX behaviours match B1–B23.
- [ ] `journal`: every table in the DDL exists. Writes are transactional. Config version conflicts are detected.
- [ ] `orb`: at most one signal per symbol per day. No signal after entry cutoff or on event days.
- [ ] `backtest`: uses the same RiskEngine + PaperBroker classes as the live paper path. Sleeve A is flat at window end every day.
- [ ] `signal_inbox`: any size field rejects the proposal. Source is always "llm".
- [ ] `sleeve_b`: ex-div entitlement snapshot is honoured. DRIP never exceeds pool or cash. Sweep only recommends: grep shows `sweep.py` calls no buy method except `portfolio.withdraw` inside `acknowledge`.
- [ ] `topup`: no credit before 2027-02-01. Catch-up works. Idempotent via journal dedupe.
- [ ] `forecast`: reproduces all 12 given figures (months and years).
- [ ] `review`: never writes `risk.*`/`mode` changes. Never overwrites existing files. Enforces the minimum sample.
- [ ] `cli`: has no live/execute command. Errors exit 2.
- [ ] `docs/feasibility.md`: contains every section in §3.20. Every regulatory/fee/tax fact is tagged [VERIFY]. The forecast table matches FC1/FC2.
- [ ] `docs/architecture.md`: contains every section in §3.21, including the DST-mismatch explanation with the example dates.

**Overall system**
- [ ] `cd /home/user/Vault-It && python3 -m unittest discover -s trading/tests` passes with 0 failures and 0 errors, using only the stdlib.
- [ ] `python3 -m trading.cli forecast` prints the forecast table. `python3 -m trading.cli backtest ...` runs end to end on a CSV.
- [ ] No existing repo file is modified (`git status` shows only `trading/` additions).
- [ ] No path exists from LLM output to an order without `RiskEngine.evaluate`.

---

## 8. Implementation Order
1. **PLAN_GAP-1 check** (zoneinfo works) — everything else depends on it.
2. `errors.py`, `mathutil.py` — no dependencies.
3. `models.py` — depends on #2.
4. `config.py` + `config/v0001.json` + `tests/helpers.py` — depend on #3. Tests need helpers.
5. In parallel, all depending on #4: `session.py`, `fx.py`, `killswitch.py`, `guards.py`, `marketdata.py`, `forecast.py`, `topup.py`, `sleeve_b/events.py`.
6. `fees.py` — depends on fx and config.
7. `journal.py` — depends on models and config. `SweepRecommendation` is only a type hint, so use `from __future__ import annotations` or a string annotation.
8. `risk.py` — depends on fees, fx, killswitch, session, config.
9. `broker.py` — depends on fees, guards, journal, models.
10. `strategies/base.py`, `strategies/orb.py` — depend on session and events.
11. `backtest.py` — depends on #8–#10 and marketdata.
12. In parallel, after #7–#8: `signal_inbox.py`, `sleeve_b/portfolio.py`, `sleeve_b/tranches.py`, `sleeve_b/sweep.py`.
13. `sleeve_b/manager.py` — depends on #12 and fees.
14. `daily.py` — depends on #9, #13, topup, sweep.
15. `review.py` — depends on journal and config.
16. `cli.py` — depends on backtest, killswitch, forecast.
17. `docs/feasibility.md`, `docs/architecture.md`, `README.md`, `.gitignore` — can be written any time after #5 (needs forecast output) and run in parallel with code.

Write each module's tests in the same step as the module. Run the full suite after every step.
