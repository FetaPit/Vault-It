// ══════════════════════════════════════════════════════════════
// WELCOME SCREEN + PAYWALL LOGIC
// ══════════════════════════════════════════════════════════════

function _isPro() {
  // Every plan is the whole app (and with the card wall, 12 Nov 2026, an account in the app is on a plan), so no feature is hidden
  // by this check. Paid status itself is viPaid(); viTier() names the plan (founder = Lifetime licence).
  return true;
}

function _proLockOverlay(title, subtitle) {
  return '<div style="position:absolute;inset:0;z-index:50;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgb(var(--panel-rgb) / .82);backdrop-filter:blur(6px);text-align:center;padding:24px">'
    + '<div style="font-size:1.8rem;margin-bottom:10px">🔒</div>'
    + '<div style="font-family:\'Syne\',sans-serif;font-weight:800;font-size:.82rem;color:var(--tx);margin-bottom:6px">' + title + '</div>'
    + '<div style="font-size:max(.58rem,var(--vi-fs-2));color:var(--t2);line-height:1.6;max-width:260px;margin-bottom:16px">' + subtitle + '</div>'
    + '<button onclick="showUpgrade(\'annual\')" style="padding:9px 22px;background:linear-gradient(135deg,var(--go),var(--go2));border:none;clip-path:polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px));color:#080808;font-family:\'Syne\',sans-serif;font-weight:800;font-size:max(.6rem,var(--vi-fs-2));cursor:pointer;letter-spacing:.06em">Upgrade to Pro →</button>'
    + '</div>';
}

function submitWaitlist() {
  var email = (document.getElementById('waitlist-email') || {}).value || '';
  if (!email || !email.includes('@')) { showToast('Enter a valid email to join the waitlist'); return; }
  var wl = [];
  try { wl = JSON.parse(localStorage.getItem('vi_waitlist') || '[]'); } catch(e) {}
  var user = {};
  try { user = JSON.parse(localStorage.getItem('vi_user') || '{}'); } catch(e) {}
  var record = { email: email, name: user.name || '', goal: user.goal, joined: user.joined || new Date().toISOString(), signedUp: new Date().toISOString() };
  var exists = wl.some(function(r){ return (r.email || r) === email; });
  if (!exists) wl.push(record);
  try { localStorage.setItem('vi_waitlist', JSON.stringify(wl)); } catch(e) {}
  captureEmailToList(email, user.name || '', 0);
  var m = document.getElementById('waitlist-modal');
  if (m) m.classList.add('hidden');
  showToast('✅ Alpha spot secured! We\'ll reach out when Pro launches.');
}



// ── WELCOME / INIT FUNCTIONS (moved from file preamble) ──
var _wSelectedVal = null;
var _vaultItUser  = null;

function selectWelcomeOpt(btn) {
  document.querySelectorAll('.welcome-opt').forEach(function(b){ b.classList.remove('selected'); });
  btn.classList.add('selected');
  _wSelectedVal = btn.getAttribute('data-val');
  var gh = document.getElementById('wz-goal-hint'); if (gh) gh.hidden = true;
}

