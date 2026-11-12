<script id="vi-nw3d-app">
/* Wires the brand engine to the app's own figures. Reads only: computeNetWorth and the asset and debt totals for the scene, and the main
 * chart's own points (drawChart: canvas._points, canvas._proj) for the tracker, so switching view can never change a number. */
(function(){
"use strict";
function nw3dFlag(){return typeof viFlag==='function'?viFlag('nw'):true;}   // on by default (owner, 30 Oct 2026); ?nw=old or Settings for the classic chart
window.nw3dFlag=nw3dFlag;
/* mount / unmount without a reload, so Settings can switch a device between 3D and the classic chart live */
window.nw3dMount=function(){
if(window.nw3d||!window.ViNW3D||typeof drawChart!=='function')return;
var E=window.ViNW3D,MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function rate(){return window.VI_CURRENCY_RATE||1}
function sym(){return window.VI_CURRENCY_SYMBOL||'£'}
/* full figures (the tag and the readout), in the display currency like every other figure in the app */
function full(v){v=Math.round(v||0);return (v<0?'-':'')+sym()+Math.abs(v).toLocaleString('en-GB')}
function monthLab(m){var p=String(m).split('-');return (MN[(+p[1]||1)-1]||'')+" '"+String(p[0]).slice(2)}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function n(f){try{var v=f();return isFinite(v)?+v:0;}catch(e){return 0;}}
/* colours: the Night values of the colour-code tokens, read from the stage (3D viewports stay Night in both themes) */
function tok(el,name){var cs=getComputedStyle(el),v=cs.getPropertyValue('--'+name+'-rgb').trim().split(/[\s,\/]+/).map(Number);return v.length>=3&&v.slice(0,3).every(function(x){return x>=0})?v.slice(0,3):(parseCol(cs.getPropertyValue('--'+name))||[128,128,128])}
function parseCol(s){s=String(s||'').trim();var m=s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);if(m){var h=m[1];if(h.length===3)h=h.replace(/./g,'$&$&');return [0,2,4].map(function(k){return parseInt(h.substr(k,2),16)})}
  m=s.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);return m?[+m[1],+m[2],+m[3]]:null}

/* ── markup (only with the flag on) ── */
var chartCv=document.getElementById('nwChart'),chartCard=chartCv&&chartCv.closest('.ov-chart-card');
if(!chartCard)return;
/* owner, 30 Oct 2026: the 3D scene is the main view of the net worth card; the chart is the backup behind a 3D | Graph switch */
var hero=document.createElement('div');
hero.className='nw3d-hero-in';hero.id='nw3d-hero';
hero.innerHTML='<span class="nw3d-sub" style="margin:0 0 10px">What you own stands on the gold line. What you owe hangs below it. Tap a column to read it, drag to turn it, pinch or scroll to zoom.</span>'
 +'<div class="nw3d-stage" id="nw3d-hero-stage"><canvas id="nw3d-hero-cv" tabindex="0" role="img" aria-label="Net worth in 3D"></canvas>'
 +'<div class="nw3d-hud" role="group" aria-label="View controls"><button type="button" data-z="in" aria-label="Zoom in" title="Zoom in">+</button><button type="button" data-z="out" aria-label="Zoom out" title="Zoom out">&minus;</button><button type="button" data-z="reset" aria-label="Reset view" title="Reset view">&#8634;</button></div></div>'
 +'<p class="nw3d-read" id="nw3d-hero-read" aria-live="polite"></p>'
 +'<details class="nw3d-legend-wrap"><summary>What each column is</summary><div class="nw3d-legend" id="nw3d-hero-legend"></div></details>'
 +'<p class="nw3d-key" id="nw3d-hero-key"></p>';
var hd=chartCard.querySelector('.ov-chart-hd'),ttl=chartCard.querySelector('.ov-chart-title');hd.parentNode.insertBefore(hero,hd.nextSibling);
var top=document.createElement('div');top.className='nw3d-top';hd.insertBefore(top,hd.firstChild);top.appendChild(ttl);
var mseg=document.createElement('div');mseg.className='nw3d-seg';mseg.id='nw3d-main';mseg.setAttribute('role','group');mseg.setAttribute('aria-label','Net worth view');
mseg.innerHTML='<button type="button" data-m="3d" aria-pressed="false"><svg class="vi-ic" aria-hidden="true"><use href="#vi-brick"/></svg>3D</button>'
 +'<button type="button" data-m="graph" aria-pressed="false"><svg class="vi-ic" aria-hidden="true"><use href="#vi-forecast"/></svg>Graph</button>';
top.appendChild(mseg);
var ctl=chartCard.querySelector('.ov-chart-hd > div:not(.nw3d-top)');ctl.classList.add('nw3d-graph-only');var lg=chartCard.querySelector('.ov-legend');if(lg)lg.classList.add('nw3d-graph-only');
var wrap=chartCv.parentNode;wrap.classList.add('nw3d-wrap');
var tip=document.getElementById('chart-tooltip');tip.classList.add('nw3d-graph-only');
/* the progress blocks: their own card under the net worth card (owner, 31 Oct 2026), with the Forecast switch top right */
var tcard=document.createElement('div');tcard.className='ov-chart-card nw3d-trk-card';tcard.id='nw3d-trk-card';
tcard.innerHTML='<div class="nw3d-top"><span class="ov-chart-title">Net worth progress</span>'
 +'<div class="nw3d-seg" role="group" aria-label="Forecast"><button type="button" class="nw3d-fc" id="nw3d-fc" aria-pressed="false"><svg class="vi-ic" aria-hidden="true"><use href="#vi-forecast"/></svg>Forecast</button></div></div>'
 +'<span class="nw3d-sub">Your net worth month by month, one column of blocks a month. Forecast adds the next six months as see-through blocks. Tap or hover a month to read it, drag to turn it.</span>'
 +'<div class="nw3d-stage" id="nw3d-trk-stage"><canvas id="nw3d-trk-cv" tabindex="0" role="img" aria-label="Net worth progress in 3D blocks. Tap a month to read it, drag to turn it."></canvas></div>'
 +'<p class="nw3d-read" id="nw3d-trk-read" aria-live="polite"></p>'
 +'<p class="nw3d-key" id="nw3d-trk-key"></p>';   /* no forecast note here (owner, 2 Nov: "not relevant"); the Graph view keeps it */
chartCard.parentNode.insertBefore(tcard,chartCard.nextSibling);
var tst=document.getElementById('nw3d-trk-stage'),tkey=document.getElementById('nw3d-trk-key'),trkRead=document.getElementById('nw3d-trk-read'),fcBtn=document.getElementById('nw3d-fc');
function fcSync(){fcBtn.setAttribute('aria-pressed',chartState.metrics.proj?'true':'false')}
fcBtn.addEventListener('click',function(){toggleChartMetric(chartCard.querySelector('.chart-metric-btn[data-metric="proj"]'),'proj');fcSync();refreshTracker(true)});

var heroCv=document.getElementById('nw3d-hero-cv'),trkCv=document.getElementById('nw3d-trk-cv'),heroRead=document.getElementById('nw3d-hero-read');
/* a small isometric box (a by b by h units) with a lit top and a shaded side, so the key looks like the blocks on the stage */
function iso(col,a,b,h,u,ghost){
  var c30=.866*u,s30=.5*u,P=function(x,y,z){return [(x-y)*c30,(x+y)*s30-z*u]},pts=[],F=function(arr){return arr.map(function(q){return (q[0]-minX+1).toFixed(1)+','+(q[1]-minY+1).toFixed(1)}).join(' ')};
  var top=[P(0,0,h),P(a,0,h),P(a,b,h),P(0,b,h)],lf=[P(0,b,0),P(a,b,0),P(a,b,h),P(0,b,h)],rt=[P(a,0,0),P(a,b,0),P(a,b,h),P(a,0,h)];
  pts=top.concat(lf,rt);var minX=Math.min.apply(0,pts.map(function(q){return q[0]})),minY=Math.min.apply(0,pts.map(function(q){return q[1]})),maxX=Math.max.apply(0,pts.map(function(q){return q[0]})),maxY=Math.max.apply(0,pts.map(function(q){return q[1]}));
  var sh=function(k){return 'rgb('+col.map(function(v){return Math.round(k>1?v+(255-v)*(k-1):v*k)}).join(',')+')'},st=ghost?' fill="none" stroke="'+sh(1)+'" stroke-width="1" stroke-dasharray="2 2"':'';
  return '<svg aria-hidden="true" width="'+Math.ceil(maxX-minX+2)+'" height="'+Math.ceil(maxY-minY+2)+'">'
   +'<polygon points="'+F(lf)+'"'+(st||' fill="'+sh(.78)+'"')+'/><polygon points="'+F(rt)+'"'+(st||' fill="'+sh(.55)+'"')+'/><polygon points="'+F(top)+'"'+(st||' fill="'+sh(1.25)+'"')+'/></svg>'}
function keyHtml(U,ghost){var t=tok(document.getElementById('nw3d-hero-stage'),'teal');
  return '<span>'+iso(t,2.6,1,1,7)+'1 block = '+full(U)+'</span><span>'+iso(t,1,1,1,7)+'1 cube = '+full(U/10)+'</span>'+(ghost?'<span>'+iso(t,2.6,1,1,7,true)+'Forecast</span>':'<span>Nine cubes, then a block</span>')}

/* ── the scene: one column per asset class in its colour code; debts grouped by kind (owner, 30 Oct 2026): every credit card stacks in
 * one column, one on top of the other, each in its own card colour; loans, car finance, overdrafts and so on each get their own column ── */
var DEBT_KINDS={credit:['Credit cards','Credit cards'],personal:['Personal loans','Personal loans'],loan:['Loans','Loans'],student:['Student loans','Student loans'],car:['Car finance','Car finance'],bnpl:['Buy now pay later','Buy now pay later'],overdraft:['Overdrafts','Overdrafts'],mortgage:['Mortgage','Mortgage'],other:['Other debts','Other debts']};
function sceneData(){
  var st=document.getElementById('nw3d-hero-stage'),r=rate(),cols=[];
  function add(key,name,short,col,v,dir){cols.push({key:key,name:name,short:short,col:col,v:Math.max(0,v)*r,dir:dir})}
  var L=window.VI_LABELS||{};   /* the dashboard's own names on the floor (owner, 31 Oct) */
  var bizC=n(function(){return typeof alTotalBizCash==='function'?alTotalBizCash():0});
  add('cash',L.cash,L.cash,tok(st,'green'),n(alTotalCash)-bizC,1);
  if(bizC>0)add('bizcash','Business accounts','Business',tok(st,'orange'),bizC,1);
  add('deposit',L.deposit,L.deposit,tok(st,'teal'),n(function(){return state?state.saved:0}),1);
  add('stocks',L.stocks,L.stocks,tok(st,'green2'),n(alTotalStocks),1);
  add('metals',L.metals,L.metals,tok(st,'gold'),n(alTotalMetals),1);
  add('crypto',L.crypto,L.crypto,tok(st,'teal'),n(alTotalCrypto),1);
  add('inv',L.inv,L.inv,tok(st,'purple'),n(alTotalOther),1);
  var debts=((typeof debtState!=='undefined'&&debtState.debts)||[]).filter(function(d){return d.balance>0}).sort(function(a,b){return (b.balance-a.balance)||((+a.id||0)-(+b.id||0))});
  var ramp={};try{ramp=debtChartRamp(debts)||{}}catch(e){}
  var red=tok(st,'red'),pan=tok(st,'panel'),groups={},order=[];
  debts.forEach(function(d){
    var m=ramp[d.id]||{},col=m.brand?parseCol(m.c1):null;
    if(!col){var k=m.k!=null?m.k:1;col=red.map(function(c,j){return Math.round(pan[j]+(c-pan[j])*(.45+.55*k))})}
    var kind=DEBT_KINDS[d.type]?d.type:'other';if(!groups[kind]){groups[kind]={v:0,segs:[]};order.push(kind)}
    groups[kind].v+=+d.balance||0;groups[kind].segs.push({key:'debt'+d.id,name:d.name||'Debt',col:col,v:(+d.balance||0)*r});
  });
  order.sort(function(a,b){return groups[b].v-groups[a].v}).forEach(function(kind){var g=groups[kind],one=g.segs.length===1;
    add('debt:'+kind,one?g.segs[0].name:DEBT_KINDS[kind][0],DEBT_KINDS[kind][1],g.segs[0].col,g.v,-1);cols[cols.length-1].segs=one?null:g.segs});
  /* the debt columns stand right after the inventory cubes (owner, 31 Oct: the cards alongside the wealth inventory); the rest follow */
  add('liabval','Liabilities, value',L.liab,tok(st,'amber'),n(alLiabAssetTotal),1);
  add('owed',L.owed,L.owed,tok(st,'blue'),n(function(){return typeof alTotalOwedToMe==='function'?alTotalOwedToMe():0}),1);
  add('other','Other assets','Other assets',tok(st,'muted'),n(totalAssets),1);
  add('debtov','Debts added on the Overview','DEBTS',red,n(totalDebts),-1);
  add('running','Running costs so far','Running costs',tok(st,'amber'),n(alTotalLiab),-1);
  var net=n(computeNetWorth)*r,debtNow=(n(debtTotal)+n(totalDebts))*r;
  return {cols:cols,net:net,debt:debtNow,fmt:full};
}
var heroLast='',heroSummary='',prevNet=null,prevDebt=null;
var heroEng=E.makeNW(heroCv,{fps:E.coarse?30:60,fmt:full,onPick:function(c){heroRead.textContent=c?(c.name+(c.dir<0?', owed ':' ')+full(c.v)+(c.segs?': '+c.segs.map(function(s){return s.name+' '+full(s.v)}).join(' · '):'')):heroSummary}});
document.getElementById('nw3d-hero-stage').addEventListener('click',function(e){var b=e.target.closest('[data-z]');if(!b)return;
  if(b.dataset.z==='reset')heroEng.reset();else heroEng.zoom(b.dataset.z==='in'?1.25:.8)});
function refreshHero(){
  var d=sceneData(),sig=JSON.stringify([Math.round(d.net),Math.round(d.debt),d.cols.map(function(c){return [c.key,Math.round(c.v),c.col,c.segs?c.segs.map(function(x){return [x.key,Math.round(x.v),x.col]}):0]}),sym()]);
  if(sig===heroLast)return;heroLast=sig;
  var t=heroEng.setData(d),shown=d.cols.filter(function(c){return c.v>=.5});
  heroSummary='Own '+full(t.assets)+' · Owe '+full(t.debt)+' · Net worth '+full(d.net);heroRead.textContent=heroSummary;
  heroCv.setAttribute('aria-label','Net worth '+full(d.net)+'. What you own, '+full(t.assets)+', stands above the gold line in blocks. What you owe, '+full(t.debt)+', hangs below it. Drag to turn it, pinch or scroll to zoom, or use the + and - buttons.');
  document.getElementById('nw3d-hero-legend').innerHTML=shown.length?shown.map(function(c){var sw=function(col){return iso(col.map(Math.round),1,1,1,8).replace('<svg ','<svg data-col="rgb('+col.map(Math.round).join(',')+')" ')};
    if(c.segs)return '<span class="below stack">'+c.segs.map(function(s){return sw(s.col)}).join('')+esc(c.name)+' <b>-'+full(c.v)+'</b>'+c.segs.map(function(s){return '<em>'+esc(s.name)+' '+full(s.v)+'</em>'}).join('')+'</span>';
    return '<span class="'+(c.dir<0?'below':'above')+'">'+sw(c.col)+esc(c.name)+' <b>'+(c.dir<0?'-':'')+full(c.v)+'</b></span>'}).join(''):'<span>Add your savings, investments or debts and they will stack up here.</span>';
  document.getElementById('nw3d-hero-key').innerHTML=keyHtml(t.unit,false);
  /* something moves, a number changes, a line confirms: the stage flashes gold when net worth goes up, green when the last debt goes */
  if(prevNet!==null&&!E.reduceMotion()){var hs=document.getElementById('nw3d-hero-stage'),cls=prevDebt>0&&d.debt<=0?'flashg':(Math.round(d.net)>Math.round(prevNet)?'flash':'');
    if(cls){hs.classList.remove('flash','flashg');void hs.offsetWidth;hs.classList.add(cls)}
    if(cls==='flashg'&&typeof showToast==='function')showToast('Out of the red.')}
  prevNet=d.net;prevDebt=d.debt;
}

/* ── the tracker: 3D blocks of the main chart's own points ── */
var trkLast='';
/* the progress key names its three colours (owner, 31 Oct): net worth, debt, monthly income, then the block sizes */
function trkKey(s){var st=document.getElementById('nw3d-hero-stage'),out='';
  [['nw','teal','Net worth'],['debt','red','Debt'],['inc','gold','Monthly income']].forEach(function(x){if(!s.sel||s.sel[x[0]]!==false)out+='<span>'+iso(tok(st,x[1]),1,1,1,7)+x[2]+'</span>'});
  return out+keyHtml(s.unit,true)}
var trk=E.makeTracker(trkCv,{fps:30,fmt:full,onChange:function(s){
  tkey.innerHTML=trkKey(s);
  if(s.lab==null){trkRead.textContent=trkToday();return}
  var t=s.lab+(s.forecast?' (forecast)':'')+': net worth '+full(s.v.nw);
  if(s.sel.debt)t+=' · debt '+full(s.v.debt);if(s.sel.inc&&!s.forecast)t+=' · income '+full(s.v.inc)+'/mo';
  trkRead.textContent=t;
}});
function trkToday(){var d=trk.data&&trk.data();return d&&d.nw&&d.nw.length?'Today: net worth '+full(d.nw[d.today])+(d.sel.debt?' · debt '+full(d.debt[d.today]):''):''}
function trackerData(){
  var pts=(chartCv._points||[]).filter(function(p){return !p.synth}),m=chartState.metrics,proj=m.proj?(chartCv._proj||[]):[],r=rate();
  var d={labels:[],nw:[],debt:[],inc:[],today:pts.length-1,sel:{nw:!!m.nw,debt:!!m.debt,inc:!!m.income,fc:!!m.proj}};
  pts.forEach(function(p){d.labels.push(monthLab(p.month));d.nw.push(Math.round((+p.nw||0)*r));d.debt.push(Math.round((+p.debt||0)*r));d.inc.push(Math.round((+p.income||0)*r))});
  proj.forEach(function(p){d.labels.push(monthLab(p.month));d.nw.push(Math.round((+p.nw||0)*r));d.debt.push(Math.round((+p.debt||0)*r));d.inc.push(0)});
  return d;
}
function refreshTracker(force){fcSync();var d=trackerData();if(!d.nw.length)return;var sig=JSON.stringify(d);if(sig===trkLast&&!force)return;trkLast=sig;trk.setData(d);if(!trkRead.textContent||/^Today/.test(trkRead.textContent))trkRead.textContent=trkToday()}
function refresh(){try{refreshHero()}catch(e){console.warn('nw3d scene',e);heroLast=''}try{refreshTracker()}catch(e){console.warn('nw3d tracker',e);trkLast=''}}

/* ── the view switch: 3D first, Graph one tap away, the choice remembered on this device ── */
function getMain(){try{return localStorage.getItem('vi-nw-main')==='graph'?'graph':'3d'}catch(e){return '3d'}}
function curMain(){return chartCard.classList.contains('nw3d-main-3d')?'3d':'graph'}
function setMain(v,user){
  chartCard.classList.toggle('nw3d-main-3d',v==='3d');
  mseg.querySelectorAll('button').forEach(function(b){b.setAttribute('aria-pressed',b.getAttribute('data-m')===v?'true':'false')});
  if(ttl)ttl.textContent=v==='3d'?'Net worth in 3D':'Net worth over time';
  if(user){try{localStorage.setItem('vi-nw-main',v)}catch(e){}}
  try{drawChart();if(v==='3d'){refresh(true);if(heroEng.replay)heroEng.replay();}}catch(e){}
  try{window.dispatchEvent(new Event('resize'))}catch(e){}
}
mseg.addEventListener('click',function(e){var b=e.target.closest('button[data-m]');if(b)setMain(b.getAttribute('data-m'),true)});
setMain(getMain());

/* every redraw of the main chart (data, range, series, theme, currency) refreshes both 3D views */
var _draw=drawChart;
window.drawChart=drawChart=function(){var r=_draw.apply(this,arguments);refresh();return r};
function disable(){   // back to the classic card exactly as it was built
  hero.remove();mseg.remove();tcard.remove();hd.insertBefore(ttl,top);top.remove();
  wrap.classList.remove('nw3d-wrap');tip.classList.remove('nw3d-graph-only');
  [].forEach.call(chartCard.querySelectorAll('.nw3d-graph-only'),function(e){e.classList.remove('nw3d-graph-only')});
  chartCard.classList.remove('nw3d-main-3d');if(ttl)ttl.textContent='Net Worth Progress';
  window.drawChart=drawChart=_draw;delete window.nw3d;try{_draw();}catch(e){}
}
window.nw3d={iconFor:ViNW3D.nwIcon,timing:{dropMs:ViNW3D.timing.drop,flashMs:ViNW3D.timing.flash,stackMs:ViNW3D.timing.stack,stackStep:ViNW3D.timing.stackStep,budgetPileMs:ViNW3D.timing.pileMs,budgetGoMs:ViNW3D.timing.goMs},hero:heroEng,tracker:trk,setMain:setMain,main:curMain,sceneData:sceneData,trackerData:trackerData,refresh:refresh,disable:disable};
fcSync();
if(document.readyState==='complete')setTimeout(refresh,50);else window.addEventListener('load',function(){setTimeout(refresh,50)});
/* safety net (owner, 31 Oct: the scene was empty on opening the app again). A refresh is forced, and the stage kicked, a moment after
   load, when the page comes back from the background or the back-forward cache, and whenever the last draw found no data. */
function rescue(){heroLast='';trkLast='';refresh();try{heroEng.kick()}catch(e){}}
[600,1800,4500].forEach(function(ms){setTimeout(function(){if(!heroLast||!document.getElementById('nw3d-hero-cv').dataset.net)rescue();else try{heroEng.kick()}catch(e){}},ms)});
window.addEventListener('pageshow',function(e){if(e.persisted)rescue()});
document.addEventListener('visibilitychange',function(){if(!document.hidden)setTimeout(rescue,60)});
};
if(nw3dFlag())window.nw3dMount();
})();
/* ===== Budget: Flow | 3D on "Where your income flows" (owner, 31 Oct 2026) =====
 * 3D is a tree map of the same budget the flow chart draws: one area per group filled with £100 blocks (each line a run of blocks), coloured by
 * group, with what is not yet assigned as its own grey group. The choice is kept per device (vi-bd-view); Flow is the default. */
