// Phone-class measurement of the two house selectors (owner, 19 Nov 2026: "the house selector dialogue box also slows the tool down").
// 390 px phone, CPU throttled 6x (CDP), Night. For (A) the welcome house-type picker (#w-htypes, six 3D tiles) and (B) the House builder's
// Change house type panel (#hbt-pan #htypes): over a 4 s window while it is open, the main thread's long tasks, the animation-frame
// callbacks per second by loop (which 3D scenes keep drawing behind), and the tap-to-response time of picking a type.
// Run: node tests/perf_house_selector.js   (prints JSON; a measurement, not a pass/fail test)
require('./lib/vi');
const { chromium } = require('playwright'); const routeThree = require('./three_route');
const APP = process.env.VI_APP || require('./lib/vi').FILE_URL;
const HIDE = '#sync-banner,#trial-banner,#pro-offer-modal,#tester-welcome{display:none!important}';
async function page(b, o) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await routeThree(ctx); await ctx.route(/open\.er-api\.com|challenges\.cloudflare\.com|supabase\.co|google\.com\/s2/, r => r.abort());
  const p = await ctx.newPage();
  await p.addInitScript((o) => {
    window.__viPlanStub = 'on'; window.VI_TILES3D = 1; if (o.signin) window.VI_SIGNIN3D = 1;
    // tag every animation-frame callback with the function that asked for it (the loop's name)
    const raf = window.requestAnimationFrame.bind(window); window.__raf = {};
    window.requestAnimationFrame = function (cb) { const s = (new Error().stack || '').split('\n')[2] || ''; const m = s.match(/at (?:new )?([\w$.]+).*?:(\d+):\d+\)?$/); const k = (m ? m[1] + '@' + m[2] : s.trim().slice(-40));
      return raf(function (t) { if (window.__rafOn) window.__raf[k] = (window.__raf[k] || 0) + 1; cb(t); }); };
    window.__lt = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push([e.startTime, e.duration]))).observe({ type: 'longtask', buffered: true }); } catch (e) {}
    window.__ev = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => { if (/pointer|click/.test(e.name)) window.__ev.push([e.name, e.duration]); })).observe({ type: 'event', durationThreshold: 16, buffered: true }); } catch (e) {}
    if (sessionStorage.getItem('__s')) return; sessionStorage.setItem('__s', '1'); localStorage.setItem('vi-theme', 'dark'); localStorage.setItem('vi_declined_demo', 'true');
  }, o);
  const cdp = await ctx.newCDPSession(p);
  await p.goto(APP); await p.waitForTimeout(2500);
  await p.addStyleTag({ content: HIDE + (o.keepLogin ? '' : '#login-overlay{display:none!important}') });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  return p;
}
async function window4s(p) {
  await p.evaluate(() => { window.__raf = {}; window.__rafOn = true; window.__lt0 = performance.now(); });
  await p.waitForTimeout(4000);
  return p.evaluate(() => { window.__rafOn = false; const t0 = window.__lt0, lt = window.__lt.filter(x => x[0] >= t0);
    const per = {}; Object.keys(window.__raf).forEach(k => per[k] = +(window.__raf[k] / 4).toFixed(1));
    return { longTasks: lt.length, longMs: Math.round(lt.reduce((a, x) => a + x[1], 0)), worstMs: Math.round(lt.reduce((a, x) => Math.max(a, x[1]), 0)), rafPerSec: per }; });
}
async function tap(p, sel) {
  await p.evaluate(() => { window.__ev = []; });
  const t = await p.evaluate((sel) => new Promise(res => { const el = document.querySelector(sel); const t0 = performance.now(); el.click(); requestAnimationFrame(() => setTimeout(() => res(Math.round(performance.now() - t0)), 0)); }), sel);
  await p.waitForTimeout(600);
  return { clickToFrameMs: t };
}
(async () => {
  const b = await chromium.launch(); const out = {};
  { // A: welcome picker, tiles in view (the sign-in house is behind the welcome)
    const p = await page(b, { signin: true });
    await p.evaluate(() => document.getElementById('w-htypes').scrollIntoView({ block: 'center' }));
    const t0 = Date.now(); let I; while (Date.now() - t0 < 30000) { I = await p.evaluate(() => viTiles3D.info()); if (I.live.length >= 6) break; await p.waitForTimeout(300); }
    out.welcome = { liveAfterMs: Date.now() - t0, live: I.live.length, mainThreadStartMs: Math.round((I.stats.ctorMs || 0) + (I.stats.loadMs || 0)), open: await window4s(p), tap: await tap(p, '#w-htypes .w-ht[data-type="detached"]') };
    out.welcome.afterTap = await window4s(p);
    await p.context().close();
  }
  { // B: House builder, Change house type panel open over the 3D house
    const p = await page(b, {});
    await p.evaluate(() => { const wo = document.getElementById('welcome-overlay'); if (wo) wo.style.display = 'none'; try { setSetting('view', 'adv'); } catch (e) {} showTab('house'); });
    await p.waitForTimeout(4000);
    out.houseClosed = await window4s(p);
    await p.click('#hbt-chip'); await p.waitForTimeout(300);
    out.housePanel = { open: await window4s(p), tap: await tap(p, '#hbt-pan #htypes .hbtn[data-type="semi"]') };
    await p.context().close();
  }
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.log('FAIL: crashed', e); process.exit(1); });
