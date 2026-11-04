// v0.9.1 cash 3D look (owner, 4 Nov: "Change the gold flagpost to a similar asset as expense labels in budget ... bank logo ... stroke
// color to bank or account provider brand color black bg ... related text in white and balance in brand colour. Logo top left of box
// small. ... coins ... should read as actual pounds, euros etc dollars ... groups stacks of ten and groups of 100 ... just performance").
// Each account's flag is a Budget-style chip; coins are real coin shapes; a block of 1,000 is 100 stacks in one shape.
// Served over http://127.0.0.1 from the folder that holds VI_INDEX. Run: node tests/test_v091_cash3d_look.js
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
const lum = c => { const m = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return .2126 * m[0] + .7152 * m[1] + .0722 * m[2]; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const inside = (p, r) => p[0] > r.x0 && p[0] < r.x1 && p[1] > r.y0 && p[1] < r.y1;
const meet = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const URL = 'http://127.0.0.1:' + server.address().port + '/' + PAGE;
  const b = await chromium.launch({ args: GPU_ARGS }); const errs = [];
  const open = async (w, h, mobile) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce' }); await routeThree(ctx);
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(SEED); await p.goto(URL, { waitUntil: 'load' }); await p.waitForTimeout(1400);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#pro-offer-modal{display:none!important}' });
    await p.waitForFunction(() => !!window.THREE && !!THREE.OrbitControls, null, { timeout: 30000 }).catch(() => {});
    await p.evaluate(() => { showTab('assets'); showSubtab('assets', 'cash', null); });
    await p.waitForFunction(() => window.V3 && V3.cash && V3.cash.root.children.length, null, { timeout: 60000 }).catch(() => {});
    await p.evaluate(() => document.getElementById('cashSceneCard').scrollIntoView({ block: 'center' })); await p.waitForTimeout(2500);
    return { ctx, p };
  };

  for (const [w, h, mobile] of [[390, 844, true], [1100, 800, false]]) {
    const { ctx, p } = await open(w, h, mobile);
    const I = await p.evaluate(() => V3.cash && V3.cash.chipInfo ? V3.cash.chipInfo() : null);
    ok(!!I && I.on, w + ': the chips show once the coins have landed');
    if (!I) { await ctx.close(); continue; }
    const byName = n => I.chips.find(c => c.name === n);
    ok(I.chips.length === 4 && ['Barclays Savings', 'Monzo', 'Nationwide ISA', 'Physical cash'].every(byName), w + ': one chip per account and one for physical cash (' + I.chips.map(c => c.name).join(', ') + ')');
    ok(!(await p.evaluate(() => { let n = 0; V3.cash.root.traverse(o => { if (o.isSprite) n++; }); return n; })), w + ': no gold sprite flags left in the scene');
    const bar = byName('Barclays Savings'), mon = byName('Monzo'), phys = byName('Physical cash');
    ok(I.chips.every(c => /rgba?\((8|7|9), (8|7|9), (8|7|9)/.test(c.bg)), w + ': every chip has the near-black Budget label fill (' + I.chips.map(c => c.bg).join(', ') + ')');
    ok(I.chips.every(c => c.stroke.replace(/\s/g, '') === c.amtColor.replace(/\s/g, '')), w + ': the stroke and the balance share the brand colour');
    ok(bar && mon && bar.stroke !== mon.stroke, w + ': Barclays and Monzo wear their own brand colours (' + (bar && bar.stroke) + ' / ' + (mon && mon.stroke) + ')');
    ok(I.chips.every(c => contrast(c.amtColor, 'rgb(8,8,8)') >= 4.5), w + ': each brand colour reads at 4.5:1 on the black (' + I.chips.map(c => contrast(c.amtColor, 'rgb(8,8,8)').toFixed(1)).join(', ') + ')');
    ok(I.chips.every(c => /rgb\((2[2-5]\d), (2[2-5]\d), (2[2-5]\d)\)/.test(c.nameColor)), w + ': the account name is white');
    ok(bar && bar.amount === '£2,000' && mon.amount === '£340' && phys.amount === '£300', w + ': the balance is on the chip (' + I.chips.map(c => c.amount).join(', ') + ')');
    ok(I.chips.filter(c => c.name !== 'Physical cash').every(c => c.logo && c.logo !== 'icon') && phys.logo === 'icon', w + ': a small bank logo on each account chip, the cash icon on physical cash');
    const logoPos = await p.evaluate(() => V3.cash._chips.map(c => { const l = c.el.querySelector('.cash-logo,img'), r = c.el.getBoundingClientRect(), q = l && l.getBoundingClientRect(); return q ? [q.left - r.left, q.width, q.height, r.height] : null; }));
    ok(logoPos.every(q => q && q[0] < 10 && q[1] <= 18 && q[2] <= 18), w + ': the logo is small and sits at the left of the box (' + logoPos.map(q => q && q.map(Math.round).join('/')).join(', ') + ')');
    ok(I.chips.every(c => Math.min(...c.fonts) >= 10.5), w + ': chip text 10.5 px or more (' + I.chips.map(c => c.fonts.join('/')).join(', ') + ')');
    ok(I.chips.every(c => c.r && c.r.x0 >= 0 && c.r.y0 >= 0 && c.r.x1 <= I.W - 55 && c.r.y1 <= I.H), w + ': every chip inside the stage and clear of the zoom controls');
    const over = I.coins.filter(q => I.chips.some(c => c.r && inside(q, c.r))).length;
    ok(over === 0, w + ': no chip covers a coin (' + over + ' of ' + I.coins.length + ' coin points)');
    ok(I.chips.every((c, i) => I.chips.every((d, j) => i === j || !meet(c.r, d.r))) && I.chips.every(c => !meet(c.r, I.total)), w + ': chips never overlap each other or the total');
    ok(I.total && /Total cash/.test(I.total.text) && /£3,840/.test(I.total.text), w + ': the total is a corner tag (' + (I.total && I.total.text) + ')');
    // the chips stay the same size when zoomed in (the old sprite flags grew huge)
    const z = await p.evaluate(async () => { const V = V3.cash, a = V._chips[0].el.getBoundingClientRect().height; const d = V.cam.position.clone().sub(V.ctl.target).multiplyScalar(0.25); V.cam.position.copy(V.ctl.target).add(d); V.ctl.update(); V.kick && V.kick(400);
      await new Promise(r => setTimeout(r, 700)); const i = V.chipInfo(); return { a, b: V._chips[0].el.getBoundingClientRect().height, clear: i.chips.filter(c => c.r && c.r.y1 > 0 && c.r.y0 < i.H).every(c => !(c.r.x0 < i.total.x1 && i.total.x0 < c.r.x1 && c.r.y0 < i.total.y1 && i.total.y0 < c.r.y1)) }; });
    ok(Math.abs(z.a - z.b) < 0.5 && z.clear, w + ': zoomed in, the chips keep their size and stay off the total (' + z.a + ' -> ' + z.b + ')');
    if (w === 390) {
      // every bank in the brand table: the chip colour reads at 4.5:1 on the black and keeps the bank's hue (CoS, 4 Nov: navy and purple brands)
      const inks = await p.evaluate(() => { const hue = h => { const n = parseInt(h.replace('#', '').replace(/^(.)(.)(.)$/, '$1$1$2$2$3$3'), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
          if (d < 0.08) return null; const H = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return (H * 60 + 360) % 360; };
        return STK_PLATFORMS.map(x => { const ink = v3Ink(x.c); return { n: x.n, c: x.c, ink, h0: hue(x.c), h1: hue(ink) }; }); });
      const low = inks.filter(x => contrast('rgb(' + [1, 3, 5].map(i => parseInt(x.ink.slice(i, i + 2), 16)).join(',') + ')', 'rgb(8,8,8)') < 4.5);
      const drift = inks.filter(x => x.h0 != null && x.h1 != null && Math.min(Math.abs(x.h0 - x.h1), 360 - Math.abs(x.h0 - x.h1)) > 12);
      ok(inks.length > 10 && !low.length, 'every bank in the brand table reads at 4.5:1 on the chip black (' + inks.length + ' banks' + (low.length ? '; low: ' + low.map(x => x.n + ' ' + x.ink).join(', ') : '') + ')');
      ok(!drift.length, 'the lifted colour keeps each bank\'s hue (' + (drift.map(x => x.n + ' ' + x.c + '>' + x.ink).join(', ') || 'all within 12 degrees') + ')');
      // a logo that fails to load falls back to the bank's initial
      const fb = await p.evaluate(async () => { const c = V3.cash._chips.find(x => x.el.querySelector('img')); const img = c.el.querySelector('img'); if (img.complete && img.naturalWidth) img.dispatchEvent(new Event('error'));
        await new Promise(r => setTimeout(r, 50)); const m = c.el.querySelector('.cash-mono'); return { img: getComputedStyle(img).display, mono: m ? getComputedStyle(m).display : 'none', text: m ? m.textContent : '' }; });
      ok(fb.img === 'none' && fb.mono !== 'none' && fb.text.length > 0, 'a logo that fails falls back to the initial (' + JSON.stringify(fb) + ')');
      // the coins: the £1 has twelve flat sides; a block of 1,000 is one shape built from the hundred stacks of ten
      const g = await p.evaluate(() => { const o = { blocks: [], stacks: [] }; V3.cash.root.traverse(m => { if (!m.isInstancedMesh || !m.userData.v3Intro) return; const pos = m.geometry.attributes.position, nr = m.geometry.attributes.normal, ups = new Set(), sideN = new Set();
        for (let i = 0; i < pos.count; i++) { if (nr.getY(i) > 0.9) ups.add(pos.getX(i).toFixed(2) + ',' + pos.getZ(i).toFixed(2)); else if (Math.abs(nr.getY(i)) < 0.1) sideN.add(nr.getX(i).toFixed(3) + ',' + nr.getZ(i).toFixed(3)); }
        const bb = (m.geometry.computeBoundingBox(), m.geometry.boundingBox); (bb.max.x - bb.min.x > 10 ? o.blocks : o.stacks).push({ tris: pos.count / 3, ups: ups.size, sideNormals: sideN.size, count: m.userData.v3Full }); }); return o; });
      ok(g.stacks.length && g.stacks[0].sideNormals === 12, '£1 stacks have twelve flat sides (' + JSON.stringify(g.stacks[0]) + ')');
      ok(g.blocks.length && g.blocks[0].ups > 100 * 12, 'a block of 1,000 is the hundred coin tops in one shape, not a painted box (' + JSON.stringify(g.blocks[0]) + ')');
      ok(g.blocks.length === 2 && g.blocks.reduce((s, x) => s + x.count, 0) === 3, 'the three blocks of 1,000 draw as one batch per plate (' + g.blocks.map(x => x.count).join(' + ') + ')');
    }
    await ctx.close();
  }
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); server.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
