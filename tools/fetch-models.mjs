#!/usr/bin/env node
// Vault·It — build-time 3D model catalogue fetcher.
// Pulls low-poly, openly licensed GLBs from Poly Pizza and Sketchfab (CC0 + CC-BY only, downloadable models),
// stores them in /models and writes models/catalog.json for the app to read.
// The API key never ships to the browser: run this locally, commit the output.
//
//   POLY_PIZZA_KEY=xxxx SKETCHFAB_TOKEN=yyyy node tools/fetch-models.mjs [--sources polypizza,sketchfab] [--per-query 3] [--max-tris 20000] [--no-compress] [--dry]
//
// Files are named <slug>-<sha1 of content>.glb so they can be cached forever (immutable).
// Catalogue paths are relative to the hosting base (models/ locally, R2 in production).
// Compression uses gltf-transform (Draco + WebP textures) via npx; skip with --no-compress.
//
// Node 18+. Keys: https://poly.pizza/settings/api and https://sketchfab.com/settings/password (API token).
// Sketchfab runs only when SKETCHFAB_TOKEN is set. Keys stay in this script's environment, never in the browser.
import { mkdir, writeFile, readFile, rename, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'models');
const KEY = process.env.POLY_PIZZA_KEY || 'dummy'; // proxied environments inject the real key
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > -1 ? (process.argv[i + 1] ?? true) : d; };
const PER_QUERY = +arg('per-query', 3);
const MAX_TRIS = +arg('max-tris', 20000);
const DRY = process.argv.includes('--dry');
const SF_TOKEN = process.env.SKETCHFAB_TOKEN || '';
const SOURCES = String(arg('sources', SF_TOKEN ? 'polypizza,sketchfab' : 'polypizza')).split(',');
const COMPRESS = !process.argv.includes('--no-compress');
const sha = buf => createHash('sha1').update(buf).digest('hex').slice(0, 10);

// group -> [{ q: search term, kind: label shown in the picker }]
const PLAN = {
  assets: [
    ['house', 'Property'], ['apartment building', 'Property'], ['car', 'Vehicle'], ['motorcycle', 'Vehicle'],
    ['yacht', 'Boat'], ['sailboat', 'Boat'], ['airplane', 'Aircraft'], ['laptop', 'Electronics'],
    ['phone', 'Electronics'], ['camera', 'Electronics'], ['gold bar', 'Precious metal'], ['coin', 'Precious metal'],
    ['diamond', 'Jewellery'], ['ring', 'Jewellery'], ['watch', 'Jewellery'], ['sofa', 'Furniture'],
    ['bicycle', 'Vehicle'], ['tractor', 'Vehicle'], ['safe', 'Valuables'], ['treasure chest', 'Valuables'],
  ],
  collectibles: [
    ['painting', 'Art'], ['statue', 'Art'], ['vase', 'Art'], ['trophy', 'Memorabilia'], ['guitar', 'Instruments'],
    ['piano', 'Instruments'], ['violin', 'Instruments'], ['wine bottle', 'Wine & spirits'], ['whisky', 'Wine & spirits'],
    ['sneaker', 'Fashion'], ['handbag', 'Fashion'], ['toy', 'Toys'], ['lego', 'Toys'], ['action figure', 'Toys'],
    ['book', 'Books'], ['vinyl record', 'Music'], ['arcade', 'Games'], ['game console', 'Games'], ['clock', 'Antiques'],
    ['sword', 'Antiques'], ['crown', 'Antiques'], ['chess', 'Games'],
  ],
  liabilities: [
    ['car', 'Car finance'], ['house', 'Mortgage'], ['credit card', 'Credit card'], ['boat', 'Boat loan'],
    ['caravan', 'Vehicle loan'], ['van', 'Vehicle loan'], ['student', 'Student loan'], ['graduation cap', 'Student loan'],
    ['invoice', 'Bills'], ['money bag', 'Debt'], ['piggy bank', 'Debt'], ['solar panel', 'Home improvement'],
    ['lightbulb', 'Utilities'], ['phone', 'Contract'],
  ],
};

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getJson(url, headers = {}, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(url, { headers });
    if (r.ok) return r.json();
    if (r.status === 429 || r.status >= 500) { await sleep(1500 * 2 ** i); continue; }
    throw new Error(`${url.split('?')[0]} -> ${r.status}`);
  }
  throw new Error(`${url.split('?')[0]} failed after retries`);
}
async function download(url, file) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url);
      if (r.status === 403 || r.status === 404) return false; // blocked or gone: retrying won't help
      if (!r.ok) throw new Error(r.status);
      await writeFile(file, Buffer.from(await r.arrayBuffer()));
      return true;
    } catch { await sleep(1000 * 2 ** i); }
  }
  return false;
}

