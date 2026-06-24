# Vault·It — Claude Design Brief v2
## Dynamic 3D Demos · Isometric Asset Vault · Dream Home Builder

**Owner:** Pete Thickett (FetaPit)
**Prepared:** 24 June 2026
**Scope:** `landing.html` — marketing one-pager redesign
**Model:** Feed this file directly to Claude Design as the system prompt / brief

---

## LIVE REFERENCES — read these before designing anything

| Resource | URL |
|---|---|
| **Current landing page (target file)** | https://fetapit.github.io/Vault-It/landing.html |
| **Populated demo (all tabs seeded)** | https://fetapit.github.io/Vault-It/example/ |
| **Main app** | https://fetapit.github.io/Vault-It/ |
| **Repo** | https://github.com/fetapit/vault-it |

> Study the current landing page first. The Three.js ambient scene, teal/gold palette, and
> clip-path polygon aesthetic are the baseline. This brief extends — not replaces — that
> foundation.

---

## BRAND TOKENS — hard constraints, never change these

```css
/* Colours */
--bg:  #080808;   /* page background */
--c1:  #0f0f0f;   /* card surface */
--em:  #44c0b9;   /* teal — primary accent */
--go:  #c9a84c;   /* gold — premium / pioneer */
--go2: #e8c56a;   /* gold highlight */
--gr:  #3ecf8e;   /* green — positive / growth */
--re:  #e05c5c;   /* red — debt */
--or:  #e0894a;   /* orange — warning */
--tx:  #e8e8e8;   /* primary text */
--t2:  #9aa0a6;   /* secondary text */
--t3:  #5a6068;   /* muted text */

/* Fonts */
Syne            → headings, labels, nav
Share Tech Mono → numbers, codes, data values
DM Sans         → body copy, descriptions

/* Geometry */
clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))
/* Use on cards, buttons, badges — the signature "cut-corner" shape */
```

---

## NORTH STAR

> Replace abstract marketing claims with **interactive product truth**.
> A visitor should experience the product — not read about it.

Two hero moments to build the page around:

1. **The Dream Home Builder** — an animated isometric house that visibly builds as savings grow
2. **The Asset Vault** — a 3D isometric "vault floor" where every asset class occupies its own
   object in navigable 3D space

Both already exist as live SVG/JS engines inside the app. The design task is to surface them
in the landing page as standalone interactive demos — no sign-up required.

---

## SECTION 1 — Hero (replace / augment current Three.js scene)

### What to build
A split hero: **left** = headline + CTA | **right** = live Dream Home Builder demo running in an
`<iframe src="https://fetapit.github.io/Vault-It/example/#house">` or as an inline SVG
animation lifted from the app's isometric engine.

### Dream Home Builder — how it works (for the designer)
The app uses a custom isometric SVG engine (`drawTerraced`, `drawSemi`, `drawDetached`, etc.)
that renders a 3D house in a `700×500` SVG viewport. Progress `p` runs 0→1:

```
p = 0.00  →  Empty plot, dashed boundary, "YOUR PLOT" label
p = 0.10  →  Foundation slab poured
p = 0.40  →  Brick walls rising (wireframe ghost shows the full target)
p = 0.80  →  Roof on, windows in, lights glowing
p = 1.00  →  House complete, garden extras, scaffolding gone
```

**For the landing page:** auto-animate `p` from 0 → 1 over ~6 seconds on page load, then loop
with a pause at 1.0. Add a scrubber below so visitors can drag to any build stage themselves.
This is the most visceral demonstration of the product's core metaphor.

### Copy
```
Headline:   "Build your home, pound by pound."
Subhead:    "Every deposit lays a brick. Watch your future home take shape — for real."
CTA 1:      "Start building free →"   →  https://fetapit.github.io/Vault-It/
CTA 2:      "See full demo →"         →  https://fetapit.github.io/Vault-It/example/
```

---

## SECTION 2 — The Asset Vault (new section, between hero and features)

### Concept
A navigable isometric "vault floor" — think a dark warehouse lit by teal light — where each
asset class is a **physical 3D object** rendered in SVG isometric projection:

| Asset class | Object in 3D space | Colour accent |
|---|---|---|
| Cash / savings | Stack of gold coins / safe | `--go` gold |
| Stocks & ISA | Rising bar chart pillar | `--gr` green |
| Crypto | Floating hexagonal token | `#f7931a` bitcoin orange |
| Metals | Gold bar ingots | `--go2` gold highlight |
| Property deposit | Blueprint / plot marker | `--em` teal |
| Liabilities | Red weight / anchor | `--re` red |

### Interaction
- **Mouse drag / touch drag** orbits the camera (rotates `viewAngle` in the ISO engine)
- **Scroll wheel / pinch** zooms (scales the viewport)
- Objects are scaled proportionally to Alex Morgan's demo values (larger object = larger value)
- Hovering / tapping an object shows a tooltip: asset name + value + % of portfolio
- A "Total Net Worth" counter at the top updates as objects animate in on load

### Technical approach
Reuse the app's existing ISO coordinate helpers (`_iso`, `_face`, `_line`, `_txt`,
`_grid`) — they are self-contained functions. Extract them into a standalone `<script>` block
on the landing page and render to a dedicated `<svg id="vaultSvg">`. No build step needed.

