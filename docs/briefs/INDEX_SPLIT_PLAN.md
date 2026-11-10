# Index split: plan (approved shape, build not started)

Queue item: "Split index.html before v0.95". Owner, 9 Nov 2026: option 1 (source parts that still build one `index.html`); do the v0.9.4 round first, then the split, ahead of Entrepreneur 2 to 5; split `brand-rollout`; CLAUDE.md and `.claude/` edits approved.

## Shape
- `src/app/<tab>/` folders (overview, budget, debt, assets, house, biz, network, connections, achievements, journey, welcome, paywall, settings, auth, profile, help, feedback, nw3d), `src/app/shell/` for head, nav, shared CSS and start-up, `src/app/hb3d/engine.generated.html` for the generated 3D block.
- 120 parts, split only at line boundaries, joined with no separators. Ranges in `INDEX_SPLIT_PARTS.txt` (start line and part path) are for `brand-rollout` at 7842583 (29,834 lines). Re-derive them on the trunk at build time by each section's title line, not by number.
- Manifest `src/app/manifest.json`: ordered `{file, anchor, offset}`; order is stitch order and runtime order. Anchors are unique line prefixes, no line numbers.

## tools/build_app.js
- default: join parts, write `index.html` only if bytes differ.
- `--check`: exit 1 on any difference (first differing line mapped to its part), on CR or BOM, missing final newline, files not in the manifest, duplicate or out-of-order anchors, or not exactly one HB3D block.
- `--absorb`: re-split an updated `index.html` into parts by anchors (for branches cut before the split).
- `--init <ranges>`: one-off split. `--where N`: index.html line to part. `--map`: listing for `map.sh`.
- `build_hb3d.js` writes the part, then calls `build()`. `build_site.js` calls `check()` and copies the committed file.
- `.gitattributes`: `index.html text eol=lf`, `src/app/** text eol=lf`.

## Tests and CI
- `tests/test_app_build.js` (server test): byte identity, manifest matches files, hygiene, anchors re-derive the same parts, one HB3D block. Written first, fails before the split.
- `ci.yml` server job: `node tools/build_app.js --check` after `npm ci`. `run-tests.sh`: build locally, check in CI.
- Proof of no change: sha256 of `index.html` and `dist/app/index.html` before and after.

## Other edits
`.claude/hooks/map.sh`, `qc-gate.sh` (run `--check` when `src/app/` or `index.html` is staged), agent notes (scout, grunt, architect, rollout-qc), CLAUDE.md, `docs/APP_SOURCE.md` (new), `docs/MULTI_SESSION.md` (rebase then `--absorb`), `docs/HB3D_KIT.md`, `tests/README.md`, release skill, `package.json` scripts, `tools/type_floor.js` and `tools/type_scale_hand.js` (absorb after writing).

## Order
1. v0.9.4 round lands on brand-rollout. 2. Announce the 24-hour index.html freeze. 3. Build on this branch: test, build script, `--init`, wiring, docs. 4. Server tests locally, full suite green in CI on the exact commit. 5. ship-item and rollout-qc. 6. Merge with the owner's yes. Never `release/pioneer-v2`.
