// ─────────────────────────────────────────────────────────
// NET WORTH HISTORY (Pro)
// Storage key: vi_nw_history
// Schema: { birthYear, setupDone, points: [{ year, age, netWorth,
//           cash, stocks, metals, crypto, property, liabilities,
//           notes, estimated }] }
// ─────────────────────────────────────────────────────────
var NWH_KEY = 'vi_nw_history';
var _nwhWizData = {};

function nwhLoad(){ try{ return JSON.parse(localStorage.getItem(NWH_KEY)||'null'); }catch(e){ return null; } }
function nwhSave(d){if(viBlockEdit())return; try{ localStorage.setItem(NWH_KEY,JSON.stringify(d)); }catch(e){} }
function nwhFmt(n){ return (n>=0?'£':'-£')+Math.abs(Math.round(n)).toLocaleString(); }

function openNwHistory(){
  if(!_isPro()){ showUpgrade('annual'); return; }
  document.getElementById('nwh-modal').style.display='flex';
  var data=nwhLoad();
  if(!data||!data.setupDone){ _nwhWizData={}; nwhRenderWizard(0); }
  else nwhRenderHistory(data);
}
function closeNwHistory(){
  document.getElementById('nwh-modal').style.display='none';
  nwhRenderMini();
}

// ── WIZARD ─────────────────────────────────────────────
var _nwhSteps=[
  { n:'01/05', q:'What year were you born?',
    sub:'We\'ll map your full financial journey from your 18th birthday to today.',
    id:'birthYear', type:'number', ph:'e.g. 1990' },
  { n:'02/05', q:'What was your net worth at age 18?',
    sub:'Savings minus any debts. Student debt or overdraft? Go negative. Most people start near £0.',
    id:'startNw', type:'number', ph:'e.g. 500 or -3500' },
  { n:'03/05', q:'What was your financial low point?',
    sub:'The year and amount when things were toughest: debt, redundancy, or rock bottom. Negative if in debt.',
    id:'lowestNw', yid:'lowestYear', type:'number', ph:'Amount e.g. -12500', yph:'Year e.g. 2015' },
  { n:'04/05', q:'What was your best financial year so far?',
    sub:'A year you felt real momentum: a promotion, debt cleared, first investment, savings milestone.',
    id:'bestNw', yid:'bestYear', type:'number', ph:'Amount e.g. 28000', yph:'Year e.g. 2022' },
  { n:'05/05', q:'What\'s your #1 financial goal right now?',
    sub:'One line. This becomes your north star on the journey map.',
    id:'goal', type:'text', ph:'e.g. Own my home debt-free by 40' }
];

function nwhRenderWizard(step){
  var body=document.getElementById('nwh-body'); if(!body) return;
  var s=_nwhSteps[step];
  var pct=Math.round(((step+1)/5)*100);
  var html='<div class="nwh-wizard">'
    +'<div style="margin-bottom:24px">'
    +'<div style="height:3px;background:rgb(var(--ink-rgb) / .06);border-radius:2px;overflow:hidden;margin-bottom:8px">'
    +'<div style="height:100%;width:'+pct+'%;background:linear-gradient(90deg,var(--em),var(--go));transition:width .4s ease"></div></div>'
    +'<div style="font-family:\'Share Tech Mono\',monospace;font-size:max(.46rem,var(--vi-fs-1));color:var(--t3);letter-spacing:.12em">STEP '+s.n+'</div>'
    +'</div>'
    +'<div class="nwh-q-text">'+s.q+'</div>'
    +'<div class="nwh-q-sub">'+s.sub+'</div>';
  if(s.yid){
    html+='<input class="nwh-input" type="number" id="nwh-y" placeholder="'+s.yph+'" min="1940" max="'+new Date().getFullYear()+'" value="'+(_nwhWizData[s.yid]||'')+'">';
  }
  html+='<input class="nwh-input" type="'+s.type+'" id="nwh-v" placeholder="'+s.ph+'" value="'+(_nwhWizData[s.id]!==undefined?_nwhWizData[s.id]:'')+'">';
  html+='<div style="display:flex;gap:10px;margin-top:16px">';
  if(step>0) html+='<button onclick="nwhWizBack('+step+')" style="padding:9px 18px;background:none;border:1px solid var(--bd);color:var(--t2);font-family:\'Syne\',sans-serif;font-weight:700;font-size:max(.58rem,var(--vi-fs-2));cursor:pointer">← Back</button>';
  html+='<button onclick="nwhWizNext('+step+')" style="flex:1;padding:9px 22px;background:linear-gradient(135deg,var(--go),var(--go2));border:none;clip-path:polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px));color:#080808;font-family:\'Syne\',sans-serif;font-weight:800;font-size:max(.6rem,var(--vi-fs-2));cursor:pointer;letter-spacing:.06em">'+(step<4?'Next →':'Build My Journey →')+'</button>';
  html+='</div></div>';
  body.innerHTML=html;
  setTimeout(function(){ var el=document.getElementById('nwh-v'); if(el)el.focus(); },80);
}

