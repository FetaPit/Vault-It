# Cash Money

A UK finance co-worker and startup accountant skill for Claude, for sole traders and small limited companies. It chases invoices, forecasts cash 13 weeks ahead, runs a Monday money brief and month-end close, and handles bookkeeping, VAT, Making Tax Digital, Self Assessment, Corporation Tax, salary vs dividends, dividend paperwork, director's loans and deadlines. Rates are for 2026/27.

## Install

**claude.ai or the Claude desktop app:** open Settings, find Skills, upload `cash-money.zip` and switch it on. Code execution needs to be enabled for the scripts to run.

**Claude Code:** it already loads inside this repo. To use it everywhere, copy this folder to `~/.claude/skills/cash-money/`.

## What's inside

| File | What it does |
|---|---|
| `SKILL.md` | How Cash Money thinks, asks and answers |
| `references/uk-rates-2026-27.md` | Tax rates and thresholds |
| `references/deadlines.md` | HMRC, Companies House, VAT and payroll dates |
| `references/integrations.md` | Tide, Xero, Stripe and others, and whether you need Xero |
| `references/bookkeeping-categories.md` | Categories mapped to the Self Assessment boxes |
| `references/onboarding.md` | First-run setup interview, systems check and quick win |
| `references/credit-control.md` | Chase ladder, Late Payment Act, email and letter templates |
| `references/routines.md` | Monday money brief, month-end close, quarterly check-in, year-end pack |
| `references/ltd-paperwork.md` | Dividend minutes and vouchers, director's loan log, annual checklist |
| `scripts/tax_calc.py` | Sole trader, Ltd, compare, Corporation Tax and s455 maths |
| `scripts/bank_summary.py` | Turns a Tide (or other bank) CSV into categories, monthly totals and a review list |
| `scripts/chase_list.py` | Ages unpaid invoices, picks the next chase step, works out statutory interest |
| `scripts/cashflow_forecast.py` | 13-week cash forecast with lowest point and buffer warnings |

## Keep it current

Update `references/uk-rates-2026-27.md` and the `R` table at the top of `scripts/tax_calc.py` each April, or after a Budget.

Cash Money gives general guidance, not regulated financial advice.