// ── Source adapters: search(q) -> candidates, each with a lazy glbUrl() ─────────────
// candidate: { id, title, tags, tris, licence, creator, source, attribution, thumbUrl, glbUrl, host }
const OK_LICENCES = /CC0|CC-BY|Public Domain/i;
const SOURCE_DEFS = {
  polypizza: {
    host: 'static.poly.pizza',
    async search(q) {
      const res = await getJson(`https://api.poly.pizza/v1.1/search/${encodeURIComponent(q)}?Limit=24`, { 'x-auth-token': KEY });
      return (res.results || [])
        .filter(m => OK_LICENCES.test(m.Licence || '') && !m.Animated && m['Tri Count'] > 0 && m['Tri Count'] <= MAX_TRIS && m.Download)
        .map(m => ({
          id: m.ID, title: m.Title, tags: m.Tags || [], tris: m['Tri Count'], licence: m.Licence,
          creator: m.Creator?.Username || 'Unknown', source: `https://poly.pizza/m/${m.ID}`,
          attribution: m.Attribution, thumbUrl: m.Thumbnail, glbUrl: async () => m.Download,
        }));
    },
  },
  sketchfab: {
    host: 'sketchfab.com',
    // Data API v3. Two calls per query because the licence filter takes one value; downloadable=true only.
    async search(q) {
      const auth = { Authorization: `Token ${SF_TOKEN}` };
      const out = [];
      for (const [lic, label] of [['cc0', 'CC0'], ['by', 'CC-BY 4.0']]) {
        const url = `https://api.sketchfab.com/v3/search?type=models&q=${encodeURIComponent(q)}&downloadable=true&animated=false`
          + `&license=${lic}&max_face_count=${MAX_TRIS}&count=24&sort_by=-likeCount`;
        let res;
        try { res = await getJson(url, auth); } catch (e) { console.warn('  sketchfab', lic, e.message); continue; }
        for (const m of res.results || []) {
          if (!m.isDownloadable || !(m.faceCount > 0)) continue;
          const imgs = (m.thumbnails?.images || []).slice().sort((a, b) => a.width - b.width);
          const thumb = imgs.find(i => i.width >= 256) || imgs[imgs.length - 1];
          const creator = m.user?.displayName || m.user?.username || 'Unknown';
          out.push({
            id: `sf-${m.uid}`, title: m.name, tags: (m.tags || []).map(t => t.name || t), tris: m.faceCount, licence: label,
            creator, source: m.viewerUrl || `https://sketchfab.com/3d-models/${m.uid}`,
            attribution: `"${m.name}" by ${creator}, ${m.viewerUrl || 'https://sketchfab.com/3d-models/' + m.uid}`,
            thumbUrl: thumb?.url,
            // Download links are signed and expire in minutes, so ask for one only when we are about to fetch.
            glbUrl: async () => (await getJson(`https://api.sketchfab.com/v3/models/${m.uid}/download`, auth)).glb?.url,
          });
        }
      }
      return out;
    },
  },
};
const sources = SOURCES.filter(n => {
  if (!SOURCE_DEFS[n]) { console.warn('unknown source', n); return false; }
  if (n === 'sketchfab' && !SF_TOKEN) { console.warn('sketchfab skipped: set SKETCHFAB_TOKEN'); return false; }
  return true;
});

await mkdir(join(OUT, 'glb'), { recursive: true });
await mkdir(join(OUT, 'thumb'), { recursive: true });

const catalogPath = join(OUT, 'catalog.json');
const prev = existsSync(catalogPath) ? JSON.parse(await readFile(catalogPath, 'utf8')) : { models: [] };
const byId = new Map(prev.models.map(m => [m.id, m]));
const seen = new Set();
const failures = {}, downloaded = {};

