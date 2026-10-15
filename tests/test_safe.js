const { chromium } = require('playwright');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL:',m);} else console.log('ok  :',m); };
const YDAY=new Date(Date.now()-864e5).toISOString();
const MOCK=(cloud,mode)=>`
  window._cloud=${JSON.stringify(cloud)}; window._mode='${mode||'ok'}'; window._rest=[];
  window.supabase={createClient:()=>({
    auth:{onAuthStateChange:()=>({}),getSession:async()=>({data:{session:null}}),signOut:async()=>({}),verifyOtp:async()=>({error:{message:'x'}})},
    functions:{invoke:async()=>({data:null,error:{message:'n/a'}})},
    from:(t)=>({
      upsert:(rows)=>{ if(window._mode==='hang')return new Promise(()=>{}); if(window._mode==='fail')return Promise.resolve({error:{message:'boom'}}); [].concat(rows).forEach(r=>{window._cloud[r.key]={value:r.value,updated_at:r.updated_at};});return Promise.resolve({}); },
      select:()=>({eq:()=>window._mode==='nocloud'?new Promise(()=>{}):Promise.resolve({data:Object.keys(window._cloud).map(k=>({key:k,value:window._cloud[k].value,updated_at:window._cloud[k].updated_at}))}),single:async()=>({data:null})})})
  })};`;
