<script id="vi-feedback">
/* ===== Tester feedback (owner, 31 Oct 2026; docs/TESTER_FEEDBACK.md) =====
 * One Feedback button on every screen: a sentence, an optional rating and a picture of the screen with every figure hidden.
 * The app attaches what we need to act on it (screen, device, theme, the last 50 actions, recent errors), never money figures.
 * During the beta it also keeps a light activity log (screens opened, features used, errors, session length) in our own
 * database; Settings > Share usage turns it off. The server function sorts feedback with Claude and emails the owner. */
(function(){
var TRAIL=[],ERRS=[],EVQ=[],SES=null,SES_T0=Date.now(),TAB='overview',TAB_T0=Date.now(),KEY_ACT='vi-fb-activity',FN='tester-feedback',H2C='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
var shot=null,shotBusy=null,rating=null,moment=null,returnTo=null;
function now(){return new Date().toISOString()}
/* labels in the trail: a button's id or short visible text, with every figure removed */
function clean(s){return String(s||'').replace(/[£$€]\s?[\d.,]+\s?[kKmM]?/g,'').replace(/\d/g,'').replace(/\s+/g,' ').trim().slice(0,40)}
function actOn(){try{return localStorage.getItem(KEY_ACT)!=='0'}catch(e){return true}}
function signedIn(){try{return !!(typeof _supaUser!=='undefined'&&_supaUser&&_supaUser.id)}catch(e){return false}}
function uuid(){try{if(crypto.randomUUID)return crypto.randomUUID()}catch(e){}return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=Math.random()*16|0;return (c==='x'?r:(r&3|8)).toString(16)})}
function rec(ev,el,ms,toLog){var e={t:now(),ev:ev,tab:TAB};if(el)e.el=clean(el);if(ms!=null)e.ms=Math.round(ms);TRAIL.push(e);if(TRAIL.length>50)TRAIL.shift();if(toLog!==false&&actOn()){EVQ.push(e);if(EVQ.length>200)EVQ.shift()}}
SES=uuid();rec('session_start');
/* screens: wrap the tab functions (time on the previous screen goes with the next one) */
function wrapTabs(){
  ['showTab','showSubtab'].forEach(function(fn){var o=window[fn];if(typeof o!=='function'||o._fb)return;
    var w=function(){var nt=fn==='showTab'?arguments[0]:(arguments[0]+'/'+arguments[1]),t=Date.now(),ms=t-TAB_T0;var r=o.apply(this,arguments);if(nt&&nt!==TAB){if(TAB==='overview'&&ms>60000)try{viFbMoment('nw3d')}catch(e){}TAB=String(nt).slice(0,40);TAB_T0=t;rec('tab',null,ms)}return r};
    w._fb=true;window[fn]=w;try{if(fn==='showTab')showTab=w;else showSubtab=w}catch(e){}});
  /* features: named actions, no values */
  ['addExpense','addIncome','saveDebt','addOtherAsset','addLiability','addCrypto','addCashAccount','exportData','viToggleTheme','i3dPick','wiLinkSave','hbOpenMortgageEntry'].forEach(function(fn){var o=window[fn];if(typeof o!=='function'||o._fb)return;
    var w=function(){var r=o.apply(this,arguments);try{rec('feature',fn);
      if(fn==='addExpense'&&typeof ovState!=='undefined'&&(ovState.expenses||[]).length>=3)viFbMoment('budget');
      if(fn==='saveDebt'&&typeof debtState!=='undefined'&&(debtState.debts||[]).length>=1)viFbMoment('debt');
      if((fn==='addCashAccount'||fn==='addOtherAsset')&&typeof alState!=='undefined'&&((alState.cashAccounts||[]).length+(alState.otherAssets||[]).length)>=2)viFbMoment('assets');
      if(fn==='addCrypto')setTimeout(function(){viFbMoment('prices')},4000)}catch(e){}return r};
    w._fb=true;window[fn]=w});
}
document.addEventListener('click',function(e){var b=e.target&&e.target.closest&&e.target.closest('button,a,[role="button"],label.dep-btn,label.wi-img-btn');if(!b||b.closest('#vi-fb'))return;
  rec('click',b.id||b.getAttribute('aria-label')||b.title||b.textContent,null,false)},true);
