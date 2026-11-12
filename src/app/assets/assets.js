function renderAlTab(){
  try{var sa=document.getElementById('stk-shot-allow');if(sa)sa.textContent=viShotAllowance();}catch(e){}
  var ttEl=document.getElementById('tab-total-assets');
  if(ttEl)ttEl.textContent=gbpFmt(alTotalAssets()+totalAssets());
  // Sub-tab totals (each reflects the actual value of assets in that section)
  var stm=document.getElementById('subtab-total-metals');if(stm)stm.textContent=gbpFmt(alTotalMetals());
  var stc=document.getElementById('subtab-total-crypto');if(stc)stc.textContent=gbpFmt(alTotalCrypto());
  var stca=document.getElementById('subtab-total-cash');if(stca)stca.textContent=gbpFmt(alTotalCash());
  var sto=document.getElementById('subtab-total-other');if(sto)sto.textContent=gbpFmt(alTotalOther());
  try{stkRender();}catch(e){console.error('[Vault-It] stkRender',e);}
  // Liabilities: show depreciated asset value (what physical assets are currently worth)
  var stl=document.getElementById('subtab-total-liab');if(stl)stl.textContent=gbpFmt(alLiabAssetTotal());
  renderMetalsISO();
  try{crRender();}catch(e){console.error('[Vault-It] crRender',e);}
  // Cash accounts
  var cas=document.getElementById('cash-table');
  try{renderPhysicalCash();}catch(e){console.error('[Vault-It] physical cash',e);}
  if(cas){cas.innerHTML=caTableHtml();caAfterRender();}
  try{renderBizAccounts();}catch(e){console.error('[Vault-It] business accounts',e);}
  // Liabilities
  var ll=document.getElementById('liabilities-list');
  if(ll){
    if(!alState.liabilities||!alState.liabilities.length){
      ll.innerHTML='<div style="font-size:max(.6rem,var(--vi-fs-2));color:var(--t3);text-align:center;padding:20px">No liabilities added yet.</div>';
    } else {
      ll.innerHTML='<div class="wi-grid">'+alState.liabilities.map(function(l){
        var imgSrc=l.image||null;
        var iconDisplay=l.svgIcon||null;
        var imgHtml='';
        if(imgSrc){
          imgHtml='<img src="'+imgSrc+'" alt="'+l.name+'" onerror="this.style.display=\'none\'">';
        } else {
          imgHtml=generateAssetISO(l.name,viItemIcon(iconDisplay),'liab');
        }
        imgHtml+=i3dTile('li',l);
        if(l.model||imgSrc)imgHtml+='<button class="inv-exp" title="Expand: open the full viewer" aria-label="Expand '+cfEsc(l.name)+' to the full viewer" onclick="liExpand('+l.id+')">⤢</button>';
        var dv=depreciatedValue(l);
        return'<div class="wi-tile">'
          +'<div class="wi-img-area">'
          +imgHtml
          +'</div>'
          // Buttons UNDER the image
          +'<div style="display:flex;gap:4px;padding:5px 6px 2px;justify-content:center">'
          +'<label class="dep-btn" title="Upload photo" style="cursor:pointer;flex:1;text-align:center"><svg class="vi-ic wi-bi" role="img" aria-label="Upload photo"><use href="#vi-camera"/></svg><input type="file" accept="image/*" style="display:none" onchange="liabUpload('+l.id+',this)"></label>'
          +'<button class="dep-btn" onclick="liabSearch('+l.id+')" title="Search image" style="flex:1"><svg class="vi-ic wi-bi" role="img" aria-label="Search image"><use href="#vi-search"/></svg></button>'
          +'<button class="dep-btn" onclick="wiIcon('+l.id+',\'liab\')" title="Set icon" style="flex:1"><svg class="vi-ic wi-bi" role="img" aria-label="Set icon"><use href="#vi-palette"/></svg></button>'
          +'<button class="dep-btn i3d-btn" onclick="i3dPick(\'li\','+l.id+')" title="3D model" aria-label="3D model" style="flex:1">3D</button>'
          +'</div>'
          +'<div class="wi-info">'
          +'<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:4px">'
          +'<div class="wi-title" style="font-size:max(.55rem,var(--vi-fs-1))">'+l.name+'</div>'
          +'<div style="font-family:\'Share Tech Mono\',monospace;font-size:max(.52rem,var(--vi-fs-1));color:var(--re);font-weight:700;text-align:right;flex-shrink:0">'+gbpFmt(dv)+'</div>'
          +'</div>'
          +(l.runningCost>0?'<div class="wi-sub">'+gbpFmt(l.runningCost)+'/mo</div>':'')
          +i3dItemCredit(l)
          +(l.depRate>0?'<div class="wi-sub" style="color:var(--re)">↓'+l.depRate+'%/yr</div>':'')
          +(l.est&&l.est.v>0?'<div class="wi-sub" style="font-size:max(.55rem,var(--vi-fs-1))">'+(l.est.srcs&&l.est.srcs.length?'Estimate from '+cfEsc(l.est.srcs.join(', '))+': '+cfEsc(wiMoney(l.est.lo))+' to '+cfEsc(wiMoney(l.est.hi))+', '+cfEsc(l.est.cond||'good')+' condition':'Value set from a second-hand estimate, '+cfEsc(wiMoney(l.est.v)))+'</div>':'')
          +'<button class="wi-link-btn" type="button" onclick="wiLiabOpen('+l.id+')" aria-label="Second-hand prices for '+cfEsc(l.name)+'">Second-hand prices</button>'
          +'<button class="data-item-del" style="margin-top:4px;width:100%" onclick="delLiability('+l.id+')"><svg class="vi-ic g" aria-hidden="true"><use href="#vi-close"/></svg> Remove</button>'
          +'</div>'
          +'</div>';
      }).join('')+'</div>';
    }
  }
  // Wealth Inventory tiles
  var oaEl=document.getElementById('other-assets-list');
  if(oaEl){
    if(!alState.otherAssets||!alState.otherAssets.length){
      oaEl.innerHTML='<div style="font-size:max(.6rem,var(--vi-fs-2));color:var(--t3);text-align:center;padding:20px">No assets yet. Add your first wealth item below.</div>';
    } else {
      oaEl.innerHTML='<div class="wi-grid">'+alState.otherAssets.map(function(a){
        var imgSrc=a.image||null;
        var iconDisplay=a.svgIcon||null;
        var imgHtml='',spin=(a.photos||0)>=2;
        if(imgSrc){
          imgHtml='<img src="'+imgSrc+'" alt="'+cfEsc(a.name)+'" onerror="this.style.display=\'none\'" class="wi-open" title="Open the photo viewer" onclick="invOpenViewer('+a.id+')">';
        } else {
          imgHtml=generateAssetISO(a.name,viItemIcon(iconDisplay),'asset');
        }
        var i3=i3dTile('wi',a);if(i3){imgHtml+=i3;spin=false;}
        if(spin)imgHtml+='<canvas class="inv-spin" data-id="'+a.id+'" aria-label="3D view of '+cfEsc(a.name)+'. Drag to rotate"></canvas><span class="inv-badge">3D · '+a.photos+'</span>';
        if((a.photos||0)>=1||imgSrc||a.model)imgHtml+='<button class="inv-exp" title="Expand: open the full viewer" aria-label="Expand '+cfEsc(a.name)+' to the full viewer" onclick="'+(a.model?'i3dOpen(\'wi\','+a.id+')':'invOpenViewer('+a.id+')')+'">⤢</button>';
        return '<div class="wi-tile">'
          +'<div class="wi-img-area">'
          +imgHtml
          +'<div class="wi-img-overlay">'
          +'<label class="wi-img-btn" title="Add photos: several angles make a 3D view"><svg class="vi-ic wi-bi" role="img" aria-label="Add photos"><use href="#vi-camera"/></svg><input type="file" accept="image/*" multiple style="display:none" onchange="wiUpload('+a.id+',this)"></label>'
          +'<button class="wi-img-btn" onclick="wiSearch('+a.id+')" title="Search image"><svg class="vi-ic wi-bi" role="img" aria-label="Search image"><use href="#vi-search"/></svg></button>'
          +'<button class="wi-img-btn" onclick="wiIcon('+a.id+')" title="Pick icon"><svg class="vi-ic wi-bi" role="img" aria-label="Pick icon"><use href="#vi-palette"/></svg></button>'
          +'<button class="wi-img-btn i3d-btn" onclick="i3dPick(\'wi\','+a.id+')" title="3D model" aria-label="3D model">3D</button>'
          +'</div>'
          +'</div>'
          +'<div class="wi-info">'
          +'<div class="wi-name" title="'+a.name+'">'+a.name+'</div>'
          +'<div class="wi-val">'+wiMoney(wiValue(a))+'</div>'
          +i3dItemCredit(a)
          +wiLinkHtml(a)
          +'</div>'
          +'<button class="wi-del" onclick="delOtherAsset('+a.id+')"><svg class="vi-ic g" role="img" aria-label="Close"><use href="#vi-close"/></svg></button>'
          +'</div>';
      }).join('')+'</div>';
      try{invHydrate();}catch(e){console.error('[Vault-It] invHydrate',e);}
      if(_wiSnapDirty){_wiSnapDirty=false;setTimeout(saveAL,0);}
    }
  }
}
function addCrypto(){if(viBlockEdit())return;
  var sym=document.getElementById('cr-sym').value.trim().toUpperCase().slice(0,12);
  var amt=parseFloat(document.getElementById('cr-amt').value)||0;
  var pr=parseFloat(document.getElementById('cr-price').value)||0;
  var cost=parseFloat(document.getElementById('cr-cost').value)||0;
  var wal=viClean(document.getElementById('cr-wallet').value.trim()).slice(0,40);
  if(!sym)return;
  var coin={id:Date.now(),sym:sym,amount:amt,price:pr,priceSrc:'manual'};
  if(cost>0)coin.avgCost=cost;
  if(wal)coin.wallet=wal;
  if(pr>0)coin.addPx=pr;else coin.addPend=true;   // the entry price is the one typed, else the first live price that arrives
  alState.crypto.push(coin);
  setTimeout(function(){fetchCryptoPrices(true)},50);   // its live price straight away (the typed one stays only if none is found)
  ['cr-sym','cr-amt','cr-price','cr-cost','cr-wallet'].forEach(function(i){document.getElementById(i).value='';});
  saveAL();renderAlTab();updateKPIs();
}
function delCrypto(id){if(viBlockEdit())return;alState.crypto=alState.crypto.filter(function(c){return c.id!==id;});saveAL();renderAlTab();updateKPIs();}
function updateCryptoAmount(id,val){if(viBlockEdit())return;var c=alState.crypto.find(function(x){return x.id===id;});if(c){c.amount=parseFloat(val)||0;saveAL();renderAlTab();updateKPIs();}}
function crQty(q){q=+q||0;return q.toLocaleString('en-GB',{maximumFractionDigits:q>=100?2:8})}

