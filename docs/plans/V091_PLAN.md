# v0.9.1 plan: chunks, waves, merge order, estimate

David (COO), 3 Nov 2026. This plan follows Pedro's brief `V091_BRIEF.md`. Line references are to the live `index.html` at 5e8b5a5 (29,747 lines); Pedro's questions are Q1 to Q15. Nothing is built until the owner approves this plan and answers the batched question.

## 0. Step 0: base sync (before any branch is cut)

The problem: `brand-rollout` (15a7a9b) has none of the v0.7, v0.8 or v0.9 app code.
- Its merge-base with the live branch is 67bb51e, from 1 Nov.
- It is 109 commits behind `release-20261103`.
- Its index.html differs from live by 4,113 lines.
- Every v09x branch cut from it today would start from code older than v0.7.

- **Who:** the owner says yes as Q0 of the batched question. One cloud Ops session (Sonnet, `Vault-It · Ops: v0.9.1 base sync`) then does it. David checks the result.
- **How:**
  1. `git fetch origin`, then switch to `brand-rollout`.
  2. `git merge --no-ff origin/release-20261103`.
  3. Expect conflicts in `docs/QUEUE.md` and the docs only. Keep both sides and drop no queue lines.
  4. Push.
- **Check (David):**
  - `git merge-base --is-ancestor 5e8b5a5 origin/brand-rollout` exits 0.
  - `git diff 5e8b5a5 origin/brand-rollout -- index.html src tests supabase worker landing.html` is empty.
  - CI is green on that exact SHA in the server job and all three browser shards.
- **Then:**
  1. Cut `candidate/v0.9.1` from that SHA.
  2. Merge the Wealth Roadmap (`claude/bold-carson-tey49m`, 3eae67c) into it first. This needs the owner's check of the Roadmap, which is in the queue as "awaiting owner check".
  3. Wait for CI green on the candidate SHA.
  4. Cut every chunk from the candidate after the Roadmap merge, so each one starts on live code plus the Roadmap.
- **Time:** about 30 min of work plus one CI loop for the sync, then one more CI loop for the Roadmap merge. About 1.5 h in all.

## 1. Chunks

Every chunk goes through the `ship-item` skill:
- intent card, then a failing test first
- the named tests below, plus the guards `test_beta_client` and `test_copy`
- element shots in Night and Daylight at 390 and 1100 px (1440 where the brief says so)
- Pedro's review, at most two FIX rounds
- `rollout-qc` PASS
- CI green on the branch's exact SHA

Sonnet is the default. Opus is used in three chunks only: the V3Scene 3D engine (A), the return basis (C1), and the deposit and XP logic (G).

### A. v09x/cash3d: E13, E12, E14, E21, E22
- **Where:**
  - V3Scene engine at L:20706-20990: `v3Stack` 20839, `v3CashContent` 20869, `v3MetalsContent` 20922, `v3MetalsNow` 20954
  - metals inputs at L:21147-21166
  - cash scene card at L:12619
  - the no-WebGL fallback `renderCashISO` at L:25210 (must still show one total)
- **Team:** cloud session. **Model:** Opus (3D engine).
- **Order inside the chunk:**
  1. E13: profile first and record the before numbers.
  2. E13 fix.
  3. E12: one plate per account.
  4. E14: intro drop-in.
  5. E21: the same work for metals.
  6. E22: "Add to vault" buttons.
- **Hook for E16:** expose `v3CashLand(delta)` so the E16 chunk can play new stacks landing. If the hook is missing, E16 still works, just without the animation.
- **Tests:**
  - Existing: `test_cash3d_speed`, `test_vault3d`, `test_live_value`, `test_gl_recover`, `test_hb_speed`, `test_nw3d`.
  - New, failing first: `test_v091_cash3d`. It checks that plates match accounts and sum to `alTotalCash()`, that the intro ends at the static layout, that reduced motion means no animation, that a metal commit saves and animates only that metal, and that draw calls stay within budget.
- **Waits on:** Q6 (E12), Q9 (E22). E13 and E14 can start without answers.

### B. v09x/cash-accounts: E15, E16
- **Where:**
  - add row at L:12596-12614
  - `renderAlTab` table at L:21281-21283
  - `addCashAccount` at L:21380
  - `pcAdd` precedent at L:21390
