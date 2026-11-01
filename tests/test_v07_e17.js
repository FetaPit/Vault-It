// v0.7 E17 (owner, 1 Nov): the amount box for adding to the deposit is bigger. Pedro A5: 56 px tall, Share Tech Mono 24 px digits,
// 20 px £ in gold, inputmode decimal, placeholder "2,000"; 599 px and under: input full width with a 48 px button full width below;
// 600 px and over: one row; under it a live mono 12 px line "£n lays n bricks" from the app's own brick value.
// Run: node tests/test_v07_e17.js
const { chromium } = require('playwright');
const APP = process.env.VI_APP || 'file:///home/user/Vault-It/index.html';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
(async () => {
  const b = await chromium.launch();
  for (const w of [390, 599, 600, 768, 1100]) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } }); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => { localStorage.setItem('vi_declined_demo', 'true'); });
    await p.goto(APP + '?bypass=websummit'); await p.waitForTimeout(1500);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
    await p.evaluate(() => showTab('house')); await p.waitForTimeout(2500);
    await p.fill('#savingsInput', '2000'); await p.waitForTimeout(300);
    const r = await p.evaluate(() => {
      const i = document.getElementById('savingsInput'), s = document.querySelector('#hb-lay .sym'), bt = document.getElementById('btnAdd'), ln = document.getElementById('hb-brick-line');
      const ri = i.getBoundingClientRect(), rb = bt.getBoundingClientRect(), rw = document.querySelector('#hb-lay .hb-lay-row').getBoundingClientRect(), ci = getComputedStyle(i), cs = getComputedStyle(s);
      return { h: Math.round(ri.height), fs: ci.fontSize, ff: ci.fontFamily, sfs: cs.fontSize, scol: cs.color, im: i.getAttribute('inputmode'), ph: i.getAttribute('placeholder'),
        bh: Math.round(rb.height), bw: Math.round(rb.width), rw: Math.round(rw.width), below: rb.top >= ri.bottom - 1, sameRow: Math.abs(rb.top - ri.top) < 20, line: ln ? ln.textContent.trim() : null,
        lfs: ln ? getComputedStyle(ln).fontSize : null, lff: ln ? getComputedStyle(ln).fontFamily : null, side: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };
    });
    const t = w + 'px: ';
    ok(r.h === 56, t + 'amount box 56 px tall (got ' + r.h + ')');
    ok(r.fs === '24px' && /Share Tech Mono/i.test(r.ff), t + 'digits Share Tech Mono 24 px (' + r.fs + ' ' + r.ff.slice(0, 30) + ')');
    ok(r.sfs === '20px' && /232, 197, 106|212, 168, 67|201, 168|rgb/.test(r.scol), t + '£ is 20 px gold (' + r.sfs + ' ' + r.scol + ')');
    ok(r.im === 'decimal' && r.ph === '2,000', t + 'inputmode decimal, placeholder 2,000');
    if (w <= 599) ok(r.below && r.bh === 48 && r.bw >= r.rw - 2, t + 'button 48 px, full width, below the input (' + r.bh + ' ' + r.bw + '/' + r.rw + ')');
    else ok(r.sameRow, t + 'one row (button beside the input)');
    ok(/^£[\d,]+ lays [\d,]+ bricks?$/.test(r.line || ''), t + 'brick line (' + r.line + ')');
    ok(r.lfs === '12px' && /Share Tech Mono/i.test(r.lff || ''), t + 'brick line mono 12 px');
    ok(!r.side, t + 'no sideways scroll');
    ok(errs.length === 0, t + 'no page errors ' + errs.slice(0, 1));
    await p.close();
  }
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
