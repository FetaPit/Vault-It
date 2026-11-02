# v0.8 UI spec (Pedro, CD)

Scope: the v0.7 final round part 3 items (`docs/briefs/V07_FINAL_ROUND.md` on brand-rollout), now alpha 0.8. Read from code on candidate/v0.8 (76be8ec) plus baseline shots at 390, 690 and 1100. Numbers, not adjectives. Colours are tokens from `index.html:19-51` and `CF_GROUPS` (`index.html:17146`); a new hex where a token exists is a fail.

## Who builds what (David's rebalance, 2 Nov; in build order)

| Order | Stream | Branch | Session | Sections |
|---|---|---|---|---|
| 1 | B2 | v07/final-fixes | session_01Koffvw2V8wAyJ27ZzAaeVJ | F model tiles and controls; D Net worth labels |
| 2 | E2 | v08/chrome | session_01KoffvyvXHoXuy9831Y4mBh | A pills; E footer, Feedback button, Message the Dev, scrollbars |
| 3 | D2 | v08/cards | session_01KoffvwFsYTabjwUFVciqDd | C Spending & saving cards; B House tile |
| 4 | C2 | v07/ui-round2 | session_01KoffvxMhJw3izHA4HWe2G9 | E: History / Goals / Snapshots buttons and the forecast note |
| 5 | A2 | v07/engine | session_01KoffvynkETPQC1hZdf8um5 | Coin viewer gold look (below); G tree map |

Coin viewer (A2): matcap is fine if it still reads as warm gold stacks: rims lighter than faces, no flat yellow, highlights in the `--gold` #E8C56A to `--brass` #C9A84C range. Checked at 390 and 1100, Night and Daylight (the stage is Night).

## 0. Rules for every item

- 1 rem = 13 px (`index.html:14020`). Sizes below are px. No text under 10 px (`index.html:8990`).
- Type: labels and eyebrows Syne 700, uppercase, .08 to .14em; body and names DM Sans 400 to 600, sentence case; figures Share Tech Mono. Nothing else.
- Icons: the app's own `vi-` sprite (24 grid, duo-tone). 14 to 18 px use `--vi-sw:1.5`; 24 px keeps 1.1. No emoji in tiles (the House tile's 🔥 and 🏅 go).
- Radii: `--r-brick` 4, `--r-tile` 14, `--r-card` 18, `--r-pill`. Spacing on a 4 px step.
- Widths to check: 390 (phone), 690 (fold inner), 1100 (tablet landscape), 1440 (desktop). Night and Daylight each. No sideways scroll, no text box overlapping another, no empty grid column.
- 3D stages stay Night in Daylight (`index.html:19`), so anything drawn inside a stage uses Night values in both themes.
- Motion: `--t-fast` 240 ms, `--ease`. `prefers-reduced-motion`: instant.
- The house builder 3D viewport is not changed. "Not regulated by the FCA. Not financial advice." stays visible.

## A. Compact category pills (C2: Cash flow and Budget legend)

Now: `.cf-legend` at `index.html:14283-14286`: 10 px DM Sans plus an 18 px swatch plus a 22 px icon, 6x12 padding, about 34 px tall. At 390 the six pills take 6 rows, about 250 px.

Spec:
- One marker, not two: drop the swatch `<i>`; keep the group icon in the group colour. `cfLegendHTML` (`index.html:19400`) passes 14 to `bdGroupIcon`.
- Pill: height 22, padding 0 8 0 6, gap 5, border 1 px `color-mix(in srgb,var(--c) 35%,transparent)`, background `rgb(var(--ink-rgb) / .03)`, radius `--r-pill`.
- Icon 14 px, `--vi-sw:1.5`, colour `var(--c)`.
- Name: DM Sans 500 10.5 px, line-height 1, `var(--text)`, `white-space:nowrap`. Names are `CF_GROUPS[t].short`, unchanged.
- Gaps between pills: 4 px rows, 6 px columns. `justify-content:flex-start`.
- Rows: 390 three at most (about 74 px); 690 two; 1100 and 1440 one.
- Cash flow: the legend moves under `#cf-sankey`, margin-top 8, aligned to the chart's left edge. Budget: `#bd-legend` sits flush under the `#bd-zero` bar tile (margin 8 0 0), not as its own band.
- Daylight: the same rules; `--c` resolves to the Daylight token, text stays `var(--text)`.
- Hover (pointer only): background `color-mix(in srgb,var(--c) 10%,transparent)`. The `title` tooltip stays.

