// Brand phase 7: name (Vault-It, hyphen), wordmark (the hyphen drawn as the brick in the logo), mark, tagline and the FCA line. Run: node tests/test_brand_identity.js
const { chromium } = require('playwright');
const fs = require('fs');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const html = fs.readFileSync('/home/user/Vault-It/index.html', 'utf8');
const TAG = 'Get out of the red and into your home.';
const pages = ['index.html', 'landing.html', 'recover.html', 'site/sign-up/confirm.html', 'site/sign-up/thanks.html', 'site/sign-up/unsubscribe.html'].map(p => fs.readFileSync('/home/user/Vault-It/' + p, 'utf8')).join('\n');
ok(!/Vault·It|VAULT·IT|Vault%C2%B7It/i.test(pages), 'the name is written Vault-It (hyphen) on every page users see (owner, 30 Oct 2026)');
ok(html.includes('<title>Vault-It: ' + TAG + '</title>'), 'title carries the tagline');
ok(html.includes('property="og:title" content="Vault-It: ' + TAG + '"'), 'og:title carries the tagline');
ok((html.match(/rel="manifest"/g) || []).length === 1, 'one web app manifest');
ok(/rel="icon" type="image\/svg\+xml"/.test(html) && /rel="apple-touch-icon" sizes="180x180" href="data:image\/png/.test(html), 'favicon and touch icon use the micro mark');
const man = decodeURIComponent(html.match(/rel="manifest" href="data:application\/json;charset=utf-8,([^"]+)"/)[1]);
const mj = JSON.parse(man);
ok(mj.name === 'Vault-It' && mj.description === TAG && mj.icons.some(i => i.sizes === '512x512'), 'manifest: name, tagline and icons');
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const theme of ['dark', 'light']) {
    // signed out: sign-in card
    let p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(t => localStorage.setItem('vi-theme', t), theme); await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(1200);
    const a = await p.evaluate(() => ({ wm: !!document.querySelector('.auth-card .wm .dot'), sub: document.querySelector('.auth-sub').textContent, fca: /Not regulated by the FCA\. Not financial advice\./.test(document.querySelector('.auth-card').textContent) }));
    ok(a.wm && a.sub === 'Get out of the red and into your home.' && a.fca, theme + ': sign-in card has the brick wordmark, tagline and FCA line');
    // signed in: header and footer
    p = await (await b.newContext({ viewport: { width: 1100, height: 800 } })).newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(t => { localStorage.setItem('vi-theme', t); localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 })); localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com' })); }, theme);
    await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(1500); await p.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
    const h = await p.evaluate(() => { const wm = document.querySelector('#topnav .wm'), fca = document.querySelector('.vi-fca'), vis = e => !!e && e.getBoundingClientRect().width > 0 && getComputedStyle(e).visibility !== 'hidden';
      const night = document.querySelector('.vi-mark-night'), day = document.querySelector('.vi-mark-day');
      return { wm: vis(wm) && !!wm.querySelector('.dot') && wm.textContent === 'VaultIt', fca: vis(fca), mark: (getComputedStyle(night).display !== 'none') !== (getComputedStyle(day).display !== 'none'), dayMark: getComputedStyle(day).display !== 'none', spin: getComputedStyle(document.querySelector('.vi-mark')).animationName };
    });
    ok(h.wm, theme + ': header shows the brick wordmark');
    ok(h.mark && h.dayMark === (theme === 'light') && h.spin === 'none', theme + ': header mark is the ' + (theme === 'light' ? 'Daylight' : 'Night') + ' variant, still');
    ok(h.fca, theme + ': FCA line visible in the footer');
  }
  ok(errs.length === 0, 'no page errors ' + errs.join('|'));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
