// ═══════════════════════════════════════════════════════════════
// 3D CASH AND PRECIOUS METALS: the House Builder's own environment (dark teal sky, fog, survey grid, the same
// lights and orbit controls), real-size coins and bars. Units: centimetres.
// Cash: 1 coin = 1 unit of the chosen currency (£1, $1, €1, ₹1 at their real size). Stacks of 10, 10 rows by
// 10 columns make a block of 1,000; then a gap and the next block. Metals: the user's weight in each metal as
// standard bars (1 kg, 100 g, 1 oz, then the remainder), sized from the metal's density; value at the live price.
// Falls back to the older drawings if 3D is not available on the device.
// ═══════════════════════════════════════════════════════════════
var V3={};
function v3Ok(){try{if(!window.THREE||!THREE.OrbitControls)return false;if(V3._r)return true;return viGlOk();}catch(e){return false;}}   // the app's one cached WebGL check (a second probe context cost a phone half a second at the tap)
function v3Col(h){return new THREE.Color(h).convertSRGBToLinear();}
var V3_COINS={   // real sizes (cm): diameter, thickness, edge sides; outer and inner metal colours
  GBP:{d:2.343,t:0.28,sides:12,outer:'#C8A445',inner:'#C9CDD2',sym:'£',name:'£1'},
  USD:{d:2.649,t:0.20,sides:48,outer:'#C59B3C',inner:null,sym:'$',name:'$1'},
  EUR:{d:2.325,t:0.233,sides:48,outer:'#C9CDD2',inner:'#C8A445',sym:'€',name:'€1'},
  INR:{d:2.0,t:0.145,sides:48,outer:'#C9CDD2',inner:null,sym:'₹',name:'₹1'}
};
var V3_METALS={gold:{rho:19.32,col:'#E5BC52',rough:.2,label:'Gold'},silver:{rho:10.49,col:'#DADDE0',rough:.24,label:'Silver'},platinum:{rho:21.45,col:'#C7CCD1',rough:.28,label:'Platinum'},palladium:{rho:12.02,col:'#BEC2C5',rough:.3,label:'Palladium'}};
var V3_BARS=[{g:1000,name:'1 kg',w:11.6,d:5.2,pile:5},{g:100,name:'100 g',w:5.5,d:3.1,pile:10},{g:31.1035,name:'1 oz',w:4.1,d:2.4,pile:10}];
var OZ_G=31.1035;
/* WebGL on phones (owner, 31 Oct): touch devices skip MSAA and keep each canvas under about 2.2M pixels; desktops 4M. A lost context pauses the loop instead of drawing into nothing. */
function viCoarse(){try{return !!(window.matchMedia&&matchMedia('(pointer: coarse)').matches)}catch(e){return false}}
function viGlDpr(host){var w=Math.max(1,host.clientWidth||300),h=Math.max(1,host.clientHeight||200),budget=viCoarse()?2.2e6:4e6;return Math.max(1,Math.min(window.devicePixelRatio||1,viCoarse()?1.5:2,Math.sqrt(budget/(w*h))));}
// the House Builder's look (src/hb3d/viewer.js): same sky, fog, ground, grid and lights
/* one WebGL renderer for the cash and the metals stage (one is on screen at a time): one context and one set of compiled shaders,
   created ahead of time in an idle moment (v3Warm) rather than when the tab is tapped. The canvas moves to whichever stage draws. */
function v3Renderer(){if(V3._r)return V3._r;
  var r=V3._r=new THREE.WebGLRenderer({antialias:!viCoarse(),alpha:true});r.setClearColor(0x000000,0);   /* transparent: the Net worth in 3D stage shows through (owner, 31 Oct) */
  r.setPixelRatio(1);r.outputEncoding=THREE.sRGBEncoding;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.05;
  r.shadowMap.enabled=false;   /* v0.7 (owner, 2 Nov: "learn from" the house builder's viewport): no real-time shadow pass; a baked contact shadow sits under the content */
  var cv=r.domElement;cv.className='v3-canvas';cv.setAttribute('role','img');
  cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block;outline:none;touch-action:none';
  cv.addEventListener('webglcontextlost',function(e){e.preventDefault();[V3.cash,V3.metals].forEach(function(v){if(v)v._lost=true;});});
  cv.addEventListener('webglcontextrestored',function(){[V3.cash,V3.metals].forEach(function(v){if(v){v._lost=false;v._w=0;v.kick(800);}});});
  return r;}
function V3Scene(host,label){
  var self=this;this.host=host;this.label=label;
  var r=this.r=v3Renderer(),cv=r.domElement;
  host.style.touchAction='none';this._attach();
  var sc=this.sc=new THREE.Scene();sc.background=null;sc.fog=new THREE.Fog(0x080808,600,1600);
  sc.add(new THREE.HemisphereLight(v3Col(0xa8dcd6),v3Col(0x10302e),0.66));
  var sun=this.sun=new THREE.DirectionalLight(v3Col(0xfff0de),1.2);sun.castShadow=false;sc.add(sun);sc.add(sun.target);
  var fill=new THREE.DirectionalLight(v3Col(0x6fb8d8),0.35);fill.position.set(-200,120,-100);sc.add(fill);
  this.ground=new THREE.Mesh(new THREE.CircleBufferGeometry(5000,64),new THREE.MeshStandardMaterial({color:v3Col(0x0c1a20),roughness:1}));
  this.ground.rotation.x=-Math.PI/2;this.ground.position.y=-0.02;this.ground.visible=false;sc.add(this.ground);   /* the stage itself is the floor now */
  // shadows fall on a shadow-only plane sized to the content (the big floor stays evenly lit)
  this.catcher=new THREE.Mesh(new THREE.PlaneBufferGeometry(1,1),new THREE.MeshBasicMaterial({map:v3ContactTex(),transparent:true,depthWrite:false,fog:false,toneMapped:false}));this.catcher.rotation.x=-Math.PI/2;this.catcher.position.y=0.005;this.catcher.receiveShadow=true;sc.add(this.catcher);
  this.grid=null;
  this.env=null;   /* v0.7: no PMREM reflection map (it cost a phone up to a second at every open); the studio sheen is baked into v3Matcap() */
  this.root=new THREE.Group();sc.add(this.root);
  var cam=this.cam=new THREE.PerspectiveCamera(36,1,0.5,8000);
  var ctl=this.ctl=new THREE.OrbitControls(cam,host);   // controls on the stage's own box: the shared canvas moves between stages
  ctl.enableDamping=true;ctl.dampingFactor=0.09;ctl.rotateSpeed=0.8;ctl.maxPolarAngle=Math.PI/2-0.04;ctl.screenSpacePanning=true;
  ctl.touches={ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_PAN};
  ctl.addEventListener('change',function(){self.kick();});
  // draws only while something moves (orbit, spin, a kick after a change), never off screen or in a background tab
  this._loop=function(){self.raf=0;if(self.dead||self._lost||self._off||document.hidden){self._lastT=0;if(self._introRun){self.introStop();self._introPlayed=false;self._introWait=1;}return;}self._attach();var moving=self.ctl.update(),t=performance.now(),busy=moving||!!self._introRun||!!self._drag;
    if(busy){self._busyT=t;if(!self._busy){self._busy=true;self._w=0;}}else if(self._busy&&t-(self._busyT||0)>300){self._busy=false;self._w=0;}   // R16: the house builder's pixel ratio, lower while coins land or a finger is down, full again 300 ms after
    self.size();if(self._introRun)self._introStep(t);self.r.render(self.sc,self.cam);if(!self._shown&&self.root.children.length){self._shown=1;v3Shown(self.host);}if(self.onDraw)self.onDraw();if(window.VIPERF&&VIPERF.stageFrame)VIPERF.stageFrame(self===V3.metals?'Precious metals bars':'Cash and savings coins',self.r.info.render.calls,self.r.info.render.triangles);
    if(moving&&self._lastT&&!self._lite){var dt=t-self._lastT;if(dt>2&&dt<500){self._ema=self._ema==null?dt:self._ema*0.9+dt*0.1;self._nf=(self._nf||0)+1;if(self._nf>40&&self._ema>70)self.goLite();}}   // adaptive quality from the measured frame gap
    self._lastT=moving?t:0;
    /* v0.9.2 (the item viewer's R18, here too): ctl.update() above fires 'change', which kicks a frame, so queue one only if none is
       queued yet. Queuing both doubled the draws every frame after a drag (1,054 draws in one frame on a phone profile) until the glide stopped. */
    if((moving||self._spin||self._introRun||self._busy||Date.now()<self._until)&&!self.raf)self.raf=requestAnimationFrame(self._loop);};
  if(window.ResizeObserver){this.ro=new ResizeObserver(function(){self.kick();});this.ro.observe(host);}
  ctl.addEventListener('start',function(){self._drag=1;});ctl.addEventListener('end',function(){self._drag=0;self.kick(400);});
  this._off=!!window.IntersectionObserver;   // R16: off until the stage is seen, so the coins start laying only when they can be watched
  if(window.IntersectionObserver){this.io=new IntersectionObserver(function(es){var vis=es[es.length-1].isIntersecting;if(vis===!self._off)return;self._off=!vis;
    if(vis){if(self._introWait&&!self._introRun)self.introStart();self.kick(200);}else if(self._introRun){self.introStop();self._introPlayed=false;self._introWait=1;}},{threshold:.01});this.io.observe(host);}
  document.addEventListener('visibilitychange',function(){if(!document.hidden)self.kick(200);});
}
// lite quality for a device that cannot keep up (under ~14 frames a second while orbiting): shadows off, pixel ratio 1
V3Scene.prototype._attach=function(){var cv=this.r.domElement;if(cv.parentNode!==this.host){this.host.insertBefore(cv,this.host.firstChild);cv.setAttribute('aria-label',this.label);this._w=0;}};   // the shared canvas comes to this stage (it was on the other one, or nowhere yet)
V3Scene.prototype.goLite=function(){if(this._lite)return;this._lite=true;this.r.shadowMap.enabled=false;this.sun.castShadow=false;this.r.setPixelRatio(1);this._w=0;
  this.sc.traverse(function(o){var m=o.material;if(!m)return;(Array.isArray(m)?m:[m]).forEach(function(x){x.needsUpdate=true;});});this.kick(300);};
/* v0.9.1 round 2, R16 (owner, 4 Nov: "coins animated in singly like the bricks ... learn from housebuilder viewport to
   adapt"): the house builder's opening. The finished stacks are in place on the first frame and only the newest row of
   coins on each plate lays, one coin at a time and layer by layer like a course of bricks (each coin within 40 ms of the
   last, a row started within 1 s), dropping onto its stack with the bricks' gold flash. This device notes what it has seen
   laid (vi_cash_seen, a display note like the house's vi_hb_seen), so a later visit with nothing new shows the finished
   stacks at once and new money lays only the new coins. The landing coins are one temporary instanced draw a plate whose
   drop and flash run in the shader from each coin's start time, so the frame costs no work per coin; once the last has
   settled they go and the stacks are back to one shape a block. The metal bars do the same, one bar at a time (up to ten
   of each size), noted in vi_metals_seen. It starts when the stage is in view; reduced motion shows everything placed.
   introArm(tag, zone) arms it once per change of the figures; a zone limits it to one metal (E22). */
var V3_DROP=0.55,V3_FLASH=1.0,V3_ROW=1.0,V3_T0=performance.now(),V3_NOW={value:0},V3_FLY={};
function v3Clock(){return (performance.now()-V3_T0)/1000;}
function v3Still(){try{return !!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);}catch(e){return false;}}
// what this device has seen laid on each plate or bar size (a display note, never the user's data)
function v3Seen(stage,set){var k='vi_'+stage+'_seen',all={};try{all=JSON.parse(localStorage.getItem(k)||'{}')||{};}catch(e){all={};}
  if(set==null)return all;try{localStorage.setItem(k,JSON.stringify(Object.assign(all,set)));}catch(e){}return all;}
// the landing material: the stage's own material, with each instance's drop and gold flash worked out in the shader from its start time
function v3FlyMat(base){var m=V3_FLY[base.uuid];if(m)return m;
  m=V3_FLY[base.uuid]=base.clone();var u=m.userData.u={uDrop:{value:1},uGold:{value:v3Col(0xF6CB6A)}};m.userData.keep=true;
  m.onBeforeCompile=function(s){s.uniforms.uNow=V3_NOW;s.uniforms.uDrop=u.uDrop;s.uniforms.uGold=u.uGold;
    s.vertexShader='attribute float aLaid;\nuniform float uNow;\nuniform float uDrop;\nvarying float vFlash;\n'+s.vertexShader
      .replace('#include <begin_vertex>','#include <begin_vertex>\nfloat vAge=uNow-aLaid;float vDz=clamp(vAge/'+V3_DROP.toFixed(3)+',0.0,1.0);float vEz=1.0-vDz;transformed.y+=vEz*vEz*vEz*uDrop;vFlash=1.0-clamp(vAge/'+V3_FLASH.toFixed(3)+',0.0,1.0);')
      .replace('#include <project_vertex>','#include <project_vertex>\nif(vAge<0.0)gl_Position=vec4(2.0,2.0,2.0,1.0);');
    s.fragmentShader='uniform vec3 uGold;\nvarying float vFlash;\n'+s.fragmentShader.replace('#include <tonemapping_fragment>','gl_FragColor.rgb=mix(gl_FragColor.rgb,uGold,vFlash*0.85);\n#include <tonemapping_fragment>');};
  m.customProgramCacheKey=function(){return 'v3fly';};
  return m;}
