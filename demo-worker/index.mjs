// Pitch demo Worker (vault-it-demo). Its own Worker on routes, so the main site Worker is untouched; a Worker route
// takes precedence over the custom-domain Worker on the same host. Paths match case-insensitively.
//   vault-it.co/eligent-demo (and /pitch-Eligent, the address on the deck)  -> demo.html, the Alex Morgan profile page
//   app.vault-it.co/eligent                                                  -> app-seed.html: backs up the device, seeds the
//                                                                               app's own demo persona plus the extra tabs,
//                                                                               fakes the 24h demo session, opens the app
//   app.vault-it.co/eligent/exit                                             -> app-exit.html: puts the device's data back
//   vault-it.co/<base>/index.html (old link cached in browsers)              -> 302 to app.vault-it.co/eligent
// Pages are read from this public repo on GitHub (branch in env.BRANCH) and cached at the edge for five minutes,
// so a git push updates the demo without a redeploy. GET and HEAD only. Nothing here reads cookies, bodies or user data.
const REPO = 'FetaPit/Vault-It';
const BASES = ['/eligent-demo', '/pitch-Eligent'];
const APP_HOST = 'app.vault-it.co';
const APP_DEMO = 'https://' + APP_HOST + '/eligent';
const TTL = 300;
const HEADERS = {
  'content-type': 'text/html; charset=utf-8',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'SAMEORIGIN',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-robots-tag': 'noindex'
};

// Which repo file a request maps to, or a redirect, or nothing.
function pick(host, pathname) {
  const lc = pathname.toLowerCase();
  if (host === APP_HOST) {
    if (lc === '/eligent' || lc === '/eligent/') return { file: 'demo-worker/app-seed.html', noStore: true };
    if (lc === '/eligent/exit' || lc === '/eligent/exit/') return { file: 'demo-worker/app-exit.html', noStore: true };
    return { redirect: APP_DEMO, status: 302 };
  }
  const base = BASES.find((b) => lc === b.toLowerCase() || lc.startsWith(b.toLowerCase() + '/'));
  if (!base) return null;
  if (lc === base.toLowerCase()) return { redirect: 'https://' + host + base + '/', status: 301 };
  const rest = lc.slice(base.length + 1);
  if (rest === '' || rest === 'demo.html') return { file: 'demo.html' };
  if (rest === 'index.html') return { redirect: APP_DEMO, status: 302 };
  return null;
}

export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
    }
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();
    const hit = pick(host.endsWith('.workers.dev') ? 'vault-it.co' : host, url.pathname);
    if (!hit) return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
    if (hit.redirect) return Response.redirect(hit.redirect, hit.status);

    const branch = (env && env.BRANCH) || 'main';
    const cache = caches.default;
    const cacheKey = new Request('https://vault-it.co/__demo/' + hit.file + '?branch=' + encodeURIComponent(branch));
    let body = null;
    const cached = await cache.match(cacheKey);
    if (cached) body = await cached.text();
    else {
      const upstream = await fetch('https://raw.githubusercontent.com/' + REPO + '/' + branch + '/' + hit.file, { headers: { 'user-agent': 'vault-it-demo-worker' } });
      if (!upstream.ok) return new Response('The demo is not available right now.', { status: 502, headers: { 'cache-control': 'no-store' } });
      body = await upstream.text();
      ctx.waitUntil(cache.put(cacheKey, new Response(body, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=' + TTL } })));
    }
    const headers = Object.assign({}, HEADERS, { 'cache-control': hit.noStore ? 'no-store' : 'public, max-age=' + TTL });
    return new Response(request.method === 'HEAD' ? null : body, { status: 200, headers });
  }
};
