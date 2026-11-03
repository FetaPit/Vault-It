// v0.9.1 chunk A: the cash and metals viewports (E13 speed, E12 a plate per account, E14 and E21 intro
// animations, E22 "Add to vault"). Owner, 3 Nov 2026: "that amount should be in a separate box ... a separate
// gold tile on the ground plane. With the icon of the bank and the separate value"; Q6: each plate gets a flag
// post in the same style as the other viewports, with the bank icon, amount and interest rate.
// Run: node tests/test_v091_cash3d.js
const { chromium } = require('playwright');
const routeThree = require('./three_route');
const INDEX = 'file://' + (process.env.VI_INDEX || require('path').join(__dirname, '..', 'index.html'));
const GPU_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-compositing', '--enable-gpu-rasterization'];
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const ACCTS = [
  { id: 5, name: 'Barclays Savings', type: 'Savings', balance: 2000, rate: 4.5 },
  { id: 6, name: 'Monzo', type: 'Current', balance: 340 },
  { id: 7, name: 'Nationwide ISA', type: 'ISA', balance: 1200, rate: 3.2 }
];
const SEED = (accts, metals, extra) => `(function(){if(localStorage.getItem('pos_al1'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'T',email:'t@t.com',pro:true,plan:'annual'}));localStorage.setItem('pos_al1',JSON.stringify({cashAccounts:${JSON.stringify(accts)},physicalCash:[{id:1,where:'Safe',amount:460,date:'2026-10-01'}],metals:${JSON.stringify(metals)},metalPrices:{gold:2000,silver:25,platinum:900,palladium:1000}}));${extra || ''}})()`;
const HIDE = '#welcome-overlay,#login-overlay,#sync-banner,#pro-offer-modal{display:none!important}';

// the plate tags and the instance positions of every stack, as drawn
const READ = () => {
  const V = V3.cash, tags = [], pos = [];
  V.root.traverse(o => {
    if (o.userData && o.userData.v3Tag) tags.push(o.userData.v3Tag.slice());
    if (o.isInstancedMesh) { const a = o.instanceMatrix.array; for (let i = 0; i < o.count; i++) pos.push([+a[i * 16 + 12].toFixed(3), +a[i * 16 + 13].toFixed(3), +a[i * 16 + 14].toFixed(3)]); }
  });
  return { tags, pos, stats: V.stats };
};

