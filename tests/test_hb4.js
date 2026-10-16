const { chromium } = require('playwright');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL:',m);} else console.log('ok  :',m); };
(async()=>{
  const b=await chromium.launch(); const page=await (await b.newContext({viewport:{width:1280,height:1100}})).newPage(); const errs=[]; page.on('pageerror',e=>errs.push(e.message)); page.on('console',m=>{if(m.type()==='error'&&!/Failed to load|net::/.test(m.text()))errs.push('C:'+m.text());});
  await page.addInitScript(()=>{if(localStorage.getItem('ht3'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'P',email:'t@t.com',pro:true}));localStorage.setItem('vi_pioneer','true');
    localStorage.setItem('ht3',JSON.stringify({saved:37500,target:250000,houseType:'semi',houseMode:'purchased',mortgageBalance:212500,valuation:250000,purchase:{price:250000,deposit:37500,date:'2026-10-01'},deposits:[{amount:37500,date:'01/10/2026'}],prices:{semi:250000},calc:{over:300,_set:true,price:250000,dep:37500,bal:212500,val:250000}}));
    localStorage.setItem('pos_ov1',JSON.stringify({income:[{id:1,name:'Salary',amount:2000}],expenses:[{id:2,name:'Rent',amount:1200,type:'ce'}]}));});
  await page.goto('file:///home/user/Vault-It/index.html'); await page.waitForTimeout(1500);
  await page.addStyleTag({content:'#welcome-overlay,#login-overlay{display:none!important}'});
  await page.evaluate(()=>showTab('house')); await page.waitForTimeout(900);
  // Level 3 locked at 15% equity; threshold 25%
  ok(/Level 3 unlocks at/i.test(await page.locator('#hb-hud').innerText()),'locked card shown at 15% equity');
  await page.evaluate(()=>hbSetView(3)); ok(await page.evaluate(()=>hbView())===2,'cannot view Level 3 while locked');
  await page.evaluate(()=>{state.mortgageBalance=180000;save();updateUI();}); await page.waitForTimeout(300);
  ok(/Level 3 is ready/i.test(await page.locator('#hb-hud').innerText()),'unlock prompt at 28% equity');
  await page.evaluate(()=>hbUnlockL3()); await page.waitForTimeout(700);
  ok(await page.evaluate(()=>hbLevel()===3&&hbView()===3),'Level 3 unlocked and viewed');
  ok(await page.locator('#houseSvg #hb-ghost').count()===1,'upgrade home drawn as ghost');
  ok(/UPGRADE \d+% FUNDED/.test(await page.evaluate(()=>document.getElementById('houseSvg').textContent)),'funded label on scene');
  await page.evaluate(()=>hbOpenUpgrade()); await page.waitForTimeout(400);
  ok(await page.locator('#hbu-ov').count()===1,'planner opens');
  const set=async(k,v)=>page.evaluate(([k,v])=>{const e=document.getElementById('hbu-'+k);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));},[k,v]);
  await set('price','300000'); await set('region','eng'); await set('sale','250000'); await set('agentPct','1.5'); await set('saleLegal','1500'); await set('saleOther','500'); await set('buyLegal','1500'); await set('survey','600'); await set('moving','800'); await set('depPct','10'); await page.waitForTimeout(500);
  const o=await page.locator('#hbu-out').innerText();
  // net equity = 250000 - 3750 - 2000 - 180000 = 64250 ; SDLT 300k = 5000 ; costs 2900 ; deposit avail = 64250-5000-2900 = 56350
  ok(/64,250/.test(o),'net equity £64,250 shown'); ok(/56,350/.test(o),'deposit available £56,350');
  ok(/£5,000/.test(o),'SDLT £5,000 on £300k');
  await set('mode','let'); await page.waitForTimeout(400);
  ok(/£20,000/.test(await page.locator('#hbu-out').innerText()),'keep & let uses additional rates (£20,000)');
  await set('region','sco'); await page.waitForTimeout(400);
  ok(/£28,600/.test(await page.locator('#hbu-out').innerText()),'Scotland LBTT + ADS £28,600');
  await page.screenshot({path:'shots/hb4.png'});
  await page.evaluate(()=>hbCloseUpgrade()); await page.waitForTimeout(500);
  const up=await page.evaluate(()=>state.up); ok(up&&up.region==='sco'&&up.mode==='let'&&up.price===300000,'plan persisted in state.up');
  ok(/UPGRADE/.test(await page.locator('#hb-hud').innerText()),'Level 3 HUD summary');
  ok(errs.length===0,'no page errors '+errs.join('|'));
  await b.close(); console.log(fails?'FAILURES '+fails:'ALL PASSED');
})();
