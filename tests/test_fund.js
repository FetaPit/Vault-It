const { chromium } = require('playwright');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL:',m);} else console.log('ok  :',m); };
(async()=>{
  const b=await chromium.launch(); const page=await (await b.newContext({viewport:{width:1280,height:1000}})).newPage(); const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'P',email:'t@t.com'}));localStorage.setItem('vi_fx_rates',JSON.stringify({USD:1.25}));});
  await page.goto('file:///home/user/Vault-It/index.html'); await page.waitForTimeout(1200);
  await page.addStyleTag({content:'#welcome-overlay,#login-overlay{display:none!important}'});
  await page.evaluate(()=>{window._s=[];
    _supaClient={auth:{},functions:{invoke:async(n,o)=>{ if(o.body.search){_s.push(o.body.search);return{data:{results:[{symbol:'BCHN.L',name:'iShares Blockchain Technology UCITS ETF',exchange:'London',type:'ETF'},{symbol:'IE00BYZK4552',name:'iShares Automation & Robotics <b>x</b>',exchange:'London',type:'MUTUALFUND'}]},error:null};}
      if(o.body.history)return{data:{series:{}},error:null};
      const q={};(o.body.symbols||[]).forEach(x=>{q[x]={price:x==='BCHN.L'?1124:100,currency:x==='BCHN.L'?'GBp':'GBP',name:x,changePct:0};});return{data:{quotes:q},error:null};}}};
    showTab('assets');showSubtab('assets','stocks',null);});
  await page.click('button:has-text("Add fund / share")'); await page.waitForTimeout(600);
  ok(await page.evaluate(()=>document.activeElement&&document.activeElement.id==='stk-sym'),'the Add fund / share button jumps to the search box and focuses it');
  await page.fill('#stk-sym','blockchain'); await page.waitForSelector('#stk-suggest div',{timeout:4000});
  const sug=await page.innerText('#stk-suggest'); console.log(sug.replace(/\n+/g,' | '));
  ok(/iShares Blockchain Technology UCITS ETF/.test(sug)&&/BCHN\.L · London · ETF/.test(sug)&&/fund/.test(sug),'typing a name suggests matching funds / ETFs / shares with type');
  ok(!(await page.innerHTML('#stk-suggest')).includes('<b>x</b>'),'fund names are escaped');
  await page.click('#stk-suggest div:first-child');
  ok((await page.inputValue('#stk-sym'))==='BCHN.L','picking a result fills the ticker');
  await page.fill('#stk-amt','112.40'); await page.click('#assets-stocks .btn-add-data'); await page.waitForTimeout(800);
  const h=await page.evaluate(()=>alState.stocks.find(x=>x.sym==='BCHN.L'));
  ok(h&&Math.abs(h.units-10)<0.001,'£ held ÷ live price = units (£112.40 ÷ £11.24 = '+(h&&h.units)+')');
  ok(h&&h.name==='iShares Blockchain Technology UCITS ETF','fund name saved');
  ok(/iShares Blockchain/.test(await page.innerText('#stk-holdings')),'shown in the holdings with its live price');
  // units path still works; unknown ticker with £ held explains
  await page.fill('#stk-sym','AAA'); await page.fill('#stk-units','3'); await page.click('#assets-stocks .btn-add-data'); await page.waitForTimeout(400);
  ok(await page.evaluate(()=>alState.stocks.some(x=>x.sym==='AAA'&&x.units===3)),'entering units still works');
  ok(errs.length===0,'no page errors '+errs.join('|'));
  await b.close(); console.log(fails?'FAILURES '+fails:'ALL PASSED');
})();
