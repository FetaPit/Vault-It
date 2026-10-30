# Wealth inventory: 3D models for each item (options)

Owner's ask (30 Oct 2026): fill wealth inventory tiles with a 3D model of the item automatically (for example a Gibson Les Paul Standard, from Thingiverse or another open library), keep photo upload, and keep the 3D viewport in its Night look in both modes (done in phase 6).

Today each item has a name, a value and up to several photos that turn on a photo turntable (`inv-stage`, photos stored on the device in IndexedDB). The House builder already loads GLB/GLTF files and can call Meshy AI with the user's own key, so the app can already show and fetch 3D models.

## The sources

| Source | What you get | Cost and access | Licence | Fit |
| --- | --- | --- | --- | --- |
| **Meshy AI, image to 3D** (from the item's own photos) | A textured GLB of *their* item, made from 1 to 4 photos, in 1 to 3 minutes | The user's own Meshy key and credits (already a setting); Meshy is already named in the privacy notice | The user owns what they generate | **Best match to "my actual guitar".** Photos leave the device, so it must be opt-in and say so |
| **Sketchfab Download API** | 500,000+ free models, glTF/GLB/USDZ, searchable by name and polygon count | Each end user must sign in to a Sketchfab account, or Vault-It agrees a partner deal with Sketchfab; new outside host | Per model: CC0, CC BY (credit the creator), CC BY-NC (**not allowed in a paid app**) | Big library, but sign-in friction, credits to show, licence checks per model |
| **Poly Pizza API** | About 7,000 low-poly models (a guitar, a watch, a car: generic, not exact models), GLB | Free key for hobby use, pay as you go for commercial use; new outside host | CC0 and CC BY | Clean, consistent style; generic only |
| **Thingiverse API** | STL files made for 3D printing: one colour, no materials | App approval needed; current terms for new apps unclear | Per design, many non-commercial | **Not recommended**: print meshes, no colour, licence risk |
| **A small built-in set** | About 30 CC0 low-poly models for the common categories (guitar, watch, ring, necklace, car, motorbike, bicycle, laptop, camera, painting, handbag, trainers, console…) | Free, shipped with the app from our own domain, loaded only when needed; works offline | CC0 only, chosen once | Instant and private; category-level, not the exact model |

**Hyper3D (Rodin) and other photo to 3D services** (owner asked, 30 Oct): Hyper3D has an API (1 to 5 photos, GLB) but only on its $120 a month Business plan, and files are kept 7 days. Tripo (about $0.30 a model) and Meshy (about $0.60 a model on Pro) are pay per model. Layer 2 below can use any of them; pick after a side-by-side test on real items. Costs and steps: `docs/INTEGRATIONS_SETUP.md`.

**Owner's decision (30 Oct 2026): go with the three layers below.**

**Brand names:** a model sold as a "Gibson Les Paul" is usually fan-made, and Gibson enforces its guitar shape trademarks. A paid app showing branded replicas from a library is a risk. A generic single-cut electric guitar, or the user's own photos turned into a model, avoids it.

## Recommendation

Three layers, cheapest first, all optional for the user:

1. **Instant: built-in model by category.** When an item is added, its name is matched to a category ("Gibson Les Paul Standard" → electric guitar) and the tile shows that CC0 model in the Night viewport, tinted in the wealth inventory purple. No outside host, no cost, works offline. The user can change the category.
2. **Exact: "Make a 3D model from my photos"** with Meshy image to 3D, using the photos they already upload. Opt-in, with a clear line: "Your photos are sent to Meshy to build the model." The GLB is stored on the device like the photos.
3. **Keep photos and the turntable** as they are, plus "Upload a 3D file (GLB)" as the House builder already allows.

Leave live library search (Sketchfab, Poly Pizza) out for now. It adds an outside host and per-model licence and credit handling, and Sketchfab needs every user to sign in. It can be revisited with a Sketchfab partner agreement if testers ask for exact models without Meshy.

## Open model libraries to tap into (owner asked, 30 Oct)

Two different uses:
- **In the app, for users:** a normal API called from a Supabase edge function (keys stay server-side).
- **MCP (for Claude in our build sessions):** lets me search and pull models while curating the built-in set. Users never touch MCP.

| Library | Licence | Access | Size and fit |
| --- | --- | --- | --- |
| **Poly Pizza** | CC0 and CC BY (credit shown) | API key (free for hobby use, pay as you go for commercial use); community MCP server | About 7,000 low-poly models: guitar, watch, car, bike, camera… Best category match, one consistent style |
| **Poly Haven** | CC0 | Free public API, no key; needs a "Powered by Poly Haven" credit and its own User-Agent; covered by community MCP servers and BlenderMCP | Hundreds of photoreal props and furniture; high quality, few personal valuables |
| **Smithsonian Open Access 3D** | CC0 | Smithsonian 3D API, GLB | About 3,400 museum objects; little overlap with what people own |
| **Sketchfab** | Per model (CC0, CC BY, CC BY-NC: NC not allowed for us) | API; downloads need each user's Sketchfab login; community MCP server (`sketchfab-mcp-server`) | Largest library; licence checks per model |
| Kenney, Quaternius | CC0 | Download packs, no API | Good for the bundled starter set |

**Recommendation:**
1. **Poly Pizza:** auto-match an item's name to a model, CC0 first, CC BY with the credit shown on the tile.
2. **Poly Haven:** a few hero items where photoreal matters.
3. **Built-in starter set:** curated with the MCP servers in a build session, so the most common items work offline.
4. **Photo-to-3D (Tripo, Meshy or Hyper3D):** stays the "exactly my item" option.

**Tested 30 Oct (live):** Poly Haven has 521 models. Good matches: wrist and pocket watches, cameras, a laptop, games consoles and controller, TVs, picture frames (art), vases, bronze and wooden statues, clocks, sofas and chairs. Missing: guitars (a ukulele only), bikes, cars, jewellery, handbags, shoes. Downloads are glTF; the smallest (1k textures) is about 2.2 MB a model, so load on demand, or shrink to a few hundred KB for the built-in set. Poly Pizza answers only with an API key (401 without).

**To try it here:** this cloud session blocks these hosts. Allow `api.polyhaven.com`, `dl.polyhaven.org`, `api.poly.pizza` and `static.poly.pizza` in the environment's network settings, and create a Poly Pizza account and API key (add it as Supabase secret `POLYPIZZA_API_KEY`).

Sources: [Poly Haven licence](https://polyhaven.com/license), [Poly Haven public API](https://github.com/Poly-Haven/Public-API), [Poly Pizza fact sheet](https://poly.pizza/docs/press), [Poly Pizza MCP](https://glama.ai/mcp/servers/MatthewHallCom/Poly-Pizza-MCP), [multi-source asset MCP](https://glama.ai/mcp/servers/jonit-dev/threenative-asset-mcp), [sketchfab-mcp-server](https://npmjs.com/package/sketchfab-mcp-server), [BlenderMCP](https://www.flowhunt.io/mcp-servers/blender), [Smithsonian Open Access 3D](https://www.si.edu/spotlight/openaccesshighlights).

## Poly Pizza API notes (ours, tested live 30 Oct 2026)

- Base `https://api.poly.pizza/v1/` (v1.1 also answers). Key in header `X-Auth-Token`, no prefix. Build sessions: network secret on `api.poly.pizza`. App: Supabase secret `POLYPIZZA_API_KEY`, edge function only.
- `GET /search/{query}?limit=6` returns `{ total, results }`. Each result: `ID`, `Title`, `Description`, `Attribution` (a ready-made credit line), `Thumbnail` (.webp), `Download` (.glb on `static.poly.pizza`), `Tri Count`, `Creator.Username`, `Category`, `Tags`, `Licence` ("CC0 1.0" or "CC-BY 3.0"), `Animated`, `Orbit` (a suggested camera angle). The community guide's field names (`TriangleCount`, `PURL`, `cursor`) are wrong.
- **Downloads:** `static.poly.pizza` sits behind a Cloudflare bot check ("Just a moment…"), so a server (our edge function, or this build session) cannot fetch the .glb. A user's browser normally passes it, so the app would load the model straight into the viewer from the browser; whether the CDN allows that from app.vault-it.co (CORS) is not yet checked. Commercial use is pay as you go: ask Poly Pizza for server-side download access when signing up for it.
- Licence: CC0 needs nothing; for CC-BY show the `Attribution` line on the tile and store it with the item. Store the model `ID` (stable).

### Search results (best match per item: CC0 first, then fewest triangles)

| Item | Matches | Best | Next |
| --- | --- | --- | --- |
| Gibson Les Paul | 15 | Guitar, CC0, 2,325 tris (Quaternius) | Electric guitar, CC-BY, 560 tris (Poly by Google) |
| Watch | 4 | No real watch (monitors); "wristwatch" finds Watch and Wrist Watch, CC-BY | Poly Haven has photoreal watches, CC0 |
| Ring | 63 | Ring, CC-BY, 288 tris; Diamond Solitaire Ring, CC-BY | |
| Necklace | 33 | Necklace, CC0, 792 tris (Quaternius) | Pearl necklace, CC-BY |
| Sports car | 88 | Convertible, CC-BY, 1,671 tris | Camaro ZL1, Nissan GTR (branded: avoid) |
| Motorbike | 42 | Motorcycle, CC-BY, 432 tris | |
| Bicycle | 43 | Bicycle, CC-BY, 1,714 tris | |
| Laptop | 50 | Laptop, CC0, 136 tris (Kenney) | |
| Camera | 66 | Instant Camera, CC-BY, 494 tris | Poly Haven Camera_01, CC0 |
| Painting | 81 | Wall painting, CC-BY, 96 tris | Poly Haven picture frames, CC0 |
| Handbag | 50 | Bag, CC0, 1,232 tris (Quaternius); "Purse", CC-BY | |
| Trainers | 4 | Trainer, CC-BY, 474 tris; Sneakers, CC-BY | |
| Games console | 29 | Videogame, CC-BY, 309 tris; PS3 Slim (branded: avoid) | Poly Haven gaming_console, CC0 |
| Gold bar | 36 | Gold Bars, CC0, 286 tris | Gold Ingots, CC0 |

Search needs matching words: map item names to search terms ("Gibson Les Paul Standard" → "electric guitar", "Rolex" → "wristwatch"). File sizes are not measured yet (downloads blocked here).

## Built (30 Oct 2026, branch brand-rollout)

- **One 3D viewer for the wealth inventory and liabilities.** A "3D" button on every tile opens the model picker; a tile with a model shows its preview and opens the viewer on tap.
- **Viewer:** the House builder's Night stage in both modes (dark sky, teal survey grid, soft shadows), orbit by drag, zoom by pinch or scroll, two-finger or right-drag to move, buttons for auto-rotate, zoom in, zoom out and reset. Reduced motion: no auto-spin.
- **Same look on every model:** each material is nudged 16% towards brand green with a faint green glow, plus a green rim light. Values `I3D_TINT` and `I3D_GLOW` in `index.html` if the owner wants it stronger or weaker.
- **Upload a .glb** (up to 25 MB): the file stays on the device in IndexedDB next to the photos; only a small preview picture and the source are saved with the item (and synced). On another device the viewer asks for the file again.
- **Poly Pizza library, test path (option 2):** open the app with `?modeltest=1` once (and `?modeltest=0` to turn it off). The picker then lists 17 hand-picked models (CC0 first, no brand names), best match for the item name first. The browser downloads the .glb straight from `static.poly.pizza`; no key is used in the app. CC-BY models carry their credit line in the viewer and on the tile. If the CDN's bot check refuses, the user is told and nothing is saved.
- Photos and the photo turntable work as before.
- Privacy notice names Poly Pizza. Tests: `tests/test_item3d.js`; screenshots: `tests/item3d_shots.js`.

**What the owner's phone test answers:** does `static.poly.pizza` let a real browser on app.vault-it.co (or a local build) download the files (CORS and the bot check)? If yes, live search can follow through an edge function holding `POLYPIZZA_API_KEY` (needs the owner's yes to deploy). If no, the built-in set (layer 1) is the route: we host the chosen CC0 files ourselves.

## Needs the owner's yes before building

- Layer 2 sends photos to Meshy: update the privacy notice wording (Meshy is named today for house models only).
- Built-in models add roughly 1 to 2 MB of files served from app.vault-it.co, so they belong with the offline cache phase.
- Which categories to include in the first set.

## Sources

- Thingiverse API FAQ: https://www.thingiverse.com/developers/faq
- Sketchfab Download API: https://sketchfab.com/developers/download-api
- Sketchfab licences (credit rules): https://help.sketchfab.com/en/articles/16152217
- Poly Pizza fact sheet: https://poly.pizza/docs/press
- Meshy API quick start (image to 3D): https://docs.meshy.ai/en/api/quick-start
