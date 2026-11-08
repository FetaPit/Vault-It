#!/usr/bin/env python3
"""Build a credit-control chase list from unpaid invoices.

Usage:
  chase_list.py invoices.csv --base-rate 3.75
  chase_list.py invoices.csv --base-rate 3.75 --today 2026-11-09 --json

Input: a CSV of unpaid invoices (Xero "Aged Receivables Detail" or "Invoices" export,
or a hand-made sheet). Columns are found by header: customer/contact, invoice number,
amount due, due date, and optionally invoice date and email.

--base-rate is the Bank of England base rate (%) for the Late Payment Act: the rate on
31 Dec for debts due Jan–Jun, or on 30 Jun for debts due Jul–Dec. Check the current rate.
Statutory interest = 8% + base rate a year. Applies to business customers only.
"""
import argparse
import csv
import json
import sys
from collections import defaultdict
from datetime import date, datetime

DATE_FORMATS = ["%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d/%m/%y", "%d %b %Y", "%d %B %Y", "%d-%b-%Y"]

LADDER = [  # (from days overdue, step)
    (-10**6, "Not due yet"),
    (-3, "Friendly reminder before due date"),
    (1, "Check-in: ask for the payment date"),
    (7, "Second chase: amount, days late, who pays"),
    (14, "Phone call, then confirm by email"),
    (30, "Formal notice: statutory interest + compensation"),
    (45, "Letter before action: 14 days to pay"),
    (60, "Small claims or debt recovery; consider pausing work"),
]
BUCKETS = [(0, "Not due"), (1, "1–30 days"), (31, "31–60 days"), (61, "61–90 days"), (91, "90+ days")]


def parse_date(v):
    v = (v or "").strip()
    if "T" in v[:11]:
        v = v.split("T")[0]
    for f in DATE_FORMATS:
        try:
            return datetime.strptime(v, f).date()
        except ValueError:
            pass
    return None


def parse_money(v):
    v = (v or "").strip().replace("£", "").replace(",", "")
    neg = v.startswith("(") and v.endswith(")")
    try:
        n = float(v.strip("()"))
    except ValueError:
        return 0.0
    return -n if neg else n


def col(headers, *needles, exclude=()):
    for i, h in enumerate(headers):
        hl = h.lower().strip()
        if any(n in hl for n in needles) and not any(x in hl for x in exclude):
            return i
    return None


def compensation(amount):
    if amount < 1000:
        return 40
    if amount < 10000:
        return 70
    return 100


def step_for(days):
    step = LADDER[0][1]
    for start, s in LADDER:
        if days >= start:
            step = s
    return step


def bucket_for(days):
    b = BUCKETS[0][1]
    for start, name in BUCKETS:
        if days >= start:
            b = name
    return b


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("csv")
    ap.add_argument("--base-rate", type=float, required=True, help="Bank of England base rate, %% (check current)")
    ap.add_argument("--today", type=date.fromisoformat, default=date.today())
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()

    with open(a.csv, newline="", encoding="utf-8-sig") as f:
        rows = list(csv.reader(f))
    hi = next((i for i, r in enumerate(rows) if any("due" in c.lower() for c in r)), None)
    if hi is None:
        sys.exit("Couldn't find a header row with a due date column.")
    headers, rows = rows[hi], rows[hi + 1:]

    c_cust = col(headers, "customer", "contact", "client", "name")
    c_inv = col(headers, "invoice number", "invoicenumber", "invoice no", "number", "reference", "invoice", exclude=("date",))
    c_amt = col(headers, "amount due", "amountdue", "due amount", "outstanding", "balance", "amount", "total", exclude=("date", "paid"))
    c_due = col(headers, "due date", "duedate", "due")
    c_issue = col(headers, "invoice date", "issue", "date", exclude=("due",))
    c_email = col(headers, "email")
    if None in (c_cust, c_amt, c_due):
        sys.exit(f"Need customer, amount and due date columns. Headers found: {headers}")

    rate = 0.08 + a.base_rate / 100
    items = []
    for r in rows:
        if len(r) <= max(c_cust, c_amt, c_due):
            continue
        amount = parse_money(r[c_amt])
        due = parse_date(r[c_due])
        if amount <= 0 or not due:
            continue
        days = (a.today - due).days
        interest = amount * rate / 365 * days if days > 0 else 0.0
        items.append({
            "customer": r[c_cust].strip(),
            "invoice": r[c_inv].strip() if c_inv is not None and c_inv < len(r) else "",
            "amount": round(amount, 2),
            "invoice_date": (parse_date(r[c_issue]).isoformat() if c_issue is not None and c_issue < len(r) and parse_date(r[c_issue]) else ""),
            "due_date": due.isoformat(),
            "days_overdue": days,
            "bucket": bucket_for(days),
            "next_step": step_for(days),
            "statutory_interest_to_date": round(interest, 2),
            "daily_interest": round(amount * rate / 365, 2),
            "fixed_compensation": compensation(amount) if days > 0 else 0,
            "email": r[c_email].strip() if c_email is not None and c_email < len(r) else "",
        })

    if not items:
        sys.exit("No unpaid invoices found.")

    items.sort(key=lambda t: (-(t["days_overdue"] > 0), -t["amount"] * max(t["days_overdue"], 0), t["days_overdue"]))
    by_bucket = defaultdict(float)
    by_customer = defaultdict(lambda: {"total": 0.0, "overdue": 0.0, "invoices": 0, "oldest_days": -10**6})
    for t in items:
        by_bucket[t["bucket"]] += t["amount"]
        c = by_customer[t["customer"]]
        c["total"] += t["amount"]
        c["invoices"] += 1
        c["oldest_days"] = max(c["oldest_days"], t["days_overdue"])
        if t["days_overdue"] > 0:
            c["overdue"] += t["amount"]

    total = sum(t["amount"] for t in items)
    overdue = sum(t["amount"] for t in items if t["days_overdue"] > 0)
    out = {
        "as_of": a.today.isoformat(), "base_rate": a.base_rate, "statutory_rate": round(rate * 100, 2),
        "total_owed": round(total, 2), "overdue": round(overdue, 2),
        "overdue_pct": round(overdue / total * 100, 1) if total else 0.0,
        "by_bucket": {name: round(by_bucket[name], 2) for _, name in BUCKETS if by_bucket[name]},
        "by_customer": {k: {kk: round(vv, 2) if isinstance(vv, float) else vv for kk, vv in v.items()}
                        for k, v in sorted(by_customer.items(), key=lambda kv: -kv[1]["overdue"])},
        "invoices": items,
    }

    if a.json:
        print(json.dumps(out, indent=2))
        return

    print(f"\nChase list as of {out['as_of']}  (statutory interest {out['statutory_rate']}% a year, business customers only)")
    print(f"Owed to you: £{total:,.2f}   Overdue: £{overdue:,.2f} ({out['overdue_pct']}%)")
    print("\nBy age: " + "   ".join(f"{k} £{v:,.0f}" for k, v in out["by_bucket"].items()))
    print("\nPriority order")
    for t in items:
        late = f"{t['days_overdue']}d late" if t["days_overdue"] > 0 else f"due in {-t['days_overdue']}d"
        extra = f"  (+£{t['statutory_interest_to_date']:,.2f} interest, £{t['fixed_compensation']} comp)" if t["days_overdue"] >= 30 else ""
        print(f"  {t['customer'][:22].ljust(22)} {t['invoice'][:10].ljust(10)} £{t['amount']:>9,.2f}  {late.ljust(12)} → {t['next_step']}{extra}")


if __name__ == "__main__":
    main()
