/*! Vault-It 3D engine. Dependency free. WebGL for the brickwork, canvas 2D for the HUD.
 * Extracted from the brand book. Lift as is, then wire to app data.
 * makeStage(canvas,{railPad,padB,padT,theme,fps,onFrame})   the to-scale house builder, bricks laid one at a time
 * makeNW(canvas,{theme,fps,onChange})                        net worth scene with £1,000 blocks and £100 cubes
 * makeTracker(canvas,{theme,fps,onChange})                   tracker with Graph and 3D blocks views (setView, setRange, setSeries, setData)
 * Falls back to a flat canvas 2D house if WebGL is unavailable (ViEngine.glr() returns null).
 */
(function(){
"use strict";
var reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
/* ===== 3D engine: canvas 2D, no dependencies ===== */
var C_TEAL=[68,192,185],C_GOLD=[232,197,106],C_RED=[224,92,92],C_GREEN=[62,207,142],C_TILE=[52,158,190];
function clamp(v,a,b){return v<a?a:v>b?b:v}
function seg(p,a,b){return clamp((p-a)/(b-a),0,1)}
function mix(a,b,t){return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]}
function rgba(c,a){return "rgba("+(c[0]|0)+","+(c[1]|0)+","+(c[2]|0)+","+a.toFixed(3)+")"}
function ease3(t){return 1-Math.pow(1-t,3)}
var LD=(function(){var v=[-.45,.7,.55],l=Math.hypot(v[0],v[1],v[2]);return [v[0]/l,v[1]/l,v[2]/l]})();
function Proj(st,rect){
  var cp=Math.cos(st.pitch),sp=Math.sin(st.pitch),d=st.dist/st.zoom;
  var pos=[d*Math.sin(st.yaw)*cp,st.ty+d*sp,d*Math.cos(st.yaw)*cp];
  var f=[-pos[0],st.ty-pos[1],-pos[2]],l=Math.hypot(f[0],f[1],f[2]);f[0]/=l;f[1]/=l;f[2]/=l;
  var r=[-f[2],0,f[0]],rl=Math.hypot(r[0],r[2]);r[0]/=rl;r[2]/=rl;
  var u=[r[1]*f[2]-r[2]*f[1],r[2]*f[0]-r[0]*f[2],r[0]*f[1]-r[1]*f[0]];
  var focal=Math.min(rect.h,rect.w*(st.fit||.85))/2/Math.tan(19*Math.PI/180);
  var cx=rect.x+rect.w/2,cy=rect.y+rect.h/2+(st.shiftY||0)*rect.h;
  this.pos=pos;this.r=r;this.u=u;this.f=f;this.W=rect.w;this.H=rect.h;this.focal=focal;
  this.pt=function(x,y,z){var vx=x-pos[0],vy=y-pos[1],vz=z-pos[2];
    var X=vx*r[0]+vy*r[1]+vz*r[2],Y=vx*u[0]+vy*u[1]+vz*u[2],Z=vx*f[0]+vy*f[1]+vz*f[2];
    if(Z<1)Z=1;var s=focal/Z;return [cx+X*s,cy-Y*s,Z,s]};
}
function boxEdges(x0,x1,y0,y1,z0,z1){return [[x0,y0,z0,x1,y0,z0],[x1,y0,z0,x1,y0,z1],[x1,y0,z1,x0,y0,z1],[x0,y0,z1,x0,y0,z0],[x0,y1,z0,x1,y1,z0],[x1,y1,z0,x1,y1,z1],[x1,y1,z1,x0,y1,z1],[x0,y1,z1,x0,y1,z0],[x0,y0,z0,x0,y1,z0],[x1,y0,z0,x1,y1,z0],[x1,y0,z1,x1,y1,z1],[x0,y0,z1,x0,y1,z1]]}

/* the Victorian mid-terrace: bricks, gables, tiles, chimneys, windows, wireframe */
function buildHouseLegacy(){
  var bw=3,W=33,D=69,R=28,G=14,ov=1.5,NT=9,NC=18,br=[],tiles=[],chim=[],wins=[],wire=[],i,j,k;
  var bx0=-14.5,bx1=-3.5,bz=D/2+4;
  function segs(a,b,off){var o=[],s=a,e=off>0?a+off:a+bw;while(s<b-1e-6){e=Math.min(b,e);o.push([s,e]);s=e;e=s+bw}return o}
  function fz(s,y0,y1,z,n){return {q:[[s[0],y0,z],[s[1],y0,z],[s[1],y1,z],[s[0],y1,z]],n:[0,0,n]}}
  function fx(s,y0,y1,x,n){return {q:[[x,y0,s[0]],[x,y0,s[1]],[x,y1,s[1]],[x,y1,s[0]]],n:[n,0,0]}}
  function pushRow(arr,grp,lvl,row){row.forEach(function(b,n){arr.push({grp:grp,lvl:lvl,q:b.q,n:b.n,ord:n/row.length})})}
  for(i=0;i<R;i++){
    var off=(i%2)?bw/2:0,row=[];
    segs(-W/2,W/2,off).forEach(function(s){row.push(fz(s,i,i+1,D/2,1))});
    segs(-D/2,D/2,off).reverse().forEach(function(s){row.push(fx(s,i,i+1,W/2,1))});
    segs(-W/2,W/2,off).reverse().forEach(function(s){row.push(fz(s,i,i+1,-D/2,-1))});
    segs(-D/2,D/2,off).forEach(function(s){row.push(fx(s,i,i+1,-W/2,-1))});
    if(i<12){
      segs(D/2,bz,off).forEach(function(s){row.push(fx(s,i,i+1,bx0,-1))});
      segs(bx0,bx1,off).forEach(function(s){row.push(fz(s,i,i+1,bz,1))});
      segs(D/2,bz,off).reverse().forEach(function(s){row.push(fx(s,i,i+1,bx1,1))});
    }
    pushRow(br,0,i,row);
  }
  for(k=0;k<G;k++){
    var hw=W/2*(1-(k+1)/G);if(hw<1.4)break;
    var off2=(k%2)?bw/2:0,row2=[];
    [1,-1].forEach(function(sg){segs(-hw,hw,off2).forEach(function(s){row2.push(fz(s,R+k,R+k+1,sg*D/2,sg))})});
    pushRow(br,1,k,row2);
  }
  var top=R+G,ex=W/2+ov,ye=R-ov*G/(W/2),kk=(top-ye)/ex,hy=Math.hypot(kk,1),zN=D+2*ov;
  for(i=0;i<NT;i++){
    var t0=i/NT,t1=(i+1)/NT,stag=(i%2)?.5:0;
    for(j=0;j<NC;j++){
      var za=Math.max(-D/2-ov,-D/2-ov+(j+stag)*zN/NC),zb=Math.min(D/2+ov,-D/2-ov+(j+stag+1)*zN/NC);
      if(zb-za<.3)continue;
      [-1,1].forEach(function(sd){
        var xa=sd*ex*(1-t0),xb=sd*ex*(1-t1),ya=ye+(top-ye)*t0,yb=ye+(top-ye)*t1;
        tiles.push({q:[[xa,ya,za],[xa,ya,zb],[xb,yb,zb],[xb,yb,za]],n:[sd*kk/hy,1/hy,0]});
      });
    }
  }
  [{x:0,z:20},{x:0,z:-22}].forEach(function(c){
    for(var m=0;m<15;m++){
      var o3=(m%2)?1.5:0,row3=[],y0=top-7+m;
      segs(c.x-3,c.x+3,o3).forEach(function(s){row3.push(fz(s,y0,y0+1,c.z+3,1))});
      segs(c.z-3,c.z+3,o3).reverse().forEach(function(s){row3.push(fx(s,y0,y0+1,c.x+3,1))});
      segs(c.x-3,c.x+3,o3).reverse().forEach(function(s){row3.push(fz(s,y0,y0+1,c.z-3,-1))});
      segs(c.z-3,c.z+3,o3).forEach(function(s){row3.push(fx(s,y0,y0+1,c.x-3,-1))});
      pushRow(chim,2,m,row3);
    }
    boxEdges(c.x-3,c.x+3,top-7,top+8,c.z-3,c.z+3).forEach(function(e){wire.push(e)});
  });
  boxEdges(-W/2,W/2,0,R,-D/2,D/2).forEach(function(e){wire.push(e)});
  boxEdges(bx0,bx1,0,12,D/2,bz).forEach(function(e){wire.push(e)});
  [1,-1].forEach(function(sg){
    wire.push([-W/2,R,sg*D/2,0,top,sg*D/2],[W/2,R,sg*D/2,0,top,sg*D/2]);
    wire.push([-ex,ye,sg*(D/2+ov),0,top,sg*(D/2+ov)],[ex,ye,sg*(D/2+ov),0,top,sg*(D/2+ov)]);
  });
  wire.push([0,top,-D/2-ov,0,top,D/2+ov],[-ex,ye,-D/2-ov,-ex,ye,D/2+ov],[ex,ye,-D/2-ov,ex,ye,D/2+ov]);
  function wF(x0,x1,y0,y1,z,n,door){var xm=(x0+x1)/2,ym=y0+(y1-y0)*.58;
    wins.push({q:[[x0,y0,z],[x1,y0,z],[x1,y1,z],[x0,y1,z]],n:[0,0,n],door:!!door,m:door?[]:[[xm,y0,z,xm,y1,z],[x0,ym,z,x1,ym,z]]})}
  function wS(z0,z1,y0,y1,x,n){var zm=(z0+z1)/2,ym=y0+(y1-y0)*.58;
    wins.push({q:[[x,y0,z0],[x,y0,z1],[x,y1,z1],[x,y1,z0]],n:[n,0,0],door:false,m:[[x,y0,zm,x,y1,zm],[x,ym,z0,x,ym,z1]]})}
  wF(-14,-6,16,24,D/2+.05,1);wF(6,14,16,24,D/2+.05,1);wF(5,11,0,11,D/2+.05,1,true);
  wF(-12.5,-5.5,3,10,bz+.05,1);wS(D/2+.8,bz-.8,3,10,bx0-.05,-1);wS(D/2+.8,bz-.8,3,10,bx1+.05,1);
  [26,9,-8,-24].forEach(function(zc){[[3,11],[16,24]].forEach(function(y){wS(zc-3.5,zc+3.5,y[0],y[1],W/2+.05,1);wS(zc-3.5,zc+3.5,y[0],y[1],-W/2-.05,-1)})});
  [[-14,-6],[6,14]].forEach(function(x){[[3,11],[16,24]].forEach(function(y){wF(x[0],x[1],y[0],y[1],-D/2-.05,-1)})});
  return {W:W,D:D,R:R,G:G,ov:ov,top:top,ex:ex,ye:ye,br:br,tiles:tiles,chim:chim,wins:wins,wire:wire,nb:br.length,total:br.length+tiles.length+chim.length};
}

var TH={
  dark:{brick:C_TEAL,tile:C_TILE,mortar:"rgba(0,10,16,.55)",mw:.14,shMin:.5,wire:"rgba(68,192,185,.34)",rafter:"rgba(120,230,222,.85)",grid:[68,192,185],gridA:.30,glow:[68,192,185],glowA:.24,foot:C_TEAL,flash:C_GOLD,sheen:[190,250,244],backA:.15,frontA:.74,planeF:C_GOLD,planeS:C_GOLD,planeFA:.11,planeBlur:14,winDark:[6,50,56],winLit:[244,204,112],winFrame:[120,230,222],mull:[232,240,240],doorBase:[10,62,66],ring:C_TEAL,lw:1,litBlur:12},
  light:{brick:[24,124,120],tile:[44,100,140],mortar:"rgba(255,255,255,.8)",mw:.16,shMin:.62,wire:"rgba(0,110,106,.55)",rafter:"rgba(0,118,114,.95)",grid:[0,127,123],gridA:.24,glow:[0,127,123],glowA:.12,foot:[0,127,123],flash:[222,164,24],sheen:[255,255,255],backA:.10,frontA:.9,planeF:[232,197,106],planeS:[150,108,0],planeFA:.24,planeBlur:0,winDark:[168,204,210],winLit:[255,208,100],winFrame:[0,100,96],mull:[255,255,255],doorBase:[56,108,114],ring:[0,127,123],lw:1.15,litBlur:7}
};
function rootTheme(){return document.documentElement.getAttribute("data-theme")==="light"?"light":"dark"}
function renderHouse2D(ctx,rect,st){
  var T=TH[st.theme==="light"?"light":"dark"],H=st.H,p=st.p,now=st.now||0,P=new Proj(st,rect),i,j;
  var R=H.R,G=H.G,W=H.W,D=H.D,top=H.top,ex=H.ex,ye=H.ye;
  var wallRows=R*seg(p,.05,.50),gableRows=G*seg(p,.50,.65),tileN=Math.round(H.tiles.length*seg(p,.65,.80)),chimRows=15*seg(p,.78,.83);
  var sw=((now/1000*9)%(R+G+18))-4,pulse=(st.noPulse||reduce)?.5:.5+.5*Math.sin(now*0.002244),ping=(st.noPulse||reduce)?0:(now%2800)/2800,built=seg(p,.05,1);
  ctx.save();ctx.beginPath();ctx.rect(rect.x,rect.y,rect.w,rect.h);ctx.clip();
  var c0=P.pt(0,0,0),rad=62*c0[3];
  ctx.save();ctx.translate(c0[0],c0[1]);ctx.scale(1,Math.max(.3,Math.sin(st.pitch)));
  var g=ctx.createRadialGradient(0,0,0,0,0,rad*1.7);g.addColorStop(0,rgba(T.glow,T.glowA));g.addColorStop(.6,rgba(T.glow,T.glowA*.3));g.addColorStop(1,rgba(T.glow,0));
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,rad*1.7,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.lineWidth=1;
  for(i=-5;i<=5;i++){
    ctx.strokeStyle=rgba(T.grid,T.gridA*(1-Math.abs(i)/6.5));
    var A=P.pt(i*14,0,-70),B=P.pt(i*14,0,70);ctx.beginPath();ctx.moveTo(A[0],A[1]);ctx.lineTo(B[0],B[1]);ctx.stroke();
    A=P.pt(-70,0,i*14);B=P.pt(70,0,i*14);ctx.beginPath();ctx.moveTo(A[0],A[1]);ctx.lineTo(B[0],B[1]);ctx.stroke();
  }
  function path(pts){ctx.beginPath();pts.forEach(function(q,n){var s=P.pt(q[0],q[1],q[2]);if(n)ctx.lineTo(s[0],s[1]);else ctx.moveTo(s[0],s[1])});ctx.closePath()}
  var sb=seg(p,.005,.03),fnd=seg(p,0,.05);
  if(sb>0){ctx.setLineDash([6,5]);ctx.strokeStyle=rgba(T.foot,.55*sb);ctx.lineWidth=1.2;path([[-W/2-9,0,-D/2-9],[W/2+9,0,-D/2-9],[W/2+9,0,D/2+9],[-W/2-9,0,D/2+9]]);ctx.stroke();ctx.setLineDash([])}
  if(fnd>0){path([[-W/2,0,-D/2],[W/2,0,-D/2],[W/2,0,D/2],[-W/2,0,D/2]]);ctx.fillStyle=rgba(T.foot,.14*fnd);ctx.fill();ctx.strokeStyle=rgba(T.foot,.75*fnd);ctx.lineWidth=1.4;ctx.stroke()}
  if(!st.noPulse&&!reduce&&p>.05){var rg=ping*34,ra=(1-ping)*(.1+.4*seg(p,.5,1));path([[-W/2-rg,0,-D/2-rg],[W/2+rg,0,-D/2-rg],[W/2+rg,0,D/2+rg],[-W/2-rg,0,D/2+rg]]);ctx.strokeStyle=rgba(T.ring,ra);ctx.lineWidth=2;ctx.stroke()}
  ctx.strokeStyle=T.wire;ctx.lineWidth=T.lw;ctx.beginPath();
  H.wire.forEach(function(e){var a=P.pt(e[0],e[1],e[2]),b=P.pt(e[3],e[4],e[5]);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1])});ctx.stroke();
  var tm=seg(p,.50,.65),NR=12,nT=Math.ceil(tm*NR);
  if(nT>0){ctx.strokeStyle=T.rafter;ctx.lineWidth=1.6;ctx.beginPath();
    for(i=0;i<nT;i++){var zz=-D/2-H.ov+i*(D+2*H.ov)/(NR-1);
      [-1,1].forEach(function(sd){var a=P.pt(sd*ex,ye,zz),b=P.pt(0,top,zz);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1])})}
    ctx.stroke()}
  var list=[],pr=st.prev,fl=st.flashT;
  function addEl(idx,q,n,laid,base){
    var was=pr[idx]===1;
    if(laid&&!was){pr[idx]=1;if(st.primed&&!st.noFlash)fl[idx]=now}else if(!laid&&was){pr[idx]=0;fl[idx]=0}
    if(!laid)return;
    var a=P.pt(q[0][0],q[0][1],q[0][2]),b=P.pt(q[1][0],q[1][1],q[1][2]),c=P.pt(q[2][0],q[2][1],q[2][2]),d=P.pt(q[3][0],q[3][1],q[3][2]);
    var mx=(q[0][0]+q[2][0])/2,my=(q[0][1]+q[2][1])/2,mz=(q[0][2]+q[2][2])/2;
    var fc=((P.pos[0]-mx)*n[0]+(P.pos[1]-my)*n[1]+(P.pos[2]-mz)*n[2])>0;
    var lt=Math.max(0,n[0]*LD[0]+n[1]*LD[1]+n[2]*LD[2]),sh=T.shMin+(1-T.shMin)*lt;
    var col=[base[0]*sh,base[1]*sh,base[2]*sh];
    var ft=fl[idx]?clamp(1-(now-fl[idx])/900,0,1):0;
    if(ft>0)col=mix(col,T.flash,ft);
    if(st.sweep){var dy=Math.abs(my-sw);if(dy<2.4)col=mix(col,T.sheen,(1-dy/2.4)*.5)}
    var pb=.95+.1*pulse;
    list.push({z:(a[2]+b[2]+c[2]+d[2])/4,x:[a[0],b[0],c[0],d[0]],y:[a[1],b[1],c[1],d[1]],col:[col[0]*pb,col[1]*pb,col[2]*pb],al:fc?(T.frontA+.2*ft+.06*pulse*built):T.backA,fc:fc,s:a[3]});
  }
  for(i=0;i<H.br.length;i++){var bk=H.br[i];addEl(i,bk.q,bk.n,(bk.lvl+bk.ord)<(bk.grp===0?wallRows:gableRows),T.brick)}
  for(i=0;i<H.tiles.length;i++){var tl=H.tiles[i];addEl(H.nb+i,tl.q,tl.n,i<tileN,T.tile)}
  for(i=0;i<H.chim.length;i++){var ch=H.chim[i];addEl(H.nb+H.tiles.length+i,ch.q,ch.n,(ch.lvl+ch.ord)<chimRows,T.brick)}
  var wa=seg(p,.80,.90),lit=seg(p,.90,.95),dec=seg(p,.95,1),backW=[],frontW=[];
  if(wa>0){H.wins.forEach(function(w){
    var mx=(w.q[0][0]+w.q[2][0])/2,my=(w.q[0][1]+w.q[2][1])/2,mz=(w.q[0][2]+w.q[2][2])/2;
    var fc=((P.pos[0]-mx)*w.n[0]+(P.pos[1]-my)*w.n[1]+(P.pos[2]-mz)*w.n[2])>0;(fc?frontW:backW).push(w)})}
  function drawWin(w,front){
    var s=w.q.map(function(q){return P.pt(q[0],q[1],q[2])});
    var col=w.door?mix(T.doorBase,C_GOLD,dec):mix(T.winDark,T.winLit,lit);
    ctx.save();
    if(front&&(w.door?dec:lit)>0){ctx.shadowColor=rgba(C_GOLD,.8*(w.door?dec:lit));ctx.shadowBlur=T.litBlur+9*pulse}
    ctx.beginPath();ctx.moveTo(s[0][0],s[0][1]);for(var n=1;n<4;n++)ctx.lineTo(s[n][0],s[n][1]);ctx.closePath();
    ctx.fillStyle=rgba(col,(front?.92:.3)*wa);ctx.fill();ctx.restore();
    ctx.strokeStyle=rgba(T.winFrame,(front?.95:.4)*wa);ctx.lineWidth=front?1.3:.8;ctx.stroke();
    if(w.m.length){ctx.strokeStyle=rgba(T.mull,(front?.75:.25)*wa);ctx.lineWidth=.9;ctx.beginPath();
      w.m.forEach(function(e){var a=P.pt(e[0],e[1],e[2]),b=P.pt(e[3],e[4],e[5]);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1])});ctx.stroke()}
  }
  backW.forEach(function(w){drawWin(w,false)});
  list.sort(function(a,b){return b.z-a.z});
  for(i=0;i<list.length;i++){
    var e=list[i];ctx.beginPath();ctx.moveTo(e.x[0],e.y[0]);ctx.lineTo(e.x[1],e.y[1]);ctx.lineTo(e.x[2],e.y[2]);ctx.lineTo(e.x[3],e.y[3]);ctx.closePath();
    ctx.fillStyle=rgba(e.col,e.al);ctx.fill();
    if(e.fc){ctx.strokeStyle=T.mortar;ctx.lineWidth=Math.max(.35,T.mw*e.s);ctx.stroke()}
  }
  frontW.forEach(function(w){drawWin(w,true)});
  var lv=p<.05?.02:p<.50?wallRows:p<.65?R+gableRows:R+G*seg(p,.65,.80),pa=1-seg(p,.80,.86),m=6;
  if(pa>0){
    ctx.save();if(T.planeBlur){ctx.shadowColor=rgba(T.planeF,.8*pa);ctx.shadowBlur=T.planeBlur}
    path([[-W/2-m,lv,-D/2-m],[W/2+m,lv,-D/2-m],[W/2+m,lv,D/2+m],[-W/2-m,lv,D/2+m]]);
    ctx.fillStyle=rgba(T.planeF,T.planeFA*pa);ctx.fill();ctx.strokeStyle=rgba(T.planeS,.95*pa);ctx.lineWidth=1.6;ctx.stroke();ctx.restore();
  }
  if(p>=.999){var hp=P.pt(6.4,5,D/2+.2),pul=.6+.4*Math.sin(now/260),L=16*hp[3]/4*(.7+pul*.5);
    ctx.save();ctx.strokeStyle=rgba(T.planeS,.95);ctx.lineWidth=2;if(T.planeBlur){ctx.shadowColor=rgba(C_GOLD,1);ctx.shadowBlur=14}ctx.beginPath();
    ctx.moveTo(hp[0]-L,hp[1]);ctx.lineTo(hp[0]+L,hp[1]);ctx.moveTo(hp[0],hp[1]-L);ctx.lineTo(hp[0],hp[1]+L);ctx.stroke();ctx.restore()}
  var row=Math.round(154*p),info={row:row,tiles:tileN,p:p};
  if(st.tag!==false){
    var pc=pa>0?P.pt(0,lv,0):P.pt(0,H.top,0),fs=clamp(rect.w*.026,11,17)*(st.fscale||1);
    var l1=p>=.999?"KEYS ARE YOURS":"ROW "+row+" / 154",l2=(p*100).toFixed(1)+"% OF DEPOSIT";
    ctx.font=fs+"px 'Share Tech Mono',monospace";
    var tw=Math.max(ctx.measureText(l1).width,ctx.measureText(l2).width)+fs*1.5,th=fs*2.9;
    var tx=clamp(pc[0]+fs*1.6,rect.x+6,rect.x+rect.w-tw-6-(st.railPad||0)),ty=clamp(pc[1]-th-fs*1.4,rect.y+6+(st.padT||0),rect.y+rect.h-th-6-(st.padB||0));
    ctx.save();ctx.strokeStyle=rgba(T.planeS,.9);ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(pc[0],pc[1]);ctx.lineTo(tx+tw*.2,ty+th);ctx.stroke();
    ctx.fillStyle=rgba(T.planeS,1);ctx.beginPath();ctx.arc(pc[0],pc[1],3,0,Math.PI*2);ctx.fill();
    if(T.planeBlur){ctx.shadowColor=rgba(C_GOLD,.55);ctx.shadowBlur=18}else{ctx.shadowColor="rgba(0,60,58,.25)";ctx.shadowBlur=10;ctx.shadowOffsetY=3}
    ctx.beginPath();
    if(ctx.roundRect)ctx.roundRect(tx,ty,tw,th,fs*.4);else ctx.rect(tx,ty,tw,th);ctx.fillStyle="#E8C56A";ctx.fill();ctx.restore();
    ctx.fillStyle="#1A1400";ctx.textBaseline="alphabetic";ctx.fillText(l1,tx+fs*.75,ty+fs*1.2);ctx.fillText(l2,tx+fs*.75,ty+fs*2.3);
  }
  st.primed=true;ctx.restore();return info;
}

