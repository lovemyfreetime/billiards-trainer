/* Host controls for a local Play room; guest screens never load this script. */
(function(){'use strict';
const params=new URLSearchParams(location.hash.slice(1)),key='billiards-local-host';let token=null;
if(['127.0.0.1','localhost'].includes(location.hostname)){token=params.get('host')||sessionStorage.getItem(key);if(token){sessionStorage.setItem(key,token);history.replaceState(null,'',location.pathname+location.search);}}
const active=!!token;let dialog,adapter,revision=0,sharing=true,pending=null,uploading=false,newGame=true,lastMembers='',lastURLs='',selectedSeats=new Map(),eventsSeen=new Set(),polling=false;
function el(tag,value,cls){const n=document.createElement(tag);if(value)n.textContent=value;if(cls)n.className=cls;return n;}
function button(label,fn,cls){const b=el('button',label,cls);b.type='button';b.onclick=fn;return b;}
function error(message){const n=document.getElementById('localError');if(n)n.textContent=message;}
async function api(route,data){const r=await fetch('/api/host'+route,{method:data?'POST':'GET',headers:{Authorization:'Bearer '+token,...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined,cache:'no-store'});const v=await r.json();if(!r.ok)throw Error(v.error||'Local host unavailable.');return v;}
function publish(state){if(!active||!sharing||!state)return;cancelSpeech();pending={state:JSON.parse(JSON.stringify(state)),newGame:newGame||!!pending?.newGame,id:Date.now()+'-'+Math.random()};newGame=false;queueMicrotask(flush);}
async function flush(){if(uploading||!sharing)return;uploading=true;let snapshot;try{while(pending&&sharing){snapshot=pending;pending=null;const r=await api('/state',snapshot);revision=r.revision;error('');}}catch(e){if(!pending)pending=snapshot;error('Update delayed. Reconnecting… '+e.message);setTimeout(flush,2000);}finally{uploading=false;}}

// Host speech uses the same lease as every player phone.
let announcement=null,alertSerial=0;
function cancelSpeech(){
 const a=announcement;if(!a)return;announcement=null;clearTimeout(a.timer);window.BilliardsAudio?.cancel();
 api('/audio',{id:a.id,done:true}).catch(()=>{});
}
function speak(message){
 cancelSpeech();if(!active||!sharing||document.hidden||!window.BilliardsAudio?.available())return;
 const a={id:'host-'+Date.now()+'-'+(++alertSerial),timer:null,revision:null};announcement=a;
 async function attempt(){
  if(announcement!==a)return;
  if(!sharing||document.hidden){cancelSpeech();return;}
  // A shot publishes before announcing. Wait until that snapshot has its revision.
  if(uploading||pending){a.timer=setTimeout(attempt,50);return;}
  if(a.revision===null)a.revision=revision;
  if(a.revision!==revision){cancelSpeech();return;}
  const sent=performance.now();
  try{
   const slot=await api('/audio',{id:a.id,revision:a.revision,duration:window.BilliardsAudio.duration(message)});
   if(announcement!==a){api('/audio',{id:a.id,done:true}).catch(()=>{});return;}
   if(!slot.granted){a.timer=setTimeout(attempt,250);return;}
   const budget=slot.remaining-(performance.now()-sent);if(budget<1000){cancelSpeech();return;}
   a.timer=setTimeout(()=>{if(announcement===a)cancelSpeech();},budget);window.BilliardsAudio.speak(message,()=>{if(announcement===a)cancelSpeech();});
  }catch{if(announcement===a)cancelSpeech();}
 }
 attempt();
}
window.addEventListener('pagehide',cancelSpeech);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelSpeech();});

function createDialog(){
 dialog=el('dialog','','local-room');dialog.setAttribute('aria-labelledby','localRoomTitle');const title=el('h2','Local table');title.id='localRoomTitle';dialog.append(title);
 const note=el('p');note.id='localRoomNote';dialog.append(note);
 if(!active){
  note.textContent='Host a table from the current Windows app. Phones and tablets scan its QR code and join on the same Wi-Fi. The host keeps score; each player gets their own private screen.';
  if(window.BilliardsWindowsHostAvailable)dialog.append(button('Start hosting on this computer',()=>{error('Starting the local host…');window.chrome.webview.postMessage({type:'start-local-play'});},'local-primary'));
  else{const a=el('a','Get the Windows host','local-download');a.href='https://lovemyfreetime.github.io/billiards-trainer/install/windows/';dialog.append(a,el('p','Install the updated Windows app to host. Android, iPhone, iPad, and other computers can join as players in their browsers.'));}
 }else{
  if(window.BilliardsAndroid?.startLocalHotspot){dialog.append(button('Create Android local hotspot',()=>window.BilliardsAndroid.startLocalHotspot()),button('Open Wi-Fi settings',()=>window.BilliardsAndroid.openWifiSettings()));}
  note.textContent='Keep this host running. Players must join the same trusted private Wi-Fi; the network must allow devices to communicate. No internet is needed during play.';
  const linkLabel=el('label','Address players can reach');linkLabel.htmlFor='localAddress';const select=el('select');select.id='localAddress';select.onchange=()=>qr(select.value);const img=el('img');img.id='localQR';img.alt='Scan to join this local table';img.width=260;img.height=260;
  const address=el('p','','local-address');address.id='localJoinLink';
  dialog.append(linkLabel,select,img,address,el('p','Scan once, enter a name, then approve a seat below. A name alone never unlocks a player’s cards.'));
  const list=el('section');list.id='localMembers';list.setAttribute('aria-label','Player joining requests');dialog.append(list);
  dialog.append(button('Share current game',()=>{sharing=true;newGame=true;publish(adapter?.getState());lastURLs='';poll();},'local-primary'),button('End sharing · disconnect players',async()=>{if(uploading){error('Wait for the current update, then try again.');return;}if(!confirm('Disconnect everyone from this local table?'))return;try{cancelSpeech();sharing=false;pending=null;await api('/end',{});lastURLs='';lastMembers='';error('Sharing ended. Share current game to invite players again.');}catch(e){error(e.message);}}));
 }
 const status=el('p');status.id='localError';status.setAttribute('role','status');dialog.append(status,button('Back to table',()=>{dialog.close();window.BilliardsPlayNavigation?.backToTable();},'play-return'));window.BilliardsNarration?.attach(dialog,'local-table-help');window.BilliardsNarration?.backdrop(dialog,()=>dialog.close());document.body.append(dialog);
}
async function qr(url){const img=document.getElementById('localQR'),label=document.getElementById('localJoinLink');if(!url){img.hidden=true;label.textContent='No local Wi-Fi address found. Connect this host to Wi-Fi, then reopen Local table.';return;}label.textContent=url.split('#')[0];try{const r=await api('/qr',{url});img.src=r.image;img.hidden=false;}catch(e){error(e.message);}}
function roster(data){
 const list=document.getElementById('localMembers');if(!list)return;const signature=JSON.stringify([data.members,data.players]);if(signature===lastMembers)return;lastMembers=signature;list.replaceChildren(el('h3','Players'));
 if(!data.members.length)list.append(el('p','No joining requests yet. Show players the QR code.'));
 for(const m of data.members){const row=el('div','','local-member');row.append(el('strong',m.name+' · '+(m.online?'connected':'away')));if(m.seat!==null)row.append(el('p','Seat: '+(data.players[m.seat]?.name||'waiting for game')));
  else{const select=el('select');select.setAttribute('aria-label','Seat for '+m.name);const empty=el('option','Choose player seat');empty.value='';select.append(empty);for(const p of data.players){const o=el('option',p.name);o.value=p.id;select.append(o);}select.value=selectedSeats.get(m.id)||'';select.onchange=()=>selectedSeats.set(m.id,select.value);row.append(select,button('Approve player',async()=>{if(select.value===''){error('Choose the matching player seat first.');return;}try{await api('/seat',{id:m.id,seat:Number(select.value)});lastMembers='';poll();}catch(e){error(e.message);}}));}
  row.append(button('Remove',async()=>{try{await api('/remove',{id:m.id});lastMembers='';poll();}catch(e){error(e.message);}}));list.append(row);
 }
}
async function poll(){if(!active||polling)return;polling=true;try{
 const data=await api('');if(dialog?.open){roster(data);const signature=JSON.stringify(data.urls);if(lastURLs!==signature){lastURLs=signature;const select=document.getElementById('localAddress');select.replaceChildren(...data.urls.map(url=>{const o=el('option',new URL(url).hostname);o.value=url;return o;}));qr(select.value);}}
 if(!uploading&&!pending){const ack=[];for(const item of data.events){ack.push(item.id);if(eventsSeen.has(item.id))continue;eventsSeen.add(item.id);if(item.revision===revision&&sharing)adapter?.applyAction(item.event,item.seat,{id:item.id});}if(ack.length)await api('/ack',{ids:ack});}
 error('');
 }catch(e){error('Local host disconnected. '+e.message);}finally{polling=false;}}
function open(){if(!dialog)createDialog();if(!dialog.open)dialog.showModal();if(active){publish(adapter?.getState());lastURLs='';poll();}}
window.BilliardsLocalSession={active,open,speak,cancelSpeech,button:()=>button('Local table',open),publish,newGame(){newGame=true;sharing=true;},async clearGame(){if(!active)return;if(uploading)throw Error('Wait for the current table update, then clear the saved game.');cancelSpeech();pending=null;const ended=await api('/end',{});revision=ended.revision??revision;sharing=false;newGame=true;lastMembers='';lastURLs='';eventsSeen.clear();},mount(value){adapter=value;if(active){publish(adapter.getState());setInterval(poll,1000);poll();}}};
})();
