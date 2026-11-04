// E-mail kit for Pete Thickett: founder of PT Live Design and Vault-It. Draft only: nothing here sends anything.
// Three footers (animated GIF, 560 x 120 shown, drawn at 2x) and the signature that goes with each:
//   founder           both brands, for ptlived@gmail.com and pete@ptlive.design       -> founder-signature.html
//   vault-it-founder  Vault-It, "From the founder", for pete@vault-it.co              -> vault-it-founder-signature.html
//   vault-it          Vault-It, "The Vault-It team", for hello@vault-it.co            -> hello-signature.html
// plus founder-email.html, the full founder template (and -preview.html with local images).
// Images go to ../email-media/public/ and are served at https://media.vault-it.co (deploy: see ../email-media/README.md).
// Motion: the Vault-It dial ring turns a quarter turn around the fixed V (the brand book's motion), the brick catches the light,
// a spark runs down the divider, light sweeps across the right-hand words and the PT Live dot pulses. Frame one is the finished
// still (Outlook on Windows shows only frame one); plays 3 times, then rests.
// Run (Git Bash, repo root):  node docs/marketing/founder-email/build.js [--ptl-logo path/to/logo.svg|png] [--shots]
// Needs Chromium (Playwright's copy, or set CHROME=path) and network once for the Google Fonts files.
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const sharp = require('sharp');
const ROOT = path.resolve(__dirname, '../../..'), OUT = __dirname, MEDIA = path.resolve(__dirname, '../email-media/public');
const MEDIA_URL = 'https://media.vault-it.co/';
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const CHROME = process.env.CHROME || path.join(os.homedir(), 'AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe');
const W = 560, H = 120, SCALE = 2, N = 30;          // N motion steps; frame N is the rest state again

// ---------- footer graphics ----------
const icon = fs.readFileSync(path.join(ROOT, 'brand/vault-it-logo-mark-mid.svg'), 'utf8').replace(/<metadata>[\s\S]*?<\/metadata>/, '')
  .replace(/(<g transform="rotate\(0 120 120\)">)/, '<g id="ring">$1').replace(/(<g transform="rotate\(270 120 120\)">.*?<\/g>)/, '$1</g>')
  .replace('<rect x="114" y="108"', '<rect id="brick" x="114" y="108"');
