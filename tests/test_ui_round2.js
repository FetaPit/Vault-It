// v0.7 UI round 2, stream C2 (owner, 2 Nov fold test; for alpha 0.8): the dashboard Net worth tile.
// 1. Net worth in 3D: no forecast note in the 3D progress card.
// 3. Forecast from the Budget (savings and investments only, investments compound, debt repayments after interest, shortfall comes off,
//    no budget = no growth) with a full-width note.
// 4. History, Goals and Snapshots folded into 28 px pills at the foot of the net worth tile (Pedro's v0.8 spec E), collapsed by default, Pro gate kept.
// Run: node tests/test_ui_round2.js   (VI_APP=file:///path/to/index.html to test another copy)
const { chromium } = require('playwright');
const APP = process.env.VI_APP || 'file:///home/user/Vault-It/index.html';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const src = require('fs').readFileSync(__dirname + '/test_nw3d.js', 'utf8');
const seed = eval('(' + src.slice(src.indexOf('const seed = (o) =>') + 'const seed = '.length, src.indexOf('// WCAG AA')).trim().replace(/;$/, '') + ')');
const HIDE = '#welcome-overlay,#login-overlay,#pro-offer-modal,#sync-banner,#trial-banner,#tester-welcome,#vi-fb-btn{display:none!important}';

async function open(b, theme, w, phone) {
  const ctx = await b.newContext({ viewport: { width: w, height: phone ? 844 : 900 }, reducedMotion: 'reduce', isMobile: !!phone, hasTouch: !!phone, deviceScaleFactor: phone ? 2 : 1 });
  await ctx.route(/^https?:\/\/(?!localhost)/, r => r.abort());
  const p = await ctx.newPage(); p._errs = []; p.on('pageerror', e => p._errs.push(e.message));
  await p.addInitScript(seed, { theme, flag: true }); await p.goto(APP); await p.waitForTimeout(1800);
  await p.addStyleTag({ content: HIDE });
  return { ctx, p };
}

