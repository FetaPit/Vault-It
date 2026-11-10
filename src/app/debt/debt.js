// ═══════════════════════════════════════════════════════════════
// DEBT TRACKER JS
// ═══════════════════════════════════════════════════════════════
// debtState declared above init block
function saveDebtState(){try{localStorage.setItem(DEBT_KEY,JSON.stringify(debtState));}catch(e){}}
function debtTotal(){return debtState.debts.reduce(function(s,d){return s+d.balance;},0);}
// Add a debt: a pop-up over the page (it used to open at the foot of the Debt tab, out of sight)
var _debtFormReturn=null;
function showDebtForm(){
  var m=document.getElementById('debt-form-modal'),c=document.getElementById('debt-form-card');if(!m||!c)return;
  if(m.parentNode!==document.body)document.body.appendChild(m);   // out of the tab, so it always sits on top
  _debtFormReturn=document.activeElement;
  m.hidden=false;c.style.display='block';document.body.classList.add('vi-pop-open');
  var msg=document.getElementById('debt-form-msg');if(msg)msg.textContent='';
  setTimeout(function(){var f=document.getElementById('df-name');if(f)f.focus();},30);
}
function hideDebtForm(){
  var m=document.getElementById('debt-form-modal'),c=document.getElementById('debt-form-card');
  if(c)c.style.display='none';if(m)m.hidden=true;document.body.classList.remove('vi-pop-open');
  var back=_debtFormReturn;_debtFormReturn=null;if(back&&back.focus)setTimeout(function(){try{back.focus();}catch(e){}},0);
}
function saveDebt(){if(viBlockEdit())return;
  var n=document.getElementById('df-name').value.trim();
  var b=(parseFloat(document.getElementById('df-balance').value)||0)/(window.VI_CURRENCY_RATE||1);
  var r=parseFloat(document.getElementById('df-rate').value)||0;
  var m=(parseFloat(document.getElementById('df-min').value)||0)/(window.VI_CURRENCY_RATE||1);
  if(!n){var mm=document.getElementById('debt-form-msg');if(mm)mm.textContent='Give the debt a name, for example "Barclaycard".';var fn=document.getElementById('df-name');if(fn)fn.focus();return;}
  var dtype=(document.getElementById('di-type')||{}).value||'other';
  var prov=viClean((document.getElementById('df-provider')||{}).value||'').trim().slice(0,40);
  var nd={id:Date.now(),name:n,original:b,balance:b,rate:r,min:m,type:dtype};if(prov)nd.card={issuer:prov,network:'auto',last4:'',art:'',logo:''};   // provider only when typed: older saves keep their shape
  debtState.debts.push(nd);
  var dpv=document.getElementById('df-provider');if(dpv)dpv.value='';
  document.getElementById('df-name').value='';document.getElementById('df-balance').value='';document.getElementById('df-rate').value='';document.getElementById('df-min').value='';
  var dit=document.getElementById('di-type');if(dit)dit.value='credit';
  hideDebtForm();
  saveDebtState();renderDebtTab();updateKPIs();checkAchievements();
}
// Placeholder total created by the old onboarding questionnaire — let users replace it with real, separate debts.
function removeOnboardingDebt(){if(viBlockEdit())return;
  debtState.debts=debtState.debts.filter(function(d){return !d._onboarding;});
  saveDebtState();renderDebtTab();updateKPIs();
  showToast('Placeholder removed. Add each debt below');
  showDebtForm();
}
function deleteDebt(id){if(viBlockEdit())return;debtState.debts=debtState.debts.filter(function(d){return d.id!==id;});saveDebtState();renderDebtTab();updateKPIs();}
var CC_LOGOS={
  'amex':'https://logo.clearbit.com/americanexpress.com',
  'american express':'https://logo.clearbit.com/americanexpress.com',
  'visa':'https://logo.clearbit.com/visa.com',
  'mastercard':'https://logo.clearbit.com/mastercard.com',
  'barclaycard':'https://logo.clearbit.com/barclaycard.co.uk',
  'monzo':'https://logo.clearbit.com/monzo.com',
  'starling':'https://logo.clearbit.com/starlingbank.com',
  'hsbc':'https://logo.clearbit.com/hsbc.co.uk',
  'lloyds':'https://logo.clearbit.com/lloyds.com',
  'halifax':'https://logo.clearbit.com/halifax.co.uk',
  'natwest':'https://logo.clearbit.com/natwest.com',
  'santander':'https://logo.clearbit.com/santander.co.uk',
  'capital one':'https://logo.clearbit.com/capitalone.com',
  'aqua':'https://logo.clearbit.com/aquacard.co.uk',
  'vanquis':'https://logo.clearbit.com/vanquis.com',
  'tesco':'https://logo.clearbit.com/tesco.com',
  'john lewis':'https://logo.clearbit.com/johnlewis.com',
  'virgin':'https://logo.clearbit.com/virginmoney.com',
  'klarna':'https://logo.clearbit.com/klarna.com',
  'clearpay':'https://logo.clearbit.com/clearpay.com',
  'paypal':'https://logo.clearbit.com/paypal.com',
  'creation':'https://logo.clearbit.com/creation.co.uk',
  'nationwide':'https://logo.clearbit.com/nationwide.co.uk',
  'marksandspencer':'https://logo.clearbit.com/marksandspencer.com'
};
function getCreditCardLogo(name){
  var n=(name||'').toLowerCase();
  for(var k in CC_LOGOS){if(n.indexOf(k)!==-1)return CC_LOGOS[k];}
  return null;
}
