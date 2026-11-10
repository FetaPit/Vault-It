// node gen-links.js [key ...]  -> prints JS for use_figma: FigJam MAP (node-id -> figjam ids) and read-me LABELS (label -> node-id)
const fs = require('fs');
const placed = JSON.parse(fs.readFileSync('placed.json')), fm = JSON.parse(fs.readFileSync('figjam-map.json')), man = JSON.parse(fs.readFileSync('manifest.json'));
const keys = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(placed);
const MAP = {}, LABELS = {};
for (const k of keys) {
  const p = placed[k]; if (!p || !p.ok) { console.error('skip ' + k); continue; }
  const nid = p.node.replace(':', '-');
  if (fm[k]) MAP[nid] = fm[k];
  const [grp, key] = k.split(':'); let label = man.labels[key]; if (grp === '04' && key === 'tab-assets-metals') label = 'Assets · Precious metals';
  LABELS[label] = nid;
}
console.log('const MAP = ' + JSON.stringify(MAP) + ';');
console.log('const LABELS = ' + JSON.stringify(LABELS) + ';');
