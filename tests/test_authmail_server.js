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
const verifyCalls = []; let verifyMode = 'normal';
globalThis.fetch = async (url, init) => {
  if (String(url).includes('turnstile/v0/siteverify')) {
    const f = new URLSearchParams(String(init.body)); verifyCalls.push(Object.fromEntries(f));
    if (verifyMode === 'down') throw new Error('network');
    if (verifyMode === 'http500') return { ok: false, status: 500, json: async () => ({}) };
    if (verifyMode === 'badsecret') return { ok: true, status: 200, json: async () => ({ success: false, 'error-codes': ['invalid-input-secret'] }) };
    return { ok: true, status: 200, json: async () => (f.get('response') === 'good-token' ? { success: true } : { success: false, 'error-codes': ['invalid-input-response'] }) };
  }
  sent.push(JSON.parse(init.body)); return resendOk ? { ok: true, json: async () => ({}) } : { ok: false, statusText: 'bad', json: async () => ({ message: 'nope' }) };
};
const BASE = { SUPABASE_URL: 'http://x', SUPABASE_SERVICE_ROLE_KEY: 'svc', RESEND_API_KEY: 're_test', RATE_EMAIL_PER_HOUR: '3', RATE_IP_PER_HOUR: '6', RATE_GLOBAL_PER_HOUR: '1000' };
const load = (env) => { globalThis.Deno = { env: { get: k => ({ ...BASE, ...env })[k] }, serve: h => { globalThis.__h = h; } }; new Function('require', 'module', 'exports', js)(require, { exports: {} }, {}); return globalThis.__h; };
load({});
let n = 0;
const call = async (body, ip) => { const r = await globalThis.__h(new Request('http://x/send-auth-email', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip || ('10.1.' + (n >> 8) + '.' + (n++ & 255)) }, body: typeof body === 'string' ? body : JSON.stringify(body) })); return { s: r.status, b: await r.json(), h: r.headers }; };

