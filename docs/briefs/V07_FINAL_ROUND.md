# v0.7 final round: house builder as smooth as the brand book

Coordinated by David (COO), 1 Nov 2026 from about 22:20. The release waits for this round.

## Owner's words
- 22:11 (fold phone screenshot of the d19bb0c preview): "The house builder is still lagging, not working, breaking the app, making it freeze. This should be the final round of edits before release. What needs to be done to make sure that the house builder 3D viewport and the engine behind it runs on all devices smoothly and works just like on the brand book?"
- ~22:20: "by works, just like the brand book, like the animations are as smooth as on the brand book. Pull in all of our agents and use David, COO, to coordinate this last round of edits."

## Why it still freezes
The brand book draws 14,465 bricks with raw WebGL: one shader program, one instanced draw call, brick drops animated in the shader from a per-brick time stamp. The app draws 11,965 bricks through three.js across src/hb3d (about 2,900 lines, several meshes and line layers). The lab harness (software WebGL, CPU 4x) passed; the owner's real phone did not. From now on the owner's devices are the gate.

## Who does what
| Who | What | Branch | Gate |
|---|---|---|---|
| Stream A2, house engine (Fable, session_01KoffvynkETPQC1hZdf8um5) | Port plan in 30 min, then replace the brick renderer with the brand book's approach (one instanced draw, shader drops), keeping models, levels, ROW tag, camera buttons, ground ping, still picture, lazy start, "only new bricks lay". Old engine behind ?house=legacy for one release | v07/engine | Owner's phone and laptop via ?perf=1, Pedro side by side, rollout-qc |
| Stream B2, measurement and fixes (Sonnet, session_01Koffvw2V8wAyJ27ZzAaeVJ; restarted 22:21 because the first B2 session waited for owner OK) | First the ?perf=1 overlay with Copy report (so the owner can measure the current build tonight); then the three screenshot bugs: tower caption with Terraced selected, "Counting bricks..." and "... OF ... UK BRICKS" stuck, "£n lays n bricks" missing at 884 px | v07/final-fixes | Failing tests first, rollout-qc, CI |
| Pedro (CD) | Motion and fidelity acceptance spec taken from the brand book (timings, easing, flash, orbit, DPR, palettes, ground), then the side-by-side review | none | PASS against his spec |
| rollout-qc, queue-keeper | QC on every app commit; queue kept current | | |
| David (COO, release chat) | Order, merges into candidate/v0.7, CI, previews, owner sign-off, release | candidate/v0.7 | Owner's "signed off" |

## A2 port plan (accepted 1 Nov 23:16, David)
- New src/hb3d/house_gl.js ported from the brand book: raw WebGL, one program, one instanced draw per pass, shader-driven drop/flash/pulse/sweep, brand-book orbit and DPR. Three.js no longer loads for the house; other viewports untouched; viewer.js and brand.js stay behind ?house=legacy for one release.
- Lazy laying as Pete specified: settled stamps for everything below the frontier, one upload one draw; deposits animate only new courses; a type switch fills new instance buffers (measured; chunked over two frames if the mansion misses 40 ms) and lays only the top course.
- Confirmed cause of the switch freeze: the old engine rebuilds all instances synchronously (setMatrixAt over 12k-48k bricks plus geometry clones in one main-thread task).
- Keeps B2's perf hook once per drawn frame. New tests in tests/test_hb_engine.js against Pedro's done-means list; existing viewport tests must stay green.
- Honest estimate: 2.5 to 3 days. Tonight: skeleton on v07/engine (new file, legacy flag, failing tests). First milestone: the terrace drawing as settled shell + one animated course.