// Step 1 → Step 2
// ── Onboarding screens (owner, 5 Nov 2026, from the Help Bnk feedback) ──
// 1 name (and email when not signed in), 2 where you are, 3 money, 4 home, 5 deposit pot (v0.95, owner 8 Nov), 6 your plan.
// w-step-1 holds screen 1 and w-step-2 holds 2-3, so wStep1Next / wStep2Submit / wStep2Skip keep their old jobs (3 screens since 10 Nov 2026).
var _wzAt = 1, WZ_N = 3, _wDay = null, _wCaptured = false;
function wGo(n) {
  n = Math.max(1, Math.min(WZ_N, n | 0)); _wzAt = n;
  document.querySelectorAll('#welcome-overlay .wz-screen').forEach(function (sc) { sc.hidden = +sc.getAttribute('data-s') !== n; });
  var s1 = document.getElementById('w-step-1'), s2 = document.getElementById('w-step-2');
  if (s1) s1.style.display = n <= 1 ? '' : 'none';
  if (s2) s2.style.display = n >= 2 ? '' : 'none';
  var hero = document.getElementById('wz-hero'); if (hero) hero.hidden = n !== 1;
  var c = document.getElementById('wz-count'); if (c) c.textContent = 'Step ' + n + ' of ' + WZ_N;
  document.querySelectorAll('#w-step-dots i').forEach(function (d, i) { d.classList.toggle('on', i < n); });
  var bk = document.getElementById('wz-back'); if (bk) bk.hidden = n === 1;
  if (n === WZ_N) wRenderPlan();
  var ov = document.getElementById('welcome-overlay'), box = ov && ov.querySelector('.welcome-box');
  if (ov) ov.scrollTop = 0; if (box) box.scrollTop = 0;
  var h = document.querySelector('#wz-s' + n + ' h2'); if (h && n > 1) { try { h.focus({ preventScroll: true }); } catch (e) {} }
}
function wNext() {
  if (_wzAt === 1) { wStep1Next(); return; }
  if (_wzAt === 2 && !_wPotCheck()) return;   // v0.95: a Yes on the deposit pot needs the amount
  wGo(_wzAt + 1);
}
function wBack() { if (_wzAt > 1) wGo(_wzAt - 1); }
function _wCheckId() {
  var n = document.getElementById('w-name'), e = document.getElementById('w-email');
  var known = viWelcomeEmailSync();   // signed in: the registered address, whatever is in the box
  var email = known || ((e && e.value) || '').trim();   // the first name is optional (owner, 10 Nov 2026); signed in, the email comes from the session
  if (!email || !email.includes('@')) {
    var f = document.getElementById('w-email-field'); if (f) f.hidden = false;
    if (e) e.style.borderColor = 'var(--re)'; showToast('Please enter a valid email address'); return false;
  }
  return true;
}
// signed in (Google or an emailed code): the email is known, so it is not asked again; Google also gives the first name
function viWelcomePrefill() {
  var u = (typeof _supaUser !== 'undefined' && _supaUser) || null;
  if (!u || !u.email) { viWelcomeEmailSync(); return false; }
  var md = u.user_metadata || {};
  viWelcomeEmailSync();
  var n = document.getElementById('w-name');
  var first = String(md.given_name || md.full_name || md.name || '').trim().split(/\s+/)[0] || '';
  if (n && !n.value && first) n.value = first.slice(0, 40);
  return true;
}
// The address this person signed in or registered with, read at once from what the page already holds (owner, 12 Nov 2026: "Do not ask
// for email address as it should auto populate from registering before"). Never vi_last_email (a shared device remembers the last
// person), never the sample's address. Empty when nothing is known: then, and only then, the welcome asks for it.
function viKnownEmail() {
  var good = function (e) { e = String(e || '').trim(); return e.indexOf('@') > 0 && e.toLowerCase() !== 'demo@vault-it.app' ? e : ''; };
  try { if (typeof _supaUser !== 'undefined' && _supaUser && good(_supaUser.email)) return good(_supaUser.email); } catch (e) {}
  try { if (typeof _authOTP !== 'undefined' && _authOTP && good(_authOTP.email)) return good(_authOTP.email); } catch (e) {}
  try { var k = typeof _localSessionKey === 'function' ? _localSessionKey() : null, s = k ? JSON.parse(localStorage.getItem(k) || 'null') : null;
    if (s && s.user && good(s.user.email)) return good(s.user.email); } catch (e) {}
  try { if (localStorage.getItem('vi_demo_mode') === 'true') return ''; } catch (e) {}
  try { var v = JSON.parse(localStorage.getItem('vi_session') || 'null'); if (v && v.expiry > Date.now() && good(v.email)) return good(v.email); } catch (e) {}
  try { var u = JSON.parse(localStorage.getItem('vi_user') || 'null'); if (u && good(u.email)) return good(u.email); } catch (e) {}
  return '';
}
// shows "Signed in as" with the known address, or the e-mail box when none is known; returns the address
function viWelcomeEmailSync() {
  var known = viKnownEmail();
  var e = document.getElementById('w-email'), f = document.getElementById('w-email-field');
  var se = document.getElementById('wz-signed-email'), si = document.getElementById('wz-signed');
  if (known) { if (e) e.value = known; if (se) se.textContent = known; }
  if (f) f.hidden = !!known;
  if (si) si.hidden = !known;
  return known;
}
// the sign-in card closing (Google, an e-mailed code, a PIN, a kept session) is when the address becomes known on this page
(function () {
  var run = function () { try { viWelcomeEmailSync(); } catch (e) {} };
  var watch = function () {
    run();
    try {
      var mo = new MutationObserver(run), lo = document.getElementById('login-overlay');
      if (lo) mo.observe(lo, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-ah'] });
    } catch (e) {}
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
})();
// the plan: guidance on using the tracker, never a product pick (FCA: information, not advice)
var VI_PLAN_PHASE_TEXT = [
  'Get every debt and bill in one place, so nothing takes you by surprise.',
  'Steady things: keep debts under control and build a small buffer. The Debt tracker shows the order that costs least in interest.',
  'Build your deposit, brick by brick, in the House builder.',
  'Get mortgage-ready, with your numbers in one place.',
  'Deposit done. Track the purchase and your new mortgage.',
  'Build equity and keep track of what you own.',
  'Own your home outright.'
];
var VI_PLAN_STEP = {
  0: { tab: 'debt',   text: 'Add each debt in the Debt tracker: who it is with, the interest rate and the minimum payment.' },
  1: { tab: 'budget', text: 'Give every pound of your take-home a job in the Budget.' },
  2: { tab: 'house',  text: 'Set your deposit target in the House builder and lay your first bricks.' },
  5: { tab: 'assets', text: 'Add what you own in Assets, so your net worth is right.' }
};
function _wPlanStage() { var v = parseInt(_wSelectedVal, 10); return isNaN(v) ? 0 : Math.max(0, Math.min(6, v)); }
function _wPlanStep() {
  var st = VI_PLAN_STEP[_wPlanStage()] || VI_PLAN_STEP[0];
  return document.getElementById('tab-' + st.tab) ? st : { tab: 'overview', text: 'Add your income and spending on the Overview.' };
}
function wRenderPlan() {
  var el = document.getElementById('wz-plan'); if (!el) return;
  var stg = _wPlanStage(), names = (typeof JRNY_STAGES !== 'undefined') ? JRNY_STAGES : [];
  var tags = ['Now', 'Next', 'Then'], li = '';
  for (var i = 0; i < 3 && stg + i < names.length; i++) {
    li += '<li class="wz-phase' + (i === 0 ? ' now' : '') + '"><span class="wz-phase-n">' + tags[i] + '</span><span><span class="wz-phase-name">' + names[stg + i].name + '</span>'
      + '<div class="wz-phase-d">' + VI_PLAN_PHASE_TEXT[stg + i] + '</div></span></li>';
  }
  var sym = '£';   // the welcome screens work in pounds (v0.95, tester 1: ₹ on Dream Home Target)
  var num = function (id) { var x = document.getElementById(id); var v = x ? parseFloat(x.value) : 0; return isFinite(v) && v > 0 ? v : 0; };
  var money = function (v) { return sym + Math.round(v).toLocaleString('en-GB'); };
  var inc = num('w-income'), out = num('w-expenses'), sums = '';
  if (inc && out) {
    var left = inc - out;
    sums = 'You told us ' + money(inc) + ' comes in and about ' + money(out) + ' goes out each month: '
      + (left >= 0 ? 'about ' + money(left) + ' left.' : 'about ' + money(-left) + ' more goes out than comes in.');
  } else if (inc) sums = 'You told us ' + money(inc) + ' comes in each month.';
  var step = _wPlanStep();
  el.innerHTML = '<ol class="wz-phases">' + li + '</ol>'
    + '<div class="wz-week"><b>This week: one step</b>' + step.text + '</div>'
    + (sums ? '<div class="wz-sums">' + sums + ' Rough figures, from what you typed.</div>' : '');
  var dn = document.getElementById('wz-day-name');   // the check-in day now defaults to today and is changed in Settings
  if (dn) dn.textContent = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][_wDay === null ? new Date().getDay() : _wDay];
  var days = document.getElementById('wz-days');
  if (days) {
    if (_wDay === null) _wDay = new Date().getDay();
    var lab = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], full = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], h = '';
    [1, 2, 3, 4, 5, 6, 0].forEach(function (d) { h += '<button type="button" data-d="' + d + '" aria-label="' + full[d] + '" aria-pressed="' + (d === _wDay) + '" onclick="wPickDay(' + d + ')">' + lab[d] + '</button>'; });
    days.innerHTML = h;
  }
}
function wPickDay(d) {
  _wDay = d;
  document.querySelectorAll('#wz-days button').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-d') === d)); });
}
// on the check-in day the app says the next step, once that day (the cadence the owner asked Help Bnk for)
function viCheckinNudge() {
  try {
    if (localStorage.getItem('vi_demo_mode') === 'true') return false;
    var u = JSON.parse(localStorage.getItem('vi_user') || 'null');
    if (!u || !u.checkin || typeof u.checkin.day !== 'number') return false;
    var d = new Date(); if (d.getDay() !== u.checkin.day) return false;
    var key = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    if (localStorage.getItem('vi_checkin_seen') === key) return false;
    localStorage.setItem('vi_checkin_seen', key);
    var next = null; try { next = getCoreTaskStatus().filter(function (t) { return !t.done; })[0]; } catch (e) {}
    showToast('Weekly check-in. Your next step: ' + (next ? next.label.toLowerCase() : 'bring your figures up to date') + '.', 6000);
    return true;
  } catch (e) { return false; }
}
window.addEventListener('load', function () { setTimeout(function () {
  try { var ov = document.getElementById('welcome-overlay'), lo = document.getElementById('login-overlay');
    if ((!ov || getComputedStyle(ov).display === 'none') && (!lo || getComputedStyle(lo).display === 'none')) viCheckinNudge(); } catch (e) {}
}, 2500); });

