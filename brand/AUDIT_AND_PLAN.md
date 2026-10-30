# Brand rollout: Step 0 audit and plan

Branch `brand-rollout` (from `Pioneer_v3` at 8e8cca5). Nothing in the app has changed yet. This note is the audit the handover asks for, the plan waiting for the owner's approval, and the house builder Level 2 bug analysis.

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
| Wordmark | "Vault-It" with a hyphen 23 times in `index.html`; "Vault·It" 55 times; landing uses "Vault·It" only. |
| Fonts | Loads Syne, DM Sans, Share Tech Mono, **DM Mono** and **Playfair Display** (both to remove). |
| Theme | No light mode, no `data-theme` anywhere. |
| Offline caching | The service worker is built from a `blob:` URL. Browsers refuse to register those, so **the app has no working offline cache today** (the error is swallowed). |
| Staging | Cloudflare builds only `release/pioneer-v2`. Checks are local builds and Playwright screenshots in the session. |

## 2. Proposed order (one commit per phase)

1. Tokens and Night / Daylight switch
2. Fonts and glyph clean-up
3. Icons from the sprite
4. Menu bar (tab colours, no dots)
5. Colour code
6. Daylight polish (brief's phase 7)
7. Logo and wordmark (brief's phase 8)
8. **Simplify: group related tiles** (only the items the owner approves, section 4)
9. **House builder Level 2 fix** (section 3)
10. New house engine behind `?house=new`
11. Net worth scene and tracker behind `?nw=new`
12. `landing.html`
13. Offline cache that works (a real `sw.js`), version bump

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

## 4. Simplification: group tiles that affect each other (awaiting approval)

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
