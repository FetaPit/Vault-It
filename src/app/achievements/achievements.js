// ═══════════════════════════════════════════════════════════════
// ACHIEVEMENTS JS
// ═══════════════════════════════════════════════════════════════
// achState declared above init block
// LVS, BADGES declared above init block
function saveAch(){try{localStorage.setItem(ACH_KEY,JSON.stringify(achState));}catch(e){}}
// one level for the whole app (owner, 4 Nov round 2, R22): the Wealth Roadmap's total XP (badges, roadmap steps, side quests, house
// milestones). The profile card used badge XP alone, so it said Level 7 where the Wealth Roadmap said Level 8. Nothing saved changes.
function currentLevel(){var x=wrTotalXp(),l=LVS.filter(function(v){return x>=v.xp;});return l[l.length-1]||LVS[0];}
function nextLevel(){var i=LVS.findIndex(function(v){return v.n===currentLevel().n;});return LVS[i+1]||null;}
function tryUnlock(id){
  if(!achState.unlocked.includes(id)){
    achState.unlocked.push(id);
    var b=BADGES.find(function(b){return b.id===id;});
    if(b)showToast('Badge unlocked: '+b.name);
    achState.xp+=150;saveAch();
  }
}
function checkAchievements(){
  var nw=computeNetWorth();
  var saveRate=cfTotalIn()>0?(cfTotalIn()-cfTotalOut())/cfTotalIn():0;
  var annualExp=cfTotalOut()*12;
  var snaps=(ovState.snapshots||[]).length;
  var debts=debtState.debts||[];

  var checks={
    nw100:   nw>=100,
    nw500:   nw>=500,
    nw1k:    nw>=1000,
    nw2k:    nw>=2000,
    nw5k:    nw>=5000,
    nw10k:   nw>=10000,
    nw25k:   nw>=25000,
    nw50k:   nw>=50000,
    nw75k:   nw>=75000,
    nw100k:  nw>=100000,
    nw150k:  nw>=150000,
    nw200k:  nw>=200000,
    nw250k:  nw>=250000,
    nw500k:  nw>=500000,
    nw750k:  nw>=750000,
    nw1m:    nw>=1000000,
    save10:  saveRate>=0.10,
    save25:  saveRate>=0.25,
    save50:  saveRate>=0.50,
    snap1:   snaps>=1,
    snap3:   snaps>=3,
    snap12:  snaps>=12,
    debtstart: debts.length>0,
    debt50:  debts.some(function(d){return d.original>0&&(1-d.balance/d.original)>=0.5;}),
    debtfree: debts.length>0&&debts.every(function(d){return d.balance<=0;}),
    home:    typeof state!=='undefined'&&pct()>=1,
    gold:    alState.metals.gold>=1,
    stream1: (bizState.incomeStreams||[]).length>0,
    fullfi:  annualExp>0&&nw>=(annualExp*25),
    ef1k:    alTotalCash()>=1000,
    coast:   annualExp>0&&nw>=(annualExp*12.5),
  };

  var gained=0;
  BADGES.forEach(function(b){
    if(checks[b.id]&&!(achState.unlocked||[]).includes(b.id)){
      if(!achState.unlocked)achState.unlocked=[];
      achState.unlocked.push(b.id);
      achState.xp=(achState.xp||0)+(b.xp||50);
      gained++;
      var tb=document.getElementById('toast');if(window._viActed&&!(tb&&tb.classList.contains('show')))showToast('Badge unlocked: '+b.name+'. +'+b.xp+' XP');   // as wrSync: only after the user did something, never over a toast already showing; the badge and its XP still count
    }
  });
  if(gained>0){saveAch();renderAchievements();}
}
function resetAllAchievements(){if(viBlockEdit())return;
  if(!confirm('Reset all badges and XP? Roadmap steps you still meet are counted again. This cannot be undone.'))return;
  var _wr=achState.wr||{};   // the free-month claim and days of use are never reset
  achState={unlocked:[],xp:0,snapshots:[],connected:achState.connected||{},wr:{s:{},q:{},m:{},days:_wr.days||0,last:_wr.last,claim:_wr.claim,v:1}};
  saveAch();renderAchievements();showToast('Achievements reset');
}
function wrStageTier(k){return WR_STAGE_TIER[k]||'summit';}
// set by the user's first tap, click or key press: XP toasts wait for it
['pointerdown','keydown','touchstart'].forEach(function(ev){window.addEventListener(ev,function(){window._viActed=true;},{capture:true,once:true,passive:true});});
function wrXpTier(xp){return xp<=50?'starter':xp<=150?'solid':xp<=400?'strong':'summit';}
// the token outline: an octagon with 45 degree chamfers in a 100 x 100 box, inset by d
function wrOct(d){var a=22+d*.4142,b=78-d*.4142,f=100-d;return [[a,d],[b,d],[f,a],[f,b],[b,f],[a,f],[d,b],[d,a]];}
function wrPts(p,ox,oy,sc){ox=ox||0;oy=oy||0;sc=sc||1;return p.map(function(q){return (ox+q[0]*sc).toFixed(1)+','+(oy+q[1]*sc).toFixed(1);}).join(' ');}
/* one token: an Apex-style clipped card (owner's pick A, 3 Nov round 2) in a 100 x 132 box, with a stacked edge down and left,
   diagonal stripes, halftone, and a metal medallion holding a brand-library icon (or the level number).
   o: tier, st (done, next, wait, skip, lock, own = earned in the collection), ic (a vi- sprite id), num, bars and lit (step bars),
   chip, px (the drawn width: text shows only where it renders at 10.5 px or more), tl (top-left text), name (runs up the side), r */
