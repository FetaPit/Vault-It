// ── INCOME STREAM BUILDER CONSTANTS (must be before init block) ──
var _ISB_TYPES={passive:'Passive',active:'Active','portfolio':'Portfolio'};
var _ISB_STATUS_COLOR={idea:'var(--t3)',building:'var(--go)',active:'var(--gr)'};

// ── STATE DEFAULTS (must be before INIT block) ──
var chartState={range:'all',metrics:{nw:true,debt:true,income:true,proj:true}};   // Forecast on by default (owner, 31 Oct)
var _nwZoom=1, _nwPanMs=0; // net worth chart zoom (1=default) and pan offset in milliseconds
// ── Constants used by init-time renders — must be declared BEFORE the init block runs ──
// ── Spending types: committed vs variable × essential vs non-essential, plus savings & investments ──
/* one set of names for what you own, used by the dashboard, the 3D scenes and the ledger (owner, 31 Oct: labels must match everywhere) */
var VI_LABELS={cash:'Cash and savings',deposit:'House deposit',stocks:'Stocks and shares',metals:'Precious metals',inv:'Wealth inventory',crypto:'Crypto',owed:'Owed to you',liab:'Liabilities',debt:'Debt'};
var CF_GROUPS={
  ce:{label:'Committed · essential',     short:'Committed essential',     col:'var(--coral)',tx:'var(--coral)',ex:'Rent, mortgage, insurance'},
  ve:{label:'Variable · essential',      short:'Variable essential',      col:'var(--salmon)',tx:'var(--salmon)',ex:'Groceries, fuel, utilities'},
  cn:{label:'Committed · non-essential', short:'Committed non-essential', col:'var(--amber)',tx:'var(--amber)',ex:'Subscriptions, gym, the same every month'},
  vn:{label:'Variable · non-essential',  short:'Variable non-essential',  col:'var(--yellow)',tx:'var(--yellow)',ex:'Takeaways, shopping, days out'},
  sv:{label:'Savings',                   short:'Savings',                 col:'var(--green)',tx:'var(--green)',ex:'Emergency fund, house deposit'},
  iv:{label:'Investments',               short:'Investments',             col:'var(--green2)',tx:'var(--green2)',ex:'ISA, pension, shares'}
};
var CF_GROUP_ORDER=['ce','ve','cn','vn','sv','iv'];
var CF_LEGACY={ce:'necessity',ve:'necessity',cn:'discretionary',vn:'discretionary',sv:'investment',iv:'investment'};
var DEBT_TYPE_LABELS={credit:'Credit card',personal:'Personal loan',student:'Student loan',car:'Car finance',bnpl:'BNPL',overdraft:'Overdraft',mortgage:'Mortgage',other:'Loan'};
// ── Roadmap iconography: inline duo-tone icons on a 24×24 grid (f = tinted fill, d = stroke) ──
var _FSH='M12 3l7 2.5v6c0 4.4-3 7.7-7 9.5-4-1.8-7-5.1-7-9.5v-6z';
var _FFL='M12 3c1 4 5 5.5 5 11a5 5 0 0 1-10 0c0-2 1-3 2-4 .3 1.2 1 2 2 2 0-4-1-6 1-9z';
var _FGEM='M6 4h12l3 5-9 11L3 9z';
var _FHOUSE='M2.8 11.2L12 3.2l9.2 8';
var FIRE_ICONS={
  snapshot:{f:['M7 4h10a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z'],d:['M7 4h10a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z','M9.5 2.5h5v3h-5z','M8.5 16l2.5-3.2 2 2 3-4.3']},
  map:{f:['M9 4l6 2v14l-6-2z'],d:['M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z','M9 4v14','M15 6v14']},
  flow:{f:['M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z'],d:['M4.2 12a7.8 7.8 0 0 1 13.4-5.4','M19.8 12a7.8 7.8 0 0 1-13.4 5.4','M17.8 2.8v4h-4','M6.2 21.2v-4h4']},
  coin:{f:['M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z'],d:['M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z','M14.8 8.6c-.5-.8-1.5-1.3-2.6-1.3-1.7 0-2.8 1.1-2.8 2.7 0 2.6 1 3.3 1 5.1 0 .8-.5 1.3-1.4 1.6h6.4','M8.7 12.2h5']},
  shield:{f:[_FSH],d:[_FSH,'M9 12h6']},
  shieldCheck:{f:[_FSH],d:[_FSH,'M8.6 12l2.4 2.4 4.4-4.8']},
  scissors:{f:['M6 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z','M6 15.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z'],d:['M6 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z','M6 15.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z','M8 8l12 10','M8 16L20 6']},
  halfPie:{f:['M12 3a9 9 0 0 0 0 18z'],d:['M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z','M12 3v18']},
  gem:{f:['M6 4h12l3 5H3z'],d:[_FGEM,'M3 9h18','M9 4l-1.5 5L12 20','M15 4l1.5 5L12 20']},
  gem2:{f:['M6 5h12l3 5H3z'],d:['M6 5h12l3 5-9 11L3 10z','M3 10h18','M9 5l-1.5 5L12 21','M15 5l1.5 5L12 21','M20 1.2v3.2','M18.4 2.8h3.2']},
  unlock:{f:['M5 11h14v10H5z'],d:['M5 11h14v10H5z','M8 11V7a4 4 0 0 1 7.6-1.7','M12 15v2.5']},
  umbrella:{f:['M3 12a9 9 0 0 1 18 0z'],d:['M3 12a9 9 0 0 1 18 0z','M12 3V2','M12 12v6.2a2 2 0 0 1-4 0','M7.6 12a4.4 4.4 0 0 1 4.4-9','M16.4 12A4.4 4.4 0 0 0 12 3']},
  safe:{f:['M4 4h16v14H4z'],d:['M4 4h16v14H4z','M7 18v2','M17 18v2','M12 7.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z','M12 9.2v3.1','M10.4 10.8h3.2']},
  sprout:{f:['M12 14c0-3.5 2.5-5.7 7-5.7 0 3.5-2.5 5.7-7 5.7z','M12 16c0-3-2-4.8-6-4.8 0 3 2 4.8 6 4.8z'],d:['M12 21v-8','M12 14c0-3.5 2.5-5.7 7-5.7 0 3.5-2.5 5.7-7 5.7z','M12 16c0-3-2-4.8-6-4.8 0 3 2 4.8 6 4.8z','M8 21h8']},
  foundation:{f:['M5 16h14v4H5z'],d:['M3 20h18','M5 20v-4h14v4','M9.5 16v-4h5v4']},
  bricks:{f:['M3 14h18v4H3z','M3 10h9v4H3z'],d:['M3 6h18v12H3z','M3 10h18','M3 14h18','M12 6v4','M8 10v4','M16 10v4','M12 14v4']},
  house:{f:['M5 10v11h14V10l-7-6z'],d:[_FHOUSE,'M5 9.5V21h14V9.5','M10 21v-6h4v6']},
  coins:{f:['M4 8c0 1.4 3.6 2.5 8 2.5S20 9.4 20 8s-3.6-2.5-8-2.5S4 6.6 4 8z'],d:['M4 8c0 1.4 3.6 2.5 8 2.5S20 9.4 20 8s-3.6-2.5-8-2.5S4 6.6 4 8z','M4 8v4c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5V8','M4 12v4c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-4']},
  doc:{f:['M6 3h9l4 4v14H6z'],d:['M6 3h9l4 4v14H6z','M15 3v4h4','M9 12h7','M9 15.5h5']},
  exchange:{f:['M4 5.5h14v5H4z','M6 13.5h14v5H6z'],d:['M4 8h14','M14.5 4.5L18 8l-3.5 3.5','M20 16H6','M9.5 12.5L6 16l3.5 3.5']},
  key:{f:['M8 4a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z'],d:['M8 4a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z','M11.2 11.2L20.5 20.5','M16.5 16.5l2.5-2.5','M13.8 13.8l2-2']},
  bars:{f:['M5 20v-5h3v5z','M10.5 20V11h3v9z','M16 20V6h3v14z'],d:['M5 20v-5h3v5z','M10.5 20V11h3v9z','M16 20V6h3v14z','M3 20.5h18']},
  barsUp:{f:['M5 20v-4h2v4z','M10 20v-7h2v7z','M15 20V10h2v10z'],d:['M3 20.5h18','M6 20v-4','M11 20v-7','M16 20v-10','M3.5 11l5-5 3 3 6-6','M14.5 3.5h4v4']},
  medal:{f:['M12 9a6 6 0 1 1 0 12 6 6 0 0 1 0-12z'],d:['M8 3l4 6 4-6','M12 9a6 6 0 1 1 0 12 6 6 0 0 1 0-12z','M12 12.4l.9 1.9 2.1.3-1.5 1.5.4 2.1-1.9-1-1.9 1 .4-2.1L9 14.6l2.1-.3z']},
  sail:{f:['M12 4v11H5z'],d:['M12 3v13','M12 3l8 12.5H12','M12 6.5L5.5 15H12','M3.5 19h17','M6 19l2 2h8l2-2']},
  houseSolid:{f:['M5 10v11h14V10l-7-6z'],solid:1,d:[_FHOUSE,'M5 9.5V21h14V9.5','M8.8 15l2.3 2.3 4.2-4.6']},
  mountain:{f:['M2 20l7-13 4 7 3-4 6 10z'],d:['M2 20l7-13 4 7 3-4 6 10z','M7.2 10l1.8-3.2 1.8 3.2']},
  flame:{f:[_FFL],d:[_FFL]},
  flame2:{f:['M10 3c1 4 5 5.5 5 11a5 5 0 0 1-10 0c0-2 1-3 2-4 .3 1.2 1 2 2 2 0-4-1-6 1-9z'],d:['M10 3c1 4 5 5.5 5 11a5 5 0 0 1-10 0c0-2 1-3 2-4 .3 1.2 1 2 2 2 0-4-1-6 1-9z','M18.5 11c.6 2 2.3 2.8 2.3 5.3a2.4 2.4 0 0 1-4.8 0']},
  tree:{f:['M12 3C8.5 3 6 5.5 6 8.5S8 14 12 14s6-2.5 6-5.5S15.5 3 12 3z'],d:['M12 3C8.5 3 6 5.5 6 8.5S8 14 12 14s6-2.5 6-5.5S15.5 3 12 3z','M12 14v7','M12 14l-3-3','M12 12l3-2.5','M9 21h6']}
};
var FIRE_LONG=['Record your first net worth snapshot to start your roadmap.','List every debt: amount, interest rate, minimum monthly payment.','Build a zero-based budget: add your income, then give every pound a job (spending, saving or investing) until nothing is left unassigned.','Get your first pound into a savings account.','Build a £500 emergency starter fund.','Build a £1,000 emergency fund before attacking debt harder.','Pay off one debt in full, the smallest balance first.','Clear 50% of total debt by value.','Net worth crosses £1,000 positive.','Reach zero consumer debt.','Save 3 months of expenses in accessible cash.','Save 6 months of expenses, fully buffered against emergencies.','Open a Stocks & Shares ISA or Lifetime ISA.','Save 1% of your house target price.','Save 5% of your house target, halfway to a 10% deposit.','Net worth reaches £5,000.','Full deposit saved. Time to talk to a mortgage broker.','Net worth reaches £10,000.','Submit your mortgage application.','Exchange contracts on your property.','Keys in hand. You own it.','Net worth reaches £25,000.','Net worth reaches £50,000.','Net worth crosses £100,000: six figures.','Investments alone can grow to FI target. Coast from here.','Mortgage paid off. Outright ownership.','Net worth reaches £250,000.','25× annual expenses invested: full financial independence.','33× annual expenses: Fat FIRE.','50× annual expenses: enough for the next generation.'];
/* section colours (owner, 4 Nov round 2, R4: "Colour code each section of the roadmap"): six brand colours, one per section, on the
   label, the divider and the outline of every slate in it. Gold and purple also mark slate tiers (R7), so they go last, on Own and Free */