window.addEventListener('error',function(e){var m=String(e&&e.message||'error').replace(/\d+/g,'#').slice(0,200),s=String(e&&e.filename||'').split('/').pop()+':'+(e&&e.lineno||0);ERRS.push({t:now(),msg:m,src:s});if(ERRS.length>20)ERRS.shift();rec('error',m)});
window.addEventListener('unhandledrejection',function(e){var m=String(e&&e.reason&&(e.reason.message||e.reason)||'rejection').replace(/\d+/g,'#').slice(0,200);ERRS.push({t:now(),msg:m,src:'promise'});if(ERRS.length>20)ERRS.shift();rec('error',m)});
function context(){
  var q=function(id){var e=document.getElementById(id);return e?e.className:''};
  var flags={};try{flags.nw=typeof viFlag==='function'?!!viFlag('nw'):null}catch(e){}
  return {build:document.lastModified,host:location.host,tab:TAB,viewport:innerWidth+'x'+innerHeight,dpr:window.devicePixelRatio||1,touch:'ontouchstart' in window,
    theme:document.documentElement.dataset.theme||'dark',flags:flags,standalone:!!(window.matchMedia&&matchMedia('(display-mode: standalone)').matches),online:navigator.onLine,
    sync:(function(){try{return JSON.parse(localStorage.getItem('vi_dirty')||'[]').length?'waiting':'ok'}catch(e){return '?'}})(),
    trialDay:(function(){try{return viAccountDay()}catch(e){return null}})(),ua:navigator.userAgent.slice(0,160),errors:ERRS.slice(-20),trail:TRAIL.slice(-50)};
}
/* ---- the activity log: batched, sent every minute and when the page is hidden ---- */
var _tok=null;
async function token(){try{if(typeof _freshAccessToken==='function'){var t=await _freshAccessToken();if(t)_tok=t}}catch(e){}return _tok}
function flush(keep){
  if(!EVQ.length||!signedIn()||!actOn())return Promise.resolve(false);
  var batch=EVQ.splice(0,200),body=JSON.stringify({kind:'events',session:SES,events:batch});
  var go=function(t){if(!t){EVQ.unshift.apply(EVQ,batch);return false}
    return fetch(_SUPA_URL+'/functions/v1/'+FN,{method:'POST',keepalive:!!keep,headers:{'content-type':'application/json',apikey:_SUPA_KEY,authorization:'Bearer '+t},body:body})
      .then(function(r){return r.ok}).catch(function(){return false})};
  return keep?Promise.resolve(go(_tok)):token().then(go);
}
setInterval(function(){flush(false)},60000);
document.addEventListener('visibilitychange',function(){if(document.hidden){rec('session_end',null,Date.now()-SES_T0);flush(true)}else{SES_T0=Date.now();rec('session_start')}});
/* ---- the picture of the screen, every figure hidden before it leaves the device ---- */
function loadH2C(){if(window.html2canvas)return Promise.resolve(window.html2canvas);
  return new Promise(function(res,rej){var s=document.createElement('script');s.src=H2C;s.onload=function(){res(window.html2canvas)};s.onerror=rej;document.head.appendChild(s);setTimeout(function(){rej(new Error('timeout'))},8000)})}