function wrIcon(id,x,y,s){
  if(/^vi-/.test(id||''))return '<svg class="wt-icon" x="'+x+'" y="'+y+'" width="'+s+'" height="'+s+'" viewBox="0 0 24 24"><use href="#'+id+'"/></svg>';
  var ic=FIRE_ICONS[id]||(typeof BD_ICONS!=='undefined'&&BD_ICONS[id])||FIRE_ICONS.gem,pth=function(d){return '<path d="'+d+'"/>';};
  return '<g transform="translate('+x+' '+y+') scale('+(s/24).toFixed(3)+')"><g class="wt-icf">'+ic.f.map(pth).join('')+'</g><g class="wt-ics">'+ic.d.map(pth).join('')+'</g></g>';
}
// side name width in card units: Syne 800 at 12.5 px with 1 px letter spacing, measured per character. A name wider than the
// 76 units beside the medal is squeezed to fit below the card's top corner; one that fits keeps its width (owner, 9 Nov: "Yes, fix side names")
function wrSideW(s){var W={' ':6,',':5,"'":5,'.':5.5,'-':8.5,'+':11,'I':6.5,'1':7.5,'L':13,'J':13.5,'5':13.5,'S':14,'2':14,'3':14,'7':14,'Y':14.5,'4':14.5,'8':14.5,'£':14.5,'F':15,'T':15,'6':15,'K':16,'Z':16,'R':16.5,'&':16.5,'H':17,'U':17,'%':17,'C':17.5,'D':17.5,'N':17.5,'O':17.5,'Q':17.5,'G':18,'M':21,'W':24.5},w=0;for(var i=0;i<s.length;i++)w+=W[s[i]]||15.5;return w;}
function wrTok(o){
  var t=o.tier||'starter',st=o.st||'done',px=o.px||100,sc=o.sc||px/118,L=st==='lock',dim=L||st==='skip'||st==='todo',K=wrPts(WR_CARD),n=o.bars||0,lit=o.lit==null?n:o.lit,k;   // todo: an achievement not met yet that nothing locks
  var out='<g class="wt t-'+t+' st-'+st+'">';
  for(k=2;k>=1;k--)out+='<polygon class="wt-edge" points="'+K+'" transform="translate('+(-k*3)+' '+(k*3)+')"/>';   // the stacked card edge
  out+='<polygon class="wt-card fire-face" data-r="'+(o.r||50)+'" points="'+K+'" fill="url(#'+(dim?'wtc-lock':'wtc-'+t)+')"/><g clip-path="url(#wt-clip)">';
  if(!dim)out+='<polygon points="0,0 60,0 0,60" fill="url(#wts-'+t+')"/><polygon points="100,78 100,132 38,132" fill="url(#wth-'+t+')"/>';
  else out+='<rect width="100" height="132" fill="url(#'+(st==='skip'?'wt-hatch':'wth-lock')+')"/>';
  out+='</g><polygon class="wt-rimline" points="'+K+'"/>';
  if(o.ol)out+='<polygon class="wt-ol" points="'+K+'" style="stroke:'+o.ol+'"/>';   // section colour outline (R4)
  // the medal (round 4): a metal rim with four rivets, a deep tick dial, a tier-edged face, an engraved ring and a glass highlight
  out+='<circle cx="46" cy="74" r="37.5" class="wt-metal" fill="url(#wtm'+(dim?'-lock':'')+')"/><circle class="wt-mrim" cx="46" cy="74" r="35.8"/>'+WR_DIAL+WR_RIVETS
    +'<circle class="wt-mface" cx="46" cy="74" r="32"/><circle class="wt-mring" cx="46" cy="74" r="29.4"/><circle class="wt-mdots" cx="46" cy="74" r="30.7"/>'   // v0.95 (owner, 9 Nov): larger inner circle (was 29)
    +'<path class="wt-gloss" d="M19.8 65.5a27 27 0 0 1 35.4-20.9"/>';
  if(o.num!=null){var ns=String(o.num),fs=ns.length<=2?26:ns.length===3?16:11;out+='<text class="wt-num" x="46" y="'+(74+fs*.32).toFixed(1)+'" text-anchor="middle" style="font-size:'+fs+'px">'+ns+'</text>';}   // sized so the number clears the inner ring
  else out+=wrIcon(L?'vi-lock':o.ic,21,49,50);
  if(n>0){var bw=2.6,gp=n>4?1.8:2.6,x0=46-(n*bw+(n-1)*gp)/2;for(k=0;k<n;k++)out+='<rect class="fire-stud wt-bar'+(k<lit?' on':'')+'" x="'+(x0+k*(bw+gp)).toFixed(1)+'" y="118" width="'+bw+'" height="8"/>';}
  if(o.tl!=null&&16*sc>=10.5)out+='<text class="wt-tl" x="6" y="18">'+o.tl+'</text>';   // text only where it renders at 10.5 px or more (Pedro, round 2)
  if(o.name&&12.5*sc>=10.5){var nm=String(o.name).toUpperCase();out+='<text class="wt-side" transform="translate(94 102) rotate(-90)"'+(wrSideW(nm)>76?' textLength="76" lengthAdjust="spacingAndGlyphs"':'')+'>'+nm+'</text>';}
  if(o.grey)out+='<polygon class="wt-grey" points="'+K+'"/>';   // achieved: greyed by 35% (R5); the tick chip stays on top in full colour
  if(st==='next')out+='<polygon class="wt-halo" points="'+wrPts(WR_CARD,-6,-7,1.12)+'"/>';
  if(o.chip&&WR_CHIP[o.chip])out+='<g class="wt-chip c-'+o.chip+'" transform="translate(72 106)"><path class="wt-chipbg" d="M7 0H32V32H0V7Z"/>'+WR_CHIP[o.chip]+'</g>';
  return out+'</g>';
}
// a token as its own small picture, for HTML (rank card, steps, quests, ladder, collection)
function wrTokSvg(o,px,lbl){o.px=px;return '<svg class="wt-svg" viewBox="-10 -9 118 148" width="'+px+'" height="'+Math.round(px*148/118)+'"'+(lbl?' role="img" aria-label="'+String(lbl).replace(/"/g,'&quot;')+'"':' aria-hidden="true"')+'>'+wrTok(o)+'</svg>';}

// ── XP: latched, so a figure that falls later never takes XP away ──
function wrState(){if(!achState.wr)achState.wr={s:{},q:{},m:{},days:0};var w=achState.wr;w.s=w.s||{};w.q=w.q||{};w.m=w.m||{};return w;}
function wrSum(o){var t=0;for(var k in o)t+=+o[k]||0;return t;}
function wrMonthXp(w){var t=0;for(var k in w.m)t+=Math.min(25,wrSum(w.m[k]));return t;}
function wrStepXp(key,n){return Math.round((WR_BONUS[key]?1:3)*WR_TIERS[wrStageTier(key)].xp/Math.max(1,n));}   // a round 2 achievement pays its tier's XP once, a linear stage three times that
function wrTotalXp(){var w=wrState();return (achState.xp||0)+wrSum(w.s)+wrSum(w.q)+wrMonthXp(w)+wrSum(w.h||{});}   // w.h: House Builder milestones (v0.9.1 E9)
function wrLevel(xp){if(xp==null)xp=wrTotalXp();var l=WR_LEVELS[0];WR_LEVELS.forEach(function(v){if(xp>=v.xp)l=v;});return l;}
function wrNextLevel(xp){return WR_LEVELS[wrLevel(xp).n]||null;}
function wrYm(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
function wrQuestMet(q){
  if(q.need)return (typeof hbStreak==='function'?hbStreak():0)>=q.need;
  if(q.id==='snap'){var ym=wrYm();return (ovState.snapshots||[]).some(function(x){return x.month===ym;});}
  if(q.id==='bud'){try{var b=bdState();return b.m.tIn>0&&(ovState.expenses||[]).length>0;}catch(e){return false;}}
  return false;
}
function wrQuestDone(q){var w=wrState();return q.month?!!(w.m[wrYm()]||{})[q.id]:!!w.q[q.id];}
// called with the roadmap's stages: steps of every stage up to the one to work on (in order, skipped stages excluded) earn their XP once
function wrSync(S){
  if(!S||typeof achState==='undefined'||window._viDeleted)return;   // nothing writes back after the account is deleted
  var w=wrState(),first=!w.v,before=wrTotalXp(),lv0=wrLevel(before).n,gain=[],lim=S.nextIdx<0?S.length-1:S.nextIdx;
  S.forEach(function(s,i){
    if(s.bonus?!s.done:(i>lim||s.skipPass))return;   // a round 2 achievement pays as soon as it is met, wherever it sits
    var st=s.steps||[];st.forEach(function(x,j){var id=s.key+'.'+j;if(x.met&&!w.s[id]){w.s[id]=wrStepXp(s.key,st.length);gain.push(x.lbl);}});
  });
  WR_QUESTS.forEach(function(q){if(wrQuestDone(q)||!wrQuestMet(q))return;if(q.month){var m=w.m[wrYm()]||(w.m[wrYm()]={});m[q.id]=q.xp;}else w.q[q.id]=q.xp;gain.push(q.name);});
  var after=wrTotalXp();
  if(after===before&&!first)return;
  if(first&&after>0)w.recalc=1;   // told once, quietly, on the Wealth Roadmap tab (never a toast on the opening build)
  w.v=1;saveAch();
  var lv=wrLevel(after),tb=document.getElementById('toast');
  // XP and level toasts only follow something the user did, never on the House Builder tab, and never replace a toast already showing
  var onHouse=!!(document.getElementById('tab-house')&&document.getElementById('tab-house').classList.contains('active'));   // the House Builder has its own pop-ups and milestone toasts
  if(!first&&!onHouse&&window._viActed&&!(tb&&tb.classList.contains('show'))&&typeof showToast==='function')showToast(lv.n>lv0?'Level up: Level '+lv.n+', '+lv.name+'. +'+(after-before)+' XP':'+'+(after-before)+' XP · '+gain[0]);
  if(document.getElementById('tab-achievements')&&document.getElementById('tab-achievements').classList.contains('active'))setTimeout(renderAchievements,0);
  try{renderOvAch();}catch(e){}
}
// ── the free month: Level 8 and 30 days of use, claimed by a request the owner grants by hand (owner, 3 Nov) ──
function wrRewardState(){var w=wrState(),lv=wrLevel(),d=w.days||0;return {claimed:w.claim||null,lvOk:lv.n>=WR_REWARD.level,daysOk:d>=WR_REWARD.days,days:d,lv:lv};}
function wrClaim(btn){
  var w=wrState(),r=wrRewardState();if(w.claim||!r.lvOk||!r.daysOk)return;
  var signed=false;try{signed=typeof _supaUser!=='undefined'&&_supaUser&&_supaUser.id;}catch(e){}
  if(!signed||typeof _fnInvoke!=='function'){showToast('Sign in to claim your free month');return;}
  var ctx={};try{ctx=window.viFb&&viFb.context?viFb.context():{};}catch(e){}ctx.screen='wealth_roadmap';
  if(btn){btn.disabled=true;btn.textContent='Sending…';}
  var fail=function(){if(btn){btn.disabled=false;btn.textContent='Claim my free month';}showToast('The claim did not send. Try again in a moment.');};
  _fnInvoke('tester-feedback',{kind:'feedback',text:'Free month claim: reached Level '+r.lv.n+' ('+r.lv.name+') with '+wrTotalXp()+' XP on '+r.days+' days of use.',moment:'reward_claim',context:ctx},8000)
    .then(function(res){if(!res||res.error){fail();return;}w.claim={at:new Date().toISOString().slice(0,10),lvl:r.lv.n};saveAch();renderAchievements();showToast('Claim sent. We will add your free month and e-mail you.');}).catch(fail);
}
function wrDate(iso){try{return new Date(iso+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});}catch(e){return iso;}}
function wrBar(f,lbl){f=Math.max(0,Math.min(1,f||0));return '<div class="wr-bar" role="progressbar" aria-label="'+lbl+'" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+Math.round(f*100)+'"><i style="width:'+(f*100).toFixed(1)+'%"></i></div>';}
function wrRewardHtml(){
  var r=wrRewardState(),need=WR_LEVELS[WR_REWARD.level-1],xp=wrTotalXp(),h='<div class="wr-reward'+(r.claimed?' claimed':r.lvOk&&r.daysOk?' ready':'')+'">'
    +wrTokSvg({tier:'summit',st:r.claimed||(r.lvOk&&r.daysOk)?'done':'lock',ic:'vi-gift',chip:r.claimed?'done':''},44)+'<div class="wr-rw-body">';
  if(r.claimed)h+='<b>Free month claimed</b><span>Sent on '+wrDate(r.claimed.at)+'. We add it to your account by hand and e-mail you when it is on.</span>';
  else if(r.lvOk&&r.daysOk)h+='<b>Your free month of Vault-It is ready</b><span>You reached Level '+WR_REWARD.level+', '+need.name+'. One free month per account.</span><button type="button" class="wr-claim" onclick="wrClaim(this)">Claim my free month</button>';
  else h+='<b>Earn a free month of Vault-It</b><span>Reach Level '+WR_REWARD.level+', '+need.name+', and use Vault-It on '+WR_REWARD.days+' different days. One free month per account.</span>'
    +'<div class="wr-rw-row"><small>Level '+Math.min(r.lv.n,WR_REWARD.level)+' of '+WR_REWARD.level+'</small>'+wrBar(xp/need.xp,'XP towards Level '+WR_REWARD.level)+'</div>'
    +'<div class="wr-rw-row"><small>'+Math.min(r.days,WR_REWARD.days)+' of '+WR_REWARD.days+' days</small>'+wrBar(r.days/WR_REWARD.days,'Days of use')+'</div>';
  return h+'</div></div>';
}
// next steps: the next step on the roadmap first, then the two side quests closest to done
function wrNextGoals(S){
  var out=[],w=wrState(),nw=0;try{nw=computeNetWorth();}catch(e){}
  if(S&&S.nextIdx>=0){var s=S[S.nextIdx],st=s.steps||[],j=st.findIndex(function(x){return !x.met;});if(j<0)j=st.length-1;
    out.push({tok:{tier:wrStageTier(s.key),st:'next',ic:WR_STAGE_IC[s.key]||s.ic,bars:st.length,lit:j},h:'Stage '+(s.no||S.nextIdx+1)+': '+s.name,l:st[j]?st[j].lbl:s.desc,f:s.prog?s.prog():j/Math.max(1,st.length),xp:wrStepXp(s.key,st.length),go:'fireScrollTo('+S.nextIdx+');fireShowDetail('+S.nextIdx+')'});}
  var c=[];
  WR_QUESTS.forEach(function(q){if(wrQuestDone(q))return;var f=q.need?Math.min(.99,(typeof hbStreak==='function'?hbStreak():0)/q.need):0.5;c.push({tok:{tier:wrXpTier(q.xp),st:'own',ic:q.ic},h:'Side quest: '+q.name,l:q.desc,f:f,xp:q.xp});});
  BADGES.forEach(function(b){var m=/^nw(\d+)(k|m)?$/.exec(b.id);if(!m||(achState.unlocked||[]).indexOf(b.id)>-1)return;var thr=+m[1]*(m[2]==='k'?1e3:m[2]==='m'?1e6:1);c.push({tok:{tier:wrXpTier(b.xp||50),st:'own',ic:WR_BADGE_IC[b.id]},h:'Badge: '+b.name,l:b.desc,f:Math.max(0,nw/thr),xp:b.xp||50});});
  c.sort(function(a,b){return b.f-a.f;});
  return out.concat(c.slice(0,2));
}
function wrSourceSplit(){var w=wrState();return {steps:wrSum(w.s),quests:wrSum(w.q)+wrMonthXp(w),badges:achState.xp||0,house:wrSum(w.h||{})};}
function renderAchievements(){
  if(!renderAchievements._busy){renderAchievements._busy=1;try{checkAchievements();}catch(e){}renderAchievements._busy=0;}   // badges already met unlock before the tab draws
  var S=null;try{S=renderFIREroadmap._stages||fireBuildStages();}catch(e){}
  try{renderFIREroadmap();}catch(e){}
  var xp=wrTotalXp(),lv=wrLevel(xp),nx=wrNextLevel(xp),rk=WR_RANKS[lv.rank],pc=nx?(xp-lv.xp)/(nx.xp-lv.xp):1,src=wrSourceSplit(),fmt=function(v){return Math.round(v).toLocaleString('en-GB');};
  var cnt=document.getElementById('wr-count');if(cnt&&S)cnt.textContent=(S.doneCount+(S.bonusDone||0))+' of '+S.length+' achieved';
  var rkEl=document.getElementById('wr-rank');
  if(rkEl)rkEl.innerHTML='<div class="wr-rank-main"><div class="wr-rank-tok" id="ach-level-badge">'+wrTokSvg({tier:rk.t,st:'done',bars:8,lit:Math.floor(pc*8),num:lv.n,tl:'LV',name:rk.n},160,'Level '+lv.n+' of 20, '+lv.name+', rank '+rk.n)+'</div>'
    +'<div class="wr-rank-meta"><span class="wr-eyebrow">Rank: '+rk.n+' · Level '+lv.n+' of 20</span><div class="wr-rank-name" id="wr-rank-name">'+lv.name+'</div>'
    +'<div class="wr-xpbar" role="progressbar" aria-label="XP to the next level" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+Math.round(pc*100)+'"><i style="width:'+(pc*100).toFixed(1)+'%"></i>'+[1,2,3,4,5,6,7].map(function(k){return '<b style="left:'+(k*12.5)+'%"></b>';}).join('')+'</div>'
    +'<div class="wr-xp" id="wr-xp-label">'+fmt(xp)+' XP'+(nx?' · '+fmt(nx.xp-xp)+' XP to '+nx.name:' · top level')+'</div>'
    +(wrState().recalc?'<p class="wr-recalc">Your level now counts roadmap steps and saving habits as well as badges.</p>':'')
    +'<div class="wr-split"><span>Roadmap steps <b>'+fmt(src.steps)+'</b></span><span>Side quests <b>'+fmt(src.quests)+'</b></span><span>Badges <b>'+fmt(src.badges)+'</b></span><span>House milestones <b>'+fmt(src.house)+'</b></span></div></div></div>'+wrRewardHtml();
  if(wrState().recalc&&document.getElementById('tab-achievements').classList.contains('active')){delete wrState().recalc;saveAch();}   // shown once
  var nEl=document.getElementById('wr-next');
  if(nEl)nEl.innerHTML=wrNextGoals(S).map(function(g){return '<div class="wr-goal"'+(g.go?' role="button" tabindex="0" onclick="'+g.go+'"':'')+'>'+wrTokSvg(g.tok,52)+'<div class="wr-g-body"><span class="wr-g-h">'+g.h+'</span><span class="wr-g-l">'+g.l+'</span>'+wrBar(g.f,g.h)+'</div><span class="wr-xpchip">+'+g.xp+' XP</span></div>';}).join('')||'<p class="wr-none">Every stage and quest is done. Nothing left but to enjoy it.</p>';
  var qEl=document.getElementById('wr-quests');
  if(qEl)qEl.innerHTML=WR_QUESTS.map(function(q){var d=wrQuestDone(q),tier=wrXpTier(q.xp);return '<div class="wr-tok wr-quest t-'+tier+(d?' got':'')+'">'+wrTokSvg({tier:tier,st:d?'done':'lock',ic:q.ic,chip:d?'done':'lock',tl:'+'+q.xp,name:q.name},160,q.name+(d?', earned':', not yet'))
    +'<b>'+q.name+'</b><small>+'+q.xp+' XP'+(q.month?' a month':'')+' · '+WR_TIERS[tier].n+'</small><span>'+(d?(q.month?'Done this month':'Earned'):q.desc)+'</span></div>';}).join('');
  var lEl=document.getElementById('wr-ladder');
  if(lEl)lEl.innerHTML=WR_RANKS.map(function(r,ri){var ls=WR_LEVELS.filter(function(l){return l.rank===ri;}),here=lv.rank===ri;
    return '<div class="wr-rank-grp'+(here?' here':'')+'"><div class="wr-grp-h">'+r.n+'</div>'+ls.map(function(l){var got=xp>=l.xp,cur=l.n===lv.n,rw=l.n===WR_REWARD.level;
      return '<div class="wr-step'+(cur?' cur':'')+(got?' got':'')+'">'+wrTokSvg({tier:r.t,st:got?'done':'own',num:l.n},cur?56:48)+'<span class="wr-st-n">'+l.name+'</span><small>'+fmt(l.xp)+' XP</small>'+(rw?'<span class="wr-rw-tag">Free month</span>':'')+'</div>';}).join('')+'</div>';}).join('');
  var tEl=document.getElementById('wr-tiers'),cEl=document.getElementById('wr-collection'),un=achState.unlocked||[];
  if(tEl){var f=cEl&&cEl.getAttribute('data-f')||'all';
    tEl.innerHTML='<button type="button" class="wr-chip'+(f==='all'?' on':'')+'" onclick="wrFilter(\'all\')">All '+un.length+'/'+BADGES.length+'</button>'+Object.keys(WR_TIERS).map(function(k){var all=BADGES.filter(function(b){return wrXpTier(b.xp||50)===k;});
      return '<button type="button" class="wr-chip wr-tier t-'+k+(f===k?' on':'')+'" onclick="wrFilter(\''+k+'\')">'+WR_TIERS[k].n+' '+all.filter(function(b){return un.indexOf(b.id)>-1;}).length+'/'+all.length+'</button>';}).join('');}
  if(cEl)cEl.innerHTML=BADGES.map(function(b){var u=un.indexOf(b.id)>-1,tier=wrXpTier(b.xp||50);
    return '<div class="wr-tok t-'+tier+(u?' got':'')+'">'+wrTokSvg({tier:tier,st:u?'own':'lock',ic:WR_BADGE_IC[b.id]||'vi-gem',chip:u?'':'lock',tl:'+'+(b.xp||50),name:b.name},160,b.name+(u?', earned':', locked'))+'<b>'+b.name+'</b><small>+'+(b.xp||50)+' XP · '+WR_TIERS[tier].n+'</small><span>'+(u?'Earned':b.desc)+'</span></div>';}).join('');
  if(!_isPro()){document.querySelectorAll('#tab-achievements .wr-pro').forEach(function(e){e.style.filter='blur(5px)';e.style.pointerEvents='none';});}
}
function wrFilter(k){var c=document.getElementById('wr-collection');if(c)c.setAttribute('data-f',k);renderAchievements();}
