#!/usr/bin/env node
// Vault-It: finds Sketchfab candidates for the items that Poly Pizza missed or only stood in for.
//   SKETCHFAB_TOKEN=xxxx node tools/search-sketchfab.mjs [--set cars,instruments] [--per-item 5] [--max-faces 20000] [--all]
//
// Run on the owner's laptop (api.sketchfab.com is blocked in the cloud sandbox). Plain Node 18+, no packages.
// Free token: sign in at sketchfab.com, Settings > Password & API, copy the API token. Never commit it.
//
// Reads every models/catalog.source*.json and takes the misses and the stand-ins (or every item with --all),
// searches https://api.sketchfab.com/v3/search?type=models&downloadable=true&q=..., keeps only licences
// cc0 and by (rejects by-sa, by-nd, by-nc, standard/store and editorial), and writes models/sketchfab.candidates.json.
// Nothing is downloaded here. Review the file, set "approved": true on ONE candidate per item, then run
// node tools/fetch-models.mjs, which downloads the approved ones (and uses them instead of the Poly Pizza stand-in).
// Models over the face cap are kept but flagged "needsDecimation": true (up to 5x the cap); decimate them before use.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOKEN = process.env.SKETCHFAB_TOKEN;
if (!TOKEN) { console.error('Set SKETCHFAB_TOKEN first (Git Bash: export SKETCHFAB_TOKEN=xxxx). Free token: sketchfab.com > Settings > Password & API.'); process.exit(2); }
const argv = process.argv.slice(2);
const val = (n, d) => { const i = argv.indexOf('--' + n); return i > -1 ? argv[i + 1] : d; };
const PER = +val('per-item', 5), MAX_FACES = +val('max-faces', 20000), ALL = argv.includes('--all');
const SETS = val('set', '') ? new Set(val('set').split(',')) : null;
const OK = new Set(['cc0', 'by']);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const H = { Authorization: `Token ${TOKEN}` };

async function api(path) {
  for (let i = 0; i < 4; i++) {
    let r;
    try { r = await fetch('https://api.sketchfab.com/v3' + path, { headers: H }); }
    catch (e) { throw new Error(`network: ${e.message}. Is api.sketchfab.com reachable from here?`); }
    if (r.ok) return r.json();
    if (r.status === 401 || r.status === 403) throw new Error(`HTTP ${r.status}: token rejected or host blocked`);
    if (r.status === 429 || r.status >= 500) { await sleep(2000 * 2 ** i); continue; }
    throw new Error(`${path} -> HTTP ${r.status}`);
  }
  throw new Error(`${path} failed after retries`);
}

// Collect targets from every source file.
const files = (await readdir(join(ROOT, 'models'))).filter(f => /^catalog\.source(\.[a-z0-9]+)?\.json$/.test(f));
const itemsBySet = {};
const targets = [];
for (const f of files) {
  const src = JSON.parse(await readFile(join(ROOT, 'models', f), 'utf8'));
  const set = src.set || 'top100';
  if (SETS && !SETS.has(set)) continue;
  if (!itemsBySet[set]) {
    const tf = join(ROOT, 'models', set === 'top100' ? 'items.tsv' : `items.${set}.tsv`);
    itemsBySet[set] = existsSync(tf) ? (await readFile(tf, 'utf8')).split('\n').filter(Boolean).map(l => l.split('|')) : [];
  }
  const terms = rank => (itemsBySet[set][rank - 1]?.[3] || '').split(/[;~]/).filter(Boolean);
  for (const m of src.models) if (ALL || m.standin || m.match === 'stand-in') targets.push({ set, rank: m.rank, item: m.item, reason: 'stand-in', terms: terms(m.rank) });
  for (const x of src.misses || []) targets.push({ set, rank: x.rank, item: x.item, reason: 'miss', terms: x.terms?.length ? x.terms : terms(x.rank) });
}
console.log(`${targets.length} items to search (${files.join(', ')})`);

