# Brand rollout: handover from the branch-creation thread

State of `brand-rollout` when the first thread stopped (30 Oct 2026). Read with `brand/ECD_BRIEF.md` (the creative direction and the owner's answers), `brand/AUDIT_AND_PLAN.md` (audit, Level 2 bug analysis, grouping list) and `brand/vault-it-brand-handover.md` (the brand brief).

## Done and pushed

| Commit | What |
| --- | --- |
| Brand package | Uploads moved into `brand/`, app README restored, rollout rules appended to `CLAUDE.md` |
| Phase 1 | Tokens for Night and Daylight (`<style id="vi-tokens">`, identical to `brand/vault-it-tokens.css`) plus `--*-rgb` triplets; old variable names are aliases; first visit follows the device, then `vi-theme` is remembered; header toggle `#vi-theme-btn` (`viToggleTheme`, fires a `vi-theme` event); `tools/brand_colours.py` moved about 1,000 hard-coded CSS colours to tokens (style blocks, style attributes, `el.style`); canvas and SVG attribute colours were **not** touched |
| Phase 2 | Playfair Display and DM Mono removed; sprite inlined after `<body>` (`#vi-*`, metadata stripped); text glyphs in markup (close, edit, plus, undo, check, chevrons) are sprite icons; stroke weights 1.1 / 1.5; footer build string hidden; high-contrast setting theme-safe |
| Phases 3 and 4 | Menu bar: `#vi-tabs` strip, sprite icon per tab in its colour (`--tc`), thin neon outline on the selected tab only, House builder's permanent gold underline removed (USP badge only), Network tab `hidden` (code kept), two-row header at every width, compact = icons only, phones and tablets start compact (`loadDensity`), Compact / Wide on small screens. Styles in `<style id="vi-nav">` before `</head>` |
| Phase 5 (part) | Assets sub-tabs: sprite icons, sentence case, colours metals gold, crypto teal, cash green, other purple, liabilities amber, stocks green 2 (`data-sub`, `--sa`, `--sa-rgb`); liabilities amber on overview KPI, summary card and net worth history; debt charts use `debtChartPalette` (red ramp); canvas helpers `viCss(name)`, `viRgba(name,a)`, `viLight()` |

Screenshots: `node tests/brand_shots.js [tab ...]` writes `shots/brand/<tab>-<night|daylight>-<390|1100>.png`.

## Notes for the next thread

- **Test browsers report a light device**, so tests now open in Daylight. `test_bd_debt` was updated to accept either theme's green. Any other test that checks a Night colour needs the same treatment.
- `test_cc3d` reads `shots/hb1.png` written by `test_hb1`; run them together or it fails with ENOENT (not a brand regression).
- Tests that passed after these changes: test_overview, test_beta_client, test_safe, test_hb3d_levels, test_reset, test_resp, test_zoom, test_roadmap, test_fund, test_bd_debt, test_history, crawl, xss, xss2, xss_attr. The full suite has **not** been run yet.

## Still to do (in this order)

1. **Rest of phase 5, colour code:** charts Net worth teal, Debt red, Income gold, Forecast teal dashed (`drawChart`); gold means now, brass means achievement; Budget spending ramp per the brief.
2. **Daylight polish (brief phase 7):** canvas and SVG colours still use Night values. Main gaps seen in screenshots: the 3D stages (house builder, metals) keep a dark background, the Level chips' gold text is faint, and KPI numbers have a blurry glow. Use the `viCss` helpers and redraw on the `vi-theme` event.
3. **Logo and wordmark (brief phase 8):** 23 "Vault-It" with a hyphen in `index.html`; the nav logo, `<title>`, `og:title`, the manifest and the favicon; tagline "Get out of the red and into your home."
4. **Groupings (all approved):** H1 to H4, O1, O2, D1 to D3, A1 (`brand/AUDIT_AND_PLAN.md`, section 4).
5. **House builder Level 2 fix**, with the owner's rule: Level 2 house = price minus deposit goal; money over the goal builds it (£2,000 over on £100,000 at 20% = 2.5%); payments after purchase lower `mortgageBalance`; Reset returns to a clean Level 1 (clear `houseMode`, `mortgageActive`, `mortgageBalance`, `purchase`, `valuation`, `level3`, `viewLevel`, keep a backup in `vi_bak_ht3`); Undo purchase; dropping below the goal returns to Level 1. Wire the existing mortgage engine (`hbcRead`, `hbL2Sims`) into a Level 2 cockpit, and add overpayment what-ifs from the Budget's spare (`hbBudget()`: a quarter, half and all, rounded to £10): "+n bricks a month, x sooner, £z less interest", with the trade-off line. Update `docs/HOUSE_BUILDER_LEVELS_SPEC.md` and add tests.
6. **House builder look (owner chose option a):** port the brand engine's look and every animation (opening build, brick drop with gold flash and settle, last brick ringed, slice and ROW tag, pulse, grid, ping, sweep, Daylight blueprint) onto all six three.js models in `src/hb3d`, then rebuild with `node tools/build_hb3d.js`. Brick value `depositTarget * 0.77 / bricksTotal`.
7. **Overview hero, net worth in 3D:** `ViEngine.makeTracker` with Graph | 3D blocks toggle, **3D blocks by default**, then remember the choice; real series via `setData`. Blocks are colour coded by asset class to match the sub-tabs (cash green, metals gold, stocks green 2, crypto teal, wealth inventory purple, deposit teal; liabilities amber and debts red below the plane). One stat strip under it.
8. **Owner wants these on by default for testers** (no flag gate once signed off on the phone), old builder reachable from Settings for a week.
9. `landing.html` brand pass, then a working service worker (the current one is registered from a `blob:` URL, which browsers refuse) and a cache version bump.
10. Full test suite and the QA list in section 9 of the handover before any release. Releases only when the owner asks.
