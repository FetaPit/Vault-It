// ═══════════════════════════════════════════════════════════════
// 3D CREDIT CARDS — real ID-1 proportions (85.60 × 53.98 mm, 0.76 mm thick, 3.18 mm corner radius).
// The issuer is read from the card's name (and an optional issuer/network the user sets); the card gets that issuer's
// brand colours, logo and network mark. A photo of the user's own card can be imprinted as the front for the exact design.
// ═══════════════════════════════════════════════════════════════
function ccBrand(d){   // scan the card's text (name, issuer the user typed) for a known company
  var c=(d&&d.card)||{},txt=[c.issuer,d&&d.name].filter(Boolean).join(' ');
  for(var i=0;i<CC_BRANDS.length;i++)if(CC_BRANDS[i].re.test(txt))return CC_BRANDS[i];
  return null;
}
function ccNetwork(d,b){
  var c=(d&&d.card)||{};if(c.network&&c.network!=='auto')return c.network==='none'?null:c.network;
  var t=String((c.issuer||'')+' '+(d&&d.name||''));
  if(/amex|american\s*express/i.test(t))return 'amex';if(/master\s*card/i.test(t))return 'mc';if(/\bvisa\b/i.test(t))return 'visa';
  return (b&&b.net&&b.net!=='visa'&&b.net!=='mc')?b.net:null;
}
function ccNetMark(n){
  if(n==='visa')return '<span class="cc3-net cc3-visa">VISA</span>';
  if(n==='mc')return '<span class="cc3-net cc3-mc"><i></i><i></i></span>';
  if(n==='amex')return '<span class="cc3-net cc3-amex">AMEX</span>';
  return '';
}
function ccEsc(t){return viClean(String(t==null?'':t));}
function cc3dHTML(d,pctNum,shown){
  if(shown==null)shown=pctNum;
  var b=ccBrand(d)||CC_GENERIC,c=d.card||{},net=ccNetwork(d,b),fg=b.fg;
  var bg=c.art?'background:#000 url('+c.art+') center/cover':'background:linear-gradient(135deg,'+b.g[0]+','+b.g[1]+')';
  var domain=b.d,logo=c.logo?'<img alt="" src="'+c.logo+'">':(domain?'<img alt="" loading="lazy" referrerpolicy="no-referrer" src="https://www.google.com/s2/favicons?domain='+domain+'&sz=64" onerror="this.style.display=\'none\'">':'');
  var isCard=ccIsCard(d),tlabel=(typeof DEBT_TYPE_LABELS!=='undefined'&&DEBT_TYPE_LABELS[d.type])||'Loan';
  var mono=ccEsc((b.n||c.issuer||d.name||'?').trim().charAt(0).toUpperCase());
  var last4=/^\d{4}$/.test(c.last4||'')?c.last4:'••••';
  var shownName=ccEsc(d.name);
  var art=!!c.art;
  var inner=(art?'':'<div class="cc3-sheen"></div>'+(b.acc?'<div class="cc3-acc" style="background:'+b.acc+'"></div>':''))
    +(art?'':'<div class="cc3-logo"><span>'+mono+'</span>'+logo+'</div>')
    +(art||isCard?'':'<svg class="vi-ic cc3-ticon" aria-hidden="true"><use href="#'+(DEBT_TYPE_ICONS[d.type]||'vi-loan')+'"/></svg>')
    +(art||!isCard?'':'<div class="cc3-chip"><i></i><i></i><i></i></div><svg class="cc3-nfc" viewBox="0 0 24 24" fill="none" stroke="'+fg+'" stroke-width="2" stroke-linecap="round"><path d="M8 6c3 3.5 3 8.500 0 12M12 4c4.500 5 4.500 11 0 16M16 2c6 6.500 6 13.500 0 20"/></svg>')
    +(art?'':(isCard?'<div class="cc3-num">•••• •••• •••• '+last4+'</div>':'<div class="cc3-type">'+ccEsc(tlabel)+'</div>')+(isCard||String(d.name||'').toLowerCase().indexOf(tlabel.toLowerCase())===-1?'<div class="cc3-name">'+shownName+'</div>':'')+(isCard?ccNetMark(net):''));
  // the card is cut along its x axis: the paid share on the right is cut off and greyed, the unpaid share on the left stays full colour
  var P=Math.max(0,Math.min(100,shown));
  var f='<div class="cc3-face cc3-front">'
    +'<div class="cc3-lay cc3-base" style="'+bg+';color:'+fg+';clip-path:inset(0 '+P+'% 0 0)">'+inner+'</div>'
    +'<div class="cc3-lay cc3-piece" style="'+bg+';color:'+fg+';clip-path:inset(0 0 0 '+(100-P)+'%)">'+inner+'</div>'
    +(P>0&&P<100?'<div class="cc3-cutline cc3-cl-old" style="left:'+(100-P)+'%"></div>':'')
    +'<div class="cc3-cutline cc3-cl-new" style="left:'+(100-P)+'%;'+(P>0&&P<100?'display:none':'display:none')+'"></div>'
    +'<div class="cc3-scis" aria-hidden="true"><svg viewBox="-12 -14 24 32"><g class="cc3-bl a"><path d="M0 0 L-2.600 15 L-.8 15.500 L1.200 0Z" fill="#dfe6ea" stroke="#6b7780" stroke-width=".5"/><circle cx="-5.500" cy="-9" r="3.600" fill="none" stroke="#e05c5c" stroke-width="2"/><path d="M-4 -6.500 L0 0" stroke="#6b7780" stroke-width="1.400"/></g><g class="cc3-bl b"><path d="M0 0 L2.600 15 L.8 15.500 L-1.200 0Z" fill="#dfe6ea" stroke="#6b7780" stroke-width=".5"/><circle cx="5.500" cy="-9" r="3.600" fill="none" stroke="#e05c5c" stroke-width="2"/><path d="M4 -6.500 L0 0" stroke="#6b7780" stroke-width="1.400"/></g><circle r="1.200" fill="#6b7780"/></svg></div>'
    +(pctNum>0&&pctNum<100?'<div class="cc3-pct">'+pctNum+'% paid</div>':'')
    +'<div class="cc3-stamp">PAID OFF ✓</div>'
    +'<div class="cc3-gloss"></div></div>';
  // the back earns the turn: debt-free date, what the debt costs, and the payments made (E33b)
  // the cut layers carry only the stripe; the words sit on one layer above them, so the cut never splits a figure
  var binner=isCard?'<div class="cc3-stripe"></div>':'';
  var bfacts='<div class="cc3-lay cc3-bfacts">'+(isCard?'':'<div class="cc3-type cc3-btype">'+ccEsc(tlabel)+'</div>')+ccBackFacts(d)+'</div>';
  // seen from behind the x axis is mirrored, so the cut-off (paid) part is on the left of the back
  var back='<div class="cc3-face cc3-back">'
    +'<div class="cc3-lay cc3-bbase" style="clip-path:inset(0 0 0 '+P+'%)">'+binner+'</div>'
    +'<div class="cc3-lay cc3-bpiece" style="clip-path:inset(0 '+(100-P)+'% 0 0)">'+binner+'</div>'
    +(P>0&&P<100?'<div class="cc3-cutline cc3-bcl" style="left:'+P+'%"></div>':'')
    +bfacts+'<div class="cc3-gloss"></div></div>';
  return '<div class="cc3'+(isCard?'':' cc3-loan')+(P>=100?' cc3-ghost':'')+'" data-id="'+d.id+'" data-from="'+shown+'" data-to="'+pctNum+'" role="img" aria-label="'+ccEsc(d.name)+(isCard?' credit card':', '+ccEsc(tlabel))+'. Drag to rotate, double-click to flip">'
    +'<div class="cc3-body" style="--ry:-16deg;--rx:6deg">'+f+back
    +'<div class="cc3-edge cc3-e-t"></div><div class="cc3-edge cc3-e-b"></div><div class="cc3-edge cc3-e-l"></div><div class="cc3-edge cc3-e-r"></div></div></div>';
}
// drag / swipe to rotate, double-tap or the flip button to turn it over
(function(){
  var cur=null,sx=0,sy=0,ry0=0,rx0=0,moved=false,lastTap=0;
  function ang(el,k){return parseFloat(el.style.getPropertyValue(k))||0;}
  document.addEventListener('pointerdown',function(e){
    var c=e.target.closest&&e.target.closest('.cc3');if(!c)return;
    var b=c.querySelector('.cc3-body');cur={c:c,b:b};sx=e.clientX;sy=e.clientY;ry0=ang(b,'--ry');rx0=ang(b,'--rx');moved=false;b.classList.add('drag');
    try{c.setPointerCapture(e.pointerId);}catch(_){}
  });
  document.addEventListener('pointermove',function(e){
    if(!cur)return;var dx=e.clientX-sx,dy=e.clientY-sy;if(Math.abs(dx)+Math.abs(dy)>4)moved=true;
    cur.b.style.setProperty('--ry',(ry0+dx*0.6)+'deg');
    if(e.pointerType==='mouse')cur.b.style.setProperty('--rx',Math.max(-60,Math.min(60,rx0-dy*0.4))+'deg');
  });
  function up(e){
    if(!cur)return;cur.b.classList.remove('drag');
    if(!moved){var t=Date.now();if(t-lastTap<350){ccFlip(cur.c);lastTap=0;}else lastTap=t;}
    cur=null;
  }
  document.addEventListener('pointerup',up);document.addEventListener('pointercancel',up);
  document.addEventListener('dblclick',function(e){var c=e.target.closest&&e.target.closest('.cc3');if(c&&!('ontouchstart' in window))ccFlip(c);});
})();
function ccFlip(c){
  var b=c.querySelector('.cc3-body'),y=parseFloat(b.style.getPropertyValue('--ry'))||0;
  var n=Math.round((y-0)/180);var target=(Math.abs(((y%360)+360)%360-180)<90)?Math.round(y/360)*360:Math.round((y-180)/360)*360+180;
  b.classList.remove('drag');b.style.setProperty('--ry',target+'deg');b.style.setProperty('--rx','6deg');
}
function ccFlipId(id){var c=document.querySelector('.cc3[data-id="'+id+'"]');if(c)ccFlip(c);}
// ── edit the card: issuer text (scanned for a company), network, last 4, photo of the real card ──
var _ccEdit=null;
function ccOpenEdit(id){
  var d=debtState.debts.find(function(x){return x.id===id;});if(!d)return;
  _ccEdit={id:id,art:(d.card&&d.card.art)||'',logo:(d.card&&d.card.logo)||''};
  var c=d.card||{},o=document.getElementById('cc-ov'),isCard=ccIsCard(d);if(o)o.remove();
  o=document.createElement('div');o.id='cc-ov';o.className='hbc-ov';
  o.innerHTML='<div class="hbc" style="width:min(520px,100%)" role="dialog" aria-label="'+(isCard?'Card design':'Lender and logo')+'"><div class="hbc-hd"><span>'+(isCard?'💳 Card design':'Lender and logo')+'</span><span style="cursor:pointer;font-size:20px;padding:0 6px" onclick="ccCloseEdit()" aria-label="Close"><svg class="vi-ic g" role="img" aria-label="Close"><use href="#vi-close"/></svg></span></div>'
   +'<div style="padding:14px 16px"><div id="cc-prev" style="max-width:340px;margin:0 auto 12px"></div>'
   +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
   +'<div style="grid-column:1/-1"><label for="cc-issuer" style="display:block;font-size:max(10px,var(--vi-fs-1));color:var(--t3);margin-bottom:3px">'+(isCard?'Issuer / company on the card (we scan this and the card name for a known company)':'Lender or bank (we scan this and the debt name for a known company)')+'</label><input id="cc-issuer" type="text" maxlength="40" class="al-inp" style="width:100%" value="'+ccEsc(c.issuer||'')+'" placeholder="e.g. Barclaycard, Monzo, Amex"></div>'
   +(isCard?'<div><label style="display:block;font-size:max(10px,var(--vi-fs-1));color:var(--t3);margin-bottom:3px">Network</label><select id="cc-net" class="al-inp" style="width:100%"><option value="auto">Auto-detect</option><option value="visa">Visa</option><option value="mc">Mastercard</option><option value="amex">Amex</option><option value="none">None</option></select></div>'
   +'<div><label style="display:block;font-size:max(10px,var(--vi-fs-1));color:var(--t3);margin-bottom:3px">Last 4 digits (optional)</label><input id="cc-last4" type="text" inputmode="numeric" maxlength="4" class="al-inp" style="width:100%" value="'+ccEsc(c.last4||'')+'"></div>':'')
   +'</div>'
   +'<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">'+(isCard?'<label class="stk-btn" style="cursor:pointer">📷 Imprint a photo of my card<input type="file" accept="image/*" style="display:none" onchange="ccArtFile(this,\'art\')"></label>':'')+'<label class="stk-btn" style="cursor:pointer">🖼 Upload a logo<input type="file" accept="image/*" style="display:none" onchange="ccArtFile(this,\'logo\')"></label><button class="stk-btn" onclick="ccClearArt()">Use brand design</button></div>'
   +'<div style="font-size:10.5px;color:var(--t3);line-height:1.5;margin-top:8px">'+(isCard?'Brand designs use each company’s colours and logo, not the official card artwork. For the exact design, photograph the front of your card and imprint it. The photo stays in your account only. Hide the card number first if you prefer.':'Brand designs use each company’s colours and logo. If your lender is not recognised, upload its logo instead. It stays in your account only.')+'</div>'
   +'<div style="margin-top:12px;display:flex;gap:6px;justify-content:flex-end"><button class="stk-btn" onclick="ccCloseEdit()">Cancel</button><button class="btn-add-data" onclick="ccSaveEdit()">Save</button></div></div></div>';
  document.body.appendChild(o);
  var cn=document.getElementById('cc-net');if(cn)cn.value=c.network||'auto';
  ['cc-issuer','cc-net','cc-last4'].forEach(function(i){var e=document.getElementById(i);if(e)e.addEventListener('input',ccPreview);});
  ccPreview();
}
function ccDraft(){
  var d=debtState.debts.find(function(x){return x.id===_ccEdit.id;});
  var g=function(i){return (document.getElementById(i)||{}).value||'';};
  return Object.assign({},d,{card:{issuer:viClean(g('cc-issuer')).trim().slice(0,40),network:g('cc-net')||'auto',last4:g('cc-last4').replace(/\D/g,'').slice(0,4),art:_ccEdit.art,logo:_ccEdit.logo}});
}
function ccPreview(){var p=document.getElementById('cc-prev');if(p&&_ccEdit){var d=ccDraft(),o=d.original||d.balance,pc=o>0?Math.round(Math.max(0,Math.min(1,(o-d.balance)/o))*100):0;p.innerHTML=cc3dHTML(d,pc);}}
function ccArtFile(inp,kind){
  var f=inp.files&&inp.files[0];inp.value='';if(!f)return;
  var img=new Image(),u=URL.createObjectURL(f);
  img.onload=function(){
    var c=document.createElement('canvas'),ctx;
    if(kind==='art'){   // cover-crop to the real card ratio
      var W=640,H=Math.round(W*53.98/85.6),r=W/H,sr=img.width/img.height,sw,sh,sx,sy;
      if(sr>r){sh=img.height;sw=sh*r;sx=(img.width-sw)/2;sy=0;}else{sw=img.width;sh=sw/r;sx=0;sy=(img.height-sh)/2;}
      c.width=W;c.height=H;ctx=c.getContext('2d');ctx.drawImage(img,sx,sy,sw,sh,0,0,W,H);_ccEdit.art=c.toDataURL('image/jpeg',0.82);
    }else{var sc=Math.min(1,96/Math.max(img.width,img.height));c.width=Math.max(1,Math.round(img.width*sc));c.height=Math.max(1,Math.round(img.height*sc));c.getContext('2d').drawImage(img,0,0,c.width,c.height);var dd=c.toDataURL('image/png');_ccEdit.logo=dd.length>60000?c.toDataURL('image/jpeg',0.8):dd;}
    URL.revokeObjectURL(u);ccPreview();
  };
  img.onerror=function(){URL.revokeObjectURL(u);showToast('That image could not be read');};
  img.src=u;
}
function ccClearArt(){_ccEdit.art='';_ccEdit.logo='';ccPreview();}
function ccCloseEdit(){var o=document.getElementById('cc-ov');if(o)o.remove();_ccEdit=null;}
function ccSaveEdit(){if(viBlockEdit())return;
  var d=debtState.debts.find(function(x){return x.id===_ccEdit.id;});if(!d)return;
  var nd=ccDraft().card;
  if(!nd.issuer&&nd.network==='auto'&&!nd.last4&&!nd.art&&!nd.logo)delete d.card;else d.card=nd;
  var wasCard=ccIsCard(d);ccCloseEdit();saveDebtState();renderDebtTab();showToast(wasCard?'Card design saved ✓':'Lender and logo saved ✓');
}


