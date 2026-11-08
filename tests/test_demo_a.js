// vault-it.co/demo-a (owner, 8 Nov 2026): the Worker sends the visitor to the app as ?demo=alex. Whatever the browser held, it
// comes up signed in as the Alex Morgan sample (£57k, semi-detached deposit, freelance consulting) on the dashboard with no
// wizard and no sign-in, every tab populated, and a reload keeps it. Run: node tests/test_demo_a.js
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
const { chromium } = require('playwright');
const APP = process.env.VI_APP || require('./lib/vi').FILE_URL;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const OLD = { vi_user: { name: 'Priya Real', email: 'priya@example.com' }, vi_session: { email: 'priya@example.com', expiry: Date.now() + 3600e3 },
  pos_al1: { otherAssets: [{ id: 1, name: 'Rolex watch', value: 4200 }] }, pos_ov1: { income: [{ id: 1, name: 'Wages', amount: 1900 }], expenses: [] },
  vi_declined_demo: 'true', 'sb-abc-auth-token': { access_token: 'x' } };
const vis = (p, id) => p.evaluate(id => { const e = document.getElementById(id); return !!e && getComputedStyle(e).display !== 'none'; }, id);
const read = p => p.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });
const settled = async p => { await p.waitForFunction(() => !/demo=alex/.test(location.search) && localStorage.getItem('vi_demo_variant') === 'a' && typeof initDemoMode === 'function', null, { timeout: 60000 }); await p.waitForTimeout(2000); };
(async () => {
  const b = await chromium.launch();
  for (const w of [390, 1100]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: w < 600, hasTouch: w < 600 });
    await ctx.route(u => /^https?:/.test(u.href) && !/127\.0\.0\.1|localhost/.test(u.href), r => r.abort());   // offline, as in CI
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(old => { if (!/[?&]demo=alex/.test(location.search) || sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
      for (const k in old) localStorage.setItem(k, typeof old[k] === 'string' ? old[k] : JSON.stringify(old[k])); }, OLD);
    const t = w + 'px: ';
    try { await p.goto(APP + '?demo=alex'); } catch (e) { if (!/interrupted|ERR_ABORTED/.test(e.message)) throw e; }
    await settled(p);
    let ls = await read(p); const all = Object.values(ls).join('|');
    ok(!/Priya Real|Rolex watch|priya@example/.test(all) && !ls['sb-abc-auth-token'] && !ls.vi_declined_demo, t + 'the browser\'s earlier data and sign-in are gone');
    ok(/Alex Morgan/.test(ls.vi_user || '') && ls.vi_demo_mode === 'true' && /demo@vault-it\.app/.test(ls.vi_session || ''), t + 'signed in as the Alex Morgan sample in demo mode');
    ok(!/demo=alex/.test(p.url()), t + 'the address is clean after the launch (' + p.url().replace(/^.*\//, '/') + ')');
    ok(!(await vis(p, 'login-overlay')) && !(await vis(p, 'welcome-overlay')) && await vis(p, 'demo-chip'), t + 'no sign-in, no wizard, the demo chip shows');
    const d = await p.evaluate(() => ({
      inc: (ovState.income || []).reduce((s, i) => s + (+i.amount || 0), 0), exp: (ovState.expenses || []).length, snaps: (ovState.snapshots || []).length,
      house: JSON.parse(localStorage.getItem('ht3')), jr: JSON.parse(localStorage.getItem('pos_journey')).profile.monthlyTakeHome,
      al: JSON.parse(localStorage.getItem('pos_al1')), debts: JSON.parse(localStorage.getItem('pos_debt1')).debts, biz: JSON.parse(localStorage.getItem('pos_biz1'))
    }));
    ok(d.inc === 4835 && d.exp >= 17 && d.snaps === 8, t + 'Overview: £57k salary (£3,635) + £1,200 consulting, ' + d.exp + ' spending lines, ' + d.snaps + ' months of history');
    ok(d.house.saved === 18500 && d.house.target === 320000 && d.house.houseType === 'semi' && d.house.deposits.reduce((s, x) => s + x.amount, 0) === 18500, t + 'House Builder: semi-detached £320k, £18,500 saved, deposits add up');
    ok(d.jr === 3635, t + 'Journey: take-home £3,635');
    ok(d.al.cashAccounts.length === 2 && d.al.stocks.length === 2 && d.al.liabilities.length === 1, t + 'Assets & liabilities: cash, stocks, metals, crypto, car, car finance');
    ok(d.debts.length === 2 && d.debts[0].name === 'Student Loan Plan 2', t + 'Debt tracker: student loan + card');
    ok(d.biz.clients.length === 2 && d.biz.leads.length === 3 && d.biz.incomeStreams.length === 2 && d.biz.streams.length === 1, t + 'Entrepreneur: 2 clients, 3 leads, 2 income streams');
    // every tab draws something from the sample
    const tabs = { overview: '#tab-overview', budget: '#tab-budget', house: '#tab-house', assets: '#tab-assets', debt: '#tab-debt', biz: '#tab-biz', achievements: '#tab-achievements', network: '#tab-network' };
    for (const tb in tabs) {
      await p.evaluate(x => showTab(x), tb); await p.waitForTimeout(600);
      const r = await p.evaluate(sel => { const e = document.querySelector(sel); return { on: !!e && getComputedStyle(e).display !== 'none', txt: (e && e.innerText || '').replace(/\s+/g, ' ').trim() }; }, tabs[tb]);
      const mark = { overview: /£/, budget: /£/, house: /18,500|320,000|semi/i, assets: /Marcus|Vanguard|Honda/, debt: /Student Loan Plan 2|Barclaycard/, biz: /Northgate Health|Nova Retail|1,200/, achievements: /XP|Level|[1-9]\d* ?\/ ?\d+/, network: /./ }[tb];
      ok(r.on && r.txt.length > 40 && mark.test(r.txt), t + tb + ' tab is shown with sample content (' + r.txt.slice(0, 60) + '…)');
    }
    const bizGate = await vis(p, 'pro-gate-biz');
    ok(!bizGate, t + 'the Entrepreneur tab is open (no Pro gate)');
    // a plain reload keeps Alex on the dashboard
    await p.reload(); await p.waitForFunction(() => typeof initDemoMode === 'function'); await p.waitForTimeout(2000);
    ls = await read(p);
    ok(/Alex Morgan/.test(ls.vi_user || '') && ls.vi_demo_variant === 'a' && !(await vis(p, 'login-overlay')) && !(await vis(p, 'welcome-overlay')), t + 'after a reload: still Alex, still no sign-in or wizard');
    // "Start with your own data" leaves demo-a behind
    await p.evaluate(() => _wipeDemoData()); ls = await read(p);
    ok(!ls.vi_demo_variant && !ls.vi_demo_mode && !/Alex Morgan/.test(ls.vi_user || ''), t + 'start with your own data clears the sample and the demo-a marker');
    ok(errs.length === 0, t + 'no page errors ' + errs.slice(0, 2));
    await ctx.close();
  }
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
