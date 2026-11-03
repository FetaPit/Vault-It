// E28 part 1 (v0.9.1): supabase/functions/secondhand-estimate. Node only, recorded-shape fixtures in tests/fixtures/secondhand
// (shapes follow each API's docs; the prices are made up for the test, not market data).
const fs=require('fs'); const esbuild=require('esbuild');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL:',m);} else console.log('ok  :',m); };
const FX='/home/user/Vault-It/tests/fixtures/secondhand/', fx=n=>JSON.parse(fs.readFileSync(FX+n+'.json','utf8'));
const src=fs.readFileSync('/home/user/Vault-It/supabase/functions/secondhand-estimate/index.ts','utf8');
const js=esbuild.transformSync(src,{loader:'ts',format:'cjs'}).code;
let ENV={}; const urls=[], heads=[];
globalThis.Deno={serve:h=>{globalThis.__h=h;},env:{get:k=>ENV[k]}};
let reverbList=fx('reverb-listings'), ebaySearch=fx('ebay-search'), ebayFail=false;
globalThis.fetch=async(u,init)=>{u=String(u);urls.push(u);heads.push(init&&init.headers||{});
  const J=(o,s)=>new Response(JSON.stringify(o),{status:s||200});
  if(u.includes('api.discogs.com/database/search'))return J(fx('discogs-search'));
  let m=/api\.discogs\.com\/marketplace\/stats\/(\d+)/.exec(u); if(m)return J(fx('discogs-stats-'+m[1]));
  if(u.includes('oauth2/token'))return ebayFail?J({},500):J(fx('ebay-token'));
  if(u.includes('buy/browse'))return ebayFail?J({},500):J(ebaySearch);
  if(u.includes('api.reverb.com'))return J(reverbList);
  if(u.includes('pricecharting.com'))return J(fx('pricecharting-product'));
  return J({},404);};
