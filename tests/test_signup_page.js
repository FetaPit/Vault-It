// vault-it.co/sign-up in a real browser, served through the real Worker routing from the real build:
// honest content (no fake scarcity, testimonials or false badges), form at the top on a phone, unticked marketing box,
// campaign tags captured, failures never shown as success, and the confirm / unsubscribe pages.
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
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
  // the card wall (owner, 12 Nov 2026, "Card required"): no "free, no card" promise; what happens instead; prices that match the app's Stripe links
  const full = await page.evaluate(() => { const c = document.body.cloneNode(true); c.querySelectorAll('script,style').forEach((e) => e.remove()); return c.textContent.replace(/\s+/g, ' '); });
  const cfg = fs.readFileSync(path.join(ROOT, 'src/app/paywall/stripe-config.js'), 'utf8');
  const PL = (k) => { const m = cfg.match(new RegExp(k + ': \\{ price: ([\\d.]+), tester: ([\\d.]+)')); return m ? { price: m[1], tester: m[2] } : {}; };
  const PM = PL('monthly'), PA = PL('annual'), allowed = [PM.price, PM.tester, PA.price, PA.tester];
  const pence = (full.match(/£\d+\.99\b/g) || []).concat([...full.matchAll(/(£\d+(?:\.\d\d)?) a (?:month|year)/g)].map((m) => m[1])).map((x) => x.slice(1));   // plan prices: every £x.99 and every "£x a month / a year"
  ok(!/no card|free beta|free private beta|free during the beta|free for the whole beta|never enter a card/i.test(full + ' ' + await page.content()), 'no "free, no card" promise is left on the sign-up page, its title or its share text (card wall, 12 Nov)');
  ok(/30 days free/i.test(full) && /first charged on day 31/.test(full) && /Cancel before then and you pay nothing/.test(full) && /to cancel, email hello@vault-it\.co/i.test(full), 'it says what happens instead: 30 days free, card taken when a plan is chosen, first charged on day 31, how to cancel');
  ok(PM.tester && PA.tester && pence.length >= 2 && pence.every((x) => allowed.includes(x)) && full.includes('£' + PM.tester + ' a month') && full.includes('£' + PA.tester + ' a year'), 'every plan price on the page is one the app charges through its Stripe links (' + [...new Set(pence)].join(', ') + ' against ' + allowed.join(', ') + ')');
  ok(/not end-to-end encrypted/i.test(text) && /not financial advice/i.test(text) && /PT Live Design/.test(text) && /hello@vault-it\.co/.test(text), 'trust block is honest; trader identity and contact are shown');
  const founder = (await page.textContent('#founder')).replace(/\s+/g, ' ');
  ok(!/built every line|UK developer|myself/i.test(founder) && /see what I am working towards/i.test(founder) && /one more brick/i.test(founder) && /visual feedback/i.test(founder), 'founder block does not brag about building and says why it was made (owner, 1 Nov)');
  ok(!/Buffett|Munger|Stevenson|Squibb|bypass=/.test(await page.content()), 'no links to the demo with the celebrity advisor cards');
  // owner (30 Oct): the hero is the brand book's demo, so the form sits after it; the sticky header button jumps to it
  ok(await page.evaluate(() => { const a = document.querySelector('header a.btn[href="#join"]'), f = document.getElementById('join'); return !!a && !!f && a.getBoundingClientRect().top >= 0 && a.getBoundingClientRect().bottom < 80; }), 'the header keeps a Join the beta button on screen that jumps to the form');
  ok(await page.evaluate(() => document.getElementById('marketing').checked === false && document.getElementById('testing').checked === true), 'the marketing box starts unticked');
  ok(await page.evaluate(() => !!document.querySelector('label[for=email]')), 'the email field has a label');
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scrolling on a phone');
  // brand pass (30 Oct 2026): tagline, brick wordmark, tokens, the 3D house standing complete, Daylight toggle
  ok((await page.textContent('h1')).replace(/\s+/g, ' ').trim() === 'Get out of the Red and into your home.' && await page.evaluate(() => { const e = document.querySelector('h1 em.pulse'); return !!e && getComputedStyle(e).animationName === 'homepulse'; }), 'the hero carries the brand tagline, capital Red, pulsing teal home');
  ok(await page.evaluate(() => !!document.querySelector('header .wm .dot') && !/·|-/.test(document.querySelector('header .wm').textContent) && !!document.querySelector('header .mark')), 'wordmark draws the hyphen as the brick (no middle dot) next to the mark');
  ok(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--teal').trim().toUpperCase() === '#44C0B9' && getComputedStyle(document.body).backgroundColor === 'rgb(8, 8, 8)' && /Share Tech Mono/.test(getComputedStyle(document.getElementById('heroStatus')).fontFamily)), 'brand tokens: Night page, teal, mono statusline');
  await page.evaluate(() => document.getElementById('heroStage').scrollIntoView());   // the stage only renders while on screen
  await page.waitForTimeout(4500);
  const hero = await page.evaluate(() => window.viHero ? { target: viHero.getTarget(), p: +viHero.st.p.toFixed(2), status: document.getElementById('heroStatus').textContent, scan: getComputedStyle(document.getElementById('heroStage'), '::after').backgroundImage !== 'none' } : null);
  ok(hero && Math.abs(hero.target - 0.356) < 0.001 && hero.p > 0.1 && /Victorian mid-terrace .* a brick/.test(hero.status) && hero.scan, 'the brand book hero: the house builds to the saved 35.6% of the deposit, with the brick price and scanlines: ' + JSON.stringify(hero));
  ok(await page.evaluate(() => document.querySelectorAll('.levels .lvl').length === 3 && document.querySelectorAll('#depTypes .tab').length === 5 && document.querySelectorAll('#heroPills .vi-pill').length === 7 && /Deposit target £24,000/.test(document.getElementById('depOut').textContent) && !document.querySelector('.stage-cap')), 'levels, house types, milestone pills and the deposit maths are there; the brick counter block is gone');
  const nw0 = await page.evaluate(() => viNW.totals());
  await page.evaluate(() => document.getElementById('nwStage').scrollIntoView()); await page.waitForTimeout(5200);
  const nw1 = await page.evaluate(() => viNW.totals());
  ok(nw0.net < 0 && nw0.debt === 7400 && nw1.debt < nw0.debt && /red|worth/i.test(await page.textContent('#nwMsg')), 'the net worth speed run starts in the red (debt £' + nw0.debt + ', net £' + nw0.net + ') and pays it down on screen (debt now £' + nw1.debt + ')');
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

  // ── the "are you human" check must never leave a tester stuck (owner, 31 Oct): a widget that errors, fails to
  // load or stays silent for 8 s shows "could not load" and the form still sends, without a token.
  const tsPage = async (mode) => {
    const c = await page0(390, 844);
    await c.page.addInitScript(() => { window.__vi_captcha_force = true; });
    await c.page.route('https://challenges.cloudflare.com/**', (r) => {
      if (mode === 'blocked') return r.abort();
      r.fulfill({ status: 200, contentType: 'text/javascript', body: `window.turnstile={render:function(s,o){` +
        (mode === 'error' ? `setTimeout(function(){o['error-callback']()},50);` : mode === 'ok' ? `setTimeout(function(){o.callback('TOK123')},50);` : mode === 'slow' ? `window.__tsCb=o.callback;` : ``) +
        `return 'w1'},reset:function(){}};window.viTsLoaded&&window.viTsLoaded();` });
    });
    // The page's 8 s give-up timer starts when the page script runs. On a busy machine the page itself can take seconds to load, so a
    // wall-clock probe raced it (failed about half of runs under load). The page's clock is frozen from before it loads and moved only by
    // clock.runFor, so "under 8 s" and "after 8 s" mean the page's own time, whatever the machine is doing.
    await c.page.clock.install({ time: 0 }); await c.page.clock.pauseAt(1000);
    await c.page.goto(BASE + '/sign-up', { waitUntil: 'load' });
    await c.page.fill('#email', 'ts@example.com');
    return c;
  };
  ({ ctx, page } = await tsPage('error'));
  await page.clock.runFor(400); await page.waitForTimeout(100);
  ok(/could not load/i.test(await page.textContent('#msg')), 'a widget error says the check could not load');
  await page.click('#go'); await page.waitForTimeout(500);
  ok(page.posts.length === 1 && page.posts[0].captchaToken === '', 'after a widget error the form still sends, without a token');
  await ctx.close();
  ({ ctx, page } = await tsPage('silent'));
  await page.clock.runFor(1500); await page.click('#go'); await page.waitForTimeout(300);
  ok(page.posts.length === 0 && /still running/i.test(await page.textContent('#msg')), 'a check that is still working (under 8 s) asks the visitor to wait a moment');
  await page.clock.runFor(7200); await page.waitForTimeout(100);
  ok(/could not load/i.test(await page.textContent('#msg')), 'after about 8 s with no token the page says the check could not load');
  await page.click('#go'); await page.waitForTimeout(500);
  ok(page.posts.length === 1 && page.posts[0].captchaToken === '', 'after 8 s of silence the form sends without a token');
  await ctx.close();
  ({ ctx, page } = await tsPage('blocked'));
  await page.clock.runFor(600); await page.waitForTimeout(100);
  ok(/could not load/i.test(await page.textContent('#msg')), 'a blocked check script (ad blocker, private DNS) says the check could not load');
  await page.click('#go'); await page.waitForTimeout(500);
  ok(page.posts.length === 1 && page.posts[0].captchaToken === '', 'with the check script blocked the form still sends');
  await ctx.close();
  ({ ctx, page } = await tsPage('ok'));
  await page.clock.runFor(400); await page.waitForTimeout(100);
  ok(!/could not load/i.test(await page.textContent('#msg')), 'a working check shows no warning');
  await page.click('#go'); await page.waitForTimeout(500);
  ok(page.posts.length === 1 && page.posts[0].captchaToken === 'TOK123', 'a working check still sends its token');
  await ctx.close();
  ({ ctx, page } = await tsPage('slow'));
  await page.clock.runFor(500); await page.click('#go'); await page.waitForTimeout(200);
  ok(page.posts.length === 0, 'a slow but working check holds the form until it answers');
  await page.evaluate(() => window.__tsCb('SLOWTOK')); await page.click('#go'); await page.waitForTimeout(500);
  ok(page.posts.length === 1 && page.posts[0].captchaToken === 'SLOWTOK', 'a slow check that answers in time sends its token');
  ok(page.errs.length === 0, 'no page errors in the check cases ' + page.errs.join(' | '));
  await ctx.close();

  // ── confirm page
  ({ ctx, page } = await page0(390, 844));
  page.reply = { status: 200, body: { success: true, testing: true, unsubscribe: 'https://vault-it.co/sign-up/unsubscribe?u=11111111-1111-1111-1111-111111111111&s=' + 'a'.repeat(32) } };
  await page.goto(BASE + '/sign-up/confirm?t=' + 'A'.repeat(43)); await page.waitForTimeout(500);
  ok(page.posts[0] && page.posts[0].action === 'confirm' && page.posts[0].token === 'A'.repeat(43), 'the confirm page sends the token');
  ok(await page.isVisible('#done') && /app\.vault-it\.co/.test(await page.getAttribute('#done a.btn', 'href')) && await page.isVisible('#leave'), 'confirmed: the beta link and a leave link are shown');
  { const done = (await page.textContent('#done')).replace(/\s+/g, ' '); ok(!/no card|It.s free/i.test(done) && /first 30 days are free/.test(done) && /first charged on day 31/.test(done), 'the confirm page no longer says "free, needs no card"; it says when the card is taken and first charged'); }
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
