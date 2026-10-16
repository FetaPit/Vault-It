const { chromium } = require('playwright');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL:',m);} else console.log('ok  :',m); };
(async()=>{
  const b=await chromium.launch(); const errs=[];
  const seed=()=>{if(localStorage.getItem('pos_debt1'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'T',email:'t@t.com'}));localStorage.setItem('vi_settings',JSON.stringify({fontSize:'large',contrast:'standard',motion:'full',currency:'GBP'}));
    localStorage.setItem('pos_ov1',JSON.stringify({income:[{id:1,name:'UC',amount:381,cat:'benefits'},{id:2,name:'PIP',amount:778,cat:'benefits'}],expenses:[{id:3,name:'Rent',amount:700,type:'ce'}]}));
    localStorage.setItem('pos_debt1',JSON.stringify({debts:[{id:1,name:'Card',original:2500,balance:2500,rate:20,min:60,type:'credit'}]}));};
  const open=async(w,h,mobile)=>{const ctx=await b.newContext({viewport:{width:w,height:h},isMobile:!!mobile,hasTouch:!!mobile});const page=await ctx.newPage();page.on('pageerror',e=>errs.push(e.message));await page.addInitScript(seed);await page.goto('file:///home/user/Vault-It/index.html');await page.waitForTimeout(1500);await page.addStyleTag({content:'#welcome-overlay,#login-overlay{display:none!important}'});return page;};
  // desktop
  for(const w of [1280,1600,1920]){
    const p=await open(w,900);
    const r=await p.evaluate(()=>{const n=document.getElementById('topnav');const ov=document.getElementById('ov-page').getBoundingClientRect();return{navOver:n.scrollWidth-n.clientWidth,fs:parseFloat(getComputedStyle(document.documentElement).fontSize),ovw:ov.width,vw:innerWidth,sx:document.documentElement.scrollWidth-innerWidth};});
    console.log(w,JSON.stringify(r));
    ok(r.navOver<=2,w+'px: menu bar fits (no sideways scroll)'); ok(r.ovw>=r.vw-80,w+'px: Overview uses the width ('+Math.round(r.ovw)+' of '+w+')'); ok(r.fs>=15,w+'px: text scaled up ('+r.fs.toFixed(1)+'px)'); ok(r.sx<=1,w+'px: no horizontal page scroll');
    await p.evaluate(()=>showTab('assets')); await p.waitForTimeout(500);
    const cols=await p.evaluate(()=>{const bs=[...document.querySelectorAll('#assets-page .subtab-btn')].map(x=>Math.round(x.getBoundingClientRect().top));return new Set(bs).size;});
    ok(cols===1,w+'px: all six sub-tabs on one line');
    await p.context().close();
  }
  // tablet: three across
  let p=await open(768,1000); await p.evaluate(()=>showTab('assets')); await p.waitForTimeout(500);
  let rows=await p.evaluate(()=>{const m={};[...document.querySelectorAll('#assets-page .subtab-btn')].forEach(x=>{const t=Math.round(x.getBoundingClientRect().top);m[t]=(m[t]||0)+1;});return Object.values(m);});
  ok(rows.join()==='3,3','tablet: sub-tabs three across ('+rows+')'); await p.context().close();
  // mobile
  p=await open(390,844,true); await p.evaluate(()=>showTab('assets')); await p.waitForTimeout(500);
  rows=await p.evaluate(()=>{const m={};[...document.querySelectorAll('#assets-page .subtab-btn')].forEach(x=>{const t=Math.round(x.getBoundingClientRect().top);m[t]=(m[t]||0)+1;});return Object.values(m);});
  ok(rows.join()==='2,2,2','mobile: sub-tabs two across ('+rows+')');
  const st=await p.evaluate(()=>{const a=document.querySelector('#assets-page .subtab-btn.active'),i=document.querySelectorAll('#assets-page .subtab-btn:not(.active)')[0];const ca=getComputedStyle(a),ci=getComputedStyle(i);return{a:ca.borderTopColor,i:ci.borderTopColor,ac:ca.color,ic:ci.color};});
  console.log(JSON.stringify(st)); ok(st.a!==st.i&&st.ac!==st.ic,'selected tab is bright, idle tabs dark outlined');
  await p.evaluate(()=>{showSubtab('assets','stocks',document.querySelector('.subtab-btn[onclick*="stocks"]'));}); await p.waitForTimeout(700);
  const sp=await p.evaluate(()=>{const e=document.getElementById('stk-pies');return{wrap:getComputedStyle(e).flexWrap,sw:e.scrollWidth,cw:e.clientWidth,arrow:document.querySelector('#stk-pies').parentElement.querySelector('.swipe-arrow.r').classList.contains('on')};});
  console.log(JSON.stringify(sp)); ok(sp.wrap==='nowrap'&&sp.sw>sp.cw&&sp.arrow,'investment filters: one swipeable row with a "more" arrow');
  await p.evaluate(()=>showTab('budget')); await p.waitForTimeout(700);
  const sk=await p.evaluate(()=>{const w=document.getElementById('bd-sankey').parentElement;return{arrow:w.querySelector('.swipe-arrow.r').classList.contains('on'),cap:getComputedStyle(w.querySelector('.swipe-cap')).display,sx:document.documentElement.scrollWidth-innerWidth};});
  console.log(JSON.stringify(sk)); ok(sk.arrow&&sk.cap!=='none','cash-flow diagram: swipe arrow and caption'); ok(sk.sx<=1,'no horizontal page scroll on mobile');
  // subscription pop-up can be left
  await p.evaluate(()=>{document.getElementById('pro-offer-modal').classList.remove('hidden');}); await p.waitForTimeout(400);
  const hdr=await p.evaluate(()=>{const c=document.querySelector('#pro-offer-modal .vi-modal-close').getBoundingClientRect();return{top:c.top,bottom:c.bottom,vis:c.top>=0&&c.bottom<=innerHeight};});
  await p.evaluate(()=>{document.getElementById('pro-offer-modal').scrollTop=2000;}); await p.waitForTimeout(200);
  const hdr2=await p.evaluate(()=>{const c=document.querySelector('#pro-offer-modal .vi-modal-close').getBoundingClientRect();return c.top>=0&&c.bottom<=innerHeight;});
  ok(hdr.vis&&hdr2,'upgrade pop-up: ✕ stays on screen even when scrolled to the bottom');
  await p.keyboard.press('Escape'); ok(await p.evaluate(()=>document.getElementById('pro-offer-modal').classList.contains('hidden')),'Esc closes it');
  await p.evaluate(()=>{document.getElementById('pro-offer-modal').classList.remove('hidden');}); await p.mouse.click(5,300);
  ok(await p.evaluate(()=>document.getElementById('pro-offer-modal').classList.contains('hidden')),'tapping outside closes it');
  await p.context().close();
  ok(errs.length===0,'no page errors '+errs.join('|'));
  await b.close(); console.log(fails?'FAILURES '+fails:'ALL PASSED');
})();
