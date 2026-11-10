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
| Vault-form Hatch | Bold | 700 | Normal | `vault-form-hatch-bold` |
| Vault-form Condensed Hatch | Bold | 700 | Condensed | `vault-form-condensed-hatch-bold` |

Each style ships as `otf/` (CFF outlines, best for design apps), `ttf/` (TrueType, autohinted, best for Windows and Office) and `woff2/` (web). The OTF and TTF outlines are the same points.

Regular and Bold are style-linked inside each family, so the Bold button and CSS `font-weight: 700` pick the real Bold, never a faux bold. Light appears as its own entry ("Vault-form Light") in older Windows menus and as a style of "Vault-form" in macOS, Figma and Adobe apps.

## Install on a computer

**macOS.** Double-click each `.otf` file in `otf/` and press Install Font in Font Book. Or select all eight and drag them into Font Book.

**Windows 10 and 11.** Select the `.ttf` files in `ttf/`, right-click and choose Install for all users (or Install). Restart Office or Figma desktop so the new fonts appear.

**Figma.** On the desktop app, install the files as above. In the browser, install the Figma font helper first. The families appear as Vault-form, Vault-form Condensed, Vault-form Hatch and Vault-form Condensed Hatch.

## Use on the web

Self-hosted only, no font CDN. Link the stylesheet (paths inside it are relative, so keep the folder together):

```html
<link rel="stylesheet" href="/brand/fonts/vault-form/vault-form.css">
```

Then use the custom properties it defines:

```css
h1, h2, h3     { font-family: var(--font-vf-display); font-weight: 700; }
.hero-number   { font-family: var(--font-vf-figures); font-weight: 700; font-variant-numeric: tabular-nums; }
.tab-label     { font-family: var(--font-vf-label); text-transform: uppercase; letter-spacing: 0.06em; }
.deck-headline { font-family: var(--font-vf-hatch); font-weight: 700; font-size: clamp(48px, 8vw, 120px); }
body           { font-family: "DM Sans", system-ui, sans-serif; } /* body copy stays DM Sans */
```

Figures are tabular (all digits one width) by default, so money columns line up. For figures inside running text use `font-variant-numeric: proportional-nums` (OpenType `pnum`). The minus sign (U+2212) is longer than the hyphen; use it for debt, for example `−£300`.

Vertical metrics give a default line height of 1.2 with the cap height centred in the line, so labels sit centred in buttons and accents never clip.

## Where to use it

Use for: display headings (it replaces Syne), the net worth hero, stat-strip figures, tab labels at 12 px and up, deck and comms headlines.

Do not use for: long body copy, the FCA disclaimer line, form inputs, dense tables of text. DM Sans stays the body face. Share Tech Mono stays for labels under 12 px.

Hatch cuts: only at 48 px and up, for the hero number, one headline per screen, or the tagline on decks. Never in tables, buttons or labels. The hatch is cut out of the letter, so it takes whatever colour or ground sits behind it. Below 48 px it fills in and reads as plain Bold, by design.

The Vault-It wordmark and brick hyphen stay as artwork. Do not reset the logo in this font.

## Character set

219 glyphs: full printable ASCII, £ € ¢ ¥, curly quotes, ellipsis, bullet, minus, en and em dash, × ÷ ± °, © ®, guillemets, non-breaking space, and Western European accented letters (Latin-1 plus Œ œ Š š Ž ž Ÿ). Proportional figure alternates (`pnum`) and kerning (`kern`) are built in.

## Rebuild

```sh
pip install fonttools shapely numpy brotli ttfautohint-py
python3 source/build_vault_form.py
```

Every glyph is drawn from code in `source/build_vault_form.py`. To rename the family, change `FAMILY` at the top of that script and rebuild: file names, PostScript names (Vaultform-Bold and so on), CSS family names, this README, the specimen and the Reserved Font Name all follow. Open `specimen.html` to check the result.
