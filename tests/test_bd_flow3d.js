// Round 3, items 5 to 7 (owner, 31 Oct 2026): on the Budget tab "Where your income flows" sits at the top, straight above the
// income | spending split; the dashed divider is light teal and runs on from the flow chart's income block down between the columns;
// a Flow | 3D switch shows the same budget in 3D as a tree map: one area per colour group filled with £100 blocks (smaller ones for the
// pounds left over), one empty block between areas; the income arrives as a teal pile on the left and slides right into place (owner,
// 31 Oct evening); finished at once with reduced motion. The choice is kept per device.
// Run: node tests/test_bd_flow3d.js   (VI_APP=file:///path/to/index.html to test another copy)
const { chromium } = require('playwright'); const routeThree = require('./three_route');
const APP = process.env.VI_APP || 'file:///home/user/Vault-It/index.html';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const src = require('fs').readFileSync(__dirname + '/test_nw3d.js', 'utf8');
const seed = eval('(' + src.slice(src.indexOf('const seed = (o) =>') + 'const seed = '.length, src.indexOf('// WCAG AA')).trim().replace(/;$/, '') + ')');
const EXP = [{ id: 3, name: 'Rent', amount: 700, type: 'ce' }, { id: 4, name: 'Council tax', amount: 140, type: 'ce' }, { id: 5, name: 'Groceries', amount: 260, type: 've' }, { id: 6, name: 'Gym', amount: 35, type: 'cn' }, { id: 7, name: 'Takeaways', amount: 90, type: 'vn' }, { id: 8, name: 'House deposit', amount: 500, type: 'sv' }, { id: 9, name: 'S&S ISA', amount: 300, type: 'iv' }];
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [theme, w, rm] of [['dark', 1100, false], ['light', 1100, true], ['dark', 390, true]]) {
    const mob = w < 700, ctx = await b.newContext({ viewport: { width: w, height: mob ? 844 : 900 }, isMobile: mob, hasTouch: mob, reducedMotion: rm ? 'reduce' : 'no-preference' });
    await routeThree(ctx); await ctx.route(/open\.er-api\.com/, r => r.abort());
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(theme + w + ' ' + e.message));
    await p.addInitScript(seed, { theme, flag: true }); await p.addInitScript((e) => { const o = JSON.parse(localStorage.getItem('pos_ov1')); if (o.expenses.length < 3) { o.expenses = e; localStorage.setItem('pos_ov1', JSON.stringify(o)); } }, EXP);
    await p.goto(APP); await p.waitForTimeout(1800);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#pro-offer-modal,#sync-banner,#trial-banner,#tester-welcome{display:none!important}' });
    await p.evaluate(() => showTab('budget')); await p.waitForTimeout(700);
    const T = theme + ' ' + w + (rm ? ' (reduced motion)' : '') + ': ';
    let r = await p.evaluate(() => { const card = document.querySelector('.bd-sankey-card'), split = document.querySelector('.bd-split'), kids = [...document.querySelector('.bd-page').children];
      const bf = getComputedStyle(split, '::before'), af = getComputedStyle(card, '::after');
      return { order: kids.indexOf(card) < kids.indexOf(split) && kids.indexOf(card) <= 5, gap: Math.round(split.getBoundingClientRect().top - card.getBoundingClientRect().bottom),
        before: { c: bf.borderLeftColor, s: bf.borderLeftStyle, top: parseFloat(bf.top), x: split.getBoundingClientRect().left + parseFloat(bf.left) }, after: { c: af.borderLeftColor, s: af.borderLeftStyle, x: card.getBoundingClientRect().left + parseFloat(getComputedStyle(card).borderLeftWidth) + parseFloat(af.left) }, teal: getComputedStyle(document.documentElement).getPropertyValue('--teal').trim() }; });
    ok(r.order, T + 'the income flow is at the top of the tab, above the income and spending columns');
    if (w >= 1000) {
      ok(r.before.s === 'dashed' && r.after.s === 'dashed' && r.before.c === r.after.c && Math.abs(r.before.x - r.after.x) < 1.5, T + 'one dashed divider, the same colour and position in the flow chart and between the columns (' + r.before.c + ' at x ' + r.before.x.toFixed(1) + ' / ' + r.after.x.toFixed(1) + ')');
      ok(r.before.top <= -r.gap, T + 'the divider reaches up across the gap to the flow chart (top ' + r.before.top + ', gap ' + r.gap + ')');
      const lum = await p.evaluate((c) => { const m = c.match(/[\d.]+/g).map(Number); const v = /color\(srgb/.test(c) ? m.map(x => x * 255) : m; return [v[0], v[1], v[2]]; }, r.before.c);
      ok(lum[1] > lum[0] && lum[2] > lum[0] && (theme === 'light' || lum[1] > 150), T + 'the divider is light teal (' + lum.map(Math.round).join(',') + ')');
    }
    ok(await p.evaluate(() => bd3d.view() === 'flow' && !document.getElementById('bd-sankey').hidden && document.getElementById('bd-3d').hidden), T + 'Flow is the default');
    await p.click('#bd-view button[data-v="3d"]'); await p.waitForTimeout(rm ? 600 : 300);
    r = await p.evaluate(() => { const e = bd3d.engine(), t = e.tiles(), cv = document.getElementById('bd3d-cv'), cr = cv.getBoundingClientRect();
      return { n: t.length, unit: e.unit(), lines: t.map(x => ({ n: x.name, v: x.v, b: x.blocks, w: x.worth })), rects: e.rects(), phase: e.phase(), groups: [...new Set(t.map(x => x.group))].join(','), sum: t.reduce((a, x) => a + x.worth, 0), total: +cv.dataset.total, flowHidden: getComputedStyle(document.getElementById('bd-sankey')).display === 'none', h: cr.height, pressed: document.querySelector('#bd-view [data-v="3d"]').getAttribute('aria-pressed'), saved: localStorage.getItem('vi-bd-view') }; });
    ok(r.n === 8 && r.groups === 'ce,sv,un,iv,ve,vn,cn' || (r.n === 8 && r.groups.split(',').sort().join() === 'ce,cn,iv,sv,un,ve,vn'), T + '3D: one block per budget line, plus what is not assigned as its own group (' + r.groups + ')');
    ok(r.unit === 100 && r.lines.every(l => l.b === Math.ceil(l.v / 100 - 1e-9) && Math.abs(l.w - l.v) < 0.01), T + '3D: every line is a run of £100 blocks, the last one its share of £100 (' + r.lines.map(l => l.n + ' ' + l.b).join(', ') + ')');
    // a tree map (owner, 31 Oct evening): one rectangle per colour group on the block grid, never overlapping, one empty block between groups
    const R = r.rects, apart = (a, c) => a.x + a.w < c.x || c.x + c.w < a.x || a.z + a.h < c.z || c.z + c.h < a.z;
    ok(R.length === 7 && R.every((a, i) => R.every((c, j) => i === j || apart(a, c))), T + '3D tree map: one area per group, one empty block between areas (' + R.map(a => a.group + ' ' + a.x + ',' + a.z + ' ' + a.w + 'x' + a.h).join('; ') + ')');
    ok(R.every(a => a.blocks <= a.w * a.h && a.w * a.h - a.blocks < Math.max(a.w, a.h)), T + '3D tree map: each area holds its blocks with less than one row spare');
    ok(new Set(R.map(a => a.z)).size < R.length, T + '3D tree map: areas share rows side by side (not one bar per group)');
    ok(R.slice(0, -1).every((a, i) => i === 0 || a.blocks <= R[i - 1].blocks) && R[R.length - 1].group === 'un', T + '3D tree map: largest first, what is not assigned last');
    ok(Math.abs(r.sum - r.total) < 0.5 && r.total === 2400, T + '3D: the blocks add up to the monthly income (' + r.sum + ' of ' + r.total + ')');
    ok(r.flowHidden && r.h > 250 && r.pressed === 'true' && r.saved === '3d', T + '3D shows instead of the flow chart, and the choice is kept (' + Math.round(r.h) + ' px stage)');
    // entry animation: blocks rise in group order; with reduced motion they are already in place
    const shot = await p.evaluate(() => { const cv = document.getElementById('bd3d-cv'), c = cv.getContext('2d'), d = c.getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 0; i < d.length; i += 16) if (d[i] > 180 && d[i + 1] < 140) n++; return n; });
    await p.waitForTimeout(rm ? 300 : 2400);
    const shot2 = await p.evaluate(() => { const cv = document.getElementById('bd3d-cv'), c = cv.getContext('2d'), d = c.getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 0; i < d.length; i += 16) if (d[i] > 180 && d[i + 1] < 140) n++; return n; });
    if (rm) ok(r.phase === 'done' && shot2 > 0 && Math.abs(shot2 - shot) / Math.max(shot2, 1) < 0.15, T + 'reduced motion: the map is drawn finished straight away (' + r.phase + ', ' + shot + ' / ' + shot2 + ' red pixels)');
    else {
      ok(r.phase === 'pile' || r.phase === 'moving', T + 'the intro starts with the income as a pile (' + r.phase + ')');
      await p.waitForTimeout(2600);
      const shot3 = await p.evaluate(() => { const cv = document.getElementById('bd3d-cv'), c = cv.getContext('2d'), d = c.getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 0; i < d.length; i += 16) if (d[i] > 180 && d[i + 1] < 140) n++; return n; });
      ok(shot3 > shot * 1.2 && await p.evaluate(() => bd3d.engine().phase()) === 'done', T + 'the income blocks slide right and take their groups\' colours (' + shot + ' then ' + shot3 + ' red pixels)');
      await p.evaluate(() => bd3d.engine().replay()); await p.waitForTimeout(150);
      ok(await p.evaluate(() => bd3d.engine().phase()) === 'pile', T + 'Replay plays the intro again from the pile');
      await p.waitForTimeout(5200);
    }
    // tap a block to read it
    const pt = await p.evaluate(() => { const cv = document.getElementById('bd3d-cv'), r = cv.getBoundingClientRect(); return { x: r.left + r.width * 0.36, y: r.top + r.height * 0.55 }; });
    await p.mouse.move(pt.x, pt.y); await p.waitForTimeout(300);
    const read = await p.evaluate(() => document.getElementById('bd3d-read').textContent);
    ok(/a month, \d+% of your income|Income £/.test(read), T + 'the readout names a block or the income (' + read + ')');
    // back to Flow
    await p.click('#bd-view button[data-v="flow"]'); await p.waitForTimeout(400);
    ok(await p.evaluate(() => bd3d.view() === 'flow' && document.querySelector('#bd-sankey svg') && getComputedStyle(document.getElementById('bd-3d')).display === 'none'), T + 'Flow brings the flow chart back');
    ok(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 1, T + 'no sideways scroll');
    await ctx.close();
  }
  await b.close();
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
