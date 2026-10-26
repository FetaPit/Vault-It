# Vault·It — working notes for Claude Code

UK personal-finance single-file PWA. Owner: Pete (FetaPit). Live: https://fetapit.github.io/Vault-It/ (custom domain **vault-it.co** being connected — see `docs/BETA_RUNBOOK.md`).

## Where things are
- `index.html` — the whole app (CSS, JS, markup). The 3D House Builder engine is embedded from `src/hb3d/*` by `node tools/build_hb3d.js` (re-run after editing `src/hb3d`).
- `landing.html` (marketing + waitlist), `recover.html`.
- `supabase/functions/*` — Deno edge functions (`pin-auth`, `send-auth-email`, `portfolio-vision`, `stock-quotes`, `house-3d`); `supabase/migrations/*.sql`; `supabase/functions/README.md`.
- `tests/` — Playwright/logic tests (`tests/README.md`). `docs/` — specs, `BETA_RUNBOOK.md`, `TESTER_GUIDE.md`.
- Supabase project `legpubblzgknxdtvsant` (eu-central-1, Frankfurt).

## Branches and releasing
- Develop on **`Pioneer_v3`** (or the branch the session names). No pull requests unless asked.
- GitHub Pages publishes **`release/pioneer-v2`** (a custom domain needs a `CNAME` file in the repo root — keep it in `Pioneer_v3` too so a fast-forward always works).
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
- Run everything before a release, plus `node tools/build_hb3d.js` if `src/hb3d` changed. Regenerated `shots/*.png` are committed as "Test screenshots refreshed".

## Supabase and secrets
- Never commit keys. The publishable key in `index.html` is public by design; the service-role key, `RESEND_API_KEY`, `PIN_PEPPER` (never change it — every PIN would stop working), `ANTHROPIC_API_KEY` live only in Supabase secrets.
- Changes to the shared production database or functions (apply a migration, deploy a function, set a secret) need the owner's explicit yes first. Apply migrations **before** deploying functions that use them (`send-auth-email` / `pin-auth` fail open without migration 008). Check what is applied with the Supabase connector's `list_migrations` rather than assuming.
- The GitHub Action "Deploy Supabase Edge Functions" needs a valid `SUPABASE_ACCESS_TOKEN` repo secret; otherwise deploy with the Supabase connector or `supabase functions deploy <name> --no-verify-jwt`.

## Owner's standing rules
- Stick to the housing and expenditure form; do not guess any figures.
- Never clear data on a user's device. Browser storage is per web address, so moving to a new domain starts devices empty until they sign in (the cloud copy restores).
- Test visually and with the suite before releasing; always take the backup branch first.
- Anything user-facing about privacy/security must match what the code really does (see the review notes in `docs/BETA_RUNBOOK.md`); `tests/test_beta_client.js` fails if the app talks to an outside host the privacy notice does not name.
