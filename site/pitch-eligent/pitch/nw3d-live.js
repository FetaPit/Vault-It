/* Vault-It pitch: the app's Net worth in 3D and Net worth progress engine (index.html <script id="vi-nw3d-engine">, brand-rollout 4 Nov 2026), copied as is. */
(function(){
"use strict";
var RMQ=null;try{RMQ=window.matchMedia?matchMedia('(prefers-reduced-motion: reduce)'):null}catch(e){}
/* LITE: set once a scene's frames run slow (a big phone screen): no canvas shadows, a lower pixel ratio and 30 fps. Shared by both scenes. */
var LITE=false,COARSE=false;try{COARSE=!!(window.matchMedia&&matchMedia('(pointer: coarse)').matches)}catch(e){}
function reduceMotion(){return !!((document.body&&document.body.classList.contains('reduced-motion'))||(RMQ&&RMQ.matches))}
function clamp(v,a,b){return v<a?a:v>b?b:v}
function mix(a,b,t){return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]}
function rgba(c,a){return "rgba("+(c[0]|0)+","+(c[1]|0)+","+(c[2]|0)+","+a.toFixed(3)+")"}
function ease3(t){return 1-Math.pow(1-t,3)}
/* a column's block colour as a label colour: the colour itself, mixed toward white in 10% steps only until it reaches 4.5:1 on the dark label plate (#080808); never darkened (Pedro's v0.8 spec D) */
var LABC={};
function labCol(cc){var col=cc.col;if(!col)return cc.dir<0?rgba(PAL.red,.95):rgba(PAL.gold,.95);var k=col.join(","),h=LABC[k];if(h)return h;
  var lum=function(v){var f=function(x){x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)};return .2126*f(v[0])+.7152*f(v[1])+.0722*f(v[2])},t=0,o=col;
  while(t<.95){o=col.map(function(v){return Math.round(v+(255-v)*t)});if((lum(o)+.05)/(lum([8,8,8])+.05)>=4.5)break;t+=.1}
  return LABC[k]=rgba(o,.95)}
/* build/intro timings, ms (owner, 2 Nov: all 3D build animations were too fast, slowed by 100%: every duration doubled) */
var NW_D={drop:1400,flash:2000,leave:1800,dropStep:120,subStep:80,stack:1400,stackStep:90,pileMs:1800,goMs:1700,spread:4200,cellStep:140,land:1000};
var LD=(function(){var v=[-.45,.7,.55],l=Math.hypot(v[0],v[1],v[2]);return [v[0]/l,v[1]/l,v[2]/l]})();
/* Night palette (nwPal dark). 3D viewports keep the Night look in Daylight too (owner, 30 Oct). */
var PAL={teal:[68,192,185],red:[224,92,92],gold:[232,197,106],fa:.72,shMin:.5,edgeMix:[255,255,255],edgeK:.35,flash:[232,197,106],glow:[68,192,185],glowA:.18,grid:[68,192,185],gridA:.28,planeS:[232,197,106],planeF:[232,197,106],planeFA:.09,blur:14,label:"rgba(168,176,176,.95)"};
function Proj(st,rect){
  var cp=Math.cos(st.pitch),sp=Math.sin(st.pitch),d=st.dist/st.zoom;
  var pos=[d*Math.sin(st.yaw)*cp,st.ty+d*sp,d*Math.cos(st.yaw)*cp];
  var f=[-pos[0],st.ty-pos[1],-pos[2]],l=Math.hypot(f[0],f[1],f[2]);f[0]/=l;f[1]/=l;f[2]/=l;
  var r=[-f[2],0,f[0]],rl=Math.hypot(r[0],r[2]);r[0]/=rl;r[2]/=rl;
  var u=[r[1]*f[2]-r[2]*f[1],r[2]*f[0]-r[0]*f[2],r[0]*f[1]-r[1]*f[0]];
  var focal=Math.min(rect.h,rect.w*(st.fit||.85))/2/Math.tan(19*Math.PI/180);
  var cx=rect.x+rect.w/2,cy=rect.y+rect.h/2;
  this.pos=pos;this.focal=focal;
  this.pt=function(x,y,z){var dx=x-pos[0],dy=y-pos[1],dz=z-pos[2];
    var X=dx*r[0]+dy*r[1]+dz*r[2],Y=dx*u[0]+dy*u[1]+dz*u[2],Z=dx*f[0]+dy*f[1]+dz*f[2];
    if(Z<1)Z=1;var s=focal/Z;return [cx+X*s,cy-Y*s,Z,s]};
}
/* shared orbit and zoom (owner, 30 Oct 2026: the viewport must zoom in and out and orbit, not just turn).
 * Drag orbits (one finger: horizontal only, so the page still scrolls). Two fingers pinch to zoom. The wheel zooms with ctrl or cmd held
 * (a trackpad pinch), or plain once the viewport has been touched, so a page scroll over an untouched scene is never hijacked.
 * Arrows rotate and tilt, + and - zoom, 0 resets. zoom(f) and reset() serve on-screen buttons. */
