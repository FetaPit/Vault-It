// ── METALS VIEWPORT STATE & CONTROLS ──────────────────────────────
var _mPanX=0, _mPanY=0, _mAngle=0, _mIsExpanded=false, _mZoom=1;
var _mOrbitMode=false;

function _updateMetalsHUD(){
  var zEl=document.getElementById('hud-metals-zoom-val');
  var aEl=document.getElementById('hud-metals-angle-val');
  if(zEl)zEl.textContent='ZOOM '+(_mZoom||1).toFixed(1)+'×';
  if(aEl)aEl.textContent='YAW '+Math.round((_mAngle*180/Math.PI)%360)+'°';
}

function toggleMetalsOrbitMode(){
  _mOrbitMode=!_mOrbitMode;if(window._v3MetalsOn&&V3.metals)V3.metals.spin(_mOrbitMode);
  var btn=document.getElementById('hud-metals-orbit-toggle');
  var ico=document.getElementById('hud-metals-orbit-icon');
  if(btn)btn.classList.toggle('orbit-active',_mOrbitMode);
  if(ico)ico.textContent=_mOrbitMode?'⟳':'✥';
}

function metalsZoomIn(){if(window._v3MetalsOn&&V3.metals){V3.metals.zoom(0.85);return;}_mZoom=Math.min(3.5,(_mZoom||1)*1.15);_updateMetalsHUD();renderMetalsISO();}
function metalsZoomOut(){if(window._v3MetalsOn&&V3.metals){V3.metals.zoom(1.18);return;}_mZoom=Math.max(0.3,(_mZoom||1)/1.15);_updateMetalsHUD();renderMetalsISO();}

function toggleMetalsExpand(){
  _mIsExpanded=!_mIsExpanded;
  var sc=document.getElementById('metalsSceneCard');
  sc.classList.toggle('expanded',_mIsExpanded);
  var btn=document.getElementById('btnMetalsExpand');
  if(btn)btn.textContent=_mIsExpanded?'✕':'⛶';
  document.body.style.overflow=_mIsExpanded?'hidden':'';
  if(_mIsExpanded&&_isExpanded)toggleExpand();
  setTimeout(renderMetalsISO,30);
}
function resetMetalsView(){if(window._v3MetalsOn&&V3.metals){V3.metals.reset();return;}_mPanX=0;_mPanY=0;_mAngle=0;_mZoom=1;_updateMetalsHUD();renderMetalsISO();}

// ── METALS GESTURE SYSTEM (Pointer Events API) ────────────────────────────────
(function initMetalsGestures() {
  function attach() {
    var el = document.getElementById('metals-scene');
    if (!el) return;

    var ptrs = new Map();
    var _mPinchStartDist = 0, _mPinchStartZoom = 1, _mOrb2PrevX = 0;

    function pDist(a, b) {
      var dx = a.x - b.x, dy = a.y - b.y;
      return Math.sqrt(dx * dx + dy * dy);
    }

    el.addEventListener('pointerdown', function(e) {
      if (window._v3MetalsOn) return;   // the 3D view has its own orbit controls
      if (e.target !== el && e.target.closest && (e.target.closest('.hud-bar') || e.target.closest('.vp-guide'))) return;
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      el.style.cursor = 'grabbing';

      if (ptrs.size === 2) {
        var pts = Array.from(ptrs.values());
        _mPinchStartDist = pDist(pts[0], pts[1]);
        _mPinchStartZoom = _mZoom || 1;
        _mOrb2PrevX = (pts[0].x + pts[1].x) / 2;
      }
    });

    el.addEventListener('pointermove', function(e) {
      if (window._v3MetalsOn) return;
      if (!ptrs.has(e.pointerId)) return;
      var prev = ptrs.get(e.pointerId);
      var cur = { x: e.clientX, y: e.clientY };
      ptrs.set(e.pointerId, cur);

      if (ptrs.size === 1) {
        var dx = cur.x - prev.x, dy = cur.y - prev.y;
        if (_mOrbitMode) { _mAngle -= dx * 0.007; _mAngle = _mAngle % (2 * Math.PI); _mPanY += dy * 0.4; }
        else { _mPanX += dx; _mPanY += dy; }
        _updateMetalsHUD(); renderMetalsISO();
      } else if (ptrs.size === 2) {
        var pts = Array.from(ptrs.values());
        var dist = pDist(pts[0], pts[1]);
        if (_mPinchStartDist > 0) _mZoom = Math.max(0.3, Math.min(3.5, _mPinchStartZoom * (dist / _mPinchStartDist)));
        var midX = (pts[0].x + pts[1].x) / 2;
        _mAngle -= (midX - _mOrb2PrevX) * 0.007;
        _mAngle = _mAngle % (2 * Math.PI);
        _mOrb2PrevX = midX;
        _updateMetalsHUD(); renderMetalsISO();
      }
    });

    function onUp(e) {
      ptrs.delete(e.pointerId);
      try { el.releasePointerCapture(e.pointerId); } catch(_) {}
      if (ptrs.size === 0) el.style.cursor = 'grab';
      if (ptrs.size === 1) {
        _mPinchStartZoom = _mZoom;
        _mOrb2PrevX = Array.from(ptrs.values())[0].x;
      }
    }
    el.addEventListener('pointerup',     onUp);
    el.addEventListener('pointercancel', onUp);

    el.addEventListener('wheel', function(e) {
      if (window._v3MetalsOn) return;
      e.preventDefault();
      _mZoom = Math.max(0.3, Math.min(3.5, (_mZoom || 1) - e.deltaY * 0.001));
      _updateMetalsHUD(); renderMetalsISO();
    }, { passive: false });

    window.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && _mIsExpanded) toggleMetalsExpand();
    });

    _updateMetalsHUD();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }
}());