- **Team:** cloud session. **Model:** Sonnet.
- **Why not Opus:** the arithmetic is fixed by the brief. Interest is balance times AER and is illustrative only, never added to net worth. E16 copies the existing `pcAdd` pattern. The new test pins the sums.
- **Tests:**
  - Existing: `test_bank_logos`, `test_assets_order`, `test_del`, `test_partial_state`, `test_recover`, `test_safe`, `test_sync`.
  - New, failing first: `test_v091_cash_accounts`.
    - £10,000 at 4.5% shows £450 a year and £37.50 a month.
    - Add £250, then Undo, restores exactly.
    - A take-out larger than the balance is refused.
    - An old save without a rate loads unchanged.
  - One B runs a sign-in and sync check, because saved data changes.
- **Waits on:** Q7.
- **Parallel with A:** yes. B's lines (21281-21390) do not overlap A's (20706-20990). Merge B before A.

### C1. v09x/stocks-return: E17
- **Where:** the stat tiles at L:20003-20005 and `stkAddCore` at about L:20120.
- **Team:** cloud session. **Model:** Opus (money logic: the return basis and the saved basis).
- **Tests:**
  - Existing: `test_chart`, `test_del`, `test_fundpx`, `test_sync`, `test_value_hist`, `xss`.
  - New, failing first: `test_v091_stocks_return`.
    - 10 units added at £5 show Invested £50 and Change £0.
    - At £5.50 they show +£5.
    - A bad stored average cost shows the "check your average cost" nudge.
    - Stored `avgCost` is never rewritten.
- **Waits on:** Q8.

### C2. v09x/stocks-map: E19, E20
- **Where:**
  - `stkDrawTreemap` at L:20065-20085
  - `.dtm-n` CSS at L:14344
  - holding rows at about L:20020
  - logo helpers `stkLogoBadge` and `stk-mini-logo` at L:19867 and L:19886
- **Team:** cloud session. **Model:** Sonnet.
- **Tests:**
  - Existing: `test_v09_round`, `test_v08_type_scale`, `test_bd_debt`, `test_bank_logos`, `test_beta_client`.
  - New, failing first: `test_v091_stocks_map`. It checks that no label is wider or taller than its tile, that small holdings merge into one "Other (n)" tile, that the map is at least 1.25 times today's height at 1100 px, and that a logo falls back to initials.
- **Check first:** `logo.clearbit.com` still answers. If it does not, use the Google favicon host, which the privacy notice already names.
- **Waits on:** nothing.
- **Parallel with C1:** yes, because they touch different functions. C1 merges first, then C2 rebases and re-runs its tests.

### C3. v09x/crypto: E32
- **Where:**
  - `#assets-crypto` at about L:12569-12579
  - `crCoinId` at L:21176
  - it reuses the Stocks card set after C1 and C2
- **Team:** cloud session. **Model:** Sonnet.
- **Tests:**
  - Existing: `test_crypto_live`, `test_icons`, `test_ledger`, `test_assets_order`.
  - New, failing first: `test_v091_crypto`. BTC, ETH and SOL give three tree-map tiles with the correct percentages, and old `alState.crypto` entries load untouched.
- **Waits on:** Q10 (where the coin icons come from).
- **Starts:** after C1 and C2 are merged.

### D. v09x/chrome: E1, E2, E24, E27, and the carried sidebar colours
- **Where:**
  - header mark at L:11086 and L:11981
  - nav at L:10867-10962
  - sub-tab bar `.subtab-nav` at L:12483 and about L:10880
  - `viDevCardPlace` at L:14574
  - `viRenderLedger` at L:14889-14921
- **Team:** cloud session. **Model:** Sonnet.
- **Tests:**
  - Existing: `test_brand_identity`, `test_mobile_nav`, `test_resp`, `test_v07_e1`, `test_v08_chrome` (update it to Overview only for E27), `test_assets_order`, `test_colour_code`, `test_ledger`, `test_view_mode`, `test_v09_round`, `test_v08_type_scale`, `test_daylight`, `wcag_scan`.
  - New, failing first: `test_v091_chrome`.
    - E1: the dial turns once, and not at all under reduced motion.
    - E2: at 1440 px the nav icons are 24 px in one row.
    - E24: the sub-menu is still visible after scrolling 1500 px, at 390 px too.
    - E27: the dev card exists only on Overview.
    - Sidebar: assets are green and surplus is blue.
