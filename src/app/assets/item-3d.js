// ═══════════════════════════════════════════════════════════════
// ITEM 3D MODELS (wealth inventory and liabilities)
// One viewer for both: Night stage in both modes, orbit / rotate / zoom, neutral white light so every model
// shows its own colours and textures (owner, 31 Oct: the green tint is gone).
// The .glb file stays on this device (IndexedDB, next to the photos); the item keeps only a small preview
// picture and where the model came from (plus the credit line for CC-BY models).
// Library models (v0.9.1, E30): the 3D button opens a search over our own catalogue, models/catalog.json, bundled with the app
// and served from the same address (no outside host). A .glb is fetched only when someone picks or opens it; the service
// worker never caches models/. The old Poly Pizza live search is gone; items saved with it ('pp') open from our copy.
// ═══════════════════════════════════════════════════════════════
var I3D_BASE='models/';   // our own library, served with the app (same origin)
var I3D_SETS=[['all','All'],['top100','Top 100'],['cars','Cars'],['instruments','Instruments'],['collectibles','Collectibles']];
var _i3dCat=null,_i3dCatP=null,_i3dQ={set:'all'};
// the catalogue (a few hundred small records), fetched when the picker opens
function i3dCatalog(){
  if(_i3dCat)return Promise.resolve(_i3dCat);
  return _i3dCatP||(_i3dCatP=fetch(I3D_BASE+'catalog.json',{credentials:'omit'}).then(function(r){if(!r.ok)throw new Error('status '+r.status);return r.json();})
    .then(function(j){_i3dCat=(j&&j.models)||[];_i3dCat.forEach(function(m){if(!m.uid)m.uid=(m.set||'')+':'+String(m.item||m.title||m.id).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');});return _i3dCat;})
    .catch(function(){_i3dCatP=null;throw new Error('Could not load the model library. Check the connection and try again, or upload a 3D file instead.');}));
}
function i3dNorm(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function i3dHay(m){return m._h||(m._h={item:' '+i3dNorm(m.item+' '+(m.standinFor||'')),title:' '+i3dNorm(m.title),tags:' '+i3dNorm((m.tags||[]).join(' ')),set:' '+i3dNorm(m.set+' '+(m.group||'')+' '+(m.kind||''))});}
// how well a model matches the words: title, tags, the item it stands for and its set. all=true: every word must hit
function i3dScore(m,toks,all){
  var h=i3dHay(m),tot=0;
  for(var i=0;i<toks.length;i++){
    var t=toks[i],sc=0,f=[['item',6],['title',5],['tags',3],['set',2]];
    for(var k=0;k<f.length;k++){var v=h[f[k][0]];if(v.indexOf(' '+t)>-1)sc=Math.max(sc,f[k][1]);else if(t.length>2&&v.indexOf(t)>-1)sc=Math.max(sc,f[k][1]/2);}
    if(!sc&&all)return 0;tot+=sc;
  }
  return tot;
}
function i3dResults(cat,q,set,name){
  var toks=i3dNorm(q).split(' ').filter(Boolean),all=toks.length>0;
  if(!all)toks=i3dNorm(name).split(' ').filter(function(w){return w.length>2&&!/^(the|and|for|loan|card|mortgage|finance|payment|debt|new|used)$/.test(w);});
  var out=[];
  (cat||[]).forEach(function(m,ix){if(set&&set!=='all'&&m.set!==set)return;var sc=toks.length?i3dScore(m,toks,all):0;if(all&&!sc)return;out.push({m:m,sc:sc,ix:ix});});
  out.sort(function(a,b){return b.sc-a.sc||a.ix-b.ix;});
  return out.map(function(o){return o.m;});
}
function i3dMeta(m){return {src:'lib',cid:m.uid,pid:m.id,t:m.title,by:m.creator,lic:/CC-BY/i.test(m.licence||'')?'CC-BY':'CC0',licFull:m.licence||'',file:m.file,item:m.item||'',standin:!!m.standin,standinFor:m.standinFor||'',url:m.source||'',attr:m.attribution||''};}
function i3dCredit(m){return m&&m.lic==='CC-BY'?(m.attr||'"'+m.t+'" by '+m.by+(m.url?', '+m.url:'')+'. Licence: CC-BY 3.0, https://creativecommons.org/licenses/by/3.0. Full credit under 3D model credits.'):'';}
function i3dCreditShort(m){return '"'+m.t+'" by '+m.by+' · '+(m.licFull||m.lic||'');}
/* the credit line on the item's tile: CC-BY credit, and a plain "close match" note when the model only stands in for the item */
function i3dItemCredit(it){var m=it&&it.model;if(!m||(m.lic!=='CC-BY'&&!m.standin))return '';
  return '<div class="i3d-credit i3d-itemcredit">'+(m.lic==='CC-BY'?'Model: '+cfEsc(i3dCreditShort(m)):'')+(m.standin?(m.lic==='CC-BY'?'<br>':'')+'Close match, not the exact '+cfEsc(m.standinFor||'item'):'')+'</div>';}
function i3dHintHtml(m){
  var h='';
  if(m.lic==='CC-BY')h+='<br><span class="i3d-credit">'+cfEsc(i3dCredit(m))+'</span>';
  else if(m.src==='lib'||m.src==='pp')h+='<br><span class="i3d-credit">"'+cfEsc(m.t)+'" by '+cfEsc(m.by)+' (CC0)</span>';
  if(m.standin)h+='<br><span class="i3d-credit">Close match: a stand-in for '+cfEsc(m.standinFor||'this item')+', not the exact model.</span>';
  return h;
}
function i3dItem(kind,id){return ((kind==='li'?alState.liabilities:alState.otherAssets)||[]).find(function(x){return x.id===id;});}
function i3dKey(kind,id){return 'm:'+kind+':'+id;}
function i3dPut(kind,id,buf,fmt){i3dCacheDrop(i3dKey(kind,id),true);return invTx('readwrite',function(s){return s.put({glb:buf,fmt:fmt||'glb',updated:Date.now()},i3dKey(kind,id));});}   // the bytes stay under `glb` (old records); `fmt` says which format they are
function i3dGetRec(kind,id){return invTx('readonly',function(s){return s.get(i3dKey(kind,id));}).then(function(v){return v&&v.glb?{buf:v.glb,fmt:v.fmt||'glb'}:null;});}
function i3dGetBuf(kind,id){return i3dGetRec(kind,id).then(function(r){return r&&r.buf;});}
function i3dDel(kind,id){i3dCacheDrop(i3dKey(kind,id),true);try{return invTx('readwrite',function(s){return s.delete(i3dKey(kind,id));});}catch(e){return Promise.resolve();}}
// fetch a library model from our own copy (same origin); a web page or an error is never mistaken for a model
function i3dFetchLib(file){
  return fetch(I3D_BASE+file,{credentials:'omit'}).then(function(r){
    if(!r.ok)throw new Error('The model library answered '+r.status+'. Try again later, or upload a .glb file instead.');
    return r.arrayBuffer();
  },function(){throw new Error('Could not reach the model library (offline?). Try again, or upload a .glb file instead.');}).then(function(buf){
    if(buf.byteLength<12||new DataView(buf).getUint32(0,true)!==0x46546C67)throw new Error('The library sent something that is not a 3D model. Try again later, or upload a .glb file instead.');
    return buf;
  });
}
// which library file belongs to a saved model: new ones carry it; ones saved with Poly Pizza are matched by their id
function i3dFileOf(m){
  if(m.file)return Promise.resolve(m.file);
  if(m.src!=='pp'||!m.id)return Promise.resolve('');
  return i3dCatalog().then(function(c){var x=c.find(function(y){return y.id===m.id;});return x?x.file:'';},function(){return '';});
}
/* E29 (v0.9.1): one file per item, in any of six formats. Each loader (and fflate, which FBX and 3MF need to unzip) is fetched from the
   same jsDelivr three@0.128.0 examples path as GLTFLoader, only when a file of that type is picked. */
var I3D_EXT={glb:1,gltf:1,stl:1,obj:1,fbx:1,'3mf':1};
var I3D_ACCEPT='.glb,.gltf,.stl,.obj,.fbx,.3mf,model/gltf-binary,model/gltf+json,model/stl,model/obj,model/3mf';
var I3D_LD={stl:'STLLoader',obj:'OBJLoader',fbx:'FBXLoader','3mf':'3MFLoader'},I3D_LDP={};
function i3dExt(name){var m=/\.([a-z0-9]+)$/i.exec(name||'');return m?m[1].toLowerCase():'';}
function i3dScript(src,ready){return new Promise(function(res,rej){if(ready())return res();var sc=document.createElement('script');sc.src=src;sc.onload=res;sc.onerror=function(){rej(new Error('Could not load the 3D file reader. Check the connection and try again.'));};document.head.appendChild(sc);});}
function i3dLoader(fmt){
  if(fmt==='glb'||fmt==='gltf')return _hbGltfLoader();
  var nm=I3D_LD[fmt];if(!nm)return Promise.reject(new Error('That file type is not supported.'));
  if(I3D_LDP[fmt])return I3D_LDP[fmt];
  var base='https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/',cls=fmt==='3mf'?'ThreeMFLoader':nm;
  var p=((fmt==='fbx'||fmt==='3mf')?i3dScript(base+'libs/fflate.min.js',function(){return !!window.fflate;}):Promise.resolve())
    .then(function(){return i3dScript(base+'loaders/'+nm+'.js',function(){return !!THREE[cls];});})
    .then(function(){if(!THREE[cls])throw new Error('The 3D file reader is unavailable.');return THREE[cls];});
  I3D_LDP[fmt]=p;p.catch(function(){delete I3D_LDP[fmt];});return p;
}
// STL and OBJ (when it has no colours of its own) take the item's colour: green for wealth, red for liabilities, the same as the app's tiles
var I3D_TINT={wi:0x2A9A68,li:0xA84444};   // the brand green and red, a shade down because the stage lights brighten them
function i3dTintNone(obj,hex){
  obj.traverse(function(o){if(!o.isMesh)return;
    var mats=Array.isArray(o.material)?o.material:[o.material];
    var out=mats.map(function(m){return (m&&m.map)?m:new THREE.MeshStandardMaterial({color:i3dCol(hex),roughness:0.55,metalness:0.1,side:THREE.DoubleSide});});
    o.material=Array.isArray(o.material)?out:out[0];
  });
}
function i3dParse(buf,fmt,kind){
  fmt=fmt||'glb';
  if(!viGlOk())return Promise.reject(new Error('3D is not available on this device.'));
  var bad=function(e){return new Error('Could not read that .'+fmt+' file'+(e&&e.message?': '+String(e.message).slice(0,80):'.'));};
  return new Promise(function(res,rej){viThree(res,function(){rej(new Error('The 3D engine could not be downloaded. Check the connection and try again.'));});}).then(function(){return i3dLoader(fmt);}).then(function(L){return new Promise(function(res,rej){
    try{
      if(fmt==='glb'||fmt==='gltf'){new L().parse(buf,'',function(g){var o=g.scene||(g.scenes&&g.scenes[0]);o?res(o):rej(bad());},function(e){rej(bad(e));});return;}
      var root=new THREE.Group(),obj;
      if(fmt==='stl'){var geo=new L().parse(buf);if(!geo||!geo.attributes||!geo.attributes.position||!geo.attributes.position.count)throw new Error('empty file');
        geo.computeVertexNormals();   // many exporters write zero normals in binary STL, which lights as black; face normals are recomputed
        obj=new THREE.Mesh(geo,geo.hasColors?new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.55,metalness:0.1,side:THREE.DoubleSide}):new THREE.MeshStandardMaterial({color:i3dCol(I3D_TINT[kind]||I3D_TINT.wi),roughness:0.55,metalness:0.1,side:THREE.DoubleSide}));}
      else if(fmt==='obj'){obj=new L().parse(new TextDecoder().decode(buf));i3dTintNone(obj,I3D_TINT[kind]||I3D_TINT.wi);}
      else if(fmt==='fbx')obj=new L().parse(buf,'');
      else obj=new L().parse(buf);
      var has=false;obj.traverse(function(o){if(o.isMesh)has=true;});if(!has)throw new Error('no 3D shape found');
      root.add(obj);
      if(fmt==='stl'||fmt==='3mf')obj.rotation.x=-Math.PI/2;   // printing formats are Z-up; the viewer is Y-up
      res(root);
    }catch(e){rej(bad(e));}
  });});
}
// the house style: same green on every model, lightly
// colours as the house viewer gives them (sRGB hex to the renderer's linear space)
function i3dCol(h){return new THREE.Color(h).convertSRGBToLinear();}
/* owner, 31 Oct: no green tint; every model shows its own colours and textures. Oversized textures are scaled down once (2048 px,
   1024 on touch devices) so a big upload does not stall the page or run a phone out of graphics memory. */
function i3dSlimTex(t,max){
  var im=t&&t.image;if(!im||t._i3dSlim)return;var w=im.width||0,h=im.height||0;if(!(w>max||h>max))return;
  try{var k=max/Math.max(w,h),c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*k));c.height=Math.max(1,Math.round(h*k));
    c.getContext('2d').drawImage(im,0,0,c.width,c.height);t.image=c;t.needsUpdate=true;t._i3dSlim=true;}catch(e){}
}
function i3dStyle(obj){
  var n=0,max=viCoarse()?1024:2048;
  obj.traverse(function(o){
    if(!o.isMesh)return;n++;
    (Array.isArray(o.material)?o.material:[o.material]).forEach(function(m){if(!m)return;
      ['map','normalMap','roughnessMap','metalnessMap','emissiveMap','aoMap'].forEach(function(k){if(m[k])i3dSlimTex(m[k],max)});});
    o.castShadow=true;o.receiveShadow=true;
  });
  return n;
}
// fit any model to the same size, centred, standing on the ground
function i3dFit(obj){
  var b=new THREE.Box3().setFromObject(obj),s=b.getSize(new THREE.Vector3()),k=2/Math.max(s.x,s.y,s.z,1e-6);
  obj.scale.multiplyScalar(k);b.setFromObject(obj);var c=b.getCenter(new THREE.Vector3());
  obj.position.x-=c.x;obj.position.z-=c.z;obj.position.y-=b.min.y;
  return b.setFromObject(obj);
}
/* the floor grid as short pieces (1 unit each) rather than one long line per row: a long line that runs behind the camera can drop out
   on some graphics drivers (seen in software rendering), and short pieces keep every line crisp right up to the model */
function i3dGrid(half,step,hex,op,y){
  var v=[];for(var a=-half;a<=half+1e-6;a+=step)for(var b=-half;b<half-1e-6;b+=1){var e=Math.min(half,b+1);v.push(a,y,b,a,y,e,b,y,a,e,y,a);}
  var g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));
  return new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:i3dCol(hex),transparent:true,opacity:op,depthWrite:false}));
}
/* v0.9.2 (owner, 4 Nov: "viewports still too slow"): the tile's live view and the full viewer share one WebGL renderer and one
   stage (sky, floor, grid, lights), made on the first open and kept. Opening another item, or going from the tile to the full
   viewer, only swaps the model: no new WebGL context, no shaders compiled again, and closing no longer waits for a context to be
   torn down. Only one live view is open at a time; a second one at the same moment (never in normal use) gets its own renderer. */
