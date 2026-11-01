// v0.7 final round, step 2: three bugs from the owner's fold-phone screenshot (22:11, 1 Nov).
// a) the 3D caption follows the selected house type; b) Level 1 never sticks on "Counting bricks…"; c) "£n lays n bricks" shows at 884 px.
// Run: node tests/test_final_round_bugs.js
const { chromium } = require('playwright');
const routeThree = require('./three_route');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const ST = type => ({ saved: 20000, target: 300000, houseType: type, depositPct: 20, floor: 4, prices: { terraced: 120000, semi: 320000, detached: 500000, mansion: 1500000, flat: 80000, apartment: 300000 }, deposits: [{ amount: 20000, date: '30/10/2026' }] });
async function open(b, w, type, errs) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 } }); await routeThree(ctx);
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.addInitScript(s => { if (localStorage.getItem('ht3')) return; localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 })); localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com' })); localStorage.setItem('vi_pioneer', JSON.stringify({ active: true, email: 't@t.com' })); localStorage.setItem('ht3', JSON.stringify(s)); }, ST(type));
  await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(1500);
  await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#pro-offer-modal{display:none!important}' });
  await p.evaluate(() => showTab('house')); await p.waitForTimeout(4500);
  return { ctx, p };
}
(async () => {
  const b = await chromium.launch(); const errs = [];
  // a) caption follows the selected type, even while the viewer still holds the previous house
  { const { ctx, p } = await open(b, 884, 'apartment', errs);
    ok(await p.evaluate(() => /Residential tower/.test(document.getElementById('hb3d-cap').textContent)), 'a: apartment selected shows the tower caption');
    const r = await p.evaluate(() => { state.houseType = 'terraced'; state.target = state.prices.terraced; HB3DAPP.want = hbSceneMode(); hb3dPlaceOverlays(); return document.getElementById('hb3d-cap').textContent; });
    ok(!/Residential tower|floor \d+ of|lighter/.test(r), 'a: terraced selected while the viewer still holds the tower: caption does not name the tower (' + r.slice(0, 50) + ')');
    await p.evaluate(() => { updateUI(); }); await p.waitForTimeout(2500);
    const r2 = await p.evaluate(() => document.getElementById('hb3d-cap').textContent);
    ok(/Victorian mid-terrace/.test(r2) && !/tower/i.test(r2), 'a: once the terraced house is drawn the caption names it (' + r2.slice(0, 40) + ')');
    await ctx.close(); }
  // b) Level 1 never sticks on "Counting bricks…" / "… OF … UK BRICKS": when the model lands after the HUD's own retries ran out, the HUD still updates
  { const { ctx, p } = await open(b, 390, 'terraced', errs);
    await p.evaluate(() => { window.requestIdleCallback = function () { return 0; }; HB3DAPP.models = {}; HB3DAPP.order = []; HB3DAPP.idle = {}; window._hbHudTries = 0; for (let i = 0; i < 40; i++) hbRenderHUD(); });
    ok(await p.evaluate(() => /Counting bricks/.test(document.getElementById('hb-hud').textContent)), 'b: with no model yet the HUD says "Counting bricks…"');
    await p.evaluate(() => { clearTimeout(window._hbHudRetry); hb3dModel(state.houseType, state.apartmentFloor); }); await p.waitForTimeout(800);
    const t = await p.evaluate(() => document.getElementById('hb-hud').textContent);
    ok(!/Counting bricks/.test(t) && !/…\s*of\s*…/i.test(t) && /UK bricks/i.test(t) && /\d,\d{3}\s*of\s*[\d,]+\s*UK bricks/i.test(t), 'b: the moment the model is built the HUD shows the real count (' + t.replace(/\s+/g, ' ').match(/.{0,20}UK bricks/i) + ')');
    await ctx.close(); }
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
