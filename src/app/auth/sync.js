// ═══════════════════════════════════════════════════════════════
// AUTH / SESSION  (login gate, OTP, PIN, sign-out, data reset)
// ═══════════════════════════════════════════════════════════════
var _authOTP = null; // { code, expiry, email }

// ── SUPABASE SYNC ─────────────────────────────────────────────
var _supaClient = null;
var _supaUser   = null;
var _lsOrig     = Storage.prototype.setItem; // save original before patch
var _viBootDemo = localStorage.getItem('vi_demo_mode') === 'true';   // v0.95: this page started on the sample; if another tab drops it, this tab must not write the sample back
var _VAULT_KEYS = ['pos_ov1','pos_al1','pos_debt1','pos_biz1','pos_ach1',
  'ht3','pos_house','pos_journey','vi_jrny_events','vi_nw_history',
  'vi_settings','vi_user','vi_debt','vi_ov'];
// Paid status is not user data: it comes from the profile (the server, set by Stripe), never from the synced vault, so an old
// vault row or a restored version cannot make an account paid (secure paid gateway, migration 011).
var VI_SERVER_KEYS = ['vi_pioneer','vi_founder','vi_plan'];

// ── SAFE SYNC ─────────────────────────────────────────────────
// Every edit to a vault key is time-stamped (vi_ts) and queued (vi_dirty) until the cloud confirms it.
// Signing in never overwrites newer local work: see _hydrateFromSupabase.
var _cloudSeen = {}, _emptiedByUser = {};   // _emptiedByUser: areas the user deliberately emptied this session (so an empty result may be uploaded)   // what the cloud held when we last read/wrote it
// v0.95 (tester 1, 9 Nov: zeroed figures came back): an "emptied" mark is also kept on the device until its upload lands, so a reload
// before then cannot let the older cloud copy bring the deleted rows back. It is tied to the email it was made under, so another
// account signing in on this device never inherits it.
function _viEmail() { try { var u = JSON.parse(localStorage.getItem('vi_user') || 'null'); return u && u.email ? String(u.email).toLowerCase() : ''; } catch (e) { return ''; } }
function _viEmptiedList() { try { var m = JSON.parse(localStorage.getItem('vi_emptied') || 'null'), e = _viEmail(); return m && e && m.e === e && Array.isArray(m.k) ? m.k.filter(function (k) { return _VAULT_KEYS.indexOf(k) > -1; }) : []; } catch (e) { return []; } }
function _viEmptiedPut(list) { try { var e = _viEmail(); if (e && list.length) _lsOrig.call(localStorage, 'vi_emptied', JSON.stringify({ e: e, k: list })); else localStorage.removeItem('vi_emptied'); } catch (e) {} }
function _viEmptiedMark(key, on) {
  if (on) _emptiedByUser[key] = true; else delete _emptiedByUser[key];
  var l = _viEmptiedList().filter(function (k) { return k !== key; }); if (on) l.push(key); _viEmptiedPut(l);
}
function _viEmptiedSent(keys) { var l = _viEmptiedList(), n = l.filter(function (k) { return keys.indexOf(k) < 0; }); if (n.length !== l.length) _viEmptiedPut(n); }
_viEmptiedList().forEach(function (k) { _emptiedByUser[k] = true; });
// Fingerprints of the built-in sample (demo) data. If it ever ends up outside demo mode (e.g. a stale device) it counts as "nothing here",
// so it can neither upload over the account's real figures nor win when the account's data is pulled down.
function _isDemoSample(key, o) {
  try {
    if (key === 'pos_debt1') return (o.debts || []).some(function(d) { return d && d.name === 'Student Loan Plan 2' && +d.original === 38000; });
    if (key === 'pos_house') return !!(o.deposits && o.deposits[0] && o.deposits[0].amt === 5000 && o.saved === 22500);
    if (key === 'ht3') return !!(o.deposits && o.deposits.length >= 6 && ((o.deposits[0].amount === 5000 && o.deposits[1].amount === 4500 && o.deposits[2].amount === 3500) || (o.deposits[0].amount === 3000 && o.deposits[1].amount === 2500 && o.deposits[2].amount === 2800 && +o.saved === 18500)));
    if (key === 'pos_al1') return (o.crypto || []).some(function(c) { return c && c.sym === 'ETH' && (+c.amount === 1.4 || +c.qty === 1.4); }) && (o.crypto || []).some(function(c) { return c && c.sym === 'BTC' && (+c.amount === 0.05 || +c.qty === 0.05); });
    if (key === 'pos_biz1') return (o.leads || []).some(function(l) { return l && l.name === 'Nova Retail'; });
  } catch (e) {}
  return false;
}
function _isBlankArea(key, v) {   // an area with nothing in it (new-device defaults) must never replace one that has data
  try {
    var o = typeof v === 'string' ? JSON.parse(v) : v; if (!o) return true;
    if (_isDemoSample(key, o)) return true;   // the built-in sample persona is never the user's own data: it must not replace real figures
    var _st = _viSampleStrip(key, o); if (_st) o = _st;   // v0.95: judged without the sample's rows, so a device still holding them cannot upload them over a cleared account
    var n = function(a) { return a && a.length; };
    if (key === 'pos_ov1') return !(n(o.income) || n(o.expenses));
    if (key === 'pos_al1') return !(n(o.cashAccounts) || n(o.physicalCash) || n(o.stocks) || n(o.otherAssets) || n(o.crypto) || n(o.liabilities) || (o.metals && Object.keys(o.metals).some(function(m) { return +o.metals[m] > 0; })));
    if (key === 'pos_debt1') return !(n(o.debts) || n(o.owedToMe));
    if (key === 'ht3') return !(+o.saved > 0);
    if (key === 'pos_biz1') return !(n(o.clients) || n(o.leads) || n(o.streams));
  } catch (e) {}
  return false;
}
// v0.95, tester 1 (9 Nov 2026: "I can't seem to start off afresh and add data"): an account that signed up on a device showing the
// sample, before d2a368a, kept the sample's rows as its own and the cloud copy brought them back on every sign-in. The demo chip
// (and its "start with your own data") had gone with demo mode, and zeroing the Assets lines left the sample's House Builder pot.
// These are the sample's own rows (loadDemoData), matched by name and figure, so clearing never touches a row the user added or edited.
// Each row is [name, figure, the sample's own id]: user rows get Date.now() ids, so a row the user added with a preset name
// ("Savings", "Current Account") never matches. Entrepreneur rows have time ids in the sample too, so that area is only touched
// when it carries the sample's fingerprint (_isDemoSample: the Nova Retail lead).
var VI_SAMPLE_ROWS = {
  pos_ov1: [['income', 'name', 'amount', [['Salary (£57k)', 3635, 1], ['Freelance consulting', 1200, 2]]],
    ['expenses', 'name', 'amount', [['Rent', 1150, 3], ['Groceries', 340, 4], ['Transport', 160, 5], ['Utilities & bills', 170, 6], ['Phone & internet', 48, 7],
      ['Insurance', 55, 8], ['Subscriptions', 58, 9], ['Gym & health', 42, 10], ['Eating out', 120, 11], ['Entertainment', 90, 12], ['Holidays', 180, 13],
      ['Gifts & giving', 80, 14], ['House deposit', 550, 15], ['ISA / investments', 350, 16], ['Pension (extra)', 150, 17], ['Emergency fund', 200, 18], ['Savings', 250, 19]]]],
  pos_al1: [['cashAccounts', 'name', 'balance', [['Marcus Savings (emergency fund)', 4800, 1], ['Current Account', 2100, 2]]],
    ['otherAssets', 'name', 'value', [['Car · Honda Civic', 9500, 5]]], ['liabilities', 'name', 'value', [['Car Finance', 4200, 6]]],
    ['stocks', 'sym', 'units', [['VUSA.L', 120, 1], ['VWRL.L', 60, 2]]]],
  pos_debt1: [['debts', 'name', 'original', [['Student Loan Plan 2', 38000, 1], ['Barclaycard', 3200, 2]]]],
  pos_biz1: [['clients', 'name', 'monthly', [['Northgate Health', 700], ['Fernbrook Studio', 500]]],
    ['leads', 'name', 'value', [['Nova Retail', 900], ['Harbour & Co', 600], ['Lumen Fintech', 1200]]],
    ['streams', 'name', 'monthly', [['Consulting day rate', 1200]]],
    ['incomeStreams', 'name', 'monthlyIncome', [['Product consulting', 1200], ['Notion templates shop', 85]]]]
};
// the sample's seven House Builder deposits (date, amount): a welcome pot or the user's own deposits on top of them stay
var VI_SAMPLE_DEPOSITS = [['01/04/2026', 3000], ['01/05/2026', 2500], ['01/06/2026', 2800], ['01/07/2026', 2600], ['01/08/2026', 2400], ['01/09/2026', 2700], ['01/10/2026', 2500]];
function _viSame(a, b) { return Math.abs((+a || 0) - b) < 1e-9; }   // figures compared with a tolerance, never ===
// the area without the sample's rows, or null when it does not hold the sample
function _viSampleStrip(key, o) {
  if (!o || typeof o !== 'object') return null;
  var fp = _isDemoSample(key, o);
  if (key === 'pos_biz1' && !fp) return null;
  var c = JSON.parse(JSON.stringify(o)), n = 0;
  if (typeof VI_SAMPLE_ROWS === 'undefined') return null;   // asked before this block has run
  (VI_SAMPLE_ROWS[key] || []).forEach(function (spec) {
    if (!Array.isArray(c[spec[0]])) return;
    c[spec[0]] = c[spec[0]].filter(function (r) {
      var hit = !!r && spec[3].some(function (x) { return r[spec[1]] === x[0] && _viSame(r[spec[2]], x[1]) && (x[2] == null || r.id === x[2]); });
      if (hit) n++; return !hit;
    });
  });
  if (key === 'ht3' && Array.isArray(c.deposits)) {
    var took = 0, left = VI_SAMPLE_DEPOSITS.slice();
    var keep = c.deposits.filter(function (d) {
      var i = d ? left.findIndex(function (x) { return d.date === x[0] && _viSame(d.amount, x[1]) && !d.acct; }) : -1;
      if (i < 0) return true; took += left[i][1]; left.splice(i, 1); return false;
    });
    if (VI_SAMPLE_DEPOSITS.length - left.length >= 5) {   // five or more of the seven: this is the sample's log
      c.deposits = keep; c.saved = Math.max(0, Math.round(((+c.saved || 0) - took) * 100) / 100); n += 2;
    }
  }
  if ((key === 'ht3' || key === 'pos_house') && fp && n < 2) { c.saved = 0; c.deposits = []; n += 2; }   // an older sample: all of it is the sample's
  if (!(n >= 2 || fp)) return null;
  if (key === 'pos_ov1' && Array.isArray(c.snapshots)) c.snapshots = c.snapshots.filter(function (sn) { return !(sn && _viSame(sn.liab, 4200) && _viSame(sn.income, 4835)); });   // the sample's made-up history
  if (key === 'pos_al1') {
    (c.crypto || []).forEach(function (x) { if (x && ((x.sym === 'ETH' && (_viSame(x.amount, 1.4) || _viSame(x.qty, 1.4))) || (x.sym === 'BTC' && (_viSame(x.amount, 0.05) || _viSame(x.qty, 0.05))))) { x.amount = 0; if ('qty' in x) x.qty = 0; } });   // back to the empty default rows
    if (c.metals && _viSame(c.metals.gold, 1.5) && _viSame(c.metals.silver, 10)) { c.metals.gold = 0; c.metals.silver = 0; }
  }
  return c;
}
function viSampleAreas() {
  if (localStorage.getItem('vi_demo_mode') === 'true') return [];   // on the demo the sample is meant to be there (its own chip clears it)
  var out = [];
  ['pos_ov1', 'pos_al1', 'pos_debt1', 'pos_biz1', 'ht3', 'pos_house'].forEach(function (k) {
    var o = null; try { o = JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) {}
    var c = _viSampleStrip(k, o); if (c) out.push({ key: k, value: c });
  });
  return out;
}
// Owner, 10 Nov 2026: "Yes, make it automatic and remove the button" (every profile starts blank, filled only from onboarding).
// Once signed in and the account's cloud copy has been read, an account still holding the sample has the sample's own rows
// removed, once per tab, with no question; the page then restarts. Accounts without the sample are never touched.
function viSampleAuto() {
  setTimeout(function () {   // after the caller finishes (hydration sets _syncReady just after it redraws)
    try {
      if (!(_supaUser && _syncReady && _viEmail()) || window._viDeleted) return;
      if (sessionStorage.getItem('vi_sample_auto')) return;   // one try per tab: never a reload loop
      if (!viSampleAreas().length) return;
      sessionStorage.setItem('vi_sample_auto', '1');
      viClearSample();
    } catch (e) {}
  }, 0);
}
async function viClearSample() {
  var areas = viSampleAreas(); if (!areas.length) return;
  if (window._viDemoWiped || (_viBootDemo && localStorage.getItem('vi_demo_mode') !== 'true')) { try { sessionStorage.removeItem('vi_sample_auto'); } catch (e) {} location.reload(); return; }   // this page started on the sample: its writes to those areas are refused, so restart first and try again there
  areas.forEach(function (a) {
    var before = localStorage.getItem(a.key);
    try { _lsOrig.call(localStorage, 'vi_bak_' + a.key, JSON.stringify({ at: Date.now(), value: before })); } catch (e) {}   // never lose what we replace
    localStorage.setItem(a.key, JSON.stringify(a.value));   // through the wrapper: time-stamped and queued for upload
    if (localStorage.getItem(a.key) !== before && _isBlankArea(a.key, a.value)) _viEmptiedMark(a.key, true);   // empty now on purpose: the older cloud copy must not win
  });
  if (areas.some(function (a) { return a.key === 'pos_ov1'; })) {   // the sample's take-home and rent in the Journey profile
    try { var j = JSON.parse(localStorage.getItem('pos_journey') || 'null');
      if (j && j.profile) { var ch = false;
        if (_viSame(j.profile.monthlyTakeHome, 3635)) { j.profile.monthlyTakeHome = 0; ch = true; }
        if (_viSame(j.rentMonthly, 1150) && _viSame(j.rentYears, 4)) { j.rentMonthly = 0; j.rentYears = 0; ch = true; }
        if (ch) localStorage.setItem('pos_journey', JSON.stringify(j)); } } catch (e) {}
  }
  window._viDemoWiped = true;   // until the restart, the tabs (still holding the sample in memory) cannot write it back
  clearTimeout(_flushT);
  for (var w = 0; w < 30 && _flushing; w++) await new Promise(function (r) { setTimeout(r, 100); });   // the upload that follows sign-in may still be running
  try { if (_supaUser) await _flushDirty(); } catch (e) {}   // anything not sent now goes on the next start (queued, and the emptied marks are kept)
  location.reload();   // every tab redraws from storage
}
var _hydrating = false, _flushT = null, _flushing = false, _syncReady = false;   // _syncReady: this session has read the cloud copy, so uploading can no longer clobber it
var _devEstablished = (function() {   // a device that already belongs to a real user (decided before anything runs)
  try { var u = JSON.parse(localStorage.getItem('vi_user') || 'null'); return !!(u && u.email && (u.name || (u.goal != null && u.goal !== ''))) && localStorage.getItem('vi_demo_mode') !== 'true'; } catch (e) { return false; }
})();
function _lsJSON(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
function _markDirty(key) {
  var d = _lsJSON('vi_dirty', []);
  if (d.indexOf(key) < 0) { d.push(key); try { _lsOrig.call(localStorage, 'vi_dirty', JSON.stringify(d)); } catch (e) {} }
}
localStorage.setItem = function(key, value) {
  if (window._viDeleted) return;   // the account has been deleted: nothing may write data back
  if ((window._viDemoWiped || (_viBootDemo && localStorage.getItem('vi_demo_mode') !== 'true')) && _DEMO_DATA_KEYS.indexOf(key) > -1) return;   // v0.95: the sample has been wiped (by this page, about to restart, or by another tab) while this page still holds it in memory
  if (_VAULT_KEYS.indexOf(key) > -1 && typeof value === 'string') value = viCleanJSON(value);
  if (_VAULT_KEYS.indexOf(key) > -1) { try { var _prev = localStorage.getItem(key); if (_prev != null && !_isBlankArea(key, _prev) && _isBlankArea(key, value)) _viEmptiedMark(key, true); else if (!_isBlankArea(key, value) && _emptiedByUser[key]) _viEmptiedMark(key, false); } catch (e) {} }
  _lsOrig.call(localStorage, key, value);
  if (!_hydrating && _VAULT_KEYS.indexOf(key) > -1 && localStorage.getItem('vi_demo_mode') !== 'true') {   // sample (demo) data is never treated as the user's
    try { var ts = _lsJSON('vi_ts', {}); ts[key] = Date.now(); _lsOrig.call(localStorage, 'vi_ts', JSON.stringify(ts)); } catch (e) {}
    _markDirty(key);
    if (_supaUser) { clearTimeout(_flushT); _flushT = setTimeout(_flushDirty, 250); }
  }
};
async function _upsertRows(rows) {
  if (!rows.length || window._viDeleted) return !window._viDeleted;
  if (_supaClient && !_sjsStalled) {
    var r;
    try { r = await _withTimeout(_supaClient.from('vault_data').upsert(rows, { onConflict: 'user_id,key' }).then(function(x) { return x; }, function(e) { return { error: e }; }), 8000, null); }
    catch (e) { r = { error: e }; }
    if (r && r.error && /jwt|expired|401/i.test(String(r.error.message || r.error.code || '')) && await _refreshAuth()) {
      try { r = await _withTimeout(_supaClient.from('vault_data').upsert(rows, { onConflict: 'user_id,key' }).then(function(x) { return x; }, function(e) { return { error: e }; }), 8000, null); } catch (e) { r = { error: e }; }
    }
    if (r && !r.error) { _lastSyncErr = ''; return true; }
    if (!r) { _sjsStalled = true; _lastSyncErr = 'connection stalled'; } else { _lastSyncErr = String((r.error && (r.error.message || r.error.code)) || 'rejected'); return false; }
  }
  try {   // supabase-js stalled or failed: write straight to the REST API with the saved session token
    var tok = await _freshAccessToken(); if (!tok) { _lastSyncErr = 'not signed in'; return false; }
    var put = async function(tk) {
      var ctl = new AbortController(), t = setTimeout(function() { ctl.abort(); }, 15000);
      var r = await fetch(_SUPA_URL + '/rest/v1/vault_data?on_conflict=user_id,key', {
        method: 'POST', signal: ctl.signal,
        headers: { 'content-type': 'application/json', apikey: _SUPA_KEY, authorization: 'Bearer ' + tk, prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(rows)
      });
      clearTimeout(t); return r;
    };
    var res = await put(tok);
    if (res.status === 401) { var nt = await _directRefresh(); if (nt) res = await put(nt); }
    _lastSyncErr = res.ok ? '' : 'server said ' + res.status;
    return res.ok;
  } catch (e) { _lastSyncErr = 'no connection'; return false; }
}
var _lastSyncErr = '';
async function _flushDirty() {
  if (window._viDeleted || _flushing || !_supaUser || !_syncReady || localStorage.getItem('vi_demo_mode') === 'true') return;
  _flushing = true;
  try {
    var t0 = Date.now();
    var dirty = _lsJSON('vi_dirty', []).filter(function(k) { return _VAULT_KEYS.indexOf(k) > -1; });
    var rows = [], blanks = [];
    dirty.forEach(function(k) {
      var v = localStorage.getItem(k); if (v == null) return;
      var p; try { p = JSON.parse(v); } catch (e) { p = v; }
      if (_isBlankArea(k, p) && !_emptiedByUser[k]) { blanks.push(k); return; }   // blank defaults: verified against the account below
      rows.push({ user_id: _supaUser.id, key: k, value: p, updated_at: new Date(_lsJSON('vi_ts', {})[k] || t0).toISOString() });
    });
    if (blanks.length) {   // only upload blank defaults if the account really has nothing there
      var live = await _selectRows(_supaUser.id);
      if (!live.data) { _lastSyncErr = 'could not verify'; return; }
      live.data.forEach(function(r) { _cloudSeen[r.key] = r.value; });
      blanks.forEach(function(k) {
        var theirs = live.data.find(function(r) { return r.key === k; });
        if (theirs && !_isBlankArea(k, theirs.value)) { try { _lsOrig.call(localStorage, 'vi_dirty', JSON.stringify(_lsJSON('vi_dirty', []).filter(function(x) { return x !== k; }))); } catch (e) {} _needPull = true; return; }
        var v = localStorage.getItem(k), p; try { p = JSON.parse(v); } catch (e) { p = v; }
        rows.push({ user_id: _supaUser.id, key: k, value: p, updated_at: new Date(_lsJSON('vi_ts', {})[k] || t0).toISOString() });
      });
    }
    if (!rows.length) { try { _lsOrig.call(localStorage, 'vi_dirty', JSON.stringify(_lsJSON('vi_dirty', []).filter(function(k) { return blanks.indexOf(k) < 0 || _emptiedByUser[k]; }))); } catch (e) {} if (_needPull) { _needPull = false; setTimeout(viBackgroundPull, 200); } return; }
    if (await _upsertRows(rows)) {
      rows.forEach(function(r) { _cloudSeen[r.key] = r.value; });
      var ts = _lsJSON('vi_ts', {}), sent = rows.map(function(r) { return r.key; });
      _viEmptiedSent(sent.filter(function(k) { return !((ts[k] || 0) > t0); }));   // the cloud has the emptied copy now (unless edited again since): the mark is no longer needed
      var left = _lsJSON('vi_dirty', []).filter(function(k) { return sent.indexOf(k) < 0 || (ts[k] || 0) > t0; });
      _lsOrig.call(localStorage, 'vi_dirty', JSON.stringify(left));
      try { _lsOrig.call(localStorage, 'vi_last_sync', String(Date.now())); } catch (e) {}
    }
  } catch (e) {} finally { _flushing = false; }
}
setInterval(function() { try { if (_supaUser && !_syncReady && !_hydrating) _hydrateFromSupabase(_supaUser.id); else _flushDirty(); } catch (e) {} }, 60000);
// ── Sync status, "Sync now" and the not-backed-up banner ──
function viSyncStatus() {
  var d = _lsJSON('vi_dirty', []).length, last = +localStorage.getItem('vi_last_sync') || 0;
  var ago = last ? Math.max(1, Math.round((Date.now() - last) / 60000)) + ' min ago' : 'never on this device';
  var txt = !_supaUser ? '⚠ Not signed in to your account on this device, so changes are saved here only.'
    : !_syncReady ? '⏳ Connecting to your cloud copy…' + (_hydrateErr ? ' (' + _hydrateErr + ')' : '')
    : !last && !d && !_lastSyncErr && localStorage.getItem('pos_ov1') != null ? '⏳ This device has never uploaded. Tap the button below to back everything up.'
    : d ? '⏳ ' + d + ' change' + (d === 1 ? '' : 's') + ' waiting to upload' + (_lastSyncErr ? ' (' + _lastSyncErr + ')' : '') + ' · last upload ' + ago
    : '✓ Everything is backed up · last upload ' + ago;
  var el = document.getElementById('sync-status'); if (el) el.textContent = txt;
  var bn = document.getElementById('sync-banner');
  var unsynced = d > 0 || (!localStorage.getItem('vi_last_sync') && localStorage.getItem('pos_ov1') != null);   // older devices never tracked this
  var need = !_supaUser && unsynced && !!hasValidSession() && (Date.now() - _pageT0 > 4000) && !_syncBannerOff && localStorage.getItem('vi_demo_mode') !== 'true';   // the sample is never backed up, so the demo never asks
  var lo = document.getElementById('login-overlay'), loginOpen = lo && getComputedStyle(lo).display !== 'none';
  if (need && !loginOpen) {
    if (!bn) {
      bn = document.createElement('div'); bn.id = 'sync-banner';
      bn.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:10002;background:var(--panel);border:1px solid #e0b44a;color:#f3d58a;border-radius:10px;padding:10px 12px;font-size:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap';
      bn.innerHTML = '<span style="flex:1;min-width:200px">⚠ Your latest changes are only on this device. Sign in to back them up to your account.</span><button class="btn-add-data" onclick="viReauth()">Sign in to back up</button><span style="cursor:pointer;padding:4px" onclick="_syncBannerOff=true;viSyncStatus()"><svg class="vi-ic g" role="img" aria-label="Close"><use href="#vi-close"/></svg></span>';
      document.body.appendChild(bn);
    }
  } else if (bn) bn.remove();
}
var _syncBannerOff = false, _pageT0 = Date.now();
function viReauth() {
  var sm = document.getElementById('settings-modal'); if (sm) sm.style.display = 'none';
  var last = localStorage.getItem('vi_last_email') || (_lsJSON('vi_user', {}).email) || '';
  var inp = document.getElementById('auth-email'); if (inp) inp.value = last;
  _authOTP = null; _showAuthStep('email');
  var ov = document.getElementById('login-overlay'); if (ov) ov.style.setProperty('display', 'flex', 'important');
  if (last) { setTimeout(function() { try { authSubmitEmail(); } catch (e) {} }, 150); }
}
async function viSyncNow() {
  if (!_supaUser) { showToast('Sign in first, then everything on this device is uploaded'); viReauth(); return; }
  var el = document.getElementById('sync-status'); if (el) el.textContent = '⏳ Uploading…';
  _syncReady = false; await _hydrateFromSupabase(_supaUser.id);   // always read the account's current copy first
  if (!_syncReady) { viSyncStatus(); showToast('Could not read your cloud copy (' + (_hydrateErr || 'unknown') + '), so nothing was uploaded to protect your data. Try again in a moment.'); return; }
  var skipped = [];
  _VAULT_KEYS.forEach(function(k) {
    var v = localStorage.getItem(k); if (v == null) return;
    if (_cloudSeen[k] != null && _isBlankArea(k, v) && !_isBlankArea(k, _cloudSeen[k])) { skipped.push(k); return; }   // blank here, but the cloud has real data: leave the cloud alone
    _markDirty(k);
  });
  _flushing = false; await _flushDirty(); viSyncStatus();
  if (skipped.length) { showToast('Skipped ' + skipped.join(', ') + ': this device has nothing there but your account does, so it was left alone.'); return; }
  showToast(_lsJSON('vi_dirty', []).length ? 'Upload failed: ' + (_lastSyncErr || 'unknown') + '. It will keep retrying.' : 'Uploaded ✓ Everything on this device is now in your account');
}
setInterval(function() { try { viSyncStatus(); } catch (e) {} }, 5000);

// ── Keep every device current, and make every version retrievable ─────────────
var VI_AREA_LABEL = { pos_ov1: 'Budget: income & spending', pos_al1: 'Assets & liabilities', pos_debt1: 'Debts', ht3: 'House builder', pos_house: 'House builder (old)', pos_biz1: 'Business', pos_ach1: 'Achievements', pos_journey: 'Journey', vi_user: 'Profile', vi_settings: 'Settings', vi_nw_history: 'Net-worth history', vi_jrny_events: 'Journey events', vi_pioneer: 'Pioneer', vi_founder: 'Founder', vi_debt: 'Debts (old)', vi_ov: 'Overview (old)' };
function _areaSummary(key, v) {
  try {
    var o = typeof v === 'string' ? JSON.parse(v) : v; if (o == null) return '–';
    var sum = function(a, f) { return (a || []).reduce(function(s, x) { return s + (+x[f] || 0); }, 0); };
    var gbp = function(n) { return '£' + Math.round(n).toLocaleString('en-GB'); };
    if (key === 'pos_ov1') return (o.income || []).length + ' income (' + gbp(sum(o.income, 'amount')) + '/mo) · ' + (o.expenses || []).length + ' spending (' + gbp(sum(o.expenses, 'amount')) + '/mo)';
    if (key === 'pos_al1') return (o.cashAccounts || []).length + ' cash · ' + (o.stocks || []).length + ' stocks · ' + (o.otherAssets || []).length + ' items · ' + (o.crypto || []).length + ' crypto · ' + (o.liabilities || []).length + ' liabilities';
    if (key === 'pos_debt1') return (o.debts || []).length + ' debts (' + gbp(sum(o.debts, 'balance')) + ')';
    if (key === 'ht3') return 'saved ' + gbp(+o.saved || 0) + ' of ' + gbp(+o.target || 0);
    if (key === 'vi_user') return (o.name || '') + ' ' + (o.email || '');
    return Array.isArray(o) ? o.length + ' items' : Object.keys(o).length + ' fields';
  } catch (e) { return '–'; }
}
function _rerenderAll() {
  ['loadState', 'updateUI', 'updateKPIs', 'updateSidebar', 'renderCashflow', 'renderDebtTab', 'renderAlTab', 'stkRender', 'renderSummaryCards', 'renderPioneerCard', 'nwhRenderMini', 'drawChart'].forEach(function(f) {   // drawChart also refreshes the 3D net worth scene
    try { if (typeof window[f] === 'function') window[f](); } catch (e) {}
  });
}
// pull changes made on the user's other devices (app ↔ browser) whenever this one is opened, and every 3 minutes
async function viBackgroundPull() {
  if (!_supaUser || !_syncReady || _hydrating || document.visibilityState !== 'visible') return;
  try {
    await _flushDirty();
    _hydChanged = false;
    await _hydrateFromSupabase(_supaUser.id);
    if (_hydChanged) { _rerenderAll(); showToast('Updated with changes from your other device ✓'); }
  } catch (e) {}
}
document.addEventListener('visibilitychange', function() { if (document.visibilityState === 'visible') viBackgroundPull(); });
setInterval(viBackgroundPull, 180000);

// daily snapshot of everything on this device (last 7 days) — restorable even without a connection
function viLocalSnapshot() {
  try {
    if (localStorage.getItem('vi_demo_mode') === 'true') return;
    var data = {}, real = false;
    _VAULT_KEYS.forEach(function(k) { var v = localStorage.getItem(k); if (v != null) data[k] = v; });
    ['pos_ov1', 'pos_al1', 'pos_debt1', 'ht3'].forEach(function(k) { if (data[k] && !_isBlankArea(k, data[k])) real = true; });
    if (!real) return;                                       // never snapshot an empty vault
    var key = 'vi_snap_' + new Date().toISOString().slice(0, 10);
    _lsOrig.call(localStorage, key, JSON.stringify({ at: Date.now(), data: data }));
    var snaps = []; for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (/^vi_snap_\d{4}-\d\d-\d\d$/.test(k)) snaps.push(k); }
    snaps.sort().slice(0, Math.max(0, snaps.length - 7)).forEach(function(k) { localStorage.removeItem(k); });
  } catch (e) {}
}
setTimeout(viLocalSnapshot, 8000); setInterval(viLocalSnapshot, 3600000);

async function _rpc(fn, args) {
  if (_supaClient && !_sjsStalled) {
    try { var r = await _withTimeout(_supaClient.rpc(fn, args).then(function(x) { return x; }, function(e) { return { error: e }; }), 8000, null); if (r) return r; } catch (e) {}
  }
  try {
    var tok = _localAccessToken(); if (!tok) return { error: { message: 'not signed in' } };
    var res = await fetch(_SUPA_URL + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { 'content-type': 'application/json', apikey: _SUPA_KEY, authorization: 'Bearer ' + tok }, body: JSON.stringify(args || {}) });
    var j = null; try { j = await res.json(); } catch (e) {}
    return res.ok ? { data: j } : { error: { message: (j && (j.message || j.hint)) || ('server said ' + res.status), code: j && j.code } };
  } catch (e) { return { error: { message: 'no connection' } }; }
}
function viCloseHistory() { var m = document.getElementById('vi-hist'); if (m) m.remove(); }
async function viOpenHistory() {
  var sm = document.getElementById('settings-modal'); if (sm) sm.style.display = 'none';
  viCloseHistory();
  var m = document.createElement('div'); m.id = 'vi-hist';
  m.style.cssText = 'position:fixed;inset:0;z-index:10060;background:rgb(var(--panel-rgb) / .85);display:flex;align-items:center;justify-content:center;padding:14px';
  m.innerHTML = '<div style="background:var(--panel);border:1px solid rgb(var(--teal-rgb) / .3);border-radius:12px;width:min(720px,100%);max-height:92vh;overflow:auto;padding:16px;font-size:13px;color:#cfdbe8">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><b style="color:var(--em);font-size:15px">🕘 Version history</b><span style="cursor:pointer;font-size:18px" onclick="viCloseHistory()"><svg class="vi-ic g" role="img" aria-label="Close"><use href="#vi-close"/></svg></span></div>' +
    '<div style="opacity:.75;margin-bottom:10px">Every change to your vault is kept. Restore any earlier version. The current one is kept too, so restoring can always be undone.</div>' +
    '<div id="vi-hist-cloud">Loading your account history…</div><div id="vi-hist-local" style="margin-top:16px"></div></div>';
  document.body.appendChild(m);
  // this device's daily snapshots
  var snaps = []; for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (/^vi_snap_/.test(k)) snaps.push(k); }
  snaps.sort().reverse();
  var lh = '<b>On this device (daily copies)</b>';
  if (!snaps.length) lh += '<div style="opacity:.7">None yet. One is made each day you use the app.</div>';
  snaps.forEach(function(k) {
    var o = _lsJSON(k, {}); var d = o.data || {};
    lh += '<div style="border-top:1px solid rgb(var(--ink-rgb) / .07);padding:8px 0;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><div style="flex:1;min-width:220px"><div>' + new Date(o.at || 0).toLocaleString('en-GB') + '</div><div style="opacity:.75">' +
      stkEsc(_areaSummary('pos_ov1', d.pos_ov1)) + '<br>' + stkEsc(_areaSummary('pos_al1', d.pos_al1)) + '</div></div><button class="btn-add-data" onclick="viRestoreSnapshot(\'' + k + '\')">Restore all</button></div>';
  });
  document.getElementById('vi-hist-local').innerHTML = lh;
  // account (cloud) versions
  var el = document.getElementById('vi-hist-cloud');
  if (!_supaUser) { el.innerHTML = '<b>In your account</b><div style="opacity:.7">Sign in to see your account history.</div>'; return; }
  var r = await _rpc('vault_history_list', { p_limit: 80 });
  if (r.error || !Array.isArray(r.data)) {
    var notOn = /vault_history_list|function|PGRST202|404/i.test(String(r.error && (r.error.message + ' ' + r.error.code)));
    el.innerHTML = '<b>In your account</b><div style="opacity:.75">' + (notOn ? 'Account history is not switched on yet for this app.' : 'Could not load it (' + stkEsc(r.error && r.error.message || 'unknown') + ').') + '</div>';
    return;
  }
  var h = '<b>In your account</b>';
  if (!r.data.length) h += '<div style="opacity:.7">No earlier versions yet.</div>';
  r.data.forEach(function(v) {
    h += '<div style="border-top:1px solid rgb(var(--ink-rgb) / .07);padding:8px 0;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><div style="flex:1;min-width:220px"><div><b>' + stkEsc(VI_AREA_LABEL[v.key] || v.key) + '</b> · ' + new Date(v.archived_at).toLocaleString('en-GB') + (v.reason === 'deleted' ? ' · before reset' : v.reason === 'shrunk' ? ' · before a big change' : '') + '</div><div style="opacity:.75">' + stkEsc(_areaSummary(v.key, v.value)) + '</div></div>' +
      '<button class="btn-add-data" onclick="viRestoreVersion(' + (+v.id) + ',\'' + stkEsc(v.key) + '\')">Restore</button></div>';
  });
  el.innerHTML = h;
}
async function viRestoreVersion(id, key) {if(viBlockEdit())return;
  if (!confirm('Restore this earlier version of ' + (VI_AREA_LABEL[key] || key) + '? The current version is kept in the history.')) return;
  var r = await _rpc('vault_history_restore', { p_id: id });
  if (r.error) { showToast('Restore failed: ' + (r.error.message || 'unknown')); return; }
  try {   // the account copy is now the one to use on this device
    _lsOrig.call(localStorage, 'vi_dirty', JSON.stringify(_lsJSON('vi_dirty', []).filter(function(k) { return k !== key; })));
    var ts = _lsJSON('vi_ts', {}); delete ts[key]; _lsOrig.call(localStorage, 'vi_ts', JSON.stringify(ts));
    var cur = localStorage.getItem(key); if (cur != null) _lsOrig.call(localStorage, 'vi_bak_' + key, JSON.stringify({ at: Date.now(), value: cur }));
    localStorage.removeItem(key);
  } catch (e) {}
  _syncReady = false; await _hydrateFromSupabase(_supaUser.id); _rerenderAll();
  viCloseHistory(); showToast((VI_AREA_LABEL[key] || key) + ' restored ✓ and it will appear on your other devices too');
}
function viRestoreSnapshot(k) {if(viBlockEdit())return;
  var o = _lsJSON(k, null); if (!o || !o.data) return;
  if (!confirm('Restore everything from ' + new Date(o.at).toLocaleString('en-GB') + '? This replaces what is on this device and in your account (the current version stays in the history).')) return;
  Object.keys(o.data).forEach(function(key) { if (_VAULT_KEYS.indexOf(key) > -1) localStorage.setItem(key, o.data[key]); });   // tracked → uploaded
  _reloadAllState(); _rerenderAll(); viCloseHistory();
  showToast('Restored ✓ Uploading to your account…');
}


