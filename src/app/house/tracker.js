// ═══════════════════════════════════════════════════════════════
// HOUSE TRACKER — VERBATIM from house-tracker.html
// ═══════════════════════════════════════════════════════════════
const DEFAULTS={terraced:200000,semi:320000,detached:500000,mansion:1500000,flat:80000,apartment:300000};
let state={saved:0,target:200000,houseType:'terraced',deposits:[],prices:{...DEFAULTS},apartmentFloor:5};
try{const s=localStorage.getItem('ht3');if(s){const p=JSON.parse(s);state={...state,...p};state.prices={...DEFAULTS,...(p.prices||{})};if(!state.apartmentFloor)state.apartmentFloor=5;}}catch(e){}
if(!(state.depositPct>0))state.depositPct=20;   // Level 1: deposit target as % of the first property's value (default 20%)
function save(){try{localStorage.setItem('ht3',JSON.stringify(state));}catch(e){}}
function depositTarget(){return Math.max(1,(+state.target||0)*((+state.depositPct||20)/100));}
function pct(){return Math.min(state.saved/depositTarget(),1);}


// House viewport globals (zoom and the expanded stage), shared by the 3D view and its controls. The SVG blueprint engine that lived
// here is gone (owner, 1 Nov 2026): the brand 3D build is the only house builder, with a still picture where 3D cannot run.
const _HZ_DEFAULT=1.2, _VX=335, _VY=255;
let _houseZoom=_HZ_DEFAULT;
let _panX=0, _panY=0, _viewAngle=0, _isExpanded=false;

