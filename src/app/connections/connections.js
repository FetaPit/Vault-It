// ═══════════════════════════════════════════════════════════════
// CONNECTIONS JS
// ═══════════════════════════════════════════════════════════════
// CONNS declared above init block

// ── Bank, broker, exchange and platform connectors are locked under Pro for a future release (owner, 5 Nov 2026) ──
// Nothing connects, asks for a key, signs in or makes a request. A saved "connected" flag from an older build is left alone and ignored.
function connectPlatform(id) {
  var c = CONNS.find(function(x){ return x.id === id; });
  showToast((c ? c.name : 'That connection') + ' is coming to Pro in a future release');
}

// ── Free live price feeds (kept as on live: v0.9.2 owner decision, 5 Nov; a server-side feed comes later) ──
function fetchCoinGeckoFree(cb) {
  var key = localStorage.getItem('coingecko_api_key') || '';
  var url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=gbp&order=market_cap_desc&per_page=20&page=1&price_change_percentage=24h';
  var headers = key ? { 'x-cg-demo-api-key': key } : {};
  fetch(url, { headers: headers })
    .then(function(r){ return r.json(); })
    .then(function(data) {
      if (data && data.length) {
        if (!alState.livePrices) alState.livePrices = {};
        data.forEach(function(coin) {
          alState.livePrices[coin.symbol.toUpperCase()] = { gbp: coin.current_price, change24h: coin.price_change_percentage_24h };
        });
        saveAL(); updateKPIs();
        if (cb) cb(true, 'CoinGecko: ' + data.length + ' prices fetched');
      } else { if (cb) cb(false, 'No data from CoinGecko'); }
    })
    .catch(function(e){ if (cb) cb(false, 'CoinGecko error: ' + e.message); });
}

function fetchMetalsLive(cb) {
  fetch('https://api.metals.live/v1/spot')
    .then(function(r){ return r.json(); })
    .then(function(data) {
      if (Array.isArray(data)) {
        var metals = {};
        data.forEach(function(m){ metals[m.metal] = m.price; });
        alState.metalPrices = alState.metalPrices || {};
        var fxRate = parseFloat(localStorage.getItem('vi_fx_gbpusd') || '0.79');
        if (metals.gold)      alState.metalPrices.gold      = metals.gold      * fxRate;
        if (metals.silver)    alState.metalPrices.silver    = metals.silver    * fxRate;
        if (metals.platinum)  alState.metalPrices.platinum  = metals.platinum  * fxRate;
        if (metals.palladium) alState.metalPrices.palladium = metals.palladium * fxRate;
        alState.metalPrices.lastUpdated = new Date().toISOString();
        saveAL(); updateKPIs();
        if (cb) cb(true, 'Metals prices updated ✓');
      } else { if (cb) cb(false, 'Unexpected metals API response'); }
    })
    .catch(function(e){
      var k = localStorage.getItem('metals_api_key');
      if (k) {
        fetch('https://metals-api.com/api/latest?access_key='+k+'&base=USD&symbols=XAU,XAG,XPT,XPD')
          .then(function(r2){ return r2.json(); })
          .then(function(d2){
            if (d2.rates) {
              var fxR = parseFloat(localStorage.getItem('vi_fx_gbpusd')||'0.79');
              if(d2.rates.XAU) alState.metalPrices.gold      = (1/d2.rates.XAU)*fxR;
              if(d2.rates.XAG) alState.metalPrices.silver    = (1/d2.rates.XAG)*fxR;
              if(d2.rates.XPT) alState.metalPrices.platinum  = (1/d2.rates.XPT)*fxR;
              if(d2.rates.XPD) alState.metalPrices.palladium = (1/d2.rates.XPD)*fxR;
              alState.metalPrices.lastUpdated = new Date().toISOString();
              saveAL(); updateKPIs();
              if(cb) cb(true,'Metals prices updated ✓');
            } else { if(cb) cb(false,'Metals API error'); }
          })
          .catch(function(){ if(cb) cb(false,'Metals unavailable'); });
      } else { if(cb) cb(false,'api.metals.live unreachable. Add a Metals API key in Settings.'); }
    });
}

