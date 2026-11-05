const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const v=process.argv[2];const dir='frames-'+v;fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir);
 const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const p=await b.newPage({viewport:{width:540,height:960},deviceScaleFactor:2});
 p.on('pageerror',e=>console.log('ERR',e.message));
 await p.goto('file://'+process.cwd()+'/video-source.html?v='+v);await p.waitForFunction(()=>document.title==='ready',null,{polling:100});
 const dur=await p.evaluate(()=>window.__dur);const fps=30,n=Math.round(dur*fps);
 for(let i=0;i<n;i++){await p.evaluate(([i,fps])=>{window.__tick(i/fps);window.__step(1000/fps)},[i,fps]);
  await p.screenshot({path:`${dir}/${String(i).padStart(4,'0')}.jpg`,type:'jpeg',quality:92});}
 await b.close();console.log('frames',n);})();
