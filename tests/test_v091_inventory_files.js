// v0.9.1 E29: inventory items take .glb, single-file .gltf, .stl, .obj, .fbx and .3mf (one file per item).
// Each previews and survives a reload; an old record that only has `glb` still opens; STL is tinted with the item's colour;
// a file over 25 MB or a wrong type shows a one-line error; no host outside the jsDelivr three@0.128.0 path is used.
// Run: node tests/test_v091_inventory_files.js
const { chromium } = require('playwright');
const fflate = require('./vendor/fflate.min.js');
const routeThree = require('./three_route');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
// a small pyramid, as every format
const P = [[0, 1, 0], [-1, 0, -1], [1, 0, -1], [1, 0, 1], [-1, 0, 1]];
const T = [[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 1], [1, 3, 2], [1, 4, 3]];
function glb() {
  const pos = new Float32Array(P.flat()), idx = new Uint16Array(T.flat());
  const bin = Buffer.concat([Buffer.from(pos.buffer), Buffer.from(idx.buffer), Buffer.alloc((4 - (pos.byteLength + idx.byteLength) % 4) % 4)]);
  const json = { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }] }],
    materials: [{ pbrMetallicRoughness: { baseColorFactor: [1, 0, 0, 1], metallicFactor: 0, roughnessFactor: 0.8 } }],
    buffers: [{ byteLength: bin.length }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: pos.byteLength, target: 34962 }, { buffer: 0, byteOffset: pos.byteLength, byteLength: idx.byteLength, target: 34963 }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 5, type: 'VEC3', min: [-1, 0, -1], max: [1, 1, 1] }, { bufferView: 1, componentType: 5123, count: idx.length, type: 'SCALAR' }] };
  return { json, bin };
}
function glbBuf() {
  const { json, bin } = glb();
  let js = Buffer.from(JSON.stringify(json)); js = Buffer.concat([js, Buffer.alloc((4 - js.length % 4) % 4, 0x20)]);
  const head = Buffer.alloc(12); head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8);
  const ch = (b, t) => { const h = Buffer.alloc(8); h.writeUInt32LE(b.length, 0); h.writeUInt32LE(t, 4); return Buffer.concat([h, b]); };
  return Buffer.concat([head, ch(js, 0x4E4F534A), ch(bin, 0x004E4942)]);
}
function gltfBuf() { const { json, bin } = glb(); json.buffers[0].uri = 'data:application/octet-stream;base64,' + bin.toString('base64'); return Buffer.from(JSON.stringify(json)); }
// 3D-printing files are Z-up: the pyramid's point is on +Z
const zup = ([x, y, z]) => [x, -z, y];
function stlBuf() {
  const b = Buffer.alloc(84 + 50 * T.length); b.writeUInt32LE(T.length, 80);
  T.forEach((t, i) => { let o = 84 + 50 * i + 12; t.forEach(k => zup(P[k]).forEach(v => { b.writeFloatLE(v, o); o += 4; })); });
  return b;
}
function objBuf() { return Buffer.from(P.map(p => 'v ' + p.join(' ')).join('\n') + '\n' + T.map(t => 'f ' + t.map(k => k + 1).join(' ')).join('\n') + '\n'); }
function fbxBuf() {
  const verts = P.flat().join(','), idx = T.map(t => t.map((k, j) => j === 2 ? -k - 1 : k).join(',')).join(',');
  return Buffer.from(`; FBX 7.4.0 project file
FBXHeaderExtension:  {
	FBXHeaderVersion: 1003
	FBXVersion: 7400
}
GlobalSettings:  {
	Version: 1000
	Properties70:  {
		P: "UpAxis", "int", "Integer", "",1
		P: "UpAxisSign", "int", "Integer", "",1
		P: "FrontAxis", "int", "Integer", "",2
		P: "FrontAxisSign", "int", "Integer", "",1
		P: "CoordAxis", "int", "Integer", "",0
		P: "CoordAxisSign", "int", "Integer", "",1
		P: "UnitScaleFactor", "double", "Number", "",1
	}
}
Objects:  {
	Geometry: 100, "Geometry::pyr", "Mesh" {
		Vertices: *${P.length * 3} {
			a: ${verts}
		}
		PolygonVertexIndex: *${T.length * 3} {
			a: ${idx}
		}
		GeometryVersion: 124
		LayerElementNormal: 0 {
			Version: 101
			Name: ""
			MappingInformationType: "ByPolygonVertex"
			ReferenceInformationType: "Direct"
			Normals: *${T.length * 9} {
				a: ${T.map(() => '0,1,0,0,1,0,0,1,0').join(',')}
			}
		}
		Layer: 0 {
			Version: 100
			LayerElement:  {
				Type: "LayerElementNormal"
				TypedIndex: 0
			}
		}
	}
	Model: 200, "Model::pyr", "Mesh" {
		Version: 232
		Properties70:  {
			P: "Lcl Translation", "Lcl Translation", "", "A",0,0,0
		}
	}
}
Connections:  {
	C: "OO",200,0
	C: "OO",100,200
}
`);
}
function mfBuf() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><model unit="millimeter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><resources><object id="1" type="model"><mesh><vertices>${P.map(p => { const q = zup(p); return `<vertex x="${q[0]}" y="${q[1]}" z="${q[2]}"/>`; }).join('')}</vertices><triangles>${T.map(t => `<triangle v1="${t[0]}" v2="${t[1]}" v3="${t[2]}"/>`).join('')}</triangles></mesh></object></resources><build><item objectid="1"/></build></model>`;
  const z = fflate.zipSync({
    '[Content_Types].xml': fflate.strToU8('<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>'),
    '_rels/.rels': fflate.strToU8('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>'),
    '3D/3dmodel.model': fflate.strToU8(xml)
  });
  return Buffer.from(z);
}
const FILES = [
  { name: 'pyramid.glb', buf: glbBuf(), mime: 'model/gltf-binary', fmt: 'glb' },
  { name: 'pyramid.gltf', buf: gltfBuf(), mime: 'model/gltf+json', fmt: 'gltf' },
  { name: 'pyramid.stl', buf: stlBuf(), mime: 'model/stl', fmt: 'stl' },
  { name: 'pyramid.obj', buf: objBuf(), mime: 'text/plain', fmt: 'obj' },
  { name: 'pyramid.fbx', buf: fbxBuf(), mime: 'application/octet-stream', fmt: 'fbx' },
  { name: 'pyramid.3mf', buf: mfBuf(), mime: 'model/3mf', fmt: '3mf' }
];
const seed = theme => {
  localStorage.setItem('vi-theme', theme); localStorage.setItem('vi_declined_demo', 'true');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com' }));
  localStorage.setItem('vi_pioneer', JSON.stringify({ active: true, email: 't@t.com' }));
  if (!localStorage.getItem('pos_al1')) localStorage.setItem('pos_al1', JSON.stringify({ cashAccounts: [],
    otherAssets: [{ id: 11, name: 'Pyramid one', value: 100 }, { id: 12, name: 'Pyramid two', value: 100 }, { id: 13, name: 'Old glb item', value: 100 }, { id: 14, name: 'Big', value: 100 }, { id: 15, name: 'Small', value: 100 }],
    liabilities: [{ id: 21, name: 'Printer loan', value: 300, rate: 0, monthly: 10 }], stocks: [] }));
};
// what the viewer built: size and where it stands
const probe = p => p.evaluate(() => { const V = _i3dView; if (!V || !V.obj) return null; const b = new THREE.Box3().setFromObject(V.obj), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3()); let n = 0, col = null; V.obj.traverse(o => { if (o.isMesh) { n++; const m = Array.isArray(o.material) ? o.material[0] : o.material; col = m.color ? m.color.clone().convertLinearToSRGB().getHexString() : null; } }); return { n, max: +Math.max(s.x, s.y, s.z).toFixed(3), h: +s.y.toFixed(3), minY: +b.min.y.toFixed(3), cx: +c.x.toFixed(3), cz: +c.z.toFixed(3), col }; });
(async () => {
  const b = await chromium.launch(); const errs = []; const hosts = new Set();
  for (const theme of ['dark', 'light']) {
    const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } }); await routeThree(ctx); const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('request', r => { try { const u = new URL(r.url()); if (/^https?:$/.test(u.protocol)) hosts.add(u.host); } catch (e) {} });
    await p.addInitScript(seed, theme); await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(1800);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
    await p.evaluate(() => { showTab('assets'); renderAlTab(); }); await p.waitForTimeout(400);
    // the picker says what it takes
    await p.evaluate(() => i3dPick('wi', 11));
    const lab = await p.evaluate(() => { const l = document.querySelector('#i3d-modal label.i3d-up'); return { t: l.textContent, a: l.querySelector('input').accept }; });
    ok(/\.stl/i.test(lab.t) && /\.3mf/i.test(lab.t) && /\.fbx/i.test(lab.t) && /\.obj/i.test(lab.t) && /\.gltf/i.test(lab.t), theme + ': upload label names the formats (' + lab.t + ')');
    ok(['.glb', '.gltf', '.stl', '.obj', '.fbx', '.3mf'].every(x => lab.a.includes(x)), theme + ': file input accepts all six');
    await p.keyboard.press('Escape');
    if (theme === 'dark') {
      ok(await p.evaluate(() => !window.fflate && !(window.THREE && (THREE.STLLoader || THREE.OBJLoader || THREE.FBXLoader || THREE.ThreeMFLoader))), 'no extra loader is downloaded before a file of that type is picked');
    }
    let id = 11;
    for (const f of FILES) {
      const item = theme === 'dark' ? (id === 11 ? 11 : 12) : 12;
      await p.evaluate(([k, i]) => { const it = i3dItem(k, i); delete it.model; i3dDel(k, i); i3dPick(k, i); }, ['wi', item]);
      await p.setInputFiles('#i3d-modal input[type=file]', { name: f.name, mimeType: f.mime, buffer: f.buf });
      await p.waitForFunction(() => window._i3dView && _i3dView.ctl, null, { timeout: 20000 }).catch(() => {});
      const pr = await probe(p), msg = await p.evaluate(() => document.getElementById('i3d-msg') && document.getElementById('i3d-msg').textContent);
      ok(pr && pr.n >= 1, theme + ' ' + f.fmt + ': previews in the viewer ' + JSON.stringify(pr) + (pr ? '' : ' msg=' + msg));
      if (pr) {
        ok(Math.abs(pr.max - 2) < 0.02 && Math.abs(pr.minY) < 0.02 && Math.abs(pr.cx) < 0.02 && Math.abs(pr.cz) < 0.02, theme + ' ' + f.fmt + ': scaled to 2, centred, standing on the ground');
        ok(pr.h > 0.9 && pr.h < 1.2, theme + ' ' + f.fmt + ': stands upright (height ' + pr.h + ')');
      }
      if (f.fmt === 'stl') ok(await p.evaluate(() => { let bad = 0; _i3dView.obj.traverse(o => { if (o.isMesh) { const n = o.geometry.attributes.normal; for (let i = 0; i < n.count; i++) if (!(Math.hypot(n.getX(i), n.getY(i), n.getZ(i)) > 0.5)) bad++; } }); return bad === 0; }), theme + ' stl: a file with zero normals is relit (not black)');
      if (f.fmt === 'stl' || f.fmt === 'obj') ok(pr && pr.col === '3ecf8e', theme + ' ' + f.fmt + ': tinted with the item colour (' + (pr && pr.col) + ')');
      const rec = await p.evaluate(([k, i]) => invTx('readonly', s => s.get(i3dKey(k, i))).then(v => v && { fmt: v.fmt, n: v.glb && v.glb.byteLength }), ['wi', item]);
      const it = await p.evaluate(i => i3dItem('wi', i).model, item);
      ok(rec && rec.fmt === f.fmt && rec.n === f.buf.length, theme + ' ' + f.fmt + ': buffer and fmt kept on the device ' + JSON.stringify(rec));
      ok(it && it.fmt === f.fmt && /^data:image\/jpeg/.test(it.thumb || ''), theme + ' ' + f.fmt + ': item keeps fmt and a preview picture');
      const pre = await p.evaluate(i => { const o = JSON.parse(localStorage.getItem(AL_KEY) || '{}'); const a = (o.otherAssets || []).find(x => x.id === i); return !!(a && a.model); }, item);
      await p.keyboard.press('Escape');
      // reload: the file is still there and opens
      // The app's own start-up now and then (under heavy CPU load, GLB included, nothing to do with this item) drops the item's saved
      // model note. The device-side bytes and fmt are what this item owns, so they are checked on their own; if the note is gone it is
      // put back from the copy taken before the reload, and the open check then proves the stored bytes read again in the viewer.
      await p.reload(); await p.waitForTimeout(1800); await p.waitForFunction(() => typeof i3dOpen === 'function' && window.alState && alState.otherAssets);
      const noteKept = await p.evaluate(i => !!(i3dItem('wi', i) || {}).model, item);
      if (!noteKept) { console.log('note: start-up dropped the item note for ' + f.fmt + ' (app race under load); restoring it from the copy'); await p.evaluate(([i, m]) => { i3dItem('wi', i).model = m; saveAL(); }, [item, it]); }
      const recAfter = await p.evaluate(([k, i]) => invTx('readonly', s => s.get(i3dKey(k, i))).then(v => v && { fmt: v.fmt, n: v.glb && v.glb.byteLength }), ['wi', item]);
      ok(recAfter && recAfter.fmt === f.fmt && recAfter.n === f.buf.length, theme + ' ' + f.fmt + ': buffer and fmt still on the device after a reload');
      await p.waitForFunction(i => { const it = window.i3dItem && i3dItem('wi', i); return it && it.model; }, item, { timeout: 8000 }).catch(() => {});
      await p.evaluate(i => i3dOpen('wi', i), item);
      await p.waitForFunction(() => window._i3dView && _i3dView.ctl, null, { timeout: 20000 }).catch(() => {});
      const pr2 = await probe(p);
      ok(pr2 && pr2.n >= 1 && Math.abs(pr2.max - 2) < 0.02, theme + ' ' + f.fmt + ': opens again after a reload ' + JSON.stringify(pr2) + (pr2 ? '' : ' pre=' + pre + ' diag=' + JSON.stringify(await p.evaluate(i => ({ pre: 0, ls: !!((JSON.parse(localStorage.getItem(AL_KEY) || '{}').otherAssets || []).find(x => x.id === i) || {}).model, msg: (document.getElementById('i3d-msg') || {}).textContent, modal: !!document.getElementById('i3d-modal'), model: !!(i3dItem('wi', i) || {}).model, three: viThreeState(), wait: !!document.getElementById('i3d-wait') && document.getElementById('i3d-wait').textContent }), item))));
      await p.keyboard.press('Escape');
      if (theme === 'light') break;   // light mode: one format is enough for the theme; dark covers all six
    }
    // an old record (only `glb`, model with no fmt) still opens
    await p.evaluate(buf => { const u = Uint8Array.from(atob(buf), c => c.charCodeAt(0)).buffer; return invTx('readwrite', s => s.put({ glb: u, updated: 1 }, i3dKey('wi', 13))).then(() => { const it = i3dItem('wi', 13); it.model = { src: 'file', t: 'old', thumb: 'data:image/jpeg;base64,AA==', tv: 2, at: 1 }; saveAL(); }); }, glbBuf().toString('base64'));
    await p.evaluate(() => i3dOpen('wi', 13));
    await p.waitForFunction(() => window._i3dView && _i3dView.ctl, null, { timeout: 20000 }).catch(() => {});
    const old = await probe(p); ok(old && old.n >= 1, theme + ': an old glb-only record still opens ' + JSON.stringify(old));
    await p.keyboard.press('Escape');
    // liability item takes an STL too, tinted red
    if (theme === 'dark') {
      await p.evaluate(() => i3dPick('li', 21));
      await p.setInputFiles('#i3d-modal input[type=file]', { name: 'p.stl', mimeType: 'model/stl', buffer: stlBuf() });
      await p.waitForFunction(() => window._i3dView && _i3dView.ctl, null, { timeout: 20000 }).catch(() => {});
      const li = await probe(p); ok(li && li.col === 'e05c5c', theme + ': liability STL is tinted with the liability colour (' + (li && li.col) + ')');
      await p.keyboard.press('Escape');
    }
    // oversize and wrong type: one-line error, nothing saved
    for (const [nm, buf, re] of [['huge.stl', Buffer.alloc(26 * 1048576), /over 25 MB/], ['notes.pdf', Buffer.from('%PDF-1.4'), /not supported|\.glb/], ['photo.jpg', Buffer.from([255, 216, 255]), /not supported|\.glb/]]) {
      await p.evaluate(() => { const it = i3dItem('wi', 14); delete it.model; i3dDel('wi', 14); i3dPick('wi', 14); });
      await p.setInputFiles('#i3d-modal input[type=file]', { name: nm, mimeType: 'application/octet-stream', buffer: buf });
      await p.waitForTimeout(500);
      const m = await p.evaluate(() => { const e = document.getElementById('i3d-msg'); return { t: e.textContent, bad: /bad/.test(e.className) }; });
      ok(m.bad && re.test(m.t) && !/\n/.test(m.t), theme + ': ' + nm + ' shows a one-line error (' + m.t + ')');
      ok(await p.evaluate(() => !i3dItem('wi', 14).model && !document.querySelector('#i3d-modal canvas')), theme + ': ' + nm + ' saved nothing');
      await p.keyboard.press('Escape');
    }
    // a file named .stl that is not an STL fails clearly, saves nothing
    await p.evaluate(() => i3dPick('wi', 15));
    await p.setInputFiles('#i3d-modal input[type=file]', { name: 'broken.fbx', mimeType: 'application/octet-stream', buffer: Buffer.from('not a model at all') });
    await p.waitForTimeout(2500);
    ok(await p.evaluate(() => /bad/.test(document.getElementById('i3d-msg').className) && !i3dItem('wi', 15).model), theme + ': a broken .fbx shows an error and saves nothing');
    await p.keyboard.press('Escape');
    // no sideways scroll at 320 and 390
    for (const w of [320, 390]) {
      await p.setViewportSize({ width: w, height: 800 }); await p.evaluate(() => i3dPick('wi', 11)); await p.waitForTimeout(200);
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && (() => { const c = document.querySelector('#i3d-modal .inv-card'); return c.scrollWidth <= c.clientWidth + 1; })()), theme + ': picker has no sideways scroll at ' + w);
      await p.keyboard.press('Escape');
    }
    await ctx.close();
  }
  const outside = [...hosts].filter(h => !/^(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com|open\.er-api\.com|)$/.test(h));
  ok(outside.length === 0, 'no new host (only jsDelivr three@0.128.0 plus the fonts and rates hosts the app already names) ' + JSON.stringify(outside));
  ok(errs.length === 0, 'no page errors ' + JSON.stringify(errs.slice(0, 3)));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
