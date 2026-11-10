function renderMetalsISO(){
  if(!window.THREE&&viGlOk()&&viThreeState()<3)viThree(function(){try{renderMetalsISO();}catch(e){}});   // engine on its way: the SVG shows meanwhile
  try{if(v3Metals()){renderMetalsInputs();if(!v3Waiting('#metals-scene'))return;}}catch(e){console.error('[Vault-It] 3D metals',e);var sv=document.getElementById('metalsSvg');if(sv)sv.style.display='';}
  var MS=document.getElementById('metalsSvg');
  if(!MS)return;
  MS.innerHTML='';
  var NS2='http://www.w3.org/2000/svg';
  function mE(tag,attrs,par){
    var el=document.createElementNS(NS2,tag);
    for(var k in attrs)el.setAttribute(k,String(attrs[k]));
    if(par)par.appendChild(el);
    return el;
  }
  // Background
  mE('rect',{x:0,y:0,width:700,height:500,fill:'#060d16'},MS);

  // ISO params with pan/orbit support
  var MOX=220,MOY=200,MTX=32,MTY=16,MTZ=34;
  function mIso(x,y,z){
    var rx=x,ry=y;
    var zm=_mZoom||1;
    if(_mAngle!==0){var c=Math.cos(_mAngle),s=Math.sin(_mAngle);rx=x*c-y*s;ry=x*s+y*c;}
    return{x:MOX+(rx-ry)*MTX*zm+_mPanX, y:MOY+(rx+ry)*MTY*zm-z*MTZ*zm+_mPanY};
  }

  // Expanded floor grid — proportional 1oz vault floor
  var GX0=-1,GY0=-1,GX1=22,GY1=12;
  for(var gx=GX0;gx<=GX1;gx++){
    var a=mIso(gx,GY0,0),b=mIso(gx,GY1,0);
    mE('line',{x1:a.x.toFixed(1),y1:a.y.toFixed(1),x2:b.x.toFixed(1),y2:b.y.toFixed(1),stroke:'rgba(68,192,185,.06)','stroke-width':.5},MS);
  }
  for(var gy=GY0;gy<=GY1;gy++){
    var a2=mIso(GX0,gy,0),b2=mIso(GX1,gy,0);
    mE('line',{x1:a2.x.toFixed(1),y1:a2.y.toFixed(1),x2:b2.x.toFixed(1),y2:b2.y.toFixed(1),stroke:'rgba(68,192,185,.06)','stroke-width':.5},MS);
  }
  for(var gx2=GX0;gx2<=GX1;gx2+=1)for(var gy2=GY0;gy2<=GY1;gy2+=1){
    var p2=mIso(gx2,gy2,0);
    mE('circle',{cx:p2.x.toFixed(1),cy:p2.y.toFixed(1),r:1.2,fill:'rgba(68,192,185,.3)'},MS);
  }

  // ── Proportional 1oz bar dimensions ──────────────────────────────────────
  // Gold 1oz bar (PAMP Suisse): ~42mm x 24mm x 2.7mm → ratio 1.75:1:0.11
  var GL=1.75,GW=1.0,GH=0.10,GG=0.18; // gold 1oz
  // Silver 1oz bar: ~50mm x 28mm x 5mm → slightly larger and thicker than gold (silver less dense)
  var SL=2.0,SW=1.1,SH=0.18,SG=0.20; // silver 1oz
  // Platinum 1oz wafer: ~32mm x 18mm x 3mm → smaller than gold
  var PL=1.35,PW=0.75,PH=0.12;
  // Palladium 1oz wafer: ~32mm x 18mm x 3mm → same as platinum
  var PDL=1.35,PDW=0.75,PDH=0.12;

  function mBar(ox,oy,oz,len,wid,hgt,topCol,leftCol,rightCol,edgeCol){
    var ec=edgeCol||'rgba(0,0,0,.4)',sw=0.6;
    var pts=function(arr){return arr.map(function(p){return p.x.toFixed(1)+','+p.y.toFixed(1);}).join(' ');};
    var TFL=mIso(ox,oy,oz+hgt),TFR=mIso(ox+len,oy,oz+hgt);
    var TBL=mIso(ox,oy+wid,oz+hgt),TBR=mIso(ox+len,oy+wid,oz+hgt);
    var BFL=mIso(ox,oy,oz),BFR=mIso(ox+len,oy,oz);
    var BBL=mIso(ox,oy+wid,oz),BBR=mIso(ox+len,oy+wid,oz);
    mE('polygon',{points:pts([TFL,TFR,TBR,TBL]),fill:topCol,stroke:ec,'stroke-width':sw},MS);
    mE('polygon',{points:pts([TFL,TFR,BFR,BFL]),fill:leftCol,stroke:ec,'stroke-width':sw},MS);
    mE('polygon',{points:pts([TFR,TBR,BBR,BFR]),fill:rightCol,stroke:ec,'stroke-width':sw},MS);
    // Shine line on top
    var sl1=mIso(ox+0.12,oy+0.08,oz+hgt),sl2=mIso(ox+len-0.24,oy+0.08,oz+hgt);
    mE('line',{x1:sl1.x.toFixed(1),y1:sl1.y.toFixed(1),x2:sl2.x.toFixed(1),y2:sl2.y.toFixed(1),stroke:'rgba(255,240,180,.3)','stroke-width':.8},MS);
  }

  // ── GOLD 1oz bars — each bar = 1oz ───────────────────────────────────────
  var GCOLS=6;
  var goldBars=Math.min(120,Math.round(alState.metals.gold));
  var GSTACK={};
  for(var i=0;i<goldBars;i++){
    var gc=i%GCOLS,gr=Math.floor(i/GCOLS);
    var gkey=gc+','+gr;var gsz=GSTACK[gkey]||0;
    mBar(gc*(GL+GG),gr*(GW+0.12),gsz*(GH+0.02),GL,GW,GH,'#e8c86a','#9a6e1a','#c49030','rgba(220,180,60,.5)');
    GSTACK[gkey]=(gsz+1);
  }

  // ── SILVER 1oz bars — dynamic start to avoid overlap with gold ────────────
  var SCOLS=5;
  var silvBars=Math.min(100,Math.round(alState.metals.silver));
  var goldRowsUsed=goldBars>0?Math.ceil(goldBars/GCOLS):0;
  var silverStartCol=Math.max(8, GCOLS+Math.ceil(goldRowsUsed*0.3)+1); // ensure gap
  var SSTACK={};
  for(var j=0;j<silvBars;j++){
    var sc=j%SCOLS,sr=Math.floor(j/SCOLS);
    var skey=sc+','+sr+'s';var ssz=SSTACK[skey]||0;
    mBar(silverStartCol+sc*(SL+SG),sr*(SW+0.12),ssz*(SH+0.02),SL,SW,SH,'#dde4ec','#7a8898','#a0b0be','rgba(200,215,230,.4)');
    SSTACK[skey]=(ssz+1);
  }

  // ── PLATINUM 1oz wafers — start below gold/silver rows ─────────────────────
  var goldMaxRow=goldBars>0?Math.ceil(goldBars/GCOLS)*(GW+0.12):0;
  var silverMaxRow=silvBars>0?Math.ceil(silvBars/SCOLS)*(SW+0.12):0;
  var ptStartRow=Math.max(6.5, Math.max(goldMaxRow, silverMaxRow)+1.5);
  var platBars=Math.min(50,Math.round(alState.metals.platinum));
  for(var k=0;k<platBars;k++){
    var pk=k%8,pr=Math.floor(k/8);
    mBar(pk*(PL+0.12),ptStartRow+pr*(PW+0.12),0,PL,PW,PH,'#e8eef2','#8090a0','#a0b0bc','rgba(180,200,220,.4)');
  }

  // ── PALLADIUM 1oz wafers — start below platinum ───────────────────────────
  var pdStartRow=ptStartRow+(platBars>0?Math.ceil(platBars/8)*(PW+0.12)+1.0:2.5);
  var palBars=Math.min(50,Math.round(alState.metals.palladium));
  for(var l=0;l<palBars;l++){
    var pk2=l%8,pr2=Math.floor(l/8);
    mBar(pk2*(PDL+0.12),pdStartRow+pr2*(PDW+0.12),0,PDL,PDW,PDH,'#d8e0e8','#707888','#909aa8','rgba(160,180,200,.4)');
  }

  // Labels
  function mlabel(x,y,z,text,col,fs){
    var p3=mIso(x,y,z);
    mE('text',{x:p3.x.toFixed(1),y:p3.y.toFixed(1),'font-size':fs||9,'font-family':'Syne,sans-serif','font-weight':'700',style:'fill:'+col,'text-anchor':'start','pointer-events':'none'},MS).textContent=text;
  }
  if(alState.metals.gold>0)      mlabel(-0.8,-0.8,GH+0.4,'GOLD: '+alState.metals.gold.toFixed(2)+' oz · 1oz bars','var(--gold)',8);
  if(alState.metals.silver>0)    mlabel(silverStartCol-0.5,-0.8,SH+0.4,'SILVER: '+alState.metals.silver.toFixed(2)+' oz · 1oz bars','var(--m-silver)',8);
  if(alState.metals.platinum>0)  mlabel(-0.8,ptStartRow-0.7,PH+0.4,'PLATINUM: '+alState.metals.platinum.toFixed(2)+' oz · 1oz wafers','var(--m-platinum)',8);
  if(alState.metals.palladium>0) mlabel(-0.8,pdStartRow-0.7,PDH+0.4,'PALLADIUM: '+alState.metals.palladium.toFixed(2)+' oz · 1oz wafers','var(--m-palladium)',8);

  // Total value footer
  var tv=alTotalMetals();
  mE('text',{x:300,y:412,'font-size':9,'font-family':'Share Tech Mono,monospace',fill:'rgba(68,192,185,.55)','text-anchor':'middle','pointer-events':'none'},MS)
    .textContent='TOTAL METALS VALUE: '+(window.VI_CURRENCY_SYMBOL||'£')+Math.round(tv).toLocaleString('en-GB')+' · Each bar = 1 troy oz';

  // Caption
  var cap=document.getElementById('metalsCap');
  if(cap){
    var parts=[];
    if(goldBars>0)parts.push(goldBars+' gold bar'+(goldBars!==1?'s':''));
    if(silvBars>0)parts.push(silvBars+' silver bar'+(silvBars!==1?'s':''));
    if(platBars>0)parts.push(platBars+' Pt wafer'+(platBars!==1?'s':''));
    if(palBars>0)parts.push(palBars+' Pd wafer'+(palBars!==1?'s':''));
    cap.textContent=(parts.length?parts.join(' \u00b7 '):alState.metals.gold>0||alState.metals.silver>0?'Bars visible when \u226510oz':'Add holdings below')+' \u00b7 '+gbpFmt(tv);
  }

  // Render inputs
  renderMetalsInputs();
}