(async () => {
  let r = await call({ email: 'Pete@Example.com' }); ok(r.s === 200 && r.b.success === true, 'a valid e-mail gets a code');
  ok(sent[0].to[0] === 'pete@example.com', 'address is lower-cased');
  for (const bad of ['', 'nope', 'a@b', 'a b@c.com', '<script>@x.io', 'x"y@z.com', 'a@b.c<d', 'a/b@c.com', 'jos\u00e9@example.com', 'a@b.c', 'victim+your-account-is-locked-visit.evil.example/x@gmail.com', 'x'.repeat(250) + '@e.com']) { r = await call({ email: bad }); if (r.s !== 400) ok(false, 'accepted a bad address: ' + bad.slice(0, 30)); }
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

  // one mailbox, however it is spelled, shares one budget
  const V = ['victim+a@gmail.com', 'v.i.c.t.i.m@gmail.com', 'Victim@googlemail.com', 'victim+zzz@gmail.com', 'victim@gmail.com']; const vs = [];
  for (const a of V) vs.push((await call({ email: a })).s);
  ok(vs.join() === '200,200,200,429,429', '+tags, Gmail dots and googlemail.com all count against ONE mailbox: ' + vs.join());
  const nv = []; for (const a of ['bob+1@corp.co.uk', 'bob+2@corp.co.uk', 'bob+3@corp.co.uk', 'bob+4@corp.co.uk']) nv.push((await call({ email: a })).s);
  ok(nv.join() === '200,200,200,429', 'plus-tags share one budget on any domain: ' + nv.join());
  const dots = []; for (const a of ['d.o.t@corp.co.uk', 'do.t@corp.co.uk', 'dot@corp.co.uk']) dots.push((await call({ email: a })).s);
  ok(dots.join() === '200,200,200', 'dots only merge on Gmail (elsewhere they are different mailboxes): ' + dots.join());
  ok((await call({ email: 'first.last+tag@sub.example.co.uk' })).s === 200, 'a normal tagged address on a sub-domain is accepted');

  // per IP: 6 / hour across different addresses
  const IP = '203.0.113.5'; const ip = []; for (let i = 0; i < 8; i++) ip.push((await call({ email: 'ip' + i + '@example.com' }, IP)).s);
  ok(ip.join() === '200,200,200,200,200,200,429,429', 'per IP: 6 per hour then 429: ' + ip.join());
  const linksBefore = links; await call({ email: 'ip9@example.com' }, IP); ok(links === linksBefore, 'a limited call does not even create a sign-in code');
  // a flood from one IP with endless fresh addresses writes a bounded number of counter rows (IP is checked first)
  for (const k of Object.keys(rate)) delete rate[k]; const FL = '203.0.113.99';
  for (let i = 0; i < 40; i++) await call({ email: 'flood' + i + '@example.com' }, FL);
  ok(Object.keys(rate).length <= 6 + 2, 'rejected requests do not each create a counter row (' + Object.keys(rate).length + ' rows after 40 requests)');
  // an IPv6 /64 is one customer
  for (const k of Object.keys(rate)) delete rate[k];
  const v6 = []; for (let i = 0; i < 3; i++) v6.push((await call({ email: 'sixa' + i + '@example.com' }, '2001:db8:1:1::' + (i + 1))).s);
  for (let i = 0; i < 4; i++) v6.push((await call({ email: 'sixb' + i + '@example.com' }, '2001:db8:1:1:aaaa:bbbb:cccc:' + (i + 1))).s);
  ok(v6.join() === '200,200,200,200,200,200,429', 'rotating addresses inside one IPv6 /64 does not give new allowances: ' + v6.join());

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
  resendOk = false; r = await call({ email: 'down@example.com' }); ok(r.s === 502, 'mail provider failure → 502 (app then falls back)');
  ok(!/nope|bad/.test(JSON.stringify(r.b)) && r.b.error === 'Could not send the sign-in e-mail', 'upstream error text is not exposed to callers: ' + JSON.stringify(r.b)); resendOk = true;
  r = await globalThis.__h(new Request('http://x/send-auth-email', { method: 'GET' })); ok(r.status === 405, 'GET → 405');

  // ── Turnstile ("are you human") ──
  load({ TURNSTILE_SECRET: 'ts-secret', RATE_GLOBAL_PER_HOUR: '3', RATE_EMAIL_PER_HOUR: '100', RATE_IP_PER_HOUR: '100' }); for (const k of Object.keys(rate)) delete rate[k];
  const mailsBefore = sent.length, linksBefore2 = links;
  r = await call({ email: 'h1@example.com' }); ok(r.s === 403 && r.b.error === 'captcha', 'with a secret configured, a request with no token is refused (403 captcha)');
  r = await call({ email: 'h1@example.com', captchaToken: 'forged' }); ok(r.s === 403 && r.b.error === 'captcha', 'a forged token is refused');
  r = await call({ email: 'h1@example.com', captchaToken: 123 }); ok(r.s === 403, 'a non-string token is refused');
  ok(sent.length === mailsBefore && links === linksBefore2, 'refused requests send no e-mail and create no sign-in code');
  const burst = []; for (let i = 0; i < 30; i++) burst.push((await call({ email: 'bot' + i + '@example.com', captchaToken: 'bad' + i })).s);
  r = await call({ email: 'real@example.com', captchaToken: 'good-token' }, '198.51.100.20'); ok(burst.every(x => x === 403) && r.s === 200, '30 failed attempts do not use up the service-wide allowance (limit 3): a real person still gets in');
  ok(verifyCalls.at(-1).secret === 'ts-secret' && verifyCalls.at(-1).response === 'good-token' && verifyCalls.at(-1).remoteip === '198.51.100.20', 'the token, secret and the caller’s IP are sent to Cloudflare');
  r = await call({ email: 'v6@example.com', captchaToken: 'good-token' }, '2001:db8:aaaa:1::7'); ok(verifyCalls.at(-1).remoteip === '2001:db8:aaaa:1::7', 'an IPv6 caller’s real address (not the /64 key) is what Cloudflare sees');
  const v0 = verifyCalls.length; const lim = []; for (let i = 0; i < 4; i++) lim.push((await call({ email: 'lim' + i + '@example.com', captchaToken: 'good-token' }, '203.0.113.77')).s);
  ok(lim.includes(429) || lim.every(x => x === 200), 'rate limits still apply after the check (' + lim.join() + ')');
  for (const mode of ['down', 'http500', 'badsecret']) { verifyMode = mode; for (const k of Object.keys(rate)) delete rate[k]; r = await call({ email: 'ok-' + mode + '@example.com', captchaToken: 'anything' }); ok(r.s === 200, 'if Cloudflare (' + mode + ') cannot be asked, sign-in still works and the problem is logged'); }
  verifyMode = 'normal';
  load({}); for (const k of Object.keys(rate)) delete rate[k]; const vc = verifyCalls.length;
  r = await call({ email: 'nosecret@example.com' }); ok(r.s === 200 && verifyCalls.length === vc, 'with no secret configured nothing is checked (sign-in works as before)');
  console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})();
