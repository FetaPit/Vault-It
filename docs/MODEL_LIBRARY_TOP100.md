# 3D model library: top 100 commonly owned items

Vault-It's own catalogue of low-poly 3D models for the Wealth inventory and Liabilities. Data and tooling only; no app code reads it yet. Built 3 November 2026 from the Poly Pizza search API.

## Result

- 89 of 100 items matched: 53 CC0 (no credit needed) and 36 CC-BY 3.0 (credit must be shown; see `models/CREDITS.md` once fetched).
- 13 of the matches are stand-ins (a close object, not the exact item, for example a sail boat for a motor boat). They are marked in the table.
- 11 misses, listed below with where else to look.
- Every pick is under 20,000 triangles (largest 8,398; 122,532 in total). The API gives no file sizes. Estimate: about 10 to 30 MB for all 89 GLB files before compression, since most are small flat-colour models; `--compress` (Draco and WebP) typically halves that.
- **Not downloaded yet.** `static.poly.pizza` returns 403 in the cloud sandbox, so no model files are in the repo. Nothing is faked: `models/catalog.json` is only written for files that really arrive.

## How to fetch (owner's laptop)

Plain Git Bash, folder `~/Projects/Vault-It` (needs Node 18+ and internet access to static.poly.pizza):

```
git fetch origin v09x/model-library
git checkout v09x/model-library
node tools/fetch-models.mjs
```

Add `--compress` to shrink files (uses npx and gltf-transform), `--only gold-bar,sofa` to try a few, `--dry` to list without downloading. It writes `models/glb/*.glb`, `models/thumb/*.webp`, `models/catalog.json` and `models/CREDITS.md`, and exits non-zero listing any file that failed. Then `bash tools/upload-models.sh` pushes to R2 at assets.ptlive.design/vault-it/models/ (needs `npx wrangler login`).

To re-run the search (laptop needs a free key from poly.pizza/settings/api): `POLY_PIZZA_KEY=... node tools/search-models.mjs`. In the cloud sandbox use `NODE_USE_ENV_PROXY=1`. Note that `models/catalog.source.json` was curated by hand after the search (wrong matches removed via `models/exclude.json`, stand-ins flagged), so a full re-search will lose the `match` flags.

## Standing rules and privacy

- CC0 and CC-BY only. CC-BY attribution is kept exactly as Poly Pizza supplies it and written to `CREDITS.md`.
- The fetch script only downloads from `static.poly.pizza`. That is a build-time host on the owner's machine, not something the app calls. In production the app should load from our own R2 domain (assets.ptlive.design), which the privacy notice must already name. If the app ever loaded from static.poly.pizza directly, it would need a privacy-notice line first. Do not do that.
- The sandbox needs `static.poly.pizza` on its network allowlist for a cloud session to download (owner action).

## The 100 items

Ranked roughly by how commonly owned and how valuable. "Match" is the Poly Pizza model picked; "stand-in" means a close object.