window.addEventListener('online', function() { try { _flushDirty(); } catch (e) {} });
document.addEventListener('visibilitychange', function() { if (document.visibilityState === 'hidden') { try { _flushDirty(); } catch (e) {} } });

// Financial/data keys that demo mode seeds. On a demo→real-signup conversion
// these MUST be wiped so the new account starts genuinely empty and demo values
// never sync to Supabase under the real user_id (QC-2).
var _DEMO_DATA_KEYS = ['pos_ov1','pos_al1','pos_debt1','pos_biz1','pos_ach1',
  'pos4','pos_house','pos_journey','ht3','vi_jrny_events','vi_nw_history',
  'vi_debt','vi_ov'];

// Clear all demo-seeded data. Pass the real email when converting a demo
// visitor into a signed-up account (keeps them as a real user so demo data
// can't auto-reload); omit it when a user clicks "start with my own data".
function _wipeDemoData(realEmail){
  window._viDemoWiped = true;   // v0.95: from here to the reload, writes to the sample's keys are refused (the tabs still hold the sample in memory)
  try { _DEMO_DATA_KEYS.forEach(function(k){ localStorage.removeItem(k); }); } catch(e){}
  try { invClearAll(); } catch(e){}
  try { localStorage.removeItem('vi_demo_mode'); localStorage.removeItem('vi_demo_variant'); localStorage.removeItem('vi_demo_launch'); } catch(e){}
  // Demo sets vi_pioneer; real pioneer status is re-synced from the profile row.
  try { localStorage.removeItem('vi_pioneer'); } catch(e){}
  try {
    if (realEmail) {
      // Replace the demo persona with the real identity (strips name/job/etc.)
      localStorage.setItem('vi_user', JSON.stringify({ email: String(realEmail).toLowerCase() }));
    } else {
      var u = JSON.parse(localStorage.getItem('vi_user') || 'null');
      if (u && u.email === 'demo@vault-it.app') localStorage.removeItem('vi_user');
      // Prevent demo data auto-reloading for a visitor who opted out.
      localStorage.setItem('vi_declined_demo', 'true');
    }
  } catch(e){}
}

