// ═══════════════════════════════════════════════════════════════
// ENTREPRENEUR JS
// ═══════════════════════════════════════════════════════════════
// bizState declared above init block
function saveBiz(){try{localStorage.setItem(BIZ_KEY,JSON.stringify(bizState));}catch(e){}if(typeof checkAchievements==='function')checkAchievements();}
function bizMRR(){return bizState.clients.filter(function(c){return c.status==='Active';}).reduce(function(s,c){return s+c.monthly;},0)+bizState.streams.reduce(function(s,r){return s+r.monthly;},0);}
function showClientForm(){document.getElementById('client-form-card').style.display='block';}
function saveClient(){if(viBlockEdit())return;
  var n=document.getElementById('cl-name').value.trim();
  var mo=parseFloat(document.getElementById('cl-mo').value)||0;
  var st=document.getElementById('cl-status').value;
  var nt=document.getElementById('cl-notes').value.trim();
  var em=(document.getElementById('cl-email')||{}).value||'';
  var ph=(document.getElementById('cl-phone')||{}).value||'';
  var ws=(document.getElementById('cl-website')||{}).value||'';
  if(!n)return;
  bizState.clients.push({id:Date.now(),name:n,monthly:mo,status:st,notes:nt,email:em,phone:ph,website:ws});
  document.getElementById('cl-name').value='';document.getElementById('cl-mo').value='';document.getElementById('cl-notes').value='';
  if(document.getElementById('cl-email'))document.getElementById('cl-email').value='';
  if(document.getElementById('cl-phone'))document.getElementById('cl-phone').value='';
  if(document.getElementById('cl-website'))document.getElementById('cl-website').value='';
  document.getElementById('client-form-card').style.display='none';
  saveBiz();renderBizTab();updateKPIs();checkAchievements();
}
function deleteClient(id){if(viBlockEdit())return;bizState.clients=bizState.clients.filter(function(c){return c.id!==id;});saveBiz();renderBizTab();updateKPIs();}