/* ===== v2 geometry: to-scale brickwork. 1 unit = 75 mm (one course). ===== */
var HG_SCALE_MM=75;
function buildHouseGL(){
  var W=72,D=120,RW=88,G=36,TOP=154,TW=3,PIT=4.5,SL=3,GAP=.13,HL=2.87,ST=1.37,OV=2,BAYC=36,BX0=-32,BX1=-8,BZ=D/2+12,CH0=112,CHN=42,CHS=6;
  var ins=[],tl=[],gl=[],wire=[],wlist=[],c,i,j,cW=0,cG=0,cC=0,startW=[],ordW=[],ordG=[],ordC=[];
  function flem(c,lo,hi){var off=(c%2)?2.25:0,out=[],k=Math.floor((lo-off)/PIT)-1;
    for(;;k++){var b=off+k*PIT;if(b>=hi)break;
      [[b,b+SL,0],[b+SL,b+PIT,1]].forEach(function(q){var s=Math.max(q[0],lo),e=Math.min(q[1],hi);if(e-s>=.45)out.push({s:s,e:e,k:q[2]})})}
    return out}
  function carve(pcs,cuts){cuts.forEach(function(ct){var n=[];pcs.forEach(function(p){
    if(p.e<=ct[0]||p.s>=ct[1]){n.push(p);return}
    if(ct[0]-p.s>=.45)n.push({s:p.s,e:ct[0],k:p.k});
    if(p.e-ct[1]>=.45)n.push({s:ct[1],e:p.e,k:p.k})});pcs=n});return pcs}
  var F={front:{ax:"z",o:D/2,dir:1},back:{ax:"z",o:-D/2,dir:-1},right:{ax:"x",o:W/2,dir:1},left:{ax:"x",o:-W/2,dir:-1},
         bayF:{ax:"z",o:BZ,dir:1},bayL:{ax:"x",o:BX0,dir:-1},bayR:{ax:"x",o:BX1,dir:1}};
  function box(f,u0,u1,y0,y1,d0,d1){var uc=(u0+u1)/2,us=u1-u0,yc=(y0+y1)/2,ys=y1-y0,dc=f.o-f.dir*((d0+d1)/2),ds=d1-d0;
    return f.ax==="z"?[uc,yc,dc,us,ys,ds]:[dc,yc,uc,ds,ys,us]}
  /* openings: [face, u0, u1, c0, c1, kind] */
  var OP=[["front",8,20,0,30,"door"],["front",-26,-14,52,84,"win"],["front",8,20,52,84,"win"],
          ["back",-28,-16,16,48,"win"],["back",8,20,16,48,"win"],["back",-28,-16,52,84,"win"],["back",8,20,52,84,"win"],
          ["bayF",-28,-12,6,32,"win"],["bayL",D/2+2.5,D/2+9.5,6,32,"win"],["bayR",D/2+2.5,D/2+9.5,6,32,"win"]];
  [-36,0,36].forEach(function(zc){[[16,48],[52,84]].forEach(function(cc){OP.push(["right",zc-6,zc+6,cc[0],cc[1],"win"]);OP.push(["left",zc-6,zc+6,cc[0],cc[1],"win"])})});
  var CUT=[];  /* [face, a, b, c0, c1] bricks removed */
  OP.forEach(function(o){var f=o[0],a=o[1],b=o[2],c0=o[3],c1=o[4];CUT.push([f,a,b,c0,c1]);
    if(o[5]==="win"){CUT.push([f,a-1.5,b+1.5,c0-1,c0]);CUT.push([f,a-2,b+2,c1,c1+2])}else{CUT.push([f,a-2,b+2,c1,c1+2])}});
  CUT.push(["front",BX0,BX1,0,BAYC]);
  function cutsFor(face,c){var r=[];CUT.forEach(function(t){if(t[0]===face&&c>=t[3]&&c<t[4])r.push([t[1],t[2]])});return r}
  function brickBox(face,c,p){var f=F[face],d=p.k?HL:ST;return box(f,p.s+GAP/2,p.e-GAP/2,c+.065,c+.935,0,d)}
  /* main walls and bay: one ring per course so a course closes like a ring */
  for(c=0;c<RW;c++){
    var ev=(c%2===0),ring=[];
    function face(fn,lo,hi,rev){var pcs=carve(flem(c,lo,hi),cutsFor(fn,c));if(rev)pcs.reverse();pcs.forEach(function(p){ring.push(brickBox(fn,c,p))})}
    face("front",ev?-W/2:-W/2+TW,ev?W/2:W/2-TW,false);
    face("right",ev?-D/2+TW:-D/2,ev?D/2-TW:D/2,true);
    face("back",ev?-W/2:-W/2+TW,ev?W/2:W/2-TW,true);
    face("left",ev?-D/2+TW:-D/2,ev?D/2-TW:D/2,false);
    if(c<BAYC){
      face("bayL",D/2,ev?BZ-TW:BZ,false);
      face("bayF",ev?BX0:BX0+TW,ev?BX1:BX1-TW,false);
      face("bayR",D/2,ev?BZ-TW:BZ,true)}
    startW[c]=cW;ring.forEach(function(b){ordW.push(ins.length/8);ins.push(b[0],b[1],b[2],b[3],b[4],b[5],cW++,0)})}
  /* gables: bond grid continues, end bricks are cut to the rake line */
  for(i=0;i<G;i++){c=RW+i;var hw=W/2-(i+1)*(W/2/G);if(hw<.6)continue;var ring2=[];
    ["front","back"].forEach(function(fn,fi){var pcs=flem(c,-hw,hw);if(fi)pcs.reverse();pcs.forEach(function(p){ring2.push(brickBox(fn,c,p))})});
    ring2.forEach(function(b){ordG.push(ins.length/8);ins.push(b[0],b[1],b[2],b[3],b[4],b[5],cG++,1)})}
  /* chimney stacks: both rise together, one course at a time, pots laid last */
  var STK=[-30,30].map(function(cz){return {cz:cz,CF:[{ax:"z",o:cz+CHS,dir:1},{ax:"x",o:CHS,dir:1},{ax:"z",o:cz-CHS,dir:-1},{ax:"x",o:-CHS,dir:-1}]}});
  for(c=CH0;c<CH0+CHN;c++){STK.forEach(function(S){var ev=((c-CH0)%2===0),ring=[],cz=S.cz;
    S.CF.forEach(function(f,fi){var lo,hi,xx=fi%2===0;
      if(xx){lo=ev?-CHS:-CHS+TW;hi=ev?CHS:CHS-TW}else{lo=cz+(ev?-CHS+TW:-CHS);hi=cz+(ev?CHS-TW:CHS)}
      var pcs=flem(c,lo,hi);if(fi===1||fi===2)pcs.reverse();
      pcs.forEach(function(p){ring.push(box(f,p.s+GAP/2,p.e-GAP/2,c+.065,c+.935,0,p.k?HL:ST))})});
    ring.forEach(function(b){ordC.push(ins.length/8);ins.push(b[0],b[1],b[2],b[3],b[4],b[5],cC++,2)})})}
  STK.forEach(function(S){[[-2.2,-2.2],[2.2,2.2]].forEach(function(o){ordC.push(ins.length/8);ins.push(o[0],TOP+1.5,S.cz+o[1],2.6,3,2.6,cC++,2)});
    wire.push.apply(wire,boxEdges(-CHS,CHS,CH0,TOP,S.cz-CHS,S.cz+CHS))});
  /* trim: sills, lintels, bay roof (types follow the wall courses) */
  OP.forEach(function(o){var f=F[o[0]],a=o[1],b=o[2],c0=o[3],c1=o[4],bb;
    if(o[5]==="win"){bb=box(f,a-1.5,b+1.5,c0-1,c0,-.6,2.4);ins.push(bb[0],bb[1],bb[2],bb[3],bb[4],bb[5],startW[Math.max(0,c0-1)],3)}
    bb=box(f,a-2,b+2,c1,c1+2,-.4,3);ins.push(bb[0],bb[1],bb[2],bb[3],bb[4],bb[5],startW[c1],3)});
  ins.push((BX0+BX1)/2,BAYC+.75,(D/2+BZ)/2+.4,BX1-BX0+3,1.5,BZ-D/2+1.4,startW[BAYC],3);
  /* window frames, mullions, door (appear with the glazing stage) */
  OP.forEach(function(o){var f=F[o[0]],a=o[1],b=o[2],c0=o[3],c1=o[4],t=1.1,bb,mid=(a+b)/2,tr=c0+(c1-c0)*.58;
    function fr(u0,u1,y0,y1,d0,d1){bb=box(f,u0,u1,y0,y1,d0,d1);ins.push(bb[0],bb[1],bb[2],bb[3],bb[4],bb[5],0,7)}
    if(o[5]==="door"){bb=box(f,a+t,b-t,c0,c1-t,.5,2);ins.push(bb[0],bb[1],bb[2],bb[3],bb[4],bb[5],0,6);
      fr(a,a+t,c0,c1,.4,2.4);fr(b-t,b,c0,c1,.4,2.4);fr(a,b,c1-t,c1,.4,2.4);
      var cc=box(f,a+2,b-2,c0+2,c1-8,1.9,2.1);wlist.push({c:[(f.ax==="z"?cc[0]:cc[0]),(c0+c1)/2,(f.ax==="z"?cc[2]:cc[2])],w:b-a,h:c1-c0,door:true})}
    else{fr(a,a+t,c0,c1,.8,2.2);fr(b-t,b,c0,c1,.8,2.2);fr(a,b,c0,c0+t,.8,2.2);fr(a,b,c1-t,c1,.8,2.2);fr(mid-.45,mid+.45,c0,c1,1,2);fr(a,b,tr-.45,tr+.45,1,2);
      var g=box(f,a+t,b-t,c0+t,c1-t,1.6,1.65);
      gl.push({c:[g[0],g[1],g[2]],f:f,a:a+t,b:b-t,c0:c0+t,c1:c1-t});
      var cen=box(f,a,b,c0,c1,0,.1);wlist.push({c:[cen[0],cen[1],cen[2]],w:b-a,h:c1-c0,door:false})}});
  /* roof tiles: baked slabs along each slope */
  var nR=12,nC=24,yE=RW-OV*(G/(W/2)),xE=W/2+OV,Ls=Math.hypot(xE,TOP-RW-G+G+(RW+G)-yE-(RW+G)),dxn,dyn;
  Ls=Math.hypot(xE,(RW+G)-yE);dxn=xE/Ls;dyn=((RW+G)-yE)/Ls;
  function tilebox(c,e1,e2,e3,h1,h2,h3,key){var V=[];
    var faces=[[e1,1],[e1,-1],[e2,1],[e2,-1],[e3,1],[e3,-1]],ax=[[e1,h1],[e2,h2],[e3,h3]];
    faces.forEach(function(fa,fi){var n=[fa[0][0]*fa[1],fa[0][1]*fa[1],fa[0][2]*fa[1]];
      var o=fi<2?[e2,e3,h2,h3]:fi<4?[e1,e3,h1,h3]:[e1,e2,h1,h2],hh=fi<2?h1:fi<4?h2:h3;
      var a=o[0],b=o[1],ha=o[2],hb=o[3];
      var base=[c[0]+n[0]*hh,c[1]+n[1]*hh,c[2]+n[2]*hh];
      var P=[[-1,-1],[1,-1],[1,1],[-1,1]].map(function(q){return [base[0]+a[0]*ha*q[0]+b[0]*hb*q[1],base[1]+a[1]*ha*q[0]+b[1]*hb*q[1],base[2]+a[2]*ha*q[0]+b[2]*hb*q[1]]});
      var UV=[[0,0],[1,0],[1,1],[0,1]];
      [[0,1,2],[0,2,3]].forEach(function(t){var p0=P[t[0]],p1=P[t[1]],p2=P[t[2]];
        var cr=[(p1[1]-p0[1])*(p2[2]-p0[2])-(p1[2]-p0[2])*(p2[1]-p0[1]),(p1[2]-p0[2])*(p2[0]-p0[0])-(p1[0]-p0[0])*(p2[2]-p0[2]),(p1[0]-p0[0])*(p2[1]-p0[1])-(p1[1]-p0[1])*(p2[0]-p0[0])];
        var tt=(cr[0]*n[0]+cr[1]*n[1]+cr[2]*n[2])>0?t:[t[0],t[2],t[1]];
        tt.forEach(function(k){V.push(P[k][0],P[k][1],P[k][2],n[0],n[1],n[2],UV[k][0],UV[k][1],key,4)})})});
    return V}
  var tkey=0;
  for(i=0;i<nR;i++){var stag=(i%2)?.5:0;
    for(j=0;j<nC;j++){var zc=-D/2-OV+(j+.5+stag*.9)/nC*(D+2*OV);if(zc>D/2+OV-1)continue;
      [-1,1].forEach(function(sd){var sc=(i+.5)/nR,px=sd*xE*(1-sc),py=yE+((RW+G)-yE)*sc;
        var e1=[-sd*dxn,dyn,0],e2=[0,0,1],e3=[sd*dyn,dxn,0];
        var V=tilebox([px,py+.3,zc],e1,e2,e3,Ls/nR*.62,(D+2*OV)/nC*.46,.34,tkey++);tl.push.apply(tl,V)})}}
  /* glass quads */
  var gv=[];gl.forEach(function(g,gi){var f=g.f,n=f.ax==="z"?[0,0,f.dir]:[f.dir,0,0],P;
    function pt(u,y){return f.ax==="z"?[u,y,f.o-f.dir*1.62]:[f.o-f.dir*1.62,y,u]}
    P=[pt(g.a,g.c0),pt(g.b,g.c0),pt(g.b,g.c1),pt(g.a,g.c1)];var UV=[[0,0],[1,0],[1,1],[0,1]];
    [[0,1,2],[0,2,3]].forEach(function(t){var p0=P[t[0]],p1=P[t[1]],p2=P[t[2]];
      var cr=[(p1[1]-p0[1])*(p2[2]-p0[2])-(p1[2]-p0[2])*(p2[1]-p0[1]),(p1[2]-p0[2])*(p2[0]-p0[0])-(p1[0]-p0[0])*(p2[2]-p0[2]),(p1[0]-p0[0])*(p2[1]-p0[1])-(p1[1]-p0[1])*(p2[0]-p0[0])];
      var tt=(cr[0]*n[0]+cr[1]*n[1]+cr[2]*n[2])>0?t:[t[0],t[2],t[1]];
      tt.forEach(function(k){gv.push(P[k][0],P[k][1],P[k][2],n[0],n[1],n[2],UV[k][0],UV[k][1],0,5)})})});
  /* wireframe of the finished house, drawn dim until built */
  var top=RW+G;
  boxEdges(-W/2,W/2,0,RW,-D/2,D/2).forEach(function(e){wire.push(e)});
  boxEdges(BX0,BX1,0,BAYC,D/2,BZ).forEach(function(e){wire.push(e)});
  [1,-1].forEach(function(sg){wire.push([-W/2,RW,sg*D/2,0,top,sg*D/2],[W/2,RW,sg*D/2,0,top,sg*D/2]);
    wire.push([-xE,yE,sg*(D/2+OV),0,top,sg*(D/2+OV)],[xE,yE,sg*(D/2+OV),0,top,sg*(D/2+OV)])});
  wire.push([0,top,-D/2-OV,0,top,D/2+OV],[-xE,yE,-D/2-OV,-xE,yE,D/2+OV],[xE,yE,-D/2-OV,xE,yE,D/2+OV]);
  var nT=tl.length/10;
  return {gl:true,W:W,D:D,RW:RW,G:G,TOP:TOP,ov:OV,xE:xE,yE:yE,ridge:top,CH0:CH0,CHN:CHN,ins:new Float32Array(ins),nIns:ins.length/8,
    tiles:new Float32Array(tl),nTileVerts:tl.length/10,nTiles:tkey,glass:new Float32Array(gv),nGlassVerts:gv.length/10,wire:wire,wlist:wlist,nW:cW,nG:cG,nC:cC,ordW:new Int32Array(ordW),ordG:new Int32Array(ordG),ordC:new Int32Array(ordC),bricks:cW+cG+cC};
}

