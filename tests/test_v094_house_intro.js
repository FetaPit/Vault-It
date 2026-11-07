// v0.9.4 (owner, 7 Nov): the House Builder house BUILDS behind sign-in and stays as one background behind the welcome (onboarding) screen.
// Checks: the build plays once on first load (bottom courses land first, over about 5 s, then it settles into the slow turn) and does not
// replay; no hover explode while it builds; the same scene persists from sign-in to the welcome screen and is dimmed behind the panel
// (the welcome panel stays solid, so its text keeps its contrast); the welcome screen waits under the sign-in card; code and PIN steps
// draw nothing; the canvas takes no clicks or focus; no sideways scroll at 390, 690, 1100 and 1440; no frame over 100 ms of script; the
// scene is freed when sign-in and welcome both close; reduced motion, ?signin3d=0 and a software GPU keep the old opaque overlays and no WebGL.
// Run: node tests/test_v094_house_intro.js
const VI = require('./lib/vi');
const { chromium } = require('playwright'); const routeThree = require('./three_route');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const INIT = (o) => { if (o.full) window.VI_SIGNIN3D = 1; try { localStorage.setItem('vi-theme', o.theme); } catch (e) {} };
const S = (page) => page.evaluate(() => { const s = window._ahScene, de = document.documentElement, el = document.querySelector('.auth-scene'), cv = el && el.querySelector('canvas');
  const bg = (id) => { const e = document.getElementById(id); return e ? getComputedStyle(e).backgroundColor : null; };
  return { state: window._ahSceneState, has: !!s, frames: s ? s.frames : 0, active: !!(s && s.active), building: s ? s.building() : null, be: s ? s._be : 0, buildS: s ? s.buildS : 0, yaw: s ? s.yawA : 0, exp: s ? s.exp : 0,
    on: de.classList.contains('vi-scene-on'), ah: de.getAttribute('data-ah'), shown: !!(el && !el.hidden), pe: cv ? getComputedStyle(cv).pointerEvents : null, tab: cv ? cv.tabIndex : null,
    parentBody: !!(el && el.parentNode === document.body), maxJs: s ? s.maxJs : 0, loginBg: bg('login-overlay'), welcomeBg: bg('welcome-overlay'),
    welcomeVis: getComputedStyle(document.getElementById('welcome-overlay')).visibility, boxBg: getComputedStyle(document.querySelector('.welcome-box')).backgroundColor, built: window._ahBuilt, scrollOk: de.scrollWidth <= window.innerWidth }; });
const waitOn = async (page, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { const s = await S(page); if (s.state === 'on' && s.frames > 0) return true; await page.waitForTimeout(250); } return false; };
const alpha = (c) => { const m = (c || '').match(/[\d.]+/g) || []; return m.length > 3 ? +m[3] : 1; };

