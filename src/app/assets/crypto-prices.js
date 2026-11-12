/* crypto prices (owner, 31 Oct 2026: "pulled automatically and linked to the holdings, not typed in"). CoinGecko's free price API,
   already named in the privacy notice; only the coin names are sent, never amounts. Fetched when the Crypto tab opens, a few seconds
   after start-up, and every 15 minutes while it is open. Each coin keeps its price's source and time; if a fetch fails, the last price
   stays and says how old it is; a coin CoinGecko does not know keeps the price the user typed, marked as theirs. Indicative prices. */
var VI_CRYPTO_EVERY=15*60*1000,_crBusy=false;
function crCoinId(sym){sym=String(sym||'').toUpperCase();return (typeof COIN_ID_MAP!=='undefined'&&COIN_ID_MAP[sym])||sym.toLowerCase()}
function fetchCryptoPrices(quiet){
  var list=(alState.crypto||[]).filter(function(c){return c&&(c.sym||c.symbol)});
  if(!list.length||_crBusy){if(!quiet&&!list.length)showToast('Add a coin first');return Promise.resolve(false)}
  _crBusy=true;
  var ids=list.map(function(c){return crCoinId(c.sym||c.symbol)}).filter(function(v,i,a){return a.indexOf(v)===i}).join(',');
  return fetch('https://api.coingecko.com/api/v3/simple/price?ids='+encodeURIComponent(ids)+'&vs_currencies=gbp&include_24hr_change=true')
    .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}).then(function(d){
      var now=new Date().toISOString(),got=0,was=crSig(list);
      list.forEach(function(c){var x=d&&d[crCoinId(c.sym||c.symbol)];
        if(x&&typeof x.gbp==='number'&&x.gbp>0){if(c.addPend){if(!(+c.addPx>0))c.addPx=x.gbp;delete c.addPend;}c.price=x.gbp;c.change24h=x.gbp_24h_change||0;c.priceSrc='live';c.priceAt=now;got++}
        else if(c.priceSrc==='live'){c.priceSrc='stale'}else c.priceSrc=c.priceSrc||'manual'});
      alState.cryptoCheckedAt=now;alState.cryptoErr=null;
      if(crSig(list)!==was)saveAL();   /* save (and so sync) only when a price changed, not for every check */
      renderAlTab();try{updateKPIs()}catch(e){}
      if(!quiet)showToast(got?'Crypto prices updated ✓':'No live price found for these coins');return true;
    }).catch(function(e){alState.cryptoErr=new Date().toISOString();var was=crSig(list);list.forEach(function(c){if(c.priceSrc==='live')c.priceSrc='stale'});if(crSig(list)!==was)saveAL();try{renderAlTab()}catch(_){}if(!quiet)showToast('Crypto prices unavailable just now. Your last prices are kept.');return false;})
    .then(function(v){_crBusy=false;return v;});
}
function crSig(list){return JSON.stringify(list.map(function(c){return [c.price,c.priceSrc,c.change24h,c.addPx]}))}
/* automatic checks only when the user holds some coin (not on a new device's blank sample, before the cloud copy arrives) */
function crAutoRefresh(){
  if(!viLiveOn())return;
  var last=Date.parse(alState.cryptoCheckedAt||0)||0;
  if((alState.crypto||[]).some(function(c){return c&&(+(c.amount!=null?c.amount:c.qty)||0)>0})&&Date.now()-last>VI_CRYPTO_EVERY-5000)fetchCryptoPrices(true);
}
function crAgo(iso){var t=Date.parse(iso||0);if(!t)return '';var m=Math.round((Date.now()-t)/60000);return m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+' h ago':Math.round(m/1440)+' d ago'}
function crPriceLine(c){
  if(c.priceSrc==='live')return 'Live price · CoinGecko · '+crAgo(c.priceAt)+' · indicative';
  if(c.priceSrc==='stale'||(c.priceAt&&alState.cryptoErr))return 'Last live price · '+crAgo(c.priceAt)+' · could not refresh';
  return 'Your price · no live price found for '+String(c.sym||c.symbol||'this coin').toUpperCase();
}
function updateCryptoPrice(id,val){if(viBlockEdit())return;var c=alState.crypto.find(function(x){return x.id===id;});if(!c)return;c.price=parseFloat(val)||0;c.priceSrc='manual';c.priceAt=null;saveAL();renderAlTab();updateKPIs();}
setTimeout(function(){try{crAutoRefresh()}catch(e){}},4000);
setInterval(function(){try{var p=document.getElementById('assets-crypto');if(!document.hidden&&p&&p.offsetParent)crAutoRefresh()}catch(e){}},60000);
function fetchLivePrices(){fetchCryptoPrices(false);} // backward compat
/* Live prices on / off (v0.9.2 Settings): one switch for the automatic checks of the free feeds. On by default; the choice stays on this device. Refresh now always works. */
function viLiveOn(){try{return localStorage.getItem('vi_live_prices')!=='0';}catch(e){return true;}}
function viLivePaint(){var r=document.getElementById('set-live-opts');if(!r)return;var on=viLiveOn();[].forEach.call(r.children,function(b){b.classList.toggle('active',(b.getAttribute('data-live')==='1')===on);b.setAttribute('aria-pressed',(b.getAttribute('data-live')==='1')===on?'true':'false');});}
function viSetLive(on){try{localStorage.setItem('vi_live_prices',on?'1':'0');}catch(e){}viLivePaint();showToast(on?'Live prices on':'Live prices off. Your own prices are kept');if(on){try{crAutoRefresh();stkAutoRefresh();}catch(e){}}}
function viRefreshLive(){
  showToast('Refreshing prices…');
  try{fetchCryptoPrices(true);}catch(e){}
  try{fetchMetalPrices();}catch(e){}
  try{stkRefresh(true);}catch(e){}
  try{fetchExchangeRates(function(){});}catch(e){}
}
function fetchMetalPrices(){
  fetch('https://api.metals.live/v1/spot/gold,silver,platinum,palladium')
    .then(function(r){return r.json();}).then(function(d){
      var gbpRate=0.79; // fallback GBP/USD rate; ideally fetch live
      d.forEach(function(item){
        var k=Object.keys(item)[0];
        var priceUSD=item[k];
        if(k==='gold')alState.metalPrices.gold=+(priceUSD*gbpRate).toFixed(2);
        else if(k==='silver')alState.metalPrices.silver=+(priceUSD*gbpRate).toFixed(2);
        else if(k==='platinum')alState.metalPrices.platinum=+(priceUSD*gbpRate).toFixed(2);
        else if(k==='palladium')alState.metalPrices.palladium=+(priceUSD*gbpRate).toFixed(2);
      });
      alState.metalPrices.lastUpdated=new Date().toISOString();
      saveAL();renderAlTab();showToast('Metal prices updated \u2713');
    }).catch(function(){
      // Fallback: try exchangerate-based estimation
      showToast('Metal prices unavailable \u2014 enter manually');
    });
}