## B. House tab: one progress tile with stat icons (B2)

Now: the Level 1 card (`hbRenderHUD`, `index.html:15749`) and `#hb-prog` (`index.html:12368`) both show the saved figure, %, bar, bricks, remaining and a milestone list under different names (7 badges against 10 milestones). At 690 the plan card leaves the right column empty under it while Progress sits alone on the left (baseline shot).

Spec, one tile `#hb-hud`, `#hb-prog` removed (ids that tests or code read move into the new tile):
1. Eyebrow: "LEVEL 1 · FIRST DEPOSIT", Syne 700 9 px .14em, `var(--teal)`.
2. Headline: saved `£n` Syne 700 24 px `var(--gold)`; beside it "of £40.0k deposit (20% of £200.0k)" DM Sans 11 px `var(--muted)`; right-aligned `n.n%` Share Tech Mono 12 px `var(--gold)`. One line at 690 and up; the "of" line wraps under the figure at 390.
3. Bar: 6 px high, radius 3, track `var(--track)`, fill `var(--gold)`. Milestone ticks on the bar: 1 px by 6 px marks at each milestone %, `var(--line2)`, `var(--gold)` once passed.
4. Next milestone, under the bar: `vi-milestone` 14 px + "Next: 50% · First floor walls up · £n to go", DM Sans 11 px; the name in `var(--text)`, the rest `var(--muted)`. One milestone set only: the house-stage names (`msl-*`). The full list sits behind a "All milestones" disclosure (Syne 700 9 px, `vi-chevron` 14 px), closed by default, two columns at 690 and up, 28 px rows. The badge chips (`.hb-badges`) leave the tile; badge toasts are unchanged.
5. The ROW card stays as it is (it is the link to the house), directly under item 4.
6. Stat grid, six cells, no duplicates:

| Icon | Value (Share Tech Mono 15 px, `var(--text)`) | Label (DM Sans 10 px, `var(--muted)`) |
|---|---|---|
| `vi-brick` | 1,234 | of 21,000 bricks |
| `vi-house-builder` | 56 | roof tiles |
| `vi-target` | £38.8k | to go |
| `vi-vault` | £40.0k | 20% deposit |
| `vi-xp` | 120 | XP |
| `vi-streak` | 3 | month streak |

   Cell: icon 18 px `--vi-sw:1.5` in `var(--teal)` (streak icon `var(--gold)`), icon left of a two-line value/label block, gap 8, padding 10, min-height 52, radius `--r-tile`, background `var(--surf)`, border 1 px `var(--line2)`. Grid gap 8.
7. Footer of the tile: the brick-value line (DM Sans 10 px muted), then "Preview your mortgage" (existing button), then the budget tip if shown.

Layout:
- 390: grid 3 x 2.
- 690 (600 to 1023): the tile spans the full row (`grid-column:1/-1`) above the plan card; stat grid 6 x 1. No empty column anywhere.
- 1100 and 1440: two columns, tile | plan, `minmax(0,1.3fr) minmax(0,1fr)`; stat grid 3 x 2.
- Daylight: the same tokens; cell background `var(--surf)` resolves to paper.

Matched to D2's build (2 Nov 13:35): the panel is one column at every width (tile full width, then the plan); stats 2 x 3 at 390, 6 x 1 from a 560 px tile up; milestones shown open (owner: "as informative as possible") with earned ones lit and ticked. Accepted.

## C. Budget "Spending & saving per month" cards (B2)