var FIRE_PHASES=[
  {label:'FOUNDATION',col:'#44c0b9'},{label:'STABILISE',col:'#e0894a'},{label:'SAVE',col:'#3ecf8e'},
  {label:'BUY',col:'#64b5f6'},{label:'OWN',col:'#9b7ec8'},{label:'FREE',col:'#e8c56a'}
];
// roadmap window geometry + state (declared early: the roadmap is first drawn during start-up)
var _fireFirstPaint=true,_fireDetailIdx=-1,_fireSkipAsk=-1;
var FIRE_NODE=128,FIRE_LEFT=70,FIRE_H=300;   // round 3 (owner, 3 Nov): larger tokens need wider spacing and a taller stage
var FIRE_LBL_MAX=96;   // widest slate name label text (C2), so boxes stay clear of each other at FIRE_NODE spacing
var FIRE_GH=114,FIRE_GF=1.42;   // the ground plane (v0.9.1 round 2, R3): its height, and how much wider its near edge is than its far edge
var STK_COLORS=['#44c0b9','#c9a84c','#3ecf8e','#9b7ec8','#64b5f6','#e0894a','#e05c5c','#e8c56a'];
// ── Budget categories + icons (declared before the init block runs) ──
var BD_ICONS={
  bolt:{f:['M13 2.5L5 13.5h6l-1 8 8-11h-6z'],d:['M13 2.5L5 13.5h6l-1 8 8-11h-6z']},
  bank:{f:['M3 9l9-5 9 5z'],d:['M3 9l9-5 9 5z','M5.5 9.5v7','M9.8 9.5v7','M14.2 9.5v7','M18.5 9.5v7','M3.5 20h17','M4.5 16.8h15']},
  basket:{f:['M4 9h16l-2 10.2H6z'],d:['M3 9h18l-2 10.2a1 1 0 0 1-1 .8H6a1 1 0 0 1-1-.8z','M8 9l4-6 4 6','M9.2 13v3.5','M12 13v3.5','M14.8 13v3.5']},
  car:{f:['M3.5 11h17a1 1 0 0 1 1 1v4.5h-19V12a1 1 0 0 1 1-1z'],d:['M5 11l1.6-4h10.8L19 11','M3.5 11h17a1 1 0 0 1 1 1v4.5h-19V12a1 1 0 0 1 1-1z','M6.5 19v-2.5','M17.5 19v-2.5','M6.8 14h1.4','M15.8 14h1.4']},
  wifi:{f:['M12 18.4a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2z'],d:['M2.5 9a14 14 0 0 1 19 0','M5.5 12.5a9.5 9.5 0 0 1 13 0','M8.6 16a5 5 0 0 1 6.8 0']},
  baby:{f:['M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z'],d:['M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z','M9 11v.4','M15 11v.4','M9.4 15c1.5 1.4 3.7 1.4 5.2 0','M12 3c0 1.6 1.4 2.4 2.4 2.1']},
  heart:{f:['M12 20s-8-4.7-8-10.3A4.7 4.7 0 0 1 12 7a4.7 4.7 0 0 1 8 2.7C20 15.3 12 20 12 20z'],d:['M12 20s-8-4.7-8-10.3A4.7 4.7 0 0 1 12 7a4.7 4.7 0 0 1 8 2.7C20 15.3 12 20 12 20z']},
  card:{f:['M3 6h18v4H3z'],d:['M3 6h18v12H3z','M3 10h18','M6.5 15h4']},
  repeat:{f:['M9 9h6v6H9z'],d:['M17 3l3 3-3 3','M4 11V9a3 3 0 0 1 3-3h13','M7 21l-3-3 3-3','M20 13v2a3 3 0 0 1-3 3H4']},
  fork:{f:['M5 3h4v6a2 2 0 0 1-4 0z'],d:['M7 3v18','M5 3v6a2 2 0 0 0 4 0V3','M17 21V3c-2.5 1.5-3.5 4-3.5 8H17']},
  ticket:{f:['M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z'],d:['M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z','M14.5 7.5v2','M14.5 11v2','M14.5 14.5v2']},
  bag:{f:['M5 8h14l-1 12H6z'],d:['M5 8h14l-1 12H6z','M9 8V6a3 3 0 0 1 6 0v2']},
  plane:{f:['M21 3l-6.5 18-3.8-7.2L3.5 10z'],d:['M21 3l-6.5 18-3.8-7.2L3.5 10z','M21 3L10.7 13.8']},
  dumbbell:{f:['M4.5 7h2v10h-2z','M17.5 7h2v10h-2z'],d:['M2.5 9.5v5','M4.5 7h2v10h-2z','M17.5 7h2v10h-2z','M21.5 9.5v5','M6.5 12h11']},
  sparkle:{f:['M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z'],d:['M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z','M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z']},
  gift:{f:['M4 11h16v9H4z'],d:['M4 11h16v9H4z','M3 8h18v3H3z','M12 8v12','M12 8c-1.5-4-5-4-5-1.7C7 8 12 8 12 8z','M12 8c1.5-4 5-4 5-1.7C17 8 12 8 12 8z']},
  lifebuoy:{f:['M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z'],d:['M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z','M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z','M5.7 5.7l3.5 3.5','M18.3 5.7l-3.5 3.5','M5.7 18.3l3.5-3.5','M18.3 18.3l-3.5-3.5']},
  piggy:{f:['M5 12.5a7 5.4 0 0 1 13.4-2.3L21 9.5v4l-1.8.8a5 5 0 0 1-2 3V20h-2.7v-1.6h-4.6V20H7.2v-3A5.3 5.3 0 0 1 5 12.5z'],d:['M5 12.5a7 5.4 0 0 1 13.4-2.3L21 9.5v4l-1.8.8a5 5 0 0 1-2 3V20h-2.7v-1.6h-4.6V20H7.2v-3A5.3 5.3 0 0 1 5 12.5z','M9.5 9.2h4','M16.3 12.4v.2','M2.5 11.5c.4 1 1.2 1.5 2.4 1.5']},
  trend:{f:['M4 16l5-5 4 3 7-8v14.5H4z'],d:['M3 20.5h18','M4 16l5-5 4 3 7-8','M15 6h5v5']},
  dots:{f:['M4.5 12a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0z','M10.5 12a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0z','M16.5 12a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0z'],d:['M4.5 12a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0z','M10.5 12a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0z','M16.5 12a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0z']},
  briefcase:{f:['M3 8h18v12H3z'],d:['M3 8h18v12H3z','M9 8V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V8','M3 13h18','M10.5 12v2.4h3V12']},
  rocket:{f:['M12 2.5c3.5 2.5 5 6 4.5 11l-4.5 3-4.5-3c-.5-5 1-8.5 4.5-11z'],d:['M12 2.5c3.5 2.5 5 6 4.5 11l-4.5 3-4.5-3c-.5-5 1-8.5 4.5-11z','M12 9.4a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2z','M7.5 13.5L4.5 16l2.2.5','M16.5 13.5l3 2.5-2.2.5','M10 19.5c.5 1.5 1.5 2.5 2 2.5s1.5-1 2-2.5']},
  paw:{f:['M12 14c-2.5 0-4.5 1.8-4.5 3.8 0 1.4 1 2.2 2.3 2.2 1 0 1.4-.4 2.2-.4s1.2.4 2.2.4c1.3 0 2.3-.8 2.3-2.2 0-2-2-3.8-4.5-3.8z'],d:['M12 14c-2.5 0-4.5 1.8-4.5 3.8 0 1.4 1 2.2 2.3 2.2 1 0 1.4-.4 2.2-.4s1.2.4 2.2.4c1.3 0 2.3-.8 2.3-2.2 0-2-2-3.8-4.5-3.8z','M3.6 10.5a1.5 2 0 1 1 3 0 1.5 2 0 0 1-3 0z','M7.5 7a1.5 2.1 0 1 1 3 0 1.5 2.1 0 0 1-3 0z','M13.5 7a1.5 2.1 0 1 1 3 0 1.5 2.1 0 0 1-3 0z','M17.4 10.5a1.5 2 0 1 1 3 0 1.5 2 0 0 1-3 0z']},
  book:{f:['M4 5h7a1 1 0 0 1 1 1v13a2 2 0 0 0-2-1.5H4z'],d:['M12 6a1 1 0 0 0-1-1H4v13h6a2 2 0 0 1 2 1.5','M12 6a1 1 0 0 1 1-1h7v13h-6a2 2 0 0 0-2 1.5','M12 6v13.5']},
  wrench:{f:['M14.5 6a4 4 0 0 0-5 5.2L4 17l3 3 5.8-5.5A4 4 0 0 0 18 9.5l-2.5 2.5-2.2-.5-.5-2.2z'],d:['M14.5 6a4 4 0 0 0-5 5.2L4 17l3 3 5.8-5.5A4 4 0 0 0 18 9.5l-2.5 2.5-2.2-.5-.5-2.2z']},
  shirt:{f:['M8.5 4L3.5 7l2 3.5L8 9.5V20h8V9.5l2.5 1 2-3.5-5-3a3.5 3.5 0 0 1-7 0z'],d:['M8.5 4L3.5 7l2 3.5L8 9.5V20h8V9.5l2.5 1 2-3.5-5-3a3.5 3.5 0 0 1-7 0z']},
  coffee:{f:['M4.5 9h11v6a4 4 0 0 1-4 4h-3a4 4 0 0 1-4-4z'],d:['M4.5 9h11v6a4 4 0 0 1-4 4h-3a4 4 0 0 1-4-4z','M15.5 10.5h1.5a2.5 2.5 0 0 1 0 5h-1.5','M8 3.5c-.8 1 .8 1.8 0 3','M11.5 3.5c-.8 1 .8 1.8 0 3']}
};
// k = key · n = label · ic = default icon · t = default spending type
var BD_EXP_CATS=[
  {k:'housing',  n:'Rent / Mortgage',       ic:'house',    t:'ce'},
  {k:'council',  n:'Council tax',           ic:'bank',     t:'ce'},
  {k:'insurance',n:'Insurance',             ic:'shield',   t:'ce'},
  {k:'debt',     n:'Debt payments',         ic:'card',     t:'ce'},
  {k:'childcare',n:'Childcare',             ic:'baby',     t:'ce'},
  {k:'phone',    n:'Phone & internet',      ic:'wifi',     t:'ce'},
  {k:'utilities',n:'Utilities & bills',     ic:'bolt',     t:'ve'},
  {k:'groceries',n:'Groceries',             ic:'basket',   t:'ve'},
  {k:'transport',n:'Transport & fuel',      ic:'car',      t:'ve'},
  {k:'health',   n:'Health',                ic:'heart',    t:'ve'},
  {k:'pets',     n:'Pets',                  ic:'paw',      t:'ve'},
  {k:'home',     n:'Home & garden',         ic:'wrench',   t:'ve'},
  {k:'education',n:'Education & courses',   ic:'book',     t:'ve'},
  {k:'subs',     n:'Subscriptions',         ic:'repeat',   t:'cn'},
  {k:'fitness',  n:'Gym & fitness',         ic:'dumbbell', t:'cn'},
  {k:'dining',   n:'Eating out & takeaways',ic:'fork',     t:'vn'},
  {k:'coffee',   n:'Coffee & lunches',      ic:'coffee',   t:'vn'},
  {k:'fun',      n:'Entertainment',         ic:'ticket',   t:'vn'},
  {k:'shopping', n:'Shopping',              ic:'bag',      t:'vn'},
  {k:'clothing', n:'Clothing',              ic:'shirt',    t:'vn'},
  {k:'travel',   n:'Holidays',              ic:'plane',    t:'vn'},
  {k:'personal', n:'Personal care',         ic:'sparkle',  t:'vn'},
  {k:'gifts',    n:'Gifts & giving',        ic:'gift',     t:'vn'},
  {k:'emergency',n:'Emergency fund',        ic:'lifebuoy', t:'sv'},
  {k:'savings',  n:'Savings',               ic:'piggy',    t:'sv'},
  {k:'deposit',  n:'House deposit',         ic:'bricks',   t:'sv'},
  {k:'invest',   n:'Investments / ISA',     ic:'trend',    t:'iv'},
  {k:'pension',  n:'Pension',               ic:'umbrella', t:'iv'},
  {k:'other',    n:'Other',                 ic:'dots',     t:'ve'}
];
var BD_INC_CATS=[
  {k:'salary',   n:'Salary',                 ic:'briefcase'},
  {k:'business', n:'Side hustle / business', ic:'rocket'},
  {k:'benefits', n:'Benefits & pensions',    ic:'bank'},
  {k:'dividends',n:'Interest & dividends',   ic:'coins'},
  {k:'rental',   n:'Rental income',          ic:'house'},
  {k:'gifts',    n:'Gifts & other',          ic:'gift'},
  {k:'other',    n:'Other',                  ic:'dots'}
];
// Icons any line or custom category can be given
var BD_PICK_ICONS=['house','bolt','bank','basket','car','shield','wifi','baby','heart','card','repeat','fork','coffee','ticket','bag','shirt','plane','dumbbell','sparkle','gift','paw','book','wrench','lifebuoy','piggy','trend','umbrella','bricks','coins','gem','key','bars','barsUp','medal','flame','tree','sprout','safe','briefcase','rocket','doc','map','sail','mountain','dots'];
var BD_GUESS=[
  ['housing',/rent|mortgage|landlord/i],['council',/council/i],['utilities',/utilit|bill|energy|\bgas\b|electric|water|broadband/i],
  ['groceries',/grocer|food shop|supermarket|tesco|sainsbury|aldi|lidl|housekeeping|^food/i],['transport',/transport|commut|travel card|petrol|fuel|diesel|\boil\b|\btrain\b|\bbus\b|\btfl\b|\bcar\b(?! finance)|parking|road tax|\bmot\b/i],
  ['insurance',/insur/i],['phone',/phone|mobile|telephone|internet|wifi/i],['childcare',/child|nursery|school/i],['health',/health|dent|optic|medic|pharm/i],
  ['debt',/debt|loan|finance|credit|store card|repay/i],['pets',/\bpet|vet\b|dog|cat food/i],['education',/course|tuition|study|education|university/i],['home',/garden|repair|maintenance|diy|furnitur/i],
  ['subs',/subscri|netflix|spotify|prime|disney|apple tv/i],['coffee',/coffee|lunch|cafe/i],['dining',/eating|dining|restaurant|takeaway|pub\b/i],
  ['fun',/entertain|cinema|gaming|hobby/i],['clothing',/cloth|shoe|fashion/i],['shopping',/shop|amazon/i],['travel',/holiday|trip|vacation/i],['fitness',/gym|fitness|sport/i],
  ['personal',/hygiene|personal|beauty|hair/i],['gifts',/gift|charity|donat/i],['emergency',/emergency|rainy/i],['invest',/invest|isa|stocks|shares|crypto/i],
  ['pension',/pension/i],['deposit',/deposit|house fund/i],['savings',/saving/i]
];
var BD_INC_GUESS=[['salary',/salary|wage|pay|take-home|take home|job/i],['business',/side|freelance|business|client|project/i],['benefits',/benefit|universal|child benefit|pension|allowance/i],['dividends',/dividend|interest|cashback/i],['rental',/rent/i]];
var _bdSel={inc:null,exp:null},_bdAuto={inc:'',exp:''},_bdEdit=null,_bdIconFor=null,_bdNewOpen={inc:false,exp:false},_bdNewIcon={inc:'dots',exp:'dots'};
var INV_MAX=36,INV_SIZE=800,INV_THUMB=320;
var _invDB=null,_invCache={},_invViews=[],_invSpin=null,_invOpen=null;
var PIN_LEN=6,_SETPIN_LABEL='Set a 6-digit PIN, then sign in anywhere with just your email + PIN';
var _authForgot=false,_needPin=null,_pinMode='local',_pinEnterLen=4,_pinBusy=false,_pinChange=false,_pinLater=false,_viSignedInAt=0;   // _pinLater: proving the email with a code to set a first PIN later; _viSignedInAt: an email code was accepted on this page
var AL_KEY='pos_al1';
var alState={metals:{gold:0,silver:0,platinum:0,palladium:0},metalPrices:{gold:1950,silver:23.5,platinum:1020,palladium:1100},crypto:[{id:1,sym:'BTC',amount:0,price:42000},{id:2,sym:'ETH',amount:0,price:2200}],cashAccounts:[],physicalCash:[],otherAssets:[],liabilities:[]};
var DEBT_KEY='pos_debt1';
var DEBT_PAL=[['#e05c5c','#8f2530'],['#c9a84c','#7a5f1a'],['#44c0b9','#1f6e6a'],['#9b7ec8','#563a86'],['#3ecf8e','#1a7d55'],['#f59e0b','#9a5f06']];
var _bdFold=(function(){try{return JSON.parse(localStorage.getItem('vi_bd_fold')||'{}')||{};}catch(e){return {};}})();
var OV_ICO={
  metals:'<rect x="2" y="9" width="20" height="8" rx="1.5"/><path d="M7 9v8M12 9v8M17 9v8"/>',
  crypto:'<path d="M8 5h6a3 3 0 0 1 0 6H8m0 0h7a3 3 0 0 1 0 6H8"/><path d="M10 3v18M14 3v18"/>',
  cash:'<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>',
  house:'<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>',
  stocks:'<path d="M3 17 9 11l4 4 8-9"/><path d="M15 6h6v6"/>',
  inv:'<path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="M3 7l9 5 9-5M12 12v10"/>',
  warn:'<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4"/>',
  card:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  loan:'<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 10h5a2 2 0 0 1 0 4H9"/>',
  nw:'<path d="M3 20h18"/><path d="M5 16l5-5 4 3 6-7"/><circle cx="20" cy="7" r="1.5"/>',
  income:'<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 19h16"/>',
  out:'<path d="M12 21V9M7 14l5-5 5 5"/><path d="M4 5h16"/>',
  plus:'<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  biz:'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  owed:'<path d="M4 12h12M12 7l5 5-5 5"/><path d="M20 5v14"/>'
};
// Credit cards and BNPL are drawn as cards (chip, number, network); every other debt uses the same tile without them (E33)
function ccIsCard(d){return !!d&&(d.type==='credit'||d.type==='bnpl');}
var DEBT_TYPE_ICONS={personal:'vi-loan',student:'vi-book',car:'vi-car',overdraft:'vi-overdraft',mortgage:'vi-mortgage',other:'vi-loan'};
// What a debt tile's back shows (E33b). An estimate from the user's own figures: nominal monthly rate = APR / 100 / 12,
// interest added each month, the minimum paid at each month end. A minimum at or below the interest never clears it.
function debtTileFacts(d,now){
  var B=parseFloat(d&&d.balance)||0,apr=parseFloat(d&&d.rate)||0,M=parseFloat(d&&d.minPay)||parseFloat(d&&d.min)||0,r=Math.max(0,apr)/100/12;
  var out={monthInterest:Math.max(0,B)*r,yearInterest:Math.max(0,B)*r*12,min:M,rate:apr};
  if(!(B>0.005)){out.cleared=true;return out;}
  if(!(M>0)){out.noMin=true;return out;}
  if(r>0&&M<=B*r+1e-9){out.never=true;return out;}
  var n=0,I=0;
  while(B>0.005&&n<600){var i=B*r;I+=i;B=B+i-Math.min(M,B+i);n++;}
  if(B>0.005){out.capped=true;return out;}
  now=now||new Date();var dt=new Date(now.getFullYear(),now.getMonth()+n,1);
  out.months=n;out.interest=I;out.date=dt.toLocaleDateString('en-GB',{month:'short',year:'numeric'}).replace('Sept','Sep');
  return out;
}
function ccMoney(v,whole){   // £ through the app's currency converter; pence only when there are any
  var k=(window.VI_CURRENCY_RATE||1),sym=(window.VI_CURRENCY_SYMBOL||'£'),p=Math.round((+v||0)*k*100)/100;
  if(whole)p=Math.round(p);
  return sym+(Math.abs(p%1)>0.004?p.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2}):Math.round(p).toLocaleString('en-GB'));
}
function ccBackFacts(d){
  var f=debtTileFacts(d),minTxt=ccMoney(f.min)+'/mo';
  var when,whenSub;
  if(f.cleared){when='Cleared';whenSub='Nothing left to pay';}
  else if(f.noMin){when='Add a minimum';whenSub='to see a date';}
  else if(f.never){when='Never';whenSub='at '+minTxt+': '+(f.min<f.monthInterest-0.005?'the interest is more':'it only covers the interest');}
  else if(f.capped){when='Over 50 years';whenSub='at '+minTxt;}
  else {when=f.date;whenSub=ccMoney(f.interest,true)+' interest to go';}
  var pays=(d.payments||[]).slice(-3).reverse().map(function(p){var t=new Date(p.date);return ccMoney(p.amt)+' · '+(isNaN(t)?'':t.toLocaleDateString('en-GB',{day:'numeric',month:'short'}).replace('Sept','Sep'));});
  var orig=+(d.original||d.total||d.balance)||0,paid=Math.max(0,orig-(+d.balance||0));
  return '<div class="cc3-bk">'
    +'<div class="cc3-bk-col"><span>Debt-free</span><b>'+ccEsc(when)+'</b><i>'+ccEsc(whenSub)+'</i></div>'
    +'<div class="cc3-bk-col"><span>Interest this month</span><b>'+ccMoney(f.monthInterest)+'</b><i>'+ccMoney(f.yearInterest,true)+' a year</i></div>'
    +'<div class="cc3-bk-pay"><span>Payments</span><i>'+(pays.length?ccEsc(pays.join(', ')):'No payments yet')+'</i><i>Paid so far '+ccMoney(paid)+'</i></div>'
    +'<div class="cc3-bk-note">'+(f.cleared?'Paid off':'Estimate: '+(f.noMin?'':ccEsc(minTxt)+' at ')+ccEsc(String(f.rate))+'% APR (÷ 12 a month)')+'</div>'
    +'</div>';
}
var _ccPct={};   // % shown last time for each card, so a payment cuts from where it was and an undo joins it back up
var _ccIO=null;
var CC_BRANDS=[
 {n:'American Express',d:'americanexpress.com',g:['#3b7fc4','#12467f'],fg:'#fff',net:'amex',re:/amex|american\s*express/i},
 {n:'Barclaycard',d:'barclaycard.co.uk',g:['#00aeef','#00395d'],fg:'#fff',re:/barclay/i},
 {n:'Monzo',d:'monzo.com',g:['#ff6a57','#e23b2b'],fg:'#fff',re:/monzo/i},
 {n:'Starling',d:'starlingbank.com',g:['#7d4be0','#3b1d8a'],fg:'#fff',re:/starling/i},
 {n:'HSBC',d:'hsbc.co.uk',g:['#2b2b2b','#0e0e0e'],fg:'#fff',acc:'#db0011',re:/hsbc/i},
 {n:'Lloyds',d:'lloydsbank.com',g:['#0b8a63','#00372a'],fg:'#fff',re:/lloyds/i},
 {n:'Halifax',d:'halifax.co.uk',g:['#1a86d0','#003c6a'],fg:'#fff',re:/halifax/i},
 {n:'NatWest',d:'natwest.com',g:['#7a3aa6','#3a1654'],fg:'#fff',re:/natwest/i},
 {n:'Santander',d:'santander.co.uk',g:['#f02b2b','#8f0000'],fg:'#fff',re:/santander/i},
 {n:'Capital One',d:'capitalone.co.uk',g:['#123a63','#071a2e'],fg:'#fff',acc:'#d03027',re:/capital\s*one/i},
 {n:'Aqua',d:'aquacard.co.uk',g:['#19c3c6','#00696c'],fg:'#fff',re:/\baqua\b/i},
 {n:'Vanquis',d:'vanquis.co.uk',g:['#5b2380','#1c0a2a'],fg:'#fff',re:/vanquis/i},
 {n:'Tesco Bank',d:'tescobank.com',g:['#1a6fc2','#002b54'],fg:'#fff',acc:'#e5142b',re:/tesco/i},
 {n:'John Lewis',d:'johnlewis.com',g:['#3a3a3a','#101010'],fg:'#fff',re:/john\s*lewis/i},
 {n:'Virgin Money',d:'virginmoney.com',g:['#ee1c1c','#860404'],fg:'#fff',re:/virgin/i},
 {n:'Klarna',d:'klarna.com',g:['#ffc2d4','#ff94b6'],fg:'#17120f',re:/klarna/i},
 {n:'Clearpay',d:'clearpay.co.uk',g:['#c4fbe9','#7eead0'],fg:'#111',re:/clearpay|afterpay/i},
 {n:'PayPal',d:'paypal.com',g:['#0a3ea0','#0070e0'],fg:'#fff',re:/paypal/i},
 {n:'Creation',d:'creation.co.uk',g:['#7d2c8a','#3a1042'],fg:'#fff',re:/creation/i},
 {n:'Nationwide',d:'nationwide.co.uk',g:['#1d3f8f','#00153a'],fg:'#fff',re:/nationwide/i},
 {n:'M&S Bank',d:'marksandspencer.com',g:['#1a1a1a','#050505'],fg:'#fff',acc:'#3f9a67',re:/m\s*&\s*s|marks\s*(and|&)?\s*spencer/i},
 {n:'MBNA',d:'mbna.co.uk',g:['#1a5da8','#082b52'],fg:'#fff',re:/mbna/i},
 {n:'Axis Bank',d:'axisbank.com',g:['#a8185a','#5c0b2e'],fg:'#fff',re:/axis/i},
 {n:'Zopa',d:'zopa.com',g:['#1b2a4a','#0a1430'],fg:'#fff',acc:'#8f9bb3',re:/zopa/i},
 {n:'Novuna',d:'novuna.co.uk',g:['#24307a','#0d1440'],fg:'#fff',re:/novuna|hitachi\s*capital/i},
 {n:'Sainsbury\u2019s Bank',d:'sainsburysbank.co.uk',g:['#b85200','#7a3600'],fg:'#fff',re:/sainsbury/i},
 {n:'TSB',d:'tsb.co.uk',g:['#1c3f94','#0a1f52'],fg:'#fff',re:/\btsb\b/i},
 {n:'Co-op Bank',d:'co-operativebank.co.uk',g:['#0079a8','#00466a'],fg:'#fff',re:/\bco-?op(erative)?\s*bank/i},
 {n:'Metro Bank',d:'metrobankonline.co.uk',g:['#0033a0','#001a54'],fg:'#fff',acc:'#e4002b',re:/metro\s*bank/i},
 {n:'First Direct',d:'firstdirect.com',g:['#2b2b2b','#050505'],fg:'#fff',re:/first\s*direct/i},
 {n:'Revolut',d:'revolut.com',g:['#3a3d42','#0b0c0e'],fg:'#fff',re:/revolut/i},
 {n:'Chase',d:'chase.co.uk',g:['#117aca','#0b3d6b'],fg:'#fff',re:/\bchase\b/i},
 {n:'Student Loans Company',d:'gov.uk',g:['#1d70b8','#0b3c66'],fg:'#fff',re:/student\s*loans?\s*company|\bslc\b/i},
 {n:'Black Horse',d:'blackhorse.co.uk',g:['#1b1b1b','#050505'],fg:'#fff',acc:'#7a7a7a',re:/black\s*horse/i},
 {n:'Close Brothers',d:'closebrothers.com',g:['#0d2340','#050f1e'],fg:'#fff',re:/close\s*brothers/i},
 {n:'Visa',d:'visa.com',g:['#1a2f8f','#0b1650'],fg:'#fff',net:'visa',re:/\bvisa\b/i},
 {n:'Mastercard',d:'mastercard.com',g:['#2a2a33','#101014'],fg:'#fff',net:'mc',re:/master\s*card/i}
];
var CC_GENERIC={n:'',g:['#3a3f47','#16181c'],fg:'#eef0f3'};   // neutral slate: teal is net worth, green is assets
var debtState={debts:[]};
var BIZ_KEY='pos_biz1';
var bizState={clients:[],streams:[],incomeStreams:[],leads:[]};
var ACH_KEY='pos_ach1';
var achState={xp:0,unlocked:[],connected:{}};
/* Wealth Roadmap (owner, 3 Nov 2026; brief docs/creative/wealth-roadmap/BRIEF.md): the 30 roadmap stages are the linear spine, each
   split into up to three steps that pay XP by tier; badges and saving habits are side quests that count in any order; 20 levels in
   five ranks; a free month at Level 8 with 30 days of use. Step and quest XP is latched in achState.wr, so it never goes down. */
