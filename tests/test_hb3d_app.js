// Runs the classic house builder (vi-flag-house = 0): the brand build's own checks are in tests/test_hb_brand.js.
const { chromium } = require('playwright');
const routeThree=require('./three_route');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL:',m);} else console.log('ok  :',m); };
const seed=(o)=>`(function(){if(localStorage.getItem('ht3'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi-flag-house','0');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'T',email:'t@t.com',pro:true}));localStorage.setItem('vi_pioneer','true');localStorage.setItem('ht3',${JSON.stringify(JSON.stringify(o))});})();`;
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
  // ── clean shell: no scaffolding / ghosts / landscaping; rows; build % == deposit % funded, exactly
  const cl=await p.evaluate(()=>{const m=HB3D.viewer.model;const mats={};m.batches.forEach(b=>{mats[b.mat]=(mats[b.mat]||0)+b.count;});return{clean:m.clean,rows:m.rows,scaf:(mats.scaffold||0)+(mats.scaffoldBoard||0),ghost:m.batches.some(b=>b.ghost),temp:m.batches.some(b=>b.hideAfter<2),fence:(mats.fence||0)+(mats.paving||0)+(mats.grass||0),inst:m.instances,band:HB3D.viewer.rowBand&&HB3D.viewer.rowBand.visible,bandY:HB3D.viewer.rowBand&&HB3D.viewer.rowBand.position.y,ri:HB3D.viewer.rowInfo(),label:getComputedStyle(document.getElementById('hb3d-rowlabel')).display,labelTxt:document.getElementById('hb3d-rowlabel').innerText,card:(document.querySelector('.hb-row')||{}).innerText||'',edgesVisible:HB3D.viewer.edges&&HB3D.viewer.edges.visible};});
  console.log(JSON.stringify(cl).slice(0,500));
  ok(cl.clean&&cl.scaf===0&&!cl.ghost&&!cl.temp&&cl.fence===0,'clean shell: no scaffolding, ghost neighbours, site temporaries or landscaping');
  ok(cl.rows&&cl.rows.n>100&&cl.inst<30000,'clean shell: '+(cl.rows&&cl.rows.n)+' brick rows, '+cl.inst+' parts');
  ok(cl.band&&Math.abs(cl.bandY-(cl.rows.y0+0.4*(cl.rows.y1-cl.rows.y0)))<0.02,'a gold row band sits at 40% of the house height (y='+(cl.bandY||0).toFixed(2)+')');
  ok(cl.label!=='none'&&/ROW \d+ \/ \d+/i.test(cl.labelTxt)&&/40\.0% OF DEPOSIT/i.test(cl.labelTxt),'the house is labelled with the current row and deposit % ('+cl.labelTxt.replace(/\n/g,' ')+')');
  ok(/ROW\s*\d+\s*of\s*\d+/i.test(cl.card)&&/to finish this row/i.test(cl.card),'HUD says which row you are on and what is left to finish it');
  ok(cl.edgesVisible,'the unbuilt remainder is an outline only');
  await p.evaluate(()=>document.getElementById('hud-row').click()); await p.waitForTimeout(200);
  ok(await p.evaluate(()=>!!HB3D.viewer._fly||HB3D.viewer.zoom()>1.5),'📍 button glides the camera to the current row');
  await p.waitForFunction(()=>!HB3D.viewer._fly,null,{timeout:5000}).catch(()=>{});
  for(const sv of [500,5000,12500,25000,37500,50000,70000]){
    await p.evaluate(v=>{state.saved=v;state.deposits=[{amount:v,date:'01/10/2026'}];save();updateUI();},sv);
    await p.waitForFunction(()=>Math.abs(HB3D.viewer.p-Math.min(1,state.saved/depositTarget()))<1e-6&&!HB3D.viewer._anim,null,{timeout:30000}).catch(()=>{});
    await p.waitForTimeout(250);
    const o=await p.evaluate(()=>({p:HB3D.viewer.p,want:Math.min(1,state.saved/depositTarget()),ri:HB3D.viewer.rowInfo(),y:HB3D.viewer.rowBand&&HB3D.viewer.rowBand.position.y,r:HB3D.viewer.model.rows}));
    ok(Math.abs(o.p-o.want)<1e-6,'build % equals deposit %: £'+sv+' of £50,000 → '+(o.p*100).toFixed(2)+'% (want '+(o.want*100).toFixed(2)+'%)');
    if(o.want>0&&o.want<0.9999)ok(Math.abs(o.y-(o.r.y0+o.want*(o.r.y1-o.r.y0)))<0.02,'  … and the row band is at '+(o.want*100).toFixed(1)+'% of the height');
  }
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
