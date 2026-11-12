#!/usr/bin/env node
/* Builds the Vault-It icon pack v2 from brand/icons/icons-v2.src.js.
 * Names, groups, colours and uses come from the frozen v1 pack (brand/icons/icons-v1.json), so ids stay the same (vi-<id>).
 * Writes:
 *   brand/vault-it-brand-book.html     its ICONS data becomes v2 (plus ICONS_V1 for the Weight comparison)
 *   brand/vault-it-icons.svg           sprite, currentColor, paste once per page (v1 is kept in brand/icons/v1/)
 *   brand/vault-it-icons.json          manifest (id, name, group, colour token, Night and Daylight hex, uses)
 *   brand/icons/svg/night/vi-*.svg     one file per icon in its Night colour (for decks, Canva, print)
 *   brand/icons/svg/daylight/vi-*.svg  the same in its Daylight colour
 *   brand/icons/preview-v2.html        v1 and v2 side by side, Night and Daylight, small sizes
 * Optional: --out <dir> also copies the sprite, manifest, svg folders and preview there.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BOOK = path.join(ROOT, 'brand', 'vault-it-brand-book.html');
const { ICONS: V2 } = require(path.join(ROOT, 'brand', 'icons', 'icons-v2.src.js'));

const book = fs.readFileSync(BOOK, 'utf8');
// v1 is frozen in its own file; the brand book itself now carries v2 (written below).
const V1 = JSON.parse(fs.readFileSync(path.join(ROOT, 'brand', 'icons', 'icons-v1.json'), 'utf8'));

const TOK = {};
for (const m of book.matchAll(/v:"(--[a-z0-9]+)",hex:"(#[0-9A-Fa-f]+)",lt:"(#[0-9A-Fa-f]+)"/g)) TOK[m[1]] = { hex: m[2], lt: m[3] };
const COLV = { teal: '--teal', blue: '--blue', gold: '--gold', brass: '--brass', green: '--green', green2: '--green2', red: '--red', orange: '--orange', purple: '--purple', coral: '--coral', salmon: '--salmon', amber: '--amber', yellow: '--yellow', muted: '--lock' };
const GROUPS = [['nav', 'Navigation'], ['asset', 'Asset classes'], ['kpi', 'Net worth cards'], ['bucket', 'Spending buckets'], ['income', 'Income'], ['ce', 'Committed essential'], ['ve', 'Variable essential'], ['cn', 'Committed non-essential'], ['vn', 'Variable non-essential'], ['sv', 'Savings'], ['inv', 'Investments'], ['debt', 'Debt'], ['goal', 'Goals and game'], ['hud', '3D controls'], ['act', 'Actions and status'], ['doc', 'Brand book'], ['contact', 'Contact']];

// Every v1 icon needs a v2 drawing, and nothing extra.
const missing = V1.filter((ic) => !V2[ic.id]).map((ic) => ic.id);
const extra = Object.keys(V2).filter((id) => !V1.some((ic) => ic.id === id));
if (missing.length || extra.length) {
  console.error('FAIL missing:', missing.join(' ') || 'none', '| extra:', extra.join(' ') || 'none');
  process.exit(1);
}
// No layer may draw outside the 24 grid's 1 unit bleed.
const bad = [];
for (const [id, ic] of Object.entries(V2)) {
  const nums = (Object.values(ic).join(' ').match(/-?\d*\.?\d+/g) || []).map(Number);
  if (nums.some((v) => v > 23 || v < -23)) bad.push(id);
}
if (bad.length) console.warn('check bounds:', bad.join(' '));

// Layer order: body fill, lit core, hairline, detail, nodes.
// Custom properties reach into <use>, so pages can tune them: --vi-sw (stroke), --vi-d (detail opacity, 0 under 24px), --vi-f, --vi-k.
function inner(ic) {
  let o = '';
  if (ic.f) o += `<g class="vi-f" fill="currentColor" stroke="none" fill-opacity=".14" style="fill-opacity:var(--vi-f,.14)">${ic.f}</g>`;
  if (ic.k) o += `<g class="vi-k" fill="currentColor" stroke="none" fill-opacity=".42" style="fill-opacity:var(--vi-k,.42)">${ic.k}</g>`;
  if (ic.s) o += `<g class="vi-s" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" style="stroke-width:var(--vi-sw,1.1)">${ic.s}</g>`;
  if (ic.d) o += `<g class="vi-d" fill="none" stroke="currentColor" stroke-width=".6" stroke-linecap="round" stroke-linejoin="round" opacity=".55" style="opacity:var(--vi-d,.55)">${ic.d}</g>`;
  if (ic.n) o += `<g class="vi-n" fill="currentColor" stroke="none">${ic.n}</g>`;
  return o;
}
const v1inner = (ic) => (ic.f ? `<g fill="currentColor" fill-opacity=".16" stroke="none">${ic.f}</g>` : '') + `<g fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" style="stroke-width:var(--vi-sw,1.1)">${ic.s}</g>` + (ic.d ? `<g fill="none" stroke="currentColor" stroke-width=".7" stroke-linecap="round" stroke-linejoin="round" opacity=".6" style="opacity:var(--vi-d,.6)">${ic.d}</g>` : '');

const list = V1.map((m) => ({ ...m, v2: V2[m.id], tok: COLV[m.c] }));

function write(p, s) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, s);
}
const out = [];
const save = (rel, s) => { write(path.join(ROOT, rel), s); out.push(rel); };

// Sprite
let sprite = '<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n<!-- Vault-It icon pack v2. Use: <svg class="vi" viewBox="0 0 24 24"><use href="#vi-home"/></svg>, colour with CSS color. -->\n';
list.forEach((ic) => (sprite += `<symbol id="vi-${ic.id}" viewBox="0 0 24 24">${inner(ic.v2)}</symbol>\n`));
save('brand/vault-it-icons.svg', sprite + '</svg>\n');

// Manifest
save('brand/vault-it-icons.json', JSON.stringify(list.map((ic) => ({ id: 'vi-' + ic.id, name: ic.n, group: ic.g, colour: ic.tok, night: TOK[ic.tok].hex, daylight: TOK[ic.tok].lt, uses: ic.u })), null, 2) + '\n');

// Single files, coloured, for tools that do not take currentColor
for (const [theme, key] of [['night', 'hex'], ['daylight', 'lt']]) {
  list.forEach((ic) => {
    const col = TOK[ic.tok][key];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96" color="${col}" style="color:${col}">${inner(ic.v2)}</svg>\n`;
    write(path.join(ROOT, 'brand/icons/svg', theme, `vi-${ic.id}.svg`), svg);
  });
  out.push(`brand/icons/svg/${theme}/ (${list.length} files)`);
}

// Preview
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const tokCss = Object.entries(TOK).map(([k, v]) => `${k}:${v.hex}`).join(';');
const tokLt = Object.entries(TOK).map(([k, v]) => `${k}:${v.lt}`).join(';');
const v1sym = list.map((ic) => `<symbol id="v1-${ic.id}" viewBox="0 0 24 24">${v1inner(ic)}</symbol>`).join('');
const v2sym = list.map((ic) => `<symbol id="vi-${ic.id}" viewBox="0 0 24 24">${inner(ic.v2)}</symbol>`).join('');
const use = (pre, id, cls = '') => `<svg class="vi ${cls}" viewBox="0 0 24 24" aria-hidden="true"><use href="#${pre}-${id}"/></svg>`;
let groupsHtml = '';
for (const [g, label] of GROUPS) {
  const items = list.filter((ic) => ic.g === g);
  if (!items.length) continue;
  groupsHtml += `<section class="grp"><h3>${label} <span>${items.length}</span></h3><div class="grid">`;
  items.forEach((ic) => {
    const uses = (ic.u || []).map((u) => (Array.isArray(u) ? u[0] : u)).join(', ');
    groupsHtml += `<figure style="--ic:var(${ic.tok})" title="${esc(uses)}"><div class="pair"><span class="old">${use('v1', ic.id)}</span><span class="new">${use('vi', ic.id)}</span></div><div class="sizes">${use('vi', ic.id, 's32')}${use('vi', ic.id, 's24')}${use('vi', ic.id, 's16')}</div><figcaption><b>${esc(ic.n)}</b><code>vi-${ic.id}</code></figcaption></figure>`;
  });
  groupsHtml += '</div></section>';
}
const heroIds = ['house-builder', 'vault', 'debt-tracker', 'b-ce', 'b-vn', 'brick', 'safe', 'crypto'];
const hero = heroIds.map((id) => { const ic = list.find((x) => x.id === id); return `<div class="hx" style="--ic:var(${ic.tok})">${use('vi', id)}<span>${esc(ic.n)}</span></div>`; }).join('');

const html = `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Vault-It icons v2</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;700&family=Share+Tech+Mono&display=swap" rel="stylesheet">
<style>
:root{${tokCss};--bg:#000810;--panel:#04141A;--edge:#0C2A30;--ink:#E8E8E8;--sub:#9FC4C1;color-scheme:dark}
:root[data-theme="light"]{${tokLt};--bg:#F3F7F6;--panel:#FFFFFF;--edge:#C5DAD8;--ink:#0B1F22;--sub:#3F5658;color-scheme:light}
@media (prefers-color-scheme:light){:root:not([data-theme="dark"]){${tokLt};--bg:#F3F7F6;--panel:#FFFFFF;--edge:#C5DAD8;--ink:#0B1F22;--sub:#3F5658;color-scheme:light}}
*{box-sizing:border-box}html,body{margin:0;overflow-x:hidden}
body{background:var(--bg);color:var(--ink);font:15px/1.5 "DM Sans","Helvetica Neue",Arial,sans-serif;padding:24px 16px 64px}
.wrap{max-width:1180px;margin:0 auto}
h1,h2,h3{font-family:Syne,"Helvetica Neue",Arial,sans-serif;margin:0}
h1{font-size:clamp(28px,5vw,44px);font-weight:800}h2{font-size:22px;margin-top:40px}h3{font-size:17px;margin:34px 0 12px}h3 span{font:13px "Share Tech Mono",monospace;color:var(--sub)}
.lbl{font:13px "Share Tech Mono",monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--teal)}
p{color:var(--sub);max-width:68ch}
.bar{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0}
.bar button{font:14px "DM Sans",sans-serif;background:var(--panel);color:var(--ink);border:1px solid var(--edge);border-radius:8px;padding:8px 14px;cursor:pointer;min-height:40px}
.bar button[aria-pressed="true"]{border-color:var(--teal);color:var(--teal)}
.hero{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;margin-top:20px}
.hx{background:var(--panel);border:1px solid var(--edge);border-radius:14px;padding:18px 10px 12px;text-align:center;color:var(--ic)}
.hx .vi{width:72px;height:72px;filter:drop-shadow(0 0 6px color-mix(in srgb,var(--ic) 45%,transparent))}
:root[data-theme="light"] .hx .vi{filter:none}
.hx span{display:block;color:var(--sub);font-size:13px;margin-top:6px}
.anat{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin-top:16px}
.anat div{background:var(--panel);border:1px solid var(--edge);border-radius:12px;padding:14px}
.anat b{display:block;font-family:Syne,sans-serif}.anat span{color:var(--sub);font-size:14px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
figure{margin:0;background:var(--panel);border:1px solid var(--edge);border-radius:12px;padding:12px 10px;color:var(--ic)}
.pair{display:flex;justify-content:center;gap:10px}
.pair .vi{width:56px;height:56px}
.old{display:none;opacity:.9;border-right:1px dashed var(--edge);padding-right:10px}
body.cmp .old{display:block}
.sizes{display:flex;justify-content:center;align-items:center;gap:10px;margin-top:8px;--vi-sw:1.5;--vi-d:0}
.s32{width:32px;height:32px}.s24{width:24px;height:24px}.s16{width:16px;height:16px}
figcaption{text-align:center;margin-top:8px}figcaption b{display:block;color:var(--ink);font-size:13px;font-weight:500}
figcaption code{font:12px "Share Tech Mono",monospace;color:var(--sub)}
.foot{margin-top:48px;color:var(--sub);font-size:13px;border-top:1px solid var(--edge);padding-top:14px}
@media (prefers-reduced-motion:no-preference){figure{transition:border-color .2s}figure:hover{border-color:var(--ic)}}
</style></head>
<body><svg xmlns="http://www.w3.org/2000/svg" style="display:none">${v1sym}${v2sym}</svg>
<div class="wrap">
<div class="lbl">Iconography v2</div>
<h1>Same family, sharper eyes.</h1>
<p>${list.length} icons redrawn on the same 24 grid with the same ids, so they drop into every place v1 sits. Each one now has a lit core: the one part that names it, filled brighter so you can tell icons apart at a glance. Chamfered corners, signal nodes and fine tick lines carry the tech feel. One colour per icon, set by its domain.</p>
<div class="bar" role="group" aria-label="View">
<button id="bTheme" aria-pressed="false">Daylight</button>
<button id="bCmp" aria-pressed="false">Show v1 beside v2</button>
</div>
<div class="hero">${hero}</div>
<h2>Anatomy</h2>
<div class="anat">
<div><b>Grid</b><span>24 units, 2 unit safe margin. Same ids as v1 (vi-home, vi-vault and so on).</span></div>
<div><b>Hairline</b><span>1.1 stroke, round caps. Steps up to 1.5 under 24px.</span></div>
<div><b>Body</b><span>14% fill of the icon's colour under the outline.</span></div>
<div><b>Lit core</b><span>42% fill on the part that names the icon: the lock body, the dial, the built courses. Built means lit.</span></div>
<div><b>Detail</b><span>0.6 lines at 55%: ticks, seams, rivets, HUD brackets. Dropped under 24px.</span></div>
<div><b>Signal node</b><span>Small solid dot on the active point. Survives at 16px.</span></div>
<div><b>Corners</b><span>Rectangles are chamfered, not rounded. That cut corner is the pack's futurist signature.</span></div>
<div><b>Colour</b><span>One hue per icon, from the colour code. Commitment reads in the lock: lit and shut means committed, open and unlit means variable.</span></div>
</div>
${groupsHtml}
<p class="foot">Each tile: the icon at 56px, then 32, 24 and 16px. Build: node tools/build_icons_v2.js. Source: brand/icons/icons-v2.src.js. Not regulated by the FCA. Not financial advice.</p>
</div>
<script>
(function(){var r=document.documentElement,b=document.getElementById("bTheme"),c=document.getElementById("bCmp");
function isLt(){return r.getAttribute("data-theme")==="light"||(!r.hasAttribute("data-theme")&&matchMedia("(prefers-color-scheme: light)").matches)}
function sync(){var lt=isLt();b.textContent=lt?"Night":"Daylight";b.setAttribute("aria-pressed","false")}
b.addEventListener("click",function(){r.setAttribute("data-theme",isLt()?"dark":"light");sync()});
c.addEventListener("click",function(){var on=document.body.classList.toggle("cmp");c.setAttribute("aria-pressed",on)});
var q=new URLSearchParams(location.search);if(q.get("theme"))r.setAttribute("data-theme",q.get("theme"));if(q.get("cmp"))document.body.classList.add("cmp");sync()})();
</script>
</body></html>
`;
save('brand/icons/preview-v2.html', html);

// Brand book: replace its icon data with v2 (layers f k s d, nodes as o since n is the name),
// plus the v1 drawings the Weight section compares against.
{
  const CMP = ['vault', 'house-builder', 'overview', 'debt-total', 'calendar'];
  const data = list.map((ic) => {
    const o = { id: ic.id, n: ic.n, g: ic.g, c: ic.c, u: ic.u };
    for (const k of ['f', 'k', 's', 'd']) if (ic.v2[k]) o[k] = ic.v2[k];
    if (ic.v2.n) o.o = ic.v2.n;
    return o;
  });
  const v1cmp = {};
  CMP.forEach((id) => { const m = V1.find((x) => x.id === id); v1cmp[id] = { f: m.f, s: m.s, d: m.d }; });
  const eol = book.includes('\r\n') ? '\r\n' : '\n';
  const lines = book.split(/\r?\n/);
  const i = lines.findIndex((l) => l.startsWith('var ICONS='));
  if (i < 0) throw new Error('ICONS not found in the brand book');
  const j = lines.findIndex((l) => l.startsWith('var ICONS_V1='));
  const newLines = ['var ICONS=' + JSON.stringify(data) + ';', 'var ICONS_V1=' + JSON.stringify(v1cmp) + ';'];
  if (j === i + 1) lines.splice(i, 2, ...newLines);
  else lines.splice(i, 1, ...newLines);
  fs.writeFileSync(BOOK, lines.join(eol));
  out.push('brand/vault-it-brand-book.html (ICONS now v2)');
}

// Optional copy
const oi = process.argv.indexOf('--out');
if (oi > 0 && process.argv[oi + 1]) {
  const dst = process.argv[oi + 1];
  const cp = (src, rel) => {
    const st = fs.statSync(src);
    if (st.isDirectory()) fs.readdirSync(src).forEach((f) => cp(path.join(src, f), path.join(rel, f)));
    else write(path.join(dst, rel), fs.readFileSync(src));
  };
  cp(path.join(ROOT, 'brand/vault-it-icons.svg'), 'vault-it-icons.svg');
  cp(path.join(ROOT, 'brand/vault-it-icons.json'), 'vault-it-icons.json');
  cp(path.join(ROOT, 'brand/icons/preview-v2.html'), 'preview-v2.html');
  cp(path.join(ROOT, 'brand/icons/svg'), 'svg');
  out.push('copied to ' + dst);
}
console.log(`icons v2: ${list.length} icons\n  ` + out.join('\n  '));
