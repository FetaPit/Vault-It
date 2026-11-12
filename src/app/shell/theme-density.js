// ── THEME: Night / Daylight ──────────────────────────────
function viTheme(){return document.documentElement.getAttribute('data-theme')==='light'?'light':'dark';}
function viSyncTheme(){
  var l=viTheme()==='light',b=document.getElementById('vi-theme-btn');
  if(b){b.setAttribute('aria-checked',l?'false':'true');b.title=l?'Switch to Night':'Switch to Daylight';}   // R27: one switch, fixed label "Night mode", checked = Night
  var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',(l&&document.documentElement.getAttribute('data-hdr')==='paper')?'#D3CCB4':'#080808');
}
function viToggleTheme(){
  var next=viTheme()==='light'?'dark':'light';
  document.documentElement.setAttribute('data-theme',next);
  try{localStorage.setItem('vi-theme',next);}catch(e){}
  viSyncTheme();
  try{document.dispatchEvent(new CustomEvent('vi-theme',{detail:next}));}catch(e){}
  try{drawChart();}catch(e){}
  try{var _dt=document.getElementById('tab-debt');if(_dt&&_dt.style.display!=='none'){drawDebtHistogram();drawDebtDonut();}}catch(e){}
  // SVG drawings bake their colours in: redraw them for the new theme
  [function(){renderCashflow();},function(){renderFIREroadmap();},function(){if(typeof redraw==='function')redraw();}].forEach(function(f){try{f();}catch(e){}});
  if(typeof toast==='function')toast(next==='light'?'Daylight mode':'Night mode');
}
document.addEventListener('DOMContentLoaded',viSyncTheme);
// v0.9.2 Settings: Night, Daylight or follow my device. Reuses viToggleTheme (storage, redraws, event); the header switch is untouched.
function viThemeChoice(){var v=null;try{v=localStorage.getItem('vi-theme');}catch(e){}return v==='light'||v==='dark'?v:'auto';}
function viThemePaint(){var r=document.getElementById('set-theme');if(!r)return;var c=viThemeChoice();[].forEach.call(r.children,function(b){b.classList.toggle('active',b.getAttribute('data-val')===c);b.setAttribute('aria-pressed',b.getAttribute('data-val')===c?'true':'false');});}
function viSetTheme(choice){
  var want=choice;
  if(choice==='auto'){want=(window.matchMedia&&matchMedia('(prefers-color-scheme: light)').matches)?'light':'dark';}
  if(viTheme()!==want)viToggleTheme();
  if(choice==='auto'){try{localStorage.removeItem('vi-theme');}catch(e){}}   // no saved choice: the device decides, as on a first visit
  viThemePaint();
}
document.addEventListener('vi-theme',viThemePaint);
try{if(window.matchMedia){var _vmq=matchMedia('(prefers-color-scheme: light)');var _vmf=function(){if(viThemeChoice()==='auto'){var w=_vmq.matches?'light':'dark';if(viTheme()!==w)viToggleTheme();try{localStorage.removeItem('vi-theme');}catch(e){}viThemePaint();}};if(_vmq.addEventListener)_vmq.addEventListener('change',_vmf);}}catch(e){}
// R27: nothing animates on first paint; the switch starts to slide only once the page has loaded and the state is set
window.addEventListener('load',function(){requestAnimationFrame(function(){requestAnimationFrame(function(){var b=document.getElementById('vi-theme-btn');if(b)b.classList.add('vi-th-anim');});});});