function wStep1Next() {
  if (!_wCheckId()) { wGo(1); return; }
  var name  = document.getElementById('w-name').value.trim();
  var email = document.getElementById('w-email').value.trim();
  if (!_wSelectedVal) {
    var gh = document.getElementById('wz-goal-hint'); if (gh) { gh.hidden = false; try { gh.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); } catch (e) {} }   // screen 1 is longer now: bring the cue into view
    showToast('Pick the one closest to you, so your plan starts in the right place');
    return;
  }
  // Save partial (the phone number, if given, is asked on the plan screen)
  var prev = _vaultItUser || {};
  _vaultItUser = { name: name, email: email, phone: prev.phone || '', goal: _wSelectedVal, joined: prev.joined || new Date().toISOString(), pro: false, logins: 1 };
  try { localStorage.setItem('vi_user', JSON.stringify(_vaultItUser)); } catch(e) {}
  if (!_wCaptured) {
    _wCaptured = true;
    captureEmailToList(email, name, parseInt(_wSelectedVal)||0);
    captureEmailMailchimp(email, name, parseInt(_wSelectedVal)||0);
  }
  wGo(2);
}

// Target Deposit Value: the typed pounds as a share of the typed Target Home Value, kept unrounded; null when it cannot be used
// (empty, no home value, or outside the House builder's 1% to 60%), and then nothing is saved for it
function _wDepNums() {
  var f = function (id) { var x = document.getElementById(id), v = x ? parseFloat(x.value) : NaN; return isFinite(v) && v > 0 ? v : 0; };
  return { home: Math.round(f('w-house')), dep: Math.round(f('w-deposit') * 100) / 100 };
}
function _wDepPct() {
  var n = _wDepNums(); if (!n.home || !n.dep) return null;
  var p = n.dep / n.home * 100;
  return (p >= 1 && p <= 60) ? p : null;
}
function wDepHint() {
  var h = document.getElementById('w-dep-hint'); if (!h) return;
  var n = _wDepNums(), one = function (p) { return (Math.round(p * 10) / 10).toLocaleString('en-GB'); };
  var def = (typeof state !== 'undefined' && state && +state.depositPct > 0) ? +state.depositPct : 20;
  var money = function (v) { return '£' + Math.round(v).toLocaleString('en-GB'); };
  var t;
  if (!n.dep) t = 'Leave it empty and the House builder uses a ' + one(def) + '% deposit' + (n.home ? ': ' + money(n.home * def / 100) + '.' : ' of the home value.');
  else if (!n.home) t = 'Add the Target Home Value too, so the deposit can be set.';
  else {
    var p = n.dep / n.home * 100;
    t = (p >= 1 && p <= 60) ? 'That is ' + one(p) + '% of the home value. You can change it in the House builder.'
      : 'That is ' + one(p) + '% of the home value. Choose between 1% and 60%, or leave it empty.';
  }
  h.textContent = t; h.hidden = false;
}

