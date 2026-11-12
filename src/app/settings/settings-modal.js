function _refreshPioneerSettingsUI(){
  var active=document.getElementById('set-pioneer-active');
  var inactive=document.getElementById('set-pioneer-inactive');
  var badge=document.getElementById('set-pioneer-badge');
  var st=viTrialState(),pioneer=st==='paid',left=viTrialDaysLeft(),day=viTrialDay();
  if(active)active.style.display=pioneer?'block':'none';
  if(inactive){inactive.style.display=pioneer?'none':'block';
    inactive.textContent=st==='ended'?'Your 30 days are up, so the vault is read-only: every number is safe and still here. Pick a plan to carry on editing: Pioneer at '+viPlanLabel('monthly')+'; Pioneer at '+viPlanLabel('annual')+'; or a Lifetime licence at '+viPlanLabel('founder')+'.'
      :'Day '+day+' of your 30 free days ('+left+(left===1?' day':' days')+' left). Everything is open. After day 30 the vault turns read-only until you pick a plan: Pioneer at '+viPlanLabel('monthly')+'; Pioneer at '+viPlanLabel('annual')+'; or a Lifetime licence at '+viPlanLabel('founder')+'.';}
  try{viPricePaint();}catch(e){}
  if(badge)badge.innerHTML=pioneer
    ?'<span style="color:var(--go);background:rgb(var(--brass-rgb) / .12);padding:2px 7px;border-radius:10px;border:1px solid rgb(var(--brass-rgb) / .3)">◆ ACTIVE</span>'
    :st==='ended'?'<span style="color:var(--amber);background:rgb(var(--amber-rgb) / .12);padding:2px 7px;border-radius:10px;border:1px solid rgb(var(--amber-rgb) / .35)">READ-ONLY</span>'
    :'<span style="color:var(--t3);background:var(--c3);padding:2px 7px;border-radius:10px;border:1px solid var(--bd)">TRIAL · '+left+' DAYS LEFT</span>';
}

function showSettings(){
  try{renderConnections()}catch(e){}
  (function(){var r=document.getElementById('set-view');if(!r)return;var v=viSimple()?'simple':'adv';[].forEach.call(r.children,function(b){b.classList.toggle('active',b.getAttribute('data-val')===v);});})();
  try{viThemePaint();viLivePaint();}catch(e){}
  var em=document.getElementById('set-acct-email');
  if(em){var u={};try{u=JSON.parse(localStorage.getItem('vi_user')||'{}')||{};}catch(e){}em.textContent=u.email||'This device only (not signed in)';}
  // owner and developer tools: only when the owner flag is set on this device (?owner=1 once; ?owner=0 clears it)
  var own=viOwner(),ot=document.getElementById('set-owner-tools');if(ot)ot.hidden=!own;
  if(own){[['set-claude-key','claude_api_key'],['set-meshy-key','meshy_api_key'],['set-notion-token','notion_token'],['set-founding-link','vi_founding_link'],['set-nft-contract','vi_nft_contract']].forEach(function(x){var el=document.getElementById(x[0]);if(el)el.value=localStorage.getItem(x[1])||'';});}
  _refreshPioneerSettingsUI();
  try{viCheckinPaint();}catch(e){}
  document.getElementById('settings-modal').style.display='flex';
}
// Settings: the weekly check-in day and phone (moved from the welcome, owner 10 Nov 2026). Writes the same fields the welcome wrote.
function _viUserRead(){try{return JSON.parse(localStorage.getItem('vi_user')||'null');}catch(e){return null;}}
function _viUserWrite(u){try{localStorage.setItem('vi_user',JSON.stringify(u));}catch(e){}if(typeof _vaultItUser!=='undefined')_vaultItUser=u;}
function viCheckinPaint(){
  var u=_viUserRead()||{},box=document.getElementById('set-checkin-days'),ph=document.getElementById('set-phone');
  var d=(u.checkin&&typeof u.checkin.day==='number')?u.checkin.day:new Date().getDay();
  if(box){var lab=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],full=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],h='';
    [1,2,3,4,5,6,0].forEach(function(x){h+='<button type="button" data-d="'+x+'" aria-label="'+full[x]+'" aria-pressed="'+(x===d)+'" onclick="viSetCheckinDay('+x+')">'+lab[x]+'</button>';});box.innerHTML=h;}
  if(ph&&document.activeElement!==ph)ph.value=u.phone||'';
}
function viSetCheckinDay(d){
  var u=_viUserRead();if(!u){showToast('Finish the welcome first, then pick your check-in day');return;}
  var c=u.checkin||{};
  if(!c.step){var g=parseInt(u.goal,10);c.step=((typeof VI_PLAN_STEP!=='undefined'&&VI_PLAN_STEP[isNaN(g)?0:g])||{tab:'overview'}).tab;}
  if(!c.set)c.set=new Date().toISOString();
  c.day=d;u.checkin=c;_viUserWrite(u);viCheckinPaint();
}
function viSetPhone(v){var u=_viUserRead();if(!u)return;u.phone=String(v||'').trim();_viUserWrite(u);}
function viOwner(){try{var q=new URLSearchParams(location.search).get('owner');if(q==='1')localStorage.setItem('vi-owner','1');else if(q==='0')localStorage.removeItem('vi-owner');return localStorage.getItem('vi-owner')==='1';}catch(e){return false;}}
function saveSettings(){   // owner and developer tools only; the user-facing settings save as you tap them
  [['set-claude-key','claude_api_key'],['set-meshy-key','meshy_api_key'],['set-notion-token','notion_token']].forEach(function(x){var el=document.getElementById(x[0]),v=el&&el.value?el.value.trim():'';if(v)localStorage.setItem(x[1],v);});
  var fl=(document.getElementById('set-founding-link')||{}).value||'';
  var nc=(document.getElementById('set-nft-contract')||{}).value||'';
  if(fl){localStorage.setItem('vi_founding_link',fl.trim());VI_FOUNDING_LINK=fl.trim();}
  if(nc){localStorage.setItem('vi_nft_contract',nc.trim());VAULT_NFT_CONTRACT=nc.trim();}
  closeSettings();
  showToast('Owner settings saved \u2713');
}
async function testApiKey(type){
  var resultEl=document.getElementById('test-'+type+'-result');
  if(resultEl)resultEl.innerHTML='<span style="color:var(--em)">Testing...</span>';
  try{
    if(type==='claude'){
      var key=(document.getElementById('set-claude-key')||{}).value||localStorage.getItem('claude_api_key')||'';
      if(!key){if(resultEl)resultEl.innerHTML='<span style="color:var(--re)">No key entered</span>';return;}
      var r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'x-api-key':key,'anthropic-version':'2023-06-01','content-type':'application/json','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:10,messages:[{role:'user',content:'Hi'}]})});
      var d=await r.json();
      if(d.content){if(resultEl)resultEl.innerHTML='<span style="color:var(--gr)"><svg class="vi-ic g" aria-hidden="true"><use href="#vi-check"/></svg> Claude API key valid</span>';}
      else{if(resultEl)resultEl.innerHTML='<span style="color:var(--re)">✗ '+( d.error&&d.error.message||'Invalid key')+'</span>';}
    }
  }catch(e){if(resultEl)resultEl.innerHTML='<span style="color:var(--re)">✗ Error: '+e.message+'</span>';}
}