/* ===== v2 renderer: WebGL instanced bricks, composited under a 2D HUD layer ===== */
var GLR=null;
var VS_SRC=[
"attribute vec3 aPos;attribute vec3 aNrm;attribute vec2 aUV;attribute vec3 aOff;attribute vec3 aSize;attribute vec2 aMeta;attribute vec2 aTime;",
"uniform mat4 uVP;uniform vec4 uAmt;uniform vec4 uWin;uniform float uFlash;uniform float uTF;uniform float uNow;uniform float uLast;",
"varying vec3 vN;varying vec2 vUV;varying vec2 vFS;varying vec3 vW;varying float vFlash;varying float vAlpha;varying float vType;varying float vSeed;varying float vLast;",
"void main(){",
" float t=aMeta.y;float key=aMeta.x;float vis=1.;float fl=0.;float last=0.;float drop=0.;",
" if(t<2.5){",
"  if(aTime.x>1e8){gl_Position=vec4(2.,2.,2.,1.);return;}",
"  float age=uNow-aTime.x;",
"  if(age<0.){gl_Position=vec4(2.,2.,2.,1.);return;}",
"  float d=clamp(age/.38,0.,1.);vis=smoothstep(0.,.5,d);float e=1.-d;drop=e*e*e*6.;",
"  fl=uFlash*(1.-clamp(age/1.1,0.,1.));",
"  if(abs(aTime.y-uLast)<.5)last=1.;",
" }else if(t<3.5){",
"  if(uAmt.x<key+1.){gl_Position=vec4(2.,2.,2.,1.);return;}",
" }else if(t<4.5){",
"  float age=uAmt.w-key-1.;",
"  if(age<0.){gl_Position=vec4(2.,2.,2.,1.);return;}",
"  float d=clamp(age/5.,0.,1.);vis=smoothstep(0.,.5,d);float e=1.-d;drop=e*e*e*5.;fl=uTF*(1.-clamp(age/4.,0.,1.));",
" }else{",
"  vis=uWin.x;if(vis<=.001){gl_Position=vec4(2.,2.,2.,1.);return;}",
" }",
" vec3 p=aOff+aPos*aSize*(1.+.14*last);",
" p.y+=drop;",
" vFlash=fl;vAlpha=vis;vN=aNrm;vUV=aUV;vW=p;vType=t;vLast=last;",
" vec3 an=abs(aNrm);",
" if(t>3.5&&t<4.5)vFS=vec2(4.,3.);else if(t>4.5)vFS=vec2(9.,9.);else vFS=an.x>.5?aSize.zy:(an.y>.5?aSize.xz:aSize.xy);",
" vSeed=fract(sin(dot(aOff.xz+vec2(aOff.y*1.3,aOff.x*.7),vec2(12.9898,78.233)))*43758.5453);",
" gl_Position=uVP*vec4(p,1.);",
"}"].join("\n");
var FS_SRC=[
"precision mediump float;",
"varying vec3 vN;varying vec2 vUV;varying vec2 vFS;varying vec3 vW;varying float vFlash;varying float vAlpha;varying float vType;varying float vSeed;varying float vLast;",
"uniform vec3 uBrick;uniform vec3 uTrim;uniform vec3 uTile;uniform vec3 uFrame;uniform vec3 uGlass;uniform vec3 uGlassLit;uniform vec3 uDoor;uniform vec3 uEdge;uniform vec3 uSheen;uniform vec3 uFlashCol;",
"uniform float uPulse;uniform float uBuilt;uniform float uSweep;uniform float uSweepOn;uniform float uBack;uniform float uFrontA;uniform float uBackA;uniform float uShMin;uniform float uEdgeK;uniform vec2 uLit;",
"void main(){",
" vec3 L=normalize(vec3(-.45,.7,.55));float lt=max(0.,dot(vN,L));float sh=uShMin+(1.-uShMin)*lt;",
" vec3 base;float t=vType;",
" if(t<2.5)base=uBrick*(.9+.2*vSeed);else if(t<3.5)base=uTrim;else if(t<4.5)base=uTile*(.94+.12*vSeed);else if(t<5.5)base=mix(uGlass,uGlassLit,uLit.x);else if(t<6.5)base=mix(uDoor,uFlashCol,uLit.y);else base=uFrame;",
" vec3 col=base*sh;",
" vec2 dd=min(vUV,1.-vUV)*vFS;float ed=min(dd.x,dd.y);float bev=smoothstep(0.,.07,ed);",
" col=mix(col,uEdge*(.6+.4*sh),(1.-bev)*uEdgeK);",
" float fl=clamp(vFlash,0.,1.);col=mix(col,uFlashCol,fl*.9);",
" if(vLast>.5){col=mix(col,vec3(1.,.94,.64),.88)*(1.08+.3*uPulse);}",
" col*=.95+.1*uPulse;",
" float s=1.-clamp(abs(vW.y-uSweep)/6.,0.,1.);col=mix(col,uSheen,s*.5*uSweepOn);",
" float a;",
" if(uBack>.5)a=uBackA*vAlpha;else if(t>4.5&&t<5.5)a=.8*vAlpha;else a=(uFrontA+.06*uPulse*uBuilt+.2*fl)*vAlpha;",
" if(vLast>.5)a=1.;",
" gl_FragColor=vec4(col*a,a);",
"}"].join("\n");
function glr(){
  if(GLR!==null)return GLR||null;
  try{
    var cv=document.createElement("canvas"),gl=cv.getContext("webgl2",{alpha:true,antialias:true,premultipliedAlpha:true})||cv.getContext("webgl",{alpha:true,antialias:true,premultipliedAlpha:true});
    if(!gl){GLR=false;return null}
    var g2=(typeof WebGL2RenderingContext!=="undefined")&&(gl instanceof WebGL2RenderingContext),ext=g2?null:gl.getExtension("ANGLE_instanced_arrays");
    if(!g2&&!ext){GLR=false;return null}
    function sh(type,src){var s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s}
    var pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS_SRC));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS_SRC));gl.linkProgram(pr);
    if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(pr));
    var R={cv:cv,gl:gl,pr:pr,g2:g2,ext:ext,A:{},U:{},cube:null,inst:null,tile:null,glass:null,hg:null};
    ["aPos","aNrm","aUV","aOff","aSize","aMeta","aTime"].forEach(function(n){R.A[n]=gl.getAttribLocation(pr,n)});
    ["uVP","uAmt","uWin","uFlash","uTF","uNow","uLast","uBrick","uTrim","uTile","uFrame","uGlass","uGlassLit","uDoor","uEdge","uSheen","uFlashCol","uPulse","uBuilt","uSweep","uSweepOn","uBack","uFrontA","uBackA","uShMin","uEdgeK","uLit"].forEach(function(n){R.U[n]=gl.getUniformLocation(pr,n)});
    /* unit cube, 36 verts, pos nrm uv, counter clockwise from outside */
    var cb=[],fs=[[[1,0,0],[0,1,0],[0,0,1]],[[-1,0,0],[0,0,-1],[0,1,0]],[[0,1,0],[0,0,1],[1,0,0]],[[0,-1,0],[1,0,0],[0,0,1]],[[0,0,1],[1,0,0],[0,1,0]],[[0,0,-1],[0,1,0],[1,0,0]]];
    fs.forEach(function(f){var n=f[0],a=f[1],b=f[2],P=[[-1,-1],[1,-1],[1,1],[-1,1]].map(function(q){return [(n[0]+a[0]*q[0]+b[0]*q[1])*.5,(n[1]+a[1]*q[0]+b[1]*q[1])*.5,(n[2]+a[2]*q[0]+b[2]*q[1])*.5]}),UV=[[0,0],[1,0],[1,1],[0,1]];
      [[0,1,2],[0,2,3]].forEach(function(t){var p0=P[t[0]],p1=P[t[1]],p2=P[t[2]];
        var cr=[(p1[1]-p0[1])*(p2[2]-p0[2])-(p1[2]-p0[2])*(p2[1]-p0[1]),(p1[2]-p0[2])*(p2[0]-p0[0])-(p1[0]-p0[0])*(p2[2]-p0[2]),(p1[0]-p0[0])*(p2[1]-p0[1])-(p1[1]-p0[1])*(p2[0]-p0[0])];
        var tt=(cr[0]*n[0]+cr[1]*n[1]+cr[2]*n[2])>0?t:[t[0],t[2],t[1]];
        tt.forEach(function(k){cb.push(P[k][0],P[k][1],P[k][2],n[0],n[1],n[2],UV[k][0],UV[k][1])})})});
    R.cube=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,R.cube);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(cb),gl.STATIC_DRAW);
    cv.addEventListener("webglcontextlost",function(e){e.preventDefault();GLR=null},false);
    GLR=R;return R;
  }catch(e){GLR=false;return null}
}
function glUpload(R,H){
  if(R.hg===H)return;var gl=R.gl;
  function mk(arr){var b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,arr,gl.STATIC_DRAW);return b}
  R.inst=mk(H.ins);R.tile=mk(H.tiles);R.glass=mk(H.glass);R.hg=H;
}
function glDiv(R,loc,d){if(R.g2)R.gl.vertexAttribDivisor(loc,d);else R.ext.vertexAttribDivisorANGLE(loc,d)}
function glDraw(R,first,count,inst){var gl=R.gl;if(inst>0){if(R.g2)gl.drawArraysInstanced(gl.TRIANGLES,first,count,inst);else R.ext.drawArraysInstancedANGLE(gl.TRIANGLES,first,count,inst)}else gl.drawArrays(gl.TRIANGLES,first,count)}
function projMatrix(P){
  var r=P.r,u=P.u,f=P.f,pos=P.pos,sx=P.focal/(P.W/2),sy=P.focal/(P.H/2),n=10,fa=2400,A=(fa+n)/(fa-n),B=-2*fa*n/(fa-n);
  function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}
  return new Float32Array([sx*r[0],sy*u[0],A*f[0],f[0], sx*r[1],sy*u[1],A*f[1],f[1], sx*r[2],sy*u[2],A*f[2],f[2], -sx*dot(r,pos),-sy*dot(u,pos),-A*dot(f,pos)+B,-dot(f,pos)]);
}
var THG={
  dark:{brick:[.267,.753,.725],trim:[.46,.84,.80],tile:[.2,.62,.74],frame:[.78,.93,.92],glass:[.02,.2,.22],glassLit:[.96,.78,.42],door:[.04,.24,.26],edge:[.01,.1,.1],sheen:[.75,.98,.96],flash:[.91,.77,.42],shMin:.5,edgeK:.62,front:.88,back:.09,glow:[68,192,185],glowA:.24,grid:[68,192,185],gridA:.30,foot:[68,192,185],wire:"rgba(68,192,185,.34)",rafter:"rgba(120,230,222,.85)",ring:[68,192,185],planeF:[232,197,106],planeS:[232,197,106],planeFA:.11,planeBlur:14,lw:1},
  light:{brick:[.09,.49,.47],trim:[.82,.9,.89],tile:[.17,.39,.55],frame:[.0,.4,.38],glass:[.66,.8,.84],glassLit:[1,.84,.4],door:[.24,.44,.46],edge:[1,1,1],sheen:[1,1,1],flash:[.87,.64,.1],shMin:.62,edgeK:.8,front:.97,back:.1,glow:[0,127,123],glowA:.12,grid:[0,127,123],gridA:.24,foot:[0,127,123],wire:"rgba(0,110,106,.55)",rafter:"rgba(0,118,114,.95)",ring:[0,127,123],planeF:[232,197,106],planeS:[150,108,0],planeFA:.24,planeBlur:0,lw:1.15}
};
function renderHouseGL(ctx,rect,st){
  var R=glr();if(!R)return {row:0,tiles:0,p:st.p,bricks:0};
  var T=THG[st.theme==="light"?"light":"dark"],H=st.H,p=st.p,now=st.now||0,P=new Proj(st,rect),i,gl=R.gl,K=2.2;
  var RW=H.RW,G=H.G,W=H.W,D=H.D,tnow=now/1000;
  var tileN=H.nTiles*seg(p,.80,.88);
  /* bricks are laid one at a time, in order along each course. A deposit adds exactly the bricks it buys. */
  var tot=Math.floor(H.bricks*seg(p,.03,.80)+1e-6),cnt=[Math.min(H.nW,tot),Math.min(H.nG,Math.max(0,tot-H.nW)),Math.max(0,tot-H.nW-H.nG)],maps=[H.ordW,H.ordG,H.ordC],dirty=false,gi,o2;
  if(!st.stamp){st.stamp=new Float32Array(H.nIns*2);for(i=0;i<H.nIns;i++){st.stamp[2*i]=1e9;st.stamp[2*i+1]=i}st.cnt=[0,0,0];st.lastIdx=-1;dirty=true}
  for(gi=0;gi<3;gi++){var n0=st.cnt[gi],n1=cnt[gi];
    if(n1>n0){var NN=n1-n0,inst=(!st.primed)||st.noFlash||reduce,stp=(!inst&&NN<=60)?Math.min(.12,.9/NN):0;
      for(o2=n0;o2<n1;o2++)st.stamp[2*maps[gi][o2]]=inst?-1000:tnow+(o2-n0)*stp;dirty=true}
    else if(n1<n0){for(o2=n1;o2<n0;o2++)st.stamp[2*maps[gi][o2]]=1e9;dirty=true}
    st.cnt[gi]=n1}
  if(dirty){var bi=-1,bt=-1e9;for(gi=0;gi<3;gi++){if(cnt[gi]>0){var ix=maps[gi][cnt[gi]-1],tt=st.stamp[2*ix];if(tt>=bt){bt=tt;bi=ix}}}st.lastIdx=bi}
  var laidN=cnt[0]+cnt[1]+cnt[2];
  var wa=seg(p,.88,.93),lit=seg(p,.93,.96),dec=seg(p,.96,1),tm=seg(p,.60,.80);
  var pulse=(st.noPulse||reduce)?.5:.5+.5*Math.sin(now*0.002244),ping=(st.noPulse||reduce)?0:(now%2800)/2800,built=seg(p,.05,1);
  if(st.lastP===undefined)st.lastP=p;if(p>st.lastP+1e-5&&st.primed&&!st.noFlash)st.growT=now;st.lastP=p;
  var act=st.growT?clamp(1-(now-st.growT)/900,0,1):0;
  ctx.save();ctx.beginPath();ctx.rect(rect.x,rect.y,rect.w,rect.h);ctx.clip();
  /* ---- 2D underlay: ground glow, grid, site, footprint, ring, wireframe, rafters ---- */
  var c0=P.pt(0,0,0),rad=62*K*c0[3];
  ctx.save();ctx.translate(c0[0],c0[1]);ctx.scale(1,Math.max(.3,Math.sin(st.pitch)));
  var g=ctx.createRadialGradient(0,0,0,0,0,rad*1.7);g.addColorStop(0,rgba(T.glow,T.glowA));g.addColorStop(.6,rgba(T.glow,T.glowA*.3));g.addColorStop(1,rgba(T.glow,0));
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,rad*1.7,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.lineWidth=1;
  for(i=-5;i<=5;i++){ctx.strokeStyle=rgba(T.grid,T.gridA*(1-Math.abs(i)/6.5));
    var a1=P.pt(i*30,0,-150),b1=P.pt(i*30,0,150);ctx.beginPath();ctx.moveTo(a1[0],a1[1]);ctx.lineTo(b1[0],b1[1]);ctx.stroke();
    a1=P.pt(-150,0,i*30);b1=P.pt(150,0,i*30);ctx.beginPath();ctx.moveTo(a1[0],a1[1]);ctx.lineTo(b1[0],b1[1]);ctx.stroke()}
  function path(pts){ctx.beginPath();pts.forEach(function(q,k){var s=P.pt(q[0],q[1],q[2]);if(k)ctx.lineTo(s[0],s[1]);else ctx.moveTo(s[0],s[1])});ctx.closePath()}
  var sb=seg(p,.005,.03),fnd=seg(p,0,.03);
  if(sb>0){ctx.setLineDash([8,6]);ctx.strokeStyle=rgba(T.foot,.55*sb);ctx.lineWidth=1.2;path([[-W/2-20,0,-D/2-20],[W/2+20,0,-D/2-20],[W/2+20,0,D/2+20],[-W/2-20,0,D/2+20]]);ctx.stroke();ctx.setLineDash([])}
  if(fnd>0){path([[-W/2,0,-D/2],[W/2,0,-D/2],[W/2,0,D/2],[-W/2,0,D/2]]);ctx.fillStyle=rgba(T.foot,.14*fnd);ctx.fill();ctx.strokeStyle=rgba(T.foot,.75*fnd);ctx.lineWidth=1.4;ctx.stroke()}
  if(!st.noPulse&&!reduce&&p>.05){var rg=ping*75,ra=(1-ping)*(.1+.4*seg(p,.5,1));path([[-W/2-rg,0,-D/2-rg],[W/2+rg,0,-D/2-rg],[W/2+rg,0,D/2+rg],[-W/2-rg,0,D/2+rg]]);ctx.strokeStyle=rgba(T.ring,ra);ctx.lineWidth=2;ctx.stroke()}
  ctx.strokeStyle=T.wire;ctx.lineWidth=T.lw;ctx.beginPath();
  H.wire.forEach(function(e){var a=P.pt(e[0],e[1],e[2]),b=P.pt(e[3],e[4],e[5]);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1])});ctx.stroke();
  var NR=18,nT=Math.ceil(tm*NR);
  if(nT>0){ctx.strokeStyle=T.rafter;ctx.lineWidth=1.6;ctx.beginPath();
    for(i=0;i<nT;i++){var zz=-D/2-H.ov+i*(D+2*H.ov)/(NR-1);
      [-1,1].forEach(function(sd){var a=P.pt(sd*H.xE,H.yE,zz),b=P.pt(0,H.ridge,zz);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1])})}
    ctx.stroke()}
  /* ---- GL pass: solid, to-scale bricks ---- */
  var sc=(ctx.getTransform?ctx.getTransform().a:1)||1,gw=Math.max(2,Math.round(rect.w*sc)),gh=Math.max(2,Math.round(rect.h*sc));
  if(R.cv.width!==gw||R.cv.height!==gh){R.cv.width=gw;R.cv.height=gh}
  glUpload(R,H);
  if(!st.sbuf||st.sbufR!==R){st.sbuf=gl.createBuffer();st.sbufR=R;dirty=true}
  if(dirty){gl.bindBuffer(gl.ARRAY_BUFFER,st.sbuf);gl.bufferData(gl.ARRAY_BUFFER,st.stamp,gl.DYNAMIC_DRAW)}
  var A=R.A,U=R.U;
  gl.viewport(0,0,gw,gh);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.useProgram(R.pr);
  gl.uniformMatrix4fv(U.uVP,false,projMatrix(P));
  gl.uniform4f(U.uAmt,cnt[0],cnt[1],cnt[2],tileN);
  gl.uniform4f(U.uWin,wa,lit,dec,0);gl.uniform1f(U.uFlash,(st.noFlash||reduce)?0:1);gl.uniform1f(U.uTF,act);gl.uniform1f(U.uNow,tnow);gl.uniform1f(U.uLast,st.noFlash?-1:st.lastIdx);
  gl.uniform3fv(U.uBrick,T.brick);gl.uniform3fv(U.uTrim,T.trim);gl.uniform3fv(U.uTile,T.tile);gl.uniform3fv(U.uFrame,T.frame);gl.uniform3fv(U.uGlass,T.glass);gl.uniform3fv(U.uGlassLit,T.glassLit);gl.uniform3fv(U.uDoor,T.door);gl.uniform3fv(U.uEdge,T.edge);gl.uniform3fv(U.uSheen,T.sheen);gl.uniform3fv(U.uFlashCol,T.flash);
  gl.uniform1f(U.uPulse,pulse);gl.uniform1f(U.uBuilt,built);
  var sw=((now/1000*20)%(H.TOP+40))-10;gl.uniform1f(U.uSweep,sw);gl.uniform1f(U.uSweepOn,st.sweep?1:0);
  gl.uniform1f(U.uShMin,T.shMin);gl.uniform1f(U.uEdgeK,T.edgeK);gl.uniform1f(U.uFrontA,T.front);gl.uniform1f(U.uBackA,T.back);gl.uniform2f(U.uLit,lit,dec);
  gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.enable(gl.CULL_FACE);
  var S=32; /* cube stride bytes */
  function bindCube(){gl.bindBuffer(gl.ARRAY_BUFFER,R.cube);
    gl.enableVertexAttribArray(A.aPos);gl.vertexAttribPointer(A.aPos,3,gl.FLOAT,false,S,0);glDiv(R,A.aPos,0);
    gl.enableVertexAttribArray(A.aNrm);gl.vertexAttribPointer(A.aNrm,3,gl.FLOAT,false,S,12);glDiv(R,A.aNrm,0);
    gl.enableVertexAttribArray(A.aUV);gl.vertexAttribPointer(A.aUV,2,gl.FLOAT,false,S,24);glDiv(R,A.aUV,0)}
  function bindInst(){gl.bindBuffer(gl.ARRAY_BUFFER,R.inst);
    gl.enableVertexAttribArray(A.aOff);gl.vertexAttribPointer(A.aOff,3,gl.FLOAT,false,32,0);glDiv(R,A.aOff,1);
    gl.enableVertexAttribArray(A.aSize);gl.vertexAttribPointer(A.aSize,3,gl.FLOAT,false,32,12);glDiv(R,A.aSize,1);
    gl.enableVertexAttribArray(A.aMeta);gl.vertexAttribPointer(A.aMeta,2,gl.FLOAT,false,32,24);glDiv(R,A.aMeta,1);
    gl.bindBuffer(gl.ARRAY_BUFFER,st.sbuf);gl.enableVertexAttribArray(A.aTime);gl.vertexAttribPointer(A.aTime,2,gl.FLOAT,false,8,0);glDiv(R,A.aTime,1)}
  function bindStatic(buf){gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    gl.enableVertexAttribArray(A.aPos);gl.vertexAttribPointer(A.aPos,3,gl.FLOAT,false,40,0);glDiv(R,A.aPos,0);
    gl.enableVertexAttribArray(A.aNrm);gl.vertexAttribPointer(A.aNrm,3,gl.FLOAT,false,40,12);glDiv(R,A.aNrm,0);
    gl.enableVertexAttribArray(A.aUV);gl.vertexAttribPointer(A.aUV,2,gl.FLOAT,false,40,24);glDiv(R,A.aUV,0);
    gl.enableVertexAttribArray(A.aMeta);gl.vertexAttribPointer(A.aMeta,2,gl.FLOAT,false,40,32);glDiv(R,A.aMeta,0);
    gl.disableVertexAttribArray(A.aOff);glDiv(R,A.aOff,0);gl.vertexAttrib3f(A.aOff,0,0,0);
    gl.disableVertexAttribArray(A.aSize);glDiv(R,A.aSize,0);gl.vertexAttrib3f(A.aSize,1,1,1);
    gl.disableVertexAttribArray(A.aTime);glDiv(R,A.aTime,0);gl.vertexAttrib2f(A.aTime,0,0)}
  /* pass A: far faces, faint, so the hologram reads as solid brickwork you can see into */
  gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.cullFace(gl.FRONT);gl.uniform1f(U.uBack,1);
  bindCube();bindInst();glDraw(R,0,36,H.nIns);
  /* pass B: near faces, depth tested */
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(true);gl.cullFace(gl.BACK);gl.uniform1f(U.uBack,0);
  bindCube();bindInst();glDraw(R,0,36,H.nIns);
  bindStatic(R.tile);glDraw(R,0,H.nTileVerts,0);
  gl.depthMask(false);bindStatic(R.glass);glDraw(R,0,H.nGlassVerts,0);
  gl.depthMask(true);
  ctx.drawImage(R.cv,0,0,gw,gh,rect.x,rect.y,rect.w,rect.h);
  /* ---- 2D overlay: window glow, gold slice, keys glint, tag ---- */
  if(lit>0&&st.theme!=="light"){ctx.save();ctx.globalCompositeOperation="lighter";
    H.wlist.forEach(function(w){var q=P.pt(w.c[0],w.c[1],w.c[2]),r=Math.max(w.w,w.h)*.9*q[3],al=(w.door?dec:lit)*(.22+.1*pulse);
      var gr=ctx.createRadialGradient(q[0],q[1],0,q[0],q[1],r);gr.addColorStop(0,rgba([232,197,106],al));gr.addColorStop(1,rgba([232,197,106],0));ctx.fillStyle=gr;ctx.beginPath();ctx.arc(q[0],q[1],r,0,Math.PI*2);ctx.fill()});ctx.restore()}
  var li=st.lastIdx,lv=li>=0?Math.min(H.TOP,H.ins[li*8+1]+H.ins[li*8+4]/2):.02,pa=st.noPlane?0:1-seg(p,.97,1),m=14;
  if(pa>0){ctx.save();if(T.planeBlur){ctx.shadowColor=rgba(T.planeF,.8*pa);ctx.shadowBlur=T.planeBlur}
    path([[-W/2-m,lv,-D/2-m],[W/2+m,lv,-D/2-m],[W/2+m,lv,D/2+m],[-W/2-m,lv,D/2+m]]);
    ctx.fillStyle=rgba(T.planeF,T.planeFA*pa);ctx.fill();ctx.strokeStyle=rgba(T.planeS,.95*pa);ctx.lineWidth=1.6;ctx.stroke();ctx.restore()}
  if(p>=.999){var hp=P.pt(10.6,14,D/2+.6),pul=.6+.4*Math.sin(now/260),L=16*hp[3]*(.7+pul*.5);
    ctx.save();ctx.strokeStyle=rgba(T.planeS,.95);ctx.lineWidth=2;if(T.planeBlur){ctx.shadowColor=rgba([232,197,106],1);ctx.shadowBlur=14}ctx.beginPath();
    ctx.moveTo(hp[0]-L,hp[1]);ctx.lineTo(hp[0]+L,hp[1]);ctx.moveTo(hp[0],hp[1]-L);ctx.lineTo(hp[0],hp[1]+L);ctx.stroke();ctx.restore()}
  if(li>=0&&!st.noFlash&&st.stamp[2*li]<1e8&&tnow>=st.stamp[2*li]){
    var lq=P.pt(H.ins[li*8],H.ins[li*8+1],H.ins[li*8+2]),ls=clamp(rect.w/760,.7,1.4),rr=(8+4*pulse)*ls,mc=T.planeS;
    ctx.save();ctx.strokeStyle=rgba(mc,.95);ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(lq[0],lq[1],rr,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();[[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){ctx.moveTo(lq[0]+d[0]*(rr+2),lq[1]+d[1]*(rr+2));ctx.lineTo(lq[0]+d[0]*(rr+7*ls),lq[1]+d[1]*(rr+7*ls))});ctx.stroke();
    var lt=clamp(rect.w*.017,10,13)*(st.fscale||1);ctx.font=lt+"px 'Share Tech Mono',monospace";var ltx="BRICK #"+laidN.toLocaleString("en-GB"),lw=ctx.measureText(ltx).width;
    var lx=clamp(lq[0]+rr+10*ls,rect.x+4,rect.x+rect.w-lw-14-(st.railPad||0)),ly=clamp(lq[1]-rr-6*ls,rect.y+lt+4,rect.y+rect.h-8);
    ctx.fillStyle=st.theme==="light"?"rgba(255,255,255,.9)":"rgba(8,8,8,.72)";ctx.beginPath();if(ctx.roundRect)ctx.roundRect(lx-6,ly-lt,lw+12,lt+8,4);else ctx.rect(lx-6,ly-lt,lw+12,lt+8);ctx.fill();
    ctx.fillStyle=rgba(mc,1);ctx.textBaseline="alphabetic";ctx.fillText(ltx,lx,ly+2);ctx.restore()}
  var row=li>=0?Math.min(154,Math.ceil(lv-1e-6)):0,info={row:row,tiles:Math.round(tileN),p:p,bricks:laidN,bricksTotal:H.bricks,brickShare:.77,last:li};
  if(st.tag!==false){
    var pc=pa>0?P.pt(0,lv,0):P.pt(0,H.TOP,0),fs=clamp(rect.w*.026,11,17)*(st.fscale||1);
    var l1=p>=.999?"KEYS ARE YOURS":"ROW "+row+" / 154",l2=(p*100).toFixed(1)+"% OF DEPOSIT";
    ctx.font=fs+"px 'Share Tech Mono',monospace";
    var tw=Math.max(ctx.measureText(l1).width,ctx.measureText(l2).width)+fs*1.5,th=fs*2.9;
    var tx=clamp(pc[0]+fs*1.6,rect.x+6,rect.x+rect.w-tw-6-(st.railPad||0)),ty=clamp(pc[1]-th-fs*1.4,rect.y+6+(st.padT||0),rect.y+rect.h-th-6-(st.padB||0));
    ctx.save();ctx.strokeStyle=rgba(T.planeS,.9);ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(pc[0],pc[1]);ctx.lineTo(tx+tw*.2,ty+th);ctx.stroke();
    ctx.fillStyle=rgba(T.planeS,1);ctx.beginPath();ctx.arc(pc[0],pc[1],3,0,Math.PI*2);ctx.fill();
    if(T.planeBlur){ctx.shadowColor=rgba([232,197,106],.55);ctx.shadowBlur=18}else{ctx.shadowColor="rgba(0,60,58,.25)";ctx.shadowBlur=10;ctx.shadowOffsetY=3}
    ctx.beginPath();if(ctx.roundRect)ctx.roundRect(tx,ty,tw,th,fs*.4);else ctx.rect(tx,ty,tw,th);ctx.fillStyle="#E8C56A";ctx.fill();ctx.restore();
    ctx.fillStyle="#1A1400";ctx.textBaseline="alphabetic";ctx.fillText(l1,tx+fs*.75,ty+fs*1.2);ctx.fillText(l2,tx+fs*.75,ty+fs*2.3)}
  st.primed=true;ctx.restore();return info;
}

