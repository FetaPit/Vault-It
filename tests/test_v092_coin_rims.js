// v0.9.2 polish: every crypto coin's rim uses the coin's own colour (round 2 chunk G, owner R20d). XLM, ALGO, XMR (3-digit hex in their logos)
// and dark logos (ADA) fell back to gold. Run: node tests/test_v092_coin_rims.js
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
(async () => {
  const b = await chromium.launch(); const page = await b.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + (process.env.VI_INDEX || '/home/user/Vault-It/index.html')); await page.waitForTimeout(800);
  const r = await page.evaluate(() => Object.keys(VI_COIN_SVG).map(s => {
    const m = /<circle[^>]*fill='(#[0-9a-fA-F]{3,6})'/.exec(VI_COIN_SVG[s]); return { s, own: m && m[1], hue: crCoinHue(s), badge: crCoin3d({ sym: s, amount: 1, price: 1 }, 40, '#fff').match(/--coin:([^"]*)"/)[1] };
  }));
  const gold = '#d9a93a';
  for (const c of r) ok(c.hue.toLowerCase() !== gold && c.badge === c.hue, c.s + ' rim colour is its own (' + c.hue + ', logo ' + c.own + ')');
  const full = h => { h = h.toLowerCase(); return h.length === 4 ? '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3] : h; };
  const bright = r.filter(c => c.own && !['XLM', 'ALGO'].includes(c.s));
  for (const c of bright) ok(full(c.own) === c.hue.toLowerCase(), c.s + ' keeps its logo colour exactly');
  const unk = await page.evaluate(() => crCoinHue('NOPE')); ok(unk.toLowerCase() === gold, 'a coin with no logo stays gold');
  ok(!errs.length, 'no page errors ' + errs.join('|'));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
