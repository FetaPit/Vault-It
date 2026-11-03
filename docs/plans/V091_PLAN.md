# v0.9.1 plan: chunks, waves, merge order, estimate (revised with the owner's answers)

David (COO), 3 Nov 2026. This revision includes the owner's answers to Q0 to Q19.
- Line references are to the live `index.html` at 5e8b5a5 (29,747 lines). Q numbers are Pedro's, from `V091_BRIEF.md`.
- E18 is dropped (Q17). E33 is new. E25, E28 and E30 stay in.
- Splitting `index.html` into files waits until straight after 0.9.1 ships. It is not part of this round.

## Owner's answers, as built

| Q | Answer |
|---|---|
| Q0 | Yes: Step 0 base sync. |
| Q1 | Lockup stays top left, with the rotating V. |
| Q2 | Make the window 20% taller. |
| Q3 | Timeline in the right column, under the viewport. |
| Q4 | Merge the Roadmap first; XP rises from 20 to 200, with 300 for the last milestone. |
| Q5 | Account note on each deposit; the bonus is a separate estimate; the First Time Buyer ISA is shown as "not open yet". |
| Q8 | "Invested" means the price at the time the holding was added. |
| Q9 | The typed value saves on blur; the animation plays only from the button or Enter. |
| Q10 | Coin badges drawn locally, and a local sprite for the top ten. No new host. |
| Q14 | E4 is the Cash Flow tile. |
| Q15 | One row of six icons on phones. |
| Q16 | No change to the location pin. |
| Q6 | E12 plates each get a flag-post label in the same style as the other viewports: bank icon, amount, interest rate. |
| Q7 | No overdraft on cash accounts. Overdrafts belong in the Debt tracker, which is the new E33. |
| Q11 | E28 is in, in two parts. See chunk J. |
| Q12 | E30 is in. See chunk I. Hosting is still open (see "Still blocked"). |
| Q13 | E25 is in, with real counts only. Owner's update, 3 Nov: "stop price changes £5.99 Vaulter and discounted for testers and early adopters £3.99". No new prices and no new Stripe links. The Vaulter card uses the existing live links. E25 is folded into chunk D. |
| Q18 | `ci.yml` skips queue-only and docs-only pushes. This is done in Step 0. |
| Q19 | E31 was seen on a Galaxy Z Fold5 in Chrome. |

## 0. Step 0: base sync and CI paths (before any branch is cut)

- **Who:** one cloud Ops session (Sonnet, `Vault-It · Ops: v0.9.1 base sync`). David checks the result. The owner has already said yes (Q0, Q18).
- **How:**
  1. On `brand-rollout`, run `git merge --no-ff origin/release-20261103`. Expect conflicts only in `docs/QUEUE.md` and the docs. Keep both sides.
  2. In `ci.yml`, add to the `push` trigger only (pull requests unchanged):
     `paths-ignore: ['docs/**', '**/*.md']`.
  3. Push both.
- **Check (David):**
  - `git merge-base --is-ancestor 5e8b5a5 origin/brand-rollout` exits 0.
  - `git diff 5e8b5a5 origin/brand-rollout -- index.html src tests supabase worker landing.html` is empty.
  - CI is green on that exact SHA in the server job and all three browser shards.
  - A queue-only commit pushed afterwards starts no CI run.
- **Release note that follows from this:** a docs-only commit now has no CI run. So the frozen release branch is cut at the last code commit, the one that has a green run. Docs-only commits after it ship in the next release, or are fine under the release skill's "docs or tests only" rule.
- **Then:**
  1. Cut `candidate/v0.9.1`.
  2. Merge the Wealth Roadmap (`claude/bold-carson-tey49m`, 3eae67c) first, after the owner's check.
  3. Wait for candidate CI green.
  4. Cut every chunk from the candidate after that merge.
- **Time:** about 1.5 h (two CI loops).

## 1. Chunks (13)