function redraw(){
  if (hb3dOn() && hb3dRedraw()) return;
  hbStill();   // no 3D on this device (no WebGL, an old phone, or the 3D engine could not load): a still picture of the same house
}
// ── STILL PICTURE (owner, 1 Nov 2026): when the 3D cannot run, the user's house at its current build level, drawn once on a 2D canvas
// from the same brick plan as the 3D (same parts laid, brand colours, the paid line on Level 2). No three.js, works offline.
function hbStill(){
  var el=document.getElementById('house-scene'), cv=document.getElementById('hbStill'); if(!el||!cv)return;
  el.setAttribute('data-engine','still');
  var sm=hbSceneMode(); HB3DAPP.want=sm;
  var W=Math.max(1,el.clientWidth), H=Math.max(1,el.clientHeight); if(W<4||H<4)return;
  var m=(typeof HB3D!=='undefined'&&HB3D.build&&HB3D.brandPlan)?hb3dModel(sm.type==='custom'?state.houseType:sm.type, sm.floor):null;
  var key=[sm.mode,sm.type,sm.floor,(sm.p||0).toFixed(4),(sm.eq||0).toFixed(4),W,H,!!m].join('|'); if(cv._key===key)return; cv._key=key;
  var dpr=Math.min(2,window.devicePixelRatio||1); cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr);
  var g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0);
  var bg=g.createRadialGradient(W/2,H,0,W/2,H,Math.max(W,H)*1.1); bg.addColorStop(0,'#06242A'); bg.addColorStop(.45,'#00131A'); bg.addColorStop(1,'#080808');
  g.fillStyle=bg; g.fillRect(0,0,W,H);
  var standIn=hb3dOn()&&!(typeof HB3D!=='undefined'&&HB3D._failed);   // v0.7: the still also stands in while the 3D starts (no note then; the 3D takes over)
  var cap=document.getElementById('hb3d-cap'), note=standIn?'':'Still picture: 3D is not available on this device';
  if(!m){ g.fillStyle='rgba(182,216,214,.8)'; g.font='12px "Share Tech Mono",monospace'; g.fillText(note,14,22); if(cap)cap.textContent=''; return; }
  var P=HB3D.brandPlan(m), B=HB3D.BRAND_C||{}, L2=sm.mode==='equity'||sm.mode==='complete', p=sm.mode==='site'?0:(L2?1:sm.p);
  var V=HB3D.brandUnits(P,p), R=m.rows, Vc=L2?HB3D.brandColourUnits(P,sm.mode==='complete'?1:(sm.eq||0)):-1;   // Level 2: the equity share is in real colours
  // camera: from the front right and above, as the 3D opens
  var yaw=0.62, pit=0.5, Vx=Math.sin(yaw)*Math.cos(pit), Vy=Math.sin(pit), Vz=Math.cos(yaw)*Math.cos(pit);
  var rx=Math.cos(yaw), rz=-Math.sin(yaw), ux=-Math.sin(yaw)*Math.sin(pit), uy=Math.cos(pit), uz=-Math.cos(yaw)*Math.sin(pit);
  var bb=m.bounds, pts=[], k, i;
  for(k=0;k<8;k++){var x=k&1?bb.max[0]:bb.min[0], y=k&2?bb.max[1]:bb.min[1], z=k&4?bb.max[2]:bb.min[2]; pts.push([x*rx+z*rz, x*ux+y*uy+z*uz]);}
  var sx0=1e9,sx1=-1e9,sy0=1e9,sy1=-1e9; pts.forEach(function(q){sx0=Math.min(sx0,q[0]);sx1=Math.max(sx1,q[0]);sy0=Math.min(sy0,q[1]);sy1=Math.max(sy1,q[1]);});
  var sc=Math.min(W*0.78/(sx1-sx0||1), H*0.62/(sy1-sy0||1)), ox=W/2-sc*(sx0+sx1)/2, oy=H*0.55+sc*(sy0+sy1)/2;
  var PX=function(x,y,z){return [ox+sc*(x*rx+z*rz), oy-sc*(x*ux+y*uy+z*uz)];};
  // ground grid: 11 lines each way, strongest in the middle (as the 3D stage)
  var cx=(bb.min[0]+bb.max[0])/2, cz=(bb.min[2]+bb.max[2])/2, big=Math.max(bb.max[0]-bb.min[0],bb.max[2]-bb.min[2],6), E=big*1.25, sp=E/5;
  g.lineWidth=1;
  for(i=-5;i<=5;i++){var a=0.3*(1-Math.abs(i)/6.5); g.strokeStyle='rgba(68,192,185,'+a.toFixed(3)+')';
    var A=PX(cx+i*sp,0,cz-E),Bq=PX(cx+i*sp,0,cz+E),Cq=PX(cx-E,0,cz+i*sp),D=PX(cx+E,0,cz+i*sp); g.beginPath(); g.moveTo(A[0],A[1]); g.lineTo(Bq[0],Bq[1]); g.moveTo(Cq[0],Cq[1]); g.lineTo(D[0],D[1]); g.stroke();}
  // the laid parts, as lit boxes (top and the two faces towards the camera), far to near
  var Ld=[-0.45,0.7,0.55], ln=Math.hypot(Ld[0],Ld[1],Ld[2]); Ld=[Ld[0]/ln,Ld[1]/ln,Ld[2]/ln];
  var col=function(part){ if(part==='brick')return B.brick; if(part==='roof')return B.tile; if(part==='glass')return sm.mode==='complete'?B.glassLit:B.glass; if(part==='door')return sm.mode==='complete'?B.flash:B.door; if(part==='frame')return B.frame; if(part==='gold')return B.flash; return B.trim; };
  var items=[];
  m.batches.forEach(function(b,bi){
    var part=P.parts[bi]; if(part==='none')return;
    var ctx=part==='ctx', n=ctx?b.count:HB3D._lowerBound(P.rank[bi],V), pm=P.perm[bi], c=col(part)||[0.27,0.75,0.73], kc=ctx||Vc<0?0:HB3D._lowerBound(P.rank2[bi],Vc);
    for(var j=0;j<n;j++){var o=(ctx?j:pm[j])*10, xf=b.xf, cc=c;
      if(j<kc){var h=HB3D.brandColourOf(b,pm[j]); cc=[((h>>16)&255)/255*0.84+0.267*0.16,((h>>8)&255)/255*0.84+0.753*0.16,(h&255)/255*0.84+0.725*0.16];}   // real colour, subtle teal hue
      items.push([xf[o],xf[o+1],xf[o+2],xf[o+3],xf[o+4],xf[o+5],xf[o+6],xf[o+7],xf[o+8],cc,ctx?0.06:(part==='glass'?0.85:1)]);}
  });
  items.sort(function(a,b){return (a[0]*Vx+a[1]*Vy+a[2]*Vz)-(b[0]*Vx+b[1]*Vy+b[2]*Vz);});
  var face=[[0,1,0],[0,-1,0],[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]], tok=cv._tok=(cv._tok||0)+1, at=0;
  var drawSome=function(){
    if(cv._tok!==tok)return;
    var t0=performance.now();
    // depth slices of 256 parts, far to near; inside a slice the faces of one colour share one path and one fill (a software canvas
    // pays per fill, so this is what keeps an old phone quick)
    while(at<items.length&&performance.now()-t0<12){
      var end=Math.min(items.length,at+256), paths={}, order=[];
      for(;at<end;at++){
        var it=items[at], ax=it[6], ay=it[7], az=it[8], sa=Math.sin(ax),ca=Math.cos(ax),sb=Math.sin(ay),cb=Math.cos(ay),sg=Math.sin(az),cg=Math.cos(az);
        // R = Ry * Rz * Rx (Euler order YZX, as the 3D)
        var M=[cb*cg, sb*sa-cb*sg*ca, cb*sg*sa+sb*ca, sg, cg*ca, -cg*sa, -sb*cg, sb*sg*ca+cb*sa, cb*ca-sb*sg*sa];
        var hx=it[3]/2, hy=it[4]/2, hz=it[5]/2, c=it[9];
        for(var f=0;f<6;f++){
          var nl=face[f], nx=M[0]*nl[0]+M[1]*nl[1]+M[2]*nl[2], ny=M[3]*nl[0]+M[4]*nl[1]+M[5]*nl[2], nz=M[6]*nl[0]+M[7]*nl[1]+M[8]*nl[2];
          if(nx*Vx+ny*Vy+nz*Vz<=0.02)continue;
          var sh=0.5+0.5*Math.max(0,nx*Ld[0]+ny*Ld[1]+nz*Ld[2]);
          var key=Math.round(c[0]*sh*63)+','+Math.round(c[1]*sh*63)+','+Math.round(c[2]*sh*63)+','+it[10];
          var pth=paths[key]; if(!pth){pth=paths[key]=new Path2D();order.push(key);}
          var u=nl[1]?[1,0,0]:(nl[0]?[0,1,0]:[1,0,0]), w=nl[1]?[0,0,1]:(nl[0]?[0,0,1]:[0,1,0]);
          for(var q=0;q<4;q++){var s0=q<2?1:-1, s1=(q===0||q===3)?1:-1;
            var lx=(nl[0]+s0*u[0]+s1*w[0])*hx, ly=(nl[1]+s0*u[1]+s1*w[1])*hy, lz=(nl[2]+s0*u[2]+s1*w[2])*hz;
            var pt=PX(it[0]+M[0]*lx+M[1]*ly+M[2]*lz, it[1]+M[3]*lx+M[4]*ly+M[5]*lz, it[2]+M[6]*lx+M[7]*ly+M[8]*lz);
            if(q===0)pth.moveTo(pt[0],pt[1]); else pth.lineTo(pt[0],pt[1]);}
          pth.closePath();
        }
      }
      order.forEach(function(k){var v=k.split(','); g.globalAlpha=+v[3]; g.fillStyle='rgb('+Math.round(v[0]*255/63)+','+Math.round(v[1]*255/63)+','+Math.round(v[2]*255/63)+')'; g.fill(paths[k]);});
    }
    g.globalAlpha=1;
    if(at<items.length){setTimeout(drawSome,0);return;}
    // Level 2: the gold paid line round the house; Level 1: the gold slice at the course being laid
    var gy=sm.mode==='equity'&&Vc>0&&Vc<P.N+P.T?(Vc<=P.N?P.top[Vc-1]:P.tileTop[Math.min(P.T-1,Vc-P.N-1)]):(sm.mode==='build'&&p>0&&p<0.97?HB3D.brandStats(m,p).y:null);
    if(gy!=null){var m2=14*0.075, c1=PX(bb.min[0]-m2,gy,bb.min[2]-m2),c2=PX(bb.max[0]+m2,gy,bb.min[2]-m2),c3=PX(bb.max[0]+m2,gy,bb.max[2]+m2),c4=PX(bb.min[0]-m2,gy,bb.max[2]+m2);
      g.strokeStyle='rgba(232,197,106,.95)'; g.fillStyle='rgba(232,197,106,.11)'; g.lineWidth=1.2; g.beginPath(); g.moveTo(c1[0],c1[1]); g.lineTo(c2[0],c2[1]); g.lineTo(c3[0],c3[1]); g.lineTo(c4[0],c4[1]); g.closePath(); g.fill(); g.stroke();}
    var tag=sm.mode==='complete'?'MORTGAGE FREE':sm.mode==='equity'?'MORTGAGE '+(Math.floor((sm.paid||0)*1000)/10)+'% PAID · YOU OWN '+(Math.floor((sm.eq||0)*1000)/10)+'%':sm.mode==='site'?'YOUR PLOT':(p*100).toFixed(1)+'% OF DEPOSIT';
    g.font='600 13px "Share Tech Mono",monospace'; var tw=g.measureText(tag).width+18, tx=Math.max(14,Math.min(W-tw-14,W/2-tw/2)), ty=18;
    g.fillStyle='#E8C56A'; g.fillRect(tx,ty,tw,24); g.fillStyle='#1A1400'; g.fillText(tag,tx+9,ty+16);
    if(note){g.font='11px "Share Tech Mono",monospace'; g.fillStyle='rgba(182,216,214,.85)'; g.fillText(note,14,H-14);}
  };
  drawSome();
  if(cap){var st=HB3D.brandStats(m,p), nm=(m.name||'').replace(/^./,function(c){return c.toUpperCase();});
    cap.textContent=sm.mode==='site'?'':nm+' · '+(sm.mode==='build'?st.stage+' · ':'')+st.bricksLaid.toLocaleString('en-GB')+' / '+st.bricksTotal.toLocaleString('en-GB')+' bricks';}
}

