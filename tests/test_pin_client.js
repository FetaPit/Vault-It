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
  // ── 1. brand-new user: email code, then set a PIN ──
  let {ctx,page}=await fresh(b);
  ok(await overlay(page)==='flex','login overlay shows for a new visitor');
  await page.fill('#auth-email','Pete@Example.com'); await page.click('#auth-email-step .auth-btn'); await page.waitForTimeout(700);
  ok(await step(page)==='auth-otp-step','no PIN on file → email code is sent');
  await page.fill('#auth-otp-inp','123456'); await page.click('#auth-otp-step .auth-btn'); await page.waitForTimeout(900);
  ok(await step(page)==='auth-setpin-step','after the code, the user is asked to set a PIN');
  ok(await page.evaluate(()=>document.querySelectorAll('#spin-dots .auth-pin-dot').length)===6,'PIN pad has 6 dots');
  await pad(page,'482915'); await pad(page,'482915'); await page.waitForTimeout(500);
  const srvPins=await page.evaluate(()=>JSON.stringify(_srv.pins));
  ok(srvPins===JSON.stringify({'pete@example.com':'482915'}),'PIN sent to the server for the signed-in email: '+srvPins);
  ok(await overlay(page)==='none','overlay closes once the PIN is set');
  ok(await page.evaluate(()=>localStorage.getItem('vi_pin_len')==='6'&&!!localStorage.getItem('vi_pin_hash')),'device remembers a PIN is set');
  ok(await page.evaluate(()=>!!JSON.parse(localStorage.getItem('vi_session')).email),'session created');
  // mismatch on confirm
  // ── 2. new device: just email + PIN ──
  const server=await page.evaluate(()=>JSON.stringify(_srv.pins)); await ctx.close();
  ({ctx,page}=await fresh(b));
  await page.evaluate(p=>{_srv.pins=JSON.parse(p);},server);
  await page.fill('#auth-email','pete@example.com'); await page.click('#auth-email-step .auth-btn'); await page.waitForTimeout(700);
  ok(await step(page)==='auth-pin-step','returning email → PIN screen (even on a device that has never seen this account)');
  ok(await page.evaluate(()=>document.getElementById('auth-pin-email').textContent)==='pete@example.com','PIN screen shows which email is signing in');
  ok(await page.evaluate(()=>document.querySelectorAll('#pin-dots .auth-pin-dot').length)===6,'6 PIN dots');
  ok(await page.evaluate(()=>_srv.otpMail)===0,'NO email code is sent for a returning user with a PIN');
  await pad(page,'111111');
  ok(/4 attempts left/.test(await err(page)),'wrong PIN → “'+await err(page)+'”');
  ok(await page.evaluate(()=>document.querySelectorAll('#pin-dots .filled').length)===0&&await step(page)==='auth-pin-step','dots clear and the user can retry');
  await pad(page,'482915'); await page.waitForTimeout(700);
  ok(await overlay(page)==='none','correct PIN signs in');
  const s=await page.evaluate(()=>({sess:JSON.parse(localStorage.getItem('vi_session')||'null'),user:_supaUser&&_supaUser.email,pinHash:!!localStorage.getItem('vi_pin_hash'),log:_srv.log.join(' ')}));
  ok(s.user==='pete@example.com'&&s.sess&&s.sess.email==='pete@example.com','real session established (not just a UI unlock)');
  ok(s.pinHash,'this device now remembers the PIN too');
  ok(!/set/.test(s.log.replace('status','')),'no “set a PIN” prompt after a PIN sign-in');
  await page.screenshot({path:OUT+'pin_after.png'});
  await ctx.close();
  // ── 3. lockout message ──
  ({ctx,page}=await fresh(b)); await page.evaluate(p=>{_srv.pins=JSON.parse(p);},server);
  await page.fill('#auth-email','pete@example.com'); await page.click('#auth-email-step .auth-btn'); await page.waitForTimeout(600);
  for(let i=0;i<5;i++)await pad(page,'000000');
  ok(/Too many attempts.*15 min.*email code/.test(await err(page)),'5th wrong PIN → “'+await err(page)+'”');
  await pad(page,'482915'); ok(/Too many attempts/.test(await err(page))&&await overlay(page)==='flex','correct PIN is refused while locked');
  await page.screenshot({path:OUT+'pin_locked.png'});
  // ── 4. forgot PIN → email code → choose a new PIN ──
  await page.evaluate(()=>{_srv.fails={};}); await page.click('#auth-pin-step button:has-text("Forgot PIN")'); await page.waitForTimeout(700);
  ok(await step(page)==='auth-otp-step'&&await page.evaluate(()=>_srv.otpMail)===1,'“Forgot PIN” sends an email code');
  await page.fill('#auth-otp-inp','123456'); await page.click('#auth-otp-step .auth-btn'); await page.waitForTimeout(900);
  ok(await step(page)==='auth-setpin-step','after the code the user must choose a new PIN (even though a PIN already existed)');
  await pad(page,'135790'); await pad(page,'135790'); await page.waitForTimeout(500);
  ok(await page.evaluate(()=>_srv.pins['pete@example.com'])==='135790','new PIN replaces the old one on the server');
  await ctx.close();
  // ── 5. keyboard entry ──
  ({ctx,page}=await fresh(b)); await page.evaluate(p=>{_srv.pins=JSON.parse(p);},server);
  await page.fill('#auth-email','pete@example.com'); await page.click('#auth-email-step .auth-btn'); await page.waitForTimeout(600);
  await page.keyboard.type('482915'); await page.waitForTimeout(900);
  ok(await overlay(page)==='none','PIN can be typed on a keyboard');
  // ── 6. Settings: change + remove PIN ──
  await page.evaluate(()=>{window.__c=authChangePin();}); await page.waitForSelector('#askpin-modal',{timeout:4000});   // an existing PIN: the current one is asked for first
  await page.fill('#askpin-inp','482915'); await page.click('#askpin-ok'); await page.waitForTimeout(300);
  ok(await overlay(page)==='flex'&&await step(page)==='auth-setpin-step','Settings → Set/change PIN asks for the current PIN, then opens the PIN pad over the app');
  await pad(page,'264813'); await pad(page,'264813'); await page.waitForTimeout(600);
  ok(await page.evaluate(()=>_srv.pins['pete@example.com'])==='264813'&&await overlay(page)==='none','PIN changed (and the overlay closes again)');
  await page.evaluate(()=>{window.confirm=()=>true;window.__r=authRemovePin();}); await page.waitForSelector('#askpin-modal',{timeout:4000});
  await page.fill('#askpin-inp','264813'); await page.click('#askpin-ok'); await page.waitForTimeout(500);
  ok(await page.evaluate(()=>!_srv.pins['pete@example.com']&&!localStorage.getItem('vi_pin_hash')),'Remove PIN deletes it on the server and this device');
  await ctx.close();
  // ── 7. PIN service unreachable → graceful fallback ──
  ({ctx,page}=await fresh(b)); await page.evaluate(()=>{_srv.down=true;});
  await page.fill('#auth-email','late@example.com'); await page.click('#auth-email-step .auth-btn'); await page.waitForTimeout(900);
  ok(await step(page)==='auth-otp-step','PIN service down → falls back to the email code');
  await page.fill('#auth-otp-inp','123456'); await page.click('#auth-otp-step .auth-btn'); await page.waitForTimeout(900);
  ok(await step(page)==='auth-setpin-step','…and still offers a PIN');
  await pad(page,'999111'); await pad(page,'999111'); await page.waitForTimeout(500);
  ok(await overlay(page)==='none'&&await page.evaluate(()=>localStorage.getItem('vi_pin_len')==='6'),'PIN falls back to this device only; sign-in is not blocked');
  await ctx.close();
  // ── 8. legacy 4-digit local PIN still works as a lock (live session, same email) ──
  ({ctx,page}=await fresh(b));
  await page.evaluate(()=>{_srv.session={email:'old@example.com',id:'u-old'};localStorage.setItem('vi_pin_hash',_hashStr('1234'));localStorage.setItem('vi_user',JSON.stringify({email:'old@example.com'}));});
  await page.fill('#auth-email','old@example.com'); await page.click('#auth-email-step .auth-btn'); await page.waitForTimeout(700);
  ok(await step(page)==='auth-pin-step'&&await page.evaluate(()=>document.querySelectorAll('#pin-dots .auth-pin-dot').length)===4,'legacy 4-digit local PIN → 4-dot lock screen');
  await pad(page,'1234'); ok(await overlay(page)==='none','legacy PIN unlocks');
  await ctx.close();
  // ── 9. signed out + local PIN but NO live session must not fake a login ──
  ({ctx,page}=await fresh(b));
  await page.evaluate(()=>{localStorage.setItem('vi_pin_hash',_hashStr('1234'));localStorage.setItem('vi_user',JSON.stringify({email:'old@example.com'}));});
  await page.fill('#auth-email','old@example.com'); await page.click('#auth-email-step .auth-btn'); await page.waitForTimeout(700);
  ok(await step(page)==='auth-otp-step','after sign-out a device-only PIN no longer opens the app without a real session → email code');
  await ctx.close();
  console.log(fails?('\n'+fails+' FAILED'):'\nALL PASSED'); await b.close();
})();
