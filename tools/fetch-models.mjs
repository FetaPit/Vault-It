#!/usr/bin/env node
// Vault-It: downloads the 3D models listed in models/catalog.source.json into models/,
// content-hashes the file names, and writes models/catalog.json and models/CREDITS.md.
//
//   node tools/fetch-models.mjs [--dry] [--set cars,top100] [--only gold-bar,sofa] [--compress] [--retries 3] [--no-sketchfab]
//
// Sources: models/catalog.source.json (top 100) plus models/catalog.source.<set>.json (cars, instruments, collectibles).
// If models/sketchfab.candidates.json has an item with a candidate marked "approved": true, that Sketchfab model is
// downloaded instead of the Poly Pizza pick (needs SKETCHFAB_TOKEN; see tools/search-sketchfab.mjs). Sketchfab's download
// endpoint must offer a GLB; if it only offers a glTF zip the file is reported as failed with the model page to convert by hand.
//
// Plain Node 18+, no packages (behind a proxy on Node 22 set NODE_USE_ENV_PROXY=1). Run it from the repo root in Git Bash on a machine that can reach
// static.poly.pizza. Re-runs are safe: models already in models/catalog.json with a file on disk are skipped.
// Files are named <item-slug>-<sha1 of content>.glb, so they can be cached forever (immutable).
// Catalogue paths are relative to the hosting base (models/ locally, R2 in production).
// --compress runs gltf-transform (Draco + WebP textures) through npx; off by default.
// To refresh the source list from the API first: node tools/search-models.mjs
import { mkdir, writeFile, readFile, rename, rm, stat, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'models');
const argv = process.argv.slice(2);
const flag = n => argv.includes('--' + n);
const val = (n, d) => { const i = argv.indexOf('--' + n); return i > -1 ? argv[i + 1] : d; };
const DRY = flag('dry'), COMPRESS = flag('compress'), RETRIES = +val('retries', 3);
const ONLY = val('only', '') ? new Set(val('only').split(',')) : null;
const sha = buf => createHash('sha1').update(buf).digest('hex').slice(0, 10);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const HOSTS = new Set(['static.poly.pizza']); // Poly Pizza download host. Build-time only; the app loads from our own R2 domain.
const SF_TOKEN = process.env.SKETCHFAB_TOKEN;
const SETS = val('set', '') ? new Set(val('set').split(',')) : null;

const srcPath = join(OUT, 'catalog.source.json');
if (!existsSync(srcPath)) { console.error('models/catalog.source.json is missing. Run: node tools/search-models.mjs'); process.exit(2); }
const srcFiles = (await readdir(OUT)).filter(f => /^catalog\.source(\.[a-z0-9]+)?\.json$/.test(f)).sort();
let targets = [];
for (const f of srcFiles) {
  const src = JSON.parse(await readFile(join(OUT, f), 'utf8'));
  for (const m of src.models) targets.push({ ...m, set: m.set || src.set || 'top100', provider: 'polypizza' });
}
if (SETS) targets = targets.filter(m => SETS.has(m.set));
// Approved Sketchfab picks replace the Poly Pizza pick for the same item.
const sfPath = join(OUT, 'sketchfab.candidates.json');
if (!flag('no-sketchfab') && existsSync(sfPath)) {
  const sf = JSON.parse(await readFile(sfPath, 'utf8'));
  for (const it of sf.items || []) {
    const c = (it.candidates || []).find(x => x.approved);
    if (!c) continue;
    const i = targets.findIndex(t => t.set === it.set && t.rank === it.rank);
    const base = i > -1 ? targets[i] : { set: it.set, rank: it.rank, item: it.item, slug: `${it.set === 'top100' ? '' : it.set + '-'}${it.item.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`, kind: it.set, group: it.set, tags: [] };
    const t = { ...base, provider: 'sketchfab', id: 'sf-' + c.uid, uid: c.uid, title: c.name, licence: c.licence, creator: c.creator, tris: c.faces,
      source: c.viewer, attribution: c.attribution, thumbnail: c.thumbnail, download: '', standin: false, match: 'direct', needsDecimation: !!c.needsDecimation };
    delete t.standinFor;
    if (i > -1) targets[i] = t; else targets.push(t);
  }
}

// Returns { buf } or { error } and never throws.
async function get(url, opts = {}) {
  let u;
  try { u = new URL(url); } catch { return { error: 'bad URL' }; }
  if (u.protocol !== 'https:' || (!opts.anyHost && !HOSTS.has(u.hostname))) return { error: `host not allowed (${u.hostname})` };
  let last = 'unknown';
  for (let i = 0; i < RETRIES; i++) {
    try {
      const r = await fetch(url, opts.headers ? { headers: opts.headers } : undefined);
      if (r.status === 401 || r.status === 403 || r.status === 404) return { error: `HTTP ${r.status} (${r.status === 403 ? 'blocked by network policy or host not allowed' : 'file gone'})`, permanent: true };
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return { buf: Buffer.from(await r.arrayBuffer()) };
    } catch (e) { last = e.message || String(e); await sleep(1000 * 2 ** i); }
  }
  return { error: last };
}

// Sketchfab: ask the download endpoint for a signed GLB URL. Returns { url } or { error }.
async function sketchfabUrl(uid) {
  if (!SF_TOKEN) return { error: 'SKETCHFAB_TOKEN is not set' };
  const r = await get(`https://api.sketchfab.com/v3/models/${uid}/download`, { headers: { Authorization: `Token ${SF_TOKEN}` }, anyHost: true });
  if (r.error) return r;
  try {
    const j = JSON.parse(r.buf.toString('utf8'));
    if (j.glb?.url) return { url: j.glb.url };
    return { error: `no GLB offered (formats: ${Object.keys(j).join(', ')}); download the glTF zip from the model page and convert with gltf-transform` };
  } catch { return { error: 'unexpected response from Sketchfab download endpoint' }; }
}

