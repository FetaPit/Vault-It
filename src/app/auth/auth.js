// ─────────────────────────────────────────────────────────────

function _hashStr(str) {
  var h = 0;
  for (var i = 0; i < str.length; i++) { h = Math.imul(31, h) + str.charCodeAt(i) | 0; }
  return (h >>> 0).toString(36);
}

function hasValidSession() {
  try {
    var s = JSON.parse(localStorage.getItem('vi_session') || 'null');
    return !!(s && s.expiry > Date.now() && s.email);
  } catch(e) { return false; }
}

var _sjsStalled = false;
// Cloudflare Turnstile ("are you human") in front of the sign-in e-mail. The site key is public; leave it empty to switch the widget off.
// The widget only works on the sites the key was created for, so it is only used there; elsewhere (previews, local files) it stays off.
var VI_TURNSTILE_SITEKEY = (typeof window.__VI_TS_KEY === 'string') ? window.__VI_TS_KEY : '0x4AAAAAAFoY-niKQ_Wu-1YM';   // public key of the "Vault-It sign-in" widget (the override is for tests)
var VI_TURNSTILE_HOSTS = ['app.vault-it.co', 'fetapit.github.io'];
var _captchaToken = '', _captchaWidget = null, _captchaLoadFailed = false, _captchaWaitMsg = false;
function viCaptchaOn() { return !!VI_TURNSTILE_SITEKEY && (VI_TURNSTILE_HOSTS.indexOf(location.hostname) > -1 || window.__vi_captcha_force === true); }
var _SUPA_URL = 'https://legpubblzgknxdtvsant.supabase.co', _SUPA_KEY = 'sb_publishable_AZguCFDmQPTnXxwG7CCIXQ_cT3iIWtz';
function _withTimeout(p, ms, fallback) {
  return Promise.race([p, new Promise(function(res) { setTimeout(function() { res(fallback); }, ms); })]);
}
function _localAccessToken() {
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (/^sb-.+-auth-token$/.test(k)) { var v = JSON.parse(localStorage.getItem(k) || 'null'); if (v && v.access_token) return v.access_token; }
    }
  } catch (e) {}
  return null;
}
// The direct (no supabase-js) path must renew the session itself: on a phone a frozen tab can leave supabase-js stalled,
// and its access token expires after an hour — every read and write was then refused with 401 while the app still looked signed in.
function _localSessionKey() {
  try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (/^sb-.+-auth-token$/.test(k)) return k; } } catch (e) {}
  return null;
}
function _tokenExpiresSoon(tok) {   // true when the JWT has expired or will within a minute (unreadable → assume fine; the server decides)
  try { var p = JSON.parse(atob(tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); return !!p.exp && p.exp * 1000 < Date.now() + 60000; } catch (e) { return false; }
}
var _directRefreshP = null;   // one renewal at a time: a refresh token works once, so two parallel renewals would log the user out
function _directRefresh() {
  if (_directRefreshP) return _directRefreshP;
  _directRefreshP = (async function() {
    try {
      var k = _localSessionKey(); if (!k) return null;
      var s = JSON.parse(localStorage.getItem(k) || 'null'); if (!s || !s.refresh_token) return null;
      var ctl = new AbortController(), t = setTimeout(function() { ctl.abort(); }, 10000);
      var res = await fetch(_SUPA_URL + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', signal: ctl.signal,
        headers: { 'content-type': 'application/json', apikey: _SUPA_KEY }, body: JSON.stringify({ refresh_token: s.refresh_token }) });
      clearTimeout(t);
      if (!res.ok) { if (res.status === 400 || res.status === 401) _viSessionExpired(); return null; }   // refused (not a network blip): the sign-in is over
      var n = await res.json(); if (!n || !n.access_token || !n.refresh_token) return null;
      var merged = Object.assign({}, s, n); if (!merged.expires_at && n.expires_in) merged.expires_at = Math.floor(Date.now() / 1000) + n.expires_in;
      _lsOrig.call(localStorage, k, JSON.stringify(merged));   // same place supabase-js keeps it, so both stay on the new pair
      return n.access_token;
    } catch (e) { return null; } finally { setTimeout(function() { _directRefreshP = null; }, 0); }
  })();
  return _directRefreshP;
}
// The saved sign-in can no longer be renewed (e.g. weeks away, or signed out elsewhere): say so and offer to sign in again,
// instead of looking signed in while nothing uploads. Nothing on this device is touched.
function _viSessionExpired() {
  if (document.getElementById('session-banner')) return;
  var bn = document.createElement('div'); bn.id = 'session-banner';
  bn.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:10002;background:var(--panel);border:1px solid #e0b44a;color:#f3d58a;border-radius:10px;padding:10px 12px;font-size:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap';
  bn.innerHTML = '<span style="flex:1;min-width:200px">⚠ Your sign-in has expired, so changes on this device are not being backed up. Sign in again. Nothing on this device is lost.</span><button class="btn-add-data" id="session-banner-btn">Sign in again</button>';
  document.body.appendChild(bn);
  document.getElementById('session-banner-btn').onclick = function() { bn.remove(); viReauth(); };
}
async function _freshAccessToken() {   // the saved token, renewed first if it has expired
  var tok = _localAccessToken();
  if (tok && _tokenExpiresSoon(tok)) tok = (await _directRefresh()) || tok;
  return tok;
}
// Call an edge function without ever hanging the UI: supabase-js first (8 s), then a direct request.
// (supabase-js waits on its own auth lock before every call, so one stalled refresh can freeze it.)
async function _fnInvoke(name, body, ms, direct, once) {   // once: if supabase-js is slow, report a timeout instead of sending the same request a second time
  if (!_supaClient) { try { _initSupabase(); } catch (e) {} }
  var tok = null;
  if (direct) {   // one-shot, costs money: never send it twice — go straight out with the user's own token
    try { var g = _supaClient && await _withTimeout(_supaClient.auth.getSession(), 3000, null); tok = g && g.data && g.data.session && g.data.session.access_token; } catch (e) {}
  }
  if (_supaClient && !direct && !_sjsStalled) {
    var r = await _withTimeout(_supaClient.functions.invoke(name, { body: body }).catch(function(e) { return { data: null, error: e }; }), ms || 8000, null);
    if (r) return r;
    if (once) return { data: null, error: { message: 'timeout' } };
    _sjsStalled = true;   // supabase-js is not answering: go direct from now on
  }
  try {
    var ctl = new AbortController(), t = setTimeout(function() { ctl.abort(); }, direct ? (ms || 45000) : 15000);
    var res = await fetch(_SUPA_URL + '/functions/v1/' + name, {
      method: 'POST', signal: ctl.signal,
      headers: { 'content-type': 'application/json', apikey: _SUPA_KEY, authorization: 'Bearer ' + (tok || (await _freshAccessToken()) || _SUPA_KEY) },
      body: JSON.stringify(body)
    });
    clearTimeout(t);
    var j = null; try { j = await res.json(); } catch (e) {}
    return res.ok ? { data: j, error: null } : { data: null, error: { context: { json: async function() { return j; }, status: res.status } } };
  } catch (e) { return { data: null, error: { message: String(e) } }; }
}

var SESSION_MS = 30 * 24 * 60 * 60 * 1000;   // rolling: renewed every time the app is opened
function _createSession(email) {
  localStorage.setItem('vi_session', JSON.stringify({
    email: email.toLowerCase(),
    expiry: Date.now() + SESSION_MS
  }));
  try { localStorage.setItem('vi_last_email', email.toLowerCase()); } catch(e) {}
}
// Once a user is known (name + email, from this device or restored from the cloud) the intro
// questionnaire must never appear again.
function viMarkOnboardedUI() {
  try {
    var u = JSON.parse(localStorage.getItem('vi_user') || 'null');
    if (!viUserOnboarded(u) || localStorage.getItem('vi_demo_mode') === 'true') return false;
    _vaultItUser = u;
    var ov = document.getElementById('welcome-overlay');
    if (ov) ov.style.setProperty('display', 'none', 'important');
    try { applyPaywall(); } catch(e) {}
    try { updateSidebar(); } catch(e) {}
    try { applyProgressiveNav(); } catch(e) {}
    return true;
  } catch(e) { return false; }
}
// Open the app: keep a valid session rolling, or go straight to the PIN pad for a known e-mail.
async function initQuickLogin() {
  try {
    var s = JSON.parse(localStorage.getItem('vi_session') || 'null');
    if (s && s.expiry > Date.now() && s.email) { _createSession(s.email); return; }   // renew
    var last = (localStorage.getItem('vi_last_email') || '').toLowerCase();
    if (!last || localStorage.getItem('vi_demo_mode') === 'true') return;
    var inp = document.getElementById('auth-email'); if (inp) inp.value = last;
    var st = await _pinStatus(last);
    if (st && st.pin === true && !hasValidSession()) {
      _authOTP = { email: last };
      _pinMode = 'server'; _pinEnterLen = PIN_LEN; _pinEnterBuf = '';
      _showAuthStep('pin');
    }
  } catch(e) {}
}

