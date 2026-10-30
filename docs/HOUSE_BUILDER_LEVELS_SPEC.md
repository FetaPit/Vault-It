# Vault-It House Builder — Levels, Ghost Build & Mortgage Engine
*Expert-reframed brief (fintech product + engineering). Original request by Pete, 16 Oct 2026.*

---

## 0. One-paragraph brief
Turn the House Builder from a single deposit progress bar into a **three-level wealth game** that teaches and optimises the path **deposit → mortgage-free → trade-up**, powered by a **transparent, customisable UK mortgage engine**. The 3D/isometric house is the scoreboard: it is built in *ghost* (translucent) form and becomes solid as the user's **equity** grows. Every screen must answer one question: *"What should I do with my next £, to own more of this house sooner and pay the least interest?"*

## 1. Principles
1. **Illustrative, not advice.** Vault-It is not FCA-authorised for mortgage advice. All outputs are labelled illustrative, show assumptions, and link to "check your lender's terms / speak to a broker".
2. **Transparent maths.** Every number can be expanded to show formula, inputs and assumptions ("Show working").
3. **Reality-first.** Model UK lender behaviour (daily interest, monthly charge, overpayment allowances, ERCs, fixed-term expiry/reversion) rather than a textbook formula only.
4. **Gamified, not manipulative.** Progress, streaks and celebration — never shame, urgency timers, or pressure to over-leverage. Respect `prefers-reduced-motion`.
5. **One source of truth.** House Builder, Budget (monthly surplus), Debt Tracker and Net Worth read/write the same synced state (`ht3`), so the plan always matches the user's real numbers.

## 2. Levels

### Level 1 — "First Deposit" (ghost build)
- **Inputs:** first-property value (presets by property type + free entry), **deposit target %** (default **20 %**, editable 5–50 %), deposits logged (date, amount, optional source).
- **Goal:** fund 100 % of the deposit target.
- **House rendering:** the whole house is drawn in **ghost mode** (outline + translucent fill). Bricks/rows **solidify in proportion to deposit funded** (`funded% = saved ÷ depositTarget`). Unfunded bricks stay ghosted.
- **HUD:** deposit saved / target, % funded, bricks laid (`£ per brick = depositTarget ÷ bricks`), projected completion date (from monthly surplus and a user-set contribution), LTV band this deposit unlocks (95/90/85/80/75/60 %) with typical rate band shown as an *indicative* range.
- **Gamification:** XP per deposit, deposit streaks, milestone badges (1, 5, 10, 25, 50, 75, 100 %), "Brick laid" micro-animation, level-up ceremony at 100 %.
- **Exit:** user marks "Purchased" (existing `markHousePurchased`) → mortgage terms captured (see §3) → **Level 2 unlocks**.

