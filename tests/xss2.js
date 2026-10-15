const { chromium } = require('playwright');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL:',m);} else console.log('ok  :',m); };
(async()=>{
  const b=await chromium.launch(); const page=await (await b.newContext({viewport:{width:1280,height:1000}})).newPage(); const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:"Pete's",email:'t@t.com'}));});
  await page.goto('file:///home/user/Vault-It/index.html'); await page.waitForTimeout(1500);
  await page.addStyleTag({content:'#welcome-overlay,#login-overlay{display:none!important}'});
  ok((await page.evaluate(()=>JSON.parse(localStorage.getItem('vi_user')).name))==='Pete’s','apostrophes kept (as ’), name intact');
  await page.evaluate(()=>showTab('assets'));await page.evaluate(()=>showSubtab('assets','stocks',null));
  await page.fill('#stk-sym','AA<img src=x onerror=window.__x=1>PL');
  ok((await page.inputValue('#stk-sym'))==='AAimg src=x onerror=window.__x=1PL','typing "<" ">" is stripped immediately');
  await page.evaluate(()=>{localStorage.setItem('pos_al1',JSON.stringify({stocks:[{id:1,pie:1,sym:'X',name:'<script>window.__y=1</script>"q',units:1,price:1}],stockPies:[{id:1,name:'<b onmouseover=1>ISA'}],cashAccounts:[],otherAssets:[],crypto:[],liabilities:[],metals:{}}));});
  const stored=await page.evaluate(()=>localStorage.getItem('pos_al1')); ok(!/[<>`]/.test(stored.replace(/\{|\}/g,'')),'anything written to storage is cleaned: '+stored.slice(60,150));
  ok(errs.length===0,'no page errors '+errs.join('|'));
  await b.close(); console.log(fails?'FAILURES '+fails:'ALL PASSED');
})();
