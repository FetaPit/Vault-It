// Serves the pitch demo at vault-it.co/pitch-Eligent as its own Worker, so the main site Worker is untouched.
// A Worker route (vault-it.co/pitch-Eligent*) takes precedence over the custom-domain Worker on the same host.
// The path is matched case-insensitively, so pitch-eligent works too.
//   /pitch-Eligent            -> 301 to /pitch-Eligent/
//   /pitch-Eligent/           -> demo.html, the Pioneer profile page with the demo hyperlink
//   /pitch-Eligent/index.html -> the app; ?demo=1 seeds every tab (handled in the page itself)
// On any other host the route is attached to (app.vault-it.co/eligent*), every request is a 302 to the demo
// page, so the short link on the app domain works until the demo lives inside the release app itself.
// Both pages are read from this public repo on GitHub (branch in env.BRANCH) and cached at the edge for
// five minutes, so a git push updates the demo without a redeploy. GET and HEAD only. Nothing here reads
// cookies, bodies or user data.
const BASE = '/pitch-Eligent';
const BASE_LC = BASE.toLowerCase();
const DEMO_HOME = 'https://vault-it.co' + BASE + '/';
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
    const host = url.hostname.toLowerCase();
    if (host !== 'vault-it.co' && host !== 'www.vault-it.co' && !host.endsWith('.workers.dev')) {
      return Response.redirect(DEMO_HOME, 302);
    }
    const path = url.pathname.toLowerCase();
    if (path === BASE_LC) {
      url.pathname = BASE + '/';
      return Response.redirect(url.toString(), 301);
    }
    if (!path.startsWith(BASE_LC + '/')) return notFound();
    const file = FILES[path.slice(BASE_LC.length + 1)];
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
