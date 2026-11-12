// ── FOUNDER BADGE ─────────────────────────────────────────
function viApplyFounderBadge() {
  try {
    var u = JSON.parse(localStorage.getItem('vi_user') || 'null');
    if (!u || !u.founder) return;
    // Inject badge next to logo if not already there
    var logo = document.querySelector('.logo');
    if (logo && !document.getElementById('vi-founder-badge-nav')) {
      var badge = document.createElement('span');
      badge.id = 'vi-founder-badge-nav';
      badge.className = 'vi-founder-badge';
      badge.textContent = 'FOUNDER';
      logo.parentNode.insertBefore(badge, logo.nextSibling);
    }
  } catch(e) {}
}

// ── CAMPAIGN MODAL ─────────────────────────────────────────
function viCampaignPaint() {   // owner, 3 Nov: the Founding badge says just "N left": the Stripe cap (founderSlots) minus real paid founders from campaign_counts(); "100 places" until the counts load
  var c = VI_CAMPAIGN, e = document.getElementById('camp-founder-slots'); if (!e) return;
  var known = typeof c.founderTaken === 'number';
  // owner, 4 Nov: "100 founding places · Be one of the first" until a real founder has paid; then the real count left. Never seeded.
  var taken = known ? Math.min(c.founderSlots, Math.max(0, c.founderTaken)) : 0;
  e.textContent = taken > 0 ? (c.founderSlots - taken) + ' of ' + c.founderSlots + ' founding places left' : c.founderSlots + ' founding places · Be one of the first';
}
// the crowdfund cards: every price and button comes from VI_PLANS through viPricePaint, so a price change there is the only edit
function viCampaignPrices() { viPricePaint(); }
// real counts only: the server's campaign_counts() gives backers per plan and nothing personal; until it is live (or offline) the counts stay 0
function viCampaignLoad() {
  try {
    fetch(_SUPA_URL + '/rest/v1/rpc/campaign_counts', { method: 'POST', headers: { 'content-type': 'application/json', apikey: _SUPA_KEY, authorization: 'Bearer ' + _SUPA_KEY }, body: '{}' })
      .then(function (r) { if (!r.ok) throw new Error('campaign_counts ' + r.status); return r.json(); })
      .then(function (rows) {
        if (!Array.isArray(rows)) return;
        var total = 0, founders = 0;
        rows.forEach(function (x) { var n = Math.max(0, parseInt(x && x.backers, 10) || 0); total += n; if (x && x.plan === 'founder') founders += n; });
        VI_CAMPAIGN.backers = total; VI_CAMPAIGN.founderTaken = founders; viCampaignPaint();
      }).catch(function () {});
  } catch (e) {}
}
function viShowCampaign() {
  var modal = document.getElementById('vi-campaign-modal');
  if (!modal) return;
  viCampaignPrices(); viCampaignPaint(); viCampaignLoad();
  modal.classList.remove('hidden');
}


