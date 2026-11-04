// v0.9.1 data-loss guard (Builder J, 3 Nov 2026): a device that holds saved data must never be booted as an empty device.
// The demo seed may only load when the device holds no saved user data of any kind, and it never writes over a saved key.
// Each case seeds one kind of saved data (no pos_ov1, no vi_user, no vi_declined_demo), boots, reloads twice, at normal speed
// and with a slow startup (CPU throttled, every timer delayed). A third pass mimics what Chrome did under load: one reload
// opened with an empty view of localStorage (reads empty, writes still reach the real store; the next load sees it all
// again). The page must write nothing in that view and load again. Run: node tests/test_v091_demo_guard.js
const { chromium } = require('playwright');
const URL = 'file://' + (process.env.VI_INDEX || '/home/user/Vault-It/index.html');
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

async function boot(b, c, slow, blank) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 } });
  await ctx.route(/^https?:/, r => r.abort());   // offline: no session, no sync, no prices
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  if (slow) {
    const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    await p.addInitScript(() => { const st = window.setTimeout; window.setTimeout = function (f, ms) { const a = [].slice.call(arguments, 2); return st.apply(window, [f, (+ms || 0) + 400].concat(a)); }; });
  }
  if (blank) await p.addInitScript(() => {   // ?blank: this one load sees an empty store (not its retry, which carries vi_rt)
    if (!/[?&]blank\b/.test(location.search) || /vi_rt=/.test(location.search)) return;
    const P = Storage.prototype, g = P.getItem, r = P.removeItem, c = P.clear, L = localStorage, live = {};
    const dl = Object.getOwnPropertyDescriptor(P, 'length'), dk = P.key;
    P.getItem = function (k) { return this === L ? (k in live ? live[k] : null) : g.call(this, k); };
    const s = P.setItem; P.setItem = function (k, v) { if (this === L) live[k] = String(v); return s.call(this, k, v); };
    P.removeItem = function (k) { if (this === L) delete live[k]; return r.call(this, k); };
    Object.defineProperty(P, 'length', { configurable: true, get() { return this === L ? Object.keys(live).length : dl.get.call(this); } });
    P.key = function (i) { return this === L ? (Object.keys(live)[i] || null) : dk.call(this, i); };
  });
  // seed only on the first load (?seed), so a reload sees exactly what the app left behind
  await p.addInitScript(([keys, drop]) => { if (!/[?&]seed\b/.test(location.search)) return;
    if (drop) localStorage.setItem('vi_declined_demo', 'true');
    for (const k in keys) localStorage.setItem(k, JSON.stringify(keys[k]));
    if (drop) localStorage.removeItem('vi_declined_demo'); }, [c.keys, !!c.dropDeclined]);
  return { ctx, p, errs };
}
// a page has settled when the app has booted, the saved-data guard is not holding writes and no reload is pending.
// The guard reloads the page itself when Chrome gives it an empty view, so reads before that would see nothing.
const settled = p => p.evaluate(() => typeof initDemoMode === 'function' && !window._viStorageHeld && !window._viDeleted && !document.getElementById('vi-storage-msg'));
const settle = async (p, slow) => {
  const end = Date.now() + 90000;
  while (Date.now() < end) {
    try { await p.waitForLoadState('load'); if (await settled(p)) { await p.waitForTimeout(slow ? 4000 : 1500); if (await settled(p)) return true; } } catch (e) {}
    await p.waitForTimeout(250);
  }
  return false;   // still holding (the guard showed the did-not-load message): this page wrote nothing, but cannot read the store
};
// the final read must come from a page that can see the store: if the tab is stuck on Chrome's empty view, use a new tab
const readable = async (ctx, p, slow) => {
  if (await settle(p, slow)) return p;
  for (let i = 0; i < 3; i++) { const q = await ctx.newPage(); await go(q, URL); if (await settle(q, slow)) return q; }
  return null;
};
const go = async (p, u) => { try { await p.goto(u); } catch (e) { if (!/interrupted by another navigation|ERR_ABORTED/.test(e.message)) throw e; } };
const read = p => p.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });

(async () => {
  const b = await chromium.launch();
  for (const mode of ['', 'slow', 'blank']) for (const c of CASES) {
    const slow = mode === 'slow', blank = mode === 'blank';
    const t = (slow ? 'slow start, ' : blank ? 'empty view on reload, ' : '') + c.name + ': ';
    const { ctx, p, errs } = await boot(b, c, slow, blank);
    await go(p, URL + '?seed'); await settle(p, slow);
    if (blank) { const navs = []; p.on('framenavigated', f => { if (f === p.mainFrame()) navs.push(f.url()); });
      await go(p, URL + '?blank'); await settle(p, false);
      ok(navs.some(u => /vi_rt=1/.test(u)), t + 'the page saw the empty view, wrote nothing and loaded again'); }
    for (let r = 0; r < 2; r++) { await go(p, URL); await settle(p, slow); }
    const rp = await readable(ctx, p, slow);
    ok(!!rp, t + 'a page could read the store again (Chrome kept an empty view in every tab tried)');
    if (!rp) { await ctx.close(); continue; }
    const ls = await read(rp);
    const saved = Object.keys(c.keys).map(k => ls[k] || '').join('|');
    ok(Object.keys(c.keys).every(k => !!ls[k]) && saved.indexOf(c.mark) > -1, t + 'saved data is still there after boot and two reloads');
    ok(!DEMO.test(saved), t + 'no demo figures were written over the saved keys');
    ok(ls.vi_demo_mode !== 'true', t + 'the device is not switched into demo mode (vi_demo_mode ' + ls.vi_demo_mode + ')');
    ok(!DEMO.test(ls.pos_ov1 || '') && !/Alex Morgan/.test(ls.vi_user || '') && !(ls.pos_ov1 || '').includes('Side Projects'), t + 'the demo was not seeded into the empty keys either');
    ok(await rp.evaluate(() => { const ch = document.getElementById('demo-chip'); return !ch || getComputedStyle(ch).display === 'none'; }), t + 'no demo banner');
    ok(!errs.length, t + 'no page errors ' + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
  // controls: a truly empty device still gets the demo; a device that declined it does not
  for (const [name, seedDeclined, wantDemo] of [['fresh device', false, true], ['declined demo, no data', true, false]]) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 800 } }); await ctx.route(/^https?:/, r => r.abort());
    const p = await ctx.newPage();
    if (seedDeclined) await p.addInitScript(() => { if (/[?&]seed\b/.test(location.search)) localStorage.setItem('vi_declined_demo', 'true'); });
    await go(p, URL + '?seed'); await settle(p, false);
    const ls = await read(p);
    ok((ls.vi_demo_mode === 'true' && /Honda Civic/.test(ls.pos_al1 || '')) === wantDemo, 'control, ' + name + ': demo ' + (wantDemo ? 'loads' : 'stays off') + ' (vi_demo_mode ' + ls.vi_demo_mode + ')');
    await ctx.close();
  }
  await b.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
