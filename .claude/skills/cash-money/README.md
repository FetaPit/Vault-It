# Cash Money

A UK startup accountant skill for Claude. Covers sole traders and small limited companies: bookkeeping, allowable expenses, VAT, Making Tax Digital, Self Assessment, Corporation Tax, salary vs dividends, director's loans, tax pots, runway and deadlines. Rates are for 2026/27.

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
| `scripts/tax_calc.py` | Sole trader, Ltd, compare, Corporation Tax and s455 maths |
| `scripts/bank_summary.py` | Turns a Tide (or other bank) CSV into categories, monthly totals and a review list |

## Keep it current

Update `references/uk-rates-2026-27.md` and the `R` table at the top of `scripts/tax_calc.py` each April, or after a Budget.

Cash Money gives general guidance, not regulated financial advice.