Every chunk goes through `ship-item`:
- intent card, then a failing test first
- the named tests below, plus the guards `test_beta_client` and `test_copy`
- shots in Night and Daylight at 390 and 1100 px (1440 where the brief says so)
- Pedro's review, at most two FIX rounds
- `rollout-qc` PASS
- CI green on the branch's exact SHA

Sonnet is the default. Opus builds four chunks: A, C1, G and K.

| Chunk | Edits | Model | Size |
|---|---|---|---|
| A cash3d | E13, E12, E14, E21, E22 | Opus | L |
| B cash-accounts | E15, E16 | Sonnet | M |
| C1 stocks-return | E17 | Opus | M |
| C2 stocks-map | E19, E20 | Sonnet | M |
| C3 crypto | E32 | Sonnet | L |
| D chrome | E1, E2, E24, E27, sidebar, E25 | Sonnet | M |
| E overview-budget | E4, E23, E5, E6 | Sonnet | M |
| F house-look | E7, E8, E10, E11 | Sonnet | M |
| G house-xp-deposit | E9, E26 | Opus | M-L |
| H inventory-files | E29, E31 | Sonnet | M |
| I model-library | E30 | Sonnet | M-L |
| J secondhand-value | E28 part 1 | Sonnet | L |
| K debt-cards | E33 | Opus | M-L |

### A. v09x/cash3d: E13, E12, E14, E21, E22 (Opus)
- **Where:**
  - V3Scene engine at L:20706-20990: `v3Stack` 20839, `v3CashContent` 20869, `v3Label` and `v3Plant` 20848-20855, `v3MetalsContent` 20922
  - metals inputs at L:21147-21166
  - cash scene card at L:12619
  - the no-WebGL fallback `renderCashISO` at L:25210
- **Order inside the chunk:**
  1. E13: profile and record the before numbers, then the fix.
  2. E12: one plate per account, each with a flag post (Q6: sprite bank glyph, account name, amount, and the AER from chunk B, shown when present).
  3. E14: intro drop-in.
  4. E21: the same work for metals.
  5. E22: "Add to vault" buttons.
- **Hook for chunk B:** expose `v3CashLand(delta)` so B can play new stacks landing.
- **Tests:**
  - Existing: `test_cash3d_speed`, `test_vault3d`, `test_live_value`, `test_gl_recover`, `test_hb_speed`, `test_nw3d`.
  - New, failing first: `test_v091_cash3d`. Plates match accounts and sum to `alTotalCash()`; the flag text equals each account's balance and rate; the intro ends at the static layout; reduced motion means no animation; a metal commit saves and animates only that metal; draw calls stay within budget.
- **Owner answers:** none outstanding.

### B. v09x/cash-accounts: E15, E16 (Sonnet)
- **Where:**
  - add row at L:12596-12614
  - `renderAlTab` at L:21281-21283
  - `addCashAccount` at L:21380
  - `pcAdd` precedent at L:21390
- **Behaviour (Q7):** a take-out larger than the balance is refused. The message offers "Overdraft? Add it in the Debt tracker", which links to chunk K.
- **Tests:**
  - Existing: `test_bank_logos`, `test_assets_order`, `test_del`, `test_partial_state`, `test_recover`, `test_safe`, `test_sync`.
  - New, failing first: `test_v091_cash_accounts`. £10,000 at 4.5% shows £450 a year and £37.50 a month; adding £250 then Undo restores exactly; an over-balance take-out is refused; an old save loads untouched.
  - One B runs a sync check.
- **Merge order:** B merges before A, which then reads `rate`.

### C1. v09x/stocks-return: E17 (Opus)
- **Where:** the stat tiles at L:20003-20005 and `stkAddCore` at about L:20120.
- **Tests:**
  - Existing: `test_chart`, `test_del`, `test_fundpx`, `test_sync`, `test_value_hist`, `xss`.
  - New, failing first: `test_v091_stocks_return`. 10 units added at £5 show £50 invested and £0 change; at £5.50, +£5; a bad stored average cost shows the nudge; stored `avgCost` is never rewritten.
  - One B runs a sync check.

