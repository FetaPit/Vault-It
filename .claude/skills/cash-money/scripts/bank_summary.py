#!/usr/bin/env python3
"""Summarise a bank statement CSV (Tide or most UK banks) into bookkeeping categories.

Usage:
  bank_summary.py statement.csv
  bank_summary.py statement.csv --json
  bank_summary.py statement.csv --rules my_rules.json   # {"Category": ["keyword", ...]}

Finds the date, description and amount columns by their headers. Handles either one
signed amount column or separate paid-in / paid-out columns. Categories match
references/bookkeeping-categories.md. Anything it can't place goes to "Needs a decision".
"""
import argparse
import csv
import json
import re
import sys
from collections import defaultdict
from datetime import datetime

# Checked in order, first match wins. Keywords are matched case-insensitively.
RULES = [
    ("Tax payment (not an expense)", ["hmrc", "inland revenue"]),
    ("Transfer / owner money (not income or expense)", ["transfer to", "transfer from", "own account", "savings pot", "tide pot", "director loan", "drawings"]),
    ("Possibly personal: check", ["netflix", "spotify", "disney", "deliveroo", "just eat", "uber eats", "tesco", "sainsbury", "asda", "aldi", "lidl", "morrisons", "waitrose", " pub ", " bar ", " gym ", "amazon prime", "steam", "playstation", "xbox"]),
    ("Bank and payment fees", ["tide fee", "tide plus", "tide pro", "tide max", "monthly fee", "stripe fee", "paypal fee", "sumup", "zettle", "card reader", "bank charge", "overdraft fee"]),
    ("Professional fees", ["companies house", "accountant", "solicitor", "legal", "crunch", "freeagent", "xero", "quickbooks", "tide accounting"]),
    ("Phone, software and office", ["vodafone", "o2 ", "ee limited", "three.co", "giffgaff", "bt group", "virgin media", "sky broadband", "google workspace", "gsuite", "microsoft", "adobe", "canva", "notion", "slack", "zoom", "dropbox", "github", "openai", "anthropic", "claude.ai", "figma", "shopify", "squarespace", "wix", "godaddy", "namecheap", "ionos", "cloudflare", "royal mail", "post office", "apple.com/bill", "ryman", "viking"]),
    ("Advertising", ["google ads", "facebk", "facebook", "meta ads", "instagram", "linkedin", "tiktok ads", "mailchimp", "kit.com", "convertkit", "vistaprint", "moo print"]),
    ("Travel", ["trainline", " tfl ", "tfl travel", "transport for london", "uber", "bolt.eu", "addison lee", "national rail", "lner", "gwr", "avanti", "easyjet", "ryanair", "british airways", "premier inn", "travelodge", "booking.com", "airbnb", "ringgo", "justpark", "ncp", "paybyphone", "shell", "bp ", "esso", "texaco"]),
    ("Premises", [" rent ", "rent payment", "business rates", "council", "octopus energy", "british gas", "edf", "e.on", "simply business", "hiscox", "axa", "insurance"]),
    ("Wages and staff", ["salary", "payroll", "wages", "nest pension", "pension", "upwork", "fiverr", "deel"]),
    ("Cost of goods", ["wholesale", "supplier", "printful", "printify", "alibaba", "packaging", "screwfix", "toolstation", "travis perkins"]),
    ("Other", ["ico ", "information commissioner", "udemy", "coursera", "fsb", "federation of small"]),
    ("Needs a decision", ["amazon", "amzn", "paypal", "ebay", "apple.com", "argos", "currys", "ikea", "cash withdrawal", "atm"]),
]
INCOME_RULES = [
    ("Transfer / owner money (not income or expense)", ["transfer from", "own account", "director loan", "capital", "tide pot"]),
    ("Tax refund (not income)", ["hmrc"]),
    ("Loan (not income)", ["loan", "start up loans", "funding circle", "iwoca"]),
    ("Other business income", ["interest", "grant", "refund", "cashback"]),
]

DATE_FORMATS = ["%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d/%m/%y", "%Y-%m-%d %H:%M:%S", "%d %b %Y", "%d %B %Y"]


def find_col(headers, *needles):
    for i, h in enumerate(headers):
        hl = h.lower().strip()
        if any(n in hl for n in needles):
            return i
    return None


def parse_money(v):
    if v is None:
        return 0.0
    v = v.strip().replace("£", "").replace(",", "")
    if not v:
        return 0.0
    neg = v.startswith("(") and v.endswith(")")
    v = v.strip("()")
    try:
        n = float(v)
    except ValueError:
        return 0.0
    return -n if neg else n


def parse_date(v):
    v = v.strip()
    v = re.sub(r"T.*$", "", v) if "T" in v[:11] else v
    for f in DATE_FORMATS:
        try:
            return datetime.strptime(v, f).date()
        except ValueError:
            continue
    try:
        return datetime.strptime(v[:10], "%Y-%m-%d").date()
    except ValueError:
        return None


def categorise(desc, amount, rules, income_rules):
    d = f" {desc.lower()} "
    for cat, words in (income_rules if amount > 0 else rules):
        if any(w in d for w in words):
            return cat
    return "Sales" if amount > 0 else "Needs a decision"