function _initSupabase() {
  if (typeof window.supabase === 'undefined') return;
  _supaClient = window.supabase.createClient(
    'https://legpubblzgknxdtvsant.supabase.co',
    'sb_publishable_AZguCFDmQPTnXxwG7CCIXQ_cT3iIWtz',
    { auth: { lock: function(name, acquireTimeout, fn) { return fn(); } } }   // a stuck cross-tab lock froze sign-in; the session is only used by this tab
  );
  // Handle magic link returns and token refresh — fires when user clicks email link
  _supaClient.auth.onAuthStateChange(async function(event, session) {
    if (event === 'SIGNED_OUT') {
      _supaUser = null; _syncReady = false;
      try { viPlanReset(); } catch (e) {}   // the next person to sign in on this page is asked about their own plan
      var ov = document.getElementById('login-overlay');
      if (ov) { ov.style.display = ''; _showAuthStep('email'); }
      return;
    }
    if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session && session.user) {
      if (_supaUser && _supaUser.id === session.user.id) return;
      _supaUser = session.user;
      // A Google or magic-link return lands here, not in _afterVerified: a different person on a device that still holds someone
      // else's data is asked first, before anything is read from or written to their account (owner, 12 Nov 2026).
      if (!(await _guardAccountSwitch(session.user.email || '', _signInKey(session.user)))) return;
      try { viPlanReset(); viPlanCheck(); } catch (e) {}   // the card wall: ask the server about this account's plan now, not after the data has loaded
      var wiped = _dropDemoBeforeSync(_supaUser.email) || (_viBootDemo && localStorage.getItem('vi_demo_mode') !== 'true');   // v0.95: see _viRestartAfterWipe; also a tab that started on the sample after another tab dropped it
      var hydrated = await _hydrateFromSupabase(_supaUser.id);
      if (wiped) { _viRestartAfterWipe(_supaUser.email, hydrated); return; }
      if (localStorage.getItem('vi_demo_mode') === 'true' && !hydrated) {
        _wipeDemoData(_supaUser.email);
        try { _createSession(_supaUser.email); } catch(e){}
        location.reload();
        return;
      }
      await _syncPioneerFromProfile(_supaUser.id);
      if (!hasValidSession()) _createSession(_supaUser.email);
      viMarkOnboardedUI();
      viCleanAuthUrl();
      try { viWelcomePrefill(); } catch (e) {}
      var ov = document.getElementById('login-overlay');
      if (ov && ov.style.display !== 'none') {
        var askPin = _pinPromptNeeded() && !_viViaGoogle(session);   // a Google sign-in skips the PIN offer (Google already guards the account)
        if (askPin && (_authForgot || _pinLater)) {   // the PIN pad straight after the code only when the user came for a PIN (Forgot PIN, or Set a PIN later)
          _pinSetBuf = ''; _pinSetFirst = ''; _pinSetPhase = 'enter';
          _updatePinDots(0, 'spd');
          var lbl = document.getElementById('auth-setpin-label');
          if (lbl) lbl.textContent = _SETPIN_LABEL;
          _showAuthStep('setpin');
        } else {
          ov.style.display = 'none';
          if (askPin) viPinOfferAfterSignIn();   // owner, 10 Nov 2026: the PIN is offered later, not at sign-up
        }
      }
      if (hydrated) {
        setTimeout(function() {
          try { if(typeof loadState==='function') loadState(); } catch(e) {}
          try { if(typeof updateKPIs==='function') updateKPIs(); } catch(e) {}
          try { if(typeof updateSidebar==='function') updateSidebar(); } catch(e) {}
          try { if(typeof renderCashflow==='function') renderCashflow(); } catch(e) {}
          try { if(typeof renderDebtTab==='function') renderDebtTab(); } catch(e) {}
          try { if(typeof renderAlTab==='function') renderAlTab(); } catch(e) {}
          try { if(typeof renderPioneerCard==='function') renderPioneerCard(); } catch(e) {}
        }, 150);
        showToast('Vault restored ✓');
      } else {
        showToast('Vault ready ✓');
      }
    }
  });
}