function getHL(){if(!HOUSE)HOUSE=buildHouseLegacy();return HOUSE}
function getHG(){if(!HOUSE_G)HOUSE_G=buildHouseGL();return HOUSE_G}
function houseState(o){o=o||{};var useGL=!!glr(),s=useGL?{gl:true,H:getHG(),yaw:-.62,pitch:.32,dist:370,zoom:1,ty:66}:{gl:false,H:getHL(),yaw:-.62,pitch:.32,dist:126,zoom:1,ty:15};
  s.p=0;s.now=0;s.primed=false;s.sweep=!reduce;s.padB=0;s.railPad=0;s.theme="dark";
  if(!s.gl){s.prev=new Uint8Array(s.H.total);s.flashT=new Float32Array(s.H.total)}
  for(var k in o)s[k]=o[k];return s}
function renderHouse(ctx,rect,st){return st.gl?renderHouseGL(ctx,rect,st):renderHouse2D(ctx,rect,st)}

/* shared orbit controls for any 3D canvas */
function orbit(cv,st,hooks){
  var drag=null;
  cv.addEventListener("pointerdown",function(e){drag={x:e.clientX,y:e.clientY,yaw:st.yaw,pitch:st.pitch};try{cv.setPointerCapture(e.pointerId)}catch(_){}cv.style.cursor="grabbing";if(hooks.touch)hooks.touch()});
  cv.addEventListener("pointermove",function(e){if(!drag)return;
    st.yaw=drag.yaw-(e.clientX-drag.x)*.008;
    if(e.pointerType==="mouse")st.pitch=clamp(drag.pitch+(e.clientY-drag.y)*.006,.1,1.2)});
  function end(){drag=null;cv.style.cursor="grab";if(hooks.touch)hooks.touch()}
  cv.addEventListener("pointerup",end);cv.addEventListener("pointercancel",end);
  cv.addEventListener("keydown",function(e){
    if(e.key==="ArrowLeft"){st.yaw-=.12;e.preventDefault()}else if(e.key==="ArrowRight"){st.yaw+=.12;e.preventDefault()}
    else if(e.key==="ArrowUp"){st.pitch=clamp(st.pitch+.06,.1,1.2);e.preventDefault()}else if(e.key==="ArrowDown"){st.pitch=clamp(st.pitch-.06,.1,1.2);e.preventDefault()}
    else if(e.key==="+"||e.key==="="){st.zoom=clamp(st.zoom*1.12,.7,1.6)}else if(e.key==="-"){st.zoom=clamp(st.zoom/1.12,.7,1.6)}
    if(hooks.touch)hooks.touch()});
  return {isDrag:function(){return !!drag}};
}

