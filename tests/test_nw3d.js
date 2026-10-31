// Brand phase 11: net worth in 3D on the Overview, behind ?nw=new (or localStorage vi-flag-nw=1).
// Flag off = the Overview exactly as before. Flag on = the "Net worth in 3D" scene (one column per asset class, debts below the gold line)
// and a 3D blocks | Graph toggle on the main chart: 3D first, the choice remembered, the same numbers in both views.
// 30 Oct: debts grouped by kind (all credit cards in one column, each in its own colour; loans beside them); zoom by buttons, pinch, ctrl+wheel; reset.
// 31 Oct (owner): three views, one switch each, top right: the net worth card is 3D | Graph; the progress blocks have their own card below
// with a Forecast switch; the keys are bigger and their swatches are small 3D blocks.
// Run: node tests/test_nw3d.js   (VI_APP=file:///path/to/index.html to test another copy)
const { chromium } = require('playwright');
const APP = process.env.VI_APP || 'file:///home/user/Vault-It/index.html';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const seed = (o) => {
  if (o.theme) localStorage.setItem('vi-theme', o.theme);
  if (o.flag === false) localStorage.setItem('vi-flag-nw', '0'); else if (o.flag) localStorage.setItem('vi-flag-nw', '1');
  if (localStorage.getItem('pos_debt1')) return;
  localStorage.setItem('vi_declined_demo', 'true');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com' }));
  localStorage.setItem('pos_ov1', JSON.stringify({ income: [{ id: 1, name: 'Salary', amount: 2400, cat: 'salary' }], expenses: [{ id: 3, name: 'Rent', amount: 700, type: 'ce' }],
    snapshots: [{ month: '2026-03', nw: 4200, debt: 9800, income: 2300 }, { month: '2026-06', nw: 6900, debt: 9000, income: 2300 }, { month: '2026-08', nw: 9100, debt: 8100, income: 2400 }] }));
  localStorage.setItem('pos_debt1', JSON.stringify({ debts: [{ id: 1, name: 'Barclaycard', original: 2500, balance: 2000, rate: 20, min: 60, type: 'credit' }, { id: 2, name: 'Car loan', original: 6000, balance: 3650, rate: 8, min: 180, type: 'loan' }] }));
  localStorage.setItem('pos_al1', JSON.stringify({ metals: { gold: 1, silver: 10, platinum: 0, palladium: 0 }, cashAccounts: [{ id: 1, name: 'Savings', type: 'Savings', balance: 6420, rate: 4 }],
    otherAssets: [{ id: 4, name: 'Watch', value: 1800 }], liabilities: [{ id: 9, name: 'Car', value: 4000, rate: 0, depRate: 0, runningCost: 80, addedDate: new Date(Date.now() - 60 * 864e5).toISOString() }] }));
  localStorage.setItem('ht3', JSON.stringify({ saved: 8500, target: 240000, houseType: 'terraced', depositPct: 20, deposits: [] }));
};
// WCAG AA for the new text outside the 3D viewports (same method as test_daylight)
const contrast = (sel) => {
  const parse = c => { const m = c.match(/[\d.]+/g); return m ? { r: +m[0], g: +m[1], b: +m[2], a: m[3] == null ? 1 : +m[3] } : null; };
  const lum = c => [c.r, c.g, c.b].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
  const blend = (f, bg) => ({ r: f.r * f.a + bg.r * (1 - f.a), g: f.g * f.a + bg.g * (1 - f.a), b: f.b * f.a + bg.b * (1 - f.a), a: 1 });
  const bgOf = el => { const st = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { st.push(c); if (c.a >= .99) break; } } let bg = { r: 201, g: 199, b: 190, a: 1 }; for (let i = st.length - 1; i >= 0; i--) bg = blend(st[i], bg); return bg; };
  const out = []; let n = 0;
  document.querySelectorAll(sel).forEach(el => {
    if (!el.offsetParent || el.closest('canvas,svg,.nw3d-stage')) return;
    const txt = [...el.childNodes].filter(x => x.nodeType === 3).map(x => x.textContent.trim()).join(' ').trim(); if (!txt) return;
    const cs = getComputedStyle(el); let op = 1; for (let e = el; e; e = e.parentElement) op *= +getComputedStyle(e).opacity;
    const bg = bgOf(el), fg = parse(cs.color); fg.a *= op; const f = blend(fg, bg), cr = (Math.max(lum(f), lum(bg)) + .05) / (Math.min(lum(f), lum(bg)) + .05); n++;
    if (cr < 4.5) out.push(txt.slice(0, 30) + ' (' + cr.toFixed(2) + ')');
  });
  return { n, out };
};
const NEW_TEXT = '#nw3d-hero *, #nw3d-main *, #nw3d-trk-card *, #chart-tooltip';
// pixels of a canvas, hashed, to tell a still scene from a moving one
const hash = (id) => { const c = document.getElementById(id), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 0, nz = 0; for (let i = 0; i < d.length; i += 16) { h = (h * 31 + d[i]) | 0; if (d[i + 3]) nz++; } return { h, nz }; };

