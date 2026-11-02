// v0.8 stream D2 (owner, 2 Nov), two items:
// 1) Budget "Spending & saving per month" cards: no "·" between the words ("Committed essential"), a smaller icon tile
//    (36 to 40 px), titles two lines at most, and the title never runs into the amount and "% of income" column.
//    390, 690 (the fold, unfolded), 1100 and 1440, Night and Daylight. Chevrons, expand and collapse still work.
// 2) House tab: the Level 1 card and the old PROGRESS tile become one tile: one bar, one set of stats each with a line
//    icon, one milestone set with the house-type names, earned and unearned. ROW card, "Show it on the house",
//    "Preview your mortgage" stay. No dead columns: stats 2 across at 390, 4 to 6 across on tablet and desktop.
// Run: node tests/test_v08_cards.js
const { chromium } = require('playwright'); const routeThree = require('./three_route');
const APP = process.env.VI_APP || 'file:///home/user/Vault-It/index.html';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const SEED = (theme) => {
  localStorage.setItem('vi-theme', theme); localStorage.setItem('vi_declined_demo', 'true');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  if (localStorage.getItem('v08x')) return; localStorage.setItem('v08x', '1');
  // big amounts in every group, so the amount column is as wide as it gets
  localStorage.setItem('pos_ov1', JSON.stringify({ income: [{ id: 1, name: 'Salary', amount: 4800, cat: 'salary' }], expenses: [
    { id: 3, name: 'Rent', amount: 1775.5, type: 'ce' }, { id: 4, name: 'Food', amount: 412.25, type: 've' }, { id: 5, name: 'Gym', amount: 1045, type: 'cn' },
    { id: 6, name: 'Takeaways', amount: 175, type: 'vn' }, { id: 7, name: 'Pot', amount: 1200, type: 'sv' }, { id: 8, name: 'ISA', amount: 175, type: 'iv' }] }));
  localStorage.setItem('ht3', JSON.stringify({ saved: 8500, target: 320000, houseType: 'semi', depositPct: 20,
    prices: { terraced: 200000, semi: 320000, detached: 500000, mansion: 1500000, flat: 80000, apartment: 300000 }, deposits: [{ amount: 8500, date: '30/10/2026' }] }));
};
const HIDE = '#welcome-overlay,#login-overlay,#pro-offer-modal,#sync-banner,#trial-banner,#tester-welcome{display:none!important}';
(async () => {
  const b = await chromium.launch();
  for (const theme of ['dark', 'light']) for (const w of [390, 690, 1100, 1440]) {
    const mob = w < 700, t = theme + ' ' + w + 'px: ';
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: mob, hasTouch: mob, colorScheme: theme });
    await routeThree(ctx); await ctx.route(/open\.er-api\.com/, r => r.abort());
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(SEED, theme); await p.goto(APP); await p.waitForTimeout(1800); await p.addStyleTag({ content: HIDE });

    // ── 1) Budget cards ──
    await p.evaluate(() => { showTab('budget'); bdFoldAll(true); }); await p.waitForTimeout(600);
    const bd = await p.evaluate(() => [...document.querySelectorAll('.bd-tile')].map(tl => {
      const b = tl.querySelector('.bd-tile-tt b'), tt = tl.querySelector('.bd-tile-tt').getBoundingClientRect(), s = tl.querySelector('.bd-tile-sum').getBoundingClientRect(),
        ic = tl.querySelector('.bd-tile-ic').getBoundingClientRect(), ch = tl.querySelector('.bd-chev').getBoundingClientRect(), br = b.getBoundingClientRect(), lh = parseFloat(getComputedStyle(b).lineHeight) || parseFloat(getComputedStyle(b).fontSize) * 1.3;
      return { g: tl.dataset.g, text: b.textContent, lines: Math.round(br.height / lh), icw: Math.round(ic.width), ich: Math.round(ic.height), clash: tt.right > s.left + 0.5 || br.right > s.left + 0.5 || s.right > ch.left + 0.5, sumInside: s.right <= tl.getBoundingClientRect().right };
    }));
    ok(bd.length === 6, t + 'six spending cards (' + bd.length + ')');
    ok(bd.every(x => !/[·•.]/.test(x.text)), t + 'no separator in the titles (' + bd.map(x => x.text).join(' | ') + ')');
    ok(bd.find(x => x.g === 'ce').text === 'Committed essential' && bd.find(x => x.g === 'vn').text === 'Variable non-essential', t + 'titles read "Committed essential", "Variable non-essential"');
    ok(bd.every(x => x.icw >= 36 && x.icw <= 40 && x.ich === x.icw), t + 'icon tiles 36 to 40 px (' + bd.map(x => x.icw).join(',') + ')');
    ok(bd.every(x => x.lines <= 2), t + 'every title two lines at most (' + bd.map(x => x.g + ':' + x.lines).join(' ') + ')');
    ok(bd.every(x => !x.clash && x.sumInside), t + 'no title runs into the amount column, nor the amount into the arrow (' + bd.filter(x => x.clash).map(x => x.g).join(',') + ')');
    const fold = await p.evaluate(async () => { const hd = document.querySelector('.bd-tile[data-g="iv"] .bd-tile-hd'); hd.click(); await new Promise(r => setTimeout(r, 300));
      const open = !document.querySelector('.bd-tile[data-g="iv"]').classList.contains('folded'); document.querySelector('.bd-tile[data-g="iv"] .bd-tile-hd').click(); await new Promise(r => setTimeout(r, 300));
      return { open, shut: document.querySelector('.bd-tile[data-g="iv"]').classList.contains('folded'), chev: !!document.querySelector('.bd-tile[data-g="iv"] .bd-chev use[href="#vi-chevron"]') }; });
    ok(fold.open && fold.shut && fold.chev, t + 'the chevron still opens and folds a card');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), t + 'Budget: no sideways scroll');

    // ── 2) House: one progress tile ──
    await p.evaluate(() => { setSetting && setSetting('view', 'adv'); showTab('house'); }); await p.waitForTimeout(800);
    await p.waitForFunction(() => /Each brick ≈/.test((document.getElementById('hb-hud') || {}).innerText || ''), null, { timeout: 30000 }).catch(() => {});
    const h = await p.evaluate(() => {
      const hud = document.getElementById('hb-hud'), panel = hud.parentElement, R = e => e.getBoundingClientRect(), shown = e => e && getComputedStyle(e).display !== 'none' && e.getClientRects().length;
      const cards = [...panel.children].filter(shown), pr = R(panel);
      // dead columns: every row of cards fills the panel's width
      const rows = {}; cards.forEach(c => { const r = R(c), k = Math.round(r.top); (rows[k] = rows[k] || []).push(r); });
      const dead = Object.values(rows).some(rs => pr.right - Math.max(...rs.map(r => r.right)) > 24 || Math.min(...rs.map(r => r.left)) - pr.left > 24);
      const st = [...hud.querySelectorAll('.hb-stx > div')], tops = st.map(s => Math.round(R(s).top)), perRow = tops.filter(x => x === tops[0]).length;
      const overlap = st.some((a, i) => st.some((c, j) => j > i && R(a).left < R(c).right - 1 && R(c).left < R(a).right - 1 && R(a).top < R(c).bottom - 1 && R(c).top < R(a).bottom - 1));
      const textOver = st.some(s => [...s.children].some(k => R(k).right > R(s).right + 1 || R(k).left < R(s).left - 1));
      const ms = [...hud.querySelectorAll('.mss .ms')];
      return { prog: !!document.getElementById('hb-prog'), bars: hud.querySelectorAll('.hb-xp, .pbar-wrap').length, panelBars: panel.querySelectorAll('.hb-xp, .pbar-wrap').length,
        stats: st.length, icons: st.every(s => s.querySelector('svg.vi-ic')), labels: st.map(s => s.innerText.replace(/\s+/g, ' ').toLowerCase()), perRow, overlap, textOver, dead, ncards: cards.length,
        ms: ms.length, msTxt: ms.map(m => m.textContent.trim()), hit: ms.filter(m => m.classList.contains('hit')).length, badges: hud.querySelectorAll('.hb-badges').length,
        row: /ROW\s*\d+\s*of\s*\d+/i.test(hud.innerText), show: /Show it on the house/.test(hud.innerText), mort: /Preview your mortgage/.test(hud.innerText), ids: ['stBricks', 'stTiles', 'stRemain', 'stDeposit', 'pbarFill', 'savedAmt', 'ms1', 'ms100'].every(id => hud.contains(document.getElementById(id))),
        side: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };
    });
    ok(!h.prog && h.panelBars === 1 && h.bars === 1, t + 'one progress tile with one bar (old PROGRESS tile gone: ' + !h.prog + ', bars ' + h.panelBars + ')');
    ok(h.stats >= 6 && h.icons, t + 'six or more stats, each with a line icon (' + h.stats + ')');
    ok(['uk bricks', 'to go', 'deposit', 'roof tiles', 'xp', 'streak'].every(k => h.labels.some(l => l.includes(k))), t + 'stats: bricks, to go, deposit, roof tiles, XP, streak (' + h.labels.join(' / ') + ')');
    ok(w < 600 ? h.perRow === 2 : h.perRow >= 4 && h.perRow <= 6, t + 'stats ' + h.perRow + ' across');
    ok(!h.overlap && !h.textOver, t + 'stats never overlap');
    ok(h.ms === 10 && h.badges === 0 && /Shared Foundation Poured/.test(h.msTxt.join('|')) && h.hit === 2, t + 'one milestone set, house-type names, 2 earned of 10 (' + h.ms + ', ' + h.hit + ')');
    ok(h.row && h.show && h.mort, t + 'ROW card, "Show it on the house" and "Preview your mortgage" stay');
    ok(h.ids, t + 'the bar, stats and milestones keep their ids, inside the one tile');
    ok(!h.dead, t + 'no dead columns beside the cards (' + h.ncards + ' cards)');
    ok(!h.side && errs.length === 0, t + 'House: no sideways scroll, no page errors ' + errs.slice(0, 1));
    await ctx.close();
  }
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
