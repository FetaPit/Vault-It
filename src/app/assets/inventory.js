// ═══════════════════════════════════════════════════════════════
// WEALTH INVENTORY — multi-photo 3D viewer (photo turntable)
// Photos are compressed and stored in IndexedDB on this device; the item keeps only a count
// and a small cover thumbnail, so nothing heavy is synced or crammed into localStorage.
// ═══════════════════════════════════════════════════════════════
function invDB(){
  return new Promise(function(res,rej){
    if(_invDB)return res(_invDB);
    if(!window.indexedDB)return rej(new Error('IndexedDB unavailable'));
    var rq=indexedDB.open('vi_photos',1);
    rq.onupgradeneeded=function(){rq.result.createObjectStore('sets');};
    rq.onsuccess=function(){_invDB=rq.result;res(_invDB);};
    rq.onerror=function(){rej(rq.error);};
  });
}
function invTx(mode,fn){return invDB().then(function(db){return new Promise(function(res,rej){var st=db.transaction('sets',mode).objectStore('sets'),r=fn(st);r.onsuccess=function(){res(r.result);};r.onerror=function(){rej(r.error);};});});}
function invGet(id){return invTx('readonly',function(s){return s.get(String(id));}).then(function(v){return (v&&v.frames)||[];});}
function invPut(id,frames){delete _invCache[id];return invTx('readwrite',function(s){return s.put({frames:frames,updated:Date.now()},String(id));});}
function invDel(id){delete _invCache[id];return invTx('readwrite',function(s){return s.delete(String(id));});}
function invClearAll(){_invCache={};return invTx('readwrite',function(s){return s.clear();});}
// ── Live market value, step 1 (docs/LIVE_MARKET_VALUE.md). A wealth item can be linked to:
//   metal:   weight × purity × the metal price in Precious metals (per troy oz)
//   holding: units × the live price of a holding in Stocks and shares
// The item's own figure (a.value) is never overwritten: unlinking goes back to it, and it is used whenever a link cannot be priced.
// functions, not vars: the totals can run before this part of the script has (startup order)
function wiTroyG(){return 31.1034768;}
function wiMetals(){return {gold:'Gold',silver:'Silver',platinum:'Platinum',palladium:'Palladium'};}
function wiPurity(){return {
  gold:[['24ct (999)',0.999],['22ct (916)',0.9167],['18ct (750)',0.75],['14ct (585)',0.585],['9ct (375)',0.375]],
  silver:[['Fine (999)',0.999],['Britannia (958)',0.958],['Sterling (925)',0.925],['800',0.8]],
  platinum:[['999',0.999],['950',0.95],['900',0.9]],
  palladium:[['999',0.999],['950',0.95],['500',0.5]]
};}
function wiMoney(v){return (window.VI_CURRENCY_SYMBOL||'£')+Math.round((+v||0)*(window.VI_CURRENCY_RATE||1)).toLocaleString('en-GB');}
function wiMoney2(v){return (window.VI_CURRENCY_SYMBOL||'£')+((+v||0)*(window.VI_CURRENCY_RATE||1)).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});}
function wiWhen(t){if(!t)return '';var d=new Date(t);if(isNaN(d))return '';return d.toLocaleDateString('en-GB',{day:'numeric',month:'short'})+' '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});}
// price of one troy oz and where it came from; null when nobody has fetched or typed one (the default is not a price)
function wiMetalPrice(m){
  var p=alState.metalPrices||{},px=+p[m]||0,live=p.lastUpdated?Date.parse(p.lastUpdated):0,own=p.manualAt?Date.parse(p.manualAt):0;
  if(!(px>0)||(!live&&!own))return null;
  return own>live?{px:px,src:'your price in Precious metals',at:own}:{px:px,src:'spot price',at:live};
}
// {v, ok, src, at, work, note} for a linked item; ok=false means the item's own figure is used
function wiLinkInfo(a){
  var L=a&&a.link;if(!L)return null;
  var own=+a.value||0;
  if(L.type==='metal'){
    var g=(+L.grams||0),pur=+L.purity||0,mp=wiMetalPrice(L.metal),name=wiMetals()[L.metal]||'Metal';
    if(!(g>0)||!(pur>0))return {v:own,ok:false,src:name,note:'Weight or purity missing: showing your own figure.'};
    if(!mp)return {v:own,ok:false,src:name,note:'No '+name.toLowerCase()+' price yet. Fetch or type one in Precious metals: showing your own figure.'};
    var fineOz=g*pur/wiTroyG(),v=fineOz*mp.px;
    return {v:v,ok:true,src:name+' '+mp.src,at:mp.at,
      work:(L.unit==='oz'?(+(g/wiTroyG()).toFixed(3))+' troy oz':(+g.toFixed(2))+' g')+' × '+(L.label||pur)+' purity = '+fineOz.toFixed(3)+' troy oz of fine '+name.toLowerCase()+' × '+wiMoney2(mp.px)+'/oz = '+wiMoney(v)};
  }
  if(L.type==='holding'){
    var h=(alState.stocks||[]).find(function(x){return x.id===L.stockId;}),u=+L.units||0;
    if(!h)return {v:own,ok:false,src:'Holding',note:'The linked holding is no longer in Stocks and shares: showing your own figure.'};
    var px=stkPrice(h),sym=h.sym||h.name||'holding';
    if(!(u>0)||!(px>0))return {v:own,ok:false,src:sym,note:'No price for '+sym+' yet: showing your own figure.'};
    var live=+h.price>0&&!h.manualPrice,v2=u*px;
    return {v:v2,ok:true,src:sym+(live?' live price':(+h.price>0?' price you typed':' average cost (no live price yet)')),at:live?h.updated:0,
      work:(+u.toFixed(4))+' × '+wiMoney2(px)+' ('+sym+') = '+wiMoney(v2)};
  }
  if(L.type==='market'){   // a second-hand estimate the user chose to apply (secondhand-estimate); only the derived numbers are kept
    var mv=+L.v||0;
    if(!(mv>0))return {v:own,ok:false,src:'Second-hand estimate',note:'No estimate saved: showing your own figure.'};
    var sd=(L.srcd||[]).map(function(x){return x.l+': '+x.n+' prices, middle '+wiMoney(x.m);}).join('; ');
    var stale=L.at>0&&Date.now()-L.at>30*864e5;
    return {v:mv,ok:true,market:true,guide:!(L.n>0),src:'Second-hand estimate ('+((L.srcs||[]).join(', ')||'listings')+')',at:L.at,
      work:'Estimate from '+(L.n>0?L.n+' current asking prices':'a price guide')+', typically '+wiMoney(L.lo)+' to '+wiMoney(L.hi)+', adjusted for '+(L.cond||'good')+' condition ('+Math.round((+L.haircut||0)*100)+'% allowance for asking prices running above sale prices'+(+L.cf&&+L.cf!==1?', condition factor '+L.cf:'')+')'
        +(sd?'. '+sd:'')+(L.combine==='largest source'?'. The sources disagreed, so the one with most prices is used':'')+(stale?'. Checked over 30 days ago: search again':'')};
  }
  return null;
}
function wiValue(a){var i=wiLinkInfo(a);return i?i.v:(+a.value||0);}
// keep one reading a week old so the tile can say how much the linked value moved, and why
function wiSnap(a,i){
  if(!i||!i.ok)return null;var now=Date.now(),s=a.linkSnap;
  if(!s||!(s.at>0)){a.linkSnap={v:i.v,at:now};_wiSnapDirty=true;return null;}
  if(now-s.at>7*864e5){a.linkPrev=s;a.linkSnap={v:i.v,at:now};_wiSnapDirty=true;}
  var p=a.linkPrev||a.linkSnap;if(now-p.at<864e5)return null;
  var d=i.v-p.v;if(Math.abs(d)<0.5)return null;
  return (d>0?'+':'-')+wiMoney(Math.abs(d))+' since '+new Date(p.at).toLocaleDateString('en-GB',{day:'numeric',month:'short'});
}
var _wiSnapDirty=false,_wiLinkId=null,_wiLinkReturn=null;
/* Round 3 (8): the value of each item over time. One reading a day at most, {d, v, src}: the live source when the item is linked
   and priced, otherwise "your figure". Kept on the item (the user's own data, saved like the rest), newest 120 readings. */
