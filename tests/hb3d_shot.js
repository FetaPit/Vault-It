// usage: node tests/hb3d_shot.js <type> <p> <mode> <out.png> [jsonOpts]
const { chromium } = require('playwright');
(async()=>{
  const [type,p,mode,out,o]=process.argv.slice(2); const opts=o?JSON.parse(o):{};
  const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:opts.w||1280,height:opts.h||800}});
  const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  await pg.goto('file:///home/user/Vault-It/tests/hb3d_harness.html'); await pg.waitForTimeout(300);
  const r=await pg.evaluate(([t,p,m,o])=>show(t,+p,m,o),[type,p,mode,opts]);
  await pg.waitForTimeout(200); await pg.screenshot({path:out});
  console.log(JSON.stringify(r)); if(errs.length)console.log('ERRORS',errs.slice(0,5).join(' | '));
  await b.close();
})();
