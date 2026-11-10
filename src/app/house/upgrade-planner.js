// ═══════════════════════════════════════════════════════════════
// LEVEL 3 — UPGRADE PLANNER (modal over the engine above)
// ═══════════════════════════════════════════════════════════════
var HBU_DEF={mode:'sell',region:'eng',type:'',price:0,sale:0,agentPct:1.5,saleLegal:1500,saleOther:500,ercPct:0,buyLegal:1500,survey:600,moving:800,
  depPct:15,rate:4.6,termY:25,income:0,ltiCap:4.5,cashExtra:0,saveMonthly:0,rent:0,threshold:25};
var HBU_TYPES=[['terraced','Terraced'],['semi','Semi-detached'],['detached','Detached'],['mansion','Mansion'],['flat','Flat'],['apartment','Apartment']];
var _hbuT=null;
function hbUpGet(){
  var d=Object.assign({},HBU_DEF,state.up||{});
  if(!d.type)d.type=state.houseType||'terraced';
  if(!(d.price>0))d.price=Math.round(state.valuation||state.target||0);
  if(!(d.sale>0))d.sale=Math.round(state.valuation||state.target||0);
  return d;
}
function hbuGet(id){var e=document.getElementById('hbu-'+id);return e?e.value:null;}
function hbUpRead(){
  var d=hbUpGet();if(!document.getElementById('hbu-ov'))return d;
  var out=Object.assign({},d);
  Object.keys(HBU_DEF).forEach(function(k){var v=hbuGet(k);if(v===null)return;if(typeof HBU_DEF[k]==='number'){var f=parseFloat(v);out[k]=isFinite(f)?f:d[k];}else out[k]=v;});
  out.sale=parseFloat(hbuGet('sale'));if(!isFinite(out.sale))out.sale=d.sale;
  return out;
}
// the user's current-home value for the Level 3 maths: the sale-price estimate they typed overrides the valuation
function hbUpSim(){var c=hbcRead();return{c:c,base:hbSimulate(c.base),scn:hbSimulate(c.scn)};}
function hbUpNow(u){
  var val=u.sale>0?u.sale:(+state.valuation||+state.target||0);
  return hbUpgradeAt(u,{value:val,balance:Math.max(0,+state.mortgageBalance||0),cash:(+u.cashExtra||0)});
}
function hbUpWalk(u,sim){
  // the sale-price estimate replaces the valuation at month 0 and grows with the calculator's growth assumption
  var so=Object.assign({},sim.opts);so.valuation=u.sale>0?u.sale:so.valuation;
  return hbUpgradeWalk(u,{opts:so,schedule:sim.schedule});
}
function hbuF(k,label,val,o){
  o=o||{};
  if(o.options)return '<div><label for="hbu-'+k+'">'+label+'</label><select id="hbu-'+k+'">'+o.options.map(function(x){return '<option value="'+x[0]+'"'+(String(val)===String(x[0])?' selected':'')+'>'+x[1]+'</option>';}).join('')+'</select></div>';
  return '<div'+(o.full?' class="full"':'')+'><label for="hbu-'+k+'">'+label+'</label><input id="hbu-'+k+'" type="number" step="'+(o.step||'any')+'" min="'+(o.min!=null?o.min:0)+'" value="'+(val==null?'':val)+'"></div>';
}
function hbOpenUpgrade(){
  var d=hbUpGet(),o=document.getElementById('hbu-ov');if(o)o.remove();
  o=document.createElement('div');o.id='hbu-ov';o.className='hbc-ov';
  var F=hbuF;
  o.innerHTML='<div class="hbc" role="dialog" aria-label="Upgrade planner"><div class="hbc-hd"><span>🚀 Level 3 · Upgrade planner <span style="font-weight:400;font-size:11px;color:var(--t3)">· illustrative, not advice</span></span><span style="cursor:pointer;font-size:20px;padding:0 6px" onclick="hbCloseUpgrade()" aria-label="Close"><svg class="vi-ic g" role="img" aria-label="Close"><use href="#vi-close"/></svg></span></div>'
  +'<div class="hbc-body"><div id="hbu-in">'
  +'<details open><summary>1 · The plan</summary><div>'+F('mode','What happens to your current home?',d.mode,{options:[['sell','Sell it and move'],['let','Keep it and let it out']],full:true})
    +F('region','Where is the new home?',d.region,{options:[['eng','England (SDLT)'],['ni','Northern Ireland (SDLT)'],['sco','Scotland (LBTT)'],['wal','Wales (LTT)']]})+F('type','Type of home',d.type,{options:HBU_TYPES})
    +F('price','Target price £',d.price)+F('depPct','Deposit you want %',d.depPct,{step:0.5})+'</div></details>'
  +'<details open><summary>2 · Selling your current home</summary><div>'+F('sale','Expected sale price £',d.sale)+F('agentPct','Agent fee % (incl. VAT)',d.agentPct,{step:0.05})+F('saleLegal','Conveyancing £',d.saleLegal)+F('saleOther','EPC, removals etc. £',d.saleOther)+F('ercPct','Early repayment charge % of balance',d.ercPct,{step:0.5})+'</div></details>'
  +'<details open><summary>3 · Buying costs &amp; cash</summary><div>'+F('buyLegal','Conveyancing £',d.buyLegal)+F('survey','Survey / valuation £',d.survey)+F('moving','Moving costs £',d.moving)+F('cashExtra','Extra cash you hold today £',d.cashExtra)+F('saveMonthly','Cash you will add each month £',d.saveMonthly,{full:true})
    +'<div class="full" id="hbu-budbtns"></div></div></details>'
  +'<details open><summary>4 · The new mortgage</summary><div>'+F('rate','Expected rate %',d.rate,{step:0.01})+F('termY','Term (years)',d.termY,{step:1})+F('income','Gross household income £/yr (affordability)',d.income)+F('ltiCap','Lender income multiple (×)',d.ltiCap,{step:0.1})+'</div></details>'
  +'<details'+(d.mode==='let'?' open':'')+'><summary>5 · Keep &amp; let</summary><div>'+F('rent','Expected rent £/month',d.rent)+'</div></details>'
  +'<details><summary>6 · Unlock threshold</summary><div>'+F('threshold','Unlock Level 3 at equity %',d.threshold,{step:1})+'</div></details>'
  +'</div><div id="hbu-out"></div></div></div>';
  document.body.appendChild(o);
  o.addEventListener('input',function(e){if(e.target.closest('#hbu-in'))hbuSchedule();});
  o.addEventListener('change',function(e){if(e.target.closest('#hbu-in'))hbuSchedule(true);});
  hbuUpdate();
}
function hbCloseUpgrade(){var o=document.getElementById('hbu-ov');if(o)o.remove();hbuPersist();updateUI();}
function hbuSchedule(save_){clearTimeout(_hbuT);_hbuT=setTimeout(function(){hbuUpdate();if(save_)hbuPersist();},120);}
function hbuPersist(){try{if(!document.getElementById('hbu-ov'))return;state.up=hbUpRead();if(state.up.type&&state.up.type!==state.houseType)state.up.type=state.up.type;save();}catch(e){}}
function hbuBudgetUse(v){var e=document.getElementById('hbu-saveMonthly');if(e){e.value=Math.round(v);hbuUpdate();hbuPersist();}}
function hbuCard(l,v,s,cls){return '<div class="hbc-card"><div class="l">'+l+'</div><div class="v'+(cls?' '+cls:'')+'">'+v+'</div><div class="s">'+(s||'')+'</div></div>';}
function hbuUpdate(){
  var out=document.getElementById('hbu-out');if(!out)return;
  var u=hbUpRead(),S2=hbUpSim(),now=hbUpNow(u),walkP=hbUpWalk(u,S2.scn),walkB=hbUpWalk(Object.assign({},u,{saveMonthly:0,cashExtra:u.cashExtra}),S2.base);
  var region=HB_TAX[u.region]||HB_TAX.eng,rname=(region.alias?HB_TAX[region.alias]:region).tax;
  var bud=hbBudget(),ub=Math.round(bud.unassigned),sv=Math.round(bud.saving);
  var bb=document.getElementById('hbu-budbtns');
  if(bb)bb.innerHTML=(ub>0?'<button type="button" class="stk-btn" onclick="hbuBudgetUse('+ub+')">Use my unassigned '+hbMoney(ub)+'/mo</button> ':'')+(ub+sv>0&&sv>0?'<button type="button" class="stk-btn" onclick="hbuBudgetUse('+(ub+sv)+')">Use unassigned + savings '+hbMoney(ub+sv)+'/mo</button>':'');
  var when=function(w){if(!w.ready)return 'not within the mortgage term';if(w.ready.months===0)return 'now';var d=new Date();d.setMonth(d.getMonth()+w.ready.months);return hbYM(w.ready.months)+' · '+d.toLocaleDateString('en-GB',{month:'short',year:'numeric'});};
  var h='';
  h+='<div class="hbc-cards">'
    +hbuCard('Funds towards the move',hbMoney(now.funds),u.mode==='sell'?'net equity '+hbMoney(now.netEquity)+' + cash '+hbMoney(u.cashExtra):'cash only (home kept)')
    +hbuCard(rname+' (stamp duty)',hbMoney(now.stamp),(u.mode==='let'?'additional-property rates':'standard rates')+' · '+(region.alias?HB_TAX[region.alias]:region).name)
    +hbuCard('Deposit possible',hbMoney(now.deposit),(u.price>0?(now.deposit/u.price*100).toFixed(1):0)+'% of price · wanted '+hbMoney(now.wantDeposit),now.ready?'hbc-good':'hbc-warn')
    +hbuCard('New mortgage',hbMoney(now.loan),'LTV '+now.ltv.toFixed(0)+'% · typical rate ≈ '+now.band[1]+'% (≤'+now.band[0]+'% LTV)')
    +hbuCard('Monthly payment',hbMoney(now.payment),'at '+u.rate+'% · stress +3%: '+hbMoney(now.stressPayment))
    +hbuCard('Ready to move',now.ready?'Now ✓':when(walkP),'with your plan'+(walkB.ready&&walkP.ready&&walkB.ready.months>walkP.ready.months?' · '+hbYM(walkB.ready.months-walkP.ready.months)+' sooner than the no-extras plan':''),now.ready?'hbc-good':'')
    +'</div>';
  // affordability
  if(u.income>0){
    h+='<div class="hbc-note" style="margin:0 0 8px">Affordability: loan is <b>'+now.lti.toFixed(2)+'×</b> income (illustrative cap '+u.ltiCap+'×, max loan ≈ '+hbMoney(now.maxLoan)+'), <b class="'+(now.ltiOk?'hbc-good':'hbc-warn')+'">'+(now.ltiOk?'within the cap':'over the cap')+'</b>. Payment is '+(u.income>0?(now.payment/(u.income/12)*100).toFixed(0):0)+'% of gross monthly income.</div>';
  } else h+='<div class="hbc-note" style="margin:0 0 8px">Add your household income in section 4 for an affordability check.</div>';
  // working
  if(u.mode==='sell'){
    h+='<table><tr><th>Sale working</th><th>£</th></tr>'
      +'<tr><td>Sale price</td><td>'+hbMoney(u.sale)+'</td></tr>'
      +'<tr><td>Agent ('+u.agentPct+'%)</td><td>−'+hbMoney(u.sale*u.agentPct/100)+'</td></tr>'
      +'<tr><td>Conveyancing + other</td><td>−'+hbMoney((+u.saleLegal||0)+(+u.saleOther||0))+'</td></tr>'
      +'<tr><td>Mortgage balance</td><td>−'+hbMoney(state.mortgageBalance||0)+'</td></tr>'
      +'<tr><td>Early repayment charge</td><td>−'+hbMoney(now.erc)+'</td></tr>'
      +'<tr><td><b>Net equity released</b></td><td><b>'+hbMoney(now.netEquity)+'</b></td></tr>'
      +'<tr><td>+ extra cash</td><td>'+hbMoney(u.cashExtra)+'</td></tr>'
      +'<tr><td>− '+rname+'</td><td>−'+hbMoney(now.stamp)+'</td></tr>'
      +'<tr><td>− buying costs</td><td>−'+hbMoney(now.buyCosts)+'</td></tr>'
      +'<tr><td><b>Available as deposit</b></td><td><b>'+hbMoney(now.depositAvail)+'</b></td></tr></table>';
  } else {
    var lc=hbLetCover(u.rent,state.mortgageBalance||0,S2.scn.payment0);
    h+='<table><tr><th>Keep &amp; let</th><th></th></tr>'
      +'<tr><td>Current mortgage payment</td><td>'+hbMoney(S2.scn.payment0)+'/mo</td></tr>'
      +'<tr><td>Expected rent</td><td>'+hbMoney(u.rent)+'/mo</td></tr>'
      +'<tr><td>Rent covers the payment</td><td class="'+((lc.cover||0)>=1?'hbc-good':'hbc-warn')+'">'+(u.rent>0&&lc.cover?lc.cover.toFixed(2)+'×':'–')+'</td></tr>'
      +'<tr><td>Rent a lender usually wants (125% at 5.5%)</td><td>'+hbMoney(lc.needed)+'/mo</td></tr>'
      +'<tr><td>Meets that test?</td><td class="'+(lc.icrOk?'hbc-good':'hbc-warn')+'">'+(u.rent>0?(lc.icrOk?'yes':'no'):'–')+'</td></tr>'
      +'<tr><td>Cash for the new deposit</td><td>'+hbMoney(now.funds)+'</td></tr>'
      +'<tr><td>− '+rname+' (higher rates)</td><td>−'+hbMoney(now.stamp)+'</td></tr>'
      +'<tr><td>− buying costs</td><td>−'+hbMoney(now.buyCosts)+'</td></tr></table>'
      +'<div class="hbc-note">Letting your home usually needs your lender’s consent or a buy-to-let mortgage, landlord insurance, and rental income is taxable. Higher-rate stamp duty applies to the new home while you still own the old one (some can be reclaimed if you sell the old one within 3 years).</div>';
  }
  // budget effect
  var rows='';
  [[0,'Right now'],[ub,'+ unassigned '+hbMoney(ub)],[ub+sv,'+ unassigned + savings '+hbMoney(ub+sv)]].forEach(function(x,i){
    if(i>0&&!(x[0]>0))return;if(i===2&&!(sv>0))return;
    var w=hbUpWalk(Object.assign({},u,{saveMonthly:(+u.saveMonthly||0)+x[0]}),S2.scn);
    rows+='<tr><td>'+x[1]+(i?'/mo':'')+'</td><td>'+when(w)+'</td></tr>';
  });
  h+='<div class="hb-tip" style="margin-top:12px"><svg class="vi-ic hb-tip-ic" aria-hidden="true"><use href="#vi-info"/></svg> <b>What your Budget could do</b><br>Months until the move is affordable if you add:<table>'+rows+'</table></div>';
  h+='<div class="hbc-note">Stamp duty: '+HB_TAX_ASOF+'. Indicative rates by LTV are Rightmove averages (Oct 2025) and lenders vary. Affordability uses a simple income multiple; real lenders also assess outgoings and credit. This is a planning aid, not mortgage advice.</div>';
  out.innerHTML=h;
}
function hbRenderL3(el){
  var u=hbUpGet(),now=hbUpNow(u),p=now.readiness;
  var S2=hbUpSim(),w=hbUpWalk(u,S2.scn);
  el.innerHTML='<div class="card-lbl">LEVEL 3 · UPGRADE <span style="opacity:.6">· '+(u.mode==='sell'?'sell &amp; move':'keep &amp; let')+'</span></div>'
    +'<div style="display:flex;justify-content:space-between;font-family:\'Share Tech Mono\',monospace;font-size:max(.62rem,var(--vi-fs-2));color:var(--text)"><span>'+hbMoney(Math.max(0,now.depositAvail))+' of '+hbMoney(now.wantDeposit)+' deposit</span><span>'+(p*100).toFixed(0)+'%</span></div>'
    +'<div class="hb-xp"><div style="width:'+(p*100).toFixed(1)+'%"></div></div>'
    +'<div class="hb-st"><div><b>'+hbMoney(u.price)+'</b><span>target home</span></div><div><b>'+hbMoney(now.stamp)+'</b><span>'+(HB_TAX[u.region].tax||'tax')+'</span></div><div><b>'+now.ltv.toFixed(0)+'%</b><span>LTV</span></div><div><b>'+hbMoney(now.payment)+'</b><span>per month</span></div></div>'
    +'<div style="font-size:max(.5rem,var(--vi-fs-1));color:var(--t3)">'+(now.ready?'You could afford the upgrade today.':'Ready '+(w.ready?(w.ready.months===0?'now':'in '+hbYM(w.ready.months)):'beyond the mortgage term')+' on your current plan.')+' The new home is shown as a ghost build.</div>'
    +'<div style="margin-top:10px"><button class="btn-add-data" onclick="hbOpenUpgrade()">🚀 Open upgrade planner</button></div>';
}
function hbUnlockL3(){toast(HB_L3_LOCKED);}   // Level 3 is locked for everyone (owner, 1 Nov 2026); the name stays for old buttons
function hbL3Card(){
  if(state.houseMode!=='purchased')return '';
  return '<div class="hb-tip hb-l3-locked"><svg class="vi-ic" style="width:14px;height:14px;--vi-sw:1.5;vertical-align:-2px" aria-hidden="true"><use href="#vi-lock"/></svg> '+HB_L3_LOCKED+' <span class="hb-own-pro">PRO</span></div>';
}
function hbL3CardDormant(){   // the old unlock card, kept for when Level 3 returns
  if(state.level3||state.houseMode!=='purchased')return '';
  var val=+state.valuation||+state.target||0,bal=Math.max(0,+state.mortgageBalance||0),eqp=val>0?(val-bal)/val*100:0,th=hbUpGet().threshold;
  if(eqp>=th)return '<div class="hb-tip" style="border-color:rgb(var(--gold-rgb) / .6)">🚀 <b>Level 3 is ready</b>: you own '+eqp.toFixed(0)+'% (threshold '+th+'%). Time to plan your upgrade.<div style="margin-top:8px"><button class="btn-add-data" onclick="hbUnlockL3()">Unlock Level 3</button></div></div>';
  return '<div class="hb-tip">🔒 Level 3 unlocks at <b>'+th+'%</b> equity (you have '+eqp.toFixed(0)+'%). <button class="stk-btn" onclick="hbUnlockL3()">Unlock early</button></div>';
}

