// ── PLAN WALL (owner, 12 Nov 2026: "Card required", "Card wall for everyone", "After the questions"; docs/briefs/CARD_WALL.md) ──
// Nobody uses the app on an account without a plan. The app opens only when the SERVER says the account is on a plan: the
// profile row, whose paid columns only the stripe-webhook can write (migration 011 keeps the browser's hands off them), read
// through _syncPioneerFromProfile. A trial counts: Stripe takes the card at checkout and the webhook marks the account then.
// Nothing held on the device opens it (vi_pioneer, vi_founder, vi_plan, vi_user.pro): they are a mirror of the server, not a
// key. The answer lives in memory for this page only, so every visit asks again.
//   'unknown'      not asked yet, or no answer yet     → the wall says "Checking your plan"
//   'on'           the server says: on a plan          → the app
//   'off'          the server says: not on a plan      → the wall shows the plans
//   'unreachable'  the server could not be asked       → the wall says so (never the plans: nobody is asked to pay twice)
//   'signin'       the sign-in on this device ran out  → the wall asks to sign in again
// The sample (vault-it.co/demo-a, or an empty browser on the sample) has no account and no wall.
var _viPlanState = 'unknown', _viPlanAt = 0, _viPlanBusy = null, _viPlanTimer = null, _viPlanQueue = [];
var VI_PLAN_PATIENCE_MS = 15000, VI_PLAN_RECHECK_MS = 10 * 60 * 1000;

// Tests have no server. On a loopback or file address only (a developer's own machine, never a deployed address) a test may
// stand in for the server's answer: window.__viPlanStub = 'on' | 'off' | 'unreachable' (tests/lib/vi.js sets 'on').
function _viPlanStub() {
  try {
    var h = location.hostname;
    if (location.protocol !== 'file:' && h !== 'localhost' && h !== '127.0.0.1' && h !== '[::1]') return null;
    var s = window.__viPlanStub; return (s === 'on' || s === 'off' || s === 'unreachable') ? s : null;
  } catch (e) { return null; }
}
// the server's row says on a plan: only stripe_apply (a completed checkout, a live or trialing subscription) or the owner sets these
function viRowOnPlan(row) { return !!row && (row.is_pioneer === true || row.is_founder === true); }
function viOnPlan() { return _viPlanState === 'on'; }

function _viStoredSession() {   // the sign-in supabase-js keeps on this device (for when the library itself is not answering)
  try { var k = _localSessionKey(); return k ? JSON.parse(localStorage.getItem(k) || 'null') : null; } catch (e) { return null; }
}
function _viPlanUid() {
  if (typeof _supaUser !== 'undefined' && _supaUser && _supaUser.id) return _supaUser.id;
  try {
    var s = _viStoredSession(), v = JSON.parse(localStorage.getItem('vi_session') || 'null');
    if (s && s.user && s.user.id && v && v.email && String(s.user.email || '').toLowerCase() === String(v.email).toLowerCase()) return s.user.id;
  } catch (e) {}
  return null;
}
// The sample and nothing else: the sample's own session and profile (demo@vault-it.app), and no trace of an account on this
// device (no sign-in kept by supabase-js, no last e-mail, no profile with another address). vi_demo_mode alone is not enough:
// set by hand, or by the old ?bypass=websummit link, on a device that holds an account's figures it must not open them.
var VI_DEMO_EMAIL = 'demo@vault-it.app';
function _viOnSample() {
  try {
    if (localStorage.getItem('vi_demo_mode') !== 'true') return false;
    if ((typeof _supaUser !== 'undefined' && _supaUser) || _localSessionKey()) return false;
    var mine = function (e) { return !!e && String(e).toLowerCase() !== VI_DEMO_EMAIL; };   // an address that is not the sample's
    var s = JSON.parse(localStorage.getItem('vi_session') || 'null'), u = JSON.parse(localStorage.getItem('vi_user') || 'null');
    return !!(s && s.email) && !mine(s.email) && !mine(u && u.email) && !mine(localStorage.getItem('vi_last_email'));
  } catch (e) { return false; }
}
// the wall is for an account: signed in on this device, and not the sample
function viWallApplies() {
  try {
    if (!hasValidSession()) return false;   // signed out: the sign-in screen is up
    return !_viOnSample();                  // vault-it.co/demo-a: no account, no wall
  } catch (e) { return true; }
}
function _viWallBlocked() {   // sign-in or the questions are on screen: they come first ("After the questions")
  return ['login-overlay', 'welcome-overlay'].some(function (id) { var el = document.getElementById(id); return !!(el && getComputedStyle(el).display !== 'none'); });
}

