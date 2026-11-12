// 3D icons for the Assets sub-tabs and the tab bar (owner, 12 Nov 2026: "we need to update these icons by making them more 3D and refined").
// Writes the vi3-* symbols into src/app/shell/sprite.html between the vi3 markers, then run `node tools/build_app.js`.
// One lighting system for every icon: light from the top left, depth going back and up to the right (top and right faces show),
// a lit face in the button's colour (currentColor), darker sides, a highlight and a soft contact shadow.
// Classes the test reads: v3-sh shadow, v3-sd side or thickness, v3-fc lit face, v3-hi highlight.
const fs = require('fs'), path = require('path');
const FILE = path.join(__dirname, '..', 'src', 'app', 'shell', 'sprite.html');
const START = '<!-- vi3:start (tools/build_icons_3d.js writes this block) -->', END = '<!-- vi3:end -->';
const DX = 1.5, DY = -0.55;              // one unit of depth (round 2: deeper)
// Round 2 (owner, 12 Nov: "Rotate them more to the left showing more depth"): every icon is drawn through one turn that narrows
// the front face and lifts its right edge, so the object reads as turned left with its right side and top coming into view.
const TURN = { a: .84, b: -.16, s: .97, e: 1.6, f: 1.9 };
const turn = c => `<g class="v3-turn" transform="matrix(${r(TURN.a * TURN.s)} ${r(TURN.b * TURN.s)} 0 ${TURN.s} ${TURN.e} ${TURN.f})">${c}</g>`;
const r = n => +n.toFixed(2);
const pts = a => a.map(p => r(p[0]) + ',' + r(p[1])).join(' ');
const LN = 'stroke="#000" stroke-opacity=".3" stroke-width=".45" stroke-linejoin="round"';

// building blocks: each takes shape markup with a {A} slot for fill attributes
const fill = (shape, a) => shape.replace('{A}', a);
const shadow = (cx, cy, rx, ry) => `<ellipse class="v3-sh" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#v3-shg)" style="opacity:var(--vi3-sh,1)"/>`;
// thickness: copies of the shape stepped back along the depth vector, in the colour darkened
function slab(shape, depth, steps) {
  steps = steps || Math.max(3, Math.ceil(depth * 3)); let c = '', k;
  for (k = steps; k >= 1; k--) { const t = depth * k / steps; c += `<g transform="translate(${r(DX * t)} ${r(DY * t)})">${fill(shape, 'fill="currentColor"')}${fill(shape, 'fill="#000" fill-opacity=".42"')}</g>`; }
  return `<g class="v3-sd">${c}</g>`;
}
const face = (shape, grad) => `<g class="v3-fc">${fill(shape, 'fill="currentColor" ' + LN)}${fill(shape, `fill="url(#${grad || 'v3-lit'})"`)}</g>`;
const hi = (d, w, o) => `<path class="v3-hi" d="${d}" fill="none" stroke="#fff" stroke-opacity="${o || .6}" stroke-width="${w || .7}" stroke-linecap="round" stroke-linejoin="round"/>`;
const dark = (shape, o) => fill(shape, `fill="#000" fill-opacity="${o || .4}"`);
const poly = p => `<polygon points="${pts(p)}" {A}/>`;
// an upright box: front rectangle, top and right faces going back by d
function box(x, y, w, h, d, opt) {
  opt = opt || {}; const ox = DX * d, oy = DY * d;
  const top = poly([[x, y], [x + ox, y + oy], [x + w + ox, y + oy], [x + w, y]]);
  const side = poly([[x + w, y], [x + w + ox, y + oy], [x + w + ox, y + h + oy], [x + w, y + h]]);
  const front = poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
  return `<g class="v3-sd">${fill(side, 'fill="currentColor" ' + LN)}${dark(side, .45)}</g>` +
    `<g class="v3-fc">${fill(top, 'fill="currentColor" ' + LN)}${fill(top, 'fill="#fff" fill-opacity=".38"')}</g>` +
    face(front) + (opt.noHi ? '' : hi(`M${r(x + .45)} ${r(y + h - .6)}V${r(y + .45)}H${r(x + w - .4)}`, .6, .55));
}

