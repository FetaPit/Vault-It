# Creative rubric

The creative director scores every visual change against this list before rollout QC and the commit. A pass needs:
- no hard fail
- a weighted total of **4.0 or more**
- no criterion under 3

## 1. Hard fails (any one means REVISE)

- A colour, font or radius outside `brand/vault-it-tokens.css`. The only fonts are Syne, DM Sans and Share Tech Mono.
- A brand mark or icon missing where the system has one: a plain text heading on a card where the sprite has an icon, an emoji used as an icon, or a placeholder.
- A static, blurry or scaled-down raster of the product on a marketing page, where a live scene or crisp component would work.
- Clipped, overlapping or cut-off content, for example a badge cropped by its container or text running under a fixed bar.
- Sideways scroll at 320 px or wider.
- Night or Daylight unreadable, or text under WCAG AA contrast.
- A blank space when WebGL is off. A still picture with the same figures must show.
- "Not regulated by the FCA. Not financial advice." missing where it was.
- An invented figure, testimonial, scarcity line or reference price. An em dash in user-facing copy.
- Motion that ignores `prefers-reduced-motion`.

## 2. Criteria

| # | Criterion | Weight | 5 looks like | 3 looks like | 1 looks like |
|---|---|---|---|---|---|
| 1 | Brand fidelity | 20% | Unmistakably Vault-It with the logo hidden: blueprint HUD, hairline neon, mono labels, icons from the sprite, colour code used for meaning | On brand but plain in places; some cards could be any app | Generic SaaS, off-token colours, missing icons |
| 2 | Hierarchy and focus | 15% | One hero and one number per screen; the five-second read is instant on a 390 px phone | The hero is clear but competes with equal-weight blocks | Walls of equal cards; unclear what to look at |
| 3 | Show, don't screenshot | 15% | The visitor touches the product: types a figure, watches bricks or columns respond, sharp at every pixel ratio | Live elements exist, but static images still carry key moments | Static, low-resolution screenshots doing the selling |
| 4 | Path to act | 15% | Sign-up (or the next action in the app) within one thumb scroll at every point; each proof moment ends in a clear CTA; one field | A CTA top and bottom, with long stretches between | The action is hard to find or buried under text |
| 5 | Craft | 15% | 8 px rhythm, consistent radii, aligned edges, 44 px tap targets, crisp at 1x and 2x | Small spacing or alignment slips | Misalignment, cramped or broken layouts |
| 6 | Voice and honesty | 10% | Reads like `VOICE.md`: short, concrete, plain; every number sourced | Correct but wordy or vague in places | Hype, vague claims, jargon, made-up numbers |
| 7 | Motion and delight | 10% | Each action answers within 250 ms (something moves, a number changes, a line confirms); calm, one delight per action | Motion is present but decorative or slow | None where it is needed, or noisy and distracting |

Weighted total = sum of score × weight. Example: 4, 4, 5, 4, 4, 4, 3 gives 4.05, a pass.

## 3. Generic-AI check (look for these first)

These are the patterns that make a page look templated. Each one found costs a point on criterion 1 or 2.

- Hero, then three equal feature cards, then FAQ, then footer: the default template.
- Feature lists as title plus paragraph in identical boxes, with no icon, figure or visual.
- Every section built the same way, so nothing has rhythm.
- Soft gradient blobs, glassy cards and glows used as decoration rather than meaning.
- Vague words: powerful, seamless, effortless, revolutionise, unlock, supercharge.
- Centred text everywhere; long grey paragraphs.
- Screenshots of the app inside fake device frames instead of the real, live component.

## 4. Surfaces

- **Marketing site** (`landing.html`, `site/`): all criteria. Pages are short, one idea per screen, and the sign-up is never more than one thumb scroll away.
- **App UI** (`index.html`, `src/hb3d/`): all criteria. For criterion 4, read "path to act" as "the next action is obvious". The ECD brief's five rules apply.
- **Emails** (`supabase/functions/*` templates): criteria 1, 2, 4, 5 and 6. Night palette, the wordmark with the brick hyphen, and the FCA line in the footer.
- **Social and Canva assets:** criteria 1, 2, 3, 6 and 7. One idea per asset, readable at thumbnail size, and real figures only.
