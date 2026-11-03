#!/usr/bin/env node
// Vault-It: downloads the 3D models listed in models/catalog.source.json into models/,
// content-hashes the file names, and writes models/catalog.json and models/CREDITS.md.
//
//   node tools/fetch-models.mjs [--dry] [--only gold-bar,sofa] [--compress] [--retries 3]
//
// Plain Node 18+, no packages (behind a proxy on Node 22 set NODE_USE_ENV_PROXY=1). Run it from the repo root in Git Bash on a machine that can reach
// static.poly.pizza. Re-runs are safe: models already in models/catalog.json with a file on disk are skipped.
// Files are named <item-slug>-<sha1 of content>.glb, so they can be cached forever (immutable).
// Catalogue paths are relative to the hosting base (models/ locally, R2 in production).
// --compress runs gltf-transform (Draco + WebP textures) through npx; off by default.
// To refresh the source list from the API first: node tools/search-models.mjs
import { mkdir, writeFile, readFile, rename, rm, stat } from 'node:fs/promises';
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
const HOSTS = new Set(['static.poly.pizza']); // the only download host; must be named in the privacy notice before the app uses it

const srcPath = join(OUT, 'catalog.source.json');
if (!existsSync(srcPath)) { console.error('models/catalog.source.json is missing. Run: node tools/search-models.mjs'); process.exit(2); }
const source = JSON.parse(await readFile(srcPath, 'utf8'));

// Returns { buf } or { error } and never throws.
async function get(url) {
  let u;
  try { u = new URL(url); } catch { return { error: 'bad URL' }; }
  if (u.protocol !== 'https:' || !HOSTS.has(u.hostname)) return { error: `host not allowed (${u.hostname})` };
  let last = 'unknown';
  for (let i = 0; i < RETRIES; i++) {
    try {
      const r = await fetch(url);
      if (r.status === 403 || r.status === 404) return { error: `HTTP ${r.status} (${r.status === 403 ? 'blocked by network policy or host not allowed' : 'file gone'})`, permanent: true };
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return { buf: Buffer.from(await r.arrayBuffer()) };
    } catch (e) { last = e.message || String(e); await sleep(1000 * 2 ** i); }
  }
  return { error: last };
}

await mkdir(join(OUT, 'glb'), { recursive: true });
await mkdir(join(OUT, 'thumb'), { recursive: true });

const catalogPath = join(OUT, 'catalog.json');
let prev = [];
try { if (existsSync(catalogPath)) prev = JSON.parse(await readFile(catalogPath, 'utf8')).models || []; } catch { console.warn('catalog.json unreadable, starting fresh'); }
const byId = new Map(prev.map(m => [m.id, m]));
const failed = [];
let done = 0, skipped = 0, bytes = 0;

for (const m of source.models) {
  if (ONLY && !ONLY.has(m.slug)) continue;
  const have = byId.get(m.id);
  const entryBase = {
    id: m.id, item: m.item, title: m.title, rank: m.rank, group: m.group, kind: m.kind, tags: m.tags, tris: m.tris,
    licence: m.licence, creator: m.creator, source: m.source, attribution: m.attribution,
  };
  if (have && existsSync(join(OUT, have.file))) { byId.set(m.id, { ...have, ...entryBase }); skipped++; console.log(`have   ${m.slug}`); continue; }
  if (DRY) { console.log(`dry    ${m.slug}  ${m.licence}  ${m.tris} tris  ${m.download}`); continue; }

  const g = await get(m.download);
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
    const t = await get(m.thumbnail);
    if (t.buf) { thumb = `thumb/${name}.webp`; await writeFile(join(OUT, thumb), t.buf); }
    else console.log(`warn   ${m.slug}  thumbnail: ${t.error}`);
  }
  bytes += buf.length; done++;
  byId.set(m.id, { ...entryBase, file, thumb, bytes: (await stat(join(OUT, file))).size });
  console.log(`ok     ${m.slug}  ${(buf.length / 1024).toFixed(0)} KB`);
  await sleep(300);
}

// Only entries whose file really exists go in the catalogue.
const models = [...byId.values()].filter(m => m.file && existsSync(join(OUT, m.file))).sort((a, b) => a.rank - b.rank);
if (!DRY && models.length) {
  await writeFile(catalogPath, JSON.stringify({ generated: new Date().toISOString(), source: 'https://poly.pizza', count: models.length, models }, null, 1) + '\n');
  const credits = ['# 3D model credits', '', 'Models from [Poly Pizza](https://poly.pizza), licensed CC0 or CC-BY. CC-BY models must keep this credit.', '',
    ...models.map(m => `- ${m.attribution || `"${m.title}" by ${m.creator}, ${m.source}`} (${m.licence})`)].join('\n');
  await writeFile(join(OUT, 'CREDITS.md'), credits + '\n');
}
console.log(`\n${DRY ? 'dry run: ' : ''}${done} downloaded (${(bytes / 1048576).toFixed(1)} MB), ${skipped} already present, ${failed.length} failed, ${models.length} in catalogue`);
if (failed.length) {
  console.log(`\nFailed: ${failed.join(', ')}`);
  if (failed.length === source.models.length - skipped) console.log('Every download failed. Is static.poly.pizza reachable from this machine or session (network allowlist)?');
  process.exit(1);
}
