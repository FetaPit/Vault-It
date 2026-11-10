// ═══════════════════════════════════════════════════════════════
// MORTGAGE ENGINE — pure functions, no DOM. Illustrative only.
// Models UK behaviour: daily interest charged monthly (default), monthly or annual rest, offset,
// repayment / interest-only / part-and-part, fixed→reversion products, overpayments (monthly, step-up,
// lumps, round-up), term- vs payment-reduction, overpayment allowance + early-repayment charges, fees.
// ═══════════════════════════════════════════════════════════════
function hbDaysIn(y,m){return new Date(Date.UTC(y,m+1,0)).getUTCDate();}
function hbAddMonths(d,n){var x=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+n,1));x.setUTCDate(Math.min(d.getUTCDate(),hbDaysIn(x.getUTCFullYear(),x.getUTCMonth())));return x;}
function hbPmt(B,r,n){if(n<=0)return B;if(r<=0)return B/n;return B*r/(1-Math.pow(1+r,-n));}   // annuity: r = periodic rate
function hbNum(v,d){v=parseFloat(v);return isFinite(v)?v:(d||0);}
function hbNormalise(o){
  o=o||{};
  var n={
    loan:Math.max(0,hbNum(o.loan)),termMonths:Math.max(1,Math.round(hbNum(o.termMonths,300))),
    start:o.start||new Date().toISOString().slice(0,10),
    repayment:o.repayment||'repayment',ioAmount:Math.max(0,hbNum(o.ioAmount)),
    products:(o.products&&o.products.length?o.products:[{months:null,type:'fixed',rate:5}]).map(function(p){return{months:p.months==null||p.months===''?null:Math.max(1,Math.round(hbNum(p.months))),type:p.type||'fixed',rate:hbNum(p.rate),base:hbNum(p.base),margin:hbNum(p.margin)};}),
    interestMode:o.interestMode||'daily',stress:hbNum(o.stress),
    offset:{enabled:!!(o.offset&&o.offset.enabled),balance:Math.max(0,hbNum(o.offset&&o.offset.balance)),monthlyAdd:hbNum(o.offset&&o.offset.monthlyAdd)},
    over:{monthly:Math.max(0,hbNum(o.over&&o.over.monthly)),stepUpPct:hbNum(o.over&&o.over.stepUpPct),lumps:((o.over&&o.over.lumps)||[]).map(function(l){return{month:Math.max(1,Math.round(hbNum(l.month,1))),amount:Math.max(0,hbNum(l.amount))};}),roundUp:!!(o.over&&o.over.roundUp)},
    outcome:o.outcome||'term',
    allowance:{pct:hbNum(o.allowance&&o.allowance.pct,10),basis:(o.allowance&&o.allowance.basis)||'anniversary',enforce:o.allowance?o.allowance.enforce!==false:false,cap:!!(o.allowance&&o.allowance.cap)},
    erc:(o.erc||[]).map(hbNum),
    fees:{arrangement:Math.max(0,hbNum(o.fees&&o.fees.arrangement)),addToLoan:!!(o.fees&&o.fees.addToLoan),other:Math.max(0,hbNum(o.fees&&o.fees.other))},
    valuation:hbNum(o.valuation),growthPct:hbNum(o.growthPct)
  };
  return n;
}
function hbProductAt(o,m){var cum=0;for(var i=0;i<o.products.length;i++){var p=o.products[i];if(p.months==null)return{p:p,i:i,from:cum+1};cum+=p.months;if(m<=cum)return{p:p,i:i,from:cum-p.months+1};}var last=o.products[o.products.length-1];return{p:last,i:o.products.length-1,from:1};}
function hbRateOf(o,pr){var p=pr.p,r=(p.type==='tracker')?(p.base+p.margin):p.rate;return Math.max(0,(r+o.stress))/100;}
function hbSimulate(opts){
  var o=hbNormalise(opts),out={schedule:[],warnings:[],totalInterest:0,totalPaid:0,ercTotal:0,upfront:0,balloon:0,payment0:0};
  var start=new Date(o.start+'T00:00:00Z');
  var loan=o.loan+(o.fees.addToLoan?o.fees.arrangement:0);
  out.upfront=(o.fees.addToLoan?0:o.fees.arrangement)+o.fees.other;
  var term=o.termMonths,io=o.repayment==='interest-only'?loan:(o.repayment==='part'?Math.min(o.ioAmount,loan):0);
  var Brep=loan-io,Bio=io,Bref=Brep,off=o.offset.enabled?o.offset.balance:0;
  var payRep=0,lastProdIdx=-1,annualBal=loan,yearKey=null,allowBal=loan,overYear=0,m=0;
  var p0months=o.products[0].months;
  while(m<term&&(Brep+Bio)>0.005){
    m++;
    var B=Brep+Bio,date=hbAddMonths(start,m-1),next=hbAddMonths(start,m),days=Math.round((next-date)/864e5);
    var pr=hbProductAt(o,m),r=hbRateOf(o,pr);
    var yIdx=Math.floor((m-1)/12);
    // allowance year: anniversary of the start, or calendar year
    var yk=o.allowance.basis==='calendar'?date.getUTCFullYear():yIdx;
    if(yk!==yearKey){yearKey=yk;overYear=0;allowBal=B;}
    if(m===1||(m-1)%12===0)annualBal=B;
    // payment basis: recalculated when the rate changes (term mode) or every month (payment mode)
    if(o.outcome!=='payment'&&pr.i!==lastProdIdx){payRep=hbPmt(Bref,r/12,term-m+1);lastProdIdx=pr.i;}
    // lump sums at the start of the month
    var ercM=0,overM=0,lumpM=0;
    var inErc=(o.erc.length>0)&&(p0months!=null)&&(pr.i===0)&&(m<=p0months);
    var yearsIn=Math.min(o.erc.length-1,Math.floor((m-1)/12));
    function applyOver(amount){
      amount=Math.min(amount,Brep+Bio);if(amount<=0)return 0;
      if(inErc||(o.allowance.enforce&&inErc)){
        var allowLeft=Math.max(0,allowBal*o.allowance.pct/100-overYear);
        if(amount>allowLeft+0.005){
          if(o.allowance.cap){amount=allowLeft;}
          else{var ex=amount-allowLeft;ercM+=ex*(o.erc[yearsIn]||0)/100;out.warnings.push('Month '+m+': overpayment above the '+o.allowance.pct+'% allowance, so an early repayment charge applies to £'+Math.round(ex));}
        }
      }
      overYear+=amount;
      var fromRep=Math.min(amount,Brep);Brep-=fromRep;Bio-=Math.min(amount-fromRep,Bio);
      return amount;
    }
    o.over.lumps.forEach(function(l){if(l.month===m){lumpM+=applyOver(l.amount);}});
    if(o.outcome==='payment')payRep=hbPmt(Brep,r/12,term-m+1);   // "reduce payment": re-set over the remaining term after any lump
    B=Brep+Bio;
    // interest for the month
    var offEff=o.offset.enabled?Math.min(off,B):0,interest;
    if(o.interestMode==='monthly')interest=Math.max(0,B-offEff)*r/12;
    else if(o.interestMode==='annual')interest=Math.max(0,annualBal-offEff)*r/12;   // annual rest: interest runs on the balance at the start of the year; payments only count from the next charge date
    else {var yd=(new Date(Date.UTC(date.getUTCFullYear(),11,31))-new Date(Date.UTC(date.getUTCFullYear()-1,11,31)))/864e5;interest=Math.max(0,B-offEff)*r*days/yd;}
    // contractual payment
    var pay;
    if(o.repayment==='interest-only')pay=interest;
    else pay=payRep+(Bio>0?Bio*r/12:0);
    var final=false,clearAmt=(o.repayment==='repayment')?B:Brep;   // part-and-part: only the repayment slice is cleared
    if(o.repayment!=='interest-only'&&(pay>=clearAmt+interest-0.005||m===term)){pay=clearAmt+interest;final=true;}
    var principal=Math.max(0,pay-interest);
    var pRep=Math.min(principal,Brep);Brep-=pRep;var pIo=Math.min(principal-pRep,Bio);Bio-=pIo;
    // reference path (no overpayments) for term mode
    if(o.outcome==='term'&&Bref>0){var refInt=Bref*r/12;Bref=Math.max(0,Bref-Math.max(0,hbPmt(Bref+0,r/12,term-m+1)-refInt));}
    // monthly overpayment (end of month)
    if(!final){
      var ov=o.over.monthly*Math.pow(1+o.over.stepUpPct/100,yIdx);
      if(o.over.roundUp){var up=Math.ceil(pay)-pay;ov+=up;}
      if(ov>0)overM+=applyOver(ov);
    }
    if(o.offset.enabled)off=Math.max(0,off+o.offset.monthlyAdd);
    var close=Math.max(0,Brep+Bio);if(close<0.005){Brep=0;Bio=0;close=0;}
    out.totalInterest+=interest;out.totalPaid+=pay+overM+lumpM+ercM;out.ercTotal+=ercM;
    if(m===1)out.payment0=pay;
    out.schedule.push({m:m,date:date.toISOString().slice(0,10),open:B+lumpM,interest:interest,principal:pRep+pIo,pay:pay,overpay:overM+lumpM,erc:ercM,close:close,rate:r*100,offset:off});
    if(close<=0)break;
  }
  var rem=Brep+Bio;if(rem>0.005){out.balloon=rem;out.warnings.push(o.repayment==='repayment'?'Balance not cleared by the end of the term.':'Interest-only: £'+Math.round(rem).toLocaleString('en-GB')+' is still owed at the end of the term and must be repaid from another source.');}
  out.months=out.schedule.length;
  var last=out.schedule[out.schedule.length-1];
  out.payoffDate=last?hbAddMonths(start,out.months).toISOString().slice(0,10):o.start;
  out.totalCost=out.totalInterest+out.ercTotal+out.upfront;
  out.opts=o;return out;
}
// property value after m months and equity (value − balance)
function hbEquityAt(sim,m){
  var o=sim.opts,val=(o.valuation>0?o.valuation:0)*Math.pow(1+o.growthPct/100,m/12);
  var row=m<=0?null:sim.schedule[Math.min(m,sim.schedule.length)-1];
  var bal=m<=0?(o.loan+(o.fees.addToLoan?o.fees.arrangement:0)):(m>sim.schedule.length?0:row.close);
  return{value:val,balance:bal,equity:Math.max(0,val-bal)};
}
function hbCompare(base,scn){
  return{interestSaved:base.totalInterest-scn.totalInterest,monthsSaved:base.months-scn.months,costSaved:base.totalCost-scn.totalCost,
    base:base,scn:scn};
}
// HB_MORTGAGE_ENGINE>>