var _i3dSh=null;
function i3dRenderer(still){
  var r=new THREE.WebGLRenderer({antialias:!viCoarse(),alpha:false,preserveDrawingBuffer:!!still});
  r.outputEncoding=THREE.sRGBEncoding;r.toneMapping=THREE.NoToneMapping;   // the model's own colours, not a film curve (owner, 31 Oct)
  r.shadowMap.enabled=!still;r.shadowMap.type=THREE.PCFShadowMap;   // the still preview needs no shadows; the cheaper filter everywhere
  return r;
}
function i3dShared(){
  if(_i3dSh)return _i3dSh;
  var S=_i3dSh={r:i3dRenderer(false),sc:new THREE.Scene(),view:null,lost:false};
  i3dStage(S.sc,false);
  var cv=S.r.domElement;cv.addEventListener('webglcontextlost',function(e){e.preventDefault();S.lost=true;});
  cv.addEventListener('webglcontextrestored',function(){S.lost=false;if(S.view){S.view._w=0;S.view.kick(400);}});
  return S;
}
function I3DView(host,obj,opts){
  opts=opts||{};var self=this;
  var w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);
  var S=!opts.still&&viGlOk()?i3dShared():null;if(S&&S.view&&!S.view.dead)S=null;   // the shared stage is taken: this one has its own
  var r=this.r=S?S.r:i3dRenderer(!!opts.still);this._sh=S;
  if(S){S.view=this;if(S.lite)this._lite=true;}
  else{r.domElement.addEventListener('webglcontextlost',function(e){e.preventDefault();self._lost=true;});r.domElement.addEventListener('webglcontextrestored',function(){self._lost=false;});}
  r.setDrawingBufferSize(w,h,S&&S.lite?1:viGlDpr(host));   // size and pixel ratio in one go: each change reallocates the drawing buffer
  var cv=r.domElement;cv.className='i3d-canvas';cv.setAttribute('role','img');cv.setAttribute('aria-label',opts.label||'3D model');cv.removeAttribute('tabindex');cv.style.touchAction='';
  host.insertBefore(cv,host.firstChild);
  var sc=this.sc=S?S.sc:new THREE.Scene();if(!S)this._gtex=i3dStage(sc,!!opts.still);
  this.tinted=i3dStyle(obj);var bb=i3dFit(obj);sc.add(obj);this.obj=obj;
  this._rest(host,w,h,bb,opts);
}
// the stage every item stands on (see R17 below); returns the floor texture, which the owner of the scene disposes
function i3dStage(sc,still){
  /* v0.9.1 R17 (owner, 4 Nov): more contrast in the sky and the floor, sharper floor lines, the environment glows teal while the
     model is lit only by white light. The teal is in the stage itself (sky dome and a pool of light on the floor, both unlit), so no
     coloured light ever reaches the model. The sky runs from near black overhead to a teal horizon; fog melts the floor into it. */
  var hz=0x0f4446;sc.background=new THREE.Color(0x02070c);sc.fog=new THREE.Fog(i3dCol(hz),10,27);   // fog and vertex colours are mixed in linear light, so they take linear values
  var sky=new THREE.Mesh(new THREE.SphereBufferGeometry(60,32,16),new THREE.MeshBasicMaterial({side:THREE.BackSide,vertexColors:true,fog:false,depthWrite:false}));
  (function(g){var p=g.attributes.position,c=new Float32Array(p.count*3),top=i3dCol(0x02070c),mid=i3dCol(0x08262e),low=i3dCol(hz),t=new THREE.Color();
    for(var i=0;i<p.count;i++){var y=p.getY(i)/60;if(y>0.28)t.copy(mid).lerp(top,Math.min(1,(y-0.28)/0.5));else t.copy(low).lerp(mid,Math.max(0,y)/0.28);c[i*3]=t.r;c[i*3+1]=t.g;c[i*3+2]=t.b;}
    g.setAttribute('color',new THREE.BufferAttribute(c,3));})(sky.geometry);
  sky.userData.i3dEnv=hz;sky.renderOrder=-1;sc.add(sky);
  var gcv=document.createElement('canvas');gcv.width=gcv.height=256;var gx=gcv.getContext('2d'),gr=gx.createRadialGradient(128,128,0,128,128,128);
  gr.addColorStop(0,'#15504e');gr.addColorStop(0.07,'#0e3638');gr.addColorStop(0.22,'#081b1f');gr.addColorStop(1,'#030a0d');gx.fillStyle=gr;gx.fillRect(0,0,256,256);
  var gtex=new THREE.CanvasTexture(gcv);gtex.encoding=THREE.sRGBEncoding;
  var ground=new THREE.Mesh(new THREE.CircleBufferGeometry(30,64),new THREE.MeshBasicMaterial({map:gtex}));ground.rotation.x=-Math.PI/2;ground.userData.i3dEnv=0x15504e;sc.add(ground);
  sc.add(i3dGrid(12,0.5,0x2c837c,0.45,0.002));sc.add(i3dGrid(12,2,0x5fd6cb,0.6,0.003));   // fine lines every 0.5, bright ones every 2
  /* white light only, so nothing tints the model */
  sc.add(new THREE.HemisphereLight(0xffffff,0x404040,0.9));
  var key=new THREE.DirectionalLight(0xffffff,1.15);key.position.set(3,6,4);key.castShadow=!still;var kms=viCoarse()?512:1024;key.shadow.mapSize.set(kms,kms);key.shadow.bias=-0.0005;
  key.shadow.camera.left=key.shadow.camera.bottom=-2.5;key.shadow.camera.right=key.shadow.camera.top=2.5;sc.add(key);   // the shadow map covers just the model, so it stays crisp
  var fill=new THREE.DirectionalLight(0xffffff,0.35);fill.position.set(-4,3,-2);sc.add(fill);
  var rim=new THREE.DirectionalLight(0xffffff,0.45);rim.position.set(-2,3,-5);sc.add(rim);
  if(!still){var catcher=new THREE.Mesh(new THREE.PlaneBufferGeometry(6,6),new THREE.ShadowMaterial({opacity:0.55,depthWrite:false}));catcher.rotation.x=-Math.PI/2;catcher.position.y=0.001;catcher.renderOrder=-1;catcher.receiveShadow=true;sc.add(catcher);}
  return gtex;
}
I3DView.prototype._rest=function(host,w,h,bb,opts){
  var self=this,r=this.r,sc=this.sc,cv=r.domElement;
  var cam=this.cam=new THREE.PerspectiveCamera(35,w/h,0.02,100);
  /* on a narrow stage the control column (40 px) sits over the model's right edge: slide the picture left so nothing runs under it */
  this._vo=function(W,H){if(host.id==='i3d-stage'&&W<520)cam.setViewOffset(W,H,28,0,W,H);else if(cam.view)cam.clearViewOffset();};this._vo(w,h);
  var ty=Math.max(0.3,(bb.max.y)/2);this.home={p:new THREE.Vector3(2.6,1.7+ty*0.4,3.4),t:new THREE.Vector3(0,ty,0)};
  cam.position.copy(this.home.p);cam.lookAt(this.home.t);
  if(opts.still){r.render(sc,cam);return;}
  var ctl=this.ctl=new THREE.OrbitControls(cam,cv);
  ctl.target.copy(this.home.t);ctl.enableDamping=true;ctl.dampingFactor=0.09;ctl.rotateSpeed=0.8;ctl.minDistance=1.2;ctl.maxDistance=12;ctl.maxPolarAngle=Math.PI/2-0.03;ctl.screenSpacePanning=true;
  ctl.touches={ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_PAN};
  var still=false;try{still=matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){}
  ctl.autoRotate=!still&&opts.auto!==false;ctl.autoRotateSpeed=1.6;
  ctl.addEventListener('start',function(){ctl.autoRotate=false;self.onAuto&&self.onAuto(false);self.kick();});
  ctl.addEventListener('change',function(){self.kick();});
  ctl.update();
  // draws only while something moves (drag, pinch, auto-rotate, a kick), never off screen or in a background tab
  /* F2 (R18 "it should run smooth"): the stage size comes from the ResizeObserver below; reading clientWidth here forced a style and layout
     pass every frame (about 5 ms a frame on a phone, with decorative animations behind the viewer). Without ResizeObserver it reads as before. */
  this._rw=w;this._rh=h;this._w=w;this._h=h;
  var loop=function(){self.raf=0;if(self.dead||self._lost||(self._sh&&self._sh.lost)||self._off||document.hidden){self._lastT=0;return;}var W=self.ro?self._rw:host.clientWidth,H=self.ro?self._rh:host.clientHeight;if(W&&H&&(W!==self._w||H!==self._h)){self._w=W;self._h=H;r.setDrawingBufferSize(W,H,self._lite?1:viGlDpr(host));cam.aspect=W/H;self._vo(W,H);cam.updateProjectionMatrix();}
    var moving=ctl.update();var t=performance.now();r.render(sc,cam);
    if(window.VIPERF&&VIPERF.stageFrame)VIPERF.stageFrame(host.id==='i3d-stage'?'Item 3D viewer':'Item 3D tile',r.info.render.calls,r.info.render.triangles);   // v0.9.2: ?perf=1 samples the item viewer's frames too
    if(moving&&self._lastT&&!self._lite){var dt=t-self._lastT;if(dt>2&&dt<500){self._ema=self._ema==null?dt:self._ema*0.9+dt*0.1;self._nf=(self._nf||0)+1;if(self._nf>40&&self._ema>70)self.goLite();}}
    self._lastT=moving?t:0;
    /* R18 (owner, 4 Nov: closing took 5 s): ctl.update() fires 'change', which kicks a frame, so only queue one if none is queued yet.
       Queuing both doubled the draws every frame (2, 4, 8 ...) until the page froze and a tap on X waited behind them. */
    if((moving||ctl.autoRotate||Date.now()<self._until)&&!self.raf)self.raf=requestAnimationFrame(loop);};
  this._loop=loop;this._off=false;
  if(window.ResizeObserver){this.ro=new ResizeObserver(function(es){var cr=es[es.length-1].contentRect;self._rw=Math.round(cr.width);self._rh=Math.round(cr.height);self.kick();});this.ro.observe(host);}
  if(window.IntersectionObserver){this.io=new IntersectionObserver(function(es){var vis=es[es.length-1].isIntersecting;if(vis===!self._off)return;self._off=!vis;if(vis)self.kick(200);},{threshold:.01});this.io.observe(host);}
  this._onVis=function(){if(!document.hidden)self.kick(200);};document.addEventListener('visibilitychange',this._onVis);
  this.kick(600);
};
I3DView.prototype.kick=function(ms){this._until=Math.max(this._until||0,Date.now()+(ms||400));if(!this.raf&&!this.dead&&this._loop)this.raf=requestAnimationFrame(this._loop);};
I3DView.prototype.goLite=function(){if(this._lite)return;this._lite=true;if(this._sh)this._sh.lite=true;   // the shared stage stays lite for the rest of the visit: this phone cannot keep up
  this.r.shadowMap.enabled=false;this.sc.traverse(function(o){if(o.isDirectionalLight)o.castShadow=false;var m=o.material;if(!m)return;(Array.isArray(m)?m:[m]).forEach(function(x){x.needsUpdate=true;});});this.r.setPixelRatio(1);this._w=0;this.kick(300);};