var ZMIN=.55,ZMAX=2.6;
function orbit(cv,st,hooks){
  var drag=null,pts={},pinch=null,engaged=false,home={yaw:st.yaw,pitch:st.pitch,zoom:st.zoom};
  function touched(){engaged=true;if(hooks.touch)hooks.touch()}
  function ptList(){return Object.keys(pts).map(function(k){return pts[k]})}
  cv.addEventListener("pointerdown",function(e){pts[e.pointerId]={x:e.clientX,y:e.clientY};try{cv.setPointerCapture(e.pointerId)}catch(_){}
    var L=ptList();if(L.length>=2){drag=null;pinch={d:Math.hypot(L[0].x-L[1].x,L[0].y-L[1].y),zoom:st.zoom}}
    else{drag={x:e.clientX,y:e.clientY,yaw:st.yaw,pitch:st.pitch}}cv.style.cursor="grabbing";touched()});
  cv.addEventListener("pointermove",function(e){if(!pts[e.pointerId])return;pts[e.pointerId]={x:e.clientX,y:e.clientY};
    if(pinch){var L=ptList();if(L.length>=2){var d=Math.hypot(L[0].x-L[1].x,L[0].y-L[1].y);if(pinch.d>0)st.zoom=clamp(pinch.zoom*d/pinch.d,ZMIN,ZMAX)}touched();return}
    if(!drag)return;
    st.yaw=drag.yaw-(e.clientX-drag.x)*.008;
    if(e.pointerType==="mouse")st.pitch=clamp(drag.pitch+(e.clientY-drag.y)*.006,.1,1.2);touched()});
  function end(e){if(e&&e.pointerId!=null)delete pts[e.pointerId];var L=ptList();if(L.length<2)pinch=null;if(!L.length)drag=null;else if(!pinch&&L.length===1&&!drag)drag={x:L[0].x,y:L[0].y,yaw:st.yaw,pitch:st.pitch};
    if(!L.length)cv.style.cursor="grab";if(hooks.touch)hooks.touch()}
  cv.addEventListener("pointerup",end);cv.addEventListener("pointercancel",end);
  cv.addEventListener("wheel",function(e){if(!(e.ctrlKey||e.metaKey||engaged))return;e.preventDefault();
    st.zoom=clamp(st.zoom*Math.pow(1.0015,-e.deltaY*(e.deltaMode===1?16:1)),ZMIN,ZMAX);touched()},{passive:false});
  cv.addEventListener("keydown",function(e){var k=e.key,hit=true;
    if(k==="ArrowLeft")st.yaw-=.12;else if(k==="ArrowRight")st.yaw+=.12;
    else if(k==="ArrowUp")st.pitch=clamp(st.pitch+.06,.1,1.2);else if(k==="ArrowDown")st.pitch=clamp(st.pitch-.06,.1,1.2);
    else if(k==="+"||k==="=")st.zoom=clamp(st.zoom*1.12,ZMIN,ZMAX);else if(k==="-")st.zoom=clamp(st.zoom/1.12,ZMIN,ZMAX);else if(k==="0")reset();else hit=false;
    if(hit){e.preventDefault();touched()}});
  function reset(){st.yaw=home.yaw;st.pitch=home.pitch;st.zoom=home.zoom;engaged=false;if(hooks.reset)hooks.reset()}
  return {isDrag:function(){return !!drag||!!pinch},zoom:function(f){st.zoom=clamp(st.zoom*f,ZMIN,ZMAX);touched()},reset:reset,engaged:function(){return engaged}};
}
/* the block unit: £1,000 unless the tallest stack would pass about 14 blocks, then 2k, 5k, 10k ... (a cube is always a tenth of a block) */
function niceUnit(mx,cap){var u=1000,s=[1,2,5],k=0;cap=cap||14;while(Math.floor(mx/u+1e-9)>cap&&u<1e12){k++;u=s[k%3]*1000*Math.pow(10,Math.floor(k/3))}return u}
function split(v,U){var b=Math.floor(v/U+1e-9),r=(v-b*U)/(U/10),s=Math.floor(r+1e-9);if(s>9)s=9;return {b:b,s:s,f:clamp(r-s,0,1)}}
/* camera distance that fits a set of boxes [x0,x1,y0,y1,z0,z1] on the canvas: project them once at a trial distance and scale (projection goes as 1/distance) */
function fitDist(st,cw,ch,boxes,yaw,ty,mx,my){
  var t={yaw:yaw,pitch:st.pitch,dist:400,zoom:1,ty:ty,fit:st.fit},P=new Proj(t,{x:0,y:0,w:cw,h:ch}),ex=1,ey=1;
  boxes.forEach(function(b){[b[0],b[1]].forEach(function(x){[b[2],b[3]].forEach(function(y){[b[4],b[5]].forEach(function(z){var q=P.pt(x,y,z);ex=Math.max(ex,Math.abs(q[0]-cw/2));ey=Math.max(ey,Math.abs(q[1]-ch/2))})})})});
  return Math.max(50,400*Math.max(ex/(cw/2*mx),ey/(ch/2*my)));
}
function faces(x0,x1,y0,y1,z0,z1){return [[[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1],[0,1,0]],[[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],[0,-1,0]],[[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],[0,0,1]],[[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[0,0,-1]],[[x1,y0,z0],[x1,y0,z1],[x1,y1,z1],[x1,y1,z0],[1,0,0]],[[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],[-1,0,0]]]}
/* one box, back faces culled, lit from the brand light, fill and edge on the pulse */
function drawBox(c,P,g,PL,col,fillA,edgeA,edgeK){
  var x0=g.x-g.w/2,x1=g.x+g.w/2,y0=g.y,y1=g.y+g.h,z0=g.z-g.d/2,z1=g.z+g.d/2,gy=g.y+g.h/2;
  faces(x0,x1,y0,y1,z0,z1).forEach(function(f){var n=f[4];if(((P.pos[0]-g.x)*n[0]+(P.pos[1]-gy)*n[1]+(P.pos[2]-g.z)*n[2])<=0)return;
    var lt=Math.max(0,n[0]*LD[0]+n[1]*LD[1]+n[2]*LD[2]),sh=PAL.shMin+(1-PAL.shMin)*lt,cc=[col[0]*sh,col[1]*sh,col[2]*sh];
    var s=[P.pt.apply(null,f[0]),P.pt.apply(null,f[1]),P.pt.apply(null,f[2]),P.pt.apply(null,f[3])];
    c.beginPath();c.moveTo(s[0][0],s[0][1]);for(var k=1;k<4;k++)c.lineTo(s[k][0],s[k][1]);c.closePath();
    c.fillStyle=rgba(cc,fillA);c.fill();c.strokeStyle=rgba(mix(col,PAL.edgeMix,edgeK),edgeA);c.lineWidth=1;c.stroke()});
}
function ground(c,P,st,halfX,z0,z1,red,ts,rm,spacing){
  var i,c0=P.pt(0,0,(z0+z1)/2);c.save();c.translate(c0[0],c0[1]);c.scale(1,Math.max(.3,Math.sin(st.pitch)));
  var R=c0[3]*Math.max(70,halfX*1.15),gr=c.createRadialGradient(0,0,0,0,0,R);gr.addColorStop(0,rgba(PAL.glow,PAL.glowA));gr.addColorStop(1,rgba(PAL.glow,0));
  c.fillStyle=gr;c.beginPath();c.arc(0,0,R,0,Math.PI*2);c.fill();c.restore();
  c.lineWidth=1;var nx=Math.ceil((halfX+12)/spacing),gz0=z0-12,gz1=z1+12,A,B;
  for(i=-nx;i<=nx;i++){c.strokeStyle=rgba(PAL.grid,PAL.gridA*(1-Math.abs(i)/(nx+1.5)));A=P.pt(i*spacing,0,gz0);B=P.pt(i*spacing,0,gz1);c.beginPath();c.moveTo(A[0],A[1]);c.lineTo(B[0],B[1]);c.stroke()}
  for(var z=Math.ceil(gz0/spacing)*spacing;z<=gz1;z+=spacing){c.strokeStyle=rgba(PAL.grid,PAL.gridA*.8);A=P.pt(-nx*spacing,0,z);B=P.pt(nx*spacing,0,z);c.beginPath();c.moveTo(A[0],A[1]);c.lineTo(B[0],B[1]);c.stroke()}
  var CS=red?PAL.red:PAL.planeS,CF=red?PAL.red:PAL.planeF,pq=[P.pt(-halfX,0,z0),P.pt(halfX,0,z0),P.pt(halfX,0,z1),P.pt(-halfX,0,z1)];
  c.save();c.shadowColor=rgba(CS,.7);c.shadowBlur=LITE?0:PAL.blur;c.beginPath();c.moveTo(pq[0][0],pq[0][1]);for(i=1;i<4;i++)c.lineTo(pq[i][0],pq[i][1]);c.closePath();
  c.fillStyle=rgba(CF,PAL.planeFA);c.fill();c.strokeStyle=rgba(CS,.9);c.lineWidth=1.5;c.stroke();c.restore();
  if(!rm){var pg=(ts%2800)/2800,ge=pg*16,rq=[P.pt(-halfX-ge,0,z0-ge),P.pt(halfX+ge,0,z0-ge),P.pt(halfX+ge,0,z1+ge),P.pt(-halfX-ge,0,z1+ge)];
    c.beginPath();c.moveTo(rq[0][0],rq[0][1]);for(i=1;i<4;i++)c.lineTo(rq[i][0],rq[i][1]);c.closePath();c.strokeStyle=rgba(CS,(1-pg)*.45);c.lineWidth=1.4;c.stroke()}
  return CS;
}
function stage(cv,o,draw){
  /* sizing, pixel ratio cap, visible-only rendering, frame cap: shared by both scenes */
  var c=cv.getContext("2d"),S={c:c,cw:300,ch:200,dpr:1,vis:false,mid:false,raf:0,last:0};
  /* pixel budget: about 1.6M canvas pixels (a 1500 x 520 stage on a big phone would otherwise be 6M at 2x), 1.25x once LITE */
  function size(){var r=cv.getBoundingClientRect();S.cw=Math.max(2,r.width);S.ch=Math.max(2,r.height);S.dpr=Math.max(1,Math.min(window.innerWidth<700?1.5:2,window.devicePixelRatio||1,Math.sqrt(1.6e6/(S.cw*S.ch)),LITE?1.25:9));cv.width=Math.round(S.cw*S.dpr);cv.height=Math.round(S.ch*S.dpr);S.kick()}
  /* 'mid': the canvas is about half on screen (a tall one, half the screen); once true it stays true. Intros start on it, not at the first pixel (owner, 2 Nov) */
  function midNow(){var r=cv.getBoundingClientRect(),vh=window.innerHeight||0,seen=Math.min(r.bottom,vh)-Math.max(r.top,0);return r.height>2&&seen>=Math.min(.55*r.height,.55*vh)}
  function frame(ts){S.raf=0;if(!S.vis||document.hidden)return;if(!S.mid&&midNow())S.mid=true;var fps=LITE?30:(o.fps||30);if(S.last&&ts-S.last<1000/fps-2){S.raf=requestAnimationFrame(frame);return}
    var dt=Math.min(.05,(ts-(S.last||ts))/1000);S.last=ts;c.setTransform(S.dpr,0,0,S.dpr,0,0);c.clearRect(0,0,S.cw,S.ch);var t0=performance.now();draw(ts,dt,S);
    var cost=performance.now()-t0;S.ema=S.ema==null?cost:S.ema*.85+cost*.15;S.n=(S.n||0)+1;if(!LITE&&S.n>12&&S.ema>16){LITE=true;size()}   // frames over ~16 ms of drawing: go lite for good
    if(!S.raf)S.raf=requestAnimationFrame(frame)}   // size() may already have queued the next frame: never run two loops
  /* a canvas that is plainly on screen counts as visible even if the observer has not said so yet (phones, 31 Oct: the scene
     stayed empty until the view was toggled, because a stale "not visible" entry was read) */
  function onScreen(){if(!cv.isConnected)return false;var r=cv.getBoundingClientRect();return r.width>2&&r.height>2&&r.bottom>0&&r.right>0&&r.top<(window.innerHeight||0)&&r.left<(window.innerWidth||0)}
  S.kick=function(){if(!S.vis&&onScreen()){S.vis=true;if(o.onShow)o.onShow()}if(S.vis&&!S.raf){S.last=0;S.raf=requestAnimationFrame(frame)}};
  if("ResizeObserver" in window)new ResizeObserver(size).observe(cv);else window.addEventListener("resize",size);
  if("IntersectionObserver" in window)new IntersectionObserver(function(es){var was=S.vis;S.vis=es[es.length-1].isIntersecting;if(!S.mid&&midNow())S.mid=true;if(S.vis&&!was&&o.onShow)o.onShow();S.kick()},{threshold:[.01,.3,.55,.8]}).observe(cv);else{S.vis=true}
  document.addEventListener("visibilitychange",S.kick);
  size();return S;
}
function tag(c,cw,l1,l2,red,anchor){
  var fs=clamp(cw*.026,11,17);
  c.font=fs+"px 'Share Tech Mono',monospace";var w1=c.measureText(l1).width;c.font=(fs*1.5)+"px 'Share Tech Mono',monospace";var w2=c.measureText(l2).width;
  var tw=Math.max(w1,w2)+fs*1.5,th=fs*3.6,tx=cw-tw-14,ty=14,CS=red?PAL.red:PAL.planeS;
  c.save();if(anchor){c.strokeStyle=rgba(CS,.9);c.lineWidth=1.2;c.beginPath();c.moveTo(anchor[0],anchor[1]);c.lineTo(tx+tw*.5,ty+th);c.stroke();
    c.fillStyle=rgba(CS,1);c.beginPath();c.arc(anchor[0],anchor[1],3,0,Math.PI*2);c.fill()}
  c.shadowColor=rgba(CS,.55);c.shadowBlur=LITE?0:18;c.beginPath();if(c.roundRect)c.roundRect(tx,ty,tw,th,fs*.4);else c.rect(tx,ty,tw,th);c.fillStyle=red?"#E05C5C":"#E8C56A";c.fill();c.restore();
  c.fillStyle=red?"#1A0606":"#1A1400";c.textAlign="left";c.textBaseline="alphabetic";c.font=fs+"px 'Share Tech Mono',monospace";c.fillText(l1,tx+fs*.75,ty+fs*1.15);
  c.font=(fs*1.5)+"px 'Share Tech Mono',monospace";c.fillText(l2,tx+fs*.75,ty+fs*2.9);
}

/* ===== net worth scene: one column per asset class (above the gold zero plane) and per debt (hanging below it) =====
 * setData({cols:[{key,name,short,col:[r,g,b],v,dir:1|-1,segs?:[{key,name,col,v}]}],net,debt,fmt}). Values are in the display currency.
 * A column with segs stacks them in order from the gold plane outwards (first segment nearest the plane); each block and cube takes the
 * colour of the segment its value falls in, so several credit cards share one column and each keeps its own card colour (owner, 30 Oct 2026).
 * 1 block = U, 1 cube = U/10 (U = £1,000 unless the tallest column would pass 14 blocks). Nine cubes, then a block.
 * New blocks drop 18 units over 700 ms with a 1000 ms gold flash; removed ones rise 16 units over 900 ms, turn gold and fade. */
function makeNW(cv,o){
  o=o||{};
  var st={yaw:-.55,pitch:.46,dist:125,zoom:1.2,ty:2,fit:.9},self={st:st},idle=-9999,boxes=[],uid=0,cols=[],byKey={},X={},Z={},LZ={},U=1000,first=true,pendingOpen=false,narrow=null;
  var net=0,debt=0,hover=null,tD=125,tTy=2,SP=15,BH=3.2,SM=3.1,fmt=o.fmt||function(v){return "£"+Math.round(v).toLocaleString("en-GB")},PL=.5,box={x:40,z0:-17,z1:17};
  function spawn(k,s,i,born,off){boxes.push({id:uid++,k:k,s:s,i:i,born:born,off:off||0,leave:0,merge:false})}
  /* colour of the piece whose value runs from v0 for len: the segment holding its middle */
  function segCol(c,v0,len){if(!c.segs||!c.segs.length)return c.col;var m=v0+len/2,acc=0;for(var i=0;i<c.segs.length;i++){acc+=c.segs[i].v;if(m<acc)return c.segs[i].col}return c.segs[c.segs.length-1].col}
  function liveL(k,s){return boxes.filter(function(b){return b.k===k&&b.s===s&&!b.leave})}
  function leaveTop(k,s,n,now,anim,merge){var L=liveL(k,s).sort(function(a,b){return b.i-a.i});for(var j=0;j<n&&j<L.length;j++){if(anim){L[j].leave=now;L[j].merge=!!merge}else L[j].dead=true}boxes=boxes.filter(function(b){return !b.dead})}
  /* one row of columns; on a phone with more than five columns, two rows: what you own at the back, what you owe in front */
  function layout(){
    narrow=S.cw<520;var own=cols.filter(function(c){return c.dir>0}),owe=cols.filter(function(c){return c.dir<0}),rows=[cols];
    if(narrow&&cols.length>5)rows=own.length&&owe.length?[own,owe]:[cols.slice(0,Math.ceil(cols.length/2)),cols.slice(Math.ceil(cols.length/2))];
    var wide=0;rows.forEach(function(r,ri){var zr=rows.length>1?(ri?8:-8):0;wide=Math.max(wide,r.length);
      r.forEach(function(c,j){X[c.key]=(j-(r.length-1)/2)*SP;Z[c.key]=zr;LZ[c.key]=rows.length>1&&!ri?zr-14:zr+17})});
    box={x:Math.max(1,wide)*SP/2+6,z0:rows.length>1?-17:-17,z1:rows.length>1?17:17};
  }
  self.setData=function(d){
    var now=performance.now(),rm=reduceMotion(),anim=!rm&&!first,list=(d.cols||[]).filter(function(c){return c.v>=.5});
    if(d.fmt)fmt=d.fmt;net=d.net;debt=d.debt;
    var mx=0;list.forEach(function(c){mx=Math.max(mx,c.v)});
    var nU=niceUnit(mx,14),rebuild=first||nU!==U,keys={};U=nU;
    list.forEach(function(c){keys[c.key]=1});
    boxes.forEach(function(b){if(!keys[b.k]&&!b.leave){if(anim)b.leave=now;else b.dead=true}});boxes=boxes.filter(function(b){return !b.dead});
    var nb={};
    list.forEach(function(c,j){var q=split(c.v,U),old=byKey[c.key],i;nb[c.key]={b:q.b,s:q.s,f:q.f,c:c};
      if(rebuild||!old){
        boxes=boxes.filter(function(b){return b.k!==c.key});
        var open=first&&!rm;for(i=0;i<q.b;i++)spawn(c.key,0,i,open?-1:-1e9,j*90+i*45);for(i=0;i<q.s;i++)spawn(c.key,1,i,open?-1:-1e9,j*90+q.b*45+i*30);
        if(anim&&!old&&!rebuild)boxes.forEach(function(b){if(b.k===c.key)b.born=now+b.off*.3});
        return}
      if(q.b>old.b){for(i=old.b;i<q.b;i++)spawn(c.key,0,i,anim?now+(i-old.b)*NW_D.dropStep:-1e9);
        leaveTop(c.key,1,99,now,anim,true);for(i=0;i<q.s;i++)spawn(c.key,1,i,anim?now+(q.b-old.b)*NW_D.dropStep+i*NW_D.subStep:-1e9)}
      else if(q.b<old.b){leaveTop(c.key,0,old.b-q.b,now,anim,false);boxes=boxes.filter(function(b){return !(b.k===c.key&&b.s===1)});for(i=0;i<q.s;i++)spawn(c.key,1,i,-1e9)}
      else if(q.s>old.s){for(i=old.s;i<q.s;i++)spawn(c.key,1,i,anim?now+(i-old.s)*NW_D.subStep:-1e9)}
      else if(q.s<old.s)leaveTop(c.key,1,old.s-q.s,now,anim,false);
    });
    byKey=nb;cols=list;if(first)pendingOpen=!rm;first=false;layout();
    var up=2,dn=0;list.forEach(function(c){var q=nb[c.key],h=q.b*BH+((q.s||q.f>.03)?SM:0);if(c.dir>0)up=Math.max(up,h);else dn=Math.max(dn,h)});
    self._up=up;self._dn=dn;tTy=(up-dn)/2;self._snap=rm||self._snap===undefined;
    cv.dataset.net=String(Math.round(net));cv.dataset.unit=String(U);cv.dataset.cols=list.map(function(c){return c.key}).join(",");
    S.kick();return self.totals();
  };
  self.totals=function(){var a=0,dd=0,cc={};cols.forEach(function(c){cc[c.key]={v:c.v,blocks:byKey[c.key].b,cubes:byKey[c.key].s};if(c.dir>0)a+=c.v;else dd+=c.v});return {assets:a,debt:dd,net:net,unit:U,cols:cc}};
  self.unit=function(){return U};
  self.replay=function(){if(reduceMotion())return;var now=performance.now();boxes.forEach(function(b){if(!b.leave)b.born=now+b.off});S.kick()};
  self.started=function(){return !pendingOpen};
  self.kick=function(){S.kick()};
  function geo(b,ts){
    var c=byKey[b.k],dir=c?c.c.dir:(b.k.indexOf("debt")===0?-1:1),cn=c?c.b:0,col=c?(b.s?segCol(c.c,cn*U+b.i*U/10,U/10):segCol(c.c,b.i*U,U)):PAL.gold;
    var g={x:X[b.k]||0,z:Z[b.k]||0,w:10,d:10,h:BH,y:0,col:col};
    if(b.s){g.w=g.d=g.h=SM;g.x+=(b.i%3-1)*3.45;g.z+=(Math.floor(b.i/3)-1)*3.45;g.y=dir<0?-(cn*BH)-SM:cn*BH}
    else g.y=dir<0?-(b.i+1)*BH:b.i*BH;
    if(b.born===-1&&pendingOpen)return null;   /* waiting for the middle of the screen: not built yet */
    var age=ts-b.born,al=1,fl=0;
    if(b.born>0){if(age<0)return null;g.y+=age<NW_D.drop?(1-ease3(age/NW_D.drop))*18:0;fl=clamp(1-age/NW_D.flash,0,1)}
    if(b.leave){var lt=clamp((ts-b.leave)/NW_D.leave,0,1);g.y+=(b.merge?-1:1)*ease3(lt)*(b.merge?3:16);al=1-lt;fl=1-lt*.15}
    g.al=al;g.fl=fl;g.dir=dir;g.k=b.k;return g;
  }
  /* the top cube grows by its fraction, so a few pounds still show */
  function partials(){var out=[];cols.forEach(function(c){var q=byKey[c.key];if(q.f>.04&&q.s<9){var i=q.s,h=SM*q.f,base=c.dir<0?-(q.b*BH)-SM:q.b*BH;
    out.push({x:X[c.key]+(i%3-1)*3.45,z:Z[c.key]+(Math.floor(i/3)-1)*3.45,w:SM,d:SM,h:h,y:c.dir<0?base+SM-h:base,col:segCol(c,q.b*U+i*U/10,U/10),al:1,fl:0,dir:c.dir,k:c.key})}});return out}
  function draw(ts,dt,S){
    var c=S.c,cw=S.cw,ch=S.ch,rm=reduceMotion(),i;
    if(narrow!==(cw<520)&&cols.length)layout();
    if(pendingOpen&&(rm||S.mid)){boxes.forEach(function(b){if(b.born===-1)b.born=ts+b.off});pendingOpen=false}   /* the opening build starts when the stage is about half on screen (owner, 2 Nov) */
    if(!pendingOpen)boxes.forEach(function(b){if(b.born===-1)b.born=-1e9});
    if(!rm&&!ob.isDrag()&&ts-idle>2500)st.yaw=-.55+Math.sin(ts/4200)*.35;
    st.fit=cw<520?1.1:.9;var hx=box.x+2,fb=[[-hx,hx,0,0,box.z0,box.z1]];
    cols.forEach(function(cc){var q=byKey[cc.key],h=q.b*BH+SM,x=X[cc.key],z=Z[cc.key];fb.push(cc.dir>0?[x-5,x+5,0,h,z-5,z+5]:[x-5,x+5,-h,0,z-5,z+5],[x-4,x+4,0,0,LZ[cc.key]-2,LZ[cc.key]+6])});
    tD=fitDist(st,cw,ch,fb,-.55,tTy,.92,.8);
    var k=rm||self._snap?1:Math.min(1,dt*3);self._snap=false;st.dist+=(tD-st.dist)*k;st.ty+=(tTy-st.ty)*k;
    PL=rm?.5:.5+.5*Math.sin(ts*0.002244);
    var P=new Proj(st,{x:0,y:0,w:cw,h:ch});self._P=P;
    var items=[];boxes.forEach(function(b){var g=geo(b,ts);if(g)items.push(g)});items=items.concat(partials());
    items.forEach(function(g){g.dz=Math.hypot(P.pos[0]-g.x,P.pos[1]-(g.y+g.h/2),P.pos[2]-g.z)});items.sort(function(a,b){return b.dz-a.dz});
    boxes=boxes.filter(function(b){return !(b.leave&&ts-b.leave>=900)});
    function paint(g){var col=g.fl>0?mix(g.col,PAL.flash,g.fl):g.col;if(hover===g.k)col=mix(col,PAL.flash,.45);drawBox(c,P,g,PL,col,(PAL.fa+.08*PL)*g.al,(.62+.3*PL)*g.al,PAL.edgeK)}
    c.save();
    items.forEach(function(g){if(g.dir<0)paint(g)});
    var red=net<0;
    ground(c,P,st,box.x,box.z0,box.z1,red,ts,rm,12);
    /* column names on the floor, staggered when they would collide: the back row's behind the stacks, the front row's in front */
    var lf=clamp(cw*.022,10,12),lines={};
    function names(back){c.font=lf+"px 'Share Tech Mono',monospace";c.textAlign="center";c.textBaseline="alphabetic";
    cols.filter(function(cc){return (LZ[cc.key]<0)===back}).map(function(cc){return {c:cc,q:P.pt(X[cc.key],0,LZ[cc.key])}}).sort(function(a,b){return a.q[0]-b.q[0]}).forEach(function(L){
      var placed=lines.box=lines.box||[],w=c.measureText(L.c.short).width,r=-1;L.q[0]=clamp(L.q[0],w/2+4,cw-w/2-(L.q[1]>ch*.45?54:4));   /* clear of the zoom buttons */L.q[1]=Math.min(L.q[1],ch-14-2*(lf+3));   /* full names (owner, 31 Oct): up to three staggered lines, never off the stage, never over another name */
      for(var j=0;j<3&&r<0;j++){var yy=L.q[1]+j*(lf+3),x0=L.q[0]-w/2-3,x1=L.q[0]+w/2+3;if(!placed.some(function(B){return Math.abs(B.y-yy)<lf+2&&x0<B.x1&&x1>B.x0}))r=j}
      if(r<0)return;placed.push({x0:L.q[0]-w/2-3,x1:L.q[0]+w/2+3,y:L.q[1]+r*(lf+3)});
      var ly=L.q[1]+r*(lf+3);c.fillStyle="rgba(8,8,8,.72)";c.fillRect(L.q[0]-w/2-3,ly-lf*1.05,w+6,lf*1.5);   /* the income flow's label plate: transparent black behind the name (owner, 31 Oct) */
      c.fillStyle=labCol(L.c);if(hover===L.c.key)c.fillStyle='#fff';   /* each name in its own column's colour (owner, 2 Nov), lightened only as far as the dark label plate needs to read */c.fillText(L.c.short,L.q[0],ly)})}
    if(narrow){items.forEach(function(g){if(g.dir>0)paint(g)});names(true);names(false)}   /* phones: names on top of the blocks, so none hides behind a column */
    else{names(true);items.forEach(function(g){if(g.dir>0)paint(g)});names(false)}
    var l1=debt<=0&&net>=0?"OUT OF THE RED":red?"IN THE RED":"NET WORTH";
    tag(c,cw,l1,fmt(net),red,P.pt(box.x,0,0));
    c.restore();
  }
  var ob=orbit(cv,st,{touch:function(){idle=performance.now()},reset:function(){idle=-9999;S.kick()}});
  self.zoom=ob.zoom;self.reset=ob.reset;
  /* tap or hover a column to read it */
  function pick(ex,ey){var r=cv.getBoundingClientRect(),mx=ex-r.left,my=ey-r.top,best=null,bd=1e9,P=self._P;if(!P)return;
    cols.forEach(function(c){var q=byKey[c.key],h=Math.max(2,q.b*BH+SM),a=P.pt(X[c.key],c.dir<0?-h:0,Z[c.key]),b=P.pt(X[c.key],c.dir<0?0:h,Z[c.key]),w=Math.max(10,a[3]*6);
      if(mx<a[0]-w||mx>a[0]+w)return;var y0=Math.min(a[1],b[1])-10,y1=Math.max(a[1],b[1])+10;if(my<y0||my>y1)return;var dd=Math.abs(mx-a[0])+(a[2]*.01);if(dd<bd){bd=dd;best=c.key}});
    if(best!==hover){hover=best;if(o.onPick)o.onPick(hover?byKey[hover].c:null)}}
  cv.addEventListener("pointermove",function(e){if(e.pointerType==="mouse"&&!e.buttons)pick(e.clientX,e.clientY)});
  cv.addEventListener("pointerdown",function(e){pick(e.clientX,e.clientY)});
  cv.addEventListener("pointerleave",function(e){if(e.pointerType==="mouse"&&hover){hover=null;if(o.onPick)o.onPick(null)}});
  var S=stage(cv,o,draw);
  return self;
}

/* ===== net worth tracker, 3D blocks view: one stack per month of the main chart's own points =====
 * setData({labels,nw,debt,inc,today,sel:{nw,debt,inc,fc},fmt}). Index > today = forecast (ghost blocks: faint fill, edge only).
 * Net worth rises above the gold zero plane (teal; a negative month hangs below it), debt hangs below (red), income stands in a lane in front (gold).
 * Stacks rise left to right, 45 ms apart, each easing over 700 ms; the top cube grows by its fraction so nothing pops. */
function makeTracker(cv,o){
  o=o||{};
  var st={yaw:-.3,pitch:.36,dist:260,zoom:1,ty:14,fit:1},self={st:st},idle=-9999;
  var D={labels:[],nw:[],debt:[],inc:[]},N=0,TODAY=0,sel={nw:true,debt:true,inc:true,fc:true},hover=-1,t0=0,U=1000,SM=3.1,BH=3.2,sp=13,played=false;
  var fmt=o.fmt||function(v){return "£"+Math.round(v).toLocaleString("en-GB")};
  function shown(i){return i<=TODAY||sel.fc}
  function unit(){var mx=0;for(var i=0;i<N;i++){if(!shown(i))continue;if(sel.nw)mx=Math.max(mx,Math.abs(D.nw[i]));if(sel.debt)mx=Math.max(mx,D.debt[i]||0);if(sel.inc&&i<=TODAY)mx=Math.max(mx,D.inc[i]||0)}return niceUnit(mx,14)}
  function cur(){return hover>=0?hover:TODAY}
  function emit(){cv.dataset.unit=String(U);cv.dataset.months=String(N);if(o.onChange){var i=cur();o.onChange({i:i,hover:hover,lab:D.labels[i],v:{nw:D.nw[i],debt:D.debt[i],inc:D.inc[i]},forecast:i>TODAY,unit:U,sel:sel})}}
  self.setData=function(d){D=d;N=d.nw.length;TODAY=d.today;if(d.sel)for(var k in d.sel)sel[k]=d.sel[k];if(d.fmt)fmt=d.fmt;U=unit();t0=performance.now();played=S.vis&&S.mid;hover=-1;emit();S.kick()};
  self.setSeries=function(k,on){sel[k]=on;U=unit();t0=performance.now()-300;emit();S.kick()};
  self.replay=function(){t0=performance.now();S.kick()};
  self.started=function(){return played};
  self.data=function(){return {labels:D.labels.slice(),nw:D.nw.slice(),debt:D.debt.slice(),inc:D.inc.slice(),today:TODAY,unit:U,sel:JSON.parse(JSON.stringify(sel))}};
  function CO(ts,i){return reduceMotion()?1:ease3(clamp((ts-t0-i*NW_D.stackStep)/NW_D.stack,0,1))}
  function lanes(){var neg=false;if(sel.nw)for(var i=0;i<N;i++)if(shown(i)&&D.nw[i]<0)neg=true;return {nw:0,debt:neg?-14:0,inc:16,zMin:neg?-28:-14,zMax:sel.inc?34:14}}
  function hgt(v){var q=split(Math.abs(v),U);return q.b*BH+((q.s||q.f>.03)?SM:0)}
  function draw(ts,dt,S){
    var c=S.c,cw=S.cw,ch=S.ch,rm=reduceMotion(),i,k;
    if(!played){if(S.mid||reduceMotion()){t0=ts;played=true}else t0=Infinity}   /* the intro starts when the stage is about half on screen (owner, 2 Nov) */
    var Y0=cw<520?-.62:-.3;   /* on a phone the row turns further so the months recede into the depth of a tall stage */
    if(self._narrow!==(cw<520)){self._narrow=cw<520;st.yaw=Y0}
    if(!rm&&!ob.isDrag()&&ts-idle>2500)st.yaw=Y0+Math.sin(ts/4600)*.18;
    var PL=rm?.5:.5+.5*Math.sin(ts*0.002244),Ln=lanes(),cnt=Math.max(1,N),mid=(N-1)/2,items=[];
    var up=2,dn=0;for(i=0;i<N;i++){if(!shown(i))continue;if(sel.nw){if(D.nw[i]>=0)up=Math.max(up,hgt(D.nw[i]));else dn=Math.max(dn,hgt(D.nw[i]))}if(sel.debt)dn=Math.max(dn,hgt(D.debt[i]||0));if(sel.inc&&i<=TODAY)up=Math.max(up,hgt(D.inc[i]||0))}
    st.fit=cw<520?1.15:1;var tTy=(up-dn)/2+2,hx=(cnt*sp)/2+6,fb=[[-hx,hx,0,0,Ln.zMin,Ln.zMax+10]];
    for(i=0;i<N;i++){if(!shown(i))continue;var xx=(i-mid)*sp,hu=sel.nw&&D.nw[i]>=0?hgt(D.nw[i]):0,hd=Math.max(sel.nw&&D.nw[i]<0?hgt(D.nw[i]):0,sel.debt?hgt(D.debt[i]||0):0);fb.push([xx-5,xx+5,-hd,hu,-5,5]);if(sel.inc&&i<=TODAY)fb.push([xx-5,xx+5,0,hgt(D.inc[i]||0),11,21])}
    if(TODAY>=0)fb.push([(TODAY-mid)*sp+sp/2,(TODAY-mid)*sp+sp/2,-dn-4,up+8,Ln.zMin,Ln.zMax]);
    var tD=fitDist(st,cw,ch,fb,Y0,tTy,.92,.78),kk=rm?1:Math.min(1,dt*3);
    if(!self._init){st.dist=tD;st.ty=tTy;self._init=true}st.dist+=(tD-st.dist)*kk;st.ty+=(tTy-st.ty)*kk;
    var P=new Proj(st,{x:0,y:0,w:cw,h:ch});self._P=P;self._mid=mid;
    function stack(xc,zc,v,dir,col,ghost,idx){
      var q=split(v,U);
      for(k=0;k<q.b;k++)items.push({x:xc,z:zc,w:10,d:10,h:BH,y:dir>0?k*BH:-(k+1)*BH,col:col,ghost:ghost,i:idx});
      var base=dir>0?q.b*BH:-(q.b*BH)-SM;
      for(k=0;k<q.s;k++)items.push({x:xc+(k%3-1)*3.45,z:zc+(Math.floor(k/3)-1)*3.45,w:SM,d:SM,h:SM,y:base,col:col,ghost:ghost,i:idx});
      if(q.f>.03&&q.s<9){var hh=SM*q.f;items.push({x:xc+(q.s%3-1)*3.45,z:zc+(Math.floor(q.s/3)-1)*3.45,w:SM,d:SM,h:hh,y:dir>0?base:base+SM-hh,col:col,ghost:ghost,i:idx})}
    }
    for(i=0;i<N;i++){if(!shown(i))continue;var x=(i-mid)*sp,fc=i>TODAY,e=CO(ts,i);
      if(sel.nw)stack(x,Ln.nw,Math.abs(D.nw[i])*e,D.nw[i]<0?-1:1,PAL.teal,fc,i);
      if(sel.debt)stack(x,Ln.debt,(D.debt[i]||0)*e,-1,PAL.red,fc,i);
      if(sel.inc&&!fc)stack(x,Ln.inc,(D.inc[i]||0)*e,1,PAL.gold,fc,i)}
    items.forEach(function(g){g.dz=Math.hypot(P.pos[0]-g.x,P.pos[1]-(g.y+g.h/2),P.pos[2]-g.z)});items.sort(function(p,q){return q.dz-p.dz});
    var half=(cnt*sp)/2+6;
    function box(g){var hl=g.i===hover,col=hl?mix(g.col,PAL.flash,.55):g.col;
      drawBox(c,P,g,PL,col,g.ghost?.14:(PAL.fa+.08*PL),g.ghost?.5:(.62+.3*PL),g.ghost?0:PAL.edgeK)}
    c.save();
    items.forEach(function(g){if(g.y<0)box(g)});
    var negNow=sel.nw&&D.nw[TODAY]<0;
    ground(c,P,st,half,Ln.zMin,Ln.zMax,negNow,ts,rm,sp);
    if(TODAY>=0&&TODAY<N){var tx=(TODAY-mid)*sp+sp/2,y0=-dn-4,y1=up+4,T1=P.pt(tx,y0,Ln.zMin),T2=P.pt(tx,y1,Ln.zMin),T3=P.pt(tx,y1,Ln.zMax),T4=P.pt(tx,y0,Ln.zMax);
      {c.beginPath();c.moveTo(T1[0],T1[1]);c.lineTo(T2[0],T2[1]);c.lineTo(T3[0],T3[1]);c.lineTo(T4[0],T4[1]);c.closePath();c.fillStyle=rgba(PAL.planeF,.06);c.fill();c.setLineDash([5,5]);c.strokeStyle=rgba(PAL.planeS,.7);c.lineWidth=1;c.stroke();c.setLineDash([]);
        c.fillStyle=rgba(PAL.planeS,1);c.font="11px 'Share Tech Mono',monospace";c.textAlign="center";c.fillText("TODAY",T2[0],T2[1]-6)}}
    var ls=clamp(cw*.02,9,12);c.font=ls+"px 'Share Tech Mono',monospace";c.textAlign="center";c.fillStyle=PAL.label;
    var step=Math.max(1,Math.round(cnt/(cw<520?4:7)));for(i=0;i<N;i+=step){if(!shown(i))continue;var q=P.pt((i-mid)*sp,0,Ln.zMax+7);c.fillStyle=i===hover?rgba(PAL.gold,1):PAL.label;c.fillText(D.labels[i],q[0],q[1]+ls)}
    if(hover>=0&&(hover%step)){q=P.pt((hover-mid)*sp,0,Ln.zMax+7);c.fillStyle=rgba(PAL.gold,1);c.fillText(D.labels[hover],q[0],q[1]+ls)}
    items.forEach(function(g){if(g.y>=0)box(g)});
    c.restore();
    tagBox(c,cw);
  }
  function tagBox(c,cw){
    if(!N)return;var i=cur(),fs=clamp(cw*.024,10,15),fc=i>TODAY;
    var rows=[(fc?"FORECAST  ":"")+D.labels[i]];if(sel.nw)rows.push("NET WORTH  "+fmt(D.nw[i]));if(sel.debt)rows.push("DEBT       "+fmt(D.debt[i]||0));if(sel.inc&&!fc)rows.push("INCOME     "+fmt(D.inc[i]||0));
    c.font=fs+"px 'Share Tech Mono',monospace";var tw=0;rows.forEach(function(r){tw=Math.max(tw,c.measureText(r).width)});tw+=fs*1.5;var th=fs*(rows.length*1.25+.9),tx=14,ty=12;
    c.save();c.shadowColor=rgba(PAL.planeS,.5);c.shadowBlur=16;c.beginPath();if(c.roundRect)c.roundRect(tx,ty,tw,th,fs*.4);else c.rect(tx,ty,tw,th);c.fillStyle="#E8C56A";c.fill();c.restore();
    c.fillStyle="#1A1400";c.textAlign="left";c.textBaseline="alphabetic";rows.forEach(function(r,k){c.fillText(r,tx+fs*.75,ty+fs*(1.25*k+1.3))});
  }
  /* tap or hover a month to read it */
  function pick(ex,ey){var r=cv.getBoundingClientRect(),mx=ex-r.left,my=ey-r.top,best=-1,bd=1e9,P=self._P;if(!P)return;
    for(var i=0;i<N;i++){if(!shown(i))continue;var h=sel.nw?hgt(D.nw[i])*(D.nw[i]<0?-.6:.6):2,q=P.pt((i-self._mid)*sp,h,0),dd=Math.hypot(q[0]-mx,(q[1]-my)*.35);if(dd<bd&&dd<Math.max(28,q[3]*sp*.8)){bd=dd;best=i}}
    if(best!==hover){hover=best;emit();S.kick()}}
  cv.addEventListener("pointermove",function(e){if(e.pointerType==="mouse"&&!e.buttons)pick(e.clientX,e.clientY)});
  cv.addEventListener("pointerdown",function(e){pick(e.clientX,e.clientY)});
  cv.addEventListener("pointerleave",function(e){if(e.pointerType==="mouse"&&hover!==-1){hover=-1;emit()}});
  cv.addEventListener("keydown",function(e){if(e.key==="Home"||e.key==="End"||e.key==="PageUp"||e.key==="PageDown"){var i=cur();i=e.key==="Home"?0:e.key==="End"?N-1:e.key==="PageUp"?Math.max(0,i-1):Math.min(N-1,i+1);hover=i;emit();e.preventDefault()}});
  var ob=orbit(cv,st,{touch:function(){idle=performance.now()},reset:function(){idle=-9999;S.kick()}});
  self.zoom=ob.zoom;self.reset=ob.reset;
  var S=stage(cv,{fps:o.fps||30,onShow:function(){if(!played)t0=performance.now()}},draw);
  return self;
}
/* ===== budget in 3D (owner, 31 Oct 2026): where the monthly income goes, as a tree map of £100 blocks =====
 * setData({groups:[{key,label,col:[r,g,b],items:[{name,v}]}],total,fmt}). One clean rectangle, laid out like the debt tree map
 * (owner, 31 Oct 19:04, dtmSquarify): each colour group (expense type) is an exact rectangle, area in proportion to its amount, and
 * inside it each budget line is an exact rectangle too. A line's rectangle is filled with blocks: rows of £100 blocks, and one
 * thinner last row that shares the pounds left over (so a block is never worth more than £100 and every rectangle is filled to the
 * pound). One flat layer, low blocks (owner: 35% lower); lines in alternating shades; only a hairline between blocks and between
 * groups, so from above it reads as one solid rectangle (owner, 31 Oct). What is not assigned yet is a grey area.
 * Over about 360 blocks the block becomes £200, £500, £1,000 ... and says so.
 * Intro (owner, 31 Oct): the income arrives as a teal pile on the left, then the blocks slide right along x into their places,
 * taking their group's colour as they land. Reduced motion shows the finished map. */
function makeTreeMap(cv,o){
  o=o||{};
  var st={yaw:-.5,pitch:.98,dist:125,zoom:1.15,ty:1,fit:.9},self={st:st},idle=-9999,cells=[],groups=[],rects=[],raw=[],total=0,hover=null,first=true,pending=false,PL=.5,
    fmt=o.fmt||function(v){return "£"+Math.round(v).toLocaleString("en-GB")},U=100,BS=3.3,GG=.035,LG=.02,CH=.85,ext={x:10,z:10},plate={W:20,D:20},pile={x0:0,x1:0},
    T_IN=NW_D.pileMs,T_GO=NW_D.goMs,SPREAD=NW_D.spread,t0=0,sx=0;
  function unitFor(t){var u=100,steps=[100,200,500,1000,2000,5000,10000],k=0;while(t/u>360&&k<steps.length-1){k++;u=steps[k]}return u}
  /* a line's rectangle in blocks: columns about one £100 block wide, full rows of £100 blocks, then one thinner row for the rest */
  function fill(r,g,it,j,rect){
    var v=it.v,kpa=r.w*r.h/v,side=Math.sqrt(U*kpa),c=Math.max(1,Math.min(Math.round(r.w/side)||1,Math.max(1,Math.floor(v/U+1e-9)))),cw=r.w/c,
      nf=Math.floor(v/(U*c)+1e-9),rem=v-nf*U*c,rd=U*kpa/cw,z=r.y,k,bi=Math.min(.025,cw*.02);
    if(rem<.005)rem=0;
    function put(zz,dd,val){for(k=0;k<c;k++)cells.push({g:g,it:it,ii:j,r:rect,val:val,part:val/U,x:r.x+cw*(k+.5),z:zz+dd/2,w:Math.max(.05,cw-bi),d:Math.max(.05,dd-Math.min(.025,dd*.02)),row:Math.round(zz*100)})}
    for(var q=0;q<nf;q++){put(z,rd,U);z+=rd}
    if(rem>0)put(z,r.y+r.h-z,rem/c);
  }
  function layout(narrow){
    var G=groups.slice().sort(function(a,b){return (a.key==='un')-(b.key==='un')||b.sum-a.sum}),tot=G.reduce(function(a,g){return a+g.sum},0);
    var want=narrow?1.05:1.9,A=Math.max(1,tot/U)*BS*BS*1.18,W=Math.sqrt(A*want),D=A/W;plate={W:W,D:D};ext={x:W/2,z:D/2};
    raw=typeof dtmSquarify==='function'?dtmSquarify(G.map(function(g){return {v:g.sum,d:g}}),-W/2,-D/2,W,D):[];
    rects=[];cells=[];
    raw.forEach(function(gr){var g=gr.d,rect={g:g,x:gr.x+GG/2,z:gr.y+GG/2,w:Math.max(.4,gr.w-GG),d:Math.max(.4,gr.h-GG)};rects.push(rect);
      var its=g.items.slice().sort(function(a,b){return b.v-a.v});
      dtmSquarify(its.map(function(it,j){return {v:it.v,d:{it:it,j:j}}}),rect.x,rect.z,rect.w,rect.d).forEach(function(lr){
        var r={x:lr.x+(lr.x>rect.x+.01?LG/2:0),y:lr.y+(lr.y>rect.z+.01?LG/2:0)};
        r.w=lr.x+lr.w-r.x-(lr.x+lr.w<rect.x+rect.w-.01?LG/2:0);r.h=lr.y+lr.h-r.y-(lr.y+lr.h<rect.z+rect.d-.01?LG/2:0);
        fill(r,g,lr.d.it,lr.d.j,rect)});
      rect.k=cells.filter(function(c){return c.r===rect}).length});
    /* the income pile on the left, the first blocks to leave nearest the map */
    var pp=BS+.4,rowsZ=Math.max(1,Math.floor(D/pp)),pc=Math.max(1,Math.ceil(cells.length/rowsZ)),gapX=narrow?2:3;
    pile={x0:-ext.x-gapX*pp-pc*pp,x1:-ext.x-gapX*pp};
    cells.forEach(function(c,q){c.px=pile.x1-(Math.floor(q/rowsZ)+.5)*pp;c.pz=-ext.z+(q%rowsZ)*pp+pp/2;c.off=T_IN+q*Math.min(NW_D.cellStep,SPREAD/Math.max(1,cells.length))});
  }
  self.setData=function(d){
    var rm=reduceMotion();if(d.fmt)fmt=d.fmt;total=d.total||0;
    groups=(d.groups||[]).map(function(g){var items=(g.items||[]).filter(function(it){return it.v>0});return {key:g.key,label:g.label,col:g.col,items:items,sum:items.reduce(function(a,it){return a+it.v},0)}}).filter(function(g){return g.sum>0});
    U=unitFor(groups.reduce(function(a,g){return a+g.sum},0));self._narrow=S.cw<520;layout(self._narrow);
    if(first&&!rm){pending=true;t0=Infinity}else if(!pending)t0=-1e9;   /* later changes settle at once; the intro plays on first show and on Replay */
    first=false;
    cv.dataset.total=String(Math.round(total));cv.dataset.unit=String(U);cv.dataset.blocks=String(cells.length);S.kick();return self.tiles();
  };
  /* for tests and the readout: each line's value, its blocks (the last one partial) and the value they stand for; each group's rectangle */
  self.tiles=function(){var by={};cells.forEach(function(c){var k=c.g.key+'|'+c.ii,t=by[k]||(by[k]={group:c.g.key,name:c.it.name,v:c.it.v,blocks:0,worth:0,rows:{}});t.blocks++;t.worth+=c.part*U;t.rows[c.row]=1});
    return Object.keys(by).map(function(k){var t=by[k];t.rows=Object.keys(t.rows).map(Number);return t})};
  self.rects=function(){return rects.map(function(r){return {group:r.g.key,x:r.x,z:r.z,w:r.w,d:r.d,blocks:r.k,sum:r.g.sum}})};
  self.plate=function(){return {W:plate.W,D:plate.D,H:CH,areas:raw.map(function(r){return {group:r.d.key,a:r.w*r.h,sum:r.d.sum}})}};
  self.cells=function(){return cells.map(function(c){return {group:c.g.key,name:c.it.name,val:c.val,x:c.x,z:c.z,w:c.w,d:c.d}})};
  self.unit=function(){return U};
  self.phase=function(){var ts=performance.now();if(pending||t0===Infinity)return 'waiting';if(t0<0)return 'done';var e=ts-t0;return e<T_IN?'pile':e<lastEnd()?'moving':'done'};
  self.replay=function(){if(reduceMotion())return;pending=true;t0=Infinity;S.kick()};
  self.kick=function(){S.kick()};
  self.flags=function(){return (self._flags||[]).map(function(f){return JSON.parse(JSON.stringify(f))})};self.outlines=function(){return (self._outl||[]).slice()};self.plates=function(){return 0};self.tagRect=function(){return self._tag||null};   /* tests: the flag posts and outlines of the last frame; the old floor plates are gone */
  self.clock=function(){return t0>=0&&t0!==Infinity?performance.now()-t0:null};
  function lastEnd(){return cells.length?cells[cells.length-1].off+T_GO:0}
  function shade(c){var t=(c.ii%2)?.16:0;return t?mix(c.g.col,[255,255,255],t):c.g.col}
  /* where a block is at time ts: in the pile, sliding right with a small hop, or landed (a gold flash as it lands) */
  function geo(c,ts){
    var g={x:c.x,z:c.z,w:c.w,d:c.d,h:CH,y:0,col:shade(c),fl:0,c:c},age=ts-t0;
    if(t0<0||age>=c.off+T_GO+NW_D.land)return g;
    if(age<0)return null;
    if(age<c.off){g.x=c.px;g.z=c.pz;g.col=PAL.teal;var a=clamp(age/T_IN,0,1);g.y=(1-ease3(a))*7;return g}
    var m=age-c.off;
    if(m<T_GO){var e=ease3(m/T_GO);g.x=mix1(c.px,c.x,e);g.z=mix1(c.pz,c.z,e);g.y=Math.sin(Math.PI*e)*2.6;g.col=mix(PAL.teal,g.col,clamp((e-.5)/.5,0,1));return g}
    g.fl=clamp(1-(m-T_GO)/NW_D.land,0,1);return g;
  }
  function mix1(a,b,t){return a+(b-a)*t}
  function draw(ts,dt,S){
    var cx=S.c,cw=S.cw,ch=S.ch,rm=reduceMotion(),narrow=cw<520;
    if(groups.length&&narrow!==self._narrow){self._narrow=narrow;layout(narrow)}
    if(pending&&(rm||S.mid)){t0=rm?-1e9:ts;pending=false}   /* waits for the middle of the screen (owner, 2 Nov) */
    var Y0=narrow?-.2:-.42;
    if(!rm&&!ob.isDrag()&&ts-idle>2500)st.yaw=Y0+Math.sin(ts/5200)*(narrow?.1:.22);else if(rm&&!ob.engaged())st.yaw=Y0;
    st.fit=narrow?1.05:.92;if(narrow&&!self._pitchSet&&!ob.engaged()){st.pitch=1.12;self._pitchSet=true}
    /* while the income arrives the camera frames the pile and the map together, then settles on the map */
    var intro=t0>=0&&ts-t0<lastEnd()+600,x0=intro?pile.x0-1:-ext.x-2,cxm=(x0+ext.x+2)/2;
    var SC=2.4,fb=[[(x0-cxm)*SC,(ext.x+1-cxm)*SC,0,(CH+1)*SC,(-ext.z-1)*SC,(ext.z+1)*SC]],tD=fitDist(st,cw,ch,fb,Y0,1,narrow?.92:.95,narrow?.8:.8);   /* SC: the map is drawn 2.4x larger, so the camera can come close enough */
    var k=rm||self._snapD?1:Math.min(1,dt*2.2);if(!self._d0){st.dist=tD;self._d0=true}self._snapD=false;st.dist+=(tD-st.dist)*k;
    sx+=(cxm-sx)*k;
    PL=rm?.5:.5+.5*Math.sin(ts*0.002244);
    var P0=new Proj(st,{x:0,y:0,w:cw,h:ch}),Pr={focal:P0.focal,pos:[P0.pos[0]/SC+sx,P0.pos[1]/SC,P0.pos[2]/SC],pt:function(x,y,z){return P0.pt((x-sx)*SC,y*SC,z*SC)}};self._P=Pr;
    cx.save();
    ground(cx,Pr,st,ext.x+1,-ext.z-1,ext.z+1,false,ts,rm,BS+.5);
    /* each group's area on the floor (owner, 2 Nov 2026, E8: "a dark red outline should ring fence all of the committed essentials, and then a
       flag post to the label. And then that should be rolled out across the rest"; Pedro's spec G): a faint fill under the blocks, then after the
       blocks a 1.5 px outline at .95 in the group's colour, inset .3 units so neighbouring groups show a gap, and a flag post with its chip */
    var land=function(r){var last=cells.filter(function(c){return c.r===r}).pop();if(t0<0||!last)return 1;return clamp((ts-t0-last.off-T_GO*.6)/NW_D.land,0,1)};
    var IN=.3,quad=function(r,y){var ix=Math.min(IN,r.w*.25),iz=Math.min(IN,r.d*.25),x0=r.x+ix,x1=r.x+r.w-ix,z0=r.z+iz,z1=r.z+r.d-iz;return [Pr.pt(x0,y,z0),Pr.pt(x1,y,z0),Pr.pt(x1,y,z1),Pr.pt(x0,y,z1)]},
      path=function(q){cx.beginPath();cx.moveTo(q[0][0],q[0][1]);for(var i=1;i<4;i++)cx.lineTo(q[i][0],q[i][1]);cx.closePath()};
    rects.forEach(function(r){var a=land(r);if(a<=0)return;path(quad(r,.02));cx.fillStyle=rgba(r.g.col,.08*a);cx.fill()});
    var items=[];cells.forEach(function(c){var g=geo(c,ts);if(g)items.push(g)});
    items.forEach(function(g){g.dz=Math.hypot(Pr.pos[0]-g.x,Pr.pos[1]-(g.y+g.h/2),Pr.pos[2]-g.z)});items.sort(function(a,b){return b.dz-a.dz});
    items.forEach(function(g){var col=g.fl>0?mix(g.col,PAL.flash,g.fl*.8):g.col;if(hover&&hover.g===g.c.g&&hover.ii===g.c.ii)col=mix(col,PAL.flash,.45);drawBox(cx,Pr,g,PL,col,PAL.fa+.16+.06*PL,.66+.25*PL,PAL.edgeK)});
    var outl=[];rects.forEach(function(r){var a=land(r);if(a<=0)return;var dash=r.g.key==='iv'?[6,4]:[];   // Investments dashed, 6 on 4 off (Pedro round 1): money that is put away but still yours to move
      path(quad(r,.02));cx.strokeStyle=rgba(r.g.col,.95*a);cx.lineWidth=1.5;cx.lineJoin='round';if(cx.setLineDash)cx.setLineDash(dash);cx.stroke();if(cx.setLineDash)cx.setLineDash([]);
      outl.push({group:r.g.key,lineWidth:1.5,alpha:.95,fill:.08,inset:IN,afterBlocks:true,dash:dash})});
    self._outl=outl;
    /* flag posts: 1 px in the group colour from the area's back-left corner to two block heights above the blocks, a 3 px dot, and on it a chip
       (name in DM Sans, amount in Share Tech Mono in the group colour). Projected every frame, so the posts turn with the orbit; only the chip
       faces the screen. A chip that would cover another is raised one chip height at a time (at most three), then shows the amount only; it
       never slides off its post. Reduced motion: the posts stand at full height at once. */
    var NF="600 11px 'DM Sans',sans-serif",AF="10.5px 'Share Tech Mono',monospace",PX=6,PY=4,HC=19,placed=[],flags=[],todo=[];
    (function(){var fs=clamp(cw*.026,11,17);cx.font=fs+"px 'Share Tech Mono',monospace";var w1=cx.measureText("MONTHLY INCOME").width;cx.font=(fs*1.5)+"px 'Share Tech Mono',monospace";var w2=cx.measureText(fmt(total)).width;
      var tw=Math.max(w1,w2)+fs*1.5,th=fs*3.6;placed.push({x:cw-tw-14-4,y:14-4,w:tw+8,h:th+8});self._tag={x:cw-tw-14,y:14,w:tw,h:th}})();   // the Monthly income tag (drawn last, top right) is in the way too
    var fl=rects.map(function(r){var ix=Math.min(IN,r.w*.25),iz=Math.min(IN,r.d*.25),bx=r.x+ix,bz=r.z+iz;return {r:r,bx:bx,bz:bz,base:Pr.pt(bx,.02,bz),top:Pr.pt(bx,CH*3,bz)}});
    fl.sort(function(a,b){return (b.r.g.key==='ce')-(a.r.g.key==='ce')||b.top[1]-a.top[1]});   // committed essential first (the owner's own example keeps its name), then nearest post first: the chips further back rise into the open space above
    fl.forEach(function(o){
      var r=o.r,a=land(r);if(a<=0)return;
      var rise=rm?1:ease3(a),tp=rise>=1?o.top:Pr.pt(o.bx,.02+(CH*3-.02)*rise,o.bz),name=r.g.label,amt=fmt(r.g.sum);
      cx.font=NF;var nw=cx.measureText(name+' \u00b7 ').width;cx.font=AF;var aw=cx.measureText(amt).width;
      var fit=function(only,k,left){var w=PX*2+(only?0:nw)+aw,dx=tp[0],dy=tp[1]-k*(HC+2),x=left?dx-w:dx;   // the chip hangs right of its post, or left of it, its corner exactly on the dot (Pedro round 1: no gap)
        return {x:x,y:dy-HC,w:w,h:HC,dot:[dx,dy],k:k,only:only}};
      var clash=function(c){return c.y<0||c.x<0||c.x+c.w>cw||placed.some(function(b){return c.x<b.x+b.w+3&&b.x<c.x+c.w+3&&c.y<b.y+b.h+2&&b.y<c.y+c.h+2})};
      var c=null;[false,true].some(function(only){for(var k=0;k<=3;k++)for(var sd=0;sd<2;sd++){var t=fit(only,k,sd===1);if(!clash(t)){c=t;return true}}return false});
      var none=!c;if(none)c=fit(true,0,false);else placed.push(c);   // no room at all: the post and its dot stand without a chip rather than cover another (the readout below names every group)
      todo.push({o:o,r:r,a:a,c:c,none:none,name:name,amt:amt,nw:nw,rise:rise});});
    todo.forEach(function(t){var r=t.r,c=t.c;cx.globalAlpha=t.a;   // every post first, then every chip on top, so no post crosses a chip
      cx.strokeStyle=rgba(r.g.col,1);cx.lineWidth=1;cx.beginPath();cx.moveTo(t.o.base[0],t.o.base[1]);cx.lineTo(c.dot[0],c.dot[1]);cx.stroke();
      cx.fillStyle=rgba(r.g.col,1);cx.beginPath();cx.arc(c.dot[0],c.dot[1],1.5,0,Math.PI*2);cx.fill();cx.globalAlpha=1});
    todo.forEach(function(t){var r=t.r,c=t.c,a=t.a,o=t.o,name=t.name,amt=t.amt,nw=t.nw,rise=t.rise;
      if(t.none){flags.push({group:r.g.key,name:name,amount:amt,col:r.g.col.slice(),base:o.base.slice(0,2),dot:c.dot.slice(),chip:null,raise:0,amountOnly:true,worldTop:CH*3,blockH:CH,rise:rise,alpha:a,style:null});return}
      cx.globalAlpha=a;cx.beginPath();if(cx.roundRect)cx.roundRect(c.x+.5,c.y+.5,c.w-1,c.h-1,4);else cx.rect(c.x+.5,c.y+.5,c.w-1,c.h-1);cx.fillStyle='rgba(8,8,8,0.88)';cx.fill();cx.strokeStyle=rgba(r.g.col,.5);cx.lineWidth=1;cx.stroke();
      cx.textBaseline='middle';cx.textAlign='left';var ty=c.y+c.h/2+.5,tx=c.x+PX;
      if(!c.only){cx.font=NF;cx.fillStyle='#E8E8E8';cx.fillText(name+' \u00b7 ',tx,ty);tx+=nw}
      cx.font=AF;cx.fillStyle=rgba(r.g.col,1);cx.fillText(amt,tx,ty);cx.beginPath();cx.arc(c.dot[0],c.dot[1],1.5,0,Math.PI*2);cx.fill();cx.globalAlpha=1;   // the dot again on the chip's corner, so the anchor shows
      flags.push({group:r.g.key,name:name,amount:amt,col:r.g.col.slice(),base:o.base.slice(0,2),dot:c.dot.slice(),chip:{x:c.x,y:c.y,w:c.w,h:c.h},raise:c.k,amountOnly:c.only,
        worldTop:CH*3,blockH:CH,rise:rise,alpha:a,style:{fill:'rgba(8,8,8,0.88)',stroke:.5,radius:4,padX:PX,padY:PY,nameFont:NF,amtFont:AF,nameCol:'#E8E8E8',post:1,dot:3}})});
    self._flags=flags;
    var lf=clamp(cw*.02,9,12);   // the caption's size (it was set by the floor labels this replaces)
    tag(cx,cw,"MONTHLY INCOME",fmt(total),false,null);
    cx.fillStyle=PAL.label;cx.textAlign="left";cx.textBaseline="alphabetic";cx.font=lf+"px 'Share Tech Mono',monospace";cx.fillText("1 block = "+fmt(U)+(intro?"  ·  income arriving":""),12,ch-12);
    cx.restore();
  }
  var ob=orbit(cv,st,{touch:function(){idle=performance.now()},reset:function(){idle=-9999;S.kick()}});
  self.zoom=ob.zoom;self.reset=ob.reset;
  function inside(px,py,poly){var ins=false;for(var i=0,j=poly.length-1;i<poly.length;j=i++){var xi=poly[i][0],yi=poly[i][1],xj=poly[j][0],yj=poly[j][1];if(((yi>py)!==(yj>py))&&(px<(xj-xi)*(py-yi)/(yj-yi)+xi))ins=!ins}return ins}
  function pick(ex,ey){var r=cv.getBoundingClientRect(),mx=ex-r.left,my=ey-r.top,Pr=self._P,best=null,bd=Infinity;if(!Pr)return;
    cells.forEach(function(c){var y=CH,x0=c.x-c.w/2-.2,x1=c.x+c.w/2+.2,z0=c.z-c.d/2-.2,z1=c.z+c.d/2+.2,poly=[Pr.pt(x0,y,z0),Pr.pt(x1,y,z0),Pr.pt(x1,y,z1),Pr.pt(x0,y,z1)];
      if(inside(mx,my,poly)){var dz=Pr.pt(c.x,y,c.z)[2];if(dz<bd){bd=dz;best=c}}});
    var was=hover;hover=best;
    if((was&&was.g)!==(best&&best.g)||(was&&was.ii)!==(best&&best.ii)){if(o.onPick)o.onPick(best?{group:best.g.label,name:best.it.name,v:best.it.v,share:total>0?best.it.v/total:0,blocks:cells.filter(function(c){return c.g===best.g&&c.ii===best.ii}).length,unit:U}:null);S.kick()}}
  cv.addEventListener("pointermove",function(e){if(e.pointerType==="mouse"&&!e.buttons)pick(e.clientX,e.clientY)});
  cv.addEventListener("pointerdown",function(e){pick(e.clientX,e.clientY)});
  cv.addEventListener("pointerleave",function(e){if(e.pointerType==="mouse"&&hover){hover=null;if(o.onPick)o.onPick(null);S.kick()}});
  var S=stage(cv,o,draw);self._narrow=S.cw<520;
  return self;
}
window.ViNW3D={timing:NW_D,makeNW:makeNW,makeTracker:makeTracker,makeTreeMap:makeTreeMap,niceUnit:niceUnit,split:split,reduceMotion:reduceMotion,lite:function(v){if(v!=null)LITE=!!v;return LITE},coarse:COARSE};
})();