// Step 2 — full profile submit
function wStep2Submit() {
  var income   = parseFloat(document.getElementById('w-income')   && document.getElementById('w-income').value)   || 0;
  var expenses = parseFloat(document.getElementById('w-expenses') && document.getElementById('w-expenses').value) || 0;
  var house    = parseFloat(document.getElementById('w-house')    && document.getElementById('w-house').value)    || 0;
  var phone    = (document.getElementById('w-phone-s1') || document.getElementById('w-phone') || {}).value || '';

  // Persist profile into app state
  // Income is the starting figure (owner, 8 and 10 Nov 2026): one take-home row; each income stream added in the Budget comes off it (bdDrawRough)
  if (income > 0 && typeof ovState !== 'undefined') {
    if (!ovState.income) ovState.income = [];
    if (ovState.income.length === 0) ovState.income.push({ id: Date.now(), name: 'Salary / take-home', amount: Math.round(income * 100) / 100, cat: 'salary', _onboarding: true });
  }
  // Expenses pre-fill as one rough row (owner, 12 Nov 2026): each real expense added in the Budget comes off it until it is gone (bdDrawRough)
  if (expenses > 0 && typeof ovState !== 'undefined') {
    if (!ovState.expenses) ovState.expenses = [];
    if (ovState.expenses.length === 0) ovState.expenses.push({ id: Date.now() + 1, name: 'Monthly spending (rough)', amount: Math.round(expenses * 100) / 100, type: 've', category: 'necessity', cat: 'other', _onboarding: true });
  }
  if (_wHouse && typeof state !== 'undefined' && state && state.prices && _wHouse in state.prices) {
    // a picked house type (v0.9.1 round 2, R15): saved the way the House builder saves it; a typed target becomes that type's price, as Set price does
    state.houseType = _wHouse;
    if (house > 0) state.prices[_wHouse] = Math.round(house);   // typed in £ (the welcome screens are pounds only), stored in £
    state.target = state.prices[_wHouse];
    try { prevP = pct(); updatePriceLabels(); updatePriceInput(); updateMilestoneLabels(); updateFloorSelector(); save(); updateUI(); hbtPaint(); } catch (e) {}
  } else if (house > 0 && typeof state !== 'undefined' && state && state.prices) {
    // no house type picked: the value becomes the current type's price, as Set price does, so it survives the reload (shell/init.js sets target from prices)
    state.prices[state.houseType] = Math.round(house); state.target = state.prices[state.houseType];
    try { prevP = pct(); updatePriceLabels(); updatePriceInput(); save(); updateUI(); } catch (e) {}
  }
  // Target Deposit Value in exact pounds (owner, 12 Nov 2026): saved as the share of the home value it is, unrounded, through the field the
  // House builder's own deposit control sets (state.depositPct), so the deposit target there is the pounds typed. No new saved field.
  var depPct = _wDepPct();
  if (depPct !== null && typeof state !== 'undefined' && state) { state.depositPct = depPct; try { prevP = pct(); save(); updateUI(); } catch (e) {} }
  // v0.95: the deposit pot from the onboarding lands in the House Builder (after the house, so its bricks count against the right target)
  if (_wPot && _wPot !== 'none' && _wPotVal() > 0) { try { wPotToHouse(_wPot, _wPotVal(), (document.getElementById('w-pot-rate') || {}).value); } catch (e) {} }
  // Update user profile
  if (_vaultItUser) {
    if (phone.trim()) _vaultItUser.phone = phone.trim();
    if (_wSelectedVal !== null) _vaultItUser.checkin = { day: _wDay === null ? new Date().getDay() : _wDay, step: _wPlanStep().tab, set: new Date().toISOString() };
    _vaultItUser.income   = income;
    _vaultItUser.expenses = expenses;
    _vaultItUser.house    = house;
    try { localStorage.setItem('vi_user', JSON.stringify(_vaultItUser)); } catch(e) {}
  }

  // Map goal → journey stage
  if (typeof journeyState !== 'undefined') {
    journeyState.stageOverride = parseInt(_wSelectedVal) || 0;
    journeyState.profile.monthlyTakeHome = income;
    jrnySaveState();
  }

  // Save all state
  if (typeof saveState === 'function') saveState();

  // Hide overlay immediately — user is in the app
  var ov = document.getElementById('welcome-overlay'); if (ov) ov.style.display = 'none';
  viSetView(_wView);   // the view chosen on this step (Simplified unless they picked Advanced)
  setTimeout(function(){ viWhenOpen(function(){ if (window.viAfterWelcome) viAfterWelcome(); else viTesterWelcome(); }); }, 700);   // Pete's note for beta testers, once, then the tour, once
  applyPaywall();
  updateSidebar();
  if (typeof renderJourney === 'function') renderJourney();
  if (_vaultItUser) { captureEmailToList(_vaultItUser.email, _vaultItUser.name, parseInt(_wSelectedVal)||0); }
  applyProgressiveNav();
  checkAchievements();
  showToast('Welcome' + (_vaultItUser && _vaultItUser.name ? ', ' + _vaultItUser.name : '') + '. Let’s get started 🚀');
  if (_wSelectedVal !== null) { var _wTab = _wPlanStep().tab; setTimeout(function(){ try { showTab(_wTab); } catch(e) {} }, 250); }   // this week's step from the plan
  else if (income > 0) setTimeout(function(){ try { showTab('budget'); } catch(e) {} }, 250);
}

