// v0.9.1 round 2, chunk F (owner, 4 Nov 2026), Wealth inventory and Liabilities 3D item viewer:
// R17 "more contrast on the ground plane and sky, sharper ground plane lines, good lighting in the environment which should have a
//     teal hue but the lighting on the object is white light, apply to liabilities viewport too, the remove x icon needs to be top right"
// R18 "as its just one 3D model it should run smooth as closing the expanded viewport takes 5 seconds"
// R21 "Liabilities and Wealth Inventory remove search discogs"
// Run: node tests/test_v091r2_item_viewer.js   (VI_APP=file:///... to point at another checkout)
const { chromium } = require('playwright'); const routeThree = require('./three_route'); const fs = require('fs'), path = require('path');
const APP = process.env.VI_APP || 'file:///home/user/Vault-It/index.html';
const GLB = fs.readFileSync(path.join(__dirname, '..', 'models', 'glb', 'acoustic-guitar-1ff041bee8.glb'));
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const seed = theme => {
  localStorage.setItem('vi-theme', theme);
  localStorage.setItem('vi_declined_demo', 'true');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com' }));
  localStorage.setItem('vi_pioneer', JSON.stringify({ active: true, email: 't@t.com' }));
  if (!localStorage.getItem('pos_al1')) localStorage.setItem('pos_al1', JSON.stringify({ cashAccounts: [], otherAssets: [{ id: 11, name: 'Acoustic guitar', value: 900 }], liabilities: [{ id: 21, name: 'Car', value: 4000, rate: 0, depRate: 10, running: 100 }] }));
};
async function page(b, vp, mobile, theme) {
  const ctx = await b.newContext(Object.assign({ viewport: vp }, mobile ? { isMobile: true, hasTouch: true } : {}));
  await routeThree(ctx); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(seed, theme); await p.goto(APP); await p.waitForTimeout(1500);
  await p.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
  await p.evaluate(() => { showTab('assets'); const b = [...document.querySelectorAll('#assets-page .subtab-btn')].find(x => /'other'/.test(x.getAttribute('onclick') || '')); showSubtab('assets', 'other', b); });
  await p.waitForFunction(() => window.THREE && THREE.OrbitControls && THREE.GLTFLoader, null, { timeout: 20000 }).catch(() => {});
  return { ctx, p, errs };
}
async function addModel(p, kind, id) {
  await p.evaluate(([k, i]) => i3dPick(k, i), [kind, id]); await p.waitForTimeout(200);
  await p.setInputFiles('#i3d-modal input[type=file]', { name: 'guitar.glb', mimeType: 'model/gltf-binary', buffer: GLB });
  await p.waitForFunction(() => window._i3dView && _i3dView.ctl, null, { timeout: 20000 }).catch(() => {});
  await p.evaluate(() => i3dClose()); await p.waitForTimeout(300);
}
// counts animation frames the viewer itself asks for, and long tasks on the main thread
const instrument = p => p.evaluate(() => {
  window._lt = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => window._lt.push(e.duration))).observe({ entryTypes: ['longtask'] }); } catch (e) { }
});
(async () => {
  const b = await chromium.launch(); const T = {};
  for (const [vp, mobile] of [[{ width: 1100, height: 900 }, false], [{ width: 390, height: 844 }, true]]) {
    const tag = vp.width + 'px';
    const { ctx, p, errs } = await page(b, vp, mobile, 'dark'); await instrument(p);
    await addModel(p, 'wi', 11);
    // R17: the card's remove X shows top right, above the 3D picture (it sat under it)
    const del = await p.evaluate(() => { const d = document.querySelector('#other-assets-list .wi-del'); if (!d) return null; d.scrollIntoView({ block: 'center' });
      const r = d.getBoundingClientRect(), t = d.closest('.wi-tile').getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { onTop: !!hit && (hit === d || d.contains(hit)), topRight: r.right > t.right - 40 && r.top < t.top + 40 }; });
    ok(del && del.onTop && del.topRight, tag + ': the remove X on a wealth inventory card shows top right, above the 3D picture');
    // R21: no Discogs search in the second-hand price links (eBay stays)
    const links = await p.evaluate(() => { wiLinkModal(); document.getElementById('wl-mq').value = 'guitar'; wiMkLinks(); const h = document.getElementById('wl-mlinks').innerHTML; return { discogs: /discogs/i.test(h), ebay: /ebay/i.test(h) }; });
    ok(!links.discogs && links.ebay, tag + ': the second-hand links no longer offer "Search Discogs" (eBay sold items stays)');
    await p.evaluate(() => { const m = document.getElementById('wi-link-modal') || document.querySelector('.wi-link-modal'); if (m) m.hidden = true; document.body.classList.remove('vi-pop-open'); });
    // R18: open, then close; close must hand control back at once and leave nothing drawing
    const open = await p.evaluate(async () => { const t0 = performance.now(); await i3dOpen('wi', 11);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return performance.now() - t0; });
    // one model turning: one draw per frame, and frames stay quick (the old loop queued itself twice a frame, so draws doubled every frame)
    const run = await p.evaluate(async () => { const r = _i3dView.r, o = r.render.bind(r); let n = 0; r.render = function () { n++; return o.apply(null, arguments); };
      let f = 0, worst = 0, last = performance.now(); await new Promise(res => { const step = () => { const t = performance.now(); worst = Math.max(worst, t - last); last = t; if (++f < 30) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); setTimeout(res, 6000); });
      r.render = o; return { perFrame: n / f, worst: Math.round(worst), frames: f }; });
    T[tag] = { turning: run };
    // R17: the stage is lit teal, the model is lit white
    // the teal lives in the stage (sky dome, pool of light on the floor, fog), never in a light, so no colour reaches the model
    const lit = await p.evaluate(() => { const L = [], E = []; _i3dView.sc.traverse(o => { if (o.isLight) L.push(o.color.getHex()); if (o.userData && o.userData.i3dEnv) E.push(o.userData.i3dEnv); });
      const teal = h => { const r = h >> 16 & 255, g = h >> 8 & 255, b = h & 255; return g > r + 20 && b > r + 10; };
      return { L, E, envTeal: E.length >= 2 && E.every(teal) && teal(_i3dView.sc.fog.color.clone().convertLinearToSRGB().getHex()), white: L.length >= 3 && L.every(c => c === 0xffffff) }; });
    ok(lit.envTeal && lit.white, tag + ': the stage glows teal (sky, floor and fog) and every light on the model is white (' + JSON.stringify(lit) + ')');
    ok(run.perFrame <= 1.05 && run.frames >= 30, tag + ': auto-rotate draws the model once a frame (' + run.perFrame.toFixed(2) + ' draws a frame over ' + run.frames + ' frames)');
    ok(run.worst < 250, tag + ': no frame takes longer than 250 ms while it turns (worst ' + run.worst + ' ms)');
    await p.waitForTimeout(2000);
    // what the owner feels: a real click on the close X, timed from outside the page, until the viewer is gone
    const x = await p.$('#i3d-modal .inv-x'); const xb = x && await x.boundingBox();
    const cb = await (await p.$('#i3d-modal .inv-card')).boundingBox(), inTopRight = !!xb && cb.x + cb.width - (xb.x + xb.width) < 30 && xb.y - cb.y < 30 && xb.x + xb.width <= vp.width && xb.y >= 0;
    ok(inTopRight, tag + ': the close X sits top right of the expanded viewer, on screen (' + (xb ? Math.round(xb.x) + ',' + Math.round(xb.y) : 'missing') + ')');
    const c0 = Date.now(); if (xb) await p.mouse.click(xb.x + xb.width / 2, xb.y + xb.height / 2);
    await p.waitForFunction(() => !document.getElementById('i3d-modal'), null, { timeout: 20000 }).catch(() => {}); const tapClose = Date.now() - c0;
    T[tag].tapToClosed = tapClose;
    ok(tapClose < 800, tag + ': a click on X closes the viewer within 800 ms (took ' + tapClose + ' ms)');
    await p.evaluate(() => i3dOpen('wi', 11)); await p.waitForFunction(() => window._i3dView && _i3dView.ctl, null, { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(1500);
    const close = await p.evaluate(async () => {
      window._lt = []; const v = _i3dView; let frames = 0; const raf = window.requestAnimationFrame;
      const t0 = performance.now(); i3dClose(); const sync = performance.now() - t0;
      // the page paints again: two frames after the close
      await new Promise(r => raf(() => raf(r))); const paint = performance.now() - t0;
      // for one second after the close, no frame is asked for by the closed viewer
      const was = v && v.r; let drawn = 0; if (was) { const o = was.render.bind(was); was.render = function () { drawn++; return o.apply(null, arguments); }; }
      await new Promise(r => setTimeout(r, 1000));
      return { sync, paint, drawn, gone: !document.getElementById('i3d-modal') && !document.querySelector('canvas.i3d-canvas'), dead: !!(v && v.dead), raf: v && v.raf, view: !!window._i3dView,
        longest: Math.max(0, ...window._lt) };
    });
    T[tag] = { ...T[tag], open: Math.round(open), closeSync: Math.round(close.sync), closePaint: Math.round(close.paint), longestTaskAfterClose: Math.round(close.longest) };
    ok(close.gone && close.dead && !close.raf && !close.view && close.drawn === 0, tag + ': closing the expanded viewer removes it, stops its loop and draws nothing after (drawn ' + close.drawn + ')');
    ok(close.paint < 600, tag + ': closing hands the page back within 600 ms (took ' + Math.round(close.paint) + ' ms)');
    ok(close.longest < 300, tag + ': no long main-thread task in the second after closing (longest ' + Math.round(close.longest) + ' ms)');
    // a picture saved by the earlier look (tv 2) is redrawn once in the new look and marked tv 3, so a reload never redraws it again
    if (!mobile) {
      await p.evaluate(() => { const it = alState.otherAssets.find(x => x.id === 11); it.model.tv = 2; it.model.thumb = 'data:image/jpeg;base64,AAAA'; saveAL(); });
      await p.reload(); await p.waitForTimeout(1500); await p.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
      await p.waitForFunction(() => window.THREE && THREE.GLTFLoader, null, { timeout: 20000 }).catch(() => {});
      await p.evaluate(() => i3dRefreshThumbs()); await p.waitForFunction(() => { const it = alState.otherAssets.find(x => x.id === 11); return it.model.tv !== 2 && !_i3dRe.run; }, null, { timeout: 20000 }).catch(() => {});
      const re = await p.evaluate(() => { const m = alState.otherAssets.find(x => x.id === 11).model; return { tv: m.tv, fresh: m.thumb.length > 1000 }; });
      ok(re.tv === 3 && re.fresh, tag + ': a picture from the earlier look is redrawn once and marked as the new look (tv ' + re.tv + ')');
      await p.reload(); await p.waitForTimeout(1500); await p.waitForFunction(() => window.THREE && THREE.GLTFLoader, null, { timeout: 20000 }).catch(() => {});
      const again = await p.evaluate(() => { const before = alState.otherAssets.find(x => x.id === 11).model.thumb; i3dRefreshThumbs(); return !_i3dRe.run && alState.otherAssets.find(x => x.id === 11).model.thumb === before; });
      ok(again, tag + ': after a reload the picture is not redrawn again');
    }
    if (errs.length) ok(false, tag + ': page errors ' + errs.join(' | '));
    await ctx.close();
  }
  console.log('TIMINGS ' + JSON.stringify(T));
  await b.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL OK'); process.exit(fails ? 1 : 0);
})();