// Belt-and-suspenders: re-try init if CDN loaded after DOMContentLoaded
window.addEventListener('load', function() {
  if (!_supaClient) { _initSupabase(); _initSupabaseSession(); }
});

function _supaSync(key) { _markDirty(key); _flushDirty(); }

function _reloadAllState() {
  // Achievements first: the House Builder redraw below pays milestone XP into achState (v0.9.1 E9) and must not write a stale copy over the restored one
  try { var _asr=localStorage.getItem(ACH_KEY); if(_asr){ var _asp=JSON.parse(_asr); achState=Object.assign(achState,_asp); } } catch(e) {}
  // House Builder (deposit saved, target, type, mortgage) — was missing from sync + reload
  try {
    var _hs=localStorage.getItem('ht3');
    if(_hs){ var _hp=JSON.parse(_hs); state=Object.assign(state,_hp); state.prices=Object.assign({},DEFAULTS,_hp.prices||{}); if(!state.apartmentFloor)state.apartmentFloor=5; if(typeof updateUI==='function')updateUI(); }
  } catch(e) {}
  try { var _s=localStorage.getItem(OV_KEY); if(_s){ var _sp=JSON.parse(_s); ovState=Object.assign(ovState,_sp); } } catch(e) {}
  try { var _als=localStorage.getItem(AL_KEY); if(_als){ var _alp=JSON.parse(_als); alState=Object.assign(alState,_alp);alNormalise(); if(_alp.metals)alState.metals=Object.assign(alState.metals,_alp.metals); if(_alp.metalPrices)alState.metalPrices=Object.assign(alState.metalPrices,_alp.metalPrices); if(_alp.crypto)alState.crypto=_alp.crypto; if(_alp.cashAccounts)alState.cashAccounts=_alp.cashAccounts; if(_alp.otherAssets)alState.otherAssets=_alp.otherAssets; if(_alp.liabilities)alState.liabilities=_alp.liabilities; } } catch(e) {}
  try { var _dsr=localStorage.getItem(DEBT_KEY); if(_dsr) debtState=JSON.parse(_dsr); } catch(e) {}
  try { var _bsr=localStorage.getItem(BIZ_KEY); if(_bsr) bizState=JSON.parse(_bsr); if(!bizState.leads)bizState.leads=[]; } catch(e) {}
  try { viSampleAuto(); } catch(e) {}   // v0.95: the account's own rows may still hold the sample (tester 1)
}

