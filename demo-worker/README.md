# Demo Worker

Serves the pitch demo at `https://vault-it.co/pitch-Eligent` (the address on the pitch deck's Try it panel) as a separate Worker (`vault-it-demo`) on a route, so the main site Worker is untouched.

- `/pitch-Eligent/` is `demo.html` from the repo root (the Pioneer profile page with the demo hyperlink).
- `/pitch-Eligent/index.html?demo=1` is `index.html` from the repo root with every tab seeded.

The Worker reads both files from GitHub (public repo, branch set by `BRANCH` in `wrangler.jsonc`) and caches them at the edge for five minutes, so pushing to that branch updates the demo. Change `BRANCH` to `main` once the work is merged, then `cd demo-worker && npx wrangler deploy`.
