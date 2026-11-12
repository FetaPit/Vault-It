function wiSearch(id){
  var a=(alState.otherAssets||[]).find(function(x){return x.id===id;});
  if(!a)return;
  var modal=document.createElement('div');
  modal.className='wi-search-modal';
  modal.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
    +'<div style="font-size:max(.6rem,var(--vi-fs-2));font-weight:700;color:var(--em);font-family:Syne,sans-serif">SEARCH IMAGE</div>'
    +'<button onclick="this.closest(\'.wi-search-modal\').remove();document.querySelector(\'.wi-icon-overlay\').remove()" style="background:none;border:none;color:var(--t3);cursor:pointer;font-size:max(.8rem,var(--vi-fs-3))"><svg class="vi-ic g" role="img" aria-label="Close"><use href="#vi-close"/></svg></button>'
    +'</div>'
    +'<div style="display:flex;gap:6px">'
    +'<input id="wi-search-inp" class="al-inp" onkeydown="if(event.key===\'Enter\')wiDoSearch('+id+')" placeholder="Search term (e.g. car, watch)" value="'+cleanSearchTerm(a.name||'')+'" style="flex:1;font-size:max(.65rem,var(--vi-fs-2))">'
    +'<button class="dep-btn" onclick="wiDoSearch('+id+')" style="padding:5px 10px;font-size:max(.6rem,var(--vi-fs-2))">Search</button>'
    +'</div>'
    +'<div class="wi-search-results" id="wi-search-res-'+id+'"><div style="font-size:max(.56rem,var(--vi-fs-2));color:var(--t3);padding:8px">Enter a term and click Search</div></div>';
  var overlay=document.createElement('div');
  overlay.className='wi-icon-overlay';
  overlay.onclick=function(){modal.remove();overlay.remove();};
  document.body.appendChild(overlay);
  document.body.appendChild(modal);
}

function liabUpload(id,input){
  var l=(alState.liabilities||[]).find(function(x){return x.id===id;});
  if(!l||!input.files||!input.files[0])return;
  var reader=new FileReader();
  reader.onload=function(e){l.image=e.target.result;l.svgIcon=null;saveAL();renderAlTab();};
  reader.readAsDataURL(input.files[0]);
}

function liabSearch(id){
  var l=(alState.liabilities||[]).find(function(x){return x.id===id;});
  if(!l)return;
  var modal=document.createElement('div');
  modal.className='wi-search-modal';
  modal.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
    +'<div style="font-size:max(.6rem,var(--vi-fs-2));font-weight:700;color:var(--em);font-family:Syne,sans-serif">SEARCH IMAGE</div>'
    +'<button onclick="this.closest(\'.wi-search-modal\').remove();document.querySelector(\'.wi-icon-overlay\').remove()" style="background:none;border:none;color:var(--t3);cursor:pointer;font-size:max(.8rem,var(--vi-fs-3))"><svg class="vi-ic g" role="img" aria-label="Close"><use href="#vi-close"/></svg></button>'
    +'</div>'
    +'<div style="display:flex;gap:6px">'
    +'<input id="wi-search-inp" class="al-inp" onkeydown="if(event.key===\'Enter\')liabDoSearch('+id+')" placeholder="Search term" value="'+cleanSearchTerm(l.name||'')+'" style="flex:1;font-size:max(.65rem,var(--vi-fs-2))">'
    +'<button class="dep-btn" onclick="liabDoSearch('+id+')" style="padding:5px 10px;font-size:max(.6rem,var(--vi-fs-2))">Search</button>'
    +'</div>'
    +'<div class="wi-search-results" id="wi-search-res-'+id+'"><div style="font-size:max(.56rem,var(--vi-fs-2));color:var(--t3);padding:8px">Enter a term and click Search</div></div>';
  var overlay=document.createElement('div');
  overlay.className='wi-icon-overlay';
  overlay.onclick=function(){modal.remove();overlay.remove();};
  document.body.appendChild(overlay);
  document.body.appendChild(modal);
}

function liabDoSearch(id){imgSearch('li',id);}