var WR_TIERS={starter:{n:'Starter',xp:20},solid:{n:'Solid',xp:40},strong:{n:'Strong',xp:80},summit:{n:'Summit',xp:150}};
var WR_STAGE_TIER={firstLog:'starter',mapDebts:'starter',zeroBudget:'starter',firstSaved:'starter',buf500:'starter',firstCut:'starter',
  buf1k:'solid',debtHalf:'solid',nw1k:'solid',debtFree:'solid',ef3:'solid',isa:'solid',dep1:'solid',dep5:'solid',nw5k:'solid',
  ef6:'strong',depReady:'strong',nw10k:'strong',applied:'strong',exchanged:'strong',keys:'strong',nw25k:'strong',nw50k:'strong',
  // the 20 achievements added in v0.9.1 round 2 (R8): small one-off awards that never hold up the linear stages
  profile:'starter',history:'starter',incomeIn:'starter',spendMap:'starter',savingLine:'starter',assets3:'starter',week1:'starter',
  buf250:'starter',firstPay:'starter',debt25:'starter',pay6:'starter',surplus:'starter',ef1:'starter',invest:'starter',firstDep:'starter',
  bud3:'starter',nw2500:'starter',dep75:'solid',nw75k:'strong',nw500k:'summit'};   // the rest are Summit
