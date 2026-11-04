# 3D model library: cars, instruments and collectibles

Three more ranked sets on top of the [top 100 owned items](MODEL_LIBRARY_TOP100.md). Same catalogue shape (`models/catalog.source.<set>.json`, item lists in `models/items.<set>.tsv`), each model carrying a `set` field and, where the model is only a look-alike, `standin: true` plus `standinFor` (the real item it stands in for). Built 3 November 2026 from the Poly Pizza search API.

## Counts

| Set | Items | Exact model | Stand-in | Miss | CC0 | CC-BY |
|-----|-------|-------------|----------|------|-----|-------|
| cars | 100 | 8 | 29 | 63 | 9 | 28 |
| instruments | 100 | 14 | 41 | 45 | 2 | 53 |
| collectibles | 100 | 22 | 30 | 48 | 17 | 35 |

Poly Pizza is a low-poly hobby library, so brand-exact models are rare: most matches are generic look-alikes (a car for a Ford Fiesta, a keyboard for a Nord Stage). A stand-in is honest but not what the owner will want long term. A look-alike that was plainly the wrong object (a ship for a Fiat 500, a guitar pedal for an Ibanez) was rejected and moved to the misses on review (`models/exclude.json`). The misses are what the Sketchfab step below is for.

## Size estimate

The API gives no file sizes. 208 unique models across all four sets (the top 100 plus these three; some models serve more than one item and are downloaded once), 453,563 triangles in total. Estimated download before compression: about 17 to 44 MB. That is under the 60 MB line, so bundling in the repo is workable for now, but expect it to pass 60 MB once the Sketchfab replacements arrive (Sketchfab models are usually heavier, with textures). Plan on R2 hosting at assets.ptlive.design/vault-it/models/ (`tools/upload-models.sh`) rather than shipping these files with the app, and run `--compress`.

## Ranking sources

- **Cars**: ranks 1 to 20 follow the Department for Transport vehicle licensing statistics (licensed cars by model, Great Britain, end of June 2026, 33.8 million cars), as tabulated at https://www.ukmotoring.co.uk/statistics/most-popular-cars/ . Ranks 21 to 100 are an editorial order informed by the same DVLA figures (for example the howrareismycar.co.uk list of the most common 2010s cars) and SMMT used-car sales (Q2 2026 and full year 2025: Fiesta, Corsa, Golf, Focus, BMW 3 Series, MINI, Polo, Astra, Qashqai, A3). They are not an exact count. The last block is classic, performance and collector cars, ranked by desirability and value rather than numbers on the road.
- **Instruments and collectibles**: no official statistic exists. Ranked roughly by how widely owned and how valuable (guitars, pianos and drums before synths and rarities; watches, handbags and trainers before comics and stamps). Editorial.

## How to fetch (owner's laptop)

Git Bash, folder `~/Projects/Vault-It`. Needs Node 18+.

```
git fetch origin v09x/model-library
git checkout v09x/model-library
node tools/fetch-models.mjs
```

That downloads every set from Poly Pizza (add `--set cars` to do one, `--compress` to shrink, `--dry` to list). Failed files are named in the output and the script exits non-zero; re-running only fetches what is missing.

## Filling the misses and stand-ins from Sketchfab

Sketchfab is where brand-specific models live. It needs a free account and an API token (sketchfab.com, Settings, Password and API). api.sketchfab.com is blocked in the cloud sandbox, so this runs on the laptop. The tools are written and dry-run only as far as the sandbox allows: argument and file handling were exercised, but no live Sketchfab response has been seen, so expect to fix field names on the first real run.

```
export SKETCHFAB_TOKEN=paste-your-token-here
node tools/search-sketchfab.mjs
```

This reads every miss and stand-in, searches `/v3/search?type=models&downloadable=true`, keeps only CC0 and CC-BY (rejects by-sa, by-nd, by-nc, standard/store and editorial licences), prefers models under 20,000 faces (larger ones up to 100,000 are kept but flagged `needsDecimation`), and writes up to five candidates per item to `models/sketchfab.candidates.json`. Nothing is downloaded. Open that file, check each candidate on its `viewer` page, and set `"approved": true` on one per item. Then:

```
node tools/fetch-models.mjs
```

Approved Sketchfab models are downloaded through the download endpoint (token needed) and replace the Poly Pizza pick for that item; their attribution goes into `models/CREDITS.md`. The script needs the endpoint to offer a GLB. If it only offers a glTF zip, that item is reported as failed with the model page, and it needs converting by hand (gltf-transform). Use `--no-sketchfab` to skip them. Decimate any `needsDecimation` model before use. The signed download links come from a Sketchfab storage host that changes, which is why the script allows any https host for Sketchfab downloads only; this is a build-time step on the laptop, never something the app calls.

## Licences, trademarks and privacy

