const fs=require('fs'); const esbuild=require('esbuild');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL:',m);} else console.log('ok  :',m); };
const js=esbuild.transformSync(fs.readFileSync('/home/user/Vault-It/supabase/functions/stock-quotes/index.ts','utf8'),{loader:'ts',format:'cjs'}).code;
globalThis.Deno={serve:h=>{globalThis.__h=h;}};
const urls=[];
globalThis.fetch=async(u)=>{urls.push(String(u));
  if(String(u).includes('/v1/finance/search'))return new Response(JSON.stringify({quotes:[{symbol:'BCHN.L',quoteType:'ETF',longname:'iShares Blockchain Technology UCITS ETF',exchDisp:'London'},{symbol:'IE00BYZK4552',quoteType:'MUTUALFUND',shortname:'iShares Automation & Robotics',exchDisp:'London'},{symbol:'X',quoteType:'OPTION'},{symbol:'COIN',quoteType:'EQUITY',shortname:'Coinbase',exchDisp:'NASDAQ'}]}));
  const m=/chart\/([^?]+)\?interval=(\w+)&range=(\w+)/.exec(String(u)); const sym=decodeURIComponent(m[1]);
  if(sym==='NOPE'||sym==='NOPE.L')return new Response('{}',{status:404});
  if(sym==='VUSA'&&!urls.some(x=>x.includes('VUSA.L')))return new Response('{}',{status:404});   // bare ticker not found → .L retry
  const n=1000,ts=[],cl=[];for(let i=0;i<n;i++){ts.push(1700000000+i*86400);cl.push(i%50===0?null:100+i*0.1);}
  return new Response(JSON.stringify({chart:{result:[{meta:{currency:sym.endsWith('.L')?'GBp':'USD',symbol:sym},timestamp:ts,indicators:{quote:[{close:cl}]}}]}}));};
new Function('require','module','exports',js)(require,{exports:{}},{});
const call=async b=>{const r=await globalThis.__h(new Request('http://x',{method:'POST',body:JSON.stringify(b)}));return{s:r.status,b:await r.json()};};
(async()=>{
  let r=await call({history:{symbols:['AAPL','VUSA','NOPE','bad sym!'],range:'1y'}});
  ok(r.s===200&&r.b.series.AAPL&&r.b.series.VUSA&&!r.b.series.NOPE&&Object.keys(r.b.series).length===2,'history for found symbols only (bad/unknown skipped): '+Object.keys(r.b.series));
  ok(r.b.series.AAPL.t.length<=330&&r.b.series.AAPL.t.length===r.b.series.AAPL.c.length,'payload downsampled to ≤330 points ('+r.b.series.AAPL.t.length+')');
  ok(r.b.series.VUSA.currency==='GBp','bare tickers retried with .L');
  ok(urls.some(u=>/range=1y/.test(u)&&/interval=1d/.test(u)),'1y uses daily bars');
  r=await call({history:{symbols:['AAPL'],range:'max'}}); ok(/interval=1mo/.test(urls[urls.length-1]),'max uses monthly bars');
  r=await call({history:{symbols:['AAPL'],range:'evil'}}); ok(/range=6mo/.test(urls[urls.length-1]),'unknown range falls back to 6mo');
  r=await call({search:'blockchain'}); ok(r.s===200&&r.b.results.length===3&&r.b.results[0].name.includes('iShares Blockchain')&&!r.b.results.some(x=>x.symbol==='X'),'search returns funds, ETFs and shares only: '+r.b.results.map(x=>x.symbol));
  r=await call({search:'a'}); ok(r.b.results.length===0,'1-character searches are ignored');
  r=await call({symbols:['AAPL']}); ok(r.s===200&&r.b.quotes!==undefined,'normal quotes still work');
  console.log(fails?'FAILURES '+fails:'ALL PASSED');
})();
