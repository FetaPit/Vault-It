# Brand rollout: audit, plan and status

Branch `brand-rollout` (from `Pioneer_v3` at 8e8cca5). This is the single live plan for the rollout: the Step 0 audit, the phase order and status, the house builder Level 2 analysis and the approved groupings. Creative direction and the owner's answers: `brand/ECD_BRIEF.md`. Brand brief: `brand/vault-it-brand-handover.md`.

## 1. Audit

| Item | What the app does today |
| --- | --- |
| Entry files | `index.html` (1.69 MB, all CSS, JS and markup inline), `landing.html` (vault-it.co), `recover.html`. No framework. The only build steps are `tools/build_hb3d.js` (embeds `src/hb3d`) and `tools/build_site.js` (Cloudflare). |
| CSS variables | One `:root` block (index.html ~line 6478) with the old names (`--bg --c1..c4 --em --em2 --em3 --dp --go --go2 --gr --re --tx --t2 --t3 --bd --bd2 --ta`). Phase 1 maps them to the new tokens and keeps the old names as aliases. |
| Tabs | **9**, not 8: Overview, Budget, House builder, Assets, Debt, Entrepreneur, Achievements, Connections, **Network**. The brand table has no row for Network. Sub-tab buttons: 25 references. |
| House builder renderer | **three.js r128** (`src/hb3d/kit.js`, `viewer.js`, six models), true UK scale in metres, instanced meshes sorted by build time. Progress `p = saved / depositTarget` (`pct()`), `depositTarget = price * depositPct / 100`. Row label: `row = ceil(p * rows.n)` per model (`hbRowStats`). Brick value: `depositTarget / bricks` per model (`hbBrickInfo`). SVG drawing is the fallback. |
| New engine vs current | The brand engine is plain WebGL with one fixed house (154 courses, 14,465 bricks). It cannot replace the six to-scale models without losing house types, so it **sits beside** the current builder behind `?house=new` / `vi-flag-house`, as the brief says. |
| Levels | L1 build, L2 equity shading (`hbSceneMode` mode `equity`, `eq = (valuation - balance) / valuation`), L3 upgrade planner. `hbLevel()` is driven only by `state.houseMode === 'purchased'`. |
| Tests | `test_hb3d_app`, the kit scale test, `test_roadmap`, `test_beta_client` (outside hosts). |
| Icons | 66 inline `<svg>`; text glyphs: ✎ 4, ✕ 44, ＋ 11, ◈ 18, ✓ 80, ↩ 2, ‹ 2, › 3. Many emoji used as icons (🏠 🧱 🚀 🔒 🎉). |
| Wordmark | "Vault-It" with a hyphen 23 times in `index.html`; "Vault-It" 55 times; landing uses "Vault-It" only. |
| Fonts | Loads Syne, DM Sans, Share Tech Mono, **DM Mono** and **Playfair Display** (both to remove). |
| Theme | No light mode, no `data-theme` anywhere. |
| Offline caching | The service worker is built from a `blob:` URL. Browsers refuse to register those, so **the app has no working offline cache today** (the error is swallowed). |
| Staging | Cloudflare builds only `release/pioneer-v2`. Checks are local builds and Playwright screenshots in the session. |

## 2. Order and status (one phase per commit, owner's order of 30 Oct 2026)

