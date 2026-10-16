const { chromium } = require('playwright');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL:',m);} else console.log('ok  :',m); };
(async()=>{
  const b=await chromium.launch(); const page=await (await b.newContext({viewport:{width:1280,height:1100}})).newPage(); const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  const added=Date.now()-100*864e5;
  await page.addInitScript((added)=>{localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'P',email:'t@t.com'}));localStorage.setItem('vi_fx_rates',JSON.stringify({USD:1.25}));
    localStorage.setItem('pos_al1',JSON.stringify({stocks:[{id:added,pie:5,sym:'AAPL',units:10,avgCost:80,price:100,updated:Date.now()},{id:added+1,pie:5,sym:'VUSA.L',units:20,avgCost:70,price:80,updated:Date.now()},{id:added+2,pie:6,sym:'NOHIST',units:5,avgCost:10,price:12,updated:Date.now()}],stockPies:[{id:5,name:'ISA'},{id:6,name:'Other'}],cashAccounts:[],otherAssets:[],crypto:[],liabilities:[],metals:{}}));},added);
  await page.goto('file:///home/user/Vault-It/index.html'); await page.waitForTimeout(1200);
  await page.addStyleTag({content:'#welcome-overlay,#login-overlay{display:none!important}'});
  await page.evaluate(()=>{
    window._hcalls=[];
    const mk=(n,start,ccy,f)=>{const t=[],c=[];for(let i=0;i<n;i++){t.push(Math.floor(Date.now()/1000)-(n-i)*86400);c.push(f(i));}return{currency:ccy,t,c};};
    _supaClient={auth:{},functions:{invoke:async(nm,o)=>{ if(o.body.history){_hcalls.push(o.body.history.range+':'+o.body.history.symbols.join());const s={};o.body.history.symbols.forEach(x=>{if(x==='AAPL')s.AAPL=mk(120,0,'USD',i=>100+i*0.5);if(x==='VUSA.L')s['VUSA.L']=mk(120,0,'GBp',i=>7000+i*10);});return{data:{series:s},error:null};}
      const q={};(o.body.symbols||[]).forEach(x=>{q[x]={price:x==='AAPL'?160:(x==='VUSA.L'?8200:12),currency:x==='AAPL'?'USD':(x==='VUSA.L'?'GBp':'GBP'),name:x,changePct:0};});return{data:{quotes:q},error:null};}}};
    showTab('assets');showSubtab('assets','stocks',null);stkSelectPie(5);});
  await page.waitForSelector('#stk-chart svg path',{timeout:6000});
  ok(await page.locator('#stk-chart svg path').count()>=2,'performance graph is drawn for the selected pie');
  let txt=await page.innerText('#stk-chart'); console.log(txt.replace(/\n+/g,' | ').slice(0,260));
  ok(/PERFORMANCE · ISA/.test(txt)&&/now/.test(txt),'title names the pie and shows value now');
  ok(await page.evaluate(()=>_hcalls.every(c=>!/NOHIST/.test(c))),'only the selected pie\'s tickers are fetched');
  // return view vs entry price
  await page.click('.stk-seg button:has-text("Return vs entry")'); await page.waitForSelector('#stk-chart svg path',{timeout:5000}); await page.waitForTimeout(300);
  txt=await page.innerText('#stk-chart'); ok(/vs your entry price/.test(txt)&&/%/.test(txt),'"Return vs entry %" view works: '+txt.match(/[+-]?[\d.]+% vs your entry price/));
  ok((await page.innerHTML('#stk-chart')).includes('your entry price'),'entry-price baseline drawn');
  // ranges
  await page.click('.stk-seg button:has-text("1Y")'); await page.waitForTimeout(500);
  ok(await page.evaluate(()=>_hcalls.some(c=>/^1y:/.test(c))),'range buttons request the matching history');
  await page.click('.stk-seg button:has-text("Since added")'); await page.waitForTimeout(500);
  txt=await page.innerText('#stk-chart'); ok(/Starts from when you added them/.test(txt),'"Since added" range starts from the holdings\' input date');
  // all pies incl. a holding without history
  await page.evaluate(()=>stkSelectPie('all')); await page.waitForTimeout(900);
  txt=await page.innerText('#stk-chart'); ok(/1 holding has no price history/.test(txt),'holding with no history is left out and the chart says so');
  // tooltip
  const box=await page.locator('#stk-ch-box').boundingBox(); await page.mouse.move(box.x+box.width*0.6,box.y+80); await page.waitForTimeout(150);
  ok(/£|%/.test(await page.innerText('#stk-ch-tip'))&&await page.locator('#stk-ch-tip').isVisible(),'hover/touch shows date and value: '+await page.innerText('#stk-ch-tip'));
  // pies refresh themselves while open
  await page.evaluate(()=>{alState.stocks.forEach(h=>h.updated=Date.now()-6*60*1000);window._q=0;const o=_supaClient.functions.invoke;_supaClient.functions.invoke=async(n,x)=>{if(!x.body.history)_q++;return o(n,x);};stkAutoRefresh();}); await page.waitForTimeout(800);
  ok(await page.evaluate(()=>_q)>=1,'prices older than 5 minutes refresh automatically while the tab is open');
  ok(errs.length===0,'no page errors '+errs.join('|'));
  await page.screenshot({path:'shots/chart.png'}); await b.close(); console.log(fails?'FAILURES '+fails:'ALL PASSED');
})();
