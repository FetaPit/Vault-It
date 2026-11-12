// ── TASK 1: DEMO MODE ────────────────────────────────────────────
// Every key that holds a person's saved data, or shows this device has been used by someone. Kept in one place: the demo
// seed may load only when none of these holds anything (v0.9.1: a device with pos_al1 but no pos_ov1 used to boot as empty,
// was switched into demo mode and its real data was then treated as sample data).
var _VI_SAVED_KEYS = ['pos_ov1','pos_al1','pos_debt1','pos_biz1','pos_ach1','pos4','pos_house','ht3','pos_journey',
  'vi_jrny_events','vi_nw_history','vi_debt','vi_ov','vi_settings','vi_user','vi_session','vi_last_email',
  'vi_pin_hash','vi_declined_demo'];
var _VI_SAVED_PREFIX = /^(vi_snap_|sb-.+-auth-token$)/;
var _VI_BOOKKEEPING = { v: 1, version: 1, ts: 1, updated: 1, lastUpdated: 1 };   // fields that say nothing about the person
// a key holds data when it has any non-zero number, non-empty text or true in it (the app writes empty defaults such as
// pos_ach1 {"xp":0,"unlocked":[],...,"v":1} on every first boot; those are not a person's data)
function _viKeyHasData(k) {
  var v = null; try { v = localStorage.getItem(k); } catch (e) {}
  if (v == null || /^\s*$/.test(v)) return false;
  var j; try { j = JSON.parse(v); } catch (e) { return true; }   // plain text that is not JSON counts as data
  var deep = function(x) {
    if (x == null || x === false || x === 0 || x === '') return false;
    if (typeof x !== 'object') return true;
    for (var q in x) if (Object.prototype.hasOwnProperty.call(x, q) && !_VI_BOOKKEEPING[q] && deep(x[q])) return true;
    return false;
  };
  return deep(j);
}
function _viDeviceHasSavedData() {
  try {
    for (var i = 0; i < _VI_SAVED_KEYS.length; i++) if (_viKeyHasData(_VI_SAVED_KEYS[i])) return true;
    for (var j = 0; j < localStorage.length; j++) { var k = localStorage.key(j); if (_VI_SAVED_PREFIX.test(k) && _viKeyHasData(k)) return true; }
  } catch (e) { return true; }   // storage that cannot be read is never treated as empty
  return false;
}
function _demoPut(k, v) { if (!_viKeyHasData(k)) localStorage.setItem(k, v); }   // the demo only ever fills empty keys
function loadDemoData(force) {
  // refuses on any device that holds saved data, and never writes over a key that already has something in it
  // (force: the vault-it.co/demo-a link on a browser already on the sample; _demoPut still fills empty keys only)
  if (!force && _viDeviceHasSavedData()) return false;
  _demoPut('vi_demo_mode', 'true');
  // Alex Morgan, the sample persona (owner, 8 Nov 2026): £57,000 salary (about £3,635 a month after tax and NI), renting at £1,150,
  // saving for a semi-detached (£320,000, 10% deposit = £32,000, £18,500 saved), freelance product consulting on the side.
  if (!localStorage.getItem('vi_user')) {
    _demoPut('vi_user', JSON.stringify({
      name: 'Alex Morgan', email: 'demo@vault-it.app',
      job: 'Senior Product Manager', salary: 57000, dream: 'Keys to a semi-detached by 2028',
      saveArch: 'The Strategic Investor', spendArch: 'The Measured Spender',
      joined: new Date().toISOString(), pioneerNum: 7
    }));
    _demoPut('vi_pioneer', 'true');
  }
  if (!localStorage.getItem('pos_ov1')) {
    // Assets & debts live in their own tabs, so the Overview quick-add lists stay empty here
    // (otherwise the demo would count them twice). Cash flow + history use the real key/shape.
    var _dm = [], _nw = [19400, 21100, 22900, 24500, 26200, 28000, 30100, 32000], _dd = new Date();
    for (var _i = 7; _i >= 0; _i--) {
      var _m = new Date(_dd.getFullYear(), _dd.getMonth() - _i, 1);
      _dm.push({ month: _m.getFullYear() + '-' + String(_m.getMonth() + 1).padStart(2, '0'), nw: _nw[7 - _i], debt: 23050 + _i * 430, liab: 4200, income: 4835 });
    }
    _demoPut('pos_ov1', JSON.stringify({
      assets: [], debts: [], snapshots: _dm,
      milestones: [10000, 25000, 0, 50000, 100000],
      income: [
        { id: 1, name: 'Salary (£57k)',          amount: 3635, cat: 'salary'   },
        { id: 2, name: 'Freelance consulting',   amount: 1200, cat: 'business' }
      ],
      expenses: [
        { id: 3, name: 'Rent', amount: 1150, category: 'necessity', cat: 'housing', type: 'ce' },
        { id: 4, name: 'Groceries', amount: 340, category: 'necessity', cat: 'groceries', type: 've' },
        { id: 5, name: 'Transport', amount: 160, category: 'necessity', cat: 'transport', type: 've' },
        { id: 6, name: 'Utilities & bills', amount: 170, category: 'necessity', cat: 'utilities', type: 've' },
        { id: 7, name: 'Phone & internet', amount: 48, category: 'necessity', cat: 'phone', type: 'ce' },
        { id: 8, name: 'Insurance', amount: 55, category: 'necessity', cat: 'insurance', type: 'ce' },
        { id: 9, name: 'Subscriptions', amount: 58, category: 'discretionary', cat: 'subs', type: 'cn' },
        { id: 10, name: 'Gym & health', amount: 42, category: 'discretionary', cat: 'fitness', type: 'cn' },
        { id: 11, name: 'Eating out', amount: 120, category: 'discretionary', cat: 'dining', type: 'vn' },
        { id: 12, name: 'Entertainment', amount: 90, category: 'discretionary', cat: 'fun', type: 'vn' },
        { id: 13, name: 'Holidays', amount: 180, category: 'discretionary', cat: 'travel', type: 'vn' },
        { id: 14, name: 'Gifts & giving', amount: 80, category: 'discretionary', cat: 'gifts', type: 'vn' },
        { id: 15, name: 'House deposit', amount: 550, category: 'investment', cat: 'deposit', type: 'sv' },
        { id: 16, name: 'ISA / investments', amount: 350, category: 'investment', cat: 'invest', type: 'iv' },
        { id: 17, name: 'Pension (extra)', amount: 150, category: 'investment', cat: 'pension', type: 'iv' },
        { id: 18, name: 'Emergency fund', amount: 200, category: 'investment', cat: 'emergency', type: 'sv' },
        { id: 19, name: 'Savings', amount: 250, category: 'investment', cat: 'savings', type: 'sv' }
      ]
    }));
  }
  if (!localStorage.getItem('pos_al1')) {
    _demoPut('pos_al1', JSON.stringify({
      metals: { gold: 1.5, silver: 10, platinum: 0, palladium: 0 },
      crypto: [{ id: 1, sym: 'ETH', amount: 1.4, price: 2200 }, { id: 2, sym: 'BTC', amount: 0.05, price: 42000 }],
      // the £18,500 house pot lives in House Builder (ht3) and counts there, so it is not repeated here
      cashAccounts: [
        { id: 1, name: 'Marcus Savings (emergency fund)', type: 'Savings', balance: 4800, rate: 4.5 },
        { id: 2, name: 'Current Account', type: 'Current', balance: 2100, rate: 0 }
      ],
      otherAssets: [{ id: 5, name: 'Car · Honda Civic', value: 9500 }],
      liabilities: [{ id: 6, name: 'Car Finance', value: 4200, rate: 7.9, addedDate: '2024-06-01T00:00:00.000Z', runningCost: 180, depRate: 12 }],
      stockPies: [{ id: 1, name: 'Stocks & Shares ISA' }], activePie: 1,
      stocks: [
        { id: 1, pie: 1, sym: 'VUSA.L', name: 'Vanguard S&P 500 UCITS ETF',  units: 120, avgCost: 62.4, price: 78.1,  change: 0 },
        { id: 2, pie: 1, sym: 'VWRL.L', name: 'Vanguard FTSE All-World ETF', units: 60,  avgCost: 98,   price: 108.6, change: 0 }
      ]
    }));
  }
  if (!localStorage.getItem('ht3')) {
    // House Builder reads "ht3" (the old demo wrote an unused key, so the house stayed blank)
    _demoPut('ht3', JSON.stringify({
      saved: 18500, target: 320000, houseType: 'semi',
      deposits: [
        { date: '01/04/2026', amount: 3000 }, { date: '01/05/2026', amount: 2500 },
        { date: '01/06/2026', amount: 2800 }, { date: '01/07/2026', amount: 2600 },
        { date: '01/08/2026', amount: 2400 }, { date: '01/09/2026', amount: 2700 },
        { date: '01/10/2026', amount: 2500 }
      ],
      prices: { terraced: 240000, semi: 320000, detached: 500000, mansion: 1500000, flat: 80000, apartment: 300000 },
      depositPct: 10, apartmentFloor: 5, houseMode: null, mortgageBalance: 0
    }));
    // the house code read its state before this seed existed (v0.7, 1 Nov: a fresh device showed an empty plot): read it again now
    try { if (typeof state !== 'undefined' && !(+state.saved > 0)) { var _hd = JSON.parse(localStorage.getItem('ht3')); state = Object.assign({}, state, _hd, { prices: Object.assign({}, DEFAULTS, _hd.prices || {}) }); } } catch (e) {}
  }
  if (!localStorage.getItem('pos_journey')) {
    _demoPut('pos_journey', JSON.stringify({
      profile: { monthlyTakeHome: 3635, mortgageTermYears: 25, interestRateEst: 4.5, depositTargetPct: 10, creditHealth: 'good', efMonths: 4 },
      onboarded: true, stageOverride: 1, mortgageActive: false, mortgageBalance: 0, rentMonthly: 1150, rentYears: 4
    }));
  }
  // (QC-3) pos4 removed — it was never read; cashflow reads pos_ov1 / ovState.
  if (!localStorage.getItem('pos_debt1')) {
    _demoPut('pos_debt1', JSON.stringify({
      debts: [
        { id: 1, name: 'Student Loan Plan 2', balance: 21800, original: 38000, rate: 7.1, minPay: 214, type: 'loan', color: '#c9a84c' },
        { id: 2, name: 'Barclaycard', balance: 1250, original: 3200, rate: 24.9, minPay: 45, type: 'credit', color: '#44c0b9' }
      ]
    }));
  }
  if (!localStorage.getItem('pos_biz1')) {
    // Entrepreneur tab: freelance product consulting on the side (two retained clients, three leads, one stream building)
    var _now = Date.now();
    _demoPut('pos_biz1', JSON.stringify({
      clients: [
        { id: _now - 5, name: 'Northgate Health', monthly: 700, status: 'Active', notes: 'Fractional product lead, one day a week', email: 'ops@northgatehealth.example', phone: '', website: 'northgatehealth.example' },
        { id: _now - 4, name: 'Fernbrook Studio', monthly: 500, status: 'Active', notes: 'Roadmap and discovery sprints', email: 'hello@fernbrook.example', phone: '', website: 'fernbrook.example' }
      ],
      leads: [
        { id: _now - 3, name: 'Nova Retail', email: 'team@novaretail.example', phone: '', website: 'novaretail.example', stage: 'hot', value: 900, notes: 'Checkout redesign discovery, proposal sent' },
        { id: _now - 2, name: 'Harbour & Co', email: 'jo@harbourco.example', phone: '', website: '', stage: 'warm', value: 600, notes: 'Intro call done, wants a product audit' },
        { id: _now - 1, name: 'Lumen Fintech', email: '', phone: '', website: 'lumenfintech.example', stage: 'cold', value: 1200, notes: 'Referral from Fernbrook' }
      ],
      streams: [{ id: _now, name: 'Consulting day rate', monthly: 1200 }],
      incomeStreams: [
        { id: _now + 1, name: 'Product consulting', icon: '💼', type: 'active', monthlyIncome: 1200, status: 'active', steps: [], progress: 100, totalInvested: 350, monthlyHistory: [600, 700, 700, 1200, 1200, 1200],
          tasks: [{ id: _now + 11, text: 'Send Nova Retail proposal', stage: 'done' }, { id: _now + 12, text: 'Northgate roadmap review', stage: 'inprogress' }, { id: _now + 13, text: 'Harbour & Co product audit quote', stage: 'todo' }, { id: _now + 14, text: 'Invoice Fernbrook for October', stage: 'todo' }] },
        { id: _now + 2, name: 'Notion templates shop', icon: '📝', type: 'passive', monthlyIncome: 85, status: 'building', steps: [], progress: 40, totalInvested: 120, monthlyHistory: [0, 20, 45, 60],
          tasks: [{ id: _now + 21, text: 'Design the budget planner template', stage: 'done' }, { id: _now + 22, text: 'Set up the Gumroad page', stage: 'inprogress' }, { id: _now + 23, text: 'Post the launch thread', stage: 'todo' }] }
      ]
    }));
  }
  return true;
}