function maskDoc(doc){
  var w=doc.createTreeWalker(doc.body,NodeFilter.SHOW_TEXT),n;while((n=w.nextNode()))if(/\d/.test(n.nodeValue))n.nodeValue=n.nodeValue.replace(/\d/g,'•');
  [].forEach.call(doc.querySelectorAll('input,textarea'),function(i){if(/checkbox|radio|button|submit/.test(i.type))return;var v=String(i.value||'').replace(/\d/g,'•');i.value=v;i.setAttribute('value',v);if(i.placeholder)i.placeholder=i.placeholder.replace(/\d/g,'•')});
  var fb=doc.getElementById('vi-fb');if(fb)fb.remove();var bt=doc.getElementById('vi-fb-btn');if(bt)bt.remove();
}
function pixelate(out,scale){   /* charts and 3D scenes are pictures, so their figures cannot be swapped out: blur them into blocks */
  var c=out.getContext('2d');c.imageSmoothingEnabled=false;
  [].forEach.call(document.querySelectorAll('canvas'),function(cv){var r=cv.getBoundingClientRect();if(r.width<8||r.height<8||r.bottom<0||r.right<0||r.top>innerHeight||r.left>innerWidth)return;
    var x=Math.max(0,r.left)*scale,y=Math.max(0,r.top)*scale,w=(Math.min(innerWidth,r.right)-Math.max(0,r.left))*scale,h=(Math.min(innerHeight,r.bottom)-Math.max(0,r.top))*scale;if(w<2||h<2)return;
    var t=document.createElement('canvas'),k=14;t.width=Math.max(1,Math.round(w/k));t.height=Math.max(1,Math.round(h/k));var tc=t.getContext('2d');tc.drawImage(out,x,y,w,h,0,0,t.width,t.height);c.drawImage(t,0,0,t.width,t.height,x,y,w,h)});
}
function capture(){
  if(shotBusy)return shotBusy;
  shotBusy=loadH2C().then(function(h2c){var scale=Math.min(1,960/innerWidth);
    return h2c(document.body,{x:scrollX,y:scrollY,width:innerWidth,height:innerHeight,windowWidth:innerWidth,windowHeight:innerHeight,scale:scale,logging:false,useCORS:false,
      backgroundColor:getComputedStyle(document.body).backgroundColor,ignoreElements:function(el){return el.id==='vi-fb'||el.id==='vi-fb-btn'},onclone:function(d){maskDoc(d)}})
      .then(function(out){pixelate(out,out.width/innerWidth);var q=.62,u=out.toDataURL('image/jpeg',q);while(u.length>680000&&q>.25){q-=.12;u=out.toDataURL('image/jpeg',q)}return u.length>680000?null:u})})
    .catch(function(e){console.warn('[Vault-It] feedback picture',e);return null}).then(function(u){shot=u;shotBusy=null;paintShot();return u});
  return shotBusy;
}
function paintShot(){var p=document.getElementById('vi-fb-shot'),cb=document.getElementById('vi-fb-pic'),st=document.getElementById('vi-fb-picst');if(!p)return;
  if(shot){p.src=shot;p.hidden=false;if(st)st.textContent='Your figures are hidden in the picture.';if(cb)cb.disabled=false}
  else if(shotBusy){p.hidden=true;if(st)st.textContent='Taking the picture…'}
  else{p.hidden=true;if(cb){cb.checked=false;cb.disabled=true}if(st)st.textContent='A picture of the screen is not available here; your words are enough.'}}
