// ── SCAFFOLDING HELPER ────────────────────────────────────────

// ── DEBT CHARTS ───────────────────────────────────────────────
// ── Theme colours for canvas drawing (canvas cannot read CSS variables) ──
function viCss(name){try{return getComputedStyle(document.documentElement).getPropertyValue('--'+name).trim()||'#888';}catch(e){return '#888';}}
function viRgba(name,a){var v=viCss(name+'-rgb');return v&&v!=='#888'?'rgb('+v+' / '+a+')':viCss(name);}
function viLight(){return document.documentElement.getAttribute('data-theme')==='light';}
// ── Daylight: swap Night colours in generated SVG / canvas strings. Backgrounds and greys always; brand hues only where asked. No-op in Night. ──
var VI_DAY_BASE={'030810':'e6f1f0','060d16':'e6f1f0','050c14':'dad8d0','0d1520':'dad8d0','0a121e':'dad8d0','0d1f1f':'eaf2f1','1a2a2a':'d9e7e6',
  'e9f1f1':'0b1f22','cfe9e7':'0b1f22','dfe6ec':'0b1f22','dfe6ea':'0b1f22','d8dfe5':'0b1f22','f1f4f6':'0b1f22','c5ced6':'3a5052','c9d6e3':'3a5052',
  'b9c4cf':'3a5052','8fb4b1':'3a5052','8f9bab':'3a5052','8fa3b5':'3a5052','8b97a3':'4e5b5d','7d8793':'4e5b5d','6b7780':'4e5b5d','6b8197':'4e5b5d','8a93a6':'4e5b5d','d4c5a9':'3a5052','f1d98b':'60480b'};
var VI_DAY_BRAND={'44c0b9':'185550','38a09a':'185550','c9a84c':'5b4a19','e8c56a':'60480b','3ecf8e':'135738','3fb585':'1c563e','9b7ec8':'583f81','e0894a':'773c11',
  'e05c5c':'951919','e8a23c':'6b4303','f59e0b':'6b4303','64b5f6':'054e88','e5535f':'911d3a','ee7d7d':'7e3532','f5dc4a':'584c04'};
var VI_DAY_RGB={'10,18,30':'218,216,208','6,12,22':'211,204,180','4,10,14':'218,216,208','6,18,32':'234,242,241','2,4,8':'200,222,220',
  '154,160,166':'78,91,93','110,120,132':'58,80,82','125,135,147':'78,91,93','90,96,104':'78,91,93','150,160,170':'58,80,82','140,150,160':'58,80,82','232,232,232':'11,31,34'};
