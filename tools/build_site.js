// Build the publishable site into dist/ — only the files a browser needs, never tests, docs, function code or notes.
//   dist/app      → https://app.vault-it.co   the app (index.html is self-contained) + the data-recovery page
//   dist/landing  → https://vault-it.co       the sign-up page (served at / and /sign-up) + its confirm / thanks / unsubscribe pages
// Run: node tools/build_site.js            (Cloudflare Workers Builds: build command `npm run build:site`)
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = path.join(__dirname, '..'), OUT = process.env.SITE_OUT ? path.resolve(process.env.SITE_OUT) : path.join(ROOT, 'dist');

const SITE = {
  app:     [['index.html', 'index.html'], ['recover.html', 'recover.html'], ['sw.js', 'sw.js'], ['manifest.webmanifest', 'manifest.webmanifest'], ['logo.png', 'logo.png'], ['og-image.png', 'og-image.png']],
  landing: [['landing.html', 'index.html'], ['landing.html', 'sign-up.html'], ['og-image.png', 'og-image.png'],
            ['site/brand-hero.js', 'brand-hero.js'], ['site/email/lockup.gif', 'email/lockup.gif'], ['site/step-1-numbers.jpg', 'img/step-1-numbers.jpg'], ['site/step-2-picture.jpg', 'img/step-2-picture.jpg'], ['site/step-3-house.jpg', 'img/step-3-house.jpg'], ['site/founder.jpg', 'img/founder.jpg'],
            ['site/sign-up/thanks.html', 'sign-up/thanks.html'], ['site/sign-up/confirm.html', 'sign-up/confirm.html'],
            ['site/sign-up/unsubscribe.html', 'sign-up/unsubscribe.html'], ['site/sign-up/style.css', 'sign-up/style.css'],
            // investor pitch for the Eligent Club event: vault-it.co/pitch-Eligent (and a lower-case alias)
            ['site/pitch-eligent/index.html', 'pitch-Eligent.html'], ['site/pitch-eligent/index.html', 'pitch-eligent.html'], ['site/pitch-eligent/presenter.html', 'pitch-Eligent-presenter.html'], ['site/pitch-eligent/presenter.html', 'pitch-eligent-presenter.html'],
            ['site/pitch-eligent/pitch/house-build.mp4', 'pitch/house-build.mp4'], ['site/pitch-eligent/pitch/house-still.jpg', 'pitch/house-still.jpg'],
            ['site/pitch-eligent/pitch/nw3d-live.js', 'pitch/nw3d-live.js'], ['site/pitch-eligent/pitch/live-nw.jpg', 'pitch/live-nw.jpg'], ['site/pitch-eligent/pitch/live-trk.jpg', 'pitch/live-trk.jpg'],
            ['site/pitch-eligent/pitch/logo-full.png', 'pitch/logo-full.png'], ['site/pitch-eligent/pitch/logo-mid.png', 'pitch/logo-mid.png'],
            // digital business card behind the printed card's QR code and NFC chip: vault-it.co/pete
            ['site/pete/index.html', 'pete.html'], ['site/pete/ptlive.png', 'pete/ptlive.png']],
};
// the 3D model library (v0.9.1, E30): only what the app reads, same address as the app, so no outside host
const MODELS = ['catalog.json', 'CREDITS.md'];
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
    fs.mkdirSync(path.dirname(path.join(dir, to)), { recursive: true });
    fs.copyFileSync(src, path.join(dir, to));
  }
  if (site === 'app') {
    const md = path.join(ROOT, 'models'); fs.mkdirSync(path.join(dir, 'models'), { recursive: true });
    for (const f of MODELS) fs.copyFileSync(path.join(md, f), path.join(dir, 'models', f));
    for (const sub of ['glb', 'thumb']) fs.cpSync(path.join(md, sub), path.join(dir, 'models', sub), { recursive: true });
  }
  fs.writeFileSync(path.join(dir, 'robots.txt'), ROBOTS[site]);
  fs.writeFileSync(path.join(dir, '404.html'), '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Not found · Vault-It</title><body style="margin:0;background:#04090f;color:#9bb0bd;font:16px system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;text-align:center"><div><div style="font-size:2rem;color:#44c0b9;margin-bottom:8px">404</div>That page does not exist. <a style="color:#44c0b9" href="/">Back to Vault-It</a></div>');
}
fs.writeFileSync(path.join(OUT, 'app', 'version.json'), JSON.stringify({ sha: sha(), built: new Date().toISOString() }) + '\n');
// the service worker's cache is named after the commit, so a release never serves a stale shell
const swPath = path.join(OUT, 'app', 'sw.js'); fs.writeFileSync(swPath, fs.readFileSync(swPath, 'utf8').replace('__SW_VERSION__', sha().slice(0, 12)));
const list = (d) => fs.readdirSync(path.join(OUT, d), { recursive: true }).map(String).filter((f) => !/^models[\\/](glb|thumb)[\\/]/.test(f)).sort().join(', ');
console.log('dist/app:     ' + list('app') + '\ndist/landing: ' + list('landing'));