var WI_HIST_MAX=120;
function wiDay(t){var d=new Date(t||Date.now());return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function wiHist(a,i){
  if(!a)return [];var v=i?i.v:(+a.value||0),src=i&&i.ok?i.src:'your figure';
  if(!(v>0))return a.valHist||[];
  var H=Array.isArray(a.valHist)?a.valHist:(a.valHist=[]),day=wiDay(),last=H[H.length-1];
  v=Math.round(v*100)/100;
  if(last&&last.d===day){if(Math.abs(last.v-v)>=0.5||last.src!==src){last.v=v;last.src=src;_wiSnapDirty=true;}}
  else{H.push({d:day,v:v,src:src});if(H.length>WI_HIST_MAX)H.splice(0,H.length-WI_HIST_MAX);_wiSnapDirty=true;}
  return H;
}
function wiDayLabel(d){var x=new Date(d+'T12:00:00');return isNaN(x)?d:x.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});}
// a small line of the readings, and the change since the first one
function wiSpark(H){
  if(!H||H.length<2)return '';
  var vs=H.map(function(h){return +h.v||0;}),lo=Math.min.apply(null,vs),hi=Math.max.apply(null,vs),W=64,Ht=18,n=vs.length;
  var pts=vs.map(function(v,k){return (k*(W/(n-1))).toFixed(1)+','+(hi===lo?Ht/2:(Ht-1-(v-lo)/(hi-lo)*(Ht-2))).toFixed(1);}).join(' ');
  var f=H[0],l=H[n-1],d=l.v-f.v,up=d>=0;
  var txt=wiMoney(f.v)+' on '+wiDayLabel(f.d)+', '+wiMoney(l.v)+' now ('+(Math.abs(d)<0.5?'no change':(up?'+':'-')+wiMoney(Math.abs(d)))+'), '+n+' readings';
  return '<div class="wi-hist" title="'+cfEsc(txt+'. Latest from '+l.src)+'"><svg viewBox="0 0 '+W+' '+Ht+'" role="img" aria-label="Value history: '+cfEsc(txt)+'"><polyline points="'+pts+'" style="fill:none;stroke:var(--teal);stroke-width:1.5;stroke-linejoin:round;stroke-linecap:round"/></svg><span aria-hidden="true">'+(Math.abs(d)<0.5?'No change':(up?'+':'-')+wiMoney(Math.abs(d)))+' since '+cfEsc(wiDayLabel(f.d).replace(/ \d{4}$/,''))+'</span></div>';
}
// which live source fits this item, from its name; manual when none does (never a guessed figure)
function wiGuessSource(a){
  var nm=String(a&&a.name||''),lo=nm.toLowerCase();
  var metal=/\b(gold|sovereign|krugerrand|britannia|maple ?leaf|bullion|ingot|22 ?ct|24 ?ct|18 ?ct|9 ?ct)\b/.test(lo)?'gold'
    :/\bsilver\b/.test(lo)?'silver':/\bplatinum\b/.test(lo)?'platinum':/\bpalladium\b/.test(lo)?'palladium':null;
  if(metal)return {kind:'metal',metal:metal,why:'"'+nm+'" looks like '+metal+'. Enter its weight and purity to follow the '+metal+' price; leave it as your own figure if it is worth more than its metal.'};
  var hs=alState.stocks||[];
  for(var k=0;k<hs.length;k++){var h=hs[k],sym=String(h.sym||'').toLowerCase(),hn=String(h.name||'').toLowerCase();
    if((sym.length>=2&&new RegExp('\\b'+sym.replace(/[^a-z0-9]/g,'')+'\\b').test(lo))||(hn.length>=4&&(lo.indexOf(hn)>=0||(lo.length>=4&&hn.indexOf(lo)>=0))))
      return {kind:'holding',stockId:h.id,why:'"'+nm+'" matches '+(h.sym||h.name)+' in Stocks and shares. Enter the units to follow its price.'};}
  return {kind:'manual',why:'No live price source found for "'+nm+'". Your own figure is used, and each change you make is kept in its value history.'};
}
function wiLinkHtml(a){
  var i=wiLinkInfo(a),chg=i&&wiSnap(a,i),hist=wiSpark(wiHist(a,i));
  var btn='<button class="wi-link-btn" type="button" onclick="wiLinkOpen('+a.id+')" aria-label="Value of '+cfEsc(a.name)+': '+(i?'linked':'your own figure')+'. Change">'+(i?(i.ok?(i.market?'Estimated':'Linked'):'Link paused'):'Link to market value')+'</button>';
  if(!i)return hist+btn;
  return hist+btn+'<details class="wi-work"><summary>Show working</summary>'
    +(i.ok?'<div>'+cfEsc(i.work)+'</div><div class="wi-src">'+cfEsc(i.src)+(i.at?', checked '+wiWhen(i.at):'')+'</div>'+(chg?'<div class="wi-chg">'+chg+' ('+cfEsc(i.src)+')</div>':''):'<div>'+cfEsc(i.note)+'</div>')
    +'<div class="wi-src">Your own figure: '+wiMoney(a.value)+'</div>'
    +(i.market?'<div class="wi-src">'+(i.guide?'From a price guide, not a valuation, offer or sale price.':'Estimated from current asking prices, not a valuation, offer or sale price. Real sale prices are usually lower.')+'</div>':'')
    +'<div class="wi-src">Estimated market value, not an offer or a valuation. Not financial advice.</div></details>';
}
function wiLinkModal(){
  var m=document.getElementById('wi-link-modal');if(m)return m;
  m=document.createElement('div');m.id='wi-link-modal';m.className='vi-pop';m.hidden=true;
  m.setAttribute('onclick',"if(event.target===this)wiLinkClose()");m.setAttribute('onkeydown',"if(event.key==='Escape')wiLinkClose()");
  m.innerHTML='<div id="wi-link-card" class="ov-data-card vi-pop-card" role="dialog" aria-modal="true" aria-labelledby="wi-link-title">'
    +'<div class="vi-pop-hd"><div class="ov-data-title" id="wi-link-title">Value</div><button class="inv-x" type="button" onclick="wiLinkClose()" aria-label="Close"><svg class="vi-ic g" aria-hidden="true"><use href="#vi-close"/></svg></button></div>'
    +'<div class="wi-link-kinds" role="radiogroup" aria-label="How this item is valued">'
    +'<label><input type="radio" name="wi-lk" value="manual" onchange="wiLinkKind()"> My own figure</label>'
    +'<label><input type="radio" name="wi-lk" value="metal" onchange="wiLinkKind()"> Precious metal by weight</label>'
    +'<label><input type="radio" name="wi-lk" value="holding" onchange="wiLinkKind()"> Shares or a fund</label>'
    +'<label><input type="radio" name="wi-lk" value="market" onchange="wiLinkKind()"> Second-hand prices (estimate)</label></div>'
    +'<p id="wi-link-guess" class="wi-link-hint wi-guess" aria-live="polite"></p>'
    +'<div id="wi-lk-manual" class="g-form" hidden><div><label class="ov-kpi-lbl" for="wl-own">Your figure (£)</label><input type="number" id="wl-own" class="al-inp" min="0" step="any" inputmode="decimal" oninput="wiLinkPreview()"></div></div>'
    +'<div id="wi-lk-metal" class="g-form" hidden>'
    +'<div><label class="ov-kpi-lbl" for="wl-metal">Metal</label><select id="wl-metal" class="al-inp" onchange="wiLinkPurity();wiLinkPreview()">'+Object.keys(wiMetals()).map(function(k){return '<option value="'+k+'">'+wiMetals()[k]+'</option>';}).join('')+'</select></div>'
    +'<div><label class="ov-kpi-lbl" for="wl-weight">Weight</label><input type="number" id="wl-weight" class="al-inp" min="0" step="any" inputmode="decimal" oninput="wiLinkPreview()"></div>'
    +'<div><label class="ov-kpi-lbl" for="wl-unit">Unit</label><select id="wl-unit" class="al-inp" onchange="wiLinkPreview()"><option value="g">grams</option><option value="oz">troy ounces</option></select></div>'
    +'<div><label class="ov-kpi-lbl" for="wl-purity">Purity</label><select id="wl-purity" class="al-inp" onchange="wiLinkPreview()"></select></div></div>'
    +'<div id="wi-lk-holding" class="g-form" hidden>'
    +'<div><label class="ov-kpi-lbl" for="wl-stock">Holding</label><select id="wl-stock" class="al-inp" onchange="wiLinkPreview()"></select></div>'
    +'<div><label class="ov-kpi-lbl" for="wl-units">Units</label><input type="number" id="wl-units" class="al-inp" min="0" step="any" inputmode="decimal" oninput="wiLinkPreview()"></div>'
    +'<p class="wi-link-hint">The price comes from that holding in Stocks and shares. Count these units here or there, not in both.</p></div>'
    +'<div id="wi-lk-market" hidden>'
    +'<div class="g-form"><div><label class="ov-kpi-lbl" for="wl-mq">Search words</label><input type="text" id="wl-mq" class="al-inp" maxlength="80" autocomplete="off" oninput="wiMkLinks()"></div>'
    +'<div><label class="ov-kpi-lbl" for="wl-mcat">Kind of item</label><select id="wl-mcat" class="al-inp"><option value="general">Anything else</option><option value="instruments">Guitars and instruments</option><option value="records">Records and music</option><option value="games">Games and consoles</option></select></div>'
    +'<div><label class="ov-kpi-lbl" for="wl-mcond">Condition</label><select id="wl-mcond" class="al-inp"><option value="new">New</option><option value="excellent">Excellent</option><option value="good">Good</option><option value="fair">Fair</option><option value="poor">Poor</option></select></div></div>'
    +'<button class="btn-add-data" type="button" id="wl-msearch" onclick="wiMkSearch()" style="margin-top:10px">Search second-hand prices</button>'
    +'<div id="wl-mres" class="wi-mres" aria-live="polite"></div>'
    +'<button class="btn-add-data" type="button" id="wl-mapply" onclick="wiMkApply()" hidden>Use this estimate</button>'
    +'<div id="wl-mlinks" class="wi-mlinks"></div>'
    +'<p class="wi-link-hint">An estimate from current asking prices, not a valuation or a sale price. It is only used if you tap Use this estimate. The item words, kind and condition go through our server to the price sources named in the Privacy Notice.</p></div>'
    +'<div id="wi-link-prev" class="wi-link-prev" aria-live="polite"></div>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn-add-data" type="button" onclick="wiLinkSave()">Save</button>'
    +'<button class="btn-add-data" type="button" style="background:transparent;border-color:var(--t3);color:var(--t3)" onclick="wiLinkClose()">Cancel</button></div>'
    +'<div id="wi-link-msg" class="vi-pop-msg" role="alert"></div>'
    +'<p class="wi-link-hint">Estimated market value, not an offer or a valuation. Not financial advice.</p></div>';
  document.body.appendChild(m);return m;
}
function wiLinkPurity(sel){
  var m=document.getElementById('wl-metal').value,p=document.getElementById('wl-purity');
  p.innerHTML=(wiPurity()[m]||[]).map(function(o){return '<option value="'+o[1]+'">'+o[0]+'</option>';}).join('');
  if(sel!=null){for(var i=0;i<p.options.length;i++)if(Math.abs(+p.options[i].value-sel)<1e-4)p.selectedIndex=i;}
}
function wiLinkKind(){
  var k=(document.querySelector('input[name="wi-lk"]:checked')||{}).value||'manual';
  document.getElementById('wi-lk-manual').hidden=k!=='manual';document.getElementById('wi-lk-metal').hidden=k!=='metal';document.getElementById('wi-lk-holding').hidden=k!=='holding';document.getElementById('wi-lk-market').hidden=k!=='market';if(k==='market')wiMkLinks();var gu=document.getElementById('wi-link-guess');if(gu)gu.style.display=k==='market'?'none':'';
  document.getElementById('wi-link-msg').textContent='';wiLinkPreview();
}
function wiLinkRead(){
  var k=(document.querySelector('input[name="wi-lk"]:checked')||{}).value||'manual';
  if(k==='metal'){var w=parseFloat(document.getElementById('wl-weight').value),u=document.getElementById('wl-unit').value,ps=document.getElementById('wl-purity');
    return {type:'metal',metal:document.getElementById('wl-metal').value,unit:u,grams:w>0?(u==='oz'?w*wiTroyG():w):0,purity:+ps.value,label:ps.options[ps.selectedIndex]?ps.options[ps.selectedIndex].text:''};}
  if(k==='holding'){var s=document.getElementById('wl-stock').value,un=parseFloat(document.getElementById('wl-units').value);return {type:'holding',stockId:s===''?null:+s,units:un>0?un:0};}
  if(k==='market'){var cur=invItem(_wiLinkId),pl=_wiMk||(cur&&cur.link&&cur.link.type==='market'?cur.link:null);return pl||{type:'market',v:0};}
  return null;
}
function wiLinkPreview(){
  var a=invItem(_wiLinkId),el=document.getElementById('wi-link-prev');if(!a||!el)return;
  var L=wiLinkRead();if(!L){var ow=parseFloat(document.getElementById('wl-own').value);el.textContent='Shown as your own figure: '+wiMoney(ow>0?ow:a.value)+'.';return;}
  if(L.type==='market'&&_wiMk){el.textContent='';return;}
  if(L.type==='market'&&!_wiMk&&!(L.v>0)){el.textContent='Search, then tap Use this estimate. Nothing changes until you do.';return;}
  var i=wiLinkInfo({value:a.value,link:L});
  el.textContent=i.ok?i.work+' ('+i.src+(i.at?', checked '+wiWhen(i.at):'')+')':i.note;
}
function wiLinkOpen(id){
  var a=invItem(id);if(!a)return;_wiLinkId=id;_wiLiab=false;document.getElementById('wi-link-modal')&&document.getElementById('wi-link-modal').classList.remove('wi-liab');_wiLinkReturn=document.activeElement;
  var m=wiLinkModal(),L=a.link||{};
  document.getElementById('wi-link-title').textContent='Value of '+a.name;
  var st=document.getElementById('wl-stock'),hs=alState.stocks||[];
  st.innerHTML=hs.length?hs.map(function(h){return '<option value="'+h.id+'">'+cfEsc((h.sym||'')+(h.name&&h.name!==h.sym?' · '+h.name:''))+'</option>';}).join(''):'<option value="">No holdings in Stocks and shares yet</option>';
  document.getElementById('wl-metal').value=L.metal||'gold';wiLinkPurity(L.purity);
  document.getElementById('wl-unit').value=L.unit||'g';
  document.getElementById('wl-weight').value=L.grams?(L.unit==='oz'?+(L.grams/wiTroyG()).toFixed(4):+(+L.grams).toFixed(3)):'';
  if(L.stockId!=null)st.value=String(L.stockId);document.getElementById('wl-units').value=L.units||'';
  document.getElementById('wl-own').value=+a.value>0?+a.value:'';
  _wiMk=null;document.getElementById('wl-mq').value=L.q||a.name||'';document.getElementById('wl-mcat').value=L.cat||wiMkGuessCat(a.name);
  document.getElementById('wl-mcond').value=a.cond||L.cond||'good';document.getElementById('wl-mres').textContent='';document.getElementById('wl-mapply').hidden=true;
  var k=L.type||'manual',gs=document.getElementById('wi-link-guess');gs.textContent='';
  if(!a.link){var g=wiGuessSource(a);k=g.kind;gs.textContent=g.why;
    if(g.kind==='metal'){document.getElementById('wl-metal').value=g.metal;wiLinkPurity();}
    if(g.kind==='holding')st.value=String(g.stockId);}document.querySelector('input[name="wi-lk"][value="'+k+'"]').checked=true;
  m.hidden=false;document.body.classList.add('vi-pop-open');wiLinkKind();
  setTimeout(function(){var f=document.querySelector('input[name="wi-lk"]:checked');if(f)f.focus();},30);
}
function wiLinkClose(){
  var m=document.getElementById('wi-link-modal');if(m)m.hidden=true;document.body.classList.remove('vi-pop-open');
  var back=_wiLinkReturn;_wiLinkReturn=null;_wiLinkId=null;_wiMk=null;_wiLiab=false;if(m)m.classList.remove('wi-liab');if(back&&back.focus)setTimeout(function(){try{back.focus();}catch(e){}},0);
}
function wiLinkSave(){if(viBlockEdit())return;
  if(_wiLiab){var lb=wiMkItem();if(lb){lb.cond=document.getElementById('wl-mcond').value;saveAL();}wiLinkClose();renderAlTab();showToast('Condition saved');return;}
  var a=invItem(_wiLinkId),msg=document.getElementById('wi-link-msg');if(!a)return;
  var L=wiLinkRead();
  if(L&&L.type==='market'){   // Save with the market kind keeps the estimate already applied and the condition; a new estimate needs its own tap
    if(!(a.link&&a.link.type==='market')){msg.textContent='Search, then tap Use this estimate.';return;}
    a.cond=document.getElementById('wl-mcond').value;saveAL();wiLinkClose();renderAlTab();updateKPIs();showToast(a.cond===a.link.cond?'Condition saved':'Condition saved. Search again to update the estimate');return;
  }
  if(L&&L.type==='metal'&&!(L.grams>0)){msg.textContent='Enter the weight.';document.getElementById('wl-weight').focus();return;}
  if(L&&L.type==='holding'&&L.stockId==null){msg.textContent='Add the holding in Stocks and shares first.';return;}
  if(L&&L.type==='holding'&&!(L.units>0)){msg.textContent='Enter how many units.';document.getElementById('wl-units').focus();return;}
  if(!L){var ow=parseFloat(document.getElementById('wl-own').value);if(!(ow>0)){msg.textContent='Enter your figure.';document.getElementById('wl-own').focus();return;}a.value=ow;}
  if(L){a.link=L;a.linkSnap=null;a.linkPrev=null;}else{delete a.link;delete a.linkSnap;delete a.linkPrev;}
  saveAL();wiLinkClose();renderAlTab();updateKPIs();
  showToast(L?'Value linked':'Back to your own figure');
}
/* E28 part 1 (v0.9.1): second-hand price estimate. The browser talks to Supabase only (secondhand-estimate); the result is shown,
   never applied until the user taps "Use this estimate". Only derived numbers are saved on the item (no listings). */
