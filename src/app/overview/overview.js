// ═══════════════════════════════════════════════════════════════
// OVERVIEW STATE & STORAGE
// ═══════════════════════════════════════════════════════════════
var OV_KEY = 'pos_ov1';

var ovState = {
  assets:    [],   // [{name, val}]
  debts:     [],   // [{name, val}]
  snapshots: [],   // [{month, nw, debt, liab}]  e.g. month='2026-03'
  milestones: [1000, 0, 5000, 20000, 50000]
};

function loadState() {
  try {
    var s = localStorage.getItem(OV_KEY);
    if (s) {
      var p = JSON.parse(s);
      ovState = Object.assign(ovState, p);
    }
  } catch(e) {}
  // Cashflow defaults
  var CF_DEFAULTS={
    income:[],
    expenses:[]
  };
  if(!ovState.income)  ovState.income=CF_DEFAULTS.income.map(r=>Object.assign({},r));
  if(!ovState.expenses)ovState.expenses=CF_DEFAULTS.expenses.map(r=>Object.assign({},r));
  // Load milestone inputs
  for (var i = 0; i < 5; i++) {
    var el = document.getElementById('ms-' + i);
    if (el) el.value = ovState.milestones[i] || 0;
  }
  if (!Array.isArray(ovState.customGoals)) ovState.customGoals = [];
  if (!Array.isArray(ovState.snapshots)) ovState.snapshots = [];
  try { renderMsExtras(); } catch (e) {}
  migrateOverviewLedgers();
}

// Legacy: the Overview "Additional assets" list was a hidden second ledger. Move anything in it
// (and ovState.debts) into the real tabs once, then keep it empty.
function migrateOverviewLedgers() {
  try {
    if (typeof alState === 'undefined' || typeof debtState === 'undefined') return;
    var moved = false;
    if (ovState.assets && ovState.assets.length) {
      if (!alState.otherAssets) alState.otherAssets = [];
      ovState.assets.forEach(function(a, i) {
        alState.otherAssets.push({ id: a.id || (Date.now() + i), name: a.name || 'Asset', value: +a.val || 0, image: null, svgIcon: null, imageSearch: null });
      });
      ovState.assets = []; moved = true;
    }
    if (ovState.debts && ovState.debts.length) {
      if (!debtState.debts) debtState.debts = [];
      ovState.debts.forEach(function(d, i) {
        var v = +d.val || 0;
        debtState.debts.push({ id: d.id || (Date.now() + 100 + i), name: d.name || 'Debt', original: v, balance: v, rate: 0, min: 0, type: 'other', _migrated: true });
      });
      ovState.debts = []; moved = true;
    }
    if (moved) { saveState(); if (typeof saveAL === 'function') saveAL(); if (typeof saveDebtState === 'function') saveDebtState(); }
  } catch (e) { console.error('[Vault-It] migrateOverviewLedgers', e); }
}

// Overview quick-add lists were retired — assets and debts live in their own tabs.
function renderLists() {}

function saveState() {
  // Read milestones from inputs
  ovState.milestones = [];
  for (var i = 0; i < 5; i++) {
    var el = document.getElementById('ms-' + i);
    ovState.milestones.push(el ? parseFloat(el.value) || 0 : 0);
  }
  try { localStorage.setItem(OV_KEY, JSON.stringify(ovState)); } catch(e) {}
  if (typeof checkAchievements === 'function') checkAchievements();
}

// ═══════════════════════════════════════════════════════════════
// CURRENT TOTALS
// ═══════════════════════════════════════════════════════════════
function totalAssets()  { return ovState.assets.reduce(function(a,r){ return a + (+r.val||0); }, 0); }
function totalDebts()   { return ovState.debts.reduce(function(a,r){ return a + (+r.val||0); }, 0); }
function currentNW()    { return totalAssets() - totalDebts(); }

// ── CURRENCY / FX ──────────────────────────────────────────────────
var _fxRates = { GBP:1, USD:1.27, EUR:1.16, INR:106 }; // fallback rates
window.VI_CURRENCY_SYMBOL = '£';
window.VI_CURRENCY_RATE   = 1;

function _applyCurrency() {
  var c = (window.VI_CURRENCY || viSettings.currency || 'GBP').toUpperCase();
  var syms = { GBP:'£', USD:'$', EUR:'€', INR:'₹' };
  window.VI_CURRENCY_SYMBOL = syms[c] || '£';
  window.VI_CURRENCY_RATE   = _fxRates[c] || 1;
  if (typeof updateKPIs === 'function')    try { updateKPIs();    } catch(e) {}
  if (typeof updateSidebar === 'function') try { updateSidebar(); } catch(e) {}
  if (typeof renderJourney === 'function') try { renderJourney(); } catch(e) {}
  document.querySelectorAll('.vi-currency-switcher button').forEach(function(b){
    b.classList.toggle('active', b.dataset.c === c);
  });
}

function fetchExchangeRates() {
  var cached = null;
  try { cached = JSON.parse(localStorage.getItem('vi_fx_cache') || 'null'); } catch(e){}
  var now = Date.now();
  if (cached && cached.ts && (now - cached.ts) < 6*3600*1000 && cached.rates) {
    _fxRates = cached.rates;
    _applyCurrency();
    return;
  }
  fetch('https://open.er-api.com/v6/latest/GBP')
    .then(function(r){ return r.json(); })
    .then(function(d){
      if (d.result === 'success' && d.rates) {
        _fxRates = d.rates;
        _fxRates.GBP = 1;
        try { localStorage.setItem('vi_fx_cache', JSON.stringify({ts:now, rates:_fxRates})); } catch(e){}
        _applyCurrency();
      }
    })
    .catch(function(){});
}

function switchCurrency(c) {
  viSettings.currency = c;
  window.VI_CURRENCY = c;
  saveViSettings();
  _applyCurrency();
  showToast('Currency: ' + c + ' · Rate: ' + (_fxRates[c]||1).toFixed(3));
}

function gbpFmt(n) {
  var rate = window.VI_CURRENCY_RATE || 1;
  var sym  = window.VI_CURRENCY_SYMBOL || '£';
  var conv = (isNaN(n) || n == null ? 0 : n) * rate;
  var abs  = Math.abs(conv);
  var sign = conv < 0 ? '-' : '';
  if (abs >= 1000000) return sign + sym + (abs/1000000).toFixed(1) + 'M';
  if (abs >= 1000)    return sign + sym + (abs/1000).toFixed(1) + 'k';
  return sign + sym + Math.round(abs).toLocaleString('en-GB');
}

