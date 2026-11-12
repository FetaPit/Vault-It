// v0.7 E4 labels (owner, 1 Nov: "every expense label readable on a black label background ... same style" on the Dashboard and Budget flow diagram).
// Pedro C4 + addendum 2: one renderer (drawCashflowDiagram) draws #cf-sankey and #bd-sankey; every label is a black chip (#080808 at .88, 1 px category-colour
// stroke at .5, 4 px radius, 4 px 6 px padding), name DM Sans 600 11 px #E8E8E8, amount Share Tech Mono 10.5 px in the category colour; chips stay black in Daylight;
// no overlaps, rows at least 30 px apart; the two diagrams carry identical chips. The flow animation is not part of this item.
// Run: node tests/test_v07_chips.js
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
const { chromium } = require('playwright');
const APP = process.env.VI_APP || require('./lib/vi').FILE_URL;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const parse = html => { const d = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html'), svg = d.querySelector('svg'); if (!svg) return null;
  const chips = [...svg.querySelectorAll('.cf-chip')].map(g => { const r = g.querySelector('rect'), t = [...g.querySelectorAll('text')]; const a = n => r.getAttribute(n);
    return { x: +a('x'), y: +a('y'), w: +a('width'), h: +a('height'), rx: a('rx'), fill: a('fill'), fo: a('fill-opacity'), so: a('stroke-opacity'), sw: a('stroke-width'), stroke: r.getAttribute('style') || '',
      texts: t.map(x => ({ s: x.textContent, fs: x.getAttribute('font-size'), fw: x.getAttribute('font-weight'), ff: x.getAttribute('font-family'), fill: x.getAttribute('fill') || x.getAttribute('style') || '' })) }; });
  return { chips, halo: svg.querySelectorAll('text[paint-order]').length, texts: svg.querySelectorAll('text').length, ctext: svg.querySelectorAll('.cf-chip text').length }; };
(async () => {
  const b = await chromium.launch();
  for (const theme of ['dark', 'light']) for (const w of [390, 1100]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: w < 600, hasTouch: w < 600, colorScheme: theme });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(t => { localStorage.setItem('vi-theme', t); }, theme);   // no vi_declined_demo: the app's own demo data, as the tester sees it
    await p.goto(APP); await p.waitForFunction(() => localStorage.getItem('pos_ov1'), null, { timeout: 30000 }); for (let k = 0; k < 3; k++) { await p.reload(); if (await p.waitForFunction(() => window.cfModel && cfModel().total > 0, null, { timeout: 8000 }).then(() => true, () => false)) break; } await p.waitForTimeout(800);   // the first visit writes the demo data; the next load shows it
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#trial-banner{display:none!important}' });
    const res = {};
    for (const tab of ['overview', 'budget']) { await p.evaluate(t => showTab(t), tab); await p.waitForTimeout(700); }
    const t = theme + ' ' + w + 'px: ';
    for (const id of ['bd-sankey']) {
      const html = await p.evaluate(i => document.getElementById(i).innerHTML, id);
      const r = await p.evaluate(`(${parse.toString()})(${JSON.stringify(html)})`); if (!r) { ok(false, t + id + ': diagram drawn (got ' + html.slice(0, 60) + ') errs ' + errs.slice(0, 2)); continue; } const c = r.chips;
      ok(r && c.length >= 8, t + id + ': chips drawn (' + (r ? c.length : 0) + ')');
      ok(r.halo === 0 && r.texts === r.ctext, t + id + ': every label is on a chip, no halo-stroked labels (' + r.ctext + '/' + r.texts + ')');
      ok(c.every(k => k.fill === '#080808' && k.fo === '.88' && k.so === '.5' && k.rx === '4' && k.sw === '1' && /stroke:/.test(k.stroke)), t + id + ': chip fill #080808 .88, 1 px stroke at .5 in the category colour, 4 px radius');
      ok(c.every(k => k.texts[0].ff && /DM Sans/.test(k.texts[0].ff) && k.texts[0].fs === '11' && k.texts[0].fw === '600' && /e8e8e8/i.test(k.texts[0].fill)), t + id + ': name DM Sans 600 11 px #E8E8E8');
      ok(c.every(k => k.texts.length < 2 || (/Share Tech Mono/.test(k.texts[1].ff) && k.texts[1].fs === '10.5')), t + id + ': amount Share Tech Mono 10.5 px');
      let ov = 0, close = 0; for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) { const a = c[i], d = c[j];
        if (a.x < d.x + d.w && d.x < a.x + a.w && a.y < d.y + d.h && d.y < a.y + a.h) ov++;
        if (a.x < d.x + d.w && d.x < a.x + a.w && Math.abs((a.y + a.h / 2) - (d.y + d.h / 2)) < 30) close++; }
      ok(ov === 0, t + id + ': no chip overlaps another (' + ov + ')');
      ok(close === 0, t + id + ': rows in a column are at least 30 px apart (' + close + ' too close)');
      ok(c.every(k => k.x >= 0 && k.y >= 0), t + id + ': no chip is clipped by the top or left edge');
      res[id] = JSON.stringify(c);
    }
    { const fo = await p.evaluate(() => getComputedStyle(document.querySelector('.cf-chip rect')).fillOpacity); ok(theme === 'dark' ? fo === '0.88' : fo === '1', t + 'chip fill opacity is solid in Daylight (' + fo + ')'); }
    // visible check: chip rect contains its text in the live DOM
    const fit = await p.evaluate(() => { const h = document.getElementById('bd-sankey'); let bad = 0; if (!h.clientWidth) return -1; h.querySelectorAll('.cf-chip').forEach(g => { const r = g.querySelector('rect').getBBox(); g.querySelectorAll('text').forEach(x => { const b = x.getBBox(); if (b.x < r.x - .5 || b.x + b.width > r.x + r.width + .5 || b.y < r.y - .5 || b.y + b.height > r.y + r.height + .5) bad++; }); }); return bad; });
    ok(fit === 0, t + 'live: every text sits inside its chip (' + fit + ' outside)');
    if (theme === 'light' && w === 1100) {   // a shortfall (spending above income) draws a grey Shortfall chip; Daylight must not darken it
      const sf = await p.evaluate(() => { ovState.expenses.push({ id: 9999, name: 'Big one', amount: 5000, category: 'necessity', cat: 'housing', type: 'ce' }); drawCashflowDiagram(); const g = [...document.querySelectorAll('#bd-sankey .cf-chip')].find(x => /Shortfall/.test(x.textContent)); return g ? g.innerHTML : ''; });
      ok(sf && !/4e5b5d/i.test(sf) && /138,\s*147,\s*166/.test(sf), t + 'a Shortfall chip keeps its Night grey in Daylight');
    }
    ok(!(await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)), t + 'no sideways scroll');
    ok(errs.length === 0, t + 'no page errors ' + errs.slice(0, 1));
    await ctx.close();
  }
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
