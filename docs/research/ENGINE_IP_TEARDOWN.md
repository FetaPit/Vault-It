# Engine IP and the Teardown skill (research, 10 Nov 2026)

Owner's ask (10 Nov 2026): "Making our Vault-It 3D engine unique and powerful enough to be propiatary and protectable by IP. Look at the Teardown Claude skill and see if this could be integrated into our existing engine for enhanced capabilities."

Read-only research. No app code changed, nothing installed. Not legal advice: the IP section lists questions for a UK IP solicitor or patent attorney.

## Short answer

Do not drop the Teardown kit into the app. Take four of its ideas and build them in our own engine code instead. That gives the new capabilities and keeps the engine wholly ours, which is what makes it protectable.

## What Teardown is

- Repo: github.com/elvarofficial/teardown, MIT licence, created 30 Oct 2026, about 2.9k stars. Its runtime, frame capture, sound engine and review rules come from whaleyxbt/claude-motion (also MIT); sound samples are CC0.
- A Claude Code skill plus a small three.js kit (about 900 lines: `runtime.js`, `stage3d.js`, `director.js`, `hud.js`, `warm.js`, `util.js`) for building one-page 3D explainers of machines (a V8, a Cessna landing gear, a Strandbeest) that you can take apart.
- Each machine has: one input that poses everything (crank angle, stroke, wind); panels and charts that read from the same function, so numbers never disagree with the motion; buttons that isolate, cut away, x-ray or explode the part doing the work; an auto tour with a cursor that hands control to the visitor on any input and takes it back after 25 s of quiet; quality tiers for integrated GPUs; a shader warm-up; and a deterministic `render(t)` that Playwright captures frame by frame into a 60 fps video with a synced score.
- Dependencies: three.js 0.186 with EffectComposer and UnrealBloom, Inter and JetBrains Mono fonts, esbuild, Playwright, ffmpeg and Python for the film and sound.

## Why not integrate it directly

| Teardown | Vault-It engine (src/hb3d) | Clash |
|---|---|---|
| three.js 0.186 ES modules, post-processing (bloom, GTAO) | Default renderer `house_gl.js` is raw WebGL, one instanced draw per pass, no three.js. three.js r128 from jsdelivr only for the legacy viewer | A second, heavier renderer in a phone-first app |
| Pages around 800 KB | Phone budgets: 2.2e6 px, pixel ratio 1.5 below 700 px, 30 fps at rest, 640k vertex cap (`brand.js:454`) | Bloom and GTAO break the phone budget |
| Inter, JetBrains Mono, light studio look | Syne, DM Sans, Share Tech Mono only; Night and Daylight brand | Brand rules forbid the fonts and look |
| Built for machines with linkages | Built for houses laid course by course from money | Most of the kit's maths (slider-crank, gears, linkages) has no use here |
| MIT code we did not write | Procedural code we wrote | Copied code stays someone else's; every line we import is a line we cannot call proprietary |

The film tools (Playwright capture, ffmpeg, Python sound) are dev-side, not app runtime, so they could be used for marketing without touching the app.

## What the engine already has (audit)

- `kit.js`: procedural masonry course by course (flemish and stretcher bond, openings, gables, cavity leaves), gable/hip/flat roofs tiled row by row, chimneys, foundations, scaffolding, clean shell.
- Nine named build stages with deposit ranges (`kit.js:31-40`: setting out 0-3%, foundations 3-10%, slab, brickwork 12-50%, roof structure, tiling, fit-out, landscaping, snagging). Every primitive carries a stage, a build time `t` and a kind.
- Build by height: build % equals deposit % funded. Brick value `depositTarget * 0.77 / bricksTotal` (`brand.js:20`); laying order by course, round the ring (`brand.js:61`).
- Six procedural house types (`src/hb3d/models/*`), no bought or generated models. Ghost neighbours, Level 2 waterline (`house_gl.js:498`), lite mode, still-picture fallback.
- No exploded view, no cutaway UI, no per-part labels or costs, no auto tour, no video capture.