// ═══════════════════════════════════════════════════════════════
// UPDATE KPIs
// ═══════════════════════════════════════════════════════════════
function updateKPIs() {
  var assets   = totalAssets() + alTotalAssets();
  var debtOnly = totalDebts() + debtTotal();
  var liabOnly = alTotalLiab();
  var nw       = computeNetWorth();

  var el = function(id) { return document.getElementById(id); };
  el('kpi-nw').textContent     = gbpFmt(nw);
  el('kpi-nw').style.color     = nw >= 0 ? 'var(--teal)' : 'var(--re)';
  var navNW = document.getElementById('nav-nw');
  if (navNW) { navNW.textContent = gbpFmt(nw); navNW.style.color = nw >= 0 ? 'var(--em)' : 'var(--re)'; }
  el('kpi-assets').textContent  = gbpFmt(assets);
  var dtEl = el('kpi-debt-total');
  if (dtEl) dtEl.textContent = gbpFmt(debtOnly);
  el('kpi-liab').textContent    = gbpFmt(alLiabAssetTotal());   // value logged; running costs come off net worth
  el('kpi-liab-sub').textContent = alLiabCostLine();
  // Add biz income streams to KPI total
  var bizMonthly = 0;
  if (typeof bizState !== 'undefined' && bizState.incomeStreams) {
    bizState.incomeStreams.forEach(function(s){ bizMonthly += (+s.monthlyIncome || 0); });
  }
  el('kpi-debt').textContent    = gbpFmt(cfTotalIn()+bizMonthly-cfTotalOut());
  el('kpi-debt').style.color    = (cfTotalIn()+bizMonthly-cfTotalOut())>=0?'var(--blue)':'var(--re)';
  el('kpi-debt-sub').textContent = 'monthly surplus';

  // Update milestone dots + checkmarks
  for (var i = 0; i < 5; i++) {
    var target = ovState.milestones[i] || 0;
    var dot = document.getElementById('msdot-' + i);
    var hit = target > 0 && nw >= target;
    if (dot) dot.classList.toggle('hit', hit);
    var chk = document.getElementById('mschk-' + i);
    if (chk) chk.textContent = hit ? '✓' : '';
  }
  (ovState.customGoals||[]).forEach(function(g){
    var hit=g.amount>0&&nw>=g.amount,d=document.getElementById('msdot-c'+g.id),c=document.getElementById('mschk-c'+g.id);
    if(d)d.classList.toggle('hit',hit);if(c)c.textContent=hit?'✓':'';
  });
  renderSummaryCards();
  updateSidebar();
  updateFireBanner();
}
function updateFireBanner() {
  var stage = typeof jrnyCalcStage === 'function' ? jrnyCalcStage() : 0;
  var stageLabels = ['Foundation: clear your debt first','Stabilise: emergency fund & basics','Save: building your deposit buffer','Buy: mortgage ready','Own: paying down your mortgage','Wealth: compounding your freedom','Free: financial independence'];
  var stageEl = document.getElementById('ov-banner-stage'); if (stageEl) stageEl.textContent = 'STAGE ' + stage;
  var lbl = document.getElementById('ov-banner-label'); if (lbl) lbl.textContent = stageLabels[stage] || stageLabels[0];
  var pct = Math.min(100, (stage / 6) * 100);
  var bar = document.getElementById('ov-banner-bar'); if (bar) bar.style.width = pct + '%';
  var nxt = document.getElementById('ov-banner-next'); if (nxt) nxt.textContent = stage < 6 ? 'Next: Stage ' + (stage + 1) : '✓ Full Financial Freedom';
}

// ── SIDEBAR ──────────────────────────────────────────────────
var _sidebarOpen=false;
/* v0.9.2 (Pedro 2, 3): the side panel starts under the real header and ends above the phone tab bar, whatever their heights are */
function viSbFit(){var sb=document.getElementById('left-sidebar'),h=document.getElementById('topnav');if(!sb)return;
  var hb=h?Math.round(h.getBoundingClientRect().bottom):0;if(hb>0&&hb<200)sb.style.setProperty('top',hb+'px','important');
  var tb=document.getElementById('vi-tabs'),bot=0;if(tb&&innerWidth<700){var r=tb.getBoundingClientRect();if(r.height>0&&r.top>innerHeight/2)bot=Math.round(innerHeight-r.top);}
  sb.style.setProperty('bottom',bot+'px','important');}
window.addEventListener('resize',function(){try{viSbFit();}catch(e){}});
function toggleSidebar(){
  _sidebarOpen=!_sidebarOpen;
  try{viSbFit();}catch(e){}
  var sb=document.getElementById('left-sidebar');
  var btn=document.getElementById('sidebar-toggle');
  if(sb)sb.classList.toggle('open',_sidebarOpen);
  if(btn){
    btn.classList.toggle('open',_sidebarOpen);
    var arr=document.getElementById('sb-toggle-arrow');
    if(arr)arr.textContent=_sidebarOpen?'‹':'›';
  }
  updateSidebar();
}
function _sbEl(id,v){var e=document.getElementById(id);if(e)e.textContent=v;}
function updateSidebar(){
  // Populate profile from stored user data
  try {
    var u = JSON.parse(localStorage.getItem('vi_user') || 'null');
    if (u) {
      var _f = function(id, val) { var el = document.getElementById(id); if (el && val) el.value = val; };
      _f('sb-profile-name',  u.name);
      _f('sb-profile-email', u.email);
      _f('sb-profile-job',   u.job);
      _f('sb-profile-dream', u.dream);
      _f('sb-save-arch',     u.saveArch);
      _f('sb-spend-arch',    u.spendArch);
      // Restore avatar
      if (u.avatar) {
        var av = document.getElementById('sb-avatar');
        if (av) av.innerHTML = '<img src="' + u.avatar + '" style="width:100%;height:100%;object-fit:cover;object-position:center top">';
      }
      var navName = document.getElementById('nav-user-name');
      if (navName && u.name) navName.textContent = u.name;
    }
    renderPioneerCard();
  } catch(e) {}

  if(!_sidebarOpen)return;
  try{viRenderLedger();}catch(e){console.error('[Vault-It] ledger',e);}
}
/* The ledger (owner, 31 Oct 2026): every money figure the app holds, one line each with the icon of where it comes from. Every value
   is computed by the same function the dashboard, Budget, House builder and Debt tracker use, and printed with the same formatter, so
   a line always equals what that tab shows. Sections: overview, what you own, the house deposit, what you owe, the monthly budget,
   and the business when there is one. */