function nwhWizNext(step){
  var s=_nwhSteps[step];
  var vEl=document.getElementById('nwh-v');
  var yEl=document.getElementById('nwh-y');
  var v=vEl?vEl.value.trim():'';
  if(step<4&&v===''){showToast('Please fill in this field');return;}
  if(step===0){var yr=parseInt(v); if(isNaN(yr)||yr<1930||yr>2008){showToast('Enter a valid birth year');return;}}
  _nwhWizData[s.id]=(s.type==='number')?(parseFloat(v)||0):v;
  if(yEl&&s.yid) _nwhWizData[s.yid]=parseInt(yEl.value)||0;
  if(step<4) nwhRenderWizard(step+1);
  else nwhWizComplete();
}
function nwhWizBack(step){ nwhRenderWizard(step-1); }

function nwhWizComplete(){
  var cy=new Date().getFullYear();
  var by=Math.round(_nwhWizData.birthYear)||1990;
  var sy=by+18;
  if(_nwhWizData.goal){
    try{ var u=JSON.parse(localStorage.getItem('vi_user')||'{}'); u.goal=_nwhWizData.goal; localStorage.setItem('vi_user',JSON.stringify(u)); }catch(e){}
  }
  // Anchors: start, low, best, current
  var anchors={};
  anchors[sy]=_nwhWizData.startNw||0;
  if(_nwhWizData.lowestYear>=sy&&_nwhWizData.lowestYear<=cy) anchors[_nwhWizData.lowestYear]=_nwhWizData.lowestNw||0;
  if(_nwhWizData.bestYear>=sy&&_nwhWizData.bestYear<=cy) anchors[_nwhWizData.bestYear]=_nwhWizData.bestNw||0;
  // Live NW from overview state
  var liveNw=0;
  try{ var os=JSON.parse(localStorage.getItem('pos_ov1')||'null'); if(os){ liveNw=(os.assets||[]).reduce(function(a,r){return a+(+r.val||0);},0)-(os.debts||[]).reduce(function(a,r){return a+(+r.val||0);},0); } }catch(e){}
  anchors[cy]=liveNw;
  var aYrs=Object.keys(anchors).map(Number).sort(function(a,b){return a-b;});
  // Generate all years with interpolation
  var points=[];
  for(var yr=sy;yr<=cy;yr++){
    var nw=0;
    if(anchors[yr]!==undefined){ nw=anchors[yr]; }
    else{
      var bef=null,aft=null;
      for(var i=0;i<aYrs.length;i++){
        if(aYrs[i]<yr) bef=aYrs[i];
        if(aYrs[i]>yr&&aft===null) aft=aYrs[i];
      }
      if(bef!==null&&aft!==null){ var t=(yr-bef)/(aft-bef); nw=Math.round(anchors[bef]+t*(anchors[aft]-anchors[bef])); }
      else if(bef!==null) nw=anchors[bef];
    }
    points.push({year:yr,age:yr-by,netWorth:nw,cash:0,stocks:0,metals:0,crypto:0,property:0,liabilities:0,notes:'',estimated:anchors[yr]===undefined});
  }
  var data={birthYear:by,setupDone:true,points:points};
  nwhSave(data);
  nwhRenderHistory(data);
}