// a shape's buffers shared (never uploaded twice) plus a per-instance start time
function v3FlyGeo(geo,laid){var g=new THREE.BufferGeometry();for(var a in geo.attributes)g.setAttribute(a,geo.attributes[a]);g.setIndex(geo.index);g.groups=geo.groups;
  g.setAttribute('aLaid',new THREE.InstancedBufferAttribute(laid,1));return g;}
function v3FlyDrop(im){var g=im.geometry,la=g.attributes.aLaid;g.index=null;g.attributes={aLaid:la};g.dispose();if(im.dispose)im.dispose();}   // frees the start times only: the shared shape stays
/* one plate's newest row (the last stacks, ten to a row, up to 100 coins): the coins not yet seen fly in, layer by layer;
   the row's coins already seen stand in place in the same draw. A row inside a finished block opens that block for the
   moment: the block hides and its other 90 stacks stand in. */
function v3CoinPlan(G,spec,n,seen,pos,S){
  if(!(n>0))return null;
  var STACK=10,len=(n-1)%100+1,c0=n-len,from=seen==null?c0:Math.max(c0,Math.min(n,Math.floor(+seen)||0));if(from>=n)return null;
  var inBlock=S.merged*1000>c0,coin=v3Stack(spec,1),m4=new THREE.Matrix4(),order=[],tmp=null,c;
  for(c=from;c<n;c++)order.push(c);
  order.sort(function(a,b){return (a%STACK)-(b%STACK)||a-b;});
  for(c=c0;c<from;c++)order.push(c);
  var mats=new Float32Array(order.length*16);
  order.forEach(function(c,i){var q=pos(Math.floor(c/STACK));m4.makeTranslation(q[0],spec.t*(c%STACK+0.5),q[1]);m4.toArray(mats,i*16);});
  return {n:n-from,geo:coin.geo,mat:coin.mats[0],mats:mats,parent:G,drop:spec.d*2.2,
    hide:function(){
      if(inBlock){S.bi.count=S.merged-1;
        if(!tmp){var st=v3Stack(spec,STACK),b0=(S.merged-1)*100,k=0;tmp=new THREE.InstancedMesh(st.geo,st.mats[0],90);tmp.frustumCulled=false;
          for(var s=b0;s<b0+90;s++){var q=pos(s);m4.makeTranslation(q[0],spec.t*STACK/2,q[1]);tmp.setMatrixAt(k++,m4);}}
        G.add(tmp);}
      else{if(S.im)S.im.count=c0/STACK-S.merged*100;if(S.pm)S.pm.visible=false;}},
    show:function(){if(S.bi)S.bi.count=S.merged;if(S.im)S.im.count=S.loose;if(S.pm)S.pm.visible=true;if(tmp){G.remove(tmp);if(tmp.dispose)tmp.dispose();tmp=null;}}};
}
// one bar size's newest bars (ten at most), or the part bar: in the order they were stacked
function v3UnitPlan(im,n,seen,drop){
  var have=Math.max(n-10,seen==null?0:Math.min(n,Math.floor(+seen)||0));if(have>=n)return null;
  var k=n-have,mats=new Float32Array(k*16);mats.set(im.instanceMatrix.array.subarray(have*16,n*16));
  return {n:k,geo:im.geometry,mat:im.material,mats:mats,parent:im.parent,drop:drop,hide:function(){im.count=have;},show:function(){im.count=n;}};
}
function v3PiecePlan(mesh,n,seen,drop){
  if(seen!=null&&+seen===n)return null;
  return {n:1,geo:mesh.geometry,mat:mesh.material,mats:Float32Array.from(new THREE.Matrix4().makeTranslation(mesh.position.x,mesh.position.y,mesh.position.z).elements),parent:mesh.parent,drop:drop,
    hide:function(){mesh.visible=false;},show:function(){mesh.visible=true;}};
}
V3Scene.prototype._stageName=function(){return this===V3.metals?'metals':'cash';};
V3Scene.prototype._layNote=function(){var note={};this.root.traverse(function(o){var y=o.userData&&o.userData.v3Lay;if(y)note[y.id]=y.n;});return note;};
V3Scene.prototype.introArm=function(tag,zone,silent){
  if(this._introTag===tag&&this._introPlayed&&!zone)return;
  if(this._introRun)this.introStop();
  this._introTag=tag;this._introPlayed=false;this._introZone=zone||null;
  if(silent||v3Still()){this._introMs=0;this._introWait=0;this._introPlayed=true;v3Seen(this._stageName(),this._layNote());this.kick(200);return;}   // placed at once, and counted as seen
  this._introWait=1;if(!this._off)this.introStart();
};
V3Scene.prototype.introStart=function(){
  this._introWait=0;
  var zone=this._introZone,stage=this._stageName(),seen=v3Seen(stage),L=[],flights=[],note=this._layNote();
  this.root.traverse(function(o){var y=o.userData&&o.userData.v3Lay;if(y&&(!zone||y.zone===zone))L.push(y);});
  L.forEach(function(y){var F=y.plan(seen[y.id]);if(F){F.id=y.id;flights.push(F);}});   // planned after the walk: a plan may add a stand-in
  this._lastAnim={zone:zone||'all',at:Date.now(),flights:flights.map(function(F){return [F.id,F.n];})};
  if(!flights.length){this._introMs=0;this._introPlayed=true;v3Seen(stage,note);this.kick(200);return;}   // nothing new since this device last looked: the finished build at once
  var t0=v3Clock()+0.05,end=0,land=0;
  flights.forEach(function(F){
    var step=Math.min(0.04,V3_ROW/Math.max(1,F.n)),cnt=F.mats.length/16,laid=new Float32Array(cnt);
    for(var i=0;i<cnt;i++)laid[i]=i<F.n?t0+i*step:-1e3;
    var mat=v3FlyMat(F.mat);mat.userData.u.uDrop.value=F.drop;
    var im=new THREE.InstancedMesh(v3FlyGeo(F.geo,laid),mat,cnt);im.instanceMatrix.array.set(F.mats);im.instanceMatrix.needsUpdate=true;im.frustumCulled=false;im.userData.v3Flight=1;
    F.hide();F.parent.add(im);F.im=im;F.laid=laid;
    land=Math.max(land,(F.n-1)*step+V3_DROP);end=Math.max(end,(F.n-1)*step+Math.max(V3_DROP,V3_FLASH));
  });
  this._introRun={t0:t0,end:t0+end,flights:flights,note:note};
  this._introMs=Math.round((land+0.05)*1000);this._lastAnim.ms=this._introMs;
  this._lastAnim.flights=flights.map(function(F){return {id:F.id,n:F.n,laid:Array.prototype.slice.call(F.laid,0,F.n)};});   // a record of what laid, for ?perf=1 and the tests
  V3_NOW.value=v3Clock();this.kick(end*1000+400);
};
V3Scene.prototype._introStep=function(){V3_NOW.value=v3Clock();if(this._lastAnim&&this._lastAnim.dpr==null)this._lastAnim.dpr=this.r.getPixelRatio();if(V3_NOW.value>=this._introRun.end)this.introStop(true);};
// done: the opening ran to the end, so its coins count as seen (a stop from scrolling away plays it again next time)
V3Scene.prototype.introStop=function(done){
  var R=this._introRun;this._introRun=null;this._introWait=0;this._introPlayed=true;
  if(!R)return;
  R.flights.forEach(function(F){F.show();if(F.im){if(F.im.parent)F.im.parent.remove(F.im);v3FlyDrop(F.im);F.im=null;}});
  if(done===true)v3Seen(this._stageName(),R.note);
  this.kick(200);
};
V3Scene.prototype.size=function(){var w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;if(w!==this._w||h!==this._h||this.r._v3on!==this){this._w=w;this._h=h;this.r._v3on=this;var pr=this._lite?1:this._dpr(w,h),sz=this.r.getDrawingBufferSize(new THREE.Vector2());if(sz.x!==Math.floor(w*pr)||sz.y!==Math.floor(h*pr)||this.r.getPixelRatio()!==pr)this.r.setDrawingBufferSize(w,h,pr);else this.r.setViewport(0,0,w,h);this.cam.aspect=w/h;this.cam.updateProjectionMatrix();}};   // the shared renderer takes this stage's size and pixel ratio in one step: a pixel ratio change and a resize each reallocate the drawing buffer, so they are one call, and none when nothing changed (v0.9.2)
/* R16 (owner, 4 Nov: "learn from housebuilder viewport"): the house builder's pixel ratio. Full at rest (up to 2, inside the
   same pixel budget) for sharp coin rims; 1.25 on a phone (1.5 wider) while coins land, the camera turns or a finger is down.
   The drawing buffer is resized only when that changes. This replaces the flat 1.5 cap of E13. */
V3Scene.prototype._dpr=function(w,h){var budget=viCoarse()?2.2e6:4e6;return Math.max(1,Math.min(window.devicePixelRatio||1,2,this._busy?(w<700?1.25:1.5):2,Math.sqrt(budget/Math.max(1,w*h))));};
V3Scene.prototype.kick=function(ms){this._until=Math.max(this._until||0,Date.now()+(ms||600));if(!this.raf)this.raf=requestAnimationFrame(this._loop);};
V3Scene.prototype.clear=function(){if(this._introRun)this.introStop();var g=this.root,keep=function(x){return x&&x.userData&&x.userData.keep;};while(g.children.length){var o=g.children.pop();o.traverse(function(m){if(m.isInstancedMesh&&m.dispose)m.dispose();if(m.geometry&&!keep(m.geometry))m.geometry.dispose();var ms=m.material?(Array.isArray(m.material)?m.material:[m.material]):[];ms.forEach(function(x){if(keep(x))return;if(x.map&&!keep(x.map))x.map.dispose();x.dispose();});});}};   // the kept coin and bar shapes and materials are reused by the next build
// survey grid sized to the content (cell 5 cm), framed like the House Builder: three-quarter view from above
/* Pedro, 3 Nov: no flag line under 10.5 px on screen. Each label is measured through the camera as framed and any
   label whose smallest line would show under minPx grows (its lower edge stays on the post). Returns true if one grew. */
// size the flags (labelFloor) and clear them of each other (declutter), re-framing so the raised flags stay in view
function v3Settle(V,keep){for(var i=0;i<3;i++){var g=V.labelFloor(10.8),c=V.clampFlags(56,8),m=V.declutter(v3Narrow());if(!g&&!c&&!m)break;V.frame(keep&&V._framed);}V.labelFloor(10.8);V.clampFlags(56,8);V.declutter(v3Narrow());}
V3Scene.prototype.labelFloor=function(minPx){
  var H=this.host.clientHeight,cam=this.cam;if(!H)return false;
  this.root.updateMatrixWorld(true);cam.updateMatrixWorld();
  var up=new THREE.Vector3(0,1,0).applyQuaternion(cam.quaternion),p=new THREE.Vector3(),a=new THREE.Vector3(),b=new THREE.Vector3(),grew=false;
  this.root.traverse(function(o){var F=o.userData&&o.userData.v3Font,sp=o.tag;if(!F||!sp)return;
    sp.getWorldPosition(p);a.copy(p).addScaledVector(up,-sp.scale.y/2).project(cam);b.copy(p).addScaledVector(up,sp.scale.y/2).project(cam);
    var px=Math.min.apply(null,F.f.filter(Boolean))/F.h*Math.abs(b.y-a.y)/2*H;
    if(!(px>0)||Math.abs(px-minPx)<0.05)return;var h0=sp.scale.y;sp.scale.multiplyScalar(minPx/px);sp.position.y+=(sp.scale.y-h0)/2;grew=true;});   // exactly the floor: never smaller, never bigger than it needs
  return grew;
};
/* no flag hides another: each label's rectangle is projected on screen and, nearest first, a label that overlaps one
   already placed rises up its post until it is clear. Returns true if any moved. */
