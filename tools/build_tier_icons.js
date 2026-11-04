// Tier icons (owner, 4 Nov 2026, v0.9.1 round 2 chunk I; Pedro's brief): Vaulter a vault door, Pioneer a compass, Founding Member
// a keystone with rank chevrons. Drawn as Wealth Roadmap medallions (the token's metal rim, rivets, tick dial, face, engraved ring and
// glass highlight from wrTok in index.html), scaled to a 100 x 100 box, with more detail inside. Colours are the roadmap tiers and stay
// the same in Night and Daylight, like the tokens.
// Writes: the sprite between <!--TIER_ICONS and TIER_ICONS--> in index.html, and brand/vault-it-tier-<name>.svg (standalone).
// Run: node tools/build_tier_icons.js
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const T = {
  vaulter: { c: '#44C0B9', d: '#0f4a47', dd: '#0a2b2a', l: '#a9ece8', title: 'Vaulter' },
  pioneer: { c: '#9B7EC8', d: '#3b2a5c', dd: '#22183a', l: '#d9c9f2', title: 'Pioneer' },
  founder: { c: '#C9A84C', d: '#5e4614', dd: '#2e220a', l: '#f3e2a8', title: 'Founding Member' }
};
const f = (n) => (Math.round(n * 10) / 10).toString();
const pol = (cx, cy, r, deg) => [cx + r * Math.cos(deg * Math.PI / 180), cy + r * Math.sin(deg * Math.PI / 180)];
const P = (pts) => pts.map(p => f(p[0]) + ',' + f(p[1])).join(' ');

// the shared medal: metal rim, four rivets, tick dial, tier face, engraved ring, dotted ring
function medal(k) {
  let ticks = '';
  for (let a = 0; a < 360; a += 10) { const r = a % 30 ? 39.7 : 42.2, p0 = pol(50, 50, 37, a), p1 = pol(50, 50, r, a); ticks += 'M' + f(p0[0]) + ' ' + f(p0[1]) + 'L' + f(p1[0]) + ' ' + f(p1[1]); }
  let riv = '';
  [[50, 5.4], [94.6, 50], [50, 94.6], [5.4, 50]].forEach(p => { riv += 'M' + f(p[0] - 1.8) + ' ' + p[1] + 'a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0'; });
  return '<circle cx="50" cy="50" r="46" fill="url(#tier-metal)" stroke="#05080c" stroke-opacity=".5" stroke-width="1.2"/>'
    + '<circle cx="50" cy="50" r="43.9" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width=".7"/>'
    + '<path d="' + ticks + '" stroke="#0a0e12" stroke-width="1" fill="none"/>'
    + '<path d="' + riv + '" fill="#3a434c" stroke="#f4f6f8" stroke-opacity=".55" stroke-width=".6"/>'
    + '<circle cx="50" cy="50" r="35.6" fill="url(#tier-face-' + k + ')" stroke="' + T[k].l + '" stroke-width="2.4"/>'
    + '<circle cx="50" cy="50" r="34" fill="none" stroke="' + T[k].l + '" stroke-opacity=".45" stroke-width="1.3" stroke-dasharray=".1 3.2" stroke-linecap="round"/>'
    + '<circle cx="50" cy="50" r="32.4" fill="none" stroke="' + T[k].l + '" stroke-opacity=".5" stroke-width=".7" stroke-dasharray="1.8 2.4"/>';
}
const gloss = '<path d="M21.4 40.2a29.4 29.4 0 0 1 39.3-22.7" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="3.2" stroke-linecap="round"/>';

