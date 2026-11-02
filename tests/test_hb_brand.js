// Brand build on the 3D house builder, brand handover 6.2 to 6.10. It is the only house builder (owner, 31 Oct / 1 Nov 2026): there is
// no house flag any more, so ?house=old or vi-flag-house = 0 still give the brand build, and Level 2 is drawn by it too.
// Camera rail as the brand book and recording: line icons, a column on the right at desktop, a row top right at phone width.
// No classic builder to fall back to. Brick value = deposit target x 0.77 / bricks, bricks laid =
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

  // ── 1. no house flag: ?house=old and vi-flag-house = 0 still give the brand build (the classic viewer is gone) ──
  let p = await open(semi, { flag: false, query: '?house=old' }); await settle(p);
  let r = await p.evaluate(() => {
    const v = HB3D.viewer, i = hbBrickInfo(), ri = v.rowInfo();
    return { brand: !!v.brand, grp: v.engine === 'house_gl' ? !!v._hg : !!v._bGroup, bi: !!v.brandInfo(), on: hbBrandOn(), band: v.rowBand, water: v.water, riBrand: !!(ri && ri.brand),
      setRow: !!document.getElementById('set-house3d'), cls: document.getElementById('hb3d-rowlabel').className,
      per: i.perBrick, want: depositTarget() * 0.77 / i.total, laid: document.getElementById('stBricks').textContent, bricks: (v.brandInfo() || {}).bricks };
  });
  ok(r.on && r.brand && r.grp && r.bi, '?house=old with vi-flag-house = 0: still the brand build');
  ok(r.band === undefined && r.water === undefined && r.riBrand && r.cls.includes('brand'), 'no classic row band or water plane; the row comes from the brand build');
  ok(!r.setRow, 'Settings has no house builder switch (#set-house3d gone)');
  ok(Math.abs(r.per - r.want) < 1e-9, 'brick value = deposit target x 0.77 / bricks (£' + r.per.toFixed(2) + ')');
  ok(r.laid === (r.bricks || 0).toLocaleString('en-GB'), 'brick count matches the brand build (' + r.laid + ')');
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
  const rail = await p.evaluate(() => { const h = document.getElementById('hud-bar-house'), s = document.getElementById('house-scene').getBoundingClientRect(), b = h.getBoundingClientRect(); return { dir: getComputedStyle(h).flexDirection, mid: Math.abs((b.left + b.right) / 2 - (s.left + s.right) / 2), gap: Math.round(s.bottom - b.bottom) }; });
  ok(rail.dir === 'row' && rail.mid < 4 && rail.gap >= 11 && rail.gap <= 13, 'desktop: camera controls are a row, bottom centre, 12 px up (v0.7 E18) (' + JSON.stringify(rail) + ')');
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
  r = await p.evaluate(() => { const v = HB3D.viewer;
    if (v.engine === 'house_gl') { const u = v.readUniforms(['uSweepOn', 'uPulse']); return { p: v.p, want: pct(), stamps: v.brickStamps(), sweep: u.uSweepOn, ring: v.pingAlpha() > 0, rot: v.autoOrbit(), pulse: u.uPulse }; }
    const rec = v._bm.find(x => x && x.part === 'brick'); return { p: v.p, want: pct(), stamps: Array.from(rec.laid.slice(0, rec.cnt)), sweep: v._bU.uSweepOn.value, ring: v._bEnvObj.ring.visible, rot: v.controls.autoRotate, pulse: v._bU.uPulse.value }; });
  ok(Math.abs(r.p - r.want) < 1e-12 && r.stamps.every(s => s <= -1000), 'reduced motion: built instantly, every brick already laid (no drop, flash or stagger)');
  ok(r.sweep === 0 && !r.ring && !r.rot && r.pulse === 0.5, 'reduced motion: no sweep, ring ping or auto orbit; the pulse rests at its midpoint');
  await p.context().close();

  // ── 5. motion: new bricks drop in one after another (stagger min(0.12 s, 0.9 s / n)); un-laying is instant ──
  p = await open(terr(725), { motion: true });
  await p.waitForFunction(() => HB3D.viewer.brandInfo(), null, { timeout: 60000 }).catch(() => {});
  r = await p.evaluate(() => {
    const v = HB3D.viewer, dt = depositTarget(), N = v.model.counts.bricks;
    const pAt = n => 0.03 + 0.77 * (n + 0.5) / N;   // progress that has laid exactly n bricks
    if (v.engine === 'house_gl') {   // the brand-book renderer: stamps in one array, a brick drops six courses
      v.setState({ p: pAt(100) }); const g0 = v.brickStamps().length;
      v.setState({ p: pAt(104) }); const g1 = v.brickStamps(), st2 = g1.slice(g0);
      v.setState({ p: pAt(100) }); const g2 = v.brickStamps().length, all = v._hg.stamp;
      return { added: g1.length - g0, gaps: st2.slice(1).map((s, i) => +(s - st2[i]).toFixed(3)), back: g2 === g0, gone: true, uDrop: v.dropCourses() * 0.075 };
    }
    const rec = v._bm.find(x => x && x.part === 'brick');
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
  r = await p.evaluate(() => { const s = document.getElementById('house-scene').getBoundingClientRect(), h = document.getElementById('hud-bar-house'), b = h.getBoundingClientRect(), ic = h.querySelector('svg'); return { dir: getComputedStyle(h).flexDirection, gap: Math.round(s.bottom - b.bottom), mid: Math.abs((b.left + b.right) / 2 - (s.left + s.right) / 2), ico: ic && getComputedStyle(ic).display, sw: b.right <= s.right + 1 && b.left >= s.left - 1 }; });
  ok(r.dir === 'row' && r.gap >= 11 && r.gap <= 13 && r.mid < 4 && r.sw, 'phone: camera controls are a row, bottom centre inside the stage (v0.7 E18) (' + JSON.stringify(r) + ')');
  ok(r.ico === 'block', 'phone: the controls use the brand line icons');
  await p.context().close();

  // ── 7. no house flag: ?house=new changes nothing, ?house=old does not switch the brand build off. Level 2 is drawn by the brand build ──
  p = await open(semi, { query: '?house=new' }); await settle(p);
  r = await p.evaluate(() => ({ on: !!HB3D.viewer.brandInfo(), def: JSON.stringify(VI_FLAG_DEFAULT) }));
  ok(r.on && r.def === '{"nw":true}', 'the house has no flag (VI_FLAG_DEFAULT is ' + r.def + ') and the brand build shows');
  ok(await p.evaluate(() => { history.replaceState(null, '', location.pathname + '?house=old'); viFlag('house'); updateUI(); return hbBrandOn() && !!HB3D.viewer.brandInfo(); }), '?house=old leaves the brand build on');
  await p.evaluate(() => { state.houseMode = 'purchased'; state.mortgageBalance = 200000; state.valuation = 320000; save(); updateUI(); }); await settle(p);
  await p.waitForFunction(() => /MORTGAGE/.test(document.getElementById('hb3d-rowlabel').textContent), null, { timeout: 30000 }).catch(() => {});
  r = await p.evaluate(() => { const v = HB3D.viewer, rl = document.getElementById('hb3d-rowlabel'), own = document.getElementById('hb3d-ownlabel');
    return { mode: hb3dState().mode, brand: !!v.brandInfo(), grpVis: v.engine === 'house_gl' ? !!v._hg : !!(v._bGroup && v._bGroup.visible), bi: v.brandInfo(), tag: rl.textContent, tagVis: getComputedStyle(rl).display !== 'none', own: own ? getComputedStyle(own).display : 'none', eq: HB3DAPP.want.eq, paid: HB3DAPP.want.paid, own2: hbL2Own(), prog: hbL2Progress(), cap: document.getElementById('hb3d-cap').textContent }; });
  ok(r.mode === 'equity' && r.brand && r.grpVis && r.bi.p === 1 && r.bi.bricks === r.bi.bricksTotal, 'Level 2 (equity) is drawn by the brand build: the whole house laid as the Level 1 hologram');
  ok(Math.abs(r.eq - r.own2) < 1e-12 && Math.abs(r.eq - 0.375) < 1e-9 && Math.abs(r.paid - r.prog) < 1e-12, 'you own (value - balance) / value = 37.5%; mortgage paid = hbL2Progress() (' + (r.paid * 100).toFixed(1) + '%)');
  ok(r.bi.colour > 0 && r.bi.colour < r.bi.colourTotal && Math.abs(r.bi.colour / r.bi.colourTotal - r.eq) < 0.01, 'the colour layer lays the share you own in real colours (' + r.bi.colour + ' of ' + r.bi.colourTotal + ' bricks and tiles)');
  ok(r.tagVis && r.tag === 'MORTGAGE ' + Math.floor(r.paid * 1000) / 10 + '% PAIDYOU OWN 37.5%', 'the gold tag reads ' + r.tag);
  ok(new RegExp(r.bi.colour.toLocaleString('en-GB') + ' / ' + r.bi.colourTotal.toLocaleString('en-GB') + ' bricks and tiles yours').test(r.cap), 'caption: ' + r.cap);
  ok(r.own === 'none', 'the old owned label stays hidden under the brand Level 2');
  await p.evaluate(() => { state.mortgageBalance = 0; save(); updateUI(); }); await settle(p);
  await p.waitForFunction(() => /MORTGAGE FREE/.test(document.getElementById('hb3d-rowlabel').textContent), null, { timeout: 30000 }).catch(() => {});
  r = await p.evaluate(() => ({ mode: hb3dState().mode, brand: !!HB3D.viewer.brandInfo(), tag: document.getElementById('hb3d-rowlabel').textContent, bi: HB3D.viewer.brandInfo() }));
  ok(r.mode === 'complete' && r.brand && r.tag === 'MORTGAGE FREE', 'mortgage paid off: brand build, tag MORTGAGE FREE');
  await p.context().close();

  // ── 8. 6.8 gamified feedback: the opening build is silent; laying bricks pops "+£200 · +227 bricks", flashes the stage and toasts the milestone; windows glow once lit ──
  p = await open(terr(5900)); await p.waitForFunction(() => HB3D.viewer.brandInfo(), null, { timeout: 60000 }).catch(() => {}); await settle(p);
  r = await p.evaluate(() => ({ engaged: _hbEngaged, toastShown: document.getElementById('toast').classList.contains('show'), glow: HB3D.viewer.engine === 'house_gl' ? HB3D.viewer._hg.wlist.length > 0 : !!(HB3D.viewer._bGlow && HB3D.viewer._bGlow.count), lit: HB3D.viewer.engine === 'house_gl' ? HB3D.viewer.readUniforms(['uLit']).uLit[0] : HB3D.viewer._bU.uLitGlass.value, pops: document.querySelectorAll('#hb-pops .pop').length }));
  ok(!r.engaged && !r.toastShown && r.pops === 0, 'the opening build shows no toast or pop-up (nobody has interacted yet)');
  ok(r.glow && r.lit === 0, 'every window has a glow quad, unlit while the house is still being built');
  await p.fill('#savingsInput', '200'); await p.click('#btnAdd'); await p.waitForTimeout(150);
  r = await p.evaluate(() => ({ pop: (document.querySelector('#hb-pops .pop') || {}).textContent || '', flash: document.getElementById('house-scene').classList.contains('flash'), toast: document.getElementById('toast').textContent, shown: document.getElementById('toast').classList.contains('show'), per: hbBrickInfo().perBrick, p: pct() }));
  const wantB = Math.round(200 / r.per);
  ok(r.pop === '+£200 · +' + wantB + ' bricks', 'the pop-up says what the deposit bought: ' + r.pop);
  ok(r.flash, 'the stage border flashes gold');
  ok(r.shown && r.toast === 'Milestone: 25% Quarter' && r.p >= 0.25, 'crossing 25% toasts "Milestone: 25% Quarter" (p = ' + r.p.toFixed(3) + ')');
  await p.evaluate(() => { state.saved = 24000; save(); updateUI(); }); await settle(p); await p.waitForTimeout(300);
  r = await p.evaluate(() => { const v = HB3D.viewer; if (v.engine === 'house_gl') { const u = v.readUniforms(['uLit']); return { lit: u.uLit[0], vis: u.uLit[0] > 0 && v._hg.wlist.length > 0, keys: v.brandInfo().keys, shared: true }; }   // the brand-book renderer: the glow is drawn from the same lit value on the overlay canvas
    return { lit: v._bU.uLitGlass.value, vis: v._bGlow.visible, keys: v.brandInfo().keys, shared: v._bGlow.material.uniforms.uLit === v._bU.uLitGlass }; });
  ok(r.lit === 1 && r.vis && r.keys && r.shared, 'at 100% the windows are lit and the glow follows the same uniform (alpha (0.22 + 0.10 pulse) x lit)');
  await p.context().close();

  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 3).join(' | '));
  await b.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
