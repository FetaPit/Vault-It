// ═══════════════════════════════════════════════════════════════
// HOUSE BUILDER — LEVELS, GHOST BUILD, GAMIFICATION
// L1 First Deposit (ghost) → L2 Delete the Mortgage → L3 Upgrade
// ═══════════════════════════════════════════════════════════════
var HB_LEVELS=[{n:1,name:'First Deposit',ic:'🧱'},{n:2,name:'Delete the Mortgage',ic:'🏠'},{n:3,name:'Upgrade',ic:'🚀'}];
var HB_BADGES=[[.01,'Site cleared'],[.05,'Foundations'],[.10,'10%'],[.25,'Quarter'],[.50,'Halfway'],[.75,'Three-quarters'],[1,'Deposit ready']];
function hbLevel(){return state.houseMode==='purchased'?2:1;}   // Level 3 is locked for everyone (owner, 1 Nov 2026: Pro, after the MVP); state.level3 is kept as saved
function hbView(){var v=+state.viewLevel,c=hbLevel();return(v>=1&&v<=c)?v:c;}
var HB_L3_LOCKED='Level 3: plan your next home. Coming later as part of Pro.';
function hbSetView(n){if(n>=3){toast(HB_L3_LOCKED);return;}if(n>hbLevel()){toast('Finish Level '+(n-1)+' to unlock Level '+n);return;}state.viewLevel=n;save();updateUI();}
function hbSetDepositPct(v){if(viBlockEdit())return;
  v=parseFloat(v);var inp=document.getElementById('depositPctInput');
  if(!(v>=1&&v<=60)){toast('Choose a deposit between 1% and 60%');if(inp)inp.value=state.depositPct;return;}
  state.depositPct=Math.round(v*10)/10;save();updateUI();
  toast('Deposit target: '+state.depositPct+'% = '+gbpFmt(depositTarget()));
}
function hbNoEmoji(t){return String(t||'').replace(/\s*[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\uFE0F?/gu,'').trim();}   // the progress tile carries line icons, not emoji (Pedro, v0.8)
function hbStreak(){var el=document.getElementById('habit-streak-label');return el?(parseInt(String(el.textContent).replace(/\D/g,''))||0):0;}
// money the Budget could put towards the house: unassigned £ + what is already assigned to savings/investing
function hbBudget(){
  try{
    var s=bdState(),m=s.m;
    return{unassigned:Math.max(0,Math.round(s.left*100)/100),saving:Math.round((cfSum(m.by.sv||[])+cfSum(m.by.iv||[]))*100)/100,income:m.tIn};
  }catch(e){return{unassigned:0,saving:0,income:0};}
}
function hbMonthsTo(rem,monthly){if(rem<=0)return 0;if(!(monthly>0))return null;return Math.ceil(rem/monthly);}
function hbMonthsTxt(n){if(n===null)return '–';if(n===0)return 'done';var d=new Date();d.setMonth(d.getMonth()+n);return n+' mo · '+d.toLocaleDateString('en-GB',{month:'short',year:'numeric'});}
function hbUseMonthly(v){state.monthly=Math.max(0,Math.round(v));save();updateUI();toast('Plan set to '+gbpFmt(state.monthly)+' a month');}

function hbRenderLevels(){
  var el=document.getElementById('hb-levels');if(!el)return;
  var cur=hbLevel(),view=hbView();
  el.innerHTML=HB_LEVELS.map(function(l){
    var cls='hb-lv'+(l.n===view?' on':'')+(l.n<cur?' done':'')+(l.n>cur?' lock':'');
    if(l.n>=3)return '<button class="hb-lv lock" onclick="hbSetView(3)" title="'+HB_L3_LOCKED+'"><span>🔒</span>Level 3 · '+l.name+' <span class="hb-own-pro">PRO</span></button>';   // locked for everyone (owner, 1 Nov)
    return '<button class="'+cls+'" onclick="hbSetView('+l.n+')" title="'+(l.n>cur?'Locked: finish Level '+(l.n-1):'')+'"><span>'+(l.n>cur?'🔒':l.ic)+'</span>Level '+l.n+' · '+l.name+(l.n<cur?' <b><svg class="vi-ic g" role="img" aria-label="Done"><use href="#vi-check"/></svg></b>':'')+'</button>';
  }).join('');
}
// which brick row the deposit has reached (3D engine only): row n of N, £ per row, £ left to finish the row you are on
function hbRowStats(){
  var sm = hbSceneMode(), m = hb3dModelIfReady(sm.type, sm.floor); if (!m || !m.rows || sm.mode === 'site' && !(+state.saved > 0)) return m && m.rows ? { n: m.rows.n, row: 0, per: depositTarget() / m.rows.n, toRow: depositTarget() / m.rows.n, focus: !!m.focus, floor: sm.floor, p: 0 } : null;
  var dt = depositTarget(), n = m.rows.n, p = Math.max(0, Math.min(1, sm.p)), saved = p * dt;
  if (hbBrandModel(m) && !sm.upgrade) {   // brand build: the row is the course of the last brick laid; money left = bricks left in that course
    var bs = HB3D.brandStats(m, p), pb = HB3D.brandBrickValue(dt, bs.bricksTotal), toF = bs.bricksLaid ? 0 : Math.max(0, 0.03 * dt - saved);
    return { n: n, row: bs.row, per: bs.rowBricks * pb, toRow: toF + bs.rowLeft * pb, focus: !!m.focus, floor: sm.floor, p: p, brand: true, done: bs.bricksDone, bricks: bs.bricksLaid };
  }
  var row = p <= 0 ? 0 : Math.min(n, Math.floor(p * n - 1e-9) + 1), per = dt / n;
  return { n: n, row: row, per: per, toRow: p >= 0.9999 ? 0 : Math.max(0, Math.max(row, 1) * per - saved), focus: !!m.focus, floor: sm.floor, p: p };
}
function hbRenderHUD(){
  var el=document.getElementById('hb-hud');if(!el)return;
  var _hti=document.getElementById('house-tab-inner');if(_hti)_hti.setAttribute('data-lvl',String(hbView()));
  var view=hbView(),p=pct(),dt=depositTarget(),rem=Math.max(0,dt-(state.saved||0));
  var _bi=hbBrickInfo(),brickTotal=_bi?_bi.total:0,perBrick=_bi?_bi.perBrick:0;
  // the model can finish building on another path (the viewer) without this panel hearing about it: until the count is
  // known, look again every half second for up to 15 s, so it never stays on "Counting bricks…" (owner, 31 Oct: house builder)
  clearTimeout(window._hbHudRetry); window._hbHudWait=!_bi;   // hb3dModel re-renders this panel the moment a model lands, however late (the retries below are only a backstop)
  if(_bi)window._hbHudTries=0;else if((window._hbHudTries=(window._hbHudTries||0)+1)<=30)window._hbHudRetry=setTimeout(function(){try{hbRenderHUD();hbWriteStats();}catch(e){}},500);
  var _pb=document.getElementById('hb-plan-brick');if(_pb)_pb.textContent=_bi?'Each brick is worth about '+(window.VI_CURRENCY_SYMBOL||'£')+(perBrick*(window.VI_CURRENCY_RATE||1)).toFixed(2)+' of your deposit.':'';
  var _bLaid=_bi?Math.min(brickTotal,(hbBrandModel(_bi.model)?HB3D.brandStats(_bi.model,_isPro()?p:0.04):_bi.model.stats(_isPro()?p:0.04)).bricksLaid):0,_sym=window.VI_CURRENCY_SYMBOL||'£',_rate=window.VI_CURRENCY_RATE||1;
  var inp=document.getElementById('depositPctInput');if(inp&&document.activeElement!==inp)inp.value=state.depositPct;
  var amt=document.getElementById('depositPctAmt');if(amt)amt.textContent='= '+gbpFmt(dt);
  if(view===1){
    var bud=hbBudget(),cur=+state.monthly>0?+state.monthly:0;
    var rows='',tip='';
    if(rem>0&&(bud.unassigned>0||bud.saving>0)){
      var sc=[['Right now',cur],['+ your £'+Math.round(bud.unassigned).toLocaleString('en-GB')+' unassigned',cur+bud.unassigned],['+ unassigned + £'+Math.round(bud.saving).toLocaleString('en-GB')+' already saving',cur+bud.unassigned+bud.saving]];
      if(bud.saving<=0)sc.pop();
      rows=sc.map(function(r){return '<tr><td>'+r[0]+' ('+gbpFmt(r[1])+'/mo)</td><td>'+hbMonthsTxt(hbMonthsTo(rem,r[1]))+'</td></tr>';}).join('');
      tip='<div class="hb-tip"><svg class="vi-ic hb-tip-ic" aria-hidden="true"><use href="#vi-info"/></svg> <b>What your Budget could do for this deposit</b><br>You have <b>'+gbpFmt(bud.unassigned)+'</b> a month unassigned and <b>'+gbpFmt(bud.saving)+'</b> a month assigned to saving/investing. Time to reach your '+gbpFmt(dt)+' deposit:<table>'+rows+'</table>'
        +'<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">'+(bud.unassigned>0?'<button class="stk-btn" onclick="hbUseMonthly('+Math.round(cur+bud.unassigned)+')">Plan with +'+gbpFmt(bud.unassigned)+'</button>':'')+(bud.saving>0&&bud.unassigned>0?'<button class="stk-btn" onclick="hbUseMonthly('+Math.round(cur+bud.unassigned+bud.saving)+')">Plan with all '+gbpFmt(bud.unassigned+bud.saving)+'</button>':'')+'</div></div>';
    }
    var RS=hbRowStats(),_cs=window.VI_CURRENCY_SYMBOL||'£',_cr=window.VI_CURRENCY_RATE||1,rowHtml='';
    if(RS){
      rowHtml='<div class="hb-row"><div class="hb-row-n">'+(RS.focus?'FLOOR '+RS.floor+' · ':'')+'ROW <b>'+RS.row+'</b> <i>of '+RS.n+'</i></div>'
        +'<div class="hb-row-sub">'+(RS.brand&&RS.p>=0.999?'Keys are yours. Your deposit is funded.':RS.brand&&RS.done?'Brickwork done. The roof, glazing and finish come next.':RS.p>=0.9999?'Every row is built. Your deposit is funded.':_cs+(RS.brand?(RS.toRow*_cr).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2}):Math.round(RS.toRow*_cr).toLocaleString('en-GB'))+' to finish this row · '+_cs+Math.round(RS.per*_cr).toLocaleString('en-GB')+' lays one row')+'</div>'
        +'<button class="stk-btn" onclick="hbJumpToRow()"><svg class="vi-ic" style="width:14px;height:14px;--vi-sw:1.5;vertical-align:-2px" aria-hidden="true"><use href="#vi-pin"/></svg> Show it on the house</button></div>';
    }
    // one progress tile (owner, 2 Nov, v0.8): the old Level 1 card and the PROGRESS card merged. One bar, one set of stats
    // with a line icon each, one milestone set with the house type's own names. Ids kept for updateUI and hbWriteStats.
    var _ic=function(n){return '<svg class="vi-ic" aria-hidden="true"><use href="#vi-'+n+'"/></svg>';};
    var _st=function(ic,v,l,id){return '<div class="hb-st-'+ic+'"><i class="hb-disc">'+_ic(ic)+'</i><div class="hb-txt"><b'+(id?' id="'+id+'"':'')+'>'+v+'</b><span>'+l+'</span></div></div>';};
    var _msl=(typeof MS_LABELS!=='undefined'&&(MS_LABELS[state.houseType]||MS_LABELS.terraced))||[],_mss=MS_PCTS.map(function(q,i){var hit=p>=q/100;
      return '<div class="ms'+(hit?' hit':'')+'" id="ms'+MS_IDS[i]+'"><div class="ms-dot"></div><div class="ms-lbl" id="msl-'+MS_IDS[i]+'"><b>'+q+'%</b> '+cfEsc(hbNoEmoji(_msl[i]))+'</div><div class="ms-tg"></div></div>';}).join('');
    var _nx=MS_PCTS.findIndex(function(q){return p<q/100;}),_next=_nx<0?'':'<div class="hb-pg-next">'+_ic('milestone')+'<span>Next: <b>'+MS_PCTS[_nx]+'%</b> · '+cfEsc(hbNoEmoji(_msl[_nx]))+' · '+gbpFmt(Math.max(0,MS_PCTS[_nx]/100*dt-(state.saved||0)))+' to go</span></div>';
    var _ticks=MS_PCTS.slice(0,-1).map(function(q){return '<i class="hb-tick'+(p>=q/100?' on':'')+'" style="left:'+q+'%"></i>';}).join('');
    el.innerHTML='<div class="card-lbl">LEVEL 1 · FIRST DEPOSIT <span class="vi-dim">· hologram build</span></div>'
      +'<div class="hb-pg">'
      +'<div class="hb-pg-main">'
      +'<div class="hb-pg-top"><span><b id="savedAmt">'+gbpFmt(state.saved||0)+'</b> saved</span><span><b id="ppct">'+(p*100).toFixed(1)+'%</b> of <span id="tgtAmt">'+gbpFmt(dt)+' deposit</span></span></div>'
      +'<div class="hb-xp hb-xp-ms"><div id="pbarFill" style="width:'+(p*100).toFixed(1)+'%"></div>'+_ticks+'</div>'
      +_next
      +rowHtml
      +(_bi&&hbBrandModel(_bi.model)?'<div class="hb-pg-note">Your house builds as a <b style="color:var(--em)">hologram</b>: 77% of the deposit lays the bricks, course by course, and the rest pays for the roof, glazing and finish. You are <b>'+(p*100).toFixed(1)+'%</b> of the way there. Full colour comes once you own it.</div>'
        :'<div class="hb-pg-note">Your house builds from the ground up as a <b style="color:var(--em)">hologram</b>: <b>'+(p*100).toFixed(1)+'%</b> of the deposit is <b>'+(p*100).toFixed(1)+'%</b> of the house. Full colour comes once you own it.</div>')
      +'</div>'
      +'<div class="hb-pg-side">'
      +'<div class="hb-stx hb-stx6">'
        +_st('brick',_bi?_bLaid.toLocaleString('en-GB'):'…','of '+(_bi?brickTotal.toLocaleString('en-GB'):'…')+' UK bricks','stBricks')
        +_st('target',gbpFmt(rem),'to go','stRemain')
        +_st('vault',gbpFmt(dt),state.depositPct+'% deposit of '+gbpFmt(state.target||0),'stDeposit')
        +_st('house-builder','…','roof tiles','stTiles')
        +_st('xp',(typeof wrTotalXp==='function'?wrTotalXp():0).toLocaleString('en-GB'),'XP','stXP')   // the Wealth Roadmap's XP, so the tile and the Roadmap agree (E9)
        +_st('streak',String(hbStreak()),'streak')
      +'</div>'
      +'<div class="hb-pg-note">'+(_bi?'Each brick ≈ '+_sym+(perBrick*_rate).toFixed(2)+' · real 215 × 102.5 × 65 mm bricks, laid course by course':'Counting bricks…')+'</div>'
      +'</div>'
      +'<div class="hb-pg-tl"><div class="hb-sub-lbl hb-pg-ms">'+_ic('milestone')+' Milestones</div>'
      +'<div class="mss">'+_mss+'</div></div>'
      +'</div>'
      +hbDepAcctHtml()
      +'<div style="margin-top:12px"><button class="btn-add-data" onclick="hbOpenCalc()">Preview your mortgage</button></div>'
      +tip;
    try{hbWriteStats();}catch(e){}
    try{hbPaintMilestones(p);}catch(e){}
  } else {
    hbRenderL2(el);
  }
  if(view>=2&&state.houseMode==='purchased')el.insertAdjacentHTML('beforeend','<div class="hb-undo"><button type="button" class="btn-add-data hb-undo-btn" onclick="hbUndoPurchase()">Not bought yet? Back to Level 1</button></div>');
  hbBadgeToasts(p);
}
function hbBadgeToasts(p){
  var g=state.gam=state.gam||{seen:null};
  var now=HB_BADGES.filter(function(b){return p>=b[0];}).map(function(b){return b[1];});
  if(g.seen===null){g.seen=now;if((state.deposits||[]).length||state.saved>0)save();return;}   // first run: no toast spam for what is already earned (and nothing written for a brand-new user)
  now.forEach(function(n){if(g.seen.indexOf(n)<0){g.seen.push(n);toast('🏅 Badge unlocked: '+n+'!');save();}});
}
// ── v0.9.1 E26: the deposit's account (owner, 3 Nov: "select what type of account they have that money in. And treat it separately to
// the cash and savings ... pull the icon for the bank plus the interest rate ... include amount invested so the user knows which is the
// 25% government bonus ... give the option for the new bank account"). A note on the deposit only (owner's Q5): it never changes
// state.saved, the bricks, the levels or Cash and savings, and the bonus is a separate estimate that is never added to saved.
// state.depAcct = {type, name, rate (AER %, absent = none), paidIn (£ the user put in, absent = none)}; each new deposit copies
// {t, n, r} as deposit.acct. Old saves have neither and load as they are.
var HB_DEP_TYPES=[['lisa_cash','Lifetime ISA (cash)'],['lisa_ss','Lifetime ISA (stocks and shares)'],['cash_isa','Cash ISA'],['ss_isa','Stocks and shares ISA'],
  ['savings','Savings account'],['linked','Linked to another account'],['ftb_isa','First Time Buyer ISA (not open yet)']];
