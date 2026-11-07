// Serves the pitch demo on vault-it.co as its own Worker, so the main site Worker is untouched.
// Worker routes take precedence over the custom-domain Worker on the same host. Paths match case-insensitively.
//   vault-it.co/eligent-demo            -> 301 to /eligent-demo/
//   vault-it.co/eligent-demo/           -> demo.html, the Pioneer profile page with the demo hyperlink
//   vault-it.co/eligent-demo/index.html -> the app; ?demo=1 seeds every tab (handled in the page itself)
//   vault-it.co/pitch-Eligent...        -> the same three, the address printed on the pitch deck
//   app.vault-it.co/eligent...          -> 302 to the demo page (any other host on the route does the same)
// Both pages are read from this public repo on GitHub (branch in env.BRANCH) and cached at the edge for
// five minutes, so a git push updates the demo without a redeploy. GET and HEAD only. Nothing here reads
// cookies, bodies or user data.
const BASES = ['/eligent-demo', '/pitch-Eligent'];
const DEMO_HOME = 'https://vault-it.co' + BASES[0] + '/';
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
    const lc = url.pathname.toLowerCase();
    const base = BASES.find((b) => lc === b.toLowerCase() || lc.startsWith(b.toLowerCase() + '/'));
    if (!base) return notFound();
    if (lc === base.toLowerCase()) {
      url.pathname = base + '/';
      return Response.redirect(url.toString(), 301);
    }
    const file = FILES[lc.slice(base.length + 1)];
    if (!file) return notFound();

    const branch = (env && env.BRANCH) || 'main';
    const cache = caches.default;
    const cacheKey = new Request(url.origin + '/__demo/' + file + '?branch=' + encodeURIComponent(branch));
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
