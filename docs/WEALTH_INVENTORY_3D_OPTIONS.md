# Wealth inventory: 3D models for each item (options)

Owner's ask (30 Oct 2026): fill wealth inventory tiles with a 3D model of the item automatically (for example a Gibson Les Paul Standard, from Thingiverse or another open library), keep photo upload, and keep the 3D viewport in its Night look in both modes (done in phase 6).

Today each item has a name, a value and up to several photos that turn on a photo turntable (`inv-stage`, photos stored on the device in IndexedDB). The House builder already loads GLB/GLTF files and can call Meshy AI with the user's own key, so the app can already show and fetch 3D models.

## The sources

| Source | What you get | Cost and access | Licence | Fit |
| --- | --- | --- | --- | --- |
| **Meshy AI, image to 3D** (from the item's own photos) | A textured GLB of *their* item, made from 1 to 4 photos, in 1 to 3 minutes | The user's own Meshy key and credits (already a setting); Meshy is already named in the privacy notice | The user owns what they generate | **Best match to "my actual guitar".** Photos leave the device, so it must be opt-in and say so |
| **Sketchfab Download API** | 500,000+ free models, glTF/GLB/USDZ, searchable by name and polygon count | Each end user must sign in to a Sketchfab account, or Vault·It agrees a partner deal with Sketchfab; new outside host | Per model: CC0, CC BY (credit the creator), CC BY-NC (**not allowed in a paid app**) | Big library, but sign-in friction, credits to show, licence checks per model |
| **Poly Pizza API** | About 7,000 low-poly models (a guitar, a watch, a car: generic, not exact models), GLB | Free key for hobby use, pay as you go for commercial use; new outside host | CC0 and CC BY | Clean, consistent style; generic only |
| **Thingiverse API** | STL files made for 3D printing: one colour, no materials | App approval needed; current terms for new apps unclear | Per design, many non-commercial | **Not recommended**: print meshes, no colour, licence risk |
| **A small built-in set** | About 30 CC0 low-poly models for the common categories (guitar, watch, ring, necklace, car, motorbike, bicycle, laptop, camera, painting, handbag, trainers, console…) | Free, shipped with the app from our own domain, loaded only when needed; works offline | CC0 only, chosen once | Instant and private; category-level, not the exact model |

**Brand names:** a model sold as a "Gibson Les Paul" is usually fan-made, and Gibson enforces its guitar shape trademarks. A paid app showing branded replicas from a library is a risk. A generic single-cut electric guitar, or the user's own photos turned into a model, avoids it.

## Recommendation

Three layers, cheapest first, all optional for the user:

1. **Instant: built-in model by category.** When an item is added, its name is matched to a category ("Gibson Les Paul Standard" → electric guitar) and the tile shows that CC0 model in the Night viewport, tinted in the wealth inventory purple. No outside host, no cost, works offline. The user can change the category.
2. **Exact: "Make a 3D model from my photos"** with Meshy image to 3D, using the photos they already upload. Opt-in, with a clear line: "Your photos are sent to Meshy to build the model." The GLB is stored on the device like the photos.
3. **Keep photos and the turntable** as they are, plus "Upload a 3D file (GLB)" as the House builder already allows.

Leave live library search (Sketchfab, Poly Pizza) out for now. It adds an outside host and per-model licence and credit handling, and Sketchfab needs every user to sign in. It can be revisited with a Sketchfab partner agreement if testers ask for exact models without Meshy.

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
