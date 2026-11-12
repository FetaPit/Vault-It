// ═══════════════════════════════════════════════════════════════
// VAULT NETWORK — Founding Licence, Shibarium NFT, Community
// ═══════════════════════════════════════════════════════════════

function isFounder() { return localStorage.getItem('vi_founder') === 'true'; }

function purchaseFoundingLicence() {
  var link = VI_FOUNDING_LINK || localStorage.getItem('vi_founding_link') || '';
  if (!link) {
    showToast('Paste your Stripe £7.77 link in ⚙ Settings → Vault Network');
    var sm = document.getElementById('settings-modal');
    if (sm) {
      showSettings();
      setTimeout(function() {
        var flEl = document.getElementById('set-founding-link');
        if (flEl) { flEl.focus(); flEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      }, 350);
    }
    return;
  }
  var u = {}; try { u = JSON.parse(localStorage.getItem('vi_user') || '{}'); } catch(e) {}
  var url = link + (u.email ? '?prefilled_email=' + encodeURIComponent(u.email) : '');
  window.open(url, '_blank', 'noopener,noreferrer');
  showToast('Opening secure checkout: £7.77 one-time · Prepaid cards accepted');
}

function verifyFoundingPurchase() {
  var u = null; try { u = JSON.parse(localStorage.getItem('vi_user') || 'null'); } catch(e) {}
  if (!u || !u.email) { showToast('Complete your profile first'); return; }
  var code = window.prompt('Enter the email you used at checkout to verify your Founding Licence:');
  if (!code) return;
  if (code.trim().toLowerCase() === u.email.toLowerCase()) {
    var taken = parseInt(localStorage.getItem('vi_founder_taken') || '0') + 1;
    localStorage.setItem('vi_founder', 'true');
    localStorage.setItem('vi_founder_email', u.email.toLowerCase());
    localStorage.setItem('vi_founder_num', taken);
    localStorage.setItem('vi_founder_taken', taken);
    showToast('◈ Founding Licence verified. Welcome, Pioneer #' + taken + '!');
    renderNetworkTab();
  } else {
    showToast('Email doesn\'t match your profile. Update your profile email to match checkout.');
  }
}

// ── ethers.js loader (lazy CDN) ───────────────────────────────
function _loadEthers() {
  return new Promise(function(resolve, reject) {
    if (window.ethers) { resolve(window.ethers); return; }
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/ethers/6.13.5/ethers.umd.min.js';
    s.onload = function() { resolve(window.ethers); };
    s.onerror = function() { reject(new Error('ethers.js failed to load')); };
    document.head.appendChild(s);
  });
}

// ── Web3 wallet connection ────────────────────────────────────
async function connectWeb3Wallet() {
  if (!window.ethereum) {
    showToast('No Web3 wallet detected. Install MetaMask to continue');
    return;
  }
  try {
    var accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (!accounts || !accounts[0]) { showToast('Wallet connection cancelled'); return; }
    localStorage.setItem('vi_wallet_addr', accounts[0]);
    var addrEl = document.getElementById('nw-wallet-addr');
    if (addrEl) { addrEl.style.display = 'block'; addrEl.textContent = accounts[0]; }
    var btn = document.getElementById('nw-connect-btn');
    if (btn) { btn.textContent = '✓ Connected'; btn.style.color = 'var(--gr)'; btn.style.borderColor = 'var(--gr)'; }
    var step1 = document.getElementById('nw-step1-row');
    if (step1) step1.classList.add('nw-step-done');
    var switchBtn = document.getElementById('nw-switch-btn');
    if (switchBtn) { switchBtn.removeAttribute('disabled'); switchBtn.style.color = 'var(--em)'; switchBtn.style.borderColor = 'rgb(var(--teal-rgb) / .35)'; }
    showToast('Wallet connected: ' + accounts[0].slice(0,6) + '…' + accounts[0].slice(-4));
  } catch(e) {
    showToast('Wallet connection failed: ' + (e.message || e));
  }
}

// ── Switch to Shibarium ───────────────────────────────────────
async function switchToShibarium() {
  if (!window.ethereum) { showToast('No Web3 wallet detected'); return; }
  try {
    await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: SHIBARIUM_MAINNET.chainId }] });
  } catch(e) {
    if (e.code === 4902) {
      try {
        await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [SHIBARIUM_MAINNET] });
      } catch(e2) { showToast('Failed to add Shibarium: ' + (e2.message || e2)); return; }
    } else { showToast('Network switch failed: ' + (e.message || e)); return; }
  }
  var step2 = document.getElementById('nw-step2-row');
  if (step2) step2.classList.add('nw-step-done');
  var switchBtn = document.getElementById('nw-switch-btn');
  if (switchBtn) { switchBtn.textContent = '✓ On Shibarium'; switchBtn.style.color = 'var(--gr)'; }
  var mintBtn = document.getElementById('nw-mint-btn');
  if (mintBtn) { mintBtn.removeAttribute('disabled'); mintBtn.style.opacity = '1'; }
  showToast('Switched to Shibarium. Ready to mint');
}

