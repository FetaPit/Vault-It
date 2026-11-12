// ── YOUR OWN DESIGN: upload a GLB/GLTF, or generate one with Meshy AI ─────────
// Both become the House Builder's house (see hbDesignAdopt) — hologram while saving the deposit, colour once owned.
function loadCustomModel(input){if(HB_DESIGN_LOCKED){toast('Your own design: coming later as part of Pro');return;}
  var file = input && input.files && input.files[0]; if (input) input.value = '';
  if (viGateDesign('design')) return;
  if (!file) return;
  if (file.size > 60 * 1024 * 1024) { showToast('That file is over 60 MB. Export a lighter GLB'); return; }
  var st = document.getElementById('hb-upload-msg'); if (st) st.textContent = 'Reading ' + file.name + '…';
  file.arrayBuffer().then(function (buf) {
    return hbDesignAdopt(buf, { source: 'upload', name: file.name.replace(/\.(glb|gltf)$/i, ''), file: file.name });
  }).then(function () {
    if (st) st.textContent = '';
    showToast('Your design is now your House Builder house');
  }).catch(function (e) {
    if (st) st.textContent = (e && e.message) || 'Could not read that file';
    showToast((e && e.message) || 'Could not read that 3D file');
  });
}
// Meshy calls go through our relay (Meshy's API does not accept browser requests)
async function _hbMeshy(body, binary) {
  var ctl = new AbortController(), t = setTimeout(function () { ctl.abort(); }, binary ? 120000 : 30000);
  try {
    var res = await fetch(_SUPA_URL + '/functions/v1/house-3d', { method: 'POST', signal: ctl.signal,
      headers: { 'content-type': 'application/json', apikey: _SUPA_KEY, authorization: 'Bearer ' + (_localAccessToken() || _SUPA_KEY) },
      body: JSON.stringify(body) });
    if (binary && res.ok) return await res.arrayBuffer();
    var j = null; try { j = await res.json(); } catch (e) {}
    if (!res.ok) throw new Error((j && j.error) || ('The AI service returned ' + res.status));
    return j;
  } catch (e) {
    if (e && e.name === 'AbortError') throw new Error('The AI service took too long to answer. Try again');
    throw e;
  } finally { clearTimeout(t); }
}
async function _hbMeshyWait(key, id, label, statusEl) {
  for (var i = 0; i < 150; i++) {   // up to ~12 minutes per stage
    var d = await _hbMeshy({ action: 'status', key: key, id: id });
    if (statusEl) statusEl.textContent = label + ' ' + Math.round(d.progress || 0) + '%';
    if (d.status === 'SUCCEEDED') return d;
    if (d.status === 'FAILED' || d.status === 'CANCELED' || d.status === 'EXPIRED') throw new Error(d.error || ('Meshy ' + d.status.toLowerCase()));
    _hbMeshyPending({ id: id, stage: label });
    await new Promise(function (r) { setTimeout(r, 5000); });
  }
  throw new Error('Meshy is still working. Reopen House Builder later and it will carry on');
}
function _hbMeshyPending(p) { try { if (p) { var o = JSON.parse(localStorage.getItem('vi_hb_meshy') || '{}'); localStorage.setItem('vi_hb_meshy', JSON.stringify(Object.assign(o, p, { t: Date.now() }))); } else localStorage.removeItem('vi_hb_meshy'); } catch (e) {} }
var _hbMeshyBusy = false;
async function generateMeshyModel(resume){if(HB_DESIGN_LOCKED){toast('Your own design: coming later as part of Pro');return;}
  if (viGateDesign('aimodel')) return;
  if (_hbMeshyBusy) { showToast('Already generating, hang on'); return; }
  var key = (localStorage.getItem('meshy_api_key') || '').trim();
  if (!key) { showToast('Add your Meshy API key in ⚙ Settings'); return; }
  var statusEl = document.getElementById('meshy-status'), pend = resume || null;
  var prompt = pend ? pend.prompt : ((document.getElementById('meshy-prompt') || {}).value || '').trim();
  if (!prompt) { showToast('Describe the house first'); return; }
  _hbMeshyBusy = true;
  var btn = document.getElementById('meshy-go'); if (btn) btn.disabled = true;
  try {
    var full = 'A ' + prompt.replace(/^an? /i, '') + '. Single complete house exterior on flat ground, architectural model, UK residential';
    var previewId = pend && pend.preview, refineId = pend && pend.refine, glb = null;
    if (!previewId) {
      if (statusEl) statusEl.textContent = 'Sending your description to Meshy AI…';
      previewId = (await _hbMeshy({ action: 'create', key: key, prompt: full })).id;
      _hbMeshyPending({ prompt: prompt, preview: previewId, refine: null });
    }
    var pv = await _hbMeshyWait(key, previewId, 'Shaping your house…', statusEl);
    glb = pv.glb;
    try {   // texture pass (colour for the mortgage stage); the untextured shape is used if it fails
      if (!refineId) { refineId = (await _hbMeshy({ action: 'refine', key: key, preview_id: previewId })).id; _hbMeshyPending({ refine: refineId }); }
      var rf = await _hbMeshyWait(key, refineId, 'Painting the materials…', statusEl);
      if (rf.glb) glb = rf.glb;
    } catch (e) { console.info('[Vault-It] Meshy texturing skipped:', e && e.message); }
    if (!glb) throw new Error('Meshy finished without a model file');
    if (statusEl) statusEl.textContent = 'Downloading your model…';
    var buf = await _hbMeshy({ action: 'download', url: glb }, true);
    await hbDesignAdopt(buf, { source: 'ai', name: prompt.slice(0, 48), prompt: prompt, realSize: true });
    _hbMeshyPending(null);
    if (statusEl) statusEl.textContent = '✓ Your AI design is now your House Builder house';
    showToast('Your AI design is now your House Builder house');
  } catch (e) {
    if (statusEl) statusEl.textContent = 'Error: ' + ((e && e.message) || e);
    if (e && /key|credits|rejected/i.test(e.message || '')) _hbMeshyPending(null);
  } finally {
    _hbMeshyBusy = false; if (btn) btn.disabled = false;
  }
}
// a generation left running when the app was closed carries on (within a day)
function hbMeshyResume() {
  try {
    var p = JSON.parse(localStorage.getItem('vi_hb_meshy') || 'null');
    if (!p || !p.preview) return;
    var own = document.getElementById('hb-own-design'); if (own) own.open = true;
    if (Date.now() - (p.t || 0) > 86400000) { _hbMeshyPending(null); return; }
    generateMeshyModel(p);
  } catch (e) {}
}