function signOut() {
  var _viaG = false; try { _viaG = localStorage.getItem(VI_AUTH_VIA) === 'google'; } catch (e) {}
  if (!confirm(_viaG ? 'Sign out? You can get back in with Google, or with your email.' : 'Sign out? You can get back in with just your email and PIN.')) return;
  if (_supaClient) _supaClient.auth.signOut().catch(function(){});
  localStorage.removeItem('vi_session');
  location.reload();
}

function viCaptchaEnsure() {
  if (!viCaptchaOn()) return;
  var box = document.getElementById('auth-captcha'); if (!box) return;
  box.style.display = 'block';
  if (_captchaWidget !== null) return;
  var blocked = function() { _captchaLoadFailed = true; _captchaWaitMsg = false; _authErr('The security check could not load. Turn off any blocker for this site, or try another network, then tap Continue to try again.'); };
  var render = function() {
    if (_captchaWidget !== null || !window.turnstile) return;
    try {
      _captchaWidget = window.turnstile.render('#auth-captcha', { sitekey: VI_TURNSTILE_SITEKEY, theme: 'dark',
        callback: function(t) { _captchaToken = t; if (_captchaWaitMsg) { _captchaWaitMsg = false; _clearAuthErr(); } },   // only clears our own "please wait" note, never a real error
        'expired-callback': function() { _captchaToken = ''; }, 'timeout-callback': function() { _captchaToken = ''; },
        'error-callback': function() { _captchaToken = ''; blocked(); } });
    } catch (e) { blocked(); }
  };
  if (window.turnstile) { render(); return; }
  var old = document.getElementById('cf-turnstile-js');
  if (old && _captchaLoadFailed) { old.remove(); old = null; }          // a failed load is tried again the next time
  if (old) return;
  _captchaLoadFailed = false;
  var sc = document.createElement('script'); sc.id = 'cf-turnstile-js'; sc.async = true; sc.defer = true;
  sc.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; sc.onload = render; sc.onerror = blocked;
  document.head.appendChild(sc);
}
// start loading the check as soon as the sign-in screen is showing, so it has finished by the time the first Continue is tapped
window.addEventListener('load', function() { try { var ov = document.getElementById('login-overlay'); if (ov && getComputedStyle(ov).display !== 'none') viCaptchaEnsure(); } catch (e) {} });
function viCaptchaReset() {   // a token works once
  _captchaToken = '';
  try { if (_captchaWidget !== null && window.turnstile) window.turnstile.reset(_captchaWidget); } catch (e) {}
}
// v0.9.2 (owner, 6 Nov): sign-in house still. Added after the page has loaded (so after the card), only on the email step, in the free space above the card.
var _ahOn = false;
function viSigninHouse() {
  if (!_ahOn) return;
  var ov = document.getElementById('login-overlay'), card = ov && ov.querySelector('.auth-card'), em = document.getElementById('auth-email-step');
  if (!card || !em) return;
  var img = ov.querySelector('.auth-house');
  if (!img) {
    img = document.createElement('img'); img.className = 'auth-house'; img.alt = "A house built in Vault-It's House Builder";
    img.decoding = 'async'; img.width = 1600; img.height = 1000; img.hidden = true;
    img.onload = function () { img.classList.add('in'); };
    ov.insertBefore(img, ov.firstChild);   // owner, 10 Nov: the house sits in the background, close up, behind the sign-in card
  }
  var src = document.documentElement.getAttribute('data-theme') === 'light' ? 'img/signin-house-bg-day.webp' : 'img/signin-house-bg-night.webp';
  var show = em.classList.contains('active') && getComputedStyle(ov).display !== 'none';
  img.hidden = !show;
  if (show && img.getAttribute('src') !== src) img.setAttribute('src', src);
  try { viSigninScene(); } catch (e) {}
}
// v0.9.2 (owner, 6 Nov: "Make the house large zoomed into the background with rotation animations. Allow the cursor to interact with
// the model subtly expanding and exploding the house upon hover over."). The still above stays the poster and the fallback (reduced
// motion, no WebGL, a software GPU, a low-end phone, any failure). The 3D starts only once the page has loaded and is idle: the house is
// built in a worker (about half a second, off the main thread), then drawn by HB3D.SigninHouse (src/hb3d/house_gl.js) on one canvas
// behind the card that never takes focus or clicks. It draws on the email step only; the code and PIN steps, a hidden tab and a
// signed-in app stop it.
var _ahScene_stats = {};   // main-thread cost of starting the scene (tests)
var _ahBuilt = false;   // the build plays once a visit
var _ahScene = null, _ahSceneState = '';   // '' not tried, 'wait', 'build', 'on', 'off' (stays on the still)
function _ahSurface() {   // what the person is looking at: 'login' (sign-in, which sits on top), 'welcome' (new-user onboarding) or '' (the app)
  var ov = document.getElementById('login-overlay'), wo = document.getElementById('welcome-overlay');
  if (ov && getComputedStyle(ov).display !== 'none') return 'login';
  if (wo && getComputedStyle(wo).display !== 'none') return 'welcome';
  return '';
}
function _ahSceneWanted() {
  var sf = _ahSurface(), em = document.getElementById('auth-email-step');
  if (!sf || (sf === 'login' && (!em || !em.classList.contains('active')))) return false;   // code and PIN steps draw nothing
  return true;   // v0.9.4 (owner, 8 Nov): reduced motion still gets the scene, as the finished house on a slow drift (no build, no hover, no flashes)
}
function _ahLowEnd() {
  var n = navigator, c = n.connection || {};
  return !!(c.saveData || (n.hardwareConcurrency && n.hardwareConcurrency <= 2) || (n.deviceMemory && n.deviceMemory < 2) || /[?&]signin3d=0/.test(location.search));
}
function viSigninScene() {
  var want = _ahSceneWanted(), sf = _ahSurface(), ov = document.getElementById('login-overlay'), img = ov && ov.querySelector('.auth-house');
  if (_ahScene) {
    var el = _ahScene.el, de = document.documentElement;
    if (!sf) { _ahSceneOff(); return; }   // signed in and onboarded: free the GPU
    el.hidden = !want;
    if (want && _ahScene.HG) _ahScene.start(); else _ahScene.stop();
    _ahScene.day = de.getAttribute('data-theme') === 'light';
    de.setAttribute('data-ah', sf); de.classList.toggle('vi-scene-on', want && _ahScene.frames > 0);
    if (img) img.classList.toggle('under3d', want && _ahScene.frames > 0);
    return;
  }
  if (!want || _ahSceneState || !_ahOn) return;
  if (typeof HB3D === 'undefined' || !HB3D.SigninHouse || typeof Worker === 'undefined' || _ahLowEnd()) { _ahSceneState = 'off'; return; }
  _ahSceneState = 'wait';
  var go = function () { try { _ahSceneBuild(); } catch (e) { _ahSceneOff(); } };
  if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 2500 }); else setTimeout(go, 600);
}
function _ahSceneOff() {
  _ahSceneState = 'off';
  var s = _ahScene; _ahScene = null;
  if (s) { try { s.dispose(); } catch (e) {} if (s.el && s.el.parentNode) s.el.parentNode.removeChild(s.el); }
  var img = document.querySelector('#login-overlay .auth-house'); if (img) img.classList.remove('under3d');
  document.documentElement.classList.remove('vi-scene-on'); document.documentElement.removeAttribute('data-ah');
}
function _ahSceneBuild() {
  var ov = document.getElementById('login-overlay'), inp = document.getElementById('auth-email'), eng = document.getElementById('hb3d-engine');
  if (!_ahSceneWanted() || !eng || (_ahSurface() === 'login' && (!inp || inp.disabled))) { _ahSceneState = ''; return; }   // try again on the next return to the email step
  var el = document.createElement('div'); el.className = 'auth-scene'; el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);   // under both overlays: one scene behind sign-in and onboarding
  var sh;
  var t0 = performance.now();
  try { sh = new HB3D.SigninHouse(el, { maxDpr: 1.5, turn: 50, build: !_ahBuilt, buildS: 4.8, day: document.documentElement.getAttribute('data-theme') === 'light' }); }
  catch (e) { el.parentNode.removeChild(el); _ahSceneState = 'off'; return; }
  sh.el = el; _ahScene_stats.ctorMs = performance.now() - t0; _ahScene_stats.at = t0;
  if (sh.soft && !window.VI_SIGNIN3D) { try { sh.dispose(); } catch (e) {} el.parentNode.removeChild(el); _ahSceneState = 'off'; return; }   // a software GPU: the still
  _ahScene = sh; _ahSceneState = 'build'; el.hidden = true;
  sh.onLost = function () { _ahSceneOff(); };
  sh.onFirstFrame = function () { _ahBuilt = true; el.classList.add('in'); var img = ov.querySelector('.auth-house'); if (img) img.classList.add('under3d'); document.documentElement.classList.add('vi-scene-on'); document.documentElement.setAttribute('data-ah', _ahSurface()); };
  var main = function () {
    self.onmessage = function (e) {
      try { var d = HB3D.houseGLData(HB3D.build(e.data.type, { detail: 'clean' })); self.postMessage(d, [d.data.buffer]); }
      catch (err) { self.postMessage({ error: String((err && err.message) || err) }); }
    };
  };
  var url = URL.createObjectURL(new Blob([eng.textContent, '\n;(', main.toString(), ')();'], { type: 'text/javascript' }));
  var wk = new Worker(url);
  wk.onmessage = function (e) {
    wk.terminate(); URL.revokeObjectURL(url);
    if (_ahScene !== sh) return;
    if (!e.data || e.data.error || !e.data.data) { _ahSceneOff(); return; }
    try { var t1 = performance.now(); sh.load(e.data); _ahScene_stats.loadMs = performance.now() - t1; _ahSceneState = 'on'; viSigninScene(); } catch (err) { _ahSceneOff(); }
  };
  wk.onerror = function () { try { wk.terminate(); } catch (e) {} _ahSceneOff(); };
  wk.postMessage({ type: 'detached' });
}
(function () {   // the pointer reaches the house through the window (the canvas takes no input); passive, so input is never delayed
  var mv = function (e) { if (_ahScene && _ahScene.running() && e.pointerType !== 'touch') _ahScene.point(e.clientX, e.clientY); };
  window.addEventListener('pointermove', mv, { passive: true });
  window.addEventListener('pointerdown', function (e) { if (_ahScene && _ahScene.running() && e.pointerType === 'touch') _ahScene.tap(e.clientX, e.clientY); }, { passive: true });
  document.addEventListener('mouseout', function (e) { if (!e.relatedTarget && _ahScene) _ahScene.point(null); }, { passive: true });
  try { ['login-overlay', 'welcome-overlay'].forEach(function (id) { var ov = document.getElementById(id); if (ov) new MutationObserver(function () { try { viSigninScene(); } catch (e) {} }).observe(ov, { attributes: true, attributeFilter: ['style', 'class'] }); }); } catch (e) {}
  try { var mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)'); if (mq && mq.addEventListener) mq.addEventListener('change', function () { try { viSigninScene(); } catch (e) {} }); } catch (e) {}
})();
window.addEventListener('load', function () { setTimeout(function () { _ahOn = true; try { viSigninHouse(); } catch (e) {} }, 0); });
window.addEventListener('resize', function () { try { viSigninHouse(); } catch (e) {} });
try { new MutationObserver(function () { try { viSigninHouse(); } catch (e) {} }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); } catch (e) {}
function _showAuthStep(step) {
  var cap = document.getElementById('auth-captcha'); if (cap) cap.style.display = (viCaptchaOn() && step !== 'setpin') ? 'block' : 'none';
  if (viCaptchaOn() && step !== 'setpin') viCaptchaEnsure();
  ['email','otp','pin','setpin'].forEach(function(s) {
    var el = document.getElementById('auth-' + s + '-step');
    if (el) el.classList.toggle('active', s === step);
  });
  try { viSigninHouse(); } catch (e) {}
  if (step === 'setpin') _renderPinDots('spin-dots', 'spd', PIN_LEN);
  if (step === 'pin') {
    _renderPinDots('pin-dots', 'pd', _pinEnterLen);
    var pe = document.getElementById('auth-pin-email'); if (pe) pe.textContent = (_authOTP && _authOTP.email) || '';
    var ps = document.getElementById('auth-pin-status'); if (ps) ps.textContent = '';
  }
  _clearAuthErr();
}