/* house stage: animated, orbitable, visible-only rendering */
function makeStage(cv,o){
  o=o||{};
  var c=cv.getContext("2d"),st=houseState({railPad:o.railPad||0,padB:o.padB||0});
  var target=0,cw=300,ch=200,dpr=1,vis=false,raf=0,last=0,idle=-9999,auto=!reduce,self={st:st};
  function size(){var r=cv.getBoundingClientRect();cw=Math.max(2,r.width);ch=Math.max(2,r.height);dpr=Math.min(window.innerWidth<700?1.5:2,window.devicePixelRatio||1);cv.width=Math.round(cw*dpr);cv.height=Math.round(ch*dpr)}
  var ob=orbit(cv,st,{touch:function(){idle=performance.now()}});
  function frame(ts){
    raf=0;if(!vis)return;if(o.fps&&last&&ts-last<1000/o.fps-2){raf=requestAnimationFrame(frame);return}
    var dt=Math.min(.05,(ts-(last||ts))/1000);last=ts;
    if(reduce)st.p=target;else{st.p+=(target-st.p)*Math.min(1,dt*1.7);if(Math.abs(target-st.p)<.0003)st.p=target}
    if(auto&&!ob.isDrag()&&ts-idle>2500)st.yaw+=dt*.12;
    st.now=ts;st.fit=cw<520?1.1:.85;st.theme=o.theme||rootTheme();st.padT=cw<520&&o.railPad?52:0;st.railPad=cw<520?0:(o.railPad||0);c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,cw,ch);
    var info=renderHouse(c,{x:0,y:0,w:cw,h:ch},st);
    if(o.onFrame)o.onFrame(info,st);
    raf=requestAnimationFrame(frame);
  }
  function start(){if(vis&&!raf){last=0;raf=requestAnimationFrame(frame)}}
  if("ResizeObserver" in window)new ResizeObserver(size).observe(cv);else window.addEventListener("resize",size);
  size();
  if("IntersectionObserver" in window)new IntersectionObserver(function(es){vis=es[0].isIntersecting;start()},{threshold:.01}).observe(cv);else{vis=true;start()}
  self.setTarget=function(p,imm){target=clamp(p,0,1);if(imm){st.p=target}start()};
  self.getTarget=function(){return target};
  self.toggleAuto=function(){auto=!auto;return auto};
  self.zoom=function(f){st.zoom=clamp(st.zoom*f,.7,1.6)};
  self.reset=function(){st.yaw=-.62;st.pitch=.32;st.zoom=1;idle=performance.now()};
  return self;
}
/* net worth scene: assets rise above the gold line, debt hangs below it */
function nwPal(st){return st.theme==="light"?
  {dep:[24,124,120],stk:[28,134,86],gold:[196,150,22],debt:[214,69,69],fa:.88,shMin:.62,edgeMix:[0,40,40],edgeK:.45,flash:[222,164,24],glow:[0,127,123],glowA:.12,grid:[0,127,123],gridA:.22,planeS:[150,108,0],planeF:[232,197,106],planeFA:.24,blur:0,label:"rgba(63,86,88,.95)"}:
  {dep:C_TEAL,stk:C_GREEN,gold:C_GOLD,debt:C_RED,fa:.72,shMin:.5,edgeMix:[255,255,255],edgeK:.35,flash:C_GOLD,glow:[68,192,185],glowA:.18,grid:[68,192,185],gridA:.28,planeS:C_GOLD,planeF:C_GOLD,planeFA:.09,blur:14,label:"rgba(168,176,176,.95)"}}