// ── HISTORY VIEW ───────────────────────────────────────
function nwhRenderHistory(data){
  var body=document.getElementById('nwh-body'); if(!body) return;
  var pts=data.points||[]; var cy=new Date().getFullYear();
  var vals=pts.map(function(p){return p.netWorth;});
  var minNw=vals.length?Math.min.apply(null,vals):0;
  var maxNw=vals.length?Math.max.apply(null,vals):0;
  var startNw=pts.length?pts[0].netWorth:0;
  var endNw=pts.length?pts[pts.length-1].netWorth:0;
  var rng=document.getElementById('nwh-year-range');
  if(rng) rng.textContent=(pts.length?pts[0].year:'')+' – '+cy;
  var html='';
  // KPI strip
  html+='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;margin-bottom:18px">';
  html+='<div class="ov-kpi"><div class="ov-kpi-lbl">At 18</div><div class="ov-kpi-val" style="font-size:max(.78rem,var(--vi-fs-3));color:var(--em)">'+nwhFmt(startNw)+'</div><div class="ov-kpi-sub">starting point</div></div>';
  html+='<div class="ov-kpi"><div class="ov-kpi-lbl">All-Time Low</div><div class="ov-kpi-val" style="font-size:max(.78rem,var(--vi-fs-3));color:var(--re)">'+nwhFmt(minNw)+'</div><div class="ov-kpi-sub">trough</div></div>';
  html+='<div class="ov-kpi"><div class="ov-kpi-lbl">All-Time High</div><div class="ov-kpi-val" style="font-size:max(.78rem,var(--vi-fs-3));color:var(--gr)">'+nwhFmt(maxNw)+'</div><div class="ov-kpi-sub">peak</div></div>';
  html+='<div class="ov-kpi"><div class="ov-kpi-lbl">Total Growth</div><div class="ov-kpi-val" style="font-size:max(.78rem,var(--vi-fs-3));color:'+(endNw-startNw>=0?'var(--gr)':'var(--re)')+'">'+nwhFmt(endNw-startNw)+'</div><div class="ov-kpi-sub">since age 18</div></div>';
  html+='</div>';
  // Chart card
  html+='<div class="ov-chart-card" style="margin-bottom:18px">'
    +'<div class="ov-chart-hd" style="flex-wrap:wrap;gap:8px">'
    +'<span class="ov-chart-title">Net Worth Timeline</span>'
    +'<div style="display:flex;gap:8px">'
    +'<button onclick="nwhAddYear()" style="padding:5px 12px;background:rgb(var(--teal-rgb) / .08);border:1px solid rgb(var(--teal-rgb) / .2);color:var(--em);font-family:\'Share Tech Mono\',monospace;font-size:max(.48rem,var(--vi-fs-1));cursor:pointer">+ Add Year</button>'
    +'<button onclick="nwhResetWizard()" style="padding:5px 12px;background:rgb(var(--ink-rgb) / .03);border:1px solid var(--bd);color:var(--t3);font-family:\'Share Tech Mono\',monospace;font-size:max(.48rem,var(--vi-fs-1));cursor:pointer">↺ Redo</button>'
    +'</div></div>'
    +'<canvas id="nwh-chart" height="160" style="width:100%;display:block"></canvas>'
    +'</div>';
  // Year table
  html+='<div style="font-family:\'Share Tech Mono\',monospace;font-size:max(.42rem,var(--vi-fs-1));color:var(--t3);letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px">Year-by-Year · tap any cell to edit · estimated rows marked ~</div>';
  html+='<div style="overflow-x:auto"><table class="nwh-year-table"><thead><tr>'
    +'<th style="text-align:left">Year</th><th style="text-align:left">Age</th>'
    +'<th>Cash</th><th>Stocks</th><th>Metals</th><th>Crypto</th><th>Property</th>'
    +'<th style="color:var(--amber)">Liabilities</th>'
    +'<th style="color:var(--em)">Net Worth</th>'
    +'<th style="text-align:left">Notes</th><th></th>'
    +'</tr></thead><tbody>';
  pts.slice().reverse().forEach(function(p){
    var nwCol=p.netWorth>=0?'var(--gr)':'var(--re)';
    var isCy=p.year===cy;
    html+='<tr>'
      +'<td><span style="font-family:\'Share Tech Mono\',monospace;font-size:max(.6rem,var(--vi-fs-2));'+(isCy?'color:var(--em);font-weight:700':'color:var(--t2)')+'">'+p.year+(p.estimated?' <span style="font-size:max(.4rem,var(--vi-fs-1));color:var(--t3)">~</span>':'')+'</span></td>'
      +'<td><span style="font-family:\'Share Tech Mono\',monospace;font-size:max(.54rem,var(--vi-fs-1));color:var(--t3)">'+p.age+'</span></td>'
      +'<td><input class="nwh-td-input" type="number" value="'+(p.cash||0)+'" onchange="nwhUpdate('+p.year+',\'cash\',this.value)"></td>'
      +'<td><input class="nwh-td-input" type="number" value="'+(p.stocks||0)+'" onchange="nwhUpdate('+p.year+',\'stocks\',this.value)"></td>'
      +'<td><input class="nwh-td-input" type="number" value="'+(p.metals||0)+'" onchange="nwhUpdate('+p.year+',\'metals\',this.value)"></td>'
      +'<td><input class="nwh-td-input" type="number" value="'+(p.crypto||0)+'" onchange="nwhUpdate('+p.year+',\'crypto\',this.value)"></td>'
      +'<td><input class="nwh-td-input" type="number" value="'+(p.property||0)+'" onchange="nwhUpdate('+p.year+',\'property\',this.value)"></td>'
      +'<td><input class="nwh-td-input" type="number" value="'+(p.liabilities||0)+'" onchange="nwhUpdate('+p.year+',\'liabilities\',this.value)" style="color:var(--amber)"></td>'
      +'<td><input class="nwh-td-input" id="nwh-nw-'+p.year+'" type="number" value="'+(p.netWorth||0)+'" onchange="nwhUpdateNw('+p.year+',this.value)" style="color:'+nwCol+';font-weight:700"></td>'
      +'<td><input class="nwh-td-input nwh-td-notes" type="text" value="'+(p.notes||'')+'" onchange="nwhUpdate('+p.year+',\'notes\',this.value)" placeholder="–"></td>'
      +'<td><button onclick="nwhDeleteYear('+p.year+')" style="background:none;border:none;color:var(--re);font-size:max(.7rem,var(--vi-fs-3));cursor:pointer;padding:2px 4px;opacity:.35" title="Delete row">×</button></td>'
      +'</tr>';
  });
  html+='</tbody></table></div>';

  // Card layout (shown on mobile, hidden on desktop via CSS)
  html+='<div class="nwh-cards">';
  pts.slice().reverse().forEach(function(p){
    var nwCol=p.netWorth>=0?'var(--gr)':'var(--re)';
    html+='<div class="nwh-card">'
      +'<div class="nwh-card-top">'
      +'<span class="nwh-card-yr">'+p.year+(p.age?' · age '+p.age:'')+(p.estimated?' <span style="font-size:max(.4rem,var(--vi-fs-1));color:var(--t3)">~</span>':'')+'</span>'
      +'<span class="nwh-card-nw" style="color:'+nwCol+'">'+nwhFmt(p.netWorth)+'</span>'
      +'</div>'
      +'<div class="nwh-card-fields">'
      +'<div class="nwh-card-field"><label>Cash</label><input type="number" value="'+(p.cash||0)+'" onchange="nwhUpdate('+p.year+',\'cash\',this.value)"></div>'
      +'<div class="nwh-card-field"><label>Stocks</label><input type="number" value="'+(p.stocks||0)+'" onchange="nwhUpdate('+p.year+',\'stocks\',this.value)"></div>'
      +'<div class="nwh-card-field"><label>Metals</label><input type="number" value="'+(p.metals||0)+'" onchange="nwhUpdate('+p.year+',\'metals\',this.value)"></div>'
      +'<div class="nwh-card-field"><label>Crypto</label><input type="number" value="'+(p.crypto||0)+'" onchange="nwhUpdate('+p.year+',\'crypto\',this.value)"></div>'
      +'<div class="nwh-card-field"><label>Property</label><input type="number" value="'+(p.property||0)+'" onchange="nwhUpdate('+p.year+',\'property\',this.value)"></div>'
      +'<div class="nwh-card-field"><label style="color:var(--amber)">Liabilities</label><input type="number" value="'+(p.liabilities||0)+'" onchange="nwhUpdate('+p.year+',\'liabilities\',this.value)" style="color:var(--amber)"></div>'
      +'<div class="nwh-card-field" style="grid-column:1/-1"><label style="color:var(--em)">Net Worth (override)</label><input id="nwh-nw-'+p.year+'" type="number" value="'+(p.netWorth||0)+'" onchange="nwhUpdateNw('+p.year+',this.value)" style="color:'+nwCol+';font-weight:700"></div>'
      +'<div class="nwh-card-field" style="grid-column:1/-1"><label>Notes</label><input type="text" value="'+(p.notes||'')+'" onchange="nwhUpdate('+p.year+',\'notes\',this.value)" placeholder="–"></div>'
      +'</div>'
      +'<div style="margin-top:8px;text-align:right"><button onclick="nwhDeleteYear('+p.year+')" style="background:none;border:1px solid rgb(var(--red-rgb) / .2);color:var(--re);font-family:\'Share Tech Mono\',monospace;font-size:max(.44rem,var(--vi-fs-1));cursor:pointer;padding:3px 10px;opacity:.6">Delete year</button></div>'
      +'</div>';
  });
  html+='</div>';

  body.innerHTML=html;
  setTimeout(function(){ nwhDrawChart(pts); },60);
}