(async () => {
  const b = await chromium.launch(); const errs = [];

  // ── 3. the forecast model, straight from the app's own function ──
  {
    const { ctx, p } = await open(b, 'dark', 1100);
    const r = await p.evaluate(() => {
      if (typeof viForecast !== 'function') return null;
      const keep = { inc: ovState.income, exp: ovState.expenses, debts: debtState.debts };
      const run = (income, expenses, debts, start) => { ovState.income = income; ovState.expenses = expenses; debtState.debts = debts; return viForecast(6, start || { nw: 10000, debt: 0 }); };
      const out = {};
      // no savings, no investments, no debts, income all spent: flat
      out.flat = run([{ name: 'Salary', amount: 2000 }], [{ name: 'Rent', amount: 2000, type: 'ce' }], []);
      // unassigned surplus is not counted
      out.surplus = run([{ name: 'Salary', amount: 3000 }], [{ name: 'Rent', amount: 1000, type: 'ce' }], []);
      // savings: adds exactly what is assigned, no interest
      out.sav = run([{ name: 'Salary', amount: 3000 }], [{ name: 'Rent', amount: 1000, type: 'ce' }, { name: 'Savings', amount: 200, type: 'sv' }], []);
      // investments compound at the stated rate
      out.inv = run([{ name: 'Salary', amount: 3000 }], [{ name: 'Rent', amount: 1000, type: 'ce' }, { name: 'ISA', amount: 500, type: 'iv' }], []);
      // a debt with a budgeted repayment falls (after interest); net worth rises
      out.repay = run([{ name: 'Salary', amount: 3000 }], [{ name: 'Rent', amount: 1000, type: 'ce' }, { name: 'Card', amount: 300, cat: 'debt', type: 'ce' }],
        [{ id: 1, name: 'Card', balance: 3000, rate: 24, min: 90 }], { nw: 10000, debt: 3000 });
      // no repayment budgeted: the debt grows by its interest, net worth falls
      out.grow = run([{ name: 'Salary', amount: 3000 }], [{ name: 'Rent', amount: 1000, type: 'ce' }], [{ id: 1, name: 'Card', balance: 3000, rate: 24, min: 90 }], { nw: 10000, debt: 3000 });
      // no repayment and no APR: level
      out.level = run([{ name: 'Salary', amount: 3000 }], [{ name: 'Rent', amount: 1000, type: 'ce' }], [{ id: 1, name: 'Loan', balance: 3000, rate: 0, min: 0 }], { nw: 10000, debt: 3000 });
      // spending more than comes in: decline
      out.neg = run([{ name: 'Salary', amount: 1500 }], [{ name: 'Rent', amount: 1800, type: 'ce' }], []);
      // no budget at all: no growth
      out.none = run([], [], []);
      out.noneNote = (drawChart(), document.getElementById('nw-fc-note').textContent);
      ovState.income = keep.inc; ovState.expenses = keep.exp; debtState.debts = keep.debts; drawChart();
      out.rate = VI_FC_INV_RATE;
      return out;
    });
    if (!r) { ok(false, 'the forecast comes from the Budget (viForecast is missing)'); fails += 0; }
    else {
    const nw = (f) => f.pts.map(x => Math.round(x.nw)), dt = (f) => f.pts.map(x => Math.round(x.debt));
    ok(nw(r.flat).every(v => v === 10000), 'no savings, no investments, no debts: a flat line (' + nw(r.flat).join(',') + ')');
    ok(nw(r.surplus).every(v => v === 10000), 'money not given a job is not counted (£2,000 unassigned, line stays flat)');
    ok(nw(r.sav).join() === [10200, 10400, 10600, 10800, 11000, 11200].join(), 'savings add exactly what the budget assigns, no interest (' + nw(r.sav).join(',') + ')');
    const inc = r.inv.pts.map((x, i) => x.nw - (i ? r.inv.pts[i - 1].nw : 10000));
    ok(inc.every((d, i) => i === 0 || d > inc[i - 1]) && Math.abs(r.inv.pts[5].nw - 10000 - 500 * ((Math.pow(1 + Math.pow(1.04, 1 / 12) - 1, 6) - 1) / (Math.pow(1.04, 1 / 12) - 1))) < 0.01,
      'investments compound monthly at ' + r.rate * 100 + '% a year (gains ' + inc.map(d => d.toFixed(2)).join(', ') + ')');
    ok(dt(r.repay).every((v, i) => v < (i ? dt(r.repay)[i - 1] : 3000)) && nw(r.repay).every((v, i) => v > (i ? nw(r.repay)[i - 1] : 10000)) && Math.round(r.repay.pts[0].debt) === Math.round(3000 * 1.02 - 300),
      'debt repayments make debt fall (after 2% a month interest) and net worth rise (debt ' + dt(r.repay).join(',') + ')');
    ok(dt(r.grow).every((v, i) => v > (i ? dt(r.grow)[i - 1] : 3000)) && nw(r.grow)[5] < 10000, 'no repayment budgeted: the debt grows by its APR and net worth falls (' + dt(r.grow).join(',') + ')');
    ok(dt(r.level).every(v => v === 3000) && nw(r.level).every(v => v === 10000), 'no repayment and no APR: the debt stays level');
    ok(nw(r.neg).every((v, i) => v === 10000 - 300 * (i + 1)), 'negative cash flow means decline (£300 a month: ' + nw(r.neg).join(',') + ')');
    ok(!r.none.hasBudget && nw(r.none).every(v => v === 10000) && /set up your Budget/.test(r.noneNote) && /not a prediction/.test(r.noneNote), 'no budget: no growth, and the note asks for a budget');
    }
    errs.push(...p._errs); await ctx.close();
  }

  for (const [theme, w, phone] of [['dark', 390, true], ['light', 690, true], ['dark', 820, false], ['light', 1100, false], ['dark', 1440, false]]) {
    const T = theme + ' ' + w + ': ';
    const { ctx, p } = await open(b, theme, w, phone);

    // ── 1. no forecast note in the 3D progress card ──
    let r = await p.evaluate(() => { const c = document.getElementById('nw3d-trk-card'); return { card: !!c, note: !!document.getElementById('nw3d-fc-note'), txt: c ? c.textContent : '' }; });
    ok(r.card && !r.note && !/straight line|Forecast:/.test(r.txt), T + 'the Net worth in 3D progress card has no forecast note');

    // ── 3. the note in the Graph view: full width of the tile, says what it rests on ──
    r = await p.evaluate(() => { nw3d.setMain('graph'); chartState.metrics.proj = true; drawChart();
      const n = document.getElementById('nw-fc-note'), fs = parseFloat(getComputedStyle(n).fontSize), info = !!n.querySelector('use[href="#vi-info"]'), c = n.closest('.ov-chart-card'), cs = getComputedStyle(c), nb = n.getBoundingClientRect(), cb = c.getBoundingClientRect();
      const inner = cb.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const proj = document.getElementById('nwChart')._proj, d = nw3d.tracker.data();
      return { fs, info, txt: n.textContent, hid: n.hidden, w: nb.width, inner, align: getComputedStyle(n).textAlign, lines: Math.round(nb.height / parseFloat(getComputedStyle(n).lineHeight || 12)),
        same: JSON.stringify(proj.map(x => Math.round(x.nw))) === JSON.stringify(d.nw.slice(d.today + 1)) };
    });
    ok(!r.hid && r.w >= r.inner - 2 && r.align === 'left' && r.fs === 10.5 && r.info, T + 'the forecast note spans the tile (' + Math.round(r.w) + ' of ' + Math.round(r.inner) + ' px, ' + r.align + ')');
    ok(/from your Budget only/.test(r.txt) && /savings/.test(r.txt) && /investments/.test(r.txt) && /debt payments|no debt payments/.test(r.txt) && /an estimate from what you've entered, not a prediction/i.test(r.txt) && !/—/.test(r.txt) && !/straight line/.test(r.txt),
      T + 'the note says what the forecast rests on: "' + r.txt.slice(0, 110) + '..."');
    ok(r.same, T + 'the 3D progress blocks forecast the same months as the graph');

    // ── 4. History, Goals, Snapshots ──
    r = await p.evaluate(() => {
      const card = document.getElementById('nwChart').closest('.ov-chart-card'), btns = document.querySelector('#nw-more .nw-more-btns');
      const bb = btns.getBoundingClientRect(), cb = card.getBoundingClientRect(), cs = getComputedStyle(card);
      const kids = [...card.children].filter(x => x.offsetParent !== null && x !== document.getElementById('nw-more'));
      const below = kids.every(x => x.getBoundingClientRect().bottom <= bb.top + 1);
      return { inCard: card.contains(document.getElementById('ov-ms-card')) && card.contains(document.getElementById('ov-nwh-card')),
        flow: !!document.querySelector('#ov-page > #ov-ms-card, #ov-page > #ov-nwh-card'),
        labels: [...btns.querySelectorAll('button')].map(x => x.textContent.trim()),
        right: Math.abs(cb.right - parseFloat(cs.paddingRight) - bb.right), below,
        hs: [...btns.querySelectorAll('button')].map(x => Math.round(x.getBoundingClientRect().height)), fs: getComputedStyle(btns.querySelector('button')).fontSize, sum: [...btns.querySelectorAll('button')].reduce((t, x) => t + x.getBoundingClientRect().width, 0) + 2 * parseFloat(getComputedStyle(btns).columnGap), rows: new Set([...btns.querySelectorAll('button')].map(x => Math.round(x.getBoundingClientRect().top))).size,
        closed: document.getElementById('ov-ms-card').hidden && document.getElementById('ov-nwh-card').hidden && document.getElementById('ov-ms-card').offsetParent === null };
    });
    ok(r.inCard && !r.flow, T + 'history, goals and snapshots are off the dashboard flow, inside the net worth tile');
    ok(r.labels.join() === 'History,Goals,Snapshots' && r.right < 3 && r.below, T + 'History, Goals and Snapshots buttons sit bottom right of the tile (' + r.right.toFixed(1) + ' px from the right edge)');
    ok(r.closed, T + 'all three are collapsed by default');
    ok(r.hs.every(h => h === 28) && r.rows === 1 && r.fs === '10px', T + '28 px pills, 10 px labels, on one right-aligned row (' + r.hs.join(',') + ')');
    // the tests block the network, so Syne falls back to a narrower face; the real Syne measured about 19 px wider at 390 (Pedro review 2),
    // so the fallback row must leave that plus 8 px spare
    if (w <= 420) ok(r.sum <= 317, T + 'the pills leave room for the real Syne at this width (' + Math.round(r.sum) + ' px with the fallback font, 317 allowed)');
    const st = async () => p.evaluate(() => ({ ms: document.getElementById('ov-ms-card').offsetParent !== null, tab: document.getElementById('ov-ms-card').getAttribute('data-tab'),
      goals: getComputedStyle(document.querySelector('.ms-col[data-p="goals"]')).display !== 'none', snaps: getComputedStyle(document.querySelector('.ms-col[data-p="snaps"]')).display !== 'none',
      nwh: document.getElementById('ov-nwh-card').offsetParent !== null,
      exp: [...document.querySelectorAll('#nw-more .nw-more-btns button')].map(x => x.getAttribute('aria-expanded')).join() }));
    await p.click('#nw-more button[data-p="goals"]'); let s = await st();
    ok(s.ms && s.goals && !s.snaps && !s.nwh && s.exp === 'false,true,false', T + 'Goals opens the goals panel under the chart');
    await p.click('#nw-more button[data-p="snaps"]'); s = await st();
    ok(s.ms && s.snaps && !s.goals && !s.nwh && s.exp === 'false,false,true', T + 'Snapshots switches to the snapshots panel');
    await p.click('#nw-more button[data-p="history"]'); s = await st();
    ok(s.nwh && !s.ms && s.exp === 'true,false,false', T + 'History opens the history panel, one panel at a time');
    await p.click('#nw-more button[data-p="history"]'); s = await st();
    ok(!s.nwh && !s.ms && s.exp === 'false,false,false', T + 'a second tap closes it');
    // functions still work: add a snapshot, add a goal, the Pro gate on history
    r = await p.evaluate(() => { nwMore('snaps'); document.getElementById('ms-add-snap').open = true;
      const n0 = (ovState.snapshots || []).length; document.getElementById('snap-month').value = '2026-01'; document.getElementById('snap-nw').value = '1234'; document.getElementById('snap-debt').value = '10';
      addSnapshot(); const n1 = (ovState.snapshots || []).length;
      nwMore('goals'); document.getElementById('ms-add-goal').open = true; const g0 = (ovState.customGoals || []).length;
      document.getElementById('goal-name').value = 'Wedding'; document.getElementById('goal-amt').value = '5000'; addCustomGoal(); const g1 = (ovState.customGoals || []).length;
      nwMore('history'); let up = 0; const keep = window.showUpgrade; window.showUpgrade = () => { up++; };
      document.querySelector('#ov-nwh-card button[onclick="openNwHistory()"]').click(); window.showUpgrade = keep;
      const modal = document.getElementById('nwh-modal'); const pro = typeof _isPro === 'function' && _isPro();
      const shown = modal ? modal.style.display : 'none'; try { closeNwHistory(); } catch (e) {}
      const kp = window._isPro, ku = window.showUpgrade; let up2 = 0; window._isPro = () => false; window.showUpgrade = () => { up2++; };
      document.querySelector('#ov-nwh-card button[onclick="openNwHistory()"]').click(); const free = modal.style.display; window._isPro = kp; window.showUpgrade = ku;
      nwMore('history');
      return { snap: n1 === n0 + 1, goal: g1 === g0 + 1, up, pro, modal: shown, up2, free };
    });
    ok(r.snap && r.goal, T + 'adding a snapshot and a goal still works from the folded panels');
    ok(r.pro ? (r.modal === 'flex' && r.up === 0) : (r.up === 1 && r.modal !== 'flex'), T + 'Net Worth History keeps its Pro gate (Pro: ' + r.pro + ', upgrade shown ' + r.up + ', history opened: ' + (r.modal === 'flex') + ')');
    ok(r.up2 === 1 && r.free !== 'flex', T + 'without Pro, History offers the upgrade instead of opening');
    // and in the 3D view the buttons are there too
    r = await p.evaluate(() => { nw3d.setMain('3d'); const b = document.querySelector('#nw-more .nw-more-btns'); return b.offsetParent !== null && document.getElementById('ov-ms-card').hidden; });
    ok(r, T + 'the buttons show in the 3D view as well, panels still closed');

    // no sideways page scroll, on the dashboard and the budget
    for (const tab of ['overview', 'budget']) {
      const sw = await p.evaluate((t) => { showTab(t); return document.documentElement.scrollWidth - document.documentElement.clientWidth; }, tab);
      ok(sw <= 1, T + tab + ': the page never scrolls sideways (' + sw + ')');
    }
    errs.push(...p._errs.map(e => T + e)); await ctx.close();
  }
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})();
