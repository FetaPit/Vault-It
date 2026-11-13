// Supabase Auth e-mail templates (supabase/auth-templates): every one carries the brand lockup, Syne and DM Sans, Night colours, the tagline,
// the FCA line, no dashes and no white page, plus the Supabase placeholders it needs. They are pasted into the Supabase dashboard (README there).
const fs = require('fs'); const path = require('path');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const dir = path.join(__dirname, '..', 'supabase', 'auth-templates');
const need = { 'magic-link': ['{{ .Token }}', '{{ .Email }}'], 'confirm-signup': ['{{ .Token }}', '{{ .Email }}'], 'reset-password': ['{{ .Token }}', '{{ .Email }}'],
  'change-email': ['{{ .ConfirmationURL }}', '{{ .NewEmail }}'], 'invite': ['{{ .ConfirmationURL }}'], 'reauthentication': ['{{ .Token }}'] };
for (const [f, ph] of Object.entries(need)) {
  const h = fs.existsSync(path.join(dir, f + '.html')) ? fs.readFileSync(path.join(dir, f + '.html'), 'utf8') : '';
  ok(h.length > 0, f + ': template exists');
  ok(/<img src="https:\/\/vault-it\.co\/email\/lockup\.gif"[^>]*alt="Vault-It"/.test(h), f + ': brand lockup picture');
  ok(/font-family:'Syne'/.test(h) && /font-family:'DM Sans'/.test(h), f + ': Syne headings and DM Sans body');
  ok(/background:#080808/.test(h) && /background:#080D14/.test(h) && /#15302F/.test(h), f + ': Night page, panel and border');
  ok(h.includes('Get out of the red and into your home.') && h.includes('Not regulated by the FCA. Not financial advice.'), f + ': tagline and FCA line');
  ok(!/[—–]/.test(h) && !/#(fff|ffffff|f5f5f5)\b/i.test(h), f + ': no dashes as punctuation, no white page');
  ok(ph.every((p) => h.includes(p)), f + ': has its Supabase placeholders ' + ph.join(' '));
}
const gen = fs.readFileSync(path.join(__dirname, '..', 'tools', 'build_auth_templates.js'), 'utf8');
ok(Object.keys(need).every((f) => gen.includes("'" + f + "'")), 'the builder lists every template');
ok(/Authentication > Emails/.test(fs.readFileSync(path.join(dir, 'README.md'), 'utf8')), 'the README says where to paste them (they are not deployed from the repo)');
console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASSED'); process.exit(fails ? 1 : 0);