// Step 2 skip — save what we have and enter app
function wStep2Skip() {
  var ov=document.getElementById('welcome-overlay'); if(ov) ov.style.display='none';
  viSetView(_wView);
  setTimeout(function(){ viWhenOpen(function(){ if (window.viAfterWelcome) viAfterWelcome(); else viTesterWelcome(); }); }, 700);
  if (typeof journeyState !== 'undefined' && _wSelectedVal) {
    journeyState.stageOverride = parseInt(_wSelectedVal) || 0;
    jrnySaveState();
  }
  if (typeof saveState === 'function') saveState();
  applyPaywall();
  updateSidebar();
  showToast('Welcome. Fill in your numbers anytime to unlock your Journey Map.');
}

var _wMsSelected = null;
function selectMsOpt(btn) {
  document.querySelectorAll('#w-ms-opts .welcome-opt').forEach(function(b){ b.classList.remove('selected'); });
  btn.classList.add('selected');
  _wMsSelected = btn.getAttribute('data-ms');
}
function wStep3Submit() {
  var ov = document.getElementById('welcome-overlay'); if (ov) ov.style.display = 'none';
  if (_vaultItUser && _wMsSelected) {
    _vaultItUser.firstMilestone = _wMsSelected;
    try { localStorage.setItem('vi_user', JSON.stringify(_vaultItUser)); } catch(e) {}
  }
  var msgs = { debt: 'debt cleared', ef: 'emergency fund built', deposit: 'deposit saved', income: 'second income launched' };
  showToast('Welcome' + (_vaultItUser && _vaultItUser.name ? ', ' + _vaultItUser.name : '') + '. First milestone: ' + (msgs[_wMsSelected] || 'set') + '.');
  if (typeof saveState === 'function') saveState();
}
function wStep3Skip() {
  var ov = document.getElementById('welcome-overlay'); if (ov) ov.style.display = 'none';
  showToast('Welcome. Your journey starts now.');
  if (typeof saveState === 'function') saveState();
}

