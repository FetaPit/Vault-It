// ═══════════════════════════════════════════════════════════════
// STOCKS & FUNDS — editable portfolios ("pies") with live prices
// ═══════════════════════════════════════════════════════════════

// ── Investment platform per pie: automatic logo (known platforms) + manual name / uploaded logo ──
var STK_PLATFORMS=[
 {n:'Trading 212',d:'trading212.com',c:'#0a9fe6',re:/trading\s*-?\s*212|\bt212\b/i},
 {n:'Freetrade',d:'freetrade.io',c:'#1b1b3a',re:/freetrade/i},
 {n:'Hargreaves Lansdown',d:'hl.co.uk',c:'#0f6d46',re:/hargreaves|\bhl\b/i},
 {n:'AJ Bell',d:'ajbell.co.uk',c:'#f26522',re:/aj\s*bell|youinvest/i},
 {n:'Interactive Investor',d:'ii.co.uk',c:'#2b2f7f',re:/interactive\s*investor/i},
 {n:'Vanguard',d:'vanguardinvestor.co.uk',c:'#96151d',re:/vanguard/i},
 {n:'Fidelity',d:'fidelity.co.uk',c:'#368727',re:/fidelity/i},
 {n:'eToro',d:'etoro.com',c:'#13a62c',re:/etoro/i},
 {n:'Moneybox',d:'moneyboxapp.com',c:'#00a7b5',re:/moneybox/i},
 {n:'Nutmeg',d:'nutmeg.com',c:'#e30b5c',re:/nutmeg/i},
 {n:'Plum',d:'withplum.com',c:'#7b5cff',re:/^plum$|\bplum\b/i},
 {n:'Coinbase',d:'coinbase.com',c:'#0052ff',re:/coinbase/i},
 {n:'Revolut',d:'revolut.com',c:'#191c1f',re:/revolut/i},
 {n:'Robinhood',d:'robinhood.com',c:'#0aa80a',re:/robinhood/i},
 {n:'Charles Schwab',d:'schwab.com',c:'#00a0df',re:/schwab/i},
 {n:'Interactive Brokers',d:'interactivebrokers.com',c:'#d81222',re:/interactive\s*brokers|\bibkr\b/i},
 {n:'Degiro',d:'degiro.co.uk',c:'#0b8aa8',re:/degiro/i},
 {n:'IG',d:'ig.com',c:'#e8003d',re:/^ig$|\big\s*(group|trading|share)/i},
 {n:'Lightyear',d:'lightyear.com',c:'#222',re:/lightyear/i},
 {n:'Wealthify',d:'wealthify.com',c:'#6c3ce1',re:/wealthify/i},
 {n:'Chip',d:'getchip.uk',c:'#6a4cff',re:/^chip$/i},
 {n:'Scalable Capital',d:'scalable.capital',c:'#1d2df0',re:/scalable/i},
 {n:'Webull',d:'webull.com',c:'#1a73e8',re:/webull/i},
 {n:'Saxo',d:'home.saxo',c:'#0d6efd',re:/saxo/i},
 {n:'Barclays',d:'barclays.co.uk',c:'#00aeef',re:/barclays/i},
 {n:'Lloyds',d:'lloydsbank.com',c:'#006a4d',re:/lloyds/i},
 {n:'Halifax',d:'halifax.co.uk',c:'#0067b1',re:/halifax/i},
 {n:'Santander',d:'santander.co.uk',c:'#ec0000',re:/santander/i},
 {n:'HSBC',d:'hsbc.co.uk',c:'#db0011',re:/hsbc/i},
 {n:'NatWest',d:'natwest.com',c:'#5a287d',re:/natwest/i},
 {n:'Monzo',d:'monzo.com',c:'#ff4f40',re:/monzo/i},
 {n:'Starling',d:'starlingbank.com',c:'#6935d3',re:/starling/i},
 {n:'Nationwide',d:'nationwide.co.uk',c:'#00205b',re:/nationwide/i},
 {n:'Aviva',d:'aviva.co.uk',c:'#ffd100',re:/aviva/i},
 {n:'Standard Life',d:'standardlife.co.uk',c:'#00a3a1',re:/standard\s*life/i},
 {n:'Bestinvest',d:'bestinvest.co.uk',c:'#00a5a8',re:/bestinvest/i},
 {n:'Quilter',d:'quilter.com',c:'#005cb9',re:/quilter/i},
 /* owner, 31 Oct: logos for all major banks and investment platforms, applied from each account's name. Brands that are also
    everyday words (Wise, Curve, Marcus, Tandem, Tesco, Sainsbury's) match only as the whole name or with an account word */
 {n:'InvestEngine',d:'investengine.com',c:'#2a2aff',re:/invest\s*engine/i},
 {n:'PensionBee',d:'pensionbee.com',c:'#ffcc00',re:/pension\s*bee/i},
 {n:'Moneyfarm',d:'moneyfarm.com',c:'#0a2d5c',re:/moneyfarm/i},
 {n:'Charles Stanley',d:'charles-stanley.co.uk',c:'#00263e',re:/charles\s*stanley/i},
 {n:'CMC Markets',d:'cmcmarkets.com',c:'#00a3e0',re:/\bcmc\b/i},
 {n:'Plus500',d:'plus500.com',c:'#0f2a4a',re:/plus\s*500/i},
 {n:'Dodl',d:'dodl.co.uk',c:'#111',re:/\bdodl\b/i},
 {n:'Scottish Widows',d:'scottishwidows.co.uk',c:'#00205b',re:/scottish\s*widows/i},
 {n:'Royal London',d:'royallondon.com',c:'#d6001c',re:/royal\s*london/i},
 {n:'Legal & General',d:'legalandgeneral.com',c:'#0a2540',re:/legal\s*(&|and)?\s*general|\bl&g\b/i},
 {n:'Nest',d:'nestpensions.org.uk',c:'#e5007e',re:/^\s*nest\s*$|\bnest\s*(pension|workplace)/i},
 {n:'Prudential',d:'pru.co.uk',c:'#ed1b2e',re:/prudential|\bpru\b/i},
 {n:'Bank of Scotland',d:'bankofscotland.co.uk',c:'#003478',re:/bank\s*of\s*scotland/i},
 {n:'Royal Bank of Scotland',d:'rbs.co.uk',c:'#0a2f5c',re:/royal\s*bank\s*of\s*scotland|\brbs\b/i},
 {n:'Ulster Bank',d:'ulsterbank.co.uk',c:'#003479',re:/ulster\s*bank/i},
 {n:'First Direct',d:'firstdirect.com',c:'#000',re:/first\s*direct/i},
 {n:'TSB',d:'tsb.co.uk',c:'#00a3e0',re:/\btsb\b/i},
 {n:'Metro Bank',d:'metrobankonline.co.uk',c:'#e4002b',re:/metro\s*bank/i},
 {n:'Virgin Money',d:'virginmoney.com',c:'#cc0000',re:/virgin\s*money/i},
 {n:'Co-operative Bank',d:'co-operativebank.co.uk',c:'#00b1e7',re:/co-?operative\s*bank|\bco-?op\s*bank/i},
 {n:'Chase',d:'chase.co.uk',c:'#117aca',re:/\bchase\b/i},
 {n:'Kroo',d:'kroo.com',c:'#000',re:/\bkroo\b/i},
 {n:'Zopa',d:'zopa.com',c:'#3a1d6e',re:/\bzopa\b/i},
 {n:'Marcus',d:'marcus.co.uk',c:'#0a2240',re:/marcus\s*(by\s*)?goldman|^\s*marcus(\s+(account|card|bank|savings?|saver|isa|current|easy|access|instant|jar|pot|balance|gbp|eur|usd|fixed|bonus|cashback|credit|rate|interest|\d+))*\s*$/i},
 {n:'Atom bank',d:'atombank.co.uk',c:'#2b1a5a',re:/atom\s*bank/i},
 {n:'Tandem',d:'tandem.co.uk',c:'#003a5d',re:/tandem\s*bank|^\s*tandem(\s+(account|card|bank|savings?|saver|isa|current|easy|access|instant|jar|pot|balance|gbp|eur|usd|fixed|bonus|cashback|credit|rate|interest|\d+))*\s*$/i},
 {n:'Tesco Bank',d:'tescobank.com',c:'#00539f',re:/tesco\s*(bank|savings?|saver|credit|isa|clubcard\s*(credit|plus))/i},
 {n:"Sainsbury's Bank",d:'sainsburysbank.co.uk',c:'#f06c00',re:/sainsbury'?s?\s*(bank|savings?|saver|credit|isa)/i},
 {n:'M&S Bank',d:'bank.marksandspencer.com',c:'#000',re:/\bm\s*&\s*s\b|marks\s*(&|and)\s*spencer/i},
 {n:'NS&I',d:'nsandi.com',c:'#5c2483',re:/ns\s*&\s*i|\bnsandi\b|premium\s*bonds|national\s*savings/i},
 {n:'Post Office',d:'postoffice.co.uk',c:'#e60000',re:/post\s*office/i},
 {n:'Yorkshire Building Society',d:'ybs.co.uk',c:'#0d2c6c',re:/yorkshire\s*(bs|building)|\bybs\b/i},
 {n:'Coventry Building Society',d:'coventrybuildingsociety.co.uk',c:'#00205b',re:/coventry\s*(bs|building)/i},
 {n:'Skipton Building Society',d:'skipton.co.uk',c:'#00205b',re:/skipton/i},
 {n:'Leeds Building Society',d:'leedsbuildingsociety.co.uk',c:'#00843d',re:/leeds\s*(bs|building)/i},
 {n:'Principality',d:'principality.co.uk',c:'#e2001a',re:/principality/i},
 {n:'Al Rayan Bank',d:'alrayanbank.co.uk',c:'#7b2d26',re:/al\s*rayan/i},
 {n:'Investec',d:'investec.com',c:'#00205b',re:/investec/i},
 {n:'Shawbrook',d:'shawbrook.co.uk',c:'#e5007d',re:/shawbrook/i},
 {n:'Paragon Bank',d:'paragonbank.co.uk',c:'#00205b',re:/paragon/i},
 {n:'Close Brothers',d:'closebrothers.com',c:'#00205b',re:/close\s*brothers/i},
 {n:'Danske Bank',d:'danskebank.co.uk',c:'#003755',re:/danske/i},
 {n:'Wise',d:'wise.com',c:'#9fe870',re:/^\s*wise(\s+(account|card|bank|savings?|saver|isa|current|easy|access|instant|jar|pot|balance|gbp|eur|usd|fixed|bonus|cashback|credit|rate|interest|\d+))*\s*$|transferwise/i},
 {n:'PayPal',d:'paypal.com',c:'#003087',re:/paypal/i},
 {n:'Curve',d:'curve.com',c:'#000',re:/^\s*curve(\s+(account|card|bank|savings?|saver|isa|current|easy|access|instant|jar|pot|balance|gbp|eur|usd|fixed|bonus|cashback|credit|rate|interest|\d+))*\s*$/i},
 {n:'American Express',d:'americanexpress.com',c:'#006fcf',re:/american\s*express|\bamex\b/i},
 {n:'Barclaycard',d:'barclaycard.co.uk',c:'#00aeef',re:/barclaycard/i}
];
function stkPlatformMatch(t){t=String(t||'').trim();if(!t)return null;var best=null;
  /* the longest brand name that matches wins, so "Barclaycard" beats "Barclays" and "Bank of Scotland" beats a bare "Scotland" */
  for(var i=0;i<STK_PLATFORMS.length;i++)if(STK_PLATFORMS[i].re.test(t)&&(!best||STK_PLATFORMS[i].n.length>best.n.length))best=STK_PLATFORMS[i];return best;}
/* a cash account's logo from its name: the bank's own logo (Google's logo service, named in the privacy notice), its initials
   when offline, or the brand bank icon when the name is not a known bank */
function viBankLogo(name){
  var m=stkPlatformMatch(name);
  if(!m)return '<span class="cash-logo cash-logo-none" title="Bank account"><svg class="vi-ic" aria-hidden="true"><use href="#vi-bank"/></svg></span>';
  return '<span class="cash-logo" title="'+stkEsc(m.n)+'"><img alt="'+stkEsc(m.n)+'" loading="lazy" referrerpolicy="no-referrer" src="https://www.google.com/s2/favicons?domain='+m.d+'&sz=64" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><span class="cash-mono" style="display:none">'+stkMono(m.n,m.c)+'</span></span>';
}

var STK_PROVIDERS=[
 {n:'BlackRock (iShares)',d:'ishares.com',c:'#111',re:/ishares|black\s*rock/i},
 {n:'Vanguard',d:'vanguardinvestor.co.uk',c:'#96151d',re:/vanguard/i},
 {n:'Fidelity',d:'fidelity.co.uk',c:'#368727',re:/fidelity/i},
 {n:'HSBC',d:'hsbc.co.uk',c:'#db0011',re:/hsbc/i},
 {n:'Legal & General',d:'lgim.com',c:'#0a2540',re:/legal\s*(&|and)?\s*general|\bl&g\b|\blgim\b/i},
 {n:'Invesco',d:'invesco.com',c:'#0a3a8a',re:/invesco/i},
 {n:'SPDR (State Street)',d:'ssga.com',c:'#0b4ea2',re:/spdr|state\s*street/i},
 {n:'Amundi',d:'amundi.com',c:'#0050a0',re:/amundi|lyxor/i},
 {n:'Xtrackers (DWS)',d:'dws.com',c:'#0b2d6b',re:/xtrackers|\bdws\b/i},
 {n:'VanEck',d:'vaneck.com',c:'#1d4e89',re:/vaneck/i},
 {n:'WisdomTree',d:'wisdomtree.eu',c:'#00a0b0',re:/wisdomtree/i},
 {n:'Schroders',d:'schroders.com',c:'#0a8a5a',re:/schroder/i},
 {n:'abrdn',d:'abrdn.com',c:'#4b0082',re:/abrdn|aberdeen/i},
 {n:'Baillie Gifford',d:'bailliegifford.com',c:'#0a3d62',re:/baillie/i},
 {n:'Jupiter',d:'jupiteram.com',c:'#2a5caa',re:/jupiter/i},
 {n:'J.P. Morgan',d:'jpmorgan.com',c:'#5b3a29',re:/j\.?\s?p\.?\s*morgan|\bjpm\b/i},
 {n:'Janus Henderson',d:'janushenderson.com',c:'#e07b00',re:/janus|henderson/i},
 {n:'Royal London',d:'rlam.com',c:'#d6001c',re:/royal\s*london/i},
 {n:'ARK Invest',d:'ark-funds.com',c:'#111',re:/\bark\b/i},
 {n:'Global X',d:'globalxetfs.eu',c:'#e8562a',re:/global\s*x/i},
 {n:'Rathbones',d:'rathbones.com',c:'#00587c',re:/rathbone/i}
];
function stkProviderMatch(t){t=String(t||'').trim();if(!t)return null;for(var i=0;i<STK_PROVIDERS.length;i++)if(STK_PROVIDERS[i].re.test(t))return STK_PROVIDERS[i];return null;}
function stkMini(domain,label,color){
  var ini=stkMono(label,color);
  return '<span class="stk-mini-logo">'+(domain?'<img alt="" loading="lazy" referrerpolicy="no-referrer" src="https://www.google.com/s2/favicons?domain='+domain+'&sz=32" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><span style="display:none;width:100%;height:100%">'+ini+'</span>':ini)+'</span>';
}
// "BlackRock · on Monzo" line under a holding's name
function stkHoldMeta(h){
  var out='';
  if(h.provider){var m=stkProviderMatch(h.provider);out+='<span class="stk-meta-i">'+stkMini(m&&m.d,h.provider,m&&m.c)+stkEsc(h.provider)+'</span>';}
  if(h.platform){var pm=stkPlatformMatch(h.platform);out+='<span class="stk-meta-i">'+(out?'· ':'')+'on '+stkMini(pm&&pm.d,h.platform,pm&&pm.c)+stkEsc(h.platform)+'</span>';}
  return out?'<div class="stk-meta">'+out+'</div>':'';
}
function stkMonoColor(n){var h=0;for(var i=0;i<n.length;i++)h=(h*31+n.charCodeAt(i))>>>0;return 'hsl('+(h%360)+',55%,38%)';}
function stkMono(name,color){
  var w=String(name||'?').trim().split(/\s+/).filter(Boolean),ini=(w.length>1?w[0][0]+w[1][0]:String(name||'?').trim().slice(0,2)).toUpperCase();
  var bg=color||stkMonoColor(String(name||''));
  return '<span class="stk-mono" style="background:'+bg+';color:'+stkInkFor(bg)+'">'+stkEsc(ini)+'</span>';
}
// white or dark ink, whichever reads better on this background (hex or hsl(h,s%,l%)); at least 4.5:1 on the colours used here
function stkInkFor(bg){
  var rgb=null,m;
  if(/^#/.test(bg))rgb=stkHexRgb(bg);
  else if((m=/hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%/.exec(bg))){var h=+m[1]/360,sa=+m[2]/100,l=+m[3]/100,q=l<.5?l*(1+sa):l+sa-l*sa,pp=2*l-q,f=function(t){t=(t+1)%1;return t<1/6?pp+(q-pp)*6*t:t<.5?q:t<2/3?pp+(q-pp)*(2/3-t)*6:pp;};rgb=[f(h+1/3),f(h),f(h-1/3)].map(function(v){return Math.round(v*255);});}
  if(!rgb)return '#fff';
  var L=stkLum(rgb);return (1.05/(L+.05))>=((L+.05)/.0559)?'#fff':'#0b1018';
}
// the little logo badge for a pie: your uploaded logo, else the platform's own logo, else a coloured monogram
function stkLogoBadge(pie,full){
  var pl=pie&&pie.platform;if(!pl||!(pl.name||pl.logo))return '';
  var m=stkPlatformMatch(pl.name),inner;
  if(pl.logo&&/^data:image\//.test(pl.logo))inner='<img alt="" src="'+stkEsc(pl.logo)+'">';
  else if(m)inner='<img alt="" loading="lazy" referrerpolicy="no-referrer" src="https://www.google.com/s2/favicons?domain='+m.d+'&sz=64" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">'+'<span style="display:none;width:100%;height:100%">'+stkMono(pl.name,m.c)+'</span>';
  else inner=stkMono(pl.name);
  var badge='<span class="stk-plat" title="'+stkEsc(pl.name||'Platform')+'">'+inner+'</span>';
  return full?'<span class="stk-main-logo">'+stkEsc(pl.name||'')+badge+'</span>':badge;
}
function stkPlatformAuto(){   // pies named after a known platform get its logo automatically
  (alState.stockPies||[]).forEach(function(p){if(!p.platform){var m=stkPlatformMatch(p.name);if(m)p.platform={name:m.n,auto:true};}});
}
var _platEdit=null;
function stkPlatformEdit(){
  stkEnsure();var p=alState.stockPies.find(function(x){return x.id===alState.activePie;});if(!p){showToast('Pick a pie first');return;}
  _platEdit={id:p.id,logo:(p.platform&&p.platform.logo)||undefined,name:(p.platform&&p.platform.name)||''};stkPlatformEditRender();
}
function stkPlatformEditRender(){
  var o=document.getElementById('stk-shot-ov');if(!o){o=document.createElement('div');o.id='stk-shot-ov';o.className='stk-shot-ov';document.body.appendChild(o);}
  var p=alState.stockPies.find(function(x){return x.id===_platEdit.id;})||{};
  var preview=stkLogoBadge({platform:{name:_platEdit.name,logo:_platEdit.logo}});
  o.innerHTML='<div class="stk-shot" style="width:min(460px,100%)"><div class="stk-shot-hd"><span>🏦 Platform for “'+stkEsc(p.name||'')+'”</span><span style="cursor:pointer" onclick="stkShotClose()"><svg class="vi-ic g" role="img" aria-label="Close"><use href="#vi-close"/></svg></span></div>'
    +'<div class="stk-shot-bd"><div style="margin-bottom:8px">Type the platform name. Known ones (Trading 212, Freetrade, Hargreaves Lansdown, Vanguard…) get their logo automatically. You can also upload your own logo.</div>'
    +'<datalist id="stk-plat-list">'+STK_PLATFORMS.map(function(x){return'<option value="'+stkEsc(x.n)+'">';}).join('')+'</datalist>'
    +'<input id="stk-plat-name" list="stk-plat-list" type="text" maxlength="40" placeholder="Platform name, e.g. Trading 212" value="'+stkEsc(_platEdit.name)+'" oninput="_platEdit.name=this.value;document.getElementById(\'stk-plat-prev\').innerHTML=stkLogoBadge({platform:{name:_platEdit.name,logo:_platEdit.logo}})" style="width:100%;background:rgb(var(--panel-rgb) / .8);border:1px solid rgb(var(--teal-rgb) / .25);border-radius:4px;color:var(--text);font-size:13px;padding:8px;margin:6px 0">'
    +'<div style="display:flex;align-items:center;gap:12px;margin:10px 0"><span id="stk-plat-prev" style="position:relative;display:inline-block;width:44px;height:44px">'+preview.replace('class="stk-plat"','class="stk-plat" style="position:static;width:44px;height:44px;border-radius:11px"')+'</span>'
    +'<button class="stk-btn" onclick="document.getElementById(\'stk-plat-file\').click()">⬆ Upload logo</button>'
    +(_platEdit.logo?'<button class="stk-btn" onclick="_platEdit.logo=undefined;stkPlatformEditRender()">Use automatic logo</button>':'')
    +'<input type="file" id="stk-plat-file" accept="image/*" style="display:none" onchange="stkPlatformFile(this)"></div></div>'
    +'<div class="stk-shot-ft"><button class="stk-btn" style="margin-right:auto" onclick="stkPlatformSave(true)">Remove</button><button class="stk-btn" onclick="stkShotClose()">Cancel</button><button class="btn-add-data" onclick="stkPlatformSave(false)">Save</button></div></div>';
}
function stkPlatformFile(inp){
  var f=inp.files&&inp.files[0];inp.value='';if(!f)return;
  var img=new Image(),u=URL.createObjectURL(f);
  img.onload=function(){var sc=Math.min(1,96/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*sc));c.height=Math.max(1,Math.round(img.height*sc));c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(u);var d=c.toDataURL('image/png');if(d.length>60000)d=c.toDataURL('image/jpeg',0.8);_platEdit.logo=d;stkPlatformEditRender();};
  img.onerror=function(){URL.revokeObjectURL(u);showToast('That image could not be read');};
  img.src=u;
}
function stkPlatformSave(remove){if(viBlockEdit())return;
  var p=alState.stockPies.find(function(x){return x.id===_platEdit.id;});if(!p)return;
  var name=viClean(String((document.getElementById('stk-plat-name')||{}).value||_platEdit.name||'').trim()).slice(0,40);
  if(remove||(!name&&!_platEdit.logo))delete p.platform,p.platformOff=true;
  else{p.platform={name:name};if(_platEdit.logo)p.platform.logo=_platEdit.logo;delete p.platformOff;}
  stkShotClose();stkSave();showToast(p.platform?'Platform saved ✓':'Platform removed');
}
function stkEnsure(){
  if(!alState.stocks)alState.stocks=[];
  if(!alState.stockPies||!alState.stockPies.length)alState.stockPies=[{id:1,name:'My Portfolio'}];
  if(alState.activePie!=='all'&&!alState.stockPies.some(function(p){return p.id===alState.activePie;}))alState.activePie=alState.stockPies[0].id;
  alState.stockPies.forEach(function(p){if(!p.platform&&!p.platformOff){var m=stkPlatformMatch(p.name);if(m)p.platform={name:m.n,auto:true};}});
}
function stkEsc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
// Holdings with no live price fall back to cost so net worth never silently drops to £0.
function stkPrice(h){return (+h.price>0)?+h.price:stkBasis(h);}
function stkValue(h){return (+h.units||0)*stkPrice(h);}
// v0.9.1 E17: returns are judged from when the holding was added (owner, Q8). The basis per unit is the average cost
// the user typed or imported (avgCost, never rewritten here) or else the price when it was added (addPx, recorded once).
function stkBasis(h){return (+h.avgCost>0)?+h.avgCost:((+h.addPx>0)?+h.addPx:0);}
// A basis over 3x today's price is almost always pence typed as pounds or a total typed as a unit cost: nudge, don't show a loss.
function stkSuspect(h){var b=stkBasis(h),p=+h.price;return b>0&&p>0&&b>3*p;}
// Value, invested and change over the holdings with a usable basis; the rest are listed in `left` with why.
function stkReturns(hs){
  var r={value:0,invested:0,change:0,total:0,counted:[],left:[],leftValue:0,suspect:0,noBasis:0};
  (hs||[]).forEach(function(h){
    if(!((+h.units||0)>0))return;
    var v=stkValue(h);r.total+=v;
    if(stkSuspect(h)){r.left.push({sym:h.sym,why:'cost'});r.suspect++;r.leftValue+=v;return;}
    var b=stkBasis(h);
    if(!(b>0)){r.left.push({sym:h.sym,why:'none'});r.noBasis++;r.leftValue+=v;return;}
    r.counted.push(h);r.value+=v;r.invested+=h.units*b;
  });
  r.change=r.value-r.invested;
  return r;
}
// Tile figures in pence under £10,000, whole pounds above; change is taken from the shown parts so the tiles always add up.
function stkTileMoney(total,valC,inv){
  var rate=window.VI_CURRENCY_RATE||1,sym=window.VI_CURRENCY_SYMBOL||'£',dp=Math.abs(total*rate)<10000?2:0,k=dp?100:1;
  var q=function(n){return Math.round((isNaN(n)||n==null?0:n)*rate*k);};
  var f=function(u,sign){var a=Math.abs(u)/k;return (u<0?(sign?'−':'-'):(sign&&u>0?'+':''))+sym+a.toLocaleString('en-GB',{minimumFractionDigits:dp,maximumFractionDigits:dp});};
  var vP=q(valC),iP=q(inv),cP=vP-iP;
  return{val:f(q(total)),inv:f(iP),chg:f(cP,true),chgN:cP/k/rate,chgP:cP,invP:iP};
}
// The first price seen after adding (live or the user's own) becomes the entry price of the units still waiting for one.
function stkResolveEntry(h){
  var pu=+h.addPendU||0;if(!(pu>0))return;
  if(+h.avgCost>0){delete h.addPendU;delete h.addPendAt;return;}
  var p=+h.price;if(!(p>0)||!(h.manualPrice||(+h.updated||0)>=(+h.addPendAt||0)))return;
  var u=+h.units||0;pu=Math.min(pu,u);var ku=u-pu;
  h.addPx=(ku>0&&+h.addPx>0)?(ku*h.addPx+pu*p)/u:p;
  delete h.addPendU;delete h.addPendAt;
}
function alTotalStocks(){return (alState.stocks||[]).reduce(function(s,h){return s+stkValue(h);},0);}
function stkVisible(){
  stkEnsure();
  return alState.activePie==='all'?alState.stocks:alState.stocks.filter(function(h){return h.pie===alState.activePie;});
}
function stkPieName(id){var p=(alState.stockPies||[]).find(function(x){return x.id===id;});return p?p.name:'';}
function stkToGBP(px,ccy){
  px=+px;if(!(px>0))return null;
  if(ccy==='GBp'||ccy==='GBX')return px/100;
  if(!ccy||ccy==='GBP')return px;
  var rates={};try{rates=JSON.parse(localStorage.getItem('vi_fx_rates')||'{}');}catch(e){}
  var r=rates[ccy]||(typeof _fxRates!=='undefined'?_fxRates[ccy]:0);
  return r>0?px/r:null;
}
function stkAgo(ts){
  if(!ts)return '';
  var m=Math.round((Date.now()-ts)/60000);
  return m<1?'just now':m<60?m+'m ago':m<1440?Math.round(m/60)+'h ago':Math.round(m/1440)+'d ago';
}
function stkSave(){if(viBlockEdit())return;(alState.stocks||[]).forEach(stkResolveEntry);saveAL();if(typeof updateKPIs==='function')updateKPIs();stkRender();if(typeof renderSummaryCards==='function')try{renderSummaryCards();}catch(e){}}

// ── donut ──
function stkDonut(slices,total,top,sub,subCol,label){
  var R=58,C=2*Math.PI*R,off=0,out='<svg width="150" height="150" viewBox="0 0 150 150" role="img" aria-label="'+(label||'Portfolio allocation')+'">'
    +'<circle cx="75" cy="75" r="'+R+'" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="16"/>';
  if(total>0)slices.forEach(function(s){
    var len=s.v/total*C;
    out+='<circle cx="75" cy="75" r="'+R+'" fill="none" stroke="'+s.c+'" stroke-width="16" stroke-dasharray="'+Math.max(0,len-1.5).toFixed(2)+' '+(C-Math.max(0,len-1.5)).toFixed(2)+'" stroke-dashoffset="'+(-off).toFixed(2)+'" transform="rotate(-90 75 75)"><title>'+stkEsc(s.t)+' '+(s.v/total*100).toFixed(1)+'%</title></circle>';
    off+=len;
  });
  out+='<text x="75" y="'+(sub?71:79)+'" text-anchor="middle" font-family="Syne,sans-serif" font-weight="800" font-size="14" style="fill:var(--tx,#fff)">'+top+'</text>';
  if(sub)out+='<text x="75" y="92" text-anchor="middle" font-family="Share Tech Mono,monospace" font-size="12" fill="'+(subCol||'#8fb4b1')+'">'+sub+'</text>';
  return out+'</svg>';
}
function stkRender(){
  stkEnsure();
  var pies=document.getElementById('stk-pies');
  if(!pies)return;
  var tot=document.getElementById('subtab-total-stocks');if(tot)tot.textContent=gbpFmt(alTotalStocks());
  // pie chips
  var chips='<button class="stk-pie'+(alState.activePie==='all'?' on':'')+'" onclick="stkSelectPie(\'all\')">All investments <span>'+gbpFmt(alTotalStocks())+'</span></button>';
  alState.stockPies.forEach(function(p){
    var v=alState.stocks.filter(function(h){return h.pie===p.id;}).reduce(function(s,h){return s+stkValue(h);},0);
    chips+='<button class="stk-pie'+(alState.activePie===p.id?' on':'')+'" onclick="stkSelectPie('+p.id+')">'+(p.kind==='fund'?'<em class="stk-tag">FUND</em>':'')+stkEsc(p.name)+' <span>'+gbpFmt(v)+'</span>'+stkLogoBadge(p)+'</button>';
  });
  chips+='<button class="stk-pie add" onclick="stkNewPie()">+ New pie</button><button class="stk-pie add" style="border-style:solid" title="Search a fund, ETF or share by name or ISIN, and say who provides it and where you hold it" onclick="stkAddFundOpen()"><svg class="vi-ic g" aria-hidden="true"><use href="#vi-plus"/></svg> Add fund / share</button>';
  if(alState.activePie!=='all')chips+='<button class="stk-mini" title="Set the investment platform and logo" onclick="stkPlatformEdit()">🏦</button><button class="stk-mini" title="Rename this pie" onclick="stkRenamePie()"><svg class="vi-ic g" role="img" aria-label="Edit"><use href="#vi-edit"/></svg></button><button class="stk-mini" title="Delete this pie" onclick="stkDeletePie()"><svg class="vi-ic g" role="img" aria-label="Close"><use href="#vi-close"/></svg></button>';
  pies.innerHTML=chips;

  var hs=stkVisible().slice().sort(function(a,b){return stkValue(b)-stkValue(a);});
  var total=hs.reduce(function(s,h){return s+stkValue(h);},0);
  // returns (E17): judged from when each holding was added; holdings with no entry price or a doubtful cost are left out and named
  var rr=stkReturns(hs),tm=stkTileMoney(total,rr.value,rr.invested),ret=tm.chgN,up=ret>=0,hasRet=rr.counted.length>0;
  var nm=function(w){var l=rr.left.filter(function(x){return x.why===w;});return l.length<=2?l.map(function(x){return stkEsc(x.sym);}).join(' and '):l.length;};
  var leftTxt=(rr.suspect?nm('cost')+' left out: check '+(rr.suspect===1?'its':'their')+' average cost':'')+(rr.suspect&&rr.noBasis?' · ':'')+(rr.noBasis?nm('none')+(rr.noBasis===1?' has':' have')+' no entry price yet':'');
  var dayChg=hs.reduce(function(s,h){var v=stkValue(h),c=+h.change||0;return s+(c?v-v/(1+c/100):0);},0);
  var dayPct=total>0?dayChg/(total-dayChg)*100:0;
  var slices=hs.filter(function(h){return stkValue(h)>0;}).map(function(h,i){return{v:stkValue(h),c:STK_COLORS[i%STK_COLORS.length],t:h.sym};});
  var main=document.getElementById('stk-main');
  if(main){
    var dUp=dayChg>=0;
    var _ap=alState.activePie!=='all'?alState.stockPies.find(function(x){return x.id===alState.activePie;}):null;
    main.innerHTML=(_ap?'<div class="stk-toolbar"><span class="stk-tb-t">'+(_ap.kind==='fund'?'<em class="stk-tag">FUND</em>':'')+stkEsc(_ap.name)+'</span><button class="stk-btn" onclick="stkPlatformEdit()">🏦 Platform &amp; logo</button><button class="stk-btn" onclick="stkRenamePie()"><svg class="vi-ic g" aria-hidden="true"><use href="#vi-edit"/></svg> Rename</button><button class="stk-btn" style="border-color:rgb(var(--red-rgb) / .5);color:var(--red)" onclick="stkDeletePie()">🗑 Delete '+(_ap.kind==='fund'?'fund':'pie')+'</button></div>'+stkFundControls(_ap,hs):'')+(_ap?stkLogoBadge(_ap,true):'')+'<div>'+stkDonut(slices,total,gbpFmt(total),(hasRet&&tm.invP>0)?((up?'+':'')+(tm.chgP/tm.invP*100).toFixed(2)+'%'):'',up?'#3ecf8e':'#e05c5c')+'</div>'
      +'<div class="stk-stats">'
      +'<div class="stk-stat"><div class="l">Current value</div><div class="v">'+tm.val+'</div><div class="s">'+((_ap&&_ap.kind==='fund'&&hs.length===1)?'<b style="color:var(--gold)">'+(+hs[0].units||0).toLocaleString('en-GB',{maximumFractionDigits:4})+' units owned</b>'+(stkPrice(hs[0])>0?' × £'+stkPrice(hs[0]).toFixed(2):''):hs.length+' holding'+(hs.length===1?'':'s'))+' · counts towards net worth</div></div>'
      +'<div class="stk-stat"><div class="l">Invested (at the time you added it)</div><div class="v">'+(hasRet?tm.inv:'–')+'</div><div class="s">'+(hasRet?(leftTxt||'what your holdings cost when you added them'):(leftTxt||'add a holding to see what went in'))+'</div></div>'
      +'<div class="stk-stat" style="background:'+(hasRet?(tm.chgP===0?'rgb(var(--teal-rgb) / .06)':up?'rgb(var(--green-rgb) / .07)':'rgb(var(--red-rgb) / .08)'):'rgb(var(--teal-rgb) / .06)')+'"><div class="l">Change since you added it</div><div class="v" style="color:'+(hasRet&&tm.chgP!==0?(up?'var(--green)':'var(--red)'):'var(--t3)')+'">'+(hasRet?tm.chg:'–')+'</div><div class="s">'+(hasRet?(rr.left.length?'on '+rr.counted.length+' of '+(rr.counted.length+rr.left.length)+' holdings':(tm.invP>0?((tm.chgP>=0?'+':'')+(tm.chgP/tm.invP*100).toFixed(1)+'% on what you put in'):'')):'shows once a holding has a price')+'</div></div>'
      +'<div class="stk-stat"><div class="l">Today</div><div class="v" style="color:'+(dayChg?(dUp?'var(--green)':'var(--red)'):'var(--t3)')+'">'+(dayChg?((dUp?'+':'−')+cfMoney(Math.abs(dayChg))):'–')+'</div><div class="s">'+(dayChg?((dUp?'+':'')+dayPct.toFixed(2)+'% since yesterday'):'refresh for live moves')+'</div></div>'
      +'</div>';
  }
  // status
  var st=document.getElementById('stk-status');
  if(st){
    var live=hs.filter(function(h){return h.updated&&!h.manualPrice;});
    var latest=live.reduce(function(m,h){return Math.max(m,h.updated);},0);
    if(!hs.length)st.innerHTML='<i style="background:var(--muted)"></i><span>Add your first holding below, or import a CSV from Trading 212, to start tracking live prices.</span>';
    else if(window._stkBusy)st.innerHTML='<i style="background:var(--gold)"></i><span>Fetching live prices…</span>';
    else if(latest)st.innerHTML='<i style="background:var(--green)"></i><span>Live prices via '+stkEsc(alState.stockSrc||'price feed')+' · updated '+stkAgo(latest)+'</span>';
    else if(hs.some(function(h){return h.manualPrice&&+h.price>0;}))st.innerHTML='<i style="background:var(--gold)"></i><span>Using your manual price for '+hs.filter(function(h){return h.manualPrice&&+h.price>0;}).map(function(h){return stkEsc(h.sym);}).join(', ')+'. It counts towards your totals and net worth.</span>';
    else st.innerHTML='<i style="background:var(--orange)"></i><span>No live price yet, so valued at cost until prices load. Tap “Refresh prices”, or type a price yourself.</span>';
  }
  // holdings table
  var ht=document.getElementById('stk-holdings');
  if(ht){
    if(!hs.length)ht.innerHTML='<div style="font-size:max(.58rem,var(--vi-fs-2));color:var(--t3);text-align:center;padding:18px">No holdings in '+(alState.activePie==='all'?'any pie':'this pie')+' yet.</div>';
    else ht.innerHTML='<div class="stk-tbl"><div class="stk-row h"><span>Holding</span><span>Units</span><span>Avg cost £</span><span>Price £</span><span style="text-align:right">Value</span><span style="text-align:right">P/L</span><span></span></div>'
      +stkGroups(hs).map(function(g){var open=stkGrpOpen(g.p.id);
        return '<div class="stk-grp'+(open?' open':'')+'"><button type="button" class="stk-gh" aria-expanded="'+open+'" onclick="stkToggleGrp('+g.p.id+')"><svg class="vi-ic stk-chev" aria-hidden="true"><use href="#vi-chevron"/></svg>'+stkLogoBadge(g.p)+'<span class="stk-gn">'+(g.p.kind==='fund'?'<em class="stk-tag">FUND</em>':'')+stkEsc(g.p.name)+'</span><span class="stk-gc">'+g.hs.length+' holding'+(g.hs.length===1?'':'s')+'</span><span class="stk-gv">'+cfMoney(g.v)+(total>0?' <small>'+(g.v/total*100).toFixed(1)+'%</small>':'')+'</span></button>'
          +'<div class="stk-gb"'+(open?'':' hidden')+'>'+g.hs.map(function(h){var i=hs.indexOf(h);
        var v=stkValue(h),sus=stkSuspect(h),c=sus?0:(h.units*stkBasis(h)),pl=c>0?(v-c)/c*100:null;
        var srcTxt=h.manualPrice?'manual price':(h.updated?'live · '+stkAgo(h.updated):(+h.price>0?'saved price':(stkBasis(h)>0?'valued at cost':'no price')));
        var ch=+h.change||0;
        return '<div class="stk-row">'
          +'<div class="c-tk">'+stkHoldLogo(h,24,STK_COLORS[i%STK_COLORS.length])+'<div class="stk-tkb"><div class="stk-tk"><i style="background:'+STK_COLORS[i%STK_COLORS.length]+'"></i>'+stkEsc(h.sym)+(alState.activePie==='all'?' <span style="color:var(--t3);font-weight:400;font-size:max(.44rem,var(--vi-fs-1))">· '+stkEsc(stkPieName(h.pie))+'</span>':'')+'</div><div class="stk-nm">'+stkEsc(h.name||'')+'</div>'+stkHoldMeta(h)+'</div></div>'
          +'<div class="c-un"><span class="stk-lb">Units</span><input class="stk-inp" type="number" min="0" step="any" value="'+(+h.units||0)+'" onchange="stkSet('+h.id+',\'units\',this.value)" title="Units held"></div>'
          +'<div class="c-av"><span class="stk-lb">Avg cost £</span><input class="stk-inp" type="number" min="0" step="any" value="'+(+h.avgCost>0?(+h.avgCost).toFixed(4).replace(/\.?0+$/,''):'')+'" placeholder="'+(+h.addPx>0?(+h.addPx).toFixed(4).replace(/\.?0+$/,''):'–')+'" onchange="stkSet('+h.id+',\'avgCost\',this.value)" title="'+(+h.addPx>0&&!(+h.avgCost>0)?'Empty, so the price when you added it is used. Type what you paid per unit in £ to use that instead':'Your average buy price per unit in £')+'"></div>'
          +'<div class="c-pr"><span class="stk-lb">Price £</span><input class="stk-inp" type="number" min="0" step="any" value="'+(+h.price>0?(+h.price).toFixed(4).replace(/\.?0+$/,''):'')+'" placeholder="live" onchange="stkSet('+h.id+',\'price\',this.value)" title="Price in £. Type one to override the live price, clear it to go back to live"><div class="stk-src">'+srcTxt+(ch&&!h.manualPrice?' · <span style="color:'+(ch>=0?'var(--green)':'var(--red)')+'">'+(ch>=0?'+':'')+ch.toFixed(2)+'%</span>':'')+'</div></div>'
          +'<div class="stk-val c-va"><span class="stk-lb">Value</span>'+cfMoney(v)+'</div>'
          +(sus?'<div class="stk-pl c-pl"><button type="button" class="stk-chk" onclick="stkCheckCost(this)" title="Your average cost is more than 3 times today’s price. It should be the price you paid per unit, in £ (not pence, and not the total)">Check your average cost</button></div>'
            :'<div class="stk-pl c-pl" style="color:'+(pl==null?'var(--t3)':pl>=0?'var(--green)':'var(--red)')+'" title="'+(pl==null?'':(+h.avgCost>0?'vs your average cost':'since you added it'))+'">'+(pl==null?'–':(pl>=0?'+':'')+pl.toFixed(1)+'%')+'</div>')
          +'<button class="data-item-del c-x" style="width:auto;padding:4px 8px;font-size:max(.5rem,var(--vi-fs-1));white-space:nowrap;opacity:1;border:1px solid rgb(var(--red-rgb) / .45);border-radius:4px" onclick="stkRemove('+h.id+')" title="Remove this holding">🗑 Remove</button></div>';
}).join('')+'</div></div>';
      }).join('')+'</div>';
  }
  // allocation: bars (the visible pie) or a tree map of the whole portfolio (owner, 3 Nov)
  var al=document.getElementById('stk-alloc');
  if(al){
    var av=stkAllocView();
    al.style.display=hs.length?'':'none';
    al.innerHTML='<div class="stk-hd"><span>Allocation</span><div class="nw3d-seg" role="group" aria-label="Allocation view"><button type="button" aria-pressed="'+(av==='bars')+'" onclick="stkSetAlloc(\'bars\')">Bars</button><button type="button" aria-pressed="'+(av==='tree')+'" onclick="stkSetAlloc(\'tree\')">Tree map</button></div></div>'
    +(av==='tree'?'<div class="stk-tm-key" id="stk-tm-key"></div><div class="dtm stk-tm" id="stk-treemap"></div><div class="stk-tm-other" id="stk-tm-other"></div>':hs.filter(function(h){return stkValue(h)>0;}).map(function(h,i){
      var p=total>0?stkValue(h)/total*100:0,c=STK_COLORS[i%STK_COLORS.length];
      return '<div class="stk-bar"><span class="t" title="'+stkEsc(h.name||h.sym)+'">'+stkEsc(h.sym)+'</span><span class="b"><div style="width:'+p.toFixed(1)+'%;background:'+c+'"></div></span><span class="p">'+p.toFixed(1)+'%</span></div>';
    }).join(''));
    if(av==='tree'){stkDrawTreemap();if(!al._ro&&window.ResizeObserver){al._ro=new ResizeObserver(function(){if(stkAllocView()==='tree'&&al.clientWidth!==al._rw){al._rw=al.clientWidth;stkDrawTreemap();}});al._ro.observe(al);}}
  }
}
function stkCheckCost(btn){var r=btn.closest('.stk-row'),i=r&&r.querySelector('.c-av input');if(i){i.focus();if(i.select)i.select();}}
// ── holdings grouped by pie / fund, collapsed by default (owner, 3 Nov) ──
function stkOpenMap(){try{return JSON.parse(localStorage.getItem('vi-stk-open')||'{}')||{};}catch(e){return {};}}
function stkGrpOpen(id){return !!stkOpenMap()[id];}
function stkToggleGrp(id){var m=stkOpenMap();if(m[id])delete m[id];else m[id]=1;try{localStorage.setItem('vi-stk-open',JSON.stringify(m));}catch(e){}stkRender();}
function stkGroups(hs){
  var by={},order=[];
  hs.forEach(function(h){var k=h.pie;if(!by[k]){var p=(alState.stockPies||[]).find(function(x){return x.id===k;})||{id:k,name:'Other'};by[k]={p:p,hs:[],v:0};order.push(k);}by[k].hs.push(h);by[k].v+=stkValue(h);});
  return order.map(function(k){return by[k];}).sort(function(a,b){return b.v-a.v;});
}
function stkAllocView(){try{return localStorage.getItem('vi-stk-alloc')==='tree'?'tree':'bars';}catch(e){return 'bars';}}
function stkSetAlloc(v){try{localStorage.setItem('vi-stk-alloc',v);}catch(e){}stkRender();}
// ── fitted tree map: the layout engine is shared (Stocks now, Crypto next); only stkDrawTreemap knows about holdings ──
var _dtmCv=null;
function dtmMeasure(txt,font){try{_dtmCv=_dtmCv||document.createElement('canvas').getContext('2d');_dtmCv.font=font;return _dtmCv.measureText(String(txt)).width*1.06+1;}catch(e){return String(txt).length*9;}}
// wrap a name into at most maxLines lines that fit maxW; a word that cannot fit on a line fails the whole name (the tile then merges into "Other")
function dtmWrap(txt,font,maxW,maxLines){
  var ws=String(txt||'').split(/\s+/).filter(Boolean),lines=[],cur='',i;
  if(!ws.length)return null;
  for(i=0;i<ws.length;i++){
    if(dtmMeasure(ws[i],font)>maxW)return null;
    var t=cur?cur+' '+ws[i]:ws[i];
    if(dtmMeasure(t,font)<=maxW)cur=t;else{lines.push(cur);cur=ws[i];}
  }
  lines.push(cur);
  if(lines.length>maxLines){
    lines=lines.slice(0,maxLines);var w=lines[maxLines-1].split(' ');
    while(w.length&&dtmMeasure(w.join(' ')+'…',font)>maxW)w.pop();
    if(!w.length)return null;
    lines[maxLines-1]=w.join(' ')+'…';
  }
  return lines;
}
// can this item's label (logo, name, amount, share) sit inside a cw x ch tile? returns what to draw, or null
function dtmFitCell(it,cw,ch,o){
  var fs=o.fs,padX=8,padY=6,iw=cw-padX*2,ih=ch-padY*2,
      nf='700 '+fs+'px Syne,sans-serif',vf='700 '+(fs+.5)+'px "Share Tech Mono",monospace',
      lh=Math.ceil(fs*1.2),vh=Math.ceil((fs+.5)*1.3);
  if(iw<30||ih<vh||dtmMeasure(it.val,vf)>iw)return null;
  for(var k=0;k<2;k++){
    var logo=k===0&&!it.noLogo,aw=iw-(logo?26:0);if(aw<28)continue;
    var lines=dtmWrap(it.name,nf,aw,it.other?1:2);if(!lines)continue;
    var hh=Math.max(logo?20:0,lines.length*lh)+2+vh;if(hh>ih)continue;
    var room=ih-hh-2,share=null;
    if(it.other&&room>=Math.ceil(fs*1.25)){var nl=dtmWrap(it.names,fs+'px "Share Tech Mono",monospace',iw,1);if(nl)share=nl[0];}
    else if(room>=Math.ceil(fs*1.25)){var s1=it.pct+'% of portfolio',sf=fs+'px "Share Tech Mono",monospace';share=dtmMeasure(s1,sf)<=iw?s1:(dtmMeasure(it.pct+'%',sf)<=iw?it.pct+'%':null);}
    return{logo:logo,lines:lines,share:share};
  }
  return null;
}
// groups: [{id,col,v,items:[{name,val,v,pct,...}]}]. Squarifies the groups, then each group's items; an item whose label will not fit
// joins that group's "Other (n)" tile and the group is laid out again. Returns {pies,cells,listed}.
function dtmFitMap(groups,W,H,o){
  var gap=3,pad=4,merged={},res,again,guard=0;
  groups.forEach(function(g){merged[g.id]=[];});
  do{
    res={pies:[],cells:[],listed:[]};again=false;guard++;
    dtmSquarify(groups.map(function(g){return{v:g.v,d:g};}),0,0,W,H).forEach(function(r){
      var g=r.d,nCells=res.cells.length;res.pies.push({x:r.x+1,y:r.y+1,w:r.w-2,h:r.h-2,col:g.col,_g:g});
      var ix=r.x+pad,iy=r.y+pad,iw=r.w-pad*2,ih=r.h-pad*2;
      if(iw<10||ih<10){g.items.forEach(function(it){res.listed.push({g:g,it:it});});res.pies.pop();return;}
      var list=g.items.filter(function(it){return merged[g.id].indexOf(it)<0;}),mv=merged[g.id],oth=null;
      if(mv.length){   // the "Other (n)" tile is a shelf along the bottom of its pie, never thinner than a readable label
        var sv=mv.reduce(function(a,it){return a+it.v;},0),oh=Math.min(ih*.4,Math.max(56,sv/g.v*iw*ih/iw));
        oth={other:true,items:mv,v:sv,name:mv.length===1?mv[0].name:'Other ('+mv.length+')',val:o.money(sv),pct:o.pct(sv),noLogo:true,names:mv.map(function(x){return x.name;}).join(', ')};
        var of=dtmFitCell(oth,iw-gap,oh-gap,o);
        if(of){res.cells.push({x:ix+gap/2,y:iy+ih-oh+gap/2,w:Math.max(2,iw-gap),h:Math.max(2,oh-gap),it:oth,fit:of,g:g,j:9});ih-=oh;}   // no room for a label: they are listed under the map instead
      }
      if(ih<10){if(res.cells.length===nCells)res.pies.pop();return;}
      list.sort(function(a,b){return b.v-a.v;});
      dtmSquarify(list.map(function(it){return{v:it.v,d:it};}),ix,iy,iw,ih).forEach(function(c,j){
        var it=c.d,fit=dtmFitCell(it,c.w-gap,c.h-gap,o);
        if(!fit&&guard<40){merged[g.id].push(it);again=true;return;}
        res.cells.push({x:c.x+gap/2,y:c.y+gap/2,w:Math.max(2,c.w-gap),h:Math.max(2,c.h-gap),it:it,fit:fit,g:g,j:j});
      });
      if(res.cells.length===nCells)res.pies.pop();   // nothing drawn in it (its holdings are listed under the map): no empty outline
    });
  }while(again);
  groups.forEach(function(g){merged[g.id].forEach(function(it){res.listed.push({g:g,it:it});});});
  return res;
}
// ── holding logos (owner, 3 Nov: "ticker icons or the company icons") ──
// Company logo from the favicon service the privacy notice already names; no new host. A round monogram on the pie colour when it
// cannot load; a fund badge for funds. Ticker domains below are the common UK and US shares; funds use their provider's logo.
var STK_TICKERS={AAPL:'apple.com',MSFT:'microsoft.com',GOOGL:'google.com',GOOG:'google.com',AMZN:'amazon.com',TSLA:'tesla.com',NVDA:'nvidia.com',META:'meta.com',NFLX:'netflix.com',DIS:'disney.com',KO:'coca-cola.com',PEP:'pepsico.com',JPM:'jpmorganchase.com',V:'visa.com',MA:'mastercard.com',PYPL:'paypal.com',INTC:'intel.com',AMD:'amd.com',BA:'boeing.com',WMT:'walmart.com',NKE:'nike.com',MCD:'mcdonalds.com',SBUX:'starbucks.com',UBER:'uber.com',
  BP:'bp.com',SHEL:'shell.com',LLOY:'lloydsbankinggroup.com',BARC:'barclays.com',HSBA:'hsbc.com',NWG:'natwestgroup.com',STAN:'sc.com',VOD:'vodafone.com',AZN:'astrazeneca.com',GSK:'gsk.com',ULVR:'unilever.com',DGE:'diageo.com',RIO:'riotinto.com',BHP:'bhp.com',GLEN:'glencore.com',BATS:'bat.com',IMB:'imperialbrandsplc.com',TSCO:'tescoplc.com',SBRY:'about.sainsburys.co.uk',MKS:'marksandspencer.com',BT:'bt.com',RR:'rolls-royce.com',BAE:'baesystems.com',LSEG:'lseg.com',REL:'relx.com',NG:'nationalgrid.com',SSE:'sse.com',AV:'aviva.com',LGEN:'legalandgeneral.com',PRU:'prudentialplc.com',RKT:'reckitt.com',EXPN:'experian.com',CPG:'compass-group.com',WPP:'wpp.com',IAG:'iairgroup.com',EZJ:'easyjet.com',JD:'jdplc.com',OCDO:'ocadogroup.com',AUTO:'autotrader.co.uk',RMV:'rightmove.co.uk',SMT:'scottishmortgageit.com'};
function stkTickerDomain(sym){var s=String(sym||'').toUpperCase().replace(/\.(L|LON|US|O|N|OQ)$/,'');return Object.prototype.hasOwnProperty.call(STK_TICKERS,s)?STK_TICKERS[s]:null;}
function stkIsFundCode(sym){var s=String(sym||'');return /^0P/i.test(s)||s.length>8;}
function stkFundBadge(){return '<span class="stk-fundb"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9h-9z" fill="#fff"/><path d="M14 2.2A9 9 0 0 1 21.8 10H14z" fill="#fff" opacity=".7"/></svg></span>';}
function stkHoldLogo(h,px,col){
  var sym=String(h.sym||''),fundish=stkIsFundCode(sym)||(h.pie!=null&&(alState.stockPies||[]).some(function(p){return p.id===h.pie&&p.kind==='fund';})),
      dom=stkTickerDomain(sym),pc=col;
  if(!dom){var m=stkProviderMatch(h.provider||h.name||'');if(m){dom=m.d;pc=pc||m.c;}}
  var fb=fundish?stkFundBadge():stkMono(sym||h.name,pc);
  return '<span class="stk-hl'+(fundish?' is-fund':'')+'" style="width:'+px+'px;height:'+px+'px'+(fundish?';background:'+(pc||'#2b6f6b'):'')+'">'
    +(dom?'<img alt="" loading="lazy" referrerpolicy="no-referrer" src="https://www.google.com/s2/favicons?domain='+dom+'&sz=64" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><span class="stk-hl-fb" style="display:none;width:100%;height:100%">'+fb+'</span>':fb)+'</span>';
}
// the name a tile shows: the ticker, or a fund's name with the share-class noise taken off (never a code like 0P0001O...)
function stkTmName(h){
  var s=String(h.sym||'');if(!stkIsFundCode(s))return s||String(h.name||'');
  var n=String(h.name||'').replace(/\b(GBP|USD|EUR|Acc|Inc|Accumulation|Income|Distributing)\b\.?/gi,'').replace(/\bClass\s+\w+\b/gi,'').replace(/\s+/g,' ').trim();
  return n||s;
}
// Tile colours: the pie colour lightened (never darkened to olive or brown), with dark ink picked so the text is at least 4.5:1.
function stkHexRgb(h){h=String(h).replace('#','');if(h.length===3)h=h.replace(/./g,'$&$&');return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
function stkLum(c){var f=c.map(function(v){v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*f[0]+.7152*f[1]+.0722*f[2];}
function stkTileCol(col,j,other){
  var c=stkHexRgb(col),k=other?.58:Math.min(.04+Math.min(j,5)*.035,.22),rgb;
  for(;;){rgb=c.map(function(v){return Math.round(v+(255-v)*k);});if((stkLum(rgb)+.05)/(stkLum([11,16,24])+.05)>=5.2||k>=.95)break;k+=.04;}   // 5.2 leaves room for the hatch
  return 'rgb('+rgb.join(',')+')';
}
// paints a fitted map (from dtmFitMap) into el, with the "Other" list in lg; items bring their own logo(px,col) and title
function dtmPaintMap(el,lg,res){
  var out='';
  res.pies.forEach(function(r){out+='<div class="stk-tm-pie" style="left:'+r.x+'px;top:'+r.y+'px;width:'+r.w+'px;height:'+r.h+'px;border-color:'+r.col+'"></div>';});
  res.cells.forEach(function(c){
    var it=c.it,col=c.g.col,bg;
    if(it.other){
      var names=it.items.map(function(x){return x.name+' '+x.val;}).join(', ');
      bg='repeating-linear-gradient(135deg,rgba(11,16,24,.12) 0 6px,transparent 6px 12px),'+stkTileCol(col,0,true);
      out+='<div class="dtm-cell stk-tm-c dtm-other" tabindex="0" data-n="'+stkEsc(it.name+' · '+c.g.p.name)+'" data-v="'+stkEsc(names)+'" title="'+stkEsc(it.name+' in '+c.g.p.name+': '+names)+'" style="left:'+c.x+'px;top:'+c.y+'px;width:'+c.w+'px;height:'+c.h+'px;color:#0b1018;background:'+bg+'">'
        +(c.fit?'<b class="dtm-n">'+stkEsc(it.name)+'</b><span class="dtm-v">'+stkEsc(it.val)+'</span>'+(c.fit.share?'<span class="dtm-s">'+stkEsc(c.fit.share)+'</span>':''):'')+'</div>';
      return;
    }
        bg=stkTileCol(col,c.j);
    out+='<div class="dtm-cell stk-tm-c" title="'+stkEsc(it.title||(it.name+' · '+c.g.p.name+' · '+it.val+' ('+it.pct+'%)'))+'" style="left:'+c.x+'px;top:'+c.y+'px;width:'+c.w+'px;height:'+c.h+'px;color:#0b1018;background:'+bg+'">'
      +'<div class="dtm-hd">'+(c.fit.logo&&it.logo?it.logo(20,col):'')+'<b class="dtm-n">'+c.fit.lines.map(stkEsc).join('<br>')+'</b></div><span class="dtm-v">'+stkEsc(it.val)+'</span>'+(c.fit.share?'<span class="dtm-s">'+stkEsc(c.fit.share)+'</span>':'')+'</div>';
  });
  el.innerHTML=out+'<div class="dtm-tip" aria-live="polite" hidden></div>';
  if(lg){
    var by=[];res.listed.forEach(function(x){var b=by.find(function(y){return y.g===x.g;});if(!b){b={g:x.g,xs:[]};by.push(b);}b.xs.push(x.it);});
    lg.innerHTML=by.length?'<b>Grouped as Other</b> (too small to label)'+by.map(function(b){return '<div class="stk-tm-ol"><i style="background:'+b.g.col+'"></i><span>'+stkEsc(b.g.p.name)+': '+b.xs.map(function(x){return stkEsc(x.name)+' <em>'+stkEsc(x.val)+'</em>';}).join(' · ')+'</span></div>';}).join(''):'';
  }
  if(!el._dtmTip){el._dtmTip=1;
    el.addEventListener('pointerover',function(e){if(e.pointerType==='mouse')dtmTip(el,e.target.closest('.dtm-other'));});
    el.addEventListener('pointerleave',function(e){if(e.pointerType==='mouse')dtmTip(el,null);});
    el.addEventListener('click',function(e){dtmTip(el,e.target.closest('.dtm-other'));});
    el.addEventListener('focusin',function(e){dtmTip(el,e.target.closest('.dtm-other'));});
    el.addEventListener('focusout',function(){dtmTip(el,null);});
  }
}
function stkDrawTreemap(){
  var el=document.getElementById('stk-treemap'),key=document.getElementById('stk-tm-key'),lg=document.getElementById('stk-tm-other');if(!el)return;
  var W=el.parentElement.clientWidth-(parseFloat(getComputedStyle(el.parentElement).paddingLeft)||0)*2;
  if(!(W>80))return;
  var H=Math.round(Math.max(360,Math.min(640,W*.9))),fs=W>=560?12:11;el.style.height=H+'px';el.style.width=W+'px';el.style.setProperty('--tm-fs',fs+'px');
  var all=(alState.stocks||[]).filter(function(h){return stkValue(h)>0;}),tot=all.reduce(function(a,h){return a+stkValue(h);},0);
  if(!all.length||!(tot>0)){el.innerHTML='<div class="dtm-empty">No priced holdings yet</div>';if(key)key.innerHTML='';if(lg)lg.innerHTML='';return;}
  var gs=stkGroups(all),pieCol={};gs.forEach(function(g,i){pieCol[g.p.id]=STK_COLORS[i%STK_COLORS.length];});
  if(key)key.innerHTML=gs.map(function(g){return '<span class="stk-tm-k"><i style="background:'+pieCol[g.p.id]+'"></i>'+stkEsc(g.p.name)+' <b>'+(g.v/tot*100).toFixed(0)+'%</b></span>';}).join('');
  var money=function(v){return cfMoney(v);},pct=function(v){return (v/tot*100).toFixed(1);};
  var groups=gs.map(function(g){return{id:g.p.id,p:g.p,col:pieCol[g.p.id],v:g.v,items:g.hs.map(function(h){var v=stkValue(h);var r=stkReturns([h]),chg=r.counted.length?' · '+(r.change>=0?'+':'-')+cfMoney(Math.abs(r.change))+' since added':'';return{h:h,v:v,name:stkTmName(h),val:money(v),pct:pct(v),logo:function(px,col){return stkHoldLogo(h,px,col);},title:(h.name||stkTmName(h))+' · '+g.p.name+' · '+money(v)+' ('+pct(v)+'%)'+chg};})};});
  var res=dtmFitMap(groups,W,H,{fs:fs,money:money,pct:pct});
  dtmPaintMap(el,lg,res);
  if(!window._stkTmFonts&&document.fonts&&document.fonts.ready){window._stkTmFonts=1;document.fonts.ready.then(function(){try{if(stkAllocView()==='tree')stkDrawTreemap();}catch(e){}});}
}

// ── pies ──
function stkSelectPie(id){alState.activePie=id;saveAL();stkRender();}
(function(){var _r=stkRender;stkRender=function(){_r.apply(this,arguments);try{clearTimeout(window._stkChT);window._stkChT=setTimeout(stkChartRender,250);}catch(e){}};})();
function stkNewPie(){
  var n=prompt('Name your pie (e.g. “Trading 212 Pie”, “Stocks & Shares ISA”)');
  if(!n||!n.trim())return;
  stkEnsure();
  var id=Date.now();
  alState.stockPies.push({id:id,name:n.trim().slice(0,40)});
  alState.activePie=id;
  saveAL();stkRender();
}
function stkRenamePie(){
  var p=alState.stockPies.find(function(x){return x.id===alState.activePie;});
  if(!p)return;
  var n=prompt('Rename pie',p.name);
  if(!n||!n.trim())return;
  p.name=n.trim().slice(0,40);saveAL();stkRender();
}
function stkDeletePie(){if(viBlockEdit())return;
  var p=alState.stockPies.find(function(x){return x.id===alState.activePie;});
  if(!p)return;
  var n=alState.stocks.filter(function(h){return h.pie===p.id;}).length;
  if(!confirm('Delete “'+p.name+'”'+(n?' and its '+n+' holding'+(n===1?'':'s'):'')+'?'))return;
  alState.stocks=alState.stocks.filter(function(h){return h.pie!==p.id;});
  alState.stockPies=alState.stockPies.filter(function(x){return x.id!==p.id;});
  alState.activePie='all';
  stkEnsure();
  stkSave();
  showToast('“'+p.name+'” deleted');
}

// ── add / edit / remove ──
function stkTargetPie(){stkEnsure();return alState.activePie==='all'?alState.stockPies[0].id:alState.activePie;}
function stkFocusAdd(){var r=document.querySelector('#assets-stocks .stk-add'),i=document.getElementById('stk-sym');if(r)r.scrollIntoView({behavior:'smooth',block:'center'});if(i)setTimeout(function(){i.focus();},350);}
var _stkPick=null,_stkSugT=null,_stkSugCache={},_stkSugList=[],_stkAddBusy=false;
function stkSuggest(q,symId,boxId){
  symId=symId||'stk-sym';boxId=boxId||'stk-suggest';
  q=String(q||'').trim();var box=document.getElementById(boxId);if(!box)return;
  if(_stkPick&&_stkPick.sym!==q.toUpperCase())_stkPick=null;
  clearTimeout(_stkSugT);
  if(q.length<2){box.style.display='none';return;}
  _stkSugT=setTimeout(async function(){
    var res=_stkSugCache[q.toLowerCase()];
    if(!res){var r=await _fnInvoke('stock-quotes',{search:q},9000);res=(r&&r.data&&r.data.results)||[];_stkSugCache[q.toLowerCase()]=res;}
    if(String((document.getElementById(symId)||{}).value||'').trim()!==q)return;   // typed on since
    _stkSugList=res;
    box.innerHTML=res.length?res.map(function(x,i){return'<div onclick="stkPick('+i+',\''+symId+'\',\''+boxId+'\')">'+stkEsc(x.name)+'<small>'+stkEsc(x.symbol)+' · '+stkEsc(x.exchange)+' · '+stkEsc(x.type==='MUTUALFUND'?'fund':x.type==='ETF'?'ETF':'share')+'</small></div>';}).join(''):'<div style="cursor:default;color:var(--t3)">No match. Try the ISIN or the exact ticker (e.g. VUSA.L)</div>';
    box.style.display='block';
  },320);
}
function stkPick(i,symId,boxId){
  symId=symId||'stk-sym';boxId=boxId||'stk-suggest';
  var x=_stkSugList[i];if(!x)return;
  var inp=document.getElementById(symId);if(inp)inp.value=x.symbol;
  _stkPick={sym:x.symbol.toUpperCase(),name:viClean(x.name),alts:_stkSugList.map(function(y){return{symbol:y.symbol.toUpperCase(),name:y.name,exchange:y.exchange};})};
  var box=document.getElementById(boxId);if(box)box.style.display='none';
  var pv=document.getElementById('afs-prov');if(pv&&!pv.value){var m=stkProviderMatch(x.name);if(m)pv.value=m.n;}   // provider from the fund's name
  var nx=document.getElementById(symId==='afs-sym'?'afs-units':'stk-units');if(nx)nx.focus();
}
document.addEventListener('click',function(e){['stk-suggest','afs-suggest'].forEach(function(id){var box=document.getElementById(id);if(box&&!e.target.closest('#stk-sym,#afs-sym,#'+id))box.style.display='none';});});
// shared by the inline add row and the "Add fund / share" window
async function stkAddCore(o){if(viBlockEdit())return;
  var sym=String(o.sym||'').trim().toUpperCase(),units=o.units,amt=o.amt,cost=o.cost;
  if(!/^[A-Z0-9.\-^=]{1,15}$/.test(sym))return{err:'Search for a fund or share, or enter a ticker, e.g. VUSA.L or AAPL'};
  if(!(units>0)&&!(amt>0))return{err:'Enter how many units you hold, or the £ value you hold'};
  var mpx=+o.manualPrice>0?+o.manualPrice:0,entryPx=mpx;   // entryPx: the price at this moment, when we know it (E17)
  if(!(units>0)&&mpx>0)units=+(amt/mpx).toFixed(6);   // your own unit price
  if(!(units>0)){   // worked out from the £ you hold ÷ the live price
    showToast('Looking up the live price…');
    try{
      if(!localStorage.getItem('vi_fx_rates')&&typeof fetchExchangeRates==='function')await new Promise(function(res){try{fetchExchangeRates(function(){res();});setTimeout(res,2500);}catch(e){res();}});
      var res=await stkFetchQuotes([sym]),q=res&&res.quotes&&res.quotes[sym],g=q?stkToGBP(q.price,q.currency):null,note='';
      if(!(g>0)&&_stkPick&&_stkPick.sym===sym&&_stkPick.alts){   // this listing has no price: try the other listings of the same fund (London first)
        var norm=function(n){return String(n||'').toLowerCase().replace(/[^a-z0-9]+/g,'').slice(0,18);};
        var alts=_stkPick.alts.filter(function(a){return a.symbol!==sym&&norm(a.name)===norm(_stkPick.name);});
        alts.sort(function(a,b){return (/\.L$/.test(b.symbol)?1:0)-(/\.L$/.test(a.symbol)?1:0);});
        if(alts.length){
          var r2=await stkFetchQuotes(alts.map(function(a){return a.symbol;}).slice(0,8));
          for(var ai=0;r2&&r2.quotes&&ai<alts.length;ai++){var q2=r2.quotes[alts[ai].symbol],g2=q2?stkToGBP(q2.price,q2.currency):null;if(g2>0){sym=alts[ai].symbol;g=g2;note='Using the '+(alts[ai].exchange||sym)+' listing ('+sym+'), which has a live price';break;}}
        }
      }
      if(!(g>0))return{err:'No live price found for '+sym+((window._stkMisses&&window._stkMisses[sym]&&window._stkMisses[sym][0])?' ('+window._stkMisses[sym][0]+')':'')+'. Enter the units you hold instead (or pick a different listing of the fund)'};
      units=+(amt/g).toFixed(6);if(!(entryPx>0))entryPx=g;if(note)showToast(note);
    }catch(e){return{err:'Could not look up the price. Enter the units instead'};}
  }
  stkEnsure();
  var pie;
  if(o.asFund){   // a fund is its own pie, labelled FUND, named after the fund
    var fname=viClean((o.name||(_stkPick&&_stkPick.sym===sym?_stkPick.name:'')||sym)).slice(0,40);
    pie=alState.stockPies.find(function(p){return p.kind==='fund'&&alState.stocks.some(function(x){return x.pie===p.id&&x.sym===sym;});});
    if(!pie){pie={id:Date.now(),name:fname,kind:'fund'};alState.stockPies.push(pie);}
  }
  else if(o.newPie){pie={id:Date.now(),name:viClean(o.newPie).slice(0,40)};alState.stockPies.push(pie);}
  else pie=alState.stockPies.find(function(p){return String(p.id)===String(o.pieId);})||alState.stockPies.find(function(p){return p.id===stkTargetPie();})||alState.stockPies[0];
  var nm=(_stkPick&&(_stkPick.sym===o.sym.trim().toUpperCase()||_stkPick.sym===sym))?_stkPick.name:(o.name||'');
  var provider=viClean(String(o.provider||'')).trim().slice(0,40),platform=viClean(String(o.platform||'')).trim().slice(0,40);
  if(platform&&!pie.platform){pie.platform={name:(stkPlatformMatch(platform)||{}).n||platform};delete pie.platformOff;}
  var h=alState.stocks.find(function(x){return x.pie===pie.id&&x.sym===sym;});
  if(h){ // merge into the existing position (weighted average cost)
    var tc=(h.avgCost>0?h.units*h.avgCost:0)+(cost>0?units*cost:0),u0=+h.units||0;
    h.units=+(h.units+units).toFixed(8);
    if(h.avgCost>0&&cost>0)h.avgCost=tc/h.units;
    else if(cost>0&&!(h.avgCost>0)){   // first typed cost: earlier units keep their entry price (E17); units still waiting for a price take this cost
      var ku=Math.max(0,u0-(+h.addPendU||0));
      h.avgCost=(ku>0&&+h.addPx>0)?(ku*h.addPx+(h.units-ku)*cost)/h.units:cost;
      delete h.addPendU;delete h.addPendAt;
    }
    else if(!(cost>0)&&!(h.avgCost>0)&&(+h.addPx>0||+h.addPendU>0||!(u0>0))){   // no cost typed: these units go in at today's price (E17)
      if(entryPx>0&&!(+h.addPendU>0))h.addPx=(u0>0&&+h.addPx>0)?(u0*h.addPx+units*entryPx)/h.units:entryPx;
      else{h.addPendU=(+h.addPendU||0)+units;h.addPendAt=Date.now();}
    }
    if(!h.name&&nm)h.name=nm;
  } else {
    h={id:Date.now(),pie:pie.id,sym:sym,name:nm,units:units,avgCost:cost>0?cost:0,price:0};
    if(!(cost>0)){if(entryPx>0)h.addPx=entryPx;else{h.addPendU=units;h.addPendAt=Date.now();}}
    alState.stocks.push(h);
  }
  if(mpx>0){h.price=mpx;h.manualPrice=true;h.updated=0;}   // your price, kept until you clear it
  if(provider)h.provider=provider;
  if(platform)h.platform=platform;
  _stkPick=null;
  alState.activePie=pie.id;
  stkSave();
  return{ok:true,h:h,pie:pie,units:units,name:nm||sym};
}
async function stkAddFinish(r,fromAmount){
  showToast(r.name+' added to “'+r.pie.name+'”'+(fromAmount?' · '+r.units+' units':''));
  await stkRefresh(true);
  var h=alState.stocks.find(function(x){return x.id===r.h.id;});
  if(h&&!(h.price>0)&&!h.updated)showToast('Added, but no live price was found for '+h.sym+((window._stkMisses&&window._stkMisses[h.sym]&&window._stkMisses[h.sym][0])?' ('+window._stkMisses[h.sym][0]+')':'')+'. Type a price in the Price box, or search again and choose another listing (e.g. the London .L one).');
}
async function stkAdd(){if(viBlockEdit())return;
  if(_stkAddBusy)return;_stkAddBusy=true;
  try{
    var g=function(id){return(document.getElementById(id)||{}).value;};
    var units=parseFloat(g('stk-units')),amt=parseFloat(g('stk-amt'));
    var r=await stkAddCore({sym:g('stk-sym'),units:units,amt:amt,cost:parseFloat(g('stk-cost')),pieId:stkTargetPie()});
    if(r.err){showToast(r.err);return;}
    ['stk-sym','stk-units','stk-amt','stk-cost'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});
    var bx=document.getElementById('stk-suggest');if(bx)bx.style.display='none';
    await stkAddFinish(r,!(units>0));
  }finally{_stkAddBusy=false;}
}
function stkAddFundOpen(){
  stkEnsure();_stkPick=null;
  var o=document.getElementById('stk-shot-ov');if(!o){o=document.createElement('div');o.id='stk-shot-ov';o.className='stk-shot-ov';document.body.appendChild(o);}
  var cur=alState.activePie==='all'?alState.stockPies[0].id:alState.activePie;
  var cp=alState.stockPies.find(function(p){return p.id===cur;})||{};
  var inp='width:100%;background:rgba(4,10,20,.8);border:1px solid rgba(68,192,185,.25);border-radius:4px;color:#e6eef7;font-size:13px;padding:8px;margin:3px 0 8px';
  o.innerHTML='<div class="stk-shot" style="width:min(520px,100%)"><div class="stk-shot-hd"><span><svg class="vi-ic g" aria-hidden="true"><use href="#vi-plus"/></svg> Add a fund, ETF or share</span><span style="cursor:pointer" onclick="stkShotClose()"><svg class="vi-ic g" role="img" aria-label="Close"><use href="#vi-close"/></svg></span></div><div class="stk-shot-bd">'
   +'<label>Fund or share</label><div style="position:relative"><input id="afs-sym" style="'+inp+'" placeholder="Search by name, ticker or ISIN" autocomplete="off" oninput="stkSuggest(this.value,\'afs-sym\',\'afs-suggest\')"><div id="afs-suggest" class="stk-suggest"></div></div>'
   +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px"><div><label>Units</label><input id="afs-units" type="number" min="0" step="any" style="'+inp+'" placeholder="e.g. 10"></div><div><label>…or £ held</label><input id="afs-amt" type="number" min="0" step="any" style="'+inp+'" placeholder="e.g. 112.40"></div><div><label>Avg cost £</label><input id="afs-cost" type="number" min="0" step="any" style="'+inp+'" placeholder="optional"></div></div>'
   +'<label>Unit price £ <span style="opacity:.6">(only if there is no live price; from your platform’s fund page)</span></label><input id="afs-px" type="number" min="0" step="any" style="'+inp+'" placeholder="e.g. 11.24, or leave empty to use the live price">'
   +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div><label>Provider (who runs the fund)</label><input id="afs-prov" list="afs-provs" maxlength="40" style="'+inp+'" placeholder="e.g. BlackRock"><datalist id="afs-provs">'+STK_PROVIDERS.map(function(x){return'<option value="'+stkEsc(x.n)+'">';}).join('')+'</datalist></div>'
   +'<div><label>Platform (where you hold it)</label><input id="afs-plat" list="afs-plats" maxlength="40" style="'+inp+'" placeholder="e.g. Monzo" value="'+stkEsc((cp.platform&&cp.platform.name)||'')+'"><datalist id="afs-plats">'+STK_PLATFORMS.map(function(x){return'<option value="'+stkEsc(x.n)+'">';}).join('')+'</datalist></div></div>'
   +'<div style="opacity:.75;font-size:11px;line-height:1.5">A fund gets its own pie, labelled <b style="color:var(--gold)">FUND</b>, shown beside your other pies and counted in <b>All investments</b>. Not sure of the units? Enter the £ you hold and they’re worked out from the live price.</div></div>'
   +'<div class="stk-shot-ft"><button class="stk-btn" onclick="stkShotClose()">Cancel</button><button class="btn-add-data" onclick="stkAddFundConfirm()">Add</button></div></div>';
  setTimeout(function(){var i=document.getElementById('afs-sym');if(i)i.focus();},100);
}
async function stkAddFundConfirm(){if(viBlockEdit())return;
  if(_stkAddBusy)return;_stkAddBusy=true;
  try{
    var g=function(id){return(document.getElementById(id)||{}).value;};
    var units=parseFloat(g('afs-units'));
    var r=await stkAddCore({sym:g('afs-sym'),units:units,amt:parseFloat(g('afs-amt')),cost:parseFloat(g('afs-cost')),provider:g('afs-prov'),platform:g('afs-plat'),asFund:true,manualPrice:parseFloat(g('afs-px'))});
    if(r.err){showToast(r.err);return;}
    stkShotClose();
    await stkAddFinish(r,!(units>0));
  }finally{_stkAddBusy=false;}
}

// price + amount controls on a fund's overview: a manual price counts straight into the totals
function stkFundControls(pie,hs){
  if(!pie||pie.kind!=='fund'||!hs.length)return '';
  var h=hs[0],px=stkPrice(h),man=!!h.manualPrice;
  var inp='background:rgba(4,10,20,.8);border:1px solid rgba(68,192,185,.3);border-radius:4px;color:#e6eef7;font-size:12px;padding:6px 8px;width:100%';
  return '<div class="stk-fundset"><div><label>Unit price £ '+(man?'<b style="color:var(--gold)">· manual</b>':(h.updated?'<b style="color:var(--green)">· live</b>':'<b style="color:var(--orange)">· none yet</b>'))+'</label>'
    +'<input id="stk-fs-px" type="number" min="0" step="any" style="'+inp+'" placeholder="e.g. 11.24" value="'+(px>0?(+px).toFixed(4).replace(/\.?0+$/,''):'')+'" onkeydown="if(event.key===\'Enter\')stkFundSetPrice('+h.id+')"></div>'
    +'<div><label>Units owned</label><input id="stk-fs-un" type="number" min="0" step="any" style="'+inp+'" value="'+(+h.units>0?+h.units:'')+'" placeholder="units" onkeydown="if(event.key===\'Enter\')stkFundSetUnits('+h.id+')"></div>'
    +'<div><label>…or £ you hold</label><input id="stk-fs-amt" type="number" min="0" step="any" style="'+inp+'" placeholder="e.g. 224.80" onkeydown="if(event.key===\'Enter\')stkFundSetAmount('+h.id+')"></div>'
    +'<div class="stk-fs-btns"><button class="btn-add-data" onclick="stkFundApply('+h.id+')">Save</button>'+(man?'<button class="stk-btn" onclick="stkFundLive('+h.id+')">Use live price</button>':'')+'</div></div>';
}
function stkFundApply(id){if(viBlockEdit())return;
  var h=alState.stocks.find(function(x){return x.id===id;});if(!h)return;
  var g=function(i){return parseFloat((document.getElementById(i)||{}).value);};
  var px=g('stk-fs-px'),un=g('stk-fs-un'),amt=g('stk-fs-amt');
  if(px>0&&px!==stkPrice(h)){h.price=px;h.manualPrice=true;h.updated=0;h.change=0;}   // typed a new price → manual price
  var price=stkPrice(h);
  if(amt>0){
    if(!(price>0)){showToast('Enter a unit price first, so the units can be worked out from the £ you hold');return;}
    h.units=+(amt/price).toFixed(6);
  } else if(un>=0&&un!==(+h.units||0)){h.units=un;}
  stkSave();
  showToast('Saved · '+(+h.units).toLocaleString('en-GB',{maximumFractionDigits:4})+' units'+(price>0?' = £'+(h.units*price).toLocaleString('en-GB',{maximumFractionDigits:2}):''));
}
function stkFundLive(id){var h=alState.stocks.find(function(x){return x.id===id;});if(!h)return;h.manualPrice=false;h.price=0;stkSave();stkRefresh(false);}
function stkSet(id,field,val){if(viBlockEdit())return;
  var h=alState.stocks.find(function(x){return x.id===id;});
  if(!h)return;
  var v=parseFloat(val);
  if(field==='units'){h.units=v>0?v:0;}
  else if(field==='avgCost'){h.avgCost=v>0?v:0;}
  else if(field==='price'){
    if(v>0){h.price=v;h.manualPrice=true;h.updated=0;h.change=0;}
    else{h.manualPrice=false;h.price=0;stkSave();stkRefresh(true);return;}
  }
  stkSave();
}
function stkRemove(id){if(viBlockEdit())return;
  var h=alState.stocks.find(function(x){return x.id===id;});
  if(!h)return;
  alState.stocks=alState.stocks.filter(function(x){return x.id!==id;});
  stkSave();
  showToast(h.sym+' removed');
}

// ── live prices ──
// 1) Vault-It price feed (Supabase edge function)  2) the user's own Alpha Vantage key  3) manual prices
async function stkFetchQuotes(symbols){
  if(!_supaClient){try{_initSupabase();}catch(e){}}
  if(_supaClient){
    try{
      var r=await _fnInvoke('stock-quotes',{symbols:symbols},8000);
      if(r&&r.data&&r.data.misses)window._stkMisses=Object.assign(window._stkMisses||{},r.data.misses);
      if(!r.error&&r.data&&r.data.quotes&&Object.keys(r.data.quotes).length)return{quotes:r.data.quotes,source:'Vault-It price feed'};
    }catch(e){}
  }
  var key=localStorage.getItem('alpha_vantage_key');
  if(key){
    var q={};
    for(var i=0;i<Math.min(symbols.length,5);i++){
      var s=symbols[i],av=/\.L$/.test(s)?s.replace(/\.L$/,'.LON'):s;
      try{
        var res=await fetch('https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol='+encodeURIComponent(av)+'&apikey='+encodeURIComponent(key));
        var j=await res.json(),g=j&&j['Global Quote'];
        if(g&&parseFloat(g['05. price'])>0)q[s]={price:parseFloat(g['05. price']),currency:/\.L$/.test(s)?'GBp':'USD',name:s,changePct:parseFloat(g['10. change percent'])||0};
      }catch(e){}
    }
    if(Object.keys(q).length)return{quotes:q,source:'Alpha Vantage'};
  }
  return null;
}
// A refresh asked for while another is running waits for it, then runs: a holding added in that window still gets its price
// (it used to return at once and the new holding stayed valued at cost until the next automatic refresh).
async function stkRefresh(silent){
  if(window._stkBusy&&window._stkP){try{await window._stkP;}catch(e){}}
  window._stkP=_stkRefreshRun(silent);
  return window._stkP;
}
async function _stkRefreshRun(silent){
  stkEnsure();
  var targets=alState.stocks.filter(function(h){return !h.manualPrice;});
  var syms=[];targets.forEach(function(h){if(syms.indexOf(h.sym)<0)syms.push(h.sym);});
  if(!syms.length){if(!silent)showToast('Add a holding first');return;}
  if(window._stkBusy)return;
  window._stkBusy=true;stkRender();
  try{
    if(!localStorage.getItem('vi_fx_rates')&&typeof fetchExchangeRates==='function')await new Promise(function(res){try{fetchExchangeRates(function(){res();});setTimeout(res,2500);}catch(e){res();}});
    var res=await stkFetchQuotes(syms);
    if(!res){if(!silent)showToast('Live prices unavailable. Type a price manually, or add an Alpha Vantage key in Settings');window._stkBusy=false;stkRender();return;}
    var n=0;
    targets.forEach(function(h){
      var q=res.quotes[h.sym];if(!q)return;
      var gbp=stkToGBP(q.price,q.currency);
      if(gbp==null)return;
      h.price=gbp;h.px=q.price;h.ccy=q.currency;h.change=+q.changePct||0;h.updated=Date.now();
      if(q.name&&(!h.name||h.name===h.sym))h.name=q.name;
      n++;
    });
    alState.stockSrc=res.source;
    window._stkBusy=false;
    stkSave();
    if(!silent)showToast(n?('Updated '+n+' price'+(n===1?'':'s')+' ✓'):'No matching tickers found. Check the symbols');
  }catch(e){window._stkBusy=false;stkRender();if(!silent)showToast('Could not refresh prices');}
}

// ── Performance history: today's holdings × historical prices, vs the price you put them in at ──
var _stkCh={range:'6M',view:'value'},_stkHist={};
try{var _c=JSON.parse(localStorage.getItem('vi_stk_chart')||'null');if(_c&&_c.range)_stkCh=_c;}catch(e){}
var STK_RANGE_API={'1M':'1mo','3M':'3mo','6M':'6mo','1Y':'1y','MAX':'max','ADDED':'1y'};
function stkChSet(k,v){_stkCh[k]=v;try{localStorage.setItem('vi_stk_chart',JSON.stringify(_stkCh));}catch(e){}stkChartRender();}
function stkAddedMs(hs){return hs.reduce(function(m,h){var t=+h.id;return(t>1e12&&t<Date.now()+864e5)?Math.min(m,t):m;},Date.now());}
async function stkHistFetch(syms,api){
  var key=api,miss=syms.filter(function(s){var c=_stkHist[key+'|'+s];return !(c&&Date.now()-c.at<30*60*1000);});
  if(miss.length){
    var r=await _fnInvoke('stock-quotes',{history:{symbols:miss,range:api}},12000);
    var ser=(r&&r.data&&r.data.series)||{};
    miss.forEach(function(s){_stkHist[key+'|'+s]={at:Date.now(),d:ser[s]||null};});
  }
  var out={};syms.forEach(function(s){var c=_stkHist[key+'|'+s];if(c&&c.d)out[s]=c.d;});return out;
}
// value(t) and return(t) for the given holdings, from the union of all price dates
function stkBuildSeries(hs,hist,fromMs){
  var ts={};hs.forEach(function(h){var d=hist[h.sym];if(d)d.t.forEach(function(t){if(t*1000>=fromMs)ts[t]=1;});});
  var T=Object.keys(ts).map(Number).sort(function(a,b){return a-b;});if(T.length<2)return null;
  var ptr={},last={};
  var pts=T.map(function(t){
    var val=0,cost=0,costVal=0,missing=0;
    hs.forEach(function(h){
      var d=hist[h.sym];if(!d){missing++;return;}
      var i=ptr[h.sym]||0;while(i+1<d.t.length&&d.t[i+1]<=t)i++;ptr[h.sym]=i;
      var px=stkToGBP(d.c[i],d.currency);if(px==null)return;
      var v=(+h.units||0)*px;val+=v;
      var bs=stkSuspect(h)?0:stkBasis(h);if(bs>0){cost+=h.units*bs;costVal+=v;}
    });
    return{t:t*1000,v:val,ret:cost>0?(costVal-cost)/cost*100:null,cost:cost};
  });
  return pts;
}
function stkFmtDate(ms,long){var d=new Date(ms);return long?d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):d.toLocaleDateString('en-GB',{month:'short',year:'2-digit'});}
function stkChartSVG(pts,view,costLine){
  var W=800,H=250,L=58,R=12,T=14,B=26,xs=pts.map(function(p){return p.t;}),x0=xs[0],x1=xs[xs.length-1];
  var ys=pts.map(function(p){return view==='value'?p.v:p.ret;}).filter(function(v){return v!=null;});
  if(view==='value'&&costLine>0)ys=ys.concat([costLine]);if(view==='return')ys=ys.concat([0]);
  var lo=Math.min.apply(null,ys),hi=Math.max.apply(null,ys);if(hi-lo<1e-9){hi=lo+1;}var pad=(hi-lo)*.08;lo-=pad;hi+=pad;
  var X=function(t){return L+(t-x0)/(x1-x0||1)*(W-L-R);},Y=function(v){return T+(1-(v-lo)/(hi-lo))*(H-T-B);};
  var line='',first=true;pts.forEach(function(p){var v=view==='value'?p.v:p.ret;if(v==null)return;line+=(first?'M':'L')+X(p.t).toFixed(1)+' '+Y(v).toFixed(1)+' ';first=false;});
  var lastP=null;for(var i=pts.length-1;i>=0;i--){if((view==='value'?pts[i].v:pts[i].ret)!=null){lastP=pts[i];break;}}
  var up=view==='value'?(costLine>0?lastP.v>=costLine:lastP.v>=pts[0].v):(lastP.ret>=0),col=up?'#3ecf8e':'#e05c5c';
  var ref=view==='value'?(costLine>0?costLine:null):0,grid='',n;
  for(n=0;n<=3;n++){var gv=lo+(hi-lo)*n/3;grid+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(gv).toFixed(1)+'" y2="'+Y(gv).toFixed(1)+'" stroke="rgba(255,255,255,.06)"/><text x="'+(L-6)+'" y="'+(Y(gv)+3).toFixed(1)+'" text-anchor="end" fill="#6b8197" font-size="10" font-family="Share Tech Mono,monospace">'+(view==='value'?'£'+(Math.abs(gv)>=1000?(gv/1000).toFixed(1)+'k':Math.round(gv)):(gv>=0?'+':'')+gv.toFixed(0)+'%')+'</text>';}
  for(n=0;n<=3;n++){var tx=x0+(x1-x0)*n/3;grid+='<text x="'+X(tx).toFixed(1)+'" y="'+(H-8)+'" text-anchor="'+(n===0?'start':n===3?'end':'middle')+'" fill="#6b8197" font-size="10" font-family="Share Tech Mono,monospace">'+stkFmtDate(tx)+'</text>';}
  var area=line?line+'L'+X(lastP.t).toFixed(1)+' '+(H-B)+' L'+X(pts[0].t).toFixed(1)+' '+(H-B)+' Z':'';
  return '<svg viewBox="0 0 '+W+' '+H+'" width="100%" preserveAspectRatio="none" style="display:block;height:230px"><defs><linearGradient id="stkg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+col+'" stop-opacity=".28"/><stop offset="1" stop-color="'+col+'" stop-opacity="0"/></linearGradient></defs>'+grid
    +(ref!=null?'<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(ref).toFixed(1)+'" y2="'+Y(ref).toFixed(1)+'" stroke="#e0b44a" stroke-dasharray="5 4" stroke-width="1.2"/><text x="'+(W-R)+'" y="'+(Y(ref)-4).toFixed(1)+'" text-anchor="end" fill="#e0b44a" font-size="10" font-family="Share Tech Mono,monospace">'+(view==='value'?'you put in £'+Math.round(ref).toLocaleString('en-GB'):'your entry price')+'</text>':'')
    +'<path d="'+area+'" fill="url(#stkg)"/><path d="'+line+'" fill="none" stroke="'+col+'" stroke-width="2" stroke-linejoin="round"/>'
    +'<line id="stk-ch-cur" x1="0" x2="0" y1="'+T+'" y2="'+(H-B)+'" stroke="rgba(255,255,255,.4)" style="display:none"/></svg>';
}
var _stkChToken=0;
async function stkChartRender(){
  var box=document.getElementById('stk-chart');if(!box)return;
  var hs=stkVisible().filter(function(h){return +h.units>0&&h.sym;});
  var seg=function(k,opts){return '<span class="stk-seg">'+opts.map(function(o){return'<button class="'+(_stkCh[k]===o[0]?'on':'')+'" onclick="stkChSet(\''+k+'\',\''+o[0]+'\')">'+o[1]+'</button>';}).join('')+'</span>';};
  var head='<div class="stk-ch-hd"><b>PERFORMANCE'+(alState.activePie==='all'?' · ALL INVESTMENTS':' · '+stkEsc(stkPieName(alState.activePie)).toUpperCase())+'</b><span style="display:flex;gap:8px;flex-wrap:wrap">'+seg('view',[['value','Value £'],['return','Return vs entry %']])+seg('range',[['1M','1M'],['3M','3M'],['6M','6M'],['1Y','1Y'],['MAX','MAX'],['ADDED','Since added']])+'</span></div>';
  if(!hs.length){box.innerHTML=head+'<div class="stk-note" style="text-align:center;padding:18px">Add holdings to see how they have performed.</div>';return;}
  var tok=++_stkChToken;box.innerHTML=head+'<div class="stk-note" style="text-align:center;padding:30px">Loading price history…</div>';
  var syms=[];hs.forEach(function(h){if(syms.indexOf(h.sym)<0)syms.push(h.sym);});
  var rg=_stkCh.range,api=STK_RANGE_API[rg]||'6mo',from=0;
  if(rg==='ADDED'){var a=stkAddedMs(hs);var days=(Date.now()-a)/864e5;api=days>360?(days>1700?'max':'5y'):'1y';from=a-2*864e5;}
  else if(rg==='1M')from=Date.now()-31*864e5;
  var hist=await stkHistFetch(syms,api);
  if(tok!==_stkChToken)return;
  var have=hs.filter(function(h){return hist[h.sym];}),skipped=hs.length-have.length;
  var pts=have.length?stkBuildSeries(have,hist,from):null;
  if(!pts){box.innerHTML=head+'<div class="stk-note" style="text-align:center;padding:24px">Price history is not available right now'+(skipped?' for '+skipped+' holding'+(skipped===1?'':'s'):'')+'. Try again in a moment.</div>';return;}
  var costKnown=have.every(function(h){return stkBasis(h)>0&&!stkSuspect(h);}),cost=have.reduce(function(s,h){return s+((stkBasis(h)>0&&!stkSuspect(h))?h.units*stkBasis(h):0);},0);
  var view=_stkCh.view;if(view==='return'&&pts.every(function(p){return p.ret==null;}))view='value';
  var lastP=pts[pts.length-1],firstP=pts[0];
  var chg=view==='value'?(lastP.v-firstP.v):(lastP.ret-firstP.ret);
  var sum=view==='value'?'<b>£'+Math.round(lastP.v).toLocaleString('en-GB')+'</b> now · '+(chg>=0?'+':'−')+'£'+Math.abs(Math.round(chg)).toLocaleString('en-GB')+' over this period':
    '<b>'+(lastP.ret>=0?'+':'')+lastP.ret.toFixed(1)+'%</b> vs your entry price'+(costKnown?'':' (holdings with a cost only)');
  box.innerHTML=head+'<div style="font-size:max(.52rem,var(--vi-fs-1));color:var(--t2);margin-bottom:4px">'+sum+'</div><div class="stk-ch-box" id="stk-ch-box">'+stkChartSVG(pts,view,costKnown?cost:0)+'<div class="stk-ch-tip" id="stk-ch-tip"></div></div>'
    +'<div class="stk-note">Built from your current holdings × their historical prices, in £ at today’s exchange rate, not your trade history. '+(rg==='ADDED'?'Starts from when you added them. ':'')+(skipped?skipped+' holding'+(skipped===1?' has':'s have')+' no price history and '+(skipped===1?'is':'are')+' left out. ':'')+'</div>';
  var bx=document.getElementById('stk-ch-box');
  if(bx)(function(pts,view){
    var svg=bx.querySelector('svg'),tip=document.getElementById('stk-ch-tip'),cur=document.getElementById('stk-ch-cur');
    function mv(cx){var r=svg.getBoundingClientRect(),f=Math.min(1,Math.max(0,(cx-r.left-r.width*58/800)/(r.width*(800-58-12)/800)));var i=Math.round(f*(pts.length-1)),p=pts[i];if(!p)return;
      var v=view==='value'?p.v:p.ret;if(v==null)return;tip.style.display='block';cur.style.display='';var x=58+(p.t-pts[0].t)/(pts[pts.length-1].t-pts[0].t||1)*(800-58-12);cur.setAttribute('x1',x);cur.setAttribute('x2',x);
      tip.textContent=stkFmtDate(p.t,true)+'  '+(view==='value'?'£'+Math.round(v).toLocaleString('en-GB'):(v>=0?'+':'')+v.toFixed(1)+'%');}
    bx.addEventListener('mousemove',function(e){mv(e.clientX);});bx.addEventListener('touchmove',function(e){if(e.touches[0])mv(e.touches[0].clientX);},{passive:true});
    bx.addEventListener('mouseleave',function(){tip.style.display='none';cur.style.display='none';});
  })(pts,view);
}
function stkAutoRefresh(){
  try{
    if(!viLiveOn())return;
    stkEnsure();
    if(!alState.stocks.length)return;
    var stale=alState.stocks.some(function(h){return !h.manualPrice&&(!h.updated||Date.now()-h.updated>5*60*1000);});
    if(stale)stkRefresh(true);
  }catch(e){}
}

setInterval(function(){try{var el=document.getElementById('assets-stocks');if(document.visibilityState==='visible'&&el&&el.classList.contains('active'))stkAutoRefresh();}catch(e){}},300000);
document.addEventListener('visibilitychange',function(){try{var el=document.getElementById('assets-stocks');if(document.visibilityState==='visible'&&el&&el.classList.contains('active'))stkAutoRefresh();}catch(e){}});

// ── CSV import (Trading 212 history export or ticker,units,avg cost) ──
function stkParseCSV(text){
  var rows=[],row=[],cur='',q=false;
  for(var i=0;i<text.length;i++){
    var ch=text[i];
    if(q){if(ch==='"'){if(text[i+1]==='"'){cur+='"';i++;}else q=false;}else cur+=ch;}
    else if(ch==='"')q=true;
    else if(ch===','){row.push(cur);cur='';}
    else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cur);cur='';if(row.length>1||row[0]!=='')rows.push(row);row=[];}
    else cur+=ch;
  }
  if(cur!==''||row.length){row.push(cur);rows.push(row);}
  return rows;
}
function stkRowsToHoldings(rows){
  if(!rows.length)return null;
  var head=rows[0].map(function(h){return String(h).replace(/^﻿/,'').trim().toLowerCase();});
  function col(names){
    for(var n=0;n<names.length;n++){var i=head.indexOf(names[n]);if(i>=0)return i;}
    for(var m=0;m<names.length;m++){for(var j=0;j<head.length;j++)if(head[j].indexOf(names[m])===0)return j;}
    return -1;
  }
  var iT=col(['ticker','symbol','instrument']),iName=col(['name']);
  var iAct=col(['action']),iSh=col(['no. of shares','shares','quantity','units','qty']);
  if(iT<0||iSh<0)return null;
  var out=[];
  if(iAct>=0){ // Trading 212 history: replay buys/sells into a current position
    var iTot=col(['total']),iTotCcy=col(['currency (total)']),map={};
    rows.slice(1).forEach(function(r){
      var act=String(r[iAct]||'').toLowerCase(),buy=/buy/.test(act),sell=/sell/.test(act);
      if(!buy&&!sell)return;
      var t=String(r[iT]||'').trim().toUpperCase();if(!t)return;
      var n=parseFloat(r[iSh]);if(!(n>0))return;
      var tot=Math.abs(parseFloat(r[iTot])),gbp=iTotCcy<0||!r[iTotCcy]||String(r[iTotCcy]).toUpperCase()==='GBP';
      var m=map[t]=map[t]||{sym:t,name:iName>=0?r[iName]:'',units:0,bought:0,cost:0};
      if(buy){m.units+=n;m.bought+=n;if(tot>0&&gbp)m.cost+=tot;}else m.units-=n;
    });
    Object.keys(map).forEach(function(k){var m=map[k];if(m.units>0.000001)out.push({sym:m.sym,name:m.name,units:+m.units.toFixed(8),avgCost:(m.bought>0&&m.cost>0)?m.cost/m.bought:0});});
    return{pie:'Trading 212',holdings:out};
  }
  var iC=col(['avg cost','average cost','avg price','average price','cost per share','buy price','price']);
  rows.slice(1).forEach(function(r){
    var t=String(r[iT]||'').trim().toUpperCase(),n=parseFloat(r[iSh]);
    if(!t||!(n>0))return;
    var c=iC>=0?parseFloat(String(r[iC]).replace(/[£$,]/g,'')):0;
    out.push({sym:t,name:iName>=0?r[iName]:'',units:n,avgCost:c>0?c:0});
  });
  return{pie:'Imported',holdings:out};
}
function stkImportCSV(inp){
  var f=inp.files&&inp.files[0];
  if(!f)return;
  var rd=new FileReader();
  rd.onload=function(){
    try{
      var res=stkRowsToHoldings(stkParseCSV(String(rd.result||'')));
      if(!res||!res.holdings.length){showToast('Could not find holdings in that CSV. It needs Ticker + Units columns');inp.value='';return;}
      stkEnsure();
      var pie=alState.stockPies.find(function(p){return p.name===res.pie;});
      if(!pie){pie={id:Date.now(),name:res.pie};alState.stockPies.push(pie);}
      res.holdings.forEach(function(h){
        var ex=alState.stocks.find(function(x){return x.pie===pie.id&&x.sym===h.sym;});
        if(ex){ex.units=h.units;if(h.avgCost>0)ex.avgCost=h.avgCost;if(h.name&&!ex.name)ex.name=h.name;}
        else alState.stocks.push({id:Date.now()+Math.floor(Math.random()*1e6),pie:pie.id,sym:h.sym,name:h.name||'',units:h.units,avgCost:h.avgCost||0,price:0});
      });
      alState.activePie=pie.id;
      stkSave();
      showToast('Imported '+res.holdings.length+' holding'+(res.holdings.length===1?'':'s')+' into “'+pie.name+'” ✓');
      stkRefresh(true);
    }catch(e){showToast('That file could not be read');}
    inp.value='';
  };
  rd.readAsText(f);
}


// ── Screenshot import: read tickers + values from pie/portfolio screenshots (no platform connection) ──
var _shot={rows:[],portfolio:'',busy:false};
function stkShotStart(){
  if(!_supaUser){showToast('Sign in first. Screenshot reading is for signed-in accounts');return;}
  var i=document.getElementById('stk-shot');if(i)i.click();
}
function stkShotClose(){var o=document.getElementById('stk-shot-ov');if(o)o.remove();_shot={rows:[],portfolio:'',busy:false};}
function stkShotModal(title,body,foot){
  var o=document.getElementById('stk-shot-ov');
  if(!o){o=document.createElement('div');o.id='stk-shot-ov';o.className='stk-shot-ov';document.body.appendChild(o);}
  o.innerHTML='<div class="stk-shot"><div class="stk-shot-hd"><span>'+title+'</span><span style="cursor:pointer" onclick="stkShotClose()"><svg class="vi-ic g" role="img" aria-label="Close"><use href="#vi-close"/></svg></span></div><div class="stk-shot-bd">'+body+'</div><div class="stk-shot-ft">'+(foot||'')+'</div></div>';
}
function stkShotDownscale(file){
  return new Promise(function(res,rej){
    var img=new Image(),url=URL.createObjectURL(file);
    img.onload=function(){
      var m=1800,sc=Math.min(1,m/Math.max(img.width,img.height)),c=document.createElement('canvas');
      c.width=Math.round(img.width*sc);c.height=Math.round(img.height*sc);
      c.getContext('2d').drawImage(img,0,0,c.width,c.height);
      URL.revokeObjectURL(url);
      res({media_type:'image/jpeg',data:c.toDataURL('image/jpeg',0.85).split(',')[1]});
    };
    img.onerror=function(){URL.revokeObjectURL(url);rej(new Error('bad image'));};
    img.src=url;
  });
}
function stkShotNorm(n){return String(n||'').toLowerCase().replace(/[^a-z0-9]+/g,'').replace(/(inc|corp|corporation|plc|ltd|group|holdings|co)$/,'');}
async function stkShotPicked(inp){if(viBlockEdit())return;
  var files=Array.prototype.slice.call(inp.files||[],0,4);inp.value='';
  if(!files.length)return;
  stkShotModal('📷 Reading your screenshots','<div style="text-align:center;padding:28px 0">Reading '+files.length+' screenshot'+(files.length===1?'':'s')+'… this takes a few seconds.<br><span style="opacity:.6">Sent to Anthropic (Claude) to be read. Vault-It does not store it. Tip: crop out names and account numbers first.</span></div>','');
  try{
    var images=[];for(var i=0;i<files.length;i++)images.push(await stkShotDownscale(files[i]));
    var r=await _fnInvoke('portfolio-vision',{images:images},60000,true);
    var d=r.data;
    if(r.error||!d||!d.holdings){
      var eb=null;try{if(r.error&&r.error.context&&r.error.context.json)eb=await r.error.context.json();}catch(e){}
      var code=(eb&&eb.error)||'';
      var msg=code==='limit'?(eb.message||'You’ve used this month’s screenshot reads. They reset on the 1st.'):
        code==='not_configured'?'Screenshot reading isn’t switched on for this app yet. You can still add holdings by ticker or CSV.':
        code==='unreadable'?'I couldn’t find any holdings in those screenshots. Try a clearer screenshot of the holdings list.':
        'Couldn’t read the screenshots right now. Please try again, or add holdings by ticker.'+((eb&&(eb.detail||eb.upstream))?' ('+(eb.upstream?eb.upstream+': ':'')+(eb.detail||'')+')':(r.error&&r.error.message?' ('+r.error.message+')':''));
      stkShotModal('📷 Import screenshots','<div class="stk-shot-err">'+stkEsc(msg)+'</div>','<button class="stk-btn" onclick="stkShotClose()">Close</button>');
      return;
    }
    // merge duplicates (overlapping scrolled screenshots): keep the row that has a value
    var seen={},rows=[];
    d.holdings.forEach(function(h){
      var k=stkShotNorm(h.name);if(!k)return;
      if(seen[k]!==undefined){var o=rows[seen[k]];if(!(o.value>0)&&h.value>0)rows[seen[k]]=h;return;}
      seen[k]=rows.length;rows.push(h);
    });
    rows=rows.filter(function(h){return h.value>0||h.shares>0;}).map(function(h){
      var cands=(h.candidates||[]).slice();
      if(h.ticker&&!cands.some(function(c){return c.symbol===h.ticker;}))cands.unshift({symbol:h.ticker,name:h.name,exchange:'',type:''});
      return{name:h.name,value:h.value,shares:h.shares,pl:h.pl,cands:cands,sym:(cands[0]&&cands[0].symbol)||'',inc:false,price:null,ccy:null};
    });
    if(!rows.length){stkShotModal('📷 Import screenshots','<div class="stk-shot-err">No holdings with values were found in those screenshots.</div>','<button class="stk-btn" onclick="stkShotClose()">Close</button>');return;}
    _shot.rows=rows;_shot.portfolio=d.portfolio||'';_shot.platform=viClean(String(d.platform||'')).slice(0,40);
    stkShotModal('📷 Reading prices…','<div style="text-align:center;padding:28px 0">Found '+rows.length+' holdings. Fetching live prices…</div>','');
    await stkShotPrice();
    stkShotReview();
  }catch(e){
    stkShotModal('📷 Import screenshots','<div class="stk-shot-err">Something went wrong reading those images. Please try again.</div>','<button class="stk-btn" onclick="stkShotClose()">Close</button>');
  }
}
async function stkShotPrice(){
  var syms=[];_shot.rows.forEach(function(r){if(r.sym&&syms.indexOf(r.sym)<0)syms.push(r.sym);});
  if(!syms.length)return;
  if(!localStorage.getItem('vi_fx_rates')&&typeof fetchExchangeRates==='function')await new Promise(function(res){try{fetchExchangeRates(function(){res();});setTimeout(res,2500);}catch(e){res();}});
  var res=await stkFetchQuotes(syms);
  _shot.quotes=(res&&res.quotes)||{};
  _shot.rows.forEach(function(r){stkShotCalc(r);r.inc=r.units>0;});
}
// units: stated in the screenshot, else value ÷ live £ price. cost basis: value − P/L.
function stkShotCalc(r){
  var q=(_shot.quotes||{})[r.sym];
  r.price=null;r.ccy=null;
  if(q){var g=stkToGBP(q.price,q.currency);if(g>0){r.price=g;r.ccy=q.currency;}}
  if(r.userUnits){r.units=r.userUnits;}
  else if(r.shares>0)r.units=r.shares;
  else if(r.price>0&&r.value>0)r.units=+(r.value/r.price).toFixed(6);
  else r.units=0;
  r.avgCost=(r.units>0&&r.pl!=null&&r.value>0&&r.value-r.pl>0)?(r.value-r.pl)/r.units:0;
}
function stkShotReview(){
  var prevSel=(document.getElementById('stk-shot-pie')||{}).value;
  var pies=alState.stockPies||[],dflt=_shot.portfolio?pies.find(function(p){return p.name.toLowerCase()===_shot.portfolio.toLowerCase();}):null;
  var pieSel='<select id="stk-shot-pie">'+pies.map(function(p){return'<option value="'+p.id+'"'+((prevSel?String(p.id)===prevSel:(dflt?dflt.id===p.id:p.id===alState.activePie))?' selected':'')+'>'+stkEsc(p.name)+'</option>';}).join('')+(_shot.portfolio&&!dflt?'<option value="new" selected><svg class="vi-ic g" aria-hidden="true"><use href="#vi-plus"/></svg> New pie: '+stkEsc(_shot.portfolio)+'</option>':'')+'<option value="newcustom"><svg class="vi-ic g" aria-hidden="true"><use href="#vi-plus"/></svg> New pie…</option></select>';
  var noPrice=0;
  var body='<div>Check each row and pick the right ticker if it guessed wrong. Shares are worked out from the value in your screenshot ÷ the live price, so they’re accurate to the pennies shown. Edit any number.</div>'+
    '<div style="margin:10px 0;display:flex;gap:8px;align-items:center;flex-wrap:wrap">Add to: <span style="flex:1;min-width:180px;max-width:260px">'+pieSel+'</span> Platform: <input id="stk-shot-plat" list="stk-plat-list2" type="text" maxlength="40" placeholder="e.g. Trading 212" value="'+stkEsc(_shot.platform||(stkPlatformMatch(_shot.portfolio)||{}).n||'')+'" style="flex:1;min-width:140px;max-width:220px;background:rgb(var(--panel-rgb) / .8);border:1px solid rgb(var(--teal-rgb) / .25);border-radius:4px;color:var(--text);font-size:12px;padding:5px 6px"><datalist id="stk-plat-list2">'+STK_PLATFORMS.map(function(x){return'<option value="'+stkEsc(x.n)+'">';}).join('')+'</datalist></div>'+
    '<table class="stk-shot-tbl"><thead><tr><th></th><th>HOLDING</th><th>TICKER</th><th class="hide-m">VALUE £</th><th>SHARES</th></tr></thead><tbody>';
  _shot.rows.forEach(function(r,i){
    if(!(r.price>0))noPrice++;
    var opts=r.cands.map(function(c){return'<option value="'+stkEsc(c.symbol)+'"'+(c.symbol===r.sym?' selected':'')+'>'+stkEsc(c.symbol+(c.exchange?' · '+c.exchange:''))+'</option>';}).join('')+'<option value="__custom">Other…</option>';
    body+='<tr><td><input type="checkbox" '+(r.inc?'checked':'')+' onchange="_shot.rows['+i+'].inc=this.checked;stkShotFoot()"></td>'+
      '<td>'+stkEsc(r.name)+(r.price>0?'':'<div class="stk-shot-warn">no live price found</div>')+'</td>'+
      '<td><select onchange="stkShotTicker('+i+',this)">'+opts+'</select></td>'+
      '<td class="hide-m">'+(r.value>0?'£'+r.value.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2}):'–')+'</td>'+
      '<td><input type="number" step="any" min="0" value="'+(r.units>0?r.units:'')+'" onchange="stkShotUnits('+i+',this)"></td></tr>';
  });
  body+='</tbody></table>'+(noPrice?'<div class="stk-shot-warn" style="margin-top:8px">'+noPrice+' holding'+(noPrice===1?'':'s')+' have no live price yet. Choose another ticker or type the shares yourself.</div>':'');
  stkShotModal('📷 Review holdings',body,'<span id="stk-shot-count" style="margin-right:auto"></span><button class="stk-btn" onclick="stkShotClose()">Cancel</button><button class="btn-add-data" onclick="stkShotConfirm()">Add to my portfolio</button>');
  stkShotFoot();
}
function stkShotFoot(){
  var n=_shot.rows.filter(function(r){return r.inc&&r.units>0&&r.sym;}).length;
  var t=_shot.rows.reduce(function(s,r){return s+((r.inc&&r.units>0&&r.price>0)?r.units*r.price:0);},0);
  var el=document.getElementById('stk-shot-count');
  if(el)el.textContent=n+' selected · ≈ £'+t.toLocaleString('en-GB',{maximumFractionDigits:0});
}
async function stkShotTicker(i,sel){
  var r=_shot.rows[i],v=sel.value;
  if(v==='__custom'){v=(prompt('Ticker symbol, e.g. VUSA.L or AAPL')||'').trim().toUpperCase();if(!/^[A-Z0-9.\-^=]{1,15}$/.test(v)){stkShotReview();return;}if(!r.cands.some(function(c){return c.symbol===v;}))r.cands.unshift({symbol:v,name:r.name,exchange:'',type:''});}
  r.sym=v;r.userUnits=0;
  if(!(_shot.quotes||{})[v]){var res=await stkFetchQuotes([v]);if(res&&res.quotes){_shot.quotes=Object.assign(_shot.quotes||{},res.quotes);}}
  stkShotCalc(r);r.inc=r.units>0;stkShotReview();
}
function stkShotUnits(i,inp){var r=_shot.rows[i];r.userUnits=parseFloat(inp.value)||0;stkShotCalc(r);if(r.units>0)r.inc=true;stkShotFoot();}
function stkShotConfirm(){
  stkEnsure();
  var sel=(document.getElementById('stk-shot-pie')||{}).value,pie;
  if(sel==='new'||sel==='newcustom'){
    var nm=sel==='new'?_shot.portfolio:(prompt('Name for the new pie')||'').trim();
    if(!nm)return;
    pie={id:Date.now(),name:nm.slice(0,40)};alState.stockPies.push(pie);
  } else pie=alState.stockPies.find(function(p){return String(p.id)===String(sel);})||alState.stockPies[0];
  var _pv=viClean(String((document.getElementById('stk-shot-plat')||{}).value||'').trim()).slice(0,40);
  if(_pv&&!pie.platform){pie.platform={name:(stkPlatformMatch(_pv)||{}).n||_pv};delete pie.platformOff;}
  var n=0;
  _shot.rows.forEach(function(r){
    if(!r.inc||!(r.units>0)||!r.sym)return;
    var ex=alState.stocks.find(function(x){return x.pie===pie.id&&x.sym===r.sym;});
    if(ex){ex.units=r.units;if(r.avgCost>0)ex.avgCost=r.avgCost;if(!ex.name)ex.name=r.name;}
    else alState.stocks.push({id:Date.now()+Math.floor(Math.random()*1e6),pie:pie.id,sym:r.sym,name:r.name,units:r.units,avgCost:r.avgCost>0?r.avgCost:0,price:r.price>0?r.price:0,src:'screenshot'});
    n++;
  });
  alState.activePie=pie.id;
  stkShotClose();
  if(!n){showToast('Nothing selected to add');return;}
  stkSave();
  showToast('Added '+n+' holding'+(n===1?'':'s')+' to “'+pie.name+'” ✓');
  stkRefresh(true);
}

