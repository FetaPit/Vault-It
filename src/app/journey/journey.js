// ═══════════════════════════════════════════════════════════════
// JOURNEY MAP — STATE, CALCULATORS, RENDERERS
// ═══════════════════════════════════════════════════════════════

var JRNY_KEY = 'pos_journey';

var journeyState = {
  profile: {
    monthlyTakeHome: 0,
    mortgageTermYears: 25,
    interestRateEst: 4.5,
    depositTargetPct: 10,
    creditHealth: 'unknown',
    efMonths: 3
  },
  onboarded: false,
  stageOverride: null,
  mortgageActive: false,
  mortgageBalance: 0,
  rentMonthly: 0,
  rentYears: 0,
  selectedNode: -1
};

function jrnyLoadState() {
  try {
    var s = localStorage.getItem(JRNY_KEY);
    if (s) {
      var p = JSON.parse(s);
      journeyState = Object.assign(journeyState, p);
      if (p.profile) journeyState.profile = Object.assign(journeyState.profile, p.profile);
    }
  } catch(e) {}
}

function jrnySaveState() {
  try { localStorage.setItem(JRNY_KEY, JSON.stringify(journeyState)); } catch(e) {}
}

// ── CALCULATORS (all pure) ────────────────────────────────────

function jrnyIncome() {
  var fromCF = (ovState.income||[]).reduce(function(a,r){ return a + (+r.amount||0); }, 0);
  return fromCF || journeyState.profile.monthlyTakeHome || 0;
}

function jrnyExpenses() {
  return (ovState.expenses||[]).reduce(function(a,r){ return a + (+r.amount||0); }, 0);
}

function jrnySurplus() {
  return Math.max(0, jrnyIncome() - jrnyExpenses());
}

function jrnyTotalDebt() {
  return (debtState.debts||[]).reduce(function(a,r){ return a + (+r.balance||0); }, 0);
}

function jrnyTotalCash() {
  return (alState.cashAccounts||[]).reduce(function(a,r){ return a + (+r.balance||0); }, 0) + Math.max(0, typeof alTotalPhysical === 'function' ? alTotalPhysical() : 0);
}

function jrnyHouseSaved() {
  return (typeof state !== 'undefined' && state) ? (state.saved || 0) : 0;
}

function jrnyHouseTarget() {
  return (typeof state !== 'undefined' && state && state.target > 0) ? state.target : 200000;
}

function jrnyDepositTarget() {
  return jrnyHouseTarget() * ((journeyState.profile.depositTargetPct || 10) / 100);
}

function jrnyEFTarget() {
  var exp = jrnyExpenses();
  return exp * (journeyState.profile.efMonths || 3);
}

function jrnyCalcDTI() {
  var totalDebt = jrnyTotalDebt();
  var annual = jrnyIncome() * 12;
  return annual > 0 ? totalDebt / annual : 0;
}

function jrnyMaxMortgage() {
  return jrnyIncome() * 12 * 4.5;
}

function jrnyCalcStage() {
  var J = journeyState;
  if (!J) return 0;
  if (J.stageOverride !== null && J.stageOverride !== undefined) return J.stageOverride;
  if (J.mortgageBalance === 0 && J.mortgageActive) return 6;
  if (J.mortgageActive) return 5;

  var totalDebt    = jrnyTotalDebt();
  var totalCash    = jrnyTotalCash();
  var efTarget     = jrnyEFTarget();
  var depositTarget = jrnyDepositTarget();
  var houseSaved   = jrnyHouseSaved();
  var dti          = jrnyCalcDTI();
  var income       = jrnyIncome();
  var expenses     = jrnyExpenses();

  if (houseSaved >= depositTarget && totalDebt === 0) return 4;
  if (houseSaved >= depositTarget * 0.9 && totalDebt === 0 && dti < 0.43) return 3;
  if (totalDebt === 0 && totalCash >= efTarget && efTarget > 0) return 2;
  if (income > 0 && expenses > 0 && totalDebt === 0 && totalCash < efTarget) return 1;
  if (totalDebt > 0) return 1;
  return 0;
}

function jrnyDebtFreeMonths() {
  var debts = (debtState.debts||[]).filter(function(d){ return +d.balance > 0; });
  if (!debts.length) return 0;
  var income   = jrnyIncome();
  var expenses = jrnyExpenses();
  var minPays  = debts.reduce(function(a,r){ return a + (+r.min||0); }, 0);
  var surplus  = Math.max(0, income - expenses);
  var available = Math.max(0, surplus - minPays);
  var sorted = debts.slice().sort(function(a,b){ return (+b.rate||0) - (+a.rate||0); });
  var month = 0;
  var rem = sorted.map(function(d){ return { bal: +d.balance||0, rate: +d.rate||0, mo: +d.min||0 }; });
  while (rem.some(function(d){ return d.bal > 0; }) && month < 600) {
    month++;
    var extra = available;
    rem.forEach(function(d) {
      if (d.bal <= 0) return;
      d.bal = Math.max(0, d.bal + d.bal * (d.rate/100/12) - d.mo);
      if (d.bal > 0 && extra > 0) { var p = Math.min(extra, d.bal); d.bal -= p; extra -= p; }
    });
  }
  return month > 599 ? null : month;
}

function jrnyEFMonths() {
  var efTarget = jrnyEFTarget();
  var totalCash = jrnyTotalCash();
  var gap = Math.max(0, efTarget - totalCash);
  if (gap <= 0) return 0;
  var surplus = jrnySurplus();
  return surplus > 0 ? Math.ceil(gap / surplus) : null;
}

function jrnyDepositMonths() {
  var depositTarget = jrnyDepositTarget();
  var gap = Math.max(0, depositTarget - jrnyHouseSaved());
  if (gap <= 0) return 0;
  var surplus = jrnySurplus();
  if (surplus <= 0) return null;
  var hasLISA = (alState.cashAccounts||[]).some(function(c){ return (c.type||'').toUpperCase() === 'LISA'; });
  var eff = surplus + (hasLISA ? 83 : 0);
  return Math.ceil(gap / eff);
}

function jrnyKeysDate() {
  if (jrnyCalcStage() >= 5) return null;
  var cursor = new Date();
  var dm = jrnyDebtFreeMonths() || 0;
  var em = jrnyEFMonths() || 0;
  var dp = jrnyDepositMonths() || 0;
  cursor.setMonth(cursor.getMonth() + dm);
  cursor.setMonth(cursor.getMonth() + Math.max(0, em - dm));
  cursor.setMonth(cursor.getMonth() + dp);
  cursor.setMonth(cursor.getMonth() + 3);
  return cursor;
}

