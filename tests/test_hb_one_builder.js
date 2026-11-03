// One house builder (owner, 31 Oct 22:05 and 1 Nov 2026): "We need to completely delete this old version". The brand build is the only
// house builder; Level 2 is drawn in the brand look; Level 3 and "Your own design" are locked under Pro for everyone; when 3D cannot
// run, a still picture of the same house at its current build level, with the same figures.
//  1. No house flag: ?house=old and vi-flag-house=0 still give the brand build; Settings has no house builder switch.
//  2. Level 2 paying the mortgage: the brand build draws it, gold tag "MORTGAGE x% PAID", the paid share below the cut, a hologram above.
//     A payment raises the line (the paid share eases up). Mortgage free: tag "MORTGAGE FREE", windows lit, door gold.
//  3. Level 3 locked: the chip shows a lock and PRO, choosing it keeps Level 2, the unlock does nothing, a saved level3 still shows Level 2.
//  4. Your own design locked: the card says it is coming later with Pro, no upload or AI prompt, nothing switches the house.
//  5. Still picture: with the 3D engine blocked the stage is a drawn 2D picture with the build level, and the HUD figures stay.
//  6. The old code is gone: no SVG engine, no classic viewer paths.
const { chromium } = require('playwright');
const routeThree = require('./three_route');
const INDEX = 'file://' + (process.env.VI_INDEX || '/home/user/Vault-It/index.html');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const seed = (o, extra) => `(function(){if(localStorage.getItem('ht3'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'T',email:'t@t.com',pro:true}));localStorage.setItem('vi_pioneer','true');${extra || ''}localStorage.setItem('ht3',${JSON.stringify(JSON.stringify(o))});})()`;
const L1 = { saved: 20000, target: 320000, houseType: 'semi', depositPct: 20, deposits: [{ amount: 20000, date: '01/10/2026' }], prices: { semi: 320000 } };
const L2 = { saved: 37500, target: 250000, houseType: 'semi', houseMode: 'purchased', depositPct: 15, mortgageBalance: 191250, valuation: 250000, purchase: { price: 250000, deposit: 37500, depositTarget: 37500, date: '2026-10-01' }, deposits: [{ amount: 37500, date: '01/10/2026' }], prices: { semi: 250000 }, calc: { over: 300, _set: true, price: 250000, dep: 37500, bal: 212500, val: 250000 } };