V3Scene.prototype.declutter=function(coins){   // coins: also keep every flag off the coins (phone width, owner via CoS 4 Nov: "at 390 px wide the cash 3D flags cover the coins")
  var H=this.host.clientHeight,cam=this.cam;if(!H)return false;
  this.root.updateMatrixWorld(true);cam.updateMatrixWorld();
  var up=new THREE.Vector3(0,1,0).applyQuaternion(cam.quaternion),rt=new THREE.Vector3(1,0,0).applyQuaternion(cam.quaternion),gap=8/H,L=[],posts=null,moved=false;
  this.root.traverse(function(o){if(o.userData&&o.userData.v3Font&&o.tag)L.push(o);if(o.userData&&o.userData.v3Posts)posts=o;});
  var rect=function(o){var sp=o.tag,p=new THREE.Vector3(),x0=9,y0=9,x1=-9,y1=-9;sp.getWorldPosition(p);
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(c){var q=p.clone().addScaledVector(rt,c[0]*sp.scale.x/2).addScaledVector(up,c[1]*sp.scale.y/2).project(cam);
      if(q.x<x0)x0=q.x;if(q.x>x1)x1=q.x;if(q.y<y0)y0=q.y;if(q.y>y1)y1=q.y;});return [x0,y0,x1,y1];};
  var hit=function(a,b){return a[0]<b[2]+gap&&b[0]<a[2]+gap&&a[1]<b[3]+gap&&b[1]<a[3]+gap;};
  var cp=[];if(coins)this.root.traverse(function(o){if(!o.isInstancedMesh||!o.userData.v3Intro)return;   // each coin stack's or block's top corners and centre, on screen
    if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();var bb=o.geometry.boundingBox,m=new THREE.Matrix4(),n=o.userData.v3Full||o.count;
    var top=[[bb.min.x,bb.min.z],[bb.max.x,bb.min.z],[bb.min.x,bb.max.z],[bb.max.x,bb.max.z],[(bb.min.x+bb.max.x)/2,(bb.min.z+bb.max.z)/2]];
    for(var i=0;i<n;i++){o.getMatrixAt(i,m);top.forEach(function(t){var q=new THREE.Vector3(t[0],bb.max.y,t[1]).applyMatrix4(m).applyMatrix4(o.matrixWorld).project(cam);cp.push([q.x,q.y]);});}});
  var onCoin=function(r){for(var j=0;j<cp.length;j++){var q=cp[j];if(q[0]>r[0]-gap&&q[0]<r[2]+gap&&q[1]>r[1]-gap&&q[1]<r[3]+gap)return true;}return false;};
  L.forEach(function(o){o._r=rect(o);});L.sort(function(a,b){return a._r[1]-b._r[1];});   // lowest on screen (nearest) keeps its place
  var placed=[];
  L.forEach(function(o){var sp=o.tag,n=0;
    while(n<60&&(placed.some(function(r){return hit(o._r,r);})||(cp.length&&onCoin(o._r)))){sp.position.y+=sp.scale.y*0.2;sp.updateMatrixWorld();o._r=rect(o);n++;}
    if(n){moved=true;var top=sp.position.y-sp.scale.y*0.4;
      if(posts&&o.userData.v3PostI!=null){var pa=posts.geometry.attributes.position;pa.setY(o.userData.v3PostI,top);pa.needsUpdate=true;posts.geometry.computeBoundingSphere();}
      else o.children.forEach(function(c){if(c.isLine&&!c.isLineSegments){var a=c.geometry.attributes.position;a.setY(1,top);a.needsUpdate=true;c.geometry.computeBoundingSphere();}});}
    placed.push(o._r);});
  L.forEach(function(o){delete o._r;});
  return moved;
};
/* CoS, 3 Nov: no flag under the zoom controls. Each label slides sideways along the screen so its right edge stays at
   least `right` px and its left edge `left` px inside the stage; its post stays put. Returns true if any moved. */
V3Scene.prototype.clampFlags=function(right,left){
  var W=this.host.clientWidth,cam=this.cam;if(!W)return false;
  this.root.updateMatrixWorld(true);cam.updateMatrixWorld();
  var rt=new THREE.Vector3(1,0,0).applyQuaternion(cam.quaternion),p=new THREE.Vector3(),moved=false;
  this.root.traverse(function(o){var F=o.userData&&o.userData.v3Font,sp=o.tag;if(!F||!sp)return;
    sp.getWorldPosition(p);
    var a=p.clone().addScaledVector(rt,-sp.scale.x/2).project(cam),b=p.clone().addScaledVector(rt,sp.scale.x/2).project(cam);
    var x0=(Math.min(a.x,b.x)+1)/2*W,x1=(Math.max(a.x,b.x)+1)/2*W,wpx=x1-x0;if(!(wpx>0))return;
    var dx=0;if(x1>W-right)dx=(W-right)-x1;if(x0+dx<left)dx=left-x0;if(!dx)return;
    var k=dx/wpx*sp.scale.x;sp.position.x+=rt.x*k;sp.position.z+=rt.z*k;moved=true;});   // the flag's group is never rotated, so world and local axes agree
  return moved;
};
V3Scene.prototype.frame=function(keep){
  this.size();
  var box=new THREE.Box3().setFromObject(this.root),m4=new THREE.Matrix4(),gb=new THREE.Box3();
  this.root.updateMatrixWorld(true);
  this.root.traverse(function(o){if(!o.isInstancedMesh||!o.count)return;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();   // batched coins and bars: every instance counts, not just the one shape
    var a=o.instanceMatrix.array,x0=1e9,y0=1e9,z0=1e9,x1=-1e9,y1=-1e9,z1=-1e9;for(var i=0,k=12;i<o.count;i++,k+=16){var x=a[k],y=a[k+1],z=a[k+2];if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;if(z<z0)z0=z;if(z>z1)z1=z;}   // instances are placed by translation only: one pass over the matrices, not a box per instance (seconds on a phone for 2,500 stacks)
    var bb=o.geometry.boundingBox;gb.min.set(x0+bb.min.x,y0+bb.min.y,z0+bb.min.z);gb.max.set(x1+bb.max.x,y1+bb.max.y,z1+bb.max.z);box.union(gb.applyMatrix4(o.matrixWorld));});
  if(box.isEmpty())box.set(new THREE.Vector3(-20,0,-20),new THREE.Vector3(20,5,20));
  var c=box.getCenter(new THREE.Vector3()),s=box.getSize(new THREE.Vector3()),R=Math.max(s.x,s.z,s.y*1.6,20);
  this.catcher.scale.set(s.x*1.25+2,s.z*1.25+2,1);this.catcher.position.x=c.x;this.catcher.position.z=c.z;   // the baked contact shadow, just wider than the content
  if(this.grid){this.sc.remove(this.grid);this.grid.geometry.dispose();this.grid.material.dispose();}
  this.R=R;var size=Math.ceil(R*7/10)*10,cell=Math.max(5,Math.ceil(size/160/5)*5),div=Math.round(size/cell);   /* owner, 31 Oct: a shorter draw distance, so the scene is lighter; the grid fades out in the fog, no hard edge */
  var g=this.grid=new THREE.GridHelper(size,div,0x44C0B9,0x44C0B9);g.material.transparent=true;g.material.opacity=0.3;g.material.depthWrite=false;g.material.fog=true;g.material.toneMapped=false;g.position.set(c.x,0.01,c.z);this.sc.add(g);
  /* the same floor as Net worth in 3D: a teal glow under the items and a gold-edged plinth round them */
  if(this.deco){this.sc.remove(this.deco);this.deco.traverse(function(o){if(o.geometry)o.geometry.dispose();if(o.material){if(o.material.map&&!(o.material.map.userData&&o.material.map.userData.keep))o.material.map.dispose();o.material.dispose();}});}
  var deco=this.deco=new THREE.Group(),pad=Math.max(2,R*0.08),px0=box.min.x-pad,px1=box.max.x+pad,pz0=box.min.z-pad,pz1=box.max.z+pad;
  var gc=document.createElement('canvas');gc.width=gc.height=128;var gx=gc.getContext('2d'),rg=gx.createRadialGradient(64,64,0,64,64,64);rg.addColorStop(0,'rgba(68,192,185,.22)');rg.addColorStop(1,'rgba(68,192,185,0)');gx.fillStyle=rg;gx.fillRect(0,0,128,128);
  var glow=new THREE.Mesh(new THREE.PlaneBufferGeometry(R*3.2,R*3.2),new THREE.MeshBasicMaterial({map:V3_KEEP._glow||(V3_KEEP._glow=(function(t){t.userData={keep:true};return t;})(new THREE.CanvasTexture(gc))),transparent:true,depthWrite:false,fog:false,toneMapped:false}));glow.rotation.x=-Math.PI/2;glow.position.set(c.x,0.004,c.z);deco.add(glow);
  var fill=new THREE.Mesh(new THREE.PlaneBufferGeometry(px1-px0,pz1-pz0),new THREE.MeshBasicMaterial({color:0x0b2a2c,transparent:true,opacity:0.55,depthWrite:false,toneMapped:false}));fill.rotation.x=-Math.PI/2;fill.position.set((px0+px1)/2,0.008,(pz0+pz1)/2);deco.add(fill);
  var edge=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(px0,0.02,pz0),new THREE.Vector3(px1,0.02,pz0),new THREE.Vector3(px1,0.02,pz1),new THREE.Vector3(px0,0.02,pz1)]),new THREE.LineBasicMaterial({color:0xE8C56A,transparent:true,opacity:0.95,toneMapped:false}));deco.add(edge);
  this.sc.add(deco);
  this.sc.fog.near=R*2.2;this.sc.fog.far=R*5;
  var sun=this.sun;sun.position.set(c.x+R*.9,R*1.4,c.z+R*1.1);sun.target.position.copy(c);var sc=sun.shadow.camera,e=R*3;sc.left=-e;sc.right=e;sc.top=e;sc.bottom=-e;sc.near=1;sc.far=R*40;sc.updateProjectionMatrix();   // wide enough that the floor near the camera is never left in false shadow
  var t0=new THREE.Vector3(c.x,s.y*0.3,c.z),p0=new THREE.Vector3(c.x+R*1.05,R*1.0+s.y,c.z+R*1.45),dir=p0.clone().sub(t0),cam=this.cam;
  // fit everything (labels too) inside the narrower of the two view angles, so a phone held upright sees the whole scene
  var rad=box.getBoundingSphere(new THREE.Sphere()).radius,vf=cam.fov*Math.PI/180,hf=2*Math.atan(Math.tan(vf/2)*(cam.aspect||1)),need=rad*((cam.aspect||1)<1?1.35:1.08)/Math.sin(Math.min(vf,hf)/2);
  dir.setLength(Math.max(need,R*0.6));this.home={t:t0,p:t0.clone().add(dir)};
  this.ctl.minDistance=Math.max(4,R*0.15);this.ctl.maxDistance=Math.max(R*6,dir.length()*2);
  if(!keep||!this._framed){this.reset();this._framed=true;}
  this.kick(900);
};
V3Scene.prototype.reset=function(){if(!this.home)return;this.cam.position.copy(this.home.p);this.ctl.target.copy(this.home.t);this.ctl.update();this.kick();};
V3Scene.prototype.zoom=function(f){var t=this.ctl.target,v=this.cam.position.clone().sub(t),d=Math.min(this.ctl.maxDistance,Math.max(this.ctl.minDistance,v.length()*f));this.cam.position.copy(t).add(v.setLength(d));this.kick();};
V3Scene.prototype.spin=function(on){this.ctl.autoRotate=!!on;this.ctl.autoRotateSpeed=1.2;this._spin=!!on;this.kick();};
/* v0.7 (owner, 2 Nov 2026, fold test: the coins froze a phone; "the viewport for the house builder is perfect ... learn from that viewport
   for the others"): the house builder's lessons. One cheap shader family with the shading baked in (a matcap: a small painted sphere of
   the old studio light and sheen) instead of physically based metal with a generated reflection map and soft real-time shadows; the
   coins, bars and their materials are built once and kept (marked keep, so a rebuild or clear never re-creates or re-uploads them). */
var V3_KEEP={};
function v3Keep(key,make){var v=V3_KEEP[key];if(!v){v=V3_KEEP[key]=make();var mark=function(x){if(x)x.userData=Object.assign(x.userData||{},{keep:true});};mark(v.geo);(v.mats||[]).forEach(function(m){mark(m);if(m.map)mark(m.map);});}return v;}
function v3Matcap(){if(V3_KEEP._mc)return V3_KEEP._mc;var c=document.createElement('canvas');c.width=c.height=128;var g=c.getContext('2d');
  var b=g.createRadialGradient(64,V3_KEYY,0,64,64,64);b.addColorStop(0,'#ffffff');b.addColorStop(.55,'#f6f2e8');b.addColorStop(.82,'#d8d3c8');b.addColorStop(.93,'#f6f1e4');b.addColorStop(1,'#9a968d');g.fillStyle=b;g.fillRect(0,0,128,128);   /* key light from above; a bright band near the edge so rims read lighter than faces */
  var h=g.createRadialGradient(46,34,0,46,34,40);h.addColorStop(0,'rgba(255,250,236,.85)');h.addColorStop(.5,'rgba(255,244,220,.25)');h.addColorStop(1,'rgba(255,244,220,0)');g.fillStyle=h;g.fillRect(0,0,128,128);   /* the studio panel's highlight */
  var f=g.createRadialGradient(100,98,0,100,98,34);f.addColorStop(0,'rgba(111,184,216,.30)');f.addColorStop(1,'rgba(111,184,216,0)');g.fillStyle=f;g.fillRect(0,0,128,128);   /* the cool teal fill from the side */
  var t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.userData={keep:true};return V3_KEEP._mc=t;}
