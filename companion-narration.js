/* One controllable player for Chase recordings and explicitly chosen device speech. */
(function(root){
'use strict';
function createPlayer(env){
 let state='idle',kind='',queue=[],index=0,audio=null,utterance=null,epoch=0,offset=0,voice=null;
 const emit=message=>env.changed({state,kind,index,total:queue.length,message:message||''});
 function cancel(){epoch++;if(audio){audio.pause();audio.src='';audio=null;}if(utterance){utterance.onend=null;utterance.onerror=null;utterance=null;}env.speech?.cancel();env.native?.cancelDescriptionSpeech?.();}
 function stop(){cancel();state='idle';index=0;offset=0;emit();}
 function fail(message){cancel();state='error';emit(message);}
 function advance(token){if(token!==epoch||state!=='playing')return;index++;offset=0;if(index>=queue.length){state='ended';emit();return;}playItem();}
 function playItem(){
  const token=++epoch;state='playing';emit();
  if(kind==='recording'){
   audio=env.audio(queue[index]);audio.defaultPlaybackRate=1.2;audio.playbackRate=1.2;audio.preservesPitch=true;audio.onended=()=>advance(token);audio.onerror=()=>{if(token===epoch)fail('This Chase recording could not load. Check for updates or use the device voice below.');};
   Promise.resolve(audio.play()).catch(()=>{if(token===epoch)fail('Playback could not start. Press Play to try again.');});return;
  }
  if(kind==='native'){try{env.native.speakDescription(queue[index]);}catch{fail('Device speech could not start.');}return;}
  utterance=env.utterance(queue[index].slice(offset));utterance.voice=voice;utterance.lang=voice?.lang||'en-US';utterance.rate=1;
  const begin=offset;utterance.onboundary=ev=>{if(token===epoch&&ev.name==='word')offset=begin+ev.charIndex;};
  utterance.onend=()=>advance(token);utterance.onerror=ev=>{if(token===epoch&&!['interrupted','canceled'].includes(ev.error))fail('Device speech could not play. Choose another installed voice.');};
  env.speech.resume();env.speech.speak(utterance);
 }
 function recordings(sources){stop();kind='recording';queue=sources.slice();if(queue.length)playItem();}
 function text(text,selected){stop();voice=selected||null;queue=(text.match(/[^.!?]+(?:[.!?]+|$)/g)||[text]).flatMap(s=>s.match(/[\s\S]{1,350}(?:\s|$)|[\s\S]{1,350}/g)||[]).map(s=>s.trim()).filter(Boolean);kind=env.speech&&env.utterance?'speech':env.native?.speakDescription?'native':'';if(!kind)return fail('No device voice is available here.');if(queue.length)playItem();}
 function pause(){if(state!=='playing')return;state='paused';if(kind==='recording')audio.pause();else cancel();emit(kind==='native'?'Resume repeats the current sentence.':'');}
 function resume(){if(state==='ended'){index=0;offset=0;playItem();return;}if(!['paused','error','idle'].includes(state))return;if(kind==='recording'&&audio){state='playing';emit();const token=epoch;Promise.resolve(audio.play()).catch(()=>{if(token===epoch)fail('Press Play to retry playback.');});}else if(queue.length)playItem();}
 function nativeEvent(detail){if(kind!=='native'||state!=='playing')return;if(detail==='end')advance(epoch);else if(detail==='error')fail('Device speech could not play.');}
 return {recordings,text,pause,resume,stop,nativeEvent,get status(){return state;},get kind(){return kind;}};
}
if(typeof module!=='undefined'&&module.exports){module.exports={createPlayer};return;}
const copy=root.CompanionNarrationCopy.records,installed=root.CompanionNarrationFiles||{},doc=root.document;
let panel,title,fixedTitle,keys=[],pending='',voiceURI='',selectionKey='billiards.companion.voice',onStart=()=>{};
try{voiceURI=root.localStorage.getItem(selectionKey)||'';}catch{}
const player=createPlayer({audio:src=>new Audio(src),speech:root.speechSynthesis,utterance:root.SpeechSynthesisUtterance?text=>new SpeechSynthesisUtterance(text):null,native:root.BilliardsAndroid,changed:paint});
const $=id=>doc.getElementById(id);
function setup(){if(panel)return;panel=doc.createElement('section');panel.id='narrationPlayer';panel.className='narration-player';panel.hidden=true;panel.setAttribute('aria-label','Narration player');panel.innerHTML='<div class="narration-heading"><strong id="narrationTitle"></strong><button id="narrationClose" aria-label="Close narration player">×</button></div><p id="narrationStatus" role="status"></p><div class="actions"><button id="narrationToggle" class="primary">Play</button><button id="narrationStop">Stop</button></div><details id="narrationOptions"><summary>Device voice options</summary><label>Voice for personal text<select id="narrationVoice"></select></label><p class="hint">Installed voices have no per-use charge. Online voices need internet and use your device’s speech service. Voice quality depends on your device.</p><div class="actions"><button id="narrationPreview">Preview voice</button><button id="narrationFallback" hidden>Read with device voice</button></div></details>';doc.body.append(panel);
 $('narrationToggle').onclick=()=>player.status==='playing'?player.pause():player.resume();$('narrationStop').onclick=()=>{player.stop();paint();};$('narrationClose').onclick=()=>{player.stop();panel.hidden=true;doc.body.classList.remove('narration-open');};
 $('narrationVoice').onchange=()=>{player.stop();voiceURI=$('narrationVoice').value;try{root.localStorage.setItem(selectionKey,voiceURI);}catch{}paint();};
 $('narrationPreview').onclick=()=>speakText('Explore one shot. Test one idea. Keep what helps.','Voice preview');$('narrationFallback').onclick=()=>speakText(pending,fixedTitle);
 $('narrationToggle').onclick=()=>{if(player.status==='playing')player.pause();else if(['paused','ended','error'].includes(player.status))player.resume();else player.resume();};voices();
}
function voices(){if(!panel)return;const list=root.speechSynthesis?.getVoices()||[],select=$('narrationVoice');select.replaceChildren();const available=list.filter(v=>v.lang.startsWith('en')).sort((a,b)=>Number(b.localService)-Number(a.localService)||a.name.localeCompare(b.name));const option=(label,value)=>{const o=doc.createElement('option');o.textContent=label;o.value=value;select.append(o);};option(available.some(v=>v.localService)?'Automatic · installed English voice':'Device default', '');for(const v of available)option(v.name+' · '+v.lang+(v.localService?' · installed':' · online'),v.voiceURI);select.value=available.some(v=>v.voiceURI===voiceURI)?voiceURI:'';select.disabled=!available.length;}
function selectedVoice(){const voices=root.speechSynthesis?.getVoices()||[];return voices.find(v=>v.voiceURI===voiceURI)||voices.find(v=>v.localService&&v.lang==='en-US')||voices.find(v=>v.localService&&v.lang.startsWith('en'))||null;}
function paint(info={state:player.status,kind:player.kind}){if(!panel)return;const active=info.state==='playing';$('narrationTitle').textContent=title||'Narration';$('narrationToggle').textContent=active?'Pause':info.state==='paused'?'Resume':info.state==='ended'?'Replay':'Play';$('narrationStop').disabled=['idle','ended','error'].includes(info.state);$('narrationStatus').textContent=info.message||({playing:'Playing',paused:'Paused',ended:'Finished',idle:'Stopped',error:'Playback unavailable'}[info.state])+(info.kind==='recording'?' · Chase · 1.2×':info.kind?' · device voice':'');}
function show(){setup();panel.hidden=false;doc.body.classList.add('narration-open');}
function listen(ids,label){if(onStart()===false)return;show();player.stop();$('narrationToggle').disabled=false;keys=ids.slice();title=label||copy[ids[0]]?.title||'Narration';fixedTitle=title;pending=ids.map(k=>copy[k]?.text||'').join(' ');const clips=ids.map(k=>installed[k]);$('narrationFallback').hidden=false;
 if(ids.length&&clips.every((r,i)=>r?.src&&r.voice==='chase'&&r.text===copy[ids[i]]?.text)){ $('narrationFallback').hidden=true;player.recordings(clips.map(r=>r.src)); }
 else{paint();$('narrationStatus').textContent='Chase recording is not installed yet. You can choose a device voice below.';$('narrationToggle').disabled=true;$('narrationOptions').open=true;}
}
function speakText(text,label){if(onStart()===false)return;show();title=label||'Personal text';$('narrationToggle').disabled=false;player.text(text,selectedVoice());}
function options(){show();player.stop();title='Choose a voice';paint();$('narrationOptions').open=true;voices();}
function stop(){player.stop();if(panel){panel.hidden=true;doc.body.classList.remove('narration-open');}}
root.addEventListener('billiards:description-speech',ev=>player.nativeEvent(ev.detail));root.addEventListener('pagehide',stop);doc.addEventListener('visibilitychange',()=>{if(doc.hidden&&player.status==='playing')player.pause();});
root.speechSynthesis?.addEventListener?.('voiceschanged',voices);
doc.addEventListener('play',ev=>{if(ev.target.matches?.('audio,video')&&player.status==='playing')player.pause();},true);
root.CompanionNarration={listen,speakText,options,stop,mount(fn){onStart=fn;},get speaking(){return player.status==='playing';}};
})(typeof window!=='undefined'?window:globalThis);
