#!/usr/bin/env python3
"""13-week cash flow forecast from a simple JSON plan.

Usage:
  cashflow_forecast.py --example > plan.json     # template to fill in
  cashflow_forecast.py plan.json
  cashflow_forecast.py plan.json --detail        # list items in each week
  cashflow_forecast.py plan.json --json

Plan fields:
  start            first day of week 1 (YYYY-MM-DD), default today
  weeks            default 13
  opening_balance  cash in the bank at the start
  buffer           warn if the balance drops below this (default: 0)
  weekly_baseline  {"in": 0, "out": -150} small regular spending not listed elsewhere
  recurring        [{"name", "amount", "every": "week|fortnight|month|quarter",
                     "day": day of month (month/quarter), "months": [1,4,7,10] (quarter),
                     "from": "YYYY-MM-DD", "until": "YYYY-MM-DD"}]
  dated            [{"name", "amount", "date"}]  one-offs: invoices due in, tax bills, kit
Money in is positive, money out negative.
"""
import argparse
import calendar
import json
import sys
from datetime import date, timedelta

EXAMPLE = {
    "start": "2026-11-09",
    "weeks": 13,
    "opening_balance": 8000,
    "buffer": 3000,
    "weekly_baseline": {"in": 0, "out": -100},
    "recurring": [
        {"name": "Retainer: Acme Ltd", "amount": 2500, "every": "month", "day": 28},
        {"name": "Director salary (net)", "amount": -1048, "every": "month", "day": 25},
        {"name": "PAYE to HMRC", "amount": -95, "every": "month", "day": 22},
        {"name": "Software subscriptions", "amount": -120, "every": "month", "day": 3},
        {"name": "Tide fee", "amount": -12, "every": "month", "day": 1},
    ],
    "dated": [
        {"name": "Invoice INV-014 Beta Ltd", "amount": 3600, "date": "2026-11-20"},
        {"name": "Dividend", "amount": -3000, "date": "2026-12-15"},
        {"name": "Accountant year-end fee", "amount": -900, "date": "2027-01-10"},
        {"name": "Self Assessment (director)", "amount": -2100, "date": "2027-01-31"},
    ],
}


def d(s):
    return date.fromisoformat(s)


def month_day(y, m, day):
    return date(y, m, min(day, calendar.monthrange(y, m)[1]))


def occurrences(item, start, end):
    every = item.get("every", "month")
    lo = max(start, d(item["from"])) if item.get("from") else start
    hi = min(end, d(item["until"])) if item.get("until") else end
    out = []
    if every in ("week", "fortnight"):
        step = 7 if every == "week" else 14
        cur = d(item["from"]) if item.get("from") else start
        while cur <= hi:
            if cur >= lo:
                out.append(cur)
            cur += timedelta(days=step)
    elif every in ("month", "quarter"):
        months = item.get("months") if every == "quarter" else list(range(1, 13))
        if every == "quarter" and not months:
            sys.exit(f"Quarterly item '{item['name']}' needs \"months\", e.g. [1,4,7,10].")
        day = int(item.get("day", 1))
        y, m = lo.year, lo.month
        while date(y, m, 1) <= hi:
            if m in months:
                when = month_day(y, m, day)
                if lo <= when <= hi:
                    out.append(when)
            m += 1
            if m > 12:
                y, m = y + 1, 1
    else:
        sys.exit(f"Unknown 'every' value '{every}' on '{item['name']}'.")
    return out


def forecast(plan):
    start = d(plan["start"]) if plan.get("start") else date.today()
    weeks = int(plan.get("weeks", 13))
    end = start + timedelta(days=7 * weeks - 1)
    buffer = float(plan.get("buffer", 0))
    base = plan.get("weekly_baseline", {})
    events = []
    for it in plan.get("recurring", []):
        events += [(when, it["name"], float(it["amount"])) for when in occurrences(it, start, end)]
    for it in plan.get("dated", []):
        when = d(it["date"])
        if start <= when <= end:
            events.append((when, it["name"], float(it["amount"])))
        elif when < start:
            print(f"Note: '{it['name']}' on {when} is before the forecast start, ignored.", file=sys.stderr)

    bal = float(plan.get("opening_balance", 0))
    rows = []
    for w in range(weeks):
        ws, we = start + timedelta(days=7 * w), start + timedelta(days=7 * w + 6)
        items = sorted([e for e in events if ws <= e[0] <= we])
        cash_in = sum(a for _, _, a in items if a > 0) + float(base.get("in", 0))
        cash_out = sum(a for _, _, a in items if a < 0) + float(base.get("out", 0))
        bal += cash_in + cash_out
        rows.append({"week": w + 1, "week_start": ws.isoformat(), "in": round(cash_in, 2), "out": round(cash_out, 2),
                     "net": round(cash_in + cash_out, 2), "closing": round(bal, 2), "below_buffer": bal < buffer,
                     "items": [{"date": i[0].isoformat(), "name": i[1], "amount": i[2]} for i in items]})
    low = min(rows, key=lambda r: r["closing"])
    return {
        "start": start.isoformat(), "end": end.isoformat(), "opening_balance": float(plan.get("opening_balance", 0)),
        "buffer": buffer, "closing_balance": rows[-1]["closing"],
        "lowest": {"week": low["week"], "week_start": low["week_start"], "balance": low["closing"]},
        "weeks_below_buffer": [r["week"] for r in rows if r["below_buffer"]],
        "weeks_negative": [r["week"] for r in rows if r["closing"] < 0],
        "rows": rows,
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("plan", nargs="?")
    ap.add_argument("--example", action="store_true", help="print a template plan")
    ap.add_argument("--detail", action="store_true")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    if a.example:
        print(json.dumps(EXAMPLE, indent=2))
        return
    if not a.plan:
        ap.error("give a plan.json, or use --example")
    with open(a.plan) as f:
        r = forecast(json.load(f))
    if a.json:
        print(json.dumps(r, indent=2))
        return

    print(f"\n13-week cash forecast  {r['start']} to {r['end']}")
    print(f"Opening £{r['opening_balance']:,.0f}   Closing £{r['closing_balance']:,.0f}   "
          f"Lowest £{r['lowest']['balance']:,.0f} (week {r['lowest']['week']}, w/c {r['lowest']['week_start']})")
    print("\n  Wk  w/c          In          Out         Net      Closing")
    for row in r["rows"]:
        flag = "  ← below buffer" if row["below_buffer"] else ""
        if row["closing"] < 0:
            flag = "  ← OVERDRAWN"
        print(f"  {row['week']:>2}  {row['week_start']}  £{row['in']:>9,.0f}  £{row['out']:>9,.0f}  £{row['net']:>9,.0f}  £{row['closing']:>9,.0f}{flag}")
        if a.detail:
            for i in row["items"]:
                print(f"        {i['date']}  {i['name'][:40].ljust(40)} £{i['amount']:>9,.0f}")
    if r["weeks_negative"]:
        print(f"\n  Overdrawn in weeks {r['weeks_negative']}. Act now: chase, delay, or arrange funding.")
    elif r["weeks_below_buffer"]:
        print(f"\n  Below the £{r['buffer']:,.0f} buffer in weeks {r['weeks_below_buffer']}.")
    else:
        print(f"\n  Stays above the £{r['buffer']:,.0f} buffer throughout.")


if __name__ == "__main__":
    main()
