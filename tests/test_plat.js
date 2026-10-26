const { chromium } = require('playwright');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL:',m);} else console.log('ok  :',m); };
const IMGS=[require('path').join(__dirname,'fixtures','portfolio_screenshot.png')];
(async()=>{
  const b=await chromium.launch(); const page=await (await b.newContext({viewport:{width:1280,height:1000}})).newPage(); const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.addInitScript(()=>{localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'P',email:'t@t.com'}));localStorage.setItem('vi_fx_rates',JSON.stringify({USD:1.25}));
    if(!localStorage.getItem('pos_al1'))localStorage.setItem('pos_al1',JSON.stringify({stocks:[{id:1,pie:5,sym:'AAPL',units:1,price:100}],stockPies:[{id:5,name:'Trading 212 Pie'},{id:6,name:'Fun money'}],cashAccounts:[],otherAssets:[],crypto:[],liabilities:[],metals:{}}));});
  await page.goto('file:///home/user/Vault-It/index.html'); await page.waitForTimeout(1500);
  await page.addStyleTag({content:'#welcome-overlay,#login-overlay{display:none!important}'});
  await page.evaluate(()=>{showTab('assets');showSubtab('assets','stocks',null);});
  await page.waitForTimeout(300);
  // 1 automatic: pie named like a known platform
  let chips=await page.$$eval('.stk-pie',els=>els.map(e=>({t:e.innerText.replace(/\n/g,' '),img:(e.querySelector('.stk-plat img')||{}).src||'',mono:(e.querySelector('.stk-mono')||{}).textContent||''})));
  console.log(JSON.stringify(chips));
  ok(chips.find(c=>/Trading 212 Pie/.test(c.t)).img.includes('favicons?domain=trading212.com'),'pie named after Trading 212 gets its logo automatically');
  ok(!chips.find(c=>/Fun money/.test(c.t)).img,'unknown pie has no logo until you add one');
  // 2 screenshot import sets platform from the AI answer
  await page.evaluate(()=>{
    window.fetch=async(u,o)=>({ok:true,status:200,json:async()=>({portfolio:'Fully Future Focused',platform:'Freetrade',currency:'GBP',holdings:[{name:'Figma',ticker:'FIG',value:277.79,pl:-6.08,candidates:[{symbol:'FIG',exchange:'NYSE'}]}]})});
    _supaClient={auth:{},functions:{invoke:async(n,o)=>({data:{quotes:{FIG:{price:40,currency:'USD',name:'Figma'}}},error:null})}};_supaUser={id:'u1',email:'t@t.com'};});
  await page.setInputFiles('#stk-shot',IMGS); await page.waitForSelector('.stk-shot-tbl',{timeout:8000});
  ok((await page.inputValue('#stk-shot-plat'))==='Freetrade','review screen pre-fills the platform the AI detected');
  await page.click('.stk-shot-ft .btn-add-data'); await page.waitForTimeout(600);
  const ff=await page.evaluate(()=>alState.stockPies.find(p=>p.name==='Fully Future Focused'));
  ok(ff&&ff.platform&&ff.platform.name==='Freetrade','new pie saved with platform Freetrade');
  chips=await page.$$eval('.stk-pie',els=>els.map(e=>({t:e.innerText.replace(/\n/g,' '),img:(e.querySelector('.stk-plat img')||{}).src||''})));
  ok(chips.find(c=>/Fully Future/.test(c.t)).img.includes('freetrade.io'),'Freetrade logo on that pie tile');
  ok(await page.locator('.stk-main-logo').count()===1&&/Freetrade/.test(await page.innerText('.stk-main-logo')),'platform name + larger logo top-right of the summary card');
  // 3 manual: unknown platform text -> monogram; then custom logo upload
  await page.evaluate(()=>{alState.activePie=6;stkRender();});
  await page.click('button[title^="Set the investment platform"]'); await page.fill('#stk-plat-name','My Local Broker'); 
  ok((await page.innerText('#stk-plat-prev')).trim()==='ML','unknown name previews as a coloured monogram');
  await page.click('.stk-shot-ft .btn-add-data'); await page.waitForTimeout(300);
  ok(await page.evaluate(()=>alState.stockPies.find(p=>p.id===6).platform.name)==='My Local Broker','manual platform text saved');
  const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  require('fs').writeFileSync('logo.png',Buffer.from(png,'base64'));
  await page.click('button[title^="Set the investment platform"]'); await page.setInputFiles('#stk-plat-file','logo.png'); await page.waitForTimeout(400);
  await page.click('.stk-shot-ft .btn-add-data'); await page.waitForTimeout(300);
  const lg=await page.evaluate(()=>alState.stockPies.find(p=>p.id===6).platform.logo);
  ok(/^data:image\/png/.test(lg)&&lg.length<60000,'uploaded logo stored small ('+lg.length+' bytes)');
  ok((await page.$$eval('.stk-pie',els=>els.find(e=>/Fun money/.test(e.innerText)).querySelector('.stk-plat img').src)).startsWith('data:image/png'),'custom logo shown on the tile');
  // persists + syncs shape
  await page.reload(); await page.waitForTimeout(1200); await page.addStyleTag({content:'#welcome-overlay,#login-overlay{display:none!important}'}); await page.evaluate(()=>{showTab('assets');showSubtab('assets','stocks',null);}); await page.waitForTimeout(300);
  ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('pos_al1')).stockPies.find(p=>p.id===6).platform.logo.length>100),'saved in your data (syncs with the account)');
  // 4 XSS in platform name
  await page.evaluate(()=>{alState.stockPies[0].platform={name:'<img src=x onerror=window.__x=1>"'};saveAL();stkRender();}); await page.waitForTimeout(300);
  ok(!(await page.evaluate(()=>window.__x))&&!/</.test(await page.evaluate(()=>JSON.parse(localStorage.getItem('pos_al1')).stockPies[0].platform.name)),'platform name cannot inject script');
  ok(errs.length===0,'no page errors '+errs.join('|'));
  await page.screenshot({path:'shots/plat.png'}); await b.close(); console.log(fails?'FAILURES '+fails:'ALL PASSED');
})();
