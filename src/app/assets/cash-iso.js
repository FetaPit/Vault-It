// ── CASH ISO COIN VIEWPORT ────────────────────────────────────
var _cPanX=0,_cPanY=0,_cAngle=0,_cIsExpanded=false;
var _cDragging=false,_cDX=0,_cDY=0,_cLastX=0,_cLastY=0;
var _cZoom=1;
var _COX=350,_COY=380,_CTX=32,_CTY=16,_CTZ=34;

function cIso(x,y,z){
  var rx=x,ry=y;
  if(_cAngle!==0){var c=Math.cos(_cAngle),s=Math.sin(_cAngle);rx=x*c-y*s;ry=x*s+y*c;}
  var sc=_cZoom||1;
  return{x:_COX+(rx-ry)*_CTX*sc+_cPanX, y:_COY+(rx+ry)*_CTY*sc-z*_CTZ*sc+_cPanY};
}

function toggleCashExpand(){
  _cIsExpanded=!_cIsExpanded;
  var card=document.getElementById('cashSceneCard');
  var btn=document.getElementById('btnCashExpand');
  if(!card)return;
  if(_cIsExpanded){card.classList.add('expanded');if(btn)btn.textContent='⊠';}
  else{card.classList.remove('expanded');if(btn)btn.textContent='⛶';}
  setTimeout(renderCashISO,80);
}

function resetCashView(){if(V3.cash&&document.querySelector('#cashSceneCard .v3-host')){V3.cash.reset();return;}_cPanX=0;_cPanY=0;_cAngle=0;_cZoom=1;renderCashISO();}

