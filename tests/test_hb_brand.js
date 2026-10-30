// Brand build on the 3D house builder (behind ?house=new or vi-flag-house = 1; the classic hologram viewer is the default again since 30 Oct 2026 22:02), brand handover 6.2 to 6.10.
// Flag off: the current builder, unchanged. Flag on: brick value = deposit target x 0.77 / bricks, bricks laid =
// floor(bricks x seg(p, 0.03, 0.80)), the ROW label, the HUD and the caption agree, per-brick drop and stagger,
// reduced motion builds instantly, no page errors, no sideways scroll at 390 px.
// VI_INDEX=/path/to/index.html runs it against another copy (a worktree); the default is the repo the suite expects.
const { chromium } = require('playwright');
const routeThree = require('./three_route');
const INDEX = 'file://' + (process.env.VI_INDEX || '/home/user/Vault-It/index.html');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const seed = (o, flag) => `(function(){if(localStorage.getItem('ht3'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'T',email:'t@t.com',pro:true}));localStorage.setItem('vi_pioneer','true');localStorage.setItem('vi-flag-house',${flag?"'1'":"'0'"});localStorage.setItem('ht3',${JSON.stringify(JSON.stringify(o))});})()`;
const DEFAULTS = { terraced: 200000, semi: 320000, detached: 500000, mansion: 1500000, flat: 80000, apartment: 300000 };
(async () => {
  const b = await chromium.launch(); const errs = [];
  const open = async (o, opt) => {
    opt = opt || {};
    const ctx = await b.newContext({ viewport: { width: opt.w || 1100, height: opt.h || 900 }, reducedMotion: opt.motion ? 'no-preference' : 'reduce' });
    await routeThree(ctx); const p = await ctx.newPage(); p.setDefaultTimeout(120000);
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load|net::/.test(m.text())) errs.push('console: ' + m.text()); });
    await p.addInitScript(seed(o, opt.flag !== false)); await p.goto(INDEX + (opt.query || '')); await p.waitForTimeout(1500);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
    await p.evaluate(() => { showTab('house'); document.getElementById('house-scene').scrollIntoView({ block: 'center' }); });
    await p.waitForFunction(() => window.HB3D && HB3D.viewer && HB3D.viewer.model, null, { timeout: 60000 }).catch(() => {});
    return p;
  };
  const settle = p => p.waitForFunction(() => HB3D.viewer.settled(), null, { timeout: 120000, polling: 500 }).catch(() => {});
  const semi = { saved: 20000, target: 320000, houseType: 'semi', depositPct: 20, deposits: [{ amount: 20000, date: '01/10/2026' }], prices: { semi: 320000 } };

  // ── 1. flag off: the current builder, exactly as before ──
  let p = await open(semi, { flag: false }); await settle(p);
  let r = await p.evaluate(() => {
    const v = HB3D.viewer, i = hbBrickInfo(), m = i.model, span = m.brickT(m.counts.bricks - 1) - m.brickT(0);
    return { brand: !!v.brand, grp: !!v._bGroup, band: v.rowBand && v.rowBand.visible, label: document.getElementById('hb3d-rowlabel').className, txt: document.getElementById('hb3d-rowlabel').textContent,
      per: i.perBrick, old: depositTarget() * Math.max(0.02, span) / m.counts.bricks, laid: document.getElementById('stBricks').textContent, oldLaid: m.stats(pct()).bricksLaid, flag: hbBrandOn() };
  });
  ok(!r.flag && !r.brand && !r.grp, 'flag off: no brand build');
  ok(r.band && r.label === '' && /ROW \d+ \/ \d+/.test(r.txt), 'flag off: the old gold row band and label (' + r.txt + ')');
  ok(Math.abs(r.per - r.old) < 1e-9, 'flag off: brick value unchanged (£' + r.per.toFixed(2) + ')');
  ok(r.laid === r.oldLaid.toLocaleString('en-GB'), 'flag off: brick count unchanged (' + r.laid + ')');
  await p.context().close();

  // ── 2. flag on: brick value = deposit target x 0.77 / bricks, for every house at its default price ──
  p = await open(semi); await settle(p);
  for (const t of Object.keys(DEFAULTS)) {
    await p.evaluate(([t, price]) => { state.houseType = t; state.target = price; state.prices[t] = price; state.depositPct = 20; save(); updateUI(); }, [t, DEFAULTS[t]]);
    await p.waitForFunction(() => !!hbBrickInfo() && /Each brick ≈/.test(document.getElementById('hb-hud').innerText), null, { timeout: 60000 }).catch(() => {});
    await p.evaluate(() => hbRenderHUD());
    r = await p.evaluate(() => { const i = hbBrickInfo(); return { per: i.perBrick, total: i.total, dt: depositTarget(), hud: document.getElementById('hb-hud').innerText, plan: (document.getElementById('hb-plan-brick') || {}).textContent }; });
    const want = r.dt * 0.77 / r.total;
    ok(Math.abs(r.per - want) < 1e-9 && r.hud.includes('Each brick ≈ £' + want.toFixed(2)), t + ' at £' + DEFAULTS[t].toLocaleString('en-GB') + ': each brick = £' + (r.dt).toLocaleString('en-GB') + ' x 0.77 / ' + r.total.toLocaleString('en-GB') + ' = £' + want.toFixed(2));
  }

  // ── 3. bricks laid, ROW label, HUD and percentage agree (semi-detached, £320,000, 20%, £20,000 saved) ──
  await p.evaluate(() => { state.houseType = 'semi'; state.target = 320000; state.saved = 20000; save(); updateUI(); });
  await p.waitForFunction(() => HB3D.viewer.brandInfo() && HB3D.viewer.model.type === 'semi' && Math.abs(HB3D.viewer.p - pct()) < 1e-9, null, { timeout: 60000 }).catch(() => {});
  await settle(p); await p.waitForTimeout(400);
  r = await p.evaluate(() => {
    const v = HB3D.viewer, m = v.model, bi = v.brandInfo(), P = pct(), N = m.counts.bricks;
    const courses = []; m.batches.forEach(b => { if (m.focus && !b.focus) return; for (let i = 0; i < b.count; i++) if (b.kind[i] === 1) courses.push(Math.round((m.rows.y0 + b.t[i] / 0.9999 * (m.rows.y1 - m.rows.y0) - m.rows.y0) / m.rows.ch)); });
    courses.sort((a, c) => a - c);
    const L = Math.floor(N * Math.min(1, Math.max(0, (P - 0.03) / 0.77)) + 1e-6);
    return { p: P, N, L, rowWant: L ? courses[L - 1] : 0, bi, label: document.getElementById('hb3d-rowlabel').innerText.replace(/\n/g, ' '), cls: document.getElementById('hb3d-rowlabel').className,
      hud: document.getElementById('hb-hud').innerText, laid: document.getElementById('stBricks').textContent, cap: document.getElementById('hb3d-cap').textContent, pill: document.getElementById('hb3d-bpill').textContent };
  });
  console.log(JSON.stringify({ L: r.L, row: r.rowWant, label: r.label, cap: r.cap, pill: r.pill }));
  ok(r.bi && r.bi.bricks === r.L && r.L === 2497, 'bricks laid = floor(' + r.N + ' x seg(' + r.p + ', 0.03, 0.80)) = ' + r.L);
  ok(r.laid === r.L.toLocaleString('en-GB') && r.hud.toLowerCase().includes(r.L.toLocaleString('en-GB') + '\nof ' + r.N.toLocaleString('en-GB') + ' uk bricks'), 'HUD and statistics show ' + r.L.toLocaleString('en-GB') + ' of ' + r.N.toLocaleString('en-GB') + ' bricks');
  ok(r.bi.row === r.rowWant && new RegExp('ROW ' + r.rowWant + ' / ' + r.bi.rows).test(r.label) && r.cls.includes('brand'), 'the gold tag shows the course of the last brick laid: ' + r.label);
  ok(/31\.3% OF DEPOSIT/.test(r.label) && /31\.3% of/.test(r.hud), 'tag and HUD agree on the percentage (31.3%)');
  ok(new RegExp('ROW\\s*' + r.rowWant + '\\s*of\\s*' + r.bi.rows, 'i').test(r.hud), 'HUD row card agrees (ROW ' + r.rowWant + ' of ' + r.bi.rows + ')');
  ok(r.cap.includes(r.L.toLocaleString('en-GB') + ' / ' + r.N.toLocaleString('en-GB') + ' bricks') && /£7\.24 a brick/.test(r.cap), 'caption agrees: ' + r.cap);
  ok(r.pill === 'BRICK #' + r.L.toLocaleString('en-GB'), 'the last brick laid is ringed and numbered (' + r.pill + ')');
  ok(Math.abs(r.bi.y - (r.bi.last.y + 0.0325)) < 0.06 && r.bi.sliceA === 1, 'the gold slice sits on the course of the last brick');
  // stage schedule: roof tiles, glazing, lights, keys
  r = await p.evaluate(() => { const v = HB3D.viewer, out = {}; [[0.02, 'f'], [0.5, 'half'], [0.84, 'tiles'], [0.9, 'glaze'], [1, 'keys']].forEach(([q, k]) => { v.setState({ p: q }); const bi = v.brandInfo(); out[k] = { bricks: bi.bricks, tiles: bi.tiles, stage: bi.stage, keys: bi.keys, slice: bi.sliceA }; }); v.setState({ p: pct() }); return out; });
  ok(r.f.bricks === 0 && r.f.stage === 'Foundations', 'below 3%: foundations, no bricks');
  ok(r.tiles.bricks === 6808 && r.tiles.tiles > 0 && r.tiles.tiles < 5609, '0.80 to 0.88: every brick laid, roof tiles going on (' + r.tiles.tiles + ')');
  ok(r.glaze.tiles === 5609 && r.glaze.stage === 'Glazing', '0.88 to 0.93: glazing');
  ok(r.keys.keys && r.keys.stage === 'Keys are yours' && r.keys.slice === 0, 'at 100%: keys are yours, slice faded out');
  await p.context().close();

  // ── 4. a small deposit lays a small, exact number of bricks (terrace £120,000, 20% = £24,000) ──
  const terr = s => ({ saved: s, target: 120000, houseType: 'terraced', depositPct: 20, deposits: [{ amount: s, date: '01/10/2026' }], prices: { terraced: 120000 } });
  p = await open(terr(5)); await p.waitForFunction(() => HB3D.viewer.brandInfo(), null, { timeout: 60000 }).catch(() => {}); await settle(p);
  r = await p.evaluate(() => ({ bi: HB3D.viewer.brandInfo(), laid: document.getElementById('stBricks').textContent, N: HB3D.viewer.model.counts.bricks }));
  ok(r.bi && r.bi.bricks === 0 && r.laid === '0', '£5 from nothing goes into the foundations: 0 bricks');
  await p.evaluate(() => { state.saved = 720 + 5; state.deposits.push({ amount: 720, date: '02/10/2026' }); save(); updateUI(); });
  await settle(p);
  r = await p.evaluate(() => ({ bi: HB3D.viewer.brandInfo(), laid: document.getElementById('stBricks').textContent, N: HB3D.viewer.model.counts.bricks, dt: depositTarget() }));
  const want5 = Math.floor(r.N * (5 / r.dt) / 0.77 + 1e-6);
  ok(r.bi.bricks === want5 && r.laid === String(want5) && want5 >= 1 && want5 <= 10, '£5 after the foundations lays exactly ' + want5 + ' bricks (£' + (r.dt * 0.77 / r.N).toFixed(2) + ' a brick)');
  // reduced motion: the build is instant, no drop, flash, stagger, sweep, ring or orbit
  r = await p.evaluate(() => { const v = HB3D.viewer, rec = v._bm.find(x => x && x.part === 'brick'); return { p: v.p, want: pct(), stamps: Array.from(rec.laid.slice(0, rec.cnt)), sweep: v._bU.uSweepOn.value, ring: v._bEnvObj.ring.visible, rot: v.controls.autoRotate, pulse: v._bU.uPulse.value }; });
  ok(Math.abs(r.p - r.want) < 1e-12 && r.stamps.every(s => s === -1000), 'reduced motion: built instantly, every brick already laid (no drop, flash or stagger)');
  ok(r.sweep === 0 && !r.ring && !r.rot && r.pulse === 0.5, 'reduced motion: no sweep, ring ping or auto orbit; the pulse rests at its midpoint');
  await p.context().close();

  // ── 5. motion: new bricks drop in one after another (stagger min(0.12 s, 0.9 s / n)); un-laying is instant ──
  p = await open(terr(725), { motion: true });
  await p.waitForFunction(() => HB3D.viewer.brandInfo(), null, { timeout: 60000 }).catch(() => {});
  r = await p.evaluate(() => {
    const v = HB3D.viewer, rec = v._bm.find(x => x && x.part === 'brick'), dt = depositTarget(), N = v.model.counts.bricks;
    const pAt = n => 0.03 + 0.77 * (n + 0.5) / N;   // progress that has laid exactly n bricks
    v.setState({ p: pAt(100) }); const k0 = rec.cnt;
    v.setState({ p: pAt(104) }); const k1 = rec.cnt, st = Array.from(rec.laid.slice(k0, k1));
    v.setState({ p: pAt(100) }); const k2 = rec.cnt, gone = Array.from(rec.laid.slice(k0, k1));
    return { added: k1 - k0, gaps: st.slice(1).map((s, i) => +(s - st[i]).toFixed(3)), back: k2 === k0, gone: gone.every(s => s > 1e8), uDrop: rec.front.material.uniforms.uDrop.value };
  });
  ok(r.added === 4 && r.gaps.every(g => Math.abs(g - 0.12) < 1e-3), 'four new bricks land one after another, 0.12 s apart (' + r.gaps.join(', ') + ')');
  ok(Math.abs(r.uDrop - 0.45) < 1e-9, 'each brick drops 6 courses (0.45 m) as it lands');
  ok(r.back && r.gone, 'un-laying is instant');
  await p.context().close();

  // ── 6. phone width: no sideways scroll, tag inside the stage ──
  p = await open(semi, { w: 390, h: 844 }); await settle(p); await p.waitForTimeout(400);
  r = await p.evaluate(() => { const s = document.getElementById('house-scene').getBoundingClientRect(), l = document.getElementById('hb3d-rowlabel').getBoundingClientRect(); return { sw: document.documentElement.scrollWidth, iw: innerWidth, inside: l.left >= s.left - 1 && l.right <= s.right + 1, dpr: HB3D.viewer.renderer.getPixelRatio() }; });
  ok(r.sw <= r.iw, 'no sideways scroll at 390 px (' + r.sw + ' <= ' + r.iw + ')');
  ok(r.inside, 'the ROW tag stays inside the stage at 390 px');
  ok(r.dpr <= 1.5, 'pixel ratio capped at 1.5 below 700 px');
  await p.context().close();

  // ── 7. ?house=new turns it on and keeps it on for this device (owner, 30 Oct: an installed app must keep it); ?house=old turns it off. Level 2 keeps its own look ──
  p = await open(semi, { flag: false, query: '?house=new' }); await settle(p);
  r = await p.evaluate(() => ({ on: !!HB3D.viewer.brandInfo(), stored: localStorage.getItem('vi-flag-house') }));
  ok(r.on && r.stored === '1', '?house=new shows the brand build and keeps the flag for this device');
  ok(await p.evaluate(() => { history.replaceState(null, '', location.pathname + '?house=old'); const off = !viFlag('house'); return off && localStorage.getItem('vi-flag-house') === '0'; }), '?house=old switches it off again (stored, so the device stays classic)');
  await p.evaluate(() => { state.houseMode = 'purchased'; state.mortgageBalance = 200000; state.valuation = 320000; save(); updateUI(); }); await settle(p);
  r = await p.evaluate(() => { const v = HB3D.viewer; return { mode: hb3dState().mode, brand: !!v.brandInfo(), grpVis: !!(v._bGroup && v._bGroup.visible), water: v.water.visible }; });
  ok(r.mode === 'equity' && !r.brand && !r.grpVis && r.water, 'Level 2 (equity) keeps its current look with the flag on');
  await p.context().close();

  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 3).join(' | '));
  await b.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
