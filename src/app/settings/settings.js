// ── TASK 4: EMAIL CAPTURE ────────────────────────────────────────
function captureEmailToList(email, name, goal) {
  if (!email || !email.includes('@')) return;
  var formId = localStorage.getItem('convertkit_form_id') || '';
  var apiKey = localStorage.getItem('convertkit_api_key') || '';
  if (!formId) return; // silently skip until user configures in Settings
  var payload = { api_key: apiKey, email_address: email, first_name: name || '', fields: { goal: ['debt','savings','deposit','wealth'][goal] || 'unknown', source: 'vault-it-pioneer', joined: new Date().toISOString() } };
  fetch('https://api.convertkit.com/v3/forms/' + formId + '/subscribe', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  }).then(function(r){ if(r.ok) console.log('[Vault-It] Pioneer email captured'); })
    .catch(function(e){ console.log('[Vault-It] Email capture failed silently:', e.message); });
  // Also sync to Notion
  var u = null; try { u = JSON.parse(localStorage.getItem('vi_user')||'null'); } catch(e){}
  if (u && u.email) syncToNotion(Object.assign({}, u, { goal: goal }), 'Welcome Quiz');
}
function captureEmailMailchimp(email, name, goal) {
  // Mailchimp replaced by ConvertKit — captureEmailToList() handles all list sign-ups
}

