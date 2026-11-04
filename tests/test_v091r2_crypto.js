// v0.9.1 round 2, chunk G (owner R19, R20): the Crypto sub-tab icon and the holding tiles.
//  R19 "add a teal bitcoin icon to the crypto subtab as the current is too low quality": a solid coin disc with a bold bitcoin B, drawn in teal like the other sub-tab icons.
//  R20 "reconfigure the Crypto tiles as before, putting more emphasis on the iconography": each holding is a tile that leads with a large coin icon,
//      then the figures. The amount and cost inputs and the price block are no longer squeezed side by side (the owner's red marks on screenshot 12).
// Run: node tests/test_v091r2_crypto.js   (VI_INDEX overrides the page, e.g. /C:/path/index.html on Windows)
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
(async () => {
  const b = await chromium.launch();
  for (const [w, theme] of [[390, 'dark'], [390, 'light'], [1100, 'dark'], [1100, 'light']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 1000 }, colorScheme: theme });
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.addInitScript(() => {
      if (localStorage.getItem('pos_al1')) return;
      localStorage.setItem('vi_declined_demo', 'true');
      localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
      localStorage.setItem('vi_user', JSON.stringify({ name: 'P', email: 't@t.com' }));
      const live = (id, sym, amount, price, addPx) => ({ id, sym, amount, price, addPx, priceSrc: 'live', priceAt: new Date().toISOString(), change24h: 1.78 });
      localStorage.setItem('pos_al1', JSON.stringify({ crypto: [
        live(1, 'BTC', 0.5, 40000, 30000), live(2, 'ETH', 1, 1717.16, 1500), live(3, 'SOL', 100, 10, 8),
        { id: 4, sym: 'DOGE', amount: 100, price: 0.1 }
      ], stocks: [], stockPies: [], cashAccounts: [], otherAssets: [], liabilities: [], metals: { gold: 0, silver: 0, platinum: 0, palladium: 0 } }));
    });
    await page.goto('file://' + (process.env.VI_INDEX || '/home/user/Vault-It/index.html')); await page.waitForTimeout(1200);
    await page.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
    await page.evaluate(() => { try { _crBusy = true; } catch (e) {} showTab('assets'); showSubtab('assets', 'crypto', null); });
    await page.waitForTimeout(800);
    // open every wallet group
    await page.evaluate(() => document.querySelectorAll('#crypto-table .stk-gh').forEach(b => { if (b.getAttribute('aria-expanded') !== 'true') b.click(); }));
    await page.waitForTimeout(300);
    const t = w + ' ' + theme + ': ';

    // ── R19: the sub-tab icon ──
    const ic = await page.evaluate(() => {
      const sym = document.getElementById('vi-crypto'), btn = document.querySelector('#assets-page .subtab-btn[data-sub="crypto"]'), svg = btn && btn.querySelector('svg.sti');
      const disc = sym ? [...sym.querySelectorAll('circle')].filter(c => +c.getAttribute('r') >= 8) : [];
      const filled = disc.some(c => { const g = c.parentElement; return g && g.getAttribute('fill') && g.getAttribute('fill') !== 'none'; });
      const stroked = disc.some(c => { const g = c.parentElement; return g && g.getAttribute('stroke') === 'currentColor' && g.getAttribute('fill') === 'none'; });
      const paths = sym ? sym.querySelectorAll('path,line').length : 0;
      const probe = document.createElement('i'); probe.style.color = 'var(--teal)'; document.body.appendChild(probe); const teal = getComputedStyle(probe).color; probe.remove();
      const r = svg ? svg.getBoundingClientRect() : { width: 0 };
      const sib = document.querySelector('#assets-page .subtab-btn[data-sub="stocks"] svg.sti').getBoundingClientRect();
      return { filled, stroked, paths, color: svg ? getComputedStyle(svg).color : '', teal, w: r.width, sibW: sib.width, dotted: sym ? !!sym.querySelector('[stroke-dasharray]') : false };
    });
    ok(ic.filled && ic.stroked && ic.paths >= 3, t + 'the Crypto icon is a solid coin disc with an outline and a bold bitcoin B (' + JSON.stringify({ f: ic.filled, s: ic.stroked, p: ic.paths }) + ')');
    ok(ic.color === ic.teal, t + 'the Crypto icon is teal (' + ic.color + ' vs ' + ic.teal + ')');
    ok(ic.w > 0 && Math.abs(ic.w - ic.sibW) < 0.5, t + 'the Crypto icon is the same size as the other sub-tab icons (' + ic.w + ' vs ' + ic.sibW + ')');

    // ── R20: the tiles ──
    const r = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('#crypto-table .cr-row')].filter(e => e.offsetParent);
      const bb = e => e ? e.getBoundingClientRect() : null;
      const tiles = rows.map(t => {
        const tb = bb(t), logo = bb(t.querySelector('.stk-hl')), am = bb(t.querySelector('.c-un input')), co = bb(t.querySelector('.c-av input')), px = bb(t.querySelector('.c-pr')),
          sym = bb(t.querySelector('.stk-tk')), val = bb(t.querySelector('.c-va')), rm = bb(t.querySelector('.data-item-del'));
        let small = 0; t.querySelectorAll('*').forEach(x => { if ([...x.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(x).fontSize) < 10.5) small++; });
        const inside = [logo, am, co, px, sym, val, rm].every(q => q && q.left >= tb.left - .5 && q.right <= tb.right + .5);
        return { sym: (t.querySelector('.stk-tk') || {}).textContent, tw: Math.round(tb.width), top: Math.round(tb.top), logoW: Math.round(t.querySelector('.stk-hl').offsetWidth),
          logoFirst: logo && [am, co, px, sym, val, rm].every(q => q && logo.top <= q.top + .5), logoTop: logo && Math.round(logo.top - tb.top),
          apart: am && co && (am.right <= co.left + .5 || co.right <= am.left + .5 || am.bottom <= co.top + .5 || co.bottom <= am.top + .5), amW: am && Math.round(am.width), coW: co && Math.round(co.width), priceAbove: px && am && px.bottom <= am.top + 1, priceBeside: px && am && px.top < am.bottom - 2 && px.left < am.right && px.right > am.left || (px && am && px.top < am.bottom - 2 && px.bottom > am.top + 2),
          symH: sym && Math.round(sym.height), small, inside, held: (t.querySelector('.cr-held') || {}).textContent, src: !!t.querySelector('.cr-src'), imgOk: !t.querySelector('.stk-hl img') || t.querySelector('.stk-hl img').naturalWidth > 0 };
      });
      return { tiles, sideways: document.documentElement.scrollWidth > innerWidth + 1, across: tiles.filter(x => x.top === (tiles[0] || {}).top).length };
    });
    ok(r.tiles.length === 4, t + 'four coin tiles (' + r.tiles.length + ')');
    ok(r.tiles.every(x => x.logoW >= (w < 700 ? 72 : 84)), t + 'the coin icon is large: ' + r.tiles.map(x => x.logoW).join(', ') + ' px (at least ' + (w < 700 ? 72 : 84) + ')');
    ok(r.tiles.every(x => x.logoFirst), t + 'the coin icon leads: nothing sits above it in the tile');
    ok(r.tiles.every(x => x.priceAbove), t + 'the price block is its own line above the inputs, not squeezed beside them');
    ok(r.tiles.every(x => x.amW >= 110 && x.coW >= 110), t + 'the amount and cost inputs are wide enough to read (' + r.tiles.map(x => x.amW + '/' + x.coW).join(', ') + ')');
    ok(r.tiles.every(x => x.apart), t + 'the amount and cost inputs sit side by side, never on top of each other');
    ok(r.tiles.every(x => x.inside), t + 'logo, name, price, inputs, value and Remove all sit inside their tile');
    ok(r.tiles.every(x => x.small === 0), t + 'no text under 10.5 px in a tile');
    ok(r.tiles.every(x => x.src && /held/.test(x.held || '') && x.imgOk), t + 'each tile shows tokens held, where the price comes from, and its own logo');
    ok(!r.sideways, t + 'the page does not scroll sideways');
    if (w >= 900) ok(r.across >= 2, t + 'tiles sit side by side on a wide screen (' + r.across + ' across)');
    // R20b (owner, 4 Nov, "light 1/8 turn animations to the crypto coins like we have on the Financial freedom roadmap"): each coin turns an eighth (45 degrees) and back, slowly, out of step with its neighbours
    const an = async () => page.evaluate(async () => {
      const els = [...document.querySelectorAll('#crypto-table .cr-tile .stk-hl')]; const name = els.map(e => getComputedStyle(e).animationName);
      const tf = () => els.map(e => getComputedStyle(e).transform);
      const a = tf(); await new Promise(r => setTimeout(r, 1200)); const b = tf();
      let kf = ''; for (const sh of document.styleSheets) { try { for (const r of sh.cssRules) if (r.name === 'cr-turn') kf = r.cssText; } catch (e) {} }
      const delays = els.map(e => getComputedStyle(e).animationDelay);
      return { name, moved: a.some((x, i) => x !== b[i]), kf, staggered: new Set(delays).size > 1, n: els.length };
    });
    let am = await an();
    ok(am.n === 4 && am.name.every(x => x === 'cr-turn'), t + 'every coin carries the cr-turn animation (' + am.name.join(',') + ')');
    ok(/rotateY\(45deg\)/.test(am.kf), t + 'the turn is an eighth of a turn, 45 degrees (' + am.kf.replace(/\s+/g, ' ').slice(0, 120) + ')');
    ok(am.moved && am.staggered, t + 'the coins are actually turning, each out of step with the next');
    await page.emulateMedia({ reducedMotion: 'reduce' }); await page.waitForTimeout(200); am = await an();
    ok(am.name.every(x => x === 'none') && !am.moved, t + 'with reduced motion the coins stay still');
    ok(!errs.length, t + 'no page errors ' + errs.slice(0, 2).join('|'));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
