// ═══════════════════════════════════════════════════════════════
// HOUSE ISO VIEWPORT — full gesture control
//   Mouse:   drag = orbit (when orbit mode on) / pan (off)
//   Touch:   1-finger = pan, 2-finger = orbit, pinch = zoom
//   Buttons: +/- zoom, orbit toggle (mouse-only), reset
// ═══════════════════════════════════════════════════════════════

var _orbitMode = false; // toggled by HUD button

function _houseSetZoom(z, ax, ay) {
  if (hb3dActive() && HB3DAPP.viewer) {
    var z3 = Math.max(0.5, Math.min(hb3dMaxZoom(), z));
    HB3DAPP.viewer.setZoom(z3 / _HZ_DEFAULT); _houseZoom = z3; _updateHUD(); return;
  }
  _houseZoom = Math.max(0.5, Math.min(6, z)); _updateHUD();   // the still picture does not zoom
  redraw();
}

function houseZoomIn()  { _houseSetZoom(_houseZoom * 1.2); }
function houseZoomOut() { _houseSetZoom(_houseZoom / 1.2); }

function toggleOrbitMode() {
  _orbitMode = !_orbitMode;
  if (hb3dActive() && HB3DAPP.viewer) HB3DAPP.viewer.setPanMode(!_orbitMode);
  var btn = document.getElementById('hud-orbit-toggle');
  var ico = document.getElementById('hud-orbit-icon');
  if (btn) btn.classList.toggle('orbit-active', _orbitMode);
  if (ico) ico.textContent = _orbitMode ? '⟳' : '✥';
  _updateHUD();
}

function toggleVpGuide(id) {
  var el = document.getElementById('vp-guide-' + id);
  if (el) el.classList.toggle('open');
}

function _updateHUD() {
  var zEl = document.getElementById('hud-zoom-val');
  var aEl = document.getElementById('hud-angle-val');
  var mEl = document.getElementById('hud-mode-val');
  if (zEl) zEl.textContent = 'ZOOM ' + _houseZoom.toFixed(1) + '×';
  if (aEl) aEl.textContent = 'YAW ' + Math.round((_viewAngle * 180 / Math.PI) % 360) + '°';
  if (mEl) mEl.textContent = _orbitMode ? 'ORBIT MODE' : 'PAN MODE';
}

// The 3D view handles its own gestures (OrbitControls on its canvas); the still picture is still. Escape closes the expanded stage.
window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && _isExpanded) toggleExpand(); });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { _updateHUD(); }); else _updateHUD();

