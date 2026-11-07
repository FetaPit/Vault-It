# Demo Worker

Serves the pitch demo as a separate Worker (`vault-it-demo`) on routes, so the main site Worker and the release code are untouched.

| Address | What it does |
| --- | --- |
| `https://vault-it.co/eligent-demo` | `demo.html` from the repo root: the Alex Morgan profile page with the demo hyperlink. `vault-it.co/pitch-Eligent` (the address on the deck) serves the same page. |
| `https://app.vault-it.co/eligent` | `app-seed.html`: backs up whatever is in the browser, seeds the app's own Alex Morgan persona plus the Entrepreneur, Wealth Roadmap and Connections data, fakes the 24-hour demo session the app's `?bypass=websummit` uses, and opens the real app with no sign-in. |
| `https://app.vault-it.co/eligent/exit` | `app-exit.html`: puts the browser's own data back and opens the app. |

`app-seed.html` is generated: `node build-seed.mjs` lifts `loadDemoData` and its guards verbatim out of `origin/release/pioneer-v2:index.html`, so the persona is always the release app's own. Edit `app-seed.template.html` for the extra tabs and flags, then regenerate and push.

The Worker reads the pages from GitHub (public repo, branch set by `BRANCH` in `wrangler.jsonc`) and caches them at the edge for five minutes, so pushing to that branch updates the demo. Change `BRANCH` once this work lives elsewhere, then `cd demo-worker && npx wrangler deploy`.

Why the seeding page exists: the app's own `?bypass=websummit` sets `vi_demo_mode` before `initDemoMode` runs, so on a fresh device it opens an empty app. The seed page writes the data itself, then opens the app as a returning user so no onboarding wizard or demo bar sits over the pitch.