var _wiMk=null,_wiLiab=false;
function wiMkItem(){return _wiLiab?(alState.liabilities||[]).find(function(x){return x.id===_wiLinkId;}):invItem(_wiLinkId);}
/* Liabilities (E28, "as well as the liabilities"): the same search from a liability tile. depreciatedValue() is untouched. A tap sets the
   item's own value only when the item has no yearly depreciation of its own (otherwise the estimate would be counted twice); with a
   depreciation rate the estimate is shown for information only. */
function wiLiabOpen(id){
  var l=(alState.liabilities||[]).find(function(x){return x.id===id;});if(!l)return;
  _wiLinkId=id;_wiLiab=true;_wiLinkReturn=document.activeElement;_wiMk=null;
  var m=wiLinkModal();m.classList.add('wi-liab');
  document.getElementById('wi-link-title').textContent='Second-hand prices for '+l.name;
  document.getElementById('wl-mq').value=(l.est&&l.est.q)||l.name||'';document.getElementById('wl-mcat').value=wiMkGuessCat(l.name);
  document.getElementById('wl-mcond').value=l.cond||'good';document.getElementById('wl-mres').textContent='';document.getElementById('wl-mapply').hidden=true;
  document.getElementById('wi-link-msg').textContent='';
  ['wi-lk-manual','wi-lk-metal','wi-lk-holding'].forEach(function(i){document.getElementById(i).hidden=true;});
  document.getElementById('wi-lk-market').hidden=false;wiMkLinks();
  m.hidden=false;document.body.classList.add('vi-pop-open');
  setTimeout(function(){var f=document.getElementById('wl-mq');if(f)f.focus();},30);
}
function wiMkGuessCat(n){n=String(n||'').toLowerCase();
  if(/\b(guitar|les paul|stratocaster|telecaster|strat|bass|amp|amplifier|pedal|synth|synthesi[sz]er|drum|violin|piano|keyboard|ukulele|fender|gibson|marshall|ibanez)\b/.test(n))return 'instruments';
  if(/\b(vinyl|lp|album|record|cd)\b/.test(n))return 'records';
  if(/\b(ps[1-5]|playstation|xbox|nintendo|switch|n64|snes|game ?boy|console|mega drive|sega)\b/.test(n))return 'games';
  return 'general';}