function updateUI(){
  const p=pct();
  const _sym=window.VI_CURRENCY_SYMBOL||'£';
  try{hbtPaint();}catch(e){}   // the viewport chip and slates follow a restored or synced house type
  // the bar, stats and milestones live in the one Level 1 progress tile (hbRenderHUD), which Level 2 does not show (v0.8)
  var _q=function(id){return document.getElementById(id)||{style:{}};};
  _q('pbarFill').style.width=(p*100)+'%';
  _q('ppct').textContent=(p*100).toFixed(1)+'%';
  _q('savedAmt').textContent=gbpFmt(state.saved);
  _q('tgtAmt').textContent=gbpFmt(depositTarget())+' deposit';
  _q('stRemain').textContent=gbpFmt(Math.max(0,depositTarget()-state.saved));
  _q('stDeposit').textContent=gbpFmt(depositTarget());
  hbPaintMilestones(p);   // done / next / "£x to go" on the timeline
  const cap=document.getElementById('sceneCap');
  var purchasedBanner=document.getElementById('house-purchased-banner');
  var mortgageComplete=document.getElementById('house-mortgage-complete');
  var noDeposits=state.saved<=0&&(!state.deposits||state.deposits.length===0);
  if(noDeposits){cap.textContent='Set your deposit goal to break ground';}
  else if(state.houseMode==='purchased'&&state.mortgageBalance<=0){cap.textContent='🏠 Mortgage free: your home is fully yours!';}
  else if(state.houseMode==='purchased'){cap.textContent='🏠 In your home, mortgage tracker active';}
  else if(p===0)cap.textContent='Foundations being laid…';
  else if(p<.20)cap.textContent='Bricks going up, row by row…';
  else if(p<.40)cap.textContent='The walls are rising…';
  else if(p<.60)cap.textContent='Roof timbers in place…';
  else if(p<.80)cap.textContent='Tiling the roof…';
  else if(p<1)cap.textContent='Almost home, lights are on!';
  else cap.textContent='🎉 Deposit goal reached!';
  if(purchasedBanner)purchasedBanner.style.display=(p>=1&&!state.houseMode&&!noDeposits)?'block':'none';
  if(mortgageComplete)mortgageComplete.style.display=(state.houseMode==='purchased'&&state.mortgageBalance<=0)?'block':'none';
  var _bought=state.houseMode==='purchased',_ab=document.getElementById('btnAdd'),_al=document.getElementById('hb-lay'),_aa=document.getElementById('hb-add-amt'),_ai='<svg class="vi-ic" aria-hidden="true"><use href="#vi-brick-wall"/></svg> ';
  if(_ab)_ab.innerHTML=_ai+(_bought?'Pay off the mortgage':'Lay the bricks');if(_al)_al.setAttribute('aria-label',_bought?'Pay off your mortgage':'Lay the bricks');if(_aa)_aa.textContent=_bought?'Amount paid':'Amount to add to your deposit';var _si=document.getElementById('savingsInput');if(_si)_si.setAttribute('aria-label',_aa.textContent);
  const list=document.getElementById('logList');
  if(!state.deposits.length){list.innerHTML='<div style="font-size:max(.58rem,var(--vi-fs-2));color:rgb(var(--ink-rgb) / .18);text-align:center;padding:10px 0">No deposits yet</div>';}
  else list.innerHTML=(state.payments||[]).slice().reverse().slice(0,20).map(d=>`<div class="log-entry"><span>${d.date} · mortgage</span><span class="la">-${gbpFmt(Number(d.amount))}</span></div>`).join('')+[...state.deposits].reverse().slice(0,20).map(d=>`<div class="log-entry"><span>${d.date}${d.acct?hbDepLogChip(d.acct):''}</span><span class="la">+${gbpFmt(Number(d.amount))}</span></div>`).join('');
  renderHabitTracker();
  updateFloorSelector();
  redraw();
}

