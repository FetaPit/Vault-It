// One Worker, two sites: app.vault-it.co → dist/app, vault-it.co → dist/landing (www redirects to the bare domain).
// Any other host (the workers.dev preview links Cloudflare makes for every branch, localhost) serves the app, and the
// landing page under /landing/. Static files come from the assets binding; this only chooses the folder, adds the security
// headers and refuses anything but GET/HEAD. Nothing here reads cookies, bodies or user data.

export const HOSTS = { app: 'app.vault-it.co', root: 'vault-it.co', www: 'www.vault-it.co' };

// Where a request should be served from. Returns { redirect } or { file } (a path inside the assets folder) or { notFound }.
export function route(host, pathname) {
  host = host.toLowerCase();
  let path;
  try { path = decodeURIComponent(pathname); } catch (e) { return { notFound: true }; }
  if (host === HOSTS.www) return { redirect: 'https://' + HOSTS.root };
  if (path.includes('\0') || path.split('/').some((s) => s === '..' || s === '.') || path.includes('\\')) return { notFound: true };

  let site, rest = path, prod = true;
  if (host === HOSTS.root) site = 'landing';
  else if (host === HOSTS.app) site = 'app';
  else {                                   // previews, localhost
    prod = false;
    if (path === '/landing' || path.startsWith('/landing/')) { site = 'landing'; rest = path.slice('/landing'.length) || '/'; }
    else site = 'app';
  }
  if (rest.endsWith('/')) rest += 'index.html';
  else if (!/\.[A-Za-z0-9]+$/.test(rest)) rest += '.html';       // /recover → /recover.html
  if (rest === '/version.json' && site !== 'app') return { notFound: true };
  return { file: '/' + site + rest, site, prod };
}

const SECURITY = {
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), usb=()',
  // Only the directives the app can live with: it uses inline scripts and styles, so script-src is deliberately not restricted.
  'Content-Security-Policy': "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
};

function withHeaders(res, { file, prod } = {}) {
  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries(SECURITY)) h.set(k, v);
  if (!prod) h.set('X-Robots-Tag', 'noindex');
  if (file && (file.endsWith('.html') || file.endsWith('/version.json'))) h.set('Cache-Control', file.endsWith('.json') ? 'no-store' : 'no-cache');
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== 'GET' && request.method !== 'HEAD') return withHeaders(new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } }), { prod: true });

    const r = route(url.hostname, url.pathname);
    if (r.redirect) return withHeaders(Response.redirect(r.redirect + url.pathname + url.search, 301), { prod: true });
    if (r.notFound) return withHeaders(new Response('Not found', { status: 404 }), { prod: true });

    const asset = await env.ASSETS.fetch(new Request(new URL(r.file, url.origin), { method: request.method, headers: request.headers }));
    if (asset.status === 404 || asset.status >= 500) {
      const nf = await env.ASSETS.fetch(new Request(new URL('/' + r.site + '/404.html', url.origin)));
      return withHeaders(new Response(nf.body, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }), { prod: r.prod });
    }
    return withHeaders(asset, r);
  },
};
