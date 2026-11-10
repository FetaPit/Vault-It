// vault-it.co/demo-a (owner, 8 Nov 2026): the Worker sends the visitor to the app as ?demo=alex. An empty browser comes up as the
// Alex Morgan sample (£57k, semi-detached deposit, freelance consulting) on the dashboard with no wizard and no sign-in, every tab
// populated, and a reload keeps it. A browser that already holds someone's data or a sign-in keeps every key exactly as it was
// (owner, 8 Nov: "do not allow any wiping of data ... retention of user data if they are already registered"), opens as usual and is
// told once how to see the demo. A browser already on the sample is topped up, never cleared. Run: node tests/test_demo_a.js
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
const { chromium } = require('playwright');
const APP = process.env.VI_APP || require('./lib/vi').FILE_URL;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
// a registered browser: a profile, a live session, saved positions, an earlier "no thanks" to the demo and a Supabase sign-in
const OLD = { vi_user: { name: 'Tee Tester', email: 't@t.com' }, vi_session: { email: 't@t.com', expiry: Date.now() + 3600e3 },
  pos_al1: { otherAssets: [{ id: 1, name: 'Rolex watch', value: 4200 }] }, pos_ov1: { income: [{ id: 1, name: 'Wages', amount: 1900 }], expenses: [] },
  vi_declined_demo: 'true', 'sb-abc-auth-token': { access_token: 'x' } };