window.VI_PITCH_DATA={"scene":{"cols":[{"key":"cash","name":"Cash and savings","short":"Cash and savings","col":[62,207,142],"v":25300,"dir":1},{"key":"deposit","name":"House deposit","short":"House deposit","col":[68,192,185],"v":22500,"dir":1},{"key":"stocks","name":"Stocks and shares","short":"Stocks and shares","col":[63,181,133],"v":26731.8,"dir":1},{"key":"metals","name":"Precious metals","short":"Precious metals","col":[232,197,106],"v":5227.5,"dir":1},{"key":"crypto","name":"Crypto","short":"Crypto","col":[68,192,185],"v":5180,"dir":1},{"key":"inv","name":"Wealth inventory","short":"Wealth inventory","col":[155,126,200],"v":12500,"dir":1},{"key":"debt:loan","name":"Student Loan Plan 2","short":"Loans","col":[224,92,92],"v":24300,"dir":-1,"segs":null},{"key":"debt:credit","name":"Barclaycard","short":"Credit cards","col":[0,174,239],"v":1850,"dir":-1,"segs":null},{"key":"liabval","name":"Liabilities, value","short":"Liabilities","col":[245,158,11],"v":4728.16,"dir":1},{"key":"owed","name":"Owed to you","short":"Owed to you","col":[100,181,246],"v":0,"dir":1},{"key":"other","name":"Other assets","short":"Other assets","col":[154,160,166],"v":0,"dir":1},{"key":"debtov","name":"Debts added on the Overview","short":"DEBTS","col":[224,92,92],"v":0,"dir":-1},{"key":"running","name":"Running costs so far","short":"Running costs","col":[245,158,11],"v":6139.65,"dir":-1}],"net":69877.81,"debt":26150},"tracker":{"labels":["Apr '26","May '26","Jun '26","Jul '26","Aug '26","Sep '26","Oct '26","Nov '26","Dec '26","Jan '27","Feb '27","Mar '27","Apr '27","May '27"],"nw":[38500,43200,48100,53400,58700,63900,68000,69878,71458,73040,74626,76214,77804,79397],"debt":[36100,35650,35200,34750,34300,33850,33400,32290,32472,32656,32841,33028,33217,33408],"inc":[4150,4150,4150,4150,4150,4150,4150,4150,0,0,0,0,0,0],"today":7,"sel":{"nw":true,"debt":true,"inc":true,"fc":true}}};
/* Mount: each [data-live] box on the pitch page gets the app's viewport, fed the app's demo account (captured from the app, not typed in). */
(function(){
var E=window.ViNW3D;if(!E)return;
function fmt(v){return '£'+Math.round(v).toLocaleString('en-GB')}
var D=window.VI_PITCH_DATA;
document.querySelectorAll('.live[data-live]').forEach(function(box){
  var cv=box.querySelector('canvas'),read=box.querySelector('.live-read'),eng,sum='';
  try{
    if(box.getAttribute('data-live')==='nw'){
      eng=E.makeNW(cv,{fps:E.coarse?30:60,fmt:fmt,onPick:function(c){read.textContent=c?(c.name+(c.dir<0?', owed ':' ')+fmt(c.v)):sum}});
      var t=eng.setData({cols:D.scene.cols,net:D.scene.net,debt:D.scene.debt,fmt:fmt});
      sum='Own '+fmt(t.assets)+' · Owe '+fmt(t.debt)+' · Net worth '+fmt(D.scene.net);read.textContent=sum;
      try{eng.zoom(.8)}catch(e){}   /* the pitch slot is wider than the app's card: open a little further out so the tall columns are not cropped */
    }else{
      var T=D.tracker,today='Today: net worth '+fmt(T.nw[T.today])+' · debt '+fmt(T.debt[T.today]);
      eng=E.makeTracker(cv,{fps:30,fmt:fmt,onChange:function(s){
        if(s.lab==null){read.textContent=today;return}
        var x=s.lab+(s.forecast?' (forecast)':'')+': net worth '+fmt(s.v.nw);if(s.sel.debt)x+=' · debt '+fmt(s.v.debt);if(s.sel.inc&&!s.forecast)x+=' · income '+fmt(s.v.inc)+'/mo';read.textContent=x}});
      eng.setData(T);read.textContent=today;
    }
    /* live only where the 3D has room (400 px and up: laptop, tablet in either orientation, a large phone turned sideways in
       Present mode; owner, 8 Nov 2026, a tablet in portrait scaled the box to about 470 px and showed the still: "These are static");
       a smaller box keeps the matching still underneath, since the engine's labels would cover the scene */
    var sm=function(){box.classList.toggle('on',box.clientWidth>=400)};sm();if('ResizeObserver' in window)new ResizeObserver(sm).observe(box);else addEventListener('resize',sm);
  }catch(e){box.classList.remove('on');return}
  box.addEventListener('click',function(e){var b=e.target.closest('[data-z]');if(!b)return;e.stopPropagation();
    if(b.getAttribute('data-z')==='reset')eng.reset();else eng.zoom(b.getAttribute('data-z')==='in'?1.25:.8)});
});
})();
