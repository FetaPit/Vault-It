// v0.7 final round, step 1: the ?perf=1 on-device performance overlay with a Copy report button.
// Off unless the URL has perf=1 (or the flag it left in localStorage); ?perf=0 turns it off again. Run: node tests/test_perf_overlay.js
const { chromium } = require('playwright');
const routeThree = require('./three_route');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const SEED = () => { if (localStorage.getItem('ht3')) return; localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 })); localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com' })); localStorage.setItem('vi_pioneer', JSON.stringify({ active: true, email: 't@t.com' })); localStorage.setItem('ht3', JSON.stringify({ saved: 20000, target: 120000, houseType: 'terraced', depositPct: 20, prices: { terraced: 120000, semi: 320000, detached: 500000, mansion: 1500000, flat: 80000, apartment: 300000 }, deposits: [{ amount: 20000, date: '30/10/2026' }] })); };
(async () => {
  const b = await chromium.launch(); const errs = [];
  async function open(w, qs) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 } }); await routeThree(ctx);
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
    await p.addInitScript(SEED);
    await p.goto('file:///home/user/Vault-It/index.html' + qs); await p.waitForTimeout(1500);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#pro-offer-modal{display:none!important}' });
    return { ctx, p };
  }
  // off by default: nothing in the page
  { const { ctx, p } = await open(390, '');
    await p.evaluate(() => showTab('house')); await p.waitForTimeout(2500);
    ok(await p.evaluate(() => !document.getElementById('vi-perf') && !window.VIPERF), 'off without perf=1: no panel, no global');
    await ctx.close(); }
  for (const w of [390, 1100]) {
    const { ctx, p } = await open(w, '?perf=1');
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
    await p.evaluate(() => showTab('house')); await p.waitForTimeout(6000);
    const r = await p.evaluate(() => { const e = document.getElementById('vi-perf'); if (!e) return null; const bb = e.getBoundingClientRect(); return { txt: e.innerText, w: bb.width, h: bb.height, right: bb.right, bottom: bb.bottom, vw: innerWidth, vh: innerHeight }; });
    ok(!!r, w + ': panel shows with ?perf=1');
    if (r) {
      ok(/fps/i.test(r.txt) && /p50/.test(r.txt) && /p95/.test(r.txt) && />33/.test(r.txt) && /long task/i.test(r.txt), w + ': fps, p50/p95/max, >33 ms count, long tasks listed');
      ok(/dpr/i.test(r.txt) && /canvas/i.test(r.txt) && /renderer/i.test(r.txt) && /bricks/i.test(r.txt) && /engine/i.test(r.txt), w + ': DPR, canvas, renderer, bricks, engine path listed');
      ok(/first 3d frame/i.test(r.txt) && /build/i.test(r.txt) && /orbit/i.test(r.txt), w + ': first-frame, build and orbit timings listed');
      ok(r.w <= 260 && r.right <= r.vw && r.bottom <= r.vh, w + ': panel is small and inside the viewport (' + Math.round(r.w) + 'x' + Math.round(r.h) + ')');
    }
    const live = await p.evaluate(() => window.VIPERF && VIPERF.snapshot ? VIPERF.snapshot() : null);
    ok(live && live.frames > 0 && live.firstFrameMs > 0 && live.bricks > 1000, w + ': frames counted, first 3D frame timed, bricks counted (' + JSON.stringify(live && { f: live.frames, ff: live.firstFrameMs && Math.round(live.firstFrameMs), b: live.bricks }) + ')');
    // does not block the stage: the panel itself lets taps through except on its own buttons
    ok(await p.evaluate(() => { const e = document.getElementById('vi-perf'); return getComputedStyle(e).pointerEvents === 'none' && [].every.call(e.querySelectorAll('button'), x => getComputedStyle(x).pointerEvents !== 'none'); }), w + ': panel passes taps through to the house stage; only its buttons take them');
    // drag the stage to get an orbit sample
    const box = await p.evaluate(() => { const r = document.getElementById('house-scene').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await p.evaluate(() => document.getElementById('house-scene').scrollIntoView({ block: 'center' })); await p.waitForTimeout(300);
    const bx = await p.evaluate(() => { const r = document.getElementById('house-scene').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await p.mouse.move(bx.x, bx.y); await p.mouse.down(); for (let i = 0; i < 25; i++) { await p.mouse.move(bx.x + i * 3, bx.y + i, { steps: 1 }); await p.waitForTimeout(30); } await p.mouse.up();
    // report
    await p.evaluate(() => { window.__clip = null; });
    await p.click('#vi-perf button[data-act="copy"]'); await p.waitForTimeout(500);
    const rep = await p.evaluate(async () => { try { return await navigator.clipboard.readText(); } catch (e) { const t = document.querySelector('#vi-perf textarea'); return t ? t.value : null; } });
    ok(rep && /userAgent/i.test(rep) && /viewport/i.test(rep) && /devicePixelRatio/i.test(rep) && /house type/i.test(rep) && /date/i.test(rep) && /fps/i.test(rep) && /orbit/i.test(rep), w + ': Copy report gives plain text with userAgent, viewport, DPR, house type, date and the timings');
    // clipboard refused: fallback textarea
    await p.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) }, configurable: true }); });
    await p.click('#vi-perf button[data-act="copy"]'); await p.waitForTimeout(500);
    ok(await p.evaluate(() => { const t = document.querySelector('#vi-perf textarea'); return !!t && /userAgent/i.test(t.value); }), w + ': clipboard refused: report shows in a textarea to copy by hand');
    await ctx.close();
  }
  // flag sticks, ?perf=0 clears (own context with no signed-in test session: the app's sign-out wipes device storage by design)
  { const ctx = await b.newContext({ viewport: { width: 390, height: 900 } }); const p = await ctx.newPage();
    await p.goto('file:///home/user/Vault-It/index.html?perf=1'); await p.waitForTimeout(800);
    await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForSelector('#vi-perf', { timeout: 8000 }).catch(() => {});
    ok(await p.evaluate(() => !!document.getElementById('vi-perf') && localStorage.getItem('vi-perf') === '1'), 'flag remembered (localStorage) on the next visit');
    await p.goto('file:///home/user/Vault-It/index.html?perf=0'); await p.waitForTimeout(1500);
    ok(await p.evaluate(() => !document.getElementById('vi-perf') && !localStorage.getItem('vi-perf')), '?perf=0 turns it off');
    await ctx.close(); }
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
