# Brand typeface swap list (held until the owner signs off Vault-form)

Status: the new typeface ("Vault-form", queue line "Vault-form brand typeface") is **not final**. Fonts stay Syne, DM Sans and Share Tech Mono until the owner signs it off. This is the checklist for the swap, so it is one pass when the word comes.

**Scope update (owner, 13 Nov 2026): Vault-form is for dashboard figures only** (Heading cut at 18px and up, Hero cut at about 64px and up). Headings, labels, body, nav and the logo are not swapped, so most of the list below shrinks to the figure styles. The app build is its own queue item.

## Brand files (stage 1, brand and docs only)
- `brand/vault-it-brand-book.html`: `--font-display` in `:root` (about line 37); the Google Fonts link at the top (replace with an `@font-face` for `brand/fonts/vault-form/` WOFF2, no new outside host; DM Sans and Share Tech Mono stay); the export generators `cssOut`, `jsonOut`, `twOut`; the social canvas fonts (`800 ... 'Syne'`).
- Type section: rewrite the lede, the display specimen note and the table rows (new weights; add Condensed and the hatch display cuts for hero and decks only, never below the size where the hatch breaks). Add the licence line and an "Install the font" download.
- `brand/vault-it-tokens.css`, `brand/vault-it-tokens.json`, `brand/tailwind.vault-it.js`: font family.
- `brand/ECD_BRIEF.md` fonts rule, `brand/vault-it-brand-handover.md` section 3 and Phase 2.
- The wordmark is drawn artwork: change it only if the owner says so.

## App and site (stage 2, needs ship-item and rollout-qc)
- About 251 hard-coded `'Syne'` references in 55 files under `src/app/`, plus `landing.html`, `site/sign-up/*`, `site/pete/index.html`, `site/pitch-eligent/*`, `tools/type_floor.js`.
- Update the fonts rule in `CLAUDE.md` at the same time, not before.

## Checks
- Nav labels and buttons still fit (condensed may recover space).
- 10.5px floor holds; hatch cuts are display only.
- The lining-figures fix in `src/app/shell/tokens.css` is Syne-specific: keep or drop depending on the font.
