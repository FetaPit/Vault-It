// ═══════════════════════════════════════════════════════════════
// PIONEER / PAYWALL
// ═══════════════════════════════════════════════════════════════
var _STRIPE_MONTHLY='https://buy.stripe.com/4gM9AN3D0gvv5yR7SS2VG00';
var _STRIPE_ANNUAL ='';   // see VI_STRIPE_LINKS.annual (the old annual link is retired)
// the old item caps (3 assets, 2 liabilities, 1 debt) went on 31 Oct 2026: every plan tracks as many as it likes

function isPioneer(){return localStorage.getItem('vi_pioneer')==='true';}

// ─── TRIAL THEN PAID (owner, 31 Oct 2026; docs/MONETISATION_DECISION.md sections 7 and 8) ───
// Everyone gets 30 days of the full app, no card. The clock starts at the account's creation date (set by the server at the first
// sign-in, so clearing a device cannot restart it), or on a device that has never signed in at its first run, and never before
// VI_TRIAL_EPOCH, so accounts that existed before the trial went live get their full 30 days from that date. When the days are up
// the vault turns read-only: every tab opens, every number shows, the cloud copy and Download my data keep working; adding,
// editing and deleting wait for a plan. Paid accounts (Pioneer, monthly or yearly, or Lifetime licence) never see any of this.
var VI_TRIAL_DAYS = 30, VI_TRIAL_EPOCH = Date.parse('2026-11-01T00:00:00Z');
function viPaid() { if (isPioneer() || isFounder()) return true; try { var u = JSON.parse(localStorage.getItem('vi_user') || 'null'); return !!(u && u.pro); } catch (e) { return false; } }
function viTrialStart() {
  var t = 0;
  try { if (typeof _supaUser !== 'undefined' && _supaUser && _supaUser.created_at) t = Date.parse(_supaUser.created_at) || 0; } catch (e) {}
  try {
    if (t) localStorage.setItem('vi_trial_t0', String(t));   // a local-only key (not synced): the last known account date, for loads before sign-in completes
    else { t = parseInt(localStorage.getItem('vi_trial_t0') || '0', 10) || 0; if (!t) { t = Date.now(); localStorage.setItem('vi_trial_t0', String(t)); } }
  } catch (e) { if (!t) t = Date.now(); }
  return Math.max(t, VI_TRIAL_EPOCH);
}
function viTrialDay() { return Math.max(1, Math.floor((Date.now() - viTrialStart()) / 86400000) + 1); }   // day 1 is the first day
function viTrialDaysLeft() { return Math.max(0, VI_TRIAL_DAYS - viTrialDay() + 1); }                       // 30 on day 1, 1 on day 30, 0 after
function viTrialState() { return viPaid() ? 'paid' : viTrialDaysLeft() > 0 ? 'trial' : 'ended'; }
function viCanEdit() { return viTrialState() !== 'ended'; }
// Tiers (owner, 31 Oct, decision doc section 10). viPlan: 'monthly' | 'yearly' | 'founder' | null (a paid account with no plan recorded
// is an earlier buyer and counts as paid in full). viTier: 'trial' | 'ended' | 'monthly' | 'yearly' | 'founder'. viCan(feature): the
// only paid-only features are the design tools ('design' = upload your own 3D house, 'aimodel' = generate one with AI), which need a
// paid plan even during the trial; everything else is open to every state, read-only once the trial has ended.
function viPlan() { try { var p = localStorage.getItem('vi_plan'); return (p === 'monthly' || p === 'yearly' || p === 'founder') ? p : null; } catch (e) { return null; } }
function viTier() { var st = viTrialState(); if (st !== 'paid') return st; if (isFounder()) return 'founder'; return viPlan() || 'yearly'; }
function viCan(f) { if (f === 'design' || f === 'aimodel') return viPaid(); return true; }
// the AI screenshot reader's monthly allowance, as the server applies it (supabase/functions/portfolio-vision): 3 unpaid, 30 Pioneer, 10 Founding
function viShotAllowance() { var t = viTier(); return t === 'founder' ? '10 screenshot reads a month' : (t === 'monthly' || t === 'yearly') ? '30 screenshot reads a month' : '3 screenshot reads a month (30 on Pioneer)'; }
// a paid-only design tool: true (and the plans prompt shows) when this account may not use it yet
function viGateDesign(f) {
  if (viBlockEdit()) return true;
  if (viCan(f)) return false;
  try { showToast(f === 'aimodel' ? 'Generating a house with AI needs a paid plan: Pioneer (monthly or yearly) or a Lifetime licence.' : 'Uploading your own 3D house needs a paid plan: Pioneer (monthly or yearly) or a Lifetime licence.'); } catch (e) {}
  viShowTrialEnd('design');
  return true;
}
// the first line of every add / edit / delete handler: true (and the plans prompt shows) while the vault is read-only
function viBlockEdit() {
  if (viCanEdit()) return false;
  try { showToast('Your 30 days are up: the vault is read-only until you pick a plan.'); } catch (e) {}
  viShowTrialEnd('edit');
  return true;
}
// the plans prompt: the subscription pop-up with trial wording, Lifetime licence first (testers first, as agreed), no free column
function viShowTrialEnd(reason) {
  var modal = document.getElementById('pro-offer-modal'); if (!modal) return;
  var ended = viTrialState() === 'ended', left = viTrialDaysLeft();
  var set = function (id, txt) { var el = document.getElementById(id); if (el) el.textContent = txt; };
  set('offer-badge', ended ? 'YOUR 30 DAYS ARE UP' : left + (left === 1 ? ' DAY LEFT' : ' DAYS LEFT'));
  set('offer-headline', ended ? 'Pick a plan to keep editing.' : 'Pick a plan before your 30 days end.');
  set('offer-body', ended ? 'Everything you entered is safe and still here to read. Choose a plan to carry on adding and editing.'
                          : 'Your numbers stay yours either way. After day 30 the vault turns read-only until you choose a plan.');
  viPricePaint();
  var ghost = document.getElementById('offer-ghost'); if (ghost) ghost.textContent = ended ? 'Keep reading only' : 'Not now';
  modal.classList.toggle('vi-trial-end', ended); modal.classList.remove('hidden');   // once the days are up, the Lifetime licence leads
  if (reason === 'open') { try { localStorage.setItem('vi_trial_prompt', new Date().toDateString()); } catch (e) {} }
}
// one fixed line at the foot of the page: week-one nudges (the next core task), the countdown from day 23, read-only after day 30
function viTrialBanner() {
  var bn = document.getElementById('trial-banner');
  var hide = function () { if (bn) bn.remove(); };
  var st = viTrialState(); if (st === 'paid') return hide();
  var busy = ['welcome-overlay', 'login-overlay'].some(function (id) { var el = document.getElementById(id); return !!(el && getComputedStyle(el).display !== 'none'); });
  if (busy) return hide();
  var day = viTrialDay(), left = viTrialDaysLeft(), today = new Date().toDateString(), msg, btn, act, kind, tone;
  if (st === 'ended') { kind = 'ended'; tone = 'warn'; msg = 'Your 30 days are up. The vault is read-only until you pick a plan.'; btn = 'See plans'; act = "viShowTrialEnd('banner')"; }
  else if (left <= 7) { kind = 'd' + day; tone = 'warn'; msg = left + (left === 1 ? ' day' : ' days') + ' left of your free 30. Pick a plan to keep editing after that.'; btn = 'See plans'; act = "viShowTrialEnd('banner')"; }
  else if (day <= 7) {
    var next = getCoreTaskStatus().filter(function (t) { return !t.done; })[0]; if (!next) return hide();
    kind = 'd' + day; tone = 'nudge'; msg = 'Day ' + day + ' of your free 30 · next: ' + next.label.charAt(0).toLowerCase() + next.label.slice(1); btn = 'Do it'; act = "viTrialDismiss();showTab('" + next.tab + "')";
  } else return hide();
  if (localStorage.getItem('vi_trial_nudge') === today + ':' + kind) return hide();
  if (!bn) { bn = document.createElement('div'); bn.id = 'trial-banner'; bn.setAttribute('role', 'status'); document.body.appendChild(bn); }
  bn.className = 'trial-' + tone; bn.dataset.kind = kind;
  bn.innerHTML = '<span class="trial-msg">' + msg + '</span><button class="btn-add-data" onclick="' + act + '">' + btn + '</button>'
    + '<button class="trial-x" onclick="viTrialDismiss()" aria-label="Dismiss">✕</button>';
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
function viTrialDismiss() { var bn = document.getElementById('trial-banner'); try { localStorage.setItem('vi_trial_nudge', new Date().toDateString() + ':' + (bn ? bn.dataset.kind : '')); } catch (e) {} if (bn) bn.remove(); }
function viTrialRefresh() { try { viTrialBanner(); } catch (e) {} try { _refreshPioneerSettingsUI(); } catch (e) {} }
function viTrialBoot() { setTimeout(viTrialRefresh, 1200); setTimeout(viTrialRefresh, 6000); }   // after the overlays have decided whether to show

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
