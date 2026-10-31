// tester-feedback and feedback-digest: signed-in testers only, sizes and shapes per the contract (400 / 401 / 413 / 429),
// money and digits stripped from the action trail, feedback stored then triaged by Claude (a bad reply leaves it untriaged and the
// request still succeeds), severity 4 e-mails the owner, the screenshot goes to Claude only with FEEDBACK_VISION=1, events stored;
// the digest refuses a wrong key, the daily e-mail groups by severity with activity totals, the weekly report is stored.
// The database side (limits, checks, RLS, retention) is tested on a real Postgres in test_012.mjs.
const fs = require('fs'); const esbuild = require('esbuild');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const ROOT = '/home/user/Vault-It/supabase/functions/';
const compile = (name) => {
  let src = fs.readFileSync(ROOT + name + '/index.ts', 'utf8');
  src = src.replace(/import \{ createClient \} from [^\n]+\n/, 'const createClient=globalThis.__createClient;\n');
  return { src, js: esbuild.transformSync(src, { loader: 'ts', format: 'cjs' }).code };
};
const FB = compile('tester-feedback'), DG = compile('feedback-digest');

const U = '11111111-2222-3333-4444-555555555555', V = '66666666-7777-8888-9999-000000000000';
const SESSION = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
// ── a small in-memory stand-in for the service-role client
const db = { feedback: [], events: [], reports: [], profiles: { [U]: { id: U, name: 'Tess Tester' } }, emails: { [U]: 'tess@example.com', [V]: 'vic@example.com' }, rpc: [] };
let nextId = 1;
const reset = () => { db.feedback = []; db.events = []; db.reports = []; db.rpc = []; };
const match = (row, f) => f.every(([op, k, v]) => op === 'eq' ? row[k] === v : op === 'is' ? (row[k] ?? null) === v : op === 'gte' ? row[k] >= v : op === 'lt' ? row[k] < v : op === 'in' ? v.includes(row[k]) : true);
const tableRows = (t) => t === 'tester_feedback' ? db.feedback : t === 'profiles' ? Object.values(db.profiles) : t === 'feedback_reports' ? db.reports : [];
function from(table) {
  const s = { op: 'select', f: [], payload: null, one: false, limit: Infinity };
  const run = async () => {
    if (s.op === 'insert') { const row = { id: nextId++, created_at: new Date().toISOString(), ...s.payload }; if (table === 'feedback_reports') db.reports.push(row); return { data: s.one ? { id: row.id } : [row], error: null }; }
    if (s.op === 'update') { for (const r of tableRows(table).filter((r) => match(r, s.f))) Object.assign(r, s.payload); return { data: null, error: null }; }
    const rows = tableRows(table).filter((r) => match(r, s.f)).slice(0, s.limit).map((r) => ({ ...r }));
    return { data: s.one ? rows[0] ?? null : rows, error: null };
  };
  const b = {
    select() { return b; }, insert(p) { s.op = 'insert'; s.payload = p; return b; }, update(p) { s.op = 'update'; s.payload = p; return b; },
    eq(k, v) { s.f.push(['eq', k, v]); return b; }, is(k, v) { s.f.push(['is', k, v]); return b; }, gte(k, v) { s.f.push(['gte', k, v]); return b; },
    lt(k, v) { s.f.push(['lt', k, v]); return b; }, in(k, v) { s.f.push(['in', k, v]); return b; }, order() { return b; }, limit(n) { s.limit = n; return b; },
    single() { s.one = true; return run(); }, maybeSingle() { s.one = true; return run(); }, then(res, rej) { return run().then(res, rej); },
  };
  return b;
}
const ACTIVITY = { testers: 3, sessions: 7, events: 120, median_session_ms: 250000, errors: 2,
  screens: [{ tab: 'budget', n: 30 }, { tab: 'house', n: 12 }, { tab: 'overview', n: 9 }, { tab: 'debts', n: 4 }, { tab: 'settings', n: 1 }], features: [{ name: 'budget saved', n: 5 }] };
globalThis.__createClient = () => ({
  auth: {
    getUser: async (j) => j === 'good' ? { data: { user: { id: U, email: 'tess@example.com' } }, error: null } : j === 'good2' ? { data: { user: { id: V, email: 'vic@example.com' } }, error: null } : { data: { user: null }, error: { message: 'bad jwt' } },
    admin: { getUserById: async (id) => ({ data: { user: db.emails[id] ? { email: db.emails[id] } : null }, error: null }) },
  },
  rpc: async (fn, a) => {
    db.rpc.push([fn, a]);
    if (fn === 'tester_feedback_add') {
      const n = db.feedback.filter((r) => r.user_id === a.p_user && Date.now() - Date.parse(r.created_at) < 86400e3).length;
      if (n >= a.p_max) return { data: null, error: null };
      const row = { id: nextId++, user_id: a.p_user, created_at: new Date().toISOString(), text: a.p_text, rating: a.p_rating, moment: a.p_moment, screenshot: a.p_screenshot, context: a.p_context, question: a.p_question ?? null, choice: a.p_choice ?? null, survey: a.p_survey ?? null, answers: a.p_answers ?? null, triage: null, triaged_at: null, status: 'new' };
      db.feedback.push(row); return { data: row.id, error: null };
    }
    if (fn === 'tester_events_add') {
      const batches = new Set(db.events.filter((e) => e.user_id === a.p_user).map((e) => e.batch)).size;
      if (batches >= a.p_max) return { data: -1, error: null };
      const batch = nextId++; for (const e of a.p_events) db.events.push({ ...e, user_id: a.p_user, session_id: a.p_session, batch });
      return { data: a.p_events.length, error: null };
    }
    if (fn === 'tester_activity') return { data: ACTIVITY, error: null };
    if (fn === 'tester_retention') return { data: { events_deleted: 2, screenshots_removed: 1 }, error: null };
    return { data: null, error: { message: 'unknown rpc ' + fn } };
  },
  from,
});

