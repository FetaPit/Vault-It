// ═══════════════════════════════════════════════════════════════
// YOUR OWN DESIGN — an uploaded GLB/GLTF or a Meshy AI model becomes the House Builder's house. It follows the same
// rules as the standard houses: a teal hologram that builds up to 100% of the deposit, then full colour as you own it.
// The model file is kept on this device (IndexedDB); its details are in localStorage 'vi_hb_design'.
// ═══════════════════════════════════════════════════════════════
function hbDesignMeta() { try { return JSON.parse(localStorage.getItem('vi_hb_design') || 'null'); } catch (e) { return null; } }
function hbDesignSetMeta(m) { try { if (m) localStorage.setItem('vi_hb_design', JSON.stringify(m)); else localStorage.removeItem('vi_hb_design'); } catch (e) {} }
// on = the user chose to show their design and it is ready to draw
var HB_DESIGN_LOCKED = true;   // Your own design: locked for everyone (owner, 1 Nov 2026: Pro, after the MVP); saved designs are left as they are
function hbDesignOn() { if (HB_DESIGN_LOCKED) return false; var m = hbDesignMeta(); if (!m || !m.active || !hb3dOn()) return false; if (!HB3DAPP.customModel || HB3DAPP.designId !== m.id) { hbDesignEnsure(); return false; } return true; }
function _hbIdb() {
  return new Promise(function (res, rej) {
    if (!window.indexedDB) return rej(new Error('no IndexedDB'));
    var rq = indexedDB.open('vaultit-house', 1);
    rq.onupgradeneeded = function () { rq.result.createObjectStore('designs'); };
    rq.onsuccess = function () { res(rq.result); }; rq.onerror = function () { rej(rq.error); };
  });
}
function hbDesignPut(buf) { return _hbIdb().then(function (db) { return new Promise(function (res, rej) { var tx = db.transaction('designs', 'readwrite'); tx.objectStore('designs').put(buf, 'current'); tx.oncomplete = function () { res(); }; tx.onerror = function () { rej(tx.error); }; }); }); }
function hbDesignGet() { return _hbIdb().then(function (db) { return new Promise(function (res, rej) { var rq = db.transaction('designs').objectStore('designs').get('current'); rq.onsuccess = function () { res(rq.result || null); }; rq.onerror = function () { rej(rq.error); }; }); }); }
function hbDesignDel() {if(viBlockEdit())return; return _hbIdb().then(function (db) { return new Promise(function (res) { var tx = db.transaction('designs', 'readwrite'); tx.objectStore('designs').delete('current'); tx.oncomplete = function () { res(); }; tx.onerror = function () { res(); }; }); }).catch(function () {}); }
function _hbGltfLoader() {
  var G = window.THREE && (THREE.GLTFLoader || window.GLTFLoader);
  if (G) return Promise.resolve(G);
  return new Promise(function (res, rej) {
    var sc = document.createElement('script'); sc.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
    sc.onload = function () { var G2 = THREE.GLTFLoader || window.GLTFLoader; G2 ? res(G2) : rej(new Error('3D file reader unavailable')); };
    sc.onerror = function () { rej(new Error('Could not load the 3D file reader. Check your connection')); };
    document.head.appendChild(sc);
  });
}
// ArrayBuffer (GLB, or GLTF JSON with embedded data) → HB3D model
function hbDesignParse(buf, meta) {
  if (!viGlOk() || typeof HB3D === 'undefined') return Promise.reject(new Error('3D engine not available on this device'));
  if (!window.THREE || !HB3D.customModel) return new Promise(function (res, rej) { viThree(res, function () { rej(new Error('The 3D engine could not be downloaded. Check the connection and try again.')); }); }).then(function () { return HB3D.customModel ? hbDesignParse(buf, meta) : Promise.reject(new Error('3D engine not available on this device')); });
  return _hbGltfLoader().then(function (G) {
    return new Promise(function (res, rej) {
      try { new G().parse(buf, '', function (gltf) { res(HB3D.customModel(gltf.scene || (gltf.scenes && gltf.scenes[0]), meta)); }, function (e) { rej(new Error('Could not read that 3D file' + (e && e.message ? ': ' + e.message : ''))); }); }
      catch (e) { rej(e); }
    });
  });
}
var _hbDesignLoading = null;
function hbDesignEnsure() {
  var m = hbDesignMeta(); if (!m || !m.active || _hbDesignLoading || (HB3DAPP.customModel && HB3DAPP.designId === m.id)) return _hbDesignLoading;
  _hbDesignLoading = hbDesignGet().then(function (buf) {
    if (!buf) { m.active = false; m.missing = true; hbDesignSetMeta(m); hbDesignCard(); return null; }   // file not on this device
    return hbDesignParse(buf, m).then(function (model) {
      HB3DAPP.customModel = model; HB3DAPP.designId = m.id; hbDesignCard();
      if (typeof redraw === 'function') redraw();
      return model;
    });
  }).catch(function (e) { console.info('[Vault-It] design not shown:', e && e.message); }).then(function (r) { _hbDesignLoading = null; return r; });
  return _hbDesignLoading;
}
// save a new design (bytes + details) and make it the House Builder's house
function hbDesignAdopt(buf, meta) {
  meta.id = 'd' + Date.now().toString(36); meta.active = true; meta.at = new Date().toISOString(); meta.bytes = buf.byteLength;
  return hbDesignParse(buf, meta).then(function (model) {
    return hbDesignPut(buf).catch(function () { meta.unsaved = true; }).then(function () {
      hbDesignSetMeta(meta); HB3DAPP.customModel = model; HB3DAPP.designId = meta.id;
      hbDesignCard(); if (typeof updateUI === 'function') updateUI(); else if (typeof redraw === 'function') redraw();
      var sc = document.getElementById('houseSceneCard'); if (sc && sc.scrollIntoView) sc.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return model;
    });
  });
}
function hbDesignToggle(on) {
  var m = hbDesignMeta(); if (!m) return;
  m.active = !!on; hbDesignSetMeta(m);
  if (on) hbDesignEnsure();
  hbDesignCard(); if (typeof updateUI === 'function') updateUI();
}
function hbDesignRemove() {if(viBlockEdit())return;
  hbDesignDel(); hbDesignSetMeta(null); HB3DAPP.customModel = null; HB3DAPP.designId = '';
  hbDesignCard(); if (typeof updateUI === 'function') updateUI();
  if (typeof showToast === 'function') showToast('Design removed. Back to the standard ' + (state.houseType || 'house'));
}
// status line + controls on the "Upload 3D Model" card
function hbDesignCard() {
  var el = document.getElementById('hb-design-status'); if (!el) return;
  var m = hbDesignMeta();
  if (!m) { el.innerHTML = ''; el.style.display = 'none'; return; }
  var own = document.getElementById('hb-own-design'); if (own) own.open = true;
  var src = m.source === 'ai' ? 'AI design' : 'Uploaded design', esc = function (t) { return String(t || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var info = HB3DAPP.customModel && HB3DAPP.designId === m.id ? HB3DAPP.customModel.info : null;
  el.style.display = 'block';
  el.innerHTML = '<div class="hbd-row"><b>' + src + '</b> · ' + esc(m.name) + (info ? ' <span class="hbd-dim">· ' + info.width.toFixed(1) + ' × ' + info.depth.toFixed(1) + ' m, ' + info.height.toFixed(1) + ' m tall</span>' : '') + '</div>'
    + (m.missing ? '<div class="hbd-dim">The model file is on another device. Upload or generate it again here.</div>'
      : '<div class="hbd-dim">' + (m.active ? 'Shown in House Builder: a hologram that builds with your deposit, full colour as you own it.' : 'Hidden. House Builder shows the standard house.') + '</div>')
    + '<div class="hbd-btns">' + (m.missing ? '' : '<button class="stk-btn" onclick="hbDesignToggle(' + (m.active ? 'false' : 'true') + ')">' + (m.active ? 'Show standard house' : 'Show my design') + '</button>')
    + '<button class="stk-btn" onclick="hbDesignRemove()">Remove design</button></div>';
}

// restore the user's design (and any AI generation still running) once the page has settled
setTimeout(function () { if (HB_DESIGN_LOCKED) return; try { hbDesignCard(); hbDesignEnsure(); hbMeshyResume(); } catch (e) {} }, 1500);
function hbSceneMode() {
  var type = hb3dType(state.houseType), floor = hb3dFloor(type, state.apartmentFloor);
  if (hbDesignOn()) { type = 'custom'; floor = 1; }   // the user's own uploaded / AI design replaces the standard house
  var blank = state.saved <= 0 && (!state.deposits || !state.deposits.length);
  if (blank) return { mode: 'site', type: type, floor: floor, p: 0 };
  if (state.houseMode === 'purchased' && (+state.mortgageBalance || 0) <= 0) return { mode: 'complete', type: type, floor: floor, p: 1, eq: 1 };
  if (state.houseMode === 'purchased') {
    return { mode: 'equity', type: type, floor: floor, p: 1, eq: hbL2Own(), paid: hbL2Progress() };   // Level 2: the house builds in full colour as the mortgage is paid
  }
  // build % == deposit % funded, exactly (pct() = saved ÷ deposit target); free accounts see a 4% teaser
  return { mode: 'build', type: type, floor: floor, p: _isPro() ? pct() : 0.04 };
}
function hb3dMaxZoom() { var v = HB3DAPP.viewer; return v ? _HZ_DEFAULT * v.fitDist / v.controls.minDistance : 6; }
function hb3dOverlayEls() {
  var el = document.getElementById('house-scene'), ov = document.getElementById('hb3d-ov');
  if (!ov && el) {
    ov = document.createElement('div'); ov.id = 'hb3d-ov';
    ov.innerHTML = '<div id="hb3d-ownlabel"></div>'
      + '<div id="hb3d-intbar"><div class="ib-hd">INTEREST<span>to pay</span></div><div class="ib-track"><div class="ib-seg ib-slain"></div><div class="ib-seg ib-rem"></div></div><div class="ib-ft"></div></div>'
      + '<div id="hb3d-upglabel"></div><div id="hb3d-plotlabel">YOUR PLOT<span>add a deposit to break ground</span></div>'
      + '<svg id="hb3d-lead" aria-hidden="true"><line class="ld"/><circle class="dot" r="3"/><circle class="ring"/><path class="ticks"/><path class="keys"/></svg><div id="hb3d-bpill"></div>'
      + '<div id="hb3d-rowlabel"></div><div id="hb3d-loading">Building your house…</div><div id="hb3d-cap"></div>';
    var hud = el.querySelector('.hud-bar'); el.insertBefore(ov, el.querySelector('.vp-guide') || hud || null);
  }
  return ov;
}
function hb3dOverlays(sm) {
  var ov = hb3dOverlayEls(); if (!ov) return;
  var $ = function (id) { return document.getElementById(id); };
  $('hb3d-plotlabel').style.display = sm.mode === 'site' ? 'block' : 'none';
  var own = $('hb3d-ownlabel'), ib = $('hb3d-intbar'), up = $('hb3d-upglabel');
  own.style.display = (sm.mode === 'equity' || sm.mode === 'complete') ? 'block' : 'none';
  own.textContent = sm.mode === 'complete' ? 'MORTGAGE FREE' : 'MORTGAGE ' + (Math.floor((sm.eq || 0) * 1000) / 10) + '% PAID';
  ib.style.display = sm.mode === 'equity' ? 'flex' : 'none';
  if (sm.mode === 'equity') {
    try {
      var S2 = hbL2Sims(), tot = Math.max(1, S2.base.totalInterest), rem = Math.min(tot, S2.scn.totalInterest), slain = Math.max(0, tot - rem);
      ib.querySelector('.ib-slain').style.height = (slain / tot * 100).toFixed(1) + '%';
      ib.querySelector('.ib-rem').style.height = (rem / tot * 100).toFixed(1) + '%';
      ib.querySelector('.ib-ft').innerHTML = '<b class="ib-r">' + hbMoney(rem) + '</b><span>left</span>' + (slain > 0.5 ? '<b class="ib-s">−' + hbMoney(slain) + '</b><span>slain</span>' : '');
    } catch (e) {}
  }
  up.style.display = sm.upgrade ? 'block' : 'none';
  if (sm.upgrade) up.innerHTML = '<b>UPGRADE ' + Math.round((sm.ready || 0) * 100) + '% FUNDED</b><span>' + (sm.u.mode === 'sell' ? 'sell &amp; move' : 'keep &amp; let') + ' · target ' + hbMoney(sm.u.price) + '</span>';
  hb3dPlaceOverlays();
}
// labels that follow the model (called after every rendered frame)
// The overlays follow the 3D view every frame. Speed (owner, 31 Oct): a style is only written when its value changes, and sizes are
// measured only when the text or the stage size changes, so a frame never forces the page to lay itself out again (that, every frame,
// is what made taps and scrolls wait on a phone).
function hbSty(el, k, v) { var c = el._sty || (el._sty = {}); if (c[k] !== v) { el.style[k] = v; c[k] = v; } }
function hbTxt(el, t) { if (el._txt !== t) { el.textContent = t; el._txt = t; } }
function hbAttr(el, k, v) { var c = el._att || (el._att = {}); v = String(v); if (c[k] !== v) { el.setAttribute(k, v); c[k] = v; } }
function hbSize(el, key) { if (el._szk !== key) { el._szw = el.offsetWidth; el._szh = el.offsetHeight; el._szk = el._szw ? key : null; } return [el._szw, el._szh]; }   // a size read while hidden (0) is not kept: measured again once shown
function hb3dPlaceOverlays() {
  var v = HB3DAPP.viewer, sm = HB3DAPP.want; if (!v || !v.model || !sm) return;
  var EW = v.el.clientWidth, EH = v.el.clientHeight;   // read before anything is written this frame
  var own = document.getElementById('hb3d-ownlabel');
  if (own && own.style.display !== 'none') {
    var b = v.model.bounds, y = sm.mode === 'complete' ? v.model.height : v.waterline(), pt = v.project(b.min[0], y, b.max[2]);
    hbSty(own, 'left', Math.max(30, Math.min(EW - 150, pt.x - 8)) + 'px');
    hbSty(own, 'top', Math.max(8, Math.min(EH - 30, pt.y - 26)) + 'px');
  }
  var rl = document.getElementById('hb3d-rowlabel'), ri = v.rowInfo(), bri = ri && ri.brand;
  hb3dBrandOverlays(v, sm, bri, rl, EW, EH);
  if (rl && !bri) {
    rl.classList.remove('brand');
    if (ri && sm.mode === 'build' && ri.p > 0 && ri.p < 0.9999) {
      var bb2 = v.model.bounds, q = v.project(bb2.max[0] + 0.35, ri.y, bb2.max[2] + 0.35);
      rl.innerHTML = (v.model.focus ? 'FLOOR ' + (sm.floor || '') + ' · ' : '') + 'ROW ' + ri.row + ' / ' + ri.rows + '<span>' + (ri.p * 100).toFixed(1) + (sm.upgrade ? '% FUNDED' : '% OF DEPOSIT') + '</span>';
      rl._h = null; hbSty(rl, 'display', q.behind ? 'none' : 'block');
      var w = rl.offsetWidth || 120;
      hbSty(rl, 'left', Math.max(6, Math.min(EW - w - 6, q.x + 10)) + 'px');
      hbSty(rl, 'top', Math.max(8, Math.min(EH - 56, q.y - 22)) + 'px');
    } else hbSty(rl, 'display', 'none');
  }
  var cap = document.getElementById('hb3d-cap');
  if (cap) {
    var m = v.model, p = sm.mode === 'build' ? v.p : (sm.mode === 'site' ? 0 : 1), st = bri ? HB3D.brandStats(m, p) : m.stats(p);
    var name = (m.name || '').replace(/^./, function (c) { return c.toUpperCase(); });
    var what = m.focus ? (sm.mode === 'build' ? 'your floor · ' + st.stage + ' · ' : 'your floor · ') : (sm.mode === 'build' ? st.stage + ' · ' : '');
    var bInf0 = bri && v.brandInfo ? v.brandInfo() : null;
    if (bInf0 && (sm.mode === 'equity' || sm.mode === 'complete')) st = { bricksLaid: bInf0.colour, bricksTotal: bInf0.colourTotal, tilesTotal: 0, tilesLaid: 0 };   // Level 2: the bricks in full colour are yours
    var capStale = !!HB3DAPP.key && HB3DAPP.key.split('|')[0] !== (sm.type === 'custom' ? 'custom' : hb3dType(sm.type));   // the viewer still holds the previous house: never name it under the new selection
    var capT = (sm.mode === 'site' || capStale) ? '' : (name + ' · ' + what + st.bricksLaid.toLocaleString('en-GB') + ' / ' + st.bricksTotal.toLocaleString('en-GB') + (sm.mode === 'equity' || sm.mode === 'complete' ? ' bricks and tiles yours' : ' bricks') + (st.tilesTotal && !bri ? ' · ' + st.tilesLaid.toLocaleString('en-GB') + ' tiles' : '')
      + (bri && sm.mode === 'build' ? ' · ' + (window.VI_CURRENCY_SYMBOL || '£') + (HB3D.brandBrickValue(depositTarget(), st.bricksTotal) * (window.VI_CURRENCY_RATE || 1)).toFixed(2) + ' a brick' : ''));
    var bInf = bri && v.brandInfo ? v.brandInfo() : null; if (capT && bInf && (bInf.reduced || bInf.lite)) capT += bInf.reduced ? ' · animations off: reduced motion is on in your device settings' : ' · lighter animation for this device';
    hbTxt(cap, capT);
    hbAttr(v.renderer.domElement, 'aria-label', '3D model: ' + (m.name || 'house') + (sm.mode === 'equity' ? ', mortgage ' + Math.round(sm.eq * 100) + '% paid' : sm.mode === 'build' ? ', ' + Math.round(p * 100) + '% built' : ''));
  }
}
// brand build overlays (house flag): the ROW tag with its leader line to the gold slice, the ring and BRICK #n pill on the
// last brick laid, and the keys glint on the front door at 100% (brand handover 6.4). Hidden when the brand build is off.
function hb3dBrandOverlays(v, sm, bi, rl, EW, EH) {
  var svg = document.getElementById('hb3d-lead'), pill = document.getElementById('hb3d-bpill');
  if (!svg || !pill || !rl) return;
  var L2 = !!bi && (sm.mode === 'equity' || sm.mode === 'complete');   // Level 2 under the brand look (owner, 1 Nov)
  var on = !!bi && ((sm.mode === 'build' && bi.p > 0) || L2);
  if (L2) { var own = document.getElementById('hb3d-ownlabel'); if (own && own.style.display !== 'none') own.style.display = 'none'; }   // the gold tag says it instead
  hbSty(svg, 'display', on ? 'block' : 'none'); if (!on) { hbSty(pill, 'display', 'none'); if (bi) hbSty(rl, 'display', 'none'); return; }
  var W = EW == null ? v.el.clientWidth : EW, Ht = EH == null ? v.el.clientHeight : EH, fs = Math.max(11, Math.min(17, W * 0.026)), lpad = 22, hb = v.el.querySelector('.hud-bar'), rail = 58, $ = function (s) { return svg.querySelector(s); };
  if (hb && v.el._railK !== W + 'x' + Ht) { v.el._railK = W + 'x' + Ht; v.el._rail = 58; if (hb.offsetWidth) { var er = v.el.getBoundingClientRect(), hr = hb.getBoundingClientRect(); if (hr.left > er.left + W / 2) v.el._rail = Math.max(0, er.right - hr.left) + 4; } }
  if (hb) rail = v.el._rail;   // the rail only moves when the stage is resized   // keep clear of the zoom and orbit rail
  // the tag: ROW n / N and x.x% OF DEPOSIT, joined to the slice centre by a leader line
  var pc = v.project(bi.cx, bi.sliceA > 0 ? bi.y : bi.top, bi.cz);
  var l1 = bi.keys ? 'KEYS ARE YOURS' : (v.model.focus ? 'FLOOR ' + (sm.floor || '') + ' · ' : '') + 'ROW ' + bi.row + ' / ' + bi.rows, l2 = (bi.p * 100).toFixed(1) + '% OF DEPOSIT';
  if (L2) { l1 = sm.mode === 'complete' ? 'MORTGAGE FREE' : 'MORTGAGE ' + (Math.floor((sm.paid || 0) * 1000) / 10) + '% PAID'; l2 = sm.mode === 'complete' ? '' : 'YOU OWN ' + (Math.floor((sm.eq || 0) * 1000) / 10) + '%'; }
  if (!rl.classList.contains('brand')) rl.classList.add('brand'); hbSty(rl, 'fontSize', fs + 'px');
  var html = l1 + (l2 ? '<span>' + l2 + '</span>' : ''); if (rl._h !== html) { rl.innerHTML = html; rl._h = html; }
  var rlShow = pc.behind ? 'none' : 'block'; hbSty(rl, 'display', rlShow);
  var rs = hbSize(rl, html + '|' + fs + '|' + rlShow), tw = rs[0] || 150, th = rs[1] || fs * 2.9;   // measured again only when the text changes
  var tx = Math.max(lpad, Math.min(W - tw - 6 - rail, pc.x + fs * 1.6)), ty = Math.max(6, Math.min(Ht - th - 96, pc.y - th - fs * 1.4));
  // the tag keeps clear of the last brick's ring (Pedro, 1 Nov: at 1100 it sat on the ring): flip to the other side of its anchor, else above or below
  var Lq = bi.last && bi.last.shown ? v.project(bi.last.x, bi.last.y, bi.last.z) : null, ls0 = Math.max(0.7, Math.min(1.4, W / 760)), rq = (8 + 4 * (bi.pulse || 0.5)) * ls0 + 7 * ls0 + 3;
  var ringHit = function (x, y) { return !!Lq && !Lq.behind && x < Lq.x + rq && x + tw > Lq.x - rq && y < Lq.y + rq && y + th > Lq.y - rq; };
  if (ringHit(tx, ty)) {
    var alt = [[pc.x - tw - fs * 1.6, ty], [tx, Lq ? Lq.y - rq - th - 2 : ty], [tx, Lq ? Lq.y + rq + 2 : ty], [pc.x - tw - fs * 1.6, Lq ? Lq.y + rq + 2 : ty]];
    for (var ai = 0; ai < alt.length; ai++) { var ax = Math.max(lpad, Math.min(W - tw - 6 - rail, alt[ai][0])), ay = Math.max(6, Math.min(Ht - th - 96, alt[ai][1])); if (!ringHit(ax, ay)) { tx = ax; ty = ay; break; } }
  }
  hbSty(rl, 'left', tx + 'px'); hbSty(rl, 'top', ty + 'px');
  var ld = $('.ld'), dot = $('.dot');
  hbAttr(ld, 'x1', pc.x); hbAttr(ld, 'y1', pc.y); hbAttr(ld, 'x2', tx + tw * 0.2); hbAttr(ld, 'y2', ty + th);
  hbAttr(dot, 'cx', pc.x); hbAttr(dot, 'cy', pc.y);
  hbSty(ld, 'display', pc.behind ? 'none' : ''); hbSty(dot, 'display', pc.behind ? 'none' : '');
  // the last brick laid: a gold ring with four ticks and its number in a pill, once it has landed
  var L = bi.last, ring = $('.ring'), ticks = $('.ticks');
  if (L && L.shown) {
    var q = v.project(L.x, L.y, L.z), ls = Math.max(0.7, Math.min(1.4, W / 760)), rr = (8 + 4 * (bi.pulse || 0.5)) * ls;
    hbAttr(ring, 'cx', q.x); hbAttr(ring, 'cy', q.y); hbAttr(ring, 'r', rr);
    var d = ''; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (k) { d += 'M' + (q.x + k[0] * (rr + 2)) + ' ' + (q.y + k[1] * (rr + 2)) + 'L' + (q.x + k[0] * (rr + 7 * ls)) + ' ' + (q.y + k[1] * (rr + 7 * ls)); });
    hbAttr(ticks, 'd', d);
    hbSty(ring, 'display', q.behind ? 'none' : ''); hbSty(ticks, 'display', q.behind ? 'none' : '');
    var t = 'BRICK #' + L.n.toLocaleString('en-GB'); hbTxt(pill, t);
    var pShow = q.behind ? 'none' : 'block'; hbSty(pill, 'display', pShow);
    var pw = hbSize(pill, t + '|' + pShow)[0] || 90;
    var px = Math.max(lpad, Math.min(W - pw - 8 - rail, q.x + rr + 10 * ls)), py = Math.max(4, Math.min(Ht - 40, q.y - rr - 6 * ls - 18)), ph = 18;
    // keep the pill off the ROW tag (Pedro, 1 Nov: at 390 the tag covered "BRICK #n"): below the ring, else on the ring's left
    var hit = function (x, y) { return x < tx + tw && x + pw > tx && y < ty + th && y + ph > ty; };
    if (hit(px, py)) { py = Math.min(Ht - 40, q.y + rr + 6 * ls); if (hit(px, py)) { px = Math.max(lpad, q.x - rr - 10 * ls - pw); py = Math.max(4, Math.min(Ht - 40, q.y - rr - 6 * ls - 18)); if (hit(px, py)) { px = Math.max(lpad, Math.min(W - pw - 4 - rail, q.x - pw / 2)); py = Math.min(Ht - 40, ty + th + 4); } } }   // last resort: under the tag
    hbSty(pill, 'left', px + 'px'); hbSty(pill, 'top', py + 'px');
  } else { hbSty(ring, 'display', 'none'); hbSty(ticks, 'display', 'none'); hbSty(pill, 'display', 'none'); }
  // keys glint on the front door handle at 100%
  var keys = $('.keys');
  if (bi.keys && bi.door) {
    var k2 = v.project(bi.door[0], bi.door[1], bi.door[2]), pul = 0.6 + 0.4 * Math.sin(performance.now() / 260), Lk = 9 * (0.7 + pul * 0.5);
    hbAttr(keys, 'd', 'M' + (k2.x - Lk) + ' ' + k2.y + 'L' + (k2.x + Lk) + ' ' + k2.y + 'M' + k2.x + ' ' + (k2.y - Lk) + 'L' + k2.x + ' ' + (k2.y + Lk));
    hbSty(keys, 'display', k2.behind ? 'none' : '');
  } else hbSty(keys, 'display', 'none');
}
function hb3dRecreate() {
  var v = HB3DAPP.viewer; if (!v) return;
  try { v.dispose(); } catch (e) {}
  HB3DAPP.viewer = HB3D.viewer = null; HB3DAPP.key = null; HB3DAPP.lastP = null; HB3DAPP.lastMode = null;
  try { hb3dRedraw(); } catch (e) { console.warn('house viewer rebuild', e); }
  var ld = document.getElementById('hb3d-loading'); if (ld && HB3DAPP.viewer && !HB3DAPP.viewer.lost) { ld.style.display = 'none'; ld.textContent = 'Building your house…'; }
}
// v0.7 cold start helpers: is the stage on screen, and wake the 3D the moment it scrolls in (the still picture shows meanwhile)
function hb3dInView(el) { var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < (window.innerHeight || document.documentElement.clientHeight); }
function hb3dStartWhenSeen(el) {
  if (HB3DAPP.seenIO) return;
  if (typeof IntersectionObserver === 'undefined') { setTimeout(function () { try { redraw(); } catch (e) {} }, 400); return; }
  HB3DAPP.seenIO = new IntersectionObserver(function (es) { if (!es.some(function (e) { return e.isIntersecting; })) return; HB3DAPP.seenIO.disconnect(); HB3DAPP.seenIO = null; try { redraw(); } catch (e) {} }, { threshold: 0.05 });
  HB3DAPP.seenIO.observe(el);
}
// bricks this device last saw laid on a house (per house key), so the opening lays only what is new: a display note, not the user's data
function hbSeenBricks(key, set) {
  var all = {}; try { all = JSON.parse(localStorage.getItem('vi_hb_seen') || '{}') || {}; } catch (e) { all = {}; }
  if (set == null) return all[key] == null ? null : +all[key];
  all[key] = set; try { localStorage.setItem('vi_hb_seen', JSON.stringify(all)); } catch (e) {}
  return set;
}
// v0.95: set by the onboarding when it records the deposit pot; the House Builder's first open then lays every brick from the ground
// over about five seconds (a display note like vi_hb_seen, never the user's data; used once)
function hbEntryPending(set) {
  try { if (set === false) { localStorage.removeItem('vi_hb_entry'); return false; } return localStorage.getItem('vi_hb_entry') === '1'; } catch (e) { return false; }
}
function hb3dRedraw() {
  var el = document.getElementById('house-scene'); if (!el) return false;
  var sm = hbSceneMode(); HB3DAPP.want = sm;
  if (!hb3dHas(sm.type)) { if (HB3DAPP.viewer) HB3DAPP.viewer.stop(); return false; }
  var drawn = !!(HB3DAPP.viewer && HB3DAPP.viewer._bDraws);   // v0.7 cold start: the stage is '3d' only once a 3D frame exists; until then the still picture of the same house
  if (drawn) el.setAttribute('data-engine', '3d');
  var lock = document.getElementById('house-pro-lock'); if (lock) lock.style.display = 'none';
  if (!(el.clientWidth > 0 && el.clientHeight > 0)) { hb3dIdleBuild(sm.type, sm.floor); return true; }   // tab hidden: build later
  if (!hb3dModelIfReady(sm.type, sm.floor) && sm.type !== 'custom') {   // first build of this house: show a note, let the page paint, then build
    var ovl = hb3dOverlayEls(), ld = ovl && ovl.querySelector('#hb3d-loading'); if (ld) { ld.textContent = 'Building your house…'; ld.style.display = 'block'; }
    if (!HB3DAPP.deferred) HB3DAPP.deferred = setTimeout(function () { HB3DAPP.deferred = 0; try { hb3dModel(sm.type, sm.floor); } catch (e) {} redraw(); }, 40);
    return true;
  }
  if (!drawn) hbStill();   // the house as a still picture, at once; the 3D takes over when its first frame is ready
  var ldn = document.getElementById('hb3d-loading'); if (ldn) ldn.style.display = 'none';
  var useGL = hbGLEngine() && sm.type !== 'custom';   // the brand-book renderer draws the standard houses; an uploaded design needs the three.js viewer
  if (HB3DAPP.viewer && (HB3DAPP.viewer.engine === 'house_gl') !== useGL) { try { HB3DAPP.viewer.dispose(); } catch (e) {} HB3DAPP.viewer = HB3D.viewer = null; HB3DAPP.key = null; HB3DAPP.lastP = null; }
  if (!useGL && !HB3D.Viewer) {   // three.js is fetched on first need: the still picture stands in, the 3D draws when the engine lands
    if (!HB3DAPP.waitingThree) { HB3DAPP.waitingThree = true;
      viThree(function () { HB3DAPP.waitingThree = false; try { redraw(); } catch (e) { console.warn('house 3D', e); } },
              function () { HB3DAPP.waitingThree = false; try { redraw(); } catch (e) {} }); }
    return true;
  }
  if (!HB3DAPP.viewer && !hb3dInView(el)) { hb3dStartWhenSeen(el); return true; }   // start WebGL only once the stage scrolls into view
  try {
    var v = HB3DAPP.viewer;
    if (!v) {
      var vopts = { mobile: !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches) };   // touch devices: no shadows, lighter pixel budget
      v = HB3DAPP.viewer = HB3D.viewer = useGL ? new HB3D.HouseGL(el, vopts) : new HB3D.Viewer(el, vopts);
      v.onView = function (vw) { _houseZoom = _HZ_DEFAULT * vw.zoom(); };
      v.onRender = function () { if (el.getAttribute('data-engine') !== '3d') el.setAttribute('data-engine', '3d'); hb3dPlaceOverlays(); };   // first frame: the still picture fades out
      /* a lost WebGL context (a phone's GPU reset) used to leave a white box for good: say so, wait for the browser to hand it back, else rebuild */
      v.onLost = function () { var ld = document.getElementById('hb3d-loading'); if (ld) { ld.textContent = 'Reloading the house…'; ld.style.display = 'block'; }
        setTimeout(function () { if (HB3DAPP.viewer === v && v.lost) hb3dRecreate(); }, 2500); };
      v.onRestored = function () { var ld = document.getElementById('hb3d-loading'); if (ld) ld.style.display = 'none'; };
      _orbitMode = true;
      var ob = document.getElementById('hud-orbit-toggle'), oi = document.getElementById('hud-orbit-icon');
      if (ob) ob.classList.add('orbit-active'); if (oi) oi.textContent = '⟳';
      var key = document.querySelector('#houseSceneCard .vp-key'); if (key) key.textContent = 'DRAG · orbit   ·   RIGHT-DRAG / 2 FINGERS · pan   ·   SCROLL / PINCH · zoom';
    }
    v.start();
    var brandOn = true;   // the brand build is the only house builder (Levels 1 and 2)
    v.setBrand(true);
    var _hs = document.getElementById('house-scene'); if (_hs) _hs.classList.toggle('hb-brand', brandOn);   // scanlines over the stage (handover 6.6)
    var key2 = hb3dKey(sm.type, sm.floor), model = hb3dModel(sm.type, sm.floor), changed = key2 !== HB3DAPP.key;
    var _lt = window.VIPERF ? performance.now() : 0;
    if (changed) {
      var sameType = !!HB3DAPP.key && HB3DAPP.key.split('|')[0] === sm.type;   // floor change: keep the camera so the highlight visibly moves
      v.show(model, sameType); HB3DAPP.key = key2; HB3DAPP.lastP = null;
      if (!sameType) v.setZoom(_houseZoom / _HZ_DEFAULT);
    }
    if (Math.abs(v.zoom() * _HZ_DEFAULT - _houseZoom) > 1e-6) v.setZoom(_houseZoom / _HZ_DEFAULT);
    var first = sm.mode === 'build' && HB3DAPP.lastP == null;
    if (sm.mode === 'build') {   // opening (v0.7, owner 1 Nov): the finished house up to the newest course at once, only the bricks since the last visit lay (one course at most); a deposit eases up; un-laying is instant
      var seen = hbBrandModel(model) ? function () { hbSeenBricks(key2, HB3D.brandStats(model, sm.p).bricksLaid); } : null;
      if (first) {
        var entry = sm.p > 0 && hbBrandModel(model) && hbEntryPending();   // v0.95: the onboarding pot's first open lays every brick from the ground, slowly
        var p0 = entry ? 0 : (hbBrandModel(model) && HB3D.brandOpenFrom ? HB3D.brandOpenFrom(model, sm.p, hbSeenBricks(key2)) : sm.p); v.setState({ mode: 'build', eq: 0, p: p0 });
        if (entry) hbEntryPending(false);
        if (v.engine === 'house_gl') v.openAt(p0, sm.p, seen, entry ? { slowS: 5 } : null);   // the "bricks seen" note is written once the top course has actually laid, so a user who scrolls away before it lays sees it lay next time (David, 2 Nov)
        else { v.openAt(p0, sm.p); if (seen) seen(); }
      } else { v.setState({ mode: 'build', eq: 0 }); if (sm.p < v.p - 1e-9) v.setState({ p: sm.p }); else v.animateTo(sm.p, 1); if (seen) seen(); }
    } else v.setState({ mode: sm.mode, p: sm.p, eq: sm.eq || 0 });   // site, or Level 2 (the paid line eases up in the frame loop)
    HB3DAPP.lastP = sm.p; HB3DAPP.lastMode = sm.mode;
    if (_lt) VIPERF.phase('lay', performance.now() - _lt);
    hb3dOverlays(sm);
    // wake the frame loop (it sleeps when still) and place the labels again once the new state has been drawn, so the gold
    // ROW tag, brick pill and caption never keep the previous house's figures (owner, 31 Oct: house builder)
    if (typeof v.wake === 'function') v.wake();
    clearTimeout(HB3DAPP.olT1); clearTimeout(HB3DAPP.olT2);
    HB3DAPP.olT1 = setTimeout(function () { try { hb3dPlaceOverlays(); } catch (e) {} }, 300);
    HB3DAPP.olT2 = setTimeout(function () { try { hb3dPlaceOverlays(); } catch (e) {} }, 1200);
    if (!HB3DAPP.warmed && v.engine === 'house_gl') { clearTimeout(HB3DAPP.warmT); HB3DAPP.warmT = setTimeout(hb3dWarmTypes, 1500); }   // the other types compile in idle time after the first house settles
    return true;
  } catch (e) {
    HB3D._failed = true;
    try { console.info('[Vault-It] 3D house unavailable, using 2D view:', e && e.message); } catch (_) {}
    el.removeAttribute('data-engine');
    try { if (HB3DAPP.viewer) HB3DAPP.viewer.dispose(); } catch (_) {}
    HB3DAPP.viewer = null; HB3DAPP.key = '';
    var ov = document.getElementById('hb3d-ov'); if (ov) ov.remove();
    return false;
  }
}
// brick maths for the HUD and the Statistics card (real UK brick counts from the model)
function hb3dState() {   // test / debug hook
  var v = HB3DAPP.viewer, sm = HB3DAPP.want || {};
  return { engine: hb3dActive() ? '3d' : 'svg', mode: sm.mode, upgrade: !!sm.upgrade, type: sm.type, floor: sm.floor, p: v ? v.p : null, eq: v ? v.eq : null,
    clipY: v ? v.waterline() : null, height: v && v.model ? v.model.height : null, zoom: v ? v.zoom() * _HZ_DEFAULT : null, settled: v ? v.settled() : false,
    bricks: v && v.model ? v.model.counts.bricks : null, instances: v && v.model ? v.model.instances : null,
    brand: v && v.brandInfo ? v.brandInfo() : null };
}
function hbBrickInfo(type, floor) {
  type = type || (hbDesignOn() ? 'custom' : state.houseType); floor = floor || state.apartmentFloor;
  var m = hb3dModelIfReady(type, floor);
  if (!m) { hb3dIdleBuild(type, floor); return null; }
  // bricks are laid during the brickwork stage only, so a brick is worth the slice of the deposit that funds that stretch
  var total = m.counts.bricks || 1, dt = depositTarget();
  var span = m.counts.bricks ? Math.max(0.02, m.brickT(total - 1) - m.brickT(0)) : 1;
  if (hbBrandModel(m)) return { total: total, perBrick: HB3D.brandBrickValue(dt, total), model: m, brand: true };   // brand: 77% of the deposit buys the brickwork
  return { total: total, perBrick: dt * span / total, model: m };
}
function hbWriteStats() {
  var b = document.getElementById('stBricks'), t = document.getElementById('stTiles');
  if (!b && !t) return;
  var sm = hbSceneMode(), m = hb3dModelIfReady(sm.type, sm.floor);
  if (!m) { hb3dIdleBuild(sm.type, sm.floor); return; }
  var st = (hbBrandModel(m) && (sm.mode === 'build' || sm.mode === 'site') && !sm.upgrade) ? HB3D.brandStats(m, sm.mode === 'site' ? 0 : sm.p) : m.stats(sm.mode === 'site' ? 0 : (sm.mode === 'build' ? sm.p : 1));
  var bricks = sm.mode === 'equity' ? Math.round(st.bricksTotal * (sm.eq || 0)) : st.bricksLaid;
  var tiles = sm.mode === 'equity' ? Math.round(st.tilesTotal * (sm.eq || 0)) : st.tilesLaid;
  if (b) b.textContent = bricks.toLocaleString('en-GB');
  if (t) t.textContent = tiles.toLocaleString('en-GB');
}

