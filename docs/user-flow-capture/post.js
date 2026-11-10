// node post.js <urls.json> <group|png> : POSTs files to Figma upload URLs in parallel, records placed node ids.
const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const S = path.resolve(__dirname, '..'); const man = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8'));
const urls = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); const group = process.argv[3];
let files;
if (group === 'keys') {
  files = process.argv[4].split(',').map(key => { if (key.startsWith('ref-desk-')) { const k = key.replace('ref-desk-', ''); return { path: path.join(S, 'shots', 'desk-' + k + '.png'), name: 'Ref desktop · ' + (man.labels[k] || k) + '.png', type: 'image/png', key }; } if (key.startsWith('ref-')) { const k = key.replace('ref-', ''); return { path: path.join(S, 'shots', k + '.png'), name: 'Ref · ' + (man.labels[k] || k) + '.png', type: 'image/png', key }; } const [g, k] = key.split(':'); return { path: path.join(S, process.env.SVGDIR || 'svg', k + '.svg'), name: (man.labels[k] || k) + '.svg', type: 'image/svg+xml', key }; });
} else if (group === 'png') {
  const mob = Object.values(man.groups).flat().filter((v, i, a) => a.indexOf(v) === i);
  files = mob.map(k => ({ path: path.join(S, 'shots', k + '.png'), name: 'Ref · ' + (man.labels[k] || k) + '.png', type: 'image/png', key: 'ref-' + k }));
  for (const f of fs.readdirSync(path.join(S, 'shots')).filter(f => f.startsWith('desk-'))) { const k = f.replace('.png', ''); const lab = man.labels[k.replace('desk-', '')] || k; files.push({ path: path.join(S, 'shots', f), name: 'Ref desktop · ' + lab + '.png', type: 'image/png', key: 'ref-' + k }); }
} else {
  files = man.groups[group].map(k => ({ path: path.join(S, process.env.SVGDIR || 'svg', k + '.svg'), name: (man.labels[k] || k) + '.svg', type: 'image/svg+xml', key: group + ':' + k }));
}
if (files.length !== urls.length) { console.error(`count mismatch files=${files.length} urls=${urls.length}`); process.exit(1); }
const results = {}; let ok = 0;
const run = (i) => new Promise(res => { const f = files[i]; const u = urls[i];
  try { const out = execFileSync('curl', ['-sS', '-m', '180', '-X', 'POST', '-F', `file=@${f.path};type=${f.type};filename=${f.name}`, u], { encoding: 'utf8' }); const j = JSON.parse(out); results[f.key] = { name: f.name, node: j.placedOnNodeId, ok: !!j.success, bytes: j.sizeBytes }; if (j.success) ok++; else console.log('FAIL', f.name, out.slice(0, 200)); }
  catch (e) { results[f.key] = { name: f.name, error: String(e).slice(0, 200) }; console.log('ERR', f.name, String(e).slice(0, 160)); }
  res(); });
(async () => { const q = files.map((_, i) => i); const workers = Array.from({ length: 4 }, async () => { while (q.length) await run(q.shift()); }); await Promise.all(workers);
  const resFile = path.join(__dirname, 'placed.json'); const prev = fs.existsSync(resFile) ? JSON.parse(fs.readFileSync(resFile, 'utf8')) : {}; Object.assign(prev, results); fs.writeFileSync(resFile, JSON.stringify(prev, null, 1));
  console.log(`${group}: ${ok}/${files.length} uploaded`); })();
