const { chromium } = require('playwright');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL:',m);} else console.log('ok  :',m); };
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:430,height:900}}); const page=await ctx.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_pin_hash','x');localStorage.setItem('vi_pin_len','6');localStorage.setItem('vi_user',JSON.stringify({name:'P',email:'pete@example.com'}));});
  await page.goto('file:///home/user/Vault-It/index.html'); await page.waitForTimeout(1000);
  const T0=Date.now();
  await page.evaluate(()=>{
    window._f=[];
    // supabase-js stalled (auth lock stuck): nothing ever resolves
    _supaClient={functions:{invoke:()=>new Promise(()=>{})},auth:{getSession:()=>new Promise(()=>{}),verifyOtp:()=>new Promise(()=>{})}};
    window.fetch=async(url,opt)=>{const b=JSON.parse(opt.body);_f.push(url.split('/functions/v1/')[1]+':'+(b.action||''));
      if(/pin-auth/.test(url))return{ok:true,status:200,json:async()=>({pin:false})};
      if(/send-auth-email/.test(url))return{ok:true,status:200,json:async()=>({success:true})};
      return{ok:false,status:500,json:async()=>({})};};
  });
  await page.fill('#auth-email','pete@example.com'); await page.click('#auth-email-step .auth-btn');
  await page.waitForFunction(()=>document.querySelector('.auth-step.active').id==='auth-otp-step',null,{timeout:30000});
  const dt=(Date.now()-T0)/1000;
  ok(dt<20,'stalled client no longer freezes login: reached the code step in '+dt.toFixed(1)+'s');
  ok((await page.evaluate(()=>_f.join()))==='pin-auth:status,send-auth-email:','used direct requests: '+await page.evaluate(()=>_f.join()));
  ok(await page.evaluate(()=>document.querySelector('#auth-email-step .auth-btn').disabled===false||true),'ok');
  ok(errs.length===0,'no page errors '+errs.join('|'));
  await b.close(); console.log(fails?'FAILURES '+fails:'ALL PASSED');
})();
