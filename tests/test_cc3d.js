const { chromium } = require('playwright');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL:',m);} else console.log('ok  :',m); };
const fs=require('fs');
(async()=>{
  const b=await chromium.launch(); const page=await (await b.newContext({viewport:{width:900,height:1000}})).newPage(); const errs=[]; page.on('pageerror',e=>{errs.push(e.message);console.log('PAGEERR',e.message.slice(0,200));});
  await page.addInitScript(()=>{if(localStorage.getItem('pos_debt1'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'T',email:'t@t.com'}));
    localStorage.setItem('pos_debt1',JSON.stringify({debts:[
      {id:1,name:'Barclaycard Platinum',original:2000,balance:1200,rate:21.9,min:40,type:'credit'},
      {id:2,name:'Monzo Flex',original:500,balance:500,rate:0,min:20,type:'credit'},
      {id:3,name:'Amex Gold',original:3000,balance:600,rate:29,min:30,type:'credit'},
      {id:4,name:'Axis Bank Credit Card',original:222,balance:222,rate:42,min:19,type:'credit'},
      {id:5,name:'Some Visa card',original:900,balance:900,rate:19,min:25,type:'credit'},
      {id:6,name:'Car finance',original:8000,balance:5000,rate:7,min:200,type:'car'}]}));});
  await page.goto('file:///home/user/Vault-It/index.html'); await page.waitForTimeout(1500);
  await page.addStyleTag({content:'#welcome-overlay,#login-overlay{display:none!important}'});
  await page.evaluate(()=>showTab('debt')); await page.waitForTimeout(900);
  ok(await page.locator('.cc3').count()===5,'five 3D cards (loan has none)');
  const r=await page.evaluate(()=>{const e=document.querySelector('.cc3').getBoundingClientRect();return e.width/e.height;});
  ok(Math.abs(r-85.6/53.98)<0.02,'card is in ID-1 proportion ('+r.toFixed(3)+' vs 1.586)');
  const brand=await page.evaluate(()=>[1,2,3,4,5].map(i=>{const d=debtState.debts.find(x=>x.id===i);const b=ccBrand(d);return(b&&b.n)+'/'+ccNetwork(d,b);}));
  console.log(brand.join(' | '));
  ok(brand[0].startsWith('Barclaycard')&&brand[1].startsWith('Monzo')&&brand[2]==='American Express/amex'&&brand[3].startsWith('Axis')&&brand[4]==='Visa/visa','names are scanned for the issuer and network');
  await page.locator('.debt-card-grid').screenshot({path:'shots/cc3d.png'});
  // drag rotates
  const box=await page.locator('.cc3').first().boundingBox();
  const ry0=await page.evaluate(()=>document.querySelector('.cc3-body').style.getPropertyValue('--ry'));
  await page.mouse.move(box.x+40,box.y+40);await page.mouse.down();await page.mouse.move(box.x+140,box.y+40,{steps:5});await page.mouse.up();
  const ry1=await page.evaluate(()=>document.querySelector('.cc3-body').style.getPropertyValue('--ry'));
  ok(ry1&&ry1!==ry0,'drag rotates the card ('+ry0+' → '+ry1+')');
  await page.evaluate(()=>ccFlipId(1)); await page.waitForTimeout(600);
  const fl=await page.evaluate(()=>parseFloat(document.querySelector('.cc3[data-id="1"] .cc3-body').style.getPropertyValue('--ry')));
  ok(Math.abs(Math.abs(fl%360)-180)<1,'flip shows the back ('+fl+'°)');
  await page.screenshot({path:'shots/cc3d_flip.png',clip:{x:0,y:200,width:900,height:500}});
  // edit: issuer scan + photo imprint
  await page.evaluate(()=>ccOpenEdit(5)); await page.waitForTimeout(300);
  await page.fill('#cc-issuer','Halifax'); await page.fill('#cc-last4','4821');
  const png=fs.readFileSync('/home/user/Vault-It/shots/hb1.png');
  await page.setInputFiles('#cc-ov input[type=file] >> nth=0',{name:'card.png',mimeType:'image/png',buffer:png}); await page.waitForTimeout(600);
  ok(await page.evaluate(()=>_ccEdit.art.startsWith('data:image/jpeg')),'photo imprinted (cropped to card ratio)');
  const dims=await page.evaluate(()=>new Promise(r=>{const i=new Image();i.onload=()=>r(i.width/i.height);i.src=_ccEdit.art;}));
  ok(Math.abs(dims-1.586)<0.01,'imprinted image has the card ratio');
  await page.evaluate(()=>ccSaveEdit()); await page.waitForTimeout(400);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pos_debt1')).debts.find(x=>x.id===5).card);
  ok(saved&&saved.issuer==='Halifax'&&saved.last4==='4821'&&saved.art,'card design saved with the debt');
  ok(await page.locator('.cc3[data-id="5"] .cc3-front[style*="url("]').count()===1,'front uses the photo');
  ok(errs.length===0,'no page errors '+errs.join('|'));
  await b.close(); console.log(fails?'FAILURES '+fails:'ALL PASSED');
})();