function nwhUpdate(year,field,value){
  var data=nwhLoad(); if(!data) return;
  var p=data.points.find(function(x){return x.year===year;}); if(!p) return;
  p[field]=field==='notes'?value:(parseFloat(value)||0);
  if(field!=='notes'){
    p.netWorth=(p.cash||0)+(p.stocks||0)+(p.metals||0)+(p.crypto||0)+(p.property||0)-(p.liabilities||0);
    p.estimated=false;
    var nwEl=document.getElementById('nwh-nw-'+year);
    if(nwEl){ nwEl.value=p.netWorth; nwEl.style.color=p.netWorth>=0?'var(--gr)':'var(--re)'; }
  }
  nwhSave(data);
  nwhDrawChart(data.points);
}

function nwhUpdateNw(year,value){if(viBlockEdit())return;
  var data=nwhLoad(); if(!data) return;
  var p=data.points.find(function(x){return x.year===year;}); if(!p) return;
  p.netWorth=parseFloat(value)||0; p.estimated=false;
  nwhSave(data); nwhDrawChart(data.points);
}

function nwhDeleteYear(year){if(viBlockEdit())return;
  var data=nwhLoad(); if(!data) return;
  if(year===new Date().getFullYear()){showToast('Cannot delete the current year');return;}
  data.points=data.points.filter(function(p){return p.year!==year;});
  nwhSave(data); nwhRenderHistory(data);
}