function jrnyMortgageReadiness() {
  var depositTarget = jrnyDepositTarget();
  var dp = depositTarget > 0 ? Math.min(1, jrnyHouseSaved() / depositTarget) : 0;
  var dti = jrnyCalcDTI();
  var loanNeeded = jrnyHouseTarget() - jrnyHouseSaved();
  var credit = journeyState.profile.creditHealth;
  return {
    deposit:       dp >= 1    ? 'green' : dp >= 0.7  ? 'amber' : 'red',
    dti:           dti < 0.36 ? 'green' : dti < 0.43 ? 'amber' : 'red',
    affordability: loanNeeded <= jrnyMaxMortgage() ? 'green' : 'red',
    credit:        (credit==='good'||credit==='excellent') ? 'green' : credit==='fair' ? 'amber' : 'red',
    debtFree:      jrnyTotalDebt() === 0 ? 'green' : 'red'
  };
}

function jrnyFmtMonths(m) {
  if (m === null || m === undefined) return 'Cannot calculate';
  if (m === 0) return 'Done';
  var y = Math.floor(m / 12);
  var mo = m % 12;
  if (y === 0) return mo + ' month' + (mo !== 1 ? 's' : '');
  if (mo === 0) return y + ' year' + (y !== 1 ? 's' : '');
  return y + 'yr ' + mo + 'mo';
}

function jrnyFmtDate(d) {
  if (!d) return '?';
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[d.getMonth()] + ' ' + d.getFullYear();
}

// ── RENDER ENGINE ─────────────────────────────────────────────

var JRNY_STAGES = [
  { id: 0, name: 'Survival',   icon: '⚠️',  desc: 'Debt > income',          colour: '#e05c5c' },
  { id: 1, name: 'Stabilise',  icon: '🛡',  desc: 'Clearing debt',           colour: '#e0894a' },
  { id: 2, name: 'Save',       icon: '💰',  desc: 'Building deposit',        colour: '#c9a84c' },
  { id: 3, name: 'Apply',      icon: '📋',  desc: 'Mortgage ready',          colour: '#44c0b9' },
  { id: 4, name: 'Buy',        icon: '🔑',  desc: 'Deposit complete',        colour: '#44c0b9' },
  { id: 5, name: 'Own',        icon: '🏠',  desc: 'Building equity',         colour: '#3ecf8e' },
  { id: 6, name: 'Free',       icon: '🏆',  desc: 'Outright ownership',      colour: '#e8c56a' }
];

function renderJourney() {
  jrnyLoadState();
  var stage = jrnyCalcStage();
  var keysDate = jrnyKeysDate();
  var selectedNode = journeyState.selectedNode >= 0 ? journeyState.selectedNode : stage;

  // Header
  var hdrBadge = document.getElementById('jrny-badge');
  var hdrKeys  = document.getElementById('jrny-keys-headline');
  var hdrSub   = document.getElementById('jrny-hdr-sub');
  var hdrEl    = document.getElementById('jrny-hdr');

  var stageData = JRNY_STAGES[stage];
  if (hdrBadge) {
    hdrBadge.textContent = 'Stage ' + stage + ' \u00b7 ' + stageData.name;
    hdrBadge.style.background = stageData.colour + '22';
    hdrBadge.style.color = stageData.colour;
    hdrBadge.style.border = '1px solid ' + stageData.colour + '44';
  }
  if (hdrKeys) {
    if (stage >= 6) {
      hdrKeys.textContent = 'You own it. Outright.';
      hdrKeys.style.color = 'var(--gold)';
    } else if (keysDate) {
      hdrKeys.textContent = 'Keys in hand: ' + jrnyFmtDate(keysDate);
      var months = (keysDate.getFullYear() - new Date().getFullYear()) * 12 + (keysDate.getMonth() - new Date().getMonth());
      if (hdrSub) hdrSub.textContent = jrnyFmtMonths(months) + ' from today';
    } else {
      hdrKeys.textContent = 'Add income + expenses to see your timeline';
      if (hdrSub) hdrSub.textContent = 'Journey Map needs cashflow data';
    }
  }

  // Road SVG
  // Vertical timeline
  renderJrnySVG(stage, selectedNode);

  // Custom goal events
  renderJrnyCustomEvents();

  // Stage panel
  renderJrnyPanel(selectedNode, stage);

  // Gary cards
  renderJrnyGary();

  // Check wizard
  if (!journeyState.onboarded) {
    setTimeout(function() { showJrnyWizard(); }, 800);
  }

  // Alpha: all Journey dates and calculations visible to everyone
  var calcEls = document.querySelectorAll('.jrny-calc-out, .jrny-date-out, .jrny-stage-detail, #jrny-dti, #jrny-ef-date, #jrny-debt-date, #jrny-deposit-date, #jrny-keys-date, #jrny-mortgage-ready');
  calcEls.forEach(function(el) { el.style.filter = ''; el.style.userSelect = ''; el.style.pointerEvents = ''; });
  var g = document.getElementById('jrny-pro-gate');
  if (g) g.remove();
}

