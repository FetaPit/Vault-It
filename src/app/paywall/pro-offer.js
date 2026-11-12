// ══════════════════════════════════════════════════════════════
// PRO OFFER SYSTEM
// Shows on every login. Discount increases to 40% after 30 days.
// ══════════════════════════════════════════════════════════════

function initProOffer() {
  // Trial then paid (31 Oct): the 30 days carry no upgrade pop-up (the banner counts the days). Once they are up, the plans
  // prompt shows once a day on open, and whenever an edit is tried. Paid accounts never see it.
  try {
    var user = JSON.parse(localStorage.getItem('vi_user') || 'null');
    if (user) { user.logins = (user.logins || 0) + 1; localStorage.setItem('vi_user', JSON.stringify(user)); }
    if (viTrialState() !== 'ended') return;
    if (localStorage.getItem('vi_trial_prompt') === new Date().toDateString()) return;
    setTimeout(function () { if (viTrialState() === 'ended') viShowTrialEnd('open'); }, 1500);   // after the app has loaded
  } catch(e) {}
}

// Gentle paywall nudge for tabs — called when user taps gated tab
function gateNudge(tabName, features) {
  showToast('🔒 ' + tabName + ' · ' + features + ' · Tap to unlock Pro');
  // Pulse the pro badge in nav if present
  var badges = document.querySelectorAll('.pro-badge');
  badges.forEach(function(b) {
    b.style.animation = 'none';
    setTimeout(function() { b.style.animation = 'proFlash .6s 3'; }, 10);
  });
}

