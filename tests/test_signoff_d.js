// Phone sign-off group D (owner, 31 Oct): Budget "Where your income flows". (6) every band has a bright stroke in its group's colour and every
// end label has a bright leader from its block; (7) only two reds, clearly told apart (red stays the colour for owed money elsewhere).
// Run: node tests/test_signoff_d.js
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const src = require('fs').readFileSync(__dirname + '/test_nw3d.js', 'utf8');
const seed = eval('(' + src.slice(src.indexOf('const seed = (o) =>') + 'const seed = '.length, src.indexOf('// WCAG AA')).trim().replace(/;$/, '') + ')');
const EXP = [{ id: 3, name: 'Rent', amount: 700, type: 'ce' }, { id: 4, name: 'Council tax', amount: 140, type: 'ce' }, { id: 5, name: 'Groceries', amount: 260, type: 've' }, { id: 6, name: 'Gym', amount: 35, type: 'cn' }, { id: 7, name: 'Takeaways', amount: 90, type: 'vn' }, { id: 8, name: 'House deposit', amount: 500, type: 'sv' }, { id: 9, name: 'S&S ISA', amount: 300, type: 'iv' }];
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const theme of ['dark', 'light']) for (const w of [390, 1100]) {
    const ph = w < 700, ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: ph, hasTouch: ph }); await ctx.route(/^https?:/, r => r.abort()); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(seed, { theme, flag: true }); await p.addInitScript(e => { const o = JSON.parse(localStorage.getItem('pos_ov1')); if (o.expenses.length < 3) { o.expenses = e; localStorage.setItem('pos_ov1', JSON.stringify(o)); } }, EXP);
    await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(1800);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#pro-offer-modal,#sync-banner,#trial-banner,#tester-welcome{display:none!important}' });
    await p.evaluate(() => showTab('budget')); await p.waitForTimeout(900);
    const r = await p.evaluate(() => {
      const svg = document.querySelector('#bd-sankey svg'), cs = e => getComputedStyle(e), rgb = s => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      const links = [...svg.querySelectorAll('path.cf-ln')], leads = [...svg.querySelectorAll('.cf-lead')], nodes = [...svg.querySelectorAll('rect')];
      const bright = links.filter(l => cs(l).stroke !== 'none' && parseFloat(cs(l).strokeWidth) >= 1 && parseFloat(cs(l).strokeOpacity) >= .8).length;
      const hue = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2, s = d ? d / (1 - Math.abs(2 * l - 1)) : 0; let h = 0; if (d) h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return { h: h * 60, s, l }; };
      const reds = new Set(); svg.querySelectorAll('*').forEach(e => ['fill', 'stroke'].forEach(k => { const v = cs(e)[k]; if (!/^rgb/.test(v)) return; const c = rgb(v), x = hue(c); if ((x.h >= 335 || x.h <= 22) && x.s >= .3 && x.l >= .12 && x.l <= .88) reds.add(c.join(',')); }));
      const arr = [...reds].map(s => s.split(',').map(Number)); let gap = 999; if (arr.length === 2) gap = Math.hypot(arr[0][0] - arr[1][0], arr[0][1] - arr[1][1], arr[0][2] - arr[1][2]);
      const probe = v => { const d = document.createElement('i'); d.style.color = v; document.body.appendChild(d); const c = rgb(getComputedStyle(d).color); d.remove(); return c; };
      const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
      const panel = probe('var(--panel)'), aa = ['coral', 'salmon', 'amber', 'yellow', 'green', 'green2'].map(k => { const t = probe('var(--' + k + ')'), bg = panel.map((v, i) => v * .88 + t[i] * .12), a = lum(t), b = lum(bg); return { k, cr: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) }; });
      const hh = arr.length === 2 ? Math.abs(hue(arr[0]).h - hue(arr[1]).h) : 0;
      return { aa, hue: Math.min(hh, 360 - hh), links: links.length, bright, leads: leads.length, itemNodes: nodes.length, reds: [...reds], gap };
    });
    const T = theme + ' ' + w + ': ';
    ok(r.links > 8 && r.bright === r.links, T + 'every band has a bright stroke in its group colour (' + r.bright + '/' + r.links + ')');
    ok(r.leads >= 7, T + 'each end label is joined to its block by a bright leader (' + r.leads + ')');
    ok(r.reds.length === 2 && r.gap >= (theme === 'dark' ? 90 : 70) && r.hue >= 15, T + 'exactly two reds, clearly apart (' + r.reds.join(' | ') + '; gap ' + Math.round(r.gap) + ', hue apart ' + Math.round(r.hue) + ')');
    ok(r.aa.every(a => a.cr >= 4.5), T + 'group text on its Budget tile stays AA (' + r.aa.map(a => a.k + ' ' + a.cr.toFixed(1)).join(', ') + ')');
    await ctx.close();
  }
  ok(errs.length === 0, 'no page errors ' + errs.join('|'));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
