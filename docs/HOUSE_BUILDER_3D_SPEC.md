# House Builder 3D — engineering spec

Replaces the hand-drawn SVG isometric scene with a real Three.js (r128, global `THREE` + `THREE.OrbitControls`, fetched on first need by `viThree()` in `<head>` and in the background once the page is idle; the engine boots itself when it lands) scene in which **every brick, block, tile, joist, truss and frame is a 3D object at true UK scale**. The SVG engine stays in the file as a fallback when WebGL / three.js is unavailable.

## 1. Units, axes, conventions
- **Metres.** Y is up. X runs along the street frontage (left → right as seen from the street). The **front façade lies on z = 0 and faces +Z**; the building occupies z ≤ 0 (depth runs towards −Z). Front garden / street are z > 0.
- Ground (finished ground level, FGL) is y = 0. DPC at y = 0.150. Foundations below 0.
- Default camera: in front, to the right, elevated (azimuth ≈ 35° from +Z towards +X, elevation ≈ 22°), auto-fitted to the model's bounding sphere.

## 2. UK construction data (`HB3D.UK`)
| Item | Value |
|---|---|
| Brick (work size) | 0.215 × 0.065 × 0.1025 (L × H × W) |
| Mortar joint | 0.010 → coordinating size 0.225 × 0.075 × 0.1125 |
| Course height | 0.075 (35 courses = 2.625 = one house storey, floor-to-floor) |
| Bricks per m² (half-brick leaf) | ≈ 59.3 |
| Block (inner leaf) | 0.440 × 0.215 × 0.100, coordinating 0.450 × 0.225; 1 block course = 3 brick courses |
| Cavity | 0.100 (insulation board, cream/foil) |
| External cavity wall | 0.1025 + 0.100 + 0.100 = 0.3025 |
| Strip foundation | 0.600 wide × 0.225 deep concrete, top at y = −0.150 |
| DPC | y = 0.150 (2 courses above FGL) |
| Storey (house) | floor-to-floor 2.625; floor-to-ceiling 2.40 |
| Storey (flat/apartment) | floor-to-floor 3.000 / 3.150, 0.225 concrete slab |
| Joists | 0.047 × 0.195 at 0.400 centres |
| Front door leaf | 0.838 × 1.981; head height 2.100 |
| Windows | ground 1.20 × 1.20 (sill 0.90, head 2.10); bedrooms 1.20 × 1.05; bathroom 0.60 × 1.05; set back 0.050 from face; frame 0.070 |
| Sill | projects 0.045, 0.150 deep exposed; lintel bears 0.150 each side |
| Roof pitch | 35–40° |
| Trusses | 0.035 × 0.097 members at 0.600 centres |
| Tiles | concrete interlocking 0.420 × 0.330 (gauge 0.345, cover 0.300); plain clay 0.265 × 0.165 (gauge 0.100); slate 0.500 × 0.250 (gauge 0.220) |
| Ridge tile | 0.450 long |
| Eaves overhang / verge | 0.300 / 0.050; fascia 0.200 deep |
| Gutter / downpipe | 0.112 half-round / 0.068 round |
| Chimney stack | ≈ 1.0 × 0.45; ≥ 1.0 above the ridge; pots 0.60 × Ø0.23 |
| Fence panel | 1.83 × 1.80, posts 0.100 |
| Garage door | 2.135 × 2.134 |

## 3. Architecture
```
<script>  // <<HB3D_ENGINE   (placed right after the viThree loader script in <head>; three.js itself is injected on demand)
  HB3D.UK, HB3D.supported(), HB3D.Kit (geometry builder), HB3D.models.{terraced,semi,detached,mansion,flat,apartment},
  HB3D.build(type, opts) → Model, HB3D.Viewer(containerEl)
// HB3D_ENGINE>>
</script>
```
- **Pure geometry first.** `HB3D.build(type, opts)` returns a `Model` built only from THREE math objects (no renderer, no DOM) so it can be unit-tested in Node with `tests/vendor/three.min.js`.
- **Everything is instanced.** The Kit records *primitives* — `box`, `cyl`, `prism` (wedge), `plane` — each with a material key, a transform (position, rotation, scale) and a **build time `t` ∈ [0,1]**. At compile time primitives are grouped by (shape, material) into `THREE.InstancedMesh`es of a unit shape, **sorted by `t`**. Progress `p` is then just `mesh.count = number of instances with t ≤ p` per batch — O(log n) per batch, no rebuild.
- Bricks get per-instance colour variation (several UK facing-brick hues), blocks a grey variation, tiles a subtle variation.
- **Mortar** is real: each masonry leaf gets a thin mortar-coloured core slab behind/between bricks so joints read as recessed mortar, not background.

