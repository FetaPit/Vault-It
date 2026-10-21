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
  - `openings:{runIdx:[{u0,u1,v0,v1,type:'window'|'door'|'garage'|'void', style:'casement'|'sash'|'sash22'|'sash66', fanlight, color:'doorRed'|…, sill:'stone'|'brick'|'concrete'|false, lintel:'stone'|'soldier'|'steel', glazingBars, number}]}` — u from the run start along the outer face, v absolute heights. Frames, glass, doors, sills, lintels, cavity closers are added automatically. Solid walls (`bond:'flemish'` or `leaves:'solid'`) get a timber backing lintel instead of the steel cavity lintel, no cavity closers, and window boards on their own inner face.
  - Doors also take `step` (material, default `'stone'`, or `false`), `steps` (count; default from the threshold `v0`: risers ≤ 0.17, `going` 0.30, top step runs into the reveal so no bare brick shows under the door; below v0 0.10 just a stone threshold), `knob:true` (brass knob instead of the bar handle), `knocker:true`.
  - `gables:{runIdx:{ridgeU, ridgeY, half, eaveY, lift}}` and `gableLift` (wall-level default): lift the rake used to clip the courses — metres, or `'auto'` = up to the batten top of a kit roof at the gable's own pitch, so the top courses end just under the slates (use it when the gable line passed is the roof's wall-plate line, e.g. terraced; models that already pass a raised line, like detached's `LIFT`, leave it off). `runY1:{runIdx:y}`, `party:[runIdx…]` (+ `partyBond:'flemish'`), `facing:{runIdx:'render'|'pebbledash'}`, `renderFrom:{runIdx:y}`, `bands:[{y0,y1,palette,runs}]` (string courses), `palette:'red'|'london'|'buff'|'brown'|'blend'`, `frame:'upvc'|'upvcGrey'|'timberPaint'`, `hooks:[{y, fn(K)}]`.
- `K.wallRun(ax,az,bx,bz,out,y0,y1,{openings,gable,coping,bond,palette,thick,endsFlush,mortar})` — free-standing straight wall (garden walls, parapets, bay sides). `bond:'flemish'` or `thick:UK.BL` = one-brick Flemish wall. `coping:'stone'|'brick'` is laid per run of brickwork (it stops at gates/openings); `'brick'` = real bricks on edge across the wall.
- `K.foundation(pts, opts)` set-out pegs/strings, trench, strip footing, DPC and the ground-floor slab. The slab follows the plan: the outer-face perimeter is offset inward by `inset` and split into rectangles, so an L/T plan gets an L/T slab (a rectangle plan is unchanged). Options: `wall` (footing/DPC thickness, default `UK.WALL`; `UK.BL` for one-brick walls), `inset` (default = `wall`), `slabs:[[x0,z0,x1,z1],…]` (explicit slab rectangles, used as given), `slabTop`/`slabTh` (default 0.175/0.15), `era:'victorian'` (lime-concrete strip 0.60 × 0.23 with formation at −0.90, four courses of corbelled brick footings 0.44 → 0.27 m, oversite 0.10 thick with its top at 0.00).
- `K.floor(x0,z0,x1,z1,y)` joists + deck. `K.slab(x0,z0,x1,z1,y,th)` concrete slab.

