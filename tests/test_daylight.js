// Brand phase 6: Daylight polish. Every visible piece of text on every tab reads on paper (at least 3:1, the
// floor for large text and icons), there is no glow, charts swap to Daylight colours, and 3D viewports keep the Night look.
// Text on gradients (card artwork, gradient buttons) is skipped: its background cannot be measured reliably.
// Run: node tests/test_daylight.js
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const seed = () => {
  localStorage.setItem('vi-theme', 'light');
  if (localStorage.getItem('pos_debt1')) return;
  localStorage.setItem('vi_declined_demo', 'true');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com' }));
  localStorage.setItem('vi_pioneer', JSON.stringify({ active: true, email: 't@t.com' }));
  localStorage.setItem('pos_ov1', JSON.stringify({ income: [{ id: 1, name: 'Salary', amount: 2400, cat: 'salary' }], expenses: [{ id: 3, name: 'Rent', amount: 700, type: 'ce' }, { id: 4, name: 'Food', amount: 300, type: 've' }, { id: 5, name: 'Gym', amount: 30, type: 'cn' }, { id: 6, name: 'Takeaways', amount: 60, type: 'vn' }, { id: 7, name: 'House deposit', amount: 250, type: 'sv' }, { id: 8, name: 'ISA', amount: 100, type: 'iv' }] }));
  localStorage.setItem('pos_debt1', JSON.stringify({ debts: [{ id: 1, name: 'Virgin Money card', original: 2500, balance: 2000, rate: 20, min: 60, type: 'credit' }, { id: 2, name: 'Car loan', original: 6000, balance: 3600, rate: 8, min: 180, type: 'loan' }] }));
  localStorage.setItem('pos_al1', JSON.stringify({ cashAccounts: [{ id: 5, name: 'Savings', balance: 8500 }], metals: { gold: 2, silver: 20, platinum: 1, palladium: 1 }, liabilities: [{ id: 9, name: 'Car', value: 4000, rate: 0, depRate: 10, runningCost: 80, addedDate: '2026-06-01T00:00:00Z' }] }));
  localStorage.setItem('ht3', JSON.stringify({ saved: 8500, target: 120000, houseType: 'terraced', depositPct: 20, deposits: [{ amount: 8000, date: '01/09/2026' }, { amount: 500, date: '01/10/2026' }] }));
};
const scan = () => {
  const parse = c => { const m = c.match(/[\d.]+/g); return m ? { r: +m[0], g: +m[1], b: +m[2], a: m[3] == null ? 1 : +m[3] } : null; };
  const lum = c => [c.r, c.g, c.b].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
  const blend = (f, bg) => ({ r: f.r * f.a + bg.r * (1 - f.a), g: f.g * f.a + bg.g * (1 - f.a), b: f.b * f.a + bg.b * (1 - f.a), a: 1 });
  const bgOf = el => { const stack = []; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage !== 'none') return null; const c = parse(cs.backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= .99) break; } } let bg = { r: 243, g: 247, b: 246, a: 1 }; for (let i = stack.length - 1; i >= 0; i--) bg = blend(stack[i], bg); return bg; };
  const out = [];
  document.querySelectorAll('.tab-panel *, #topnav *').forEach(el => {
    if (!el.offsetParent || el.closest('svg,canvas,input,select,textarea,[disabled],.scene,.inv-stage,.cc3-card,.cc3,[class*="cc3-"]')) return;
    const txt = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim(); if (!txt) return;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden') return;
    let op = 1; for (let e = el; e; e = e.parentElement) op *= +getComputedStyle(e).opacity; if (op < .05) return;
    const bg = bgOf(el); if (!bg) return;
    const fg = parse(cs.color); fg.a *= op; const f = blend(fg, bg);
    const cr = (Math.max(lum(f), lum(bg)) + .05) / (Math.min(lum(f), lum(bg)) + .05);
    if (cr < 3) out.push(txt.slice(0, 30) + ' (' + cr.toFixed(2) + ')');
  });
  return out;
};
// form fields: what you type must read too (the House plan's price box was cream on paper)
const scanInputs = () => {
  const P = c => { const m = c.match(/[\d.]+/g); return m ? { r: +m[0], g: +m[1], b: +m[2], a: m[3] == null ? 1 : +m[3] } : null; };
  const L = c => [c.r, c.g, c.b].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
  return [...document.querySelectorAll('.tab-panel input:not([type=range]):not([type=checkbox]):not([type=radio]):not([type=file]), .tab-panel select, .tab-panel textarea')]
    .filter(e => e.offsetParent && !e.closest('.scene,.inv-stage')).map(e => { let bg = null; for (let x = e; x; x = x.parentElement) { const c = P(getComputedStyle(x).backgroundColor); if (c && c.a > .5) { bg = c; break; } }
      bg = bg || { r: 243, g: 247, b: 246 }; const f = P(getComputedStyle(e).color), cr = (Math.max(L(f), L(bg)) + .05) / (Math.min(L(f), L(bg)) + .05); return cr < 3 ? '#' + (e.id || e.className) + ' ' + cr.toFixed(2) : null; }).filter(Boolean);
};
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await (await b.newContext({ viewport: { width: 1100, height: 900 } })).newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(seed); await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(2000);
  await p.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
  ok(await p.evaluate(() => viTheme()) === 'light', 'opens in Daylight');
  for (const t of ['overview', 'budget', 'house', 'assets', 'debt', 'entrepreneur', 'achievements', 'connections']) {
    await p.evaluate(t => showTab(t), t); await p.waitForTimeout(t === 'house' ? 2500 : 900);
    const bad = await p.evaluate(scan);
    ok(bad.length === 0, t + ': all text reads on paper (at least 3:1)' + (bad.length ? ' ' + JSON.stringify(bad.slice(0, 6)) : ''));
    const badIn = await p.evaluate(scanInputs);
    ok(badIn.length === 0, t + ': typed text in every field reads on paper' + (badIn.length ? ' ' + JSON.stringify(badIn.slice(0, 6)) : ''));
  }
  await p.evaluate(() => showTab('overview')); await p.waitForTimeout(800);
  const g = await p.evaluate(() => ({
    glow: getComputedStyle(document.getElementById('kpi-nw')).textShadow,
    roadmapBg: (document.querySelector('#fire-roadmap-svg rect') || {}).getAttribute && document.querySelector('#fire-roadmap-svg rect').getAttribute('fill'),
    sankeyHalo: (() => { const t = document.querySelector('#cf-sankey text, #bd-sankey text'); return t ? t.getAttribute('stroke') : null; })(),
    night: Object.keys(VI_DAY_BASE).length > 10 && viDay('#030810') !== '#030810'
  }));
  ok(g.glow === 'none', 'no glow on the big numbers (' + g.glow + ')');
  ok(/^#e6f1f0$/i.test(g.roadmapBg || ''), 'roadmap stage is paper, not Night (' + g.roadmapBg + ')');
  ok(!g.sankeyHalo || /^#ffffff$/i.test(g.sankeyHalo), 'Sankey label halo is paper (' + g.sankeyHalo + ')');
  ok(g.night, 'Night colours are swapped in Daylight');
  // 3D viewports keep the Night look in both modes (owner, 30 Oct)
  await p.evaluate(() => showTab('assets')); await p.waitForTimeout(900);
  const vp = await p.evaluate(() => { const sc = document.getElementById('metals-scene'), cs = getComputedStyle(sc);
    return { bg: cs.getPropertyValue('--bg').trim(), teal: cs.getPropertyValue('--teal').trim(), em: getComputedStyle(sc.querySelector('.vp-gi-hd') || sc).color, page: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(),
      stage: (document.querySelector('#metalsSvg rect') || { getAttribute: () => '' }).getAttribute('fill') }; });
  ok(vp.page.toUpperCase() === '#F3F7F6' && vp.bg.toUpperCase() === '#080808' && vp.teal.toUpperCase() === '#44C0B9', '3D viewports keep Night tokens in Daylight (page ' + vp.page + ', viewport ' + vp.bg + ' / ' + vp.teal + ')');
  ok(/^#060d16$/i.test(vp.stage), 'metals stage keeps its Night background (' + vp.stage + ')');
  await p.evaluate(() => viToggleTheme()); await p.waitForTimeout(600);
  const n = await p.evaluate(() => ({ t: viTheme(), swap: viDay('#030810') }));
  ok(n.t === 'dark' && n.swap === '#030810', 'in Night nothing is swapped');
  ok(errs.length === 0, 'no page errors ' + errs.join('|'));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
