# Brief: Vault-It brand typeface (working name Brickform)

Owner, in their words: "Create me a unique custom font for Vault-It's brand so users do not think the app is stock AI Vibe coded slop." Also: "future focussed with a cyberpunk subtle infuence with background hatching", "Need to balance style with easy to read", "3 font family weights with Condensed and regular options", "Create a openfont file so it can be installed and used in any software".
Pedro with Pete T (head designer). Judged by specimen shots at 390 and 1100 px, Night and Daylight, and by 100% zoom proofs.

## Decisions made for the owner
- **Hatching.** The owner wrote "like screenshot 1", but image 1 (GEAR8) has no hatching. The diagonal hatch panels are in image 3 (Elons). Default: hatching means image 3, and it lives in a separate display cut only. Image 1 gives the wide squared proportions, image 2 (Prototype) gives the readability target.
- **Name.** "Vaultform" sits too close to Vault-It and the wordmark rule (-It teal, Vault text colour). Proposed: **Brickform** (fits "every pound saved lays a brick"). Fallback Vaultform. Owner or PT Live Design to run a name search before release.

## 1. Concept
1.1 One idea: a squared techno sans built from straight edges and chamfered corners, like a brick or a vault door. Done = a stranger says "techno, finance, solid" within 5 seconds of the specimen.
1.2 Signature: asymmetric chamfers (large top-right and bottom-left, small top-left and bottom-right), a forward "/" lean without italics. Judged: the lean is visible in "Get out of the red" at 48 px and does not tip into costume at 16 px.
1.3 Cyberpunk is a hairline, not a floodlight (ECD rule 5). Done = no glitch cuts, no spurs, no stencil gaps in the body cuts; the only decoration is the chamfer and the Hatch cut.
1.4 Must not read as GEAR8, Prototype or Elons. Done = overlay at 72 px shows different letter shapes in at least 10 of 26 capitals. No outlines traced from the references.

## 2. Letterforms
2.1 Every glyph is drawn individually, not a stretched or offset copy of another. Done = a proof of the 26 capitals and 26 lower-case shows no two glyphs sharing a failed spacing or weight fix.
2.2 Straight edges only, 45 degree chamfers, no curves. Done = OTF (CFF) and TTF outlines identical; I check by overlaying both exports.
2.3 Optical weight even across the alphabet: "HAMBURGEFONTSIV" at 24 px in Bold has no dark or pale letters (squint test).
2.4 Stroke contrast low, horizontals about 90% of verticals so squared forms do not look heavy. Judged at 14 px Regular.
2.5 Spacing and kerning set by hand for the pairs LT, AV, TA, 7, 1, rn/m, and "£" before figures. Done = no word in the tagline needs a manual fix.

## 3. Readability
3.1 Il1, O0 and the pair rn/m tell apart at 14 px in Regular and Bold Condensed. I (capital) has serif-free slab-less form with a distinct tail on l; 0 carries a slashed or notched mark, O does not.
3.2 Counters of a e s g 8 3 stay open in Bold Condensed at 12 px and do not close at the 10.5 px floor.
3.3 x-height at least 0.52 em, so small sizes stay legible next to DM Sans.
3.4 Lower case is the default for words. All-caps labels are tested at 11 px with +0.06 em tracking and must still pass 3.1.
3.5 Tagline "Get out of the red and into your home." set at 390 px wide: fits on two lines in Regular, one line in Condensed at 18 px.
3.6 Contrast and weight judged on near-black #080808 (Night) and paper (Daylight) with teal #44C0B9, deep teal #007F7B and gold #E8C56A text. Light must hold at 20 px on both grounds.

