# QA pass, 30 Oct 2026 (handover section 9)

Run on brand-rollout at 42471f4 with the classic hologram viewer as the default and the 3D net worth on. Both themes, 390 and 1100 px, plus the four phone widths for scrolling. Screenshots: `shots/brand/<tab>-<theme>-<width>.png` (build output, not committed).

| Check | Result |
| --- | --- |
| Night and Daylight render every main tab with readable text | Pass at a glance on Overview, Budget, House builder, Assets, Debt tracker, Achievements. One defect: see below. |
| Device preference followed on first visit; toggle persists | Pass (app: `tests/test_brand_identity.js`; sign-up page: `tests/test_signup_page.js`). |
| Tabs match the colour table, no dots | Pass (visual). |
| Icons from the sprite, token colours | Pass (visual; `tests/test_icons.js` where present). |
| House builder opening build animates from 0 to the saved % | Pass (classic viewer; brand build covered by `tests/test_hb_brand.js`). |
| Pulse, ring ping, sweep, scanlines | Brand build only (behind the Settings switch): pass in `tests/test_hb_brand.js`. |
| Orbit by mouse, touch, keyboard; vertical scroll still works on touch | Pass in tests; a real-device check is with the owner. |
| No sideways scroll at 320, 360, 390, 412 px on any tab, both themes | Pass (probe, 8 tabs x 4 widths x 2 themes, 0 px overflow). |
| Reduced motion: no orbit, sweep or ring; builds instant | Pass (`tests/test_hb_brand.js` section 4). |
| Brick value follows price and deposit % | Pass (`tests/test_hb_brand.js`, `tests/test_hb3d_app.js`). |
| Net worth scene: £1,000 blocks, £100 cubes, nine cubes merge; Graph and 3D toggle agree | Pass (`tests/test_nw3d.js`). |
| WebGL off: flat fallback, nothing throws | Pass (`tests/test_hb3d_app.js` fallback case). |
| Wordmark brick, Vault-It with a hyphen, favicon and PWA icon | Pass (`tests/test_brand_identity.js`, `tests/test_sw.js`). |
| No console errors; no new network hosts | Pass (probe and `tests/test_beta_client.js`). |

## Defects found

1. **Daylight, classic house viewer: the statusline strip under the viewport renders as a light band with near-invisible text** (seen at 832 px wide in Daylight; the 3D viewport itself stays Night by design, the caption strip below it does not). To fix: give `#hb3d-cap` / `.scene-cap` a Daylight-safe background and ink.
2. **Assets, 390 px: the 3D cash and metals stage shows as an empty dark box until its first frame** (slow software GL in the sandbox; check on a real phone that it fills within a second).

## Not checked here

- Lighthouse accessibility score (no browser tooling for it in the sandbox).
- Real-device feel of the brand build and the lite fallback (with the owner).
