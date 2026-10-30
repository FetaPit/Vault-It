# Vault-It brand roll-out: handover for Claude Code

You are applying the new Vault-It brand guidelines to the app (app.vault-it.co) and the marketing site (vault-it.co). The guidelines live in an interactive brand book and a set of exported files. This document tells you what to build, in what order, and how to know it is done.

Read this whole file before touching code. Then run Step 0.

## 1. What matters most

The identity is built on one idea: **money you can see, orbit and build, in 3D, with a clear and gamified response to every action.** Three things make that real and the owner cares about them most:

1. **The 3D environments.** A hologram house that builds brick by brick, a net worth scene with debt below the ground, and the environment around them.
2. **The subtle pulse of light on built things.** Finished models breathe softly and send a ring out across the grid.
3. **The animations.** Building animations (bricks laid in order, gold flash, settle), grid animations (ground grid, site boundary, ping ring, sweep band, scanlines or blueprint grid), and the UI feedback that answers every action.

Section 6 specifies these exactly. Do not approximate them. Lift the engine file as is.

## 2. Files you have

Put these in the repo under `brand/` (create it). The brand book is the visual reference. Open it in a browser and compare your work against it.

| File | What it is |
| --- | --- |
| `vault-it-brand-book.html` | The interactive brand book. Source of truth for look and behaviour. |
| `vault-it-3d-engine.js` | The dependency free 3D engine: to-scale house (WebGL), net worth scene with £1,000 blocks and £100 cubes, and the net worth tracker (graph or 3D blocks). Exposes `window.ViEngine`. Use as is. |
| `vault-it-tokens.css` | Design tokens for Night (default) and Daylight (light mode). |
| `vault-it-components.css` | Component rules: menu bar, 3D stage, control rail, status line, pills, stat tiles, icon tiles, built glow. |
| `vault-it-icons.svg` | SVG sprite of all 112 icons (`#vi-<id>`). |
| `vault-it-icons.json` | Manifest: id, name, group, colour token, usage notes. |
| `vault-it-logo-mark-{full,mid,micro}.svg` | The brand mark in Night. |
| `vault-it-logo-mark-{full,mid}-daylight.svg` | The brand mark for Daylight. |
| `vault-it-tokens.json`, `tailwind.vault-it.js` | Same tokens for other toolchains. Only use if the repo needs them. |

## 2b. Repo facts (confirmed from GitHub)

These were read from the live repo, so use them instead of guessing.

- **Repo:** `FetaPit/Vault-It` on GitHub (public). Its default branch `main` is an old v0.3 alpha and is **not** production.
- **Production branch:** `release/pioneer-v2`. **A push to it goes live.** Cloudflare Workers Builds deploys it (build `npm run build:site`, deploy `npx wrangler deploy`) to `app.vault-it.co`, `vault-it.co` and `www.vault-it.co`, and GitHub Pages still publishes it at the older `fetapit.github.io/Vault-It/` address. The Cloudflare Worker is named `vault-it` (`wrangler.jsonc`, `worker/index.mjs`). The domain stays registered at Wix, with its nameservers on Cloudflare (`docs/CUTOVER.md`).
- **Develop on `Pioneer_v3`** (or the branch the session names). **Cloudflare's build trigger lists only `release/pioneer-v2`** (checked through the Cloudflare API: repo connection `FetaPit/Vault-It`, branch include `release/pioneer-v2`, and the latest builds were started manually). So do not assume other branches get a preview build. Check before relying on one, and never add a working branch to that trigger: `npx wrangler deploy` from it would go live.
- **Release process (owner only, when asked):** run the tests, create `backup/release-pioneer-v2-YYYYMMDD-HHMM`, then fast-forward `release/pioneer-v2` to the tested commit.
- **App:** `index.html` is the whole app (CSS, JS, markup), about 1.7 MB. Marketing is `landing.html` (vault-it.co). Also `recover.html`.
- **House builder:** the current 3D House Builder lives in `src/hb3d/` (`kit.js`, `viewer.js`, `models/`) and is embedded into `index.html` by `node tools/build_hb3d.js`. Never hand edit the embedded block. Edit `src/hb3d` and re-run the build.
- **Backend:** Supabase project `legpubblzgknxdtvsant` (edge functions in `supabase/functions`). A GitHub Action deploys `send-auth-email` when `supabase/functions/**` changes on `release/pioneer-v2`. The brand work must not touch Supabase, secrets or migrations.
- **Tests:** `bash scripts/run-tests.sh [all|server|browser|<name>]`. Relevant ones: `test_hb3d_app`, the 3D kit scale test, and `tests/test_beta_client.js`, which fails if the app talks to an outside host the privacy notice does not name. Update any scale based expectations on purpose, do not delete tests.
- **Existing `CLAUDE.md` is authoritative.** Do not replace it. Append `brand/CLAUDE_ADDENDUM.md` to it.

## 3. Ground rules

- **No new framework or build step** unless the repo already has one. The app looks like a single large HTML file with inline CSS and JS (the saved page was about 570 KB). Confirm in Step 0 and keep the same architecture.
- **No new dependencies.** The engine uses plain WebGL and canvas 2D. Do not introduce three.js.
- **Fonts stay:** Syne (display), DM Sans (body), Share Tech Mono (numbers, labels). Remove unused fonts (see 5.2).
- **British English, sentence case**, no em dashes in any copy.
- **Compliance line stays visible:** "Not regulated by the FCA. Not financial advice."
- **Never break existing user data or saved state.** This is a visual and behavioural refresh.
- Respect `prefers-reduced-motion` everywhere (details in 6.9).
- Work in small commits, one phase per commit, so any phase can be reverted.

## 4. Step 0: audit before you change anything

Run these and write a short audit note in the PR description.

