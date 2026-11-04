// Founder e-mail kit for Pete Thickett, founder of PT Live Design and Vault-It. Draft only: nothing here sends anything.
// Builds, in this folder:
//   founder-footer.gif   the animated footer with both brands (560 x 120 shown, drawn at 2x)
//   founder-footer.png   its first frame (Outlook on Windows shows only frame one, so frame one is the finished still)
//   founder-email.html   the full template, images on https://vault-it.co (ready once the GIF is hosted there)
//   founder-email-preview.html   the same, with local images, to open from this folder
//   founder-signature.html       signature and footer only, to copy into a mail client
// Motion: the Vault-It dial ring turns a quarter turn around the fixed V (the brand book's motion), the brick catches the light,
// a spark runs down the divider, light sweeps across PT LIVE and its live dot pulses. Plays 3 times, then rests on the still.
// Run (Git Bash, repo root):  node docs/marketing/founder-email/build.js [--ptl-logo path/to/logo.svg|png] [--shots]
// Needs Chromium (Playwright's copy, or set CHROME=path) and network once for the Google Fonts files.
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const sharp = require('sharp');
const ROOT = path.resolve(__dirname, '../../..'), OUT = __dirname;
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const CHROME = process.env.CHROME || path.join(os.homedir(), 'AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe');
const W = 560, H = 120, SCALE = 2, N = 30;          // N motion steps; frame N is the rest state again

// ---------- the footer graphic ----------
const icon = fs.readFileSync(path.join(ROOT, 'brand/vault-it-logo-mark-mid.svg'), 'utf8').replace(/<metadata>[\s\S]*?<\/metadata>/, '')
  .replace(/(<g transform="rotate\(0 120 120\)">)/, '<g id="ring">$1').replace(/(<g transform="rotate\(270 120 120\)">.*?<\/g>)/, '$1</g>')
  .replace('<rect x="114" y="108"', '<rect id="brick" x="114" y="108"');