function _authErr(msg) {
  var el = document.getElementById('auth-err');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
function _clearAuthErr() {
  var el = document.getElementById('auth-err'); if (el) { el.textContent = ''; el.style.display = 'none'; }
}

// ── Google sign-in (owner, 5 Nov 2026: "sign up and sign in ... with google accounts") ──
// Supabase runs the round trip: the app goes to Supabase's /authorize, Google asks the user, and Supabase sends them back
// here with a session in the address, which supabase-js reads (SIGNED_IN). A first visit creates the account, so sign up and
// sign in are the same button; an existing account with the same Google-verified email is the same account.
// The button only shows while the Google provider is on in Supabase (Authentication → Providers → Google).
var VI_AUTH_VIA = 'vi_auth_via';   // 'google' or 'email': how this device last chose to sign in
var _viGoogleJustBack = (function () { try { return /access_token=/.test(location.hash) && localStorage.getItem(VI_AUTH_VIA) === 'google'; } catch (e) { return false; } })();
async function viGoogleCheck() {
  var on = window.__vi_google_force === true;
  if (!on) {
    try {
      var r = await _withTimeout(fetch(_SUPA_URL + '/auth/v1/settings', { headers: { apikey: _SUPA_KEY } }), 6000, null);
      var j = r && r.ok ? await r.json() : null;
      on = !!(j && j.external && j.external.google === true);
    } catch (e) { on = false; }
  }
  var b = document.getElementById('auth-google'), o = document.getElementById('auth-google-or');
  if (b) b.hidden = !on;
  if (o) o.hidden = !on;
  var c = document.querySelector('#auth-email-step .auth-btn'); if (c) c.classList.toggle('secondary', on);   // Google first: email is the second option
  try { viSigninHouse(); } catch (e) {}   // the card just changed height: re-place the sign-in house
  return on;
}
async function authGoogle() {
  _clearAuthErr();
  try { localStorage.setItem(VI_AUTH_VIA, 'google'); } catch (e) {}
  var fail = function () { _authErr('Google sign-in could not start. Try again, or use your email below.'); };
  if (!_supaClient || !_supaClient.auth || typeof _supaClient.auth.signInWithOAuth !== 'function') { fail(); return; }
  try {
    var res = await _supaClient.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname, queryParams: { prompt: 'select_account' } } });
    if (res && res.error) fail();
  } catch (e) { fail(); }
}
// did this session come from Google? The access token's "amr" names how the session was made ('oauth' for Google)
function _viViaGoogle(session) {
  if (!session) return false;
  try {
    var p = String(session.access_token || '').split('.')[1];
    if (p) {
      p = p.replace(/-/g, '+').replace(/_/g, '/'); while (p.length % 4) p += '=';
      var amr = JSON.parse(atob(p)).amr || [];
      if (amr.length) return amr.some(function (a) { return a && a.method === 'oauth'; });
    }
  } catch (e) {}
  var u = session.user || {};
  try { return !!(u.app_metadata && u.app_metadata.provider === 'google' && localStorage.getItem(VI_AUTH_VIA) === 'google'); } catch (e) { return false; }
}
// back from Google with an error (cancelled, or the provider refused): say so on the sign-in card, clean the address bar
function viGoogleReturn() {
  try {
    if (localStorage.getItem(VI_AUTH_VIA) !== 'google') return false;
    var h = (location.hash || '').slice(1), q = (location.search || '').slice(1);
    var src = /(^|&)error(_description)?=/.test(h) ? h : (/(^|&)error(_description)?=/.test(q) ? q : '');
    if (!src) return false;
    var ps = new URLSearchParams(src), d = (ps.get('error_description') || ps.get('error') || '').slice(0, 120);
    try { history.replaceState(null, document.title, location.pathname); } catch (e) {}
    var show = function () {
      var ov = document.getElementById('login-overlay'); if (ov) ov.style.display = '';
      _showAuthStep('email');
      _authErr('Google sign-in did not finish' + (d ? ' (' + d + ')' : '') + '. Try again, or use your email.');
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show); else show();
    return true;
  } catch (e) { return false; }
}
viGoogleReturn();
// after a Google return the session sits in the address bar: clear it once supabase-js has read it
function viCleanAuthUrl() { try { if (/access_token=|refresh_token=/.test(location.hash)) history.replaceState(null, document.title, location.pathname + location.search); } catch (e) {} }
window.addEventListener('load', function () { try { var ov = document.getElementById('login-overlay'); if (ov && getComputedStyle(ov).display !== 'none') viGoogleCheck(); } catch (e) {} });