var _hydrateErr = '', _hydChanged = false, _needPull = false;
// Signing in on a device that is showing the sample (demo) data: throw the sample away first, so the
// account's real data is loaded and the sample can never be uploaded over it.
function _dropDemoBeforeSync(email) {
  if (localStorage.getItem('vi_demo_mode') !== 'true') return false;
  try { _wipeDemoData(email); } catch (e) {}
  try { _lsOrig.call(localStorage, 'vi_dirty', '[]'); _lsOrig.call(localStorage, 'vi_ts', '{}'); } catch (e) {}
  return true;   // v0.95: the caller restarts the page once the account's rows are in storage; the sample is still in every tab's memory until then
}
// v0.95 (owner, 8 Nov, "replicated with a tester and new user device and email"): a fresh device loads the Alex Morgan sample, and a
// sign-in used to wipe it from storage without a reload, so every tab kept the sample in memory and the onboarding's own save wrote
// it back as the new user's data (House Builder £18,500 and seven dated deposits, budget, assets, achievements), marked for sync.
// Now: wipe, pull the account's own rows into storage, then start the page again from storage. A returning user lands on their
// own figures with no welcome screens (vi_user has their name at first paint); a new user lands on the welcome screens with
// nothing behind them. The sign-in's last words run on the new page from a one-shot marker.
function _viRestartAfterWipe(email, hydrated) {
  try { _createSession(email); } catch (e) {}
  var pin = true; try { pin = _pinPromptNeeded(); } catch (e) {}   // the code check told us whether the account already has a PIN; the new page cannot know
  try { sessionStorage.setItem('vi_after_wipe', JSON.stringify({ r: hydrated ? 'restored' : 'new', pin: !!pin })); } catch (e) {}
  location.reload();
}
function _viFinishAfterWipe() {   // on the restarted page, once the session has been found and the account read
  var m = null; try { m = sessionStorage.getItem('vi_after_wipe'); if (m) sessionStorage.removeItem('vi_after_wipe'); } catch (e) {}
  if (!m || !_supaUser || !_supaUser.email) return false;
  var o = { r: m, pin: true }; try { o = JSON.parse(m); } catch (e) {}
  try { viMarkOnboardedUI(); } catch (e) {}
  // the sign-in's last steps, as the code check would have run them: the PIN offer (shown over the page) and the profile row
  try { _needPin = !!o.pin; var st = document.getElementById('vi-login-prepaint'); if (st) st.remove(); var ov = document.getElementById('login-overlay'); if (ov) ov.style.display = ''; } catch (e) {}
  try { _completeAuth(_supaUser.email); } catch (e) {}
  try { showToast(o.r === 'restored' ? 'Vault restored ✓' : 'Vault ready ✓'); } catch (e) {}
  return true;
}
async function _refreshAuth() {   // an expired access token is the most common reason a read/write is refused
  try { if (_supaClient && _supaClient.auth && _supaClient.auth.refreshSession) { var r = await _withTimeout(_supaClient.auth.refreshSession(), 8000, null); return !!(r && r.data && r.data.session); } } catch (e) {}
  return false;
}
// read the user's rows: supabase-js first, then a direct REST request (with the saved session token)
async function _selectRows(uid) {
  var why = '';
  if (_supaClient && !_sjsStalled) {
    var r;
    try { r = await _withTimeout(_supaClient.from('vault_data').select('key,value,updated_at').eq('user_id', uid).then(function(x) { return x; }, function(e) { return { error: e }; }), 8000, null); }
    catch (e) { r = { error: e }; }
    if (r && r.error && /jwt|expired|401/i.test(String(r.error.message || r.error.code || '')) && await _refreshAuth()) {
      try { r = await _withTimeout(_supaClient.from('vault_data').select('key,value,updated_at').eq('user_id', uid).then(function(x) { return x; }, function(e) { return { error: e }; }), 8000, null); } catch (e) { r = { error: e }; }
    }
    if (r && !r.error && r.data) return { data: r.data };
    why = !r ? 'connection stalled' : String((r.error && (r.error.message || r.error.code)) || 'no data');
    if (!r) _sjsStalled = true;
  } else if (!_supaClient) why = 'sync library not loaded';
  try {
    var tok = await _freshAccessToken(); if (!tok) return { err: why || 'no saved session on this device' };
    var get = async function(tk) {
      var ctl = new AbortController(), t = setTimeout(function() { ctl.abort(); }, 12000);
      var r = await fetch(_SUPA_URL + '/rest/v1/vault_data?select=key,value,updated_at&user_id=eq.' + encodeURIComponent(uid), { headers: { apikey: _SUPA_KEY, authorization: 'Bearer ' + tk }, signal: ctl.signal });
      clearTimeout(t); return r;
    };
    var res = await get(tok);
    if (res.status === 401) { var nt = await _directRefresh(); if (nt) res = await get(nt); }
    if (!res.ok) return { err: (why ? why + '; ' : '') + 'server said ' + res.status };
    var j = await res.json(); return Array.isArray(j) ? { data: j } : { err: 'unexpected reply' };
  } catch (e) { return { err: (why ? why + '; ' : '') + 'no connection' }; }
}
async function _hydrateFromSupabase(uid) {
  if (!_supaClient && !_localAccessToken()) { _hydrateErr = 'sync library not loaded'; return false; }
  try {
    var resp = await _selectRows(uid);
    if (window._viDeleted) return false;
    if (!resp.data) { _hydrateErr = resp.err || 'unknown'; return false; }      // cloud unreachable: leave local data exactly as it is
    _hydrateErr = '';
    var rows = resp.data, have = {}, ts = _lsJSON('vi_ts', {}), pulled = +localStorage.getItem('vi_last_pull') || 0, dirty = _lsJSON('vi_dirty', []);
    var cloudWon = [];
    _hydrating = true;
    try {
      rows.forEach(function(row) {
        if (VI_SERVER_KEYS.indexOf(row.key) > -1) return;   // older synced copies of paid status: the profile decides
        have[row.key] = 1; _cloudSeen[row.key] = row.value;
        var cloud = (row.value !== null && typeof row.value === 'object') ? JSON.stringify(viCleanDeep(row.value)) : String(row.value);
        var local = localStorage.getItem(row.key);
        if (local === cloud) { cloudWon.push(row.key); return; }
        var hasLocal = local != null && local !== '';
        var localWins = false;
        if (hasLocal && _devEstablished && _VAULT_KEYS.indexOf(row.key) > -1) {
          var cloudMs = Date.parse(row.updated_at) || 0;
          if (dirty.indexOf(row.key) > -1) localWins = true;                 // edited here, not yet confirmed by the cloud
          else if (ts[row.key]) localWins = ts[row.key] > cloudMs;            // edited here after the cloud copy was written
          else localWins = !pulled;                                           // older device that predates sync tracking: its data is the only copy
        }
        if (hasLocal && !_isBlankArea(row.key, local) && _isBlankArea(row.key, row.value)) localWins = true;   // an empty cloud copy (new-device defaults) must never erase real data
        if (hasLocal && _isBlankArea(row.key, local) && !_isBlankArea(row.key, row.value) && !_emptiedByUser[row.key]) localWins = false;   // …and empty defaults here must never beat real data in the account
        if (localWins) { _markDirty(row.key); return; }
        if (hasLocal) { try { _lsOrig.call(localStorage, 'vi_bak_' + row.key, JSON.stringify({ at: Date.now(), value: local })); } catch (e) {} }   // never lose what we replace
        _lsOrig.call(localStorage, row.key, cloud); _hydChanged = true;
        cloudWon.push(row.key);
      });
      // what the cloud already has (and we just adopted) is not an unsent edit: this stops a new device's blank defaults from being uploaded over it
      try { _lsOrig.call(localStorage, 'vi_dirty', JSON.stringify(_lsJSON('vi_dirty', []).filter(function(k) { return cloudWon.indexOf(k) < 0; }))); } catch (e) {}
      cloudWon.forEach(function(k) { if (_emptiedByUser[k]) _viEmptiedMark(k, false); });   // the cloud copy won: an emptied mark from before must not outlive it
      _VAULT_KEYS.forEach(function(k) { if (!have[k] && localStorage.getItem(k) != null) _markDirty(k); });   // local-only → push up
      _lsOrig.call(localStorage, 'vi_last_pull', String(Date.now()));
    } finally { _hydrating = false; }
    _reloadAllState();
    _syncReady = true;
    _flushDirty();
    return rows.length > 0;
  } catch(e) { _hydrating = false; return false; }
}