// slate look on the roadmap strip (owner, 4 Nov round 2, R7: "Keep green as main achievement, purple as big milestone and add a gold
// tier, one for each section which graduates user to the next part"): teal standard, purple big milestone, gold graduation (the last
// slate in each section). The XP tier above still sets the XP; the look only sets the colour.
var WR_BIG={zeroBudget:1,debtHalf:1,nw75k:1,nw500k:1};
var WR_BONUS={profile:1,history:1,incomeIn:1,spendMap:1,savingLine:1,assets3:1,week1:1,buf250:1,firstPay:1,debt25:1,pay6:1,surplus:1,ef1:1,invest:1,firstDep:1,bud3:1,nw2500:1,dep75:1,nw75k:1,nw500k:1};
var WR_LOOK_TIER={std:'solid',big:'strong',grad:'summit'};
function fireLook(s){if(!s)return 'std';if(s.grad)return 'grad';var t=wrStageTier(s.key);return WR_BIG[s.key]||t==='strong'||t==='summit'?'big':'std';}
var WR_RANKS=[{n:'Groundwork',t:'starter'},{n:'Shield',t:'solid'},{n:'Growth',t:'strong'},{n:'Keys',t:'strong'},{n:'Freedom',t:'summit'}];
var WR_LEVELS=[['Spare Change',0],['Penny Pincher',100],['Budget Builder',250],['Ledger Keeper',400],['Buffer Builder',600],['Debt Breaker',850],['Rate Slayer',1150],['Vault Guard',1550],
  ['Compounder',2050],['Yield Hunter',2650],['Market Rider',3350],['Portfolio Pilot',4150],['Goal Hunter',5050],['Brick Stacker',6000],['Key Holder',7050],['Equity Builder',8150],
  ['Coast Captain',9350],['Wealth Architect',10600],['Freedom Maker',11800],['Vault Legend',13000]].map(function(l,i){return {n:i+1,name:l[0],xp:l[1],rank:Math.floor(i/4)};});
