// v0.9.1 chunk F (owner, 3 Nov): House builder look, E7 E8 E10 E11.
//  E7  the six stat tiles each get their own colour role, a bigger icon in a tinted disc, a 3 px role rule on top.
//  E8  the six house-type icons are redrawn (48 grid, one gold accent each), 44 / 36 / 32 px.
//  E10 the hologram note and card label are bigger (13 / 12.5 desktop, 12 tablet, 11.5 phone); no 10.5 px copy left in the tile.
//  E11 the milestones become a vertical timeline, earliest first: right column at 1100 and up, under the stats below that;
//      percentages gold and at least 18 px (desktop); "£x to go" on the next one; done rows full contrast (no opacity dimming).
// Run: node tests/test_v091_house_look.js
const { chromium } = require('playwright'); const routeThree = require('./three_route');
const APP = process.env.VI_APP || 'file:///home/user/Vault-It/index.html';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const SEED = (theme) => {
  localStorage.setItem('vi-theme', theme); localStorage.setItem('vi_declined_demo', 'true');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  if (localStorage.getItem('v091x')) return; localStorage.setItem('v091x', '1');
  localStorage.setItem('ht3', JSON.stringify({ saved: 16000, target: 320000, houseType: 'semi', depositPct: 20,
    prices: { terraced: 200000, semi: 320000, detached: 500000, mansion: 1500000, flat: 80000, apartment: 300000 }, deposits: [{ amount: 16000, date: '30/10/2026' }] }));
};
const HIDE = '#welcome-overlay,#login-overlay,#pro-offer-modal,#sync-banner,#trial-banner,#tester-welcome{display:none!important}';
(async () => {
  const b = await chromium.launch();
  for (const theme of ['dark', 'light']) for (const w of [390, 690, 768, 1100, 1440]) {
    const mob = w < 700, t = theme + ' ' + w + 'px: ';
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: mob, hasTouch: mob, colorScheme: theme });
    await routeThree(ctx); await ctx.route(/open\.er-api\.com/, r => r.abort());
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(SEED, theme); await p.goto(APP); await p.waitForTimeout(1800); await p.addStyleTag({ content: HIDE });
    await p.evaluate(() => { setSetting && setSetting('view', 'adv'); showTab('house'); }); await p.waitForTimeout(800);
    await p.waitForFunction(() => /Each brick ≈/.test((document.getElementById('hb-hud') || {}).innerText || ''), null, { timeout: 30000 }).catch(() => {});
    const h = await p.evaluate(() => {
      const hud = document.getElementById('hb-hud'), R = e => e.getBoundingClientRect(), cs = e => getComputedStyle(e);
      const st = [...hud.querySelectorAll('.hb-stx > div')];
      const roleCols = st.map(s => cs(s).borderTopColor + '|' + (s.querySelector('.vi-ic') ? cs(s.querySelector('.vi-ic')).color : ''));
      const ic = st[0] && st[0].querySelector('.vi-ic');
      const ms = [...hud.querySelectorAll('.mss .ms')], main = hud.querySelector('.hb-pg-main'), mss = hud.querySelector('.mss');
      const pcts = ms.map(m => parseInt((m.querySelector('.ms-lbl b') || {}).textContent, 10));
      const pb = ms[0] && ms[0].querySelector('.ms-lbl b');
      const next = ms.find(m => m.classList.contains('next'));
      const types = [...document.querySelectorAll('#htypes .hbtn')];
      const tsvg = types.map(x => x.querySelector('svg'));
      const small = []; hud.querySelectorAll('.hb-pg *').forEach(e => { if (e.children.length === 0 && e.textContent.trim() && cs(e).display !== 'none') { const f = parseFloat(cs(e).fontSize); if (f < 11.5) small.push(f + ':' + e.textContent.trim().slice(0, 20)); } });
      const note = hud.querySelector('.hb-pg-note'), lbl = hud.querySelector('.card-lbl');
      return {
        roles: new Set(roleCols).size, topW: st.map(s => parseFloat(cs(s).borderTopWidth)),
        icW: ic ? R(ic).width : 0, disc: !!hud.querySelector('.hb-stx .hb-disc, .hb-stx .hb-st-ic'),
        valFs: st[0] ? parseFloat(cs(st[0].querySelector('b')).fontSize) : 0, lblFs: st[0] ? parseFloat(cs(st[0].querySelector('span')).fontSize) : 0,
        valClip: st.some(s => { const v = s.querySelector('b'); return v.scrollWidth > v.clientWidth + 1; }),
        msN: ms.length, asc: pcts.every((x, i) => !i || x > pcts[i - 1]), vertical: ms.length > 1 && R(ms[1]).top > R(ms[0]).top + 8 && Math.abs(R(ms[1]).left - R(ms[0]).left) < 4,
        right: R(mss).left >= R(main).right - 2, below: R(mss).top >= R(main).bottom - 2,
        pctFs: pb ? parseFloat(cs(pb).fontSize) : 0, pctCol: pb ? cs(pb).color : '', gold: cs(document.documentElement).getPropertyValue('--gold').trim(),
        goldRgb: (() => { const d = document.createElement('i'); d.style.color = 'var(--gold)'; document.body.appendChild(d); const c = cs(d).color; d.remove(); return c; })(),
        pctFont: pb ? cs(pb).fontFamily : '', hitN: ms.filter(m => m.classList.contains('hit')).length,
        hitOpacity: ms.filter(m => m.classList.contains('hit')).every(m => cs(m).opacity === '1'), laterOpacity: ms.filter(m => !m.classList.contains('hit')).every(m => cs(m).opacity === '1'),
        nextTxt: next ? next.textContent : '', nextN: ms.filter(m => m.classList.contains('next')).length,
        col: { top: R(mss).top, mainTop: R(main).top, h: R(mss).height, mh: R(hud.querySelector('.hb-pg-side')).bottom - R(main).top },
        tN: types.length, tKeys: types.map(x => x.dataset.type).join(','), tW: tsvg.map(s => R(s).width), tGold: tsvg.map(s => /E8C56A|gold|#e8c56a/i.test(s.innerHTML) || !!s.querySelector('.ti-gold')),
        tSw: new Set(tsvg.map(s => s.getAttribute('stroke-width') + '|' + s.getAttribute('viewBox'))).size,
        tActive: types.filter(x => x.classList.contains('active')).length, tLabelFs: parseFloat(cs(types[0].querySelector('.nm')).fontSize),
        xpGap: (() => { const g = st[2] && cs(st[2]).borderTopColor, x = st[4] && cs(st[4]).borderTopColor; return g !== x && /^rgb\(\s*(\d+)/.test(x) && (+x.match(/\d+/g)[2] > +x.match(/\d+/g)[0] - 40); })(),
        tgGap: next ? Math.round(R(next.querySelector('.ms-tg')).left - R(next.querySelector('.ms-lbl')).right) : 999, tgNear: next ? ((R(next.querySelector('.ms-tg')).left - R(next.querySelector('.ms-lbl')).right) <= 24 || (Math.abs(R(next.querySelector('.ms-tg')).left - R(next.querySelector('.ms-lbl')).left) <= 40 && R(next.querySelector('.ms-tg')).top - R(next.querySelector('.ms-lbl')).bottom <= 8)) : false,
        noteFs: note ? parseFloat(cs(note).fontSize) : 0, lblCardFs: lbl ? parseFloat(cs(lbl.querySelector('.vi-dim') || lbl).fontSize) : 0, small,
        holoBold: !!hud.querySelector('.hb-pg-note b'),
        side: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        ids: ['stBricks', 'stTiles', 'stRemain', 'stDeposit', 'pbarFill', 'savedAmt', 'ms1', 'ms100', 'msl-1'].every(id => !!document.getElementById(id)),
      };
    });
    // E7
    ok(h.roles === 6, t + 'E7 six tiles, six different colour roles (' + h.roles + ')');
    ok(h.topW.every(x => x >= 3), t + 'E7 3 px role rule on top (' + h.topW.join(',') + ')');
    ok(w >= 1100 ? h.icW >= 32 : w >= 600 ? h.icW >= 26 : h.icW >= 22, t + 'E7 icon size (' + h.icW + ')');
    ok(h.disc, t + 'E7 icon sits in a tinted disc');
    ok(h.valFs >= (w >= 1100 ? 22 : 18) && h.lblFs >= 11, t + 'E7 value >= 18 px, label >= 11 px (' + h.valFs + ', ' + h.lblFs + ')');
    ok(!h.valClip, t + 'E7 no value is cut off');
    ok(h.xpGap, t + 'E7 XP role colour is clearly apart from the deposit gold');
    ok(h.tgNear, t + 'E11 "to go" sits next to its milestone label (gap ' + h.tgGap + ')');
    // E11
    ok(h.msN === 10 && h.asc && h.vertical, t + 'E11 ten milestones, earliest first, one vertical timeline');
    ok(w >= 1100 ? h.right : h.below, t + 'E11 timeline is ' + (w >= 1100 ? 'the right column' : 'below the stats') + ' (right ' + h.right + ', below ' + h.below + ')');
    ok(w < 1100 || Math.abs(h.col.top - h.col.mainTop) <= 40, t + 'E11 timeline top lines up with the saved amount (' + Math.round(h.col.top) + ' vs ' + Math.round(h.col.mainTop) + ')');
    ok(w < 1100 || Math.abs(h.col.h - h.col.mh) <= 140, t + 'E11 columns no big void (' + Math.round(h.col.h) + ' vs ' + Math.round(h.col.mh) + ')');
    ok(w >= 1100 ? h.pctFs >= 18 : h.pctFs >= 15, t + 'E11 percentage size (' + h.pctFs + ')');
    ok(h.pctCol === h.goldRgb, t + 'E11 percentage is gold (' + h.pctCol + ' vs ' + h.goldRgb + ')');
    ok(/Share Tech Mono/.test(h.pctFont), t + 'E11 percentage in Share Tech Mono');
    ok(h.hitN === 3 && h.hitOpacity && h.laterOpacity, t + 'E11 three done at 16,000 of 64,000 (25%): 1, 5, 15 and not 30; rows not dimmed by opacity (' + h.hitN + ')');
    ok(h.nextN === 1 && /to go/.test(h.nextTxt), t + 'E11 next milestone marked and shows "to go" (' + h.nextTxt.replace(/\s+/g, ' ').trim().slice(0, 50) + ')');
    ok(h.ids, t + 'E11 ids kept');
    // E8
    ok(h.tN === 6 && h.tKeys === 'terraced,semi,detached,mansion,flat,apartment' && h.tActive === 1, t + 'E8 six types, keys kept, one active (' + h.tKeys + ')');
    ok(h.tW.every(x => (w >= 1100 ? x >= 40 : w >= 600 ? x >= 34 : x >= 30)), t + 'E8 icon size (' + h.tW.join(',') + ')');
    ok(h.tGold.every(Boolean), t + 'E8 each icon has a gold accent');
    ok(h.tSw === 1, t + 'E8 same stroke weight and grid across the six (' + h.tSw + ')');
    ok(h.tLabelFs >= 11.5, t + 'E8 labels >= 11.5 px (' + h.tLabelFs + ')');
    // E10
    ok(h.noteFs >= (w >= 1100 ? 13 : w >= 600 ? 12 : 11.5), t + 'E10 note size (' + h.noteFs + ')');
    ok(h.lblCardFs >= (w >= 1100 ? 12.5 : w >= 600 ? 12 : 11.5), t + 'E10 card label size (' + h.lblCardFs + ')');
    ok(h.small.length === 0, t + 'E10 nothing under 11.5 px in the Level 1 tile (' + h.small.slice(0, 4).join(' | ') + ')');
    ok(h.holoBold, t + 'E10 "hologram" stays bold');
    ok(!h.side && errs.length === 0, t + 'no sideways scroll, no page errors ' + errs.slice(0, 1));
    await ctx.close();
  }
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
