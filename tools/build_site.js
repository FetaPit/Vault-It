// Build the publishable site into dist/ — only the files a browser needs, never tests, docs, function code or notes.
//   dist/app      → https://app.vault-it.co   the app (index.html is self-contained) + the data-recovery page
//   dist/landing  → https://vault-it.co       marketing page + waitlist
// Run: node tools/build_site.js            (Cloudflare Workers Builds: build command `npm run build:site`)
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = path.join(__dirname, '..'), OUT = process.env.SITE_OUT ? path.resolve(process.env.SITE_OUT) : path.join(ROOT, 'dist');

const SITE = {
  app:     [['index.html', 'index.html'], ['recover.html', 'recover.html'], ['logo.png', 'logo.png'], ['og-image.png', 'og-image.png']],
  landing: [['landing.html', 'index.html'], ['logo.png', 'logo.png'], ['og-image.png', 'og-image.png']],
};
const ROBOTS = { app: 'User-agent: *\nDisallow: /\n', landing: 'User-agent: *\nAllow: /\n' };

function sha() {
  if (process.env.WORKERS_CI_COMMIT_SHA) return process.env.WORKERS_CI_COMMIT_SHA;
  try { return cp.execSync('git rev-parse HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (e) { return 'unknown'; }
}

fs.rmSync(OUT, { recursive: true, force: true });
for (const [site, files] of Object.entries(SITE)) {
  const dir = path.join(OUT, site); fs.mkdirSync(dir, { recursive: true });
  for (const [from, to] of files) {
    const src = path.join(ROOT, from);
    if (!fs.existsSync(src)) { console.error('build_site: missing ' + from); process.exit(1); }
    fs.copyFileSync(src, path.join(dir, to));
  }
  fs.writeFileSync(path.join(dir, 'robots.txt'), ROBOTS[site]);
  fs.writeFileSync(path.join(dir, '404.html'), '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Not found · Vault·It</title><body style="margin:0;background:#04090f;color:#9bb0bd;font:16px system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;text-align:center"><div><div style="font-size:2rem;color:#44c0b9;margin-bottom:8px">404</div>That page does not exist. <a style="color:#44c0b9" href="/">Back to Vault·It</a></div>');
}
fs.writeFileSync(path.join(OUT, 'app', 'version.json'), JSON.stringify({ sha: sha(), built: new Date().toISOString() }) + '\n');
const list = (d) => fs.readdirSync(path.join(OUT, d)).sort().join(', ');
console.log('dist/app:     ' + list('app') + '\ndist/landing: ' + list('landing'));