- **Waits on:** Q1 (E1), Q15 (E24).
- **Starts:** after the Roadmap merge, because the Roadmap changes the tab button at L:11991 and adds `viRoadmapPlace` beside L:14553-14573.

### E. v09x/overview-budget: E4, E23, E5, E6
- **Where:**
  - E4: L:12213, L:14199, L:14398, and the draw calls at L:19379, 23655, 23862
  - E23: L:28354-28356
  - E5: L:12260, L:14356-14359, `cfLegendHTML` at L:19666
  - E6: L:12267 and L:14399-14400
- **Team:** cloud session. **Model:** Sonnet.
- **Tests:**
  - Existing: `test_overview`, `test_sankey_fit`, `test_v07_chips`, `test_v07_demo_first`, `test_v08_chrome`, `test_v09_round`, `test_view_mode`, `test_daylight`, `test_nw3d`, `test_signoff_a`, `test_bd_flow3d`, `test_v08_type_scale`.
  - New, failing first: `test_v091_overview_budget`.
    - `#cf-sankey` has zero height at every width.
    - The net worth 3D stage is 1.2 times today's height at 1440 and 1100 px.
    - The pills fill the card width at 1440 px.
    - The Budget stage uses its new clamp while the dashboard stage keeps its own.
- **Waits on:** Q2 (E23), Q14 (E4).
- **Starts:** after the Roadmap merge, because the dashboard Roadmap card at L:12167-12201 sits next to the cash flow tile.
- **Parallel with D:** yes. D's lines (10867-10962, 14574, 14889-14921) are separate from E's.

### F. v09x/house-look: E7, E8, E10, E11
- **Where:**
  - house type icons `#htypes` at L:12414-12421
  - house CSS at L:14465-14499
  - `MS_LABELS` at L:15905
  - milestones and stat tiles at L:15997-16026
- **Team:** cloud session. **Model:** Sonnet. Pedro sets the look before the build (E7 colour roles, E11 timeline).
- **Tests:**
  - Existing: `test_v08_cards`, `test_groupings`, `test_hb3d_levels`, `test_tiers`, `test_hb_brand`, `test_hb_one_builder`, `test_v07_e16`, `test_v07_e17`, `test_v07_e18`, `test_v08_type_scale`.
  - New, failing first: `test_v091_house_look`.
    - The six tiles have six different colours.
    - Icons are at least 28 px at 1100 px.
    - The timeline is the right-hand column at 1100 px, with gold percentages at 18 px or more.
    - The hologram note is at least 13 px at 1440 px.
- **Waits on:** Q3 (E11).

### G. v09x/house-xp-deposit: E9, E26
- **Where:**
  - `hbXP` at L:15933
  - `hbBadgeToasts` at L:16036
  - deposit push at L:15709
  - Level 1 tile at L:16003
  - it also uses the Roadmap's `wr*` XP functions
- **Team:** cloud session. **Model:** Opus (deposits, bricks and saved data must not change; the 25% bonus line).
- **Tests:**
  - Existing: `test_roadmap`, `test_wealth_roadmap`, `test_hb3d_app`, `test_hb_brand`, `test_ledger`, `test_sync`, `test_groupings`, `test_v08_cards`.
  - New, failing first: `test_v091_house_xp_deposit`.
    - Each of the ten milestones pays its XP once, and old milestones backfill silently.
    - The XP tile matches the Roadmap XP.
    - `state.saved` and the brick count are the same before and after a deposit with an account.
    - The bonus line is not added to `state.saved`.
  - One B runs a sync check.
- **Waits on:** Q4 (E9), Q5 (E26).
- **Starts:** after both the Roadmap and F are merged, because G touches the same L:15900-16040 area as F.

### H. v09x/inventory: E29, E31 (and the E28 manual link if Q11 is agreed)
- **Where:**
  - upload input at L:22021-22032
  - loader at L:16679-16683
  - `i3dGetBuf` at L:21866
  - `imgSearch` and `OPENVERSE` at L:22177-22179