var WR_REWARD={level:8,days:30};
// side quests from saving habits: the House Builder contribution streak (weekly or monthly) and two monthly habits, capped at 25 XP a month
var WR_QUESTS=[{id:'q3',ic:'vi-streak',name:'Three in a row',desc:'Save towards your goal 3 periods in a row',need:3,xp:10},
  {id:'q6',ic:'vi-repeat',name:'Six in a row',desc:'Save towards your goal 6 periods in a row',need:6,xp:25},
  {id:'q12',ic:'vi-flame',name:'Twelve in a row',desc:'Save towards your goal 12 periods in a row',need:12,xp:60},
  {id:'snap',ic:'vi-camera',name:'Monthly snapshot',desc:'Record your net worth this month',month:true,xp:10},
  {id:'bud',ic:'vi-budget',name:'Budget kept',desc:'Income and spending filled in this month',month:true,xp:15}];
// brand-library icons (owner, 3 Nov round 2: "utilize our brand book ... icon library"), drawn inside each token's medallion
var WR_STAGE_IC={firstLog:'vi-net-worth',mapDebts:'vi-debt-tracker',zeroBudget:'vi-budget',firstSaved:'vi-coin',buf500:'vi-lifebuoy',buf1k:'vi-shield',firstCut:'vi-paid-off',
  debtHalf:'vi-snowball',nw1k:'vi-gem',debtFree:'vi-unlock',ef3:'vi-umbrella',ef6:'vi-safe',isa:'vi-piggy',dep1:'vi-brick',dep5:'vi-brick-wall',nw5k:'vi-trend-base',
  depReady:'vi-house-builder',nw10k:'vi-coins',applied:'vi-target',exchanged:'vi-sync',keys:'vi-keys',nw25k:'vi-assets-total',nw50k:'vi-candles',nw100k:'vi-milestone',
  coastFI:'vi-boat',mortFree:'vi-home',nw250k:'vi-crown',fullFI:'vi-flame',fatFIRE:'vi-sparkle',legacy:'vi-vault',
  profile:'vi-user',history:'vi-forecast',incomeIn:'vi-income',spendMap:'vi-spend',savingLine:'vi-piggy',assets3:'vi-assets',week1:'vi-calendar',
  buf250:'vi-coin',firstPay:'vi-check',debt25:'vi-slice',pay6:'vi-repeat',surplus:'vi-trend-base',ef1:'vi-umbrella',invest:'vi-portfolio',
  firstDep:'vi-brick',bud3:'vi-budget',nw2500:'vi-cash',dep75:'vi-brick-wall',nw75k:'vi-bolt',nw500k:'vi-trophy'};
