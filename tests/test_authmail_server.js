// send-auth-email: input validation, HTML-safe e-mail body, per-address / per-IP / global limits, fail-open, and the 429 shape the app relies on.
const fs = require('fs'); const esbuild = require('esbuild');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
let src = fs.readFileSync('/home/user/Vault-It/supabase/functions/send-auth-email/index.ts', 'utf8');
src = src.replace(/import \{ createClient \} from [^\n]+\n/, 'const createClient=globalThis.__createClient;\n');
const js = esbuild.transformSync(src, { loader: 'ts', format: 'cjs' }).code;

const rate = {}; let rateDown = false, links = 0, sent = [], resendOk = true;
globalThis.__createClient = () => ({
  auth: { admin: { generateLink: async ({ email }) => { links++; return { data: { properties: { email_otp: '123456' } }, error: null }; } } },
  rpc: async (fn, a) => {
    if (fn !== 'rate_hit') return { data: null, error: { message: 'unknown' } };
    if (rateDown) return { data: null, error: { message: 'missing' } };
    const now = Date.now(); let r = rate[a.p_key]; if (!r || r.start < now - a.p_window_secs * 1000) r = rate[a.p_key] = { n: 0, start: now }; r.n++;
    const allowed = r.n <= a.p_limit; return { data: [{ allowed, retry_after: allowed ? 0 : Math.ceil((r.start + a.p_window_secs * 1000 - now) / 1000) }], error: null };
  },
});
globalThis.fetch = async (url, init) => { sent.push(JSON.parse(init.body)); return resendOk ? { ok: true, json: async () => ({}) } : { ok: false, statusText: 'bad', json: async () => ({ message: 'nope' }) }; };
const BASE = { SUPABASE_URL: 'http://x', SUPABASE_SERVICE_ROLE_KEY: 'svc', RESEND_API_KEY: 're_test', RATE_EMAIL_PER_HOUR: '3', RATE_IP_PER_HOUR: '6', RATE_GLOBAL_PER_HOUR: '1000' };
const load = (env) => { globalThis.Deno = { env: { get: k => ({ ...BASE, ...env })[k] }, serve: h => { globalThis.__h = h; } }; new Function('require', 'module', 'exports', js)(require, { exports: {} }, {}); return globalThis.__h; };
load({});
let n = 0;
const call = async (body, ip) => { const r = await globalThis.__h(new Request('http://x/send-auth-email', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip || ('10.1.' + (n >> 8) + '.' + (n++ & 255)) }, body: typeof body === 'string' ? body : JSON.stringify(body) })); return { s: r.status, b: await r.json(), h: r.headers }; };

(async () => {
  let r = await call({ email: 'Pete@Example.com' }); ok(r.s === 200 && r.b.success === true, 'a valid e-mail gets a code');
  ok(sent[0].to[0] === 'pete@example.com', 'address is lower-cased');
  for (const bad of ['', 'nope', 'a@b', 'a b@c.com', '<script>@x.io', 'x"y@z.com', 'a@b.c<d', 'x'.repeat(250) + '@e.com']) { r = await call({ email: bad }); if (r.s !== 400) ok(false, 'accepted a bad address: ' + bad.slice(0, 30)); }
  ok(links === 1, 'invalid addresses never reach the auth admin API or the mailer (' + links + ' link)');
  r = await call('not json'); ok(r.s === 400, 'junk body → 400');
  r = await call({ email: 'o\'brien+x@example.co.uk' }); ok(r.s === 200, 'apostrophes and plus-tags in real addresses are allowed');
  ok(/o&#39;brien\+x@example\.co\.uk/.test(sent[sent.length - 1].html) && !/o'brien\+x@example/.test(sent[sent.length - 1].html), 'the address is HTML-escaped inside the e-mail body');

  // per address: 3 / hour
  const A = 'busy@example.com'; const codes = []; for (let i = 0; i < 5; i++) codes.push((await call({ email: A })).s);
  ok(codes.join() === '200,200,200,429,429', 'per address: 3 per hour then 429: ' + codes.join());
  r = await call({ email: A }); ok(r.b.error === 'rate_limited' && r.b.retryAfter > 0 && r.b.retryAfter <= 3600 && r.h.get('retry-after'), '429 body/headers tell the app when to retry (' + r.b.retryAfter + 's)');
  const before = sent.length; await call({ email: A }); ok(sent.length === before, 'no e-mail is sent when limited');
  ok((await call({ email: 'other@example.com' })).s === 200, 'other addresses are unaffected');

  // per IP: 6 / hour across different addresses
  const IP = '203.0.113.5'; const ip = []; for (let i = 0; i < 8; i++) ip.push((await call({ email: 'ip' + i + '@example.com' }, IP)).s);
  ok(ip.join() === '200,200,200,200,200,200,429,429', 'per IP: 6 per hour then 429: ' + ip.join());
  const linksBefore = links; await call({ email: 'ip9@example.com' }, IP); ok(links === linksBefore, 'a limited call does not even create a sign-in code');

  // global: a hard ceiling for the whole service (here 9 / hour), whoever is asking
  for (const k of Object.keys(rate)) delete rate[k];
  load({ RATE_GLOBAL_PER_HOUR: '9', RATE_IP_PER_HOUR: '100', RATE_EMAIL_PER_HOUR: '100' });
  const g = []; for (let i = 0; i < 12; i++) g.push((await call({ email: 'g' + i + '@example.com' })).s);
  ok(g.slice(0, 9).every(x => x === 200) && g.slice(9).every(x => x === 429), 'global: the whole service is capped at the configured ceiling: ' + g.join());
  load({});

  // fail-open
  for (const k of Object.keys(rate)) delete rate[k]; rateDown = true;
  r = await call({ email: 'fine@example.com' }); ok(r.s === 200, 'if the limiter is unavailable, sign-in still works'); rateDown = false;
  // provider failure is reported as before
  resendOk = false; r = await call({ email: 'down@example.com' }); ok(r.s === 502, 'mail provider failure → 502 (app then falls back)'); resendOk = true;
  r = await globalThis.__h(new Request('http://x/send-auth-email', { method: 'GET' })); ok(r.status === 405, 'GET → 405');
  console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})();
