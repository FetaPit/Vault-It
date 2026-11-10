// v0.9.2 (owner, 6 Nov): a still of the finished House Builder house on the sign-in screen, email step only.
// Checks: the picture is not in the page markup and is fetched only after the page (and so the card) has loaded; the email field and
// Continue sit exactly where they would without it (390x664 and 1440x900) and stay in the first screen; it is gone on the code, PIN and
// set-PIN steps and back on the email step; alt text; Night and Daylight each fetch their own WebP (under 120 KB) from the app's
// own folder. Owner, 10 Nov: "the house build animation should sit in the background close up behind the sign in box", so the picture
// (the poster and fallback for the 3D build) fills the screen behind the card at every size, keyboard open included.
// Run: node tests/test_v092_signin_house.js
const VI = require('./lib/vi');
const { chromium } = require('playwright'); const routeThree = require('./three_route');
const fs = require('fs'), path = require('path');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const ALT = "A house built in Vault-It's House Builder";
const BOX = (sel) => (page) => page.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(Math.round); }, sel);
const HOUSE = (page) => page.evaluate(() => { const e = document.querySelector('.auth-house'); if (!e) return { found: false }; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
  return { found: true, left: Math.round(r.left), right: Math.round(r.right), shown: !e.hidden && cs.display !== 'none' && r.height > 0, src: e.currentSrc || e.getAttribute('src') || '', alt: e.alt, complete: e.complete && e.naturalWidth > 0, top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) }; });
