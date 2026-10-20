(function(){'use strict';
const $=id=>document.getElementById(id),storeKey='billiards-local-player',inviteKey='billiards-local-invite';
let token=sessionStorage.getItem(storeKey),invite=new URLSearchParams(location.hash.slice(1)).get('invite')||sessionStorage.getItem(inviteKey),current=null,revealed=false,enabled=false,lastAlert=null,busy=false,pendingAction=false;
if(invite){sessionStorage.setItem(inviteKey,invite);history.replaceState(null,'',location.pathname);}
function node(tag,value,cls){const e=document.createElement(tag);e.textContent=value;if(cls)e.className=cls;return e;}
function clearPrivate(){revealed=false;$('private').hidden=true;$('private').replaceChildren();$('reveal').textContent='Show my private view';}
async function api(route,data){const r=await fetch('/api/'+route,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:data?JSON.stringify(data):undefined,cache:'no-store'});const v=await r.json();if(!r.ok)throw Object.assign(Error(v.error||'Connection failed'),{status:r.status});return v;}
$('join').onsubmit=async e=>{e.preventDefault();$('error').textContent='';try{const r=await api('join',{name:$('name').value,invite});token=r.token;sessionStorage.setItem(storeKey,token);await poll();}catch(err){$('error').textContent=err.message;}};
let announcement=null,alertSerial=0,serverOffset=0;
const timer=document.createElement('p');timer.setAttribute('role','timer');$('game').append(timer);setInterval(()=>{const c=current?.view?.clock;timer.hidden=!c;if(c){const left=c.deadline===null?c.remaining:Math.max(0,c.deadline-(Date.now()+serverOffset));timer.textContent='Shot clock · '+Math.ceil(left/1000)+'s'+(c.deadline===null?' · paused':'');}},200);
function stopAnnouncement(){
 const a=announcement;if(!a)return;announcement=null;clearTimeout(a.timer);window.BilliardsAudio?.cancel();
 api('audio',{id:a.id,done:true}).catch(()=>{});
}
function speak(message){
 stopAnnouncement();if(window.BilliardsNarration?.speaking())return;if(!enabled||document.hidden||!current?.approved||!window.BilliardsAudio?.available())return;
 const a={id:Date.now()+'-'+(++alertSerial),revision:current.revision,timer:null};announcement=a;
 async function attempt(){
  if(announcement!==a)return;
  if(!enabled||document.hidden||!current.hostOnline||current.view?.paused||current.revision!==a.revision){stopAnnouncement();return;}
  const sent=performance.now();
  try{
   const slot=await api('audio',{id:a.id,revision:a.revision,duration:window.BilliardsAudio.duration(message)});
   if(announcement!==a){api('audio',{id:a.id,done:true}).catch(()=>{});return;}
   if(!slot.granted){a.timer=setTimeout(attempt,250);return;}
   // Subtract the entire round trip so a delayed response cannot extend a lease.
   const budget=slot.remaining-(performance.now()-sent);
   if(budget<1000){stopAnnouncement();return;}
   a.timer=setTimeout(()=>{if(announcement===a)stopAnnouncement();},budget);
   window.BilliardsAudio.speak(message,()=>{if(announcement===a)stopAnnouncement();});if($('vibrate').checked)navigator.vibrate?.([150,80,150]);
  }catch{if(announcement===a)stopAnnouncement();}
 }
 attempt();
}
$('enableAlerts').onclick=()=>{
 enabled=!enabled;$('enableAlerts').textContent=enabled?'Turn alerts on · Tap to mute':'Enable turn alerts';
 if(enabled){
  // Unlock speech in the tap handler on mobile; the audible confirmation queues.
  window.BilliardsAudio.unlock().catch(()=>{});
  speak(['alerts-on']);
 }else stopAnnouncement();
};
if(!navigator.vibrate){$('vibrate').checked=false;$('vibrate').disabled=true;}
function action(type,index){if(pendingAction)return;pendingAction=true;drawPrivate();api('action',{type,index,revision:current.revision}).then(()=>{$('error').textContent='Choice sent. Waiting for the host.';}).catch(err=>{pendingAction=false;$('error').textContent=err.message;drawPrivate();});}
function actionButton(label,type,index){const b=node('button',label);b.type='button';b.disabled=pendingAction;b.onclick=()=>action(type,index);return b;}
function cards(values){const box=node('div','','cards');for(const value of values)box.append(node('div',value,'card'+(/[♥♦]/.test(value)?' red':'')));return box;}
function drawPrivate(){const s=current?.view;if(!s||!revealed)return;const p=s.private,box=$('private');box.replaceChildren(node('h3','Only your view'));if(p.hand)box.append(cards(p.hand));if(p.total!==undefined)box.append(node('p','Your total: '+p.total));if(p.target!==undefined)box.append(node('p','Your secret ball: '+p.target));if(p.role)box.append(node('p','Your role: '+p.role));if(p.fleet)box.append(node('p','Your ship cells: '+p.fleet.map(i=>String.fromCharCode(65+Math.floor(i/3))+(i%3+1)).join(', ')));if(p.attacks?.length)box.append(node('p','Your attacks: '+p.attacks.map(a=>String.fromCharCode(65+Math.floor(a.cell/3))+(a.cell%3+1)+(a.hit?' HIT':' miss')).join(', ')));
 if(p.choices){box.append(node('p','Choose the card to keep:'));p.choices.forEach((label,i)=>box.append(actionButton(label,'choose',i)));}
 if(s.actions.includes('stand'))box.append(actionButton('Stand','stand'));
 if(s.actions.includes('fleet-shuffle'))box.append(actionButton('Shuffle my fleet','fleet-shuffle'),actionButton('Lock my fleet','fleet-lock'));
 if(s.actions.includes('vote')){box.append(node('p','Choose your suspect privately:'));s.players.forEach((player,i)=>box.append(actionButton(player.name,'vote',i)));box.append(actionButton('Abstain','vote',-1));}
 if(!Object.keys(p).length)box.append(node('p','This game has no secret information for your seat.'));
}
$('reveal').onclick=()=>{if(revealed)clearPrivate();else{revealed=true;$('private').hidden=false;$('reveal').textContent='Hide my private view';drawPrivate();}};
function render(data){const old=current;current=data;if(old?.revision!==data.revision){stopAnnouncement();pendingAction=false;$('error').textContent='';}
 $('join').hidden=true;$('waiting').hidden=data.approved&&!!data.view;$('game').hidden=!data.approved||!data.view;$('connection').textContent=data.hostOnline?'Connected to your local table':'Host screen disconnected · waiting to reconnect';
 if(!data.hostOnline||data.view?.paused)stopAnnouncement();
 if(!data.approved||!data.view){stopAnnouncement();clearPrivate();$('waitingName').textContent=data.name+', your request is with the host.';lastAlert=null;return;}
 const s=data.view;$('gameName').textContent=s.name;$('rules').textContent=s.rules;if(old?.view?.game!==s.game){const rulesBox=$('rules').parentElement;rulesBox.querySelectorAll('[data-play-narration]').forEach(b=>b.remove());window.BilliardsNarration?.attach(rulesBox,['rules-'+s.game,'house-rules']);}$('round').textContent='Round '+s.round+' · '+s.shots+' strokes recorded';$('notice').textContent=s.result?.text||s.last;
 const me=s.players[s.you],who=s.players[s.active];$('turn').textContent=s.paused?'Paused by your host':s.phase==='result'?'Game complete':s.active===s.you?me.name+', you’re at the table':who.name+' is at the table';$('turn').classList.toggle('mine',s.active===s.you&&s.phase!=='result'&&!s.paused);
 $('scores').replaceChildren(...s.players.map(p=>{const e=node('div','','score'+(p.id===s.active?' active':''));e.append(node('strong',p.name+(p.id===s.you?' · You':'')),node('span',p.stat));return e;}));
 const key=[data.match,s.round,s.shots,s.active,s.phase,s.paused].join(':');if(lastAlert!==null&&lastAlert!==key&&data.hostOnline&&!s.paused){const changed=old?.view?.active!==s.active,phaseChanged=old?.view?.phase!==s.phase;if(s.phase==='result'&&phaseChanged)speak(window.BilliardsAnnouncements.guest(s,'result'));else if(s.active===s.you&&(changed||phaseChanged))speak(window.BilliardsAnnouncements.guest(s,'turn'));else if(s.next===s.you&&changed)speak(window.BilliardsAnnouncements.guest(s,'next'));}lastAlert=key;
 if(old?.match!==data.match||old?.view?.you!==s.you)clearPrivate();drawPrivate();
}
async function poll(){if(busy||document.hidden)return;if(!token){$('join').hidden=false;$('connection').textContent=invite?'Enter your name to join this table.':'Scan your host’s QR code to join.';$('join').querySelector('button').disabled=!invite;return;}busy=true;try{const sent=Date.now(),data=await api('player');serverOffset=data.serverTime-(sent+Date.now())/2;render(data);}catch(err){stopAnnouncement();clearPrivate();$('connection').textContent='Disconnected · retrying';if(err.status===401){token=null;sessionStorage.removeItem(storeKey);$('game').hidden=true;$('waiting').hidden=true;$('join').hidden=false;$('error').textContent=err.message;}}finally{busy=false;}}
document.addEventListener('billiards-audio-error',e=>{$('error').textContent=e.detail;});
window.addEventListener('pagehide',stopAnnouncement);window.addEventListener('blur',clearPrivate);document.addEventListener('visibilitychange',()=>{if(document.hidden){clearPrivate();stopAnnouncement();}else{lastAlert=null;poll();}});poll();setInterval(poll,1000);
})();