// ── LEADS ─────────────────────────────────────────────────────
function showLeadForm(){document.getElementById('lead-form-card').style.display='block';}
function saveLead(){if(viBlockEdit())return;
  var n=(document.getElementById('ld-name')||{}).value||'';
  if(!n.trim()){showToast('Enter a contact name');return;}
  if(!bizState.leads)bizState.leads=[];
  bizState.leads.push({
    id:Date.now(),name:n.trim(),
    email:(document.getElementById('ld-email')||{}).value||'',
    phone:(document.getElementById('ld-phone')||{}).value||'',
    website:(document.getElementById('ld-website')||{}).value||'',
    stage:(document.getElementById('ld-stage')||{}).value||'cold',
    value:parseFloat((document.getElementById('ld-value')||{}).value)||0,
    notes:(document.getElementById('ld-notes')||{}).value||''
  });
  ['ld-name','ld-email','ld-phone','ld-website','ld-value','ld-notes'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('lead-form-card').style.display='none';
  saveBiz();renderBizTab();showToast('Lead added!');
}
function deleteLead(id){if(viBlockEdit())return;if(!bizState.leads)return;bizState.leads=bizState.leads.filter(function(l){return l.id!==id;});saveBiz();renderBizTab();}
function convertLead(id){
  if(!bizState.leads)return;
  var lead=bizState.leads.find(function(l){return l.id===id;});
  if(!lead)return;
  bizState.clients.push({id:Date.now(),name:lead.name,monthly:lead.value,status:'Active',notes:lead.notes,email:lead.email,phone:lead.phone,website:lead.website});
  bizState.leads=bizState.leads.filter(function(l){return l.id!==id;});
  saveBiz();renderBizTab();updateKPIs();showToast(lead.name+' converted to active client!');
}
function addStream(){if(viBlockEdit())return;
  var n=document.getElementById('str-name').value.trim();
  var mo=parseFloat(document.getElementById('str-amt').value)||0;
  if(!n)return;
  bizState.streams.push({id:Date.now(),name:n,monthly:mo});
  document.getElementById('str-name').value='';document.getElementById('str-amt').value='';
  saveBiz();renderBizTab();updateKPIs();
}
function deleteStream(id){if(viBlockEdit())return;bizState.streams=bizState.streams.filter(function(r){return r.id!==id;});saveBiz();renderBizTab();updateKPIs();}
function renderBizTab(){
  var mrr=bizMRR();
  var ttEl=document.getElementById('tab-total-biz');if(ttEl)ttEl.textContent=gbpFmt(mrr)+'/mo';
  var el=document.getElementById('biz-mrr');if(el)el.textContent=gbpFmt(mrr)+'/mo';
  var ec=document.getElementById('biz-clients-kpi');if(ec)ec.textContent=bizState.clients.filter(function(c){return c.status==='Active';}).length;
  var ep=document.getElementById('biz-pipeline');if(ep)ep.textContent=gbpFmt(bizState.clients.filter(function(c){return c.status==='Prospect';}).reduce(function(s,c){return s+c.monthly;},0))+'/mo';
  // Render leads
  var lds=document.getElementById('leads-list-el');
  if(lds){
    var leads=bizState.leads||[];
    var stageColors={cold:'var(--t3)',warm:'var(--gold)',hot:'var(--re)'};
    var stageIcons={cold:'❄️',warm:'🌤️',hot:'🔥'};
    lds.innerHTML=leads.length?leads.map(function(l){
      return'<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--bd);border-radius:6px;margin-bottom:6px;background:var(--c2)">'
        +'<span style="font-size:.9rem">'+(stageIcons[l.stage]||'❄️')+'</span>'
        +'<div style="flex:1;min-width:0">'
        +'<div style="font-size:max(.68rem,var(--vi-fs-2));font-weight:700;color:var(--tx)">'+l.name+'</div>'
        +'<div style="font-size:max(.52rem,var(--vi-fs-1));color:var(--t3)">'
        +(l.email?l.email+' · ':'')+(l.phone?l.phone+' · ':'')
        +(l.website?'<a href="'+l.website+'" target="_blank" style="color:var(--em);text-decoration:none">'+l.website+'</a>':'')
        +'</div>'
        +(l.notes?'<div style="font-size:max(.48rem,var(--vi-fs-1));color:var(--t3);margin-top:2px">'+l.notes+'</div>':'')
        +'</div>'
        +'<span style="font-size:max(.58rem,var(--vi-fs-2));color:'+stageColors[l.stage]+';font-weight:700;text-transform:uppercase;letter-spacing:.08em">'+l.stage+'</span>'
        +'<span style="font-family:\'Share Tech Mono\',monospace;font-size:max(.62rem,var(--vi-fs-2));color:var(--gold)">'+gbpFmt(l.value)+'/mo</span>'
        +'<button class="dep-btn" onclick="convertLead('+l.id+')" title="Convert to client" style="font-size:max(.55rem,var(--vi-fs-1));padding:3px 8px;color:var(--gr);border-color:var(--gr)"><svg class="vi-ic g" aria-hidden="true"><use href="#vi-check"/></svg> Convert</button>'
        +'<button class="data-item-del" onclick="deleteLead('+l.id+')"><svg class="vi-ic g" role="img" aria-label="Close"><use href="#vi-close"/></svg></button>'
        +'</div>';
    }).join(''):'<div style="font-size:max(.6rem,var(--vi-fs-2));color:var(--t3);text-align:center;padding:16px">No leads yet. Start building your pipeline!</div>';
  }

  // Render clients with full profiling
  var cl=document.getElementById('client-list-el');
  if(cl)cl.innerHTML=bizState.clients.map(function(c){
    return'<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--bd);border-radius:6px;margin-bottom:6px;background:var(--c2)">'
      +'<div class="client-dot dot-'+c.status+'"></div>'
      +'<div style="flex:1;min-width:0">'
      +'<div style="font-size:max(.68rem,var(--vi-fs-2));font-weight:700;color:var(--tx)">'+c.name+'</div>'
      +'<div style="font-size:max(.52rem,var(--vi-fs-1));color:var(--t3)">'
      +(c.email?c.email+' · ':'')+(c.phone?c.phone+' · ':'')
      +(c.website?'<a href="'+c.website+'" target="_blank" style="color:var(--em);text-decoration:none">'+c.website+'</a>':'')
      +'</div>'
      +(c.notes?'<div style="font-size:max(.48rem,var(--vi-fs-1));color:var(--t3);margin-top:2px">'+c.notes+'</div>':'')
      +'</div>'
      +'<span style="font-size:max(.58rem,var(--vi-fs-2));color:var(--t3)">'+c.status+'</span>'
      +'<span class="client-mrr">'+gbpFmt(c.monthly)+'/mo</span>'
      +'<button class="data-item-del" onclick="deleteClient('+c.id+')"><svg class="vi-ic g" role="img" aria-label="Close"><use href="#vi-close"/></svg></button>'
      +'</div>';
  }).join('')||'<div style="font-size:max(.6rem,var(--vi-fs-2));color:var(--t3);text-align:center;padding:16px">No clients yet. Add your first.</div>';
  var sl=document.getElementById('stream-list-el');
  if(sl)sl.innerHTML=bizState.streams.map(function(r){return'<div class="data-item"><span>'+r.name+'</span><span class="data-item-val" style="color:var(--gold)">'+gbpFmt(r.monthly)+'/mo</span><button class="data-item-del" onclick="deleteStream('+r.id+')"><svg class="vi-ic g" role="img" aria-label="Close"><use href="#vi-close"/></svg></button></div>';}).join('')||'';
  try{renderBizAccounts();}catch(e){console.error('[Vault-It] business accounts',e);}   // start-up can call this before the bank list is ready; Assets redraws it
  renderIncomeStreams();
  renderBizGoal();
}

function saveBizGoal() {if(viBlockEdit())return;
  var g = parseFloat((document.getElementById('biz-goal-inp')||{}).value) || 0;
  if (!g) { showToast('Enter a target monthly revenue'); return; }
  bizState.revenueGoal = g;
  saveBiz(); renderBizGoal(); showToast('Revenue goal set: ' + gbpFmt(g) + '/mo');
}
function renderBizGoal() {
  var goal = bizState.revenueGoal || 0;
  var mrr = bizMRR();
  var kpi = document.getElementById('biz-goal-kpi');
  var sub = document.getElementById('biz-goal-sub');
  var card = document.getElementById('biz-goal-card');
  if (!goal) {
    if (kpi) kpi.textContent = 'Not set';
    if (sub) sub.textContent = 'click to set target';
    if (card) { card.style.display = 'block'; }
    return;
  }
  var pct = Math.min(100, Math.round(mrr / goal * 100));
  if (kpi) kpi.textContent = gbpFmt(goal) + '/mo';
  if (sub) sub.textContent = pct + '% achieved';
  if (card) card.style.display = 'block';
  var bar = document.getElementById('biz-goal-bar'); if (bar) bar.style.width = pct + '%';
  var inp = document.getElementById('biz-goal-inp'); if (inp && goal) inp.value = goal;
  var desc = document.getElementById('biz-goal-desc');
  if (desc) {
    var gap = Math.max(0, goal - mrr);
    desc.textContent = pct >= 100 ? '🎯 Goal achieved! ' + gbpFmt(mrr) + '/mo MRR. Time to raise the bar.' : gbpFmt(mrr) + '/mo of ' + gbpFmt(goal) + '/mo target · ' + gbpFmt(gap) + '/mo to go (' + (100 - pct) + '% remaining)';
  }
}

