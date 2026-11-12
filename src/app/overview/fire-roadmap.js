// ── FIRE ROADMAP ──────────────────────────────────────────────
// Sequential: a stage counts once every stage before it is achieved (or skipped), so a new user always starts at stage 1 and
// the journey reads left → right. Because one stuck stage freezes everything after it, every stage (a) says what it is
// waiting for, (b) says when later stages are already met and which stage is holding them, (c) can be completed with the
// user's own confirmation where the app can't see the facts, and (d) can be skipped when it genuinely doesn't apply.
function fireMan(k){return !!(ovState.manual&&ovState.manual[k]);}
function fireSkipped(k){return !!(ovState.skipped&&ovState.skipped[k]);}
function fireIsConsumerDebt(d){return !!d&&d.type!=='mortgage'&&d.type!=='student';}   // “Debt Free” = no consumer debt (cards, loans, car finance…)
function fireNwhPoints(){try{var d=nwhLoad();return d&&d.points?d.points.length:0;}catch(e){return 0;}}
// People who listed debts before the “I’ve mapped every debt” tick existed keep that stage: a debt created before this date
// (its id is its creation time) counts as confirmed until the user ticks/unticks it themselves. Read-only: nothing is written.
var FIRE_TICK_SINCE=1792627200000;   // 2026-10-22 00:00 UTC
function fireDebtsConfirmed(){
  var v=ovState.manual&&ovState.manual.debtsMapped;
  if(v!==undefined)return !!v;
  return (debtState.debts||[]).some(function(d){return +d.id>0&&+d.id<FIRE_TICK_SINCE;});
}
function fireBuildStages(){
  var nw=computeNetWorth();
  var _vu={};try{_vu=JSON.parse(localStorage.getItem('vi_user')||'{}')||{};}catch(e){}
  var annualExp=cfTotalOut()*12||((+_vu.expenses||0)*12)||24000;
  var cashSaved=alTotalCash()+(state?state.saved:0);
  var debts=debtState.debts||[];
  // a debt that never had an “original” amount can’t show progress (balance falls, original falls with it): stamp it once
  var stamped=false;debts.forEach(function(d){if(!(d.original>0)&&d.balance>0){d.original=d.balance;stamped=true;}});
  if(stamped&&typeof saveDebtState==='function')setTimeout(saveDebtState,0);
  var consumer=debts.filter(fireIsConsumerDebt);
  var cTotal=consumer.reduce(function(s,d){return s+(+d.balance||0);},0);
  var cOrig=consumer.reduce(function(s,d){return s+(d.original||d.balance||0);},0);
  var libs=(alState.liabilities||[]).length;
  var noDebt=debts.length===0&&fireMan('noDebt');
  var mapped=(debts.length>0||libs>0)&&fireDebtsConfirmed();
  var debtsDone=noDebt||mapped;
  var nothingToCut=debtsDone&&consumer.length===0;            // only a mortgage / student loan: there is no consumer debt to cut
  var cleared=cOrig>0?Math.max(0,Math.min(1,1-cTotal/cOrig)):((nothingToCut||noDebt)?1:0);
  var hasState=typeof state!=='undefined'&&state;
  var owned=!!(hasState&&state.houseMode==='purchased');      // already own a home: the “saving for a deposit / buying” stages are moot
  var dep=hasState&&state.target>0?pct():0;
  var snaps=(ovState.snapshots||[]).length+fireNwhPoints();   // net-worth history entered in the history wizard counts too
  var bud=null;try{bud=bdState();}catch(e){}
  function ratio(v,t){return t>0?Math.max(0,Math.min(1,v/t)):0;}
  function money(v){return gbpFmt(Math.max(0,v));}
  var GO_AL={lbl:'Open Assets & Liabilities',fn:"fireGo('assets')"},GO_HB={lbl:'Open House Builder',fn:"fireGo('house')"},GO_DEBT={lbl:'Open Debt Tracker',fn:"fireGo('debt')"},GO_BUD={lbl:'Open Budget',fn:"fireGo('budget')"};
  function nwStage(key,phase,ic,name,desc,col,target){
    return {key:key,phase:phase,ic:ic,name:name,desc:desc,col:col,check:function(){return nw>=target();},prog:function(){return ratio(nw,target());},cur:function(){return nw;},target:target(),
      why:function(){return['Your net worth is '+gbpFmt(nw)+'. This needs '+gbpFmt(target())+'. It rises as you save, invest and pay debts down.'];},acts:[GO_AL]};
  }
  function cashStage(key,phase,ic,name,desc,col,target){
    return {key:key,phase:phase,ic:ic,name:name,desc:desc,col:col,check:function(){return cashSaved>=target;},prog:function(){return ratio(cashSaved,target);},cur:function(){return cashSaved;},target:target,
      why:function(){return[gbpFmt(cashSaved)+' of '+gbpFmt(target)+' in cash & savings (accounts in Assets & Liabilities plus your house deposit pot).'];},acts:[GO_AL]};
  }
  var S=[
    // P1 Foundation
    {key:'firstLog',phase:0,ic:'snapshot',name:'First Log',desc:'Net worth snapshot',col:'#44c0b9',check:function(){return snaps>=1;},
      why:function(){return['No net worth snapshot saved yet. The button below records today’s figure in one tap. You can add more any time from the Net Worth chart.'];},
      acts:[{lbl:'Record my net worth now',fn:'fireLogSnapshot()'}],
      hint:'Use “Add Data Point” on the Net Worth chart to record your first snapshot.'},
    {key:'mapDebts',phase:0,ic:'map',name:'Map Debts',desc:'List every debt',col:'#44c0b9',check:function(){return debtsDone;},
      confirms:(debts.length>0||libs>0)?[{k:'debtsMapped',lbl:'I’ve mapped every debt I owe',sub:'Tick when your list is complete. This is what unlocks the next stage.'}]:[{k:'noDebt',lbl:'I don’t have any debts',sub:'Tick if you owe nothing on cards, loans, car finance or overdrafts.'}],
      why:function(){
        if(!debts.length&&!libs)return['No debts are listed in the Debt Tracker. Add each one (card, loan, car finance, overdraft…), or tick “I don’t have any debts”.'];
        if(!debts.length)return['You have liabilities in Assets & Liabilities but nothing in the Debt Tracker. Add your cards and loans there, then tick “I’ve mapped every debt I owe”.'];
        return['You’ve listed '+debts.length+' debt'+(debts.length>1?'s':'')+' ('+gbpFmt(debtTotal())+'). Tick “I’ve mapped every debt I owe” once the list is complete. Nothing else is needed.'];},
      acts:[GO_DEBT],hint:'Add each debt separately (type, balance, interest rate, minimum payment) in the Debt Tracker, then confirm the list is complete.'},
    {key:'zeroBudget',phase:0,ic:'flow',name:'Zero Budget',desc:'Every £ given a job',col:'#44c0b9',check:function(){return !!bud&&bud.m.tIn>0&&(ovState.expenses||[]).length>0&&bud.st==='zero';},
      prog:function(){return bud&&bud.m.tIn>0?Math.max(0,Math.min(1,bud.assigned/bud.m.tIn)):0;},
      why:function(){var w=[];
        if(!bud||!(bud.m.tIn>0))w.push('Add your monthly income in the Budget tab.');
        if(!(ovState.expenses||[]).length)w.push('Add at least one spending, saving or investing line.');
        if(bud&&bud.m.tIn>0&&(ovState.expenses||[]).length){if(bud.st==='under')w.push(money(bud.left)+' is still left to assign. Give it a job (spending, saving or investing).');else if(bud.st==='over')w.push('You’ve assigned '+money(-bud.left)+' more than you earn. Trim a line.');}
        return w.length?w:['Almost there. Recheck the Budget tab.'];},
      acts:[GO_BUD],hint:'Open the Budget tab: add your income, then assign every pound until “left to assign” hits £0.'},
    {key:'firstSaved',phase:0,ic:'coin',name:'First £ Saved',desc:'Cash balance ≥ £1',col:'#44c0b9',check:function(){return cashSaved>=1;},
      why:function(){return['No cash balance yet. Add a savings or current account in Assets & Liabilities (or log a deposit in the House Builder).'];},acts:[GO_AL],
      hint:'Add a cash or savings account in Assets & Liabilities.'},
    // P2 Stabilise
    cashStage('buf500',1,'shield','£500 Buffer','Emergency starter','#c9a84c',500),
    cashStage('buf1k',1,'shieldCheck','£1k Buffer','Emergency fund','#c9a84c',1000),
    {key:'firstCut',phase:1,ic:'scissors',name:'First Debt Cut',desc:'One debt cleared',col:'#e05c5c',
      check:function(){return noDebt||nothingToCut||debts.some(function(d){return d.balance<=0&&(d.original||0)>0;});},
      prog:function(){return(noDebt||nothingToCut)?1:(debts.length?Math.max.apply(null,debts.map(function(d){return d.original>0?Math.max(0,Math.min(1,1-d.balance/d.original)):0;})):0);},
      why:function(){return(debts.length?['No debt has reached £0 yet. Clear your smallest balance first, then set its balance to £0 in the Debt Tracker.']:['Map your debts first. There is nothing to clear yet.']);},acts:[GO_DEBT]},
    {key:'debtHalf',phase:1,ic:'halfPie',name:'Debt Halved',desc:'50% cleared',col:'#e0894a',check:function(){return noDebt||nothingToCut||(cOrig>0&&cTotal<=cOrig*0.5);},prog:function(){return(noDebt||nothingToCut)?1:Math.min(1,cleared/0.5);},
      why:function(){return[Math.round(cleared*100)+'% of your consumer debt is cleared. This needs 50%. (Student loans and mortgages aren’t counted.)'];},acts:[GO_DEBT]},
    nwStage('nw1k',1,'gem','£1k Net Worth','NW ≥ £1,000','#44c0b9',function(){return 1000;}),
    {key:'debtFree',phase:1,ic:'unlock',name:'Debt Free',desc:'Zero consumer debt',col:'#3ecf8e',check:function(){return noDebt||nothingToCut||(consumer.length>0&&cTotal<=0);},prog:function(){return(noDebt||nothingToCut)?1:cleared;},
      why:function(){return['You still owe '+gbpFmt(cTotal)+' across '+consumer.filter(function(d){return d.balance>0;}).length+' consumer debt(s). Student loans and mortgages aren’t counted here.'];},acts:[GO_DEBT]},
    // P3 Save
    cashStage('ef3',2,'umbrella','3-Month EF','3 months expenses','#c9a84c',annualExp/4),
    cashStage('ef6',2,'safe','6-Month EF','Fully buffered','#c9a84c',annualExp/2),
    {key:'isa',phase:2,ic:'sprout',name:'ISA Opened',desc:'ISA or LISA open',col:'#9b7ec8',check:function(){
        var cash=(alState.cashAccounts||[]).some(function(c){var t=(c.type||c.name||'').toUpperCase();return /\bL?ISA\b/.test(t);});
        var pies=(alState.stockPies||[]).some(function(p){return /\bL?ISA\b/i.test(p.name||'');});
        return cash||pies;},
      why:function(){return['No ISA or LISA found. Add an ISA cash account, or name a Stocks & Funds pie “ISA”. (Not eligible or not interested? You can skip this stage.)'];},acts:[GO_AL],
      hint:'Add an ISA / LISA cash account, or name a Stocks & Funds pie “ISA”.'},
    {key:'dep1',phase:2,ic:'foundation',name:'1% Deposit',desc:'1% of target saved',col:'#e8c56a',check:function(){return owned||(hasState&&state.target>0&&state.saved>=state.target*0.01);},prog:function(){return owned?1:ratio(dep,0.01);},
      why:function(){return(hasState&&state.target>0)?[gbpFmt(state.saved||0)+' of '+gbpFmt(state.target*0.01)+' saved towards your house.']:['No house target set. Set one in the House Builder, or skip this stage if you aren’t buying.'];},acts:[GO_HB]},
    {key:'dep5',phase:2,ic:'bricks',name:'5% Deposit',desc:'5% of target',col:'#e8c56a',check:function(){return owned||(hasState&&state.target>0&&state.saved>=state.target*0.05);},prog:function(){return owned?1:ratio(dep,0.05);},
      why:function(){return(hasState&&state.target>0)?[gbpFmt(state.saved||0)+' of '+gbpFmt(state.target*0.05)+' saved towards your house.']:['No house target set. Set one in the House Builder, or skip this stage if you aren’t buying.'];},acts:[GO_HB]},
    nwStage('nw5k',2,'gem2','£5k Net Worth','NW ≥ £5,000','#44c0b9',function(){return 5000;}),
    // P4 Buy
    {key:'depReady',phase:3,ic:'house',name:'Deposit Ready',desc:'Full deposit saved',col:'#9b7ec8',check:function(){return owned||(hasState&&state.target>0&&pct()>=1);},prog:function(){return owned?1:dep;},
      why:function(){return(hasState&&state.target>0)?[Math.round(dep*100)+'% of your '+state.depositPct+'% deposit ('+gbpFmt(depositTarget())+') is saved.']:['No house target set. Set one in the House Builder, or skip this stage if you aren’t buying.'];},acts:[GO_HB]},
    nwStage('nw10k',3,'coins','£10k Net Worth','NW ≥ £10,000','#44c0b9',function(){return 10000;}),
    {key:'applied',phase:3,ic:'doc',name:'Applied',desc:'Mortgage application',col:'#9b7ec8',check:function(){return owned||fireMan('applied');},confirms:[{k:'applied',lbl:'My mortgage application has been submitted'}],
      why:function(){return['Tick when you’ve submitted your mortgage application. Not buying? Skip this stage.'];}},
    {key:'exchanged',phase:3,ic:'exchange',name:'Exchanged',desc:'Contracts signed',col:'#9b7ec8',check:function(){return owned||fireMan('exchanged');},confirms:[{k:'exchanged',lbl:'Contracts have been exchanged'}],
      why:function(){return['Tick when contracts are exchanged. Not buying? Skip this stage.'];}},
    {key:'keys',phase:3,ic:'key',name:'Keys!',desc:'Property owned',col:'#3ecf8e',check:function(){return owned||fireMan('keys');},confirms:[{k:'keys',lbl:'I have the keys'}],
      why:function(){return['Press “House Purchased” in the House Builder once your deposit goal is met, or tick “I have the keys”.'];},acts:[GO_HB],
      hint:'Press “House Purchased” in the House Builder once your deposit goal is met.'},
    // P5 Own
    nwStage('nw25k',4,'bars','£25k','NW ≥ £25,000','#44c0b9',function(){return 25000;}),
    nwStage('nw50k',4,'barsUp','£50k','NW ≥ £50,000','#44c0b9',function(){return 50000;}),
    {key:'nw100k',phase:4,ic:'medal',name:'£100k',desc:'Six figures',col:'#c9a84c',check:function(){return nw>=100000;},prog:function(){return ratio(nw,100000);},cur:function(){return nw;},target:100000,why:function(){return['Your net worth is '+gbpFmt(nw)+'. This needs '+gbpFmt(100000)+'.'];},acts:[GO_AL]},
    {key:'coastFI',phase:4,ic:'sail',name:'Coast FI',desc:'12.5× exp invested',col:'#3ecf8e',check:function(){return nw>=annualExp*12.5;},prog:function(){return ratio(nw,annualExp*12.5);},cur:function(){return nw;},target:annualExp*12.5,why:function(){return['Your net worth is '+gbpFmt(nw)+'. This needs 12.5× a year of spending ('+gbpFmt(annualExp*12.5)+').'];},acts:[GO_AL]},
    {key:'mortFree',phase:4,ic:'houseSolid',name:'Mortgage Free',desc:'Outright ownership',col:'#e8c56a',check:function(){return (owned&&(state.mortgageBalance||0)<=0)||fireMan('mortgageFree');},confirms:[{k:'mortgageFree',lbl:'My mortgage is paid off'}],
      why:function(){return['Pay the mortgage balance down to £0 in the House Builder, or tick “My mortgage is paid off”. No mortgage at all? Skip this stage.'];},acts:[GO_HB]},
    // P6 Free
    {key:'nw250k',phase:5,ic:'mountain',name:'£250k',desc:'Quarter million',col:'#c9a84c',check:function(){return nw>=250000;},prog:function(){return ratio(nw,250000);},cur:function(){return nw;},target:250000,why:function(){return['Your net worth is '+gbpFmt(nw)+'. This needs '+gbpFmt(250000)+'.'];},acts:[GO_AL]},
    {key:'fullFI',phase:5,ic:'flame',name:'Full FI',desc:'25× expenses invested',col:'#3ecf8e',check:function(){return nw>=annualExp*25;},prog:function(){return ratio(nw,annualExp*25);},cur:function(){return nw;},target:annualExp*25,why:function(){return['Your net worth is '+gbpFmt(nw)+'. This needs 25× a year of spending ('+gbpFmt(annualExp*25)+').'];},acts:[GO_AL]},
    {key:'fatFIRE',phase:5,ic:'flame2',name:'Fat FIRE',desc:'33× expenses',col:'#c9a84c',check:function(){return nw>=annualExp*33;},prog:function(){return ratio(nw,annualExp*33);},cur:function(){return nw;},target:annualExp*33,why:function(){return['Your net worth is '+gbpFmt(nw)+'. This needs 33× a year of spending ('+gbpFmt(annualExp*33)+').'];},acts:[GO_AL]},
    {key:'legacy',phase:5,ic:'tree',name:'Legacy',desc:'50×, next gen',col:'#c9a84c',check:function(){return nw>=annualExp*50;},prog:function(){return ratio(nw,annualExp*50);},cur:function(){return nw;},target:annualExp*50,why:function(){return['Your net worth is '+gbpFmt(nw)+'. This needs 50× a year of spending ('+gbpFmt(annualExp*50)+').'];},acts:[GO_AL]}
  ];
  /* 20 more achievements (owner, 4 Nov round 2, R8: "Add more achievements to each section that will help inform the user when they
     have done something worthy of recognition. 50 in total. Front load the majority in Foundation, stabilise and save"). Each one reads
     data the user has entered; they sit in their section, count the moment they are met, and never hold up the 30 linear stages, so
     nobody's current stage moves. `before`: the linear stage each one is drawn in front of. */
  var pays=debts.reduce(function(n,d){return n+((d.payments||[]).length);},0);
  var held=(alState.cashAccounts||[]).length+(alState.stocks||[]).length+(alState.crypto||[]).length+(alState.otherAssets||[]).length
    +['gold','silver','platinum','palladium'].filter(function(k){return +((alState.metals||{})[k])>0;}).length;
  var invested=0;try{invested=alTotalStocks()+alTotalCrypto()+alTotalMetals();}catch(e){}
  var budMonths=0;try{var _wm=wrState().m;for(var _k in _wm)if(_wm[_k]&&_wm[_k].bud)budMonths++;}catch(e){}
  var useDays=0;try{useDays=wrState().days||0;}catch(e){}
  function bonus(before,key,ic,name,desc,long,check,why,acts,prog){return {before:before,bonus:true,key:key,ic:ic,name:name,desc:desc,long:long,check:check,why:function(){return [why];},acts:acts,prog:prog};}
  function bNw(before,key,name,v){var o=nwStage(key,0,'gem',name,'NW ≥ '+gbpFmt(v),'#44c0b9',function(){return v;});o.before=before;o.bonus=true;o.long='Net worth reaches '+gbpFmt(v)+'.';return o;}
  function bCash(before,key,name,desc,v,long){var o=cashStage(key,0,'coin',name,desc,'#44c0b9',v);o.before=before;o.bonus=true;o.long=long;return o;}
  var B=[
    bonus('mapDebts','profile','user','Profile Set','Money profile filled in','Your saving and spending profile is filled in.',function(){return !!(_vu.name&&(_vu.saveArch||_vu.spendArch||_vu.dream));},'Answer the profile questions (name, saving and spending style) in your profile.',[]),
    bonus('mapDebts','history','forecast','History In','Past net worth added','You added your past net worth, so the chart shows where you started.',function(){return fireNwhPoints()>0;},'Add past figures with the net worth history wizard on the Overview chart.',[]),
    bonus('zeroBudget','incomeIn','flow','Income In','Monthly income added','Your monthly income is in the Budget.',function(){return cfTotalIn()>0;},'Add what comes in each month in the Budget tab.',[GO_BUD]),
    bonus('zeroBudget','spendMap','flow','Spending In','5 spending lines','Five or more spending, saving or investing lines are in your Budget.',function(){return (ovState.expenses||[]).length>=5;},(ovState.expenses||[]).length+' of 5 budget lines listed so far.',[GO_BUD],function(){return Math.min(1,(ovState.expenses||[]).length/5);}),
    bonus('firstSaved','savingLine','coin','Saving Set','A saving line set','Your Budget has a saving or investing line.',function(){return !!bud&&bud.m.growth>0;},'Add a saving or investing line in the Budget tab.',[GO_BUD]),
    bonus('firstSaved','assets3','gem','3 Assets','3 assets listed','Three or more accounts or holdings are listed in Assets.',function(){return held>=3;},held+' of 3 accounts or holdings listed so far.',[GO_AL],function(){return Math.min(1,held/3);}),
    bonus('firstSaved','week1','snapshot','First Week','Used on 7 days','You opened Vault-It on 7 different days.',function(){return useDays>=7;},useDays+' of 7 days so far.',[],function(){return Math.min(1,useDays/7);}),
    bCash('buf500','buf250','£250 Buffer','First buffer',250,'£250 in cash and savings.'),
    bonus('firstCut','firstPay','scissors','1st Payment','First payment logged','You logged a payment against a debt in the Debt Tracker.',function(){return pays>0;},'Log a payment on any debt in the Debt Tracker.',[GO_DEBT]),
    bonus('debtHalf','debt25','halfPie','Quarter Cut','25% cleared','A quarter of your consumer debt is cleared.',function(){return noDebt||nothingToCut||(cOrig>0&&cTotal<=cOrig*0.75);},Math.round(cleared*100)+'% of your consumer debt is cleared. This needs 25%.',[GO_DEBT],function(){return(noDebt||nothingToCut)?1:Math.min(1,cleared/0.25);}),
    bonus('nw1k','pay6','scissors','6 Payments','6 payments logged','Six debt payments are logged in the Debt Tracker.',function(){return pays>=6;},pays+' of 6 payments logged so far.',[GO_DEBT],function(){return Math.min(1,pays/6);}),
    bonus('debtFree','surplus','flow','Surplus','Income above spending','Your Budget shows more coming in each month than going out on spending.',function(){return !!bud&&bud.m.tIn>0&&(ovState.expenses||[]).length>0&&bud.m.tIn>bud.m.spend;},'Your Budget shows spending at or above your income.',[GO_BUD]),
    bCash('ef3','ef1','1-Month EF','1 month expenses',annualExp/12,'One month of spending in cash and savings.'),
    bonus('dep1','invest','bars','Invested','Stocks, crypto or metals','You hold stocks, funds, crypto or precious metals.',function(){return invested>0;},'Add a holding in Stocks & Funds, Crypto or Metals in Assets & Liabilities.',[GO_AL]),
    bonus('dep1','firstDep','foundation','Pot Started','House pot started','The first money is in your house deposit pot.',function(){return owned||(hasState&&(+state.saved||0)>0);},'Log a deposit in the House Builder.',[GO_HB]),
    bonus('nw5k','bud3','flow','3 Budgets','Budget kept 3 months','Income and spending were filled in for three different months.',function(){return budMonths>=3;},budMonths+' of 3 months so far.',[GO_BUD],function(){return Math.min(1,budMonths/3);}),
    bNw('nw5k','nw2500','£2.5k Net Worth',2500),
    bonus('depReady','dep75','house','75% Deposit','75% of deposit','Three quarters of your deposit is saved.',function(){return owned||(hasState&&state.target>0&&dep>=0.75);},Math.round(dep*100)+'% of your deposit is saved. This needs 75%.',[GO_HB],function(){return owned?1:Math.min(1,dep/0.75);}),
    bNw('nw100k','nw75k','£75k',75000),
    bNw('fullFI','nw500k','£500k',500000)
  ];
  // place each one in front of its linear stage, in its section
  var _all=[];S.forEach(function(s,i){s.no=i+1;B.forEach(function(b){if(b.before===s.key){b.phase=s.phase;b.col='#44c0b9';_all.push(b);}});_all.push(s);});
  S=_all;
  // the last slate in each section is its gold graduation slate (R7)
  FIRE_PHASES.forEach(function(_,pi){var l=-1;S.forEach(function(s,i){if(s.phase===pi)l=i;});if(l>=0)S[l].grad=true;});
  // sub-milestones (owner, 3 Nov: "a clear linear step by step progression with sub milestones for each achievement"): stages with a
  // target step at 30%, 60% and 100% of it; stages the app can partly measure get their own steps; a confirm-only stage is one step
  var anyListed=nw!==0||cashSaved>0||debts.length>0||libs>0||(alState.cashAccounts||[]).length>0;
  var STEPS={
    firstLog:[['First figure added',function(){return anyListed;}],['Snapshot saved',null]],
    mapDebts:[['First debt listed, or no debts ticked',function(){return debts.length>0||libs>0||noDebt;}],['List confirmed',null]],
    zeroBudget:[['Income added',function(){return !!bud&&bud.m.tIn>0;}],['Spending listed',function(){return (ovState.expenses||[]).length>0;}],['Every pound given a job',null]],
    firstSaved:[['Account added',function(){return (alState.cashAccounts||[]).length>0||(hasState&&state.target>0);}],['First £1 saved',null]]
  };
  // sequential evaluation: a stage unlocks when everything before it is achieved or skipped
  var run=true,current=-1;
  S.forEach(function(s,i){
    s.idx=i;
    s.raw=!!s.check();                       // the requirement itself is met (whether or not the stage is unlocked yet)
    if(s.bonus){s.done=s.raw;s.skip=false;s.skipPass=false;return;}   // a round 2 achievement: counts when met, holds nothing up
    s.skip=fireSkipped(s.key);
    s.skipPass=false;
    if(run&&s.raw){s.done=true;current=i;}
    else if(run&&s.skip){s.done=false;s.skipPass=true;}      // passed over by the user’s choice: not “achieved”, but it doesn’t hold anything up
    else{s.done=false;run=false;}
  });
  S.forEach(function(s){
    var c=STEPS[s.key],p=0;
    if(c)s.steps=c.map(function(x){return {lbl:x[0],met:x[1]?!!x[1]():s.raw};});
    else if(s.prog){p=Math.max(0,Math.min(1,s.prog()||0));s.steps=[.3,.6,1].map(function(f){return {lbl:fireStepLbl(s,f),met:f<1?p>=f-1e-9:s.raw};});}
    else s.steps=[{lbl:s.desc,met:s.raw}];
    if(s.done)s.steps.forEach(function(x){x.met=true;});
  });
  S.currentIdx=current;
  S.nextIdx=-1;for(var i=0;i<S.length;i++){if(!S[i].bonus&&!S[i].done&&!S[i].skipPass){S.nextIdx=i;break;}}
  S.doneCount=S.filter(function(s){return !s.bonus&&s.done;}).length;   // the 30 linear stages
  S.bonusDone=S.filter(function(s){return s.bonus&&s.done;}).length;    // the 20 round 2 achievements
  S.spineLen=S.filter(function(s){return !s.bonus;}).length;
  S.skipCount=S.filter(function(s){return s.skipPass;}).length;
  S.passedIdx=S.nextIdx<0?S.length-1:S.nextIdx-1;            // rail is solid up to the last stage that was passed
  S.waiting=S.nextIdx<0?[]:S.filter(function(s,i){return i>S.nextIdx&&!s.bonus&&s.raw;});   // later stages already met, held back by the next-up stage
  return S;
}
// a sub-milestone's label: money where the stage has a target, otherwise how far along it is
function fireStepLbl(s,f){
  if(typeof s.target==='number'&&s.target>0)return gbpFmt(Math.round(s.target*f/10)*10)+(f<1?' of '+gbpFmt(Math.round(s.target)):' reached');
  if(s.key==='debtHalf')return Math.round(f*50)+'% of consumer debt cleared';
  if(s.key==='firstCut')return f<1?Math.round(f*100)+'% of one debt paid off':'One debt at £0';
  return f<1?Math.round(f*100)+'% of the way':s.desc;
}
// Draw a stage icon (duo-tone) centred on cx,cy
function fireIcon(key,cx,cy,size,col,strokeOp,fillOp){
  var ic=FIRE_ICONS[key]||FIRE_ICONS.gem,sc=size/24;
  var f=ic.f.map(function(d){return '<path d="'+d+'"/>';}).join('');
  var d=ic.d.map(function(d){return '<path d="'+d+'"/>';}).join('');
  return '<g transform="translate('+(cx-size/2).toFixed(1)+' '+(cy-size/2).toFixed(1)+') scale('+sc.toFixed(3)+')" style="pointer-events:none">'
    +'<g fill="'+col+'" fill-opacity="'+(ic.solid?Math.min(.75,fillOp*3):fillOp)+'" stroke="none">'+f+'</g>'
    +'<g fill="none" stroke="'+col+'" stroke-opacity="'+strokeOp+'" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'+d+'</g></g>';
}
function fireScrollTo(idx){
  var sc=document.getElementById('fire-timeline-scroll');if(!sc)return;
  var left=Math.max(0,idx*FIRE_NODE+FIRE_LEFT-sc.offsetWidth/2);
  sc.scrollTo?sc.scrollTo({left:left,behavior:'smooth'}):(sc.scrollLeft=left);
}
function fireJumpToCurrent(){
  var S=renderFIREroadmap._stages||[];
  if(!S.length)return;
  var idx=S.nextIdx>=0?S.nextIdx:S.length-1;
  fireScrollTo(idx);
  fireShowDetail(idx);
}
// The timeline is drawn as a WINDOW: only the stages on screen (plus a buffer) exist in the SVG, which sits at its place in a wide
// scrolling track. The old version drew all 30 stages in one 3,360px-wide SVG with blur filters and endless animations; on a
// high-density phone screen that was millions of pixels to repaint, and it showed up half-drawn.
function renderFIREroadmap(){
  var svgEl=document.getElementById('fire-roadmap-svg'),track=document.getElementById('fire-track'),SC=document.getElementById('fire-timeline-scroll');
  if(!svgEl)return;
  var phases=FIRE_PHASES;
  var stages=fireBuildStages();
  renderFIREroadmap._stages=stages;
  try{wrSync(stages);}catch(e){}
  var nextIdx=stages.nextIdx;
  var doneCount=stages.doneCount,skipCount=stages.skipCount;

  // header: where you are + the blocker banner (these work even while the SVG itself is off-screen)
  var focus=stages[nextIdx>=0?nextIdx:stages.length-1];
  var lbl=document.getElementById('fire-current-label');
  if(lbl){
    var ph=phases[focus.phase];
    lbl.textContent=(nextIdx>=0?'STAGE '+focus.no+'/'+stages.spineLen+' · ':'COMPLETE · ')+ph.label;
    lbl.style.color=viDay(ph.col);lbl.style.borderColor=viDay(ph.col+'44');lbl.style.background=viDay(ph.col+'11');
  }
  var pt=document.getElementById('fire-progress-txt');
  if(pt)pt.textContent=(doneCount+stages.bonusDone)+' of '+stages.length+' achieved'+(skipCount?' · '+skipCount+' skipped':'');
  var ns=document.getElementById('fire-next-step');
  if(ns){var nxS=nextIdx>=0?stages[nextIdx]:null,sts=nxS?nxS.steps||[]:[],nj=sts.findIndex(function(x){return !x.met;});
    ns.innerHTML=nxS?'<b>Next step</b> '+nxS.name+': '+(sts[nj<0?sts.length-1:nj]||{lbl:nxS.desc}).lbl+' <span>+'+wrStepXp(nxS.key,sts.length)+' XP</span>':'<b>Every stage done.</b> Your roadmap is complete.';}
  if(_fireDetailIdx>=0&&document.getElementById('fire-detail-panel')&&document.getElementById('fire-detail-panel').style.display!=='none')fireShowDetail(_fireDetailIdx,{keepAsk:true});

  var containerW=SC?SC.clientWidth:0;
  if(!SC||!track||!(containerW>0))return;                       // tab not on screen yet: drawn when it is shown
  var NODE_SPACING=FIRE_NODE,NODE_R=22,LEFT=FIRE_LEFT,H=FIRE_H,LINE_Y=148;
  var TOTAL_W=Math.max(containerW,stages.length*NODE_SPACING+120);
  track.style.width=TOTAL_W+'px';track.style.height=H+'px';
  // Always open at stage one; afterwards keep wherever the user has scrolled to
  if(_fireFirstPaint||renderFIREroadmap._cIdx!==nextIdx){SC.scrollLeft=Math.max(0,(nextIdx>=0?nextIdx:0)*NODE_SPACING+LEFT-containerW/2);_fireFirstPaint=false;renderFIREroadmap._cIdx=nextIdx;}   // open on the stage to work on, centred, with no scroll animation: on a fresh load, each time the tab opens, and when late data moves the next stage (owner, 1 Nov, E2)
  var sl=SC.scrollLeft,buf=Math.max(containerW*0.75,NODE_SPACING*3);
  var x0=Math.max(0,Math.floor((sl-buf)/NODE_SPACING)*NODE_SPACING),x1=Math.min(TOTAL_W,Math.ceil((sl+containerW+buf)/NODE_SPACING)*NODE_SPACING);
  var i0=Math.max(0,Math.floor((x0-LEFT)/NODE_SPACING)-1),i1=Math.min(stages.length-1,Math.ceil((x1-LEFT)/NODE_SPACING)+1);

  var phaseSpans=phases.map(function(p,pi){
    var idxs=stages.map(function(s,i){return s.phase===pi?i:-1;}).filter(function(x){return x>=0;});
    return{x0:idxs[0]*NODE_SPACING+LEFT-NODE_SPACING/2,x1:idxs[idxs.length-1]*NODE_SPACING+LEFT+NODE_SPACING/2,col:p.col,label:p.label,
      done:idxs.every(function(i){return stages[i].done||stages[i].skipPass;})};
  });

  /* ground plane (owner, 3 Nov round 2: "a steeper perspective so the ground plane takes up less space ... the grid perspective ground
     line ... achievement icons lifted higher above that ground plane"): a thin strip at the foot (its grid is #fire-ground, which stays
     put while the track scrolls); the path runs on the ground and each token floats above it on a light beam with its shadow below */
  /* v0.9.1 round 2 (owner, 4 Nov, R3 and R6, with a red sketch): a wider, flatter ground plane that starts right under the slates
     (#fire-ground, FIRE_GH tall), and section dividers on it that lean with its perspective (fireCarousel sets their near end). The
     tokens keep their height: they still float clear of their shadows */
  var GY=H-56,PATH_Y=GY+14,GT=H-FIRE_GH,out='<rect x="'+x0+'" y="0" width="'+(x1-x0)+'" height="'+GT+'" fill="#030810" opacity=".6"/>';   // the stage behind the tokens (paper in Daylight)
  phaseSpans.forEach(function(sp,pi){
    var a=Math.max(x0,sp.x0),b=Math.min(x1,sp.x1);
    if(b<=a)return;
    if(pi>0&&sp.x0>=x0&&sp.x0<=x1)out+='<line class="fire-div" x1="'+sp.x0+'" y1="'+GT+'" x2="'+sp.x0+'" y2="'+H+'" stroke="'+sp.col+'" stroke-width="1.2" opacity="0.6" stroke-dasharray="4 3"/>';
    // C3 (owner, 4 Nov: "change to a wider version of the font and project the text for these stages across the ground plane in perspective"):
    // the section name is painted on the ground: big Syne lettering, stretched wide, squashed in depth and leaning with the grid (fireSecTf).
    // Follow-up (owner: "Test it too wide needs to be legible within a mobile screen , drop opacity to 70%"): 70% opacity; fireFitLabels
    // shrinks a word wider than the view, and fireDividers keeps it under the middle of the view while its section is there
    var scx=(a+b)/2,sby=H-15,vx0=SC.scrollLeft+containerW/2;
    out+='<text class="fire-sec" data-x0="'+sp.x0+'" data-x1="'+sp.x1+'" data-x="'+scx+'" data-y="'+sby+'" x="'+scx+'" y="'+sby+'" transform="'+fireSecTf(scx,sby,vx0)+'" text-anchor="middle" font-size="26" font-family="Syne,sans-serif" font-weight="800" fill="'+sp.col+'" opacity="0.7" letter-spacing="8">'+sp.label+(sp.done?' ✓':'')+'</text>';
  });
  var tokW=function(k){return k===nextIdx?80:64;},coinR=function(k){return tokW(k)/2;};   // card widths (owner, 3 Nov round 3: "larger"): 80 px for the stage to work on, 64 px for the rest
  // the path on the ground: solid up to the last passed stage, dashed beyond, running between the light pads (owner, 31 Oct)
  for(var si=Math.max(0,i0);si<Math.min(stages.length-1,i1);si++){var ax=si*NODE_SPACING+LEFT,bx=(si+1)*NODE_SPACING+LEFT,passed=si<stages.passedIdx;
    out+='<line class="fire-rail" x1="'+(ax+coinR(si)+6)+'" y1="'+PATH_Y+'" x2="'+(bx-coinR(si+1)-6)+'" y2="'+PATH_Y+'" stroke="rgba(68,192,185,'+(passed?'0.9':'0.3')+')" stroke-width="'+(passed?2.6:1.6)+'"'+(passed?'':' stroke-dasharray="6 5"')+'/>';}

  for(var i=i0;i<=i1;i++){
    var s=stages[i];
    var cx=i*NODE_SPACING+LEFT,W=tokW(i);NODE_R=W/2;
    var done=s.done,isNext=i===nextIdx,skipped=s.skipPass,waiting=s.raw&&!done&&!skipped;
    var col=s.col||'#44c0b9',secCol=phases[s.phase].col;
    var CH=W*1.32,bot=GY-(isNext?74:60),top=bot-CH;
    var click=' style="cursor:pointer" onclick="fireNodeTap('+i+')"';
    var tier=wrStageTier(s.key),look=fireLook(s),stt=done?'done':isNext?'next':skipped?'skip':waiting?'wait':s.bonus?'todo':'lock';
    var sts=s.steps||[],lit=stt==='done'||stt==='wait'?sts.length:stt==='next'?sts.filter(function(x){return x.met;}).length:0;
    var nxtPh=phases[s.phase+1];
    out+='<g class="fire-coin'+(isNext?' next':'')+(done?' done':'')+'" data-i="'+i+'" data-cx="'+cx+'" data-tier="'+tier+'" data-look="'+look+'"'+click+'>'
      +'<title>'+(s.bonus?'Achievement':'Stage '+s.no+' of '+stages.spineLen)+', '+s.name+', '+({std:'standard',big:'big milestone',grad:'graduation'+(nxtPh?' to '+nxtPh.label.toLowerCase():'')})[look]+', '+({done:'achieved',next:'next up',skip:'skipped',wait:'met, waiting on earlier stages',lock:'locked',todo:'not yet'})[stt]+'</title>';
    // on the ground: shadow, the glowing pad under the stage to work on, then the beam (or a dotted tether for locked and skipped)
    out+='<ellipse cx="'+cx+'" cy="'+PATH_Y+'" rx="'+(W*.55).toFixed(1)+'" ry="'+(W*.1).toFixed(1)+'" fill="url(#wt-shadow)"/>';
    if(isNext)out+='<ellipse cx="'+cx+'" cy="'+PATH_Y+'" rx="'+(W*.82).toFixed(1)+'" ry="'+(W*.15).toFixed(1)+'" fill="url(#wt-pad)"/><ellipse cx="'+cx+'" cy="'+PATH_Y+'" rx="'+(W*.6).toFixed(1)+'" ry="'+(W*.1).toFixed(1)+'" fill="none" stroke="#44c0b9" stroke-width="1.2"/>';
    if(stt==='done'||stt==='next'||stt==='wait')out+='<polygon points="'+(cx-W*.3).toFixed(1)+','+PATH_Y+' '+(cx+W*.3).toFixed(1)+','+PATH_Y+' '+(cx+W*.42).toFixed(1)+','+bot+' '+(cx-W*.42).toFixed(1)+','+bot+'" fill="url(#wt-beam)" opacity="'+(isNext?1:stt==='done'?0.55:0.3)+'"/>';
    else out+='<line x1="'+cx+'" y1="'+(bot+4)+'" x2="'+cx+'" y2="'+(PATH_Y-3)+'" stroke="'+(skipped?'#e8a23c':'#7d8793')+'" stroke-opacity=".45" stroke-dasharray="2 3"/>';
    if(i===_fireDetailIdx)out+='<polygon class="fire-sel" points="'+wrPts(WR_CARD,cx-W/2-W*.08,top-W*.08,W*1.16/100)+'" fill="none" stroke="var(--gold)" style="stroke:var(--gold)" stroke-width="1"/>';   // the tapped stage: a 1 px gold outline (E3)
    out+='<g class="fire-card"><g transform="translate('+(cx-W/2)+' '+top.toFixed(1)+') scale('+(W/100).toFixed(3)+')">'+wrTok({tier:WR_LOOK_TIER[look],st:stt,bars:sts.length,lit:lit,ic:WR_STAGE_IC[s.key]||s.ic,r:NODE_R,px:W,sc:W/100,chip:stt==='next'||stt==='todo'?'':stt,ol:secCol,grey:stt==='wait'})+'</g></g>';   // C2 (owner, 4 Nov ~12:40): "only grey out ones that have not been achieved yet": achieved in full colour; locked and not-yet slates use the grey card art, a met-but-waiting one a 35% wash
    // the name sits under the card, in the air above the ground (owner, 3 Nov: not on the card at this size)
    /* C2 (owner, 4 Nov ~12:40: "The text underneath need to have more breathing space so move it down ... and treat it as a label with a
       bounding box with attached font"): the name is a boxed label in the Next goals heading style (Syne bold, light on panel), on one row
       16 px under the standard slates, edged in the section colour. fireFitLabels sizes each box to its text once drawn */
    var LY=GY-60+16,lw=Math.min(FIRE_LBL_MAX,s.name.length*7)+14;
    out+='<g class="fire-lbl s-'+stt+'"'+click+'><rect x="'+(cx-lw/2).toFixed(1)+'" y="'+LY+'" width="'+lw.toFixed(1)+'" height="20" style="stroke:'+secCol+'"/>'
      +'<text x="'+cx+'" y="'+(LY+14)+'" text-anchor="middle" font-size="11">'+s.name+'</text></g>';
    if(isNext){   // tag for the stage to work on now
      var tag=(s.no===1)?'START HERE':'NEXT UP';
      out+='<rect x="'+(cx-40)+'" y="'+(top-30)+'" width="80" height="16" fill="'+col+'26" stroke="'+col+'" stroke-width="0.8"/>'
        +'<text x="'+cx+'" y="'+(top-18.5)+'" text-anchor="middle" font-size="10.5" font-family="Share Tech Mono,monospace" fill="'+col+'" letter-spacing="1.2" font-weight="700">'+tag+'</text>';
    }else out+='<text x="'+cx+'" y="'+(top-9)+'" text-anchor="middle" font-size="10.5" font-family="DM Sans,sans-serif" fill="'+(viLight()?'rgba(140,150,160,'+(done?0.95:0.75)+')':(done?'#C9CED3':'#9AA0A6'))+'">'+(waiting?'met · waiting':skipped?'skipped':s.desc)+'</text>';
    out+='</g>';
  }
  svgEl.setAttribute('viewBox',x0+' 0 '+(x1-x0)+' '+H);
  svgEl.setAttribute('width',x1-x0);svgEl.setAttribute('height',H);
  svgEl.style.left=x0+'px';
  renderFIREroadmap._win={x0:x0,x1:x1,total:TOTAL_W};
  out=viDay(out);
  if(svgEl.__sig!==out){svgEl.__sig=out;svgEl.innerHTML=out;fireFitLabels(svgEl);}   // identical drawing = no repaint
  fireCarousel();
}
/* phones (owner, 31 Oct): the roadmap behaves like a carousel: the coin in the centre is the largest, the others shrink and fade
   towards the edges, and a swipe settles on the nearest stage */
