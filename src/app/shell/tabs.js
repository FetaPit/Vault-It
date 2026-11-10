<script>
// ═══════════════════════════════════════════════════════════════
// TAB SWITCHING
// ═══════════════════════════════════════════════════════════════
function showTab(id){
  window._viNavAt=performance.now();   // v0.9.2: the 3D warm-up keeps out of the way for a moment after every tab change
  if(id==='house'&&window.VIPERF)VIPERF.mark('tab');
  if(id==='connections'){showSettings();var cs=document.getElementById('set-locked-conns');if(cs)setTimeout(function(){try{cs.scrollIntoView({block:'start'})}catch(e){}},60);return;}
  if(id!=='house'&&typeof _threeAnimId!=='undefined'&&_threeAnimId){cancelAnimationFrame(_threeAnimId);_threeAnimId=null;}
  if(id!=='house'&&typeof HB3DAPP!=='undefined'&&HB3DAPP.viewer){try{HB3DAPP.viewer.stop();}catch(e){}}
  // Always collapse the ISO expand when switching tabs
  if(typeof _isExpanded!=='undefined'&&_isExpanded) toggleExpand();
  if(typeof _mIsExpanded!=='undefined'&&_mIsExpanded) toggleMetalsExpand();
  document.querySelectorAll('.tab-panel').forEach(p=>{p.classList.remove('active');p.style.display='none';});
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  const panel=document.getElementById('tab-'+id);
  if(panel){panel.classList.add('active');panel.style.display='block';}
  try{viDevCardPlace(panel);}catch(e){}
  try{viRoadmapPlace(id);}catch(e){}
  document.querySelectorAll('.tab-btn').forEach(b=>{
    if(b.getAttribute('onclick')&&b.getAttribute('onclick').includes("'"+id+"'"))b.classList.add('active');
  });
  if(id==='overview'){_fireFirstPaint=true;updateKPIs();drawChart();renderCashflow();renderSummaryCards();try{renderOvAch();}catch(e){}}
  if(id==='budget'){renderCashflow();}
  try{viNavReveal();}catch(e){}
  if(id==='house')setTimeout(redraw,30);
  if(id==='assets'){setTimeout(()=>{renderAlTab();var on=document.querySelector('#assets-page .subtab-panel.active');if(on&&on.id==='assets-cash')renderCashISO();else renderMetalsISO();},30);}
  if(id==='debt'){renderDebtTab();setTimeout(function(){drawDebtHistogram();drawDebtDonut();},80);}
  if(id==='biz'){renderBizTab();updateProGate();}
  if(id==='achievements')renderAchievements();
  if(id==='connections')renderConnections();
  if (id === 'overview' && typeof refreshAllLiveConns === 'function' && viLiveOn()) {
    // Only auto-refresh if at least one live connector was activated on this device (kept as on live)
    var hasLive = achState && achState.connected && ['coingecko','metals_live','exchangerate','yahoo'].some(function(lid){ return achState.connected[lid]; });
    if (hasLive) refreshAllLiveConns();
  }
  if(id==='journey'){jrnyLoadState();renderJourney();}
  if(id==='network')renderNetworkTab();
}
// The Financial Freedom Roadmap is one card: it sits on the dashboard and moves into the Wealth Roadmap tab while that tab is open (owner, 3 Nov), so both always show the same roadmap
function viRoadmapPlace(id){
  var c=document.getElementById('fire-roadmap-card'),slot=document.getElementById(id==='achievements'?'wr-roadmap-slot':'ov-roadmap-slot');
  if(!c||!slot||c.parentNode===slot)return;
  slot.appendChild(c);_fireFirstPaint=true;
  if(id==='achievements')setTimeout(function(){try{renderFIREroadmap();}catch(e){}},0);
}
// Message the Dev shows on the dashboard only (owner, 3 Nov, v0.9.1: "only needs to be shown on the dashboard, remove it from the rest"):
// it is the last block of Overview, and on every other tab it is taken out of the page (kept here, not hidden) until Overview opens again
var _viDevCard=null;
function viDevCardPlace(panel){
  if(!_viDevCard)_viDevCard=document.getElementById('vi-devcard');
  var c=_viDevCard;panel=panel||document.querySelector('.tab-panel.active');if(!c||!panel)return;
  if(panel.id!=='tab-overview'){if(c.parentNode)c.parentNode.removeChild(c);return;}
  var host=panel.firstElementChild&&!/^(SCRIPT|STYLE)$/.test(panel.firstElementChild.tagName)?panel.firstElementChild:panel;
  if(host.lastElementChild!==c)host.appendChild(c);
}
document.addEventListener('DOMContentLoaded',function(){try{viDevCardPlace();}catch(e){}});
// Scroll the (horizontally scrollable) top nav so the active tab is fully visible
function viNavReveal(){
  var nav=document.getElementById('vi-tabs')||document.getElementById('topnav'),b=nav&&nav.querySelector('.tab-btn.active');
  if(!nav||!b)return;
  var l=b.offsetLeft,r=l+b.offsetWidth,pad=48;
  if(l<nav.scrollLeft+pad)nav.scrollTo?nav.scrollTo({left:Math.max(0,l-pad),behavior:'smooth'}):(nav.scrollLeft=Math.max(0,l-pad));
  else if(r>nav.scrollLeft+nav.clientWidth-pad){var x=r-nav.clientWidth+pad;nav.scrollTo?nav.scrollTo({left:x,behavior:'smooth'}):(nav.scrollLeft=x);}
}
// Overview "Own and owe" headings open their tab (liabilities is a sub-tab of Assets)
function ovGo(t){
  if(t==='debt'){showTab('debt');return;}
  showTab('assets');
  if(t==='liabilities'){var b=document.querySelector('#assets-page [onclick*="\'liabilities\'"]');showSubtab('assets','liabilities',b);}
  try{window.scrollTo({top:0,behavior:'smooth'});}catch(e){window.scrollTo(0,0);}
}
// Goals / Snapshots tabs on the Overview, choice remembered on this device
function ovMsTab(t){
  var c=document.getElementById('ov-ms-card');if(!c)return;t=t==='snaps'?'snaps':'goals';c.setAttribute('data-tab',t);
  try{localStorage.setItem('vi-ov-ms-tab',t);}catch(e){}
  nwMoreSync();
}
// History, Goals and Snapshots: small buttons at the foot of the net worth tile, each opens its panel under the chart,
// one at a time, all closed on load (owner, 2 Nov: "by default it should be collapsed"). A second tap closes it.
function nwMore(p){
  var h=document.getElementById('ov-nwh-card'),m=document.getElementById('ov-ms-card');if(!h||!m)return;
  var open=nwMoreOpen();
  if(p===open)p='';
  h.hidden=p!=='history';m.hidden=!(p==='goals'||p==='snaps');
  if(p==='goals'||p==='snaps')ovMsTab(p);
  if(p==='history')try{nwhRenderMini();}catch(e){}
  nwMoreSync();
}
function nwMoreOpen(){
  var h=document.getElementById('ov-nwh-card'),m=document.getElementById('ov-ms-card');
  return h&&!h.hidden?'history':(m&&!m.hidden?(m.getAttribute('data-tab')==='snaps'?'snaps':'goals'):'');
}
function nwMoreSync(){var o=nwMoreOpen();document.querySelectorAll('#nw-more .nw-more-btns button').forEach(function(b){b.setAttribute('aria-expanded',b.getAttribute('data-p')===o?'true':'false');});}
function showSubtab(group,id,btn){
  window._viNavAt=performance.now();
  document.querySelectorAll('#'+group+'-page .subtab-panel').forEach(p=>{p.classList.remove('active');p.style.display='none';});
  document.querySelectorAll('#'+group+'-page .subtab-btn').forEach(b=>b.classList.remove('active'));
  const sp=document.getElementById(group+'-'+id);
  if(sp){sp.classList.add('active');sp.style.display='block';}
  if(btn)btn.classList.add('active');
  if(group==='assets'){var nv=document.querySelector('#assets-page .subtab-nav');if(nv&&sp){var gap=sp.getBoundingClientRect().top-nv.getBoundingClientRect().bottom;if(gap<0)window.scrollBy(0,gap);}}   // v0.9.1: the pinned bar stays put; a new panel starts right under it
  if(group==='assets'&&id==='metals')setTimeout(renderMetalsISO,30);
  if(group==='assets'&&id==='cash')setTimeout(renderCashISO,80);
  if(group==='assets'&&id==='stocks'){try{stkRender();}catch(e){}setTimeout(stkAutoRefresh,100);}
  if(group==='assets'&&id==='crypto')setTimeout(function(){try{crAutoRefresh()}catch(e){}},100);
}

