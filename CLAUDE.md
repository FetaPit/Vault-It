# Vault·It — working notes for Claude Code

UK personal-finance single-file PWA. Owner: Pete (FetaPit). App: **https://app.vault-it.co**, landing page: https://vault-it.co (Cloudflare — see `docs/CUTOVER.md` for the state of the move; the older address https://fetapit.github.io/Vault-It/ is GitHub Pages).

## Where things are
- `index.html` — the whole app (CSS, JS, markup). The 3D House Builder engine is embedded from `src/hb3d/*` by `node tools/build_hb3d.js` (re-run after editing `src/hb3d`).
- `landing.html` = the sign-up page served at vault-it.co and vault-it.co/sign-up; its confirm / thanks / unsubscribe pages and images are in `site/`; beta list = `waitlist-join` function + migration 009 (double opt-in). Offer, prices and funnel decisions: `docs/OFFER_AND_PRICING.md` (research with sources in `docs/research/`). `recover.html`.
- `supabase/functions/*` — Deno edge functions (`pin-auth`, `send-auth-email`, `waitlist-join`, `portfolio-vision`, `stock-quotes`, `house-3d`); `supabase/migrations/*.sql`; `supabase/functions/README.md`.
- `tests/` — Playwright/logic tests (`tests/README.md`). `docs/` — specs, `BETA_RUNBOOK.md`, `TESTER_GUIDE.md`.
- Supabase project `legpubblzgknxdtvsant` (eu-central-1, Frankfurt).

## Branches and releasing
- Develop on **`Pioneer_v3`** (or the branch the session names). No pull requests unless asked.
- `release/pioneer-v2` is the production branch: Cloudflare Workers Builds deploys it (build `npm run build:site`, deploy `npx wrangler deploy`, preview builds for every other branch) and GitHub Pages still publishes it for the older address.
- To release: run the regression tests, create `backup/release-pioneer-v2-YYYYMMDD-HHMM` from the current release branch, then fast-forward `release/pioneer-v2` to the tested `Pioneer_v3` commit. Only release when asked.
- Commit messages end with the attribution lines the session provides. Don't put model names in code, docs or commit text beyond those lines.

## Tests
```
bash scripts/run-tests.sh [all|server|browser|<test name>...]   # e.g. bash scripts/run-tests.sh test_roadmap test_pin_server
```
- `server` = node-only tests (edge-function logic, SQL migrations on a local Postgres via pglite, 3D kit scale); `browser` = Playwright tests, `crawl.js`, `xss*.js`. `SHARD=1/3` and `JOBS=2` tune parallelism; logs go to `/tmp/vaultit-test-logs`.
- A test passes only if it exits 0 **and** prints no `FAIL` line (several print `FAILURES n` and still exit 0). Failures are re-run once on their own — `test_sync`, `test_cut`, `test_hb3d_app` can fail when many browsers run at once — and a pass on the re-run is reported as FLAKY.
- Cloud sessions: `.claude/hooks/session-start.sh` runs `npm install` (esbuild + pglite), links the repo to `/home/user/Vault-It` (the tests open `file:///home/user/Vault-It/index.html`) and exposes the image's Playwright. Playwright is deliberately **not** in `package.json` (the image already has it plus its Chromium); CI installs it.
- CI (`.github/workflows/ci.yml`) runs the same script on every push and pull request (server job + 3 browser shards). It deploys nothing.
- Run everything before a release, plus `node tools/build_hb3d.js` if `src/hb3d` changed. Screenshots land in `shots/` (git-ignored build output — do not commit them).

## Supabase and secrets
- Never commit keys. The publishable key in `index.html` is public by design; the service-role key, `RESEND_API_KEY`, `PIN_PEPPER` (never change it — every PIN would stop working), `ANTHROPIC_API_KEY` live only in Supabase secrets.
- Changes to the shared production database or functions (apply a migration, deploy a function, set a secret) need the owner's explicit yes first. Apply migrations **before** deploying functions that use them (`send-auth-email` / `pin-auth` fail open without migration 008). Check what is applied with the Supabase connector's `list_migrations` rather than assuming.
- The GitHub Action "Deploy Supabase Edge Functions" needs a valid `SUPABASE_ACCESS_TOKEN` repo secret; otherwise deploy with the Supabase connector or `supabase functions deploy <name> --no-verify-jwt`.

## Owner's standing rules
- Stick to the housing and expenditure form; do not guess any figures.
- Marketing pages: no invented testimonials, scarcity, reference prices or advisors; prices must match the Stripe links (`tests/test_signup_page.js` checks the sign-up page).
- Never clear data on a user's device. Browser storage is per web address, so moving to a new domain starts devices empty until they sign in (the cloud copy restores).
- Test visually and with the suite before releasing; always take the backup branch first.
- Anything user-facing about privacy/security must match what the code really does (see the review notes in `docs/BETA_RUNBOOK.md`); `tests/test_beta_client.js` fails if the app talks to an outside host the privacy notice does not name.

## Cloudflare
- `.claude/settings.json` enables the official Cloudflare plugin (`cloudflare@cloudflare`, from the `cloudflare/skills` marketplace): Cloudflare's skills (wrangler, Workers best practices, Turnstile, web performance …) and its MCP server `https://mcp.cloudflare.com/mcp`. The MCP server signs in with OAuth in a browser, which a cloud session cannot do — in cloud sessions use the claude.ai connector for the same URL, or a scoped `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` set in the environment (never paste tokens into chat).
- Hosting is one Worker (`worker/index.mjs`, config `wrangler.jsonc`, site built by `tools/build_site.js`): app.vault-it.co → dist/app, vault-it.co → dist/landing, www → redirect, previews serve the app. The domain stays registered at Wix; only its nameservers moved to Cloudflare. Remaining steps and state: `docs/CUTOVER.md`.
