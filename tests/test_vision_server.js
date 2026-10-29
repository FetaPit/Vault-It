const fs=require('fs'); const esbuild=require('esbuild');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL:',m);} else console.log('ok  :',m); };
let src=fs.readFileSync('/home/user/Vault-It/supabase/functions/portfolio-vision/index.ts','utf8');
src=src.replace(/import \{ createClient \} from [^\n]+\n/,'const createClient=globalThis.__createClient;\n');
const js=esbuild.transformSync(src,{loader:'ts',format:'cjs'}).code;
let spent=0,cap=30,plan={is_pioneer:true,is_founder:false},anthropicCalls=0,lastBody=null,env={SUPABASE_URL:'http://x',SUPABASE_SERVICE_ROLE_KEY:'svc',ANTHROPIC_API_KEY:'sk-test'};
globalThis.__createClient=()=>({auth:{getUser:async j=>j==='good'?{data:{user:{id:'u1'}},error:null}:{data:{user:null},error:{message:'x'}}},
  rpc:async(fn,a)=>{if(fn!=='vision_take_month')return{};if(a.p_cost>0&&spent+a.p_cost>a.p_max)return{data:false};spent+=a.p_cost;return{data:true};},
  from:t=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:t==='profiles'?plan:null,error:null})})})})});
globalThis.Deno={env:{get:k=>env[k]},serve:h=>{globalThis.__h=h;}};
globalThis.fetch=async(url,opt)=>{
  if(String(url).includes('api.anthropic.com')){anthropicCalls++;lastBody=JSON.parse(opt.body);
    return new Response(JSON.stringify({content:[{type:'tool_use',input:{portfolio:'Fully Future Focused',currency:'GBP',holdings:[
      {name:'Figma',ticker:'FIG',value:277.79,pl:-6.08,weightPct:21.39},{name:'Take-Two Interactive',value:452.10},{name:'  ',value:1},{name:'Junk',value:'x'}]}}]}),{status:200});}
  if(String(url).includes('finance/search')){const q=decodeURIComponent(String(url).split('q=')[1].split('&')[0]);
    if(q==='Take-Two Interactive')return new Response(JSON.stringify({quotes:[{symbol:'TTWO',quoteType:'EQUITY',shortname:'Take-Two',exchDisp:'NASDAQ'},{symbol:'XX',quoteType:'OPTION'}]}));
    return new Response(JSON.stringify({quotes:[{symbol:'FIG',quoteType:'EQUITY',shortname:'Figma, Inc.',exchDisp:'NYSE'},{symbol:'FIG.DE',quoteType:'EQUITY',exchDisp:'Frankfurt'}]}));}
  throw new Error('unexpected '+url);};