### C2. v09x/stocks-map: E19, E20 (Sonnet)
- **Where:**
  - `stkDrawTreemap` at L:20065-20085
  - `.dtm-n` CSS at L:14344
  - holding rows at about L:20020
  - logo helpers at L:19867 and L:19886
- **Check first:** `logo.clearbit.com` still answers. If it does not, use the Google favicon host, which the privacy notice already names.
- **Tests:**
  - Existing: `test_v09_round`, `test_v08_type_scale`, `test_bd_debt`, `test_bank_logos`.
  - New, failing first: `test_v091_stocks_map`. No label is larger than its tile; small holdings merge into "Other (n)"; the map is at least 1.25 times today's height at 1100 px; a logo falls back to initials.
- **Parallel with C1:** yes. Merge C1 first.

### C3. v09x/crypto: E32 (Sonnet)
- **Where:**
  - `#assets-crypto` at about L:12569-12579
  - `crCoinId` at L:21176
  - the Stocks card set from C1 and C2
- **Coin icons (Q10):** local badges, and a local sprite for the top ten. No new host.
- **Tests:**
  - Existing: `test_crypto_live`, `test_icons`, `test_ledger`, `test_assets_order`.
  - New, failing first: `test_v091_crypto`.
- **Starts:** after C1 and C2 are merged.

### D. v09x/chrome: E1, E2, E24, E27, the carried sidebar colours, and E25 (Sonnet)
- **Where:**
  - header mark at L:11086 and L:11981
  - nav at L:10867-10962
  - `.subtab-nav` at L:12483 and about L:10880
  - `viDevCardPlace` at L:14574
  - `viRenderLedger` at L:14889-14921
  - E25:
    - crowdfund modal `#vi-campaign-modal` at L:11743-11812 (the Vaulter card shows £0 at L:11779)
    - `VI_CAMPAIGN` at L:26945
    - `viShowCampaign` at L:28061-28090
    - the existing live links and prices: `VI_STRIPE_LINKS.monthly` (£5.99) and `monthly_tester` (£3.99) at L:26881-26889, and `VI_PLANS` at L:26889
- **E25, no blockers:**
  - The Vaulter card reads "£5.99 a month after the 30-day free trial; £3.99 for testers and early adopters". Both prices come from `VI_PLANS`; nothing is typed in.
  - The buttons use the existing `monthly` and `monthly_tester` links, with the same tester eligibility the app already applies.
  - No new prices and no new Stripe links.
  - Real counts only. Two blanks get fixed:
    - `VI_CAMPAIGN.backers` is a hard-coded 0, so the modal shows "–".
    - The deadline (`2026-08-31`) has passed, so "Days left" is always "–".
  - New migration `014_campaign_counts.sql`: a `security definer` function `campaign_counts()` that returns aggregate counts per plan from `profiles` (migration 011). It returns no personal data and may be called by anon.
  - The modal shows the real numbers, including 0, and "Funded" shows backers out of the goal.
  - "Days left" shows "Open" until the owner sets an end date. That date is optional and does not block the build.
  - If 014 is not live yet, the counts show "0" instead of "–" and invent nothing.
- **Tests:**
  - Existing: `test_brand_identity`, `test_mobile_nav`, `test_resp`, `test_v07_e1`, `test_v08_chrome` (change it to Overview only), `test_assets_order`, `test_colour_code`, `test_ledger`, `test_view_mode`, `test_v09_round`, `test_v08_type_scale`, `test_daylight`, `wcag_scan`. For E25 also `test_honest_pricing`, `test_signup_page` and `test_beta_client`.
  - New, failing first:
    - `test_v091_chrome`, including the E25 checks: the Vaulter card prices equal `VI_PLANS.monthly` (5.99 and 3.99); the links are the existing two; counts render including 0, with no invented figures; "Open" shows when there is no deadline.
    - the pglite migration test for 014, in the `server` set.