// what the profile read came back with (see _viProfileRead in auth/sync.js)
function viPlanAnswer(uid, res) {
  if (_viPlanStub()) return;
  var cur = _viPlanUid(); if (cur && uid && cur !== uid) return;                             // an answer about another account
  if (res && res.row) _viPlanState = viRowOnPlan(res.row) ? 'on' : 'off';
  else if (res && res.none) _viPlanState = 'off';                                            // signed in, and the server holds no plan for this account
  else if (res && res.auth) { if (_viPlanState !== 'on') _viPlanState = 'signin'; }
  else if (_viPlanState !== 'on') _viPlanState = 'unreachable';                              // no answer: only a "no" from the server closes an open app
  _viPlanAt = Date.now();
  viPlanGate();
}
function viPlanReset() { if (_viPlanStub()) return; _viPlanState = 'unknown'; _viPlanAt = 0; viPlanGate(); }   // another person signed in on this page
function viPlanNoSession() {   // the app looked for a sign-in and supabase-js has none (or is not answering)
  if (_viPlanStub() || _viPlanState === 'on') return;
  if (_viPlanUid()) { viPlanCheck(); return; }
  _viPlanState = 'signin'; _viPlanAt = Date.now(); viPlanGate();
}
// ask the server. One question at a time; resolves to the state.
function viPlanCheck() {
  var stub = _viPlanStub();
  if (stub) { _viPlanState = stub; _viPlanAt = Date.now(); viPlanGate(); return Promise.resolve(_viPlanState); }
  if (_viPlanBusy) return _viPlanBusy;
  var uid = _viPlanUid();
  if (!uid) return Promise.resolve(_viPlanState);                                            // the sign-in is still being looked up (viPlanNoSession follows if there is none)
  _viPlanBusy = Promise.resolve().then(function () { return _syncPioneerFromProfile(uid); }).then(function () {}, function () { viPlanAnswer(uid, null); })
    .then(function () { _viPlanBusy = null; return _viPlanState; });
  return _viPlanBusy;
}
// run fn once the app itself is on screen (straight away when there is no wall)
function viWhenOpen(fn) { if (!viWallApplies() || _viPlanState === 'on') { try { fn(); } catch (e) {} } else _viPlanQueue.push(fn); }

