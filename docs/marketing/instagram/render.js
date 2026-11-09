// Renders the Instagram intro kit from slides.js into docs/marketing/instagram/out/.
//   node docs/marketing/instagram/render.js            stills only (slide covers, profile picture, highlight covers)
//   node docs/marketing/instagram/render.js video      also the six MP4 slides (H.264, 1080 x 1350, 30 fps, silent)
//   node docs/marketing/instagram/render.js video 1 6  only slides 1 and 6
//   node docs/marketing/instagram/render.js video eligent "<path to the I am pitching card>"
//                                                       the square Eligent Club post (the card stays outside the repo)
// Needs Playwright (env PW = path to the playwright package if it is not installed here) and mp4-muxer
// (env MUXER = path to mp4-muxer/build/mp4-muxer.js). Uses the installed Chrome (or Edge) for its H.264 encoder.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require(process.env.PW || 'playwright');

const ROOT = path.resolve(__dirname, '../../..');
const OUT = path.join(__dirname, 'out');
const args = process.argv.slice(2);
const wantVideo = args.includes('video');
const setName = args.includes('eligent') ? 'eligent' : 'intro';
const cardPath = args.find(a => /\.(jpe?g|png|webp)$/i.test(a));
const only = args.filter(a => /^\d+$/.test(a)).map(Number);
const prefix = setName === 'intro' ? 'slide' : setName;

function fileUrl(p) { return 'file:///' + p.split(path.sep).join('/'); }
function save(name, dataUrlOrB64) {
  const b64 = dataUrlOrB64.replace(/^data:[^,]+,/, '');
  fs.writeFileSync(path.join(OUT, name), Buffer.from(b64, 'base64'));
  console.log('  wrote', name);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  // The brand book keeps its 3D house renderer private; serve a copy that hands it to slides.js.
  let html = fs.readFileSync(path.join(ROOT, 'brand/vault-it-brand-book.html'), 'utf8');
  const m = [...html.matchAll(/\}\)\(\);\r?\n<\/script>/g)].pop();
  if (!m) throw new Error('brand book script end not found');
  const end = m.index;
  html = html.slice(0, end) +
    'try{window.__VI={renderHouse:renderHouse,houseState:houseState,drawIcon:drawIcon,ICONS:ICONS}}catch(e){window.__VIerr=String(e)}\n' +
    html.slice(end);
  html = html.replace('</head>', '<link href="https://fonts.googleapis.com/css2?family=Oxanium:wght@700&family=Syne:wght@800&family=DM+Sans:wght@400;500;700&family=Share+Tech+Mono&display=block" rel="stylesheet"></head>');
  const tmp = path.join(os.tmpdir(), 'vi-ig-brandbook.html');
  fs.writeFileSync(tmp, html);

  let browser;
  for (const channel of ['chrome', 'msedge']) {
    try { browser = await chromium.launch({ channel, args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); break; } catch (e) { /* try the next */ }
  }
  if (!browser) throw new Error('needs Chrome or Edge installed');
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  page.on('pageerror', e => console.log('page error:', e.message));
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'no-preference' });
  await page.goto(fileUrl(tmp));
  const err = await page.evaluate(() => window.__VIerr || (window.__VI ? '' : 'no __VI'));
  if (err) throw new Error('renderer not exposed: ' + err);
  if (wantVideo) await page.addScriptTag({ path: process.env.MUXER || require.resolve('mp4-muxer/build/mp4-muxer.js') });
  await page.addScriptTag({ path: path.join(__dirname, 'slides.js') });
  console.log('prepare', JSON.stringify(await page.evaluate(() => window.__IG.prepare())));

  if (setName === 'eligent') {
    if (!cardPath) throw new Error('give the path to the pitch card image');
    const mime = /\.png$/i.test(cardPath) ? 'image/png' : /\.webp$/i.test(cardPath) ? 'image/webp' : 'image/jpeg';
    console.log('card', await page.evaluate(src => window.__IG.setImage(src), `data:${mime};base64,` + fs.readFileSync(cardPath).toString('base64')));
  }
  const sets = await page.evaluate(() => window.__IG.sets);
  const idx = sets.map((s, i) => [s, i]).filter(x => x[0] === setName).map(x => x[1]);
  for (let j = 0; j < idx.length; j++) {
    if (only.length && !only.includes(j + 1)) continue;
    const i = idx[j] + 1, tag = String(j + 1).padStart(2, '0');
    if (wantVideo) {
      const t0 = Date.now();
      const r = await page.evaluate(k => window.__IG.encode(k), i - 1);
      save(`${prefix}-${tag}.mp4`, r.mp4);
      save(`${prefix}-${tag}-cover.png`, r.png);
      console.log(`  slide ${i}: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    } else {
      save(`${prefix}-${tag}-cover.png`, await page.evaluate(k => window.__IG.still('slide', k), i - 1));
    }
  }
  if (!only.length && setName === 'intro') {
    save('profile-picture.png', await page.evaluate(() => window.__IG.still('avatar')));
    const hl = await page.evaluate(() => window.__IG.highlights);
    for (let i = 0; i < hl.length; i++) {
      save(`highlight-${i + 1}-${hl[i].toLowerCase().replace(/\s+/g, '-')}.png`, await page.evaluate(k => window.__IG.still('highlight', k), i));
    }
  }
  await browser.close();
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