(function(){
var KEY='vi-bd-view',eng=null,sig='',cur='flow',dash=null,dsig='';   // eng = the Budget tab's tree map, dash = the dashboard Cash Flow tile's (always 3D, owner 3 Nov)
function el(id){return document.getElementById(id)}
/* the stage is always Night (tokens redefined inside it), so colours are read there */
function rgbIn(host,v){var sp=document.createElement('span');sp.style.color=v;sp.style.display='none';host.appendChild(sp);var m=(getComputedStyle(sp).color.match(/[\d.]+/g)||[0,0,0]);sp.remove();return [+m[0],+m[1],+m[2]]}
function data(stageId){
  var m=cfModel(),host=el(stageId||'bd3d-stage')||document.body;
  var groups=CF_GROUP_ORDER.map(function(g){return {key:g,label:CF_GROUPS[g].short,col:rgbIn(host,CF_GROUPS[g].col),items:(m.by[g]||[]).map(function(r){return {name:r.name,v:+r.amount||0}})}});
  if(m.overflow>0)groups.push({key:'un',label:'Unassigned',col:[138,147,166],items:[{name:'Unassigned',v:m.overflow}]});
  return {groups:groups,total:m.tIn,shortfall:m.shortfall,fmt:function(v){return gbpFmt(v)}};
}
function make(cvId,readId){
  if(!window.ViNW3D||!ViNW3D.makeTreeMap||!el(cvId))return null;
  var read=el(readId);
  var e=ViNW3D.makeTreeMap(el(cvId),{fmt:function(v){return gbpFmt(v)},onPick:function(p){if(!read)return;
    read.textContent=p?p.group+' · '+p.name+': '+gbpFmt(p.v)+' a month, '+Math.round(p.share*100)+'% of your income ('+p.blocks+' block'+(p.blocks===1?'':'s')+' of up to '+gbpFmt(p.unit)+')':readDefault()+(readId==='bd3d-read'?' · Tap or hover a block to read it, drag to turn it':'')}});
  /* zoom out / in / reset on every viewport (owner, 3 Nov: "add a zoom out function on each of the viewports") */
  var stage=el(cvId).parentNode;
  stage.addEventListener('click',function(ev){var b=ev.target.closest('[data-z]');if(!b)return;if(b.dataset.z==='reset')e.reset();else e.zoom(b.dataset.z==='in'?1.25:.8)});
  return e;
}
function ensure(){if(!eng)eng=make('bd3d-cv','bd3d-read');return eng}
function readDefault(){var m=cfModel();return m.tIn>0?'Income '+gbpFmt(m.tIn)+' a month'+(m.overflow>0?' · '+gbpFmt(m.overflow)+' not assigned yet':'')+(m.shortfall>0?' · spending is '+gbpFmt(m.shortfall)+' more than income':''):'Add your income and spending to see where every pound goes'}
function sigOf(d){return JSON.stringify(d.groups.map(function(g){return [g.key,g.items.map(function(i){return [i.name,i.v]})]}))+'|'+d.total}
function refresh(force){
  if(cur==='3d'&&ensure()){
    var d=data(),sg=sigOf(d);
    var read=el('bd3d-read');if(read&&!read.dataset.hold)read.textContent=readDefault()+' · Tap or hover a block to read it, drag to turn it';
    if(sg!==sig||force){sig=sg;eng.setData(d)}
  }
  if(!dash)dash=make('cf3d-cv','cf3d-read');
  if(dash){var d2=data('cf3d-stage'),s2=sigOf(d2),r2=el('cf3d-read');if(r2&&!r2.dataset.hold)r2.textContent=readDefault();if(s2!==dsig||force){dsig=s2;dash.setData(d2)}}
}
function show(v,user){
  cur=v==='3d'?'3d':'flow';var card=document.querySelector('.bd-sankey-card');
  if(el('bd-sankey'))el('bd-sankey').hidden=cur==='3d';if(el('bd-3d'))el('bd-3d').hidden=cur!=='3d';if(card)card.classList.toggle('bd-is-3d',cur==='3d');
  [].forEach.call(document.querySelectorAll('#bd-view button'),function(b){b.setAttribute('aria-pressed',b.dataset.v===cur?'true':'false')});
  if(user){try{localStorage.setItem(KEY,cur)}catch(e){}}
  if(cur==='3d'){var had=!!eng;refresh(true);if(had&&user&&eng)eng.replay();if(eng)eng.kick()}
  else{try{drawCashflowDiagram()}catch(e){}}
}
var _dcd=window.drawCashflowDiagram;if(typeof _dcd==='function'){window.drawCashflowDiagram=drawCashflowDiagram=function(){var r=_dcd.apply(this,arguments);try{refresh()}catch(e){console.warn('budget 3D',e)}return r}}
function init(){var seg=el('bd-view');if(!seg)return;
  seg.addEventListener('click',function(e){var b=e.target.closest('button[data-v]');if(b)show(b.dataset.v,true)});
  try{var bs=el('bd-sankey');if(bs&&window.ResizeObserver&&window.viCfZoom){var lw=0;new ResizeObserver(function(){if(bs.clientWidth!==lw){lw=bs.clientWidth;if(lw)viCfZoom(bs)}}).observe(bs)}}catch(e){}
  var fz=el('bd-fz');if(fz)fz.addEventListener('click',function(e){var b=e.target.closest('button[data-fz]');if(b&&window.viCfZoomBy)viCfZoomBy(b.dataset.fz)});
  var saved='flow';try{saved=localStorage.getItem(KEY)==='3d'?'3d':'flow'}catch(e){}show(saved,false);
  try{refresh(true)}catch(e){}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
window.bd3d={iconFor:ViNW3D.cfIcon,show:show,engine:function(){return eng},dashEngine:function(){return dash},data:data,view:function(){return cur}};
})();
</script>
