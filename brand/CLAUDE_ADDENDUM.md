# Brand rollout (append this to the repo's existing CLAUDE.md)

## Brand rollout

A new brand is being applied. Design files are in `brand/`. Open `brand/vault-it-brand-book.html` in a browser to see the target, and follow `brand/vault-it-brand-handover.md` phase by phase.

- Work on `Pioneer_v3` or a branch off it. Never push brand work to `release/pioneer-v2`, and never add a working branch to the Cloudflare build trigger (`npx wrangler deploy` would go live). Check on a phone with a local build (`npm run build:site`, then `npx wrangler dev`), or a Cloudflare non-production build only if the owner has enabled it.
- One phase per commit. After each, post screenshots of Night and Daylight at 390px and 1100px.
- Audit first: read `src/hb3d/kit.js`, `src/hb3d/viewer.js`, `tools/build_hb3d.js`, `docs/HB3D_KIT.md`, `docs/HOUSE_BUILDER_3D_SPEC.md`, `docs/HOUSE_BUILDER_LEVELS_SPEC.md` and `docs/CUTOVER.md`, and report before changing code. The house builder level rules in those specs must keep working.
- The new house builder and net worth scene ship behind flags (`?house=new`, `?nw=new`, or `localStorage` `vi-flag-house` and `vi-flag-nw`). The current builder stays the default until the owner says otherwise.
- Do not change how deposits, prices, house types, levels or saved data work. Brick value comes from the app's own price and deposit: `depositTarget * 0.77 / bricksTotal`.
- Do not touch Supabase, secrets, migrations or the edge functions.
- No new outside hosts. Fonts: Syne, DM Sans, Share Tech Mono only.
- British English, sentence case, **no em dashes**. Keep "Not regulated by the FCA. Not financial advice." visible. Respect `prefers-reduced-motion`. Pages must never scroll sideways.
- Tagline: **Get out of the red and into your home.** Name is written **Vault-It** with a hyphen (owner, 30 Oct 2026). In the logo wordmark the hyphen is drawn as the brand brick.