// PT Live Design look (owner's slide, 4 Nov): black and white with deep teal #006A80, bold wide capitals (Lexend), a white rule.
const PTL_TEAL = '#006A80';
const logoPath = arg('--ptl-logo');
let ptl = `<div class="pt"><div class="ptw"><span id="sw">PT LIVE</span><span class="live"><i id="pulse"></i></span></div><div class="ptd">DESIGN</div><div class="ptr"></div></div>`;
if (logoPath) {
  const ext = path.extname(logoPath).slice(1).toLowerCase(), mime = ext === 'svg' ? 'image/svg+xml' : 'image/' + (ext === 'jpg' ? 'jpeg' : ext);
  ptl = `<div class="pt"><div class="ptw"><img src="data:${mime};base64,${fs.readFileSync(logoPath).toString('base64')}" style="height:64px;width:auto;display:block" alt=""><span class="live"><i id="pulse"></i></span></div></div>`;
}
const tagline = (eyebrow, colour) => `<div class="tg"><div class="eb" style="color:${colour}">${eyebrow}</div><div class="tg1">Get out of the red</div><div class="tg2"><span id="sw" class="swt">and into your home.</span></div></div>`;
const FOOTERS = {
  'founder': { right: ptl, alt: 'Vault-It and PT Live Design' },
  'vault-it-founder': { right: tagline('From the founder', '#E8C56A'), alt: 'Vault-It. Get out of the red and into your home.' },
  'vault-it': { right: tagline('The Vault-It team', '#44C0B9'), alt: 'Vault-It. Get out of the red and into your home.' },
};
const frameHtml = (right) => `<!doctype html><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@800&family=Lexend:wght@800&family=Share+Tech+Mono&display=block" rel="stylesheet">
<style>html,body{margin:0;width:${W}px;height:${H}px;background:#080D14;overflow:hidden}
#s{width:${W}px;height:${H}px;display:flex;align-items:center;justify-content:center;gap:26px}#s:has(.tg){gap:20px}
.vi{display:flex;align-items:center;gap:12px}.ic{width:60px;height:60px}.ic svg{width:100%;height:100%;display:block}
.wm{font-family:'Syne';font-weight:800;font-size:34px;letter-spacing:-.02em;color:#E8E8E8;display:inline-flex;align-items:baseline;white-space:nowrap}
.wm b{font-weight:inherit;color:#44C0B9}.wm .dot{display:inline-block;width:.3em;height:.17em;background:#44C0B9;border-radius:2px;margin:0 .07em;transform:translateY(-.06em)}
.div{position:relative;width:1px;height:76px;background:#15302F}
#spark{position:absolute;left:-2px;top:0;width:5px;height:22px;border-radius:3px;background:linear-gradient(180deg,rgba(68,192,185,0),#44C0B9 50%,${PTL_TEAL});opacity:0}
.pt{font-family:'Lexend';text-transform:uppercase;white-space:nowrap}
.ptw{font-weight:800;font-size:27px;line-height:1;letter-spacing:.09em;display:flex;align-items:center;gap:10px}
#sw{background:linear-gradient(100deg,#fff 0 42%,#4FB3C6 50%,#fff 58% 100%);background-size:300% 100%;background-position:0% 0;-webkit-background-clip:text;background-clip:text;color:transparent}
#sw.swt{background-image:linear-gradient(100deg,#44C0B9 0 42%,#E8FFFD 50%,#44C0B9 58% 100%)}
.live{position:relative;width:10px;height:10px;border-radius:50%;background:${PTL_TEAL};box-shadow:0 0 0 1.5px #fff inset;flex:none}
#pulse{position:absolute;inset:-1px;border-radius:50%;border:2px solid ${PTL_TEAL};opacity:0}
.ptd{font-weight:800;font-size:27px;line-height:1;letter-spacing:.09em;color:${PTL_TEAL};margin-top:4px}
.ptr{height:2px;background:#fff;margin-top:8px;width:100%}
.tg{font-family:'Syne';font-weight:800;font-size:15px;line-height:1.2;letter-spacing:-.01em;white-space:nowrap}
.eb{font-family:'Share Tech Mono';font-weight:400;font-size:11px;letter-spacing:.16em;text-transform:uppercase;margin-bottom:6px}
.tg1{color:#E8E8E8}</style>
<div id="s"><div class="vi"><span class="ic">${icon}</span><span class="wm">Vault<i class="dot"></i><b>It</b></span></div>
<div class="div"><i id="spark"></i></div>${right}</div>
<script>
const ease = (x) => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2, cl = (x) => Math.max(0, Math.min(1, x));
const mix = (a, b, k) => '#' + [0, 2, 4].map(i => Math.round(parseInt(a.substr(i, 2), 16) * (1 - k) + parseInt(b.substr(i, 2), 16) * k).toString(16).padStart(2, '0')).join('');
window.setFrame = (t) => {
  document.getElementById('ring').setAttribute('transform', 'rotate(' + 90 * ease(cl(t / .6)) + ' 120 120)');
  const g = cl((t - .45) / .35); document.getElementById('brick').setAttribute('fill', mix('E8C56A', 'FFF1BF', Math.sin(Math.PI * g)));
  const sp = document.getElementById('spark'); sp.style.top = (-22 + 98 * ease(t)) + 'px'; sp.style.opacity = Math.sin(Math.PI * t).toFixed(3);
  const sw = document.getElementById('sw'); if (sw) sw.style.backgroundPosition = (100 * ease(cl((t - .2) / .65))) + '% 0';
  const pu = document.getElementById('pulse'); if (pu) { const ph = (t * 2) % 1;
    pu.style.transform = 'scale(' + (1 + 1.6 * ph) + ')'; pu.style.opacity = (0.8 * (1 - ph) * Math.min(1, ph * 6)).toFixed(3); }
};
</script>`;

// ---------- e-mail pieces (same shell and inline styles as docs/marketing/build_emails.js) ----------
const F_D = "'Syne','Helvetica Neue',Helvetica,Arial,sans-serif", F_B = "'DM Sans','Helvetica Neue',Helvetica,Arial,sans-serif", F_M = "'Share Tech Mono',Menlo,Consolas,'Courier New',monospace";
const EYEBROW = `margin:0 0 8px;font-family:${F_M};font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#44C0B9`;
const H1 = `margin:0 0 14px;font-family:${F_D};font-size:22px;font-weight:800;line-height:1.25;color:#E8E8E8`;
const P = 'margin:0 0 16px;font-size:15px;line-height:1.6;color:#9AA0A6';
const SMALL = 'margin:0 0 6px;font-size:12px;line-height:1.6;color:#9AA0A6';
const BTN = `display:inline-block;background:#E8C56A;color:#1A1400;text-decoration:none;font-family:${F_D};font-weight:700;font-size:13px;letter-spacing:.14em;text-transform:uppercase;padding:15px 24px;border-radius:12px`;
const A = 'color:#44C0B9;text-decoration:none';
const nw = (t) => `<span style="white-space:nowrap">${t}</span>`;
const link = (h, t) => `<a href="${h}" style="${A}">${t}</a>`;
const links = (items) => `<p style="margin:0;font-family:${F_M};font-size:12px;letter-spacing:.04em;line-height:1.7">` +
  items.map(([h, t], i) => nw(link(h, t) + (i < items.length - 1 ? '<span style="color:#2D8882"> &middot;</span>' : ''))).join(' ') + '</p>';
