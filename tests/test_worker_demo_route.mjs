// vault-it.co/demo-a is the live demo link (owner, 8 Nov 2026): the Worker sends it into the app as /?demo=alex with a 302,
// on a preview host to the same host, and nowhere else. Run: node tests/test_worker_demo_route.mjs
import worker, { route } from '../worker/index.mjs';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const env = { ASSETS: { fetch: async () => new Response('<html></html>', { status: 200, headers: { 'Content-Type': 'text/html' } }) } };
const go = async (u) => worker.fetch(new Request(u), env);

for (const p of ['/demo-a', '/demo-a/']) {
  const r = await go('https://vault-it.co' + p);
  ok(r.status === 302 && r.headers.get('Location') === 'https://app.vault-it.co/?demo=alex', 'vault-it.co' + p + ' → 302 to app.vault-it.co/?demo=alex (' + r.status + ' ' + r.headers.get('Location') + ')');
}
const www = await go('https://www.vault-it.co/demo-a');
ok(www.status === 301 && www.headers.get('Location') === 'https://vault-it.co/demo-a', 'www.vault-it.co/demo-a → 301 to the bare domain first (' + www.headers.get('Location') + ')');
const http = await go('http://vault-it.co/demo-a');
ok(http.status === 301 && http.headers.get('Location') === 'https://vault-it.co/demo-a', 'plain http → https first');
const prev = await go('https://vault-it-abc.pete.workers.dev/landing/demo-a');
ok(prev.status === 302 && prev.headers.get('Location') === 'https://vault-it-abc.pete.workers.dev/?demo=alex', 'preview host: /landing/demo-a → the app on the same host (' + prev.headers.get('Location') + ')');
const prev2 = await go('https://vault-it-abc.pete.workers.dev/demo-a');
ok(prev2.status === 302 && prev2.headers.get('Location') === 'https://vault-it-abc.pete.workers.dev/?demo=alex', 'preview host: /demo-a → the app on the same host');
const app = route('app.vault-it.co', '/demo-a');
ok(!app.demo && app.file === '/app/demo-a.html', 'app.vault-it.co/demo-a is an ordinary (missing) app file, not the redirect');
ok(route('vault-it.co', '/demo-ab').file === '/landing/demo-ab.html' && route('vault-it.co', '/demo-a/x').file === '/landing/demo-a/x.html', 'only the exact path redirects');
ok(route('vault-it.co', '/pitch-Eligent').file === '/landing/pitch-Eligent.html', 'the pitch deck route is untouched');
console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