// ── Paid status from the server (secure paid gateway: migration 011 + the stripe-webhook function) ──
// The profile is the only source of paid status (migration 011, applied in production): the device mirrors it, up or down, and
// nothing the browser sets (a URL, an e-mail typed in, a storage flag) makes an account paid. A server without the paid columns
// cannot answer, so nothing is unlocked (the device-side unlocks for an "older server" went with the card wall, 12 Nov 2026).
var _viGateway = null;   // null = not known yet · true = the server keeps paid status · false = older server
var VI_PAID_COLS = 'is_pioneer,is_founder,plan,paid_until,is_beta,stripe_synced_at';
function _viColumnMissing(err) { return !!err && (err.code === '42703' || err.code === 'PGRST204' || /does not exist|could not find .*column/i.test(err.message || '')); }
async function viGatewayCheck() {   // works signed out too: an unknown column is an error whatever the row rules return
  if (_viGateway !== null || !_supaClient) return _viGateway;
  try { var r = await _supaClient.from('profiles').select('stripe_synced_at').limit(1); if (!r.error) _viGateway = true; else if (_viColumnMissing(r.error)) _viGateway = false; } catch (e) {}
  return _viGateway;
}
function viPaidApply(row) {   // mirror the profile onto this device
  var was = viPaid(), paid = !!(row.is_pioneer || row.is_founder);
  try {
    if (paid) localStorage.setItem('vi_pioneer', 'true'); else localStorage.removeItem('vi_pioneer');
    if (row.is_founder) localStorage.setItem('vi_founder', 'true'); else localStorage.removeItem('vi_founder');
    if (row.plan === 'monthly' || row.plan === 'yearly' || row.plan === 'founder') localStorage.setItem('vi_plan', row.plan); else if (!paid) localStorage.removeItem('vi_plan');
    if (row.is_beta) localStorage.setItem('vi_beta', 'true');
    var u = JSON.parse(localStorage.getItem('vi_user') || 'null');
    if (u && !!u.pro !== paid) { u.pro = paid; localStorage.setItem('vi_user', JSON.stringify(u)); if (typeof _vaultItUser !== 'undefined') _vaultItUser = u; }
  } catch (e) {}
  if (paid) {
    var pend = null; try { pend = localStorage.getItem('vi_pay_pending'); localStorage.removeItem('vi_pay_pending'); } catch (e) {}
    if (pend && !was) { try { showToast(row.is_founder ? 'Welcome! Your Lifetime licence is confirmed.' : row.plan === 'monthly' ? 'Welcome, Pioneer. Your plan is confirmed.' : 'Welcome, Pioneer. Your payment is confirmed.'); } catch (e) {} }
  }
  if (was !== paid) { try { if (typeof applyPaywall === 'function') applyPaywall(); } catch (e) {} try { if (typeof renderPioneerCard === 'function') renderPioneerCard(); } catch (e) {} try { if (row.is_founder) viApplyFounderBadge(); } catch (e) {} }
}

