// Worker sends a Content-Security-Policy-Report-Only header (script/connect/img/font/style) that lists every outside host
// the app calls; the enforced CSP stays as it was. Run: node tests/test_csp_report_only.mjs
import fs from 'fs';
import worker from '../worker/index.mjs';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const env = { ASSETS: { fetch: async () => new Response('<html></html>', { status: 200, headers: { 'Content-Type': 'text/html' } }) } };
for (const host of ['app.vault-it.co', 'vault-it.co']) {
  const res = await worker.fetch(new Request('https://' + host + '/'), env);
  const ro = res.headers.get('Content-Security-Policy-Report-Only') || '', enf = res.headers.get('Content-Security-Policy') || '';
  ok(ro.length > 0, host + ': report-only header is present');
  for (const d of ['script-src', 'connect-src', 'img-src', 'font-src', 'style-src']) ok(new RegExp('(^|; )' + d + ' ').test(ro), host + ': ' + d + ' is set');
  ok(enf === "frame-ancestors 'none'; object-src 'none'; base-uri 'self'", host + ': enforced CSP is unchanged (frame-ancestors, object-src, base-uri only)');
  ok(!/report-only/i.test(enf) && !/script-src/.test(enf), host + ': nothing is enforced yet');
}
const ro = (await worker.fetch(new Request('https://app.vault-it.co/'), env)).headers.get('Content-Security-Policy-Report-Only') || '';
const policyHosts = new Set([...ro.matchAll(/(?:https?|wss):\/\/([A-Za-z0-9.*-]+\.[a-z]{2,})/g)].map(m => m[1]));
// links the app opens or shows as text, never fetched or embedded, plus XML namespaces
const LINK_ONLY = ['www.w3.org', 'creativecommons.org', 'vault-it.co', 'app.vault-it.co', 'wa.me', 'www.linkedin.com', 'instagram.com', 'ptlive.my.canva.site', 'shibariumscan.io', 'buy.stripe.com', 'auth.truelayer.com'];
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const used = [...new Set([...html.matchAll(/https?:\/\/([A-Za-z0-9.-]+\.[a-z]{2,})/g)].map(m => m[1]))].filter(h => !LINK_ONLY.includes(h));
const missing = used.filter(h => !policyHosts.has(h));
ok(missing.length === 0, 'every host the app calls is in the report-only policy' + (missing.length ? ' — missing: ' + missing.join(', ') : ''));
const privacy = html.slice(html.indexOf('function showPrivacy'), html.indexOf('function showTerms'));
const extra = [...policyHosts].filter(h => !used.includes(h) && !['fonts.gstatic.com'].includes(h));
ok(extra.length === 0, 'the policy names no host the app does not use' + (extra.length ? ' — extra: ' + extra.join(', ') : ''));
ok(/Google Fonts/.test(html), 'fonts.gstatic.com is Google Fonts (named in the privacy notice)');
console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
