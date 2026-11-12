# App source: src/app builds index.html

The app is still one page, `index.html`, served as it always was (the Worker, GitHub Pages, the PWA, the service worker, offline mode and every test use it unchanged). Since 10 Nov 2026 it is **build output**: it is joined, byte for byte, from about 120 parts under `src/app/`, one folder per tab plus shared parts. Owner, 9 Nov 2026: "split the MVP html file into separate tabs and sub tabs", option 1 (source parts that still build one `index.html`).

## The rule

**Edit `src/app/*`, run `node tools/build_app.js`, commit both.** Never edit `index.html` directly.

- `index.html` stays committed, so tests, the Worker and Pages need no build step.
- CI (`node tools/build_app.js --check`), `scripts/run-tests.sh`, `tools/build_site.js` and the commit gate (`.claude/hooks/qc-gate.sh`) all fail if `index.html` and `src/app` differ.
- Line endings: LF only (`.gitattributes` forces it, Windows included), no byte order mark, every part ends in a newline.

## Commands

| Command | What it does |
|---|---|
| `node tools/build_app.js` (`npm run build:app`) | Join the parts into `index.html` (writes only if the bytes differ) |
| `node tools/build_app.js --check` (`npm run check:app`) | Exit 1 if `index.html` differs from the parts, or a part breaks a rule |
| `node tools/build_app.js --absorb` | Carry edits made straight to `index.html` back into the parts (see "Branches cut before the split") |
| `node tools/build_app.js --where 20000` | Which part holds `index.html` line 20000 (for a feedback report or a stack trace) |
| `node tools/build_app.js --map` | Every part with its line count (the session-start map prints this) |
| `node tools/build_hb3d.js` | Rebuild the 3D engine part from `src/hb3d/*`, then `index.html` |

## How it fits together

- `src/app/manifest.json` lists the parts in order. That order is the stitch order **and** the order the browser runs the code in, so moving code between parts can break start-up (for example `shell/state.js` must come before `shell/init.js`).
- Each part is a run of whole lines. Wrapper lines (`<style>`, `</script>`) stay in the part next to them; a part's extension names its main language.
- A part is found by its **anchor**: the start of one line (unique in the file) at most a few lines below the part's first line. No line numbers are stored, which is what lets `--absorb` re-split an edited `index.html`.
- `src/app/hb3d/engine.generated.html` is written by `tools/build_hb3d.js`. Edit `src/hb3d/*`, never this part.

## The parts

Folders: `shell/` (head, tokens, nav, sidebar, shared CSS, tabs, state, init, theme, footer), `hb3d/` (generated engine), `overview/`, `budget/`, `debt/`, `assets/` (one part per sub-tab: `cash`, `stocks`, `crypto`, `metals`, `liabilities`, `other`, plus their code), `house/`, `biz/` (Entrepreneur), `achievements/` (Wealth Roadmap), `network/`, `connections/`, `journey/`, `welcome/`, `paywall/` (prices live in `paywall/stripe-config.js`, `paywall/paywall.js`, `paywall/offer-modals.html`, `paywall/paywall.html`), `settings/`, `auth/` (sign-in, sync, your data; the publishable key is in `auth/auth.js`), `profile/`, `nw3d/`, `feedback/`, `help/`.

Run `node tools/build_app.js --map` for the full list with sizes. A tab's CSS, markup and code are often in different places in the page, so most tabs have several parts.

## Branches cut before the split

The split commit left `index.html` byte for byte the same, so an older branch merges or rebases onto it without conflicts in `index.html`. Then:

1. `node tools/build_app.js --absorb` (moves that branch's `index.html` edits into the parts by the anchors; an edit right at a boundary goes into the earlier part).
2. `node tools/build_app.js --check`, run the tests, commit the parts with `index.html`.

If an edit removed an anchor line, `--absorb` stops and names the part: change that part's `anchor` in `manifest.json` to another line near its start (unique in `index.html`) and run it again.

## Merge conflicts

`index.html` is committed, so it conflicts whenever a part does. Resolve the **parts**, run `node tools/build_app.js`, then `git add index.html`. Never hand-merge `index.html`.

## For Claude sessions

- The session-start map (`.claude/hooks/map.sh`) lists the parts. Grep `src/app`, not `index.html` (every hit would show twice).
- Tests still open `index.html`; `node tools/build_app.js --where N` turns a line number in a test or a report into a part and line.
- Tools that patch `index.html` (`tools/type_floor.js`, `tools/type_scale_hand.js`) run `--absorb` afterwards; after `tools/brand_colours.py index.html`, run it yourself.
- Test: `tests/test_app_build.js` (server test).
