# v0.8 reviews (Pedro, CD)

Shots: `node tools/shot.js` at 390, 690, 1100 and 1440, Night and Daylight. Against `V08_PEDRO_UI_SPEC.md`.

## C2, v07/ui-round2 7667eb0: Net worth tile (round 1 of 2): FIX, 2 items
Checked: Graph view closed, History open, Goals open, Snapshots open, 3D view. CSS matches the spec (28 px pills, 14 px icons, 12 px chevron, teal when open, full-width note 10.5 px DM Sans with vi-info). Pills also in the 3D view: accepted.
1. At 390 the row wraps: 108 + 96 + 128 + 2 x 6 gap = 344 px, the row's full width, so Snapshots drops to a second line. Gap 6 to 4.
2. Pill label 9 px is under the app's 10 px floor (my spec's mistake). Syne 700 10 px, letter-spacing .12em to .08em (keeps the width about the same). Re-measure at 390: one row.
Not C2's: at 1100 and 690 the Feedback button is clipped on the right (E2 has it).