## Roofs and details
- `K.roofGable({x0,x1,z0,z1,eaveY,pitch,ridge:'x'|'z',tile:'slate'|'plain'|'concrete',overhang,verge,cut,barge,downpipes})` — trusses (or cut rafters), wall plates, felt, battens (laid to the slope), tiles row by row (≥ 7 mm clear of the battens, tails resting on the course below; `tileLift` rad, default 0.012), ridge, fascia, soffit, gutters, downpipes. Sides: `s0` = the z0 side for `ridge:'x'` (x0 side for `'z'`), `s1` = the other; `a` = the coordinate along the ridge. Options:
  - `overhangs:[s0,s1]` per-side eaves overhang; `eaves:'both'|'s0'|'s1'|'none'` which eaves get fascia, soffit, gutter and downpipes; `eavesRange:{s0:[a0,a1], s1:[a0,a1]}` stops fascia/gutter short (e.g. where a rear wing meets the main roof).
  - `gutter:'halfround'` (default, cast iron on fascia brackets every 0.9 m, stop ends) `|'ogee'|'tube'` (legacy); `fascia` material (`'timberPaint'`, `'upvcBlack'` …). The fascia top is level with the rafter tops, so the gutter rim sits just under the tile eave.
  - `downpipes: false | 1 | 2 | [a,…]`, `downpipeAt:{s0:[a…], s1:[a…]}`. Each downpipe drops from a gutter outlet through a 45° swan-neck under the soffit to the wall, with socket clips every 1.8 m and a shoe.
  - `verges:'both'|'a0'|'a1'|'none'` which gable ends get barge boards / verges; `vergeBed` (default when `verge:0` and `barge:false`): a bedded lime-mortar verge along each rake on the gable wall top (pair it with wallLoop `gableLift:'auto'` so the stepped courses are hidden); `vergeMat`.
  - Returns `{ridgeY, rise, eaveY, axis, ridgeZ|ridgeX, pitch, tile, a0, a1, s0, s1}` — pass it straight to `K.chimney({roof})`.
- `K.roofHip({x0,x1,z0,z1,eaveY,pitch,tile,overhang})`, `K.roofFlat({x0,x1,z0,z1,y,th})`.
- `K.chimney({x,z,y0,y1,w,d,pots,palette,stage,potH,roof,roofY,bury})` — half-brick stack round the flues, two oversailing courses, flaunching bed with a cone round each pot; pots run along the longer side at ≥ 0.33 m centres (extra rows across the stack). `stage` defaults to `'roofcover'` (`'masonry'` builds it with the walls).
  - `roof:{axis|ridge:'x'|'z', ridgeZ|ridgeX, ridgeY, pitch(deg), tile, a0, a1}` (or roofGable's return value) makes it roof-aware: courses more than `bury` (0.15 = two courses) under the finished roof are left out so the stack rises off the slope, and once the roof covering under it is laid it gets lead flashings that follow the roof — an apron on each downhill face, a back gutter on the uphill face (unless the stack straddles the ridge) and stepped flashings up the sides, tucked into the bed joints. `a0/a1` = the real roof's extent along the ridge: nothing is dressed beyond it (a party-wall stack over a ghost neighbour).
  - `roofY` only (legacy): the stack is re-laid roof-aware in place as soon as a `roofGable` covering it is built; with no such roof the old flat lead collar at roofY stays.
- `K.scaffoldLift(pts, y, opts)` — one lift of an independent tied scaffold (call it from wallLoop `hooks` about every 2 m): inner + outer standards in pairs ≤ 2.0 m apart (base plates and sole boards at ground level), ledgers on both lines, transoms ≤ 1.2 m under the boards, toe board, guard rails at +0.47/+0.95, stop-ends at open ends, a façade brace every 5 bays and a ladder bay; struck at p 0.80. Options: `off` (outer standards from the face: number or `{front,right,back,left}`, default 1.15), `inner` (default `max(0.15, off − 1.05)`), `sides` (subset of `'front','right','back','left'` or 0–3; leave out party walls — corners only turn where both sides are present), `runs:[{a:[x,z], b:[x,z], out:[nx,nz], off, inner, ext:[e0,e1]}]` (explicit wall-face runs instead of the bounding box; `ext` lengthens/shortens the outer line at each end, e.g. negative at a re-entrant corner), `ladder:false`, `brace:false`. No opts = the old four-sided box, now with the full set of components.
- `K.dormer({x,z,y,w,h,d})`, `K.bayWindow({x0,x1,d,zf,sill,head,top,style})`, `K.canopy(x,zf,y,w,d)`, `K.portico({x0,x1,zf,d,h,columns})`, `K.column(x,z,y0,h,r)`, `K.balcony(x0,x1,zf,y,d,{glass})`.
- Landscaping: `K.lawn`, `K.paving(…,{block:true})`, `K.fence(pts,h)`, `K.gardenWall(pts,h,{gates:[{seg,u0,u1}],palette,coping,gateMat,bond,thick,mortar})` (gate piers are coursed 1½-brick piers, a four-stretcher pinwheel mirrored every course, two courses above the wall with a stone cap; the wall stops at the piers; `bond:'flemish'`/`thick:UK.BL` for a one-brick wall), `K.tiledPath`, `K.shrub`, `K.tree`, `K.bin`.
- Materials: see `MATS` in `viewer.js` (brick, block, mortar, insulation, concrete, timber, slate, tileClay, tileConcrete, ridge, lead, stone, render, pebbledash, upvc, upvcGrey, upvcBlack, timberPaint, glass, door*, garageDoor, brass, gutter, terracotta, grass, plant, paving, blockPaving, gravel, fence, scaffold, membrane, column, balcony, **cladding** (true-scale brick-slip texture in world space — use for repetitive high-rise floors), curtain, gold, steel, metal …).

## Previewing
`node tests/hb3d_shot.js <type> <p> <mode> <out.png> '{"az":30,"el":20,"zoom":1.5,"floor":5,"eq":0.4}'` → screenshot (modes: build, equity, complete, site) and JSON with build time, instance count, brick/tile counts. Harness: `tests/hb3d_harness.html`.

## Clean shell (what the app shows)
The app builds every model with `HB3D.build(type, {floor, detail:'clean'})` (default for users; `localStorage.vi_hb_detail='full'` shows the full model for development, and the tests build both). The clean shell is what you can see from outside the finished house: real UK bricks and roof tiles, windows (frames + glass), doors, chimneys, porch/bay, cornices. It exists so the viewport is fast and a deposit's progress is easy to read.

**Build by height.** `compile()` times each item by its top: an item appears when the build height reaches it, so *build % == deposit % funded exactly*. `model.rows = {y0,y1,n}` — n rows of 75 mm (the brick courses); the viewer draws a gold band at the current row and the app labels it "ROW n / N". Flats/apartments (`meta.focus`): only the user's floor builds (rows = that floor's courses); every other floor is a plain faint silhouette (flat teal material, no colours/textures) — don't generate detail there in clean mode.

