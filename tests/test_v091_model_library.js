// v0.9.1 E30: the 3D button opens a searchable grid over our own models/catalog.json (cars, instruments, collectibles, top 100).
// Search matches title, tags and set; a pick attaches the model and the viewer shows it; CC-BY credit on the item; a credits panel;
// stand-ins say so; files load only when picked or opened; nothing leaves the site; old Poly Pizza models and uploads still work.
// Run: node tests/test_v091_model_library.js
const { chromium } = require('playwright');
const routeThree = require('./three_route');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
function glb() {
  const pos = new Float32Array([0, 1, 0, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1]);
  const idx = new Uint16Array([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1, 1, 3, 2, 1, 4, 3]);
  const bin = Buffer.concat([Buffer.from(pos.buffer), Buffer.from(idx.buffer), Buffer.alloc((4 - (pos.byteLength + idx.byteLength) % 4) % 4)]);
  const json = { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }] }],
    materials: [{ pbrMetallicRoughness: { baseColorFactor: [0, 0.6, 1, 1], metallicFactor: 0, roughnessFactor: 0.8 } }],
    buffers: [{ byteLength: bin.length }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: pos.byteLength, target: 34962 }, { buffer: 0, byteOffset: pos.byteLength, byteLength: idx.byteLength, target: 34963 }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 5, type: 'VEC3', min: [-1, 0, -1], max: [1, 1, 1] }, { bufferView: 1, componentType: 5123, count: idx.length, type: 'SCALAR' }] };
  let js = Buffer.from(JSON.stringify(json)); js = Buffer.concat([js, Buffer.alloc((4 - js.length % 4) % 4, 0x20)]);
  const head = Buffer.alloc(12); head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8);
  const ch = (b, t) => { const h = Buffer.alloc(8); h.writeUInt32LE(b.length, 0); h.writeUInt32LE(t, 4); return Buffer.concat([h, b]); };
  return Buffer.concat([head, ch(js, 0x4E4F534A), ch(bin, 0x004E4942)]);
}
const GLB = glb();
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const mk = (id, set, item, title, tags, lic, creator, standin, extra) => Object.assign({ id, set, item, title, rank: 1, group: set, kind: 'x', tags, tris: 900, standin: !!standin, standinFor: standin ? item : undefined, provider: 'polypizza', licence: lic, creator,
  source: 'https://poly.pizza/m/' + id, attribution: '"' + title + '" by ' + creator + ', https://poly.pizza/m/' + id + '. Licence at https://creativecommons.org/licenses/by/3.0', file: 'glb/' + id + '.glb', thumb: 'thumb/' + id + '.webp', bytes: GLB.length }, extra || {});
const CAT = { count: 5, models: [
  mk('CAR1', 'cars', 'Ford Fiesta', 'Car Hatchback', ['Car', 'Vehicle', 'Sedan'], 'CC0 1.0', 'Kay Lousberg', true),
  mk('GTR1', 'instruments', 'Fender Stratocaster', 'Electric guitar', ['guitar', 'music'], 'CC-BY 3.0', 'Ada Maker', false),
  mk('COL1', 'collectibles', 'Rolex Submariner', 'Wrist Watch', ['watch', 'jewellery'], 'CC-BY 3.0', 'Poly by Google', true),
  mk('TOP1', 'top100', 'Sofa', 'Couch Medium', ['sofa', 'furniture'], 'CC0 1.0', 'Kenney', false),
  mk('TOP2', 'top100', 'Bicycle', 'Bike', ['bicycle'], 'CC0 1.0', 'Quaternius', false)] };