async function authSubmitEmail() {
  try { localStorage.setItem(VI_AUTH_VIA, 'email'); } catch (e) {}
  var emailEl = document.getElementById('auth-email');
  var email   = emailEl ? emailEl.value.trim().toLowerCase() : '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    _authErr('Please enter a valid email address.'); return;
  }
  var btn = document.querySelector('#auth-email-step .auth-btn');
  if (btn) { btn.textContent = 'Checking…'; btn.disabled = true; }
  try {
    _authOTP = { email: email }; _authForgot = false; _needPin = null; _pinBusy = false;
    // Returning user with a PIN (set on any device): e-mail + PIN signs them in
    var st = await _pinStatus(email);
    if (st.pin === true) {
      _pinMode = 'server'; _pinEnterLen = PIN_LEN; _pinEnterBuf = '';
      _showAuthStep('pin');
      return;
    }
    // Legacy: a PIN that only exists on this device AND a live session → local lock screen
    var pinHash = localStorage.getItem('vi_pin_hash');
    if (pinHash && pinHash !== 'srv') {
      var storedEmail = '';
      try { var _sv = JSON.parse(localStorage.getItem('vi_session') || 'null'); storedEmail = (_sv && _sv.email) ? _sv.email : ''; } catch(e) {}
      if (!storedEmail) { try { var _su = JSON.parse(localStorage.getItem('vi_user') || 'null'); storedEmail = (_su && _su.email) ? _su.email.toLowerCase() : ''; } catch(e) {} }
      var live = false;
      try { if (_supaClient) { var g = await _withTimeout(_supaClient.auth.getSession(), 2500, null); live = !!(g && g.data && g.data.session); } } catch(e) {}
      if (storedEmail && storedEmail === email && live) {
        _pinMode = 'local'; _pinEnterLen = _localPinLen(); _pinEnterBuf = '';
        _showAuthStep('pin');
        return;
      }
    }
    _sendOTP(email);
  } finally {
    if (btn && !document.getElementById('auth-email-step').classList.contains('active')) { btn.textContent = 'Continue →'; btn.disabled = false; }
  }
}

async function _sendOTP(email) {
  if (!_supaClient) _initSupabase();
  if (!_supaClient) {   // the sign-in library did not load (blocker, bad signal): say so, and never leave Continue stuck on "Checking…"
    _authErr('Connection issue. Check your signal and tap Continue again.');
    var _b0 = document.querySelector('#auth-email-step .auth-btn'); if (_b0) { _b0.textContent = 'Continue →'; _b0.disabled = false; }
    return;
  }
  _authOTP = { email: email };
  var emailDisp = document.getElementById('auth-otp-email');
  if (emailDisp) emailDisp.textContent = email;
  var btn = document.querySelector('#auth-email-step .auth-btn');
  if (btn) { btn.textContent = 'Sending…'; btn.disabled = true; }
  try {
    // Try Edge Function first (Resend API, branded template, no SMTP dependency)
    var sent = false, rateWait = 0, captchaFailed = false, captchaDown = false;
    if (viCaptchaOn() && !_captchaToken) { viCaptchaEnsure(); if (!_captchaLoadFailed) { _authErr('Please wait for the security check below to finish, then tap Continue again.'); _captchaWaitMsg = true; } return; }
    try {
      var fnRes = await _fnInvoke('send-auth-email', { email: email, captchaToken: _captchaToken || undefined }, 20000, false, true);
      if (viCaptchaOn()) viCaptchaReset();
      if (!fnRes.error && fnRes.data && fnRes.data.success) sent = true;
      else if (fnRes.error && fnRes.error.context && fnRes.error.context.status === 403) captchaFailed = true;   // the human check did not pass: never route around it
      else if (fnRes.error && fnRes.error.context && fnRes.error.context.status === 503) captchaDown = true;
      else if (fnRes.error && fnRes.error.context && fnRes.error.context.status === 429) {   // our own abuse limit: do NOT work around it with the built-in sender
        var lim = null; try { lim = await fnRes.error.context.json(); } catch (e) {}
        rateWait = Math.max(1, Math.ceil(((lim && lim.retryAfter) || 600) / 60));
      }
    } catch(fnErr) { /* Edge Function not deployed yet — fall through */ }
    if (captchaFailed) { _authErr(viCaptchaOn() ? 'The security check did not pass. Please try again.' : 'Sign-in is only available at app.vault-it.co (this address is for looking around).'); return; }
    if (captchaDown) { _authErr('The security check is temporarily unavailable. Please try again in about 30 seconds.'); return; }
    if (rateWait) { _authErr('Too many sign-in emails requested for this address or network. Please try again in ' + rateWait + ' min.'); return; }

    if (!sent && viCaptchaOn()) { _authErr('Could not send the code right now. Please try again in a moment.'); return; }   // the built-in sender has no human check, so it is not a way round it
    if (!sent) {
      // Fallback: Supabase built-in signInWithOtp
      var res = await _supaClient.auth.signInWithOtp({
        email: email, options: { shouldCreateUser: true }
      });
      if (res.error) {
        var msg = res.error.message || '';
        console.error('[Vault-It] signInWithOtp error:', res.error);
        if (msg.toLowerCase().includes('rate') || msg.toLowerCase().includes('limit')) {
          _authErr('Too many attempts. Wait 60 seconds and try again.');
        } else if (msg.toLowerCase().includes('email') || msg.toLowerCase().includes('smtp') || msg.toLowerCase().includes('sending')) {
          _authErr('Email delivery issue. Check your inbox including spam, or contact hello@vault-it.co');
        } else if (msg.toLowerCase().includes('signup') || msg.toLowerCase().includes('disabled')) {
          _authErr('Sign-up is currently restricted. Contact hello@vault-it.co to get access.');
        } else {
          _authErr('Auth error: ' + msg + '. Contact hello@vault-it.co if this persists.');
        }
        return;
      }
    }
    _showAuthStep('otp');
  } catch(e) {
    console.error('[Vault-It] _sendOTP exception:', e);
    _authErr('Connection error (' + (e && e.message ? e.message : 'unknown') + '). Check your signal and try again.');
  } finally {
    if (btn) { btn.textContent = 'Continue →'; btn.disabled = false; }
  }
}

function _tryEmailJSOTP(email, code) {
  var svcId  = localStorage.getItem('emailjs_service_id') || '';
  var tplId  = localStorage.getItem('emailjs_template_id') || '';
  var pubKey = localStorage.getItem('emailjs_public_key') || '';
  if (!svcId || !tplId || !pubKey) return; // not configured — code shown on screen
  if (typeof emailjs === 'undefined') {
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
    s.onload = function() {
      emailjs.init(pubKey);
      emailjs.send(svcId, tplId, { to_email: email, otp_code: code, app_name: 'Vault-It' })
        .then(function() { showToast('Code emailed to ' + email + ' ✓'); })
        .catch(function() { /* screen code is the fallback */ });
    };
    document.head.appendChild(s);
  } else {
    emailjs.send(svcId, tplId, { to_email: email, otp_code: code, app_name: 'Vault-It' })
      .catch(function() {});
  }
}

