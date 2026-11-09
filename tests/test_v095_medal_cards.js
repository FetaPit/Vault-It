// v0.95 edit (owner, 9 Nov 2026, two screenshots with the medal area outlined in red): Wealth Roadmap medal cards.
//  "removing the circle within each achievement and icon card, giving the action icon more real estate ... clean this up with
//   straight lines and treat this as a black BG on the card. Leave the cards the same design just ensure the circle is larger
//   and there is breathing space between the number and the circle"
// Checks every token drawn by wrTok: no inner face circles, a black straight-edged panel behind the medal clear of the card's
// text and bars, a larger ring opening and icon, the level number clear of the ring for 1 to 4 digits, the rest of the card intact.
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
const { chromium } = require('playwright');
const routeThree = require('./three_route');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const seed = (o) => `(function(){if(localStorage.getItem('ht3'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'Test User',email:'t@t.com',pro:true}));localStorage.setItem('vi_pioneer','true');localStorage.setItem('ht3',${JSON.stringify(JSON.stringify(o))});})();`;
const APP = process.env.VI_APP || require('./lib/vi').FILE_URL;

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

    if (!phone) {
      // Draw a set of tokens large, then measure them in the token's own 100 x 132 units
      const r = await p.evaluate(() => {
        const cases = [
          { name: 'icon', o: { tier: 'strong', st: 'done', ic: 'vi-keys', tl: 'LV', name: 'Keys', bars: 6, lit: 2 } },
          { name: 'lock', o: { tier: 'solid', st: 'lock', ic: 'vi-keys' } },
          { name: 'n1', o: { tier: 'strong', st: 'own', num: 7, tl: 'LV', name: 'Keys', bars: 8, lit: 1 } },
          { name: 'n2', o: { tier: 'strong', st: 'own', num: 16, tl: 'LV', name: 'Keys', bars: 8, lit: 1 } },
          { name: 'n3', o: { tier: 'summit', st: 'next', num: 100, tl: 'LV', name: 'Keys' } },
          { name: 'n4', o: { tier: 'summit', st: 'done', num: 1000, chip: 'done' } },
        ];
        const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#000';
        document.body.appendChild(host);
        return cases.map(c => {
          host.innerHTML = wrTokSvg(c.o, 236, 'test');
          const svg = host.querySelector('svg'), g = svg.querySelector('g.wt');
          const q = s => g.querySelector(s), bb = el => { const x = el.getBBox(); return { x: x.x, y: x.y, w: x.width, h: x.height }; };
          const scr = el => { const x = el.getBoundingClientRect(); return { l: x.left, t: x.top, r: x.right, b: x.bottom }; };
          const panel = q('.wt-panel'), num = q('.wt-num'), icon = q('svg.wt-icon');
          const out = { name: c.name, inner: g.querySelectorAll('.wt-mface,.wt-mring,.wt-mdots').length,
            panel: panel ? { tag: panel.tagName.toLowerCase(), fill: getComputedStyle(panel).fill, bb: bb(panel), scr: scr(panel), pts: panel.getAttribute('points') } : null,
            medal: typeof WR_MEDAL !== 'undefined' ? WR_MEDAL : null,
            ring: !!q('.wt-metal'), dial: !!q('.wt-tick'), rivets: !!q('.wt-rivet'),
            edges: g.querySelectorAll('.wt-edge').length, card: !!q('.wt-card'), rim: !!q('.wt-rimline'),
            tl: q('.wt-tl') ? scr(q('.wt-tl')) : null, side: q('.wt-side') ? scr(q('.wt-side')) : null,
            bars: [...g.querySelectorAll('.wt-bar')].map(scr), chip: !!q('.wt-chip'), halo: !!q('.wt-halo'),
            num: num ? bb(num) : null, icon: icon ? { w: +icon.getAttribute('width'), x: +icon.getAttribute('x'), y: +icon.getAttribute('y') } : null };
          return out;
        });
      });
      const over = (a, c) => a && c && a.l < c.r && c.l < a.r && a.t < c.b && c.t < a.b;
      for (const c of r) {
        const n = c.name + ': ';
        ok(c.inner === 0, n + 'no inner face circles inside the medal (' + c.inner + ')');
        ok(c.panel && c.panel.tag === 'polygon' && /rgb\(0, 0, 0\)|#000/.test(c.panel.fill), n + 'a black straight-edged panel sits behind the medal (' + (c.panel && c.panel.tag + ' ' + c.panel.fill) + ')');
        if (c.panel) {
          const pb = c.panel.bb, pts = c.panel.pts.trim().split(/\s+/).length;
          ok(pts >= 6, n + 'the panel has chamfered corners (' + pts + ' points)');
          ok(pb.x >= 0 && pb.y >= 0 && pb.x + pb.w <= 100 && pb.y + pb.h <= 132, n + 'the panel stays inside the card');
          ok(pb.w >= 70 && pb.h >= 80, n + 'the panel covers the outlined area (' + pb.w.toFixed(0) + ' x ' + pb.h.toFixed(0) + ')');
          ok(!over(c.panel.scr, c.tl), n + 'the panel clears the top-left text');
          ok(!over(c.panel.scr, c.side), n + 'the panel clears the side name');
          ok(!c.bars.some(x => over(c.panel.scr, x)), n + 'the panel clears the step bars');
        }
        const M = c.medal;
        ok(M && M.ri > 29 && M.ro >= 37.5, n + 'the ring is larger and its opening wider than the old 29 face (' + (M && M.ro + '/' + M.ri) + ')');
        if (c.panel && M) {
          const pb = c.panel.bb;
          ok(M.cx - M.ro >= pb.x && M.cx + M.ro <= pb.x + pb.w && M.cy - M.ro >= pb.y && M.cy + M.ro <= pb.y + pb.h, n + 'the ring sits on the panel');
        }
        ok(c.ring && c.dial && c.rivets, n + 'the metal ring keeps its dial and rivets');
        ok(c.edges === 2 && c.card && c.rim, n + 'card shape, stacked edge and rim line unchanged');
        if (c.icon) ok(c.icon.w > 44 && M && Math.abs(c.icon.x + c.icon.w / 2 - M.cx) < .6 && Math.abs(c.icon.y + c.icon.w / 2 - M.cy) < .6, n + 'the icon is larger than before and centred in the ring (' + c.icon.w + ')');
        if (c.num && M) {
          const L = c.num.x - (M.cx - M.ri), R = (M.cx + M.ri) - (c.num.x + c.num.w);
          const corners = [[c.num.x, c.num.y], [c.num.x + c.num.w, c.num.y], [c.num.x, c.num.y + c.num.h], [c.num.x + c.num.w, c.num.y + c.num.h]];
          const far = Math.max(...corners.map(([x, y]) => Math.hypot(x - M.cx, y - M.cy)));
          ok(L >= 6 && R >= 6, n + 'the number has at least 6 units each side to the ring (' + L.toFixed(1) + ', ' + R.toFixed(1) + ')');
          ok(far <= M.ri - 1, n + 'the number box stays inside the ring opening (' + far.toFixed(1) + ' of ' + M.ri + ')');
        }
      }
      ok(r.find(c => c.name === 'n3').halo && r.find(c => c.name === 'n4').chip, 'halo and chip still drawn');
    }

    // In the app: the Wealth Roadmap tab draws its tokens with the new medal and no errors
    await p.evaluate(() => { try { localStorage.setItem('vi_view', 'advanced'); } catch (e) {} showTab('achievements'); }); await p.waitForTimeout(900);
    const tab = await p.evaluate(() => ({ toks: [...document.querySelectorAll('#tab-achievements g.wt')].filter(g => g.querySelector('.wt-card')).length, panels: document.querySelectorAll('#tab-achievements .wt-panel').length, inner: document.querySelectorAll('.wt-mface,.wt-mring,.wt-mdots').length }));
    ok(tab.toks > 0 && tab.panels === tab.toks && tab.inner === 0, t + 'every token on the Wealth Roadmap tab has the panel and no inner circles (' + tab.toks + ' tokens, ' + tab.panels + ' panels, ' + tab.inner + ' inner)');

    // Side names (owner, 9 Nov: "Yes, fix side names"): each name runs up from y 102 and must end by y 24, below the card's
    // top-right corner, so its drawn length is 78 units or less; a name that already fits is drawn at its natural width, never stretched
    const names = await p.evaluate(() => {
      const ns = 'http://www.w3.org/2000/svg', s = document.createElementNS(ns, 'svg'), m = document.createElementNS(ns, 'text');
      m.setAttribute('class', 'wt-side'); s.appendChild(m); document.body.appendChild(s);
      const nat = (x) => { m.textContent = x; return m.getComputedTextLength(); };
      const seen = {}, out = [];
      document.querySelectorAll('#tab-achievements .wt-side').forEach(el => {
        const tl = el.getAttribute('textLength'), n = nat(el.textContent), drawn = tl ? +tl : n;
        if (!seen[el.textContent]) { seen[el.textContent] = 1; out.push({ name: el.textContent, nat: +n.toFixed(1), drawn: +drawn.toFixed(1), squeezed: !!tl }); }
      });
      // a short name on a level card
      const h = document.createElement('div'); h.innerHTML = wrTokSvg({ tier: 'strong', st: 'own', num: 16, tl: 'LV', name: 'Keys' }, 236, 't');
      document.body.appendChild(h); const k = h.querySelector('.wt-side'); out.push({ name: 'KEYS (level card)', nat: +nat('KEYS').toFixed(1), drawn: k.getAttribute('textLength') ? +k.getAttribute('textLength') : +nat('KEYS').toFixed(1), squeezed: !!k.getAttribute('textLength') });
      s.remove(); h.remove(); return out;
    });
    const over = names.filter(x => x.drawn > 78), stretched = names.filter(x => x.squeezed && x.nat <= 76);
    ok(names.length > 20 && over.length === 0, t + 'every side name ends inside the card (' + names.length + ' names; too long: ' + over.slice(0, 4).map(x => x.name + ' ' + x.drawn).join(', ') + ')');
    ok(stretched.length === 0, t + 'names that already fit are not stretched (' + stretched.map(x => x.name).join(', ') + ')');
    ok(names.some(x => x.name.startsWith('KEYS') && !x.squeezed), t + 'a short name (KEYS) keeps its natural width');
    const side = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    ok(!side, t + 'no sideways scroll');
    await ctx.close();
  }
  ok(errs.length === 0, 'no errors ' + errs.slice(0, 3).join(' | '));
  await b.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
