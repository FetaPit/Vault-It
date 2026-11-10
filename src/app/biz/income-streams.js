// ── INCOME STREAM BUILDER ─────────────────────────────────────
var STREAM_ICON_MAP={
  youtube:'📺',video:'📺',podcast:'🎙️',blog:'📝',writing:'✍️',freelance:'💼',
  consulting:'🤝',coaching:'🎓',teaching:'🎓',course:'📚',book:'📖',
  'e-commerce':'🛒',ecommerce:'🛒',shop:'🛍️',etsy:'🛍️',amazon:'📦',
  saas:'💻',software:'💻',app:'📱',web:'🌐',design:'🎨',
  photography:'📷',music:'🎵',art:'🎨',newsletter:'📧',email:'📧',
  affiliate:'🔗',ads:'📢',advertising:'📢',rental:'🏠',property:'🏠',
  crypto:'₿',trading:'📈',stocks:'📊',dividend:'💰',investment:'💎',
  fitness:'💪',health:'🏥',food:'🍳',restaurant:'🍽️',
  agency:'🏢',marketing:'📣',social:'📱',content:'📝',
  print:'🖨️',merch:'👕',clothing:'👗',subscription:'🔄',membership:'🔑'
};
function _autoStreamIcon(name){
  var n=(name||'').toLowerCase();
  for(var k in STREAM_ICON_MAP){if(n.indexOf(k)!==-1)return STREAM_ICON_MAP[k];}
  return '💡';
}

function showStreamForm(){document.getElementById('stream-form-card').style.display='block';}

function saveIncomeStream(){if(viBlockEdit())return;
  var name=(document.getElementById('isb-name')||{}).value||'';
  if(!name.trim()){showToast('Enter a stream name');return;}
  var stream={
    id:Date.now(),
    name:name.trim(),
    icon:_autoStreamIcon(name),
    type:(document.getElementById('isb-type')||{}).value||'passive',
    monthlyIncome:parseFloat((document.getElementById('isb-income')||{}).value)||0,
    status:(document.getElementById('isb-status')||{}).value||'idea',
    steps:[],progress:0,totalInvested:0,monthlyHistory:[]
  };
  if(!bizState.incomeStreams)bizState.incomeStreams=[];
  bizState.incomeStreams.push(stream);
  saveBiz();
  document.getElementById('stream-form-card').style.display='none';
  renderIncomeStreams();
  showToast('Income stream added!');
}