function renderJrnySVG(currentStage, selectedNode) {
  var svg = document.getElementById('jrny-road-svg');
  if (!svg) return;

  // ── Layout constants ──────────────────────────────
  var W = 300;
  var mainX = 44;
  var branchX = 235;
  var topPad = 36;
  var rowH = 90;
  var r = 18;

  var dm = jrnyDebtFreeMonths();
  var em = jrnyEFMonths();
  var dp = jrnyDepositMonths();
  var now = new Date();

  function addM(base, months) {
    var d = new Date(base);
    d.setMonth(d.getMonth() + months);
    return d;
  }

  function stageDate(i) {
    if (i === 0) return 'NOW';
    if (i === 1) return (dm > 0) ? jrnyFmtDate(addM(now, Math.min(1, dm))) : 'Ongoing';
    if (i === 2) return (dm !== null) ? jrnyFmtDate(addM(now, dm || 0)) : 'Add cashflow';
    if (i === 3) {
      if (dm === null || em === null) return 'Add cashflow';
      return jrnyFmtDate(addM(now, (dm || 0) + (em || 0)));
    }
    if (i === 4) {
      var m4 = (dm || 0) + Math.max((em || 0) - (dm || 0), 0) + (dp || 0);
      return (dp !== null) ? jrnyFmtDate(addM(now, m4)) : 'Add data';
    }
    if (i === 5) {
      var m5 = (dm || 0) + Math.max((em || 0) - (dm || 0), 0) + (dp || 0) + 3;
      return jrnyFmtDate(addM(now, m5));
    }
    if (i === 6) return jrnyFmtDate(addM(now, (journeyState.profile.mortgageTermYears || 25) * 12));
    return '';
  }

  var n = JRNY_STAGES.length;
  var ys = [];
  for (var j = 0; j < n; j++) ys.push(topPad + j * rowH);
  var totalH = ys[n - 1] + topPad + 10;
  var branchY = Math.round((ys[2] + ys[3]) / 2);

  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + totalH);
  svg.setAttribute('height', totalH);

  var out = '<defs>'
    + '<filter id="jg" x="-50%" y="-50%" width="200%" height="200%">'
    + '<feGaussianBlur stdDeviation="3" result="c"/>'
    + '<feMerge><feMergeNode in="c"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
    + '</defs>';

  // ── Vertical connector lines ──────────────────────
  for (var i = 0; i < n - 1; i++) {
    if (i === 2) continue; // fork section drawn separately
    var past = i < currentStage;
    out += '<line x1="' + mainX + '" y1="' + (ys[i] + r + 2) + '" x2="' + mainX + '" y2="' + (ys[i + 1] - r - 2) + '"'
      + ' stroke="' + (past ? 'rgba(68,192,185,.6)' : 'rgba(68,192,185,.1)') + '"'
      + ' stroke-width="2" stroke-dasharray="' + (past ? '0' : '5 3') + '"/>';
  }

  // ── Branch fork: Debt Free → Side Income → EF Built ───
  var debtDone = currentStage > 2;
  var forkTopY = ys[2] + r + 2;
  var forkBotY = ys[3] - r - 2;
  var mainForkCol = debtDone ? 'rgba(68,192,185,.6)' : 'rgba(68,192,185,.1)';
  var bLineCol = debtDone ? 'rgba(201,168,76,.55)' : 'rgba(68,192,185,.08)';

  // Main spine through fork zone
  out += '<line x1="' + mainX + '" y1="' + forkTopY + '" x2="' + mainX + '" y2="' + forkBotY + '"'
    + ' stroke="' + mainForkCol + '" stroke-width="2" stroke-dasharray="' + (debtDone ? '0' : '5 3') + '"/>';

  // Curve out to branch node
  var mid1 = forkTopY + (branchY - r - forkTopY) * 0.55;
  out += '<path d="M' + mainX + ',' + forkTopY + ' C' + mainX + ',' + mid1 + ' ' + branchX + ',' + mid1 + ' ' + branchX + ',' + (branchY - r - 2) + '"'
    + ' stroke="' + bLineCol + '" stroke-width="1.5" stroke-dasharray="' + (debtDone ? '4 2' : '5 4') + '" fill="none"/>';

  // Curve back from branch node
  var mid2 = (branchY + r + 2) + (forkBotY - (branchY + r + 2)) * 0.45;
  out += '<path d="M' + branchX + ',' + (branchY + r + 2) + ' C' + branchX + ',' + mid2 + ' ' + mainX + ',' + mid2 + ' ' + mainX + ',' + forkBotY + '"'
    + ' stroke="' + bLineCol + '" stroke-width="1.5" stroke-dasharray="' + (debtDone ? '4 2' : '5 4') + '" fill="none"/>';

  // Branch node: Side Income
  var bFill = debtDone ? 'rgba(201,168,76,.1)' : 'rgba(10,18,28,.95)';
  var bStroke = debtDone ? 'rgba(201,168,76,.6)' : 'rgba(68,192,185,.12)';
  var bTxtMain = debtDone ? '#c9a84c' : 'rgba(90,96,104,.38)';
  var bTxtSub = debtDone ? 'rgba(201,168,76,.55)' : 'rgba(90,96,104,.28)';
  var bW = 62; var bH = 44;
  out += '<rect x="' + (branchX - bW / 2) + '" y="' + (branchY - bH / 2) + '"'
    + ' width="' + bW + '" height="' + bH + '" rx="6"'
    + ' fill="' + bFill + '" stroke="' + bStroke + '" stroke-width="1.2"'
    + ' onclick="jrnySelectBranch()" style="cursor:pointer"/>';
  out += '<text x="' + branchX + '" y="' + (branchY - 8) + '" text-anchor="middle" font-size="12"'
    + ' fill="' + bTxtMain + '" style="pointer-events:none">💡</text>';
  out += '<text x="' + branchX + '" y="' + (branchY + 7) + '" text-anchor="middle" font-size="5.8"'
    + ' fill="' + bTxtMain + '" font-family="Syne,sans-serif" font-weight="800" style="pointer-events:none">SIDE INCOME</text>';
  out += '<text x="' + branchX + '" y="' + (branchY + 18) + '" text-anchor="middle" font-size="5.5"'
    + ' fill="' + bTxtSub + '" font-family="Share Tech Mono,monospace" style="pointer-events:none">'
    + (debtDone ? 'Unlocked ✓' : 'Clr debt 1st') + '</text>';

  // ── Main stage nodes ──────────────────────────────
  JRNY_STAGES.forEach(function(st, i) {
    var cy = ys[i];
    var isPast = i < currentStage;
    var isCurrent = i === currentStage;
    var isSelected = i === selectedNode;
    var isMilestone = (i === 2 || i === 5 || i === 6);
    var col = st.colour;

    // Selection halo
    if (isSelected) {
      out += '<circle cx="' + mainX + '" cy="' + cy + '" r="' + (r + 9) + '"'
        + ' fill="' + col + '09" stroke="' + col + '30" stroke-width="1"/>';
    }
    // Animated pulse ring for current stage
    if (isCurrent) {
      out += '<circle cx="' + mainX + '" cy="' + cy + '" r="' + (r + 5) + '"'
        + ' fill="none" stroke="' + col + '55" stroke-width="1.5" class="jrny-node-now"/>';
    }

    var fill = isPast ? col + '28' : isCurrent ? col + '15' : 'rgba(10,18,28,.95)';
    var strokeCol = (isPast || isCurrent) ? col : 'rgba(68,192,185,.15)';
    var strokeW = isCurrent ? 2.5 : isPast ? 1.8 : 1;

    out += '<g onclick="jrnySelectNode(' + i + ')" style="cursor:pointer"'
      + (isCurrent ? ' filter="url(#jg)"' : '') + '>';
    if (isMilestone) {
      // Diamond for milestones (Debt Free, Keys In Hand, Free)
      var d2 = r + 2;
      out += '<polygon points="'
        + mainX + ',' + (cy - d2) + ' '
        + (mainX + d2) + ',' + cy + ' '
        + mainX + ',' + (cy + d2) + ' '
        + (mainX - d2) + ',' + cy + '"'
        + ' fill="' + fill + '" stroke="' + strokeCol + '" stroke-width="' + strokeW + '"/>';
    } else {
      // Hexagon for regular stages
      var pts = '';
      for (var k = 0; k < 6; k++) {
        var ang = k * Math.PI / 3 - Math.PI / 6;
        pts += (mainX + r * Math.cos(ang)).toFixed(1) + ',' + (cy + r * Math.sin(ang)).toFixed(1) + (k < 5 ? ' ' : '');
      }
      out += '<polygon points="' + pts + '" fill="' + fill + '" stroke="' + strokeCol + '" stroke-width="' + strokeW + '"/>';
    }
    out += '<text x="' + mainX + '" y="' + (cy + 1) + '" text-anchor="middle" dominant-baseline="middle"'
      + ' font-size="11" style="pointer-events:none">' + st.icon + '</text>';
    out += '</g>';

    // Completed tick (left of node)
    if (isPast) {
      out += '<text x="' + (mainX - r - 6) + '" y="' + (cy + 4) + '" text-anchor="middle"'
        + ' font-size="9" fill="' + col + '" style="pointer-events:none"><svg class="vi-ic g" role="img" aria-label="Done"><use href="#vi-check"/></svg></text>';
    }

    // YOU ARE HERE badge (above label area)
    if (isCurrent) {
      out += '<rect x="' + (mainX + r + 4) + '" y="' + (cy - r - 1) + '" width="70" height="11" rx="2.5"'
        + ' fill="' + col + '18" stroke="' + col + '44" stroke-width="0.8"/>';
      out += '<text x="' + (mainX + r + 39) + '" y="' + (cy - r + 7) + '" text-anchor="middle"'
        + ' font-size="5.8" fill="' + col + '" font-family="Syne,sans-serif" font-weight="800"'
        + ' style="pointer-events:none">YOU ARE HERE</text>';
    }

    // Right-side label block
    var lx = mainX + r + 10;
    var nameCol = isPast ? col : isCurrent ? '#f0f4f8' : 'rgba(100,108,118,.6)';
    out += '<text x="' + lx + '" y="' + (cy - 5) + '"'
      + ' font-size="' + (isMilestone && (isPast || isCurrent) ? '11' : '10') + '"'
      + ' fill="' + nameCol + '" font-family="Syne,sans-serif"'
      + ' font-weight="' + (isMilestone ? '800' : '700') + '"'
      + ' onclick="jrnySelectNode(' + i + ')" style="cursor:pointer">' + st.name + '</text>';

    out += '<text x="' + lx + '" y="' + (cy + 7) + '"'
      + ' font-size="6" fill="rgba(90,96,104,' + (isPast || isCurrent ? '.62' : '.38') + ')"'
      + ' font-family="Share Tech Mono,monospace"'
      + ' onclick="jrnySelectNode(' + i + ')" style="cursor:pointer">' + st.desc + '</text>';

    var dt = stageDate(i);
    if (dt) {
      var dcol = isPast
        ? (isMilestone ? 'rgba(201,168,76,.7)' : 'rgba(68,192,185,.65)')
        : isCurrent
          ? (isMilestone ? '#c9a84c' : 'var(--em)')
          : 'rgba(90,96,104,.32)';
      out += '<text x="' + lx + '" y="' + (cy + 20) + '"'
        + ' font-size="7" fill="' + dcol + '" font-family="Share Tech Mono,monospace"'
        + ' onclick="jrnySelectNode(' + i + ')" style="cursor:pointer">' + dt + '</text>';
    }
  });

  svg.innerHTML = out;
}