### Level 2 — "Delete the Mortgage"
- **Goal:** own 100 % of the property outright (or reach the equity/LTV threshold to move up the ladder).
- **House rendering (owner's rule, 30 Oct 2026; replaces the earlier equity shading):**
  - **The Level 2 house is what was left to pay after the deposit goal:** `l2Base = price − depositTarget` (fixed at purchase in `state.purchase.depositTarget`). Progress `= (l2Base − mortgageBalance) ÷ l2Base`, drawn as full-colour bricks up to that height, hologram above (`hbL2Progress()`). Example: £100,000 house, 20 % goal = £20,000, so £80,000 is the whole Level 2 house; £2,000 saved over the goal builds 2,000 ÷ 80,000 = 2.5 %.
  - **At purchase** the balance is always worked out afresh: `mortgageBalance = price − saved` (an old balance is never kept). The excess over the goal is the first payment.
  - **After purchase** "Add to savings" becomes **Pay off the mortgage**: it lowers `mortgageBalance` and logs the payment in `state.payments` (the deposit stays as it was). The label reads `MORTGAGE x % PAID`, then `MORTGAGE FREE`.
  - **Reset tracker** returns to a clean Level 1 (all purchase fields cleared, type, price and deposit % kept) after a confirm, with a copy kept in `vi_bak_ht3`. Level 2 and 3 also offer **Not bought yet? Back to Level 1**, which keeps the savings log.
  - The Level 2 panel still states how much of the home you own (`(value − balance) ÷ value`) as a fact, under the progress bar.
  - **Interest halo (second layer):** the *projected remaining interest* over the current plan, drawn as a faint red/amber ghost extension that **shrinks** whenever the user overpays, shortens the term or refinances to a lower rate — making "interest slain" visible.
- **Cockpit (in-depth mortgage calculator, §3):** baseline vs scenario comparison; "Delete the mortgage" date; interest saved; equity at +1/+5/+10 years; best use of the next £100/£1,000 (overpay vs offset vs savings).
- **Gamification:** "Interest slain" meter (£ interest avoided vs baseline), equity-% ring, overpayment streak, months-shaved counter, badges at 25/50/75/90 % equity and mortgage-free; refix/remortgage reminders as quests.
- **Exit to Level 3:** equity ≥ user's trade-up threshold **or** user opts in to "Plan my upgrade".

### Level 3 — "Upgrade (second property)"
- **Planner:** target property value, projected sale price (growth assumption, editable), selling costs (agent %, legal, EPC/moving), buying costs (SDLT/LBTT/LTT via an editable, dated rate table, legal, survey), ERC on current deal, resulting **new deposit & LTV**, new mortgage payment, affordability headroom vs income (illustrative 4–4.5× income cap and a stress-rate test), and "months until ready" under the current plan.
- **Options:** sell-and-move, or keep-and-let (later, behind a flag).
- **Rendering:** the first house becomes a solid "foundation" icon; a larger **ghost** second house appears and fills with projected net equity.

## 3. Mortgage engine — functional spec (max customisation)

### 3.1 Loan set-up
Property value, deposit (£ or %), fees (arrangement £ — **paid upfront or added to loan**, valuation, legal), **term** (years+months), **start date**, **repayment type**: capital repayment · interest-only · **part-and-part** (£ on repayment / £ on interest-only).

### 3.2 Rate & product types
- **Fixed** (rate, fix length → **reversion** to SVR or user-assumed remortgage rate) · **Tracker** (Bank Rate + margin, with editable Bank Rate path) · **Discounted variable** / **SVR** · **Offset** (linked savings balance reduces interest-bearing balance daily).
- **Multiple product periods** per mortgage (e.g. 2-yr fix then tracker) and **stress scenarios** (+1 %, +2 %, custom).
- **Fee-vs-rate comparison** (total cost over the fix incl. arrangement fee).

### 3.3 Interest calculation modes (UK-realistic, switchable)
1. **Daily accrual, charged monthly** *(default; most UK lenders)* — daily rate = APR ÷ 365 (366 in leap years), applied to each day's balance; accrued interest added once per month; overpayments reduce interest from the day received.
2. **Monthly** — periodic rate = APR ÷ 12 on opening balance (simple textbook amortisation, for comparison with generic calculators).
3. **Annual** *(legacy; e.g. some older products)* — interest charged each 1 January on the previous 31 December balance, so mid-year overpayments only reduce interest at the next charge date.
4. **Offset-daily** — as (1) but on `balance − linked savings`.

### 3.4 Payments & overpayments
- **Contractual payment** (annuity) recomputed on rate change (Bank Rate move, fix expiry): `M = B·r / (1 − (1+r)^−n)`.
- **Overpayment types:** recurring monthly £ · one-off lump sums at chosen dates · **annual % increase** ("step-up") · **round-up** to next £ · **"use my monthly surplus"** (pulled live from the Budget) · windfall (bonus, tax refund).
- **Outcome mode:** **reduce term** (keep payment — maximum interest saving) vs **reduce payment** (keep term). Show both side by side.
- **Payment holidays / underpayment** (flagged as risky).

### 3.5 Constraints (modelled, not ignored)
- **Overpayment allowance** (default 10 % of balance per year; calendar-year vs anniversary-year; no carry-over) — **warn before breaching**.
- **Early repayment charge schedule** (per-year %, e.g. 5/4/3/2/1) applied to excess overpayment or full redemption; a **"break-even"** tool (ERC vs interest saved by switching early).
- **LTV bands** triggering better rates at remortgage: show "overpay £X to drop below 80 % LTV".

### 3.6 Outputs (all with "Show working")
Monthly payment · total interest · total cost · **payoff date** · balance & **equity** over time · **interest-vs-principal split** · year-by-year amortisation table (CSV export) · baseline-vs-scenario deltas (**interest saved, months saved, equity gained at +1/+5/+10 yrs**) · **next-£ optimiser** (ranked: overpay, offset, emergency fund first, savings at X %) · stress-test table.

### 3.7 Integrity & tests
- Pure, framework-free engine module (`mortgageEngine.js`-style functions) with **golden tests** against published calculators (e.g. Halifax/Nationwide worked examples), and property tests: balance never negative; Σprincipal = loan; term strictly non-increasing with overpayment; offset ≤ overpayment saving for equal sums; leap-year handling.
- Currency in integer pence internally; rounding rules documented; all rate/date tables (Bank Rate path, SDLT bands) **data-driven with an "as of" date**.

## 4. Data model (synced under `ht3`, versioned)
```
house: { schema:2, level, propertyType, firstValue, depositPct,
         deposits:[{id,date,amount,source}], purchased:{date,price},
         mortgage:{ loan, termMonths, start, repaymentType, splitInterestOnly,
                    products:[{from,to,type,rate|margin,fee,feeAdded,erc:[...]}],
                    interestMode, offsetLinked, allowance:{pct,basis} },
         plan:{ overpayments:[...], outcomeMode, scenarios:[...] },
         upgrade:{ target, growthPct, costs:{...}, thresholdLTV },
         gamification:{ xp, streak, badges[] } }
```
Migration from the current flat `state` (`saved/target/houseType/mortgageBalance/…`) is automatic and backed up (`vi_bak_ht3`) — **no user data lost**.

## 5. UX & rendering
- Ghost = same geometry as today's `drawTerraced/Semi/Detached/…`, drawn with alpha ∝ funded state per brick row; solid bricks keep the existing texture.
- Level switcher (chips) with locked/unlocked states; each level has its own HUD and "what to do next" card.
- Mobile-first (Z Fold unfolded ~640 CSS px and phone widths), keyboard accessible, text alternatives for the 3D scene ("38 % of the house is yours").
- Calculator as a slide-over with presets ("First-time buyer 5-yr fix", "Overpay £200/mo", "Offset", "Remortgage at 80 % LTV").

## 6. Compliance & trust
Disclaimer on every output ("Illustrative only, not financial advice; lender terms, ERCs and rates vary — check your offer document"); no product recommendations or affiliate ranking; show assumptions & dates; link to MoneyHelper / FCA; data stays in the user's account (RLS) and is excluded from analytics.

## 7. Delivery plan
| Phase | Scope | Ship criteria |
|---|---|---|
| **P1** | Levels shell, **deposit-% setting (default 20 %)**, **ghost rendering**, HUD, XP/streak/badges, schema v2 + migration | ghost→solid verified at 0/25/50/100 %; migration test; no data loss |
| **P2** | Mortgage engine (§3.1–3.4) + calculator UI + golden tests | engine tests green; baseline vs scenario matches reference calculators ±£1 |
| **P3** | **Level 2 equity shading + interest halo**, overpay vs offset optimiser, ERC & allowance guard | shading equals `equity%`; halo shrinks with overpayment |
| **P4** | **Level 3 upgrade planner**, stress tests, SDLT table, CSV export | planner reproduces hand-worked trade-up examples |

## 8. Acceptance criteria (headline)
1. Level 1 default deposit is 20 % of first-property value; user can change it; house is visibly ghosted and solidifies with each logged deposit.
2. At 15 % deposit/equity, **15 %** of the house is solid and the rest ghost; repaying principal solidifies bricks.
3. Calculator supports fixed/tracker/offset, daily/monthly/annual interest, repayment/IO/part-and-part, lump-sum/recurring/step-up overpayments, term-vs-payment reduction, ERC + 10 % allowance, product expiry & stress rates.
4. Every figure has "Show working"; all outputs carry the illustrative disclaimer.
5. Existing users' House Builder data migrates untouched and syncs across devices.

## 9. Open questions for Pete
1. **Interest halo**: show remaining interest as an extra ghost layer on the house (my proposal), or as a separate bar beside it?
2. Level 2 equity basis: **purchase price** only, or let users enter a **current valuation** (recommended)?
3. Level 3: sell-and-move only first, or include **keep-and-let**?
4. Which nation(s) for stamp duty — **England (SDLT)** first, then Scotland (LBTT) / Wales (LTT)?
5. Should "use my monthly surplus" auto-pull from the Budget's unassigned £ (e.g. £356/mo today)?

---

## References (researched 16 Oct 2026)
- Overpayment calculators & term-vs-payment reduction: [Nationwide](https://nationwide.co.uk/mortgages/mortgage-calculators/overpayment-calculator) · [Halifax](https://www.halifax.co.uk/mortgages/mortgage-calculator/overpayment-calculator/) · [Santander](https://santander.co.uk/personal/mortgages/mortgage-calculators/overpayment-calculator) · [Legal & General](https://www.landc.co.uk/mortgages/mortgage-overpayment-calculator) · [Kandoo](https://www.kandoo.co.uk/calculators/mortgage-overpayment-calculator) — note most **ignore ERCs/allowances**, an opportunity to model them.
- 10 % annual overpayment allowance & ERC behaviour (lender-specific): Santander and Halifax pages above.
- Offset vs overpayment: [Which? — offset mortgages](https://www.which.co.uk/money/mortgages-and-property/mortgages/types-of-mortgage/offset-mortgages-aiIjm1Y7NYlV) · [Scottish Widows offset calculator](https://scottishwidows.co.uk/bank/mortgages/offset_calculator) · [YBS offset calculator](https://www.ybs.co.uk/mortgages/mortgage-calculators/offset-mortgage-calculator).
- Interest calculation methods (daily vs annual): [Coventry BS — how is my interest calculated?](https://www.coventrybuildingsociety.co.uk/member/help/mortgages/how-is-my-interest-calculated.html) · [MoneyHelpDesk](https://www.moneyhelpdesk.com/blog/how-is-mortgage-interest-calculated/).
- Generic UK repayment maths & deposit/LTV bands: [Rightmove calculator help](https://faq.rightmove.co.uk/support/solutions/articles/7000071765-how-do-you-work-out-the-monthly-repayments-on-your-calculator-) · [Rightmove weekly mortgage tracker](https://www.rightmove.co.uk/press-centre/?p=3993) (indicative rates by LTV; verify before use).
- To verify before building (not confirmed in research): current **FCA MCOB 11** affordability/stress-test rules, current **SDLT/LBTT/LTT** bands, and current Bank Rate path.