function makeNW(cv,o){
  o=o||{};
  var c=cv.getContext("2d"),st={yaw:-.55,pitch:.46,dist:125,zoom:1,ty:2,fit:.9,now:0};
  var cw=300,ch=200,dpr=1,vis=false,raf=0,last=0,idle=-9999,auto=!reduce,boxes=[],uid=0,self={st:st};
  var NPL=nwPal({theme:"dark"}),PL=.5,XC={dep:-27,stk:-10,gold:7,debt:27},NAMES={dep:"DEPOSIT",stk:"FUNDS",gold:"METALS",debt:"DEBT"},CAP={dep:14,stk:10,gold:8},BHT={dep:3.2,stk:3.2,gold:2.4,debt:3.2},SM=3.1;
  var INIT={dep:[8,5],stk:[3,4],gold:[3,0],debt:[5,6]};
  function size(){var r=cv.getBoundingClientRect();cw=Math.max(2,r.width);ch=Math.max(2,r.height);dpr=Math.min(window.innerWidth<700?1.5:2,window.devicePixelRatio||1);cv.width=Math.round(cw*dpr);cv.height=Math.round(ch*dpr)}
  function spawn(t,small,i,anim){boxes.push({id:uid++,t:t,s:small,i:i,born:anim?performance.now():-1e9,leave:0,merge:false})}
  function live(t,small){var n=0;boxes.forEach(function(b){if(b.t===t&&b.s===small&&!b.leave)n++});return n}
  function topOf(t,small){var top=null;boxes.forEach(function(b){if(b.t===t&&b.s===small&&!b.leave&&(!top||b.i>top.i))top=b});return top}
  self.reset=function(){boxes=[];Object.keys(INIT).forEach(function(t){for(var i=0;i<INIT[t][0];i++)spawn(t,0,i,false);for(i=0;i<INIT[t][1];i++)spawn(t,1,i,false)});if(o.onChange)o.onChange(self.totals())};
  function val(t){return live(t,0)*1000+live(t,1)*100}
  self.totals=function(){var a=val("dep")+val("stk")+val("gold"),d=val("debt");return {assets:a,debt:d,net:a-d,cols:{dep:val("dep"),stk:val("stk"),gold:val("gold"),debt:d}}};
  var LAB={dep:"Deposit",stk:"Funds",gold:"Gold"};
  self.act=function(spec){
    var q=spec.split(":"),t=q[0],amt=+q[1]||1000,small=amt===100;
    if(t==="debt"){
      if(self.totals().debt<amt)return {ok:false,msg:"Only "+("£"+self.totals().debt.toLocaleString("en-GB"))+" of debt left."};
      if(!small){topOf("debt",0).leave=performance.now()}
      else{var s=topOf("debt",1);
        if(!s){var big=topOf("debt",0);big.leave=performance.now();for(var k=0;k<9;k++)spawn("debt",1,k,false);s=topOf("debt",1)}
        s.leave=performance.now()}
      var tt=self.totals();return {ok:true,msg:tt.debt===0?"Out of the red.":"Debt down £"+amt.toLocaleString("en-GB")+". Net worth up £"+amt.toLocaleString("en-GB")+".",delta:"-£"+amt.toLocaleString("en-GB"),clear:tt.debt===0}}
    if(!small){if(live(t,0)>=CAP[t])return {ok:false,msg:"That stack is full. Try another."};spawn(t,0,live(t,0),true);return {ok:true,msg:(t==="gold"?"Gold bar laid. ":"Block laid. ")+"+£1,000.",delta:"+£1,000"}}
    if(live(t,1)>=9){boxes.forEach(function(b){if(b.t===t&&b.s===1&&!b.leave){b.leave=performance.now();b.merge=true}});
      if(live(t,0)>=CAP[t])return {ok:false,msg:"That stack is full. Try another."};spawn(t,0,live(t,0),true);return {ok:true,msg:"Nine cubes made a block. +£100.",delta:"+£100"}}
    spawn(t,1,live(t,1),true);return {ok:true,msg:"Cube laid. +£100.",delta:"+£100"};
  };
  function geo(b,ts,cn){
    var g={x:XC[b.t],z:0,w:10,d:10,h:BHT[b.t],y:0};
    if(b.s){var gx=(b.i%3-1)*3.45,gz=(Math.floor(b.i/3)-1)*3.45;g.w=SM;g.d=SM;g.h=SM;g.x+=gx;g.z=gz;g.y=b.t==="debt"?-(cn.debt*BHT.debt)-SM:cn[b.t]*BHT[b.t]}
    else{if(b.t==="gold"){g.w=11;g.d=7;g.z=(b.i%2)?.8:-.8}g.y=b.t==="debt"?-(b.i+1)*BHT.debt:b.i*BHT[b.t]}
    var age=ts-b.born,al=1,fl=0;
    if(b.born>0){g.y+=age<700?(1-ease3(age/700))*18:0;fl=clamp(1-age/1000,0,1)}
    if(b.leave){var lt=clamp((ts-b.leave)/900,0,1);g.y+=(b.merge?-1:1)*ease3(lt)*(b.merge?3:16);al=1-lt;fl=1-lt*.15}
    g.al=al;g.fl=fl;g.col=b.t==="dep"?NPL.dep:b.t==="stk"?NPL.stk:b.t==="gold"?NPL.gold:NPL.debt;return g;
  }
  function drawBox(P,g){
    var x0=g.x-g.w/2,x1=g.x+g.w/2,y0=g.y,y1=g.y+g.h,z0=g.z-g.d/2,z1=g.z+g.d/2;
    var F=[[[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1],[0,1,0]],[[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],[0,0,1]],[[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[0,0,-1]],[[x1,y0,z0],[x1,y0,z1],[x1,y1,z1],[x1,y1,z0],[1,0,0]],[[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],[-1,0,0]]];
    var col=g.fl>0?mix(g.col,NPL.flash,g.fl):g.col,gx=g.x,gy=g.y+g.h/2,gz=g.z;
    F.forEach(function(f){var n=f[4];if(((P.pos[0]-gx)*n[0]+(P.pos[1]-gy)*n[1]+(P.pos[2]-gz)*n[2])<=0)return;
      var lt=Math.max(0,n[0]*LD[0]+n[1]*LD[1]+n[2]*LD[2]),sh=NPL.shMin+(1-NPL.shMin)*lt,cc=[col[0]*sh,col[1]*sh,col[2]*sh];
      var s=f.slice(0,4).map(function(q){return P.pt(q[0],q[1],q[2])});
      c.beginPath();c.moveTo(s[0][0],s[0][1]);for(var k=1;k<4;k++)c.lineTo(s[k][0],s[k][1]);c.closePath();
      c.fillStyle=rgba(cc,(NPL.fa+.08*PL)*g.al);c.fill();c.strokeStyle=rgba(mix(col,NPL.edgeMix,NPL.edgeK),(.62+.3*PL)*g.al);c.lineWidth=1;c.stroke()});
  }
  function render(ts){
    NPL=nwPal(st);PL=reduce?.5:.5+.5*Math.sin(ts*0.002244);var P=new Proj(st,{x:0,y:0,w:cw,h:ch}),i;
    var cn={dep:live("dep",0),stk:live("stk",0),gold:live("gold",0),debt:live("debt",0)};
    var items=boxes.map(function(b){var g=geo(b,ts,cn);g.b=b;g.dz=Math.hypot(P.pos[0]-g.x,P.pos[1]-g.y,P.pos[2]-g.z);return g});
    items.sort(function(a,b){return b.dz-a.dz});
    boxes=boxes.filter(function(b){return !(b.leave&&ts-b.leave>=900)});
    c.save();
    items.forEach(function(g){if(g.b.t==="debt")drawBox(P,g)});
    var c0=P.pt(0,0,0);
    c.save();c.translate(c0[0],c0[1]);c.scale(1,Math.max(.3,Math.sin(st.pitch)));
    var gr=c.createRadialGradient(0,0,0,0,0,c0[3]*70);gr.addColorStop(0,rgba(NPL.glow,NPL.glowA));gr.addColorStop(1,rgba(NPL.glow,0));
    c.fillStyle=gr;c.beginPath();c.arc(0,0,c0[3]*70,0,Math.PI*2);c.fill();c.restore();
    c.lineWidth=1;
    for(i=-5;i<=5;i++){c.strokeStyle=rgba(NPL.grid,NPL.gridA*(1-Math.abs(i)/6.5));
      var A=P.pt(i*12,0,-60),B=P.pt(i*12,0,60);c.beginPath();c.moveTo(A[0],A[1]);c.lineTo(B[0],B[1]);c.stroke();
      A=P.pt(-60,0,i*12);B=P.pt(60,0,i*12);c.beginPath();c.moveTo(A[0],A[1]);c.lineTo(B[0],B[1]);c.stroke()}
    var pq=[P.pt(-42,0,-17),P.pt(42,0,-17),P.pt(42,0,17),P.pt(-42,0,17)],tt=self.totals(),red=tt.net<0,CS=red?NPL.debt:NPL.planeS,CF=red?NPL.debt:NPL.planeF;
    c.save();c.shadowColor=rgba(CS,.7);c.shadowBlur=NPL.blur;c.beginPath();c.moveTo(pq[0][0],pq[0][1]);for(i=1;i<4;i++)c.lineTo(pq[i][0],pq[i][1]);c.closePath();
    c.fillStyle=rgba(CF,NPL.planeFA);c.fill();c.strokeStyle=rgba(CS,.9);c.lineWidth=1.5;c.stroke();c.restore();
    if(!reduce){var pg=(ts%2800)/2800,ge=pg*16,rq=[P.pt(-42-ge,0,-17-ge),P.pt(42+ge,0,-17-ge),P.pt(42+ge,0,17+ge),P.pt(-42-ge,0,17+ge)];c.beginPath();c.moveTo(rq[0][0],rq[0][1]);for(i=1;i<4;i++)c.lineTo(rq[i][0],rq[i][1]);c.closePath();c.strokeStyle=rgba(CS,(1-pg)*.45);c.lineWidth=1.4;c.stroke()}
    var lf=clamp(cw*.022,9,13);c.font=lf+"px 'Share Tech Mono',monospace";c.textAlign="center";
    ["dep","stk","gold","debt"].forEach(function(t){var q=P.pt(XC[t],0,22);c.fillStyle=t==="debt"?rgba(NPL.debt,.95):NPL.label;c.fillText(NAMES[t],q[0],q[1])});
    c.textAlign="left";
    items.forEach(function(g){if(g.b.t!=="debt")drawBox(P,g)});
    nwTag(c,P,cw,tt,red,CS,NPL);
    c.restore();
  }
  var ob=orbit(cv,st,{touch:function(){idle=performance.now()}});
  function frame(ts){raf=0;if(!vis)return;if(last&&ts-last<1000/(o.fps||30)-2){raf=requestAnimationFrame(frame);return}var dt=Math.min(.05,(ts-(last||ts))/1000);last=ts;
    if(auto&&!ob.isDrag()&&ts-idle>2500)st.yaw=-.55+Math.sin(ts/4200)*.35;
    st.now=ts;st.theme=o.theme||rootTheme();c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,cw,ch);render(ts);raf=requestAnimationFrame(frame)}
  function start(){if(vis&&!raf){last=0;raf=requestAnimationFrame(frame)}}
  if("ResizeObserver" in window)new ResizeObserver(size).observe(cv);else window.addEventListener("resize",size);
  size();
  if("IntersectionObserver" in window)new IntersectionObserver(function(es){vis=es[0].isIntersecting;start()},{threshold:.01}).observe(cv);else{vis=true;start()}
  self.reset();return self;
}
function nwTag(c,P,cw,tt,red,CS,NPL){
  var fs=clamp(cw*.026,11,17),l1=tt.debt===0&&tt.net>=0?"OUT OF THE RED":red?"IN THE RED":"NET WORTH",l2=(red?"-":"")+"£"+Math.abs(tt.net).toLocaleString("en-GB");
  c.font=fs+"px 'Share Tech Mono',monospace";var w1=c.measureText(l1).width;c.font=(fs*1.5)+"px 'Share Tech Mono',monospace";var w2=c.measureText(l2).width;
  var tw=Math.max(w1,w2)+fs*1.5,th=fs*3.6,tx=cw-tw-14,ty=14,pe=P.pt(42,0,0);
  c.save();c.strokeStyle=rgba(CS,.9);c.lineWidth=1.2;c.beginPath();c.moveTo(pe[0],pe[1]);c.lineTo(tx+tw*.5,ty+th);c.stroke();
  c.fillStyle=rgba(CS,1);c.beginPath();c.arc(pe[0],pe[1],3,0,Math.PI*2);c.fill();
  c.shadowColor=rgba(CS,.55);c.shadowBlur=NPL.blur?18:8;c.beginPath();if(c.roundRect)c.roundRect(tx,ty,tw,th,fs*.4);else c.rect(tx,ty,tw,th);c.fillStyle=red?"#E05C5C":"#E8C56A";c.fill();c.restore();
  c.fillStyle=red?"#1A0606":"#1A1400";c.font=fs+"px 'Share Tech Mono',monospace";c.fillText(l1,tx+fs*.75,ty+fs*1.15);
  c.font=(fs*1.5)+"px 'Share Tech Mono',monospace";c.fillText(l2,tx+fs*.75,ty+fs*2.9);
}

