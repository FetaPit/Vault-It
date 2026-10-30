const { chromium } = require('playwright');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL:',m);} else console.log('ok  :',m); };
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:430,height:900}}); const page=await ctx.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(e.message)); page.on('dialog',d=>d.accept());
  await page.addInitScript(()=>{localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e9}));localStorage.setItem('vi_user',JSON.stringify({name:'P',email:'t@t.com'}));
    localStorage.setItem('pos_ov1',JSON.stringify({income:[{id:1,name:'UC',amount:381},{id:2,name:'LCWRA',amount:430}],expenses:[]}));});
  await page.goto('file:///home/user/Vault-It/index.html'); await page.waitForTimeout(9000);
  ok(await page.evaluate(()=>Object.keys(localStorage).some(k=>/^vi_snap_/.test(k))),'a daily copy of the vault is kept on the device');
  // mock account: cloud + history rpc
  await page.evaluate(()=>{
    window._cloud={pos_ov1:{value:{income:[{id:1,name:'UC',amount:381},{id:2,name:'LCWRA',amount:430}],expenses:[]},updated_at:new Date(Date.now()-60e3).toISOString()}};
    window._hist=[{id:7,key:'pos_ov1',value:{income:[{id:1,name:'UC',amount:381},{id:2,name:'LCWRA',amount:430},{id:3,name:'PIP',amount:778}],expenses:[]},archived_at:new Date(Date.now()-3600e3).toISOString(),reason:'shrunk'}];
    _supaClient={auth:{},functions:{invoke:async()=>({})},
      rpc:(fn,a)=>{ if(fn==='vault_history_list')return Promise.resolve({data:_hist}); if(fn==='vault_history_restore'){const h=_hist.find(x=>x.id===a.p_id);_cloud[h.key]={value:h.value,updated_at:new Date().toISOString()};return Promise.resolve({data:h.key});} },
      from:()=>({upsert:(rows)=>{[].concat(rows).forEach(r=>_cloud[r.key]={value:r.value,updated_at:r.updated_at});return Promise.resolve({});},
        select:()=>({eq:()=>Promise.resolve({data:Object.keys(_cloud).map(k=>({key:k,value:_cloud[k].value,updated_at:_cloud[k].updated_at}))})})})};
    _supaUser={id:'u1',email:'t@t.com'};
  });
  await page.evaluate(()=>_hydrateFromSupabase('u1'));
  await page.evaluate(()=>viOpenHistory()); await page.waitForTimeout(500);
  const txt=await page.innerText('#vi-hist');
  ok(/Budget: income & spending/.test(txt)&&/3 income \(£1,589\/mo\)/.test(txt),'version history lists the earlier version with what is in it');
  ok(/On this device/.test(txt)&&/Restore all/.test(txt),'and this device\'s daily copies');
  await page.click('#vi-hist-cloud button'); await page.waitForTimeout(800);
  const r=await page.evaluate(()=>({local:JSON.parse(localStorage.getItem('pos_ov1')).income.length,cloud:_cloud.pos_ov1.value.income.length}));
  ok(r.local===3&&r.cloud===3,'restoring brings PIP back on this device and in the account');
  // another device changes the account → this device picks it up when reopened
  await page.evaluate(()=>{_cloud.pos_ov1={value:{income:[{id:1,name:'UC',amount:381},{id:2,name:'LCWRA',amount:430},{id:3,name:'PIP',amount:778},{id:4,name:'Housing',amount:342}],expenses:[]},updated_at:new Date(Date.now()+1000).toISOString()};});
  await page.evaluate(()=>viBackgroundPull()); await page.waitForTimeout(500);
  ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('pos_ov1')).income.length)===4,'changes from the other device (app ↔ browser) arrive automatically');
  // history not deployed yet → clear message
  await page.evaluate(()=>{_supaClient.rpc=()=>Promise.resolve({error:{message:'Could not find the function public.vault_history_list',code:'PGRST202'}});});
  await page.evaluate(()=>viOpenHistory()); await page.waitForTimeout(400);
  ok(/not switched on yet/.test(await page.innerText('#vi-hist-cloud')),'if the account history is not switched on, it says so');
  ok(errs.length===0,'no page errors '+errs.join('|'));
  await b.close(); console.log(fails?'FAILURES '+fails:'ALL PASSED');
})();