function wiMkLinks(){
  var q=encodeURIComponent((document.getElementById('wl-mq').value||'').trim().slice(0,80)),el=document.getElementById('wl-mlinks');if(!el)return;
  el.innerHTML='<a href="https://www.ebay.co.uk/sch/i.html?LH_Sold=1&LH_Complete=1&_nkw='+q+'" target="_blank" rel="noopener noreferrer">Search eBay sold items</a>';   // v0.9.1 R21 (owner, 4 Nov): no Discogs search here
}
async function wiMkSearch(){
  var a=wiMkItem();if(!a)return;
  var q=document.getElementById('wl-mq').value.trim().slice(0,80),cond=document.getElementById('wl-mcond').value,cat=document.getElementById('wl-mcat').value;
  var res=document.getElementById('wl-mres'),ap=document.getElementById('wl-mapply'),btn=document.getElementById('wl-msearch');
  _wiMk=null;ap.hidden=true;wiMkLinks();
  if(q.length<2){res.textContent='Type what the item is first.';return;}
  btn.disabled=true;res.textContent='Searching…';
  var r=null;try{r=await _fnInvoke('secondhand-estimate',{q:q,cond:cond,cat:cat},15000);}catch(e){r=null;}
  btn.disabled=false;
  if(_wiLinkId!==a.id||!document.getElementById('wl-mres'))return;
  var d=r&&!r.error?r.data:null;res.textContent='';
  function line(t){var p=document.createElement('p');p.textContent=t;res.appendChild(p);return p;}
  if(!d||d.status==='unavailable'){line(_wiLiab?'Not available yet. You can still check prices yourself with the links below. Your figure is unchanged.':'Not available yet. You can still check prices yourself with the links below, then choose My own figure and type it.');return;}
  if(d.status==='busy'||d.status==='error'){line('Could not get an estimate just now. Try again in a minute, or use the links below.');return;}
  var ok=d.status==='ok'&&isFinite(d.value)&&d.value>0&&isFinite(d.low)&&isFinite(d.high);
  if(!ok){line('No reliable match found. Your figure is used. Try adding the model, year or colour, or pick a broader kind of item, or use the links below.');return;}
  var srcs=(d.sources||[]).concat(d.guides||[]);
  _wiMk={type:'market',v:Math.round(d.value),lo:Math.round(d.low),hi:Math.round(d.high),n:+d.n||0,at:Date.parse(d.checked)||Date.now(),q:q,cat:cat,cond:cond,haircut:+d.haircut||0,cf:+d.condFactor||1,combine:String(d.combine||''),
    srcs:srcs.map(function(x){return String(x.label||'').slice(0,40);}),srcd:srcs.map(function(x){return {l:String(x.label||'').slice(0,40),n:+x.n||0,m:Math.round(+x.median||0)};})};
  var i=wiLinkInfo({value:a.value,link:_wiMk}),when=new Date(_wiMk.at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
  line(i.work.split(' (')[0]+'.');
  line('From '+i.src.replace('Second-hand estimate (','').replace(/\)$/,'')+', checked '+when+'. '+(i.guide?'From a price guide, not a valuation, offer or sale price.':'Estimated from current asking prices, not a valuation, offer or sale price. Real sale prices are usually lower.')+' Not financial advice.');
  var dt=document.createElement('details');dt.innerHTML='<summary>Show working</summary>';var dv=document.createElement('div');dv.textContent=i.work+'.';dt.appendChild(dv);res.appendChild(dt);
  if(_wiLiab&&+a.depRate>0){line('This item already loses '+a.depRate+'% a year in your liabilities, so this estimate is for information only and is not applied.');wiLinkPreview();return;}
  ap.hidden=false;wiLinkPreview();
}
function wiMkApply(){if(viBlockEdit())return;
  var a=wiMkItem();if(!a||!_wiMk)return;
  if(_wiLiab){if(+a.depRate>0)return;   // never double-count an item that depreciates on its own
    if(a.estWas==null)a.estWas=+a.value||0;a.value=_wiMk.v;a.est={v:_wiMk.v,lo:_wiMk.lo,hi:_wiMk.hi,n:_wiMk.n,at:_wiMk.at,q:_wiMk.q,cond:_wiMk.cond,srcs:_wiMk.srcs};a.cond=document.getElementById('wl-mcond').value;
    saveAL();wiLinkClose();renderAlTab();updateKPIs();showToast('Estimate applied');return;}
  a.link=_wiMk;a.cond=document.getElementById('wl-mcond').value;a.linkSnap=null;a.linkPrev=null;
  saveAL();wiLinkClose();renderAlTab();updateKPIs();showToast('Estimate applied');
}
function invItem(id){return (alState.otherAssets||[]).find(function(x){return x.id===id;});}

