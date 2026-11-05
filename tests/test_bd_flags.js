// Budget 3D tree map: each group ring-fenced by an outline and named by a flag post (owner, 2 Nov 2026: "I still can't see the outline
// separating each of the sections on the where your income flows graph. So, say a dark red outline should ring fence all of the committed
// essentials, and then a flag post to the label. And then that should be rolled out across the rest."). Pedro's spec G (V08_PEDRO_UI_SPEC.md):
// outline 1.5 px at .95, fill .08, inset .3 units, drawn after the blocks; post 1 px in the group colour from the back-left corner to two block
// heights above the tallest block, 3 px dot, re-projected every frame; chip #080808 at .88, 1 px group stroke at .5, radius 4, padding 4 6,
// name DM Sans 600 11 px #E8E8E8, amount Share Tech Mono 10.5 px in the group colour; collisions raise the post one chip height, up to 3 steps,
// then amount only, never off the post; the old floor plates are replaced; reduced motion: static posts. Committed essential is --coral.
// Run: node tests/test_bd_flags.js
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
const { chromium } = require('playwright'); const routeThree = require('./three_route');
const APP = process.env.VI_APP || require('./lib/vi').FILE_URL;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const src = require('fs').readFileSync(__dirname + '/test_nw3d.js', 'utf8');
const seed = eval('(' + src.slice(src.indexOf('const seed = (o) =>') + 'const seed = '.length, src.indexOf('// WCAG AA')).trim().replace(/;$/, '') + ')');
const EXP = [{ id: 3, name: 'Rent', amount: 700, type: 'ce' }, { id: 4, name: 'Council tax', amount: 140, type: 'ce' }, { id: 5, name: 'Groceries', amount: 260, type: 've' }, { id: 6, name: 'Gym', amount: 35, type: 'cn' }, { id: 7, name: 'Takeaways', amount: 90, type: 'vn' }, { id: 8, name: 'House deposit', amount: 500, type: 'sv' }, { id: 9, name: 'ISA', amount: 150, type: 'iv' }];
const CORAL = [229, 83, 95];   // --coral #E5535F, Night (the stage is Night in both themes)
const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [theme, w, rm] of [['dark', 390, true], ['dark', 690, true], ['light', 1100, true], ['dark', 1440, true], ['dark', 1100, false]]) {
    const mob = w < 700, ctx = await b.newContext({ viewport: { width: w, height: mob ? 844 : 900 }, isMobile: mob, hasTouch: mob, reducedMotion: rm ? 'reduce' : 'no-preference' });
    await routeThree(ctx); await ctx.route(/open\.er-api\.com/, r => r.abort());
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(theme + w + ' ' + e.message));
    await p.addInitScript(seed, { theme, flag: true }); await p.addInitScript((e) => { const o = JSON.parse(localStorage.getItem('pos_ov1')); if (o.expenses.length < 3) { o.expenses = e; localStorage.setItem('pos_ov1', JSON.stringify(o)); } }, EXP);
    await p.goto(APP); await p.waitForTimeout(1800);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#pro-offer-modal,#sync-banner,#trial-banner,#tester-welcome{display:none!important}' });
    await p.evaluate(() => showTab('budget')); await p.waitForTimeout(700);
    await p.click('#bd-view button[data-v="3d"]');
    await p.evaluate(() => document.getElementById('bd3d-cv').scrollIntoView({ block: 'center' }));
    const T = theme + ' ' + w + (rm ? ' (reduced motion)' : '') + ': ';
    // wait for every group's blocks to land (at once with reduced motion)
    await p.waitForFunction(() => { const e = bd3d.engine(); return e && e.flags && e.flags().length && e.flags().every(f => f.alpha >= 1); }, null, { timeout: rm ? 8000 : 40000 }).catch(() => {});
    // the camera is still settling after the intro (longer in a taller stage): give every post up to 8 s to find room for its chip
    await p.waitForFunction(() => { const e = bd3d.engine(); return e && e.flags().every(f => f.chip); }, null, { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(400);
    const r = await p.evaluate(() => { const e = bd3d.engine(), cv = document.getElementById('bd3d-cv'), cw = cv.clientWidth, ch = cv.clientHeight;
      return { flags: e.flags ? e.flags() : null, outlines: e.outlines ? e.outlines() : null, rects: e.rects(), cw, ch, fmt: e.rects().map(x => gbpFmt(x.sum)), plates: e.plates ? e.plates() : null, tag: e.tagRect ? e.tagRect() : null }; });
    if (!r.flags) { ok(false, T + 'the tree map draws flag posts (no flags() hook yet)'); await ctx.close(); continue; }
    const F = r.flags, R = r.rects, C = F.filter(f => f.chip);
    ok(F.length === R.length && R.every(x => F.some(f => f.group === x.group)), T + 'every group has its flag post (' + F.length + ' of ' + R.length + ')');
    const ce = F.find(f => f.group === 'ce');
    ok(ce && ce.col.join(',') === CORAL.join(',') && ce.name === 'Committed essential' && ce.chip && !ce.amountOnly, T + 'committed essential flies --coral, the owner\'s dark red, and keeps its name on every width (' + (ce && ce.col) + ')');
    ok(F.every((f, i) => { const k = R.findIndex(x => x.group === f.group); return f.amount === r.fmt[k] && (f.amountOnly || f.name.length > 2); }), T + 'each chip names its group and its monthly total');
    ok(C.length === F.length, T + 'every post carries its chip (' + C.length + ' of ' + F.length + ')');
    ok(C.every(f => f.chip.x >= 0 && f.chip.y >= 0 && f.chip.x + f.chip.w <= r.cw + 0.5), T + 'every chip is inside the stage');
    ok(C.every((f, i) => C.every((g, j) => i === j || !hit(f.chip, g.chip))), T + 'no chip overlaps another');
    ok(r.tag && C.every(f => !hit(f.chip, r.tag)), T + 'no chip sits under the Monthly income tag');
    // Pedro round 1: the chip's anchored corner sits exactly on the dot centre, no gap (bottom-left, or bottom-right when it hangs left)
    ok(C.every(f => Math.abs(f.chip.y + f.chip.h - f.dot[1]) < 0.01 && (Math.abs(f.chip.x - f.dot[0]) < 0.01 || Math.abs(f.chip.x + f.chip.w - f.dot[0]) < 0.01)), T + 'every chip\'s corner sits exactly on its own post\'s dot, no gap, never slid off it');
    ok(F.every(f => f.raise >= 0 && f.raise <= 3), T + 'a crowded chip is raised at most three chip heights (' + F.map(f => f.raise).join(',') + ')');
    ok(F.every(f => Math.abs(f.worldTop - 3 * f.blockH) < 1e-6), T + 'posts rise to two block heights above the blocks');
    ok(C.length && C.every(f => f.style.fill === 'rgba(8,8,8,0.88)' && f.style.stroke === 0.5 && f.style.radius === 4 && f.style.padX === 6 && f.style.padY === 4 && /600 11px/.test(f.style.nameFont) && /DM Sans/.test(f.style.nameFont) && /10\.5px/.test(f.style.amtFont) && /Share Tech Mono/.test(f.style.amtFont) && f.style.nameCol === '#E8E8E8' && f.style.post === 1 && f.style.dot === 3),
      T + 'chip, post and dot follow the spec (DM Sans 600 11 name, Share Tech Mono 10.5 amount, #080808 at .88, radius 4)');
    const O = r.outlines || [];
    ok(O.length === R.length && O.every(o => o.lineWidth === 1.5 && o.alpha === 0.95 && o.fill === 0.08 && o.inset === 0.3 && o.afterBlocks), T + 'each group is ring-fenced: 1.5 px outline at .95 over the blocks, fill .08, inset .3');
    ok(O.every(o => o.group === 'iv' ? JSON.stringify(o.dash) === '[6,4]' : !(o.dash && o.dash.length)), T + 'Investments is ring-fenced with a dashed line (6 on, 4 off), the rest solid (Pedro round 1)');
    ok(C.every(f => f.style.dash === undefined), T + 'every chip keeps a solid stroke');
    ok(r.plates === 0, T + 'the old dark floor labels are gone (replaced by the chips)');
    // the posts turn with the orbit: re-projected every frame
    const turned = await p.evaluate(() => new Promise(res => { const e = bd3d.engine(), a = e.flags().map(f => f.dot.slice()); e.zoom(1.3); e.kick && e.kick(); setTimeout(() => res({ a, b: e.flags().map(f => f.dot.slice()) }), 500); }));
    ok(turned.a.some((d, i) => Math.hypot(d[0] - turned.b[i][0], d[1] - turned.b[i][1]) > 3), T + 'the posts turn with the orbit (re-projected every frame)');
    if (rm) ok(F.every(f => f.rise === 1), T + 'reduced motion: the posts stand at full height at once');
    await ctx.close();
  }
  ok(!errs.length, 'no page errors ' + errs.slice(0, 3).join(' | '));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