// ── Exchange rates (used by the stock and metals prices) ───────
function fetchExchangeRates(cb) {
  fetch('https://open.er-api.com/v6/latest/GBP')
    .then(function(r){ return r.json(); })
    .then(function(data) {
      if (data && data.rates) {
        localStorage.setItem('vi_fx_gbpusd', String(data.rates.USD || 1.27));
        localStorage.setItem('vi_fx_gbpeur', String(data.rates.EUR || 1.17));
        localStorage.setItem('vi_fx_rates', JSON.stringify(data.rates));
        localStorage.setItem('vi_fx_updated', new Date().toISOString());
        if (cb) cb(true, 'FX rates updated: 1 GBP = $' + (data.rates.USD||0).toFixed(3));
      } else { if (cb) cb(false, 'Exchange rate API returned no data'); }
    })
    .catch(function(e){ if (cb) cb(false, 'FX error: ' + e.message); });
}

function fetchYahooFinance(cb) {
  // Prices now track YOUR holdings (Stocks & Funds) instead of a fixed ticker list.
  stkEnsure();
  if (!alState.stocks.length) { if (cb) cb(false, 'Add holdings in Assets → Stocks & Funds first'); return Promise.resolve(); }
  return stkRefresh(true).then(function() {
    var n = alState.stocks.filter(function(h){ return h.updated; }).length;
    if (cb) cb(n > 0, n > 0 ? 'Stock prices updated for ' + n + ' holding' + (n === 1 ? '' : 's') : 'Live prices unavailable right now');
  });
}

function refreshAllLiveConns() {
  var liveFeedMap = { coingecko: fetchCoinGeckoFree, metals_live: fetchMetalsLive, exchangerate: fetchExchangeRates, yahoo: fetchYahooFinance };
  var count = 0;
  Object.keys(liveFeedMap).forEach(function(id) {
    if (achState.connected && achState.connected[id]) {
      count++;
      liveFeedMap[id](function(ok, msg){ showToast((ok?'✓ ':'⚠ ') + msg); });
    }
  });
  if (!count) showToast('No live feeds connected yet');
}

function renderConnections(){
  var el=document.getElementById('set-locked-list');
  if(!el)return;
  var cats={},order=[];
  CONNS.forEach(function(c){
    if(c.type==='live'||c.id==='alphavantage'||c.cat==='AI Tools')return;   // free price feeds are the Live prices row; the AI keys are owner tools
    var cat=c.cat||'Other';
    if(!cats[cat]){cats[cat]=[];order.push(cat);}
    cats[cat].push(c);
  });
  el.innerHTML=order.map(function(cat){
    return '<div class="sl-cat">'+ccEsc(cat)+'</div><div class="sl-names">'+cats[cat].map(function(c){
      return '<span class="sl-n" data-conn="'+ccEsc(c.id)+'"><svg class="vi-ic g" aria-hidden="true"><use href="#vi-lock"/></svg>'+ccEsc(c.name)+'</span>';
    }).join('')+'</div>';
  }).join('');
}

// ── PWA Install Prompt ─────────────────────────────────────────
var _pwaInstallPrompt = null;

window.addEventListener('beforeinstallprompt', function(e) {
  e.preventDefault();
  _pwaInstallPrompt = e;
  // Show banner if not dismissed and visited 2+ times
  var visits = parseInt(localStorage.getItem('vi_visit_count') || '0') + 1;
  localStorage.setItem('vi_visit_count', String(visits));
  var dismissed = localStorage.getItem('vi_pwa_dismissed') === '1';
  var isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (!dismissed && visits >= 2 && !isStandalone) {
    var banner = document.getElementById('pwa-install-banner');
    if (banner) banner.style.display = 'flex';
  }
});

function triggerPwaInstall() {
  if (_pwaInstallPrompt) {
    _pwaInstallPrompt.prompt();
    _pwaInstallPrompt.userChoice.then(function(r) {
      if (r.outcome === 'accepted') {
        showToast('✓ Vault-It installed!');
        dismissPwaBanner();
      }
      _pwaInstallPrompt = null;
    });
  } else {
    // iOS fallback
    showToast('On iOS: tap Share → Add to Home Screen');
  }
}

function dismissPwaBanner() {
  localStorage.setItem('vi_pwa_dismissed', '1');
  var banner = document.getElementById('pwa-install-banner');
  if (banner) banner.style.display = 'none';
}