function gbpFull(n){var rate=window.VI_CURRENCY_RATE||1,sym=window.VI_CURRENCY_SYMBOL||'£',v=(isNaN(n)||n==null?0:n)*rate;return(v<0?'-':'')+sym+Math.round(Math.abs(v)).toLocaleString('en-GB');}   // the whole figure, no k or M (owner, 5 Nov: the slate price in full)
function updatePriceLabels(){
  Object.entries(state.prices).forEach(([t,pr])=>{const e=document.getElementById('pr-'+t);if(e)e.textContent=gbpFull(pr);});
}
function updatePriceInput(){document.getElementById('priceInput').value=state.prices[state.houseType]||'';}

function toast(msg){showToast(msg);}   // the house tracker's name for the shared toast (one timer, counted from when it is drawn)

function markHousePurchased(){if(viBlockEdit())return;
  state.houseMode='purchased';
  state.mortgageActive=true;
  // Loan = price − the deposit actually saved, always worked out afresh (an old balance from an earlier purchase or the calculator is never kept)
  state.mortgageBalance=Math.max(0,Math.round(state.target-state.saved));
  state.purchase={price:state.target,deposit:Math.round(state.saved),depositTarget:Math.round(depositTarget()),date:new Date().toISOString().slice(0,10)};
  state.payments=[];
  state.valuation=state.target;
  save();
  toast('🏠 Congratulations, welcome home!');
  try{setTimeout(function(){if(window.viFbMoment)viFbMoment('house')},6000)}catch(e){}
  updateUI();
  hbOpenMortgageEntry(true);   // Level 2 onboarding: the mortgage entered in about a minute (Octalysis doc, phase 2)
}

let prevP=0;
function checkMS(np){
  [{t:.01,m:'📋 1%: site cleared!'},{t:.05,m:'🧱 5%: foundation poured!'},{t:.15,m:'🏗 15%: ground floor walls up!'},{t:.30,m:'🧱 30%: ground floor complete!'},{t:.50,m:'🏗 50%: first floor up!'},{t:.65,m:'🏠 65%: roof structure going on!'},{t:.80,m:'🪟 80%: lights are on!'},{t:.90,m:'✨ 90%: almost there!'},{t:.95,m:'🎨 95%: final touches!'},{t:1,m:'🎉 100%: the house is yours!'}].forEach(x=>{if(prevP<x.t&&np>=x.t)toast(x.m);});
  prevP=np;
}

var _aptFloorT=null;
function setApartmentFloor(v){if(viBlockEdit())return;
  state.apartmentFloor=parseInt(v)||1;
  var fd=document.getElementById('floor-display');
  if(fd)fd.textContent='Floor '+state.apartmentFloor;
  // dragging the slider: label follows instantly, the building re-highlights once the thumb settles
  clearTimeout(_aptFloorT);_aptFloorT=setTimeout(function(){save();updateUI();},90);
}
function updateFloorSelector(){
  var el=document.getElementById('floor-selector-card');
  if(!el)return;
  var isFlat=state.houseType==='flat'||state.houseType==='apartment';
  el.style.display=isFlat?'block':'none';
  if(isFlat){
    var maxFloors=state.houseType==='flat'?10:30;
    var sl=document.getElementById('floor-slider');
    var ml=document.getElementById('floor-max-lbl');
    var fd=document.getElementById('floor-display');
    if(sl){sl.max=maxFloors;sl.value=Math.min(state.apartmentFloor||5,maxFloors);}
    if(ml)ml.textContent='Floor '+maxFloors;
    if(fd)fd.textContent='Floor '+(Math.min(state.apartmentFloor||5,maxFloors));
  }
}

document.getElementById('htypes').addEventListener('click',e=>{
  const b=e.target.closest('.hbtn');if(!b)return;
  document.querySelectorAll('.hbtn').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  state.houseType=b.dataset.type;
  state.target=state.prices[state.houseType];
  prevP=pct();
  updatePriceInput();
  updateMilestoneLabels();
  updateFloorSelector();
  save();updateUI();
  hbtPaint();hbtFill();setTimeout(hbtFill,700);   // the panel stays open: its status and snapshot follow the new house
});

