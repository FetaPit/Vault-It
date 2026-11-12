// v0.9.2 copyright notices (Pete via David, 6 Nov): the exact line the app footer uses, "© 2026 PT Live Design. All rights reserved.", on the landing page,
// the sign-up pages, the pitch page and its presenter, and in the HTML and plain-text sides of the auth and beta emails; LICENSE (proprietary, no licence
// granted), NOTICE (third-party pieces) and "license": "UNLICENSED" with "private": true in package.json.
// Run: node tests/test_v092_copyright.js
const VI = require('./lib/vi');
const fs = require('fs'), path = require('path');
const ROOT = VI.ROOT || path.resolve(__dirname, '..');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const LINE = '© 2026 PT Live Design. All rights reserved.';
const rd = f => { try { return fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch (e) { return null; } };
const count = (s, t) => s.split(t).length - 1;
// the app footer's own wording, so the two stay the same
const app = rd('index.html'); ok(app && app.includes('<span class="footer-cr">' + LINE + '</span>'), 'the app footer carries the exact line (the source of the wording)');
for (const f of ['landing.html', 'site/sign-up/confirm.html', 'site/sign-up/thanks.html', 'site/sign-up/unsubscribe.html', 'site/pitch-eligent/index.html', 'site/pitch-eligent/presenter.html']) {
  const s = rd(f); ok(s !== null && count(s, LINE) === 1, f + ' carries the line once');
  ok(s !== null && /Not regulated by the FCA\. Not financial advice\./i.test(s), f + ' still shows the FCA line');
}
ok(!/© 2026 Vault-It/.test(rd('landing.html') || ''), 'landing.html: the old "© 2026 Vault-It" is replaced by the exact line');
// emails: HTML footer in the shared brandShell, and every plain-text version that exists
for (const [f, html, txt] of [['send-auth-email', 1, 0], ['waitlist-join', 1, 2], ['waitlist-welcome', 1, 1]]) {
  const s = rd('supabase/functions/' + f + '/index.ts') || '';
  ok(count(s, LINE) === html + txt, 'supabase/functions/' + f + ': the line is in the HTML footer' + (txt ? ' and ' + txt + ' plain-text version(s)' : '') + ' (' + count(s, LINE) + ' found, want ' + (html + txt) + ')');
  ok(/Not regulated by the FCA\. Not financial advice\./.test(s), 'supabase/functions/' + f + ': the FCA line is still there');
}
const lic = rd('LICENSE') || ''; ok(/proprietary/i.test(lic) && /all rights reserved/i.test(lic) && /PT Live Design/.test(lic) && /no licen[cs]e/i.test(lic), 'LICENSE: proprietary, all rights reserved, PT Live Design, no licence granted');
const note = rd('NOTICE') || ''; ok(/three\.js/i.test(note) && /MIT/.test(note) && /Vault-form/.test(note) && /DM Sans/.test(note) && /Share Tech Mono/.test(note) && /OFL|Open Font Licen[cs]e/i.test(note), 'NOTICE: names three.js (MIT), Vault-form and the Google Fonts (OFL)');
const pkg = JSON.parse(rd('package.json') || '{}'); ok(pkg.license === 'UNLICENSED' && pkg.private === true, 'package.json: "license": "UNLICENSED" and "private": true');
ok(!/[—]/.test(lic + note), 'LICENSE and NOTICE have no em dashes');
console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