## 4. Kit API (all arguments in metres)
```js
const K = new HB3D.Kit(opts)          // opts: {seed}
K.stage(name, t0, t1)                 // subsequent primitives get t spread across [t0,t1] in insertion order unless given explicitly
K.box(mat, x,y,z, sx,sy,sz, o)        // centre-based; o: {rx,ry,rz,t,color,layer}
K.cyl(mat, x,y,z, r, h, o)            // vertical cylinder, base at y; o.rx/rz to tilt; o.segments
K.prism(mat, ...)                     // triangular prism (gable infill, ridge, wedge)
K.course / K.wall(...)                // see below
```
Masonry:
```js
K.wallRun({ x0,z0, x1,z1,            // centre-line of the OUTER leaf face run (a → b), outward normal = left of a→b looking down? (see code: `out` explicit)
  out:[nx,nz],                        // outward normal (unit, axis aligned)
  y0, y1,                             // bottom/top of brickwork (y0 normally 0.150 - 2 courses below DPC = −0.075 … ground)
  leaves: 'cavity' | 'single' | 'solid',
  openings: [{ u0, u1, v0, v1, kind:'window'|'door'|'garage'|'void', style, frame }],   // u along run from a, v = height
  gable: { ridgeU, ridgeY, pitch }    // optional raking top (bricks cut to the roof line)
  bondPhase: 0|1,                     // which course parity this run "owns" the corner
  quoins, soldierCourse, stringCourse, facing:'brick'|'render'|'pebbledash'|'stone',
})
K.wallLoop(points[[x,z]...], opts)    // closed perimeter (clockwise from above, front edge first); handles corner bonding:
                                      // on even courses run i passes through the corner, on odd courses run i+1 does.
K.foundation(points, opts)            // strip footing + trench + oversite slab
K.floor(rect, y, {joists:true, dir})  // joists + deck
K.roofGable({x0,x1,z0,z1, eaveY, pitch, ridge:'x'|'z', tile:'slate'|'plain'|'concrete', overhang, verge})
K.roofHip({...})
K.roofFlat({x0,x1,z0,z1, y, parapet})
K.window(opening, run) / K.door(...)  // normally created automatically by wallRun from `openings`
K.chimney({x,z,y0,y1,w,d,pots})
K.gutters(...), K.downpipe(...), K.fascia(...)
K.scaffold(points, y1)                // tube + boards, visible only during masonry/roof stages
K.lawn(rect), K.path(rect), K.fence(points,h), K.wallLow(points,h), K.gate(...), K.bin(...), K.shrub(...)
K.ghost(fn)                           // primitives created in fn go to the always-ghost layer (neighbours)
K.anchor(name, x,y,z)                 // named points for overlays (e.g. 'top', 'frontLeftBase')
K.compile() → Model
```
Model:
```js
{ type, batches:[{shape, mat, count, t:Float32Array, mesh?}], ghostBatches, bounds:{min,max}, height, anchors,
  bricks:{ total, tAt(i) }, tiles:{ total }, stages:[{name,t0,t1}],
  stats(p) → { bricksLaid, bricksTotal, tilesLaid, tilesTotal, stage, course, courses } }
```