// Vaulter: a round vault door, eight rim bolts, hinge barrels on the left, a five-spoke handwheel, a bright notch at 12 o'clock
function vaulter() {
  const k = T.vaulter;
  let s = '<path d="M47.5 4.6h5l-2.5 4.4z" fill="' + k.l + '"/>';   // the notch at 12 on the dial
  s += '<rect x="19.6" y="35.5" width="5.6" height="9" rx="1.8" fill="url(#tier-metal)" stroke="' + k.dd + '" stroke-width=".7"/>'
    + '<rect x="19.6" y="55.5" width="5.6" height="9" rx="1.8" fill="url(#tier-metal)" stroke="' + k.dd + '" stroke-width=".7"/>';
  s += '<circle cx="50" cy="50" r="26" fill="url(#tier-plate-vaulter)" stroke="' + k.dd + '" stroke-width="1.2"/>'
    + '<circle cx="50" cy="50" r="20.5" fill="none" stroke="' + k.dd + '" stroke-opacity=".8" stroke-width="1.1"/>'
    + '<circle cx="50" cy="50" r="19.4" fill="none" stroke="' + k.l + '" stroke-opacity=".55" stroke-width=".6"/>';
  for (let a = 22.5; a < 360; a += 45) { const p = pol(50, 50, 23.3, a); s += '<circle cx="' + f(p[0]) + '" cy="' + f(p[1]) + '" r="1.7" fill="' + k.l + '" stroke="' + k.dd + '" stroke-width=".6"/>'; }
  let spokes = '';
  for (let i = 0; i < 5; i++) { const a = -90 + i * 72, p0 = pol(50, 50, 4.4, a), p1 = pol(50, 50, 14.5, a); spokes += 'M' + f(p0[0]) + ' ' + f(p0[1]) + 'L' + f(p1[0]) + ' ' + f(p1[1]); }
  s += '<circle cx="50" cy="50" r="14.5" fill="none" stroke="' + k.dd + '" stroke-width="3.6"/>'
    + '<path d="' + spokes + '" stroke="' + k.dd + '" stroke-width="3.6" stroke-linecap="round"/>'
    + '<circle cx="50" cy="50" r="14.5" fill="none" stroke="' + k.l + '" stroke-width="2"/>'
    + '<path d="' + spokes + '" stroke="' + k.l + '" stroke-width="2" stroke-linecap="round"/>';
  for (let i = 0; i < 5; i++) { const p = pol(50, 50, 14.5, -90 + i * 72); s += '<circle cx="' + f(p[0]) + '" cy="' + f(p[1]) + '" r="2.1" fill="' + k.l + '" stroke="' + k.dd + '" stroke-width=".7"/>'; }
  s += '<circle cx="50" cy="50" r="5" fill="' + k.l + '" stroke="' + k.dd + '" stroke-width="1"/><circle cx="50" cy="50" r="1.8" fill="' + k.d + '"/>';
  return s;
}

// Pioneer: a compass, split-shade needle pointing up and right, four cardinal ticks with a longer north notch, three chevrons trailing
function pioneer() {
  const k = T.pioneer;
  let s = '<circle cx="50" cy="50" r="27.5" fill="none" stroke="' + k.l + '" stroke-opacity=".55" stroke-width=".8"/>';
  let ticks = '';
  [[0, 23.5], [90, 23.5], [180, 23.5]].forEach(([a, r0]) => { const p0 = pol(50, 50, r0, a), p1 = pol(50, 50, 29.5, a); ticks += 'M' + f(p0[0]) + ' ' + f(p0[1]) + 'L' + f(p1[0]) + ' ' + f(p1[1]); });
  s += '<path d="' + ticks + 'M50 30.5V20.5" stroke="' + k.l + '" stroke-width="2" stroke-linecap="round"/>';
  s += '<path d="M50 15.6l3 5h-6z" fill="' + k.l + '"/>';   // the north notch
  for (let a = 45; a < 360; a += 90) { if (a === 135) continue; const p0 = pol(50, 50, 26, a), p1 = pol(50, 50, 29, a); s += '<path d="M' + f(p0[0]) + ' ' + f(p0[1]) + 'L' + f(p1[0]) + ' ' + f(p1[1]) + '" stroke="' + k.l + '" stroke-opacity=".6" stroke-width="1.1" stroke-linecap="round"/>'; }
  // three chevrons trailing down-left, pointing the way the needle points
  [[16.5, 1], [21.5, .7], [26.5, .42]].forEach(([r, o]) => {
    const c = pol(50, 50, r, 135), ax = [Math.SQRT1_2, -Math.SQRT1_2], px = [Math.SQRT1_2, Math.SQRT1_2];
    const tip = [c[0] + ax[0] * 2.2, c[1] + ax[1] * 2.2], a1 = [c[0] - ax[0] * 2.2 + px[0] * 3.4, c[1] - ax[1] * 2.2 + px[1] * 3.4], a2 = [c[0] - ax[0] * 2.2 - px[0] * 3.4, c[1] - ax[1] * 2.2 - px[1] * 3.4];
    s += '<path d="M' + f(a1[0]) + ' ' + f(a1[1]) + 'L' + f(tip[0]) + ' ' + f(tip[1]) + 'L' + f(a2[0]) + ' ' + f(a2[1]) + '" fill="none" stroke="' + k.l + '" stroke-opacity="' + o + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>';
  });
  // the needle: north half light and mid, south half dark
  const tip = pol(50, 50, 24, -45), tail = pol(50, 50, 12, 135), sA = pol(50, 50, 4.8, 45), sB = pol(50, 50, 4.8, -135);
  s += '<polygon points="' + P([tip, sB, [50, 50]]) + '" fill="' + k.l + '"/>'
    + '<polygon points="' + P([tip, sA, [50, 50]]) + '" fill="' + k.c + '"/>'
    + '<polygon points="' + P([tail, sB, [50, 50]]) + '" fill="' + k.d + '"/>'
    + '<polygon points="' + P([tail, sA, [50, 50]]) + '" fill="' + k.dd + '"/>'
    + '<polygon points="' + P([tip, sA, tail, sB]) + '" fill="none" stroke="' + k.dd + '" stroke-width=".8" stroke-linejoin="round"/>'
    + '<circle cx="50" cy="50" r="2.6" fill="' + k.l + '" stroke="' + k.dd + '" stroke-width=".8"/>';
  return s;
}

