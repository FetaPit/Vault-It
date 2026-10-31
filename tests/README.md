# Vault-It automated checks

Run everything with `bash scripts/run-tests.sh` (see CLAUDE.md); the commands below run a single test.

Headless-browser (Playwright) and logic tests written while hardening sync, login and data safety.
They assume the repository is checked out at `/home/user/Vault-It` (edit the `file:///home/user/Vault-It/` paths otherwise).

```
npm i playwright esbuild @electric-sql/pglite     # + a Chromium (npx playwright install chromium)
node tests/crawl.js real 1280      # clicks every tab / sub-tab / button, reports JS errors (modes: real | new | demo, widths 390 | 820 | 1280)
node tests/xss.js; node tests/xss.js attr; node tests/xss2.js   # user text can never inject script
node tests/test_safe.js            # sync: local-vs-cloud merge, blank-never-wins, sample data, retries, direct REST fallback
node tests/test_sync.js            # every data key syncs; new device restores everything
node tests/test_syncnow.js         # sync status, "Upload everything", not-backed-up banner
node tests/test_history.js         # version history + restore + cross-device pull
node tests/test_pin_client.js      # email + PIN login flows; test_pin_server.js / test_vision_server.js: edge function logic
node tests/test_hist.mjs; node tests/test_007.mjs; node tests/test_008.mjs   # SQL migrations 006 / 007 / 008 on a local Postgres
node tests/test_authmail_server.js # send-auth-email: validation, HTML escaping, per-address / per-IP / global limits, fail-open
node tests/test_009.mjs; node tests/test_waitlist_server.js   # beta list: migration 009 on Postgres, and the waitlist-join function (double opt-in, signed unsubscribe, limits)
node tests/test_signup_page.js       # vault-it.co/sign-up and its confirm / thanks / unsubscribe pages in a browser, served through the Worker routing
node tests/test_beta_client.js     # privacy/terms wording, 429 handling, Download my data, Delete my account
node tests/journey_one_b.js        # One B's two-device journey: phone signs up (code + PIN), desktop PINs in with the same data, sync both ways on background/foreground, sign out and back, install readiness (VI_APP=<url> also checks the live service worker)
node tests/test_hb_l2_entry.js      # Level 2 onboarding: purchase-day mortgage entry (lender, balance, rate, fix end, term), panel summary, what-ifs on those figures
node tests/test_sw.js              # installable app: real manifest, sw.js registers over http, versioned cache, offline shell, Worker no-cache rule
node tests/test_gl_recover.js       # 3D viewports on phones: a lost WebGL context shows a note and the house viewer rebuilds itself; the net worth scene follows a cloud sync; canvas pixel budgets; three.js fetched after first paint, viewers sleep off screen and in background tabs, lite quality on demand, the coin stage draws only on a kick
node tests/test_trial.js            # trial then paid: day 1 nudge, day 25 countdown and plans prompt (no free column, Founding first), day 31 read-only vault (handlers blocked, numbers and tabs still show, Settings READ-ONLY, prompt once a day), paid untouched, phone line above the tab bar
node tests/test_plans.js            # plans pop-up and Settings: Vaulter / monthly / yearly / Founding columns, tester prices struck through (£3.99, £21.99), the five Stripe links with e-mail and account id, no old prices, phone stacking
node tests/test_mobile_nav.js       # phones: tab bar fixed to the bottom of the screen, seven tabs at 44px, header one row, footer in flow; Connections out of the menu bar and into Settings at every width
node tests/test_nw3d.js            # net worth in 3D (on by default): flag off unchanged, 3D | Graph toggle, same numbers in both views, debts grouped by kind (cards stacked in one column, each in its own colour), zoom buttons / ctrl+wheel / reset (VI_APP=file:///… to test another copy)
```
