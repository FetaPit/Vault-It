# HB3D Kit — how to build a house model

Source: `src/hb3d/kit.js` (pure JS, no THREE), `src/hb3d/viewer.js` (Three.js r128 renderer), models in `src/hb3d/models/<type>.js`.
Reference model to copy patterns from: **`src/hb3d/models/terraced.js`** (Victorian mid-terrace, ~26k bricks).

## Conventions
- Metres. **Y up**. X along the street frontage (left→right seen from the street). **Front façade on z = 0, facing +Z**; the building sits at z ≤ 0; front garden/street at z > 0.
- Finished ground level y = 0. DPC y = 0.150. Brickwork starts at y0 = −0.15 (two courses below ground).
- Course height `UK.CH = 0.075`; storey (house) = 35 courses = 2.625; brick 0.215 × 0.065 × 0.1025, joint 0.010 (coordinating 0.225 × 0.075 × 0.1125). Keep wall heights, opening sills/heads and widths on the brick module where sensible (multiples of 0.075 vertically, 0.1125 horizontally).
- A model is `HB3D.models.<type> = function (K, opts) { …; return { name, info } }`. `opts.floor` (1-based) is passed for flat/apartment.

## Build stages (`K.stage(key)` sets the current stage; t is assigned by insertion order inside each stage)
`setout .00–.03 · found .03–.10 · slab .10–.12 · masonry .12–.50 · roofframe .50–.60 · roofcover .60–.72 · fitout .72–.80 · external .80–.95 · snag .95–1`.
Insert things in the order a builder would (bottom-up courses; floors/scaffold lifts via `hooks` of `wallLoop` so they appear when the walls reach them). Most helpers set their own stage and restore `masonry`.

## Primitives (all centre-based; o = {rx, ry, rz, stage, color, hideAfter, kind})
- `K.box(mat, x,y,z, sx,sy,sz, o)`, `K.cyl(mat, x,y,z, r,h, o)`, `K.sph(mat, x,y,z, rx,ry,rz, o)`, `K.tri(mat, …)` (triangular prism: base at −sy/2, apex at +sy/2, extruded along Z).
- `K.beam(mat, a, b, w, d)` box between two points; `K.tube(mat, a, b, r)` cylinder between points.
- Rotation order 'YZX' (R = Ry·Rz·Rx): rx tilts about X (roof slopes for ridges along X), rz about Z, ry yaws.
- `color` is an sRGB int per instance (bricks get palette colours automatically). `kind:'brick'|'block'|'tile'` feeds the counters.
- `hideAfter: p` hides the instance once progress passes p (scaffold, pegs).
- `K.ghost(fn)` → everything created in fn is an always-visible blueprint ghost (neighbours). `K.ghostHouse(x0,x1,z0,z1,eaveY,ridgeY,ridge)` draws a quick ghost neighbour.
- `K.env(x0,y0,z0,x1,y1,z1)` adds a blueprint silhouette box (helpers add their own).

## Masonry
- `K.wallLoop(pts, opts)` — closed perimeter of **outer-face** corners (axis-aligned; insert a collinear point to split a wall into two runs). Runs are numbered from `pts[0]→pts[1]`. Handles external corner bonding, re-entrant corners, openings, gables, inner leaf blocks + insulation (cavity), mortar joints. Options:
  - `y0, y1`, `leaves:'cavity'|'single'`, `bond:'stretcher'(default)|'flemish'` (flemish = one-brick solid wall, Victorian/Georgian)
  - `openings:{runIdx:[{u0,u1,v0,v1,type:'window'|'door'|'garage'|'void', style:'casement'|'sash'|'sash22'|'sash66', fanlight, color:'doorRed'|…, sill:'stone'|'brick'|'concrete'|false, lintel:'stone'|'soldier'|'steel', glazingBars, number}]}` — u from the run start along the outer face, v absolute heights. Frames, glass, doors, sills, lintels, cavity closers are added automatically.
  - `gables:{runIdx:{ridgeU, ridgeY, half, eaveY}}`, `runY1:{runIdx:y}`, `party:[runIdx…]` (+ `partyBond:'flemish'`), `facing:{runIdx:'render'|'pebbledash'}`, `renderFrom:{runIdx:y}`, `bands:[{y0,y1,palette,runs}]` (string courses), `palette:'red'|'london'|'buff'|'brown'|'blend'`, `frame:'upvc'|'upvcGrey'|'timberPaint'`, `hooks:[{y, fn(K)}]`.
- `K.wallRun(ax,az,bx,bz,out,y0,y1,{openings,gable,coping,bond,palette,thick,endsFlush})` — free-standing straight wall (garden walls, parapets, bay sides).
- `K.foundation(pts)` trench, strip footing, slab, DPC, set-out pegs/strings. `K.floor(x0,z0,x1,z1,y)` joists + deck. `K.slab(x0,z0,x1,z1,y,th)` concrete slab.

## Roofs and details
- `K.roofGable({x0,x1,z0,z1,eaveY,pitch,ridge:'x'|'z',tile:'slate'|'plain'|'concrete',overhang,verge,cut,barge,downpipes})` — trusses (or cut rafters), wall plates, felt, battens, tiles row by row, ridge, fascia, soffit, gutters, downpipes. Returns `{ridgeY}`.
- `K.roofHip({x0,x1,z0,z1,eaveY,pitch,tile,overhang})`, `K.roofFlat({x0,x1,z0,z1,y,th})`.
- `K.chimney({x,z,y0,y1,w,d,pots,roofY})`, `K.dormer({x,z,y,w,h,d})`, `K.bayWindow({x0,x1,d,zf,sill,head,top,style})`, `K.canopy(x,zf,y,w,d)`, `K.portico({x0,x1,zf,d,h,columns})`, `K.column(x,z,y0,h,r)`, `K.balcony(x0,x1,zf,y,d,{glass})`, `K.scaffoldLift(pts,y)`.
- Landscaping: `K.lawn`, `K.paving(…,{block:true})`, `K.fence(pts,h)`, `K.gardenWall(pts,h,{gates})`, `K.tiledPath`, `K.shrub`, `K.tree`, `K.bin`.
- Materials: see `MATS` in `viewer.js` (brick, block, mortar, insulation, concrete, timber, slate, tileClay, tileConcrete, ridge, lead, stone, render, pebbledash, upvc, upvcGrey, upvcBlack, timberPaint, glass, door*, garageDoor, brass, gutter, terracotta, grass, plant, paving, blockPaving, gravel, fence, scaffold, membrane, column, balcony, **cladding** (true-scale brick-slip texture in world space — use for repetitive high-rise floors), curtain, gold, steel, metal …).

## Previewing
`node tests/hb3d_shot.js <type> <p> <mode> <out.png> '{"az":30,"el":20,"zoom":1.5,"floor":5,"eq":0.4}'` → screenshot (modes: build, equity, complete, site) and JSON with build time, instance count, brick/tile counts. Harness: `tests/hb3d_harness.html`.