function clearDemoData() {
  // Full wipe (was incomplete — left pos_ov1/pos_al1/vi_user demo values behind).
  _wipeDemoData();
  location.reload();
}

function initDemoMode() {
  var launch = null; try { launch = localStorage.getItem('vi_demo_launch'); } catch (e) {}
  var viaLink = false; try { viaLink = new URLSearchParams(location.search).get('demo') === 'alex'; } catch (e) {}
  if (launch === 'a' || viaLink) {
    // vault-it.co/demo-a. Nothing in this browser is ever removed (owner, 8 Nov 2026). The pre-paint script sets the launch flag
    // only when the browser looks empty; the saved-data check here is the one that counts. An empty browser, or one already on
    // the sample, gets the Alex Morgan sample (empty keys filled, nothing written over), a 24h demo session and one reload on a
    // clean address, so every tab draws from the seeded keys the ordinary way. A browser holding someone's own data keeps every
    // key, gets a clean address and is told once how to see the demo.
    try { localStorage.removeItem('vi_demo_launch'); } catch (e) {}
    var onSample = localStorage.getItem('vi_demo_mode') === 'true';
    if (launch === 'a' && (onSample || !_viDeviceHasSavedData())) {
      if (loadDemoData(onSample)) {   // force only on the sample: _demoPut never writes over a key that already holds something
        try {
          localStorage.setItem('vi_demo_variant', 'a');
          var ds = null; try { ds = JSON.parse(localStorage.getItem('vi_session') || 'null'); } catch (e) {}
          if (!(ds && ds.email && ds.expiry > Date.now())) localStorage.setItem('vi_session', JSON.stringify({ email: 'demo@vault-it.app', expiry: Date.now() + 24 * 60 * 60 * 1000 }));
        } catch (e) {}
      }
      location.replace(location.pathname);
      return;
    }
    // Someone's own data or sign-in lives here: keep every key, clean the address, say so once (below).
    try { sessionStorage.setItem('vi_demo_kept', '1'); } catch (e) {}
    if (launch === 'a') { location.replace(location.pathname); return; }   // the pre-paint script hid the overlays for this load: reload so sign-in and welcome show as they should
    try { history.replaceState({}, document.title, location.pathname); } catch (e) {}
  }
  var kept = null; try { kept = sessionStorage.getItem('vi_demo_kept'); if (kept) sessionStorage.removeItem('vi_demo_kept'); } catch (e) {}
  if (kept) setTimeout(function () { try { showToast('You already have Vault-It on this device, so your own data was kept. To see the Alex Morgan demo, open vault-it.co/demo-a in a private window or on another device.', 9000); } catch (e) {} }, 800);
  var isDemo  = localStorage.getItem('vi_demo_mode') === 'true';
  // any saved data (not just pos_ov1), a profile, a sign-in or an earlier "no thanks" means this is not an empty device
  var hasData = !isDemo && _viDeviceHasSavedData();
  // a device where someone has just signed in (an account switch wipes the old data, keeps the sign-in and reloads) starts clean:
  // loading the demo there used to drop the new sign-in a moment later (found 31 Oct by test_beta_client)
  var session = null; try { session = JSON.parse(localStorage.getItem('vi_session') || 'null'); } catch (e) {}
  var signedIn = !!(session && session.email && session.expiry > Date.now());
  if (!isDemo && !hasData && !signedIn && loadDemoData()) {
    isDemo = true; try { _viBootDemo = true; } catch (e) {}   // v0.95: this page is on the sample from here on (see the setItem guard)
    // the seed lands after the app's state has loaded: read it back and redraw, so the first visit is not empty until a reload (release chat, 1 Nov)
    try { _reloadAllState(); } catch (e) {}
    try { updateKPIs(); drawChart(); renderCashflow(); renderSummaryCards(); renderFIREroadmap(); } catch (e) {}
  }
  var chip = document.getElementById('demo-chip');
  if (chip) chip.style.display = isDemo ? 'flex' : 'none';
  try { viSampleAuto(); } catch (e) {}
}