function v3Shade(o){var m=new THREE.MeshMatcapMaterial(Object.assign({matcap:v3Matcap(),toneMapped:false,fog:false},o));return m;}   // the baked shading is already final: no tone mapping, so the gold stays the brand's gold
function v3ContactTex(){if(V3_KEEP._cs)return V3_KEEP._cs;var c=document.createElement('canvas');c.width=c.height=128;var g=c.getContext('2d'),gr=g.createRadialGradient(64,64,8,64,64,64);
  gr.addColorStop(0,'rgba(0,0,0,.42)');gr.addColorStop(.7,'rgba(0,0,0,.22)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);var t=new THREE.CanvasTexture(c);t.userData={keep:true};return V3_KEEP._cs=t;}
// canvas textures: a coin edge (one band per coin) and a coin face with the currency symbol
/* the coin's own colour, lifted toward a warm highlight for the faces and rims (Pedro, 2 Nov: tops read as dull brass; the matcap can only darken
   a texture, so the texture carries the brightness), saturation kept */
function v3IsGold(hex){var a=parseInt(hex.slice(1),16);return ((a>>16)&255)-(a&255)>30;}   // a warm metal (red well above blue): gold, brass; otherwise silver
function v3Lift(hex,t){t=Math.max(0,Math.min(1,t));var a=parseInt(hex.slice(1),16),w=v3IsGold(hex)?V3_LIFTC:[0xE8,0xEB,0xEE],o=[(a>>16)&255,(a>>8)&255,a&255].map(function(c,i){return Math.round(c+(w[i]-c)*t)});return '#'+o.map(function(c){return ('0'+c.toString(16)).slice(-2)}).join('');}
function v3Mix(a,b,t){var x=parseInt(a.slice(1),16),y=parseInt(b.slice(1),16);return '#'+[16,8,0].map(function(sh){var c=Math.round(((x>>sh)&255)*(1-t)+((y>>sh)&255)*t);return ('0'+c.toString(16)).slice(-2)}).join('');}
/* coin gold, tuned so the gold pixels' bright end sits in the brand gold (#D8B860 to #E8C56A) at 390 and 1100 (Pedro, 2 Nov): the faces and rims
   lifted 80% toward a warm gold (silver coins toward a neutral highlight, so they stay silver), the silver centre of a gold-ringed coin
   mostly gold too (a few pixels across, it mipmaps to beige otherwise), the matcap's key light high where the coin tops sample it.
   v0.9.1 cash 3D look: the 512 px coin face keeps the £1's centre silver-gold (V3_INNER 0.45), so it reads as the bimetallic £1 */
var V3_INNER=0.45,V3_LIFTC=[0xF6,0xCB,0x6A],V3_KEYY=6,V3_LIFT=0.8;
function v3CoinEdge(spec,n){var c=document.createElement('canvas');c.width=64;c.height=Math.max(16,n*16);var g=c.getContext('2d');
  for(var i=0;i<n;i++){var y=i*16;g.fillStyle=v3Lift(spec.outer,V3_LIFT);g.fillRect(0,y,64,16);g.fillStyle='rgba(255,236,170,.30)';g.fillRect(0,y+2,64,3);g.fillStyle='rgba(0,0,0,.45)';g.fillRect(0,y+14,64,2);
    if(spec.sides>12){g.fillStyle='rgba(0,0,0,.18)';for(var x=0;x<64;x+=4)g.fillRect(x,y+4,1,9);}}
  var t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.wrapS=THREE.RepeatWrapping;t.repeat.x=spec.sides>12?6:1;return t;}
/* v0.9.1 cash 3D look (owner, 4 Nov: "They should read as actual pounds, euros etc dollars (coins) but once stacked ... treated as
   groups, stacks of ten and groups of 100 ... this does not change the aesthetic, just performance"). One 512 px texture per coin:
   the edge courses on the left half, the face in the lower right quarter, a shadow tone in the upper right. The face has a raised
   rim, the bimetallic seam, the symbol in relief and the coin's name round the ring; the £1's twelve flat sides alternate milled
   and plain, round coins are milled all round. Edge and face still share one texture, so a batch of stacks is still one draw. */
var V3_FACEA=0.627;   // the default camera looks from about 36 degrees round, so the faces turn that much to stand upright
var V3_COIN_WORD={GBP:'ONE POUND',USD:'ONE DOLLAR',EUR:'EURO',INR:'RUPEE'};
function v3CoinSides(spec){return spec.sides>12?24:spec.sides;}   // a round coin's outline in 24 sides (32 before v0.9.2): round on a phone, and every stack is closed now, so fewer triangles
function v3StackTex(spec,n){var S=512,H=S/2,c=document.createElement('canvas');c.width=c.height=S;var g=c.getContext('2d');
  var base=v3Lift(spec.outer,V3_LIFT),hi=v3Lift(spec.outer,Math.min(1,V3_LIFT+.18)),sides=v3CoinSides(spec);
  for(var i=0;i<n;i++){var y=S*i/n,h=S/n,k=((i*37)%7)/7;   // each coin a touch lighter or darker than the next, as real coins are
    g.fillStyle=base;g.fillRect(0,y,H,h+1);g.fillStyle='rgba(0,0,0,'+(0.04+k*0.06).toFixed(3)+')';g.fillRect(0,y,H,h+1);
    g.fillStyle='rgba(255,240,190,.34)';g.fillRect(0,y+h*0.1,H,Math.max(1,h*0.16));
    g.fillStyle='rgba(0,0,0,.5)';g.fillRect(0,y+h-Math.max(1,h*0.14),H,Math.max(1,h*0.14));}
  g.fillStyle='rgba(0,0,0,.2)';
  if(spec.sides>12){for(var x=0;x<H;x+=2)g.fillRect(x,0,1,S);}
  else{var fw=H/sides;for(var f=0;f<sides;f+=2)for(var x2=f*fw+2;x2<(f+1)*fw-2;x2+=2.5)g.fillRect(Math.round(x2),0,1,S);}   // the £1: milled and plain sides in turn
  g.fillStyle=v3Mix(base,'#000000',.62);g.fillRect(H,0,H,H);   // the shadow between stacks
  var cx=H+H/2,cy=H+H/2,R=H/2-1,ring=function(r,fill){g.beginPath();if(spec.sides===12){for(var j=0;j<12;j++){var a=Math.PI/12+j*Math.PI/6-V3_FACEA;g[j?'lineTo':'moveTo'](cx+Math.sin(a)*r,cy+Math.cos(a)*r);}g.closePath();}else g.arc(cx,cy,r,0,Math.PI*2);g.fillStyle=fill;g.fill();};
  var dome=g.createRadialGradient(cx-R*.3,cy-R*.35,R*.1,cx,cy,R);dome.addColorStop(0,hi);dome.addColorStop(1,base);
  g.fillStyle=v3Mix(base,'#000000',.45);g.fillRect(H,H,H,H);ring(R,v3Mix(base,'#000000',.25));ring(R-3,hi);ring(R*0.9,dome);   // the raised rim
  var ic=null;if(spec.inner){ic=v3IsGold(spec.outer)&&!v3IsGold(spec.inner)?v3Mix(spec.inner,v3Lift(spec.outer,V3_LIFT+.25),V3_INNER):v3Lift(spec.inner,V3_LIFT);
    var ri=R*0.6;g.beginPath();g.arc(cx,cy,ri+2.5,0,Math.PI*2);g.fillStyle='rgba(0,0,0,.42)';g.fill();   // the seam between the two metals
    var id=g.createRadialGradient(cx-ri*.35,cy-ri*.4,ri*.1,cx,cy,ri);id.addColorStop(0,v3Lift(ic,.35));id.addColorStop(1,ic);g.beginPath();g.arc(cx,cy,ri,0,Math.PI*2);g.fillStyle=id;g.fill();}
  else{g.strokeStyle='rgba(0,0,0,.22)';g.lineWidth=1.5;for(var b=0;b<56;b++){var ba=b*Math.PI*2/56;g.beginPath();g.arc(cx+Math.cos(ba)*R*0.82,cy+Math.sin(ba)*R*0.82,1.6,0,Math.PI*2);g.stroke();}}   // a beaded ring
  var word=V3_COIN_WORD[Object.keys(V3_COINS).filter(function(k){return V3_COINS[k]===spec;})[0]]||'';
  if(word){g.save();g.font='bold 19px "DM Sans", sans-serif';g.textAlign='center';g.textBaseline='middle';var rr=spec.inner?R*0.76:R*0.7,step=0.105,a0=Math.PI/2+(word.length-1)*step/2;
    for(var w=0;w<word.length;w++){var a=a0-w*step;g.save();g.translate(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr);g.rotate(a-Math.PI/2);
      g.fillStyle='rgba(255,250,230,.45)';g.fillText(word[w],-0.8,-0.8);g.fillStyle='rgba(40,28,6,.6)';g.fillText(word[w],0.8,0.8);g.restore();}g.restore();}
  g.font='bold '+(spec.inner?86:104)+'px Syne, sans-serif';g.textAlign='center';g.textBaseline='middle';var sy=cy+(spec.inner?2:-6);
  g.fillStyle='rgba(30,20,4,.55)';g.fillText(spec.sym,cx+2.5,sy+3);g.fillStyle='rgba(255,252,236,.6)';g.fillText(spec.sym,cx-2,sy-2);   // the symbol in relief: lit from the top left
  g.fillStyle=ic?v3Lift(ic,.15):hi;g.fillText(spec.sym,cx,sy);
  var t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;return t;}
/* the coin shape, built here rather than from three.js's cylinder: flat sides for the 12-sided £1, no hidden bottom face, and the
   option to leave the side off where a neighbour hides it. Pushes triangles onto P (positions), N (normals), U (texture). */
function v3CoinPart(spec,n,ox,oz,side,P,N,U){   // v0.9.2 (owner, 4 Nov: "Each stack must be its own solid model"): every stack is closed, top, side and bottom
  var sides=v3CoinSides(spec),r=spec.d/2,h=spec.t*n,y0=-h/2,y1=h/2,flat=sides<=12,a0=flat?Math.PI/12:0,rr=r;
  var pt=function(j){var a=a0+(j%sides)*Math.PI*2/sides;return [Math.sin(a)*rr,Math.cos(a)*rr,a+(j>=sides?Math.PI*2:0)];};   // the last side meets the first exactly: no seam
  var tri=function(a,b,c,na,nb,nc,ua,ub,uc){P.push(a[0],a[1],a[2],b[0],b[1],b[2],c[0],c[1],c[2]);N.push(na[0],na[1],na[2],nb[0],nb[1],nb[2],nc[0],nc[1],nc[2]);U.push(ua[0],ua[1],ub[0],ub[1],uc[0],uc[1]);};
  var cf=Math.cos(V3_FACEA),sf=Math.sin(V3_FACEA),fu=function(x,z){var x2=x*cf-z*sf,z2=x*sf+z*cf;return [0.75+0.25*(x2/r),0.25-0.25*(z2/r)];},up=[0,1,0],dn=[0,-1,0];side=true;
  for(var j=0;j<sides;j++){var p=pt(j),q=pt(j+1);
    tri([ox,y1,oz],[ox+p[0],y1,oz+p[1]],[ox+q[0],y1,oz+q[1]],up,up,up,fu(0,0),fu(p[0],p[1]),fu(q[0],q[1]));
    tri([ox,y0,oz],[ox+q[0],y0,oz+q[1]],[ox+p[0],y0,oz+p[1]],dn,dn,dn,[0.75,0.75],[0.75,0.75],[0.75,0.75]);   // the bottom, in the shadow tone
    if(side){var na,nb;if(flat){var m=(p[2]+q[2])/2;na=nb=[Math.sin(m),0,Math.cos(m)];}else{na=[Math.sin(p[2]),0,Math.cos(p[2])];nb=[Math.sin(q[2]),0,Math.cos(q[2])];}
      var u0=0.5*j/sides,u1=0.5*(j+1)/sides,A=[ox+p[0],y0,oz+p[1]],B=[ox+q[0],y0,oz+q[1]],C=[ox+q[0],y1,oz+q[1]],D=[ox+p[0],y1,oz+p[1]];
      tri(A,B,C,na,nb,nb,[u0,0],[u1,0],[u1,1]);tri(A,C,D,na,nb,na,[u0,0],[u1,1],[u0,1]);}}   // wound to face outwards (they faced in, so the far wall's inside showed through)
};
function v3CoinGeo(P,N,U){var g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));g.computeBoundingBox();g.computeBoundingSphere();return g;}
function v3Stack(spec,n){
  return v3Keep('stack2|'+spec.name+'|'+spec.d+'|'+n,function(){var P=[],N=[],U=[];v3CoinPart(spec,n,0,0,true,P,N,U);
    return {geo:v3CoinGeo(P,N,U),mats:[v3Shade({map:v3StackTex(spec,n)})]};});
}
/* a big balance (past v3RealBlocks(spec) blocks: about £33,000 in £1 coins, £16,000 in round coins): each coin is a pixel or two on screen, so a block is one
   closed box wearing the same coins painted on (faces copied from the coin texture, the edges ten stacks round), at a fraction of the
   triangles. Up to there every block is its hundred closed stacks. */
