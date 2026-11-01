// Branded emails: the feedback digest, weekly themes and urgent alert carry the brand lockup (Vault, brick, teal It, Syne),
// Night colours (#080808 page, #080D14 panel, #15302F border), the tagline and the FCA line, and no em dashes. The
// other four emails (sign-in code, beta confirm, welcome) are checked for the same lockup so they cannot drift.
const fs = require('fs'); const esbuild = require('esbuild');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const ROOT = __dirname + '/../supabase/functions/';
const load = (name) => {
  let src = fs.readFileSync(ROOT + name + '/index.ts', 'utf8');
  src = src.replace(/import \{ createClient \} from [^\n]+\n/, 'const createClient=globalThis.__createClient;\n');
  const m = { exports: {} };
  new Function('module', 'exports', 'Deno', 'require', esbuild.transformSync(src, { loader: 'ts', format: 'cjs' }).code)(m, m.exports, { env: { get: () => undefined }, serve() {} }, require);
  return { src, ex: m.exports };
};
const DG = load('feedback-digest'), FB = load('tester-feedback');
const BRICK = /Vault<span style="[^"]*display:inline-block[^"]*background:#44C0B9[^"]*"><\/span><span style="color:#44C0B9">It<\/span>/;
const checkBrand = (name, html) => {
  ok(BRICK.test(html), name + ': logo is Vault, brick, teal It');
  ok(/font-family:'Syne'/.test(html) && /font-family:'DM Sans'/.test(html), name + ': Syne headings and DM Sans body');
  ok(/background:#080808/.test(html) && /background:#080D14/.test(html) && /#15302F/.test(html), name + ': Night page, panel and border');
  ok(html.includes('Get out of the red and into your home.'), name + ': tagline');
  ok(html.includes('Not regulated by the FCA. Not financial advice.'), name + ': FCA line');
  ok(!/[—–]/.test(html), name + ': no dashes used as punctuation');
  ok(!/#(fff|ffffff|f5f5f5)\b/i.test(html), name + ': no white page');
};
const rows = [{ id: 1, created_at: new Date().toISOString(), user_id: 'u', text: 'It broke', type: 'bug', severity: 4, area: 'budget', summary: 'Budget will not save' }];
const day = DG.ex.dailyDigest({ rows, activity: { testers: 1, sessions: 1, events: 1, median_session_ms: 1, errors: 0 }, names: {}, until: new Date() });
checkBrand('daily digest', day.html);
const wb = DG.ex.weeklyBody([], { testers: 1, sessions: 1, events: 1, median_session_ms: 1, errors: 0 }, new Date(Date.now() - 6048e5), new Date(),
  { headline: 'A quiet week.', themes: [{ rank: 1, title: 'Budget saving', type: 'bug', severity: 3, count: 2, feedback_ids: [1, 2], summary: 's', suggestion: 'x' }] }, 'm');
const wk = DG.ex.weeklyDigest(wb, 5);
checkBrand('weekly themes', wk.html);
ok(typeof FB.ex.urgentHtml === 'function', 'urgentHtml is exported');
if (FB.ex.urgentHtml) checkBrand('urgent alert', FB.ex.urgentHtml(7, { type: 'bug', severity: 4, area: 'sign in', summary: 'Cannot sign in', steps: ['Open app'] }, 'Tess', 'login', 'text', ''));
ok(typeof FB.ex.helpHtml === 'function', 'helpHtml is exported');
if (FB.ex.helpHtml) checkBrand('unanswered help question', FB.ex.helpHtml(8, 'Tess', 'login', 'How do I add a card?', ''));
// the other emails: lockup must match the same markup
for (const f of ['send-auth-email', 'waitlist-join', 'waitlist-welcome']) {
  const s = fs.readFileSync(ROOT + f + '/index.ts', 'utf8');
  ok(BRICK.test(s), f + ': logo is Vault, brick, teal It');
  ok(s.includes('Not regulated by the FCA. Not financial advice.'), f + ': FCA line');
}
console.log(fails ? 'FAILURES ' + fails : 'ALL OK'); process.exit(fails ? 1 : 0);
