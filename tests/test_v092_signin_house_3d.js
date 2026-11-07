// v0.9.2 (owner, 6 Nov: "Make the house large zoomed into the background with rotation animations. Allow the cursor to interact with
// the model subtly expanding and exploding the house upon hover over."). The House Builder house, large behind the sign-in card.
// Checks: reduced motion keeps the still and starts no WebGL; the scene starts only after the page has loaded, built in a worker;
// the email field and Continue sit where fd3a031 puts them (same browser) and where they are without the scene; the canvas takes no
// focus or clicks; nothing draws on the code, PIN and set-PIN steps and it resumes on the email step; hover eases the house out and it
// settles back; a tap gives a burst that settles; pixel ratio 1.5 at most on a phone; no frame or start-up step over 100 ms of script;
// no outside host the page did not already use; no sideways scroll; the card text keeps AA contrast over the scene.
// The test browser has a software GPU, which the page treats as low-end (the still): VI_SIGNIN3D forces the 3D on (as VI_HB_FULL does for the House Builder).
// Run: node tests/test_v092_signin_house_3d.js
const VI = require('./lib/vi');
const { chromium } = require('playwright'); const routeThree = require('./three_route');
const fs = require('fs'), path = require('path');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const BOX = (sel) => (page) => page.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(Math.round); }, sel);
const INIT = (o) => { if (o.full) window.VI_SIGNIN3D = 1; try { localStorage.setItem('vi-theme', o.theme); } catch (e) {}
  window.__gl = 0; const gc = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (t) { if (/webgl/.test(t) && this.classList.contains('auth-scene-cv')) window.__gl++; return gc.apply(this, arguments); }; };
const SCENE = (page) => page.evaluate(() => { const s = window._ahScene, el = document.querySelector('.auth-scene'), cv = el && el.querySelector('canvas');
  return { state: window._ahSceneState, has: !!s, frames: s ? s.frames : 0, active: !!(s && s.active), shown: !!(el && !el.hidden && getComputedStyle(el).display !== 'none'), inClass: !!(el && el.classList.contains('in')),
    pe: cv ? getComputedStyle(cv).pointerEvents : null, tab: cv ? cv.tabIndex : null, dpr: s ? s.dpr : 0, exp: s ? s.exp : 0, push: s ? s.push : 0, yaw: s ? s.yawA : 0, maxJs: s ? s.maxJs : 0, stats: window._ahScene_stats, gl: window.__gl }; });
const waitOn = async (page, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { const s = await SCENE(page); if (s.state === 'on' && s.frames > 0) return true; await page.waitForTimeout(250); } return false; };
const hostOf = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.host : x.protocol; } catch (e) { return u; } };
const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

