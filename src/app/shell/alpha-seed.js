// ─── ALPHA TEST SEEDER ────────────────────────────────────────────────────────
// Trigger: append ?alpha=kajal69 to URL  (or call _seedKajalAlpha() in console)
// Simulates Alpha Pioneer 001/033 — Kajal Six Nine — Indian median resident
function _seedKajalAlpha() {
  var now = Date.now();
  // ── Identity ──
  var user = {
    name:       'Kajal',
    email:      'kajal69@vault-it.alpha',
    phone:      '+91 98765 43210',
    job:        'Junior Software Engineer',
    dream:      'Financial Independence & Passive Income by 35',
    goal:       3, // Wealth Building
    saveArch:   'The Measured Saver',
    spendArch:  'The Pragmatist',
    joined:     '2026-06-02T00:00:00.000Z',
    pioneerNum: 1,
    currency:   'INR',
    income:     491,  // £491/mo ≈ ₹52,000
    expenses:   330,  // £330/mo ≈ ₹35,000
    pro:        false
  };
  localStorage.setItem('vi_user', JSON.stringify(user));

  // ── Session (7 days) ──
  localStorage.setItem('vi_session', JSON.stringify({ email: user.email, expiry: now + 7*24*60*60*1000 }));

  // ── Pioneer / Founder status ──
  localStorage.setItem('vi_pioneer',       'true');
  localStorage.setItem('vi_pioneer_email', user.email);
  localStorage.setItem('vi_pioneer_num',   '1');
  localStorage.setItem('vi_founder',       'true');
  localStorage.setItem('vi_founder_email', user.email);
  localStorage.setItem('vi_founder_num',   '1');
  localStorage.setItem('vi_founder_taken', '1');

  // ── Settings: INR, dark ──
  localStorage.setItem('vi_settings', JSON.stringify({ theme:'dark', currency:'INR', density:'default' }));

  // ── Assets & Liabilities (stored in GBP base; display ×106 in INR) ──
  // Cash: HDFC savings £424 = ₹44,944 | SBI Fixed Deposit £1,698 = ₹179,988
  // Metals: 20g gold @ £1,950/oz (1oz=31.1g → 20g = 0.6435oz → £1,255)
  // Crypto: 0.0012 BTC @ £67,000 = £80
  // Other: EPF £896 = ₹94,976 | LIC Endowment £283 = ₹29,998
  // Liabilities: Personal Loan £2,358 = ₹249,948 | Credit Card £222 = ₹23,532
  var alData = {
    metals: { gold: 0.6435, silver: 0, platinum: 0, palladium: 0 },
    metalPrices: { gold: 1950, silver: 23.5, platinum: 1020, palladium: 1100 },
    crypto: [
      { id: 1, sym: 'BTC', amount: 0.0012, price: 67000 },
      { id: 2, sym: 'ETH', amount: 0,      price: 3200  }
    ],
    cashAccounts: [
      { id: now+1, name: 'HDFC Bank · Savings', type: 'Current', balance: 424  },
      { id: now+2, name: 'SBI Fixed Deposit 7.1% p.a.', type: 'Savings', balance: 1698 }
    ],
    otherAssets: [
      { id: now+3, name: 'EPF / Employees Provident Fund', value: 896, image: null, svgIcon: null, imageSearch: null },
      { id: now+4, name: 'LIC Endowment Policy (surrender value)', value: 283, image: null, svgIcon: null, imageSearch: null }
    ],
    liabilities: [
      { id: now+5, name: 'HDFC Personal Loan', value: 2358, rate: 14, depRate: 0, runningCost: 54.7, addedDate: '2026-06-02T00:00:00.000Z' },
      { id: now+6, name: 'Axis Bank Credit Card', value: 222, rate: 42, depRate: 0, runningCost: 18.9, addedDate: '2026-06-02T00:00:00.000Z' }
    ]
  };
  localStorage.setItem('pos_al1', JSON.stringify(alData));

  // ── Debts ──
  var debtData = { debts: [
    { id: now+7,  name: 'HDFC Personal Loan', type: 'Personal Loan', balance: 2358, original: 2358, rate: 14, min: 54.7,  color: '#e05c5c', startDate: '2025-01-15' },
    { id: now+8,  name: 'Axis Bank Credit Card', type: 'Credit Card', balance: 222, original: 222, rate: 42, min: 18.9,  color: '#c9a84c', startDate: '2026-02-01' }
  ]};
  localStorage.setItem('pos_debt1', JSON.stringify(debtData));

  // ── Cashflow (Overarching) ──
  var ovData = {
    income:   [{ id: now+9,  name: 'Monthly Take-Home (TCS)',  amount: 491 }],
    expenses: [
      { id: now+10, name: 'Rent (PG / Flat share)', amount: 94  },
      { id: now+11, name: 'Food & Groceries',        amount: 76  },
      { id: now+12, name: 'Transport (metro + auto)',amount: 28  },
      { id: now+13, name: 'Loan EMI',                amount: 55  },
      { id: now+14, name: 'Subscriptions & Phone',   amount: 18  },
      { id: now+15, name: 'Eating Out & Social',     amount: 38  }
    ],
    snapshots: [
      { date: '2025-09-01', nw: -680  },
      { date: '2025-10-01', nw: -510  },
      { date: '2025-11-01', nw: -290  },
      { date: '2025-12-01', nw:  140  },
      { date: '2026-01-01', nw:  580  },
      { date: '2026-02-01', nw:  940  },
      { date: '2026-03-01', nw: 1200  },
      { date: '2026-04-01', nw: 1540  },
      { date: '2026-05-01', nw: 1820  }
    ]
  };
  localStorage.setItem('pos_ov1', JSON.stringify(ovData));

  // ── Journey ──
  var jrnyData = {
    profile: { monthlyTakeHome: 491, mortgageTermYears: 20, interestRateEst: 8.5, depositTargetPct: 20, creditHealth: 'fair', efMonths: 3 },
    onboarded: true, stageOverride: 3, mortgageActive: false, mortgageBalance: 0, rentMonthly: 94, rentYears: 2
  };
  localStorage.setItem('pos_journey', JSON.stringify(jrnyData));

  // ── Achievements ──
  var achData = { xp: 285, unlocked: ['nw100','nw500','nw1k','nw2k','debtstart','ef1k'], connected: {} };
  localStorage.setItem('pos_ach1', JSON.stringify(achData));

  // ── Net Worth History (last 9 months) ──
  var nwhData = {
    birthYear: 1998, setupDone: true,
    points: [
      { year: 2025, age: 27, netWorth: -680,  cash: 200,  stocks: 0, metals: 800, crypto: 50,  property: 0, liabilities: 1730, notes: 'Started tracking', estimated: false },
      { year: 2026, age: 28, netWorth: 1820,  cash: 2122, stocks: 0, metals: 1255, crypto: 80, property: 0, liabilities: 2580, notes: 'Pioneer Alpha 001', estimated: false }
    ]
  };
  localStorage.setItem('vi_nw_history', JSON.stringify(nwhData));

  showToast('Alpha test profile loaded: Kajal Six Nine · Pioneer 001/033');
  setTimeout(function() { location.reload(); }, 1200);
}

function _checkAlphaTestSeed() {
  if (new URLSearchParams(window.location.search).has('alpha') &&
      new URLSearchParams(window.location.search).get('alpha') === 'kajal69') {
    setTimeout(_seedKajalAlpha, 400);
  }
}