1. Find the entry file(s) and how CSS and JS are organised.
2. List current CSS variables: `grep -o '\-\-[a-zA-Z0-9-]*:[^;}]*' ...` and compare with `vault-it-tokens.css`.
3. Find every tab and sub-tab definition (`.tab-btn`, `.subtab-btn`) and their accent variables (`--ta`, `--sa`, `--sc`).
4. Find the house builder code. It is the single most important thing to understand. Note what it uses to render (three.js, canvas, WebGL, CSS), how it computes progress, and the "ROW n / 154" label logic. Report back whether the engine file can replace it or must sit beside it.
5. Count inline SVG icons (there were about 171) and text glyph icons: `✎ ✕ ＋ ◈ ✓ ↩ ‹ ›`.
6. Find where the wordmark appears (header, footer, install banner, manifest, og tags, favicon).
7. Find where the theme could switch (there is no light mode today).

If the house builder in the app uses a library, keep its model and data logic, and port the **visual treatment** from section 6. Ask the owner before deleting a working renderer.

## 5. Phase plan

Do the phases in order. Each lists tasks and acceptance criteria.

### Phase 1: Tokens and theme switch

Tasks:
- Add `vault-it-tokens.css` (or merge its variables into the existing `:root`). Night is the default on `:root, [data-theme="dark"]`. Daylight is `[data-theme="light"]`.
- Map old variables to new names. Keep old names as aliases for one release.

