#!/usr/bin/env python3
"""Cash Money UK tax calculator for 2026/27.

Income tax uses the rest-of-UK bands (England, Wales, NI). Scottish bands differ
for salary and trading income, so results for Scottish taxpayers are a rough guide.

Examples:
  tax_calc.py sole --profit 42000
  tax_calc.py ltd --profit 60000                 # finds the best salary
  tax_calc.py ltd --profit 60000 --salary 12570
  tax_calc.py compare --profit 50000
  tax_calc.py ct --profit 120000 --months 9
  tax_calc.py s455 --amount 8000 --loan-date 2026-05-01
"""
import argparse
import json
from datetime import date

TAX_YEAR = "2026/27"
R = {
    "pa": 12570, "pa_taper_start": 100000,
    "basic_band": 37700, "additional_from": 125140,
    "rates_earned": (0.20, 0.40, 0.45),
    "rates_div": (0.1075, 0.3575, 0.3935), "div_allowance": 500,
    "c4_lower": 12570, "c4_upper": 50270, "c4_main": 0.06, "c4_top": 0.02,
    "ee_pt": 12570, "ee_uel": 50270, "ee_main": 0.08, "ee_top": 0.02,
    "er_st": 5000, "er_rate": 0.15, "employment_allowance": 10500,
    "ct_small": 0.19, "ct_main": 0.25, "ct_lower": 50000, "ct_upper": 250000,
    "ct_mr_fraction": 3 / 200,
    "s455_from_2026": 0.3575, "s455_before_2026": 0.3375,
    "poa_threshold": 1000,
}


# ---------- building blocks ----------

def personal_allowance(total_income):
    over = max(0.0, total_income - R["pa_taper_start"])
    return max(0.0, R["pa"] - over / 2)


def _slice(start, amount, rates):
    """Tax `amount` of taxable income stacked on top of `start`."""
    limits = (R["basic_band"], R["additional_from"], float("inf"))
    tax, pos, left = 0.0, start, amount
    for limit, rate in zip(limits, rates):
        if left <= 0:
            break
        take = min(max(0.0, limit - pos), left)
        tax += take * rate
        pos += take
        left -= take
    return tax, pos


def income_tax(earned, dividends=0.0):
    """Income tax on earned (salary, trading) and dividend income. Dividends sit on top."""
    pa = personal_allowance(earned + dividends)
    pa_earned = min(pa, earned)
    pa_div = min(pa - pa_earned, dividends)
    taxable_earned = earned - pa_earned
    taxable_div = dividends - pa_div
    earned_tax, pos = _slice(0.0, taxable_earned, R["rates_earned"])
    allowance = min(R["div_allowance"], taxable_div)
    _, pos = _slice(pos, allowance, (0, 0, 0))
    div_tax, _ = _slice(pos, taxable_div - allowance, R["rates_div"])
    return {"personal_allowance": pa, "on_earnings": earned_tax,
            "on_dividends": div_tax, "total": earned_tax + div_tax}


def _banded(amount, lower, upper, main, top):
    return max(0.0, min(amount, upper) - lower) * main + max(0.0, amount - upper) * top


def class4(profit):
    return _banded(profit, R["c4_lower"], R["c4_upper"], R["c4_main"], R["c4_top"])


def employee_ni(salary):
    return _banded(salary, R["ee_pt"], R["ee_uel"], R["ee_main"], R["ee_top"])


def employer_ni(salary, employment_allowance=False):
    ni = max(0.0, salary - R["er_st"]) * R["er_rate"]
    if employment_allowance:
        ni = max(0.0, ni - R["employment_allowance"])
    return ni


def corporation_tax(profit, months=12, associated=0):
    if profit <= 0:
        return 0.0
    scale = (months / 12) / (associated + 1)
    lower, upper = R["ct_lower"] * scale, R["ct_upper"] * scale
    if profit <= lower:
        return profit * R["ct_small"]
    if profit >= upper:
        return profit * R["ct_main"]
    return profit * R["ct_main"] - R["ct_mr_fraction"] * (upper - profit)


def first_year_cash(bill, collected_by_paye=0.0):
    """Payments on account: if due, the first January bill is 150% of the year's tax."""
    if bill > R["poa_threshold"] and collected_by_paye < 0.8 * (bill + collected_by_paye):
        return bill * 1.5
    return bill


# ---------- scenarios ----------

