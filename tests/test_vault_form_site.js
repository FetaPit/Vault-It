// Vault-form replaces Syne on the website and in the comms (owner, 10 Nov 2026: "Vault-form, replace Syne, it needs to replace all
// headings in the website app and comms"; Pedro's round 2 review cleared the face). The app (index.html) is checked by its own tests.
// Owner, 12 Nov 2026: the plain text styles are dropped ("Drop them"): Vault-form is for headings and the logo only, DM Sans for the rest.
//  - web pages: no Syne, Syne gone from the Google Fonts link, Vault-form Heading (D+, weights 100 to 1000) embedded as a woff2 data URI
//    that matches brand/fonts/vault-form byte for byte (tools/embed_vault_form.js), and the face really loads in a browser
//  - e-mails: no Syne, an @font-face for https://vault-it.co/fonts/vault-form-heading-bold.woff2, headings 'Vault-form Heading','Helvetica Neue',Arial,sans-serif
//  - the landing build publishes the four woff2 files at /fonts/, and the Worker serves them as font/woff2, cached, readable cross-origin
//  - the live brand book and the handover name Vault-form for headings; buttons, tabs and pills on the landing page are DM Sans
//  - every landing heading draws in D+ at every size; Vault-form Hero (D++) is embedded only in the pitch deck, and only the cover title
//    at 96 px and up takes it
require('./lib/vi');
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), cp = require('child_process'), { pathToFileURL } = require('url');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const ROOT = path.join(__dirname, '..'), rd = (f) => { try { return fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch (e) { return ''; } };
const FONTS = path.join(ROOT, 'brand', 'fonts', 'vault-form', 'woff2');
const b64 = (f) => fs.readFileSync(path.join(FONTS, f)).toString('base64');
const CUT = { heading: b64('vault-form-heading-bold.woff2'), hero: b64('vault-form-hero-bold.woff2') };
const HERO = ['site/pitch-eligent/index.html'];

const WEB = ['landing.html', 'site/sign-up/style.css', 'site/sign-up/confirm.html', 'site/sign-up/thanks.html', 'site/sign-up/unsubscribe.html',
  'site/pitch-eligent/index.html', 'site/pitch-eligent/presenter.html', 'site/pitch-eligent/answers.html', 'site/pete/index.html', 'tools/build_legal.js', 'brand/vault-it-brand-book.html'];
const EMBED = ['landing.html', 'site/sign-up/style.css', 'site/pitch-eligent/index.html', 'site/pitch-eligent/presenter.html', 'site/pitch-eligent/answers.html', 'site/pete/index.html', 'brand/vault-it-brand-book.html'];
const MAIL = ['docs/marketing/build_emails.js', 'docs/marketing/newsletter-template.html', 'docs/marketing/research-email.html', 'docs/marketing/welcome-email.html',
  'tools/build_auth_templates.js', ...fs.readdirSync(path.join(ROOT, 'supabase', 'auth-templates')).filter((f) => f.endsWith('.html')).map((f) => 'supabase/auth-templates/' + f),
  ...['waitlist-join', 'waitlist-welcome', 'send-auth-email', 'tester-feedback', 'feedback-digest'].map((f) => 'supabase/functions/' + f + '/index.ts')];

// 1. web pages
for (const f of WEB) {
  const s = rd(f);
  ok(s.length > 0 && !/syne/i.test(s), f + ': no Syne left' + (/syne/i.test(s) ? ' (' + (s.match(/syne/gi) || []).length + ' found)' : ''));
  const gf = s.match(/fonts\.googleapis\.com\/css2\?[^"' ]+/g) || [];
  ok(gf.every((u) => !/Syne/i.test(u)), f + ': the Google Fonts link asks for DM Sans and Share Tech Mono only');
}
for (const f of EMBED) {
  const s = rd(f), faces = s.match(/@font-face\s*\{[^}]*\}/g) || [];
  const has = (fam, data) => faces.some((x) => x.includes('font-family:"' + fam + '"') && /font-weight:\s*100 1000/.test(x) && x.includes('data:font/woff2;base64,' + data + ')'));
  ok(has('Vault-form Heading', CUT.heading), f + ': Vault-form Heading (D+) embedded, weights 100 to 1000 so no weight is faked, matching the brand file');
  ok(!faces.some((x) => /font-family:\s*["']Vault-form["']\s*;/.test(x)), f + ': no plain Vault-form face (dropped, owner 12 Nov)');
  ok(/["']Vault-form Heading["'],\s*["']Helvetica Neue["'],\s*Arial,\s*sans-serif/.test(s), f + ': headings use Vault-form Heading with the Helvetica Neue, Arial fallback');
  if (HERO.includes(f)) ok(has('Vault-form Hero', CUT.hero), f + ': Vault-form Hero (D++) embedded, matching the brand file');
  else ok(!faces.some((x) => x.includes('font-family:"Vault-form Hero"')), f + ': Vault-form Hero not embedded (not used on this page)');
}
for (const f of ['site/sign-up/confirm.html', 'site/sign-up/thanks.html', 'site/sign-up/unsubscribe.html']) ok(/href="style\.css"/.test(rd(f)), f + ': takes Vault-form from the shared style.css');
ok(/sign-up\/style\.css/.test(rd('tools/build_legal.js')), 'the privacy and terms pages take Vault-form from sign-up/style.css');

// 2. e-mails
const STACK = "font-family:'Vault-form Heading','Helvetica Neue',Arial,sans-serif";
for (const f of MAIL) {
  const s = rd(f);
  ok(s.length > 0 && !/syne/i.test(s), f + ': no Syne left' + (/syne/i.test(s) ? ' (' + (s.match(/syne/gi) || []).length + ' found)' : ''));
  ok(/@font-face\{font-family:'Vault-form Heading';src:url\('https:\/\/vault-it\.co\/fonts\/vault-form-heading-bold\.woff2'\) format\('woff2'\);font-weight:700;/.test(s), f + ': @font-face points at vault-it.co/fonts/vault-form-heading-bold.woff2');
  ok(s.includes(STACK), f + ': headings set in ' + STACK);
}

(async () => {
  // 3. the build publishes the fonts and the Worker serves them well
  const DIST = fs.mkdtempSync(path.join(require('os').tmpdir(), 'vaultit-vf-'));
  cp.execFileSync('node', [path.join(ROOT, 'tools', 'build_site.js')], { env: { ...process.env, SITE_OUT: DIST }, stdio: ['ignore', 'ignore', 'inherit'] });
  const names = fs.readdirSync(FONTS).filter((f) => f.endsWith('.woff2')).sort();
  ok(names.length === 4 && names.every((n) => /^vault-form-(heading|hero)-/.test(n)), 'the brand folder has the four Vault-form woff2 files (Heading and Hero in two widths), no plain styles, no old Hatch: ' + names.join(', '));
  const pub = fs.existsSync(path.join(DIST, 'landing', 'fonts')) ? fs.readdirSync(path.join(DIST, 'landing', 'fonts')).sort() : [];
  ok(JSON.stringify(pub) === JSON.stringify(names) && names.every((n) => fs.readFileSync(path.join(DIST, 'landing', 'fonts', n)).equals(fs.readFileSync(path.join(FONTS, n)))), 'the landing build publishes all four at vault-it.co/fonts/, byte for byte: ' + pub.join(', '));
  ok(!fs.existsSync(path.join(DIST, 'app', 'fonts')), 'the app site does not carry them (the app embeds its own)');
  const W = (await import(pathToFileURL(path.join(ROOT, 'worker', 'index.mjs')).href)).default;
  const ASSETS = { fetch: async (req) => { const p = path.join(DIST, new URL(req.url).pathname); return fs.existsSync(p) && fs.statSync(p).isFile() ? new Response(fs.readFileSync(p), { headers: { 'Content-Type': 'application/octet-stream' } }) : new Response('nf', { status: 404 }); } };
  const r = await W.fetch(new Request('https://vault-it.co/fonts/vault-form-heading-bold.woff2'), { ASSETS }); const body = Buffer.from(await r.arrayBuffer());
  ok(r.status === 200 && body.equals(fs.readFileSync(path.join(FONTS, 'vault-form-heading-bold.woff2'))), 'vault-it.co/fonts/vault-form-heading-bold.woff2 is served');
  ok(r.headers.get('content-type') === 'font/woff2', 'served as font/woff2: ' + r.headers.get('content-type'));
  ok(/max-age=(\d+)/.test(r.headers.get('cache-control') || '') && +RegExp.$1 >= 86400, 'cached for at least a day: ' + r.headers.get('cache-control'));
  ok(r.headers.get('access-control-allow-origin') === '*', 'readable cross-origin, so a mail client or another page can load it');
  const h = await W.fetch(new Request('https://vault-it.co/'), { ASSETS }); ok(!h.headers.get('access-control-allow-origin'), 'pages themselves get no CORS header');

  // 4. the face really loads (Google Fonts is blocked here, so only the embedded faces can draw Vault-form)
  const b = await chromium.launch();
  for (const [f, sel] of [['landing.html', 'h1'], ['site/sign-up/thanks.html', 'h1'], ['site/pitch-eligent/index.html', '#cover h1'], ['site/pitch-eligent/answers.html', 'h2'], ['site/pete/index.html', '.pc-name'], ['brand/vault-it-brand-book.html', 'h2']]) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 800 } }); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    await p.route(/fonts\.(googleapis|gstatic)\.com/, (q) => q.abort());
    await p.goto(pathToFileURL(path.join(ROOT, f)).href, { waitUntil: 'load' }).catch((e) => errs.push(e.message));
    const got = await p.evaluate(async (sel) => { await document.fonts.ready; const el = document.querySelector(sel);
      const loaded = [...document.fonts].filter((x) => /^Vault-form (Heading|Hero)$/.test(x.family.replace(/["']/g, '')) && x.status === 'loaded').map((x) => x.family);
      return { fam: el ? getComputedStyle(el).fontFamily : 'missing', bold: document.fonts.check('700 40px "Vault-form Heading"'), loaded }; }, sel);
    ok(/^"?Vault-form (Heading|Hero)"?,/.test(got.fam) && got.bold && got.loaded.length > 0, f + ': ' + sel + ' draws in a Vault-form display cut, and the embedded face loads (' + got.fam.slice(0, 40) + '; loaded ' + got.loaded.join(' / ') + ')');
    await ctx.close();
  }
  // every landing heading is D+ at every size; buttons, tabs and level pills are DM Sans; the pitch cover takes D++ only at 96 px and up
  for (const [w, wantCover] of [[390, 'plain'], [1100, 'heading'], [1920, 'hero']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 } }); const p = await ctx.newPage();
    await p.route(/fonts\.(googleapis|gstatic)\.com/, (q) => q.abort());
    await p.goto(pathToFileURL(path.join(ROOT, 'landing.html')).href, { waitUntil: 'load' });
    const L = await p.evaluate(async () => { await document.fonts.ready; const fam = (el) => getComputedStyle(el).fontFamily;
      return { heads: [...document.querySelectorAll('h1,h2,h3')].filter((h) => h.offsetParent).map((h) => fam(h)),
        ui: [...document.querySelectorAll('.btn,.tab,.lvl')].map((e) => fam(e)), ok: document.fonts.check('800 28px "Vault-form Heading"') }; });
    ok(L.heads.length > 5 && L.heads.every((f) => /^"?Vault-form Heading"?,/.test(f)) && L.ok, 'landing ' + w + ' px: all ' + L.heads.length + ' visible headings draw in Vault-form Heading (D+)');
    ok(L.ui.length > 0 && L.ui.every((f) => /^"?DM Sans"?,/.test(f)), 'landing ' + w + ' px: ' + L.ui.length + ' buttons, tabs and level pills are DM Sans');
    await p.goto(pathToFileURL(path.join(ROOT, 'site/pitch-eligent/index.html')).href + (w === 1920 ? '?present' : ''), { waitUntil: 'load' });
    const d = await p.evaluate(async () => { await document.fonts.ready; return [...document.querySelectorAll('section h1,section h2')].map((h) => {
        const s = h.closest('.frame').clientWidth / 1920; return { cut: h.getAttribute('data-cut'), px: parseFloat(getComputedStyle(h).fontSize) * s, fam: getComputedStyle(h).fontFamily, cover: h.matches('#cover h1') }; }); });
    const cover = d.find((x) => x.cover), shown = d.filter((x) => x.px > 0);
    ok(cover && (wantCover === 'hero' ? cover.cut === 'hero' && /^"?Vault-form Hero/.test(cover.fam) : cover.cut !== 'hero'), 'pitch ' + w + ' px: cover title at ' + (cover ? Math.round(cover.px) : '?') + ' px uses ' + (cover && cover.cut) + (wantCover === 'hero' ? ' (want hero)' : ' (not hero below 96 px)'));
    ok(shown.every((x) => (x.cut === 'hero' ? x.px >= 96 && x.cover && /^"?Vault-form Hero/.test(x.fam) : /^"?Vault-form Heading/.test(x.fam))), 'pitch ' + w + ' px: every slide heading is D+, and D++ only on the cover from 96 px (' + shown.length + ' headings)');
    await ctx.close();
  }
  await b.close();

  // 5. brand book and handover
  const bk = rd('brand/vault-it-brand-book.html');
  ok(/--font-display:"Vault-form Heading"/.test(bk) && /Vault-form Heading 700/.test(bk) && /font:\{display:"Vault-form Heading"/.test(bk), 'brand book: display token, type specimen and the token export name Vault-form Heading');
  const ho = rd('brand/vault-it-brand-handover.md');
  ok(/\*\*Fonts stay:\*\* Vault-form/.test(ho) && !/fonts stay Syne/i.test(ho), 'handover: the fonts lines name Vault-form');
  const note = rd('NOTICE'); ok(/Vault-form/.test(note) && /PT Live Design/.test(note), 'NOTICE names Vault-form (PT Live Design, OFL)');

  console.log(fails ? 'FAILURES ' + fails : 'ALL OK'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('FAIL: ' + e.stack); process.exit(1); });