const CREDITS = '# 3D model credits\n\nModels from [Poly Pizza](https://poly.pizza), licensed CC0 or CC-BY.\n\n- "Electric guitar" by Ada Maker, https://poly.pizza/m/GTR1. Licence at https://creativecommons.org/licenses/by/3.0 (CC-BY 3.0)\n- "Car Hatchback" by Kay Lousberg, https://poly.pizza/m/CAR1. (CC0 1.0)\n';
const seed = theme => {
  localStorage.setItem('vi-theme', theme); localStorage.setItem('vi_declined_demo', 'true');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com' }));
  localStorage.setItem('vi_pioneer', JSON.stringify({ active: true, email: 't@t.com' }));
  if (!localStorage.getItem('pos_al1')) localStorage.setItem('pos_al1', JSON.stringify({ cashAccounts: [], otherAssets: [{ id: 11, name: 'Fender Stratocaster', value: 1200 }], liabilities: [{ id: 21, name: 'Car loan', value: 4000, balance: 4000, rate: 5, term: 24 }] }));
};
const idb = (p, key) => p.evaluate(k => invTx('readonly', s => s.get(k)).then(v => !!(v && v.glb)), key);
async function boot(b, theme, vp, extra) {
  const ctx = await b.newContext(Object.assign({ viewport: vp }, extra || {})); await routeThree(ctx);
  const st = { glb: 0, thumbs: 0, hosts: new Set(), cat: 0 };
  ctx.on('request', r => { try { const u = new URL(r.url()); if (u.protocol.startsWith('http')) st.hosts.add(u.host); } catch (e) {} });
  // fetch() cannot read file:// pages, so models/ requests are answered here, like the CDN: catalogue, files, thumbnails, credits
  const answer = (url) => {
    if (/models\/catalog\.json$/.test(url)) { st.cat++; return { type: 'application/json', body: Buffer.from(JSON.stringify(CAT)) }; }
    if (/models\/glb\/[^/]+\.glb$/.test(url)) { st.glb++; return { type: 'model/gltf-binary', body: GLB }; }
    if (/models\/thumb\//.test(url)) { st.thumbs++; return { type: 'image/png', body: PNG }; }
    if (/models\/CREDITS\.md$/.test(url)) return { type: 'text/markdown', body: Buffer.from(CREDITS) };
    return null;
  };
  await ctx.exposeFunction('__models', (url) => { const a = answer(url); return a ? { type: a.type, b64: a.body.toString('base64') } : null; });
  await ctx.addInitScript(() => { const of = window.fetch; window.fetch = function (u, o) { const url = String(u && u.url || u); if (!/(^|\/)models\//.test(url)) return of.apply(this, arguments);
    return window.__models(url).then(r => { if (!r) return new Response('', { status: 404 }); const bin = atob(r.b64), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Response(a, { status: 200, headers: { 'content-type': r.type } }); }); }; });
  const p = await ctx.newPage(); p.on('pageerror', e => st.err = (st.err || []).concat(e.message));
  await p.addInitScript(seed, theme); await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(1800);
  await p.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
  await p.evaluate(() => { showTab('assets'); renderAlTab(); }); await p.waitForTimeout(400);
  return { ctx, p, st };
}
const names = p => p.evaluate(() => [...document.querySelectorAll('#i3d-modal .i3d-li')].map(b => b.dataset.cid));
const search = async (p, q) => { await p.fill('#i3d-q', q); await p.waitForTimeout(150); return names(p); };
(async () => {
  const b = await chromium.launch();
  for (const theme of ['dark', 'light']) {
    const { ctx, p, st } = await boot(b, theme, { width: 1100, height: 900 });
    await p.evaluate(() => i3dPick('wi', 11)); await p.waitForSelector('#i3d-modal .i3d-li', { timeout: 8000 }).catch(() => {});
    const all = await names(p);
    ok(all.length === 5, theme + ': the grid lists the whole catalogue (' + all.length + ')');
    ok(all[0] === 'GTR1', theme + ': the best match for the item name comes first (' + all[0] + ')');
    ok(st.glb === 0, theme + ': no model file is fetched just by opening the picker');
    ok(await p.evaluate(() => [...document.querySelectorAll('#i3d-modal .i3d-li img')].every(i => i.loading === 'lazy')), theme + ': thumbnails load lazily');
    ok(JSON.stringify(await search(p, 'guitar')) === '["GTR1"]', theme + ': search matches tags');
    ok(JSON.stringify(await search(p, 'hatchback')) === '["CAR1"]', theme + ': search matches the title');
    ok(JSON.stringify(await search(p, 'collectibles')) === '["COL1"]', theme + ': search matches the set');
    ok(JSON.stringify(await search(p, 'fiesta')) === '["CAR1"]', theme + ': search matches the item the model stands for');
    ok(JSON.stringify(await search(p, 'zzzz')) === '[]' && /No models match/.test(await p.evaluate(() => document.getElementById('i3d-modal').textContent)), theme + ': no hits says so');
    await search(p, '');
    await p.click('#i3d-modal [data-set="cars"]'); await p.waitForTimeout(100);
    ok(JSON.stringify(await names(p)) === '["CAR1"]', theme + ': the Cars chip filters');
    ok(/Close match/i.test(await p.evaluate(() => document.querySelector('#i3d-modal .i3d-li').textContent)) && /Ford Fiesta/.test(await p.evaluate(() => document.querySelector('#i3d-modal .i3d-li').textContent)), theme + ': a stand-in says "Close match" and names the item');
    await p.click('#i3d-modal [data-set="all"]');
    ok(await p.evaluate(() => !!document.querySelector('#i3d-modal input[type=file]')), theme + ': upload-your-own is still there');
    // pick a CC-BY model
    await p.click('#i3d-modal .i3d-li[data-cid="GTR1"]'); await p.waitForFunction(() => window._i3dView, null, { timeout: 15000 }).catch(() => {});
    const m = await p.evaluate(() => { const x = i3dItem('wi', 11).model; return { src: x.src, lic: x.lic, by: x.by, t: x.t, file: x.file, credit: (document.querySelector('#i3d-modal .i3d-credit') || {}).textContent || '', tile: (document.querySelector('#other-assets-list .i3d-itemcredit') || {}).textContent || '' }; });
    ok(!!(await p.evaluate(() => window._i3dView)) && m.src === 'lib' && m.lic === 'CC-BY' && st.glb === 1, theme + ': picking attaches the model, the viewer shows it, one file fetched ' + JSON.stringify([m.src, m.lic, st.glb]));
    ok(/Electric guitar/.test(m.credit) && /Ada Maker/.test(m.credit), theme + ': the viewer shows the CC-BY credit');
    ok(/Electric guitar/.test(m.tile) && /Ada Maker/.test(m.tile) && /CC-BY/.test(m.tile), theme + ': the item tile shows the CC-BY credit line (' + m.tile + ')');
    // reload keeps it, no refetch
    await p.evaluate(() => i3dClose()); await p.reload(); await p.waitForTimeout(1800);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
    await p.evaluate(() => { showTab('assets'); renderAlTab(); });
    await p.waitForFunction(() => { const x = window.i3dItem && i3dItem('wi', 11); return !!(x && x.model); }, null, { timeout: 8000 }).catch(() => {}); await p.evaluate(() => renderAlTab()); await p.waitForTimeout(400);
    ok(await p.evaluate(() => { const x = i3dItem('wi', 11); return !!(x && x.model && x.model.src === 'lib'); }) && await p.evaluate(() => !!document.querySelector('#other-assets-list img.i3d-thumb')), theme + ': the attached model and its preview survive a reload');
    await p.evaluate(() => i3dOpen('wi', 11)); await p.waitForFunction(() => window._i3dView, null, { timeout: 15000 }).catch(() => {});
    ok(await p.evaluate(() => !!window._i3dView) && st.glb === 1, theme + ': it reopens from the device copy without downloading again (' + st.glb + ')');
    // device copy gone (another device): the file is fetched when opened
    await p.evaluate(() => { i3dClose(); return i3dDel('wi', 11); }); await p.waitForTimeout(200);
    await p.evaluate(() => i3dOpen('wi', 11)); await p.waitForFunction(() => window._i3dView, null, { timeout: 15000 }).catch(() => {});
    ok(await p.evaluate(() => !!window._i3dView) && st.glb === 2 && await idb(p, 'm:wi:11'), theme + ': a missing device copy is fetched from the library on open (' + st.glb + ')');
    await p.evaluate(() => i3dClose());
    // liabilities: stand-in model, CC0, close-match note on the item
    await p.evaluate(() => i3dPick('li', 21)); await p.waitForSelector('#i3d-modal .i3d-li');
    await p.click('#i3d-modal .i3d-li[data-cid="CAR1"]'); await p.waitForFunction(() => window._i3dView, null, { timeout: 15000 }).catch(() => {});
    const li = await p.evaluate(() => ({ m: i3dItem('li', 21).model, hint: (document.querySelector('#i3d-modal .inv-hint') || {}).textContent || '' }));
    ok(li.m && li.m.src === 'lib' && li.m.standin === true && /close match/i.test(document_text(li.hint)), theme + ': liabilities attach too, and the viewer says it is a close match');
    await p.evaluate(() => i3dClose());
    // credits panel from the picker
    await p.evaluate(() => i3dPick('wi', 11)); await p.waitForSelector('#i3d-modal .i3d-li');
    await p.click('#i3d-modal [data-credits]'); await p.waitForSelector('#i3d-modal .i3d-credits li', { timeout: 5000 }).catch(() => {});
    const cr = await p.evaluate(() => ({ n: document.querySelectorAll('#i3d-modal .i3d-credits li').length, a: !!document.querySelector('#i3d-modal .i3d-credits a[href^="https://poly.pizza"]'), rel: (document.querySelector('#i3d-modal .i3d-credits a') || {}).rel }));
    ok(cr.n === 2 && cr.a && /noopener/.test(cr.rel || ''), theme + ': the 3D model credits panel renders CREDITS.md (' + JSON.stringify(cr) + ')');
    await p.evaluate(() => i3dClose());
    // legacy: a Poly Pizza model saved before this round keeps working, mapped onto the catalogue when its device copy is gone
    await p.evaluate(() => { const x = i3dItem('wi', 11); x.model = Object.assign({}, x.model, { src: 'pp', id: 'GTR1', k: 'guitar', t: 'Guitar', by: 'Q', lic: 'CC0', f: 'x', file: undefined }); saveAL(); return i3dDel('wi', 11); });
    const before = st.glb; await p.evaluate(() => i3dOpen('wi', 11)); await p.waitForFunction(() => window._i3dView, null, { timeout: 15000 }).catch(() => {});
    ok(await p.evaluate(() => !!window._i3dView) && st.glb === before + 1, theme + ': an old Poly Pizza model re-opens from our own library');
    ok(![...st.hosts].some(h => /poly\.pizza|ptlive|r2\.|cloudflarestorage|sketchfab/.test(h)), theme + ': the library never touches Poly Pizza, R2 or any new host (' + [...st.hosts].join(',') + ')');
    ok(!st.err, theme + ': no page errors ' + (st.err || []).join('|'));
    await ctx.close();
  }
  // phones: no sideways scroll at 320 and 390, reduced motion, text floor
  for (const w of [320, 390]) {
    const { ctx, p, st } = await boot(b, 'dark', { width: w, height: 760 }, { reducedMotion: 'reduce' });
    await p.evaluate(() => i3dPick('wi', 11)); await p.waitForSelector('#i3d-modal .i3d-li');
    await p.fill('#i3d-q', 'car'); await p.waitForTimeout(150);
    const r = await p.evaluate(() => { let small = 0; document.querySelectorAll('#i3d-modal *').forEach(e => { if ([...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 10.5) small++; });
      const c = document.querySelector('#i3d-modal .inv-card'); return { side: document.documentElement.scrollWidth - innerWidth, card: c.scrollWidth - c.clientWidth, small, anim: [...document.querySelectorAll('#i3d-modal *')].some(e => getComputedStyle(e).animationName !== 'none') }; });
    ok(r.side <= 0 && r.card <= 0, w + ' px: no sideways scroll (' + r.side + ',' + r.card + ')');
    ok(r.small === 0, w + ' px: no text under 10.5 px (' + r.small + ')');
    ok(!r.anim, w + ' px: no animation under reduced motion');
    await ctx.close();
  }
  // hosting: the build copies the library into the app, the service worker leaves models/ alone, nothing outside the notice
  const fs = require('fs'), sw = fs.readFileSync(__dirname + '/../sw.js', 'utf8'), bs = fs.readFileSync(__dirname + '/../tools/build_site.js', 'utf8');
  ok(/\\\/models\\\//.test(sw) && !/models/.test(sw.slice(0, sw.indexOf('addEventListener'))), 'the service worker neither precaches nor caches models/');
  ok(/'glb', 'thumb'/.test(bs) && /catalog\.json/.test(bs) && /CREDITS\.md/.test(bs), 'tools/build_site.js copies models/ into the app build');
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
function document_text(s) { return String(s); }
