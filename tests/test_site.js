// The Cloudflare site: what gets published, which folder each host is served from, redirects, 404s, methods and headers.
// Runs the real build script and the real Worker against a stand-in for the assets binding (no Cloudflare needed).
const fs = require('fs'), path = require('path'), cp = require('child_process'), { pathToFileURL } = require('url');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const ROOT = path.join(__dirname, '..'), DIST = path.join(ROOT, 'dist');

(async () => {
  cp.execFileSync('node', [path.join(ROOT, 'tools', 'build_site.js')], { env: { ...process.env, WORKERS_CI_COMMIT_SHA: 'abc123' }, stdio: 'ignore' });
  const tree = (d) => fs.readdirSync(path.join(DIST, d)).sort();
  ok(JSON.stringify(tree('app')) === JSON.stringify(['404.html', 'index.html', 'logo.png', 'recover.html', 'robots.txt', 'version.json']), 'app site contains only the app, the recovery page, logo, robots, 404 and version: ' + tree('app'));
  ok(JSON.stringify(tree('landing')) === JSON.stringify(['404.html', 'index.html', 'logo.png', 'robots.txt']), 'landing site contains only the landing page, logo, robots and 404: ' + tree('landing'));
  ok(fs.readdirSync(DIST).sort().join() === 'app,landing', 'nothing else is published (no tests, docs, notes or function code)');
  ok(JSON.parse(fs.readFileSync(path.join(DIST, 'app', 'version.json'), 'utf8')).sha === 'abc123', 'version.json records the commit being built');
  ok(/<title>Vault/i.test(fs.readFileSync(path.join(DIST, 'app', 'index.html'), 'utf8')) && /Join the climb/.test(fs.readFileSync(path.join(DIST, 'landing', 'index.html'), 'utf8')), 'index pages are the right ones');

  const W = (await import(pathToFileURL(path.join(ROOT, 'worker', 'index.mjs')).href)).default;
  const ASSETS = { fetch: async (req) => { const p = path.join(DIST, decodeURIComponent(new URL(req.url).pathname)); const inside = p.startsWith(DIST + path.sep);
    if (!inside || !fs.existsSync(p) || fs.statSync(p).isDirectory()) return new Response('nf', { status: 404 });
    const ext = path.extname(p); return new Response(req.method === 'HEAD' ? null : fs.readFileSync(p), { headers: { 'Content-Type': { '.html': 'text/html', '.json': 'application/json', '.txt': 'text/plain', '.png': 'image/png' }[ext] || 'application/octet-stream' } }); } };
  const get = async (u, init) => { const r = await W.fetch(new Request(u, init), { ASSETS }); return { s: r.status, h: r.headers, t: await r.text() }; };

  let r = await get('https://app.vault-it.co/');
  ok(r.s === 200 && /<title>Vault/i.test(r.t), 'app.vault-it.co/ serves the app');
  r = await get('https://app.vault-it.co/recover'); ok(r.s === 200 && /Vault/.test(r.t), '/recover serves the recovery page (clean URL)');
  r = await get('https://app.vault-it.co/recover.html'); ok(r.s === 200, '/recover.html works too');
  r = await get('https://app.vault-it.co/version.json'); ok(r.s === 200 && JSON.parse(r.t).sha === 'abc123' && r.h.get('cache-control') === 'no-store', 'version.json is served and never cached');
  r = await get('https://vault-it.co/'); ok(r.s === 200 && /Join the climb/.test(r.t), 'vault-it.co/ serves the landing page');
  r = await get('https://vault-it.co/version.json'); ok(r.s === 404, 'the landing host does not serve the app’s files');
  r = await get('https://vault-it.co/app/index.html'); ok(r.s === 404, 'the landing host cannot reach the app folder by path');
  r = await get('https://app.vault-it.co/landing/index.html'); ok(r.s === 404, 'the app host cannot reach the landing folder by path');
  r = await get('https://www.vault-it.co/pricing?x=1#f'); ok(r.s === 301 && r.h.get('location') === 'https://vault-it.co/pricing?x=1', 'www redirects to the bare domain, keeping path and query');
  r = await get('https://my-branch-vault-it.pete.workers.dev/'); ok(r.s === 200 && /<title>Vault/i.test(r.t) && r.h.get('x-robots-tag') === 'noindex', 'a preview link serves the app and is marked noindex');
  r = await get('https://my-branch-vault-it.pete.workers.dev/landing/'); ok(r.s === 200 && /Join the climb/.test(r.t), 'a preview link serves the landing page under /landing/');
  r = await get('https://app.vault-it.co/nope'); ok(r.s === 404 && /does not exist/.test(r.t) && /text\/html/.test(r.h.get('content-type')), 'unknown pages get the 404 page with a 404 status');
  for (const evil of ['/../index.html', '/%2e%2e/landing/index.html', '/..%2Flanding/index.html', '/a/../../landing/index.html', '/%00', '/%5C..%5Clanding%5Cindex.html', '/%E0%A4%A']) {
    r = await get('https://app.vault-it.co' + evil); if (r.s === 200 && /Join the climb/.test(r.t)) ok(false, 'path escape worked: ' + evil);
  }
  ok(true, 'path-traversal attempts never reach another folder');
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
