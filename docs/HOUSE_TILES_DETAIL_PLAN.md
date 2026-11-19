# House type tiles: "more detail" plan (for the owner to decide)

Owner, 19 Nov 2026: "...make the circle the whole design remove the outer card and add more detail into each". The circle is done (v09x/house-tiles). This is the plan for the detail; nothing in the 3D engine has changed yet.

## What shows at about 95 px (a phone tile)
- **A. Real material colours** (red brick, slate roof, white frames, coloured door), the Level 2 look. Every part already carries its colour (`src/hb3d/house_gl.js` 207-213); the tiles switch it off (`uVc = -1`, `house_gl.js` 961). Most visible gain.
- **B. Sharper canvas.** Phones are capped at pixel ratio 1.5 (`src/app/welcome/house-tiles.js`); 2 makes windows and roof lines crisper.
- **C. Garden** (path, fence, wall, plants). Only in the full model (`src/hb3d/kit.js` 84, 1562-1588). Partly visible, but the camera pulls back so the house gets smaller.
- **D. Sills, letterboxes, chimney pots.** Windows, doors, chimneys and bays are already there; a sill is about 1 px at this size. No gain.

## Phone cost
- **A:** no new parts, no build time; one setting. Brickwork may look muddy from edge shading (one setting, `house_gl.js` 965).
- **B:** about 1.8x the pixels (still under 0.5 MP); a tile only redraws when it moves.
- **C:** about 700 to 2,400 extra parts per house (6,300 for the terrace). Main thread stays about 30 ms, but the six tiles take longer to go live. Needs a new tiles-only detail level in the kit; the House builder's clean model must not change (brick value comes from its brick count). Engine work, on Opus.

## Recommendation
**A + B, about 3 to 4 hours** with tests (`test_onboarding_tiles_3d test_house_tiles_circle test_hb3d_levels test_hb3d_scale`, one new check that the tiles draw in colour, shots at 390 and 1100 Night and Daylight, the 6x CPU timing run). Decision for the owner: full colour is the "fully paid" Level 2 look; the still picture shown before each 3D tile may need repainting to match. **C** as a later queue item, about a day.
