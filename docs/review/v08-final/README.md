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

## Folded in: David's automated sweep (84 pages)
| # | Finding | Verdict |
|---|---|---|
| 1 | `#nw-fc-note` ("6-month estimate, not a prediction...") still shows under the Net worth 3D hero | **v0.8 bug (C2).** Pete asked for the forecast disclaimer to be "totally removed" from the 3D view, and the 3D view shows no forecast, so the note has nothing to explain there. Hide it while the 3D view is showing; keep it in Graph view. My miss: it is in my mobile 01-dash-top shot. |
| 2 | Flow chip labels `.cf-chip` in `#cf-sankey` and `#bd-sankey` are about 6 px on mobile and 8 to 9.4 px on desktop (the SVG is scaled by its viewBox) | **v0.8 (F2).** The type-scale promise covers this, and it is the first chart Pete sees on the dashboard. Counter-scale: set each chip's font size to target / (rendered width / viewBox width), with name 11.5 and amount 10.5 on screen, then rerun the chip collision layout (minimum 30 px between rows). If the collision test cannot go green within the hour, it moves to v0.8.1. |
| 3 | Debt tab `.dtm-s` 6.5 px and `.dtm-n` 8.1 px (the `font:` shorthand at index.html ~14311 to 14313 that type_floor.js skips) | **v0.8 (F2), quick.** `.dtm-n` gets max(clamp(...), var(--vi-fs-2)) and `.dtm-s` gets max(clamp(...), var(--vi-fs-1)), and teach type_floor.js the `font:` shorthand that holds a clamp(). |
| 4 | Stocks chart label `#stk-main svg` "+20.29%" at 9 px | **v0.8 (F2), quick.** 10.5 px. |
| 5 | Biz KPI labels cut to "MONTHLY RE...", "ACTIVE CLIE..." on mobile | **v0.8 (F2), caused by the floor and nowrap.** On the Biz KPIs let the label wrap to at most 2 lines (`white-space:normal`, letter-spacing .06em). A stub that hides the meaning is worse than a wrap. |
| 6 | Wealth inventory and Liabilities placeholder captions at 8.6 px on mobile | **v0.8 (F2), quick.** Tier 1 (10.5 px). |
Items 2 to 6 were all smaller still on 76be8ec (13 px root, .5rem), so they are misses in the type-scale sweep, not new breakage, apart from 5, which the nowrap caused. All of them are Pete-visible on a phone.


## Follow-up, v08/type-scale 5eb2d2c
Shots are in followup/.
1. `#nw-fc-note`: hidden in the 3D view and shown in Graph. PASS.
2. Phone sankeys at 1:1: the SVG is 960 x 362 in the sideways scroller, with chip text about 11.5 and 10 px. Desktop is unchanged, with large readable chips. PASS.
3. Debt tree map: names, values and sub-lines are readable at 390. PASS. The smallest seeded tile being too small to hold text is parked for v0.8.1 (show the name on tap).
4. Stocks donut sub-line at 10.5: PASS. 6. Item caption at 10.5: PASS.
5. Entrepreneur KPIs: 360 and 390 PASS (2 x 2, no ellipsis, on brand). FIX at 460: the grid goes 3 across and leaves "Monthly goal" alone on a second row, with "Monthly recurring revenue" wrapping to 3 lines. Keep the 2 x 2 grid up to 599 px, then 4 across.
Nit: "No clients yet — add your first!" has an em dash (pre-existing copy). Make it "No clients yet. Add your first."
Parked for v0.8.1 (pre-existing on 8b33d7c): at 360 the header "NET WORTH" label wraps to two lines.

Follow-up 2, v08/type-scale fea1747: PASS. The Entrepreneur KPIs are 2 x 2 at 460 and 599 with no lone tile, and 4 across at 768 (Monthly recurring revenue on 2 lines). The empty-clients copy has no em dash. Shots: followup/biz2_{460,599,768}.png.

## Pulled into 0.8 (owner, 2 Nov evening): C2 v08/forecast-rates eecf5e0
Shots: `followup/c2-*` at 390 and 1440, Night and Daylight, including two goals 1% apart.

- Item 3, no 📅 on "Net Worth History": PASS.
- Item 1, NW graph hint and goal labels: FIX (round 1).
  - The hint is on its own row under the axis at 10.5px, Graph view only. Labels are right-aligned and never overlap, and close goals split below their line. No sideways scroll, no errors.
  1. Daylight: the near-black plates sit on the paper-coloured chart as heavy black boxes. My spec only gave the Night value. Keep `rgba(8,8,8,.72)` with gold text in Night. In Daylight use the card surface at about .85 with brass text (`viCss('brass')`, as the old label used), so labels read without the black blocks.
  2. Wasted space: at 390 there is about 25px of empty canvas between the month labels and the hint. Bring the hint up to 4 to 8px under the month labels.
  3. The TODAY / Q4 '26 / Q1 '27 tick collision at 390 (both themes) is covered by C2's next commit; I will check it in the same shot.

C2 round 2, v08/forecast-rates 5600311 (with 899a7b5): shots `followup/c2r2-*` at 360, 390 and 1440, Night and Daylight.
- Round 1 fixes: PASS. Daylight plates are the card surface with brass text, and Night is unchanged. The hint sits 6px under the month labels. TODAY and the quarter labels no longer touch at any width.
- New at 360 (both themes), only when two goals sit near the bottom of the plot: the lowest label ("Emergency Fund") is pushed below its line onto the month labels and hides "Sep '26" and "Mar '27". 390 and 1440 are clear. Proposed fix: keep a "below" plate inside the plot (`y + h <= H - PAD.b`); if it does not fit, put it above its line, to the left of the plate it clashes with. This is the second round, so David decides.

C2 round 3, v08/forecast-rates 729ae9e: item 1 PASS. Shots: `followup/c2r3-*` at 360 and 390, Night and Daylight.
- With the sample data, no goal label touches the month axis at 360 or 390. Clear Debt stays below its line and Emergency Fund moves above-left.
- Crowded case: five goals between £1k and £12k at 360 and 390, both themes. No overlaps, and every plate stays inside the plot. QC's leftover risk (five or more goals crowded into a very short graph) is fine for 0.8.
- Nit for 0.8.1, not caused by this commit: at 360 the "Dec '26" month label is missing between "Sep '26" and "Mar '27".
