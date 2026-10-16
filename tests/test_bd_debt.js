const { chromium } = require('playwright');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL:',m);} else console.log('ok  :',m); };
const seed=()=>{if(localStorage.getItem('pos_debt1'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'T',email:'t@t.com'}));
  localStorage.setItem('vi_settings',JSON.stringify({fontSize:'large',contrast:'standard',motion:'full',currency:'GBP'}));
  localStorage.setItem('ht3',JSON.stringify({saved:8538,target:320000,houseType:'semi',deposits:[{amount:8538,date:'16/10/2026'}],prices:{terraced:250000,semi:320000,detached:450000,mansion:900000,flat:200000,apartment:220000}}));
  localStorage.setItem('pos_ov1',JSON.stringify({income:[{id:1,name:'UC',amount:381,cat:'benefits'},{id:2,name:'PIP',amount:778,cat:'benefits'}],expenses:[{id:3,name:'Rent',amount:700,type:'ce'},{id:4,name:'Food',amount:300,type:'ve'},{id:11,name:'Emergency fund',amount:100,type:'sv'}]}));
  localStorage.setItem('pos_debt1',JSON.stringify({debts:[{id:1,name:'Virgin Credit Card',original:2502,balance:2502,rate:0,min:60,type:'credit'},{id:2,name:'Vanquis',original:2600,balance:2600,rate:29,min:125,type:'credit'},{id:3,name:'Monzo Flex',original:235,balance:235,rate:0,min:23,type:'credit'},{id:5,name:'Car finance',original:8000,balance:5000,rate:7,min:200,type:'car'}]}));};