I3DView.prototype.zoom=function(f){var c=this.cam,t=this.ctl.target,v=c.position.clone().sub(t),d=Math.min(this.ctl.maxDistance,Math.max(this.ctl.minDistance,v.length()*f));c.position.copy(t).add(v.setLength(d));this.kick();};
I3DView.prototype.reset=function(){var c=this.ctl,d=c.enableDamping;c.enableDamping=false;c.update();c.enableDamping=d;   // spend any drag momentum first (one update a frame now, R18), so the camera stays home
  this.cam.position.copy(this.home.p);c.target.copy(this.home.t);c.update();this.kick();};
I3DView.prototype.dispose=function(){
  this.dead=true;cancelAnimationFrame(this.raf);this.raf=0;try{this.ctl&&this.ctl.dispose();}catch(e){}
  try{this.ro&&this.ro.disconnect();this.io&&this.io.disconnect();this._onVis&&document.removeEventListener('visibilitychange',this._onVis);}catch(e){}
  var S=this._sh;
  if(S){   // the shared stage stays for the next open: take the model off it and the canvas off the page; the model is freed unless it is kept for a reopen
    if(this.obj){S.sc.remove(this.obj);if(!i3dCached(this.obj))i3dFree(this.obj);}
    if(S.view===this)S.view=null;var c0=S.r.domElement;c0.parentNode&&c0.parentNode.removeChild(c0);return;}
  if(this.obj&&i3dCached(this.obj))this.sc.remove(this.obj);
  this.sc.traverse(function(o){if(o.geometry)o.geometry.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(function(m){m&&m.dispose&&m.dispose();});});
  try{this._gtex&&this._gtex.dispose();this.r.dispose();this.r.forceContextLoss();}catch(e){}var cv=this.r.domElement;cv.parentNode&&cv.parentNode.removeChild(cv);
};
/* v0.9.2: the last two models read are kept, already parsed, so the tile's live view hands its model to the full viewer and a
   reopen reads nothing from the device again. A new file or a removed model drops the kept copy (i3dPut, i3dDel). */