// Download, compress, hash-name one candidate. Returns { glb, thumb } or null.
async function ingest(c, src) {
  const tmp = join(OUT, `.tmp-${slug(c.id)}.glb`);
  let url;
  try { url = await c.glbUrl(); } catch (e) { console.warn('  no download link', c.id, e.message); }
  if (!url || !await download(url, tmp)) {
    console.warn('  glb failed', c.id);
    failures[src.host] = (failures[src.host] || 0) + 1;
    if (failures[src.host] >= 3 && !downloaded[src.host]) {
      console.error(`\nCannot download from ${src.host} (blocked by network policy, bad token or offline). Aborting.`);
      process.exit(1);
    }
    await rm(tmp, { force: true });
    return null; // never list a model whose file is missing
  }
  if (COMPRESS) {
    try {
      execFileSync('npx', ['--yes', '@gltf-transform/cli', 'optimize', tmp, tmp, '--compress', 'draco', '--texture-compress', 'webp', '--texture-size', '1024'], { stdio: 'ignore' });
    } catch { console.warn('  compress failed, keeping original', c.id); }
  }
  const name = `${slug(c.title) || 'model'}-${sha(await readFile(tmp))}`;
  const glb = `glb/${name}.glb`;
  await rename(tmp, join(OUT, glb));
  let thumb;
  if (c.thumbUrl) {
    const ext = (new URL(c.thumbUrl).pathname.match(/\.(webp|jpe?g|png)$/i)?.[1] || 'webp').toLowerCase().replace('jpeg', 'jpg');
    thumb = `thumb/${name}.${ext}`;
    if (!await download(c.thumbUrl, join(OUT, thumb))) thumb = undefined;
  }
  downloaded[src.host] = (downloaded[src.host] || 0) + 1;
  return { glb, thumb };
}

for (const [group, queries] of Object.entries(PLAN)) {
  for (const [q, kind] of queries) {
    let added = 0;
    for (const sname of sources) {
      const src = SOURCE_DEFS[sname];
      let found;
      try { found = await src.search(q); } catch (e) { console.warn('skip', sname, q, e.message); continue; }
      const picks = found
        .filter(c => !seen.has(c.id))
        .sort((a, b) => (/CC0/i.test(b.licence) - /CC0/i.test(a.licence)) || a.tris - b.tris) // CC0 first, then lightest
        .slice(0, PER_QUERY);
      for (const c of picks) {
        seen.add(c.id);
        const prevEntry = byId.get(c.id);
        let glb = prevEntry?.file, thumb = prevEntry?.thumb;
        if (DRY) { glb = glb || `glb/${slug(c.title)}-dry.glb`; thumb = thumb || ''; }
        else if (!(glb && existsSync(join(OUT, glb)))) {
          const r = await ingest(c, src);
          if (!r) continue;
          ({ glb, thumb } = r);
        }
        byId.set(c.id, {
          id: c.id, title: c.title, groups: [...new Set([...(prevEntry?.groups || []), group])], kind, query: q,
          tags: c.tags, file: glb, thumb: thumb || '', tris: c.tris, licence: c.licence, creator: c.creator,
          provider: sname, source: c.source, attribution: c.attribution,
        });
        added++;
      }
      await sleep(250);
    }
    console.log(`${group.padEnd(12)} ${q.padEnd(20)} +${added}`);
  }
}

const models = [...byId.values()].sort((a, b) => a.title.localeCompare(b.title));
const catalog = { generated: new Date().toISOString(), sources: sources.length ? sources : ['polypizza'], count: models.length, models }; // paths relative to base
if (!DRY) await writeFile(catalogPath, JSON.stringify(catalog, null, 1));

// Human-readable attribution file (CC-BY requires credit)
const credits = ['# 3D model credits', '', 'Models from [Poly Pizza](https://poly.pizza) and [Sketchfab](https://sketchfab.com), licensed CC0 or CC-BY.', '',
  ...models.map(m => `- ${m.attribution || `"${m.title}" by ${m.creator}, ${m.source}`} (${m.licence})`)].join('\n');
if (!DRY) await writeFile(join(OUT, 'CREDITS.md'), credits + '\n');
console.log(`\n${models.length} models in catalogue${DRY ? ' (dry run, nothing written)' : ''}`);