function jrnySelectBranch() {
  showToast('Add income in the Cashflow tab. More surplus = faster journey');
  setTimeout(function() { showTab('overview'); }, 1600);
}

// ── Custom goal events ─────────────────────────────────
var JRNY_EVENTS_KEY = 'vi_jrny_events';

function jrnyLoadEvents() {
  try { return JSON.parse(localStorage.getItem(JRNY_EVENTS_KEY) || '[]'); } catch(e) { return []; }
}
function jrnySaveEvents(evs) {
  try { localStorage.setItem(JRNY_EVENTS_KEY, JSON.stringify(evs)); } catch(e) {}
}

function jrnyAddEvent() {if(viBlockEdit())return;
  var nameEl = document.getElementById('jrny-ev-name');
  var dateEl = document.getElementById('jrny-ev-date');
  var name = nameEl ? nameEl.value.trim() : '';
  var date = dateEl ? dateEl.value : '';
  if (!name) { showToast('Enter a goal name'); return; }
  var evs = jrnyLoadEvents();
  evs.push({ id: Date.now(), name: name, date: date, achieved: false });
  jrnySaveEvents(evs);
  if (nameEl) nameEl.value = '';
  if (dateEl) dateEl.value = '';
  renderJrnyCustomEvents();
}

function jrnyToggleEvent(id) {
  var evs = jrnyLoadEvents();
  var ev = evs.find(function(e) { return e.id === id; });
  if (ev) { ev.achieved = !ev.achieved; if (ev.achieved) checkAchievements(); }
  jrnySaveEvents(evs);
  renderJrnyCustomEvents();
}

function jrnyDeleteEvent(id) {if(viBlockEdit())return;
  jrnySaveEvents(jrnyLoadEvents().filter(function(e) { return e.id !== id; }));
  renderJrnyCustomEvents();
}

function renderJrnyCustomEvents() {
  var wrap = document.getElementById('jrny-custom-events');
  if (!wrap) return;
  var evs = jrnyLoadEvents();

  var html = '<div class="jrny-ev-wrap">'
    + '<div class="jrny-ev-hdr">◈ Custom Goals</div>';

  evs.forEach(function(ev) {
    var done = ev.achieved;
    var dLabel = ev.date ? ev.date.replace('-', ' / ') : '';
    html += '<div class="jrny-ev-item' + (done ? ' done' : '') + '">'
      + '<div class="jrny-ev-check' + (done ? ' done' : '') + '" onclick="jrnyToggleEvent(' + ev.id + ')">' + (done ? '✓' : '') + '</div>'
      + '<div style="flex:1">'
      + '<div class="jrny-ev-name" style="' + (done ? 'text-decoration:line-through;opacity:.5' : '') + '">' + ev.name + '</div>'
      + (dLabel ? '<div class="jrny-ev-date-lbl">Target: ' + dLabel + '</div>' : '')
      + '</div>'
      + '<button class="jrny-ev-del" onclick="jrnyDeleteEvent(' + ev.id + ')">×</button>'
      + '</div>';
  });

  html += '<div class="jrny-ev-form">'
    + '<input id="jrny-ev-name" class="jrny-ev-inp" type="text" placeholder="e.g. Pay off car loan…" style="flex:1;min-width:120px;font-family:\'DM Sans\',sans-serif">'
    + '<input id="jrny-ev-date" class="jrny-ev-inp" type="month" style="width:118px;font-family:\'Share Tech Mono\',monospace;font-size:max(.5rem,var(--vi-fs-1))">'
    + '<button class="jrny-ev-add" onclick="jrnyAddEvent()">+ Add</button>'
    + '</div>'
    + '</div>';

  wrap.innerHTML = html;
}

