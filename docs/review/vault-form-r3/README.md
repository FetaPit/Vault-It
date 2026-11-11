# Vault-form review, round 3: display cuts in place

Reviewer: Pedro. Scope: Vault-form Heading (D+) and Hero (D++) as shipped in `brand/fonts/vault-form/` and as drawn on the landing and pitch pages in the working tree. I did not edit fonts or site code. Evidence: the lead's set in `shots/qc/vault-form-site-r6/` (`contact.png`, `pitch-present-cover_night_1920.png`, `pitch-present-evidence_night_1920.png`), Pete T's `scratchpad/proofs/r5/` (`dplusplus.png`, `closeup-dplusplus.png`), and my own landing hero crops in `shots/review/vault-form-r3/` (`hero_{dark,light}_{1100_x1,1100_x2,390_x2,1440_x1,820_x1}.png`). Numbers come from Playwright on `file:///home/user/Vault-It/landing.html` and from byte counts of the working-tree files.

## Verdict

**Heading (D+) and Hero (D++) as typefaces: PASS to ship, with one honest reservation.** Legible at the sizes they are licensed for, calm enough (ink hatch, no glow), and the extrusion plus bracket plus vent is the first thing in this project that is not a stock squared techno sans. **The website wiring: three FIXes before the owner sees it as done**, and the lead's size proposal should be rejected in part.

## Blocking FIXes

### FIX 1. Landing HTML is 3.9 times heavier and the page ignores its own cache rules
Evidence (byte counts): `landing.html` was 56,767 bytes at HEAD with no embedded fonts. Now 219,685 bytes, of which 162,016 are base64 fonts: Heading 119,160, plain Regular 21,532, plain Bold 21,324. The pitch page is 384,889 bytes (Heading 119,160 plus Hero 128,864 plus plain 42,856). The worker sends `landing.html` as `no-cache` (`worker/index.mjs:84`), so every visit re-sends the lot, and base64 of woff2 barely gzips. At 1.6 Mbps that is about 0.8 s extra before the first stylesheet finishes (calculated, not measured). The same files as woff2 are 89,368 (Heading) and 96,648 (Hero), cacheable.
Smallest fix: agree with the lead on cached files, with four conditions.
1. Serve display cuts only (Heading, Hero) from `/fonts/`, content-hashed names, `Cache-Control: public, max-age=31536000, immutable`. The 7-day, unhashed rule just added to `worker/index.mjs:79-83` leaves a stale font for a week after any glyph change.
2. Keep plain Regular and Bold embedded (43 KB base64): body and phone headings then never meet a fallback. In `tools/embed_vault_form.js` empty `CUTS` for `landing.html` and `site/pitch-eligent/index.html` and write a `@font-face` with a `url()` instead.
3. `font-display: optional` on the two display faces, plus `<link rel="preload" as="font" type="font/woff2" crossorigin>` for Heading on the landing and Hero on the pitch. Reason: Heading is 11 percent wider than Bold (measured at 68 px: "Get out of the Red" 879 px against 791, "and into your home." 978 against 890; "Net worth in 3D" at 44 px 487 against 439). A swap would reflow the hero by up to 88 px and can re-break lines (layout shift). With `optional`, a slow first visit shows plain Bold and the next visit shows the cut.
4. `tests/test_vault_form_site.js` should check the file hash in the link, not only the embedded bytes.

### FIX 2. Reject raising the landing hero to about 104 px
Evidence: at 68 px the two lines are already 879 and 978 px wide in a 1040 px container (`landing.html:117`, `.hero h1`). At 104 px "Get out of the Red" alone is 879 x 104/68 = about 1344 px, so the headline wraps to at least three lines (about 3 x 104 = 312 px against 136 px now). The 3D stage starts at y 447 in `landing-fold_night_1100.png`; it would start near y 625, so at a 900 px viewport the house loses about 40 percent of its visible height, and on a 768 px laptop it is mostly below the fold. ECD rule 1: the 3D scene is the hero of the screen, the headline is not. D++ belongs on the pitch cover and brand posters, where type is the hero. On the landing keep D+ at 68 (up to 72 if wanted), no D++.
Smallest fix: leave `.hero h1` at `clamp(38px,7.2vw,68px)`. Do not add the Hero face to `landing.html`.

### FIX 3. Pitch slide 9 reflow from the wider cut
Evidence: `pitch-present-evidence_night_1920.png`. At 72 px Heading the title "£50 a month more. Keys a year sooner." now breaks leaving "sooner." alone on line two (a widow), and pushes the two columns down. The lead already pulled four slides back to plain for this reason; this one still ships a widow.
Smallest fix: `text-wrap: balance` on the pitch `h2`s that use the cut, or `max-width: 17ch` on this one.

## Font question for round 4 (does not block shipping; blocks calling it done)

