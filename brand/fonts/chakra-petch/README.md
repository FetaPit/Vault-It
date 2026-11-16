# Chakra Petch

Headlines and titles for Vault-It (owner, 13 Nov 2026: "B definitely for headline and titles"). Light (300) on the Level pills.
Vault-form stays for dashboard figures only; DM Sans for body text; Share Tech Mono for small labels.

- `chakra-petch-300.woff2` Light, `chakra-petch-400.woff2` Regular, `chakra-petch-700.woff2` Bold. Latin subset (covers £).
- Source: the Chakra Petch Project Authors (Cadson Demak), via the npm package `@fontsource/chakra-petch` 5.3.0, the same files Google Fonts serves.
- Licence: SIL Open Font License 1.1, in `OFL.txt`. Self-hosted: web pages embed these files (`tools/embed_brand_fonts.js`), so no outside font host is needed.

## Chakra Petch Figures (trial, owner 16 Nov 2026: "Try Chakra Petch for the numbers. I do not like Vaultform")

`chakra-petch-figures-400.woff2` and `chakra-petch-figures-700.woff2`: the same font with fixed-width (tabular) digits, so columns of money
line up. Chakra Petch has no tabular figures of its own. Made by `source/make_figures.py` from the files above (digits centred on the widest
digit's advance: 628 units Regular, 652 Bold); renamed "Chakra Petch Figures" as a modified version (OFL 1.1, no Reserved Font Name).
Use: `font-family:"Chakra Petch Figures","Chakra Petch",...` at 700 for dashboard figures 18 px and up, a true minus sign (U+2212) for debt, no glow.