// ── DENSITY MODE ──────────────────────────────────────────
function setDensity(mode) {
  document.body.classList.remove('vi-compact','vi-wide');
  if (mode === 'compact') document.body.classList.add('vi-compact');
  if (mode === 'wide')    document.body.classList.add('vi-wide');
  try { localStorage.setItem('vi_density', mode || 'default'); } catch(e) {}
  document.querySelectorAll('.vi-d-opt').forEach(function(b) {
    b.classList.toggle('active', b.getAttribute('data-d') === (mode || 'default'));
  });
  // Redraw canvas charts — size may have changed
  setTimeout(function() {
    if (typeof drawChart === 'function') drawChart();
    var nc = document.getElementById('nwh-chart');
    if (nc && typeof nwhDrawChart === 'function') {
      var d = nwhLoad(); if (d && d.points) nwhDrawChart(d.points);
    }
  }, 120);
}
function loadDensity() {   // owner, 31 Oct: no Compact / Default / Wide choice; the width decides (a saved choice is kept but not used)
  var compact = (window.innerWidth || 1200) < 1024;
  document.body.classList.remove('vi-wide'); document.body.classList.toggle('vi-compact', compact);
  viNavFit();
}
// one-row desktop header when everything fits: try one row, then one row without the "NET WORTH" word and the Daylight label,
// else keep the two rows (labels are never cut off)
function viHdrH() {   // one variable for the header's real height: the left sidebar and the pinned Assets sub-menu sit under it (E2, E24)
  var n = document.getElementById('topnav'); if (!n) return;
  var h = Math.round(n.getBoundingClientRect().height);
  if (h > 0 && document.documentElement.style.getPropertyValue('--vi-hdr-h') !== h + 'px') document.documentElement.style.setProperty('--vi-hdr-h', h + 'px');
}
function viNavFit() { try { viNavFit0(); } finally { viHdrH(); } }
function viNavFit0() {
  var b = document.body, t = document.getElementById('vi-tabs'); if (!b || !t) return;
  b.classList.remove('vi-nav1', 'vi-nav1t');
  if ((window.innerWidth || 0) < 1024) return;
  var fits = function () { return t.scrollWidth <= t.clientWidth + 1; };
  b.classList.add('vi-nav1'); if (fits()) return;
  b.classList.add('vi-nav1t'); if (fits()) return;
  b.classList.remove('vi-nav1', 'vi-nav1t');
}
(function () { var lastW = 0, tm = 0;
  window.addEventListener('resize', function () { var w = window.innerWidth; if (w === lastW) return; lastW = w; clearTimeout(tm); tm = setTimeout(function () { try { loadDensity(); } catch (e) {} }, 150); });
  window.addEventListener('load', function () { try { viNavFit(); } catch (e) {} });
  try { document.fonts && document.fonts.ready.then(function () { try { viNavFit(); } catch (e) {} }); } catch (e) {}
  // fonts arriving, tabs unlocking or labels changing alter the tabs' widths after start-up: check again whenever a tab button
  // changes size (each fit starts from the same state and lands on the same answer, so the watcher settles after one extra check)
  var fitT = 0, refit = function () { clearTimeout(fitT); fitT = setTimeout(function () { try { viNavFit(); } catch (e) {} }, 80); };
  var watch = function () { var t = document.getElementById('vi-tabs'); if (!t || typeof ResizeObserver === 'undefined') return;
    try { new ResizeObserver(viHdrH).observe(document.getElementById('topnav')); } catch (e) {}
    var ro = new ResizeObserver(refit); [].forEach.call(t.querySelectorAll('.tab-btn'), function (x) { ro.observe(x); }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
})();

function nwhRenderMini(){
  var wrap=document.getElementById('nwh-mini-wrap'); if(!wrap) return;
  var data=nwhLoad();
  if(!data||!data.setupDone||!data.points||data.points.length<2){
    wrap.innerHTML='<div style="font-size:max(.5rem,var(--vi-fs-1));color:var(--t3);line-height:36px">Set up your history to see your journey here</div>'; return;
  }
  wrap.innerHTML='<canvas id="nwh-mini" height="36" style="width:100%;height:36px;display:block"></canvas>';
  setTimeout(function(){
    var c=document.getElementById('nwh-mini'); if(!c) return;
    var ctx=c.getContext('2d'); var W=c.offsetWidth||300; var dpr=window.devicePixelRatio||1;
    c.width=W*dpr; c.height=36*dpr; ctx.scale(dpr,dpr);
    var pts=data.points;
    var vals=pts.map(function(p){return p.netWorth;});
    var mn=Math.min.apply(null,vals); var mx=Math.max.apply(null,vals); var rng=mx-mn||1;
    var tx=function(i){return (i/(pts.length-1))*W;};
    var ty=function(v){return 32-((v-mn)/rng)*28;};
    ctx.beginPath(); ctx.moveTo(tx(0),ty(pts[0].netWorth));
    pts.forEach(function(p,i){if(i>0)ctx.lineTo(tx(i),ty(p.netWorth));});
    ctx.strokeStyle='rgba(68,192,185,.55)'; ctx.lineWidth=1.5; ctx.stroke();
  },40);
}

</script>

