# trading (phase 1, PAPER ONLY)

Paper-trading system for a UK retail trader: Sleeve A (opening-range breakout), Sleeve B (dividend compounding), a risk engine with veto, a paper broker, a SQLite journal, a backtester, and a small CLI.

**Paper only.** There is no live broker class, no network access and no credentials. Do not add any without a separate review. Not financial or tax advice; see `docs/feasibility.md` and its [VERIFY] checklist.

Stdlib only (Python 3.11+, needs the system tz database for `zoneinfo`).

## Run tests (from the repo root)

    python3 -m unittest discover -s trading/tests -v

## CLI (from the repo root)

    python3 -m trading.cli forecast
    python3 -m trading.cli killswitch status|on|off [--reason TEXT] [--kill-switch PATH]
    python3 -m trading.cli backtest --bars bars.csv --start 2027-01-12 --end 2027-01-12 [--journal PATH] [--calendar CSV]

Bars CSV columns: `symbol,ts,open,high,low,close,volume,interval_seconds` (ISO timestamps with timezone).
Config lives in `config/vNNNN.json`; the highest-numbered file is active. Proposals (`vNNNN.proposed.json`) become active only when a human renames them.

See `docs/architecture.md` for design and `docs/feasibility.md` for costs, tax and forecast.
