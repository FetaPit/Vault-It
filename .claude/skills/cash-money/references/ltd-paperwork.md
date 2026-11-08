# Limited company paperwork

Templates for a small owner-managed company. Fill the {fields}, keep signed copies with the company records. Not a substitute for legal advice on unusual share structures.

## Before any dividend: the reserves check

A dividend can only be paid from **distributable reserves**: profits after tax that haven't already been paid out.

Rough check: retained profit brought forward + profit after Corporation Tax this year so far − dividends already paid this year. If the result is less than the dividend, don't pay it. An unlawful dividend can be treated as a director's loan and may need repaying.

Interim dividends can be decided by the directors. Final dividends are usually approved by shareholders after the year's accounts.

## Board minute: interim dividend

```
{COMPANY NAME} LIMITED
Company number: {number}
Minutes of a meeting of the board of directors held at {place} on {date}

Present: {director names}

1. Quorum: the chair noted a quorum was present.
2. Dividend: the directors reviewed management accounts to {date} showing
   distributable reserves of £{reserves}. It was resolved to pay an interim
   dividend of £{per share} per ordinary share, £{total} in total, to
   shareholders on the register at {date}, payable on {payment date}.
3. There being no further business, the meeting closed.

Signed: ____________________ {name}, Director    Date: {date}
```

## Dividend voucher (one per shareholder, per dividend)

```
{COMPANY NAME} LIMITED
Company number: {number}    Registered office: {address}

DIVIDEND VOUCHER
Date of payment: {date}
Shareholder: {name}, {address}
Shares held: {number} ordinary shares of £{nominal} each
Dividend: £{per share} per share
Total dividend paid: £{total}

Signed: ____________________ {name}, Director
```

## Director's loan account log

Keep a running record. Positive balance = company owes the director. Negative = director owes the company.

| Date | Description | Director paid in | Director took out | Balance |
|---|---|---|---|---|
| {date} | Opening balance | | | £0 |
| {date} | Paid company setup costs personally | £120 | | £120 |
| {date} | Personal purchase on business card | | £45 | £75 |

Watch for:
- **Overdrawn at year end**: repay within 9 months and 1 day or s455 applies (35.75% for loans from 6 April 2026). Run `tax_calc.py s455`.
- **Over £10,000 overdrawn at any point**: taxable benefit unless interest is charged at HMRC's official rate. Needs a P11D.
- **Bed and breakfasting**: repaying just before the deadline and borrowing again within 30 days doesn't work. HMRC rules match them.
- Repaying by declaring a dividend is fine if reserves allow it.

## Board minute: director's salary

```
Resolved that {director name} be paid a salary of £{amount} a year,
£{monthly} a month through PAYE, with effect from {date}.
```

## Annual Ltd checklist

| Task | When |
|---|---|
| Confirmation statement | Every 12 months, within 14 days of the review date |
| Identity verification for directors and PSCs | Once (transition for existing companies ends 18 Nov 2026) |
| Annual accounts to Companies House | 9 months after year end |
| CT600 to HMRC | 12 months after year end |
| Corporation Tax paid | 9 months and 1 day after year end |
| Director's Self Assessment (dividends) | 31 January |
| Registers up to date (members, PSCs) | When anything changes |
| ICO data protection fee | Yearly, if you hold personal data |
