const fs=require('fs'); const esbuild=require('esbuild');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL:',m);} else console.log('ok  :',m); };
let src=fs.readFileSync('/home/user/Vault-It/supabase/functions/pin-auth/index.ts','utf8');
src=src.replace(/import \{ createClient \} from [^\n]+\n/,'const createClient=globalThis.__createClient;\n');
const js=esbuild.transformSync(src,{loader:'ts',format:'cjs'}).code;

// ── in-memory stand-in for Supabase (mirrors the SQL in 004_user_pins.sql) ──
const db={pins:{}}; let otpCalls=0, released=0; const users={'jwt-alice':{id:'u-alice',email:'Alice@Example.com'},'jwt-bob':{id:'u-bob',email:'bob@example.com'}};
const rowsByEmail=e=>Object.values(db.pins).find(r=>r.email===e);
globalThis.__createClient=()=>({
  auth:{getUser:async jwt=>users[jwt]?{data:{user:users[jwt]},error:null}:{data:{user:null},error:{message:'bad'}},
        admin:{generateLink:async({email})=>{otpCalls++;return {data:{properties:{email_otp:'654321'}},error:null};}}},
  from:()=>({
    select:()=>({eq:(c,v)=>({maybeSingle:async()=>({data:rowsByEmail(v)?{user_id:rowsByEmail(v).user_id}:null})})}),
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
  }});
globalThis.Deno={env:{get:k=>({SUPABASE_URL:'http://x',SUPABASE_SERVICE_ROLE_KEY:'svc-secret-key'})[k]},serve:h=>{globalThis.__h=h;}};
new Function('require','module','exports',js)(require,{exports:{}},{});
const call=async(body,jwt)=>{const t=Date.now();const r=await globalThis.__h(new Request('http://x/pin-auth',{method:'POST',headers:{'content-type':'application/json',...(jwt?{authorization:'Bearer '+jwt}:{})},body:JSON.stringify(body)}));return {s:r.status,b:await r.json(),ms:Date.now()-t};};

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
  console.log(fails?('\n'+fails+' FAILED'):'\nALL PASSED');
})();