// Everything that happens once a Supabase session exists (e-mail code OR e-mail + PIN)
// Everything this device keeps for a person (data, settings, keys, photos, saved designs). Sign-in tokens (sb-…) can be kept.
function _wipeDeviceData(keepAuth) {
  try { var ks = []; for (var i = 0; i < localStorage.length; i++) ks.push(localStorage.key(i)); ks.forEach(function(k) { if (!(keepAuth && /^sb-/.test(k))) localStorage.removeItem(k); }); } catch (e) {}
  try { sessionStorage.clear(); } catch (e) {}
}
function _wipeIdb(name) {
  return new Promise(function(res) { try { var rq = indexedDB.deleteDatabase(name); rq.onsuccess = rq.onerror = function() { res(true); }; rq.onblocked = function() { res(false); }; setTimeout(function() { res(false); }, 2500); } catch (e) { res(false); } });
}
// A different person signing in on a device that still holds someone else's data must not see it, export it, or upload it to their own account.
async function _guardAccountSwitch(email) {
  if (localStorage.getItem('vi_demo_mode') === 'true') return true;
  var owner = (localStorage.getItem('vi_last_email') || '').toLowerCase(), now = email.toLowerCase();
  if (!owner || owner === now) return true;
  var unsent = _lsJSON('vi_dirty', []).length;
  var ok = confirm('This device still holds data saved for ' + owner + '.\n\nSigning in as ' + now + ' removes it from this device, so it cannot be seen by someone else, or uploaded to their account.'
    + (unsent ? '\n\n⚠ It has changes that were never uploaded to ' + owner + '’s account. They would be lost.' : '\n\nIt stays safe in that account.') + '\n\nContinue?');
  if (!ok) { try { _supaClient.auth.signOut({ scope: 'local' }); } catch (e) {} _supaUser = null; _authOTP = null; _showAuthStep('email'); return false; }
  try { _invDB && _invDB.close(); _invDB = null; } catch (e) {}
  try { await invClearAll(); } catch (e) {}
  _wipeDeviceData(true);
  try { _createSession(email); } catch (e) {}
  location.reload();   // start clean from the new account's own data
  return false;
}
async function _afterVerified(user, email) {
  _supaUser = user; _viSignedInAt = Date.now();
  if (!(await _guardAccountSwitch(email))) return;
  var wiped = _dropDemoBeforeSync(email);   // v0.95 (owner, 8 Nov, tester on a new device): the sample is wiped from storage first; its keys cannot be written again until the page restarts
  var hydrated = await _hydrateFromSupabase(_supaUser.id);
  if (wiped) { _viRestartAfterWipe(email, hydrated); return; }   // every tab still holds the sample in memory: restart from storage (the account's own rows, or nothing)
  // QC-2: demo visitor signing up for the first time — wipe sample data so
  // the new account starts clean and demo values never sync to Supabase.
  if (localStorage.getItem('vi_demo_mode') === 'true' && !hydrated) {
    _wipeDemoData(email);
    try { _createSession(email); } catch(e){}
    location.reload();
    return;
  }
  _createSession(email);
  _completeAuth(email);
  viMarkOnboardedUI();
  if (hydrated) {
    setTimeout(function() {
      try { if(typeof loadState==='function') loadState(); } catch(e) {}
      try { if(typeof updateKPIs==='function') updateKPIs(); } catch(e) {}
      try { if(typeof updateSidebar==='function') updateSidebar(); } catch(e) {}
      try { if(typeof renderCashflow==='function') renderCashflow(); } catch(e) {}
      try { if(typeof renderDebtTab==='function') renderDebtTab(); } catch(e) {}
      try { if(typeof renderAlTab==='function') renderAlTab(); } catch(e) {}
    }, 150);
    showToast('Vault restored ✓');
  } else {
    showToast('Vault ready ✓');
  }
}

async function authVerifyOTP() {
  var entered = (document.getElementById('auth-otp-inp') || {}).value || '';
  if (!_authOTP || !_authOTP.email) { _authErr('Session expired. Go back and try again.'); return; }
  if (!entered || entered.trim().length < 6 || entered.trim().length > 8) { _authErr('Enter the code from your email (6–8 digits).'); return; }
  var btn = document.querySelector('#auth-otp-step .auth-btn');
  if (btn) { btn.textContent = 'Verifying…'; btn.disabled = true; }
  try {
    var email = _authOTP.email;
    // Decide whether to ask for a PIN BEFORE signing in (the sign-in event fires immediately):
    // new users, people who forgot their PIN, and anyone without one on the server.
    var st = await _pinStatus(email);
    // (if the lookup was merely throttled we do not know whether a PIN exists: never offer to overwrite one)
    _needPin = (st.pin === null) ? (_authForgot ? true : (st.limited ? false : null)) : (!st.pin || _authForgot);
    var res = await _withTimeout(_supaClient.auth.verifyOtp({
      email: email, token: entered.trim(), type: 'email'
    }), 20000, { error: { message: 'timeout' } });
    if (res.error) { _needPin = null; _authErr('Incorrect or expired code. Try again.'); return; }
    await _afterVerified(res.data.user, email);
  } catch(e) { _needPin = null; _authErr('Verification failed. Please try again.'); }
  finally {
    if (btn) { btn.textContent = 'Verify Code →'; btn.disabled = false; }
  }
}

function authVerifyPin() {
  var email = (_authOTP && _authOTP.email) ? _authOTP.email
    : ((_supaUser && _supaUser.email) ? _supaUser.email.toLowerCase() : '');
  if (!email) {
    var emailEl = document.getElementById('auth-email');
    email = emailEl ? emailEl.value.trim().toLowerCase() : '';
  }
  var pin     = (document.getElementById('auth-pin-inp') || {}).value || '';
  if (!pin) { _authErr('Enter your PIN.'); return; }
  var stored  = localStorage.getItem('vi_pin_' + _hashStr(email));
  if (stored === _hashStr(email + ':' + pin)) {
    _createSession(email);
    _completeAuth(email);
  } else {
    _authErr('Incorrect PIN. Try again, or use "Forgot PIN" to reset via code.');
    var inp = document.getElementById('auth-pin-inp'); if (inp) inp.value = '';
  }
}

function authSetPin() {
  var pin1 = (document.getElementById('auth-pin1') || {}).value || '';
  var pin2 = (document.getElementById('auth-pin2') || {}).value || '';
  if (!pin1 || !/^\d{4,6}$/.test(pin1)) { _authErr('PIN must be 4–6 digits.'); return; }
  if (pin1 !== pin2) { _authErr('PINs do not match.'); return; }
  var email = _authOTP ? _authOTP.email : '';
  if (!email) { _authErr('Session lost. Go back and try again.'); return; }
  localStorage.setItem('vi_pin_' + _hashStr(email), _hashStr(email + ':' + pin1));
  _createSession(email);
  _completeAuth(email);
}

function authSkipPin() {
  var email = _authOTP ? _authOTP.email : '';
  if (!email) { _authErr('Session lost. Go back and try again.'); return; }
  _createSession(email);
  _completeAuth(email);
}

function authForgotPin() {
  // reset path: prove the e-mail with a code, then choose a new PIN
  _authForgot = true;
  localStorage.removeItem('vi_pin_hash'); localStorage.removeItem('vi_pin_len');
  var email = (_authOTP && _authOTP.email) ? _authOTP.email : ((_supaUser && _supaUser.email) ? _supaUser.email : '');
  if (!email) {
    var emailEl = document.getElementById('auth-email');
    email = emailEl ? emailEl.value.trim().toLowerCase() : '';
  }
  if (!email) { _showAuthStep('email'); return; }
  _sendOTP(email.toLowerCase());
}

function authGoBack() {
  _authOTP = null; _authForgot = false; _needPin = null; _pinBusy = false; _pinMode = 'local';
  var inp = document.getElementById('auth-otp-inp');
  if (inp) inp.value = '';
  var btn = document.querySelector('#auth-email-step .auth-btn');
  if (btn) { btn.textContent = 'Continue →'; btn.disabled = false; }
  _showAuthStep('email');
}

async function authResendOTP() {
  if (!_authOTP || !_authOTP.email) { authGoBack(); return; }
  await _sendOTP(_authOTP.email);
}

// ── PIN MANAGEMENT ─────────────────────────────────────────────
// The PIN is a 6-digit account PIN verified on the server (edge function `pin-auth`): after the
// first e-mail-code sign-in, returning users sign in on ANY device with just e-mail + PIN.
// A legacy 4-digit PIN that only exists on this device still works as a local lock.
var _pinSetBuf = '';
var _pinSetFirst = '';
var _pinSetPhase = 'enter'; // 'enter' | 'confirm'
var _pinEnterBuf = '';