function viRenderLedger(){
  var el=document.getElementById('sb-ledger');if(!el)return;
  var L=VI_LABELS,out=[],f=function(v){return gbpFmt(v)},m=function(v){return gbpFmt(v)+'/mo'};
  function sec(t){out.push('<div class="sb-label sb-lg-h">'+t+'</div>')}
  function line(ic,col,label,val,id,vcol,note){out.push('<div class="sb-row sb-lg" data-k="'+(id||'')+'">'+ovIcon(ic,col)+'<span class="sb-lg-l" style="color:'+col+'">'+ccEsc(label)+'</span><span class="sb-val"'+(id?' id="'+id+'"':'')+(vcol?' style="color:'+vcol+'"':'')+'>'+val+'</span>'+(note?'<span class="sb-lg-n">'+ccEsc(note)+'</span>':'')+'</div>')}
  // live prices older than a day are flagged on their line, from the timestamps each tab already keeps (typed prices carry none)
  var DAYMS=864e5,now=Date.now();
  function stale(oldest){return oldest&&now-oldest>DAYMS?'Live price last updated '+Math.round((now-oldest)/DAYMS)+' d ago':''}
  var stkOld=0,crOld=0,mtOld=0;
  (alState.stocks||[]).forEach(function(h){if(!h.manualPrice&&+h.updated>0&&(!stkOld||h.updated<stkOld))stkOld=+h.updated});
  (alState.crypto||[]).forEach(function(c){var t=(c.priceSrc==='live'||c.priceSrc==='stale')?Date.parse(c.priceAt||0):0;if(t&&(!crOld||t<crOld))crOld=t});
  var mp=alState.metalPrices||{},mLive=mp.lastUpdated?Date.parse(mp.lastUpdated):0,mOwn=mp.manualAt?Date.parse(mp.manualAt):0;if(mLive&&mLive>=mOwn)mtOld=mLive;
  var assets=totalAssets()+alTotalAssets(),debtOnly=totalDebts()+debtTotal(),nw=computeNetWorth(),biz=0;
  if(typeof bizState!=='undefined'&&bizState.incomeStreams)bizState.incomeStreams.forEach(function(s){biz+=(+s.monthlyIncome||0)});
  var inc=cfTotalIn(),outM=cfTotalOut(),sur=inc+biz-outM;
  sec('Overview');
  line('nw',nw>=0?'var(--teal)':'var(--red)','Net worth',f(nw),'sb-nw',nw>=0?'var(--teal)':'var(--red)');
  line('inv','var(--green)','Total assets',f(assets),'sb-assets','var(--green)');
  line('card','var(--red)','Total debt',f(debtOnly),'sb-debt','var(--red)');
  line('warn','var(--amber)',L.liab,f(alLiabAssetTotal()),'sb-liab');
  line('plus',sur>=0?'var(--blue)':'var(--red)','Monthly surplus',m(sur),'sb-surplus',sur>=0?'var(--blue)':'var(--red)');
  sec('What you own');
  var bizC=alTotalBizCash();
  line('cash','var(--green)',L.cash,f(alTotalCash()-bizC),'sb-cash');
  if(bizC>0)line('biz','var(--orange)','Business accounts',f(bizC),'sb-biz-cash');
  line('house','var(--teal)',L.deposit,f(state?state.saved:0),'sb-deposit');
  line('stocks','var(--green2)',L.stocks,f(alTotalStocks()),'sb-stocks','',stale(stkOld));
  line('metals','var(--gold)',L.metals,f(alTotalMetals()),'sb-metals','',alTotalMetals()>0?stale(mtOld):'');
  line('inv','var(--purple)',L.inv,f(alTotalOther()),'sb-other');
  line('crypto','var(--teal)',L.crypto,f(alTotalCrypto()),'sb-crypto','',stale(crOld));
  if(typeof alTotalOwedToMe==='function')line('owed','var(--blue)',L.owed,f(alTotalOwedToMe()),'sb-owed');
  if(totalAssets()>0)line('inv','var(--t2)','Other assets',f(totalAssets()),'sb-other-assets');
  sec('House deposit');
  var p=typeof pct==='function'?pct():0,ht=(state&&state.houseType)||'terraced';
  line('house','var(--teal)',ht.charAt(0).toUpperCase()+ht.slice(1)+' · '+(p*100).toFixed(1)+'% saved',f(state?state.saved:0),'sb-house-saved');
  line('flag','var(--gold)','Deposit target',f(typeof depositTarget==='function'?depositTarget():0),'sb-house-deposit');
  line('house','var(--t2)','House price',f(state?state.target:0),'sb-house-target');
  out.push('<div class="sb-bar-wrap"><div class="sb-bar-fill" id="sb-house-bar" style="width:'+Math.min(100,p*100).toFixed(1)+'%"></div></div>');
  var debts=(typeof debtState!=='undefined'&&debtState.debts)||[],liabs=(alState.liabilities||[]);
  if(debts.length||liabs.length){sec('What you owe');
    debts.forEach(function(d){line((d.type==='credit'||d.type==='bnpl')?'card':'loan','var(--red)',d.name||'Debt',f(+d.balance||0),'sb-debt-'+d.id,'var(--red)')});
    liabs.forEach(function(l){line('warn','var(--amber)',l.name||'Liability',f(depreciatedValue(l)),'sb-liab-'+l.id)});
    if(alTotalLiab()>0)line('warn','var(--amber)','Running costs so far',f(alTotalLiab()),'sb-running');}
  sec('Monthly budget');
  line('income','var(--teal)','Income',m(inc),'sb-income');
  var by=cfItemsByGroup();
  CF_GROUP_ORDER.forEach(function(g){var t=(by[g]||[]).reduce(function(a,r){return a+(+r.amount||0)},0);if(t>0)line(g==='sv'?'cash':g==='iv'?'stocks':'out',CF_GROUPS[g].col,CF_GROUPS[g].short,m(t),'sb-bd-'+g)});
  var mdl=cfModel();if(mdl.overflow>0)line('plus','var(--t2)','Not assigned yet',m(mdl.overflow),'sb-unassigned');
  if(biz>0)line('biz','var(--orange)','Business income',m(biz),'sb-biz-income');
  line('plus',sur>=0?'var(--blue)':'var(--red)','Surplus',m(sur),'sb-surplus-2',sur>=0?'var(--blue)':'var(--red)');
  line('plus',mdl.surplus>=0?'var(--blue)':'var(--red)','Savings rate',(mdl.tIn>0?Math.max(-999,Math.round((mdl.surplus/mdl.tIn)*100)):0)+'%','sb-savings-rate',mdl.surplus>=0?'var(--blue)':'var(--red)');   /* Budget's Save rate: same surplus, same income, same rounding */
  var mrr=typeof bizMRR==='function'?bizMRR():0,cl=typeof bizState!=='undefined'?(bizState.clients||[]).filter(function(c){return c.status==='Active'}).length:0;
  if(mrr>0||cl>0||bizC>0){sec('Business');
    if(mrr>0||cl>0){line('biz','var(--orange)','Monthly recurring revenue',m(mrr),'sb-mrr');line('biz','var(--orange)','Active clients',String(cl),'sb-clients');}
    if(bizC>0){line('cash','var(--orange)','Business current',f(alTotalBizCash('biz-current')),'sb-biz-current');line('cash','var(--orange)','Business savings',f(alTotalBizCash('biz-savings')),'sb-biz-savings');}}
  el.innerHTML=out.join('');
}

