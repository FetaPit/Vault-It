// WCAG AA text scan for every tab and Assets sub-tab: node tests/wcag_scan.js [tabs]  (THEME=dark for Night). Lists anything under 4.5:1 (3:1 for large text).
const THEME = process.env.THEME === 'dark' ? 'dark' : 'light';
const { chromium } = require('playwright');
const seed = (THEME) => { localStorage.setItem('vi-theme',THEME); if (localStorage.getItem('pos_debt1')) return;
  localStorage.setItem('vi_declined_demo','true'); localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10})); localStorage.setItem('vi_user',JSON.stringify({name:'T',email:'t@t.com'})); localStorage.setItem('vi_pioneer',JSON.stringify({active:true,email:'t@t.com'}));
  localStorage.setItem('pos_ov1',JSON.stringify({income:[{id:1,name:'Salary',amount:2400,cat:'salary'}],expenses:[{id:3,name:'Rent',amount:700,type:'ce'},{id:4,name:'Food',amount:300,type:'ve'},{id:5,name:'Gym',amount:30,type:'cn'},{id:6,name:'Takeaways',amount:60,type:'vn'},{id:7,name:'House deposit',amount:250,type:'sv'},{id:8,name:'ISA',amount:100,type:'iv'}]}));
  localStorage.setItem('pos_debt1',JSON.stringify({debts:[{id:1,name:'Virgin Money card',original:2500,balance:2000,rate:20,min:60,type:'credit'},{id:2,name:'Car loan',original:6000,balance:3600,rate:8,min:180,type:'loan'}]}));
  localStorage.setItem('pos_al1',JSON.stringify({cashAccounts:[{id:5,name:'Savings',balance:8500}],metals:{gold:2,silver:20,platinum:1,palladium:1},liabilities:[{id:9,name:'Car',value:4000,rate:0,depRate:10,runningCost:80,addedDate:'2026-06-01T00:00:00Z'}],otherAssets:[{id:11,name:'Guitar',value:2200}]}));
  localStorage.setItem('ht3',JSON.stringify({saved:8500,target:120000,houseType:'terraced',depositPct:20,deposits:[{amount:8000,date:'01/09/2026'},{amount:500,date:'01/10/2026'}]})); };
const scan = () => {
  const parse = c => { const m = c.match(/[\d.]+/g); return m ? { r: +m[0], g: +m[1], b: +m[2], a: m[3] == null ? 1 : +m[3] } : null; };
  const lum = c => [c.r, c.g, c.b].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
  const blend = (f, bg) => ({ r: f.r * f.a + bg.r * (1 - f.a), g: f.g * f.a + bg.g * (1 - f.a), b: f.b * f.a + bg.b * (1 - f.a), a: 1 });
  const root = parse(getComputedStyle(document.body).backgroundColor);
  const bgOf = el => { const stack = []; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage !== 'none' && e !== document.body && !/^linear-gradient\(rgba\(0, 127, 123/.test(cs.backgroundImage)) return null; const c = parse(cs.backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= .99) break; } } let bg = root; for (let i = stack.length - 1; i >= 0; i--) bg = blend(stack[i], bg); return bg; };
  const out = [];
  document.querySelectorAll('.tab-panel *, #topnav *, footer *, .vi-fca, #sync-banner *, .vi-pop:not([hidden]) *').forEach(el => {
    if (!el.offsetParent || el.closest('svg,canvas,[disabled],.scene,.inv-stage,.cc3-card,.cc3,[class*="cc3-"]')) return;
    if (el.tagName === 'INPUT' && /checkbox|radio|range|color/.test(el.type)) return; const isField = /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName);
    const txt = isField ? (el.value || '') : [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim(); if (!txt) return;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden') return;
    let op = 1; for (let e = el; e; e = e.parentElement) op *= +getComputedStyle(e).opacity; if (op < .05) return;
    const bg = bgOf(el); if (!bg) return;
    const fg = parse(cs.color); fg.a *= op; const f = blend(fg, bg);
    const cr = (Math.max(lum(f), lum(bg)) + .05) / (Math.min(lum(f), lum(bg)) + .05);
    const px = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700, large = px >= 24 || (px >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    if (cr < need) out.push({ t: txt.slice(0, 26), cr: +cr.toFixed(2), need, col: cs.color, op: +op.toFixed(2), cls: (el.className && el.className.baseVal === undefined ? el.className : '').toString().slice(0, 30), id: el.id, tag: el.tagName });
  });
  return out;
};
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1100, height: 900 } })).newPage();
  await p.addInitScript(seed, THEME); await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(2000);
  await p.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
  let all = [];
  for (const t of (process.argv[2] || 'overview,budget,house,assets,debt,entrepreneur,achievements,connections').split(',')) {
    await p.evaluate(t => showTab(t), t); await p.waitForTimeout(t === 'house' ? 2500 : 900);
    if (t === 'assets') for (const s of ['metals','crypto','cash','other','liabilities','stocks']) { await p.evaluate(s => showSubtab('assets', s, null), s); await p.waitForTimeout(400); all.push(...(await p.evaluate(scan)).map(x => ({ tab: t + '/' + s, ...x }))); }
    else all.push(...(await p.evaluate(scan)).map(x => ({ tab: t, ...x })));
  }
  const seen = new Set(); all = all.filter(x => { const k = x.tab + x.t + x.col; if (seen.has(k)) return false; seen.add(k); return true; });
  console.log('FAILING', all.length);
  const byCol = {}; all.forEach(x => { const k = x.col + ' op' + x.op; byCol[k] = (byCol[k] || 0) + 1; });
  console.log(Object.entries(byCol).sort((a, b) => b[1] - a[1]).slice(0, 25).map(e => e[1] + '  ' + e[0]).join('\n'));
  all.slice(0, 40).forEach(x => console.log(x.tab, x.cr, x.col, JSON.stringify(x.t)));
  await b.close();
})();
