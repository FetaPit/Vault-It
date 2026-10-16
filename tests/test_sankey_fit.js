const { chromium } = require('playwright');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL:',m);} else console.log('ok  :',m); };
const seed=()=>{if(localStorage.getItem('pos_debt1'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'T',email:'t@t.com'}));
  localStorage.setItem('vi_settings',JSON.stringify({fontSize:'large',contrast:'standard',motion:'full',currency:'GBP',compactNav:true}));
  const ex=[['Council tax',147,'ce'],['Electricity',75,'ce'],['Gas',60,'ce'],['Phone & internet',50,'ce'],['Water',35,'ce'],['Rent',300,'ce'],['Debt repayments',300,'ve'],['Monthly groceries',220,'ve'],['Groceries top-up',50,'ve'],['Gym',50,'cn'],['Car tax',38,'cn'],['Car insurance',33,'cn'],['Monzo Max',22,'cn'],['House contents',9,'cn'],['Petrol',70,'vn'],['Car repairs',50,'vn'],['Eating out',30,'vn'],['Clothing',30,'vn'],['Drinks',30,'vn'],['Shopping',21,'vn'],['Haircut',15,'vn'],['Emergency fund',100,'sv'],['ISA',50,'iv']].map((e,i)=>({id:100+i,name:e[0],amount:e[1],type:e[2]}));
  localStorage.setItem('pos_ov1',JSON.stringify({income:[{id:1,name:'Universal Credit',amount:381,cat:'benefits'},{id:2,name:'PIP (Care/Mobility)',amount:778,cat:'benefits'},{id:5,name:'LCWRA',amount:430,cat:'benefits'},{id:8,name:'UC Housing Element',amount:347,cat:'benefits'}],expenses:ex}));
  localStorage.setItem('pos_debt1',JSON.stringify({debts:[{id:1,name:'Card',original:2500,balance:2000,rate:20,min:60,type:'credit'}]}));};
(async()=>{
  const b=await chromium.launch(); const errs=[];
  for(const [w,h] of [[1600,900],[1366,768],[1920,1080]]){
    const ctx=await b.newContext({viewport:{width:w,height:h}}); const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message));
    await p.addInitScript(seed); await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(2200); await p.addStyleTag({content:'#welcome-overlay,#login-overlay{display:none!important}'});
    for(const [tab,id] of [['budget','bd-sankey'],['overview','cf-sankey']]){
      await p.evaluate(t=>showTab(t),tab); await p.waitForTimeout(1000);
      await p.evaluate(id=>document.getElementById(id).scrollIntoView({block:'start'}),id); await p.waitForTimeout(300);
      const r=await p.evaluate(id=>{const s=document.querySelector('#'+id+' svg').getBoundingClientRect();return{top:s.top,bottom:s.bottom,h:s.height,w:s.width,vh:innerHeight};},id);
      console.log(w+'x'+h,tab,JSON.stringify(r));
      ok(r.bottom<=r.vh+2&&r.top>=-2,w+'x'+h+' '+tab+': the whole diagram is on screen at once ('+Math.round(r.h)+'px high, window '+r.vh+')');
    }
    // alignment with the split line on the budget tab
    await p.evaluate(()=>showTab('budget')); await p.waitForTimeout(800);
    const al=await p.evaluate(()=>{const sk=document.querySelector('#bd-sankey svg'),r=sk.getBoundingClientRect(),vb=sk.viewBox.baseVal;const XI=370*(vb.width/960);const nodeR=r.left+((XI+14)/vb.width)*r.width;const sp=document.querySelector('.bd-split').getBoundingClientRect(),f=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bd-split'))/100;return{nodeR,line:sp.left+f*sp.width};});
    ok(Math.abs(al.nodeR-al.line)<3,w+'x'+h+': split line still lines up with the income block ('+Math.round(al.line)+' vs '+Math.round(al.nodeR)+')');
    await ctx.close();
  }
  ok(errs.length===0,'no page errors '+errs.join('|'));
  await b.close(); console.log(fails?'FAILURES '+fails:'ALL PASSED');
})();