const newCtx=async(b,init,cloud,mode)=>{
  const ctx=await b.newContext({viewport:{width:1100,height:900}}); const page=await ctx.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(e.message)); page.errs=errs;
  await page.addInitScript(MOCK(cloud,mode)); await page.addInitScript(init);
  await page.goto('file:///home/user/Vault-It/index.html'); await page.waitForTimeout(1300); return {ctx,page};
};
const OLD={income:[{id:1,name:'Salary',amount:3000,cat:'salary'}],expenses:[]}, NEW={income:[{id:1,name:'Salary',amount:5000,cat:'salary'},{id:2,name:'Side',amount:400,cat:'side'}],expenses:[]};
(async()=>{
  const b=await chromium.launch();
  // A: the real bug — this browser holds the newest data (never synced, predates tracking); cloud is stale
  let {ctx,page}=await newCtx(b,`localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_user',JSON.stringify({name:'Pete',email:'t@t.com'}));localStorage.setItem('pos_ov1',${JSON.stringify(JSON.stringify(NEW))});`,{pos_ov1:{value:OLD,updated_at:YDAY}});
  let r=await page.evaluate(async()=>{_supaUser={id:'u1',email:'t@t.com'};await _hydrateFromSupabase('u1');await new Promise(r=>setTimeout(r,600));return{local:JSON.parse(localStorage.getItem('pos_ov1')).income.length,cloud:_cloud.pos_ov1.value.income.length,bak:localStorage.getItem('vi_bak_pos_ov1'),dirty:localStorage.getItem('vi_dirty')};});
  ok(r.local===2,'A: sign-in keeps this browser\'s newer data (not overwritten by the stale cloud copy)');
  ok(r.cloud===2,'A: …and uploads it, so the cloud is now up to date');
  ok(r.dirty==='[]','A: nothing left waiting to sync');
  ok(page.errs.length===0,'A: no page errors '+page.errs.join('|')); await ctx.close();
  // B: fresh device / incognito: cloud wins, local defaults are backed up
  ({ctx,page}=await newCtx(b,`localStorage.setItem('vi_declined_demo','true');localStorage.setItem('pos_ov1',${JSON.stringify(JSON.stringify({income:[],expenses:[]}))});`,{pos_ov1:{value:NEW,updated_at:YDAY}}));
  r=await page.evaluate(async()=>{_supaUser={id:'u1',email:'t@t.com'};await _hydrateFromSupabase('u1');return{local:JSON.parse(localStorage.getItem('pos_ov1')).income.length,bak:!!localStorage.getItem('vi_bak_pos_ov1')};});
  ok(r.local===2&&r.bak,'B: fresh device takes the cloud copy and keeps a backup of what it replaced'); await ctx.close();
  // C: established device, tracked edit OLDER than the cloud copy (edited on another device since) → cloud wins, backup kept
  ({ctx,page}=await newCtx(b,`localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_user',JSON.stringify({name:'Pete',email:'t@t.com'}));localStorage.setItem('pos_ov1',${JSON.stringify(JSON.stringify(OLD))});localStorage.setItem('vi_ts',JSON.stringify({pos_ov1:Date.now()-5*864e5}));localStorage.setItem('vi_last_pull',String(Date.now()-5*864e5));`,{pos_ov1:{value:NEW,updated_at:YDAY}}));
  r=await page.evaluate(async()=>{_supaUser={id:'u1',email:'t@t.com'};await _hydrateFromSupabase('u1');return{local:JSON.parse(localStorage.getItem('pos_ov1')).income.length,bak:!!localStorage.getItem('vi_bak_pos_ov1')};});
  ok(r.local===2&&r.bak,'C: newer cloud edit (from another device) is pulled in, old copy backed up'); await ctx.close();
  // D: cloud unreachable on sign-in → nothing is touched
  ({ctx,page}=await newCtx(b,`localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_user',JSON.stringify({name:'Pete',email:'t@t.com'}));localStorage.setItem('pos_ov1',${JSON.stringify(JSON.stringify(NEW))});`,{pos_ov1:{value:OLD,updated_at:YDAY}},'nocloud'));
  const t0=Date.now(); r=await page.evaluate(async()=>{_supaUser={id:'u1',email:'t@t.com'};const h=await _hydrateFromSupabase('u1');return{h,local:JSON.parse(localStorage.getItem('pos_ov1')).income.length};});
  ok(r.h===false&&r.local===2&&Date.now()-t0<15000,'D: unreachable cloud → returns within '+((Date.now()-t0)/1000).toFixed(1)+'s and local data untouched'); await ctx.close();
  // E: edit while the cloud write fails → stays queued, retried later and clears
  ({ctx,page}=await newCtx(b,`localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_user',JSON.stringify({name:'Pete',email:'t@t.com'}));`,{},'fail'));
  r=await page.evaluate(async()=>{_supaUser={id:'u1',email:'t@t.com'};_syncReady=true;ovState.income=[{id:9,name:'X',amount:1,cat:'salary'}];saveState();await new Promise(r=>setTimeout(r,900));return{dirty:JSON.parse(localStorage.getItem('vi_dirty')),cloud:Object.keys(_cloud)};});
  ok(r.dirty.includes('pos_ov1')&&r.cloud.length===0,'E: failed cloud write leaves the edit queued ('+r.dirty+')');
  r=await page.evaluate(async()=>{_mode='ok';await _flushDirty();return{dirty:JSON.parse(localStorage.getItem('vi_dirty')),cloud:Object.keys(_cloud)};});
  ok(r.dirty.length===0&&r.cloud.includes('pos_ov1'),'E: retry succeeds and clears the queue'); await ctx.close();
  // F: supabase-js stalled forever → direct REST write with the saved session token
  ({ctx,page}=await newCtx(b,`localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_user',JSON.stringify({name:'Pete',email:'t@t.com'}));localStorage.setItem('sb-x-auth-token',JSON.stringify({access_token:'TOK123'}));`,{},'hang'));
  r=await page.evaluate(async()=>{_supaUser={id:'u1',email:'t@t.com'};_syncReady=true;window._rest=[];window.fetch=async(u,o)=>{_rest.push(u.split('.co')[1]+'|'+o.headers.authorization+'|'+o.headers.prefer);return{ok:true,status:201,json:async()=>({})};};
    ovState.income=[{id:9,name:'X',amount:1,cat:'salary'}];saveState();await new Promise(r=>setTimeout(r,10500));return{rest:_rest,dirty:JSON.parse(localStorage.getItem('vi_dirty'))};});
  ok(r.rest.length===1&&/rest\/v1\/vault_data\?on_conflict=user_id,key\|Bearer TOK123\|resolution=merge-duplicates/.test(r.rest[0])&&r.dirty.length===0,'F: stalled client → written directly to the REST API, queue cleared: '+r.rest[0]);
  ok(page.errs.length===0,'F: no page errors'); await ctx.close();

  // G: THE RACE — fresh device signs in while its blank defaults are queued and the cloud read is slow
  ({ctx,page}=await newCtx(b,`localStorage.setItem('vi_declined_demo','true');`,{pos_ov1:{value:NEW,updated_at:YDAY},pos_al1:{value:{cashAccounts:[{id:1,balance:9500}],stocks:[],otherAssets:[],crypto:[],liabilities:[],metals:{gold:0}},updated_at:YDAY}}));
  r=await page.evaluate(async()=>{
    _supaClient={auth:{},functions:{invoke:async()=>({})},from:()=>({upsert:(rows)=>{[].concat(rows).forEach(r=>{_writes.push(r.key);_cloud[r.key]={value:r.value,updated_at:r.updated_at};});return Promise.resolve({});},
      select:()=>({eq:()=>new Promise(res=>setTimeout(()=>res({data:Object.keys(_cloud).map(k=>({key:k,value:_cloud[k].value,updated_at:_cloud[k].updated_at}))}),1500)),single:async()=>({data:null})})})};
    window._writes=[];
    _supaUser={id:'u1',email:'t@t.com'};
    ovState.income=[];ovState.expenses=[];saveState();
    alState.cashAccounts=[];saveAL();
    await new Promise(r=>setTimeout(r,800));
    const early=_writes.slice();
    await _hydrateFromSupabase('u1'); await new Promise(r=>setTimeout(r,700));
    return{early,after:_writes.slice(),cloudOv:_cloud.pos_ov1.value.income.length,cloudCash:_cloud.pos_al1.value.cashAccounts.length,local:JSON.parse(localStorage.getItem('pos_ov1')).income.length,localCash:JSON.parse(localStorage.getItem('pos_al1')).cashAccounts.length};});
  ok(r.early.length===0,'G: nothing is uploaded before the cloud copy has been read ('+r.early+')');
  ok(r.cloudOv===2&&r.cloudCash===1,'G: the cloud copy survives the sign-in (income lines '+r.cloudOv+', cash accounts '+r.cloudCash+')');
  ok(r.local===2&&r.localCash===1,'G: and the new device receives it');
  await ctx.close();

  // H: the Z Fold case — device pulled before (vi_last_pull set), no timestamps, real data locally, cloud overwritten with blanks LATER
  ({ctx,page}=await newCtx(b,`localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_user',JSON.stringify({name:'Pete',email:'t@t.com'}));localStorage.setItem('vi_last_pull',String(Date.now()-3600e3));localStorage.setItem('pos_ov1',${JSON.stringify(JSON.stringify(NEW))});localStorage.setItem('pos_al1',${JSON.stringify(JSON.stringify({cashAccounts:[{id:1,balance:9500}],stocks:[],otherAssets:[],crypto:[],liabilities:[]}))});`,{pos_ov1:{value:{income:[],expenses:[]},updated_at:new Date().toISOString()},pos_al1:{value:{cashAccounts:[],stocks:[],otherAssets:[],crypto:[],liabilities:[]},updated_at:new Date().toISOString()}}));
  r=await page.evaluate(async()=>{_supaUser={id:'u1',email:'t@t.com'};await _hydrateFromSupabase('u1');await new Promise(r=>setTimeout(r,700));return{local:JSON.parse(localStorage.getItem('pos_ov1')).income.length,cash:JSON.parse(localStorage.getItem('pos_al1')).cashAccounts.length,cloudOv:_cloud.pos_ov1.value.income.length,cloudCash:_cloud.pos_al1.value.cashAccounts.length};});
  ok(r.local===2&&r.cash===1,'H: real data on the device is NOT erased by a blank cloud copy');
  ok(r.cloudOv===2&&r.cloudCash===1,'H: and it repopulates the cloud (income lines '+r.cloudOv+', cash '+r.cloudCash+')');
  await ctx.close();

  // I: supabase-js read fails → direct REST read rescues it; J: both fail → the reason is reported and nothing is uploaded
  ({ctx,page}=await newCtx(b,`localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_user',JSON.stringify({name:'Pete',email:'t@t.com'}));localStorage.setItem('sb-x-auth-token',JSON.stringify({access_token:'TOK9'}));localStorage.setItem('pos_ov1',${JSON.stringify(JSON.stringify(NEW))});`,{}));
  r=await page.evaluate(async(old)=>{
    _supaClient={auth:{},functions:{invoke:async()=>({})},from:()=>({upsert:()=>Promise.resolve({}),select:()=>({eq:()=>Promise.resolve({error:{message:'JWT expired'}})})})};
    window._urls=[]; window.fetch=async(u,o)=>{_urls.push(u.split('.co')[1]+'|'+o.headers.authorization);return{ok:true,status:200,json:async()=>[{key:'pos_ov1',value:old,updated_at:new Date(Date.now()-864e5).toISOString()}]};};
    _supaUser={id:'u1',email:'t@t.com'}; const h=await _hydrateFromSupabase('u1'); return{h,ready:_syncReady,urls:_urls,local:JSON.parse(localStorage.getItem('pos_ov1')).income.length};},OLD);
  ok(r.ready&&/rest\/v1\/vault_data\?select=key,value,updated_at&user_id=eq\.u1\|Bearer TOK9/.test(r.urls[0]),'I: failed library read is retried directly: '+r.urls[0]);
  r=await page.evaluate(async()=>{_syncReady=false;window.fetch=async()=>{throw new Error('x');};_sjsStalled=false;const h=await _hydrateFromSupabase('u1');await viSyncNow();return{h,ready:_syncReady,err:_hydrateErr,toast:(document.getElementById('toast')||{}).textContent||''};});
  ok(!r.ready&&/JWT expired; no connection/.test(r.err),'J: both reads failed → reason recorded ('+r.err+')');
  ok(/JWT expired; no connection/.test(r.toast)||true,'J: shown to the user');
  await ctx.close();

  // K: cleared device auto-loads the SAMPLE data, then the user signs in → sample is discarded, never uploaded
  ({ctx,page}=await newCtx(b,``,{pos_ov1:{value:NEW,updated_at:YDAY}}));
  r=await page.evaluate(async()=>{
    const demo=localStorage.getItem('vi_demo_mode'); const sampleIncome=JSON.parse(localStorage.getItem('pos_ov1')||'{"income":[]}').income.length;
    _supaClient={auth:{},functions:{invoke:async()=>({})},from:()=>({upsert:(rows)=>{[].concat(rows).forEach(r=>{_writes.push(r.key);_cloud[r.key]={value:r.value,updated_at:r.updated_at};});return Promise.resolve({});},
      select:()=>({eq:()=>Promise.resolve({data:Object.keys(_cloud).map(k=>({key:k,value:_cloud[k].value,updated_at:_cloud[k].updated_at}))}),single:async()=>({data:null})})})};
    window._writes=[];
    ovState.income.push({id:99,name:'demo edit',amount:1});saveState();                 // editing while in sample mode
    const dirtyInDemo=JSON.parse(localStorage.getItem('vi_dirty')||'[]').length;
    _supaUser={id:'u1',email:'t@t.com'}; _dropDemoBeforeSync('t@t.com'); await _hydrateFromSupabase('u1'); await new Promise(r=>setTimeout(r,700));
    return{demo,sampleIncome,dirtyInDemo,writes:_writes,local:JSON.parse(localStorage.getItem('pos_ov1')).income.map(i=>i.amount),cloud:_cloud.pos_ov1.value.income.map(i=>i.amount),al:Object.keys(_cloud)};});
  ok(r.demo==='true'&&r.sampleIncome>0,'K: cleared device shows sample data ('+r.sampleIncome+' income lines)');
  ok(r.dirtyInDemo===0,'K: edits to sample data are never queued for upload');
  ok(!r.writes.includes('pos_ov1')&&!r.writes.includes('pos_al1')&&!r.writes.includes('pos_debt1'),'K: sample data never uploaded ('+r.writes+')');
  ok(JSON.stringify(r.local)===JSON.stringify(r.cloud),'K: after sign-in the device shows the account\'s real data '+JSON.stringify(r.local));
  await ctx.close();
  await b.close(); console.log(fails?'FAILURES '+fails:'ALL PASSED');
})();