// PINs an attacker would try first (mirrors the server's rule, which is the one that counts)
function viWeakPin(p) {
  if (/^(\d)\1{5}$/.test(p) || /^(\d\d)\1\1$/.test(p) || /^(\d\d\d)\1$/.test(p)) return true;
  var d = p.split('').map(Number);
  if (d.every(function(x, i) { return i === 0 || x === (d[i - 1] + 1) % 10; }) || d.every(function(x, i) { return i === 0 || x === (d[i - 1] + 9) % 10; })) return true;
  return ['123456','654321','112233','123321','159753','147258','258369','789456','987654','100000','111222','222333','112358','142536','102030','010203','123654','321123','159357','246810','666888','888999','998877','987123','121314','654123','520520','521521','007007','000001','777888','456123','741852','963852','852456','147852','369258','123789','321654','999000'].indexOf(p) > -1;
}
var _pinChangeCurrent = '';
// ask for the current PIN (credential changes need it, or a very recent sign-in). Resolves '' if skipped, null if cancelled.
function viAskCurrentPin(title, text) {
  return new Promise(function(resolve) {
    var old = document.getElementById('askpin-modal'); if (old) old.remove();
    var m = document.createElement('div'); m.id = 'askpin-modal';
    m.style.cssText = 'position:fixed;inset:0;z-index:20003;background:rgb(var(--panel-rgb) / .95);display:flex;align-items:center;justify-content:center;padding:12px';
    m.innerHTML = '<div style="background:var(--c1);border:1px solid var(--bd2);border-radius:10px;width:min(380px,94vw);padding:20px 18px;font-family:\'DM Sans\',sans-serif">'
      + '<div style="font-family:\'Syne\',sans-serif;font-size:max(.8rem,var(--vi-fs-3));font-weight:800;color:var(--tx);margin-bottom:8px">' + title + '</div>'
      + '<div style="font-size:max(.58rem,var(--vi-fs-2));color:var(--t2);line-height:1.6;margin-bottom:10px">' + text + '</div>'
      + '<input id="askpin-inp" class="al-inp" type="password" inputmode="numeric" autocomplete="off" maxlength="6" placeholder="Current 6-digit PIN" style="width:100%;margin-bottom:12px">'
      + '<div style="display:flex;gap:8px"><button class="btn-add-data" id="askpin-no" style="flex:1;background:transparent;border-color:var(--t3);color:var(--t3)">Cancel</button><button class="btn-add-data" id="askpin-ok" style="flex:1">Continue</button></div></div>';
    document.body.appendChild(m);
    var done = function(v) { m.remove(); resolve(v); };
    document.getElementById('askpin-no').onclick = function() { done(null); };
    document.getElementById('askpin-ok').onclick = function() { done((document.getElementById('askpin-inp').value || '').trim()); };
    document.getElementById('askpin-inp').onkeydown = function(e) { if (e.key === 'Enter') document.getElementById('askpin-ok').click(); };
    setTimeout(function() { var i = document.getElementById('askpin-inp'); if (i) i.focus(); }, 50);
  });
}
// words for the answers pin-auth gives to set / remove
function _pinChangeProblem(r) {
  if (!r) return '';
  if (r.error === 'pin_weak') return 'That PIN is too easy to guess (like 123456 or 000000). Choose another.';
  if (r.error === 'pin_format') return 'A PIN is exactly 6 digits.';
  if (r.error === 'locked') return 'Too many wrong PINs. Try again in ' + Math.max(1, Math.ceil((r.retryAfter || 900) / 60)) + ' min, or sign out and sign back in with an email code first.';
  if (r.error === 'rate_limited') return 'Too many attempts from this network. Try again in ' + Math.max(1, Math.ceil((r.retryAfter || 60) / 60)) + ' min.';
  if (r.error === 'invalid') return r.remaining ? 'That current PIN is not right: ' + r.remaining + ' attempt' + (r.remaining === 1 ? '' : 's') + ' left.' : 'Enter your current 6-digit PIN.';
  if (r.error === 'reauth' || r.error === 'recent_login') return 'For your security, enter your current PIN, or sign out and sign back in with an email code, then do this straight away.';
  if (r.error === 'auth') return 'Your sign-in has expired. Sign in again, then try again.';
  return 'Something went wrong on our side. Please try again.';
}
function _localPinLen() { var n = parseInt(localStorage.getItem('vi_pin_len') || '4', 10); return (n >= 4 && n <= 6) ? n : 4; }
function _pinPromptNeeded() { return _needPin !== null ? _needPin : !localStorage.getItem('vi_pin_hash'); }

function _renderPinDots(boxId, prefix, n) {
  var box = document.getElementById(boxId); if (!box) return;
  var h = ''; for (var i = 0; i < n; i++) h += '<div class="auth-pin-dot" id="' + prefix + i + '"></div>';
  box.innerHTML = h;
}
function _updatePinDots(n, prefix) {
  var i = 0, d;
  while ((d = document.getElementById(prefix + i))) { d.classList.toggle('filled', i < n); i++; }
}

// call the pin-auth edge function; returns the parsed JSON body (also for 4xx answers) or null if unreachable
async function _pinCall(body, ms, once) {
  if (!_supaClient) _initSupabase();
  if (!_supaClient) return null;
  try {
    var r = await _fnInvoke('pin-auth', body, ms || 8000, false, once);
    if (r.data) return r.data;
    if (r.error && r.error.context && typeof r.error.context.json === 'function') { try { return await r.error.context.json(); } catch (e) {} }
  } catch (e) {}
  return null;
}
async function _pinStatus(email) {
  try {
    var r = await Promise.race([_pinCall({ action: 'status', email: email }, 3500), new Promise(function(res) { setTimeout(function() { res(null); }, 12000); })]);
    if (r && typeof r.pin === 'boolean') return { pin: r.pin };
    if (r && r.error === 'rate_limited') return { pin: null, limited: true };
  } catch (e) {}
  return { pin: null }; // unknown (function not reachable) → fall back to the old behaviour
}

function _setPinKey(d) {
  if (_pinBusy || _pinSetBuf.length >= PIN_LEN) return;
  _pinSetBuf += d;
  _updatePinDots(_pinSetBuf.length, 'spd');
  if (_pinSetBuf.length < PIN_LEN) return;
  var buf = _pinSetBuf;
  setTimeout(function() {
    if (_pinSetPhase === 'enter') {
      if (viWeakPin(buf)) { _authErr('That PIN is too easy to guess (like 123456 or 000000). Choose another.'); _pinSetBuf = ''; _updatePinDots(0, 'spd'); return; }
      _clearAuthErr();
      _pinSetFirst = buf;
      _pinSetBuf = '';
      _pinSetPhase = 'confirm';
      var lbl = document.getElementById('auth-setpin-label');
      if (lbl) lbl.textContent = 'Confirm your PIN';
      _updatePinDots(0, 'spd');
    } else if (buf === _pinSetFirst) {
      _finishSetPin(buf);
    } else {
      _authErr('PINs don\'t match. Try again');
      _pinSetFirst = ''; _pinSetBuf = ''; _pinSetPhase = 'enter';
      _updatePinDots(0, 'spd');
      var lbl2 = document.getElementById('auth-setpin-label');
      if (lbl2) lbl2.textContent = _SETPIN_LABEL;
    }
  }, 180);
}
async function _finishSetPin(pin) {
  _pinBusy = true;
  var email = (_authOTP && _authOTP.email) ? _authOTP.email : ((_supaUser && _supaUser.email) ? _supaUser.email.toLowerCase() : '');
  var r = await _pinCall({ action: 'set', pin: pin, current: _pinChangeCurrent || '' });
  if (r && r.error) {   // the server said no: nothing was changed, so do not pretend it was
    _pinBusy = false; _pinSetBuf = ''; _pinSetFirst = ''; _pinSetPhase = 'enter'; _updatePinDots(0, 'spd');
    var lblx = document.getElementById('auth-setpin-label'); if (lblx) lblx.textContent = _SETPIN_LABEL;
    var why = _pinChangeProblem(r);
    if (r.error === 'pin_weak' || r.error === 'pin_format') { _authErr(why); return; }   // stay and choose another
    _pinChangeCurrent = ''; if (_pinChange) { _pinChange = false; _hideAuthOverlay(); } showToast(why); return;
  }
  _pinChangeCurrent = '';
  var onServer = !!(r && r.ok);
  _lsOrig.call(localStorage, 'vi_pin_hash', onServer ? 'srv' : _hashStr(pin));   // 'srv' = "a PIN is set on the server": no PIN-derived value is kept in the browser
  _lsOrig.call(localStorage, 'vi_pin_len', String(PIN_LEN));
  _needPin = false; _authForgot = false; _pinBusy = false;
  _pinSetBuf = ''; _pinSetFirst = ''; _pinSetPhase = 'enter';
  try { _lsOrig.call(localStorage, VI_PIN_OFFER, 'off'); } catch (e) {}
  if (_pinLater) { viPinLaterEnd(); _hideAuthOverlay(); showToast(onServer ? 'PIN set ✓ Sign in anywhere with just your email + PIN' : 'PIN saved on this device only. The PIN service could not be reached'); return; }
  showToast(onServer ? 'PIN set ✓ Sign in anywhere with just your email + PIN' : 'PIN saved on this device only. The PIN service could not be reached');
  if (_pinChange) { _pinChange = false; _hideAuthOverlay(); return; }
  if (email) { _completeAuth(email); } else { _skipPin(); }
}
function _setPinDel() {
  if (_pinSetBuf.length > 0) { _pinSetBuf = _pinSetBuf.slice(0,-1); _updatePinDots(_pinSetBuf.length, 'spd'); }
}
function _hideAuthOverlay() {
  var ov = document.getElementById('login-overlay');
  if (ov) ov.style.setProperty('display', 'none', 'important');
}
function _skipPin() {
  _pinChange = false;
  if (_pinLater) viPinLaterEnd();
  _hideAuthOverlay();
}