// <<HB_UPGRADE_ENGINE
// ═══════════════════════════════════════════════════════════════
// LEVEL 3 — UPGRADE ENGINE (pure). Stamp-duty tables are the rates last checked (Apr 2025) from
// gov.uk / revenue.scot / gov.wales and MUST be re-checked before relying on them. Illustrative only, not advice.
var HB_TAX_ASOF='rates last checked Apr 2025; verify on gov.uk (England/NI), revenue.scot or gov.wales';
var HB_TAX={
  eng:{name:'England',tax:'SDLT',
    standard:[[125000,0],[250000,2],[925000,5],[1500000,10],[Infinity,12]],
    ftb:[[300000,0],[500000,5]],ftbMax:500000,
    additional:[[125000,5],[250000,7],[925000,10],[1500000,15],[Infinity,17]]},
  ni:{name:'Northern Ireland',tax:'SDLT',alias:'eng'},
  sco:{name:'Scotland',tax:'LBTT',
    standard:[[145000,0],[250000,2],[325000,5],[750000,10],[Infinity,12]],
    ftb:[[175000,0],[250000,2],[325000,5],[750000,10],[Infinity,12]],ftbMax:Infinity,
    additional:[[145000,8],[250000,10],[325000,13],[750000,18],[Infinity,20]]},
  wal:{name:'Wales',tax:'LTT',
    standard:[[225000,0],[400000,6],[750000,7.5],[1500000,10],[Infinity,12]],
    additional:[[180000,5],[250000,8.5],[400000,10],[750000,12.5],[1500000,15],[Infinity,17]]}
};
function hbBands(price,bands){var tax=0,lo=0;for(var i=0;i<bands.length;i++){var hi=bands[i][0];if(price>lo)tax+=(Math.min(price,hi)-lo)*bands[i][1]/100;lo=hi;if(price<=hi)break;}return tax;}
// buyer: 'standard' | 'ftb' | 'additional'
function hbStampDuty(region,price,buyer){
  var t=HB_TAX[region]||HB_TAX.eng;if(t.alias)t=HB_TAX[t.alias];
  price=Math.max(0,+price||0);buyer=buyer||'standard';
  var bands=t.standard;
  if(buyer==='additional')bands=t.additional;
  else if(buyer==='ftb'&&t.ftb&&price<=t.ftbMax)bands=t.ftb;
  return Math.round(hbBands(price,bands));
}
var HB_RATE_BANDS=[[60,4.08],[75,4.37],[85,4.44],[90,4.67],[95,5.16]];   // indicative average 2-yr fixed by LTV (Rightmove, Oct 2025)
function hbRateBand(ltv){for(var i=0;i<HB_RATE_BANDS.length;i++)if(ltv<=HB_RATE_BANDS[i][0])return HB_RATE_BANDS[i];return HB_RATE_BANDS[HB_RATE_BANDS.length-1];}
// st = {value, balance, cash}. u = upgrade plan (see hbUpDefaults).
function hbUpgradeAt(u,st){
  var r={};
  var buyer=u.mode==='let'?'additional':'standard';
  r.stamp=hbStampDuty(u.region,u.price,buyer);
  r.buyCosts=(+u.buyLegal||0)+(+u.survey||0)+(+u.moving||0);
  r.wantDeposit=u.price*(u.depPct/100);
  if(u.mode==='let'){
    r.saleNet=0;r.erc=0;r.netEquity=0;r.funds=Math.max(0,st.cash);
  }else{
    var agent=st.value*(u.agentPct/100);
    r.saleNet=st.value-agent-(+u.saleLegal||0)-(+u.saleOther||0);
    r.erc=Math.max(0,st.balance)*((+u.ercPct||0)/100);
    r.netEquity=r.saleNet-st.balance-r.erc;
    r.funds=Math.max(0,r.netEquity+st.cash);
  }
  r.depositAvail=r.funds-r.stamp-r.buyCosts;
  r.deposit=Math.min(u.price,Math.max(0,r.depositAvail));
  r.shortfall=Math.max(0,r.wantDeposit-r.depositAvail);
  r.ready=r.depositAvail>=r.wantDeposit-0.005;
  r.readiness=r.wantDeposit>0?Math.max(0,Math.min(1,r.depositAvail/r.wantDeposit)):0;
  r.loan=Math.max(0,u.price-r.deposit);
  r.ltv=u.price>0?r.loan/u.price*100:0;
  r.band=hbRateBand(r.ltv);
  var n=Math.max(1,Math.round((+u.termY||25)*12));
  r.payment=hbPmt(r.loan,(+u.rate||0)/1200,n);
  r.stressPayment=hbPmt(r.loan,((+u.rate||0)+3)/1200,n);
  r.lti=u.income>0?r.loan/u.income:null;
  r.ltiOk=r.lti===null?null:r.lti<=(+u.ltiCap||4.5);
  r.maxLoan=u.income>0?u.income*(+u.ltiCap||4.5):null;
  return r;
}
// walk the current mortgage's schedule: when does the plan first become affordable?
function hbUpgradeWalk(u,sim){
  var len=Math.min(sim.schedule.length,600),res=null;
  for(var m=0;m<=len;m++){
    var e=hbEquityAt(sim,m),st={value:e.value,balance:e.balance,cash:(+u.cashExtra||0)+(+u.saveMonthly||0)*m};
    var r=hbUpgradeAt(u,st);
    if(r.ready){res={months:m,at:r,state:st};break;}
  }
  return{ready:res};
}
// keep-and-let: can the rent carry the existing mortgage? (lender ICR test: rent ≥ 125% of interest at ~5.5%)
function hbLetCover(rent,balance,payment,icrRate,icrPct){
  icrRate=icrRate||5.5;icrPct=icrPct||125;
  var need=balance*icrRate/100/12*icrPct/100;
  return{needed:need,icrOk:rent>=need,cover:payment>0?rent/payment:null,surplus:rent-payment};
}
// HB_UPGRADE_ENGINE>>