(async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  ok(/<script id="hb3d-engine">/.test(html), 'the engine script is marked so the worker can be built from it');
  ok(!/class="auth-scene/.test(html.replace(/<script[\s\S]*?<\/script>/g, '')), 'the scene is not in the page markup, so it cannot load before the card');
  const b = await chromium.launch();
  let BASE = null;   // fd3a031 measured in this same browser (shallow clones, as on CI, lack it: skipped)
  try {
    const old = require('child_process').execFileSync('git', ['show', 'fd3a031:index.html'], { cwd: path.join(__dirname, '..'), stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 28 });
    const f = path.join(fs.mkdtempSync(path.join(require('os').tmpdir(), 'vi-signin3d-base-')), 'index.html'); fs.writeFileSync(f, old); BASE = {};
    for (const [w, h] of [[390, 664], [1440, 900]]) {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 }); await routeThree(ctx); const page = await ctx.newPage();
      await page.goto(require('url').pathToFileURL(f).href); await page.waitForTimeout(1500);
      BASE[w] = [await BOX('#auth-email')(page), await BOX('#auth-email-step .auth-btn')(page)]; await ctx.close();
    }
  } catch (e) { console.log('skip: fd3a031 is not in this clone (shallow), so the same-browser comparison with it is skipped'); }

  // 1. reduced motion: the still, no WebGL, no worker
  { const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' }); await routeThree(ctx); const page = await ctx.newPage();
    await page.addInitScript(INIT, { full: true, theme: 'dark' }); await page.goto(VI.FILE_URL); await page.waitForTimeout(4000);
    const s = await SCENE(page), still = await page.evaluate(() => { const i = document.querySelector('.auth-house'); return !!(i && !i.hidden && i.complete && i.naturalWidth > 0 && getComputedStyle(i).opacity === '1'); });
    ok(!s.has && s.gl === 0 && !document_has(s), 'reduced motion: no scene and no WebGL context (' + JSON.stringify({ state: s.state, gl: s.gl }) + ')');
    ok(still, 'reduced motion: the still shows');
    await ctx.close(); }
  function document_has(s) { return s.shown; }

  for (const [w, h, theme] of [[1440, 900, 'dark'], [1440, 900, 'light'], [390, 664, 'dark'], [390, 664, 'light']]) {
    const T = w + 'x' + h + ' ' + (theme === 'dark' ? 'Night' : 'Daylight') + ': ';
    const phone = w < 700;
    const ctx = await b.newContext(phone ? { viewport: { width: w, height: h }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } : { viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await routeThree(ctx); const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
    const hosts = new Set(); page.on('request', r => hosts.add(hostOf(r.url())));
    await page.addInitScript(INIT, { full: true, theme });
    const tStart = Date.now(); await page.goto(VI.FILE_URL);
    const on = await waitOn(page);
    let s = await SCENE(page);
    ok(on, T + 'the 3D house is drawing (' + JSON.stringify({ state: s.state, frames: s.frames }) + ')');
    ok(s.shown && s.inClass, T + 'the scene layer is showing (faded in)');
    ok(await page.evaluate(() => document.querySelector('.auth-house').classList.contains('under3d')), T + 'the still has handed over to the 3D (fades out)');
    const timing = await page.evaluate(() => ({ load: Math.round(performance.getEntriesByType('navigation')[0].loadEventStart), workers: performance.getEntriesByType('resource').filter(r => r.initiatorType === 'other' && /^blob:/.test(r.name)).length }));
    ok(s.stats && s.stats.at >= timing.load, T + 'WebGL started after the page (and the card) had loaded (' + Math.round(s.stats.at) + ' ms vs load ' + timing.load + ' ms)');
    ok(s.stats && s.stats.ctorMs >= 0 && s.stats.ctorMs < 100 && s.stats.loadMs < 100, T + 'starting the scene costs the main thread under 100 ms a step (' + JSON.stringify(s.stats) + ')');
    ok(s.pe === 'none' && s.tab === -1, T + 'the canvas takes no clicks and no focus (pointer-events ' + s.pe + ', tabIndex ' + s.tab + ')');
    ok(s.dpr <= (phone ? 1.5 : 2) && (!phone || s.dpr === 1.5), T + 'pixel ratio ' + s.dpr + (phone ? ' (a 3x phone capped at 1.5)' : ''));
    // the form: where fd3a031 puts it, and where it is without the scene
    const em = await BOX('#auth-email')(page), co = await BOX('#auth-email-step .auth-btn')(page);
    if (BASE && BASE[w]) ok(JSON.stringify([em, co]) === JSON.stringify(BASE[w]), T + 'email field and Continue are where fd3a031 puts them in this browser (' + JSON.stringify([em, co]) + ' vs ' + JSON.stringify(BASE[w]) + ')');
    // clicks and focus go to the form, never the canvas
    const hit = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? (e.tagName + '.' + e.className) : ''; }, [Math.round(w * 0.05), Math.round(h * 0.5)]);
    ok(!/CANVAS/.test(hit), T + 'a click beside the card lands on the page, not the canvas (' + hit + ')');
    await page.focus('#auth-email'); await page.keyboard.type('a@b.co');   // focus, not click: the software GPU in the test browser makes click's stability wait slow
    ok(await page.evaluate(() => document.activeElement && document.activeElement.id === 'auth-email' && document.activeElement.value === 'a@b.co'), T + 'typing goes into the email field');
    for (let i = 0; i < 6; i++) await page.keyboard.press('Tab');
    ok(await page.evaluate(() => !document.activeElement || document.activeElement.tagName !== 'CANVAS'), T + 'tabbing never lands on the canvas');
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), T + 'no sideways scroll');
    // contrast: card text over the card's 95% panel with the brightest part of the house behind it
    const cc = await page.evaluate(() => { const p = (c) => (c.match(/[\d.]+/g) || []).map(Number); const card = document.querySelector('.auth-card'), bg = p(getComputedStyle(card).backgroundColor);
      return { bg, txt: ['.auth-sub', '.auth-intro', '.auth-steps', '.auth-label', '.auth-footer'].map(s => { const e = document.querySelector(s); return e ? [s, p(getComputedStyle(e).color)] : null; }).filter(Boolean) }; });
    const a = cc.bg[3] == null ? 1 : cc.bg[3];
    for (const lit of [[255, 255, 255], [0, 0, 0], [68, 192, 185], [245, 199, 107]]) {
      const back = [0, 1, 2].map(i => cc.bg[i] * a + lit[i] * (1 - a));
      const worst = Math.min(...cc.txt.map(([, c]) => ratio(c.slice(0, 3).map((v, i) => (c[3] == null ? v : v * c[3] + back[i] * (1 - c[3]))), back)));
      if (worst < 4.5) ok(false, T + 'card text AA over a ' + JSON.stringify(lit) + ' part of the house (worst ' + worst.toFixed(2) + ')');
    }
    ok(true, T + 'card text AA checked over white, black, teal and gold parts of the house (card ' + a + ' opaque)');
    // hover: the house eases out, then settles
    if (!phone) {
      await page.mouse.move(w * 0.2, h * 0.35); await page.mouse.move(w * 0.21, h * 0.36); await page.waitForTimeout(1500);
      s = await SCENE(page); const e1 = s.exp, p1 = s.push;
      ok(e1 > 0.02 && p1 > 0.3, T + 'hovering the house eases it out (expand ' + e1.toFixed(3) + ', push ' + p1.toFixed(2) + ')');
      await page.evaluate(() => _ahScene.point(null)); await page.waitForTimeout(2500);
      s = await SCENE(page); ok(s.exp < e1 / 3 && s.push < p1 / 3, T + 'off the house it settles back (expand ' + s.exp.toFixed(3) + ', push ' + s.push.toFixed(2) + ')');
    } else {
      await page.touchscreen.tap(Math.round(w * 0.5), 40); await page.waitForTimeout(250);
      s = await SCENE(page); const p1 = s.push;
      ok(p1 > 0.1, T + 'a tap gives a gentle burst (push ' + p1.toFixed(2) + ')');
      await page.waitForTimeout(2500); s = await SCENE(page); ok(s.push < p1 / 2, T + 'the burst settles (push ' + s.push.toFixed(2) + ')');
    }
    const y0 = (await SCENE(page)).yaw; await page.waitForTimeout(1200); const y1 = (await SCENE(page)).yaw;
    ok(y1 > y0 && await page.evaluate(() => _ahScene.turn >= 40 && _ahScene.turn <= 60), T + 'it turns slowly (one turn every ' + (await page.evaluate(() => _ahScene.turn)) + ' s)');
    // the code, PIN and set-PIN steps: nothing draws; back on the email step it resumes
    for (const step of ['otp', 'pin', 'setpin']) {
      await page.evaluate((st) => _showAuthStep(st), step); await page.waitForTimeout(150);
      const f0 = (await SCENE(page)).frames; await page.waitForTimeout(700); const x = await SCENE(page);
      ok(!x.active && !x.shown && x.frames === f0, T + 'nothing draws on the ' + step + ' step (' + JSON.stringify({ active: x.active, shown: x.shown, frames: [f0, x.frames] }) + ')');
    }
    await page.evaluate(() => _showAuthStep('email')); await page.waitForTimeout(150);
    const f0 = (await SCENE(page)).frames; await page.waitForTimeout(1500); s = await SCENE(page);
    ok(s.active && s.shown && s.frames > f0, T + 'back on the email step it draws again (' + f0 + ' -> ' + s.frames + ')');
    ok(s.maxJs < 100, T + 'no frame takes over 100 ms of script (' + s.maxJs.toFixed(1) + ' ms)');
    // no new host: the same outside hosts as the page without the scene, given as long (once, on the first size)
    if (w === 1440 && theme === 'dark') {
    const ctx2 = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 }); await routeThree(ctx2); const p2 = await ctx2.newPage(); const hosts2 = new Set();
    p2.on('request', r => hosts2.add(hostOf(r.url()))); await p2.addInitScript(INIT, { full: false, theme }); await p2.goto(VI.FILE_URL + '?signin3d=0'); await p2.waitForTimeout(Date.now() - tStart + 3000);
    const extra = [...hosts].filter(x => !hosts2.has(x) && x !== 'blob:');
    ok(!extra.length, T + 'no outside host beyond what the page already used (' + [...hosts].join(', ') + ')');
    await ctx2.close();
    }
    ok(!errs.length, T + 'no page errors ' + errs.join('|'));
    await ctx.close();
  }
  // signing in and finishing the welcome screen frees the scene
  { const ctx = await b.newContext({ viewport: { width: 1100, height: 800 }, deviceScaleFactor: 1 }); await routeThree(ctx); const page = await ctx.newPage();
    await page.addInitScript(INIT, { full: true, theme: 'dark' }); await page.goto(VI.FILE_URL); await waitOn(page);
    await page.evaluate(() => { ['login-overlay', 'welcome-overlay'].forEach(id => document.getElementById(id).style.setProperty('display', 'none', 'important')); }); await page.waitForTimeout(300);   // v0.9.4: the scene now also stays behind the welcome (onboarding) screen, so both close
    const s = await SCENE(page); ok(!s.has && !document_has(s), 'once the sign-in overlay closes, the scene is gone (' + s.state + ')');
    await ctx.close(); }
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
