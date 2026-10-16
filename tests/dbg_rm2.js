const { chromium } = require('playwright');
(async()=>{ let bad=0;
  const b=await chromium.launch();
  for(const w of [360,390,600,640,700,820,900,1000,1280]){
  const page=await (await b.newContext({viewport:{width:w,height:1100}})).newPage();
  await page.addInitScript(()=>{localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'P',email:'t@t.com'}));
   localStorage.setItem('pos_al1',JSON.stringify({stocks:[{id:1,pie:1,sym:'SONY',name:'Sony Group',units:5,avgCost:30,price:38,provider:'BlackRock (iShares)',platform:'Monzo'}],stockPies:[{id:1,name:'ISA'}],activePie:1,cashAccounts:[],otherAssets:[],crypto:[],liabilities:[],metals:{}}));});
  await page.goto('file:///home/user/Vault-It/index.html'); await page.waitForTimeout(900);
  await page.addStyleTag({content:'#welcome-overlay,#login-overlay{display:none!important}'});
  await page.evaluate(()=>{showTab('assets');showSubtab('assets','stocks',null);}); await page.waitForTimeout(400);
  const r=await page.evaluate(()=>{const W=innerWidth;const q=s=>{const e=document.querySelector(s);if(!e)return null;const b=e.getBoundingClientRect();return{l:Math.round(b.left),r:Math.round(b.right)}};return{rm:q('.stk-row button.c-x'),un:q('.stk-row .c-un input'),pr:q('.stk-row .c-pr input'),tblScroll:(()=>{const t=document.querySelector('.stk-tbl');return t.scrollWidth>t.clientWidth+1;})(),W};});
  const inside=x=>x&&x.l>=0&&x.r<=r.W+1;
  const ok=inside(r.rm)&&inside(r.un)&&inside(r.pr)&&!r.tblScroll; if(!ok)bad++;
  console.log(w,ok?'ok':'OFFSCREEN',JSON.stringify(r));
  await page.close();}
  await b.close(); console.log(bad?'PROBLEMS '+bad:'ALL FIT');
})();
