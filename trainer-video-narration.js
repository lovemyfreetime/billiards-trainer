/* Add an imported narration track and held frames to an existing Trainer video. */
(() => {
 'use strict';
 const open=document.getElementById('trainerNarrateVideo');
 if(!open)return;
 const dialog=document.createElement('dialog');
 dialog.id='trainerNarrationDialog';
 dialog.style.cssText='max-width:900px;width:92vw;max-height:90vh;overflow:auto;background:#1b2933;color:#eee;border:1px solid #668694;border-radius:12px;padding:18px';
 dialog.innerHTML=`<h2>Narrate a video</h2>
 <p>Choose a saved Trainer video and an audio file, including an exported Chase narration. Add pauses at points that need more explanation.</p>
 <label>Trainer video <input id="narrationVideoFile" type="file" accept="video/*"></label>
 <video id="narrationPreview" controls playsinline muted style="display:block;width:100%;max-height:40vh;background:#080d13;margin:12px 0"></video>
 <label>Narration audio <input id="narrationAudioFile" type="file" accept="audio/*"></label>
 <audio id="narrationAudioPreview" controls style="display:block;width:100%;margin:10px 0"></audio>
 <div class="row"><label>Audio starts at <input id="narrationOffset" type="number" min="0" max="3600" step="0.1" value="0" style="width:75px"> seconds</label></div>
 <div class="row"><label>Hold this frame for <input id="narrationHold" type="number" min="0.1" max="300" step="0.5" value="2" style="width:75px"> seconds</label>
 <button id="narrationAddHold" type="button">Add pause here</button></div>
 <ul id="narrationHolds"></ul>
 <p class="hint">Pause the preview at the frame you want to hold, then add the pause. Narration continues during holds. If the audio runs longer, the final frame stays visible until it finishes.</p>
 <label>Output name <input id="narrationName" type="text" maxlength="80" value="Narrated lesson 01"></label>
 <div class="row" style="margin-top:12px"><button id="narrationExport" type="button">Export narrated video</button><button id="narrationCancel" type="button" hidden>Cancel export</button><button id="narrationClose" type="button">Close</button></div>
 <p id="narrationStatus" role="status"></p>`;
 document.body.append(dialog);
 // Preview playback keys belong to the editor, not the Trainer's shot shortcuts.
 dialog.addEventListener('keydown',event=>event.stopPropagation());
 const get=id=>dialog.querySelector('#'+id);
 const video=get('narrationPreview'),audio=get('narrationAudioPreview'),message=get('narrationStatus');
 let videoUrl,audioUrl,audioFile,holds=[],working=false,canceled=false;
 const cleanUrl=url=>{if(url)URL.revokeObjectURL(url);};
 function list(){
  const list=get('narrationHolds');list.replaceChildren();
  holds.sort((a,b)=>a.at-b.at);
  holds.forEach((hold,index)=>{
   const li=document.createElement('li'),remove=document.createElement('button');
   li.append(hold.at.toFixed(2)+'s · hold '+hold.seconds+'s ');
   remove.textContent='Remove';remove.type='button';remove.disabled=working;
   remove.onclick=()=>{holds.splice(index,1);list();};li.append(remove);list.append(li);
  });
 }
 function busy(value){
  working=value;
  for(const el of dialog.querySelectorAll('input,button'))el.disabled=value;
  get('narrationCancel').hidden=!value;get('narrationCancel').disabled=false;
  video.controls=!value;list();
 }
 function event(target,name){
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>finish(Error('The video did not become ready.')),15000);
   const done=()=>finish(),error=()=>finish(Error('Could not read the video.'));
   function finish(err){clearTimeout(timer);target.removeEventListener(name,done);target.removeEventListener('error',error);err?reject(err):resolve();}
   target.addEventListener(name,done,{once:true});target.addEventListener('error',error,{once:true});
  });
 }
 open.onclick=()=>{dialog.showModal();};
 get('narrationClose').onclick=()=>{video.pause();audio.pause();dialog.close();};
 dialog.addEventListener('cancel',e=>{if(working)e.preventDefault();});
 get('narrationCancel').onclick=()=>{canceled=true;message.textContent='Canceling export…';};
 get('narrationVideoFile').onchange=()=>{
  const file=get('narrationVideoFile').files[0];if(!file)return;
  cleanUrl(videoUrl);videoUrl=URL.createObjectURL(file);video.src=videoUrl;
  holds=[];list();get('narrationName').value=file.name.replace(/\.[^.]+$/,'')+' - Narrated';
  message.textContent='Use the preview controls to choose a frame for a pause.';
 };
 get('narrationAudioFile').onchange=()=>{
  audioFile=get('narrationAudioFile').files[0]||null;
  cleanUrl(audioUrl);audioUrl=audioFile?URL.createObjectURL(audioFile):null;
  if(audioUrl)audio.src=audioUrl;else audio.removeAttribute('src');
 };
 get('narrationAddHold').onclick=()=>{
  const seconds=Number(get('narrationHold').value);
  if(!Number.isFinite(video.duration)||!Number.isFinite(seconds)||seconds<=0||seconds>300){message.textContent='Choose a video and a hold of 0.1 to 300 seconds.';return;}
  video.pause();holds.push({at:video.currentTime,seconds});list();
 };
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
  if(!videoUrl){message.textContent='Choose a Trainer video first.';return;}
  const offset=Number(get('narrationOffset').value);
  if(!Number.isFinite(offset)||offset<0||offset>3600){message.textContent='Choose an audio start time from 0 to 3600 seconds.';return;}
  busy(true);canceled=false;video.pause();audio.pause();
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
   if(audioFile){
    if(!window.AudioEncoder||!window.AudioData)throw Error('Audio export is unavailable on this device.');
    context=new AudioContext({sampleRate:48000});
    buffer=await context.decodeAudioData(await audioFile.arrayBuffer());
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
   const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=1080;
   const c=canvas.getContext('2d',{alpha:false}),fit=Math.min(1920/video.videoWidth,1080/video.videoHeight);
   const total=Math.max(duration+pauses.reduce((n,p)=>n+p.seconds,0),buffer?offset+buffer.duration:0);
   const frames=Math.ceil(total*30);
   let previous=-1;
   for(let index=0;index<frames;index++){
    check();
    const source=Math.min(Math.max(0,duration-1/30),sourceTime(index/30,duration,pauses));
    if(previous<0||Math.abs(source-previous)>0.00001){
     if(Math.abs(video.currentTime-source)>0.00001){const ready=event(video,'seeked');video.currentTime=source;await ready;}
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
   message.textContent='Narrated video saved. Check your Clips folder or Downloads.';
  }catch(error){message.textContent=error.message;console.error(error);}
  finally{
   if(encoder&&encoder.state!=='closed')encoder.close();
   if(audioEncoder&&audioEncoder.state!=='closed')audioEncoder.close();
   await context?.close();busy(false);
  }
 }
 get('narrationExport').onclick=exportVideo;
})();
