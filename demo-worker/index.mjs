// Serves the pitch demo at vault-it.co/demo-eligent as its own Worker, so the main site Worker is untouched.
// A Worker route (vault-it.co/demo-eligent*) takes precedence over the custom-domain Worker on the same host.
//   /demo-eligent            -> 301 to /demo-eligent/
//   /demo-eligent/           -> demo.html, the Pioneer profile page with the demo hyperlink
//   /demo-eligent/index.html -> the app; ?demo=1 seeds every tab (handled in the page itself)
// Both pages are read from this public repo on GitHub (branch in env.BRANCH) and cached at the edge for
// five minutes, so a git push updates the demo without a redeploy. GET and HEAD only. Nothing here reads
// cookies, bodies or user data.
const BASE = '/demo-eligent';
const REPO = 'FetaPit/Vault-It';
const FILES = { '': 'demo.html', 'demo.html': 'demo.html', 'index.html': 'index.html' };
const TTL = 300;
const HEADERS = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'public, max-age=' + TTL,
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'SAMEORIGIN',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-robots-tag': 'noindex'
};

export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
    }
    const url = new URL(request.url);
    if (url.pathname === BASE) {
      url.pathname = BASE + '/';
      return Response.redirect(url.toString(), 301);
    }
    if (!url.pathname.startsWith(BASE + '/')) return notFound();
    const file = FILES[url.pathname.slice(BASE.length + 1)];
    if (!file) return notFound();

    const branch = (env && env.BRANCH) || 'main';
    const cache = caches.default;
    const cacheKey = new Request(url.origin + BASE + '/' + file + '?branch=' + encodeURIComponent(branch));
    let res = await cache.match(cacheKey);
    if (!res) {
      const upstream = await fetch('https://raw.githubusercontent.com/' + REPO + '/' + branch + '/' + file, {
        headers: { 'user-agent': 'vault-it-demo-worker' }
      });
      if (!upstream.ok) {
        return new Response('The demo is not available right now.', { status: 502, headers: { 'cache-control': 'no-store' } });
      }
      res = new Response(await upstream.text(), { status: 200, headers: HEADERS });
      ctx.waitUntil(cache.put(cacheKey, res.clone()));
    }
    return request.method === 'HEAD' ? new Response(null, { status: 200, headers: res.headers }) : res;
  }
};

function notFound() {
  return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
}
