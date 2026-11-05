// vault-it.co/pete in a real browser, through the real Worker routing from the real build: the digital business card
// the printed card's QR code and NFC chip open. It flips like the app's debt tracker cards (tap or the Flip button turns it,
// dragging turns it in 3D), shows a corner of the house builder animation on the front, saves a contact card, and stays on brand.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http'), cp = require('child_process'), { pathToFileURL } = require('url');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const ROOT = path.join(__dirname, '..'), DIST = fs.mkdtempSync(path.join(require('os').tmpdir(), 'vaultit-pete-'));

(async () => {
  cp.execFileSync('node', [path.join(ROOT, 'tools', 'build_site.js')], { env: { ...process.env, SITE_OUT: DIST }, stdio: ['ignore', 'ignore', 'inherit'] });
  const { route } = await import(pathToFileURL(path.join(ROOT, 'worker', 'index.mjs')).href);
  const TYPES = { '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4', '.js': 'text/javascript' };
  const srv = http.createServer((req, res) => {
    const r = route('vault-it.co', new URL(req.url, 'http://x').pathname); const f = r.file && path.join(DIST, r.file);
    if (!f || !fs.existsSync(f)) { res.writeHead(404); return res.end('nf'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f));
  }).listen(0);
  const BASE = 'http://127.0.0.1:' + srv.address().port;
  const b = await chromium.launch();
  const open = async (w, h, opts = {}) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, acceptDownloads: true, ...opts });
    const p = await ctx.newPage(); p.errs = []; p.hosts = new Set();
    p.on('pageerror', (e) => p.errs.push(e.message));
    p.on('request', (r) => { const u = new URL(r.url()); if (u.hostname !== '127.0.0.1') p.hosts.add(u.hostname); });
    const resp = await p.goto(BASE + '/pete', { waitUntil: 'load' }); p.status = resp.status(); await p.waitForTimeout(400); return p;
  };
  const ry = (p) => p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.pc-body')).getPropertyValue('--ry')) || 0);
  const facing = (p) => p.evaluate(() => { const y = parseFloat(getComputedStyle(document.querySelector('.pc-body')).getPropertyValue('--ry')) || 0; const a = ((y % 360) + 360) % 360; return a > 90 && a < 270 ? 'back' : 'front'; });

  // Phone
  let p = await open(390, 844, { hasTouch: true, isMobile: true });
  ok(p.status === 200, 'vault-it.co/pete serves the card page');
  ok(await p.locator('.pc').count() === 1, 'there is one card');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll on a phone');
  const cb = await p.locator('.pc').boundingBox();
  ok(cb && Math.abs(cb.width / cb.height - 85 / 55) < 0.03 && cb.width <= 390 - 32, 'the card is business-card shaped and fits the phone with a gutter: ' + JSON.stringify(cb));
  ok(await facing(p) === 'front', 'it starts on the front');
  const front = await p.evaluate(() => document.querySelector('.pc-front').innerText);
  ok(/Get out of the red and into your home\./.test(front), 'the front carries the tagline');
  { const ne = await p.evaluate(() => { const r = document.querySelector('.pc-front .vi-neon-red'), g = document.querySelector('.pc-front .vi-neon-gold'); if (!r || !g) return null;
      const s = (el) => getComputedStyle(el, '::before'); return { r: r.textContent, g: g.textContent, clipR: s(r).webkitBackgroundClip || s(r).backgroundClip, clipG: s(g).webkitBackgroundClip || s(g).backgroundClip, grad: /gradient/.test(s(g).backgroundImage) }; });
    ok(ne && ne.r === 'red' && ne.g === 'home' && /text/.test(ne.clipR) && /text/.test(ne.clipG) && ne.grad, 'the tagline draws red in neon red and home in a gold gradient neon: ' + JSON.stringify(ne)); }
  const v = await p.evaluate(() => { const el = document.querySelector('.pc-front .pc-corner video'); if (!el) return null;
    const box = el.parentNode.getBoundingClientRect(), card = document.querySelector('.pc-front').getBoundingClientRect();
    return { src: el.currentSrc || el.getAttribute('src'), muted: el.muted, loop: el.loop, inline: el.playsInline,
      right: Math.abs(box.right - card.right) < 2, bottom: Math.abs(box.bottom - card.bottom) < 2, wFrac: box.width / card.width, hFrac: box.height / card.height }; });
  ok(v && /\/pete\/house-corner\.mp4$/.test(v.src) && v.muted && v.loop && v.inline, 'the front plays the house builder animation, muted and looping: ' + JSON.stringify(v));
  ok(v && v.right && v.bottom && v.wFrac < 0.5 && v.hFrac < 0.65, 'only a corner of the house shows, in the bottom right of the front');
  ok(await p.locator('.pc-front .bricks, .pc-front .pc-bricks').count() === 0, 'no brick pattern on the front');
  await p.locator('.pc').tap(); await p.waitForTimeout(700);
  ok(await facing(p) === 'back', 'tapping the card flips it to the back');
  const back = await p.evaluate(() => document.querySelector('.pc-back').innerText);
  ok(/Pete Thickett/.test(back) && /Founder/i.test(back) && /pete@ptlive\.design/.test(back) && /vault-it\.co/.test(back), 'the back shows name, role, email and website');
  ok(!/\[mobile\]|\[linkedin/i.test(back), 'no placeholder text is published');
  ok(/\+44 7470 074133/.test(back) && /linkedin\.com\/in\/ptlivedesign/.test(back), 'the back shows the mobile and LinkedIn');
  ok(await p.locator('.pc-back a[href="tel:+447470074133"]').count() === 1 && await p.locator('.pc-back a[href="https://www.linkedin.com/in/ptlivedesign/"]').count() === 1, 'mobile and LinkedIn are tappable');
  ok(await p.evaluate(() => { const i = document.querySelector('.pc-pub img'); return !!i && i.complete && i.naturalWidth > 50; }), 'the PT Live Design icon shows in Published by');
  ok(await p.locator('.pc-back svg.pc-qr').count() === 1, 'the back carries the QR code');
  await p.locator('#pc-flip').tap(); await p.waitForTimeout(700);
  ok(await facing(p) === 'front', 'the Flip button turns it back over');
  ok(/Not regulated by the FCA\. Not financial advice\./i.test(await p.evaluate(() => document.body.innerText)), 'the FCA line is visible');
  ok(!/—/.test(await p.content()), 'no em dashes');

  // Laptop: drag to turn it in 3D, like the debt tracker
  p = await open(1280, 800);
  const box = await p.locator('.pc').boundingBox(); const y0 = await ry(p);
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down();
  await p.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2, { steps: 6 });
  const mid = await ry(p); await p.mouse.up(); await p.waitForTimeout(600);
  ok(mid - y0 > 20, 'dragging turns the card in 3D: ' + y0 + ' to ' + mid);
  const settled = await ry(p);
  ok(Math.abs(((settled % 180) + 180) % 180) < 1 || Math.abs(settled - y0) < 1, 'letting go settles it on a face: ' + settled);
  await p.keyboard.press('Tab');
  const dl = p.waitForEvent('download', { timeout: 5000 }).catch(() => null);
  await p.locator('#pc-save').click(); const d = await dl;
  let vcf = ''; if (d) vcf = fs.readFileSync(await d.path(), 'utf8');
  ok(d && /\.vcf$/.test(d.suggestedFilename()), 'Save contact downloads a contact card: ' + (d && d.suggestedFilename()));
  ok(/TEL[^:]*:\+447470074133/.test(vcf) && /URL;TYPE=LinkedIn:https:\/\/www\.linkedin\.com\/in\/ptlivedesign\//.test(vcf), 'the contact card holds the mobile and LinkedIn');
  ok(/BEGIN:VCARD/.test(vcf) && /FN:Pete Thickett/.test(vcf) && /EMAIL[^:]*:pete@ptlive\.design/.test(vcf) && /URL[^:]*:https:\/\/vault-it\.co/.test(vcf), 'the contact card holds the right details');
  ok(await p.locator('a[href="/pitch-Eligent"]').count() >= 1 && await p.locator('a[href^="/sign-up"], a[href="/"]').count() >= 1, 'links to the pitch deck and the beta sign-up');
  ok([...p.hosts].every((h) => /^fonts\.(googleapis|gstatic)\.com$/.test(h)), 'no outside hosts besides Google Fonts: ' + [...p.hosts]);
  ok(p.errs.length === 0, 'no page errors: ' + p.errs.join(' | '));

  // Reduced motion: a still instead of the animation
  p = await open(390, 844, { reducedMotion: 'reduce' });
  await p.waitForTimeout(1200);
  const rm = await p.evaluate(() => { const vd = document.querySelector('.pc-corner video'), im = document.querySelector('.pc-corner img');
    return { videoShown: !!vd && getComputedStyle(vd).display !== 'none', loaded: !!vd && (vd.readyState > 0 || !!vd.currentSrc), still: !!im && im.complete && im.naturalWidth > 100 && /house-corner\.jpg$/.test(im.src) && getComputedStyle(im).display !== 'none' }; });
  ok(!rm.videoShown && !rm.loaded && rm.still, 'with reduced motion the corner shows the 37% still and the film never loads: ' + JSON.stringify(rm));

  await b.close(); srv.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL OK'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('FAIL:', e.message); process.exit(1); });