// Founding Member: a keystone wedge between shaded arch stones with visible joints, an engraved five-point star, two rank chevrons
function founder() {
  const k = T.founder, cx = 50, cy = 64;
  const stone = (a0, a1, r0, r1) => { const p = [pol(cx, cy, r1, a0), pol(cx, cy, r1, a1), pol(cx, cy, r0, a1), pol(cx, cy, r0, a0)]; return 'M' + f(p[0][0]) + ' ' + f(p[0][1]) + 'A' + r1 + ' ' + r1 + ' 0 0 1 ' + f(p[1][0]) + ' ' + f(p[1][1]) + 'L' + f(p[2][0]) + ' ' + f(p[2][1]) + 'A' + r0 + ' ' + r0 + ' 0 0 0 ' + f(p[3][0]) + ' ' + f(p[3][1]) + 'Z'; };
  let s = '';
  [[181, 213], [215, 250], [290, 325], [327, 359]].forEach(([a0, a1], i) => {
    s += '<path d="' + stone(a0, a1, 13.5, 26) + '" fill="' + (i === 0 || i === 3 ? k.dd : k.d) + '" stroke="' + k.l + '" stroke-opacity=".7" stroke-width=".9" stroke-linejoin="round"/>';
  });
  // the keystone stands proud of the arch: wider at the top, a little taller than its neighbours
  const kt = [pol(cx, cy, 31, 251.5), pol(cx, cy, 31, 288.5), pol(cx, cy, 12, 286), pol(cx, cy, 12, 254)];
  s += '<polygon points="' + P(kt) + '" fill="url(#tier-plate-founder)" stroke="' + k.dd + '" stroke-width="1.1" stroke-linejoin="round"/>'
    + '<polyline points="' + P([kt[3], kt[0], kt[1]]) + '" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width=".8" stroke-linejoin="round"/>';
  // engraved star on the keystone face
  const sc = [50, 42.2], star = [];
  for (let i = 0; i < 10; i++) star.push(pol(sc[0], sc[1], i % 2 ? 2.3 : 5.2, -90 + i * 36));
  s += '<polygon points="' + P(star) + '" fill="' + k.dd + '" fill-opacity=".55" stroke="' + k.dd + '" stroke-width="1" stroke-linejoin="round"/>';
  // two rank chevrons in the arch's opening
  s += '<path d="M43 63.5l7-4.6 7 4.6M43 69.5l7-4.6 7 4.6" fill="none" stroke="' + k.l + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>';
  // the springing line the arch stands on
  s += '<path d="M21 64.8h58" stroke="' + k.l + '" stroke-opacity=".5" stroke-width=".9" stroke-linecap="round"/>';
  return s;
}
const MOTIF = { vaulter, pioneer, founder };

