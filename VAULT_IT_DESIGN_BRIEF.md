# Vault·It — Design Brief for Claude Design

**Owner:** Pete Thickett (FetaPit)
**Prepared:** 23 June 2026
**Target file:** `landing.html` (marketing site) — and supporting assets
**Live URL:** https://fetapit.github.io/Vault-It/landing.html
**Goal of this brief:** Make the website sell the product by *showing it in action* — more
real visuals of the app, the 3D house builder, and the financial journey, fewer abstract claims.

---

## 0. NORTH STAR FOR THIS PASS

> A first-time visitor should understand what Vault·It *does* within 5 seconds of scrolling —
> because they can **see the actual product working**, not just read about it.

Right now the landing page leans on copy, gradients and a Three.js ambient scene. The single
biggest lever is **product visuals**: screenshots, short loops, and annotated UI showing the
journey from debt → owning a home outright.

---

## 1. BRAND TOKENS (use these — do not invent new colours)

```css
--bg:#080808; --c1:#0f0f0f; --c2:#161616;
--em:#44c0b9;  /* teal — primary */
--go:#c9a84c;  /* gold — premium / pioneer */
--gr:#3ecf8e;  /* green — positive / growth */
--re:#e05c5c;  /* red — debt / negative */
--tx:#e8e8e8; --t2:#9aa0a6; --t3:#5a6068;
```

- **Fonts:** Syne (headings/labels), Share Tech Mono (numbers/codes), DM Sans (body)
- **Aesthetic:** Cyberpunk precision — clip-path polygon corners, scan-line texture, duo-tone
  icon shadows, teal/gold on near-black.
- **Logo:** SVG vault door (concentric rings, tick marks, teal V chevron, gold bolt holes).

---

## 2. THE PRODUCT (what we need to show off)

The app (`index.html`) has these surfaces — each is a screenshot/visual opportunity:

| Surface | What it shows | Visual priority |
|---|---|---|
| **House Builder** | Isometric 3D house that builds brick-by-brick as you save a deposit; blank plot → wireframe → solid home when mortgage is paid | ★★★ HERO |
| **Overview / Net Worth** | Assets vs debts, net-worth chart climbing out of the red | ★★★ |
| **Journey Map** | Stage 0 (debt) → Stage 6 (own home outright) progression | ★★★ |
| **Cashflow** | Income vs expenses, monthly snapshots | ★★ |
| **Debt Tracker** | Avalanche vs minimum-payment payoff, interest saved | ★★ |
| **Assets & Liabilities** | Metals, crypto, cash, depreciating assets | ★ |
| **Entrepreneur** | Income-stream builder (second income) | ★ |

**Pre-seeded demo to screenshot from:** `https://fetapit.github.io/Vault-It/example/`
(Alex Morgan — UK persona, all modules populated). Use this so every screenshot looks full and
real, never empty.

---

## 3. TASK LIST

### 3.1 Hero — lead with the product
- [ ] Replace/augment the ambient Three.js scene with a **real device mock-up** (phone +
      desktop) showing the **House Builder mid-build** as the focal image.
- [ ] Add a 5–8s **looping screen-capture** (muted, autoplay, `playsinline`) of the house
      building up as deposits are added. Provide a static poster frame fallback.
- [ ] Keep headline short; pair it with a one-line subhead that names the outcome
      ("Own your home outright"). CTA buttons unchanged in function, restyled for contrast.

### 3.2 New section — "See it in action"
- [ ] Insert a dedicated product-showcase section (between `#problem` and `#features`).
- [ ] 3–4 **annotated screenshots** with short callouts:
      1. House Builder (blank plot → wireframe → solid) — show the progression as a 3-up.
      2. Net-worth chart crossing from red into green.
      3. Journey Map stages 0→6.
- [ ] Use a tabbed or scroll-snap carousel so visitors can flick between app surfaces.

### 3.3 Features section — pair every claim with a thumbnail
- [ ] Current `#features` is text/icon led. Add a **product thumbnail** to each feature card so
      each benefit is anchored to a real UI element.
- [ ] Maintain the duo-tone / clip-path card styling already in the page.

### 3.4 "How it works" — visual stepper
- [ ] Convert `#how` into a 3-step visual stepper, each step with a screenshot:
      Track your money → Kill your debt → Build your home.

### 3.5 Social proof & trust
- [ ] In `#testimonials`, add small UI snippets beside quotes (e.g. a milestone toast,
      a streak counter) so testimonials feel tied to real moments in the app.
- [ ] Add a thin trust strip: "Your data stays on your device" + the vault padlock motif.

### 3.6 Responsive & performance
- [ ] All new imagery must be responsive (`srcset`/`sizes`), lazy-loaded (`loading="lazy"`),
      and use modern formats (WebP/AVIF with PNG fallback).
- [ ] Loop video ≤ ~2 MB; never block first paint. Respect `prefers-reduced-motion` — pause
      autoplay loops for users who opt out.
- [ ] Verify the page still scores well on mobile; the Three.js scene must not regress LCP.

### 3.7 Consistency with the app
- [ ] Pull exact colours/fonts from §1 so the site and app feel like one product.
- [ ] Reuse the vault-door SVG logo already embedded in `index.html` / `landing.html`.

---

## 4. ASSETS TO PRODUCE

Place under a new `assets/` (or `assets/screens/`) folder in the repo root:

- [ ] `house-build-loop.webm` + `.mp4` + `house-build-poster.png` — House Builder time-lapse
- [ ] `screen-house-3up.png` — blank plot / wireframe / solid, side by side
- [ ] `screen-networth.png` — net-worth chart red→green
- [ ] `screen-journey.png` — Journey Map stages 0→6
- [ ] `screen-cashflow.png`, `screen-debt.png` — supporting surfaces
- [ ] Device mock-up frames (phone + desktop) wrapping the above

> Capture all screenshots from the **`/example/` demo** at a consistent viewport
> (suggest 1440px desktop and 390px mobile) for visual consistency.

---

## 5. GUARDRAILS

- **Do not** change app functionality — this is a marketing-site visual pass only.
- **Do not** introduce new brand colours, fonts, or a second design language.
- **Do not** ship oversized media that hurts load time.
- Keep all copy honest: every screenshot is real product UI, no fabricated numbers beyond the
  Alex Morgan demo persona.
- Work on branch `claude/pioneer-v2-migration-UaFPz`; do not open a PR unless asked.

---

## 6. DEFINITION OF DONE

- [ ] Hero shows the real product (mock-up + loop), not just an abstract scene.
- [ ] A "See it in action" section with ≥3 annotated screenshots exists and is responsive.
- [ ] Every feature card has a product thumbnail.
- [ ] "How it works" is a visual stepper with screenshots.
- [ ] All media is optimised, lazy-loaded, and `prefers-reduced-motion`-aware.
- [ ] Site and app are visually consistent (same tokens, same logo).
- [ ] Lighthouse mobile performance is not regressed versus the current landing page.
