# Vault-form review, round 1

Reviewer: Pedro (creative director). Job 2, Review. Build under review: `brand/fonts/vault-form/` v1.000 (Pete T), commit `bbc9df1`. Brief: `docs/creative/briefs/vaultform-type.md`, as amended by the owner on 10 Nov: family is **Vault-form**, hatch from image 3, and Bold at 24 to 64 px replaces Syne ExtraBold as the heading face across app, website and comms.

I did not edit the font or the build script. Where I give a fix I tested it on a throwaway copy of the generator in the scratchpad (`.../scratchpad/vf/`), not in the repo. Proofs are in `/tmp/claude-0/-home-user-Vault-It/65a06bcf-7530-53ea-9dff-9126183acea4/scratchpad/proofs/` (Pete's) and `.../proofs/r1/` (mine, named below). Line numbers refer to `source/build_vault_form.py` as committed.

## Verdict

**Not yet fit to ship as the Syne replacement. Fit once FIXes 1 to 4 land.** The design is right: at 64 px, 40 px and 16 px Bold reads as techno, solid and finance, and it is clearly not Syne (`proofs/r1/heading-spacing.png`). The blockers are all small construction errors in glyphs that appear in ordinary headings (`e`, `c`, `?`, `&`), not problems with the idea. FIX 1 to 3 are one-line changes each and are already proven on the sandbox copy. Everything else can ride in a 1.001 point release. After FIXes 1 to 4, Bold and Condensed Bold can replace Syne for headings from 24 px up. Light and Regular are fit for 20 px and up display use.

Gate still open outside the font: CLAUDE.md and `brand/ECD_BRIEF.md` still say "Syne, DM Sans, Share Tech Mono only". The owner's word of 10 Nov unblocks the change but both files need editing before any app build uses the face.

## Ruling on chamfer direction

**Pete's version stands: big chamfers top-left and bottom-right.** Amend brief line 1.2 to match.

Reasons, with evidence:
- The brief's own intent is "a forward '/' lean without italics". My corner list (top-right, bottom-left) contradicts that intent, because a 45 degree cut at those corners runs "\". That was my error, not his.
- Measured on the principal axis of the ink (Bold, 200 px render): `O` +9.9 degrees, `o` +9.3, `c` +9.9, `Z` +9.9. Mirroring the chamfers to my original corners gives the same magnitudes with the sign reversed, so the brief's version would lean back by about 10 degrees. Pete's leans forward by about 10.
- `lean.png` rows 1 and 2: row 1 (his) has every cut parallel to the "/" diagonal and the line has forward movement. Row 2 sits upright.
- The 1.2 test is "visible at 48 px, not costume at 16 px". At 48 and 64 px the lean is visible in the cuts without making the word look slanted. At 16 px (`heading-spacing.png`, bottom third) it reads as plain upright text. Pass.
- Cost: none found. Left edges of headings start with `G`, `C`, `O`, `S`, `D`; the top-left cut is no worse there than the bottom-left cut would be.

## Verdict per brief line group

| Group | Verdict | Basis |
| --- | --- | --- |
| 1 Concept | FIX | 1.1 PASS, 1.2 PASS (see ruling), 1.3 FAIL until FIX 1 to 2 (spurs in `e c ? ¿ æ œ`), 1.4 needs humans |
| 2 Letterforms | FIX | 2.1 weakened by one shared failure across six glyphs, 2.2 PASS, 2.3 PASS, 2.4 NIT, 2.5 PASS with one deviation |
| 3 Readability | PASS with FIX 3 | 3.1 PASS, 3.2 FAIL for `&` and `%` in Bold only, 3.3 to 3.6 PASS |
| 4 Weights and widths | PASS | stems 60 / 94 / 160, condensed stems identical, style linking correct |
| 5 Hatch cut | NIT | works and is quiet; "invisible below 48 px" is not true, the face is readable though |
| 6 Figures and symbols | PASS with FIX 4 | tabular alignment exact, minus about 2x hyphen; coverage gaps listed |
| 7 Files and naming | PASS | all 24 files present, OFL present, no external host, metrics clear |
| 8 Review checks | PASS for 8.1, 8.2, 8.5; 8.3 not done; 8.4 needs humans | |

## Blocking FIXes

**1. FIX: stray spur at the bottom right of `e`, `c`, `æ`, `œ`.** Confirmed in Light, Regular, Bold and Condensed Bold (`proofs/r1/zoom-e-bold.png`, `zoom-e-reg-light.png`). A triangular tooth about 60 units tall (22 px at 380 px/em) stands on the foot arm, left of the terminal. Cause: the cut that opens the right side of the counter starts at `W - max(S, big) - 10`, which is narrower than stem plus inner chamfer, so the wedge of the chamfered counter corner survives. It breaks brief 1.3 ("no spurs") and 2.1 (one failed fix shared by four glyphs).
Smallest fix, tested (`proofs/r1/e-fix-test.png`, bottom row, and `c-fix-test.png`):
- line 326, `_e`: `cut = box(W - S - g.big(W, X) - 10, H3, W + 10, yb0)`
- line 307, `_c`: `r = r.difference(box(W - S - g.big(W, X) - 10, H, W + 10, X - H))`
`æ` and `œ` inherit the `e` fix. Afterwards `c` loses its second small step at the top terminal, which is the cleaner result.

**2. FIX: spur at the top left of `?`, and `¿` is that spur rotated.** The lead's "¿ looks broken" is real and shares one cause with FIX 1: the cut that removes the left stem under the top-left chamfer stops at `S + 10`, leaving a flag (`proofs/r1/q-fix-test.png`, top row). `?` is ASCII and common in headings and UI copy, so this blocks.
Smallest fix, tested: line 979, `_question`: `r = r.difference(box(-10, yq - 10, S + g.big(W, C) + 10, C - H))`. `¿` follows because it is drawn by rotating `?`.

**3. FIX: counters close in Bold and Condensed Bold for `&` and `%` (brief 3.2).** `proofs/r1/risk-all-weights.png`: in Bold the `&` is a near-solid block with the lower-left counter reduced to a sliver, and the `%` rings are 20 unit slits. Light and Regular are acceptable. These sit in "Income & spending" and "38%" style headings, which are exactly the Syne replacement uses.
Smallest fix, tested (`proofs/r1/amp-pct-fix-test.png`, rows 3 and 4 against rows 1 and 2):
- `_ampersand`, line 1335: leg weight `round(t * 0.95)` to `round(t * 0.72)`, and `W = g.w(700, 2)` to `g.w(760, 2)`.
- `_percent`, line 1320: `sx = round(S * 0.8)` to `round(S * 0.58)` and `rw = round(0.36 * W)` to `round(0.38 * W)`.
Pete should tune further; the Condensed Bold `&` is better but still tight. Check that `_perthousand` (line 1571) follows, since it reuses the percent geometry.

**4. FIX: heading spacing is loose at 40 to 64 px in Bold.** The lead's observation is correct. Measured from the font: Bold word gap (side bearings plus space) is 0.43 to 0.44 em after `n`, `h`, `i`, `e`; the letter gap `nn` is 0.17 em; the Bold stem is 0.16 em. Regular is 0.38 to 0.39 em and Light 0.35 to 0.36 em. A word gap near 0.3 em is normal for a heading. Visible in `proofs/r1/heading-spacing.png` rows 2 and 4.
Smallest fix, no redraw: in the generator, set the Bold space advance from 280 to 240 (line 922: `_space` returns `round((260 + (g.S - REG_S) * 0.3) * ...)`; use a weight-specific value for Bold). And in `vault-form.css` and the README heading recipe, add `letter-spacing: -0.01em` for Bold at 40 px and up. I tried `word-spacing: -0.12em` first and it fused "Networthin3D", so do not go further than about -0.05em total. With `-0.01em` and `-0.05em` (row 3 of the proof image) the heading is tighter without colliding. This is a setting plus one number, so it is blocking only because every heading inherits it; the app can apply the CSS today.

## Other FIXes (can wait for 1.001)

**5. FIX: `ß` has a floating lower bowl.** `proofs/r1/zoom-e-reg-light.png`, third glyph: the lower bowl begins 0.42 W from the stem, leaving an open gap, and the stem top sits 20 units below the top bar so the left corner steps. It reads as `I` plus `3`. Fix in `_germandbls` (line 1619): run the lower bowl's bottom bar back to the stem (replace the `0.42 * W` difference box with `S`), and make the stem `octa(0, 0, S, A, (0, 0, 0, g.big(W, A)))` instead of `box(0, 0, S, A - 20)`.

**6. FIX: `ð` has a loose slash.** Bold, Regular and Light (`risk-bold.png`, `risk-all-weights.png`): the crossbar is a 45 degree diagonal flag that overshoots the ascender by `0.3 S` and the stem's cut top corner (`0.7 S` chamfer) leaves a second fragment. Fix in `_eth` (lines 1638 to 1640): drop the top-left chamfer on the stem and replace `diag(...)` with a short horizontal bar, `box(W - S * 1.5, yc - round(H * 0.4), W + S * 0.3, yc + round(H * 0.4))`.

**7. FIX: `œ` and `Œ` joins leave a V notch at the baseline.** `proofs/r1/risk-bold.png` (œ) and `risk-all-weights.png` (Œ in all four rows): the `o`'s bottom-right big chamfer meets the `e` stem and cuts a triangle out of the join. `Æ` and `æ` are acceptable: the shared stem works, the apex merging into the top bar reads as `Æ`. Fix in `_oe` and `_OE` (lines 1604 to 1616): union the chamfer triangle back (a `Polygon` of side `g.big(Wo, ...)` at the join) or draw the ligature's `o` with the bottom-right chamfer set to 0.

**8. FIX: missing glyphs that the README implies.** The README says Latin-1 is covered. Missing from the cmap: U+00AD soft hyphen, U+00A4 `¤`, U+00B2 `²`, U+00B3 `³`, U+00B9 `¹`, U+00BC to U+00BE `¼ ½ ¾`. Soft hyphen is the one that matters: a break in a headed word would fall back to another font's hyphen. Alias it to `hyphen` (zero advance is not needed for web). Either add the rest or correct the README to "Latin-1 minus ¤ ² ³ ¹ ¼ ½ ¾".

**9. FIX (low): `¶` in Condensed Bold is a solid block** (`grid-condensed-bold.png`, row 7, last cell). Bold shows a proper pilcrow. Counter closes at the same condensed weight rule as FIX 3; thin the stems for this glyph.

## NITs

10. NIT: en dash (500) and em dash (1000) have zero side bearings (advance equals ink width in all weights), so "10–20" and "word" joined to "word" by it touch their neighbours. Add about 40 units each side. The em dash glyph stays in the font; house rule only bans it in copy.
11. NIT: Hatch is not "invisible below 48 px". Measured on `VAULT HOME`, Hatch against Bold, lower 42 percent of the cap zone: mean ink loss 0.19 at 16 px, 0.20 at 24 px, 0.21 at 32 px, 0.20 at 48 px; pixel stdev 0.18 at 24 px, 0.24 at 32 px, 0.28 at 40 px, 0.32 at 64 px (`proofs/r1/hatch-1x-zoom2.png`). At 24 px the lower half is visibly greyer but the word still reads as Bold, so brief 5.2's "still reads as plain Bold" holds and "invisible" does not. It cannot be size-dependent in a static font. Change the usage rule to "Hatch from 32 px up, hero and one headline per screen" and restate 5.2. 5.4 passes: the hatch is 45 degrees at about 40 units pitch, against 4 px horizontal Night scanlines and a 20 px square Daylight grid; no moiré seen in `hatch-night-1100.png` or `specimen-390-daylight.png`.
12. NIT: horizontals are 80 percent of verticals in Bold (128 against 160 units; Regular 87, Light 90). Brief 2.4 asked for about 90. The weight looks even, so I accept it, but note it as a departure.
13. NIT: stem ratio is 1 : 1.57 : 2.67 (60 / 94 / 160), against 1 : 1.5 : 2.4 in the brief. Bold is a little heavier than asked, which suits headings.
14. NIT: `vault-form.css` fallback stacks `--font-vf-display` and `--font-vf-hatch` name Syne. Once Syne is retired that is an outside Google host the build still tries to reach. Drop Syne from the stacks at rollout.
15. NIT: Bold accents peak at 931 units (`Ã`), 19 inside the 950 ascent, so nothing clips at the default 1.2 line height (7.4 PASS). With a heading `line-height` of 1.1 they will overflow the line box by about 2 px at 64 px; no clipping unless the container has `overflow: hidden`. Rollout note for Pete S, not a font change.
16. NIT: comms. Gmail and Outlook ignore `@font-face`, and the auth templates already fall back from Syne to Helvetica. "Replace all headings in comms" will only land in web pages, PDFs, decks and images. Email headlines need an image or an accepted fallback. Owner should know before rollout.

## PASS

17. PASS 2.2: all 8 styles have 0 curve operations; OTF and TTF glyph bounds and advances match on every glyph (0 differences in 8 styles).
18. PASS 2.3 and 3.1: squint test at 24 px, "HAMBURGEFONTSIV" in Bold and Condensed Bold has no dark or pale letter (`heading-spacing.png`, 24 px rows). `I`, `l`, `1` are distinct; `0` is slashed and `O` is plain; `rn` has a 115 unit gap in Bold against a 294 unit `m` counter, so they separate at 14 px (`readability-1100.png`).
19. PASS 3.3: x-height 530 units (brief floor 520). Cap 700. Ratio 0.757.
20. PASS 3.5: tagline at 18 px with 358 px available: Regular 369 px (two lines, as briefed), Condensed Regular 287 px, Condensed Bold 351 px (both one line).
21. PASS 3.6 and 3.4: Light on Night in teal and gold at 20 px holds; caps labels at 11 px with 0.06 em stay legible (`readability-1100.png`, `small-night.png`).
22. PASS 4.1 to 4.4: weight classes 300/400/700, width classes 5 and 3, Regular and Bold linked in each width (`macStyle` and `fsSelection` correct), no faux bold. Stems: `I` is 60, 94, 160 units wide, and Condensed Bold is 160, the same as Bold, so condensed is redrawn, not squashed.
23. PASS 6.1: all digits share one advance (Bold 850, Regular 704, Light 631, Condensed Bold 633); `£1,234.56`, `£9,999.99`, `£1,111.11` all place the decimal point at 221.8 px at 48 px Bold. `tnum` and `pnum` features present. Deviation from 2.5: figures and `£` before figures are unkerned (0 for every pair) by design, which is the correct trade for money columns. I accept it.
24. PASS 6.3: minus 698 units against hyphen 340 in Bold (2.05x), so "−£300" reads as debt.
25. PASS 2.5: kerning present and sensible for `LT -120`, `AV -65`, `TA -105`, `LY -125`, `To -95`, `P. -130`, `T. -130`.
26. PASS 7.1 to 7.3: 8 styles in OTF, TTF and WOFF2, CSS and specimen present, OFL.txt with Reserved Font Name "Vault-form", `fsType` 0, no external URLs in the CSS or specimen. WOFF2 files are 15 to 16 kB (Hatch 32 to 35 kB).
27. PASS 8.1: specimen has no sideways scroll at 320, 390 and 1100 px (`scrollWidth` equals `clientWidth` at each; `specimen-320.png`).
28. PASS 7.4: ascent 950, descent 250 give a 1.2 line box with the cap height centred.

## Not done in this round

- 1.4 (overlay against GEAR8, Prototype, Elons) and 8.4 (three outsiders pick the specimen from four generic fonts) need people, as Pete said.
- 8.3 in-app mock of Overview: `specimen.html` has a mock, but no build uses the face yet. Redo after the FIXes land, with the hero number, stat strip and one tab row, at 390 and 1100 px in Night and Daylight.
- Light and Regular `&`, `ß`, `ð` follow the same fixes as Bold.

## Asked of Pete T for round 2

Fixes 1, 2, 3 (Bold and Condensed Bold), 4 (space advance and the CSS letter-spacing note); then 5 to 9 if time allows. Return Bold and Condensed Bold proofs of: `e c æ œ ? ¿ & % ß ð Œ` at 150 px, "Savings & goals: 38%?" at 64, 40 and 24 px, and one 1100 px heading next to Syne.