await mkdir(join(OUT, 'glb'), { recursive: true });
await mkdir(join(OUT, 'thumb'), { recursive: true });

const catalogPath = join(OUT, 'catalog.json');
let prev = [];
try { if (existsSync(catalogPath)) prev = JSON.parse(await readFile(catalogPath, 'utf8')).models || []; } catch { console.warn('catalog.json unreadable, starting fresh'); }
const key = m => `${m.set || 'top100'}:${m.id}`; // one model can serve items in several sets
const byId = new Map(prev.map(m => [key(m), m]));
const fileById = new Map(); // model id -> files already fetched this run, shared between items
const failed = [];
let done = 0, skipped = 0, bytes = 0;

for (const m of targets) {
  if (ONLY && !ONLY.has(m.slug)) continue;
  const have = byId.get(key(m));
  const entryBase = {
    id: m.id, uid: `${m.set || 'top100'}:${m.item.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`, // unique per catalogue entry (one model can serve several items, so id repeats)
    set: m.set, item: m.item, title: m.title, rank: m.rank, group: m.group, kind: m.kind, tags: m.tags, tris: m.tris,
    standin: !!m.standin, ...(m.standinFor ? { standinFor: m.standinFor } : {}), provider: m.provider,
    licence: m.licence, creator: m.creator, source: m.source, attribution: m.attribution,
  };
  if (have && existsSync(join(OUT, have.file))) { byId.set(key(m), { ...have, ...entryBase }); skipped++; console.log(`have   ${m.slug}`); continue; }
  if (DRY) { console.log(`dry    ${m.slug}  ${m.provider}  ${m.licence}  ${m.tris} tris${m.standin ? '  stand-in' : ''}  ${m.download || m.source}`); continue; }

  const shared = fileById.get(m.id);
  if (shared && existsSync(join(OUT, shared.file))) { byId.set(key(m), { ...entryBase, ...shared }); done++; console.log(`share  ${m.slug}  (same model as ${shared.slug})`); continue; }
  let dl = m.download;
  if (m.provider === 'sketchfab') {
    const u = await sketchfabUrl(m.uid);
    if (u.error) { failed.push(m.slug); console.log(`FAIL   ${m.slug}  sketchfab: ${u.error}  (${m.source})`); continue; }
    dl = u.url;
  }
  const g = await get(dl, { anyHost: m.provider === 'sketchfab' });
  if (g.error) { failed.push(m.slug); console.log(`FAIL   ${m.slug}  glb: ${g.error}`); continue; } // never list a model whose file is missing
  const tmp = join(OUT, `.tmp-${m.id}.glb`);
  await writeFile(tmp, g.buf);
  if (COMPRESS) {
    try { execFileSync('npx', ['--yes', '@gltf-transform/cli', 'optimize', tmp, tmp, '--compress', 'draco', '--texture-compress', 'webp', '--texture-size', '1024'], { stdio: 'ignore', shell: process.platform === 'win32' }); }
    catch { console.log(`warn   ${m.slug}  compression failed, keeping the original`); }
  }
  const buf = await readFile(tmp);
  const name = `${m.slug}-${sha(buf)}`;
  const file = `glb/${name}.glb`;
  await rename(tmp, join(OUT, file));
  let thumb = '';
  if (m.thumbnail) {
    const t = await get(m.thumbnail, { anyHost: m.provider === 'sketchfab' });
    if (t.buf) { thumb = `thumb/${name}.webp`; await writeFile(join(OUT, thumb), t.buf); }
    else console.log(`warn   ${m.slug}  thumbnail: ${t.error}`);
  }
  bytes += buf.length; done++;
  const rec = { file, thumb, bytes: (await stat(join(OUT, file))).size };
  fileById.set(m.id, { file, thumb, bytes: rec.bytes, slug: m.slug });
  byId.set(key(m), { ...entryBase, ...rec });
  console.log(`ok     ${m.slug}  ${(buf.length / 1024).toFixed(0)} KB`);
  await sleep(300);
}

// Only entries whose file really exists go in the catalogue.
const live = new Set(targets.map(key));
const models = [...byId.values()].filter(m => (SETS || ONLY ? true : live.has(key(m))) && m.file && existsSync(join(OUT, m.file))).sort((a, b) => a.set.localeCompare(b.set) || a.rank - b.rank);
if (!DRY && models.length) {
  await writeFile(catalogPath, JSON.stringify({ generated: new Date().toISOString(), source: 'https://poly.pizza', count: models.length, models }, null, 1) + '\n');
  const credits = ['# 3D model credits', '', 'Models from [Poly Pizza](https://poly.pizza), licensed CC0 or CC-BY. CC-BY models must keep this credit.', '',
    ...models.map(m => `- ${m.attribution || `"${m.title}" by ${m.creator}, ${m.source}`} (${m.licence})`)].join('\n');
  await writeFile(join(OUT, 'CREDITS.md'), credits + '\n');
}
console.log(`\n${DRY ? 'dry run: ' : ''}${done} downloaded (${(bytes / 1048576).toFixed(1)} MB), ${skipped} already present, ${failed.length} failed, ${models.length} in catalogue`);
if (failed.length) {
  console.log(`\nFailed: ${failed.join(', ')}`);
  if (failed.length === targets.length - skipped) console.log('Every download failed. Is static.poly.pizza (or api.sketchfab.com) reachable from this machine or session (network allowlist)?');
  process.exit(1);
}