// resize + compress a photo (keeps orientation); returns a JPEG Blob
function invProcess(file,max,q){
  return new Promise(function(res,rej){
    var fin=function(src,w,h){
      var k=Math.min(1,max/Math.max(w,h)),cw=Math.max(1,Math.round(w*k)),ch=Math.max(1,Math.round(h*k));
      var c=document.createElement('canvas');c.width=cw;c.height=ch;
      var x=c.getContext('2d');x.fillStyle='#0b1420';x.fillRect(0,0,cw,ch);x.drawImage(src,0,0,cw,ch);
      c.toBlob(function(b){b?res(b):rej(new Error('encode failed'));},'image/jpeg',q||0.78);
    };
    if(window.createImageBitmap){
      createImageBitmap(file,{imageOrientation:'from-image'}).then(function(bm){fin(bm,bm.width,bm.height);}).catch(function(){viaImg();});
    } else viaImg();
    function viaImg(){
      var u=URL.createObjectURL(file),im=new Image();
      im.onload=function(){fin(im,im.naturalWidth,im.naturalHeight);URL.revokeObjectURL(u);};
      im.onerror=function(){URL.revokeObjectURL(u);rej(new Error('not an image'));};
      im.src=u;
    }
  });
}
function invThumb(blob){
  return invProcess(blob,INV_THUMB,0.72).then(function(b){return new Promise(function(res){var r=new FileReader();r.onload=function(){res(r.result);};r.readAsDataURL(b);});});
}
function invDecode(blob){
  if(window.createImageBitmap)return createImageBitmap(blob);
  return new Promise(function(res,rej){var u=URL.createObjectURL(blob),im=new Image();im.onload=function(){res(im);};im.onerror=rej;im.src=u;});
}
function invFrames(id){ // decoded frames, cached per item
  if(_invCache[id])return _invCache[id];
  return (_invCache[id]=invGet(id).then(function(blobs){return Promise.all(blobs.map(invDecode));}).catch(function(){delete _invCache[id];return [];}));
}
async function invAddPhotos(id,files){
  var a=invItem(id);files=Array.prototype.slice.call(files||[]).filter(function(f){return /^image\//.test(f.type)||/\.(jpe?g|png|webp|heic)$/i.test(f.name||'');});
  if(!a||!files.length)return;
  try{
    var have=await invGet(id),room=INV_MAX-have.length;
    if(room<=0){showToast('Up to '+INV_MAX+' photos per item');return;}
    if(files.length>room){showToast('Only the first '+room+' photos were added (max '+INV_MAX+')');files=files.slice(0,room);}
    showToast('Processing '+files.length+' photo'+(files.length===1?'':'s')+'…');
    var blobs=[];for(var i=0;i<files.length;i++){try{blobs.push(await invProcess(files[i],INV_SIZE,0.78));}catch(e){}}
    if(!blobs.length){showToast('Those files could not be read as images');return;}
    var all=have.concat(blobs);
    await invPut(id,all);
    a.photos=all.length;
    a.image=await invThumb(all[0]);a.svgIcon=null;
    saveAL();renderAlTab();
    if(_invOpen===id)invRenderModal(id);
    showToast(all.length>=2?('✓ '+all.length+' photos. Drag the item to spin it in 3D'):'✓ Photo added. Add more angles to make it 3D');
  }catch(e){console.error('[Vault-It] photos',e);showToast('Could not save photos on this device');}
}
function wiUpload(id,input){if(viBlockEdit())return;invAddPhotos(id,input.files);try{input.value='';}catch(e){}}
async function invRemoveFrame(id,idx){
  var a=invItem(id),fr=await invGet(id);if(!a||idx<0||idx>=fr.length)return;
  fr.splice(idx,1);
  if(fr.length){await invPut(id,fr);a.photos=fr.length;if(idx===0)a.image=await invThumb(fr[0]);}
  else{await invDel(id);a.photos=0;a.image=null;}
  saveAL();renderAlTab();invRenderModal(id);
}
async function invMoveFrame(id,idx,dir){
  var a=invItem(id),fr=await invGet(id),j=idx+dir;if(!a||j<0||j>=fr.length)return;
  var t=fr[idx];fr[idx]=fr[j];fr[j]=t;
  await invPut(id,fr);if(idx===0||j===0)a.image=await invThumb(fr[0]);
  saveAL();renderAlTab();invRenderModal(id);
}

// ── turntable viewer: drag / swipe to spin between frames, wheel or pinch to zoom ──
function InvSpin(canvas,frames,opt){
  opt=opt||{};
  var me=this;me.c=canvas;me.f=frames;me.ang=0;me.vel=0;me.zoom=1;me.auto=!!opt.auto;me.ptr={};me.pinch=0;me.raf=0;me.last=0;me.idle=0;me.dead=false;
  me.c.style.touchAction='pan-y';me.c.style.cursor='grab';
  function cssW(){return me.c.getBoundingClientRect().width||me.c.clientWidth||200;}
  me.c.addEventListener('pointerdown',function(e){
    me.ptr[e.pointerId]={x:e.clientX,y:e.clientY};me.auto=false;me.vel=0;
    try{me.c.setPointerCapture(e.pointerId);}catch(_){}
    me.c.style.cursor='grabbing';
    if(Object.keys(me.ptr).length===2){var p=Object.keys(me.ptr).map(function(k){return me.ptr[k];});me.pinch=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}
  });
  me.c.addEventListener('pointermove',function(e){
    var p=me.ptr[e.pointerId];if(!p)return;
    var ids=Object.keys(me.ptr);
    if(ids.length===2){
      me.ptr[e.pointerId]={x:e.clientX,y:e.clientY};
      var q=ids.map(function(k){return me.ptr[k];}),d=Math.hypot(q[0].x-q[1].x,q[0].y-q[1].y);
      if(me.pinch>0)me.setZoom(me.zoom*d/me.pinch);me.pinch=d;
    } else {
      var dx=e.clientX-p.x;p.x=e.clientX;p.y=e.clientY;
      var d2=-dx/cssW()*me.f.length*(opt.gain||1);
      me.ang+=d2;me.vel=d2;me.draw();
    }
  });
  var up=function(e){delete me.ptr[e.pointerId];me.pinch=0;me.c.style.cursor='grab';if(!Object.keys(me.ptr).length&&Math.abs(me.vel)>0.02)me.kick();};
  me.c.addEventListener('pointerup',up);me.c.addEventListener('pointercancel',up);
  me.c.addEventListener('wheel',function(e){if(!opt.wheel)return;e.preventDefault();me.setZoom(me.zoom*(1-e.deltaY*0.0015));},{passive:false});
  me.draw();if(me.auto)me.kick();
}
InvSpin.prototype.setZoom=function(z){this.zoom=Math.max(1,Math.min(4,z));this.draw();};
InvSpin.prototype.kick=function(){var me=this;if(me.raf)return;me.last=performance.now();me.raf=requestAnimationFrame(function t(now){
  me.raf=0;if(me.dead||!document.body.contains(me.c))return;
  var dt=Math.min(50,now-me.last)/16.7;me.last=now;
  if(me.auto){me.ang+=0.025*dt*Math.max(1,me.f.length/12);}
  else if(Math.abs(me.vel)>0.005&&!Object.keys(me.ptr).length){me.ang+=me.vel*dt;me.vel*=Math.pow(0.93,dt);}
  else return;
  me.draw();me.raf=requestAnimationFrame(t);
});};
InvSpin.prototype.step=function(n){this.auto=false;this.ang=Math.round(this.ang)+n;this.draw();};
InvSpin.prototype.draw=function(){
  var c=this.c,r=c.getBoundingClientRect(),d=window.devicePixelRatio||1;
  var W=Math.max(40,Math.round((r.width||c.clientWidth||200)*d)),H=Math.max(40,Math.round((r.height||c.clientHeight||200)*d));
  if(c.width!==W||c.height!==H){c.width=W;c.height=H;}
  var x=c.getContext('2d'),N=this.f.length;
  x.globalAlpha=1;x.fillStyle='#0b1420';x.fillRect(0,0,W,H);
  if(!N)return;
  var a=((this.ang%N)+N)%N,i=Math.floor(a),t=a-i,j=(i+1)%N,z=this.zoom;
  var put=function(im,al){var s=Math.min(W/im.width,H/im.height)*z,dw=im.width*s,dh=im.height*s;x.globalAlpha=al;x.drawImage(im,(W-dw)/2,(H-dh)/2,dw,dh);};
  put(this.f[i],1);if(N>1&&t>0.001)put(this.f[j],t);
  x.globalAlpha=1;this.frame=i;
};
// small live viewers inside the inventory tiles
function invHydrate(){
  _invViews=_invViews.filter(function(v){if(!document.body.contains(v.c)){v.dead=true;return false;}return true;});
  var cs=document.querySelectorAll('canvas.inv-spin');
  if(!cs.length)return;
  var load=function(c){
    if(c._inv)return;c._inv=1;
    var id=+c.getAttribute('data-id');
    invFrames(id).then(function(fr){
      if(!document.body.contains(c))return;
      if(!fr.length){c.parentNode&&c.parentNode.classList.add('inv-missing');return;}
      var v=new InvSpin(c,fr,{});_invViews.push(v);
    });
  };
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){io.unobserve(e.target);load(e.target);}});},{rootMargin:'120px'});
    cs.forEach(function(c){io.observe(c);});
  } else cs.forEach(load);
}
// ── expanded viewport ──
/* Liabilities tiles expand like Wealth inventory ones (owner, 3 Nov): a 3D model opens the full orbit viewer, a photo opens large */
function liExpand(id){
  var l=(alState.liabilities||[]).find(function(x){return x.id===id;});if(!l)return;
  if(l.model)return i3dOpen('li',id);
  if(!l.image)return;
  invCloseViewer();var o=document.createElement('div');o.id='inv-modal';o.className='inv-modal';o.setAttribute('tabindex','-1');
  o.addEventListener('keydown',function(e){if(e.key==='Escape')invCloseViewer();});
  o.innerHTML='<div class="inv-card"><div class="inv-hd"><div><div class="inv-t">'+cfEsc(l.name)+'</div><div class="inv-s">'+gbpFmt(depreciatedValue(l))+'</div></div><button class="inv-x" onclick="invCloseViewer()" title="Close"><svg class="vi-ic g" role="img" aria-label="Close"><use href="#vi-close"/></svg></button></div><div class="inv-stage"><img class="inv-prev" src="'+cfEsc(l.image)+'" alt="'+cfEsc(l.name)+'"></div></div>';
  document.body.appendChild(o);o.focus();
}
async function invOpenViewer(id){
  var a=invItem(id);if(!a)return;
  invCloseViewer();
  _invOpen=id;
  var o=document.createElement('div');o.id='inv-modal';o.className='inv-modal';
  o.addEventListener('keydown',function(e){if(e.key==='Escape')invCloseViewer();else if(e.key==='ArrowLeft'&&_invSpin)_invSpin.step(-1);else if(e.key==='ArrowRight'&&_invSpin)_invSpin.step(1);});
  o.setAttribute('tabindex','-1');
  document.body.appendChild(o);o.focus();
  await invRenderModal(id);
}
function invCloseViewer(){
  var o=document.getElementById('inv-modal');if(o)o.remove();
  if(_invSpin){_invSpin.dead=true;_invSpin=null;}
  _invOpen=null;
}
async function invRenderModal(id){
  var o=document.getElementById('inv-modal'),a=invItem(id);if(!o||!a)return;
  var blobs=await invGet(id),frames=await invFrames(id);
  var urls=blobs.map(function(b){return URL.createObjectURL(b);});
  var n=blobs.length;
  /* owner, 31 Oct: the photos were missing when a tile was opened. Full photos live on the device they were added on (IndexedDB);
     the cloud copy and a new web address only carry the item's preview. Show that preview, and say where the photos are. */
  var prevOnly=n===0&&!!a.image;
  var hint=n===0?'Add photos taken from all around the object. Keep the same distance and height, moving in order.':n===1?'One photo so far. Add more angles (12–24 around the object works best) to unlock the 3D spin.':n<8?'Add a few more angles for a smoother spin: 12–24 works best.':'Drag left/right to spin · scroll or pinch to zoom · arrow keys step frame by frame.';
  var prev=_invSpin;
  o.innerHTML='<div class="inv-card">'
    +'<div class="inv-hd"><div><div class="inv-t">'+cfEsc(a.name)+'</div><div class="inv-s">£'+(a.value||0).toLocaleString('en-GB')+' · '+(prevOnly?'preview'+((a.photos||0)>0?' · '+a.photos+' photo'+(a.photos===1?'':'s')+' on another device':''):n+' photo'+(n===1?'':'s')+(n>=2?' · 3D view':''))+'</div></div>'
    +'<button class="inv-x" onclick="invCloseViewer()" title="Close"><svg class="vi-ic g" role="img" aria-label="Close"><use href="#vi-close"/></svg></button></div>'
    +'<div class="inv-stage"><canvas id="inv-big"'+(prevOnly?' hidden':'')+'></canvas>'+(prevOnly?'<img class="inv-prev" src="'+cfEsc(a.image)+'" alt="'+cfEsc(a.name)+'">':n===0?'<div class="inv-empty">No photos yet</div>':'')
    +'<div class="inv-ctl"><button title="Auto-rotate" onclick="invToggleAuto()" id="inv-auto"><svg class="vi-ic sm" role="img" aria-label="Auto-rotate"><use href="#vi-orbit"/></svg></button><button title="Zoom in" onclick="invZoom(0.35)"><svg class="vi-ic sm" role="img" aria-label="Zoom in"><use href="#vi-zoom-in"/></svg></button><button title="Zoom out" onclick="invZoom(-0.35)"><svg class="vi-ic sm" role="img" aria-label="Zoom out"><use href="#vi-zoom-out"/></svg></button><button title="Previous frame" onclick="_invSpin&&_invSpin.step(-1)"><svg class="vi-ic sm" role="img" aria-label="Previous frame" style="transform:rotate(90deg)"><use href="#vi-chevron"/></svg></button><button title="Next frame" onclick="_invSpin&&_invSpin.step(1)"><svg class="vi-ic sm" role="img" aria-label="Next frame" style="transform:rotate(-90deg)"><use href="#vi-chevron"/></svg></button></div></div>'
    +'<div class="inv-hint">'+(prevOnly&&(a.photos||0)>0?'This is the saved preview. The full photos ('+a.photos+') are kept on the device they were added on, and are not copied to your account or to a new web address. Add photos here to see them on this device.':prevOnly?'This is the item\'s picture. Add photos taken from all around it to make a 3D view.':hint)+'</div>'
    +'<div class="inv-strip">'+urls.map(function(u,i){return '<div class="inv-th"><img src="'+u+'" alt="photo '+(i+1)+'"><span class="inv-n">'+(i+1)+'</span>'
      +'<span class="inv-tb"><button onclick="invMoveFrame('+id+','+i+',-1)" title="Move earlier"'+(i===0?' disabled':'')+'>◀</button><button onclick="invRemoveFrame('+id+','+i+')" title="Delete photo"><svg class="vi-ic g" role="img" aria-label="Close"><use href="#vi-close"/></svg></button><button onclick="invMoveFrame('+id+','+i+',1)" title="Move later"'+(i===n-1?' disabled':'')+'>▶</button></span></div>';}).join('')
    +'<label class="inv-add"><svg class="vi-ic g" role="img" aria-label="Add"><use href="#vi-plus"/></svg><span>Add photos</span><input type="file" accept="image/*" multiple style="display:none" onchange="invAddPhotos('+id+',this.files);this.value=\'\'"></label></div>'
    +'</div>';
  var cv=document.getElementById('inv-big');
  if(prev)prev.dead=true;
  _invSpin=n?new InvSpin(cv,frames,{auto:n>=2,wheel:true,gain:1.15}):null;
  if(!n&&cv)new InvSpin(cv,[],{});
}
function invToggleAuto(){if(!_invSpin)return;_invSpin.auto=!_invSpin.auto;if(_invSpin.auto)_invSpin.kick();}
function invZoom(d){if(_invSpin)_invSpin.setZoom(_invSpin.zoom+d);}

