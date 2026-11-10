// Tests run without internet access to the CDN: serve the exact three.js r128 files the app loads from a local copy.
const fs=require('fs'),path=require('path');
const V=path.join(__dirname,'vendor');
const MAP={'three.min.js':'three.min.js','OrbitControls.js':'OrbitControls.js','GLTFLoader.js':'GLTFLoader.js','STLLoader.js':'STLLoader.js','OBJLoader.js':'OBJLoader.js','FBXLoader.js':'FBXLoader.js','3MFLoader.js':'3MFLoader.js','fflate.min.js':'fflate.min.js'};
module.exports=async function routeThree(ctxOrPage){
  await ctxOrPage.route(/cdn\.jsdelivr\.net\/npm\/three@0\.128\.0\/.*/,route=>{
    const f=Object.keys(MAP).find(k=>route.request().url().endsWith(k));
    if(!f)return route.abort();
    route.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync(path.join(V,MAP[f]))});
  });
};
