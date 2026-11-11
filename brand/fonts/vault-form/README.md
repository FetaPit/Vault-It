# Vault-form

The Vault-It brand typeface, by PT Live Design. A squared techno sans built from straight edges and 45 degree chamfers, like a brick or a vault door. The big chamfers sit top-left and bottom-right, so every chamfer edge runs "/" and the face leans forward without being italic.

Version 1.000. Licensed under the SIL Open Font License 1.1 (see `OFL.txt`), with "Vault-form" as the Reserved Font Name. Free to install and use in any software.

## Styles

| Family name | Style | Weight | Width | Files |
| --- | --- | --- | --- | --- |
| Vault-form | Light | 300 | Normal | `vault-form-light` |
| Vault-form | Regular | 400 | Normal | `vault-form-regular` |
| Vault-form | Bold | 700 | Normal | `vault-form-bold` |
| Vault-form Condensed | Light | 300 | Condensed (about 78%) | `vault-form-condensed-light` |
| Vault-form Condensed | Regular | 400 | Condensed | `vault-form-condensed-regular` |
| Vault-form Condensed | Bold | 700 | Condensed | `vault-form-condensed-bold` |
| Vault-form Heading | Bold | 700 | Normal | `vault-form-heading-bold` |
| Vault-form Heading Condensed | Bold | 700 | Condensed | `vault-form-heading-condensed-bold` |
| Vault-form Hero | Bold | 700 | Normal | `vault-form-hero-bold` |
| Vault-form Hero Condensed | Bold | 700 | Condensed | `vault-form-hero-condensed-bold` |

Each style ships as `otf/` (CFF outlines, best for design apps), `ttf/` (TrueType, autohinted, best for Windows and Office) and `woff2/` (web). The OTF and TTF outlines are the same points.

Regular and Bold are style-linked inside each family, so the Bold button and CSS `font-weight: 700` pick the real Bold, never a faux bold. Light appears as its own entry ("Vault-form Light") in older Windows menus and as a style of "Vault-form" in macOS, Figma and Adobe apps.

## Install on a computer

**macOS.** Double-click each `.otf` file in `otf/` and press Install Font in Font Book. Or select all ten and drag them into Font Book.

**Windows 10 and 11.** Select the `.ttf` files in `ttf/`, right-click and choose Install for all users (or Install). Restart Office or Figma desktop so the new fonts appear.

**Figma.** On the desktop app, install the files as above. In the browser, install the Figma font helper first. The families appear as Vault-form, Vault-form Condensed, Vault-form Heading, Vault-form Heading Condensed, Vault-form Hero and Vault-form Hero Condensed.

## Use on the web

Self-hosted only, no font CDN. Link the stylesheet (paths inside it are relative, so keep the folder together):

```html
<link rel="stylesheet" href="/brand/fonts/vault-form/vault-form.css">
```

Then use the custom properties it defines:

```css
h1, h2, h3     { font-family: var(--font-vf-display); font-weight: 700; }
h1, .display   { letter-spacing: -0.01em; word-spacing: -0.05em; } /* 40 px and up; go no tighter */
.hero-number   { font-family: var(--font-vf-figures); font-weight: 700; font-variant-numeric: tabular-nums; }
.tab-label     { font-family: var(--font-vf-label); text-transform: uppercase; letter-spacing: 0.06em; }
.section-title { font-family: var(--font-vf-display); font-weight: 700; }  /* plain Bold below 48 px */
@media (min-width: 900px) { .section-title { font-family: var(--font-vf-heading); font-size: 56px; } } /* Heading only once it renders at 48 px+ */
.hero-title    { font-family: var(--font-vf-hero); font-weight: 700; font-size: 120px; }  /* Hero only at 96 px+ */
body           { font-family: "DM Sans", system-ui, sans-serif; } /* body copy stays DM Sans */
```

Figures are tabular (all digits one width) by default, so money columns line up. For figures inside running text use `font-variant-numeric: proportional-nums` (OpenType `pnum`). The minus sign (U+2212) is longer than the hyphen; use it for debt, for example `−£300`.

Vertical metrics give a default line height of 1.2 with the cap height centred in the line, so labels sit centred in buttons and accents never clip.

## Where to use it

Use for: display headings (it replaces Syne), the net worth hero, stat-strip figures, tab labels at 12 px and up, deck and comms headlines.

Do not use for: long body copy, the FCA disclaimer line, form inputs, dense tables of text. DM Sans stays the body face. Share Tech Mono stays for labels under 12 px.

Display cuts (owner, 11 Nov 2026: "D++ for hero, D+ for headings"). Both are Bold only, slightly wider than the text Bold, with small steps on G e a S 3 and a raised t foot. Never in body copy, tables, buttons, labels or the app UI.

- **Vault-form Heading (D+): 48 px and up.** Section headings, deck titles, comms headlines. Engraved bevel panels in the counters, one 45 degree seam, and hatched extrusion faces down-right.
- **Vault-form Hero (D++): 96 px and up.** One hero headline per page or slide. Adds a vent (two small slots in the main stem), a hairline HUD bracket off the top-left, and a deeper extrusion.
- Below the floor, use plain Vault-form Bold. Size the switch to the rendered size with media queries or `clamp()`, so a Hero headline that shrinks on a phone drops to Heading (48 px and up) or to plain Bold. The detail is drawn into the letters in the text colour, so one colour works on any ground. The extrusion widens each letter slightly to the right; tracking is built in, so do not tighten these cuts.

The Vault-It wordmark and brick hyphen stay as artwork. Do not reset the logo in this font.

## Character set

226 glyphs: full printable ASCII and the whole Latin-1 supplement (including soft hyphen, ¤, ¹ ² ³ and ¼ ½ ¾), plus € ‰ † • …, curly and low quotes, single guillemets, minus, en and em dash, and Œ œ Š š Ž ž Ÿ ı. Proportional figure alternates (`pnum`) and kerning (`kern`) are built in.

## Rebuild

```sh
pip install fonttools shapely numpy brotli ttfautohint-py
python3 source/build_vault_form.py
```

Every glyph is drawn from code in `source/build_vault_form.py`. To rename the family, change `FAMILY` at the top of that script and rebuild: file names, PostScript names (Vaultform-Bold and so on), CSS family names, this README, the specimen and the Reserved Font Name all follow. Open `specimen.html` to check the result.
