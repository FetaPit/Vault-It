# Vault-It brand package

Open `vault-it-brand-book.html` in a browser first. It is the visual and behavioural reference for everything else.

| File | Use |
| --- | --- |
| `vault-it-brand-book.html` | The interactive brand book. Source of truth |
| `vault-it-brand-handover.md` | The full build brief, phase by phase, with acceptance criteria |
| `vault-it-3d-engine.js` | The 3D engine: to-scale house, net worth scene, tracker. Use as is |
| `vault-it-tokens.css` | Colour, type, radius, motion tokens for Night and Daylight |
| `vault-it-components.css` | Menu bar, 3D stage, rail, pills, stat tiles, toggle styles |
| `vault-it-icons.svg` | Icon sprite, pack v2 (`#vi-<id>`). Built, do not hand-edit |
| `vault-it-icons.json` | Icon manifest: names, groups, Night and Daylight colours, where each is used |
| `icons/` | Icon source (`icons-v2.src.js`), `preview-v2.html` (v1 beside v2), one SVG per icon in `svg/night` and `svg/daylight`, and the old pack in `v1/`. Rebuild everything with `node tools/build_icons_v2.js` |
| `vault-it-logo-mark-*.svg` | Brand mark, Night and Daylight |
| `vault-it-tokens.json`, `tailwind.vault-it.js` | Same tokens for other toolchains. Only if needed |

`CLAUDE_ADDENDUM.md` is text to **append** to the repo's existing `CLAUDE.md`. Do not replace that file.