function renderMetalsInputs(){
  var metals=[{k:'gold',lbl:'Gold',col:'var(--gold)'},{k:'silver',lbl:'Silver',col:'var(--m-silver)'},{k:'platinum',lbl:'Platinum',col:'var(--m-platinum)'},{k:'palladium',lbl:'Palladium',col:'var(--m-palladium)'}];
  // one row per metal: holdings and the price beside it, value at the end (A1)
  var mi=document.getElementById('metals-inputs'),sym=window.VI_CURRENCY_SYMBOL||'\u00a3';
  // a quiet save (leaving the field, or a change event) keeps the rows as they are: redrawing them would replace the
  // "Add to vault" button under the user's finger, and the tap would never land (E22).
  if(window.V3&&V3._keepRows){metals.forEach(function(m){metalValCell(m.k);});mi=null;}
  if(mi)mi.innerHTML=metals.map(function(m){
    return'<div class="metal-row mh-row"><span class="metal-lbl" style="color:'+m.col+'">'+m.lbl+'</span>'
      +'<label class="mh-cell"><span class="mh-k">Hold</span><input class="metal-inp" id="metal-hold-'+m.k+'" type="number" min="0" step="0.01" value="'+(alState.metals[m.k]||0)+'" aria-label="'+m.lbl+' held, troy ounces" oninput="metalStage(\''+m.k+'\',this.value)" onchange="metalCommit(\''+m.k+'\',false)" onkeydown="if(event.key===\'Enter\'){event.preventDefault();metalCommit(\''+m.k+'\',true);}" onblur="metalBlur(\''+m.k+'\')"><span class="metal-unit">oz</span></label>'
      +'<label class="mh-cell"><span class="mh-k">Price</span><input class="metal-inp" type="number" min="0" step="0.01" value="'+(alState.metalPrices[m.k]||0)+'" aria-label="'+m.lbl+' price per ounce" onchange="updateMetalPrice(\''+m.k+'\',this.value)"><span class="metal-unit">'+sym+'/oz</span></label>'
      +'<button class="btn-add-data metal-commit" data-m="'+m.k+'" onclick="metalCommit(\''+m.k+'\',true)" aria-label="Add your '+m.lbl.toLowerCase()+' to the vault">Add to vault</button>'
      +'<span class="mh-val" id="metal-val-'+m.k+'" style="color:'+m.col+'">'+sym+Math.round((alState.metals[m.k]||0)*(alState.metalPrices[m.k]||0)).toLocaleString('en-GB')+'</span>'
      +'<span class="metal-draft" id="metal-draft-'+m.k+'" role="status"></span></div>';
  }).join('');
  var mk=document.getElementById('metals-kpis');
  if(mk)mk.innerHTML=metals.map(function(m){
    var v=(alState.metals[m.k]||0)*(alState.metalPrices[m.k]||0);
    return'<div class="ov-kpi" style="padding:10px 12px"><div class="ov-kpi-lbl" style="color:'+m.col+'">'+m.lbl+'</div>'
      +'<div class="ov-kpi-val" style="font-size:.9rem;color:'+m.col+'">'+(window.VI_CURRENCY_SYMBOL||'\u00a3')+Math.round(v).toLocaleString('en-GB')+'</div>'
      +'<div class="ov-kpi-sub">'+(alState.metals[m.k]||0).toFixed(2)+' oz @ '+(window.VI_CURRENCY_SYMBOL||'\u00a3')+(alState.metalPrices[m.k]||0).toLocaleString('en-GB')+'</div></div>';
  }).join('');
}
function metalValCell(k){var e=document.getElementById('metal-val-'+k);if(e)e.textContent=(window.VI_CURRENCY_SYMBOL||'\u00a3')+Math.round((alState.metals[k]||0)*(alState.metalPrices[k]||0)).toLocaleString('en-GB');}
/* v0.9.1 E22 (owner, 3 Nov: "where it says you hold troy ounce ... a button that triggers the intro animation ...
   four commit buttons"; Q9: the typed value always saves, the animation plays only from the button or Enter).
   Typing stages the number and the row says it is not in the vault yet; the button or Enter commits it and that
   metal's bars arrive in the 3D scene; leaving the field commits it quietly, so nothing typed is ever lost. */
