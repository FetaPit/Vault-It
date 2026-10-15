const { chromium } = require('playwright');
const MODE=process.argv[2]||'real', W=+(process.argv[3]||1280), H=W<600?900:1000;
const errs=new Map(); const add=(k,v)=>{const key=k+': '+v; errs.set(key,(errs.get(key)||0)+1);};
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:W,height:H}}); const page=await ctx.newPage();
  page.on('pageerror',e=>add('PAGEERROR',(e.message||'').slice(0,200)+' @'+((e.stack||'').split('\n')[1]||'').trim().slice(0,90)));
  page.on('console',m=>{ if(m.type()==='error'){const t=m.text(); if(!/Failed to load resource|net::ERR|fonts.googleapis|supabase|favicon/.test(t)) add('CONSOLE',t.slice(0,200));}});
  await page.addInitScript((mode)=>{
    window.confirm=()=>false; window.prompt=()=>null; window.alert=()=>{}; window.open=()=>null;
    const nf=async()=>({ok:true,status:200,json:async()=>({}),text:async()=>'',blob:async()=>new Blob([])}); window.fetch=nf;
    if(mode==='real'){
      localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));
      localStorage.setItem('vi_user',JSON.stringify({name:'Pete',email:'t@t.com',job:'PM'}));
      localStorage.setItem('pos_ov1',JSON.stringify({income:[{id:1,name:'Salary',amount:3000,cat:'salary'}],expenses:[{id:2,name:'Rent',amount:1000,type:'ce',cat:'housing'},{id:3,name:'Netflix',amount:10,type:'cn'}],customCats:[]}));
      localStorage.setItem('pos_al1',JSON.stringify({cashAccounts:[{id:3,name:'Cash',type:'Savings',balance:5000}],stocks:[{id:4,pie:1,sym:'AAPL',units:2,avgCost:100,price:150}],stockPies:[{id:1,name:'ISA'}],otherAssets:[{id:5,name:'Watch',value:900}],crypto:[{id:6,sym:'BTC',amount:0.1,price:40000}],liabilities:[{id:7,name:'Car',value:5000,runningCost:100}],metals:{gold:1}}));
      localStorage.setItem('pos_debt1',JSON.stringify({debts:[{id:8,name:'Card',original:1000,balance:800,rate:20,minPay:30,type:'credit'}]}));
    }
    if(mode==='new'){ localStorage.setItem('vi_declined_demo','true'); localStorage.setItem('vi_session',JSON.stringify({email:'n@n.com',expiry:Date.now()+1e10})); }
  },MODE);
  await page.goto(MODE==='demo'?'file:///home/user/Vault-It/example/index.html':'file:///home/user/Vault-It/index.html'); await page.waitForTimeout(2500);
  // hide overlays that block clicks
  await page.addStyleTag({content:'#welcome-overlay,#login-overlay{display:none!important}'});
  const tabs=await page.evaluate(()=>{const o=new Set();document.querySelectorAll('[onclick]').forEach(e=>{const m=/showTab\('([^']+)'/.exec(e.getAttribute('onclick'));if(m)o.add(m[1]);});return[...o];});
  const clicked=new Set(); let n=0;
  async function sweep(label){
    const items=await page.evaluate(()=>{const out=[];document.querySelectorAll('[onclick]').forEach((e,i)=>{const oc=e.getAttribute('onclick');const r=e.getBoundingClientRect();const vis=r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden';
      if(vis&&!/resetVaultData|signOut|authRemovePin|deleteAccount|location|clearAll|invClearAll|removeAll|wipe/i.test(oc)){out.push(oc);}});return out;});
    for(const oc of items){ if(clicked.has(oc)) continue; clicked.add(oc);
      try{ await page.evaluate((oc)=>{const e=[...document.querySelectorAll('[onclick]')].find(x=>x.getAttribute('onclick')===oc); if(e) e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));},oc); n++; }catch(e){add('CLICKFAIL',oc.slice(0,80));}
      await page.waitForTimeout(25);
    }
  }
  for(const t of tabs){
    try{ await page.evaluate((t)=>showTab(t),t); await page.waitForTimeout(250);}catch(e){add('SHOWTAB-FAIL',t+' '+e.message.slice(0,100));}
    // sub tabs
    const subs=await page.evaluate(()=>{const o=[];document.querySelectorAll('[onclick]').forEach(e=>{const m=/showSubtab\('([^']+)','([^']+)'/.exec(e.getAttribute('onclick'));if(m)o.push([m[1],m[2]]);});return o;});
    for(const [g,id] of subs){ try{await page.evaluate(([g,id])=>showSubtab(g,id,null),[g,id]);await page.waitForTimeout(120);}catch(e){add('SHOWSUBTAB-FAIL',g+'/'+id+' '+e.message.slice(0,80));} await sweep(t+'/'+id); }
    await sweep(t);
    // close any modals opened
    await page.evaluate(()=>{document.querySelectorAll('[id$="-modal"],[id$="-overlay"],.modal').forEach(m=>{if(m.id!=='welcome-overlay'&&m.id!=='login-overlay')m.style.display='none';});});
  }
  // overflow check
  const ov=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
  if(ov) add('LAYOUT','horizontal page scroll at '+window.innerWidth);
  console.log(`[${MODE} ${W}px] tabs=${tabs.length} clicks=${n} problems=${errs.size}`);
  [...errs.entries()].forEach(([k,v])=>console.log('  ×'+v+' '+k));
  await b.close();
})();
