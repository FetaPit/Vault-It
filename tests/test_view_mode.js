// Simplified / Advanced view (owner, 31 Oct 2026; docs/MONETISATION_DECISION.md section 8):
//   1. no view saved (every account before this change): Advanced, everything shows, no Overview achievements card
//   2. Simplified: Overview hides goals and snapshots, net worth history, cash flow and own and owe; keeps the KPIs, the net worth card
//      and the roadmap; shows the achievements card; the Achievements and Entrepreneur tabs leave the menu
//   3. Budget in Simplified: the Sankey sits at the top, every section starts folded; a section opened stays open; Advanced unfolded
//   4. House in Simplified at Level 1: viewport, Add to your savings and Your house plan; the level card, progress, History and the
//      own-design tools wait for Advanced
//   5. the choice is in vi_settings (synced); Settings shows it; the welcome step starts new accounts Simplified or Advanced as picked
//   6. phones: the five KPIs in two rows (three, then two); the Sankey bands animate, and stop with reduced motion; no sideways scroll
// Run: node tests/test_view_mode.js
const { chromium } = require('playwright');
const APP = process.env.VI_APP || 'file:///home/user/Vault-It/index.html';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const seed = (o) => {
  localStorage.setItem('vi-theme', o.theme || 'dark'); localStorage.setItem('vi-flag-house', '0'); localStorage.setItem('vi_declined_demo', 'true');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com', logins: 3 }));
  localStorage.setItem('pos_ov1', JSON.stringify({ income: [{ id: 1, name: 'Salary', amount: 2400, cat: 'salary' }], expenses: [{ id: 3, name: 'Rent', amount: 700, type: 'ce' }, { id: 4, name: 'Food', amount: 300, type: 've' }, { id: 5, name: 'ISA', amount: 200, type: 'sv' }] }));
  localStorage.setItem('ht3', JSON.stringify({ saved: 30000, target: 250000, houseType: 'terraced', deposits: [{ amount: 30000, date: '01/10/2026' }], prices: { terraced: 250000 } }));
  if (o.view) localStorage.setItem('vi_settings', JSON.stringify({ view: o.view }));
  if (o.motion) localStorage.setItem('vi_settings', JSON.stringify(Object.assign(JSON.parse(localStorage.getItem('vi_settings') || '{}'), { motion: o.motion })));
};
(async () => {
  const b = await chromium.launch(); const errs = [];
  const open = async (o) => {
    const mob = (o.w || 1100) < 700;
    const ctx = await b.newContext({ viewport: { width: o.w || 1100, height: mob ? 844 : 900 }, isMobile: mob, hasTouch: mob, reducedMotion: o.rm ? 'reduce' : 'no-preference' });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push((o.w || 1100) + ': ' + e.message));
    await p.addInitScript(seed, o); await p.goto(APP); await p.waitForTimeout(1500);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#trial-banner,#pro-offer-modal{display:none!important}' });
    await p.evaluate(`window.__shown = ${shown.toString()}; window.__ov = () => { const shown = window.__shown; return (${ov.toString()})(); };`);
    return p;
  };
  const shown = (sel) => { const e = document.querySelector(sel); return !!(e && getComputedStyle(e).display !== 'none' && e.getClientRects().length); };
  const ov = () => ({ ms: shown('#ov-ms-card'), nwh: shown('#ov-nwh-card'), cf: shown('#ov-cf-card'), own: shown('#ov-own-card'), ach: shown('#ov-ach-card'), road: shown('#fire-roadmap-card'), kpis: [...document.querySelectorAll('.ov-kpis:not(.debt-strip) .ov-kpi')].filter(e => e.getClientRects().length).length,
    nw: shown('#nwChart') || shown('#nw3d-hero'), tabs: [...document.querySelectorAll('#vi-tabs .tab-btn')].filter(x => !x.hidden && getComputedStyle(x).display !== 'none').map(x => x.dataset.tab).join(','), simple: document.body.classList.contains('vi-simple') });

  // ── 1. no view saved: Advanced ──
  let p = await open({});
  await p.evaluate(() => showTab('overview')); await p.waitForTimeout(400);
  await p.evaluate(() => { if (window.nw3d) nw3d.setMain('graph', true); }); await p.waitForTimeout(300);   // goals and snapshots live in the Graph view (owner, 31 Oct)
  let o = await p.evaluate(() => window.__ov());
  ok(!o.simple && o.ms && o.nwh && o.cf && o.own && !o.ach && /achievements/.test(o.tabs) && /biz/.test(o.tabs), 'no view saved: Advanced, every Overview tile and tab shows, no achievements card');
  const fold0 = await p.evaluate(() => { showTab('budget'); return [...document.querySelectorAll('.bd-tile')].map(t => t.classList.contains('folded')); });
  ok(fold0.length >= 3 && fold0.every(f => !f), 'Advanced: budget sections start open');

  // ── 2. switch to Simplified from Settings ──
  await p.evaluate(() => { showSettings(); document.querySelector('#set-view [data-val="simple"]').click(); closeSettings(); showTab('overview'); }); await p.waitForTimeout(400);
  o = await p.evaluate(() => window.__ov());
  ok(o.simple && !o.ms && !o.nwh && !o.cf && !o.own, 'Simplified: goals and snapshots, net worth history, cash flow and own and owe wait for Advanced');
  ok(o.kpis === 5 && o.nw && o.road && o.ach, 'Simplified keeps the five KPIs, the net worth card and the roadmap, and shows the achievements card');
  ok(!/achievements/.test(o.tabs) && !/biz/.test(o.tabs) && /overview/.test(o.tabs) && /house/.test(o.tabs), 'Simplified: the Achievements and Entrepreneur tabs leave the menu (' + o.tabs + ')');
  const ach = await p.evaluate(() => document.getElementById('ov-ach-body').textContent);
  ok(/XP/.test(ach) && /badges/.test(ach) && /in a row/.test(ach), 'the achievements card shows level, XP, streak and badges (' + ach.slice(0, 80) + ')');
  const set = await p.evaluate(() => ({ saved: JSON.parse(localStorage.getItem('vi_settings')).view, synced: _VAULT_KEYS.indexOf('vi_settings') >= 0 }));
  ok(set.saved === 'simple' && set.synced, 'the choice is saved in vi_settings, which follows the account');
  await p.evaluate(() => showSettings()); const act = await p.evaluate(() => document.querySelector('#set-view .active').getAttribute('data-val')); await p.evaluate(() => closeSettings());
  ok(act === 'simple', 'Settings shows Simplified as the active view');

  // ── 3. Budget in Simplified ──
  const bd = await p.evaluate(() => { showTab('budget'); const sk = document.querySelector('.bd-sankey-card').getBoundingClientRect(), sp = document.querySelector('.bd-split').getBoundingClientRect(); const tiles = [...document.querySelectorAll('.bd-tile')]; return { top: sk.top < sp.top, folded: tiles.map(t => t.classList.contains('folded')), n: tiles.length }; });
  ok(bd.top, 'Simplified: the Sankey sits above the budget lists');
  ok(bd.n >= 3 && bd.folded.every(Boolean), 'Simplified: every budget section starts folded (' + bd.folded.join(',') + ')');
  const bd2 = await p.evaluate(() => { bdFold('ce'); const t = document.querySelector('.bd-tile[data-g="ce"]'); return { open: !t.classList.contains('folded'), saved: JSON.parse(localStorage.getItem('vi_bd_fold') || '{}').ce === false }; });
  ok(bd2.open && bd2.saved, 'a section opened in Simplified opens and stays open');

  // ── 4. House in Simplified, Level 1 ──
  await p.evaluate(() => showTab('house')); await p.waitForTimeout(900);
  const hs = await p.evaluate(() => { const shown = (sel) => { const e = document.querySelector(sel); return !!(e && getComputedStyle(e).display !== 'none' && e.getClientRects().length); }; return { scene: shown('#houseSceneCard'), lay: shown('#hb-lay'), plan: shown('#hb-plan'), hud: shown('#hb-hud'), prog: shown('#hb-prog'), hist: shown('#hb-hist'), own: shown('#hb-own-design'), lvl: document.getElementById('house-tab-inner').getAttribute('data-lvl') }; });
  ok(hs.scene && hs.lay && hs.plan, 'Simplified house: the viewport, Add to your savings and Your house plan show');
  ok(!hs.hud && !hs.prog && !hs.hist && !hs.own && hs.lvl === '1', 'Simplified house at Level 1: the level card, progress, History and own-design tools wait for Advanced');
  await p.evaluate(() => { setSetting('view', 'adv'); }); await p.waitForTimeout(300);
  const ha = await p.evaluate(() => { const shown = (sel) => { const e = document.querySelector(sel); return !!(e && getComputedStyle(e).display !== 'none' && e.getClientRects().length); }; return shown('#hb-hud') && shown('#hb-prog') && shown('#hb-hist'); });
  ok(ha, 'back to Advanced: the level card, progress and History return');
  await p.context().close();

  // ── 5. welcome step: new accounts start Simplified, or Advanced if picked ──
  p = await open({});
  const w = await p.evaluate(() => { localStorage.removeItem('vi_settings'); viSettings = {}; const st = {}; wStep2Skip(); st.def = viSettings.view; wPickView('adv'); wStep2Skip(); st.adv = viSettings.view; st.pressed = document.querySelector('.w-view-opt[data-v="adv"]').getAttribute('aria-pressed'); return st; });
  ok(w.def === 'simple' && w.adv === 'adv' && w.pressed === 'true', 'welcome: Simplified by default, Advanced when picked (' + JSON.stringify(w) + ')');
  await p.context().close();

  // ── 6. phone, Simplified ──
  p = await open({ w: 390, view: 'simple' });
  await p.evaluate(() => showTab('overview')); await p.waitForTimeout(400);
  const k = await p.evaluate(() => { const ts = [...document.querySelectorAll('#tab-overview .ov-kpis:not(.debt-strip) .ov-kpi')].filter(e => e.getClientRects().length).map(e => Math.round(e.getBoundingClientRect().top)); return { ts, sx: document.documentElement.scrollWidth - innerWidth }; });
  ok(k.ts.length === 5 && k.ts[0] === k.ts[1] && k.ts[1] === k.ts[2] && k.ts[3] === k.ts[4] && k.ts[3] > k.ts[0], 'phone: the five KPIs sit in two rows, three then two (' + k.ts.join(',') + ')');
  ok(k.sx <= 1, 'phone: no sideways scroll (' + k.sx + ')');
  const an = await p.evaluate(() => { showTab('budget'); const l = document.querySelector('#bd-sankey .cf-ln'); return l ? getComputedStyle(l).animationName : 'none-found'; });
  ok(an === 'cfFlow', 'the Sankey bands animate (' + an + ')');
  await p.context().close();
  p = await open({ w: 390, view: 'simple', rm: true });
  const an2 = await p.evaluate(() => { showTab('budget'); const l = document.querySelector('#bd-sankey .cf-ln'); return l ? getComputedStyle(l).animationName : 'none-found'; });
  ok(an2 === 'none', 'with reduced motion the Sankey stays still (' + an2 + ')');
  await p.context().close();

  await b.close();
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