// ═══════════════════════════════════════════════════════════════
// LINE CHART  (fixed: date-based x-axis, correct NW, forecast)
// ═══════════════════════════════════════════════════════════════
// The forecast (owner, 2 Nov: "take into account ... what is available in the user's budget to add and compound, rather than
// optimistically showing growth ... take into consideration if the user's paying off debt or not"). Driven by the Budget, never by a trend:
// - each month adds only what the budget assigns to Savings and Investments (unassigned surplus is not counted);
// - savings and investments, what you hold now and what the budget adds, compound monthly at the UK rates in VI_FC_RATES
//   (owner, 2 Nov 19:20: "Chose uk median and state");
// - each debt in the Debt tracker gains a month's interest at its APR, then the budget's "Debt payments" lines pay it down, shared by
//   each debt's minimum payment (or its balance when no minimums are set); with no repayment budgeted a debt stays level or grows;
// - spending plus saving beyond income (a shortfall) comes off net worth every month;
// - no budget at all: no new money goes in (balances still grow at the stated rates), and the note asks for a budget.
// Pure apart from reading the app's state, so the graph, the 3D blocks and the note share one set of numbers.
// ── Forecast rates: the one place to update them. Both a year, compounded monthly, and named in the note. ──
var VI_FC_RATES = {
  sav: 0.0165, savSrc: 'Bank of England easy-access average',   // BoE effective rate on instant-access (sight) deposits, Aug 2026 (published 29 Sep 2026)
  inv: 0.05,   invSrc: 'FCA mid projection'                                  // FCA intermediate projection rate, COBS 13 Annex 2
};
function viFcIsDebtLine(e) { return (e.cat || bdGuess('exp', e.name || '')) === 'debt'; }
// What the user holds now that grows: savings = cash accounts plus the house deposit; investments = stocks and shares.
function viFcBalances() {
  var cash = ((typeof alState !== 'undefined' && alState.cashAccounts) || []).reduce(function (t, a) { return t + Math.max(0, +a.balance || 0); }, 0);
  var dep = (typeof state !== 'undefined' && state) ? Math.max(0, +state.saved || 0) : 0, inv = 0;
  try { inv = Math.max(0, alTotalStocks() || 0); } catch (e) {}
  return { sav: cash + dep, inv: inv };
}
function viForecast(months, start) {
  start = start || { nw: computeNetWorth(), debt: debtTotal() + alTotalLiab() };
  var bal = viFcBalances(), sav0 = start.sav != null ? +start.sav : bal.sav, inv0 = start.inv != null ? +start.inv : bal.inv;
  var inc = cfTotalIn(), lines = (ovState.expenses || []).filter(function (e) { return (+e.amount || 0) > 0; });
  var hasBudget = inc > 0 || lines.length > 0, sv = 0, iv = 0, spend = 0, repay = 0;
  if (hasBudget) lines.forEach(function (e) { var t = cfType(e), a = +e.amount || 0;
    if (t === 'sv') sv += a; else if (t === 'iv') iv += a; else { spend += a; if (viFcIsDebtLine(e)) repay += a; } });
  var short = hasBudget ? Math.max(0, spend + sv + iv - inc) : 0;
  var debts = ((typeof debtState !== 'undefined' && debtState.debts) || []).filter(function (d) { return (+d.balance || 0) > 0; })
    .map(function (d) { return { b: +d.balance, apr: Math.max(0, +d.rate || 0), w: Math.max(0, +d.min || 0) }; });
  var sum = function () { return debts.reduce(function (t, d) { return t + d.b; }, 0); };
  var d0 = sum(), other = Math.max(0, (+start.debt || 0) - d0);
  var ms = Math.pow(1 + VI_FC_RATES.sav, 1 / 12) - 1, mi = Math.pow(1 + VI_FC_RATES.inv, 1 / 12) - 1;
  var savPot = sav0, invPot = inv0, lost = 0, out = [];
  for (var m = 1; m <= months; m++) {
    savPot = savPot * (1 + ms) + sv;
    invPot = invPot * (1 + mi) + iv;
    debts.forEach(function (d) { d.b += d.b * d.apr / 1200; });
    var left = repay, live = debts.filter(function (d) { return d.b > 0.005; });
    for (var k = 0; k < 20 && left > 0.005 && live.length; k++) {   // a debt cleared mid-month passes its share to the others
      var W = live.reduce(function (t, d) { return t + (d.w || d.b); }, 0), paid = 0;
      live.forEach(function (d) { var pay = Math.min(d.b, left * (d.w || d.b) / W); d.b -= pay; paid += pay; });
      left -= paid; live = live.filter(function (d) { return d.b > 0.005; });
    }
    lost += short;
    var dn = sum();
    out.push({ nw: (+start.nw || 0) + (savPot - sav0) + (invPot - inv0) + (d0 - dn) - lost, debt: other + dn });
  }
  return { pts: out, hasBudget: hasBudget, sv: sv, iv: iv, repay: repay, short: short, debts: debts.length, apr: debts.some(function (d) { return d.apr > 0; }), sav0: sav0, inv0: inv0 };
}
function viFcPct(r) { return String(+(r * 100).toFixed(2)) + '%'; }
// The note under the graph says what the forecast rests on, in plain words, from the same numbers the line uses.
function viFcNote(f, ahead) {
  var el = document.getElementById('nw-fc-note'); if (!el) return;
  var t = '';
  if (f) {   // copy: Pedro, 2 Nov evening (short, about 45 words)
    var R = VI_FC_RATES, plan, debt = f.debts ? (f.repay > 0 ? '; ' + gbpFmt(f.repay) + ' a month comes off your debts' : '; no debt repayments budgeted') : '',
      over = f.short > 0 ? '; it overspends by ' + gbpFmt(f.short) + ' a month' : '';
    if (!f.hasBudget) plan = 'No Budget yet, so no new money goes in. Set one up to see your plan.';
    else if (f.sv > 0 || f.iv > 0) plan = 'Your Budget adds ' + gbpFmt(f.sv) + ' a month to savings and ' + gbpFmt(f.iv) + ' to investments' + debt + over + '. Money without a job isn\'t counted.';
    else plan = 'Your Budget puts nothing into savings or investments' + debt + over + '. Money without a job isn\'t counted.';
    t = ahead + '-month estimate, not a prediction. ' + plan + ' Savings grow ' + viFcPct(R.sav) + ' a year (' + R.savSrc + '), investments '
      + viFcPct(R.inv) + ' (' + R.invSrc + '), debts follow their APR.';
  }
  var tx = document.getElementById('nw-fc-txt'); (tx || el).textContent = t; el.hidden = !t;
}
function drawChart() {
  var canvas = document.getElementById('nwChart');
  if (!canvas) return;
  var dpr = Math.min(window.devicePixelRatio || 1, 2.5);          // a bigger bitmap than ~2.5× adds no visible sharpness
  canvas.style.width = '100%'; canvas.style.height = '';           // CSS decides the box (it used to be pinned in px after the first draw, so the chart never grew when the screen did)
  var W = canvas.clientWidth || 0, H = canvas.clientHeight || 0;
  // not laid out yet (tab hidden): one pending retry at most, never a pile of them
  if (W < 50 || H < 50) {
    if (canvas.offsetParent === null) return;   // not shown (the 3D view is the main view, or the tab is hidden): showTab and the view switch redraw it when it appears; retrying here ran every 200 ms for ever
    if (!drawChart._retry) drawChart._retry = setTimeout(function () { drawChart._retry = 0; drawChart(); }, 200); return;
  }
  var bw = Math.round(W * dpr), bh = Math.round(H * dpr);
  if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }   // resizing the bitmap clears it: only when the size really changed
  var ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  canvas.dataset.drawn = W + 'x' + H + '@' + dpr;

  var PROJ_MO = 6;
  var MO_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var now = new Date();
  var curMonth = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
  var curNW = computeNetWorth();
  var curDebt = debtTotal() + alTotalLiab();
  var curIncome = cfTotalIn();

  // Build data points: snapshots + current
  var points = (ovState.snapshots||[]).map(function(s) {
    return { month: s.month, nw: +s.nw||0, debt: +s.debt||0, income: +s.income||0 };
  });
  // Remove any existing entry for current month then add fresh
  points = points.filter(function(p){ return p.month !== curMonth; });
  points.push({ month: curMonth, nw: curNW, debt: curDebt, income: curIncome });
  points.sort(function(a,b){ return a.month.localeCompare(b.month); });

  // ── Determine x-axis date range ──
  var hasForecast = chartState && chartState.metrics && chartState.metrics.proj;
  canvas._proj = [];   // the forecast months, kept so the 3D blocks view shows exactly these numbers
  var xEnd = new Date(now);
  if (hasForecast) xEnd.setMonth(xEnd.getMonth() + PROJ_MO); // forecast area only when Forecast is switched on
  // Share of the plot width given to history. Without a forecast the history uses the FULL width.
  var NOW_FRAC = hasForecast ? 0.72 : 1;

  var xStart;
  if (chartState && chartState.range !== 'all') {
    var nMo = parseInt(chartState.range) || 12;
    xStart = new Date(now);
    xStart.setMonth(xStart.getMonth() - nMo);
    // Filter points to range (always keep current)
    var cutStr = xStart.getFullYear()+'-'+String(xStart.getMonth()+1).padStart(2,'0');
    points = points.filter(function(p){ return p.month >= cutStr; });
  } else {
    // "All": start from earliest snapshot or 12 months back
    if (points.length > 1) {
      xStart = new Date(new Date(points[0].month + '-15').getTime() - 10 * 86400000);
    } else {
      xStart = new Date(now);
      xStart.setMonth(xStart.getMonth() - 11);
    }
  }

  // Ensure at least 2 points; synthesise start if needed
  if (points.length < 1) points.push({ month: curMonth, nw: curNW, debt: curDebt, income: curIncome });
  if (points.length < 2) {
    var synthDate = new Date(xStart);
    var synthMo = synthDate.getFullYear()+'-'+String(synthDate.getMonth()+1).padStart(2,'0');
    points.unshift({ month: synthMo, nw: 0, debt: curDebt, income: curIncome, synth: true });   // synth: drawn as a start, not a real month (the 3D blocks view leaves it out)
  }

  // Split x-axis: left half = history [xStart→now], right half = projection [now→xEnd]
  var nowTs     = now.getTime();
  var leftSpan  = Math.max(1, nowTs - xStart.getTime());
  var rightSpan = Math.max(1, xEnd.getTime() - nowTs);

  function monthToTs(yyyymm) { return new Date(yyyymm + '-15').getTime(); }
  function dateToX(ts) {
    var mid = PAD.l + cW * NOW_FRAC;
    if (ts <= nowTs) {
      return PAD.l + Math.max(0, Math.min(1, (ts - xStart.getTime()) / leftSpan)) * cW * NOW_FRAC;
    }
    if (NOW_FRAC >= 1) return mid; // nothing is drawn after "now" without a forecast
    return mid + Math.max(0, Math.min(1, (ts - nowTs) / rightSpan)) * cW * (1 - NOW_FRAC);
  }
  function xp(i) { return dateToX(monthToTs(points[i].month)); }

  // ── Apply zoom / pan (wheel=zoom, drag=pan) ──
  if(_nwZoom!==1){
    var tCenter=(xStart.getTime()+xEnd.getTime())/2;
    var halfSpan=(xEnd.getTime()-xStart.getTime())/(2*_nwZoom);
    xStart=new Date(tCenter-halfSpan);
    xEnd=new Date(tCenter+halfSpan);
  }
  if(_nwPanMs!==0){
    xStart=new Date(xStart.getTime()+_nwPanMs);
    xEnd=new Date(xEnd.getTime()+_nwPanMs);
  }
  // Recompute leftSpan/rightSpan after zoom/pan
  leftSpan=Math.max(1,nowTs-xStart.getTime());
  rightSpan=Math.max(1,xEnd.getTime()-nowTs);

  var PAD = { l: 70, r: 20, t: 24, b: 40 };
  var cW = W - PAD.l - PAD.r;
  var cH = H - PAD.t - PAD.b;

  // ── Y scale ──
  var allVals = [];
  points.forEach(function(p) { allVals.push(p.nw, p.debt); });
  var fc = hasForecast ? viForecast(PROJ_MO, points[points.length-1]) : null;   // the forecast stays on the chart
  if (fc) fc.pts.forEach(function(p) { allVals.push(p.nw, p.debt); });
  (ovState.milestones||[]).forEach(function(m) { if (m > 0) allVals.push(m); });
  (ovState.customGoals||[]).forEach(function(g) { if (g.amount > 0) allVals.push(g.amount); });
  if (chartState && chartState.metrics && chartState.metrics.income)
    points.forEach(function(p){ if(p.income) allVals.push(p.income); });
  var minV = Math.min.apply(null, allVals);
  var maxV = Math.max.apply(null, allVals);
  var vpad = (maxV - minV) * 0.15 || 500;
  minV -= vpad; maxV += vpad;
  var vRange = maxV - minV || 1;
  function yp(v) { return PAD.t + (1-(v-minV)/vRange) * cH; }

  // ── Grid lines ──
  ctx.strokeStyle = 'rgba(68,192,185,0.06)';
  ctx.lineWidth = 0.5;
  for (var g = 0; g <= 4; g++) {
    var gv = minV + (vRange * g / 4);
    var gy = yp(gv);
    ctx.beginPath(); ctx.moveTo(PAD.l, gy); ctx.lineTo(W-PAD.r, gy); ctx.stroke();
    ctx.fillStyle = viLight() ? viCss('muted') : 'rgba(90,96,104,0.7)';
    ctx.font = '10px Share Tech Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(gbpFmt(gv), PAD.l-6, gy+4);
  }

  // ── Zero line ──
  if (minV < 0 && maxV > 0) {
    var zy = yp(0);
    ctx.save(); ctx.strokeStyle=viRgba('gold',.55); ctx.lineWidth=1; ctx.setLineDash([4,4]);   // zero line: gold means now
    ctx.beginPath(); ctx.moveTo(PAD.l,zy); ctx.lineTo(W-PAD.r,zy); ctx.stroke();
    ctx.setLineDash([]); ctx.restore();
  }

  // ── TODAY centre line ──
  (function(){
    var mid = PAD.l + cW * NOW_FRAC;
    ctx.save();
    ctx.strokeStyle = viRgba('gold',.6);   // today: gold means now
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5,4]);
    ctx.beginPath(); ctx.moveTo(mid, PAD.t); ctx.lineTo(mid, H-PAD.b); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = viRgba('gold',.9);
    ctx.font = "bold 9px 'Syne',sans-serif";
    ctx.textAlign = NOW_FRAC >= 1 ? 'right' : 'center';
    ctx.fillText('TODAY', NOW_FRAC >= 1 ? mid + 2 : mid, PAD.t - 4);
    var tw = ctx.measureText('TODAY').width, tx = NOW_FRAC >= 1 ? mid + 2 - tw : mid - tw / 2;
    canvas._topLabels = [{ t: 'TODAY', x0: tx, x1: tx + tw }];   // the labels along the top: a quarter label that would touch one is left out (v0.8)
    ctx.restore();
  })();

  // ── Quarter vertical dashed lines ──
  (function(){
    var q = new Date(xStart.getFullYear(), Math.ceil(xStart.getMonth()/3)*3, 1);
    var qNames = ['Jan','Apr','Jul','Oct'];
    while (q.getTime() <= xEnd.getTime()) {
      var qx = dateToX(q.getTime());
      if (qx >= PAD.l && qx <= W-PAD.r) {
        ctx.save();
        ctx.strokeStyle = 'rgba(68,192,185,0.14)';
        ctx.lineWidth = 0.8; ctx.setLineDash([3,5]);
        ctx.beginPath(); ctx.moveTo(qx, PAD.t); ctx.lineTo(qx, H-PAD.b); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = viLight() ? viCss('teal') : 'rgba(68,192,185,0.4)';
        ctx.font = "bold 8px 'Syne',sans-serif";
        ctx.textAlign = 'center';
        var qLabel = 'Q'+(Math.floor(q.getMonth()/3)+1)+' \'' +String(q.getFullYear()).slice(2);
        var qw = ctx.measureText(qLabel).width, q0 = qx - qw / 2, q1 = qx + qw / 2, tops = canvas._topLabels || [];
        if (!tops.some(function (r) { return q0 < r.x1 + 4 && r.x0 < q1 + 4; })) {   // keep 4 px clear of TODAY and the quarter before
          ctx.fillText(qLabel, qx, PAD.t-4); tops.push({ t: qLabel, x0: q0, x1: q1 });
        }
        ctx.restore();
      }
      q.setMonth(q.getMonth()+3);
    }
  })();

  // ── X axis labels: evenly distributed across full pixel width ──
  (function(){
    var spanMs=xEnd.getTime()-xStart.getTime();
    var spanMonths=Math.round(spanMs/(1000*60*60*24*30));
    var maxLabels=Math.max(4,Math.floor(cW/68));
    var labelStep=1;
    if(spanMonths>maxLabels*6) labelStep=Math.ceil(spanMonths/(maxLabels*3))*3;
    else if(spanMonths>maxLabels*3) labelStep=3;
    else if(spanMonths>maxLabels) labelStep=2;
    var prevLx=-999;
    var lDate=new Date(xStart.getFullYear(),xStart.getMonth(),1);
    ctx.fillStyle=viLight()?viCss('muted'):'rgba(90,96,104,0.65)';
    ctx.font="9px 'Share Tech Mono',monospace";
    ctx.textAlign='center';
    while(lDate.getTime()<=xEnd.getTime()+1000*60*60*24*31){
      var lx=dateToX(lDate.getTime());
      if(lx>=PAD.l&&lx<=W-PAD.r&&lx-prevLx>52){
        ctx.fillText(MO_NAMES[lDate.getMonth()]+" '"+String(lDate.getFullYear()).slice(2),lx,H-PAD.b+14);
        canvas._axisBottom=H-PAD.b+17;   // the month labels' lowest pixel (9 px text, baseline + descent): the hint row sits just under it
        // Tick mark
        ctx.save();ctx.strokeStyle='rgba(68,192,185,0.15)';ctx.lineWidth=0.7;
        ctx.beginPath();ctx.moveTo(lx,H-PAD.b);ctx.lineTo(lx,H-PAD.b+4);ctx.stroke();
        ctx.restore();
        prevLx=lx;
      }
      lDate.setMonth(lDate.getMonth()+labelStep);
    }
  })();

  // ── Milestone horizontal lines ──
  var msColors=['#c9a84c','#c9a84c','#c9a84c','#c9a84c','#c9a84c'];
  var msLabels=['Emergency Fund','Clear Debt','House Deposit','FI Number','Custom'];
  var msAll=(ovState.milestones||[]).map(function(m,i){return{m:m,label:msLabels[i],c:msColors[i]};}).concat((ovState.customGoals||[]).map(function(g){return{m:g.amount,label:g.name,c:'#e8c56a'};}));
  // Goal labels sit at the right end of their line on a dark plate (v0.8, Pedro); where two lines are within 14 px the lower
  // label moves below its line, so labels never overlap. canvas._msLabels keeps the plates for the tests.
  var msShown=msAll.filter(function(it){return it.m>0&&it.m>=minV&&it.m<=maxV;}).map(function(it){return{it:it,y:yp(it.m)};}).sort(function(a,b){return a.y-b.y;});
  canvas._msLabels=[];
  ctx.save(); ctx.font="10px 'Syne',sans-serif";
  var LH=14, placed=[];
  msShown.forEach(function(o,i){
    var it=o.it,my=o.y,txt=it.label+' '+gbpFmt(it.m),tw=Math.ceil(ctx.measureText(txt).width),pw=tw+6;
    ctx.save(); ctx.strokeStyle=it.c; ctx.globalAlpha=0.35; ctx.lineWidth=1; ctx.setLineDash([5,4]);
    ctx.beginPath(); ctx.moveTo(PAD.l,my); ctx.lineTo(W-PAD.r,my); ctx.stroke(); ctx.restore();
    var x=W-PAD.r-pw, above={x:x,y:my-2-LH,w:pw,h:LH}, below={x:x,y:my+2,w:pw,h:LH};
    var hit=function(r){return placed.some(function(q){return r.x<q.x+q.w&&q.x<r.x+r.w&&r.y<q.y+q.h&&q.y<r.y+r.h;});};
    var close=i>0&&my-msShown[i-1].y<14, top=PAD.t, bot=H-PAD.b;   // plates stay inside the plot, never on the month axis (Pedro, 2 Nov 23:25)
    var fits=function(q){return q.x>=PAD.l&&q.y>=top&&q.y+q.h<=bot&&!hit(q);};
    var leftOf=function(q){var cl=placed.filter(function(p){return q.y<p.y+p.h&&p.y<q.y+q.h;});
      if(!cl.length)return q;var lx=Math.min.apply(null,cl.map(function(p){return p.x;}));return {x:lx-4-pw,y:q.y,w:pw,h:LH};};
    var order=(close||hit(above))?[below,above]:[above,below];
    var r=order.filter(fits)[0]||[leftOf(above),leftOf(below)].filter(fits)[0];
    if(!r){var y=Math.min(bot-LH,Math.max.apply(null,placed.map(function(q){return q.y+q.h;}))+2);r={x:x,y:y,w:pw,h:LH};}   // last resort, still inside the plot
    placed.push(r);
    var lt=viLight();   // Night: dark plate, gold text. Daylight: the card surface at .85, brass text (Pedro, 2 Nov 23:00)
    ctx.fillStyle=lt?viRgba('panel',.85):'rgba(8,8,8,.72)'; ctx.fillRect(r.x,r.y,r.w,r.h);
    ctx.fillStyle=lt?viCss('brass'):it.c; ctx.textAlign='left'; ctx.textBaseline='middle'; ctx.fillText(txt,r.x+3,r.y+r.h/2+.5);
    canvas._msLabels.push({label:it.label,line:my,x:r.x,y:r.y,w:r.w,h:r.h,below:r===below||r.y>my});
  });
  ctx.restore();

  // ── Line series helper ──
  function drawLine(pts, color, lw, fill) {
    if (!pts || pts.length < 1) return;
    ctx.save(); ctx.beginPath();
    pts.forEach(function(pt, i){ i===0?ctx.moveTo(pt.x,pt.y):ctx.lineTo(pt.x,pt.y); });
    ctx.strokeStyle=color; ctx.lineWidth=lw||2; ctx.lineJoin='round'; ctx.setLineDash([]);
    ctx.stroke();
    if (fill) {
      var lastPt = pts[pts.length-1], firstPt = pts[0];
      ctx.lineTo(lastPt.x, yp(minV));
      ctx.lineTo(firstPt.x, yp(minV));
      ctx.closePath(); ctx.fillStyle=fill; ctx.fill();
    }
    ctx.restore();
  }

  // Map points to pixel coords for each metric
  function ptCoords(key) {
    return points.map(function(p,i){ return {x:xp(i), y:yp(p[key]||0)}; });
  }

  var showDebt   = !chartState||!chartState.metrics||chartState.metrics.debt;
  var showIncome = !chartState||!chartState.metrics||chartState.metrics.income;
  var showNW     = !chartState||!chartState.metrics||chartState.metrics.nw;

  if (showDebt)   drawLine(ptCoords('debt'),  viRgba('red',.4), 1.5, viRgba('red',.04));
  if (showDebt)   drawLine(ptCoords('debt'),  viCss('red'), 2);
  if (showIncome) drawLine(ptCoords('income'),viCss('gold'), 1.8, viRgba('gold',.05));
  if (showNW)     drawLine(ptCoords('nw'),    viCss('teal'), 2.5, viRgba('teal',.07));

  // ── Forecast (dashed): from the Budget, see viForecast ──
  viFcNote(fc, PROJ_MO);
  if (fc) {
    var projPts_nw=[], projPts_dt=[];
    var lastPt = points[points.length-1];
    projPts_nw.push({x:dateToX(monthToTs(lastPt.month)), y:yp(lastPt.nw)});
    projPts_dt.push({x:dateToX(monthToTs(lastPt.month)), y:yp(lastPt.debt)});
    for (var pi=1; pi<=PROJ_MO; pi++) {
      var pm = new Date(now.getFullYear(), now.getMonth()+pi, 1);
      var pmStr = pm.getFullYear()+'-'+String(pm.getMonth()+1).padStart(2,'0');
      var pmX = dateToX(monthToTs(pmStr)), fp = fc.pts[pi-1];
      projPts_nw.push({x:pmX, y:yp(fp.nw)});
      projPts_dt.push({x:pmX, y:yp(fp.debt)});
      canvas._proj.push({ month: pmStr, nw: fp.nw, debt: fp.debt });
    }

    ctx.save(); ctx.setLineDash([6,4]); ctx.globalAlpha=0.65; ctx.lineWidth=1.5;
    if (showNW) {
      ctx.strokeStyle=viRgba('teal',.6); ctx.beginPath();
      projPts_nw.forEach(function(pt,i){i===0?ctx.moveTo(pt.x,pt.y):ctx.lineTo(pt.x,pt.y);});
      ctx.stroke();
    }
    if (showDebt) {
      ctx.strokeStyle=viRgba('red',.6); ctx.beginPath();
      projPts_dt.forEach(function(pt,i){i===0?ctx.moveTo(pt.x,pt.y):ctx.lineTo(pt.x,pt.y);});
      ctx.stroke();
    }
    ctx.setLineDash([]); ctx.globalAlpha=1; ctx.restore();
  }

  // ── NW data point dots ──
  if (showNW) {
    points.forEach(function(p,i){
      ctx.beginPath(); ctx.arc(xp(i), yp(p.nw), 4, 0, Math.PI*2);
      ctx.fillStyle=viCss('teal'); ctx.fill();
      ctx.strokeStyle='rgba(8,8,8,0.8)'; ctx.lineWidth=1.5; ctx.stroke();
    });
  }

  // ── Hover/tooltip ──
  canvas._points = points;
  canvas._xp = xp;
  canvas._yp = yp;
  canvas._PAD = PAD;
  canvas._W = W;
  canvas._H = H;
  canvas._dateToX = dateToX;
  canvas._monthToTs = monthToTs;
}