// ── The PIN, offered later (owner, 10 Nov 2026: "less friction"; the PIN is not asked for at sign-up) ──
// vi_pin_offer (this device only, never synced or exported): 'due:<time>' once an account without a PIN has signed in here,
// 'off' once the user set a PIN or said Not now. The card shows on the next visit, or straight after the sign-in when the
// account already existed (its first open on this device). pin-auth lets an account without a PIN set one only within
// 15 minutes of a sign-in, so after that "Set a PIN" proves the email with a code first, as Forgot PIN does.
var VI_PIN_OFFER = 'vi_pin_offer', _pinOfferBusy = false;
function viUserOnboarded(u) { return !!(u && u.email && (u.name || (u.goal != null && u.goal !== ''))); }   // finished the welcome (the first name is optional)
function viPinOfferAfterSignIn() {
  try {
    if (localStorage.getItem('vi_pin_hash') || localStorage.getItem('vi_demo_mode') === 'true') return;
    var st = localStorage.getItem(VI_PIN_OFFER) || '';
    if (st === 'off') return;
    if (!/^due:\d+$/.test(st)) _lsOrig.call(localStorage, VI_PIN_OFFER, 'due:' + Date.now());
    var u = null; try { u = JSON.parse(localStorage.getItem('vi_user') || 'null'); } catch (e) {}
    if (viUserOnboarded(u)) setTimeout(function () { viPinOfferMaybe(true); }, 1500);   // an account that already existed: its first open on this device
  } catch (e) {}
}
async function viPinOfferMaybe(now) {   // now: show even if it became due on this page
  try {
    if (_pinOfferBusy || !_supaUser || !_supaUser.email) return false;
    if (localStorage.getItem('vi_demo_mode') === 'true' || localStorage.getItem('vi_pin_hash')) return false;
    var m = /^due:(\d+)$/.exec(localStorage.getItem(VI_PIN_OFFER) || ''); if (!m) return false;
    if (!now && +m[1] >= _pageT0) return false;   // the sign-up visit itself: from the next visit on
    var lo = document.getElementById('login-overlay'), wo = document.getElementById('welcome-overlay');
    if ((lo && getComputedStyle(lo).display !== 'none') || (wo && getComputedStyle(wo).display !== 'none')) return false;
    _pinOfferBusy = true;
    var st = await _pinStatus(String(_supaUser.email).toLowerCase());
    _pinOfferBusy = false;
    if (st.pin === true) { _lsOrig.call(localStorage, VI_PIN_OFFER, 'off'); return false; }   // set on another device already
    if (st.pin !== false) return false;   // not known (service slow or limited): try on another visit
    viPinOfferShow(); return true;
  } catch (e) { _pinOfferBusy = false; return false; }
}
function viPinOfferShow() {
  var el = document.getElementById('vi-pin-offer');
  if (!el) {
    el = document.createElement('div'); el.id = 'vi-pin-offer'; el.className = 'vi-pin-offer'; el.setAttribute('role', 'region'); el.setAttribute('aria-label', 'Sign-in PIN');
    el.innerHTML = '<div class="vi-pin-offer-h">Sign in faster next time</div>'
      + '<p>Set a 6-digit PIN, then sign in on any device with your email and PIN, without waiting for a code.</p>'
      + '<div class="set-btns"><button type="button" class="set-btn primary" data-pin-offer="set">Set a PIN</button><button type="button" class="set-btn" data-pin-offer="later">Not now</button></div>';
    el.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-pin-offer]'); if (b) viPinOfferAct(b.getAttribute('data-pin-offer')); });
    document.body.appendChild(el);
  }
  el.hidden = false;
}
function viPinOfferAct(kind) {
  var el = document.getElementById('vi-pin-offer'); if (el) el.hidden = true;
  try { _lsOrig.call(localStorage, VI_PIN_OFFER, 'off'); } catch (e) {}
  if (kind === 'set') viPinSetStart();
}
function viPinSetStart() {
  if (!_supaUser || !_supaUser.email) { showToast('Sign in with an email code first, then set your PIN'); return; }
  var last = Math.max(_viSignedInAt || 0, Date.parse(_supaUser.last_sign_in_at || '') || 0);
  if (Date.now() - last < 14 * 60 * 1000) { authChangePin(); return; }   // signed in just now: straight to the PIN pad
  var email = String(_supaUser.email).toLowerCase();
  _pinLater = true; _authOTP = null; _authForgot = false; _needPin = null;
  var inp = document.getElementById('auth-email'); if (inp) inp.value = email;
  var n = document.getElementById('auth-pinlater-note'), c = document.getElementById('auth-pinlater-cancel'), st = document.getElementById('auth-email-step');
  if (n) n.hidden = false; if (c) c.hidden = false; if (st) st.classList.add('pinlater');
  var ov = document.getElementById('login-overlay'); if (ov) ov.style.setProperty('display', 'flex', 'important');
  _showAuthStep('email');
}
function viPinLaterEnd() {
  _pinLater = false;
  var n = document.getElementById('auth-pinlater-note'), c = document.getElementById('auth-pinlater-cancel'), st = document.getElementById('auth-email-step');
  if (n) n.hidden = true; if (c) c.hidden = true; if (st) st.classList.remove('pinlater');
}
function viPinLaterCancel() {   // Not now on the code step: back to the app, still signed in
  viPinLaterEnd(); _authOTP = null; _needPin = null; _clearAuthErr();
  var btn = document.querySelector('#auth-email-step .auth-btn'); if (btn) { btn.textContent = 'Continue →'; btn.disabled = false; }
  _hideAuthOverlay();
}

