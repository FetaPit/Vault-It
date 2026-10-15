const { chromium } = require('playwright');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL:',m);} else console.log('ok  :',m); };
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:430,height:900}}); const page=await ctx.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.addInitScript(()=>{
    window._cloud={}; window._mode='ok';
    window.supabase={createClient:()=>({auth:{onAuthStateChange:()=>({}),getSession:async()=>({data:{session:null}}),signOut:async()=>({})},functions:{invoke:async()=>({data:null,error:{message:'n/a'}})},
      from:()=>({upsert:(rows)=>{ if(_mode==='fail')return Promise.resolve({error:{message:'permission denied'}}); [].concat(rows).forEach(r=>_cloud[r.key]=r.value);return Promise.resolve({});},select:()=>({eq:()=>Promise.resolve({data:[]}),single:async()=>({data:null})})})})};
    localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e9}));
    localStorage.setItem('vi_user',JSON.stringify({name:'Pete',email:'t@t.com'}));
    localStorage.setItem('pos_ov1',JSON.stringify({income:[{id:1,name:'LCWRA',amount:430}],expenses:[]}));
    localStorage.setItem('pos_al1',JSON.stringify({cashAccounts:[{id:1,name:'Cash',balance:9500}],stocks:[],otherAssets:[],crypto:[],liabilities:[]}));
  });
  await page.goto('file:///home/user/Vault-It/index.html'); await page.waitForTimeout(7500);
  ok(await page.locator('#sync-banner').count()===1,'signed-out device with unsynced edits shows the "not backed up" banner');
  ok(/Sign in to back up/.test(await page.innerText('#sync-banner')),'banner offers sign-in');
  ok(/Not signed in/.test(await page.evaluate(()=>{viSyncStatus();return document.getElementById('sync-status').textContent;})),'Settings status explains it');
  // sign in (simulated), then Sync now
  await page.evaluate(()=>{_supaUser={id:'u1',email:'t@t.com'};});
  await page.evaluate(()=>{_mode='fail';return viSyncNow();}); await page.waitForTimeout(300);
  const st1=await page.evaluate(()=>document.getElementById('sync-status').textContent);
  ok(/waiting to upload \(permission denied\)/.test(st1),'failed upload shows why: '+st1);
  await page.evaluate(()=>{_mode='ok';return viSyncNow();}); await page.waitForTimeout(300);
  const r=await page.evaluate(()=>({st:document.getElementById('sync-status').textContent,keys:Object.keys(_cloud),cash:_cloud.pos_al1.cashAccounts[0].balance,lc:_cloud.pos_ov1.income[0].amount,banner:!!document.getElementById('sync-banner')}));
  ok(r.cash===9500&&r.lc===430&&r.keys.includes('vi_user'),'Sync now uploads all data on the device (cash £'+r.cash+', LCWRA £'+r.lc+')');
  ok(/Everything is backed up/.test(r.st)&&!r.banner,'status turns green and the banner disappears: '+r.st);
  ok(errs.length===0,'no page errors '+errs.join('|'));
  await b.close(); console.log(fails?'FAILURES '+fails:'ALL PASSED');
})();
