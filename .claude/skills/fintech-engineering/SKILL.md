---
name: fintech-engineering
description: Vault-It's engineering standard for anything that touches money, payments, accounts or saved data. Money arithmetic and rounding, interest and payoff maths, UK rules and figures, the FCA boundary, payments, auth, Supabase and privacy. Load it before building or reviewing a change to a calculation, a forecast, debts, deposits, net worth, prices, Stripe, PIN or sign-in, sync, migrations or edge functions. The fintech-dev agent works to it.
---

# Fintech engineering at Vault-It

Vault-It shows people their own money and a path out of debt into a home. A wrong figure is worse than a missing one: users plan real decisions on it. Every rule below exists to keep a figure right, explainable and private.

Read `CLAUDE.md` first (standing rules, branches, tests, the ship-item flow). This file adds the money layer.

## 1. Money arithmetic
1. **Store and compare in pence or with an epsilon.** JS numbers are floats: `0.1 + 0.2 !== 0.3`. For any equality or "reached the target" check use `Math.round(x * 100)` integers, or `a >= b - 0.005`. Never `===` on pounds.
2. **Round once, at the edge.** Keep full precision through a calculation; round to pence for display (`gbpFmt`) and when a figure is stored as the user's own entry. Do not round inside loops (a 300-month payoff loop accumulates the error).
3. **Rounding rule:** half up to the penny for display. Say which rule a test expects.
4. **Inputs are strings until proven otherwise.** Parse with `+x || 0` or `parseFloat`, then reject `NaN`, `Infinity` and negatives where they make no sense. An empty field is 0, not `NaN` on screen.
5. **Totals reconcile.** If a screen shows parts and a total, the total is the sum of the parts as displayed, or the gap is explained. Net worth = assets minus liabilities minus debts, everywhere it appears (`computeNetWorth`).
6. **Currency display** goes through the app's converter (`VI_CURRENCY_RATE`, `VI_CURRENCY_SYMBOL`); figures are held in GBP.

## 2. Interest, payoff and forecasts
1. **Name the convention.** Credit cards and loans quote APR. The app uses nominal monthly rate `APR / 100 / 12`; the true monthly rate is `(1 + APR/100)^(1/12) - 1`. Either is defensible; the code and the "show working" text must say which, and tests must use the same one.
2. **Edge cases every payoff loop handles:** zero balance, zero rate, payment exactly equal to interest, **payment below interest (negative amortisation: report "never at this payment", not the loop cap)**, one-penny final payment, a debt added mid-plan, the cap reached.
3. **Snowball and avalanche roll over.** When a debt clears, its minimum payment moves to the next debt in the order (smallest balance first for snowball, highest rate first for avalanche). Ties break deterministically (then by name or id).
4. **Forecasts are illustrative.** A projection shows its assumptions (rate, monthly saving, start figure) next to the result and the words "illustrative" or "estimate". Never present a forecast as a promise (FCA rule 4 below).
5. **Dates:** months, not 30-day blocks; the tax year runs 6 April to 5 April; use the user's local date for "this month".

## 3. UK rules and figures
1. **Never guess a figure** (owner's standing rule: "do not guess any figures"). Allowances, bonuses, thresholds, stamp duty bands, base rate: each lives in one constants block with its source and an "as of" date, and the owner confirms it before it ships.
2. Known shapes the app relies on (confirm current values before use): ISA annual allowance; Lifetime ISA limit, bonus and age rules; first-time buyer stamp duty relief; Bank of England base rate. If a value is not in the code with a source, ask, do not invent.
3. Housing figures come from the user's own form (deposit %, target price). Brick value is `depositTarget * 0.77 / bricksTotal` (do not change how deposits, prices, house types, levels or saved data work).

## 4. The FCA boundary
1. Vault-It is **not regulated by the FCA and gives no financial advice**. "Not regulated by the FCA. Not financial advice." stays visible.
2. **Information and guidance, never a personal recommendation.** Allowed: "Paying the highest rate first saves the most interest" (a general fact), "At this rate it clears in 14 months" (their own maths). Not allowed: "You should open a LISA", "Move your savings into X", product picks, or anything that reads as telling this person what to do with their money.
3. No promised outcomes, no "guaranteed", no urgency or scarcity, no invented testimonials (owner's marketing rules apply in the app too).
4. Rewards (XP, levels, the free month) reward using the tracker, never taking on debt, opening a product or investing.

## 5. Data, privacy and sync
1. **Never clear data on a user's device.** Saved-data changes are additive (new fields with defaults); old shapes keep loading. Migrations of a saved shape need a test that loads the old shape.
2. **Nothing writes after account deletion** (`window._viDeleted` guard) and nothing writes in demo mode unless the existing code does.
3. Privacy copy must match what the code does; `tests/test_beta_client.js` fails if the app calls a host the notice does not name. **No new outside hosts** without the owner's yes and a notice update.
4. Minimise personal data: no figures in logs, feedback trails or analytics (the feedback module strips amounts; keep it that way). No PII in test fixtures beyond `t@t.com`.
5. UK GDPR: export and delete must keep working (`exportFromDeleteDialog`, `confirmDeleteAccount`, `test_beta_client`).

## 6. Payments, auth and the server
1. **Never trust the client for paid status.** Paid state comes from the server (`stripe-webhook`, `paid_gateway` migration 011). The client may show, never grant.
2. Stripe webhooks: verify the signature, dedupe on the event id (idempotent), handle replays and out-of-order events, return 2xx only after the write.
3. Prices shown must match the Stripe links (`tests/test_signup_page.js`). Price changes are the owner's call.
4. PIN and sign-in: `PIN_PEPPER` never changes (every PIN would break); keep the rate limits (migration 008); fail closed, not open.
5. Supabase: every table has row level security tied to `auth.uid()`; the service-role key lives only in Supabase secrets; the publishable key in `index.html` is public by design. **Migrations before the functions that use them. Any production change (migration, function deploy, secret) needs the owner's explicit yes.**
6. Escape every user string rendered as HTML (`xss*.js` tests). Treat imported files and feedback text as untrusted.

## 7. Tests a money change needs
1. **Hand-worked golden cases** in the test, with the working in a comment (for example a £1,000 card at 24% APR, £50 a month: month 1 interest £20.00, balance £970.00).
2. **Edge cases** from section 2.2 and 1.4, each one assertion.
3. **Reconciliation:** parts sum to the total on screen.
4. **Old saved data loads** when a stored shape changes.
5. Write the test first and see it fail on the old code (ship-item rule). Run the guards: `test_beta_client test_copy`, plus `xss` if user text is rendered.

## 8. Review checklist (copy into the reply)
- [ ] Float safety: no `===` on pounds; rounding once, at the edge
- [ ] Interest convention named and consistent with the "show working" text
- [ ] Payoff edge cases: zero rate, payment below interest, rollover, cap
- [ ] No invented UK figure; constants sourced and dated
- [ ] FCA: guidance not advice; illustrative wording; FCA line visible
- [ ] Saved data additive; old shape loads; no writes after deletion
- [ ] No new host; privacy copy still true; no figures in logs
- [ ] Payments and auth: server is the source of truth; webhook idempotent
- [ ] Supabase: RLS, migration order, owner's yes for production
- [ ] Tests: golden, edge, reconciliation, guards