function renderIncomeStreams(){
  var el=document.getElementById('income-streams-list');
  if(!el)return;
  if(!(bizState.incomeStreams||[]).length){
    el.innerHTML='<div style="font-size:max(.6rem,var(--vi-fs-2));color:var(--t3);text-align:center;padding:16px">No income streams yet. Click "+ New Stream" to add one.</div>';
    return;
  }
  el.innerHTML=bizState.incomeStreams.map(function(s){
    var statusColor=_ISB_STATUS_COLOR[s.status]||'var(--t3)';
    var stepsHtml=s.steps.length?s.steps.map(function(st,si){
      return '<label style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;cursor:pointer;font-size:max(.58rem,var(--vi-fs-2));color:var(--t2)">'
        +'<input type="checkbox" '+(st.done?'checked':'')
        +' onchange="toggleStreamStep('+s.id+','+si+',this.checked)" style="margin-top:2px;flex-shrink:0">'
        +'<span style="'+(st.done?'text-decoration:line-through;color:var(--t3)':'')+'">'+st.text+'</span></label>';
    }).join(''):'<div style="font-size:max(.56rem,var(--vi-fs-2));color:var(--t3);padding:6px 0">No plan yet. Click "Generate Plan" to get a step-by-step guide from Claude AI.</div>';
    var doneSteps=s.steps.filter(function(st){return st.done;}).length;
    var pct=s.steps.length?Math.round(doneSteps/s.steps.length*100):0;
    // Ensure tasks array exists
    if(!s.tasks)s.tasks=[];
    var tasks=s.tasks;
    var STAGES=['todo','inprogress','done'];
    var STAGE_LABELS={'todo':'To Do','inprogress':'In Progress','done':'Done'};
    var STAGE_COLORS={'todo':'var(--t3)','inprogress':'var(--go)','done':'var(--em)'};
    var kanbanHtml='<div style="margin-top:12px;padding-top:12px;border-top:1px solid rgb(var(--teal-rgb) / .08)">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:6px">'
      +'<div style="font-size:max(.52rem,var(--vi-fs-1));font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--t3)">Task Board</div>'
      +'<div style="display:flex;align-items:center;gap:5px">'
      +'<input type="text" id="newtask-'+s.id+'" class="al-inp" placeholder="New task…" style="font-size:max(.52rem,var(--vi-fs-1));padding:3px 7px;max-width:160px" onkeydown="if(event.key===\'Enter\')addStreamTask('+s.id+')">'
      +'<button class="dep-btn" onclick="addStreamTask('+s.id+')" style="font-size:max(.55rem,var(--vi-fs-1));padding:3px 8px;flex-shrink:0">+ Add</button>'
      +'</div>'
      +'</div>'
      +'<div class="g3">'
      +STAGES.map(function(stage){
        var stageTasks=tasks.filter(function(t){return t.stage===stage;});
        return'<div style="background:rgb(var(--panel-rgb) / 0.5);border-radius:6px;padding:8px;min-height:60px;border:1px solid rgb(var(--ink-rgb) / .04)">'
          +'<div style="font-size:max(.5rem,var(--vi-fs-1));font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:'+STAGE_COLORS[stage]+';margin-bottom:6px">'+STAGE_LABELS[stage]+' ('+stageTasks.length+')</div>'
          +stageTasks.map(function(t){
            var nxt=stage==='todo'?'inprogress':stage==='inprogress'?'done':null;
            var prv=stage==='done'?'inprogress':stage==='inprogress'?'todo':null;
            return'<div style="background:var(--c2);border:1px solid var(--bd);border-radius:4px;padding:5px 7px;margin-bottom:5px;font-size:max(.56rem,var(--vi-fs-2));color:var(--t2)">'
              +'<div style="margin-bottom:4px">'+t.text+'</div>'
              +'<div style="display:flex;gap:4px;flex-wrap:wrap">'
              +(nxt?'<button class="dep-btn" style="font-size:max(.48rem,var(--vi-fs-1));padding:2px 5px" onclick="moveStreamTask('+s.id+','+t.id+',\''+nxt+'\')">→</button>':'')
              +(prv?'<button class="dep-btn" style="font-size:max(.48rem,var(--vi-fs-1));padding:2px 5px" onclick="moveStreamTask('+s.id+','+t.id+',\''+prv+'\')">←</button>':'')
              +'<button class="data-item-del" style="font-size:max(.48rem,var(--vi-fs-1));padding:2px 5px" onclick="deleteStreamTask('+s.id+','+t.id+')"><svg class="vi-ic g" role="img" aria-label="Close"><use href="#vi-close"/></svg></button>'
              +'</div>'
              +'</div>';
          }).join('')
          +'</div>';
      }).join('')
      +'</div></div>';
    var investHtml='<div style="margin-top:10px;padding-top:10px;border-top:1px solid rgb(var(--teal-rgb) / .08)">'
      +'<div class="g2">'
      +'<div><div style="font-size:max(.5rem,var(--vi-fs-1));color:var(--t3);margin-bottom:3px;text-transform:uppercase;letter-spacing:.1em">Cumulative Investment</div>'
      +'<div style="display:flex;align-items:center;gap:4px">'
      +'<span style="color:var(--t3);font-size:max(.7rem,var(--vi-fs-3))">\u00a3</span>'
      +'<input type="number" class="al-inp" style="max-width:100px;font-size:max(.62rem,var(--vi-fs-2))" value="'+(s.totalInvested||0)+'" onchange="updateStreamInvested('+s.id+',this.value)" placeholder="0">'
      +'</div></div>'
      +'<div><div style="font-size:max(.5rem,var(--vi-fs-1));color:var(--gr);margin-bottom:3px;text-transform:uppercase;letter-spacing:.1em">Log Actual This Month</div>'
      +'<div style="display:flex;align-items:center;gap:4px">'
      +'<span style="color:var(--t3);font-size:max(.7rem,var(--vi-fs-3))">\u00a3</span>'
      +'<input type="number" id="log-act-'+s.id+'" class="al-inp" style="max-width:100px;font-size:max(.62rem,var(--vi-fs-2))" placeholder="0">'
      +'<button class="dep-btn" onclick="logStreamIncome('+s.id+')" style="font-size:max(.52rem,var(--vi-fs-1));padding:3px 8px;color:var(--gr);border-color:var(--gr)">Log</button>'
      +'</div></div>'
      +'</div></div>';
    var chartHtml='<canvas id="sc-'+s.id+'" style="width:100%;height:120px;margin-top:8px;border-radius:6px;background:rgba(0,0,0,.25)" width="600" height="120"></canvas>';
    return '<div class="ov-chart-card" style="margin-bottom:10px;padding:14px 16px">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
      +'<div>'
      +'<span style="font-size:1.1rem;margin-right:6px">'+(s.icon||_autoStreamIcon(s.name))+'</span>'
      +'<span style="font-family:\'Syne\',sans-serif;font-weight:700;font-size:max(.72rem,var(--vi-fs-3));color:var(--t1)">'+s.name+'</span>'
      +'<span style="margin-left:8px;font-size:max(.5rem,var(--vi-fs-1));padding:2px 6px;border-radius:3px;background:rgb(var(--teal-rgb) / .15);color:var(--em);font-weight:700;letter-spacing:.08em">'+(_ISB_TYPES[s.type]||s.type).toUpperCase()+'</span>'
      +'</div>'
      +'<div style="display:flex;align-items:center;gap:10px">'
      +'<span style="font-size:max(.58rem,var(--vi-fs-2));color:'+statusColor+';font-weight:600">'+s.status.charAt(0).toUpperCase()+s.status.slice(1)+'</span>'
      +'<button class="btn-add-data" onclick="deleteIncomeStream('+s.id+')" style="font-size:max(.5rem,var(--vi-fs-1));padding:3px 8px;background:transparent;border-color:var(--t3);color:var(--t3)">Remove</button>'
      +'</div>'
      +'</div>'
      +(s.monthlyIncome?'<div style="font-size:max(.6rem,var(--vi-fs-2));color:var(--go);margin-bottom:8px;font-family:\'Share Tech Mono\',monospace">Target: '+gbpFmt(s.monthlyIncome)+'/mo</div>':'')
      +(s.steps.length?'<div style="margin-bottom:8px"><div style="height:3px;background:rgb(var(--ink-rgb) / .06);border-radius:2px;margin-bottom:6px"><div style="height:100%;width:'+pct+'%;background:var(--gr);border-radius:2px;transition:width .3s"></div></div></div>':'')
      +'<div id="steps-'+s.id+'" style="margin-bottom:10px">'+stepsHtml+'</div>'
      +'<button class="btn-add-data" onclick="generateStreamSteps('+s.id+')" style="font-size:max(.55rem,var(--vi-fs-1));padding:5px 10px">\u2728 Generate Plan</button>'
      +kanbanHtml
      +investHtml
      +chartHtml
      +'</div>';
  }).join('');
  setTimeout(function(){
    (bizState.incomeStreams||[]).forEach(function(s){drawStreamChart(s.id);});
  },50);
}

