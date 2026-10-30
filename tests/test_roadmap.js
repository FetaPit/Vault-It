// Roadmap unlocking + rendering robustness.
//  • why a stage can be stuck and how the user gets unstuck: blocker banner, "already met" stages, debts-mapped tick,
//    one-tap first snapshot, skip (with undo), homeowner / student-loan / legacy-debt cases
//  • charts and the roadmap no longer redraw when only the HEIGHT changes (mobile address bar) and the SVG is a light window
const { chromium } = require('playwright');
const routeThree = require('./three_route');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const seed = (o) => `(function(){if(localStorage.getItem('ht3'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'T',email:'t@t.com',pro:true}));localStorage.setItem('vi_pioneer','true');localStorage.setItem('ht3',${JSON.stringify(JSON.stringify(o))});})();`;
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 700, height: 1000 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); await routeThree(ctx);
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load|net::/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.addInitScript(seed({ saved: 0, target: 250000, houseType: 'terraced', deposits: [], prices: { terraced: 250000 } }));
  await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(1800);
  await p.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
  await p.evaluate(() => showTab('overview')); await p.waitForTimeout(900);
  // reset everything the roadmap reads, as a post-migration user
  const reset = () => p.evaluate(() => {
    ovState.snapshots = []; ovState.manual = {}; ovState.skipped = {}; ovState.income = []; ovState.expenses = [];
    debtState.debts = []; alState.liabilities = []; alState.cashAccounts = []; alState.stockPies = [];
    try { localStorage.removeItem('vi_nw_history'); } catch (e) {}
    state.saved = 0; state.target = 250000; state.houseMode = null; state.deposits = [];
    renderFIREroadmap();
  });
  const S = () => p.evaluate(() => { const s = renderFIREroadmap._stages; return { next: s.nextIdx, nextKey: s.nextIdx >= 0 ? s[s.nextIdx].key : null, done: s.doneCount, skipped: s.skipCount, waiting: s.waiting.map(x => x.key), raw: s.filter(x => x.raw).map(x => x.key), doneKeys: s.filter(x => x.done).map(x => x.key) }; });

  // ── 1. a fresh user starts at stage 1, nothing is "waiting"
  await reset(); let r = await S();
  ok(r.nextKey === 'firstLog' && r.done === 0 && r.waiting.length === 0, 'fresh user: stage 1 is next, nothing waiting');
  ok(await p.evaluate(() => document.getElementById('fire-block').style.display === 'none'), 'no blocker banner for a fresh user');

  // ── 2. the reported case: debts mapped, other things met, but stage 1 (no snapshot) holds everything back
  await p.evaluate(() => {
    debtState.debts = [{ id: Date.now(), name: 'Barclaycard', original: 2000, balance: 1500, rate: 21, min: 50, type: 'credit' }, { id: Date.now() + 1, name: 'Car', original: 6000, balance: 5000, rate: 7, min: 150, type: 'car' }];
    alState.cashAccounts = [{ id: 1, name: 'Savings', type: 'Savings', balance: 1200 }];
    renderFIREroadmap();
  });
  r = await S();
  ok(r.nextKey === 'firstLog' && r.done === 0, 'debts + savings but no snapshot: still stuck on stage 1');
  ok(r.waiting.includes('firstSaved') && r.waiting.includes('buf500') && r.waiting.includes('buf1k'), 'later stages that are already met are recognised as waiting: ' + r.waiting.join(','));
  const bn = await p.evaluate(() => { const e = document.getElementById('fire-block'); return { shown: e.style.display !== 'none', txt: e.innerText }; });
  ok(bn.shown && /already met/i.test(bn.txt) && /First Log/.test(bn.txt), 'banner names the blocker: ' + bn.txt.replace(/\n/g, ' | ').slice(0, 120));
  // a locked-but-met stage says so in its detail panel
  await p.evaluate(() => fireShowDetail(4));
  ok(/already meet this/i.test(await p.evaluate(() => document.getElementById('fire-detail-inner').innerText)), 'a met-but-locked stage explains it is waiting on First Log');
  // stage 2's tick is available even while it is locked
  await p.evaluate(() => fireShowDetail(1));
  const d2 = await p.evaluate(() => ({ tick: !!document.querySelector('#fire-detail-inner input[type=checkbox]'), txt: document.getElementById('fire-detail-inner').innerText }));
  ok(d2.tick && /mapped every debt/i.test(d2.txt), 'Map Debts shows the “I’ve mapped every debt” tick box');
  // ── 3. one tap records the snapshot and unlocks stage 1; stage 2 still needs the tick (debts are listed, not confirmed)
  await p.evaluate(() => fireLogSnapshot());
  r = await S();
  ok(r.doneKeys.includes('firstLog') && r.nextKey === 'mapDebts', 'one-tap snapshot completes stage 1; Map Debts is next');
  ok(!r.waiting.includes('mapDebts'), 'Map Debts is not met until the user confirms');
  // ── 4. tick the box → mapped
  await p.evaluate(() => fireTick('debtsMapped', true));
  r = await S();
  ok(r.doneKeys.includes('mapDebts') && r.doneKeys.includes('firstSaved') === false && r.nextKey === 'zeroBudget', 'ticking “I’ve mapped every debt” completes stage 2; Zero Budget is next');
  // unticking un-completes it
  await p.evaluate(() => fireTick('debtsMapped', false)); r = await S();
  ok(r.nextKey === 'mapDebts', 'unticking puts Map Debts back');
  await p.evaluate(() => fireTick('debtsMapped', true));

  // ── 5. skip the blocker (zero budget not done): later met stages unlock, skipped is not "achieved"
  const before = (await S()).done;
  await p.evaluate(() => fireShowDetail(2));
  ok(/skip it/i.test(await p.evaluate(() => document.getElementById('fire-detail-inner').innerText)), 'the blocking stage offers “skip it”');
  await p.evaluate(() => fireShowDetail(5));
  ok(!/skip it/i.test(await p.evaluate(() => document.getElementById('fire-detail-inner').innerText)), 'a stage that is not the blocker does not offer skip');
  await p.evaluate(() => fireSkip('zeroBudget')); r = await S();
  ok(r.skipped === 1 && r.done === before + 3 && r.doneKeys.includes('firstSaved') && r.doneKeys.includes('buf500') && r.doneKeys.includes('buf1k'), 'skipping Zero Budget unlocks the stages already met (' + r.doneKeys.join(',') + ')');
  ok(!r.doneKeys.includes('zeroBudget'), 'a skipped stage does not count as achieved');
  ok(/skipped/.test(await p.evaluate(() => document.getElementById('fire-progress-txt').textContent)), 'header shows how many were skipped');
  await p.evaluate(() => fireUnskip('zeroBudget')); r = await S();
  ok(r.nextKey === 'zeroBudget' && r.skipped === 0, 'undo skip puts the stage back');
  // the skip needs an explicit confirmation in the panel
  await p.evaluate(() => fireShowDetail(2, { skipAsk: true }));
  ok(/Yes, skip it/.test(await p.evaluate(() => document.getElementById('fire-detail-inner').innerText)), 'skip asks for confirmation first');

  // ── 6. no debts at all: “I don’t have any debts”
  await reset(); await p.evaluate(() => fireLogSnapshot());
  r = await S(); ok(r.nextKey === 'mapDebts', 'no debts listed: Map Debts waits');
  await p.evaluate(() => fireShowDetail(1));
  ok(/don’t have any debts/i.test(await p.evaluate(() => document.getElementById('fire-detail-inner').innerText)), 'with no debts the tick reads “I don’t have any debts”');
  await p.evaluate(() => fireTick('noDebt', true)); r = await S();
  ok(r.doneKeys.includes('mapDebts') && r.doneKeys.includes('firstCut') === false, 'no-debt tick completes Map Debts');

  // ── 7. only a student loan + mortgage: no consumer debt to cut, so those stages do not block forever
  await reset();
  await p.evaluate(() => { debtState.debts = [{ id: Date.now(), name: 'Student Loan', original: 38000, balance: 36000, rate: 6, min: 0, type: 'student' }, { id: Date.now() + 1, name: 'Mortgage', original: 200000, balance: 190000, rate: 4, min: 900, type: 'mortgage' }]; ovState.manual.debtsMapped = true; fireLogSnapshot(); });
  r = await S();
  ok(r.doneKeys.includes('mapDebts') && r.raw.includes('firstCut') && r.raw.includes('debtHalf') && r.raw.includes('debtFree'), 'student loan + mortgage only: First Debt Cut / Halved / Debt Free are not blocked by them');

  // ── 8. a debt with no “original” amount is stamped, so progress can be shown
  await reset();
  await p.evaluate(() => { debtState.debts = [{ id: Date.now(), name: 'Old card', balance: 1000, rate: 20, min: 30, type: 'credit' }]; ovState.manual.debtsMapped = true; fireLogSnapshot(); });
  await p.waitForTimeout(200);
  ok(await p.evaluate(() => debtState.debts[0].original) === 1000, 'a legacy debt without an original amount is stamped with its balance');
  await p.evaluate(() => { debtState.debts[0].balance = 400; renderFIREroadmap(); }); r = await S();
  ok(r.raw.includes('debtHalf'), 'paying it down to 40% then counts as “Debt Halved”');

  // ── 9. already own a home: the saving-for-a-deposit and buying stages do not trap you
  await reset();
  await p.evaluate(() => { state.houseMode = 'purchased'; state.target = 0; renderFIREroadmap(); }); r = await S();
  ok(['dep1', 'dep5', 'depReady', 'applied', 'exchanged', 'keys'].every(k => r.raw.includes(k)), 'homeowner: deposit / applied / exchanged / keys are satisfied');

  // ── 10. no house target: deposit stages explain themselves and can be skipped
  await reset();
  await p.evaluate(() => { state.target = 0; renderFIREroadmap(); });
  const why = await p.evaluate(() => { const s = renderFIREroadmap._stages; return s.find(x => x.key === 'dep1').why().join(' '); });
  ok(/No house target/i.test(why), 'with no house target the deposit stage says why it cannot complete');

  // ── 11. ISA recognised from a cash account or a Stocks pie
  await reset();
  await p.evaluate(() => { alState.stockPies = [{ id: 1, name: 'Stocks & Shares ISA' }]; renderFIREroadmap(); });
  ok((await S()).raw.includes('isa'), 'an ISA-named Stocks & Funds pie counts');

  // ── 12. grandfathering: a debt created before the tick existed counts as confirmed; a new one doesn't; nothing is written
  await reset();
  await p.evaluate(() => { debtState.debts = [{ id: 1700000000000, name: 'Loan', original: 3000, balance: 2000, rate: 8, min: 90, type: 'personal' }]; renderFIREroadmap(); });
  ok(await p.evaluate(() => renderFIREroadmap._stages.find(s => s.key === 'mapDebts').raw === true), 'a debt listed before the tick existed keeps Map Debts complete (no re-lock for existing users)');
  ok(await p.evaluate(() => ovState.manual.debtsMapped === undefined && !JSON.stringify(ovState.manual).includes('_v2')), 'and the grandfathering writes nothing');
  await p.evaluate(() => { debtState.debts = [{ id: Date.now(), name: 'New loan', original: 3000, balance: 2000, rate: 8, min: 90, type: 'personal' }]; renderFIREroadmap(); });
  ok(await p.evaluate(() => renderFIREroadmap._stages.find(s => s.key === 'mapDebts').raw === false), 'a debt added now still needs the tick');

  // ── 13. the Debt Tracker has the same tick
  await reset(); await p.evaluate(() => { debtState.debts = [{ id: Date.now(), name: 'Loan', original: 3000, balance: 2000, rate: 8, min: 90, type: 'personal' }]; fireLogSnapshot(); showTab('debt'); });
  await p.waitForTimeout(400);
  ok(await p.evaluate(() => !!document.querySelector('#debt-map-confirm input[type=checkbox]') && /added every debt/i.test(document.getElementById('debt-map-confirm').innerText)), 'Debt Tracker shows “I’ve added every debt I owe”');
  await p.evaluate(() => document.querySelector('#debt-map-confirm input').click()); await p.waitForTimeout(200);
  ok((await S()).doneKeys.includes('mapDebts'), 'ticking it in the Debt Tracker completes Map Debts on the roadmap');
  await p.evaluate(() => showTab('overview')); await p.waitForTimeout(500);

  // ── 14. rendering: a light windowed SVG, no filters or endless animations
  await reset();
  const g = await p.evaluate(() => { const sv = document.getElementById('fire-roadmap-svg'); return { nodes: sv.querySelectorAll('*').length, filters: sv.querySelectorAll('filter').length, anims: sv.querySelectorAll('animate').length, w: sv.getBoundingClientRect().width, track: document.getElementById('fire-track').offsetWidth }; });
  ok(g.nodes < 330 && g.filters === 0 && g.anims === 0, 'roadmap SVG is light: ' + g.nodes + ' elements, ' + g.filters + ' filters, ' + g.anims + ' animations');
  ok(g.w < g.track * 0.6 && g.track > 3000, 'only a window is drawn (' + Math.round(g.w) + 'px of a ' + g.track + 'px track)');
  await p.evaluate(() => { document.getElementById('fire-timeline-scroll').scrollLeft = 2600; }); await p.waitForTimeout(400);
  const far = await p.evaluate(() => { const sv = document.getElementById('fire-roadmap-svg'); return { left: parseFloat(sv.style.left), txt: sv.textContent }; });
  ok(far.left > 1500 && /Mortgage Free|£100k|Coast FI/.test(far.txt) && !/First Log/.test(far.txt), 'scrolling far right redraws the window there (starts at x=' + far.left + ')');
  await p.evaluate(() => { document.getElementById('fire-timeline-scroll').scrollLeft = 0; }); await p.waitForTimeout(400);
  ok(await p.evaluate(() => /First Log/.test(document.getElementById('fire-roadmap-svg').textContent)), 'scrolling back brings the start of the roadmap back');

  // ── 15. address-bar resizes (height only) cause no redraws; a real width change causes exactly one
  await p.evaluate(() => { window.__c = { chart: 0, road: 0, cf: 0 }; [['drawChart', 'chart'], ['renderFIREroadmap', 'road'], ['drawCashflowDiagram', 'cf']].forEach(([n, k]) => { const o = window[n]; window[n] = function () { window.__c[k]++; return o.apply(this, arguments); }; }); });
  for (let i = 0; i < 5; i++) { await p.setViewportSize({ width: 700, height: i % 2 ? 1000 : 940 }); await p.waitForTimeout(320); }
  const c1 = await p.evaluate(() => window.__c);
  ok(c1.chart === 0 && c1.road === 0 && c1.cf === 0, 'five address-bar show/hide resizes redraw nothing (' + JSON.stringify(c1) + ')');
  await p.setViewportSize({ width: 880, height: 1000 }); await p.waitForTimeout(700);
  const c2 = await p.evaluate(() => window.__c);
  ok(c2.chart >= 1 && c2.road >= 1 && c2.cf >= 1 && c2.chart <= 2, 'a real width change (unfolding) redraws them once (' + JSON.stringify(c2) + ')');
  // ── 16. the net worth chart grows with the screen (it used to stay pinned at its first width). The 3D view is the main view by default, so show the graph first.
  await p.evaluate(() => { if (window.nw3d) nw3d.setMain('graph', true); }); await p.waitForTimeout(500);
  const cw = await p.evaluate(() => { const c = document.getElementById('nwChart'), h = c.parentElement; return { cssW: c.clientWidth, host: h.clientWidth, drawn: c.dataset.drawn }; });
  ok(cw.cssW > 700 && Math.abs(cw.cssW - cw.host) < 80, 'net worth chart fills the wider screen (' + cw.cssW + 'px in a ' + cw.host + 'px card)');
  await p.setViewportSize({ width: 520, height: 1000 }); await p.waitForTimeout(700);
  const cn = await p.evaluate(() => { const c = document.getElementById('nwChart'); return { cssW: c.clientWidth, bw: c.width, dpr: devicePixelRatio }; });
  ok(cn.cssW < 520 && Math.abs(cn.bw - cn.cssW * Math.min(cn.dpr, 2.5)) <= 2, 'and shrinks again with a matching bitmap (' + cn.cssW + 'px, bitmap ' + cn.bw + ')');
  ok(errs.length === 0, 'no errors ' + errs.slice(0, 3).join(' | '));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
})();