// Tooltip on hover
document.getElementById('nwChart').addEventListener('mousemove', function(e) {
  if (!this._points || this._points.length < 2) return;
  var rect2 = this.getBoundingClientRect();
  var mx = e.clientX - rect2.left;
  var W = this._W || rect2.width;
  var PAD = this._PAD;
  var cW = W - PAD.l - PAD.r;
  var idx = 0, best = Infinity, self = this;
  this._points.forEach(function(pt, i) { var d = Math.abs(self._xp(i) - mx); if (d < best) { best = d; idx = i; } });
  var p = this._points[idx];
  var tt = document.getElementById('chart-tooltip');
  if (tt) tt.textContent = p.month + ' \u2014 NW: ' + gbpFmt(p.nw) + ' \u00b7 Debt: ' + gbpFmt(p.debt) + (p.income?' \u00b7 Income: '+gbpFmt(p.income)+'/mo':'');
});
document.getElementById('nwChart').addEventListener('mouseleave', function() {
  var tt = document.getElementById('chart-tooltip');
  if (tt) tt.textContent = '';
});

// ── Net Worth Chart pan & zoom ──────────────────────────────
(function(){
  var c=document.getElementById('nwChart');
  var _dragging=false,_lastX=0;
  c.style.cursor='crosshair';

  c.addEventListener('wheel',function(e){
    e.preventDefault();
    var delta=e.deltaY||e.deltaMode===1?e.deltaY*20:e.deltaY;
    _nwZoom=Math.max(0.25,Math.min(8,_nwZoom*(1+delta*-0.001)));
    drawChart();
  },{passive:false});

  c.addEventListener('mousedown',function(e){
    if(e.button!==0) return;
    _dragging=true; _lastX=e.clientX;
    c.style.cursor='grabbing'; e.preventDefault();
  });
  window.addEventListener('mouseup',function(){
    if(_dragging){_dragging=false;c.style.cursor='crosshair';}
  });
  window.addEventListener('mousemove',function(e){
    if(!_dragging) return;
    var dx=e.clientX-_lastX; _lastX=e.clientX;
    // Convert pixel delta to time offset
    var rect=c.getBoundingClientRect();
    var pxPerMs=(rect.width-90)/(12*30*24*3600*1000)*_nwZoom;
    if(pxPerMs>0) _nwPanMs-=dx/pxPerMs;
    drawChart();
  });

  // Reset zoom/pan on double-click
  c.addEventListener('dblclick',function(){
    _nwZoom=1; _nwPanMs=0; drawChart();
  });

  // Touch support
  var _tLastX=0;
  c.addEventListener('touchstart',function(e){if(e.touches.length===1){_dragging=true;_tLastX=e.touches[0].clientX;}},{passive:true});
  c.addEventListener('touchend',function(){_dragging=false;},{passive:true});
  c.addEventListener('touchmove',function(e){
    if(!_dragging||e.touches.length!==1) return;
    var dx=e.touches[0].clientX-_tLastX; _tLastX=e.touches[0].clientX;
    var rect=c.getBoundingClientRect();
    var pxPerMs=(rect.width-90)/(12*30*24*3600*1000)*_nwZoom;
    if(pxPerMs>0) _nwPanMs-=dx/pxPerMs;
    drawChart();
  },{passive:true});
})();