// the milestone timeline (v0.9.1 E11): done, next and "£x to go". One place, so the render and every update agree.
// Chunk G hangs the XP line on the same rows (".ms-tg" holds the right-hand note; a done row can take "+n XP" there).
function hbPaintMilestones(p){
  try{hbMsXp(p);}catch(e){}
  var nx=MS_PCTS.findIndex(function(q){return p<q/100;}),dt=depositTarget();
  MS_IDS.forEach(function(id,i){
    var el=document.getElementById('ms'+id); if(!el)return;
    var hit=p>=MS_PCTS[i]/100;
    el.classList.toggle('hit',hit); el.classList.toggle('next',i===nx);
    var dot=el.querySelector('.ms-dot'),tg=el.querySelector('.ms-tg');
    if(dot){var want=hit?'check':(id==='100'?'trophy':'');
      if(dot.getAttribute('data-ic')!==want){dot.setAttribute('data-ic',want);dot.innerHTML=want?'<svg class="vi-ic" role="img" aria-label="'+(hit?'Done':'Keys are yours')+'"><use href="#vi-'+want+'"/></svg>':'';}}
    if(tg)tg.textContent=hit?'+'+HB_MS_XP[i]+' XP':(i===nx)?gbpFmt(Math.max(0,MS_PCTS[i]/100*dt-(state.saved||0)))+' to go · +'+HB_MS_XP[i]+' XP':'';
  });
  var xe=document.getElementById('stXP');if(xe&&typeof wrTotalXp==='function')xe.textContent=wrTotalXp().toLocaleString('en-GB');
}
// E9: pay each milestone reached its XP once, into the Wealth Roadmap's own store (achState.wr.h, by milestone id), latched like the
// Roadmap's steps: a lower saved figure, a house reset or a new house type never takes it back or pays it twice. The first time this
// runs on a device, milestones already passed are paid silently (no toast flood). After that a milestone the user reaches toasts once,
// only after something they did, and never over another toast: it waits for the house's own milestone toast to clear.
function hbMsXp(p){
  if(typeof achState==='undefined'||typeof wrState!=='function'||!window._viAchReady||window._viDeleted)return 0;   // nothing writes back after the account is deleted
  var w=wrState(),first=!w.h,h=w.h||(w.h={}),gain=0,names=[],lbl=MS_LABELS[state.houseType]||MS_LABELS.terraced;
  MS_PCTS.forEach(function(q,i){var id=MS_IDS[i];if(p>=q/100&&!h[id]){h[id]=HB_MS_XP[i];gain+=HB_MS_XP[i];names.push(hbNoEmoji(lbl[i]));}});
  if(!gain)return 0;
  saveAch();
  if(!first&&window._viActed){var q=hbXpToast._q||(hbXpToast._q={xp:0,n:0,name:''});q.xp+=gain;q.n+=names.length;q.name=names[names.length-1];hbXpToast(0);}
  try{if(document.getElementById('tab-achievements').classList.contains('active'))setTimeout(renderAchievements,0);}catch(e){}
  try{renderOvAch();}catch(e){}
  return gain;
}
function hbXpToast(n){   // one toast for whatever was earned together; tries for about 6 s while another toast is showing
  clearTimeout(hbXpToast._t);
  hbXpToast._t=setTimeout(function(){
    var q=hbXpToast._q,t=document.getElementById('toast');if(!q)return;
    if(t&&t.classList.contains('show')){if(n<12)hbXpToast(n+1);else hbXpToast._q=null;return;}
    hbXpToast._q=null;toast('+'+q.xp.toLocaleString('en-GB')+' XP · '+(q.n>1?q.n+' milestones':q.name));
  },n?500:0);
}
function updateMilestoneLabels(){
  const lbl=MS_LABELS[state.houseType]||MS_LABELS.terraced;
  MS_IDS.forEach((id,i)=>{
    const el=document.getElementById('msl-'+id);
    if(el)el.innerHTML='<b>'+MS_PCTS[i]+'%</b> '+cfEsc(hbNoEmoji(lbl[i]));
  });
}

// ── EXPAND / PAN / ORBIT ──────────────────────────────────────────
function toggleExpand(){
  _isExpanded=!_isExpanded;
  const sc=document.getElementById('houseSceneCard');
  sc.classList.toggle('expanded',_isExpanded);
  const btn=document.getElementById('btnExpand');
  if(btn)btn.textContent=_isExpanded?'✕':'⛶';
  document.body.style.overflow=_isExpanded?'hidden':'';
  setTimeout(redraw,30);
}

function hbJumpToRow(){
  var v = HB3DAPP.viewer; if (hb3dActive() && v && v.rowInfo()) { v.flyToRow(700); return; }
  toast('Add a deposit to start building your first row');
}
function resetView(){
  if(hb3dActive()&&HB3DAPP.viewer){HB3DAPP.viewer.fit();_houseZoom=_HZ_DEFAULT;_panX=0;_panY=0;_viewAngle=0;_updateHUD();return;}
  _panX=0;_panY=0;_viewAngle=0;
  _houseZoom=_HZ_DEFAULT;_updateHUD();
  redraw();
}

function housePan(dx, dy) { _panX += dx; _panY += dy; _updateHUD(); }   // the 3D view pans itself; the still picture does not move

