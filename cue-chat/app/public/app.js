'use strict';
const $ = id => document.getElementById(id);
const S = {profile:null, rooms:[], room:null, members:[], companion:null, lessons:[], messages:[], seq:0, pending:null, reply:null, sending:false, polling:false, epoch:0, objects:new Map(), trainer:null, clientId:crypto.randomUUID()};
const profilesKey = 'cuechat-local-profiles-v1';
const selectedProfileKey = 'cuechat-selected-profile';
const wantsChaseThread = new URLSearchParams(location.search).get('chat') === 'chase';
const sample = {format:'billiards-trainer',version:1,kind:'layout',name:'Find your next position',savedAt:new Date().toISOString(),layout:{name:'Find your next position',tableL:2.54,tableW:1.27,ballR:.028575,setupMode:'custom',freeAim:{x:1.242,y:.566},balls:[{id:0,n:'CB',x:.62,y:.74,active:true},{id:1,n:'1',x:1.30,y:.55,active:true},{id:8,n:'8',x:1.92,y:.82,active:true},{id:1000,n:'MARKER',marker:true,markerType:'white',markerShape:'circle',markerDiameterIn:6,markerWidthIn:6,markerHeightIn:6,markerLocked:false,x:1.82,y:.36,active:true}]}};
function node(tag, props={}, ...children){const n=document.createElement(tag);for(const[k,v]of Object.entries(props)){if(k==='class')n.className=v;else if(k==='text')n.textContent=v;else if(k.startsWith('on'))n.addEventListener(k.slice(2),v);else n.setAttribute(k,v);}for(const c of children.flat())if(c!=null)n.append(c.nodeType?c:document.createTextNode(String(c)));return n;}
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('show'),4500);}
function initials(name){return name.split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();}
function knownProfiles(){try{return JSON.parse(localStorage.getItem(profilesKey)||'[]')}catch{return[]}}
function remember(p){const all=knownProfiles().filter(x=>x.id!==p.id);all.push(p);localStorage.setItem(profilesKey,JSON.stringify(all));sessionStorage.setItem('cuechat-active-profile',p.id);localStorage.setItem(selectedProfileKey,p.id);S.profile=p;}
async function api(path, data, binary=false, profile=S.profile){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);try{const r=await fetch(path,{method:data?'POST':'GET',headers:{...(profile?{Authorization:'Bearer '+profile.token}:{}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined,signal:controller.signal,cache:'no-store'});if(!r.ok){let v;try{v=await r.json()}catch{}throw Object.assign(Error(v?.error||'Cue Chat could not complete that request.'),{status:r.status});}return binary?await r.blob():await r.json();}catch(e){if(e.name==='AbortError'||e instanceof TypeError)throw Error('The test host is not responding. Keep it open and try again.');throw e;}finally{clearTimeout(timer);}}
let tableSerial=0;
function tableSvg(file){const prefix='cue-table-'+(++tableSerial);const L=file.layout;const W=500,H=250,pad=28,scaleX=W/L.tableL,scaleY=H/L.tableW;const colors=['#fcfcf6','#edc449','#2c66a6','#cd4f3e','#75558d','#ed923d','#3b8a64','#91443c','#242b29','#edc449','#2c66a6','#cd4f3e','#75558d','#ed923d','#3b8a64','#91443c'];let out=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 556 306" role="img" aria-label="Shared billiards table"><defs><linearGradient id="${prefix}-rail" x2="0" y2="1"><stop stop-color="#254f6c"/><stop offset="1" stop-color="#102e49"/></linearGradient><radialGradient id="${prefix}-felt"><stop stop-color="#4096bd"/><stop offset="1" stop-color="#22678d"/></radialGradient></defs><rect x="4" y="4" width="548" height="298" rx="20" fill="#c7ad7e"/><rect x="10" y="10" width="536" height="286" rx="16" fill="url(#${prefix}-rail)"/><rect x="28" y="28" width="500" height="250" rx="8" fill="url(#${prefix}-felt)"/>`;
 for(let i=1;i<8;i++)out+=`<circle cx="${pad+i*W/8}" cy="18" r="1.7" fill="#d7d7bb"/><circle cx="${pad+i*W/8}" cy="288" r="1.7" fill="#d7d7bb"/>`;
 for(const[x,y]of[[28,28],[278,28],[528,28],[28,278],[278,278],[528,278]])out+=`<circle cx="${x}" cy="${y}" r="11" fill="#152a23"/>`;
 for(const b of L.balls){if(b.active===false)continue;const x=pad+Number(b.x)*scaleX,y=pad+Number(b.y)*scaleY;if(b.marker){out+=`<circle cx="${x}" cy="${y}" r="15" fill="#efc97020" stroke="#edca78" stroke-dasharray="3 4"/>`;continue;}const c=colors[b.id]||'#fff';out+=`<circle cx="${x+1}" cy="${y+2}" r="7" fill="#12352866"/><circle cx="${x}" cy="${y}" r="6.6" fill="${c}"/>`;if(b.id>8)out+=`<path d="M${x-6} ${y-3.2}h12v6.4h-12z" fill="#fffcf2"/>`;if(b.id)out+=`<circle cx="${x}" cy="${y}" r="3.8" fill="#fffdf2"/><text x="${x}" y="${y+2.5}" text-anchor="middle" font-family="Arial" font-weight="700" font-size="6.7" fill="#24392d">${b.id}</text>`;out+=`<circle cx="${x-2}" cy="${y-2.5}" r="1.3" fill="#ffffff90"/>`;}
 return out+'</svg>';}
function tableNode(file, cls='table-preview'){const n=node('div',{class:cls});n.innerHTML=tableSvg(file);return n;}
function dialog(...content){$('dialog-content').replaceChildren(...content);if(!$('info-dialog').open)$('info-dialog').showModal();}
function closeDialog(){$('info-dialog').close();}
const nativeHost = window.CueChatHost;
if (nativeHost) {
 document.body.dataset.cueEmbedded = '';
 for (const button of document.querySelectorAll('[data-cuechat-return]')) {
  button.hidden = false;
  button.onclick = () => nativeHost.postMessage('return');
 }
}
let profileLoading=false;
function showEmptyInbox(){
 $('room-thread').setAttribute('data-no-room','');
 $('room-thread').hidden=false;
 $('room-title').textContent='Cue Chat';
 $('member-button').textContent='';
 $('profile-name').textContent=S.profile?.name||'Player profile';
 $('profile-avatar').textContent=S.profile?initials(S.profile.name):'○';
 $('connection-error').hidden=true;
 renderMessages(true);
 renderRooms();
}
async function activateProfile(p, chase=false){
 if(profileLoading)return false;
 if(S.sending)throw Error('Wait for your message to finish sending before switching profiles.');
 profileLoading=true;
 try{
  const me=await api('/api/me',null,false,p);
  saveDraft();
  window.CueChatPrivate?.closeThread();
  S.epoch++;
  S.room=null;
  S.messages=[];
  S.members=[];
  S.companion=null;
  S.lessons=[];
  S.rooms=me.rooms;
  for(const url of S.objects.values())if(typeof url==='string')URL.revokeObjectURL(url);
  S.objects.clear();
  remember(p);
  showEmptyInbox();
  if(chase&&window.CueChatPrivate){await window.CueChatPrivate.open(false);return true;}
  const preferred=localStorage.getItem('cuechat-room:'+p.id);
  const room=S.rooms.find(r=>r.id===preferred)||S.rooms[0];
  if(room)await openRoom(room.id);
  return true;
 }finally{profileLoading=false;}
}
function ensurePlayer(title, next){
 if(profileLoading){toast('Opening your conversations…');return;}
 if(S.profile){void next();return;}
 openPlayerDialog(title,next);
}
function openPlayerDialog(title='Player profile',next=null){
 const input=node('input',{id:'player-name',placeholder:'Your name',maxlength:'40',autocomplete:'nickname',required:''});
 const submit=node('button',{class:'primary',type:'submit',text:'Continue'});
 const error=node('p',{class:'form-error',role:'alert'});
 const choices=node('div',{class:'cue-profile-choices'});
 let busy=false;
 async function use(load){
  if(busy||profileLoading)return;
  busy=true;
  error.textContent='';
  submit.disabled=true;
  try{
   const p=await load();
   if(!await activateProfile(p))return;
   if(!$('info-dialog').open||!$('dialog-content').contains(form))return;
   closeDialog();
   if(next)await next();
  }catch(e){error.textContent=e.message;}
  finally{busy=false;submit.disabled=false;}
 }
 for(const p of knownProfiles()) choices.append(node('button',{type:'button',class:'secondary',text:'Continue as '+p.name,onclick:()=>use(()=>p)}));
 const form=node('form',{class:'cue-profile-form'},node('label',{},'Your name',input),submit,error);
 form.onsubmit=e=>{e.preventDefault();const name=input.value.trim();if(name)return use(()=>api('/api/profiles',{name}));};
 dialog(node('h2',{text:title}),choices,form);
 input.focus();
}
function openJoinDialog(code=''){
 ensurePlayer('Choose your profile to join',()=>{
  const field=node('input',{placeholder:'Invitation code or link',maxlength:'200',required:''});
  field.value=code;
  const submit=node('button',{class:'primary',type:'submit',text:'Join'});
  const error=node('p',{class:'form-error',role:'alert'});
  const form=node('form',{class:'cue-profile-form'},node('label',{},'Invitation code or link',field),submit,error);
  form.onsubmit=async e=>{
   e.preventDefault();
   const invite=field.value.trim();
   if(!invite||submit.disabled)return;
   submit.disabled=true;
   error.textContent='';
   try{
    const room=await api('/api/join',{invite});
    await refreshRooms();
    if($('info-dialog').open&&$('dialog-content').contains(form))closeDialog();
    if(new URLSearchParams(location.search).has('join'))history.replaceState(null,'',location.pathname);
    await openRoom(room.id);
   }catch(e){error.textContent=e.message;}
   finally{submit.disabled=false;}
  };
  dialog(node('h2',{text:'Join a conversation'}),form);
  field.focus();
 });
}
function renderRooms(){
 const chaseOpen=Boolean(window.CueChatPrivate?.isOpen());
 const chase=node('button',{class:'room-button'+(chaseOpen?' active':''),type:'button',onclick:()=>ensurePlayer('Choose your profile to talk to Chase',()=>window.CueChatPrivate?.open(false))},
   node('span',{class:'room-icon',text:'✦','aria-hidden':'true'}),node('strong',{text:'Talk to Chase'}));
 if(chaseOpen)chase.setAttribute('aria-current','true');
 const rooms=S.rooms.map(r=>{
  const selected=!chaseOpen&&r.id===S.room?.id;
  const item=node('button',{class:'room-button'+(selected?' active':''),type:'button',onclick:()=>openRoom(r.id)},
      node('span',{class:'room-icon',text:'◉','aria-hidden':'true'}),
      node('span',{},node('strong',{text:r.name}),r.last_body?node('small',{text:r.last_body}):null));
  if(selected)item.setAttribute('aria-current','true');
  return item;
 });
 $('rooms').replaceChildren(chase,...rooms);
}
async function refreshRooms(){const me=await api('/api/me');S.rooms=me.rooms;renderRooms();}
function draftKey(){return 'cuechat-draft:'+S.profile?.id+':'+S.room?.id;}
function saveDraft(){if(!S.room)return;try{sessionStorage.setItem(draftKey(),JSON.stringify({body:$('message-input').value,reply:S.reply,pending:S.pending?.base64?.length<1000000?S.pending:null,fileName:S.pending?.name||'',clientId:S.clientId}));}catch{toast('Your draft is kept while this tab is open. Send it before closing the tab.');}}
function restoreDraft(){let d={};try{d=JSON.parse(sessionStorage.getItem(draftKey())||'{}')}catch{}$('message-input').value=d.body||'';S.pending=d.pending||null;S.reply=d.reply||null;S.clientId=d.clientId||crypto.randomUUID();if(d.fileName&&!d.pending)toast('Text draft restored. Reattach '+d.fileName+' before sending.');renderDraft();}
async function openRoom(id){window.CueChatPrivate?.closeThread();if(S.room)saveDraft();S.epoch++;S.room=S.rooms.find(r=>r.id===id);if(!S.room)return;S.messages=[];S.seq=0;S.pending=null;S.reply=null;for(const u of S.objects.values())if(typeof u==='string')URL.revokeObjectURL(u);S.objects.clear();localStorage.setItem('cuechat-room:'+S.profile.id,id);$('room-thread').removeAttribute('data-no-room');$('room-title').textContent=S.room.name;$('message-list').replaceChildren();$('message-list').dataset.seq='';$('sidebar').classList.remove('open');$('room-thread').hidden=false;renderRooms();restoreDraft();await poll(true);}
async function poll(force=false){if(!S.room||S.polling)return;S.polling=true;const room=S.room.id,epoch=S.epoch;try{let batch;do{batch=await api('/api/rooms/'+room+'?after='+S.seq);if(epoch!==S.epoch)return;S.room=batch.room;S.members=batch.members;S.companion=batch.companion;S.lessons=batch.shared_lessons||[];if(batch.messages.length){S.messages.push(...batch.messages);S.seq=batch.messages.at(-1).seq;}}while(batch.messages.length===100);$('member-button').textContent=S.members.map(p=>p.name).concat(S.companion?.connection==='configured'?['Chase']:[]).join(' · ');if(!S.sending)$('save-status').textContent=companionStatus();$('connection').classList.remove('off');$('connection').lastChild.textContent='Connected';$('connection-error').hidden=true;renderMessages(force);renderRooms();}catch(e){if(epoch!==S.epoch)return;$('connection').classList.add('off');$('connection').lastChild.textContent='Reconnecting';$('connection-error').hidden=false;$('connection-error').textContent=e.message+' Your text draft is kept.';}finally{S.polling=false;}}
function textBody(value){const n=node('div',{class:'body-text'});const pieces=value.split(/(https?:\/\/[^\s]+)/g);for(const p of pieces){if(/^https?:\/\//.test(p))n.append(node('a',{href:p,target:'_blank',rel:'noopener noreferrer',text:p}));else n.append(document.createTextNode(p));}return n;}
async function objectUrl(id){if(S.objects.has(id))return await S.objects.get(id);const pending=api('/api/files/'+id,null,true).then(blob=>{const u=URL.createObjectURL(blob);S.objects.set(id,u);return u;});S.objects.set(id,pending);try{return await pending;}catch(e){S.objects.delete(id);throw e;}}
async function downloadAttachment(m){try{const u=await objectUrl(m.attachment);download(u,m.file_name);}catch(e){toast(e.message)}}
function download(url,name){const a=node('a',{href:url,download:name});document.body.append(a);a.click();a.remove();}
function layoutCard(m){const card=node('div',{class:'layout-card'}),picture=tableNode(m.layout);picture.addEventListener('click',()=>openTrainer(m));const info=node('div',{class:'layout-info'},node('small',{text:'SHARED TABLE'}),node('strong',{text:m.layout.name||m.file_name}),node('p',{text:m.layout.layout.balls.filter(b=>!b.marker).length+' balls · editable in Trainer'}),node('div',{class:'layout-actions'},node('button',{class:'primary',text:'Open in Trainer',onclick:()=>openTrainer(m)}),node('button',{class:'secondary',text:'Save file',onclick:()=>downloadAttachment(m)})));card.append(picture,info);return card;}
function mediaCard(m){const wrap=node('div');let media;if(m.mime.startsWith('image/'))media=node('img',{class:'attachment-media',alt:m.file_name});else media=node(m.mime.startsWith('video/')?'video':'audio',{class:'attachment-media',controls:'',preload:'metadata'});objectUrl(m.attachment).then(u=>media.src=u).catch(e=>{wrap.replaceChildren(node('p',{class:'media-caption',text:e.message}),node('button',{class:'download-file',text:'Try download again',onclick:()=>downloadAttachment(m)}));});wrap.append(media,node('div',{class:'media-caption'},m.file_name,' · ',node('button',{class:'download-file',text:'Save',onclick:()=>downloadAttachment(m)})));return wrap;}
function renderMessages(force=false){if($('message-list').dataset.seq===String(S.seq)&&!force)return;const sc=$('messages'),nearBottom=sc.scrollHeight-sc.scrollTop-sc.clientHeight<150;$('message-list').dataset.seq=S.seq;const list=$('message-list');list.replaceChildren();if(!S.messages.length){const empty=node('div',{class:'empty-state'},node('p',{text:'Talk about a game, ask a pool question'}),tableNode(sample,'empty-table'));list.append(empty);return;}
 let day='';for(const m of S.messages){const d=new Date(m.created*1000),dayText=d.toLocaleDateString(undefined,{month:'long',day:'numeric'});if(day!==dayText){list.append(node('div',{class:'date-label',text:dayText}));day=dayText;}const mine=m.profile===S.profile.id,bubble=node('div',{class:'bubble'});if(m.reply_to){const orig=S.messages.find(x=>x.id===m.reply_to);bubble.append(node('div',{class:'reply-context',text:'Reply to '+(orig?.author||'an earlier message')+(orig?.layout?' · '+orig.layout.name:'' )}));}if(m.body)bubble.append(textBody(m.body));if(m.attachment)bubble.append(m.layout?layoutCard(m):mediaCard(m));const content=node('div',{class:'message-content'},node('div',{class:'message-author',text:mine?'You':m.author+(m.is_companion?' · AI companion':'')}),bubble,node('div',{class:'message-meta'},node('span',{text:d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})+(mine?' · saved':'')}),node('button',{class:'reply-action',text:'Reply',onclick:()=>{S.reply={id:m.id,author:m.author,label:m.layout?.name||m.body.slice(0,80)||m.file_name};renderDraft();saveDraft();$('message-input').focus();}})));list.append(node('article',{class:'message-row'+(mine?' mine':''),'data-message-id':m.id},node('span',{class:'avatar',text:initials(m.author)}),content));}if(force||nearBottom)requestAnimationFrame(()=>sc.scrollTop=sc.scrollHeight);}
function renderDraft(){const rp=$('reply-preview'),ap=$('attachment-preview');rp.hidden=!S.reply;ap.hidden=!S.pending;if(S.reply)rp.replaceChildren(node('span',{text:'Reply to '+S.reply.author+' · '+S.reply.label}),node('button',{class:'icon-button',type:'button',text:'×','aria-label':'Cancel reply',onclick:()=>{S.reply=null;renderDraft();saveDraft();}}));if(S.pending){let preview=S.pending.layout?tableNode(S.pending.layout):node('span',{text:S.pending.mime.startsWith('image/')?'▧':'▤'});ap.replaceChildren(preview,node('div',{},node('strong',{text:S.pending.name}),node('small',{text:S.pending.layout?'Editable table · ready to share':'Ready to share'})),node('button',{class:'icon-button',type:'button',text:'×','aria-label':'Remove attachment',onclick:()=>{S.pending=null;renderDraft();saveDraft();}}));}}
function base64File(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onerror=()=>reject(Error('This file could not be opened.'));r.onload=()=>resolve(String(r.result).split(',')[1]);r.readAsDataURL(file);});}
function attachLayout(file,name){const parsed=BilliardsLayoutFiles.parse(JSON.stringify(file));const clean=BilliardsLayoutFiles.create(parsed.layout,parsed.state,parsed.history);S.pending={name:name||clean.name+'.billiards.json',mime:'application/json',base64:btoa(unescape(encodeURIComponent(JSON.stringify(clean)))),layout:clean};renderDraft();saveDraft();}
function chooseSample(){if(!S.room)return;attachLayout(structuredClone(sample));if(!$('message-input').value)$('message-input').value='Where would you send the cue ball from here?';saveDraft();$('message-input').focus();}
function setSendBusy(busy){$('send-button').disabled=busy;$('compose-form').setAttribute('aria-busy',String(busy));const status=$('save-status').parentElement;status.classList.toggle('is-busy',busy);if(busy) status.classList.remove('has-error');}
function setTrainerBusy(busy){$('trainer-overlay').classList.toggle('is-busy',busy);}
async function sendMessage(){if(S.sending||!S.room)return;if(!$('message-input').value.trim()&&!S.pending)return;S.sending=true;setSendBusy(true);$('save-status').textContent='Sending…';try{await api('/api/rooms/'+S.room.id+'/messages',{body:$('message-input').value,attachment:S.pending?{name:S.pending.name,mime:S.pending.mime,base64:S.pending.base64}:null,reply_to:S.reply?.id||null,client_id:S.clientId});$('message-input').value='';$('message-input').style.height='';S.pending=null;S.reply=null;S.clientId=crypto.randomUUID();sessionStorage.removeItem(draftKey());renderDraft();$('save-status').textContent='Saved on this host.';await poll(true);await refreshRooms();}catch(e){toast(e.message);$('save-status').textContent='Not sent · your draft is kept';saveDraft();}finally{S.sending=false;setSendBusy(false);}}
function showInvite(){const code=S.room.invite;dialog(node('span',{class:'eyebrow',text:'BRING YOUR PEOPLE'}),node('h2',{text:'A different perspective.'}),node('p',{text:'Open Cue Chat on this test host, then use this code to join '+S.room.name+'.'}),node('div',{class:'invite-code',text:code}),node('button',{class:'primary',text:'Copy invitation link',onclick:async()=>{const link=new URL(location.origin+'/?join='+encodeURIComponent(code));try{await navigator.clipboard.writeText(link.href);toast('Invitation link copied.');}catch{dialog(node('h2',{text:'Copy your invitation'}),node('input',{value:link.href,readonly:''}));}}}),node('p',{text:location.hostname==='localhost'||location.hostname==='127.0.0.1'?'For a phone on the same Wi-Fi, open this computer’s Wi-Fi address on port '+(location.port||'3000')+' and use the invitation code.':'Both devices need access to this test host. Email delivery is not connected.'}));}
function previewSending(){const demo=node('div',{class:'animation-demo'});demo.innerHTML='<span class="cue-activity " aria-hidden="true"><i class="waiting-cue"></i><i class="waiting-ball ball-one"></i><i class="waiting-ball ball-two"></i><i class="waiting-ball ball-three"></i></span>';const toggle=node('button',{text:'Play animation',onclick:()=>{const playing=demo.classList.toggle('is-busy');toggle.textContent=playing?'Pause animation':'Play animation';}});demo.append(toggle);dialog(node('h2',{text:'A little cue in the conversation.'}),node('p',{text:'Preview the cue striking three balls. During sending or table loading, it follows the actual operation. Fast messages finish immediately.'}),demo);}
function companionStatus(){if(S.companion?.connection!=='configured')return 'Saved locally · Chase is not connected';if(S.companion.last_turn==='failed')return 'Saved locally · Chase could not reply';if(S.companion.last_turn==='thinking'||S.companion.last_turn==='queued')return 'Chase is considering the conversation…';return 'Saved locally · Chase gateway configured';}
function showLessons(){dialog(node('h2',{text:'Shared lesson notes'}),...(S.lessons.length?S.lessons.map(m=>node('div',{class:'member-list'},node('div',{},node('strong',{text:m.topic}),node('p',{text:m.note}),...m.evidence.map(e=>node('blockquote',{text:e.quote})),node('small',{text:'Saved '+new Date(m.created*1000).toLocaleString()})))):[node('p',{text:'No shared notes yet. A connected companion can keep useful lesson topics and goals, with the messages they came from.'})]),node('p',{text:'These notes belong to this conversation. Send a correction in the chat when something changes.'}));}
function openProfileMenu(){
 dialog(node('h2',{text:S.profile?.name||'Player profile'}),
   node('button',{class:'menu-item',text:'Join with an invitation',onclick:()=>openJoinDialog()}),
   node('button',{class:'menu-item',text:S.profile?'Switch player profile':'Choose a player profile',onclick:()=>openPlayerDialog()}),
   nativeHost?node('button',{class:'menu-item',text:'Server settings',onclick:()=>{closeDialog();nativeHost.postMessage('settings');}}):null);
}
function openMenu(){dialog(node('h2',{text:'This conversation'}),node('button',{class:'menu-item',text:'Invite a player',onclick:showInvite}),node('button',{class:'menu-item',text:'Preview the sending animation',onclick:previewSending}),node('button',{class:'menu-item',text:'Shared lesson notes',onclick:showLessons}),node('button',{class:'menu-item',text:'Export conversation & files',onclick:async()=>{try{const b=await api('/api/rooms/'+S.room.id+'/export',null,true),url=URL.createObjectURL(b);download(url,'Cue-Chat-'+S.room.name.replace(/[^a-z0-9 -]/gi,'')+'.zip');setTimeout(()=>URL.revokeObjectURL(url),30000);closeDialog();toast('Conversation archive downloaded, including attachments.');}catch(e){toast(e.message)}}}),node('button',{class:'menu-item',text:'Restore a conversation archive',onclick:()=>{closeDialog();$('archive-input').click();}}));}
function openTrainer(m){if(S.trainer)return;const token=crypto.randomUUID();const frame=node('iframe',{src:'/trainer/index.html?train=1&cueChat='+encodeURIComponent(token),title:'Billiards Trainer · edit a shared table copy',allow:'camera; microphone; clipboard-write; fullscreen'});S.trainer={token,frame,message:m,file:structuredClone(m.layout),restored:false};$('trainer-frame').replaceChildren(frame);$('trainer-overlay').hidden=false;setTrainerBusy(true);$('trainer-status').textContent='Opening a separate Trainer test copy…';$('trainer-send').hidden=Boolean(m.privatePractice);$('trainer-send').disabled=true;S.trainer.timer=setTimeout(()=>{if(S.trainer?.token===token){setTrainerBusy(false);$('trainer-status').textContent='Trainer is taking longer to open. You can cancel and try again.';}},20000);}
function trainerPost(action){const t=S.trainer;if(t)t.frame.contentWindow.postMessage({type:'cuechat:'+action,token:t.token,file:action==='load'?t.file:undefined},location.origin);}
function closeTrainer(){if(!S.trainer)return;clearTimeout(S.trainer.timer);S.trainer.frame.remove();S.trainer=null;setTrainerBusy(false);$('trainer-overlay').hidden=true;}
window.addEventListener('message',async event=>{const t=S.trainer;if(!t||event.origin!==location.origin||event.source!==t.frame.contentWindow||event.data?.token!==t.token)return;const d=event.data;if(d.type==='cuechat:ready')trainerPost('load');if(d.type==='cuechat:loaded'){clearTimeout(t.timer);setTrainerBusy(false);$('trainer-status').textContent='Editing a copy · your original table stays saved';$('trainer-send').disabled=false;}if(d.type==='cuechat:error'){clearTimeout(t.timer);setTrainerBusy(false);$('trainer-status').textContent=d.error;$('trainer-send').disabled=false;}if(d.type==='cuechat:cancelled')closeTrainer();if(d.type==='cuechat:return'){try{const file=d.file;file.name=(file.name||file.layout.name||'Shared table').replace(/ · revision$/,'')+' · revision';file.layout.name=file.name;attachLayout(file);S.reply={id:t.message.id,author:t.message.author,label:t.message.layout.name};$('message-input').value='Here’s my version of the table.';renderDraft();saveDraft();closeTrainer();await sendMessage();}catch(e){toast(e.message);$('trainer-status').textContent='The table was kept as a draft. '+e.message;}}});
window.addEventListener('pagehide',()=>{saveDraft();try{S.trainer?.frame.contentWindow.CueChatTrainerBridge?.restore();}catch{}});
$('trainer-send').onclick=()=>{if(S.trainer){$('trainer-send').disabled=true;setTrainerBusy(true);$('trainer-status').textContent='Saving your edited table…';trainerPost('export');}};
$('trainer-cancel').onclick=()=>{try{S.trainer?.frame.contentWindow.CueChatTrainerBridge?.restore();}catch{}closeTrainer();};
$('compose-form').onsubmit=e=>{e.preventDefault();sendMessage();};
$('message-input').oninput=()=>{const i=$('message-input');i.style.height='auto';i.style.height=Math.min(120,i.scrollHeight)+'px';saveDraft();};
$('message-input').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();sendMessage();}};
$('sample-button').onclick=chooseSample;$('attach-button').onclick=()=>$('attachment-input').click();
$('attachment-input').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>30*1024*1024)throw Error('Choose a file smaller than 30 MB for this test.');if(f.name.toLowerCase().endsWith('.json')){attachLayout(JSON.parse(await f.text()),f.name);}else{let mime=f.type;if(mime==='audio/x-wav')mime='audio/wav';if(mime==='audio/x-m4a')mime='audio/mp4';S.pending={name:f.name,mime,base64:await base64File(f)};renderDraft();saveDraft();}}catch(err){toast(err.message)}finally{e.target.value='';}};
$('archive-input').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{toast('Restoring the conversation and its files…');const r=await api('/api/restore',{base64:await base64File(f)});await refreshRooms();await openRoom(r.id);toast('Restored as a separate conversation.');}catch(err){toast(err.message)}finally{e.target.value='';}};
$('invite').onclick=showInvite;$('menu-button').onclick=openMenu;$('profile-button').onclick=openProfileMenu;
$('new-room').onclick=()=>ensurePlayer('Choose your profile to start a group',openNewRoom);
function openNewRoom(){
 const input=node('input',{placeholder:'Group name',maxlength:'70',required:''});
 const submit=node('button',{class:'primary',type:'submit',text:'Start group chat'});
 const form=node('form',{},input,submit);
 form.onsubmit=async e=>{
  e.preventDefault();
  const name=input.value.trim();
  if(!name||submit.disabled)return;
  submit.disabled=true;
  try{const r=await api('/api/rooms',{name});closeDialog();await refreshRooms();await openRoom(r.id);}
  catch(err){toast(err.message);}finally{submit.disabled=false;}
 };
 dialog(node('h2',{text:'Start a new group chat'}),form);
 input.focus();
}
$('member-button').onclick=()=>dialog(node('h2',{text:'At the table'}),...S.members.map(p=>node('div',{class:'member-list'},node('span',{class:'avatar',text:initials(p.name)}),node('span',{text:p.name+(p.id===S.profile.id?' · you':'')}))),node('button',{class:'primary',text:'Invite someone',onclick:showInvite}));
$('dialog-close').onclick=closeDialog;$('info-dialog').addEventListener('click',e=>{if(e.target===$('info-dialog'))closeDialog();});
$('open-sidebar').onclick=()=>$('sidebar').classList.add('open');$('close-sidebar').onclick=()=>$('sidebar').classList.remove('open');
document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll();});window.addEventListener('focus',()=>poll());setInterval(()=>{if(!document.hidden)poll();},1500);
showEmptyInbox();
(async()=>{
 const params=new URLSearchParams(location.search),join=params.get('join'),fresh=params.has('new');
 if(fresh)sessionStorage.removeItem('cuechat-active-profile');
 const profiles=knownProfiles();
 const profileId=sessionStorage.getItem('cuechat-active-profile') || (!fresh && localStorage.getItem(selectedProfileKey));
 const active=profiles.find(p=>p.id===profileId)||(!fresh && profiles.length===1?profiles[0]:null);
 if(active){
  try{await activateProfile(active,!join&&wantsChaseThread);}
  catch(e){
   if(e.status===401){
    localStorage.setItem(profilesKey,JSON.stringify(profiles.filter(p=>p.id!==active.id)));
    sessionStorage.removeItem('cuechat-active-profile');
    localStorage.removeItem(selectedProfileKey);
   }else toast(e.message);
  }
 }
 if(join)openJoinDialog(join);
})();
