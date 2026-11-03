# v0.7 final round: motion and fidelity spec from the brand book (Pedro, CD)

Source: brand/vault-it-brand-book.html at candidate/v0.7 (line numbers in that file). Read from code, not watched rendering.

Key finding: the brand book's sharp look is not GL lines. It is a per-face bevel drawn in the fragment shader (FS_SRC 1534) plus a 1 px 2D wireframe at screen pixel ratio. Pedro's earlier LineMaterial advice (A1) is withdrawn: match the shader.

1. Brick drop (VS 1501 to 1504; stagger 1594)
- Distance 6 world units (a course is 1 unit; brickBox 1406). Duration 380 ms. Easing ease-out cubic: drop = (1-d)^3 x 6. Alpha smoothstep(0,.5,d), fully visible at 190 ms.
- Stagger per batch of NN new bricks per group (walls, gables, chimney): min(120 ms, 900 ms / NN). Over 60: gap 0, whole batch together. No drop when not primed (first frame), with noFlash or with reduced motion: bricks appear in place.
- Cadence: p += (target - p) x min(1, dt x 1.7) (makeStage 1740), snapping within .0003. New bricks arrive spread over frames: this is what reads as smooth laying.
- Roof tiles (1508, 1509): drop 5 units across a 5-tile window; tile flash uTF fades over 900 ms (1602).

2. Gold flash (1503, FS 1535): Night [.91,.77,.42], Daylight [.87,.64,.1]; mix .9 at peak to 0 linearly over 1100 ms; alpha +.2 x flash.

3. Last brick (VS 1504, 1512; FS 1536; 2D 1682 to 1688)
- Brick x1.14, colour mixed .88 to (1,.94,.64) x (1.08 + .3 x pulse), alpha 1.
- Ring (8 + 4 x pulse) x ls px at 1.8 px, ls = clamp(width/760, .7, 1.4); four 7 x ls px ticks; planeS gold.
- Label "BRICK #n", Share Tech Mono clamp(width x .017, 10, 13) px, gold; chip rgba(8,8,8,.72) radius 4 (Daylight rgba(255,255,255,.9)).
- Gold slice (1675 to 1678): plane at the last brick's height, 14 units outside the walls, fill planeFA (.11 Night, .24 Daylight), stroke .95 at 1.6 px, 14 px blur in Night; fades out 97 to 100%.