// Photo search for wealth inventory and liability tiles: Openverse (WordPress.org's library of openly licensed
// photos), called from the browser with no key. LoremFlickr used to do this but Flickr blocked it in 2024, so it
// only ever returned one default photo. The tile keeps the chosen thumbnail link and its credit line.
var OPENVERSE='https://api.openverse.org/v1/images/';
var _imgSearchBusy=0;
/* the one loading spinner for every photo search (Wealth inventory and Liabilities both come through imgSearch): ring plus "Searching…"; the ring is hidden under reduced motion */
function viSearchBusy(){return '<div class="wi-search-msg wi-search-busy" role="status"><span class="wi-spin" aria-hidden="true"></span><span>Searching…</span></div>';}
function imgSearch(kind,id){
  var inp=document.getElementById('wi-search-inp'),res=document.getElementById('wi-search-res-'+id);
  if(!inp||!res)return;
  var q=inp.value.trim();if(!q){res.innerHTML='<div class="wi-search-msg">Type what the item is, for example "electric guitar".</div>';return;}
  var gap=1100-(Date.now()-_imgSearchBusy);   // Openverse allows about one search a second without a key: wait, never drop
  if(gap>0){res.innerHTML=viSearchBusy();clearTimeout(imgSearch._t);imgSearch._t=setTimeout(function(){imgSearch(kind,id);},gap);return;}
  _imgSearchBusy=Date.now();
  res.innerHTML=viSearchBusy();
  fetch(OPENVERSE+'?q='+encodeURIComponent(q)+'&page_size=12&mature=false',{credentials:'omit'}).then(function(r){
    if(r.status===429)throw new Error('Too many searches in a row. Wait a few seconds and try again.');
    if(!r.ok)throw new Error('The photo library answered '+r.status+'. Try again in a moment, or upload your own photo.');
    return r.json();
  }).then(function(j){
    var list=(j&&j.results||[]).filter(function(x){return x&&x.id&&(x.thumbnail||x.url);});
    if(!list.length){res.innerHTML='<div class="wi-search-msg">No photos for "'+cfEsc(q)+'". Try a simpler word, like "guitar" or "watch".</div>';return;}
    res.innerHTML='';
    list.forEach(function(x){
      var src=x.thumbnail||(OPENVERSE+x.id+'/thumb/');
      var credit=(x.attribution||((x.title||'Photo')+(x.creator?' by '+x.creator:'')+(x.license?' ('+String(x.license).toUpperCase()+')':''))).slice(0,300);
      var img=document.createElement('img');img.src=src;img.alt=x.title||q;img.title=credit;img.loading='lazy';img.referrerPolicy='no-referrer';
      img.onerror=function(){img.remove();};
      img.onclick=function(){
        var it=kind==='li'?(alState.liabilities||[]).find(function(y){return y.id===id;}):(alState.otherAssets||[]).find(function(y){return y.id===id;});
        if(it){it.image=src;it.imageSearch=q;it.imageCredit=credit;it.svgIcon=null;saveAL();renderAlTab();}
        var m=img.closest('.wi-search-modal'),o=document.querySelector('.wi-icon-overlay');if(m)m.remove();if(o)o.remove();
      };
      res.appendChild(img);
    });
    var c=document.createElement('div');c.className='wi-search-msg wi-search-credit';c.textContent='Photos from Openverse. Tap one to use it; its credit is kept with the item.';res.appendChild(c);
  }).catch(function(e){res.innerHTML='<div class="wi-search-msg bad">'+cfEsc(e&&e.message&&!/fetch|network/i.test(e.message)?e.message:'Could not reach the photo library. Check your connection, or upload your own photo.')+'</div>';});
}

/* The brand block for an item with no photo (owner, 31 Oct: "Remove the childish icons ... Leave blank until user decides ...
   I like the blocks as a base"). Teal for what you own, amber for liabilities (colour code). No guess from the name: the block
   stays blank until the user picks a brand icon, which sits on its right face. */
function generateAssetISO(name,icon,tone){
  var c=tone==='liab'?'amber':'teal',v='var(--'+c+')',f=function(a){return 'fill:rgb(var(--'+c+'-rgb) / '+a+');stroke:'+v};
  var ic=icon&&VI_ITEM_ICON_SET[icon]?'<g transform="matrix(1.25 -.75 0 1.4167 50 50)"><use href="#vi-'+icon+'" x="3.5" y="3.5" width="17" height="17" style="color:'+v+'"/></g>':'';
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;width:100%;height:100%" aria-hidden="true">'
    +'<polygon points="50,14 80,32 50,50 20,32" style="'+f(.16)+';stroke-width:.9;stroke-opacity:.85"/>'
    +'<polygon points="20,32 50,50 50,84 20,66" style="'+f(.07)+';stroke-width:.9;stroke-opacity:.55"/>'
    +'<polygon points="50,50 80,32 80,66 50,84" style="'+f(.11)+';stroke-width:.9;stroke-opacity:.65"/>'
    +ic
    +'</svg>'
    +'<span class="iso-cap" style="color:'+v+'">'+cfEsc(String(name||'').substring(0,14).toUpperCase())+'</span>';
}