var V3_REAL_TRIS=160000;   // the triangle budget for real stacks in one scene
function v3RealBlocks(spec){var s=v3CoinSides(spec);return Math.floor(V3_REAL_TRIS/(100*s*4));}
function v3BlockLite(spec,pitch){
  return v3Keep('blocklite|'+spec.name+'|'+pitch.toFixed(3),function(){var w=pitch*10-0.12,h=spec.t*10,geo=new THREE.BoxBufferGeometry(w,h,w),uv=geo.attributes.uv,nr=geo.attributes.normal;
    for(var i=0;i<uv.count;i++){var cap=Math.abs(nr.getY(i))>0.9,u=uv.getX(i),v=uv.getY(i);uv.setXY(i,cap?0.5+u*0.5:u*0.5,cap?v*0.5:v);}
    uv.needsUpdate=true;geo.clearGroups();geo.addGroup(0,Infinity,0);
    var src=v3Stack(spec,10).mats[0].map.image,S=512,H=S/2,c=document.createElement('canvas');c.width=c.height=S;var g=c.getContext('2d');
    g.drawImage(src,0,0,H,S,0,0,H,S);g.fillStyle='rgba(0,0,0,.3)';for(var k=1;k<10;k++)g.fillRect(Math.round(k*H/10),0,2,S);   // the edges, ten stacks to a side
    g.drawImage(src,H,0,H,H,H,0,H,H);g.drawImage(src,H,0,H,H,H,H,H,H);   // the shadow between the stacks
    var cell=H/10;for(var r=0;r<10;r++)for(var q=0;q<10;q++)g.drawImage(src,H,H,H,H,H+q*cell+0.6,H+r*cell+0.6,cell-1.2,cell-1.2);
    var t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;return {geo:geo,mats:[v3Shade({map:t})]};});
}
function v3Block(spec,pitch){
  /* a finished block of 1,000: the hundred stacks of ten, each its own closed stack (owner, 4 Nov: "Each stack must be its own solid
     model once stacked, not the grid as a whole"), merged into one shape so a block still draws as one batch */
  return v3Keep('block3|'+spec.name+'|'+pitch.toFixed(3),function(){var P=[],N=[],U=[],st=[];
    for(var rw=0;rw<10;rw++)for(var cl=0;cl<10;cl++){v3CoinPart(spec,10,(cl-4.5)*pitch,(rw-4.5)*pitch,true,P,N,U);st.push([(cl-4.5)*pitch,(rw-4.5)*pitch]);}
    var g=v3CoinGeo(P,N,U);g.userData.stacks=st;return {geo:g,mats:[v3Shade({map:v3StackTex(spec,10)})]};});
}
// a label that always faces the camera
/* the gold tag from Net worth in 3D (owner, 31 Oct: "flag post labels in gold, the same as the dashboard"): what it is in small capitals,
   the value large, a detail line, on a thin gold post planted in the floor. Returns a group; .tag is the sprite. */
/* v0.9.1 E12 / Q6: the flag can carry a glyph, drawn here on the canvas. A bank's real logo is an image from an
   outside host, which would taint the WebGL texture, so the flag wears the brand bank mark and the account row keeps
   the real logo. */
function v3Glyph(g,kind,x,y,s){g.save();g.translate(x,y);g.scale(s/24,s/24);g.strokeStyle='#1A1400';g.fillStyle='#1A1400';g.lineWidth=1.8;g.lineJoin='round';g.lineCap='round';
  if(kind==='wallet'){g.beginPath();if(g.roundRect)g.roundRect(2,6,20,13,2.5);else g.rect(2,6,20,13);g.stroke();g.beginPath();g.moveTo(2,10);g.lineTo(16,10);g.lineTo(16,6);g.stroke();g.beginPath();g.arc(17,12.5,1.6,0,Math.PI*2);g.fill();}
  else if(kind==='vault'){g.beginPath();g.arc(12,12,9,0,Math.PI*2);g.stroke();g.beginPath();g.arc(12,12,3.4,0,Math.PI*2);g.stroke();[0,1,2,3].forEach(function(i){var a=i*Math.PI/2+Math.PI/4;g.beginPath();g.moveTo(12+Math.cos(a)*4.4,12+Math.sin(a)*4.4);g.lineTo(12+Math.cos(a)*8,12+Math.sin(a)*8);g.stroke();});}
  else{g.beginPath();g.moveTo(2,9);g.lineTo(12,4);g.lineTo(22,9);g.closePath();g.stroke();[5.5,9.8,14.2,18.5].forEach(function(cx){g.beginPath();g.moveTo(cx,10);g.lineTo(cx,17);g.stroke();});g.beginPath();g.moveTo(2.5,19.5);g.lineTo(21.5,19.5);g.stroke();}
  g.restore();}
function v3Label(l1,l2,l3,scale,glyph){   // owner, 3 Nov: smaller flags. Two lines: the name, then the amount with the rate beside it; sized on screen by labelFloor
  var F1=36,F2=46,FONT='px "Share Tech Mono", monospace',c=document.createElement('canvas'),g=c.getContext('2d'),tx=glyph?70:24,s1=String(l1).toUpperCase(),s3=l3?'  '+l3:'';
  g.font=F1+FONT;var w1=tx+g.measureText(s1).width,w3=s3?g.measureText(s3).width:0;g.font=F2+FONT;var w2=24+g.measureText(l2).width;
  c.width=Math.max(160,Math.min(1024,Math.ceil(Math.max(w1,w2+w3)+24)));c.height=124;
  var w=c.width-16,h=c.height-16;g.shadowColor='rgba(232,197,106,.55)';g.shadowBlur=8;g.fillStyle='#E8C56A';g.beginPath();if(g.roundRect)g.roundRect(8,8,w,h,12);else g.rect(8,8,w,h);g.fill();g.shadowBlur=0;
  if(glyph)v3Glyph(g,glyph,24,18,36);
  g.fillStyle='#1A1400';g.textAlign='left';g.textBaseline='alphabetic';g.font=F1+FONT;g.fillText(s1,tx,50);
  g.font=F2+FONT;g.fillText(l2,24,104);if(s3){g.globalAlpha=.78;g.font=F1+FONT;g.fillText(s3,w2,104);g.globalAlpha=1;}
  var t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;var sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:false,transparent:true,fog:false,toneMapped:false}));sp.renderOrder=10;var k=scale||10;sp.scale.set(k*c.width/512,k*c.height/512,1);
  var grp=new THREE.Group();grp.add(sp);grp.tag=sp;grp.userData.v3Tag=[l1,l2,l3||''];grp.userData.v3Font={f:[F1,F2,s3?F1:0],h:c.height};return grp;}
/* plant the tag: its foot at (x,0,z), the tag's lower edge at height y. With a points array (one plate per account,
   E12) the posts are collected and drawn as one set of lines, so a dozen flags still cost one draw. */
function v3Plant(grp,x,y,z,pts){var sp=grp.tag,hy=sp.scale.y/2;sp.position.set(0,y+hy,0);grp.position.set(x,0,z);
  if(pts){grp.userData.v3PostI=pts.length+1;pts.push(new THREE.Vector3(x,0,z),new THREE.Vector3(x,y+hy*0.2,z));return grp;}
  var post=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0),new THREE.Vector3(0,y+hy*0.2,0)]),new THREE.LineBasicMaterial({color:0xE8C56A,transparent:true,opacity:.95,depthTest:false,fog:false,toneMapped:false}));post.renderOrder=9;grp.add(post);
  var dot=new THREE.Mesh(new THREE.CircleBufferGeometry(Math.max(0.25,sp.scale.x*0.018),16),new THREE.MeshBasicMaterial({color:0xE8C56A,depthTest:false,fog:false,toneMapped:false}));dot.rotation.x=-Math.PI/2;dot.position.y=0.03;dot.renderOrder=9;grp.add(dot);return grp;}
function v3Posts(pts){var l=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xE8C56A,transparent:true,opacity:.95,depthTest:false,fog:false,toneMapped:false}));l.renderOrder=9;l.userData.v3Posts=1;return l;}
function v3Host(sceneEl,svgId){
  var svg=document.getElementById(svgId);if(!sceneEl)return null;
  var h=sceneEl.querySelector('.v3-host');if(!h){h=document.createElement('div');h.className='v3-host v3-wait';h._v3svg=svgId;sceneEl.insertBefore(h,sceneEl.firstChild);}
  if(svg&&h._v3drawn)svg.style.display='none';sceneEl.classList.add('v3-on');return h;   // R16: like the house builder, the flat picture stays until the first 3D frame (v3Shown)
}
function v3Shown(h){h.classList.remove('v3-wait');h._v3drawn=1;var sv=h._v3svg&&document.getElementById(h._v3svg);if(sv)sv.style.display='none';}
function v3Waiting(sel){var h=document.querySelector(sel+' .v3-host');return !!(h&&!h._v3drawn);}
/* the cash and metals content as a ready group, keyed by the data it shows: built at the tap, or ahead of it in the idle warm-up (CI, 2 Nov:
   the metals open ran 117 to 175 ms of our own JavaScript on the slower runner; now the tap attaches a built group and frames it) */
function v3Narrow(){try{return (window.innerWidth||1000)<700;}catch(e){return false;}}   // on a phone the flags are drawn larger, or the amounts are too small to read. Part of the key, so a scene built for the other size is rebuilt.
function v3CashAccts(){var a=(typeof alState!=='undefined'&&alState.cashAccounts)||[];return a.map(function(x){return [x.id,x.name,x.type,x.balance,(x.rate==null||!isFinite(x.rate))?null:+x.rate];});}
function v3CashKey(){var cur=(window.VI_CURRENCY||(typeof viSettings!=='undefined'&&viSettings.currency)||'GBP').toUpperCase(),spec=V3_COINS[cur]||V3_COINS.GBP,units=Math.max(0,Math.floor(alTotalCash()*(window.VI_CURRENCY_RATE||1)));
  var phys=0;try{phys=alTotalPhysical();}catch(e){}
  return {cur:cur,spec:spec,units:units,key:cur+'|'+units+'|'+(window.VI_CURRENCY_SYMBOL||'£')+'|'+JSON.stringify(v3CashAccts())+'|'+phys.toFixed(2)+'|'+(v3Narrow()?'n':'w')};}
function v3MetalsKey(){return JSON.stringify([alState.metals,alState.metalPrices,window.VI_CURRENCY_RATE||1,window.VI_CURRENCY_SYMBOL||'£']);}
function v3Pre(name,key){var p=V3._pre&&V3._pre[name];if(p&&p.key===key){V3._pre[name]=null;return p;}return null;}
/* v0.9.1 E12 (owner, 3 Nov: "as the user puts in their bank type, and current account ... that amount should be in a
   separate box ... a separate gold tile on the ground plane. With the icon of the bank and the separate value"):
   every cash account stands on its own gold-edged plate with its own flag post, carrying the bank mark, the balance
   and the account's rate when it has one (Q6). Money kept at home is its own plate with a wallet mark. The plates
   wrap into rows and the total flag stays. All the plate tiles are one draw and all the posts another.
   E13: once a block of 1,000 coins is finished it is drawn as one shape (the owner's "treated as one shape"), so
   only the part-finished block is still made of single stacks. */