(async () => {
  const b = await chromium.launch(); const errs = [];
  const open = async (o, opt) => {
    opt = opt || {};
    const ctx = await b.newContext({ viewport: { width: opt.w || 1100, height: 900 }, reducedMotion: opt.motion ? 'no-preference' : 'reduce' });
    if (opt.noThree) await ctx.route(/cdn\.jsdelivr\.net/, r => r.abort()); else await routeThree(ctx);
    const p = await ctx.newPage(); p.setDefaultTimeout(120000);
    p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(seed(o, opt.extra)); await p.goto(INDEX + (opt.query || '')); await p.waitForTimeout(1500);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
    await p.evaluate(() => { showTab('house'); document.getElementById('house-scene').scrollIntoView({ block: 'center' }); });
    if (!opt.noThree) await p.waitForFunction(() => window.HB3D && HB3D.viewer && HB3D.viewer.brandInfo && HB3D.viewer.brandInfo() && HB3D.viewer.settled(), null, { timeout: 90000, polling: 300 }).catch(() => {});
    else await p.waitForTimeout(5000);
    return p;
  };

  // ── 1. no house flag ──
  let p = await open(L1, { query: '?house=old', extra: "localStorage.setItem('vi-flag-house','0');" });
  let r = await p.evaluate(() => ({ brand: !!HB3D.viewer.brand, info: !!HB3D.viewer.brandInfo(), sw: !!document.getElementById('set-house3d'), flag: typeof VI_FLAG_DEFAULT === 'object' ? Object.keys(VI_FLAG_DEFAULT).join(',') : '' }));
  ok(r.brand && r.info, 'Level 1 is the brand build even with ?house=old and vi-flag-house=0');
  ok(!r.sw && r.flag === 'nw', 'no house builder switch in Settings; only the net worth flag is left (' + r.flag + ')');
  // ── 6. the old code is gone ──
  r = await p.evaluate(() => ({ svg: !!document.getElementById('houseSvg'), iso: typeof _iso, draw: typeof DRAW, ghost: typeof hbGhostWrap, eq: typeof hbShadeEquity,
    band: 'rowBand' in HB3D.viewer && !!HB3D.viewer.rowBand, water: !!HB3D.viewer.water, cust: HB3D.Viewer ? typeof HB3D.Viewer.prototype._stepAnim : 'undefined', holoMat: typeof HB3D._holoMaterial }));
  ok(!r.svg && r.iso === 'undefined' && r.draw === 'undefined' && r.ghost === 'undefined' && r.eq === 'undefined', 'the SVG blueprint engine is gone');
  ok(!r.band && !r.water && r.cust === 'undefined' && r.holoMat === 'undefined', 'the classic 3D look is gone (no row band, waterline ring, tween or hologram material)');
  // ── 3. Level 3 locked ──
  await p.context().close();
  p = await open(Object.assign({}, L2, { level3: true, viewLevel: 3 }));
  r = await p.evaluate(() => { const chips = [...document.querySelectorAll('#hb-levels .hb-lv')], c3 = chips[2];
    const before = JSON.stringify({ l3: state.level3, v: state.viewLevel });
    hbSetView(3); const v1 = hbView(); hbUnlockL3();
    return { level: hbLevel(), view: v1, chip: c3 && c3.textContent, lock: c3 && c3.classList.contains('lock'), hud: document.getElementById('hb-hud').innerText, card: typeof hbL3Card === 'function' ? hbL3Card() : '',
      same: before === JSON.stringify({ l3: state.level3, v: state.viewLevel }), mode: hb3dState().mode, up: (document.getElementById('hb3d-upglabel') || { style: {} }).style.display };
  });
  ok(r.level === 2 && r.view === 2 && r.mode === 'equity', 'a saved Level 3 shows Level 2 (level ' + r.level + ', view ' + r.view + ', ' + r.mode + ')');
  ok(r.lock && /🔒/.test(r.chip) && /PRO/.test(r.chip), 'the Level 3 chip is locked with PRO (' + (r.chip || '').trim() + ')');
  ok(/Coming later as part of Pro/.test(r.card) && !/Unlock/.test(r.card), 'the Level 3 card says it comes later with Pro, no unlock button');
  ok(r.same, 'choosing Level 3 or unlocking it changes nothing saved');
  // ── 2. Level 2 in the brand look: the hologram house, the equity share of its value laid in real colours ──
  await p.waitForFunction(() => HB3D.viewer.mode === 'equity' && HB3D.viewer.settled(), null, { timeout: 60000, polling: 300 }).catch(() => {});
  const L2info = () => { const v = HB3D.viewer, i = v.brandInfo();
    if (v.engine === 'house_gl') { const u = v.readUniforms(['uLit']), bb = v.model.batches.find(b => b.kinds && b.kinds.brick), hex = bb ? HB3D.brandColourOf(bb, 0) : 0;   // the brand-book renderer: one draw, colour by a uniform threshold
      return { info: !!i, tag: document.getElementById('hb3d-rowlabel').textContent, own: getComputedStyle(document.getElementById('hb3d-ownlabel')).display, colour: i && i.colour, total: i && i.colourTotal,
        holo: v.laidAll(), layers: i && i.colour > 0 ? 1 : 0, eq: v.eq, want: hbL2Own(), paid: hbL2Progress(), lit: u.uLit[0], door: u.uLit[1], cap: document.getElementById('hb3d-cap').textContent, rgb: [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255] }; }
    const recs = v._bm.filter(Boolean);
    return { info: !!i, tag: document.getElementById('hb3d-rowlabel').textContent, own: getComputedStyle(document.getElementById('hb3d-ownlabel')).display, colour: i && i.colour, total: i && i.colourTotal,
      holo: recs.every(r => r.cnt === r.n), layers: recs.filter(r => r.C).length, eq: v.eq, want: hbL2Own(), paid: hbL2Progress(), lit: v._bU.uLitGlass.value, door: v._bU.uLitDoor.value,
      cap: document.getElementById('hb3d-cap').textContent, rgb: (() => { const r = recs.find(x => x.part === 'brick'); return r ? [r.rgb[0], r.rgb[1], r.rgb[2]] : null; })() }; };
  r = await p.evaluate(L2info);
  const want0 = Math.floor(r.total * r.want + 1e-6);
  ok(r.info && r.own === 'none' && /^MORTGAGE [\d.]+% PAIDYOU OWN [\d.]+%$/.test(r.tag), 'paying the mortgage is the brand build with the gold tag (' + r.tag + ')');
  ok(Math.abs(r.eq - r.want) < 1e-9 && r.want > r.paid, 'the colour follows the share of the home owned, deposit included (' + (r.want * 100).toFixed(1) + '% owned, ' + (r.paid * 100).toFixed(1) + '% of the loan paid)');
  ok(r.holo && r.colour === want0 && r.layers > 0, 'the whole house is there as the hologram and ' + r.colour + ' of ' + r.total + ' parts are in colour (want ' + want0 + ')');
  ok(r.rgb && (r.rgb[0] !== r.rgb[1] || r.rgb[1] !== r.rgb[2]) && r.lit === 0, 'bricks carry their real colour (rgb ' + r.rgb + '), windows not lit yet');
  ok(/bricks and tiles yours/.test(r.cap), 'the caption counts what is yours (' + r.cap.split(' · ').slice(0, 2).join(' · ') + ')');
  const c0 = r.colour;
  await p.evaluate(() => { state.mortgageBalance -= 40000; save(); updateUI(); });
  await p.waitForFunction(() => HB3D.viewer.settled(), null, { timeout: 60000, polling: 300 }).catch(() => {});
  r = await p.evaluate(L2info);
  ok(r.colour > c0 && r.colour === Math.floor(r.total * r.want + 1e-6), 'a payment lays more bricks in colour (' + c0 + ' -> ' + r.colour + ', ' + r.tag + ')');
  await p.evaluate(() => { state.mortgageBalance = 0; save(); updateUI(); });
  await p.waitForFunction(() => HB3D.viewer.mode === 'complete' && HB3D.viewer.settled(), null, { timeout: 60000, polling: 300 }).catch(() => {});
  r = await p.evaluate(L2info);
  ok(r.tag === 'MORTGAGE FREE' && r.colour === r.total && r.lit === 1 && r.door === 1, 'mortgage free: every part in colour, windows lit, door gold, tag MORTGAGE FREE');
  // laying in colour uses the Level 1 drop: with motion on, a payment stamps lay times in the future of the frame clock
  await p.context().close();
  p = await open(L2, { motion: true });
  await p.waitForFunction(() => HB3D.viewer.settled(), null, { timeout: 90000, polling: 500 }).catch(() => {});
  r = await p.evaluate(async () => { const v = HB3D.viewer; state.mortgageBalance -= 2000; save(); updateUI();
    await new Promise(res => setTimeout(res, 400));
    if (v.engine === 'house_gl') { const c0 = v._Vc; await new Promise(res => setTimeout(res, 600)); return { dropping: v._Vc > c0, future: v.eq > v._bEq, drop: v.dropCourses() * 0.075 }; }   // the brand-book renderer eases the colour line up over the frames
    const rec = v._bm.find(x => x && x.part === 'brick'), C = rec.C, t = v._bNow();
    return { dropping: C.front.visible && C.front.count > 0, future: Array.from(C.laid.slice(Math.max(0, C.cnt - 3), C.cnt)).some(x => x > t - 0.9), drop: C.front.material.uniforms.uDrop.value };
  });
  ok(r.dropping && r.future && r.drop > 0, 'new colour bricks drop in like Level 1 (instanced while landing, drop ' + (r.drop || 0).toFixed(2) + ' m)');
  // ── 4. your own design locked ──
  r = await p.evaluate(() => { const c = document.getElementById('hb-own-design'); loadCustomModel({ files: [] }); return { txt: c && c.textContent, input: !!document.getElementById('model-file-input'), meshy: !!document.getElementById('meshy-prompt'), on: hbDesignOn(), type: hb3dState().type }; });
  ok(/Coming later as part of Pro/.test(r.txt) && /PRO/.test(r.txt) && !r.input && !r.meshy, 'Your own design is shown under Pro, locked: no upload, no AI prompt');
  ok(r.on === false && r.type !== 'custom', 'nothing can switch the house to an uploaded design');
  await p.context().close();
  // ── 5. still picture when 3D cannot run (the old viewer without three.js; the brand-book renderer needs no three.js and shows the same still without WebGL, tests/test_house_gl.js) ──
  for (const [nm, o] of [['Level 1', L1], ['Level 2', L2]]) for (const w of [390, 1100]) {
    p = await open(o, { noThree: true, w, query: '?house=legacy' });
    r = await p.evaluate(() => { const el = document.getElementById('house-scene'), cv = document.getElementById('hbStill'), g = cv.getContext('2d'), d = g.getImageData(0, 0, cv.width, cv.height).data;
      let lit = 0; for (let i = 0; i < d.length; i += 16) if (d[i + 1] > 120) lit++;
      return { eng: el.getAttribute('data-engine'), w: cv.width, lit: lit, hud: document.getElementById('hb-hud').innerText, rail: getComputedStyle(el.querySelector('.hud-bar') || el).display, side: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 }; });
    ok(r.eng === 'still' && r.w > 0 && r.lit > 200, `${nm} at ${w} px without the 3D engine: a still picture of the house (${r.lit} bright samples)`);
    ok(/£/.test(r.hud) && (nm === 'Level 1' ? /ROW \d+ of \d+/i.test(r.hud) : /LEVEL 2/.test(r.hud)), `${nm} at ${w} px: the HUD figures are still there`);
    ok(r.rail === 'none' && !r.side, `${nm} at ${w} px: no zoom or orbit buttons on the still picture, no sideways scroll`);
    await p.context().close();
  }
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL:', e.message); process.exit(1); });