// Read this account's paid columns from the server: supabase-js first, then a direct request with the saved sign-in (a frozen
// phone tab can leave supabase-js stalled). The card wall opens on this answer and nothing else (paywall/plan-wall.js), so every
// outcome is told apart:  { row } the profile · { none } signed in, no profile row · { auth } no usable sign-in on this device ·
// { old } an older server without the paid columns · { err } no answer.
async function _viProfileRead(uid) {
  var why = '', lost = false;
  if (_supaClient && !_sjsStalled) {
    var ask = function () { return _withTimeout(_supaClient.from('profiles').select(VI_PAID_COLS).eq('id', uid).single().then(function (x) { return x; }, function (e) { return { error: e }; }), 8000, null); };
    var r; try { r = await ask(); } catch (e) { r = { error: e }; }
    if (r && r.error && /jwt|expired|401/i.test(String(r.error.message || r.error.code || '')) && await _refreshAuth()) { try { r = await ask(); } catch (e) { r = { error: e }; } }
    if (r && !r.error && r.data) return { row: r.data };
    if (r && _viColumnMissing(r.error)) return { old: true };
    if (r && r.error && r.error.code === 'PGRST116') {   // no row came back: the account has none, or supabase-js has lost its sign-in and asked as nobody
      var g = null; try { g = await _withTimeout(_supaClient.auth.getSession(), 3000, null); } catch (e) {}
      if (g && g.data && g.data.session && g.data.session.user && g.data.session.user.id === uid) return { none: true };
      lost = true;
    } else { why = !r ? 'connection stalled' : String((r.error && (r.error.message || r.error.code)) || 'no data'); if (!r) _sjsStalled = true; }
  }
  try {
    var tok = await _freshAccessToken(); if (!tok) return (lost || !_supaClient) ? { auth: true } : { err: why || 'no saved session on this device' };
    var get = async function (tk) {
      var ctl = new AbortController(), t = setTimeout(function () { ctl.abort(); }, 12000);
      var res = await fetch(_SUPA_URL + '/rest/v1/profiles?select=' + VI_PAID_COLS + '&id=eq.' + encodeURIComponent(uid), { headers: { apikey: _SUPA_KEY, authorization: 'Bearer ' + tk }, signal: ctl.signal });
      clearTimeout(t); return res;
    };
    var res = await get(tok);
    if (res.status === 401) { var nt = await _directRefresh(); if (!nt) return { auth: true }; res = await get(nt); if (res.status === 401) return { auth: true }; }
    if (res.status === 400) { var bj = null; try { bj = await res.json(); } catch (e) {} if (_viColumnMissing(bj)) return { old: true }; }
    if (!res.ok) return { err: (why ? why + '; ' : '') + 'server said ' + res.status };
    var j = await res.json(); if (!Array.isArray(j)) return { err: 'unexpected reply' };
    return j.length ? { row: j[0] } : { none: true };
  } catch (e) { return { err: (why ? why + '; ' : '') + 'no connection' }; }
}
async function _syncPioneerFromProfile(uid) {
  if (!uid) return null;
  var row = null, res = null;
  try {
    res = await _viProfileRead(uid);
    if (res.row) { _viGateway = true; row = res.row; viPaidApply(row); }
    else if (res.old) _viGateway = false;   // a server without the paid columns cannot say who is on a plan: nothing is copied down, the wall stays shut
  } catch(e) {}
  try { viPlanAnswer(uid, res && res.old ? null : res); } catch (e) {}   // the card wall follows the server's answer (an older server cannot answer: closed)
  try { viTrialRefresh(); } catch (e) {}   // the account date is known now: the trial line and Settings follow it
  return row;
}