## 5. Build timeline (shared by all models; `p` = deposit progress 0..1)
| p | Stage |
|---|---|
| 0.00–0.03 | Site set-out: plot pegs, string lines, survey tripod |
| 0.03–0.10 | Trench + strip foundation concrete, footings brickwork to DPC |
| 0.10–0.12 | DPC + oversite slab / ground floor slab |
| 0.12–0.58 | Masonry, **course by course** (outer leaf brick, inner leaf block a course behind, insulation), lintels and floor joists placed when the courses reach them; scaffold lifts rise with the walls |
| 0.58–0.64 | Wall plates, roof trusses, bracing |
| 0.64–0.76 | Underlay, battens, tiles **row by row from the eaves**, ridge, chimney stacks/pots |
| 0.76–0.86 | Windows (frames + glass), doors, fascia, soffit, gutters, downpipes |
| 0.86–0.96 | Porch/bay roofs, garage door, paths, fences, landscaping; scaffold struck |
| 0.96–1.00 | Snagging; at 1.00 lights on (warm window glow) |

Flats/apartments: the same stages per floor, the frame rising floor by floor; the user's floor (`apartmentFloor`) uses real bricks and is highlighted; distant floors use brick-slip cladding panels with a true-scale procedural brick texture to keep instance counts sane.

## 6. Render modes (`viewer.setMode`)
- `site` – blank plot (no deposits): plot outline, pegs, "YOUR PLOT" overlay.
- `build` (Level 1 First Deposit, and Level 3 Upgrade target): instances with t ≤ p are drawn in their real materials **in ghost style** (translucent, teal rim), the unbuilt remainder is a faint teal blueprint (additive) plus the final envelope edges, so the finished home is always visible as a ghost.
- `equity` (Level 2 Delete the Mortgage): the whole house is built; a horizontal **clipping plane** at `h = ground + eq × height` — solid real materials below, blueprint ghost above; a gold waterline ring + "YOU OWN x%" label; interest bar overlay.
- `complete` (mortgage-free): fully solid, lights on.
- Neighbours (terraced/semi) are always ghosts.

## 7. Viewer
- Canvas inside `#house-scene` (the SVG is hidden while 3D is active). Overlays are DOM elements in `#hb3d-ov` (pointer-events none): `#hb-ownlabel`, `#hb-intbar`, `#hb-upglabel`, `#hb-plotlabel`, `#hb3d-cap` (stage caption, e.g. "Course 23 of 72 · 4,312 / 8,640 bricks").
- OrbitControls: drag = orbit, right-drag / two fingers = pan, wheel / pinch = zoom; damping; polar angle limited above ground; distance clamped.
- Existing HUD buttons keep working: `houseZoomIn/Out` (×1.2 dolly), `resetView`, `toggleOrbitMode` (switches one-finger/left drag between orbit and pan), `toggleExpand` (resizes renderer). `_houseZoom` is kept in sync as `_HZ_DEFAULT × fitDistance / distance`.
- Render on demand (dirty flag + damping), paused when the House tab or the page is hidden. `setPixelRatio(min(dpr, 2))`, shadows on desktop only, antialias.
- Fails quietly to the SVG engine if `THREE` is missing or a WebGL context cannot be created.

## 8. Counters driven by the model
- HUD (Level 1): "N of {bricksTotal} bricks", "Each brick ≈ £x" where x = depositTarget × wallShare / bricksTotal (wallShare = 0.46, the masonry window of the timeline), so `saved / x` matches the bricks visibly laid.
- Statistics: `#stBricks` = bricks laid, `#stTiles` = tiles laid.
- Milestones keep their % thresholds; the scene caption names the real stage.

## 9. Testing
- `tests/three_route.js` serves three r128 from `tests/vendor/` (the CDN is unreachable in the sandbox).
- Node unit tests extract `// <<HB3D_ENGINE … // HB3D_ENGINE>>` and run every model builder: brick module (0.225 × 0.075 × 0.1125), course counts per storey, wall thickness, opening sizes, no overlapping bricks, counts within budget.
- Browser tests: each type × p ∈ {0, .05, .3, .6, .8, 1} × modes renders with no errors; overlays; `_houseZoom` sync with pinch; SVG fallback when three.js is blocked.