function v3CashPlates(units){
  var list=[],rate=window.VI_CURRENCY_RATE||1;
  ((typeof alState!=='undefined'&&alState.cashAccounts)||[]).forEach(function(a){
    list.push({id:a.id,name:String(a.name||'Account'),type:a.type||'',rate:(a.rate==null||!isFinite(a.rate))?null:+a.rate,kind:'account',glyph:'bank',raw:Math.max(0,(+a.balance||0)*rate)});});
  var phys=0;try{phys=Math.max(0,alTotalPhysical()*rate);}catch(e){}
  if(phys>0)list.push({id:'physical',name:'Physical cash',type:'Notes and coins',rate:null,kind:'physical',glyph:'wallet',raw:phys});
  var tot=Math.max(0,Math.floor(units)),sum=0;
  list.forEach(function(p){p.units=Math.floor(p.raw);sum+=p.units;});
  var extra=tot-sum;   // the coins the rounding dropped go to the biggest fractions first, so the plates always add up to the total
  if(extra>0)list.slice().sort(function(a,b){return (b.raw-b.units)-(a.raw-a.units);}).slice(0,extra).forEach(function(p){p.units++;});
  /* an account in the red stands on an empty plate and still counts against the total, so the plate amounts stay
     each account's own balance and the total flag keeps showing the cash the rest of the app shows. */
  return list;
}
function v3CashPlate(spec,n,lite){   // one plate's coins; finished blocks of 1,000 as one shape each, the rest as stacks
  var G=new THREE.Group(),STACK=10,PER_BLOCK=1000,pitch=spec.d+0.12,blockW=pitch*10,gap=spec.d*2.2,m4=new THREE.Matrix4();
  var blocks=Math.max(1,Math.ceil(n/PER_BLOCK)),cols=Math.max(1,Math.ceil(Math.sqrt(blocks)));
  var pos=function(i){var b=Math.floor(i/100),s=i%100;return [(b%cols)*(blockW+gap)+(s%10)*pitch,Math.floor(b/cols)*(blockW+gap)+Math.floor(s/10)*pitch];};
  var fullStacks=Math.floor(n/STACK),rest=n%STACK,merged=Math.floor(fullStacks/100),loose=fullStacks-merged*100;
  if(merged){var bk=lite?v3BlockLite(spec,pitch):v3Block(spec,pitch);
    var bi=new THREE.InstancedMesh(bk.geo,bk.mats[0],merged);
    for(var j=0;j<merged;j++){var q=pos(j*100);m4.makeTranslation(q[0]+blockW/2-pitch/2,spec.t*STACK/2,q[1]+blockW/2-pitch/2);bi.setMatrixAt(j,m4);}
    bi.userData.v3Full=merged;bi.userData.v3Intro=true;if(bk.geo.userData.stacks)bi.userData.v3Stacks=bk.geo.userData.stacks;G.add(bi);}
  if(loose>0){var st=v3Stack(spec,STACK),im=new THREE.InstancedMesh(st.geo,st.mats[0],loose);
    for(var i=0;i<loose;i++){var pp=pos(merged*100+i);m4.makeTranslation(pp[0],spec.t*STACK/2,pp[1]);im.setMatrixAt(i,m4);}
    im.userData.v3Full=loose;im.userData.v3Intro=true;G.add(im);}
  if(rest>0){var ps=v3Stack(spec,rest),pm=new THREE.Mesh(ps.geo,ps.mats[0]),rp=pos(fullStacks);pm.position.set(rp[0],spec.t*rest/2,rp[1]);pm.userData.v3Intro=true;G.add(pm);}
  G.userData.v3Lay={n:n,plan:function(seen){return v3CoinPlan(G,spec,n,seen,pos,{bi:bi,im:im,pm:pm,merged:merged,loose:loose});}};   // R16: the plate's newest row lays coin by coin (id: the plate's, set by v3CashContent)
  var usedBlocks=Math.max(1,Math.ceil(n/PER_BLOCK)),wc=Math.min(cols,usedBlocks),rows=Math.ceil(usedBlocks/cols),w,d;
  if(n<PER_BLOCK){var sN=Math.max(1,fullStacks+(rest?1:0));w=Math.min(10,sN)*pitch;d=Math.ceil(sN/10)*pitch;}
  else{w=wc*blockW+(wc-1)*gap;d=rows*blockW+(rows-1)*gap;}
  return {grp:G,w:Math.max(w,spec.d*3),d:Math.max(d,spec.d*3),stacks:fullStacks,rest:rest,merged:merged};
}
function v3CashContent(spec,units,cur){var G=new THREE.Group(),PER_BLOCK=1000;
  var sym=window.VI_CURRENCY_SYMBOL||'£',fmt=function(n){return Math.round(n).toLocaleString('en-GB');};
  var plates=v3CashPlates(units),lite=plates.reduce(function(s,p){return s+Math.floor(p.units/1000);},0)>v3RealBlocks(spec),built=plates.map(function(p){return v3CashPlate(spec,p.units,lite);});
  var m=spec.d*3,pad=spec.d*6,area=built.reduce(function(s,b){return s+(b.w+pad)*(b.d+pad);},0);
  var target=Math.max(Math.max.apply(null,built.map(function(b){return b.w;}).concat([0])),Math.sqrt(area)*1.2);
  var x=0,z=0,rowD=0,rows=1,X0=1e9,X1=-1e9,Z0=1e9,Z1=-1e9;
  built.forEach(function(b,i){
    if(x>0&&x+b.w>target){x=0;z+=rowD+pad;rowD=0;rows++;}
    b.grp.position.set(x,0,z);b.grp.userData.v3Lay.id=String(plates[i].id);G.add(b.grp);
    var r=plates[i].rect=[x-m,z-m,b.w+2*m,b.d+2*m];
    X0=Math.min(X0,r[0]);X1=Math.max(X1,r[0]+r[2]);Z0=Math.min(Z0,r[1]);Z1=Math.max(Z1,r[1]+r[3]);
    x+=b.w+pad;rowD=Math.max(rowD,b.d);
  });
  if(plates.length){   // the gold tiles: one batch for the surfaces, one for all the edges
    var tile=v3Keep('plate-tile',function(){var g=new THREE.PlaneBufferGeometry(1,1);g.rotateX(-Math.PI/2);return {geo:g,mats:[]};});
    var tmat=new THREE.MeshBasicMaterial({color:0x0d2e31,transparent:true,opacity:.96,depthWrite:false,toneMapped:false,fog:false});
    var ti=new THREE.InstancedMesh(tile.geo,tmat,plates.length),mm=new THREE.Matrix4(),ep=[];
    plates.forEach(function(p,i){var r=p.rect;mm.makeScale(r[2],1,r[3]);mm.setPosition(r[0]+r[2]/2,0.014,r[1]+r[3]/2);ti.setMatrixAt(i,mm);
      var x0=r[0],x1=r[0]+r[2],z0=r[1],z1=r[1]+r[3],y=0.022;
      [[x0,z0,x1,z0],[x1,z0,x1,z1],[x1,z1,x0,z1],[x0,z1,x0,z0]].forEach(function(sg){ep.push(new THREE.Vector3(sg[0],y,sg[1]),new THREE.Vector3(sg[2],y,sg[3]));});});
    G.add(ti);
    G.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ep),new THREE.LineBasicMaterial({color:0xE8C56A,toneMapped:false,fog:false})));
  }
  var stackH=spec.t*10,chips=plates.map(function(p){return {id:p.id,name:p.name.length>24?p.name.slice(0,23)+'…':p.name,kind:p.kind,rate:p.rate,amount:sym+fmt(p.units),
      base:[p.rect[0]+p.rect[2]/2,p.units>0?stackH:0.03,p.rect[1]+p.rect[3]/2]};});   // each post stands on its plate's coins
  var plateSum=plates.reduce(function(s,p){return s+p.units;},0),total=Math.max(0,Math.floor(units)),fullBlocks=Math.floor(total/PER_BLOCK),part=total%PER_BLOCK;
  var stacks=built.reduce(function(s,b){return s+b.stacks;},0),restN=built.reduce(function(s,b){return s+b.rest;},0);
  return {key:v3CashKey().key,grp:G,chips:chips,total:total>0?{label:'Total cash · '+spec.name+' coins',amount:sym+fmt(total)}:null,stats:{units:total,plateSum:plateSum,cur:cur,coin:spec.name,fullStacks:stacks,rest:restN,fullBlocks:fullBlocks,stackHeight:stackH,
    plates:plates.map(function(p){return {id:p.id,name:p.name,type:p.type,rate:p.rate,units:p.units,kind:p.kind,glyph:p.glyph};}),plateRows:rows}};
}
/* the chips' colour: the bank's own brand colour (STK_PLATFORMS), lifted toward white until it reads at 4.5:1 on the chip's
   near-black, so a navy brand still shows; the brand gold for physical cash and an account that is not a known bank */
function v3Ink(hex){var c=String(hex||'').replace('#','');if(c.length===3)c=c.split('').map(function(x){return x+x;}).join('');if(!/^[0-9a-f]{6}$/i.test(c))c='E8C56A';
  var rgb=[0,2,4].map(function(i){return parseInt(c.substr(i,2),16);}),lum=function(a){var l=a.map(function(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});return .2126*l[0]+.7152*l[1]+.0722*l[2];},bg=lum([8,8,8]);
  for(var t=0;t<=1.0001;t+=0.04){var m=rgb.map(function(v){return Math.round(v+(255-v)*t);});if((lum(m)+.05)/(bg+.05)>=4.5)return '#'+m.map(function(v){return ('0'+v.toString(16)).slice(-2);}).join('');}
  return '#ffffff';}
function v3ChipBrand(p){
  if(p.kind==='physical')return {c:'#E8C56A',logo:'<span class="cash-logo cash-logo-none"><svg class="vi-ic" aria-hidden="true"><use href="#vi-cash"/></svg></span>'};
  var m=typeof stkPlatformMatch==='function'?stkPlatformMatch(p.name):null;
  var ink=v3Ink(m?m.c:'#E8C56A'),logo=typeof viBankLogo==='function'?viBankLogo(p.name):'';
  /* Pedro, 4 Nov: the list's two-letter fallback overflows the chip's 14 px box, so in the chip it is one letter in the brand ink */
  if(m)logo=logo.replace(/<span class="stk-mono"[^>]*>[^<]*<\/span>/,'<span class="stk-mono v3-mono" style="color:'+ink+'">'+v3ChipEsc(String(m.n||'?').trim().charAt(0).toUpperCase())+'</span>');
  return {c:ink,logo:logo};}
function v3ChipEsc(t){return String(t==null?'':t).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
/* the chips for one built scene: one per plate and the total as a gold corner tag, like Budget's Monthly income. The posts are
   drawn on a canvas under the chips. Every coin's top corners are kept in world space, so a chip is never placed over coins. */
function v3ChipsSet(V,chips,total){
  var L=V._chipL;if(!L||L.parentNode!==V.host){L=document.createElement('div');L.className='v3-chips';var pc=document.createElement('canvas');pc.className='v3-posts';pc.setAttribute('aria-hidden','true');L.appendChild(pc);V.host.appendChild(L);V._chipL=L;}
  Array.prototype.slice.call(L.querySelectorAll('.v3-chip,.v3-total')).forEach(function(e){e.remove();});
  V._chips=(chips||[]).map(function(ch){var b=v3ChipBrand(ch),el=document.createElement('div');el.className='v3-chip';el.style.setProperty('--bc',b.c);el.dataset.id=ch.id;
    el.innerHTML=b.logo+'<span class="v3-chip-n">'+v3ChipEsc(ch.name)+'</span><span class="v3-chip-s">·</span><span class="v3-chip-a">'+v3ChipEsc(ch.amount)+'</span>'+(ch.rate!=null?'<span class="v3-chip-r">'+v3ChipEsc(ch.rate)+'% AER</span>':'');
    L.appendChild(el);return {d:ch,el:el,col:b.c,w:0,h:0,r:null};});
  V._total=null;if(total){var t=document.createElement('div');t.className='v3-total';t.innerHTML='<span class="v3-total-l">'+v3ChipEsc(total.label)+'</span><span class="v3-total-a">'+v3ChipEsc(total.amount)+'</span>';L.appendChild(t);V._total=t;}
  var pts=[],m=new THREE.Matrix4(),q=new THREE.Vector3();V.root.updateMatrixWorld(true);
  V.root.traverse(function(o){if(!o.userData||!o.userData.v3Intro)return;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();var bb=o.geometry.boundingBox,n=o.isInstancedMesh?(o.userData.v3Full||o.count):1;
    for(var i=0;i<n;i++){if(o.isInstancedMesh)o.getMatrixAt(i,m);else m.identity();
      [bb.max.y,bb.min.y].forEach(function(y){[[bb.min.x,bb.min.z],[bb.max.x,bb.min.z],[bb.max.x,bb.max.z],[bb.min.x,bb.max.z]].forEach(function(c){q.set(c[0],y,c[1]).applyMatrix4(m).applyMatrix4(o.matrixWorld);pts.push(q.x,q.y,q.z);});});}});   // each stack or block as its eight corners: on screen, their outline is the shape a chip must not touch
  V._coinW=pts;V._chipSig=null;V.onDraw=function(){v3ChipsPlace(V);};V.kick(300);}
/* place the chips on screen, nearest post first: a chip hangs right of its post (or left), rising a step at a time until it is
   clear of the coins, the other chips, the total tag, the stage's edges and the zoom buttons (56 px on the right). Hidden while
   the coins are still arriving. */
function v3ChipsPlace(V){
  var L=V._chipL,C=V._chips;if(!L||!C)return;
  var W=V.host.clientWidth,H=V.host.clientHeight;if(!W||!H)return;
  var on=!V._introRun&&!V._introWait;L.classList.toggle('on',on);
  V.cam.updateMatrixWorld();var sig=on+'|'+W+'|'+H+'|'+Array.prototype.map.call(V.cam.matrixWorld.elements,function(x){return x.toFixed(4);}).join(',');if(sig===V._chipSig)return;V._chipSig=sig;   // re-placed whenever the camera moves (a drag, a zoom), not on still frames
  var cv=L.firstChild,dpr=Math.min(2,window.devicePixelRatio||1);
  if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);cv.style.width=W+'px';cv.style.height=H+'px';}
  var g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);if(!on)return;
  V.cam.updateMatrixWorld();var v=new THREE.Vector3(),px=function(x,y,z){v.set(x,y,z).project(V.cam);return [(v.x+1)/2*W,(1-v.y)/2*H,v.z];};
  var cp=[],P=V._coinW||[];for(var i=0;i<P.length;i+=3)cp.push(px(P[i],P[i+1],P[i+2]));
  var hulls=[];for(var hi=0;hi+8<=cp.length;hi+=8)hulls.push(v3Hull(cp.slice(hi,hi+8)));   // Pedro, 4 Nov: a chip could cross a block between its sample points
  var placed=[],RM=56,POST=22;
  if(V._total)placed.push({x:V._total.offsetLeft-4,y:V._total.offsetTop-4,w:V._total.offsetWidth+8,h:V._total.offsetHeight+8});
  var clash=function(r,free){if(r.x<4||r.y<4||r.x+r.w>W-RM||r.y+r.h>H-4)return true;
    for(var j=0;j<placed.length;j++){var b=placed[j];if(r.x<b.x+b.w+3&&b.x<r.x+r.w+3&&r.y<b.y+b.h+2&&b.y<r.y+r.h+2)return true;}
    if(free)return false;for(var k=0;k<hulls.length;k++)if(v3HullHit(hulls[k],r.x-2,r.y-2,r.x+r.w+2,r.y+r.h+2))return true;return false;};
  C.map(function(c){if(!c.w){c.w=c.el.offsetWidth;c.h=c.el.offsetHeight;}return {c:c,b:px(c.d.base[0],c.d.base[1],c.d.base[2])};})
   .sort(function(a,b){return b.b[1]-a.b[1];})
   .forEach(function(it){var c=it.c,b=it.b,best=null;
    if(b[2]>1){c.el.style.visibility='hidden';c.r=null;return;}c.el.style.visibility='';
    for(var pass=0;pass<2&&!best;pass++)for(var k=0;k<40&&!best;k++)for(var sd=0;sd<3&&!best;sd++){var up=k<16,dy=up?b[1]-POST-k*(c.h+3):b[1]+POST+c.h+(k-16)*(c.h+3),rx=sd===2?Math.max(4,Math.min(W-RM-c.w,b[0]-c.w/2)):sd?b[0]-c.w:b[0],r={x:rx,y:dy-c.h,w:c.w,h:c.h,dot:[Math.max(rx,Math.min(rx+c.w,b[0])),up?dy:dy-c.h]};if(!clash(r,pass))best=r;}   // above the post first, then below it (Pedro, 4 Nov: the last chip had no room left above); zoomed right in, the coins fill the stage: then a chip may sit over coins, never over another chip or the total
    if(!best){var y0=Math.max(4,b[1]-POST-c.h),x0=Math.max(4,Math.min(W-RM-c.w,b[0]));best={x:x0,y:y0,w:c.w,h:c.h,dot:[Math.max(x0,Math.min(x0+c.w,b[0])),y0+c.h]};}   // no room at all: the nearest spot inside the stage
    placed.push(best);c.r=best;c.el.style.transform='translate('+Math.round(best.x)+'px,'+Math.round(best.y)+'px)';
    g.strokeStyle=c.col;g.fillStyle=c.col;g.globalAlpha=.9;g.lineWidth=1;g.beginPath();g.moveTo(b[0],b[1]);g.lineTo(best.dot[0],best.dot[1]);g.stroke();
    g.beginPath();g.arc(b[0],b[1],2,0,Math.PI*2);g.fill();g.beginPath();g.arc(best.dot[0],best.dot[1],1.5,0,Math.PI*2);g.fill();g.globalAlpha=1;});}
