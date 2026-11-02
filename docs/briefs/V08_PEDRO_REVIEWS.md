# v0.8 reviews (Pedro, CD)

Shots: `node tools/shot.js` at 390, 690, 1100 and 1440, Night and Daylight. Against `V08_PEDRO_UI_SPEC.md`.

## C2, v07/ui-round2 7667eb0: Net worth tile (round 1 of 2): FIX, 2 items
Checked: Graph view closed, History open, Goals open, Snapshots open, 3D view. CSS matches the spec (28 px pills, 14 px icons, 12 px chevron, teal when open, full-width note 10.5 px DM Sans with vi-info). Pills also in the 3D view: accepted.
1. At 390 the row wraps: 108 + 96 + 128 + 2 x 6 gap = 344 px, the row's full width, so Snapshots drops to a second line. Gap 6 to 4.
2. Pill label 9 px is under the app's 10 px floor (my spec's mistake). Syne 700 10 px, letter-spacing .12em to .08em (keeps the width about the same). Re-measure at 390: one row.
Not C2's: at 1100 and 690 the Feedback button is clipped on the right (E2 has it).

## B2, v07/final-fixes 829cf7c (round 1 of 2)

### D, Net worth labels (373b066): PASS with 1 item
Seeded data (tests/test_nw3d.js seed), 390/690/1100/1440, Night and Daylight. Every name is in its own column's colour and reads on the plate; Daylight keeps the Night stage. Good.
1. At 390 the labels draw at 9 px (`lf=clamp(cw*.022,9,12)`, cw about 344). Floor is 10: `clamp(cw*.022,10,12)`.

### F, model tiles (829cf7c): FIX, 3 items
Taller rather than wider at 390 (two across, 5:6): accepted, one column would waste the row.
1. Scroll trap at 390: the canvas has `touch-action:none`, and two tiles across fill the width, so a swipe that starts on a tile no longer scrolls the page. Owner: "page scroll must still work around the tile". Use `touch-action:pan-y` on tile canvases: a vertical swipe scrolls the page, a horizontal one-finger drag orbits, two fingers pinch and pan. The full viewer (opened by tap) can keep `none`.
2. No affordance on the tile: nothing says it can be turned. Add the hint chip bottom-left, 6 px in: `vi-orbit` 12 px + "Drag to turn" (pointer: same), Share Tech Mono 10 px `var(--text)` on `rgba(8,8,8,.72)`, radius 4, padding 2 5; it fades over 240 ms on the first interaction or after 4 s, once per session. No button stack on tiles (too big at 150 to 168 px).
3. The full viewer's `.inv-ctl` is still the old blue 30 px text glyphs (`#9bd0ff`, + and -). Restyle to the `.nw3d-hud` language: vertical stack bottom-right 8, gap 6, 36 px (40 under 600), radius 8, border `rgb(var(--teal-rgb) / .35)`, background `rgb(var(--panel-rgb) / .82)`, icons `vi-zoom-in`, `vi-zoom-out`, `vi-reset` at 18 px, `--vi-sw:1.5`, colour `var(--text)`.
Not shot in a live tile: the sample data has no uploaded model. I'll check the tile with a GLB in round 2.

## C2, v07/ui-round2 86d5e13 (round 2 of 2): one CSS tweak left
10 px labels and the 4 px gap are in. At 690, 1100 and 1440 the pills sit on one row in Night and Daylight. At 390 they still wrap: with Syne really loaded (`document.fonts.check('700 10px Syne')` true), the widths are 111 + 99 + 133 + 8 = 351 px against a 344 px row. C2's 105/95/124 came from the fallback font, because the tests block the network.
Fix, under 420 px only: letter-spacing .04em, padding 0 7 0 6, gap inside the button 4. That saves about 23 px, which lands at about 328. The test should allow for the real font: assert the sum is at most 336 with Syne loaded, or keep 8 px of headroom over the fallback.

## C2, v07/ui-round2 1103ecc: PASS
With the real Syne loaded, the row measures 104 + 93 + 125 + 8 = 330 px. At 390 and 420 the pills sit on one row in Night and Daylight, and at 690, 1100 and 1440 too. At 360 they wrap into two right-aligned rows with nothing clipped, which is fine.

## D2, v08/cards 8a760da (round 1 of 2)

### C, Spending & saving cards: PASS
Shot at 390, 690, 1100 and 1440 in Night and Daylight. The 32 px icons, the separator-free titles on two balanced lines and the totals clear of the chevron all hold. One column up to 1279 is accepted. The sub-line (.56rem) and "% of income" (.5rem) stay at the app's current scale; see the global note below.

### B, House tile: FIX, 3 items
The structure matches the accepted build: one tile, six iconned stats (2 x 3 at 390, 6 x 1 from 690), the Next line, ticks on the bar, milestones open, and no empty column at any width.
1. The headline is not the hero. "£0 saved" is DM Sans 13 px at every width, so the top of the tile is empty at 1100 and 1440. Make the saved figure Syne 700 1.85rem (24 px at the 13 px root, and it scales up with the screen) in `var(--gold)`, with "saved" kept as the small label.
2. The prose runs too wide: at 1440 the hologram line is about 1300 px long. Cap `.hb-pg-note` and the brick line at `max-width:72ch`.
3. Emoji in the tile: 🎉 in "Keys Are Yours!", 📍 in "Show it on the house", 🧮 in "Preview your mortgage". Remove 🎉 and 🧮; replace 📍 with `vi-pin` at 14 px.

### Global note for David (not D2's)
At 390 and 690 the root is 13 px, so the app's common sizes (.5rem, .56rem) render at 6.5 to 7.3 px. In the House tile: eyebrow 6.5, milestone names 6.8, Next line 7.0. The brand book's smallest text is 10.5 px. The 10 px floor in my spec came from `index.html:8990`, which covers only the footer. Raising the whole scale is one change (`--vi-base` or the root `font-size`), but it would reflow every tab, so it needs the owner's word and its own round. ASK raised with David.
