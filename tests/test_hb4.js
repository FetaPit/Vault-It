// Level 3 (plan your next home) is locked for everyone under Pro (owner, 1 Nov 2026). The chip is a locked PRO button, the card says
// it is coming later as part of Pro, hbSetView(3) and hbUnlockL3() only toast and change nothing, a saved level3 = true still shows Level 2.
// The upgrade planner's sums are kept for when it returns and are checked in tests/test_hb4_engine.js.
const { chromium } = require('playwright');
const routeThree=require('./three_route');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL:',m);} else console.log('ok  :',m); };
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:1280,height:1100},reducedMotion:'reduce'}); await routeThree(ctx); const page=await ctx.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(e.message)); page.on('console',m=>{if(m.type()==='error'&&!/Failed to load|net::/.test(m.text()))errs.push('C:'+m.text());});
  await page.addInitScript(()=>{if(localStorage.getItem('ht3'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'P',email:'t@t.com',pro:true}));localStorage.setItem('vi_pioneer','true');
    localStorage.setItem('ht3',JSON.stringify({saved:37500,target:250000,houseType:'semi',houseMode:'purchased',mortgageBalance:212500,valuation:250000,purchase:{price:250000,deposit:37500,date:'2026-10-01'},deposits:[{amount:37500,date:'01/10/2026'}],prices:{semi:250000},calc:{over:300,_set:true,price:250000,dep:37500,bal:212500,val:250000}}));
    localStorage.setItem('pos_ov1',JSON.stringify({income:[{id:1,name:'Salary',amount:2000}],expenses:[{id:2,name:'Rent',amount:1200,type:'ce'}]}));});
  await page.goto('file:///home/user/Vault-It/index.html'); await page.waitForTimeout(1500);
  await page.addStyleTag({content:'#welcome-overlay,#login-overlay{display:none!important}'});
  await page.evaluate(()=>showTab('house')); await page.waitForTimeout(900);
  const MSG='Level 3: plan your next home. Coming later as part of Pro.';
  const hud=()=>page.locator('#hb-hud').innerText();
  const toast=()=>page.evaluate(()=>{const t=document.getElementById('toast');const s={txt:t.textContent,show:t.classList.contains('show')};t.textContent='';t.classList.remove('show');return s;});
  ok(await page.evaluate(()=>hbLevel()===2&&hbView()===2),'a purchased house is on Level 2');
  // the chip: a locked PRO button
  const chip=await page.evaluate(()=>{const c=[...document.querySelectorAll('#hb-levels .hb-lv')].find(x=>/Level 3/.test(x.textContent));return c?{cls:c.className,txt:c.textContent,tag:c.tagName,title:c.title}:null;});
  ok(chip&&chip.tag==='BUTTON'&&/\block\b/.test(chip.cls)&&/🔒/.test(chip.txt)&&/PRO/.test(chip.txt),'Level 3 chip is a locked button with 🔒 and a PRO tag ('+(chip&&chip.txt)+')');
  ok(chip&&chip.title===MSG,'the chip says why');
  // the card
  let t=await hud();
  ok(t.includes(MSG)&&!/Level 3 unlocks at|Level 3 is ready|Unlock early/i.test(t),'the Level 3 card is locked: "'+MSG+'"');
  // clicking the chip / hbSetView(3) only toasts
  await page.evaluate(()=>{const c=[...document.querySelectorAll('#hb-levels .hb-lv')].find(x=>/Level 3/.test(x.textContent));c.click();}); await page.waitForTimeout(200);
  let ts=await toast(); ok(ts.show&&ts.txt===MSG,'clicking the chip toasts "'+ts.txt+'"');
  ok(await page.evaluate(()=>hbView()===2&&hbLevel()===2),'the view stays on Level 2');
  await page.evaluate(()=>hbSetView(3)); await page.waitForTimeout(200);
  ts=await toast(); ok(ts.show&&ts.txt===MSG&&await page.evaluate(()=>hbView()===2&&state.viewLevel!==3),'hbSetView(3) only toasts; the view stays at Level 2');
  // well past the old 25% threshold: still locked, and hbUnlockL3 changes nothing
  await page.evaluate(()=>{state.mortgageBalance=120000;save();updateUI();}); await page.waitForTimeout(300);
  t=await hud(); ok(t.includes(MSG)&&!/Level 3 is ready/i.test(t),'balance down to £120,000, well past the old 25% threshold: still locked (no unlock prompt)');
  const before=await page.evaluate(()=>localStorage.getItem('ht3'));
  await page.evaluate(()=>hbUnlockL3()); await page.waitForTimeout(400);
  ts=await toast(); ok(ts.show&&ts.txt===MSG,'hbUnlockL3() only toasts');
  ok(await page.evaluate(()=>!state.level3&&hbLevel()===2&&hbView()===2)&&await page.evaluate(()=>localStorage.getItem('ht3'))===before,'hbUnlockL3() does not change the state or the saved data');
  // a saved level3 = true (from before the lock) is kept but ignored
  await page.evaluate(()=>{state.level3=true;state.viewLevel=3;save();updateUI();}); await page.waitForFunction(()=>HB3DAPP.want&&HB3DAPP.want.mode==='equity',null,{timeout:20000}).catch(()=>{}); await page.waitForTimeout(400);
  const s=await page.evaluate(()=>({lv:hbLevel(),view:hbView(),kept:JSON.parse(localStorage.getItem('ht3')).level3,mode:HB3DAPP.want&&HB3DAPP.want.mode,up:!!(HB3DAPP.want&&HB3DAPP.want.upgrade),lab:(document.getElementById('hb3d-upglabel')||{style:{}}).style.display,ov:!!document.getElementById('hbu-ov'),hud:document.getElementById('hb-hud').innerText}));
  ok(s.lv===2&&s.view===2&&s.kept===true,'saved level3 = true is kept as saved but the house shows Level 2');
  ok(s.mode==='equity'&&!s.up&&s.lab!=='block','no upgrade build or "UPGRADE n% FUNDED" label');
  ok(!s.ov&&!/UPGRADE/.test(s.hud),'the upgrade planner does not open and the HUD has no upgrade summary');
  await page.screenshot({path:'shots/hb4.png'});
  ok(errs.length===0,'no page errors '+errs.join('|'));
  await b.close(); console.log(fails?'FAILURES '+fails:'ALL PASSED');
})();