// ── CRYPTO DASHBOARD (v0.9.1 E32): the Stocks dashboard for coins. Same tiles, wallets in place of pies, same allocation views. ──
// A coin is read through stkReturns / stkBasis as if it were a share (units = amount), so the tiles agree with Stocks.
// Saved coins keep their shape ({sym,amount,price}); wallet, avgCost and addPx are optional and only ever added, never rewritten.
var CR_DEFAULT_WALLET='My crypto';
var CR_COLORS=STK_COLORS.filter(function(c){return c!=='#3ecf8e';});   // green is kept for gains, so no wallet or coin is green
function crAmt(c){return +(c.amount!=null?c.amount:(c.qty!=null?c.qty:0))||0;}
function crSym(c){return String(c.sym||c.symbol||'').toUpperCase();}
function crWallet(c){return String(c.wallet||CR_DEFAULT_WALLET);}
function crShim(c){return{id:c.id,sym:crSym(c),name:c.name||'',units:crAmt(c),price:+c.price||0,avgCost:c.avgCost,addPx:c.addPx,manualPrice:c.priceSrc==='manual',pie:crWallet(c),change:c.change24h||0,_c:c};}
function crList(){return (alState.crypto||[]).filter(function(c){return c&&crSym(c);}).map(crShim);}
function crGroups(hs){
  var by={},order=[];
  hs.forEach(function(h){var k=h.pie;if(!by[k]){by[k]={p:{id:k,name:k},hs:[],v:0};order.push(k);}by[k].hs.push(h);by[k].v+=stkValue(h);});
  return order.map(function(k){return by[k];}).sort(function(a,b){return b.v-a.v;});
}
function crCoinBadge(h,px,col){
  var sym=h.sym,url=cryptoLogoUrl(sym),fb=stkMono(sym,col);
  return '<span class="stk-hl cr-hl" style="width:'+px+'px;height:'+px+'px;border-radius:50%">'
    +(url?'<img alt="" loading="lazy" referrerpolicy="no-referrer" src="'+stkEsc(url)+'" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><span class="stk-hl-fb" style="display:none;width:100%;height:100%">'+fb+'</span>':fb)+'</span>';
}
function crCoinHue(sym){var m=VI_COIN_SVG[sym]&&/<circle[^>]*fill='(#[0-9a-fA-F]{3,6})'/.exec(VI_COIN_SVG[sym]);if(!m)return '#d9a93a';var h=m[1].toLowerCase();if(h.length===4)h='#'+h[1]+h[1]+h[2]+h[2]+h[3]+h[3];if(h==='#000000')h='#3a3f4a';return h;}   // the coin's own colour from its logo (3 or 6 digit hex; a pure black logo gets graphite so the rim shows); gold only for a coin with no logo
function crCoin3d(h,px,col){var e='';for(var k=1;k<=14;k++)e+='<i class="cr-edge" style="--k:'+k+'"></i>';return '<span class="cr-coin" aria-hidden="true" style="--coin:'+crCoinHue(h.sym)+'">'+e+crCoinBadge(h,px,col)+'</span>';}
function crAllocView(){try{return localStorage.getItem('vi-cr-alloc')==='tree'?'tree':'bars';}catch(e){return 'bars';}}
function crSetAlloc(v){try{localStorage.setItem('vi-cr-alloc',v);}catch(e){}crRender();}
function crGrpOpen(w,n){var m=stkOpenMap(),k='cr:'+w;return m[k]===undefined?n<=1:!!m[k];}
function crToggleGrp(w,n){var m=stkOpenMap(),k='cr:'+w;m[k]=crGrpOpen(w,n)?0:1;try{localStorage.setItem('vi-stk-open',JSON.stringify(m));}catch(e){}crRender();}
function updateCryptoCost(id,val){if(viBlockEdit())return;var c=alState.crypto.find(function(x){return x.id===id;});if(!c)return;var v=parseFloat(val);if(v>0)c.avgCost=v;else delete c.avgCost;saveAL();renderAlTab();updateKPIs();}
function crRender(){
  var hs=crList().sort(function(a,b){return stkValue(b)-stkValue(a);});
  var total=hs.reduce(function(s,h){return s+stkValue(h);},0);
  var tot=document.getElementById('subtab-total-crypto');if(tot)tot.textContent=gbpFmt(alTotalCrypto());
  var wl=document.getElementById('cr-wallets');if(wl)wl.innerHTML=crGroups(hs).map(function(g){return '<option value="'+stkEsc(g.p.name)+'">';}).join('');
  // tiles
  var rr=stkReturns(hs),tm=stkTileMoney(total,rr.value,rr.invested),up=tm.chgN>=0,hasRet=rr.counted.length>0;
  var nm=function(w){var l=rr.left.filter(function(x){return x.why===w;});return l.length<=2?l.map(function(x){return stkEsc(x.sym);}).join(' and '):l.length;};
  var leftTxt=(rr.suspect?nm('cost')+' left out: check '+(rr.suspect===1?'its':'their')+' cost':'')+(rr.suspect&&rr.noBasis?' · ':'')+(rr.noBasis?nm('none')+(rr.noBasis===1?' has':' have')+' no entry price yet':'');
  var dayChg=hs.reduce(function(s,h){var v=stkValue(h),c=+h.change||0;return s+(c?v-v/(1+c/100):0);},0),dUp=dayChg>=0,dayPct=total>0?dayChg/(total-dayChg)*100:0;
  var slices=hs.filter(function(h){return stkValue(h)>0;}).map(function(h,i){return{v:stkValue(h),c:CR_COLORS[i%CR_COLORS.length],t:h.sym};});
  var main=document.getElementById('cr-main');
  if(main){
    main.innerHTML='<div>'+stkDonut(slices,total,gbpFmt(total),(hasRet&&tm.invP>0)?((up?'+':'')+(tm.chgP/tm.invP*100).toFixed(2)+'%'):'',up?'#3ecf8e':'#e05c5c','Crypto allocation')+'</div>'
      +'<div class="stk-stats">'
      +'<div class="stk-stat"><div class="l">Current value</div><div class="v">'+tm.val+'</div><div class="s">'+hs.length+' coin'+(hs.length===1?'':'s')+' · counts towards net worth</div></div>'
      +'<div class="stk-stat"><div class="l">Invested (at the time you added it)</div><div class="v">'+(hasRet?tm.inv:'–')+'</div><div class="s">'+(hasRet?(leftTxt||'what your coins cost when you added them'):(leftTxt||'add a coin to see what went in'))+'</div></div>'
      +'<div class="stk-stat" style="background:'+(hasRet?(tm.chgP===0?'rgb(var(--teal-rgb) / .06)':up?'rgb(var(--green-rgb) / .07)':'rgb(var(--red-rgb) / .08)'):'rgb(var(--teal-rgb) / .06)')+'"><div class="l">Change since you added it</div><div class="v" style="color:'+(hasRet&&tm.chgP!==0?(up?'var(--green)':'var(--red)'):'var(--t3)')+'">'+(hasRet?tm.chg:'–')+'</div><div class="s">'+(hasRet?(rr.left.length?'on '+rr.counted.length+' of '+(rr.counted.length+rr.left.length)+' holdings':(tm.invP>0?((tm.chgP>=0?'+':'')+(tm.chgP/tm.invP*100).toFixed(1)+'% on what you put in'):'')):'shows once a coin has a price')+'</div></div>'
      +'<div class="stk-stat"><div class="l">Today</div><div class="v" style="color:'+(dayChg?(dUp?'var(--green)':'var(--red)'):'var(--t3)')+'">'+(dayChg?((dUp?'+':'−')+cfMoney(Math.abs(dayChg))):'–')+'</div><div class="s">'+(dayChg?((dUp?'+':'')+dayPct.toFixed(2)+'% in 24 h'):'refresh for live moves')+'</div></div>'
      +'</div>';
  }
  // holdings, grouped by wallet
  var ct=document.getElementById('crypto-table'),gs=crGroups(hs);
  if(ct){
    if(!hs.length)ct.innerHTML='<div style="font-size:max(.58rem,var(--vi-fs-2));color:var(--t3);text-align:center;padding:18px">No coins yet. Add one below.</div>';
    else ct.innerHTML='<div class="stk-tbl cr-tbl">'
      +gs.map(function(g,gi){var open=crGrpOpen(g.p.id,gs.length);
        return '<div class="stk-grp'+(open?' open':'')+'"><button type="button" class="stk-gh" aria-expanded="'+open+'" data-w="'+stkEsc(g.p.id)+'" data-n="'+gs.length+'" onclick="crToggleGrp(this.dataset.w,+this.dataset.n)"><svg class="vi-ic stk-chev" aria-hidden="true"><use href="#vi-chevron"/></svg><span class="stk-gn">'+stkEsc(g.p.name)+'</span><span class="stk-gc">'+g.hs.length+' coin'+(g.hs.length===1?'':'s')+'</span><span class="stk-gv">'+cfMoney(g.v)+(total>0?' <small>'+(g.v/total*100).toFixed(1)+'%</small>':'')+'</span></button>'
          +'<div class="stk-gb"'+(open?'':' hidden')+'><div class="cr-grid">'+g.hs.map(function(h){var c=h._c,i=hs.indexOf(h),col=CR_COLORS[gi%CR_COLORS.length];
            var v=stkValue(h),sus=stkSuspect(h),b=stkBasis(h),pl=(!sus&&b>0)?(stkPrice(h)-b)/b*100:null,cid=c.id,ch=+c.change24h||0;
            return '<div class="cr-row cr-tile" style="--i:'+i+'">'
              +'<div class="c-tk">'+crCoin3d(h,96,col)+'<div class="stk-tkb"><div class="stk-tk"><i style="background:'+crCoinHue(h.sym)+'"></i>'+stkEsc(h.sym)+'</div><div class="stk-nm cr-held">'+crQty(h.units)+' '+stkEsc(h.sym)+' held</div></div></div>'
              +'<div class="c-pr"><span class="stk-lb">Price £</span>'+(c.priceSrc==='live'?'<div class="stk-px">£'+(+c.price).toLocaleString('en-GB',{maximumFractionDigits:c.price<1?6:2})+'</div>':'<input class="stk-inp" type="number" min="0" step="any" value="'+(+c.price>0?c.price:'')+'" onchange="updateCryptoPrice('+cid+',this.value)" aria-label="'+stkEsc(h.sym)+' price in pounds" title="Your price in £. A live price replaces it when CoinGecko has one">')+'<div class="stk-src cr-src cr-src-'+(c.priceSrc==='live'?'live':c.priceSrc==='stale'?'stale':'own')+'">'+crPriceLine(c)+(ch&&c.priceSrc==='live'?' <span class="cr-ch" style="color:'+(ch>=0?'var(--green)':'var(--red)')+'">'+(ch>=0?'+':'')+ch.toFixed(2)+'%</span>':'')+'</div></div>'
              +'<div class="cr-ins">'
              +'<div class="c-un"><span class="stk-lb">Amount</span><input class="stk-inp" type="number" min="0" step="any" value="'+h.units+'" onchange="updateCryptoAmount('+cid+',this.value)" aria-label="'+stkEsc(h.sym)+' amount held" title="Editable: how much you hold"></div>'
              +'<div class="c-av"><span class="stk-lb">Cost per unit £</span><input class="stk-inp" type="number" min="0" step="any" value="'+(+c.avgCost>0?c.avgCost:'')+'" placeholder="'+(+c.addPx>0?(+c.addPx).toFixed(c.addPx<1?6:2).replace(/\.?0+$/,''):'–')+'" onchange="updateCryptoCost('+cid+',this.value)" aria-label="'+stkEsc(h.sym)+' cost per unit" title="'+(+c.addPx>0&&!(+c.avgCost>0)?'Empty, so the price when you added it is used. Type what you paid per coin in £ to use that instead':'What you paid for one coin, in £')+'"></div>'
              +'</div>'
              +'<div class="stk-val c-va"><span class="stk-lb">Value</span>'+cfMoney(v)+'</div>'
              +(sus?'<div class="stk-pl c-pl"><button type="button" class="stk-chk" onclick="stkCheckCost(this)" title="Your cost per unit is more than 3 times today’s price. It should be the price you paid per coin, in £ (not the total)">Check your cost per unit</button></div>'
                :'<div class="stk-pl c-pl" style="color:'+(pl==null?'var(--t3)':pl>=0?'var(--green)':'var(--red)')+'">'+(pl==null?'–':(pl>=0?'+':'')+pl.toFixed(1)+'%')+'</div>')
              +'<button class="data-item-del c-x" style="width:auto;padding:4px 8px;font-size:max(.5rem,var(--vi-fs-1));white-space:nowrap;opacity:1;border:1px solid rgb(var(--red-rgb) / .45);border-radius:4px" onclick="delCrypto('+cid+')" title="Remove this coin"><svg class="vi-ic g" aria-hidden="true"><use href="#vi-close"/></svg> Remove</button></div>';
          }).join('')+'</div></div></div>';
      }).join('')+'</div>';
  }
  // allocation: Bars or Tree map
  var al=document.getElementById('cr-alloc');
  if(al){
    var av=crAllocView();
    al.style.display=hs.length?'':'none';
    al.innerHTML='<div class="stk-hd"><span>Allocation</span><div class="nw3d-seg" role="group" aria-label="Allocation view"><button type="button" aria-pressed="'+(av==='bars')+'" onclick="crSetAlloc(\'bars\')">Bars</button><button type="button" aria-pressed="'+(av==='tree')+'" onclick="crSetAlloc(\'tree\')">Tree map</button></div></div>'
      +(av==='tree'?'<div class="stk-tm-key" id="cr-tm-key"></div><div class="dtm stk-tm" id="cr-treemap"></div><div class="stk-tm-other" id="cr-tm-other"></div>':hs.filter(function(h){return stkValue(h)>0;}).map(function(h,i){
        var p=total>0?stkValue(h)/total*100:0,c=CR_COLORS[i%CR_COLORS.length];
        return '<div class="stk-bar"><span class="t">'+stkEsc(h.sym)+'</span><span class="b"><div style="width:'+p.toFixed(1)+'%;background:'+c+'"></div></span><span class="p">'+p.toFixed(1)+'%</span></div>';
      }).join(''));
    if(av==='tree'){crDrawTreemap();if(!al._ro&&window.ResizeObserver){al._ro=new ResizeObserver(function(){if(crAllocView()==='tree'&&al.clientWidth!==al._rw){al._rw=al.clientWidth;crDrawTreemap();}});al._ro.observe(al);}}
  }
}
function crDrawTreemap(){
  var el=document.getElementById('cr-treemap'),key=document.getElementById('cr-tm-key'),lg=document.getElementById('cr-tm-other');if(!el)return;
  var W=el.parentElement.clientWidth-(parseFloat(getComputedStyle(el.parentElement).paddingLeft)||0)*2;
  if(!(W>80))return;
  var H=Math.round(Math.max(360,Math.min(640,W*.9))),fs=W>=560?12:11;el.style.height=H+'px';el.style.width=W+'px';el.style.setProperty('--tm-fs',fs+'px');
  var all=crList().filter(function(h){return stkValue(h)>0;}),tot=all.reduce(function(a,h){return a+stkValue(h);},0);
  if(!all.length||!(tot>0)){el.innerHTML='<div class="dtm-empty">No priced coins yet</div>';if(key)key.innerHTML='';if(lg)lg.innerHTML='';return;}
  var gs=crGroups(all),col={};gs.forEach(function(g,i){col[g.p.id]=CR_COLORS[i%CR_COLORS.length];});
  if(key)key.innerHTML=gs.map(function(g){return '<span class="stk-tm-k"><i style="background:'+col[g.p.id]+'"></i>'+stkEsc(g.p.name)+' <b>'+(g.v/tot*100).toFixed(0)+'%</b></span>';}).join('');
  var money=function(v){return cfMoney(v);},pct=function(v){return (v/tot*100).toFixed(1);};
  var groups=gs.map(function(g){return{id:g.p.id,p:g.p,col:col[g.p.id],v:g.v,items:g.hs.map(function(h){var v=stkValue(h),r=stkReturns([h]),chg=r.counted.length?' · '+(r.change>=0?'+':'-')+cfMoney(Math.abs(r.change))+' since added':'';
    return{h:h,v:v,name:h.sym,val:money(v),pct:pct(v),logo:function(px,c){return crCoinBadge(h,px,c);},title:h.sym+' · '+g.p.name+' · '+money(v)+' ('+pct(v)+'%)'+chg};})};});
  dtmPaintMap(el,lg,dtmFitMap(groups,W,H,{fs:fs,money:money,pct:pct}));
}
function addCashAccount(){if(viBlockEdit())return;
  var n=document.getElementById('ca-name').value.trim();
  var t=document.getElementById('ca-type').value;
  var b=(parseFloat(document.getElementById('ca-bal').value)||0)/(window.VI_CURRENCY_RATE||1);
  if(!n)return;
  var acc={id:Date.now(),name:n,type:t,balance:b};
  if(alBizKinds().hasOwnProperty(t)){acc.kind=t;acc.type=alBizKinds()[t];}
  var rt=parseFloat((document.getElementById('ca-rate')||{}).value);
  if(isFinite(rt)&&rt>=0&&rt<=100)acc.rate=rt;
  alState.cashAccounts.push(acc);
  document.getElementById('ca-name').value='';document.getElementById('ca-bal').value='';var _cr=document.getElementById('ca-rate');if(_cr)_cr.value='';
  alCashChanged();
}
function alCashChanged(){saveAL();renderAlTab();updateKPIs();renderCashISO();}
function alCashAcc(id){return (alState.cashAccounts||[]).find(function(a){return a.id===id;});}
// Change an account's type from Assets: a Business type sets its kind, a personal type removes it.
function alSetCashType(id,v){if(viBlockEdit())return;var a=alCashAcc(id);if(!a)return;
  if(alBizKinds().hasOwnProperty(v)){a.kind=v;a.type=alBizKinds()[v];}else{delete a.kind;a.type=v;}
  alCashChanged();
}
function alSetCashBalance(id,v){if(viBlockEdit())return;var a=alCashAcc(id);if(!a)return;
  a.balance=(parseFloat(v)||0)/(window.VI_CURRENCY_RATE||1);alCashChanged();
}
// The type cell in the cash table: the four personal types (plus any older one the account already has) and the Business pair.
function alCashTypeSel(a){
  var cur=alIsBizAcc(a)?a.kind:String(a.type||'Current'),opts=['Current','Savings','ISA','LISA'];
  if(!alIsBizAcc(a)&&opts.indexOf(cur)<0)opts.unshift(cur);
  var o=function(v,t){return '<option value="'+cfEsc(v)+'"'+(v===cur?' selected':'')+'>'+cfEsc(t)+'</option>';};
  return '<select class="cash-type-sel" id="cash-type-'+a.id+'" aria-label="Type of '+cfEsc(a.name)+'" onchange="alSetCashType('+a.id+',this.value)">'
    +opts.map(function(v){return o(v,v);}).join('')+'<optgroup label="Business">'+Object.keys(alBizKinds()).map(function(k){return o(k,alBizKinds()[k]);}).join('')+'</optgroup></select>';
}
// Entrepreneur tab: the Business accounts card (its two totals, each account with its balance to edit, and the add row).
function renderBizAccounts(){
  var el=document.getElementById('biz-acc-list');if(!el)return;
  var cur=document.getElementById('biz-acc-current'),sav=document.getElementById('biz-acc-savings'),r=window.VI_CURRENCY_RATE||1;
  if(cur)cur.textContent=gbpFmt(alTotalBizCash('biz-current'));if(sav)sav.textContent=gbpFmt(alTotalBizCash('biz-savings'));
  var accs=(alState.cashAccounts||[]).filter(alIsBizAcc);
  el.innerHTML=accs.length?accs.map(function(a){
    return '<div class="ba-row"><span class="cash-acc ba-n">'+viBankLogo(a.name)+'<span>'+cfEsc(a.name)+'</span></span>'
      +'<span class="ba-t">'+alBizKinds()[a.kind]+'</span>'
      +'<input type="number" step="0.01" inputmode="decimal" class="ba-bal" id="ba-bal-'+a.id+'" value="'+(Math.round((+a.balance||0)*r*100)/100)+'" aria-label="Balance of '+cfEsc(a.name)+'" onchange="alSetCashBalance('+a.id+',this.value)" onkeydown="if(event.key===\'Enter\')this.blur()">'
      +'<button class="data-item-del" onclick="delCashAccount('+a.id+')" aria-label="Remove '+cfEsc(a.name)+'"><svg class="vi-ic g" aria-hidden="true"><use href="#vi-close"/></svg></button></div>';
  }).join(''):'<div class="ba-empty">No business accounts yet. Add your business current or savings account below.</div>';
}
function bizAddAccount(){if(viBlockEdit())return;
  var ne=document.getElementById('ba-name'),n=ne.value.trim(),k=document.getElementById('ba-kind').value,be=document.getElementById('ba-bal');
  if(!n){ne.focus();return;}
  if(!alBizKinds().hasOwnProperty(k))return;
  alState.cashAccounts.push({id:Date.now(),name:n,type:alBizKinds()[k],kind:k,balance:(parseFloat(be.value)||0)/(window.VI_CURRENCY_RATE||1)});
  ne.value='';be.value='';alCashChanged();
}
// v0.9.1 E15/E16 cash accounts. Optional `rate` (AER %, the user's own number) and a `moves` list [{id,amount (signed GBP),date}] per
// account; both are additive, so old saves load as they are. Every sum is in whole pence; the interest is an illustrative estimate
// (balance x AER) and is never added to cash or net worth. A take-out above the balance is refused: overdrafts belong in the Debt tracker.
var caMv=null,caUndoT=null,caLast=null;
function caP(x){return Math.round((+x||0)*100);}
function caFmt(p){var r=window.VI_CURRENCY_RATE||1,sy=window.VI_CURRENCY_SYMBOL||'£',v=(p/100)*r,whole=Math.abs(v-Math.round(v))<0.005;return (v<0?'-':'')+sy+Math.abs(v).toLocaleString('en-GB',{minimumFractionDigits:whole?0:2,maximumFractionDigits:2});}
function caInterest(a){var r=+a.rate;if(!(r>0)||!isFinite(r))return null;var bp=Math.max(0,caP(a.balance));return {year:Math.round(bp*r/100),month:Math.round(bp*r/1200)};}
function caToday(){var d=new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);}
function caRowHtml(a){
  var it=caInterest(a),open=caMv&&caMv.id===a.id,mv=(a.moves||[]).slice().sort(function(x,y){return (y.date||'').localeCompare(x.date||'')||y.id-x.id;});
  var rate=(a.rate===0||+a.rate>0)?a.rate:'';
  return '<tr data-ca="'+a.id+'"><td class="ca-cell"><span class="cash-acc">'+viBankLogo(a.name)+'<span>'+cfEsc(a.name)+'</span></span>'
    +'<div class="ca-sub"><label class="ca-rate"><span>Interest rate (AER)</span><input class="ca-rate-in" type="number" min="0" max="100" step="0.01" inputmode="decimal" value="'+rate+'" placeholder="none" aria-label="Interest rate (AER), percent, for '+cfEsc(a.name).replace(/"/g,'&quot;')+'" onchange="caSetRate('+a.id+',this.value)"></label>'
    +(it?'<span class="ca-int">Interest '+caFmt(it.year)+' a year (estimate), '+caFmt(it.month)+' a month</span>':'')+'</div>'
    +'<div class="ca-act"><button type="button" class="ca-add" onclick="caMoveOpen('+a.id+',1)">+ Add</button><button type="button" class="ca-out" onclick="caMoveOpen('+a.id+',-1)">− Take out</button></div>'
    +(open?'<div class="ca-mv" role="group" aria-label="'+(caMv.sign>0?'Add money to':'Take money out of')+' this account"><input class="ca-mv-amt" type="number" min="0" step="0.01" inputmode="decimal" placeholder="Amount £" aria-label="Amount" value="'+(caMv.amt||'')+'" oninput="caMv.amt=this.value" onkeydown="if(event.key===\'Enter\')caMoveDo('+a.id+')"><input class="ca-mv-date" type="date" aria-label="Date" value="'+(caMv.date||caToday())+'" onchange="caMv.date=this.value"><button type="button" class="ca-mv-ok" onclick="caMoveDo('+a.id+')">'+(caMv.sign>0?'Add':'Take out')+'</button><button type="button" class="ca-mv-no" onclick="caMoveClose()">Cancel</button><div class="ca-mv-msg vi-pop-msg" role="status"></div></div>':'')
    +(mv.length?'<details class="ca-log"><summary>Movements ('+mv.length+')</summary>'+mv.slice(0,8).map(function(m){var inn=(+m.amount||0)>=0,d=m.date?new Date(m.date+'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'';return '<div class="ca-log-l"><span>'+d+'</span><span class="'+(inn?'in':'out')+'">'+(inn?'+':'−')+caFmt(Math.abs(caP(m.amount)))+'</span></div>';}).join('')+'</details>':'')
    +'</td><td class="ca-type">'+alCashTypeSel(a)+'</td><td class="ca-bal">'+caFmt(caP(a.balance))+'</td><td class="ca-del"><button class="data-item-del" onclick="delCashAccount('+a.id+')" aria-label="Remove this account"><svg class="vi-ic g" role="img" aria-label="Close"><use href="#vi-close"/></svg></button></td></tr>';
}
function caTableHtml(){
  var L=alState.cashAccounts||[];
  if(!L.length)return '<div style="font-size:max(.6rem,var(--vi-fs-2));color:var(--t3);text-align:center;padding:16px">No accounts added yet</div>';
  return '<table class="ca-tbl"><thead><tr><th class="ca-th">Account</th><th class="ca-th">Type</th><th class="ca-th ca-bal">Balance</th><th></th></tr></thead><tbody>'+L.map(caRowHtml).join('')+'</tbody></table>';
}
function caAfterRender(){
  var yr=0,any=false;(alState.cashAccounts||[]).forEach(function(a){var it=caInterest(a);if(it){yr+=it.year;any=true;}});
  var w=document.getElementById('ca-int-wrap'),t=document.getElementById('ca-int-total');
  if(w)w.hidden=!any;if(t)t.textContent=any?caFmt(yr)+' a year (estimate)':'';
}
function caRedraw(){setTimeout(function(){try{renderAlTab();}catch(e){console.error('[Vault-It] cash accounts',e);}},0);}  // after the change event settles: a render during blur throws
function caSetRate(id,v){if(viBlockEdit()){caRedraw();return;}
  var a=alState.cashAccounts.find(function(x){return x.id===id;});if(!a)return;
  v=String(v==null?'':v).trim();
  if(v==='')delete a.rate;else{var n=parseFloat(v);if(!(n>=0&&n<=100)){caRedraw();return;}a.rate=n;}
  saveAL();caRedraw();
}
function caMoveOpen(id,sign){if(viBlockEdit())return;
  if(caMv&&caMv.id===id&&caMv.sign===sign)return;
  caMv={id:id,sign:sign,amt:'',date:caToday()};renderAlTab();
  var f=document.querySelector('#cash-table tr[data-ca="'+id+'"] .ca-mv-amt');if(f)try{f.focus({preventScroll:true});}catch(e){}
}
function caMoveClose(){caMv=null;renderAlTab();}
function caToDebts(){caMv=null;try{showTab('debt');}catch(e){}return false;}
function caMoveDo(id){if(viBlockEdit())return;
  var a=alState.cashAccounts.find(function(x){return x.id===id;});if(!a||!caMv||caMv.id!==id)return;
  var row=document.querySelector('#cash-table tr[data-ca="'+id+'"]'),msg=row&&row.querySelector('.ca-mv-msg');
  var amt=(parseFloat((row.querySelector('.ca-mv-amt')||{}).value)||0)/(window.VI_CURRENCY_RATE||1),ap=caP(amt),bp=caP(a.balance),sign=caMv.sign;
  var date=(row.querySelector('.ca-mv-date')||{}).value||caToday();
  if(!(ap>0)){if(msg)msg.textContent='Enter an amount above zero.';return;}
  if(sign<0&&ap>bp){if(msg)msg.innerHTML='Only '+caFmt(bp)+' is in this account. <a href="#" onclick="return caToDebts()">Overdraft? Add it in the Debt tracker</a>';return;}
  var mv={id:Date.now(),amount:sign*ap/100,date:date};
  a.moves=(a.moves||[]);a.moves.push(mv);a.balance=(bp+sign*ap)/100;
  caMv=null;caLast={acc:id,mv:mv.id};
  saveAL();renderAlTab();updateKPIs();
  if(typeof v3CashLand==='function'){try{v3CashLand(sign*ap/100,id);}catch(e){}}  // chunk A hook: coins land or lift on the plate; no-op when 3D is off
  renderCashISO();
  caUndoShow((sign>0?'Added ':'Took out ')+caFmt(ap)+(sign>0?' to ':' from ')+a.name);
}
function caUndoShow(text){
  var el=document.getElementById('ca-undo');
  if(!el){el=document.createElement('div');el.id='ca-undo';el.setAttribute('role','status');el.innerHTML='<span class="ca-undo-t"></span><button type="button" class="ca-undo-btn" onclick="caUndoDo()">Undo</button>';document.body.appendChild(el);}
  el.querySelector('.ca-undo-t').textContent=text;el.classList.add('show');clearTimeout(caUndoT);caUndoT=setTimeout(caUndoHide,6000);
}
function caUndoHide(){var el=document.getElementById('ca-undo');if(el)el.classList.remove('show');caLast=null;}
function caUndoDo(){if(viBlockEdit())return;
  var l=caLast;if(!l){caUndoHide();return;}
  var a=alState.cashAccounts.find(function(x){return x.id===l.acc;}),m=a&&(a.moves||[]).find(function(x){return x.id===l.mv;});
  if(!a||!m){caUndoHide();return;}
  var np=caP(a.balance)-caP(m.amount);
  if(np<0){showToast('Cannot undo: it would take the account below zero.');caUndoHide();return;}
  a.moves=a.moves.filter(function(x){return x.id!==l.mv;});if(!a.moves.length)delete a.moves;
  a.balance=np/100;caUndoHide();
  saveAL();renderAlTab();updateKPIs();renderCashISO();
}
// Physical cash log: each line is money put in (+) or taken out (-), with where it is kept and the date.
function pcAdd(sign){if(viBlockEdit())return;
  var amt=(parseFloat((document.getElementById('pc-amt')||{}).value)||0)/(window.VI_CURRENCY_RATE||1);
  var msg=document.getElementById('pc-msg');
  if(!(amt>0)){if(msg)msg.textContent='Enter an amount above zero.';return;}
  var where=(document.getElementById('pc-where')||{}).value||'Wallet';
  var held=alTotalPhysicalAt(where);
  if(sign<0&&amt>held+0.005){if(msg)msg.textContent='Only '+gbpFmt(held)+' is logged in '+where.toLowerCase()+'.';return;}
  var d=(document.getElementById('pc-date')||{}).value||new Date().toISOString().slice(0,10);
  alState.physicalCash=alState.physicalCash||[];
  alState.physicalCash.push({id:Date.now(),where:where,amount:sign*amt,date:d});
  document.getElementById('pc-amt').value='';if(msg)msg.textContent='';
  saveAL();renderAlTab();updateKPIs();renderCashISO();
}
function alTotalPhysicalAt(where){return (alState.physicalCash||[]).filter(function(e){return e.where===where;}).reduce(function(s,e){return s+(+e.amount||0);},0);}
function pcDel(id){if(viBlockEdit())return;
  var e=(alState.physicalCash||[]).find(function(x){return x.id===id;});if(!e)return;
  var msg=document.getElementById('pc-msg');
  if((+e.amount||0)>0&&alTotalPhysicalAt(e.where)-e.amount<-0.005){if(msg)msg.textContent='Remove the take-out lines for '+String(e.where).toLowerCase()+' first, or the total would go below zero.';return;}
  if(msg)msg.textContent='';
  alState.physicalCash=alState.physicalCash.filter(function(x){return x.id!==id;});saveAL();renderAlTab();updateKPIs();renderCashISO();
}
function renderPhysicalCash(){
  var el=document.getElementById('pc-log'),tot=document.getElementById('pc-total');if(!el)return;
  var log=(alState.physicalCash||[]).slice().sort(function(a,b){return (b.date||'').localeCompare(a.date||'')||b.id-a.id;});
  if(tot)tot.textContent=gbpFmt(Math.max(0,alTotalPhysical()));
  var dt=document.getElementById('pc-date');if(dt&&!dt.value)dt.value=new Date().toISOString().slice(0,10);
  if(!log.length){el.innerHTML='<div class="pc-empty">No physical cash logged yet.</div>';return;}
  var places={};(alState.physicalCash||[]).forEach(function(e){places[e.where]=(places[e.where]||0)+(+e.amount||0);});
  el.innerHTML='<div class="pc-places">'+Object.keys(places).filter(function(k){return Math.abs(places[k])>0.004;}).map(function(k){return '<span class="pc-place">'+cfEsc(k)+' <b>'+gbpFmt(places[k])+'</b></span>';}).join('')+'</div>'
    +'<div class="pc-list">'+log.map(function(e){var inn=(+e.amount||0)>=0,d=e.date?new Date(e.date+'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'';
      return '<div class="pc-line"><span class="pc-d">'+d+'</span><span class="pc-w">'+cfEsc(e.where||'')+'</span><span class="pc-a '+(inn?'in':'out')+'">'+(inn?'+':'−')+gbpFmt(Math.abs(+e.amount||0))+'</span><button class="data-item-del" onclick="pcDel('+e.id+')" aria-label="Remove this line"><svg class="vi-ic g" aria-hidden="true"><use href="#vi-close"/></svg></button></div>';}).join('')+'</div>';
}
function delCashAccount(id){if(viBlockEdit())return;alState.cashAccounts=alState.cashAccounts.filter(function(a){return a.id!==id;});saveAL();renderAlTab();updateKPIs();renderCashISO();}
function addOtherAsset(){if(viBlockEdit())return;
  var n=document.getElementById('oa-name').value.trim();
  var v=(parseFloat(document.getElementById('oa-val').value)||0)/(window.VI_CURRENCY_RATE||1);
  if(!n)return;
  alState.otherAssets.push({id:Date.now(),name:n,value:v,image:null,svgIcon:null,imageSearch:null});
  document.getElementById('oa-name').value='';document.getElementById('oa-val').value='';
  saveAL();renderAlTab();updateKPIs();
}
function delOtherAsset(id){if(viBlockEdit())return;alState.otherAssets=alState.otherAssets.filter(function(a){return a.id!==id;});try{if(_invOpen===id)invCloseViewer();invDel(id);i3dDel('wi',id);}catch(e){}saveAL();renderAlTab();updateKPIs();}

