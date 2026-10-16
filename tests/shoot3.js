const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch();
  for(const [k,vp,mob] of [['d',{width:1600,height:900},false],['m',{width:390,height:844},true]]){
    const ctx=await b.newContext({viewport:vp,deviceScaleFactor:mob?1.5:1,isMobile:mob,hasTouch:mob});
    const page=await ctx.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(e.message));
    await page.addInitScript(()=>{if(localStorage.getItem('pos_debt1'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'T',email:'t@t.com'}));
      localStorage.setItem('vi_settings',JSON.stringify({fontSize:'large',contrast:'standard',motion:'full',currency:'GBP',compactNav:true}));
      localStorage.setItem('pos_ov1',JSON.stringify({income:[{id:1,name:'UC',amount:381,cat:'benefits'},{id:2,name:'PIP',amount:778,cat:'benefits'},{id:5,name:'LCWRA',amount:430,cat:'benefits'},{id:8,name:'UC Housing',amount:347,cat:'benefits'}],expenses:[{id:3,name:'Rent',amount:700,type:'ce'},{id:4,name:'Food',amount:300,type:'ve'},{id:6,name:'Phone',amount:30,type:'ce'},{id:7,name:'Energy',amount:120,type:'ce'},{id:9,name:'Petrol',amount:70,type:'vn'},{id:10,name:'Gym',amount:50,type:'cn'}],milestones:[1000,0,5000,20000,50000],snapshots:[{month:'2026-03',nw:1200,debt:9000,liab:0}],customGoals:[{id:1,name:'Wedding fund',amount:8000}]}));
      localStorage.setItem('pos_al1',JSON.stringify({cashAccounts:[{id:1,name:'Monzo',balance:900}],crypto:[],metals:{gold:0,silver:0,platinum:0,palladium:0},stocks:[],otherAssets:[],liabilities:[{id:1,name:'Car',value:4000,rate:0,depRate:0,runningCost:0}],stockPies:[]}));
      localStorage.setItem('pos_debt1',JSON.stringify({debts:[{id:1,name:'Virgin Credit Card',original:2502,balance:2000,rate:0,min:60,type:'credit'},{id:2,name:'Car finance',original:8000,balance:5000,rate:7,min:200,type:'car'}]}));});
    await page.goto('file:///home/user/Vault-It/index.html'); await page.waitForTimeout(1800);
    await page.addStyleTag({content:'#welcome-overlay,#login-overlay{display:none!important}'});
    await page.evaluate(()=>showTab('overview')); await page.waitForTimeout(900);
    await page.screenshot({path:`shots/resp/ov2_${k}_full.png`,fullPage:true});
    await page.screenshot({path:`shots/resp/ov2_${k}_top.png`});
    console.log(k,'errs',errs.length,errs[0]||'');
    await ctx.close();
  }
  await b.close();
})();
