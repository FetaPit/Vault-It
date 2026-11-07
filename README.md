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

`demo.html` is a standalone profile page for the sample Pioneer (Sam Carter: NHS nurse in Leeds, three debts, £16k of a £200k terraced target saved, tutoring on the side). It has the demo hyperlink, a copy button and a one-line summary of what each tab shows. On GitHub Pages that is `https://fetapit.github.io/Vault-It/demo.html`.

The link itself is the app with `?demo=1` on the end, for example `https://fetapit.github.io/Vault-It/?demo=1`. It seeds every tab and sub-tab (Overview, Journey, House Builder, Assets with metals, crypto, cash, inventory and liabilities, Debt Tracker, Entrepreneur, Achievements, Connections) and opens the profile card.

- Anything already on the device is backed up first and put back when you hit "Exit demo" on the gold bar.
- Open the link again to reset the demo to its starting numbers.
- The dataset lives in `viDemoDataset()` in `index.html`. Change numbers there and the page copy in `demo.html` to match.
