// landing.html carries the approved brand (owner, 13 to 19 Nov 2026): Chakra Petch for headlines, titles, nav and buttons (Light 300 on the
// Level pills), Chakra Petch Figures for figures at 18 px and up, Syne only on the wordmark, the tagline "Get out of the red and into your home."
// with a solid red on "red" (#C8202A Night, #B0141F Daylight), "into your" teal and "home" gold, the brand book icons, no outside font host
// beyond the existing Google Fonts link, and the prices and copy unchanged.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const FILE = process.env.LANDING || path.join(__dirname, '..', 'landing.html');
const rgb = (h) => 'rgb(' + [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(', ') + ')';

(async () => {
  const html = fs.readFileSync(FILE, 'utf8');
  const b = await chromium.launch();
  for (const scheme of ['dark', 'light']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: scheme, reducedMotion: 'reduce' });
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await page.route('**/*', (r) => (/^file:|^data:/.test(r.request().url()) ? r.continue() : r.abort()));
    await page.goto('file://' + FILE, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const q = await page.evaluate(() => {
      const fam = (s) => { const e = document.querySelector(s); return e ? getComputedStyle(e).fontFamily : ''; };
      const col = (s) => { const e = document.querySelector(s); return e ? getComputedStyle(e).color : ''; };
      const wt = (s) => { const e = document.querySelector(s); return e ? getComputedStyle(e).fontWeight : ''; };
      return { h1: fam('.hero h1'), h2: fam('h2'), btn: fam('.btn'), wm: fam('.wm'), stat: fam('.vi-stat b'), lvl: fam('.lvl'), lvlW: wt('.lvl:not(.on)'),
        red: col('.hero h1 .tg-red'), into: col('.hero h1 em:not(.tg-home)'), home: col('.hero h1 em.tg-home'),
        h1text: document.querySelector('.hero h1').innerText.replace(/\s+/g, ' ').trim(),
        stage: getComputedStyle(document.querySelector('.stage3d')).backgroundImage.includes('rgb(6, 36, 42)'),
        sideways: document.documentElement.scrollWidth > innerWidth + 1,
        useIds: [...document.querySelectorAll('.hero svg use')].map((u) => u.getAttribute('href')),
        missing: [...document.querySelectorAll('.hero svg use')].filter((u) => !document.querySelector(u.getAttribute('href'))).length,
        loaded: ['700 20px "Chakra Petch"', '300 14px "Chakra Petch"', '700 20px "Chakra Petch Figures"'].map((f) => document.fonts.check(f)) };
    });
    const t = scheme;
    ok(/^"?Chakra Petch"?/.test(q.h1) && /^"?Chakra Petch"?/.test(q.h2), t + ': headlines are Chakra Petch');
    ok(/^"?Chakra Petch"?/.test(q.btn), t + ': buttons are Chakra Petch');
    ok(/^"?Chakra Petch Figures"?/.test(q.stat), t + ': figures at 18 px and up are Chakra Petch Figures');
    ok(/^"?Syne"?/.test(q.wm), t + ': Syne only on the wordmark');
    ok(/^"?Chakra Petch"?/.test(q.lvl) && q.lvlW === '300', t + ': Level pills are Chakra Petch Light 300');
    ok(q.h1text === 'Get out of the red and into your home.', t + ': tagline text is exact (' + q.h1text + ')');
    ok(q.red === rgb(t === 'dark' ? '#C8202A' : '#B0141F'), t + ': "red" is the solid red for this mode (' + q.red + ')');
    ok(q.into === rgb(t === 'dark' ? '#44C0B9' : '#185550'), t + ': "into your" is teal (' + q.into + ')');
    ok(q.home === rgb(t === 'dark' ? '#E8C56A' : '#A8781F'), t + ': "home" is gold (' + q.home + ')');
    ok(q.useIds.length > 0 && q.missing === 0, t + ': hero icons come from the brand sprite, none missing (' + q.useIds.join(' ') + ')');
    ok(q.loaded.every(Boolean), t + ': Chakra Petch 300, 700 and Figures are embedded and load');
    ok(q.stage, t + ': the 3D house stage stays Night');
    ok(!q.sideways, t + ': no sideways scroll at 390 px');
    ok(errs.length === 0, t + ': no page errors ' + errs.join('; '));
    await ctx.close();
  }
  ok(!/fonts\.googleapis\.com\/css2\?[^"]*Syne:wght@[^"&]*600/.test(html), 'Google Fonts link loads only Syne 800 for the wordmark');
  ok(!/<link[^>]+rel="stylesheet"[^>]+href="https?:\/\/(?!fonts\.(googleapis|gstatic)\.com)/.test(html), 'no new outside stylesheet hosts');
  ok(/30 days free/.test(html) && /£3\.99/.test(html) && /£5\.99/.test(html), 'prices and the 30 days free copy are unchanged');
  ok(/Not regulated by the FCA\. Not financial advice\./.test(html), 'FCA line is on the page');
  ok(!/—|–|&mdash;|&ndash;/.test(html), 'no em or en dashes');
  await b.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
