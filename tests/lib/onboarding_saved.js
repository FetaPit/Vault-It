// Shared by test_onboarding_friction.js: what the welcome wizard leaves in localStorage, with volatile parts
// (timestamps, ids, today's date) normalised, so the 3-screen wizard can be compared with what the 6-screen one saved.
const SKIP = /^(vi-fb-visits|vi_ts$|vi_snap_|vi_session|vi-theme|vi_declined_demo|vi_ts_|vi_dirty|vi_last_sync|vi_pageviews|vi_fb_|vi_hb_entry|vi_tour|vi_tester|vi_streak|vi_visit|vi_checkin_seen|vi_pin_offer|vi_trial|vi_last_visit|sb-|vi_nav|vi_ach|pos_ach1|vi_xp|vi_events)/;
function norm(v) {
  return v.replace(/\d{4}-\d\d-\d\dT[\d:.]+Z/g, 'ISO').replace(/\b1\d{12}\b/g, 'NOW').replace(/\b\d\d\/\d\d\/\d{4}\b/g, 'DATE');
}
async function dump(p) {
  const all = await p.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });
  const out = {};
  const today = await p.evaluate(() => new Date().getDay());
  Object.keys(all).sort().forEach(k => { if (!SKIP.test(k)) out[k] = norm(all[k]).replace('"checkin":{"day":' + today + ',', '"checkin":{"day":"TODAY",'); });
  return out;
}
module.exports = { dump, SKIP };
