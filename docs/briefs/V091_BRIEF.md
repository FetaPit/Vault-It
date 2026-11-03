# Vault-It v0.9.1: creative brief (final round of edits)

By Pedro, creative director. 3 Nov 2026. British English, sentence case, no em dashes.

## How to read this

- **Code reference is LIVE only**: `index.html` at 5e8b5a5 (release-20261103, 29,747 lines). Written `L:12213` means line 12213 of that file. The `scratchpad/br` checkout (brand-rollout, 15a7a9b) is 109 commits behind live and has none of the v0.7 to v0.9 code; do not build from it. Brand book lines are `BB:`.
- Breakpoints for every "done" check: **1440, 1100** (desktop), **768, 690** (tablet), **390** (phone). Themes: **Night and Daylight**. Note that 3D viewports stay Night in Daylight by design (L:19, L:7072), so Daylight checks cover the page around them.
- Standing checks on every edit: no text under 10.5 px except the allowed 10 px uppercase Syne tier (`--vi-fs-0..3` = 10, 10.5, 11.5, 12.5 px at L:14084; verify with `tools/type_audit.js`), no em dashes, FCA line visible, `prefers-reduced-motion` respected, no sideways page scroll at 320 and 390, no new outside host without a privacy line (`tests/test_beta_client.js`), saved data from today still loads untouched.
- Colour roles (ECD brief and handover): teal net worth and "built", green assets and "cleared", blue surplus and Budget, gold "now" and brand gold, brass achievement, red owed, amber liabilities, purple wealth inventory.
- Evidence level: every "Where" line was read in the live file. Behaviour claims marked (to confirm) need a screenshot before a builder trusts them.

---

## Global and header

**E1. "the header bar with the Vault-It icon needs to have the interactive rotating V icon from brand book top right"**
- Finding: the brand book has no rotating V in its header (BB:373-375 is a static mid mark). The rotating piece is the Logo section's primary icon (`#iconXL`, BB:568): the V stays still and the 60-tick dial ring (`.ticks`, BB:2161) turns 60 degrees per press of "Turn the dial" (`turnDial`, BB:2178, 900 ms ease) and once automatically when it scrolls into view (BB:2198). The app header mark is the static micro icon `.vi-mark`, 26 px (L:11086, markup L:11981), at the left, not top right.
- Where: `L:11981` (`.vi-mark` inside `.nav-brand`), CSS `L:11086`; reuse `iconSVG("full")` logic from BB:2155-2177.
- Done looks like: header mark shows the dial with ticks (full variant), 44 px at 1100 and above, 36 px at 768 and 690, 28 px at 390. One turn of 60 degrees on load, and again on each click or tap of the mark (the click still goes to Overview). The ticks ring turns, the V and gold brick stay still. Reduced motion: no turn, static. Night and Daylight use the day variant (`data-adapt`, BB:375). Header height does not grow above 72 px (see E2) and nothing wraps.
- Clash: see Q1 (size versus the "full from 96 px" brand rule, and "top right").

**E24. "keep them pinned to the top ... cash and savings, stocks and shares, precious metals, wealth inventory, crypto, and liabilities"** (Global behaviour, lives in Assets; listed under Assets below.)

**E27. "the message that dev tile only needs to be shown on the dashboard, remove it from the rest"**
- Where: card `#vi-devcard` (markup near L:12028), mover `viDevCardPlace` (L:14574) appends it to the open tab's last block. Test to update: `tests/test_v08_chrome.js` (asserts it is on every tab).
- Done looks like: the card exists only inside the Overview panel, last block as today; on Budget, House builder, Assets, Debt, Entrepreneur, Achievements, Connections it is absent from the DOM (not just hidden). Feedback button and footer unchanged. Update the v0.8 chrome test to assert Overview-only. 1100 and 390, both themes.

**Carried in: sidebar summary colours**
- "Total assets and Monthly surplus still teal; should be green and blue, net worth teal, red when negative."
- Where: `viRenderLedger`, `L:14890` (Total assets, `var(--teal)` to `var(--green)`), `L:14893` (Monthly surplus, to `var(--blue)`). Same fix for the Budget block repeats: `L:14920` Surplus and `L:14921` Savings rate are teal, make them blue (Budget colour). Net worth line already teal and red when negative (check `L:14889`).
- Done looks like: icon, label and value colour on those lines match: Total assets green, Monthly surplus blue (red when negative), Net worth teal (red when negative). Night and Daylight tokens (green `#3ECF8E`/`#207F54`, blue `#64B5F6`/`#0B72C4`), contrast 4.5:1 on the sidebar panel in both. Sidebar open at 390 and 1100.

## Overview