var _i3dKeep=[],_i3dVer={};   // _i3dVer: bumped when an item's file changes or goes, so a read that started before it is not kept
function i3dCacheGet(kind,id){var k=i3dKey(kind,id);for(var i=0;i<_i3dKeep.length;i++)if(_i3dKeep[i].k===k)return _i3dKeep[i].obj;return null;}
function i3dCachePut(kind,id,obj,ver){var k=i3dKey(kind,id);if(ver!=null&&ver!==(_i3dVer[k]||0))return false;i3dCacheDrop(k);_i3dKeep.unshift({k:k,obj:obj});
  while(_i3dKeep.length>2){var old=_i3dKeep.pop();if(!old.obj.parent)i3dFree(old.obj);}return true;}
function i3dVer(kind,id){return _i3dVer[i3dKey(kind,id)]||0;}
function i3dCacheDrop(k,changed){if(changed)_i3dVer[k]=(_i3dVer[k]||0)+1;for(var i=_i3dKeep.length-1;i>=0;i--)if(_i3dKeep[i].k===k){var o=_i3dKeep.splice(i,1)[0].obj;if(!o.parent)i3dFree(o);}}
function i3dCached(obj){return _i3dKeep.some(function(x){return x.obj===obj;});}
function i3dFree(obj){obj.traverse(function(o){if(o.geometry)o.geometry.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(function(m){if(!m)return;
  ['map','normalMap','roughnessMap','metalnessMap','emissiveMap','aoMap','alphaMap','bumpMap'].forEach(function(t){m[t]&&m[t].dispose&&m[t].dispose();});m.dispose&&m.dispose();});});}
