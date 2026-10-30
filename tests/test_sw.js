// Installable app: the manifest is a real file, the service worker registers over http(s), caches the shell and
// serves it offline, the build stamps the commit into sw.js, and the Worker never lets sw.js or the manifest go stale.
// Run: node tests/test_sw.js   (builds the site into a temp folder and serves it on a local port)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http'), os = require('os'), cp = require('child_process');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const ROOT = '/home/user/Vault-It';
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'vi-sw-'));

// ── static checks on the source ──
const html = fs.readFileSync(ROOT + '/index.html', 'utf8');
ok((html.match(/rel="manifest"/g) || []).length === 1 && /rel="manifest" href="\.\/manifest\.webmanifest"/.test(html), 'index links one real manifest file');
const reg = html.slice(html.indexOf("'serviceWorker' in navigator"), html.indexOf("'serviceWorker' in navigator") + 400);
ok(/register\('\.\/sw\.js'\)/.test(reg) && /https\?/.test(reg) && !/createObjectURL|Blob\(/.test(reg), 'index registers ./sw.js only over http(s), not a blob: URL');
const man = JSON.parse(fs.readFileSync(ROOT + '/manifest.webmanifest', 'utf8'));
ok(man.name === 'Vault-It' && man.display === 'standalone' && man.start_url === './' && man.icons.some(i => i.sizes === '512x512' && /image\/png/.test(i.type)), 'manifest: Vault-It, standalone, 512 px PNG icon');
const sw = fs.readFileSync(ROOT + '/sw.js', 'utf8');
ok(/__SW_VERSION__/.test(sw) && /SHELL = \[.*'\.\/index\.html'.*\]/.test(sw) && /version\.json/.test(sw) && /url\.origin !== self\.location\.origin/.test(sw), 'sw.js: versioned cache, shell list, version.json live, same origin only');
const worker = fs.readFileSync(ROOT + '/worker/index.mjs', 'utf8');
ok(/endsWith\('\/sw\.js'\)/.test(worker) && /endsWith\('\.webmanifest'\)/.test(worker) && /no-cache/.test(worker), 'worker: sw.js and the manifest are served no-cache');

// ── build and check the stamped output ──
cp.execSync('node tools/build_site.js', { cwd: ROOT, env: Object.assign({}, process.env, { SITE_OUT: OUT }), stdio: 'pipe' });
const built = fs.readFileSync(OUT + '/app/sw.js', 'utf8');
const ver = (built.match(/VERSION = '([0-9a-f]{12})'/) || [])[1];
ok(ver && !/__SW_VERSION__/.test(built), 'build stamps the commit into sw.js (' + ver + ')');
ok(fs.existsSync(OUT + '/app/manifest.webmanifest') && fs.existsSync(OUT + '/app/version.json'), 'build copies the manifest and version.json');

// ── serve it and check the worker really works ──
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  fs.readFile(path.join(OUT, 'app', p), (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-cache' }); res.end(b); });
});
(async () => {
  await new Promise(r => srv.listen(0, r)); const URL0 = 'http://localhost:' + srv.address().port + '/';
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route(/cdn\.jsdelivr\.net|\.supabase\.co\/|api\.metals|coingecko/, r => r.abort());   // the sandbox has no outside network anyway
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => localStorage.setItem('vi_declined_demo', 'true'));
  await page.goto(URL0); await page.waitForTimeout(2500);
  const r1 = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); if (!r) return null; await navigator.serviceWorker.ready; const ks = await caches.keys(); const c = await caches.open(ks[0]); const keys = (await c.keys()).map(k => new URL(k.url).pathname); return { scope: r.scope, caches: ks, keys }; });
  ok(r1 && r1.caches.length === 1 && r1.caches[0] === 'vault-it-' + ver, 'worker registered with the versioned cache: ' + (r1 && r1.caches.join(',')));
  ok(r1 && r1.keys.includes('/index.html') && r1.keys.includes('/manifest.webmanifest') && !r1.keys.includes('/version.json'), 'shell cached, version.json not: ' + (r1 && r1.keys.join(' ')));
  const mr = await page.evaluate(async () => { const r = await fetch('./manifest.webmanifest'); return { status: r.status, type: r.headers.get('content-type') }; });
  ok(mr.status === 200 && /manifest\+json|json/.test(mr.type), 'manifest downloads as JSON');
  // offline: the shell still opens
  await ctx.setOffline(true);
  await page.goto(URL0, { waitUntil: 'domcontentloaded' }).catch(() => {}); await page.waitForTimeout(1500);
  const off = await page.evaluate(() => ({ title: document.title, card: !!document.querySelector('.auth-card'), fca: /Not regulated by the FCA/.test(document.body.textContent) }));
  ok(/Vault-It/.test(off.title) && off.card && off.fca, 'offline: the app shell opens from the cache (sign-in card and FCA line present)');
  await ctx.setOffline(false);
  ok(errs.filter(e => !/supabase|Failed to fetch|NetworkError|three/i.test(e)).length === 0, 'no page errors');
  await b.close(); srv.close();
  fs.rmSync(OUT, { recursive: true, force: true });
  console.log(fails ? `FAILURES ${fails}` : 'ALL PASS'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL: script error', e); srv.close(); process.exit(1); });