function initWelcome() {
  try {
    var overlay = document.getElementById('welcome-overlay');
    var user = JSON.parse(localStorage.getItem('vi_user') || 'null');
    var isDemo = localStorage.getItem('vi_demo_mode') === 'true';
    if (viUserOnboarded(user) && !isDemo) {   // the first name is optional (owner, 10 Nov 2026)
      // RETURNING REAL USER — hide overlay, restore app state
      _vaultItUser = user;
      if (overlay) overlay.style.display = 'none';
      applyPaywall();
      updateSidebar();
    }
    // NEW or DEMO user — overlay stays visible for onboarding
  } catch(e) {}
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() { _initSupabase(); _initSupabaseSession(); initWelcome(); initProOffer(); viTrialBoot(); initDemoMode(); loadViSettings(); checkStreak(); applyProgressiveNav(); handleOAuthCallback(); nwhRenderMini(); loadDensity(); viApplyFounderBadge(); _checkAlphaTestSeed(); initQuickLogin(); setTimeout(stkAutoRefresh, 4000); });
} else {
  _initSupabase(); _initSupabaseSession(); initWelcome(); initProOffer(); viTrialBoot(); initDemoMode(); loadViSettings(); checkStreak(); applyProgressiveNav(); handleOAuthCallback(); nwhRenderMini(); loadDensity(); viApplyFounderBadge(); _checkAlphaTestSeed(); initQuickLogin(); setTimeout(stkAutoRefresh, 4000);
}

