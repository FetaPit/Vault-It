# Demo Worker

Serves the pitch demo as a separate Worker (`vault-it-demo`) on routes, so the main site Worker is untouched.

- `https://vault-it.co/eligent-demo` is the demo: `demo.html` from the repo root (the Pioneer profile page with the demo hyperlink).
- `https://vault-it.co/eligent-demo/index.html?demo=1` is `index.html` from the repo root with every tab seeded.
- `https://vault-it.co/pitch-Eligent` serves the same pages (the address printed on the pitch deck).
- `https://app.vault-it.co/eligent` is a 302 to the demo page.

The Worker reads both files from GitHub (public repo, branch set by `BRANCH` in `wrangler.jsonc`) and caches them at the edge for five minutes, so pushing to that branch updates the demo. Change `BRANCH` to `main` once the work is merged, then `cd demo-worker && npx wrangler deploy`.
