// Copy check: no em dash (—) in user-facing text. Brand rule (brand/vault-it-brand-handover.md): British English,
// sentence case, no em dashes. Comments and the generated HB3D engine block are ignored. Run: node tests/test_copy.js
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
if (fails) { console.log('FAILURES ' + fails); process.exit(1); }
console.log('ALL PASSED');
