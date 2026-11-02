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

## 3D model library (Wealth Inventory + Liabilities)

Each inventory tile and liability tile has a 🧊 button to attach an open-licence 3D model, then **View in 3D** to orbit it.

Models are fetched once at build time (not scraped, no API key in the browser):

```bash
POLY_PIZZA_KEY=your_key node tools/fetch-models.mjs   # key: https://poly.pizza/settings/api
```

This writes `models/glb/`, `models/thumb/`, `models/catalog.json` and `models/CREDITS.md` (CC0 and CC-BY only, under 20k triangles). Commit the output. Serve the app over http(s), not `file://`, so the catalogue can load. Keep `models/CREDITS.md` published: CC-BY requires attribution.