// show or hide the wall for the state. Safe to call at any time, from anywhere.
function viPlanGate() {
  var wall = document.getElementById('plan-wall'), root = document.documentElement; if (!wall) return;
  if (_viPlanStub() === 'on') _viPlanState = 'on';
  var need = viWallApplies() && _viPlanState !== 'on', show = need && !_viWallBlocked();
  if (root.classList.contains('vi-walled') !== show) {
    root.classList.toggle('vi-walled', show);
    if (show) { try { if (document.activeElement && !wall.contains(document.activeElement)) wall.focus({ preventScroll: true }); } catch (e) {} }
  }
  if (!need) {
    clearTimeout(_viPlanTimer); _viPlanTimer = null;
    var q = _viPlanQueue; _viPlanQueue = []; q.forEach(function (fn) { try { fn(); } catch (e) {} });
    return;
  }
  if (_viPlanState === 'unknown') viPlanCheck();                                             // also while the questions are up, so the answer is ready when they end
  if (!show) return;
  var view = _viPlanState === 'off' ? 'plans' : _viPlanState === 'unreachable' ? 'offline' : _viPlanState === 'signin' ? 'signin' : 'checking';
  if (wall.getAttribute('data-state') !== view) { wall.setAttribute('data-state', view); wall.scrollTop = 0; _viWallSay(''); }
  viWallPaint();
  if (_viPlanState === 'unknown' && !_viPlanTimer) _viPlanTimer = setTimeout(function () {    // no answer in good time: say so instead of spinning
    _viPlanTimer = null; if (_viPlanState !== 'unknown') return;
    _viPlanState = _viPlanUid() ? 'unreachable' : 'signin'; viPlanGate();
  }, VI_PLAN_PATIENCE_MS);
}
function _viWallSay(msg) { var st = document.getElementById('wall-status'); if (st) st.textContent = msg || ''; }
// names, prices, terms and buttons from the one source (VI_PLANS); who is signed in
function viWallPaint() {
  try { viPricePaint(); } catch (e) {}
  try {
    [].forEach.call(document.querySelectorAll('#plan-wall [data-plan-name]'), function (el) { var P = VI_PLANS[el.getAttribute('data-plan-name')]; if (P) el.textContent = P.name; });
    var lead = document.getElementById('wall-lead'), M = VI_PLANS.monthly;
    if (lead) lead.textContent = (viPlanTrial('monthly') && viPlanTrial('annual'))
      ? 'The monthly and yearly plans are free for ' + M.trialDays + ' days. Your card is taken at checkout and first charged on day ' + (M.trialDays + 1) + '. Cancel before then and you pay nothing.'
      : 'Every plan opens the whole app. You pay at checkout.';
    var who = document.getElementById('wall-who'), s = JSON.parse(localStorage.getItem('vi_session') || 'null');
    if (who) who.textContent = s && s.email ? 'Signed in as ' + s.email : '';
  } catch (e) {}
}
function viWallChoose(plan) {
  showUpgrade(plan);
  _viWallSay('The checkout has opened in a new tab. When you have paid, come back here: your vault opens once the payment reaches us.');
}
async function viWallCheck(btn) {
  var label = btn ? btn.textContent : ''; if (btn) { btn.disabled = true; btn.textContent = 'Checking…'; }
  _viWallSay('');
  try { await viPlanCheck(); } catch (e) {}
  if (btn) { btn.disabled = false; btn.textContent = label; }
  if (_viPlanState === 'off') _viWallSay('There is no plan on this account yet. If you have just paid, give it a minute and check again. Questions: ' + VI_CANCEL_EMAIL);
  else if (_viPlanState === 'unreachable') _viWallSay('Still no answer from the server. Check your connection and try again.');
}
async function viWallExport(btn) {
  var label = btn.textContent; btn.disabled = true; btn.textContent = 'Preparing your data…';
  var b = null; try { b = await exportMyData(true); } catch (e) {}
  btn.disabled = false; btn.textContent = label;
  _viWallSay(!b ? 'Could not prepare your data. Try again.' : b.problems.length ? 'Downloaded, with a note inside the file: ' + b.problems.join(' · ') : 'Downloaded. Check your Downloads folder.');
}
function viWallHelp() { try { viHelpOpen('faq'); } catch (e) { _viWallSay('Questions: ' + VI_CANCEL_EMAIL); } }
function viWallSignIn() { try { viReauth(); } catch (e) {} }

// the server is asked again when the person comes back to the page (they may have just paid in another tab, or a plan may have ended)
function _viPlanRecheck() {
  try {
    if (document.visibilityState === 'hidden' || !viWallApplies() || _viPlanBusy) return;
    var age = Date.now() - _viPlanAt;
    if (_viPlanState === 'on' ? age > VI_PLAN_RECHECK_MS : (_viPlanState !== 'unknown' && age > 4000)) viPlanCheck();
  } catch (e) {}
}
function viPlanBoot() {
  try {
    var mo = new MutationObserver(function () { viPlanGate(); });
    ['login-overlay', 'welcome-overlay'].forEach(function (id) { var el = document.getElementById(id); if (el) mo.observe(el, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] }); });
    mo.observe(document.head, { childList: true });   // the pre-paint style that hides the sign-in screen
  } catch (e) {}
  document.addEventListener('visibilitychange', _viPlanRecheck);
  window.addEventListener('focus', _viPlanRecheck);
  window.addEventListener('online', _viPlanRecheck);
  window.addEventListener('pageshow', _viPlanRecheck);
  viPlanGate();
}
