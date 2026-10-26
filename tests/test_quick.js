const { chromium } = require('playwright');
const OUT=(() => { const d = require('os').tmpdir() + '/vaultit-shots/'; try { require('fs').mkdirSync(d, { recursive: true }); } catch (e) {} return d; })();
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL:',m);} else console.log('ok  :',m); };
const MOCK=`
  window._srv={pins:{},fails:{},log:[],otpMail:0,down:false,session:null};
  const srv=window._srv;
  const fnErr=(status,body)=>({data:null,error:{context:{json:async()=>body,status}}});
  _supaClient={
    functions:{invoke:async(name,{body})=>{
      srv.log.push(name+':'+(body.action||''));
      if(name==='send-auth-email'){srv.otpMail++;return {data:{success:true},error:null};}
      if(srv.down)return {data:null,error:{message:'down'}};
      const e=(body.email||'').toLowerCase();
      if(body.action==='status')return {data:{pin:!!srv.pins[e]},error:null};
      if(body.action==='set'){if(!srv.session)return fnErr(401,{error:'auth'});srv.pins[srv.session.email]=body.pin;srv.fails[srv.session.email]=0;return {data:{ok:true},error:null};}
      if(body.action==='remove'){if(!srv.session)return fnErr(401,{error:'auth'});delete srv.pins[srv.session.email];return {data:{ok:true},error:null};}
      if(body.action==='login'){
        if(!srv.pins[e]) return fnErr(401,{error:'invalid'});
        srv.fails[e]=(srv.fails[e]||0);
        if(srv.fails[e]>=5)return fnErr(429,{error:'locked',retryAfter:900});
        srv.fails[e]++;
        if(srv.pins[e]===body.pin){srv.fails[e]=0;return {data:{ok:true,token:'PINTOKEN'},error:null};}
        return srv.fails[e]>=5?fnErr(429,{error:'locked',retryAfter:900}):fnErr(401,{error:'invalid',remaining:5-srv.fails[e]});
      }
      return fnErr(400,{error:'bad'});
    }},
    auth:{
      verifyOtp:async({email,token})=>{ if(token==='123456'||token==='PINTOKEN'){srv.session={email,id:'u-'+email};return {data:{user:{id:'u-'+email,email}},error:null};} return {data:null,error:{message:'bad'}}; },
      getSession:async()=>({data:{session:srv.session&&{user:{id:srv.session.id,email:srv.session.email}}}}),
      signOut:async()=>{srv.session=null;return {};}
    },
    from:()=>{const q={select:()=>q,eq:()=>Promise.resolve({data:[]}),upsert:()=>Promise.resolve({}),single:()=>Promise.resolve({data:null}),then:(r)=>r({data:[]})};return q;}
  };`;
const fresh=async(b,state)=>{ // new browser context = a brand-new device
  const ctx=await b.newContext({viewport:{width:430,height:900}}); const page=await ctx.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(e.message)); page.errs=errs;
  await page.addInitScript(()=>{localStorage.setItem('vi_declined_demo','true');});
  await page.goto('file:///home/user/Vault-It/index.html'); await page.waitForTimeout(1200);
  await page.evaluate(MOCK); return {ctx,page};
};
const pad=async(page,digits)=>{for(const d of digits)await page.evaluate(d=>{const act=document.querySelector('.auth-step.active').id;act==='auth-setpin-step'?_setPinKey(d):_enterPinKey(d);},d); await page.waitForTimeout(500);};
const step=page=>page.evaluate(()=>document.querySelector('.auth-step.active').id);
const overlay=page=>page.evaluate(()=>getComputedStyle(document.getElementById('login-overlay')).display);
const err=page=>page.evaluate(()=>document.getElementById('auth-err').textContent);

(async()=>{
  const b=await chromium.launch();
  const HYD="window._hydrateFromSupabase=async()=>{localStorage.setItem('vi_user',JSON.stringify({name:'Pete',email:'pete@example.com'}));return true;};";
  let {ctx,page}=await fresh(b);
  ok(await page.evaluate(()=>getComputedStyle(document.getElementById('welcome-overlay')).display)!=='none','new device: welcome overlay exists underneath');
  await page.evaluate(()=>{_srv.pins={'pete@example.com':'482915'};}); await page.evaluate(HYD);
  await page.fill('#auth-email','pete@example.com'); await page.click('#auth-email-step .auth-btn'); await page.waitForTimeout(700);
  await pad(page,'482915'); await page.waitForTimeout(900);
  ok(await overlay(page)==='none','login overlay closes');
  ok(await page.evaluate(()=>getComputedStyle(document.getElementById('welcome-overlay')).display)==='none','welcome questionnaire NOT shown after PIN login');
  const s=await page.evaluate(()=>({sess:JSON.parse(localStorage.getItem('vi_session')),last:localStorage.getItem('vi_last_email')}));
  ok(s.last==='pete@example.com','last email remembered');
  ok(s.sess.expiry-Date.now()>29*864e5,'session ~30 days');
  // reload: session renewed, no overlays
  const st=await page.evaluate(()=>{const o=JSON.parse(localStorage.getItem('vi_session'));o.expiry=Date.now()+864e5;localStorage.setItem('vi_session',JSON.stringify(o));return localStorage.getItem('vi_user');});
  await page.reload(); await page.waitForTimeout(1200);
  ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('vi_session')).expiry-Date.now()>29*864e5),'session renewed on open');
  ok(await overlay(page)==='none'&&await page.evaluate(()=>getComputedStyle(document.getElementById('welcome-overlay')).display)==='none','reload: straight into the app');
  // session expired: PIN pad shown directly with email prefilled
  await page.evaluate(()=>{const o=JSON.parse(localStorage.getItem('vi_session'));o.expiry=Date.now()-1000;localStorage.setItem('vi_session',JSON.stringify(o));});
  await page.reload(); await page.waitForTimeout(1200);
  await page.evaluate(MOCK); await page.evaluate(()=>{_srv.pins={'pete@example.com':'482915'};}); await page.evaluate(HYD);
  await page.evaluate(()=>initQuickLogin()); await page.waitForTimeout(600);
  ok(await overlay(page)==='flex'&&await step(page)==='auth-pin-step','expired session: PIN pad shown directly');
  ok(await page.evaluate(()=>document.getElementById('auth-pin-email').textContent)==='pete@example.com','shows which email');
  await pad(page,'482915'); await page.waitForTimeout(900);
  ok(await overlay(page)==='none','PIN signs back in');
  // PIN removed server-side: email step prefilled
  await page.evaluate(()=>{const o=JSON.parse(localStorage.getItem('vi_session'));o.expiry=Date.now()-1000;localStorage.setItem('vi_session',JSON.stringify(o));});
  await page.reload(); await page.waitForTimeout(1200);
  await page.evaluate(MOCK); await page.evaluate(()=>initQuickLogin()); await page.waitForTimeout(600);
  ok(await step(page)==='auth-email-step'&&await page.evaluate(()=>document.getElementById('auth-email').value)==='pete@example.com','no PIN: email step prefilled');
  ok(page.errs.length===0,'no page errors '+page.errs.join('|'));
  await ctx.close(); await b.close();
  console.log(fails?'FAILURES '+fails:'ALL PASSED');
})();