const logoPath = arg('--ptl-logo');
// PT Live Design look (owner's slide, 4 Nov): black and white with deep teal #006A80, bold wide capitals (Lexend), a white rule.
const PTL_TEAL = '#006A80';
let ptl = `<div class="ptw"><span id="sw">PT LIVE</span><span class="live"><i id="pulse"></i></span></div><div class="ptd">DESIGN</div><div class="ptr"></div>`;
if (logoPath) {
  const ext = path.extname(logoPath).slice(1).toLowerCase(), mime = ext === 'svg' ? 'image/svg+xml' : 'image/' + (ext === 'jpg' ? 'jpeg' : ext);
  ptl = `<div class="ptw"><img src="data:${mime};base64,${fs.readFileSync(logoPath).toString('base64')}" style="height:64px;width:auto;display:block" alt=""><span class="live"><i id="pulse"></i></span></div>`;
}
const frameHtml = `<!doctype html><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@800&family=Lexend:wght@700;800&display=block" rel="stylesheet">
<style>html,body{margin:0;width:${W}px;height:${H}px;background:#080D14;overflow:hidden}
#s{width:${W}px;height:${H}px;display:flex;align-items:center;justify-content:center;gap:26px}
.vi{display:flex;align-items:center;gap:12px}.ic{width:60px;height:60px}.ic svg{width:100%;height:100%;display:block}
.wm{font-family:'Syne';font-weight:800;font-size:34px;letter-spacing:-.02em;color:#E8E8E8;display:inline-flex;align-items:baseline;white-space:nowrap}
.wm b{font-weight:inherit;color:#44C0B9}.wm .dot{display:inline-block;width:.3em;height:.17em;background:#44C0B9;border-radius:2px;margin:0 .07em;transform:translateY(-.06em)}
.div{position:relative;width:1px;height:76px;background:#15302F}
#spark{position:absolute;left:-2px;top:0;width:5px;height:22px;border-radius:3px;background:linear-gradient(180deg,rgba(68,192,185,0),#44C0B9 50%,${PTL_TEAL});opacity:0}
.pt{font-family:'Lexend';text-transform:uppercase;white-space:nowrap}
.ptw{font-weight:800;font-size:27px;line-height:1;letter-spacing:.09em;display:flex;align-items:center;gap:10px}
#sw{background:linear-gradient(100deg,#fff 0 42%,#4FB3C6 50%,#fff 58% 100%);background-size:300% 100%;background-position:0% 0;-webkit-background-clip:text;background-clip:text;color:transparent}
.live{position:relative;width:10px;height:10px;border-radius:50%;background:${PTL_TEAL};box-shadow:0 0 0 1.5px #fff inset;flex:none}
#pulse{position:absolute;inset:-1px;border-radius:50%;border:2px solid ${PTL_TEAL};opacity:0}
.ptd{font-weight:800;font-size:27px;line-height:1;letter-spacing:.09em;color:${PTL_TEAL};margin-top:4px}
.ptr{height:2px;background:#fff;margin-top:8px;transform-origin:left;width:100%}</style>
<div id="s"><div class="vi"><span class="ic">${icon}</span><span class="wm">Vault<i class="dot"></i><b>It</b></span></div>
<div class="div"><i id="spark"></i></div><div class="pt">${ptl}</div></div>
<script>
const ease = (x) => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2, cl = (x) => Math.max(0, Math.min(1, x));
const mix = (a, b, k) => '#' + [0, 2, 4].map(i => Math.round(parseInt(a.substr(i, 2), 16) * (1 - k) + parseInt(b.substr(i, 2), 16) * k).toString(16).padStart(2, '0')).join('');
window.setFrame = (t) => {
  document.getElementById('ring').setAttribute('transform', 'rotate(' + 90 * ease(cl(t / .6)) + ' 120 120)');
  const g = cl((t - .45) / .35); document.getElementById('brick').setAttribute('fill', mix('E8C56A', 'FFF1BF', Math.sin(Math.PI * g)));
  const sp = document.getElementById('spark'); sp.style.top = (-22 + 98 * ease(t)) + 'px'; sp.style.opacity = Math.sin(Math.PI * t).toFixed(3);
  const sw = document.getElementById('sw'); if (sw) sw.style.backgroundPosition = (100 * ease(cl((t - .2) / .65))) + '% 0';
  const ph = (t * 2) % 1, pu = document.getElementById('pulse');
  pu.style.transform = 'scale(' + (1 + 1.6 * ph) + ')'; pu.style.opacity = (0.8 * (1 - ph) * Math.min(1, ph * 6)).toFixed(3);
};
</script>`;

