#!/usr/bin/env node
// Vault-It: builds models/catalog.source.json from the Poly Pizza search API (no downloads).
//   node tools/search-models.mjs [--max-tris 20000] [--limit 24]
// Reads models/items.tsv (ranked list: name|kind|group|term;term;term). About 1 request a second.
// Behind a proxy (cloud sessions) run with NODE_USE_ENV_PROXY=1 so Node 22 fetch honours HTTPS_PROXY; the proxy injects the key.
// Otherwise on a laptop set POLY_PIZZA_KEY
// (free key: https://poly.pizza/settings/api). Picks CC0 first, then CC-BY, under the triangle cap.
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KEY = process.env.POLY_PIZZA_KEY; // unset in proxied sessions, which inject the key
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > -1 ? process.argv[i + 1] : d; };
const MAX_TRIS = +arg('max-tris', 20000), LIMIT = +arg('limit', 24);
// --ranks 1,15,24 re-searches only those items and merges into the existing file; models/exclude.json lists rejected IDs
const RANKS = arg('ranks') ? new Set(arg('ranks').split(',').map(Number)) : null;
const exclude = new Set(existsSync(join(ROOT, 'models/exclude.json')) ? JSON.parse(await readFile(join(ROOT, 'models/exclude.json'), 'utf8')).ids.map(x => x.id) : []);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function api(path) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch('https://api.poly.pizza/v1.1' + path, { headers: KEY ? { 'x-auth-token': KEY } : {} });
    if (r.ok) return r.json();
    if (r.status === 429 || r.status >= 500) { await sleep(1500 * 2 ** i); continue; }
    throw new Error(`${path} -> ${r.status}`);
  }
  throw new Error(`${path} failed after retries`);
}

const items = (await readFile(join(ROOT, 'models/items.tsv'), 'utf8')).split('\n').filter(Boolean)
  .map((l, i) => { const [name, kind, group, terms] = l.split('|'); return { rank: i + 1, name, kind, group, terms: terms.split(';') }; });

const srcFile = join(ROOT, 'models/catalog.source.json');
const old = RANKS && existsSync(srcFile) ? JSON.parse(await readFile(srcFile, 'utf8')) : null;
const used = new Set(exclude), models = old ? old.models.filter(m => !RANKS.has(m.rank)) : [], misses = [];
for (const m of models) used.add(m.id);
for (const it of items) {
  if (RANKS && !RANKS.has(it.rank)) { const o = old?.misses.find(x => x.rank === it.rank); if (o) misses.push(it); continue; }
  const cands = new Map();
  for (const [ti, term] of it.terms.entries()) {
    let res;
    try { res = await api(`/search/${encodeURIComponent(term)}?Limit=${LIMIT}`); } catch (e) { console.warn('skip', term, e.message); }
    await sleep(1000);
    const words = term.toLowerCase().split(/\s+/);
    for (const m of res?.results || []) {
      if (!/CC0|CC-BY|Public Domain/i.test(m.Licence || '') || m.Animated || !(m['Tri Count'] > 0) || m['Tri Count'] > MAX_TRIS || !m.Download) continue;
      if (used.has(m.ID)) continue;
      const title = (m.Title || '').toLowerCase(), tags = (m.Tags || []).join(' ').toLowerCase();
      let s = 0;
      if (words.every(w => title.includes(w))) s += 30; else if (words.some(w => title.includes(w))) s += 8;
      if (words.every(w => tags.includes(w))) s += 6;
      s += /CC0|Public Domain/i.test(m.Licence) ? 12 : 0;
      s -= ti * 3;                                   // earlier terms are the better phrasing
      s += m['Tri Count'] < 300 ? -6 : 0;            // too crude to read as the item
      s -= Math.max(0, m['Tri Count'] - 8000) / 1000; // gentle pull towards light files
      if (!cands.has(m.ID) || cands.get(m.ID).s < s) cands.set(m.ID, { s, m, term });
    }
  }
  const best = [...cands.values()].sort((a, b) => b.s - a.s)[0];
  // a pick must at least have a title that names one search word, or it is a miss (keeps junk out)
  const okTitle = best && it.terms.some(t => t.toLowerCase().split(/\s+/).some(w => best.m.Title.toLowerCase().includes(w)));
  if (!best || !okTitle) { misses.push(it); console.log(String(it.rank).padStart(3), 'MISS', it.name); continue; }
  const m = best.m; used.add(m.ID);
  models.push({
    rank: it.rank, item: it.name, slug: slug(it.name), kind: it.kind, group: it.group, query: best.term,
    id: m.ID, title: m.Title, licence: m.Licence, attribution: m.Attribution, creator: m.Creator?.Username || 'Unknown',
    tris: m['Tri Count'], tags: m.Tags || [], download: m.Download, thumbnail: m.Thumbnail || '',
    source: `https://poly.pizza/m/${m.ID}`,
  });
  console.log(String(it.rank).padStart(3), m.Licence.padEnd(9), String(m['Tri Count']).padStart(6), it.name, '->', m.Title);
}
models.sort((a, b) => a.rank - b.rank);
await writeFile(srcFile, JSON.stringify({
  generated: new Date().toISOString(), source: 'https://poly.pizza', maxTris: MAX_TRIS,
  found: models.length, misses: misses.map(x => ({ rank: x.rank, item: x.name, terms: x.terms })), models,
}, null, 1) + '\n');
console.log(`\n${models.length} found, ${misses.length} misses`);