// small still picture for the tile (one short-lived renderer, so tiles never hold WebGL contexts)
function i3dThumb(obj){
  var d=document.createElement('div');d.style.cssText='position:fixed;left:-9999px;top:0;width:360px;height:360px';document.body.appendChild(d);
  try{var v=new I3DView(d,obj,{still:true});var url=v.r.domElement.toDataURL('image/jpeg',0.78);v.sc.remove(obj);v.dispose();return url;}finally{d.remove();}
}
// save a model (ArrayBuffer) on an item
async function i3dSave(kind,id,buf,meta){
  var it=i3dItem(kind,id);if(!it)return;
  var tick=function(){return new Promise(function(r){requestAnimationFrame(function(){setTimeout(r,0)})})};
  i3dMsg('Reading the model…');await tick();
  var fmt=(meta&&meta.fmt)||'glb';
  var obj=await i3dParse(buf.slice(0),fmt,kind);
  i3dMsg('Saving it on this device…');await tick();
  await i3dPut(kind,id,buf,fmt);
  i3dStyle(obj);await tick();
  it.model=Object.assign({},meta,{fmt:fmt,thumb:i3dThumb(obj),tv:3,at:Date.now()});
  saveAL();renderAlTab();_i3dReady={kind:kind,id:id,obj:obj};return it.model;
}
var _i3dView=null,_i3dBusy=false,_i3dReady=null;   // _i3dReady: the model just saved, already read, so the viewer does not read it twice
function i3dClose(){var o=document.getElementById('i3d-modal');if(o)o.remove();document.body.classList.remove('i3d-open');if(_i3dView){_i3dView.dispose();_i3dView=null;}}
function i3dMsg(t,bad){var e=document.getElementById('i3d-msg');if(e){e.textContent=t||'';e.className='i3d-msg'+(bad?' bad':'');}}
function i3dShell(title,sub){
  i3dClose();
  var o=document.createElement('div');o.id='i3d-modal';o.className='inv-modal';o.setAttribute('tabindex','-1');o.setAttribute('role','dialog');o.setAttribute('aria-label',title);
  o.addEventListener('keydown',function(e){if(e.key==='Escape')i3dClose();});
  o.addEventListener('click',function(e){if(e.target===o)i3dClose();});
  o.innerHTML='<div class="inv-card"><div class="inv-hd"><div><div class="inv-t">'+cfEsc(title)+'</div><div class="inv-s">'+sub+'</div></div>'
    +'<button class="inv-x" onclick="i3dClose()" title="Close"><svg class="vi-ic g" role="img" aria-label="Close"><use href="#vi-close"/></svg></button></div><div id="i3d-body"></div><div id="i3d-msg" class="i3d-msg" role="status" aria-live="polite"></div></div>';
  document.body.appendChild(o);document.body.classList.add('i3d-open');o.focus();return document.getElementById('i3d-body');
}
// open the viewer for an item that has a model
async function i3dOpen(kind,id){
  i3dLiveStop();
  var it=i3dItem(kind,id);if(!it||!it.model)return i3dPick(kind,id);
  var m=it.model,val=kind==='li'?(typeof depreciatedValue==='function'?depreciatedValue(it):it.value):it.value;
  var body=i3dShell(it.name,'£'+Math.round(val||0).toLocaleString('en-GB')+' · 3D model'+(m.src==='lib'||m.src==='pp'?' from the Vault-It library':' (your file)'));
  body.innerHTML='<div class="inv-stage i3d-stage" id="i3d-stage"><div class="inv-empty" id="i3d-wait">Loading the model…</div>'
    +'<div class="inv-ctl"><button title="Auto-rotate" id="i3d-auto" aria-pressed="true" onclick="i3dAuto()"><svg class="vi-ic sm" role="img" aria-label="Auto-rotate"><use href="#vi-orbit"/></svg></button><button title="Zoom in" onclick="_i3dView&&_i3dView.zoom(0.8)"><svg class="vi-ic sm" role="img" aria-label="Zoom in"><use href="#vi-zoom-in"/></svg></button><button title="Zoom out" onclick="_i3dView&&_i3dView.zoom(1.25)"><svg class="vi-ic sm" role="img" aria-label="Zoom out"><use href="#vi-zoom-out"/></svg></button><button title="Reset view" onclick="_i3dView&&_i3dView.reset()"><svg class="vi-ic sm" role="img" aria-label="Reset view"><use href="#vi-reset"/></svg></button></div></div>'
    +'<div class="inv-hint">Drag to rotate · pinch or scroll to zoom · two fingers or right-drag to move.'+i3dHintHtml(m)+'</div>'
    +'<div class="i3d-row"><button class="dep-btn" onclick="i3dPick(\''+kind+'\','+id+')">Change model</button><button class="dep-btn" onclick="i3dRemove(\''+kind+'\','+id+')">Remove model</button>'+(kind==='wi'&&(it.photos||0)>=1?'<button class="dep-btn" onclick="i3dClose();invOpenViewer('+id+')">Photos</button>':'')+'</div>';
  try{
    var obj=null,pre=_i3dReady;_i3dReady=null;
    if(pre&&pre.kind===kind&&pre.id===id)obj=pre.obj;
    else if((obj=i3dCacheGet(kind,id))&&obj.parent)obj=null;   // read already (the tile's live view, or the last open); one in use elsewhere is read again
    var ver=i3dVer(kind,id);
    if(!obj){var rec=await i3dGetRec(kind,id),buf=rec&&rec.buf,fmt=(rec&&rec.fmt)||m.fmt||'glb';
      if(!buf&&(m.src==='lib'||m.src==='pp')){var lf=await i3dFileOf(m);if(lf){i3dMsg('Loading the model from the library…');buf=await i3dFetchLib(lf);await i3dPut(kind,id,buf,'glb');ver=i3dVer(kind,id);fmt='glb';i3dMsg('');}}
      if(!buf)throw new Error('The 3D file is on the device you added it from. Upload it again here to see it on this device.');
      obj=await i3dParse(buf.slice(0),fmt,kind);}
    i3dCachePut(kind,id,obj,ver);
    var st=document.getElementById('i3d-stage');if(!st)return;
    var w=document.getElementById('i3d-wait');w&&w.remove();
    _i3dView=new I3DView(st,obj,{label:'3D model of '+it.name});
    _i3dView.onAuto=function(on){var b=document.getElementById('i3d-auto');b&&b.setAttribute('aria-pressed',on?'true':'false');};
    _i3dView.onAuto(_i3dView.ctl.autoRotate);
  }catch(e){var w2=document.getElementById('i3d-wait');if(w2)w2.textContent='';i3dMsg(e.message||String(e),true);}
}
function i3dAuto(){if(!_i3dView)return;var c=_i3dView.ctl;c.autoRotate=!c.autoRotate;_i3dView.onAuto(c.autoRotate);_i3dView.kick();}
// choose or replace a model
function i3dPick(kind,id){
  var it=i3dItem(kind,id);if(!it)return;
  var body=i3dShell('3D model for '+it.name,kind==='li'?'Liability':'Wealth inventory');
  _i3dQ={set:'all',kind:kind,id:id};
  var K="'"+kind+"',"+id;
  body.innerHTML='<div class="i3d-opts">'
    +'<input type="search" id="i3d-q" class="i3d-q" placeholder="Search our models: guitar, Ford, watch…" aria-label="Search the 3D model library" autocomplete="off" enterkeyhint="search" oninput="i3dFilter()">'
    +'<div class="i3d-sets" role="group" aria-label="Filter by set">'+I3D_SETS.map(function(s){return '<button type="button" class="i3d-chip" data-set="'+s[0]+'" aria-pressed="'+(s[0]==='all'?'true':'false')+'" onclick="i3dSetFilter(\''+s[0]+'\')">'+s[1]+'</button>';}).join('')+'</div>'
    +'<div class="i3d-count" id="i3d-count" role="status" aria-live="polite"></div>'
    +'<div class="i3d-lib" id="i3d-lib"><div class="inv-hint">Loading the library…</div></div>'
    +'<div class="inv-hint">Free models, bundled with Vault-It. Some are a close match, not the exact make and model, and say so. <button type="button" class="i3d-link" data-credits onclick="i3dCredits('+K+')">3D model credits</button></div>'
    +'<label class="i3d-up dep-btn">Upload a 3D file (.glb, .gltf, .stl, .obj, .fbx, .3mf)<input type="file" accept="'+I3D_ACCEPT+'" style="display:none" onchange="i3dUpload(\''+kind+'\','+id+',this)"></label>'
    +'<div class="inv-hint">The file stays on this device; only a small preview picture is saved with the item. Photos still work as before.</div>'
    +(it.model?'<div class="i3d-row"><button class="dep-btn" onclick="i3dOpen(\''+kind+'\','+id+')">View current model</button><button class="dep-btn" onclick="i3dRemove(\''+kind+'\','+id+')">Remove model</button></div>':'')
    +'</div>';
  i3dCatalog().then(function(){i3dFilter();},function(e){var g=document.getElementById('i3d-lib');if(g)g.innerHTML='<div class="i3d-msg bad">'+cfEsc(e.message)+'</div>';});
}
function i3dSetFilter(set){_i3dQ.set=set;[].forEach.call(document.querySelectorAll('#i3d-modal .i3d-chip'),function(b){b.setAttribute('aria-pressed',b.dataset.set===set?'true':'false');});i3dFilter();}
function i3dFilter(){
  var g=document.getElementById('i3d-lib');if(!g||!_i3dCat)return;
  var qe=document.getElementById('i3d-q'),q=qe?qe.value:'',it=i3dItem(_i3dQ.kind,_i3dQ.id);
  var list=i3dResults(_i3dCat,q,_i3dQ.set,it&&it.name),K="'"+_i3dQ.kind+"',"+_i3dQ.id;
  var c=document.getElementById('i3d-count');
  if(c)c.textContent=list.length?list.length+(list.length===1?' model':' models')+(q.trim()?'':' (best matches for this item first)'):'No models match "'+q.trim()+'". Try another word, or upload your own file.';
  g.innerHTML=list.map(function(m){
    var set=(I3D_SETS.find(function(s){return s[0]===m.set;})||[0,m.set])[1];
    return '<button type="button" class="i3d-li" data-cid="'+cfEsc(m.uid)+'" onclick="i3dPickLib('+K+',\''+cfEsc(m.uid)+'\')">'
      +'<img src="'+I3D_BASE+cfEsc(m.thumb)+'" alt="" loading="lazy" decoding="async" onerror="this.style.visibility=\'hidden\'">'
      +'<span>'+cfEsc(m.title)+'</span>'
      +'<small>'+cfEsc(set)+' · '+(/CC-BY/i.test(m.licence||'')?'CC-BY':'CC0')+'</small>'
      +(m.standin?'<small class="i3d-close">Close match for '+cfEsc(m.standinFor||m.item)+'</small>':(m.item&&i3dNorm(m.item)!==i3dNorm(m.title)?'<small>'+cfEsc(m.item)+'</small>':''))
      +'</button>';}).join('');
}
/* the credits page: models/CREDITS.md shown as it is, in a panel */
function i3dMd(t){
  var link=function(x){return cfEsc(x).replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s<]+[^\s<.,;)])/g,function(a,l,u,b){var h=u||b;return '<a href="'+h+'" target="_blank" rel="noopener noreferrer">'+(l||h)+'</a>';});};
  var out='',ul=false;
  String(t).split('\n').forEach(function(ln){
    var m=/^\s*[-*]\s+(.*)$/.exec(ln);
    if(m){if(!ul){out+='<ul>';ul=true;}out+='<li>'+link(m[1])+'</li>';return;}
    if(ul){out+='</ul>';ul=false;}
    if(/^#/.test(ln)||!ln.trim())return;
    out+='<p>'+link(ln)+'</p>';
  });
  return out+(ul?'</ul>':'');
}
function i3dCredits(kind,id){
  var body=i3dShell('3D model credits','The models in the Vault-It library');
  body.innerHTML='<div class="i3d-credits" id="i3d-credits"><div class="inv-hint">Loading…</div></div>'
    +'<div class="i3d-row"><button class="dep-btn" onclick="i3dPick(\''+kind+'\','+id+')">Back to the models</button></div>';
  fetch(I3D_BASE+'CREDITS.md',{credentials:'omit'}).then(function(r){if(!r.ok)throw 0;return r.text();})
    .then(function(t){var e=document.getElementById('i3d-credits');if(e)e.innerHTML=i3dMd(t);},function(){var e=document.getElementById('i3d-credits');if(e)e.innerHTML='<div class="i3d-msg bad">Could not load the credits. Try again later.</div>';});
}
function i3dUpload(kind,id,input){
  var f=input.files&&input.files[0];if(!f)return;
  var ext=i3dExt(f.name);input.value='';
  if(!I3D_EXT[ext]){i3dMsg('That file type is not supported. Use .glb, .gltf, .stl, .obj, .fbx or .3mf.',true);return;}
  if(f.size>25*1048576){i3dMsg('That file is over 25 MB. Try a smaller file.',true);return;}
  i3dMsg('Reading '+f.name+'…');
  f.arrayBuffer().then(function(buf){return i3dSave(kind,id,buf,{src:'file',fmt:ext,t:f.name.replace(/\.[a-z0-9]+$/i,'')});})
    .then(function(){i3dOpen(kind,id);},function(e){i3dMsg(e.message||String(e),true);});
}
function i3dPickLib(kind,id,cid){
  if(_i3dBusy)return;var m=(_i3dCat||[]).find(function(x){return x.uid===cid;});if(!m)return;
  _i3dBusy=true;i3dMsg('Loading "'+m.title+'"…');
  i3dFetchLib(m.file).then(function(buf){return i3dSave(kind,id,buf,i3dMeta(m));})
    .then(function(){_i3dBusy=false;i3dOpen(kind,id);},function(e){_i3dBusy=false;i3dMsg(e.message||String(e),true);});
}
function i3dRemove(kind,id){var it=i3dItem(kind,id);if(!it)return;delete it.model;i3dDel(kind,id);i3dClose();saveAL();renderAlTab();}
// tile markup shared by both lists
/* the tile's badge: on a touch screen, until the first live view this session, it invites the tap (Pedro's round 2); then plain "3D" */
function i3dBadge(){return (window._i3dSeen||!window.matchMedia||!matchMedia('(pointer: coarse)').matches)?'3D':'<svg class="vi-ic sm" aria-hidden="true"><use href="#vi-orbit"/></svg>3D · tap to turn'}
function i3dTile(kind,it){
  var m=it.model;if(!m||!m.thumb)return '';
  return '<img class="i3d-thumb" src="'+m.thumb+'" alt="3D model of '+cfEsc(it.name)+'" onclick="i3dTap(\''+kind+'\','+it.id+',this)" onmouseenter="i3dLive(\''+kind+'\','+it.id+',this)"><span class="inv-badge i3d-badge" title="'+cfEsc(i3dCredit(m)||m.t||'')+'">'+i3dBadge()+'</span>';
}
/* desktop (owner, 31 Oct): an item's 3D model turns in its own tile. Hovering a model tile swaps the still picture for a live view
   (one tile at a time, so only one 3D canvas is ever open); click and drag orbits round the item, a click without a drag opens the
   full viewer. The wheel is left to the page. Touch screens keep the picture and open the viewer on a tap. */
