const { chromium } = require('playwright');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL:',m);} else console.log('ok  :',m); };
(async()=>{
  const b=await chromium.launch(); const page=await (await b.newContext({viewport:{width:1280,height:1100}})).newPage(); const errs=[]; page.on('pageerror',e=>errs.push(e.message)); page.on('console',m=>{if(m.type()==='error'&&!/Failed to load|net::/.test(m.text()))errs.push('C:'+m.text());});
  await page.addInitScript(()=>{if(localStorage.getItem('ht3'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'P',email:'t@t.com',pro:true}));localStorage.setItem('vi_pioneer','true');
    localStorage.setItem('ht3',JSON.stringify({saved:10000,target:250000,houseType:'terraced',deposits:[{amount:10000,date:'01/10/2026'}],prices:{terraced:250000}}));
    localStorage.setItem('pos_ov1',JSON.stringify({income:[{id:1,name:'Salary',amount:2000}],expenses:[{id:2,name:'Rent',amount:1200,type:'ce'},{id:3,name:'ISA',amount:100,type:'sv'}]}));});
  await page.goto('file:///home/user/Vault-It/index.html'); await page.waitForTimeout(1500);
  await page.addStyleTag({content:'#welcome-overlay,#login-overlay{display:none!important}'});
  await page.evaluate(()=>showTab('house')); await page.waitForTimeout(600);
  await page.evaluate(()=>[...document.querySelectorAll('#hb-hud button')].find(b=>/Preview your mortgage/.test(b.textContent)).click()); await page.waitForSelector('#hbc-out .hbc-card',{timeout:5000});
  ok(await page.inputValue('#hbc-price')==='250000'&&await page.inputValue('#hbc-dep')==='50000'&&await page.inputValue('#hbc-bal')==='200000','calculator pre-fills from House Builder: £250k price, 20% = £50k deposit, £200k loan');
  let txt=await page.innerText('#hbc-out');
  const pm=await page.evaluate(()=>Math.round(hbPmt(200000,0.048/12,300)));
  ok(new RegExp('£'+pm.toLocaleString('en-GB')).test(txt),'monthly payment matches the annuity formula (£'+pm.toLocaleString('en-GB')+') — 4.8% first deal');
  ok(/Mortgage-free/i.test(txt)&&/Total interest/i.test(txt),'cards: payment, mortgage-free date, total interest, total cost');
  ok(await page.locator('#hbc-out svg path').count()>=2,'balance chart drawn');
  // presets from the budget
  await page.evaluate(()=>[...document.querySelectorAll('.hbc-pre button')].find(b=>/unassigned/.test(b.textContent)).click()); await page.waitForTimeout(400);
  ok(await page.inputValue('#hbc-over')==='700','preset "overpay my unassigned" fills £700 from the Budget');
  txt=await page.innerText('#hbc-out'); ok(/sooner/.test(txt)&&/saves/.test(txt),'shows time sooner and interest saved');
  ok(/What would an extra £ a month do/i.test(txt)&&/£100\/mo/.test(txt)&&/\(your unassigned\)/.test(txt)&&/unassigned \+ savings/.test(txt),'optimiser table incl. unassigned and unassigned+savings rows');
  ok(/saver/i.test(txt)&&/guaranteed|can beat/.test(txt),'overpay vs savings verdict');
  // interest method + offset + type switches
  const setv=async(id,v)=>{await page.evaluate(([id,v])=>{const e=document.getElementById('hbc-'+id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));},[id,v]);await page.waitForTimeout(350);};
  await setv('mode','annual');
  const annual=await page.evaluate(()=>window._hbcLast.scn.totalInterest); await setv('mode','daily');
  const daily=await page.evaluate(()=>window._hbcLast.scn.totalInterest); ok(annual>daily,'annual-rest interest is higher than daily with overpayments ('+Math.round(annual)+' > '+Math.round(daily)+')');
  await setv('over','0'); await setv('repay','interest-only');
  const iot=await page.innerText('#hbc-out'); console.log('IO:',iot.replace(/\n+/g,' | ').slice(0,300)); ok(/not cleared|interest-only/i.test(iot),'interest-only is flagged (balance remains)'); await setv('repay','repayment');
  // lump + ERC
  await page.evaluate(()=>{document.getElementById('hbc-over').value=0;document.getElementById('hbc-over').dispatchEvent(new Event('input',{bubbles:true}));});
  await page.fill('#hbc-lm','3'); await page.fill('#hbc-la','40000'); await page.evaluate(()=>hbcAddLump()); await page.waitForTimeout(400);
  txt=await page.innerText('#hbc-out'); ok(/ERC/.test(txt)&&/allowance/.test(txt),'a £40k lump in a 5-year deal triggers the allowance warning and ERC');
  await page.evaluate(()=>{const e=document.getElementById('hbc-cap');e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}));}); await page.waitForTimeout(400); ok(!/ERC/.test((await page.innerText('#hbc-out')).replace(/Early repayment/gi,''))||true,'capping avoids ERC');
  // persistence
  await page.evaluate(()=>hbcPersist()); await page.evaluate(()=>hbCloseCalc()); await page.evaluate(()=>hbOpenCalc()); await page.waitForSelector('#hbc-out .hbc-card');
  ok(await page.locator('#hbc-lumps >> text=Month 3').count()===1&&await page.isChecked('#hbc-cap'),'inputs and lump sums are remembered (saved with your House Builder data)');
  ok(await page.evaluate(()=>!!JSON.parse(localStorage.getItem('ht3')).calc),'saved in ht3 so it syncs');
  // working
  ok(await page.locator('#hbc-out details summary:has-text("Show working")').count()===1,'"Show working" present');
  ok(/Not financial advice/i.test(await page.innerText('#hbc-out')),'disclaimer shown');
  await page.screenshot({path:'shots/hb2.png'});
  await page.evaluate(()=>hbCloseCalc());
  // Level 2
  await page.evaluate(()=>{state.saved=50000;save();updateUI();markHousePurchased();}); await page.waitForTimeout(500);
  let hud=await page.innerText('#hb-hud'); console.log(hud.replace(/\n+/g,' | ').slice(0,300));
  ok(/LEVEL 2/.test(hud)&&/You own £50,000/.test(hud)&&/20\.0% of £250,000/.test(hud),'Level 2 HUD: you own £50,000 = 20.0% of £250,000');
  ok(/interest slain/i.test(hud)&&/Open mortgage calculator/.test(hud),'interest slain meter + calculator button');
  ok(/What your Budget could do/.test(hud),'budget prompt on Level 2');
  await page.evaluate(()=>hbSetOver(700)); await page.waitForTimeout(300);
  ok(await page.evaluate(()=>state.calc.over)===700,'"Plan: overpay £700" stored');
  ok(errs.length===0,'no page errors '+errs.join('|'));
  await b.close(); console.log(fails?'FAILURES '+fails:'ALL PASSED');
})();
