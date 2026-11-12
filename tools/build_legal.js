// The public privacy and terms pages for vault-it.co (owner, 7 Nov 2026), built from the app's own Privacy notice and
// Beta terms (showPrivacy / showTerms in index.html), so the website can never say something the app does not.
// Used by tools/build_site.js; writes nothing itself.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');

// run the app's notice functions with a stand-in modal, and return { privacy: {title, body}, terms: {title, body} }
function noticeBodies(indexHtml) {
  const start = indexHtml.indexOf('var VI_LEGAL_DATE'), fn = indexHtml.indexOf('function showTerms()', start);
  const end = fn > -1 ? indexHtml.indexOf('\n}\n', fn) : -1;
  if (start < 0 || fn < 0 || end < 0) throw new Error('build_legal: showPrivacy / showTerms not found in index.html');
  const got = [];
  const ctx = { showLegalModal: (title, body) => got.push({ title, body }) };
  vm.runInNewContext(indexHtml.slice(start, end + 2) + '\nshowPrivacy(); showTerms();', ctx, { timeout: 2000 });
  if (got.length !== 2) throw new Error('build_legal: expected two notices, got ' + got.length);
  return { privacy: got[0], terms: got[1] };
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function page(slug, n, other) {
  const desc = slug === 'privacy' ? 'How Vault-It, run by PT Live Design, uses your personal data.' : 'The terms for using the Vault-It beta.';
  return '<!DOCTYPE html>\n<html lang="en-GB"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">'
    + '<meta name="theme-color" content="#080808"><meta name="description" content="' + esc(desc) + '">'
    + '<script>(function(){try{var t=localStorage.getItem("vi-theme");if(!t&&window.matchMedia&&matchMedia("(prefers-color-scheme: light)").matches)t="light";if(t==="light")document.documentElement.setAttribute("data-theme","light")}catch(e){}})();</script>'
    + '<title>' + esc(n.title) + ' · Vault-It</title><link rel="canonical" href="https://vault-it.co/' + slug + '">'
    + '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
    + '<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=Share+Tech+Mono&display=swap" rel="stylesheet">'
    + '<link rel="stylesheet" href="sign-up/style.css">'
    // the notice's own markup colours itself with the app's names (--em, --t3): map them to the site's tokens
    + '<style>:root{--em:var(--teal);--t3:var(--muted)}.legal{overflow-wrap:anywhere}.legal p,.legal li{margin:0 0 12px}.legal ul{margin:0 0 12px 22px!important}.legal strong{color:var(--text)}'
    + '.legal p[style*="--em"]{font-family:var(--font-display);font-size:1.1rem;margin:26px 0 8px!important}.legal-alt{margin-top:28px;color:var(--muted);font-size:.95rem}</style></head>\n'
    + '<body><header><div class="bar"><a class="lockup" href="/" aria-label="Vault-It home"><span class="wm">Vault<i class="dot"></i><b>It</b></span></a></div></header>\n'
    + '<main><h1>' + esc(n.title) + '</h1>\n<div class="legal">' + n.body + '</div>\n'
    + '<p class="legal-alt">The same ' + (slug === 'privacy' ? 'notice' : 'terms') + ' can be opened inside the app. See also the <a href="/' + other.slug + '">' + esc(other.title) + '</a>.</p></main>\n'
    + '<footer><strong class="fca">Not regulated by the FCA. Not financial advice.</strong><br>Vault-It is a product of PT Live Design, A57, 11 St Mary’s Street, Lincoln LN5 7EQ · '
    + '<a href="mailto:hello@vault-it.co">hello@vault-it.co</a><br><a href="/">Home</a> · <a href="/privacy">Privacy notice</a> · <a href="/terms">Beta terms</a><br>© 2026 PT Live Design. All rights reserved.</footer>\n'
    + '</body></html>\n';
}

// { 'privacy.html': '<!DOCTYPE html>…', 'terms.html': '…' }
function legalPages(indexHtml) {
  const n = noticeBodies(indexHtml || fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'));
  return {
    'privacy.html': page('privacy', n.privacy, { slug: 'terms', title: n.terms.title }),
    'terms.html': page('terms', n.terms, { slug: 'privacy', title: n.privacy.title }),
  };
}

module.exports = { legalPages, noticeBodies };