function toggleStreamStep(streamId,stepIdx,done){
  var s=(bizState.incomeStreams||[]).find(function(s){return s.id===streamId;});
  if(s&&s.steps[stepIdx])s.steps[stepIdx].done=done;
  saveBiz();renderIncomeStreams();
}

function deleteIncomeStream(id){if(viBlockEdit())return;
  bizState.incomeStreams=(bizState.incomeStreams||[]).filter(function(s){return s.id!==id;});
  saveBiz();renderIncomeStreams();
}

function updateStreamInvested(id,val){if(viBlockEdit())return;
  var s=(bizState.incomeStreams||[]).find(function(st){return st.id===id;});
  if(!s)return;
  var v=parseFloat(val)||0;
  s.totalInvested=v;
  if(!s.investmentHistory)s.investmentHistory=[];
  var now=new Date();
  var mo=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  var existing=s.investmentHistory.find(function(x){return x.month===mo;});
  if(existing)existing.total=v;
  else s.investmentHistory.push({month:mo,total:v});
  if(s.investmentHistory.length>24)s.investmentHistory=s.investmentHistory.slice(-24);
  saveBiz();
  // Update chart inline without full re-render
  setTimeout(function(){drawStreamChart(id);},20);
}

function logStreamIncome(id){if(viBlockEdit())return;
  var s=(bizState.incomeStreams||[]).find(function(st){return st.id===id;});
  if(!s)return;
  var inp=document.getElementById('log-act-'+id);
  var amt=inp?parseFloat(inp.value):NaN;
  if(isNaN(amt)||amt<0){showToast('Enter a valid amount');return;}
  if(!s.monthlyHistory)s.monthlyHistory=[];
  s.monthlyHistory.push(amt);
  if(s.monthlyHistory.length>24)s.monthlyHistory=s.monthlyHistory.slice(-24);
  if(inp)inp.value='';
  saveBiz();showToast(gbpFmt(amt)+' logged for '+s.name);
  setTimeout(function(){drawStreamChart(id);},30);
}