function renderCashISO(){
  if(!window.THREE&&viGlOk()&&viThreeState()<3)viThree(function(){try{renderCashISO();}catch(e){}});   // engine on its way: the SVG shows meanwhile
  try{if(v3Cash()&&!v3Waiting('#cashSceneCard'))return;}catch(e){console.error('[Vault-It] 3D cash',e);var sv=document.getElementById('cashSvg');if(sv)sv.style.display='';}
  var MS=document.getElementById('cashSvg');
  if(!MS)return;
  var total=alTotalCash();
  var totalCoins=Math.min(200000,Math.max(0,Math.floor(total)));
  var cubeCoins=1000; // 10x10x10 = £1000 per cube
  var fullCubes=Math.floor(totalCoins/cubeCoins);
  var remainder=totalCoins%cubeCoins;

  // Layout
  var COLS=10;
  var numItems=fullCubes+(remainder>0?1:0)||1;
  var ROWS=Math.max(1,Math.ceil(numItems/COLS));
  var STEP=1.05; // spacing between coin stack centres (in ISO units)
  var CS=1.0;    // coin stack height (1 ISO unit = £1000)

  // Auto-scale: fit (COLS+ROWS)*STEP across 520px of the 600px viewBox
  var TX=Math.min(26,Math.floor(520/((COLS+ROWS)*STEP)));
  var TY=Math.max(1,Math.round(TX*0.48));
  var TZ=Math.round(TX*1.1);
  var zoom=_cZoom||1;

  // Origin: left edge = 40, top edge = 40
  var ox=40+(ROWS-1)*STEP*TX; // offset right so row-0 starts at left margin
  var oy=40+CS*TZ;             // offset down so top of cubes starts at top margin

  function ciso(x,y,z){
    var rx=x,ry=y;
    if(_cAngle!==0){var c=Math.cos(_cAngle),s=Math.sin(_cAngle);rx=x*c-y*s;ry=x*s+y*c;}
    return{x:ox+(rx-ry)*TX*zoom+_cPanX, y:oy+(rx+ry)*TY*zoom-z*TZ*zoom+_cPanY};
  }

  function face(corners,fill,stroke,op){
    var d=corners.map(function(c,i){return(i?'L':'M')+c.x.toFixed(1)+' '+c.y.toFixed(1);}).join('')+'Z';
    return'<path d="'+d+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="0.3" opacity="'+op+'"/>';
  }

  // ── Coin stack helper ──
  // Draws an isometric coin cylinder at grid position (bx,by), height h (0..CS)
  function coinStack(bx,by,h){
    if(h<=0)return'';
    var r=0.38; // radius in ISO units
    var S2=Math.SQRT2;
    var rxS=r*TX*S2*zoom, ryS=r*TY*S2*zoom; // screen-space ellipse radii
    var topC=ciso(bx,by,h), botC=ciso(bx,by,0);
    var svg='';
    // Bottom ellipse (dark gold)
    svg+='<ellipse cx="'+botC.x.toFixed(1)+'" cy="'+botC.y.toFixed(1)+'" rx="'+rxS.toFixed(1)+'" ry="'+ryS.toFixed(1)+'" fill="#7a5c0c" stroke="#9a7812" stroke-width="0.3" opacity="0.85"/>';
    // Side band (visible front-half parallelogram)
    var tL=topC.x-rxS, tR=topC.x+rxS;
    var bL=botC.x-rxS, bR=botC.x+rxS;
    svg+='<polygon points="'+bL.toFixed(1)+','+botC.y.toFixed(1)+' '+bR.toFixed(1)+','+botC.y.toFixed(1)+' '+tR.toFixed(1)+','+topC.y.toFixed(1)+' '+tL.toFixed(1)+','+topC.y.toFixed(1)+'" fill="url(#coinSide)" stroke="#9a7812" stroke-width="0.25" opacity="0.92"/>';
    // Coin-edge lines (every ~0.1 ISO units up)
    var COIN_H=0.1,layers=Math.floor(h/COIN_H);
    for(var li=1;li<=layers;li++){
      var lc=ciso(bx,by,li*COIN_H);
      svg+='<ellipse cx="'+lc.x.toFixed(1)+'" cy="'+lc.y.toFixed(1)+'" rx="'+rxS.toFixed(1)+'" ry="'+ryS.toFixed(1)+'" fill="none" stroke="rgba(180,135,20,0.35)" stroke-width="0.3"/>';
    }
    // Top ellipse (bright gold)
    svg+='<ellipse cx="'+topC.x.toFixed(1)+'" cy="'+topC.y.toFixed(1)+'" rx="'+rxS.toFixed(1)+'" ry="'+ryS.toFixed(1)+'" fill="#c8a840" stroke="#e0c050" stroke-width="0.5" opacity="0.97"/>';
    // £ symbol centred on top
    var fs=Math.max(4,Math.round(rxS*0.65));
    svg+='<text x="'+topC.x.toFixed(1)+'" y="'+(topC.y+ryS*0.18).toFixed(1)+'" text-anchor="middle" dominant-baseline="middle" font-size="'+fs+'" fill="rgba(255,228,80,0.95)" font-family="monospace" font-weight="800">\u00a3</text>';
    return svg;
  }

  var svgContent='<defs>'
    +'<linearGradient id="coinSide" x1="0%" y1="0%" x2="100%" y2="0%">'
    +'<stop offset="0%" stop-color="#6a4e0a"/>'
    +'<stop offset="50%" stop-color="#b08828"/>'
    +'<stop offset="100%" stop-color="#7a5c0c"/>'
    +'</linearGradient></defs>';

  // ── ISO floor plane grid (coin vault floor) ──────────────────────────────
  var FGX0=-3, FGY0=-3;
  var FGX1=Math.max(COLS+3, Math.ceil(numItems/ROWS)+3);
  var FGY1=Math.max(ROWS+3, 8);
  for(var fgx=FGX0;fgx<=FGX1;fgx++){
    var fa=ciso(fgx*STEP,FGY0*STEP,0),fb=ciso(fgx*STEP,FGY1*STEP,0);
    svgContent+='<line x1="'+fa.x.toFixed(1)+'" y1="'+fa.y.toFixed(1)+'" x2="'+fb.x.toFixed(1)+'" y2="'+fb.y.toFixed(1)+'" stroke="rgba(200,168,64,.07)" stroke-width="0.5"/>';
  }
  for(var fgy=FGY0;fgy<=FGY1;fgy++){
    var fa2=ciso(FGX0*STEP,fgy*STEP,0),fb2=ciso(FGX1*STEP,fgy*STEP,0);
    svgContent+='<line x1="'+fa2.x.toFixed(1)+'" y1="'+fa2.y.toFixed(1)+'" x2="'+fb2.x.toFixed(1)+'" y2="'+fb2.y.toFixed(1)+'" stroke="rgba(200,168,64,.07)" stroke-width="0.5"/>';
  }
  for(var fgx2=FGX0;fgx2<=FGX1;fgx2++)for(var fgy2=FGY0;fgy2<=FGY1;fgy2++){
    var fp=ciso(fgx2*STEP,fgy2*STEP,0);
    svgContent+='<circle cx="'+fp.x.toFixed(1)+'" cy="'+fp.y.toFixed(1)+'" r="1.3" fill="rgba(200,168,64,.28)"/>';
  }

  // Full £1000 coin stacks
  for(var ci=0;ci<fullCubes;ci++){
    var cRow=Math.floor(ci/COLS);
    var cCol=ci%COLS;
    var bx=cCol*STEP+STEP*0.5,by=cRow*STEP+STEP*0.5; // centre of cell
    svgContent+=coinStack(bx,by,CS);
  }

  // Partial coin stack (proportional height)
  if(remainder>0){
    var pRow=Math.floor(fullCubes/COLS);
    var pCol=fullCubes%COLS;
    var pbx=pCol*STEP+STEP*0.5,pby=pRow*STEP+STEP*0.5;
    var partH=CS*(remainder/cubeCoins);
    svgContent+=coinStack(pbx,pby,partH);
  }

  // Caption
  var cap=document.getElementById('cashCap'),use3d=false;try{use3d=v3Ok()&&!(V3._flat&&V3._flat.cash);}catch(e){}
  if(cap&&!use3d){   // v0.9.2 (CoS, 4 Nov): the flat view's caption only when it is the view; while the 3D stage waits for its first frame, its own caption stays
    cap.textContent=gbpFmt(total)+' \u00b7 '+fullCubes+' full block'+(fullCubes===1?'':'s')+(remainder>0?' + \u00a3'+remainder:'')+' \u00b7 each block = \u00a31,000';   // the same word as the 3D (Pedro, 3 Nov)
  }
  MS.innerHTML=svgContent;
}

