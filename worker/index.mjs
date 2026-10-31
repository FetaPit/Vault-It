// One Worker, two sites: app.vault-it.co → dist/app, vault-it.co → dist/landing (www redirects to the bare domain; plain http redirects to https).
// workers.dev preview links (Cloudflare makes one per branch) and localhost serve the app, and the landing page under /landing/;
// any other host gets a 404. Static files come from the assets binding; this only chooses the folder, adds the security
// headers and refuses anything but GET/HEAD. Nothing here reads cookies, bodies or user data.

export const HOSTS = { app: 'app.vault-it.co', root: 'vault-it.co', www: 'www.vault-it.co' };

// Which kind of host is this? 'www' | 'root' | 'app' | 'preview' (Cloudflare's workers.dev links, localhost) | null (anything else).
export function hostKind(hostname) {
  const h = hostname.toLowerCase().replace(/\.$/, '');                // 'app.vault-it.co.' is the same host
  if (h === HOSTS.www) return 'www';
  if (h === HOSTS.root) return 'root';
  if (h === HOSTS.app) return 'app';
  if (h.endsWith('.workers.dev') || h === 'localhost' || h === '127.0.0.1') return 'preview';
  return null;
}

// Where a request should be served from. Returns { redirect } or { file } (a path inside the assets folder) or { notFound }.
// The path is judged exactly as the URL parser delivered it, never decoded and re-parsed: every published file has a plain name,
// so anything with '%', backslashes, control characters, dot segments or empty segments is simply not a file we serve.
export function route(hostname, pathname) {
  const kind = hostKind(hostname);
  if (!kind) return { notFound: true };
  if (kind === 'www') return { redirect: 'https://' + HOSTS.root };
  if (!/^\/[A-Za-z0-9._~\-\/]*$/.test(pathname) || pathname.includes('//') || pathname.split('/').some((s) => s === '.' || s === '..')) return { notFound: true };

  let site, rest = pathname;
  if (kind === 'root') site = 'landing';
  else if (kind === 'app') site = 'app';
  else if (pathname === '/landing' || pathname.startsWith('/landing/')) { site = 'landing'; rest = pathname.slice('/landing'.length) || '/'; }   // previews: landing under /landing/
  else site = 'app';
  if (rest.endsWith('/')) rest += 'index.html';
  else if (!/\.[A-Za-z0-9]+$/.test(rest)) rest += '.html';       // /recover → /recover.html
  if (rest === '/version.json' && site !== 'app') return { notFound: true };
  return { file: '/' + site + rest, site, prod: kind !== 'preview' };
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

// Report-only for now (nothing is blocked): the outside hosts the app calls, as named in the privacy notice (tests/test_csp_report_only.mjs).
// Inline scripts and styles are allowed because the app is one file; 'self' covers both sites' own files, blob:/data: cover generated models and photos.
const SB = 'https://legpubblzgknxdtvsant.supabase.co';
const CONNECT = [SB, 'wss://legpubblzgknxdtvsant.supabase.co', 'https://api.coingecko.com', 'https://open.er-api.com', 'https://api.metals.live', 'https://metals-api.com',
  'https://www.alphavantage.co', 'https://api.anthropic.com', 'https://api.openverse.org', 'https://static.poly.pizza', 'https://poly.pizza', 'https://corsproxy.io',
  'https://api.notion.com', 'https://api.convertkit.com', 'https://www.shibrpc.com', 'https://challenges.cloudflare.com'];
const REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' blob: https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://challenges.cloudflare.com",
  "connect-src 'self' blob: data: " + CONNECT.join(' '),
  "img-src 'self' data: blob: https://logo.clearbit.com https://www.google.com https://static.poly.pizza https://poly.pizza",
  "font-src 'self' data: https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "frame-src https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
].join('; ');
SECURITY['Content-Security-Policy-Report-Only'] = REPORT_ONLY;

function withHeaders(res, { file, prod } = {}) {
  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries(SECURITY)) h.set(k, v);
  if (!prod) h.set('X-Robots-Tag', 'noindex');
  if (file && (file.endsWith('.html') || file.endsWith('/version.json') || file.endsWith('/sw.js') || file.endsWith('.webmanifest'))) h.set('Cache-Control', file.endsWith('.json') ? 'no-store' : 'no-cache');   // the worker script and manifest must never be stale
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== 'GET' && request.method !== 'HEAD') return withHeaders(new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } }), { prod: true });

    const kind = hostKind(url.hostname);
    if (url.protocol === 'http:' && (kind === 'www' || kind === 'root' || kind === 'app')) {   // production is HTTPS only
      return withHeaders(Response.redirect('https://' + url.hostname.replace(/\.$/, '') + url.pathname + url.search, 301), { prod: true });
    }
    const r = route(url.hostname, url.pathname);
    if (r.redirect) return withHeaders(Response.redirect(r.redirect + url.pathname + url.search, 301), { prod: true });
    if (r.notFound) return withHeaders(new Response('Not found', { status: 404 }), { prod: true });

    const target = new URL(r.file, url.origin);
    if (!target.pathname.startsWith('/' + r.site + '/')) return withHeaders(new Response('Not found', { status: 404 }), { prod: true });   // invariant: never leave the site's own folder

    const asset = await env.ASSETS.fetch(new Request(target, { method: request.method, headers: request.headers }));
    if (asset.status === 404 || asset.status >= 500) {
      const nf = await env.ASSETS.fetch(new Request(new URL('/' + r.site + '/404.html', url.origin)));
      return withHeaders(new Response(nf.body, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }), { prod: r.prod });
    }
    return withHeaders(asset, r);
  },
};