// ── outside services
const sent = { anthropic: [], resend: [] };
let claude = () => ({ type: 'bug', severity: 2, area: 'Budget', summary: 'Bills tab froze after saving', steps: ['Open Budget', 'Save a bill'] });
globalThis.fetch = async (url, opt) => {
  const u = String(url);
  if (u.startsWith('https://api.anthropic.com/')) {
    const body = JSON.parse(opt.body); sent.anthropic.push({ body, headers: opt.headers });
    const r = claude(body);
    if (r instanceof Response) return r;
    return new Response(JSON.stringify({ stop_reason: 'end_turn', content: [{ type: 'text', text: typeof r === 'string' ? r : JSON.stringify(r) }] }), { status: 200 });
  }
  if (u === 'https://api.resend.com/emails') { sent.resend.push({ body: JSON.parse(opt.body), headers: opt.headers }); return new Response('{"id":"em_1"}', { status: 200 }); }
  throw new Error('unexpected fetch ' + u);
};

const BASE = { SUPABASE_URL: 'https://proj.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'svc', ANTHROPIC_API_KEY: 'sk-ant-test', RESEND_API_KEY: 're_test', OWNER_EMAIL: 'owner@example.com', FEEDBACK_DIGEST_KEY: 'digest-key-123', FEEDBACK_VIEW_URL: 'https://example.com/fb/{id}' };
const load = (c, env = {}) => {
  let h; globalThis.Deno = { env: { get: (k) => ({ ...BASE, ...env })[k] }, serve: (fn) => { h = fn; } };
  const m = { exports: {} }; new Function('require', 'module', 'exports', c.js)(require, m, m.exports); return { mod: m.exports, h };
};
const post = async (h, body, headers = { authorization: 'Bearer good' }, method = 'POST') => {
  const r = await h(new Request('https://x/fn', { method, headers: { 'content-type': 'application/json', ...headers }, body: method === 'POST' ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined }));
  return { s: r.status, b: await r.json().catch(() => null) };
};
const SHOT = 'data:image/jpeg;base64,' + 'QUJD'.repeat(10);
const good = (o = {}) => ({ kind: 'feedback', text: 'The bills tab froze when I saved', rating: null, moment: null, screenshot: SHOT,
  context: { version: '0.9.1', screen: { tab: 'budget', sub: 'bills' }, theme: 'night', trail: [{ t: 1, ev: 'click', tab: 'budget', el: 'Pay £250.00 now' }, { t: 2, ev: 'click', tab: 'budget', el: 'Debt 3 of 5' }, { t: 3, ev: 'click', tab: 'budget', el: 'btn-save' }], errors: ['£12.50 is wrong at line 40'] }, ...o });

(async () => {
  let { mod, h } = load(FB), r;
  // ── auth
  r = await post(h, good(), {}); ok(r.s === 401, 'no token: 401');
  r = await post(h, good(), { authorization: 'Bearer nope' }); ok(r.s === 401, 'a bad token: 401');
  ok(db.rpc.length === 0 && sent.anthropic.length === 0, 'nothing stored and no AI call before the tester is known');
  r = await post(h, null, { authorization: 'Bearer good' }, 'GET'); ok(r.s === 405, 'GET refused');

  // ── 400s
  const st = async (body) => (await post(h, body)).s;
  ok(await st('{not json') === 400, 'bad JSON: 400');
  ok(await st({ kind: 'other' }) === 400, 'unknown kind: 400');
  ok(await st(good({ text: 42 })) === 400, 'text that is not a string: 400');
  ok(await st(good({ text: '   ' })) === 400, 'empty text and no rating: 400');
  ok(await st(good({ rating: 6 })) === 400 && await st(good({ rating: 2.5 })) === 400, 'rating outside 1 to 5, or not whole: 400');
  ok(await st(good({ text: '', rating: null, choice: '' })) === 400, 'no text, rating or choice: 400');
  ok(await st(good({ question: 'Trust Numbers' })) === 400 && await st(good({ question: 'q'.repeat(41) })) === 400, 'a question id that is not [a-z0-9_] up to 40: 400');
  ok(await st(good({ choice: 'x'.repeat(61) })) === 400 && await st(good({ choice: 3 })) === 400, 'a choice over 60 characters or not a string: 400');
  const sv = (o) => ({ kind: 'survey', survey: 'day14', answers: [{ q: 'disappointed', choice: 'Very disappointed' }], context: { screen: 'overview' }, ...o });
  ok(await st(sv({ survey: 'Day 14' })) === 400, 'a survey id with odd characters: 400');
  ok(await st(sv({ answers: [] })) === 400 && await st(sv({ answers: 'yes' })) === 400, 'a survey with no answers: 400');
  ok(await st(sv({ answers: [{ choice: 'x' }] })) === 400 && await st(sv({ answers: [{ q: 'a' }] })) === 400, 'an answer with no question id, or nothing answered: 400');
  ok(await st(sv({ answers: [{ q: 'nps', score: 11 }] })) === 400 && await st(sv({ answers: [{ q: 'nps', score: 7.5 }] })) === 400, 'a score outside 0 to 10, or not whole: 400');
  ok(await st(sv({ answers: [{ q: 'a', choice: 'x'.repeat(61) }] })) === 400, 'an answer choice over 60 characters: 400');
  ok(await st(good({ moment: 'two words' })) === 400, 'a moment name with odd characters: 400');
  ok(await st(good({ screenshot: 'data:image/png;base64,QUJD' })) === 400 && await st(good({ screenshot: SHOT + '<script>' })) === 400, 'a screenshot that is not a JPEG base64 data URL: 400');
  ok(await st(good({ context: [1, 2] })) === 400, 'context that is not an object: 400');
  ok(await st({ kind: 'events', session: 'not-a-uuid', events: [{ ev: 'tab' }] }) === 400, 'events with a bad session id: 400');
  ok(await st({ kind: 'events', session: SESSION, events: [] }) === 400, 'an empty batch: 400');
  ok(await st({ kind: 'events', session: SESSION, events: [{ ev: 'keystroke' }] }) === 400, 'an unknown event type: 400');
  ok(await st({ kind: 'events', session: SESSION, events: [{ ev: 'tab', ms: 'long' }] }) === 400, 'a duration that is not a number: 400');
  ok(db.rpc.length === 0 && sent.anthropic.length === 0, 'bad bodies store nothing and cost nothing');

  // ── 413s
  ok(await st(good({ text: 'x'.repeat(4001) })) === 413, 'text over 4,000 characters: 413');
  ok(await st(good({ screenshot: 'data:image/jpeg;base64,' + 'A'.repeat(716800) })) === 413, 'a screenshot over 700 KB: 413');
  ok(await st(good({ context: { blob: 'x'.repeat(33000) } })) === 413, 'context over 32 KB: 413');
  ok(await st(good({ text: 'ok', pad: 'x'.repeat(830000) })) === 413, 'a request body over the cap: 413');
  ok(await st({ kind: 'events', session: SESSION, events: Array.from({ length: 201 }, () => ({ ev: 'tab' })) }) === 413, 'more than 200 events: 413');
  ok(await st({ kind: 'survey', survey: 'day3', answers: Array.from({ length: 9 }, (_, i) => ({ q: 'q' + i, score: 5 })) }) === 413, 'more than 8 survey answers: 413');
  ok(await st({ kind: 'survey', survey: 'day3', answers: [{ q: 'why', text: 'x'.repeat(1001) }] }) === 413, 'a survey answer over 1,000 characters: 413');
  ok(db.rpc.length === 0, 'oversized bodies store nothing');

  // ── a good feedback: stored, then triaged
  r = await post(h, good());
  const row = db.feedback[0];
  ok(r.s === 200 && r.b.ok === true && r.b.id === row.id, 'good feedback: 200 {ok, id}');
  ok(row.user_id === U && row.text === 'The bills tab froze when I saved' && row.screenshot === SHOT && db.rpc[0][1].p_max === 20, 'stored for the signed-in tester, with the screenshot, 20 a day');
  ok(row.triage && row.triage.type === 'bug' && row.triage.severity === 2 && row.triage.area === 'budget' && row.triaged_at, 'then triaged and the triage stored: ' + JSON.stringify(row.triage));
  ok(row.triage.model === 'claude-haiku-5-5', 'the default triage model is recorded');
  const req = sent.anthropic[0];
  ok(req.body.model === 'claude-haiku-5-5' && req.body.output_config.format.type === 'json_schema' && req.headers['x-api-key'] === 'sk-ant-test', 'one Messages call asking for JSON that matches the schema');
  ok(!req.body.messages[0].content.some((c) => c.type === 'image'), 'the screenshot is not sent to Claude by default');
  const els = row.context.trail.map((x) => x.el);
  ok(els[0] === 'Pay now' && els[1] === 'Debt of' && els[2] === 'btn-save', 'trail labels: amounts and digits stripped before storing: ' + JSON.stringify(els));
  ok(row.context.errors[0] === '[amount] is wrong at line #', 'page errors lose amounts and digits: ' + row.context.errors[0]);
  const prompt = req.body.messages[0].content.find((c) => c.type === 'text').text;
  ok(!/£|250|12\.50/.test(prompt) && prompt.includes('<feedback>') && prompt.includes('btn-save'), 'the triage prompt carries the trail without figures, the text fenced as data');
  ok(sent.resend.length === 0, 'severity 2: no e-mail');
  ok(!JSON.stringify(r.b).includes('sk-ant'), 'the answer never carries a key');

  // ── a bad AI reply leaves the row untriaged and the request still succeeds
  claude = () => 'Sorry, I cannot help with that.';
  r = await post(h, good({ text: 'Second note' })); let last = db.feedback[db.feedback.length - 1];
  ok(r.s === 200 && r.b.ok && last.triage === null && last.triaged_at === null, 'a malformed reply: stored, untriaged, still 200');
  claude = () => ({ type: 'bug', severity: 'high', area: 'x', summary: '', steps: [] });
  r = await post(h, good({ text: 'Third note' })); last = db.feedback[db.feedback.length - 1];
  ok(r.s === 200 && last.triage === null, 'a reply with no usable severity or summary is not stored as triage');
  claude = () => new Response(JSON.stringify({ error: { type: 'overloaded_error', message: 'Overloaded' } }), { status: 529 });
  r = await post(h, good({ text: 'Fourth note' })); last = db.feedback[db.feedback.length - 1];
  ok(r.s === 200 && last.triage === null, 'the AI service failing: stored, untriaged, still 200');
  claude = () => new Response(JSON.stringify({ stop_reason: 'refusal', content: [] }), { status: 200 });
  r = await post(h, good({ text: 'Fifth note' })); last = db.feedback[db.feedback.length - 1];
  ok(r.s === 200 && last.triage === null, 'a refusal: stored, untriaged, still 200');
  ({ h } = load(FB, { ANTHROPIC_API_KEY: '' }));
  const calls0 = sent.anthropic.length;
  r = await post(h, good({ text: 'No key note' })); last = db.feedback[db.feedback.length - 1];
  ok(r.s === 200 && last.triage === null && sent.anthropic.length === calls0, 'without ANTHROPIC_API_KEY feedback is still stored (for the digest)');

  // ── severity 4 e-mails the owner straight away
  ({ h } = load(FB));
  claude = () => ({ type: 'bug', severity: 4, area: 'sync', summary: 'Budget vanished after signing in on a new phone', steps: ['Sign in on a second device', 'Open Budget'] });
  r = await post(h, good({ text: 'All my budget <b>disappeared</b>' }));
  const mail = sent.resend[0];
  ok(r.s === 200 && sent.resend.length === 1 && mail.body.to[0] === 'owner@example.com' && mail.headers.Authorization === 'Bearer re_test', 'severity 4: the owner is e-mailed at once');
  ok(/urgent/i.test(mail.body.subject) && mail.body.subject.includes('Budget vanished'), 'subject says urgent with the summary: ' + mail.body.subject);
  ok(mail.body.html.includes('Tess (tess@example.com)') && mail.body.html.includes('budget / bills') && mail.body.html.includes('https://example.com/fb/' + r.b.id), 'with the tester first name, screen and link');
  ok(mail.body.html.includes('&lt;b&gt;disappeared&lt;/b&gt;') && !mail.body.html.includes('<b>disappeared'), 'the tester text is escaped in the e-mail');
  ok(mail.body.text.includes('Likely steps') && !/\u2014/.test(mail.body.html + mail.body.text + mail.body.subject), 'plain text part with steps; no em dashes');
  claude = () => ({ type: 'bug', severity: 3, area: 'house builder', summary: 'Level 2 will not open', steps: [] });
  await post(h, good({ text: 'Level 2 is stuck' }));
  ok(sent.resend.length === 1, 'severity 3: no urgent e-mail');

  // ── vision and model only from env
  ({ h } = load(FB, { FEEDBACK_VISION: '1', FEEDBACK_MODEL: 'claude-test-model' }));
  await post(h, good({ text: 'With a picture' }));
  const vreq = sent.anthropic[sent.anthropic.length - 1].body;
  ok(vreq.model === 'claude-test-model' && vreq.messages[0].content[0].type === 'image' && vreq.messages[0].content[0].source.data === SHOT.slice(23), 'FEEDBACK_VISION=1 sends the screenshot; FEEDBACK_MODEL picks the model');

  // ── rating alone, choice alone, targeted question
  ({ h } = load(FB));
  claude = () => ({ type: 'praise', severity: 1, area: 'budget', summary: 'Happy with the first budget', steps: [] });
  r = await post(h, { kind: 'feedback', text: '', rating: 5, moment: 'first_budget', screenshot: null, context: null });
  ok(r.s === 200 && db.feedback[db.feedback.length - 1].rating === 5 && db.feedback[db.feedback.length - 1].moment === 'first_budget', 'a rating alone after a key moment is accepted');
  r = await post(h, { kind: 'feedback', text: '', rating: 3, screenshot: null });
  ok(r.s === 200, 'a rating alone with no moment is accepted (owner, 31 Oct)');
  r = await post(h, { kind: 'feedback', text: '', question: 'trust_numbers', choice: '  Not   really ', context: { screen: 'overview' } });
  last = db.feedback[db.feedback.length - 1];
  ok(r.s === 200 && last.question === 'trust_numbers' && last.choice === 'Not really' && last.text === '' && db.rpc[db.rpc.length - 1][1].p_question === 'trust_numbers', 'a targeted question answered by a choice alone is stored with question and choice');
  const qp = sent.anthropic[sent.anthropic.length - 1].body.messages[0].content.find((c) => c.type === 'text').text;
  ok(qp.includes('Targeted question: trust_numbers') && qp.includes('Option picked: Not really'), 'the triage prompt includes the question and the option picked');

  // ── a survey: one row, triaged with sentiment and an honest takeaway
  claude = (body) => ({ type: 'confusion', severity: 1, area: 'overview', summary: 'Would be somewhat disappointed', steps: [], sentiment: '-1', honest_takeaway: 'Likes it but does not yet trust the forecast' });
  r = await post(h, { kind: 'survey', survey: 'day14', answers: [{ q: 'disappointed', choice: 'Somewhat disappointed' }, { q: 'recommend', score: 6 }, { q: 'missing', text: 'A clearer forecast. It said £3,000 short' }], context: { screen: 'overview', trail: [{ el: 'Close £20 tip' }] } });
  last = db.feedback[db.feedback.length - 1];
  ok(r.s === 200 && r.b.id === last.id && last.survey === 'day14' && last.answers.length === 3 && last.answers[1].score === 6, 'a survey is stored as one row with survey and answers');
  ok(last.text.startsWith('disappointed: Somewhat disappointed') && last.text.includes('recommend: 6/10') && last.rating === null && last.screenshot === null, 'its text is a short joined summary for search');
  ok(last.context.trail[0].el === 'Close tip', 'the survey context trail is cleaned too');
  const sreq = sent.anthropic[sent.anthropic.length - 1].body;
  ok(sreq.output_config.format.schema.required.includes('sentiment') && sreq.output_config.format.schema.required.includes('honest_takeaway') && sreq.messages[0].content[0].text.includes('<survey id="day14">'), 'survey triage asks for the same JSON plus sentiment and honest_takeaway');
  ok(/severity 1 unless/.test(sreq.system), 'the prompt says a survey is severity 1 unless something is broken or untrustworthy');
  ok(last.triage.sentiment === -1 && last.triage.honest_takeaway === 'Likes it but does not yet trust the forecast' && last.triage.severity === 1, 'sentiment and takeaway stored: ' + JSON.stringify(last.triage));
  ok(mod.parseTriage({ type: 'bug', severity: 2, summary: 'x', sentiment: 7 }, true).sentiment === 2 && mod.parseTriage({ type: 'bug', severity: 2, summary: 'x' }, true).sentiment === 0 && mod.parseTriage({ type: 'bug', severity: 2, summary: 'x', sentiment: 1 }).sentiment === undefined, 'sentiment clamped to -2..2, only on surveys');

  // ── 429: 20 feedback a day
  reset(); claude = () => ({ type: 'idea', severity: 1, area: 'overview', summary: 'Nice', steps: [] });
  for (let i = 0; i < 19; i++) await post(h, good({ text: 'n' + i }));
  r = await post(h, { kind: 'survey', survey: 'day3', answers: [{ q: 'confusing', choice: 'Nothing' }] }); ok(r.s === 200, 'the 20th of the day can be a survey');
  r = await post(h, { kind: 'survey', survey: 'day3', answers: [{ q: 'confusing', choice: 'Nothing' }] }); ok(r.s === 429, 'surveys share the daily limit');
  const aiBefore = sent.anthropic.length;
  r = await post(h, good({ text: 'one too many' }));
  ok(r.s === 429 && r.b.error === 'rate_limited' && db.feedback.length === 20 && sent.anthropic.length === aiBefore, 'the 21st feedback in a day: 429, nothing stored, no AI call');
  r = await post(h, good({ text: 'someone else' }), { authorization: 'Bearer good2' }); ok(r.s === 200, 'another tester is not affected');

  // ── events
  const now = Date.now();
  r = await post(h, { kind: 'events', session: SESSION.toUpperCase(), events: [
    { t: now, ev: 'session_start' }, { t: now, ev: 'tab', tab: 'budget', ms: 4200.4 },
    { t: now - 30 * 86400e3, ev: 'feature', el: 'Saved £1,250.00 budget' }, { ev: 'session_end', ms: 9e9 }, { t: now, ev: 'error', el: 'TypeError 42' }] });
  ok(r.s === 200 && r.b.ok && r.b.n === 5 && db.events.length === 5, 'a batch of events is stored: {ok, n}');
  ok(db.events[0].session_id === SESSION && db.events[1].ms === 4200 && db.events[3].ms === 604800000, 'session id normalised, durations whole and capped');
  ok(db.events[2].el === 'Saved budget' && db.events[4].el === 'TypeError', 'event labels lose amounts and digits: ' + db.events[2].el);
  ok(Math.abs(Date.parse(db.events[2].at) - now) < 60000 && Date.parse(db.events[0].at) === now, 'an unbelievable device time is replaced by the server time');
  for (let i = 1; i < 60; i++) await post(h, { kind: 'events', session: SESSION, events: [{ ev: 'tab', tab: 'house' }] });
  r = await post(h, { kind: 'events', session: SESSION, events: [{ ev: 'tab', tab: 'house' }] });
  ok(r.s === 429 && db.rpc.filter((c) => c[0] === 'tester_events_add').every((c) => c[1].p_max === 60), 'the 61st batch in an hour: 429');

  // ── waitUntil: the tester gets the answer before the AI is asked
  let pending = null; globalThis.EdgeRuntime = { waitUntil: (p) => { pending = p; } };
  claude = () => ({ type: 'confusion', severity: 2, area: 'house builder', summary: 'Unsure what bricks mean', steps: [] });
  r = await post(h, good({ text: 'What do bricks mean?' }), { authorization: 'Bearer good2' });
  const wrow = db.feedback.find((x) => x.id === r.b.id);
  ok(r.s === 200 && pending, 'with EdgeRuntime the triage runs after the answer');
  await pending; ok(wrow.triage && wrow.triage.type === 'confusion', 'and is stored when it finishes');
  delete globalThis.EdgeRuntime;

  // ── pure helpers
  const p = mod.parseTriage;
  ok(p({ type: 'BUG', severity: 9, area: 'Sign In', summary: 'x', steps: 'one step' }).severity === 4 && p({ type: 'BUG', severity: 9, area: 'Sign In', summary: 'x', steps: 'one step' }).type === 'bug', 'parseTriage: severity clamped to 4, type lower-cased');
  ok(p('{"type":"weird","severity":"2","summary":"y"}').type === 'other' && p('{"type":"weird","severity":"2","summary":"y"}').severity === 2 && p('{"type":"weird","severity":"2","summary":"y"}').area === 'general', 'unknown type becomes other, a numeric string severity is read, a missing area is general');
  ok(p('Here it is: {"type":"praise","severity":0,"summary":"Lovely","steps":[]}').severity === 1, 'JSON inside text is accepted; severity 0 clamped to 1');
  ok(p('{"type":"bug","severity":3,"summary":"Shows £1,200 instead of £1,300"}').summary === 'Shows [amount] instead of [amount]', 'amounts in the summary are removed');
  ok(p('not json') === null && p({ severity: 2 }) === null && p([]) === null, 'unusable replies give null');
  ok(mod.cleanLabel('£5k left') === 'left' && mod.cleanLabel('12 months') === 'months' && mod.cleanLabel('') === null, 'cleanLabel strips amounts and digits');
  { const c = mod.cleanContext({ trail: [{ t: '2026-10-31T20:00:00.000Z', ev: 'tab', tab: 'budget', el: 'Save' }], errors: [{ t: '2026-10-31T20:00:01.000Z', msg: 'bad value 3217.50 at row 987', src: 'index.html:28630' }, 'oops £12 then 44'] });
    ok(c.trail[0].t === '2026-10-31T20:00:00.000Z', 'cleanContext keeps the trail time the app sends (ISO text)');
    ok(!/\d/.test(c.errors[0].msg) && c.errors[0].src === 'index.html:28630' && !/\d/.test(c.errors[1]), 'cleanContext strips every digit from error messages, keeps the source line'); }
  const blk = (s) => s.slice(s.indexOf('// <<TRIAGE'), s.indexOf('// TRIAGE>>'));
  ok(blk(FB.src).length > 1000 && blk(FB.src) === blk(DG.src), 'the triage block is identical in both functions');
  ok(!/\u2014/.test(FB.src + DG.src), 'no em dashes in either function');

  // ══ feedback-digest
  let d = load(DG); const dh = d.h, dm = d.mod;
  r = await post(dh, { mode: 'daily' }, {}); ok(r.s === 401, 'digest: no key, 401');
  r = await post(dh, { mode: 'daily' }, { 'x-digest-key': 'digest-key-12' }); ok(r.s === 401, 'digest: a wrong key, 401');
  r = await post(dh, { mode: 'daily' }, { authorization: 'Bearer digest-key-123' }); ok(r.s === 401, 'digest: the key in the wrong header, 401');
  r = await post(load(DG, { FEEDBACK_DIGEST_KEY: '' }).h, { mode: 'daily' }, { 'x-digest-key': '' }); ok(r.s === 503, 'digest: with no key configured it refuses everything');
  ok(await dm.sameKey('abc', 'abc') === true && await dm.sameKey('abc', 'abd') === false && await dm.sameKey('', '') === false, 'sameKey');
  const K = { 'x-digest-key': 'digest-key-123' };
  r = await post(dh, { mode: 'monthly' }, K); ok(r.s === 400, 'digest: unknown mode, 400');

  // daily
  reset(); sent.resend = []; sent.anthropic = [];
  const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString();
  const T = (o) => ({ type: 'bug', severity: 2, area: 'budget', summary: 's', steps: [], ...o });
  db.feedback.push(
    { id: 101, user_id: U, created_at: ago(3), text: 'Lost all my debts', rating: null, moment: null, context: { screen: { tab: 'debts', sub: 'cards' } }, triage: T({ severity: 4, area: 'sync', summary: 'Debts vanished after sync' }), triaged_at: ago(3), status: 'new', screenshot: SHOT },
    { id: 102, user_id: V, created_at: ago(5), text: 'Love the house <script>x</script>', rating: 5, moment: 'level_done', context: { screen: 'house' }, triage: T({ type: 'praise', severity: 1, area: 'house builder', summary: 'Enjoys the house builder' }), triaged_at: ago(5), status: 'new' },
    { id: 103, user_id: U, created_at: ago(1), text: 'Cannot find where to add a bill', rating: null, moment: null, context: { screen: { tab: 'budget', sub: 'bills' } }, triage: null, triaged_at: null, status: 'new' },
    { id: 104, user_id: U, created_at: ago(30), text: 'Old one', rating: null, moment: null, context: {}, triage: T({ summary: 'Yesterday item' }), triaged_at: ago(30), status: 'new' },
  );
  const SV = (id, uid, survey, answers, tri) => ({ id, user_id: uid, created_at: ago(2), text: 'survey', rating: null, moment: null, context: {}, triage: tri, triaged_at: ago(2), status: 'new', survey, answers });
  db.feedback.push(
    SV(111, U, 'day14', [{ q: 'disappointed', choice: 'Very disappointed' }, { q: 'recommend', score: 9 }], T({ type: 'praise', severity: 1, summary: 'Keen', sentiment: 2, honest_takeaway: 'Would miss it badly' })),
    SV(112, V, 'day14', [{ q: 'disappointed', choice: 'Very disappointed' }, { q: 'recommend', score: 6 }], T({ type: 'praise', severity: 1, summary: 'Keen too', sentiment: 1, honest_takeaway: 'Uses it weekly' })),
    SV(113, V, 'day14', [{ q: 'disappointed', choice: 'Somewhat disappointed' }, { q: 'missing', text: 'Bank sync' }], T({ type: 'idea', severity: 1, summary: 'Wants bank sync', sentiment: 0, honest_takeaway: 'Wants bank sync' })),
    SV(114, U, 'day3', [{ q: 'confusing', choice: 'The house builder' }], T({ type: 'confusion', severity: 2, area: 'house builder', summary: 'House builder confusing on day 3', sentiment: -1, honest_takeaway: 'Lost in the house builder' })),
    { id: 115, user_id: V, created_at: ago(2), text: '', rating: null, moment: null, context: {}, triage: T({ type: 'other', severity: 1, summary: 'Trusts numbers mostly' }), triaged_at: ago(2), status: 'new', question: 'trust_numbers', choice: 'Mostly' },
    { id: 116, user_id: U, created_at: ago(2), text: 'The forecast feels off', rating: null, moment: null, context: {}, triage: T({ type: 'confusion', severity: 1, summary: 'Doubts the forecast' }), triaged_at: ago(2), status: 'new', question: 'trust_numbers', choice: 'Not really' },
    { id: 117, user_id: U, created_at: ago(2), text: '', rating: null, moment: null, context: {}, triage: T({ type: 'other', severity: 1, summary: 'Trusts numbers' }), triaged_at: ago(2), status: 'new', question: 'trust_numbers', choice: 'Mostly' },
  );
  claude = () => ({ type: 'confusion', severity: 2, area: 'budget', summary: 'Could not find how to add a bill', steps: [] });
  r = await post(dh, { mode: 'daily' }, K);
  ok(r.s === 200 && r.b.ok && r.b.feedback === 10 && r.b.triaged === 1 && r.b.emailed === true, 'daily: 200, last 24 hours only, the untriaged row triaged first: ' + JSON.stringify(r.b));
  ok(db.feedback.find((x) => x.id === 103).triage.summary === 'Could not find how to add a bill' && !sent.anthropic[0].body.messages[0].content.some((c) => c.type === 'image'), 'catch-up triage stored (no screenshot sent)');
  ok(db.rpc.some((c) => c[0] === 'tester_retention') && r.b.retention.events_deleted === 2, 'retention runs with the daily digest');
  const act = db.rpc.find((c) => c[0] === 'tester_activity')[1];
  ok(Math.abs(Date.parse(act.p_until) - Date.parse(act.p_since) - 86400e3) < 1000, 'activity totals for the last 24 hours');
  const dmail = sent.resend[0].body;
  ok(dmail.to[0] === 'owner@example.com' && /10 new, 1 urgent/.test(dmail.subject), 'daily e-mail to the owner: ' + dmail.subject);
  const H = dmail.html, Tx = dmail.text;
  const i4 = H.indexOf('Severity 4'), i2 = H.indexOf('Severity 2'), i1 = H.indexOf('Severity 1');
  ok(i4 > 0 && i4 < i2 && i2 < i1 && !H.includes('Severity 3') && !H.includes('Not sorted yet'), 'grouped by severity, most serious first, empty groups left out');
  ok(H.includes('Debts vanished after sync') && H.includes('Tess') && H.includes('vic@example.com') && H.includes('debts / cards') && H.includes('https://example.com/fb/101'), 'each item: summary, tester (first name or e-mail), screen, link');
  ok(H.includes('praise') && H.includes('house builder') && H.includes('rated 5/5'), 'with type, area and rating');
  ok(H.includes('&lt;script&gt;') && !H.includes('<script>x'), 'tester text escaped');
  ok(Tx.includes('Active testers: 3') && Tx.includes('Sessions: 7') && Tx.includes('Median session: 4m 10s') && Tx.includes('Most used screens: budget (30), house (12), overview (9)') && Tx.includes('Least used screens: settings (1), debts (4), overview (9)') && Tx.includes('Page errors: 2'), 'activity totals in the e-mail');
  ok(!H.includes('Yesterday item'), 'older feedback is not repeated');
  ok(Tx.includes('Survey day14 (3 responses, mood +1 on -2 to 2)') && Tx.includes('disappointed: Very disappointed 2 / Somewhat disappointed 1') && Tx.includes('recommend: average score 7.5/10') && Tx.includes('missing: 1 written'), 'survey responses grouped by survey with choice counts: day14');
  ok(Tx.includes('Takeaway: Would miss it badly') && Tx.includes('Survey day3 (1 response') && Tx.includes('confusing: The house builder 1'), 'with honest takeaways, each survey listed');
  ok(Tx.includes('Targeted questions') && Tx.includes('trust_numbers: Mostly 2 / Not really 1 · 1 written'), 'targeted questions with their choice counts');
  ok(!Tx.includes('- Keen\n') && Tx.includes('House builder confusing on day 3'), 'routine survey answers stay in the survey section; one reporting a problem is listed by severity too');
  ok(db.reports[0] && db.reports[0].body.surveys.surveys.find((x) => x.survey === 'day14').questions[0].choices[0][1] === 2, 'the daily report keeps the survey counts');
  ok(!/\u2014/.test(H + Tx + dmail.subject), 'no em dashes in the daily e-mail');
  ok(db.reports.length === 1 && db.reports[0].period === 'daily' && db.reports[0].body.feedback === 10, 'the daily summary is kept in feedback_reports');
  reset(); sent.resend = [];
  r = await post(dh, { mode: 'daily' }, K);
  ok(r.s === 200 && /a quiet day/.test(sent.resend[0].body.subject) && sent.resend[0].body.text.includes('Active testers: 3'), 'a day with no feedback still sends the activity');

  // weekly
  reset(); sent.resend = []; sent.anthropic = [];
  db.feedback.push(
    { id: 201, user_id: U, created_at: ago(30), text: 'Bills tab froze at £1,200', rating: null, moment: null, context: { screen: 'budget' }, triage: T({ summary: 'Bills froze' }), triaged_at: ago(30), status: 'new', screenshot: SHOT },
    { id: 202, user_id: V, created_at: ago(50), text: 'Froze again', rating: null, moment: null, context: { screen: 'budget' }, triage: T({ summary: 'Froze again' }), triaged_at: ago(50), status: 'new' },
    { id: 203, user_id: V, created_at: ago(70), text: 'Signed out and lost data', rating: null, moment: null, context: {}, triage: T({ severity: 4, area: 'sync', summary: 'Lost data' }), triaged_at: ago(70), status: 'new' },
    { id: 204, user_id: U, created_at: ago(24 * 9), text: 'Too old', rating: null, moment: null, context: {}, triage: T(), triaged_at: ago(24 * 9), status: 'new' },
    { id: 205, user_id: U, created_at: ago(90), text: 'survey', rating: null, moment: null, context: {}, triage: T({ type: 'praise', severity: 1, summary: 'Keen', sentiment: 2, honest_takeaway: 'Would miss it' }), triaged_at: ago(90), status: 'new',
      survey: 'day14', answers: [{ q: 'disappointed', choice: 'Very disappointed' }, { q: 'missing', text: 'Costs £5 too much?' }] },
  );
  claude = () => ({ headline: 'Budget freezes lead the week.', themes: [
    { title: 'Budget tab freezes', type: 'bug', severity: 2, count: 2, summary: 'Two testers saw the bills tab freeze.', feedback_ids: [201, 202, 999], suggestion: 'Profile the bills save path' },
    { title: 'Data lost on sign out', type: 'bug', severity: 4, count: 1, summary: 'One tester lost data.', feedback_ids: [203], suggestion: 'Check the sign out sync' },
    { title: '', type: 'bug', severity: 1, count: 1, summary: 'no title', feedback_ids: [], suggestion: '' }] });
  r = await post(dh, { mode: 'weekly' }, K);
  const wk = db.reports.find((x) => x.period === 'weekly');
  ok(r.s === 200 && r.b.ok && r.b.feedback === 4 && r.b.ai === true && wk && r.b.report_id === wk.id, 'weekly: 200, the last 7 days, report stored in feedback_reports: ' + JSON.stringify(r.b));
  ok(wk.body.themes.length === 2 && wk.body.themes[0].title === 'Data lost on sign out' && wk.body.themes[0].rank === 1 && wk.body.themes[1].rank === 2, 'themes ranked by severity then frequency; untitled themes dropped');
  ok(JSON.stringify(wk.body.themes[1].feedback_ids) === '[201,202]' && wk.body.themes[1].count === 2, 'unknown feedback ids dropped');
  ok(wk.body.counts.feedback === 4 && wk.body.counts.bySeverity['4'] === 1 && wk.body.activity.testers === 3 && wk.body.headline === 'Budget freezes lead the week.', 'with counts, activity and the headline');
  const wreq = sent.anthropic[0].body, wtext = wreq.messages[0].content[0].text;
  ok(wreq.output_config.format.type === 'json_schema' && !wtext.includes('base64') && !wtext.includes('1,200') && wtext.includes('"id":201') && wtext.includes('"testers":3'), 'the weekly prompt has the feedback (no screenshots, no amounts) and the activity');
  const wmail = sent.resend[0].body;
  ok(wtext.includes('"survey":"day14"') && wtext.includes('"honest_takeaway":"Would miss it"') && wtext.includes('Survey and targeted question choice counts') && !wtext.includes('£5'), 'the weekly prompt includes survey answers, takeaways and choice counts (no amounts)');
  ok(wk.body.surveys.surveys[0].survey === 'day14' && wk.body.surveys.surveys[0].questions[0].choices[0][0] === 'Very disappointed', 'the weekly report stores the survey counts');
  ok(wmail.text.includes('Surveys and questions this week') && wmail.text.includes('disappointed: Very disappointed 1'), 'and the weekly e-mail lists them');
  ok(/weekly themes: 2 from 4 feedback/.test(wmail.subject) && wmail.html.includes('1. Data lost on sign out') && wmail.html.includes('Suggested change: Check the sign out sync') && wmail.text.includes('report #' + wk.id), 'weekly e-mail: ranked themes, suggestions, the report id: ' + wmail.subject);
  ok(!/\u2014/.test(wmail.html + wmail.text + wmail.subject), 'no em dashes in the weekly e-mail');
  claude = () => 'nothing useful';
  r = await post(dh, { mode: 'weekly' }, K);
  const wk2 = db.reports.filter((x) => x.period === 'weekly')[1];
  ok(r.s === 200 && r.b.ai === false && wk2.body.ai === false && wk2.body.themes[0].title === 'sync' && wk2.body.themes[0].severity === 4, 'when the AI reply is unusable the week is still reported, grouped by area');
  reset(); const ai0 = sent.anthropic.length;
  r = await post(dh, { mode: 'weekly' }, K);
  ok(r.s === 200 && sent.anthropic.length === ai0 && db.reports[0].body.headline === 'No feedback this week.', 'an empty week: no AI call, a short report');

  console.log(fails ? '\nFAILURES ' + fails : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('FAIL: crashed', e && e.stack); process.exit(1); });