var VI_DAY_RGB_BRAND={'68,192,185':'24,85,80','201,168,76':'91,74,25','224,92,92':'149,25,25','62,207,142':'19,87,56','232,197,106':'96,72,11','200,168,64':'91,74,25','232,162,60':'107,67,3'};
function viDay(str,brand){
  if(!str||typeof VI_DAY_BASE==='undefined'||!VI_DAY_BASE||!viLight())return str;
  str=String(str).replace(/#([0-9a-f]{6})/gi,function(m,h){h=h.toLowerCase();var d=VI_DAY_BASE[h]||(brand!==false&&VI_DAY_BRAND[h]);return d?'#'+d:m;});
  return str.replace(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g,function(m,r,g,b){var k=r+','+g+','+b,d=VI_DAY_RGB[k]||(brand!==false&&VI_DAY_RGB_BRAND[k]);return d?m.replace(k,d).replace(/\s/g,''):m;});
}
// debt charts: a red ramp, the largest debt strongest (issuer colours stay on the card artwork only)
function debtChartRamp(debts){
  var tok=function(n){var v=viCss(n+'-rgb').split(/[\s,]+/).map(Number);return v.length===3&&v.every(function(x){return x>=0;})?v:[128,128,128];};
  var hex=function(h){h=String(h).replace('#','');if(h.length===3)h=h.replace(/./g,'$&$&');return [0,2,4].map(function(k){return parseInt(h.substr(k,2),16)||0;});};
  var lum=function(c){var l=c.map(function(v){v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*l[0]+.7152*l[1]+.0722*l[2];};
  var cr=function(a,b){var x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
  var fgFor=function(c){var L=lum(c);return (L+.05)/0.062>1.05/(L+.05)?'#0B1F22':'#FFFFFF';};   // ink or white, whichever reads better
  var red=tok('red'),pan=tok('panel'),map={};
  var list=(debts||[]).filter(function(d){return d.balance>0;}).sort(function(a,b){return (b.balance-a.balance)||((+a.id||0)-(+b.id||0));});
  var plain=[];
  list.forEach(function(d){
    var b=null;try{b=ccBrand(d);}catch(e){}
    if(!(b&&b.g)){plain.push(d);return;}
    var c1=b.g[0],c2=b.g[1],lo=cr(hex(c1),pan)<1.6;
    if(lo&&b.acc){c1=b.acc;c2=b.g[0];lo=cr(hex(c1),pan)<1.6;}     // near-black cards (HSBC, Capital One) show their accent
    map[d.id]={c1:c1,c2:c2,fg:fgFor(hex(c1)),brand:b.n,edge:lo};   // edge: draw a hairline where the colour is close to the panel
  });
  var mix=function(t){return red.map(function(c,k){return Math.round(pan[k]+(c-pan[k])*t);});};
  plain.forEach(function(d,i){
    var k=plain.length>1?1-0.6*i/(plain.length-1):1,a=mix(k),b2=mix(k*0.75);
    map[d.id]={c1:'rgb('+a.join(',')+')',c2:'rgb('+b2.join(',')+')',fg:fgFor(a),k:k};
  });
  return map;
}
// each debt keeps the colours of its credit card (issuer brand); other debts get a palette colour
function debtPalette(d){
  var b=null;try{b=ccBrand(d);}catch(e){}
  if(b&&b.g)return{c1:b.g[0],c2:b.g[1],fg:b.fg||'#fff'};
  var k=Math.abs(+d.id||0)%DEBT_PAL.length,pl=DEBT_PAL[k];
  return{c1:pl[0],c2:pl[1],fg:'#fff'};
}
function debtChartSize(){return window.innerWidth>=900?Math.round(Math.max(260,Math.min(480,window.innerHeight*0.4))):210;}
function drawDebtHistogram(){
  var canvas=document.getElementById('debt-bar-chart');
  if(!canvas)return;
  var debts=debtState.debts.filter(function(d){return d.balance>0;});
  var dpr=window.devicePixelRatio||1;
  var W=canvas.parentElement?canvas.parentElement.clientWidth-(parseFloat(getComputedStyle(canvas.parentElement).paddingLeft)||0)*2:canvas.offsetWidth;
  if(!(W>80))W=canvas.offsetWidth;
  if(!(W>80))return;   // tab not on screen yet: it is redrawn when shown
  var H=debtChartSize();
  var _bw=Math.round(W*dpr),_bh=Math.round(H*dpr);if(canvas.width!==_bw||canvas.height!==_bh){canvas.width=_bw;canvas.height=_bh;}
  canvas.style.width=W+'px';canvas.style.height=H+'px';
  var ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,W,H);
  var fs=Math.max(9,Math.min(15,W/62));
  if(!debts.length){
    ctx.fillStyle='rgba(90,96,104,0.5)';ctx.font=fs*1.3+"px 'DM Sans',sans-serif";ctx.textAlign='center';
    ctx.fillText('No active debts',W/2,H/2);return;
  }
  var sorted=[].concat(debts).sort(function(a,b){return b.balance-a.balance;});
  var maxB=sorted[0].balance||1;
  var pad={l:fs*4.2,r:10,t:fs*2.6,b:fs*4.4};
  var bW=(W-pad.l-pad.r)/sorted.length;
  ctx.save();ctx.strokeStyle=viRgba('ink',.06);ctx.lineWidth=1;
  for(var gi=0;gi<=4;gi++){
    var gy=pad.t+(H-pad.t-pad.b)*(gi/4);
    ctx.beginPath();ctx.moveTo(pad.l,gy);ctx.lineTo(W-pad.r,gy);ctx.stroke();
    ctx.fillStyle='rgba(140,150,160,0.7)';ctx.font=fs*0.85+"px 'Share Tech Mono',monospace";ctx.textAlign='right';
    ctx.fillText('£'+Math.round(maxB*(1-gi/4)/100)/10+'k',pad.l-6,gy+fs*0.3);
  }
  ctx.restore();
  var ramp=debtChartRamp(sorted);
  sorted.forEach(function(d,i){
    var pal=ramp[d.id];
    var bH=((d.balance/maxB)*(H-pad.t-pad.b));
    var bww=Math.min(bW*0.74,fs*9),bx=pad.l+i*bW+(bW-bww)/2,by=H-pad.b-bH;
    var g=ctx.createLinearGradient(0,by,0,by+bH);g.addColorStop(0,pal.c1);g.addColorStop(1,pal.c2);
    var orig=d.original||d.total||d.balance,paidPct=orig>0?Math.max(0,1-d.balance/orig):0;
    // the part already paid off stays as a ghost on top of the bar
    if(paidPct>0.005){var ghostH=bH*paidPct/Math.max(0.001,1-paidPct);
      ctx.save();ctx.strokeStyle=pal.c1;ctx.globalAlpha=0.55;ctx.setLineDash([4,3]);ctx.lineWidth=1.2;ctx.strokeRect(bx+.5,by-ghostH+.5,bww-1,ghostH-1);ctx.fillStyle=pal.c1;ctx.globalAlpha=0.08;ctx.fillRect(bx,by-ghostH,bww,ghostH);ctx.restore();}
    ctx.fillStyle=g;
    ctx.beginPath();var r=Math.min(6,bww/4);ctx.moveTo(bx,by+bH);ctx.lineTo(bx,by+r);ctx.quadraticCurveTo(bx,by,bx+r,by);ctx.lineTo(bx+bww-r,by);ctx.quadraticCurveTo(bx+bww,by,bx+bww,by+r);ctx.lineTo(bx+bww,by+bH);ctx.closePath();ctx.fill();if(pal.edge){ctx.strokeStyle=viRgba('ink',.35);ctx.lineWidth=1;ctx.stroke();}
    ctx.fillStyle='rgba(255,255,255,.14)';ctx.fillRect(bx,by,bww*0.28,bH);
    ctx.fillStyle=viCss('text');ctx.font='bold '+fs+"px 'Share Tech Mono',monospace";ctx.textAlign='center';
    ctx.fillText(gbpFmt(d.balance),bx+bww/2,by-fs*0.5);
    if(d.rate){ctx.fillStyle=pal.c1;ctx.font=fs*0.82+"px 'Share Tech Mono',monospace";ctx.fillText(d.rate+'% APR',bx+bww/2,by-fs*1.55);}
    ctx.fillStyle=viCss('muted');ctx.font=fs*0.95+"px 'DM Sans',sans-serif";ctx.textAlign='center';
    var nm=String(d.name),mx=Math.max(8,Math.floor(bW/(fs*0.55)));
    ctx.fillText(nm.length>mx?nm.slice(0,mx-1)+'…':nm,bx+bww/2,H-pad.b+fs*1.5);
  });
}

function drawDebtDonut(){
  var canvas=document.getElementById('debt-donut-chart');
  try{drawDebtTreemap();}catch(e){}   // the tree map has its own card above and always shows (owner, 31 Oct)
  if(!canvas)return;
  var debts=debtState.debts.filter(function(d){return d.balance>0;});
  var dpr=window.devicePixelRatio||1;
  var W=canvas.parentElement?canvas.parentElement.clientWidth-(parseFloat(getComputedStyle(canvas.parentElement).paddingLeft)||0)*2:canvas.offsetWidth;
  if(!(W>80))W=canvas.offsetWidth;
  if(!(W>80))return;   // tab not on screen yet: it is redrawn when shown
  var H=debtChartSize();
  canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);
  canvas.style.width=W+'px';canvas.style.height=H+'px';
  var ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
  ctx.clearRect(0,0,W,H);
  var total=debts.reduce(function(s,d){return s+d.balance;},0);
  var fs=Math.max(9,Math.min(15,W/50));
  if(!total){
    ctx.fillStyle='rgba(90,96,104,0.5)';ctx.font=fs*1.3+"px 'DM Sans',sans-serif";ctx.textAlign='center';
    ctx.fillText('Debt free!',W/2,H/2);return;
  }
  var legendW=W>560?Math.min(W*0.42,260):0;
  var cx=(W-legendW)/2,cy=H/2,r=Math.min(cx,cy)*0.92,inner=r*0.58;
  var angle=-Math.PI/2,ramp=debtChartRamp(debts);
  debts.forEach(function(d){
    var pal=ramp[d.id],slice=(d.balance/total)*Math.PI*2;
    var mid=angle+slice/2,g=ctx.createLinearGradient(cx+Math.cos(mid)*inner,cy+Math.sin(mid)*inner,cx+Math.cos(mid)*r,cy+Math.sin(mid)*r);
    g.addColorStop(0,pal.c2);g.addColorStop(1,pal.c1);
    ctx.beginPath();ctx.arc(cx,cy,r,angle,angle+slice);ctx.arc(cx,cy,inner,angle+slice,angle,true);ctx.closePath();
    ctx.fillStyle=g;ctx.fill();ctx.strokeStyle=viCss('panel');ctx.lineWidth=2;ctx.stroke();
    if(pal.edge){ctx.strokeStyle=viRgba('ink',.35);ctx.lineWidth=1;ctx.stroke();}
    angle+=slice;
  });
  ctx.fillStyle=viCss('text');ctx.font='bold '+Math.max(13,r*0.2)+"px 'Share Tech Mono',monospace";ctx.textAlign='center';
  ctx.fillText(gbpFmt(total),cx,cy+fs*0.3);
  ctx.fillStyle=viCss('muted');ctx.font=fs*0.9+"px 'DM Sans',sans-serif";
  ctx.fillText('total debt',cx,cy+fs*1.6);
  // legend: swatches carry each card's colours
  var items=debts.slice().sort(function(a,b){return b.balance-a.balance;});
  if(legendW){
    var lx=W-legendW+8,ly=Math.max(fs*1.6,(H-items.length*fs*2.1)/2);
    items.forEach(function(d,i){
      var pal=ramp[d.id],y=ly+i*fs*2.1,g=ctx.createLinearGradient(lx,y,lx+fs*1.6,y+fs*1.1);g.addColorStop(0,pal.c1);g.addColorStop(1,pal.c2);
      ctx.fillStyle=g;ctx.fillRect(lx,y-fs*0.85,fs*1.6,fs*1.1);
      ctx.fillStyle=viCss('text');ctx.font=fs+"px 'DM Sans',sans-serif";ctx.textAlign='left';
      var nm=String(d.name);ctx.fillText((nm.length>16?nm.slice(0,15)+'…':nm),lx+fs*2.1,y);
      ctx.fillStyle=viCss('muted');ctx.font=fs*0.88+"px 'Share Tech Mono',monospace";ctx.fillText(Math.round(d.balance/total*100)+'% · '+gbpFmt(d.balance),lx+fs*2.1,y+fs*0.95);
    });
  }
}
// ── tree map: every debt a square sized by what is owed, in its own card colours ──
function dtmSquarify(items,x,y,w,h){   // items: [{v,d}] sorted desc; returns [{d,x,y,w,h}]
  var out=[],total=items.reduce(function(a,i){return a+i.v;},0);if(total<=0)return out;
  var rest=items.map(function(i){return{v:i.v/total*w*h,d:i.d};});
  function worst(row,side){var s=row.reduce(function(a,r){return a+r.v;},0),mx=Math.max.apply(null,row.map(function(r){return r.v;})),mn=Math.min.apply(null,row.map(function(r){return r.v;}));return Math.max(side*side*mx/(s*s),s*s/(side*side*mn));}
  while(rest.length){
    var side=Math.min(w,h),row=[rest[0]],k=1;
    while(k<rest.length&&worst(row.concat([rest[k]]),side)<=worst(row,side)){row.push(rest[k]);k++;}
    var s=row.reduce(function(a,r){return a+r.v;},0);
    if(w>=h){var rw=s/h,yy=y;row.forEach(function(r){var rh=r.v/rw;out.push({d:r.d,x:x,y:yy,w:rw,h:rh});yy+=rh;});x+=rw;w-=rw;}
    else{var rh2=s/w,xx=x;row.forEach(function(r){var rw2=r.v/rh2;out.push({d:r.d,x:xx,y:y,w:rw2,h:rh2});xx+=rw2;});y+=rh2;h-=rh2;}
    rest=rest.slice(row.length);
  }
  return out;
}
function drawDebtTreemap(){
  var el=document.getElementById('debt-treemap');if(!el)return;
  var debts=debtState.debts.filter(function(d){return d.balance>0;}).sort(function(a,b){return b.balance-a.balance;});
  var W=el.parentElement.clientWidth-(parseFloat(getComputedStyle(el.parentElement).paddingLeft)||0)*2;
  if(!(W>80))return;
  var H=debtChartSize();
  el.style.height=H+'px';el.style.width=W+'px';
  if(!debts.length){el.innerHTML='<div class="dtm-empty">Debt free!</div>';return;}
  var total=debts.reduce(function(a,d){return a+d.balance;},0),gap=3;
  var ramp=debtChartRamp(debts);
  var cells=dtmSquarify(debts.map(function(d){return{v:d.balance,d:d};}),0,0,W,H);
  el.innerHTML=cells.map(function(c){
    var pal=ramp[c.d.id],sm=c.w-gap<56||c.h-gap<56,big=!sm&&c.w>110&&c.h>70,mid=!sm&&c.w>70&&c.h>46,pct=Math.round(c.d.balance/total*100);   // sm: under 56 px a side, no text; name and amount show in a chip on tap or hover
    return '<div class="dtm-cell'+(sm?' dtm-sm" tabindex="0" data-n="'+ccEsc(c.d.name)+'" data-v="'+ccEsc(gbpFmt(c.d.balance))+'"':'"')+' title="'+ccEsc(c.d.name)+' · '+gbpFmt(c.d.balance)+' ('+pct+'%) · '+(+c.d.rate||0)+'% APR" style="left:'+(c.x+gap/2)+'px;top:'+(c.y+gap/2)+'px;width:'+(c.w-gap)+'px;height:'+(c.h-gap)+'px;background:linear-gradient(135deg,'+pal.c1+','+pal.c2+');color:'+pal.fg+(pal.edge?';outline:1px solid rgb(var(--ink-rgb) / .3);outline-offset:-1px':'')+'">'
      +(mid?'<b class="dtm-n">'+ccEsc(c.d.name)+'</b>':'')
      +(mid?'<span class="dtm-v">'+gbpFmt(c.d.balance)+'</span>':'')
      +(big?'<span class="dtm-s">'+pct+'% of debt · '+(+c.d.rate||0)+'% APR</span>':'')
      +'</div>';
  }).join('')+'<div class="dtm-tip" aria-live="polite" hidden></div>';
  if(!el._dtmTip){el._dtmTip=1;   // one set of listeners per tree map
    el.addEventListener('pointerover',function(e){if(e.pointerType==='mouse')dtmTip(el,e.target.closest('.dtm-sm'));});
    el.addEventListener('pointerleave',function(e){if(e.pointerType==='mouse')dtmTip(el,null);});
    el.addEventListener('click',function(e){dtmTip(el,e.target.closest('.dtm-sm'));});
    el.addEventListener('focusin',function(e){dtmTip(el,e.target.closest('.dtm-sm'));});
    el.addEventListener('focusout',function(){dtmTip(el,null);});
  }
}
function dtmTip(el,c){   // the small-tile chip: name and amount, kept inside the tree map
  var t=el.querySelector('.dtm-tip');if(!t)return;
  if(!c){t.hidden=true;return;}
  t.innerHTML='<b>'+ccEsc(c.getAttribute('data-n'))+'</b><span>'+ccEsc(c.getAttribute('data-v'))+'</span>';t.hidden=false;
  var W=el.clientWidth,x=c.offsetLeft+c.offsetWidth/2-t.offsetWidth/2,y=c.offsetTop-t.offsetHeight-4;
  if(y<2)y=Math.min(c.offsetTop+c.offsetHeight+4,el.clientHeight-t.offsetHeight-2);
  t.style.left=Math.max(2,Math.min(W-t.offsetWidth-2,x))+'px';t.style.top=Math.max(2,y)+'px';
}
function setDebtView(v){try{localStorage.setItem('vi_debt_view',v);}catch(e){}if(v==='donut')setDebtChart('donut');else drawDebtTreemap();}   // older callers
// the pay-off tile: Histogram or Donut (the tree map is always shown above); choice remembered on this device
function setDebtChart(c){
  c=(c==='break'||c==='donut')?'donut':'hist';try{localStorage.setItem('vi_debt_chart',c);}catch(e){}
  var w=document.getElementById('debt-charts');if(w)w.setAttribute('data-chart',c);
  [['hist','debt-chart-hist'],['donut','debt-chart-donut']].forEach(function(x){var b=document.getElementById(x[1]);if(b){b.classList.toggle('on',x[0]===c);b.setAttribute('aria-selected',x[0]===c?'true':'false');}});
  if(c==='hist'){drawDebtHistogram();try{drawDebtTreemap();}catch(e){}}else drawDebtDonut();
}
setTimeout(function(){try{var c=localStorage.getItem('vi_debt_chart');if(c==='donut'||c==='donut'){var w=document.getElementById('debt-charts');if(w)w.setAttribute('data-chart','donut');var h=document.getElementById('debt-chart-hist'),b=document.getElementById('debt-chart-donut');if(h){h.classList.remove('on');h.setAttribute('aria-selected','false');}if(b){b.classList.add('on');b.setAttribute('aria-selected','true');}}}catch(e){}},0);
viOnWidthResize(function(){try{drawCashflowDiagram();}catch(e){}},200);
viOnWidthResize(function(){var t=document.getElementById('tab-debt');if(t&&t.style.display!=='none'){drawDebtHistogram();drawDebtDonut();}},150);