function cleanSearchTerm(name){
  var noise=['my','the','a','an','old','new','used','second','hand','some','few','big','small','first','good','nice','cool','great','best'];
  var lower=(name||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ');
  var words=lower.split(/\s+/).filter(function(w){return w.length>1&&noise.indexOf(w)===-1;});

  // Multi-word phrase mappings (checked first)
  var phrases=lower.replace(/\s+/g,' ').trim();
  var phraseMap={
    'honda civic':'sports car',
    'type r':'sports car',
    'civic type':'sports car',
    'ford focus':'hatchback car',
    'ford mustang':'muscle car',
    'range rover':'luxury suv',
    'tesla model':'electric car',
    'bmw m3':'sports car',
    'mercedes amg':'luxury car',
    'audi rs':'sports car',
    'porsche 911':'sports car',
    'lamborghini':'supercar',
    'ferrari':'supercar',
    'mclaren':'supercar',
    'yamaha r1':'motorcycle',
    'kawasaki ninja':'motorcycle',
    'ducati':'sports motorcycle',
    'harley davidson':'cruiser motorcycle',
    'apple watch':'smartwatch',
    'samsung galaxy':'android smartphone',
    'macbook pro':'apple laptop',
    'gaming pc':'gaming computer',
    'ps5':'playstation gaming console',
    'xbox series':'xbox gaming console'
  };
  for(var ph in phraseMap){
    if(phrases.indexOf(ph)!==-1) return phraseMap[ph];
  }

  var catMap={
    // Vehicles — cars
    car:'automobile',cars:'automobile',vehicle:'automobile',suv:'luxury suv',van:'van',
    truck:'pickup truck',hatchback:'hatchback car',saloon:'sedan car',coupe:'sports coupe',
    civic:'sports car',honda:'car',ford:'car',bmw:'car',mercedes:'luxury car',
    audi:'car',volkswagen:'car',vw:'car',toyota:'car',nissan:'car',
    // Motorcycles
    motorbike:'motorcycle',motorcycle:'motorcycle',moped:'scooter moped',scooter:'scooter',
    yamaha:'motorcycle',kawasaki:'motorcycle',ducati:'motorcycle',triumph:'motorcycle',
    // Watches
    watch:'luxury watch',watches:'luxury watch',rolex:'rolex watch',omega:'omega watch',
    patek:'patek philippe watch',audemars:'luxury watch',seiko:'seiko watch',
    // Electronics
    phone:'smartphone',iphone:'iphone smartphone',samsung:'samsung smartphone',
    laptop:'laptop computer',macbook:'apple macbook',imac:'apple imac computer',
    computer:'desktop computer',tablet:'tablet ipad',ipad:'apple ipad',
    headphones:'headphones',camera:'camera',drone:'drone',
    // Jewellery
    ring:'jewelry ring',necklace:'gold necklace',bracelet:'gold bracelet',earrings:'jewelry earrings',
    diamond:'diamond jewelry',emerald:'emerald jewelry',
    // Property & transport
    boat:'sailing yacht',yacht:'sailing yacht',jet:'private jet',plane:'aircraft',
    helicopter:'helicopter',ship:'cruise ship',
    // Investments
    btc:'bitcoin cryptocurrency',eth:'ethereum cryptocurrency',bitcoin:'bitcoin gold coin',
    crypto:'cryptocurrency',nft:'digital art nft',stock:'stock market chart',
    // Music
    guitar:'electric guitar',piano:'grand piano',violin:'violin instrument',
    bass:'bass guitar',saxophone:'saxophone instrument',
    // Property
    house:'luxury house exterior',flat:'apartment modern interior',apartment:'apartment modern interior',
    villa:'villa luxury',cottage:'cottage house',
    // Metals & commodities
    gold:'gold bullion bars',silver:'silver coins bullion',
    platinum:'platinum metal',palladium:'palladium metal',
    // Art & collectibles
    painting:'art painting gallery',artwork:'artwork gallery',sculpture:'sculpture art',
    sneakers:'sneakers shoes',trainers:'nike trainers',
    // Furniture
    sofa:'luxury sofa',chair:'designer chair',table:'dining table',bed:'luxury bedroom',
    // Other
    tv:'television',bike:'bicycle',bag:'luxury handbag',
    wine:'wine bottles',whisky:'whisky bottle'
  };

  var term=words[0]||name.split(' ')[0]||'asset';
  // Try first two words combined
  if(words.length>=2){
    var two=words[0]+' '+words[1];
    if(catMap[two]) return catMap[two];
  }
  return catMap[term]||term;
}

function wiDoSearch(id){imgSearch('wi',id);}

/* The icon library for owned items and liabilities: brand sprite icons (the brand book's line style), grouped. svgIcon keeps
   the chosen key; older saves hold an emoji, shown as the matching brand icon (or a blank block), never rewritten. */
var VI_ITEM_ICONS=[
  ['Vehicles',[['car','Car'],['motorbike','Motorbike'],['bike','Bicycle'],['boat','Boat'],['caravan','Caravan'],['plane','Plane']]],
  ['Home',[['home','Property'],['keys','Keys'],['sofa','Furniture'],['tv','TV'],['box','Contents']]],
  ['Tech',[['laptop','Laptop'],['phone','Phone'],['camera','Camera'],['gamepad','Games console']]],
  ['Valuables',[['watch','Watch'],['ring','Ring'],['gem','Jewellery'],['frame','Art'],['crown','Collectable'],['trophy','Trophy'],['metals','Precious metal'],['coins','Coins'],['crypto','Crypto']]],
  ['Hobbies',[['guitar','Instrument'],['book','Books'],['dumbbell','Fitness'],['bottle','Wine and spirits'],['shirt','Clothing'],['bag','Bag'],['paw','Pet']]],
  ['Money',[['briefcase','Business'],['bank','Bank'],['card','Card'],['piggy','Savings'],['safe','Safe'],['loan','Loan'],['shield','Insurance'],['umbrella','Cover'],['gift','Gift'],['wrench','Tools']]]
];
var VI_ITEM_ICON_SET={};VI_ITEM_ICONS.forEach(function(g){g[1].forEach(function(i){VI_ITEM_ICON_SET[i[0]]=i[1];});});
var VI_EMOJI_ICON={'🚗':'car','🏎️':'car','🚕':'car','🚙':'car','🛻':'car','🚛':'car','🚌':'car','🏍️':'motorbike','🏍':'motorbike','🛵':'motorbike','🚲':'bike','✈️':'plane','🚁':'plane','🛥️':'boat','⛵':'boat','🚢':'boat',
  '🏠':'home','🏡':'home','🏢':'home','🏰':'home','🛖':'home','🔑':'keys','🔐':'keys','🛋️':'sofa','🪑':'sofa','🛏️':'sofa','📺':'tv','📦':'box','💻':'laptop','🖥️':'laptop','📱':'phone','📷':'camera','🎥':'camera','🎮':'gamepad','🕹️':'gamepad',
  '⌚':'watch','🕰️':'watch','💍':'ring','💎':'gem','🖼️':'frame','🎨':'frame','👑':'crown','🥇':'trophy','🏅':'trophy','🎖️':'trophy','🪙':'coins','💰':'coins','🎸':'guitar','🎹':'guitar','🎺':'guitar','🎻':'guitar','🥁':'guitar','🎷':'guitar',
  '💼':'briefcase','🏦':'bank','🛡️':'shield','🎁':'gift','🔧':'wrench','⚙️':'wrench','🧰':'wrench','🔩':'wrench','🪛':'wrench','🧳':'bag'};
function viItemIcon(v){if(!v)return null;if(VI_ITEM_ICON_SET[v])return v;return VI_EMOJI_ICON[v]||VI_EMOJI_ICON[String(v).replace(/️/g,'')]||null;}
function wiIcon(id,targetList){
  var old=document.querySelector('.wi-icon-picker');if(old)old.remove();var oo=document.querySelector('.wi-icon-overlay');if(oo)oo.remove();
  var modal=document.createElement('div');modal.className='wi-icon-picker';modal.setAttribute('role','dialog');modal.setAttribute('aria-label','Choose an icon');
  modal.style.cssText='max-height:420px;overflow-y:auto;width:min(340px,calc(100vw - 24px))';
  var tl=targetList==='liab'?'liab':'';
  var opt=function(k,n){return '<button type="button" class="wi-icon-opt" data-k="'+k+'" data-n="'+n.toLowerCase()+'" title="'+n+'" onclick="wiSetIcon('+id+',\''+k+'\',\''+tl+'\')"><svg class="vi-ic" aria-hidden="true"><use href="#vi-'+k+'"/></svg><span>'+n+'</span></button>';};
  modal.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
    +'<div style="font-size:max(.6rem,var(--vi-fs-2));font-weight:700;color:var(--em);font-family:Syne,sans-serif">Choose an icon</div>'
    +'<button type="button" onclick="wiIconClose()" style="background:none;border:none;color:var(--t3);cursor:pointer"><svg class="vi-ic g" role="img" aria-label="Close"><use href="#vi-close"/></svg></button></div>'
    +'<input class="al-inp" placeholder="Filter icons" aria-label="Filter icons" style="margin-bottom:8px;font-size:max(.62rem,var(--vi-fs-2))" oninput="wiFilterIcons(this)">'
    +'<div class="wi-icon-grid"><button type="button" class="wi-icon-opt" data-k="" data-n="no icon blank" onclick="wiSetIcon('+id+',\'\',\''+tl+'\')">No icon</button></div>'
    +VI_ITEM_ICONS.map(function(g){return '<div class="wi-icon-cat" style="margin-top:8px"><div style="font-size:max(.48rem,var(--vi-fs-1));font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--t3)">'+g[0]+'</div>'
      +'<div class="wi-icon-grid">'+g[1].map(function(i){return opt(i[0],i[1]);}).join('')+'</div></div>';}).join('');
  var overlay=document.createElement('div');overlay.className='wi-icon-overlay';overlay.onclick=wiIconClose;
  document.body.appendChild(overlay);document.body.appendChild(modal);
  setTimeout(function(){var f=modal.querySelector('input');if(f)f.focus();},30);
}
function wiIconClose(){var m=document.querySelector('.wi-icon-picker'),o=document.querySelector('.wi-icon-overlay');if(m)m.remove();if(o)o.remove();}
function wiFilterIcons(inp){
  var q=String(inp&&inp.value||'').toLowerCase().trim(),m=inp.closest('.wi-icon-picker');if(!m)return;
  [].forEach.call(m.querySelectorAll('.wi-icon-opt'),function(o){o.hidden=!!q&&o.dataset.n.indexOf(q)<0&&o.dataset.k.indexOf(q)<0;});
  [].forEach.call(m.querySelectorAll('.wi-icon-cat'),function(c){c.hidden=!c.querySelector('.wi-icon-opt:not([hidden])');});
}
function wiSetIcon(id,icon,targetList){if(viBlockEdit())return;
  var list=targetList==='liab'?alState.liabilities:(alState.otherAssets||[]);
  var a=list.find(function(x){return x.id===id;});
  if(a){a.svgIcon=icon||null;if(icon)a.image=null;saveAL();renderAlTab();}
  wiIconClose();
}

function addLiability(){if(viBlockEdit())return;
  var liNameEl=document.getElementById('li-name');
  var liValEl=document.getElementById('li-val');
  if(!liNameEl||!liValEl)return;
  var n=liNameEl.value.trim();
  var v=(parseFloat(liValEl.value)||0)/(window.VI_CURRENCY_RATE||1);
  var r=parseFloat((document.getElementById('li-rate')||{}).value)||0;
  var dep=parseFloat((document.getElementById('li-dep')||{}).value)||0;
  var run=(parseFloat((document.getElementById('li-run')||{}).value)||0)/(window.VI_CURRENCY_RATE||1);
  if(!n)return;
  alState.liabilities.push({id:Date.now(),name:n,value:v,rate:r,depRate:dep,runningCost:run,addedDate:new Date().toISOString()});
  liNameEl.value='';liValEl.value='';var liRateEl=document.getElementById('li-rate');if(liRateEl)liRateEl.value='';
  var lid=document.getElementById('li-dep');if(lid)lid.value='';
  var lir=document.getElementById('li-run');if(lir)lir.value='';
  saveAL();renderAlTab();updateKPIs();
}
function delLiability(id){if(viBlockEdit())return;alState.liabilities=alState.liabilities.filter(function(l){return l.id!==id;});try{i3dDel('li',id);}catch(e){}saveAL();renderAlTab();updateKPIs();}