(async () => {
  for (const f of ['signin-house-bg-night.webp', 'signin-house-bg-day.webp']) { const p = path.join(__dirname, '..', 'img', f); const kb = fs.existsSync(p) ? fs.statSync(p).size / 1024 : 1e9; ok(kb < 120, f + ' is a WebP under 120 KB in the app\'s own files (' + kb.toFixed(1) + ' KB)'); }
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  ok(!/<img[^>]*auth-house/.test(html), 'the picture is not in the page markup, so it cannot load before the card');
  const b = await chromium.launch();
  // 5519bd1 (the onboarding-friction card: Google first, no sign-in house) measured in this same browser, so font differences between machines cancel out. Shallow clones (CI) lack it: skip.
  let BASE = null;
  try {
    const old = require('child_process').execFileSync('git', ['show', '5519bd1:index.html'], { cwd: path.join(__dirname, '..'), stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 28 });
    const f = path.join(fs.mkdtempSync(path.join(require('os').tmpdir(), 'vi-signin-base-')), 'index.html'); fs.writeFileSync(f, old); BASE = {};
    for (const [w, h] of [[390, 664], [1440, 900]]) for (const theme of ['dark', 'light']) {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 }); await routeThree(ctx); const page = await ctx.newPage();
      await page.addInitScript(t => { try { localStorage.setItem('vi-theme', t); } catch (e) {} }, theme);
      await page.goto(require('url').pathToFileURL(f).href); await page.waitForTimeout(1500);
      BASE[w + 'x' + h + theme] = [await BOX('#auth-email')(page), await BOX('#auth-email-step .auth-btn')(page)]; await ctx.close();
    }
  } catch (e) { console.log('skip: 5519bd1 is not in this clone (shallow), so the same-browser comparison with it is skipped; the with/without-picture check still runs'); }
  for (const [w, h] of [[390, 664], [1440, 900]]) for (const theme of ['dark', 'light']) {
    const T = w + 'x' + h + ' ' + (theme === 'dark' ? 'Night' : 'Daylight') + ': ';
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 }); await routeThree(ctx); const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.addInitScript(t => { try { localStorage.setItem('vi-theme', t); } catch (e) {} }, theme);
    await page.goto(VI.FILE_URL); await page.waitForTimeout(1500);
    ok(await page.evaluate(() => getComputedStyle(document.getElementById('login-overlay')).display !== 'none' && document.getElementById('auth-email-step').classList.contains('active')), T + 'the sign-in email step is showing');
    const hs = await HOUSE(page);
    ok(hs.found && hs.shown && hs.complete, T + 'the house picture is showing and loaded (' + JSON.stringify(hs) + ')');
    ok(hs.alt === ALT, T + 'alt text is "' + ALT + '"');
    const want = theme === 'light' ? 'signin-house-bg-day.webp' : 'signin-house-bg-night.webp';
    ok(hs.src.endsWith('/img/' + want) && hs.src.startsWith(await page.evaluate(() => location.origin)), T + 'it is ' + want + ' from the app\'s own address (' + hs.src + ')');
    const timing = await page.evaluate(() => { const nav = performance.getEntriesByType('navigation')[0]; const rs = performance.getEntriesByType('resource').filter(r => /signin-house/.test(r.name));
      return { load: Math.round(nav.loadEventStart), starts: rs.map(r => Math.round(r.startTime)), names: rs.map(r => r.name.split('/').pop()) }; });
    ok(timing.starts.length === 1 && timing.starts[0] >= timing.load, T + 'one picture fetched, after the page and card had loaded (' + JSON.stringify(timing) + ')');
    const card = await BOX('.auth-card')(page), em = await BOX('#auth-email')(page), co = await BOX('#auth-email-step .auth-btn')(page);
    const logo = await BOX('.auth-logo')(page);
    ok(hs.top <= 0 && hs.left <= 0 && hs.bottom >= h && hs.right >= w, T + 'the house fills the screen behind the card (' + [hs.left, hs.top, hs.right, hs.bottom] + ')');
    ok(await page.evaluate(() => { const c = document.querySelector('.auth-card').getBoundingClientRect(), e = document.elementFromPoint(c.left + c.width / 2, c.top + 24); return !!e && !!e.closest('.auth-card'); }), T + 'the card sits on top of the house (logo ' + logo + ')');
    ok(em[1] + em[3] <= h && co[1] + co[3] <= h, T + 'the email field and Continue are in the first screen (' + em + ' / ' + co + ')');
    // the same page without the picture: nothing on the card moves
    await page.evaluate(() => { _ahOn = false; const i = document.querySelector('.auth-house'); if (i) i.remove(); }); await page.waitForTimeout(100);
    const card0 = await BOX('.auth-card')(page), em0 = await BOX('#auth-email')(page), co0 = await BOX('#auth-email-step .auth-btn')(page);
    ok(JSON.stringify([card, em, co]) === JSON.stringify([card0, em0, co0]), T + 'card, email field and Continue are exactly where they are without the picture (' + JSON.stringify([em, co]) + ' vs ' + JSON.stringify([em0, co0]) + ')');
    if (BASE && BASE[w + 'x' + h + theme]) ok(JSON.stringify([em, co]) === JSON.stringify(BASE[w + 'x' + h + theme]), T + 'email field and Continue are where 5519bd1 puts them in this same browser (' + JSON.stringify([em, co]) + ' vs ' + JSON.stringify(BASE[w + 'x' + h + theme]) + ')');
    await page.evaluate(() => { _ahOn = true; viSigninHouse(); }); await page.waitForTimeout(300);
    for (const step of ['otp', 'pin', 'setpin']) {
      await page.evaluate((s) => _showAuthStep(s), step); await page.waitForTimeout(100);
      const x = await HOUSE(page); ok(x.found && !x.shown, T + 'no house on the ' + step + ' step');
    }
    await page.evaluate(() => _showAuthStep('email')); await page.waitForTimeout(100);
    ok((await HOUSE(page)).shown, T + 'the house is back on the email step');
    if (w === 390) {   // switching theme on the screen swaps the picture
      const other = theme === 'light' ? 'dark' : 'light';
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), other); await page.waitForTimeout(600);
      const x = await HOUSE(page); ok(x.shown && x.src.endsWith(other === 'light' ? 'signin-house-bg-day.webp' : 'signin-house-bg-night.webp'), T + 'switching to ' + other + ' swaps the picture (' + x.src.split('/').pop() + ')');
    }
    ok(!errs.length, T + 'no page errors ' + errs.join('|'));
    await ctx.close();
  }
  // keyboard open (390x330): the house still fills the screen behind the card
  { const ctx = await b.newContext({ viewport: { width: 390, height: 330 }, deviceScaleFactor: 1 }); await routeThree(ctx); const page = await ctx.newPage();
    await page.goto(VI.FILE_URL); await page.waitForTimeout(1500);
    const x = await HOUSE(page); ok(x.shown && x.top <= 0 && x.bottom >= 330, '390x330 (keyboard open): the house fills the screen behind the card (' + JSON.stringify(x) + ')');
    await ctx.close(); }
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
