const { chromium } = require('playwright');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL:',m);} else console.log('ok  :',m); };
(async()=>{
  const b=await chromium.launch(); const page=await (await b.newContext({viewport:{width:640,height:1100}})).newPage(); const errs=[]; page.on('pageerror',e=>errs.push(e.message)); page.on('dialog',d=>d.accept());
  await page.addInitScript(()=>{if(localStorage.getItem('pos_al1'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'P',email:'t@t.com'}));
   localStorage.setItem('pos_al1',JSON.stringify({stocks:[{id:1,pie:1,sym:'SONY',units:5,avgCost:30,price:38},{id:2,pie:2,sym:'BLKC.AS',name:'iShares Blockchain',units:0,price:0},{id:3,pie:1,sym:'TTWO',units:2,price:100}],stockPies:[{id:1,name:'ISA'},{id:2,name:'iShares Blockchain Creators',kind:'fund'}],activePie:2,cashAccounts:[],otherAssets:[],crypto:[],liabilities:[],metals:{}}));});
  await page.goto('file:///home/user/Vault-It/index.html'); await page.waitForTimeout(1200);
  await page.addStyleTag({content:'#welcome-overlay,#login-overlay{display:none!important}'});
  await page.evaluate(()=>{showTab('assets');showSubtab('assets','stocks',null);}); await page.waitForTimeout(500);
  ok(/Delete fund/.test(await page.innerText('#stk-main')),'a labelled "🗑 Delete fund" button is shown on the fund');
  await page.screenshot({path:'shots/del.png'});
  await page.click('#stk-main button:has-text("Delete fund")'); await page.waitForTimeout(400);
  const r=await page.evaluate(()=>({pies:alState.stockPies.map(p=>p.name),stocks:alState.stocks.map(h=>h.sym),active:alState.activePie}));
  ok(r.pies.join()==='ISA'&&r.stocks.join()==='SONY,TTWO'&&r.active==='all','fund and its holding deleted; back to All investments');
  // remove a single holding with the labelled button
  await page.click('.stk-row button:has-text("Remove")'); await page.waitForTimeout(300);
  ok(await page.evaluate(()=>alState.stocks.length)===1,'"🗑 Remove" deletes one holding');
  ok(errs.length===0,'no page errors '+errs.join('|'));
  await b.close(); console.log(fails?'FAILURES '+fails:'ALL PASSED');
})();
