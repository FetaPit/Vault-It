const { chromium } = require('playwright');
const routeThree=require('./three_route');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL:',m);} else console.log('ok  :',m); };
const seed=(o)=>`(function(){if(localStorage.getItem('ht3'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'T',email:'t@t.com',pro:true}));localStorage.setItem('vi_pioneer','true');localStorage.setItem('ht3',${JSON.stringify(JSON.stringify(o))});})();`;
(async()=>{
  const b=await chromium.launch(); const errs=[];
  const open=async(o,w,h,route=true)=>{const ctx=await b.newContext({viewport:{width:w||1280,height:h||900}}); if(route)await routeThree(ctx); const p=await ctx.newPage();
    p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error'&&!/Failed to load|net::/.test(m.text()))errs.push('console: '+m.text());});
    await p.addInitScript(seed(o)); await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(1500);
    await p.addStyleTag({content:'#welcome-overlay,#login-overlay{display:none!important}'}); await p.evaluate(()=>showTab('house')); await p.waitForTimeout(800); if(route)await p.waitForFunction(()=>!window.HB3D||!HB3D.viewer||HB3D.viewer.settled(),null,{timeout:15000}).catch(()=>{}); else await p.waitForTimeout(800); return p;};
  // Level 1 build
  let p=await open({saved:20000,target:250000,houseType:'terraced',deposits:[{amount:20000,date:'01/10/2026'}],prices:{terraced:250000}});
  let r=await p.evaluate(()=>({engine:document.getElementById('house-scene').getAttribute('data-engine'),canvas:!!document.querySelector('#house-scene canvas.hb3d-canvas'),svgHidden:getComputedStyle(document.getElementById('houseSvg')).display,mode:HB3DAPP.want&&HB3DAPP.want.mode,p:HB3D.viewer&&HB3D.viewer.p,bricks:document.getElementById('stBricks').textContent,hud:document.getElementById('hb-hud').innerText,cap:document.getElementById('hb3d-cap').textContent,zoom:_houseZoom}));
  console.log(JSON.stringify(r).slice(0,600));
  ok(r.engine==='3d'&&r.canvas&&r.svgHidden==='none','3D engine active, SVG hidden');
  ok(r.mode==='build'&&Math.abs(r.p-0.4)<0.01,'Level 1 build at 40%');
  ok(/UK bricks/i.test(r.hud)&&/Each brick ≈ £/.test(r.hud),'HUD shows real brick count');
  ok(/bricks/.test(r.cap),'caption shows bricks laid');
  await p.screenshot({path:'shots/hb3d/app_l1.png'});
  ok(errs.length===0,'no errors '+errs.slice(0,3).join(' | '));
  await p.context().close();
  // fallback: no three.js → SVG, no errors
  errs.length=0;
  p=await open({saved:20000,target:250000,houseType:'terraced',deposits:[{amount:20000,date:'01/10/2026'}],prices:{terraced:250000}},1280,900,false);
  r=await p.evaluate(()=>({engine:document.getElementById('house-scene').getAttribute('data-engine'),ghost:!!document.querySelector('#houseSvg #hb-ghost'),hud:document.getElementById('hb-hud').innerText}));
  ok(!r.engine&&r.ghost,'without three.js the SVG engine draws the ghost build');
  ok(/UK bricks/i.test(r.hud),'brick counts still available in fallback');
  ok(errs.length===0,'no errors in fallback '+errs.slice(0,3).join(' | '));
  await b.close(); console.log(fails?'FAILURES '+fails:'ALL PASSED');
})();