new Function('require','module','exports',js)(require,{exports:{}},{});
const call=async(body,jwt='good',method='POST')=>{const r=await globalThis.__h(new Request('http://x/pv',{method,headers:{'content-type':'application/json',...(jwt?{authorization:'Bearer '+jwt}:{})},body:method==='POST'?JSON.stringify(body):undefined}));return{s:r.status,b:await r.json().catch(()=>null)};};
const img={media_type:'image/jpeg',data:'QUJD'};
(async()=>{
  let r=await call({images:[img]},null); ok(r.s===401,'no token → 401'); 
  r=await call({images:[img]},'bad'); ok(r.s===401,'invalid token → 401');
  ok(anthropicCalls===0,'no model call (no cost) for unauthenticated requests');
  r=await call({images:[]}); ok(r.s===400,'no images → 400');
  r=await call({images:[{media_type:'image/gif',data:'QUJD'}]}); ok(r.s===400,'unsupported type → 400');
  r=await call({images:[{media_type:'image/jpeg',data:'<script>'}]}); ok(r.s===400,'non-base64 → 400');
  r=await call({images:[{media_type:'image/jpeg',data:'A'.repeat(2_900_000)}]}); ok(r.s===413,'oversize → 413');
  ok(anthropicCalls===0&&spent===0,'invalid input costs nothing');
  r=await call({images:[img,img]});
  ok(r.s===200&&anthropicCalls===1&&spent===2,'valid request: one model call, 2 reads spent');
  ok(lastBody.tool_choice===undefined&&lastBody.tools[0].name==='report_holdings'&&lastBody.messages[0].content.filter(c=>c.type==='image').length===2,'no forced tool_choice (rejected by newer models), both images sent');
  ok(r.b.portfolio==='Fully Future Focused'&&r.b.holdings.length===3,'blank-name row dropped, others kept: '+r.b.holdings.map(h=>h.name));
  const f=r.b.holdings[0],t=r.b.holdings[1],j=r.b.holdings[2];
  ok(f.ticker==='FIG'&&f.value===277.79&&f.pl===-6.08&&f.candidates[0].symbol==='FIG'&&f.candidates.length===2,'model ticker first, Yahoo alternatives after');
  ok(t.ticker===null&&t.candidates.length===1&&t.candidates[0].symbol==='TTWO','name-only row resolved via search; non-equity filtered');
  ok(j.value===null,'non-numeric value → null');
  { const real=globalThis.fetch; globalThis.fetch=async(u,o)=>String(u).includes('anthropic')?new Response(JSON.stringify({error:{type:'invalid_request_error',message:'Your credit balance is too low to access the Anthropic API.'}}),{status:400}):real(u,o);
    spent=0; r=await call({images:[img]}); ok(spent===0,'a failed read is refunded'); ok(r.s===502&&r.b.upstream===400&&/credit balance/.test(r.b.detail)&&!JSON.stringify(r.b).includes('sk-test'),'upstream failure explains why (never the key): '+JSON.stringify(r.b)); globalThis.fetch=real; }
  { const real=globalThis.fetch; globalThis.fetch=async(u,o)=>String(u).includes('anthropic')?new Response(JSON.stringify({content:[{type:'text',text:'Here you go:\n'+JSON.stringify({portfolio:'P',holdings:[{name:'Figma',value:277.79}]})}]}),{status:200}):real(u,o);
    spent=0; r=await call({images:[img]}); ok(r.s===200&&r.b.holdings.length===1&&r.b.holdings[0].name==='Figma','JSON-in-text reply is accepted as a fallback'); globalThis.fetch=real; }
  { const real=globalThis.fetch; globalThis.fetch=async(u,o)=>String(u).includes('anthropic')?new Response(JSON.stringify({content:[{type:'text',text:'sorry, no table here'}]}),{status:200}):real(u,o);
    spent=0; r=await call({images:[img]}); ok(r.s===422&&spent===1,'a billed reply we could not use still counts (no refund leak)'); globalThis.fetch=real; }
  const calls0=anthropicCalls;
  spent=29; r=await call({images:[img,img]}); ok(r.s===429&&r.b.error==='limit'&&r.b.allowance===30&&anthropicCalls===calls0,'Pioneer: 30 a month, blocks before any model call');
  plan={is_pioneer:false,is_founder:false}; spent=2; r=await call({images:[img,img]}); ok(r.s===429&&r.b.allowance===3,'free: 3 a month');
  spent=2; r=await call({images:[img]}); ok(r.s===200,'free: the 3rd read is allowed');
  plan={is_pioneer:true,is_founder:true}; spent=9; r=await call({images:[img,img]}); ok(r.s===429&&r.b.allowance===10,'Founding Member: 10 a month (claiming founder never raises the allowance)');
  plan=null; spent=3; r=await call({images:[img]}); ok(r.s===429&&r.b.allowance===3,'unknown plan: the free allowance');
  env.ANTHROPIC_API_KEY=''; new Function('require','module','exports',js)(require,{exports:{}},{}); r=await call({images:[img]}); ok(r.s===503&&r.b.error==='not_configured','no API key → 503 not_configured');
  r=await call(null,'good','GET'); ok(r.s===405,'GET refused');
  console.log(fails?'FAILURES '+fails:'ALL PASSED');
})();