## Order
1. B2's perf overlay merges first; the owner measures the current build on his fold phone and laptop and pastes the reports.
2. A2's plan, then the build; B2's three fixes merge as they pass.
3. A2's engine merges once it meets the gate: no main-thread task over 100 ms while loading, laying or orbiting; laptop 55 to 60 fps, phone at least 30 fps sustained; first 3D frame within about 1.5 s on the phone; Pedro PASS against the brand book.
4. One preview, the owner signs off on both devices, then the release (backup, PR #3 to the signed-off commit, owner merges, live check, tag v0.7.0-alpha), then the server deploys with the owner's yes.

## Pete's decisions (1 Nov, after the brief)
- Release: option (b) — hold until the engine passes the gate. No still-picture fallback release tonight.
- Confirmed again 1 Nov 23:30 ("Ok coordinate the transplant ahead of the mvp 0.7 releass"): the engine transplant IS the release gate. Order: B2 CI diagnosis and bugs -> A2 skeleton -> A2 milestones (terrace first) -> Pedro side-by-side -> one preview -> Pete signs off on fold + laptop -> release.
- Pedro's ASK: the house viewport keeps the Night palette in Daylight mode too. No Daylight palette work.
- Lazy laying (part of the A2 spec): on load, only the top course is laid brick by brick; every course below is drawn as one settled shape (merged static instancing, no per-brick drop state). When a deposit adds more than the current course (e.g. £80,000 at once), the new bricks lay with the brand-book drop animation, course after course, to the new level — Pedro's stagger and drop timings apply to those new courses only. Initial render = settled shell + one animated top course; deposits animate only the delta.

- House-type switching is very laggy on the fold (Pete, 1 Nov): a switch must not rebuild per-brick animation state. Same lazy-laying rule: draw the new type as settled shell + one animated top course at the current level. Gate: no main-thread task over 100 ms on switch.

## David's view
- Honest timing: the engine swap is hours, not minutes. Release tonight only if the owner takes the safety option (still picture by default, 3D on tap) for v0.7 and the new engine as v0.7.1; otherwise the release follows the new engine.
- No new features in this round. Anything new goes to v0.7.1.


## Owner's fold report (2 Nov 09:13, new engine, real phone - Adreno 740)
fps 60 · frame ms p50 16.8 / p95 33.5 / max 53.2 · frames>33: 145 of 2313 · long tasks 9, worst 273 ms (idle compiles by design)
first 3D frame 203.8 ms from House tab · build 191.9 ms · lay 0.2 ms · orbit p95 18.2 ms (107 frames)
engine house_gl, one instanced draw, WebGL2, DPR 1.5, 21,000 bricks. GATE MET. Owner: "The engine looks good."
Full pasted report, 09:14 (fold inner screen, 690x727 at DPR 2.625): fps 55 over 5,956 frames · p50 16.9 / p95 35.9 / max 76.6 · 402 frames >33 ms (6.7%) · long tasks 15, worst 273 ms (idle type compiles) · first 3D frame 203.8 ms · build 191.9 ms · lay 0.1 ms · orbit p95 18.2 ms (362 frames) · canvas 926x681 · WebGL2 Adreno 740 · house_gl at rest. Both screens of the fold pass the gate.

## Final round part 2 (owner, 2 Nov 09:1x, from the fold test)
1. All 3D build animations are too fast: slow by 100% (duration doubled). Applies to the house builder AND the Net-worth 3D AND the dashboard's other 3D graph. House: drop 380->760 ms, stagger min(120,900/N)->min(240,1800/N), flash 1100->2200 ms; orbit/ping/pulse feel unchanged. Pedro's brand-book timings are overridden by the owner here; tests updated to the new numbers.
2. Build/lay animations trigger only when the viewport is near the middle of the screen (raise the IntersectionObserver threshold to ~0.5-0.6 and start the lay then), not at first pixel. Same rule for nw3d and the dashboard 3D.
3. Dashboard on mobile: the Assets / Liabilities / Debt cards sit too close and overlap - fix spacing/stacking at phone widths.
4. Level 1 / Level 2 / Level 3 cards: side by side even on mobile, as a swipeable carousel, freeing vertical room for the viewport.
Split: (1house+2house) -> engine session on v07/engine; (1nw3d/dashboard + 2 + 3 + 4) -> fixes session on v07/final-fixes. Merge order unchanged; release still gated on the owner's sign-off of the combined preview.
## Final round part 3: owner's fold test on candidate 76be8ec (2 Nov, 12:39 to 12:46)

Owner: "there'll be two rounds of edits here, smaller." Round 2 still to come. Release stays held until both rounds land and the owner signs off.

Round 1:
1. **Cash and savings 3D viewport is slow** (Wealth tab, £1 coin stacks). His ?perf=1: 70 long tasks, worst 1167 ms, 148 frames over 33 ms, p95 33.1 ms. "The viewport for the house builder is perfect, so do not change any of that whatsoever. Maybe we can learn from that viewport for the others." Stream A2 (v07/engine): rebuild the v3 coin viewer (index.html ~20392 to 20600, and Precious metals if it shares the path) with house_gl's lessons. Hard rule: zero diff on the house builder path. Gate: no task over 100 ms on open, orbit p95 20 ms or less.
2. **Uploaded 3D models in Assets, Liabilities and Wealth inventory**: pinch zoom, rotate, orbit (and mouse drag and wheel); page scroll must still work around the tile; render on demand. Item viewport tiles 20% larger. Stream B2 (v07/final-fixes).
3. **Net-worth 3D labels colour-coded** to match each column's block colour (colours already on each column in sceneData). Stream B2.

This round changes viewports the earlier scope guard protected. That is the owner's decision. Only the items above change.

Round 2 (owner, 2 Nov ~12:58, layout and alignment):
1. Remove the forecast disclaimer from the Net worth tile's 3D view (dashboard). Stream C2.
2. Message the Dev goes to the bottom of every tab, not the top. Stream C2.
3. The forecast note in Net worth over time spans the full tile width (responsive). The forecast itself moves from a straight line to a projection from the budget: only money assigned to Savings and Investments, compounding at stated conservative rates, debts falling by their budgeted repayments minus interest; no budget means no growth. Stream C2.
4. Net Worth History and Goals and snapshots come off the dashboard. Buttons at the bottom right of Net worth over time expand them, collapsed by default. Stream C2.
5. Category pills on the Cash flow tile and the Budget key scaled right down; on Cash flow they move below the chart. Stream C2.
6. Cash flow horizontal scrollbar bigger at the bottom, plus a synced one at the top. Stream C2.
7. Budget, Spending and saving per month: no overlapping text, smaller section icons, the stray separator between words removed. Stream B2.
8. E8 pulled forward from v0.7.1: Budget 3D tree map outlines in each group's colour (dark red ring around committed essentials) with flag-post labels, per Pedro's spec in V07_PREVIEW_EDITS.md. The owner had asked for this before; it was deferred to v0.7.1 and that was not made clear to him. Stream A2, after the coin viewport.

New stream C2: session_01KoffvxMhJw3izHA4HWe2G9, branch v07/ui-round2. Round 3 to follow.
