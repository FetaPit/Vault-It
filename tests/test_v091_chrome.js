// v0.9.1 chrome (chunk v09x/chrome): E1 rotating V mark, E2 bigger desktop nav, E24 pinned Assets sub-menu, E27 Message the Dev on the
// dashboard only, sidebar summary colours, E25 crowdfund Vaulter card (prices from VI_PLANS) and the Founding badge (N left, from real counts).
// Run: node tests/test_v091_chrome.js
const { chromium } = require('playwright');
const INDEX = 'file://' + (process.env.VI_INDEX || '/home/user/Vault-It/index.html');   // VI_INDEX points the test at another checkout
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const SUBS = ['cash', 'stocks', 'metals', 'other', 'crypto', 'liabilities'];
const seed = ({ t, neg }) => {
  localStorage.setItem('vi-theme', t); localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi-tour-done', '1');
  localStorage.setItem('pos_ov1', JSON.stringify({ income: [{ id: 1, name: 'Salary', amount: neg ? 500 : 3200, cat: 'salary' }],
    expenses: [{ id: 2, name: 'Rent', amount: 1100, type: 'ce' }, { id: 3, name: 'Food', amount: 400, type: 've' }] }));
};
const HIDE = '#welcome-overlay,#login-overlay,#sync-banner,#pro-offer-modal,#trial-banner,#tester-welcome,#vi-fb-nudge,#demo-chip,#pwa-install-banner{display:none!important}';
const open = async (b, w, h, theme, o = {}) => {
  const phone = w < 600;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: phone, hasTouch: phone, colorScheme: theme === 'light' ? 'light' : 'dark', reducedMotion: o.rm ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  const rpc = o.rpc === undefined ? 'fail' : o.rpc;   // campaign_counts is always routed: aborted by default (no counts), or the rows the case wants, so the test never depends on the live server
  await p.route('**/rest/v1/rpc/campaign_counts', r => rpc === 'fail' ? r.abort() : r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rpc) }));
  await p.addInitScript(seed, { t: theme, neg: !!o.neg });
  await p.goto(INDEX); await p.waitForTimeout(1600);
  await p.addStyleTag({ content: HIDE });
  return p;
};
(async () => {
  const b = await chromium.launch();
  for (const theme of ['dark', 'light']) for (const [w, h] of [[1440, 900], [1100, 900], [768, 900], [390, 844], [320, 700]]) {
    const p = await open(b, w, h, theme); const T = w + ' ' + theme + ': ';
    // E1: the rotating mark
    const m = await p.evaluate(() => { const mk = document.querySelector('#topnav .vi-mark'); const vis = [...mk.querySelectorAll('svg')].find(s => s.getBoundingClientRect().width > 0);
      const r = vis.getBoundingClientRect(); const tk = vis.querySelector('.ticks');
      return { w: Math.round(r.width), ticks: !!tk, ang: window.viMarkDial, hdr: Math.round(document.getElementById('topnav').getBoundingClientRect().height), tr: tk && getComputedStyle(tk).transform }; });
    const want = w >= 1024 ? 44 : w >= 600 ? 36 : 28;
    ok(m.ticks && m.w === want, T + 'header mark is the dial icon at ' + want + ' px (got ' + m.w + ', ticks ' + m.ticks + ')');
    ok(m.ang !== 0 && m.tr && m.tr !== 'none', T + 'the dial has turned once on load (' + m.ang + ')');   // R1 round 2: it now swings left and right by varying degrees (see test_v091r2_chrome)
    await p.evaluate(() => showTab('budget')); const a0 = await p.evaluate(() => window.viMarkDial);
    await p.click('#topnav .nav-brand'); await p.waitForTimeout(1000);
    const a1 = await p.evaluate(() => ({ a: window.viMarkDial, ov: document.getElementById('tab-overview').classList.contains('active') }));
    ok(a1.a !== a0 && Math.abs(a1.a) <= 60 && a1.ov, T + 'a click swings the dial and still goes to Overview (' + a0 + ' to ' + a1.a + ')');

    // E2: bigger desktop nav
    const n = await p.evaluate(() => { const ic = document.querySelector('#topnav .tab-btn .vi-ic.ti'), lb = document.querySelector('#topnav .tab-btn .nav-tab-label'), tp = document.getElementById('topnav'), t = document.getElementById('vi-tabs');
      return { ic: Math.round(ic.getBoundingClientRect().width), fs: lb ? parseFloat(getComputedStyle(lb).fontSize) : 0, one: document.body.classList.contains('vi-nav1') || document.body.classList.contains('vi-nav1t'),
        h: Math.round(tp.getBoundingClientRect().height), tabsFit: t.scrollWidth <= t.clientWidth + 1, hv: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--vi-hdr-h')) || 0,
        sb: parseFloat(getComputedStyle(document.getElementById('left-sidebar')).top) }; });
    if (w >= 1280) ok(n.ic === 24 && n.tabsFit && n.fs >= 12.4 && n.h <= 117, T + 'tab icon 24, labels 12.5 px, all seven tabs visible, header at most 117 px (icon ' + n.ic + ', font ' + n.fs + ', header ' + n.h + ', fit ' + n.tabsFit + ')');
    else if (w >= 1100) ok(n.ic === 22 && n.tabsFit && n.fs >= 11.4 && n.h <= 109, T + 'tab icon 22, labels 11.5 px, all seven tabs visible, header at most 109 px (icon ' + n.ic + ', font ' + n.fs + ', header ' + n.h + ', fit ' + n.tabsFit + ')');
    else if (w < 600) ok(n.ic === 22, T + 'phone icons stay 22 px (' + n.ic + ')');
    ok(Math.abs(n.hv - n.h) <= 1, T + '--vi-hdr-h follows the real header height (' + n.hv + ' vs ' + n.h + ')');
    ok(Math.abs(n.sb - n.h) <= 1, T + 'left sidebar starts under the header (' + n.sb + ' vs ' + n.h + ')');

    // E24: Assets sub-menu pinned
    await p.evaluate(() => showTab('assets')); await p.waitForTimeout(300);
    const bad = [];
    for (const s of SUBS) {
      await p.evaluate(s2 => { showSubtab('assets', s2, document.querySelector('.subtab-btn[data-sub=' + s2 + ']')); scrollTo(0, 0); }, s); await p.waitForTimeout(250);
      await p.evaluate(() => { const pg = document.getElementById('assets-page'); let sp = document.getElementById('v091-spacer'); if (!sp) { sp = document.createElement('div'); sp.id = 'v091-spacer'; pg.appendChild(sp); } sp.style.height = '2400px'; });
      await p.evaluate(() => scrollTo(0, 1500)); await p.waitForTimeout(200);
      const r = await p.evaluate(() => { const nv = document.querySelector('#assets-page .subtab-nav'), bs = [...nv.querySelectorAll('.subtab-btn')], h = document.getElementById('topnav').getBoundingClientRect(), r = nv.getBoundingClientRect(), bo = bs.map(x => x.getBoundingClientRect());
        return { top: Math.round(r.top), hb: Math.round(h.bottom), scrolled: scrollY, rows: new Set(bo.map(x => Math.round(x.top))).size, minW: Math.min(...bo.map(x => x.width)), minH: Math.min(...bo.map(x => x.height)), inView: bo.every(x => x.bottom <= innerHeight && x.top >= r.top - 1),
          bg: getComputedStyle(nv).backgroundColor, pos: getComputedStyle(nv).position, sx: document.documentElement.scrollWidth - innerWidth, z: +getComputedStyle(nv).zIndex || 0,
          lbl: bs.map(x => { const sp = x.querySelector('span'); return sp && sp.getBoundingClientRect().width > 0; }), aria: bs.every(x => x.getAttribute('aria-label') && x.getAttribute('title')) }; });
      if (r.scrolled < 1000 || r.pos !== 'sticky' || Math.abs(r.top - r.hb) > 1 || !r.inView || /rgba?\(0, 0, 0, 0\)/.test(r.bg) || r.sx > 0 || r.z >= 500) bad.push(s + ' ' + JSON.stringify(r));
      if (w < 600 && (r.rows !== 1 || r.minW < 44 || r.minH < 44 || r.lbl.some(Boolean) || !r.aria)) bad.push(s + ' phone ' + JSON.stringify(r));
      if (w >= 600 && !r.lbl.every(Boolean)) bad.push(s + ' labels hidden ' + JSON.stringify(r));
    }
    ok(!bad.length, T + 'six sub-tabs stay pinned under the header after scrolling 1500 px, no sideways scroll ' + bad.slice(0, 2).join('; '));
    // E24b: the sub-menu icons are big and crisp enough to read (owner: "too low fidelity")
    const ico = await p.evaluate(() => { const i = document.querySelector('#assets-page .subtab-btn .vi-ic.sti'); return { w: Math.round(i.getBoundingClientRect().width), o: getComputedStyle(i).opacity }; });
    if (w < 600) ok(ico.w === 30 && ico.o === '1', T + 'phone sub-menu icons 30 px at full opacity (' + JSON.stringify(ico) + ')');
    else if (w < 1100) ok(ico.w === 26 && ico.o === '1', T + 'tablet sub-menu icons 26 px at full opacity (' + JSON.stringify(ico) + ')');
    if (w >= 1100) { const d = await p.evaluate(() => { const i = document.querySelector('#assets-page .subtab-btn .vi-ic.sti'), bt = document.querySelector('#assets-page .subtab-btn'); return [Math.round(i.getBoundingClientRect().width), Math.round(bt.getBoundingClientRect().height)]; });
      ok(d[0] === 24 && d[1] >= 44, T + 'desktop sub-menu icons 24 px in 44 px buttons (' + d + ')'); }
    // type floor and tap size (Pedro): sidebar labels, crowdfund labels, USP / PRO pills at least 10.5 px; crowdfund close 44 px
    const ty = await p.evaluate(() => { if (!document.getElementById('left-sidebar').classList.contains('open')) toggleSidebar(); viShowCampaign(); const fs = sel => Math.min(...[...document.querySelectorAll(sel)].filter(e => getComputedStyle(e).display !== 'none').map(e => parseFloat(getComputedStyle(e).fontSize)));
      const c = document.querySelector('.vi-camp-close').getBoundingClientRect(); document.getElementById('vi-campaign-modal').classList.add('hidden');
      return { sb: fs('.sb-label'), camp: fs('#vi-campaign-modal .vi-camp-eyebrow,#vi-campaign-modal .vi-camp-tier-badge'), pill: fs('#topnav .vi-usp,#topnav .vi-pro'), cw: Math.round(c.width), ch: Math.round(c.height) }; });
    ok(ty.sb >= 10.5 && ty.camp >= 10.5 && ty.pill >= 10.5 && ty.cw >= 44 && ty.ch >= 44, T + 'labels and pills at least 10.5 px, crowdfund close 44 px (' + JSON.stringify(ty) + ')');
    // tapping a sub-tab keeps the new panel's top in view under the bar
    await p.evaluate(() => scrollTo(0, 1500)); await p.waitForTimeout(150);
    await p.click('.subtab-btn[data-sub=crypto]'); await p.waitForTimeout(500);
    const tap = await p.evaluate(() => { const nv = document.querySelector('#assets-page .subtab-nav').getBoundingClientRect(), pn = document.getElementById('assets-crypto').getBoundingClientRect(); return { on: document.getElementById('assets-crypto').classList.contains('active'), gap: Math.round(pn.top - nv.bottom) }; });
    ok(tap.on && tap.gap >= -1 && tap.gap < 200, T + 'tapping Crypto switches and the panel starts under the bar (' + JSON.stringify(tap) + ')');

    // E27: the Message the Dev card is on the dashboard only
    const dev = await p.evaluate(() => { const out = {}; for (const t of ['budget', 'house', 'assets', 'debt', 'biz', 'achievements', 'network', 'overview']) { showTab(t); out[t] = document.querySelectorAll('#vi-devcard').length; }
      const c = document.getElementById('vi-devcard'); out.inOv = !!c && document.getElementById('tab-overview').contains(c); out.last = !!c && c.parentElement.lastElementChild === c; return out; });
    ok(['budget', 'house', 'assets', 'debt', 'biz', 'achievements', 'network'].every(t => dev[t] === 0) && dev.overview === 1 && dev.inOv && dev.last, T + 'Message the Dev only in Overview, last block, absent elsewhere ' + JSON.stringify(dev));

    // sidebar colours
    if (w === 1100 || w === 390) {
      await p.evaluate(() => { showTab('overview'); if (!document.getElementById('left-sidebar').classList.contains('open')) toggleSidebar(); viRenderLedger(); }); await p.waitForTimeout(300);
      const c = await p.evaluate(() => { const col = v => { const e = document.createElement('i'); e.style.color = 'var(' + v + ')'; document.body.appendChild(e); const r = getComputedStyle(e).color; e.remove(); return r; };
        const g = id => { const row = document.getElementById(id).closest('.sb-row'); return { v: getComputedStyle(document.getElementById(id)).color, l: getComputedStyle(row.querySelector('.sb-lg-l')).color }; };
        return { teal: col('--teal'), green: col('--green'), blue: col('--blue'), nw: g('sb-nw'), as: g('sb-assets'), su: g('sb-surplus'), su2: g('sb-surplus-2'), sr: g('sb-savings-rate') }; });
      ok(c.as.v === c.green && c.as.l === c.green, T + 'Total assets is green');
      ok(c.su.v === c.blue && c.su.l === c.blue && c.su2.v === c.blue && c.sr.v === c.blue, T + 'Monthly surplus, Surplus and Savings rate are blue');
      ok(c.nw.v === c.teal && c.nw.l === c.teal, T + 'Net worth is teal');
    }

    // E25: crowdfund Vaulter card
    const camp = await p.evaluate(() => { const orig = window.open; window.__opened = []; window.open = u => { window.__opened.push(u); return null; };
      viShowCampaign(); const card = [...document.querySelectorAll('#vi-campaign-modal .vi-camp-tier')].find(x => /Vaulter/.test(x.textContent)); const txt = card.innerText.replace(/\s+/g, ' ');
      const P = VI_PLANS.monthly; const f = v => '£' + v.toFixed(2);
      const out = { ok: txt.indexOf(f(P.price) + ' a month after the 30-day free trial; ' + f(P.tester) + ' for testers and early adopters') >= 0, txt: txt.slice(0, 160) };
      VI_PLANS.monthly.price = 6.49; VI_PLANS.monthly.tester = 4.49; viShowCampaign(); out.live = document.querySelector('#vi-campaign-modal').innerText.replace(/\s+/g, ' ').indexOf('£6.49 a month after the 30-day free trial; £4.49 for testers') >= 0;
      VI_PLANS.monthly.price = P.price; VI_PLANS.monthly.tester = P.tester;
      const cta = [...card.querySelectorAll('button')].pop(); localStorage.removeItem('vi_beta'); cta.click(); out.tester = window.__opened[0]; localStorage.setItem('vi_beta', 'false'); cta.click(); out.full = window.__opened[1]; localStorage.removeItem('vi_beta');
      out.links = [VI_STRIPE_LINKS.monthly_tester, VI_STRIPE_LINKS.monthly]; out.badge = document.getElementById('camp-founder-slots').textContent; out.stats = !!document.querySelector('#vi-campaign-modal .vi-camp-stats'); return out; });
    ok(camp.ok, T + 'Vaulter card reads the owner\'s sentence ' + camp.txt);
    ok(camp.live, T + 'both prices come from VI_PLANS (change them and the card follows)');
    ok(camp.tester && camp.tester.indexOf(camp.links[0]) === 0 && camp.full && camp.full.indexOf(camp.links[1]) === 0, T + 'the button opens the existing tester link, or the full-price link when not a tester');
    ok(camp.badge === '100 places' && !camp.stats, T + 'no counts yet: the Founding badge says "100 places" and the backer and funded stats are gone (' + camp.badge + ')');
    ok(!p.errs.length, T + 'no page errors ' + p.errs.slice(0, 2).join('; '));
    await p.context().close();
  }
  // E25: counts come from the real aggregate function
  { const p = await open(b, 1100, 900, 'dark', { rpc: [{ plan: 'monthly', backers: 2 }, { plan: 'yearly', backers: 1 }, { plan: 'founder', backers: 3 }] });
    await p.evaluate(() => viShowCampaign()); await p.waitForTimeout(800);
    const r = await p.evaluate(() => document.getElementById('camp-founder-slots').textContent);
    ok(r === '97 left', 'E25 3 real founding backers (plus 2 monthly and 1 yearly, which do not count) show "97 left" (' + r + ')');
    await p.context().close(); }
  { const p = await open(b, 1100, 900, 'dark', { rpc: [] });
    await p.evaluate(() => viShowCampaign()); await p.waitForTimeout(800);
    const r = await p.evaluate(() => document.getElementById('camp-founder-slots').textContent);
    ok(r === '100 left', 'E25 the server answers with no paid accounts: "100 left" (' + r + ')'); await p.context().close(); }
  { const p = await open(b, 1100, 900, 'dark', { rpc: 'fail' });
    await p.evaluate(() => viShowCampaign()); await p.waitForTimeout(800);
    const r = await p.evaluate(() => document.getElementById('camp-founder-slots').textContent);
    ok(r === '100 places', 'E25 function not live yet: "100 places", nothing invented (' + r + ')'); await p.context().close(); }
  // negative surplus turns red
  { const p = await open(b, 1100, 900, 'dark', { neg: true });
    await p.evaluate(() => { if (!document.getElementById('left-sidebar').classList.contains('open')) toggleSidebar(); viRenderLedger(); });
    const r = await p.evaluate(() => { const e = document.createElement('i'); e.style.color = 'var(--red)'; document.body.appendChild(e); const red = getComputedStyle(e).color; return [red, getComputedStyle(document.getElementById('sb-surplus')).color, getComputedStyle(document.getElementById('sb-surplus-2')).color]; });
    ok(r[1] === r[0] && r[2] === r[0], 'a negative monthly surplus is red'); await p.context().close(); }
  // reduced motion: no turn, static
  { const p = await open(b, 1100, 900, 'dark', { rm: true });
    const r = await p.evaluate(() => { const tk = document.querySelector('#topnav .vi-mark svg .ticks'); return { ang: window.viMarkDial || 0, tr: getComputedStyle(tk).transform, trans: getComputedStyle(tk).transitionDuration }; });
    await p.click('#topnav .nav-brand'); await p.waitForTimeout(300);
    const r2 = await p.evaluate(() => getComputedStyle(document.querySelector('#topnav .vi-mark svg .ticks')).transform);
    ok(r.ang === 0 && (r.tr === 'none' || r.tr === 'matrix(1, 0, 0, 1, 0, 0)') && (r2 === 'none' || r2 === 'matrix(1, 0, 0, 1, 0, 0)'), 'reduced motion: the dial never turns (' + JSON.stringify(r) + ' ' + r2 + ')'); await p.context().close(); }
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
