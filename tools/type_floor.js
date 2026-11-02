// v0.8 F2 type scale (Pedro's spec section H): put a floor under every small font-size in index.html. Idempotent.
//   font-size:.5rem  ->  font-size:max(.5rem,var(--vi-fs-1))      (also the font: shorthand and clamp() with a small minimum)
// The floor is chosen by the declaration's own source value:
//   under .56rem (or under 10.5px)  -> --vi-fs-1  10.5px   captions, sub-lines, legal, hints
//   .56 to .69rem                   -> --vi-fs-2  11.5px   body in tiles, list rows, buttons
//   .70 to .80rem                   -> --vi-fs-3  12.5px   lead lines, inputs
//   .81rem and up, 10.5px and up    -> unchanged           headings, figures
//   uppercase Syne with letter-spacing .08em or more (in the same rule or style attribute) -> --vi-fs-0 10px
// Skipped: the generated HB3D block, values already inside max()/min(), and the KEEP rules below.
// Usage: node tools/type_floor.js [--dry]
const fs = require('fs');
const file = __dirname + '/../index.html';
const src = fs.readFileSync(file, 'utf8');
const a = src.indexOf('// <<HB3D_ENGINE'), b = src.indexOf('// HB3D_ENGINE>>');
// Left at their own size on purpose (agreed with the creative director):
const KEEP = [
  '.nw-more-btns button{',   // C2 Net worth pills: 10 px caps, measured to fit one row at 390
  '.hud-bar',                // the house builder 3D viewport's own HUD (hard rule: not touched)
];
const tierOf = (n, u) => u === 'rem' ? (n < 0.56 ? 1 : n < 0.70 ? 2 : n < 0.81 ? 3 : 0) : (n < 10.5 ? 1 : 0);
const counts = { 0: 0, 1: 0, 2: 0, 3: 0 };

// the rule or style attribute around position i: from the nearest opening ({, style=", style=', style=\') to the nearest closing (}, ", ')
function context(s, i) {
  const open = Math.max(s.lastIndexOf('{', i), s.lastIndexOf('style="', i), s.lastIndexOf("style='", i), s.lastIndexOf("style=\\'", i));
  let end = s.length; for (const c of ['}', '"', "'"]) { const j = s.indexOf(c, i); if (j >= 0 && j < end) end = j; }
  return s.slice(open < 0 ? Math.max(0, i - 400) : open, end);
}
function capsSyne(ctx) {
  if (!/text-transform\s*:\s*uppercase/.test(ctx) || !/Syne|--font-display/.test(ctx)) return false;
  const m = ctx.match(/letter-spacing\s*:\s*(\d*\.?\d+)em/); return !!m && +m[1] >= 0.08;
}
function lineOf(s, i) { return s.slice(s.lastIndexOf('\n', i) + 1, (s.indexOf('\n', i) + 1 || s.length + 1) - 1); }
function floorFor(s, i, n, u) {
  let t = tierOf(n, u); if (!t) return null;
  if (KEEP.some(k => lineOf(s, i).includes(k))) return null;
  if (capsSyne(context(s, i))) t = 0;
  counts[t]++; return `var(--vi-fs-${t})`;
}
function fix(s) {
  // clamp(<min>,...) with a small minimum: wrap the whole clamp
  s = s.replace(/(font-size\s*:\s*)(clamp\(\s*(\d*\.?\d+)(rem|px)\s*,[^;{}()]*(?:\([^()]*\)[^;{}()]*)*\))/g, (m, p, c, n, u, i, str) => { const f = floorFor(str, i, +n, u); return f ? `${p}max(${c},${f})` : m; });
  // font-size:<value>
  s = s.replace(/(font-size\s*:\s*)(\d*\.?\d+)(rem|px)(?![\w(])/g, (m, p, n, u, i, str) => { const f = floorFor(str, i, +n, u); return f ? `${p}max(${n}${u},${f})` : m; });
  // font:<weight/style tokens> <size>[/lh] <family>
  s = s.replace(/(\bfont\s*:\s*(?:[a-z0-9-]+\s+){0,3})(\d*\.?\d+)(rem|px)(?=\s*[\/\s])/g, (m, p, n, u, i, str) => { const f = floorFor(str, i, +n, u); return f ? `${p}max(${n}${u},${f})` : m; });
  return s;
}
const out = fix(src.slice(0, a)) + src.slice(a, b) + fix(src.slice(b));
const total = counts[0] + counts[1] + counts[2] + counts[3];
console.log(`font sizes floored: ${total} (10px caps ${counts[0]}, 10.5px ${counts[1]}, 11.5px ${counts[2]}, 12.5px ${counts[3]})`);
if (!process.argv.includes('--dry')) fs.writeFileSync(file, out);
