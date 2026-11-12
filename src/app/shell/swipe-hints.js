// ── swipe hints: a soft arrow on the edge of any row/diagram that continues off-screen ──

// E1 (v0.9.1, R1 round 2): the header mark is the brand book's dial icon (the V and gold brick still, a ring of ticks that swings left and right on load, on each click and now and then).
// 44 px is small for 60 ticks (about 2 px apart), so the header draws the 12 major ticks, as the owner allowed; reduced motion: no turn.
function viMarkSVG(lt) {
  var T = lt ? '#006B67' : '#44C0B9', V = lt ? '#FFFFFF' : '#080808', H = lt ? '#CDE7E4' : '#0C2A30', BZ = lt ? '#EAF3F2' : '#04141A', T2 = lt ? '#00504D' : '#34A9A2', HL = lt ? '#4FB3AD' : '#9BEAE3', GD = lt ? '#C79A1C' : '#E8C56A';
  var o = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" aria-hidden="true"><circle cx="120" cy="120" r="112" fill="' + V + '" stroke="' + T + '" stroke-width="7"/><circle cx="120" cy="120" r="100" fill="' + BZ + '"/>';
  o += '<g class="ticks" style="transform-origin:120px 120px;transform-box:view-box;transition:transform 900ms cubic-bezier(.2,.8,.2,1)">';
  for (var i = 0; i < 12; i++) { var a = i * 30 * Math.PI / 180, sn = Math.sin(a), cs = Math.cos(a);
    o += '<line x1="' + (120 + 82 * sn).toFixed(2) + '" y1="' + (120 - 82 * cs).toFixed(2) + '" x2="' + (120 + 95 * sn).toFixed(2) + '" y2="' + (120 - 95 * cs).toFixed(2) + '" stroke="' + T + '" stroke-width="' + (i % 3 === 0 ? 9 : 6) + '" stroke-linecap="round"' + (i % 3 === 0 ? '' : ' opacity=".7"') + '/>'; }
  o += '</g>';
  [0, 90, 180, 270].forEach(function (d) { o += '<g transform="rotate(' + d + ' 120 120)"><rect x="105" y="2" width="30" height="16" rx="5" fill="' + V + '" stroke="' + T + '" stroke-width="4"/></g>'; });
  o += '<polygon points="68,80 86,80 120,133.6 154,80 172,80 120,162" fill="' + H + '" stroke="' + H + '" stroke-width="10" stroke-linejoin="miter" stroke-miterlimit="10"/>';
  o += '<polygon points="68,80 86,80 120,133.6 120,162" fill="' + T + '"/><polygon points="172,80 154,80 120,133.6 120,162" fill="' + T2 + '"/>';
  o += '<path d="M68 80L120 162L172 80" fill="none" stroke="' + HL + '" stroke-width="1.2" stroke-linejoin="miter" opacity=".75"/><rect x="114" y="108" width="12" height="8" rx="2.5" fill="' + GD + '"/></svg>';
  return o;
}
window.viMarkDial = 0;
// R1 (round 2): the dial swings left and right by varying degrees, like a vault combination being dialled (never more than 60 either way, and the V stays upright).
var VI_DIAL = [34, -21, 47, -12, 26, -39, 15, -28], _viDialI = 0;
function viMarkTurn() {
  try { if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch (e) {}
  window.viMarkDial = VI_DIAL[_viDialI++ % VI_DIAL.length];
  [].forEach.call(document.querySelectorAll('.vi-mark .ticks'), function (g) { g.style.transform = 'rotate(' + window.viMarkDial + 'deg)'; });
}
(function () {
  var go = function () {
    var n = document.querySelector('.vi-mark-night'), d = document.querySelector('.vi-mark-day'); if (!n || !d) return;
    n.innerHTML = viMarkSVG(false); d.innerHTML = viMarkSVG(true);
    setTimeout(viMarkTurn, 450); setTimeout(viMarkTurn, 1450); setTimeout(viMarkTurn, 2450);   // opening: three turns, then it rests
    setInterval(function () { if (!document.hidden) viMarkTurn(); }, 15000);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();

// desktop menu bar: choose the largest text size at which every item still fits on one line
function viFitNav(){
  var n=document.getElementById('topnav');if(!n)return;
  n.style.zoom='';   // v0.9.1 (E2): the menu bar has set sizes (icons 22 / 24 px, labels 11.5 / 12.5 px, rows 64 / 72 px; see #vi-v091-chrome) instead of a zoom that shrank until it fitted
}
viOnWidthResize(viFitNav,120);
window.addEventListener('load',function(){setTimeout(viFitNav,300);setTimeout(viFitNav,1500);});
function viSwipeWrap(el,hint){
  if(!el||el._swipe)return;el._swipe=true;
  var w=document.createElement('div');w.className='swipe-wrap';
  el.parentNode.insertBefore(w,el);w.appendChild(el);
  var l=document.createElement('div'),r=document.createElement('div');
  l.className='swipe-arrow l';l.innerHTML='<span><svg class="vi-ic g flip" role="img" aria-label="Previous"><use href="#vi-chevron"/></svg></span>';r.className='swipe-arrow r';r.innerHTML='<span><svg class="vi-ic g nx" role="img" aria-label="Next"><use href="#vi-chevron"/></svg></span>';
  w.appendChild(l);w.appendChild(r);
  var cap=null;if(hint){cap=document.createElement('div');cap.className='swipe-cap';cap.textContent=hint;w.appendChild(cap);}
  var upd=function(){
    var max=el.scrollWidth-el.clientWidth,x=el.scrollLeft;
    r.classList.toggle('on',max>6&&x<max-6);l.classList.toggle('on',max>6&&x>6);
    w.classList.toggle('can',max>6&&x<6);
  };
  el.addEventListener('scroll',upd,{passive:true});window.addEventListener('resize',upd);
  try{new ResizeObserver(upd).observe(el);}catch(e){}
  try{new MutationObserver(upd).observe(el,{childList:true,subtree:true});}catch(e){}
  upd();
}
// v0.8 scroll rails for the flow charts: one above (inserted before the swipe wrapper) and a bigger one below, synced both ways
function viCfRails(el){
  if(!el||el._rails)return;el._rails=true;
  var box=el.parentNode&&el.parentNode.classList.contains('swipe-wrap')?el.parentNode:el;
  var mk=function(cls,lbl){var r=document.createElement('div');r.className='cf-rail '+cls;r.dataset.for=el.id;r.setAttribute('role','scrollbar');r.setAttribute('aria-controls',el.id);r.setAttribute('aria-orientation','horizontal');r.setAttribute('aria-label',lbl);r.innerHTML='<div class="cf-thumb"></div>';return r;};
  var top=mk('cf-rail-t','Scroll the flow sideways'),bot=mk('cf-rail-b','Scroll the flow sideways');
  box.parentNode.insertBefore(top,box);box.parentNode.insertBefore(bot,box.nextSibling);
  var rails=[top,bot];
  var geo=function(r){var rw=r.clientWidth,max=el.scrollWidth-el.clientWidth,t=r.firstChild,tw=Math.max(t.offsetWidth,1);return {rw:rw,max:max,tw:tw,span:Math.max(rw-tw,1)};};
  var upd=function(){var max=el.scrollWidth-el.clientWidth;
    rails.forEach(function(r){var on=max>6;r.hidden=!on;if(!on)return;var t=r.firstChild,rw=r.clientWidth;
      t.style.width=Math.max(rw*el.clientWidth/el.scrollWidth,0)+'px';var g=geo(r);t.style.left=(g.span*el.scrollLeft/max)+'px';
      r.setAttribute('aria-valuenow',Math.round(100*el.scrollLeft/max));});};
  rails.forEach(function(r){
    var drag=null;
    r.addEventListener('pointerdown',function(e){var g=geo(r),a=r.getBoundingClientRect(),t=r.firstChild.getBoundingClientRect();
      if(e.target!==r.firstChild){el.scrollLeft=Math.max(0,Math.min(g.max,(e.clientX-a.left-g.tw/2)/g.span*g.max));upd();}
      drag={x:e.clientX,s:el.scrollLeft,id:e.pointerId};r.classList.add('drag');try{r.setPointerCapture(e.pointerId);}catch(_){ }e.preventDefault();});
    r.addEventListener('pointermove',function(e){if(!drag||e.pointerId!==drag.id)return;var g=geo(r);el.scrollLeft=Math.max(0,Math.min(g.max,drag.s+(e.clientX-drag.x)*g.max/g.span));upd();});
    var end=function(){drag=null;r.classList.remove('drag');};r.addEventListener('pointerup',end);r.addEventListener('pointercancel',end);
  });
  el.addEventListener('scroll',upd,{passive:true});window.addEventListener('resize',upd);
  try{new ResizeObserver(upd).observe(el);}catch(e){}
  try{new MutationObserver(upd).observe(el,{childList:true,subtree:true});}catch(e){}
  upd();
}
function viSwipeInit(){
  viSwipeWrap(document.getElementById('stk-pies'));
  viSwipeWrap(document.getElementById('bd-sankey'),'← swipe sideways to follow the flow →');
  viCfRails(document.getElementById('bd-sankey'));
}
window.addEventListener('load',function(){setTimeout(viSwipeInit,400);});
function closePaywall(){
  var modal=document.getElementById('paywall-modal');
  if(modal)modal.style.display='none';
  var m=document.getElementById('pw-verify-msg');if(m)m.textContent='';
}

function closeSettings(){
  var sm=document.getElementById('settings-modal');if(sm)sm.style.display='none';
}

// "Already upgraded?": asks the server (the account's profile, set by Stripe). A typed e-mail proves nothing and unlocks nothing.
async function verifyPioneerPurchase(){
  var msg=document.getElementById('pw-verify-msg');
  var say=function(c,t){ if(msg) msg.innerHTML='<span style="color:var('+c+')">'+t+'</span>'; };
  var gw=await viGatewayCheck();
  if(gw===true){
    if(!_supaUser){ say('--re','Sign in with the email you paid with, then check again.'); return; }
    say('--t2','Checking your account…');
    var row=await _syncPioneerFromProfile(_supaUser.id);
    if(row&&(row.is_pioneer||row.is_founder)){ say('--gr','Confirmed: your '+(row.is_founder?'Lifetime licence':'Pioneer')+' plan is active.'); setTimeout(function(){ closePaywall(); },1400); }
    else if(row) say('--re','No payment found for this account yet. It can take a minute after checkout. If you paid with a different email, write to hello@vault-it.co and we will link it.');
    else say('--re','Could not reach Vault-It to check. Try again in a moment.');
    return;
  }
  say('--re','Could not reach Vault-It to check. Try again in a moment.');
}

