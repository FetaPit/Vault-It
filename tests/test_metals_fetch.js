// Metals live fetch (CoS, 5 Nov 2026): fetchMetalPrices() reads https://api.metals.live/v1/spot/... and sets alState.metalPrices
// (gold, silver, platinum, palladium as USD x 0.79) and lastUpdated; on a failed fetch it toasts and leaves the prices alone.
// The request is stubbed, so this proves the code path, not that metals.live is up. Run: node tests/test_metals_fetch.js
require('./lib/vi');   // serves file:// app URLs over http and maps /home/user/Vault-It onto this checkout (tests/lib/vi.js)
const { chromium } = require('playwright');
const APP = process.env.VI_APP || 'file:///home/user/Vault-It/index.html';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('vi-theme', 'dark'); localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 })); localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com', logins: 3 })); });
  await p.goto(APP); await p.waitForTimeout(1500);
  await p.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
  const R = await p.evaluate(async () => {
    const urls = [], toasts = []; const of = window.fetch, ot = window.showToast;
    window.showToast = m => { toasts.push(String(m)); };
    alState.metalPrices = Object.assign({}, alState.metalPrices, { gold: 1, silver: 2, platinum: 3, palladium: 4, lastUpdated: null });
    window.fetch = u => { urls.push(String(u)); return Promise.resolve(new Response(JSON.stringify([{ gold: 2000 }, { silver: 25 }, { platinum: 1000 }, { palladium: 1200 }]), { status: 200 })); };
    fetchMetalPrices(); await new Promise(r => setTimeout(r, 300));
    const good = { m: JSON.parse(JSON.stringify(alState.metalPrices)), urls: urls.slice(), toast: toasts.slice() };
    const before = JSON.stringify(alState.metalPrices); toasts.length = 0;
    window.fetch = () => Promise.reject(new Error('offline'));
    fetchMetalPrices(); await new Promise(r => setTimeout(r, 300));
    const bad = { same: JSON.stringify(alState.metalPrices) === before, toast: toasts.slice() };
    window.fetch = of; window.showToast = ot; return { good, bad };
  });
  ok(R.good.urls.length === 1 && /^https:\/\/api\.metals\.live\//.test(R.good.urls[0]), 'one request, to api.metals.live (' + R.good.urls.join(',') + ')');
  ok(R.good.m.gold === 1580 && R.good.m.silver === 19.75 && R.good.m.platinum === 790 && R.good.m.palladium === 948, 'gold, silver, platinum and palladium update from the response (USD x 0.79): ' + [R.good.m.gold, R.good.m.silver, R.good.m.platinum, R.good.m.palladium].join(' '));
  ok(!!R.good.m.lastUpdated && Math.abs(Date.now() - Date.parse(R.good.m.lastUpdated)) < 60000, 'lastUpdated is set to now (' + R.good.m.lastUpdated + ')');
  ok(R.good.toast.some(t => /Metal prices updated/.test(t)), 'success toast');
  ok(R.bad.same, 'a failed fetch leaves the prices and lastUpdated unchanged');
  ok(R.bad.toast.some(t => /unavailable/i.test(t) && /manually/i.test(t)), 'failure toast says unavailable, enter manually (' + R.bad.toast.join(' | ') + ')');
  // fallback and auto-refresh kept as on live (owner via CoS, 5 Nov): the old "Metals Live" feed tries metals-api.com with a saved key, and Overview refreshes connected feeds
  const F = await p.evaluate(async () => {
    const urls = [], toasts = []; const of = window.fetch, ot = window.showToast; window.showToast = m => { toasts.push(String(m)); };
    alState.metalPrices = Object.assign({}, alState.metalPrices, { gold: 1, silver: 2, platinum: 3, palladium: 4, lastUpdated: null }); localStorage.setItem('metals_api_key', 'k123');
    window.fetch = u => { urls.push(String(u)); if (/metals\.live/.test(u)) return Promise.reject(new Error('down')); return Promise.resolve(new Response(JSON.stringify({ rates: { XAU: 1 / 2000, XAG: 1 / 25, XPT: 1 / 1000, XPD: 1 / 1200 } }), { status: 200 })); };
    let done = null; fetchMetalsLive(function (ok, msg) { done = [ok, msg]; }); await new Promise(r => setTimeout(r, 400));
    const fb = { urls: urls.slice(), done, gold: alState.metalPrices.gold, stamp: alState.metalPrices.lastUpdated };
    localStorage.removeItem('metals_api_key'); urls.length = 0; let none = null; fetchMetalsLive(function (ok, msg) { none = [ok, msg]; }); await new Promise(r => setTimeout(r, 300));
    const nokey = { urls: urls.slice(), none };
    // Overview refreshes a connected feed
    achState.connected = { metals_live: { ts: 1, live: true } }; urls.length = 0; window.fetch = u => { urls.push(String(u)); return Promise.resolve(new Response('[]', { status: 200 })); };
    showTab('overview'); await new Promise(r => setTimeout(r, 300)); const ov = urls.filter(u => /metals\.live/.test(u)).length;
    localStorage.setItem('vi_live_prices', '0'); urls.length = 0; showTab('budget'); showTab('overview'); await new Promise(r => setTimeout(r, 300)); const off = urls.length; localStorage.removeItem('vi_live_prices');
    window.fetch = of; window.showToast = ot; achState.connected = {}; return { fb, nokey, ov, off };
  });
  ok(F.fb.urls.some(u => /^https:\/\/metals-api\.com\/api\/latest\?access_key=k123/.test(u)) && F.fb.done && F.fb.done[0] === true && F.fb.gold === 1580, 'metals.live down + saved key: falls back to metals-api.com and updates (gold ' + F.fb.gold + ')');
  ok(F.nokey.urls.every(u => !/metals-api/.test(u)) && F.nokey.none && F.nokey.none[0] === false, 'metals.live down and no key: no metals-api request, reports failure');
  ok(F.ov >= 1, 'Overview refreshes a connected Metals Live feed (' + F.ov + ' request)');
  ok(F.off === 0, 'with Live prices Off the Overview does not auto-refresh');
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
