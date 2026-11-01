// Draws the e-mail logo from the brand book's own pieces: the mid icon (brand/vault-it-logo-mark-mid.svg) and the wordmark
// (Syne 800, Vault, brick, teal It; brick .3em by .17em, margin .07em, lifted .06em, as in the brand book's .wm).
// Mail clients cannot load Syne, so the lockup goes out as a picture. Needs network once, for the Syne file from Google Fonts.
// Run: node tools/build_email_lockup.js   -> site/email/lockup.png (3x, transparent), served at https://vault-it.co/email/lockup.png
const { chromium } = require('playwright'); const fs = require('fs');
const icon = fs.readFileSync(__dirname + '/../brand/vault-it-logo-mark-mid.svg', 'utf8').replace(/<metadata>[\s\S]*?<\/metadata>/, '');
const html = `<!doctype html><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Syne:wght@800&display=block" rel="stylesheet">
<style>html,body{margin:0;background:transparent}
.lockup{display:inline-flex;align-items:center;gap:12px;padding:0}
.ic{width:52px;height:52px;display:block}.ic svg{width:100%;height:100%;display:block}
.wm{font-family:'Syne',sans-serif;font-weight:800;font-size:40px;letter-spacing:-.02em;white-space:nowrap;display:inline-flex;align-items:baseline;color:#E8E8E8}
.wm b{font-weight:inherit;color:#44C0B9}
.wm .dot{display:inline-block;width:.3em;height:.17em;background:#44C0B9;border-radius:2px;margin:0 .07em;transform:translateY(-.06em)}</style>
<span class="lockup" id="l"><span class="ic">${icon}</span><span class="wm">Vault<i class="dot"></i><b>It</b></span></span>`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ deviceScaleFactor: 3, viewport: { width: 600, height: 120 } });
  await p.setContent(html, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
  const ok = await p.evaluate(() => document.fonts.check("800 40px Syne")); if (!ok) { console.error('Syne did not load'); process.exit(1); }
  fs.mkdirSync(__dirname + '/../site/email', { recursive: true });
  const el = await p.$('#l'); await el.screenshot({ path: __dirname + '/../site/email/lockup.png', omitBackground: true });
  const bb = await el.boundingBox(); console.log('site/email/lockup.png', Math.round(bb.width) + 'x' + Math.round(bb.height) + ' css px, 3x'); await b.close();
})();
