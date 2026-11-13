<script id="vi-help-centre">
/* ===== Help centre: guided tour, FAQs and help chat (owner, 1 Nov 2026; tests/test_help_centre.js) =====
 * The ? in the header opens Help: Ask, FAQs, Tour. The tour runs once, straight after the welcome steps and Pete's note, and opens
 * with a choice to skip into the app; Settings > Help and app tour replays it. Answers come first from VI_KB (also the FAQ list) and
 * the person's own numbers, worked out on the device. Signed-in testers get fuller answers from help-ask (Claude, help guide only,
 * never their figures). Questions nothing could answer go to tester-feedback (moment help_unanswered), which e-mails the owner. */
(function(){
// ── tour steps. sel: a CSS selector, or find(): an element. tab: switched to first. optional: skipped when the target is not on
//    screen (Simplified view hides some). when(): the step only runs when true.
var simple=function(){return document.body.classList.contains('vi-simple')};
var STEPS=[
  {id:'welcome',title:'Welcome to Vault-It',body:'Want a 60-second tour? You can skip it now and access it later under ? Help.',first:true},
  {id:'nav',sel:'#vi-tabs',title:'Your tabs',body:'Each tab is one part of the road from debt to your own front door. On a phone they sit along the bottom of the screen.'},
  {id:'ov-kpis',tab:'overview',sel:'#tab-overview .ov-kpis',title:'Your numbers at a glance',body:'Net worth is everything you own minus everything you owe. These figures update as you add things anywhere in the app.'},
  {id:'ov-nw',tab:'overview',find:function(){return document.getElementById('nw3d-hero')||(document.getElementById('nwChart')&&document.getElementById('nwChart').closest('.ov-chart-card'))},optional:true,title:'Net worth in 3D',body:'What you own stands on the gold line and what you owe hangs below it. Tap a column to read it, drag to turn it.'},
  {id:'fire',tab:'overview',sel:'#fire-roadmap-card',optional:true,title:'Financial freedom roadmap',body:'Milestones from your first log to owning your home outright. They tick off as your numbers grow. Tap one to see what it takes.'},
  {id:'budget',tab:'budget',sel:'.bd-sankey-card',optional:true,title:'Budget: start here',body:'Add your income and spending. This shows where every pound goes, and your monthly surplus powers every date and forecast in the app.'},
  {id:'house',tab:'house',sel:'#houseSceneCard',optional:true,title:'Your house, brick by brick',body:'Pick a house and a deposit target. While you save, the house is drawn as a ghost; once you buy, it fills with colour as you pay the mortgage down.'},
  {id:'house-save',tab:'house',sel:'#hb-lay',optional:true,title:'Lay the bricks',body:'Each time you save towards your deposit, add it here and watch the bricks go down.'},
  {id:'assets',tab:'assets',sel:'#assets-page .subtab-nav',optional:true,title:'Assets and liabilities',body:'Cash and savings, shares, metals, crypto, valuables and other liabilities. Live prices can keep the values up to date.'},
  {id:'debt',tab:'debt',find:function(){var b=document.getElementById('debt-method-btn-avalanche');return b&&(b.closest('.ov-chart-card')||b.parentNode)},optional:true,title:'Debt tracker',body:'List every debt, then choose Avalanche (highest interest first, saves the most) or Snowball (smallest balance first, quick wins). Tick "I’ve mapped every debt" to unlock the next roadmap step.'},
  {id:'biz',sel:'#vi-tabs .tab-btn[data-tab="biz"]',optional:true,when:function(){return !simple()},title:'Entrepreneur',body:'Build a second income with income streams, leads and clients.'},
  {id:'ach',tab:'achievements',find:function(){var b=document.getElementById('ach-level-badge');return b&&(b.closest('.ov-chart-card')||b)},optional:true,when:function(){return !simple()},title:'Wealth Roadmap',body:'Every roadmap step, badge and saving habit earns XP. Twenty levels run from Spare Change to Vault Legend, and Level 8 with 30 days of use earns a free month.'},
  {id:'ach-simple',tab:'overview',sel:'#ov-ach-card',optional:true,when:simple,title:'Achievements',body:'Earn XP and badges as you hit milestones. Coming back each day builds a streak.'},
  {id:'feedback',sel:'#vi-fb-btn',optional:true,title:'Tell Pete what you think',body:'Tap Feedback on any screen to send a sentence and, if you like, a picture of the screen with every figure hidden.'},
  {id:'settings',sel:'#sidebar-toggle',optional:true,title:'Quick view and Settings',body:'Open this side panel for your key numbers. Settings is at the bottom of it: your plan, data, sign-in PIN and a button to replay this tour.'},
  {id:'help',sel:'#vi-help-btn',title:'Help is always here',body:'Tap ? to ask a question, browse the FAQs or replay this tour. That is it. Over to you.'}
];
var TOUR_TABS=[['overview','Overview','Net worth, roadmap'],['budget','Budget','Income and spending'],['house','House builder','Your deposit in 3D'],['assets','Assets and liabilities','What you own and owe'],['debt','Debt tracker','Avalanche or snowball']];

// ── knowledge base, also the FAQ list. a: trusted HTML. k: extra search words. act: buttons {l, show:step} or {l, fn:name}.
var KB=[
  {c:'Getting started',q:'What is Vault-It?',k:'about app purpose what does it do',a:'A UK personal-finance app with one goal: get you out of the red and into your home. It tracks your budget, debts, savings and deposit, then shows the road from where you are now to getting your keys.'},
  {c:'Getting started',q:'Where should I start?',k:'first steps begin setup new',a:'Start with the <b>Budget</b>: add your income and spending. Then list your debts in <b>Debt tracker</b> and set a house and deposit target in <b>House builder</b>. Those three power most dates and forecasts.',act:[{l:'Show me the budget',show:'budget'}]},
  {c:'Getting started',q:'How do I add income or spending?',k:'salary wage pay bills expenses outgoings',a:'Open <b>Budget</b>. Add each income and each bill or spending line with its monthly amount. The aim is that income minus spending minus saving comes to zero, so every pound has a job.',act:[{l:'Show me',show:'budget'}]},
  {c:'Getting started',q:'What is the demo data?',k:'sample example fake numbers student loan barclaycard',a:'Before you sign in, sample figures load so you can look around. Tap <b>Start with your own data</b> in the bar at the top to clear them. Signing in clears them too.'},
  {c:'Getting started',q:'What is Simplified and Advanced view?',k:'simple simplified advanced view more tabs hidden entrepreneur achievements',a:'<b>Simplified</b> keeps the main tabs and hides the extra cards, Entrepreneur and the full Achievements tab. <b>Advanced</b> shows everything. Switch any time in Settings, View.',act:[{l:'Open Settings',fn:'showSettings'}]},
  {c:'Getting started',q:'Can I take the tour again?',k:'walkthrough guide replay tutorial onboarding',a:'Yes. Open <b>Settings</b> and tap <b>Replay the app tour</b>, or tap <b>?</b> then <b>Tour</b>. You can replay the whole tour or one tab.',act:[{l:'Start the tour',fn:'viTourStart'}]},
  {c:'Getting started',q:'Can I install it on my phone?',k:'install home screen app offline iphone android pwa',a:'Yes. On Android, tap <b>Install</b> when the banner appears. On iPhone, open the app in Safari, tap Share, then <b>Add to Home Screen</b>. Once installed it opens full screen and the app itself opens without a connection.'},

  {c:'Sign-in and your data',q:'How do I sign in?',k:'login log in email code pin account',a:'Use Continue with Google where it shows, or enter your email and type the 6-digit code we send. That is all you need to get in. Later you can set a 6-digit PIN (we offer it on your next visit, or use Settings, Sign-in PIN), so you sign in on any device with your email and PIN.'},
  {c:'Sign-in and your data',q:'I forgot my PIN',k:'forgot pin locked lockout wrong',a:'Tap <b>Forgot PIN? Get an email code</b> on the sign-in screen. Five wrong PINs lock PIN sign-in for 15 minutes, but an email code always works. You can change or remove your PIN in Settings, Sign-in PIN.'},
  {c:'Sign-in and your data',q:'Does my data sync between devices?',k:'sync device phone laptop cloud backup second',a:'Yes. Your data is saved to your account and follows you when you sign in on another device, with a copy kept on the device you use. Settings, Cloud sync also has version history so you can restore an earlier copy.'},
  {c:'Sign-in and your data',q:'Where is my data stored and is it safe?',k:'data stored privacy secure safe encrypted server where',a:'It is kept in your account on servers in the EU (Frankfurt), private to you, and encrypted in transit and at rest. It is <b>not</b> end-to-end encrypted. The full details are in Settings, Your data, Privacy notice.',act:[{l:'Open Settings',fn:'showSettings'}]},
  {c:'Sign-in and your data',q:'How do I download my data?',k:'download export copy backup file',a:'Settings, Your data, <b>Download my data</b>. You get a file with your figures, profile and recent saved versions.',act:[{l:'Open Settings',fn:'showSettings'}]},
  {c:'Sign-in and your data',q:'How do I delete my account?',k:'delete remove erase account close',a:'Settings, Danger Zone, <b>Delete my account permanently</b>. It asks for your PIN and offers a download first. It erases your account, your data and the copy on that device.'},
  {c:'Sign-in and your data',q:'Is this financial advice?',k:'advice regulated fca adviser recommendation',a:'No. Vault-It is a planning and tracking tool. Not regulated by the FCA. Not financial advice. Dates and values are estimates from what you enter. Speak to a regulated adviser before big money decisions.'},
  {c:'Sign-in and your data',q:'How does this help guide work?',k:'chatbot assistant ai bot claude ask answers',a:'Answers come from this guide and from your own numbers, worked out on your device. When you are signed in and the guide has no ready answer, your question (with amounts removed, never your figures) is sent to Anthropic’s Claude to answer from the guide. Questions it still cannot answer go to Pete so he can add one.'},

  {c:'Budget and debts',q:'What does the budget diagram show?',k:'sankey flow diagram 3d budget where income goes blocks',a:'<b>Where your income flows</b> shows each pound of income running into spending, saving and debt payments. Switch to <b>3D</b> to see it as blocks, each worth up to a set amount.',act:[{l:'Show me',show:'budget'}]},
  {c:'Budget and debts',q:'Avalanche or snowball: which should I use?',k:'avalanche snowball method strategy pay off order',a:'<b>Avalanche</b> pays the highest interest rate first, which saves the most money. <b>Snowball</b> clears the smallest balance first for quick wins. Debt tracker shows the interest cost of both so you can compare.',act:[{l:'Show me',show:'debt'}]},
  {c:'Budget and debts',q:'How do I add a debt?',k:'add debt loan credit card overdraft finance bnpl',a:'Open <b>Debt tracker</b> and add the name, balance, interest rate (APR), minimum monthly payment and type.',act:[{l:'Show me',show:'debt'}]},
  {c:'Budget and debts',q:'What does "I’ve mapped every debt" do?',k:'mapped every debt tick roadmap unlock next step',a:'Tick it in Debt tracker once every debt you owe is listed. It tells the roadmap your debt picture is complete and unlocks the next step.',act:[{l:'Show me',show:'debt'}]},
  {c:'Budget and debts',q:'How is my debt-free date worked out?',k:'debt free date when clear calculate',a:'Minimum payments on every debt, plus your spare monthly surplus on the highest-rate debt first, with interest added each month.'},
  {c:'Budget and debts',q:'Where can I get free debt help?',k:'struggling help support debt charity stepchange',a:'Free, confidential help: <b>StepChange</b>, <b>National Debtline</b> and <b>MoneyHelper</b>. If you are struggling, talk to one of them before taking on new credit.'},

  {c:'House builder',q:'How does the house builder work?',k:'3d bricks build ghost colour levels house',a:'Pick a house type, price and deposit. <b>Level 1</b>: the house is drawn as a ghost and bricks go down as you save your deposit. When you buy, <b>Level 2</b> starts: enter your mortgage and the house fills with colour as your share grows.',act:[{l:'Show me',show:'house'}]},
  {c:'House builder',q:'How do I add savings to my house?',k:'deposit lay bricks add saved money towards',a:'In House builder, use <b>Lay the bricks</b> each time you put money towards your deposit.',act:[{l:'Show me',show:'house-save'}]},
  {c:'House builder',q:'How big a deposit do I need?',k:'deposit size percent 10 5 how much need',a:'In House builder you set your deposit as a percentage of the home\'s price. It starts at 20% and you can change it there. The roadmap on Overview plans with its own deposit figure, shown on its Deposit card. Many UK lenders accept 5%, but a bigger deposit usually means a better rate. A regulated mortgage adviser can tell you what lenders would offer you.'},
  {c:'House builder',q:'Does a Lifetime ISA help?',k:'lisa isa bonus government 25',a:'If you add a cash account with the type <b>LISA</b>, your deposit forecast includes the 25% government bonus (up to about £83 a month). Check the LISA rules on gov.uk first.'},
  {c:'House builder',q:'The house or a 3D view is blank',k:'blank broken not showing 3d house view stuck slow',a:'Tap the reset button in the viewer, turn your phone round or reload the page. Older phones can struggle with 3D, and closing other tabs helps. If it keeps happening, tap Feedback so Pete can see it.',act:[{l:'Send feedback',fn:'viFbOpen'}]},

  {c:'Assets and tracking',q:'How do live prices work?',k:'live prices crypto gold silver metals shares stocks refresh',a:'Crypto prices come from CoinGecko, metals from metals.live and shares from Yahoo Finance via our server. Turn them on and refresh in Settings, Connections.',act:[{l:'Open Settings',fn:'showSettings'}]},
  {c:'Assets and tracking',q:'Can I connect my bank?',k:'bank open banking monzo starling barclays connect broker',a:'Not yet. For now, enter balances by hand in Assets and liabilities. Share holdings can be read from a screenshot of your investing app.'},
  {c:'Assets and tracking',q:'What is net worth?',k:'net worth own owe assets liabilities difference',a:'Everything you own (cash, savings, shares, metals, crypto, valuables, deposit saved) minus everything you owe. It shows on Overview.',act:[{l:'Show me',show:'ov-kpis'}]},
  {c:'Assets and tracking',q:'What is the Wealth Roadmap and XP?',k:'xp level badge points reward streak achievements roadmap token free month',a:'The Wealth Roadmap tab shows the same roadmap as the Overview, plus your level. Each of the 30 stages has up to three steps, and every step earns XP. Badges and saving habits are side quests that count in any order. Twenty levels run from Spare Change to Vault Legend. Reach Level 8 and use Vault-It on 30 different days to claim a free month.'},

  {c:'Plans and trial',q:'How long is the free trial?',k:'trial free 30 days how long card charged first payment',a:'The monthly and yearly plans start with 30 days free. Your card is taken at checkout and first charged on day 31. Cancel before then and you pay nothing. The Lifetime licence is one payment, charged at checkout.'},
  {c:'Plans and trial',q:'What happens if my plan ends?',k:'plan ends ended cancel cancelled failed payment renew locked wall trial',a:'Vault-It closes and shows the plans screen until you choose a plan again. Nothing you entered is deleted: it stays on your device and in your account, and Download my data works from the plans screen.'},
  {c:'Plans and trial',q:'What plans are there and what do they cost?',k:'price cost pro founder vaulter pioneer monthly yearly lifetime licence trial cancel plan subscription upgrade',a:'Vaulter is the whole app and Pioneer is Pro (it adds the Entrepreneur tab, your own 3D house design and the AI house model, and early access); each comes monthly or yearly, and yearly costs less. There is also a one-off Lifetime licence, and Household for up to 8 people is coming soon. Every Vaulter and Pioneer plan starts with 30 days free: the card is taken at checkout and first charged on day 31. To cancel, email hello@vault-it.co. Beta testers pay a lower price; each plan shows its price after the beta too. The plans screen shows the prices before you choose, and Settings, <b>Your plan</b>, shows the plan you are on.',act:[{l:'Open Settings',fn:'showSettings'}]},

  {c:'Settings and feedback',q:'How do I send feedback or report a bug?',k:'bug feedback report problem issue idea suggestion broken',a:'Tap <b>Feedback</b> (bottom right, on every screen). Write a sentence and press Send. It adds the screen you are on and a picture of it with every figure hidden. Pete reads every one.',act:[{l:'Send feedback',fn:'viFbOpen'}]},
  {c:'Settings and feedback',q:'Where are Settings?',k:'settings find open menu',a:'Open the side panel (the tab on the left edge of the screen) and tap <b>Settings</b> at the bottom.',act:[{l:'Open Settings',fn:'showSettings'}]},
  {c:'Settings and feedback',q:'Can I make the text bigger or reduce motion?',k:'accessibility text size font large contrast motion animation',a:'Yes. Settings, Display and accessibility: text size, high contrast and reduced motion. The Night and Daylight button in the header switches the colours.',act:[{l:'Open Settings',fn:'showSettings'}]},
  {c:'Settings and feedback',q:'Can I change the currency?',k:'currency usd eur dollar euro rupee gbp',a:'Settings, Currency: GBP, USD, EUR or INR. Vault-It is built around UK homebuying, so some guidance assumes UK rules.'},
  {c:'Settings and feedback',q:'What does Share usage do?',k:'share usage tracking analytics activity log',a:'During the beta the app notes which screens and features you use and any errors, never your figures or what you type, so Pete can see where people get stuck. Switch it off in Settings, Share usage.'}
];

// ── helpers
var LS=function(k,v){try{if(v===undefined)return localStorage.getItem(k);if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch(e){return null}};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var money=function(n){try{if(typeof gbpFmt==='function')return gbpFmt(+n||0)}catch(e){}n=+n||0;return(n<0?'-£':'£')+Math.round(Math.abs(n)).toLocaleString('en-GB')};
var reduced=function(){return document.body.classList.contains('reduced-motion')||(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)};
var stepById=function(id){for(var i=0;i<STEPS.length;i++)if(STEPS[i].id===id)return STEPS[i];return null};
var signedIn=function(){try{return !!(typeof _supaUser!=='undefined'&&_supaUser&&_supaUser.id)}catch(e){return false}};
var noAmounts=function(s){return String(s||'').replace(/[-+]?[£$€₹]\s*[-+]?\d[\d,.]*(?:\s?[kKmM]\b)?/g,'[amount]').replace(/\b\d{3,}(?:[,.]\d+)*\b/g,'[amount]')};

// ── tour engine
var VT={active:false,steps:[],i:0,el:null,raf:0,afterHelp:false,full:false};
function visible(el){if(!el)return false;var r=el.getBoundingClientRect();if(r.width<=2||r.height<=2)return false;var cs=getComputedStyle(el);return cs.visibility!=='hidden'&&cs.display!=='none'&&+cs.opacity>0.05}
function target(s){try{return s.find?s.find():(s.sel?document.querySelector(s.sel):null)}catch(e){return null}}
function start(steps,opts){
  opts=opts||{};var list=(steps||STEPS).filter(function(s){return !s.when||s.when()});if(!list.length)return;
  closeHelp(true);
  try{if(typeof _sidebarOpen!=='undefined'&&_sidebarOpen&&typeof toggleSidebar==='function')toggleSidebar()}catch(e){}
  VT.active=true;VT.steps=list;VT.i=0;VT.afterHelp=!!opts.afterHelp;VT.full=!steps;
  var root=document.getElementById('vi-tour');root.classList.add('on');root.setAttribute('aria-hidden','false');
  document.addEventListener('keydown',key,true);window.addEventListener('resize',queue);window.addEventListener('scroll',queue,true);
  show(0);
}
function move(d){if(!VT.active||VT.busy)return;show(VT.i+d,d)}   // busy: a step is still switching tabs; ignore extra taps
function end(skipped){
  if(!VT.active)return;VT.active=false;VT.busy=false;
  var root=document.getElementById('vi-tour');root.classList.remove('on');root.setAttribute('aria-hidden','true');
  document.removeEventListener('keydown',key,true);window.removeEventListener('resize',queue);window.removeEventListener('scroll',queue,true);
  if(VT.full){LS('vi_tour_done',skipped?'skipped':'done');if(VT.i>0)try{showTab('overview');window.scrollTo(0,0)}catch(e){}}
  if(VT.full&&!skipped){try{showToast('Tour done. Tap ? any time for help.')}catch(e){}}
  if(VT.afterHelp)setTimeout(function(){openHelp()},150);else{var b=document.getElementById('vi-help-btn');if(b&&visible(b))try{b.focus({preventScroll:true})}catch(e){}}
}
function key(e){
  if(!VT.active)return;
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();end(true)}
  else if(e.key==='ArrowRight'){e.preventDefault();move(1)}
  else if(e.key==='ArrowLeft'){e.preventDefault();move(-1)}
  else if(e.key==='Tab'){var f=[].filter.call(document.querySelectorAll('#vt-card button'),function(b){return b.offsetParent!==null});if(!f.length)return;
    if(e.shiftKey&&document.activeElement===f[0]){e.preventDefault();f[f.length-1].focus()}else if(!e.shiftKey&&document.activeElement===f[f.length-1]){e.preventDefault();f[0].focus()}}
}
function show(n,dir){
  if(n<0)return;if(n>=VT.steps.length){end(false);return}
  VT.i=n;VT.busy=true;var s=VT.steps[n],tot=VT.steps.length,wait=0;
  if(s.tab&&typeof showTab==='function'){var p=document.getElementById('tab-'+s.tab);if(!p||p.style.display==='none'||!p.classList.contains('active')){try{showTab(s.tab)}catch(e){}wait=420}}
  var paint=function(){
    if(!VT.active||VT.steps[VT.i]!==s)return;
    var el=target(s);VT.busy=false;
    if(s.optional&&tot>1&&!visible(el)){show(VT.i+(dir<0?-1:1),dir);return}   // not on screen in this view: skip it
    document.getElementById('vt-step').textContent=s.first?'TOUR':(tot>1?'STEP '+(VT.i+(VT.steps[0].first?0:1)):'HELP');
    document.getElementById('vt-bar').style.width=Math.round((VT.i+1)/tot*100)+'%';
    document.getElementById('vt-title').textContent=s.title;document.getElementById('vt-body').textContent=s.body;
    var back=document.getElementById('vt-back'),skip=document.getElementById('vt-skip'),next=document.getElementById('vt-next');
    back.hidden=!(VT.i>0&&!VT.steps[VT.i-1].first);
    skip.hidden=!(tot>1&&VT.i<tot-1);skip.textContent=s.first?'Skip, go to the app':(VT.full?'Skip tour':'Close');
    next.textContent=s.first?'Show me around':(VT.i===tot-1?(tot>1?'Finish':'Got it'):'Next');
    VT.el=visible(el)?el:null;
    if(VT.el){try{VT.el.scrollIntoView({block:VT.el.getBoundingClientRect().height>innerHeight*.6?'start':'center',inline:'nearest',behavior:reduced()?'auto':'smooth'})}catch(e){VT.el.scrollIntoView()}}
    place();setTimeout(place,reduced()?30:420);
    var c=document.getElementById('vt-card');try{c.focus({preventScroll:true})}catch(e){}
  };
  if(wait)setTimeout(paint,wait);else paint();
}
function queue(){if(VT.raf)return;VT.raf=requestAnimationFrame(function(){VT.raf=0;if(VT.active)place()})}
function place(){
  var spot=document.getElementById('vt-spot'),card=document.getElementById('vt-card'),vw=innerWidth,vh=innerHeight,pad=6,gap=12,m=16,cw=card.offsetWidth,ch=card.offsetHeight;
  if(!VT.el||!visible(VT.el)){spot.classList.add('none');card.style.left=Math.max(m,(vw-cw)/2)+'px';card.style.top=Math.max(m,(vh-ch)/2)+'px';return}
  var r=VT.el.getBoundingClientRect(),t=Math.max(4,r.top-pad),l=Math.max(4,r.left-pad),b=Math.min(vh-4,r.bottom+pad),rt=Math.min(vw-4,r.right+pad);
  spot.classList.remove('none');spot.style.top=t+'px';spot.style.left=l+'px';spot.style.width=Math.max(0,rt-l)+'px';spot.style.height=Math.max(0,b-t)+'px';
  var top;if(vh-b>=ch+gap+m)top=b+gap;else if(t>=ch+gap+m)top=t-gap-ch;else top=(r.top+r.height/2>vh/2)?m:vh-ch-m;
  var left=vw<600?(vw-cw)/2:Math.min(Math.max(m,r.left+r.width/2-cw/2),vw-cw-m);
  card.style.top=Math.max(m,Math.min(top,vh-ch-m))+'px';card.style.left=Math.max(m,left)+'px';
}
// once, straight after the welcome steps: Pete's note first (it closes by button, Esc or a click outside), then the tour
function afterWelcome(){
  var shown=false;try{shown=typeof viTesterWelcome==='function'&&viTesterWelcome()}catch(e){}
  var go=function(){if(LS('vi_tour_done'))return;LS('vi_tour_done','offered');setTimeout(function(){start(null)},500)};
  if(LS('vi_tour_done'))return;
  var tw=document.getElementById('tester-welcome');
  if(!shown||!tw||tw.classList.contains('hidden')){go();return}
  var ob=new MutationObserver(function(){if(tw.classList.contains('hidden')){ob.disconnect();go()}});ob.observe(tw,{attributes:true,attributeFilter:['class']});
}
function replay(){try{if(typeof closeSettings==='function')closeSettings()}catch(e){}setTimeout(function(){start(null)},200)}

// ── help panel
var VH={view:'ask',started:false,busy:false,history:[],sent:{}};
function openHelp(view){
  var p=document.getElementById('vi-help');if(!p)return;p.classList.add('open');
  document.getElementById('vi-help-btn').setAttribute('aria-expanded','true');setView(view||VH.view);
  if(!VH.started){VH.started=true;greet()}
}
function closeHelp(silent){var p=document.getElementById('vi-help');if(!p)return;var was=p.classList.contains('open');p.classList.remove('open');
  var b=document.getElementById('vi-help-btn');if(b){b.setAttribute('aria-expanded','false');if(was&&!silent)try{b.focus()}catch(e){}}}
function setView(v){VH.view=v;['ask','faq','tour'].forEach(function(k){document.getElementById('vh-view-'+k).classList.toggle('on',k===v);document.getElementById('vh-tab-'+k).setAttribute('aria-selected',k===v?'true':'false')});
  if(v==='faq')renderFaq(document.getElementById('vh-faq-q').value||'');if(v==='tour')renderTourList();
  if(v==='ask'&&innerWidth>600){var q=document.getElementById('vh-q');if(q)setTimeout(function(){q.focus()},50)}}
function renderTourList(){var el=document.getElementById('vh-tour-list');if(!el||el.childNodes.length)return;
  el.innerHTML=TOUR_TABS.map(function(t){return '<button class="vh-row" type="button" data-tourtab="'+t[0]+'">'+esc(t[1])+'<span>'+esc(t[2])+' →</span></button>'}).join('')}
var ALLOWED={showSettings:1,viTourStart:1,viFbOpen:1};
function actsHtml(acts){var h='';(acts||[]).forEach(function(a){if(a.show)h+='<button class="vh-act" type="button" data-show="'+esc(a.show)+'">'+esc(a.l)+'</button>';else if(a.fn&&ALLOWED[a.fn])h+='<button class="vh-act" type="button" data-fn="'+esc(a.fn)+'">'+esc(a.l)+'</button>'});return h?'<div class="vh-acts">'+h+'</div>':''}
function runAct(b){var show=b.getAttribute('data-show'),fn=b.getAttribute('data-fn');
  if(show){var s=stepById(show);if(s)start([s],{afterHelp:true});return}
  if(fn&&ALLOWED[fn]){closeHelp(true);if(fn==='viTourStart')start(null);else if(typeof window[fn]==='function')window[fn]()}}
function renderFaq(q){var el=document.getElementById('vh-faq-list');if(!el)return;q=(q||'').trim();
  var items=q?search(q,12).map(function(h){return h.e}):KB,cat='',h='';
  if(!items.length){el.innerHTML='<div class="vh-empty">No FAQs match that yet. Try asking in the Ask tab.</div>';return}
  items.forEach(function(e){if(!q&&e.c!==cat){cat=e.c;h+='<div class="vh-cat">'+esc(cat)+'</div>'}h+='<details class="vh-faq"><summary>'+esc(e.q)+'</summary><div class="vh-ans">'+e.a+actsHtml(e.act)+'</div></details>'});
  el.innerHTML=h}

// ── search: a small weighted keyword index over KB
var STOP=' a an the is are am be to of in on for and or my me i it do does did can could how what when where why which who with this that you your we our there their have has at as by from so if not no yes get any about vault please tell want know much many will would should '.split(' ').reduce(function(o,w){if(w)o[w]=1;return o},{});
var SYN={owe:'debt',owing:'debt',loan:'debt',loans:'debt',credit:'debt',overdraft:'debt',debts:'debt',bnpl:'debt',home:'house',property:'house',flat:'house',homes:'house',houses:'house',buying:'house',
  saving:'save',savings:'save',saved:'save',key:'keys',isa:'lisa',export:'download',backup:'download',copy:'download',delete:'remove',wipe:'remove',erase:'remove',close:'remove',
  price:'plan',cost:'plan',subscription:'plan',upgrade:'plan',premium:'plan',paid:'plan',pro:'plan',pioneer:'plan',safe:'privacy',secure:'privacy',private:'privacy',security:'privacy',encrypted:'privacy',
  walkthrough:'tour',tutorial:'tour',guide:'tour',onboarding:'tour',salary:'income',wage:'income',wages:'income',earn:'income',bills:'spending',expenses:'spending',expense:'spending',outgoings:'spending',budgeting:'budget',
  bitcoin:'crypto',btc:'crypto',gold:'metals',silver:'metals',stocks:'shares',stock:'shares',broken:'bug',error:'bug',problem:'bug',issue:'bug',crash:'bug',blank:'bug',login:'sign',signin:'sign',log:'sign',
  chatbot:'assistant',bot:'assistant',ai:'assistant',sankey:'diagram',chart:'diagram',graph:'diagram'};
function tok(s){return String(s||'').toLowerCase().replace(/<[^>]+>/g,' ').replace(/[^a-z0-9%]+/g,' ').split(' ').map(function(w){if(!w||STOP[w])return '';if(SYN[w])return SYN[w];
  if(w.length>4&&/ing$/.test(w))w=w.slice(0,-3);else if(w.length>3&&/s$/.test(w)&&!/ss$/.test(w))w=w.slice(0,-1);return SYN[w]||w}).filter(Boolean)}
var IDX=null;
function index(){if(IDX)return IDX;var df={},docs=KB.map(function(e){var d={q:tok(e.q+' '+e.c),k:tok(e.k||''),a:tok(e.a)},seen={};d.q.concat(d.k,d.a).forEach(function(t){if(!seen[t]){seen[t]=1;df[t]=(df[t]||0)+1}});return d});return IDX={docs:docs,df:df,n:KB.length}}
function search(query,limit){var ix=index(),qt=tok(query);if(!qt.length)return [];var res=[];
  ix.docs.forEach(function(d,i){var s=0,hit=0;qt.forEach(function(t){var idf=Math.log(1+ix.n/(ix.df[t]||ix.n)),s0=s;if(d.q.indexOf(t)>-1)s+=3*idf;if(d.k.indexOf(t)>-1)s+=2*idf;if(d.a.indexOf(t)>-1)s+=idf;
    if(t.length>=4&&d.q.indexOf(t)<0&&d.q.some(function(w){return w.indexOf(t)===0}))s+=1.2*idf;if(s>s0)hit++});if(s>0)res.push({e:KB[i],s:s/Math.sqrt(qt.length),cover:hit/qt.length})});
  res.sort(function(a,b){return b.s-a.s});return res.slice(0,limit||3)}

// ── the person's own numbers (worked out on the device; never sent anywhere)
var call=function(fn){try{return typeof window[fn]==='function'?window[fn]():undefined}catch(e){return undefined}};
function snap(){var o={};
  o.nw=call('computeNetWorth');o.debt=call('jrnyTotalDebt');o.debtCount=(typeof debtState!=='undefined'&&debtState.debts)?debtState.debts.filter(function(d){return +d.balance>0}).length:0;
  o.income=call('jrnyIncome');o.expenses=call('jrnyExpenses');o.surplus=call('jrnySurplus');o.saved=call('jrnyHouseSaved');o.target=call('jrnyHouseTarget');o.depTarget=call('jrnyDepositTarget');o.hbTarget=call('depositTarget');try{o.hbPct=+state.depositPct||null}catch(e){o.hbPct=null}
  o.depMonths=call('jrnyDepositMonths');o.debtMonths=call('jrnyDebtFreeMonths');o.efMonths=call('jrnyEFMonths');o.keys=call('jrnyKeysDate');o.maxMort=call('jrnyMaxMortgage');o.rag=call('jrnyMortgageReadiness');o.cash=call('jrnyTotalCash');
  var lv=document.getElementById('ach-level-name');o.level=lv?lv.textContent.trim():'';
  o.demo=!!(document.getElementById('demo-chip')&&visible(document.getElementById('demo-chip')));
  try{var u=JSON.parse(LS('vi_user')||'null');o.name=u&&u.name&&!u.demo?String(u.name).split(/\s+/)[0]:''}catch(e){}
  return o}
var months=function(m){return typeof jrnyFmtMonths==='function'?jrnyFmtMonths(m):m+' months'};
var mdate=function(d){try{return d.toLocaleDateString('en-GB',{month:'long',year:'numeric'})}catch(e){return ''}};
var INTENTS=[
  {re:/net ?worth|what am i worth|am i (in|out of) the red/,show:'ov-kpis',fn:function(o){if(o.nw===undefined)return null;
    return 'Your net worth is <b>'+money(o.nw)+'</b>. '+(o.nw<0?'You are in the red for now. Every debt payment moves this up.':o.nw>0?'You are out of the red. Nice work.':'Add what you own and owe to see the full picture.')}},
  {re:/when .*(keys|own|buy|get a (house|home))|keys date|(how long|when) .*(until|till|before) .*(house|home|keys)/,show:'house',fn:function(o){
    if(!o.surplus)return 'I cannot work out a keys date yet because there is no monthly surplus. Add your income and spending in the Budget and I can.';
    if(!o.keys)return null;
    return 'At your current pace you could get your keys around <b>'+mdate(o.keys)+'</b>. That allows '+(o.debtMonths?months(o.debtMonths)+' to clear your debts, ':'')+(o.depMonths?months(o.depMonths)+' to save your deposit ':'your deposit is saved ')+'and about three months to buy. It is an estimate from what you have entered.'}},
  {re:/debt[- ]?free|clear (my )?debts?|pay(ing)? off (my )?debts?/,show:'debt',fn:function(o){
    if(!o.debt)return 'You have no debts listed, so you are debt free in Vault-It. If that is not right, add them in Debt tracker.';
    if(o.debtMonths===null)return 'With '+money(o.debt)+' owed and nothing spare after minimum payments, I cannot work out a debt-free date yet. Check your income, spending and minimum payments.';
    return 'You owe <b>'+money(o.debt)+'</b> across '+o.debtCount+' debt'+(o.debtCount===1?'':'s')+'. Paying the highest interest first, you could be debt free in about <b>'+months(o.debtMonths)+'</b>.'}},
  {re:/how much (do i owe|debt)|my debts?|total debt|what do i owe/,show:'debt',fn:function(o){
    if(!o.debt)return 'You have no debts listed. If you have some, add them in Debt tracker so your dates are accurate.';
    return 'You owe <b>'+money(o.debt)+'</b> across '+o.debtCount+' debt'+(o.debtCount===1?'':'s')+(o.debtMonths?'. At your current pace that is cleared in about '+months(o.debtMonths)+'.':'.')}},
  {re:/deposit|how much (have i|i've|ive) saved|my sav/,show:'house',fn:function(o){var t=o.hbTarget;if(!t||!o.hbPct)return null;var pct=Math.min(100,Math.round((o.saved||0)/t*100)),same=o.depTarget&&Math.abs(o.depTarget-t)<1;
    return 'You have saved <b>'+money(o.saved)+'</b> of your <b>'+money(t)+'</b> deposit ('+pct+'% there). That target is '+o.hbPct+'% of a '+money(o.target)+' home, as set in House builder. '+((o.saved||0)>=t?'Your deposit is complete.':same&&o.depMonths?'At your current pace it is done in about '+months(o.depMonths)+'.':'The roadmap on Overview plans with its own deposit figure, so its dates can differ.')}},
  {re:/surplus|left over|spare (money|cash)|my (income|spending|expenses|budget)|how much (do i|can i) (earn|spend|save)/,show:'budget',fn:function(o){
    if(!o.income&&!o.expenses)return 'You have not added income or spending yet. Add them in the Budget and I can tell you what is left each month.';
    return 'Each month you bring in <b>'+money(o.income)+'</b> and spend <b>'+money(o.expenses)+'</b>, leaving <b>'+money(o.surplus)+'</b>. '+(o.surplus>0?'That surplus is what powers your debt and deposit dates.':'Finding even a small surplus is the first step.')}},
  {re:/mortgage|how much can i borrow|can i (get|afford)/,show:'house',fn:function(o){if(!o.income)return 'Add your income in the Budget first and I can give a rough idea of what you might borrow.';
    var g=0,t=0;if(o.rag)for(var k in o.rag){t++;if(o.rag[k]==='green')g++}
    return 'A rough guide is 4.5 times your yearly income, about <b>'+money(o.maxMort)+'</b>. You meet '+g+' of '+t+' mortgage-ready checks (deposit, debt to income, affordability, credit, no consumer debt). A regulated mortgage adviser can tell you what lenders would really offer.'}},
  {re:/emergency fund|rainy day|buffer/,show:'assets',fn:function(o){if(!o.expenses)return null;
    return 'You have <b>'+money(o.cash)+'</b> in cash. '+(o.efMonths===0?'Your emergency fund target is met.':o.efMonths?'You could reach your emergency fund target in about '+months(o.efMonths)+'.':'Add a monthly surplus to see when you will reach your emergency fund target.')}},
  {re:/my (level|xp)|what level|how much xp/,show:null,fn:function(o){return o.level?'You are at level <b>'+esc(o.level)+'</b>. Keep logging to level up.':null}}
];
function personal(q){var t=' '+q.toLowerCase()+' ',me=/\b(my|i|i'm|im|me|am i|i've|ive|mine)\b/.test(t);
  for(var i=0;i<INTENTS.length;i++){var it=INTENTS[i];if(!it.re.test(t))continue;if(!me&&!/net ?worth|keys date|how much can i borrow/.test(t))continue;
    var h=null;try{h=it.fn(snap())}catch(e){}if(h)return{html:h,show:it.show}}return null}

// ── conversation
var STARTERS=['When could I get my keys?','Where should I start?','How much do I owe?','Avalanche or snowball?','Is my data safe?'];
function log(){return document.getElementById('vh-log')}
function scroll(){var l=log();if(l)l.scrollTop=l.scrollHeight}
function greet(){var o=snap();var h='Hi'+(o.name?' '+esc(o.name):'')+'. I am the Vault-It guide. Ask how anything in the app works, or about your own numbers, like your keys date or your debts.';
  if(o.demo)h+=' You are looking at demo figures right now, so the answers will use those.';bot(h,{chips:STARTERS,norate:true})}
function me(t){var d=document.createElement('div');d.className='vh-msg me';d.textContent=t;log().appendChild(d);scroll()}
function bot(html,opt){opt=opt||{};var d=document.createElement('div');d.className='vh-msg bot';var h=html;
  if(opt.src)h+='<span class="vh-src">'+esc(opt.src)+'</span>';h+=actsHtml(opt.acts);
  if(!opt.norate)h+='<div class="vh-rate"><button type="button" data-r="up" aria-pressed="false" aria-label="Helpful">Helpful</button><button type="button" data-r="down" aria-pressed="false" aria-label="Not helpful">Not helpful</button></div>';
  d.innerHTML=h;if(opt.q)d.setAttribute('data-q',opt.q);log().appendChild(d);
  if(opt.chips&&opt.chips.length){var c=document.createElement('div');c.className='vh-chips';c.innerHTML=opt.chips.map(function(t){return '<button class="vh-chip" type="button">'+esc(t)+'</button>'}).join('');log().appendChild(c)}
  scroll();return d}
// unanswered: to Pete (tester-feedback e-mails him), or kept on the device when signed out or offline
function unanswered(q,kind){
  var text=noAmounts(q).slice(0,600),k=text.toLowerCase();if(VH.sent[k])return;VH.sent[k]=1;
  var keep=function(){try{var a=JSON.parse(LS('vi_help_log')||'[]');a.push({q:text,kind:kind,at:new Date().toISOString()});LS('vi_help_log',JSON.stringify(a.slice(-50)))}catch(e){}};
  if(!signedIn()||typeof _fnInvoke!=='function'){keep();return}
  var ctx={};try{ctx=window.viFb&&viFb.context?viFb.context():{}}catch(e){}ctx.screen='help';
  _fnInvoke('tester-feedback',{kind:'feedback',text:text,moment:'help_unanswered',context:ctx},8000).then(function(r){if(!r||r.error)keep()}).catch(keep)}
function local(q){
  var t=q.toLowerCase().trim();
  if(/^(hi|hello|hey|hiya|good (morning|afternoon|evening))\b[\s!.]*$/.test(t)){var o=snap();return{html:'Hello'+(o.name?' '+esc(o.name):'')+'. What can I help with?',chips:STARTERS,talk:true}}
  if(/^(thanks|thank you|cheers|ta|nice|great|ok|okay|cool)( (so much|a lot|mate))?[\s!.]*$/.test(t))return{html:'Any time. Ask me anything else whenever you like.',talk:true};
  if(/who are you|what are you|are you (a )?(human|real|bot|ai)/.test(t))return{html:'I am the Vault-It guide, built into the app. I know how each tab works and can read your numbers on this device to answer questions about them. I am not a financial adviser.',talk:true};
  if(/\b(tour|walk ?through|show me around|tutorial)\b/.test(t))return{html:'Sure. The tour takes about a minute.',acts:[{l:'Start the tour',fn:'viTourStart'}],talk:true};
  var p=personal(q),hits=search(q,4),top=hits[0];
  if(p)return{html:p.html,acts:p.show?[{l:'Show me',show:p.show}]:null,chips:hits.slice(0,2).map(function(h){return h.e.q}),src:'Worked out from your numbers on this device',sure:true,mine:true};
  var chips=hits.slice(1,3).filter(function(h){return h.s>=1.2}).map(function(h){return h.e.q});
  if(top&&top.s>=4&&top.cover>=0.6)return{html:top.e.a,acts:top.e.act,chips:chips,src:'From the FAQs: '+top.e.q,sure:true};
  if(top&&top.s>=2)return{html:top.e.a,acts:top.e.act,chips:chips,src:'From the FAQs: '+top.e.q,sure:false};
  return{miss:true,chips:hits.length?hits.slice(0,3).map(function(h){return h.e.q}):STARTERS.slice(1,4)}}
var MISS='I am not sure about that one yet. I have passed your question to Pete so he can add an answer. These might help:';
var MISS_OFF='I am not sure about that one yet. These might help, or tap Feedback to ask Pete directly:';
function ask(q){
  me(q);var l=local(q);
  if(l.talk){bot(l.html,{acts:l.acts,chips:l.chips,norate:true});return}
  if(l.sure){bot(l.html,{acts:l.acts,chips:l.chips,src:l.src,q:q});push(q,l.mine?MINE:l.html);return}
  if(signedIn()&&typeof _fnInvoke==='function'){server(q,l);return}
  if(l.miss){unanswered(q,'none');bot(MISS_OFF,{chips:l.chips,q:q,acts:[{l:'Send feedback',fn:'viFbOpen'}]});push(q,MISS_OFF);return}
  bot(l.html,{acts:l.acts,chips:l.chips,src:l.src,q:q});push(q,l.html)}
// answers worked out from the person's own numbers never join the history that help-ask sees: a placeholder stands in
var MINE='[answered from their own numbers on the device]';
function push(q,a){VH.history.push({role:'user',content:noAmounts(q)});VH.history.push({role:'assistant',content:a===MINE?MINE:noAmounts(String(a).replace(/<[^>]+>/g,''))});VH.history=VH.history.slice(-12)}
function guide(){return KB.map(function(e){return 'Q: '+e.q+'\nA: '+e.a.replace(/<[^>]+>/g,'')}).join('\n\n')}
function server(q,l){
  VH.busy=true;var wait=bot('<span class="vh-typing" aria-label="Thinking"><i></i><i></i><i></i></span>',{norate:true});
  _fnInvoke('help-ask',{question:noAmounts(q).slice(0,400),history:VH.history.slice(-6),guide:guide()},20000,false,true).then(function(r){
    wait.remove();VH.busy=false;var d=r&&!r.error&&r.data;
    if(d&&d.ok&&!d.unsure&&d.answer){var h=esc(d.answer).replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/\n+/g,'<br>');
      bot(h,{acts:d.show&&stepById(d.show)?[{l:'Show me',show:d.show}]:l.acts,chips:l.chips,src:'Answered from the help guide',q:q});push(q,d.answer);return}
    if(d&&d.ok&&d.unsure){unanswered(q,'unsure');bot(MISS,{chips:l.chips,q:q});push(q,MISS);return}
    // the service could not answer (offline, limit, not live yet): use the best FAQ, or file the question
    if(!l.miss){bot(l.html,{acts:l.acts,chips:l.chips,src:l.src,q:q});push(q,l.html);return}
    unanswered(q,'none');bot(MISS,{chips:l.chips,q:q});push(q,MISS)
  }).catch(function(){wait.remove();VH.busy=false;if(!l.miss){bot(l.html,{acts:l.acts,chips:l.chips,src:l.src,q:q})}else{unanswered(q,'none');bot(MISS,{chips:l.chips,q:q})}})}

// ── wiring
function init(){
  var panel=document.getElementById('vi-help');if(!panel)return;
  panel.addEventListener('click',function(e){
    var a=e.target.closest('.vh-act');if(a){runAct(a);return}
    var tt=e.target.closest('[data-tourtab]');if(tt){var tab=tt.getAttribute('data-tourtab');start(STEPS.filter(function(s){return s.tab===tab}),{afterHelp:true});return}
    var c=e.target.closest('.vh-chip');if(c&&!VH.busy){setView('ask');ask(c.textContent);return}
    var r=e.target.closest('.vh-rate button');if(r){[].forEach.call(r.parentNode.children,function(b){b.setAttribute('aria-pressed','false')});r.setAttribute('aria-pressed','true');
      var m=r.closest('.vh-msg'),q=m&&m.getAttribute('data-q');if(r.getAttribute('data-r')==='down'&&q)unanswered(q,'unhelpful')}
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!VT.active&&panel.classList.contains('open'))closeHelp()});
}
window.viTourStart=function(){start(null)};
window.viTourReplay=replay;
window.viAfterWelcome=afterWelcome;
window.viHelpToggle=function(){var p=document.getElementById('vi-help');if(p&&p.classList.contains('open'))closeHelp();else openHelp()};
window.viHelpOpen=openHelp;window.viHelpClose=function(){closeHelp()};window.viHelpView=setView;window.viTourMove=move;window.viTourEnd=end;
window.viHelpAsk=function(e){if(e)e.preventDefault();var i=document.getElementById('vh-q'),q=(i.value||'').trim();if(!q||VH.busy)return;i.value='';ask(q)};
window.viHelpRenderFaq=renderFaq;
window.viHelp={kb:KB,steps:STEPS,search:search,local:local,guide:guide,tour:VT};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
</script>

</body>
</html>
