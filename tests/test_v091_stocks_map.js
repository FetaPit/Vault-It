// v0.9.1 E19, E20: Stocks allocation tree map gets more room, never clips a label, merges tiny holdings into "Other (n)", and shows logos.
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
(async () => {
  const b = await chromium.launch();
  for (const [w, theme] of [[390, 'dark'], [768, 'light'], [1100, 'dark'], [1440, 'light']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 1000 }, colorScheme: theme });
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.addInitScript(() => {
      if (localStorage.getItem('pos_al1')) return;
      localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi-stk-alloc', 'tree');
      localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
      localStorage.setItem('vi_user', JSON.stringify({ name: 'P', email: 't@t.com' }));
      const n = Date.now(), H = (id, pie, sym, name, units, price) => ({ id, pie, sym, name, units, avgCost: price, price, updated: n });
      localStorage.setItem('pos_al1', JSON.stringify({ stocks: [
        H(1, 1, 'AAPL', 'Apple Inc', 100, 200), H(2, 1, 'BP', 'BP plc', 40, 4.7), H(3, 1, 'TINY1', 'Tiny One', 31, 1), H(4, 1, 'TINY2', 'Tiny Two', 25, 1), H(5, 1, 'TINY3', 'Tiny Three', 2, 5),
        H(6, 2, '0P0001OXYZ12', 'Vanguard FTSE Global All Cap Index Fund GBP Acc', 60, 180), H(7, 2, 'ZZ', 'Zed', 3, 3), { id: 8, pie: 1, sym: 'OLDX', name: 'Old', units: 10, avgCost: 4200, price: 300, updated: n }, H(9, 3, 'QQ', 'Quill', 1, 1)
      ], stockPies: [{ id: 1, name: 'Trading 212 ISA' }, { id: 2, name: 'Vanguard', kind: 'fund' }, { id: 3, name: 'Tiny pie' }], activePie: 'all', cashAccounts: [], otherAssets: [], crypto: [], liabilities: [], metals: { gold: 0, silver: 0, platinum: 0, palladium: 0 } }));
    });
    await page.goto('file://' + (process.env.VI_INDEX || '/home/user/Vault-It/index.html')); await page.waitForTimeout(1200);
    await page.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
    await page.evaluate(() => { showTab('assets'); showSubtab('assets', 'stocks', null); stkSetAlloc('tree'); });
    await page.waitForTimeout(800);
    const r = await page.evaluate(() => {
      const el = document.getElementById('stk-treemap'); if (!el) return null;
      const cells = [...el.querySelectorAll('.dtm-cell')], W = el.parentElement.clientWidth;
      const bad = [];
      cells.forEach(c => { const cr = c.getBoundingClientRect(); c.querySelectorAll('.dtm-n,.dtm-v,.dtm-s,.dtm-oth').forEach(t => { const tr = t.getBoundingClientRect(); const fs = parseFloat(getComputedStyle(t).fontSize);
        if (t.scrollWidth > t.clientWidth + 1 || t.scrollHeight > t.clientHeight + 1 || tr.right > cr.right + 0.5 || tr.bottom > cr.bottom + 0.5 || tr.left < cr.left - 0.5 || tr.top < cr.top - 0.5) bad.push('clip:' + t.textContent.slice(0, 20));
        if (fs < 10.5) bad.push('small:' + fs + ':' + t.textContent.slice(0, 20)); }); });
      const other = el.querySelectorAll('.dtm-other');
      return { h: el.offsetHeight, W, n: cells.length, bad, empty: cells.filter(c => !c.textContent.trim() && !c.querySelector('img,.stk-mono')).length, pebbles: el.querySelectorAll('.dtm-sm').length,
        other: [...other].map(o => o.textContent.replace(/\s+/g, ' ').trim()), text: el.textContent, legend: (document.getElementById('stk-tm-other') || {}).textContent || '',
        logos: el.querySelectorAll('.stk-hl').length, rowLogos: document.querySelectorAll('#stk-holdings .stk-row:not(.h) .stk-hl').length, rows: document.querySelectorAll('#stk-holdings .stk-row:not(.h)').length,
        scrollX: document.documentElement.scrollWidth > innerWidth + 1 };
    });
    const t = w + ' ' + theme + ': ';
    ok(!!r, t + 'tree map renders'); if (!r) continue;
    const oldH = Math.round(Math.max(240, Math.min(460, r.W * .72)));
    ok(r.h >= oldH * 1.25, t + 'map is at least 1.25x today\'s height (' + r.h + ' vs ' + oldH + ')');
    ok(r.bad.length === 0, t + 'no label clipped or under 10.5px ' + JSON.stringify(r.bad.slice(0, 4)));
    ok(r.pebbles === 0 && r.empty === 0, t + 'no unlabelled pebbles (' + r.pebbles + '/' + r.empty + ')');
    ok(r.other.some(s => /Other \(\d+\)/.test(s)), t + 'small holdings merge into an "Other (n)" tile: ' + JSON.stringify(r.other));
    ok(!/Other \(1\)/.test(r.other.join('|')), t + 'a lone merged holding is not called "Other (1)"');
    ok(/QQ/.test(r.legend), t + 'a pie too small to draw is still listed under the map (' + r.legend.slice(-40) + ')');
    ok(/TINY1/.test(r.legend) && /TINY2/.test(r.legend), t + 'the merged holdings are listed under the map');
    ok(!/0P0001OXYZ12/.test(r.text), t + 'a fund code is not shown on the map');
    ok(r.logos >= 1, t + 'tree map tiles carry a logo/badge (' + r.logos + ')');
    ok(!r.scrollX, t + 'no sideways scroll');
    if (w === 1100) {
      await page.evaluate(() => document.querySelectorAll('#stk-holdings .stk-gh').forEach(b => { if (b.getAttribute('aria-expanded') !== 'true') b.click(); }));
      await page.waitForTimeout(300);
      const rl = await page.evaluate(() => ({ rows: document.querySelectorAll('#stk-holdings .stk-row:not(.h)').length, logos: document.querySelectorAll('#stk-holdings .stk-row:not(.h) .stk-hl').length,
        size: (() => { const l = document.querySelector('#stk-holdings .stk-row:not(.h) .stk-hl'); return l ? l.getBoundingClientRect().width : 0; })(),
        apple: (() => { const l = [...document.querySelectorAll('#stk-holdings .stk-row:not(.h)')].find(x => /AAPL/.test(x.textContent)); const i = l && l.querySelector('.stk-hl img'); return i ? i.src : ''; })() }));
      ok(rl.rows >= 7 && rl.logos === rl.rows, t + 'every holding row has a logo box (' + rl.logos + '/' + rl.rows + ')');
      ok(rl.size === 24, t + 'row logo is 24px (' + rl.size + ')');
      ok(/^https:\/\/www\.google\.com\/s2\/favicons/.test(rl.apple), t + 'AAPL uses the favicon host already named in the privacy notice (' + rl.apple.slice(0, 50) + ')');
      const fb = await page.evaluate(() => { const l = [...document.querySelectorAll('#stk-holdings .stk-row:not(.h)')].find(x => /AAPL/.test(x.textContent)).querySelector('.stk-hl'); const i = l.querySelector('img'); i.dispatchEvent(new Event('error')); const m = l.querySelector('.stk-mono'); return { img: getComputedStyle(i).display, mono: m ? getComputedStyle(m.parentElement).display : 'none', txt: m ? m.textContent : '' }; });
      ok(fb.img === 'none' && fb.mono !== 'none' && fb.txt.length > 0, t + 'a logo that fails to load falls back to initials (' + JSON.stringify(fb) + ')');
      const fund = await page.evaluate(() => { const l = [...document.querySelectorAll('#stk-holdings .stk-row:not(.h)')].find(x => /0P0001OXYZ12/.test(x.textContent)); return l ? !!l.querySelector('.stk-hl svg, .stk-hl .stk-fundb') : false; });
      ok(fund, t + 'a fund gets the fund badge');
    }
    const extra = await page.evaluate(() => {
      document.querySelectorAll('#stk-holdings .stk-gh').forEach(b => { if (b.getAttribute('aria-expanded') !== 'true') b.click(); });
      const ph = (document.getElementById('stk-cost') || {}).placeholder || '';
      const chk = document.querySelector('#stk-holdings .stk-chk'), lh = chk ? parseFloat(getComputedStyle(chk).lineHeight) : 0;
      const av = [...document.querySelectorAll('#stk-holdings .c-av input')].map(i => { const c = document.createElement('canvas').getContext('2d'); c.font = getComputedStyle(i).font; return { ph: i.placeholder, fits: c.measureText(i.placeholder).width <= i.clientWidth - 12 }; });
      const dn = document.querySelector('#stk-main svg[aria-label="Portfolio allocation"]'), fsz = dn ? [...dn.querySelectorAll('text')].map(x => x.getBoundingClientRect().height && parseFloat(getComputedStyle(x).fontSize) * (dn.getBoundingClientRect().width / 150)) : [];
      const ring = dn ? Math.min(...[...dn.querySelectorAll('circle')].map(c => +c.getAttribute('r'))) - 8 : 0;
      const tw = dn ? Math.max(...[...dn.querySelectorAll('text')].map(x => x.getBBox().width)) / 2 : 0;
      const lum = c => { const f = c.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * f[0] + .7152 * f[1] + .0722 * f[2]; };
      const tiles = [...document.querySelectorAll('#stk-treemap .dtm-cell')].map(c => { const m = getComputedStyle(c).backgroundColor.match(/[\d.]+/g).map(Number), t = getComputedStyle(c).color.match(/[\d.]+/g).map(Number);
        const [r, g, b] = m.map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0; if (mx !== mn) { const d = mx - mn; h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360; }
        return { ratio: (Math.max(lum(m), lum(t)) + .05) / (Math.min(lum(m), lum(t)) + .05), overlay: getComputedStyle(c, '::after').backgroundImage, brown: h >= 15 && h <= 50 && l < .5, bg: getComputedStyle(c).backgroundColor }; });
      const gv = [...document.querySelectorAll('#stk-holdings .stk-gv small')].map(x => parseFloat(getComputedStyle(x).fontSize));
      return { tiles, gv, ph, chkLines: chk ? Math.round((chk.getBoundingClientRect().height - 8) / lh) : 0, av, fsz, inner: ring, half: tw };
    });
    ok(extra.tiles.length > 0 && extra.tiles.every(x => x.ratio >= 4.5), t + 'tile text is at least 4.5:1 (' + extra.tiles.map(x => x.ratio.toFixed(1)).join(',') + ')');
    ok(extra.tiles.every(x => x.overlay === 'none'), t + 'no darkening overlay on the tiles (' + extra.tiles.map(x => x.overlay.slice(0, 20)).join('|') + ')');
    ok(extra.tiles.every(x => !x.brown), t + 'no tile is brown or olive ' + JSON.stringify(extra.tiles.filter(x => x.brown).map(x => x.bg)));
    ok(extra.gv.length > 0 && extra.gv.every(f => f >= 10.5), t + 'the % in each pie header is 10.5px or more (' + extra.gv + ')');
    ok(extra.ph === 'Cost per unit £', t + 'add-row placeholder reads "Cost per unit £" (' + extra.ph + ')');
    ok(extra.chkLines === 1, t + 'the "Check your average cost" nudge sits on one line (' + extra.chkLines + ')');
    ok(extra.av.every(a => a.fits), t + 'no avg-cost placeholder is clipped ' + JSON.stringify(extra.av.filter(a => !a.fits)));
    ok(extra.fsz.length > 0 && extra.fsz.every(f => f >= 10.5), t + 'donut text is 10.5px or more as drawn (' + extra.fsz.map(f => f.toFixed(1)) + ')');
    ok(extra.half <= extra.inner - 3, t + 'donut centre text clears the ring (' + extra.half.toFixed(1) + ' vs ' + extra.inner + ')');
    ok(errs.length === 0, t + 'no page errors ' + errs.slice(0, 2).join('|'));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
