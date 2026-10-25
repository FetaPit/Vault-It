const fs=require('fs'); const esbuild=require('esbuild');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL:',m);} else console.log('ok  :',m); };
let src=fs.readFileSync('/home/user/Vault-It/supabase/functions/pin-auth/index.ts','utf8');
src=src.replace(/import \{ createClient \} from [^\n]+\n/,'const createClient=globalThis.__createClient;\n');
const js=esbuild.transformSync(src,{loader:'ts',format:'cjs'}).code;

// ── in-memory stand-in for Supabase (mirrors the SQL in 004_user_pins.sql) ──
const db={pins:{}}; let otpCalls=0, released=0; const NOW=()=>new Date().toISOString(), OLD=()=>new Date(Date.now()-2*3600e3).toISOString();
const users={'jwt-alice':{id:'u-alice',email:'Alice@Example.com',last_sign_in_at:NOW()},'jwt-bob':{id:'u-bob',email:'bob@example.com',last_sign_in_at:NOW()},
  'jwt-carol':{id:'u-carol',email:'carol@example.com',last_sign_in_at:NOW()},'jwt-dave':{id:'u-dave',email:'dave@example.com',last_sign_in_at:OLD()}};
const rate={}; let rateDown=false; const erased=[], deleted=[]; let eraseFails=false, deleteFails=false;
const rowsByEmail=e=>Object.values(db.pins).find(r=>r.email===e);
globalThis.__createClient=()=>({
  auth:{getUser:async jwt=>users[jwt]?{data:{user:users[jwt]},error:null}:{data:{user:null},error:{message:'bad'}},
        admin:{generateLink:async({email})=>{otpCalls++;return {data:{properties:{email_otp:'654321'}},error:null};},
               deleteUser:async id=>{if(deleteFails)return {error:{message:'gotrue down'}};deleted.push(id);return {error:null};}}},
  from:()=>({
    select:()=>({eq:(c,v)=>({maybeSingle:async()=>{const r=c==='user_id'?db.pins[v]:rowsByEmail(v);return {data:r?{user_id:r.user_id}:null};}})}),
    upsert:async(row)=>{db.pins[row.user_id]={...row};return {error:null};},
    delete:()=>({eq:async(c,v)=>{delete db.pins[v];return {};}}),
  }),
  rpc:async(fn,a)=>{
    if(fn==='pin_begin_attempt'){const r=rowsByEmail(a.p_email.toLowerCase());if(!r)return {data:[]};
      if(r.locked_until&&r.locked_until>Date.now())return {data:[{user_id:r.user_id,pin_hash:null,salt:null,iterations:0,attempts:r.failed_attempts,locked_secs:Math.ceil((r.locked_until-Date.now())/1000)}]};
      let n=r.failed_attempts; if(r.last_attempt_at&&r.last_attempt_at<Date.now()-864e5)n=0; n++;
      r.locked_until=(n%5===0)?Date.now()+Math.min(1440,15*Math.pow(2,n/5-1))*60000:null; r.failed_attempts=n; r.last_attempt_at=Date.now();
      released++; return {data:[{user_id:r.user_id,pin_hash:r.pin_hash,salt:r.salt,iterations:r.iterations,attempts:n,locked_secs:0}]};}
    if(fn==='pin_reset_attempts'){const r=db.pins[a.p_user];if(r){r.failed_attempts=0;r.locked_until=null;}return {};}
    if(fn==='rate_hit'){ if(rateDown)return {data:null,error:{message:'function rate_hit does not exist'}};
      const now=Date.now(); let r=rate[a.p_key]; if(!r||r.start<now-a.p_window_secs*1000)r=rate[a.p_key]={n:0,start:now}; r.n++;
      const allowed=r.n<=a.p_limit; return {data:[{allowed,retry_after:allowed?0:Math.ceil((r.start+a.p_window_secs*1000-now)/1000)}],error:null}; }
    if(fn==='erase_user_data'){ if(eraseFails)return {error:{message:'boom'}}; erased.push(a); delete db.pins[a.p_user]; return {error:null}; }
  }});