function jrnySelectNode(idx) {
  journeyState.selectedNode = idx;
  jrnySaveState();
  var stage = jrnyCalcStage();
  renderJrnySVG(stage, idx);
  renderJrnyPanel(idx, stage);
}

function renderJrnyPanel(selectedIdx, currentStage) {
  var st = JRNY_STAGES[selectedIdx];
  var icon  = document.getElementById('jrny-panel-icon');
  var title = document.getElementById('jrny-panel-title');
  var sub   = document.getElementById('jrny-panel-sub');
  var bento = document.getElementById('jrny-bento');
  if (!bento) return;

  if (icon)  icon.textContent = st.icon;
  if (title) { title.textContent = 'Stage ' + selectedIdx + ' \u00b7 ' + st.name; title.style.color = st.colour; }
  var statusLabel = selectedIdx < currentStage ? 'Completed' : selectedIdx === currentStage ? 'Current Stage' : 'Upcoming';
  if (sub)   { sub.textContent = statusLabel + ' \u00b7 ' + st.desc; }

  var cells = [];

  if (selectedIdx === 0) {
    var totalDebt = jrnyTotalDebt();
    var dm = jrnyDebtFreeMonths();
    var surplus = jrnySurplus();
    var topDebt = (debtState.debts||[]).slice().sort(function(a,b){ return (+b.rate||0)-(+a.rate||0); })[0];
    var interestPerMonth = totalDebt > 0 ? (debtState.debts||[]).reduce(function(a,d){ return a + (+d.balance||0) * (+d.rate||0) / 100 / 12; }, 0) : 0;
    cells = [
      { lbl: 'Total Debt', val: gbpFmt(totalDebt), sub: totalDebt > 0 ? "You're not behind. You're at the start." : "You have no debt tracked yet.", col: '#e05c5c' },
      { lbl: 'Debt-Free Date', val: dm !== null ? jrnyFmtMonths(dm) : 'Add income + expenses', sub: dm > 0 ? 'based on avalanche method, highest interest first' : dm === 0 ? 'No debts tracked' : 'Add cashflow data to calculate', col: '#e0894a' },
      { lbl: 'Interest Per Month', val: interestPerMonth > 0 ? gbpFmt(interestPerMonth) + '/mo' : 'N/A', sub: interestPerMonth > 0 ? 'Money leaving your account every month doing nothing for you' : 'Add debts with interest rates to see', col: '#e05c5c' },
      { lbl: 'First Debt to Attack', val: topDebt ? topDebt.name : 'Add debts', sub: topDebt ? 'Rate: ' + (topDebt.rate||0) + '% \u00b7 Balance: ' + gbpFmt(topDebt.balance||0) + ' \u00b7 Highest interest first' : 'Go to Debt Tracker tab to add your debts', col: '#c9a84c' },
      { lbl: 'Monthly Surplus', val: surplus > 0 ? gbpFmt(surplus) + '/mo' : 'N/A', sub: surplus > 0 ? 'Available to attack debt after expenses' : 'Add income and expenses in Cashflow section', col: surplus > 0 ? '#3ecf8e' : '#5a6068' },
      { lbl: 'Credit Health', val: journeyState.profile.creditHealth === 'unknown' ? 'Not set' : journeyState.profile.creditHealth.charAt(0).toUpperCase() + journeyState.profile.creditHealth.slice(1), sub: 'Check Experian or Credit Karma free. Aim for Good or Excellent before mortgage application.', col: ['good','excellent'].includes(journeyState.profile.creditHealth) ? '#3ecf8e' : '#9aa0a6' }
    ];
  } else if (selectedIdx === 1) {
    var totalDebt1 = jrnyTotalDebt();
    var dm1 = jrnyDebtFreeMonths();
    var em1 = jrnyEFMonths();
    var efTarget1 = jrnyEFTarget();
    var totalCash1 = jrnyTotalCash();
    var surplus1 = jrnySurplus();
    cells = [
      { lbl: 'Debt Remaining', val: gbpFmt(totalDebt1), sub: dm1 !== null ? 'Debt-free in ' + jrnyFmtMonths(dm1) : 'Add cashflow data', col: '#e05c5c' },
      { lbl: 'Emergency Fund', val: gbpFmt(totalCash1) + ' of ' + gbpFmt(efTarget1), sub: efTarget1 > 0 ? Math.round(Math.min(100, totalCash1/efTarget1*100)) + '% complete \u00b7 ' + (journeyState.profile.efMonths||3) + ' months expenses target' : 'Add monthly expenses to calculate', col: '#c9a84c' },
      { lbl: 'Debt-Free Date', val: dm1 !== null ? jrnyFmtMonths(dm1) : 'Calculate', sub: 'Avalanche method \u00b7 highest interest first', col: '#e0894a' },
      { lbl: 'EF Complete Date', val: em1 !== null ? jrnyFmtMonths(em1) : 'Calculate', sub: 'After debt cleared, redirect payments to savings', col: '#c9a84c' },
      { lbl: 'Monthly Surplus', val: surplus1 > 0 ? gbpFmt(surplus1) + '/mo' : 'N/A', sub: 'Income minus all expenses', col: '#3ecf8e' },
      { lbl: 'Budget Balance', val: jrnyIncome() > 0 ? gbpFmt(jrnyIncome()) + ' in / ' + gbpFmt(jrnyExpenses()) + ' out' : 'Add cashflow data', sub: 'Track in the Cashflow section on Overview tab', col: '#44c0b9' }
    ];
  } else if (selectedIdx === 2) {
    var depositTarget2 = jrnyDepositTarget();
    var houseSaved2 = jrnyHouseSaved();
    var gap2 = Math.max(0, depositTarget2 - houseSaved2);
    var dp2 = jrnyDepositMonths();
    var hasLISA2 = (alState.cashAccounts||[]).some(function(c){ return (c.type||'').toUpperCase() === 'LISA'; });
    var stampDuty = jrnyHouseTarget() > 250000 ? Math.round((jrnyHouseTarget() - 250000) * 0.05) : 0; // FTB relief
    cells = [
      { lbl: 'Deposit Gap', val: gbpFmt(gap2), sub: gbpFmt(houseSaved2) + ' saved of ' + gbpFmt(depositTarget2) + ' target (' + (journeyState.profile.depositTargetPct||10) + '% of ' + gbpFmt(jrnyHouseTarget()) + ')', col: '#c9a84c' },
      { lbl: 'Keys In Hand', val: dp2 !== null ? jrnyFmtMonths(dp2) + ' to deposit' : 'Add data', sub: 'Then 3 months for mortgage application', col: '#44c0b9' },
      { lbl: 'LISA Bonus', val: hasLISA2 ? '£1,000/yr FREE' : 'Not using LISA', sub: hasLISA2 ? 'Government bonus added automatically. You\'re making the most of it.' : 'Add a LISA account in Assets tab. Worth £1,000/yr in free government money. Most people don\'t use it.', col: hasLISA2 ? '#3ecf8e' : '#c9a84c' },
      { lbl: 'Monthly Savings Needed', val: dp2 && dp2 > 0 ? gbpFmt(Math.ceil(gap2 / dp2)) + '/mo' : 'On track', sub: 'At your current surplus to clear the gap', col: '#44c0b9' },
      { lbl: 'Stamp Duty (est.)', val: stampDuty > 0 ? gbpFmt(stampDuty) : 'None (FTB relief)', sub: 'First time buyer relief on properties up to £500k. Budget for this on top of your deposit.', col: stampDuty > 0 ? '#e0894a' : '#3ecf8e' },
      { lbl: 'Help to Buy / Schemes', val: 'Check eligibility', sub: 'First Homes scheme (30-50% discount), Shared Ownership, Mortgage Guarantee. gov.uk/affordable-home-ownership-schemes', col: '#9b7ec8' }
    ];
    // LISA banner
    if (!hasLISA2) {
      cells[2].lisaBanner = true;
    }
  } else if (selectedIdx === 3) {
    var mr = jrnyMortgageReadiness();
    var maxM = jrnyMaxMortgage();
    var dti3 = jrnyCalcDTI();
    var depositTarget3 = jrnyDepositTarget();
    var dp3pct = depositTarget3 > 0 ? Math.round(Math.min(100, jrnyHouseSaved()/depositTarget3*100)) : 0;
    function ragBadge(r) { return '<span class="jrny-rag ' + r + '">' + (r==='green'?'&#10003;':r==='amber'?'~':'&#10005;') + ' ' + r.charAt(0).toUpperCase()+r.slice(1) + '</span>'; }
    cells = [
      { lbl: 'Mortgage Readiness', val: Object.values(mr).filter(function(v){return v==='green';}).length + '/5 green', sub: 'All five criteria must be green before applying', col: '#44c0b9', ragObj: mr },
      { lbl: 'Max Mortgage', val: gbpFmt(maxM), sub: '4.5x annual income (' + gbpFmt(jrnyIncome()) + '/mo). Lender may vary. Add income data for accurate figure.', col: '#3ecf8e' },
      { lbl: 'Debt-to-Income', val: dti3 < 0.43 ? 'Pass \u00b7 ' + Math.round(dti3*100) + '%' : 'High \u00b7 ' + Math.round(dti3*100) + '%', sub: 'Lenders want DTI below 43%. Pay off remaining debt first.', col: dti3 < 0.43 ? '#3ecf8e' : '#e05c5c' },
      { lbl: 'Deposit Progress', val: dp3pct + '%', sub: 'Target: ' + gbpFmt(depositTarget3) + ' (' + (journeyState.profile.depositTargetPct||10) + '% of ' + gbpFmt(jrnyHouseTarget()) + ')', col: dp3pct >= 100 ? '#3ecf8e' : '#c9a84c' },
      { lbl: 'Credit Health', val: journeyState.profile.creditHealth === 'unknown' ? 'Unknown' : journeyState.profile.creditHealth.charAt(0).toUpperCase()+journeyState.profile.creditHealth.slice(1), sub: 'Check Experian, Equifax or TransUnion free. Must be Good or Excellent.', col: mr.credit === 'green' ? '#3ecf8e' : mr.credit === 'amber' ? '#c9a84c' : '#e05c5c' },
      { lbl: 'Broker Referral', val: 'When ready', sub: 'A whole-of-market mortgage broker can find deals you can\'t get direct. Fee-free brokers exist (e.g. L&C, Trussle). Talk to one once deposit is complete.', col: '#9b7ec8' }
    ];
  } else if (selectedIdx === 4) {
    var totalCost4 = jrnyHouseTarget();
    var stampDuty4 = totalCost4 > 250000 ? Math.round((totalCost4 - 250000) * 0.05) : 0;
    var solicitor4 = 1500;
    var survey4 = 600;
    var total4 = jrnyDepositTarget() + stampDuty4 + solicitor4 + survey4;
    cells = [
      { lbl: 'Property Price', val: gbpFmt(jrnyHouseTarget()), sub: 'Set this in the House Builder tab. Update as your target changes.', col: '#44c0b9' },
      { lbl: 'Deposit', val: gbpFmt(jrnyDepositTarget()), sub: (journeyState.profile.depositTargetPct||10) + '% of purchase price', col: '#3ecf8e' },
      { lbl: 'Stamp Duty (est.)', val: gbpFmt(stampDuty4), sub: 'First time buyer relief. Zero on first £250k. 5% on £250k-£925k portion.', col: stampDuty4 > 0 ? '#e0894a' : '#3ecf8e' },
      { lbl: 'Solicitor + Survey', val: gbpFmt(solicitor4 + survey4), sub: 'Conveyancing ~£1,500 + survey ~£600. Get 3 quotes. Cheap is not always good.', col: '#c9a84c' },
      { lbl: 'Total Cash Needed', val: gbpFmt(total4), sub: 'Deposit + stamp duty + legal fees. Have this ready before exchange.', col: '#e0894a' },
      { lbl: 'Application Checklist', val: 'Pre-check now', sub: 'Payslips x3, bank statements x3 months, P60, ID (passport/driving licence), credit report. Get these ready before you find a property.', col: '#9b7ec8' }
    ];
  } else if (selectedIdx === 5) {
    var mortBal5 = journeyState.mortgageBalance || 0;
    var r5 = (journeyState.profile.interestRateEst || 4.5) / 100 / 12;
    var n5 = (journeyState.profile.mortgageTermYears || 25) * 12;
    var monthlyPayment5 = mortBal5 > 0 && r5 > 0 ? mortBal5 * r5 / (1 - Math.pow(1+r5, -n5)) : 0;
    var totalInterest5 = mortBal5 > 0 ? monthlyPayment5 * n5 - mortBal5 : 0;
    var equity5 = jrnyHouseTarget() - mortBal5;
    cells = [
      { lbl: 'Mortgage Balance', val: mortBal5 > 0 ? gbpFmt(mortBal5) : 'Set in settings', sub: 'Update this as you pay down your mortgage', col: '#e05c5c' },
      { lbl: 'Monthly Payment (est.)', val: monthlyPayment5 > 0 ? gbpFmt(monthlyPayment5) + '/mo' : 'Set balance + rate', sub: 'At ' + (journeyState.profile.interestRateEst||4.5) + '% over ' + (journeyState.profile.mortgageTermYears||25) + ' years. Update in Journey settings.', col: '#c9a84c' },
      { lbl: 'Equity Built', val: equity5 > 0 ? gbpFmt(equity5) : 'N/A', sub: 'Property value minus mortgage balance. This is what you own.', col: '#3ecf8e' },
      { lbl: 'Total Interest Remaining', val: totalInterest5 > 0 ? gbpFmt(totalInterest5) : 'N/A', sub: 'At current rate and term. Overpayments reduce this significantly.', col: '#e05c5c' },
      { lbl: 'Overpayment Impact', val: 'Calculate below', sub: 'Paying £200/mo extra on a £200k mortgage at 4.5% saves ~£24k and 4 years. Even small amounts compound.', col: '#44c0b9' },
      { lbl: 'Mortgage-Free Date', val: (journeyState.profile.mortgageTermYears||25) + ' years term', sub: 'Set your mortgage balance to track remaining term', col: '#44c0b9' }
    ];
  } else if (selectedIdx === 6) {
    cells = [
      { lbl: 'YOU OWN THIS ◉', val: 'Outright', sub: 'No mortgage. No landlord. No one can take it. This is the goal.', col: '#e8c56a' },
      { lbl: 'Net Worth', val: gbpFmt(computeNetWorth ? computeNetWorth() : 0), sub: 'Your home is now a pure asset, not a liability.', col: '#3ecf8e' },
      { lbl: 'Monthly Freed Up', val: 'Your mortgage payment', sub: 'Every pound you were paying the bank is now yours. Invest it.', col: '#3ecf8e' },
      { lbl: 'Journey Complete', val: 'Stage 6 of 6', sub: 'From debt to outright ownership. Share this moment.', col: '#e8c56a' },
      { lbl: 'Next Chapter', val: 'Financial freedom', sub: 'With no housing cost and an owned asset, FIRE is achievable. See your roadmap in the Overview tab.', col: '#44c0b9' },
      { lbl: 'XP Reward', val: '+5,000 XP', sub: 'Stage 6 token unlocked. Check your Wealth Roadmap tab.', col: '#9b7ec8' }
    ];
  }

  // Check for empty state
  var hasData = jrnyIncome() > 0 || jrnySurplus() > 0 || jrnyTotalDebt() > 0 || jrnyHouseSaved() > 0;

  if (!hasData && selectedIdx === currentStage && currentStage === 0) {
    bento.innerHTML = '<div class="jrny-empty"><div class="jrny-empty-icon">📊</div>'
      + '<div class="jrny-empty-title">Add your data to unlock your journey</div>'
      + '<div class="jrny-empty-sub">Your stage and dates calculate automatically.<br>Start by adding income and expenses in the Cashflow section on the Overview tab,<br>then add any debts in the Debt Tracker tab.</div>'
      + '<button class="jrny-cta-btn" onclick="showTab(\'overview\')">Go to Overview \u2192</button></div>';
    return;
  }

  // Render cells
  bento.innerHTML = cells.map(function(c) {
    var lisaHtml = c.lisaBanner ? '<div class="jrny-lisa-banner"><b>LISA tip:</b> Add a Lifetime ISA in Assets &gt; Cash &amp; Savings. The government adds £1,000 free every year. Use it toward your first home deposit.</div>' : '';
    return '<div class="jrny-cell">'
      + '<div class="jrny-cell-lbl">' + c.lbl + '</div>'
      + '<div class="jrny-cell-val" style="color:' + c.col + '">' + c.val + '</div>'
      + '<div class="jrny-cell-sub">' + c.sub + '</div>'
      + (c.ragObj ? jrnyRagGrid(c.ragObj) : '')
      + lisaHtml
      + '</div>';
  }).join('');
}

