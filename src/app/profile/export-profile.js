// ══════════════════════════════════════════════════════════════
// DATA EXPORT / IMPORT
// ══════════════════════════════════════════════════════════════

function exportData() {
  try {
    var keys = ['pos_ov1', 'pos_al1', 'pos_debt1', 'pos_biz1', 'pos_ach1', 'pos_house', 'pos_journey', 'vi_user', 'vi_debt', 'vi_ov'];
    var bundle = {};
    keys.forEach(function(k) {
      var v = localStorage.getItem(k);
      if (v) { try { bundle[k] = JSON.parse(v); } catch(e) { bundle[k] = v; } }
    });
    bundle._exported  = new Date().toISOString();
    bundle._version   = '0.5';
    var blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href   = url;
    a.download = 'vault-it-backup-' + new Date().toISOString().slice(0,10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported successfully');
  } catch(e) { showToast('Export failed: ' + e.message); }
}

function importData() {if(viBlockEdit())return;
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      try {
        var bundle = JSON.parse(ev.target.result);
        Object.keys(bundle).forEach(function(k) {
          if (k.startsWith('_')) return;
          localStorage.setItem(k, JSON.stringify(bundle[k]));
        });
        showToast('Data imported. Reloading...');
        setTimeout(function() { location.reload(); }, 1200);
      } catch(e) { showToast('Import failed: ' + e.message); }
    };
    reader.readAsText(file);
  };
  input.click();
}

function uploadSbAvatar(input) {
  if (!input.files || !input.files[0]) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var dataUrl = e.target.result;
    var av = document.getElementById('sb-avatar');
    if (av) { av.innerHTML = '<img src="' + dataUrl + '" style="width:100%;height:100%;object-fit:cover;object-position:center top">'; }
    try {
      var user = JSON.parse(localStorage.getItem('vi_user') || '{}');
      user.avatar = dataUrl;
      localStorage.setItem('vi_user', JSON.stringify(user));
      _vaultItUser = user;
    } catch(e) {}
    renderPioneerCard();
  };
  reader.readAsDataURL(input.files[0]);
}

var _sbEditMode = false;

function toggleProfileEdit() {
  _sbEditMode = !_sbEditMode;
  applySbProfileMode();
  var btn = document.getElementById('sb-edit-btn');
  if (btn) btn.textContent = _sbEditMode ? '✓' : '✏';
}

function applySbProfileMode() {
  var u = null;
  try { u = JSON.parse(localStorage.getItem('vi_user') || 'null'); } catch(e) {}
  var isComplete = u && u.name && u.email;
  var fields = document.getElementById('sb-profile-fields');
  var editBtn = document.getElementById('sb-edit-btn');
  var cta = document.getElementById('sb-profile-cta');
  if (isComplete && !_sbEditMode) {
    if (fields) fields.style.display = 'none';
    if (editBtn) editBtn.style.display = 'block';
    if (cta) cta.style.display = 'none';
  } else {
    if (fields) fields.style.display = 'block';
    if (editBtn) editBtn.style.display = isComplete ? 'block' : 'none';
    if (cta) cta.style.display = isComplete ? 'none' : 'block';
  }
}

