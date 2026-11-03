// Wealth Roadmap (owner, 3 Nov 2026): "I do not like our achievment icons for the road map, redesign with these inspirations,
// think futuristic tokens ... a more detailed levelling up system in the Achievments tab, we will rename the tab called Wealth
// Roadmap which will show the new roadmap mirrored on the dashboard"
//  1. the nav tab reads Wealth Roadmap (internal id stays `achievements`)
//  2. one roadmap card: on the dashboard, and inside the Wealth Roadmap tab while that tab is open
//  3. roadmap stages draw as tokens (hex face, rim studs, number plate), not round coins; the stage to work on is the largest
//  4. the levelling panel: rank token, level, XP to next, XP from stages plus badges, tier counts, token collection, next goals
//  5. phone 390: no sideways scroll; no page errors
const { chromium } = require('playwright');
const routeThree = require('./three_route');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const seed = (o) => `(function(){if(localStorage.getItem('ht3'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'T',email:'t@t.com',pro:true}));localStorage.setItem('vi_pioneer','true');localStorage.setItem('ht3',${JSON.stringify(JSON.stringify(o))});})();`;
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const w of [1100, 390]) {
    const phone = w < 700;
    const ctx = await b.newContext({ viewport: { width: w, height: phone ? 844 : 900 }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone }); await routeThree(ctx);
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(w + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load|net::/.test(m.text())) errs.push('console: ' + m.text()); });
    await p.addInitScript(seed({ saved: 0, target: 250000, houseType: 'terraced', deposits: [], prices: { terraced: 250000 } }));
    await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(1800);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#pro-offer-modal,#tester-welcome{display:none!important}' });
    await p.evaluate(() => { try { localStorage.setItem('vi_view', 'advanced'); } catch (e) {} showTab('overview'); }); await p.waitForTimeout(700);

    if (!phone) {
      // 1. the tab label
      const tab = await p.evaluate(() => { const t = document.querySelector('.tab-btn[data-tab="achievements"]'); return t ? { txt: t.textContent.trim(), aria: t.getAttribute('aria-label') } : null; });
      ok(tab && tab.txt === 'Wealth Roadmap' && tab.aria === 'Wealth Roadmap', 'nav tab reads Wealth Roadmap (' + JSON.stringify(tab) + ')');

      // 2. one card, mirrored between the dashboard and the tab
      const where = () => p.evaluate(() => { const c = document.querySelectorAll('#fire-roadmap-card'); const panel = c[0] && c[0].closest('.tab-panel'); return { n: c.length, panel: panel ? panel.id : null, coins: document.querySelectorAll('#fire-roadmap-svg g.fire-coin').length }; });
      let r = await where();
      ok(r.n === 1 && r.panel === 'tab-overview' && r.coins > 3, 'dashboard: the roadmap card sits on the Overview with tokens drawn (' + JSON.stringify(r) + ')');
      await p.evaluate(() => showTab('achievements')); await p.waitForTimeout(500);
      r = await where();
      ok(r.n === 1 && r.panel === 'tab-achievements' && r.coins > 3, 'Wealth Roadmap tab: the same card moves in and draws (' + JSON.stringify(r) + ')');
      const head = await p.evaluate(() => (document.querySelector('#tab-achievements .wr-title') || {}).textContent || '');
      ok(/Wealth Roadmap/.test(head), 'the tab heading says Wealth Roadmap (' + head + ')');
      await p.evaluate(() => showTab('overview')); await p.waitForTimeout(400);
      r = await where();
      ok(r.n === 1 && r.panel === 'tab-overview', 'back on the dashboard, the card is home again');

      // 3. tokens, not coins
      const tok = await p.evaluate(() => {
        const svg = document.getElementById('fire-roadmap-svg'), st = renderFIREroadmap._stages;
        const gs = [...svg.querySelectorAll('g.fire-coin')];
        const faces = gs.map(g => { const f = g.querySelector('.fire-face'); return f ? { i: +g.dataset.i, tag: f.tagName, r: +f.getAttribute('data-r'), next: +g.dataset.i === st.nextIdx, studs: g.querySelectorAll('.fire-stud').length, plate: !!g.querySelector('.fire-plate') } : null; });
        const round = gs.filter(g => [...g.querySelectorAll('circle')].some(c => c.getAttribute('fill') === '#071018')).length;
        return { faces, round, tiers: gs.map(g => g.dataset.tier) };
      });
      const f = tok.faces.filter(Boolean);
      ok(f.length === tok.faces.length && f.every(x => x.tag === 'polygon'), 'every stage has a polygon token face (' + f.length + ')');
      ok(tok.round === 0, 'no round coin faces left');
      ok(f.length > 0 && f.every(x => x.studs >= 1 && x.studs <= 3), 'each token has one step bar per step (1 to 3)');
      ok(await p.evaluate(() => { const g = document.querySelector('#fire-ground'); return !!g && g.querySelectorAll('line.fg-v').length > 4 && g.querySelectorAll('line.fg-h').length >= 6; }), 'the ground strip has a perspective grid');
      ok(await p.evaluate(() => { const S = renderFIREroadmap._stages, g = document.querySelector('#fire-roadmap-svg g.fire-coin[data-i="' + S.nextIdx + '"]'), c = g.querySelector('.fire-face').getBoundingClientRect(), sh = g.querySelector('ellipse').getBoundingClientRect(); return sh.top - c.bottom > 40; }), 'the stage to work on floats well clear of its shadow on the ground');
      ok(await p.evaluate(() => [...document.querySelectorAll('#fire-roadmap-svg use')].every(u => /^#vi-/.test(u.getAttribute('href'))) && document.querySelectorAll('#fire-roadmap-svg use').length > 3), 'stage icons come from the brand sprite');
      // round 5 (owner, 3 Nov): scrolling moves the cards, not the environment; the card nearest the middle is the largest
      const env = await p.evaluate(async () => { const SC = document.getElementById('fire-timeline-scroll'), grid = () => [...document.querySelectorAll('#fire-ground line')].map(l => l.getAttribute('x1') + ',' + l.getAttribute('x2')).join('|');
        SC.scrollLeft = 0; SC.dispatchEvent(new Event('scroll')); await new Promise(f => setTimeout(f, 400)); const g0 = grid(), c0 = document.querySelector('#fire-roadmap-svg g.fire-coin').getBoundingClientRect().left;
        SC.scrollLeft = 300; SC.dispatchEvent(new Event('scroll')); await new Promise(f => setTimeout(f, 400)); const g1 = grid(), c1 = document.querySelector('#fire-roadmap-svg g.fire-coin').getBoundingClientRect().left;
        const mid = SC.scrollLeft + SC.clientWidth / 2, gs = [...document.querySelectorAll('#fire-roadmap-svg g.fire-coin')].map(g => ({ d: Math.abs(+g.dataset.cx - mid), s: +((g.style.transform.match(/scale\(([\d.]+)\)/) || [0, 1])[1]) })).sort((a, b) => a.d - b.d);
        return { same: g0 === g1 && g0.length > 0, moved: Math.round(c0 - c1), centre: gs[0].s, edge: gs[gs.length - 1].s }; });
      ok(env.same && env.moved > 250, 'scrolling slides the cards (' + env.moved + ' px) while the perspective grid stays still');
      ok(env.centre > 1.08 && env.centre > env.edge, 'desktop: the card nearest the middle is the largest (' + env.centre + ' vs ' + env.edge + ')');
      const nx = f.find(x => x.next), ot = f.find(x => !x.next);
      ok(nx && ot && nx.r > ot.r, 'the stage to work on is the largest token (' + (nx && nx.r) + ' vs ' + (ot && ot.r) + ')');
      ok(tok.tiers.every(t => /^(starter|solid|strong|summit)$/.test(t)), 'each token carries a tier (' + [...new Set(tok.tiers)].join(',') + ')');

      // 4. levelling
      await p.evaluate(() => showTab('achievements')); await p.waitForTimeout(400);
      const lv = () => p.evaluate(() => ({
        xp: wrTotalXp(), lvl: wrLevel().n, rank: (document.getElementById('wr-rank-name') || {}).textContent || '',
        xpTxt: (document.getElementById('wr-xp-label') || {}).textContent || '',
        tiers: document.querySelectorAll('#wr-tiers .wr-tier').length, coll: document.querySelectorAll('#wr-collection .wr-tok').length,
        goals: document.querySelectorAll('#wr-next .wr-goal').length, ladder: document.querySelectorAll('#wr-ladder .wr-step').length,
        rankTok: !!document.querySelector('#wr-rank svg polygon')
      }));
      let L0 = await lv();
      ok(L0.rankTok && L0.lvl >= 1 && /XP/.test(L0.xpTxt) && L0.rank.length > 0, 'rank token, level and XP label show (' + L0.rank + ' L' + L0.lvl + ', ' + L0.xpTxt + ')');
      ok(L0.tiers === 4, 'four rarity tiers with counts (' + L0.tiers + ')');
      ok(L0.coll >= 30, 'the token collection shows every roadmap stage and badge (' + L0.coll + ')');
      ok(L0.goals >= 1 && L0.goals <= 3, 'up to three "next XP" goals (' + L0.goals + ')');
      ok(L0.ladder >= 10, 'a level ladder with every level (' + L0.ladder + ')');
      ok(await p.evaluate(() => !/[\u{1F300}-\u{1FAFF}]/u.test(document.getElementById('wr-collection').textContent)), 'no emoji in the token collection');
      // stage XP counts: confirm the first stage by snapshot and the total rises
      await p.evaluate(() => { const d = new Date(); ovState.snapshots = [{ month: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'), nw: 0 }]; renderFIREroadmap(); renderAchievements(); });
      const L1 = await lv();
      ok(L1.xp > L0.xp, 'achieving a roadmap stage adds XP (' + L0.xp + ' to ' + L1.xp + ')');
      ok(await p.evaluate(() => achState.xp) === await p.evaluate(() => (JSON.parse(localStorage.getItem(ACH_KEY) || '{}').xp || 0)), 'stage XP is worked out, not written into the saved badge XP');
      // free month guard (owner: 30 different days; Pedro: two devices on one day count once)
      const days = await p.evaluate(() => { const w0 = JSON.stringify(achState.wr); achState.wr.days = 3; achState.wr.last = ''; localStorage.removeItem('vi_last_visit'); checkStreak(); const a = achState.wr.days; localStorage.removeItem('vi_last_visit'); checkStreak(); const b = achState.wr.days; achState.wr = JSON.parse(w0); return [a, b]; });
      ok(days[0] === 4 && days[1] === 4, 'days of use: a new day counts once, a second device on the same day does not (' + days + ')');
      // linear: a stage met further along the path earns nothing until it is reached
      const lin = await p.evaluate(() => { alState.cashAccounts = [{ id: 9, name: 'Savings', type: 'Savings', balance: 1200 }]; renderFIREroadmap(); const S = renderFIREroadmap._stages, b = S.findIndex(s => s.key === 'buf500');
        return { next: S.nextIdx, b, waiting: S[b].raw && !S[b].done, earned: Object.keys(achState.wr.s).filter(k => /^buf/.test(k)) }; });
      ok(lin.b > lin.next && lin.waiting && lin.earned.length === 0, 'steps beyond the stage being worked on earn no XP yet (next ' + lin.next + ', buf500 ' + lin.b + ', earned ' + lin.earned + ')');
      // latched: XP never goes down when a figure falls
      const lat = await p.evaluate(() => { const a = wrTotalXp(); ovState.snapshots = []; alState.cashAccounts = []; renderFIREroadmap(); return [a, wrTotalXp()]; });
      ok(lat[0] > 0 && lat[1] >= lat[0], 'earned XP stays earned when a stage is no longer met (' + lat + ')');
      // the free month: Level 8 AND 30 days; one claim, sent once; it survives a reset
      const rw = await p.evaluate(async () => {
        const calls = []; window._fnInvoke = (fn, body) => { calls.push([fn, body.moment]); return Promise.resolve({ data: { ok: true } }); }; _supaUser = { id: 't' };
        const btn = () => !!document.querySelector('#wr-rank .wr-claim'), base = () => wrTotalXp() - (achState.xp || 0);
        const r = {};
        achState.wr.claim = null; achState.wr.days = 30; achState.xp = Math.max(0, 1549 - base()); renderAchievements(); r.l7 = [wrLevel().n, btn()];
        achState.xp = Math.max(0, 1600 - base()); achState.wr.days = 29; renderAchievements(); r.d29 = [wrLevel().n, btn()];
        achState.wr.days = 30; renderAchievements(); r.ready = btn();
        wrClaim(document.querySelector('#wr-rank .wr-claim')); await new Promise(f => setTimeout(f, 50)); wrClaim(); await new Promise(f => setTimeout(f, 50));
        r.calls = calls; r.claim = !!achState.wr.claim; r.after = btn();
        window.confirm = () => true; resetAllAchievements(); r.reset = [!!achState.wr.claim, achState.wr.days];
        return r; });
      ok(rw.l7[0] === 7 && !rw.l7[1], 'no Claim button at Level 7 with 30 days (' + rw.l7 + ')');
      ok(rw.d29[0] >= 8 && !rw.d29[1], 'no Claim button at Level 8 with 29 days (' + rw.d29 + ')');
      ok(rw.ready, 'Claim button shows at Level 8 with 30 days');
      ok(rw.calls.length === 1 && rw.calls[0][0] === 'tester-feedback' && rw.calls[0][1] === 'reward_claim' && rw.claim && !rw.after, 'Claim sends one reward_claim request, records it and the button goes (' + JSON.stringify(rw.calls) + ')');
      ok(rw.reset[0] === true && rw.reset[1] === 30, 'the claim and days of use survive "Reset badges and XP" (' + rw.reset + ')');
    } else {
      // 5. phone: no sideways scroll on the tab
      await p.evaluate(() => showTab('achievements')); await p.waitForTimeout(600);
      const sw = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok(sw <= 1, 'phone 390: no sideways scroll on Wealth Roadmap (' + sw + ')');
      const small = await p.evaluate(() => [...document.querySelectorAll('#tab-achievements .wr-wrap *')].filter(e => e.childNodes.length && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && e.getClientRects().length && parseFloat(getComputedStyle(e).fontSize) < 10.5).map(e => e.className + ':' + getComputedStyle(e).fontSize).slice(0, 5));
      ok(small.length === 0, 'phone 390: no text under 10.5 px in the levelling panel (' + small.join(' ') + ')');
      // SVG text scales with its picture, so measure what is drawn (Pedro, round 2: card text was under the floor)
      for (const tab of ['achievements', 'overview']) {
        await p.evaluate(tb => { showTab(tb); try { fireJumpToCurrent(); } catch (e) {} }, tab); await p.waitForTimeout(500);
        const tiny = await p.evaluate(() => [...document.querySelectorAll('.wt text, #fire-roadmap-svg text')].filter(t => t.getClientRects().length).map(t => { const m = t.getScreenCTM(); return { c: t.getAttribute('class') || 'rail', px: +(parseFloat(getComputedStyle(t).fontSize) * Math.hypot(m.a, m.b)).toFixed(2) }; }).filter(x => x.px < 10.45));
        ok(tiny.length === 0, 'phone 390 ' + tab + ': every token and rail text renders at 10.5 px or more (' + JSON.stringify(tiny.slice(0, 4)) + ')');
      }
    }
    await ctx.close();
  }
  ok(errs.length === 0, 'no errors ' + errs.slice(0, 3).join(' | '));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
})();
