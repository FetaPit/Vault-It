// v0.7 E3 (owner, 1 Nov): remove the gold tile "six later stages are already met, waiting on Debt halved"; that information shows when the user taps an achievement.
// Pedro C2: #fire-block is gone; tapping a node opens #fire-detail-panel inline under the track with a status chip (Achieved / Next up / "Met. Waiting on <next>"),
// the user's own figures and the action; on Next up only: "n later stages are already met. They tick when you finish <next>."; the selected node gets a 1 px gold ring;
// close with a 44 px x, tapping the node again, or Esc. Seeded: two stages done, the third next, three later stages already met.
// Run: node tests/test_v07_e3.js
const { chromium } = require('playwright');
const APP = process.env.VI_APP || 'file:///home/user/Vault-It/index.html';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const seed = (theme) => {
  localStorage.setItem('vi-theme', theme); localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  localStorage.setItem('pos_ov1', JSON.stringify({ income: [{ id: 1, name: 'Salary', amount: 2400, cat: 'salary' }], expenses: [{ id: 3, name: 'Rent', amount: 700, type: 'ce' }], snapshots: [{ date: '2026-10-01', nw: 1000, assets: 1000, liabilities: 0 }], manual: { noDebt: true } }));
};
(async () => {
  const b = await chromium.launch();
  for (const [theme, w] of [['dark', 390], ['light', 390], ['dark', 1100]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: w < 600, hasTouch: w < 600, colorScheme: theme });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(seed, theme); await p.goto(APP); await p.waitForTimeout(2000);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#trial-banner{display:none!important}' });
    const t = theme + ' ' + w + 'px: ';
    const S = await p.evaluate(() => { const S = renderFIREroadmap._stages; return { next: S.nextIdx, nextName: S[S.nextIdx].name, waiting: S.waiting.map(s => S.indexOf(s)), n: S.waiting.length }; });
    ok(S.next > 0 && S.n > 0, t + 'seeded: next ' + S.nextName + ', ' + S.n + ' later stages already met');
    ok(!(await p.evaluate(() => !!document.getElementById('fire-block'))), t + 'the gold tile (#fire-block) is gone');
    ok(!(await p.evaluate(() => /already met/i.test(document.getElementById('ov-fire-wrap') ? document.getElementById('ov-fire-wrap').innerText : document.body.innerText))), t + 'no "already met" text before a tap');
    const panelOpen = () => p.evaluate(() => { const d = document.getElementById('fire-detail-panel'); return !!d && getComputedStyle(d).display !== 'none' && d.getBoundingClientRect().height > 0; });
    ok(!(await panelOpen()), t + 'the detail panel starts closed');
    // tap the next stage
    await p.locator('[data-i="' + S.next + '"]').click({ force: true }); await p.waitForTimeout(500);
    ok(await panelOpen(), t + 'tapping the next stage opens the panel');
    const d = await p.evaluate(() => { const d = document.getElementById('fire-detail-panel'), tr = document.getElementById('fire-track').getBoundingClientRect(), r = d.getBoundingClientRect(), c = d.querySelector('.fire-detail-close').getBoundingClientRect();
      const ring = document.querySelector('#fire-roadmap-svg .fire-sel'); return { text: d.innerText, below: r.top >= tr.bottom - 2, cw: Math.round(c.width), ch: Math.round(c.height), ring: !!ring, ringStroke: ring ? ring.getAttribute('stroke') : '', ringW: ring ? ring.getAttribute('stroke-width') : '' }; });
    ok(/next up/i.test(d.text), t + 'status chip says Next up');
    ok(new RegExp(S.n + ' later stages? (is|are) already met\\. (It|They) ticks? when you finish .?' + S.nextName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(d.text.replace(/\s+/g, ' ')), t + 'the "already met" line sits in the Next up panel (' + d.text.replace(/\s+/g, ' ').slice(0, 160) + ')');
    ok(d.below, t + 'the panel sits inline under the track');
    ok(d.cw >= 44 && d.ch >= 44, t + 'close button 44 px (' + d.cw + 'x' + d.ch + ')');
    ok(d.ring && d.ringW === '1' && /gold|e8c56a|60480b|var\(/i.test(d.ringStroke), t + 'selected node has a 1 px gold ring (' + d.ringStroke + ')');
    if (theme === 'light') { const c = await p.evaluate(() => { const e = document.querySelector('#fire-detail-panel .fd-box.ok'); const f = x => x.match(/[\d.]+/g).slice(0, 3).map(Number); const L = a => { const v = a.map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
        const col = getComputedStyle(e).color, b = [218, 216, 208]; const l1 = L(f(col)), l2 = L(b); return (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05); });
      ok(c >= 4.5, t + 'Daylight: the "already met" box is readable (contrast ' + c.toFixed(1) + ')');
      const cs = await p.evaluate(() => { const L = a => { const v = a.map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
        const q = e => { const m = getComputedStyle(e).color.match(/[\d.]+/g).slice(0, 3).map(Number), l = L(m), l2 = L([218, 216, 208]); return +((Math.max(l, l2) + .05) / (Math.min(l, l2) + .05)).toFixed(1); };
        const col = document.querySelector('#fire-detail-inner > div:nth-child(2)'), title = col.children[0], chip = title.querySelector('span'), phase = col.children[1], prog = [...col.children].find(x => /there|of £|% /.test(x.textContent) && x.style.fontFamily);
        return { title: q(title), chip: q(chip), phase: q(phase), prog: prog ? q(prog) : 99, tick: getComputedStyle(document.querySelector('.fd-box.ok .vi-ic')).marginRight }; });
      ok(cs.title >= 4.5 && cs.chip >= 4.5 && cs.phase >= 4.5 && cs.prog >= 4.5, t + 'Daylight panel text meets AA (title ' + cs.title + ', chip ' + cs.chip + ', phase ' + cs.phase + ', progress ' + cs.prog + ')');
      ok(parseFloat(cs.tick) >= 6, t + 'the tick has a gap before the text (' + cs.tick + ')'); }
    // a later stage that is already met
    const wi = S.waiting[0];
    await p.evaluate(i => fireScrollTo(i), wi); await p.waitForTimeout(900);
    await p.locator('[data-i="' + wi + '"]').click({ force: true }); await p.waitForTimeout(400);
    const d2 = (await p.evaluate(() => document.getElementById('fire-detail-panel').innerText)).replace(/\s+/g, ' ');
    ok(new RegExp('Met\\. Waiting on ' + S.nextName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(d2), t + 'a met later stage says "Met. Waiting on ' + S.nextName + '"');
    ok(!/later stages? (is|are) already met/i.test(d2), t + 'the "already met" line is on the Next up panel only');
    // tap again closes
    await p.locator('[data-i="' + wi + '"]').click({ force: true }); await p.waitForTimeout(400);
    ok(!(await panelOpen()), t + 'tapping the same node again closes the panel');
    // Esc closes
    await p.locator('[data-i="' + wi + '"]').click({ force: true }); await p.waitForTimeout(300);
    ok(await panelOpen(), t + 'reopened');
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    ok(!(await panelOpen()), t + 'Esc closes the panel');
    // close button closes
    await p.locator('[data-i="' + wi + '"]').click({ force: true }); await p.waitForTimeout(300);
    await p.locator('#fire-detail-panel .fire-detail-close').click(); await p.waitForTimeout(400);
    ok(!(await panelOpen()), t + 'the close button closes the panel');
    ok(!(await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)), t + 'no sideways scroll');
    ok(errs.length === 0, t + 'no page errors ' + errs.slice(0, 1));
    await ctx.close();
  }
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
