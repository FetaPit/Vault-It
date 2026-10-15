# Vault·It automated checks

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
node tests/test_hist.mjs; node tests/test_007.mjs   # SQL migrations 006 / 007 on a local Postgres
```
