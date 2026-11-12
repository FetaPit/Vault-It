// ═══════════════════════════════════════════════════════════════
// CASHFLOW JS
// ═══════════════════════════════════════════════════════════════
function cfTotalIn(){return(ovState.income||[]).reduce(function(s,r){return s+(+r.amount||0);},0);}
// ── Cash flow groups: committed (red) · optional (amber) · saved & invested (green) ──
// Types are stored on each line as `type`. Older lines only have `category`
// (necessity / discretionary / investment) — map those onto the closest new type.
function cfType(item){
  if(!item)return 've';
  if(typeof item==='string')item={category:item};
  if(item.type&&CF_GROUPS[item.type])return item.type;
  var c=String(item.category||'').toLowerCase();
  var cat=bdFind('exp',item.cat||bdGuess('exp',item.name||'')),def=cat&&cat.t||'ve';
  if(/^(investment|saving|savings|growth)$/.test(c))return(def==='sv'||def==='iv')?def:'iv';
  if(/^(discretionary|optional)$/.test(c))return(def==='cn'||def==='vn')?def:'vn';
  return(def==='ce'||def==='ve')?def:'ce';
}
var cfGroup=cfType;
function cfGroupToCat(t){return CF_LEGACY[t]||'necessity';}
function cfIsSaving(t){return t==='sv'||t==='iv';}
function cfItemsByGroup(){
  var o={};CF_GROUP_ORDER.forEach(function(g){o[g]=[];});
  (ovState.expenses||[]).forEach(function(e){if((+e.amount||0)>0)o[cfType(e)].push(e);});
  CF_GROUP_ORDER.forEach(function(g){o[g].sort(function(a,b){return (+b.amount||0)-(+a.amount||0);});});
  return o;
}
function cfSum(list){return list.reduce(function(s,r){return s+(+r.amount||0);},0);}
// "Out" = money actually spent (all four spending types). Savings and investments are
// not spending — they are what the surplus is turned into.
function cfTotalOut(){return(ovState.expenses||[]).reduce(function(s,r){return cfIsSaving(cfType(r))?s:s+(+r.amount||0);},0);}
function cfTotalGrowth(){return(ovState.expenses||[]).reduce(function(s,r){return cfIsSaving(cfType(r))?s+(+r.amount||0):s;},0);}
// ── categories (built-in + the user's own) and icons ──
function bdCats(kind){
  var base=kind==='inc'?BD_INC_CATS:BD_EXP_CATS;
  return base.concat((ovState.customCats||[]).filter(function(c){return c.kind===kind;}));
}
function bdFind(kind,key){
  var L=bdCats(kind);
  return L.find(function(c){return c.k===key;})||L.find(function(c){return c.k==='other';})||L[L.length-1];
}
function bdGuess(kind,name){
  var n=String(name||'').trim().toLowerCase();
  var own=(ovState.customCats||[]).find(function(c){return c.kind===kind&&c.n.toLowerCase()===n;});
  if(own)return own.k;
  var G=kind==='inc'?BD_INC_GUESS:BD_GUESS;
  for(var i=0;i<G.length;i++)if(G[i][1].test(name||''))return G[i][0];
  return 'other';
}
function bdCatOf(kind,item){return item.cat||bdGuess(kind,item.name);}
function bdIconKey(kind,r){return r.icon||bdFind(kind,bdCatOf(kind,r)).ic;}
function bdIcon(key,size,col,fillOp){
  var ic=BD_ICONS[key]||FIRE_ICONS[key]||BD_ICONS.dots;
  return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" aria-hidden="true">'
    +'<g style="fill:'+col+'" fill-opacity="'+(fillOp==null?.16:fillOp)+'" stroke="none">'+ic.f.map(function(d){return '<path d="'+d+'"/>';}).join('')+'</g>'
    +'<g fill="none" style="stroke:'+col+'" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'+ic.d.map(function(d){return '<path d="'+d+'"/>';}).join('')+'</g></svg>';
}
function bdTypeOptions(sel){
  return CF_GROUP_ORDER.map(function(t){return '<option value="'+t+'"'+(t===sel?' selected':'')+'>'+CF_GROUPS[t].short+'</option>';}).join('');
}
function bdPick(kind,key){
  _bdSel[kind]=key;
  var c=bdFind(kind,key),nm=document.getElementById(kind==='inc'?'cf-inc-name':'cf-exp-name');
  // fill the name from the category unless the user has typed their own
  if(nm&&(!nm.value.trim()||nm.value===_bdAuto[kind])){nm.value=c.n;_bdAuto[kind]=c.n;}
  if(kind==='exp'){var s=document.getElementById('cf-exp-cat');if(s)s.value=c.t||'ve';}
  bdRenderPickers();
  var a=document.getElementById(kind==='inc'?'cf-inc-amt':'cf-exp-amt');if(a)a.focus();
}
function bdRenderPickers(){
  ['inc','exp'].forEach(function(kind){
    var el=document.getElementById('bd-pick-'+kind);if(!el)return;
    el.innerHTML=bdCats(kind).map(function(c){
      var col=kind==='inc'?'var(--teal)':'var(--t2)',on=_bdSel[kind]===c.k,own=String(c.k).indexOf('c_')===0;   // chips beside the account line: no group colour (owner, 31 Oct)
      return '<button type="button" class="bd-chip'+(on?' on':'')+'" style="--c:'+col+'" onclick="bdPick(\''+kind+'\',\''+c.k+'\')" title="'+cfEsc(c.n)+'">'+bdIcon(c.ic,18,col)+'<span>'+cfEsc(c.n)+'</span>'
        +(own?'<span class="bd-x" title="Delete this category" onclick="event.stopPropagation();bdDelCat(\''+kind+'\',\''+c.k+'\')">×</span>':'')+'</button>';
    }).join('')+'<button type="button" class="bd-chip add" style="--c:var(--muted)" onclick="bdToggleNew(\''+kind+'\')"><span><svg class="vi-ic g" aria-hidden="true"><use href="#vi-plus"/></svg> New category</span></button>';
  });
}
// ── create your own category (name · icon · type) ──
function bdToggleNew(kind){_bdNewOpen[kind]=!_bdNewOpen[kind];bdRenderNew();}
function bdNewIconPick(kind,ic){_bdNewIcon[kind]=ic;bdRenderNew();}
function bdRenderNew(){
  ['inc','exp'].forEach(function(kind){
    var el=document.getElementById('bd-new-'+kind);if(!el)return;
    el.style.display=_bdNewOpen[kind]?'':'none';
    if(!_bdNewOpen[kind])return;
    var keep=(document.getElementById('bd-new-name-'+kind)||{}).value||'';
    el.innerHTML='<div class="bd-new-t">New '+(kind==='inc'?'income':'spending')+' category</div>'
      +'<div class="bd-new-row"><input id="bd-new-name-'+kind+'" class="al-inp" placeholder="Name (e.g. Piano lessons)" value="'+cfEsc(keep)+'" maxlength="30">'
      +(kind==='exp'?'<select id="bd-new-type-exp" class="al-inp" title="Spending type">'+bdTypeOptions('vn')+'</select>':'')+'</div>'
      +'<div class="bd-new-lbl">Choose an icon</div><div class="bd-icons">'
      +BD_PICK_ICONS.map(function(k){return '<button type="button" class="bd-ibtn'+(_bdNewIcon[kind]===k?' on':'')+'" onclick="bdNewIconPick(\''+kind+'\',\''+k+'\')">'+bdIcon(k,20,_bdNewIcon[kind]===k?'#64b5f6':'#8fb4b1')+'</button>';}).join('')+'</div>'
      +'<div class="bd-new-row" style="margin-top:8px"><button class="btn-add-data" onclick="bdSaveNew(\''+kind+'\')">Save category</button><button class="btn-add-data" style="background:transparent;border-color:var(--t3);color:var(--t3)" onclick="bdToggleNew(\''+kind+'\')">Cancel</button></div>';
  });
}
function bdSaveNew(kind){if(viBlockEdit())return;
  var n=((document.getElementById('bd-new-name-'+kind)||{}).value||'').trim();
  if(!n){showToast('Give your category a name');return;}
  if(!ovState.customCats)ovState.customCats=[];
  var c={k:'c_'+Date.now().toString(36),kind:kind,n:n,ic:_bdNewIcon[kind]||'dots'};
  if(kind==='exp')c.t=(document.getElementById('bd-new-type-exp')||{}).value||'vn';
  ovState.customCats.push(c);
  _bdNewOpen[kind]=false;_bdNewIcon[kind]='dots';
  saveState();bdRender();bdPick(kind,c.k);
  showToast('“'+n+'” added');
}
function bdDelCat(kind,key){if(viBlockEdit())return;
  var c=(ovState.customCats||[]).find(function(x){return x.k===key;});
  if(!c||!confirm('Delete the category “'+c.n+'”? Lines using it become “Other”.'))return;
  ovState.customCats=ovState.customCats.filter(function(x){return x.k!==key;});
  if(_bdSel[kind]===key)_bdSel[kind]=null;
  saveState();bdRender();
}
// ── add income / spending ──
function addIncome(){if(viBlockEdit())return;
  var nEl=document.getElementById('cf-inc-name'),aEl=document.getElementById('cf-inc-amt');
  var a=parseFloat(aEl.value),n=nEl.value.trim();
  if(!n&&_bdSel.inc)n=bdFind('inc',_bdSel.inc).n;
  if(!n||!(a>0)){showToast('Pick a category (or type a name) and enter a monthly amount');return;}
  if(!ovState.income)ovState.income=[];
  ovState.income.push({id:Date.now(),name:n,amount:a/(window.VI_CURRENCY_RATE||1),cat:_bdSel.inc||bdGuess('inc',n)});
  nEl.value='';aEl.value='';_bdSel.inc=null;_bdAuto.inc='';
  saveState();renderCashflow();updateKPIs();
}
function addExpense(){if(viBlockEdit())return;
  var nEl=document.getElementById('cf-exp-name'),aEl=document.getElementById('cf-exp-amt');
  var a=parseFloat(aEl.value),n=nEl.value.trim();
  if(!n&&_bdSel.exp)n=bdFind('exp',_bdSel.exp).n;
  if(!n||!(a>0)){showToast('Pick a category (or type a name) and enter a monthly amount');return;}
  if(!ovState.expenses)ovState.expenses=[];
  var key=_bdSel.exp||bdGuess('exp',n);
  var sel=document.getElementById('cf-exp-cat');
  // the type the user left in the dropdown wins; otherwise the category's default
  var t=(sel&&CF_GROUPS[sel.value]&&(_bdSel.exp||sel.dataset.touched))?sel.value:(bdFind('exp',key).t||'ve');
  ovState.expenses.push({id:Date.now(),name:n,amount:a/(window.VI_CURRENCY_RATE||1),category:cfGroupToCat(t),type:t,cat:key});
  nEl.value='';aEl.value='';_bdSel.exp=null;_bdAuto.exp='';
  if(sel){sel.value='ce';delete sel.dataset.touched;}
  saveState();renderCashflow();updateKPIs();
}
function delIncome(id){if(viBlockEdit())return;ovState.income=(ovState.income||[]).filter(function(r){return r.id!==id;});saveState();renderCashflow();updateKPIs();}
function delExpense(id){if(viBlockEdit())return;ovState.expenses=(ovState.expenses||[]).filter(function(r){return r.id!==id;});saveState();renderCashflow();updateKPIs();}
function cfMoney(n){
  var rate=window.VI_CURRENCY_RATE||1,sym=window.VI_CURRENCY_SYMBOL||'£';
  var v=(isNaN(n)||n==null?0:n)*rate;
  return (v<0?'-':'')+sym+Math.round(Math.abs(v)).toLocaleString('en-GB');
}
function cfEsc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function cfShort(s,n){s=String(s||'');return s.length>n?s.slice(0,n-1)+'…':s;}
function cfLink(x0,y0,x1,y1,w,fill,op){
  var xm=(x0+x1)/2;
  return '<path class="cf-ln" d="M'+x0+' '+y0+' C'+xm+' '+y0+','+xm+' '+y1+','+x1+' '+y1+' L'+x1+' '+(y1+w)+' C'+xm+' '+(y1+w)+','+xm+' '+(y0+w)+','+x0+' '+(y0+w)+' Z" style="fill:'+fill+';stroke:'+fill+';stroke-width:1.5px;stroke-opacity:.9;vector-effect:non-scaling-stroke;animation-delay:'+(x0/600).toFixed(2)+'s" fill-opacity="'+op+'"/>';
}
// Shared model so the Sankey, histogram and summary all agree.
function cfModel(){
  var inc=(ovState.income||[]).filter(function(r){return(+r.amount||0)>0;});
  var by=cfItemsByGroup();
  var tIn=cfTotalIn(),spend=cfTotalOut(),growth=cfTotalGrowth();
  var surplus=tIn-spend;
  var overflow=Math.max(0,surplus-growth);
  var shortfall=Math.max(0,spend+growth-tIn);
  return {inc:inc,by:by,tIn:tIn,spend:spend,growth:growth,surplus:surplus,overflow:overflow,shortfall:shortfall,
          total:Math.max(tIn,spend+growth)};
}
// ── Sankey: income sources → Income → Committed / Optional / Saved → each category ──
function drawCashflowDiagram(){
  var hosts=['bd-sankey'].map(function(id){return document.getElementById(id);}).filter(Boolean);
  if(!hosts.length)return;
  var m=cfModel();
  if(m.total<=0){hosts.forEach(function(h){h.__sig=null;h.innerHTML='<div class="cf-empty">Add your income and spending to see where every pound goes</div>';});return;}
  var T=m.total;
  // sources (+ shortfall when spending exceeds income)
  var sources=m.inc.map(function(r){return{name:r.name,amt:+r.amount,col:'var(--teal)'};});
  if(m.shortfall>0)sources.push({name:'Shortfall',amt:m.shortfall,col:'#8a93a6',dash:true});
  // groups and their item nodes
  var groups=CF_GROUP_ORDER.map(function(g){
    var items=m.by[g].map(function(r){return{name:r.name,amt:+r.amount};});
    if(g==='sv'&&m.overflow>0)items.push({name:'Unassigned',amt:m.overflow,overflow:true});
    return{key:g,col:CF_GROUPS[g].col,tx:CF_GROUPS[g].tx,label:CF_GROUPS[g].short,items:items,sum:items.reduce(function(a,it){return a+it.amt;},0)};
  }).filter(function(g){return g.sum>0;});
  var nItems=groups.reduce(function(n,g){return n+g.items.length;},0);
  var wide=window.innerWidth>=900;   // on desktop the diagram is condensed vertically so it fits one screen
  var W=960,padT=42,padB=14,nodeW=14,gapItem=wide?2:3,gapGroup=wide?10:14,gapSrc=4,MINSLOT=32;   // 32: a two-line label chip is 32 px tall, so rows just clear each other; tighter spacing for the owner's "more compact across the Y axis" (4 Nov, v0.9.1 round 2 R10)
  var XS=190,XI=370,XG=535,XT=795;
  var usable=Math.max(260,50+nItems*(wide?20:26));
  var gaps=(nItems-groups.length)*gapItem+(groups.length-1)*gapGroup;
  var k=(usable-gaps)/T;
  // item column
  var y=padT,itemNodes=[],groupNodes=[];
  groups.forEach(function(g){
    var top=y;
    g.items.forEach(function(it){
      var h=Math.max(4,it.amt*k);
      itemNodes.push({g:g,it:it,y:y,h:h,slot:Math.max(h,MINSLOT)});
      y+=Math.max(h,MINSLOT)+gapItem;
    });
    var bottom=y-gapItem;
    groupNodes.push({g:g,y:top,h:Math.max(4,g.sum*k),top:top,bottom:bottom});
    y+=gapGroup-gapItem;
  });
  var itemsBottom=y-(gapGroup-gapItem);
  var spanTop=groupNodes[0].top,spanBottom=groupNodes[groupNodes.length-1].bottom;
  var incH=T*k,cy=(spanTop+spanBottom)/2;
  var incY=Math.max(padT,cy-incH/2);
  var srcTotal=sources.reduce(function(a,s){return a+Math.max(s.amt*k,MINSLOT);},0)+(sources.length-1)*gapSrc;
  var srcY=Math.max(padT,cy-srcTotal/2);
  var H=Math.max(itemsBottom,incY+incH,srcY+srcTotal)+padB;
  if(wide&&window.innerWidth>=1100){   // widen the canvas (not the text) until the whole diagram fits the window height (under 1100 the diagram is 1:1 in its scroller)
    var host0=hosts.filter(function(h){return h.clientWidth>0;})[0],cw=host0?host0.clientWidth:960;
    var isBd=host0&&host0.id==='bd-sankey',Hmax=Math.max(380,Math.round((window.innerHeight-(isBd?150:170))*.84),Math.round(H*.51));   // 84% of the free window height: the chart no longer stretches to fill the screen (owner, 4 Nov: more compact on the Y axis)
    var Wv=Math.max(960,cw*H/Hmax),sx=Wv/960;
    if(sx>1.001){XS*=sx;XI*=sx;XG*=sx;XT*=sx;W=Wv;}
  }
  try{document.documentElement.style.setProperty('--bd-split',((XI+nodeW)/W*100).toFixed(2)+'%');}catch(e){}   // the Budget page's income | spending divider follows the diagram's income block
  var one=window.innerWidth<1100;   // phones and tablets: 1:1, scrolled sideways, so the chips draw at their real size (v0.8 type scale)
  var out='<svg viewBox="0 0 '+W+' '+H.toFixed(0)+'" width="'+(one?W:'100%')+'"'+(one?' height="'+H.toFixed(0)+'" class="cf-1to1"':'')+' style="min-width:'+(one?W+'px':wide?'0':'640px')+'" font-family="Syne,DM Sans,sans-serif" role="img" aria-label="Cash flow diagram">';
  // -- links
  var sy=srcY,io=0;
  sources.forEach(function(s){
    var w=s.amt*k;
    out+=cfLink(XS+nodeW,sy,XI,incY+io,w,s.col,.28);
    sy+=Math.max(w,MINSLOT)+gapSrc;io+=w;
  });
  var go=0;
  groupNodes.forEach(function(gn){
    var w=gn.g.sum*k;
    out+=cfLink(XI+nodeW,incY+go,XG,gn.y,w,gn.g.col,.30);
    go+=w;
  });
  groupNodes.forEach(function(gn){
    var off=0;
    itemNodes.filter(function(n){return n.g===gn.g;}).forEach(function(n){
      var w=n.it.amt*k;
      out+=cfLink(XG+nodeW,gn.y+off,XT,n.y,w,gn.g.col,n.it.overflow?.18:.30);
      off+=w;
    });
  });
  // -- nodes
  // every label is a black chip (v0.7 E4 labels, owner 1 Nov; Pedro C4): #080808 at .88, 1 px stroke in the category colour at .5, 4 px radius, 4 px 6 px padding;
  // name DM Sans 600 11 px #E8E8E8, amount Share Tech Mono 10.5 px in the category colour. Sized from measured text, so it needs no layout; black in Daylight too.
  var _cx2=null;try{_cx2=document.createElement('canvas').getContext('2d');}catch(e){}
  function tw(t,f){try{_cx2.font=f;var w=_cx2.measureText(t).width;if(w>0)return w;}catch(e){}return String(t).length*(/mono/i.test(f)?6.5:6.3);}
  function chip(x,cy,anchor,name,amt,col,nameCol){
    var wn=tw(name,'600 11px "DM Sans",sans-serif'),wa=tw(amt,'10.5px "Share Tech Mono",monospace'),w=Math.ceil(Math.max(wn,wa))+14,h=32,x0=anchor==='end'?x-w:x,y0=cy-h/2;
    return '<g class="cf-chip"><rect x="'+x0.toFixed(1)+'" y="'+y0.toFixed(1)+'" width="'+w+'" height="'+h+'" rx="4" fill="#080808" fill-opacity=".88" stroke-opacity=".5" stroke-width="1" style="stroke:'+col+'"/>'
      +'<text x="'+(x0+7).toFixed(1)+'" y="'+(y0+14).toFixed(1)+'" font-family="DM Sans,sans-serif" font-size="11" font-weight="600" fill="'+(nameCol||'#E8E8E8')+'">'+cfEsc(name)+'</text>'
      +'<text x="'+(x0+7).toFixed(1)+'" y="'+(y0+26.5).toFixed(1)+'" font-family="Share Tech Mono,monospace" font-size="10.5" style="fill:'+col+'">'+cfEsc(amt)+'</text></g>';
  }
  function pct(v){return (v/T*100).toFixed(1)+'%';}
  /* a bright stroke in the block's own colour from the block to its label (owner, 31 Oct) */
  function lead(xa,xb,y,col){return '<line class="cf-lead" x1="'+xa+'" y1="'+y.toFixed(1)+'" x2="'+xb+'" y2="'+y.toFixed(1)+'" style="stroke:'+col+'" stroke-width="2.5" stroke-linecap="round"/>';}
  sy=srcY;
  sources.forEach(function(s){
    var h=Math.max(4,s.amt*k);
    out+='<rect x="'+XS+'" y="'+sy.toFixed(1)+'" width="'+nodeW+'" height="'+h.toFixed(1)+'" style="fill:'+s.col+'" fill-opacity=""'+(s.dash?.5:.9)+'"/>';
    out+=lead(XS,XS-6,sy+h/2,s.col);
    out+=chip(XS-8,sy+Math.max(h/2,MINSLOT/2),'end',cfShort(s.name,24),cfMoney(s.amt)+' ('+pct(s.amt)+')',s.dash?'rgb(138,147,166)':s.col);   // Shortfall: an rgb() grey, which Daylight does not remap, so its chip keeps the Night colour
    sy+=Math.max(s.amt*k,MINSLOT)+gapSrc;
  });
  out+='<rect x="'+XI+'" y="'+incY.toFixed(1)+'" width="'+nodeW+'" height="'+incH.toFixed(1)+'" style="fill:var(--teal)"/>';
  (function(){var wI=Math.ceil(Math.max(tw('INCOME','600 11px "DM Sans",sans-serif'),tw(cfMoney(m.tIn),'10.5px "Share Tech Mono",monospace')))+14;out+=chip(XI+nodeW/2-wI/2,incY-24,'start','INCOME',cfMoney(m.tIn),'var(--teal)');})();
  groupNodes.forEach(function(gn){
    out+='<rect x="'+XG+'" y="'+gn.y.toFixed(1)+'" width="'+nodeW+'" height="'+gn.h.toFixed(1)+'" style="fill:'+gn.g.col+'"/>';
    out+=lead(XG+nodeW,XG+nodeW+6,gn.y+gn.h/2,gn.g.col);
    out+=chip(XG+nodeW+8,gn.y+Math.max(gn.h/2,MINSLOT/2),'start',gn.g.label,cfMoney(gn.g.sum)+' ('+pct(gn.g.sum)+')',gn.g.col);
  });
  itemNodes.forEach(function(n){
    out+='<rect x="'+XT+'" y="'+n.y.toFixed(1)+'" width="'+nodeW+'" height="'+n.h.toFixed(1)+'" style="fill:'+n.g.col+(n.it.overflow?';stroke:'+n.g.col:'')+'" fill-opacity="'+(n.it.overflow?.45:.95)+'"'+(n.it.overflow?' stroke-dasharray="3 2"':'')+'/>';
    out+=lead(XT+nodeW,XT+nodeW+6,n.y+n.h/2,n.g.col);
    out+=chip(XT+nodeW+8,n.y+Math.max(n.h/2,MINSLOT/2),'start',cfShort(n.it.name,18),cfMoney(n.it.amt)+' ('+pct(n.it.amt)+')',n.g.col);
  });
  out+='</svg>';
  out=viDay(out);
  hosts.forEach(function(h){if(h.__sig!==out){h.__sig=out;h.innerHTML=out;}viCfZoom(h);});   // identical markup = no repaint
}
/* Flow zoom (owner, 3 Nov): the diagram opens at its real size (v0.8 labels never under 10.5 px); − / Fit / + scale it from there, Fit puts the whole flow on one screen. */
var _cfZ=1;
function viCfZoom(h){
  var svg=h&&h.querySelector('svg');if(!svg)return;
  var vb=(svg.getAttribute('viewBox')||'').split(/\s+/).map(Number),W=vb[2],H=vb[3];if(!(W>0&&H>0))return;
  var cw=h.clientWidth||W,vh=Math.max(260,window.innerHeight-230),one=window.innerWidth<1100;
  var whole=Math.min(cw/W,vh/H),auto=one?1:cw/W;   // default = the drawing as it is (labels at their real size, v0.8 type floor); − and Fit shrink it, + enlarges
  h.__auto=auto;h.__whole=whole;
  if(_cfZ===1){['width','min-width','max-width','height'].forEach(function(k){svg.style.removeProperty(k)});h.style.justifyContent='';return}
  var sc=Math.min(2.2,Math.max(whole*.7,auto*_cfZ)),w=Math.round(W*sc),ht=Math.round(H*sc);
  [['width',w+'px'],['min-width',w+'px'],['max-width','none'],['height',ht+'px']].forEach(function(p){svg.style.setProperty(p[0],p[1],'important')});
  h.style.justifyContent=w<cw?'center':'flex-start';
}
function viCfZoomBy(k){
  var h=document.getElementById('bd-sankey');viCfZoom(h);var auto=(h&&h.__auto)||1,whole=(h&&h.__whole)||.5;
  if(k==='fit')_cfZ=Math.min(1,whole/auto);else if(k==='in')_cfZ=Math.min(2.2/auto,_cfZ*1.25);else _cfZ=Math.max(whole*.7/auto,_cfZ*.8);
  viCfZoom(h);if(h)h.scrollLeft=0;
}
window.viCfZoomBy=viCfZoomBy;
// ── Budget tab rendering ──
function bdRowHTML(kind,r){
  var rate=window.VI_CURRENCY_RATE||1;
  if(_bdEdit&&_bdEdit.kind===kind&&_bdEdit.id===r.id){
    return '<div class="bd-edit">'
      +'<input id="bd-e-name" class="al-inp" value="'+cfEsc(r.name)+'" placeholder="Name">'
      +'<input id="bd-e-amt" class="al-inp" type="number" min="0" step="any" value="'+(Math.round(r.amount*rate*100)/100)+'">'
      +'<span class="bd-edit-btns"><button class="btn-add-data" onclick="bdSaveEdit()">Save</button><button class="btn-add-data" style="background:transparent;border-color:var(--t3);color:var(--t3)" onclick="bdCancelEdit()">Cancel</button></span></div>';
  }
  var ck=bdCatOf(kind,r),t=kind==='exp'?cfType(r):null;
  // owner, 31 Oct: the tile and its heading carry the group colour; the lines inside stay neutral so the tile is not a wall of colour
  var col=kind==='exp'?'var(--text)':'var(--teal)';
  var fillc=kind==='exp'?'var(--t3)':'var(--teal)';
  var open=_bdIconFor&&_bdIconFor.kind===kind&&_bdIconFor.id===r.id;
  var h='<div class="bd-row">'
    +'<button class="bd-ic" style="--c:'+fillc+'" title="Change icon" onclick="bdIconOpen(\''+kind+'\','+r.id+')">'+bdIcon(bdIconKey(kind,r),18,col)+'</button>'
    +'<span class="bd-nm">'+cfEsc(r.name)+'</span>'
    +'<span class="bd-amt" style="color:'+col+'">'+cfMoney(r.amount)+'<em>/mo</em></span>'
    +'<button class="cf-edit" title="Edit name / amount" onclick="bdEdit(\''+kind+'\','+r.id+')"><svg class="vi-ic g" role="img" aria-label="Edit"><use href="#vi-edit"/></svg></button>'
    +'<button class="data-item-del" onclick="'+(kind==='exp'?'delExpense':'delIncome')+'('+r.id+')"><svg class="vi-ic g" role="img" aria-label="Close"><use href="#vi-close"/></svg></button>'
    +'<div class="bd-sel"><select class="bd-s" title="Category" onchange="bdSetCat(\''+kind+'\','+r.id+',this.value)">'
    +bdCats(kind).map(function(c){return '<option value="'+c.k+'"'+(c.k===ck?' selected':'')+'>'+cfEsc(c.n)+'</option>';}).join('')+'</select>'
    +(kind==='exp'?'<select class="bd-s bd-type" style="--c:'+col+'" title="Spending type" onchange="bdSetType('+r.id+',this.value)">'+bdTypeOptions(t)+'</select>':'')
    +'</div>';
  if(open){
    h+='<div class="bd-iconpick"><div class="bd-icons">'+BD_PICK_ICONS.map(function(k){return '<button type="button" class="bd-ibtn'+(bdIconKey(kind,r)===k?' on':'')+'" onclick="bdIconSet(\''+kind+'\','+r.id+',\''+k+'\')">'+bdIcon(k,20,bdIconKey(kind,r)===k?'#64b5f6':'#8fb4b1')+'</button>';}).join('')+'</div>'
      +'<button class="btn-add-data" style="margin-top:6px;background:transparent;border-color:var(--t3);color:var(--t3)" onclick="bdIconSet(\''+kind+'\','+r.id+',null)">Use the category’s icon</button></div>';
  }
  return h+'</div>';
}
function bdItem(kind,id){return ((kind==='exp'?ovState.expenses:ovState.income)||[]).find(function(x){return x.id===id;});}
function bdSetCat(kind,id,key){if(viBlockEdit())return;
  var r=bdItem(kind,id);if(!r)return;
  r.cat=key;delete r.icon;
  if(kind==='exp'&&!r.typeLocked){var t=bdFind('exp',key).t||'ve';r.type=t;r.category=cfGroupToCat(t);}
  saveState();renderCashflow();updateKPIs();
}
function bdSetType(id,t){
  var r=bdItem('exp',id);if(!r||!CF_GROUPS[t])return;
  r.type=t;r.category=cfGroupToCat(t);r.typeLocked=true;
  saveState();renderCashflow();updateKPIs();
}
function bdIconOpen(kind,id){_bdIconFor=(_bdIconFor&&_bdIconFor.kind===kind&&_bdIconFor.id===id)?null:{kind:kind,id:id};bdRenderLists();}
function bdIconSet(kind,id,key){
  var r=bdItem(kind,id);if(!r)return;
  if(key)r.icon=key;else delete r.icon;
  _bdIconFor=null;saveState();bdRenderLists();
}
function bdRenderPer100(){
  var el=document.getElementById('bd-per100');if(!el)return;
  var m=cfModel();
  if(!(m.tIn>0)){el.innerHTML='<div class="bd-tile-empty">Add your income to see where each £100 goes.</div>';return;}
  var used=0;
  var rows=CF_GROUP_ORDER.map(function(g){var v=cfSum(m.by[g]),per=v/m.tIn*100;used+=per;return per>0.05?'<div class="bd-p100-row" style="--c:'+CF_GROUPS[g].col+';--t:'+CF_GROUPS[g].tx+'"><span class="bd-p100-ic">'+bdGroupIcon(g,18)+'</span><span class="bd-p100-l">'+CF_GROUPS[g].short+'</span><span class="bd-p100-bar"><i style="width:'+Math.min(100,per).toFixed(1)+'%"></i></span><b>£'+per.toFixed(0)+'</b></div>':'';}).join('');
  var left=Math.max(0,100-used);
  el.innerHTML=rows+(left>0.5?'<div class="bd-p100-row" style="--c:var(--amber);--t:var(--amber)"><span class="bd-p100-ic">◌</span><span class="bd-p100-l">Unassigned</span><span class="bd-p100-bar"><i style="width:'+left.toFixed(1)+'%"></i></span><b>£'+left.toFixed(0)+'</b></div>':'');
}
function bdRenderLists(){
  var m=cfModel();
  try{bdRenderPer100();}catch(e){}
  var il=document.getElementById('cf-income-list');
  if(il)il.innerHTML=(ovState.income||[]).map(function(r){return bdRowHTML('inc',r);}).join('')||'<div class="bd-empty">No income yet. Pick a category below and add what comes in each month.</div>';
  var el=document.getElementById('cf-expense-list');
  if(!el)return;
  var exp=(ovState.expenses||[]),html='';
  CF_GROUP_ORDER.forEach(function(g){
    var items=exp.filter(function(r){return cfType(r)===g;}).sort(function(a,b){return (+b.amount||0)-(+a.amount||0);});
    var sum=cfSum(items),folded=bdIsFolded(g),G=CF_GROUPS[g];
    html+='<section class="bd-tile'+(folded?' folded':'')+'" data-g="'+g+'" style="--c:'+G.col+';--t:'+G.tx+'">'
      +'<button type="button" class="bd-tile-hd" onclick="bdFold(\''+g+'\')" aria-expanded="'+(!folded)+'">'
      +'<span class="bd-tile-ic">'+bdGroupIcon(g,20)+'</span>'
      +'<span class="bd-tile-tt"><b>'+G.short.replace(/non-essential/,'<span style="white-space:nowrap">non-essential</span>')+'</b><em>'+G.ex+'</em></span>'
      +'<span class="bd-tile-sum">'+cfMoney(sum)+'<small>'+(m.tIn>0?Math.round(sum/m.tIn*100)+'% of income':items.length+' item'+(items.length===1?'':'s'))+'</small></span>'
      +'<span class="bd-chev"><svg class="vi-ic" style="--vi-sw:2;width:20px;height:20px" aria-hidden="true"><use href="#vi-chevron"/></svg></span></button>'
      +'<div class="bd-tile-body">'+(items.length?items.map(function(r){return bdRowHTML('exp',r);}).join(''):'<div class="bd-tile-empty">Nothing here yet. Add your first '+G.short.toLowerCase()+' line below.</div>')
      +'<div class="bd-qa"><div class="bd-qa-t"><svg class="vi-ic g" aria-hidden="true"><use href="#vi-plus"/></svg> Quick add to '+G.short+'</div><div class="bd-qa-row"><input type="text" id="bd-qa-n-'+g+'" maxlength="40" placeholder="'+cfEsc(G.ex.split(',')[0])+'" onkeydown="if(event.key===\'Enter\')bdQuickAdd(\''+g+'\')"><input type="number" id="bd-qa-a-'+g+'" min="0" placeholder="£/mo" onkeydown="if(event.key===\'Enter\')bdQuickAdd(\''+g+'\')"><button type="button" class="btn-add-data" onclick="bdQuickAdd(\''+g+'\')">Add</button></div></div>'
      +'</div></section>';
  });
  el.innerHTML='<div class="bd-tiles">'+html+'</div>';
}
function bdQuickAdd(g){if(viBlockEdit())return;
  var n=((document.getElementById('bd-qa-n-'+g)||{}).value||'').trim(),a=parseFloat((document.getElementById('bd-qa-a-'+g)||{}).value);
  if(!n||!(a>0)){showToast('Enter a name and a monthly amount');return;}
  n=viClean(n).slice(0,40);
  if(!ovState.expenses)ovState.expenses=[];
  ovState.expenses.push({id:Date.now(),name:n,amount:a/(window.VI_CURRENCY_RATE||1),category:cfGroupToCat(g),type:g,cat:bdGuess('exp',n)});
  saveState();renderCashflow();updateKPIs();showToast('Added to '+CF_GROUPS[g].short);
}
function bdIsFolded(g){return Object.prototype.hasOwnProperty.call(_bdFold,g)?!!_bdFold[g]:true;}   // every group starts folded for everyone; a saved choice still wins (owner, 1 Nov, E9)
function bdFold(g){_bdFold[g]=!bdIsFolded(g);try{localStorage.setItem('vi_bd_fold',JSON.stringify(_bdFold));}catch(e){}bdRenderLists();}
function bdFoldAll(v){CF_GROUP_ORDER.forEach(function(g){_bdFold[g]=!!v;});try{localStorage.setItem('vi_bd_fold',JSON.stringify(_bdFold));}catch(e){}bdRenderLists();}
// group icons: lock = committed (same every month), open lock = variable; roof = essential, star = non-essential
function bdGroupIcon(g,px){
  var lock=function(open){return '<rect x="13" y="14.500" width="9.500" height="7.500" rx="1.600" fill="currentColor" fill-opacity=".22"/><path d="'+(open?'M15 14.500v-3a2.800 2.800 0 0 1 5.300-1.200':'M15 14.500v-3a2.800 2.800 0 0 1 5.600 0v3')+'"/>';};
  var roof='<path d="M1.500 11.500 9 4.500l7.500 7"/><path d="M3.500 10.200v7.300h11V10.200"/>';
  var star='<path d="M9 3.500l1.900 3.900 4.300.6-3.100 3 .7 4.300L9 13.300l-3.800 2 .7-4.300-3.100-3 4.300-.6z" fill="currentColor" fill-opacity=".18"/>';
  var body;
  if(g==='ce')body=roof+lock(false);else if(g==='ve')body=roof+lock(true);
  else if(g==='cn')body=star+lock(false);else if(g==='vn')body=star+lock(true);
  else if(g==='sv')body='<rect x="3" y="4" width="18" height="16" rx="2.500" fill="currentColor" fill-opacity=".16"/><circle cx="12" cy="12" r="3.600"/><path d="M12 8.200v1.400M12 14.400v1.400M8.200 12h1.400M14.400 12h1.400"/><path d="M6 20v1.500M18 20v1.500"/>';
  else body='<path d="M3 17.500 9 11.500l4 4 8-9"/><path d="M15 6.500h6v6"/><path d="M3 21h18" opacity=".5"/>';
  return '<svg viewBox="0 0 24 24" width="'+px+'" height="'+px+'" fill="none" stroke="currentColor" stroke-width="1.700" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+body+'</svg>';
}
function bdEdit(kind,id){if(viBlockEdit())return;_bdEdit={kind:kind,id:id};bdRenderLists();}
function bdCancelEdit(){_bdEdit=null;bdRenderLists();}
function bdSaveEdit(){if(viBlockEdit())return;
  if(!_bdEdit)return;
  var r=bdItem(_bdEdit.kind,_bdEdit.id);
  if(!r){_bdEdit=null;return;}
  var rate=window.VI_CURRENCY_RATE||1;
  var n=(document.getElementById('bd-e-name')||{}).value||'',a=parseFloat((document.getElementById('bd-e-amt')||{}).value);
  if(!n.trim()||!(a>=0)){showToast('Enter a name and amount');return;}
  r.name=n.trim();r.amount=a/rate;
  _bdEdit=null;saveState();renderCashflow();updateKPIs();
}
// ── Zero-based budget: income − every pound assigned = 0 ──
function bdLeft(){var m=cfModel();return m.tIn-(m.spend+m.growth);}
function bdState(){
  var m=cfModel(),assigned=m.spend+m.growth,left=m.tIn-assigned;
  var st=m.tIn<=0?'none':(Math.abs(left)<0.5?'zero':(left>0?'under':'over'));
  return{m:m,assigned:assigned,left:left,st:st};
}
function bdRenderZero(){
  var el=document.getElementById('bd-zero');if(!el)return;
  var s=bdState(),m=s.m;
  var denom=Math.max(m.tIn,s.assigned,1);
  var col=s.st==='zero'?'var(--green)':s.st==='under'?'var(--amber)':s.st==='over'?'var(--red)':'var(--lock)';
  var big=s.st==='none'?'Add your income':s.st==='zero'?'Every pound accounted for ✓':cfMoney(Math.abs(s.left))+(s.st==='under'?' left to assign':' over-assigned');
  var msg=s.st==='none'?'Start with what comes in each month, then plan where it goes.'
    :s.st==='zero'?'Income − spending − saving = £0. That’s a zero-based budget. Nothing is left to chance.'
    :s.st==='under'?'Assign the rest below: spending, saving or investing.'
    :'You’ve planned to use more than you earn. Trim a non-essential line or lower a saving until it reaches £0.';
  var rem='';
  var segs=CF_GROUP_ORDER.map(function(t){var v=cfSum(m.by[t]);return v>0?'<div title="'+CF_GROUPS[t].short+' '+cfMoney(v)+'" style="width:'+(v/denom*100).toFixed(2)+'%;background:'+CF_GROUPS[t].col+'"></div>':'';}).join('');
  el.innerHTML='<div class="bd-zero-top"><div><div class="bd-big" style="color:'+col+'">'+big+'</div><div class="bd-msg">'+msg+'</div></div>'
    +'<div class="bd-stats"><div><label>Income</label><b>'+cfMoney(m.tIn)+'</b></div><div><label>Assigned</label><b>'+cfMoney(s.assigned)+'</b></div><div><label>Left</label><b style="color:'+col+'">'+(s.left<0?'−':'')+cfMoney(Math.abs(s.left))+'</b></div></div></div>'
    +'<div class="bd-bar">'+segs+(s.st==='under'?'<div class="bd-rest" style="width:'+(s.left/denom*100).toFixed(2)+'%"></div>':'')+'</div>'+rem;
}
function bdAssignRemainder(catKey){
  var left=Math.round(bdLeft()*100)/100;
  if(!(left>0)){return;}
  var c=bdFind('exp',catKey);
  var ex=(ovState.expenses||[]).find(function(e){return bdCatOf('exp',e)===catKey&&cfType(e)===c.t;});
  if(ex)ex.amount=(+ex.amount||0)+left;
  else{if(!ovState.expenses)ovState.expenses=[];ovState.expenses.push({id:Date.now(),name:c.n,amount:left,category:cfGroupToCat(c.t),type:c.t,cat:catKey});}
  saveState();renderCashflow();updateKPIs();
  showToast(cfMoney(left)+' assigned to '+c.n+' ✓ Zero-based!');
}
function bdFocusAdd(){
  var a=document.getElementById('cf-exp-amt'),l=Math.round(bdLeft()*100)/100;
  if(a){if(l>0)a.value=l;a.scrollIntoView({behavior:'smooth',block:'center'});a.focus();}
}
function bdUpdateBadge(){
  var b=document.getElementById('budget-badge');if(!b)return;
  var s=bdState(),show=s.st==='under'||s.st==='over';
  b.style.display=show?'inline-block':'none';
  b.title=show?(s.st==='under'?cfMoney(s.left)+' still unassigned':'Over-assigned by '+cfMoney(-s.left)):'';
  b.style.background=s.st==='over'?'var(--red)':'var(--amber)';
}
function cfLegendHTML(){
  return CF_GROUP_ORDER.map(function(t){return '<span title="'+cfEsc(CF_GROUPS[t].ex)+'" style="--c:'+CF_GROUPS[t].tx+'"><s>'+bdGroupIcon(t,22)+'</s>'+CF_GROUPS[t].short+'</span>';}).join('');
}
function bdRender(){
  bdRenderZero();bdRenderLists();bdRenderPickers();bdRenderNew();renderCashflowCategories();
  var nd=document.getElementById('bd-nudge');
  if(nd){
    var exp=ovState.expenses||[];
    var lump=exp.length===1&&(exp[0]._onboarding||/^monthly expenses$/i.test(exp[0].name||''));
    nd.innerHTML=lump?'<div class="cf-nudge"><b>One lump-sum so far.</b> Break “'+cfEsc(exp[0].name)+'” down by category below, then remove the lump sum.</div>':'';
  }
}
function renderCashflow(){
  var m=cfModel(),s=bdState();
  var tIn=m.tIn,tOut=m.spend,surplus=m.surplus;
  var rate=tIn>0?Math.max(-999,Math.round((surplus/tIn)*100)):0;
  var sum=document.getElementById('cf-summary');
  var mono='font-family:\'Share Tech Mono\',monospace;font-size:max(.65rem,var(--vi-fs-2));';
  if(sum)sum.innerHTML=
    '<span style="'+mono+'color:var(--gr)">In: '+gbpFmt(tIn)+'/mo</span>'+
    '<span style="'+mono+'color:var(--re)">Spend: '+gbpFmt(tOut)+'/mo</span>'+
    '<span style="'+mono+'color:'+(surplus>=0?'var(--blue)':'var(--re)')+'">Surplus: '+gbpFmt(surplus)+'/mo</span>'+
    '<span style="'+mono+'color:var(--gr)">Save rate: '+rate+'%</span>';
  ['cf-legend','bd-legend'].forEach(function(id){var e=document.getElementById(id);if(e)e.innerHTML=cfLegendHTML();});
  // dashboard nudge: unassigned pounds → Budget tab
  var nd=document.getElementById('cf-nudge');
  if(nd){
    nd.innerHTML=(s.st==='under'||s.st==='over')
      ?'<div class="cf-nudge">'+(s.st==='under'?'<b>'+cfMoney(s.left)+' of your monthly income has no job yet.</b> Zero-based budgeting gives every pound a purpose.':'<b>You’ve assigned '+cfMoney(-s.left)+' more than you earn.</b>')+' <a href="#" onclick="showTab(\'budget\');return false">Open Budget →</a></div>'
      :(s.st==='zero'?'<div class="cf-nudge" style="background:rgb(var(--green-rgb) / .07);border-color:rgb(var(--green-rgb) / .3)"><b style="color:var(--green)">Every pound accounted for ✓</b> Your zero-based budget is balanced.</div>':'');
  }
  setTimeout(drawCashflowDiagram,50);
  if(document.getElementById('bd-zero'))bdRender();
  bdUpdateBadge();
}
function renderCashflowCategories(){
  var el=document.getElementById('cf-categories');
  if(!el)return;
  var m=cfModel();
  if(m.total<=0){el.innerHTML='<div style="font-size:max(.58rem,var(--vi-fs-2));color:var(--t3)">Add income and spending to see how your money splits.</div>';return;}
  var bands=[
    {label:'Essentials',  types:['ce','ve'],guide:'aim ≤ 50%',target:50,under:false},
    {label:'Non-essentials',types:['cn','vn'],guide:'aim ≤ 30%',target:30,under:false},
    {label:'Saving & investing',types:['sv','iv'],guide:'aim ≥ 20%',target:20,under:true}
  ];
  el.innerHTML=bands.map(function(b){
    var sum=b.types.reduce(function(a,t){return a+cfSum(m.by[t]);},0),pct=Math.round(sum/m.total*100);
    var bad=b.under?pct<b.target:pct>b.target;
    var segs=b.types.map(function(t){var v=cfSum(m.by[t]);return v>0?'<div title="'+CF_GROUPS[t].short+' '+cfMoney(v)+'" style="width:'+Math.min(100,v/m.total*100).toFixed(2)+'%;background:'+CF_GROUPS[t].col+'"></div>':'';}).join('');
    return '<div style="margin-bottom:12px">'
      +'<div style="display:flex;justify-content:space-between;gap:8px;font-size:max(.58rem,var(--vi-fs-2));margin-bottom:4px"><span style="color:var(--tx);font-weight:700">'+b.label+' <span style="color:var(--t3);font-weight:400">· '+b.guide+'</span></span>'
      +'<span style="font-family:\'Share Tech Mono\',monospace;color:var(--t2)">'+gbpFmt(sum)+'/mo &nbsp;<b style="color:'+(bad?'var(--amber)':'var(--tx)')+'">'+pct+'%</b></span></div>'
      +'<div style="position:relative;display:flex;height:8px;background:rgb(var(--ink-rgb) / .06);border-radius:4px;overflow:visible">'
      +'<div style="display:flex;width:100%;border-radius:4px;overflow:hidden">'+segs+'</div>'
      +'<div title="Guide: '+b.target+'%" style="position:absolute;top:-3px;bottom:-3px;left:'+b.target+'%;width:2px;background:rgb(var(--ink-rgb) / .4)"></div></div></div>';
  }).join('')
  +(m.overflow>0.5?'<div style="margin-bottom:11px"><div style="display:flex;justify-content:space-between;gap:8px;font-size:max(.58rem,var(--vi-fs-2));margin-bottom:4px"><span style="color:var(--amber);font-weight:700">Unassigned</span><span style="font-family:\'Share Tech Mono\',monospace;color:var(--t2)">'+gbpFmt(m.overflow)+'/mo &nbsp;<b style="color:var(--amber)">'+Math.round(m.overflow/m.total*100)+'%</b></span></div><div style="height:8px;border-radius:4px;background:rgb(var(--ink-rgb) / .06)"><div style="height:100%;width:'+Math.min(100,m.overflow/m.total*100)+'%;border-radius:4px" class="bd-rest"></div></div></div>':'')
  +(m.shortfall>0?'<div style="font-size:max(.55rem,var(--vi-fs-1));color:var(--red);margin-top:4px">⚠ You are planning to spend '+gbpFmt(m.shortfall)+'/mo more than you earn.</div>':'');
}