- **Server step (owner's yes, laptop or SQL editor):** apply migration 014 before the release.
- **Starts:** after the Roadmap merge. Size is about 5 h, up from 4.

### E. v09x/overview-budget: E4, E23, E5, E6 (Sonnet)
- **Where:**
  - L:12213-12267
  - L:14199, L:14356-14400
  - L:19379, L:19666
  - L:23655, L:23862
  - L:28354-28356
- **Tests:**
  - Existing: `test_overview`, `test_sankey_fit`, `test_v07_chips`, `test_v07_demo_first`, `test_v08_chrome`, `test_v09_round`, `test_view_mode`, `test_daylight`, `test_nw3d`, `test_signoff_a`, `test_bd_flow3d`, `test_v08_type_scale`.
  - New, failing first: `test_v091_overview_budget`.
- **Starts:** after the Roadmap merge.

### F. v09x/house-look: E7, E8, E10, E11 (Sonnet; Pedro sets the look first)
- **Where:**
  - L:12414-12421
  - L:14465-14499
  - L:15905
  - L:15997-16026
- **Tests:**
  - Existing: `test_v08_cards`, `test_groupings`, `test_hb3d_levels`, `test_tiers`, `test_hb_brand`, `test_hb_one_builder`, `test_v07_e16`, `test_v07_e17`, `test_v07_e18`, `test_v08_type_scale`.
  - New, failing first: `test_v091_house_look`.

### G. v09x/house-xp-deposit: E9, E26 (Opus)
- **Where:**
  - `hbXP` at L:15933
  - `hbBadgeToasts` at L:16036
  - deposit push at L:15709
  - Level 1 tile at L:16003
  - it also uses the Roadmap's `wr*` XP functions
- **Tests:**
  - Existing: `test_roadmap`, `test_wealth_roadmap`, `test_hb3d_app`, `test_hb_brand`, `test_ledger`, `test_sync`, `test_groupings`, `test_v08_cards`.
  - New, failing first: `test_v091_house_xp_deposit`. XP is paid once per milestone; old milestones backfill silently; `state.saved` and the brick count do not change; the bonus is not added to `state.saved`.
  - One B runs a sync check.
- **Starts:** after the Roadmap and F are merged.

### H. v09x/inventory-files: E29, E31 (Sonnet)
- **Where:**
  - upload at L:22021-22032
  - loader at L:16679-16683
  - `i3dGetBuf` at L:21866
  - `imgSearch` and `OPENVERSE` at L:22177-22179
- **E31:** the laptop reproduces it first, on the Galaxy Z Fold5 in Chrome (Q19).
- **Tests:**
  - Existing: `test_item3d`, `test_i3d_live`, `test_hb3d_design`, `test_img_search` (add a failed-fetch case), `test_v07_p3_items`.
  - New, failing first: `test_v091_inventory_files`.

### I. v09x/model-library: E30 (Sonnet)
- **Base:** the catalogue branch `v09x/model-library` that a Sonnet agent is building now: `models/catalog.source.json`, a ported `tools/fetch-models.mjs`, `CREDITS`.
  - It is local and cut from `release-20261103`.
  - It must be pushed, then rebased onto `candidate/v0.9.1` after Step 0.
  - This chunk continues on that branch.
- **Where:**
  - today's Poly Pizza search: `I3D_PP` at L:21838, fetch at L:21870, list at L:22025
  - picker logic ported from `vault-it-model-picker.js` (179 lines, `ccr-7de92975-69tcos`)
- **Work:**
  - The 3D button opens a search over our own `models/catalog.json`.
  - Selecting a model attaches it.
  - A CC-BY credit shows on the item, and a credits page is added.
  - Poly Pizza stays as a fallback only if the owner keeps that host.
- **Hosting:** see "Still blocked".
  - My recommendation is to bundle the models in `models/`, served from app.vault-it.co. That needs no new host and no privacy line.
  - The other option is `assets.ptlive.design` on R2, which needs a privacy line and R2 enabled.
- **Laptop step:** the fetch runs on the laptop (static.poly.pizza answers 403 in cloud) and commits the models. This is on the critical path for I's tests against real files.
- **Tests:**
  - Existing: `test_item3d`, `test_i3d_live`, `test_beta_client`, `test_v07_p3_items`.
  - New, failing first: `test_v091_model_library`. Search returns catalogue hits; an attached model persists across a reload; the credit is shown; no host outside the notice.
- **Parallel with H:** yes. I touches L:21838-21874 and L:22025; H touches L:22021-22032 (upload) and L:22177. These are different functions next to each other, so merge H first and rebase I.

### J. v09x/secondhand-value: E28 part 1 (Sonnet)
Built from `SECONDHAND_VALUATION_SOURCES.md`.
- **Where:**
  - `wiLink*` at L:21453-21630 (the Wealth inventory value link; the same link is used on Liabilities)
  - new edge function `supabase/functions/secondhand-estimate/`
- **Part 1, this round:**
  - Condition field (new, excellent, good, fair, poor) and a manual value, on Wealth inventory and Liabilities items.
  - "Search second-hand prices" calls the function and shows the result: "Estimate from n current listings, typically £x to £y, adjusted for condition", with "Show working" and the honest wording from the research.
  - The result is never applied without a tap.
  - The function does:
    - per-source adapters
    - junk filter, trimmed median, interquartile range
    - a stated haircut for asking prices
    - condition factors
    - 24 h cache of derived numbers only
    - at least 5 listings, otherwise "no match"
- **Source switches:**
  - Discogs goes live once the owner's free token is set.
  - eBay, PriceCharting and Reverb sit behind per-source flags, off until approval.
  - The manual search links (eBay sold items, Discogs) work from day one.
- **Hosts:** none new in the browser. It talks to Supabase only. The privacy notice still names the sources, in honest copy.
- **Tests:**
  - Existing: `test_live_value`, `test_beta_client`, `test_copy`, `test_item3d`.
  - New, failing first:
    - `test_secondhand_server` (node, recorded fixtures per source: trim, IQR, haircut, condition, minimum count, flags off means no call)
    - `test_v091_secondhand` (browser: the condition field persists, the estimate needs a tap to apply, old items load untouched)
- **Server step (laptop, owner's yes):**
  - `npx supabase functions deploy secondhand-estimate --project-ref legpubblzgknxdtvsant`
  - `npx supabase secrets set DISCOGS_TOKEN=...` once the owner has the token
  - This comes before the release. If it is not live, the button shows "Not available yet" and the manual links.
- **Part 2, later:** switch on eBay, PriceCharting and Reverb as their approvals land. Each is a flag flip plus a secret, with no app release.

### K. v09x/debt-cards: E33 (Opus, as the owner agreed)
- **Finding:** the 3D card tile (`cc3dHTML`, L:22479) is drawn only when `type` is `credit` or `bnpl` (`isCard`, `renderDebtTab` L:22760). Every other type, personal loan included, falls to the old 2D vertical bar (L:22778-22800), which shrinks from the top. That is why the personal loan "doesn't work as described".
- **Where:**
  - `cc3dHTML` at L:22479-22570
  - `_ccPct` at L:17561
  - `ccReduced` at L:22598
  - `makePayment` at L:22639
  - `renderDebtTab` at L:22723-22800
  - `DEBT_TYPE_LABELS` at L:17402
  - the add form `#di-type` at L:12766
  - `getCreditCardLogo` at L:22451
- **Work:**
  - Every debt type (personal loan, car finance, overdraft, student loan and so on) uses the same 3D tile, with the company icon.
  - No chip, no masked number and no card network on those types.
  - Payments cut right to left exactly like the cards: shared `_ccPct`, undo joins back, reduced motion makes it instant.
  - The type label stays on the tile.
  - Overdraft is a debt type here (Q7). The add form gets a provider field for the icon.
- **Tests:**
  - Existing: `test_cc3d`, `test_cut`, `test_groupings`, `test_rank`, `test_ledger`, `journey_one_b`, `test_sync`.
  - New, failing first: `test_v091_debt_cards`.
    - A personal loan renders the 3D tile with no chip and no last four.
    - Paying £100 of £1,000 cuts 10% from the right.
    - Undo restores it.
    - The overdraft type shows its bank icon.
    - An old saved loan loads untouched.
- **Parallel:** with all other chunks. The L:22451-22800 range is touched by no one else.

## 2. Laptop (owner's ZenBook, Claude Code in Git Bash, `~/Projects/Vault-It`)

The laptop gets no build chunk, because the browser tests only run on the cloud path. In order, it does:
1. **E31 reproduction** before H starts, about 20 min. Open the live app in Chrome on the Galaxy Z Fold5 (remote devtools from the laptop) and in Chrome on Windows. Record the `api.openverse.org` request status and error.
2. **E30 model fetch**, about 30 to 45 min. On `v09x/model-library`, run `node tools/fetch-models.mjs`, check the files and `CREDITS`, then commit and push the models (bundled in `models/`), or upload them to R2 if the owner picks that.
3. **Server steps**, with the owner's yes, in this order:
   1. migration 014 for chunk D's campaign counts (SQL editor or CLI)
   2. `secondhand-estimate` deploy
   3. `DISCOGS_TOKEN` secret
4. **Phone sign-off** with `npm run dev:phone` on the candidate.
5. **Release:** the owner runs `git push origin <sha>:release/pioneer-v2`, then checks `version.json`.

## 3. Waves (7 parallel cloud sessions at most)

| When (h after wave 0) | What starts | Slots in use |
|---|---|---|
| 0 | Wave 1: A (Opus, 10 h), C1 (Opus, 3 h), K (Opus, 6 h), D (5 h, with E25), E (4 h), F (5 h), B (4 h) | 7 |
| +3 | C2 (4 h), when C1 is done | 7 |
| +4 | H (4 h), J (6 h), when E and B are done | 6 |
| +5 | G (Opus, 5 h) when F is done; D also frees a slot | 6 |
| +6 | I (5 h), when K is done | 6 |
| +7 | C3 (5 h), when C2 is done | 6 |

From +4 there is a spare slot. Use it to start I early on the catalogue port if the models are already fetched, or leave it free for FIX rounds.

Everything is finished about 12 h after wave 0 (C3 is the last).

## 4. Merge order onto candidate/v0.9.1 (one at a time, roughly as each turns green)

1. Roadmap
2. C1
3. D
4. E
5. B
6. F
7. K
8. C2
9. H
10. G
11. J
12. A
13. I
14. C3

Hard sequences: F before G; C1 before C2 before C3; B before A; H before I. Everything else merges when it is green.

**Gates for every merge:**
1. Pedro PASS, `rollout-qc` PASS, and branch CI green on its exact SHA.
2. David merges and re-runs the chunk's named tests.
3. Push and wait for candidate CI on that SHA.
   - A second push cancels the run in progress (`ci.yml` lines 13-15), so never push the next merge before this one's CI has finished.
4. If CI is red: list every FAIL line from the server job and all three shards in the queue progress line before anyone edits, then fix the whole list in one commit.
   - Known flaky tests that pass on a re-run are allowed and named: `test_hb_speed`, `test_nw3d` reload, `test_sync`, `test_cut`, `test_hb3d_app`.

## 5. Estimate (wall-clock)

**v0.9 numbers this is based on:**
- One CI loop is 20 min.
- v0.9 needed three loops from push to green.
- v0.8 ran 6 streams for 11.5 h.

**Session-hours, likely:**

| Chunk | Hours |
|---|---|
| A | 10 |
| B | 4 |
| C1 | 3 |
| C2 | 4 |
| C3 | 5 |
| D | 5 |
| E | 4 |
| F | 5 |
| G | 5 |
| H | 4 |
| I | 5 |
| J | 6 |
| K | 6 |
| **Total** | **66** |

- 66 h over 7 slots is 9.4 h, if the slots were perfectly packed.
- The critical path is longer than that:
  - C1 + C2 + C3: 3 + 4 + 5 = 12 h likely, 2 + 3 + 4 = 9 h best.
  - A is 10 h; F + G is 10 h; K + I is 11 h. I also depends on the laptop model fetch.

**Merge tail:** 14 merges at 20 min each is 4.7 h of candidate CI, mostly hidden under the builds. Five chunks finish in the last 2 h (A, G, J, I, C3), so the tail is about 2 h likely and 1.5 h best.

(a) **Build to all merged and candidate CI green:**
- Best: 1.5 (wave 0) + 9 + 1.5 = **about 12 h**.
- Likely: 1.5 + 12 + 2, plus 2 for one extra FIX round = **about 17.5 h, call it 18 h**.

(b) **To the owner's phone sign-off and release:**
- Add the phone check (1 h), one fix loop if the owner spots something (1.5 h), and release gates with server steps (1.5 h: migration 014, the function deploy, the secret, then the push and `version.json`).
- Best: 12 + 1 + 1.5 = **about 14.5 h**. Likely: 18 + 1 + 1.5 + 1.5 = **about 22 h**.

**What the owner's time does:**
- The laptop model fetch, the server-step yeses and the phone check are owner-bound. Each hour of delay on the model fetch moves I, and on this plan I finishes 11 h after wave 0, close to the critical path.
- If green lands at night, add the overnight wait (7 h 48 m last time).
- Realistic calendar: start at wave 0 on the morning of 4 Nov; candidate green late on 4 Nov or early on 5 Nov; sign-off and release on 5 Nov.

**Compared with the first plan:** adding E33, E25, E28 and E30 (and dropping E18) adds about 18 session-hours but only about 1 h of wall-clock, because they fill the free slots. Release lands about 22 h after wave 0 instead of 20. Folding E25 into D does not move the estimate, because D is not on the critical path.

## 6. Still blocked on the owner (none of these stops the build starting)

1. **E30 hosting:** bundle the models in `models/` on app.vault-it.co (my recommendation, no new host), or `assets.ptlive.design` on R2 (needs a privacy line, R2 enabled, and upload from the laptop). Also: keep Poly Pizza as a fallback host, yes or no.
2. **E25:** nothing blocks the build. Two optional items:
   - a campaign end date, if the owner wants a countdown (until then "Days left" shows "Open")
   - who counts as an "early adopter" for £3.99. The build uses the existing tester eligibility unless the owner says otherwise.
3. **E28 sign-ups**, which switch on live sources and do not block the release:
   - Discogs: free account and personal access token. This is the only one that is live this round.
   - eBay: developer account plus an application for production Buy/Browse access (the "Growth Check"). It can take weeks.
   - PriceCharting: decide on a paid subscription (optional; prices are in USD).
   - Reverb and CeX: written permission. The exec assistant drafts the emails; the owner sends them.
4. **Server yeses** before the release: migration 014, the `secondhand-estimate` deploy, and the `DISCOGS_TOKEN` secret.

## 7. Lessons from v0.9, as process changes

1. Base check first. The candidate must contain the live SHA (Step 0).
2. Every red CI gets all FAIL lines from all three shards listed before the fix (last time the fix covered one shard and cost a 20 min loop).
3. Each brief names the existing tests that use the chunk's ids (section 1). The builder greps `tests/` before pushing.
4. Rule clashes go into one batched question up front. This round that worked: Q0 to Q19 were answered before any build.
5. No release claim before CI is green on that exact SHA.
6. Book the owner's sign-off window so a green build does not wait overnight.
7. Queue and docs pushes no longer run CI (Step 0). Last time 38% of runs were cancelled.
8. Wait for candidate CI between merges, because a new push cancels the run in progress.
9. After release: split `index.html` (owner, 3 Nov). Not in this round.
