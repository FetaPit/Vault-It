const { chromium } = require('playwright');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL:',m);} else console.log('ok  :',m); };
(async()=>{
  const b=await chromium.launch(); const page=await (await b.newContext({viewport:{width:1280,height:1100}})).newPage(); const errs=[]; page.on('pageerror',e=>errs.push(e.message)); page.on('console',m=>{if(m.type()==='error'&&!/Failed to load|net::/.test(m.text()))errs.push('C:'+m.text());});
  await page.addInitScript(()=>{if(localStorage.getItem('ht3'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'P',email:'t@t.com',pro:true}));localStorage.setItem('vi_pioneer','true');
    localStorage.setItem('ht3',JSON.stringify({saved:37500,target:250000,houseType:'semi',houseMode:'purchased',depositPct:15,mortgageBalance:191250,valuation:250000,purchase:{price:250000,deposit:37500,depositTarget:37500,date:'2026-10-01'},deposits:[{amount:37500,date:'01/10/2026'}],prices:{semi:250000},calc:{over:300,_set:true,price:250000,dep:37500,bal:212500,val:250000}}));
    localStorage.setItem('pos_ov1',JSON.stringify({income:[{id:1,name:'Salary',amount:2000}],expenses:[{id:2,name:'Rent',amount:1200,type:'ce'}]}));});
  await page.goto('file:///home/user/Vault-It/index.html'); await page.waitForTimeout(1500);
  await page.addStyleTag({content:'#welcome-overlay,#login-overlay{display:none!important}'});
  await page.evaluate(()=>showTab('house')); await page.waitForTimeout(900);
  ok(await page.locator('#houseSvg #hb-solid').count()===1&&await page.locator('#houseSvg #hb-ghostL2').count()===1,'Level 2 draws a solid layer and a ghost layer');
  const info=await page.evaluate(()=>{const s=document.getElementById('hb-solid').getBBox(),c=document.querySelector('#hb-eqclip rect');return{bh:s.height,ch:+c.getAttribute('height')-8,y:+c.getAttribute('y'),by:s.y,eq:hbL2Progress()};});
  ok(Math.abs(info.ch/info.bh-info.eq)<0.01,'solid height = share of the Level 2 house paid off ('+(info.ch/info.bh*100).toFixed(1)+'% vs '+(info.eq*100)+'%)');
  const lab=await page.evaluate(()=>[...document.querySelectorAll('#houseSvg text')].map(t=>t.textContent).join(' | ')); console.log(lab);
  ok(/MORTGAGE 10% PAID/.test(lab),'"MORTGAGE 10% PAID" label on the paid-off line (owner rule: £21,250 of £212,500)');
  ok(/INTEREST/.test(lab)&&await page.locator('#hb-intbar rect').count()>=2,'separate interest bar beside the house');
  ok(/slain/.test(lab),'interest slain shown on the bar (plan overpays £300)');
  // paying down the balance raises the solid share
  await page.evaluate(()=>{state.mortgageBalance=127500;save();updateUI();}); await page.waitForTimeout(500);
  const info2=await page.evaluate(()=>{const s=document.getElementById('hb-solid').getBBox(),c=document.querySelector('#hb-eqclip rect');return(+c.getAttribute('height')-8)/s.height;});
  ok(Math.abs(info2-0.4)<0.01,'balance £127,500 (£85,000 of £212,500 paid) → 40% solid ('+(info2*100).toFixed(1)+'%)');
  ok(await page.locator('#houseSvg [id="hb-ghost"]').count()===0,'no Level-1 ghost wrapper in Level 2');
  await page.screenshot({path:'shots/hb3.png'});
  // mortgage free → complete house
  await page.evaluate(()=>{state.mortgageBalance=0;save();updateUI();}); await page.waitForTimeout(400);
  ok(errs.length===0,'no page errors '+errs.join('|'));
  await b.close(); console.log(fails?'FAILURES '+fails:'ALL PASSED');
})();