The Alex Morgan demo values to visualise:
```javascript
const VAULT_ASSETS = [
  { label: 'S&S ISA',       value: 32400, class: 'stocks',   color: '#3ecf8e' },
  { label: 'Cash Savings',  value: 14800, class: 'cash',     color: '#c9a84c' },
  { label: 'LISA',          value: 8200,  class: 'cash',     color: '#c9a84c' },
  { label: 'ETH + BTC',     value: 4200,  class: 'crypto',   color: '#f7931a' },
  { label: 'Gold (2.5 oz)', value: 5400,  class: 'metals',   color: '#e8c56a' },
  { label: 'House Deposit', value: 22500, class: 'property', color: '#44c0b9' },
  { label: 'Student Loan',  value:-24300, class: 'debt',     color: '#e05c5c' },
  { label: 'Credit Card',   value: -1850, class: 'debt',     color: '#e05c5c' },
];
```

### Copy
```
Section label:  "YOUR ASSET VAULT"
Headline:       "Every pound you own, visible in one space."
Subhead:        "Vault·It digitises your entire financial life — savings, stocks, crypto,
                 metals, property — rendered in 3D so you can see the full picture at once."
```

---

## SECTION 3 — Stocks, Savings & Assets in 3D (detail)

### "Digitise your assets" feature spotlight
Below the vault floor, show three individual 3D close-ups as a scroll-snapping carousel:

**Card 1 — Stocks & Shares ISA**
- Isometric bar chart pillar, green, growing upward
- Annotation lines showing: current value, annual growth rate, ISA allowance remaining
- Sub-copy: "Track every account in one place. ISA, SIPP, GIA — all synced."

**Card 2 — Cash & Savings**
- Isometric coin stack / safe, gold
- Show Marcus Savings + Monzo Current as two stacked objects, taller = bigger balance
- Sub-copy: "See exactly how your cash is working — interest rates, balances, target splits."

**Card 3 — Crypto & Metals**
- Floating hex token (ETH orange) + gold bar ingot side by side
- Orbiting slowly — shows the 3D rotation is interactive
- Sub-copy: "Gold, silver, BTC, ETH — Vault·It prices them live and keeps them alongside
  your traditional savings."

### Viewport controls UI (show in all three cards)
```
[ + zoom ]  [ − zoom ]  [ ✥ orbit ]  [ ↺ reset ]
```
These are the real HUD buttons already in the app — screenshot or SVG them into the cards
so visitors understand the viewport is interactive before they touch it.

---

## SECTION 4 — "How it works" visual stepper

Three steps, each with a product screenshot from the demo:

```
Step 1 — TRACK          Step 2 — KILL DEBT       Step 3 — BUILD HOME
Add your assets,        Avalanche or snowball     Watch your deposit grow
debts and income.       method — see interest     brick by brick in
Everything in one       saved in real time.       isometric 3D. Own it.
vault.
[screenshot: Overview]  [screenshot: Debt tab]    [screenshot: House builder at 40%]
```

---

## SECTION 5 — Social proof strip

Between sections 3 and 4, insert a dark strip:

```
"33 Pioneer spots"  ·  "Built in the UK"  ·  "Your data stays on your device"
[Vault logo icon]       [Flag icon]             [Padlock icon]
```

Underneath, one testimonial with a UI snippet beside it (a milestone toast: "🧱 5% —
Foundation poured!") so the quote is tied to a real product moment.

---

## SECTION 6 — Pricing / Pioneer CTA (keep existing, polish)

The existing `#pricing` section is structurally fine. Polish:
- Replace generic card background with the vault-door SVG as a watermark (10% opacity)
- Add a live "X spots remaining" counter that calls the existing `waitlist_count()` RPC
- The "Get Pioneer Access" button must use the cut-corner clip-path

---

## INTERACTION & ANIMATION SPEC

| Element | Behaviour |
|---|---|
| House builder (hero) | Auto-animate `p` 0→1 over 6s on load, pause 2s, loop. Scrubber lets user override. |
| Asset vault (section 2) | Objects animate in on scroll-enter, one by one with 80ms stagger. Drag to orbit, scroll to zoom. |
| 3D close-up cards (section 3) | Each card orbits its object on hover (rotate ±15°). Touch drag on mobile. |
| All section reveals | `IntersectionObserver` fade-up, 400ms ease-out, 60ms stagger between children |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` — skip all animations, show static end-states |

---

## TECHNICAL CONSTRAINTS

- **Single file** — all JS/CSS inline in `landing.html`. No build step, no npm.
- **No new dependencies** — Three.js is already loaded. The ISO SVG engine functions can be
  copy-pasted from `index.html` (lines ~6290–7110). No additional libraries.
- **Performance** — `IntersectionObserver` for lazy init of 3D scenes. Only render the active
  viewport. Target < 100ms TTI delta vs current page.
- **Mobile** — all 3D scenes must be touch-responsive (pinch zoom, one-finger drag to orbit).
  Stack sections vertically on `< 768px`. The house builder scales to 100% width.
- **Accessibility** — all interactive SVG objects have `role="img"` + `aria-label`. Scrubber is
  a native `<input type="range">`. Provide a static fallback image for no-JS.

---

## FILES TO MODIFY

| File | Change |
|---|---|
| `landing.html` | Primary — all new sections added here |
| `example/index.html` | No change — use it as iframe source for live demos |
| `index.html` | No change — ISO engine functions are copied, not imported |

---

## DEFINITION OF DONE

- [ ] Hero: live Dream Home Builder animates `p` 0→1 with drag scrubber
- [ ] Asset Vault section: navigable 3D floor, drag to orbit, objects scaled to real values
- [ ] Stocks/Savings/Crypto close-up cards with hover orbit and HUD controls shown
- [ ] "How it works" stepper with real product screenshots
- [ ] Pioneer spots counter live from Supabase RPC
- [ ] All animations respect `prefers-reduced-motion`
- [ ] Mobile touch controls work on all 3D scenes
- [ ] Lighthouse performance score not regressed from current landing page
- [ ] No new external dependencies introduced