// ── the slow, satisfying cut: scissors travel down the cut line, then the paid part greys and parts from the card ──
function ccReduced(){try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){return false;}}
function ccWatchCuts(root){
  (root||document).querySelectorAll('.cc3[data-from]').forEach(function(c){
    var a=+c.getAttribute('data-from'),b=+c.getAttribute('data-to');
    if(a===b||c._ccBusy){return;}
    if(ccReduced()||typeof IntersectionObserver==='undefined'){ccCut(c,a,b,true);return;}
    if(!_ccIO)_ccIO=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){_ccIO.unobserve(e.target);var el=e.target;ccCut(el,+el.getAttribute('data-from'),+el.getAttribute('data-to'),false);}});},{threshold:.6});
    _ccIO.observe(c);
  });
}
function ccCut(c,a,b,instant){
  if(c._ccBusy||!c.isConnected)return;
  var id=c.getAttribute('data-id');_ccPct[id]=b;
  var base=c.querySelector('.cc3-base'),piece=c.querySelector('.cc3-piece'),olds=c.querySelector('.cc3-cl-old'),nw=c.querySelector('.cc3-cl-new'),sc=c.querySelector('.cc3-scis');
  if(!base||!piece)return;
  var bb=c.querySelector('.cc3-bbase'),bp=c.querySelector('.cc3-bpiece'),bcl=c.querySelector('.cc3-bcl');
  var bclip=function(P){if(bb)bb.style.clipPath='inset(0 0 0 '+P+'%)';if(bp)bp.style.clipPath='inset(0 '+(100-P)+'% 0 0)';if(bcl){bcl.style.display=(P>0&&P<100)?'':'none';bcl.style.left=P+'%';}};
  var fin=function(){c.classList.toggle('cc3-ghost',b>=100);bclip(b);base.style.clipPath='inset(0 '+b+'% 0 0)';piece.style.clipPath='inset(0 0 0 '+(100-b)+'%)';
    if(olds)olds.style.display='none';if(nw){nw.style.display=(b>0&&b<100)?'':'none';nw.style.left=(100-b)+'%';nw.style.opacity='1';}if(sc)sc.style.opacity='0';c.setAttribute('data-from',b);c._ccBusy=false;};
  if(instant){fin();return;}
  c._ccBusy=true;
  var T1=3200,T2=2000,ease='cubic-bezier(.45,.05,.25,1)',phase2=function(){
    c.classList.toggle('cc3-ghost',b>=100);
    var o={duration:T2,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'};
    base.animate([{clipPath:'inset(0 '+a+'% 0 0)'},{clipPath:'inset(0 '+b+'% 0 0)'}],o);
    var pa=piece.animate([{clipPath:'inset(0 0 0 '+(100-a)+'%)'},{clipPath:'inset(0 0 0 '+(100-b)+'%)'}],o);
    if(olds)olds.animate([{opacity:1},{opacity:0}],{duration:T2*.6,fill:'forwards'});
    if(nw&&b>0&&b<100){nw.style.display='';nw.style.left=(100-b)+'%';nw.animate([{opacity:b>a?1:0},{opacity:1}],{duration:T2*.4,fill:'forwards'});}
    if(bb&&bp){bb.animate([{clipPath:'inset(0 0 0 '+a+'%)'},{clipPath:'inset(0 0 0 '+b+'%)'}],o);bp.animate([{clipPath:'inset(0 '+(100-a)+'% 0 0)'},{clipPath:'inset(0 '+(100-b)+'% 0 0)'}],o);}
    pa.onfinish=function(){try{[bb,bp].forEach(function(e){if(e)e.getAnimations().forEach(function(x){x.cancel();});});base.getAnimations().forEach(function(x){x.cancel();});piece.getAnimations().forEach(function(x){x.cancel();});}catch(e){}fin();};
  };
  if(b>a&&b<100&&sc&&nw){   // cutting: scissors snip down the new cut line, drawing it as they go
    sc.style.left=(100-b)+'%';nw.style.display='';nw.style.left=(100-b)+'%';
    sc.classList.add('snip');
    sc.animate([{opacity:0,top:'-14%'},{opacity:1,top:'-10%',offset:.08},{opacity:1,top:'98%',offset:.94},{opacity:0,top:'104%'}],{duration:T1,easing:'linear',fill:'forwards'});
    var cl=nw.animate([{transform:'scaleY(0)',opacity:1},{transform:'scaleY(1)',opacity:1}],{duration:T1*.86,delay:T1*.08,easing:'linear',fill:'both'});
    setTimeout(function(){sc.classList.remove('snip');phase2();},T1);
  } else if(b>=100&&b>a&&sc&&nw){   // fully paid: cut straight across the left edge
    phase2();
  } else phase2();
}
function makePayment(id){if(viBlockEdit())return;
  var d=debtState.debts.find(function(x){return x.id===id;});
  if(!d)return;
  var inp=document.getElementById('debt-pay-inp-'+id);
  var v=inp?parseFloat(inp.value)||0:0;
  if(v<=0){showToast('Enter a payment amount');return;}
  if(!d.original||d.original<=0)d.original=d.balance+v;
  var paid=Math.min(v,d.balance);   // an overpayment can only clear what is owed
  d.balance=Math.max(0,d.balance-v);
  d.payments=(d.payments||[]).concat([{id:Date.now(),amt:paid,date:new Date().toISOString()}]).slice(-50);
  if(inp)inp.value='';
  saveDebtState();renderDebtTab();updateKPIs();checkAchievements();
  showToast('£'+paid.toLocaleString('en-GB')+' payment recorded ✓ You can undo it on the card');
}
function undoPayment(id){if(viBlockEdit())return;
  var d=debtState.debts.find(function(x){return x.id===id;});
  if(!d||!d.payments||!d.payments.length)return;
  var p=d.payments.pop();
  d.balance=Math.round((d.balance+p.amt)*100)/100;
  if(!d.payments.length)delete d.payments;
  saveDebtState();renderDebtTab();updateKPIs();
  showToast('£'+(+p.amt).toLocaleString('en-GB')+' payment undone');
}
// “I’ve added every debt I owe” — the confirmation that completes the Roadmap’s Map Debts stage
function renderDebtMapConfirm(){
  var el=document.getElementById('debt-map-confirm');if(!el)return;
  var n=(debtState.debts||[]).length,libs=(alState.liabilities||[]).length,k=(n>0||libs>0)?'debtsMapped':'noDebt';
  var on=k==='debtsMapped'?fireDebtsConfirmed():fireMan(k);
  el.innerHTML='<label class="map-tick"><input type="checkbox" '+(on?'checked ':'')+'onchange="fireTick(\''+k+'\',this.checked)"><span><b>'+(k==='debtsMapped'?'I’ve added every debt I owe':'I don’t have any debts')+'</b>'
    +'<small>'+(on?'Confirmed. Your Roadmap’s “Map Debts” stage is complete.':'Tick when '+(k==='debtsMapped'?'this list is complete':'you owe nothing on cards, loans, car finance or overdrafts')+'. This is what completes “Map Debts” on your Roadmap.')+'</small></span></label>';
}
// ── Debtors: money owed to you (debtState.owedToMe). Expected amounts count as something you own; doubtful ones don't. ──
function oweList(){return debtState.owedToMe=debtState.owedToMe||[];}
function oweLeft(o){return Math.max(0,(+o.amount||0)-(o.paid||[]).reduce(function(s,p){return s+(+p.amount||0);},0));}
function alTotalOwedToMe(){return oweList().filter(function(o){return o.sure!=='doubtful';}).reduce(function(s,o){return s+oweLeft(o);},0);}
function setDebtSide(side){
  side=side==='debtors'?'debtors':'creditors';
  ['creditors','debtors'].forEach(function(k){var b=document.getElementById('debt-side-btn-'+k),p=document.getElementById('debt-side-'+k);if(b)b.setAttribute('aria-selected',k===side?'true':'false');if(p)p.hidden=k!==side;});
  try{localStorage.setItem('vi_debt_side',side);}catch(e){}
  if(side==='debtors')renderOwe();else{try{renderDebtTab();}catch(e){}}
}
var _oweReturn=null;
function showOweForm(){var m=document.getElementById('owe-form-modal');if(!m)return;if(m.parentNode!==document.body)document.body.appendChild(m);_oweReturn=document.activeElement;m.hidden=false;document.body.classList.add('vi-pop-open');var g=document.getElementById('owe-form-msg');if(g)g.textContent='';setTimeout(function(){var f=document.getElementById('of-who');if(f)f.focus();},30);}
function hideOweForm(){var m=document.getElementById('owe-form-modal');if(m)m.hidden=true;document.body.classList.remove('vi-pop-open');var b=_oweReturn;_oweReturn=null;if(b&&b.focus)setTimeout(function(){try{b.focus();}catch(e){}},0);}
function saveOwe(){if(viBlockEdit())return;
  var v=function(id){return (document.getElementById(id)||{}).value||'';};
  var who=v('of-who').trim(),amt=(parseFloat(v('of-amt'))||0)/(window.VI_CURRENCY_RATE||1),msg=document.getElementById('owe-form-msg');
  if(!who){if(msg)msg.textContent='Who owes you? A name is enough.';return;}
  if(!(amt>0)){if(msg)msg.textContent='Enter the amount they owe you.';return;}
  oweList().push({id:Date.now(),who:who.slice(0,60),what:v('of-what').trim().slice(0,80),amount:amt,due:v('of-date'),sure:v('of-sure')==='doubtful'?'doubtful':'expected',paid:[],added:new Date().toISOString().slice(0,10)});
  ['of-who','of-what','of-amt','of-date'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});var su=document.getElementById('of-sure');if(su)su.value='expected';
  hideOweForm();saveDebtState();renderOwe();updateKPIs();
}
function owePaid(id){if(viBlockEdit())return;
  var o=oweList().find(function(x){return x.id===id;}),inp=document.getElementById('owe-pay-'+id);if(!o||!inp)return;
  var a=(parseFloat(inp.value)||0)/(window.VI_CURRENCY_RATE||1);if(!(a>0))return;a=Math.min(a,oweLeft(o));
  o.paid=o.paid||[];o.paid.push({amount:a,date:new Date().toISOString().slice(0,10)});inp.value='';
  saveDebtState();renderOwe();updateKPIs();if(oweLeft(o)<=0.004&&typeof showToast==='function')showToast(o.who+' has paid you back in full');
}
function oweSure(id,val){var o=oweList().find(function(x){return x.id===id;});if(!o)return;o.sure=val==='doubtful'?'doubtful':'expected';saveDebtState();renderOwe();updateKPIs();}
function oweDel(id){if(viBlockEdit())return;debtState.owedToMe=oweList().filter(function(x){return x.id!==id;});saveDebtState();renderOwe();updateKPIs();}
function renderOwe(){
  var list=oweList(),el=document.getElementById('owe-list');
  var open=list.filter(function(o){return oweLeft(o)>0.004;}),tot=open.reduce(function(s,o){return s+oweLeft(o);},0),doubt=open.filter(function(o){return o.sure==='doubtful';}).reduce(function(s,o){return s+oweLeft(o);},0);
  var set=function(id,t){var e=document.getElementById(id);if(e)e.textContent=t;};
  set('owe-total',gbpFmt(tot));set('owe-counted',gbpFmt(tot-doubt));set('owe-doubt',gbpFmt(doubt));set('owe-count',String(open.length));
  if(!el)return;
  if(!list.length){el.innerHTML='<div class="owe-empty">Nobody owes you anything yet.</div>';return;}
  var today=new Date().toISOString().slice(0,10);
  el.innerHTML=list.slice().sort(function(a,b){return (oweLeft(b)>0)-(oweLeft(a)>0)||(a.due||'9').localeCompare(b.due||'9');}).map(function(o){
    var left=oweLeft(o),done=left<=0.004,late=!done&&o.due&&o.due<today,pct=o.amount>0?Math.round((1-left/o.amount)*100):0;
    var due=o.due?new Date(o.due+'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'';
    return '<div class="owe-row'+(done?' done':'')+(o.sure==='doubtful'?' doubt':'')+'">'
      +'<div class="owe-top"><div><div class="owe-who">'+cfEsc(o.who)+'</div>'+(o.what?'<div class="owe-what">'+cfEsc(o.what)+'</div>':'')+'</div>'
      +'<div class="owe-amt">'+(done?'Paid back':gbpFmt(left))+'<small>'+(done?gbpFmt(o.amount):'of '+gbpFmt(o.amount))+'</small></div></div>'
      +'<div class="owe-bar" aria-hidden="true"><div style="width:'+pct+'%"></div></div>'
      +'<div class="owe-meta">'+(due?'<span class="'+(late?'late':'')+'">'+(late?'Was due ':'Due ')+due+'</span>':'<span>No date set</span>')
      +(done?'':'<label class="owe-sure"><select aria-label="How sure are you of getting this back" onchange="oweSure('+o.id+',this.value)"><option value="expected"'+(o.sure!=='doubtful'?' selected':'')+'>Expected back</option><option value="doubtful"'+(o.sure==='doubtful'?' selected':'')+'>Doubtful, not counted</option></select></label>')+'</div>'
      +(done?'':'<div class="owe-pay"><input type="number" id="owe-pay-'+o.id+'" min="0" step="0.01" placeholder="£ paid back" aria-label="Amount paid back by '+cfEsc(o.who)+'" onkeydown="if(event.key===\'Enter\'){event.preventDefault();owePaid('+o.id+');}"><button class="btn-add-data" onclick="owePaid('+o.id+')">Record</button></div>')
      +'<button class="data-item-del owe-del" onclick="oweDel('+o.id+')" aria-label="Remove '+cfEsc(o.who)+'"><svg class="vi-ic g" aria-hidden="true"><use href="#vi-close"/></svg> Remove</button>'
      +'</div>';
  }).join('');
}
setTimeout(function(){try{if(localStorage.getItem('vi_debt_side')==='debtors')setDebtSide('debtors');}catch(e){}},0);
function renderDebtTab(){
  try{renderOwe();}catch(e){console.error('[Vault-It] owed to you',e);}
  try{renderDebtMapConfirm();}catch(e){}
  var sorted=[].concat(debtState.debts).sort(function(a,b){
    if((a.balance>0)!==(b.balance>0))return a.balance>0?-1:1;   // cleared debts go last
    return _debtMethod==='avalanche' ? (+b.rate||0)-(+a.rate||0) : (+a.balance||0)-(+b.balance||0);
  });
  var total=sorted.reduce(function(s,d){return s+d.balance;},0);
  var mins=sorted.reduce(function(s,d){return s+(parseFloat(d.minPay)||parseFloat(d.min)||0);},0);
  var el=document.getElementById('debt-total');if(el)el.textContent=gbpFmt(total);
  var em=document.getElementById('debt-mins');if(em)em.textContent=gbpFmt(mins)+'/mo';
  var ec=document.getElementById('debt-count');if(ec)ec.textContent=sorted.filter(function(d){return d.balance>0;}).length;
  var dl=document.getElementById('debt-list-el');
  if(!dl)return;

  if(!sorted.length){
    dl.innerHTML='<div style="font-size:max(.6rem,var(--vi-fs-2));color:var(--t3);text-align:center;padding:20px">No debts tracked. Congratulations!</div>';
    setTimeout(function(){drawDebtHistogram();drawDebtDonut();updateDebtInterestPanel();},50);
    return;
  }

  // 5-across tile grid
  var _obBanner=sorted.some(function(d){return d._onboarding;})
    ?'<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px;margin-bottom:12px;background:rgb(var(--orange-rgb) / .08);border:1px solid rgb(var(--orange-rgb) / .3);border-radius:8px;font-size:max(.55rem,var(--vi-fs-1));color:var(--t2);line-height:1.5"><span style="flex:1;min-width:200px"><b style="color:var(--or)">One lump-sum entered at setup.</b> Replace it with each separate debt (type, interest rate, minimum payment) so your payoff plan is accurate.</span><button class="btn-add-data" style="padding:5px 12px;font-size:max(.52rem,var(--vi-fs-1))" onclick="removeOnboardingDebt()">Replace it →</button></div>'
    :'';
  var _rank={},_rk=0;sorted.forEach(function(d){if(d.balance>0)_rank[d.id]=++_rk;});   // payoff order: Avalanche = highest rate first, Snowball = smallest balance first
  var _rankBadge=function(d){return _rank[d.id]?'<span class="debt-rank" title="Payoff order #'+_rank[d.id]+' ('+(_debtMethod==='avalanche'?'Avalanche: highest interest rate first':'Snowball: smallest balance first')+')">'+_rank[d.id]+'</span>':'<span class="debt-rank done" title="Paid off"><svg class="vi-ic g" role="img" aria-label="Done"><use href="#vi-check"/></svg></span>';};
  var _rankNote='<div class="debt-rank-note"><b>Payoff order</b>: <span class="debt-rank sm">1</span> = '+(_debtMethod==='avalanche'?'highest interest rate (Avalanche): clear this first':'smallest balance (Snowball): clear this first')+'</div>';
  dl.innerHTML=_obBanner+_rankNote+'<div class="debt-card-grid has-cards">'
    +sorted.map(function(d){
      var orig=d.original||d.total||d.balance;
      var paidPct=orig>0?Math.max(0,Math.min(1,(orig-d.balance)/orig)):0;
      var pctNum=Math.round(paidPct*100);
      var isCard=ccIsCard(d);
      // every debt is a real-proportion 3D tile (drag to rotate, double-tap to flip); cards add the chip and number (E33)
      return '<div data-did="'+d.id+'" style="background:var(--c2);border:1px solid var(--bd);border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:8px">'
          +'<div style="font-size:max(.55rem,var(--vi-fs-1));font-weight:700;color:var(--t1);font-family:\'Syne\',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:6px">'+_rankBadge(d)+'<span style="overflow:hidden;text-overflow:ellipsis">'+ccEsc(d.name)+'</span></div>'
          +cc3dHTML(d,pctNum,ccReduced()?pctNum:(_ccPct[d.id]!=null?_ccPct[d.id]:0))
          +'<div style="font-size:max(.52rem,var(--vi-fs-1));color:var(--re);font-family:\'Share Tech Mono\',monospace;font-weight:700;display:flex;justify-content:space-between"><span>'+gbpFmt(d.balance)+'</span><span style="color:var(--gr);font-weight:400">'+pctNum+'% paid</span></div>'
          +'<div style="display:flex;align-items:center;gap:4px">'
          +'<input type="number" id="debt-pay-inp-'+d.id+'" class="al-inp" placeholder="£ pay" style="flex:1;font-size:max(.52rem,var(--vi-fs-1));padding:3px 6px;min-width:0">'
          +'<button class="btn-add-data" style="padding:4px 8px;font-size:max(.5rem,var(--vi-fs-1));white-space:nowrap" onclick="makePayment('+d.id+')">Pay</button>'
          +(d.payments&&d.payments.length?'<button class="btn-add-data" style="padding:4px 8px;font-size:max(.5rem,var(--vi-fs-1));white-space:nowrap;background:transparent;border-color:var(--t3);color:var(--t2)" title="Undo your last payment of £'+d.payments[d.payments.length-1].amt+'" onclick="undoPayment('+d.id+')"><svg class="vi-ic g" aria-hidden="true"><use href="#vi-undo"/></svg> Undo £'+Math.round(d.payments[d.payments.length-1].amt*100)/100+'</button>':'')
          +'</div>'
          +'<div style="display:flex;justify-content:space-between;align-items:center">'
          +'<span style="font-size:max(.46rem,var(--vi-fs-1));color:var(--t3);flex:1;min-width:0">'+(isCard?d.rate+'% APR':ccEsc(DEBT_TYPE_LABELS[d.type]||'Loan')+' · '+d.rate+'% · Min '+gbpFmt(parseFloat(d.minPay)||parseFloat(d.min)||0)+'/mo')+'</span>'
          +'<span class="cc-tile-actions"><button class="data-item-del" style="font-size:max(.48rem,var(--vi-fs-1));padding:2px 5px" title="Flip card" onclick="ccFlipId('+d.id+')">⟲</button><button class="data-item-del" style="font-size:max(.48rem,var(--vi-fs-1));padding:2px 5px" title="'+(isCard?'Card design':'Lender and logo')+'" onclick="ccOpenEdit('+d.id+')">🎨</button><button class="data-item-del" style="font-size:max(.48rem,var(--vi-fs-1));padding:2px 5px" onclick="deleteDebt('+d.id+')"><svg class="vi-ic g" role="img" aria-label="Close"><use href="#vi-close"/></svg></button></span>'
          +'</div>'
          +'</div>';
    }).join('')
    +'</div>';
  setTimeout(function(){drawDebtHistogram();drawDebtDonut();updateDebtInterestPanel();ccWatchCuts(dl);},50);
}

var _debtMethod = 'avalanche';
function setDebtMethod(m) {
  setTimeout(function(){ try { updateDebtInterestPanel(); } catch (e) {} }, 0);
  var same = _debtMethod === m;
  var dl = document.getElementById('debt-list-el');
  var first = {};
  if (dl && !same) dl.querySelectorAll('[data-did]').forEach(function(e) { var r = e.getBoundingClientRect(); first[e.getAttribute('data-did')] = r; });
  _debtMethod = m;
  var ba = document.getElementById('debt-method-btn-avalanche');
  var bs = document.getElementById('debt-method-btn-snowball');
  if (ba) { ba.style.background = m==='avalanche'?'rgba(224,137,74,.15)':'transparent'; ba.style.borderColor = m==='avalanche'?'rgba(224,137,74,.5)':'var(--t3)'; ba.style.color = m==='avalanche'?'var(--or)':'var(--t3)'; }
  if (bs) { bs.style.background = m==='snowball'?'rgba(68,192,185,.12)':'transparent'; bs.style.borderColor = m==='snowball'?'var(--em)':'var(--t3)'; bs.style.color = m==='snowball'?'var(--em)':'var(--t3)'; }
  renderDebtTab();
  if (same || ccReduced() || !dl) return;
  // FLIP: every tile glides from where it was to where it now belongs
  var tiles = Array.prototype.slice.call(dl.querySelectorAll('[data-did]')), n = 0;
  tiles.forEach(function(e) {
    var f = first[e.getAttribute('data-did')]; if (!f) return;
    var r = e.getBoundingClientRect(), dx = f.left - r.left, dy = f.top - r.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    e.style.position = 'relative'; e.style.zIndex = String(10 + (n++));
    var a = e.animate([
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1)', boxShadow: '0 0 0 rgba(0,0,0,0)' },
      { transform: 'translate(' + dx * .5 + 'px,' + dy * .5 + 'px) scale(1.04)', boxShadow: '0 14px 30px rgba(0,0,0,.45)', offset: .45 },
      { transform: 'translate(0,0) scale(1)', boxShadow: '0 0 0 rgba(0,0,0,0)' }
    ], { duration: 1100, easing: 'cubic-bezier(.4,.05,.2,1)', delay: Math.min(250, n * 40), fill: 'backwards' });
    a.onfinish = a.oncancel = function() { e.style.zIndex = ''; e.style.position = ''; };
  });
  var note = dl.querySelector('.debt-rank-note');
  if (note) note.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700 });
}
function debtPayoffMonths(debts, extra) {
  if (!debts || !debts.length) return null;
  var ds = debts.map(function(d){ return { balance: +d.balance||0, rate: +d.rate||0, min: parseFloat(d.minPay)||parseFloat(d.min)||0 }; });
  var total = ds.reduce(function(s,d){ return s+d.balance; }, 0);
  if (total <= 0) return 0;
  var surplus = extra || 0;
  var months = 0, maxM = 600;
  while (months < maxM) {
    var freeMoney = surplus;
    var allPaid = true;
    ds.forEach(function(d) {
      if (d.balance > 0) {
        allPaid = false;
        var interest = d.balance * d.rate / 100 / 12;
        var pay = Math.min(d.balance + interest, d.min + freeMoney);
        freeMoney = Math.max(0, freeMoney - Math.max(0, pay - d.min));
        d.balance = Math.max(0, d.balance + interest - pay);
      }
    });
    months++;
    if (allPaid || ds.every(function(d){ return d.balance <= 0; })) break;
  }
  return months;
}
function calcDebtInterestTotal(debts, method) {
  if (!debts || !debts.length) return { months: 0, interest: 0 };
  var sorted = [].concat(debts).filter(function(d){ return (+d.balance||0) > 0; });
  if (!sorted.length) return { months: 0, interest: 0 };
  if (method === 'avalanche') sorted.sort(function(a,b){ return (+b.rate||0) - (+a.rate||0); });
  else sorted.sort(function(a,b){ return (+a.balance||0) - (+b.balance||0); });
  var ds = sorted.map(function(d){ return { balance: +d.balance, rate: +d.rate||0, min: parseFloat(d.minPay)||parseFloat(d.min)||5, orig: +d.balance }; });
  var totalOrig = ds.reduce(function(s,d){ return s+d.orig; }, 0);
  var months = 0, totalPaid = 0, maxM = 600;
  var surplus = 0;
  while (months < maxM && ds.some(function(d){ return d.balance > 0; })) {
    var freed = surplus;
    ds.forEach(function(d, i) {
      if (d.balance > 0) {
        var interest = d.balance * d.rate / 100 / 12;
        var pay = d.min;
        if (i === 0 || ds.slice(0,i).every(function(x){ return x.balance <= 0; })) pay += freed;
        pay = Math.min(d.balance + interest, pay);
        if (d.balance <= 0 && i > 0) { freed += d.min; }
        totalPaid += pay;
        d.balance = Math.max(0, d.balance + interest - pay);
        if (d.balance <= 0) surplus += d.min;
      }
    });
    months++;
  }
  return { months: months, interest: Math.max(0, totalPaid - totalOrig) };
}
function updateDebtInterestPanel() {
  var debts = (debtState.debts||[]).filter(function(d){ return (+d.balance||0) > 0; });
  if (!debts.length) {
    var ip = document.getElementById('debt-interest-panel'); if (ip) ip.style.display = 'none'; return;
  }
  var ip = document.getElementById('debt-interest-panel'); if (ip) ip.style.display = '';
  var minOnly = calcDebtInterestTotal(debts, 'min');
  var aval = calcDebtInterestTotal(debts, _debtMethod === 'snowball' ? 'snowball' : 'avalanche'), _mName = _debtMethod === 'snowball' ? 'Snowball' : 'Avalanche';
  var pl = document.getElementById('debt-plan-lbl'); if (pl) pl.textContent = _mName + ' method';
  var fmt = function(n){ return n < 1200 ? n + ' months' : (n/12).toFixed(1) + ' years'; };
  var mp = document.getElementById('debt-min-payoff'); if (mp) mp.textContent = fmt(minOnly.months);
  var mi = document.getElementById('debt-min-interest'); if (mi) mi.textContent = '£' + Math.round(minOnly.interest).toLocaleString('en-GB') + ' total interest';
  var ap = document.getElementById('debt-aval-payoff'); if (ap) ap.textContent = fmt(aval.months);
  var ai = document.getElementById('debt-aval-interest'); if (ai) ai.textContent = '£' + Math.round(aval.interest).toLocaleString('en-GB') + ' total interest';
  var saving = Math.round(minOnly.interest - aval.interest);
  var is = document.getElementById('debt-interest-saving');
  if (is) is.textContent = saving > 0 ? _mName + ' saves you £' + saving.toLocaleString('en-GB') + ' in interest, ' + (minOnly.months - aval.months) + ' months sooner' : 'Minimum payments work. Add extra monthly surplus to accelerate payoff.';
  var kpiEl = document.getElementById('debt-payoff-kpi');
  if (kpiEl) kpiEl.textContent = aval.months > 0 ? fmt(aval.months) : 'Debt-free!';
}

