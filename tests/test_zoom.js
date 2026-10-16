const { chromium } = require('playwright');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL:',m);} else console.log('ok  :',m); };
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:640,height:900},hasTouch:true}); const page=await ctx.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.addInitScript(()=>{if(localStorage.getItem('ht3'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'T',email:'t@t.com'}));
    localStorage.setItem('ht3',JSON.stringify({saved:30000,target:250000,houseType:'terraced',deposits:[{amount:30000,date:'01/10/2026'}],prices:{terraced:250000,semi:300000,detached:450000,mansion:900000,flat:200000,apartment:220000}}));});
  await page.goto('file:///home/user/Vault-It/index.html'); await page.waitForTimeout(1500);
  await page.addStyleTag({content:'#welcome-overlay,#login-overlay{display:none!important}'});
  await page.evaluate(()=>showTab('house')); await page.waitForTimeout(900);
  const bb=()=>page.evaluate(()=>{const g=[...document.querySelectorAll('#houseSvg > *')].filter(n=>!n.getAttribute('data-g')&&n.nodeName!=='defs'&&n.nodeName!=='rect');let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;g.forEach(n=>{try{const r=n.getBBox();x0=Math.min(x0,r.x);y0=Math.min(y0,r.y);x1=Math.max(x1,r.x+r.width);y1=Math.max(y1,r.y+r.height);}catch(e){}});return{w:x1-x0,h:y1-y0,x0,y0,x1,y1};});
  ok(Math.abs(await page.evaluate(()=>_houseZoom)-1.2)<1e-9,'default zoom is 1.2×');
  const types=['terraced','semi','detached','mansion','flat','apartment'];
  for(const t of types){await page.evaluate(t=>{state.houseType=t;state.target=state.prices[t];save();_houseZoom=_HZ_DEFAULT;_panX=_panY=0;updateUI();redraw();},t);await page.waitForTimeout(300);
    await page.locator('#houseSceneCard').screenshot({path:'shots/zoom_'+t+'.png'});}
  // pinch via two touches (CDP)
  await page.evaluate(()=>{state.houseType='terraced';_houseZoom=_HZ_DEFAULT;_panX=_panY=0;redraw();});
  const r=await page.locator('#house-scene').boundingBox(); const cx=r.x+r.width/2, cy=r.y+r.height/2;
  const cdp=await ctx.newCDPSession(page);
  const tp=(pts)=>pts.map((p,i)=>({x:p[0],y:p[1],id:i}));
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:tp([[cx-40,cy],[cx+40,cy]])});
  for(let i=1;i<=8;i++) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:tp([[cx-40-i*12,cy],[cx+40+i*12,cy]])});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const z1=await page.evaluate(()=>_houseZoom); ok(z1>2.5,'pinch out zooms in ('+z1.toFixed(2)+')');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:tp([[cx-170,cy],[cx+170,cy]])});
  for(let i=1;i<=8;i++) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:tp([[cx-170+i*18,cy],[cx+170-i*18,cy]])});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const z2=await page.evaluate(()=>_houseZoom); ok(z2<z1*0.6,'pinch in zooms out ('+z2.toFixed(2)+')');
  await page.evaluate(()=>houseZoomIn()); ok(await page.evaluate(()=>_houseZoom)>z2,'+ button zooms in');
  ok(errs.length===0,'no page errors '+errs.join('|'));
  await b.close(); console.log(fails?'FAILURES '+fails:'ALL PASSED');
})();
