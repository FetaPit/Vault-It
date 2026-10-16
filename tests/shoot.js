const { chromium } = require('playwright');
const tag=process.argv[2]||'a';
(async()=>{
  const b=await chromium.launch();
  const sizes={m:{width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true},t:{width:768,height:1024},d:{width:1600,height:900}};
  for(const k of Object.keys(sizes)){
    const ctx=await b.newContext({viewport:{width:sizes[k].width,height:sizes[k].height},deviceScaleFactor:sizes[k].deviceScaleFactor||1,isMobile:!!sizes[k].isMobile,hasTouch:!!sizes[k].hasTouch});
    const page=await ctx.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(e.message));
    await page.addInitScript(()=>{if(localStorage.getItem('ht3'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'T',email:'t@t.com'}));
      localStorage.setItem('vi_settings',JSON.stringify({fontSize:'large',contrast:'standard',motion:'full',currency:'GBP'}));
      localStorage.setItem('ht3',JSON.stringify({saved:8538,target:320000,houseType:'semi',deposits:[{amount:8538,date:'16/10/2026'}],prices:{terraced:250000,semi:320000,detached:450000,mansion:900000,flat:200000,apartment:220000}}));
      localStorage.setItem('pos_ov1',JSON.stringify({income:[{id:1,name:'UC',amount:381,cat:'benefits'},{id:2,name:'PIP',amount:778,cat:'benefits'}],expenses:[{id:3,name:'Rent',amount:700,type:'ce'},{id:4,name:'Food',amount:300,type:'ve'}]}));
      localStorage.setItem('pos_debt1',JSON.stringify({debts:[{id:1,name:'Virgin Credit Card',original:2502,balance:2502,rate:0,min:60,type:'credit'},{id:2,name:'Vanquis',original:2600,balance:2600,rate:29,min:125,type:'credit'},{id:3,name:'Car',original:8000,balance:5000,rate:7,min:200,type:'car'}]}));});
    await page.goto('file:///home/user/Vault-It/index.html'); await page.waitForTimeout(1500);
    await page.addStyleTag({content:'#welcome-overlay,#login-overlay{display:none!important}'});
    for(const t of ['overview','budget','house','assets','debt']){
      await page.evaluate(t=>showTab(t),t); await page.waitForTimeout(900);
      await page.screenshot({path:`shots/resp/${tag}_${k}_${t}.png`,fullPage:false});
    }
    await page.evaluate(()=>{showTab('assets');showSubtab('assets','stocks',document.querySelector('.subtab-btn[onclick*="stocks"]'));}); await page.waitForTimeout(800);
    await page.screenshot({path:`shots/resp/${tag}_${k}_stocks.png`});
    await page.evaluate(()=>{showPaywall&&showPaywall('debts');}); await page.waitForTimeout(500);
    await page.screenshot({path:`shots/resp/${tag}_${k}_paywall.png`});
    console.log(k,'errors',errs.length);
    await ctx.close();
  }
  await b.close();
})();