function jrnyRagGrid(ragObj) {
  var labels = { deposit:'Deposit', dti:'DTI Ratio', affordability:'Affordability', credit:'Credit', debtFree:'Debt Free' };
  return '<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:8px">'
    + Object.keys(ragObj).map(function(k) {
      return '<span class="jrny-rag ' + ragObj[k] + '">'
        + (ragObj[k]==='green'?'&#10003;':ragObj[k]==='amber'?'~':'&#10005;')
        + ' ' + (labels[k]||k) + '</span>';
    }).join('') + '</div>';
}

function renderJrnyGary() {
  // Rent trap
  var rentExp = (ovState.expenses||[]).find(function(e){ return (e.name||'').toLowerCase().indexOf('rent') !== -1; });
  var rentMo = rentExp ? (+rentExp.amount||0) : (journeyState.rentMonthly || 0);
  var rentYrs = journeyState.rentYears || 5;
  var totalRentPaid = rentMo * 12 * rentYrs;
  var estEquity = totalRentPaid * 0.35; // rough: ~35% of rent payments would have been equity

  var rentVal = document.getElementById('gary-rent-val');
  var rentBody = document.getElementById('gary-rent-body');
  if (rentVal && rentMo > 0) {
    rentVal.textContent = gbpFmt(totalRentPaid) + ' paid in rent';
    rentVal.style.color = 'var(--red)';
  } else if (rentVal) {
    rentVal.textContent = 'Add rent in expenses to unlock';
    rentVal.style.color = 'var(--lock)';
  }
  if (rentBody && rentMo > 0) {
    rentBody.innerHTML = 'Over ' + rentYrs + ' years at ' + gbpFmt(rentMo) + '/mo. If you\'d been buying, you\'d have built approximately <b>' + gbpFmt(estEquity) + ' in equity</b> by now. That\'s not your fault. That\'s the market. This is how you get out.';
  }

  // Cost of waiting — using ONS avg ~£22k/yr
  var waitVal = document.getElementById('gary-wait-val');
  var waitBody = document.getElementById('gary-wait-body');
  var dayRate = Math.round(22000 / 365);
  if (waitVal) {
    waitVal.textContent = '~' + gbpFmt(dayRate) + '/day (ONS avg growth)';
  }

  var target = jrnyHouseTarget();
  var targetStr = target > 0 ? ' For a ' + gbpFmt(target) + ' property, that\'s <b>' + gbpFmt(Math.round(22000 * 0.1)) + ' extra needed every year you delay.</b>' : '';
  if (waitBody) {
    waitBody.innerHTML = 'UK average house price grows roughly <b>£22,000/year</b> (ONS 10yr average).' + targetStr + ' Not to scare you. To motivate you. Every pound you save today is worth more tomorrow.';
  }
}

