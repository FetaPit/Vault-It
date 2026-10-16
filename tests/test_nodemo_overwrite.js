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
const REAL_DEBT={debts:[{id:1792143861287,name:'Virgin Credit Card',balance:2502.41,original:2502.41,rate:0,min:60,type:'credit'}]};
const DEMO_DEBT={debts:[{id:1,name:'Student Loan Plan 2',balance:24300,original:38000,rate:7.1,minPay:180,type:'loan'},{id:2,name:'Barclaycard',balance:1850,original:3200,rate:24.9,minPay:55,type:'credit'}]};
const DEMO_HT3={saved:22500,target:240000,houseType:'terraced',deposits:[{date:'01/10/2025',amount:5000},{date:'01/11/2025',amount:4500},{date:'01/12/2025',amount:3500},{date:'01/01/2026',amount:4000},{date:'01/02/2026',amount:3200},{date:'01/03/2026',amount:2300}]};
(async()=>{
  const b=await chromium.launch();
  // a stale device: sample data on it, NO demo flag, newer-looking timestamps, real user — the cloud holds the real figures
  const init=`localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_user',JSON.stringify({name:'Pete',email:'t@t.com'}));
    localStorage.setItem('pos_debt1',${JSON.stringify(JSON.stringify(DEMO_DEBT))});localStorage.setItem('ht3',${JSON.stringify(JSON.stringify(DEMO_HT3))});
    localStorage.setItem('vi_ts',JSON.stringify({pos_debt1:Date.now()+5000,ht3:Date.now()+5000}));localStorage.setItem('vi_dirty',JSON.stringify(['pos_debt1','ht3']));`;
  let {ctx,page}=await newCtx(b,init,{pos_debt1:{value:REAL_DEBT,updated_at:YDAY},ht3:{value:{saved:8538.55,target:100000,deposits:[{date:'16/10/2026',amount:8538.55}],houseType:'terraced'},updated_at:YDAY}});
  const r=await page.evaluate(async()=>{_supaUser={id:'u1',email:'t@t.com'};await _hydrateFromSupabase('u1');await new Promise(r=>setTimeout(r,900));
    return{local:JSON.parse(localStorage.getItem('pos_debt1')).debts.map(d=>d.name),cloud:_cloud.pos_debt1.value.debts.map(d=>d.name),ht3:JSON.parse(localStorage.getItem('ht3')).saved,cloudHt3:_cloud.ht3.value.saved};});
  console.log(JSON.stringify(r));
  ok(r.local.length===1&&r.local[0]==='Virgin Credit Card','sample debts on a stale device do not replace the real ones locally');
  ok(r.cloud.length===1&&r.cloud[0]==='Virgin Credit Card','…and are never uploaded over the account');
  ok(r.ht3===8538.55&&r.cloudHt3===8538.55,'sample house deposits likewise');
  ok(page.errs.length===0,'no page errors '+page.errs.join('|')); await ctx.close();
  // _completeAuth with demo mode still on discards the sample data
  ({ctx,page}=await newCtx(b,`if(!localStorage.getItem('vi_user')){localStorage.setItem('vi_demo_mode','true');localStorage.setItem('vi_user',JSON.stringify({name:'Alex',email:'demo@vault-it.app'}));localStorage.setItem('pos_debt1',${JSON.stringify(JSON.stringify(DEMO_DEBT))});}`,{}));
  await page.evaluate(()=>{_completeAuth('t@t.com');}); await page.waitForTimeout(1500);
  const d=await page.evaluate(()=>({demo:localStorage.getItem('vi_demo_mode'),debt:localStorage.getItem('pos_debt1')}));
  ok(d.demo!=='true'&&(!d.debt||!/Student Loan Plan 2/.test(d.debt)),'sign-in with sample data present wipes it instead of adopting it ('+JSON.stringify(d).slice(0,80)+')'); await ctx.close();
  await b.close(); console.log(fails?'FAILURES '+fails:'ALL PASSED');
})();