function renderPioneerCard() {
  var wrap = document.getElementById('sb-pioneer-card');
  if (!wrap) return;
  try {
    var u = JSON.parse(localStorage.getItem('vi_user') || 'null');
    if (!u || !u.name) {
      wrap.innerHTML = '<div style="text-align:center;padding:10px 0;font-family:\'Share Tech Mono\',monospace;font-size:max(.42rem,var(--vi-fs-1));color:var(--t3);letter-spacing:.08em">COMPLETE PROFILE TO UNLOCK CARD</div>';
      applySbProfileMode();
      return;
    }
    // ── Level & XP ──
    var xp      = (typeof wrTotalXp === 'function') ? wrTotalXp() : 0;   // the Wealth Roadmap total, as currentLevel() (R22)
    var lv      = (typeof currentLevel === 'function') ? currentLevel() : {n:'Scout',xp:0};
    var nxt     = (typeof nextLevel   === 'function') ? nextLevel()    : null;
    var lvIdx   = (typeof LVS !== 'undefined') ? LVS.findIndex(function(v){return v.n===lv.n;}) + 1 : 1;
    var xpPct   = nxt ? Math.min(100,Math.round((xp-lv.xp)/(nxt.xp-lv.xp)*100)) : 100;
    var xpToNxt = nxt ? (nxt.xp - xp) : 0;
    var lvColors= ['#44c0b9','#44c0b9','#44c0b9','#c9a84c','#c9a84c','#e040fb','#e040fb','#f0d878','#f0d878'];
    var lvColor = lvColors[Math.min(lvIdx-1, lvColors.length-1)] || '#44c0b9';
    // ── Adoption number ──
    var pioneerNum = u.pioneerNum || localStorage.getItem('vi_pioneer_num') || '';
    var ALPHA_TOTAL = 33;
    var numDisplay = pioneerNum
      ? String(pioneerNum).padStart(3,'0')
      : (isPioneer() ? '···' : '- -');
    var denomDisplay = '/' + String(ALPHA_TOTAL).padStart(3,'0');
    // ── Avatar ──
    var initials = (u.name||'?').split(' ').map(function(w){return w[0];}).join('').toUpperCase().slice(0,2);
    var avatarContent = u.avatar
      ? '<img src="' + u.avatar + '" alt="' + (u.name||'') + '">'
      : '<span style="font-size:1.1rem;color:var(--em)">' + initials + '</span>';
    // ── Rarity ──
    var pioneer = isPioneer();
    var rarityStars = pioneer ? '✦✦✦' : '✦';
    var rarityLabel = pioneer ? 'GENESIS' : 'SAMPLE';   // with the card wall an account in the app is on a plan; without one this card is only seen on the sample
    var joined = u.joined ? new Date(u.joined).getFullYear() : new Date().getFullYear();
    var saveArch  = u.saveArch  || '';
    var spendArch = u.spendArch || '';
    var job   = u.job   || '';
    var dream = u.dream || '';
    wrap.innerHTML =
      '<div class="pioneer-card-wrap">' +
        '<div class="pioneer-card">' +
          // Header band
          '<div class="pc-header">' +
            '<span class="pc-logo wm" role="img" aria-label="Vault-It">Vault<i class="dot"></i><b>It</b></span>' +
            '<div class="pc-rarity">' +
              '<span class="pc-rarity-stars" style="color:' + lvColor + '">' + rarityStars + '</span>' +
              '<span class="pc-rarity-label">' + rarityLabel + '</span>' +
            '</div>' +
          '</div>' +
          // Body — avatar + info
          '<div class="pc-body">' +
            '<div class="pc-avatar-wrap">' +
              '<div class="pc-avatar-inner">' + avatarContent + '</div>' +
            '</div>' +
            '<div class="pc-info">' +
              '<div class="pc-name">' + (u.name||'Pioneer') + '</div>' +
              '<div class="pc-level-row">' +
                '<span class="pc-level-badge" style="background:' + lvColor + '22;color:' + lvColor + ';border:1px solid ' + lvColor + '55">LV.' + lvIdx + ' · ' + lv.n.toUpperCase() + '</span>' +
              '</div>' +
              '<div class="pc-xp-track"><div class="pc-xp-fill" style="width:' + xpPct + '%;background:linear-gradient(90deg,' + lvColor + ',var(--brass))"></div></div>' +
              '<div class="pc-xp-meta">' + xp.toLocaleString() + ' XP' + (nxt ? ' · ' + xpToNxt.toLocaleString() + ' to ' + nxt.n : ' · MAX') + '</div>' +
            '</div>' +
          '</div>' +
          // Roles
          (job || dream ? '<div class="pc-roles">' +
            (job   ? '<div style="font-family:\'Share Tech Mono\',monospace;font-size:max(.38rem,var(--vi-fs-1));color:var(--t2);margin-bottom:1px">▸ ' + job   + '</div>' : '') +
            (dream ? '<div style="font-family:\'Share Tech Mono\',monospace;font-size:max(.38rem,var(--vi-fs-1));color:var(--go)">◈ ' + dream + '</div>' : '') +
          '</div>' : '') +
          // Archetypes
          (saveArch || spendArch ? '<div class="pc-archetypes">' +
            (saveArch  ? '<span class="pc-archetype gold">' + saveArch.split(' ').slice(0,3).join(' ') + '</span>' : '') +
            (spendArch ? '<span class="pc-archetype">' + spendArch.split(' ').slice(0,3).join(' ') + '</span>' : '') +
          '</div>' : '') +
          // Adoption number footer
          '<div class="pc-footer">' +
            '<div>' +
              '<div style="font-family:\'Share Tech Mono\',monospace;font-size:max(.28rem,var(--vi-fs-1));color:rgb(var(--brass-rgb) / .45);letter-spacing:.14em;margin-bottom:1px">PIONEER · GENESIS</div>' +
              '<div class="pc-adoption-num">' + numDisplay + '<span class="pc-adoption-denom">' + denomDisplay + '</span></div>' +
            '</div>' +
            '<div class="pc-footer-meta">' +
              'VAULT-IT<br>' +
              joined + ' · PIONEER<br>' +
              (pioneer ? '◆ PIONEER' : '◈ ' + lv.n.toUpperCase()) +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    applySbProfileMode();
  } catch(e) { console.warn('[Vault-It] renderPioneerCard error:', e); }
}

