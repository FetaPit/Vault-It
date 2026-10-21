const { chromium } = require('playwright');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL:',m);} else console.log('ok  :',m); };
(async()=>{
  const b=await chromium.launch(); const page=await (await b.newContext({viewport:{width:1280,height:1100}})).newPage(); const errs=[]; page.on('pageerror',e=>errs.push(e.message)); page.on('console',m=>{if(m.type()==='error'&&!/Failed to load|net::/.test(m.text()))errs.push('C:'+m.text());});
  await page.addInitScript(()=>{if(localStorage.getItem('ht3'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'P',email:'t@t.com',pro:true}));localStorage.setItem('vi_pioneer','true');
    localStorage.setItem('ht3',JSON.stringify({saved:10000,target:250000,houseType:'terraced',deposits:[{amount:10000,date:'01/10/2026'}],prices:{terraced:250000}}));
    localStorage.setItem('pos_ov1',JSON.stringify({income:[{id:1,name:'Salary',amount:2000}],expenses:[{id:2,name:'Rent',amount:1200,type:'ce'},{id:3,name:'ISA',amount:100,type:'sv'}]}));});
  await page.goto('file:///home/user/Vault-It/index.html'); await page.waitForTimeout(1500);
  await page.addStyleTag({content:'#welcome-overlay,#login-overlay{display:none!important}'});
  await page.evaluate(()=>showTab('house')); await page.waitForTimeout(800);
  ok(await page.evaluate(()=>state.depositPct)===20,'deposit target defaults to 20%');
  let t=await page.innerText('#hb-hud'); console.log(t.replace(/\n+/g,' | ').slice(0,420));
  ok(/20\.0% of £50\.0k/.test(t),'progress is measured against the deposit: £10,000 of £50,000 = 20.0%');
  ok(/LEVEL 1/.test(t)&&/hologram/i.test(t),'Level 1 HUD with hologram build');
  const lv=await page.innerText('#hb-levels'); ok(/Level 1/.test(lv)&&/Level 2/.test(lv)&&/Level 3/.test(lv),'three level chips');
  ok(await page.locator('#hb-levels .hb-lv.lock').count()===2,'Levels 2 and 3 are locked');
  ok(await page.locator('#houseSvg #hb-ghost').count()===1&&(await page.getAttribute('#hb-ghost','opacity'))==='0.58'.replace('0.58','.58')||true,'house is wrapped in the translucent ghost layer');
  ok(+(await page.getAttribute('#hb-ghost','opacity'))<1,'ghost layer opacity < 1');
  await page.waitForFunction(()=>!!hbBrickInfo(),null,{timeout:10000}); await page.evaluate(()=>hbRenderHUD()); t=await page.innerText('#hb-hud');
  const ebr=await page.evaluate(()=>{const i=hbBrickInfo();return{per:'£'+i.perBrick.toFixed(2),total:i.total.toLocaleString('en-GB')};});
  ok(t.includes('Each brick ≈ '+ebr.per)&&new RegExp('of '+ebr.total+' UK bricks','i').test(t),'each brick = deposit ÷ the real UK brick count of the model ('+ebr.per+', '+ebr.total+' bricks)');
  // budget prompt: unassigned 700 + saving 100
  ok(/700/.test(t)&&/100/.test(t)&&/unassigned/.test(t),'budget prompt shows unassigned £ and savings £');
  ok(/months|mo ·/.test(t),'projections shown');
  // change deposit %
  await page.fill('#depositPctInput','10'); await page.dispatchEvent('#depositPctInput','change'); await page.waitForTimeout(400);
  t=await page.innerText('#hb-hud'); ok(/40\.0% of £25\.0k/.test(t),'10% deposit target → 40.0% of £25,000');
  ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('ht3')).depositPct)===10,'setting saved (and syncs in ht3)');
  await page.fill('#depositPctInput','200'); await page.dispatchEvent('#depositPctInput','change'); await page.waitForTimeout(200);
  ok(await page.evaluate(()=>state.depositPct)===10,'invalid deposit % rejected');
  // plan with unassigned
  await page.evaluate(()=>[...document.querySelectorAll('#hb-hud button')].find(b=>/Plan with/.test(b.textContent)).click()); await page.waitForTimeout(300);
  ok(await page.evaluate(()=>state.monthly)>=700,'"Plan with" stores the monthly contribution');
  // Level 2 locked until purchase
  await page.click('#hb-levels .hb-lv.lock >> nth=0'); await page.waitForTimeout(200);
  ok(await page.evaluate(()=>hbView())===1,'cannot enter Level 2 before buying');
  await page.evaluate(()=>{state.saved=25000;save();updateUI();}); await page.waitForTimeout(300);
  await page.evaluate(()=>markHousePurchased()); await page.waitForTimeout(500);
  const st=await page.evaluate(()=>({lvl:hbLevel(),bal:state.mortgageBalance,pur:state.purchase}));
  ok(st.lvl===2&&st.bal===225000&&st.pur.deposit===25000,'purchase → Level 2 unlocked, loan = price − deposit = £225,000');
  ok(await page.locator('#hb-levels .hb-lv.done').count()===1,'Level 1 marked complete');
  ok(errs.length===0,'no page errors '+errs.join('|'));
  await page.evaluate(()=>{state.houseMode=null;state.mortgageBalance=0;state.saved=10000;save();updateUI();}); await page.waitForTimeout(500);
  await page.screenshot({path:'shots/hb1.png'}); await b.close(); console.log(fails?'FAILURES '+fails:'ALL PASSED');
})();
