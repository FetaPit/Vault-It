// Chakra Petch (owner, 13 to 19 Nov 2026: "the headings are still Syne font which is wrong", "THE DASHBOARD FIGURES AGAIN ARE NOT CHAKRA PETCH").
//   Headlines, titles, nav and buttons are Chakra Petch; Level pills Light 300; dashboard figures Chakra Petch Figures (fixed-width digits);
//   Syne only on the wordmark; fonts embedded in the app (no new outside host).
// Run: node tests/test_v09x_chakra.js
require('./lib/vi');
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const APP = process.env.VI_APP || require('./lib/vi').FILE_URL;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
// 1. source: no Syne left in the app parts except the wordmark and logo lockups
const root = path.join(__dirname, '..', 'src', 'app'), left = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.(css|html|js)$/.test(f) && !/engine\.generated/.test(f)) fs.readFileSync(p, 'utf8').split('\n').forEach((l, i) => { if (/Syne/.test(l) && !/font-logo|auth-logo|cc3-logo|stk-main-logo|#b8902e,#f0d878,var\(--brass\)\);-webkit-backg|Syne's default|fonts\.googleapis/.test(l)) left.push(f + ':' + (i + 1)); }); } })(root);
ok(left.length === 0, 'no Syne left outside wordmark/logo lockups ' + left.slice(0, 5).join(' '));
const tok = fs.readFileSync(path.join(root, 'shell', 'tokens.css'), 'utf8');
ok(/--font-display:"Chakra Petch"/.test(tok) && /--font-fig:"Chakra Petch Figures"/.test(tok) && /--font-logo:"Syne"/.test(tok), 'tokens: display Chakra Petch, figures Chakra Petch Figures, logo Syne');
ok((tok.match(/@font-face\{font-family:"Chakra Petch( Figures)?"[^}]*font-display:swap;src:url\(data:font\/woff2;base64,/g) || []).length === 5, 'five embedded woff2 faces, font-display swap');
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const theme of ['dark', 'light']) for (const [w, h] of [[390, 800], [1100, 900]]) {
    const T = theme + ' ' + w + ': ', phone = w < 700;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: phone, hasTouch: phone });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(w + ': ' + e.message));
    await p.addInitScript(t => { localStorage.setItem('vi-theme', t); localStorage.setItem('vi_declined_demo', 'true'); }, theme);
    await p.goto(APP); await p.waitForTimeout(1200);
    const fam = sel => p.evaluate(s => { const e = document.querySelector(s); if (!e) return 'missing'; const cs = getComputedStyle(e); return cs.fontFamily + '|' + cs.fontWeight; }, sel);
    const loaded = await p.evaluate(async () => { try { await Promise.all([document.fonts.load('700 20px "Chakra Petch"'), document.fonts.load('300 20px "Chakra Petch"'), document.fonts.load('700 20px "Chakra Petch Figures"')]); } catch (e) {} return ['700 20px "Chakra Petch"', '300 20px "Chakra Petch"', '700 20px "Chakra Petch Figures"'].map(f => document.fonts.check(f)); });
    ok(loaded.every(Boolean), T + 'Chakra Petch 300, 700 and Figures 700 load from the embedded files ' + loaded);
    for (const q of ['.welcome-h2', '.settings-section-title', '.ov-kpi-lbl', '#topnav .nav-btn, #topnav button']) { const f = await fam(q); if (f !== 'missing') ok(/^"?Chakra Petch"?/.test(f), T + q + ' is Chakra Petch (' + f + ')'); }
    const logo = await fam('#topnav .logo.wm'); if (logo !== 'missing') ok(/Syne/.test(logo), T + 'wordmark stays Syne (' + logo + ')');
    for (const q of ['.ov-kpi-val', '#kpi-nw', '.ov-sum-total']) { const f = await fam(q); if (f !== 'missing') ok(/^"?Chakra Petch Figures"?/.test(f), T + q + ' is Chakra Petch Figures (' + f + ')'); }
    const lv = await p.evaluate(() => { const e = document.querySelector('.hb-lv'); return e ? getComputedStyle(e).fontFamily + '|' + getComputedStyle(e).fontWeight : 'missing'; });
    if (lv !== 'missing') ok(/Chakra Petch/.test(lv) && /\|300$/.test(lv), T + 'Level pills Chakra Petch Light 300 (' + lv + ')');
    await ctx.close();
  }
  await b.close(); ok(errs.length === 0, 'no page errors ' + errs.slice(0, 2).join(' '));
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
