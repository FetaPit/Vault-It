// Embeds Vault-form (brand/fonts/vault-form/woff2) as woff2 data URIs in the self-contained web pages, between the markers
// /* vault-form:start */ and /* vault-form:end */. Owner, 12 Nov 2026: Vault-form is for headings and the logo only (the plain
// text styles were dropped), so every page gets the Heading cut (D+) as "Vault-form Heading", weights 100 to 1000, so any
// heading weight lands on the real face and is never faked. Pages listed in CUTS also get the Hero cut (D++) as "Vault-form Hero".
// Body text, buttons and labels stay DM Sans. Re-run after the font files change; tests/test_vault_form_site.js fails if an
// embedded face no longer matches the brand file.
// Run: node tools/embed_vault_form.js
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), DIR = path.join(ROOT, 'brand', 'fonts', 'vault-form', 'woff2');
const PAGES = ['landing.html', 'site/sign-up/style.css', 'site/pitch-eligent/index.html', 'site/pitch-eligent/presenter.html',
  'site/pitch-eligent/answers.html', 'site/pete/index.html', 'brand/vault-it-brand-book.html'];

// which display cuts each page uses (only these are embedded, so pages stay light)
const CUTS = { 'site/pitch-eligent/index.html': ['hero'] };
const FAMILY = { heading: 'Vault-form Heading', hero: 'Vault-form Hero' };
const face = (file, weight, family = 'Vault-form') => '@font-face{font-family:"' + family + '";src:url(data:font/woff2;base64,'
  + fs.readFileSync(path.join(DIR, file)).toString('base64') + ') format("woff2");font-weight:' + weight + ';font-style:normal;font-display:swap}';
const css = (page) => '/* vault-form:start (tools/embed_vault_form.js) */'
  + face('vault-form-heading-bold.woff2', '100 1000', FAMILY.heading)
  + (CUTS[page] || []).map((c) => face('vault-form-' + c + '-bold.woff2', '100 1000', FAMILY[c])).join('') + '/* vault-form:end */';

if (require.main === module) {
  let bad = 0;
  for (const f of PAGES) {
    const block = css(f);
    const p = path.join(ROOT, f), s = fs.readFileSync(p, 'utf8');
    const re = /\/\* vault-form:start[^*]*\*\/[\s\S]*?\/\* vault-form:end \*\//;
    if (!re.test(s)) { console.error('embed_vault_form: no markers in ' + f); bad++; continue; }
    const out = s.replace(re, () => block);
    if (out !== s) fs.writeFileSync(p, out);
    console.log((out === s ? 'same    ' : 'updated ') + f);
  }
  process.exit(bad ? 1 : 0);
}
module.exports = { css, PAGES, CUTS, FAMILY };
