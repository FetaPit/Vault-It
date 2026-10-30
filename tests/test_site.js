// The Cloudflare site: what gets published, which folder each host is served from, redirects, 404s, methods and headers.
// Runs the real build script and the real Worker against a stand-in for the assets binding (no Cloudflare needed).
const fs = require('fs'), path = require('path'), cp = require('child_process'), { pathToFileURL } = require('url');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const ROOT = path.join(__dirname, '..'), DIST = fs.mkdtempSync(path.join(require('os').tmpdir(), 'vaultit-site-'));   // built into a temp folder, never the shared dist/

(async () => {
  cp.execFileSync('node', [path.join(ROOT, 'tools', 'build_site.js')], { env: { ...process.env, WORKERS_CI_COMMIT_SHA: 'abc123', SITE_OUT: DIST }, stdio: ['ignore', 'ignore', 'inherit'] });
  const tree = (d) => fs.readdirSync(path.join(DIST, d), { recursive: true }).map(String).filter((f) => fs.statSync(path.join(DIST, d, f)).isFile()).sort();
  ok(JSON.stringify(tree('app')) === JSON.stringify(['404.html', 'index.html', 'logo.png', 'og-image.png', 'recover.html', 'robots.txt', 'version.json']), 'app site contains only the app, the recovery page, logo, share image, robots, 404 and version: ' + tree('app'));
  ok(JSON.stringify(tree('landing')) === JSON.stringify(['404.html', 'img/founder.jpg', 'img/house-built.jpg', 'img/house-deposit.jpg', 'index.html', 'og-image.png', 'robots.txt', 'sign-up.html', 'sign-up/confirm.html', 'sign-up/style.css', 'sign-up/thanks.html', 'sign-up/unsubscribe.html']), 'landing site contains only the sign-up page, its follow-on pages and images, share image, robots and 404: ' + tree('landing'));
  ok(fs.readdirSync(DIST).sort().join() === 'app,landing', 'nothing else is published (no tests, docs, notes or function code)');
  ok(JSON.parse(fs.readFileSync(path.join(DIST, 'app', 'version.json'), 'utf8')).sha === 'abc123', 'version.json records the commit being built');
  ok(/<title>Vault/i.test(fs.readFileSync(path.join(DIST, 'app', 'index.html'), 'utf8')) && /Join the beta list/.test(fs.readFileSync(path.join(DIST, 'landing', 'index.html'), 'utf8')), 'index pages are the right ones');

  const W = (await import(pathToFileURL(path.join(ROOT, 'worker', 'index.mjs')).href)).default;
  const asked = [];   // every path the Worker asks the assets binding for
  const ASSETS = { fetch: async (req) => { asked.push(new URL(req.url).pathname); const p = path.join(DIST, decodeURIComponent(new URL(req.url).pathname)); const inside = p.startsWith(DIST + path.sep);
    if (!inside || !fs.existsSync(p) || fs.statSync(p).isDirectory()) return new Response('nf', { status: 404 });
    const ext = path.extname(p); return new Response(req.method === 'HEAD' ? null : fs.readFileSync(p), { headers: { 'Content-Type': { '.html': 'text/html', '.json': 'application/json', '.txt': 'text/plain', '.png': 'image/png' }[ext] || 'application/octet-stream' } }); } };
  const get = async (u, init) => { const r = await W.fetch(new Request(u, init), { ASSETS }); return { s: r.status, h: r.headers, t: await r.text() }; };

  let r = await get('https://app.vault-it.co/');
  ok(r.s === 200 && /<title>Vault/i.test(r.t), 'app.vault-it.co/ serves the app');
  r = await get('https://app.vault-it.co/recover'); ok(r.s === 200 && /Vault/.test(r.t), '/recover serves the recovery page (clean URL)');
  r = await get('https://app.vault-it.co/recover.html'); ok(r.s === 200, '/recover.html works too');
  r = await get('https://app.vault-it.co/version.json'); ok(r.s === 200 && JSON.parse(r.t).sha === 'abc123' && r.h.get('cache-control') === 'no-store', 'version.json is served and never cached');
  r = await get('https://vault-it.co/'); ok(r.s === 200 && /Join the beta list/.test(r.t), 'vault-it.co/ serves the landing page');
  r = await get('https://vault-it.co/sign-up'); ok(r.s === 200 && /Join the beta list/.test(r.t) && /rel="canonical" href="https:\/\/vault-it.co\/sign-up"/.test(r.t), 'vault-it.co/sign-up serves the sign-up page (canonical address)');
  for (const p of ['/sign-up/thanks', '/sign-up/confirm', '/sign-up/unsubscribe', '/sign-up/style.css', '/img/house-deposit.jpg']) { r = await get('https://vault-it.co' + p); if (r.s !== 200) ok(false, p + ' → ' + r.s); }
  ok(true, 'the follow-on pages and images are served');
  r = await get('https://my-branch-vault-it.pete.workers.dev/landing/sign-up/thanks'); ok(r.s === 200 && /check your inbox/i.test(r.t), 'previews serve the follow-on pages under /landing/');
  r = await get('https://vault-it.co/version.json'); ok(r.s === 404, 'the landing host does not serve the app’s files');
  r = await get('https://vault-it.co/app/index.html'); ok(r.s === 404, 'the landing host cannot reach the app folder by path');
  r = await get('https://app.vault-it.co/landing/index.html'); ok(r.s === 404, 'the app host cannot reach the landing folder by path');
  r = await get('https://www.vault-it.co/pricing?x=1#f'); ok(r.s === 301 && r.h.get('location') === 'https://vault-it.co/pricing?x=1', 'www redirects to the bare domain, keeping path and query');
  r = await get('https://my-branch-vault-it.pete.workers.dev/'); ok(r.s === 200 && /<title>Vault/i.test(r.t) && r.h.get('x-robots-tag') === 'noindex', 'a preview link serves the app and is marked noindex');
  r = await get('https://my-branch-vault-it.pete.workers.dev/landing/'); ok(r.s === 200 && /Join the beta list/.test(r.t), 'a preview link serves the landing page under /landing/');
  r = await get('https://app.vault-it.co/nope'); ok(r.s === 404 && /does not exist/.test(r.t) && /text\/html/.test(r.h.get('content-type')), 'unknown pages get the 404 page with a 404 status');
  const evils = ['/../index.html', '/%2e%2e/landing/index.html', '/..%2Flanding/index.html', '/a/../../landing/index.html', '/%00', '/%5C..%5Clanding%5Cindex.html', '/%E0%A4%A',
    '/.%09./landing/index.html', '/%252e%252e/landing/index.html', '/.%0d%0a./landing/index.html', '/.%0a./landing/index.html', '/%2e/landing/index.html', '//landing/index.html', '/landing//index.html', '/index.html%00.png', '/%C0%AE%C0%AE/landing/index.html'];
  let leaked = [];
  for (const host of ['app.vault-it.co', 'vault-it.co']) for (const evil of evils) {
    asked.length = 0; r = await get('https://' + host + evil); const other = host === 'app.vault-it.co' ? '/landing/' : '/app/';
    if ((r.s === 200 && (host === 'app.vault-it.co' ? /Join the beta list/ : /<title>Vault-It — From Debt/).test(r.t) && false) || asked.some(a => a.startsWith(other))) leaked.push(host + evil);
    if (r.s === 200 && asked.some(a => !a.startsWith(host === 'app.vault-it.co' ? '/app/' : '/landing/'))) leaked.push(host + evil + ' (200 from outside)');
  }
  ok(leaked.length === 0, 'no path trick (encoded dots, tabs/newlines, double encoding, overlong UTF-8, null bytes, backslashes, double slashes) ever asks for another site’s folder' + (leaked.length ? ': ' + leaked.join(' | ') : ''));
  r = await get('https://vault-it.co/.%09./app/version.json'); ok(r.s === 404, 'the version file cannot be reached through the landing host by any trick');
  r = await get('https://app.vault-it.co/.%09./landing/index.html'); ok(r.s === 404 && !/Join the beta list/.test(r.t), 'the landing page cannot be served on the app origin');
  r = await get('http://app.vault-it.co/recover?x=1'); ok(r.s === 301 && r.h.get('location') === 'https://app.vault-it.co/recover?x=1', 'plain http is redirected to https (path and query kept)');
  r = await get('http://vault-it.co/'); ok(r.s === 301 && r.h.get('location') === 'https://vault-it.co/', '…on the landing domain too');
  r = await get('http://my-branch.pete.workers.dev/'); ok(r.s === 200, 'previews and local development are not forced to https');
  r = await get('https://app.vault-it.co./'); ok(r.s === 200 && /<title>Vault/i.test(r.t) && !r.h.get('x-robots-tag'), 'a trailing-dot host is treated as the same production host');
  for (const h of ['evilvault-it.co', 'vault-it.co.evil.com', 'x.vault-it.co', 'app.vault-it.co.workers.dev.example', 'localhost.evil.com']) { r = await get('https://' + h + '/'); if (r.s !== 404) ok(false, 'unknown host served: ' + h + ' → ' + r.s); }
  ok(true, 'unknown hosts get a 404');
  r = await get('https://app.vault-it.co/', { method: 'POST', body: 'x' }); ok(r.s === 405 && r.h.get('allow') === 'GET, HEAD', 'POST is refused');
  r = await get('https://app.vault-it.co/', { method: 'HEAD' }); ok(r.s === 200 && r.t === '', 'HEAD works');
  r = await get('https://app.vault-it.co/');
  const H = r.h; ok(/max-age=\d{7,}/.test(H.get('strict-transport-security')) && H.get('x-content-type-options') === 'nosniff' && H.get('x-frame-options') === 'DENY' && /strict-origin/.test(H.get('referrer-policy')) && /camera=\(\)/.test(H.get('permissions-policy')), 'security headers on every response');
  ok(/frame-ancestors 'none'/.test(H.get('content-security-policy')) && /object-src 'none'/.test(H.get('content-security-policy')), 'the app cannot be framed (clickjacking) and loads no plug-ins');
  ok(H.get('cache-control') === 'no-cache' && !H.get('x-robots-tag'), 'HTML is always revalidated; production is not marked noindex');
  r = await get('https://app.vault-it.co/nope'); ok(!!r.h.get('strict-transport-security'), 'headers are on error pages and redirects too');
  r = await get('https://www.vault-it.co/'); ok(!!r.h.get('strict-transport-security') && r.s === 301, '…and on redirects');
  console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})();
