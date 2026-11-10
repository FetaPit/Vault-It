// ── SUMMARY CARDS ─────────────────────────────────────────────
function ovIcon(k,c){return '<span class="ov-sum-ri" style="color:'+c+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'+(OV_ICO[k]||OV_ICO.inv)+'</svg></span>';}
// proportional bars for the Own and owe tiles (owner, 31 Oct): each row's bar is its value against a rounded maximum,
// with a £0, half and maximum scale under the rows, like the debt tile
function ovScaleMax(vals){var m=Math.max.apply(null,[0].concat(vals.filter(function(v){return isFinite(v);})));if(m<=0)return 0;
  var p=Math.pow(10,Math.floor(Math.log10(m))),f=m/p,n=f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10;return n*p;}
function ovScaleBar(v,max,c){var w=max>0?Math.max(0,Math.min(100,v/max*100)):0;
  return '<div class="ov-sum-sbar"><span style="width:'+w.toFixed(1)+'%;background:'+c+'"></span></div>';}
function ovScaleAxis(max){if(!(max>0))return '';
  return '<div class="ov-sum-axis" aria-hidden="true"><span>£0</span><span>'+gbpFmt(max/2)+'</span><span>'+gbpFmt(max)+'</span></div>';}
function renderSummaryCards(){
  var aEl=document.getElementById('ov-assets-summary');
  if(aEl){
    var ta=alTotalAssets();
    var rows=[
      {l:VI_LABELS.cash,v:alTotalCash()-alTotalBizCash(),c:'var(--green)',i:'cash'},
      {l:'Business accounts',v:alTotalBizCash(),c:'var(--orange)',i:'biz'},
      {l:VI_LABELS.deposit,v:state?state.saved:0,c:'var(--teal)',i:'house'},
      {l:VI_LABELS.stocks,v:alTotalStocks(),c:'var(--green2)',i:'stocks'},
      {l:VI_LABELS.metals,v:alTotalMetals(),c:'var(--gold)',i:'metals'},
      {l:VI_LABELS.inv,v:alTotalOther(),c:'var(--purple)',i:'inv'},
      {l:VI_LABELS.crypto,v:alTotalCrypto(),c:'var(--teal)',i:'crypto'},
      {l:VI_LABELS.owed,v:(typeof alTotalOwedToMe==='function'?alTotalOwedToMe():0),c:'var(--blue)',i:'cash'}
    ];
    var aRows=rows.filter(function(r){return r.v>0;}), aMax=ovScaleMax(aRows.map(function(r){return r.v;}));
    aEl.innerHTML='<div class="ov-sum-total" style="color:var(--teal)">'+gbpFmt(ta)+'</div>'
      +(aRows.map(function(r){
      return '<div class="ov-sum-drow"><div class="ov-sum-row">'+ovIcon(r.i,r.c)+'<span class="ov-sum-l" style="color:'+r.c+'">'+r.l+'</span>'
        +'<span class="ov-sum-v">'+gbpFmt(r.v)+'</span></div>'+ovScaleBar(r.v,aMax,r.c)+'</div>';
    }).join('')+ovScaleAxis(aMax)||'<div class="ov-sum-empty">No assets tracked yet</div>');
    var aNx=document.getElementById('ov-assets-next');
    if(aNx){
      var msg=ta<1000?'Start: open a savings account or add your first asset':
        ta<10000?'Great start. Aim to diversify across metals, crypto and cash':
        ta<50000?'Consider moving cash to a high-interest ISA':
        'Review your portfolio allocation across asset classes';
      aNx.textContent='Next: '+msg;
    }
  }
  var lEl=document.getElementById('ov-liab-summary');
  if(lEl){
    var tl=alTotalLiab();
    lEl.innerHTML='<div class="ov-sum-total" style="color:var(--amber)">'+gbpFmt(alLiabAssetTotal())+'</div>'
      +'<div class="ov-sum-empty" style="margin:-6px 0 10px">'+alLiabCostLine()+'</div>'
      +(alState.liabilities.length?(function(){
        var lMax=ovScaleMax(alState.liabilities.map(function(l){return depreciatedValue(l);}));
        return alState.liabilities.map(function(l){var lv=depreciatedValue(l);
        return '<div class="ov-sum-drow"><div class="ov-sum-row">'+ovIcon('warn','var(--amber)')+'<span class="ov-sum-l" style="color:var(--t1)">'+ccEsc(l.name)+'</span>'
          +'<span class="ov-sum-v" style="color:var(--amber)">'+gbpFmt(lv)+'</span></div>'+ovScaleBar(lv,lMax,'var(--amber)')+'</div>';
      }).join('')+ovScaleAxis(lMax);})()
      :'<div class="ov-sum-empty">No liabilities tracked</div>');
    var lNx=document.getElementById('ov-liab-next');
    if(lNx){
      var lMsg=tl<=0?'Great, no liabilities tracked. Add any depreciating assets.':
        'Track running costs to reduce your monthly outgoings';
      lNx.textContent='Next: '+lMsg;
    }
  }
  var dEl=document.getElementById('ov-debt-summary');
  if(dEl){
    var td=debtTotal();
    var _dr=debtChartRamp(debtState.debts);
    dEl.innerHTML='<div class="ov-sum-total" style="color:var(--re)">'+gbpFmt(td)+'</div>'
      +debtState.debts.map(function(d){
        var dc=(_dr[d.id]||{}).brand?_dr[d.id].c1:'var(--re)';
        var ik=(d.type==='credit'||d.type==='bnpl')?'card':'loan';
        var bal=Math.max(0,+d.balance||0), orig=+d.original||0, known=orig>0&&orig>=bal, paid=known?orig-bal:0;
        var pPct=known?Math.max(0,Math.min(100,paid/orig*100)):0;
        return '<div class="ov-sum-drow">'
          +'<div class="ov-sum-row">'+ovIcon(ik,dc)+'<span class="ov-sum-l" style="color:var(--t1)">'+ccEsc(d.name)+'</span>'
          +'<span class="ov-sum-v" style="color:var(--re)">'+gbpFmt(bal)+'</span></div>'
          +'<div class="ov-sum-dbar" role="img" aria-label="'+(known?gbpFmt(bal)+' to pay, '+gbpFmt(paid)+' paid off of '+gbpFmt(orig):gbpFmt(bal)+' to pay')+'">'
          +'<span class="ov-dbar-rem" style="width:'+(100-pPct).toFixed(1)+'%"></span><span class="ov-dbar-paid" style="width:'+pPct.toFixed(1)+'%"></span></div>'
          +'<div class="ov-sum-dlab"><span class="ov-dlab-rem">'+gbpFmt(bal)+' to pay</span>'
          +(known?'<span class="ov-dlab-paid">'+gbpFmt(paid)+' paid off</span>':'<span class="ov-dlab-none">starting balance not recorded</span>')+'</div></div>';
      }).join('');
    var dNx=document.getElementById('ov-debt-next');
    if(dNx){
      var dMsg=td<=0?'Debt free! Consider investing your minimum payments':
        debtState.debts.length?'Focus on: '+debtState.debts.reduce(function(a,b){return a.balance<b.balance?a:b;}).name+' (smallest balance, snowball method)':
        'Add your debts to the Debt Tracker tab';
      dNx.textContent='Next: '+dMsg;
    }
  }
  renderFIREroadmap();
}

