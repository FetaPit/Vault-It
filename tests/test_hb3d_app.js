// The 3D house builder in the app: the brand build is the only one (owner, 1 Nov 2026); its finer checks are in tests/test_hb_brand.js.
// Without three.js (CDN blocked or offline) the House tab shows a still picture with the same HUD figures.
const { chromium } = require('playwright');
const routeThree=require('./three_route');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL:',m);} else console.log('ok  :',m); };
const seed=(o)=>`(function(){if(localStorage.getItem('ht3'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'T',email:'t@t.com',pro:true}));localStorage.setItem('vi_pioneer','true');localStorage.setItem('ht3',${JSON.stringify(JSON.stringify(o))});})();`;
(async()=>{
  const b=await chromium.launch(); const errs=[];
  const open=async(o,w,h,route=true,qs='')=>{const ctx=await b.newContext({viewport:{width:w||1280,height:h||900},reducedMotion:'reduce'}); if(route)await routeThree(ctx); else await ctx.route(/cdn\.jsdelivr\.net/,r=>r.abort()); const p=await ctx.newPage();
    p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error'&&!/Failed to load|net::/.test(m.text()))errs.push('console: '+m.text());});
    await p.addInitScript(seed(o)); await p.goto('file:///home/user/Vault-It/index.html'+qs); await p.waitForTimeout(1500);
    await p.addStyleTag({content:'#welcome-overlay,#login-overlay{display:none!important}'}); await p.evaluate(()=>showTab('house')); await p.waitForTimeout(800); if(route)await p.waitForFunction(()=>window.HB3D&&HB3D.viewer&&HB3D.viewer.brandInfo&&HB3D.viewer.brandInfo()&&HB3D.viewer.settled(),null,{timeout:60000}).catch(()=>{}); else await p.waitForFunction(()=>document.getElementById('house-scene').getAttribute('data-engine')==='still',null,{timeout:20000}).catch(()=>{}); return p;};
  // Level 1 build
  let p=await open({saved:20000,target:250000,houseType:'terraced',deposits:[{amount:20000,date:'01/10/2026'}],prices:{terraced:250000}});
  let r=await p.evaluate(()=>({engine:document.getElementById('house-scene').getAttribute('data-engine'),canvas:!!document.querySelector('#house-scene canvas.hb3d-canvas'),still:(function(c){var cs=getComputedStyle(c);return cs.display==='none'||cs.opacity==='0'?'none':cs.display;})(document.getElementById('hbStill')),svg:!!document.getElementById('houseSvg'),brand:!!(HB3D.viewer&&HB3D.viewer.brandInfo&&HB3D.viewer.brandInfo()),mode:HB3DAPP.want&&HB3DAPP.want.mode,p:HB3D.viewer&&HB3D.viewer.p,bricks:document.getElementById('stBricks').textContent,hud:document.getElementById('hb-hud').innerText,cap:document.getElementById('hb3d-cap').textContent,zoom:_houseZoom}));
  console.log(JSON.stringify(r).slice(0,600));
  ok(r.engine==='3d'&&r.canvas&&r.still==='none'&&r.brand,'3D engine active with the brand build, still picture hidden');
  ok(!r.svg,'the SVG blueprint engine is gone (no #houseSvg)');
  ok(r.mode==='build'&&Math.abs(r.p-0.4)<0.01,'Level 1 build at 40%');
  ok(/UK bricks/i.test(r.hud)&&/Each brick ≈ £/.test(r.hud),'HUD shows real brick count');
  ok(/bricks/.test(r.cap),'caption shows bricks laid');
  await p.screenshot({path:'shots/hb3d/app_l1.png'});
  ok(errs.length===0,'no errors '+errs.slice(0,3).join(' | '));
  // ── clean shell: no scaffolding / ghosts / landscaping; rows; build % == deposit % funded, exactly
  const cl=await p.evaluate(()=>{const m=HB3D.viewer.model;const mats={};m.batches.forEach(b=>{mats[b.mat]=(mats[b.mat]||0)+b.count;});return{clean:m.clean,rows:m.rows,scaf:(mats.scaffold||0)+(mats.scaffoldBoard||0),ghost:m.batches.some(b=>b.ghost),temp:m.batches.some(b=>b.hideAfter<2),fence:(mats.fence||0)+(mats.paving||0)+(mats.grass||0),inst:m.instances,bi:HB3D.viewer.brandInfo(),N:m.counts.bricks,ri:HB3D.viewer.rowInfo(),label:getComputedStyle(document.getElementById('hb3d-rowlabel')).display,labelTxt:document.getElementById('hb3d-rowlabel').innerText,card:(document.querySelector('.hb-row')||{}).innerText||'',edgesVisible:HB3D.viewer.edges&&HB3D.viewer.edges.visible};});
  console.log(JSON.stringify(cl).slice(0,500));
  ok(cl.clean&&cl.scaf===0&&!cl.ghost&&!cl.temp&&cl.fence===0,'clean shell: no scaffolding, ghost neighbours, site temporaries or landscaping');
  ok(cl.rows&&cl.rows.n>100&&cl.inst<30000,'clean shell: '+(cl.rows&&cl.rows.n)+' brick rows, '+cl.inst+' parts');
  const want40=Math.floor(cl.N*(0.4-0.03)/0.77+1e-6);
  ok(cl.bi&&cl.bi.bricks===want40&&cl.ri&&cl.ri.brand&&Math.abs(cl.ri.y-cl.bi.y)<1e-9&&cl.bi.sliceA===1,'40% lays floor(bricks x seg(0.4, 0.03, 0.80)) = '+want40+' bricks, the gold slice on the last course (y='+(cl.ri&&cl.ri.y||0).toFixed(2)+')');
  ok(cl.label!=='none'&&/ROW \d+ \/ \d+/i.test(cl.labelTxt)&&/40\.0% OF DEPOSIT/i.test(cl.labelTxt),'the house is labelled with the current row and deposit % ('+cl.labelTxt.replace(/\n/g,' ')+')');
  ok(/ROW\s*\d+\s*of\s*\d+/i.test(cl.card)&&/to finish this row/i.test(cl.card),'HUD says which row you are on and what is left to finish it');
  ok(cl.edgesVisible,'the unbuilt remainder is an outline only');
  ok(await p.evaluate(()=>!document.getElementById('hud-row')),'the locate button is gone from the house viewport (owner, 3 Nov)');
  await p.waitForFunction(()=>!HB3D.viewer._fly,null,{timeout:5000}).catch(()=>{});
  for(const sv of [500,5000,12500,25000,37500,50000,70000]){
    await p.evaluate(v=>{state.saved=v;state.deposits=[{amount:v,date:'01/10/2026'}];save();updateUI();},sv);
    await p.waitForFunction(()=>Math.abs(HB3D.viewer.p-Math.min(1,state.saved/depositTarget()))<1e-6&&HB3D.viewer.settled(),null,{timeout:30000}).catch(()=>{});
    await p.waitForTimeout(250);
    const o=await p.evaluate(()=>({p:HB3D.viewer.p,want:Math.min(1,state.saved/depositTarget()),bi:HB3D.viewer.brandInfo(),N:HB3D.viewer.model.counts.bricks,laid:document.getElementById('stBricks').textContent}));
    ok(Math.abs(o.p-o.want)<1e-6,'build % equals deposit %: £'+sv+' of £50,000 → '+(o.p*100).toFixed(2)+'% (want '+(o.want*100).toFixed(2)+'%)');
    const wb=Math.floor(o.N*Math.min(1,Math.max(0,(o.want-0.03)/0.77))+1e-6);
    ok(o.bi&&o.bi.bricks===wb&&o.laid===wb.toLocaleString('en-GB'),'  … and '+wb.toLocaleString('en-GB')+' bricks are laid, as the statistics say ('+o.laid+')');
  }
  await p.context().close();
  // fallback: the legacy viewer (?house=legacy) with three.js blocked (cdn.jsdelivr.net) → the still picture, no errors. (The brand-book renderer,
  // the default since v0.7, needs no three.js: without WebGL at all it shows the same still, which tests/test_house_gl.js and test_hb_one_builder.js cover.)
  errs.length=0;
  p=await open({saved:20000,target:250000,houseType:'terraced',deposits:[{amount:20000,date:'01/10/2026'}],prices:{terraced:250000}},1280,900,false,'?house=legacy');
  await p.waitForTimeout(500);
  r=await p.evaluate(()=>{const cv=document.getElementById('hbStill'),c=cv.getContext('2d'),d=c.getImageData(0,0,cv.width,cv.height).data,cols=new Set();
    for(let i=0;i<d.length;i+=4*97)cols.add(d[i]+','+d[i+1]+','+d[i+2]+','+d[i+3]);
    return{engine:document.getElementById('house-scene').getAttribute('data-engine'),disp:getComputedStyle(cv).display,w:cv.width,h:cv.height,cols:cols.size,gl:!!document.querySelector('#house-scene canvas.hb3d-canvas'),hud:document.getElementById('hb-hud').innerText};});
  ok(r.engine==='still'&&r.disp!=='none'&&r.w>100&&r.h>100,'without three.js the House tab shows the still picture ('+r.w+' x '+r.h+')');
  ok(r.cols>20,'the still picture is drawn, not blank ('+r.cols+' colours sampled)');
  ok(/Each brick ≈ £/.test(r.hud),'the HUD figures are the same in the still picture');
  ok(/UK bricks/i.test(r.hud),'brick counts still available in fallback');
  ok(errs.length===0,'no errors in fallback '+errs.slice(0,3).join(' | '));
  await b.close(); console.log(fails?'FAILURES '+fails:'ALL PASSED');
})();
