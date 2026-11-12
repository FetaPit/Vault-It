// ── DATA RESET ────────────────────────────────────────────────
function resetVaultData() {if(viBlockEdit())return;
  if (!confirm('RESET FINANCIAL DATA\n\nThis clears your current:\n• Assets & liabilities\n• Debts\n• Cashflow history\n• Business data\n• Achievements & XP\n\nYour profile, plan, and API keys are kept.\n\nEarlier versions stay in Version history & restore for up to 180 days. To remove everything for good, delete your account in Settings.\n\nContinue?')) return;
  var dataKeys = ['pos_al1','pos_debt1','pos_ov1','pos_biz1','pos_ach1','pos4','pos_house','ht3','pos_journey','vi_jrny_events','vi_nw_history','vi_debt','vi_ov'];
  // clear the account's cloud copy too — otherwise signing in brings the old figures straight back
  _resetCloudKeys(dataKeys).then(function(cloudOk) {
    dataKeys.forEach(function(k) { localStorage.removeItem(k); });
    try { var d = _lsJSON('vi_dirty', []).filter(function(k) { return dataKeys.indexOf(k) < 0; }); _lsOrig.call(localStorage, 'vi_dirty', JSON.stringify(d)); } catch (e) {}
    try { invClearAll(); } catch(e) {}
    showToast(cloudOk ? 'Financial data cleared here and in your account ✓ (earlier versions stay restorable for up to 180 days)' : 'Cleared on this device. Your account copy could not be reached. Sign in and reset again to clear it there too.');
    setTimeout(function() { location.reload(); }, 1600);
  });
}
async function _resetCloudKeys(keys) {
  if (!_supaUser) return false;
  var inList = '(' + keys.map(function(k) { return '"' + k + '"'; }).join(',') + ')';
  try {
    if (_supaClient && !_sjsStalled) {
      var r = await _withTimeout(_supaClient.from('vault_data').delete().eq('user_id', _supaUser.id).in('key', keys).then(function(x) { return x; }, function(e) { return { error: e }; }), 8000, null);
      if (r && !r.error) return true;
    }
    var tok = _localAccessToken(); if (!tok) return false;
    var res = await fetch(_SUPA_URL + '/rest/v1/vault_data?user_id=eq.' + encodeURIComponent(_supaUser.id) + '&key=in.' + encodeURIComponent(inList), { method: 'DELETE', headers: { apikey: _SUPA_KEY, authorization: 'Bearer ' + tok } });
    return res.ok;
  } catch (e) { return false; }
}


// ── YOUR DATA: download a copy, delete the account (UK GDPR access / portability / erasure) ──────────
// Everything the app keeps on this device that is yours (never sign-in tokens, PIN hashes or API keys) plus the copy in the account.
var _VI_EXPORT_KEYS = _VAULT_KEYS.concat(['vi_last_email','vi_waitlist','vi_streak','vi_visit_count','vi_last_visit','vi_hb_design','vi_hb3d','vi_hb_detail','vi_stk_chart','vi_density','vi_bd_fold','vi_debt_view','vi_pioneer_email','vi_pioneer_num','vi_founder_num','vi_founder_email','vi_network_optin','vi_wallet_addr']);
var _VI_NOT_EXPORTED = /(^sb-|pin|token|secret|password|api[_-]?key|_key$|emailjs|notion|convertkit|_tl_|auth_code|verifier|^vi_(ts|dirty|last_sync|session)$)/i;   // safety net on top of the allow-list
async function buildMyDataBundle() {
  var out = { app: 'Vault-It', exported: new Date().toISOString(), account: { email: (_supaUser && _supaUser.email) || localStorage.getItem('vi_last_email') || null },
    note: 'A copy of your Vault-It data. "onThisDevice" is what this browser stores for you; "inYourAccount" is the copy in your cloud account (the latest 200 saved versions). Sign-in tokens, PIN hashes and API keys are left out on purpose. Not included: Wealth Inventory photos and any 3D house design you uploaded (they live only in this browser), and technical security records held by our providers. Email hello@vault-it.co for those.',
    onThisDevice: {}, inYourAccount: null, problems: [] };
  var owner = (localStorage.getItem('vi_last_email') || '').toLowerCase(), acct = ((_supaUser && _supaUser.email) || '').toLowerCase();
  if (owner && acct && owner !== acct) out.problems.push('The data on this device belongs to a different sign-in (' + owner + '), so it was left out of this file.');
  else try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i); if (_VI_NOT_EXPORTED.test(k)) continue;
      if (_VI_EXPORT_KEYS.indexOf(k) < 0 && !/^vi_(bak|snap)_/.test(k)) continue;
      var v = localStorage.getItem(k); try { out.onThisDevice[k] = JSON.parse(v); } catch (e) { out.onThisDevice[k] = v; }
    }
  } catch (e) { out.problems.push('device: ' + e.message); }
  if (_supaUser && _supaClient) {
    var cloud = { profile: null, vaultData: [], netWorthHistory: [], versionHistory: [] };
    var grab = async function(label, make, put) {
      try { var r = await _withTimeout(make().then(function(x) { return x; }, function(e) { return { error: e }; }), 12000, null); if (!r) out.problems.push(label + ': timed out'); else if (r.error) out.problems.push(label + ': ' + (r.error.message || r.error)); else put(r.data); }
      catch (e) { out.problems.push(label + ': ' + (e && e.message || e)); }
    };
    await grab('profile', function() { return _supaClient.from('profiles').select('*').eq('id', _supaUser.id).maybeSingle(); }, function(d) { cloud.profile = d; });
    await grab('saved data', function() { return _supaClient.from('vault_data').select('key,value,updated_at').eq('user_id', _supaUser.id); }, function(d) { cloud.vaultData = d || []; });
    await grab('net-worth history', function() { return _supaClient.from('nw_history').select('recorded_at,value').eq('user_id', _supaUser.id); }, function(d) { cloud.netWorthHistory = d || []; });
    await grab('version history', function() { return _supaClient.rpc('vault_history_list', { p_limit: 200 }); }, function(d) { cloud.versionHistory = d || []; if (cloud.versionHistory.length >= 200) out.problems.push('Only your latest 200 saved versions are included; email hello@vault-it.co for the rest.'); });
    out.inYourAccount = cloud;
  } else out.problems.push('Not signed in on this device, so the copy in your account is not included. Sign in and download again to include it.');
  return out;
}
async function exportMyData(quiet) {
  if (!quiet) showToast('Preparing your data…');
  try {
    var bundle = await buildMyDataBundle();
    var blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'vault-it-my-data-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function() { URL.revokeObjectURL(url); }, 4000);
    if (!quiet) showToast(bundle.problems.length ? 'Downloaded, with ' + bundle.problems.length + ' note' + (bundle.problems.length === 1 ? '' : 's') + ' inside the file' : 'Your data has been downloaded ✓');
    return bundle;
  } catch (e) { if (!quiet) showToast('Could not prepare your data: ' + (e && e.message || e)); return null; }
}

