// Export the Eligent pitch deck as a PDF: one 1920x1080 page per slide, taken from the deck's one-slide view with every animation played out and the on-screen controls hidden.
// Run from the repo root with Playwright on NODE_PATH:  node tools/pitch_pdf.js   -> shots/pitch-pdf/Vault-It-pitch-deck-v3.pdf (git-ignored build output).
// Owner, 7 Nov 2026: "ensure the animations are fully played out before export"; "remove the page count buttons at the bottom of the pdf".
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http'), cp = require('child_process'), { pathToFileURL } = require('url');
const ROOT = process.cwd(), DIST = fs.mkdtempSync(path.join(require('os').tmpdir(), 'pvpdf-')), OUT = path.join(ROOT, 'shots', 'pitch-pdf');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  cp.execFileSync('node', [path.join(ROOT, 'tools', 'build_site.js')], { env: { ...process.env, SITE_OUT: DIST }, stdio: ['ignore', 'ignore', 'inherit'] });
  const { route } = await import(pathToFileURL(path.join(ROOT, 'worker', 'index.mjs')).href);
  const T = { '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4', '.js': 'text/javascript' };
  const srv = http.createServer((q, r) => { const u = new URL(q.url, 'http://x'), m = route('vault-it.co', u.pathname), f = m.file && path.join(DIST, m.file);
    if (!f || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); r.end(fs.readFileSync(f)); }).listen(0);
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 1920, height: 1080 } }), p = await c.newPage();
  await p.goto(BASE + '/pitch-Eligent?present=1', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  await p.addStyleTag({ content: '#pv-bar{display:none!important}' });   // owner, 7 Nov 2026: no page-count buttons on the PDF (the on-screen presenter controls)
  const n = await p.evaluate(() => document.querySelectorAll('.frame').length), imgs = [];
  await p.keyboard.press('Home');
  // Owner, 7 Nov 2026: "ensure the animations are fully played out before export". Every slide gets 4.5 s for its reveals and the 3D house,
  // then any animation or transition still running is jumped to its end state before the shot.
  for (let i = 0; i < n; i++) { if (i) await p.keyboard.press('ArrowRight'); await p.waitForTimeout(4500);
    await p.evaluate(() => document.getAnimations().forEach((a) => { try { a.finish(); } catch (e) {} })); await p.waitForTimeout(400);
    const f = path.join(OUT, String(i + 1).padStart(2, '0') + '.png'); await p.locator('.frame.on').screenshot({ path: f }); imgs.push(f); }
  const html = '<!doctype html><html><head><style>@page{size:1920px 1080px;margin:0}html,body{margin:0;padding:0}img{display:block;width:1920px;height:1080px;page-break-after:always}img:last-child{page-break-after:auto}</style></head><body>' +
    imgs.map((f) => '<img src="data:image/png;base64,' + fs.readFileSync(f).toString('base64') + '">').join('') + '</body></html>';
  const p2 = await c.newPage(); await p2.setContent(html, { waitUntil: 'load' });
  const pdf = path.join(OUT, 'Vault-It-pitch-deck-v3.pdf');
  await p2.pdf({ path: pdf, width: '1920px', height: '1080px', printBackground: true, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  console.log('slides', n, 'pdf', pdf, Math.round(fs.statSync(pdf).size / 1024) + ' KB');
  await b.close(); srv.close();
})().catch((e) => { console.log('FAIL', e.message); process.exit(1); });
