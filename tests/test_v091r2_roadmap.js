// v0.9.1 round 2, chunk C (owner, 4 Nov 2026; docs/briefs/V091_ROUND2.md R3 to R8, R22): the Wealth Roadmap strip and one XP source
//  R3  a wider, flatter ground plane under the slates: a trapezoid, narrow at the far edge and running past the sides at the near edge
//  R4  each section has its own colour; every slate is outlined in its section's colour
//  R5  (reversed in C2, 4 Nov ~12:40) only slates not achieved yet are greyed; achieved ones are in full colour
//  C2  slate names are boxed labels, lower down, in the Next goals heading font, never overlapping
//  C3  section names are wide Syne lettering painted on the ground in perspective
//  R6  section dividers on the ground follow the perspective (they lean away from the middle of the view)
//  R7  teal = standard, purple = big milestone, gold = one graduation slate per section, the last one in it
//  R8  50 achievements, most in Foundation, Stabilise and Save; the new ones are triggered by data the app holds and never hold
//      up the linear stages, so nobody's current stage moves
//  R22 the profile card reads the same level and XP as the Wealth Roadmap; saved badge XP is never rewritten
const { chromium } = require('playwright');
const routeThree = require('./three_route');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const seed = (o) => `(function(){if(localStorage.getItem('ht3'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'Test User',email:'t@t.com',pro:true}));localStorage.setItem('vi_pioneer','true');localStorage.setItem('ht3',${JSON.stringify(JSON.stringify(o))});})();`;
const APP = process.env.VI_APP || 'file:///home/user/Vault-It/index.html';
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const w of [1100, 390]) {
    const phone = w < 700, t = w + 'px: ';
    const ctx = await b.newContext({ viewport: { width: w, height: phone ? 844 : 900 }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone }); await routeThree(ctx);
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(w + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load|net::/.test(m.text())) errs.push('console: ' + m.text()); });
    await p.addInitScript(seed({ saved: 0, target: 250000, houseType: 'terraced', deposits: [], prices: { terraced: 250000 } }));
    await p.goto(APP); await p.waitForTimeout(1800);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#pro-offer-modal,#tester-welcome{display:none!important}' });
    await p.evaluate(() => { try { localStorage.setItem('vi_view', 'advanced'); } catch (e) {} showTab('overview'); }); await p.waitForTimeout(700);
    const reset = () => p.evaluate(() => {
      ovState.snapshots = []; ovState.manual = {}; ovState.skipped = {}; ovState.income = []; ovState.expenses = [];
      debtState.debts = []; alState.liabilities = []; alState.cashAccounts = []; alState.stockPies = [];
      try { localStorage.removeItem('vi_nw_history'); } catch (e) {}
      state.saved = 0; state.target = 250000; state.houseMode = null; state.deposits = [];
      renderFIREroadmap();
    });
    await reset();

    if (!phone) {
      // R8: 50 achievements, front-loaded; 30 linear stages keep their order; the 20 new ones never hold anything up
      const r8 = await p.evaluate(() => {
        const S = renderFIREroadmap._stages, per = FIRE_PHASES.map((_, i) => S.filter(s => s.phase === i).length);
        const spine = S.filter(s => !s.bonus).map(s => s.key);
        return { n: S.length, per, bonus: S.filter(s => s.bonus).length, spine, uniq: new Set(S.map(s => s.key)).size,
          text: S.map(s => s.name + ' ' + s.desc + ' ' + (s.long || '')).join(' | '), next: S[S.nextIdx].key, done: S.doneCount };
      });
      ok(r8.n === 50 && r8.uniq === 50, 'the roadmap holds 50 achievements, each with its own key (' + r8.n + ', ' + r8.uniq + ' keys)');
      ok(r8.bonus === 20 && r8.spine.length === 30 && r8.spine[0] === 'firstLog' && r8.spine[29] === 'legacy', 'the 30 linear stages keep their order; 20 are new (' + r8.bonus + ')');
      const front = r8.per[0] + r8.per[1] + r8.per[2];
      ok(front >= 30 && Math.min(r8.per[0], r8.per[1], r8.per[2]) > Math.max(r8.per[3], r8.per[4], r8.per[5]), 'most are in Foundation, Stabilise and Save (' + r8.per.join('/') + ')');
      ok(!/\u2014/.test(r8.text), 'no em dashes in achievement copy');
      ok(!/\b(you should|we recommend|you must|best to|consider (investing|opening|paying))\b/i.test(r8.text), 'no advice in achievement copy');
      ok(r8.next === 'firstLog' && r8.done === 0, 'fresh user: First Log is still the stage to work on');

      // a new achievement met early counts at once, pays its XP once, and does not move the stage to work on
      const bon = await p.evaluate(() => {
        const xp0 = wrTotalXp();
        ovState.income = [{ id: 1, name: 'Salary', amount: 2000 }]; renderFIREroadmap();
        const S = renderFIREroadmap._stages, inc = S.find(s => s.key === 'incomeIn');
        const xp1 = wrTotalXp(); renderFIREroadmap(); const xp2 = wrTotalXp();
        return { found: !!inc, bonus: inc && inc.bonus, done: inc && inc.done, next: S[S.nextIdx].key, gain: xp1 - xp0, again: xp2 - xp1,
          label: document.getElementById('fire-current-label').textContent, prog: document.getElementById('fire-progress-txt').textContent };
      });
      ok(bon.found && bon.bonus && bon.done && bon.next === 'firstLog', 'income added: "Income in" is achieved while First Log stays next (' + JSON.stringify(bon) + ')');
      ok(bon.gain > 0 && bon.gain <= 40 && bon.again === 0, 'it pays a small XP award once (' + bon.gain + ', then ' + bon.again + ')');
      ok(/STAGE 1\/30/.test(bon.label) && /^1 of 50 achieved/.test(bon.prog), 'the header still counts the 30 linear stages; progress counts all 50 (' + bon.label + ' | ' + bon.prog + ')');

      // R4 + R7: six section colours; one gold graduation slate per section, the last in it; purple big milestones; the rest teal
      const r7 = await p.evaluate(() => {
        const S = renderFIREroadmap._stages;
        const cols = FIRE_PHASES.map(ph => ph.col.toLowerCase());
        const grads = FIRE_PHASES.map((_, i) => { const ss = S.filter(s => s.phase === i); return { n: ss.filter(s => fireLook(s) === 'grad').length, last: fireLook(ss[ss.length - 1]) === 'grad' }; });
        const looks = S.map(s => fireLook(s));
        return { cols, grads, big: looks.filter(l => l === 'big').length, std: looks.filter(l => l === 'std').length, ef6: fireLook(S.find(s => s.key === 'ef6')), buf500: fireLook(S.find(s => s.key === 'buf500')) };
      });
      ok(new Set(r7.cols).size === 6, 'each of the six sections has its own colour (' + r7.cols.join(' ') + ')');
      ok(r7.grads.every(g => g.n === 1 && g.last), 'every section ends in exactly one gold graduation slate (' + JSON.stringify(r7.grads) + ')');
      ok(r7.big >= 6 && r7.std > r7.big && r7.ef6 === 'big' && r7.buf500 === 'std', 'purple for big milestones, teal for the rest (' + r7.big + ' big, ' + r7.std + ' standard)');
      const dom = await p.evaluate(() => {
        const S = renderFIREroadmap._stages, gs = [...document.querySelectorAll('#fire-roadmap-svg g.fire-coin')];
        return gs.map(g => { const s = S[+g.dataset.i], ol = g.querySelector('.wt-ol'), wt = g.querySelector('.wt');
          return { look: g.dataset.look, want: fireLook(s), cls: wt && wt.getAttribute('class'), ol: ol && ol.style.stroke, sec: viDay(FIRE_PHASES[s.phase].col) }; });   // the theme's version of the section colour
      });
      const hex = c => { const m = /rgb\((\d+), ?(\d+), ?(\d+)\)/.exec(c || ''); return m ? '#' + m.slice(1).map(x => (+x).toString(16).padStart(2, '0')).join('') : String(c).toLowerCase(); };
      ok(dom.length > 4 && dom.every(d => d.look === d.want), 'each drawn slate carries its look (' + dom.map(d => d.look).join(',') + ')');
      ok(dom.every(d => /t-(solid|strong|summit)\b/.test(d.cls) && (d.look !== 'std' || /t-solid\b/.test(d.cls)) && (d.look !== 'big' || /t-strong\b/.test(d.cls)) && (d.look !== 'grad' || /t-summit\b/.test(d.cls))), 'standard slates are teal, big milestones purple, graduation gold');
      ok(dom.every(d => d.ol && hex(d.ol) === d.sec.toLowerCase()), 'every slate is outlined in its section colour (' + dom.slice(0, 3).map(d => hex(d.ol) + '/' + d.sec).join(' ') + ')');

      // R5, reversed by the owner (4 Nov ~12:40, C2: "only grey out ones that have not been achieved yet"): achieved slates in full
      // colour; every slate not achieved yet is greyed (grey card art, or a grey wash on a met-but-waiting one); next up stays clear
      const grey = await p.evaluate(() => {
        const S = renderFIREroadmap._stages, gs = [...document.querySelectorAll('#fire-roadmap-svg g.fire-coin')];
        return gs.map(g => { const s = S[+g.dataset.i], gr = g.querySelector('.wt-grey'), face = g.querySelector('.fire-face');
          return { done: !!s.done, next: +g.dataset.i === S.nextIdx, wash: gr ? +getComputedStyle(gr).fillOpacity : 0, lockArt: /wtc-lock/.test(face.getAttribute('fill')) }; });
      });
      ok(grey.some(x => x.done) && grey.filter(x => x.done).every(x => x.wash === 0 && !x.lockArt), 'achieved slates are in full colour: no grey wash, no grey art (' + JSON.stringify(grey.filter(x => x.done).slice(0, 2)) + ')');
      ok(grey.filter(x => !x.done && !x.next).length > 0 && grey.filter(x => !x.done && !x.next).every(x => x.lockArt || x.wash >= 0.3), 'every slate not achieved yet is greyed (' + JSON.stringify(grey.filter(x => !x.done).slice(0, 3)) + ')');
      ok(grey.filter(x => x.next).every(x => x.wash === 0 && !x.lockArt), 'the stage to work on stays in full colour');
      // a met-but-waiting slate is greyed by a wash, its colour still readable under it
      const wait = await p.evaluate(() => { alState.cashAccounts = [{ id: 9, name: 'Savings', type: 'Savings', balance: 1200 }]; renderFIREroadmap();
        const S = renderFIREroadmap._stages, i = S.findIndex(s => s.key === 'buf500'), g = document.querySelector('#fire-roadmap-svg g.fire-coin[data-i="' + i + '"]');
        const SC = document.getElementById('fire-timeline-scroll'); SC.scrollLeft = i * FIRE_NODE; renderFIREroadmap();
        const g2 = document.querySelector('#fire-roadmap-svg g.fire-coin[data-i="' + i + '"]'), gr = g2 && g2.querySelector('.wt-grey');
        const r = { waiting: S[i].raw && !S[i].done, wash: gr ? +getComputedStyle(gr).fillOpacity : 0, lockArt: g2 ? /wtc-lock/.test(g2.querySelector('.fire-face').getAttribute('fill')) : null };
        alState.cashAccounts = []; SC.scrollLeft = 0; renderFIREroadmap(); return r; });
      ok(wait.waiting && wait.wash >= 0.3 && wait.lockArt === false, 'a met-but-waiting slate keeps its colour under a grey wash (' + JSON.stringify(wait) + ')');

      // R22: one level source. A badge-only 1,300 XP plus 745 XP of roadmap steps reads Level 8, Vault Guard, everywhere
      const lv = await p.evaluate(() => {
        achState.xp = 1300; const w = wrState(); w.s = { 'firstLog.0': 745 }; w.q = {}; w.m = {}; w.h = {};
        renderPioneerCard(); const card = document.getElementById('sb-pioneer-card');
        const badge = card.querySelector('.pc-level-badge'), meta = card.querySelector('.pc-xp-meta');
        return { total: wrTotalXp(), lvl: wrLevel().n, name: wrLevel().name, cur: currentLevel().n, badge: badge && badge.textContent, meta: meta && meta.textContent, saved: achState.xp };
      });
      ok(lv.total === 2045 && lv.lvl === 8 && lv.name === 'Vault Guard' && lv.cur === 'Vault Guard', 'the roadmap and currentLevel() agree: Level 8, Vault Guard at 2,045 XP (' + JSON.stringify(lv) + ')');
      ok(/LV\.8 · VAULT GUARD/.test(lv.badge || '') && /2,045 XP/.test(lv.meta || '') && /5 to Compounder/.test(lv.meta || ''), 'the profile card says Lv.8 Vault Guard, 2,045 XP, 5 to Compounder (' + lv.badge + ' | ' + lv.meta + ')');
      ok(lv.saved === 1300, 'the saved badge XP is not rewritten (' + lv.saved + ')');
      await reset();
    }

    // R3 + R6: the ground is a wide trapezoid under the slates; section dividers lean with the perspective
    await p.evaluate(() => { const SC = document.getElementById('fire-timeline-scroll'); SC.scrollLeft = 0; renderFIREroadmap(); });
    await p.waitForTimeout(300);
    const gr = await p.evaluate(() => {
      const g = document.getElementById('fire-ground'), pl = g.querySelector('.fg-plane'), SC = document.getElementById('fire-timeline-scroll');
      const pts = pl ? pl.getAttribute('points').trim().split(/\s+/).map(q => q.split(',').map(Number)) : [];
      const w = SC.clientWidth, H = g.getBoundingClientRect().height;
      const S = renderFIREroadmap._stages, coin = document.querySelector('#fire-roadmap-svg g.fire-coin:not(.next) .fire-face').getBoundingClientRect(), gtop = g.getBoundingClientRect().top;
      return { pts, w, H, gap: gtop - coin.bottom, fgh: g.querySelectorAll('line.fg-h').length, fgv: g.querySelectorAll('line.fg-v').length };
    });
    const top = gr.pts.filter(q => q[1] === 0), bot = gr.pts.filter(q => q[1] > 0);
    ok(gr.pts.length === 4 && top.length === 2 && bot.length === 2, t + 'the ground plane is a four-sided shape (' + JSON.stringify(gr.pts) + ')');
    if (top.length === 2 && bot.length === 2) {
      const tw = Math.abs(top[1][0] - top[0][0]), bw = Math.abs(bot[1][0] - bot[0][0]), inset = Math.min(top[0][0], top[1][0]);
      ok(inset > 8 && bw > gr.w && bw > tw * 1.2, t + 'narrow at the far edge (inset ' + Math.round(inset) + '), past both sides at the near edge (' + Math.round(tw) + ' to ' + Math.round(bw) + ' of ' + gr.w + ')');
    }
    ok(gr.H >= 100 && gr.gap > -24 && gr.gap < 24, t + 'the ground starts just under the slates (height ' + Math.round(gr.H) + ', gap ' + Math.round(gr.gap) + ')');
    ok(gr.fgh >= 6 && gr.fgv > 4, t + 'the ground keeps its perspective grid (' + gr.fgh + ' across, ' + gr.fgv + ' deep)');
    const div = await p.evaluate(async () => {
      const SC = document.getElementById('fire-timeline-scroll'), S = renderFIREroadmap._stages;
      const firstSave = S.findIndex(s => s.phase === 2);
      SC.scrollLeft = Math.max(0, firstSave * FIRE_NODE + FIRE_LEFT - SC.clientWidth / 2); SC.dispatchEvent(new Event('scroll')); await new Promise(f => setTimeout(f, 400));
      const mid = SC.scrollLeft + SC.clientWidth / 2;
      return [...document.querySelectorAll('#fire-roadmap-svg line.fire-div')].map(l => ({ x1: +l.getAttribute('x1'), x2: +l.getAttribute('x2'), mid }));
    });
    ok(div.length > 0 && div.every(d => Math.abs(d.x2 - d.x1) > 2 && Math.sign(d.x2 - d.x1) === Math.sign(d.x1 - d.mid)), t + 'section dividers lean away from the middle, with the perspective (' + JSON.stringify(div.map(d => [Math.round(d.x1 - d.mid), Math.round(d.x2 - d.x1)])) + ')');
    // C2 (owner, 4 Nov ~12:40): "The text underneath need to have more breathing space so move it down ... and treat it as a label with a
    // bounding box with attached font": each name sits in its own box, well below its slate, in the Next goals heading font; none overlap
    await p.evaluate(async () => { const SC = document.getElementById('fire-timeline-scroll'); SC.scrollLeft = 900; SC.dispatchEvent(new Event('scroll')); await new Promise(f => setTimeout(f, 500)); });
    const lbl = await p.evaluate(() => [...document.querySelectorAll('#fire-roadmap-svg g.fire-coin')].map(g => {
      const L = g.querySelector('.fire-lbl'), r = L && L.querySelector('rect'), tx = L && L.querySelector('text'); if (!r || !tx) return null;
      const face = g.querySelector('.fire-face').getBoundingClientRect(), rb = r.getBoundingClientRect(), tb = tx.getBoundingClientRect(), cs = getComputedStyle(tx);
      return { gap: Math.round(rb.top - face.bottom), inside: tb.left >= rb.left - .5 && tb.right <= rb.right + .5 && tb.top >= rb.top - .5 && tb.bottom <= rb.bottom + .5,
        l: rb.left, r: rb.right, font: cs.fontFamily, wt: cs.fontWeight, fill: getComputedStyle(r).fill, name: tx.textContent }; }));
    ok(lbl.length > 3 && lbl.every(Boolean), t + 'every slate name is a label: a box with its text (' + lbl.filter(Boolean).length + ')');
    const L2 = lbl.filter(Boolean);
    ok(L2.every(x => x.inside && x.fill !== 'none'), t + 'the text sits inside a filled box (' + JSON.stringify(L2.filter(x => !x.inside).slice(0, 2)) + ')');
    ok(L2.every(x => x.gap >= 12), t + 'the labels sit well below their slates (gaps ' + [...new Set(L2.map(x => x.gap))].join(',') + ' px)');
    ok(L2.every(x => /Syne/.test(x.font) && +x.wt >= 700), t + 'labels use the Next goals heading font, Syne bold (' + L2[0].font + ' ' + L2[0].wt + ')');
    const byX = L2.slice().sort((a, b) => a.l - b.l), clash = byX.filter((x, k) => k && x.l < byX[k - 1].r + 1).map(x => x.name);
    ok(clash.length === 0, t + 'no two labels overlap (' + clash.join(', ') + ')');
    // C3 (owner, 4 Nov: "I do not like the stabilise font change to a wider version of the font and project the text for these stages across
    // the ground plane in perspective"): each section name is wide Syne lettering lying flat on the ground: squashed in depth, stretched
    // in width, and leaning away from the middle of the view like the grid; the lean follows the view as it scrolls
    const sec = await p.evaluate(async () => {
      const SC = document.getElementById('fire-timeline-scroll'), S = renderFIREroadmap._stages, gTop = document.getElementById('fire-ground').getBoundingClientRect().top;
      const read = () => { const mid = SC.scrollLeft + SC.clientWidth / 2;
        return [...document.querySelectorAll('#fire-roadmap-svg text.fire-sec')].map(t => { const m = t.transform.baseVal.consolidate(), mx = m && m.matrix, r = t.getBoundingClientRect(), cs = getComputedStyle(t);
          return { txt: t.textContent, a: mx ? mx.a : 1, c: mx ? mx.c : 0, d: mx ? mx.d : 1, x: +t.getAttribute('data-x'), mid, top: r.top - gTop, w: r.width, h: r.height, font: cs.fontFamily, wt: +cs.fontWeight, op: +cs.opacity, l: r.left, r: r.right, cx: (r.left + r.right) / 2, vl: SC.getBoundingClientRect().left, vr: SC.getBoundingClientRect().right }; }); };
      SC.scrollLeft = Math.max(0, S.findIndex(s => s.phase === 1) * FIRE_NODE); SC.dispatchEvent(new Event('scroll')); await new Promise(f => setTimeout(f, 500));
      const r1 = read(); SC.scrollLeft += 200; SC.dispatchEvent(new Event('scroll')); await new Promise(f => setTimeout(f, 500));
      const r2 = read(); return { r1, r2 };
    });
    const s1 = sec.r1.filter(x => Math.abs(x.x - x.mid) > 40);
    ok(sec.r1.length > 0 && sec.r1.every(x => /Syne/.test(x.font) && x.wt >= 800 && x.top >= -2), t + 'section names are Syne lettering on the ground (' + sec.r1.map(x => x.txt + '@' + Math.round(x.top)).join(', ') + ')');
    ok(sec.r1.every(x => x.a >= 1.2 && x.d <= 0.7 && x.w > x.h * 6), t + 'they are wide and lie flat: stretched across, squashed in depth (' + sec.r1.map(x => [x.a.toFixed(2), x.d.toFixed(2)].join('/')).join(' ') + ')');
    ok(s1.length > 0 && s1.every(x => Math.abs(x.c) > 0.05 && Math.sign(x.c) === Math.sign(x.x - x.mid)), t + 'they lean away from the middle, with the ground perspective (' + s1.map(x => (x.x - x.mid).toFixed(0) + ':' + x.c.toFixed(2)).join(' ') + ')');
    // C3 follow-up (owner, on the shots: "Test it too wide needs to be legible within a mobile screen , drop opacity to 70%")
    const inView = sec.r1.slice().sort((p, q) => Math.abs(p.cx - (p.vl + p.vr) / 2) - Math.abs(q.cx - (q.vl + q.vr) / 2)).slice(0, 1);   // the name of the section under the middle of the view
    ok(inView.length > 0 && inView.every(x => x.l >= x.vl - 1 && x.r <= x.vr + 1), t + 'a section name in view fits inside the strip, whole (' + inView.map(x => x.txt + ' ' + Math.round(x.l - x.vl) + '..' + Math.round(x.vr - x.r)).join(', ') + ')');
    ok(sec.r1.every(x => Math.abs(x.op - 0.7) < 0.01), t + 'section names at 70% opacity (' + sec.r1.map(x => x.op).join(',') + ')');
    const moved = sec.r2.find(x => sec.r1.some(y => y.txt === x.txt && Math.abs(y.c - x.c) > 0.02));
    ok(!!moved, t + 'the lean follows the view as the strip scrolls');
    await p.evaluate(() => { const SC = document.getElementById('fire-timeline-scroll'); SC.scrollLeft = 0; renderFIREroadmap(); });
    const side = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    ok(!side, t + 'no sideways scroll');
    if (phone) {
      const tiny = await p.evaluate(() => [...document.querySelectorAll('#fire-roadmap-svg text')].filter(x => x.getClientRects().length).map(x => parseFloat(getComputedStyle(x).fontSize) * (x.getScreenCTM() ? x.getScreenCTM().a : 1)).filter(s => s < 10.4));
      ok(tiny.length === 0, t + 'every roadmap text renders at 10.5 px or more (' + tiny.slice(0, 4) + ')');
    }
    await ctx.close();
  }
  ok(errs.length === 0, 'no errors ' + errs.slice(0, 3).join(' | '));
  await b.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