// ── House type (v0.9.1 round 2, R12 to R15): the six types as Wealth Roadmap slates, a chip top right of the viewport,
//    a panel with the build status, compressed stat tiles and the slates to change type, and the same slates in onboarding.
//    Only where the choice is made moved: state.houseType, prices and target are stored exactly as before. ──
var HB_TYPES={terraced:['Terraced','starter'],semi:['Semi-detached','solid'],detached:['Detached','strong'],mansion:['Manor house','summit'],flat:['Small flat','starter'],apartment:['Apartment','solid']};
function hbTypeName(t){return (HB_TYPES[t]||HB_TYPES.terraced)[0];}
function hbTypeSlate(t,px,st){
  if(typeof wrTokSvg!=='function'||typeof WR_CARD==='undefined'||!WR_CARD)return '';
  var r=HB_TYPES[t]||HB_TYPES.terraced;return wrTokSvg({tier:r[1],st:st||'done',ic:'vi-ht-'+(HB_TYPES[t]?t:'terraced')},px);
}
function hbtPaint(){
  var t=(typeof state!=='undefined'&&state&&state.houseType)||'terraced',nm=hbTypeName(t);
  document.querySelectorAll('#htypes .hbtn').forEach(function(b){
    var on=b.dataset.type===t,ic=b.querySelector('.ico'),k=on?'on':'off';
    b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));
    if(ic&&ic.getAttribute('data-k')!==k){var h=hbTypeSlate(b.dataset.type,64,on?'next':'done');if(h){ic.innerHTML=h;ic.setAttribute('data-k',k);}}
  });
  document.querySelectorAll('#w-htypes .w-ht .ico').forEach(function(ic){if(!ic.firstChild)ic.innerHTML=hbTypeSlate(ic.parentNode.dataset.type,56,'done');});
  var c=document.getElementById('hbt-chip');
  if(c){var cn=document.getElementById('hbt-chip-nm'),ct=c.querySelector('.hbt-chip-tok');if(cn)cn.textContent=nm;c.setAttribute('aria-label','House type: '+nm+'. Open the snapshot and change it');
    if(ct&&ct.getAttribute('data-t')!==t){var s=hbTypeSlate(t,34,'done');if(s){ct.innerHTML=s;ct.setAttribute('data-t',t);}}}
  var ti=document.getElementById('hbt-title'),ht=document.querySelector('#hbt-pan .hbt-hd-tok');if(ti)ti.textContent=nm;
  if(ht&&ht.getAttribute('data-t')!==t){var s2=hbTypeSlate(t,52,'done');if(s2){ht.innerHTML=s2;ht.setAttribute('data-t',t);}}
}
// the build status and a compressed copy of the stat tiles under the viewport (R14): same values, same colour roles, no ids
function hbtFill(){
  var d=document.getElementById('hbt-pan');if(!d||d.classList.contains('hidden'))return;
  var esc=typeof cfEsc==='function'?cfEsc:function(x){return String(x);};
  var view=typeof hbView==='function'?hbView():1,L=(typeof HB_LEVELS!=='undefined'&&HB_LEVELS[view-1])||null,p=pct(),dt=depositTarget(),h='';
  h+='<div class="hbt-st-lv"><svg class="vi-ic" aria-hidden="true"><use href="#vi-level"/></svg><b>Level '+view+(L?' · '+esc(L.name):'')+'</b></div>';
  if(view===1){
    var RS=null;try{RS=hbRowStats();}catch(e){}
    h+='<div class="hbt-st-row">'+(RS?'Row <b>'+RS.row+'</b> of '+RS.n+' · ':'')+'<b>'+(p*100).toFixed(1)+'%</b> of your '+gbpFmt(dt)+' deposit</div>';
    var nx=(typeof MS_PCTS!=='undefined')?MS_PCTS.findIndex(function(q){return p<q/100;}):-1,ml=(typeof MS_LABELS!=='undefined'&&(MS_LABELS[state.houseType]||MS_LABELS.terraced))||[];
    h+='<div class="hbt-st-next">'+(nx<0?'Every milestone reached. Your deposit is funded.':'Next: <b>'+MS_PCTS[nx]+'%</b> · '+esc(hbNoEmoji(ml[nx]||''))+' · '+gbpFmt(Math.max(0,MS_PCTS[nx]/100*dt-(state.saved||0)))+' to go')+'</div>';
  }else h+='<div class="hbt-st-row">Bought. Your house is built and the keys are yours.</div>';
  var st=document.getElementById('hbt-status');if(st)st.innerHTML=h;
  var src=document.querySelector('#hb-hud .hb-stx'),box=document.getElementById('hbt-stats');
  if(box){if(src){var cl=src.cloneNode(true);cl.querySelectorAll('[id]').forEach(function(e){e.removeAttribute('id');});box.replaceChildren(cl);}else box.textContent='';}
}
function hbtKey(e){
  var d=document.getElementById('hbt-pan');if(!d||d.classList.contains('hidden'))return;
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();hbtClose();return;}
  if(e.key!=='Tab')return;   // keep focus inside the panel
  var f=[].slice.call(d.querySelectorAll('button:not([disabled])')),a=f[0],z=f[f.length-1];
  if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus();}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus();}
}
function hbtOpen(){
  var d=document.getElementById('hbt-pan');if(!d)return;
  if(d.parentNode!==document.body)document.body.appendChild(d);   // fixed to the screen, never inside a transformed tab
  d.classList.remove('hidden');hbtPaint();hbtFill();
  var c=document.getElementById('hbt-chip');if(c)c.setAttribute('aria-expanded','true');
  document.addEventListener('keydown',hbtKey,true);
  var x=document.getElementById('hbt-close');if(x)x.focus();
}
function hbtClose(){
  var d=document.getElementById('hbt-pan');if(!d||d.classList.contains('hidden'))return;
  d.classList.add('hidden');document.removeEventListener('keydown',hbtKey,true);
  var c=document.getElementById('hbt-chip');if(c){c.setAttribute('aria-expanded','false');c.focus();}
}
// onboarding (R15): the pick is held until "Start Vaulting"; its price shows as the target hint
var _wHouse=null;
function wPickHouse(b){
  _wHouse=b.dataset.type;
  document.querySelectorAll('#w-htypes .w-ht').forEach(function(x){var on=x===b;x.setAttribute('aria-pressed',String(on));x.classList.toggle('on',on);});
  var i=document.getElementById('w-house');
  if(i&&typeof state!=='undefined'&&state&&state.prices&&state.prices[_wHouse])i.placeholder='e.g. '+Math.round(state.prices[_wHouse]).toLocaleString('en-GB');   // in £, like the label (v0.95, tester 1)
}
// v0.95 (owner, 8 Nov): the onboarding asks for a Lifetime ISA or a savings account kept only for the house deposit, its value and its
// rate. The pot lands in the House Builder the way Lay the bricks records a deposit (the amount is all that counts; the account is a
// note, state.depAcct), and the House Builder's first open lays those bricks from the ground (vi_hb_entry: a display note, not data).
var _wPot=null;
function wPickPot(b){
  _wPot=b.dataset.pot;
  document.querySelectorAll('#w-pot-opts .welcome-opt').forEach(function(x){var on=x===b;x.setAttribute('aria-pressed',String(on));x.classList.toggle('selected',on);});
  var f=document.getElementById('w-pot-fields'),h=document.getElementById('w-pot-hint');if(h)h.hidden=true;
  if(f){f.hidden=_wPot==='none';if(!f.hidden){var v=document.getElementById('w-pot-value');if(v){v.style.borderColor='';setTimeout(function(){try{v.focus({preventScroll:true});}catch(e){}},50);}}}
}
function _wPotVal(){var v=document.getElementById('w-pot-value'),n=v?parseFloat(v.value):0;return isFinite(n)&&n>0?n:0;}
function _wPotCheck(){   // Next on the pot screen: a Yes needs the amount (the rate is optional); Not yet, or nothing picked, goes on
  if(!_wPot||_wPot==='none')return true;
  if(_wPotVal()>0){var r=document.getElementById('w-pot-rate'),rv=r&&r.value!==''?parseFloat(r.value):null;
    if(rv!==null&&!(isFinite(rv)&&rv>=0&&rv<=100)){showToast('Enter the rate as a percentage, for example 4.5');if(r)r.focus();return false;}return true;}
  var h=document.getElementById('w-pot-hint');if(h)h.hidden=false;
  var v=document.getElementById('w-pot-value');if(v){v.style.borderColor='var(--re)';try{v.focus({preventScroll:true});}catch(e){}}
  showToast('Enter how much is in it, or pick Not yet');return false;
}
function wPotSkip(){_wPot=null;var h=document.getElementById('w-pot-hint');if(h)h.hidden=true;wGo(_wzAt+1);}
function wPotToHouse(type,value,rateStr){
  if(!(value>0)||typeof state==='undefined'||!state)return false;
  var vBase=value,acct={type:type,name:''},r=parseFloat(rateStr);   // typed in £ on the welcome screens (its only caller), stored in £
  if(isFinite(r)&&r>=0&&r<=100)acct.rate=Math.round(r*100)/100;
  state.depAcct=acct;
  var dep={amount:vBase,date:new Date().toLocaleDateString('en-GB'),acct:{t:type,n:''}};if(acct.rate!=null)dep.acct.r=acct.rate;
  state.saved=(+state.saved||0)+vBase;if(!Array.isArray(state.deposits))state.deposits=[];state.deposits.push(dep);
  try{localStorage.setItem('vi_hb_entry','1');}catch(e){}   // money already put aside is not this week's saving habit, so no habit contribution (Pedro, 8 Nov)
  try{prevP=pct();save();updateUI();hbtPaint();}catch(e){}
  return true;
}
window.addEventListener('load',function(){try{hbtPaint();}catch(e){}});