// Back from checkout: viPaymentReturn (paywall/plan-wall.js) remembers the return and the card wall waits for the server's record.
function handleOAuthCallback() {
  // Back from a Stripe Payment Link. The URL alone proves nothing (anyone can type it): the app waits for the stripe-webhook
  // to mark the account on the server, and only that record opens it.
  var params = new URLSearchParams(window.location.search);
  if (params.get('upgraded') === '1' || params.get('founded') === '1') {
    var pl = params.get('founded') === '1' ? 'founder' : params.get('plan');
    // the plan the link says (13 Nov 2026: vaulter_monthly | vaulter_yearly | pioneer_monthly | pioneer_yearly, and the older monthly | yearly); only a label, the server's record decides
    if (['monthly', 'yearly', 'founder', 'vaulter_monthly', 'vaulter_yearly', 'pioneer_monthly', 'pioneer_yearly'].indexOf(pl) < 0) pl = null;
    window.history.replaceState({}, document.title, window.location.pathname);
    viPaymentReturn(pl);
    return;
  }
  // (the old TrueLayer sign-in return went with the locked connections: a ?code= in the address is not ours to handle)
}

function setChartRange(btn,range){
  document.querySelectorAll('.chart-filter-btn').forEach(function(b){b.classList.remove('active');});
  if(btn)btn.classList.add('active');
  chartState.range=range;
  _nwZoom=1; _nwPanMs=0; // reset zoom/pan when switching range
  drawChart();
}
function toggleChartMetric(btn,metric){
  chartState.metrics[metric]=!chartState.metrics[metric];
  if(btn)btn.classList.toggle('active',chartState.metrics[metric]);
  drawChart();
}

// Phones fire 'resize' every time the address bar hides or shows while you scroll (the HEIGHT changes, the width doesn't).
// Redrawing the charts and the roadmap on each of those made them repaint mid-scroll and show up half-drawn, so redraws
// now only run when the WIDTH or the pixel ratio really changes (rotate, unfold, window resize, zoom).
function viOnWidthResize(fn, ms) {
  var lastW = window.innerWidth, lastD = window.devicePixelRatio, t = 0;
  window.addEventListener('resize', function () {
    var w = window.innerWidth, d = window.devicePixelRatio;
    if (Math.abs(w - lastW) < 1 && d === lastD) return;
    lastW = w; lastD = d;
    clearTimeout(t); t = setTimeout(fn, ms || 200);
  });
}
viOnWidthResize(function () { drawChart(); renderFIREroadmap(); }, 200);
// Self-heal: when a chart scrolls back into view (or the page returns from the background) redraw it and nudge the browser to
// repaint it, so a tile the phone dropped while you were scrolling comes back whole instead of staying half-drawn.
(function () {
  var T = [['nwChart', function () { drawChart(); }], ['bd-sankey', function () { drawCashflowDiagram(); }],
    ['fire-timeline-scroll', function () { renderFIREroadmap(); }], ['debt-bar-chart', function () { drawDebtHistogram(); }], ['debt-donut-chart', function () { drawDebtDonut(); }]];
  function heal(el, fn) {
    if (!el || !(el.offsetWidth > 0)) return;
    try { fn(); } catch (e) {}
    el.style.willChange = 'transform'; clearTimeout(el.__wc); el.__wc = setTimeout(function () { el.style.willChange = ''; }, 500);
  }
  window.addEventListener('load', function () {
    var els = T.map(function (t) { return [document.getElementById(t[0]), t[1]]; }).filter(function (x) { return x[0]; });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { var el = e.target, was = el.__vis; el.__vis = e.isIntersecting; if (e.isIntersecting && was === false) heal(el, el.__heal); });
      }, { rootMargin: '100px' });
      els.forEach(function (x) { x[0].__heal = x[1]; io.observe(x[0]); });
    }
    function healVisible() { els.forEach(function (x) { var r = x[0].getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight) heal(x[0], x[1]); }); }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) healVisible(); });
    window.addEventListener('pageshow', function (e) { if (e.persisted) healVisible(); });
  });
})();

// ── SETTINGS MODAL ─────────────────────────────────────────────
