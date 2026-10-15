const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch(); const page=await (await b.newContext({viewport:{width:1280,height:1000}})).newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(e.message.slice(0,120)));
  page.on('dialog',d=>d.dismiss());
  const P=process.argv[2]==='attr'?'" autofocus onfocus="window.__xss=(window.__xss||[]).concat([1])" onmouseover="window.__xss=(window.__xss||[]).concat([2])" x="':'<img src=x onerror="window.__xss=(window.__xss||[]).concat(\'HIT\')">';
  await page.addInitScript((P)=>{
    localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));
    localStorage.setItem('vi_user',JSON.stringify({name:P,email:'t@t.com',job:P,dream:P}));
    localStorage.setItem('pos_ov1',JSON.stringify({income:[{id:1,name:P,amount:3000,cat:'salary'}],expenses:[{id:2,name:P,amount:1000,type:'ce',cat:'housing'}],customCats:[{k:'c_x',kind:'exp',n:P,ic:'paw',t:'cn'}]}));
    localStorage.setItem('pos_al1',JSON.stringify({cashAccounts:[{id:3,name:P,type:'Savings',balance:5000}],stocks:[{id:4,pie:1,sym:'AAPL',name:P,units:2,avgCost:100,price:150}],stockPies:[{id:1,name:P}],otherAssets:[{id:5,name:P,value:900,notes:P}],crypto:[{id:6,sym:P,amount:0.1,price:40000}],liabilities:[{id:7,name:P,value:5000,runningCost:100}],metals:{gold:1}}));
    localStorage.setItem('pos_debt1',JSON.stringify({debts:[{id:8,name:P,original:1000,balance:800,rate:20,minPay:30,type:'credit'}]}));
    localStorage.setItem('pos_biz1',JSON.stringify({clients:[{id:9,name:P,monthly:100,status:'Active'}],leads:[{id:10,name:P}],streams:[],incomeStreams:[{id:11,name:P,amount:5}]}));
  },P);
  await page.goto('file:///home/user/Vault-It/index.html'); await page.waitForTimeout(2000);
  await page.addStyleTag({content:'#welcome-overlay,#login-overlay{display:none!important}'});
  const tabs=await page.evaluate(()=>{const o=new Set();document.querySelectorAll('[onclick]').forEach(e=>{const m=/showTab\('([^']+)'/.exec(e.getAttribute('onclick'));if(m)o.add(m[1]);});return[...o];});
  for(const t of tabs){await page.evaluate(t=>showTab(t),t);await page.waitForTimeout(250);
    const subs=await page.evaluate(()=>{const o=[];document.querySelectorAll('[onclick]').forEach(e=>{const m=/showSubtab\('([^']+)','([^']+)'/.exec(e.getAttribute('onclick'));if(m)o.push([m[1],m[2]]);});return o;});
    for(const [g,id] of subs){await page.evaluate(([g,id])=>showSubtab(g,id,null),[g,id]);await page.waitForTimeout(120);}}
  await page.waitForTimeout(800);
  const hit=await page.evaluate(()=>window.__xss||[]); const imgs=await page.evaluate(()=>document.querySelectorAll('img[src="x"]').length);
  console.log('XSS executed:',hit.length,'| injected <img> elements in DOM:',imgs);
  if(imgs){ const where=await page.evaluate(()=>[...document.querySelectorAll('img[src="x"]')].slice(0,12).map(i=>{let p=i.parentElement,path=[];for(let k=0;k<4&&p;k++){path.push(p.id||p.className.toString().split(' ')[0]||p.tagName);p=p.parentElement;}return path.join('<');}));console.log(where.join('\n')); }
  console.log('errors',errs.slice(0,5)); await b.close();
})();
