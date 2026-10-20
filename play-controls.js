/* Paired HID remotes and native offline speech feed the same command boundary. */
(function(){'use strict';
let adapter=null,enabled=false,learning=null,voice=false,lastSpeech=0,listening=false,nextListen=0;
const allowed=['made','miss','foul','scratch','ready','undo','pause','resume','clock-start','clock-pause','clock-extend','drill-made','drill-miss'];
let mapping={};try{const saved=JSON.parse(localStorage.getItem('billiardsClicker-v1')||'{}');for(const [key,value] of Object.entries(saved))if(allowed.includes(value))mapping[key]=value;}catch{}
function status(message){document.querySelectorAll('[data-input-status]').forEach(n=>n.textContent=message);}
function capture(){window.BilliardsAndroid?.setClickerCapture?.(enabled||!!learning);}
function save(){try{localStorage.setItem('billiardsClicker-v1',JSON.stringify(mapping));}catch{status('Button mapping could not be saved.');}}
function key(e){return e.code||e.key;}
document.addEventListener('keydown',e=>{
 if(!adapter||e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target.closest('input,textarea,select,[contenteditable=true]'))return;
 if(learning){e.preventDefault();e.stopImmediatePropagation();mapping[key(e)]=learning;save();status(`Button ${key(e)} assigned to ${learning}.`);learning=null;capture();return;}
 if(!enabled||!mapping[key(e)])return;e.preventDefault();e.stopImmediatePropagation();const r=adapter.dispatch({type:mapping[key(e)]},{source:'clicker'});status(r.ok?'Button recorded.':r.message);
},true);
window.addEventListener('blur',()=>{learning=null;capture();});
window.billiardsNativeButton=code=>{if(!adapter)return;if(learning){mapping['AndroidKey:'+code]=learning;learning=null;save();capture();status('Remote button assigned.');return;}if(enabled&&mapping['AndroidKey:'+code]){const r=adapter.dispatch({type:mapping['AndroidKey:'+code]},{source:'clicker'});status(r.ok?'Button recorded.':r.message);}};
function stopVoice(message='Microphone off.'){voice=false;listening=false;window.BilliardsAndroid?.stopOfflineVoice?.();document.querySelectorAll('[data-voice-toggle]').forEach(n=>n.textContent='Enable offline voice');status(message);}
window.billiardsNativeVoice=(event)=>{
 listening=false;nextListen=Date.now()+700;
 if(!voice||!adapter||document.hidden)return;
 if(event.error){status(event.error);if(event.fatal)stopVoice(event.error);return;}
 if(window.BilliardsAudio.speaking()||Date.now()-lastSpeech<900)return;
 if(!Number.isFinite(event.confidence)||event.confidence<0.75){status('Not clear enough. Repeat with Table first.');return;}
 const r=adapter.voice(event.text,{id:event.id});status(r.ok?'Voice command recorded.':r.message);
};
setInterval(()=>{
 const speaking=!!window.BilliardsAudio.speaking();
 if(speaking){lastSpeech=Date.now();if(listening){window.BilliardsAndroid?.stopOfflineVoice?.();listening=false;}return;}
 if(!voice||listening||document.hidden||Date.now()-lastSpeech<900||Date.now()<nextListen)return;
 // Native on-device recognizer only. Never silently switch to cloud recognition.
 if(window.BilliardsAndroid?.startOfflineVoice){listening=true;nextListen=Date.now()+1500;window.BilliardsAndroid.startOfflineVoice();}
},200);
document.addEventListener('billiards-native-pause',()=>{stopVoice();window.BilliardsAudio.cancel();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopVoice();});
window.addEventListener('pagehide',()=>stopVoice());
window.BilliardsPlayControls={mount(parent,value){adapter=value;parent.replaceChildren();const add=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;parent.append(n);return n;};add('h3','Clicker & voice');window.BilliardsNarration?.attach(parent,'clicker-help');add('p','Pair a keyboard-style Bluetooth remote in your device settings. Assign each button here, then enable it. The Android Play app can also capture external media or volume buttons while clicker mode is active. Browser support depends on the remote.');const select=add('select','');select.setAttribute('aria-label','Clicker action');allowed.forEach(action=>{const n=document.createElement('option');n.value=action;n.textContent=action.replaceAll('-',' ');select.append(n);});add('button','Assign next remote button').onclick=()=>{learning=select.value;capture();status('Press the remote button now.');};const toggle=add('button',enabled?'Disable clicker':'Enable clicker');toggle.onclick=()=>{enabled=!enabled;learning=null;capture();toggle.textContent=enabled?'Disable clicker':'Enable clicker';status(enabled?'Assigned buttons are active.':'Clicker off.');};add('button','Clear button assignments').onclick=()=>{mapping={};save();status('Assignments cleared.');};
add('p','Voice commands start with “Table”: ready, ball one made, miss, foul, scratch, undo, pause, resume, start clock, pause clock, extension, drill made, drill miss. Audio on enables referee announcements.');
const supported=!!window.BilliardsAndroid?.offlineVoiceAvailable?.();const microphone=add('button',voice?'Turn microphone off':supported?'Enable offline voice':'Offline voice needs a supported Android app');microphone.dataset.voiceToggle='';microphone.disabled=!supported;microphone.onclick=()=>{if(voice)stopVoice();else{voice=true;nextListen=0;status('Say Table followed by a command.');}microphone.textContent=voice?'Turn microphone off':'Enable offline voice';};const note=add('p','');note.dataset.inputStatus='';note.setAttribute('role','status');
}};
})();