Now (390 baseline): each group header has a 62 px icon box, the title is the long label with " · " ("COMMITTED · ESSENTIAL") which wraps over two lines and breaks "NON-ESSENTIAL"; one header had a box drawn over its title.

Spec per group header:
- Grid `28px minmax(0,1fr) auto 24px`, gap 10, padding 10 12, min-height 48.
- Icon box 28 x 28, radius 8, background `color-mix(in srgb,var(--c) 14%,transparent)`, border 1 px `color-mix(in srgb,var(--c) 40%,transparent)`; icon 18 px `--vi-sw:1.5`, colour `var(--c)`.
- Title: `CF_GROUPS[t].short` (no " · " separator), Syne 700 11 px .08em uppercase `var(--c)`, one line, ellipsis.
- Example line (`ex`): DM Sans 10.5 px `var(--muted)`, one line, ellipsis.
- Total: Share Tech Mono 13 px `var(--text)`, right-aligned; item count under it, 10 px `var(--muted)`.
- Chevron `vi-chevron` 20 px, `var(--c)`, points down when closed, up when open, 240 ms rotate.
- Card: radius `--r-tile`, border 1 px `color-mix(in srgb,var(--c) 35%,transparent)`, 8 px between cards. Collapsed by default (owner, 1 Nov).
- Nothing absolutely positioned over a header. At 390 every title fits on one line ("COMMITTED NON-ESSENTIAL" at 11 px is about 190 px; the column has about 230).
- 690 and up: same header; cards one column inside the Budget page max-width (1040).

Matched to D2's build (2 Nov 13:35): title may run to two balanced lines, never split at a hyphen, at no less than 10 px; icon box 32 px with a 20 px icon (not 38/24: the owner asked for smaller icons); everything else as above.

## D. Net worth in 3D: labels in their column colours (B2)

Now: floor names are gold (own) or red (owe) on a `rgba(8,8,8,.72)` plate (`index.html:28102-28103`); the columns use their own colours from `sceneData`.

Spec:
- Text colour = the column's own block colour, exactly as drawn (`cc.col`), at .95. Hover stays `#fff`.
- Contrast: each label colour must reach 4.5:1 on `#080808`. If one does not, mix it toward `#fff` (10% steps) until it does; never darken. List any colour adjusted in the commit.
- Plate unchanged (`rgba(8,8,8,.72)`, 3 px side padding). Font size `clamp(cw*.022,10,12)` (the minimum goes from 9 to 10).
- The legend swatch for each column, if shown, uses the same colour, so label, block and key match.
- Daylight: the stage is Night, so the same values in both themes. Check that the Daylight block colours equal the label colours on the same frame.

## E. Footer that collapses, and the fixed Feedback button (C2)

Now: at 600 px and up the footer is fixed and grows to 3 to 4 lines (690 baseline: about 60 px, and its first line is clipped on the left). Under 600 it is static at the end of the page. `#vi-fb-btn` sits at `bottom: footer + 14` (`index.html:14191`) and is clipped on the right at 690.

Footer, 600 px and up:
- Collapsed (no scroll for 1200 ms, and on load): one line, height 24 px plus safe area. Content: "Not regulated by the FCA. Not financial advice." DM Sans 10 px `var(--muted)`, centred, plus a 24 px "More" button (`vi-chevron` 14 px, pointing up, `aria-expanded="false"`) at the right.
- Expanded (while scrolling, at the end of the page, or after "More"): the full footer as now, max 3 lines, every line wrapping inside the viewport (fixes the 690 clip). Height change 240 ms `--ease`; reduced motion instant.
- `--footer-h` follows the real height, so every element already using it (sync banner, help panel, Feedback button) moves with it.
- The FCA line is therefore on screen at all times. Background `rgb(var(--panel-rgb) / .97)`, border-top 1 px `rgb(var(--teal-rgb) / .15)` as now.

Footer, under 600: stays static at the end of the page (the tab bar owns the bottom). No change.

