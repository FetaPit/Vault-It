const { chromium } = require('playwright');
const routeThree=require('./three_route');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL:',m);} else console.log('ok  :',m); };
const seedFn=(o,pro)=>`(function(){if(localStorage.getItem('ht3'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'T',email:'t@t.com',pro:${pro!==false}}));${pro!==false?"localStorage.setItem('vi_pioneer','true');":''}localStorage.setItem('ht3',${JSON.stringify(JSON.stringify(o))});localStorage.setItem('pos_ov1',JSON.stringify({income:[{id:1,name:'Salary',amount:2000}],expenses:[{id:2,name:'Rent',amount:1200,type:'ce'}]}));})();`;
(async()=>{
  const b=await chromium.launch(); const errs=[];
  const settle=async p=>{await p.waitForTimeout(300);await p.waitForFunction(()=>hb3dState().settled,null,{timeout:20000}).catch(()=>{});};
  const open=async(o,opt)=>{opt=opt||{};const ctx=await b.newContext({viewport:{width:opt.w||1280,height:opt.h||900},hasTouch:!!opt.touch}); await routeThree(ctx); const p=await ctx.newPage();
    p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error'&&!/Failed to load|net::/.test(m.text()))errs.push('console: '+m.text());});
    await p.addInitScript(seedFn(o,opt.pro)); await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(1500);
    await p.addStyleTag({content:'#welcome-overlay,#login-overlay{display:none!important}'}); await p.evaluate(()=>showTab('house')); await settle(p); return p;};
  const L2={saved:37500,target:250000,houseType:'terraced',houseMode:'purchased',mortgageBalance:212500,valuation:250000,purchase:{price:250000,deposit:37500,date:'2026-10-01'},deposits:[{amount:37500,date:'01/10/2026'}],prices:{terraced:250000},calc:{over:300,_set:true,price:250000,dep:37500,bal:212500,val:250000}};
  // ── Level 2: equity clip ──
  let p=await open(L2);
  let s=await p.evaluate(()=>hb3dState()); console.log(JSON.stringify(s));
  ok(s.engine==='3d'&&s.mode==='equity','Level 2 renders the equity view in 3D');
  ok(Math.abs(s.clipY/s.height-0.15)<0.01,'solid part = 15% of the house height ('+(s.clipY/s.height*100).toFixed(1)+'%)');
  let ov=await p.evaluate(()=>({own:document.getElementById('hb3d-ownlabel').textContent,ownVis:getComputedStyle(document.getElementById('hb3d-ownlabel')).display,ib:document.getElementById('hb3d-intbar').innerText,ibVis:getComputedStyle(document.getElementById('hb3d-intbar')).display,segs:document.querySelectorAll('#hb3d-intbar .ib-seg').length,up:getComputedStyle(document.getElementById('hb3d-upglabel')).display}));
  ok(ov.own==='YOU OWN 15%'&&ov.ownVis!=='none','"YOU OWN 15%" label shown');
  ok(ov.ibVis!=='none'&&/INTEREST/.test(ov.ib)&&/slain/.test(ov.ib)&&ov.segs>=2,'interest bar with slain/remaining segments');
  ok(ov.up==='none','no upgrade label in Level 2');
  await p.screenshot({path:'shots/hb3d/app_l2.png'});
  await p.evaluate(()=>{state.mortgageBalance=150000;save();updateUI();}); await settle(p);
  s=await p.evaluate(()=>hb3dState()); ok(Math.abs(s.clipY/s.height-0.40)<0.01,'paying down to £150k → 40% solid ('+(s.clipY/s.height*100).toFixed(1)+'%)');
  ok(await p.evaluate(()=>document.getElementById('hb3d-ownlabel').textContent)==='YOU OWN 40%','label follows');
  await p.evaluate(()=>{state.mortgageBalance=0;save();updateUI();}); await settle(p);
  s=await p.evaluate(()=>hb3dState()); ok(s.mode==='complete','mortgage free → complete solid house');
  ok(await p.evaluate(()=>getComputedStyle(document.getElementById('hb3d-intbar')).display)==='none','no interest bar once mortgage-free');
  // ── Level 3: upgrade ghost ──
  await p.evaluate(()=>{state.mortgageBalance=180000;save();updateUI();hbUnlockL3();}); await settle(p);
  s=await p.evaluate(()=>hb3dState()); ok(s.mode==='build'&&s.upgrade,'Level 3 shows the upgrade home as a ghost build');
  ok(/UPGRADE \d+% FUNDED/.test(await p.evaluate(()=>document.getElementById('hb3d-upglabel').textContent)),'"UPGRADE n% FUNDED" label');
  await p.screenshot({path:'shots/hb3d/app_l3.png'});
  await p.context().close();
  // ── blank plot ──
  p=await open({saved:0,target:250000,houseType:'terraced',deposits:[],prices:{terraced:250000}});
  s=await p.evaluate(()=>hb3dState()); ok(s.mode==='site'&&await p.evaluate(()=>getComputedStyle(document.getElementById('hb3d-plotlabel')).display)!=='none','blank plot with "YOUR PLOT" label');
  // deposit → watch it build
  await p.evaluate(()=>{state.saved=25000;state.deposits=[{amount:25000,date:'01/10/2026'}];save();updateUI();}); await settle(p);
  s=await p.evaluate(()=>hb3dState()); ok(s.mode==='build'&&Math.abs(s.p-0.5)<0.01,'after a deposit the house builds to 50%');
  const st=await p.evaluate(()=>+document.getElementById('stBricks').textContent.replace(/,/g,'')); ok(st>1000,'Statistics card counts real bricks laid ('+st+')');
  // type switching + flats floor slider
  for(const t of ['semi','detached','mansion','flat','apartment','terraced']){
    await p.evaluate(t=>document.querySelector('.hbtn[data-type="'+t+'"]').click(),t); await settle(p);
    s=await p.evaluate(()=>hb3dState()); ok(s.engine==='3d'&&s.instances>0,t+': renders ('+s.type+', '+s.instances+' instances, '+s.bricks+' bricks)');
  }
  await p.evaluate(()=>document.querySelector('.hbtn[data-type="flat"]').click()); await settle(p);
  await p.evaluate(()=>setApartmentFloor(8)); await settle(p);
  s=await p.evaluate(()=>hb3dState()); ok(s.floor===8,'floor slider rebuilds the flat for floor 8');
  // expand / collapse resizes the renderer
  await p.evaluate(()=>toggleExpand()); await p.waitForTimeout(500);
  const cw=await p.evaluate(()=>{const c=document.querySelector('#house-scene canvas');return [c.width,c.clientWidth];}); ok(cw[1]>=1200,'expanded view fills the screen ('+cw[1]+'px)');
  await p.evaluate(()=>toggleExpand()); await p.waitForTimeout(300);
  await p.context().close();
  // ── pinch zoom on touch (non-Pro, like test_zoom) ──
  p=await open({saved:30000,target:250000,houseType:'terraced',deposits:[{amount:30000,date:'01/10/2026'}],prices:{terraced:250000}},{w:640,h:900,touch:true,pro:false});
  ok(Math.abs(await p.evaluate(()=>_houseZoom)-1.2)<1e-6,'default zoom 1.2');
  const r=await p.locator('#house-scene').boundingBox(); const cx=r.x+r.width/2, cy=r.y+r.height/2;
  const cdp=await p.context().newCDPSession(p); const tp=pts=>pts.map((q,i)=>({x:q[0],y:q[1],id:i}));
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:tp([[cx-40,cy],[cx+40,cy]])});
  for(let i=1;i<=8;i++) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:tp([[cx-40-i*12,cy],[cx+40+i*12,cy]])});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const z1=await p.evaluate(()=>_houseZoom); ok(z1>2.5,'pinch out zooms the 3D camera in ('+z1.toFixed(2)+')');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:tp([[cx-170,cy],[cx+170,cy]])});
  for(let i=1;i<=8;i++) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:tp([[cx-170+i*18,cy],[cx+170-i*18,cy]])});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const z2=await p.evaluate(()=>_houseZoom); ok(z2<z1*0.6,'pinch in zooms out ('+z2.toFixed(2)+')');
  await p.evaluate(()=>houseZoomIn()); ok(await p.evaluate(()=>_houseZoom)>z2,'+ button zooms in');
  await p.evaluate(()=>resetView()); ok(Math.abs(await p.evaluate(()=>_houseZoom)-1.2)<1e-6,'reset returns to the default view');
  await p.evaluate(()=>toggleOrbitMode()); ok(await p.evaluate(()=>HB3D.viewer.controls.touches.ONE===THREE.TOUCH.PAN),'orbit button switches one-finger drag to pan');
  ok(await p.evaluate(()=>hb3dState().mode)==='build'&&await p.evaluate(()=>hb3dState().p)===0.04,'non-Pro users see the 4% teaser');
  await p.screenshot({path:'shots/hb3d/app_mobile.png'});
  ok(errs.length===0,'no errors '+errs.slice(0,4).join(' | '));
  await b.close(); console.log(fails?'FAILURES '+fails:'ALL PASSED');
})();
