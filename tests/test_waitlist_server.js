// waitlist-welcome: validation, saving (repeat address is fine and indistinguishable), the welcome e-mail, abuse limits, fail-soft e-mail.
const fs = require('fs'); const esbuild = require('esbuild');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
let src = fs.readFileSync('/home/user/Vault-It/supabase/functions/waitlist-welcome/index.ts', 'utf8');
src = src.replace(/import \{ createClient \} from [^\n]+\n/, 'const createClient=globalThis.__createClient;\n');
const js = esbuild.transformSync(src, { loader: 'ts', format: 'cjs' }).code;

const rate = {}; let rateDown = false, insertFail = false; const list = new Set(); let sent = [], resendOk = true;
globalThis.__createClient = () => ({
  rpc: async (fn, a) => {
    if (fn !== 'rate_hit') return { data: null, error: { message: 'unknown' } };
    if (rateDown) return { data: null, error: { message: 'missing' } };
    const now = Date.now(); let r = rate[a.p_key]; if (!r || r.start < now - a.p_window_secs * 1000) r = rate[a.p_key] = { n: 0, start: now }; r.n++;
    const allowed = r.n <= a.p_limit; return { data: [{ allowed, retry_after: allowed ? 0 : 60 }], error: null };
  },
  from: (t) => ({ insert: async (row) => {
    if (t !== 'waitlist') return { error: { message: 'wrong table' } };
    if (insertFail) return { error: { code: '500', message: 'db down' } };
    if (list.has(row.email)) return { error: { code: '23505', message: 'duplicate' } };
    list.add(row.email); return { error: null };
  } }),
});
globalThis.fetch = async (url, init) => { sent.push(JSON.parse(init.body)); return resendOk ? { ok: true, json: async () => ({}) } : { ok: false, json: async () => ({ message: 'nope' }) }; };
const BASE = { SUPABASE_URL: 'http://x', SUPABASE_SERVICE_ROLE_KEY: 'svc', RESEND_API_KEY: 're_test', RATE_WL_IP_PER_HOUR: '5', RATE_WL_ADDR_PER_DAY: '2', RATE_WL_GLOBAL_PER_HOUR: '1000' };
const load = (env) => { globalThis.Deno = { env: { get: (k) => ({ ...BASE, ...env })[k] }, serve: (h) => { globalThis.__h = h; } }; new Function('require', 'module', 'exports', js)(require, { exports: {} }, {}); return globalThis.__h; };
load({});
let n = 0;
const call = async (body, ip) => { const r = await globalThis.__h(new Request('http://x/waitlist-welcome', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip || ('10.2.' + (n >> 8) + '.' + (n++ & 255)) }, body: typeof body === 'string' ? body : JSON.stringify(body) })); return { s: r.status, b: await r.json() }; };

(async () => {
  let r = await call({ email: 'New.Tester@Example.com' });
  ok(r.s === 200 && r.b.ok === true && r.b.emailed === true, 'a new address is saved and welcomed');
  ok(list.has('new.tester@example.com'), 'saved lower-cased');
  const m = sent[0];
  ok(m.to[0] === 'new.tester@example.com' && /hello@vault-it\.co/.test(m.from) && m.reply_to === 'hello@vault-it.co', 'sent from hello@ with replies to hello@');
  ok(m.html.includes('https://app.vault-it.co/') && m.text.includes('https://app.vault-it.co/') && /You're in/.test(m.subject), 'the e-mail carries the app link (html and plain text)');
  ok(!/new\.tester@example\.com/i.test(m.html), 'the address is not echoed into the e-mail body');

  r = await call({ email: 'new.tester@example.com' });
  ok(r.s === 200 && r.b.ok === true && r.b.emailed === true && list.size === 1, 'a repeat address gets the same answer (nothing revealed) and the link again');

  for (const bad of ['', 'nope', 'a@b', '<x>@y.io', 'a b@c.com']) { r = await call({ email: bad }); if (r.s !== 400) ok(false, 'accepted a bad address: ' + bad); }
  ok(true, 'bad addresses are refused (400)');
  r = await call('not json'); ok(r.s === 400, 'a malformed body is refused');

  // per-mailbox: 2 a day, however it is spelled (+tags / Gmail dots)
  sent = [];
  await call({ email: 'some.one@gmail.com' }); await call({ email: 'someone+x@gmail.com' });
  r = await call({ email: 'so.me.one@googlemail.com' });
  ok(r.s === 429 && r.b.error === 'rate_limited' && sent.length === 2, 'one inbox gets at most 2 welcomes a day, whatever the spelling');

  // per-IP
  const ip = '203.0.113.9'; let last;
  for (let i = 0; i < 6; i++) last = await call({ email: `p${i}@example.org` }, ip);
  ok(last.s === 429, 'one IP is limited (5 an hour in this test)');

  // fail-soft: e-mail provider down → still saved, emailed:false
  resendOk = false; r = await call({ email: 'later@example.net' }); resendOk = true;
  ok(r.s === 200 && r.b.emailed === false && list.has('later@example.net'), 'if the e-mail fails the address is still saved and the page is told');

  // limiter down → let through; database down → 500 (the page then saves directly)
  rateDown = true; r = await call({ email: 'ok@example.net' }); rateDown = false;
  ok(r.s === 200, 'a limiter outage does not lose sign-ups');
  insertFail = true; r = await call({ email: 'db@example.net' }); insertFail = false;
  ok(r.s === 500, 'a database failure is a 500 (the landing page falls back to saving directly)');

  load({ RESEND_API_KEY: '' }); r = await call({ email: 'nokey@example.net' });
  ok(r.s === 200 && r.b.emailed === false, 'without an e-mail key it still saves');

  r = await globalThis.__h(new Request('http://x/waitlist-welcome', { method: 'GET' })); ok(r.status === 405, 'only POST');
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
})();
