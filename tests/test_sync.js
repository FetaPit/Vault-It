const { chromium } = require('playwright');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL:',m);} else console.log('ok  :',m); };
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:1100,height:900}}); const page=await ctx.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.addInitScript(()=>{
    window._cloud={};
    window.supabase={createClient:()=>({
      auth:{onAuthStateChange:()=>({}),getSession:async()=>({data:{session:null}}),signOut:async()=>({}),verifyOtp:async()=>({error:{message:'x'}})},
      functions:{invoke:async()=>({data:null,error:{message:'n/a'}})},
      from:(t)=>({upsert:async(rows)=>{if(t==='vault_data'){[].concat(rows).forEach(row=>{window._cloud[row.key]=row.value;});}return {};},
                 select:()=>({eq:async()=>({data:Object.keys(window._cloud).map(k=>({key:k,value:window._cloud[k]}))}),single:async()=>({data:null})})})
    })};
  });
  await page.addInitScript(()=>{localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e9}));localStorage.setItem('vi_user',JSON.stringify({name:'T',email:'t@t.com'}));localStorage.setItem('vi_pioneer','true');localStorage.setItem('vi_declined_demo','true');});
  await page.goto('file:///home/user/Vault-It/index.html'); await page.waitForTimeout(1300);
  // fake cloud + signed-in user
  await page.evaluate(()=>{
    window._written=[]; _supaUser={id:'u1',email:'t@t.com'};_syncReady=true;
    const o=_lsOrig; _lsOrig=function(k,v){window._written.push(k);return o.call(localStorage,k,v);};
  });
  // a realistic session: enter data in every area
  await page.evaluate(()=>{
    ovState.income=[{id:1,name:'Salary',amount:3000,cat:'salary'}];ovState.expenses=[{id:2,name:'Rent',amount:1000,type:'ce',cat:'housing',category:'necessity'}];ovState.customCats=[{k:'c_x',kind:'exp',n:'Dog walker',ic:'paw',t:'cn'}];saveState();
    alState.cashAccounts.push({id:3,name:'Cash',type:'Savings',balance:500});alState.stocks=[{id:4,pie:1,sym:'AAPL',units:2,avgCost:100,price:150}];alState.stockPies=[{id:1,name:'ISA'}];alState.otherAssets.push({id:5,name:'Watch',value:900,photos:3});saveAL();
    debtState.debts.push({id:6,name:'Card',original:1000,balance:800,rate:20,min:30,type:'credit'});saveDebtState();
    bizState.clients.push({id:7,name:'Acme',monthly:200,status:'Active'});saveBiz();
    state.saved=4200;state.target=240000;state.houseType='semi';state.deposits=[{date:'01/10/2026',amount:4200}];save();
    achState.xp=120;saveAch();
    localStorage.setItem('vi_settings',JSON.stringify({theme:'dark',currency:'GBP'}));
    localStorage.setItem('vi_user',JSON.stringify({name:'Pete',email:'t@t.com',job:'PM'}));
  });
  await page.waitForTimeout(400);
  const keys=await page.evaluate(()=>({written:[...new Set(_written)],synced:_VAULT_KEYS,cloud:Object.keys(_cloud)}));
  const LOCAL_ONLY=/^(vi_ts|vi_dirty|vi_bak_.*|vi_last_.*|vi_session|vi_pin_.*|vi_pin_hash|vi_pin_len|vi_demo_mode|vi_declined_demo|vi_fx_.*|vi_last_visit|vi_streak|emailjs_.*|.*_api_key|.*_key|alpha_vantage_key|coingecko_api_key|supabase.*|sb-.*|__.*|vi_pioneer_email|vi_pioneer_num|vi_founder_.*)$/;
  const missed=keys.written.filter(k=>!keys.synced.includes(k)&&!LOCAL_ONLY.test(k));
  ok(missed.length===0,'every data key the app writes is on the sync list'+(missed.length?' — NOT SYNCED: '+missed.join(', '):''));
  ok(keys.cloud.includes('ht3'),'House Builder reaches the cloud (ht3)');
  ['pos_ov1','pos_al1','pos_debt1','pos_biz1','pos_ach1','vi_settings','vi_user'].forEach(k=>ok(keys.cloud.includes(k),'cloud has '+k));
  const cloud=await page.evaluate(()=>({house:_cloud.ht3,ov:_cloud.pos_ov1,al:_cloud.pos_al1,user:_cloud.vi_user}));
  ok(cloud.house.saved===4200&&cloud.house.houseType==='semi','cloud copy of the house deposit is correct (£'+cloud.house.saved+', '+cloud.house.houseType+')');
  ok(cloud.ov.customCats&&cloud.ov.customCats[0].n==='Dog walker'&&cloud.ov.expenses[0].type==='ce','budget lines, types and custom categories are in the cloud copy');
  ok(cloud.al.stocks.length===1&&cloud.al.otherAssets.some(a=>a.name==='Watch'),'stocks and wealth inventory are in the cloud copy');
  ok(cloud.user.name==='Pete','profile (name/job) is in the cloud copy');
  // brand-new device: empty browser, sign in, everything comes back
  const snapshot=await page.evaluate(()=>JSON.stringify(_cloud));
  const ctx2=await b.newContext({viewport:{width:1100,height:900}}); const p2=await ctx2.newPage(); const errs2=[]; p2.on('pageerror',e=>errs2.push(e.message));
  await p2.addInitScript(()=>{
    localStorage.setItem('vi_declined_demo','true'); window._cloud={};
    window.supabase={createClient:()=>({
      auth:{onAuthStateChange:()=>({}),getSession:async()=>({data:{session:null}}),signOut:async()=>({}),verifyOtp:async()=>({error:{message:'x'}})},
      functions:{invoke:async()=>({data:null,error:{message:'n/a'}})},
      from:(t)=>({upsert:async(rows)=>{if(t==='vault_data'){[].concat(rows).forEach(row=>{window._cloud[row.key]=row.value;});}return {};},
                 select:()=>({eq:async()=>({data:Object.keys(window._cloud).map(k=>({key:k,value:window._cloud[k]}))}),single:async()=>({data:null})})})
    })};
  });
  await p2.goto('file:///home/user/Vault-It/index.html'); await p2.waitForTimeout(1300);
  const restored=await p2.evaluate(async(snap)=>{
    const cloud=JSON.parse(snap); _supaUser={id:'u1',email:'t@t.com'};_syncReady=true;
    window._cloud=cloud;
    const before={saved:state.saved,nw:computeNetWorth()};
    const h=await _hydrateFromSupabase('u1');
    return {h,before,after:{saved:state.saved,type:state.houseType,deposits:state.deposits.length,nw:computeNetWorth(),income:cfTotalIn(),spend:cfTotalOut(),stocks:alTotalStocks(),cash:alTotalCash(),debt:debtTotal(),clients:bizState.clients.length,cats:(ovState.customCats||[]).length,user:JSON.parse(localStorage.getItem('vi_user')).name,xp:achState.xp,pctText:document.getElementById('ppct')&&document.getElementById('ppct').textContent}};
  },snapshot);
  ok(restored.h===true&&restored.before.saved===0,'fresh device starts empty, then restores from the cloud');
  const a=restored.after;
  ok(a.saved===4200&&a.type==='semi'&&a.deposits===1,'House Builder restored on the new device (£'+a.saved+', '+a.type+')');
  ok(a.income===3000&&a.spend===1000&&a.cats===1,'budget restored (income, spending, custom category)');
  ok(a.stocks===300&&a.cash===500&&a.debt===800&&a.clients===1&&a.user==='Pete'&&a.xp===120,'stocks, cash, debts, business, profile and XP restored');
  ok(/%/.test(a.pctText||'')&&a.pctText!=='0.0%','house screen refreshed after restore ('+a.pctText+')');
  console.log('page errors:',errs,errs2); ok(errs.length+errs2.length===0,'no page errors');
  console.log(fails?('\n'+fails+' FAILED'):'\nALL PASSED'); await b.close();
})();