// Legacy (kept for backward compatibility)
function submitWelcome() { wStep1Next(); }

function skipWelcome() {
  var ov=document.getElementById('welcome-overlay'); if(ov) ov.style.display='none';
  applyPaywall();
}

// Core task completion check — gate for Pro upgrade
function coreTasksComplete() {
  var tasks = getCoreTaskStatus();
  return tasks.every(function(t){ return t.done; });
}

function getCoreTaskStatus() {
  var income   = typeof ovState !== 'undefined' && (ovState.income || []).length > 0;
  var expenses = typeof ovState !== 'undefined' && (ovState.expenses || []).length > 0;
  var house    = typeof state !== 'undefined' && state && state.target > 0;
  var debt     = typeof debtState !== 'undefined' && debtState.debts.length > 0;
  var journey  = typeof journeyState !== 'undefined' && journeyState.onboarded;
  return [
    { label: 'Add income source',            done: income,   tab: 'overview',     icon: '◎' },
    { label: 'Add monthly expenses',         done: expenses, tab: 'overview',     icon: '◎' },
    { label: 'Set house target',             done: house,    tab: 'house',        icon: '⌂' },
    { label: 'Log a debt or confirm free',   done: debt,     tab: 'debt',         icon: '◈' },
    { label: 'Complete Journey Map wizard',  done: journey,  tab: 'journey',      icon: '▲' },
  ].filter(function (t) { return !!document.getElementById('tab-' + t.tab); });   // a task whose tab has gone (the Journey Map panel is no longer in the page) would send people to a blank screen
}