var _i3dLive=null;
function i3dLiveStop(){var r=_i3dLive;_i3dLive=null;if(!r)return;try{r.view&&r.view.dispose()}catch(e){}if(r.host)r.host.remove();if(r.img)r.img.style.visibility='';}
/* phone (owner, 31 Oct): the first tap on a model tile turns it into the live view (drag to orbit); a tap without a drag opens the full viewer */
function i3dTap(kind,id,img){
  var live=_i3dLive&&_i3dLive.key===kind+':'+id&&_i3dLive.view;
  if(live||!viGlOk()||!window.matchMedia||!matchMedia('(pointer: coarse)').matches)return i3dOpen(kind,id);
  i3dLive(kind,id,img,true);
}
function i3dLive(kind,id,img,force){
  if(!window.matchMedia||!(force||matchMedia('(hover: hover) and (pointer: fine)').matches)||!viGlOk())return;
  var key=kind+':'+id;if(_i3dLive&&_i3dLive.key===key&&_i3dLive.area.isConnected)return;
  i3dLiveStop();var area=img.parentNode,rec={key:key,area:area,img:img};_i3dLive=rec;
  var kept=i3dCacheGet(kind,id),ver=i3dVer(kind,id);if(kept&&kept.parent)kept=null;
  (kept?Promise.resolve(kept):i3dGetRec(kind,id).then(function(r){return _i3dLive===rec&&r?i3dParse(r.buf.slice(0),r.fmt,kind):null})).then(function(obj){
    if(obj&&_i3dLive===rec)i3dCachePut(kind,id,obj,ver);
    if(!obj||_i3dLive!==rec||!area.isConnected)return;
    var host=document.createElement('div');host.className='i3d-live';area.appendChild(host);rec.host=host;
    var it=i3dItem(kind,id);rec.view=new I3DView(host,obj,{auto:false,label:'3D model of '+(it?it.name:'the item')+'. Drag to turn it round, click to open it.'});
    /* v0.7 (owner, 2 Nov): the tile is a real viewport. One finger or the mouse orbits, two fingers pinch to zoom and drag to pan (the right
       mouse button pans), a double tap or double click puts the camera back, and a single tap or click opens the full viewer. Zoom is clamped
       (I3DView min and max distance) and the pan is held near the model, so it can never be lost. It draws only while something moves.
       The canvas takes touch only on the tile itself (touch-action none): a swipe that starts anywhere else still scrolls the page.
       The plain mouse wheel belongs to the page until the tile has been clicked or dragged; Ctrl or Cmd with the wheel (and a trackpad pinch) always zooms. */
    var V=rec.view,ctl=V.ctl,cv=V.r.domElement,d0=null,engaged=false,ptrs={},multi=false,tapAt=0,tapTimer=0;
    ctl.enableZoom=true;ctl.enablePan=true;cv.style.touchAction='pan-y';cv.tabIndex=0;
    /* OrbitControls (r128) calls preventDefault on every touch, which would trap the page's scroll on the tile. One finger decides after 8 px:
       mostly vertical means the page scrolls and the camera stays put; mostly horizontal means the camera turns (touch-action pan-y keeps the browser out of it).
       Two fingers always belong to the camera (pinch, pan). */
    var tx0=null,tmode='';
    host.addEventListener('touchstart',function(e){if(e.touches.length===1){tx0=[e.touches[0].clientX,e.touches[0].clientY];tmode='';e.preventDefault=function(){}}else{tx0=null;tmode=''}},{capture:true,passive:true});
    host.addEventListener('touchmove',function(e){if(e.touches.length!==1||!tx0)return;
      if(!tmode){var dx=e.touches[0].clientX-tx0[0],dy=e.touches[0].clientY-tx0[1];if(Math.hypot(dx,dy)<8){e.stopImmediatePropagation();return}tmode=Math.abs(dy)>Math.abs(dx)?'v':'h'}
      if(tmode==='v'){e.stopImmediatePropagation();return}e.preventDefault=function(){}},{capture:true,passive:true});
    host.addEventListener('wheel',function(e){if(!engaged&&!e.ctrlKey&&!e.metaKey)ctl.enableZoom=false},{capture:true,passive:true});   // the page keeps this wheel turn
    host.addEventListener('wheel',function(){ctl.enableZoom=true},{passive:true});
    ctl.addEventListener('change',function(){var o=ctl.target.clone().sub(V.home.t);if(o.length()>2.5){o.setLength(2.5);var nt=V.home.t.clone().add(o);V.cam.position.add(nt.clone().sub(ctl.target));ctl.target.copy(nt)}});
    host.addEventListener('pointerdown',function(e){engaged=true;ptrs[e.pointerId]=1;if(Object.keys(ptrs).length>1)multi=true;d0=[e.clientX,e.clientY]});
    var up=function(e){delete ptrs[e.pointerId];var none=!Object.keys(ptrs).length,wasMulti=multi;if(none)multi=false;
      if(e.type!=='pointerup'||wasMulti||!d0||Math.hypot(e.clientX-d0[0],e.clientY-d0[1])>=6){if(none)d0=null;return}
      d0=null;var now=Date.now();
      if(tapAt&&now-tapAt<340){clearTimeout(tapTimer);tapAt=0;V.reset()}
      else{tapAt=now;tapTimer=setTimeout(function(){tapAt=0;if(_i3dLive===rec)i3dOpen(kind,id)},350)}};
    host.addEventListener('pointerup',up);host.addEventListener('pointercancel',up);   // on the tile's own box, not the canvas: the canvas is shared with the full viewer (v0.9.2)
    host.addEventListener('pointerleave',function(e){if(e.pointerType==='mouse')engaged=false});
    /* a hint chip says the tile can be turned (Pedro's review of v0.8 spec F): it fades on the first touch or after 4 s and does not come back this session. No button stack on a small tile; a tap opens the full viewer, a double tap resets */
    if(!window._i3dHintDone){var hint=document.createElement('div');hint.className='i3d-hint';
      hint.innerHTML='<svg class="vi-ic sm" aria-hidden="true"><use href="#vi-orbit"/></svg><span>Drag to turn</span>';host.appendChild(hint);
      var gone=function(){if(window._i3dHintDone)return;window._i3dHintDone=true;hint.classList.add('off');setTimeout(function(){hint.remove()},300)};
      setTimeout(gone,4000);host.addEventListener('pointerdown',gone,{once:true})}
    img.style.visibility='hidden';
    window._i3dSeen=true;[].forEach.call(document.querySelectorAll('.i3d-badge'),function(b){b.textContent='3D'});
  }).catch(function(){if(_i3dLive===rec)_i3dLive=null;});
}
/* pictures saved by an earlier build (tv below 3: the green tint, then the flat stage before v0.9.1 R17) are redrawn once, from the saved model, in the current look and at 360 px (owner, 31 Oct and 4 Nov) */
var _i3dRe={run:false,tried:{}};
function i3dRefreshThumbs(){
  if(_i3dRe.run||!viGlOk())return;
  var todo=[];[['wi',alState.otherAssets],['li',alState.liabilities]].forEach(function(g){(g[1]||[]).forEach(function(it){if(it.model&&it.model.thumb&&it.model.tv!==3&&!_i3dRe.tried[g[0]+it.id])todo.push([g[0],it])})});
  if(!todo.length)return;_i3dRe.run=true;
  (async function(){
    for(var i=0;i<todo.length;i++){var k=todo[i][0],it=todo[i][1];_i3dRe.tried[k+it.id]=1;
      try{var ver=i3dVer(k,it.id),rc=await i3dGetRec(k,it.id);if(!rc)continue;var obj=await i3dParse(rc.buf.slice(0),rc.fmt,k);i3dStyle(obj);
        it.model.thumb=i3dThumb(obj);it.model.tv=3;saveAL();i3dCachePut(k,it.id,obj,ver);   // v0.9.2: the model just read for the card's picture is kept, so opening that item reads nothing again
        [].forEach.call(document.querySelectorAll('img.i3d-thumb'),function(im){if((im.getAttribute('onclick')||'').indexOf("'"+k+"',"+it.id+",")>-1)im.src=it.model.thumb});
      }catch(e){}}
    _i3dRe.run=false;
  })();
}
/* v0.9.2: once Assets is open and an item has a 3D model, the shared viewer (renderer, stage, and the model shader in its plain and
   textured kinds) is made in an idle moment, so the first tap on a tile compiles little. Nothing is drawn on screen; it is drawn once
   into the hidden canvas. The materials are kept, so three.js keeps their compiled shaders. */
