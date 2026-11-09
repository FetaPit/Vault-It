// Node-only: the Worker's route() picks the right folder for each host and path.
// Previews (*.workers.dev, localhost) serve the app at the root and the landing page under /landing/, except the investor
// pitch deck, its presenter and its /pitch/ assets, which sit at the root as on vault-it.co so the presenter's popup
// (/pitch-Eligent?present=1) and the deck's asset paths work on a branch preview link. Run: bash scripts/run-tests.sh test_worker_routes
import { route } from '../worker/index.mjs';
let fails = 0;
const check = (host, path, want) => {
  const got = route(host, path);
  const ok = want.file ? got.file === want.file && got.site === want.site && got.prod === want.prod : !!got.notFound === !!want.notFound;
  if (!ok) { fails++; console.log('FAIL', host, path, JSON.stringify(got), 'wanted', JSON.stringify(want)); } else console.log('ok  ', host, path, '->', got.file || 'notFound');
};
const pre = 'abc12345-vault-it.ptlived.workers.dev';
check(pre, '/pitch-Eligent', { file: '/landing/pitch-Eligent.html', site: 'landing', prod: false });
check(pre, '/pitch-Eligent-presenter', { file: '/landing/pitch-Eligent-presenter.html', site: 'landing', prod: false });
check(pre, '/pitch-eligent', { file: '/landing/pitch-eligent.html', site: 'landing', prod: false });
check(pre, '/pitch/nw3d-live.js', { file: '/landing/pitch/nw3d-live.js', site: 'landing', prod: false });
check(pre, '/pitch/house-build.mp4', { file: '/landing/pitch/house-build.mp4', site: 'landing', prod: false });
check('localhost', '/pitch-Eligent', { file: '/landing/pitch-Eligent.html', site: 'landing', prod: false });
check(pre, '/', { file: '/app/index.html', site: 'app', prod: false });
check(pre, '/recover', { file: '/app/recover.html', site: 'app', prod: false });
check(pre, '/pitchy', { file: '/app/pitchy.html', site: 'app', prod: false });
check(pre, '/landing/', { file: '/landing/index.html', site: 'landing', prod: false });
check(pre, '/landing/pitch-Eligent', { file: '/landing/pitch-Eligent.html', site: 'landing', prod: false });
check('vault-it.co', '/pitch-Eligent', { file: '/landing/pitch-Eligent.html', site: 'landing', prod: true });
check('vault-it.co', '/', { file: '/landing/index.html', site: 'landing', prod: true });
check('app.vault-it.co', '/', { file: '/app/index.html', site: 'app', prod: true });
check('app.vault-it.co', '/pitch-Eligent', { file: '/app/pitch-Eligent.html', site: 'app', prod: true });
check('example.com', '/', { notFound: true });
check(pre, '/pitch/../app', { notFound: true });
console.log(fails ? `FAILURES ${fails}` : 'ALL PASSED');
process.exit(fails ? 1 : 0);
