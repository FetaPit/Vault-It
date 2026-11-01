# v0.7 preview edits (owner, 1 Nov 2026, about 19:00)

Found by the owner on the preview of candidate 67bb51e (https://candidate-v0-7-vault-it.ptlived.workers.dev). Queued only: nothing is built until the owner says go. Each edit below is the owner's own words first, then the one-line reading of it.

## Owner's words, verbatim

> First of all, the icons at the bottom, like the navigation bar at the bottom for the app, they're great and should be where they are on mobile view. But once the user opens it on a fold phone or a tablet or something wider than a usual mobile device, as in a mobile phone, then this nav bar with the icons, dashboard, budget, USP, house builder, debt tracker, investments, that needs to go back up to the top of the menu as it does on desktop. Okay, that's edit one. Edit two, the roadmap, financial freedom roadmap, needs to auto start at the next achievement for the user. So for me, it's debt halved, not at the beginning. Also, six later stages are already met, waiting on debt halved. Just remove that golden box, that tile, and then that information should be viewable once the user clicks on whatever achievement they want to complete. There needs to be a better flow animation on the cash flow and the income stream flow, as well as the labels for each expense being visible, because at the minute they're getting lost, so they need to have like a black label background. Okay, everything else is fine. Next, the budget tab. The user adding the key, the key box where it says committed essentials, variable essentials, with the icons and the color coding, that needs to be smaller and fit underneath in its own separate tile, or attached to the top tile, because that allows the user to read the bar at the top. Also, add a intro animation to that bar filling up. Then the 3D where your income flows, that's exactly going to be the same as that on the dashboard, so replicate it. The 3D view needs to be able to show a stroke line, an outline of each section, so red for committed essential, dark red. That dark red rectangle should group all of that visually and flag post to the label, so the label isn't sitting on top. It's attached to the flag post that the user can still navigate around and see that it's attached. So it'll be a green for the investments, a green rectangle stroke line, yellow for variable non-essentials, etc., etc. All labels attached with flag posts. The default view on spending and saving per month needs to be collapsed, and so the user can expand when they want to, and the arrow on the right of each committed essentials, so the expenses bar, that small arrow needs to be larger and face downwards, so it's evident that the user can click on it and expand it. Where it says choose a category, these categories, the pills, again, need to be in a drop down list and only show the main ones, and then the user can expand that when they need it. The main issue is the 3D engine, the animation for the house builder is not working. It's too slow. The user can't navigate it easily. I like it. However, it's breaking the website, which isn't great. So that needs to be fixed. So what I propose, and I would like some critique on, is only the last course of bricks, the last row, is animated upon loading, and the rest act as one 3D model already loaded. But I like the animations, it's just really slow. So we need to stop it breaking it. We need to make it more efficient, and the 3D WebGL engine more powerful, so users can work on it and understand it. So it looks like it's working really well now, but I think that's only because I've loaded the website beforehand. Also, it looks quite low fidelity, the wireframe, so the wireframe should be quite sharp. And the background, the ground plane animation isn't working, so there should be a subtle rectangle spreading out around the house, like on the net worth 3D viewport. The add your savings is a bit is wrong, so it should say contribute to your house, something like that, or it already says lay your bricks, so actually remove that add to your savings. But the entry box for the currency to add, say like £2,000 to the deposit, is too small. I want all of the functionality of this 3D viewport for the house, but at the minute it's not looking high definition, it's looking low quality. So let's figure that out. The navigation buttons at the top of the Build Your Dream Home, those should be smaller and on brand, and at the bottom of the viewport. The liabilities and wealth inventory, I can't expand the 3D view of the Honda Civic, so the liabilities should be able to on touch click and also click and drag a zoom in onto that 3D model, which is not at the minute. Same goes with the wealth inventory. Debt track is fine. Everything else is fine. So let's put a lot of effort into this house builder and progress this tonight. I want to have a version to show a tester tonight. Okay.

## The edits, one line each

### Priority: house builder (owner: "put a lot of effort into this house builder ... a version to show a tester tonight")
- E12. House builder is too slow on a cold load, hard to navigate and breaks the page. Keep every animation and feature, but stop it breaking the site. Measure from a cold load (cleared cache, phone), not a warm one.
- E13. Owner's proposal: on load only the last course (top row) animates; everything below loads at once as one finished model. Critique requested (see below).
- E14. Higher fidelity: sharp wireframe, looks high definition, not low quality.
- E15. Ground plane: a subtle rectangle spreading out around the house, as on the Net worth 3D viewport (currently not working).
- E16. Remove "Add your savings" ("Lay your bricks" already says it).
- E17. The amount box for adding to the deposit (e.g. £2,000) is bigger.
- E18. "Build your dream home" buttons: smaller, on brand, moved to the bottom of the viewport.

### Navigation
- E1. Bottom icon bar stays on phones only. On fold phones, tablets and anything wider than a phone, the nav goes to the top as on desktop.

### Dashboard
- E2. Financial freedom roadmap opens at the user's next achievement (for the owner: Debt halved), not at the start.
- E3. Remove the gold tile "six later stages are already met, waiting on Debt halved"; that information shows when the user taps an achievement.
- E4. Cash flow and income stream flow: better flow animation; every expense label readable on a black label background.

### Budget
- E5. The key (committed essentials, variable essentials, icons, colours) is smaller and sits in its own tile under the top bar, or attached to the top tile, so the top bar can be read.
- E6. Intro animation: the top bar fills up.
- E7. 3D "Where your income flows" is the same as the dashboard's: replicate it.
- E8. 3D outlines: each section grouped by a rectangle stroke in its colour (dark red committed essentials, green investments, yellow variable non-essentials, and so on). Each label sits on a flag post attached to its section, not on top, and stays visibly attached while the user orbits.
- E9. "Spending and saving per month" collapsed by default; the user expands it.
- E10. The expand arrow on each expense bar (e.g. Committed essentials) is larger and points down.
- E11. "Choose a category" pills become a dropdown showing the main categories, expandable for the rest.

### Liabilities and Wealth inventory
- E19. 3D models (e.g. the Honda Civic) open larger on tap or click, with drag to orbit and pinch or scroll to zoom. Same for Wealth inventory.

Fine as is (owner): Debt tracker, everything else.

## Critique of E13 (owner asked for it)

- Agree with the shape of it. The 31 Oct speed fix (451d6be) already merges bricks into one mesh once they have landed, but the cold load still has to build and draw the whole house before anything is usable. Showing the finished house at once and animating only the newest course removes most of that cost.
- Refinement: animate the bricks added since the user's last visit, capped at one course, rather than always the top row. A returning user then sees their progress laid, and a new user sees one row drop, not the whole house.
- Most of the cold-load cost is likely set-up, not the animation: shader compiling, building geometry and first-frame layout. Build the house geometry once and keep it (so the second visit is instant), start WebGL only when the viewport scrolls into view, and show the still picture until the first 3D frame is ready, so the page never freezes.
- Fidelity and speed pull against each other. Sharper lines usually come from rendering at the screen's full pixel ratio with anti-aliasing and using proper thick lines for the wireframe, which costs more GPU. Keep it sharp at rest and drop the resolution only while laying or orbiting.
- Prove it with numbers from a cleared-cache phone load (time to first 3D frame, longest page freeze, tap delay), before and after, as the 31 Oct fix did. The owner's hunch that it only looked fast because it was cached is a fair one to test first.

## David (COO): how this round is split

Where we are: Phase 0 Foundation. The gate is pre-sales and the waitlist, not polish. A tester seeing the app tonight helps that; another day of edits before anyone sees it does not. So tonight is about one thing working well (the house builder), with the quick fixes alongside it. The bigger 3D work on Budget and Dashboard is the next round, not tonight. (Launch strategy doc not re-read for this; the call is the same either way.)

Pushback: 19 edits in one go is how we ended up going round in circles. Four workstreams, each with one owner, one brief, its own tests and its own preview link. Nothing merges to the release until Pete has seen it.

| Stream | Edits | Who builds | When | Why it is grouped |
|---|---|---|---|---|
| A. House builder engine | E12, E13, E14, E15 | Fable session | Tonight, first | One engine (`src/hb3d/`), one measure (cold load on a phone). Speed and sharpness pull against each other, so one session owns both |
| B. Quick fixes | E16, E17, E18, E1, E2, E3, E9, E10 | Sonnet session | Tonight, alongside A | Small, separate screens in `index.html`, each a clear yes or no on a screenshot |
| C. Budget and Dashboard 3D | E4, E5, E6, E7, E8, E11 | Fable or Opus session | Tomorrow | E7 says Budget's 3D must match the Dashboard's, and E8 (outlines and flag-post labels) is then built once for both. Biggest design job; needs Pedro's brief first |
| D. 3D model viewer | E19 | Sonnet session | Tomorrow | One shared viewer for Liabilities and Wealth inventory |

Tonight's tester: send the preview link (sign-in off, demo data) once A and B pass, not the live site. The live release waits until Pete signs off on A and B, then C and D follow as v0.7.1.

Order of merging: B first (small), then A, each rebased and re-tested, then one fresh preview for Pete.

Risks:
- A's honest finding may be that cold load is still slow on a mid-range phone even with the last-course idea. Then the fallback is the still picture first and 3D on tap. Pete decides on the numbers, not on feel.
- C is where the round-in-circles risk is highest (labels, outlines, flag posts). Pedro briefs it, Pete approves the brief before any code.

One question for Pete: is the tester tonight seeing a preview link fine (demo data, no sign-in), or do they need to sign in with their own figures? Recommended: the preview link.

## Pedro (CD): creative brief for this round

Judged from the owner's words and the code at 67bb51e. No screenshots of these screens exist yet and Pedro has not seen the preview, so every "Done means" needs fresh shots (390, 768, 1100, Night and Daylight; plus 412 and 884 for E1). Where the owner's words clash with ECD_BRIEF, his words win.

### A. House builder (E12 to E18)
Idea: the house is already there the moment you look, sharp as a drawing, and only your newest course is laid in front of you.
1. Sharp = a hairline at native resolution. `src/hb3d/viewer.js:92` caps pixel ratio at 1.25 under 700 px and `:90` turns anti-aliasing off on touch, so a 1 px line on a 3x phone is stretched about 2.4x. At rest render at min(devicePixelRatio, 2); drop to 1.25 only while bricks land or a finger is down, back to full 300 ms later. `brand.js:311` LineBasicMaterial is always 1 device pixel: swap for LineSegments2 + LineMaterial (three r128 examples/js/lines). Outer edges 1.25 css px --teal #44C0B9 at .9; joints .75 px at .35; the course being laid --gold #E8C56A. Glow: one additive 3 px copy at .12, no bloom. Viewport stays Night in Daylight too (index.html:19).
2. Ground plane (E15): copy Net worth's ground() (index.html ~27005): teal radial glow .18, fading grid .28, gold plinth (1.5 px, 14 px blur, 9% fill), and every 2800 ms a rectangle growing 16 units out at 1.4 px, .45 to 0. It fails in the house because the ping is hidden in lite mode (brand.js:616, 668) and a slow cold load trips lite, and it sits at 10% at low progress (:669). Keep the ping in lite, fixed .45 peak, gold. Only reduced motion stops it (static rectangle stays).
3. Buttons (E18): #hud-bar-house to bottom centre, 12 px up, one row. Pill: --rail-bg, 1 px rgba(68,192,185,.3), --r-pill, 4 px padding and gap. Buttons drawn 36 px with 44 px hit area; 18 px sprite icons in --teal (vi-zoom-out, vi-zoom-in, vi-orbit, vi-pin, vi-reset, vi-fullscreen). Remove the emoji fallbacks (📍 ✥ ⛶ ↺, markup ~11512): an emoji as an icon is a hard fail. Orbit on: --teal border plus --dglow. Delete the top-right phone override at :10263; gold ROW n / 154 tag to top left.
4. Copy (E16): delete #hb-add-lbl "Add to your savings" (:11532) and its setter (:14596). Button says "Lay the bricks" ("Pay off the mortgage" on Level 2) with vi-brick-wall instead of ⊕. Input aria-label "Amount to add to your deposit"; rename the help FAQ at :27959 to match.
5. Amount box (E17): now about 12 px, under the 16 px that stops iOS zooming. Make it 56 px tall, Share Tech Mono 24 px digits, 20 px £ in --gold, inputmode="decimal", placeholder "2,000". At 599 px and under: input full width, 48 px button full width below; above, one row. Under it a live mono 12 px --muted line "£n lays n bricks" (depositTarget × 0.77 / bricksTotal).
6. E13 (motion): agrees, with the refinement. Frame one is the finished house up to the course below the newest, built once and kept, crossfaded from #hbStill over 200 ms. Then lay only bricks added since the last visit, capped at one course: each drops in 320 ms, flashes gold, settles teal; stagger min(40 ms, 1200 ms ÷ bricks in course), a course in 1.2 to 1.5 s; last brick keeps its ring and number; ground ping fires once. A deposit worth more than one course: lower courses appear under a 300 ms rising sweep, then the top course lays. The full build from an empty plot moves to an opt-in "Watch it built" link under the viewport (keeps the animation he likes, never blocks a load; retires ECD_BRIEF §3 "opening build on first view"). Reduced motion: final state.
Done means: at 390 Night zoomed to the eaves, single clean hairlines, no stair-steps (compare 67bb51e); two frames 1.4 s apart show the gold rectangle spreading, also with lite forced on; one button row bottom centre, no emoji, nothing over the ROW tag or caption at 390/768/1100; "Add to your savings" nowhere, amount box 56 px with 24 px digits and the brick line; plus numbers from a cleared-cache phone load (first 3D frame, longest freeze, tap delay), before and after.
ASK 1: "the navigation buttons at the top of Build Your Dream Home" = (a) the camera buttons (zoom, orbit, my row, reset, full screen), top right on a phone. Recommended; notes assume this. (b) the Level 1 / 2 / 3 pills under the heading.

### B. Navigation (E1)
Idea: a phone gets the thumb bar; anything with more room gets the tabs on top, as on desktop.
1. Bottom bar at max-width 599 px only; top nav from 600 px. Phones 320 to 440 px and fold cover screens 344 to 412 px keep the bar; unfolded folds about 600 to 900 px, iPad mini 744 px and wider get the top nav. 600 is Android's own phone/tablet line. Today it is 700 px (index.html:10117), which is why the bar shows on an unfolded fold.
2. Change both max-width:700px rules to 599px; keep --footer-h in that rule.
3. 600 to 1023 px: existing two-row header. Row 1 logo, net worth, Night/Daylight. Row 2 the eight tabs, icons only, 22 px icons in 44 px targets, space-evenly, no sideways scroll; labels on long-press and hover.
4. Active tab: 1 px outline in the tab's colour, 10 px radius, --dglow in Night. House builder keeps only its USP badge.
5. Landscape phone (600 px or wider, under 500 px tall): tabs move into the single 46 px header row.
Done means: 390 and 412 bottom bar as now; 768 and 884 no bottom bar, eight icons in the top row, active outlined; 844 x 390 a single header row; at 599 and 600 nothing under a bar.

### C. Dashboard (E2 to E4)
Idea: the roadmap opens on what you're working on now; the money visibly flows and every label reads.
1. Start (E2): :23431 already centres the next stage, but _fireFirstPaint is used up before the track has width, so it lands at 0. Clear that flag only when SC.clientWidth > 0 and scrollWidth > clientWidth; set the scroll in a rAF after the SVG width; re-centre each time the tab opens. No scroll animation; one gold ring pulse on Debt halved.
2. Detail (E3): remove #fire-block (:11325 and its filler ~:23411). Tapping a node opens #fire-detail-panel inline under the track (240 ms height and fade), node gets a 1 px gold ring. Panel: name, status chip (Achieved / Next up / "Met. Waiting on Debt halved"), what it takes from the user's own figures, the action. On Next up only: "6 later stages are already met. They tick when you finish Debt halved." Close with a 44 px ×, tapping the node again, or Esc.
3. Flow (E4): .cf-ln only pulses opacity now (cfFlow, :10299). Links draw in left to right (income to groups 0 to 600 ms, groups to items 300 to 900 ms), then a dash overlay (2 14, link colour, .7) runs at 40 px/s on links at .55. Pause off screen; reduced motion static.
4. Labels (E4): replace the halo stroke (:18263) with black chips: #080808 at .88, 1 px category-colour stroke at .5, 4 px radius, 4 px 6 px padding; name DM Sans 600 11 px #E8E8E8, amount Share Tech Mono 10.5 px in the category colour; chips stay black in Daylight. Size by getBBox, 30 px minimum between rows, push crowded chips down their leader line.
Done means: fresh load at 390 has Debt halved centred and no gold tile; tapping it shows the six-stages line, a met later stage shows "Met. Waiting on Debt halved"; frames 500 ms apart show dashes moving; every label readable on its chip with no overlaps, Night and Daylight, 390 and 1100.

### D. Budget (E5 to E11)
Idea: read the bar first, then the flow, then your own lines; in 3D each section is boxed and flagged in its colour.
1. Key (E5): attach to the top tile. Move #bd-legend (:11396) into the #bd-zero card as a footer under a 1 px --line border, 8 px 12 px padding; 2 columns at 599 and under, 3 at 600 to 999, 6 in a row from 1000; 8 px swatch, 14 px icon, mono 10 px uppercase; at most 76 px tall at 390.
2. Bar intro (E6): when half in view, segments grow in order committed essential to investments, 400 ms each, 120 ms stagger, done by 1.1 s; Income, Assigned and Left count up alongside. Reduced motion: final state.
3. Outlines (E8): tree map (~:27337) floor outline 1.5 px at .95, fill .08, each rect inset 0.3 units for a gap. Colours from CF_GROUPS (:16205): committed essential --coral #E5535F (the darkest red in the tokens; a new hex would be a hard fail), variable essential --salmon, committed non-essential --amber, variable non-essential --yellow, savings --green, investments --green2.
4. Flag posts (E8): 1 px post in the section colour from the rect's back-left corner to 2 block heights above its tallest block, 3 px dot on top; black chip (as C4) "COMMITTED ESSENTIAL · £n" on the dot. Post projected every frame so it turns with the orbit; only the chip faces the screen. Collisions: raise the post one chip height (up to 3 steps), then shorten to the total only; never slide a chip off its post.
5. Collapsed (E9): bdIsFolded (:18382) defaults to folded for everyone; a saved vi_bd_fold choice still wins.
6. Arrow (E10): replace the ▾ glyph (:13535) with vi-chevron 20 px, stroke 2, in a 44 px target; down when folded, turns up over 240 ms; drop the -90° rule at :13536.
7. Dropdown (E11): one 44 px "Choose a category" button for #bd-pick-exp and #bd-pick-inc. Spending main 8: Rent / Mortgage, Council tax, Utilities and bills, Groceries, Transport and fuel, Debt payments, Savings, House deposit; then "More categories (21)" grouped under the 6 type headings. Income: Salary, Side hustle, Benefits, Other, then "More (3)". role="listbox", arrow keys, Esc.
Done means: key inside the top card at 390, bar readable; frame at 500 ms shows the bar part-filled; 3D at two orbit angles shows six coloured rectangles with gaps, every chip on its post, none overlapping; fresh load all groups folded with 20 px down arrows, one dropdown instead of the pill grid.
ASK 2 (E7): (a) Dashboard and Budget flow views already share one renderer (drawCashflowDiagram, :18191, draws #cf-sankey and #bd-sankey), so C3 and C4 land on both; the 3D tree map with posts stays on Budget. Recommended. (b) Also add the Flow | 3D toggle and tree map to the Dashboard Cash flow card.

### E. Liabilities and Wealth inventory (E19)
Idea: tap the car and it fills the screen; turn it, pull it close, put it back.
1. One tap or click opens i3dOpen everywhere. Drop the phone two-step in i3dTap (:20684): its first tap only turns the tile live, and if the model file isn't on the device (i3dGetBuf empty) nothing happens, which fits "I can't expand it". Add a 44 px vi-fullscreen button in each tile corner.
2. Full-screen sheet on phones (100dvh, safe areas); modal up to 880 px from 600 px, 4:3 stage at least 60vh; scale .96 to 1 with a fade over 240 ms; --stage-bg, scanlines, gold plinth floor (:19518).
3. OrbitControls, damping .08. Touch: one finger orbits, pinch zooms, two fingers pan. Mouse: drag and wheel. Zoom .6x to 3x of fitted radius, max polar 85°. Same bottom-centre pill as A3 (zoom out, zoom in, auto-rotate, reset) replacing the ⟳ ＋ glyphs at :20626. Auto-rotate stops on touch, resumes after 2.5 s.
4. Tag: the existing gold flag-post tag (v3Label, :19559): LIABILITY with the depreciated value, or WEALTH ITEM.
5. Close: 44 px ×, Esc, Android back, swipe down; focus returns to the tile.
6. WebGL off: the saved thumbnail with the tag and "3D is off on this device. This is the saved picture."
Done means: one tap on the Civic at 390 opens the viewer; shots after a drag and a pinch show a new angle and closer view; same for a Wealth inventory item; WebGL-off shot shows picture and tag; closing lands back on the tile.

## Ready-to-run prompts (one fresh session each, started only on the owner's go)

Shared rules for every stream: read CLAUDE.md, docs/DEV_WORKFLOW.md and docs/MULTI_SESSION.md first. Work on your own branch from `candidate/v0.7`. Ship through the ship-item skill (intent card from the owner's words in docs/briefs/V07_PREVIEW_EDITS.md, a failing test first, named tests, `node tools/shot.js` shots at 390, 768 and 1100 in Night and Daylight, Pedro REVIEW to PASS, then rollout-qc). Never push release/pioneer-v2 or touch PR #3. No Supabase changes. Report your branch, SHA, test results and Cloudflare preview link (https://<branch-alias>-vault-it.ptlived.workers.dev) to the release chat, session_01Koffvw9bGnT6zw8keBi9TD. British English, no em dashes. Finish in five lines or fewer.

**Stream A, house builder engine (Fable, tonight):** "Build v0.7 preview edits E12 to E15 from docs/briefs/V07_PREVIEW_EDITS.md (owner's words, David's split, Pedro section A1, A2 and A6). Step one: measure a cleared-cache load at 390 px with CPU 4x on 67bb51e (time to first 3D frame, longest main-thread task, tap delay) and write the numbers down. Then: the finished house shows at once (built once and kept), only bricks added since the last visit animate (capped at one course), the full build moves to an opt-in 'Watch it built' link, 3D starts only when the viewport scrolls into view with the still picture until the first frame, sharp hairlines at full pixel ratio at rest, and the gold ground ping kept in lite mode. Edit src/hb3d/* and run node tools/build_hb3d.js. Measure again. tests/test_hb_speed.js must pass and gain a cold-load check. Report before and after numbers with the shots."

**Stream B, quick fixes (Sonnet, tonight):** "Build v0.7 preview edits E16, E17, E18, E1, E2, E3, E9 and E10 from docs/briefs/V07_PREVIEW_EDITS.md, following Pedro sections A3 to A5, B, C1, C2, D5 and D6 exactly. Only index.html markup, CSS and UI code; do not touch src/hb3d (Stream A owns it). One commit per edit, each with its own failing test. Merge first, before Stream A."

**Stream C, Budget and Dashboard 3D (Fable or Opus, tomorrow, after Pedro's brief is approved by the owner):** "Build v0.7.1 edits E4, E5, E6, E7, E8 and E11 from docs/briefs/V07_PREVIEW_EDITS.md, Pedro sections C3, C4 and D1 to D4 and D7, using the owner's answer to ASK 2. Labels and flag posts are built once and shared by both views."

**Stream D, 3D model viewer (Sonnet, tomorrow):** "Build v0.7.1 edit E19 from docs/briefs/V07_PREVIEW_EDITS.md, Pedro section E: one shared viewer for Liabilities and Wealth inventory, one tap to open, orbit and pinch zoom, the WebGL-off picture."

## Owner's answers (1 Nov ~19:40)

Verbatim: "1a same for dashboard means the budget flow diagram edits should be mirrored on the dashboard. The asset needs to be the same. Fligposts arent releveant here, just ensure the labels are clear with a black bg. Same style. 3a"

- ASK 1 (E18): (a), the camera buttons (zoom, orbit, my row, reset, full screen) move to the bottom of the viewport.
- ASK 2 (E7): the Budget flow diagram and the Dashboard flow diagram are one and the same asset: every flow edit (animation, black-background labels in the same style) lands on both. Flag posts do not apply to the flow diagram; they stay only on the Budget 3D view (E8). This matches Pedro's option (a): drawCashflowDiagram draws both, so build once and check both #cf-sankey and #bd-sankey.
- David's question (tester tonight): (a), the preview link with demo data and no sign-in.