| # | Item | Group | Search terms | Match | Licence | Tris |
|---|------|-------|--------------|-------|---------|------|
| 1 | Car (family hatchback) | assets | car, sports car, taxi, hatchback, sedan | [Sports Car](https://poly.pizza/m/1mkmFkAz5v) | CC0 1.0 | 2298 |
| 2 | Smartphone | assets | smartphone, mobile phone, phone | [Smartphone](https://poly.pizza/m/4DRZmTs3jq) | CC0 1.0 | 182 |
| 3 | Laptop | assets | laptop, notebook computer | [Laptop](https://poly.pizza/m/GnbwSUiVty) | CC0 1.0 | 136 |
| 4 | Sofa | assets | sofa, couch | [Couch Medium](https://poly.pizza/m/mWgQ94zhDZ) | CC0 1.0 | 1012 |
| 5 | Bed (double) | assets | bed, double bed | [Bed](https://poly.pizza/m/rXo5Rkl5LC) | CC0 1.0 | 726 |
| 6 | Television | assets | television, tv, flat screen tv | [Television Vintage](https://poly.pizza/m/aSmz6H8aeu) | CC0 1.0 | 560 |
| 7 | Fridge freezer | assets | fridge, refrigerator | [Fridge](https://poly.pizza/m/3NYolcXB1o) | CC0 1.0 | 1186 |
| 8 | Washing machine | assets | washing machine, washer | [Washer](https://poly.pizza/m/C7HZypH3D6) | CC0 1.0 | 892 |
| 9 | Dining table | assets | dining table, table | [Table](https://poly.pizza/m/yYEEJzKxb4) | CC0 1.0 | 1500 |
| 10 | Wardrobe | assets | wardrobe, closet | [Closet](https://poly.pizza/m/BHEVb1DIuH) | CC0 1.0 | 2988 |
| 11 | Bicycle | assets | bicycle, bike | [Bike](https://poly.pizza/m/DN6DCPopeH) | CC-BY 3.0 | 1962 |
| 12 | Tablet | assets | tablet, ipad | [Tablet](https://poly.pizza/m/dTjviKNzecd) | CC-BY 3.0 | 524 |
| 13 | Games console | assets | game console, playstation, controller | [Low Poly Controller](https://poly.pizza/m/fCyA3Ug79X) (stand-in) | CC-BY 3.0 | 303 |
| 14 | Wristwatch | assets | watch, wristwatch | [Watch](https://poly.pizza/m/5MFJqeBgWBn) | CC-BY 3.0 | 796 |
| 15 | Ring (jewellery) | assets | wedding ring, diamond ring, engagement ring, jewelry ring | [Diamond Ring](https://poly.pizza/m/klY4A6FGjz) | CC-BY 3.0 | 458 |
| 16 | Necklace | assets | necklace, pendant | [Necklace](https://poly.pizza/m/Jvhs8DCNDZ) | CC0 1.0 | 824 |
| 17 | Van | assets | van, delivery van | [Generic Van](https://poly.pizza/m/BbRojf2v3H) | CC-BY 3.0 | 2423 |
| 18 | Motorbike | assets | motorcycle, motorbike | [Cartoony Purple Motorcycle](https://poly.pizza/m/j20srJUjpB) | CC0 1.0 | 1500 |
| 19 | E-bike | assets | electric bike, e-bike, scooter | [Scooter](https://poly.pizza/m/eHdEFPwUfCt) (stand-in) | CC-BY 3.0 | 1496 |
| 20 | Desktop computer | assets | desktop computer, pc, monitor | [Desktop computer](https://poly.pizza/m/dY79tyRnkaM) | CC-BY 3.0 | 1152 |
| 21 | Camera | assets | dslr camera, photo camera, camcorder, camera | **miss** |  |  |
| 22 | Headphones | assets | headphones, earbuds | [Headphones](https://poly.pizza/m/PSsWSIAYIL) | CC0 1.0 | 472 |
| 23 | Acoustic guitar | collectibles | acoustic guitar, guitar | [Guitar](https://poly.pizza/m/5Fp8gpomrb) | CC0 1.0 | 2325 |
| 24 | Electric guitar | collectibles | electric guitar, bass guitar, rock guitar | [Electric guitar](https://poly.pizza/m/eoSib2-NN9Y) | CC-BY 3.0 | 560 |
| 25 | Piano | collectibles | piano, upright piano | [Piano](https://poly.pizza/m/5vbJ5vildOq) | CC-BY 3.0 | 1576 |
| 26 | Keyboard (musical) | collectibles | synthesizer, keytar, digital piano, piano keys | [Piano Keys](https://poly.pizza/m/akGT4Q8Zbwz) | CC-BY 3.0 | 576 |
| 27 | Drum kit | collectibles | drum kit, drums | [Drumkit](https://poly.pizza/m/4l5jRtpTec) | CC-BY 3.0 | 5222 |
| 28 | Oven and hob | assets | oven, cooker, stove | [Oven](https://poly.pizza/m/VNjPRwui7t) | CC0 1.0 | 512 |
| 29 | Dishwasher | assets | dishwasher | [Dishwasher](https://poly.pizza/m/4HlUpiwqtvs) | CC-BY 3.0 | 2728 |
| 30 | Tumble dryer | assets | clothes dryer, dryer machine, laundry, washing | **miss** |  |  |
| 31 | Microwave | assets | microwave | [Microwave](https://poly.pizza/m/uL1OgB3EJu) | CC0 1.0 | 582 |
| 32 | Armchair | assets | armchair, chair | [Chair](https://poly.pizza/m/zMmKNm8w4a) (stand-in) | CC0 1.0 | 1298 |
| 33 | Bookcase | assets | bookshelf, bookcase | [Bookcase Open](https://poly.pizza/m/MTH8ZwnA27) | CC0 1.0 | 640 |
| 34 | Desk | assets | desk, office desk | [Desk](https://poly.pizza/m/V86Go2rlnq) | CC0 1.0 | 2640 |
| 35 | Office chair | assets | office chair | [Office Chair](https://poly.pizza/m/UfKvrZBK6C) | CC0 1.0 | 2116 |
| 36 | Coffee table | assets | coffee table | [Coffee Table](https://poly.pizza/m/y4ZU5S7RuD) | CC0 1.0 | 248 |
| 37 | Chest of drawers | assets | dresser, drawers | [Dresser](https://poly.pizza/m/Ud8QR8Ku9e) | CC0 1.0 | 430 |
| 38 | Lawn mower | assets | lawn mower, lawnmower | [Lawn mower](https://poly.pizza/m/fO29bwSYt-c) | CC-BY 3.0 | 1246 |
| 39 | Power drill and tools | assets | power drill, drill, toolbox | [Drill](https://poly.pizza/m/8uBbH7Dvmb) | CC0 1.0 | 1198 |
| 40 | Toolbox | assets | toolbox, tool box, hammer | [Hammer](https://poly.pizza/m/Zl38SHi7P9) (stand-in) | CC0 1.0 | 428 |
| 41 | Garden shed | assets | shed, garden shed | [Cabin Shed](https://poly.pizza/m/HTx7PZt6Zm) | CC0 1.0 | 2745 |
| 42 | Barbecue | assets | barbecue, bbq grill | [Barbecue](https://poly.pizza/m/ZZyQvAYY5L) | CC0 1.0 | 655 |
| 43 | Caravan | assets | caravan, camper trailer, mobile home, travel trailer | [Caravan](https://poly.pizza/m/aiDmjN8uOmA) | CC-BY 3.0 | 4692 |
| 44 | Campervan | assets | camper van, campervan, rv | [RV](https://poly.pizza/m/zrqfTP5xNh) | CC-BY 3.0 | 2754 |
| 45 | Boat (motor) | assets | motorboat, speedboat, boat | [Sail Boat](https://poly.pizza/m/BgSZXwmm7k) (stand-in) | CC0 1.0 | 1020 |
| 46 | Sailing yacht | assets | yacht, sailboat | [Yacht](https://poly.pizza/m/9znU2c-dTSR) | CC-BY 3.0 | 1206 |
| 47 | Trailer | assets | trailer, car trailer, cargo trailer, flatbed | **miss** |  |  |
| 48 | Handbag | collectibles | handbag, purse, bag | [Bag](https://poly.pizza/m/VRfAODZ0Xk) | CC0 1.0 | 304 |
| 49 | Trainers | collectibles | sneaker, trainers, shoe | [Pair of shoes](https://poly.pizza/m/3MskwjG-x4L) | CC-BY 3.0 | 2032 |
| 50 | Designer sunglasses | collectibles | sunglasses, glasses | [Glasses](https://poly.pizza/m/LYEp20yfFh) | CC0 1.0 | 1066 |
| 51 | Gold bar | assets | gold bar, gold ingot, ingot | [Gold Ingots](https://poly.pizza/m/3jRhAgbc6t) | CC0 1.0 | 648 |
| 52 | Gold coins | assets | coin, gold coin, sovereign | [Coin](https://poly.pizza/m/zsScrcPRgW) | CC0 1.0 | 1399 |
| 53 | Silver bar | assets | silver bar, silver ingot, metal bar, ingot | **miss** |  |  |
| 54 | Diamond | assets | diamond, gem | [Diamond Block](https://poly.pizza/m/tU90pfm5xf) | CC0 1.0 | 2388 |
| 55 | Earrings | assets | earrings, earring | [Hoop Earrings](https://poly.pizza/m/e0bs2OQ8rzJ) | CC-BY 3.0 | 920 |
| 56 | Bracelet | assets | bracelet, bangle | [Pearl bracelet](https://poly.pizza/m/9zb8mXYP6J) | CC0 1.0 | 2414 |
| 57 | Artwork (framed painting) | collectibles | painting, framed picture, picture frame | [Painting](https://poly.pizza/m/Pi6oReAizt) | CC0 1.0 | 164 |
| 58 | Sculpture | collectibles | statue, sculpture, bust | [Horse Statue](https://poly.pizza/m/AK9CmjFnL6) (stand-in) | CC0 1.0 | 1849 |
| 59 | Vase | collectibles | vase, ceramic vase | [Vase](https://poly.pizza/m/fLzSqhcYmKg) | CC-BY 3.0 | 957 |
| 60 | Antique clock | collectibles | clock, grandfather clock | [Alarm Clock](https://poly.pizza/m/y5f363OS9C) (stand-in) | CC0 1.0 | 458 |
| 61 | Wine collection | collectibles | wine bottle, wine rack | [Bottle of wine](https://poly.pizza/m/65Hf2EMEo4s) | CC-BY 3.0 | 608 |
| 62 | Whisky bottle | collectibles | whisky, whiskey bottle, bottle | [Old Bottle](https://poly.pizza/m/NxbygmpVwR) (stand-in) | CC0 1.0 | 560 |
| 63 | Vinyl records | collectibles | vinyl record, record player, turntable | [Record Player](https://poly.pizza/m/uaz6praPQc) (stand-in) | CC-BY 3.0 | 412 |
| 64 | Books | collectibles | book, stack of books | [Open Book](https://poly.pizza/m/FsCIGEfTEs) | CC0 1.0 | 592 |
| 65 | Trading cards | collectibles | baseball card, playing card, trading card, pokemon card | **miss** |  |  |
| 66 | Lego or toys | collectibles | lego, toy brick, building blocks, toy car | [LEGO Brick](https://poly.pizza/m/f4-AUM_gO-R) | CC-BY 3.0 | 364 |
| 67 | Action figure | collectibles | action figure, figurine, toy robot, doll | [Doll](https://poly.pizza/m/YUAwclCDrF) (stand-in) | CC0 1.0 | 1234 |
| 68 | Model railway | collectibles | train, toy train, locomotive | [Bullet train](https://poly.pizza/m/b9NCKiXV0IZ) | CC-BY 3.0 | 2092 |
| 69 | Football memorabilia | collectibles | football, trophy | [Trophy](https://poly.pizza/m/fLy8KmmD1t) (stand-in) | CC0 1.0 | 518 |
| 70 | Golf clubs | assets | golf club, golf | [Golf Club](https://poly.pizza/m/26nMm9C7Bw) | CC0 1.0 | 702 |
| 71 | Treadmill and gym kit | assets | treadmill, dumbbell, exercise bike | **miss** |  |  |
| 72 | Dumbbells | assets | dumbbell, weights, kettlebell | [Dumbbell](https://poly.pizza/m/6nGMIxBENld) | CC-BY 3.0 | 656 |
| 73 | Surfboard | assets | surfboard | [Surfboard](https://poly.pizza/m/dkwqsVsI2R0) | CC-BY 3.0 | 1280 |
| 74 | Skis and snowboard | assets | snowboard, skis | [Snowboard](https://poly.pizza/m/sMbO7OqgNX) | CC0 1.0 | 182 |
| 75 | Fishing rod | assets | fishing rod | [Fishing Rod](https://poly.pizza/m/lDlWQjn9Zg) | CC0 1.0 | 910 |
| 76 | Tent and camping kit | assets | tent, camping | [Tent](https://poly.pizza/m/5Q7qIrfDxA) | CC0 1.0 | 784 |
| 77 | Pushchair | assets | pram, stroller, baby carriage, baby buggy | **miss** |  |  |
| 78 | Cot | assets | baby crib, cot, baby bed, nursery | [Cot](https://poly.pizza/m/fGlFPYb8CCg) | CC-BY 3.0 | 684 |
| 79 | Smartwatch | assets | smart watch, smartwatch, fitness tracker, watch | **miss** |  |  |
| 80 | Printer | assets | printer | [Printer](https://poly.pizza/m/77K2TCL5Lz) | CC0 1.0 | 182 |
| 81 | Router and smart speaker | assets | router, smart speaker, speaker | [Speaker](https://poly.pizza/m/zOQOThSpuo) (stand-in) | CC0 1.0 | 794 |
| 82 | Drone | assets | drone, quadcopter | [Drone core](https://poly.pizza/m/dCOUTcu89u6) | CC-BY 3.0 | 864 |
| 83 | Games PC | assets | gaming pc, computer tower | [Computer Tower](https://poly.pizza/m/4TZXM3lO5KK) | CC-BY 3.0 | 612 |
| 84 | Hi-fi system | assets | hifi, stereo, speaker | [Speaker](https://poly.pizza/m/hG0jIuHdCh) | CC0 1.0 | 990 |
| 85 | Projector | assets | projector, video projector, beamer, cinema | [projector](https://poly.pizza/m/4oVHZbDvwV8) | CC-BY 3.0 | 680 |
| 86 | Vacuum cleaner | assets | vacuum cleaner, hoover | [Hoover](https://poly.pizza/m/YlXWSJfZ6h) | CC-BY 3.0 | 8398 |
| 87 | Coffee machine | assets | coffee machine, coffee maker | [Coffee Machine](https://poly.pizza/m/EWVe4TaOiB) | CC-BY 3.0 | 1786 |
| 88 | Boiler | assets | boiler, water heater, radiator, furnace | **miss** |  |  |
| 89 | Solar panels | liabilities | solar panel, solar | [Flat Solar Panel](https://poly.pizza/m/bvw2d4XUKR) | CC0 1.0 | 496 |
| 90 | Hot tub | assets | hot tub, jacuzzi, spa, swimming pool | **miss** |  |  |
| 91 | Garden furniture | assets | garden furniture, patio set, bench | [Bench](https://poly.pizza/m/jLxjFxFRpw) | CC0 1.0 | 376 |
| 92 | Greenhouse | assets | greenhouse | [Greenhouse](https://poly.pizza/m/exys3emjr1) | CC-BY 3.0 | 560 |
| 93 | Safe | assets | safe, vault | [Safe](https://poly.pizza/m/N4egHD2Vms) | CC0 1.0 | 222 |
| 94 | Chest of valuables | assets | treasure chest, chest | [Chest](https://poly.pizza/m/RfSBvgcZUD) (stand-in) | CC0 1.0 | 3422 |
| 95 | Banknotes | assets | money, banknote, cash, dollar | [Cash Stack](https://poly.pizza/m/aLp0P2nXJ2) | CC-BY 3.0 | 2056 |
| 96 | Piggy bank | liabilities | piggy bank | [Piggy Bank](https://poly.pizza/m/1KAexv0Erv) | CC0 1.0 | 626 |
| 97 | Credit card | liabilities | credit card, bank card, payment card, debit card | **miss** |  |  |
| 98 | Student loan (graduation cap) | liabilities | graduation cap, mortarboard | [Graduation cap](https://poly.pizza/m/6bFfEY7M9qP) | CC-BY 3.0 | 2470 |
| 99 | Mortgage (house) | liabilities | house, home, cottage, family house | [House](https://poly.pizza/m/RSwoYSLblu) | CC0 1.0 | 3504 |
| 100 | Flat or apartment | assets | apartment, apartment building, flats | [Apartment 2](https://poly.pizza/m/dtgO5dwwtkk) | CC-BY 3.0 | 7530 |

## Misses (11)

- 21. Camera (rejected: (CCTV Camera))
- 30. Tumble dryer (rejected: (Washing Machine))
- 47. Trailer (rejected: (Car))
- 53. Silver bar (rejected: (Metal Bars))
- 65. Trading cards (rejected: (Baseball Bat))
- 71. Treadmill and gym kit (rejected: (Dumbbell))
- 77. Pushchair (no match)
- 79. Smartwatch (rejected: (Fitness Character))
- 88. Boiler (rejected: (Radiator))
- 90. Hot tub (rejected: (Swimming pool))
- 97. Credit card (rejected: (Card Reader))

Suggested fills for the misses (all CC0 or similar, no sign-up needed unless stated):

- **Kenney** (kenney.nl/assets, CC0): furniture, appliance, car and tool kits as GLB. Good for the fridge, dryer, boiler and trailer-style gaps. Free to download in bulk.
- **Quaternius** (quaternius.com, CC0): large low-poly packs, including props, vehicles and household items.
- **Poly Haven models** (polyhaven.com/models, CC0): realistic, heavier (often over 20k triangles) so would need decimating; API is open and needs no key.
- **Smithsonian 3D open access** (3d.si.edu, CC0): artefacts, art and antiques for the collectibles group; scans are heavy and need decimating.
- **Sketchfab** (Download API): large CC0 and CC-BY selection, including smartwatch, pram, treadmill, hot tub and credit card. Needs a free account and an API token; downloads are per model and licences vary, so check each one. Not signed up for.

## Connectors and MCP tools

Checked this session: no 3D model, Sketchfab or Poly Pizza tool is available. The Treg catalogue (4,100+ endpoints) returned only web search and scraping for a 3D query. Figma, Canva and Cloudflare connectors are present but do not help find models. The Cloudflare connector can manage the R2 bucket for the upload step. No new connector is needed for the first pass. A Sketchfab token would unlock the misses. Kenney and Quaternius are plain downloads that could be added to the fetch script with a second source list if wanted.

## More sets

Cars, instruments by brand and model, and collectibles by model are in [MODEL_LIBRARY_SETS.md](MODEL_LIBRARY_SETS.md), with the Sketchfab step for brand-specific models. CC licences cover the model, not trademarks or logos: branded models are fine shown privately in a user's inventory, never in marketing. Combined size estimate for all sets is in that document.