**E2. "the menu bar needs to be larger on desktop ... The icons need to be larger."**
- Where: `#topnav` desktop rules `L:10867` (tab button: height 36, `.62rem` Syne), `L:10871` (icon 18 px), grid row 60 px at `L:10956-10962`, tight tiers `L:10934-10935`, and `viNavFit` (decides one row versus tight versus compact).
- Direction: from 1280 px up, tab height 48, icon 24, label 12.5 px (`--vi-fs-3`), header row 68 to 72 px. At 1100 to 1279: icon 22, label 11.5 px, row 64 px, labels kept. Active outline and glow unchanged.
- Done looks like: at 1440 and 1100 the nav is one row (no wrap, no scroll), all seven tabs plus net worth, Back Vault-It and Night/Daylight visible; measured tab icon 24 px at 1440 and 22 px at 1100; the left sidebar offset (`#left-sidebar{top:60px}` `L:10962`) follows the new height, and so does the sticky bar in E24. 768/690 and 390 unchanged (icons-only 22 px, phone bottom bar).
- Risk: at 1100 the larger labels may push `viNavFit` into the tight tier (labels shrink). If it does, drop label size before icon size; icons are what the owner asked for.

**E3. "The roadmap ... is currently being redesigned ... that update will move into there."**
- Where: nothing in this round. Belongs to the Wealth Roadmap branch (`claude/bold-carson-tey49m`, 3eae67c).
- Done looks like: no v0.9.1 builder touches the Achievements/Roadmap tab. Merge order: Roadmap lands first, then E9.

## Overview (continued)

**E4. "we do not need to show simultaneously the graph the cash flow graph and the version 3D, so just show the 3D version on the dashboard"**
- Finding (to confirm with a shot): `#cf-sankey` has the `hidden` attribute (`L:12213`) but `.cf-scroll{display:flex}` at `L:14199` (min-width 900 px) beats the browser's hidden rule, and only `#bd-sankey` has a `[hidden]` override (`L:14398`). So on desktop the flow diagram shows under the 3D tile (`#cf3d-stage`, `L:12215`). That matches the owner seeing both.
- Where: `L:12213`, `L:14199`, `L:14398`.
- Done looks like: add `#cf-sankey[hidden]{display:none!important}`; `#ov-cf-card` shows the 3D stage, its read line, the pill key and "Open Budget" only. At 1440, 1100, 768, 690 and 390 the card has no visible SVG diagram (bounding height 0) and no "swipe sideways" hint. Skip drawing into the hidden host (`L:19379`, `L:23655`, `L:23862`) so it costs nothing.

**E23. "the y-axis of the net worth in 3D viewport needs to be increased. By 20%"**
- Where: `#nw3d-hero-stage{height:clamp(300px,44vh,520px)}` `L:28354`; phone rule `L:28356`.
- Direction: read "y-axis" as the viewport being 20% taller (the scene frames itself, so the blocks grow with it).
- Done looks like: at 1440x900 and 1100x800 the stage height is 1.2 times today's (clamp becomes `clamp(360px,53vh,624px)`), measured 1:1.2 within 2 px; width unchanged; 768 and below unchanged. The "what each column is" legend and Goals card stay in view without a sideways shift.
- Clash: see Q2 (if "y-axis" means taller columns rather than a taller window).

## Budget

**E5. "committed essential, variable essential ... savings, investments pills need to be larger and can span the width of the window"**
- Where: `#bd-legend` (`L:12260`), built by `cfLegendHTML` (`L:19666`), styled as 22 px, 10.5 px pills at `L:14356-14359`.
- Direction: desktop pills become a full-width key. 1440: six equal pills in one row; 1100 to 1439: three per row, two rows; each pill 40 px high, label 13 px DM Sans, icon 22 px in the group colour (`bdGroupIcon(t,22)`), 10 per cent tint and 60 per cent outline kept. Labels never truncate ("Variable non-essential" needs about 190 px: six across only fits from about 1400, estimate, check).
- Done looks like: at 1440 and 1100 the pills' outer edges equal the card's content width (within 2 px), no wrapped label text, measured label 13 px; 768/690 three per row at 12 px; 390 keeps the compact 22 px wrapping key at 10.5 px. Both themes.

**E6. "remove that text and make the viewport larger"**
- Where: `<span class="nw3d-sub bd3d-sub">` at `L:12267`; stage `#bd3d-stage` shares `#bd3d-stage,#cf3d-stage{height:clamp(300px,46vh,520px)}` at `L:14399`; phone `L:14400`.
- Done looks like: the paragraph is gone; `#bd3d-read` carries the one-line how-to ("Tap or hover a block to read it, drag to turn it") so the hint survives without the paragraph; Budget stage is `clamp(400px,64vh,720px)` from 1100 px up while `#cf3d-stage` (dashboard) keeps its own height (split the selector); 768 `clamp(360px,56vh,560px)`; 390 `min(104vw,440px)`. Canvas `aria-label` kept. "Everything else works really well here" means no other change on this card.

## House builder