globalThis.Deno={env:{get:k=>({SUPABASE_URL:'http://x',SUPABASE_SERVICE_ROLE_KEY:'svc-secret-key',RATE_PIN_STATUS_PER_10MIN:'5',RATE_PIN_LOGIN_PER_10MIN:'8',RATE_PIN_DELETE_PER_HOUR:'3'})[k]},serve:h=>{globalThis.__h=h;}};
new Function('require','module','exports',js)(require,{exports:{}},{});
let ipN=0; // every call comes from its own address unless a test pins one
const call=async(body,jwt,ip)=>{const t=Date.now();const r=await globalThis.__h(new Request('http://x/pin-auth',{method:'POST',headers:{'content-type':'application/json','cf-connecting-ip':ip||('10.9.'+(ipN>>8)+'.'+(ipN++&255)),...(jwt?{authorization:'Bearer '+jwt}:{})},body:JSON.stringify(body)}));return {s:r.status,b:await r.json(),ms:Date.now()-t,h:r.headers};};

(async()=>{
  let r=await call({action:'status',email:'alice@example.com'}); ok(r.b.pin===false,'status: no PIN yet');
  r=await call({action:'set',pin:'123456'}); ok(r.s===401,'set without a session is refused');
  r=await call({action:'set',pin:'123456'},'jwt-bogus'); ok(r.s===401,'set with an invalid token is refused');
  for(const bad of ['12345','1234567','abcdef','12 456','']){r=await call({action:'set',pin:bad},'jwt-alice'); if(r.s!==400){ok(false,'bad PIN format accepted: '+bad);}}
  ok(Object.keys(db.pins).length===0,'malformed PINs (short/long/letters) are never stored');
  r=await call({action:'set',pin:'482915'},'jwt-alice'); ok(r.b.ok===true,'set with a valid session works');
  const stored=Object.values(db.pins)[0];
  ok(stored.email==='alice@example.com','email stored lower-case');
  ok(!JSON.stringify(stored).includes('482915')&&stored.pin_hash.length===64,'PIN is stored only as a 256-bit hash');
  await call({action:'set',pin:'482915'},'jwt-bob'); const hs=Object.values(db.pins).map(x=>x.pin_hash);
  ok(hs[0]!==hs[1],'same PIN for two users → different hashes (per-user salt)');
  r=await call({action:'status',email:'ALICE@example.com'}); ok(r.b.pin===true,'status: PIN exists (case-insensitive)');

  // wrong PINs, countdown, lockout
  const seq=[]; for(let i=0;i<5;i++){r=await call({action:'login',email:'alice@example.com',pin:'000000'});seq.push(r.s+':'+(r.b.error)+':'+(r.b.remaining??r.b.retryAfter));}
  ok(seq.slice(0,4).join()==='401:invalid:4,401:invalid:3,401:invalid:2,401:invalid:1','wrong PINs count down remaining attempts: '+seq.slice(0,4).join(' '));
  ok(seq[4]==='429:locked:900','5th wrong PIN locks the account for 15 min: '+seq[4]);
  r=await call({action:'login',email:'alice@example.com',pin:'482915'}); ok(r.s===429&&r.b.error==='locked'&&!r.b.token,'even the CORRECT PIN is refused while locked (no token)');
  ok(otpCalls===0,'no session token was ever minted for a wrong/locked attempt');
  // unlock (simulate time passing) then success resets
  Object.values(db.pins).find(x=>x.email==='alice@example.com').locked_until=Date.now()-1;
  r=await call({action:'login',email:'alice@example.com',pin:'482915'}); ok(r.s===200&&r.b.ok&&r.b.token==='654321','after the lock expires the right PIN returns a one-time token');
  ok(db.pins['u-alice'].failed_attempts===0&&!db.pins['u-alice'].locked_until,'success resets the failure counter');
  // escalation
  const a=db.pins['u-alice']; a.failed_attempts=9; a.last_attempt_at=Date.now();
  r=await call({action:'login',email:'alice@example.com',pin:'111111'}); ok(r.s===429&&r.b.retryAfter===1800,'10th failure → 30 min lock (doubles): '+r.b.retryAfter);
  // old failures decay after 24h
  const b=db.pins['u-bob']; b.failed_attempts=4; b.last_attempt_at=Date.now()-2*864e5; b.locked_until=null;
  r=await call({action:'login',email:'bob@example.com',pin:'111111'}); ok(r.b.remaining===4,'failures older than 24 h no longer count');
  // unknown e-mail: same answer, no oracle
  const u=await call({action:'login',email:'nobody@example.com',pin:'123456'}); const w=await call({action:'login',email:'bob@example.com',pin:'999999'});
  ok(u.s===401&&u.b.error==='invalid'&&u.b.remaining===undefined,'unknown e-mail looks like a wrong PIN (no “remaining”, no hint it does not exist)');
  ok(u.ms>=330&&w.ms>=330,'responses take a uniform minimum time ('+u.ms+'ms / '+w.ms+'ms)');
  r=await call({action:'login',email:'not-an-email',pin:'123456'}); ok(r.s===401,'bad email format → generic refusal');
  r=await call({action:'login',email:'bob@example.com',pin:'12'}); ok(r.s===401,'bad PIN format → generic refusal');
  // parallel guessing cannot bypass the lockout
  db.pins['u-bob'].failed_attempts=0;db.pins['u-bob'].locked_until=null;db.pins['u-bob'].last_attempt_at=null;
  released=0;
  const burst=await Promise.all(Array.from({length:40},(_,i)=>call({action:'login',email:'bob@example.com',pin:String(100000+i)})));
  ok(released<=5,'40 parallel guesses → the database releases at most 5 for checking ('+released+'); the rest hit the lock');
  ok(burst.every(x=>!x.b.token),'no token for any burst guess');
  // remove
  r=await call({action:'remove'},'jwt-bob'); ok(r.b.ok&&!db.pins['u-bob'],'remove deletes the PIN (needs a session)');
  r=await call({action:'remove'}); ok(r.s===401,'remove without a session is refused');
  r=await call({action:'nonsense'}); ok(r.s===400,'unknown action → 400');

  // ── per-IP limits: stop enumeration and spreading guesses over many accounts ──
  const IP='203.0.113.7'; const st=[]; for(let i=0;i<7;i++)st.push((await call({action:'status',email:'x'+i+'@example.com'},null,IP)).s);
  ok(st.join()==='200,200,200,200,200,429,429','status: 5 lookups per 10 min per IP, then 429: '+st.join());
  r=await call({action:'status',email:'x@example.com'},null,IP); ok(r.b.error==='rate_limited'&&r.b.retryAfter>0&&r.b.retryAfter<=600&&r.h.get('retry-after'),'429 says rate_limited and when to retry ('+r.b.retryAfter+'s)');
  r=await call({action:'status',email:'x@example.com'},null,'203.0.113.8'); ok(r.s===200,'another IP is unaffected');
  Object.values(db.pins).forEach(x=>{x.failed_attempts=0;x.locked_until=null;x.last_attempt_at=null;});
  const before=released; const LIP='203.0.113.9'; const lg=[]; for(let i=0;i<10;i++)lg.push((await call({action:'login',email:'nobody'+i+'@example.com',pin:'123456'},null,LIP)).s);
  ok(lg.join()==='401,401,401,401,401,401,401,401,429,429','login: 8 tries per 10 min per IP across ALL accounts, then 429: '+lg.join());
  r=await call({action:'login',email:'bob@example.com',pin:'999999'},null,LIP); const rel=released;
  ok(r.b.error==='rate_limited'&&released===rel,'a rate-limited login is refused before the PIN check — it spends none of the account\'s attempts');
  ok(!(await call({action:'login',email:'bob@example.com',pin:'999999'},null,LIP)).b.token,'no token while rate limited');
  rateDown=true; r=await call({action:'status',email:'alice@example.com'},null,IP); ok(r.s===200&&r.b.pin===true,'if the limiter is unavailable the request still works (fails open; PIN lockout still applies)'); rateDown=false;
  r=await call({action:'login',email:'alice@example.com',pin:'000000'},null,'198.51.100.1',); ok(r.s===401||r.s===429,'login still protected by the per-account lockout');

  // ── delete my account ──
  Object.keys(db.pins).forEach(k=>delete db.pins[k]);
  await call({action:'set',pin:'482915'},'jwt-alice'); await call({action:'set',pin:'135790'},'jwt-bob');
  r=await call({action:'delete',pin:'482915'}); ok(r.s===401&&!erased.length&&!deleted.length,'delete without a session is refused');
  r=await call({action:'delete',pin:'482915'},'jwt-bogus'); ok(r.s===401&&!erased.length,'delete with an invalid token is refused');
  r=await call({action:'delete'},'jwt-alice'); ok(r.s===401&&r.b.error==='invalid'&&!erased.length,'a user with a PIN must supply it (nothing erased)');
  r=await call({action:'delete',pin:'111111'},'jwt-alice'); ok(r.s===401&&r.b.remaining===4&&!erased.length&&!deleted.length,'wrong PIN → refused, counts as a failed attempt, nothing erased');
  for(let i=0;i<3;i++)await call({action:'delete',pin:'111111'},'jwt-alice');
  r=await call({action:'delete',pin:'111111'},'jwt-alice'); ok(r.s===429&&r.b.error==='locked','5 wrong PINs on delete lock the account exactly like sign-in ('+r.b.error+')');
  ok(r.s!==200&&!erased.length,'still nothing erased');
  r=await call({action:'login',email:'alice@example.com',pin:'482915'}); ok(r.s===429&&!r.b.token,'…and the lock applies to sign-in too (shared counter)');
  r=await call({action:'delete',pin:'482915'},'jwt-alice'); ok(r.s===429&&!erased.length,'the correct PIN is refused while locked');
  db.pins['u-alice'].locked_until=Date.now()-1;
  r=await call({action:'delete',pin:'482915',email:'bob@example.com'},'jwt-alice'); ok(r.s===200&&r.b.ok===true,'correct PIN → account deleted');
  ok(erased.length===2&&erased.every(e=>e.p_user==='u-alice'&&e.p_email==='alice@example.com'),'data erased for the SIGNED-IN user (their e-mail, lower-case) — an e-mail in the request body is ignored; erased again after the login is removed (sweep)');
  ok(deleted.join()==='u-alice','auth user deleted after the data');
  ok(!db.pins['u-alice']&&!!db.pins['u-bob'],"another user's PIN/data is untouched");
  // no PIN → must have signed in recently
  r=await call({action:'delete'},'jwt-dave'); ok(r.s===403&&r.b.error==='recent_login'&&deleted.length===1,'no PIN and a stale sign-in → asked to sign in again first (nothing erased)');
  r=await call({action:'delete'},'jwt-carol'); ok(r.s===200&&deleted.join()==='u-alice,u-carol'&&erased[2].p_email==='carol@example.com','no PIN but signed in minutes ago → deleted');
  // failure ordering: if erasing the data fails the sign-in account must be kept (so the user can retry)
  users['jwt-erin']={id:'u-erin',email:'erin@example.com',last_sign_in_at:NOW()}; eraseFails=true;
  r=await call({action:'delete'},'jwt-erin'); ok(r.s===500&&!deleted.includes('u-erin'),'if erasing the data fails, the login is NOT deleted (nothing half-done, retry works)'); eraseFails=false;
  // delete: data gone but the login could not be removed → say so ('partial'), do not claim nothing changed
  users['jwt-gina']={id:'u-gina',email:'gina@example.com',last_sign_in_at:NOW()}; deleteFails=true; const eBefore=erased.length;
  r=await call({action:'delete'},'jwt-gina'); ok(r.s===500&&r.b.error==='partial'&&erased.length===eBefore+1&&!deleted.includes('u-gina'),'login removal fails after the data was erased → reported as "partial" (retry is safe)'); deleteFails=false;
  r=await call({action:'delete'},'jwt-gina'); ok(r.s===200&&deleted.includes('u-gina'),'…and a retry completes the deletion');
  const DIP='203.0.113.50'; users['jwt-f']={id:'u-f',email:'f@example.com',last_sign_in_at:OLD()}; const dl=[]; for(let i=0;i<5;i++)dl.push((await call({action:'delete'},'jwt-f',DIP)).s);
  ok(dl.join()==='403,403,403,429,429','delete attempts are limited per IP: '+dl.join());

  // ── weak PINs are refused (an attacker gets 5 free guesses per account) ──
  Object.keys(db.pins).forEach(k=>delete db.pins[k]);
  users['jwt-wes']={id:'u-wes',email:'wes@example.com',last_sign_in_at:NOW()};
  const weak=['000000','111111','999999','123456','234567','456789','890123','654321','987654','321098','121212','123123','112233','520520','159753','102030'];
  const accepted=[]; for(const w of weak){r=await call({action:'set',pin:w},'jwt-wes'); if(r.s!==400||r.b.error!=='pin_weak')accepted.push(w+':'+r.s);}
  ok(!accepted.length&&!db.pins['u-wes'],'trivial PINs are refused and never stored'+(accepted.length?' — accepted: '+accepted:''));
  for(const good of ['482915','135790','907314','264813']){r=await call({action:'set',pin:good},'jwt-wes'); if(r.b.ok!==true)ok(false,'a reasonable PIN was refused: '+good);}
  ok(!!db.pins['u-wes'],'ordinary PINs are accepted');

  // ── changing credentials needs more than a session token ──
  // A token holder (stale sign-in) who does not know the PIN cannot install their own PIN and then delete the account
  users['jwt-vic']={id:'u-vic',email:'vic@example.com',last_sign_in_at:NOW()};
  await call({action:'set',pin:'731942'},'jwt-vic'); const victimHash=db.pins['u-vic'].pin_hash; users['jwt-vic'].last_sign_in_at=OLD();
  const dBefore=deleted.length, eB=erased.length;
  r=await call({action:'set',pin:'222333'},'jwt-vic'); ok(r.s===400,'(weak PIN refused before anything else)');
  r=await call({action:'set',pin:'846201'},'jwt-vic'); ok(r.s===403&&r.b.error==='reauth'&&db.pins['u-vic'].pin_hash===victimHash,'set over an existing PIN with a stale session and no current PIN → 403, PIN unchanged');
  r=await call({action:'delete',pin:'846201'},'jwt-vic'); ok(r.s===401&&deleted.length===dBefore&&erased.length===eB,'…so set-then-delete does not work: the attacker cannot delete the account (PoC B)');
  r=await call({action:'remove'},'jwt-vic'); ok(r.s===403&&!!db.pins['u-vic'],'remove with a stale session and no current PIN → 403, PIN kept');
  users['jwt-nopin']={id:'u-nopin',email:'nopin@example.com',last_sign_in_at:OLD()};
  r=await call({action:'set',pin:'846201'},'jwt-nopin'); ok(r.s===403&&r.b.error==='recent_login'&&!db.pins['u-nopin'],'set on an account WITHOUT a PIN with a stale session → 403 recent_login (nothing stored)');
  r=await call({action:'delete',pin:'846201'},'jwt-nopin'); ok(r.s===403&&r.b.error==='recent_login'&&!deleted.includes('u-nopin'),'…so set-then-delete cannot bypass the recent-login rule either (PoC A)');
  r=await call({action:'set',pin:'846201',current:'000000'},'jwt-vic'); ok(r.s===401&&r.b.error==='invalid'&&r.b.remaining===3&&db.pins['u-vic'].pin_hash===victimHash,'wrong current PIN → refused and counted as a failed attempt');
  r=await call({action:'set',pin:'846201',current:'731942'},'jwt-vic'); ok(r.s===200&&r.b.ok&&db.pins['u-vic'].pin_hash!==victimHash,'correct current PIN allows a change even with a stale session');
  r=await call({action:'remove',current:'846201'},'jwt-vic'); ok(r.s===200&&!db.pins['u-vic'],'correct current PIN allows removal');
  // a fresh e-mail-code sign-in is enough (first PIN after sign-up, and "forgot PIN")
  users['jwt-vic'].last_sign_in_at=NOW();
  r=await call({action:'set',pin:'512906'},'jwt-vic'); ok(r.s===200,'right after signing in, a PIN can be set without a current PIN');
  r=await call({action:'set',pin:'389407'},'jwt-vic'); ok(r.s===200,'…and changed (forgot-PIN flow: e-mail code, then a new PIN)');
  // wrong current PINs share the sign-in lockout
  users['jwt-vic'].last_sign_in_at=OLD(); const lk=[]; for(let i=0;i<5;i++){r=await call({action:'set',pin:'846201',current:'000000'},'jwt-vic');lk.push(r.s);}
  ok(lk.join()==='401,401,401,401,429','guessing the current PIN locks the account like sign-in does: '+lk.join());
  r=await call({action:'login',email:'vic@example.com',pin:'389407'}); ok(r.s===429&&!r.b.token,'…and sign-in is refused while locked');

  // ── rate-limit keys: an IPv6 /64 is one customer ──
  const a6=[]; for(let i=0;i<3;i++)a6.push((await call({action:'status',email:'a@example.com'},null,'2001:db8:aaaa:1::'+(i+1))).s);
  for(let i=0;i<3;i++)a6.push((await call({action:'status',email:'a@example.com'},null,'2001:db8:aaaa:1:ffff:eeee:dddd:'+(i+1))).s);
  ok(a6.join()==='200,200,200,200,200,429','addresses inside one /64 share a single allowance: '+a6.join());
  ok((await call({action:'status',email:'a@example.com'},null,'2001:db8:aaaa:2::1')).s===200,'a different /64 is separate');
  const m4=[]; for(let i=0;i<6;i++)m4.push((await call({action:'status',email:'a@example.com'},null,i%2?'::ffff:198.51.100.9':'198.51.100.9')).s);
  ok(m4.join()==='200,200,200,200,200,429','an IPv4-mapped IPv6 address counts as the same IPv4: '+m4.join());
  console.log(fails?('\n'+fails+' FAILED'):'\nALL PASSED');
})();