// ── Mint Pioneer Card NFT ─────────────────────────────────────
async function mintOnShibarium() {
  var resultEl = document.getElementById('nw-mint-result');
  if (resultEl) resultEl.innerHTML = '<span style="color:var(--em)">Loading ethers.js…</span>';
  try {
    var ethers = await _loadEthers();
    var addr = localStorage.getItem('vi_wallet_addr') || '';
    if (!addr) { showToast('Connect your wallet first'); return; }
    if (!VAULT_NFT_CONTRACT) {
      showToast('NFT contract not deployed yet. Add the address in Settings → Vault Network');
      if (resultEl) resultEl.innerHTML = '<span style="color:var(--t3)">Contract address not set. Add it in Settings → Vault Network.</span>';
      return;
    }
    var u = {}; try { u = JSON.parse(localStorage.getItem('vi_user') || '{}'); } catch(e) {}
    var founderNum = localStorage.getItem('vi_founder_num') || '?';
    // Minimal ERC-721 mint ABI
    var abi = ['function mint(address to, string memory tokenURI) external returns (uint256)'];
    var provider = new ethers.BrowserProvider(window.ethereum);
    var signer = await provider.getSigner();
    var contract = new ethers.Contract(VAULT_NFT_CONTRACT, abi, signer);
    // Metadata encoded as data URI
    var meta = JSON.stringify({
      name: 'Vault-It Pioneer #' + founderNum,
      description: 'Founding member of Vault-It, Pioneer #' + founderNum + ' of 33.',
      attributes: [
        { trait_type: 'Name', value: u.name || 'Pioneer' },
        { trait_type: 'Adoption Number', value: parseInt(founderNum) || 0 },
        { trait_type: 'Status', value: 'Founding Master' }
      ]
    });
    var tokenURI = 'data:application/json;base64,' + btoa(unescape(encodeURIComponent(meta)));
    if (resultEl) resultEl.innerHTML = '<span style="color:var(--em)">Confirm in wallet…</span>';
    var tx = await contract.mint(addr, tokenURI);
    if (resultEl) resultEl.innerHTML = '<span style="color:var(--em)">Mining transaction…</span>';
    var receipt = await tx.wait();
    localStorage.setItem('vi_nft_tx', receipt.hash || tx.hash || '');
    var step3 = document.getElementById('nw-step3-row');
    if (step3) step3.classList.add('nw-step-done');
    var mintBtn = document.getElementById('nw-mint-btn');
    if (mintBtn) { mintBtn.textContent = '✓ Minted'; mintBtn.style.color = 'var(--gr)'; }
    if (resultEl) resultEl.innerHTML = '<span style="color:var(--gr)"><svg class="vi-ic g" aria-hidden="true"><use href="#vi-check"/></svg> NFT minted · Tx: ' + (receipt.hash||'').slice(0,10) + '…</span>';
    showToast('Pioneer Card minted on Shibarium! 🎉');
  } catch(e) {
    var msg = e.message || String(e);
    if (resultEl) resultEl.innerHTML = '<span style="color:var(--re)">Error: ' + msg.slice(0,80) + '</span>';
    showToast('Mint failed: ' + msg.slice(0,60));
  }
}

// ── Network opt-in toggle ─────────────────────────────────────
function toggleNetworkOptIn() {
  var current = localStorage.getItem('vi_network_optin') === 'true';
  var next = !current;
  localStorage.setItem('vi_network_optin', next ? 'true' : 'false');
  _renderNetworkToggle(next);
  showToast(next ? 'You\'re now visible on the Vault Network' : 'Network profile hidden');
  _syncNetworkOptIn(next);
}