document.getElementById('btnSP').addEventListener('click',()=>{
  if(viBlockEdit())return;
  const v=parseInt((document.getElementById('priceInput').value||'').replace(/,/g,''));
  if(!v||v<1000){toast('Enter a valid price');return;}
  const vBase=Math.round(v/(window.VI_CURRENCY_RATE||1));
  state.prices[state.houseType]=vBase;state.target=vBase;
  updatePriceLabels();save();updateUI();
  const sym=window.VI_CURRENCY_SYMBOL||'£';
  toast(`${state.houseType[0].toUpperCase()+state.houseType.slice(1)} price set to ${sym}${v.toLocaleString()}`);
});
document.getElementById('priceInput').addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('btnSP').click();});

function hbBrickLineUpdate(){
  var el=document.getElementById('hb-brick-line'),inp=document.getElementById('savingsInput');if(!el||!inp)return;
  var v=parseFloat(inp.value),bi=state.houseMode==='purchased'?null:hbBrickInfo();
  if(v>0&&!bi&&state.houseMode!=='purchased')window._hbHudWait=true;   // typed before the house model landed: hb3dModel fills the line in when it does
  if(!(v>0)||!bi||!(bi.perBrick>0)){el.textContent='';return;}
  var rate=window.VI_CURRENCY_RATE||1,sym=window.VI_CURRENCY_SYMBOL||'£',n=Math.floor(v/rate/bi.perBrick+1e-9);
  el.textContent=sym+v.toLocaleString('en-GB',{maximumFractionDigits:2})+' lays '+n.toLocaleString('en-GB')+(n===1?' brick':' bricks');
}
document.getElementById('btnAdd').addEventListener('click',()=>{
  if(viBlockEdit())return;
  const v=parseFloat(document.getElementById('savingsInput').value);
  if(!v||v<=0){toast('Enter a valid amount');return;}
  const vBase=v/(window.VI_CURRENCY_RATE||1);
  if(state.houseMode==='purchased'){if(!(+state.mortgageBalance>0)){toast('Your mortgage is already paid off');return;}hbPayMortgage(vBase);document.getElementById('savingsInput').value='';hbBrickLineUpdate();return;}
  const p0=pct();
  state.saved+=vBase;
  const _dep={amount:vBase,date:new Date().toLocaleDateString('en-GB')},_da=state.depAcct;
  if(_da&&_da.type){_dep.acct={t:_da.type,n:_da.name||''};if(_da.rate!=null)_dep.acct.r=_da.rate;}   // v0.9.1 E26: which account it went into (a note; the amount is all that counts)
  state.deposits.push(_dep);
  recordHabitContribution(vBase);
  const brand=hbBrandOn()&&!!hbBrickInfo();
  save();if(brand){prevP=pct();}else{checkMS(pct());}updateUI();
  document.getElementById('savingsInput').value='';hbBrickLineUpdate();
  const sym=window.VI_CURRENCY_SYMBOL||'£';
  if (!_isPro()) { showToast('Deposit saved! Upgrade to Pro to watch your house being built 🏗'); }
  else if (brand) { _hbEngaged=true; hbPop(hbBrandLaid(vBase, v.toLocaleString())); hbFlash(); hbBrandMS(p0, pct()); }   // 6.8: moves, counts, says
  else { toast(vBase<state.target*.005?`+${sym}${v.toLocaleString()}, brick by brick!`:`+${sym}${v.toLocaleString()} added!`); }
});

// ── HABIT TRACKER ──
function _isoWeekKey(date){
  var d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));
  d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));
  var ys=new Date(Date.UTC(d.getUTCFullYear(),0,1));
  var wk=Math.ceil((((d-ys)/86400000)+1)/7);
  return d.getUTCFullYear()+'-W'+String(wk).padStart(2,'0');
}
function getHabitPeriodKey(){
  var now=new Date();
  if(!state.habitMode||state.habitMode==='monthly'){
    return now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  }
  return _isoWeekKey(now);
}