var WR_BADGE_IC={nw100:'vi-coin',nw500:'vi-coins',nw1k:'vi-cash',nw2k:'vi-piggy',nw5k:'vi-trend-base',nw10k:'vi-candles',nw25k:'vi-assets-total',nw50k:'vi-gem',nw75k:'vi-bolt',
  nw100k:'vi-milestone',nw150k:'vi-ring',nw200k:'vi-metals',nw250k:'vi-crown',nw500k:'vi-vault',nw750k:'vi-sparkle',nw1m:'vi-trophy',save10:'vi-piggy',save25:'vi-safe',
  save50:'vi-slice',snap1:'vi-camera',snap3:'vi-calendar',snap12:'vi-forecast',debtstart:'vi-debt-tracker',debt50:'vi-snowball',debtfree:'vi-paid-off',home:'vi-home',
  gold:'vi-metals',stream1:'vi-rocket',fullfi:'vi-flame',ef1k:'vi-lifebuoy',coast:'vi-boat'};
// the token card (Apex-style clipped card, owner's pick A, 3 Nov) in a 100 x 132 box, and its medallion dial
var WR_CARD=[[0,0],[72,0],[100,28],[100,132],[14,132],[0,118]];
var WR_DIAL=(function(){var d='';for(var a=0;a<360;a+=10){var r=a%30?33.9:35.1,x=Math.cos(a*Math.PI/180),y=Math.sin(a*Math.PI/180);d+='M'+(46+x*32.4).toFixed(1)+' '+(74+y*32.4).toFixed(1)+'L'+(46+x*r).toFixed(1)+' '+(74+y*r).toFixed(1);}return '<path class="wt-tick" d="'+d+'"/>';})();   // one path, so a rail of tokens stays light
var WR_CHIP={done:'<path class="wt-cg" d="M8.5 16.5l5 5L24 11"/>',wait:'<path class="wt-cg" d="M8.5 16.5l5 5L24 11"/>',
  skip:'<path class="wt-cg" d="M8 10l6 6-6 6M16 10l6 6-6 6"/>',lock:'<rect class="wt-cgf" x="10" y="15" width="12" height="9.5" rx="1.6"/><path class="wt-cg" d="M12.6 15v-2.6a3.4 3.4 0 0 1 6.8 0V15"/>'};