// Who signs: name line, role line, links. photo: true shows the founder photo.
const PEOPLE = {
  'founder': { photo: true, name: 'Pete Thickett', role: `Founder, ${nw('PT Live Design')} and ${nw('Vault-It')}`,
    links: [['https://ptlive.design', 'ptlive.design'], ['https://vault-it.co', 'vault-it.co']] },
  'vault-it-founder': { photo: true, name: 'Pete Thickett', role: `Founder, ${nw('Vault-It')}`,
    links: [['https://vault-it.co', 'vault-it.co'], ['mailto:pete@vault-it.co', 'pete@vault-it.co']] },
  'vault-it': { photo: false, name: 'The Vault-It team', role: 'Questions, feedback and help with the app',
    links: [['https://app.vault-it.co', 'app.vault-it.co'], ['mailto:hello@vault-it.co', 'hello@vault-it.co']] },
};
function signature(who, img) {
  const p = PEOPLE[who];
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0"><tr>
${p.photo ? `<td valign="middle" style="padding:0 14px 0 0"><img src="${img('founder.jpg')}" width="64" height="64" alt="Pete Thickett" style="display:block;border:0;width:64px;height:64px;border-radius:50%;border:2px solid #15302F"></td>` : ''}
<td valign="middle" style="font-family:${F_B}">
<p style="margin:0 0 2px;font-family:${F_D};font-size:17px;font-weight:800;color:#E8E8E8">${p.name}</p>
<p style="margin:0 0 6px;font-size:13px;line-height:1.4;color:#9AA0A6">${p.role}</p>
${links(p.links)}
</td></tr></table>`;
}
const footer = (who, img) => `<a href="https://vault-it.co" style="text-decoration:none;display:block"><img src="${img(who + '-footer.gif')}" width="${W}" alt="${FOOTERS[who].alt}" style="display:block;border:0;outline:none;width:100%;max-width:${W}px;height:auto;background:#080D14;color:#9AA0A6;font-family:${F_B};font-size:13px"></a>`;
const legal = `<p style="${SMALL}">Vault-It is run by PT Live Design, A57, 11 St Mary&#39;s Street, Lincoln LN5 7EQ.</p>
<p style="${SMALL}">Not regulated by the FCA. Not financial advice.</p>`;
function email(img) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>{{Subject line}}</title></head>
<body style="margin:0;padding:0;background:#080808;color:#E8E8E8;font-family:${F_B}">
<!-- Founder template. Replace every {{...}}. For a one-to-one e-mail delete the unsubscribe line; for a list send keep it and give it your provider's unsubscribe link. -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#080808">{{Preview text, about 90 characters}}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:36px 16px"><tr><td align="center">
<table role="presentation" width="${W}" cellpadding="0" cellspacing="0" style="background:#080D14;border:1px solid #15302F;border-radius:18px;max-width:${W}px;width:100%;overflow:hidden">
<tr><td style="height:3px;line-height:3px;font-size:0;background:#44C0B9;background-image:linear-gradient(90deg,#44C0B9,${PTL_TEAL})">&nbsp;</td></tr>
<tr><td style="padding:30px 32px 6px">
<p style="${EYEBROW}">From the founder</p>
<h1 style="${H1}">{{Headline}}</h1>
<p style="${P}">Hi {{first name}},</p>
<p style="${P}">{{Your message. One idea and one ask works best.}}</p>
<p style="${P}">{{Second paragraph, if you need it.}}</p>
<!-- Optional button: delete this row if the e-mail has no call to action -->
<p style="margin:8px 0 24px"><a href="{{https://app.vault-it.co}}" style="${BTN}">{{Open Vault-It}}</a></p>
<p style="${P};margin-bottom:18px">Thanks,</p>
${signature('founder', img)}
</td></tr>
<tr><td style="padding:26px 0 0">${footer('founder', img)}</td></tr>
<tr><td style="padding:18px 32px 26px;border-top:1px solid #15302F">
<p style="${SMALL}"><span style="color:#E8E8E8">Get out of the red and into your home.</span></p>
${legal}
<p style="${SMALL}">{{Unsubscribe line for list sends: You are getting this because you joined the Vault-It beta. <a href="{{unsubscribe_url}}" style="${A}">Unsubscribe</a>.}}</p>
</td></tr></table></td></tr></table></body></html>`;
}
const SIG_FILES = { 'founder': 'founder-signature.html', 'vault-it-founder': 'vault-it-founder-signature.html', 'vault-it': 'hello-signature.html' };
const SIG_FOR = { 'founder': 'ptlived@gmail.com and pete@ptlive.design', 'vault-it-founder': 'pete@vault-it.co', 'vault-it': 'hello@vault-it.co' };
function signatureOnly(who, img) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Signature for ${SIG_FOR[who]}</title></head>
<body style="margin:0;padding:16px;background:#080808;font-family:${F_B}">
<!-- Signature for ${SIG_FOR[who]}. Open in a browser, select the whole card, copy, paste into the mail client's signature box. -->
<table id="sig" role="presentation" width="${W}" cellpadding="0" cellspacing="0" style="background:#080D14;border:1px solid #15302F;border-radius:14px;max-width:${W}px;width:100%;overflow:hidden">
<tr><td style="padding:20px 22px 16px">${signature(who, img)}</td></tr>
<tr><td style="padding:0">${footer(who, img)}</td></tr>
<tr><td style="padding:12px 22px 14px;border-top:1px solid #15302F">${legal}</td></tr>
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
  const b = await browser(), shots = process.argv.includes('--shots'), sd = path.join(ROOT, 'shots/founder-email');
  if (shots) fs.mkdirSync(sd, { recursive: true });
  fs.mkdirSync(MEDIA, { recursive: true });
  try {
    for (const [who, f] of Object.entries(FOOTERS)) {
      const tmp = path.join(os.tmpdir(), `footer-${who}.html`); fs.writeFileSync(tmp, frameHtml(f.right));
      await b.open(tmp, W, H);
      const fonts = await b.evaluate(`(async()=>{const f=["800 34px Syne","800 27px Lexend","12px 'Share Tech Mono'"];await Promise.all(f.map(x=>document.fonts.load(x)));return f.map(x=>document.fonts.check(x))})()`);
      if (fonts.includes(false)) throw new Error('A font did not load (Syne, Lexend, Share Tech Mono): ' + fonts);
      const frames = [];
      for (let i = 0; i <= N; i++) { await b.evaluate(`setFrame(${i / N})`); frames.push(await b.shot(W, H)); }
      fs.writeFileSync(path.join(MEDIA, `${who}-footer.png`), frames[0]);
      if (shots) fs.writeFileSync(path.join(sd, `${who}-footer-mid.png`), frames[Math.round(N * .55)]);
      const delay = frames.map((_, i) => i === 0 ? 2600 : i === N ? 200 : 50);   // ms; frame 0 is the long still
      const out = path.join(MEDIA, `${who}-footer.gif`);
      await sharp(frames, { join: { animated: true } }).gif({ delay, loop: 3, colours: 128, effort: 8, dither: 0, interFrameMaxError: 2 }).toFile(out);
      console.log(`${who}-footer.gif`, Math.round(fs.statSync(out).size / 1024) + ' KB');
    }
    const hosted = (f) => MEDIA_URL + f, local = (f) => '../email-media/public/' + f;
    fs.writeFileSync(path.join(OUT, 'founder-email.html'), email(hosted));
    fs.writeFileSync(path.join(OUT, 'founder-email-preview.html'), email(local));
    for (const [who, file] of Object.entries(SIG_FILES)) {
      fs.writeFileSync(path.join(OUT, file), signatureOnly(who, hosted));
      fs.mkdirSync(path.join(MEDIA, 'sig'), { recursive: true });                  // also at media.vault-it.co/sig/, to copy from in any browser
      fs.writeFileSync(path.join(MEDIA, 'sig', file), signatureOnly(who, hosted));
      if (shots) {
        const tmp = path.join(OUT, '_preview.html'); fs.writeFileSync(tmp, signatureOnly(who, local));
        for (const w of [390, 1100]) {
          await b.open(tmp, w, 400); const h = await b.evaluate('document.documentElement.scrollHeight');
          await b.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 });
          fs.writeFileSync(path.join(sd, `${file.replace('.html', '')}-${w}.png`), await b.shot(w, h));
        }
        fs.rmSync(tmp);
      }
    }
    console.log('founder-email.html, founder-email-preview.html,', Object.values(SIG_FILES).join(', '));
    if (shots) console.log('shots in shots/founder-email/');
  } finally { b.close(); }
})().catch((e) => { console.error(e.message); process.exit(1); });