var V3_STAGE={};
var V3_BLUR={};
function metalBlur(k){   // leaving the field saves what was typed, but a tap on the button blurs it first: wait a moment so the button's own commit wins
  clearTimeout(V3_BLUR[k]);
  V3_BLUR[k]=setTimeout(function(){V3_BLUR[k]=null;metalCommit(k,false);},220);
}
function metalStage(k,v){
  V3_STAGE[k]=v;
  var d=document.getElementById('metal-draft-'+k),n=parseFloat(v);
  if(!d)return;
  if(!isFinite(n)||Math.abs(n-(+alState.metals[k]||0))<1e-9){d.textContent='';d.classList.remove('on');return;}
  d.textContent='Not in your vault yet';d.classList.add('on');
}
function metalCommit(k,animate){
  if(viBlockEdit())return;
  clearTimeout(V3_BLUR[k]);V3_BLUR[k]=null;
  var d=document.getElementById('metal-draft-'+k),inp=document.getElementById('metal-hold-'+k);
  var raw=V3_STAGE[k]!=null?V3_STAGE[k]:(inp?inp.value:null),n=(raw!=null&&String(raw).trim()==='')?0:parseFloat(raw);   // a cleared field means none held, as before E22
  var was=+alState.metals[k]||0;
  if(raw==null||!isFinite(n)||n<0||Math.abs(n-was)<1e-9){   // nothing new to save; the button still shows that metal arriving
    if(d&&d.classList.contains('on')){d.textContent='';d.classList.remove('on');}
    if(animate&&was>0){   // leaving the field already saved it, so the button just plays that metal's arrival
      V3._animZone=k;V3._animSilent=false;
      var V=V3.metals,pending=V3._after&&V3._after.metals;
      if(!pending&&V&&V.introArm){V3._animZone=null;V.introArm(V._introTag||'metals',k,false);}   // no rebuild on the way: arm it here
    }
    return;
  }
  delete V3_STAGE[k];
  alState.metals[k]=n;metalValCell(k);saveAL();
  if(animate){V3._animZone=k;}else{V3._animSilent=true;V3._keepRows=1;}
  try{renderMetalsISO();updateKPIs();checkAchievements();}finally{V3._keepRows=0;}
  var diff=n-was,sym=window.VI_CURRENCY_SYMBOL||'\u00a3',rate=window.VI_CURRENCY_RATE||1;
  var worth=Math.round(Math.abs(diff)*(alState.metalPrices[k]||0)*rate).toLocaleString('en-GB');
  d=document.getElementById('metal-draft-'+k);   // the row was redrawn above, so the line goes on the new one
  if(d){d.textContent=(diff>0?'+':'\u2212')+Math.abs(diff).toFixed(2)+' oz '+k+', '+sym+worth;d.classList.remove('on');}
}
function updateMetal(k,v){if(viBlockEdit())return;alState.metals[k]=parseFloat(v)||0;metalValCell(k);V3._animSilent=true;metalValCell(k);saveAL();renderMetalsISO();updateKPIs();checkAchievements();}
function updateMetalPrice(k,v){if(viBlockEdit())return;alState.metalPrices[k]=parseFloat(v)||0;alState.metalPrices.manualAt=new Date().toISOString();metalValCell(k);saveAL();renderMetalsISO();updateKPIs();}
// Keep backward compatibility aliases
function setMetal(m,v){if(viBlockEdit())return;updateMetal(m,v);}
function setMetalPrice(m,v){if(viBlockEdit())return;updateMetalPrice(m,v);}
