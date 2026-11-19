// Feedback picture and button (owner, 19 Nov 2026 phone check): the picture failed on Overview and Budget (html2canvas cannot read
// CSS color-mix()), the Feedback sheet lagged, and the button could be covered. Uses the REAL html2canvas (node_modules/html2canvas,
// or H2C_FILE=/path/html2canvas.min.js); the page's cdnjs request is answered from that file. Without it the test prints SKIP and checks nothing (add it as a devDependency to switch it on in CI).
// Run: node tests/test_feedback_capture.js
require('./lib/vi');
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const cands = [process.env.H2C_FILE, path.join(__dirname, '..', 'node_modules/html2canvas/dist/html2canvas.min.js'), '/tmp/h2c/x/package/dist/html2canvas.min.js'].filter(Boolean);
const h2cFile = cands.find(f => fs.existsSync(f));
(async () => {
  if (!h2cFile) { console.log('SKIP: real html2canvas not found (set H2C_FILE, or add html2canvas 1.4.1 as a devDependency); nothing checked'); process.exit(0); }
  const src = fs.readFileSync(h2cFile, 'utf8'), b = await chromium.launch(), errs = [];
  for (const [w, theme] of [[390, 'dark'], [1100, 'light']]) {
    const mob = w < 700, ctx = await b.newContext({ viewport: { width: w, height: mob ? 844 : 900 }, isMobile: mob, hasTouch: mob });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(w + ' ' + e.message));
    const sent = [];
    await ctx.route(/\/functions\/v1\/tester-feedback/, r => { sent.push(JSON.parse(r.request().postData() || '{}')); r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"ok":true,"id":1}' }); });
    await ctx.route(/html2canvas/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: src }));
    await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost|.*html2canvas|.*\/functions\/v1\/tester-feedback)/, r => r.abort());
    await p.addInitScript(t => { localStorage.setItem('vi_theme', t); localStorage.setItem('vi_declined_demo', 'true');
      localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
      localStorage.setItem('pos_ov1', JSON.stringify({ income: [{ id: 1, name: 'Salary', amount: 3217, cat: 'salary' }], expenses: [{ id: 2, name: 'Rent', amount: 987, type: 'ce' }, { id: 3, name: 'Food', amount: 300, type: 'ce' }] })); }, theme);
    await p.goto(require('./lib/vi').FILE_URL); await p.waitForTimeout(1800);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#pro-offer-modal,#trial-banner,#tester-welcome{display:none!important}' });
    const T = w + ' ' + theme + ': ';
    await p.evaluate(() => { _supaUser = { id: 'u1', email: 't@t.com' }; window._freshAccessToken = _freshAccessToken = async () => 'TOK'; });
    for (const tab of ['overview', 'budget', 'assets', 'debt', 'house', 'biz', 'achievements']) {
      await p.evaluate(t => showTab(t), tab); await p.waitForTimeout(900);
      const r = await p.evaluate(async () => { const t0 = performance.now(); const u = await viFb.capture(); return { ok: typeof u === 'string' && u.startsWith('data:image/jpeg'), len: u ? u.length : 0, ms: Math.round(performance.now() - t0) }; });
      ok(r.ok, T + tab + ': the real html2canvas takes a picture (' + r.len + ' bytes, ' + r.ms + ' ms)');
    }
    // the button is the top element at its own centre on Overview, even with the 3D card scrolled behind it
    await p.evaluate(() => showTab('overview')); await p.waitForTimeout(900);
    const top = await p.evaluate(async () => { const out = []; for (const y of [0, 400, 900, 1600, 99999]) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 1300));
      const e = document.getElementById('vi-fb-btn'), r = e.getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); out.push(!!t && (t === e || e.contains(t)) ? 'y' : (t ? t.tagName + '#' + t.id + '.' + String(t.className).slice(0, 30) : 'none')); } return out; });
    ok(top.every(x => x === 'y'), T + 'the Feedback button is the top thing at its own centre at every scroll position (' + top.join(',') + ')');
    // the 3D loops behind sleep while the sheet is open, and wake when it closes (owner, 19 Nov: the sheet lagged)
    await p.evaluate(() => showTab('overview')); await p.waitForTimeout(1500);
    await p.evaluate(() => { const c = document.querySelector('.nw3d-main-3d'); if (c) c.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(1200);
    const fr = await p.evaluate(async () => { const raf0 = window.requestAnimationFrame.bind(window); let n = 0; window.requestAnimationFrame = cb => { n++; return raf0(cb) };
      const w = ms => new Promise(r => setTimeout(r, ms)); await w(800); const before = n; n = 0; await w(1000); const running = n; viFbOpen(); await w(300); n = 0; await w(1500); const open = n; viFbClose(); n = 0; await w(1000); const after = n;
      window.requestAnimationFrame = raf0; return { running, open, after } });
    ok(fr.running > 10 && fr.open <= 4 && fr.after > 10, T + '3D frames: ' + fr.running + ' a second running, ' + fr.open + ' in 1.5 s behind the open sheet, ' + fr.after + ' once closed');
    // words still send when no picture can be taken
    await p.evaluate(() => { window.html2canvas = () => Promise.reject(new Error('no picture')); viFb.capture = null; });
    await p.evaluate(() => { viFbOpen(); document.getElementById('vi-fb-text').value = 'words only'; });
    await p.evaluate(() => { const o = window.html2canvas; document.getElementById('vi-fb-pic').checked = true; viFbSend(); }); await p.waitForTimeout(2500);
    ok(sent.some(s => s.kind === 'feedback' && s.text === 'words only'), T + 'the words send even when no picture can be taken');
    await ctx.close();
  }
  await b.close(); if (errs.length) console.log('page errors:', errs.slice(0, 3));
  console.log(fails ? 'FAILURES ' + fails : 'ALL OK'); process.exit(fails ? 1 : 0);
})();
