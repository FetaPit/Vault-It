const { chromium } = require('playwright');
const tab=process.argv[2]||'budget', tag=process.argv[3]||'x', w=+(process.argv[4]||1600), h=+(process.argv[5]||900);
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:w,height:h}}); const page=await ctx.newPage();
  await page.addInitScript(()=>{if(localStorage.getItem('pos_debt1'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'T',email:'t@t.com'}));
    localStorage.setItem('vi_settings',JSON.stringify({fontSize:'large',contrast:'standard',motion:'full',currency:'GBP',compactNav:true}));
    localStorage.setItem('pos_ov1',JSON.stringify({income:[{id:1,name:'Universal Credit',amount:381,cat:'benefits'},{id:2,name:'PIP',amount:778,cat:'benefits'},{id:5,name:'LCWRA',amount:430,cat:'benefits'},{id:8,name:'UC Housing',amount:347,cat:'benefits'}],expenses:[{id:3,name:'Rent',amount:700,type:'ce'},{id:4,name:'Food',amount:300,type:'ve'},{id:6,name:'Phone',amount:30,type:'ce'},{id:7,name:'Energy',amount:120,type:'ce'},{id:9,name:'Petrol',amount:70,type:'vn'},{id:10,name:'Gym',amount:50,type:'cn'},{id:11,name:'Emergency fund',amount:100,type:'sv'},{id:12,name:'ISA',amount:50,type:'iv'}]}));
    localStorage.setItem('pos_debt1',JSON.stringify({debts:[{id:1,name:'Virgin Credit Card',original:2502,balance:2502,rate:0,min:60,type:'credit'},{id:2,name:'Vanquis',original:2600,balance:2600,rate:29,min:125,type:'credit'},{id:3,name:'Monzo Flex',original:235,balance:235,rate:0,min:23,type:'credit'},{id:4,name:'Klarna',original:706,balance:706,rate:0,min:77,type:'credit'},{id:5,name:'Car finance',original:8000,balance:5000,rate:7,min:200,type:'car'}]}));});
  await page.goto('file:///home/user/Vault-It/index.html'); await page.waitForTimeout(2200);
  await page.addStyleTag({content:'#welcome-overlay,#login-overlay{display:none!important}'});
  await page.evaluate(t=>showTab(t),tab); await page.waitForTimeout(1200);
  await page.screenshot({path:`shots/resp/${tag}_${tab}_${w}.png`,fullPage:true});
  await b.close();
})();
