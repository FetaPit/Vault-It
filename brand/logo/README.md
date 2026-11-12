# Vault-It wordmark (Vault-form D+)

Owner, 12 Nov 2026: "Retry the Vault-It logo with this type of font but keep the same colour scheme", then chose **D+ normal width**.

- Drawn from the Vault-form Heading (D+) outlines: hatched 3D side faces and seams. The hyphen is drawn as the brand brick (.3em by .17em, lifted .06em), extruded like the letters.
- Colours: **Vault** in the text colour, the **brick and It** in teal.
  - Night: Vault `#E8E8E8`, brick and It `#44C0B9`, ground `#080808`.
  - Daylight: Vault `#06161A`, brick and It `#007F7B`, ground `#F3F7F6`.
- Files: `vault-it-wordmark-night.svg`, `vault-it-wordmark-daylight.svg` (with ground) and `-transparent` versions.
- Rebuild: `python3 brand/fonts/vault-form/source/build_wordmark.py`.
- Small sizes: the hatching softens into a thin edge below about 32 px tall. It stays legible; check in place before using it under 24 px.
- Not yet wired into the site or app; that goes through ship-item.
