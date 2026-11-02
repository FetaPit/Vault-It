# v0.8 final check (Pedro, CD): candidate/v0.8 8b33d7c

Viewports: mobile 390x844, tablet 768x1024, desktop 1440x900, each in Night and Daylight, plus the Fold closed (344x882) for the bottom bar. Data: tests/test_nw3d.js seed, the test_bd_flags budget and a test GLB on a Wealth inventory item. Shots are in mobile/, tablet/ and desktop/ (`<item>_<theme>.png`). Page errors: 0 in every configuration.

| # | Item | Mobile | Tablet | Desktop |
|---|---|---|---|---|
| 1 | Cash and savings / Metals 3D: renders, coins gold, silver silver | PASS | PASS | PASS (gold sampled at 1100 in the A2 review) |
| 2 | Model tiles +20%, "3D · tap to turn" / "Drag to turn", viewer HUD, ghost pills | PASS | PASS | PASS |
| 3 | Net worth 3D labels in block colours; no disclaimer in the 3D view | PASS | PASS | PASS |
| 4 | Full-width forecast note (1.65% / 5%), History / Goals / Snapshots pills open and close | PASS | PASS | PASS |
| 5 | Cash flow: pills under the chart, top and bottom scrollbars | PASS | PASS | PASS |
| 6 | Budget key, Spending cards, tree map outlines (coral, Investments dashed), flag posts | PASS | PASS | PASS |
| 7 | House: one progress tile with stat icons, no blank tablet column, viewport unchanged | PASS | PASS | PASS |
| 8 | Feedback bottom right, Message the Dev last, footer folds and opens at the end | PASS | PASS | PASS |
| 9 | Type scale, KPI labels on one line, badges clear | PASS | PASS | PASS |
| 10 | General: no overlap or clipping, no sideways scroll, brand consistency | PASS* | PASS* | PASS* |
| Fold 344 | Bottom bar: 7 tabs fit, badges clear of icons (829 to 840 vs 844), no sideways scroll | PASS | | |

\* Pre-existing (identical on 76be8ec), not v0.8 regressions, so for a later round:
- The Net worth graph canvas text collides: "Scroll=zoom · Drag=pan · Dbl-click=reset" draws over the quarter ticks, and the House deposit and Emergency fund goal labels stack on the line (all widths).
- The house builder viewport caption loses its first letter under the left drawer handle at 390 ("ictorian mid-terrace"). It is inside the frozen viewport, so it is left alone this round.
- The 📅 emoji in the "Net Worth History" heading.
- The fixed Feedback button sits over whatever scrolls beneath it (for example a Budget card's amount at 1440 mid-scroll). This is by design: it fades over 3D controls, and each tab's end has 64 px of clearance.

Fix list for this round: none.