function _buildHabitYearSel(){
  var sel=document.getElementById('habit-year-sel');
  if(!sel)return;
  var curY=new Date().getFullYear();
  var html='';
  for(var y=2026;y<=Math.max(2030,curY+2);y++){
    html+='<option value="'+y+'"'+(y===curY?' selected':'')+'>'+y+'</option>';
  }
  sel.innerHTML=html;
}

function recordHabitContribution(amount){if(viBlockEdit())return;
  if(!state.habitLog)state.habitLog=[];
  var key=getHabitPeriodKey();
  var existing=state.habitLog.find(function(h){return h.date===key;});
  if(existing){existing.amount=(existing.amount||0)+amount;}
  else{state.habitLog.push({date:key,contributed:true,amount:amount});}
  save();renderHabitTracker();
}

function toggleHabitMode(){
  state.habitMode=(!state.habitMode||state.habitMode==='monthly')?'weekly':'monthly';
  var btn=document.getElementById('habit-mode-btn');
  if(btn)btn.textContent=state.habitMode==='weekly'?'Weekly':'Monthly';
  save();renderHabitTracker();
}

function renderHabitTracker(){
  var circlesEl=document.getElementById('habit-circles');
  var streakEl=document.getElementById('habit-streak-label');
  var modeBtn=document.getElementById('habit-mode-btn');
  if(!circlesEl)return;

  var mode=state.habitMode||'monthly';
  if(modeBtn)modeBtn.textContent=mode==='weekly'?'Weekly':'Monthly';

  var sel=document.getElementById('habit-year-sel');
  if(sel&&!sel.options.length) _buildHabitYearSel();
  var selYear=sel?parseInt(sel.value)||new Date().getFullYear():new Date().getFullYear();

  var log=state.habitLog||[];
  var now=new Date();
  var currentKey=getHabitPeriodKey();

  // Build periods for 3 consecutive years starting from selYear
  function _buildPeriodsForYear(yr){
    var ps=[];
    if(mode==='monthly'){
      for(var m=1;m<=12;m++) ps.push(yr+'-'+String(m).padStart(2,'0'));
    } else {
      var wkSeen={};
      for(var wmo=0;wmo<12;wmo++){
        for(var wdy=1;wdy<=31;wdy++){
          var wtd=new Date(yr,wmo,wdy);
          if(wtd.getMonth()!==wmo) break;
          if(wtd.getDay()===4){
            var wkk=_isoWeekKey(wtd);
            if(!wkSeen[wkk]){wkSeen[wkk]=true;ps.push(wkk);}
          }
        }
      }
      ps.sort();
    }
    return ps;
  }

  // ── Streak: consecutive filled periods going backward from current ──
  var streak=0;
  var allBack=[];
  if(mode==='monthly'){
    var cy=now.getFullYear(),cm=now.getMonth()+1;
    for(var bi=0;bi<60;bi++){
      var bm=cm-bi,by=cy;
      while(bm<=0){bm+=12;by--;}
      if(by<2026) break;
      allBack.push(by+'-'+String(bm).padStart(2,'0'));
    }
  } else {
    for(var wi=0;wi<208;wi++){
      var wd2=new Date(now);wd2.setDate(now.getDate()-wi*7);
      var bwk=_isoWeekKey(wd2);
      if(parseInt(bwk.split('-W')[0])<2026) break;
      allBack.push(bwk);
    }
    var bseen={};allBack=allBack.filter(function(k){if(bseen[k])return false;bseen[k]=true;return true;});
  }
  for(var si=0;si<allBack.length;si++){
    var sk=allBack[si];
    var sEntry=(function(k){return log.find(function(h){return h.date===k;});})(sk);
    if(sk===currentKey){if(sEntry)streak++;continue;}
    if(sEntry){streak++;}else{break;}
  }

  if(streakEl)streakEl.textContent='🔥 '+streak+' '+(mode==='weekly'?'week':'month')+(streak!==1?'s':'')+' streak';

  var MONTH_SHORT=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var html='';

  // Show 3 consecutive years: selYear, selYear+1, selYear+2
  for(var yi=0;yi<3;yi++){
    var yr=selYear+yi;
    var periods=_buildPeriodsForYear(yr);

    // Year separator
    if(yi>0){
      html+='<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;margin:0 6px;flex-shrink:0">'
        +'<div style="width:1px;height:18px;background:rgb(var(--teal-rgb) / .2)"></div>'
        +'</div>';
    }
    // Year label
    html+='<div style="display:flex;flex-direction:column;align-items:center;margin-right:4px;flex-shrink:0">'
      +'<span style="font-size:var(--hy,.4rem);font-weight:700;letter-spacing:.08em;color:var(--em);font-family:\'Syne\',sans-serif;writing-mode:horizontal-tb;white-space:nowrap">'+yr+'</span>'
      +'</div>';

    for(var p=0;p<periods.length;p++){
      var pk=periods[p];
      var entry=(function(key){return log.find(function(h){return h.date===key;});})(pk);
      var isCurrent=pk===currentKey;
      var isFuture=pk>currentKey;
      var filled=!!entry;
      var cs='display:inline-flex;width:var(--hc,11px);height:var(--hc,11px);border-radius:50%;border:1.5px solid ';
      if(isFuture){cs+='rgba(90,96,104,0.12);background:rgba(90,96,104,0.03)';}
      else if(filled){cs+='rgba(68,192,185,0.9);background:rgba(68,192,185,0.75)';}
      else if(isCurrent){cs+='rgba(68,192,185,0.55);background:rgba(68,192,185,0.1);animation:pulse 1.5s infinite';}
      else{cs+='rgba(90,96,104,0.28);background:transparent';}
      var nextPk=periods[p+1];
      var nextEntry=nextPk?(function(k){return log.find(function(h){return h.date===k;});})(nextPk):null;
      var lineC=(filled&&nextEntry&&!isFuture)?'rgba(68,192,185,0.55)':'rgba(90,96,104,0.1)';
      var lbl=mode==='monthly'?MONTH_SHORT[parseInt(pk.slice(5))-1]:'W'+String(parseInt(pk.split('-W')[1]));
      html+='<div style="display:flex;flex-direction:column;align-items:center;gap:1px;flex-shrink:0">'
        +'<div style="'+cs+'" title="'+pk+(entry?' · £'+Math.round(entry.amount||0):'')+'"></div>'
        +'<span style="font-size:var(--hf,.32rem);color:var(--t3);font-family:\'Share Tech Mono\',monospace;white-space:nowrap">'+lbl+'</span>'
        +'</div>'
        +(p<periods.length-1?'<div style="width:var(--hl,2px);height:1px;background:'+lineC+';align-self:center;margin-bottom:12px;flex-shrink:0"></div>':'');
    }
  }
  circlesEl.innerHTML=html;
}
document.getElementById('savingsInput').addEventListener('input',hbBrickLineUpdate);
document.getElementById('savingsInput').addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('btnAdd').click();});