Feedback button:
- Fixed, right 16 px. Bottom: 600 px and up `calc(var(--footer-h) + 12px)`; under 600 `calc(56px + env(safe-area-inset-bottom,0px) + 12px)` (above the tab bar).
- Under 600: 40 px circle, `vi-chat` 18 px, label hidden but kept as `aria-label`. 600 and up: pill 32 px high, padding 0 12, gap 6, `vi-chat` 16 px, "Feedback" Syne 700 10 px .08em uppercase.
- Colours as now: background `var(--panel)`, border 1 px `rgb(var(--teal-rgb) / .5)`, text `var(--teal)`. z-index 450: under the help panel and modals, over content.
- Never covers a 3D stage's controls or a primary button: each tab's last block gets 64 px bottom padding, and the button hides while any modal or the help panel is open.

Message the Dev at the foot of each tab (C2): the existing card unchanged, margin-top 24, last item before the tab's bottom padding.

History / Goals / Snapshots buttons (C2): bottom right of "Net worth over time", right-aligned row, gap 4. Each a 28 px pill: Syne 700 10 px .08em uppercase, `var(--muted)`, border 1 px `var(--line2)`, icon 14 px (`vi-calendar`, `vi-target`, `vi-camera`), `vi-chevron` 12 px; `aria-expanded`. Open: border and text `var(--teal)`, chevron up. Panels open under the chart, full tile width, collapsed by default. At 390 the three wrap onto one right-aligned row (about 300 px total).

Forecast note (C2): full tile width, DM Sans 10.5 px `var(--muted)`, `vi-info` 14 px, margin-top 8. No disclaimer inside the 3D view.

Cash flow scrollbars (C2): top and bottom bars 10 px high (6 px thumb at rest, 10 px on hover or touch), thumb `rgb(var(--teal-rgb) / .5)`, track `var(--track)`, radius 5; the top bar is a synced twin directly above the chart, 4 px gap.

## F. Uploaded 3D model tiles and controls (B2)

Now: `.inv-ctl` buttons 30 px, blue (`#9bd0ff`, `index.html:10762-10764`), a different control language from the Net worth 3D HUD.

Spec:
- Tile: 20% larger than now in width (aspect 4:3 unchanged), capped at its container; at 390 that is full card width.
- Controls: one language with `.nw3d-hud` (`index.html:27858`): vertical stack, right 8, bottom 8, gap 6; buttons 36 x 36 (40 under 600), radius 8, border 1 px `rgb(var(--teal-rgb) / .35)`, background `rgb(var(--panel-rgb) / .82)`, icon colour `var(--text)`. Icons `vi-zoom-in`, `vi-zoom-out`, `vi-reset`, plus `vi-fullscreen` if the tile opens larger; 18 px `--vi-sw:1.5`. No text glyphs (+, -).
- Affordance: a hint chip bottom-left, 8 px in: `vi-orbit` 14 px + "Drag to turn · pinch to zoom" (pointer: "Drag to turn · scroll to zoom"), Share Tech Mono 10 px `var(--text)` on `rgba(8,8,8,.72)`, radius 4, padding 3 6. It fades over 240 ms on the first interaction or after 4 s, and does not come back that session.
- Gestures: one finger turns; vertical page scroll passes through (`touch-action:pan-y` until a horizontal drag of 8 px starts); two fingers pinch zoom; mouse drag and wheel. Cursor `grab` / `grabbing`. Focus ring 2 px `var(--teal)`.
- Stage stays Night in Daylight (`index.html:19`).

## G. Budget 3D tree map: outlines and flag posts (A2, E8)

