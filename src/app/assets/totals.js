// ═══════════════════════════════════════════════════════════════
// ASSETS & LIABILITIES JS
// ═══════════════════════════════════════════════════════════════
// alState declared above init block
function saveAL(){try{localStorage.setItem(AL_KEY,JSON.stringify(alState));}catch(e){}if(typeof checkAchievements==='function')checkAchievements();}
function alTotalMetals(){var m=alState.metals||{},p=alState.metalPrices||{};return ['gold','silver','platinum','palladium'].reduce(function(s,k){return s+(+m[k]||0)*(+p[k]||0);},0);}
function alTotalCrypto(){return alState.crypto.reduce(function(s,c){var a=(c.amount!=null?c.amount:(c.qty!=null?c.qty:0))||0;var p=c.price||0;return s+a*p;},0);}
// cash = bank and savings accounts + the physical cash log (notes and coins at home, in a wallet, in a safe)
function alTotalPhysical(){return (alState.physicalCash||[]).reduce(function(s,e){return s+(+e.amount||0);},0);}
function alTotalCash(){return alState.cashAccounts.reduce(function(s,a){return s+a.balance;},0)+Math.max(0,alTotalPhysical());}
// Business accounts (Entrepreneur 1, owner 8 Nov 2026: "add Business Current and saving line able to be added"). A cash account may carry
// kind 'biz-current' or 'biz-savings'; no kind means personal, so old saves load unchanged. They are cash like any other, so alTotalCash
// and net worth count them as they are; the Dashboard, sidebar and 3D net worth show them as their own Business line. Budget never reads them.
function alBizKinds(){return {'biz-current':'Business current','biz-savings':'Business savings'};}   // a function, so start-up code that runs before this line can use it
function alIsBizAcc(a){return !!(a&&alBizKinds().hasOwnProperty(a.kind));}
function alTotalBizCash(kind){return (alState.cashAccounts||[]).reduce(function(s,a){return alIsBizAcc(a)&&(!kind||a.kind===kind)?s+(+a.balance||0):s;},0);}
function alTotalOther(){return (alState.otherAssets||[]).reduce(function(s,a){return s+wiValue(a);},0);}
