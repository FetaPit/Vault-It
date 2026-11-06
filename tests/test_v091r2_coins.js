// v0.9.1 round 2, R16 (owner, 4 Nov 2026): "coins animated in singly like the bricks. viewport cash and savings is not
// great, learn from housebuilder viewport to adapt". The coins open the way the house builder's bricks do: the finished
// stacks are in place on the first frame and only the newest row of coins lays, one coin at a time; a later visit with
// nothing new shows the finished stacks at once; new money lays only the new coins; it starts when the stage is in view;
// the flat picture stays until the first 3D frame; full pixel ratio at rest, lower while coins land; reduced motion
// shows everything placed. The metal bars go the same way. Draws at rest are unchanged (one shape per block).
// Run: node tests/test_v091r2_coins.js
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
const { chromium } = require('playwright');
const routeThree = require('./three_route');
const INDEX = require('./lib/vi').FILE_URL;
const GPU_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-compositing', '--enable-gpu-rasterization'];
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const ACCTS = [
  { id: 5, name: 'Barclays Savings', type: 'Savings', balance: 2000, rate: 4.5 },   // two whole blocks: the last row of the last block lays
  { id: 6, name: 'Monzo', type: 'Current', balance: 340 },                          // 34 stacks: the last row is 4 stacks, 40 coins
  { id: 7, name: 'Nationwide ISA', type: 'ISA', balance: 1200, rate: 3.2 }           // one block and 20 stacks: the last row is 100 coins
];
// physical cash £460: 46 stacks, last row 60 coins
const COURSE = { 5: 100, 6: 40, 7: 100, physical: 60 };
const SEED = (accts, metals) => `(function(){if(localStorage.getItem('pos_al1'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'T',email:'t@t.com',pro:true,plan:'annual'}));localStorage.setItem('pos_al1',JSON.stringify({cashAccounts:${JSON.stringify(accts)},physicalCash:[{id:1,where:'Safe',amount:460,date:'2026-10-01'}],metals:${JSON.stringify(metals)},metalPrices:{gold:2000,silver:25,platinum:900,palladium:1000}}));})()`;
const HIDE = '#welcome-overlay,#login-overlay,#sync-banner,#pro-offer-modal{display:none!important}';

// every coin position drawn by the static stacks (instances) and the partial stacks (meshes), as a sorted list
const STATIC = () => { const V = V3.cash, out = []; V.root.updateMatrixWorld(true);
  V.root.traverse(o => { if (!o.userData || !o.userData.v3Intro || !o.visible) return;
    if (o.isInstancedMesh) { const a = o.instanceMatrix.array; for (let i = 0; i < o.count; i++) out.push([a[i * 16 + 12], a[i * 16 + 13], a[i * 16 + 14]].map(v => +v.toFixed(3)).join()); }
    else out.push([o.position.x, o.position.y, o.position.z].map(v => +v.toFixed(3)).join()); });
  return out.sort(); };
// what the last opening laid (the stage keeps a record, so a slow test machine cannot miss a run that has already ended)
const RUN = k => { const A = V3[k || 'cash']._lastAnim; return A && A.flights && A.flights.length ? A.flights : null; };

