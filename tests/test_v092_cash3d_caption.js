// v0.9.2 cash 3D caption (CoS, 4 Nov 17:34): on live the line under the 3D cash view showed the old flat view's text
// ("£3.8K · 3 full blocks + £840 · each block = £1,000") instead of the 3D view's own ("£3,840 laid · 4 plates · ... £1 coins, 23.43 mm").
// The flat drawing ran whenever the 3D stage had not drawn its first frame yet (the card off screen), wrote its caption, and the
// 3D stage, seeing the same balance, did not write its own back. With 3D on, the caption is the 3D one at every step.
// Served over http://127.0.0.1 from the folder that holds VI_INDEX. Run: node tests/test_v092_cash3d_caption.js
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const routeThree = require('./three_route');
const FILE = process.env.VI_INDEX || path.join(__dirname, '..', 'index.html');
const ROOT = path.dirname(FILE), PAGE = path.basename(FILE);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.css': 'text/css', '.woff2': 'font/woff2' };
const server = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT)) { r.writeHead(403); return r.end(); }
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
const GPU_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-compositing', '--enable-gpu-rasterization'];
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const ACCTS = [
  { id: 5, name: 'Barclays Savings', type: 'Savings', balance: 2000, rate: 4.5 },
  { id: 6, name: 'Monzo', type: 'Current', balance: 340 },
  { id: 7, name: 'Nationwide ISA', type: 'ISA', balance: 1200, rate: 3.2 }
];
const SEED = `(function(){if(localStorage.getItem('pos_al1'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'T',email:'t@t.com',pro:true,plan:'annual'}));localStorage.setItem('pos_al1',JSON.stringify({cashAccounts:${JSON.stringify(ACCTS)},physicalCash:[{id:1,where:'Safe',amount:300,date:'2026-10-01'}],metals:{},metalPrices:{gold:2000,silver:25,platinum:900,palladium:1000}}));})()`;


const THREE_D = /£3,840 laid · 4 plates · 3 blocks of 1,000 \+ 840 · £1 coins, 23\.43 mm/;
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const URL = 'http://127.0.0.1:' + server.address().port + '/' + PAGE;
  const b = await chromium.launch({ args: GPU_ARGS }); const errs = [];
  for (const [w, h, mobile] of [[390, 844, true], [1280, 900, false]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce' }); await routeThree(ctx);
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(SEED); await p.goto(URL, { waitUntil: 'load' }); await p.waitForTimeout(1400);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#pro-offer-modal{display:none!important}' });
    await p.waitForFunction(() => !!window.THREE && !!THREE.OrbitControls, null, { timeout: 30000 }).catch(() => {});
    // open Cash and savings with the 3D card below the fold, as on a phone, and let the stage build
    await p.evaluate(() => { showTab('assets'); showSubtab('assets', 'cash', null); window.scrollTo(0, 0); });
    await p.waitForFunction(() => window.V3 && V3.cash && V3.cash.root.children.length, null, { timeout: 60000 }).catch(() => {});
    await p.waitForTimeout(600);
    const cap = () => (document.getElementById('cashCap') || {}).textContent || '';
    const a = await p.evaluate(cap);
    // the page draws the cash view again (a tab switch, an edit elsewhere) while the 3D card is still off screen
    await p.evaluate(() => { document.getElementById('cashSceneCard').getBoundingClientRect(); renderCashISO(); renderCashISO(); });
    await p.waitForTimeout(800);
    const c = await p.evaluate(cap);
    await p.evaluate(() => document.getElementById('cashSceneCard').scrollIntoView({ block: 'center' })); await p.waitForTimeout(2000);
    const d = await p.evaluate(cap);
    const flat = await p.evaluate(() => getComputedStyle(document.getElementById('cashSvg')).display);
    ok(THREE_D.test(a), w + ': with 3D on, the caption is the 3D view\'s own once the stage is built (' + a + ')');
    ok(THREE_D.test(c), w + ': drawn again while the card is off screen, the caption stays the 3D one (' + c + ')');
    ok(THREE_D.test(d) && flat === 'none', w + ': in view, the 3D caption under the 3D stage, the flat drawing hidden (' + d + ', flat ' + flat + ')');
    await ctx.close();
  }
  // with 3D off (no WebGL), the flat view keeps its own caption
  { const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await routeThree(ctx); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t) { return /webgl/i.test(t) ? null : g.apply(this, arguments); }; });
    await p.addInitScript(SEED); await p.goto(URL, { waitUntil: 'load' }); await p.waitForTimeout(1400);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#pro-offer-modal{display:none!important}' });
    await p.evaluate(() => { showTab('assets'); showSubtab('assets', 'cash', null); }); await p.waitForTimeout(1500);
    const f = await p.evaluate(() => ({ cap: (document.getElementById('cashCap') || {}).textContent || '', svg: getComputedStyle(document.getElementById('cashSvg')).display }));
    ok(/3 full blocks \+ £840 · each block = £1,000/.test(f.cap) && f.svg !== 'none', 'without WebGL the flat view shows with its own caption (' + f.cap + ')');
    await ctx.close(); }
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); server.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
