// Copy check 1: no em dash (—) in user-facing text. Brand rule (brand/vault-it-brand-handover.md): British English,
// sentence case, no em dashes. Comments and the generated HB3D engine block are ignored. Run: node tests/test_copy.js
// Copy check 2 (card wall, owner 12 Nov 2026: "Card required"; docs/briefs/CARD_WALL.md: "No page or e-mail says 'no card'"):
// the app and the sign-up pages make no "free, no card" promise, and the pages that offer the beta say when the card is first charged.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const FILES = ['index.html', 'landing.html'].concat(
  fs.existsSync(path.join(ROOT, 'site/sign-up')) ? fs.readdirSync(path.join(ROOT, 'site/sign-up')).filter(f => /\.html$/.test(f)).map(f => 'site/sign-up/' + f) : []);
const DASH = '—';
let fails = 0;

// Quote parity of a snippet: true when every kind of quote is balanced (so an opener found after it is code, not a string)
const balanced = s => !((s.split("'").length - 1) % 2 || (s.split('"').length - 1) % 2 || (s.split('`').length - 1) % 2);

// Comment openers on a line that are not inside a string: [index, closer]. "image/*" (a slash before) is not an opener.
function openers(s) {
  const out = []; const re = /\/\*|<!--/g; let m;
  while ((m = re.exec(s))) {
    const pre = s.slice(0, m.index);
    if (!balanced(pre)) continue;
    if (m[0] === '/*' && pre.endsWith('/')) continue;
    out.push([m.index, m[0] === '/*' ? '*/' : '-->']);
  }
  return out;
}

// Returns the line numbers whose em dash is in copy, not in a comment or the generated engine block.
function findDashes(src) {
  const hits = []; let inEngine = false, inBlock = null;   // inBlock = closer of the open multi-line comment
  src.split('\n').forEach((line, i) => {
    if (line.includes('<<HB3D_ENGINE')) inEngine = true;
    if (line.includes('HB3D_ENGINE>>')) inEngine = false;
    const startBlock = inBlock;
    // advance the multi-line comment state across this line
    let s = line;
    if (inBlock) { const k = s.indexOf(inBlock); if (k < 0) s = ''; else { s = s.slice(k + inBlock.length); inBlock = null; } }
    while (s) {
      const o = openers(s)[0]; if (!o) break;
      const rest = s.slice(o[0] + 2), k = rest.indexOf(o[1]);
      if (k < 0) { inBlock = o[1]; s = ''; } else s = rest.slice(k + o[1].length);
    }
    if (!line.includes(DASH) || inEngine) return;
    const t = line.trim(), d = line.indexOf(DASH);
    if (startBlock && (line.indexOf(startBlock) < 0 || d < line.indexOf(startBlock))) return;   // inside /* */ or <!-- -->
    if (/^(\/\/|\/\*|\*|<!--)/.test(t)) return;                                                  // whole line is a comment
    const pre = line.slice(0, d), m = pre.match(/\/\/|\/\*|<!--/);
    if (m && balanced(pre.slice(0, m.index)) && !/['"`]/.test(pre.slice(m.index + m[0].length))) return;   // dash after a trailing comment opener
    hits.push(i + 1);
  });
  return hits;
}

for (const rel of FILES) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) { console.log('skip: ' + rel + ' (missing)'); continue; }
  const src = fs.readFileSync(file, 'utf8'), lines = src.split('\n');
  const hits = findDashes(src);
  hits.forEach(n => console.log('FAIL: ' + rel + ':' + n + ' em dash in copy: ' + lines[n - 1].trim().slice(0, 140)));
  if (hits.length) fails += hits.length; else console.log('ok  : ' + rel + ' has no em dash in user-facing copy');
}
// ── no "free, no card" promise (comments are dropped first: they tell the history of the trial) ──
const NO_CARD = /\bno card\b|sign up free|install free|needs no card|never enter a card|free during the beta|free for the whole beta|the free beta|free private beta|join the free|it.s free\b/i;
const strip = s => s.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1');
for (const rel of FILES) {
  const file = path.join(ROOT, rel); if (!fs.existsSync(file)) continue;
  const bad = strip(fs.readFileSync(file, 'utf8')).split('\n').filter(l => NO_CARD.test(l)).map(l => (l.match(new RegExp('.{0,50}(' + NO_CARD.source + ').{0,50}', 'i')) || [l.slice(0, 120)])[0].trim());
  bad.forEach(t => console.log('FAIL: ' + rel + ' still promises it is free with no card: ' + t));
  if (bad.length) fails += bad.length; else console.log('ok  : ' + rel + ' makes no "free, no card" promise');
}
for (const rel of ['landing.html', 'site/sign-up/confirm.html']) {
  const file = path.join(ROOT, rel); if (!fs.existsSync(file)) continue;
  const t = strip(fs.readFileSync(file, 'utf8'));
  if (/30 days/i.test(t) && /first charged on day 31/.test(t)) console.log('ok  : ' + rel + ' says the first 30 days are free and the card is first charged on day 31');
  else { fails++; console.log('FAIL: ' + rel + ' does not say when the card is first charged (30 days free, first charged on day 31)'); }
}
if (fails) { console.log('FAILURES ' + fails); process.exit(1); }
console.log('ALL PASSED');
