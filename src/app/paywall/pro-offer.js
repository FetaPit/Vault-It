// ══════════════════════════════════════════════════════════════
// VISIT COUNTER (the plans prompt that lived here went with the in-app trial)
// ══════════════════════════════════════════════════════════════

function initProOffer() {
  // The plans prompt went with the in-app trial (card wall, 12 Nov 2026): an account without a plan meets the wall instead.
  // What is left here is the visit counter kept on the profile.
  try {
    var user = JSON.parse(localStorage.getItem('vi_user') || 'null');
    if (user) { user.logins = (user.logins || 0) + 1; localStorage.setItem('vi_user', JSON.stringify(user)); }
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

