// Draws the e-mail logo from the brand book's own pieces: the mid icon (brand/vault-it-logo-mark-mid.svg) and the wordmark
// (Syne 800, Vault, brick, teal It; brick .3em by .17em, margin .07em, lifted .06em, as in the brand book's .wm).
// Mail clients cannot load Syne, so the lockup goes out as a picture. Needs network once, for the Syne file from Google Fonts.
// Also site/email/lockup.gif: the brand book's own motion (its dial ring turns a quarter turn around a fixed V; the V is never rotated).
// Frame 1 is the finished still (Outlook desktop shows only frame one), it plays twice, then rests on the still. Baked onto the panel colour #080D14.
// Run: node tools/build_email_lockup.js   -> site/email/lockup.png (3x, transparent) and lockup.gif; served at https://vault-it.co/email/
const { chromium } = require('playwright'); const fs = require('fs');
const icon = fs.readFileSync(__dirname + '/../brand/vault-it-logo-mark-mid.svg', 'utf8').replace(/<metadata>[\s\S]*?<\/metadata>/, '');
const withTicks = icon.replace(/(<g transform="rotate\(0 120 120\)">)/, '<g id="ring">$1').replace(/(<g transform="rotate\(270 120 120\)">.*?<\/g>)/, '$1</g>');
const html = (bg) => `<!doctype html><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Syne:wght@800&display=block" rel="stylesheet">
<style>html,body{margin:0;background:${bg}}
.lockup{display:inline-flex;align-items:center;gap:12px;padding:0}
.ic{width:52px;height:52px;display:block}.ic svg{width:100%;height:100%;display:block}
.wm{font-family:'Syne',sans-serif;font-weight:800;font-size:40px;letter-spacing:-.02em;white-space:nowrap;display:inline-flex;align-items:baseline;color:#E8E8E8}
.wm b{font-weight:inherit;color:#44C0B9}
.wm .dot{display:inline-block;width:.3em;height:.17em;background:#44C0B9;border-radius:2px;margin:0 .07em;transform:translateY(-.06em)}</style>
<span class="lockup" id="l"><span class="ic">${withTicks}</span><span class="wm">Vault<i class="dot"></i><b>It</b></span></span>`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ deviceScaleFactor: 3, viewport: { width: 600, height: 120 } });
  await p.setContent(html('transparent'), { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
  const ok = await p.evaluate(() => document.fonts.check("800 40px Syne")); if (!ok) { console.error('Syne did not load'); process.exit(1); }
  fs.mkdirSync(__dirname + '/../site/email', { recursive: true });
  const el = await p.$('#l'); await el.screenshot({ path: __dirname + '/../site/email/lockup.png', omitBackground: true });
  const bb = await el.boundingBox(); 
  // animated version, on the panel colour
  await p.setContent(html('#080D14'), { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
  const fd = __dirname + '/../shots/qc/lockup-frames'; fs.rmSync(fd, { recursive: true, force: true }); fs.mkdirSync(fd, { recursive: true });
  const steps = 14, ease = (t) => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const angles = [0, ...Array.from({ length: steps }, (_, i) => 90 * ease((i + 1) / steps))];   // the last frame, 90 degrees, looks exactly like the first
  const el2 = await p.$('#l');
  for (let i = 0; i < angles.length; i++) { await p.evaluate((a) => { document.getElementById('ring').setAttribute('transform', 'rotate(' + a + ' 120 120)'); }, angles[i]); await el2.screenshot({ path: fd + '/f' + String(i).padStart(2, '0') + '.png' }); }
  const cp = require('child_process'); const delays = angles.map((_, i) => i === 0 ? 150 : i === angles.length - 1 ? 150 : 7);   // centiseconds
  const args = []; angles.forEach((_, i) => args.push('-delay', String(delays[i]), fd + '/f' + String(i).padStart(2, '0') + '.png'));
  cp.execFileSync('convert', [...args, '-resize', '380x', '-colors', '48', '-layers', 'OptimizePlus', '-loop', '2', __dirname + '/../site/email/lockup.gif']);
  console.log('site/email/lockup.gif', Math.round(fs.statSync(__dirname + '/../site/email/lockup.gif').size / 1024) + ' KB');
  console.log('site/email/lockup.png', Math.round(bb.width) + 'x' + Math.round(bb.height) + ' css px, 3x'); await b.close();
})();