function _renderNetworkToggle(on) {
  var toggle = document.getElementById('nw-optin-toggle');
  var thumb = document.getElementById('nw-optin-thumb');
  var msg = document.getElementById('nw-optin-msg');
  if (toggle) toggle.style.background = on ? 'var(--em)' : 'var(--c3)';
  if (thumb) { thumb.style.left = on ? '22px' : '2px'; thumb.style.background = on ? '#000' : 'var(--t3)'; }
  if (msg) msg.textContent = on ? 'Your profile is visible to fellow founders on the Vault Network.' : 'Network opt-in is off. Your profile is private.';
}

function _syncNetworkOptIn(on) {
  var u = {}; try { u = JSON.parse(localStorage.getItem('vi_user') || '{}'); } catch(e) {}
  if (!u.email) return;
  var token = localStorage.getItem('notion_token') || '';
  if (!token) return;
  var dbId = localStorage.getItem('vi_notion_db_id') || '';
  if (!dbId) return;
  var pageId = localStorage.getItem('vi_notion_page_id') || '';
  if (!pageId) return;
  var body = { properties: { 'Network Opt-In': { checkbox: on } } };
  fetch('https://corsproxy.io/?' + encodeURIComponent('https://api.notion.com/v1/pages/' + pageId), {
    method: 'PATCH',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', 'Notion-Version': '2022-06-28' },
    body: JSON.stringify(body)
  }).catch(function() {});
}

// ── Community profile grid ────────────────────────────────────
function loadCommunityProfiles() {
  var grid = document.getElementById('nw-community-grid');
  if (!grid) return;
  var token = localStorage.getItem('notion_token') || '';
  var dbId = localStorage.getItem('vi_notion_db_id') || '';
  if (!token || !dbId) {
    grid.innerHTML = '<div style="font-size:max(.48rem,var(--vi-fs-1));color:var(--t3);text-align:center;padding:20px 0">Connect Notion in Settings → Connections to see the live grid.</div>';
    return;
  }
  grid.innerHTML = '<div style="font-size:max(.48rem,var(--vi-fs-1));color:var(--t3);text-align:center;padding:20px 0">Loading founders…</div>';
  fetch('https://corsproxy.io/?' + encodeURIComponent('https://api.notion.com/v1/databases/' + dbId + '/query'), {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', 'Notion-Version': '2022-06-28' },
    body: JSON.stringify({ filter: { property: 'Network Opt-In', checkbox: { equals: true } }, page_size: 33 })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    var pages = (data.results || []);
    if (!pages.length) {
      grid.innerHTML = '<div style="font-size:max(.48rem,var(--vi-fs-1));color:var(--t3);text-align:center;padding:20px 0">No founders have opted in yet. Be the first!</div>';
      return;
    }
    var html = '<div class="nw-profile-grid">';
    pages.forEach(function(p, i) {
      var props = p.properties || {};
      var nameArr = (props['Name'] && props['Name'].title) || [];
      var name = nameArr.length ? (nameArr[0].plain_text || 'Pioneer') : 'Pioneer';
      var initials = name.split(' ').slice(0,2).map(function(w){return w[0]||'';}).join('').toUpperCase() || '?';
      var numProp = props['Adoption Number'];
      var num = numProp ? (numProp.number || (i+1)) : (i+1);
      html += '<div class="nw-profile-chip" onclick="openNetworkProfile(\'' + name.replace(/'/g,'') + '\',' + num + ')">'
        + '<div class="nw-pc-avatar">' + initials + '</div>'
        + '<div class="nw-pc-name">' + name + '</div>'
        + '<div class="nw-pc-num">#' + num + '</div>'
        + '</div>';
    });
    html += '</div>';
    grid.innerHTML = html;
  })
  .catch(function() {
    grid.innerHTML = '<div style="font-size:max(.48rem,var(--vi-fs-1));color:var(--t3);text-align:center;padding:20px 0">Could not load profiles. Check your Notion token in Settings.</div>';
  });
}

function openNetworkProfile(name, num) {
  showToast('Direct collaboration features coming in v0.8: ' + name + ' #' + num);
}

// ── Share profile URL ─────────────────────────────────────────
function shareNetworkProfile() {
  var u = {}; try { u = JSON.parse(localStorage.getItem('vi_user') || '{}'); } catch(e) {}
  var num = localStorage.getItem('vi_founder_num') || '?';
  var url = window.location.origin + window.location.pathname + '?pioneer=' + encodeURIComponent(u.email || '') + '&num=' + num;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(function() { showToast('Profile URL copied to clipboard'); }).catch(function() { prompt('Copy your profile URL:', url); });
  } else {
    prompt('Copy your profile URL:', url);
  }
}