// ═══════════════════════════════════════════════════════════════
// ADD SNAPSHOT
// ═══════════════════════════════════════════════════════════════

// ── custom goals + snapshot list (Overview) ──
function renderMsExtras(){
  var gl=document.getElementById('ms-custom-list');
  if(gl){
    var nw=(typeof calcNW==='function')?0:0;
    gl.innerHTML=(ovState.customGoals||[]).map(function(g){
      return '<div class="ms-row x5"><div class="ms-dot" id="msdot-c'+g.id+'"></div><span class="ms-ic">⭐</span><label>'+ccEsc(g.name)+' <span id="mschk-c'+g.id+'" class="ms-chk"></span></label>'
        +'<input type="number" min="0" value="'+(+g.amount||0)+'" onchange="editCustomGoal('+g.id+',this.value)">'
        +'<button class="ms-x" title="Remove goal" onclick="delCustomGoal('+g.id+')"><svg class="vi-ic g" role="img" aria-label="Close"><use href="#vi-close"/></svg></button></div>';
    }).join('');
  }
  var sl=document.getElementById('ms-snap-list');
  if(sl){
    var snaps=(ovState.snapshots||[]).slice().sort(function(a,b){return a.month<b.month?1:-1;});
    sl.innerHTML=snaps.length?snaps.map(function(x){
      return '<div class="ms-row snap"><span class="ms-ic">📸</span><label>'+ccEsc(x.month)+'</label><span class="ms-snapv">'+gbpFmt(x.nw)+'</span>'
        +'<button class="ms-x" title="Remove snapshot" onclick="delSnapshot(\''+ccEsc(x.month)+'\')"><svg class="vi-ic g" role="img" aria-label="Close"><use href="#vi-close"/></svg></button></div>';
    }).join(''):'<div class="ms-empty">No snapshots yet. Add a past month to build your history.</div>';
  }
  try{updateKPIs();}catch(e){}
}
function addCustomGoal(){if(viBlockEdit())return;
  var n=viClean((document.getElementById('goal-name')||{}).value||'').trim().slice(0,30),a=parseFloat((document.getElementById('goal-amt')||{}).value);
  if(!n){showToast('Name your goal');return;}
  if(!(a>0)){showToast('Enter a target amount');return;}
  ovState.customGoals=(ovState.customGoals||[]).concat([{id:Date.now(),name:n,amount:a}]);
  document.getElementById('goal-name').value='';document.getElementById('goal-amt').value='';
  saveState();renderMsExtras();drawChart();showToast('Goal added: '+n);
}
function editCustomGoal(id,v){if(viBlockEdit())return;var g=(ovState.customGoals||[]).find(function(x){return x.id===id;});if(g){g.amount=parseFloat(v)||0;saveState();drawChart();updateKPIs();}}
function delCustomGoal(id){if(viBlockEdit())return;ovState.customGoals=(ovState.customGoals||[]).filter(function(x){return x.id!==id;});saveState();renderMsExtras();drawChart();}
function delSnapshot(m){if(viBlockEdit())return;ovState.snapshots=(ovState.snapshots||[]).filter(function(x){return x.month!==m;});saveState();renderMsExtras();drawChart();updateKPIs();}
(function(){var o=addSnapshot;})();
// the add-forms start open on wide screens and tucked away (one tap) on phones
window.addEventListener('load',function(){var w=window.innerWidth>=900;['ms-add-goal','ms-add-snap'].forEach(function(id){var d=document.getElementById(id);if(d&&w)d.open=true;});});
function addSnapshot() {if(viBlockEdit())return;
  var month = document.getElementById('snap-month').value;
  var nw    = parseFloat(document.getElementById('snap-nw').value);
  var debt  = parseFloat(document.getElementById('snap-debt').value) || 0;
  var liab  = parseFloat(document.getElementById('snap-liab').value) || debt;
  if (!month) { showToast('Select a month'); return; }
  if (isNaN(nw)) { showToast('Enter net worth value'); return; }
  // Remove existing for same month
  ovState.snapshots = ovState.snapshots.filter(function(s) { return s.month !== month; });
  ovState.snapshots.push({ month: month, nw: nw, debt: debt, liab: liab, income: cfTotalIn() });
  saveState();
  drawChart();
  updateKPIs();
  showToast('Snapshot added for ' + month);
  try{renderMsExtras();}catch(e){}
  document.getElementById('snap-month').value = '';
  document.getElementById('snap-nw').value = '';
  document.getElementById('snap-debt').value = '';
  document.getElementById('snap-liab').value = '';
}

// ═══════════════════════════════════════════════════════════════
// ASSETS & DEBTS
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// TOAST (shared)
// ═══════════════════════════════════════════════════════════════
var _toastT, _toastN = 0;
function showToast(msg, ms) {   // the one toast: toast() shares it, so only the newest toast's timer can hide it
  var t = document.getElementById('toast'); if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(_toastT); var tok = ++_toastN;
  // the count starts once it is drawn (two frames): a long task, such as the house rebuild after a deposit, cannot use it up unseen
  requestAnimationFrame(function () { requestAnimationFrame(function () { if (tok !== _toastN) return; clearTimeout(_toastT); _toastT = setTimeout(function () { if (tok === _toastN) t.classList.remove('show'); }, ms || 3000); }); });
}