- CC licences cover the model, not the brand. Names, logos and designs such as Rolex, Fender, Ferrari or Lego remain the trademarks of their owners. Showing a branded model privately in a user's own inventory is fine. Never use branded models in marketing, on the landing page or in store listings.
- CC-BY models must keep their credit (`models/CREDITS.md`, generated by the fetch script). By-nc, by-nd and editorial-only models are never used.
- Download hosts (static.poly.pizza, api.sketchfab.com and its storage host) are touched only by the build script on the owner's machine. The app loads from our own R2 domain; if the app ever called an outside host directly, the privacy notice would need a line for it first.
- Sign-ups needed: a free Sketchfab account and API token. Nothing else.

## Items by set

### Top 100 cars

| # | Item | Match | Licence | Tris |
|---|------|-------|---------|------|
| 1 | Ford Fiesta | [Car Hatchback](https://poly.pizza/m/BG0KAhmGDt) (stand-in) | CC0 1.0 | 1194 |
| 2 | Volkswagen Golf | [Sports Hatchback](https://poly.pizza/m/DobtD8JyoW) (stand-in) | CC-BY 3.0 | 18302 |
| 3 | Vauxhall Corsa | **miss** |  |  |
| 4 | Ford Focus | **miss** |  |  |
| 5 | Nissan Qashqai | [SUV](https://poly.pizza/m/xsMtZhBkxL) (stand-in) | CC0 1.0 | 2444 |
| 6 | Volkswagen Polo | [Mini Car !](https://poly.pizza/m/eNH2gURnsVB) (stand-in) | CC-BY 3.0 | 3570 |
| 7 | Toyota Yaris | [Sports Car](https://poly.pizza/m/OyqKvX9xNh) (stand-in) | CC0 1.0 | 2216 |
| 8 | MINI Cooper | **miss** |  |  |
| 9 | Vauxhall Astra | [Car](https://poly.pizza/m/Cz6yDaUcM9) (stand-in) | CC0 1.0 | 2102 |
| 10 | BMW 3 Series | [Sports Car](https://poly.pizza/m/1mkmFkAz5v) (stand-in) | CC0 1.0 | 2298 |
| 11 | Audi A3 | [Sports Car](https://poly.pizza/m/Gzj704DXdr) (stand-in) | CC0 1.0 | 3890 |
| 12 | BMW 1 Series | [Car](https://poly.pizza/m/e9mZ3KfkO6l) (stand-in) | CC-BY 3.0 | 2930 |
| 13 | Kia Sportage | [CAR Model](https://poly.pizza/m/5zUWP5UsLg-) (stand-in) | CC-BY 3.0 | 7396 |
| 14 | Fiat 500 | **miss** |  |  |
| 15 | Nissan Juke | **miss** |  |  |
| 16 | Mercedes-Benz A-Class | [Car](https://poly.pizza/m/75h3mi6uHuC) (stand-in) | CC-BY 3.0 | 2050 |
| 17 | Ford Kuga | **miss** |  |  |
| 18 | Honda Jazz | **miss** |  |  |
| 19 | Volkswagen Tiguan | **miss** |  |  |
| 20 | Mercedes-Benz C-Class | [Police Car](https://poly.pizza/m/Uj7i2vlmir) (stand-in) | CC0 1.0 | 1316 |
| 21 | Toyota Aygo | **miss** |  |  |
| 22 | Hyundai i10 | [Red Car](https://poly.pizza/m/7h-gfgCLPVO) (stand-in) | CC-BY 3.0 | 5708 |
| 23 | Renault Clio | [Car](https://poly.pizza/m/Uap8uBrkU8) (stand-in) | CC-BY 3.0 | 2300 |
| 24 | Peugeot 208 | [80s Car](https://poly.pizza/m/7tPSW5UYD20) (stand-in) | CC-BY 3.0 | 3735 |
| 25 | Vauxhall Mokka | **miss** |  |  |
| 26 | Audi A1 | [Car](https://poly.pizza/m/HQ0hvRM2XR) (stand-in) | CC-BY 3.0 | 2854 |
| 27 | Vauxhall Insignia | [Racing car](https://poly.pizza/m/EMcTJiXibv) (stand-in) | CC0 1.0 | 1120 |
| 28 | Ford Transit | [Generic Van](https://poly.pizza/m/BbRojf2v3H) (stand-in) | CC-BY 3.0 | 2423 |
| 29 | Ford Transit Custom | [Van](https://poly.pizza/m/akcsFuPMt3b) (stand-in) | CC-BY 3.0 | 5434 |
| 30 | Volkswagen Transporter | [Van](https://poly.pizza/m/9hUUD2DWk1v) (stand-in) | CC-BY 3.0 | 3814 |
| 31 | Mercedes-Benz E-Class | [Red Car](https://poly.pizza/m/dVLJ5CjB0h) (stand-in) | CC-BY 3.0 | 1688 |
| 32 | Land Rover Discovery | **miss** |  |  |
| 33 | Range Rover Evoque | **miss** |  |  |
| 34 | Audi A4 | **miss** |  |  |
| 35 | Seat Leon | [Car](https://poly.pizza/m/cvKjiD6ysLh) (stand-in) | CC-BY 3.0 | 2152 |
| 36 | Skoda Octavia | **miss** |  |  |
| 37 | Skoda Fabia | **miss** |  |  |
| 38 | Seat Ibiza | **miss** |  |  |
| 39 | Citroen C3 | **miss** |  |  |
| 40 | Tesla Model 3 | [Car](https://poly.pizza/m/eRu2kPYOCa7) (stand-in) | CC-BY 3.0 | 2152 |
| 41 | Tesla Model Y | **miss** |  |  |
| 42 | Nissan Leaf | **miss** |  |  |
| 43 | Toyota Prius | [Car](https://poly.pizza/m/csi46jKTLGH) (stand-in) | CC-BY 3.0 | 14090 |
| 44 | Toyota RAV4 | **miss** |  |  |
| 45 | Toyota Corolla | **miss** |  |  |
| 46 | Honda Civic | **miss** |  |  |
| 47 | Honda CR-V | **miss** |  |  |
| 48 | Mazda MX-5 | **miss** |  |  |
| 49 | Kia Picanto | **miss** |  |  |
| 50 | Peugeot 3008 | **miss** |  |  |
| 51 | Renault Captur | **miss** |  |  |
| 52 | Dacia Sandero | **miss** |  |  |
| 53 | Volvo XC90 | **miss** |  |  |
| 54 | Volvo V40 | **miss** |  |  |
| 55 | Jaguar XF | **miss** |  |  |
| 56 | Land Rover Defender | [Jeep](https://poly.pizza/m/AcSdGGrgYP) (stand-in) | CC-BY 3.0 | 1930 |
| 57 | Range Rover | **miss** |  |  |
| 58 | Mercedes-Benz GLC | **miss** |  |  |
| 59 | BMW X5 | **miss** |  |  |
| 60 | Audi Q5 | **miss** |  |  |
| 61 | Ford Ranger | [Pickup Truck](https://poly.pizza/m/qn4grQgHm8) (stand-in) | CC0 1.0 | 4160 |
| 62 | Toyota Hilux | [Toyota Hilux 97](https://poly.pizza/m/8-0nFArehjd) | CC-BY 3.0 | 958 |
| 63 | Mitsubishi L200 | [Mitsubishi L200](https://poly.pizza/m/4qjS9tFhsJg) | CC-BY 3.0 | 2899 |
| 64 | Ford Mustang | **miss** |  |  |
| 65 | Audi TT | **miss** |  |  |
| 66 | BMW M3 | **miss** |  |  |
| 67 | Mercedes-AMG GT | **miss** |  |  |
| 68 | Porsche 911 | **miss** |  |  |
| 69 | Porsche Cayenne | **miss** |  |  |
| 70 | Porsche Boxster | [Convertible](https://poly.pizza/m/dggOiBLYyuR) (stand-in) | CC-BY 3.0 | 1671 |
| 71 | Jaguar F-Type | **miss** |  |  |
| 72 | Nissan GT-R | **miss** |  |  |
| 73 | Subaru Impreza | **miss** |  |  |
| 74 | Mitsubishi Lancer Evo | **miss** |  |  |
| 75 | Lotus Elise | [Lotus](https://poly.pizza/m/bunaVqCTDSZ) | CC-BY 3.0 | 2304 |
| 76 | Aston Martin DB5 | [Retro car](https://poly.pizza/m/coSYdjhglCZ) (stand-in) | CC-BY 3.0 | 944 |
| 77 | Aston Martin Vantage | **miss** |  |  |
| 78 | Bentley Continental GT | **miss** |  |  |
| 79 | Rolls-Royce Phantom | [Rolls Royce](https://poly.pizza/m/3DtJTlxgO_U) | CC-BY 3.0 | 1168 |
| 80 | Ferrari 458 | [Ferrari F40](https://poly.pizza/m/RTwim9bhNd) (stand-in) | CC-BY 3.0 | 4724 |
| 81 | Lamborghini Huracan | **miss** |  |  |
| 82 | McLaren 720S | **miss** |  |  |
| 83 | Maserati Ghibli | **miss** |  |  |
| 84 | Alfa Romeo Giulia | **miss** |  |  |
| 85 | Morgan Plus 4 | **miss** |  |  |
| 86 | Mini (classic 1959) | **miss** |  |  |
| 87 | Volkswagen Beetle | [Beetle](https://poly.pizza/m/4yufxgZ1QQ2) | CC-BY 3.0 | 904 |
| 88 | VW Camper Van (T2) | **miss** |  |  |
| 89 | Jaguar E-Type | **miss** |  |  |
| 90 | MG MGB | **miss** |  |  |
| 91 | Triumph Spitfire | **miss** |  |  |
| 92 | Ford Escort Mk2 | **miss** |  |  |
| 93 | Ford GT40 | **miss** |  |  |
| 94 | Chevrolet Corvette | **miss** |  |  |
| 95 | Chevrolet Camaro | [Chevrolet Camaro](https://poly.pizza/m/kVcKsd2dEk) | CC-BY 3.0 | 3290 |
| 96 | Dodge Challenger | [2015 Dodge Challenger](https://poly.pizza/m/1jB8I4t5w4) | CC-BY 3.0 | 6857 |
| 97 | DeLorean DMC-12 | [DeLorean DMC-12](https://poly.pizza/m/1uZKezeldGG) | CC-BY 3.0 | 3544 |
| 98 | Fiat 500 (classic) | **miss** |  |  |
| 99 | Citroen 2CV | **miss** |  |  |
| 100 | Land Rover Series (classic) | **miss** |  |  |

### Instruments by brand and model

| # | Item | Match | Licence | Tris |
|---|------|-------|---------|------|
| 1 | Fender Stratocaster | [Guitar](https://poly.pizza/m/5Fp8gpomrb) (stand-in) | CC0 1.0 | 2325 |
| 2 | Gibson Les Paul | [Guitar](https://poly.pizza/m/HIyVF2jsHR) (stand-in) | CC-BY 3.0 | 1170 |
| 3 | Fender Telecaster | **miss** |  |  |
| 4 | Gibson SG | [Guitar](https://poly.pizza/m/kcTMv1yFhr) (stand-in) | CC-BY 3.0 | 608 |
| 5 | Gibson ES-335 | [Electric guitar](https://poly.pizza/m/eoSib2-NN9Y) (stand-in) | CC-BY 3.0 | 560 |
| 6 | Gibson Flying V | [Electric guitar](https://poly.pizza/m/0hg94uOO-sS) (stand-in) | CC-BY 3.0 | 996 |
| 7 | Gibson Explorer | **miss** |  |  |
| 8 | PRS Custom 24 | **miss** |  |  |
| 9 | Ibanez RG | **miss** |  |  |
| 10 | Fender Jazzmaster | **miss** |  |  |
| 11 | Rickenbacker 330 | **miss** |  |  |
| 12 | Gretsch White Falcon | [guitar](https://poly.pizza/m/elRGCxnNOsb) (stand-in) | CC-BY 3.0 | 588 |
| 13 | Epiphone Casino | [Guitar](https://poly.pizza/m/kcGY8EfXDO) (stand-in) | CC-BY 3.0 | 9126 |
| 14 | Squier Stratocaster | **miss** |  |  |
| 15 | Martin D-28 | [Acoustic Guitar](https://poly.pizza/m/6T31WFHAZR) (stand-in) | CC-BY 3.0 | 11877 |
| 16 | Taylor 814ce | [Acoustic guitar](https://poly.pizza/m/ccd__UcZBye) (stand-in) | CC-BY 3.0 | 12829 |
| 17 | Gibson J-45 | **miss** |  |  |
| 18 | Yamaha FG800 | **miss** |  |  |
| 19 | Guild D-55 | **miss** |  |  |
| 20 | Ovation Celebrity | **miss** |  |  |
| 21 | Classical guitar (Yamaha C40) | **miss** |  |  |
| 22 | Ukulele (Kala) | **miss** |  |  |
| 23 | Banjo | **miss** |  |  |
| 24 | Mandolin | **miss** |  |  |
| 25 | Fender Precision Bass | **miss** |  |  |
| 26 | Fender Jazz Bass | **miss** |  |  |
| 27 | Hofner Violin Bass | **miss** |  |  |
| 28 | Music Man StingRay | **miss** |  |  |
| 29 | Upright double bass | **miss** |  |  |
| 30 | Steinway grand piano | [Piano](https://poly.pizza/m/5vbJ5vildOq) (stand-in) | CC-BY 3.0 | 1576 |
| 31 | Yamaha upright piano | [Piano](https://poly.pizza/m/cqH2tjgBeTj) (stand-in) | CC-BY 3.0 | 600 |
| 32 | Kawai grand piano | [Piano](https://poly.pizza/m/DcLRWpe0YV) (stand-in) | CC-BY 3.0 | 1195 |
| 33 | Baby grand piano | [Piano](https://poly.pizza/m/7U-93vxPOER) (stand-in) | CC-BY 3.0 | 1936 |
| 34 | Bechstein piano | [Piano](https://poly.pizza/m/1YoE664mJTd) (stand-in) | CC-BY 3.0 | 1264 |
| 35 | Yamaha digital piano (P-125) | [Keyboard](https://poly.pizza/m/3oFfQCSsUmQ) (stand-in) | CC-BY 3.0 | 1972 |
| 36 | Yamaha Clavinova | [Piano Keys](https://poly.pizza/m/akGT4Q8Zbwz) (stand-in) | CC-BY 3.0 | 576 |
| 37 | Roland Juno-106 | **miss** |  |  |
| 38 | Roland Jupiter-8 | **miss** |  |  |
| 39 | Roland TR-808 | [Drum Machine (without stand)](https://poly.pizza/m/dFVcqyAnPXE) (stand-in) | CC-BY 3.0 | 1752 |
| 40 | Roland TB-303 | **miss** |  |  |
| 41 | Roland Fantom | [Keyboard](https://poly.pizza/m/fOy2zvPJAj-) (stand-in) | CC-BY 3.0 | 612 |
| 42 | Korg Kronos | [Keyboard](https://poly.pizza/m/aPwr5p1dluw) (stand-in) | CC-BY 3.0 | 2224 |
| 43 | Korg MS-20 | **miss** |  |  |
| 44 | Nord Stage | [Keyboard](https://poly.pizza/m/4pzLbWshZ9m) (stand-in) | CC-BY 3.0 | 2872 |
| 45 | Moog Minimoog | **miss** |  |  |
| 46 | Moog Subsequent 37 | **miss** |  |  |
| 47 | Sequential Prophet-5 | **miss** |  |  |
| 48 | Yamaha DX7 | **miss** |  |  |
| 49 | Hammond B3 organ | **miss** |  |  |
| 50 | Fender Rhodes | [Keyboard](https://poly.pizza/m/1U29qLrhNs3) (stand-in) | CC-BY 3.0 | 828 |
| 51 | Mellotron | [Keyboard](https://poly.pizza/m/4GlTQkxc6DR) (stand-in) | CC-BY 3.0 | 2557 |
| 52 | Akai MPC | [Drum Machine 2](https://poly.pizza/m/eflBcV4gcIl) (stand-in) | CC-BY 3.0 | 1796 |
| 53 | Ableton Push | [Midi controller](https://poly.pizza/m/155LOgjwUy2) (stand-in) | CC-BY 3.0 | 1112 |
| 54 | Pearl Export drum kit | [Drumkit](https://poly.pizza/m/4l5jRtpTec) (stand-in) | CC-BY 3.0 | 5222 |
| 55 | DW Collector's drum kit | [Full Drum Kit](https://poly.pizza/m/1HvDgRF7fX) (stand-in) | CC-BY 3.0 | 9969 |
| 56 | Ludwig Classic Maple | **miss** |  |  |
| 57 | Yamaha Stage Custom drums | [Drum Kit](https://poly.pizza/m/7FCPjy-3xmz) (stand-in) | CC-BY 3.0 | 3776 |
| 58 | Tama Starclassic | [Drum Set](https://poly.pizza/m/qWU9Q4flfQ) (stand-in) | CC-BY 3.0 | 2940 |
| 59 | Roland V-Drums | [Drum](https://poly.pizza/m/5Wp2emwd7xw) (stand-in) | CC-BY 3.0 | 720 |
| 60 | Zildjian cymbals | [Cymbal](https://poly.pizza/m/f8SdBE98BXE) | CC-BY 3.0 | 1152 |
| 61 | Snare drum | **miss** |  |  |
| 62 | Bongos and congas | [Bongos](https://poly.pizza/m/4tAGfJTheb4) | CC-BY 3.0 | 2812 |
| 63 | Cajon | [Drum](https://poly.pizza/m/c3RNKJflc4O) (stand-in) | CC-BY 3.0 | 2084 |
| 64 | Tambourine | [Tambourine](https://poly.pizza/m/caYGHrUMU2S) | CC-BY 3.0 | 118 |
| 65 | Xylophone | [Xylophone](https://poly.pizza/m/a-OYg3WVXfV) | CC-BY 3.0 | 3448 |
| 66 | Tenor saxophone (Selmer) | [Saxophone](https://poly.pizza/m/6A2UAKdCNy7) | CC-BY 3.0 | 812 |
| 67 | Alto saxophone (Yamaha) | **miss** |  |  |
| 68 | Trumpet (Bach Stradivarius) | [Trumpet](https://poly.pizza/m/dXISS4OsDQv) | CC-BY 3.0 | 720 |
| 69 | Trombone | **miss** |  |  |
| 70 | French horn | **miss** |  |  |
| 71 | Tuba | **miss** |  |  |
| 72 | Cornet | [Trumpet](https://poly.pizza/m/dGWXRc1MVuC) (stand-in) | CC-BY 3.0 | 1482 |
| 73 | Clarinet (Buffet) | **miss** |  |  |
| 74 | Flute (Yamaha) | [Flute](https://poly.pizza/m/xwXCysotkW) | CC-BY 3.0 | 368 |
| 75 | Oboe | **miss** |  |  |
| 76 | Harmonica (Hohner) | [Harmonica](https://poly.pizza/m/8Aw334FnDZE) | CC-BY 3.0 | 968 |
| 77 | Recorder | **miss** |  |  |
| 78 | Bagpipes | **miss** |  |  |
| 79 | Accordion | [Concertina](https://poly.pizza/m/c6xbxbD6iyQ) (stand-in) | CC-BY 3.0 | 4464 |
| 80 | Violin (Stradivarius) | [Violin](https://poly.pizza/m/4yO-XrJiBlc) | CC-BY 3.0 | 824 |
| 81 | Viola | [Violin](https://poly.pizza/m/fhj0GK-0kJu) (stand-in) | CC-BY 3.0 | 560 |
| 82 | Cello | **miss** |  |  |
| 83 | Harp | [Harp](https://poly.pizza/m/102E7hcxEPT) | CC-BY 3.0 | 1370 |
| 84 | Electric violin | **miss** |  |  |
| 85 | Technics SL-1200 | [Record Player](https://poly.pizza/m/uaz6praPQc) (stand-in) | CC-BY 3.0 | 412 |
| 86 | Pioneer CDJ-3000 | [simple pioneer 2000 cdj](https://poly.pizza/m/d6zioc9MKjM) | CC-BY 3.0 | 246 |
| 87 | Pioneer DJM mixer | [Digital Audio Mixing Desk](https://poly.pizza/m/1_EUPvzknB-) (stand-in) | CC-BY 3.0 | 4436 |
| 88 | DJ controller (Serato) | [Mixing Desk for Audio](https://poly.pizza/m/4GCowIjU9CG) (stand-in) | CC-BY 3.0 | 4436 |
| 89 | Mixing desk (Neve) | **miss** |  |  |
| 90 | Shure SM58 microphone | [Microphone](https://poly.pizza/m/bD-LseANe2b) (stand-in) | CC-BY 3.0 | 184 |
| 91 | Neumann U87 microphone | [Microphone](https://poly.pizza/m/2cDNCSVfAfv) (stand-in) | CC-BY 3.0 | 68 |
| 92 | Studio monitors (Yamaha HS8) | [Speaker](https://poly.pizza/m/zOQOThSpuo) (stand-in) | CC0 1.0 | 794 |
| 93 | Marshall stack amp | [Amp](https://poly.pizza/m/aNo2sUJR6Vo) (stand-in) | CC-BY 3.0 | 3460 |
| 94 | Fender Twin Reverb amp | [Amp](https://poly.pizza/m/8Qzh7Jl1n3V) (stand-in) | CC-BY 3.0 | 1316 |
| 95 | Vox AC30 | **miss** |  |  |
| 96 | Orange amp | **miss** |  |  |
| 97 | Boss effects pedal | [Valve Overdrive Effects Pedal](https://poly.pizza/m/4ByYTgKdZGq) | CC-BY 3.0 | 3046 |
| 98 | Pedalboard | **miss** |  |  |
| 99 | Gramophone | [Gramophone](https://poly.pizza/m/fs3aTWoMyNw) | CC-BY 3.0 | 1848 |
| 100 | Music stand and sheet music | [Music stand](https://poly.pizza/m/3zlFGH_TJ8h) | CC-BY 3.0 | 1176 |

### Collectibles and branded goods

| # | Item | Match | Licence | Tris |
|---|------|-------|---------|------|
| 1 | Rolex Submariner | [Watch](https://poly.pizza/m/5MFJqeBgWBn) (stand-in) | CC-BY 3.0 | 796 |
| 2 | Rolex Daytona | [Wrist Watch](https://poly.pizza/m/6908NHM0OcR) (stand-in) | CC-BY 3.0 | 1016 |
| 3 | Rolex Datejust | **miss** |  |  |
| 4 | Rolex GMT-Master II | **miss** |  |  |
| 5 | Omega Speedmaster | **miss** |  |  |
| 6 | Omega Seamaster | **miss** |  |  |
| 7 | Patek Philippe Nautilus | **miss** |  |  |
| 8 | Audemars Piguet Royal Oak | **miss** |  |  |
| 9 | Cartier Tank | **miss** |  |  |
| 10 | TAG Heuer Carrera | **miss** |  |  |
| 11 | Breitling Navitimer | **miss** |  |  |
| 12 | Tudor Black Bay | **miss** |  |  |
| 13 | Seiko 5 Sports | **miss** |  |  |
| 14 | Casio G-Shock | **miss** |  |  |
| 15 | Casio F-91W | **miss** |  |  |
| 16 | Apple Watch | **miss** |  |  |
| 17 | Garmin Fenix | **miss** |  |  |
| 18 | Pocket watch | **miss** |  |  |
| 19 | Chanel Classic Flap | [Bag](https://poly.pizza/m/VRfAODZ0Xk) (stand-in) | CC0 1.0 | 304 |
| 20 | Hermes Birkin | **miss** |  |  |
| 21 | Louis Vuitton Speedy | **miss** |  |  |
| 22 | Louis Vuitton trunk | [Steamer Trunk](https://poly.pizza/m/5fq-srYltCL) (stand-in) | CC-BY 3.0 | 4905 |
| 23 | Gucci Marmont | **miss** |  |  |
| 24 | Prada Re-Edition | **miss** |  |  |
| 25 | Cartier Love bracelet | [Pearl bracelet](https://poly.pizza/m/9zb8mXYP6J) (stand-in) | CC0 1.0 | 2414 |
| 26 | Tiffany engagement ring | [Diamond Solitaire  Ring](https://poly.pizza/m/37T8IFe_re3) (stand-in) | CC-BY 3.0 | 1148 |
| 27 | Pandora charm bracelet | **miss** |  |  |
| 28 | Pearl necklace | [Pearl necklace](https://poly.pizza/m/eyzMh_ozkF4) | CC-BY 3.0 | 6160 |
| 29 | Nike Air Jordan 1 | **miss** |  |  |
| 30 | Nike Dunk | **miss** |  |  |
| 31 | Nike Air Force 1 | **miss** |  |  |
| 32 | Nike Air Max 90 | **miss** |  |  |
| 33 | Adidas Yeezy | **miss** |  |  |
| 34 | Adidas Stan Smith | **miss** |  |  |
| 35 | New Balance 550 | **miss** |  |  |
| 36 | Converse Chuck Taylor | **miss** |  |  |
| 37 | LEGO Millennium Falcon | [Spaceship](https://poly.pizza/m/xNbtFQwirO) (stand-in) | CC0 1.0 | 584 |
| 38 | LEGO Technic car | [Car](https://poly.pizza/m/Cz6yDaUcM9) (stand-in) | CC0 1.0 | 2102 |
| 39 | LEGO Eiffel Tower | **miss** |  |  |
| 40 | LEGO minifigure | **miss** |  |  |
| 41 | LEGO Modular building | [Large Building](https://poly.pizza/m/ppwtREejXg) (stand-in) | CC0 1.0 | 2364 |
| 42 | Pokemon Charizard card | [Trading Card](https://poly.pizza/m/eNL1vYa4P6b) (stand-in) | CC-BY 3.0 | 92 |
| 43 | Pokemon booster box | **miss** |  |  |
| 44 | Football sticker album (Panini) | **miss** |  |  |
| 45 | Magic: The Gathering cards | **miss** |  |  |
| 46 | Vinyl LP record | [Vinyl record](https://poly.pizza/m/a_NspNjwTYv) | CC-BY 3.0 | 1664 |
| 47 | Beatles Abbey Road vinyl | [Record player](https://poly.pizza/m/4-d0cvpHjpS) (stand-in) | CC-BY 3.0 | 5602 |
| 48 | Record player | [Record Player](https://poly.pizza/m/uaz6praPQc) | CC-BY 3.0 | 412 |
| 49 | Marvel comic book | [Book](https://poly.pizza/m/h3Wh4fxSQX) (stand-in) | CC0 1.0 | 1060 |
| 50 | Action Comics #1 | **miss** |  |  |
| 51 | Banksy print | [Painting](https://poly.pizza/m/Pi6oReAizt) (stand-in) | CC0 1.0 | 164 |
| 52 | Art print (framed) | [Painting](https://poly.pizza/m/fWqUmeGBc-L) (stand-in) | CC-BY 3.0 | 170 |
| 53 | Oil painting | [Painting Canvas](https://poly.pizza/m/7bj0IgoTsr) | CC-BY 3.0 | 220 |
| 54 | Ceramic figurine (Royal Doulton) | **miss** |  |  |
| 55 | Ming vase | [Vase](https://poly.pizza/m/fLzSqhcYmKg) (stand-in) | CC-BY 3.0 | 957 |
| 56 | Grandfather clock | [Grandfathers Clock](https://poly.pizza/m/09YKIkFZnA) | CC0 1.0 | 547 |
| 57 | Antique chest | **miss** |  |  |
| 58 | Sovereign gold coin | [Goldcoin](https://poly.pizza/m/djfLUAiiZE) | CC-BY 3.0 | 2294 |
| 59 | Britannia gold coin | [Coin](https://poly.pizza/m/zsScrcPRgW) (stand-in) | CC0 1.0 | 1399 |
| 60 | Krugerrand | [Coin Piles](https://poly.pizza/m/9OWkKczINo) (stand-in) | CC0 1.0 | 3220 |
| 61 | Silver Britannia coin | [Silver Coin](https://poly.pizza/m/tmptMJF092) | CC-BY 3.0 | 260 |
| 62 | Penny Black stamp | **miss** |  |  |
| 63 | Bank of England banknote | [Cash Stack](https://poly.pizza/m/aLp0P2nXJ2) (stand-in) | CC-BY 3.0 | 2056 |
| 64 | Gold bar 1kg | [Gold Ingots](https://poly.pizza/m/3jRhAgbc6t) | CC0 1.0 | 648 |
| 65 | Sony PlayStation 5 | **miss** |  |  |
| 66 | Xbox Series X | **miss** |  |  |
| 67 | Nintendo Switch | [Nintendo Switch](https://poly.pizza/m/600PeFCBopv) | CC-BY 3.0 | 1202 |
| 68 | Nintendo Game Boy | [Gameboy](https://poly.pizza/m/47Wzb8DCUd1) | CC-BY 3.0 | 2322 |
| 69 | Super Nintendo (SNES) | [SNES](https://poly.pizza/m/7yVvvpp-ftQ) | CC-BY 3.0 | 2588 |
| 70 | Nintendo 64 | **miss** |  |  |
| 71 | Sega Mega Drive | **miss** |  |  |
| 72 | Atari 2600 | [Atari "Vader" VCS - Low Poly](https://poly.pizza/m/fjKB62qw6yu) | CC-BY 3.0 | 3186 |
| 73 | Sony PlayStation 1 | **miss** |  |  |
| 74 | Arcade cabinet | [Arcade Machine](https://poly.pizza/m/GLDkMhiynM) | CC-BY 3.0 | 686 |
| 75 | Pinball machine | [Arcade Machine](https://poly.pizza/m/bWFSJHIs8uI) (stand-in) | CC-BY 3.0 | 944 |
| 76 | Leica M | [Leica M3](https://poly.pizza/m/4mafzKwst8_) | CC-BY 3.0 | 10416 |
| 77 | Canon EOS | **miss** |  |  |
| 78 | Sony Alpha | [Camera](https://poly.pizza/m/eAoNPV5bfmK) (stand-in) | CC-BY 3.0 | 836 |
| 79 | Nikon F | **miss** |  |  |
| 80 | Polaroid camera | [Polaroids](https://poly.pizza/m/6BgcoF0LL6y) | CC-BY 3.0 | 980 |
| 81 | Brompton bike | [Bicycle](https://poly.pizza/m/19VoUuA2pcN) (stand-in) | CC-BY 3.0 | 1714 |
| 82 | Road bike (Pinarello) | **miss** |  |  |
| 83 | Mountain bike | [Bike](https://poly.pizza/m/DN6DCPopeH) (stand-in) | CC-BY 3.0 | 1962 |
| 84 | Penny-farthing | [Bicycle](https://poly.pizza/m/b6USSQA731J) (stand-in) | CC-BY 3.0 | 3712 |
| 85 | Vespa scooter | [Vespa](https://poly.pizza/m/blGLclvvdEM) | CC-BY 3.0 | 1667 |
| 86 | Triumph Bonneville | [Cartoony Purple Motorcycle](https://poly.pizza/m/j20srJUjpB) (stand-in) | CC0 1.0 | 1500 |
| 87 | Harley-Davidson | [Motorcycle](https://poly.pizza/m/cFvmALDjMKw) (stand-in) | CC-BY 3.0 | 5420 |
| 88 | Ducati Panigale | [Motorcycle](https://poly.pizza/m/0lBe-ApqJs4) (stand-in) | CC-BY 3.0 | 1934 |
| 89 | Royal Enfield Bullet | [Motorcycle](https://poly.pizza/m/dse64pqMKAR) (stand-in) | CC-BY 3.0 | 6361 |
| 90 | Teddy bear (Steiff) | **miss** |  |  |
| 91 | Barbie doll | [Doll](https://poly.pizza/m/YUAwclCDrF) (stand-in) | CC0 1.0 | 1234 |
| 92 | Hornby model railway | [Locomotive Wagon](https://poly.pizza/m/JCwr52pnuO) (stand-in) | CC0 1.0 | 7632 |
| 93 | Star Wars figure | **miss** |  |  |
| 94 | Rubik's cube | [Rubik's cube](https://poly.pizza/m/fOzaoeVGlG9) | CC-BY 3.0 | 468 |
| 95 | Whisky (Macallan) | [Old Bottle](https://poly.pizza/m/NxbygmpVwR) (stand-in) | CC0 1.0 | 560 |
| 96 | Vintage wine (Chateau Lafite) | [Bottle of wine](https://poly.pizza/m/65Hf2EMEo4s) | CC-BY 3.0 | 608 |
| 97 | Champagne (Dom Perignon) | [Champagne Bottle](https://poly.pizza/m/3Ho2qOyCsl) | CC0 1.0 | 448 |
| 98 | Fountain pen (Montblanc) | [Fountain pen](https://poly.pizza/m/0nyBBKNmXnr) | CC-BY 3.0 | 600 |
| 99 | Typewriter | [Typewriter](https://poly.pizza/m/2SmAWPS6_mH) | CC-BY 3.0 | 2082 |
| 100 | FA Cup trophy | [Trophy](https://poly.pizza/m/fLy8KmmD1t) | CC0 1.0 | 518 |