const mod={exports:{}}; new Function('require','module','exports',js)(require,mod,mod.exports);
const call=async b=>{const r=await globalThis.__h(new Request('http://x',{method:'POST',body:JSON.stringify(b)}));return{s:r.status,b:await r.json()};};
(async()=>{
  // junk filter, trim, IQR, minimum (pure)
  const S=mod.exports.summarise;
  const items=t=>t.map((p,i)=>({title:'Gibson '+i,price:p}));
  ok(S(items([1,2,3,4]))===null,'fewer than 5 usable prices gives no summary');
  ok(S([...items([100,100,100,100]),{title:'Gibson for spares',price:100}])===null,'"for spares" is dropped as junk (4 left, so no summary)');
  ok(S([...items([100,100,100,100]),{title:'Gibson case only',price:100}])===null,'"case only" is dropped as junk');
  let s=S(items([100,110,120,130,140,150,160,1,9999]));
  ok(s&&s.n===7,'prices under 10% or over 5x of the median are dropped (7 kept): '+JSON.stringify(s));
  ok(s&&s.median===130,'trimmed median of 100..160 after trimming 15% each end is 130: '+(s&&s.median));
  ok(s&&s.q1<s.median&&s.q3>s.median,'interquartile range surrounds the median');

  // nothing configured: no source, no fetch
  let n0=urls.length, r=await call({q:'Gibson Les Paul Standard',cond:'good',cat:'general'});
  ok(r.s===200&&r.b.status==='unavailable'&&urls.length===n0,'no source on: status unavailable and no outside call');
  ok(/LH_Sold=1/.test(r.b.links.ebay)&&/ebay\.co\.uk/.test(r.b.links.ebay)&&/discogs\.com\/search/.test(r.b.links.discogs),'manual eBay sold and Discogs links come back even when unavailable');
  ENV={EBAY_CLIENT_ID:'id',EBAY_CLIENT_SECRET:'sec'}; n0=urls.length;
  r=await call({q:'Gibson Les Paul Flagoff',cond:'good',cat:'general'});
  ok(r.b.status==='unavailable'&&urls.length===n0,'eBay keys without the flag on: no call (flag off means off)');
  ENV={DISCOGS_TOKEN:'t',SECONDHAND_EBAY:'off'}; n0=urls.length;
  r=await call({q:'Gibson Les Paul Guitar',cond:'good',cat:'general'});
  ok(r.b.status==='unavailable'&&urls.length===n0,'Discogs does not answer for a guitar (category routing)');

  // eBay on, condition filter, haircut
  ENV={SECONDHAND_EBAY:'on',EBAY_CLIENT_ID:'id',EBAY_CLIENT_SECRET:'sec'};
  r=await call({q:'Gibson Les Paul Standard',cond:'good',cat:'general'}); const b=r.b;
  ok(b.status==='ok'&&b.n===20,'eBay: 20 usable asking prices after junk and outliers: n='+b.n);
  ok(b.value===1148&&b.low===1001&&b.high===1294,'eBay: median 1275 less 10% haircut = 1148, typically 1001 to 1294: '+[b.value,b.low,b.high]);
  ok(b.haircut===0.1&&b.basis==='current asking prices'&&b.sources[0].condition==='filtered','haircut stated; basis says current asking prices; condition filtered at source');
  const bu=urls.filter(u=>u.includes('buy/browse'))[0]||'';
  ok(/conditionIds:%7B5000%7D/.test(bu)&&/priceCurrency:GBP/.test(decodeURIComponent(bu).replace(/%7B/g,'{'))||/conditionIds/.test(bu),'eBay request filters by the user\'s condition and GBP: '+bu.slice(-120));
  ok(JSON.stringify(heads).includes('EBAY_GB'),'eBay request is for the UK marketplace');
  ok(!/Gibson Les Paul Standard \d|"title"/.test(JSON.stringify(b)),'reply holds derived numbers only, no raw listings');
  // cache
  n0=urls.length; r=await call({q:'  gibson  les paul standard ',cond:'good',cat:'general'});
  ok(r.b.cached===true&&r.b.value===1148&&urls.length===n0,'second search within 24 h is served from the cache with no outside call');
  // minimum evidence
  ebaySearch=fx('ebay-few'); r=await call({q:'Gibson Les Paul Few',cond:'good',cat:'general'});
  ok(r.b.status==='no_match','fewer than 5 listings: no match, no number');
  ebaySearch=fx('ebay-search');
  // failing source
  ebayFail=true; r=await call({q:'Gibson Les Paul Down',cond:'good',cat:'general'});
  ok(r.s===200&&r.b.status==='no_match','a failing source gives no match, not a crash');
  ebayFail=false;

  // Discogs: lowest asking per release, condition scaled by visible factor
  ENV={DISCOGS_TOKEN:'tok'}; urls.length=0;
  r=await call({q:'Fleetwood Mac Rumours',cond:'good',cat:'records'});
  ok(r.b.status==='ok'&&r.b.sources[0].id==='discogs'&&r.b.value===11&&r.b.sources[0].condition==='scaled'&&r.b.condFactor===0.9,'Discogs: 14 less 10% haircut x 0.90 (good) = 11, condition scaled: '+JSON.stringify([r.b.value,r.b.condFactor]));
  ok(urls.some(u=>/curr_abbr=GBP/.test(u))&&heads.some(h=>/Discogs token=tok/.test(h.Authorization||'')),'Discogs asked in GBP with the token');
  r=await call({q:'Fleetwood Mac Rumours',cond:'fair',cat:'records'});
  ok(r.b.value===9,'fair scales by 0.75: '+r.b.value);
  r=await call({q:'Fleetwood Mac Rumours',cond:'poor',cat:'records'}); ok(r.b.condFactor===0.55,'poor factor 0.55');
  r=await call({q:'Fleetwood Mac Rumours',cond:'banana',cat:'nonsense'}); ok(r.b.cond==='good'&&r.b.cat==='general','unknown condition and category fall back safely');

  // two sources: agree -> median of sources; disagree -> largest source
  ENV={SECONDHAND_EBAY:'on',EBAY_CLIENT_ID:'id',EBAY_CLIENT_SECRET:'sec',SECONDHAND_REVERB:'on'};
  r=await call({q:'Gibson Les Paul Pair',cond:'good',cat:'instruments'});
  ok(r.b.status==='ok'&&r.b.sources.length===2&&r.b.combine==='median of sources'&&r.b.value===1159,'two sources within 25% agree: median of source medians 1159: '+JSON.stringify([r.b.value,r.b.combine]));
  reverbList={listings:fx('reverb-listings').listings.map(l=>({...l,price:{...l.price,amount:String(l.price.amount*3)}}))};
  r=await call({q:'Gibson Les Paul Split',cond:'good',cat:'instruments'});
  ok(r.b.combine==='largest source'&&r.b.value===1148&&r.b.sources.length===2,'sources that disagree: the one with most listings is used and both are shown: '+JSON.stringify([r.b.value,r.b.combine]));
  reverbList=fx('reverb-listings');

  // PriceCharting guide: only with flag, token and an owner-set rate
  ENV={SECONDHAND_PRICECHARTING:'on',PRICECHARTING_TOKEN:'k'}; n0=urls.length;
  r=await call({q:'Super Mario 64',cond:'good',cat:'games'});
  ok(r.b.status==='unavailable'&&urls.length===n0,'PriceCharting without an owner-set USD_GBP rate: off, no guessed exchange rate');
  ENV.USD_GBP='0.8'; r=await call({q:'Super Mario 64 N64',cond:'good',cat:'games'});
  ok(r.b.status==='ok'&&r.b.value===24&&r.b.basis==='a price guide'&&r.b.guides.length===1,'PriceCharting: loose $30 x 0.8 = 24, shown as a price guide: '+JSON.stringify([r.b.value,r.b.basis]));

  // input checks
  r=await call({q:'x'}); ok(r.s===400,'a one-letter name is refused');
  r=await call({q:'a'.repeat(300)}); ok(r.s===200&&r.b.q.length===80,'names are cut to 80 characters');
  const o=await globalThis.__h(new Request('http://x',{method:'OPTIONS'})); ok(o.status===200,'CORS preflight answers');
  const g=await globalThis.__h(new Request('http://x',{method:'GET'})); ok(g.status===405,'GET refused');
  // hosts: only the four named sources
  const hosts=[...new Set(urls.map(u=>new URL(u).host))];
  ok(hosts.every(h=>['api.discogs.com','api.ebay.com','api.reverb.com','www.pricecharting.com'].includes(h)),'only the named sources are contacted: '+hosts);
  ok(!/sold items?\b|"sold"/.test(JSON.stringify(b).replace(/LH_Sold/g,'')),'the reply never calls the prices sold');
  console.log(fails?'FAILURES '+fails:'ALL PASSED');
})();