// ── Main render ───────────────────────────────────────────────
function renderNetworkTab() {
  var founder = isFounder();
  var optIn = localStorage.getItem('vi_network_optin') === 'true';
  var founderNum = localStorage.getItem('vi_founder_num') || '?';

  // Founding card state
  var inactive = document.getElementById('nw-founding-inactive');
  var active = document.getElementById('nw-founding-active');
  var badge = document.getElementById('nw-founding-badge');
  var adoptionNum = document.getElementById('nw-adoption-num');
  var adoptionDisplay = document.getElementById('nw-adoption-display');
  var taken = parseInt(localStorage.getItem('vi_founder_taken') || '0');
  var remaining = Math.max(0, 33 - taken);

  if (inactive) inactive.style.display = founder ? 'none' : 'block';
  if (active)   active.style.display   = founder ? 'block' : 'none';
  if (badge)    badge.innerHTML = founder
    ? '<span style="color:var(--go);background:rgb(var(--brass-rgb) / .12);padding:2px 7px;border-radius:10px;border:1px solid rgb(var(--brass-rgb) / .3)">◆ ACTIVE</span>'
    : '<span style="color:var(--t3);font-size:max(.38rem,var(--vi-fs-1))">' + remaining + ' slots remain</span>';
  if (adoptionNum) adoptionNum.textContent = '#' + (founder ? founderNum : (taken + 1));
  if (adoptionDisplay) adoptionDisplay.textContent = 'Pioneer #' + founderNum + ' of 33';

  // Mint section
  var mintLocked = document.getElementById('nw-mint-locked');
  var mintSteps  = document.getElementById('nw-mint-steps');
  if (mintLocked) mintLocked.style.display = founder ? 'none' : 'block';
  if (mintSteps)  mintSteps.style.display  = founder ? 'block' : 'none';

  // Restore wallet state if previously connected
  var savedAddr = localStorage.getItem('vi_wallet_addr') || '';
  if (founder && savedAddr) {
    var addrEl = document.getElementById('nw-wallet-addr');
    var btn = document.getElementById('nw-connect-btn');
    var step1 = document.getElementById('nw-step1-row');
    if (addrEl) { addrEl.style.display = 'block'; addrEl.textContent = savedAddr; }
    if (btn) { btn.textContent = '✓ Connected'; btn.style.color = 'var(--gr)'; btn.style.borderColor = 'var(--gr)'; }
    if (step1) step1.classList.add('nw-step-done');
    var switchBtn = document.getElementById('nw-switch-btn');
    if (switchBtn) { switchBtn.removeAttribute('disabled'); switchBtn.style.color = 'var(--em)'; switchBtn.style.borderColor = 'rgb(var(--teal-rgb) / .35)'; }
  }

  // NFT minted state
  var nftTx = localStorage.getItem('vi_nft_tx') || '';
  if (nftTx) {
    var mintBtn = document.getElementById('nw-mint-btn');
    var resultEl = document.getElementById('nw-mint-result');
    var step3 = document.getElementById('nw-step3-row');
    if (mintBtn) { mintBtn.textContent = '✓ Minted'; mintBtn.style.color = 'var(--gr)'; }
    if (resultEl) resultEl.innerHTML = '<span style="color:var(--gr)"><svg class="vi-ic g" aria-hidden="true"><use href="#vi-check"/></svg> Minted · Tx: ' + nftTx.slice(0,10) + '…</span>';
    if (step3) step3.classList.add('nw-step-done');
    var step2Row = document.getElementById('nw-step2-row');
    if (step2Row) step2Row.classList.add('nw-step-done');
  }

  // Opt-in toggle
  _renderNetworkToggle(optIn);

  // Load community grid
  loadCommunityProfiles();
}