const outPath = join(ROOT, 'models/sketchfab.candidates.json');
let prev = { items: [] };
try { if (existsSync(outPath)) prev = JSON.parse(await readFile(outPath, 'utf8')); } catch { /* start fresh */ }
const kept = new Map(prev.items.map(i => [`${i.set}:${i.rank}`, i])); // keeps earlier approvals

for (const t of targets) {
  const key = `${t.set}:${t.rank}`;
  const old = kept.get(key);
  if (old?.candidates?.some(c => c.approved)) { console.log(`keep   ${t.item} (already approved)`); continue; }
  const qs = [...new Set([t.item.replace(/\s*\(.*\)/, ''), ...t.terms.slice(0, 2)])].slice(0, 3);
  const found = new Map();
  for (const q of qs) {
    let res;
    try { res = await api(`/search?type=models&downloadable=true&count=24&sort_by=-likeCount&q=${encodeURIComponent(q)}`); }
    catch (e) { console.error(`FAIL   ${t.item} "${q}": ${e.message}`); if (/token rejected|network/.test(e.message)) process.exit(1); continue; }
    await sleep(1100);
    for (const m of res.results || []) {
      const lic = m.license?.slug || m.license?.uid || '';
      if (!OK.has(lic) || !m.isDownloadable && m.isDownloadable !== undefined) continue;
      const faces = m.faceCount ?? 0;
      if (!faces || faces > MAX_FACES * 5) continue;
      if (found.has(m.uid)) continue;
      const name = m.name || '', words = q.toLowerCase().split(/\s+/);
      const score = (words.every(w => name.toLowerCase().includes(w)) ? 30 : words.some(w => name.toLowerCase().includes(w)) ? 8 : 0)
        + (lic === 'cc0' ? 12 : 0) + (faces <= MAX_FACES ? 10 : 0) + Math.min(10, Math.log10(1 + (m.likeCount || 0)) * 3);
      const user = m.user?.displayName || m.user?.username || 'Unknown';
      found.set(m.uid, {
        uid: m.uid, name, licence: lic === 'cc0' ? 'CC0 1.0' : `CC-BY ${m.license?.label?.match(/\d\.\d/)?.[0] || '4.0'}`,
        licenceUrl: m.license?.url || '', creator: user, creatorUrl: m.user?.profileUrl || '', faces, needsDecimation: faces > MAX_FACES,
        viewer: m.viewerUrl || `https://sketchfab.com/3d-models/${m.uid}`,
        thumbnail: (m.thumbnails?.images || []).sort((a, b) => b.width - a.width).find(i => i.width <= 512)?.url || '',
        attribution: `"${name}" by ${user}${m.user?.profileUrl ? ` (${m.user.profileUrl})` : ''}, ${m.viewerUrl || 'https://sketchfab.com/3d-models/' + m.uid}. Licence: ${lic === 'cc0' ? 'CC0 1.0' : (m.license?.label || 'CC-BY')}${m.license?.url ? ` (${m.license.url})` : ''}`,
        score: Math.round(score * 10) / 10, approved: false,
      });
    }
  }
  const candidates = [...found.values()].sort((a, b) => b.score - a.score).slice(0, PER);
  kept.set(key, { set: t.set, rank: t.rank, item: t.item, reason: t.reason, candidates });
  console.log(`${String(candidates.length).padStart(2)} cand ${t.set}/${t.rank} ${t.item}`);
}
const items = [...kept.values()].sort((a, b) => a.set.localeCompare(b.set) || a.rank - b.rank);
await writeFile(outPath, JSON.stringify({ generated: new Date().toISOString(), note: 'Set "approved": true on ONE candidate per item, then run node tools/fetch-models.mjs. Check licence and look on the viewer page first.', items }, null, 1) + '\n');
console.log(`\n${items.filter(i => i.candidates.length).length} of ${items.length} items have candidates -> models/sketchfab.candidates.json`);