(async () => {
  const b = await chromium.launch({ args: GPU_ARGS }); const errs = [];
  const open = async (ctx, sub, seed) => {
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(seed);
    await p.goto(INDEX, { waitUntil: 'load' }); await p.waitForTimeout(1400);
    await p.addStyleTag({ content: HIDE });
    await p.waitForFunction(() => !!window.THREE && !!THREE.OrbitControls, null, { timeout: 30000 }).catch(() => {});
    await p.evaluate(s => { showTab('assets'); showSubtab('assets', s, null); }, sub);
    await p.waitForFunction(k => window.V3 && V3[k] && V3[k].root.children.length, sub === 'cash' ? 'cash' : 'metals', { timeout: 60000 }).catch(() => {});
    await p.waitForTimeout(2600);
    return p;
  };

  // ── 1. E12: one plate per account, plus one for physical cash; each flag carries the bank glyph, the value and the rate ──
  {
    const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } }); await routeThree(ctx);
    const p = await open(ctx, 'cash', SEED(ACCTS, { gold: 0 }));
    const r = await p.evaluate(READ);
    const plates = r.stats.plates || [];
    console.log(JSON.stringify({ plates: plates.map(x => [x.name, x.units, x.rate, x.kind]), tags: r.tags }));
    ok(plates.length === 4, 'three accounts and the physical cash give four plates (' + plates.length + ')');
    ok(plates.reduce((s, x) => s + x.units, 0) === r.stats.units && r.stats.units === 4000, 'the plates sum to the cash total, £4,000 (' + r.stats.units + ')');
    const bar = plates.find(x => x.name === 'Barclays Savings'), phys = plates.find(x => x.kind === 'physical');
    ok(bar && bar.units === 2000 && bar.rate === 4.5, 'each plate holds its own account\'s balance and rate');
    ok(!!phys && phys.units === 460, 'physical cash has its own plate (' + (phys && phys.units) + ')');
    const names = r.tags.map(t => t[0]);
    ok(r.tags.length === 5, 'a flag on every plate and one for the total (' + r.tags.length + ' flags)');
    ok(names.some(n => /Barclays Savings/.test(n)) && names.some(n => /Monzo/.test(n)) && names.some(n => /Physical cash/i.test(n)), 'the flags name the accounts (' + names.join(' | ') + ')');
    const bt = r.tags.find(t => /Barclays Savings/.test(t[0]));
    ok(bt && bt[1] === '£2,000' && /4\.5% AER/.test(bt[2] || ''), 'the Barclays flag shows its amount and its rate (' + JSON.stringify(bt) + ')');
    const mt = r.tags.find(t => /Monzo/.test(t[0]));
    ok(mt && !/AER/.test(mt[2] || ''), 'an account with no rate shows no rate (' + JSON.stringify(mt) + ')');
    ok(r.tags.some(t => /Total/i.test(t[0]) && t[1] === '£4,000'), 'the total flag stays (' + JSON.stringify(r.tags.find(t => /Total/i.test(t[0]))) + ')');
    const wide = await p.evaluate(() => { let w = 0; V3.cash.root.traverse(o => { if (o.userData && /Barclays/.test(o.userData.v3Tag ? o.userData.v3Tag[0] : '')) w = o.children[0].scale.x; }); return w; });
    const icons = await p.evaluate(() => V3.cash.stats.plates.map(x => x.glyph));
    ok(icons.every(g => !!g), 'every flag draws a glyph locally, no outside image (' + icons.join(',') + ')');
    const hosts = await p.evaluate(() => { const u = []; document.querySelectorAll('#cashSceneCard img').forEach(i => u.push(i.src)); return u; });
    ok(hosts.every(u => !/^https?:/.test(u)), 'the 3D card loads no outside image (' + hosts.join(',') + ')');
    // on a phone the flags are drawn larger, from the first open (the scene may come from the idle warm-up)
    {
      const pc = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); await routeThree(pc);
      const pp = await open(pc, 'cash', SEED(ACCTS, { gold: 0 }));
      const narrow = await pp.evaluate(() => { let w = 0; V3.cash.root.traverse(o => { if (o.userData && /Barclays/.test(o.userData.v3Tag ? o.userData.v3Tag[0] : '')) w = o.children[0].scale.x; }); return w; });
      ok(narrow > wide * 1.3, 'the account flags are drawn larger on a phone, on the first open (' + narrow + ' at 390 against ' + wide + ' at 1100)');
      await pc.close();
    }

    // 12 accounts still frame and read
    await p.evaluate(() => { alState.cashAccounts = []; for (let i = 1; i <= 12; i++) alState.cashAccounts.push({ id: 100 + i, name: 'Account ' + i, type: 'Savings', balance: 100 * i }); renderCashISO(); return null; });
    await p.waitForFunction(() => V3.cash.stats && V3.cash.stats.plates.length === 13, null, { timeout: 20000 }).catch(() => {});
    const many = await p.evaluate(() => ({ plates: V3.cash.stats.plates.length, rows: V3.cash.stats.plateRows, units: V3.cash.stats.units }));
    ok(many.plates === 13 && many.rows > 1, '12 accounts give 13 plates and wrap to rows (' + JSON.stringify(many) + ')');
    await ctx.close();
  }

  // ── 2. E14: the intro plays on first view and ends at exactly the static layout ──
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); await routeThree(ctx);
    const p = await open(ctx, 'cash', SEED(ACCTS, { gold: 0 }));
    await p.evaluate(() => document.getElementById('cashSceneCard').scrollIntoView({ block: 'center' }));   // the drop is triggered on view, so bring the scene into view as a reader would
    await p.waitForFunction(() => V3.cash._introPlayed, null, { timeout: 15000 }).catch(() => {});
    const intro = await p.evaluate(() => ({ played: !!V3.cash._introPlayed, ms: V3.cash._introMs, note: (document.getElementById('cashCap') || {}).textContent }));
    ok(intro.played, 'the intro played when the scene came into view');
    ok(intro.ms > 0 && intro.ms <= 1600, 'the intro runs at most 1.6 seconds whatever the count (' + intro.ms + ' ms)');
    ok(/laid/.test(intro.note || ''), 'a short line confirms what was laid (' + (intro.note || '').slice(0, 90) + ')');
    const after = await p.evaluate(READ);
    const stat = await p.evaluate(() => { V3.cash._introPlayed = false; return new Promise(res => { V3.cash._key = null; renderCashISO(); setTimeout(() => { V3.cash.introStop(); setTimeout(() => res(null), 60); }, 50); }); });
    const fin = await p.evaluate(READ);
    ok(after.pos.length > 0 && JSON.stringify(after.pos) === JSON.stringify(fin.pos), 'the intro ends at exactly the static layout (' + after.pos.length + ' stacks)');
    const idle = await p.evaluate(() => new Promise(res => setTimeout(() => res({ raf: V3.cash.raf, until: Date.now() > V3.cash._until }), 2500)));
    ok(!idle.raf && idle.until, 'no animation work is left running after the intro ends');
    await ctx.close();
  }

  // ── 3. reduced motion: no animation, the scene is complete at once ──
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }); await routeThree(ctx);
    const p = await open(ctx, 'cash', SEED(ACCTS, { gold: 0 }));
    const r = await p.evaluate(() => ({ anim: !!V3.cash._introRun, counts: (() => { const c = []; V3.cash.root.traverse(o => { if (o.isInstancedMesh && o.userData.v3Intro) c.push([o.count, o.userData.v3Full]); }); return c; })(), units: V3.cash.stats.units }));
    ok(!r.anim, 'reduced motion: nothing animates');
    ok(r.counts.length > 0 && r.counts.every(c => c[0] === c[1]), 'reduced motion: every stack is drawn at once (' + JSON.stringify(r.counts) + ')');
    await ctx.close();
  }

  // ── 4. E22: "Add to vault" commits and animates one metal; blur commits silently ──
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); await routeThree(ctx);
    const p = await open(ctx, 'metals', SEED([], { gold: 1, silver: 0, platinum: 0, palladium: 0 }));
    const btns = await p.locator('.metal-commit').count();
    ok(btns === 4, 'one "Add to vault" button per metal row (' + btns + ')');
    const box = await p.locator('.metal-commit').first().boundingBox();
    ok(box && box.height >= 44, 'the button is at least 44 px tall at 390 (' + (box && Math.round(box.height)) + ')');
    await p.fill('#metal-hold-gold', '5');
    const draft = await p.evaluate(() => ({ msg: (document.getElementById('metal-draft-gold') || {}).textContent || '', saved: alState.metals.gold }));
    ok(/not in your vault yet/i.test(draft.msg) && draft.saved === 1, 'a typed number shows as a draft and is not in the vault yet (' + draft.msg.trim() + ')');
    await p.evaluate(() => { V3.metals._lastAnim = null; });
    await p.click('.metal-commit[data-m="gold"]'); await p.waitForTimeout(1800);
    const anim = await p.evaluate(() => V3.metals._lastAnim);
    ok(anim && anim.zone === 'gold', 'the button itself plays the animation, even though tapping it leaves the field first (' + JSON.stringify(anim) + ')');
    const done = await p.evaluate(() => ({ saved: alState.metals.gold, store: JSON.parse(localStorage.getItem('pos_al1')).metals.gold, msg: (document.getElementById('metal-draft-gold') || {}).textContent || '', zones: Object.keys(V3.metals.stats), played: !!V3.metals._introPlayed || !!V3.metals._introWait }));
    ok(done.saved === 5 && done.store === 5, 'the button commits the typed ounces to saved data (' + done.saved + ')');
    ok(/\+4\.00 oz gold/.test(done.msg) && /£/.test(done.msg), 'a one-line confirm shows what went in (' + done.msg.trim() + ')');
    ok(done.zones.join() === 'gold' && done.played, 'only that metal\'s zone is drawn, and it is the one set going (' + done.zones.join() + ')');
    // blur commits silently, with no animation
    await p.fill('#metal-hold-silver', '3');
    await p.evaluate(() => { V3.metals._lastAnim = null; document.getElementById('metal-hold-silver').blur(); }); await p.waitForTimeout(900);
    const blur = await p.evaluate(() => ({ saved: alState.metals.silver, anim: V3.metals._lastAnim, msg: (document.getElementById('metal-draft-silver') || {}).textContent || '' }));
    ok(blur.saved === 3, 'blurring saves the typed value, so nothing is lost (' + blur.saved + ')');
    ok(!blur.anim && !/not in your vault yet/i.test(blur.msg), 'blurring plays no animation (' + JSON.stringify(blur.anim) + ')');
    // clearing the field and leaving it means none held, as it did before E22
    await p.fill('#metal-hold-silver', '');
    await p.evaluate(() => document.getElementById('metal-hold-silver').blur()); await p.waitForTimeout(600);
    const cleared = await p.evaluate(() => alState.metals.silver);
    ok(cleared === 0, 'clearing the field and leaving it saves 0 oz (' + cleared + ')');
    await ctx.close();
  }

  // ── 4b. the same from a tap, and an account in the red still adds up ──
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); await routeThree(ctx);
    const p = await open(ctx, 'metals', SEED([], { gold: 0, silver: 0, platinum: 0, palladium: 0 }));
    await p.evaluate(() => document.getElementById('metalsSceneCard').scrollIntoView({ block: 'center' })); await p.waitForTimeout(900);
    await p.fill('#metal-hold-platinum', '2');
    await p.evaluate(() => { V3.metals._lastAnim = null; });
    await p.tap('.metal-commit[data-m="platinum"]'); await p.waitForTimeout(1800);
    const t = await p.evaluate(() => ({ saved: alState.metals.platinum, anim: V3.metals._lastAnim, waiting: !!V3.metals._introWait, zone: V3.metals._introZone }));
    ok(t.saved === 2 && ((t.anim && t.anim.zone === 'platinum') || (t.waiting && t.zone === 'platinum')), 'a tap on the button commits and sets that metal\'s bars going (' + JSON.stringify(t) + ')');
    // tapping the button can scroll the scene off the phone screen; the animation then waits until it is seen again
    await p.evaluate(() => document.getElementById('metalsSceneCard').scrollIntoView({ block: 'center' })); await p.waitForTimeout(1600);
    const t2 = await p.evaluate(() => V3.metals._lastAnim);
    ok(t2 && t2.zone === 'platinum', 'the bars arrive once the scene is back on screen (' + JSON.stringify(t2) + ')');
    await ctx.close();
  }
  {
    const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } }); await routeThree(ctx);
    const p = await open(ctx, 'cash', SEED([{ id: 5, name: 'Savings', type: 'Savings', balance: 2000 }, { id: 6, name: 'Overdrawn', type: 'Current', balance: -500 }], { gold: 0 }));
    const r = await p.evaluate(() => ({ plates: V3.cash.stats.plates.map(x => [x.name, x.units]), units: V3.cash.stats.units, total: Math.floor(alTotalCash()) }));
    console.log(JSON.stringify(r));
    ok(r.units === r.total, 'an account in the red: the total flag still shows the cash the app shows (' + JSON.stringify(r) + ')');
    ok((r.plates.find(x => x[0] === 'Savings') || [])[1] === 2000 && (r.plates.find(x => x[0] === 'Overdrawn') || [])[1] === 0, 'every other plate keeps its own balance and the overdrawn one is empty');
    await ctx.close();
  }

  // ── 5. E13 and E21: the draw-call budget on the phone profile ──
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }); await routeThree(ctx);
    const p = await open(ctx, 'cash', SEED([{ id: 5, name: 'Savings', type: 'Savings', balance: 200000 }, { id: 6, name: 'Monzo', type: 'Current', balance: 50000 }], { gold: 0 }));
    const c = await p.evaluate(() => { const V = V3.cash; V.r.info.autoReset = true; V.r.render(V.sc, V.cam); return { calls: V.r.info.render.calls, tris: V.r.info.render.triangles, plates: V.stats.plates.length, dpr: V.r.getPixelRatio() }; });
    console.log(JSON.stringify(c));
    ok(c.calls <= c.plates * 3 + 10, 'cash at £250,300: at most three draws a plate plus the fixed floor and flags (' + c.calls + ' for ' + c.plates + ' plates)');
    ok(c.tris < 120000, 'cash at £250,300: finished blocks are one shape, so the triangle count stays low (' + c.tris + ')');
    ok(c.dpr <= 1.5 + 1e-9, 'pixel ratio capped at 1.5 (' + c.dpr + ')');
    await p.evaluate(() => showSubtab('assets', 'metals', null));
    await p.evaluate(() => { alState.metals = { gold: 1000, silver: 0, platinum: 0, palladium: 0 }; renderMetalsISO(); });
    await p.waitForTimeout(2500);
    const m = await p.evaluate(() => { const V = V3.metals; V.r.info.autoReset = true; V.r.render(V.sc, V.cam); return { calls: V.r.info.render.calls, tris: V.r.info.render.triangles, dpr: V.r.getPixelRatio() }; });
    console.log(JSON.stringify(m));
    ok(m.calls <= 16, 'metals at 1,000 oz gold: the bars stay a handful of draws (' + m.calls + ')');
    ok(m.dpr <= 1.5 + 1e-9, 'metals: pixel ratio capped at 1.5 (' + m.dpr + ')');
    await ctx.close();
  }

  // ── 6. the hook chunk B calls when money moves, and the no-WebGL fallback ──
  {
    const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } }); await routeThree(ctx);
    const p = await open(ctx, 'cash', SEED(ACCTS, { gold: 0 }));
    const land = await p.evaluate(() => { if (typeof v3CashLand !== 'function') return { none: true }; v3CashLand(250, 6); return { pend: JSON.stringify(V3._land || null) }; });
    ok(!land.none, 'v3CashLand(delta, accountId) is there for the cash accounts chunk');
    const grow = await p.evaluate(() => { const a = alState.cashAccounts.find(x => x.id === 6); a.balance += 250; renderCashISO(); return new Promise(res => setTimeout(() => res({ units: V3.cash.stats.units, plate: V3.cash.stats.plates.find(x => x.id === 6).units }), 1600)); });
    ok(grow.units === 4250 && grow.plate === 590, 'money added lands on that account\'s plate (' + JSON.stringify(grow) + ')');
    await ctx.close();
  }
  {
    const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } }); await routeThree(ctx);
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(SEED(ACCTS, { gold: 0 }, "window.__noGl=1;"));
    await p.addInitScript(() => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t) { return /webgl/i.test(t) ? null : g.apply(this, arguments); }; });
    await p.goto(INDEX, { waitUntil: 'load' }); await p.waitForTimeout(1400);
    await p.addStyleTag({ content: HIDE });
    await p.evaluate(() => { showTab('assets'); showSubtab('assets', 'cash', null); }); await p.waitForTimeout(1500);
    const f = await p.evaluate(() => ({ svg: getComputedStyle(document.getElementById('cashSvg')).display, cap: (document.getElementById('cashCap') || {}).textContent || '' }));
    ok(f.svg !== 'none' && /£4(,000|\.0k)/.test(f.cap), 'without WebGL the flat drawing still shows the one total (' + f.cap.slice(0, 70) + ')');
    await ctx.close();
  }

  ok(!errs.length, 'no page errors ' + errs.slice(0, 3).join(' | '));
  await b.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