// Level 2 and 3 exist only after "I've bought it". These are the fields that step sets (markHousePurchased, Level 3).
function hbClearPurchase(){delete state.houseMode;delete state.mortgageActive;state.mortgageBalance=0;delete state.purchase;delete state.valuation;delete state.level3;delete state.viewLevel;delete state.payments;delete state.mortgage;}
function hbBackup(){try{localStorage.setItem('vi_bak_ht3',JSON.stringify({at:new Date().toISOString(),state:state}));}catch(e){}}
// Owner's Level 2 rule: what is left to pay after the deposit goal is the whole Level 2 house.
// £100,000 house, 20% goal: £80,000 is 100%, so £2,000 over the goal builds 2.5%.
function hbL2Base(){var pu=state.purchase||{},price=+pu.price||+state.valuation||+state.target||0,dtp=+pu.depositTarget||price*(+state.depositPct||0)/100;return Math.max(1,price-dtp);}
function hbL2Progress(){var bal=Math.max(0,+state.mortgageBalance||0),base=hbL2Base();return Math.min(1,Math.max(0,(base-bal)/base));}
// the share of the home you own: (value - mortgage balance) / value, deposit included. Level 2 lays this share of the bricks in full colour (owner, 1 Nov 2026)
function hbL2Own(){var pu=state.purchase||{},val=+state.valuation||+pu.price||+state.target||0,bal=Math.max(0,+state.mortgageBalance||0);return val>0?Math.min(1,Math.max(0,(val-bal)/val)):0;}
function hbPayMortgage(vBase){if(viBlockEdit())return;
  var before=Math.max(0,+state.mortgageBalance||0),paid=Math.min(before,vBase);
  state.mortgageBalance=Math.round((before-paid)*100)/100;
  (state.payments=state.payments||[]).push({amount:paid,date:new Date().toLocaleDateString('en-GB')});
  recordHabitContribution(paid);save();updateUI();
  var sym=window.VI_CURRENCY_SYMBOL||'£';
  toast(state.mortgageBalance<=0?'Mortgage paid off. The house is all yours!':'-'+sym+(paid*(window.VI_CURRENCY_RATE||1)).toLocaleString('en-GB',{maximumFractionDigits:2})+' off the mortgage');
}
function hbUndoPurchase(){if(viBlockEdit())return;
  if(state.houseMode!=='purchased')return;
  if(!confirm('Not bought yet? This takes the house back to Level 1 (saving for the deposit). Your savings log, house type, price and deposit % are kept.'))return;
  hbBackup();hbClearPurchase();prevP=0;save();updateUI();updateKPIs();toast('Back to Level 1: saving for your deposit');
}
document.getElementById('btnReset').addEventListener('click',()=>{
  if(!confirm('Reset the house builder? This clears your savings log and takes the house back to Level 1. Your house type, price and deposit % are kept.'))return;
  hbBackup();state.saved=0;state.deposits=[];hbClearPurchase();prevP=0;save();updateUI();updateKPIs();drawChart();toast('Tracker reset. Start saving!');
});

// ── HOUSE-TYPE MILESTONE LABELS ──────────────────────────────────
const MS_LABELS={
  terraced:['Site Cleared & Surveyed','Party Wall Foundation','Party Wall Agreement','Ground Floor Walls Up','First Floor Walls Up','Roof Timbers On','Tiling, Glazing & Rewire','Lights Are On!','Decorating & Fitting','Keys Are Yours! 🎉'],
  semi:    ['Site Cleared & Surveyed','Shared Foundation Poured','Party Wall Agreement','Ground Floor Up','First Floor Up','Side Return Structure','Roof Tiled & Glazed','Lights Are On!','Finishing Works','Keys Are Yours! 🎉'],
  detached:['Planning Approved','Foundations Poured','Groundwork Complete','Ground Floor Walls Up','Bay Window Frame In','First Floor Complete','Roof Structure Up','Lights Are On!','Garage & Driveway Done','Keys Are Yours! 🎉'],
  mansion:   ['Estate Grounds Cleared','Central Foundation','Wing Foundations Laid','Ground Floor Rising','Wings Fully Framed','Central Block Complete','Portico Columns Up','Turrets & Battlements','Grand Interiors Fitted','Estate Is Yours! 🎉'],
  flat:      ['Site Surveyed','Foundations Poured','Structure Up','Mid-Floor Slab In','Walls & Windows','Roof & Weathered In','Fit-Out Started','Plastering & Wiring','Decoration Done','Keys Are Yours! 🎉'],
  apartment: ['Planning & Site Clear','Pile Foundations','Ground Floor Slab','Floors 1–3 Rising','Floor 4–5 Topped Out','Glazing & Cladding','MEP Fit-Out','Interiors & Finishes','Building Control Sign-Off','Keys Are Yours! 🎉']
};
const MS_IDS=['1','5','15','30','50','65','80','90','95','100'];
const MS_PCTS=[1,5,15,30,50,65,80,90,95,100];
// v0.9.1 E9 (owner, 3 Nov: "these milestones should link into the gamification wealth roadmap. So add XP and stuff"): each milestone
// pays Wealth Roadmap XP once (owner's Q4: 20 rising to 200, 300 for "Keys are yours"). Game points, not money.
const HB_MS_XP=[20,40,60,80,100,125,150,175,200,300];