/* ---- the sheet ---- */
function sheet(){
  var m=document.getElementById('vi-fb');if(m)return m;
  m=document.createElement('div');m.id='vi-fb';m.className='vi-pop';m.hidden=true;
  m.setAttribute('onclick',"if(event.target===this)viFbClose()");m.setAttribute('onkeydown',"if(event.key==='Escape')viFbClose()");
  m.innerHTML='<div class="ov-data-card vi-pop-card vi-fb-card" role="dialog" aria-modal="true" aria-labelledby="vi-fb-title">'
    +'<div class="vi-pop-hd"><div class="ov-data-title" id="vi-fb-title">Send feedback</div><button class="inv-x" type="button" onclick="viFbClose()" aria-label="Close"><svg class="vi-ic g" aria-hidden="true"><use href="#vi-close"/></svg></button></div>'
    +'<label class="vi-fb-q" for="vi-fb-text" id="vi-fb-q">What happened, or what would you change?</label>'
    +'<textarea id="vi-fb-text" class="al-inp" rows="4" maxlength="4000" placeholder="One sentence is plenty"></textarea>'
    +'<div class="vi-fb-rate" role="group" aria-label="How is it going, 1 to 5"><span>How is it going?</span>'+[1,2,3,4,5].map(function(n){return '<button type="button" data-r="'+n+'" aria-pressed="false" onclick="viFbRate('+n+')">'+n+'</button>'}).join('')+'</div>'
    +'<label class="vi-fb-pic"><input type="checkbox" id="vi-fb-pic" checked> Attach a picture of this screen</label>'
    +'<div class="vi-fb-picrow"><img id="vi-fb-shot" alt="The picture that will be sent, with figures hidden" hidden><span id="vi-fb-picst" class="wi-link-hint"></span></div>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn-add-data" type="button" id="vi-fb-send" onclick="viFbSend()">Send</button>'
    +'<button class="btn-add-data" type="button" style="background:transparent;border-color:var(--t3);color:var(--t3)" onclick="viFbClose()">Cancel</button></div>'
    +'<div id="vi-fb-msg" class="vi-pop-msg" role="alert"></div>'
    +'<p class="wi-link-hint">Goes to the Vault-It team with the screen you are on and your last few taps (never your figures). It is sorted by Anthropic’s Claude. <a href="#" onclick="viFbClose();try{showPrivacy()}catch(e){};return false">Privacy notice</a></p></div>';
  document.body.appendChild(m);return m;
}
window.viFbOpen=function(mo){
  var m=sheet();moment=mo||null;rating=null;returnTo=document.activeElement;
  document.getElementById('vi-fb-q').textContent='What happened, or what would you change?';
  document.getElementById('vi-fb-text').value='';document.getElementById('vi-fb-msg').textContent='';
  [].forEach.call(m.querySelectorAll('.vi-fb-rate button'),function(b){b.setAttribute('aria-pressed','false')});
  var cb=document.getElementById('vi-fb-pic');cb.checked=true;cb.disabled=false;
  shot=null;rec('feedback_open',mo||'button',null,false);
  m.hidden=false;document.body.classList.add('vi-pop-open');capture();paintShot();
  if(!signedIn())document.getElementById('vi-fb-msg').innerHTML='Sign in to send feedback from here, or email <a href="mailto:hello@vault-it.co?subject=Vault-It%20beta%20feedback">hello@vault-it.co</a>.';
  setTimeout(function(){var t=document.getElementById('vi-fb-text');if(t)t.focus()},40);
};
window.viFbClose=function(){var m=document.getElementById('vi-fb');if(m)m.hidden=true;document.body.classList.remove('vi-pop-open');var b=returnTo;returnTo=null;if(b&&b.focus)setTimeout(function(){try{b.focus()}catch(e){}},0)};
window.viFbRate=function(n){rating=n;[].forEach.call(document.querySelectorAll('#vi-fb .vi-fb-rate button'),function(b){b.setAttribute('aria-pressed',String(+b.dataset.r===n))})};
window.viFbSend=async function(){
  var msg=document.getElementById('vi-fb-msg'),txt=document.getElementById('vi-fb-text').value.trim(),btn=document.getElementById('vi-fb-send');
  if(!signedIn()){msg.innerHTML='Sign in to send feedback from here, or email <a href="mailto:hello@vault-it.co?subject=Vault-It%20beta%20feedback">hello@vault-it.co</a>.';return}
  if(!txt&&!rating){msg.textContent='Write a sentence or pick a number first.';document.getElementById('vi-fb-text').focus();return}
  btn.disabled=true;msg.textContent='Sending…';
  if(document.getElementById('vi-fb-pic').checked&&shotBusy){try{await shotBusy}catch(e){}}
  var body={kind:'feedback',text:txt.slice(0,4000),rating:rating,moment:moment||null,screenshot:document.getElementById('vi-fb-pic').checked?shot:null,context:context()};
  var r=null;try{r=await _fnInvoke(FN,body,20000)}catch(e){r={error:e}}
  btn.disabled=false;
  if(r&&!r.error&&r.data&&r.data.ok){rec('feedback_sent',moment||'button');viFbClose();try{showToast('Thank you. Pete reads every one.')}catch(e){}flush(false);return}
  var st=r&&r.error&&r.error.context&&r.error.context.status;
  msg.innerHTML=st===429?'That is a lot of feedback for one day. Thank you! Email <a href="mailto:hello@vault-it.co">hello@vault-it.co</a> for anything else.':'Could not send just now. Try again in a moment, or email <a href="mailto:hello@vault-it.co?subject=Vault-It%20beta%20feedback">hello@vault-it.co</a>.';
};
/* ---- honest questions (owner, 31 Oct: "way more specific separate questions ... to identify honest feedback prior to launch") ----
 * Written to get what people did and expected, not whether they like it. Each is short, skippable and asked once.
 * One prompt per visit at most, never in the first minute; the rest wait for a later visit. Wording lives here only. */
