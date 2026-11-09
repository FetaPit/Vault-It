// v0.95 edit (owner, 9 Nov 2026): "Just make the exisitng cards Larger view on m obile tablet and desktop with a larger inncer circle".
// The existing Wealth Roadmap card design, drawn larger on phone, tablet and desktop, with a larger inner circle; the level
// number stays inside the inner ring. Replaces the cancelled black-panel medal cards (no panel here).
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
const { chromium } = require('playwright');
const routeThree = require('./three_route');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const seed = (o) => `(function(){if(localStorage.getItem('ht3'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'Test User',email:'t@t.com',pro:true}));localStorage.setItem('vi_pioneer','true');localStorage.setItem('ht3',${JSON.stringify(JSON.stringify(o))});})();`;
const APP = process.env.VI_APP || require('./lib/vi').FILE_URL;

(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const w of [1100, 768, 390]) {
    const phone = w <= 480, t = w + 'px: ';
    const ctx = await b.newContext({ viewport: { width: w, height: phone ? 844 : 900 }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone }); await routeThree(ctx);
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(w + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load|net::/.test(m.text())) errs.push('console: ' + m.text()); });
    await p.addInitScript(seed({ saved: 0, target: 250000, houseType: 'terraced', deposits: [], prices: { terraced: 250000 } }));
    await p.goto(APP); await p.waitForTimeout(1800);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#pro-offer-modal,#tester-welcome{display:none!important}' });

    if (w === 1100) {
      // the medal: a larger inner circle, a larger icon, and the number inside the inner ring for 1 to 4 digits
      const r = await p.evaluate(() => {
        const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#000'; document.body.appendChild(host);
        const one = (o) => { host.innerHTML = wrTokSvg(o, 236, 't'); const g = host.querySelector('g.wt'), q = s => g.querySelector(s);
          const num = q('.wt-num'), ic = q('svg.wt-icon'), bb = num ? num.getBBox() : null;
          return { face: q('.wt-mface') ? +q('.wt-mface').getAttribute('r') : null, ring: q('.wt-mring') ? +q('.wt-mring').getAttribute('r') : null,
            dots: q('.wt-mdots') ? +q('.wt-mdots').getAttribute('r') : null, metal: q('.wt-metal') ? +q('.wt-metal').getAttribute('r') : null,
            panel: !!q('.wt-panel'), dial: !!q('.wt-tick'), rivets: !!q('.wt-rivet'), side: !!q('.wt-side'), tl: !!q('.wt-tl'), edges: g.querySelectorAll('.wt-edge').length,
            icon: ic ? { w: +ic.getAttribute('width'), cx: +ic.getAttribute('x') + +ic.getAttribute('width') / 2, cy: +ic.getAttribute('y') + +ic.getAttribute('width') / 2 } : null,
            num: bb ? { x: bb.x, y: bb.y, w: bb.width, h: bb.height } : null }; };
        return { icon: one({ tier: 'strong', st: 'done', ic: 'vi-keys', tl: 'LV', name: 'Keys' }),
          n: [7, 16, 100, 1000].map(n => one({ tier: 'strong', st: 'own', num: n, tl: 'LV', name: 'Keys', bars: 8, lit: 1 })) };
      });
      const I = r.icon;
      ok(I.face >= 32 && I.face > 29, 'the inner circle is larger (face radius ' + I.face + ', was 29)');
      ok(I.ring > 29 && I.ring < I.face && I.dots > I.ring && I.dots < I.face, 'its engraved ring and dot ring sit inside the larger face (' + I.ring + ', ' + I.dots + ')');
      ok(I.metal === 37.5 && I.dial && I.rivets, 'the metal rim, tick dial and rivets are kept');
      // every tick starts on one circle just outside the larger face (QC caught x and y using different radii)
      const tk = await p.evaluate(() => { const segs = WR_DIAL.match(/M[0-9.]+ [0-9.]+/g).map(s => s.slice(1).split(' ').map(Number)); const d = segs.map(([x, y]) => Math.hypot(x - 46, y - 74)); return { min: Math.min(...d), max: Math.max(...d), n: d.length }; });
      ok(tk.n === 36 && tk.max - tk.min < .15 && tk.min > 32, 'all 36 dial ticks start on one circle outside the face (' + tk.min.toFixed(2) + ' to ' + tk.max.toFixed(2) + ')');
      ok(!I.panel && I.edges === 2 && I.side && I.tl, 'the existing design is kept: no black panel, stacked edge, side name and top-left text');
      ok(I.icon && I.icon.w >= 50 && Math.abs(I.icon.cx - 46) < .6 && Math.abs(I.icon.cy - 74) < .6, 'the icon is larger (' + (I.icon && I.icon.w) + ', was 44) and centred');
      r.n.forEach((c, k) => {
        const lbl = ['1', '2', '3', '4'][k] + ' digit' + (k ? 's' : '') + ': ', R = c.ring;
        const L = c.num.x - (46 - R), Rt = (46 + R) - (c.num.x + c.num.w);
        const far = Math.max(...[[c.num.x, c.num.y], [c.num.x + c.num.w, c.num.y], [c.num.x, c.num.y + c.num.h], [c.num.x + c.num.w, c.num.y + c.num.h]].map(([x, y]) => Math.hypot(x - 46, y - 74)));
        ok(L >= 6 && Rt >= 6, lbl + 'the number keeps at least 6 units each side to the inner ring (' + L.toFixed(1) + ', ' + Rt.toFixed(1) + ')');
        ok(far <= c.face, lbl + 'the number box stays inside the inner circle (' + far.toFixed(1) + ' of ' + c.face + ')');
      });
    }

    // the cards on the tab are larger at every width
    await p.evaluate(() => { try { localStorage.setItem('vi_view', 'advanced'); } catch (e) {} showTab('achievements'); }); await p.waitForTimeout(900);
    const s = await p.evaluate(() => {
      const wOf = el => el ? el.getBoundingClientRect().width : 0;
      const coll = [...document.querySelectorAll('#wr-collection .wr-tok')].slice(0, 6).map(t => ({ svg: wOf(t.querySelector('.wt-svg')), tile: t.clientWidth - parseFloat(getComputedStyle(t).paddingLeft) - parseFloat(getComputedStyle(t).paddingRight) }));
      const quest = wOf(document.querySelector('#wr-quests .wt-svg')), rank = wOf(document.querySelector('#wr-rank .wr-rank-tok .wt-svg'));
      const cols = getComputedStyle(document.getElementById('wr-collection')).gridTemplateColumns.split(' ').length;
      return { coll, quest, rank, cols, dtok: parseFloat(getComputedStyle(Object.assign(document.createElement('div'), { className: 'wr-dtok' })).width) || null };
    });
    const minColl = Math.min(...s.coll.map(c => c.svg));
    if (!phone) {
      ok(minColl >= 159 && s.quest >= 159, t + 'badge and side-quest cards draw at 160 px (were 112; ' + minColl.toFixed(0) + ', ' + s.quest.toFixed(0) + ')');
      ok(s.rank >= 159, t + 'the level card draws at 160 px (' + s.rank.toFixed(0) + ')');
    } else {
      ok(s.cols === 2, t + 'two columns on a phone (' + s.cols + ')');
      ok(minColl >= 130 && s.coll.every(c => c.svg <= c.tile + .5), t + 'each badge card fills its tile, larger than 112 px (' + minColl.toFixed(0) + ')');
      ok(s.rank >= 135, t + 'the level card draws at 136 px (' + s.rank.toFixed(0) + ')');
    }
    const dt = await p.evaluate(() => { const d = document.createElement('div'); d.className = 'wr-dtok'; document.body.appendChild(d); const v = d.getBoundingClientRect().width; d.remove(); return v; });
    ok(dt === (phone ? 116 : 140), t + 'the stage detail card is ' + (phone ? 116 : 140) + ' px (' + dt + ')');
    const side = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    ok(!side, t + 'no sideways scroll');
    await ctx.close();
  }
  ok(errs.length === 0, 'no errors ' + errs.slice(0, 3).join(' | '));
  await b.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