| Old | New |
| --- | --- |
| `--bg` | `--bg` (#080808, Daylight #F3F7F6) |
| `--c1`, `--c2` | `--panel`, `--surf2` |
| `--c3`, `--c4` | `--slate` and `--line2` |
| `--em`, `--em2`, `--em3` | `--teal` (use `--faint` for the dim teal) |
| `--dp` | `--teal-deep` |
| `--go` | `--brass` |
| `--go2` | drop |
| `--gr`, `--sa` green | `--green` |
| `--re` | `--red` |
| `--tx`, `--t2`, `--t3` | `--text`, `--muted`, `--lock` |
| `--bd`, `--bd2` | `--line`, `--line2` |
| `--ta` values | see the tab table in Phase 4 |

- Add the theme switch. On first load follow the device, then remember the choice:

```html
<script>
(function(){try{var t=localStorage.getItem("vi-theme");
if(!t&&matchMedia("(prefers-color-scheme: light)").matches)t="light";
document.documentElement.setAttribute("data-theme",t==="light"?"light":"dark")}catch(e){}})()
</script>
```

- Add a header toggle (labels "Daylight" and "Night") that sets `data-theme`, saves `vi-theme`, and updates `aria-pressed`. Copy the behaviour from the brand book (`syncTheme`).
- Never switch by time of day.

Accepted when: the app renders correctly in both themes, no hard coded dark values remain in components, the toggle persists across reloads, and contrast in Daylight meets the table in the brand book (body text 15.8:1, all brand colours 4.6:1 or better for text).

### Phase 2: Fonts and clean-up

- Remove `Playfair Display` (loaded, never used).
- Move the three `DM Mono` rules to `Share Tech Mono`, then remove the DM Mono load.
- Replace text glyph icons with sprite icons: `✎` to `edit`, `✕` to `close`, `＋` to `plus`, `◈` to `network`, `✓` to `check`, `↩` to `undo`, `‹ ›` to `chevron` rotated.
- Hide the build string ("v0.9.2 Alpha . build flow-dash-1") on public pages.

### Phase 3: Iconography

- Inline `vault-it-icons.svg` once at the top of `<body>` (hidden). Use `<svg class="vi-ic" style="color:var(--teal)"><use href="#vi-house-builder"/></svg>`.
- **Weight:** 1.1 hairline at 24px and above, 1.5 below 24px. The sprite reads `--vi-sw`. Add `.vi-ic.sm{--vi-sw:1.5}` for 16 and 20px (rules are in `vault-it-components.css`).
- **Fill:** 16% of the same colour under the stroke. **Detail:** optional 0.7 hairlines at 60% opacity, already inside each symbol. Drop detail below 24px by using the `micro` weight rule or by hiding detail groups with CSS.
- One colour per icon, always from the colour code in Phase 5. Same glyph may take different colours in different buckets (Home is coral for rent, teal for rental income).
- Replace the app's current icons using the manifest (`vault-it-icons.json`, `uses` field shows where each icon is used). The 33 budget category icons are the app's own drawings, thinned, so they should map one to one.
- Swap **Stocks and funds** from the trend arrow to `candles` (the trend arrow clashed with Net worth).

Accepted when: no inline hand-drawn icon remains where a pack icon exists, every icon uses `currentColor` and a token colour, and icons look correct at 16, 20, 24, 32 and 48px in both themes.

### Phase 4: Menu bar

This is the main navigation. The dot before each icon is removed: the icon now carries the tab colour.

Anatomy of a tab: icon (18px) + label (Syne 600, 12px, +0.14em tracking, uppercase) + optional badge. Underline 2px in the tab colour. Active tab: label becomes `--text`, underline and soft shadow in the tab colour, icon breathes on the 2.8 second beat (`tabglow` keyframes). In Daylight the icon glow animation is off, underline stays.

| Tab | Icon id | Colour token | Dark | Daylight |
| --- | --- | --- | --- | --- |
| Overview | `overview` | `--teal` | #44C0B9 | #297B76 |
| Budget | `budget` | `--blue` | #64B5F6 | #0B72C4 |
| House builder (USP badge) | `house-builder` | `--gold` | #E8C56A | #8B6A15 |
| Assets and liabilities | `assets` | `--green` | #3ECF8E | #207F54 |
| Debt tracker | `debt-tracker` | `--red` | #E05C5C | #D62929 |
| Entrepreneur (PRO badge) | `entrepreneur` | `--orange` | #E0894A | #CF6C24 |
| Achievements | `trophy` | `--brass` | #C9A84C | #A18331 |
| Connections | `connections` | `--purple` | #9B7EC8 | #815DBA |

Sub-tabs (Assets and liabilities), shown as bordered 12px radius buttons with a 18px icon:

| Sub-tab | Icon id | Colour token |
| --- | --- | --- |
| Precious metals | `metals` | `--gold` |
| Crypto | `crypto` | `--teal` |
| Cash and savings | `cash` | `--green` |
| Wealth inventory | `cube` | `--purple` |
| Stocks and funds | `candles` | `--green2` (was purple, clashed) |
| Liabilities | `liabilities` | `--amber` (was red) |

Active sub-tab: border and 10% tint in its own colour plus a soft glow. Use the markup and CSS from the brand book (Components, "Menu bar"). The `.vi-tabs`, `.vi-sub`, `.vi-usp`, `.vi-pro` rules are in `vault-it-components.css`.

Mobile: tabs scroll horizontally, active tab scrolls into view (`scrollIntoView({inline:"nearest"})`, skipped under reduced motion). Minimum tap target 44px.

Accepted when: all eight tabs and six sub-tabs match the table in both themes, no dots remain, the active tab pulses subtly in Night, and keyboard focus is visible.

### Phase 5: Colour code

Apply this everywhere (charts, cards, tags, borders). Colour never carries meaning alone: shapes and labels back it up.

- **Gold means now** (current row, zero line, new data). **Brass means achievement** (journey, Pro). **Teal means built or owned.** **Red means owed (debt only).** **Green means cleared.**
- **Liabilities is amber** on the sub-tab, the overview card and its icon (it was red and gold).
- **Spending ramp** (Budget tab only): Income `--teal`, Committed essential `--coral`, Variable essential `--salmon`, Committed non-essential `--amber`, Variable non-essential `--yellow`, Savings `--green`, Investments `--green2`.
- **Bucket icons:** house = essential, star = non-essential, closed lock = committed, open lock = variable.
- **Debt charts:** use a red ramp (largest debt strongest). Issuer colours (Virgin red, Vanquis purple, Klarna pink, Zilch teal) appear only on the card artwork.
- **Charts:** Net worth teal, Debt red, Income gold, Forecast teal dashed.

### Phase 6: 3D environments (detailed spec below)

See section 6. This is the heart of the work.

### Phase 7: Daylight light mode

Daylight is a designed mode, not an inversion. It exists for people who struggle with dark screens.

- Ground is Paper `#F3F7F6` (never pure white). Text is Ink `#0B1F22`. Panels are white with a hairline border and small corner brackets (`[data-theme="light"] .card::before` in the brand book).
- No bloom. Glow tokens become soft shadows: `--glow`, `--tglow`, `--dglow`, `--popglow` are already set for this.
- Scanlines are replaced by a faint blueprint grid (`--paper-img`, `--scan`).
- Colours keep their hue and get darker values so text reaches 4.5:1 and icons 3:1.
- Gold buttons keep the bright fill `--goldf` (#E8C56A) with dark text. Gold text uses the darker ink.
- 3D scenes switch to the Daylight palette automatically (the engine reads `data-theme` every frame). See 6.8.
- Primary buttons use `--btn1` and `--btn2` with white text.

Accepted when: every screen is usable in Daylight with no invisible text, no neon on paper, and the 3D house reads as a blueprint (deep teal brick, white mortar, amber slice).

### Phase 8: Logo and wordmark

- Wordmark: Syne 800. "Vault" in `--text`, then a small brick, then "It" in `--teal`. The brick sits on the baseline (`translateY(-.06em)`), `.3em` wide, `.17em` tall, radius 2px. In text the name is written Vault-It with a hyphen (owner, 30 Oct 2026); in the logo that hyphen is drawn as the brick. Standardise the logo on the brick.
- Mark: use the SVG files. Full (96px and up), Mid (40 to 96px), Micro (under 40px, also the favicon and PWA icon). Clear space is a quarter of the icon height. Use the Daylight variants on light surfaces for the header only; elsewhere the built in dark disc works on any background.
- Update `<title>`, `og:title`, and the hero H1 to the new tagline: **Get out of the red and into your home.** The current site hero still says "From debt to owning your home outright".

### Phase 9: Social and OG images (optional, after the rest)

The brand book has a social kit that renders the 3D house to a canvas for Instagram, Story, X and LinkedIn, and Open Graph, in Night and Daylight. If the owner wants OG images generated, reuse `renderHouse` with `noPulse:true, noFlash:true, sweep:false` as the book does.

## 6. The 3D environments

### 6.1 Architecture

`vault-it-3d-engine.js` is a self-contained IIFE that exposes `window.ViEngine`:

- `makeStage(canvas, options)` is the house builder stage.
- `makeNW(canvas, options)` is the net worth scene (Overview) with £1,000 blocks and £100 cubes.
- `makeTracker(canvas, options)` is the net worth tracker with a **Graph** view and a **3D blocks** view.
- `glr()` returns the shared WebGL context or null. If it is null the house falls back to a flat canvas 2D renderer (same colours and stages, no individual 3D bricks). Keep this fallback.
- Internals you can read but should not need to edit: `buildHouseGL`, `renderHouseGL`, `Proj` (camera), `orbit` (pointer and keyboard), `THG` (house palettes), `nwPal` (net worth palettes).

**How a house frame is drawn.** Each stage canvas is composed in three layers in this order:

1. **2D underlay:** ground glow, ground grid, dashed site boundary, footprint, ring ping, the dim wireframe of the finished house, and the roof rafters.
2. **WebGL scene** drawn on one shared hidden canvas, then copied in with `drawImage`: about 14,400 instanced 3D bricks, baked roof slabs, window glass. Two passes: far faces faint (so you can see into the hologram), then near faces depth tested. Premultiplied alpha.
3. **2D overlay:** Night window glow, the gold slice, the keys glint and the gold tag.

One hidden WebGL context serves every stage on the page, so you never hit the browser limit on contexts. Shaders are GLSL ES 1.00, run on WebGL2 or on WebGL1 with `ANGLE_instanced_arrays`. Static exports (social images) use the same path.

Embed it:

```html
<div class="stage3d" id="hbStage">
  <canvas id="hbCanvas" tabindex="0" role="img"
    aria-label="3D hologram of the house you are saving for. Drag to orbit."></canvas>
  <div class="statusline" id="hbStatus"></div>
  <div class="pops" id="hbPops"></div>
</div>
<script src="brand/vault-it-3d-engine.js"></script>
<script>
const stage = ViEngine.makeStage(document.getElementById("hbCanvas"), {
  railPad: 70,   // keep the gold tag clear of the control rail
  padB: 40,      // keep the tag clear of the status line
  onFrame(info, st){ /* info.row (0..154), info.bricks, info.bricksTotal, info.tiles, info.p */ }
});
stage.setTarget(deposit.saved / deposit.target);   // animates to it
// stage.setTarget(p, true) jumps instantly
</script>
```

Controller methods: `setTarget(p, immediate)`, `getTarget()`, `toggleAuto()`, `zoom(factor)`, `reset()`. Options: `railPad`, `padB`, `padT` (keep the tag clear of UI), `theme`, `onFrame`, and `fps` (cap the frame rate; the hero runs at full rate, every secondary stage on the same page uses `fps:30`). Set `stage.st.noPlane = true` and `stage.st.tag = false` for a clean close-up with no slice or tag.

Theme: the engine reads `document.documentElement.getAttribute("data-theme")` every frame. Pass `{theme:"light"}` or `{theme:"dark"}` in options to pin a stage (used for side by side previews).

The stage container needs the `.stage3d`, `.rail`, `.statusline`, `.pops`, `.pop` rules from `vault-it-components.css`.

### 6.2 What drives the house: money to bricks

`p` is progress from 0 to 1: `p = depositSaved / depositTarget`, where `depositTarget = propertyPrice * depositPercent / 100`. **Both come from the house builder's own controls (Set price, Deposit target).** Do not hard code a deposit.

**Brick value is not fixed. It scales with the property price and the deposit set:**

```
brickValue = depositTarget * 0.77 / bricksTotal      // bricksTotal = 14,465
bricksLaid = floor(bricksTotal * seg(p, 0.03, 0.80))  // seg = clamp((p-a)/(b-a), 0, 1)
```

77% of the deposit buys the brickwork (progress 0.03 to 0.80). The other 23% pays for the foundations, tiles, glass and finish. The same house therefore costs the same number of bricks whatever the price, and each brick is worth more on a dearer property or a bigger deposit:

| Property | Price | Deposit at 20% | One brick | £500 lays |
| --- | --- | --- | --- | --- |
| Small flat | £80,000 | £16,000 | £0.85 | 587 bricks |
| Terraced | £120,000 | £24,000 | £1.28 | 391 bricks |
| Apartment | £300,000 | £60,000 | £3.19 | 157 bricks |
| Semi-detached | £320,000 | £64,000 | £3.41 | 147 bricks |
| Manor house | £1,500,000 | £300,000 | £15.97 | 31 bricks |

When the price or the deposit percentage changes, **keep the saved amount in pounds** and recompute `p`. The house then re-lays (or un-lays) to show what that saving buys at the new brick value. If a deposit is smaller than one brick, show "0.4 of a brick", not zero: the engine only lays a brick when the running total crosses the next whole number.

Show the brick value to the user (the brand book shows "each brick = £1.28" beside the price and deposit fields). The live app prints "Each brick = £1.05" as a fixed number: replace it with the formula above.

**The label `ROW n / 154` is the real course being laid.** One course is one unit of height, the chimney top is course 154, and the gold slice sits on the top of the most recently laid brick, so it rises only when a new course is begun. The label equals 0 before the first brick.

### 6.3 Brickwork, to scale

**1 world unit = 75 mm = one brick course.** Every brick is a solid 3D box, not a flat face. The house is about 5.4 m wide, 9 m deep, 6.6 m to the eaves, with the ridge at 9.3 m and the chimney tops at 11.55 m (154 courses).

| Part | Spec |
| --- | --- |
| Brick | 215 × 102.5 × 65 mm, drawn 2.87 × 1.37 × 0.87 units. The joint is 0.13 unit (10 mm) |
| Bond | **Flemish bond.** Stretcher (3 units pitch), then header (1.5 units pitch), repeating. On the next course the pattern shifts 2.25 units so every header sits over the middle of a stretcher |
| Depth | Stretchers are 1.37 deep on the face. Headers are 2.87 deep and reach through the wall. This gives the wall real relief at openings, corners and the top of the current course |
| Corners | **Quoins.** On even courses the front and back walls run full length and the side walls stop 3 units short. On odd courses it swaps. Corners therefore interlock and nothing doubles up |
| Gable taper | The gable keeps the **same bond grid** as the wall below (it does not restart). Each course is one unit narrower per side. The brick at each end is **cut** to the roof line (shorter box) and dropped if shorter than 0.45 unit. This removes the offset that appeared when the roof began to taper |
| Openings | Bricks are cut around the door, windows and bay passage using the same cut routine. Stone sills (1 course below) and lintels (2 courses above) are trim boxes. Frames, mullions, door and glass arrive at the glazing stage |
| Bay | Ground floor bay 24 units wide, 12 deep, 36 courses high, flat stone roof |
| Chimneys | Two stacks, 12 × 12 units, courses 112 to 154, same bond and quoins, two pots on top |
| Roof | About 560 overlapping slabs baked into one mesh, 12 rows by 24 columns per slope, laid eaves to ridge |

**Data format.** `buildHouseGL()` returns one `Float32Array` of instances, 8 floats each: `centreX, centreY, centreZ, sizeX, sizeY, sizeZ, key, type`. Types: 0 wall, 1 gable, 2 chimney, 3 trim (follows wall courses), 6 door, 7 frame. Tiles and glass are separate baked meshes (type 4 and 5). `key` is `course + position along that course's ring (0 to 1)`, which is what makes each course close like a ring being laid.

### 6.4 The building animation

Everything is decided in the vertex shader from `p`, so it costs nothing on the CPU.

| Stage | p range | What you see |
| --- | --- | --- |
| Site cleared | 0.005 to 0.03 | Dashed teal site boundary fades in |
| Foundations | 0 to 0.03 | Footprint fills with a teal tint and a brighter outline |
| **Bricks, in order** | 0.03 to 0.80 | 14,465 bricks laid one at a time: walls (11,657) course by course, then the gables (1,166) up to the ridge, then both chimneys together (1,642). Every deposit adds an exact whole number of bricks |
| Roof timbers | 0.60 to 0.80 | 18 rafters appear front to back as bright lines |
| Roof tiles | 0.80 to 0.88 | 564 slabs fill eaves to ridge, both slopes alternating |
| Glazing | 0.88 to 0.93 | Frames, mullions and glass fade in |
| Lights on | 0.93 to 0.96 | Glass warms to gold, Night window glow starts |
| Decorating | 0.96 to 1.0 | The door turns gold |
| Keys | at 0.999 | A gold glint pulses on the door handle. Tag reads KEYS ARE YOURS. The slice fades out from 0.97 |

**Laying rule (single bricks).** Every brick has an integer **order number** inside its group (walls, gables, chimneys), assigned in laying order: course by course, and within a course around the ring (front, right side, back, left side, then the bay). A brick is laid when its order number is below `floor(count)`. So a deposit that buys 4 bricks lays exactly 4, they land one after another along the current course, and the ring closes when the course is full. Trim (sills, lintels, bay roof) appears as soon as the first brick of its course is laid.

**Per brick timing (done on the CPU, drawn on the GPU).** Each brick has its own `laidAt` time in a small per-stage buffer. When the count rises, the new bricks are stamped in order. If 60 bricks or fewer are added at once they are staggered by `min(0.12 s, 0.9 s / n)` so you can watch each one land; larger bursts land together because the build front is already moving. A brick is hidden until its time arrives.

- **Drop in:** over 0.38 s the brick falls 6 units (`e^3` ease) and fades in.
- **Flash:** for 1.1 s after landing it blends to gold, then settles to teal.
- **Un-laying:** when the count falls the bricks disappear instantly and their time is cleared.
- **Reduced motion and static exports:** all bricks are stamped as already laid. No drop, no flash, no stagger.

**The last brick laid is highlighted.** The most recently laid brick stays lit pale gold at all times: it is 14% proud of the wall, brighter than its neighbours and pulses on the 2.8 s beat. A gold ring with four ticks is drawn around it on the HUD layer with its number in a small pill, for example `BRICK #5,078`. The ring appears when the brick has landed, never before. Hidden for static exports. Because the slice sits on the same brick's course, the eye is led to exactly where the next brick will go.

**Smoothing.** The displayed `p` eases toward the target: `p += (target - p) * min(1, dt * 1.7)`, snapping within 0.0003. A £500 deposit builds visibly over about a second. With reduced motion, `p = target` immediately.

**Look.** Light vector `(-0.45, 0.7, 0.55)`. Shade = `shMin + (1 - shMin) * max(0, n . L)` with `shMin` 0.5 (Night) or 0.62 (Daylight). Each brick gets a random tone (plus or minus 10%) from a hash of its position, and a mortar line drawn as a bevel on the face edge: dark teal in Night (strength 0.62), white in Daylight (0.8). Near faces are 88% (Night) or 97% (Daylight) opaque, far faces 9% or 10%.

**The gold slice.** A translucent amber quad, 14 units larger than the footprint on every side, sits at height `154 * p`. Fill 11% (Night) or 24% (Daylight). The tag shows `ROW n / 154` and `x.x% OF DEPOSIT`, joined to the slice centre by a leader line, clamped inside the canvas.

### 6.5 The pulse of light (subtle)

Built things breathe. It must stay subtle: you notice it after a moment, not at first glance.

- **One beat: 2800 ms.** Everything pulses on it. CSS uses `--pulse: 2800ms`. The engine uses `Math.sin(now * 0.002244)` (2 pi over 2800).
- **Brick breathing.** In the fragment shader every laid brick colour is multiplied by `0.95 + 0.10 * pulse` (brightness moves between 95% and 105%). Near face alpha gains `+0.06 * pulse * built` where `built = seg(p, .05, 1)`. At low `p` there is almost no pulse and it grows as the house grows.
- **Window glow (Night).** A radial gold glow is drawn over each lit window with alpha `(0.22 + 0.10 * pulse) * lit`. In Daylight there is no glow: the glass just warms.
- **Ring ping.** Once `p > 0.05`, a rectangle the shape of the footprint expands from the base by up to **75 world units** over 2800 ms while fading. Stroke teal, width 2, alpha `(1 - ping) * (0.10 + 0.40 * seg(p, .5, 1))`. Faint on a new build, clearer as it completes.
- **Net worth scene and tracker.** Block fills use `0.72 + 0.08 * pulse` and edges `0.62 + 0.30 * pulse`. A ring expands from the gold zero plane by up to 16 units, alpha `(1 - ping) * 0.45`, gold (red when net worth is negative). The tracker's TODAY dot sends a ring out in graph view.
- **UI.** `.ictile.built` (glow and a scaling ring), the active menu tab icon (`tabglow`), `sflash` on the stage when a deposit lands. All use `var(--pulse)`.
- **Static exports** pass `noPulse:true` so a still frame never shows a ring.

### 6.6 The grid and environment animations

These sell the "hologram in a room" feel. Keep all of them. All distances are in the same 75 mm units.

1. **Ground grid.** 11 lines each way (index -5 to 5) at **30 unit** spacing, extent plus or minus 150. Alpha = `gridA * (1 - |i| / 6.5)` with `gridA` 0.30 (Night) or 0.24 (Daylight), so the centre is strongest and the edges fade out. Net worth scene: spacing 12, extent plus or minus 60.
2. **Ground glow.** A radial gradient on the ground under the model, squashed vertically by `sin(pitch)` so it lies flat. Night: teal 24% at the centre. Daylight: deep teal 12%.
3. **Site boundary and footprint.** Dashed rectangle (8px dash, 6px gap) 20 units outside the plot as the site is cleared, then the footprint fill and outline.
4. **Ring ping.** See 6.5. The main moving grid element.
5. **Sweep band.** A bright horizontal band rises through the house at **20 world units per second**, repeating every 194 units (about 9.7 s). Bricks within 6 units of the band blend toward a sheen colour by `(1 - distance / 6) * 0.5`. It reads as a scan line passing through the model. Off for reduced motion and for static exports.
6. **Scanlines (Night).** `.stage3d::after` draws 1px teal lines every 4px at 5% over the stage. The page body has the same at 2.5%.
7. **Blueprint grid (Daylight).** The same layer becomes a 26px square grid at 7% (page body: 32px at 5%).
8. **Auto orbit.** The model drifts around slowly (`yaw += dt * 0.12` radians per second) and stops the moment someone touches it, resuming after 2.5 s idle. The net worth scene sways instead of spinning: `yaw = -0.55 + sin(t / 4200) * 0.35`. The tracker sways `-0.3 + sin(t / 4600) * 0.18` in 3D view.

### 6.7 Camera and interaction

- Perspective camera orbiting a target. House stage: yaw -0.62, pitch 0.32, distance 370, target height 66, vertical half angle 19 degrees. Net worth: yaw -0.55, pitch 0.46, distance 125, target height 2. Tracker 3D: yaw -0.3, pitch 0.36, distance `60 + 9.2 * months` (times 1.6 under 520px wide).
- Framing: `focal = min(height, width * fit) / 2 / tan(19 deg)` with `fit` 0.85 on wide canvases and 1.1 below 520px so the house stays large on phones. The GL projection uses the same focal length, so 2D and 3D layers line up exactly.
- Pitch is clamped to 0.1 to 1.2. Zoom is clamped to 0.7 to 1.6.
- Drag orbits. On touch only horizontal drag orbits so vertical scrolling still works (`touch-action: pan-y`). Mouse drag also changes pitch. Arrow keys rotate and tilt, plus and minus zoom. Canvases have `tabindex="0"`.
- The control rail has zoom in, zoom out, auto orbit toggle (`aria-pressed`) and reset. On narrow screens the rail moves to a row along the top.

### 6.8 Gamified feedback

Every action answers three ways at once, within about 250 ms: something moves, a number changes, a short line confirms.

| Action | What moves | What changes | What it says |
| --- | --- | --- | --- |
| Lay the bricks (+£5, +£50, +£500) | Each brick drops in, flashes gold and settles, one after another along the course. The last brick stays ringed. Stage border flashes gold (`sflash`, 800 ms) | Bricks, to go, XP tick up | "+£5 . +4 bricks" (or "0.4 of a brick") floats up (`popup`, 1250 ms) |
| Add £100 | A cube drops onto the stack. The ninth cube merges into a block | Net worth ticks | "Cube laid. +£100." |
| Pay debt | A red block (or cube) lifts, turns gold, dissolves over 900 ms | Debt and net worth update | "Debt down £1,000" |
| Cross a milestone | The pill snaps to gold with a pulse (`pillpop`, 900 ms) | Pill unlocks | Toast "Milestone: 25% Quarter" |
| Finish Level 1 | Level 2 pill unlocks with a flash | Lock icon removed | Toast "Level 2 unlocked: Delete the mortgage" |
| Clear all debt | Red tower gone, stage flashes green (`sflashg`) | Label becomes OUT OF THE RED | Toast "Out of the red." |
| Reach 100% | Windows light, door glints | Tag reads KEYS ARE YOURS | "Keys are yours." |

Milestone thresholds: 1, 5, 10, 25, 50, 75, 100 (percent). Toasts only fire after the person has interacted, never during the opening build. XP: 5 base plus 50 per milestone reached plus 25 per deposit action.

### 6.9 Daylight rendering of the 3D scenes

The engine has two palettes (`THG.dark`, `THG.light`; `nwPal`). In Daylight:

- Bricks are deep teal with **white mortar** and 97% opacity. Tiles are a darker blue. Sills and lintels are pale stone. Glass is pale blue and warms to amber when lit.
- Slice is amber with a darker amber outline and no blur. The tag has a soft drop shadow instead of a glow.
- Grid lines are deep teal and fainter. The stage background is a pale teal gradient with the blueprint grid on top.
- There is no additive glow anywhere. Anything that glows in Night uses a soft shadow or a ring in Daylight.

### 6.10 Reduced motion and performance

- `prefers-reduced-motion`: the engine sets `p = target` instantly, disables orbit, sweep and ping, and freezes the pulse at its midpoint. CSS sets all transition and animation durations to 0.01ms. Keep this.
- Render only when visible (IntersectionObserver). Pixel ratio is capped at 1.5 below 700px wide and 2 above. Secondary scenes run at 30 fps. Never run more than two animated canvases at full rate on one screen.
- Memory: about 14,600 brick instances at 32 bytes is about 470 KB of GPU buffer. Geometry builds once, lazily, in about 130 ms.
- If a very low end device drops frames, reduce the pixel ratio cap first, then draw the far face pass only every other frame.
- **Scrolling must never fight the page.** Two faults to never reintroduce: (1) any element wider than the viewport, which lets the page drag sideways (wrap wide tables in a scrolling container and give grid children `min-width:0`; `html, body { overflow-x: clip }` is a safety net); (2) calling `scrollIntoView` from a scroll listener, which moves the whole page. To reveal an active nav item set the nav strip's own `scrollLeft`.
- Use a solid header background on phones. `backdrop-filter` over live canvases is expensive.

### 6.11 The net worth scene: £1,000 blocks and £100 cubes

The Overview scene shows what you own above a gold zero plane and what you owe below it.

- **1 block = £1,000. 1 cube = £100.** A block is 10 × 3.2 × 10 units. A cube is 3.1 units each side, so one block holds ten cubes by volume. Cubes sit on top of a stack in a 3 × 3 grid. **Nine cubes, then a block:** adding the tenth £100 merges the nine cubes into one new block (they fade down while the block drops in).
- Columns: Deposit (teal), Funds (green 2), Metals (gold bars, 11 × 7 footprint), Debt (red, hanging below the plane, with its cubes under the last block). Starting values match the app: deposit £8,500, funds £3,400, metals £3,000, debt £5,600, so net worth is £9,300.
- Actions: `act("dep:1000")`, `act("dep:100")`, `act("stk:1000")`, `act("gold:1000")`, `act("debt:1000")`, `act("debt:100")`. Paying £100 on a debt with no cubes breaks the top block into nine cubes first, then lifts one away.
- Animations: new blocks drop 18 units over 700 ms with a 1000 ms gold flash. Removed blocks rise 16 units over 900 ms, turn gold and fade. The gold zero plane carries the net worth tag (`NET WORTH`, `IN THE RED` or `OUT OF THE RED`) and a ring ping.
- To use real data, generalise `makeNW` to take columns: one per asset class in its colour code (Cash and savings green, Precious metals gold, Stocks and funds green 2, Crypto teal, Wealth inventory violet). Choose the unit so the tallest stack stays under about 14 blocks.

### 6.12 The net worth tracker: Graph or 3D blocks

This is a view toggle on the **existing main net worth chart**. Keep its range tabs (ALL, 1Y, 6M, 3M) and series toggles (NW, DEBT, INCOME, FORECAST). Add a segmented control **Graph | 3D blocks** beside them. `makeTracker` draws both views on one canvas.

Feed it real data:

```js
const trk = ViEngine.makeTracker(canvas, { fps: 30, onChange: (s) => { /* s.lab, s.v.nw, s.v.debt, s.v.inc, s.forecast, s.view */ } });
trk.setData({ labels: ["Nov '25", ...], nw: [...], debt: [...], inc: [...], today: 11 });  // pounds, rounded to £100
trk.setView("line");   // or "bars"
trk.setRange("m6");    // "all", "y1", "m6", "m3"
trk.setSeries("debt", false);  // "debt", "inc", "fc"
```

**Graph view.** Net worth line (teal, with a soft gradient fill under it), debt (red), income (gold), forecast as a dashed continuation after TODAY. Dashed horizontal grid with `£nk` labels in mono, a dashed gold TODAY line with a pulsing dot, and a crosshair that follows the pointer. Lines draw in left to right over 900 ms.

**3D blocks view.** The same data as stacked blocks, one stack per month along the x axis:

- Net worth stacks rise above the gold zero plane (teal), debt stacks hang below it (red), income stacks sit in a lane in front (gold).
- Each stack is built from £1,000 blocks plus up to nine £100 cubes on top. While a stack animates, the top cube grows in height by its fractional value, so it never pops.
- Future months (after TODAY) are **ghost blocks**: faint fill, edge only. A dashed gold TODAY plane crosses the chart.
- Build animation: stacks rise left to right with a 45 ms stagger per month, each easing over 700 ms. Changing range or view replays it. Toggling a series replays that series.
- Orbit works as everywhere else. Tap or hover a month to read it: the gold tag lists the month and each series value, and the stack lights up.
- Windows: ALL is every point. 1Y is 11 months back to 3 ahead. 6M is 5 back to 3 ahead. 3M is 2 back and 2 ahead (around today).
- The unit key (`1 block = £1,000`, `1 cube = £100`, `Forecast`) sits under the chart.

Accepted when: switching view never changes the numbers, the totals in the tag match the graph, the ranges and series toggles work in both views, and the 3D view is usable by touch (tap to read, drag to orbit) in both themes.

## 7. Reference map

| You need | Look at |
| --- | --- |
| The overall look | Brand book, top of page |
| Voice and copy | Brand book, "Brand story and voice" |
| 3D language and feedback grammar | Brand book, "3D visual language" |
| Logo sizes and clear space | Brand book, "Logo" |
| Colours, Night and Daylight values, contrast | Brand book, "Colour" and "Daylight" |
| Icons, states, weights, colour code, spending logic | Brand book, "Iconography" |
| Menu bar markup | Brand book, "Components", "Menu bar" |
| Motion tokens | Brand book, "Motion" (replay button shows the full build) |
| Engine functions | `vault-it-3d-engine.js`: `buildHouse`, `renderHouse`, `makeStage`, `makeNW`, `orbit`, `Proj` |

## 8. Known issues to fix while you are there

1. Site hero still says "From debt to owning your home outright". Update H1, meta title and `og:title`.
2. Wordmark used two colourways. Standardise the logo on the brick; text keeps the hyphen (owner, 30 Oct 2026).
3. Stocks and funds and Wealth inventory both use purple. Stocks and funds moves to `--green2`.
4. Liabilities is red on its sub-tab and gold on the overview. Use `--amber` everywhere.
5. Debt histogram and treemap use issuer colours. Use a red ramp, keep issuer colours on card art only.
6. Two golds are used with no rule. Gold means now. Brass means achievement.
7. Brick count, row label and percentage disagree on the house builder (10,479 of 21,000 bricks is 50% at 35.6%), and "Each brick = £1.05" is a fixed number. Derive the brick value from the price and deposit (see 6.2). The new bricks are to scale and in Flemish bond, with cut bricks along the gable rake: match that, do not keep flat quads.
8. Text characters used as icons (see Phase 2).
9. Icon stroke weights vary (1.6, 1.7, 1.9). Standardise on the 1.1 hairline.
10. Playfair Display loaded, not used. DM Mono used in three rules.
11. Coral (`#E5535F`) and Overdraft red (`#E05C5C`) are nearly identical in Night. The lock shape separates them. Do not use coral for debt.

## 9. QA checklist

Run every item in both themes, at 390px and 1100px wide.

- [ ] Night and Daylight both render every screen with no unreadable text.
- [ ] Device preference is followed on first visit. The toggle persists.
- [ ] All eight tabs and six sub-tabs match the colour table. No dots remain.
- [ ] Every icon comes from the sprite, uses a token colour and looks right at 16, 24 and 48px.
- [ ] House builder: opening build animates from 0 to the saved percentage. Adding £500 flashes new bricks gold and they settle. Scrubbing backwards un-lays bricks.
- [ ] Pulse: complete a build (set `p` to 1). Windows breathe, a ring leaves the base every 2.8 s, bricks brighten and dim by only a few percent.
- [ ] Grid: the ground grid fades toward the edges, the sweep band rises through the model, scanlines (Night) or blueprint grid (Daylight) sit over the stage.
- [ ] Orbit works by mouse, touch and keyboard. Vertical page scroll still works on touch. The rail does not cover the model on a phone.
- [ ] Scrolling: at 320, 360, 390 and 412px wide the page never scrolls sideways (`document.documentElement.scrollWidth` equals the viewport width), and a steady swipe moves the page smoothly with no jumps while canvases are on screen.
- [ ] Reduced motion: no orbit, no sweep, no ring, builds are instant, tab glow is off.
- [ ] Brick value follows the property price and the deposit %: changing either changes the brick value, and the house re-lays to match the saved amount.
- [ ] A small deposit lays an exact small number of bricks (for example £5 on a £120,000 terrace lays 4), they appear in order along the current course, and the last brick laid is ringed, numbered and brighter than the rest.
- [ ] The label "ROW n / 154", the brick count and the percentage agree.
- [ ] Bricks are 3D and to scale: Flemish bond, headers reaching into the wall, interlocking corners, window openings with sills and lintels, and a gable whose bond continues up the rake with cut end bricks.
- [ ] The net worth scene has £1,000 blocks and £100 cubes, and nine cubes merge into a block.
- [ ] The main net worth chart has a Graph and 3D blocks toggle with the same ranges and series, and the numbers match in both views.
- [ ] With WebGL disabled the house still renders (flat fallback) and nothing throws.
- [ ] Logo wordmark uses the brick; text writes Vault-It with a hyphen. Favicon and PWA icon use the micro mark.
- [ ] No console errors. No new network requests apart from the existing font load.
- [ ] Lighthouse accessibility score does not drop. Focus rings are visible in both themes.

## 10. How to report back

After each phase, post: what changed, the files touched, screenshots of Night and Daylight at 390px and 1100px, and anything you deliberately did not do. If something in this document conflicts with how the app actually works, stop and ask the owner instead of guessing.

## 11. Rollout and cutover

Do not swap everything in one release. Order the work so the app is always shippable and every step can be undone.

1. **Branching.** Work on `Pioneer_v3` or a branch off it (for example `brand-rollout`), as the repo's `CLAUDE.md` says. Do not push to `release/pioneer-v2`: that branch is production. **Staging:** build locally (`npm run build:site`) and serve it with `npx wrangler dev` on your network so you can open it on a phone. If the owner turns on non-production builds in Cloudflare (Settings, Builds, branch control, with the command `npx wrangler versions upload`), preview URLs can be used instead. Confirm which one is available before the first phase.
2. **One phase, one commit, one staging check.** Phases 1 to 5 and 7 to 8 (tokens and theme, fonts, icons, menu bar, colour code, Daylight, logo) go first and in order. Post screenshots of each staging check.
3. **The house builder goes behind a switch.** Read the flag from `?house=new` and from `localStorage["vi-flag-house"]`. Default stays the current `src/hb3d` builder. Keep price, deposit, house type and level logic exactly as it is: only the drawing and the brick value maths change. Add the new engine through the same build pipeline (`tools/build_hb3d.js`) so tests keep working, and update the kit scale test deliberately because the brick scale changes.
4. **Net worth scene and tracker toggle** come after, behind `vi-flag-nw`. The Graph view stays the default of the tracker. Feed it the app's own series with `setData`.
5. **Landing page.** `landing.html` (vault-it.co) gets the same tokens, icons, wordmark and tagline in its own phase after the app.
6. **Offline and caching.** Bump the cache or version string the PWA uses with every release so installed copies update, and include the new `brand/` assets in whatever precache list the app has.
7. **Tests every phase:** `bash scripts/run-tests.sh all`. Also confirm `tests/test_beta_client.js` still passes: the brand work must add no new outside hosts (the fonts stay Syne, DM Sans, Share Tech Mono, and Playfair and DM Mono are removed).
8. **Release (owner only, when asked).** Run all tests, create `backup/release-pioneer-v2-YYYYMMDD-HHMM`, then fast-forward `release/pioneer-v2`. Cloudflare then deploys it. Rollback is to fast-forward back to the backup branch, or switch the flag off.
9. **Device matrix before the default flips:** a phone with a real GPU, a low end phone, desktop Chrome and Safari, Night and Daylight on each, reduced motion on, and one run with WebGL disabled to confirm the flat fallback still shows a house.
10. **Watch after release:** console errors, frame rate on the house builder, and any report of text that is hard to read in Daylight.

Release gates: do not turn a flag on by default until every item in section 9 passes on staging.
