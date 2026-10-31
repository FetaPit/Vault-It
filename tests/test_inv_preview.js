// Round 3, item 13 (owner, 31 Oct 2026): "the uploaded photos are not present when an item tile is expanded". Full photos are kept on
// the device they were added on (IndexedDB); the cloud copy and a new web address (app.vault-it.co) carry only the item's preview.
// The viewer now shows that preview and says where the photos are; tapping the tile's picture opens it; photos added on this device
// still show in the strip and the spin.
// Run: node tests/test_inv_preview.js   (VI_APP=file:///path/to/index.html to test another copy)
const { chromium } = require('playwright'); const fs = require('fs'), os = require('os'), path = require('path');
const APP = process.env.VI_APP || 'file:///home/user/Vault-It/index.html';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const src = fs.readFileSync(__dirname + '/test_nw3d.js', 'utf8');
const seed = eval('(' + src.slice(src.indexOf('const seed = (o) =>') + 'const seed = '.length, src.indexOf('// WCAG AA')).trim().replace(/;$/, '') + ')');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); await ctx.route(/^https?:/, r => r.abort());
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(seed, { theme: 'dark', flag: true }); await p.goto(APP); await p.waitForTimeout(1500);
  await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#pro-offer-modal,#sync-banner,#trial-banner,#tester-welcome{display:none!important}' });
  await p.evaluate(() => showTab('assets')); await p.waitForTimeout(400);
  const jpg = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 160; const x = c.getContext('2d'); x.fillStyle = '#c33'; x.fillRect(0, 0, 160, 160); return c.toDataURL('image/jpeg').split(',')[1]; });
  const f = path.join(os.tmpdir(), 'vi-inv-' + process.pid + '.jpg'); fs.writeFileSync(f, Buffer.from(jpg, 'base64'));
  const id = await p.evaluate(() => alState.otherAssets[0].id);
  // 1. a preview only (photos on another device): the viewer shows it and says why
  await p.evaluate(([id, j]) => { const a = alState.otherAssets.find(x => x.id === id); a.image = 'data:image/jpeg;base64,' + j; a.photos = 3; renderOtherAssets && renderOtherAssets(); }, [id, jpg]).catch(() => {});
  await p.evaluate((id) => invOpenViewer(id), id); await p.waitForTimeout(800);
  let r = await p.evaluate(() => { const m = document.getElementById('inv-modal'), im = m.querySelector('.inv-prev'); return { w: im && im.naturalWidth, vis: im && im.getBoundingClientRect().width > 50, empty: !!m.querySelector('.inv-empty'), hint: m.querySelector('.inv-hint').textContent, sub: m.querySelector('.inv-s').textContent }; });
  ok(r.w === 160 && r.vis && !r.empty, 'photos kept on another device: the viewer shows the saved preview instead of "No photos yet"');
  ok(/kept on the device they were added on/.test(r.hint) && /3 photos on another device/.test(r.sub), 'and says where the full photos are (' + r.sub + ')');
  await p.evaluate(() => invCloseViewer());
  // 2. photos added on this device: strip and spin, as before
  await p.evaluate((id) => { const a = alState.otherAssets.find(x => x.id === id); a.image = null; a.photos = 0; }, id);
  await p.evaluate(() => renderAL && renderAL()).catch(() => {});
  await p.evaluate(() => typeof renderOtherAssets === 'function' ? renderOtherAssets() : 0).catch(() => {});
  const inp = await p.$('input[type=file][onchange^="wiUpload(' + id + '"]');
  ok(!!inp, 'the tile has its photo upload');
  if (inp) { await inp.setInputFiles(f); await p.waitForTimeout(2000); }
  r = await p.evaluate((id) => { const t = [...document.querySelectorAll('.wi-tile')].find(x => x.querySelector('[onchange^="wiUpload(' + id + '"]')); const img = t && t.querySelector('img.wi-open'); return { open: !!img && /invOpenViewer/.test(img.getAttribute('onclick')), exp: !!(t && t.querySelector('.inv-exp')) }; }, id);
  ok(r.open && r.exp, 'tapping the tile\'s picture opens the viewer (and the ⤢ button is there)');
  await p.evaluate((id) => document.querySelector('img.wi-open[onclick="invOpenViewer(' + id + ')"]').click(), id); await p.waitForTimeout(1000);
  r = await p.evaluate(() => { const m = document.getElementById('inv-modal'); return m && { th: [...m.querySelectorAll('.inv-th img')].map(i => i.naturalWidth), prev: !!m.querySelector('.inv-prev'), cv: !document.getElementById('inv-big').hidden }; });
  ok(r && r.th.length === 1 && r.th[0] > 0 && !r.prev && r.cv, 'a photo added on this device shows in the viewer\'s strip and stage');
  fs.unlinkSync(f); await b.close();
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