/* ===== net worth tracker: one chart, two views (graph or 3D blocks) ===== */
function makeTracker(cv,o){
  o=o||{};
  var c=cv.getContext("2d"),st={yaw:-.3,pitch:.36,dist:260,zoom:1,ty:14,fit:1,now:0};
  var cw=300,ch=200,dpr=1,vis=false,raf=0,last=0,idle=-9999,auto=!reduce,self={st:st};
  var NPL=nwPal({theme:"dark"}),PL=.5,view="line",win=[0,22],sel={nw:true,debt:true,inc:true,fc:true},hover=-1,t0=0,TODAY=11,N=23,SM=3.1,BH=3.2;
  var MN=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var LABELS=null;function lab(i){if(LABELS&&LABELS[i])return LABELS[i];var m=(10+i)%12,y=25+Math.floor((10+i)/12);return MN[m]+" '"+y}
  var DATA={
    nw:[1800,2500,3100,3900,4400,5300,5800,6600,7200,7900,8600,9300,9700,10100,10500,10900,11300,11700,12100,12500,12900,13300,13700],
    debt:[9100,8800,8400,8100,7800,7400,7000,6700,6400,6100,5800,5600,5300,5000,4700,4400,4100,3800,3500,3200,2900,2600,2300],
    inc:[1700,1700,1800,1800,1800,1900,1900,1900,1900,1900,1900,1900,1900,1900,1900,1900,1900,1900,1900,1900,1900,1900,1900]};
  var WINS={all:[0,22],y1:[0,14],m6:[6,14],m3:[9,13]};
  /* feed real data: {labels:[...],nw:[...],debt:[...],inc:[...],today:index}. Values are pounds, rounded to £100. */
  self.setData=function(d){DATA={nw:d.nw,debt:d.debt,inc:d.inc};LABELS=d.labels||null;TODAY=d.today;N=d.nw.length;var T=TODAY;WINS={all:[0,N-1],y1:[Math.max(0,T-11),Math.min(N-1,T+3)],m6:[Math.max(0,T-5),Math.min(N-1,T+3)],m3:[Math.max(0,T-2),Math.min(N-1,T+2)]};win=WINS.all;t0=performance.now();hover=-1;emit()};
  function size(){var r=cv.getBoundingClientRect();cw=Math.max(2,r.width);ch=Math.max(2,r.height);dpr=Math.min(window.innerWidth<700?1.5:2,window.devicePixelRatio||1);cv.width=Math.round(cw*dpr);cv.height=Math.round(ch*dpr)}
  function emit(){if(o.onChange)o.onChange({view:view,win:win,hover:hover,i:hover>=0?hover:TODAY,lab:lab(hover>=0?hover:TODAY),v:{nw:DATA.nw[hover>=0?hover:TODAY],debt:DATA.debt[hover>=0?hover:TODAY],inc:DATA.inc[hover>=0?hover:TODAY]},forecast:(hover>=0?hover:TODAY)>TODAY})}
  self.setView=function(v){view=v;t0=performance.now();hover=-1;emit()};
  self.setRange=function(k){win=WINS[k];t0=performance.now();hover=-1;emit()};
  self.setSeries=function(k,on){sel[k]=on;t0=performance.now()-300;emit()};
  self.getView=function(){return view};
  var CO=function(ts,i,k){var e=(ts-t0-(i-win[0])*45)/700;return reduce?1:ease3(clamp(e,0,1))};
  function drawLine(ts){
    var L=clamp(cw*.1,44,64),Rr=16,Tp=26,Bt=30,pw=cw-L-Rr,ph=ch-Tp-Bt,a=win[0],b=win[1],i,ink=NPL.label;
    var mx=0;for(i=a;i<=b;i++){mx=Math.max(mx,DATA.nw[i]);if(sel.debt)mx=Math.max(mx,DATA.debt[i])}mx=Math.ceil(mx/2000)*2000;
    function X(i){return L+(i-a)/(b-a)*pw}function Y(v){return Tp+ph*(1-v/mx)}
    c.font=clamp(cw*.026,10,12)+"px 'Share Tech Mono',monospace";c.textBaseline="middle";c.textAlign="right";
    for(i=0;i<=4;i++){var v=mx*i/4,y=Y(v);c.strokeStyle=rgba(NPL.grid,.18);c.lineWidth=1;c.setLineDash([3,4]);c.beginPath();c.moveTo(L,y);c.lineTo(L+pw,y);c.stroke();c.setLineDash([]);c.fillStyle=ink;c.fillText("£"+(v/1000)+"k",L-8,y)}
    c.textAlign="center";c.textBaseline="alphabetic";var step=Math.max(1,Math.round((b-a)/6));
    for(i=a;i<=b;i+=step){c.fillStyle=ink;c.fillText(lab(i),X(i),ch-10)}
    var prog=reduce?1:ease3(clamp((ts-t0)/900,0,1));
    c.save();c.beginPath();c.rect(L-2,0,pw*prog+4,ch);c.clip();
    function line(arr,col,from,to,w,dash){c.beginPath();for(var k=from;k<=to;k++){var x=X(k),y=Y(arr[k]);if(k===from)c.moveTo(x,y);else c.lineTo(x,y)}c.strokeStyle=rgba(col,1);c.lineWidth=w;c.setLineDash(dash||[]);c.lineJoin="round";c.stroke();c.setLineDash([])}
    var hEnd=Math.min(b,TODAY);
    if(hEnd>a){var gA=c.createLinearGradient(0,Tp,0,Tp+ph);gA.addColorStop(0,rgba(NPL.dep,.28));gA.addColorStop(1,rgba(NPL.dep,0));c.beginPath();c.moveTo(X(a),Y(0));for(i=a;i<=hEnd;i++)c.lineTo(X(i),Y(DATA.nw[i]));c.lineTo(X(hEnd),Y(0));c.closePath();c.fillStyle=gA;c.fill()}
    if(sel.debt)line(DATA.debt,NPL.debt,a,hEnd,2);
    if(sel.inc)line(DATA.inc,NPL.gold,a,hEnd,1.8);
    line(DATA.nw,NPL.dep,a,hEnd,2.6);
    if(sel.fc&&b>TODAY){line(DATA.nw,NPL.dep,Math.max(a,TODAY),b,2.2,[6,5]);if(sel.debt)line(DATA.debt,NPL.debt,Math.max(a,TODAY),b,1.6,[4,5])}
    c.restore();
    if(TODAY>=a&&TODAY<=b){var tx=X(TODAY);c.strokeStyle=rgba(NPL.planeS,.9);c.lineWidth=1.3;c.setLineDash([4,4]);c.beginPath();c.moveTo(tx,Tp-6);c.lineTo(tx,Tp+ph);c.stroke();c.setLineDash([]);
      c.fillStyle=rgba(NPL.planeS,1);c.textAlign="center";c.fillText("TODAY",tx,Tp-12);c.beginPath();c.arc(tx,Y(DATA.nw[TODAY]),4,0,Math.PI*2);c.fillStyle=rgba(NPL.dep,1);c.fill();
      if(!reduce){var pg=(ts%2800)/2800;c.beginPath();c.arc(tx,Y(DATA.nw[TODAY]),4+pg*12,0,Math.PI*2);c.strokeStyle=rgba(NPL.dep,(1-pg)*.6);c.lineWidth=1.5;c.stroke()}}
    if(hover>=a&&hover<=b){var hx=X(hover);c.strokeStyle=rgba(NPL.planeS,.7);c.lineWidth=1;c.beginPath();c.moveTo(hx,Tp);c.lineTo(hx,Tp+ph);c.stroke();[["nw",NPL.dep],["debt",NPL.debt],["inc",NPL.gold]].forEach(function(s){if(s[0]!=="nw"&&!sel[s[0]])return;c.beginPath();c.arc(hx,Y(DATA[s[0]][hover]),4,0,Math.PI*2);c.fillStyle=rgba(s[1],1);c.fill()})}
    c.textAlign="left";c.textBaseline="alphabetic";
  }
  function drawBars(ts){
    var a=win[0],b=win[1],cnt=b-a+1,sp=13;st.dist=(60+cnt*9.2)*(cw<520?1.6:1);var P=new Proj(st,{x:0,y:0,w:cw,h:ch}),mid=(a+b)/2,items=[],i,k;
    function stack(xc,zc,v,dir,col,ghost,idx,sid){
      var big=Math.floor(v/1000),rem=(v-big*1000)/100,sm=Math.floor(rem),fr=rem-sm;if(sm>=10){big++;sm=0;fr=0}
      for(k=0;k<big;k++)items.push({x:xc,z:zc,w:10,d:10,h:BH,y:dir>0?k*BH:-(k+1)*BH,col:col,ghost:ghost,i:idx,s:sid,top:false});
      var base=dir>0?big*BH:-(big*BH)-SM;
      for(k=0;k<sm;k++)items.push({x:xc+(k%3-1)*3.45,z:zc+(Math.floor(k/3)-1)*3.45,w:SM,d:SM,h:SM,y:base,col:col,ghost:ghost,i:idx,s:sid,small:true});
      if(fr>.03&&sm<9){var kk=sm,hh=SM*fr;items.push({x:xc+(kk%3-1)*3.45,z:zc+(Math.floor(kk/3)-1)*3.45,w:SM,d:SM,h:hh,y:dir>0?base:base+SM-hh,col:col,ghost:ghost,i:idx,s:sid,small:true})}
    }
    for(i=a;i<=b;i++){var x=(i-mid)*sp,fc=i>TODAY,e=CO(ts,i);
      if(!fc||sel.fc){stack(x,0,DATA.nw[i]*e,1,NPL.dep,fc,i,"nw");if(sel.debt)stack(x,0,DATA.debt[i]*e,-1,NPL.debt,fc,i,"debt")}
      if(sel.inc&&(!fc||sel.fc))stack(x,16,DATA.inc[i]*e,1,NPL.gold,fc,i,"inc")}
    items.forEach(function(g){g.dz=Math.hypot(P.pos[0]-g.x,P.pos[1]-g.y,P.pos[2]-g.z)});
    items.sort(function(p,q){return q.dz-p.dz});
    var half=(cnt*sp)/2+8;
    function box(g,hl){
      var x0=g.x-g.w/2,x1=g.x+g.w/2,y0=g.y,y1=g.y+g.h,z0=g.z-g.d/2,z1=g.z+g.d/2;
      var F=[[[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1],[0,1,0]],[[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],[0,0,1]],[[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[0,0,-1]],[[x1,y0,z0],[x1,y0,z1],[x1,y1,z1],[x1,y1,z0],[1,0,0]],[[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],[-1,0,0]]];
      var col=hl?mix(g.col,NPL.flash,.55):g.col;
      F.forEach(function(f){var n=f[4];if(((P.pos[0]-g.x)*n[0]+(P.pos[1]-(g.y+g.h/2))*n[1]+(P.pos[2]-g.z)*n[2])<=0)return;
        var lt=Math.max(0,n[0]*LD[0]+n[1]*LD[1]+n[2]*LD[2]),sh=NPL.shMin+(1-NPL.shMin)*lt,cc=[col[0]*sh,col[1]*sh,col[2]*sh];
        var s=f.slice(0,4).map(function(q){return P.pt(q[0],q[1],q[2])});c.beginPath();c.moveTo(s[0][0],s[0][1]);for(var m=1;m<4;m++)c.lineTo(s[m][0],s[m][1]);c.closePath();
        c.fillStyle=rgba(cc,g.ghost?.14:(NPL.fa+.08*PL));c.fill();c.strokeStyle=rgba(mix(col,NPL.edgeMix,g.ghost?0:NPL.edgeK),g.ghost?.5:(.62+.3*PL));c.lineWidth=1;c.stroke()})}
    c.save();
    items.forEach(function(g){if(g.y<0)box(g,g.i===hover)});
    var c0=P.pt(0,0,0);c.save();c.translate(c0[0],c0[1]);c.scale(1,Math.max(.3,Math.sin(st.pitch)));
    var gr=c.createRadialGradient(0,0,0,0,0,c0[3]*half*1.2);gr.addColorStop(0,rgba(NPL.glow,NPL.glowA));gr.addColorStop(1,rgba(NPL.glow,0));c.fillStyle=gr;c.beginPath();c.arc(0,0,c0[3]*half*1.2,0,Math.PI*2);c.fill();c.restore();
    c.lineWidth=1;var gs=13;
    for(i=-Math.ceil(half/gs);i<=Math.ceil(half/gs);i++){c.strokeStyle=rgba(NPL.grid,NPL.gridA*.8);var A=P.pt(i*gs,0,-14),B=P.pt(i*gs,0,34);c.beginPath();c.moveTo(A[0],A[1]);c.lineTo(B[0],B[1]);c.stroke()}
    [-14,0,16,34].forEach(function(z){var A=P.pt(-half,0,z),B=P.pt(half,0,z);c.strokeStyle=rgba(NPL.grid,NPL.gridA*.8);c.beginPath();c.moveTo(A[0],A[1]);c.lineTo(B[0],B[1]);c.stroke()});
    var pq=[P.pt(-half,0,-14),P.pt(half,0,-14),P.pt(half,0,34),P.pt(-half,0,34)];
    c.save();c.shadowColor=rgba(NPL.planeS,.7);c.shadowBlur=NPL.blur;c.beginPath();c.moveTo(pq[0][0],pq[0][1]);for(i=1;i<4;i++)c.lineTo(pq[i][0],pq[i][1]);c.closePath();c.fillStyle=rgba(NPL.planeF,NPL.planeFA*.7);c.fill();c.strokeStyle=rgba(NPL.planeS,.8);c.lineWidth=1.3;c.stroke();c.restore();
    if(TODAY>=a&&TODAY<=b){var tx=(TODAY-mid)*sp,T1=P.pt(tx,-34,-14),T2=P.pt(tx,70,-14),T3=P.pt(tx,70,34),T4=P.pt(tx,-34,34);
      c.beginPath();c.moveTo(T1[0],T1[1]);c.lineTo(T2[0],T2[1]);c.lineTo(T3[0],T3[1]);c.lineTo(T4[0],T4[1]);c.closePath();c.fillStyle=rgba(NPL.planeF,.06);c.fill();c.setLineDash([5,5]);c.strokeStyle=rgba(NPL.planeS,.7);c.stroke();c.setLineDash([]);
      c.fillStyle=rgba(NPL.planeS,1);c.font="11px 'Share Tech Mono',monospace";c.textAlign="center";c.fillText("TODAY",T2[0],T2[1]-6);c.textAlign="left"}
    var ls=clamp(cw*.02,9,12);c.font=ls+"px 'Share Tech Mono',monospace";c.textAlign="center";c.fillStyle=NPL.label;
    var step=Math.max(1,Math.round(cnt/6));for(i=a;i<=b;i+=step){var q=P.pt((i-mid)*sp,0,-20);c.fillText(lab(i),q[0],q[1]+ls)}
    c.textAlign="left";
    items.forEach(function(g){if(g.y>=0)box(g,g.i===hover)});
    c.restore();
    self._P=P;self._mid=mid;self._sp=sp;
  }
  function pick(ex,ey){var r=cv.getBoundingClientRect(),mx=ex-r.left,my=ey-r.top,best=-1,bd=1e9,a=win[0],b=win[1],i;
    if(view==="line"){var L=clamp(cw*.1,44,64),pw=cw-L-16;i=Math.round(a+(mx-L)/pw*(b-a));if(i>=a&&i<=b)best=i}
    else if(self._P){for(i=a;i<=b;i++){var q=self._P.pt((i-self._mid)*self._sp,Math.max(2,DATA.nw[i]/1000*BH*.6),0),dd=Math.hypot(q[0]-mx,(q[1]-my)*.4);if(dd<bd&&dd<40){bd=dd;best=i}}}
    if(best!==hover){hover=best;emit()}}
  cv.addEventListener("pointermove",function(e){if(e.pointerType==="mouse"||e.buttons)pick(e.clientX,e.clientY)});
  cv.addEventListener("pointerdown",function(e){pick(e.clientX,e.clientY)});
  cv.addEventListener("pointerleave",function(){if(hover!==-1){hover=-1;emit()}});
  function tagBox(){
    var i=hover>=0?hover:TODAY,fs=clamp(cw*.024,10,15),fc=i>TODAY;
    var rows=[(fc?"FORECAST  ":"")+lab(i),"NET WORTH  £"+DATA.nw[i].toLocaleString("en-GB")];if(sel.debt)rows.push("DEBT       £"+DATA.debt[i].toLocaleString("en-GB"));if(sel.inc)rows.push("INCOME     £"+DATA.inc[i].toLocaleString("en-GB"));
    c.font=fs+"px 'Share Tech Mono',monospace";var tw=0;rows.forEach(function(r){tw=Math.max(tw,c.measureText(r).width)});tw+=fs*1.5;var th=fs*(rows.length*1.25+.9),tx=(view==="line"?clamp(cw*.1,44,64)+12:14),ty=12;
    c.save();c.shadowColor=rgba(NPL.planeS,.5);c.shadowBlur=NPL.blur?16:8;c.beginPath();if(c.roundRect)c.roundRect(tx,ty,tw,th,fs*.4);else c.rect(tx,ty,tw,th);c.fillStyle="#E8C56A";c.fill();c.restore();
    c.fillStyle="#1A1400";c.textBaseline="alphabetic";rows.forEach(function(r,k){c.fillText(r,tx+fs*.75,ty+fs*(1.25*k+1.3))})}
  function render(ts){NPL=nwPal(st);PL=reduce?.5:.5+.5*Math.sin(ts*0.002244);if(view==="line")drawLine(ts);else drawBars(ts);tagBox()}
  var ob=orbit(cv,st,{touch:function(){idle=performance.now()}});
  function frame(ts){raf=0;if(!vis)return;if(last&&ts-last<1000/(o.fps||30)-2){raf=requestAnimationFrame(frame);return}last=ts;
    if(view==="bars"&&auto&&!ob.isDrag()&&ts-idle>2500)st.yaw=-.3+Math.sin(ts/4600)*.18;
    st.now=ts;st.theme=o.theme||rootTheme();c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,cw,ch);render(ts);raf=requestAnimationFrame(frame)}
  function start(){if(vis&&!raf){last=0;raf=requestAnimationFrame(frame)}}
  if("ResizeObserver" in window)new ResizeObserver(size).observe(cv);else window.addEventListener("resize",size);
  size();t0=performance.now();
  if("IntersectionObserver" in window)new IntersectionObserver(function(es){vis=es[0].isIntersecting;if(vis&&!raf){t0=performance.now()}start()},{threshold:.2}).observe(cv);else{vis=true;start()}
  self.replay=function(){t0=performance.now()};
  emit();return self;
}

var HOUSE=null,HOUSE_G=null;

window.ViEngine={buildHouseGL:buildHouseGL,renderHouse:renderHouse,houseState:houseState,makeStage:makeStage,makeNW:makeNW,makeTracker:makeTracker,orbit:orbit,Proj:Proj,rootTheme:rootTheme,glr:glr};
})();