var VI_FB_Q={
  budget:{t:'Setting up your budget: which part was hardest to fill in?',c:['Income','Bills','Everyday spending','Savings','None, it was easy'],x:'What made it hard? (optional)'},
  house:{t:'Does the house builder make your deposit feel closer, further away, or no different?',c:['Closer','No different','Further away','Not sure'],x:'Why? (optional)'},
  debt:{t:'Do your debt figures here match what your lender shows you?',c:['Yes','Close','No','Not checked'],x:'If not, what is different? (optional)'},
  assets:{t:'Is there money you chose not to add? What, and why?',c:['I added everything','Some, on purpose','Some, it was too fiddly','Some, I did not trust it'],x:'Tell us more (optional)'},
  prices:{t:'Were the live prices close to what your bank, app or exchange shows?',c:['Yes','Close','No','Not checked'],x:'Which one was off? (optional)'},
  nw3d:{t:'What does Net worth in 3D tell you that a normal graph does not?',c:['More','The same','Less','I did not get it'],x:'In your words (optional)'},
  bd3d:{t:'The 3D budget view: is it clearer than the flow chart, or just prettier?',c:['Clearer','About the same','Just prettier','Harder to read']},
  trust:{t:'Did anything make you hesitate to type in your real figures?',c:['No','Yes'],x:'What was it? (optional)'}
};
var VI_FB_SURVEYS={
  day3:{t:'A few days in',n:'Two minutes, three questions. Honest answers help most, the critical ones especially.',q:[
    {q:'expect',t:'What did you expect Vault-It to do that it does not?',x:'Type your answer'},
    {q:'nearly_quit',t:'Was there a moment you nearly gave up? What were you trying to do?',x:'Type your answer'},
    {q:'today',t:'How do you keep track of your money today?',c:['Banking app','Spreadsheet','Another app','Pen and paper','I do not'],x:'Which one? (optional)'}]},
  day14:{t:'Two weeks in',n:'Two minutes, five questions. Honest answers help most, the critical ones especially.',q:[
    {q:'pmf',t:'How would you feel if you could no longer use Vault-It?',c:['Very disappointed','Somewhat disappointed','Not disappointed']},
    {q:'benefit',t:'What is the main thing you get from it?',x:'Type your answer'},
    {q:'who',t:'Who do you think would get the most from it?',x:'Type your answer'},
    {q:'improve',t:'What one thing would make it more useful to you?',x:'Type your answer'},
    {q:'distrust',t:'Is there anything you do not trust about it?',c:['No','Yes'],x:'What? (optional)'}]},
  day25:{t:'A few weeks in',n:'Two minutes, five questions. Honest answers help most, the critical ones especially.',q:[
    {q:'keep',t:'Will you keep using Vault-It?',c:['Yes','Not sure','No']},
    {q:'change_mind',t:'What would change your mind, or make it a clear yes?',x:'Type your answer'},
    {q:'price',t:'At the tester price of £3.99 a month, Vault-It feels:',c:['Too cheap to trust','A bargain','About right','Getting expensive','Too expensive']},
    {q:'recommend',t:'How likely are you to recommend it to a friend?',s:1},
    {q:'recommend_why',t:'What is the main reason for your score?',x:'Type your answer'}]}
};
var _asked=false,_loadT=Date.now(),_ask=null;
function pendingGet(){try{return JSON.parse(localStorage.getItem('vi-fb-pending')||'[]')}catch(e){return []}}
function pendingSet(a){try{localStorage.setItem('vi-fb-pending',JSON.stringify(a.slice(0,8)))}catch(e){}}
function done(k){try{return !!localStorage.getItem('vi-fb-m-'+k)}catch(e){return true}}
function mark(k){try{localStorage.setItem('vi-fb-m-'+k,now())}catch(e){}}
/* ask k now if this visit has not had a prompt and the first minute has passed; otherwise keep it for a later visit */
window.viFbMoment=function(k,force){
  if(!(VI_FB_Q[k]||VI_FB_SURVEYS[k])||!signedIn()||done(k))return false;
  if(!force&&(_asked||Date.now()-_loadT<60000)){var pq=pendingGet();if(pq.indexOf(k)<0){pq.push(k);pendingSet(pq)}return false}
  _asked=true;mark(k);pendingSet(pendingGet().filter(function(x){return x!==k}));
  var sv=VI_FB_SURVEYS[k],lab=sv?sv.t+': '+sv.q.length+' quick questions':VI_FB_Q[k].t;
  var d=document.getElementById('vi-fb-nudge');if(!d){d=document.createElement('div');d.id='vi-fb-nudge';d.setAttribute('role','status');document.body.appendChild(d)}
  d.innerHTML='<span></span><button type="button" class="btn-add-data" onclick="viFbNudgeOpen()">Answer</button><button type="button" class="inv-x" aria-label="Not now" onclick="this.parentNode.hidden=true"><svg class="vi-ic g" aria-hidden="true"><use href="#vi-close"/></svg></button>';
  d.firstChild.textContent=lab;d.dataset.k=k;d.hidden=false;rec('moment',k,null,false);
  setTimeout(function(){if(d.dataset.k===k)d.hidden=true},25000);return true;
};
window.viFbNudgeOpen=function(){var d=document.getElementById('vi-fb-nudge'),k=d&&d.dataset.k;if(d)d.hidden=true;if(k)viFbAsk(k)};
/* the question sheet: one question, or a short check-in one question at a time */
function askSheet(){
  var m=document.getElementById('vi-fbq');if(m)return m;
  m=document.createElement('div');m.id='vi-fbq';m.className='vi-pop';m.hidden=true;
  m.setAttribute('onclick',"if(event.target===this)viFbAskClose()");m.setAttribute('onkeydown',"if(event.key==='Escape')viFbAskClose()");
  m.innerHTML='<div class="ov-data-card vi-pop-card vi-fb-card" role="dialog" aria-modal="true" aria-labelledby="vi-fbq-title">'
    +'<div class="vi-pop-hd"><div class="ov-data-title" id="vi-fbq-title">Quick question</div><button class="inv-x" type="button" onclick="viFbAskClose()" aria-label="Close"><svg class="vi-ic g" aria-hidden="true"><use href="#vi-close"/></svg></button></div>'
    +'<p class="wi-link-hint" id="vi-fbq-note"></p><div class="vi-fbq-step" id="vi-fbq-step" aria-live="polite"></div>'
    +'<label class="vi-fb-q" id="vi-fbq-q" for="vi-fbq-text"></label><div class="vi-fbq-ch" id="vi-fbq-ch" role="group"></div>'
    +'<textarea id="vi-fbq-text" class="al-inp" rows="3" maxlength="1000"></textarea>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn-add-data" type="button" id="vi-fbq-next" onclick="viFbAskNext()">Send</button>'
    +'<button class="btn-add-data" type="button" id="vi-fbq-skip" style="background:transparent;border-color:var(--t3);color:var(--t3)" onclick="viFbAskNext(true)">Skip</button></div>'
    +'<div id="vi-fbq-msg" class="vi-pop-msg" role="alert"></div></div>';
  document.body.appendChild(m);return m;
}
function askPaint(){
  var a=_ask,it=a.items[a.i],last=a.i===a.items.length-1;
  document.getElementById('vi-fbq-title').textContent=a.survey?VI_FB_SURVEYS[a.k].t:'Quick question';
  document.getElementById('vi-fbq-note').textContent=a.survey?VI_FB_SURVEYS[a.k].n:'Honest answers help most. Skip it if you prefer.';
  document.getElementById('vi-fbq-step').textContent=a.items.length>1?'Question '+(a.i+1)+' of '+a.items.length:'';
  document.getElementById('vi-fbq-q').textContent=it.t;
  var ch=document.getElementById('vi-fbq-ch'),ans=a.ans[a.i]||{};
  var opts=it.s?[0,1,2,3,4,5,6,7,8,9,10].map(String):(it.c||[]);
  ch.className='vi-fbq-ch'+(it.s?' vi-fbq-score':'');ch.setAttribute('aria-label',it.t);
  ch.innerHTML=opts.map(function(o){var on=it.s?String(ans.score)===o:ans.choice===o;return '<button type="button" aria-pressed="'+on+'" data-v="'+cfEsc(o)+'">'+cfEsc(o)+'</button>'}).join('');
  [].forEach.call(ch.children,function(b){b.onclick=function(){var v=b.dataset.v;if(it.s)ans.score=+v;else ans.choice=v;a.ans[a.i]=ans;[].forEach.call(ch.children,function(x){x.setAttribute('aria-pressed',String(x===b))})}});
  if(it.s)ch.insertAdjacentHTML('beforeend','<span class="vi-fbq-ends"><span>Not likely</span><span>Very likely</span></span>');
  var tx=document.getElementById('vi-fbq-text');tx.hidden=!it.x;tx.placeholder=it.x||'';tx.value=ans.text||'';
  document.getElementById('vi-fbq-next').textContent=last?'Send':'Next';document.getElementById('vi-fbq-msg').textContent='';
}
window.viFbAsk=function(k){
  var sv=VI_FB_SURVEYS[k],q=VI_FB_Q[k];if(!sv&&!q)return;
  _ask={k:k,survey:!!sv,items:sv?sv.q:[{q:k,t:q.t,c:q.c,x:q.x}],i:0,ans:[]};
  var m=askSheet();askPaint();m.hidden=false;document.body.classList.add('vi-pop-open');rec('question_open',k,null,false);
  setTimeout(function(){var b=m.querySelector('#vi-fbq-ch button')||document.getElementById('vi-fbq-text');if(b)b.focus()},40);
};
window.viFbAskClose=function(){var m=document.getElementById('vi-fbq');if(m)m.hidden=true;document.body.classList.remove('vi-pop-open')};
window.viFbAskNext=async function(skip){
  var a=_ask;if(!a)return;var it=a.items[a.i],ans=a.ans[a.i]||{};
  var tx=document.getElementById('vi-fbq-text');if(!tx.hidden&&tx.value.trim())ans.text=tx.value.trim().slice(0,1000);
  if(skip)a.ans[a.i]=null;else a.ans[a.i]=ans;
  if(a.i<a.items.length-1){a.i++;askPaint();return}
  var got=a.ans.map(function(x,i){if(!x||(x.choice==null&&x.score==null&&!x.text))return null;var o={q:a.items[i].q};if(x.choice!=null)o.choice=x.choice;if(x.score!=null)o.score=x.score;if(x.text)o.text=x.text;return o}).filter(Boolean);
  if(!got.length){viFbAskClose();return}
  var body=a.survey?{kind:'survey',survey:a.k,answers:got,context:context()}:{kind:'feedback',question:a.k,moment:a.k,choice:got[0].choice||null,text:got[0].text||'',rating:null,screenshot:null,context:context()};
  var btn=document.getElementById('vi-fbq-next'),msg=document.getElementById('vi-fbq-msg');btn.disabled=true;msg.textContent='Sending…';
  var r=null;try{r=await _fnInvoke(FN,body,20000)}catch(e){r={error:e}}
  btn.disabled=false;
  if(r&&!r.error&&r.data&&r.data.ok){rec('question_sent',a.k);viFbAskClose();try{showToast('Thank you. That really helps.')}catch(e){}return}
  msg.innerHTML='Could not send just now. Try again in a moment, or email <a href="mailto:hello@vault-it.co?subject=Vault-It%20beta%20feedback">hello@vault-it.co</a>.';
};
/* when to ask: check-ins on the account's days 3, 14 and 25 come first; otherwise the oldest waiting question */
function askDue(){
  if(!signedIn()||_asked)return;var day=0;try{day=viAccountDay()}catch(e){}
  var sv=day>=25&&day<=30?'day25':day>=14&&day<=18?'day14':day>=3&&day<=7?'day3':null;
  if(sv&&!done(sv)){viFbMoment(sv,true);return}
  var pq=pendingGet().filter(function(k){return !done(k)});if(pq.length)viFbMoment(pq[0],true);
}
setTimeout(askDue,65000);
document.addEventListener('visibilitychange',function(){if(!document.hidden){_asked=false;_loadT=Date.now();setTimeout(askDue,65000)}});
/* triggers for the single questions */
function trig(){
  try{var n=0;try{n=+localStorage.getItem('vi-fb-visits')||0}catch(e){}if(!sessionStorage.getItem('vi-fb-v')){sessionStorage.setItem('vi-fb-v','1');n++;localStorage.setItem('vi-fb-visits',String(n))}if(n>=2)viFbMoment('trust')}catch(e){}
}
setTimeout(trig,2000);
/* ---- Settings: share usage ---- */
window.viFbAct=function(on,btn){try{localStorage.setItem(KEY_ACT,on?'1':'0')}catch(e){}if(!on)EVQ.length=0;
  var row=document.getElementById('set-fbact');if(row)[].forEach.call(row.children,function(b){b.classList.toggle('active',b.dataset.val===(on?'1':'0'))});try{showToast(on?'Thank you: usage sharing on':'Usage sharing off')}catch(e){}};