/* a convex outline of screen points (monotone chain), and whether a box touches it */
function v3Hull(P){P=P.slice().sort(function(a,b){return a[0]-b[0]||a[1]-b[1];});var cr=function(o,a,b){return (a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);},lo=[],up=[];
  P.forEach(function(p){while(lo.length>1&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p);});
  for(var i=P.length-1;i>=0;i--){var p=P[i];while(up.length>1&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p);}
  lo.pop();up.pop();var h=lo.concat(up),b=[1e9,1e9,-1e9,-1e9];h.forEach(function(p){b[0]=Math.min(b[0],p[0]);b[1]=Math.min(b[1],p[1]);b[2]=Math.max(b[2],p[0]);b[3]=Math.max(b[3],p[1]);});h.box=b;return h;}
function v3HullHit(h,x0,y0,x1,y1){var b=h.box;if(!h.length||b[2]<x0||b[0]>x1||b[3]<y0||b[1]>y1)return false;
  var ax=[[1,0],[0,1]];for(var i=0;i<h.length;i++){var a=h[i],c=h[(i+1)%h.length];ax.push([c[1]-a[1],a[0]-c[0]]);}   // separating axes: the box's two and each edge's normal
  var bx=[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
  for(var k=0;k<ax.length;k++){var n=ax[k],p0=1e18,p1=-1e18,q0=1e18,q1=-1e18;h.forEach(function(p){var d=p[0]*n[0]+p[1]*n[1];p0=Math.min(p0,d);p1=Math.max(p1,d);});bx.forEach(function(p){var d=p[0]*n[0]+p[1]*n[1];q0=Math.min(q0,d);q1=Math.max(q1,d);});if(p1<q0||q1<p0)return false;}
  return true;}
/* what the chips show and where they sit, for the tests */
V3Scene.prototype.chipInfo=function(){var hr=this.host.getBoundingClientRect();return {total:this._total?{text:this._total.textContent,x0:this._total.offsetLeft,y0:this._total.offsetTop,x1:this._total.offsetLeft+this._total.offsetWidth,y1:this._total.offsetTop+this._total.offsetHeight}:null,W:this.host.clientWidth,H:this.host.clientHeight,on:!!(this._chipL&&this._chipL.classList.contains('on')),
  chips:(this._chips||[]).map(function(c){var cs=getComputedStyle(c.el),a=c.el.querySelector('.v3-chip-a'),n=c.el.querySelector('.v3-chip-n'),img=c.el.querySelector('img');
    return {id:c.d.id,name:n?n.textContent:'',amount:a?a.textContent:'',rate:c.d.rate,color:c.col,stroke:cs.borderTopColor,bg:cs.backgroundColor,amtColor:a?getComputedStyle(a).color:'',nameColor:n?getComputedStyle(n).color:'',
      fonts:[n?parseFloat(getComputedStyle(n).fontSize):0,a?parseFloat(getComputedStyle(a).fontSize):0],logo:img?img.getAttribute('src'):(c.el.querySelector('use')?'icon':''),r:c.r?{x0:c.r.x,y0:c.r.y,x1:c.r.x+c.r.w,y1:c.r.y+c.r.h}:null};}),
  coins:(function(V){var W=V.host.clientWidth,H=V.host.clientHeight,v=new THREE.Vector3(),o=[],P=V._coinW||[];for(var i=0;i<P.length;i+=3){v.set(P[i],P[i+1],P[i+2]).project(V.cam);o.push([(v.x+1)/2*W,(1-v.y)/2*H]);}return o;})(this)};};
/* v0.9.1: the hook the cash accounts chunk calls when money moves (E16). The next build of the scene plays the
   coins landing (or lifting, when money came out); with 3D off it does nothing. Safe to call before the stage exists. */
function v3CashLand(delta,accountId){
  V3._land={delta:+delta||0,id:accountId==null?null:accountId,at:Date.now()};
  if(V3.cash){V3.cash._introPlayed=false;V3.cash._introTag=null;}
  return true;
}
function v3Cash(){
  if(!v3Ok()||(V3._flat&&V3._flat.cash))return false;
  var card=document.getElementById('cashSceneCard'),scene=card&&card.querySelector('.scene');if(!scene)return false;
  v3Host(scene,'cashSvg');v3After('cash',v3CashNow,function(){var sv=document.getElementById('cashSvg');if(sv)sv.style.display='';renderCashISO();});return true;
}
function v3CashNow(){
  if(!v3Ok())return false;
  var card=document.getElementById('cashSceneCard'),scene=card&&card.querySelector('.scene');if(!scene)return false;
  var host=v3Host(scene,'cashSvg');if(!host.clientWidth)return true;   // tab hidden: drawn when shown
  var V=V3.cash||(V3.cash=new V3Scene(host,'3D view of your cash as coins'));
  var K=v3CashKey(),cur=K.cur,spec=K.spec,units=K.units,key=K.key;if(V._key===key&&V.root.children.length){var c0=document.getElementById('cashCap');if(c0&&V._cap)c0.textContent=V._cap;V.kick(300);return true;}   // v0.9.2: the same balance again: the 3D caption goes back too (the flat drawing may have written its own meanwhile)   // the same balance again (the tab and its sub-tab both ask on one tap): redraw, do not rebuild
  V.clear();V._key=key;
  var C=v3Pre('cash',key)||v3CashContent(spec,units,cur);V.root.add(C.grp);V.stats=C.stats;   // built in the idle warm-up when the balance has not changed since
  var PER_BLOCK=1000,sym=window.VI_CURRENCY_SYMBOL||'£',fmt=function(n){return n.toLocaleString('en-GB');};
  var kc=V3._cashUnits===units&&V3._cashCur===cur;V.frame(kc);V3._cashUnits=units;V3._cashCur=cur;v3ChipsSet(V,C.chips,C.total);
  V.introArm('cash|'+key,V3._cashZone||null,V3._cashSilent);V3._cashZone=null;V3._cashSilent=false;   // E14: the coins lay themselves out when the scene is first seen, and again when the balance changes
  var st=V.stats,plates=(st&&st.plates)||[],laid=(st?st.fullStacks:0)+(st&&st.rest?1:0);
  var cap=document.getElementById('cashCap');V._cap=units?sym+fmt(st.units)+' laid · '+plates.length+' plate'+(plates.length===1?'':'s')+' · '+Math.floor(st.units/PER_BLOCK)+' block'+(Math.floor(st.units/PER_BLOCK)===1?'':'s')+' of 1,000'+(st.units%PER_BLOCK?' + '+fmt(st.units%PER_BLOCK):'')+' · '+spec.name+' coins, '+(+(spec.d*10).toFixed(2))+' mm':'No cash yet. Add an account or some physical cash.';if(cap)cap.textContent=V._cap;
  return true;
}
// a cast-style bar: bevelled block with the weight and fineness stamped on top
function v3Bar(w,d,h,metal,fmt){return v3Keep('bar|'+w+'|'+d+'|'+h.toFixed(4)+'|'+metal.label+'|'+fmt,function(){return v3BarMake(w,d,h,metal,fmt);});}
function v3BarMake(w,d,h,metal,fmt){
  var shape=new THREE.Shape(),bw=w/2,bd=d/2,rr=Math.min(w,d)*0.08;
  shape.moveTo(-bw+rr,-bd);shape.lineTo(bw-rr,-bd);shape.quadraticCurveTo(bw,-bd,bw,-bd+rr);shape.lineTo(bw,bd-rr);shape.quadraticCurveTo(bw,bd,bw-rr,bd);shape.lineTo(-bw+rr,bd);shape.quadraticCurveTo(-bw,bd,-bw,bd-rr);shape.lineTo(-bw,-bd+rr);shape.quadraticCurveTo(-bw,-bd,-bw+rr,-bd);
  var bev=Math.min(h*0.3,0.12),geo=new THREE.ExtrudeBufferGeometry(shape,{depth:Math.max(0.02,h-bev*2),bevelEnabled:true,bevelThickness:bev,bevelSize:bev*0.8,bevelSegments:2,curveSegments:4});
  geo.rotateX(-Math.PI/2);geo.translate(0,bev,0);
  var c=document.createElement('canvas');c.width=256;c.height=Math.round(256*d/w);var g=c.getContext('2d');g.fillStyle=metal.col;g.fillRect(0,0,c.width,c.height);
  g.strokeStyle='rgba(0,0,0,.28)';g.lineWidth=4;g.strokeRect(14,14,c.width-28,c.height-28);g.fillStyle='rgba(50,36,8,.5)';g.textAlign='center';g.textBaseline='middle';
  var fs=Math.max(14,Math.round(c.height*0.2));g.font='700 '+fs+'px "Share Tech Mono", monospace';g.fillText(metal.label.toUpperCase(),128,c.height*0.33);g.fillText(fmt,128,c.height*0.55);g.font=Math.round(fs*0.8)+'px "Share Tech Mono", monospace';g.fillText('999.9',128,c.height*0.76);
  /* v0.9.1 E21 (owner: the same work as the coins, for the metals viewport): the stamped top and the plain sides
     share one texture, so a batch of bars is one draw instead of two. The top is drawn into the lower right quarter
     and the sides read one point of the flat left half. */
  var at=document.createElement('canvas');at.width=at.height=256;var ag=at.getContext('2d');
  ag.fillStyle=metal.col;ag.fillRect(0,0,256,256);
  ag.drawImage(c,128,128,128,128);
  var tx=new THREE.CanvasTexture(at);tx.encoding=THREE.sRGBEncoding;
  var uv=geo.attributes.uv,nr=geo.attributes.normal;
  for(var i=0;i<uv.count;i++){
    if(Math.abs(nr.getY(i))>0.9){var u=Math.max(0,Math.min(1,uv.getX(i)/w+0.5)),v=Math.max(0,Math.min(1,uv.getY(i)/d+0.5));uv.setXY(i,0.5+u*0.5,v*0.5);}
    else uv.setXY(i,0.25,0.5);
  }
  uv.needsUpdate=true;geo.clearGroups();geo.addGroup(0,Infinity,0);
  return {geo:geo,mats:[v3Shade({map:tx})]};
}
function v3MetalsContent(key){
  var G=new THREE.Group(),stats={},sym=window.VI_CURRENCY_SYMBOL||'£',rate=window.VI_CURRENCY_RATE||1,x0=0,parts=[],m4=new THREE.Matrix4();
  ['gold','silver','platinum','palladium'].forEach(function(k){
    var oz=+(alState.metals[k]||0);if(!(oz>0))return;var M=V3_METALS[k],grams=oz*OZ_G,left=grams,zone=new THREE.Group(),z=0,zw=0;
    V3_BARS.forEach(function(B,bi){
      var n=Math.floor((left+1e-6)/B.g);left-=n*B.g;
      var isLast=bi===V3_BARS.length-1,frac=isLast&&left>0.05?left/B.g:0;if(!n&&!frac)return;
      zone.userData.bars=zone.userData.bars||{};zone.userData.bars[B.name]={n:n,h:+((B.g/M.rho)/(B.w*B.d)).toFixed(3)};if(frac)zone.userData.bars.rest_g=+left.toFixed(2);
      var h=(B.g/M.rho)/(B.w*B.d);
      if(n){var bar=v3Bar(B.w,B.d,h,M,B.name),im=new THREE.InstancedMesh(bar.geo,bar.mats[0],n);im.castShadow=im.receiveShadow=true;
        var perRow=Math.max(1,Math.min(10,Math.ceil(Math.sqrt(n/B.pile))));
        for(var i=0;i<n;i++){var pile=Math.floor(i/B.pile),lvl=i%B.pile,cx=(pile%perRow)*(B.w+1),cz=z+Math.floor(pile/perRow)*(B.d+1);m4.makeTranslation(cx+B.w/2,lvl*h,cz+B.d/2);im.setMatrixAt(i,m4);}
        im.userData.v3Full=n;im.userData.v3Intro=true;im.userData.v3Zone=k;   // E21: this metal's bars arrive the way the coins do
        (function(im,n,dz){im.userData.v3Lay={id:k+'|'+B.name,n:n,zone:k,plan:function(seen){return v3UnitPlan(im,n,seen,dz);}};})(im,n,Math.max(h*4,B.d*0.6));   // R16: one bar at a time
        zone.add(im);zw=Math.max(zw,perRow*(B.w+1));z+=Math.ceil(Math.ceil(n/B.pile)/perRow)*(B.d+1)+1;}
      if(frac){var fh=Math.max(0.03,h*frac),fb=v3Bar(B.w,B.d,fh,M,(left).toFixed(1)+' g'),fm=new THREE.Mesh(fb.geo,fb.mats[0]);fm.position.set(B.w/2,0,z+B.d/2);fm.castShadow=fm.receiveShadow=true;fm.userData.v3Intro=true;fm.userData.v3Zone=k;(function(fm,g,dz){fm.userData.v3Lay={id:k+'|part',n:g,zone:k,plan:function(seen){return v3PiecePlan(fm,g,seen,dz);}};})(fm,+left.toFixed(1),Math.max(fh*4,B.d*0.6));zone.add(fm);zw=Math.max(zw,B.w+1);z+=B.d+2;}
    });
    stats[k]=zone.userData.bars;
    var value=oz*(alState.metalPrices[k]||0);
    var lb=v3Label(M.label+' · '+oz.toFixed(2)+' oz',sym+Math.round(value*rate).toLocaleString('en-GB'),'',Math.max(12,zw*0.9));
    v3Plant(lb,zw/2,Math.max(6,z*0.25)+3,-2);zone.add(lb);
    zone.position.x=x0;G.add(zone);parts.push(oz.toFixed(2)+' oz '+M.label.toLowerCase()+' ('+(grams>=1000?(grams/1000).toFixed(2)+' kg':Math.round(grams)+' g')+')');x0+=zw+8;
  });
  return {key:key,grp:G,stats:stats,parts:parts};
}
/* build a stage just after the browser has laid out and painted the tab that holds it (CI, 2 Nov: reading the stage size straight after the
   tab switch made the browser lay out the whole page inside our code, 2 to 170 ms on the slow runner); errors fall back to the flat picture */
function v3After(name,now,flat){V3._after=V3._after||{};if(V3._after[name])return;V3._after[name]=1;
  requestAnimationFrame(function(){setTimeout(function(){V3._after[name]=0;try{if(!now()){V3._flat=V3._flat||{};V3._flat[name]=1;flat();}}catch(e){console.error('[Vault-It] 3D '+name,e);V3._flat=V3._flat||{};V3._flat[name]=1;flat();}},0);});}
function v3Metals(){
  if(!v3Ok()||(V3._flat&&V3._flat.metals))return false;
  var scene=document.getElementById('metals-scene');if(!scene)return false;
  v3Host(scene,'metalsSvg');window._v3MetalsOn=true;v3After('metals',v3MetalsNow,function(){var sv=document.getElementById('metalsSvg');if(sv)sv.style.display='';renderMetalsISO();});return true;
}
function v3MetalsNow(){
  if(!v3Ok())return false;
  var scene=document.getElementById('metals-scene');if(!scene)return false;
  var host=v3Host(scene,'metalsSvg');window._v3MetalsOn=true;if(!host.clientWidth)return true;
  var V=V3.metals||(V3.metals=new V3Scene(host,'3D view of your precious metals as bars'));
  var mkey=v3MetalsKey();if(V._key===mkey&&V.root.children.length){V.kick(300);return true;}   // same holdings and prices: redraw, do not rebuild
  V.clear();V._key=mkey;
  var C=v3Pre('metals',mkey)||v3MetalsContent(mkey),parts=C.parts;V.root.add(C.grp);V.stats=C.stats;   // built in the idle warm-up when nothing changed since
  var km=V3._metalsKey===JSON.stringify(alState.metals);V.frame(km);v3Settle(V,km);V3._metalsKey=JSON.stringify(alState.metals);
  V.introArm('metals|'+mkey,V3._animZone||null,V3._animSilent);V3._animZone=null;V3._animSilent=false;   // E21 and E22: the bars slide in on a first view, and only the committed metal's bars after a commit
  var cap=document.getElementById('metalsCap');if(cap)cap.textContent=parts.length?parts.join(' · ')+' · real bar sizes from each metal\'s weight · value at the live price':'No metals yet. Add your holdings below.';
  return true;
}

/* v0.7: warm the coin and bar stage in idle time once three.js is in (the house builder's idle precompile, owner 2 Nov "learn from that
   viewport"): the shared renderer, then the real coin, bar, tag and floor objects built in a stage that is not on the page, each one
   drawn once in its own idle slice (which compiles its shaders), so opening Cash and savings or Precious metals compiles nothing and creates no context. Skipped when
   either stage has already opened, when the device asks to save data, or without WebGL. */
function v3Warm(){
  if(V3._warm||V3.cash||V3.metals||!window.THREE||!THREE.OrbitControls||!viGlOk())return;V3._warm=1;
  /* v0.9.2: several steps share one idle period while it has time left (each step is one small compile), so the warm-up is done
     sooner after load and a tap on Assets is less likely to find shaders still to compile */
  /* and none runs in the 1.5 s after a tab or sub-tab change (window._viNavAt), so a compile never lands on the tap that opens a tab */
  var hbBusy=function(){var v=window.HB3DAPP&&HB3DAPP.viewer,t=document.getElementById('tab-house');try{if(t&&t.offsetParent)return true;return !!(v&&v.active&&v.settled&&!v.settled());}catch(e){return false;}};   // the House Builder on screen: wait (a compile there delays the next house type's first frame)   // nor while the House Builder is still building or moving (its own type warm-up waits the same way)
  var dl=null,idle=function(f){var q=(window._viNavAt||-1e9)+1500-performance.now();if(q<=0&&hbBusy())q=400;if(q>0){dl=null;return setTimeout(function(){idle(f);},q+20);}if(dl&&!dl.didTimeout&&dl.timeRemaining()>12)return f();if(window.requestIdleCallback)requestIdleCallback(function(d){if((window._viNavAt||-1e9)+1500>performance.now()||hbBusy()){dl=null;return idle(f);}dl=d;f();},{timeout:4000});else setTimeout(function(){if((window._viNavAt||-1e9)+1500>performance.now()||hbBusy())return idle(f);f();},200);};
  var pre=[function(){var K=v3CashKey();if(K.units>0){V3._pre=V3._pre||{};var c=v3CashContent(K.spec,K.units,K.cur);V3._pre.cash=c;}},
    function(){var mk=v3MetalsKey();V3._pre=V3._pre||{};V3._pre.metals=v3MetalsContent(mk);}];
  var W=null,objs=[],bars=[],k=0,busy=function(){return V3.cash||V3.metals;};   // a stage opened meanwhile: stop (it compiles what it needs itself)
  var done=function(){if(W){W.dead=true;try{if(W.ro)W.ro.disconnect();if(W.io)W.io.disconnect();W.ctl.dispose();}catch(e){}W=null;}if(V3._r)V3._r._v3on=null;[V3.cash,V3.metals].forEach(function(v){if(v){v._w=0;v.kick(300);}});V3._warmed=true;};   // a stage that opened meanwhile takes the canvas back at its own size   // the warm-up stage is dropped, not disposed: disposing its materials would make three.js delete the very shaders it compiled
  var step=function(){
    if(k>0&&busy())return done();   // a stage opened meanwhile: stop before touching the shared canvas
    try{
      if(k===0){v3Renderer();k=1;return idle(step);}   // the context, on its own
      if(k===1){   // the objects the real stages draw, at their real settings (same shaders, so the compile is reused)
        var host=document.createElement('div');host.style.cssText='position:absolute;width:0;height:0;overflow:hidden';
        W=new V3Scene(host,'');W._off=true;var cur=(window.VI_CURRENCY||(typeof viSettings!=='undefined'&&viSettings.currency)||'GBP').toUpperCase(),spec=V3_COINS[cur]||V3_COINS.GBP,m4=new THREE.Matrix4();
        var st=v3Stack(spec,10),im=new THREE.InstancedMesh(st.geo,st.mats[0],2);im.setMatrixAt(0,m4);im.setMatrixAt(1,m4.makeTranslation(3,0,0));W.root.add(im);
        var ps=v3Stack(spec,3);W.root.add(new THREE.Mesh(ps.geo,ps.mats[0]));
        var M=V3_METALS.gold,B=V3_BARS[V3_BARS.length-1],bh=(B.g/M.rho)/(B.w*B.d),bar=v3Bar(B.w,B.d,bh,M,B.name),bi=new THREE.InstancedMesh(bar.geo,bar.mats[0],1);bi.setMatrixAt(0,new THREE.Matrix4());W.root.add(bi);W.root.add(new THREE.Mesh(bar.geo,bar.mats[0]));
        var lb=v3Label('Warm','£0','',10);v3Plant(lb,0,2,0);W.root.add(lb);
        /* v0.9.1: the plate tiles, their gold edges and the landing coin (R16: its drop and flash in the shader), so
           opening Cash and savings still compiles nothing (E12, E13, E14) */
        var tl=v3Keep('plate-tile',function(){var g=new THREE.PlaneBufferGeometry(1,1);g.rotateX(-Math.PI/2);return {geo:g,mats:[]};});
        var tim=new THREE.InstancedMesh(tl.geo,new THREE.MeshBasicMaterial({color:0x123033,transparent:true,opacity:.74,depthWrite:false,toneMapped:false,fog:false}),1);tim.setMatrixAt(0,new THREE.Matrix4());W.root.add(tim);
        W.root.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0.02,0),new THREE.Vector3(1,0.02,0)]),new THREE.LineBasicMaterial({color:0xE8C56A,transparent:true,opacity:.85,toneMapped:false,fog:false})));
        var c1=v3Stack(spec,1),gf=new THREE.InstancedMesh(v3FlyGeo(c1.geo,new Float32Array([-1e3])),v3FlyMat(c1.mats[0]),1);gf.setMatrixAt(0,new THREE.Matrix4());gf.frustumCulled=false;W.root.add(gf);
        W.frame(false);
        W.sc.traverse(function(o){if(o.material&&o.visible&&(o.isMesh||o.isLine||o.isSprite))objs.push(o);});W.r.setPixelRatio(1);W.r.setSize(1,1,false);
        // the bars for the metals actually held, the same sizes v3Metals will ask for (kept, so opening Precious metals builds none of them)
        try{['gold','silver','platinum','palladium'].forEach(function(mk){var oz=+((alState.metals||{})[mk]||0);if(!(oz>0))return;var M2=V3_METALS[mk],left=oz*OZ_G;
          V3_BARS.forEach(function(B2,bi){var n=Math.floor((left+1e-6)/B2.g);left-=n*B2.g;var isLast=bi===V3_BARS.length-1,frac=isLast&&left>0.05?left/B2.g:0,h2=(B2.g/M2.rho)/(B2.w*B2.d),lf=left;
            if(n)bars.push(function(){v3Bar(B2.w,B2.d,h2,M2,B2.name);});if(frac)bars.push(function(){v3Bar(B2.w,B2.d,Math.max(0.03,h2*frac),M2,(lf).toFixed(1)+' g');});});});}catch(e){}
        k=2;return idle(step);}
      if(bars.length){bars.shift()();return idle(step);}   // one bar shape per idle slice
      if(pre.length){pre.shift()();return idle(step);}   // then the cash and metals content for the data as it is now, one per idle slice
      if(k-2<objs.length){   // one object's shaders per idle slice
        var tgt=objs[k-2],vis=[],fc=tgt.frustumCulled;W.sc.traverse(function(o){if(o.material){vis.push([o,o.visible]);o.visible=(o===tgt);}});tgt.frustumCulled=false;   // drawn whatever the warm-up camera sees
        var p=tgt;while(p){p.visible=true;p=p.parent;}
        W.r.render(W.sc,W.cam);tgt.frustumCulled=fc;vis.forEach(function(v){v[0].visible=v[1];});k++;if(busy())return done();return idle(step);}
      if(k-2===objs.length){var cull=[];W.sc.traverse(function(o){cull.push([o,o.frustumCulled]);o.frustumCulled=false;});W.r.render(W.sc,W.cam);cull.forEach(function(c){c[0].frustumCulled=c[1];});k++;}   // last, the whole stage once: picks up the few small shaders (tag, post, glow) the single-object draws leave out   // drawn once into a 1x1 canvas: the same path as a real frame (three's compile() keys fog differently)
    }catch(e){console.warn('[Vault-It] 3D warm-up',e);}
    done();
  };
  idle(step);
}
/* v0.9.2: the warm-up starts the moment both are true, the page has loaded and the 3D engine is in (its 'vi-three' event, which can
   come before or after 'load'), not on the next 1.5 s poll; the poll stays as a fallback */
function v3WarmSoon(){if(document.readyState!=='complete'||!window.THREE||!THREE.OrbitControls)return;var saveData=false;try{saveData=!!(navigator.connection&&navigator.connection.saveData);}catch(e){}if(!saveData)setTimeout(v3Warm,50);}
document.addEventListener('vi-three',function(e){if(e.detail&&e.detail.ok)v3WarmSoon();});
window.addEventListener('load',function(){var saveData=false;try{saveData=!!(navigator.connection&&navigator.connection.saveData);}catch(e){}if(saveData)return;
  v3WarmSoon();
  var n=0,wait=function(){if(window.THREE&&THREE.OrbitControls)return v3Warm();if(++n<30)setTimeout(wait,1500);};setTimeout(wait,1500);});