// ═══════════════════════════════════════════════════════════════
// MORTGAGE CALCULATOR — modal UI over the engine above
// ═══════════════════════════════════════════════════════════════
var HBC_DEF={price:0,dep:0,bal:0,termY:25,termM:0,start:'',p1type:'fixed',p1rate:4.8,p1base:4,p1margin:0.8,p1months:60,p2type:'variable',p2rate:7,
  repay:'repayment',io:0,mode:'daily',stress:0,over:0,step:0,round:false,lumps:[],outcome:'term',off:false,offbal:0,offadd:0,
  allow:10,basis:'anniversary',ercon:true,erc:'5,4,3,2,1',cap:false,fee:0,feeadd:false,other:0,val:0,growth:0,sav:4.5};
var _hbcT=null;
function hbRound(n,d){var f=Math.pow(10,d||0);return Math.round(n*f)/f;}
function hbMoney(n){n=+n||0;return (n<0?'−':'')+'£'+Math.abs(Math.round(n)).toLocaleString('en-GB');}
function hbYM(m){m=Math.max(0,Math.round(m));var y=Math.floor(m/12),mm=m%12;return (y?y+'y ':'')+(mm||!y?mm+'m':'');}
function hbFmtDate(iso){return new Date(iso+'T00:00:00Z').toLocaleDateString('en-GB',{month:'short',year:'numeric',timeZone:'UTC'});}
function hbcFields(){
  var d=Object.assign({},HBC_DEF,state.calc||{});
  var inL2=hbLevel()>=2;
  if(!(state.calc&&state.calc.price>0))d.price=state.target||200000;
  if(!(state.calc&&state.calc.dep>=0&&state.calc._set))d.dep=inL2?((state.purchase&&state.purchase.deposit)||state.saved||0):depositTarget();
  if(!(state.calc&&state.calc._set))d.bal=inL2?(state.mortgageBalance||Math.max(0,d.price-d.dep)):Math.max(0,d.price-d.dep);
  if(!d.start)d.start=new Date().toISOString().slice(0,10);
  if(!(state.calc&&state.calc.val>0))d.val=inL2?(state.valuation||d.price):d.price;
  d.lumps=(d.lumps||[]).slice();
  return d;
}
function hbcGet(id){var e=document.getElementById('hbc-'+id);if(!e)return null;return e.type==='checkbox'?e.checked:e.value;}
function hbcRead(){
  var d=hbcFields(),g=function(k){var v=hbcGet(k);return v===null?d[k]:v;},n=function(k){var v=parseFloat(g(k));return isFinite(v)?v:(+d[k]||0);};
  var raw={price:n('price'),dep:n('dep'),bal:n('bal'),termY:n('termY'),termM:n('termM'),start:g('start')||d.start,p1type:g('p1type'),p1rate:n('p1rate'),p1base:n('p1base'),p1margin:n('p1margin'),p1months:n('p1months'),
    p2type:g('p2type'),p2rate:n('p2rate'),repay:g('repay'),io:n('io'),mode:g('mode'),stress:n('stress'),over:n('over'),step:n('step'),round:!!g('round'),lumps:d.lumps,outcome:g('outcome'),
    off:!!g('off'),offbal:n('offbal'),offadd:n('offadd'),allow:n('allow'),basis:g('basis'),ercon:!!g('ercon'),erc:String(g('erc')||''),cap:!!g('cap'),fee:n('fee'),feeadd:!!g('feeadd'),other:n('other'),val:n('val'),growth:n('growth'),sav:n('sav'),_set:true};
  var term=Math.max(1,Math.round(raw.termY*12+raw.termM));
  var ercs=raw.ercon?raw.erc.split(/[ ,]+/).map(parseFloat).filter(isFinite):[];
  var products=[{months:Math.max(1,Math.round(raw.p1months)),type:raw.p1type,rate:raw.p1rate,base:raw.p1base,margin:raw.p1margin},{months:null,type:raw.p2type==='fixed'?'fixed':raw.p2type,rate:raw.p2rate,base:raw.p1base,margin:raw.p1margin}];
  if(raw.p1months<=0||raw.p1months>=term)products=[products[0]].map(function(p){p.months=null;return p;});
  var common={loan:raw.bal,termMonths:term,start:raw.start,repayment:raw.repay,ioAmount:raw.io,products:products,interestMode:raw.mode,stress:raw.stress,outcome:raw.outcome,
    allowance:{pct:raw.allow,basis:raw.basis,enforce:raw.ercon,cap:raw.cap},erc:ercs,fees:{arrangement:raw.fee,addToLoan:raw.feeadd,other:raw.other},valuation:raw.val,growthPct:raw.growth};
  var scn=Object.assign({},common,{over:{monthly:raw.over,stepUpPct:raw.step,lumps:raw.lumps,roundUp:raw.round},offset:{enabled:raw.off,balance:raw.offbal,monthlyAdd:raw.offadd}});
  var base=Object.assign({},common,{over:{monthly:0,stepUpPct:0,lumps:[],roundUp:false},offset:{enabled:false,balance:0,monthlyAdd:0}});
  return{raw:raw,scn:scn,base:base,common:common};
}
function hbcFieldHTML(k,label,val,opts){
  opts=opts||{};var t=opts.type||'number';
  if(t==='select')return '<div><label for="hbc-'+k+'">'+label+'</label><select id="hbc-'+k+'">'+opts.options.map(function(o){return '<option value="'+o[0]+'"'+(String(val)===String(o[0])?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select></div>';
  if(t==='checkbox')return '<div class="full"><label class="chk"><input type="checkbox" id="hbc-'+k+'"'+(val?' checked':'')+'> '+label+'</label></div>';
  return '<div'+(opts.full?' class="full"':'')+'><label for="hbc-'+k+'">'+label+'</label><input id="hbc-'+k+'" type="'+t+'" '+(t==='number'?'step="'+(opts.step||'any')+'" min="'+(opts.min!=null?opts.min:0)+'"':'')+' value="'+(val==null?'':val)+'"'+(opts.ph?' placeholder="'+opts.ph+'"':'')+'></div>';
}
function hbOpenCalc(){
  var d=hbcFields();
  var o=document.getElementById('hbc-ov');if(o)o.remove();
  o=document.createElement('div');o.id='hbc-ov';o.className='hbc-ov';
  var F=hbcFieldHTML;
  o.innerHTML='<div class="hbc" role="dialog" aria-label="Mortgage calculator"><div class="hbc-hd"><span>🏠 Mortgage calculator <span style="font-weight:400;font-size:11px;color:var(--t3)">· illustrative, not advice</span></span><span style="cursor:pointer;font-size:20px;padding:0 6px" onclick="hbCloseCalc()" aria-label="Close"><svg class="vi-ic g" role="img" aria-label="Close"><use href="#vi-close"/></svg></span></div>'
  +'<div class="hbc-body"><div id="hbc-in">'
  +'<details open><summary>1 · Loan</summary><div>'+F('price','Property price £',d.price)+F('dep','Deposit £',d.dep)+F('bal','Mortgage balance £',d.bal)+F('termY','Years remaining',d.termY,{step:1})+F('termM','+ months',d.termM,{step:1})+F('start','Start / today',d.start,{type:'date'})
    +'<div class="full" style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" class="stk-btn" onclick="hbcFromPrice()">Loan = price − deposit</button>'+(hbLevel()>=2?'<button type="button" class="stk-btn" onclick="hbcSaveBalance()">Save as my current balance</button>':'')+'</div></div></details>'
  +'<details open><summary>2 · Rate &amp; product</summary><div>'+F('p1type','First deal',d.p1type,{type:'select',options:[['fixed','Fixed'],['tracker','Tracker (base + margin)'],['variable','Variable / SVR']]})+F('p1months','Deal length (months)',d.p1months,{step:1})
    +'<div id="hbc-p1fixed" class="full" style="display:contents">'+F('p1rate','Rate % (fixed / variable)',d.p1rate,{step:0.01})+'</div>'+F('p1base','Base rate % (tracker)',d.p1base,{step:0.01})+F('p1margin','Margin % (tracker)',d.p1margin,{step:0.01})
    +F('p2type','After the deal',d.p2type,{type:'select',options:[['variable','Reverts to variable'],['fixed','New fixed rate'],['tracker','Tracker']]})+F('p2rate','…at rate %',d.p2rate,{step:0.01})
    +F('mode','Interest method',d.mode,{type:'select',options:[['daily','Daily (most UK lenders)'],['monthly','Monthly'],['annual','Annual rest (older products)']]})+F('stress','Stress test: add % to every rate',d.stress,{step:0.1,min:-5})+'</div></details>'
  +'<details><summary>3 · Repayment type</summary><div>'+F('repay','Type',d.repay,{type:'select',options:[['repayment','Repayment (capital + interest)'],['interest-only','Interest-only'],['part','Part-and-part']]})+F('io','£ on interest-only (part-and-part)',d.io)+'</div></details>'
  +'<details open><summary>4 · Overpayments</summary><div>'+F('over','Extra per month £',d.over)+F('step','Increase it by % each year',d.step,{step:0.5})+F('outcome','Use overpayments to',d.outcome,{type:'select',options:[['term','Reduce the term (keep payment)'],['payment','Reduce the payment (keep term)']]})+F('round','Round payments up to the next £',d.round,{type:'checkbox'})
    +'<div class="full"><label>Lump sums (one-off)</label><div id="hbc-lumps"></div><div class="hbc-lump"><div><label for="hbc-lm">In month #</label><input id="hbc-lm" type="number" min="1" step="1" value="1"></div><div><label for="hbc-la">Amount £</label><input id="hbc-la" type="number" min="0" step="100" placeholder="e.g. 5000"></div><button type="button" class="stk-btn" onclick="hbcAddLump()"><svg class="vi-ic g" aria-hidden="true"><use href="#vi-plus"/></svg> Add</button></div></div></div></details>'
  +'<details><summary>5 · Offset savings</summary><div>'+F('off','Offset mortgage: my savings reduce the interest-bearing balance',d.off,{type:'checkbox'})+F('offbal','Savings in the offset account £',d.offbal)+F('offadd','Add to it each month £',d.offadd)+'</div></details>'
  +'<details><summary>6 · Fees &amp; lender limits</summary><div>'+F('allow','Penalty-free overpayment allowance % / year',d.allow,{step:1})+F('basis','Allowance year',d.basis,{type:'select',options:[['anniversary','From your start date'],['calendar','Calendar year']]})
    +F('ercon','Early repayment charges apply during the first deal',d.ercon,{type:'checkbox'})+F('erc','ERC % by year (comma-separated)',d.erc,{type:'text',full:true,ph:'5,4,3,2,1'})+F('cap','Cap overpayments at the allowance (avoid ERC)',d.cap,{type:'checkbox'})
    +F('fee','Arrangement fee £',d.fee)+F('feeadd','Add the fee to the loan',d.feeadd,{type:'checkbox'})+F('other','Other upfront costs £ (legal, valuation)',d.other)+'</div></details>'
  +'<details><summary>7 · Property value &amp; savings alternative</summary><div>'+F('val','Property value now £',d.val)+F('growth','Value growth % / year',d.growth,{step:0.1,min:-20})+F('sav','Savings rate % (to compare)',d.sav,{step:0.1})+'<div class="hbc-note full">Growth defaults to 0% so equity figures are cautious.</div></div></details>'
  +'</div><div id="hbc-out"></div></div></div>';
  document.body.appendChild(o);
  o.addEventListener('input',function(e){if(e.target.closest('#hbc-in'))hbcSchedule();});
  o.addEventListener('change',function(e){if(e.target.closest('#hbc-in'))hbcSchedule(true);});
  hbcRenderLumps();hbcUpdate();
}
function hbCloseCalc(){var o=document.getElementById('hbc-ov');if(o)o.remove();}
function hbcSchedule(save_){clearTimeout(_hbcT);_hbcT=setTimeout(function(){hbcUpdate();if(save_)hbcPersist();},120);}
function hbcPersist(){try{state.calc=hbcRead().raw;save();}catch(e){}}
function hbcSet(id,v){var e=document.getElementById('hbc-'+id);if(!e)return;if(e.type==='checkbox')e.checked=!!v;else e.value=v;}
function hbcFromPrice(){var p=parseFloat(hbcGet('price'))||0,d=parseFloat(hbcGet('dep'))||0;hbcSet('bal',Math.max(0,Math.round(p-d)));hbcUpdate();hbcPersist();}
function hbcSaveBalance(){if(viBlockEdit())return;var b=parseFloat(hbcGet('bal'))||0;state.mortgageBalance=Math.round(b);var v=parseFloat(hbcGet('val'));if(v>0)state.valuation=v;hbcPersist();save();updateUI();toast('Current balance saved: '+hbMoney(b));}
function hbcAddLump(){if(viBlockEdit())return;
  var m=parseInt(document.getElementById('hbc-lm').value),a=parseFloat(document.getElementById('hbc-la').value);
  if(!(m>=1)||!(a>0)){toast('Enter the month number and an amount');return;}
  var cur=hbcRead().raw;cur.lumps=(cur.lumps||[]).concat([{month:m,amount:a}]).sort(function(x,y){return x.month-y.month;});
  state.calc=cur;save();document.getElementById('hbc-la').value='';hbcRenderLumps();hbcUpdate();
}
function hbcDelLump(i){if(viBlockEdit())return;var cur=hbcRead().raw;cur.lumps.splice(i,1);state.calc=cur;save();hbcRenderLumps();hbcUpdate();}
function hbcRenderLumps(){
  var el=document.getElementById('hbc-lumps');if(!el)return;var l=(hbcFields().lumps)||[];
  el.innerHTML=l.length?l.map(function(x,i){return '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-top:1px solid rgb(var(--ink-rgb) / .06)"><span>Month '+x.month+' · <b>'+hbMoney(x.amount)+'</b></span><button type="button" class="stk-btn" onclick="hbcDelLump('+i+')"><svg class="vi-ic g" role="img" aria-label="Close"><use href="#vi-close"/></svg></button></div>';}).join(''):'<div style="color:var(--t3);font-size:11px">None yet</div>';
}
function hbcPreset(name){
  var b=hbBudget(),u=Math.round(b.unassigned),sv=Math.round(b.saving);
  if(name==='none'){hbcSet('over',0);hbcSet('off',false);var cur=hbcRead().raw;cur.lumps=[];state.calc=cur;save();hbcRenderLumps();}
  else if(name==='unassigned'){hbcSet('over',u);}
  else if(name==='all'){hbcSet('over',u+sv);}
  else if(name==='offset'){hbcSet('off',true);if(!(parseFloat(hbcGet('offbal'))>0))hbcSet('offbal',Math.round(typeof alTotalCash==='function'?(alTotalCash()||5000):5000));}
  else if(name==='step'){hbcSet('over',Math.max(50,Math.round(u/2)));hbcSet('step',5);}
  hbcUpdate();hbcPersist();
}
function hbcChart(base,scn,common){
  var cw=0;try{cw=document.getElementById('hbc-out').clientWidth-18}catch(e){}
  var W=cw>200?Math.round(cw):640,stack=W<560,H=stack?250:222,L=56,R=10,T=10,B=stack?68:40,n=Math.max(base.months,scn.months,1),top=Math.max(base.opts.loan+(base.opts.fees.addToLoan?base.opts.fees.arrangement:0),(scn.opts.valuation>0?hbEquityAt(scn,n).value:0),1);
  var X=function(m){return L+(m/n)*(W-L-R);},Y=function(v){return T+(1-v/top)*(H-T-B);};
  function path(sim,key){var d='M'+X(0).toFixed(1)+' '+Y(sim.opts.loan+(sim.opts.fees.addToLoan?sim.opts.fees.arrangement:0)).toFixed(1);sim.schedule.forEach(function(r){d+=' L'+X(r.m).toFixed(1)+' '+Y(r[key]).toFixed(1);});return d;}
  var grid='',i;for(i=0;i<=3;i++){var v=top*i/3;grid+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" stroke="rgba(255,255,255,.07)"/><text x="'+(L-6)+'" y="'+(Y(v)+3).toFixed(1)+'" text-anchor="end" fill="#6b8197" font-size="10.5" font-family="Share Tech Mono,monospace">£'+(v>=1000?Math.round(v/1000)+'k':Math.round(v))+'</text>';}
  for(i=0;i<=4;i++){var m=Math.round(n*i/4);grid+='<text x="'+X(m).toFixed(1)+'" y="'+(stack?H-B+16:H-8)+'" text-anchor="'+(i===0?'start':i===4?'end':'middle')+'" fill="#6b8197" font-size="10.5" font-family="Share Tech Mono,monospace">'+(m/12).toFixed(m%12?1:0)+'y</text>';}
  // equity (scenario)
  var eq='';if(scn.opts.valuation>0){eq='M'+X(0).toFixed(1)+' '+Y(hbEquityAt(scn,0).equity).toFixed(1);for(var k=12;k<=n;k+=12)eq+=' L'+X(k).toFixed(1)+' '+Y(Math.min(top,hbEquityAt(scn,k).equity)).toFixed(1);}
  return '<svg viewBox="0 0 '+W+' '+H+'" width="100%" style="display:block;height:'+H+'px">'+grid
    +'<path d="'+path(base,'close')+'" fill="none" stroke="#8b97a3" stroke-width="1.5" stroke-dasharray="4 3"/>'
    +'<path d="'+path(scn,'close')+'" fill="none" stroke="#44c0b9" stroke-width="2.2"/>'
    +(eq?'<path d="'+eq+'" fill="none" stroke="#e8c56a" stroke-width="1.5" opacity=".85"/>':'')
    +(stack?'<g font-size="10.5" font-family="Share Tech Mono,monospace"><text x="4" y="'+(H-37)+'" fill="#8b97a3">- - balance, no extras</text><text x="4" y="'+(H-23)+'" fill="#44c0b9">– balance, your plan</text>'+(eq?'<text x="4" y="'+(H-9)+'" fill="#e8c56a">– equity (value − balance)</text>':'')+'</g></svg>'
    :'<g font-size="10.5" font-family="Share Tech Mono,monospace"><text x="'+L+'" y="'+(H-3)+'" fill="#8b97a3">- - balance, no extras</text><text x="'+(L+160)+'" y="'+(H-3)+'" fill="#44c0b9">– balance, your plan</text>'+(eq?'<text x="'+(L+310)+'" y="'+(H-3)+'" fill="#e8c56a">– equity (value − balance)</text>':'')+'</g></svg>');
}
function hbcUpdate(){
  var out=document.getElementById('hbc-out');if(!out)return;
  var c=hbcRead(),base=hbSimulate(c.base),scn=hbSimulate(c.scn),cmp=hbCompare(base,scn),r=c.raw;
  var bud=hbBudget(),u=Math.round(bud.unassigned),sv=Math.round(bud.saving);
  var pay=scn.schedule.length?scn.schedule[0].pay:0,basePay=base.schedule.length?base.schedule[0].pay:0;
  var rate0=scn.schedule.length?scn.schedule[0].rate:0;
  // cards
  var sooner=cmp.monthsSaved>0?'<span class="hbc-good">'+hbYM(cmp.monthsSaved)+' sooner</span>':(cmp.monthsSaved<0?'<span class="hbc-warn">'+hbYM(-cmp.monthsSaved)+' later</span>':'no change');
  var cards='<div class="hbc-cards">'
    +'<div class="hbc-card"><div class="l">Monthly payment</div><div class="v">'+hbMoney(pay)+'</div><div class="s">'+(Math.abs(pay-basePay)>0.5?'was '+hbMoney(basePay)+' · ':'')+'first deal @ '+rate0.toFixed(2)+'%</div></div>'
    +'<div class="hbc-card"><div class="l">Mortgage-free</div><div class="v">'+(scn.balloon>0?'–':hbFmtDate(scn.payoffDate))+'</div><div class="s">'+(scn.balloon>0?'not cleared by the end of the term':hbYM(scn.months)+' · '+sooner+' vs '+hbFmtDate(base.payoffDate))+'</div></div>'
    +'<div class="hbc-card"><div class="l">Total interest</div><div class="v">'+hbMoney(scn.totalInterest)+'</div><div class="s">'+(cmp.interestSaved>0.5?'<span class="hbc-good">saves '+hbMoney(cmp.interestSaved)+'</span> vs '+hbMoney(base.totalInterest):'vs '+hbMoney(base.totalInterest)+' with no extras')+'</div></div>'
    +'<div class="hbc-card"><div class="l">Total cost of borrowing</div><div class="v">'+hbMoney(scn.totalCost)+'</div><div class="s">interest'+(scn.ercTotal>0?' + <span class="hbc-warn">'+hbMoney(scn.ercTotal)+' ERC</span>':'')+(scn.upfront>0?' + '+hbMoney(scn.upfront)+' upfront':'')+'</div></div>'
    +'</div>';
  // equity cards
  var eqRows='';[1,5,10].forEach(function(y){var m=y*12,a=hbEquityAt(base,m),b=hbEquityAt(scn,m),ownB=a.value>0?b.equity/a.value*100:0;if(m<=Math.max(base.months,scn.months)+12)eqRows+='<tr><td>+'+y+' year'+(y>1?'s':'')+'</td><td>'+hbMoney(a.balance)+'</td><td>'+hbMoney(b.balance)+'</td><td>'+hbMoney(b.equity)+(a.value>0?' ('+ownB.toFixed(0)+'%)':'')+'</td><td class="hbc-good">'+(b.equity-a.equity>0.5?'+'+hbMoney(b.equity-a.equity):'–')+'</td></tr>';});
  var warn=(scn.warnings.length?'<div class="hbc-card hbc-warn" style="margin-bottom:10px">⚠ '+scn.warnings.slice(0,4).map(function(w){return w.replace(/</g,'&lt;');}).join('<br>⚠ ')+(scn.warnings.length>4?'<br>…and '+(scn.warnings.length-4)+' more':'')+'</div>':'');
  // presets
  var pre='<div class="hbc-pre"><button class="stk-btn" onclick="hbcPreset(\'none\')">No extras</button>'+(u>0?'<button class="stk-btn" onclick="hbcPreset(\'unassigned\')">Overpay my unassigned '+hbMoney(u)+'/mo</button>':'')+(u+sv>0&&sv>0?'<button class="stk-btn" onclick="hbcPreset(\'all\')">Unassigned + savings '+hbMoney(u+sv)+'/mo</button>':'')+'<button class="stk-btn" onclick="hbcPreset(\'offset\')">Offset my savings</button><button class="stk-btn" onclick="hbcPreset(\'step\')">Overpay + 5% yearly step-up</button></div>';
  // optimiser: what would an extra £X a month do
  var amounts=[50,100,250,500];if(u>0&&amounts.indexOf(u)<0)amounts.push(u);if(u+sv>0&&sv>0)amounts.push(u+sv);amounts=amounts.filter(function(x,i,a){return a.indexOf(x)===i;}).sort(function(x,y){return x-y;});
  var opt=amounts.map(function(x){var sc=hbSimulate(Object.assign({},c.base,{over:{monthly:x,stepUpPct:0,lumps:[],roundUp:false}}));var cm=hbCompare(base,sc);
    // alternative: same cash in a saver at r.sav% for the same months
    var N=sc.months,i=r.sav/100/12,fv=i>0?x*(Math.pow(1+i,N)-1)/i:x*N,earned=fv-x*N;
    return '<tr><td>'+hbMoney(x)+'/mo'+((x===u&&u>0)?' <span style="color:var(--t3)">(your unassigned)</span>':(x===u+sv&&sv>0?' <span style="color:var(--t3)">(unassigned + savings)</span>':''))+'</td><td>'+hbYM(cm.monthsSaved)+'</td><td class="hbc-good">'+hbMoney(cm.interestSaved)+'</td><td>'+hbMoney(earned)+'</td></tr>';}).join('');
  var rateTxt=rate0.toFixed(2),better=rate0>r.sav;
  var optHTML='<div class="hbc-card" style="margin-bottom:10px"><div class="l">What would an extra £ a month do? (overpay vs a '+r.sav+'% saver)</div><table style="margin-top:6px"><tr><th>Extra</th><th>Time saved</th><th>Interest saved</th><th>Saver would earn</th></tr>'+opt+'</table>'
    +'<div class="hbc-note">'+(better?'Your mortgage costs '+rateTxt+'%, more than a '+r.sav+'% saver pays, so overpaying is a guaranteed, tax-free return of '+rateTxt+'%. ':'A '+r.sav+'% saver pays at least as much as your '+rateTxt+'% mortgage costs, so saving can beat overpaying right now. ')+'Overpayments can’t be taken back, so build an emergency fund first, and check your lender’s limits (<b>'+r.allow+'%/yr</b> without charges).</div></div>';
  // yearly table
  var yr='';for(var y=0;y*12<scn.schedule.length&&y<40;y++){var rows=scn.schedule.slice(y*12,y*12+12),I=0,P=0,O=0;rows.forEach(function(x){I+=x.interest;P+=x.principal;O+=x.overpay;});var last=rows[rows.length-1];if(y<10||y%5===0||(y+1)*12>=scn.schedule.length)yr+='<tr><td>Year '+(y+1)+'</td><td>'+hbMoney(I)+'</td><td>'+hbMoney(P)+'</td><td>'+hbMoney(O)+'</td><td>'+hbMoney(last.close)+'</td></tr>';}
  // working
  var f=scn.schedule[0],wk='';
  if(f){var rr=f.rate/100;
    wk='<details style="margin-top:10px"><summary>Show working</summary><div style="display:block;font-size:11px;line-height:1.7;color:var(--t2)">'
     +'<b>Payment</b> (repayment mortgage) = B·r ÷ (1 − (1+r)<sup>−n</sup>), with B = '+hbMoney(scn.opts.loan)+', r = '+f.rate.toFixed(2)+'% ÷ 12 = '+(rr/12*100).toFixed(4)+'% a month, n = '+scn.opts.termMonths+' months → <b>'+hbMoney(hbPmt(scn.opts.loan,rr/12,scn.opts.termMonths))+'</b>.<br>'
     +'<b>Interest for month 1</b> ('+({daily:'daily method',monthly:'monthly method',annual:'annual-rest method'}[scn.opts.interestMode])+'): '+(scn.opts.interestMode==='daily'?'balance × '+f.rate.toFixed(2)+'% ÷ '+(f.date.slice(0,4)%4===0?366:365)+' × days in the month':'balance × '+f.rate.toFixed(2)+'% ÷ 12')+' = <b>'+hbMoney(f.interest)+'</b>; the rest of your payment ('+hbMoney(f.pay-f.interest)+') repays capital.<br>'
     +'<b>Why overpaying works:</b> every £ you repay stops earning interest from that day, and the saving compounds for the rest of the term.<br>'
     +'<b>Assumptions:</b> rates after the first deal as entered; payments on time; no changes to your lender’s rules. Not advice. Check your offer document.</div></details>';}
  out.innerHTML=pre+cards+warn+'<div class="hbc-chart">'+hbcChart(base,scn,c.common)+'</div>'
    +(eqRows?'<div class="hbc-card" style="margin-bottom:10px"><div class="l">Equity: what you own'+(r.growth?' (value growing '+r.growth+'%/yr)':'')+'</div><table style="margin-top:6px"><tr><th></th><th>Balance, no extras</th><th>Balance, your plan</th><th>Equity, your plan</th><th>Extra equity</th></tr>'+eqRows+'</table></div>':'')
    +optHTML
    +'<div class="hbc-card"><div class="l">Year by year (your plan)</div><div style="overflow-x:auto"><table style="margin-top:6px"><tr><th></th><th>Interest</th><th>Capital</th><th>Overpaid</th><th>Balance</th></tr>'+yr+'</table></div></div>'
    +wk
    +'<div class="hbc-note">Illustrative only. Not financial advice or a mortgage offer. Lender terms, rates, early repayment charges and your circumstances will differ. Check your offer document or speak to an independent adviser (e.g. MoneyHelper).</div>';
  window._hbcLast={base:base,scn:scn,cmp:cmp};
}

(function(){
  var _r=redraw;redraw=function(){_r.apply(this,arguments);try{hbWriteStats();}catch(e){}};
  var _u=updateUI;updateUI=function(){_u.apply(this,arguments);try{hbRenderLevels();hbRenderHUD();}catch(e){console.error('[Vault-It] hbRender',e);}};
})();