## 4. Weights and widths
4.1 Six static styles: Light 300, Regular 400, Bold 700, each in Regular width and Condensed (about 78% width). Done = all six install and list correctly in macOS, Windows and Figma.
4.2 Stem ratio Light : Regular : Bold about 1 : 1.5 : 2.4. Done = Light and Regular are clearly different at 24 px, Regular and Bold at 16 px.
4.3 Condensed is a redrawn cut, not a squashed one. Done = stem thickness matches Regular at the same weight (check "H" and "m").
4.4 Style linking: Regular and Bold link to Regular and Bold in each width so CSS bold works with no faux bold.

## 5. Hatch cut (display only)
5.1 Two files: Bold Hatch and Bold Condensed Hatch. Body cuts never carry hatching.
5.2 Diagonal hatch lines cut into the lower part of each letter inside a solid outline, angle matching the chamfer (45 degrees), as in image 3 but quieter. Done = hatch is invisible below 48 px by design and clearly visible from 48 px up; at 24 px the letter still reads as plain Bold.
5.3 Hatch is cut out of the letter (negative space), so it takes whatever colour or background it sits on. No colour baked in.
5.4 Hatch must not clash with the Night scanlines or the Daylight blueprint grid: it runs at a different angle and pitch from both. Judged on a shot of each ground.
5.5 Used for the hero number, one headline per screen and the tagline on decks. Never in tables, buttons or labels.

## 6. Figures and symbols
6.1 Tabular lining figures by default, plus proportional figures as an OpenType feature. Done = a column of "£1,234.56 / £9,999.99 / £0.00" aligns to the pixel.
6.2 Full ASCII, £ and €, curly quotes, ellipsis, bullet, minus sign, and Western European accents (for names). Done = a coverage proof with no notdef boxes.
6.3 Money glyphs are the most careful in the set: £ has a clear bar, 1 7 4 differ at 12 px, and the minus is longer than the hyphen so "-£300" reads as debt.
6.4 No em dash in the specimen copy (house rule); the font still includes the glyph.

## 7. Files and naming
7.1 OTF, TTF and WOFF2 for all six styles plus the two Hatch files, a CSS @font-face file and a specimen page.
7.2 Licence: SIL Open Font Licence 1.1 with the name reserved, included as OFL.txt. Done = "open font file" means installable in any software with no fee.
7.3 Self-hosted in the repo, no outside host or font CDN. Fallback stack in CSS for each use.
7.4 Metrics set so line height 1.2 does not clip accents in Bold Condensed. Done = no clipping at 12 and 48 px.

## 8. Review checks
8.1 Specimen at 390 and 1100 px in Night and Daylight, nothing scrolls sideways at 320 px.
8.2 Proofs at 10.5, 12, 14, 16, 24, 48 and 96 px for every style.
8.3 In-app mock of Overview (net worth hero, stat strip) and one tab label row before any rollout.
8.4 Honest check against "stock AI slop": three people not on the project pick out the Vault-It specimen from a set of four generic techno fonts.
8.5 PASS, FIX or NIT per line; no line passes without a screenshot or a measured number.

## Standing-rule clashes and where it goes
- **Fonts rule.** CLAUDE.md and the ECD brief say "Syne, DM Sans, Share Tech Mono only". Adopting this face needs the owner's word and an edit to both files; I will not let a build use it before then.
- **Use for:** display headings, the net worth hero, stat-strip figures, tab labels at 12 px and up, decks and comms headlines.
- **Do not use for:** long body copy, the FCA disclaimer line, form inputs, tables of dense text. DM Sans stays for body.
- **Replaces:** Syne first. Share Tech Mono stays for tiny labels until 3.1 and 3.4 pass at 10.5 px.
- **Logo.** The wordmark and brick hyphen stay as artwork. The font is not used to redraw the logo.
- **Hosts.** Self-hosted only, so the "no new outside hosts" rule holds.

## Question for the owner (one batch)
(a) Hatch: confirm you mean the image 3 diagonal panels, as a display-only cut, not background texture behind the letters. (b) Name: Brickform, or keep Vaultform? (c) May this face replace Syne for display and numbers, with DM Sans kept for body copy?