// a browser already on an older sample (opened app.vault-it.co before and never signed up)
const SAMPLE = { vi_demo_mode: 'true', vi_user: { name: 'Sam Sample', email: 'demo@vault-it.app' }, pos_al1: { otherAssets: [{ id: 1, name: 'Old sample watch', value: 100 }] } };
const str = v => typeof v === 'string' ? v : JSON.stringify(v);
// the app itself counts logins in vi_user and refreshes vi_session's expiry on every boot, so those two are compared by what matters
const sameKey = (ls, k) => {
  if (k === 'vi_user') { const u = JSON.parse(ls[k] || 'null'); return !!u && u.name === OLD.vi_user.name && u.email === OLD.vi_user.email; }
  if (k === 'vi_session') { const s = JSON.parse(ls[k] || 'null'); return !!s && s.email === OLD.vi_session.email && s.expiry >= OLD.vi_session.expiry; }
  return ls[k] === str(OLD[k]);
};
const vis = (p, id) => p.evaluate(id => { const e = document.getElementById(id); return !!e && getComputedStyle(e).display !== 'none'; }, id);
const read = p => p.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });
const text = p => p.evaluate(() => document.body.innerText);
const open = async (p, url) => { try { await p.goto(url); } catch (e) { if (!/interrupted|ERR_ABORTED/.test(e.message)) throw e; } };
const clean = async p => { await p.waitForFunction(() => !/demo=alex/.test(location.search) && typeof initDemoMode === 'function', null, { timeout: 60000 }); await p.waitForTimeout(2000); };
const fresh = async (b, w, seed) => {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: w < 600, hasTouch: w < 600 });
  await ctx.route(u => /^https?:/.test(u.href) && !/127\.0\.0\.1|localhost/.test(u.href), r => r.abort());   // offline, as in CI
  if (seed) await ctx.addInitScript(old => { if (!/[?&]demo=alex/.test(location.search) || sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    for (const k in old) localStorage.setItem(k, typeof old[k] === 'string' ? old[k] : JSON.stringify(old[k])); }, seed);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  return { ctx, p, errs };
};
(async () => {
  const b = await chromium.launch();
  for (const w of [390, 1100]) {
    const t = w + 'px: ';
    // 1. An empty browser gets the Alex Morgan sample on the dashboard
    { const { ctx, p, errs } = await fresh(b, w, null);
      await open(p, APP + '?demo=alex'); await clean(p);
      let ls = await read(p);
      ok(/Alex Morgan/.test(ls.vi_user || '') && ls.vi_demo_mode === 'true' && ls.vi_demo_variant === 'a' && /demo@vault-it\.app/.test(ls.vi_session || ''), t + 'empty browser: signed in as the Alex Morgan sample in demo mode');
      ok(!/demo=alex/.test(p.url()), t + 'empty browser: the address is clean after the launch (' + p.url().replace(/^.*\//, '/') + ')');
      ok(!(await vis(p, 'login-overlay')) && !(await vis(p, 'welcome-overlay')) && await vis(p, 'demo-chip'), t + 'empty browser: no sign-in, no wizard, the demo chip shows');
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
      ok(!(await vis(p, 'pro-gate-biz')), t + 'the Entrepreneur tab is open (no Pro gate)');
      // a plain reload keeps Alex on the dashboard
      await p.reload(); await p.waitForFunction(() => typeof initDemoMode === 'function'); await p.waitForTimeout(2000);
      ls = await read(p);
      ok(/Alex Morgan/.test(ls.vi_user || '') && ls.vi_demo_variant === 'a' && !(await vis(p, 'login-overlay')) && !(await vis(p, 'welcome-overlay')), t + 'after a reload: still Alex, still no sign-in or wizard');
      // "Start with your own data" leaves demo-a behind
      await p.evaluate(() => _wipeDemoData()); ls = await read(p);
      ok(!ls.vi_demo_variant && !ls.vi_demo_mode && !/Alex Morgan/.test(ls.vi_user || ''), t + 'start with your own data clears the sample and the demo-a marker');
      ok(errs.length === 0, t + 'empty browser: no page errors ' + errs.slice(0, 2));
      await ctx.close(); }
    // 2. A browser with its own data and sign-in keeps every key and opens as usual
    { const { ctx, p, errs } = await fresh(b, w, OLD);
      await open(p, APP + '?demo=alex'); await clean(p);
      const ls = await read(p);
      const changed = Object.keys(OLD).filter(k => !sameKey(ls, k));
      ok(changed.length === 0, t + 'registered browser: every saved key is exactly as it was' + (changed.length ? ' (changed: ' + changed.join(', ') + ')' : ''));
      ok(ls.vi_demo_mode !== 'true' && !ls.vi_demo_variant && !ls.vi_demo_launch && !/Alex Morgan/.test(ls.vi_user || '') && !ls.pos_biz1, t + 'registered browser: no demo mode, no sample seeded');
      ok(!/demo=alex/.test(p.url()), t + 'registered browser: the address is clean (' + p.url().replace(/^.*\//, '/') + ')');
      ok(!(await vis(p, 'login-overlay')) && !(await vis(p, 'welcome-overlay')) && !(await vis(p, 'demo-chip')), t + 'registered browser: opens signed in as usual, no demo chip');
      ok(/own data was kept/i.test(await text(p)), t + 'registered browser: told once that the data was kept and how to see the demo');
      await p.reload(); await p.waitForFunction(() => typeof initDemoMode === 'function'); await p.waitForTimeout(1500);
      ok(!/own data was kept/i.test(await text(p)), t + 'registered browser: the notice does not come back on a plain reload');
      const ls2 = await read(p);
      ok(Object.keys(OLD).every(k => sameKey(ls2, k)), t + 'registered browser: still every key as it was after the reload');
      ok(errs.length === 0, t + 'registered browser: no page errors ' + errs.slice(0, 2));
      await ctx.close(); }
    // 3. A browser already on the sample is topped up, nothing removed
    { const { ctx, p, errs } = await fresh(b, w, SAMPLE);
      await open(p, APP + '?demo=alex'); await clean(p);
      const ls = await read(p);
      ok(ls.pos_al1 === str(SAMPLE.pos_al1) && /Sam Sample/.test(ls.vi_user || ''), t + 'sample browser: nothing removed (old sample watch and persona still there)');
      ok(ls.vi_demo_mode === 'true' && ls.vi_demo_variant === 'a' && !!ls.pos_biz1 && !!ls.ht3 && /demo@vault-it\.app/.test(ls.vi_session || ''), t + 'sample browser: topped up as demo-a with a demo session');
      ok(!/demo=alex/.test(p.url()) && !(await vis(p, 'login-overlay')) && !(await vis(p, 'welcome-overlay')) && await vis(p, 'demo-chip'), t + 'sample browser: dashboard, no sign-in or wizard, demo chip');
      ok(errs.length === 0, t + 'sample browser: no page errors ' + errs.slice(0, 2));
      await ctx.close(); }
    // 4. A browser with saved data but no profile or sign-in keeps it too (the pre-paint script cannot tell; initDemoMode can)
    { const DATA = { pos_al1: { otherAssets: [{ id: 1, name: 'Rolex watch', value: 4200 }] } };
      const { ctx, p, errs } = await fresh(b, w, DATA);
      await open(p, APP + '?demo=alex'); await clean(p);
      const ls = await read(p);
      ok(ls.pos_al1 === str(DATA.pos_al1) && ls.vi_demo_mode !== 'true' && !ls.vi_demo_variant && !ls.pos_biz1 && !/Alex Morgan/.test(ls.vi_user || ''), t + 'data-only browser: the saved assets are untouched and no sample is seeded');
      ok(!/demo=alex/.test(p.url()) && !(await vis(p, 'demo-chip')), t + 'data-only browser: clean address, no demo chip');
      ok(/own data was kept/i.test(await text(p)), t + 'data-only browser: told once that the data was kept');
      ok(errs.length === 0, t + 'data-only browser: no page errors ' + errs.slice(0, 2));
      await ctx.close(); }
  }
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
