# __FAMILY__

The Vault-It brand display typeface, by PT Live Design. A squared techno sans built from straight edges and 45 degree chamfers, like a brick or a vault door, with hatched extrusion faces running down and to the right. The big chamfers sit top-left and bottom-right, so every chamfer edge runs "/" and the face leans forward without being italic.

__FAMILY__ is for headings and the logo only. DM Sans is the body face.

Version __VERSION__. Licensed under the SIL Open Font License 1.1 (see `OFL.txt`), with "__FAMILY__" as the Reserved Font Name. Free to install and use in any software.

## Display only (owner, 12 Nov 2026)

On 12 Nov 2026 the owner dropped the six plain text styles (Light, Regular, Bold, and Condensed Light, Regular and Bold): "Drop them". __FAMILY__ now ships only as display cuts. The same day the owner set Heading (D+) for every heading, whatever its size. DM Sans covers body text, labels and figures; Share Tech Mono stays for small labels where the site already uses it. The plain font files are gone from `otf/`, `ttf/` and `woff2/`.

## The cuts

| Family name | Style | Weight | Width | Use | Files |
| --- | --- | --- | --- | --- | --- |
| __FAMILY__ Heading | Bold | 700 | Normal | Every heading (D+) | `__SLUG__-heading-bold` |
| __FAMILY__ Heading Condensed | Bold | 700 | Condensed | Headings in narrow spaces (D+) | `__SLUG__-heading-condensed-bold` |
| __FAMILY__ Hero | Bold | 700 | Normal | The hero line, 96 px and up (D++) | `__SLUG__-hero-bold` |
| __FAMILY__ Hero Condensed | Bold | 700 | Condensed | The hero line in narrow spaces, 96 px and up (D++) | `__SLUG__-hero-condensed-bold` |

- **__FAMILY__ Heading (D+): every heading, whatever its size.** Page and section titles, card titles, deck and comms headlines, and the net worth hero figure. Engraved bevel panels in the counters, one 45 degree seam, and hatched extrusion faces down-right. It stays legible down to about 18 px; below about 32 px the hatching softens into a thin shadow edge. Below 18 px, set the text in DM Sans.
- **__FAMILY__ Hero (D++): the hero line, 96 px and up.** One hero headline per page or slide. Adds a vent (two small slots in the main stem), a hairline HUD bracket off the top-left, and a deeper extrusion. When the line renders under 96 px, for example on a phone, switch it to Heading.
- The condensed widths carry the same detail for tight spaces such as deck titles or narrow cards.

All four are Bold 700 only, with small steps on G e a S 3 and a raised t foot. The detail is drawn into the letters in the text colour, so one colour works on any ground, Night or Daylight. The extrusion widens each letter slightly to the right.

## Files

Each cut ships in three formats, with the same outlines in each:

- `otf/`: CFF outlines, best for design apps on a computer.
- `ttf/`: TrueType, autohinted, best for Windows and Office.
- `woff2/`: compressed, for the web.

Plus `__SLUG__.css` (the web stylesheet), `OFL.txt` (the licence) and `specimen.html` (open it in a browser to see every cut, the waterfall and the character set).

## Install on a computer

Use the OTF files on a computer.

**macOS.** Double-click each `.otf` file in `otf/` and press Install Font in Font Book. Or select all four and drag them into Font Book.

**Windows 10 and 11.** Select the `.otf` files in `otf/`, right-click and choose Install for all users (or Install). If an older app does not show them, install the `.ttf` files from `ttf/` instead, not both. Restart Office or Figma desktop so the new fonts appear.

**Figma.** On the desktop app, install the files as above. In the browser, install the Figma font helper first. The families appear as __FAMILY__ Heading, __FAMILY__ Heading Condensed, __FAMILY__ Hero and __FAMILY__ Hero Condensed, each with one Bold style.

## Use on the web

Use the WOFF2 files on the web, through the stylesheet. Self-hosted only, no font CDN. Link it (paths inside are relative, so keep the folder together):

```html
<link rel="stylesheet" href="/brand/fonts/__SLUG__/__SLUG__.css">
```

It defines four custom properties, each with a DM Sans and system fallback:

- `--font-vf-heading`
- `--font-vf-heading-condensed`
- `--font-vf-hero`
- `--font-vf-hero-condensed`

and four helper classes:

- `.vf-heading`: Heading, Bold, line height 1.15. Put it on any heading.
- `.vf-heading-lg`: add at 40 px and up (letter-spacing -0.01em, word-spacing -0.03em). Go no tighter.
- `.vf-cut-heading`: the Heading cut on its own, without the line height.
- `.vf-cut-hero`: the Hero cut, 96 px and up.

For example:

```css
h1, h2, h3, h4 { font-family: var(--font-vf-heading); font-weight: 700; }
h1, h2         { letter-spacing: -0.01em; word-spacing: -0.03em; } /* 40 px and up */
.net-worth     { font-family: var(--font-vf-heading); font-weight: 700; font-variant-numeric: tabular-nums; }
.hero-title    { font-family: var(--font-vf-heading); font-weight: 700; font-size: clamp(36px, 9vw, 112px); }
@media (min-width: 1067px) { .hero-title { font-family: var(--font-vf-hero); } } /* 9vw reaches 96 px here */
body, label, button, input, table { font-family: "DM Sans", system-ui, sans-serif; }
```

Figures are tabular (all digits one width) by default, so a net worth figure does not jump as it counts. For a figure inside a headline use `font-variant-numeric: proportional-nums` (OpenType `pnum`). The minus sign (U+2212) is longer than the hyphen; use it for debt, for example `−£300`. Small figures, stat strips and tables are DM Sans.

Vertical metrics give a default line height of 1.2 with the cap height centred in the line, so accents never clip.

## Where to use it

Use for: every heading, the hero line, the net worth hero figure, deck and comms headlines.

Do not use for: body copy, labels, buttons, form inputs, tables, small figures or the FCA disclaimer line. Those are DM Sans.

## The logo

The Vault-It wordmark is drawn from the Heading (D+) outlines, with the hyphen drawn as the brand brick. **Vault** takes the text colour; the brick and **It** are teal. The files are in `brand/logo/`: `vault-it-wordmark-night.svg` and `vault-it-wordmark-daylight.svg` (with ground) and `-transparent` versions. See `brand/logo/README.md`. The wordmark is artwork: use the SVG files and do not retype it in the font. Below about 32 px tall its hatching softens into a thin edge; check it in place before using it under 24 px.

## Character set

226 glyphs in each cut: full printable ASCII and the whole Latin-1 supplement (including soft hyphen, ¤, ¹ ² ³ and ¼ ½ ¾), plus € ‰ † • …, curly and low quotes, single guillemets, minus, en and em dash, and Œ œ Š š Ž ž Ÿ ı. Proportional figure alternates (`pnum`) and kerning (`kern`) are built in.

## Rebuild

```sh
pip install fonttools shapely numpy brotli ttfautohint-py
python3 source/build_vault_form.py
```

Every glyph is drawn from code in `source/build_vault_form.py`. To rename the family, change `FAMILY` at the top of that script and rebuild: file names, PostScript names (__PSFAMILY__Heading-Bold and so on), CSS family names, this README, the specimen and the Reserved Font Name all follow. Open `specimen.html` to check the result.
