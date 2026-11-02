// v0.8 F2: put a floor under every small font-size in index.html (idempotent).
// font-size:.5rem  ->  font-size:max(.5rem,var(--vi-fs-min,0px))   (also the font: shorthand)
// Only values under .7rem or 10.5px are touched; the generated HB3D block is skipped.
// --vi-fs-min is 10.5px under 1100 px and 0px from 1100 (desktop unchanged).
// Usage: node tools/type_floor.js [--dry]
const fs = require('fs');
const file = __dirname + '/../index.html';
const src = fs.readFileSync(file, 'utf8');
const a = src.indexOf('// <<HB3D_ENGINE'), b = src.indexOf('// HB3D_ENGINE>>');
const small = (n, u) => (u === 'rem' ? n < 0.7 : n < 10.5);
const wrap = v => `max(${v},var(--vi-fs-min,0px))`;
let count = 0;
// Rules left at their own size on purpose (agreed with the creative director): sizes a stream has just tuned to fit at 390.
const KEEP = ['.nw-more-btns button{'];   // Net worth tile pills: 10 px labels, one row at 390 (C2, Pedro review 2)
function fix(s) {
  return s.split('\n').map(l => KEEP.some(k => l.includes(k)) ? l : fixLine(l)).join('\n');
}
function fixLine(s) {
  // font-size:<v>   (not already inside max()/clamp())
  s = s.replace(/(font-size\s*:\s*)(\d*\.?\d+)(rem|px)(?![\w(])/g, (m, p, n, u) => small(+n, u) ? (count++, p + wrap(n + u)) : m);
  // font:<weight/style tokens> <size>[/lh] <family>
  s = s.replace(/(\bfont\s*:\s*(?:[a-z0-9-]+\s+){0,3})(\d*\.?\d+)(rem|px)(?=\s*[\/\s])/g, (m, p, n, u) => small(+n, u) ? (count++, p + wrap(n + u)) : m);
  // font-size:clamp(<min>,...,...) with a small min: wrap the whole clamp
  s = s.replace(/(font-size\s*:\s*)(clamp\(\s*(\d*\.?\d+)(rem|px)\s*,[^;{}()]*(?:\([^()]*\)[^;{}()]*)*\))/g, (m, p, c, n, u) => small(+n, u) ? (count++, p + wrap(c)) : m);
  return s;
}
const out = fix(src.slice(0, a)) + src.slice(a, b) + fix(src.slice(b));
console.log('font sizes floored:', count);
if (!process.argv.includes('--dry')) fs.writeFileSync(file, out);