function nwhAddYear(){if(viBlockEdit())return;
  var yr=parseInt(prompt('Enter a year to add (e.g. '+(new Date().getFullYear()-5)+'):'));
  if(!yr||isNaN(yr)) return;
  var data=nwhLoad(); if(!data) return;
  var by=data.birthYear||1990; var cy=new Date().getFullYear();
  if(yr<by+14||yr>cy+1){showToast('Year out of range');return;}
  if(data.points.find(function(p){return p.year===yr;})){showToast('Year '+yr+' already exists. Edit the row');return;}
  data.points.push({year:yr,age:yr-by,netWorth:0,cash:0,stocks:0,metals:0,crypto:0,property:0,liabilities:0,notes:'',estimated:false});
  data.points.sort(function(a,b){return a.year-b.year;});
  nwhSave(data); nwhRenderHistory(data);
}

function nwhResetWizard(){
  if(!confirm('Clear all history and redo setup?')) return;
  localStorage.removeItem(NWH_KEY);
  _nwhWizData={};
  nwhRenderWizard(0);
}

// ── CHART ──────────────────────────────────────────────
function nwhDrawChart(pts){
  var canvas=document.getElementById('nwh-chart'); if(!canvas) return;
  var W=canvas.offsetWidth||600; var H=160;
  var dpr=window.devicePixelRatio||1;
  canvas.width=W*dpr; canvas.height=H*dpr;
  canvas.style.width=W+'px'; canvas.style.height=H+'px';
  var ctx=canvas.getContext('2d'); ctx.scale(dpr,dpr);
  if(!pts||pts.length<2) return;
  var pad={t:14,r:12,b:28,l:54};
  var cW=W-pad.l-pad.r; var cH=H-pad.t-pad.b;
  var vals=pts.map(function(p){return p.netWorth;});
  var minV=Math.min.apply(null,vals); var maxV=Math.max.apply(null,vals);
  var rng=maxV-minV||1; var p2=rng*0.12; minV-=p2; maxV+=p2; rng=maxV-minV;
  var tx=function(i){return pad.l+(i/(pts.length-1))*cW;};
  var ty=function(v){return pad.t+cH-((v-minV)/rng)*cH;};
  // Grid + labels
  ctx.font='8px Share Tech Mono,monospace'; ctx.textAlign='right';
  for(var i=0;i<=4;i++){
    var gy=pad.t+(cH/4)*i; var gv=maxV-(rng/4)*i;
    ctx.strokeStyle='rgba(255,255,255,.04)'; ctx.lineWidth=1; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(pad.l,gy); ctx.lineTo(pad.l+cW,gy); ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.22)';
    var gl=Math.abs(gv)>=1000?(gv>=0?'£':'-£')+Math.round(Math.abs(gv)/1000)+'k':(gv>=0?'£':'-£')+Math.abs(Math.round(gv));
    ctx.fillText(gl,pad.l-4,gy+3);
  }
  // Zero line
  var zy=ty(0);
  if(zy>=pad.t&&zy<=pad.t+cH){
    ctx.strokeStyle='rgba(255,255,255,.12)'; ctx.lineWidth=1; ctx.setLineDash([3,4]);
    ctx.beginPath(); ctx.moveTo(pad.l,zy); ctx.lineTo(pad.l+cW,zy); ctx.stroke();
    ctx.setLineDash([]);
  }
  // Gradient fill
  var grad=ctx.createLinearGradient(0,pad.t,0,pad.t+cH);
  grad.addColorStop(0,'rgba(68,192,185,.22)'); grad.addColorStop(1,'rgba(68,192,185,.02)');
  ctx.beginPath();
  ctx.moveTo(tx(0),pad.t+cH);
  pts.forEach(function(p,i){ctx.lineTo(tx(i),ty(p.netWorth));});
  ctx.lineTo(tx(pts.length-1),pad.t+cH); ctx.closePath();
  ctx.fillStyle=grad; ctx.fill();
  // Line
  ctx.beginPath(); ctx.moveTo(tx(0),ty(pts[0].netWorth));
  pts.forEach(function(p,i){if(i>0)ctx.lineTo(tx(i),ty(p.netWorth));});
  ctx.strokeStyle='rgba(68,192,185,.9)'; ctx.lineWidth=2; ctx.lineJoin='round'; ctx.stroke();
  // Anchor dots
  pts.forEach(function(p,i){
    if(!p.estimated){
      ctx.beginPath(); ctx.arc(tx(i),ty(p.netWorth),3,0,Math.PI*2);
      ctx.fillStyle=p.netWorth>=0?'rgba(62,207,142,.9)':'rgba(224,92,92,.9)'; ctx.fill();
    }
  });
  // Year labels every 5yr
  ctx.fillStyle='rgba(255,255,255,.28)'; ctx.font='8px Share Tech Mono,monospace'; ctx.textAlign='center';
  pts.forEach(function(p,i){ if(p.year%5===0) ctx.fillText(p.year,tx(i),pad.t+cH+16); });
}

// ── MINI PREVIEW in overview ───────────────────────────