| # | Phase | Status |
| --- | --- | --- |
| 1 | Tokens and Night / Daylight switch | Done |
| 2 | Fonts and glyph clean-up | Done |
| 3, 4 | Icons from the sprite, menu bar (tab colours, neon outline on the selected tab only, Network hidden, compact = icons only, phones and tablets start compact) | Done |
| 5 | Colour code | Done |
| 6 | Daylight polish (brief's phase 7) | Done |
| 7 | Logo and wordmark (brief's phase 8): 23 "Vault-It" with a hyphen, nav logo, `<title>`, `og:title`, manifest, favicon, tagline | Done |
| 7b | Item 3D viewer for the wealth inventory and liabilities: .glb upload, Night viewer with orbit and zoom, green tint on every model, Poly Pizza library behind `?modeltest=1` (see `docs/WEALTH_INVENTORY_3D_OPTIONS.md`, "Built") | Done, needs the owner's phone test |
| 8 | Groupings H1 to H4, O1, O2, D1 to D3, A1 (section 4, all approved) | Done |
| 9 | House builder Level 2 fix (section 3) | Next |
| 10 | Brand look and every animation on all six three.js models in `src/hb3d` (owner chose option a), behind `?house=new` | Built behind the flag (`src/hb3d/brand.js`, `tests/test_hb_brand.js`, `docs/HB3D_KIT.md` "Brand build"), needs the owner's phone test |
| 11 | Net worth in 3D as the Overview hero: 3D blocks first, Graph toggle, choice remembered, blocks in the sub-tab colours, behind `?nw=new` | |
| 12 | On by default for testers once the owner signs off on the phone (old builder reachable from Settings for a week) | |
| 13 | `landing.html` brand pass; a service worker that registers (today's is a `blob:` URL browsers refuse); cache version bump | |
| 14 | Full suite and the QA list (brief section 9). Release only when the owner asks | |

### Working notes

- Canvas colours: `viCss(name)`, `viRgba(name, a)`, `viLight()`; charts redraw on the `vi-theme` event. SVG built in JS uses `style="fill:…"` so tokens resolve.
- Asset class colours (sub-tabs, side panel, overview list, net worth blocks): metals gold, crypto teal, cash green, wealth inventory purple, stocks and funds green 2, house deposit teal, liabilities amber, debt red.
- Debts (owner, 30 Oct): every debt keeps its lender's colours (`CC_BRANDS`) wherever it appears, in Night and Daylight: card artwork, histogram, donut, tree map, loan tile, overview summary, and the 3D net worth blocks to come. Debts with no known lender share a red ramp, largest strongest. All from `debtChartRamp(debts)`; near-black cards show their accent, colours close to the panel get a hairline.
- Liabilities (owner, 30 Oct): the logged value shows everywhere (KPI, summary card, sub-tab, 3D view to come) with running costs as the second line. Net worth maths unchanged: the value counts as owned, running costs so far come off.
- Daylight (phase 6): Daylight-only rules live in `<style id="vi-daylight">`. Chart and roadmap SVG strings go through `viDay(str, brand)` (Night colours to Daylight); they redraw on the theme switch. **3D viewports (`.scene`, `.inv-stage`) keep the Night look in both modes** (owner, 30 Oct): the Night tokens and aliases are re-declared on them. `test_daylight` fails if any text outside a viewport drops under 3:1 in Daylight.
- Wealth inventory 3D models: options and recommendation in `docs/WEALTH_INVENTORY_3D_OPTIONS.md` (awaiting the owner).
- Daylight tokens changed from the brand file's first values so small text reaches 4.5:1 on paper and tinted chips (same hues): teal #24716C, gold #7F6112, brass #806827, orange #964E19, red #C02323, salmon #AF4C49, amber #955F06, yellow #7B6B07. `brand/vault-it-tokens.css` matches. Metals have tokens `--m-silver`, `--m-platinum`, `--m-palladium`.
- Tests: the test browser reports a light device, so the app opens in Daylight under test. `test_cc3d` needs `test_hb1` to run first. `test_colour_code` covers phase 5.
- Level 2 code to reuse: mortgage engine `hbcRead`, `hbL2Sims`; Budget spare `hbBudget()`. **Owner's rule for the overpayment what-ifs:** spare = unassigned + savings + investments, with the trade-off line.

### Copy pass still to do

- About 500 em dashes remain in `index.html`, many in user-facing copy (hints, toasts, roadmap text). Each needs rewording (comma, colon or full stop), not a blind replace. Proposed as a small copy phase, or folded into each later phase for the screens it touches.

### Money owed to you: **built 30 Oct** as the Debtors sub-tab of Debt Tracker (owner moved it there from Assets; Creditors = what you owe). Original proposal:

- **Where it lives:** a seventh sub-tab in Assets and liabilities, "Owed to you" (people, deposits held by a landlord, refunds due), each with an amount, who owes it, an expected date and a "how sure" setting (expected or doubtful).
- **Net worth:** expected amounts count as something you own; doubtful ones are shown but left out, so the headline figure never rests on money that may not come back.
- **Dashboard:** one row in the "Own and owe" card and its own column above the plane in the 3D net worth view, in blue (the one hue no asset class uses). Not a separate KPI: it is usually small, and the stat strip stays at four figures.

### Open colour questions for the owner

**Decided 30 Oct (owner said yes):** debt progress bar red to green; monthly minimums, business MRR and monthly figures and the "warm" stage gold; budget save rate and positive net worth history change green. Done. Original list:
- Debt progress bar (red to brass), Debt tab "monthly minimums"
- Budget "save rate"
- Business MRR and monthly figures, "in progress" and "warm" stage labels
- Net worth history change when positive
- ~~Total assets green or teal~~: **teal** (owner, 30 Oct 2026). Done.

## 3. House builder Level 2 bug

### What goes wrong

1. **Stale mortgage balance.** `markHousePurchased()` only sets `mortgageBalance` when it is empty. Any balance left from an earlier purchase or the mortgage calculator is kept, so the extra saved above the goal never shows.
2. **Money added after purchase goes nowhere.** "Add to savings" raises `state.saved`, but Level 2 draws from `mortgageBalance`, so the house does not change.
3. **Reset does not reset.** "Reset tracker" clears `saved` and `deposits` only. `houseMode`, `mortgageActive`, `mortgageBalance`, `purchase`, `valuation`, `level3` and `viewLevel` stay, so the app stays on Level 2. Nothing in the app ever sets `houseMode` back.
4. **Wrong Level 2 picture for the owner's rule.** Today Level 2 shows equity of the whole house (a 20% deposit = 20% solid). The owner wants Level 2 to be a new full-colour build of what is left to pay.

### Owner's rule for Level 2

House £100,000, deposit goal 20% = £20,000, so £80,000 is left to pay. That £80,000 is 100% of the Level 2 house. Anything saved above the goal builds it: £2,000 extra builds 2,000 / 80,000 = 2.5%.

### Fix

- `l2Base = price - depositTarget` (fixed at purchase, saved in `state.purchase`).
- At purchase: `mortgageBalance = price - saved`, always recomputed. The excess (`saved - depositTarget`) is the first payment.
- Level 2 progress `= (l2Base - mortgageBalance) / l2Base`; the house is drawn in full colour at that progress.
- After purchase, "Add to savings" becomes "Pay off the mortgage": it lowers `mortgageBalance` and logs the payment.
- "Reset tracker" returns to a clean Level 1 (clears all the purchase fields above), after a confirm, with a copy kept in `vi_bak_ht3`. If deposits are removed so `saved` falls below the goal, the app drops back to Level 1.
- `docs/HOUSE_BUILDER_LEVELS_SPEC.md` is updated to this rule (it currently says "15% deposit = 15% solid"). Tests added for: £2,000 over on £100k at 20% = 2.5%; reset returns to Level 1; payments after purchase move the house.

## 4. Simplification: group tiles that affect each other (all approved 30 Oct 2026)

Nothing is removed. Each change only moves existing controls together.

| # | Tab | Today | Proposed |
| --- | --- | --- | --- |
| H1 | House | House type, price, deposit % (one card), floor (own card), Add to savings (own card) | One **Your house plan** card: type, price, deposit %, floor (flats only), amount to add, brick value |
| H2 | House | Build progress, Statistics, Milestones as three cards | One **Progress** card: bar, bricks, tiles, remaining, milestone strip |
| H3 | House | Savings log + reset, Contribution streak as two cards | One **History** card with the streak on top, log below, reset at the foot |
| H4 | House | Upload 3D model, Generate with AI as two cards | One collapsed **Your own design** card |
| O1 | Overview | Assets summary, Liabilities summary, Debt summary as three cards | One **Own and owe** card with three rows that link to their tabs |
| O2 | Overview | Milestone targets, Goals, Snapshots | One card with Goals / Snapshots as tabs |
| D1 | Debt | Four KPI cards | One stat strip |
| D2 | Debt | Debt histogram, Debt breakdown | One chart card with a Histogram / Breakdown toggle |
| D3 | Debt | Debt strategy, Interest cost analysis | One card: pick the strategy, see the interest it costs |
| A1 | Assets | Holdings and Spot prices (metals) as two cards | One card: holdings with the live price beside each metal |
