// v0.8 F2 type scale (Pedro's spec section H): put a floor under every small font-size in index.html. Idempotent.
//   font-size:.5rem  ->  font-size:max(.5rem,var(--vi-fs-1))      (also the font: shorthand and clamp() with a small minimum)
// The floor is chosen by the declaration's own source value:
//   under .56rem (or under 10.5px)  -> --vi-fs-1  10.5px   captions, sub-lines, legal, hints
//   .56 to .69rem                   -> --vi-fs-2  11.5px   body in tiles, list rows, buttons
//   .70 to .80rem                   -> --vi-fs-3  12.5px   lead lines, inputs
//   .81rem and up, 10.5px and up    -> unchanged           headings, figures
//   uppercase Syne with letter-spacing .08em or more (in the same rule or style attribute) -> --vi-fs-0 10px,
//     except actual buttons (a <button> or a .btn / -btn selector, not tabs), which take at least --vi-fs-2 11.5px
// Skipped: the generated HB3D block, values already inside max()/min(), and the KEEP rules below.
// Usage: node tools/type_floor.js [--dry]
const fs = require('fs');
const file = __dirname + '/../index.html';
const src = fs.readFileSync(file, 'utf8');
const a = src.indexOf('// <<HB3D_ENGINE'), b = src.indexOf('// HB3D_ENGINE>>');
// Left at their own size on purpose (agreed with the creative director):
const KEEP = [
  '.nw-more-btns button{',   // C2 Net worth pills: 10 px caps, measured to fit one row at 390
  '.bd-tile-tt b{',          // D2 Budget card titles: .77rem caps, two balanced lines measured to fit (Pedro passed D2 item 1)
  '.hud-bar',                // the house builder 3D viewport's own HUD (hard rule: not touched)
  /(^|[^b])tab-btn\b/,       // the nav tabs: sized to fit all seven tabs (Pedro's KEEP list); not .subtab-btn
  /#app-footer|\.ft-[a-z]|#vi-fb-btn/,   // E2's footer and Feedback button (Pedro's KEEP list)
  '.i3d-hint{', '.i3d-badge{',          // B2's model-tile chips: 10 px mono, spec F
  '#topnav .vi-usp,#topnav .vi-pro{',   // USP/PRO nav badges: 9 px caps (agreed exception; set by type_scale_hand.js)
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
// an actual button (Pedro, 2 Nov): CSS selector naming a button, or an inline style on a <button> tag. Tabs keep the 10 px caps.
function isButton(s, i) {
  const open = s.lastIndexOf('{', i), st = Math.max(s.lastIndexOf('style="', i), s.lastIndexOf("style='", i), s.lastIndexOf("style=\\'", i));
  let who;
  if (st > open) { who = s.slice(s.lastIndexOf('<', st), st); return /^<button\b/.test(who); }
  who = s.slice(Math.max(s.lastIndexOf('}', open), s.lastIndexOf('*/', open), s.lastIndexOf('\n', open - 1)) + 1, open);
  if (/tab-btn|subtab|vh-tab|vi-fb|tab\b/.test(who)) return false;
  return /\bbutton\b|\.btn\b|\.btn-|-btn\b|-cta\b|\.cta\b/.test(who);
}
function lineOf(s, i) { return s.slice(s.lastIndexOf('\n', i) + 1, (s.indexOf('\n', i) + 1 || s.length + 1) - 1); }
function floorFor(s, i, n, u) {
  let t = tierOf(n, u); if (!t) return null;
  const ln = lineOf(s, i); if (KEEP.some(k => typeof k === 'string' ? ln.includes(k) : k.test(ln))) return null;
  if (capsSyne(context(s, i))) t = isButton(s, i) ? Math.max(t, 2) : 0;   // caps Syne: buttons 11.5 px, labels and eyebrows 10 px
  counts[t]++; return `var(--vi-fs-${t})`;
}
function fix(s) {
  // clamp(<min>,...) with a small minimum: wrap the whole clamp
  s = s.replace(/(font-size\s*:\s*)(clamp\(\s*(\d*\.?\d+)(rem|px)\s*,[^;{}()]*(?:\([^()]*\)[^;{}()]*)*\))/g, (m, p, c, n, u, i, str) => { const f = floorFor(str, i, +n, u); return f ? `${p}max(${c},${f})` : m; });
  // font-size:<value>
  s = s.replace(/(font-size\s*:\s*)(\d*\.?\d+)(rem|px)(?![\w(])/g, (m, p, n, u, i, str) => { const f = floorFor(str, i, +n, u); return f ? `${p}max(${n}${u},${f})` : m; });
  // font:<weight/style tokens> clamp(<min>,...)[/lh] <family>: wrap the whole clamp
  s = s.replace(/(\bfont\s*:\s*(?:[a-z0-9-]+\s+){0,3})(clamp\(\s*(\d*\.?\d+)(rem|px)\s*,[^;{}()]*(?:\([^()]*\)[^;{}()]*)*\))/g, (m, p, c, n, u, i, str) => { const f = floorFor(str, i, +n, u); return f ? `${p}max(${c},${f})` : m; });
  // font:<weight/style tokens> <size>[/lh] <family>
  s = s.replace(/(\bfont\s*:\s*(?:[a-z0-9-]+\s+){0,3})(\d*\.?\d+)(rem|px)(?=\s*[\/\s])/g, (m, p, n, u, i, str) => { const f = floorFor(str, i, +n, u); return f ? `${p}max(${n}${u},${f})` : m; });
  return s;
}
const out = fix(src.slice(0, a)) + src.slice(a, b) + fix(src.slice(b));
const total = counts[0] + counts[1] + counts[2] + counts[3];
console.log(`font sizes floored: ${total} (10px caps ${counts[0]}, 10.5px ${counts[1]}, 11.5px ${counts[2]}, 12.5px ${counts[3]})`);
if (!process.argv.includes('--dry')) { fs.writeFileSync(file, out); require('child_process').execFileSync(process.execPath, [__dirname + '/build_app.js', '--absorb'], { stdio: 'inherit' }); }   // index.html is built from src/app: carry the edit into the parts