- **Team:** cloud session. **Model:** Sonnet. The laptop reproduces E31 first (see the laptop section below).
- **Tests:**
  - Existing: `test_item3d`, `test_i3d_live`, `test_hb3d_design`, `test_img_search` (extend it with a failed-fetch case), `test_beta_client`, `test_v07_p3_items`.
  - New, failing first: `test_v091_inventory`. An `.stl` and an `.obj` both persist across a reload, an old record with only `glb` still opens, and a file over 25 MB shows an error.
- **Waits on:** Q11, but only for the optional eBay link.

### Laptop (owner's ZenBook, Claude Code in Git Bash, `~/Projects/Vault-It`)
- **No build chunk.** The browser tests open `file:///home/user/Vault-It/index.html`, which is the cloud path (`docs/MULTI_SESSION.md` line 11), so the laptop cannot prove a build.
- **The laptop owns:**
  1. E31 reproduction, before H starts. Open the live app on the owner's own browser and phone, watch the network request to `api.openverse.org`, and record the error type (about 20 min).
  2. The `npm run dev:phone` sign-off of the candidate.
  3. The release. The owner runs `git push origin <sha>:release/pioneer-v2`.
  4. E30 model fetch and R2 upload with `tools/fetch-models.mjs` and `tools/upload-models.sh` from `ccr-7de92975-69tcos`. Only if Q12 is approved and E30 is kept (it is deferred below).
- No Supabase work is expected this round: nothing server-side is in scope once E28 and E30 are deferred. Confirm at release with `git diff --name-only <live>..<sha> -- supabase/`.

### In-session agents
- **Pedro:** design notes before F, C2 and A, then reviews each chunk (at most two rounds).
- **rollout-qc:** gates every commit.
- **One B:** sign-in and sync checks for B, C1 and G.
- **scout and grunt:** inside each builder session.
- **David:** merges and reads CI.

## 2. Waves

