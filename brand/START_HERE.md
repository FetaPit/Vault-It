# Start the Vault-It brand cutover

Your repo is **github.com/FetaPit/Vault-It**. Its production branch is **`release/pioneer-v2`** (not `main`). A push there goes live on app.vault-it.co and vault-it.co through Cloudflare, so all brand work happens on `Pioneer_v3` or a branch off it.

## Fastest: one command

From the root of your local clone: `bash setup-brand-rollout.sh /path/to/vault-it-cutover.zip`. It does the steps below for you, never touches production, and pushes the branch.

## Or by hand (10 minutes)

1. In the repo, switch to your develop branch: `git checkout Pioneer_v3`, then `git checkout -b brand-rollout`.
2. Unzip this package into the repo root. You get a `brand/` folder and this file. It does **not** replace your `CLAUDE.md`.
3. Append `brand/CLAUDE_ADDENDUM.md` to the end of your existing `CLAUDE.md`.
4. Commit: `git add brand CLAUDE.md && git commit -m "Add brand package"` and `git push -u origin brand-rollout`. Cloudflare's build trigger currently lists only `release/pioneer-v2`, so this branch will not deploy. Check it on your phone with a local build: `npm run build:site` then `npx wrangler dev`.
5. Open `brand/vault-it-brand-book.html` in a browser so you can compare as you go.

## First message to Claude Code (paste as is)

> Read CLAUDE.md, brand/CLAUDE_ADDENDUM.md and brand/vault-it-brand-handover.md (especially section 2b, repo facts), and open brand/vault-it-brand-book.html to see the target. Do Step 0 only. Read src/hb3d/kit.js, src/hb3d/viewer.js, tools/build_hb3d.js, docs/HB3D_KIT.md, docs/HOUSE_BUILDER_3D_SPEC.md, docs/HOUSE_BUILDER_LEVELS_SPEC.md and docs/CUTOVER.md. Report: how the current house builder renders, how progress, the row and brick figures and the price and deposit are computed, which tests cover it (test_hb3d_app and the 3D kit scale test), where the wordmark and icons are, and how offline caching works. Then propose a phase plan with the flags from section 11. Do not edit any code until I approve the plan.

## Then, one phase at a time

Approve each phase with: "Go with phase N. Commit, push to brand-rollout, run the tests, and send screenshots from a local build."

Suggested order: 1 tokens and theme, 2 fonts and clean-up, 3 icons, 4 menu bar, 5 colour code, 7 Daylight, 8 logo. Then the house builder behind `?house=new`, then the net worth scene and tracker behind `?nw=new`, then `landing.html`.

## Releasing

Only you release. Claude Code should run all tests, create `backup/release-pioneer-v2-YYYYMMDD-HHMM`, then fast-forward `release/pioneer-v2` to the tested commit, and only when you ask.

## Check on your own phone first

Scroll, drag to orbit, Night and Daylight, reduced motion, and one run with WebGL off. The QA list is section 9 of the handover.