function applyPaywall() {
  try { viPlanGate(); } catch (e) {}   // the card wall: after the questions, and whenever paid status changes
  viBizGate();
  updateProGate();
}
// The Entrepreneur tab is a Pro feature (owner, 13 Nov 2026, "Gate, testers keep"): Pioneer, Lifetime and the testers who keep it see the tab, a Vaulter sees the gate
// and nothing under it. Only the screen is covered: nothing saved is changed or removed.
function viBizGate() {
  var locked = false; try { locked = typeof viPro === 'function' && !viPro() && typeof viPaid === 'function' && viPaid(); } catch (e) {}
  var bizGate = document.getElementById('pro-gate-biz');
  if (bizGate) bizGate.style.display = locked ? '' : 'none';
  var tab = document.getElementById('tab-biz'); if (tab) tab.classList.toggle('vi-biz-locked', locked);
}
function updateProGate() {
  var tl = document.getElementById('pro-gate-tasklist');
  if (!tl) return;
  var tasks = getCoreTaskStatus();
  var done = tasks.filter(function(t){ return t.done; }).length;
  tl.innerHTML = tasks.map(function(t){
    return '<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:' + (t.done ? 'rgb(var(--green-rgb) / .07)' : 'rgb(var(--ink-rgb) / .03)') + ';border:1px solid ' + (t.done ? 'rgb(var(--green-rgb) / .25)' : 'var(--bd)') + ';border-radius:4px">'
      + '<span style="font-size:max(.8rem,var(--vi-fs-3))">' + (t.done ? '✅' : '⬜') + '</span>'
      + '<span style="font-size:max(.58rem,var(--vi-fs-2));color:' + (t.done ? 'var(--gr)' : 'var(--t2)') + ';flex:1">' + t.label + '</span>'
      + (t.done ? '' : '<button onclick="showTab(\'' + t.tab + '\')" style="font-size:max(.46rem,var(--vi-fs-1));padding:2px 7px;background:transparent;border:1px solid var(--bd2);border-radius:3px;color:var(--em);cursor:pointer">Go →</button>')
      + '</div>';
  }).join('');
  var btn = document.getElementById('pro-gate-main-btn');
  if (btn) {
    var allDone = done === tasks.length;
    btn.textContent = allDone ? 'Upgrade to Pro, all tasks complete →' : done + '/' + tasks.length + ' tasks complete · Keep going!';
    btn.style.opacity = allDone ? '1' : '0.7';
    btn.style.cursor = allDone ? 'pointer' : 'default';
    if (!allDone) btn.onclick = function(){ showToast('Complete all 5 tasks first. Each one powers your journey data'); };
    else btn.onclick = function(){ showUpgrade('annual'); };
  }
}

