// vault-it.co/sign-up in a real browser, served through the real Worker routing from the real build:
// honest content (no fake scarcity, testimonials or false badges), form at the top on a phone, unticked marketing box,
// campaign tags captured, failures never shown as success, and the confirm / unsubscribe pages.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http'), cp = require('child_process'), { pathToFileURL } = require('url');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const ROOT = path.join(__dirname, '..'), DIST = fs.mkdtempSync(path.join(require('os').tmpdir(), 'vaultit-signup-'));
const FN = 'https://legpubblzgknxdtvsant.supabase.co/functions/v1/waitlist-join';

(async () => {
  cp.execFileSync('node', [path.join(ROOT, 'tools', 'build_site.js')], { env: { ...process.env, SITE_OUT: DIST }, stdio: ['ignore', 'ignore', 'inherit'] });
  const { route } = await import(pathToFileURL(path.join(ROOT, 'worker', 'index.mjs')).href);
  const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png' };
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x'); const r = route('vault-it.co', u.pathname);
    const f = r.file && path.join(DIST, r.file);
    if (!f || !fs.existsSync(f)) { res.writeHead(404); return res.end('nf'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f));
  }).listen(0);
  const BASE = 'http://127.0.0.1:' + srv.address().port;
  const b = await chromium.launch();
  const page0 = async (w, h, scheme) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme || 'dark' }); const page = await ctx.newPage();
    page.errs = []; page.on('pageerror', (e) => page.errs.push(e.message));
    page.hosts = new Set(); page.on('request', (r) => { const u = new URL(r.url()); if (u.hostname !== '127.0.0.1') page.hosts.add(u.hostname); });
    page.posts = []; page.reply = { status: 200, body: { success: true } };
    await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await page.route(FN, async (r) => { page.posts.push(JSON.parse(r.request().postData() || '{}')); await r.fulfill({ status: page.reply.status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(page.reply.body) }); });
    return { ctx, page };
  };

  // ── content and layout on a phone
  let { ctx, page } = await page0(390, 844);
  await page.goto(BASE + '/sign-up?utm_source=meta&utm_medium=paid&utm_campaign=beta-oct&fbclid=XYZ', { waitUntil: 'load' });
  const text = await page.evaluate(() => document.body.innerText);
  ok(!/spots? (remaining|left)|only \d+ spots|before they.re gone/i.test(text), 'no scarcity claims');
  ok(!/Sarah M|James T|Priya K|From our pioneers|already on the climb/i.test(text), 'no unsourced testimonials');
  ok(!/works offline|seven modules|live spot|most popular|invest once|lifetime/i.test(text), 'none of the false or risky badges from the old page');
  ok(/Not regulated by the FCA\. Not financial advice\./.test(text), 'FCA line is shown (owner, 30 Oct)');
  ok(/not end-to-end encrypted/i.test(text) && /not financial advice/i.test(text) && /PT Live Design/.test(text) && /hello@vault-it\.co/.test(text), 'trust block is honest; trader identity and contact are shown');
  ok(!/Buffett|Munger|Stevenson|Squibb|bypass=/.test(await page.content()), 'no links to the demo with the celebrity advisor cards');
  const form = await page.evaluate(() => { const r = document.getElementById('join').getBoundingClientRect(); return { top: r.top + scrollY, bottom: r.bottom + scrollY }; });
  ok(form.bottom < 844 * 1.6, 'the form is near the top on a phone (ends at ' + Math.round(form.bottom) + 'px)');
  ok(await page.evaluate(() => document.getElementById('marketing').checked === false && document.getElementById('testing').checked === true), 'the marketing box starts unticked');
  ok(await page.evaluate(() => !!document.querySelector('label[for=email]')), 'the email field has a label');
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scrolling on a phone');
  // brand pass (30 Oct 2026): tagline, brick wordmark, tokens, the 3D house standing complete, Daylight toggle
  ok((await page.textContent('h1')).replace(/\s+/g, ' ').trim() === 'Get out of the red and into your home.', 'the hero carries the brand tagline');
  ok(await page.evaluate(() => !!document.querySelector('header .wm .dot') && !/·|-/.test(document.querySelector('header .wm').textContent) && !!document.querySelector('header .mark')), 'wordmark draws the hyphen as the brick (no middle dot) next to the mark');
  ok(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--teal').trim().toUpperCase() === '#44C0B9' && getComputedStyle(document.body).backgroundColor === 'rgb(8, 8, 8)' && /Share Tech Mono/.test(getComputedStyle(document.getElementById('heroStatus')).fontFamily)), 'brand tokens: Night page, teal, mono statusline');
  await page.evaluate(() => document.getElementById('heroStage').scrollIntoView());   // the stage only renders while on screen
  await page.waitForTimeout(4500);
  const hero = await page.evaluate(() => window.viHero ? { target: viHero.getTarget(), p: +viHero.st.p.toFixed(2), status: document.getElementById('heroStatus').textContent, scan: getComputedStyle(document.getElementById('heroStage'), '::after').backgroundImage !== 'none' } : null);
  ok(hero && hero.target === 1 && hero.p > 0.3 && /Victorian mid-terrace/.test(hero.status) && hero.scan, 'the brand 3D house builds in towards the finished home, with scanlines: ' + JSON.stringify(hero));
  await page.click('#themeBtn'); await page.waitForTimeout(250);
  ok(await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'light' && localStorage.getItem('vi-theme') === 'light' && getComputedStyle(document.body).backgroundColor === 'rgb(243, 247, 246)' && document.querySelector('meta[name=theme-color]').content === '#F3F7F6'), 'Daylight toggle applies, persists and recolours the browser chrome');
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scrolling in Daylight either');
  await page.click('#themeBtn'); await page.waitForTimeout(100);
  ok(await page.evaluate(async () => { for (const i of document.images) { i.loading = 'eager'; if (!i.complete) await new Promise((r) => { i.onload = i.onerror = r; }); } return [...document.images].every((i) => i.naturalWidth > 0); }), 'every image loads');
  await page.screenshot({ path: path.join(ROOT, 'shots', 'signup_mobile.png'), fullPage: false });

  // bad address: nothing sent
  await page.fill('#email', 'not-an-email'); await page.click('#go'); await page.waitForTimeout(200);
  ok(page.posts.length === 0 && /check your email/i.test(await page.textContent('#msg')), 'an incomplete address is caught in the browser and nothing is sent');

  // server failure: told plainly, not "you're in"
  page.reply = { status: 500, body: { error: 'server' } };
  await page.fill('#email', 'pete@example.com'); await page.click('#go'); await page.waitForTimeout(400);
  ok(/nothing was saved/i.test(await page.textContent('#msg')) && !/you.re in/i.test(await page.textContent('#msg')) && page.url().includes('/sign-up?'), 'a server failure is shown as a failure (no fake success, no move to the thank-you page)');
  ok(await page.evaluate(() => !document.getElementById('go').disabled), 'the button works again after a failure');
  page.reply = { status: 429, body: { error: 'rate_limited', retryAfter: 600 } };
  await page.click('#go'); await page.waitForTimeout(400);
  ok(/wait 10 minutes/.test(await page.textContent('#msg')), 'a rate limit says how long to wait');

  // success
  page.reply = { status: 200, body: { success: true } }; page.posts.length = 0;
  await page.check('#marketing');
  await Promise.all([page.waitForURL('**/sign-up/thanks'), page.click('#go')]);
  const p = page.posts[0];
  ok(p && p.action === 'join' && p.email === 'pete@example.com' && p.testing === true && p.marketing === true && p.consentVersion === 'signup-2026-10-27', 'the request carries the address, both choices and the consent wording version');
  ok(p.utm && p.utm.source === 'meta' && p.utm.medium === 'paid' && p.utm.campaign === 'beta-oct' && !JSON.stringify(p).includes('XYZ') && p.source === 'sign-up', 'campaign tags are captured; click ids are not');
  ok(/pe…@example\.com/.test(await page.textContent('main')) && /check your inbox/i.test(await page.textContent('h1')), 'the thank-you page says where the email went (masked) and what to do next');
  ok(page.errs.length === 0, 'no page errors ' + page.errs.join(' | '));
  ok([...page.hosts].every((h) => ['fonts.googleapis.com', 'fonts.gstatic.com', 'legpubblzgknxdtvsant.supabase.co'].includes(h)), 'talks only to the fonts service and our own server: ' + [...page.hosts].join(', '));
  await ctx.close();

  // a device set to light gets Daylight on its first visit (QA list: device preference is followed, the toggle persists)
  ({ ctx, page } = await page0(390, 844, 'light'));
  await page.goto(BASE + '/sign-up', { waitUntil: 'load' });
  ok(await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'light' && document.querySelector('#themeBtn .tl').textContent === 'Night'), 'a light-mode device gets Daylight on first visit');
  await ctx.close();

  // the root address serves the same page
  ({ ctx, page } = await page0(1366, 860));
  await page.goto(BASE + '/', { waitUntil: 'load' });
  ok(/Join the beta list/.test(await page.textContent('#go')), 'vault-it.co/ serves the same page');
  await page.screenshot({ path: path.join(ROOT, 'shots', 'signup_desktop.png'), fullPage: false });
  await page.screenshot({ path: path.join(ROOT, 'shots', 'signup_desktop_full.png'), fullPage: true });
  await page.fill('#email', 'home@example.com');
  await Promise.all([page.waitForURL('**/sign-up/thanks'), page.click('#go')]);
  ok(page.posts[0].source === 'home', 'sign-ups from the home address are told apart from /sign-up');
  await ctx.close();

  // ── confirm page
  ({ ctx, page } = await page0(390, 844));
  page.reply = { status: 200, body: { success: true, testing: true, unsubscribe: 'https://vault-it.co/sign-up/unsubscribe?u=11111111-1111-1111-1111-111111111111&s=' + 'a'.repeat(32) } };
  await page.goto(BASE + '/sign-up/confirm?t=' + 'A'.repeat(43)); await page.waitForTimeout(500);
  ok(page.posts[0] && page.posts[0].action === 'confirm' && page.posts[0].token === 'A'.repeat(43), 'the confirm page sends the token');
  ok(await page.isVisible('#done') && /app\.vault-it\.co/.test(await page.getAttribute('#done a.btn', 'href')) && await page.isVisible('#leave'), 'confirmed: the beta link and a leave link are shown');
  ok(!page.url().includes('t='), 'the token is removed from the address bar after use');
  page.reply = { status: 410, body: { error: 'invalid_link' } };
  await page.goto(BASE + '/sign-up/confirm?t=' + 'B'.repeat(43)); await page.waitForTimeout(500);
  ok(await page.isVisible('#bad') && !(await page.isVisible('#done')), 'a used or expired link is explained, not shown as success');
  page.reply = { status: 200, body: { success: true, unsubscribe: 'javascript:alert(1)' } };
  await page.goto(BASE + '/sign-up/confirm?t=' + 'C'.repeat(43)); await page.waitForTimeout(500);
  ok(!(await page.isVisible('#leave')), 'a leave link that is not https is never shown');
  const before = page.posts.length; await page.goto(BASE + '/sign-up/confirm?t=<script>'); await page.waitForTimeout(300);
  ok(page.posts.length === before && await page.isVisible('#bad'), 'a malformed token is not sent');
  await ctx.close();

  // ── unsubscribe page: needs a tap (link scanners do not unsubscribe people)
  ({ ctx, page } = await page0(390, 844));
  await page.goto(BASE + '/sign-up/unsubscribe?u=11111111-1111-1111-1111-111111111111&s=' + 'a'.repeat(32)); await page.waitForTimeout(400);
  ok(page.posts.length === 0, 'opening the link alone does not unsubscribe');
  await page.click('#go'); await page.waitForTimeout(400);
  ok(page.posts[0].action === 'unsubscribe' && page.posts[0].sig === 'a'.repeat(32) && await page.isVisible('#done'), 'the tap sends the signed request and confirms');
  await page.goto(BASE + '/sign-up/unsubscribe?u=bad&s=x'); await page.waitForTimeout(300);
  ok(await page.isVisible('#bad'), 'a broken link is explained');
  ok(page.errs.length === 0, 'no page errors on the follow-on pages ' + page.errs.join(' | '));
  await ctx.close();

  await b.close(); srv.close();
  console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})();