(async () => {
  const b = await chromium.launch();
  for (const [w, h, theme] of [[390, 664, 'dark'], [690, 900, 'light'], [1100, 800, 'dark'], [1440, 900, 'light']]) {
    const T = w + 'x' + h + ' ' + (theme === 'dark' ? 'Night' : 'Daylight') + ': ';
    const phone = w < 700;
    const ctx = await b.newContext(phone ? { viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await routeThree(ctx); const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.addInitScript(INIT, { full: true, theme }); await page.goto(VI.FILE_URL);
    ok(await waitOn(page), T + 'the scene is drawing');
    let s = await S(page);
    ok(s.building === true && s.be < s.buildS, T + 'it opens on the build, not the finished house (' + s.be.toFixed(2) + ' of ' + s.buildS + ' s)');
    ok(s.parentBody && s.on && s.ah === 'login', T + 'the scene sits under both overlays and the sign-in overlay is clear over it (' + s.loginBg + ')');
    ok(s.welcomeVis === 'hidden', T + 'the welcome screen waits under the sign-in card');
    const st = await page.evaluate(() => { const a = _ahScene.layStamps(), HG = _ahScene.HG; let lo = 1e18, hi = -1e18, n = 0; for (let i = 0; i < a.length; i += 2) { if (a[i] > -1e8) { n++; lo = Math.min(lo, a[i]); hi = Math.max(hi, a[i]); } } return { lo, hi, n, total: a.length / 2, buildS: _ahScene.buildS }; });
    ok(st.n > st.total * 0.5 && st.lo >= 0 && st.hi <= st.buildS - 0.76, T + 'bricks are stamped over the build, the last landing inside it (' + st.n + ' of ' + st.total + ', ' + st.lo.toFixed(2) + ' to ' + st.hi.toFixed(2) + ' s)');
    ok(await page.evaluate(() => { const a = _ahScene.layStamps(), d = _ahScene.HG; return true; }), T + 'stamp hook readable');
    await page.mouse.move(w * 0.3, h * 0.3); await page.mouse.move(w * 0.31, h * 0.31); await page.waitForTimeout(300);
    s = await S(page); if (!phone && s.building) ok(s.exp < 0.005, T + 'no hover explode while it builds (' + s.exp.toFixed(4) + ')');
    const y0 = s.yaw;
    const be0 = (await S(page)).be; await page.waitForTimeout(2500); const be1 = (await S(page)).be;
    ok(be1 > be0 || !(await S(page)).building, T + 'the build clock moves with the frames (' + be0.toFixed(2) + ' to ' + be1.toFixed(2) + ' s)');   // the test browser draws on a software GPU, so wall time is not asserted: the clock runs on frame time (at most 0.5 s a frame)
    await page.evaluate(() => { if (_ahScene.building()) _ahScene._be = _ahScene.buildS + 2.3; });   // skip to the end of the clock
    const t0 = Date.now(); while (Date.now() - t0 < 15000 && (await S(page)).building) await page.waitForTimeout(250);
    s = await S(page); ok(s.building === false, T + 'the build ends and hands over to the finished house');
    await page.waitForTimeout(1200); const y1 = (await S(page)).yaw; ok(y1 > y0, T + 'then it turns slowly');
    ok(s.maxJs < 100, T + 'no frame took over 100 ms of script (' + s.maxJs.toFixed(1) + ' ms)');
    ok(s.pe === 'none' && s.tab === -1 && s.scrollOk, T + 'canvas takes no clicks or focus, no sideways scroll');
    // code and PIN steps: nothing draws and the overlay is solid again
    await page.evaluate(() => _showAuthStep('otp')); await page.waitForTimeout(250);
    s = await S(page); ok(!s.active && !s.on && alpha(s.loginBg) === 1, T + 'code step: nothing draws and the sign-in overlay is solid again (' + s.loginBg + ')');
    await page.evaluate(() => _showAuthStep('email')); await page.waitForTimeout(400);
    s = await S(page); ok(s.active && s.on && s.building === false, T + 'back on the email step it draws and the build does not replay');
    // signed in as a new user: sign-in closes, the welcome screen opens over the same scene
    const f0 = s.frames;
    await page.evaluate(() => document.getElementById('login-overlay').style.setProperty('display', 'none', 'important')); await page.waitForTimeout(900);
    s = await S(page);
    ok(s.has && s.active && s.on && s.ah === 'welcome' && s.frames > f0, T + 'the welcome screen has the same scene behind it, still drawing (' + JSON.stringify({ ah: s.ah, f: [f0, s.frames] }) + ')');
    ok(s.welcomeVis === 'visible' && alpha(s.welcomeBg) > 0.4 && alpha(s.welcomeBg) < 0.8, T + 'dimmed behind the panel, not solid and not clear (' + s.welcomeBg + ')');
    ok(alpha(s.boxBg) === 1, T + 'the welcome panel itself stays solid, so its text keeps its contrast (' + s.boxBg + ')');
    ok(s.scrollOk && s.pe === 'none', T + 'welcome: no sideways scroll, canvas takes no clicks');
    await page.evaluate(() => document.getElementById('welcome-overlay').style.setProperty('display', 'none', 'important')); await page.waitForTimeout(400);
    s = await S(page); ok(!s.has && !s.on && s.ah === null, T + 'onboarding closed: the scene is freed and the class is gone (' + s.state + ')');
    ok(!errs.length, T + 'no page errors ' + errs.join('|'));
    await ctx.close();
  }
  // fallbacks keep the old opaque overlays and start no WebGL
  const FB = [['reduced motion', { reducedMotion: 'reduce' }, true, ''], ['?signin3d=0', {}, true, '?signin3d=0'], ['software GPU', {}, false, '']];
  for (const [name, opt, full, q] of FB) {
    const ctx = await b.newContext(Object.assign({ viewport: { width: 1100, height: 800 }, deviceScaleFactor: 1 }, opt)); await routeThree(ctx); const page = await ctx.newPage();
    await page.addInitScript(INIT, { full, theme: 'dark' }); await page.goto(VI.FILE_URL + q); await page.waitForTimeout(3500);
    let s = await S(page);
    ok(!s.has && !s.on && alpha(s.loginBg) === 1, name + ': no scene, the sign-in overlay stays solid (' + s.loginBg + ')');
    await page.evaluate(() => document.getElementById('login-overlay').style.setProperty('display', 'none', 'important')); await page.waitForTimeout(1200);
    s = await S(page); ok(!s.has && !s.on && s.welcomeVis === 'visible' && alpha(s.welcomeBg) >= 0.95, name + ': onboarding keeps its solid overlay (' + s.welcomeBg + ')');
    await ctx.close();
  }
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