async function _initSupabaseSession() {
  if (!_supaClient) { if (document.readyState === 'complete') { try { viPlanNoSession(); } catch (e) {} } return; }   // the library never loaded: the card wall asks with the saved sign-in, or says to sign in again
  try {
    var res = await _withTimeout(_supaClient.auth.getSession(), 6000, null);
    var session = res && res.data && res.data.session;
    if (!session || !session.user) { try { viPlanNoSession(); } catch (e) {} return; }
    _supaUser = session.user;
    if (!(await _guardAccountSwitch(session.user.email || '', _signInKey(session.user)))) return;   // a session found at start (the page a Google return opens): the same question as the auth-state path, before any read or upload
    try { viPlanCheck(); } catch (e) {}   // the card wall: ask the server about this account's plan now, not after the data has loaded
    var wiped = _dropDemoBeforeSync(_supaUser.email);   // v0.95: see _viRestartAfterWipe
    var hydrated = await _hydrateFromSupabase(_supaUser.id);
    if (wiped) { _viRestartAfterWipe(_supaUser.email, hydrated); return; }
    if (localStorage.getItem('vi_demo_mode') === 'true' && !hydrated) {
      _wipeDemoData(_supaUser.email);
      try { _createSession(_supaUser.email); } catch(e){}
      location.reload();
      return;
    }
    await _syncPioneerFromProfile(_supaUser.id);
    viCleanAuthUrl();
    try { _viFinishAfterWipe(); } catch (e) {}   // v0.95: the page was restarted after a sample wipe
    try { viWelcomePrefill(); } catch (e) {}
    if (!hasValidSession() && _supaUser.email) {
      _createSession(_supaUser.email);
      var ov = document.getElementById('login-overlay');
      if (ov && ov.style.display !== 'none') {
        var pinHash = localStorage.getItem('vi_pin_hash');
        if (pinHash && !_viGoogleJustBack) {   // just back from Google: the user has proved who they are
          if (pinHash === 'srv') { _authOTP = { email: (_supaUser.email || '').toLowerCase() }; _pinMode = 'server'; _pinEnterLen = PIN_LEN; }   // the PIN is checked by the server
          else { _pinMode = 'local'; _pinEnterLen = _localPinLen(); }
          _pinEnterBuf = '';
          _showAuthStep('pin');
        } else {
          ov.style.display = 'none';
        }
      }
    }
    if (hydrated) {
      try { if(typeof loadState==='function') loadState(); } catch(e) {}
      try { if(typeof updateKPIs==='function') updateKPIs(); } catch(e) {}
      try { if(typeof updateSidebar==='function') updateSidebar(); } catch(e) {}
      try { if(typeof renderCashflow==='function') renderCashflow(); } catch(e) {}
      try { if(typeof renderDebtTab==='function') renderDebtTab(); } catch(e) {}
      try { if(typeof renderAlTab==='function') renderAlTab(); } catch(e) {}
      try { if(typeof renderPioneerCard==='function') renderPioneerCard(); } catch(e) {}
    }
    setTimeout(function () { try { viPinOfferMaybe(false); } catch (e) {} }, 2500);   // the PIN, offered on a later visit
  } catch(e) {}
}