def sole_trader(profit, other_income=0.0):
    it_all = income_tax(other_income + profit)["total"]
    it_other = income_tax(other_income)["total"]
    it_business = it_all - it_other
    c4 = class4(profit)
    tax = it_business + c4
    return {
        "structure": "sole trader", "profit": profit, "other_income": other_income,
        "income_tax_on_profit": it_business, "class4_ni": c4, "total_tax": tax,
        "take_home_from_business": profit - tax,
        "effective_rate": tax / profit if profit else 0.0,
        "first_january_if_first_year": first_year_cash(tax, it_other),
        "set_aside": tax,
    }


def limited(profit, salary, retain=0.0, ea=False, other_income=0.0, months=12, associated=0):
    er = employer_ni(salary, ea)
    taxable = profit - salary - er
    ct = corporation_tax(taxable, months, associated)
    after_ct = taxable - ct
    dividends = max(0.0, after_ct - retain)
    ee = employee_ni(salary)
    it_all = income_tax(other_income + salary, dividends)
    it_other = income_tax(other_income)["total"]
    it_director = it_all["total"] - it_other
    take_home = salary - ee + dividends - it_director
    total_tax = er + ct + ee + it_director
    return {
        "structure": "limited company", "profit_before_salary": profit,
        "salary": salary, "employer_ni": er, "employee_ni": ee,
        "company_profit_after_salary": taxable, "corporation_tax": ct,
        "retained_in_company": max(0.0, after_ct - dividends),
        "dividends": dividends, "personal_income_tax": it_director,
        "of_which_dividend_tax": it_all["on_dividends"],
        "total_tax": total_tax, "take_home": take_home,
        "effective_rate": total_tax / profit if profit else 0.0,
        "set_aside_company": ct,
        "set_aside_personal": it_director,
    }


def best_salary(profit, **kw):
    best, best_value = None, 0.0
    top = int(min(profit, 100000))
    for s in range(0, top + 1, 10):
        r = limited(profit, float(s), **kw)
        if r["company_profit_after_salary"] < 0:
            break
        value = r["take_home"] + r["retained_in_company"]
        if best is None or value > best_value + 0.5:
            best, best_value = r, value
    return best


def s455(amount, loan_date):
    rate = R["s455_from_2026"] if loan_date >= date(2026, 4, 6) else R["s455_before_2026"]
    return {"loan": amount, "loan_date": loan_date.isoformat(), "rate": rate, "s455_tax": amount * rate,
            "note": "Due if still owed 9 months and 1 day after year end. Refunded after repayment."}


# ---------- output ----------

def money(v):
    return f"£{v:,.0f}"


def show(title, rows):
    print(f"\n{title}  ({TAX_YEAR}, rest-of-UK bands)")
    width = max(len(k) for k, _ in rows)
    for k, v in rows:
        print(f"  {k.ljust(width)}  {v}")


def print_sole(r):
    rows = [("Profit", money(r["profit"]))]
    if r["other_income"]:
        rows.append(("Other income (PAYE)", money(r["other_income"])))
    rows += [("Income tax on profit", money(r["income_tax_on_profit"])),
             ("Class 4 NI", money(r["class4_ni"])),
             ("Total tax", money(r["total_tax"])),
             ("Take home", money(r["take_home_from_business"])),
             ("Effective rate", f"{r['effective_rate']:.1%}"),
             ("Set aside", money(r["set_aside"]))]
    if r["first_january_if_first_year"] > r["total_tax"]:
        rows.append(("First Jan bill (yr 1, incl. POA)", money(r["first_january_if_first_year"])))
    show("Sole trader", rows)


def print_ltd(r, label="Limited company"):
    rows = [("Profit before salary", money(r["profit_before_salary"])),
            ("Salary", money(r["salary"])),
            ("Employer NI", money(r["employer_ni"])),
            ("Corporation Tax", money(r["corporation_tax"])),
            ("Dividends", money(r["dividends"]))]
    if r["retained_in_company"]:
        rows.append(("Kept in company", money(r["retained_in_company"])))
    rows += [("Employee NI", money(r["employee_ni"])),
             ("Personal income tax", money(r["personal_income_tax"])),
             ("Total tax", money(r["total_tax"])),
             ("Take home", money(r["take_home"])),
             ("Effective rate", f"{r['effective_rate']:.1%}"),
             ("Set aside (company CT)", money(r["set_aside_company"])),
             ("Set aside (your SA bill)", money(r["set_aside_personal"]))]
    show(label, rows)