**E7. "all one colour ... the icons are very small ... make this more legible and engaging"**
- Where: the six stat tiles `.hb-stx` built by `_st()` at `L:16014-16020` (bricks, to go, deposit, roof tiles, XP, streak); CSS `L:14478-14491`. In screenshot 1 every icon is 22 px teal on an identical dark tile.
- Pedro direction (colour roles, one meaning each):
  - Bricks laid: **teal** (built).
  - To go: **blue** (the plan, remaining to save).
  - Deposit goal: **gold** (the brand's "now" and the target).
  - Roof tiles: **green** (stage cleared).
  - XP: **brass** (achievement).
  - Streak: **orange** (heat).
- Tile anatomy: 3 px top rule in the role colour, icon 32 px (desktop, container 820 and up), 28 px tablet, 24 px phone, inside a 44 px disc tinted 12 per cent of the role colour; value Share Tech Mono 22 px in `--text` (not coloured, for contrast); label 11.5 px `--t2`. Six across at 1100 and 1440, three by two at 768 and 690, two by three at 390 (the container-query steps at `L:14494-14499` stay).
- Done looks like: six tiles visibly different in colour, each pair of icon and value readable at arm's length in the 1440 shot; icon at least 28 px at 1100; text contrast 4.5:1 in Night and Daylight (tints in Daylight use the day tokens, handover phase 1); no tile text clipped at 390 (`white-space:nowrap` ellipsis on the value at `L:14488` must not cut "£16.0k").

**E11. "move the milestones to the right of the window, in desktop, and have them in a timeline chronologically ... percentages larger and in gold text"**
- Where: milestone set `_mss` / `.mss` (`L:15997-16026`, CSS `L:14486-14496`), labels `MS_LABELS` (`L:15905`), percentages `MS_PCTS`. Layout parent `.hb-pg` (`L:14465`) is a single column.
- Direction: at 1100 and up the progress tile becomes two columns (about 60/40): left = saved, bar, next milestone, row card, stats; right = **vertical timeline**, earliest at top. A 2 px rail runs down the left of the column: teal and solid up to the current progress (built), dashed muted after. Each node: 20 px dot (teal check when done, gold ring with a soft pulse for the next one, hollow muted for later). Row: percentage left in **gold** Share Tech Mono 20 px (min 18 px), name Syne 13 px beside it; the next milestone also shows "£x to go". Final node "Keys are yours" is brass with the trophy icon. Done rows keep full-contrast text; later rows are muted but must still meet 4.5:1 (the current `opacity:.45` on `.ms` fails; use a muted token, not opacity).
- 768/690: single column, same vertical timeline under the stats. 390: same, compact 36 px rows.
- Done looks like: at 1440 and 1100 the timeline is the right column and its top aligns with the saved amount, ten nodes in 1%, 5%, 15% ... 100% order, percentages measured at least 18 px and gold (`--gold`, Daylight `#8B6A15`); done count equals `p>=q/100`; no overlap with the viewport above; heights of the two columns within 40 px so no big void.
- Clash: see Q3 ("right of the window" could mean right of the 3D viewport).

**E8. "improve the icons for the types of house. To make them more detailed"**
- Where: six inline 24x24 SVGs, stroke 1.3, in `#htypes` (`L:12414-12421`; keys terraced, semi, detached, mansion (label Manor House), flat, apartment). Screenshot 1 shows them at about 28 px, all the same grey-teal, barely distinguishable.
- Direction: redraw on a 48 grid, hairline 1.1 teal stroke with 16 per cent teal fill (the sprite rule), one gold accent per icon (the front door, echoing the logo's gold brick). Details, matched to the 3D models' silhouettes: terraced = three joined fronts, stepped roof, three doors, chimney pots; semi = mirrored pair, shared central party wall, two doors, one ridge chimney; detached = gabled with bay window, side garage, chimney; manor = five bays, central pediment, columns, two wings; flat = single block, balconies, entrance canopy; apartment = tall tower, window grid, roof plant. Render at 44 px desktop, 36 px tablet, 32 px phone. Keep `data-type` keys and button behaviour.
- Done looks like: at 32 px (390) the six are told apart without reading the label; stroke weight identical across the six; labels 11.5 px; active tile outlined teal as today; Night and Daylight. Screenshot pair at 390 and 1100.

**E9. "these milestones should link into the gamification wealth roadmap. So add XP and stuff."**
- Where: `hbXP()` `L:15933` (20 per deposit, 1 per £100, 500 on purchase); badge precedent `hbBadgeToasts` / `state.gam.seen` (Level 1). The Roadmap redesign is on `claude/bold-carson-tey49m` (step-by-step XP, 20 levels).
- Direction: each of the ten milestones awards one-time XP, once, recorded by milestone id in `state.gam` (additive), with the existing toast style ("+50 XP · Foundations poured") and the XP tile in E7 counting it. Values are game points, not money. Build only after the Roadmap branch merges so there is one XP source.
- Done looks like: reaching a milestone adds its XP once (reload and re-save do not repeat it); milestones already reached silently backfill with no toast burst; XP tile and Roadmap XP agree; the milestone row shows "+n XP" on done nodes. Test: cross each of the ten thresholds; assert XP deltas and no double award.
- Clash: see Q4 (XP values, and the dependency).

**E10. "your house builder hologram ... point size is a little too small"**
- Where: the note `.hb-pg-note` (`L:14470`, `max(.5rem,var(--vi-fs-1))`, 10.5 px floor), the lead "Your house builds as a hologram" at `L:16009-16010`, and the label `LEVEL 1 · FIRST DEPOSIT · hologram build` (`L:16003`).
- Done looks like: measured computed size at 1440 and 1100 is at least 13 px for the note and 12.5 px for the card label; 768 and 690 at least 12 px; 390 at least 11.5 px. "hologram" bold stays. Sweep the same tile for any other 10.5 px copy at desktop (the "Each brick" line, "Next:" line) and lift them to 12 px. `tools/type_audit.js` on the House tab at 1100 shows no element under 11.5 px in the Level 1 tile.

**E26. "in the tile where it says level 1 first deposit, select what type of account ... pull the icon for the bank plus the interest rate ... amount invested ... 25% government bonus ... the new bank account in 2027"**
- Where: Level 1 tile `L:16003` and the deposit add path (`state.deposits.push({amount,date})` `L:15709`); bank logo helper `viBankLogo` `L:19835` (www.google.com favicon, already covered by the privacy notice).
- Direction (if approved, see Q5): each deposit optionally carries an account: Cash ISA, Lifetime ISA, other ISA, savings, money box, "linked to something else", and "First Time Buyer ISA (not open yet)"; provider name drives the logo; interest rate is the user's own number. Keep this separate from the Cash and savings tab: the sidebar already lists "House deposit" and "Cash and savings" as separate lines (`L:14897`, `L:14900`), so a separate store means no double count in net worth.
- Done looks like: a deposit saved without an account behaves exactly as today (same `state.saved`, same bricks); with an account it shows a bank chip (logo, name, rate) on the log line; a Lifetime ISA deposit shows "Estimated 25% bonus: £x, paid by your provider" as a separate line that is NOT added to `state.saved`. Old saves load untouched. Tests: bricks and saved identical before and after; chip renders at 390.

## Assets: Cash and savings

**E12. "as the user puts in their bank type, and current account ... that amount should be in a separate box ... a separate gold tile on the ground plane. With the icon of the bank and the separate value."**
- Note: screenshot 2 is the **Precious metals** viewport (one gold bar on one plate), but the owner is describing the **Cash and savings** scene. Today `v3CashContent` (`L:20869`) draws all cash as one field of stacks under one tag; accounts are `alState.cashAccounts` `{id,name,type,balance}` (`L:21380`).
- Direction: one plate per account on the ground plane, arranged in a grid, each plate sized to its own block layout; stacks on each plate for that balance; a gold tag per plate (existing `v3Label`/`v3Plant` style) with the account name and its value; physical cash (the Put in/Take out log) is its own plate with a wallet glyph. The bank icon: draw the sprite bank glyph on the tag; the real logo is a cross-origin favicon image, which would taint a WebGL texture, so show the real logo in the account row and in an HTML key beside the scene (see Q6). Total tag stays.
- Done looks like: N accounts give N plates (plus one for physical cash when above £0) at 1440, 1100, 768, 390; each tag value equals that account's balance and the plates sum to `alTotalCash()`; the camera frames all plates; 12 accounts still readable (plates wrap to rows). WebGL-off fallback (`renderCashISO`, `L:25210`) still shows one total.

**E13. "The three D engine here is performing really badly ... rendering each coin separately. Once the coins are stacked ... treated as one shape."**
- Finding: the live engine is already instanced and cached. `v3Stack` builds one cylinder per 10-coin stack (`L:20839`), `v3CashContent` places them with an `InstancedMesh` (`L:20869-20880`), content is cached by key (`L:20895-20905`), shading is baked, and `V3Scene` has an adaptive lite mode. So coins are NOT drawn one by one in the WebGL path; the slow cases are likely the shadow map and device pixel ratio on large balances, up to 20,000 instances, or the flat SVG fallback (`renderCashISO` draws each coin as an SVG element). Profile before changing anything.
- Direction: measure first (`renderer.info.render.calls` and `.triangles`, frame time while orbiting, on the owner's balance and on £250k). Then: merge finished plates into one static mesh each (one draw call per plate); freeze shadows (`shadowMap.autoUpdate=false`, redraw only on change); cap DPR at 1.5 for this scene; keep the instanced path only for the animating stacks.
- Done looks like: before and after numbers in the PR: draw calls at most 2 per plate plus 3 fixed; triangles at £250k no more than half of today; orbit frame time at the owner's balance not worse than 33 ms p95 on a throttled CPU run; no visual change at 1100 (shot diff); Daylight unaffected.

**E14. "we don't have an intro animation here. Stacking the coins like we stack the bricks ... triggered on view."**
- Where: scene `#cashSceneCard` (`L:12619`); the brick language is `HB3D BRAND` drop-in, flash gold, settle (ECD brief section 3). `V3Scene` already has an `IntersectionObserver` (`_off`).
- Direction: when the scene first scrolls into view (and when its tab opens), stacks drop onto their plate one after another (row by row), flash gold, settle to the coin colour; total run at most 1.6 s whatever the count (stagger scales with stack count); a short line confirms ("£4,200 laid: 420 stacks"). Plays once per visit to the tab, and for the new stacks on E16.
- Done looks like: first view plays the drop; leaving and returning to the sub-tab within the session plays it again only if the balance changed; reduced motion: no animation, scene appears complete; no animation work after it ends (loop stops); with 20,000 stacks it degrades to a fade, not a drop. A test asserts final instance positions equal the static layout.

**E15. "add the percentage of interest on each account. So then that's calculated each time."**
- Where: add row `#ca-name`, `#ca-type`, `#ca-bal` (`L:12596-12600`); table in `renderAlTab` (`L:21281-21283`); `addCashAccount` (`L:21380`).
- Direction: an optional "Interest rate (AER %)" field per account (user's own number). Row shows the rate, "about £x a year" and "about £y a month" (balance times AER, labelled illustrative), and the tab header shows total estimated yearly interest. Rate editable in place; blank means no interest shown.
- Done looks like: £10,000 at 4.5% shows £450 a year and £37.50 a month; changing balance or rate recalculates in the same render; total interest equals the sum; nothing is added to net worth (illustrative only, FCA line visible on the tab). Money logic untouched.
- Clash: see Q7 (new saved field).

**E16. "if it's a current account, or savings account ... easily remove money and add money."**
- Where: same table; precedent is the Physical cash log `pcAdd(1)` and `pcAdd(-1)` (`L:12611-12614`, `L:21390`).
- Direction: each account row gets "+ Add" and "- Take out" opening a small inline amount (and date) field, with confirm; updates the balance and logs the movement on the account; toast with Undo for 6 s. The scene shows the new coins landing or lifting (E14).
- Done looks like: adding £250 to a £1,000 account gives £1,250, one new movement, 25 new coins drop; taking out more than the balance is refused with a one-line message (current accounts included, see Q7); Undo restores exactly; values match the 3D tag; works at 390 with 44 px targets.

## Assets: Stocks and shares

**E17. "I don't know why it's saying that my total return is -39,000 and my invested is 42,000 ... judge them at the point of the user inputting ... current value and then amount initially invested"**
- Finding: the tiles are computed at `L:20003-20005` from `avgCost` (user typed or imported): Invested = sum of units times average cost over holdings that have one; Total return = their current value minus that. A -£39,000 on £42,000 means a holding's average cost is far above its value (for example a pence versus pounds mix-up or units versus £ amount); I cannot see the owner's data.
- Direction: relabel to the owner's words and make the basis the point of entry. Tiles: "Current value", "Invested (at the time you added it)", "Change since you added it". When a holding is added without an average cost, record the price at that moment as its basis (`stkAddCore`, `L:~20120`). Do not rewrite stored `avgCost` on existing holdings. If a stored basis is more than three times the current price, show "Check your average cost" on that row instead of a huge loss.
- Done looks like: add 10 units at £5 live: Invested £50, Change £0.00; after a refresh at £5.50, Change +£5.00; the three tiles sum correctly per pie and per All; an existing holding with a bad average cost shows the nudge, not a headline -£39,000; no prior history applied to new holdings.
- Clash: see Q8 (changes how return is calculated, saved basis).

**E18. "It'd be nice to have some 3D elements on the investment tab, but I don't know what that would be."** (design call)
- Evidence: every other money tab already has one hero scene in blocks (net worth blocks, budget tree map of £100 blocks, cash coins, metal bars); Stocks has none, and its Allocation card already has a Bars | Tree map switch (`L:20046`) using the shared segmented control. The engine `ViNW3D.makeTreeMap` (`L:27256` in br; same code in live) already lays a tree map of blocks.
- Pedro direction: **"Your portfolio in blocks"**, a third switch on Allocation: Bars | Tree map | 3D. Same layout as the 2D tree map (one plot per holding, grouped by pie, pie colour). Blocks are the app's £100 unit. Inside each plot: solid blocks up to what you invested; extra **gain** blocks in a lighter tint with a thin gold edge; a **loss** shows as see-through ghost blocks where the value fell short. Gold tag per pie with its value. No new host, no new library, falls back to the 2D tree map without WebGL.
- Done looks like: third segment present and remembered (`vi-stk-alloc`); scene total equals "Current value"; invested, gain and ghost block counts match E17's tiles; hover/tap reads "SONY, £194, +£12 since added"; intro uses the E14 drop-in, instant under reduced motion; stage 400 px at 1100, 320 px at 390; labels at least 10.5 px; both themes.

**E19. "allocation tree map is nice, give it more space ... Overlapping ... brown circles"**
- Finding from `stkDrawTreemap` (`L:20065-20085`): the map height is `max(240, min(460, W*0.72))`; a tile gets a label only when it is over 70x46 px; smaller tiles are `.dtm-sm` and render as empty rounded pebbles shaded darker by position (`86 - min(j,5)*9` per cent of the pie colour over `#0b1018`), which is the "brown circles"; the name shown is `h.sym`, so a fund shows its code (for example `0P0001O...`); `.dtm-n` is single line with ellipsis (`L:14344`); "BP" is clipped because the label threshold (46 px high) is smaller than the two-line content plus padding (about 58 px).
- Direction: taller map (`W*0.9`, up to 640 px at 1100 and up; 360 at 390); show a human name when the symbol looks like a fund code (starts with `0P` or is over 8 characters), wrap the name to two lines; label threshold set from the content (at least 58 px high and 64 px wide); everything below the threshold in a pie merges into one labelled "Other (n)" tile in that pie's colour, not pebbles; keep the tap or hover tip for the merged tile listing its holdings.
- Done looks like: with the owner-style data (a 5.8% share, a 4.5% fund, a £31 and £25 holding) no tile text is cut off, no unlabelled pebbles, no overlap (assert no label box exceeds its tile); names readable at 10.5 px minimum, 12 px at 1100; map at least 1.25 times today's height at 1100 and 1440; Night and Daylight; tile list in the tooltip equals the merged holdings.

**E20. "add the ticker icons or the company icons"**
- Where: holding rows (`stkRender` rows, `L:~20020`), tree map tiles, `stkLogoBadge`/`stk-mini-logo` (`L:19867`, `L:19886`), provider matching `stkProviderMatch`.
- Direction: logo beside each holding (24 px in rows, 20 px in tree map tiles at least 56 px wide). Source: company or fund-provider domain via the favicon service already named in the privacy notice (`www.google.com`, `logo.clearbit.com` are in `tests/test_beta_client.js` COVERED list); fallback is a round initials badge in the pie colour. A small local ticker-to-domain table for the common shares; funds use the provider's logo.
- Done looks like: logos load for common holdings, fall back to initials on error, never break layout (fixed 24 px box), `alt=""` decorative, `referrerpolicy=no-referrer` as the existing helpers do; no new host; `test_beta_client.js` passes.

## Assets: Precious metals

**E21. "viewport is running very slow ... apply [cash improvements] to the viewport for the precious metals"**
- Where: `v3MetalsContent` (`L:20922`), `v3MetalsNow` (`L:20954`). It already uses instanced bars per denomination and a key guard.
- Done looks like: same measured budget as E13 (draw calls, triangles, p95 frame time) on 1 oz, 100 oz and 1,000 oz gold plus all four metals; same frozen shadows and DPR cap; same intro as E14 (bars slide in and stack); before and after numbers recorded. Do after E13 and E14.

**E22. "where it says you hold troy ounce ... a button that triggers the intro animation ... four commit buttons"**
- Where: `renderMetalsInputs` (`L:21147`): each metal row has a Hold input (`onchange="updateMetal"`, `L:21166`) that saves and redraws immediately; four rows: gold, silver, platinum, palladium.
- Direction: one button per row, "Add to vault" (and the same on Enter), that commits the staged number and plays that metal's bars arriving in the 3D scene. Reducing the number plays the bars lifting out. Keep the live price field as is. The scene shows the committed amount only; the input shows a draft state ("Not in your vault yet") while they differ.
- Done looks like: typing 5 and pressing the button gives 5 oz in saved data, the scene animates only that metal's zone, tag and value update, a one-line confirm shows "+5.00 oz gold, £x". Navigating away or blurring with a staged value commits it silently without the animation so nothing typed is lost. Four buttons, one per row, 44 px targets at 390. Reduced motion: no animation.
- Clash: see Q9 (message cut off; commit semantics).

## Assets: Crypto

**E32. "a copy paste version of the stocks and shares dashboard bought for crypto ... crypto icons added automatically ... keep the tiles function ... donut tree map"**
- Where: `#assets-crypto` (`L:~12570`, today a plain table, `#crypto-table`, add row `cr-sym`, `cr-amt`, `cr-price`); the pattern is the Stocks card set (stat tiles, grouped holdings, Bars | Tree map | 3D, E17 to E20). Build after E17, E19, E20.
- Direction: same three tiles (current value, invested at the time added, change since added), grouped holdings (by wallet or exchange the user names, default "My crypto"), allocation Bars | Tree map | 3D in Crypto teal, coin badges beside each coin.
- Done looks like: same layout and spacing as Stocks at 1440, 1100, 768, 390; a holding of BTC, ETH and SOL gives three tiles in the tree map with correct percentages; existing `alState.crypto` entries (`{sym,amount,price}`) load untouched and appear; live prices from CoinGecko as now.
- Clash: see Q10 (coin icon source).

## Wealth inventory and Liabilities

**E28. "link to market value ... Gibson Les Paul ... aggregate a value ... as long as the user can define what condition ... trigger a search once the user inputs a collectible, and the liabilities"**
- Where: `docs/LIVE_MARKET_VALUE.md` step 3 (eBay estimate), still "waiting on the owner".
- Done looks like: not buildable until the owner clears Q11. If approved: item name plus condition (new, excellent, good, fair, poor) triggers one search; result shown as a range with sample size and date, labelled "Estimate from sold listings, illustrative", never auto-applied to net worth without a tap.

**E29. "upload different 3D model files, like STLs, not just GLBs. OBJs"**
- Where: upload input `accept=".glb,model/gltf-binary"` (`L:22021`), size check `L:22032`, loader `L:16679-16683`, storage `i3dGetBuf` reads `v.glb` from IndexedDB (`L:21866`).
- Direction: accept `.glb`, `.gltf` (single file), `.stl`, `.obj` (STLLoader and OBJLoader from the same `three@0.128.0` jsDelivr path, no new host). Store the format beside the buffer (`fmt`), keep reading old records that only have `glb`. STL has no colour: tint it with the item's colour.
- Done looks like: a `.stl` and an `.obj` each preview and persist across reload; an old `.glb` saved before this round still opens; a file over 25 MB or a wrong type shows a one-line error; both themes; no new host in `test_beta_client.js`.

**E30. "once the user clicks 3D, let's link that to a search function to our own repo of 3D models"**
- Where: current 3D search fetches from Poly Pizza (`I3D_PP`, `L:21870-21874`) and fails on bot checks; branch `ccr-7de92975-69tcos` (4e7d1e7) has the picker and catalogue but is cut from old v0.6 main and unproven.
- Done looks like: port to live code; the 3D button opens a searchable grid of our own catalogue (`models/catalog.json`, CC0 and CC-BY under 20k triangles); selecting one attaches it; CC-BY credit shown in the item and on a credits page. Blocked on Q12 (new host and privacy line).

**E31. "image search isn't working properly ... could not reach photo library"**
- Where: `imgSearch` (`L:22179`) calls Openverse (`OPENVERSE`, `L:22177`) from the browser with about a one-second gap; the message appears when the fetch itself fails.
- Done looks like: first reproduce on the owner's device and browser (network, CORS or a block); then fix or fall back to a second source or our own set; a failure message names the reason (offline, blocked, rate limited) and offers upload. Test `tests/test_img_search.js` extended with a failed-fetch case.

## Crowdfund modal

**E25. "back Vault-It ... Vaulter level needs to be at 4.99 with a 30-day free trial ... 2 yearly subscriptions ... vaulters at 5.99, discounted to 3.99 for testers ... arbitrary amount funded: one founding, three pioneer yearly, eleven vaulter"**
- Where: `#vi-campaign-modal` (`L:11743`); tiers: Vaulter £0 (`L:11779`), Pioneer yearly £49.99 (`L:11796`), Founding £149 once (`L:11812`); counters `#camp-backers`, `#camp-days` (set from live data, `L:28076-28078`).
- Status: HOLD. See Q13. Nothing here is built until the owner answers.

## Clashes with standing rules

Each is answerable with a short reply. Pedro's recommendation first; reply "agree" or give a change.

- **Q1 (E1) Icon size and place.** The brand rule uses the full dial from 96 px, the mid icon (no ticks) at 40 to 96 px; the app header is 26 px at the top left, the owner said "top right". Recommend: keep the lockup top left (the brand lockup), use the dial at 44 px with 60 ticks at one-line stroke, check legibility in a shot; if the ticks look like noise at 44 px, fall back to 12 major ticks only. Agree?
- **Q2 (E23) "y-axis +20%".** Recommend: make the window 20% taller (columns grow with it). Alternative is columns 20% taller inside the same window, which would clip tall net worths. Agree to a taller window?
- **Q3 (E11) "right of the window".** Recommend: the timeline sits in the right column of the Progress tile under the viewport, so the 3D window you like stays full width. Alternative is beside the viewport, which shrinks it. Agree?
- **Q4 (E9) XP values and order.** Needs the Roadmap branch merged first. Recommend: 10 milestones, XP rising 20 to 200 with 300 for "Keys are yours"; values are game points, not money, and backfill silently. Agree, and merge the Roadmap first?
- **Q5 (E26) Money logic and saved data.** Account types on deposits, interest and a 25% bonus line change what Level 1 shows but must not change how deposits or bricks work (standing rule). Recommend: additive account note on each deposit, bonus shown as a separate estimate that is not added to savings, kept apart from Cash and savings. The "First Time Buyer ISA" is listed as "not open yet" with no rate, bonus or date until you confirm gov.uk wording (queue notes say 2027, later coverage says April 2028 or 2029). Agree?
- **Q6 (E12) Bank icon in 3D.** A real logo texture from the favicon host taints WebGL. Recommend: sprite bank glyph on the 3D tag, real logo in the account row and a key beside the scene. Agree?
- **Q7 (E15, E16) Saved-data change and overdrafts.** Adds an optional `rate` and a `moves` list to each cash account (old saves load as they are, nothing cleared). Recommend: take-out may not exceed the balance for any account (no overdraft modelling). Agree?
- **Q8 (E17) Return calculation.** Changes what "invested" means to the price when you added it, without touching saved cost on old holdings, plus a "check your average cost" nudge. Recommend yes. Agree?
- **Q9 (E22) Message cut off, and commit semantics.** Read as one "Add to vault" button per metal. Recommend: typed value always saves on blur (nothing is lost), the animation fires only from the button or Enter. What did the cut-off sentence say?
- **Q10 (E32) Coin icons.** CoinGecko images come from a new host not in the privacy notice. Recommend: no new host; round coin badges drawn locally (symbol on the coin colour), real logos only for the top ten from a local sprite. Or approve the CoinGecko image host and I add the privacy line. Which?
- **Q11 (E28) eBay market value.** Needs eBay Buy API approval, a server function, a secret, a new outside host and a privacy line. Recommend: leave out of v0.9.1; ship collectibles with the condition field and a manual "search eBay sold listings" link (opens eBay in a new tab, no API). Agree?
- **Q12 (E30) New host.** `assets.ptlive.design` for models needs a privacy line, a CC-BY credits page and R2 enabled; the branch has never run against real models. Recommend: approve the host and port it, but flag E30 as the highest-risk item, built last. Agree?
- **Q13 (E25) Prices and invented numbers.** (a) Vaulter is £0 after the 30-day trial today; £4.99 with trial, £5.99 and "£3.99 for testers" match no Stripe link or decided price (Pioneer is £5.99 a month, £49.99 a year, Founding £149 once; `docs/OFFER_AND_PRICING.md`). (b) Showing "1 founding, 3 pioneer yearly, 11 vaulter" as backers is invented social proof, which the rules forbid; the modal shows real counts (`camp-backers`). (c) The message stops at "days left, do". Recommend: change no prices and show real counts only until the Stripe links exist; if you want a demo, use a hidden preview flag never shown to testers. What was the "days left" sentence, and do you want new Stripe links for £4.99 and £3.99?
- **Q14 (E4) Which tile.** I read E4 as the dashboard Cash Flow tile showing the old flow diagram under the 3D (a CSS bug). Is that what you saw, or the Net worth card? Recommend: yes, Cash Flow tile.
- **Q15 (E24) Phone sub-menu.** Pinned six buttons wrap to three rows on 390 px and would eat about 120 px of screen. Recommend: on phones the pinned bar is one row of six icons (labels hidden, name on long-press and `aria-label`), 44 px targets; labels stay on tablet and desktop. Agree?
- **Reduced motion and type floor (no question, rules for builders):** E1, E14, E18, E22 animations must be off under `prefers-reduced-motion`; E2, E5, E7, E10, E11 must not introduce any text under 10.5 px (the 10 px uppercase Syne tier is the only exception).
- **No sideways scroll:** E5 six-across pills and E24 pinned bar are the two places most likely to overflow at 320 and 390; check both.

## E24 detail (Assets sub-menu pinned)

**E24. "keep them pinned to the top ... when the user scrolls down ... still see those items"**
- Where: `.subtab-nav` (`L:12483`, flex row, six `.subtab-btn`, styles `L:~10880` and the `#assets-page .subtab-btn` rules). The parent `#assets-page` must not set `overflow` or sticky fails.
- Done looks like: `position:sticky` under the header (top equals the live nav height: 72 px at 1280 and up after E2, 68 at 1100, 60 on tablet, 46 on phone, via one CSS variable the nav sets), `z-index` under the nav (500) and over content, opaque `var(--bg)` with a hairline under it. After scrolling 1500 px on Cash, Stocks, Metals, Inventory, Crypto and Liabilities at 1440, 1100, 768, 390 the six buttons stay visible, do not overlap the header, and tapping each switches the sub-tab and keeps the scroll at the top of the new panel. The Assets total and the active highlight stay. Both themes.

## Nits carried

- Only one review folder exists: `docs/review/v08-type-scale/README.md`. Its leftovers, not part of this round unless you say: 9 px USP and PRO badges, the 10 px footer, one formula superscript, and the 10 px uppercase tier. Counts of elements under 10.5 px at 1100 were 312 and at 1440 were 436 after v0.8; re-run `tools/type_audit.js` after this round and record the numbers.
- The Show it on the house button keeps a pin icon (`L:15993`, `#vi-pin`). v0.9 removed the viewport "locate" button (`#hud-row`, commit 5e8b5a5, test `test_v07_e18`); I read "location icon" as that button only. Recommend: leave the pin on "Show it on the house" (it is a text button with a real function). If you meant that one too, say so.
- Card hints and legends that read "swipe sideways" (`L:23862`) belong to the hidden flow diagram; remove with E4.
- `Message the Dev` card test update is part of E27.