var _delBusy = false;
async function exportFromDeleteDialog(btn) {   // feedback inside the dialog (toasts sit behind it), and a warning if the file is incomplete
  var st = document.getElementById('del-status'), label = btn.textContent; btn.disabled = true; btn.textContent = 'Preparing your data…';
  if (st) { st.style.color = 'var(--t2)'; st.textContent = ''; }
  var b = await exportMyData(true);
  btn.disabled = false; btn.textContent = label;
  if (!st) return;
  if (!b) { st.style.color = '#e74c3c'; st.textContent = 'Could not prepare your data. Nothing has been deleted. Try again before deleting.'; }
  else if (b.problems.length) { st.style.color = '#e0b44a'; st.textContent = '⚠ Downloaded, but: ' + b.problems.join(' · ') + ' Make sure this is enough before you delete.'; }
  else { st.style.color = 'var(--em)'; st.textContent = '✓ Downloaded. Check your Downloads folder before deleting.'; }
}
function openDeleteAccount() {
  if (!_supaUser) { showToast('Sign in to your account first. Then you can delete it'); try { viReauth(); } catch (e) {} return; }
  var old = document.getElementById('delete-modal'); if (old) old.remove();
  var m = document.createElement('div'); m.id = 'delete-modal';
  m.style.cssText = 'position:fixed;inset:0;z-index:20001;background:rgb(var(--panel-rgb) / .95);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);padding:12px';
  m.innerHTML = '<div style="background:var(--c1);border:1px solid rgba(231,76,60,.5);border-radius:10px;width:min(460px,94vw);max-height:90vh;overflow-y:auto;padding:22px 20px;position:relative;font-family:\'DM Sans\',sans-serif">'
    + '<button onclick="document.getElementById(\'delete-modal\').remove()" aria-label="Close" style="position:absolute;top:10px;right:12px;background:none;border:none;color:var(--t3);font-size:.9rem;cursor:pointer"><svg class="vi-ic g" role="img" aria-label="Close"><use href="#vi-close"/></svg></button>'
    + '<div style="font-family:\'Syne\',sans-serif;font-size:.85rem;font-weight:800;color:#e74c3c;margin-bottom:10px">Delete your account</div>'
    + '<div style="font-size:max(.6rem,var(--vi-fs-2));color:var(--t2);line-height:1.7;margin-bottom:12px">This permanently erases your Vault-It account and <strong>everything in it</strong>: your budget, debts, assets, house plan, net-worth history, saved versions and PIN, in the cloud and on this device. <strong>It cannot be undone.</strong> Short-lived backups and logs kept by our providers clear out within days. Other devices where you have used Vault-It keep a local copy until you clear it there.</div>'
    + '<button id="del-export" class="btn-add-data" style="width:100%;margin-bottom:12px" onclick="exportFromDeleteDialog(this)">⬇ Download my data first</button>'
    + '<label style="font-size:max(.52rem,var(--vi-fs-1));color:var(--t3);display:block;margin-bottom:4px">Your 6-digit PIN <span style="opacity:.7">(leave empty only if you never set one)</span></label>'
    + '<input id="del-pin" class="al-inp" type="password" inputmode="numeric" autocomplete="off" maxlength="6" placeholder="••••••" style="width:100%;margin-bottom:10px">'
    + '<label style="font-size:max(.52rem,var(--vi-fs-1));color:var(--t3);display:block;margin-bottom:4px">Type <strong style="color:#e74c3c">DELETE</strong> to confirm</label>'
    + '<input id="del-typed" class="al-inp" type="text" autocomplete="off" autocapitalize="characters" placeholder="DELETE" style="width:100%;margin-bottom:10px" oninput="document.getElementById(\'del-go\').disabled=this.value.trim()!==\'DELETE\'">'
    + '<div id="del-status" style="font-size:max(.55rem,var(--vi-fs-1));color:#e74c3c;min-height:16px;line-height:1.5;margin-bottom:8px"></div>'
    + '<div style="display:flex;gap:8px"><button class="btn-add-data" style="flex:1;background:transparent;border-color:var(--t3);color:var(--t3)" onclick="document.getElementById(\'delete-modal\').remove()">Cancel</button>'
    + '<button id="del-go" disabled class="btn-add-data" style="flex:1;background:rgba(231,76,60,.15);border-color:#e74c3c;color:#e74c3c" onclick="confirmDeleteAccount()">Delete everything</button></div></div>';
  document.body.appendChild(m);
  var sm = document.getElementById('settings-modal'); if (sm) sm.style.display = 'none';
}
async function confirmDeleteAccount() {
  if (_delBusy) return;
  var st = document.getElementById('del-status'), go = document.getElementById('del-go');
  var say = function(t) { if (st) st.textContent = t; };
  if (((document.getElementById('del-typed') || {}).value || '').trim() !== 'DELETE') { say('Type DELETE to confirm.'); return; }
  var pin = ((document.getElementById('del-pin') || {}).value || '').trim();
  _delBusy = true; if (go) { go.disabled = true; go.textContent = 'Deleting…'; } say('');
  var undo = function() { _delBusy = false; if (go) { go.disabled = false; go.textContent = 'Delete everything'; } };
  var r = await _pinCall({ action: 'delete', pin: pin }, 45000, true);   // sent once: never repeated behind your back
  if (!r) { undo(); say('We did not get an answer, so we cannot tell whether anything was deleted. Check your connection, then try again. If the account has already gone you will be told.'); return; }
  if (r.ok) { _finishAccountDeletion(); return; }
  undo();
  if (r.error === 'partial') say('Your data has been erased, but removing the sign-in itself did not complete. Press Delete everything again to finish.');
  else if (r.error === 'locked') say('Too many wrong PINs. Try again in ' + Math.max(1, Math.ceil((r.retryAfter || 900) / 60)) + ' min, or sign out, sign back in with an email code (Forgot PIN) and delete straight away.');
  else if (r.error === 'rate_limited') say('Too many attempts from this network. Try again in ' + Math.max(1, Math.ceil((r.retryAfter || 60) / 60)) + ' min.');
  else if (r.error === 'invalid') say(r.remaining ? 'That PIN is not right: ' + r.remaining + ' attempt' + (r.remaining === 1 ? '' : 's') + ' left.' : 'Enter your 6-digit PIN.');
  else if (r.error === 'recent_login') say('For your safety you need to have signed in within the last 15 minutes. Sign out, sign back in with an email code, then delete straight away.');
  else if (r.error === 'auth') say('Your sign-in has expired, or the account has already been deleted. Sign in again to check.');
  else say('Something went wrong on our side. Please try again. Your data may or may not have been removed yet, and trying again is safe.');
}
async function _finishAccountDeletion() {
  window._viDeleted = true;   // from here nothing may write data back (sync, auto-refresh, saves)
  try { clearTimeout(_flushT); } catch (e) {}
  _supaUser = null; _syncReady = false;
  try { if (_supaClient) await _withTimeout(_supaClient.auth.signOut({ scope: 'local' }).catch(function() {}), 2500, null); } catch (e) {}
  try { _invDB && _invDB.close(); _invDB = null; await invClearAll(); } catch (e) {}   // Wealth Inventory photos
  _wipeDeviceData(false);
  try { await _wipeIdb('vi_photos'); await _wipeIdb('vaultit-house'); } catch (e) {}   // anything still open is removed when the page restarts
  location.replace(location.pathname + '?deleted=1');   // a fresh page: no timer or in-memory state survives, then the confirmation is shown
}

