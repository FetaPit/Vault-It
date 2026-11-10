// v0.7 final round part 2 (owner, 2 Nov, from the fold test), items 1 and 2 for the Net-worth 3D and the Budget 3D:
// the build/intro animations run at half speed (durations doubled), and the intro starts only when the canvas is about half on screen
// (near the middle of the screen), not at its first pixel. The house builder is the engine session's and is not touched here.
// Run: node tests/test_v07_p2_motion.js
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
const { chromium } = require('playwright'); const routeThree = require('./three_route');
const APP = process.env.VI_APP || require('./lib/vi').FILE_URL;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const src = require('fs').readFileSync(__dirname + '/test_nw3d.js', 'utf8');
const seed = eval('(' + src.slice(src.indexOf('const seed = (o) =>') + 'const seed = '.length, src.indexOf('// WCAG AA')).trim().replace(/;$/, '') + ')');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const open = async (tab) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 700 }, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' });
    await routeThree(ctx); await ctx.route(/open\.er-api\.com/, r => r.abort());
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(seed, { theme: 'dark', flag: true });
    await p.goto(APP); await p.waitForTimeout(1800);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#pro-offer-modal,#sync-banner,#trial-banner,#tester-welcome{display:none!important}' });
    await p.evaluate((t) => showTab(t), tab); await p.waitForTimeout(600);
    return p;
  };
  // put the top of an element `px` below the top of the screen (scrolls the page)
  const place = async (p, sel, px) => { await p.evaluate(([s, y]) => { const e = document.querySelector(s); window.scrollTo(0, e.getBoundingClientRect().top + scrollY - y); }, [sel, px]); };
  // the timings the owner asked to slow by 100% (duration doubled)
  { const p = await open('overview');
    const t = await p.evaluate(() => window.nw3d && nw3d.timing);
    ok(t && t.dropMs === 1400 && t.flashMs === 2000 && t.stackMs === 1400 && t.stackStep === 90 && t.budgetPileMs === 1800 && t.budgetGoMs === 1700, 'timings are doubled (drop 1400, flash 2000, stacks 1400 / 90, budget pile 1800, slide 1700): ' + JSON.stringify(t));
    // the net worth stacks start when the stage is about half on screen, not at its first pixel
    await place(p, '#nw3d-trk-stage', 690); await p.waitForTimeout(1500);   // 10 px of it on screen
    ok(await p.evaluate(() => nw3d.tracker.started && nw3d.tracker.started() === false), 'net worth stacks: with only the top edge on screen the intro has not started');
    await place(p, '#nw3d-trk-stage', 200); await p.waitForTimeout(1200);
    ok(await p.evaluate(() => nw3d.tracker.started && nw3d.tracker.started() === true), 'net worth stacks: once it is well on screen the intro plays');
    // the main net worth scene: a fresh one far down the page starts its opening build only when it is about half on screen
    await p.evaluate(() => { const sp = document.createElement('div'); sp.style.height = '1800px'; document.body.appendChild(sp); const cv = document.createElement('canvas'); cv.id = 'p2-hero'; cv.style.cssText = 'display:block;width:340px;height:300px;margin:0 auto'; document.body.appendChild(cv);
      const e = ViNW3D.makeNW(cv, {}); window.__p2hero = e; e.setData(nw3d.sceneData()); });
    await place(p, '#p2-hero', 690); await p.waitForTimeout(1500);
    ok(await p.evaluate(() => __p2hero.started() === false), 'net worth scene: with only its top edge on screen the opening build has not started');
    await place(p, '#p2-hero', 200); await p.waitForTimeout(1200);
    ok(await p.evaluate(() => __p2hero.started() === true), 'net worth scene: once it is about half on screen the opening build starts');
    await p.context().close(); }
  { const p = await open('budget');
    // switch to 3D with the chart well above the screen, so nothing is on screen when the intro arms (since v0.8 the compact key puts the
    // chart about half on screen at the top of the page on a 390 x 700 phone, where starting at once is right; this test is about the scroll trigger)
    // room above the chart, so its top edge can really sit near the bottom of the screen: since v0.8 the compact key puts the 3D canvas about
    // half on screen at the very top of the page (508 px on a 700 px screen), where starting at once is right and "top edge only" cannot be reached
    await p.evaluate(() => { const sp = document.createElement('div'); sp.id = 'p2-room'; sp.style.height = '400px'; const c = document.querySelector('.bd-sankey-card'); c.parentNode.insertBefore(sp, c); });
    await place(p, '.bd-sankey-card', -900); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.querySelector('.bd-sankey-card').getBoundingClientRect().bottom < 0), 'budget 3D: the chart is off screen before the 3D view opens');
    await p.evaluate(() => document.querySelector('#bd-view button[data-v="3d"]').click()); await p.waitForTimeout(800);
    await place(p, '#bd3d-cv', 690); await p.waitForTimeout(1500);
    const top0 = await p.evaluate(() => Math.round(document.getElementById('bd3d-cv').getBoundingClientRect().top));
    ok(Math.abs(top0 - 690) <= 4, 'budget 3D: the canvas top really sits at 690 px of 700 (' + top0 + ')');
    const ph0 = await p.evaluate(() => bd3d.engine().phase());
    ok(ph0 === 'waiting', 'budget 3D: with only its top edge on screen the intro waits (' + ph0 + ')');
    await place(p, '#bd3d-cv', 200); await p.waitForTimeout(500);
    ok(await p.evaluate(() => bd3d.engine().phase()) === 'pile', 'budget 3D: when it is on screen the income pile shows and the intro starts');
    await p.waitForTimeout(1100);   // about 1.6 s in: the old pile stage ended at 0.9 s
    ok(await p.evaluate(() => bd3d.engine().phase()) === 'pile', 'budget 3D: the pile stage now lasts about 1.8 s, not 0.9 s');
    let done = false; for (let i = 0; i < 40 && !done; i++) { await p.waitForTimeout(500); done = await p.evaluate(() => bd3d.engine().phase()) === 'done'; }
    ok(done, 'budget 3D: the intro finishes');
    await p.context().close(); }
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