(async()=>{
  const b=await chromium.launch(); const errs=[];
  const ctx=await b.newContext({viewport:{width:1600,height:900}}); const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(seed); await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(2200); await p.addStyleTag({content:'#welcome-overlay,#login-overlay{display:none!important}'});
  // ---- budget
  await p.evaluate(()=>showTab('budget')); await p.waitForTimeout(900);
  let r=await p.evaluate(()=>{const t=[...document.querySelectorAll('.bd-tile')];const inc=document.querySelector('.bd-inc').getBoundingClientRect(),exp=document.querySelector('.bd-exp').getBoundingClientRect(),sp=document.querySelector('.bd-split').getBoundingClientRect();
    const sk=document.querySelector('#bd-sankey svg'),skr=sk.getBoundingClientRect(),vb=sk.viewBox.baseVal;const nodeX=skr.left+(384/vb.width)*skr.width;
    const lineX=sp.left+0.4*sp.width;const tops=t.slice(0,2).map(x=>Math.round(x.getBoundingClientRect().top));
    return{tiles:t.length,icons:document.querySelectorAll('.bd-tile-ic svg').length,incW:inc.width,expW:exp.width,lineX,nodeX,sameRow:tops[0]===tops[1],legendFs:parseFloat(getComputedStyle(document.querySelector('.cf-legend span')).fontSize),legendIcons:document.querySelectorAll('.cf-legend s svg').length};});
  console.log(JSON.stringify(r));
  ok(r.tiles===6&&r.icons===6,'all six spending tiles shown (even the empty ones), each with its own icon');
  ok(r.sameRow,'tiles sit alongside each other'); ok(r.incW<r.expW,'income column is narrower than expenditure ('+Math.round(r.incW)+' vs '+Math.round(r.expW)+')');
  ok(Math.abs(r.lineX-r.nodeX)<8,'dividing line lines up with the end of the income block in the flow diagram ('+Math.round(r.lineX)+' vs '+Math.round(r.nodeX)+')');
  ok(r.legendFs>=12&&r.legendIcons>=6,'key is bigger and carries the icons ('+r.legendFs.toFixed(1)+'px)');
  const h0=await p.evaluate(()=>document.querySelector('.bd-tile[data-g="ce"] .bd-tile-body').getBoundingClientRect().height);
  await p.evaluate(()=>document.querySelector('.bd-tile[data-g="ce"] .bd-tile-hd').click()); await p.waitForTimeout(200);
  const h1=await p.evaluate(()=>({h:document.querySelector('.bd-tile[data-g="ce"] .bd-tile-body').getBoundingClientRect().height,saved:localStorage.getItem('vi_bd_fold')}));
  ok(h0>20&&h1.h===0&&/ce/.test(h1.saved),'a tile collapses and remembers it'); await p.evaluate(()=>bdFoldAll(false));
  await p.evaluate(()=>bdFoldAll(true)); ok(await p.evaluate(()=>[...document.querySelectorAll('.bd-tile.folded')].length)===6,'collapse all'); await p.evaluate(()=>bdFoldAll(false));
  // ---- debt
  await p.evaluate(()=>showTab('debt')); await p.waitForTimeout(1200);
  const d=await p.evaluate(()=>{const pal=debtState.debts.map(x=>debtPalette(x));return{pal:pal.map(x=>x.c1),brand:[ccBrand(debtState.debts[0])&&ccBrand(debtState.debts[0]).g[0],ccBrand(debtState.debts[1])&&ccBrand(debtState.debts[1]).g[0],ccBrand(debtState.debts[2])&&ccBrand(debtState.debts[2]).g[0]],h:document.getElementById('debt-bar-chart').getBoundingClientRect().height};});
  ok(d.pal[0]===d.brand[0]&&d.pal[1]===d.brand[1]&&d.pal[2]===d.brand[2],'charts use each credit card\'s own colours ('+d.pal.slice(0,3).join(',')+')');
  ok(d.h>=280,'histogram is bigger on desktop ('+Math.round(d.h)+'px)');
  await p.evaluate(()=>setDebtView('tree')); await p.waitForTimeout(400);
  const tm=await p.evaluate(()=>{const c=[...document.querySelectorAll('.dtm-cell')];const box=document.getElementById('debt-treemap').getBoundingClientRect();const area=c.reduce((a,x)=>{const r=x.getBoundingClientRect();return a+r.width*r.height;},0);return{n:c.length,bg:c.map(x=>x.style.background.slice(0,40)),cover:area/(box.width*box.height),donutHidden:document.getElementById('debt-donut-chart').style.display==='none',bigFirst:c[0].getBoundingClientRect().width*c[0].getBoundingClientRect().height>c[c.length-1].getBoundingClientRect().width*c[c.length-1].getBoundingClientRect().height};});
  console.log(JSON.stringify({n:tm.n,cover:tm.cover}));
  ok(tm.n===4&&tm.donutHidden,'tree map shows one square per debt'); ok(tm.cover>0.9,'squares fill the grid ('+(tm.cover*100).toFixed(0)+'%)'); ok(tm.bigFirst,'bigger debt = bigger square'); ok(tm.bg[0].includes('linear-gradient'),'squares carry the card gradient');
  ok(await p.evaluate(()=>localStorage.getItem('vi_debt_view'))==='tree','choice is remembered'); await p.evaluate(()=>setDebtView('donut'));
  // ---- viewport
  await p.evaluate(()=>showTab('house')); await p.waitForTimeout(900);
  const vp=await p.evaluate(()=>({h:document.getElementById('house-scene').getBoundingClientRect().height,vh:innerHeight}));
  ok(Math.abs(vp.h-0.75*vp.vh)<4,'house viewport is 75% of the screen height ('+Math.round(vp.h)+' of '+vp.vh+')');
  await p.evaluate(()=>showTab('assets')); await p.waitForTimeout(700);
  const vm=await p.evaluate(()=>{const s=[...document.querySelectorAll('#tab-assets .scene')].find(e=>e.offsetParent);return s?s.getBoundingClientRect().height:0;});
  ok(Math.abs(vm-0.75*900)<4,'metals viewport likewise ('+Math.round(vm)+'px)');
  ok(errs.length===0,'no page errors '+errs.join('|'));
  await b.close(); console.log(fails?'FAILURES '+fails:'ALL PASSED');
})();
