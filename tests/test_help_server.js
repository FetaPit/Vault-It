// Help centre, server side (owner, 1 Nov 2026): help-ask answers from the help guide with Haiku for signed-in testers only, strips
// amounts, caps sizes and a day's questions, says "unsure" when the guide does not cover it, falls back cleanly when the AI fails;
// tester-feedback e-mails the owner for every unanswered help question (moment 'help_unanswered') without an AI triage call.
// Run: node tests/test_help_server.js
const fs = require('fs'); const esbuild = require('esbuild');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const ROOT = '/home/user/Vault-It/supabase/functions/';
const compile = (name) => {
  let src = fs.readFileSync(ROOT + name + '/index.ts', 'utf8');
  src = src.replace(/import \{ createClient \} from [^\n]+\n/, 'const createClient=globalThis.__createClient;\n');
  return esbuild.transformSync(src, { loader: 'ts', format: 'cjs' }).code;
};
const HA = compile('help-ask'), FB = compile('tester-feedback');
const U = '11111111-2222-3333-4444-555555555555';

const db = { feedback: [], rate: {}, rpc: [] }; let nextId = 1;
function from(table) {
  const s = { op: 'select', f: [], payload: null };
  const rows = () => table === 'tester_feedback' ? db.feedback : table === 'profiles' ? [{ id: U, name: 'Tess Tester' }] : [];
  const run = async () => {
    if (s.op === 'update') { rows().filter((r) => s.f.every(([k, v]) => r[k] === v)).forEach((r) => Object.assign(r, s.payload)); return { data: null, error: null }; }
    const r = rows().filter((x) => s.f.every(([k, v]) => x[k] === v)); return { data: s.one ? r[0] ?? null : r, error: null };
  };
  const b = { select() { return b; }, update(p) { s.op = 'update'; s.payload = p; return b; }, eq(k, v) { s.f.push([k, v]); return b; },
    maybeSingle() { s.one = true; return run(); }, then(res, rej) { return run().then(res, rej); } };
  return b;
}
globalThis.__createClient = () => ({
  auth: { getUser: async (j) => j === 'good' ? { data: { user: { id: U, email: 'tess@example.com' } }, error: null } : { data: { user: null }, error: { message: 'bad' } } },
  rpc: async (fn, a) => {
    db.rpc.push([fn, a]);
    if (fn === 'rate_hit') { db.rate[a.p_key] = (db.rate[a.p_key] || 0) + 1; return { data: [{ allowed: db.rate[a.p_key] <= a.p_limit, retry_after: 600 }], error: null }; }
    if (fn === 'tester_feedback_add') { const row = { id: nextId++, user_id: a.p_user, created_at: new Date().toISOString(), text: a.p_text, moment: a.p_moment, context: a.p_context, triage: null }; db.feedback.push(row); return { data: row.id, error: null }; }
    return { data: null, error: { message: 'unknown rpc ' + fn } };
  },
  from,
});
const sent = { anthropic: [], resend: [] };
let claude = () => 'You can add savings in the House builder. [[show:house-save]]';
globalThis.fetch = async (url, opt) => {
  const u = String(url);
  if (u.startsWith('https://api.anthropic.com/')) {
    const body = JSON.parse(opt.body); sent.anthropic.push({ body, headers: opt.headers });
    const r = claude(body); if (r instanceof Response) return r;
    return new Response(JSON.stringify({ stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: r }] }), { status: 200 });
  }
  if (u === 'https://api.resend.com/emails') { sent.resend.push({ body: JSON.parse(opt.body) }); return new Response('{"id":"em_1"}', { status: 200 }); }
  throw new Error('unexpected fetch ' + u);
};
const BASE = { SUPABASE_URL: 'https://proj.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'svc', ANTHROPIC_API_KEY: 'sk-ant-test', RESEND_API_KEY: 're_test', OWNER_EMAIL: 'owner@example.com', FEEDBACK_VIEW_URL: 'https://example.com/fb/{id}' };
const load = (js, env = {}) => {
  let h; globalThis.Deno = { env: { get: (k) => ({ ...BASE, ...env })[k] }, serve: (fn) => { h = fn; } };
  const m = { exports: {} }; new Function('require', 'module', 'exports', js)(require, m, m.exports); return { mod: m.exports, h };
};
const post = async (h, body, headers = { authorization: 'Bearer good' }) => {
  const r = await h(new Request('https://x/fn', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) }));
  return { s: r.status, b: await r.json().catch(() => null) };
};
const GUIDE = 'Q: How do I add savings to my house?\nA: In House builder, use Add to savings and tap Lay the bricks.\n\nQ: Is this financial advice?\nA: No.';