// ── ONBOARDING WIZARD ─────────────────────────────────────────

var _jrnyWizStep = 0;
var _jrnyWizData = {};

var JRNY_WIZ_STEPS = [
  {
    q: "What's your monthly take-home pay?",
    type: 'number',
    placeholder: '£ e.g. 2200',
    key: 'monthlyTakeHome'
  },
  {
    q: "What house price are you aiming for?",
    type: 'number',
    placeholder: '£ e.g. 200000',
    key: 'houseTarget'
  },
  {
    q: "What's your biggest financial challenge right now?",
    type: 'options',
    options: [
      { text: 'Paying off debt: I owe more than I want to', val: 0 },
      { text: 'Building savings: debt is fine, just need a buffer', val: 1 },
      { text: 'Saving a deposit: debt-free, working towards a home', val: 2 },
      { text: 'Already saving a deposit and going well', val: 2 }
    ],
    key: 'stageOverride'
  },
  {
    q: "Do you have a Lifetime ISA (LISA)?",
    type: 'options',
    options: [
      { text: 'Yes, I have a LISA', val: 'yes' },
      { text: 'No, but I\'m interested', val: 'interested' },
      { text: 'No, and I don\'t qualify (over 40)', val: 'no' },
      { text: 'Not sure what a LISA is', val: 'unsure' }
    ],
    key: 'lisa'
  },
  {
    q: "How would you describe your credit score?",
    type: 'options',
    options: [
      { text: 'Excellent: I\'ve never missed a payment', val: 'excellent' },
      { text: 'Good: generally well managed', val: 'good' },
      { text: 'Fair: some issues in the past', val: 'fair' },
      { text: 'Poor: significant problems', val: 'poor' },
      { text: 'Not sure: haven\'t checked recently', val: 'unknown' }
    ],
    key: 'creditHealth'
  }
];

