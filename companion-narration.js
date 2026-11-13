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
   audio=env.audio(queue[index]);audio.defaultPlaybackRate=1.2;audio.playbackRate=1.2;audio.preservesPitch=true;audio.onended=()=>advance(token);audio.onerror=()=>{if(token===epoch)fail('This Chase recording could not load. Check for updates and try again.');};
   Promise.resolve(audio.play()).catch(()=>{if(token===epoch)fail('Playback could not start. Press Play to try again.');});return;
  }
  if(kind==='native'){try{env.native.speakDescription(queue[index]);}catch{fail('Device speech could not start.');}return;}
  utterance=env.utterance(queue[index].slice(offset));utterance.voice=voice;utterance.lang=voice?.lang||'en-US';utterance.rate=1;
  const begin=offset;utterance.onboundary=ev=>{if(token===epoch&&ev.name==='word')offset=begin+ev.charIndex;};
  utterance.onend=()=>advance(token);utterance.onerror=ev=>{if(token===epoch&&!['interrupted','canceled'].includes(ev.error))fail('Device speech could not play. Check your device voice settings.');};
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
let onStart=()=>{},activeGroup=null,lastInfo={state:'idle',kind:'',message:''};
const icons={pause:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>',resume:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z"/></svg>',stop:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>'};
const player=createPlayer({audio:src=>new Audio(src),speech:root.speechSynthesis,utterance:root.SpeechSynthesisUtterance?text=>new SpeechSynthesisUtterance(text):null,native:root.BilliardsAndroid,changed:paint});
function refresh(){
 for(const trigger of doc.querySelectorAll('[data-action="read"],[data-work="guide-speak"],[data-work="read-reviewed"],[data-work="read-turn"]')){
  if(trigger.closest('.narration-controls'))continue;
  const group=doc.createElement('div');group.className='narration-controls';group.setAttribute('role','group');group.setAttribute('aria-label','Narration controls');trigger.before(group);group.append(trigger);
  for(const [action,label]of [['toggle','Pause narration'],['stop','Stop narration']]){const button=doc.createElement('button');button.type='button';button.className='quiet narration-icon';button.dataset.narrationControl=action;button.setAttribute('aria-label',label);button.title=label;button.innerHTML=icons[action==='toggle'?'pause':'stop'];button.disabled=true;button.onclick=()=>{if(group!==activeGroup)return;if(action==='stop')stop();else if(player.status==='playing')player.pause();else player.resume();};group.append(button);}
  const status=doc.createElement('span');status.className='narration-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');group.append(status);
 }
 paint();
}
function paint(info=lastInfo){
 lastInfo=info;
 for(const group of doc.querySelectorAll('.narration-controls')){
  const selected=group===activeGroup,state=selected?info.state:'idle',toggle=group.querySelector('[data-narration-control="toggle"]'),stopButton=group.querySelector('[data-narration-control="stop"]');
  const resume=['paused','ended','error'].includes(state),label=state==='ended'?'Replay narration':state==='error'?'Retry narration':resume?'Resume narration':'Pause narration';
  toggle.disabled=!selected||state==='idle'||(state==='error'&&player.status!=='error');toggle.innerHTML=icons[resume?'resume':'pause'];toggle.setAttribute('aria-label',label);toggle.title=label;
  stopButton.disabled=!selected||['idle','ended','error'].includes(state);
  group.classList.toggle('is-playing',selected&&state==='playing');group.classList.toggle('has-error',selected&&state==='error');
  group.querySelector('.narration-status').textContent=!selected?'':info.message||({playing:'Playing',paused:'Paused',ended:'Finished',idle:'Stopped',error:'Playback unavailable'}[state])+(info.kind==='recording'?' · Chase · 1.2×':info.kind?' · device voice':'');
 }
}
function select(trigger){refresh();player.stop();activeGroup=trigger?.closest('.narration-controls')||null;}
function selectedVoice(){let uri='';try{uri=root.localStorage.getItem('billiards.companion.voice')||'';}catch{}const voices=root.speechSynthesis?.getVoices()||[];return voices.find(v=>v.voiceURI===uri)||voices.find(v=>v.localService&&v.lang==='en-US')||voices.find(v=>v.localService&&v.lang.startsWith('en'))||null;}
function listen(ids,label,trigger){
 if(onStart()===false)return;select(trigger);const clips=ids.map(k=>installed[k]);
 if(ids.length&&clips.every((r,i)=>r?.src&&r.voice==='chase'&&r.text===copy[ids[i]]?.text))player.recordings(clips.map(r=>r.src));
 else paint({state:'error',kind:'recording',message:'This Chase recording is not available. Check for updates and try Listen again.'});
}
function speakText(text,label,trigger){if(onStart()===false)return;select(trigger);player.text(text,selectedVoice());}
function stop(){player.stop();activeGroup=null;paint();}
root.addEventListener('billiards:description-speech',ev=>player.nativeEvent(ev.detail));root.addEventListener('pagehide',stop);doc.addEventListener('visibilitychange',()=>{if(doc.hidden&&player.status==='playing')player.pause();});
doc.addEventListener('play',ev=>{if(ev.target.matches?.('audio,video')&&player.status==='playing')player.pause();},true);
root.CompanionNarration={listen,speakText,stop,refresh,mount(fn){onStart=fn;},get speaking(){return player.status==='playing';}};
})(typeof window!=='undefined'?window:globalThis);