// ---------- the e-mail (same shell and inline styles as docs/marketing/build_emails.js) ----------
const F_D = "'Syne','Helvetica Neue',Helvetica,Arial,sans-serif", F_B = "'DM Sans','Helvetica Neue',Helvetica,Arial,sans-serif", F_M = "'Share Tech Mono',Menlo,Consolas,'Courier New',monospace";
const EYEBROW = `margin:0 0 8px;font-family:${F_M};font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#44C0B9`;
const H1 = `margin:0 0 14px;font-family:${F_D};font-size:22px;font-weight:800;line-height:1.25;color:#E8E8E8`;
const P = 'margin:0 0 16px;font-size:15px;line-height:1.6;color:#9AA0A6';
const SMALL = 'margin:0 0 6px;font-size:12px;line-height:1.6;color:#9AA0A6';
const BTN = `display:inline-block;background:#E8C56A;color:#1A1400;text-decoration:none;font-family:${F_D};font-weight:700;font-size:13px;letter-spacing:.14em;text-transform:uppercase;padding:15px 24px;border-radius:12px`;
const A = 'color:#44C0B9;text-decoration:none';
const link = (h, t) => `<a href="${h}" style="${A}">${t}</a>`;
function signature(img) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0"><tr>
<td valign="middle" style="padding:0 14px 0 0"><img src="${img.photo}" width="64" height="64" alt="Pete Thickett" style="display:block;border:0;width:64px;height:64px;border-radius:50%;border:2px solid #15302F"></td>
<td valign="middle" style="font-family:${F_B}">
<p style="margin:0 0 2px;font-family:${F_D};font-size:17px;font-weight:800;color:#E8E8E8">Pete Thickett</p>
<p style="margin:0 0 6px;font-size:13px;line-height:1.4;color:#9AA0A6">Founder, <span style="white-space:nowrap">PT Live Design</span> and <span style="white-space:nowrap">Vault-It</span></p>
<p style="margin:0;font-family:${F_M};font-size:12px;letter-spacing:.04em;line-height:1.7"><span style="white-space:nowrap">${link('https://vault-it.co', 'vault-it.co')}<span style="color:#2D8882"> &middot;</span></span> <span style="white-space:nowrap">${link('mailto:hello@vault-it.co', 'hello@vault-it.co')}</span></p>
</td></tr></table>`;
}
function footer(img) {
  return `<a href="https://vault-it.co" style="text-decoration:none;display:block"><img src="${img.gif}" width="${W}" alt="Vault-It and PT Live Design" style="display:block;border:0;outline:none;width:100%;max-width:${W}px;height:auto;background:#080D14;color:#9AA0A6;font-family:${F_B};font-size:13px"></a>`;
}
const legal = `<p style="${SMALL}"><span style="color:#E8E8E8">Get out of the red and into your home.</span></p>
<p style="${SMALL}">Vault-It is run by PT Live Design, A57, 11 St Mary&#39;s Street, Lincoln LN5 7EQ.</p>
<p style="${SMALL}">Not regulated by the FCA. Not financial advice.</p>`;
function email(img) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>{{Subject line}}</title></head>
<body style="margin:0;padding:0;background:#080808;color:#E8E8E8;font-family:${F_B}">
<!-- Founder template. Replace every {{...}}. For a one-to-one e-mail delete the unsubscribe line; for a list send keep it and give it your provider's unsubscribe link. -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#080808">{{Preview text, about 90 characters}}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:36px 16px"><tr><td align="center">
<table role="presentation" width="${W}" cellpadding="0" cellspacing="0" style="background:#080D14;border:1px solid #15302F;border-radius:18px;max-width:${W}px;width:100%;overflow:hidden">
<tr><td style="height:3px;line-height:3px;font-size:0;background:#44C0B9;background-image:linear-gradient(90deg,#44C0B9,#34F5D8)">&nbsp;</td></tr>
<tr><td style="padding:30px 32px 6px">
<p style="${EYEBROW}">From the founder</p>
<h1 style="${H1}">{{Headline}}</h1>
<p style="${P}">Hi {{first name}},</p>
<p style="${P}">{{Your message. One idea and one ask works best.}}</p>
<p style="${P}">{{Second paragraph, if you need it.}}</p>
<!-- Optional button: delete this row if the e-mail has no call to action -->
<p style="margin:8px 0 24px"><a href="{{https://app.vault-it.co}}" style="${BTN}">{{Open Vault-It}}</a></p>
<p style="${P};margin-bottom:18px">Thanks,</p>
${signature(img)}
</td></tr>
<tr><td style="padding:26px 0 0">${footer(img)}</td></tr>
<tr><td style="padding:18px 32px 26px;border-top:1px solid #15302F">
${legal}
<p style="${SMALL}">{{Unsubscribe line for list sends: You are getting this because you joined the Vault-It beta. <a href="{{unsubscribe_url}}" style="${A}">Unsubscribe</a>.}}</p>
</td></tr></table></td></tr></table></body></html>`;
}
function signatureOnly(img) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Founder signature</title></head>
<body style="margin:0;padding:24px;background:#080808;font-family:${F_B}">
<!-- To use: open this file in a browser, select from the photo to the last line, copy, and paste into your mail client's signature box. Images load from vault-it.co. -->
<table role="presentation" width="${W}" cellpadding="0" cellspacing="0" style="background:#080D14;border:1px solid #15302F;border-radius:14px;max-width:${W}px;width:100%;overflow:hidden">
<tr><td style="padding:22px 24px 18px">${signature(img)}</td></tr>
<tr><td style="padding:0">${footer(img)}</td></tr>
<tr><td style="padding:12px 24px 16px;border-top:1px solid #15302F">${legal}</td></tr>
</table></body></html>`;
}

// ---------- Chromium over the DevTools protocol (no Playwright module needed) ----------
async function browser() {
  const port = 9400 + Math.floor(Math.random() * 400), ud = fs.mkdtempSync(path.join(os.tmpdir(), 'founder-email-'));
  const ch = cp.spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + ud, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  let page;
  for (let i = 0; i < 60 && !page; i++) { try { page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(x => x.type === 'page'); } catch {} if (!page) await new Promise(r => setTimeout(r, 250)); }
  if (!page) throw new Error('Chromium did not start: ' + CHROME);
  const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const pend = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); const p = d.id && pend.get(d.id); if (p) { pend.delete(d.id); d.error ? p.j(new Error(d.error.message)) : p.r(d.result); } };
  const send = (method, params = {}) => new Promise((r, j) => { const i = ++id; pend.set(i, { r, j }); ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result.value;
  const open = async (file, w, h) => {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: SCALE, mobile: w < 600 });
    await send('Page.navigate', { url: 'file:///' + file.replace(/\\/g, '/') });
    for (let i = 0; i < 80; i++) { if (await evaluate("document.readyState==='complete'")) break; await new Promise(r => setTimeout(r, 100)); }
    await evaluate('document.fonts.ready.then(()=>true)');
  };
  const shot = async (w, h) => Buffer.from((await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: w, height: h, scale: 1 }, captureBeyondViewport: true })).data, 'base64');
  return { send, evaluate, open, shot, close: () => { ws.close(); ch.kill(); try { fs.rmSync(ud, { recursive: true, force: true }); } catch {} } };
}

(async () => {
  const b = await browser();
  try {
    const tmp = path.join(os.tmpdir(), 'founder-footer-frame.html'); fs.writeFileSync(tmp, frameHtml);
    await b.open(tmp, W, H);
    const fonts = await b.evaluate(`["800 34px Syne","800 27px Lexend"].map(f=>document.fonts.check(f))`);
    if (fonts.includes(false)) throw new Error('A font did not load (Syne, Lexend): ' + fonts);
    const frames = [];
    for (let i = 0; i <= N; i++) { await b.evaluate(`setFrame(${i / N})`); frames.push(await b.shot(W, H)); }
    fs.writeFileSync(path.join(OUT, 'founder-footer.png'), frames[0]);
    const delay = frames.map((_, i) => i === 0 ? 2600 : i === N ? 200 : 50);   // ms; frame 0 is the long still
    await sharp(frames, { join: { animated: true } }).gif({ delay, loop: 3, colours: 128, effort: 8, dither: 0, interFrameMaxError: 2 }).toFile(path.join(OUT, 'founder-footer.gif'));
    const kb = (f) => Math.round(fs.statSync(path.join(OUT, f)).size / 1024) + ' KB';
    console.log('founder-footer.gif', kb('founder-footer.gif'), `${N + 1} frames, ${W * SCALE}x${H * SCALE}`);
    const hosted = { gif: 'https://vault-it.co/email/founder-footer.gif', photo: 'https://vault-it.co/img/founder.jpg' };
    const local = { gif: 'founder-footer.gif', photo: '../../../site/founder.jpg' };
    fs.writeFileSync(path.join(OUT, 'founder-email.html'), email(hosted));
    fs.writeFileSync(path.join(OUT, 'founder-email-preview.html'), email(local));
    fs.writeFileSync(path.join(OUT, 'founder-signature.html'), signatureOnly(hosted));
    console.log('founder-email.html, founder-email-preview.html, founder-signature.html');
    if (process.argv.includes('--shots')) {                 // previews at phone and desktop width, into shots/ (git-ignored)
      const sd = path.join(ROOT, 'shots/founder-email'); fs.mkdirSync(sd, { recursive: true });
      for (const w of [390, 1100]) {
        await b.open(path.join(OUT, 'founder-email-preview.html'), w, 900);
        const h = await b.evaluate('document.documentElement.scrollHeight');
        await b.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 });
        fs.writeFileSync(path.join(sd, `email-${w}.png`), await b.shot(w, h));
      }
      for (const [i, t] of [[0, 0], [1, .3], [2, .55], [3, .75]]) { await b.open(tmp, W, H); await b.evaluate(`setFrame(${t})`); fs.writeFileSync(path.join(sd, `footer-t${i}.png`), await b.shot(W, H)); }
      console.log('shots in shots/founder-email/');
    }
  } finally { b.close(); }
})().catch((e) => { console.error(e.message); process.exit(1); });
