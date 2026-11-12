// ═══════════════════════════════════════════════════════════════
// PIONEER / PAYWALL
// ═══════════════════════════════════════════════════════════════
var _STRIPE_MONTHLY='https://buy.stripe.com/4gM9AN3D0gvv5yR7SS2VG00';
var _STRIPE_ANNUAL ='';   // see VI_STRIPE_LINKS.annual (the old annual link is retired)
// the old item caps (3 assets, 2 liabilities, 1 debt) went on 31 Oct 2026: every plan tracks as many as it likes

function isPioneer(){return localStorage.getItem('vi_pioneer')==='true';}

// ─── ON A PLAN, OR THE WALL (owner, 12 Nov 2026: "Card required", "Card wall for everyone") ───
// The free month with no card is over for everyone. An account is on a plan and the app is open, or it is not and the card
// wall covers the app (paywall/plan-wall.js). There is no trial clock, no countdown and no half-open vault any more. A plan that
// ends or fails to renew goes back to the wall; the figures stay on the device and in the account, and Download my data works from
// the wall. The only free period left is Stripe's: the card is taken at checkout and first charged on day 31.
// viPaid(): this device's mirror of the server's record (viPaidApply in auth/sync.js), for labels and allowances. It opens nothing.
function viPaid() { if (isPioneer() || isFounder()) return true; try { var u = JSON.parse(localStorage.getItem('vi_user') || 'null'); return !!(u && u.pro); } catch (e) { return false; } }
// Day 1 is the account's first day. Only the tester check-in questions and the feedback report use it (feedback/feedback.js).
// It counts from the account's creation date (kept in vi_trial_t0, a local key from before the card wall, for loads before sign-in
// completes), and never from before VI_DAY_EPOCH, so the check-ins of accounts older than that stay where they were.
var VI_DAY_EPOCH = Date.parse('2026-11-01T00:00:00Z');
function viAccountDay() {
  var t = 0;
  try { if (typeof _supaUser !== 'undefined' && _supaUser && _supaUser.created_at) t = Date.parse(_supaUser.created_at) || 0; } catch (e) {}
  try {
    if (t) localStorage.setItem('vi_trial_t0', String(t));
    else { t = parseInt(localStorage.getItem('vi_trial_t0') || '0', 10) || 0; if (!t) { t = Date.now(); localStorage.setItem('vi_trial_t0', String(t)); } }
  } catch (e) { if (!t) t = Date.now(); }
  return Math.max(1, Math.floor((Date.now() - Math.max(t, VI_DAY_EPOCH)) / 86400000) + 1);
}
// viPlan: 'monthly' | 'yearly' | 'founder' | null (a paid account with no plan recorded is an earlier buyer and counts as yearly).
// viTier: the plan of an account on one, 'none' otherwise (the sample, or before the server has answered).
// viCan(feature): the design tools ('design' = upload your own 3D house, 'aimodel' = generate one with AI) need a plan.
function viPlan() { try { var p = localStorage.getItem('vi_plan'); return (p === 'monthly' || p === 'yearly' || p === 'founder') ? p : null; } catch (e) { return null; } }
function viTier() { if (!viPaid()) return 'none'; if (isFounder()) return 'founder'; return viPlan() || 'yearly'; }
function viCan(f) { if (f === 'design' || f === 'aimodel') return viPaid(); return true; }
// the AI screenshot reader's monthly allowance, as the server applies it (supabase/functions/portfolio-vision): 3 with no plan, 30 Pioneer, 10 Lifetime
function viShotAllowance() { var t = viTier(); return t === 'founder' ? '10 screenshot reads a month' : (t === 'monthly' || t === 'yearly') ? '30 screenshot reads a month' : '3 screenshot reads a month (30 on Pioneer)'; }
// a design tool: true (and it says why) when this account may not use it
function viGateDesign(f) {
  if (viBlockEdit()) return true;
  if (viCan(f)) return false;
  try { showToast(f === 'aimodel' ? 'Generating a house with AI needs a plan: Pioneer (monthly or yearly) or a Lifetime licence.' : 'Uploading your own 3D house needs a plan: Pioneer (monthly or yearly) or a Lifetime licence.'); } catch (e) {}
  return true;
}
// The first line of every add / edit / delete handler. The card wall already keeps an account without a plan away from every
// handler; this is the second lock behind it: while the wall is up, nothing is added, changed or deleted.
function viBlockEdit() {
  try { if (typeof viWallUp === 'function' && viWallUp()) { viPlanGate(); return true; } } catch (e) {}
  return false;
}
// the tester welcome note: once per device, after the welcome flow, for beta accounts (every account while the app is in beta)
function viTesterWelcome() {
  try { if (localStorage.getItem('vi_tester_note')) return false; if (typeof viBetaTester === 'function' && !viBetaTester()) return false; } catch (e) { return false; }
  var m = document.getElementById('tester-welcome'); if (!m) return false;
  m.classList.remove('hidden');
  try { localStorage.setItem('vi_tester_note', new Date().toISOString()); } catch (e) {}
  setTimeout(function () { var g = m.querySelector('.tw-go'); if (g) try { g.focus(); } catch (e) {} }, 50);
  return true;
}
function viTesterWelcomeClose() { var m = document.getElementById('tester-welcome'); if (m) m.classList.add('hidden'); }

function showPaywall(feature){
  var msgs={
    assets:      'Every plan tracks as many assets as you like.',
    export:      'Download my data is in every plan.'
  };
  var msg=document.getElementById('paywall-feature-msg');
  if(msg)msg.textContent=msgs[feature]||'🔒 This needs a paid plan.';
  var modal=document.getElementById('paywall-modal');
  try{viPricePaint();}catch(e){}
  if(modal)modal.style.display='flex';
}


// every pop-up can be left: tap outside it, or press Esc
document.addEventListener('click',function(e){
  var t=e.target;if(!t||!t.classList)return;
  if(t.classList.contains('vi-modal-overlay')&&t.id!=='login-overlay')t.classList.add('hidden');
});
document.addEventListener('keydown',function(e){
  if(e.key!=='Escape')return;
  var ov=[].slice.call(document.querySelectorAll('.vi-modal-overlay:not(.hidden)')).pop();
  if(ov){ov.classList.add('hidden');return;}
  var pw=document.getElementById('paywall-modal');if(pw&&pw.style.display!=='none'&&pw.style.display!==''){closePaywall();return;}
  ['hbu-ov','hbc-ov','cc-ov'].forEach(function(id){var o=document.getElementById(id);if(o)o.remove();});
});