function _enterPinKey(d) {
  if (_pinBusy || _pinEnterBuf.length >= _pinEnterLen) return;
  _pinEnterBuf += d;
  _updatePinDots(_pinEnterBuf.length, 'pd');
  if (_pinEnterBuf.length < _pinEnterLen) return;
  var buf = _pinEnterBuf;
  setTimeout(function() {
    if (_pinMode === 'server') { _pinServerLogin(buf); return; }
    var stored = ''; try { stored = localStorage.getItem('vi_pin_hash') || ''; } catch(e) {}
    if (_hashStr(buf) === stored) {
      // Renew local session so overlay doesn't reappear on next visit
      var _pinEmail = '';
      try { var _pse = JSON.parse(localStorage.getItem('vi_session') || 'null'); _pinEmail = (_pse && _pse.email) ? _pse.email : ''; } catch(e) {}
      if (!_pinEmail) { try { var _pue = JSON.parse(localStorage.getItem('vi_user') || 'null'); _pinEmail = (_pue && _pue.email) ? _pue.email.toLowerCase() : ''; } catch(e) {} }
      if (_pinEmail) _createSession(_pinEmail);
      _hideAuthOverlay();
      // If Supabase already has a valid JWT, hydrate — otherwise UI uses localStorage data
      if (_supaClient && !_supaUser) {
        _supaClient.auth.getSession().then(function(r) {
          var s = r.data && r.data.session;
          if (s && s.user) {
            _supaUser = s.user;
            _hydrateFromSupabase(_supaUser.id).then(function(h) {
              if (h) { try{updateKPIs();}catch(e){} try{updateSidebar();}catch(e){} try{renderPioneerCard();}catch(e){} }
            });
          }
        }).catch(function(){});
      }
      try { if(typeof applyPaywall==='function') applyPaywall(); } catch(e) {}
      try { if(typeof updateKPIs==='function') updateKPIs(); } catch(e) {}
      try { if(typeof updateSidebar==='function') updateSidebar(); } catch(e) {}
      try { if(typeof renderPioneerCard==='function') renderPioneerCard(); } catch(e) {}
    } else {
      _authErr('Incorrect PIN');
      _pinEnterBuf = '';
      _updatePinDots(0, 'pd');
    }
  }, 180);
}
// e-mail + PIN → the server checks the PIN and releases a one-time code that becomes a real session
async function _pinServerLogin(pin) {
  var email = (_authOTP && _authOTP.email) || '';
  if (!email) { _showAuthStep('email'); return; }
  _pinBusy = true; _clearAuthErr();
  var lbl = document.getElementById('auth-pin-status'); if (lbl) lbl.textContent = 'Checking…';
  var reset = function() { _pinBusy = false; _pinEnterBuf = ''; _updatePinDots(0, 'pd'); if (lbl) lbl.textContent = ''; };
  var r = await _pinCall({ action: 'login', email: email, pin: pin });
  if (!r) { reset(); _authErr('Couldn\'t reach the server. Check your signal, or get an email code instead.'); return; }
  if (r.error === 'locked') {
    var m = Math.max(1, Math.ceil((r.retryAfter || 900) / 60));
    reset(); _authErr('Too many attempts. Try again in ' + m + ' min, or get an email code instead.'); return;
  }
  if (r.error === 'rate_limited') {
    var rw = Math.max(1, Math.ceil((r.retryAfter || 60) / 60));
    reset(); _authErr('Too many attempts from this network. Try again in ' + rw + ' min, or get an email code instead.'); return;
  }
  if (!r.ok || !r.token) {
    reset();
    _authErr(r.remaining ? 'Incorrect PIN: ' + r.remaining + ' attempt' + (r.remaining === 1 ? '' : 's') + ' left.' : 'Incorrect PIN. Try again, or get an email code instead.');
    return;
  }
  // PIN accepted: exchange the one-time code for a session. Mark the PIN as set BEFORE the
  // sign-in event fires so no "set a PIN" prompt appears.
  _lsOrig.call(localStorage, 'vi_pin_hash', 'srv');
  _lsOrig.call(localStorage, 'vi_pin_len', String(PIN_LEN));
  _needPin = false;
  try {
    var res = await _withTimeout(_supaClient.auth.verifyOtp({ email: email, token: r.token, type: 'email' }), 20000, { error: { message: 'timeout' } });
    if (res.error || !res.data || !res.data.user) { reset(); _authErr('Sign-in failed. Please use an email code instead.'); return; }
    _pinBusy = false; _pinEnterBuf = '';
    await _afterVerified(res.data.user, email);
  } catch (e) { reset(); _authErr('Sign-in failed. Please use an email code instead.'); }
}
function _enterPinDel() {
  if (_pinEnterBuf.length > 0) { _pinEnterBuf = _pinEnterBuf.slice(0,-1); _updatePinDots(_pinEnterBuf.length, 'pd'); }
}
// type the PIN on a keyboard as well as the on-screen pad
document.addEventListener('keydown', function(e) {
  var ov = document.getElementById('login-overlay');
  if (!ov || getComputedStyle(ov).display === 'none') return;
  var pinStep = document.getElementById('auth-pin-step'), setStep = document.getElementById('auth-setpin-step');
  var onPin = pinStep && pinStep.classList.contains('active'), onSet = setStep && setStep.classList.contains('active');
  if (!onPin && !onSet) return;
  if (/^\d$/.test(e.key)) { e.preventDefault(); onPin ? _enterPinKey(e.key) : _setPinKey(e.key); }
  else if (e.key === 'Backspace') { e.preventDefault(); onPin ? _enterPinDel() : _setPinDel(); }
});

// ── Settings: change / remove the PIN (needs a live session) ──
async function authChangePin() {
  if (!_supaUser) { showToast('Sign in with an email code first, then set your PIN'); return; }
  _pinChangeCurrent = '';
  var st = await _pinStatus((_supaUser.email || '').toLowerCase());
  if (st.pin === true) {   // changing an existing PIN: prove you know it (or have just signed in)
    var cur = await viAskCurrentPin('Change your PIN', 'Enter your current PIN to continue. If you have forgotten it, cancel, sign out and sign back in with an email code. You can then choose a new one.');
    if (cur === null) return;
    _pinChangeCurrent = cur;
  }
  _pinChange = true;
  _authOTP = { email: (_supaUser.email || '').toLowerCase() };
  _pinSetBuf = ''; _pinSetFirst = ''; _pinSetPhase = 'enter';
  var lbl = document.getElementById('auth-setpin-label'); if (lbl) lbl.textContent = _SETPIN_LABEL;
  var sm = document.getElementById('settings-modal'); if (sm) sm.style.display = 'none';
  var ov = document.getElementById('login-overlay'); if (ov) ov.style.setProperty('display', 'flex', 'important');
  _showAuthStep('setpin');
}
async function authRemovePin() {
  if (!confirm('Remove your PIN? You will sign in with an email code each time.')) return;
  var cur = '', st = _supaUser ? await _pinStatus((_supaUser.email || '').toLowerCase()) : { pin: null };
  if (st.pin === true) { cur = await viAskCurrentPin('Remove your PIN', 'Enter your current PIN to continue.'); if (cur === null) return; }
  var r = await _pinCall({ action: 'remove', current: cur });
  if (r && r.error) { showToast(_pinChangeProblem(r)); return; }   // refused: keep everything as it was
  localStorage.removeItem('vi_pin_hash'); localStorage.removeItem('vi_pin_len');
  showToast(r && r.ok ? 'PIN removed' : 'PIN removed on this device (the PIN service could not be reached)');
}
// ──────────────────────────────────────────────────────────────

function _completeAuth(email) {
  // Sample data still on this device must be discarded (not adopted as the user's own) before the account is read
  if (localStorage.getItem('vi_demo_mode') === 'true') {
    _dropDemoBeforeSync(email);
    try { _createSession(email); } catch (e) {}
    location.reload();
    return;
  }
  // Clear demo mode — user is now a real authenticated account
  localStorage.removeItem('vi_demo_mode');
  var chip = document.getElementById('demo-chip');
  if (chip) chip.style.display = 'none';
  try {
    var u = JSON.parse(localStorage.getItem('vi_user') || '{}');
    if (!u.email) { u.email = email; localStorage.setItem('vi_user', JSON.stringify(u)); }
  } catch(e) {}
  // Sync profile identity to Supabase
  if (_supaClient && _supaUser) {
    try {
      var u = JSON.parse(localStorage.getItem('vi_user') || '{}');
      var s = JSON.parse(localStorage.getItem('vi_settings') || '{}');
      var prow = {
        id: _supaUser.id,
        name: u.name || null, phone: u.phone || null,
        job: u.job || null, dream: u.dream || null,
        goal: u.goal || null, save_arch: u.saveArch || null,
        spend_arch: u.spendArch || null,
        currency: s.currency || 'GBP',
        updated_at: new Date().toISOString()
      };
      if (_viGateway !== true) prow.is_pioneer = localStorage.getItem('vi_pioneer') === 'true';   // older server only: the server ignores it once it keeps paid status
      _supaClient.from('profiles').upsert(prow, { onConflict: 'id' });
      _flushDirty();   // push anything not yet confirmed by the cloud
    } catch(e) {}
  }
  var overlay = document.getElementById('login-overlay');
  var _askPin = _pinPromptNeeded(); _needPin = null;
  if (_askPin && (_authForgot || _pinLater)) {   // owner, 10 Nov 2026: no PIN at sign-up; the pad comes only for Forgot PIN or a later Set a PIN
    _pinSetBuf = ''; _pinSetFirst = ''; _pinSetPhase = 'enter';
    _updatePinDots(0, 'spd');
    var lbl = document.getElementById('auth-setpin-label');
    if (lbl) lbl.textContent = _SETPIN_LABEL;
    _showAuthStep('setpin');
  } else {
    if (overlay) overlay.style.display = 'none';
    if (_askPin) viPinOfferAfterSignIn();
  }
  // Re-render UI with restored data
  setTimeout(function() {
    try { if(typeof updateKPIs==='function') updateKPIs(); } catch(e) {}
    try { if(typeof updateSidebar==='function') updateSidebar(); } catch(e) {}
    try { if(typeof renderCashflow==='function') renderCashflow(); } catch(e) {}
    try { if(typeof renderPioneerCard==='function') renderPioneerCard(); } catch(e) {}
  }, 100);
}

