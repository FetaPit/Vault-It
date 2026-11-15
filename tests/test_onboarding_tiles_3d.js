// Onboarding chunk 2: the house type tiles in 3D (owner, 12 Nov 2026: "Make the icons for the house type in the app minuture 3D
// models of our exisiting models that we use in the house builder that can be rotated with the same viewport background."; 15 Nov:
// "Go with the 3D house tiles. happy with icons"). Brief: docs/briefs/ONBOARDING_FEEDBACK_12NOV.md, "Chunk 2".
//   1. the six tiles (#w-htypes .w-ht) keep their slate still and name; each icon box has the House builder viewport background
//      (--stage-bg); nothing 3D starts while the sign-in card is on top
//   2. once the welcome is showing and the tiles are in view: ONE canvas for all six (one WebGL context), each tile goes live after
//      its own first frame, and its model is the House builder's own (same instance count as HB3D.build(type, clean))
//   3. drag sideways turns that tile's model, does not pick it, never scrolls the page sideways; a tap still picks (wPickHouse as now);
//      the icon box takes vertical pans (touch-action pan-y), so vertical scrolling is never trapped
//   4. keyboard: tiles stay buttons, focus is visible, arrow keys turn the focused model
//   5. idle spin when motion is allowed; prefers-reduced-motion: no idle spin, turning by hand still works
//   6. no WebGL: the slates stay, no canvas, no errors; closing the welcome frees the renderer
//   7. 390 Night and 1100 Daylight: no sideways scroll, no page errors
// SwiftShader is a software GPU, where the app keeps the stills; window.VI_TILES3D forces the 3D on for the test.
// Run: node tests/test_onboarding_tiles_3d.js
require('./lib/vi');
const { chromium } = require('playwright'); const routeThree = require('./three_route');
const APP = process.env.VI_APP || require('./lib/vi').FILE_URL;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const HIDE = '#sync-banner,#trial-banner,#pro-offer-modal,#tester-welcome{display:none!important}';
const TYPES = ['terraced', 'semi', 'detached', 'mansion', 'flat', 'apartment'];

async function open(b, w, theme, o) {
  o = o || {}; const mob = w < 700;
  const ctx = await b.newContext({ viewport: { width: w, height: mob ? 844 : 900 }, isMobile: mob, hasTouch: mob, reducedMotion: o.reduced ? 'reduce' : 'no-preference' });
  await routeThree(ctx); await ctx.route(/open\.er-api\.com|challenges\.cloudflare\.com|supabase\.co|google\.com\/s2/, r => r.abort());
  const p = await ctx.newPage(); p._errs = []; p.on('pageerror', e => p._errs.push(e.message));
  await p.addInitScript((a) => {
    window.__viPlanStub = 'on'; if (!a.soft) { window.VI_TILES3D = 1; window.VI_TILES3D_SPIN = 1; } if (a.signin) window.VI_SIGNIN3D = 1; if (a.noOff) window.VI_TILES3D_NOOFF = 1;
    if (a.noGL) { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (k) { return /webgl/i.test(k) ? null : g.apply(this, arguments); }; }
    if (sessionStorage.getItem('__seeded')) return; sessionStorage.setItem('__seeded', '1');
    localStorage.setItem('vi-theme', a.theme); localStorage.setItem('vi_declined_demo', 'true');
  }, { theme, noGL: !!o.noGL, soft: !!o.soft, signin: !!o.signin, noOff: !!(o.noOff || o.noGL) });
  await p.goto(APP); await p.waitForTimeout(1500);
  await p.addStyleTag({ content: HIDE + (o.keepLogin ? '' : '#login-overlay{display:none!important}') });
  return p;
}
const info = (p) => p.evaluate(() => (window.viTiles3D ? viTiles3D.info() : null));
async function waitLive(p, n, ms) { const t0 = Date.now(); let I; while (Date.now() - t0 < (ms || 20000)) { I = await info(p); if (I && I.live.length >= n) return I; await p.waitForTimeout(250); } return I; }
async function intoView(p) { await p.evaluate(() => document.getElementById('w-htypes').scrollIntoView({ block: 'center' })); await p.waitForTimeout(300); }
const box = (p, t) => p.evaluate((t) => { const r = document.querySelector('#w-htypes .w-ht[data-type="' + t + '"] .ico').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; }, t);