### FIX 4. The owner's 11 Nov words are answered unevenly: "depth ... to other letters like N, V, W, M"
Evidence: `closeup-dplusplus.png` (400 px) and the cover at 160 px. Round and chamfered letters (G, e, a, o, 4, y, 0, £) get engraved panels in their counters, a seam and a vent, so they read as machined. The diagonal letters (N, V, W, M, A, K, X, Y) get only the down-right hatch edge and a few hairline slivers inside the strokes. In the cover's "Vault-It" the bare V sits next to the heavily detailed "a" and "u", and the density jumps from letter to letter. The W's slivers read as scratches, not as a system, at 400 px.
Smallest fix: give the open triangular counters of V, W, M, N, A, K, X, Y the same hatch panel the e and G counters carry (one wedge panel per counter, 0.5 stem inset), and either delete the W sliver lines or make them the same 45 degree seam used elsewhere. Add a V W M N line to the specimen at 160 px to check.

## Answers to your five questions

**1. Brief and owner's words: PASS with a reservation.** Cyberpunk and readable: yes. The coherent pieces are chamfer asymmetry, one seam, hatched extrusion down-right, panels in counters, a vent and a HUD bracket. That is one language (engraved panel, cut line, shade face), not noise, and it stays ink-weight, not neon. Strongest glyphs: G, e, a, 4, y, 0 slash, £, and the plain u and l (the cover's "ul" is the best-looking pair). Weakest: W and V (above), N and 4 where the HUD bracket floats as a crop mark and the vent reads like a colon stuck in the stem (cover "l", "I", "t" at 160 px: a vent beside an I or l is the one real I/l/colon confusion risk; the l's foot saves it). Costume risk is the bracket, not the hatch; I would let the bracket appear on at most one letter per line. The reservation: the signature (hatch, vent, panels) exists only at 48 px and up. At 390 px the owner's customers see plain Bold at 38 px (`hero_dark_390_x2.png`), a clean but generic wide squared techno sans. The distinctive face is the one most visitors never see. Not a defect of the cut; it is what "plain on phones" costs (see decision A).

**2. Legibility in place: PASS.** D+ at 68 px, 1100 wide, Night and Daylight (`hero_*_1100_x1.png`, `x2`): the glyph body is intact and the counters stay open; the hatch reads as grey texture at 1x, which is correct. Also fine at 59 px (820 wide). Worth it: yes, it is the only place the brand shows. Thresholds: Heading 48 px PASS (counters stay open, the body is plain Bold-weight), Hero 96 px PASS. Section headings at 44 px correctly stay plain.

**3. Brand fit: PASS, one NIT.** Rule 5: the hatch is ink, no glow, so it is a hairline. NIT: the existing `homepulse` (`landing.html:205`, 26 px and 60 px teal shadow at 0.75 alpha, the owner's own 30 Oct pulse) smears the hatch on "into your home." at its peak in Night (`hero_dark_1100_x2.png`): a floodlight on the finest detail. Optional: cut the shadow to 12 px or colour-only. D++ does not fight the tagline rules, because the pitch cover sets the tagline in plain Bold with red, your, home fills; and it does not fight the house, because it is not on the landing (FIX 2). Separate NIT: the landing hero still says "Red" (capital) with teal "into your home.", not the 4 Nov red / your / home treatment; the pitch has it right. Owner decision B.

**4. The lead's proposal.**
- Phones plain Bold: agree (cut would be under 48 px, and at DPR 2 the hatch is sub-pixel noise).
- Desktop section headings 44 to 52 px: change to 48 px. 48 is the floor and the smallest step; "Net worth in 3D" becomes about 531 px wide in Heading against 439 plain at 44, fine in a 1040 container. 52 buys nothing and pushes the sub-copy down.
- Desktop hero to about 104 px: reject (FIX 2).
- Cached files rather than embedding: agree, with conditions (FIX 1). First-visit weight is about equal (Heading 89 KB woff2 against 119 KB base64); every later visit saves about 160 KB; layout shift is avoided only with `optional` plus preload.

**5. Owner decisions.**
- A. Phones: accept plain Bold, or commission a light cut ("D lite": seam and chamfer step only, no hatch) for 24 to 47 px, so phones still see something of the face. My view: worth one more round, after FIX 4.
- B. Landing hero wording and colour: keep "Red" capital with teal, or move to the 4 Nov red / your / home treatment.
- C. Keep or soften the hero pulse glow (above).
- D. Pitch cover sets the wordmark "Vault-It" as live text in D++ at 160 px; the font README says not to reset the logo in this face and the logo hyphen is the brick. Accept as a title, or use the logo artwork.

## NITs (cosmetic, can wait)

- Pitch cover changes letterforms between present mode (Hero, 160 px, vent and bracket) and page view (Heading, 89 px, none). Acceptable, but tell the owner.
- Bracket placement near the previous letter: about 25 px clear at 160 px, fine; check at 96 px.
- The round-2 NITs (ß against B, `t w` word gap, Condensed `&`) still stand.
- Still not done: overlay against Orbitron and Michroma (the nearest stock faces) to prove the "not slop" claim by measurement; I could only judge by eye.
