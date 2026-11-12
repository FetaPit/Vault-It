// ── INIT ──
// Load AL state
try{var _als=localStorage.getItem(AL_KEY);if(_als){var _alp=JSON.parse(_als);alState=Object.assign(alState,_alp);alNormalise();if(_alp.metals)alState.metals=Object.assign(alState.metals,_alp.metals);if(_alp.metalPrices)alState.metalPrices=Object.assign(alState.metalPrices,_alp.metalPrices);if(_alp.crypto)alState.crypto=_alp.crypto;if(_alp.cashAccounts)alState.cashAccounts=_alp.cashAccounts;if(_alp.otherAssets)alState.otherAssets=_alp.otherAssets;if(_alp.liabilities)alState.liabilities=_alp.liabilities;}}catch(e){}
// Load Debt state (only override if saved data exists)
try{var _ds=localStorage.getItem(DEBT_KEY);if(_ds)debtState=JSON.parse(_ds);}catch(e){}
// Load Biz state
try{var _bs=localStorage.getItem(BIZ_KEY);if(_bs)bizState=JSON.parse(_bs);}catch(e){}
if(!bizState.leads)bizState.leads=[];
// Load Ach state
try{var _as=localStorage.getItem(ACH_KEY);if(_as){var _ap=JSON.parse(_as);achState=Object.assign(achState,_ap);}}catch(e){}
window._viAchReady=true;   // the house milestones pay XP (v0.9.1 E9) only once the saved XP is loaded, so a stale copy is never written over it
// Filter unlocked to valid badge IDs
var validIds=BADGES.map(function(b){return b.id;});
if(achState.unlocked)achState.unlocked=achState.unlocked.filter(function(id){return validIds.indexOf(id)!==-1;});
// ── DATA MIGRATIONS ──
// Migrate liability objects to add depreciation fields
alState.liabilities=(alState.liabilities||[]).map(function(l){
  return Object.assign({depRate:0,runningCost:0,addedDate:new Date().toISOString()},l);
});
// Migrate other assets to add image fields
// Saved metals can lack a metal (older builds, a partial sync): fill the gaps, or every total above them turns into nothing.
function alNormalise(){alState.metals=Object.assign({gold:0,silver:0,platinum:0,palladium:0},alState.metals||{});alState.metalPrices=Object.assign({gold:1950,silver:23.5,platinum:1020,palladium:1100},alState.metalPrices||{});}
alNormalise();
alState.otherAssets=(alState.otherAssets||[]).map(function(a){
  return Object.assign({image:null,svgIcon:null,imageSearch:null},a);
});
// Migrate debt objects to add type field
debtState.debts=debtState.debts.map(function(d){
  return Object.assign({type:(d.name||'').toLowerCase().indexOf('card')!==-1?'credit':((d.name||'').toLowerCase().indexOf('bnpl')!==-1||(d.name||'').toLowerCase().indexOf('flex')!==-1||(d.name||'').toLowerCase().indexOf('zilch')!==-1)?'bnpl':'other'},d);
});
// Init income streams
if(!bizState.incomeStreams)bizState.incomeStreams=[];
bizState.incomeStreams=bizState.incomeStreams.map(function(s){return Object.assign({id:Date.now(),name:'',type:'passive',monthlyIncome:0,status:'idea',steps:[],progress:0},s);});
loadState();
jrnyLoadState();
// Migrate expenses to add category
(ovState.expenses||[]).forEach(function(e){if(!e.category)e.category='necessity';});
renderLists();
renderCashflow();
renderConnections();
renderDebtTab();
renderBizTab();
renderAchievements();
updateKPIs();
setTimeout(drawChart, 80);

document.querySelectorAll('.hbtn').forEach(b=>b.classList.toggle('active',b.dataset.type===state.houseType));
state.target=state.prices[state.houseType]||200000;
updatePriceLabels();updatePriceInput();updateMilestoneLabels();prevP=pct();updateUI();