(async () => {
  const b = await chromium.launch({ args: GPU_ARGS }); const errs = [];
  const open = async (ctx, sub, seed, opts) => {
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    if (seed) await p.addInitScript(seed);
    await p.goto(INDEX, { waitUntil: 'load' }); await p.waitForTimeout(1400);
    await p.addStyleTag({ content: HIDE });
    await p.waitForFunction(() => !!window.THREE && !!THREE.OrbitControls, null, { timeout: 30000 }).catch(() => {});
    if (opts && opts.watch) await p.evaluate(() => {   // sample the stage every frame: is the flat picture or the 3D showing, and has 3D drawn yet
      window.__s = []; const f = () => { const card = document.getElementById('cashSceneCard'); const sv = document.getElementById('cashSvg'), h = document.querySelector('#cashSceneCard .v3-host'), V = window.V3 && V3.cash;
        if (!card || !card.getClientRects().length || !(h || (sv && sv.childElementCount))) { requestAnimationFrame(f); return; }   // from the moment the stage is first drawn (the tab switch itself comes before)
        window.__s.push({ svg: sv ? getComputedStyle(sv).display !== 'none' && sv.childElementCount > 0 : false, host: h ? getComputedStyle(h).visibility !== 'hidden' : false, drawn: !!(V && V.r && V.r.info.render.frame > 0 && V.root.children.length) });
        if (window.__s.length < 600) requestAnimationFrame(f); }; requestAnimationFrame(f); });
    await p.evaluate(s => { showTab('assets'); showSubtab('assets', s, null); window.scrollTo(0, 0); }, sub);
    await p.waitForFunction(k => window.V3 && V3[k] && V3[k].root.children.length, sub, { timeout: 60000 }).catch(() => {});
    return p;
  };
  const inView = p => p.evaluate(() => { const r = document.getElementById('cashSceneCard').getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; });

  // ── 1. first view on a phone: finished stacks at once, the newest row lays one coin at a time once the stage is in view ──
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }); await routeThree(ctx);
    const p = await open(ctx, 'cash', SEED(ACCTS, { gold: 0 }), { watch: true });
    await p.waitForTimeout(600);
    if (!(await inView(p))) {
      const pre = await p.evaluate(() => ({ run: !!V3.cash._introRun, wait: !!V3.cash._introWait }));
      ok(!pre.run && pre.wait, 'off screen: nothing lays until the stage is in view (' + JSON.stringify(pre) + ')');
    } else ok(true, 'the stage opens in view (nothing to check off screen)');
    await p.evaluate(() => document.getElementById('cashSceneCard').scrollIntoView({ block: 'center' }));
    await p.waitForFunction(() => V3.cash._lastAnim && V3.cash._lastAnim.flights, null, { timeout: 8000 }).catch(() => {});
    const run = await p.evaluate(RUN, 'cash');
    ok(!!run && run.length === 4, 'the opening flies each plate\'s newest row of coins (' + JSON.stringify(run && run.map(f => [f.id, f.n])) + ')');
    if (run) {
      ok(run.every(f => f.n === COURSE[f.id]), 'only the newest row lays on each plate: 100, 40, 100 and 60 coins (' + run.map(f => f.id + ':' + f.n).join(' ') + ')');
      const single = run.every(f => f.laid.every((t, i) => i === 0 || t > f.laid[i - 1] + 1e-4));
      ok(single, 'one coin at a time: every coin has its own start, each after the last');
      const steps = run.map(f => (f.laid[f.n - 1] - f.laid[0]) / Math.max(1, f.n - 1));
      ok(steps.every(s => s > 0 && s <= 0.04 + 1e-6), 'each coin follows the last within 40 ms, like the bricks (' + steps.map(s => (s * 1000).toFixed(1)).join(', ') + ' ms)');
      ok(run.every(f => f.laid[f.n - 1] - f.laid[0] <= 1.0 + 1e-6), 'a row is started within 1 second whatever its size');
    }
    const st = await p.evaluate(() => { const c = [], R = V3.cash._introRun; if (R) V3.cash.root.traverse(o => { if (o.isInstancedMesh && o.userData.v3Intro) c.push([o.count, o.userData.v3Full]); }); return { c, run: !!R, dpr: V3.cash._lastAnim.dpr }; });
    ok(!st.run || (st.c.some(x => x[0] > 0) && st.c.some(x => x[0] < x[1])), 'while the row lays, the finished stacks below it stand in place (' + JSON.stringify(st.c) + ')');
    ok(st.dpr <= 1.25 + 1e-9, 'while coins land on a phone the pixel ratio drops to 1.25 (' + st.dpr + ')');
    await p.waitForFunction(() => V3.cash._introPlayed && !V3.cash._introRun, null, { timeout: 15000 }).catch(() => {});
    const done = await p.evaluate(() => { let flights = 0; V3.cash.root.traverse(o => { if (o.userData && o.userData.v3Flight) flights++; }); let seen = null; try { seen = JSON.parse(localStorage.getItem('vi_cash_seen') || 'null'); } catch (e) {} return { flights, ms: V3.cash._introMs, seen }; });
    ok(done.flights === 0, 'after the opening no flying coins are left: the stacks are back to one shape a block');
    ok(done.ms > 0 && done.ms <= 1600, 'the coins have landed within 1.6 seconds (' + done.ms + ' ms)');
    ok(done.seen && done.seen['5'] === 2000 && done.seen['6'] === 340 && done.seen['7'] === 1200 && done.seen.physical === 460, 'this device notes the coins it has seen laid, per plate (' + JSON.stringify(done.seen) + ')');
    const after = await p.evaluate(STATIC);
    await p.evaluate(() => { V3.cash._key = null; V3._cashSilent = true; renderCashISO(); });
    await p.waitForTimeout(300);
    const fin = await p.evaluate(STATIC);
    ok(after.length > 0 && JSON.stringify(after) === JSON.stringify(fin), 'the opening ends at exactly the static layout (' + after.length + ' stacks and blocks)');
    await p.waitForTimeout(1200);
    const rest = await p.evaluate(() => { const V = V3.cash; V.r.info.autoReset = true; V.r.render(V.sc, V.cam); return { dpr: V.r.getPixelRatio(), calls: V.r.info.render.calls, plates: V.stats.plates.length, want: Math.min(devicePixelRatio, 2, Math.sqrt(2.2e6 / (V.host.clientWidth * V.host.clientHeight))), raf: V.raf }; });
    ok(Math.abs(rest.dpr - Math.max(1, rest.want)) < 1e-6 && rest.dpr > 1.5, 'at rest the stage draws at full pixel ratio, like the house builder (' + rest.dpr + ')');
    ok(rest.calls <= rest.plates * 3 + 10, 'draws at rest unchanged: at most three a plate plus the floor and flags (' + rest.calls + ')');
    ok(!rest.raf, 'nothing keeps drawing at rest');
    const S = await p.evaluate(() => window.__s);
    const blank = S.map((s, i) => [i, s]).filter(x => !x[1].svg && !(x[1].host && x[1].drawn));
    ok(S.some(s => s.svg) && !blank.length, 'the flat picture shows until the first 3D frame: never an empty stage (' + S.length + ' frames, ' + blank.length + ' empty ' + JSON.stringify(blank.slice(0, 3)) + ')');

    // ── 2. a later visit with nothing new: the finished stacks at once ──
    const p2 = await open(ctx, 'cash', null);
    await p2.evaluate(() => document.getElementById('cashSceneCard').scrollIntoView({ block: 'center' }));
    await p2.waitForTimeout(700);
    const v2 = await p2.evaluate(() => ({ run: !!V3.cash._introRun, wait: !!V3.cash._introWait, played: !!V3.cash._introPlayed }));
    ok(!v2.run && !v2.wait, 'a later visit with nothing new shows the finished stacks at once (' + JSON.stringify(v2) + ')');

    // ── 3. new money: only the new coins lay, on that plate only ──
    await p2.evaluate(() => { V3.cash._lastAnim = null; alState.cashAccounts.find(a => a.id === 6).balance = 365; if (typeof v3CashLand === 'function') v3CashLand(25, 6); renderCashISO(); });
    await p2.waitForFunction(() => V3.cash._lastAnim && V3.cash._lastAnim.flights, null, { timeout: 6000 }).catch(() => {});
    const run3 = await p2.evaluate(() => { const R = V3.cash._lastAnim; return R && R.flights ? R.flights.map(f => [f.id, f.n]) : null; });
    ok(!!run3 && run3.length === 1 && run3[0][0] === '6' && run3[0][1] === 25, '£25 more in Monzo lays just those 25 coins (' + JSON.stringify(run3) + ')');
    await ctx.close();
  }

  // ── 4. reduced motion: everything placed, nothing flies, and the coins count as seen ──
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }); await routeThree(ctx);
    const p = await open(ctx, 'cash', SEED(ACCTS, { gold: 0 }));
    await p.evaluate(() => document.getElementById('cashSceneCard').scrollIntoView({ block: 'center' }));
    await p.waitForTimeout(800);
    const r = await p.evaluate(() => { let flights = 0; const c = []; V3.cash.root.traverse(o => { if (o.userData && o.userData.v3Flight) flights++; if (o.isInstancedMesh && o.userData.v3Intro) c.push(o.count === o.userData.v3Full); }); return { run: !!V3.cash._introRun, flights, all: c.every(Boolean), seen: localStorage.getItem('vi_cash_seen') }; });
    ok(!r.run && !r.flights && r.all, 'reduced motion: every coin placed at once, nothing flies');
    ok(!!r.seen, 'reduced motion: what was shown is noted as seen');
    await ctx.close();
  }

  // ── 5. the metal bars go the same way: one bar at a time ──
  {
    const ctx = await b.newContext({ viewport: { width: 1100, height: 800 } }); await routeThree(ctx);
    const p = await open(ctx, 'metals', SEED([], { gold: 100, silver: 0, platinum: 0, palladium: 0 }));
    await p.evaluate(() => document.getElementById('metals-scene').scrollIntoView({ block: 'center' }));
    await p.waitForFunction(() => V3.metals._lastAnim && V3.metals._lastAnim.flights, null, { timeout: 8000 }).catch(() => {});
    const m = await p.evaluate(RUN, 'metals');
    ok(!!m && m.length > 0 && m.every(f => f.n >= 1 && f.n <= 10), 'metals: the newest bars fly in, ten at most a size (' + JSON.stringify(m && m.map(f => [f.id, f.n])) + ')');
    ok(!!m && m.every(f => f.laid.every((t, i) => i === 0 || t > f.laid[i - 1] + 1e-4)), 'metals: one bar at a time');
    await p.waitForFunction(() => V3.metals._introPlayed && !V3.metals._introRun, null, { timeout: 15000 }).catch(() => {});
    const d = await p.evaluate(() => { let flights = 0; V3.metals.root.traverse(o => { if (o.userData && o.userData.v3Flight) flights++; }); return flights; });
    ok(d === 0, 'metals: no flying bars left after the opening');
    await ctx.close();
  }

  ok(!errs.length, 'no page errors ' + errs.slice(0, 3).join(' | '));
  await b.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
