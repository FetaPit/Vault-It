// Phone-class measurement of the Feedback sheet (6x CPU, 390 px): tap-to-open, frame rate and long tasks while it is open,
// and how many 3D frames are drawn behind it. Run: node tools/stress_feedback.js [tab] [cpuRate]
require('../tests/lib/vi');
const { chromium } = require('playwright');
const tab = process.argv[2] || 'overview', rate = +(process.argv[3] || 6);
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }), p = await ctx.newPage();
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, r => r.abort());
  await p.addInitScript(() => { localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
    localStorage.setItem('pos_ov1', JSON.stringify({ income: [{ id: 1, name: 'Salary', amount: 3217, cat: 'salary' }], expenses: [{ id: 2, name: 'Rent', amount: 987, type: 'ce' }] })); });
  await p.goto(require('../tests/lib/vi').FILE_URL); await p.waitForTimeout(2500);
  await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#pro-offer-modal,#trial-banner,#tester-welcome{display:none!important}' });
  await p.evaluate(t => showTab(t), tab); await p.waitForTimeout(2500);
  const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate }); await p.waitForTimeout(1500);
  const r = await p.evaluate(async () => {
    const raf0 = window.requestAnimationFrame.bind(window); let appRaf = 0; window.requestAnimationFrame = function (cb) { appRaf++; return raf0(cb) };
    const wait = ms => new Promise(r => setTimeout(r, ms)), frame = () => new Promise(r => raf0(r));
    const longs = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => longs.push(Math.round(e.duration)))).observe({ entryTypes: ['longtask'] }) } catch (e) {}
    const cv = [...document.querySelectorAll('canvas')].filter(c => c.getBoundingClientRect().width > 50).length;
    // draw calls behind the sheet: count WebGL draws by wrapping the contexts' drawElements/drawArrays
    let draws = 0; for (const proto of [WebGLRenderingContext.prototype, window.WebGL2RenderingContext && WebGL2RenderingContext.prototype].filter(Boolean)) for (const f of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) { const o = proto[f]; if (o) proto[f] = function () { draws++; return o.apply(this, arguments) } }
    await wait(500);
    const t0 = performance.now(); document.getElementById('vi-fb-btn').click(); await frame(); await frame(); const open = performance.now() - t0;
    draws = 0; appRaf = 0; let n = 0; const t1 = performance.now(); await new Promise(res => { (function f() { n++; if (performance.now() - t1 < 3000) raf0(f); else res() })() });
    const ar = appRaf, fps = n / ((performance.now() - t1) / 1000), d = draws;
    return { canvases: cv, openMs: Math.round(open), fpsOpen: +fps.toFixed(1), appFramesIn3s: ar, longTasks: longs.length, longMax: Math.max(0, ...longs), longSum: longs.reduce((a, c) => a + c, 0) };
  });
  console.log(JSON.stringify({ tab, cpu: rate + 'x', ...r })); await b.close();
})();
