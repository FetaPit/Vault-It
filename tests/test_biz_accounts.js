// Entrepreneur 1: Business current and Business savings accounts (owner, 8 Nov 2026: "add Business Current and saving line able
// to be added"; "not touch the buidget tab"). A cash account may carry kind 'biz-current' or 'biz-savings' (none = personal, so old
// saves load unchanged). They count in net worth through alTotalCash, show as a Business line on the Dashboard, in the sidebar and in
// 3D net worth, and can be added and edited from Assets and from the Entrepreneur tab. Budget stays exactly as it was.
// Run: node tests/test_biz_accounts.js
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const OLD = { cashAccounts: [{ id: 5, name: 'Savings', type: 'Savings', balance: 2000 }] };
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const w of [1100, 390]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(w + ': ' + String(e.stack || e.message).split(String.fromCharCode(10)).slice(0, 3).join(' < ')));
    await p.addInitScript((old) => { if (localStorage.getItem('pos_al1')) return; localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi_pioneer', 'true');
      localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 })); localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com' }));
      localStorage.setItem('pos_al1', JSON.stringify(old)); }, OLD);
    await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(1500);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
    // ── an old save loads unchanged ──
    const s0 = await p.evaluate(() => ({ cash: alTotalCash(), nw: computeNetWorth(), biz: typeof alTotalBizCash === 'function' ? alTotalBizCash() : null, kinds: alState.cashAccounts.map(a => 'kind' in a) }));
    ok(s0.cash === 2000 && s0.nw === 2000 && s0.biz === 0 && s0.kinds.every(k => !k), w + ': an old save (no kind) loads with the same cash and net worth, and nothing counts as business (' + JSON.stringify(s0) + ')');
    // a budget, to prove it does not move
    await p.evaluate(() => { ovState.income = [{ id: 1, name: 'Salary', amount: 3000, cat: 'salary' }]; ovState.expenses = [{ id: 2, name: 'Rent', amount: 1000, type: 'ce', cat: 'housing', category: 'necessity' }, { id: 3, name: 'ISA', amount: 200, type: 'sv', cat: 'savings' }]; saveState(); });
    const budget = () => p.evaluate(() => { showTab('budget'); return JSON.stringify({ i: cfTotalIn(), o: cfTotalOut(), inc: document.getElementById('cf-income-list').innerText, exp: document.getElementById('cf-expense-list').innerText }); });
    const bud0 = await budget();
    // ── add from the Assets cash form ──
    await p.evaluate(() => showTab('assets')); await p.waitForTimeout(300);
    const opts = await p.evaluate(() => [...document.querySelectorAll('#ca-type option')].map(o => o.value + '=' + o.textContent));
    ok(opts.includes('biz-current=Business current') && opts.includes('biz-savings=Business savings'), w + ': the Assets type choice offers Business current and Business savings (' + opts.join(', ') + ')');
    await p.fill('#ca-name', 'Starling business'); await p.selectOption('#ca-type', 'biz-current'); await p.fill('#ca-bal', '1500');
    await p.click('button[onclick="addCashAccount()"]'); await p.waitForTimeout(200);
    let r = await p.evaluate(() => { const a = alState.cashAccounts.find(x => x.name === 'Starling business'); return { a, cash: alTotalCash(), nw: computeNetWorth(), biz: alTotalBizCash(), saved: JSON.parse(localStorage.getItem('pos_al1')).cashAccounts.find(x => x.name === 'Starling business') }; });
    ok(r.a && r.a.kind === 'biz-current' && r.a.type === 'Business current' && r.saved && r.saved.kind === 'biz-current', w + ': added as kind biz-current and saved (' + JSON.stringify(r.a) + ')');
    ok(r.cash === 3500 && r.nw === 3500 && r.biz === 1500, w + ': a £1,500 Business current account raises cash and net worth by exactly £1,500 (' + r.cash + ', ' + r.nw + ')');
    ok(await p.evaluate(id => { const s = document.getElementById('cash-type-' + id); return !!s && s.value === 'biz-current' && s.selectedOptions[0].textContent === 'Business current'; }, r.a.id), w + ': the cash table shows it as Business current');
    // ── edit the type from Assets: the personal Savings account becomes Business savings, then back ──
    await p.selectOption('#cash-type-5', 'biz-savings'); await p.waitForTimeout(150);
    r = await p.evaluate(() => { const a = alState.cashAccounts.find(x => x.id === 5); return { kind: a.kind, type: a.type, biz: alTotalBizCash(), nw: computeNetWorth() }; });
    ok(r.kind === 'biz-savings' && r.type === 'Business savings' && r.biz === 3500 && r.nw === 3500, w + ': changing the type in Assets makes it Business savings, net worth unchanged (' + JSON.stringify(r) + ')');
    await p.selectOption('#cash-type-5', 'Savings'); await p.waitForTimeout(150);
    r = await p.evaluate(() => { const a = alState.cashAccounts.find(x => x.id === 5); return { kind: 'kind' in a, type: a.type, biz: alTotalBizCash() }; });
    ok(!r.kind && r.type === 'Savings' && r.biz === 1500, w + ': and back to personal Savings (' + JSON.stringify(r) + ')');
    if (w === 390) ok((await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0, '390: Assets does not scroll sideways');
    // ── the Entrepreneur tab: Business accounts card, add and edit ──
    await p.evaluate(() => showTab('biz')); await p.waitForTimeout(300);
    const card = await p.evaluate(() => { const c = document.getElementById('biz-accounts'); return c && { vis: c.offsetParent !== null, cur: document.getElementById('biz-acc-current').textContent, sav: document.getElementById('biz-acc-savings').textContent, rows: c.querySelectorAll('.ba-row').length, f1500: gbpFmt(1500), f0: gbpFmt(0) }; });
    ok(card && card.vis && card.cur === card.f1500 && card.sav === card.f0 && card.rows === 1, w + ': the Entrepreneur tab has a Business accounts card with the two totals (' + JSON.stringify(card && { cur: card.cur, sav: card.sav, rows: card.rows }) + ')');
    await p.fill('#ba-name', 'Tide savings'); await p.selectOption('#ba-kind', 'biz-savings'); await p.fill('#ba-bal', '800'); await p.click('#ba-add'); await p.waitForTimeout(200);
    r = await p.evaluate(() => ({ a: alState.cashAccounts.find(x => x.name === 'Tide savings'), sav: document.getElementById('biz-acc-savings').textContent, nw: computeNetWorth(), rows: document.querySelectorAll('#biz-accounts .ba-row').length, f: gbpFmt(800) }));
    ok(r.a && r.a.kind === 'biz-savings' && r.sav === r.f && r.nw === 4300 && r.rows === 2, w + ': Business savings added from the Entrepreneur tab (' + JSON.stringify({ sav: r.sav, nw: r.nw, rows: r.rows }) + ')');
    await p.fill('#ba-bal-' + r.a.id, '1000'); await p.press('#ba-bal-' + r.a.id, 'Enter'); await p.waitForTimeout(200);
    r = await p.evaluate(() => ({ biz: alTotalBizCash(), sav: document.getElementById('biz-acc-savings').textContent, nw: computeNetWorth(), f: gbpFmt(1000) }));
    ok(r.biz === 2500 && r.sav === r.f && r.nw === 4500, w + ': editing the balance on the Entrepreneur tab updates the total and net worth (' + JSON.stringify(r) + ')');
    if (w === 390) ok((await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0, '390: Entrepreneur does not scroll sideways');
    // ── the Budget has not moved ──
    ok((await budget()) === bud0, w + ': Budget income, spending and lines are exactly as before');
    // ── Dashboard tile, sidebar, 3D net worth ──
    await p.evaluate(() => showTab('overview')); await p.waitForTimeout(800);
    const d = await p.evaluate(() => { const rows = [...document.querySelectorAll('#ov-assets-summary .ov-sum-row')].map(x => x.innerText.replace(/\s+/g, ' ').trim()); viRenderLedger();
      const t = (typeof nw3d !== 'undefined' && nw3d.hero && nw3d.hero.totals) ? nw3d.hero.totals() : null;
      return { rows, total: document.querySelector('#ov-assets-summary .ov-sum-total').textContent, ta: gbpFmt(alTotalAssets()), sbBiz: (document.getElementById('sb-biz-cash') || {}).textContent, sbCash: (document.getElementById('sb-cash') || {}).textContent, f2500: gbpFmt(2500), f2000: gbpFmt(2000),
        nw3: t && t.cols && t.cols.bizcash ? Math.round(t.cols.bizcash.v) : null, nw3cash: t && t.cols && t.cols.cash ? Math.round(t.cols.cash.v) : null, has3d: !!t, legend: (document.getElementById('nw3d-hero-legend') || {}).textContent || '' }; });
    ok(d.rows.some(x => x === 'Business accounts ' + d.f2500) && d.rows.some(x => x === 'Cash and savings ' + d.f2000) && d.total === d.ta, w + ': the Dashboard Own tile shows Business accounts £2,500 beside personal cash £2,000, same total (' + d.rows.join(' | ') + ')');
    ok(d.sbBiz === d.f2500 && d.sbCash === d.f2000, w + ': the sidebar shows Business accounts £2,500 and personal cash £2,000 (' + d.sbBiz + ', ' + d.sbCash + ')');
    if (d.has3d) ok(d.nw3 === 2500 && d.nw3cash === 2000 && /Business accounts/.test(d.legend), w + ': 3D net worth has a Business accounts column of £2,500 and names it in the legend (' + d.nw3 + ', ' + d.nw3cash + ')');
    else console.log('note: 3D net worth not running here (' + w + ')');
    // ── survives a reload ──
    await p.reload(); await p.waitForTimeout(1500);
    r = await p.evaluate(() => ({ biz: alTotalBizCash(), nw: computeNetWorth(), kinds: alState.cashAccounts.map(a => a.kind || '-').join(',') }));
    ok(r.biz === 2500 && r.nw === 4500 && r.kinds === '-,biz-current,biz-savings', w + ': kinds and totals survive a reload (' + JSON.stringify(r) + ')');
    await ctx.close();
  }
  ok(errs.length === 0, 'no page errors ' + errs.join('|'));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