(async () => {
  const b = await chromium.launch(); const errs = [];

  // ── 1, 2, 3, 4, 5, 7: phone Night and desktop Daylight ──
  for (const [w, theme] of [[390, 'dark'], [1100, 'light']]) {
    const T = w + ' ' + theme + ': ';
    const p = await open(b, w, theme, { signin: w >= 700 });
    const st = await p.evaluate(() => { const g = document.getElementById('w-htypes'), ts = [...g.querySelectorAll('.w-ht')];
      const probe = document.createElement('div'); probe.style.backgroundImage = 'var(--stage-bg)'; document.body.appendChild(probe); const want = getComputedStyle(probe).backgroundImage; probe.remove();
      return { keys: ts.map(x => x.dataset.type).join(','), btn: ts.every(x => x.tagName === 'BUTTON' && x.type === 'button'), slate: ts.every(x => x.querySelector('.ico svg use[href^="#vi-ht-"]')),
        bg: ts.every(x => getComputedStyle(x.querySelector('.ico')).backgroundImage === want) && /gradient/.test(want),
        name: ts.every(x => { const i = x.querySelector('.ico').getBoundingClientRect(), n = x.querySelector('.nm').getBoundingClientRect(); return n.top >= i.bottom - 1 && n.height > 0; }),
        pan: ts.every(x => getComputedStyle(x.querySelector('.ico')).touchAction === 'pan-y'), api: !!window.viTiles3D }; });
    ok(st.keys === TYPES.join(',') && st.btn && st.slate, T + '1 six tiles, still buttons, each with its slate still');
    ok(st.bg, T + '1 each icon box has the House builder viewport background (--stage-bg)');
    ok(st.name, T + '1 the name stays under each tile');
    ok(st.pan, T + '3 the icon box takes vertical pans only (touch-action pan-y): vertical scrolling is never trapped');
    ok(st.api, T + '2 the tiles have a 3D controller (viTiles3D)');
    if (!st.api) { if (p._errs.length) errs.push(T + p._errs.join(' | ')); await p.context().close(); continue; }

    // in view only: below the fold nothing starts
    const below = await p.evaluate(() => document.getElementById('w-htypes').getBoundingClientRect().top > innerHeight);
    if (below) { await p.waitForTimeout(2500); const I0 = await info(p); ok(I0.canvases === 0 && I0.live.length === 0, T + '2 tiles below the fold: no 3D yet (' + I0.state + ')'); }
    await intoView(p);
    const I = await waitLive(p, 6); await p.waitForTimeout(400);   // the slate fades out over 0.25 s
    ok(I.canvases === 1 && (await p.evaluate(() => document.querySelectorAll('#w-htypes canvas').length)) === 1, T + '2 one canvas for all six tiles (one WebGL context)');   // counted in the grid: the sign-in house adds its own canvas on its own idle timer
    ok(I.mode === 'worker', T + '2 drawn off the main thread (OffscreenCanvas in a worker): ' + I.mode);
    ok(I.live.length === 6, T + '2 every tile goes live after its first frame (' + I.live.join(',') + ', ' + I.state + ')');
    const sameN = await p.evaluate(() => { const I = viTiles3D.info(), d = t => HB3D.houseGLData(HB3D.build(t, { detail: 'clean' })), f = d('flat'); let ctx = 0; for (let i = 0; i < f.n; i++) if (f.data[i * 16 + 9] > 7.5) ctx++;
      return I.n.semi === d('semi').n && I.n.flat <= f.n && I.n.flat >= f.n - ctx; });
    ok(sameN, T + '2 the tiles draw the House builder\'s own models (semi: every instance of HB3D.build; flat: the whole flat, the rest of the block cut to a storey above and below)');
    let hid = false; for (let i = 0; i < 12 && !hid; i++) { hid = await p.evaluate(() => [...document.querySelectorAll('#w-htypes .w-ht.live .ico > svg')].every(s => getComputedStyle(s).opacity === '0')); if (!hid) await p.waitForTimeout(250); }
    ok(hid, T + '2 a live tile hides its slate (the 3D shows in its place)');
    if (w >= 700) {   // the sign-in house behind the welcome holds still while the tiles turn (stress-doctor: the two together cost a third of the frame rate)
      const sg = await p.evaluate(() => ({ has: typeof _ahScene !== 'undefined' && !!_ahScene, active: typeof _ahScene !== 'undefined' && !!_ahScene && _ahScene.active, live: viTiles3DLive() }));
      ok(sg.live && sg.has && !sg.active, T + '2 the sign-in house holds still while the tiles are live (' + JSON.stringify(sg) + ')');
    }

    // 5 idle spin (motion allowed): the picked tile turns on its own, the other five hold still
    const ys0 = (await info(p)).yaw.semi; await p.waitForTimeout(1500); const ys1 = (await info(p)).yaw.semi;
    ok(Math.abs(ys1 - ys0) < 1e-6, T + '5 nothing picked: no tile spins on its own (' + (ys1 - ys0) + ')');
    await p.click('#w-htypes .w-ht[data-type="detached"]'); await p.waitForTimeout(100);
    const y0 = (await info(p)).yaw.detached; let y1 = y0; for (let i = 0; i < 40 && Math.abs(y1 - y0) <= 0.02; i++) { await p.waitForTimeout(250); y1 = (await info(p)).yaw.detached; }   // SwiftShader draws the six tiles about every 2 s; a phone GPU at 30 a second
    ok(Math.abs(y1 - y0) > 0.02, T + '5 the picked tile spins on its own when motion is allowed (' + (y1 - y0).toFixed(3) + ' rad)');
    const ys2 = (await info(p)).yaw.semi;
    ok(Math.abs(ys2 - ys1) < 1e-6, T + '5 the other tiles hold still');

    // 3 drag turns, does not pick, no sideways scroll; a tap picks
    if (w >= 700) {
      const c = await box(p, 'semi'), ya = (await info(p)).yaw.semi;
      await p.mouse.move(c.x - 30, c.y); await p.mouse.down(); for (let k = 1; k <= 6; k++) await p.mouse.move(c.x - 30 + k * 12, c.y + 2); await p.mouse.up(); await p.waitForTimeout(120);
      const d = await p.evaluate(() => ({ yaw: viTiles3D.info().yaw.semi, pressed: document.querySelector('#w-htypes .w-ht[data-type="semi"]').getAttribute('aria-pressed'), sx: scrollX, side: document.documentElement.scrollWidth - innerWidth }));
      ok(Math.abs(d.yaw - ya) > 0.3, T + '3 a sideways drag turns that tile\'s model (' + (d.yaw - ya).toFixed(2) + ' rad)');
      ok(d.pressed === 'false' && d.sx === 0 && d.side <= 0, T + '3 the drag does not pick the tile and the page does not move sideways');
    }
    await p.click('#w-htypes .w-ht[data-type="detached"]'); await p.waitForTimeout(120);
    const pk = await p.evaluate(() => ({ pressed: [...document.querySelectorAll('#w-htypes .w-ht')].filter(x => x.getAttribute('aria-pressed') === 'true').map(x => x.dataset.type).join(','), h: _wHouse }));
    ok(pk.pressed === 'detached' && pk.h === 'detached', T + '3 a tap still picks the tile (wPickHouse as now)');

    // 4 keyboard
    await p.keyboard.press('Shift'); await p.focus('#w-htypes .w-ht[data-type="flat"]');
    const yk = (await info(p)).yaw.flat; await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(80);
    const k = await p.evaluate(() => { const e = document.activeElement; return { yaw: viTiles3D.info().yaw.flat, t: e.dataset.type, vis: e.matches(':focus-visible') && getComputedStyle(e).outlineStyle !== 'none' }; });
    ok(k.t === 'flat' && k.vis, T + '4 the focused tile is a button with a visible focus ring');
    ok(Math.abs(k.yaw - yk) > 0.15, T + '4 arrow keys turn the focused model (' + (k.yaw - yk).toFixed(2) + ' rad)');

    const side = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    ok(side <= 0, T + '7 no sideways scroll (' + side + ')');

    // 6 closing the welcome frees the renderer
    await p.evaluate(() => { document.getElementById('welcome-overlay').style.display = 'none'; }); await p.waitForTimeout(1500);
    const J = await info(p);
    ok(J.canvases === 0 && J.live.length === 0, T + '6 closing the welcome frees the renderer (' + J.state + ')');
    if (w >= 700) ok(await p.evaluate(() => !viTiles3DLive()), T + '6 with the tiles gone nothing holds the sign-in house any more');
    if (p._errs.length) errs.push(T + p._errs.join(' | ')); await p.context().close();
  }

  // ── 5 reduced motion: no idle spin, drag still turns ──
  {
    const p = await open(b, 1100, 'dark', { reduced: true }); await intoView(p);
    const I = await waitLive(p, 6);
    ok(I && I.live.length === 6, 'reduced motion: the tiles still go live');
    await p.click('#w-htypes .w-ht[data-type="terraced"]'); await p.waitForTimeout(100);
    const y0 = (await info(p)).yaw.terraced; await p.waitForTimeout(1500); const y1 = (await info(p)).yaw.terraced;
    ok(Math.abs(y1 - y0) < 1e-6, 'reduced motion: no idle spin (' + (y1 - y0) + ')');
    const c = await box(p, 'terraced');
    await p.mouse.move(c.x - 30, c.y); await p.mouse.down(); for (let k = 1; k <= 6; k++) await p.mouse.move(c.x - 30 + k * 12, c.y); await p.mouse.up(); await p.waitForTimeout(120);
    const y2 = (await info(p)).yaw.terraced;
    ok(Math.abs(y2 - y1) > 0.3, 'reduced motion: turning by hand still works (' + (y2 - y1).toFixed(2) + ' rad)');
    if (p._errs.length) errs.push('reduced: ' + p._errs.join(' | ')); await p.context().close();
  }

  // ── 1 nothing 3D under the sign-in card; 6 no WebGL ──
  {
    let p = await open(b, 390, 'dark', { keepLogin: true }); await intoView(p); await p.waitForTimeout(3000);
    let I = await info(p);
    ok(I && I.canvases === 0 && I.live.length === 0, 'sign-in card on top: no 3D starts under it (' + (I && I.state) + ')');
    if (p._errs.length) errs.push('login: ' + p._errs.join(' | ')); await p.context().close();

    p = await open(b, 390, 'dark', { noGL: true }); await intoView(p); await p.waitForTimeout(3000);
    await p.click('#w-htypes .w-ht[data-type="semi"]'); await p.waitForTimeout(1500);
    I = await info(p);
    const sl = await p.evaluate(() => [...document.querySelectorAll('#w-htypes .w-ht .ico > svg')].filter(s => getComputedStyle(s).opacity !== '0').length);
    const pk = await p.evaluate(() => _wHouse);
    ok(I && I.canvases === 0 && I.live.length === 0 && sl === 6 && pk === 'semi', 'no WebGL: the six slates stay, no canvas, a tap still picks (' + (I && I.state) + ')');
    if (p._errs.length) errs.push('noGL: ' + p._errs.join(' | ')); await p.context().close();

    // a browser without OffscreenCanvas: the slates stay until a touch, then the tiles go live on the page; the tap still picks
    p = await open(b, 390, 'dark', { noOff: true }); await intoView(p); await p.waitForTimeout(2500);
    I = await info(p);
    ok(I && I.state === 'touch' && I.canvases === 0 && I.live.length === 0, 'no OffscreenCanvas: stills until a touch (' + (I && I.state) + ')');
    await p.click('#w-htypes .w-ht[data-type="flat"]');
    I = await waitLive(p, 6);
    const pk2 = await p.evaluate(() => _wHouse);
    ok(I && I.mode === 'page' && I.canvases === 1 && I.live.length === 6 && pk2 === 'flat', 'no OffscreenCanvas: a touch brings the six tiles to life on the page and still picks (' + (I && I.live.join(',')) + ')');
    if (p._errs.length) errs.push('noOff: ' + p._errs.join(' | ')); await p.context().close();
  }

  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join(' || ') : ''));
  await b.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL: crashed', e); process.exit(1); });