function showJrnyWizard() {
  if (journeyState.onboarded) return;
  var overlay = document.getElementById('jrny-wizard');
  if (overlay) overlay.classList.remove('hidden');
  _jrnyWizStep = 0;
  _jrnyWizData = {};
  jrnyWizRender();
}

function jrnyWizRender() {
  var step = JRNY_WIZ_STEPS[_jrnyWizStep];
  var qEl = document.getElementById('jrny-wiz-q');
  var bodyEl = document.getElementById('jrny-wiz-body');
  var nextBtn = document.getElementById('jrny-wiz-next-btn');

  // Progress dots
  for (var i = 0; i < 5; i++) {
    var dot = document.getElementById('wdot-' + i);
    if (dot) {
      dot.className = 'jrny-wizard-dot' + (i < _jrnyWizStep ? ' done' : i === _jrnyWizStep ? ' active' : '');
    }
  }

  if (qEl) qEl.textContent = step.q;
  if (nextBtn) nextBtn.textContent = _jrnyWizStep === JRNY_WIZ_STEPS.length - 1 ? 'Finish' : 'Next';

  var html = '';
  if (step.type === 'number') {
    var prev = _jrnyWizData[step.key] || '';
    html = '<input type="number" class="jrny-wizard-inp" id="jrny-wiz-inp" placeholder="' + step.placeholder + '" value="' + prev + '" onkeydown="if(event.key===\'Enter\')jrnyWizNext()">';
  } else if (step.type === 'options') {
    html = '<div class="jrny-wizard-options">';
    step.options.forEach(function(opt) {
      var isSelected = _jrnyWizData[step.key] === opt.val;
      html += '<button class="jrny-wizard-opt' + (isSelected ? ' selected' : '') + '" onclick="jrnyWizSelect(this, \'' + step.key + '\', ' + JSON.stringify(opt.val) + ')">' + opt.text + '</button>';
    });
    html += '</div>';
  }
  if (bodyEl) bodyEl.innerHTML = html;

  // Focus input if present
  setTimeout(function() {
    var inp = document.getElementById('jrny-wiz-inp');
    if (inp) inp.focus();
  }, 50);
}

function jrnyWizSelect(btn, key, val) {
  document.querySelectorAll('#jrny-wiz-body .jrny-wizard-opt').forEach(function(b){ b.classList.remove('selected'); });
  btn.classList.add('selected');
  _jrnyWizData[key] = val;
}

function jrnyWizNext() {
  var step = JRNY_WIZ_STEPS[_jrnyWizStep];
  if (step.type === 'number') {
    var inp = document.getElementById('jrny-wiz-inp');
    if (inp) _jrnyWizData[step.key] = parseFloat(inp.value) || 0;
  }
  // Validate
  if (step.type === 'options' && _jrnyWizData[step.key] === undefined) {
    showToast('Pick one to continue');
    return;
  }

  _jrnyWizStep++;

  if (_jrnyWizStep >= JRNY_WIZ_STEPS.length) {
    // Commit data
    if (_jrnyWizData.monthlyTakeHome) journeyState.profile.monthlyTakeHome = _jrnyWizData.monthlyTakeHome;
    if (_jrnyWizData.houseTarget && typeof state !== 'undefined' && state) {
      state.target = _jrnyWizData.houseTarget;
      if (typeof saveHouse === 'function') saveHouse();
    }
    if (_jrnyWizData.stageOverride !== undefined) journeyState.stageOverride = _jrnyWizData.stageOverride;
    if (_jrnyWizData.creditHealth) journeyState.profile.creditHealth = _jrnyWizData.creditHealth;
    if (_jrnyWizData.lisa === 'yes' || _jrnyWizData.lisa === 'interested') {
      showToast('Tip: Add a LISA in Assets > Cash & Savings for £1,000/yr free');
    }
    journeyState.onboarded = true;
    jrnySaveState();
    var overlay = document.getElementById('jrny-wizard');
    if (overlay) overlay.classList.add('hidden');
    renderJourney();
    showToast('Journey mapped. Your road starts here.');
    return;
  }

  jrnyWizRender();
}

function jrnyWizSkip() {
  journeyState.onboarded = true;
  jrnySaveState();
  var overlay = document.getElementById('jrny-wizard');
  if (overlay) overlay.classList.add('hidden');
  renderJourney();
}