(function(){
  function getCashSvg(){return document.getElementById('cashSvg');}
  function setupCash(){
    var svg=getCashSvg();
    if(!svg)return;
    svg.addEventListener('mousedown',function(e){_cDragging=true;_cLastX=e.clientX;_cLastY=e.clientY;svg.style.cursor='grabbing';e.preventDefault();});
    window.addEventListener('mouseup',function(){_cDragging=false;var s2=getCashSvg();if(s2)s2.style.cursor='grab';});
    window.addEventListener('mousemove',function(e){
      if(!_cDragging)return;
      var dx=e.clientX-_cLastX,dy=e.clientY-_cLastY;
      if(e.shiftKey){_cAngle+=dx*0.01;}else{_cPanX+=dx;_cPanY+=dy;}
      _cLastX=e.clientX;_cLastY=e.clientY;
      renderCashISO();
    });
    svg.addEventListener('wheel',function(e){
      e.preventDefault();
      _cZoom=Math.max(0.3,Math.min(3.5,(_cZoom||1)-e.deltaY*0.001));
      renderCashISO();
    },{passive:false});
    svg.addEventListener('touchstart',function(e){if(e.touches.length===1){_cDragging=true;_cLastX=e.touches[0].clientX;_cLastY=e.touches[0].clientY;}},{passive:true});
    svg.addEventListener('touchend',function(){_cDragging=false;});
    svg.addEventListener('touchmove',function(e){
      if(!_cDragging||e.touches.length!==1)return;
      var dx=e.touches[0].clientX-_cLastX,dy=e.touches[0].clientY-_cLastY;
      _cPanX+=dx;_cPanY+=dy;
      _cLastX=e.touches[0].clientX;_cLastY=e.touches[0].clientY;
      renderCashISO();
    },{passive:true});
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',setupCash);}
  else{setTimeout(setupCash,150);}
})();