// the ground grid: horizontal lines closer together towards the horizon, verticals converging on one point above the middle of the
// view. It is the environment and stays still while the cards scroll across it (owner, 3 Nov round 5); redrawn only when the width changes
/* v0.9.1 round 2 (owner, 4 Nov, R3: "Increase the two point perspective behind the achievements and decrease perspective height", red
   sketch on the overview): the ground is a plane FIRE_GH tall that starts right under the slates, its far edge inset from both sides and
   its near edge FIRE_GF times wider, so it runs out past the card on both sides; the across lines bunch towards the far edge */
// size each slate's name box to its text; a name wider than FIRE_LBL_MAX is drawn a little narrower so neighbouring boxes never touch
function fireFitLabels(svg){
  var SC=document.getElementById('fire-timeline-scroll'),maxW=SC?SC.clientWidth*.86:1e4;
  [].forEach.call(svg.querySelectorAll('text.fire-sec'),function(t){
    t.setAttribute('font-size',26);t.setAttribute('letter-spacing',8);
    var L=0;try{L=t.getComputedTextLength();}catch(e){}
    if(!(L>0))return;
    var W=L*1.35;if(W>maxW){var k=maxW/W;t.setAttribute('font-size',(26*k).toFixed(1));t.setAttribute('letter-spacing',(8*k).toFixed(1));W=maxW;}
    t.setAttribute('data-w',W.toFixed(1));
  });
  if(SC)try{fireDividers(SC);}catch(e){}
  [].forEach.call(svg.querySelectorAll('.fire-lbl'),function(L){
    var t=L.querySelector('text'),r=L.querySelector('rect');if(!t||!r)return;
    t.removeAttribute('textLength');t.removeAttribute('lengthAdjust');
    var w=0;try{w=t.getComputedTextLength();}catch(e){}
    if(!(w>0))return;   // not laid out yet: the estimate stays
    if(w>FIRE_LBL_MAX){t.setAttribute('textLength',FIRE_LBL_MAX);t.setAttribute('lengthAdjust','spacingAndGlyphs');w=FIRE_LBL_MAX;}
    var cx=+t.getAttribute('x');r.setAttribute('x',(cx-w/2-7).toFixed(1));r.setAttribute('width',(w+14).toFixed(1));
  });
}
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){var s=document.getElementById('fire-roadmap-svg');if(s)fireFitLabels(s);});   // Syne arrives after the first drawing
function fireGroundX(x,y,vx){return vx+(x-vx)*(1+(FIRE_GF-1)*y/FIRE_GH);}   // where a point x on the far edge sits at depth y
function fireGround(){
  var g=document.getElementById('fire-ground'),SC=document.getElementById('fire-timeline-scroll');if(!g||!SC)return;
  var w=SC.clientWidth,h=FIRE_GH,vx=w/2,sp=54,ins=Math.max(14,Math.round(w*.07)),L=ins,R=w-ins,o='';
  if(!(w>0)||g.__w===w)return;g.__w=w;
  var at=function(x,y){return fireGroundX(x,y,vx).toFixed(1);};
  o+='<polygon class="fg-plane" points="'+L+',0 '+R+',0 '+at(R,h)+','+h+' '+at(L,h)+','+h+'"/>';
  [0,.045,.1,.17,.26,.38,.55,.78].forEach(function(f,k){var y=(f*h).toFixed(1);o+='<line class="fg-h" x1="'+at(L,+y)+'" y1="'+y+'" x2="'+at(R,+y)+'" y2="'+y+'" style="stroke-opacity:'+(k?(.1+k*.025).toFixed(3):.55)+'"/>';});
  o+='<line class="fg-edge" x1="'+L+'" y1="0" x2="'+at(L,h)+'" y2="'+h+'"/><line class="fg-edge" x1="'+R+'" y1="0" x2="'+at(R,h)+'" y2="'+h+'"/>';
  for(var x=vx-Math.floor((vx-L)/sp)*sp;x<=R+.1;x+=sp)o+='<line class="fg-v" x1="'+x.toFixed(1)+'" y1="0" x2="'+at(x,h)+'" y2="'+h+'"/>';
  g.setAttribute('viewBox','0 0 '+w+' '+h);g.innerHTML=o;
}
// lettering lying on the ground (C3): about its baseline point (x,y), 1.35 times wider (the "wider version of the font"), squashed to half
// its height by the depth, and sheared so its uprights run towards the grid's vanishing point, as the dividers do
function fireSecTf(x,y,vx){
  var gy=y-(FIRE_H-FIRE_GH),k=1+(FIRE_GF-1)*gy/FIRE_GH,a=1.35,d=.5,c=(x-vx)*(FIRE_GF-1)/(FIRE_GH*k)*d;
  return 'matrix('+a+' 0 '+c.toFixed(4)+' '+d+' '+(x-a*x-c*y).toFixed(2)+' '+(y-d*y).toFixed(2)+')';
}
// the section dividers lie on the ground, so their near end follows the same perspective as the grid (R6); the view's middle moves as it scrolls
function fireDividers(SC){
  var vx=SC.scrollLeft+SC.clientWidth/2;
  [].forEach.call(document.querySelectorAll('#fire-roadmap-svg line.fire-div'),function(l){var x=+l.getAttribute('x1');l.setAttribute('x2',fireGroundX(x,FIRE_GH,vx).toFixed(1));});
  [].forEach.call(document.querySelectorAll('#fire-roadmap-svg text.fire-sec'),function(t){
    var x0=+t.getAttribute('data-x0'),x1=+t.getAttribute('data-x1'),hw=(+t.getAttribute('data-w')||0)/2+8,x=x1-x0<=2*hw?(x0+x1)/2:Math.max(x0+hw,Math.min(x1-hw,vx));
    t.setAttribute('x',x.toFixed(1));t.setAttribute('data-x',x.toFixed(1));t.setAttribute('transform',fireSecTf(x,+t.getAttribute('data-y'),vx));
  });
}
function fireCarousel(){
  try{fireGround();}catch(e){}
  var SC=document.getElementById('fire-timeline-scroll'),svg=document.getElementById('fire-roadmap-svg');if(!SC||!svg)return;
  try{fireDividers(SC);}catch(e){}
  var mob=window.innerWidth<=700,mid=SC.scrollLeft+SC.clientWidth/2;
  [].forEach.call(svg.querySelectorAll('.fire-coin'),function(g){
    var cx=(+g.getAttribute('data-i'))*FIRE_NODE+FIRE_LEFT,d=Math.min(1,Math.abs(cx-mid)/(SC.clientWidth*(mob?0.6:0.5)));
    var fade=(1-(mob?0.72:0.4)*d).toFixed(2);
    g.style.transform='scale('+(1.12-0.12*d).toFixed(3)+')';/* never under 1, so stage names keep their size (v0.8 type scale) */
    /* v0.9.2 Night contrast: at Night only the slate art fades towards the edges; the name, tag and description keep full strength so they stay readable (WCAG AA). Daylight fades the whole stage as before */
    if(viLight()){g.style.opacity=fade;}else{g.style.opacity='';var cd=g.querySelector('.fire-card');if(cd)cd.style.opacity=fade;}
  });
}
var _fireSnapT=0,_fireSnapping=0;
function fireSnap(){
  var SC=document.getElementById('fire-timeline-scroll');if(!SC||window.innerWidth>700||_fireSnapping>performance.now())return;
  var mid=SC.scrollLeft+SC.clientWidth/2,i=Math.round((mid-FIRE_LEFT)/FIRE_NODE),S=renderFIREroadmap._stages||[];
  i=Math.max(0,Math.min(S.length-1,i));var left=Math.max(0,i*FIRE_NODE+FIRE_LEFT-SC.clientWidth/2);
  if(Math.abs(left-SC.scrollLeft)<2)return;_fireSnapping=performance.now()+700;
  SC.scrollTo?SC.scrollTo({left:left,behavior:'smooth'}):(SC.scrollLeft=left);
}
// scrolling the track just moves the window; it is only redrawn when the user gets near its edge
(function(){
  var raf=0;
  function check(){
    raf=0;
    var SC=document.getElementById('fire-timeline-scroll'),w=renderFIREroadmap._win;
    if(!SC||!w)return;
    var sl=SC.scrollLeft,cw=SC.clientWidth,m=FIRE_NODE*1.5;
    if((w.x0>0&&sl<w.x0+m)||(w.x1<w.total&&sl+cw>w.x1-m))renderFIREroadmap();
  }
  window.addEventListener('load',function(){
    var SC=document.getElementById('fire-timeline-scroll');
    if(SC)SC.addEventListener('scroll',function(){if(!raf)raf=requestAnimationFrame(function(){check();fireCarousel();});clearTimeout(_fireSnapT);_fireSnapT=setTimeout(fireSnap,160);},{passive:true});
  });
})();