**What the clean compile drops automatically:** neighbour ghosts (`K.ghost`), `hideAfter < 2` temporaries (scaffold, cranes, hoarding, pegs), stage `external` (landscaping), stage `setout`, everything underground, small fixings (< 30 mm), downpipes (`gutter` cylinders), materials `scaffold scaffoldBoard string soil insulation closer block blockPaving paving gravel grass plant bark fence fencePost bins rubber curtain brass steel dpc membrane felt timber chipboard metal concrete`, and — via building outlines — interiors: bricks deeper than 125 mm behind the outer face, other items deeper than 340 mm inside.

**API for models** (all no-ops in the full model):
- `K.clean` — true when building the clean shell.
- `K.fine(fn)` — runs `fn` only in the full model; use it for anything not visible from outside (and to skip generating it).
- `K.hide(x0,y0,z0,x1,y1,z1)` — drop every item whose centre is in the box (e.g. a main-block wall buried behind a wing).
- `K.shell(pts, y0, y1, ins?)` — register an outer-face loop for the interior test; `wallLoop` registers its own, models that lay their own walls must call this.
- `K.env(x0,y0,z0,x1,y1,z1, {k:'gable'|'hip', axis:'x'|'z', hips:[a,b]})` — the optional shape draws a pitched-roof outline (the unbuilt remainder is shown as an outline above the current row) instead of a box.

Tests: `node tests/test_hb3d_scale.js <type>` runs the full-model checks and the "(clean)" checks (instance budget, UK-size bricks, rows, height timeline, nothing dropped left behind). Render clean views with `node tests/hb3d_multishot.js '[{"type":"…","detail":"clean","p":0.5,"mode":"build","out":"/abs.png"}]'`.