4. Sweep and pulse
- Pulse .5 + .5 x sin(t x .002244) (2800 ms). Colour x (.95 + .1 x pulse); front alpha + .06 x pulse x built (FS 1537, 1540).
- Sweep (1640, FS 1538): y = (t x 20 mod (TOP + 40)) - 10 (20 courses a second, about 9.7 s cycle); half-width 6 units, mixed .5 to sheen.
- Ring ping (1618): every 2800 ms a rectangle grows 75 units at 2 px, alpha (1 - ping) x (.1 + .4 x seg(p,.5,1)), only above 5%. It is TEAL, not gold, and about 10% at low progress (correction to Pedro's A2 note). Exception kept: it runs in lite mode.
- Finished house (1679 to 1681): gold crosshair pulsing on a 260 ms sine.

5. Orbit (1714 to 1729; makeStage 1741, 1754 to 1758)
- Yaw .008 rad per px drag, direct (no inertia, no damping). Pitch .006 rad per px, mouse only (touch turns yaw only), clamp .1 to 1.2.
- Keys yaw +/-.12, pitch +/-.06, zoom x1.12. Buttons zoom x1.15. Zoom .7 to 1.6.
- Auto-rotate .12 rad/s, 2500 ms after the last touch, off with reduced motion. Reset yaw -.62, pitch .32, zoom 1, distance 370 (1707).

6. Render loop (1735 to 1750; glr 1547 to 1550)
- rAF only while an IntersectionObserver (threshold .01) says visible; no idle sleep while visible. No frame cap on the hero (30 fps on the motion demo, 1738).
- Pixel ratio min(innerWidth < 700 ? 1.5 : 2, devicePixelRatio): an unfolded fold gets 2 (the app uses 1.25 on phones).
- WebGL2, or WebGL1 with ANGLE_instanced_arrays; antialias true, premultipliedAlpha.
- One instanced draw into an offscreen canvas, then drawImage onto a 2D canvas holding the ground underlay (1670). Passes: back faces (cull front, no depth, uBack), front faces with depth, glass at .8 alpha without depth write.

7. Edges and alpha (FS 1530 to 1541; THG 1581 to 1584)
- Bevel: ed = distance to face edge (world units), bev = smoothstep(0,.07,ed), col = mix(col, uEdge x (.6 + .4 x sh), (1 - bev) x uEdgeK).
- uEdge [.01,.1,.1], edgeK .62 Night; white, .8 Daylight. Light dir (-.45,.7,.55), sh = shMin + (1 - shMin) x lambert, shMin .5 Night / .62 Daylight; colour x (.9 + .2 x seed).
- Alpha front .88 / back .09 Night; .97 / .10 Daylight. 2D wire T.wire at 1 px; rafters 1.6 px.

8. Palettes (THG 1582, 1583; 0 to 1 RGB)
- Night: brick .267,.753,.725 (#44C0B9); trim .46,.84,.80; tile .2,.62,.74; frame .78,.93,.92; glass .02,.2,.22; lit glass .96,.78,.42; door .04,.24,.26; sheen .75,.98,.96; glow and grid teal, alpha .24 / .30; wire rgba(68,192,185,.34); rafter rgba(120,230,222,.85); plane gold, planeFA .11, blur 14.
- Daylight: brick .09,.49,.47; trim .82,.9,.89; tile .17,.39,.55; frame 0,.4,.38; glass .66,.8,.84; lit glass 1,.84,.4; door .24,.44,.46; glow and grid [0,127,123], alpha .12 / .24; wire rgba(0,110,106,.55); rafter rgba(0,118,114,.95); planeS [150,108,0]; planeFA .24.

9. Ground (1606 to 1617)
- Radial glow radius 62 x 2.2 x scale x 1.7, stops glowA, x.3 at 60%, 0; flattened by max(.3, sin(pitch)).
- Grid 11 x 11 lines, 30 units apart, +/-150 units, 1 px, alpha gridA x (1 - |i|/6.5).
- Site boundary dashed 8/6, 20 units outside the walls, .55 at 1.2 px, fading in 0.5 to 3%. Footprint fill .14, stroke .75 at 1.4 px.
- Stages: bricks 3 to 80%, rafters 60 to 80%, tiles 80 to 88%, windows 88 to 93%, lights 93 to 96%, finishing 96 to 100%.

10. Reduced motion and no WebGL
- Reduced motion: p jumps to target; no drops, no flash, pulse fixed .5, no ping, no sweep, no auto orbit.
- No WebGL or no instancing: glr() null, renderHouse2D (1283) paints the same house in canvas 2D, still animated. Lost context resets so it retries. Never blank.

ASK (open, for the owner): in Daylight the brand book switches the house to the THG light palette; the app keeps 3D viewports in Night (index.html:19). (a) Keep Night-in-Daylight and compare Night only (recommended: the owner's earlier decision). (b) Use THG light inside the house viewport.

## Done means (app against brand book, side by side)
- Harness: same terrace model in both, frozen clock (performance.now stubbed via tools/shot.js --js), same canvas size and DPR; captures at 390 and 884 (fold).
- Single brick: frames at 0, 95, 190, 380 and 1100 ms after stamping match (pixel diff under 2% in the house region); drop end and flash end within +/-10% (380 +/-38 ms, 1100 +/-110 ms).
- Batch: a 39-brick deposit shows the min(120, 900/NN) gap within +/-10%; a 61-brick batch drops together.
- playBuild 0 to 1: frames at 25, 50, 80, 88, 93 and 100% show the same stage and the same ROW n / 154.
- Palette: uniforms read back with gl.getUniform equal THG Night exactly; uEdgeK, uFrontA, uBackA match.
- Sweep and pulse at t = 1000 and 2400 ms within +/-10%; the ping at 1400 ms the same size and alpha.
- Orbit: a scripted 300 px drag over 1 s at fold width (or CPU 4x) gives no frame over 33 ms and p95 of 20 ms or less; 2x zoomed crops show no stepped edges and the same bevel width.
- Reduced motion: final frame only, no ping or sweep. WebGL off: the 2D painter shows the same house, never blank.
