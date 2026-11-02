#!/usr/bin/env node
// Vault·It — build-time 3D model catalogue fetcher.
// Pulls low-poly, openly licensed GLBs from the Poly Pizza API (CC0 + CC-BY only),
// stores them in /models and writes models/catalog.json for the app to read.
// The API key never ships to the browser: run this locally, commit the output.
//
//   POLY_PIZZA_KEY=xxxx node tools/fetch-models.mjs [--per-query 3] [--max-tris 20000] [--dry]
//
// Node 18+. Get a free key at https://poly.pizza/settings/api
import { mkdir, writeFile, readFile } from 'node:fs/promises';
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

const OK_LICENCES = /CC0|CC-BY|Public Domain/i;
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function api(path, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const r = await fetch('https://api.poly.pizza/v1.1' + path, { headers: { 'x-auth-token': KEY } });
    if (r.ok) return r.json();
    if (r.status === 429 || r.status >= 500) { await sleep(1500 * 2 ** i); continue; }
    throw new Error(`${path} -> ${r.status}`);
  }
  throw new Error(`${path} failed after retries`);
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

await mkdir(join(OUT, 'glb'), { recursive: true });
await mkdir(join(OUT, 'thumb'), { recursive: true });

const catalogPath = join(OUT, 'catalog.json');
const prev = existsSync(catalogPath) ? JSON.parse(await readFile(catalogPath, 'utf8')) : { models: [] };
const byId = new Map(prev.models.map(m => [m.id, m]));
const seen = new Set();
let failures = 0, downloaded = 0;

for (const [group, queries] of Object.entries(PLAN)) {
  for (const [q, kind] of queries) {
    let res;
    try { res = await api(`/search/${encodeURIComponent(q)}?Limit=24`); }
    catch (e) { console.warn('skip', q, e.message); continue; }
    const picks = (res.results || [])
      .filter(m => OK_LICENCES.test(m.Licence || '') && !m.Animated && m['Tri Count'] > 0 && m['Tri Count'] <= MAX_TRIS && m.Download)
      .filter(m => !seen.has(m.ID))
      .sort((a, b) => (/CC0/i.test(b.Licence) - /CC0/i.test(a.Licence)) || a['Tri Count'] - b['Tri Count']) // CC0 first, then lightest
      .slice(0, PER_QUERY);
    for (const m of picks) {
      seen.add(m.ID);
      const base = `${slug(m.Title) || 'model'}-${m.ID}`;
      const glb = `glb/${base}.glb`, thumb = `thumb/${base}.webp`;
      if (!DRY) {
        if (!existsSync(join(OUT, glb))) {
          if (!await download(m.Download, join(OUT, glb))) {
            console.warn('glb failed', m.ID);
            if (++failures >= 3 && !downloaded) {
              console.error('\nCannot reach static.poly.pizza (blocked by network policy or offline). Aborting.');
              process.exit(1);
            }
            continue; // never list a model whose file is missing
          }
          downloaded++;
        }
        if (m.Thumbnail && !existsSync(join(OUT, thumb))) await download(m.Thumbnail, join(OUT, thumb));
      }
      const prevEntry = byId.get(m.ID);
      const groups = new Set([...(prevEntry?.groups || []), group]);
      byId.set(m.ID, {
        id: m.ID, title: m.Title, groups: [...groups], kind, query: q, tags: m.Tags || [],
        file: 'models/' + glb, thumb: 'models/' + thumb, tris: m['Tri Count'],
        licence: m.Licence, creator: m.Creator?.Username || 'Unknown',
        source: `https://poly.pizza/m/${m.ID}`, attribution: m.Attribution,
      });
    }
    console.log(`${group.padEnd(12)} ${q.padEnd(20)} +${picks.length}`);
    await sleep(250);
  }
}

const models = [...byId.values()].sort((a, b) => a.title.localeCompare(b.title));
const catalog = { generated: new Date().toISOString(), source: 'https://poly.pizza', count: models.length, models };
if (!DRY) await writeFile(catalogPath, JSON.stringify(catalog, null, 1));

// Human-readable attribution file (CC-BY requires credit)
const credits = ['# 3D model credits', '', 'Models sourced from [Poly Pizza](https://poly.pizza), licensed CC0 or CC-BY.', '',
  ...models.map(m => `- ${m.attribution || `"${m.title}" by ${m.creator}, ${m.source}`} (${m.licence})`)].join('\n');
if (!DRY) await writeFile(join(OUT, 'CREDITS.md'), credits + '\n');
console.log(`\n${models.length} models in catalogue${DRY ? ' (dry run, nothing written)' : ''}`);
