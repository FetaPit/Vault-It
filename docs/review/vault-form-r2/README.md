# Vault-form review, round 2

Reviewer: Pedro. Re-check of Pete T's regeneration (commit `75de52e`) against `docs/review/vault-form-r1/README.md`. I did not edit the font, the generator or the specimen. Proofs: Pete's in `.../scratchpad/proofs/r2/`, mine in `.../scratchpad/proofs/r2b/` (`ecq.png`, `risk2.png`, `eszett.png`, `eszett-fix-test.png`). Numbers come from fontTools and Pillow on the shipped TTF and OTF files.

## Verdict

**Fit to replace Syne for headings: yes.** All four blocking r1 FIXes are cleared. What is left is one NIT-level ß question, one spacing NIT and housekeeping. Bold and Condensed Bold are cleared for headings from 24 px up, Light and Regular for display from 20 px up, Hatch from 32 px up. The CLAUDE.md and `brand/ECD_BRIEF.md` fonts-rule edit is still outstanding outside the font and must land before any app build uses the face.

## r1 items

| r1 | Item | Round 2 | Evidence |
| --- | --- | --- | --- |
| 1 | Spur on `e c æ œ` | PASS | `r2b/ecq.png`: clean terminals in Light, Regular, Bold, Condensed Bold. `c` also lost its top step. |
| 2 | Spur on `?`, broken `¿` | PASS | `r2b/ecq.png`: flag gone, `¿` is a clean rotation. |
| 3 | `&` and `%` counters closed in Bold | PASS | `r2b/risk2.png`, Bold row: `&` has an open lower-left counter, `%` rings are open boxes, `‰` follows. Condensed Bold `&` counters are small but open (see NIT 3). |
| 4 | Loose heading spacing | PASS, with NIT 2 | Word gap after `h`+`i`: Bold 0.44 em to 0.40 em (space 280 to 240), Regular 0.39, Light 0.38, Condensed Bold 0.34. `.vf-heading-lg` exists in the CSS (-0.01em, -0.05em). `heading-vs-syne-1100.png` and `savings-heading.png` read well at 64, 40 and 24 px. |
| 5 | `ß` floating bowl | PASS | Lower bowl now joins the stem (`eszett.png`). See NIT 1 for the lookalike question. |
| 6 | `ð` loose slash | PASS | Straight stem with a flat bar in all four weights (`risk2.png`). |
| 7 | `œ`/`Œ` V notch | PASS | Square join in all weights (`risk2.png`, `ecq.png`). |
| 8 | Missing glyphs | PASS | Soft hyphen, `¤`, `¹ ² ³`, `¼ ½ ¾` and `‰` present in all five weights checked (0 missing; 226 glyphs, was 219). |
| 9 | `¶` solid in Condensed Bold | PASS | `risk2.png`: opened to a proper pilcrow. |
| 10 | Dashes with no side bearings | PASS | En and em dash now 40 units each side in every style. |
| 11 | Hatch "invisible below 48 px" | PASS | Rule changed to 32 px up in the README and CSS. Lower-zone ink loss is lighter, 0.14 against 0.20 before (stdev 0.16 at 24 px, 0.20 at 32, 0.24 at 48, 0.30 at 96). Still visible below 32 px, still reads as Bold. |
| 12, 13 | Horizontal and stem ratios | NIT, accepted | Unchanged, by design for headings. |
| 14 | Syne in fallback stacks | PASS | No "Syne" left in `vault-form.css`, README or specimen. |
| 15 | Accent overflow at line-height 1.1 | NIT, open | Rollout note only (peak 931, ascent 950). |
| 16 | Email clients ignore webfonts | NIT, open | Owner should know before rollout. |
| 17 to 28 | Earlier PASS items | PASS, no regression | OTF and TTF bounds and advances identical, 0 curves, all digits one advance (Bold 850, Regular 704, Light 631, Condensed Bold 633), specimen `scrollWidth` equals `clientWidth` at 320, 390 and 1100 px, no external URLs. |

## New findings

1. **NIT: Bold `ß` reads close to capital `B`.** Measured on aligned 300 px renders, the shapes differ by 34 percent of their union in Bold (Regular 49, Light 57, Condensed Bold 25); `ß` is 6 percent taller and 12 percent narrower than `B`. In running text (`eszett.png`: "StrauB", "WeiB") it looks like a stray capital, but it only appears inside lowercase German names, and the context makes it recoverable. I do not call it blocking for a UK app. If German surnames matter, the smallest fix is to give `ß` more height than `B`: raise its ascender in `_germandbls` (line 1697) from 740 to about 780 units, which separates it by shape against every other glyph at the same time. I tried the obvious alternative, narrowing the upper bowl (`Wu = W - round(0.24 * W)`), and it did not help: the difference only went from 34 to 38 percent (`r2b/eszett-fix-test.png`), so do not spend time there. Height not tested.
2. **NIT: `t` then word space then `w` is tight under `.vf-heading-lg`.** Computed gap in Bold: `t w` and `r w` 0.215 em, `f w` 0.21 em, against a median word gap of 0.32 em and a letter gap of 0.16 em. "Net worth" is separated but only just (`heading-vs-syne-1100.png`, row 2). Smallest fix: add kerning of about +30 units for `t`, `r`, `f` before a space (or soften the class to `word-spacing: -0.03em`). Not blocking.
3. **NIT: Condensed Bold `&` and `%` counters** are open but small at 24 px (`savings-heading.png`, bottom row). They hold. Revisit if the 12 to 18 px tab-label use shows trouble.

## Still not done

- 1.4 overlay against GEAR8, Prototype and Elons, and 8.4 outsider test: people needed.
- 8.3 in-app mock of Overview before any rollout: do this once CLAUDE.md and the ECD brief are edited.
