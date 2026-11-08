/* Record or import an editable narration track without altering the source video. */
(() => {
 'use strict';
 const open=document.getElementById('trainerNarrateVideo');
 if(!open)return;
 const dialog=document.createElement('dialog');
 dialog.id='trainerNarrationDialog';
 dialog.style.cssText='max-width:900px;width:92vw;max-height:90vh;overflow:auto;background:#1b2933;color:#eee;border:1px solid #668694;border-radius:12px;padding:18px';
 dialog.innerHTML=`<h2>Narrate a video</h2>
 <p>Choose a saved Trainer video. Import a narration audio file or record your voice while watching; the original video never changes.</p>
 <label>Trainer video <input id="narrationVideoFile" type="file" accept="video/*"></label>
 <video id="narrationPreview" controls playsinline muted style="display:block;width:100%;max-height:40vh;background:#080d13;margin:12px 0"></video>
 <label>Narration audio <input id="narrationAudioFile" type="file" accept="audio/*"></label>
 <div class="row" style="margin:8px 0">
  <label>Use narration <select id="narrationSourceMode"><option value="import">Uploaded audio</option><option value="record">Microphone takes</option></select></label>
  <button id="narrationRecord" type="button">🎙 Record from this frame</button>
  <button id="narrationStop" type="button" disabled>Stop recording</button>
 </div>
 <div id="narrationRecordingIndicator" role="status" aria-live="polite" hidden style="padding:10px;margin:8px 0;background:#3b171c;border:2px solid #ef5959;border-radius:8px;color:#fff">
   <strong style="color:#ff8b8b">● RECORDING MICROPHONE</strong>
   <span id="narrationRecordClock" style="margin-left:12px;font-variant-numeric:tabular-nums">00:00</span>
   <div style="margin-top:5px"><label for="narrationRecordLevel">Mic signal</label>
     <progress id="narrationRecordLevel" max="100" value="0" style="width:60%;height:12px;margin-left:8px"></progress>
     <span id="narrationRecordLevelText">Speak to check the level</span>
   </div>
   <small>Audio is being captured as a take; it is added to the video only when you export.</small>
 </div>
 <p class="hint">Play the video during recording; pause the video to explain a frozen frame. Re-record from any frame to replace that part of your narration.</p>
 <ul id="narrationTakes" aria-label="Recorded narration segments"></ul>
 <audio id="narrationAudioPreview" controls style="display:block;width:100%;margin:10px 0"></audio>
 <div class="row"><button id="narrationPreviewTogether" type="button">Preview with video</button><button id="narrationSaveAudio" type="button">Save audio file</button><button id="narrationAudioFolder" type="button">Audio folder</button></div>
 <div class="row"><label>Audio starts at <input id="narrationOffset" type="number" min="0" max="3600" step="0.1" value="0" style="width:75px"> seconds</label></div>
 <div class="row"><label>Hold this frame for <input id="narrationHold" type="number" min="0.1" max="300" step="0.5" value="2" style="width:75px"> seconds</label>
 <button id="narrationAddHold" type="button">Add pause here</button></div>
 <ul id="narrationHolds"></ul>
 <p class="hint">Pause the preview at the frame you want to hold, then add the pause. Narration continues during holds. If the audio runs longer, the final frame stays visible until it finishes.</p>
 <label>Output name <input id="narrationName" type="text" maxlength="80" value="Narrated lesson 01"></label>
 <div class="row" style="margin-top:10px"><button id="narrationSaveDraft" type="button">Save editable project</button>
 <select id="narrationDrafts" aria-label="Saved narration projects"><option value="">Saved projects</option></select>
 <button id="narrationLoadDraft" type="button">Open project</button></div>
 <div class="row" style="margin-top:12px"><button id="narrationExport" type="button">Export narrated video</button><button id="narrationCancel" type="button" hidden>Cancel export</button><button id="narrationClose" type="button">Close</button></div>
 <p id="narrationStatus" role="status"></p>
 <button id="narrationOpenExportFolder" type="button" hidden>Open exported video folder</button>`;
 document.body.append(dialog);
 // Preview playback keys belong to the editor, not the Trainer's shot shortcuts.
 dialog.addEventListener('keydown',event=>event.stopPropagation());
 const get=id=>dialog.querySelector('#'+id);
 const video=get('narrationPreview'),audio=get('narrationAudioPreview'),message=get('narrationStatus');
 const android=window.BilliardsAndroid;
 let videoUrl,audioUrl,videoFile,audioFile,holds=[],segments=[],working=false,canceled=false;
 let microphone=null,previewing=false,playbackTimer=0,holdTimer=0,audioFolder=null,recordingUrl=null,recordMeterTimer=0;
 const cleanUrl=url=>{if(url)URL.revokeObjectURL(url);};
 function list(){
  const holdList=get('narrationHolds');holdList.replaceChildren();
  holds.sort((a,b)=>a.at-b.at);
  holds.forEach((hold,index)=>{
   const li=document.createElement('li'),remove=document.createElement('button');
   li.append(hold.at.toFixed(2)+'s · hold '+hold.seconds+'s ');
   remove.textContent='Remove';remove.type='button';remove.disabled=working;
   remove.disabled=working||!!microphone;
   remove.onclick=()=>{shiftTakesAfter(hold.at,-hold.seconds);holds.splice(index,1);list();showTakes();};
   li.append(remove);holdList.append(li);
  });
 }
 function showTakes(){
  const list=get('narrationTakes');list.replaceChildren();
  for(const segment of segments.slice().sort((a,b)=>a.start-b.start)){
   const li=document.createElement('li');
   li.append('At '+segment.start.toFixed(1)+'s · '+segment.length.toFixed(1)+'s ');
   for(const [label,action] of [
    ['Listen',()=>{setAudioPreview(segment.blob);audio.play().catch(()=>{});}],
    ['Retake',async()=>{video.currentTime=sourceTime(segment.start,video.duration,holds);await startMicrophone(segment.id);}],
    ['Remove',()=>{segments=segments.filter(s=>s.id!==segment.id);showTakes();updateAudioPreview();}]
   ]){
    const button=document.createElement('button');button.type='button';button.textContent=label;
    button.disabled=working||!!microphone;button.onclick=action;li.append(button);
   }
   list.append(li);
  }
  if(!segments.length){const li=document.createElement('li');li.textContent='No microphone takes recorded yet.';list.append(li);}
 }
 function setAudioPreview(blob){
  cleanUrl(recordingUrl);recordingUrl=blob?URL.createObjectURL(blob):null;
  if(recordingUrl)audio.src=recordingUrl;else audio.removeAttribute('src');
 }
 function updateAudioPreview(){
  if(get('narrationSourceMode').value==='import'){
   cleanUrl(recordingUrl);recordingUrl=null;
   if(audioUrl)audio.src=audioUrl;else audio.removeAttribute('src');
  }else setAudioPreview(segments.length?segments[segments.length-1].blob:null);
 }
 function setVideo(file,reset=false){
  videoFile=file;cleanUrl(videoUrl);videoUrl=file?URL.createObjectURL(file):null;
  if(videoUrl)video.src=videoUrl;else video.removeAttribute('src');
  if(reset){holds=[];segments=[];list();showTakes();}
 }
 function setImported(file){
  audioFile=file;cleanUrl(audioUrl);audioUrl=file?URL.createObjectURL(file):null;
  updateAudioPreview();
 }
 function outputTime(source){return source+holds.reduce((sum,h)=>sum+(h.at<source-.001?h.seconds:0),0);}
 function shiftTakesAfter(at,delta){
  for(const segment of segments){
   if(sourceTime(segment.start,video.duration,holds)>at+.001)
    segment.start=Math.max(0,segment.start+delta);
  }
 }
 function replaceTake(take,replacedId){
  const end=take.start+take.length,kept=[];
  for(const old of segments){
   if(old.id===replacedId)continue;
   const oldEnd=old.start+old.length;
   if(oldEnd<=take.start||old.start>=end){kept.push(old);continue;}
   if(old.start<take.start)kept.push({...old,length:take.start-old.start});
   if(oldEnd>end)kept.push({...old,id:old.id+'-tail',start:end,trim:old.trim+end-old.start,length:oldEnd-end});
  }
  segments=[...kept,take].sort((a,b)=>a.start-b.start);
  get('narrationSourceMode').value='record';showTakes();updateAudioPreview();
 }
 function recorderMime(){
  for(const mime of ['audio/webm;codecs=opus','audio/mp4','audio/webm','audio/ogg;codecs=opus'])
   if(MediaRecorder.isTypeSupported(mime))return mime;
  return '';
 }
 let autoHold=false,playbackFrame=0;
 function updateRecordingIndicator(){
  const target=get('narrationRecordingIndicator'),capture=microphone;
  if(recordMeterTimer){clearInterval(recordMeterTimer);recordMeterTimer=0;}
  target.hidden=!capture||!!capture.stopping;
  if(target.hidden)return;
  const tick=()=>{
   if(microphone!==capture||capture.stopping)return;
   const elapsed=Math.floor((performance.now()-capture.startedAt)/1000);
   get('narrationRecordClock').textContent=String(Math.floor(elapsed/60)).padStart(2,'0')+':'+String(elapsed%60).padStart(2,'0');
   let level=0;
   if(capture.nativeToken&&android?.narrationMicrophoneLevel){
    try{level=Number(android.narrationMicrophoneLevel(capture.nativeToken))||0;}catch(error){}
   }else if(capture.analyser){
    const data=capture.meterData;capture.analyser.getByteTimeDomainData(data);
    let power=0;for(const value of data){const centered=(value-128)/128;power+=centered*centered;}
    level=Math.min(100,Math.round(Math.sqrt(power/data.length)*300));
   }
   level=Math.max(0,Math.min(100,level));
   get('narrationRecordLevel').value=level;
   get('narrationRecordLevelText').textContent=level>2?'Microphone signal detected':'Speak to check the level';
  };
  tick();recordMeterTimer=setInterval(tick,180);
 }
 function monitorBrowserMicrophone(capture){
  try{
   const Context=window.AudioContext||window.webkitAudioContext;
   if(!Context)return;
   capture.levelContext=new Context();
   const source=capture.levelContext.createMediaStreamSource(capture.stream);
   capture.analyser=capture.levelContext.createAnalyser();
   capture.analyser.fftSize=256;
   capture.meterData=new Uint8Array(capture.analyser.fftSize);
   source.connect(capture.analyser); // Never route the microphone to the speakers.
  }catch(error){}
 }
 function recordingControls(active){
  for(const id of ['narrationVideoFile','narrationAudioFile','narrationSourceMode','narrationSaveAudio',
   'narrationAudioFolder','narrationSaveDraft','narrationLoadDraft','narrationExport',
   'narrationAddHold','narrationPreviewTogether','narrationDrafts','narrationName'])
   get(id).disabled=active;
  get('narrationRecord').disabled=active;get('narrationStop').disabled=!active;
  updateRecordingIndicator();showTakes();
 }
 function stopHoldPlayback(){
  if(playbackFrame)cancelAnimationFrame(playbackFrame);
  if(holdTimer)clearTimeout(holdTimer);
  playbackFrame=0;holdTimer=0;autoHold=false;
 }
 function playWithHolds(from){
  stopHoldPlayback();
  const queue=holds.filter(h=>h.at>=from-.04).sort((a,b)=>a.at-b.at);
  let index=0,active=true;
  const tick=()=>{
   if(!active||(!microphone&&!previewing))return;
   if(!video.paused&&!autoHold&&index<queue.length&&video.currentTime>=queue[index].at-.025){
    const hold=queue[index++];autoHold=true;video.currentTime=hold.at;video.pause();
    holdTimer=setTimeout(()=>{autoHold=false;holdTimer=0;if(microphone||previewing)video.play().catch(()=>{});},hold.seconds*1000);
   }
   playbackFrame=requestAnimationFrame(tick);
  };
  playbackFrame=requestAnimationFrame(tick);
  return ()=>{active=false;stopHoldPlayback();};
 }
 video.addEventListener('pause',()=>{
  if(microphone&&!microphone.stopping&&!autoHold&&!video.ended&&!microphone.pausedAt){
   microphone.pausedAt=performance.now();microphone.pausedSource=video.currentTime;
  }
 });
 video.addEventListener('play',()=>{
  if(microphone?.pausedAt&&!autoHold){
   const seconds=(performance.now()-microphone.pausedAt)/1000;
   if(seconds>.08){shiftTakesAfter(microphone.pausedSource,seconds);holds.push({at:microphone.pausedSource,seconds});list();}
   microphone.pausedAt=0;
  }
 });
 async function finishTake(capture,blob){
  capture.stream?.getTracks().forEach(t=>t.stop());
  stopHoldPlayback();microphone=null;updateRecordingIndicator();
  try{
   if(!blob?.size)throw Error('No microphone audio was captured.');
   const context=new AudioContext();
   let buffer;
   try{buffer=await context.decodeAudioData(await blob.arrayBuffer());}
   finally{await context.close();}
   if(!Number.isFinite(buffer.duration)||buffer.duration<=0)throw Error('The recorded audio has no duration.');
   const take={id:'take-'+Date.now()+'-'+Math.random().toString(36).slice(2),
    blob,start:capture.start,trim:0,length:buffer.duration};
   replaceTake(take,capture.replacedId);
   message.textContent='Microphone take captured ('+buffer.duration.toFixed(1)+'s). Listen or retake, then save the editable project or export the new MP4.';
  }catch(error){message.textContent='Microphone take was not saved: '+error.message;}
  finally{if(capture.levelContext)capture.levelContext.close().catch(()=>{});recordingControls(false);}
 }
 function beginRecording(capture){
  capture.startedAt=performance.now();microphone=capture;
  recordingControls(true);
  message.textContent='Microphone capture is active. Watch the red timer and mic signal; Stop recording to save the take.';
  if(!video.ended&&video.currentTime<video.duration-.03)video.play().catch(()=>{});
  playWithHolds(video.currentTime);
 }
 async function startMicrophone(replacedId=null){
  if(working||microphone)return;
  if(!videoFile||!Number.isFinite(video.duration)){message.textContent='Choose a Trainer video first.';return;}
  stopPreview();audio.pause();
  const start=outputTime(video.currentTime);
  // The native Android recorder avoids WebView's "Could not start audio source" failure.
  if(android?.startNarrationMicrophone){
   try{
    const token=android.startNarrationMicrophone();
    if(token==='permission'){
     message.textContent='Android microphone permission was requested. Allow it, then tap Record from this frame again.';
     return;
    }
    if(token&&token!=='busy'&&token!=='error'&&token!=='unavailable'){
     beginRecording({nativeToken:token,start,replacedId,stopping:false});
     return;
    }
   }catch(error){/* Try the browser recorder if the native source is unavailable. */}
  }
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){
   message.textContent='Microphone capture is unavailable. On Android, install the latest signed Trainer APK and allow microphone access.';
   return;
  }
  let stream;
  try{
   message.textContent='Starting microphone…';
   stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
   if(!dialog.open){stream.getTracks().forEach(t=>t.stop());return;}
   const mimeType=recorderMime(),recorder=new MediaRecorder(stream,mimeType?{mimeType}:undefined);
   const capture={recorder,stream,chunks:[],start,replacedId,stopping:false,pausedAt:0};
   recorder.ondataavailable=e=>{if(e.data?.size)capture.chunks.push(e.data);};
   recorder.onerror=e=>{
    message.textContent='Microphone capture interrupted: '+(e.error?.message||'device error');
   };
   recorder.onstop=()=>{
    const blob=new Blob(capture.chunks,{type:recorder.mimeType||'audio/webm'});
    finishTake(capture,blob);
   };
   recorder.start(250);monitorBrowserMicrophone(capture);
   stream.getAudioTracks().forEach(track=>{
    track.addEventListener('ended',()=>{if(microphone===capture&&!capture.stopping)stopMicrophone();},{once:true});
   });
   beginRecording(capture);
  }catch(error){
   stream?.getTracks().forEach(t=>t.stop());
   microphone=null;recordingControls(false);
   if(error.name==='NotAllowedError'){
    message.textContent='Microphone permission was denied. Enable microphone access in Android App Info or your browser settings, then retry.';
   }else{
    message.textContent='Microphone could not start ('+(error.name||'device error')+'). Close other apps using the microphone, check Android microphone access, and retry. '+error.message;
   }
  }
 }
 function stopMicrophone(){
  if(!microphone||microphone.stopping)return;
  const capture=microphone;capture.stopping=true;
  if(capture.pausedAt){
   const seconds=(performance.now()-capture.pausedAt)/1000;
   if(seconds>.08){shiftTakesAfter(capture.pausedSource,seconds);holds.push({at:capture.pausedSource,seconds});list();}
   capture.pausedAt=0;
  }
  video.pause();stopHoldPlayback();updateRecordingIndicator();
  get('narrationStop').disabled=true;
  message.textContent='Finishing microphone take…';
  if(capture.nativeToken){
   (async()=>{
    const token=capture.nativeToken;
    try{
     const size=Number(android.stopNarrationMicrophone(token));
     if(!Number.isFinite(size)||size<=1024)throw Error('Android did not capture enough audio. Speak for at least one second.');
     const parts=[];
     for(let offset=0;offset<size;){
      const encoded=android.readNarrationMicrophoneChunk(token,offset,262144);
      if(!encoded)throw Error('Could not retrieve the recorded audio from Android.');
      const binary=atob(encoded),bytes=new Uint8Array(binary.length);
      for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
      parts.push(bytes);offset+=bytes.length;
      await new Promise(resolve=>setTimeout(resolve,0));
     }
     await finishTake(capture,new Blob(parts,{type:'audio/mp4'}));
    }catch(error){
     microphone=null;recordingControls(false);
     message.textContent='Microphone take failed: '+error.message;
    }finally{try{android.clearNarrationMicrophone(token);}catch(error){}}
   })();
  }else if(capture.recorder?.state!=='inactive')capture.recorder.stop();
 }
 get('narrationRecord').onclick=()=>startMicrophone();
 get('narrationStop').onclick=stopMicrophone;
 get('narrationSourceMode').onchange=updateAudioPreview;
 async function selectedAudio(){
  const mode=get('narrationSourceMode').value;
  if(mode==='import'&&!audioFile||mode==='record'&&!segments.length)return null;
  const context=new AudioContext({sampleRate:48000});
  try{
   if(mode==='import')return {context,buffer:await context.decodeAudioData(await audioFile.arrayBuffer())};
   const decoded=new Map(),rate=48000;
   let channels=1,length=0;
   for(const segment of segments){
    if(!decoded.has(segment.blob))decoded.set(segment.blob,await context.decodeAudioData(await segment.blob.arrayBuffer()));
    channels=Math.max(channels,Math.min(2,decoded.get(segment.blob).numberOfChannels));
    length=Math.max(length,segment.start+segment.length);
   }
   if(length>7200)throw Error('Narration exceeds the two-hour limit.');
   const offline=new OfflineAudioContext(channels,Math.max(1,Math.ceil(length*rate)),rate);
   for(const segment of segments){
    const source=offline.createBufferSource();source.buffer=decoded.get(segment.blob);source.connect(offline.destination);
    source.start(segment.start,segment.trim,segment.length);
   }
   return {context,buffer:await offline.startRendering()};
  }catch(error){await context.close();throw error;}
 }
 function waveFile(buffer,offset=0){
  const rate=buffer.sampleRate,channels=Math.min(2,buffer.numberOfChannels);
  const lead=Math.round(offset*rate),samples=lead+buffer.length,bytes=new ArrayBuffer(44+samples*channels*2);
  const view=new DataView(bytes),str=(at,s)=>{for(let i=0;i<s.length;i++)view.setUint8(at+i,s.charCodeAt(i));};
  str(0,'RIFF');view.setUint32(4,bytes.byteLength-8,true);str(8,'WAVE');str(12,'fmt ');
  view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,channels,true);
  view.setUint32(24,rate,true);view.setUint32(28,rate*channels*2,true);
  view.setUint16(32,channels*2,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,samples*channels*2,true);
  let position=44;
  for(let i=0;i<samples;i++)for(let channel=0;channel<channels;channel++){
   const sample=i<lead?0:Math.max(-1,Math.min(1,buffer.getChannelData(channel)[i-lead]));
   view.setInt16(position,sample<0?sample*32768:sample*32767,true);position+=2;
  }
  return new Blob([bytes],{type:'audio/wav'});
 }
 function busy(value){
  working=value;
  for(const el of dialog.querySelectorAll('input,button,select'))el.disabled=value;
  get('narrationCancel').hidden=!value;get('narrationCancel').disabled=false;
  get('narrationStop').disabled=value||!microphone;
  get('narrationRecord').disabled=value||!!microphone;
  video.controls=!value;list();showTakes();
 }
 function event(target,name){
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>finish(Error('The video did not become ready.')),15000);
   const done=()=>finish(),error=()=>finish(Error('Could not read the video.'));
   function finish(err){clearTimeout(timer);target.removeEventListener(name,done);target.removeEventListener('error',error);err?reject(err):resolve();}
   target.addEventListener(name,done,{once:true});target.addEventListener('error',error,{once:true});
  });
 }
 const safeName=value=>String(value||'Narration 01').replace(/[\\/:*?"<>|\x00-\x1f]/g,'-').replace(/^[. ]+|[. ]+$/g,'').slice(0,75)||'Narration 01';
 function download(name,blob){
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),15000);
 }
 function dataUrl(blob){
  return new Promise((resolve,reject)=>{
   const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);
  });
 }
 async function saveAudioBlob(stem,blob,extension,mime){
  const name=safeName(stem),fileName=name+'.'+extension;
  if(android){
   if(!android.beginNarrationAudio)throw Error('Install the updated Android APK to save audio recordings.');
   const token=android.beginNarrationAudio(name,extension,mime);
   if(!token)throw Error('Could not create the audio file.');
   try{
    for(let offset=0;offset<blob.size;offset+=768*1024){
     const encoded=await dataUrl(blob.slice(offset,offset+768*1024));
     if(!android.appendNarrationAudio(token,encoded.slice(encoded.indexOf(',')+1)))throw Error('Could not write audio.');
    }
    const saved=android.finishNarrationAudio(token);
    if(!saved)throw Error('Could not finish the audio file.');
    return saved;
   }catch(error){android.abortNarrationAudio(token);throw error;}
  }
  if(audioFolder){
   let candidate=name,count=2,handle;
   while(true){
    try{await audioFolder.getFileHandle(candidate+'.'+extension);candidate=name+' ('+(count++)+')';}
    catch(error){if(error.name!=='NotFoundError')throw error;break;}
   }
   handle=await audioFolder.getFileHandle(candidate+'.'+extension,{create:true});
   const stream=await handle.createWritable();
   try{await stream.write(blob);await stream.close();}catch(error){await stream.abort().catch(()=>{});throw error;}
   return audioFolder.name+'/'+candidate+'.'+extension;
  }
  download(fileName,blob);return 'Downloads/'+fileName;
 }
 get('narrationAudioFolder').onclick=async()=>{
  if(android){
   if(android.openNarrationAudioFolder)android.openNarrationAudioFolder();
   else message.textContent='Install the updated Android APK. Audio files are in Download/Billiards Trainer/Audio.';
  }else if(window.showDirectoryPicker){
   try{audioFolder=await window.showDirectoryPicker({id:'billiards-narration-audio',startIn:'downloads',mode:'readwrite'});message.textContent='Audio saves to '+audioFolder.name+'.';}
   catch(error){if(error.name!=='AbortError')message.textContent='Could not open the audio folder.';}
  }else message.textContent='Audio files save to your browser Downloads. Open Downloads in your browser or file manager.';
 };
 get('narrationOpenExportFolder').onclick=()=>{
  if(android?.openTrainerClipsFolder){android.openTrainerClipsFolder();return;}
  if(window.showDirectoryPicker&&window.BilliardsShotRecorder?.openClipsFolder)
   window.BilliardsShotRecorder.openClipsFolder();
  else message.textContent='Your exported MP4 is in browser Downloads. Open the Downloads list in your browser or file manager.';
 };
 get('narrationSaveAudio').onclick=async()=>{
  if(working||microphone)return;
  try{
   let blob,extension,mime;
   if(get('narrationSourceMode').value==='import'&&audioFile){
    blob=audioFile;extension=/\.([a-z0-9]{2,5})$/i.exec(audioFile.name)?.[1].toLowerCase()||'m4a';
    mime=audioFile.type||({'wav':'audio/wav','mp3':'audio/mpeg','m4a':'audio/mp4','webm':'audio/webm','flac':'audio/flac'}[extension]||'audio/mp4');
   }else{
    const chosen=await selectedAudio();
    if(!chosen)throw Error('Import an audio file or record a microphone take first.');
    try{blob=waveFile(chosen.buffer,Number(get('narrationOffset').value)||0);}finally{await chosen.context.close();}
    extension='wav';mime='audio/wav';
   }
   message.textContent='Audio saved to '+await saveAudioBlob(get('narrationName').value+' - Audio',blob,extension,mime)+'.';
  }catch(error){message.textContent=error.message;}
 };
 function stopPreview(){
  if(!previewing)return;
  previewing=false;stopHoldPlayback();video.pause();audio.pause();
  get('narrationPreviewTogether').textContent='Preview with video';updateAudioPreview();
 }
 get('narrationPreviewTogether').onclick=async()=>{
  if(previewing){stopPreview();return;}
  if(working||microphone)return;
  if(!videoFile){message.textContent='Choose a Trainer video first.';return;}
  let chosen;
  try{
   chosen=await selectedAudio();
   if(!chosen)throw Error('Upload audio or record a microphone take first.');
   const offset=Number(get('narrationOffset').value);
   if(!Number.isFinite(offset)||offset<0||offset>3600)throw Error('Choose a valid audio start time.');
   const wav=waveFile(chosen.buffer,offset);
   setAudioPreview(wav);
   video.pause();video.currentTime=0;audio.currentTime=0;
   previewing=true;get('narrationPreviewTogether').textContent='Stop preview';
   await Promise.all([video.play(),audio.play()]);playWithHolds(0);
  }catch(error){stopPreview();message.textContent='Could not preview narration: '+error.message;}
  finally{await chosen?.context.close();}
 };
 audio.addEventListener('ended',()=>{if(video.ended)stopPreview();});
 video.addEventListener('ended',()=>{if(!audio.src||audio.ended)stopPreview();});
 function draftsDb(){
  return new Promise((resolve,reject)=>{
   const request=indexedDB.open('BilliardsTrainerNarrationDrafts',1);
   request.onupgradeneeded=()=>request.result.createObjectStore('projects',{keyPath:'name'});
   request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });
 }
 async function draftOperation(mode,value){
  const db=await draftsDb();
  try{
   return await new Promise((resolve,reject)=>{
    const tx=db.transaction('projects',mode==='write'?'readwrite':'readonly'),store=tx.objectStore('projects');
    const request=mode==='keys'?store.getAllKeys():mode==='read'?store.get(value):store.put(value);
    tx.oncomplete=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);tx.onerror=()=>reject(tx.error);
   });
  }finally{db.close();}
 }
 async function updateDraftList(){
  try{
   const keys=await draftOperation('keys'),menu=get('narrationDrafts'),selected=menu.value;
   menu.replaceChildren(new Option('Saved projects',''));
   for(const key of keys)menu.append(new Option(key,key));
   if(keys.includes(selected))menu.value=selected;
  }catch(error){message.textContent='Project storage is unavailable on this device.';}
 }
 get('narrationSaveDraft').onclick=async()=>{
  if(working||microphone)return;
  if(!videoFile){message.textContent='Choose a Trainer video before saving a project.';return;}
  try{
   const name=safeName(get('narrationName').value);
   await draftOperation('write',{name,videoFile,audioFile,segments,holds,offset:get('narrationOffset').value,hold:get('narrationHold').value,source:get('narrationSourceMode').value});
   await updateDraftList();get('narrationDrafts').value=name;
   message.textContent='Editable project saved on this device: '+name+'. The source video was not modified.';
  }catch(error){message.textContent='Could not save project. Check available device storage: '+error.message;}
 };
 get('narrationLoadDraft').onclick=async()=>{
  if(working||microphone)return;
  const name=get('narrationDrafts').value;
  if(!name){message.textContent='Select a saved project first.';return;}
  try{
   const item=await draftOperation('read',name);
   if(!item?.videoFile)throw Error('Saved project is missing its video.');
   stopPreview();setVideo(item.videoFile);setImported(item.audioFile||null);
   segments=item.segments||[];holds=item.holds||[];
   get('narrationOffset').value=item.offset||'0';get('narrationHold').value=item.hold||'2';
   get('narrationName').value=name;get('narrationSourceMode').value=item.source||'import';
   list();showTakes();updateAudioPreview();
   message.textContent='Editable project loaded. Original video and audio files were not changed.';
  }catch(error){message.textContent='Could not open project: '+error.message;}
 };
 open.onclick=()=>{dialog.showModal();updateDraftList();};
 get('narrationClose').onclick=()=>{stopMicrophone();stopPreview();video.pause();audio.pause();dialog.close();};
 dialog.addEventListener('cancel',e=>{if(working)e.preventDefault();});
 get('narrationCancel').onclick=()=>{canceled=true;message.textContent='Canceling export…';};
 get('narrationVideoFile').onchange=()=>{
  get('narrationOpenExportFolder').hidden=true;
  const file=get('narrationVideoFile').files[0];if(!file)return;
  stopPreview();setVideo(file,true);get('narrationName').value=file.name.replace(/\.[^.]+$/,'')+' - Narrated';
  message.textContent='Use the preview controls to choose a frame for a pause.';
 };
 get('narrationAudioFile').onchange=()=>{
  setImported(get('narrationAudioFile').files[0]||null);
  if(audioFile)get('narrationSourceMode').value='import';
  updateAudioPreview();
 };
 get('narrationAddHold').onclick=()=>{
  const seconds=Number(get('narrationHold').value);
  if(!Number.isFinite(video.duration)||!Number.isFinite(seconds)||seconds<=0||seconds>300){message.textContent='Choose a video and a hold of 0.1 to 300 seconds.';return;}
  video.pause();shiftTakesAfter(video.currentTime,seconds);holds.push({at:video.currentTime,seconds});list();showTakes();
 };
 showTakes();
 function sourceTime(time,duration,pauses){
  let added=0;
  for(const pause of pauses){
   const start=pause.at+added;
   if(time<start)return Math.min(duration,time-added);
   if(time<start+pause.seconds)return Math.min(duration,pause.at);
   added+=pause.seconds;
  }
  return Math.min(duration,Math.max(0,time-added));
 }
 async function exportVideo(){
  if(working)return;
  if(microphone){message.textContent='Stop microphone recording before exporting.';return;}
  if(!videoUrl){message.textContent='Choose a Trainer video first.';return;}
  const offset=Number(get('narrationOffset').value);
  if(!Number.isFinite(offset)||offset<0||offset>3600){message.textContent='Choose an audio start time from 0 to 3600 seconds.';return;}
  stopPreview();busy(true);canceled=false;video.pause();audio.pause();
  get('narrationOpenExportFolder').hidden=true;
  let encoder,audioEncoder,context,failed;
  const check=()=>{if(canceled)throw Error('Export canceled.');if(failed)throw failed;};
  try{
   if(!window.VideoEncoder||!window.VideoFrame)throw Error('Video export is unavailable in this browser.');
   const videoConfig={codec:'avc1.42002a',width:1920,height:1080,framerate:30,bitrate:8000000,latencyMode:'realtime',avc:{format:'avc'}};
   if(!(await VideoEncoder.isConfigSupported(videoConfig)).supported)throw Error('1080p H.264 export is unavailable on this device.');
   if(video.readyState<2)await event(video,'loadeddata');
   const duration=video.duration;
   if(!Number.isFinite(duration)||duration<=0)throw Error('Could not read the video duration.');
   const pauses=holds.map(p=>({at:Math.min(duration,p.at),seconds:p.seconds})).sort((a,b)=>a.at-b.at);
   let buffer,audioConfig;
   const selected=await selectedAudio();
   if(selected){
    context=selected.context;buffer=selected.buffer;
    if(!window.AudioEncoder||!window.AudioData)throw Error('Audio export is unavailable on this device.');
    for(const codec of ['mp4a.40.2','opus']){
     const config={codec,sampleRate:buffer.sampleRate,numberOfChannels:Math.min(2,buffer.numberOfChannels),bitrate:128000};
     if((await AudioEncoder.isConfigSupported(config)).supported){audioConfig=config;break;}
    }
    if(!audioConfig)throw Error('This device cannot encode the narration audio.');
   }
   const {Muxer,ArrayBufferTarget}=await import('./vendor/mp4-muxer-5.2.2/mp4-muxer.mjs');
   const target=new ArrayBufferTarget();
   const muxer=new Muxer({target,video:{codec:'avc',width:1920,height:1080,frameRate:30},
    ...(buffer?{audio:{codec:audioConfig.codec==='opus'?'opus':'aac',sampleRate:buffer.sampleRate,numberOfChannels:audioConfig.numberOfChannels}}:{}),
    fastStart:'in-memory',firstTimestampBehavior:'offset'});
   encoder=new VideoEncoder({output:(chunk,meta)=>{try{muxer.addVideoChunk(chunk,meta);}catch(e){failed=e;}},error:e=>{failed=e;}});
   encoder.configure(videoConfig);
   if(!video.requestVideoFrameCallback)
    throw Error('This browser cannot verify decoded video frames. Update Chrome or Android System WebView to export smooth video.');
   const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=1080;
   const c=canvas.getContext('2d',{alpha:false}),fit=Math.min(1920/video.videoWidth,1080/video.videoHeight);
   const total=Math.max(duration+pauses.reduce((n,p)=>n+p.seconds,0),buffer?offset+buffer.duration:0);
   const frames=Math.ceil(total*30);
   // seeked moves the media timeline; it does not guarantee a new compositor picture.
   async function seekPresentedFrame(source){
    const target=Math.min(Math.max(0,duration-.002),source+.002);
    if(Math.abs(video.currentTime-target)<.00001)return;
    let callbackId=0,timer=0,settled=false;
    const displayed=new Promise((resolve,reject)=>{
     const finish=error=>{
      if(settled)return;
      settled=true;clearTimeout(timer);
      if(callbackId)video.cancelVideoFrameCallback(callbackId);
      error?reject(error):resolve();
     };
     const onFrame=(_now,meta)=>{
      if(meta.mediaTime+0.018>=source){finish();return;}
      callbackId=video.requestVideoFrameCallback(onFrame);
     };
     callbackId=video.requestVideoFrameCallback(onFrame);
     timer=setTimeout(()=>finish(Error('A video frame did not decode at '+source.toFixed(2)+'s. The source was not exported with repeated frames.')),3000);
    });
    try{
     const ready=event(video,'seeked');
     video.currentTime=target;
     await ready;await displayed;
    }catch(error){
     // Prevent an unhandled callback rejection when seeking fails.
     await displayed.catch(()=>{});
     throw error;
    }
   }
   let previous=-1;
   for(let index=0;index<frames;index++){
    check();
    const source=Math.min(Math.max(0,duration-1/30),sourceTime(index/30,duration,pauses));
    if(previous<0||Math.abs(source-previous)>0.00001){
     await seekPresentedFrame(source);
     c.fillStyle='#101820';c.fillRect(0,0,1920,1080);
     c.drawImage(video,(1920-video.videoWidth*fit)/2,(1080-video.videoHeight*fit)/2,video.videoWidth*fit,video.videoHeight*fit);
     previous=source;
    }
    if(encoder.encodeQueueSize>=6)await encoder.flush();
    check();
    const timestamp=Math.round(index*1000000/30),frame=new VideoFrame(canvas,{timestamp,duration:Math.round((index+1)*1000000/30)-timestamp});
    try{encoder.encode(frame,{keyFrame:index%30===0});}finally{frame.close();}
    if(index%10===0){message.textContent='Exporting video · '+Math.floor(index/frames*90)+'%';await new Promise(r=>setTimeout(r,0));}
   }
   await encoder.flush();check();encoder.close();
   if(buffer){
    message.textContent='Adding narration…';
    audioEncoder=new AudioEncoder({output:(chunk,meta)=>{try{muxer.addAudioChunk(chunk,meta);}catch(e){failed=e;}},error:e=>{failed=e;}});
    audioEncoder.configure(audioConfig);
    const channels=audioConfig.numberOfChannels,rate=buffer.sampleRate;
    // Include silence before an offset so both tracks begin at timestamp zero.
    const sampleCount=Math.ceil((offset+buffer.duration)*rate),start=Math.round(offset*rate);
    for(let position=0;position<sampleCount;position+=1024){
     check();
     const count=Math.min(1024,sampleCount-position),samples=new Float32Array(count*channels);
     for(let channel=0;channel<channels;channel++){
      const input=buffer.getChannelData(channel);
      for(let i=0;i<count;i++){const sample=position+i-start;if(sample>=0&&sample<input.length)samples[channel*count+i]=input[sample];}
     }
     while(audioEncoder.encodeQueueSize>=6){check();await new Promise(r=>setTimeout(r,0));}
     const data=new AudioData({format:'f32-planar',sampleRate:rate,numberOfFrames:count,numberOfChannels:channels,timestamp:Math.round(position*1000000/rate),data:samples});
     try{audioEncoder.encode(data);}finally{data.close();}
     if(position%10240===0)await new Promise(r=>setTimeout(r,0));
    }
    await audioEncoder.flush();check();audioEncoder.close();
   }
   muxer.finalize();check();
   message.textContent='Saving narrated video…';
   await window.BilliardsShotRecorder.saveNarrated(get('narrationName').value,new Blob([target.buffer],{type:'video/mp4'}));
   message.textContent='Narrated video saved. Use Open exported video folder to locate the MP4.';
   get('narrationOpenExportFolder').hidden=false;
  }catch(error){message.textContent=error.message;console.error(error);}
  finally{
   if(encoder&&encoder.state!=='closed')encoder.close();
   if(audioEncoder&&audioEncoder.state!=='closed')audioEncoder.close();
   await context?.close();busy(false);
  }
 }
 get('narrationExport').onclick=exportVideo;
})();
