/*! Vault·It 3D model picker + viewer.
 * Reads models/catalog.json (built by tools/fetch-models.mjs), lets the user attach a 3D model
 * to a Wealth Inventory asset or a liability, and view it in an orbit viewport.
 *   m3dPick('assets'|'liab', id)   open the picker for that item
 *   m3dView('assets'|'liab', id)   open the 3D viewport for the item's attached model
 *   m3dClear('assets'|'liab', id)  detach the model
 * Needs globals from index.html: alState, saveAL, renderAlTab, showToast, THREE (+GLTFLoader, OrbitControls).
 */
(function(){
'use strict';
var catalog=null,catalogP=null;
var GROUPS=[['all','All'],['assets','Assets'],['collectibles','Collectibles'],['liabilities','Liabilities']];

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function listFor(kind){return kind==='liab'?alState.liabilities:alState.otherAssets;}
function itemFor(kind,id){return (listFor(kind)||[]).find(function(x){return x.id===id;});}
// Where model files live. Set window.VAULT_MODEL_BASE before this script (index.html) to move hosts.
// Only the bundled folder or our own assets domain is accepted, so a tampered catalogue can't point elsewhere.
var BASE=(function(){
  var b=String(window.VAULT_MODEL_BASE||'models/');if(b.slice(-1)!=='/')b+='/';
  return /^(models\/|https:\/\/assets\.ptlive\.design\/[\w\-\/]*\/)$/.test(b)?b:'models/';
})();
// Catalogue paths are relative to BASE (e.g. glb/gold-bar-1a2b3c4d5e.glb). Anything else resolves to ''.
function safeUrl(rel){
  rel=String(rel||'').replace(/^models\//,'');
  return /^[\w\-]+(\/[\w\-.]+)+$/.test(rel)&&rel.indexOf('..')<0?BASE+rel:'';
}

function loadCatalog(){
  if(catalogP)return catalogP;
  catalogP=fetch(BASE+'catalog.json',{cache:'no-cache'}).then(function(r){
    if(!r.ok)throw new Error('catalogue '+r.status);return r.json();
  }).then(function(c){catalog=(c&&c.models)||[];return catalog;}).catch(function(e){catalogP=null;throw e;});
  return catalogP;
}

function css(){
  if(document.getElementById('m3d-css'))return;
  var s=document.createElement('style');s.id='m3d-css';
  s.textContent=
  '.m3d-ov{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:700}'
  +'.m3d-modal{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:701;background:#080d14;border:1px solid rgba(68,192,185,.3);border-radius:12px;padding:14px;width:min(560px,94vw);max-height:88vh;display:flex;flex-direction:column;box-shadow:0 8px 40px rgba(0,0,0,.75)}'
  +'.m3d-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;font:700 .62rem Syne,sans-serif;letter-spacing:.12em;color:var(--em,#44c0b9);text-transform:uppercase}'
  +'.m3d-x{background:none;border:none;color:var(--t3,#7d8a99);cursor:pointer;font-size:.9rem}'
  +'.m3d-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}'
  +'.m3d-tab{font:600 .52rem Syne,sans-serif;padding:4px 9px;border-radius:999px;border:1px solid rgba(68,192,185,.25);background:transparent;color:var(--t2,#a9b4c0);cursor:pointer}'
  +'.m3d-tab.on{background:rgba(68,192,185,.2);color:var(--em,#44c0b9);border-color:rgba(68,192,185,.6)}'
  +'.m3d-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:8px;overflow-y:auto;padding:2px;min-height:120px}'
  +'.m3d-card{background:rgba(6,10,18,.9);border:1px solid rgba(68,192,185,.16);border-radius:8px;padding:0;cursor:pointer;text-align:left;color:inherit;overflow:hidden}'
  +'.m3d-card:hover,.m3d-card:focus-visible{border-color:rgba(68,192,185,.7);outline:none}'
  +'.m3d-card img{width:100%;aspect-ratio:1;object-fit:cover;display:block;background:#0b1320}'
  +'.m3d-card span{display:block;padding:4px 6px;font-size:.5rem;color:var(--t2,#a9b4c0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
  +'.m3d-card small{display:block;padding:0 6px 5px;font-size:.42rem;color:var(--t3,#7d8a99)}'
  +'.m3d-note{font-size:.58rem;color:var(--t3,#7d8a99);padding:18px 6px;text-align:center;grid-column:1/-1;line-height:1.5}'
  +'.m3d-view{position:relative;width:100%;height:min(380px,55vh);border-radius:8px;overflow:hidden;border:1px solid var(--bd,#1b2735);background:#060d16}'
  +'.m3d-view canvas{width:100%;height:100%;display:block;touch-action:none}'
  +'.m3d-credit{font-size:.48rem;color:var(--t3,#7d8a99);margin-top:8px;line-height:1.5}'
  +'.m3d-credit a{color:var(--em,#44c0b9)}'
  +'.m3d-row{display:flex;gap:6px;margin-top:8px}';
  document.head.appendChild(s);
}

function shell(title){
  css();
  var ov=document.createElement('div');ov.className='m3d-ov';
  var m=document.createElement('div');m.className='m3d-modal';m.setAttribute('role','dialog');m.setAttribute('aria-label',title);
  m.innerHTML='<div class="m3d-hd"><span>'+esc(title)+'</span><button class="m3d-x" aria-label="Close">✕</button></div>';
  function close(){if(m._onClose)m._onClose();m.remove();ov.remove();document.removeEventListener('keydown',onKey);}
  function onKey(e){if(e.key==='Escape')close();}
  ov.onclick=close;m.querySelector('.m3d-x').onclick=close;document.addEventListener('keydown',onKey);
  document.body.appendChild(ov);document.body.appendChild(m);
  m._close=close;return m;
}

// ── PICKER ──────────────────────────────────────────────────
function score(model,name){
  var words=String(name||'').toLowerCase().split(/[^a-z0-9]+/).filter(function(w){return w.length>2;});
  if(!words.length)return 0;
  var hay=(model.title+' '+model.query+' '+model.kind+' '+(model.tags||[]).join(' ')).toLowerCase();
  return words.reduce(function(n,w){return n+(hay.indexOf(w)>-1?1:0);},0);
}

window.m3dPick=function(kind,id){
  var item=itemFor(kind,id);if(!item)return;
  var m=shell('Choose a 3D model');
  var group=kind==='liab'?'liabilities':'assets',q='';
  m.insertAdjacentHTML('beforeend',
    '<input class="al-inp m3d-q" type="search" placeholder="Search models (car, watch, guitar…)" style="font-size:.64rem;width:100%" value="">'
    +'<div class="m3d-tabs">'+GROUPS.map(function(g){return '<button class="m3d-tab" data-g="'+g[0]+'">'+g[1]+'</button>';}).join('')+'</div>'
    +'<div class="m3d-grid"><div class="m3d-note">Loading models…</div></div>'
    +'<div class="m3d-credit">Open-licence models (CC0 / CC-BY) via <a href="https://poly.pizza" target="_blank" rel="noopener">Poly Pizza</a>. Credits are kept with each model.</div>');
  var grid=m.querySelector('.m3d-grid'),inp=m.querySelector('.m3d-q');
  function paint(){
    Array.prototype.forEach.call(m.querySelectorAll('.m3d-tab'),function(t){t.classList.toggle('on',t.dataset.g===group);});
    if(!catalog)return;
    var needle=q.trim().toLowerCase();
    var rows=catalog.filter(function(c){
      if(group!=='all'&&(c.groups||[]).indexOf(group)<0)return false;
      if(!needle)return true;
      return (c.title+' '+c.kind+' '+c.query+' '+(c.tags||[]).join(' ')).toLowerCase().indexOf(needle)>-1;
    });
    if(!needle)rows.sort(function(a,b){return score(b,item.name)-score(a,item.name);}); // best match for the item's name first
    if(!rows.length){grid.innerHTML='<div class="m3d-note">No models match.</div>';return;}
    grid.innerHTML=rows.map(function(c,i){
      return '<button class="m3d-card" data-i="'+i+'" title="'+esc(c.title+' — '+c.creator)+'">'
        +'<img loading="lazy" alt="" src="'+esc(safeUrl(c.thumb))+'" onerror="this.style.visibility=\'hidden\'">'
        +'<span>'+esc(c.title)+'</span><small>'+esc(c.kind)+'</small></button>';
    }).join('');
    grid._rows=rows;
  }
  grid.onclick=function(e){
    var b=e.target.closest('.m3d-card');if(!b||!grid._rows)return;
    var c=grid._rows[+b.dataset.i];if(!c||!safeUrl(c.file))return;
    item.model3d={id:c.id,file:c.file,thumb:c.thumb,title:c.title,creator:c.creator,licence:c.licence,source:c.source};
    if(!item.image&&!item.svgIcon&&safeUrl(c.thumb))item.image=safeUrl(c.thumb); // thumbnail doubles as the tile picture
    saveAL();renderAlTab();m._close();
    if(typeof showToast==='function')showToast('3D model attached: '+c.title);
  };
  m.querySelector('.m3d-tabs').onclick=function(e){var t=e.target.closest('.m3d-tab');if(t){group=t.dataset.g;paint();}};
  inp.oninput=function(){q=inp.value;paint();};
  loadCatalog().then(paint).catch(function(){
    grid.innerHTML='<div class="m3d-note">The 3D model library isn\'t installed yet.<br>Run <code>node tools/fetch-models.mjs</code> and open the app from a web server (not file://).</div>';
  });
  inp.focus();
};

// ── VIEWER ──────────────────────────────────────────────────
function disposeScene(sc){
  sc.traverse(function(o){
    if(o.geometry)o.geometry.dispose();
    var ms=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];
    ms.forEach(function(mt){for(var k in mt){if(mt[k]&&mt[k].isTexture)mt[k].dispose();}mt.dispose();});
  });
}

window.m3dView=function(kind,id){
  var item=itemFor(kind,id);if(!item||!item.model3d)return;
  var md=item.model3d,url=safeUrl(md.file);
  if(!url){if(typeof showToast==='function')showToast('Model file path is invalid');return;}
  if(!window.THREE||!THREE.GLTFLoader){if(typeof showToast==='function')showToast('3D library still loading — try again');return;}
  var m=shell(item.name||md.title);
  m.insertAdjacentHTML('beforeend',
    '<div class="m3d-view"><canvas></canvas></div>'
    +'<div class="m3d-credit">“'+esc(md.title)+'” by '+esc(md.creator)+' · '+esc(md.licence)+' · <a href="'+esc(/^https:\/\/poly\.pizza\//.test(md.source)?md.source:'https://poly.pizza')+'" target="_blank" rel="noopener">source</a>. Drag to rotate, scroll or pinch to zoom.</div>'
    +'<div class="m3d-row"><button class="btn-add-data" style="flex:1" data-a="change">Change model</button><button class="btn-add-data" style="flex:1;background:transparent;border-color:var(--t3);color:var(--t3)" data-a="remove">Remove</button></div>');
  m.querySelector('[data-a=change]').onclick=function(){m._close();window.m3dPick(kind,id);};
  m.querySelector('[data-a=remove]').onclick=function(){m._close();window.m3dClear(kind,id);};

  var host=m.querySelector('.m3d-view'),canvas=host.querySelector('canvas');
  var w=host.clientWidth||400,h=host.clientHeight||300,raf=0,dead=false;
  var scene=new THREE.Scene();scene.background=new THREE.Color(0x060d16);
  scene.add(new THREE.HemisphereLight(0xffffff,0x223344,0.9));
  var key=new THREE.DirectionalLight(0x44c0b9,0.9);key.position.set(5,10,5);scene.add(key);
  var rim=new THREE.DirectionalLight(0xc9a84c,0.5);rim.position.set(-5,3,-5);scene.add(rim);
  var cam=new THREE.PerspectiveCamera(45,w/h,0.01,500);cam.position.set(3.6,2.4,4.6);
  var rend=new THREE.WebGLRenderer({canvas:canvas,antialias:true});
  rend.setPixelRatio(Math.min(window.devicePixelRatio||1,2));rend.setSize(w,h,false);
  var ctl=null;
  if(THREE.OrbitControls){ctl=new THREE.OrbitControls(cam,canvas);ctl.enableDamping=true;ctl.dampingFactor=0.08;ctl.autoRotate=!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);ctl.autoRotateSpeed=1.2;ctl.minDistance=1;ctl.maxDistance=12;}
  function tick(){if(dead)return;raf=requestAnimationFrame(tick);if(ctl)ctl.update();rend.render(scene,cam);}
  new THREE.GLTFLoader().load(url,function(g){
    if(dead){disposeScene(g.scene);return;}
    var box=new THREE.Box3().setFromObject(g.scene),size=box.getSize(new THREE.Vector3()),c=box.getCenter(new THREE.Vector3());
    g.scene.position.sub(c);var s=2.4/(Math.max(size.x,size.y,size.z)||1);g.scene.scale.setScalar(s);
    var floor=new THREE.GridHelper(6,12,0x44c0b9,0x1b2a3a);floor.position.y=-size.y*s/2;floor.material.opacity=.35;floor.material.transparent=true;
    scene.add(floor);scene.add(g.scene);
  },undefined,function(){
    host.insertAdjacentHTML('beforeend','<div class="m3d-note" style="position:absolute">Could not load this model file.</div>');
  });
  tick();
  m._onClose=function(){dead=true;cancelAnimationFrame(raf);if(ctl)ctl.dispose();disposeScene(scene);rend.dispose();};
};

window.m3dClear=function(kind,id){
  var item=itemFor(kind,id);if(!item)return;
  if(item.image&&item.model3d&&item.image===safeUrl(item.model3d.thumb))item.image=null;
  delete item.model3d;saveAL();renderAlTab();
};
})();