// Liabilities: their current asset value ADDS to NW; only running costs detract
function alLiabAssetTotal(){return alState.liabilities.reduce(function(s,l){return s+depreciatedValue(l);},0);}
function alLiabMonthly(){return (alState.liabilities||[]).reduce(function(s,l){return s+(+l.runningCost>0?+l.runningCost:0);},0);}
function alLiabCostLine(){var mo=alLiabMonthly(),acc=alTotalLiab();return mo>0?gbpFmt(mo)+'/mo running · '+gbpFmt(acc)+' so far':'no running costs';}
function alTotalLiab(){
  // Returns accumulated running costs (monthly cost × months held)
  return alState.liabilities.reduce(function(s,l){
    if(!l.runningCost||l.runningCost<=0)return s;
    var mths=Math.max(0,(Date.now()-new Date(l.addedDate||Date.now()).getTime())/(1000*60*60*24*30.44));
    return s+l.runningCost*mths;
  },0);
}
function alTotalAssets(){
  var liabAssets=alLiabAssetTotal();
  return alTotalMetals()+alTotalCrypto()+alTotalCash()+alTotalOther()+alTotalStocks()+(state?state.saved:0)+liabAssets+(typeof alTotalOwedToMe==='function'?alTotalOwedToMe():0);
}
function computeNetWorth(){return alTotalAssets()+totalAssets()-alTotalLiab()-debtTotal()-totalDebts();}


