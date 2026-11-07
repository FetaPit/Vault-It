// Public privacy and terms pages (owner, 7 Nov 2026: "go build the privacy and terms pages"), for Google's brand check of
// the "Continue with Google" screen: vault-it.co/privacy and vault-it.co/terms, built from the app's own notice text so they
// can never say something different from the app, and linked from the vault-it.co footer.
//   1. the site build writes dist/landing/privacy.html and terms.html, and the Worker serves them at /privacy and /terms
//   2. their wording is the app's Privacy notice and Beta terms, word for word (the in-app modals are the source)
//   3. each page: title, canonical address, indexable, the FCA line, the trader address, links home and to the other page
//   4. the vault-it.co footer (and the sign-up form note) link the public pages, on vault-it.co
//   5. 390 and 1100 px, Night and Daylight: no sideways scroll, no page errors, no em dashes, readable type
// Run: node tests/test_legal_pages.js
require('./lib/vi');
const { chromium } = require('playwright');
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const { ROOT, FILE_URL } = require('./lib/vi');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const norm = (s) => s.replace(/\s+/g, ' ').trim();

(async () => {
  // 1. build into a temp folder
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'vi-legal-'));
  let built = true; try { cp.execFileSync('node', [path.join(ROOT, 'tools/build_site.js')], { env: Object.assign({}, process.env, { SITE_OUT: out }), stdio: 'pipe' }); } catch (e) { built = false; console.log(String(e.stdout || ''), String(e.stderr || '')); }
  const P = path.join(out, 'landing', 'privacy.html'), T = path.join(out, 'landing', 'terms.html');
  ok(built && fs.existsSync(P) && fs.existsSync(T), '1 the site build writes privacy.html and terms.html for vault-it.co');
  const { route } = await import(path.join(ROOT, 'worker/index.mjs'));
  const rp = route('vault-it.co', '/privacy'), rt = route('vault-it.co', '/terms');
  ok(rp.file === '/landing/privacy.html' && rt.file === '/landing/terms.html', '1 the Worker serves them at vault-it.co/privacy and /terms (' + rp.file + ', ' + rt.file + ')');
  if (!fs.existsSync(P) || !fs.existsSync(T)) { console.log('FAILURES ' + fails); process.exit(1); }
  const ph = fs.readFileSync(P, 'utf8'), th = fs.readFileSync(T, 'utf8');

  // 3. page furniture
  for (const [name, h, other] of [['privacy', ph, 'terms'], ['terms', th, 'privacy']]) {
    ok(/<title>[^<]*(Privacy notice|Beta terms)[^<]*Vault-It<\/title>/.test(h) && new RegExp('<link rel="canonical" href="https://vault-it\\.co/' + name + '">').test(h), '3 ' + name + ': title and canonical address');
    ok(!/noindex/.test(h), '3 ' + name + ': search engines may index it (Google checks it)');
    ok(/Not regulated by the FCA\. Not financial advice\./.test(h) && /A57, 11 St Mary’s Street, Lincoln LN5 7EQ/.test(h), '3 ' + name + ': FCA line and trader address');
    ok(new RegExp('href="/' + other + '"').test(h) && /href="\/"/.test(h) && /mailto:hello@vault-it\.co/.test(h), '3 ' + name + ': links home, to the other page and the contact address');
    ok(!/[—–]|&mdash;|&ndash;/.test(h.replace(/<script[\s\S]*?<\/script>/g, '')), '5 ' + name + ': no em or en dashes');
  }

  // 4. links from vault-it.co
  const land = fs.readFileSync(path.join(ROOT, 'landing.html'), 'utf8'), lf = land.slice(land.indexOf('<footer>'), land.indexOf('</footer>'));
  ok(/href="\/privacy">Privacy notice</.test(lf) && /href="\/terms">Beta terms</.test(lf), '4 the vault-it.co footer links /privacy and /terms');
  ok(!/app\.vault-it\.co\/\?privacy=1/.test(land), '4 vault-it.co no longer sends people into the app to read the privacy notice');

  const b = await chromium.launch(); const errs = [];
  // 2. same words as the app
  const ctx0 = await b.newContext(); const app = await ctx0.newPage(); app.on('pageerror', e => errs.push('app: ' + e.message));
  await app.addInitScript(() => { localStorage.setItem('vi_declined_demo', 'true'); });
  await app.goto(FILE_URL); await app.waitForTimeout(1500);
  const appText = async (fn) => app.evaluate((f) => { window[f](); const m = document.getElementById('legal-modal'); const t = m.innerText; m.remove(); return t; }, fn);
  const aPriv = norm(await appText('showPrivacy')), aTerms = norm(await appText('showTerms'));
  await ctx0.close();

  // the built pages, served the way the Worker serves them (file name from route())
  const http = require('http');
  const srv = http.createServer((req, res) => { const r = route('vault-it.co', req.url.split('?')[0]); const f = r.file ? path.join(out, r.file) : null;
    if (!f || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': f.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8' }); fs.createReadStream(f).pipe(res); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); const BASE = 'http://127.0.0.1:' + srv.address().port;
  for (const [w, theme] of [[390, 'dark'], [1100, 'light'], [390, 'light'], [1100, 'dark']]) {
    const mob = w < 700;
    const ctx = await b.newContext({ viewport: { width: w, height: 844 }, isMobile: mob, hasTouch: mob, deviceScaleFactor: mob ? 2 : 1 });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(w + ' ' + theme + ': ' + e.message));
    await p.addInitScript((t) => { localStorage.setItem('vi-theme', t); }, theme);
    for (const [name, appT] of [['privacy', aPriv], ['terms', aTerms]]) {
      const resp = await p.goto(BASE + '/' + name);
      const r = await p.evaluate(() => { const m = document.querySelector('main'), fs = [...m.querySelectorAll('p,li')].map(e => parseFloat(getComputedStyle(e).fontSize));
        return { text: m.innerText, side: document.documentElement.scrollWidth - innerWidth, min: Math.min(...fs), h1: (document.querySelector('h1') || {}).textContent || '', theme: document.documentElement.getAttribute('data-theme') || 'dark' }; });
      const T0 = name + ' ' + w + ' ' + theme + ': ';
      if (w === 390 && theme === 'dark') {
        ok(resp.status() === 200 && norm(r.text).includes(appT.replace(/^(Privacy notice|Beta terms) /, '').slice(0, 400)), '2 ' + name + ': opens with the app\'s own wording');
        const body = (s) => s.replace(/^(Privacy notice|Beta terms) /, '').replace(/ Close$/, '');
        ok(norm(r.text).includes(body(appT)), '2 ' + name + ': the whole notice, word for word as in the app (' + body(appT).length + ' chars)');
      }
      ok(r.side <= 1, '5 ' + T0 + 'no sideways scroll (' + r.side + ')');
      ok(r.min >= 15, '5 ' + T0 + 'body text at least 15 px (' + r.min + ')');
      ok(r.theme === theme, '5 ' + T0 + 'follows the saved theme');
      await p.screenshot({ path: path.join(ROOT, 'shots/qc/legal-' + name + '_' + theme + '_' + w + '.png'), fullPage: false });
    }
    await ctx.close();
  }
  srv.close(); await b.close();
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 3).join(' | '));
  fs.rmSync(out, { recursive: true, force: true });
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