function fireTick(k,on){
  if(!ovState.manual)ovState.manual={};
  ovState.manual[k]=!!on;
  saveState();
  renderFIREroadmap();
  try{renderDebtMapConfirm();}catch(e){}
  try{checkAchievements();}catch(e){}
}
function fireToggleManual(k){fireTick(k,!fireMan(k));}
function fireSkip(key){
  if(!ovState.skipped)ovState.skipped={};
  ovState.skipped[key]=true;
  _fireSkipAsk=-1;
  saveState();renderFIREroadmap();
  var S=renderFIREroadmap._stages||[],n=S.nextIdx;
  if(n>=0){fireScrollTo(n);fireShowDetail(n);}
  if(typeof showToast==='function')showToast('Stage skipped. The next one is open');
}
function fireUnskip(key){
  if(ovState.skipped)delete ovState.skipped[key];
  saveState();renderFIREroadmap();
}
function fireGo(tab){
  try{showTab(tab);}catch(e){}
  try{window.scrollTo(0,0);}catch(e){}
}
// one-tap net worth snapshot for the current month (same record the “Add Data Point” form makes)
function fireLogSnapshot(){
  var d=new Date(),month=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  ovState.snapshots=(ovState.snapshots||[]).filter(function(x){return x.month!==month;});
  ovState.snapshots.push({month:month,nw:computeNetWorth(),debt:debtTotal(),liab:alTotalLiab(),income:cfTotalIn()});
  saveState();
  try{drawChart();updateKPIs();renderMsExtras();}catch(e){}
  renderFIREroadmap();
  var S=renderFIREroadmap._stages||[],n=S.nextIdx;
  if(n>=0)fireShowDetail(n);
  if(typeof showToast==='function')showToast('Net worth snapshot recorded for '+month+' ✓');
}
function fireShowDetail(idx,opts){
  opts=opts||{};
  var S=renderFIREroadmap._stages||fireBuildStages();
  var s=S[idx];
  var panel=document.getElementById('fire-detail-panel'),inner=document.getElementById('fire-detail-inner');
  if(!s||!panel||!inner)return;
  if(_fireDetailIdx!==idx&&!opts.keepAsk)_fireSkipAsk=-1;
  if(opts.skipAsk)_fireSkipAsk=idx;
  _fireDetailIdx=idx;
  var ph=FIRE_PHASES[s.phase],col=s.col||ph.col,look=fireLook(s),nxtPh=FIRE_PHASES[s.phase+1];
  var seq=s.bonus?'':String(s.no||idx+1).padStart(2,'0');
  var isNext=idx===S.nextIdx,waiting=s.raw&&!s.done&&!s.skipPass;
  var blk0=S.nextIdx>=0?S[S.nextIdx]:null;
  var state_=s.done?'Achieved':s.skipPass?'Skipped':isNext?'Next up':(waiting&&blk0)?'Met. Waiting on '+blk0.name:s.bonus?'Not yet':'Locked';
  var stCol=s.done?'#3ecf8e':s.skipPass?'#e8a23c':(isNext||waiting)?col:'#7d8793';
  var long=(s.long||FIRE_LONG[(s.no||idx+1)-1]||s.desc)
    +(look==='grad'?' <b style="color:var(--gold)">Graduation:</b> '+(nxtPh?'finishing it moves you on to '+nxtPh.label.charAt(0)+nxtPh.label.slice(1).toLowerCase()+'.':'the last slate on the roadmap.'):'');
  var progTxt='';
  if(!s.done&&s.cur&&s.target)progTxt='<div style="font-family:\'Share Tech Mono\',monospace;font-size:max(.5rem,var(--vi-fs-1));color:'+col+';margin-top:6px">'+gbpFmt(Math.max(0,s.cur()))+' of '+gbpFmt(s.target)+' · '+Math.round(Math.max(0,Math.min(1,s.prog()))*100)+'%</div>';
  else if(!s.done&&s.prog&&isNext)progTxt='<div style="font-family:\'Share Tech Mono\',monospace;font-size:max(.5rem,var(--vi-fs-1));color:'+col+';margin-top:6px">'+Math.round(Math.max(0,Math.min(1,s.prog()))*100)+'% there</div>';
  var blocker=S.nextIdx>=0?S[S.nextIdx]:null;
  var need='';
  if(!s.done&&!s.skipPass){
    if(waiting&&blocker){
      need='<div class="fd-box ok"><svg class="vi-ic g" role="img" aria-label="Done"><use href="#vi-check"/></svg><b>You already meet this.</b> It unlocks as soon as “'+blocker.name+'” is done.<br><button type="button" class="fd-btn" onclick="fireScrollTo('+S.nextIdx+');fireShowDetail('+S.nextIdx+')">Go to “'+blocker.name+'”</button></div>';
    }else{
      var items=(s.why?s.why():[s.hint||'Not met yet.']).filter(Boolean);
      need='<div class="fd-box"><div class="fd-h">WHAT THIS NEEDS</div><ul>'+items.map(function(t){return '<li>'+t+'</li>';}).join('')+'</ul>'
        +(!isNext&&blocker&&!s.bonus?'<div class="fd-sub">It comes after “'+blocker.name+'”, so stages unlock in order.</div>':'')
        +(s.bonus?'<div class="fd-sub">This one counts as soon as it is met. It does not hold up the stages around it.</div>':'')+'</div>';
    }
  }
  if(isNext&&!s.done&&(S.waiting||[]).length){var wn=S.waiting.length;need+='<div class="fd-box ok"><svg class="vi-ic g" role="img" aria-label="Done"><use href="#vi-check"/></svg>'+wn+' later stage'+(wn>1?'s are':' is')+' already met. '+(wn>1?'They tick':'It ticks')+' when you finish “'+s.name+'”.</div>';}
  var ticks=(s.confirms||[]).map(function(c){
    var on=c.k==='debtsMapped'?fireDebtsConfirmed():fireMan(c.k);
    return '<label class="fd-tick"><input type="checkbox" '+(on?'checked ':'')+'onchange="fireTick(\''+c.k+'\',this.checked)"><span>'+c.lbl+(c.sub?'<small>'+c.sub+'</small>':'')+'</span></label>';
  }).join('');
  var acts=(!s.done&&s.acts?s.acts:[]).map(function(a){return '<button type="button" class="fd-btn" onclick="'+a.fn+'">'+a.lbl+'</button>';}).join('');
  var skip='';
  if(!s.done){
    if(s.skip)skip='<button type="button" class="fd-btn ghost" onclick="fireUnskip(\''+s.key+'\')">Undo skip</button>';
    else if(isNext){
      if(_fireSkipAsk===idx)skip='<div class="fd-box warn">Skip “'+s.name+'”? It won’t count as achieved, but the stages after it unlock. You can undo this any time.<br>'
        +'<button type="button" class="fd-btn" onclick="fireSkip(\''+s.key+'\')">Yes, skip it</button> <button type="button" class="fd-btn ghost" onclick="_fireSkipAsk=-1;fireShowDetail('+idx+')">Keep it</button></div>';
      else skip='<button type="button" class="fd-link" onclick="fireShowDetail('+idx+',{skipAsk:true})">This doesn’t apply to me, skip it</button>';
    }
  }
  var btn=(acts||skip)?'<div class="fd-acts">'+acts+skip+'</div>':'';
  var dTier=wrStageTier(s.key),dSt=s.done?'done':s.skipPass?'skip':isNext?'next':waiting?'wait':s.bonus?'todo':'lock',dSteps=s.steps||[],dPer=wrStepXp(s.key,dSteps.length),dW=wrState();
  var dLit=dSt==='done'||dSt==='wait'?dSteps.length:dSt==='next'?dSteps.filter(function(x){return x.met;}).length:0;
  var stepsHtml='<div class="fd-h wr-steps-h">STEPS · '+WR_TIERS[dTier].n.toUpperCase()+' TIER</div><ol class="wr-steps">'+dSteps.map(function(x,k){var got=!!dW.s[s.key+'.'+k],cur=!x.met&&dSteps.slice(0,k).every(function(y){return y.met;});
    return '<li class="'+(x.met?'ok':cur?'cur':'')+'"><span class="wr-sdot" aria-hidden="true"></span><span class="wr-slbl">'+x.lbl+(x.met?'<span class="vh"> (done)</span>':'')+'</span><span class="wr-sxp">'+(got?'+'+dPer+' XP earned':'+'+dPer+' XP')+'</span></li>';}).join('')+'</ol>';
  inner.innerHTML=viDay('<div class="wr-dtok">'+wrTokSvg({tier:WR_LOOK_TIER[look],st:dSt,bars:dSteps.length,lit:dLit,ic:WR_STAGE_IC[s.key]||s.ic,chip:dSt==='next'||dSt==='todo'?'':dSt,tl:seq||null,name:s.name,ol:ph.col},window.innerWidth<=480?116:140,(s.bonus?'Achievement, ':'Stage '+seq+', ')+s.name)+'</div>'
    +'<div style="flex:1;min-width:0">'
    +'<div style="font-family:\'Syne\',sans-serif;font-size:max(.74rem,var(--vi-fs-3));font-weight:800;color:'+col+';margin-bottom:3px">'+s.name+' <span style="white-space:nowrap;display:inline-block;font-family:\'Share Tech Mono\',monospace;font-size:max(.42rem,var(--vi-fs-1));font-weight:700;letter-spacing:.12em;color:'+stCol+';border:1px solid '+stCol+'66;padding:1px 6px;margin-left:6px;vertical-align:middle">'+state_+'</span></div>'
    +'<div style="font-family:\'Share Tech Mono\',monospace;font-size:max(.42rem,var(--vi-fs-1));color:var(--t2);letter-spacing:.1em;margin-bottom:4px">'+ph.label+' PHASE · '+(s.bonus?'ACHIEVEMENT':'STEP '+seq+' OF '+(S.spineLen||30))+'</div>'
    +'<div style="font-family:\'DM Sans\',sans-serif;font-size:max(.58rem,var(--vi-fs-2));color:var(--t2);line-height:1.5">'+long+'</div>'
    +progTxt+stepsHtml+need+ticks+btn+'</div>');
  panel.style.display='';
  if(!opts.keepAsk)renderFIREroadmap();   // draws the gold ring on the tapped stage
}
function fireCloseDetail(){
  var panel=document.getElementById('fire-detail-panel');if(panel)panel.style.display='none';
  _fireDetailIdx=-1;_fireSkipAsk=-1;renderFIREroadmap();
}
function fireNodeTap(i){
  var panel=document.getElementById('fire-detail-panel');
  if(_fireDetailIdx===i&&panel&&panel.style.display!=='none')fireCloseDetail();else fireShowDetail(i);
}
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&_fireDetailIdx>=0){var p=document.getElementById('fire-detail-panel');if(p&&p.style.display!=='none')fireCloseDetail();}});