function init(){
  wrapTabs();
  try{if(window.bd3d&&!bd3d.show._fb){var os=bd3d.show;bd3d.show=function(v,user){var r=os.apply(this,arguments);if(v==='3d'&&user)setTimeout(function(){viFbMoment('bd3d')},8000);return r};bd3d.show._fb=true}}catch(e){}
  if(!document.getElementById('vi-fb-btn')){var b=document.createElement('button');b.id='vi-fb-btn';b.type='button';b.setAttribute('aria-label','Send feedback');b.title='Send feedback';
    b.innerHTML='<svg class="vi-ic" aria-hidden="true"><use href="#vi-chat"/></svg><span>Feedback</span>';b.onclick=function(){viFbOpen()};document.body.appendChild(b);
    /* the old dodge (left, top, tucked away) is gone: the button stays bottom right (owner, 2 Nov). It only fades while over 3D controls. */
    var pend=0,fade=function(){pend=0;var r=b.getBoundingClientRect();if(!r.width)return;
      var over=[].some.call(document.querySelectorAll('.nw3d-hud,.inv-ctl,.hud-bar'),function(h){var t=h.getBoundingClientRect();return t.width>0&&t.height>0&&getComputedStyle(h).visibility!=='hidden'&&!(r.right<=t.left||r.left>=t.right||r.bottom<=t.top||r.top>=t.bottom)});
      b.classList.toggle('vi-fb-fade',over)};
    /* rAF-throttled, with a timer fallback for when a busy 3D frame holds rAF back, and a once-a-second check for tab changes made in code */
    var run=function(){if(pend){cancelAnimationFrame(pend);clearTimeout(pend2)}fade()},pend2=0;
    var later=function(){if(!pend){pend=requestAnimationFrame(run);pend2=setTimeout(run,150)}};window.addEventListener('scroll',later,{passive:true});window.addEventListener('resize',later);document.addEventListener('click',function(){setTimeout(later,350)},true);setTimeout(later,600);setInterval(function(){if(!document.hidden)later()},1000);
    window.viFbDodge=fade}
  var row=document.getElementById('set-fbact');if(row)[].forEach.call(row.children,function(x){x.classList.toggle('active',x.dataset.val===(actOn()?'1':'0'))});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
setTimeout(wrapTabs,1500);
window.viFb={flush:flush,context:context,trail:function(){return TRAIL.slice()},queue:function(){return EVQ.slice()},capture:capture,maskDoc:maskDoc};
})();
</script>
