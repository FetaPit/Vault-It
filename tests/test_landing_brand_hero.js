// Landing hero, owner 13 Nov 2026: Chakra Petch for headlines and titles ("B definitely for headline and titles"); the Level pills in
// Chakra Petch Light ("apply a light version of B to Level 1 First deposit and Level 2 pills"); "home" gold with a faint glow; "red" a solid
// deep red, "a shade or 2 lighter" than the first proof; icons on the hero from the brand book ("update iconography ... from appropriate
// ones in brand book"). The font is self-hosted (embedded from brand/fonts/chakra-petch), so it draws with Google Fonts blocked.
require('./lib/vi');
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { pathToFileURL } = require('url');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const ROOT = path.join(__dirname, '..'), FILE = process.env.LANDING || path.join(ROOT, 'landing.html');
const src = fs.readFileSync(FILE, 'utf8'), sprite = fs.readFileSync(path.join(ROOT, 'brand', 'vault-it-icons.svg'), 'utf8');

// the embedded faces are the brand files, byte for byte
for (const w of [300, 400, 700]) {
  const b64 = fs.readFileSync(path.join(ROOT, 'brand', 'fonts', 'chakra-petch', 'chakra-petch-' + w + '.woff2')).toString('base64');
  ok(src.includes('font-family:"Chakra Petch"') && src.includes('data:font/woff2;base64,' + b64 + ')'), 'Chakra Petch ' + w + ' embedded, matching brand/fonts/chakra-petch');
}
ok(fs.existsSync(path.join(ROOT, 'brand', 'fonts', 'chakra-petch', 'OFL.txt')), 'the OFL licence ships with the font');
ok(!/fonts\.googleapis\.com\/css2\?[^"']*Chakra/i.test(src), 'Chakra Petch is not fetched from Google Fonts (self-hosted)');
// every icon the hero uses is the brand book's symbol, unchanged
for (const id of ['brick-wall', 'mortgage', 'home', 'lock', 'sun', 'moon', 'zoom-in', 'zoom-out', 'orbit', 'reset']) {
  const want = (sprite.match(new RegExp('<symbol id="vi-' + id + '"[\\s\\S]*?</symbol>')) || [''])[0];
  ok(want && src.includes(want), 'icon vi-' + id + ' is the brand book symbol');
}

(async () => {
  const b = await chromium.launch();
  for (const theme of ['dark', 'light']) for (const w of [390, 1100]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, colorScheme: theme }); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    await p.route(/fonts\.(googleapis|gstatic)\.com/, (q) => q.abort());
    await p.goto(pathToFileURL(FILE).href, { waitUntil: 'load' });
    const r = await p.evaluate(async () => {
      await document.fonts.ready; const cs = (e) => getComputedStyle(e), q = (s) => document.querySelector(s);
      const h1 = q('.hero h1'), red = q('.hero h1 .tg-red'), home = q('.hero h1 .tg-home');
      const pills = [...document.querySelectorAll('.levels .lvl')];
      return {
        text: h1.textContent.replace(/\s+/g, ' ').trim(), theme: document.documentElement.getAttribute('data-theme'),
        heads: [...document.querySelectorAll('h1,h2,h3')].filter((h) => h.offsetParent).map((h) => cs(h).fontFamily),
        loaded: document.fonts.check('700 40px "Chakra Petch"') && document.fonts.check('300 14px "Chakra Petch"'),
        red: red && cs(red).color, home: home && { c: cs(home).color, sh: cs(home).textShadow, anim: cs(home).animationName },
        into: q('.hero h1 em:not(.tg-home)') && q('.hero h1 em:not(.tg-home)').textContent,
        pills: pills.map((e) => ({ fam: cs(e).fontFamily, wt: cs(e).fontWeight, on: e.classList.contains('on'), uses: [...e.querySelectorAll('use')].map((u) => u.getAttribute('href')), paths: e.querySelectorAll('svg > path, svg > rect').length })),
        theme_uses: [...document.querySelectorAll('#themeBtn use')].map((u) => u.getAttribute('href')),
        rail: ['rIn', 'rOut', 'rOrb', 'rRst'].map((id) => { const u = document.querySelector('#' + id + ' use'); return u && u.getAttribute('href'); }),
        wm: cs(q('header .wm')).fontFamily, sideways: document.documentElement.scrollWidth > innerWidth,
      };
    });
    const tag = theme + ' ' + w + ' px: ';
    ok(r.text === 'Get out of the red and into your home.', tag + 'tagline reads "Get out of the red and into your home." (' + r.text + ')');
    ok(r.heads.length > 5 && r.heads.every((f) => /^"?Chakra Petch"?,/.test(f)) && r.loaded, tag + 'all ' + r.heads.length + ' visible headings draw in Chakra Petch, and the embedded face loads');
    const wantRed = theme === 'light' ? 'rgb(176, 20, 31)' : 'rgb(200, 32, 42)';
    ok(r.red === wantRed, tag + '"red" is a solid deep red ' + wantRed + ' (' + r.red + ')');
    ok(r.home && /^rgb\((232, 197, 106|168, 120, 31)\)$/.test(r.home.c) && r.home.sh !== 'none' && /^homepulse/.test(r.home.anim), tag + '"home" is gold with a faint glow (' + (r.home && r.home.c + ', ' + r.home.anim) + ')');
    ok(r.into === 'into your', tag + '"into your" stays teal, on its own');
    ok(r.pills.length === 3 && r.pills.every((x) => /^"?Chakra Petch"?,/.test(x.fam) && +x.wt === (x.on ? 400 : 300)), tag + 'Level pills in Chakra Petch Light (the current level Regular): ' + r.pills.map((x) => x.wt).join('/'));
    ok(JSON.stringify(r.pills.map((x) => x.uses)) === JSON.stringify([['#vi-brick-wall'], ['#vi-mortgage', '#vi-lock'], ['#vi-home', '#vi-lock']]) && r.pills.every((x) => x.paths === 0), tag + 'pill icons are the brand book brick wall, mortgage and home, with the brand lock on locked levels');
    ok(JSON.stringify(r.theme_uses) === '["#vi-sun","#vi-moon"]' && JSON.stringify(r.rail) === '["#vi-zoom-in","#vi-zoom-out","#vi-orbit","#vi-reset"]', tag + 'theme switch and camera controls use the brand book icons');
    ok(/^"?Syne"?,/.test(r.wm), tag + 'the wordmark is unchanged (Syne)');
    ok(!r.sideways && errs.length === 0, tag + 'no sideways scroll, no page errors' + (errs.length ? ' (' + errs[0].slice(0, 100) + ')' : ''));
    await ctx.close();
  }
  // reduced motion: the faint glow stays, the pulse stops (Night and Daylight)
  for (const theme of ['dark', 'light']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: theme, reducedMotion: 'reduce' }); const p = await ctx.newPage();
    await p.route(/fonts\.(googleapis|gstatic)\.com/, (q) => q.abort());
    await p.goto(pathToFileURL(FILE).href, { waitUntil: 'load' });
    const m = await p.evaluate(() => { const e = document.querySelector('.hero h1 em.pulse'); const c = e && getComputedStyle(e); return c ? { anim: c.animationName, sh: c.textShadow } : null; });
    ok(m && m.anim === 'none' && m.sh !== 'none', theme + ', reduced motion: "home" keeps its faint glow and does not pulse (' + (m && m.anim) + ')');
    await ctx.close();
  }
  await b.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL OK'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('FAIL: ' + e.stack); process.exit(1); });
