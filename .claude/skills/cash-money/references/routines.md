# Routines

Regular check-ins turn Cash Money from a calculator into a finance co-worker. Each routine has a fixed format so the owner can scan it in a minute.

Scheduling: in Claude Code use `/loop` or a scheduled routine. In claude.ai, the owner can set a recurring task, or just ask "Monday brief" each week. Always ask before scheduling anything.

## Monday money brief (weekly, about 1 minute to read)

Pull from Xero, Stripe or the latest Tide CSV, plus the chase log and profile.

```
MONDAY MONEY BRIEF — {date}
Cash: £X (last week £Y)            Runway: N months
Owed to you: £X (£Y overdue, oldest Z days)
You owe: £X due this week
Tax pot: £X needed by {next tax date}, £Y set aside
Rolling VAT turnover: £X of £90,000      (only once over £70k)

This week
1. {most important action, e.g. chase Acme £2,400, 21 days late — draft ready}
2. {next}
3. {next}

Deadlines in the next 60 days: {list}
```

Rules: no more than 3 actions. Lead with the one that moves the most cash.

## Month-end close (first week of each month)

1. Get the month's bank CSV or check Xero bank reconciliation is up to date.
2. Run `bank_summary.py` and clear the "Needs a decision" list.
3. Match receipts to spending over £25 (from Drive, Gmail or uploads). List missing receipts.
4. Check sales invoices are all raised and match money received.
5. Update the director's loan account (Ltd) and check it isn't overdrawn.
6. Refresh the chase list and the 13-week forecast.
7. Produce the one-page monthly report:

```
{Month} REPORT
Sales £X (vs last month ±%)   Gross margin X%
Costs £X                       Profit £X
Cash end of month £X           Runway N months
Money owed to you £X           Days to get paid (DSO): N
Tax pot needed £X              Set aside £Y
What changed: {2–3 lines}
Watch: {1–2 risks}
```

## Quarterly check-in

- Tax planning: rerun `tax_calc.py` with year-to-date profit scaled up to a full year. Update the tax pot.
- Ltd: dividend plan for the next quarter. Check distributable reserves first.
- VAT: rolling 12-month turnover. Should they register voluntarily?
- MTD for Income Tax (sole traders): quarterly update due on the 7th of the month after the quarter.
- Pricing: gross margin trend. Flag anything falling.

## Year-end accountant pack (within a month of year end)

Hand the accountant everything in one go:

1. Trial balance, P&L and balance sheet from Xero (or bank summaries for the year)
2. Bank statements for every account, including the last day of the year
3. Sales invoices outstanding at year end (debtors) and bills unpaid (creditors)
4. Fixed asset purchases with receipts
5. Director's loan account log
6. Dividend minutes and vouchers
7. Payroll summary (P60s, PAYE paid)
8. VAT returns filed (if registered)
9. Stock or work in progress at year end, if any
10. Notes on anything unusual: loans, grants, big one-off costs, personal use of assets

Then confirm the filing dates from `deadlines.md` and add them to the calendar.