- **Wave 0** (about 1.5 h): Step 0, then the Roadmap merge into `candidate/v0.9.1`.
- **Wave 1** (starts once the owner's answers are in; 6 parallel cloud sessions):
  - A cash3d (Opus)
  - B cash-accounts
  - C1 stocks-return (Opus)
  - D chrome
  - E overview-budget
  - F house-look
  - C2 stocks-map can join as a 7th if the owner can run seven sessions. Otherwise it starts as soon as any wave 1 session finishes.
- **Wave 2:**
  - C2 stocks-map, once a slot is free
  - G house-xp-deposit, after F is merged (Opus)
  - H inventory, after the E31 reproduction
- **Wave 3:** C3 crypto, after C1 and C2 are merged.

## 3. Merge order onto candidate/v0.9.1 (one at a time)

1. Roadmap
2. D chrome
3. E overview-budget
4. F house-look
5. B cash-accounts
6. C1 stocks-return
7. C2 stocks-map
8. A cash3d
9. G house-xp-deposit
10. H inventory
11. C3 crypto

A chunk that is ready early waits for its turn only where it shares lines with an earlier chunk: F before G, C1 before C2 before C3, B before A. The other chunks merge as soon as they are green.

**Gates for every merge:**
1. Pedro PASS, `rollout-qc` PASS, and branch CI green on its exact SHA.
2. David merges, then re-runs the chunk's named tests on the merge result.
3. Push, then wait for candidate CI on that exact SHA.
   - `ci.yml` lines 13-15 cancel an in-progress run when the same branch is pushed again. Never push the next merge before this one's CI has finished.
4. If CI is red: list every FAIL line from the server job and all three browser shards in the queue progress line before anyone edits. The fixer fixes the whole list in one commit.
   - Known flaky tests that pass on a re-run are allowed and named: `test_hb_speed`, `test_nw3d` reload, `test_sync`, `test_cut`, `test_hb3d_app`.

## 4. Estimate (wall-clock)

**v0.9 numbers this is based on:**
- One CI loop is 17-21 min, call it 20.
- v0.9 needed three loops from first push to green: 1 h 41 m in total, about 80 min of it on CI loops.
- v0.8 ran 6 parallel streams for 11.5 h, with 25 review commits and 17 red CI runs.

**Per chunk** (build, evidence, Pedro, QC, two CI loops):

| Chunk | Best | Likely |
|---|---|---|
| D | 3 h | 4 h |
| E | 3 h | 4 h |
| B | 3 h | 4 h |
| C1 | 2 h | 3 h |
| F | 4 h | 5 h |
| C2 | 3 h | 4 h |
| H | 3 h | 4 h |
| G | 4 h | 5 h |
| C3 | 4 h | 5 h |
| A | 7 h | 10 h |

**Critical path:** the stocks chain, C1 + C2 + C3: 2 + 3 + 4 = 9 h best, 3 + 4 + 5 = 12 h likely. The house chain (F + G = 8 to 10 h) and A (7 to 10 h) run beside it.

**Candidate merges:** 11 merges, each with one 20 min candidate CI loop. Most of them overlap the builds still running. The tail after the last chunk is about 2 loops plus one fix: 1 h best, 1.5 h likely.

**Assumes:** 6 parallel cloud sessions (7 at peak if C2 starts early), and the owner answers the batched question within 1 h.

(a) **Build to all chunks merged and candidate CI green:**
- Best: 1.5 (wave 0) + 9 + 1 = **about 11.5 h**.
- Likely: 1.5 + 12 + 1.5, plus about 2 h for one extra FIX round and merge waits = **about 17 h**.

(b) **To the owner's phone sign-off and release:**
- Add the phone check on the laptop (about 1 h of the owner's time), one fix loop if the owner spots something (about 1.5 h with CI), and the release gates (about 1 h, no server steps).
- Best: **about 13.5 h**. Likely: **about 20 h**.

**What the owner's response time does:**
- Every hour the batched answers are late moves everything by an hour, because almost every chunk waits on a Q.
- Every ASK raised mid-round stalls that chunk for the owner's reply time.
- If green lands at night, add the overnight wait. Last time, v0.9 sat green for 7 h 48 m before the push.
- Realistic calendar: answers by the morning of 4 Nov, candidate green late on 4 Nov, sign-off and release on the morning of 5 Nov.

**Swing item:** cutting E32 (C3) shortens the critical path to the house chain or A, about 10 h likely, saving about 5 h.

## 5. Deferred out of 0.9.1 (recommendation: defer all four)

- **E25 (crowdfund modal): defer.** Its prices match no Stripe link and its backer figures are invented, both against the standing rules (Q13). It only comes back as a separate pricing decision with new Stripe links.
- **E28 (eBay market value): defer.** It needs eBay API approval, a server function, a secret, a new host and a privacy line (Q11). It can ship now as a condition field plus a manual "search eBay sold listings" link inside H, if the owner agrees.
- **E30 (our own 3D model library): defer to 0.9.2.**
  - It needs a new host, a privacy line, a CC-BY credits page and R2 enabled (Q12).
  - Its branch is cut from v0.6, and there is no `models/catalog.json` and no models yet.
  - It is the highest-risk item and depends on the laptop.
- **E18 (3D on the investment tab): defer.** It is a design-led nice-to-have, sized L, and it would sit on the end of the longest chain (after E17, E19 and E20).

With these four deferred, 0.9.1 covers 27 edits plus the carried sidebar fix and E3 (the Roadmap merge), so it can honestly be called the final round of these edits.

## 6. Lessons from v0.9, as process changes

1. Base check first. David proves the candidate contains the live SHA before any brief goes out (Step 0).
2. Every red CI gets all FAIL lines from all three shards listed before the fix. Last time the fix covered shard 2 only, which cost one 20 min loop plus about 25 min of work.
3. Each brief names the existing tests that use the chunk's ids (section 1). The fixer greps `tests/` before pushing.
4. Clashes with standing rules go into the one batched question up front (Q1 to Q15, plus Q0 for Step 0). Last time the type-floor clash was found in CI.
5. No release claim before CI is green on that exact SHA. Last time the claim came at 02:03 and CI went red at 02:04.
6. Book the owner's sign-off window in advance so a green build does not wait overnight.
7. Queue and docs pushes skip CI. This needs the owner's OK to change `ci.yml`. Last time 69 of 183 runs (38%) were cancelled.
8. Wait for candidate CI between merges, because a new push cancels the run in progress.