def main():
    p = argparse.ArgumentParser(description="Cash Money UK tax calculator (2026/27)")
    jp = argparse.ArgumentParser(add_help=False)
    jp.add_argument("--json", action="store_true", help="print JSON instead of a table")
    sub = p.add_subparsers(dest="cmd", required=True)

    def common(sp):
        sp.add_argument("--profit", type=float, required=True, help="annual profit before tax (and before director salary)")
        sp.add_argument("--other-income", type=float, default=0.0, help="salary from a job, taxed through PAYE")

    def ltd_opts(sp):
        sp.add_argument("--retain", type=float, default=0.0, help="£ to keep in the company instead of paying out")
        sp.add_argument("--ea", action="store_true", help="company can claim Employment Allowance")
        sp.add_argument("--months", type=int, default=12, help="accounting period length in months")
        sp.add_argument("--associated", type=int, default=0, help="number of associated companies")

    sp = sub.add_parser("sole", parents=[jp], help="sole trader tax")
    common(sp)
    sp = sub.add_parser("ltd", parents=[jp], help="limited company: salary + dividends")
    common(sp)
    ltd_opts(sp)
    sp.add_argument("--salary", type=float, help="fixed director salary (omit to find the best)")
    sp = sub.add_parser("compare", parents=[jp], help="sole trader vs limited company")
    common(sp)
    ltd_opts(sp)
    sp = sub.add_parser("ct", parents=[jp], help="Corporation Tax only")
    sp.add_argument("--profit", type=float, required=True)
    sp.add_argument("--months", type=int, default=12)
    sp.add_argument("--associated", type=int, default=0)
    sp = sub.add_parser("s455", parents=[jp], help="tax on an overdrawn director's loan")
    sp.add_argument("--amount", type=float, required=True)
    sp.add_argument("--loan-date", type=date.fromisoformat, default=date.today(), help="YYYY-MM-DD")

    a = p.parse_args()
    out = None

    if a.cmd == "sole":
        out = sole_trader(a.profit, a.other_income)
        if not a.json:
            print_sole(out)
    elif a.cmd in ("ltd", "compare"):
        kw = dict(retain=a.retain, ea=a.ea, other_income=a.other_income, months=a.months, associated=a.associated)
        salary = getattr(a, "salary", None)
        ltd = limited(a.profit, salary, **kw) if salary is not None else best_salary(a.profit, **kw)
        if a.cmd == "ltd":
            out = ltd
            if not a.json:
                print_ltd(ltd, "Limited company" + ("" if salary is not None else " (best salary)"))
        else:
            sole = sole_trader(a.profit, a.other_income)
            saving = ltd["take_home"] + ltd["retained_in_company"] - sole["take_home_from_business"]
            out = {"sole_trader": sole, "limited_company": ltd, "ltd_better_by": saving}
            if not a.json:
                print_sole(sole)
                print_ltd(ltd, "Limited company (best salary)")
                verdict = "Ltd better by" if saving > 0 else "Sole trader better by"
                print(f"\n  {verdict} {money(abs(saving))} a year before accountant and admin costs.")
                if a.retain:
                    print("  (Money kept in the company is counted, but it's taxed again when you take it out.)")
    elif a.cmd == "ct":
        ct = corporation_tax(a.profit, a.months, a.associated)
        out = {"profit": a.profit, "months": a.months, "associated": a.associated,
               "corporation_tax": ct, "effective_rate": ct / a.profit if a.profit else 0.0}
        if not a.json:
            show("Corporation Tax", [("Profit", money(a.profit)), ("Period", f"{a.months} months"),
                                     ("Associated companies", str(a.associated)),
                                     ("Corporation Tax", money(ct)),
                                     ("Effective rate", f"{out['effective_rate']:.2%}")])
    elif a.cmd == "s455":
        out = s455(a.amount, a.loan_date)
        if not a.json:
            show("s455 on director's loan", [("Loan", money(out["loan"])), ("Loan date", out["loan_date"]),
                                             ("Rate", f"{out['rate']:.2%}"), ("s455 tax", money(out["s455_tax"])),
                                             ("Note", out["note"])])

    if a.json:
        print(json.dumps(out, indent=2, default=str))


if __name__ == "__main__":
    main()