function defs() {
  let d = '<linearGradient id="tier-metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f6f8"/><stop offset=".45" stop-color="#9aa3ad"/><stop offset=".55" stop-color="#d7dde2"/><stop offset="1" stop-color="#5c656e"/></linearGradient>';
  for (const [k, c] of Object.entries(T)) {
    d += '<radialGradient id="tier-face-' + k + '" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="' + c.d + '"/><stop offset="1" stop-color="' + c.dd + '"/></radialGradient>'
      + '<linearGradient id="tier-plate-' + k + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c.l + '"/><stop offset=".5" stop-color="' + c.c + '"/><stop offset="1" stop-color="' + c.d + '"/></linearGradient>';
  }
  return d;
}
const symbol = (k) => '<symbol id="tier-' + k + '" viewBox="0 0 100 100">' + medal(k) + MOTIF[k]() + gloss + '</symbol>';
// the crowdfund card: the roadmap token's clipped card (two stacked edges, stripes top left, halftone bottom right) holding the medallion
const CARD = '0,0 72,0 100,28 100,132 14,132 0,118';
function cardDefs() {
  let d = '<clipPath id="tier-clip"><polygon points="' + CARD + '"/></clipPath>';
  for (const [k, c] of Object.entries(T)) {
    d += '<linearGradient id="tier-cardfill-' + k + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c.c + '"/><stop offset=".55" stop-color="' + c.d + '"/><stop offset="1" stop-color="' + c.dd + '"/></linearGradient>'
      + '<pattern id="tier-stripes-' + k + '" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><rect width="2.2" height="6" fill="' + c.l + '" opacity=".35"/></pattern>'
      + '<pattern id="tier-dots-' + k + '" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".8" fill="' + c.l + '" opacity=".45"/></pattern>';
  }
  return d;
}
const cardSymbol = (k) => '<symbol id="tier-card-' + k + '" viewBox="-8 -2 110 140">'
  + [2, 1].map(n => '<polygon points="' + CARD + '" transform="translate(' + (-n * 3) + ' ' + (n * 3) + ')" fill="' + T[k].dd + '" stroke="' + T[k].d + '" stroke-width=".6"/>').join('')
  + '<polygon points="' + CARD + '" fill="url(#tier-cardfill-' + k + ')"/><g clip-path="url(#tier-clip)"><polygon points="0,0 60,0 0,60" fill="url(#tier-stripes-' + k + ')"/><polygon points="100,78 100,132 38,132" fill="url(#tier-dots-' + k + ')"/></g>'
  + '<polygon points="' + CARD + '" fill="none" stroke="' + T[k].l + '" stroke-width=".8" stroke-opacity=".85"/>'
  + '<use href="#tier-' + k + '" x="4" y="32" width="84" height="84"/></symbol>';

// the app sprite
const sprite = '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>' + defs() + cardDefs() + '</defs>'
  + Object.keys(T).map(symbol).join('') + Object.keys(T).map(cardSymbol).join('') + '</svg>';
const file = path.join(ROOT, 'index.html');
const html = fs.readFileSync(file, 'utf8');
const re = /(<!--TIER_ICONS[^\n]*-->)[\s\S]*?(<!--\/TIER_ICONS-->)/;
if (!re.test(html)) { console.error('index.html has no <!--TIER_ICONS ... --> / <!--/TIER_ICONS--> block'); process.exit(1); }
fs.writeFileSync(file, html.replace(re, (m, a, b) => a + '\n' + sprite + '\n' + b));
// standalone files for the brand folder
for (const [k, c] of Object.entries(T)) {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200" role="img" aria-label="' + c.title + ' tier icon">'
    + '<title>Vault-It ' + c.title + ' tier</title><defs>' + defs() + '</defs>' + medal(k) + MOTIF[k]() + gloss + '</svg>\n';
  fs.writeFileSync(path.join(ROOT, 'brand', 'vault-it-tier-' + (k === 'founder' ? 'founding-member' : k) + '.svg'), svg);
}
console.log('tier icons: sprite ' + sprite.length + ' bytes, 3 brand SVGs written');
