// v0.7 E2 (owner, 1 Nov): the Financial freedom roadmap opens at the user's next achievement, not at the start ("for me it's Debt halved").
// Pedro C1: the next stage is centred on a fresh load, and again each time the Overview tab opens. Seeded here: two stages done, the third is next.
// Run: node tests/test_v07_e2.js
const { chromium } = require('playwright');
const APP = process.env.VI_APP || 'file:///home/user/Vault-It/index.html';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const seed = () => {
  localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  localStorage.setItem('pos_ov1', JSON.stringify({ income: [{ id: 1, name: 'Salary', amount: 2400, cat: 'salary' }], expenses: [{ id: 3, name: 'Rent', amount: 700, type: 'ce' }], snapshots: [{ date: '2026-10-01', nw: 1000, assets: 1000, liabilities: 0 }], manual: { noDebt: true } }));
};
(async () => {
  const b = await chromium.launch();
  for (const w of [390, 768]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: w < 600, hasTouch: w < 600 });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(seed); await p.goto(APP); await p.waitForTimeout(2000);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
    const info = () => p.evaluate(() => { const S = renderFIREroadmap._stages || fireBuildStages(), sc = document.getElementById('fire-timeline-scroll'); const want = Math.max(0, Math.min(sc.scrollWidth - sc.clientWidth, S.nextIdx * FIRE_NODE + FIRE_LEFT - sc.clientWidth / 2)); return { next: S.nextIdx, sl: Math.round(sc.scrollLeft), want: Math.round(want), max: sc.scrollWidth - sc.clientWidth }; });
    let r = await info(); const t = w + 'px: ';
    ok(r.next > 0, t + 'seeded: the next stage is not the first (' + r.next + ')');
    ok(Math.abs(r.sl - r.want) <= 24, t + 'fresh load: the next stage is centred (scroll ' + r.sl + ', want ' + r.want + ')');
    await p.evaluate(() => { document.getElementById('fire-timeline-scroll').scrollLeft = 900; });
    await p.waitForTimeout(300);
    await p.evaluate(() => { showTab('budget'); }); await p.waitForTimeout(400);
    await p.evaluate(() => { showTab('overview'); }); await p.waitForTimeout(900);
    r = await info();
    ok(Math.abs(r.sl - r.want) <= 24, t + 'each time the tab opens it re-centres on the next stage (scroll ' + r.sl + ', want ' + r.want + ')');
    ok(errs.length === 0, t + 'no page errors ' + errs.slice(0, 1));
    await ctx.close();
  }
  // a late sync: the page first paints with no data, then the real data arrives; the roadmap must follow to the new next stage
  { const ctx = await b.newContext({ viewport: { width: 390, height: 900 }, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); await p.addInitScript(() => { localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 })); });
    await p.goto(APP); await p.waitForTimeout(2000);
    await p.evaluate(() => { ovState.snapshots = [{ date: '2026-10-01', nw: 1000, assets: 1000, liabilities: 0 }]; ovState.manual = Object.assign(ovState.manual || {}, { noDebt: true }); renderFIREroadmap(); });
    await p.waitForTimeout(600);
    const r = await p.evaluate(() => { const S = renderFIREroadmap._stages, sc = document.getElementById('fire-timeline-scroll'); return { next: S.nextIdx, sl: Math.round(sc.scrollLeft), want: Math.round(S.nextIdx * FIRE_NODE + FIRE_LEFT - sc.clientWidth / 2) }; });
    ok(r.next > 0 && Math.abs(r.sl - r.want) <= 24, 'late data: the roadmap moves to the new next stage (next ' + r.next + ', scroll ' + r.sl + ', want ' + r.want + ')');
    await ctx.close(); }
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