var WR_RIVETS=(function(){var d='';[[46,37.6],[82.4,74],[46,110.4],[9.6,74]].forEach(function(p){d+='M'+(p[0]-1.5)+' '+p[1]+'a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0';});return '<path class="wt-rivet" d="'+d+'"/>';})();   // four rivets on the medal rim, one path
var LVS=WR_LEVELS.map(function(l){return {n:l.name,xp:l.xp};});
var BADGES=[
  {id:'nw100',    icon:'🌱', get name(){return 'First '+(window.VI_CURRENCY_SYMBOL||'£')+Math.round(100*(window.VI_CURRENCY_RATE||1)).toLocaleString();},       get desc(){return 'Net worth reaches '+(window.VI_CURRENCY_SYMBOL||'£')+Math.round(100*(window.VI_CURRENCY_RATE||1)).toLocaleString();},           xp:10},
  {id:'nw500',    icon:'🪙', get name(){return 'First '+(window.VI_CURRENCY_SYMBOL||'£')+Math.round(500*(window.VI_CURRENCY_RATE||1)).toLocaleString();},       get desc(){return 'Net worth reaches '+(window.VI_CURRENCY_SYMBOL||'£')+Math.round(500*(window.VI_CURRENCY_RATE||1)).toLocaleString();},           xp:20},
  {id:'nw1k',     icon:'💷', get name(){return 'First '+(window.VI_CURRENCY_SYMBOL||'£')+Math.round(1000*(window.VI_CURRENCY_RATE||1)).toLocaleString();},     get desc(){return 'Net worth reaches '+(window.VI_CURRENCY_SYMBOL||'£')+Math.round(1000*(window.VI_CURRENCY_RATE||1)).toLocaleString();},         xp:35},
  {id:'nw2k',     icon:'💰', get name(){return (window.VI_CURRENCY_SYMBOL||'£')+Math.round(2000*(window.VI_CURRENCY_RATE||1)).toLocaleString()+' Club';},      get desc(){return 'Net worth reaches '+(window.VI_CURRENCY_SYMBOL||'£')+Math.round(2000*(window.VI_CURRENCY_RATE||1)).toLocaleString();},         xp:50},
  {id:'nw5k',     icon:'📈', get name(){return (window.VI_CURRENCY_SYMBOL||'£')+Math.round(5000*(window.VI_CURRENCY_RATE||1)).toLocaleString()+' Milestone';}, get desc(){return 'Net worth reaches '+(window.VI_CURRENCY_SYMBOL||'£')+Math.round(5000*(window.VI_CURRENCY_RATE||1)).toLocaleString();},         xp:75},
  {id:'nw10k',    icon:'🔟', name:'Five Figures',     get desc(){return 'Net worth reaches '+(window.VI_CURRENCY_SYMBOL||'£')+Math.round(10000*(window.VI_CURRENCY_RATE||1)).toLocaleString();},        xp:100},
  {id:'nw25k',    icon:'🎯', name:'Quarter Ton',      get desc(){return 'Net worth reaches '+(window.VI_CURRENCY_SYMBOL||'£')+Math.round(25000*(window.VI_CURRENCY_RATE||1)).toLocaleString();},        xp:150},
  {id:'nw50k',    icon:'💎', get name(){return (window.VI_CURRENCY_SYMBOL||'£')+Math.round(50000*(window.VI_CURRENCY_RATE||1)).toLocaleString()+' Club';},     get desc(){return 'Net worth reaches '+(window.VI_CURRENCY_SYMBOL||'£')+Math.round(50000*(window.VI_CURRENCY_RATE||1)).toLocaleString();},        xp:200},
  {id:'nw75k',    icon:'⚡', get name(){return (window.VI_CURRENCY_SYMBOL||'£')+Math.round(75000*(window.VI_CURRENCY_RATE||1)).toLocaleString()+' Strong';},   get desc(){return 'Net worth reaches '+(window.VI_CURRENCY_SYMBOL||'£')+Math.round(75000*(window.VI_CURRENCY_RATE||1)).toLocaleString();},        xp:275},
  {id:'nw100k',   icon:'💡', name:'Six Figures',      get desc(){return 'Net worth reaches '+(window.VI_CURRENCY_SYMBOL||'£')+Math.round(100000*(window.VI_CURRENCY_RATE||1)).toLocaleString();},       xp:350},
  {id:'nw150k',   icon:'🌟', get name(){return (window.VI_CURRENCY_SYMBOL||'£')+Math.round(150000*(window.VI_CURRENCY_RATE||1)).toLocaleString();},            get desc(){return 'Net worth reaches '+(window.VI_CURRENCY_SYMBOL||'£')+Math.round(150000*(window.VI_CURRENCY_RATE||1)).toLocaleString();},        xp:450},
  {id:'nw200k',   icon:'🏅', get name(){return (window.VI_CURRENCY_SYMBOL||'£')+Math.round(200000*(window.VI_CURRENCY_RATE||1)).toLocaleString();},            get desc(){return 'Net worth reaches '+(window.VI_CURRENCY_SYMBOL||'£')+Math.round(200000*(window.VI_CURRENCY_RATE||1)).toLocaleString();},        xp:550},
  {id:'nw250k',   icon:'👑', name:'Quarter Mil',      get desc(){return 'Net worth reaches '+(window.VI_CURRENCY_SYMBOL||'£')+Math.round(250000*(window.VI_CURRENCY_RATE||1)).toLocaleString();},       xp:700},
  {id:'nw500k',   icon:'🔮', name:'Half Million',     get desc(){return 'Net worth reaches '+(window.VI_CURRENCY_SYMBOL||'£')+Math.round(500000*(window.VI_CURRENCY_RATE||1)).toLocaleString();},       xp:900},
  {id:'nw750k',   icon:'🏆', get name(){return (window.VI_CURRENCY_SYMBOL||'£')+Math.round(750000*(window.VI_CURRENCY_RATE||1)).toLocaleString();},            get desc(){return 'Net worth reaches '+(window.VI_CURRENCY_SYMBOL||'£')+Math.round(750000*(window.VI_CURRENCY_RATE||1)).toLocaleString();},        xp:1100},
  {id:'nw1m',     icon:'🎖', name:'Millionaire',      get desc(){return 'Net worth reaches '+(window.VI_CURRENCY_SYMBOL||'£')+Math.round(1000000*(window.VI_CURRENCY_RATE||1)).toLocaleString();},      xp:1500},
  {id:'save10',   icon:'💳', name:'Saver 10%',        desc:'Monthly save rate ≥ 10%',          xp:50},
  {id:'save25',   icon:'🏦', name:'Saver 25%',        desc:'Monthly save rate ≥ 25%',          xp:150},
  {id:'save50',   icon:'🔑', name:'Half & Half',      desc:'Monthly save rate ≥ 50%',          xp:300},
  {id:'snap1',    icon:'📸', name:'First Snapshot',   desc:'Add first monthly NW snapshot',    xp:20},
  {id:'snap3',    icon:'📊', name:'Consistent Tracker',desc:'3 monthly snapshots added',       xp:60},
  {id:'snap12',   icon:'🗓', name:'Year in the Game', desc:'12 monthly snapshots added',       xp:200},
  {id:'debtstart',icon:'✂️', name:'First Cut',        desc:'Record your first debt',           xp:15},
  {id:'debt50',   icon:'🪓', name:'Halfway Free',     desc:'50% of a debt paid off',           xp:100},
  {id:'debtfree', icon:'🕊', name:'Debt Slayer',      desc:'All tracked debt paid off',        xp:500},
  {id:'home',     icon:'🏠', name:'Homeowner',        desc:'100% house deposit saved',         xp:300},
  {id:'gold',     icon:'🥇', name:'Gold Holder',      desc:'Hold 1+ oz of gold',              xp:100},
  {id:'stream1',  icon:'🚀', name:'Income Stream',    desc:'Add first income stream',          xp:75},
  {id:'fullfi',   icon:'🔥', name:'Financially Free', desc:'25× annual expenses invested',     xp:1000},
  {id:'ef1k',     icon:'🛡', name:'Emergency Shield', get desc(){return (window.VI_CURRENCY_SYMBOL||'£')+Math.round(1000*(window.VI_CURRENCY_RATE||1)).toLocaleString()+' emergency fund saved';},      xp:50},
  {id:'coast',    icon:'⛵', name:'Coasting to FIRE', desc:'Reached Coast FI milestone',       xp:400},
];
var CONNS=[
  // Price Feeds
  {id:'coingecko',    icon:'🦎', name:'CoinGecko',         desc:'Free live crypto prices (1000+ coins)',           type:'live',  cat:'Price Feeds'},
  {id:'metals_live',  icon:'⚗️', name:'Metals Live',        desc:'Live gold, silver, platinum spot prices',        type:'live',  cat:'Price Feeds'},
  {id:'yahoo',        icon:'📊', name:'Yahoo Finance',      desc:'Stock & ETF quotes',                             type:'live',  cat:'Price Feeds'},
  {id:'exchangerate', icon:'💱', name:'Exchange Rates',     desc:'GBP/USD/EUR live FX rates',                      type:'live',  cat:'Price Feeds'},
  {id:'alphavantage', icon:'📡', name:'Alpha Vantage',      desc:'Stocks, forex & crypto data (free API key)',     type:'manual',cat:'Price Feeds'},
  // Banking
  {id:'monzo',        icon:'🏦', name:'Monzo',              desc:'Current account & pots sync',                    type:'manual',cat:'Banking'},
  {id:'starling',     icon:'⭐', name:'Starling',           desc:'Current & savings accounts',                     type:'manual',cat:'Banking'},
  {id:'revolut',      icon:'🔄', name:'Revolut',            desc:'Multi-currency & investments',                   type:'manual',cat:'Banking'},
  {id:'lloyds',       icon:'🐴', name:'Lloyds Bank',        desc:'Current & savings accounts',                     type:'manual',cat:'Banking'},
  {id:'barclays',     icon:'🦅', name:'Barclays',           desc:'Current, savings & Barclaycard',                 type:'manual',cat:'Banking'},
  {id:'hsbc',         icon:'🏛', name:'HSBC',               desc:'Current, savings & mortgage',                    type:'manual',cat:'Banking'},
  {id:'halifax',      icon:'🏠', name:'Halifax',            desc:'Current account & mortgages',                    type:'manual',cat:'Banking'},
  {id:'nationwide',   icon:'🏢', name:'Nationwide',         desc:'Current, savings & mortgage',                    type:'manual',cat:'Banking'},
  {id:'santander',    icon:'🌹', name:'Santander',          desc:'Current account & Edge savings',                 type:'manual',cat:'Banking'},
  {id:'truelayer',    icon:'🔗', name:'TrueLayer',          desc:'Open Banking aggregator (40+ UK banks)',         type:'manual',cat:'Banking'},
  // Crypto
  {id:'binance',      icon:'🟡', name:'Binance',            desc:'Portfolio sync via read-only API key',           type:'manual',cat:'Crypto'},
  {id:'coinbase',     icon:'₿',  name:'Coinbase',           desc:'Holdings & transaction history',                 type:'manual',cat:'Crypto'},
  {id:'kraken',       icon:'🐙', name:'Kraken',             desc:'Spot & staking balances',                       type:'manual',cat:'Crypto'},
  {id:'gemini',       icon:'♊', name:'Gemini',             desc:'Crypto & Earn balances',                         type:'manual',cat:'Crypto'},
  {id:'kucoin',       icon:'🔵', name:'KuCoin',             desc:'Spot trading portfolio',                         type:'manual',cat:'Crypto'},
  // Investments
  {id:'trading212',   icon:'📈', name:'Trading 212',        desc:'Stocks, ETFs & pies',                           type:'manual',cat:'Investments'},
  {id:'freetrade',    icon:'🆓', name:'Freetrade',          desc:'Stocks & ISA portfolio',                         type:'manual',cat:'Investments'},
  {id:'etoro',        icon:'🌐', name:'eToro',              desc:'Social trading portfolio',                       type:'manual',cat:'Investments'},
  {id:'ibkr',         icon:'🏛', name:'IBKR',               desc:'Interactive Brokers global portfolio',           type:'manual',cat:'Investments'},
  {id:'hl',           icon:'📋', name:'Hargreaves Lansdown',desc:'ISA, SIPP & fund portfolio',                    type:'manual',cat:'Investments'},
  {id:'vanguard',     icon:'⛵', name:'Vanguard UK',        desc:'ISA & pension funds',                            type:'manual',cat:'Investments'},
  {id:'ajbell',       icon:'🔔', name:'AJ Bell',            desc:'ISA, SIPP & general investment',                 type:'manual',cat:'Investments'},
  // Metals
  {id:'bullionvault', icon:'🥇', name:'BullionVault',       desc:'Allocated gold & silver vault',                  type:'manual',cat:'Metals'},
  {id:'royalmint',    icon:'👑', name:'Royal Mint',         desc:'DigiGold & silver holdings',                     type:'manual',cat:'Metals'},
  {id:'goldmoney',    icon:'💛', name:'Goldmoney',          desc:'Precious metals holdings',                       type:'manual',cat:'Metals'},
  // AI
  {id:'claude_ai',    icon:'🤖', name:'Claude AI',          desc:'AI plans & summaries (set key in ⚙)',            type:'manual',cat:'AI Tools'},
  {id:'meshy_ai',     icon:'✨', name:'Meshy AI',           desc:'3D house model generation (set key in ⚙)',       type:'manual',cat:'AI Tools'},
];

