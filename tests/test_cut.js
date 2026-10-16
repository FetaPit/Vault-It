const { chromium } = require('playwright');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL:',m);} else console.log('ok  :',m); };
(async()=>{
  const b=await chromium.launch(); const page=await (await b.newContext({viewport:{width:900,height:1000}})).newPage(); const errs=[]; page.on('pageerror',e=>{errs.push(e.message);console.log('PAGEERR',e.message.slice(0,150));});
  await page.addInitScript(()=>{if(localStorage.getItem('pos_debt1'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'T',email:'t@t.com'}));
    localStorage.setItem('pos_debt1',JSON.stringify({debts:[{id:1,name:'Barclaycard Platinum',original:2000,balance:1100,rate:21.9,min:40,type:'credit'},{id:2,name:'Monzo Flex',original:500,balance:500,rate:0,min:20,type:'credit'}]}));});
  await page.goto('file:///home/user/Vault-It/index.html'); await page.waitForTimeout(1500);
  await page.addStyleTag({content:'#welcome-overlay,#login-overlay{display:none!important}'});
  await page.evaluate(()=>showTab('debt')); await page.waitForTimeout(700);
  const sel='.cc3[data-id="1"]';
  const clip=()=>page.evaluate(s=>({base:document.querySelector(s+' .cc3-base').getBoundingClientRect().width,cs:getComputedStyle(document.querySelector(s+' .cc3-base')).clipPath,pc:getComputedStyle(document.querySelector(s+' .cc3-piece')).clipPath,scis:getComputedStyle(document.querySelector(s+' .cc3-scis')).opacity,top:document.querySelector(s+' .cc3-scis').getBoundingClientRect().top}),sel);
  // 45% paid → starts uncut, scissors travel slowly, then grey piece
  const c0=await clip(); console.log('t0',JSON.stringify(c0));
  await page.waitForTimeout(1500); await page.locator(sel).screenshot({path:'shots/cut_mid1.png'}); const c1=await clip(); console.log('t1.5s',JSON.stringify(c1));
  await page.waitForTimeout(2200); const c2=await clip(); await page.locator(sel).screenshot({path:'shots/cut_mid2.png'}); console.log('t3.7s',JSON.stringify(c2));
  ok(c1.scis>0.5&&c2.top>c1.top,'scissors are visible and travelling down the cut line (slowly)');
  await page.waitForTimeout(3500);
  const c3=await clip(); await page.locator(sel).screenshot({path:'shots/cut_done.png'}); console.log('done',JSON.stringify(c3));
  ok(/inset\(0px 45%|inset\(0 45%|45%/.test(c3.cs),'55% left in colour, 45% cut: '+c3.cs);
  const ct=await page.evaluate(()=>getComputedStyle(document.querySelector('.cc3[data-id="1"] .cc3-piece')).filter);
  ok(/grayscale/.test(ct),'cut-off part is greyed');
  // pay £200 → 55% paid; undo → back to 45
  await page.fill('#debt-pay-inp-1','200'); await page.evaluate(()=>makePayment(1)); await page.waitForTimeout(500);
  let d=await page.evaluate(()=>debtState.debts.find(x=>x.id===1)); ok(d.balance===900&&d.payments.length===1,'payment recorded (balance £900)');
  ok(await page.locator('#debt-list-el button:has-text("Undo")').count()>=1,'undo button shown');
  await page.waitForTimeout(6500);
  ok(/55%/.test((await clip()).cs),'cut extended to 55% after the payment');
  await page.evaluate(()=>undoPayment(1)); await page.waitForTimeout(3000);
  d=await page.evaluate(()=>debtState.debts.find(x=>x.id===1)); ok(d.balance===1100&&!d.payments,'undo restores £1,100 and removes the record');
  ok(/45%/.test((await clip()).cs),'cut shrinks back to 45%');
  ok(await page.locator('#debt-list-el button:has-text("Undo")').count()===0,'no undo button when nothing to undo');
  ok(errs.length===0,'no page errors');
  await b.close(); console.log(fails?'FAILURES '+fails:'ALL PASSED');
})();