function addStreamTask(id){if(viBlockEdit())return;
  var s=(bizState.incomeStreams||[]).find(function(st){return st.id===id;});
  if(!s)return;
  var inp=document.getElementById('newtask-'+id);
  var text=inp?inp.value.trim():'';
  if(!text)return;
  if(!s.tasks)s.tasks=[];
  s.tasks.push({id:Date.now(),text:text,stage:'todo'});
  if(inp)inp.value='';
  saveBiz();renderIncomeStreams();
}

function moveStreamTask(streamId,taskId,newStage){
  var s=(bizState.incomeStreams||[]).find(function(st){return st.id===streamId;});
  if(!s||!s.tasks)return;
  var t=s.tasks.find(function(t){return t.id===taskId;});
  if(t)t.stage=newStage;
  saveBiz();renderIncomeStreams();
}

function deleteStreamTask(streamId,taskId){if(viBlockEdit())return;
  var s=(bizState.incomeStreams||[]).find(function(st){return st.id===streamId;});
  if(!s||!s.tasks)return;
  s.tasks=s.tasks.filter(function(t){return t.id!==taskId;});
  saveBiz();renderIncomeStreams();
}

function drawStreamChart(streamId){
  var s=(bizState.incomeStreams||[]).find(function(st){return st.id===streamId;});
  var c=document.getElementById('sc-'+streamId);
  if(!s||!c)return;
  var dpr=window.devicePixelRatio||1;
  var cssW=c.offsetWidth||600;
  var cssH=120;
  c.width=Math.round(cssW*dpr);
  c.height=Math.round(cssH*dpr);
  c.style.height=cssH+'px';
  var ctx=c.getContext('2d');
  ctx.scale(dpr,dpr);
  var W=cssW, H=cssH;
  var PAD={l:40,r:10,t:12,b:22};
  var cW=W-PAD.l-PAD.r, cH=H-PAD.t-PAD.b;

  ctx.clearRect(0,0,W,H);
  var hist=s.monthlyHistory||[];
  var invHist=(s.investmentHistory||[]).map(function(x){return x.total;});
  var target=s.monthlyIncome||0;
  var maxV=Math.max(target*1.2,hist.length?Math.max.apply(null,hist):0,invHist.length?Math.max.apply(null,invHist):0,100);
  var n=Math.max(hist.length,invHist.length,6); // at least 6 points for x axis

  function yOf(v){return PAD.t+cH-cH*Math.min(1,Math.max(0,v/maxV));}
  function xOf(i,total){return PAD.l+(total<=1?cW/2:i/(total-1)*cW);}

  // Grid lines
  ctx.save();
  ctx.strokeStyle='rgba(255,255,255,0.04)';ctx.lineWidth=1;
  for(var gi=1;gi<=4;gi++){
    var gy=PAD.t+cH*(gi/4);
    ctx.beginPath();ctx.moveTo(PAD.l,gy);ctx.lineTo(PAD.l+cW,gy);ctx.stroke();
    ctx.fillStyle='rgba(90,96,104,0.5)';ctx.font='7px Share Tech Mono';ctx.textAlign='right';
    ctx.fillText(gbpFmt(maxV*(1-gi/4)),PAD.l-3,gy+3);
  }
  ctx.restore();

  // Target dashed line
  if(target>0){
    var ty=yOf(target);
    ctx.save();ctx.strokeStyle='rgba(68,192,185,0.5)';ctx.lineWidth=1.3;ctx.setLineDash([4,3]);
    ctx.beginPath();ctx.moveTo(PAD.l,ty);ctx.lineTo(PAD.l+cW,ty);ctx.stroke();
    ctx.setLineDash([]);ctx.fillStyle='rgba(68,192,185,0.7)';ctx.font='7px Share Tech Mono';ctx.textAlign='right';
    ctx.fillText('Target '+gbpFmt(target),PAD.l+cW-2,ty-4);
    ctx.restore();
  }

  // Cumulative investment area+line (gold)
  if(invHist.length>=1){
    ctx.save();
    var grd=ctx.createLinearGradient(0,PAD.t,0,H);
    grd.addColorStop(0,'rgba(201,168,76,0.22)');grd.addColorStop(1,'rgba(201,168,76,0)');
    ctx.fillStyle=grd;
    ctx.beginPath();ctx.moveTo(xOf(0,invHist.length),yOf(invHist[0]));
    invHist.forEach(function(v,i){ctx.lineTo(xOf(i,invHist.length),yOf(v));});
    ctx.lineTo(xOf(invHist.length-1,invHist.length),H-PAD.b);ctx.lineTo(PAD.l,H-PAD.b);ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(201,168,76,0.8)';ctx.lineWidth=1.8;
    ctx.beginPath();invHist.forEach(function(v,i){i===0?ctx.moveTo(xOf(0,invHist.length),yOf(v)):ctx.lineTo(xOf(i,invHist.length),yOf(v));});
    ctx.stroke();
    ctx.fillStyle='rgba(201,168,76,0.9)';ctx.beginPath();ctx.arc(xOf(invHist.length-1,invHist.length),yOf(invHist[invHist.length-1]),3.5,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }

  // Actual monthly income bars
  if(hist.length>=1){
    var bW=Math.max(3,Math.min(18,cW/hist.length-3));
    hist.forEach(function(v,i){
      var bx=xOf(i,hist.length)-bW/2;
      var bH=cH*Math.min(1,v/maxV);
      var by=PAD.t+cH-bH;
      ctx.fillStyle=v>=target?'rgba(62,207,142,0.65)':'rgba(62,207,142,0.42)';
      ctx.beginPath();ctx.roundRect?ctx.roundRect(bx,by,bW,bH,2):ctx.fillRect(bx,by,bW,bH);ctx.fill();
    });
    // Line over bars
    ctx.save();ctx.strokeStyle='rgba(62,207,142,0.9)';ctx.lineWidth=2;
    ctx.beginPath();hist.forEach(function(v,i){i===0?ctx.moveTo(xOf(0,hist.length),yOf(v)):ctx.lineTo(xOf(i,hist.length),yOf(v));});
    ctx.stroke();
    ctx.fillStyle='rgba(62,207,142,1)';ctx.beginPath();ctx.arc(xOf(hist.length-1,hist.length),yOf(hist[hist.length-1]),4,0,Math.PI*2);ctx.fill();
    ctx.restore();
    // Legend
    ctx.save();ctx.font='bold 7.5px Share Tech Mono';ctx.textAlign='left';
    ctx.fillStyle='rgba(62,207,142,0.8)';ctx.fillText('● Actual',PAD.l+2,H-6);
    if(invHist.length){ctx.fillStyle='rgba(201,168,76,0.8)';ctx.fillText('● Invested',PAD.l+56,H-6);}
    ctx.restore();
  } else {
    ctx.fillStyle='rgba(90,96,104,0.4)';ctx.font='9px Share Tech Mono';ctx.textAlign='center';
    ctx.fillText('Log monthly income to see chart',W/2,H/2+3);
  }
}

async function generateStreamSteps(streamId){
  var key=localStorage.getItem('claude_api_key')||'';
  if(!key){showToast('AI plan steps are not switched on for this account yet');return;}
  var stream=(bizState.incomeStreams||[]).find(function(s){return s.id===streamId;});
  if(!stream)return;
  var stepsEl=document.getElementById('steps-'+streamId);
  if(stepsEl)stepsEl.innerHTML='<div style="font-size:max(.58rem,var(--vi-fs-2));color:var(--em);padding:8px 0">Generating plan with Claude AI...</div>';
  try{
    var res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{
        'x-api-key':key,
        'anthropic-version':'2023-06-01',
        'content-type':'application/json',
        'anthropic-dangerous-direct-browser-access':'true'
      },
      body:JSON.stringify({
        model:'claude-haiku-4-5-20251001',
        max_tokens:600,
        messages:[{role:'user',content:'Create a practical 6-step execution plan for this income stream: "'+stream.name+'" (Type: '+stream.type+', Target: £'+stream.monthlyIncome+'/month). Return ONLY a JSON array with exactly 6 objects, each with a "text" field containing one actionable step (max 12 words each). Example format: [{"text":"Step description here"},...]'}]
      })
    });
    var data=await res.json();
    var text=data.content&&data.content[0]&&data.content[0].text||'';
    // Robust JSON array extraction — finds outermost matching [ ... ]
    function extractJsonArray(t){
      var start=t.indexOf('[');
      if(start===-1)return null;
      var depth=0;
      for(var i=start;i<t.length;i++){
        if(t[i]==='[')depth++;
        else if(t[i]===']'){depth--;if(depth===0)return t.slice(start,i+1);}
      }
      return null;
    }
    var extracted=extractJsonArray(text);
    var parsed=null;
    if(extracted){
      try{parsed=JSON.parse(extracted);}catch(pe){parsed=null;}
    }
    // Fallback: split on numbered lines if JSON fails
    if(!parsed||!parsed.length){
      var lines=text.split('\n').filter(function(l){return l.match(/^\d[\.\)]/);}).slice(0,6);
      if(lines.length>=3){
        parsed=lines.map(function(l){return{text:l.replace(/^\d[\.\)]\s*/,'').trim()};});
      }
    }
    if(parsed&&parsed.length){
      stream.steps=parsed.map(function(st){return{text:st.text||st.step||st.action||String(st),done:false};});
      saveBiz();renderIncomeStreams();
      showToast('Plan generated!');
    }else{
      showToast('Could not parse AI response \u2014 try again');
      if(stepsEl)stepsEl.innerHTML='<div style="font-size:max(.58rem,var(--vi-fs-2));color:var(--re);padding:6px 0">Could not parse AI response. Ensure your Claude API key is valid and try again.</div>';
    }
  }catch(e){
    showToast('Claude API error: '+e.message);
    if(stepsEl)stepsEl.innerHTML='<div style="font-size:max(.58rem,var(--vi-fs-2));color:var(--re)">Error: '+e.message+'</div>';
  }
}