function saveProfile() {if(viBlockEdit())return;
  var nm    = document.getElementById('sb-profile-name');
  var em    = document.getElementById('sb-profile-email');
  var job   = document.getElementById('sb-profile-job');
  var dream = document.getElementById('sb-profile-dream');
  var sa    = document.getElementById('sb-save-arch');
  var sp    = document.getElementById('sb-spend-arch');
  try {
    var user = JSON.parse(localStorage.getItem('vi_user') || '{}');
    if (nm    && nm.value.trim())    user.name      = nm.value.trim();
    if (em    && em.value.trim())    user.email     = em.value.trim();
    if (job   && job.value.trim())   user.job       = job.value.trim();
    if (dream && dream.value.trim()) user.dream     = dream.value.trim();
    if (sa    && sa.value)           user.saveArch  = sa.value;
    if (sp    && sp.value)           user.spendArch = sp.value;
    user.joined = user.joined || new Date().toISOString();
    localStorage.setItem('vi_user', JSON.stringify(user));
    _vaultItUser = user;
    renderPioneerCard();
    showToast('Profile saved ✓');
    if (user.email) syncProfileToList(user);
  } catch(e) {}
}

function syncProfileToList(user) {
  var formId = localStorage.getItem('convertkit_form_id') || '';
  var apiKey = localStorage.getItem('convertkit_api_key') || '';
  if (formId) {
    var payload = { api_key: apiKey, email_address: user.email, first_name: user.name || '',
      fields: { source: 'vault-it-profile', profession: user.job || '', dream_profession: user.dream || '',
        saving_archetype: user.saveArch || '', spending_archetype: user.spendArch || '',
        joined: user.joined || new Date().toISOString() } };
    fetch('https://api.convertkit.com/v3/forms/' + formId + '/subscribe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    }).catch(function(){});
  }
  syncToNotion(user, 'Profile Form');
}

var _NOTION_DB = '5521f7f5b75b4c588227240b97008c5f';
function syncToNotion(user, source) {
  var token = localStorage.getItem('notion_token') || '';
  if (!token || !user || !user.email) return;
  var goalMap = ['Debt Free', 'Build Savings', 'House Deposit', 'Wealth Building'];
  var props = {
    'Name':              { title: [{ text: { content: user.name || 'Unknown' } }] },
    'Email':             { email: user.email },
    'Profession':        { rich_text: [{ text: { content: user.job || '' } }] },
    'Dream Profession':  { rich_text: [{ text: { content: user.dream || '' } }] },
    'Source':            { select: { name: source || 'Profile Form' } },
    'Status':            { select: { name: 'New' } },
    'Joined':            { date: { start: (user.joined || new Date().toISOString()).split('T')[0] } }
  };
  if (user.saveArch)  props['Saving Archetype']  = { select: { name: user.saveArch } };
  if (user.spendArch) props['Spending Archetype'] = { select: { name: user.spendArch } };
  var goalIdx = parseInt(user.goal) || 0;
  if (goalMap[goalIdx]) props['Goal'] = { select: { name: goalMap[goalIdx] } };
  // Route through CORS proxy since Notion API blocks direct browser requests
  fetch('https://corsproxy.io/?' + encodeURIComponent('https://api.notion.com/v1/pages'), {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type':  'application/json',
      'Notion-Version': '2022-06-28'
    },
    body: JSON.stringify({ parent: { database_id: _NOTION_DB }, properties: props })
  }).then(function(r) {
    if (r.ok) {
      return r.json().then(function(data) {
        showToast('Pioneer synced to Notion ✓');
        // Extract auto-assigned Pioneer ID and store it on the user profile
        try {
          var pid = data && data.properties && data.properties['Pioneer ID'];
          var num = pid && (pid.unique_id || pid.number);
          var pioneerNum = num && (num.number !== undefined ? num.number : num);
          if (pioneerNum) {
            localStorage.setItem('vi_pioneer_num', String(pioneerNum));
            var stored = JSON.parse(localStorage.getItem('vi_user') || '{}');
            stored.pioneerNum = pioneerNum;
            localStorage.setItem('vi_user', JSON.stringify(stored));
            _vaultItUser = stored;
            renderPioneerCard();
          }
        } catch(pe) {}
      });
    } else {
      r.text().then(function(t){ console.warn('[Vault-It] Notion sync failed:',r.status,t); showToast('Notion sync failed ('+r.status+'). Check Settings'); });
    }
  }).catch(function(e){ console.warn('[Vault-It] Notion fetch error:',e.message); showToast('Notion sync error. Check your connection'); });
}