const ICONS = {
  // Assets sub-tabs
  cash: () => {
    const back = '<rect x="4.2" y="5.4" width="16.5" height="10.2" rx="1.4" {A}/>';
    const note = '<rect x="2.4" y="8.2" width="17" height="10.4" rx="1.5" {A}/>';
    return shadow(12, 21.4, 9.6, 1.5) + slab(back, .9) + face(back) + dark(back, .3) + slab(note, 1.2) + face(note) +
      '<rect x="4" y="9.8" width="13.8" height="7.2" rx=".8" fill="none" stroke="#000" stroke-opacity=".32" stroke-width=".6"/>' +
      '<circle cx="10.9" cy="13.4" r="2.5" fill="#000" fill-opacity=".3"/><circle cx="10.9" cy="13.4" r="1.5" fill="#fff" fill-opacity=".28"/>' +
      '<circle cx="5.8" cy="13.4" r=".7" fill="#000" fill-opacity=".35"/><circle cx="16" cy="13.4" r=".7" fill="#000" fill-opacity=".35"/>' +
      hi('M3.7 8.75H18.1', .7, .7) + hi('M9.6 11.9a1.9 1.9 0 0 1 2.4-.4', .55, .7);
  },
  candles: () => '<path class="v3-sd" d="M6.6 3.2V20.2M15.6 7.4V20.6" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>' +
    '<path d="M6.6 3.2V20.2M15.6 7.4V20.6" stroke="#000" stroke-opacity=".35" stroke-width="1.1" stroke-linecap="round"/>' +
    shadow(12, 21.4, 9, 1.4) + box(4.4, 7.6, 4.2, 8.6, 1.7) + box(13.4, 10.4, 4.2, 6.2, 1.7) +
    hi('M6.25 3.6V7.1M15.25 7.8V9.9', .5, .55),
  metals: () => {
    const front = poly([[2, 19], [17.4, 19], [15.4, 13], [4.1, 13]]);
    const top = poly([[4.1, 13], [15.4, 13], [18.5, 9.4], [7.2, 9.4]]);
    const side = poly([[15.4, 13], [18.5, 9.4], [21.2, 15.4], [17.4, 19]]);
    return shadow(11.8, 21, 10, 1.5) + `<g class="v3-sd">${fill(side, 'fill="currentColor" ' + LN)}${dark(side, .45)}</g>` +
      `<g class="v3-fc">${fill(top, 'fill="currentColor" ' + LN)}${fill(top, 'fill="#fff" fill-opacity=".42"')}</g>` + face(front) +
      '<rect x="7" y="14.7" width="6.6" height="2.5" rx=".4" fill="#000" fill-opacity=".28"/>' +
      hi('M8.1 11.25H15.6', .8, .75) + hi('M3.3 18.4L4.6 13.6', .55, .5);
  },
  cube: () => {
    const T = [12, 2.6], UR = [20.4, 7.3], LR = [20.4, 16.7], B = [12, 21.4], LL = [3.6, 16.7], UL = [3.6, 7.3], C = [12, 12];
    return shadow(12, 21.6, 8.6, 1.3) +
      `<g class="v3-sd">${fill(poly([C, UR, LR, B]), 'fill="currentColor" ' + LN)}${dark(poly([C, UR, LR, B]), .45)}</g>` +
      `<g class="v3-fc">${fill(poly([T, UR, C, UL]), 'fill="currentColor" ' + LN)}${fill(poly([T, UR, C, UL]), 'fill="#fff" fill-opacity=".4"')}</g>` +
      face(poly([UL, C, B, LL])) +
      hi('M4.3 7.4L11.95 3.2L19.7 7.4', .7, .7) + hi('M4.2 8.3V16.2', .55, .5) + hi('M12 12.6V20.6', .45, .35);
  },
  crypto: () => {
    const coin = '<circle cx="11.2" cy="12.2" r="8.6" {A}/>';
    const g = 'translate(11.2 12.2) scale(.74) translate(-12 -12)';
    const B = '<path d="M9.6 7.4v9.2M9.6 7.4h3.5a2.2 2.2 0 0 1 0 4.4H9.6m0 0h4.1a2.4 2.4 0 0 1 0 4.8H9.6M11.2 5.6v1.8M13.2 5.6v1.8M11.2 16.6v1.8M13.2 16.6v1.8" fill="none" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" {A}/>';
    return shadow(12, 21.7, 8.6, 1.3) + slab(coin, 1.8) + face(coin, 'v3-sph') +
      '<circle cx="11.2" cy="12.2" r="6.7" fill="none" stroke="#000" stroke-opacity=".3" stroke-width=".8"/>' +
      `<g transform="translate(.45 .45) ${g}">${fill(B, 'stroke="#000" stroke-opacity=".45"')}</g>` +
      `<g transform="${g}">${fill(B, 'stroke="#fff" stroke-opacity=".88"')}</g>` +
      hi('M5.1 9.2a6.9 6.9 0 0 1 4-3.9', .8, .65);
  },
  liabilities: () => {
    const tri = '<path d="M11.4 3.6L20.4 19H2.4z" stroke-width="1.6" stroke-linejoin="round" {A}/>';
    const triS = tri.replace('stroke-width="1.6" ', '');
    return shadow(11.8, 21.3, 9.6, 1.4) + slab(tri.replace('{A}', 'stroke="currentColor" {A}'), 1.4) +
      `<g class="v3-fc">${fill(tri, 'fill="currentColor" stroke="currentColor"')}${fill(triS, 'fill="url(#v3-lit)"')}</g>` +
      '<rect x="10.35" y="8.6" width="2.1" height="6" rx="1.05" fill="#000" fill-opacity=".55"/><circle cx="11.4" cy="16.7" r="1.15" fill="#000" fill-opacity=".55"/>' +
      '<path d="M10.6 14.75h1.7M10.6 17.7h1.6" stroke="#fff" stroke-opacity=".35" stroke-width=".5" stroke-linecap="round"/>' +
      hi('M3.9 18.1L10.3 6.2', .75, .65);
  },
  // Tab bar
  overview: () => shadow(12, 21.4, 9.4, 1.4) + box(12.2, 4.6, 7.2, 6.6, 1.5) + box(2.6, 4.6, 7.2, 6.6, 1.5) + box(12.2, 13.2, 7.2, 6.6, 1.5) + box(2.6, 13.2, 7.2, 6.6, 1.5),
  budget: () => {
    const card = '<rect x="2.2" y="6.6" width="17.6" height="12.2" rx="1.8" {A}/>';
    return shadow(12, 21.4, 9.6, 1.4) + slab(card, 1.4) + face(card) +
      '<rect x="2.2" y="9.2" width="17.6" height="2.4" fill="#000" fill-opacity=".45"/>' +
      '<rect x="4.2" y="13.3" width="3.6" height="2.7" rx=".5" fill="#fff" fill-opacity=".55"/><path d="M4.2 14.65h3.6M6 13.3v2.7" stroke="#000" stroke-opacity=".25" stroke-width=".4"/>' +
      '<path d="M12.4 15.6h4.6" stroke="#000" stroke-opacity=".38" stroke-width=".9" stroke-linecap="round"/>' +
      hi('M3.6 7.2H18.4', .7, .7);
  },
  'house-builder': () => {
    const front = poly([[3.4, 20], [3.4, 12.2], [8.9, 6.7], [14.4, 12.2], [14.4, 20]]);
    const wall = poly([[14.4, 12.2], [19.9, 8.9], [19.9, 16.7], [14.4, 20]]);
    const roof = poly([[8.9, 6.7], [14.2, 3.5], [20.5, 9.4], [14.4, 13.1]]);
    return shadow(12, 21.5, 9.6, 1.4) + `<g class="v3-sd">${fill(wall, 'fill="currentColor" ' + LN)}${dark(wall, .45)}</g>` +
      '<polygon points="16.2,13.4 18.4,12.1 18.4,14.3 16.2,15.6" fill="#000" fill-opacity=".45"/>' +
      face(front) + `<g class="v3-fc">${fill(roof, 'fill="currentColor" ' + LN)}${fill(roof, 'fill="#000" fill-opacity=".14"')}</g>` +
      '<rect x="7.4" y="14.6" width="3" height="5.4" rx=".3" fill="#000" fill-opacity=".45"/>' +
      hi('M9 6.6L14.2 3.5', .8, .8) + hi('M4 19.4V12.5L8.9 7.6', .6, .55);
  },
  assets: () => shadow(12, 21.4, 9.6, 1.4) + box(2.8, 13.4, 4, 6.6, 1.5) + box(9.4, 9.6, 4, 10.4, 1.5) + box(16, 5.6, 4, 14.4, 1.5),
  'debt-tracker': () => {
    const line = '<path d="M3.2 6.4L8.6 12.4L12 9.9L17.2 15.4" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" {A}/>';
    const head = '<polygon points="13.9,17.4 20.2,18.6 19.4,12.3" stroke-width="1" stroke-linejoin="round" {A}/>';
    const sd = (s, d) => { let c = ''; for (let k = 4; k >= 1; k--) { const t = d * k / 4; c += `<g transform="translate(${r(DX * t)} ${r(DY * t)})">${fill(s, 'stroke="currentColor" fill="currentColor"')}${fill(s, 'stroke="#000" stroke-opacity=".42" fill="#000" fill-opacity=".42"')}</g>`; } return c; };
    return shadow(12, 21.4, 9, 1.4) + `<g class="v3-sd">${sd(line.replace('fill="none" ', ''), 1.4).replace(/fill="currentColor"|fill="#000" fill-opacity="\.42"/g, 'fill="none"')}${sd(head, 1.4)}</g>` +
      `<g class="v3-fc">${fill(line, 'stroke="currentColor"')}${fill(head, 'fill="currentColor" stroke="currentColor"')}</g>` +
      hi('M3 5.75L8.5 11.7L11.9 9.25L16.3 13.9', .6, .6);
  },
  entrepreneur: () => {
    const bolt = '<path d="M13.6 2.6L5.2 13.6H11.2L9.2 21.4L18.4 9.6H12.4L13.6 2.6Z" stroke-width=".9" stroke-linejoin="round" {A}/>';
    return shadow(11.8, 21.6, 7.6, 1.2) + slab(bolt.replace('{A}', 'stroke="currentColor" {A}'), 1.5) +
      `<g class="v3-fc">${fill(bolt, 'fill="currentColor" stroke="currentColor"')}${fill(bolt, 'fill="url(#v3-lit)"')}</g>` +
      hi('M12.9 3.9L6.2 12.9', .75, .7) + hi('M10.1 19.4L11.6 13.9', .5, .45);
  },
  trophy: () => {
    const cup = '<path d="M6.4 4.2h11.2v5.2c0 4.1-3.7 6-5.6 6s-5.6-1.9-5.6-6z" {A}/>';
    return shadow(12, 21.6, 7.4, 1.2) +
      '<path class="v3-sd" d="M6.6 6.1H4.7a2.1 2.1 0 0 0 0 4.2h2.4M17.4 6.1h1.9a2.1 2.1 0 0 1 0 4.2h-2.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
      '<path d="M6.6 6.1H4.7a2.1 2.1 0 0 0 0 4.2h2.4M17.4 6.1h1.9a2.1 2.1 0 0 1 0 4.2h-2.4" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="1.5" stroke-linecap="round"/>' +
      '<rect x="11" y="15" width="2" height="2.8" fill="currentColor"/><rect x="11" y="15" width="2" height="2.8" fill="url(#v3-cyl)"/>' +
      box(7.6, 17.8, 8.2, 2.6, 1.1, { noHi: true }) +
      face(cup, 'v3-cyl') +
      '<ellipse cx="12" cy="4.3" rx="5.6" ry="1.25" fill="currentColor"/><ellipse cx="12" cy="4.3" rx="5.6" ry="1.25" fill="#fff" fill-opacity=".38"/><ellipse cx="12" cy="4.45" rx="4.4" ry=".75" fill="#000" fill-opacity=".38"/>' +
      hi('M8.3 6.4V10.2', .9, .7);
  },
  connections: () => {
    const rods = '<path d="M12 5L5 17.4M12 5l7 12.4M5 17.4h14" fill="none" stroke-width="1.5" stroke-linecap="round" {A}/>';
    const ball = (x, y) => { const s = `<circle cx="${x}" cy="${y}" r="2.9" {A}/>`; return face(s, 'v3-sph') + hi(`M${x - 1.6} ${y - .5}a1.8 1.8 0 0 1 1.2-1.3`, .6, .75); };
    return shadow(12, 21.4, 9.8, 1.3) + `<g class="v3-sd">${fill(rods, 'stroke="currentColor"')}${fill(rods, 'stroke="#000" stroke-opacity=".4"')}</g>` +
      ball(12, 4.6) + ball(4.8, 17.6) + ball(19.2, 17.6);
  },
  network: () => {
    const P = [[8, 1], [10.5, 6], [16, 6.9], [12, 10.7], [12.9, 16], [8, 13.4], [3.1, 16], [4, 10.7], [0, 6.9], [5.5, 6]].map(p => [p[0] * 1.24 + 1.9, p[1] * 1.24 + 1.7]);
    const star = `<polygon points="${pts(P)}" stroke-width=".9" stroke-linejoin="round" {A}/>`;
    return shadow(11.8, 21.6, 8.6, 1.3) + slab(star.replace('{A}', 'stroke="currentColor" {A}'), 1.4) +
      `<g class="v3-fc">${fill(star, 'fill="currentColor" stroke="currentColor"')}${fill(star, 'fill="url(#v3-lit)"')}</g>` +
      '<circle cx="11.8" cy="12.1" r="2.3" fill="#000" fill-opacity=".35"/><circle cx="11.8" cy="12.1" r="1.2" fill="#fff" fill-opacity=".45"/>' +
      hi(`M${r(P[9][0])} ${r(P[9][1])}L${r(P[0][0])} ${r(P[0][1])}`, .7, .7) + hi(`M${r(P[8][0]) + .4} ${r(P[8][1]) + .2}L${r(P[9][0])} ${r(P[9][1]) + .3}`, .55, .55);
  },
};