// ── TASK 2: VI SETTINGS ──────────────────────────────────────────
var viSettings = {};
function loadViSettings() {
  try {
    viSettings = Object.assign(
      { fontSize:'normal', contrast:'standard', motion:'full', currency:'GBP', compactNav:false },
      JSON.parse(localStorage.getItem('vi_settings') || '{}')
    );
  } catch(e) {}
  applyViSettings();
}
function saveViSettings() {
  localStorage.setItem('vi_settings', JSON.stringify(viSettings));
}
// Simplified / Advanced view (owner, 31 Oct; decision doc section 8). Stored in vi_settings, so it follows the account to every
// device. An account with no choice saved (everyone before this change) stays Advanced; the welcome flow starts new accounts Simplified.
function viSimple() { return !!(viSettings && viSettings.view === 'simple'); }
function viSetView(v) { viSettings.view = v === 'adv' ? 'adv' : 'simple'; saveViSettings(); applyViSettings(); }
var _wView = 'simple';
function wPickView(v, btn) {
  _wView = v === 'adv' ? 'adv' : 'simple';
  document.querySelectorAll('.w-view-opt').forEach(function (b) { var on = b.getAttribute('data-v') === _wView; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
}
// the Overview achievements card: level, XP to the next level, streak and the badges earned so far
function renderOvAch() {
  var el = document.getElementById('ov-ach-body'); if (!el || typeof achState === 'undefined' || typeof wrLevel !== 'function') return;
  var xp = wrTotalXp(), lv = wrLevel(xp), nx = wrNextLevel(xp), rk = WR_RANKS[lv.rank];
  var pc = nx ? Math.max(0, Math.min(100, (xp - lv.xp) / (nx.xp - lv.xp) * 100)) : 100;
  var got = BADGES.filter(function (b) { return (achState.unlocked || []).indexOf(b.id) > -1; });
  var streak = +(achState.streak || localStorage.getItem('vi_streak') || 0);
  el.innerHTML = '<div class="ov-ach-top"><span class="ov-ach-tok">' + wrTokSvg({ tier: rk.t, st: 'done', bars: 8, lit: Math.floor(pc / 12.5), num: lv.n }, 48, 'Level ' + lv.n) + '</span><div class="ov-ach-meta"><b>' + lv.name + '</b>'
    + '<div class="ov-ach-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(pc) + '"><i style="width:' + pc.toFixed(1) + '%"></i></div>'
    + '<small>' + xp.toLocaleString('en-GB') + ' XP' + (nx ? ' · ' + (nx.xp - xp).toLocaleString('en-GB') + ' to ' + nx.name : ' · top level') + '</small></div>'
    + '<div class="ov-ach-streak"><b>' + streak + '</b><small>day' + (streak === 1 ? '' : 's') + ' in a row</small></div></div>'
    + '<div class="ov-ach-badges">' + (got.length ? got.slice(-8).map(function (b) { return '<span class="ov-ach-badge" title="' + b.name.replace(/"/g, '&quot;') + '">' + wrTokSvg({ tier: wrXpTier(b.xp || 50), st: 'own', ic: WR_BADGE_IC[b.id] || 'vi-gem' }, 40, b.name) + '</span>'; }).join('')
      : '<span class="ov-ach-none">No badges yet. Your first one comes with your first deposit or your first budget line.</span>')
    + '<span class="ov-ach-count">' + got.length + ' of ' + BADGES.length + ' badges</span></div>';
}
function setSetting(key, val, btn) {
  viSettings[key] = val;
  saveViSettings();
  if (btn && btn.parentElement) {
    btn.parentElement.querySelectorAll('button').forEach(function(b){ b.classList.remove('active'); });
    btn.classList.add('active');
  }
  applyViSettings();
  if (key === 'currency') {
    window.VI_CURRENCY = val;
    if (typeof _applyCurrency === 'function') _applyCurrency();
  }
}
function applyViSettings() {
  var root = document.documentElement;
  var sizes = { small:'11px', normal:'13px', large:'15px', xl:'17px' };
  root.style.fontSize = '';
  root.style.setProperty('--vi-base', sizes[viSettings.fontSize] || '13px');
  if (viSettings.contrast === 'high') {
    root.style.setProperty('--t2','var(--text)');   // high contrast works in Night and Daylight
    root.style.setProperty('--t3','var(--muted)');
    root.style.setProperty('--bd','rgb(var(--teal-rgb) / .3)');
  } else {
    root.style.removeProperty('--t2');
    root.style.removeProperty('--t3');
    root.style.removeProperty('--bd');
  }
  if (viSettings.motion === 'reduced') {
    root.style.setProperty('--transition-speed','0ms');
    document.body.classList.add('reduced-motion');
  } else {
    root.style.removeProperty('--transition-speed');
    document.body.classList.remove('reduced-motion');
  }
  var nav = document.getElementById('topnav');
  if (nav) nav.classList.remove('compact-nav');   // owner, 31 Oct: the width decides, not a setting
  document.body.classList.toggle('vi-simple', viSimple());
  try { if (typeof bdRenderLists === 'function' && document.getElementById('cf-expense-list')) bdRenderLists(); } catch (e) {}   // folding follows the view
  try { renderOvAch(); } catch (e) {}
  try { if (viSimple() && /^(achievements|biz)$/.test((document.querySelector('.tab-panel.active') || {}).id ? document.querySelector('.tab-panel.active').id.replace('tab-', '') : '')) showTab('overview'); } catch (e) {}
  window.VI_CURRENCY = viSettings.currency || 'GBP';
  if (typeof _applyCurrency === 'function') _applyCurrency();
  if (typeof fetchExchangeRates === 'function') setTimeout(fetchExchangeRates, 800);
}

// ── TASK 7: PROGRESSIVE NAV ──────────────────────────────────────
function applyProgressiveNav() {
  var hasCompletedWelcome = !!localStorage.getItem('vi_user');
  var isDemoOrData = !!localStorage.getItem('pos_ov1') || localStorage.getItem('vi_demo_mode') === 'true';
  var show = hasCompletedWelcome || isDemoOrData;
  ['assets','biz','connections'].forEach(function(tab) {
    var btns = document.querySelectorAll('[onclick*="showTab(\'' + tab + '\')"], [onclick*=\'showTab("' + tab + '"\']');
    btns.forEach(function(btn) {
      btn.style.opacity = show ? '' : '0.35';
      btn.title = show ? '' : 'Complete your profile first';
    });
  });
}

// ── TASK 6: STREAK CHECK ─────────────────────────────────────────
function checkStreak() {
  var today = new Date().toDateString();
  var last  = localStorage.getItem('vi_last_visit');
  var streak = parseInt(localStorage.getItem('vi_streak') || '0');
  var yesterday = new Date(Date.now() - 86400000).toDateString();
  if (last === today) return;
  if (last === yesterday) { streak++; }
  else { streak = 1; }
  localStorage.setItem('vi_last_visit', today);
  localStorage.setItem('vi_streak', String(streak));
  if (typeof achState !== 'undefined' && achState) {
    achState.streak = streak;
    // days of use for the free month (owner, 3 Nov: 30 different days): one per calendar day, kept in the synced record so two devices on the same day count once (Pedro, 3 Nov)
    var _w = achState.wr || (achState.wr = { s: {}, q: {}, m: {}, days: 0 }), _d = new Date(), _iso = _d.getFullYear() + '-' + String(_d.getMonth() + 1).padStart(2, '0') + '-' + String(_d.getDate()).padStart(2, '0');
    if (_w.last !== _iso) { _w.days = (_w.days || 0) + 1; _w.last = _iso; }
    if (typeof saveAch === 'function') saveAch();
  }
}

