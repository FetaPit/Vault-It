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
  // top button next to + New pie opens the Add window
  const order=await page.$$eval('#stk-pies .stk-pie',els=>els.map(e=>e.innerText.trim()));
  ok(/\+ New pie/.test(order[order.length-2])&&/Add fund \/ share/.test(order[order.length-1]),'"Add fund / share" sits next to "+ New pie" at the top: '+order.slice(-2).join(' | '));
  await page.click('#stk-pies button:has-text("Add fund / share")'); await page.waitForSelector('#afs-sym');
  await page.fill('#afs-sym','blockchain'); await page.waitForSelector('#afs-suggest div',{timeout:4000});
  const sug=await page.innerText('#afs-suggest'); console.log(sug.replace(/\n+/g,' | '));
  ok(/iShares Blockchain Technology UCITS ETF/.test(sug)&&/BCHN\.L · London · ETF/.test(sug)&&/fund/.test(sug),'typing a name or ISIN suggests funds / ETFs / shares');
  ok(!(await page.innerHTML('#afs-suggest')).includes('<b>x</b>'),'names are escaped');
  await page.click('#afs-suggest div:first-child');
  ok((await page.inputValue('#afs-sym'))==='BCHN.L'&&(await page.inputValue('#afs-prov'))==='BlackRock (iShares)','picking a result fills the ticker and detects the provider (BlackRock)');
  await page.fill('#afs-amt','112.40'); await page.fill('#afs-plat','Monzo');
  await page.evaluate(()=>{document.getElementById('afs-pie').value='new';document.getElementById('afs-pie').dispatchEvent(new Event('change'));}); await page.fill('#afs-newpie','Blockchain Creators');
  await page.click('.stk-shot-ft .btn-add-data'); await page.waitForTimeout(900);
  const h=await page.evaluate(()=>({h:alState.stocks.find(x=>x.sym==='BCHN.L'),pie:alState.stockPies.find(p=>p.name==='Blockchain Creators'),active:alState.activePie}));
  ok(h.h&&Math.abs(h.h.units-10)<0.001,'£ held ÷ live price = units ('+(h.h&&h.h.units)+')');
  ok(h.h.provider==='BlackRock (iShares)'&&h.h.platform==='Monzo','provider and platform saved on the holding');
  ok(h.pie&&h.pie.platform&&h.pie.platform.name==='Monzo'&&h.active===h.pie.id,'new pie created with platform Monzo and selected');
  const tx=await page.innerText('#stk-holdings'); ok(/iShares Blockchain/.test(tx)&&/BlackRock \(iShares\)[\s\S]*on[\s\S]*Monzo/.test(tx),'holdings row shows name, provider and "on Monzo"');
  ok(/Monzo/.test(await page.innerHTML('#stk-pies')),'Monzo badge on the pie tile');
  // ISIN with no live price: still added, and says so
  await page.evaluate(()=>{_supaClient.functions.invoke=async(n,o)=>{ if(o.body.search)return{data:{results:[{symbol:'IE00B4L5Y983',name:'iShares Core MSCI World',exchange:'Frankfurt',type:'MUTUALFUND'}]},error:null}; if(o.body.history)return{data:{series:{}},error:null}; return{data:{quotes:{}},error:null};};});
  await page.click('#stk-pies button:has-text("Add fund / share")'); await page.fill('#afs-sym','IE00B4L5Y983'); await page.waitForSelector('#afs-suggest div'); await page.click('#afs-suggest div:first-child'); await page.fill('#afs-units','5'); await page.click('.stk-shot-ft .btn-add-data'); await page.waitForTimeout(1200);
  ok(await page.evaluate(()=>alState.stocks.some(x=>x.sym==='IE00B4L5Y983'&&x.units===5)),'an ISIN holding with no live price is still added');
  ok(/no live price was found/.test(await page.evaluate(()=>[...document.querySelectorAll('#toast, .toast')].map(e=>e.textContent).join(' '))),'…and the app tells you there is no live price (instead of silently showing £0)');
  // inline row at the bottom still works
  await page.evaluate(()=>{stkSelectPie(alState.stockPies[0].id);});
  // units path still works; unknown ticker with £ held explains
  await page.fill('#stk-sym','AAA'); await page.fill('#stk-units','3'); await page.click('#assets-stocks .btn-add-data'); await page.waitForTimeout(400);
  ok(await page.evaluate(()=>alState.stocks.some(x=>x.sym==='AAA'&&x.units===3)),'entering units still works');
  ok(errs.length===0,'no page errors '+errs.join('|'));
  await b.close(); console.log(fails?'FAILURES '+fails:'ALL PASSED');
})();