// Lifetime ISA rules, from gov.uk/lifetime-isa ("How it works", "Buying your first home", "Withdrawing your money"), checked 3 Nov 2026:
//  - you can put in up to £4,000 each tax year; the government adds a 25% bonus on what you put in (up to £1,000 a year)
//  - for a first home the property must cost £450,000 or less
//  - taking money out for anything other than a first home, turning 60 or terminal illness costs a 25% withdrawal charge
// The First Time Buyer ISA has not opened: no rate, bonus or date is shown until gov.uk publishes them (coverage says April 2029, unconfirmed).
var HB_LISA={limit:4000,bonus:0.25,cap:450000,charge:0.25,src:'gov.uk/lifetime-isa',checked:'2026-11-03'};
var HB_FCA='Guidance, not advice. Not regulated by the FCA. Not financial advice.';
function hbDepTypeName(t){var r=HB_DEP_TYPES.filter(function(x){return x[0]===t;})[0];return r?r[1]:'Account';}
function hbDepIsLisa(t){return t==='lisa_cash'||t==='lisa_ss';}
function hbGbp0(v){return '£'+Math.round(v).toLocaleString('en-GB');}   // the gov.uk rules are in pounds, so these stay in pounds
function hbDepAcctHtml(){
  var a=state.depAcct,hd='<div class="hb-sub-lbl hb-da-hd"><svg class="vi-ic" aria-hidden="true"><use href="#vi-bank"/></svg> Deposit account</div>';
  if(!a||!a.type)return '<div class="hb-dacct" id="hb-dacct">'+hd+'<p class="hb-da-q">Where is this deposit held? Note the account to see its logo and rate here. Your saved total and bricks stay the same.</p><button type="button" class="stk-btn" onclick="hbOpenDepAcct()">Add the account</button></div>';
  var nm=String(a.name||'').trim(),sub=(nm?hbEsc(hbDepTypeName(a.type)):'')+(a.rate!=null?(nm?' <span class="hb-da-rate">· ':'<span class="hb-da-rate">')+hbEsc(a.rate)+'% AER</span>':''),out='<div class="hb-dacct on" id="hb-dacct">'+hd
    +'<div class="hb-da-row">'+hbBankLogo(nm)+'<div class="hb-da-txt"><b>'+hbEsc(nm||hbDepTypeName(a.type))+'</b><span>'+sub+'</span></div><button type="button" class="stk-btn" onclick="hbOpenDepAcct()">Edit</button></div>';
  if(hbDepIsLisa(a.type)){
    var paid=+a.paidIn>0?+a.paidIn:0,tgt=+state.target||0;
    out+=paid>0?'<div class="hb-da-bonus"><b>Estimated 25% bonus: '+hbGbp0(paid*HB_LISA.bonus)+'</b> on the '+hbGbp0(paid)+' you paid in. The government pays it through your provider. An estimate, not added to your saved total'+(paid>HB_LISA.limit?', and lower if you paid in more than '+hbGbp0(HB_LISA.limit)+' in a tax year':'')+'.</div>'
      :'<div class="hb-da-bonus">Add the amount you paid in to see the estimated 25% bonus. It is not added to your saved total.</div>';
    out+='<div class="hb-da-rules">Lifetime ISA rules (gov.uk): you can pay in up to '+hbGbp0(HB_LISA.limit)+' a tax year and the bonus is 25% of it. For a first home the price must be '+hbGbp0(HB_LISA.cap)+' or less'+(tgt>HB_LISA.cap?' (your target is '+hbGbp0(tgt)+')':'')+'. Taking money out for anything else usually costs a 25% withdrawal charge.</div>';
  }
  return out+'<div class="hb-da-fca">'+HB_FCA+'</div></div>';
}
// the bank list loads further down the page than the first house paint: until it has, show the plain bank icon
function hbBankLogo(nm){try{if(typeof STK_PLATFORMS!=='undefined'&&STK_PLATFORMS)return viBankLogo(nm);}catch(e){}return '<span class="cash-logo cash-logo-none" title="Bank account"><svg class="vi-ic" aria-hidden="true"><use href="#vi-bank"/></svg></span>';}
function hbDepLogChip(a){var nm=String(a.n||'').trim();return ' <span class="hb-da-log">'+hbBankLogo(nm)+hbEsc(nm||hbDepTypeName(a.t))+'</span>';}
function hbOpenDepAcct(){
  var o=document.getElementById('hbd-ov');if(o)o.remove();
  var a=state.depAcct||{},cur=a.type||'lisa_cash';
  var opts=HB_DEP_TYPES.map(function(t){return '<option value="'+t[0]+'"'+(t[0]==='ftb_isa'?' disabled':'')+(t[0]===cur?' selected':'')+'>'+t[1]+'</option>';}).join('');
  o=document.createElement('div');o.id='hbd-ov';o.className='hbc-ov';
  o.innerHTML='<div class="hbc" style="width:min(520px,100%)" role="dialog" aria-label="Deposit account"><div class="hbc-hd"><span>Where your deposit is held</span><span class="hbd-x" onclick="hbCloseDepAcct()" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();hbCloseDepAcct();}" role="button" tabindex="0" aria-label="Close">×</span></div>'
    +'<div class="hbc-body" style="grid-template-columns:1fr"><div id="hbd-in">'
    +'<p class="hbc-note full" style="margin:0 0 4px">A note on your house deposit. It does not change your saved total, your bricks or Cash and savings.</p>'
    +'<div class="full"><label for="hbd-type">Account type</label><select id="hbd-type">'+opts+'</select></div>'
    +'<div class="full"><label for="hbd-name">Bank or provider</label><input id="hbd-name" type="text" maxlength="60" value="'+hbEsc(a.name||'')+'" placeholder="e.g. your bank or app"></div>'
    +'<div><label for="hbd-rate">Interest rate % AER</label><input id="hbd-rate" type="number" min="0" max="100" step="0.01" value="'+(a.rate!=null?a.rate:'')+'" placeholder="as your provider quotes"></div>'
    +'<div><label for="hbd-paid">Amount you paid in £</label><input id="hbd-paid" type="number" min="0" step="1" value="'+(a.paidIn!=null?a.paidIn:'')+'" placeholder="your own money"></div>'
    +'<p class="hbc-note full" style="margin:0">For a Lifetime ISA, the amount you paid in shows the estimated 25% government bonus. The First Time Buyer ISA has not opened yet.</p>'
    +'<div class="full" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"><button type="button" class="btn-add-data" id="hbd-save" onclick="hbSaveDepAcct()">Save the account</button>'
    +(state.depAcct?'<button type="button" class="stk-btn" id="hbd-clear" onclick="hbClearDepAcct()">Remove</button>':'')+'<button type="button" class="stk-btn" onclick="hbCloseDepAcct()">Cancel</button></div>'
    +'<div class="hbc-note full">'+HB_FCA+'</div>'
    +'</div></div></div>';
  document.body.appendChild(o);
  var f=document.getElementById('hbd-type');if(f)f.focus();
}
function hbCloseDepAcct(){var o=document.getElementById('hbd-ov');if(o)o.remove();}
function hbSaveDepAcct(){if(viBlockEdit())return;
  var g=function(id){var e=document.getElementById('hbd-'+id);return e?String(e.value).trim():'';};
  var t=g('type'),ok=HB_DEP_TYPES.some(function(x){return x[0]===t&&t!=='ftb_isa';});
  if(!ok){toast('Choose an account type');return;}
  var a={type:t,name:g('name').slice(0,60)},rs=g('rate'),ps=g('paid');
  if(rs!==''){var r=parseFloat(rs);if(!(isFinite(r)&&r>=0&&r<=100)){toast('Enter the rate as a percentage, for example 4.5');return;}a.rate=Math.round(r*100)/100;}
  if(ps!==''){var v=parseFloat(ps);if(!(isFinite(v)&&v>=0)){toast('Enter the amount you paid in');return;}a.paidIn=Math.round(v*100)/100;}
  state.depAcct=a;save();hbCloseDepAcct();updateUI();toast('Deposit account saved');
}
function hbClearDepAcct(){if(viBlockEdit())return;delete state.depAcct;save();hbCloseDepAcct();updateUI();toast('Deposit account removed');}
// L2 / L3 panels
function hbSetOver(v){var cur=hbcRead().raw;cur.over=Math.max(0,Math.round(v));state.calc=cur;save();updateUI();toast('Plan: overpay '+hbMoney(cur.over)+' a month');}
var HB_TRADEOFF='<div class="hb-tradeoff" style="margin-top:8px;font-size:max(.5rem,var(--vi-fs-1));color:var(--t3);line-height:1.5">Money overpaid is not invested or saved. Check your lender\'s overpayment limit (often 10% a year) and any early repayment charges. Illustrative only. Not regulated by the FCA. Not financial advice.</div>';
// Level 2 onboarding (docs/HOUSE_BUILDER_LEVEL2_GAMIFICATION.md, phase 2): the mortgage as the lender states it, entered in about a minute on purchase day.
// Every figure is the person's own: the balance starts from their price minus their deposit; lender, rate, fix end and term stay blank until typed.
function hbMortgageLine(){
  var m=state.mortgage; if(!m) return '<div style="font-size:max(.52rem,var(--vi-fs-1));color:var(--t3);margin:4px 0 6px">Enter your mortgage (lender, rate, fix end, term) so the dates and interest below use your real figures.</div>';
  var bits=[]; if(m.lender) bits.push(hbEsc(m.lender)); if(m.rate!=null) bits.push(m.rate+'%'+(m.fixEnd?' fixed until '+hbFmtMonth(m.fixEnd):'')); else if(m.fixEnd) bits.push('fixed until '+hbFmtMonth(m.fixEnd)); if(m.termYears) bits.push(m.termYears+' years left');
  return '<div class="hb-mline" style="font-family:\'Share Tech Mono\',monospace;font-size:max(.56rem,var(--vi-fs-2));color:var(--teal);margin:4px 0 6px">'+(bits.join(' · ')||'Mortgage entered')+'</div>';
}
function hbEsc(v){return String(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function hbFmtMonth(ym){try{return new Date(ym+'-01T00:00:00Z').toLocaleDateString('en-GB',{month:'short',year:'numeric'});}catch(e){return ym;}}
function hbOpenMortgageEntry(first){
  hbCloseCalc(); var o=document.getElementById('hbm-ov'); if(o) o.remove();
  var m=state.mortgage||{}, bal=state.mortgageBalance||0;
  o=document.createElement('div'); o.id='hbm-ov'; o.className='hbc-ov';
  o.innerHTML='<div class="hbc" style="width:min(560px,100%)" role="dialog" aria-label="Your mortgage"><div class="hbc-hd"><span>Your mortgage, in a minute <span style="font-weight:400;font-size:11px;color:var(--t3)">· your figures only · illustrative, not advice</span></span><span style="cursor:pointer;font-size:20px;padding:0 6px" onclick="hbCloseMortgageEntry()" role="button" aria-label="Close">×</span></div>'
    +'<div class="hbc-body" style="grid-template-columns:1fr"><div id="hbm-in">'
    +'<p class="hbc-note full" style="margin:0 0 4px">Level 1 built your deposit. Level 2 is what is left to pay: <b>'+hbMoney(hbL2Base())+'</b>. Copy the figures from your lender\'s offer; leave anything you do not have yet blank.</p>'
    +'<div><label for="hbm-lender">Lender</label><input id="hbm-lender" type="text" maxlength="60" value="'+hbEsc(m.lender||'')+'" placeholder="e.g. your bank"></div>'
    +'<div><label for="hbm-bal">Balance owed £</label><input id="hbm-bal" type="number" min="0" step="1" value="'+bal+'"></div>'
    +'<div><label for="hbm-rate">Interest rate %</label><input id="hbm-rate" type="number" min="0" step="0.01" value="'+(m.rate!=null?m.rate:'')+'" placeholder="on your offer"></div>'
    +'<div><label for="hbm-fix">Fixed rate ends</label><input id="hbm-fix" type="month" value="'+hbEsc(m.fixEnd||'')+'"></div>'
    +'<div><label for="hbm-term">Years left on the term</label><input id="hbm-term" type="number" min="1" max="40" step="1" value="'+(m.termYears||'')+'" placeholder="e.g. 25"></div>'
    +'<div class="full" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"><button type="button" class="btn-add-data" id="hbm-save" onclick="hbSaveMortgageEntry()">Save my mortgage</button><button type="button" class="stk-btn" id="hbm-later" onclick="hbCloseMortgageEntry()">'+(first?'Later':'Cancel')+'</button></div>'
    +'<div class="hbc-note full">Illustrative only. Not regulated by the FCA. Not financial advice.</div>'
    +'</div></div></div>';
  document.body.appendChild(o);
  var f=document.getElementById('hbm-lender'); if(f) f.focus();
}
function hbCloseMortgageEntry(){var o=document.getElementById('hbm-ov');if(o)o.remove();}
function hbSaveMortgageEntry(){if(viBlockEdit())return;
  var g=function(id){var e=document.getElementById('hbm-'+id);return e?String(e.value).trim():'';};
  var bal=parseFloat(g('bal')),rate=parseFloat(g('rate')),term=parseInt(g('term'),10),fix=g('fix'),lender=g('lender').slice(0,60);
  if(!(isFinite(bal)&&bal>=0)){toast('Enter the balance your lender shows');return;}
  state.mortgage={lender:lender,rate:isFinite(rate)&&rate>=0?rate:null,fixEnd:/^\d{4}-\d{2}$/.test(fix)?fix:null,termYears:isFinite(term)&&term>0?term:null,entered:new Date().toISOString().slice(0,10)};
  state.mortgageBalance=Math.round(bal);
  // the calculator and the Level 2 what-ifs run on the same figures
  var c=Object.assign({},state.calc||{});c.bal=Math.round(bal);c._set=true;
  if(state.mortgage.rate!=null){c.p1rate=state.mortgage.rate;if(!c.p1type||c.p1type==='tracker')c.p1type='fixed';}
  if(state.mortgage.termYears){c.termY=state.mortgage.termYears;c.termM=0;}
  if(state.mortgage.fixEnd){var now=new Date(),fe=new Date(state.mortgage.fixEnd+'-01T00:00:00Z');c.p1months=Math.max(1,(fe.getUTCFullYear()-now.getFullYear())*12+(fe.getUTCMonth()-now.getMonth()));}
  state.calc=c;save();hbCloseMortgageEntry();updateUI();
  var pr=hbL2Progress();toast('Level 2 is the '+hbMoney(hbL2Base())+' left to pay.'+(pr>0?' You have already built '+(Math.floor(pr*1000)/10).toFixed(1)+'% of it.':' Every payment builds it in full colour.'));
}
function hbL2Sims(){var c=hbcRead();return{c:c,base:hbSimulate(c.base),scn:hbSimulate(c.scn)};}
function hbRenderL2(el){
  var bal=state.mortgageBalance||0,val=state.valuation||state.target||0,eq=Math.max(0,val-bal),eqp=val>0?eq/val*100:0;
  var S2=hbL2Sims(),base=S2.base,scn=S2.scn,cmp=hbCompare(base,scn),bud=hbBudget(),u=Math.round(bud.unassigned),sv=Math.round(bud.saving);
  var rows='';
  var hu=Math.round(u/2);
  [[hu,'half your unassigned '+hbMoney(hu)],[u,'your unassigned '+hbMoney(u)],[u+sv,'unassigned + savings '+hbMoney(u+sv)]].forEach(function(x,i){   // three what-ifs from their own Budget (Octalysis doc: spare money nudge)
    if(!(x[0]>0)||(i===0&&hu===u)||(i===2&&!(sv>0)))return;
    var sc=hbSimulate(Object.assign({},S2.c.base,{over:{monthly:x[0],stepUpPct:0,lumps:[],roundUp:false}})),cm=hbCompare(base,sc);
    rows+='<tr><td>+'+hbMoney(x[0])+'/mo ('+x[1].split(' ').slice(0,-1).join(' ')+')</td><td>'+hbYM(cm.monthsSaved)+' sooner</td><td>'+hbMoney(cm.interestSaved)+' less interest</td></tr>';
  });
  var tip=rows?'<div class="hb-tip"><svg class="vi-ic hb-tip-ic" aria-hidden="true"><use href="#vi-info"/></svg> <b>What your Budget could do for this mortgage</b><br>Unassigned <b>'+hbMoney(u)+'</b>/mo · already saving <b>'+hbMoney(sv)+'</b>/mo.<table>'+rows+'</table><div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">'+(u>0?'<button class="stk-btn" onclick="hbSetOver('+u+')">Plan: overpay '+hbMoney(u)+'</button>':'')+(u+sv>0&&sv>0?'<button class="stk-btn" onclick="hbSetOver('+(u+sv)+')">Plan: overpay '+hbMoney(u+sv)+'</button>':'')+'</div>'+HB_TRADEOFF+'</div>':'';
  el.innerHTML='<div class="card-lbl">LEVEL 2 · DELETE THE MORTGAGE</div>'
    +hbMortgageLine()
    +'<div style="display:flex;justify-content:space-between;font-family:\'Share Tech Mono\',monospace;font-size:max(.62rem,var(--vi-fs-2));color:var(--text)"><span>Paid off '+hbMoney(Math.max(0,hbL2Base()-bal))+' of '+hbMoney(hbL2Base())+'</span><span>'+(Math.floor(hbL2Progress()*1000)/10).toFixed(1)+'%</span></div>'
    +'<div class="hb-xp"><div style="width:'+(hbL2Progress()*100).toFixed(1)+'%"></div></div>'
    +'<div class="hb-stx hb-stx4"><div><svg class="vi-ic" aria-hidden="true"><use href="#vi-mortgage"/></svg><b>'+hbMoney(bal)+'</b><span>still owed</span></div><div><svg class="vi-ic" aria-hidden="true"><use href="#vi-keys"/></svg><b>'+(scn.balloon>0?'–':hbFmtDate(scn.payoffDate))+'</b><span>mortgage-free</span></div><div><svg class="vi-ic" aria-hidden="true"><use href="#vi-coins"/></svg><b class="'+(cmp.interestSaved>0?'hbc-good':'')+'">'+hbMoney(cmp.interestSaved)+'</b><span>interest slain</span></div><div><svg class="vi-ic" aria-hidden="true"><use href="#vi-calendar"/></svg><b>'+hbYM(Math.max(0,cmp.monthsSaved))+'</b><span>months shaved</span></div></div>'
    +'<div style="font-size:max(.5rem,var(--vi-fs-1));color:var(--t3)">Your Level 2 house is what was left to pay after your deposit goal. Full-colour bricks are what you have paid off; the hologram is what is left. You own '+hbMoney(eq)+' of your home ('+eqp.toFixed(1)+'%).</div>'
    +'<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap"><button class="btn-add-data" onclick="hbOpenMortgageEntry(false)">'+(state.mortgage?'Your mortgage':'Enter your mortgage')+'</button><button class="btn-add-data" onclick="hbOpenCalc()">Open mortgage calculator</button></div>'
    +tip+hbL3Card();
}

// <<HB_MORTGAGE_ENGINE