So the engine already follows Teardown's best rule ("one input drives everything": our input is deposit %). The gaps are the take-apart and storytelling layers.

## The four ideas worth building (our code, our IP)

1. **Exploded "what your deposit buys" view.** Pull the house apart by build stage: foundations drop, each brick course lifts slightly, the roof floats up. Stages and per-primitive stage data already exist, so this is an instance offset by stage in `house_gl.js`, eased with the brand curves. Tap a stage to isolate it.
2. **Money callouts from one source.** Labels with leader lines on the part being built ("Course 14 of 38, £2,310 laid"), read from the same function that lays the bricks, so the picture and the figures can never disagree. Uses the existing brick value; changes no money logic.
3. **Auto tour.** Left alone, the house builder (and the landing page hero) tours itself: build to today's %, explode, reassemble. Any touch hands control back; quiet hands it back to the tour. Off under `prefers-reduced-motion`.
4. **Deterministic film capture (dev tool only).** Make the brand build a pure function of time, then capture a 60 fps video of a house rising from £0 to deposit for Instagram and the pitch deck. This sits in `tools/`, never ships in the app. If we reuse claude-motion's capture script, keep its MIT notice in `tools/` and a `THIRD_PARTY_NOTICES.md`.

Also worth copying as practice, not code: shader warm-up before the first frame, and the still-sheet review loop (we already have `tools/shot.js`).

Order: after the open E12 to E15 house builder stream lands, since it is working in `house_gl.js`. Ideas 1 and 2 first (they are the product); 3 and 4 serve marketing.

## IP: what actually protects the engine

Questions to take to a UK IP solicitor or patent attorney. Notes are general information, not advice.

- **Copyright** arises automatically in our own source code. Strengthen it: copyright header in each `src/hb3d` file, a `THIRD_PARTY_NOTICES.md` for anything third party (three.js, any MIT tool code), and keep git history as the dated authorship record. Ask: who owns code written with AI assistance under UK law, and does the owner's direction of the work make them the author?
- **Patents** are hard for software in the UK, and UK novelty has no grace period. The money-to-bricks mapping is already public in the live app, which may already rule out a patent on it. Ask before spending anything here.
- **Trade marks** are the cheapest strong protection: register Vault-It, and give the engine a name and register that too if it will be marketed.
- **Registered designs** may cover the look of the house and app screens. Ask whether it is worth it.
- **Trade secrets** do not fit the engine: it ships as readable JavaScript in `index.html`. What can stay secret is server-side (edge functions) and unpublished tools and pipelines.
- **What makes it unique** is the combination nobody else ships: real UK house types laid brick by brick, each brick worth a real share of the user's own deposit, with stages tied to milestones. The four ideas above deepen that combination rather than borrowing someone else's.

## Engine name shortlist (owner, 13 Nov 2026: "Invented name")

Web checks only (13 Nov 2026). The UKIPO register sits behind a security check for automated tools, so the owner runs that search in a browser.

| Name | Built from | Web check | Risk |
|---|---|---|---|
| **Laymora** | lay (bricks) + mora, a soft ending that echoes mortar | No product, company or app found | Lowest |
| **Brikkon** | brick + "on", as in building on | Nothing found; a logic puzzle game called Brukkon exists | Low; one letter from a game, check class 9 |
| **Keylay** | keys to your home + laying bricks | A small open-source GitLab project called Keylay (AGPL) | Medium; easy to type but already in use |

Dropped: Domivo (Domivi is property management software), Bricora (crowded by Brico, Bricorico, Bricofer), Courvel (sounds like CorVel, a listed US software and services company).

Before filing: search each name on the UKIPO register (similar marks, classes 9, 42 and 36), Companies House and the .com and .co.uk domains; and EUIPO TMview if the engine will be licensed in the EU.

## Sources

- https://github.com/elvarofficial/teardown (README, SKILL.md, package.json, file tree; read 10 Nov 2026)
- https://github.com/whaleyxbt/claude-motion (credited upstream, not read)
- Engine audit: `src/hb3d/*`, `docs/HB3D_KIT.md`, `tests/test_hb3d_scale.js`