def load(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        sample = f.read(4096)
        f.seek(0)
        try:
            dialect = csv.Sniffer().sniff(sample, delimiters=",;\t")
        except csv.Error:
            dialect = csv.excel
        rows = list(csv.reader(f, dialect))
    # Skip any preamble lines before the header row.
    for start, r in enumerate(rows):
        joined = " ".join(r).lower()
        if "date" in joined and any(k in joined for k in ("amount", "paid", "money", "credit", "debit", "in", "out")):
            return rows[start], rows[start + 1:]
    sys.exit("Couldn't find a header row with a date and amount column.")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("csv")
    ap.add_argument("--rules", help="JSON file of extra rules, checked first: {\"Category\": [\"keyword\"]}")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()

    rules, income_rules = list(RULES), list(INCOME_RULES)
    if a.rules:
        with open(a.rules) as f:
            extra = [(k, [w.lower() for w in v]) for k, v in json.load(f).items()]
        rules, income_rules = extra + rules, extra + income_rules

    headers, rows = load(a.csv)
    c_date = find_col(headers, "date", "timestamp")
    c_in = find_col(headers, "paid in", "money in", "credit", "in (")
    c_out = find_col(headers, "paid out", "money out", "debit", "out (")
    c_amt = find_col(headers, "amount", "value")
    text_cols = [i for i, h in enumerate(headers)
                 if any(k in h.lower() for k in ("description", "details", "reference", "name", "merchant", "payee", "counterparty", "narrative", "type"))]
    if c_date is None or (c_amt is None and c_in is None and c_out is None):
        sys.exit(f"Couldn't map columns. Headers found: {headers}")

    txns = []
    for r in rows:
        if not r or len(r) <= c_date:
            continue
        d = parse_date(r[c_date])
        if not d:
            continue
        if c_in is not None or c_out is not None:
            amount = (parse_money(r[c_in]) if c_in is not None and c_in < len(r) else 0.0) - \
                     abs(parse_money(r[c_out]) if c_out is not None and c_out < len(r) else 0.0)
        else:
            amount = parse_money(r[c_amt])
        if amount == 0:
            continue
        desc = " | ".join(r[i].strip() for i in text_cols if i < len(r) and r[i].strip())
        txns.append({"date": d.isoformat(), "description": desc, "amount": round(amount, 2),
                     "category": categorise(desc, amount, rules, income_rules)})

    if not txns:
        sys.exit("No transactions found.")

    by_cat = defaultdict(lambda: {"in": 0.0, "out": 0.0, "count": 0})
    by_month = defaultdict(lambda: {"in": 0.0, "out": 0.0})
    for t in txns:
        side = "in" if t["amount"] > 0 else "out"
        by_cat[t["category"]][side] += abs(t["amount"])
        by_cat[t["category"]]["count"] += 1
        by_month[t["date"][:7]][side] += abs(t["amount"])

    months = sorted(by_month)
    last3 = months[-3:]
    net = [by_month[m]["in"] - by_month[m]["out"] for m in last3]
    avg_net = sum(net) / len(net)
    review = sorted([t for t in txns if t["category"] in ("Needs a decision", "Possibly personal: check")],
                    key=lambda t: t["amount"])

    out = {
        "period": f"{txns[0]['date']} to {txns[-1]['date']}" if txns[0]["date"] <= txns[-1]["date"] else f"{txns[-1]['date']} to {txns[0]['date']}",
        "transactions": len(txns),
        "columns_used": {"date": headers[c_date], "amount": headers[c_amt] if c_amt is not None else None,
                         "paid_in": headers[c_in] if c_in is not None else None,
                         "paid_out": headers[c_out] if c_out is not None else None,
                         "description": [headers[i] for i in text_cols]},
        "by_category": {k: {kk: round(vv, 2) for kk, vv in v.items()} for k, v in sorted(by_cat.items(), key=lambda kv: -(kv[1]["in"] + kv[1]["out"]))},
        "by_month": {m: {"in": round(by_month[m]["in"], 2), "out": round(by_month[m]["out"], 2),
                         "net": round(by_month[m]["in"] - by_month[m]["out"], 2)} for m in months},
        "avg_monthly_net_last_3": round(avg_net, 2),
        "needs_review": review,
    }

    if a.json:
        print(json.dumps(out, indent=2))
        return

    print(f"\nBank summary: {out['period']}, {len(txns)} transactions")
    print(f"Columns used: {out['columns_used']}")
    print("\nBy category                                         In          Out    Count")
    for k, v in out["by_category"].items():
        print(f"  {k[:46].ljust(46)} £{v['in']:>10,.2f} £{v['out']:>10,.2f} {v['count']:>6}")
    print("\nBy month          In          Out          Net")
    for m, v in out["by_month"].items():
        print(f"  {m}  £{v['in']:>10,.2f} £{v['out']:>10,.2f} £{v['net']:>10,.2f}")
    print(f"\nAverage monthly net (last {len(last3)} months): £{avg_net:,.2f}")
    if review:
        print(f"\nNeeds a decision ({len(review)}), biggest first:")
        for t in review[:30]:
            print(f"  {t['date']}  £{t['amount']:>10,.2f}  {t['category'][:24].ljust(24)}  {t['description'][:60]}")
        if len(review) > 30:
            print(f"  ...and {len(review) - 30} more (use --json for the full list)")


if __name__ == "__main__":
    main()
