// v0.9.1 data-loss guard (Builder J, 3 Nov 2026): a device that holds saved data must never be booted as an empty device.
// The demo seed may only load when the device holds no saved user data of any kind, and it never writes over a saved key.
// Each case seeds one kind of saved data (no pos_ov1, no vi_user, no vi_declined_demo), boots, reloads twice, at normal speed
// and with a slow startup (CPU throttled, every timer delayed). Run: node tests/test_v091_demo_guard.js
// The app is served over http://127.0.0.1 from the folder that holds VI_INDEX: on file:// headless Chrome sometimes opens a
// page with an empty localStorage, or loses it outright (measured 4 Nov: file:// 4 of 144 page loads, http 0 of 432, same
// load), which no real user meets and which made this kind of test flaky (test_live_value's demo car).
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const FILE = 'file://' + (process.env.VI_INDEX || '/home/user/Vault-It/index.html');
const ROOT = path.dirname(FILE.slice(7)), PAGE = path.basename(FILE.slice(7));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.css': 'text/css', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm' };
const server = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT)) { r.writeHead(403); return r.end(); }
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
let URL = '';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const DEMO = /Alex Morgan|Honda Civic|Marcus Savings|Barclaycard|Student Loan Plan 2|Vanguard S&P 500/;

const CASES = [
  { name: 'only pos_al1 (2 Wealth inventory items)', keys: { pos_al1: { otherAssets: [{ id: 1, name: 'Wedding ring', value: 300 }, { id: 2, name: 'Rolex watch', value: 4200 }] } }, mark: 'Rolex watch' },
  { name: 'only ht3 (house deposit)', keys: { ht3: { saved: 7300, target: 180000, houseType: 'semi', deposits: [{ date: '01/10/2026', amount: 7300 }] } }, mark: '7300' },
  { name: 'only cash accounts', keys: { pos_al1: { cashAccounts: [{ id: 1, name: 'Nationwide easy access', type: 'Savings', balance: 2650, rate: 3.1 }] } }, mark: 'Nationwide easy access' },
  { name: 'only debts', keys: { pos_debt1: { debts: [{ id: 1, name: 'Amex Gold', balance: 940, original: 1500, rate: 29.9, minPay: 30, type: 'credit' }] } }, mark: 'Amex Gold' },
  { name: 'several keys, vi_declined_demo cleared', keys: { pos_al1: { otherAssets: [{ id: 1, name: 'Camera kit', value: 900 }] }, pos_debt1: { debts: [{ id: 1, name: 'Overdraft', balance: 200, rate: 39.9, minPay: 10, type: 'credit' }] }, ht3: { saved: 1200, target: 200000, houseType: 'terraced' } }, mark: 'Camera kit', dropDeclined: true },
  { name: 'only a journey profile', keys: { pos_journey: { profile: { monthlyTakeHome: 2100 }, onboarded: true } }, mark: '2100' }
];

async function boot(b, c, slow) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 } });
  await ctx.route(u => /^https?:/.test(u.href) && !u.href.startsWith(URL.replace(PAGE, '')), r => r.abort());   // offline: no session, no sync, no prices; only the local copy of the app
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  if (slow) {
    const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    await p.addInitScript(() => { const st = window.setTimeout; window.setTimeout = function (f, ms) { const a = [].slice.call(arguments, 2); return st.apply(window, [f, (+ms || 0) + 400].concat(a)); }; });
  }
  // seed only on the first load (?seed), so a reload sees exactly what the app left behind
  await p.addInitScript(([keys, drop]) => { if (!/[?&]seed\b/.test(location.search)) return;
    if (drop) localStorage.setItem('vi_declined_demo', 'true');
    for (const k in keys) localStorage.setItem(k, JSON.stringify(keys[k]));
    if (drop) localStorage.removeItem('vi_declined_demo'); }, [c.keys, !!c.dropDeclined]);
  return { ctx, p, errs };
}
const settle = async (p, slow) => { await p.waitForFunction(() => typeof initDemoMode === 'function', null, { timeout: 60000 }); await p.waitForTimeout(slow ? 4000 : 1500); };
const go = async (p, u) => { try { await p.goto(u); } catch (e) { if (!/interrupted by another navigation|ERR_ABORTED/.test(e.message)) throw e; } };
const read = p => p.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); URL = 'http://127.0.0.1:' + server.address().port + '/' + PAGE;
  const b = await chromium.launch();
  for (const slow of [false, true]) for (const c of CASES) {
    const t = (slow ? 'slow start, ' : '') + c.name + ': ';
    const { ctx, p, errs } = await boot(b, c, slow);
    await go(p, URL + '?seed'); await settle(p, slow);
    for (let r = 0; r < 2; r++) { await go(p, URL); await settle(p, slow); }
    const ls = await read(p);
    const saved = Object.keys(c.keys).map(k => ls[k] || '').join('|');
    ok(Object.keys(c.keys).every(k => !!ls[k]) && saved.indexOf(c.mark) > -1, t + 'saved data is still there after boot and two reloads');
    ok(!DEMO.test(saved), t + 'no demo figures were written over the saved keys');
    ok(ls.vi_demo_mode !== 'true', t + 'the device is not switched into demo mode (vi_demo_mode ' + ls.vi_demo_mode + ')');
    ok(!DEMO.test(ls.pos_ov1 || '') && !/Alex Morgan/.test(ls.vi_user || '') && !(ls.pos_ov1 || '').includes('Side Projects'), t + 'the demo was not seeded into the empty keys either');
    ok(await p.evaluate(() => { const ch = document.getElementById('demo-chip'); return !ch || getComputedStyle(ch).display === 'none'; }), t + 'no demo banner');
    ok(!errs.length, t + 'no page errors ' + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
  // controls: a truly empty device still gets the demo; a device that declined it does not
  for (const [name, seedDeclined, wantDemo] of [['fresh device', false, true], ['declined demo, no data', true, false]]) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 800 } }); await ctx.route(u => /^https?:/.test(u.href) && !u.href.startsWith(URL.replace(PAGE, '')), r => r.abort());
    const p = await ctx.newPage();
    if (seedDeclined) await p.addInitScript(() => { if (/[?&]seed\b/.test(location.search)) localStorage.setItem('vi_declined_demo', 'true'); });
    await go(p, URL + '?seed'); await settle(p, false);
    const ls = await read(p);
    ok((ls.vi_demo_mode === 'true' && /Honda Civic/.test(ls.pos_al1 || '')) === wantDemo, 'control, ' + name + ': demo ' + (wantDemo ? 'loads' : 'stays off') + ' (vi_demo_mode ' + ls.vi_demo_mode + ')');
    await ctx.close();
  }
  await b.close(); server.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