(async () => {
  const b = await chromium.launch(); const errs = [];
  const open = async (o) => {
    const ctx = await b.newContext({ viewport: { width: o.w || 1100, height: o.h || 900 }, isMobile: !!o.mob, hasTouch: !!o.mob, reducedMotion: o.reduce ? 'reduce' : 'no-preference' });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(seed, { theme: o.theme || 'dark', flag: !!o.flag });
    await p.goto(APP + (o.q || '')); await p.waitForTimeout(1800);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#pro-offer-modal,#sync-banner{display:none!important}' });
    await p.evaluate(() => showTab('overview')); await p.waitForTimeout(500);
    return p;
  };
  // the app's own banners and offers can sit over a button; press it the way a tap would
  const tap = (p, sel) => p.evaluate((s) => document.querySelector(s).click(), sel);
  const scrollTo = async (p, sel) => { await p.evaluate((s) => { const e = document.querySelector(s); window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 140); }, sel); await p.waitForTimeout(1200); };

  // ── 1. classic (vi-flag-nw = 0): the Overview is exactly as before ──
  let p = await open({ flag: false });
  const off = await p.evaluate(() => ({ hero: !!document.getElementById('nw3d-hero'), seg: !!document.getElementById('nw3d-view'), wrap: !!document.querySelector('.nw3d-wrap'), api: typeof window.nw3d,
    chartVis: getComputedStyle(document.getElementById('nwChart')).visibility, chartH: document.getElementById('nwChart').getBoundingClientRect().height, flag: localStorage.getItem('vi-flag-nw'),
    cards: [...document.querySelectorAll('#ov-page > .ov-chart-card')].length, title: document.querySelector('.ov-chart-title').textContent }));
  ok(!off.hero && !off.seg && !off.wrap && off.api === 'undefined' && off.flag === '0', 'classic: no 3D scene, no view toggle, drawChart untouched');
  ok(off.chartVis === 'visible' && off.chartH > 150 && off.title === 'Net Worth Progress', 'flag off: the net worth graph shows as before (' + Math.round(off.chartH) + 'px)');
  await p.context().close();

  // ── 2. on by default (owner, 30 Oct): the 3D scene is the main view of the net worth card, the chart is the backup ──
  p = await open({ q: '?nw=new' });
  let s = await p.evaluate(() => ({ flag: localStorage.getItem('vi-flag-nw'), hero: !!document.getElementById('nw3d-hero'), main: nw3d.main(), mpressed: [...document.querySelectorAll('#nw3d-main button')].map(x => x.dataset.m + ':' + x.getAttribute('aria-pressed')).join(','),
    heroShown: !!document.getElementById('nw3d-hero').offsetParent, chartHidden: getComputedStyle(document.getElementById('nwChart')).visibility === 'hidden', title: document.querySelector('.ov-chart-title').textContent,
    inCard: document.getElementById('nw3d-hero').closest('.ov-chart-card') === document.getElementById('nwChart').closest('.ov-chart-card') }));
  ok(s.flag === '1' && s.hero && s.inCard, '?nw=new stores the flag; the 3D scene lives inside the net worth card');
  ok(s.main === '3d' && s.mpressed === '3d:true,graph:false' && s.heroShown && s.chartHidden && s.title === 'Net worth in 3D', '3D is the main view by default, the chart is hidden behind Graph (' + s.mpressed + ')');
  // numbers: the scene tag is computeNetWorth, columns add up to it, the tracker is the chart's own points
  await scrollTo(p, '#nw3d-hero');
  // the progress blocks have their own card under the net worth card, and work while the 3D view is showing
  const lay = await p.evaluate(() => { const a = document.getElementById('nwChart').closest('.ov-chart-card'), b = document.getElementById('nw3d-trk-card'), ra = a.getBoundingClientRect(), m = document.getElementById('nw3d-main').getBoundingClientRect(), f = document.getElementById('nw3d-fc').getBoundingClientRect(), rb = b.getBoundingClientRect();
    return { next: a.nextElementSibling === b, below: rb.top >= ra.bottom - 1, mTop: m.top - ra.top, mRight: ra.right - m.right, fTop: f.top - rb.top, fRight: rb.right - f.right, switches: document.querySelectorAll('#nw3d-main button').length, old: !!document.getElementById('nw3d-view'), trkShown: !!document.getElementById('nw3d-trk-stage').offsetParent }; });
  ok(lay.next && lay.below && lay.trkShown, 'the progress blocks are their own card, directly under the net worth card, shown with the 3D view');
  ok(lay.switches === 2 && !lay.old && lay.mTop < 50 && lay.mRight < 40 && lay.fTop < 50 && lay.fRight < 40, 'one switch per card, top right: 3D | Graph, and Forecast on the progress card (' + JSON.stringify(lay) + ')');
  let nums = await p.evaluate(() => { const t = nw3d.hero.totals(), cv = document.getElementById('nw3d-hero-cv'), d = nw3d.tracker.data(), pts = document.getElementById('nwChart')._points.filter(x => !x.synth);
    return { net: Math.round(computeNetWorth()), tag: +cv.dataset.net, sum: t.assets - t.debt, unit: t.unit, cols: cv.dataset.cols, ptsNw: pts.map(x => Math.round(x.nw)), trkNw: d.nw.slice(0, d.today + 1), ptsDebt: pts.map(x => Math.round(x.debt)), trkDebt: d.debt.slice(0, d.today + 1), fcDefault: d.sel.fc && chartState.metrics.proj && document.getElementById('nw3d-fc').getAttribute('aria-pressed') === 'true', keyTxt: document.getElementById('nw3d-trk-key').textContent, keySw: document.getElementById('nw3d-trk-key').querySelectorAll('svg').length, today: d.today, todayNw: d.nw[d.today],
      kpi: document.getElementById('kpi-nw').textContent, read: document.getElementById('nw3d-hero-read').textContent, tip: document.getElementById('nw3d-trk-read').textContent, cash: t.cols.cash }; });
  ok(nums.fcDefault, 'Forecast is on by default (owner, 31 Oct)');
  ok(/Net worth/.test(nums.keyTxt) && /Debt/.test(nums.keyTxt) && /Monthly income/.test(nums.keyTxt) && nums.keySw >= 6, 'the progress key names its three colours, each with a 3D swatch (' + nums.keyTxt + ')');
  ok(nums.tag === nums.net && Math.abs(nums.sum - nums.net) < 1, 'scene tag = computeNetWorth (' + nums.tag + ') and the columns add up to it (' + nums.sum.toFixed(2) + ')');
  ok(/cash,deposit,metals,inv,debt:loan,debt:credit,liabval,running/.test(nums.cols), 'asset classes in order, the debt columns right after the inventory cubes (owner, 31 Oct), then the rest (' + nums.cols + ')');
  ok(nums.cash && nums.cash.blocks === 6 && nums.cash.cubes === 4 && nums.unit === 1000, '£6,420 of cash = 6 £1,000 blocks + 4 £100 cubes (a fraction tops it)');
  ok(JSON.stringify(nums.ptsNw) === JSON.stringify(nums.trkNw) && JSON.stringify(nums.ptsDebt) === JSON.stringify(nums.trkDebt) && nums.todayNw === nums.net, '3D blocks show the graph\'s own points (' + nums.trkNw.join(', ') + '), today = net worth');
  ok(nums.read.indexOf('Net worth £' + nums.net.toLocaleString('en-GB')) >= 0 && nums.tip.indexOf('net worth £' + nums.net.toLocaleString('en-GB')) >= 0, 'readouts under both 3D views say the same net worth');
  // unit scales so the tallest column stays under about 14 blocks
  const big = await p.evaluate(() => { alState.cashAccounts[0].balance = 64200; drawChart(); const t = nw3d.hero.totals(); const r = { unit: t.unit, blocks: t.cols.cash.blocks, key: document.getElementById('nw3d-hero-key').textContent, tag: +document.getElementById('nw3d-hero-cv').dataset.net, net: Math.round(computeNetWorth()) }; alState.cashAccounts[0].balance = 6420; drawChart(); return r; });
  await p.evaluate(() => nw3d.setMain('3d', true)); await p.waitForTimeout(300);
  ok(big.unit === 5000 && big.blocks <= 14 && /1 block = £5,000/.test(big.key) && big.tag === big.net, 'a bigger stack scales the unit and labels it (' + big.key + ')');
  // owner, 30 Oct: every credit card stacks in one column, each keeping its own colour; a loan is another kind of debt and stands beside it
  const stk = await p.evaluate(() => { debtState.debts.push({ id: 3, name: 'Vanquis', original: 900, balance: 800, rate: 34, min: 25, type: 'credit' }); drawChart();
    const t = nw3d.hero.totals(), cv = document.getElementById('nw3d-hero-cv'), lg = document.querySelector('#nw3d-hero-legend .stack');
    const cols = nw3d.hero._cols ? null : cv.dataset.cols; const sw = lg ? [...lg.querySelectorAll('svg[data-col]')].map(i => i.getAttribute('data-col')) : [];
    const r = { cols, cards: t.cols['debt:credit'] && Math.round(t.cols['debt:credit'].v), loan: t.cols['debt:loan'] && Math.round(t.cols['debt:loan'].v), n: Object.keys(t.cols).filter(k => k.indexOf('debt') === 0).length, sw, legend: lg ? lg.textContent : '' };
    debtState.debts.pop(); drawChart(); return r; });
  ok(stk.n === 2 && stk.cards === 2800 && stk.loan === 3650, 'two cards share one column (£2,800) beside the loan column (£3,650), no third debt column (' + stk.cols + ')');
  ok(stk.sw.length === 2 && stk.sw[0] !== stk.sw[1] && /Barclaycard £2,000/.test(stk.legend) && /Vanquis £800/.test(stk.legend), 'the legend shows both cards in their own colours (' + stk.sw.join(' | ') + ')');
  // zoom: buttons, ctrl + wheel (trackpad pinch) and reset
  const z0 = await p.evaluate(() => nw3d.hero.st.zoom);
  await tap(p, '#nw3d-hero-stage [data-z="in"]'); await tap(p, '#nw3d-hero-stage [data-z="in"]');
  const z1 = await p.evaluate(() => nw3d.hero.st.zoom);
  await tap(p, '#nw3d-hero-stage [data-z="out"]'); const z2 = await p.evaluate(() => nw3d.hero.st.zoom);
  const zb = await p.locator("#nw3d-hero-cv").boundingBox(); await p.mouse.move(zb.x + zb.width / 2, zb.y + zb.height / 2);
  await p.keyboard.down('Control'); await p.mouse.wheel(0, -400); await p.keyboard.up('Control'); await p.waitForTimeout(100);
  const z3 = await p.evaluate(() => nw3d.hero.st.zoom);
  await tap(p, '#nw3d-hero-stage [data-z="reset"]'); const z4 = await p.evaluate(() => nw3d.hero.st.zoom);
  ok(Math.abs(z0 - 1.2) < 1e-9 && Math.abs(z1 - 1.2 * 1.5625) < 1e-6 && z2 < z1 && z3 > z2 && Math.abs(z4 - 1.2) < 1e-9, 'the scene rests 20% closer (owner, 31 Oct): zoom in twice (' + z1.toFixed(3) + '), out (' + z2.toFixed(3) + '), ctrl+wheel in (' + z3.toFixed(3) + '), reset to 1.2 (' + z4 + ')');

  // ── 3. Graph (the backup) and back: same numbers, the choice remembered ──
  await tap(p, '#nw3d-main button[data-m="graph"]'); await p.waitForTimeout(400);
  s = await p.evaluate(() => ({ trk: getComputedStyle(document.getElementById('nw3d-trk-stage')).display, chartVis: getComputedStyle(document.getElementById('nwChart')).visibility, pts: document.getElementById('nwChart')._points.filter(x => !x.synth).map(x => Math.round(x.nw)), tag: +document.getElementById('nw3d-hero-cv').dataset.net }));
  ok(s.trk !== 'none' && s.chartVis === 'visible' && await p.evaluate(() => nw3d.main() === 'graph' && localStorage.getItem('vi-nw-main') === 'graph' && !document.getElementById('nw3d-hero').offsetParent), 'Graph shows the existing chart, hides the scene, keeps the progress card, and is remembered');
  ok(JSON.stringify(s.pts) === JSON.stringify(nums.ptsNw) && s.tag === nums.net, 'switching view never changes the numbers');
  await p.waitForTimeout(1500);   // headless Chromium on file:// can lose a localStorage write made just before a reload
  await p.reload(); await p.waitForFunction(() => typeof nw3d !== 'undefined' && typeof showTab === 'function', null, { timeout: 20000 }); await p.waitForTimeout(600); await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#pro-offer-modal,#sync-banner{display:none!important}' }); await p.evaluate(() => showTab('overview')); await p.waitForTimeout(400);
  ok(await p.evaluate(() => nw3d.main() === 'graph' && document.querySelector('#nw3d-main [data-m="graph"]').getAttribute('aria-pressed') === 'true'), 'after a reload the Graph choice is still there');
  await tap(p, '#nw3d-main button[data-m="3d"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => nw3d.main() === '3d' && localStorage.getItem('vi-nw-main') === '3d'), 'and back to 3D, remembered');

  // ── 4. ranges and series: the progress blocks follow the graph's months, whichever view the top card shows ──
  await tap(p, '#nw3d-fc'); await p.waitForTimeout(250);   // Forecast starts on: turn it off, then each pass turns it on and off again
  for (const v of ['graph', '3d']) {
    await p.evaluate((v) => nw3d.setMain(v, true), v); await p.waitForTimeout(200);
    await p.evaluate(() => setChartRange(document.querySelector('.chart-filter-btn[data-range="6"]'), '6')); await p.waitForTimeout(250);
    const r6 = await p.evaluate(() => ({ trk: nw3d.tracker.data().labels, pts: document.getElementById('nwChart')._points.filter(x => !x.synth).map(x => x.month) }));
    await p.evaluate(() => setChartRange(document.querySelector('.chart-filter-btn[data-range="all"]'), 'all')); await p.waitForTimeout(250);
    const rAll = await p.evaluate(() => nw3d.tracker.data().labels.length);
    ok(r6.trk.length === r6.pts.length && r6.trk.length < rAll && r6.trk.length >= 1, v + ': 6M shows the same months as the graph (' + r6.trk.join(', ') + ') and All shows ' + rAll);
    await tap(p, '.chart-metric-btn[data-metric="debt"]'); await p.waitForTimeout(200);
    const dOff = await p.evaluate(() => ({ sel: nw3d.tracker.data().sel.debt, m: chartState.metrics.debt }));
    await tap(p, '.chart-metric-btn[data-metric="debt"]'); await p.waitForTimeout(200);
    ok(dOff.sel === false && dOff.m === false, v + ': the Debt toggle hides debt in the 3D blocks too');
    await tap(p, '#nw3d-fc'); await p.waitForTimeout(250);
    const fc = await p.evaluate(() => { const d = nw3d.tracker.data(), pr = document.getElementById('nwChart')._proj || []; return { n: d.nw.length, today: d.today, fc: d.nw.slice(d.today + 1), pr: pr.map(x => Math.round(x.nw)), sel: d.sel.fc, pressed: document.getElementById('nw3d-fc').getAttribute('aria-pressed'), graphBtn: document.querySelector('.chart-metric-btn[data-metric="proj"]').classList.contains('active'), key: document.getElementById('nw3d-trk-key').textContent }; });
    await tap(p, '#nw3d-fc'); await p.waitForTimeout(250);
    const off = await p.evaluate(() => ({ pressed: document.getElementById('nw3d-fc').getAttribute('aria-pressed'), m: chartState.metrics.proj }));
    ok(fc.sel && fc.pressed === 'true' && fc.graphBtn && fc.n === fc.today + 1 + 6 && JSON.stringify(fc.fc) === JSON.stringify(fc.pr) && /Forecast/.test(fc.key), v + ': Forecast on the progress card adds the graph’s 6 forecast months as see-through blocks (' + fc.fc.join(', ') + ')');
    ok(off.pressed === 'false' && off.m === false, v + ': and turns off again, the graph’s Forecast with it');
  }
  await tap(p, '.chart-metric-btn[data-metric="proj"]'); await p.waitForTimeout(250);
  ok(await p.evaluate(() => document.getElementById('nw3d-fc').getAttribute('aria-pressed') === 'true'), 'the graph’s Forecast button and the progress card’s switch stay in step');
  await tap(p, '.chart-metric-btn[data-metric="proj"]'); await p.waitForTimeout(250);
  // the keys: bigger, swatches drawn as 3D blocks
  const key = await p.evaluate(() => { const k = document.getElementById('nw3d-hero-key'), t = document.getElementById('nw3d-trk-key'), lg = document.getElementById('nw3d-hero-legend');
    return { fs: parseFloat(getComputedStyle(k).fontSize), lfs: parseFloat(getComputedStyle(lg.querySelector('span')).fontSize), faces: [...k.querySelectorAll('svg')].map(s => s.querySelectorAll('polygon').length), tfaces: t.querySelectorAll('svg polygon').length, lsw: [...lg.querySelectorAll('svg')].every(s => s.querySelectorAll('polygon').length === 3) }; });
  ok(key.fs >= 9.5 && key.lfs >= 10 && key.faces.length === 2 && key.faces.every(n => n === 3) && key.tfaces === 18 && key.lsw, 'keys are bigger (' + key.fs + 'px, legend ' + key.lfs + 'px) and every swatch is a 3D block (three faces)');

  // tap a month to read it
  await scrollTo(p, '#nw3d-trk-stage'); await p.waitForTimeout(1200);
  const box = await p.evaluate(() => { const r = document.getElementById('nw3d-trk-cv').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  let read = '';
  for (let fx = .2; fx < .8 && !/Mar '26|Jun '26/.test(read); fx += .05) { await p.mouse.move(box.x + box.w * fx, box.y + box.h * .55); await p.waitForTimeout(60); read = await p.evaluate(() => document.getElementById('nw3d-trk-read').textContent); }
  ok(/(Mar|Jun) '26: net worth £(4,200|6,900)/.test(read), 'hovering a month reads it out (' + read + ')');
  // still frames differ in normal motion (sway, pulse, ring)
  await p.mouse.move(box.x + 4, box.y + 4); await p.waitForTimeout(3000);   // leave it alone: the sway resumes after 2.5 s
  const m1 = await p.evaluate(hash, 'nw3d-trk-cv'); await p.waitForTimeout(400); const m2 = await p.evaluate(hash, 'nw3d-trk-cv');
  await p.evaluate(() => nw3d.setMain('3d', true)); await scrollTo(p, '#nw3d-hero');
  const h1 = await p.evaluate(hash, 'nw3d-hero-cv'); await p.waitForTimeout(400); const h2 = await p.evaluate(hash, 'nw3d-hero-cv');
  ok(m1.nz > 1000 && m1.h !== m2.h && h1.nz > 1000 && h1.h !== h2.h, 'both scenes are drawn and move (sway, pulse, ring)');
  await p.context().close();

  // ── 5. reduced motion: built instantly and still ──
  p = await open({ flag: true, reduce: true });
  await scrollTo(p, '#nw3d-hero'); await p.waitForTimeout(300);
  const r1 = await p.evaluate(hash, 'nw3d-hero-cv'); await p.waitForTimeout(700); const r2 = await p.evaluate(hash, 'nw3d-hero-cv');
  await scrollTo(p, '#nw3d-trk-stage'); await p.waitForTimeout(400);
  const t1 = await p.evaluate(hash, 'nw3d-trk-cv'); await p.waitForTimeout(500); const t2 = await p.evaluate(hash, 'nw3d-trk-cv');
  ok(r1.nz > 1000 && r1.h === r2.h && t1.nz > 1000 && t1.h === t2.h, 'reduced motion: both scenes are complete at once and do not move');
  await p.context().close();

  // ── 6. phones: no sideways scroll, Daylight text reads ──
  for (const theme of ['dark', 'light']) {
    p = await open({ flag: true, w: 390, h: 844, mob: true, theme });
    for (const v of ['3d', 'graph']) {
      await p.evaluate((v) => nw3d.setMain(v, true), v); await p.waitForTimeout(300);
      const sx = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      ok(sx <= 1, theme + ' 390px ' + v + ': no sideways scroll (' + sx + ')');
    }
    if (theme === 'light') {
      await p.evaluate(() => nw3d.setMain('3d', true)); await p.waitForTimeout(300);
      const c = await p.evaluate(contrast, NEW_TEXT);
      ok(c.n >= 8 && c.out.length === 0, 'Daylight: the new text passes WCAG AA (' + c.n + ' checked) ' + c.out.join(' | '));
      const fca = await p.evaluate(() => { const e = document.querySelector('.vi-fca'); return !!(e && e.offsetParent && /Not regulated by the FCA\. Not financial advice\./.test(e.textContent)); });
      ok(fca, 'the FCA line is still visible');
      const night = await p.evaluate(() => getComputedStyle(document.getElementById('nw3d-hero-stage')).getPropertyValue('--teal').trim());
      ok(night.toUpperCase() === '#44C0B9', 'the 3D viewport keeps the Night look in Daylight (' + night + ')');
    }
    await p.context().close();
  }
  p = await open({ flag: true, w: 1100, theme: 'light' });
  const c11 = await p.evaluate(contrast, NEW_TEXT);
  ok(c11.out.length === 0, 'Daylight 1100px: the new text passes WCAG AA (' + c11.n + ' checked) ' + c11.out.join(' | '));
  // ?nw=old turns it off again
  await p.goto(APP + '?nw=old'); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => localStorage.getItem('vi-flag-nw') === '0' && !document.getElementById('nw3d-hero')), '?nw=old switches it off (stored, so the device stays classic)');
  await p.context().close();

  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
})();
