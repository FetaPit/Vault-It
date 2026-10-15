const { chromium } = require('playwright');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL:',m);} else console.log('ok  :',m); };
(async()=>{
  const b=await chromium.launch(); const page=await (await b.newContext()).newPage(); const errs=[]; page.on('pageerror',e=>errs.push(e.message)); page.on('dialog',d=>d.accept());
  await page.addInitScript(()=>{localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e9}));localStorage.setItem('vi_user',JSON.stringify({name:'P',email:'t@t.com'}));localStorage.setItem('pos_ov1',JSON.stringify({income:[{amount:3800}],expenses:[]}));});
  await page.goto('file:///home/user/Vault-It/index.html'); await page.waitForTimeout(1200);
  const r=await page.evaluate(async()=>{window._del=null;
    _supaClient={auth:{},functions:{invoke:async()=>({})},from:()=>({delete:()=>({eq:(c,v)=>({in:(c2,keys)=>{_del={uid:v,keys};return Promise.resolve({});}})})})};
    _supaUser={id:'u1',email:'t@t.com'}; window.location.reload=()=>{}; 
    resetVaultData(); await new Promise(r=>setTimeout(r,500));
    return{del:_del,local:localStorage.getItem('pos_ov1')};});
  ok(r.del&&r.del.uid==='u1'&&r.del.keys.includes('pos_ov1')&&r.del.keys.includes('pos_al1')&&!r.del.keys.includes('vi_user'),'reset deletes the financial areas from the account (not the profile)');
  ok(r.local===null,'and clears them on the device');
  ok(errs.length===0,'no page errors '+errs.join('|'));
  await b.close(); console.log(fails?'FAILURES '+fails:'ALL PASSED');
})();
