/* Free-moving camera clips, separate from the simulated Record Shot path. */
(() => {
 'use strict';
 const activation=document.getElementById('trainerCameraToggle');
 const shots=window.BilliardsShotRecorder,views=window.BilliardsClipView;
 if(!activation||!shots||!views)return;
 if(!window.VideoEncoder||!window.VideoFrame){
  activation.disabled=true;activation.title='This device does not support H.264 video recording.';return;
 }
 const width=1920,height=1080,fps=30;
 const config={codec:'avc1.42002a',width,height,framerate:fps,bitrate:8000000,latencyMode:'realtime',avc:{format:'avc'}};
 const bar=document.createElement('div');bar.id='trainerCameraBar';bar.hidden=true;
 bar.setAttribute('role','group');bar.setAttribute('aria-label','Free Camera Recording');
 bar.innerHTML='<button id="trainerCameraRecord" type="button" title="Record camera footage" aria-label="Record camera footage">●</button>'+
  '<button id="trainerCameraPause" type="button" title="Pause recording" aria-label="Pause recording" disabled>Ⅱ</button>'+
  '<button id="trainerCameraStop" type="button" title="Stop and save" aria-label="Stop and save" disabled>■</button>'+
  '<output id="trainerCameraTimer">00:00</output><span class="cameraDivider"></span>'+
  '<button data-camera-mode="full" title="Full table" aria-label="Full table">Table</button>'+
  '<button data-camera-mode="current" title="Current view" aria-label="Current view">View</button>'+
  '<button data-camera-mode="stroke" title="Table and stroke" aria-label="Table and stroke">Stroke</button>'+
  '<button data-camera-mode="screen" title="Full screen with controls" aria-label="Full screen with controls">Screen</button>'+
  '<button id="trainerCameraClose" type="button" title="Close camera recorder" aria-label="Close camera recorder">×</button>';
 const status=document.createElement('output');status.id='trainerCameraStatus';status.setAttribute('role','status');
 document.body.append(bar,status); // Sibling of #app: never appears in Element Capture.
 const get=id=>bar.querySelector('#'+id),record=get('trainerCameraRecord'),pause=get('trainerCameraPause'),stop=get('trainerCameraStop');
 const timer=get('trainerCameraTimer'),buttons=[...bar.querySelectorAll('[data-camera-mode]')];
 let mode='current',session=null,finishing=false,muxerLibrary;
 const cleanName=value=>(value||'Camera 01').replace(/\.(mp4|session\.billiards\.json)$/i,'')
  .replace(/[\x00-\x1f<>:"/\\|?*]/g,'-').replace(/^[. ]+|[. ]+$/g,'').slice(0,80)||'Camera 01';
 const nextName=value=>{const m=/(\d+)$/.exec(value);return m?value.slice(0,m.index)+String(BigInt(m[1])+1n).padStart(m[1].length,'0'):value+' 02';};
 function clock(frames){const sec=Math.floor(frames/fps);return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');}
 function update(){
  const active=!!session,busy=active||finishing;
  bar.dataset.recording=String(active&&!session.paused);
  record.disabled=busy;pause.disabled=!active||finishing;stop.disabled=!active||finishing;
  pause.textContent=active&&session.paused?'▶':'Ⅱ';pause.title=active&&session.paused?'Resume recording':'Pause recording';
  pause.setAttribute('aria-label',pause.title);
  for(const b of buttons){b.setAttribute('aria-pressed',String(b.dataset.cameraMode===mode));b.disabled=finishing;}
  timer.textContent=clock(session?.frames||0);
  activation.setAttribute('aria-pressed',String(!bar.hidden));
  activation.textContent=bar.hidden?'Camera recorder':'Hide camera recorder';
 }
 function show(open){if(!open&&session){status.textContent='Stop and save the clip before closing the recorder.';return;}bar.hidden=!open;if(!open)status.textContent='';update();}
 activation.addEventListener('click',()=>show(bar.hidden));
 get('trainerCameraClose').addEventListener('click',()=>show(false));
 buttons.forEach(button=>button.addEventListener('click',()=>{
  const next=button.dataset.cameraMode;
  if(session&&next==='screen'&&mode!=='screen'){status.textContent='Stop this clip before selecting Full Screen.';return;}
  if(session&&mode==='screen'&&next!=='screen'){status.textContent='Stop this clip before leaving Full Screen.';return;}
  mode=next;
  if(next==='full'||next==='stroke')views.prepare(next);
  if(session){session.modes.add(next);session.painter=views.createLive(next,width,height);}
  status.textContent=next==='screen'?'Full Screen requires choosing this Trainer tab in Chrome’s capture prompt.':
   next==='current'?'Move, rotate, or zoom the table while recording.':'Ready to record '+button.title.toLowerCase()+'.';
  update();
 }));
 async function screenPainter(){
  if(!navigator.mediaDevices?.getDisplayMedia||!window.RestrictionTarget)
   throw Error('Full Screen requires Chrome Element Capture. Other capture modes work without screen permission.');
  // Must be the first awaited operation in the click gesture.
  const stream=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:fps},audio:false,preferCurrentTab:true,selfBrowserSurface:'include'});
  try{
   const track=stream.getVideoTracks()[0];
   if(!track?.restrictTo)throw Error('This browser cannot exclude the recorder from a full-screen capture.');
   const target=await RestrictionTarget.fromElement(document.getElementById('app'));
   await track.restrictTo(target); // Excludes the floating bar, which is a sibling of #app.
   const video=document.createElement('video');video.muted=true;video.playsInline=true;video.srcObject=stream;
   await video.play();
   const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
   const c=canvas.getContext('2d',{alpha:false});
   return {canvas,stream,paint(){
    if(!video.videoWidth)throw Error('Screen capture has no video frames.');
    c.fillStyle='#101820';c.fillRect(0,0,width,height);
    const fit=Math.min(width/video.videoWidth,height/video.videoHeight);
    c.drawImage(video,(width-video.videoWidth*fit)/2,(height-video.videoHeight*fit)/2,video.videoWidth*fit,video.videoHeight*fit);
   }};
  }catch(error){stream.getTracks().forEach(t=>t.stop());throw error;}
 }
 async function start(){
  if(session||finishing)return;
  if(shots.busy||window.billiardsTourBridge?.snapshot().busy){status.textContent='Wait for the current shot or clip to finish.';return;}
  finishing=true;update();
  let painter;
  try{
   if(mode==='full'||mode==='stroke')views.prepare(mode);
   painter=mode==='screen'?await screenPainter():views.createLive(mode,width,height);
   if(!(await VideoEncoder.isConfigSupported(config)).supported)throw Error('1080p H.264 recording is unavailable on this device.');
   muxerLibrary??=await import('./vendor/mp4-muxer-5.2.2/mp4-muxer.mjs');
   const capture=window.billiardsTourBridge.capture(),file=window.billiardsTourBridge.exportFile(),initialView=views.captureView();
   const target=new muxerLibrary.ArrayBufferTarget();
   const muxer=new muxerLibrary.Muxer({target,video:{codec:'avc',width,height,frameRate:fps},fastStart:'in-memory'});
   const state={target,muxer,painter,capture,file,initialView,modes:new Set([mode]),frames:0,paused:false,
    started:performance.now(),pausedTotal:0,pauseAt:0,handle:0,failed:null};
   const encoder=new VideoEncoder({
    output:(chunk,metadata)=>{try{muxer.addVideoChunk(chunk,metadata);}catch(error){state.failed=error;status.textContent='MP4 encoding failed: '+error.message;}},
    error:error=>{state.failed=error;status.textContent='Camera encoder failed: '+error.message;}
   });
   encoder.configure(config);state.encoder=encoder;
   session=state;finishing=false;status.textContent='Recording camera footage…';update();
   window.dispatchEvent(new Event('billiards:camera-recording-change'));
   const loop=now=>{
    if(session!==state||state.paused)return;
    if(state.failed){void finish();return;}
    const targetFrame=Math.floor(Math.max(0,now-state.started-state.pausedTotal)*fps/1000);
    try{
     if(state.frames<=targetFrame&&state.encoder.encodeQueueSize<7){
      state.painter.paint();
      // Limited frame catch-up keeps the duration accurate after a busy render.
      for(let n=0;n<3&&state.frames<=targetFrame&&state.encoder.encodeQueueSize<7;n++){
       const timestamp=Math.round(state.frames*1000000/fps);
       const frame=new VideoFrame(state.painter.canvas,{timestamp,duration:Math.round((state.frames+1)*1000000/fps)-timestamp});
       try{state.encoder.encode(frame,{keyFrame:state.frames%fps===0});state.frames++;}
       finally{frame.close();}
      }
     }
     timer.textContent=clock(state.frames);
    }catch(error){state.failed=error;status.textContent='Recording error: '+error.message;void finish();return;}
    state.handle=requestAnimationFrame(loop);
   };
   state.resumeLoop=()=>{state.handle=requestAnimationFrame(loop);};
   state.handle=requestAnimationFrame(loop);
  }catch(error){painter?.stream?.getTracks().forEach(t=>t.stop());status.textContent=error.message;console.error(error);finishing=false;update();}
 }
 record.addEventListener('click',()=>void start());
 pause.addEventListener('click',()=>{
  if(!session||finishing)return;
  const state=session;
  if(state.paused){state.pausedTotal+=performance.now()-state.pauseAt;state.paused=false;
   state.resumeLoop?.();
   status.textContent='Recording resumed.';
  }else{state.paused=true;state.pauseAt=performance.now();cancelAnimationFrame(state.handle);status.textContent='Recording paused.';}
  update();
 });
 async function finish(){
  const state=session;if(!state||finishing)return;
  finishing=true;cancelAnimationFrame(state.handle);state.painter.stream?.getTracks().forEach(t=>t.stop());update();
  let savedStem;
  try{
   if(state.failed)throw state.failed;
   if(!state.frames)throw Error('No frames were recorded.');
   await state.encoder.flush();state.encoder.close();state.muxer.finalize();
   const blob=new Blob([state.target.buffer],{type:'video/mp4'});
   const input=document.getElementById('trainerClipName');
   const stem=cleanName(input?.value.trim()||'Camera 01');
   const file=JSON.parse(JSON.stringify(state.file));
   file.recordingCamera={views:[...state.modes],frames:state.frames,frameRate:fps};
   const chosen=await shots.saveCamera(stem,blob,file);
   savedStem=chosen;
   if(input)input.value=nextName(chosen);
   status.textContent='Saved '+chosen+'.mp4 separately'+(shots.collecting?' · available for session footage.':'.');
   if(shots.collecting&&shots.addCameraClip)
    await shots.addCameraClip({blob,stem:chosen,capture:state.capture,view:state.initialView,
     file:state.file,modes:[...state.modes],frames:state.frames});
  }catch(error){status.textContent=savedStem
   ?'Saved '+savedStem+'.mp4 separately, but could not add it to the session: '+error.message
   :'Could not save camera clip: '+error.message;console.error(error);}
  finally{
   if(state.encoder.state!=='closed')state.encoder.close();
   if(session===state)session=null;finishing=false;update();
   window.dispatchEvent(new Event('billiards:camera-recording-change'));
  }
 }
 stop.addEventListener('click',()=>void finish());
 window.BilliardsCameraRecorder={get recording(){return !!session;},get paused(){return !!session?.paused;}};
 update();
})();
