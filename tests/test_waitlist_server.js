// waitlist-join: double opt-in, consent record, signed unsubscribe, limits, Turnstile order, no address probing, no injection into the e-mail.
const fs = require('fs'); const esbuild = require('esbuild'); const crypto = require('crypto');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
let src = fs.readFileSync('/home/user/Vault-It/supabase/functions/waitlist-join/index.ts', 'utf8');
src = src.replace(/import \{ createClient \} from [^\n]+\n/, 'const createClient=globalThis.__createClient;\n');
const js = esbuild.transformSync(src, { loader: 'ts', format: 'cjs' }).code;

// stand-in database: the three RPCs behave like migration 009 (tested on a real Postgres in test_009.mjs)
const rate = {}, rows = {}, calls = []; let dbDown = false;
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
globalThis.__createClient = () => ({
  rpc: async (fn, a) => {
    calls.push([fn, a]);
    if (fn === 'rate_hit') {
      const now = Date.now(); let r = rate[a.p_key]; if (!r || r.start < now - a.p_window_secs * 1000) r = rate[a.p_key] = { n: 0, start: now }; r.n++;
      const allowed = r.n <= a.p_limit; return { data: [{ allowed, retry_after: allowed ? 0 : 99 }], error: null };
    }
    if (dbDown) return { data: null, error: { message: 'down' } };
    if (fn === 'waitlist_request') {
      const r = rows[a.p_email] || (rows[a.p_email] = { id: crypto.randomUUID(), email: a.p_email, status: 'pending' });
      Object.assign(r, { req: a, confirm_hash: a.p_confirm_hash, status: r.status === 'confirmed' ? 'confirmed' : 'pending' }); return { data: r.id, error: null };
    }
    if (fn === 'waitlist_confirm') {
      const r = Object.values(rows).find((x) => x.confirm_hash && x.confirm_hash === a.p_confirm_hash);
      if (!r) return { data: [], error: null };
      Object.assign(r, { status: 'confirmed', wants_testing: r.req.p_testing, marketing: r.req.p_marketing, confirm_hash: null }); return { data: [{ id: r.id, email: r.email, wants_testing: r.wants_testing, marketing_consent: r.marketing === true, welcome_due: !r.welcome }], error: null };
    }
    if (fn === 'waitlist_mark_welcome') { const r = Object.values(rows).find((x) => x.id === a.p_id); if (!r || r.welcome) return { data: false, error: null }; r.welcome = true; return { data: true, error: null }; }
    if (fn === 'waitlist_unsubscribe') { const r = Object.values(rows).find((x) => x.id === a.p_id); if (r) r.status = 'unsubscribed'; return { data: !!r, error: null }; }
    return { data: null, error: { message: 'unknown ' + fn } };
  },
});
const sent = []; let resendOk = true, verifyMode = 'normal'; const verifyCalls = [];
globalThis.fetch = async (url, init) => {
  if (String(url).includes('turnstile/v0/siteverify')) {
    const f = new URLSearchParams(String(init.body)); verifyCalls.push(f.get('response'));
    if (verifyMode === 'down') throw new Error('network');
    return { ok: true, status: 200, json: async () => (f.get('response') === 'good' ? { success: true, hostname: verifyMode === 'wrongsite' ? 'evil.example' : 'vault-it.co' } : { success: false, 'error-codes': ['invalid-input-response'] }) };
  }
  sent.push(JSON.parse(init.body)); return resendOk ? { ok: true, json: async () => ({}) } : { ok: false, json: async () => ({ message: 'nope' }) };
};
const BASE = { SUPABASE_URL: 'http://x', SUPABASE_SERVICE_ROLE_KEY: 'svc', RESEND_API_KEY: 're_test', PIN_PEPPER: 'pepper', RATE_WAITLIST_EMAIL_PER_HOUR: '3', RATE_WAITLIST_IP_PER_HOUR: '1000' };
const load = (env) => { globalThis.Deno = { env: { get: (k) => ({ ...BASE, ...env })[k] }, serve: (h) => { globalThis.__h = h; } }; new Function('require', 'module', 'exports', js)(require, { exports: {} }, {}); return globalThis.__h; };
load({});
let n = 0;
const call = async (body, ip) => { const r = await globalThis.__h(new Request('http://x/waitlist-join', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip || ('10.2.' + (n >> 8) + '.' + (n++ & 255)) }, body: typeof body === 'string' ? body : JSON.stringify(body) })); return { s: r.status, b: await r.json().catch(() => ({})), h: r.headers }; };
const linkOf = (m) => (m.html.match(/href="(https:\/\/vault-it\.co\/sign-up\/confirm\?t=[^"]+)"/) || [])[1];
const unsubOf = (m) => ((m.html.match(/href="(https:\/\/vault-it\.co\/sign-up\/unsubscribe\?[^"]+)"/) || [])[1] || "").replace(/&amp;/g, "&");

(async () => {
  // join
  let r = await call({ action: 'join', email: 'Pete@Example.com', testing: true, marketing: true, consentVersion: 'signup-2026-10-27', source: 'sign-up',
    utm: { source: 'meta', medium: 'paid<script>', campaign: 'beta-' + 'x'.repeat(300) }, referrer: 'https://l.instagram.com/some/path?fbclid=123', captchaToken: '' });
  ok(r.s === 200 && r.b.success === true, 'a valid sign-up is accepted');
  const req = calls.find((c) => c[0] === 'waitlist_request')[1];
  ok(req.p_email === 'pete@example.com' && req.p_testing === true && req.p_marketing === true, 'address lower-cased; the choices are passed as a REQUEST (applied only on confirmation)');
  ok(req.p_utm_source === 'meta' && req.p_utm_medium === 'paidscript' && req.p_utm_campaign.length === 100, 'campaign tags are cleaned and capped');
  ok(req.p_referrer === 'https://l.instagram.com', 'only the referring site’s origin is kept (no path, no click ids)');
  ok(/^[0-9a-f]{64}$/.test(req.p_confirm_hash), 'only a hash of the confirmation token is stored');
  const m = sent[0]; ok(m && m.to[0] === 'pete@example.com' && /Confirm/.test(m.subject), 'a confirmation e-mail is sent');
  const link = linkOf(m), unsub = unsubOf(m);
  ok(!!link && sha(new URL(link).searchParams.get('t')) === req.p_confirm_hash, 'the e-mailed link carries the token whose hash was stored');
  ok(!!unsub && m.headers['List-Unsubscribe'] === '<' + unsub + '>' && /Remove me/.test(m.text), 'every e-mail has a working unsubscribe link (also as a List-Unsubscribe header)');
  ok(/PT Live Design/.test(m.html) && /hello@vault-it\.co/.test(m.html), 'the e-mail says who is sending it');

  // marketing defaults off; the box must be ticked
  r = await call({ action: 'join', email: 'quiet@example.com', testing: 'yes', marketing: 'true' });
  const q = calls.filter((c) => c[0] === 'waitlist_request').pop()[1]; ok(r.s === 200 && q.p_marketing === false && q.p_testing === false, 'only a real true counts as a choice (no "truthy" opt-in)');
  r = await call({ action: 'join', email: 'q2@example.com', consentVersion: 'made-up' }); ok(calls.filter((c) => c[0] === 'waitlist_request').pop()[1].p_consent_version === 'signup-2026-10-27', 'an unknown consent version is not recorded as given');

  // bad input
  for (const bad of ['', 'nope', 'a@b', '<x>@y.com', 'x"y@z.com', 'x'.repeat(250) + '@e.com']) { r = await call({ action: 'join', email: bad }); if (r.s !== 400) ok(false, 'accepted a bad address: ' + bad.slice(0, 20)); }
  ok(true, 'malformed addresses are refused');
  r = await call('not json'); ok(r.s === 400, 'junk body → 400');
  r = await call({ action: 'drop table' }); ok(r.s === 400, 'unknown action → 400');
  r = await call({ action: 'join', email: "o'brien+x@example.co.uk" }); const last = sent[sent.length - 1];
  ok(r.s === 200 && /o&#39;brien\+x@example\.co\.uk/.test(last.html) && !/o'brien\+x@example/.test(last.html), 'the address is HTML-escaped inside the e-mail');

  // same answer whether the address is new or already on the list
  const a1 = await call({ action: 'join', email: 'same@example.com' }); const a2 = await call({ action: 'join', email: 'same@example.com' });
  ok(a1.s === a2.s && JSON.stringify(a1.b) === JSON.stringify(a2.b), 'a repeat sign-up looks identical (the form cannot be used to test whether someone is on the list)');

  // per mailbox limit (3/h), shared across +tags and Gmail dots
  const codes = []; for (const e of ['v+1@gmail.com', 'v.@gmail.com'.replace('.@', '@'), 'V@googlemail.com', 'v+zz@gmail.com']) codes.push((await call({ action: 'join', email: e })).s);
  ok(codes.join() === '200,200,200,429', 'one inbox, however spelled, gets at most 3 confirmation mails an hour: ' + codes.join());

  // confirm
  r = await call({ action: 'confirm', token: new URL(link).searchParams.get('t') });
  ok(r.s === 200 && r.b.success && r.b.testing === true && rows['pete@example.com'].status === 'confirmed', 'the link confirms the address and returns the tester choice');
  ok(/^https:\/\/vault-it\.co\/sign-up\/unsubscribe\?u=[0-9a-f-]{36}&s=[0-9a-f]{32}$/.test(r.b.unsubscribe), 'the confirmed page gets a signed leave link');
  r = await call({ action: 'confirm', token: new URL(link).searchParams.get('t') }); ok(r.s === 410, 'a used link does not work twice');
  // welcome e-mail (owner, 1 Nov): once, only to people who ticked the marketing box
  const nWel = () => sent.filter((m) => m.subject === 'Why Vault-It exists').length;
  const welcomes = sent.filter((m) => m.subject === 'Why Vault-It exists');
  ok(welcomes.length === 1 && welcomes[0].to[0] === 'pete@example.com' && rows['pete@example.com'].welcome === true, 'confirming with the marketing box ticked sends the welcome once and records it');
  { const t3 = await call({ action: 'join', email: 'pete@example.com', marketing: true, testing: true }).then(() => new URL(linkOf(sent[sent.length - 1])).searchParams.get('t')); const k = nWel(); r = await call({ action: 'confirm', token: t3 }); ok(r.s === 200 && nWel() === k, 'joining and confirming again never sends the welcome a second time'); }
  const w0 = welcomes[0];
  ok(/lockup\.gif/.test(w0.html) && /Not regulated by the FCA\. Not financial advice\./.test(w0.html) && !/[—–]/.test(w0.html + w0.text) && /Why Vault-It exists/.test(w0.html), 'the welcome carries the brand lockup, the FCA line and no dashes');
  ok(/sign-up\/unsubscribe\?u=[0-9a-f-]{36}&(amp;)?s=[0-9a-f]{32}/.test(w0.html) && /sign-up\/unsubscribe/.test(w0.headers['List-Unsubscribe']) && w0.headers['List-Unsubscribe-Post'] === 'List-Unsubscribe=One-Click', 'the welcome has a signed one-click unsubscribe link and header');
  ok(/see what I was working towards/.test(w0.text) && /one more brick/.test(w0.text) && !/built every line|developer/i.test(w0.html + w0.text), 'the story is in the owner\'s words, no bragging');
  ok(w0.reply_to === 'hello@vault-it.co', 'replies reach hello@vault-it.co');
  ok(!/once a week|every week|weekly/i.test(w0.html + w0.text) && /When there is news I will send a short note/.test(w0.text), 'the welcome promises no weekly send that does not exist yet (owner, 1 Nov)');
  ok(!/once a week|every week|weekly/i.test(require('fs').readFileSync(__dirname + '/../docs/marketing/welcome-email.html', 'utf8')), 'the welcome draft in docs/marketing makes no weekly promise either');
  const tok = (email, marketing) => call({ action: 'join', email, marketing, testing: true }).then(() => linkOf(sent[sent.length - 1])).then((l) => new URL(l).searchParams.get('t'));
  const nW = () => sent.filter((m) => m.subject === 'Why Vault-It exists').length;
  let t2 = await tok('nomarketing@example.com', false), c0 = nW();
  r = await call({ action: 'confirm', token: t2 }); ok(r.s === 200 && nW() === c0 && !rows['nomarketing@example.com'].welcome, 'no marketing box ticked: confirmed, but no welcome is sent');
  t2 = await tok('flaky@example.com', true); resendOk = false; r = await call({ action: 'confirm', token: t2 }); resendOk = true;
  ok(r.s === 200 && r.b.success && !rows['flaky@example.com'].welcome, 'a failed welcome send never breaks the confirmation and is not recorded as sent');
  r = await call({ action: 'confirm', token: 'x'.repeat(43) }); ok(r.s === 410, 'an unknown token is refused');
  r = await call({ action: 'confirm', token: '<script>' }); ok(r.s === 400, 'a malformed token is refused before the database');

  // unsubscribe: signed
  const u = new URL(unsub);
  r = await call({ action: 'unsubscribe', id: u.searchParams.get('u'), sig: 'f'.repeat(32) }); ok(r.s === 400 && rows['pete@example.com'].status === 'confirmed', 'a forged signature cannot unsubscribe someone');
  const other = rows['quiet@example.com'].id;
  r = await call({ action: 'unsubscribe', id: other, sig: u.searchParams.get('s') }); ok(r.s === 400, 'one person’s signature does not work for another row');
  r = await call({ action: 'unsubscribe', id: u.searchParams.get('u'), sig: u.searchParams.get('s') }); ok(r.s === 200 && rows['pete@example.com'].status === 'unsubscribed', 'the signed link removes the person');

  // failures are reported, never faked
  dbDown = true; r = await call({ action: 'join', email: 'down@example.com' }); ok(r.s === 500 && !r.b.success, 'a database failure is reported as a failure'); dbDown = false;
  const before = sent.length; resendOk = false; r = await call({ action: 'join', email: 'nomail@example.com' }); ok(r.s === 502 && !r.b.success, 'a mail failure is reported as a failure'); resendOk = true;
  ok(sent.length === before + 1, '(one attempt)');

  // Turnstile on: checked after the per-IP counter and BEFORE the shared counters
  load({ TURNSTILE_SECRET: 'sec' });
  const calls0 = calls.length;
  // no token (the page could not load the check): allowed on a much smaller allowance, still with the e-mailed confirmation link (owner, 1 Nov: testers must never be stuck)
  const sent0 = sent.length, vc0 = verifyCalls.length;
  r = await call({ action: 'join', email: 'blocked@example.com' }, '9.9.9.9'); ok(r.s === 200 && r.b.success, 'with the check on, a request without a token is accepted (the check could not load)');
  ok(sent.length === sent0 + 1 && !!linkOf(sent[sent.length - 1]) && rows['blocked@example.com'].status === 'pending', 'it still gets the confirmation e-mail and stays pending until the link is clicked');
  ok(verifyCalls.length === vc0, 'no token means Cloudflare is not asked');
  const used = calls.slice(calls0).filter((c) => c[0] === 'rate_hit').map((c) => c[1].p_key.split(':')[0]);
  ok(['wl-ip', 'wl-notok-ip', 'wl-notok-all', 'wl-all', 'wl-addr'].every((k) => used.includes(k)), 'a token-less join is counted on its own stricter counters as well as the normal ones: ' + used.join());
  for (let i = 0; i < 4; i++) await call({ action: 'join', email: 'blocked' + i + '@example.com' }, '9.9.9.9');
  r = await call({ action: 'join', email: 'blocked9@example.com' }, '9.9.9.9'); ok(r.s === 429 && r.b.retryAfter > 0, 'a sixth token-less join from one address in an hour is turned away (5 an hour)');
  r = await call({ action: 'join', email: 'blockedother@example.com' }, '9.9.9.10'); ok(r.s === 200, 'another address is not affected');
  r = await call({ action: 'join', email: 'bot@example.com', captchaToken: 'bad' }); ok(r.s === 403 && r.b.error === 'captcha', 'a token that is present but wrong is still refused');
  for (const k of Object.keys(rate)) delete rate[k];
  load({ TURNSTILE_SECRET: 'sec', RATE_WAITLIST_NOTOKEN_GLOBAL_PER_HOUR: '3' });
  for (let i = 0; i < 3; i++) await call({ action: 'join', email: 'g' + i + '@example.com' });
  const calls1 = calls.length; r = await call({ action: 'join', email: 'g9@example.com' }); ok(r.s === 429, 'across everyone, token-less joins are capped (60 an hour; 3 in this test) so a script leaving the token out cannot drain the mail quota');
  ok(!calls.slice(calls1).some((c) => c[0] === 'rate_hit' && /^wl-(all|addr)/.test(c[1].p_key)), 'a capped token-less join does not use the shared or mailbox allowance');
  load({ TURNSTILE_SECRET: 'sec' });
  r = await call({ action: 'join', email: 'human@example.com', captchaToken: 'good' }); ok(r.s === 200, 'a genuine token passes');
  verifyMode = 'wrongsite'; r = await call({ action: 'join', email: 'h2@example.com', captchaToken: 'good' }); ok(r.s === 403, 'a token minted on another site is refused');
  verifyMode = 'down'; r = await call({ action: 'join', email: 'h3@example.com', captchaToken: 'good' }); ok(r.s === 503 && r.b.retryAfter > 0, 'if Cloudflare cannot be asked, the request is refused (503), not waved through'); verifyMode = 'normal';

  // methods
  const opt = await globalThis.__h(new Request('http://x/waitlist-join', { method: 'OPTIONS' })); ok(opt.status === 200, 'CORS preflight answered');
  const g = await globalThis.__h(new Request('http://x/waitlist-join', { method: 'GET' })); ok(g.status === 405, 'GET refused (a link scanner cannot confirm or unsubscribe anyone)');

  console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})();
