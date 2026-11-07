# Vault·It brand package

Open `vault-it-brand-book.html` in a browser first. It is the visual and behavioural reference for everything else.

| File | Use |
| --- | --- |
| `vault-it-brand-book.html` | The interactive brand book. Source of truth |
| `vault-it-brand-handover.md` | The full build brief, phase by phase, with acceptance criteria |
| `vault-it-3d-engine.js` | The 3D engine: to-scale house, net worth scene, tracker. Use as is |
| `vault-it-tokens.css` | Colour, type, radius, motion tokens for Night and Daylight |
| `vault-it-components.css` | Menu bar, 3D stage, rail, pills, stat tiles, toggle styles |
| `vault-it-icons.svg` | Icon sprite (`#vi-<id>`) |
| `vault-it-icons.json` | Icon manifest: names, groups, colours, where each is used |
| `vault-it-logo-mark-*.svg` | Brand mark, Night and Daylight |
| `vault-it-tokens.json`, `tailwind.vault-it.js` | Same tokens for other toolchains. Only if needed |

`CLAUDE_ADDENDUM.md` is text to **append** to the repo's existing `CLAUDE.md`. Do not replace that file.

## Pitch demo

- `https://vault-it.co/eligent-demo` (also `vault-it.co/pitch-Eligent`, the address on the deck): `demo.html`, a standalone profile page for the sample Pioneer, Alex Morgan, with the demo hyperlink and a one-line summary of what each tab shows.
- `https://app.vault-it.co/eligent`: opens the real app, signed in as Alex with every tab filled in. Whatever was in the browser is backed up and put back by `https://app.vault-it.co/eligent/exit`. Opening the link again resets the numbers.
- How it works, and how to update it, is in `demo-worker/README.md`.
- `index.html?demo=1` in this repo (the v0.6 build) still seeds its own Sam Carter dataset from `viDemoDataset()`; it is no longer what the links open.