My spec in `V07_PREVIEW_EDITS.md` (Pedro C, items 3 and 4) stands, with these updates:
- Colours: the stage is Night in both themes, so the Night hexes of `CF_GROUPS` apply: committed essential `--coral` (#E5535F, the darkest red token; "dark red" in the owner's words), variable essential `--salmon`, committed non-essential `--amber`, variable non-essential `--yellow`, savings `--green`, investments `--green2`.
- Outline: floor rectangle per group, 1.5 px at .95, fill .08, inset .3 units so neighbours show a gap. Drawn after the blocks so no block hides it.
- Post: 1 px in the group colour, from the rectangle's back-left corner to 2 block heights above its tallest block; 3 px dot on top. Re-projected every frame so it turns with the orbit; only the chip faces the screen.
- Chip (one style with the flow labels): `#080808` at .88, 1 px stroke in the group colour at .5, radius 4, padding 4 6; name DM Sans 600 11 px `#E8E8E8`, amount Share Tech Mono 10.5 px in the group colour. "Committed essential · £n".
- Collisions: raise the post one chip height, up to 3 steps; then show the amount only; never slide a chip off its post. The existing `rgba(8,8,8,.72)` floor labels (`index.html:28313`) are replaced by the chips, not doubled.
- Reduced motion: posts static, no intro rise.

## Review: what I check on each branch

`node tools/shot.js` at 390, 690, 1100 and 1440, Night and Daylight, on the changed element, against this file. Each item gets PASS or a numbered fix list, cc David; two rounds, then David decides. Fails on sight: text under 10 px, overlapping text, an empty column, a label that does not match its colour, a new hex where a token exists, sideways scroll, the FCA line off screen, any change to the house builder viewport.

## H. App-wide type scale (F2, v08/type-scale; owner said yes, 2 Nov)

Problem: at 390 to 690 the root is 13 px (`index.html:14020`), so .5rem renders at 6.5 px. The brand book's smallest text is 10.5 px.

Pedro's position, to agree with F2 after its audit:
- Raising only the root from 13 to 15 px is not enough, and it is the wrong way round. .5rem would still be 7.5 px, and everything already readable (headings, figures, rem-sized icons and paddings) would grow 15%. That repeats the owner's "too large for the UI scale" complaint.
- Instead, put a floor under the small sizes and leave the rest alone. Every `font-size:<x>rem` with x under .81 becomes `max(<floor>px, <x>rem)`, so it never renders under its floor and still scales up on big screens:

| Current | Floor | Use |
|---|---|---|
| under .56rem | 10.5 px | captions, sub-lines, legal, hints, axis labels |
| .56 to .69rem | 11.5 px | body in tiles, list rows, buttons |
| .70 to .80rem | 12.5 px | lead lines, inputs |
| .81rem and up | unchanged | headings, figures |

- Uppercase Syne eyebrows and labels (letter-spacing .08em or more) may floor at 10 px; their caps read larger.
- Inline `style="font-size:..."` counts too, and so do sizes set from JS strings.
- Fixed-height containers (pills, chips, 28 to 36 px buttons, tab bar) must still fit: no clipped descenders, no wrap that grows a row. List every one F2 had to adjust.

Allowed exceptions (listed in the commit):
- Text drawn on 3D canvases: minimum 10 px via the existing `clamp()`s.
- The USP and PRO nav badges: 9 px uppercase.
- The house builder 3D viewport and its HUD: not touched (hard rule).

Must not grow: anything already 10.5 px or more on screen; icons; row heights in the tab bar; the C2 pills (10 px caps, measured to fit 390).

Done means: an audit before and after (count of visible text nodes under 10.5 px at 390, 690 and 1100, which should be zero except for the exceptions); no sideways scroll; no new wraps in pills, chips or buttons; tab shots at 390 and 1100, Night and Daylight, for Dashboard, Budget, House, Assets, Debt and Settings.

Agreed with F2 after its audit (2 Nov 14:3x): 410 of 475 element and size pairs are under 10.5 px at 390, and the root is 13 px everywhere under 1100. Floors are tokens: --vi-fs-1 10.5px, --vi-fs-2 11.5px, --vi-fs-3 12.5px, applied by each declaration's source value as above. They are on at every width (they are max() floors, so desktop text that is already larger does not move). No root bump. The generated HB3D block and canvas text are excluded. USP and PRO badges: 10 px if the badge can grow to fit, otherwise 9 px.

David, 2 Nov 14:29: floors on at every width, desktop included. Pete's sign-off shots include 1100 and 1440, before and after.