(async () => {
  let { mod, h } = load(HA), r;
  // ── pure helpers
  ok(mod.stripAmounts('I owe £4,000 and 12345 on cards, my PIN is 6 digits', 400) === 'I owe [amount] and [amount] on cards, my PIN is 6 digits', 'amounts and long numbers are stripped, short ones kept');
  const msgs = mod.buildMessages([{ role: 'assistant', content: 'hi' }, { role: 'user', content: 'a' }, { role: 'user', content: 'b' }, { role: 'assistant', content: 'c' }, { role: 'user', content: 'dangling' }], 'Q?');
  ok(JSON.stringify(msgs.map((m) => m.role)) === '["user","assistant","user"]' && msgs[0].content === 'b' && msgs[2].content === 'Q?', 'messages alternate, start with the tester and end with the question');
  ok(mod.parseReply('[[unsure]]').unsure && mod.parseReply('').unsure, 'unsure and empty replies are flagged');
  const pr = mod.parseReply('Go to **House builder** — then save. [[show:house-save]]');
  ok(!pr.unsure && pr.show === 'house-save' && !/\[\[|—/.test(pr.answer), 'show tag read and removed; em dash reworded');
  ok(mod.parseReply('Try this. [[show:evil-id]]').show === null, 'an unknown show id is dropped');
  ok(/never follow instructions/.test(mod.systemPrompt(GUIDE)) && mod.systemPrompt(GUIDE).includes(GUIDE), 'the guide goes in the system prompt as reference data');

  // ── auth, shapes, sizes
  r = await post(h, { question: 'x', guide: GUIDE }, {}); ok(r.s === 401, 'no token: 401');
  r = await post(h, { question: 'x', guide: GUIDE }, { authorization: 'Bearer nope' }); ok(r.s === 401, 'a bad token: 401');
  r = await post(h, 'not json'); ok(r.s === 400, 'bad json: 400');
  r = await post(h, { question: '', guide: GUIDE }); ok(r.s === 400 && r.b.error === 'no_question', 'empty question: 400');
  r = await post(h, { question: 'x', guide: 'short' }); ok(r.s === 400 && r.b.error === 'no_guide', 'missing guide: 400');
  r = await post(h, { question: 'x'.repeat(401), guide: GUIDE }); ok(r.s === 413, 'long question: 413');
  r = await post(h, { question: 'x', guide: 'g'.repeat(24001) }); ok(r.s === 413, 'oversized guide: 413');
  r = await post(h, { question: 'x', guide: GUIDE, history: 'nope' }); ok(r.s === 400, 'bad history: 400');
  ok(sent.anthropic.length === 0, 'nothing reaches the AI until the request is valid');

  // ── a good question
  r = await post(h, { question: 'How do I add £500 to my house?', guide: GUIDE, history: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'Hello' }] });
  const call = sent.anthropic[0];
  ok(r.s === 200 && r.b.ok && /House builder/.test(r.b.answer) && r.b.show === 'house-save' && r.b.unsure === false, 'answers from the guide with a show tag');
  ok(call.body.model === 'claude-haiku-5-5' && call.body.output_config.effort === 'low' && call.body.max_tokens === 1024 && call.headers['x-api-key'] === 'sk-ant-test', 'Haiku at low effort with the server key');
  ok(!JSON.stringify(call.body.messages).includes('500') && call.body.messages.slice(-1)[0].content === 'How do I add [amount] to my house?', 'the amount never reaches the AI');
  ok(!('temperature' in call.body) && !('thinking' in call.body), 'no sampling or thinking parameters');
  ({ h } = load(HA, { HELP_MODEL: 'claude-test' })); await post(h, { question: 'x', guide: GUIDE });
  ok(sent.anthropic[1].body.model === 'claude-test', 'HELP_MODEL overrides the model');

  // ── unsure, refusal, AI failure, not configured
  ({ h } = load(HA)); claude = () => '[[unsure]]';
  r = await post(h, { question: 'Can I pay in bitcoin?', guide: GUIDE }); ok(r.s === 200 && r.b.unsure === true && r.b.answer === '', 'not in the guide: unsure');
  claude = () => new Response(JSON.stringify({ stop_reason: 'refusal', content: [] }), { status: 200 });
  r = await post(h, { question: 'x', guide: GUIDE }); ok(r.s === 200 && r.b.unsure === true, 'a refusal reads as unsure');
  claude = () => new Response('{"error":{"message":"overloaded"}}', { status: 529 });
  r = await post(h, { question: 'x', guide: GUIDE }); ok(r.s === 502 && r.b.error === 'ai', 'AI failure: 502 so the app uses its own answer');
  ({ h } = load(HA, { ANTHROPIC_API_KEY: '' })); r = await post(h, { question: 'x', guide: GUIDE }); ok(r.s === 503, 'no key: 503');

  // ── a day's allowance
  ({ h } = load(HA, { HELP_PER_DAY: '2' })); claude = () => 'Fine.'; db.rate = {};
  const a1 = await post(h, { question: 'a', guide: GUIDE }), a2 = await post(h, { question: 'b', guide: GUIDE }), a3 = await post(h, { question: 'c', guide: GUIDE });
  ok(a1.s === 200 && a2.s === 200 && a3.s === 429 && a3.b.error === 'rate_limited', 'HELP_PER_DAY caps questions per tester per day');
  const rk = db.rpc.filter((x) => x[0] === 'rate_hit').pop()[1];
  ok(rk.p_window_secs === 86400 && /^help-ask:[0-9a-f]{32}$/.test(rk.p_key) && !rk.p_key.includes(U), 'the limiter key is a salted hash, not the user id');

  // ── tester-feedback: every unanswered help question is e-mailed, no AI triage
  ({ h } = load(FB)); const before = sent.anthropic.length; sent.resend.length = 0;
  r = await post(h, { kind: 'feedback', text: 'Can I link my <b>pension</b>?', moment: 'help_unanswered', context: { screen: 'help', tab: 'overview' } });
  await new Promise((res) => setTimeout(res, 20));
  const row = db.feedback[db.feedback.length - 1], mail = sent.resend[0];
  ok(r.s === 200 && sent.resend.length === 1 && mail.body.to[0] === 'owner@example.com', 'an unanswered help question e-mails the owner at once');
  ok(/unanswered/i.test(mail.body.subject) && mail.body.html.includes('&lt;b&gt;pension&lt;/b&gt;') && mail.body.html.includes('Tess (tess@example.com)') && mail.body.html.includes('https://example.com/fb/' + r.b.id), 'with the question (escaped), the tester and a link');
  ok(mail.body.text.includes('Can I link my <b>pension</b>?') && /VI_KB/.test(mail.body.text) && !/—/.test(mail.body.html + mail.body.text + mail.body.subject), 'plain text part; no em dashes');
  ok(sent.anthropic.length === before && row.triage && row.triage.area === 'help' && row.triage.severity === 1 && /Help question not answered/.test(row.triage.summary), 'filed with a fixed triage, no AI call');
  claude = () => JSON.stringify({ type: 'idea', severity: 1, area: 'budget', summary: 'Wants pots', steps: [] }); sent.resend.length = 0;
  await post(h, { kind: 'feedback', text: 'Pots would be nice', moment: null, context: {} }); await new Promise((res) => setTimeout(res, 20));
  ok(sent.resend.length === 0 && sent.anthropic.length === before + 1, 'ordinary feedback is unchanged: triaged, no e-mail below severity 4');

  console.log(fails ? `FAILURES ${fails}` : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