const defs = '<defs>' +
  '<linearGradient id="v3-lit" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient>' +
  '<linearGradient id="v3-cyl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".12"/><stop offset=".24" stop-color="#fff" stop-opacity=".45"/><stop offset=".48" stop-color="#fff" stop-opacity=".04"/><stop offset="1" stop-color="#000" stop-opacity=".4"/></linearGradient>' +
  '<radialGradient id="v3-sph" cx=".36" cy=".32" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".62"/><stop offset=".38" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".42"/></radialGradient>' +
  '<radialGradient id="v3-shg"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>' +
  '</defs>';
const block = [START, defs].concat(Object.keys(ICONS).map(k => `<symbol id="vi3-${k}" viewBox="0 0 24 24">${turn(ICONS[k]())}</symbol>`)).concat([END]).join('\n');

if (require.main === module) {
  let s = fs.readFileSync(FILE, 'utf8');
  if (s.includes(START)) s = s.slice(0, s.indexOf(START)) + block + s.slice(s.indexOf(END) + END.length);
  else { const i = s.lastIndexOf('</svg>'); s = s.slice(0, i) + block + '\n' + s.slice(i); }
  fs.writeFileSync(FILE, s);
  console.log('vi3 symbols: ' + Object.keys(ICONS).length + ' written to ' + path.relative(process.cwd(), FILE));
}
module.exports = { ICONS, defs, block };