function i3dWarm(){
  if(_i3dSh&&_i3dSh.warm)return;if(!window.THREE||!THREE.OrbitControls||!viGlOk())return;
  var any=[].concat(alState.otherAssets||[],alState.liabilities||[]).some(function(it){return it.model&&it.model.thumb;});if(!any)return;
  var pg=document.getElementById('assets-page');if(!pg||!pg.offsetParent)return;
  var go=function(){if(_i3dSh&&_i3dSh.warm)return;try{var S=i3dShared();if(S.view)return;S.warm=1;
    var tx=new THREE.DataTexture(new Uint8Array([200,200,200,255]),1,1,THREE.RGBAFormat);tx.encoding=THREE.sRGBEncoding;tx.needsUpdate=true;
    var g=new THREE.BoxBufferGeometry(1,1,1),mk=[new THREE.MeshStandardMaterial({color:0x888888}),new THREE.MeshStandardMaterial({color:0xffffff,map:tx})];S.keep=mk;
    var grp=new THREE.Group();mk.forEach(function(m){var o=new THREE.Mesh(g,m);o.castShadow=o.receiveShadow=true;grp.add(o);});S.sc.add(grp);
    var cam=new THREE.PerspectiveCamera(35,1,0.02,100);cam.position.set(2.6,2,3.4);cam.lookAt(0,0.5,0);
    S.r.setDrawingBufferSize(1,1,1);S.r.render(S.sc,cam);S.sc.remove(grp);g.dispose();}catch(e){}};
  if(window.requestIdleCallback)requestIdleCallback(go,{timeout:5000});else setTimeout(go,800);
}
(function(){var _rat=window.renderAlTab;if(typeof _rat==='function')window.renderAlTab=renderAlTab=function(){i3dLiveStop();var r=_rat.apply(this,arguments);try{setTimeout(i3dRefreshThumbs,400);setTimeout(i3dWarm,600)}catch(e){}return r};})();

