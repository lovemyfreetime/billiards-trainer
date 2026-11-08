/* Capture the Trainer's own simulated frames and exact pre-shot setups. */
(() => {
 'use strict';
 const tools=document.getElementById('trainerClipTools'),android=window.BilliardsAndroid;
 if(!tools||(android&&!android.saveTrainerClip))return;
 if(!android&&(!window.VideoEncoder||!window.VideoFrame))return;
 const byId=id=>document.getElementById(id),bridge=()=>window.billiardsTourBridge;
 const arm=byId('trainerClipArm'),folderButton=byId('trainerClipFolder'),pairButton=byId('trainerClipPair');
 const sessionButton=byId('trainerClipSession'),replayButton=byId('trainerClipReplay');
 const sessionView=byId('trainerSessionView');
 const nameInput=byId('trainerClipName'),setupButton=byId('trainerClipSetup');
 const status=byId('trainerClipStatus'),sessionStatus=byId('trainerClipSessionStatus');
 const width=1920,height=1080,fps=30;
 const config={codec:'avc1.42002a',width,height,framerate:fps,bitrate:8000000,latencyMode:'realtime',avc:{format:'avc'}};
 const sessionKey='billiardsRecordingSessionV1';
 let muxerLibrary,folder,job,armed=false,latestSetup,collecting=false,shots=[];
 let preparing=false;
 tools.hidden=false;
 function update(){
  const busy=!!job||preparing;
  for(const button of [arm,pairButton,folderButton,sessionButton])button.disabled=busy;
  nameInput.disabled=busy;sessionView.disabled=busy;byId("trainerNarrateVideo").disabled=busy;
  replayButton.disabled=busy||collecting||!shots.length;
  sessionButton.textContent=collecting?'End session':'Start session';
  sessionButton.setAttribute('aria-pressed',String(collecting));
  sessionStatus.textContent=shots.length+' shot'+(shots.length===1?'':'s')+' saved'+(collecting?' · session running':'.');
 }
 function persist(){
  try{localStorage.setItem(sessionKey,JSON.stringify({shots,collecting}));}
  catch(error){status.textContent='Session is in memory. Device storage could not keep a recovery copy.';}
  update();
 }
 try{
  const saved=JSON.parse(localStorage.getItem(sessionKey)||'null');
  if(Array.isArray(saved?.shots)&&saved.shots.every(s=>s?.capture?.state&&s?.file)){
   shots=saved.shots;collecting=!!saved.collecting;
  }
 }catch(error){console.warn('Could not restore recording session',error);}
 const snapshot=()=>({capture:{state:bridge().capture().state},file:bridge().exportFile(),view:window.BilliardsClipView.captureView()});
 window.addEventListener('billiards:shot-start',()=>{
  if(collecting&&(!job||job.kind==='single'||job.kind==='pair'&&job.index===0)){
   shots.push(snapshot());persist();
  }
 });
 window.addEventListener('billiards:undo-complete',()=>{
  if(collecting&&!job&&shots.length){shots.pop();persist();}
 });
 sessionButton.onclick=()=>{
  if(bridge().snapshot().busy){status.textContent='Wait for the shot to finish.';return;}
  if(collecting)collecting=false;
  else{
   if(shots.length&&!confirm('Start a new recording session and replace the saved session?'))return;
   shots=[];collecting=true;
  }
  persist();
 };
 function download(name,blob){
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=name;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
 }
 function dataUrl(blob){
  return new Promise((resolve,reject)=>{
   const reader=new FileReader();reader.onload=()=>resolve(reader.result);
   reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);
  });
 }
 function safeName(value){
  return value.replace(/\.(mp4|session\.billiards\.json)$/i,'')
   .replace(/[\x00-\x1f<>:"/\\|?*]/g,'-').replace(/^[. ]+|[. ]+$/g,'').slice(0,80)||'Shot 01';
 }
 function nextName(value){
  const m=/(\d+)$/.exec(value);
  return m?value.slice(0,m.index)+String(BigInt(m[1])+1n).padStart(m[1].length,'0'):value+' 02';
 }
 async function unusedName(value,kind){
  if(!folder)return value;
  const names=new Set();
  for await(const name of folder.keys())names.add(name.toLowerCase());
  const exists=name=>['.mp4','.session.billiards.json'].some(ext=>names.has((name+ext).toLowerCase()));
  while(exists(value)||(kind==='pair'&&(exists(value+' - Current')||exists(value+' - Stroke'))))value=nextName(value);
  return value;
 }
 folderButton.onclick=async()=>{
  if(android){
   if(android.openTrainerClipsFolder)android.openTrainerClipsFolder();
   else status.textContent='Clips are in Downloads. Install the latest Android app to open their folder.';
   return;
  }
  if(!window.showDirectoryPicker){status.textContent='Clips save to your browser’s Downloads. This browser cannot open a folder from a webpage.';return;}
  preparing=true;update();
  try{
   folder=await showDirectoryPicker({id:'billiards-shot-clips',startIn:'downloads',mode:'readwrite'});
   status.textContent='Clips and setups save to '+folder.name+'.';
  }catch(error){if(error.name!=='AbortError')status.textContent='Could not open the folder. Clips can still use Downloads.';}
  finally{preparing=false;update();}
 };
 setupButton.onclick=()=>{if(latestSetup)download(latestSetup.name,latestSetup.blob);};
 async function write(name,blob){
  const file=await folder.getFileHandle(name,{create:true}),stream=await file.createWritable();
  try{await stream.write(blob);await stream.close();}
  catch(error){await stream.abort().catch(()=>{});throw error;}
 }
 async function save(stem,clip,file){
  const setup=file?new Blob([JSON.stringify(file,null,2)],{type:'application/json'}):null;
  latestSetup=setup?{name:stem+'.session.billiards.json',blob:setup}:null;
  setupButton.hidden=!setup;
  if(android){
   if(!setup&&!android.supportsNarratedVideo)throw Error('Install the updated Android app to save narrated videos.');
   if(!android.beginTrainerRecording)throw Error('Install the updated Android app for named and session recordings.');
   const token=android.beginTrainerRecording(stem,setup?await setup.text():null);
   if(!token)throw Error(setup?'Could not create the recording files.':'Install the updated Android app to save narrated videos.');
   try{
    for(let offset=0;offset<clip.size;offset+=768*1024){
     const encoded=await dataUrl(clip.slice(offset,offset+768*1024));
     if(!android.appendTrainerRecording(token,encoded.slice(encoded.indexOf(',')+1)))throw Error('Could not write the video.');
    }
    const saved=android.finishTrainerRecording(token);
    if(!saved)throw Error('Could not finish saving the video.');
    setupButton.hidden=true;status.textContent='Saved '+saved;
   }catch(error){android.abortTrainerRecording(token);throw error;}
  }else if(folder){
   await write(stem+'.mp4',clip);
   if(setup)await write(latestSetup.name,setup);
   setupButton.hidden=true;status.textContent='Saved '+stem+'.mp4'+(setup?' and its setup':'')+' to '+folder.name+'.';
  }else{
   download(stem+'.mp4',clip);if(setup)download(latestSetup.name,setup);
   status.textContent='Saved '+stem+'.mp4. Check Downloads'+(setup?' for the video and setup. Use Save setup if needed.':'.');
  }
 }
 async function settleView(){await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}
 async function start(kind){
  if(job||preparing||bridge().snapshot().busy){status.textContent='Wait for the current shot or recording to finish.';return;}
  if(android&&!android.beginTrainerRecording){status.textContent='Install the latest Android app for these recording controls.';return;}
  preparing=true;update();
  const original=bridge().capture(),originalView=window.BilliardsClipView.captureView();
  try{
   if(!window.VideoEncoder||!window.VideoFrame||!(await VideoEncoder.isConfigSupported(config)).supported)
    throw Error('1080p H.264 recording is unavailable on this device.');
   muxerLibrary??=await import('./vendor/mp4-muxer-5.2.2/mp4-muxer.mjs');
   if(bridge().snapshot().busy)throw Error('Wait for the shot to finish.');
   const stem=await unusedName(safeName(nameInput.value.trim()||nameInput.placeholder),kind);
   const entries=kind==='session'?shots.slice():[snapshot()];
   if(!entries.length)throw Error('Start and end a session before recording it.');
   job={kind,index:0,entries,original,originalView,stem,framing:kind==='pair'?'current':kind==='session'?sessionView.value:window.BilliardsClipView.mode};
   if(kind==='session'){
    bridge().restore(entries[0].capture);
    await window.BilliardsClipView.restoreView(entries[0].view||originalView);
   }
   window.BilliardsClipView.prepare(job.framing);
   await settleView();
   preparing=false;armed=true;update();
   byId('animate').click();
   if(armed)throw Error('No executable shot is available.');
  }catch(error){
   armed=false;job=null;preparing=false;update();
   status.textContent=error.message;console.error(error);
  }
 }
 arm.onclick=()=>start('single');pairButton.onclick=()=>start('pair');replayButton.onclick=()=>start('session');
 function begin(){
  if(!armed||!job)return null;
  armed=false;
  const current=job;
  let encoder,failed=false,frameCount=0,hold;
  function fail(message,error){
   if(failed)return;failed=true;
   if(encoder&&encoder.state!=='closed')encoder.close();
   current.failed=true;job=null;armed=false;update();status.textContent=message;
   if(error)console.error(error);
  }
  try{
   let view=window.BilliardsClipView.create(current.framing,width,height);
   // A rack uses a single encoder and monotonically increasing timestamps.
   if(current.encoder){encoder=current.encoder;frameCount=current.frameCount;}
   else{
    current.target=new muxerLibrary.ArrayBufferTarget();
    current.muxer=new muxerLibrary.Muxer({target:current.target,video:{codec:'avc',width,height,frameRate:fps},fastStart:'in-memory'});
    encoder=new VideoEncoder({
     output:(chunk,metadata)=>{try{current.muxer.addVideoChunk(chunk,metadata);}catch(error){fail('Could not build the MP4.',error);}},
     error:error=>fail('Video encoding failed. The shot can still finish.',error)
    });
    encoder.configure(config);current.encoder=encoder;
   }
   function encode(source){
    const timestamp=Math.round(frameCount*1000000/fps);
    const image=new VideoFrame(source,{timestamp,duration:Math.round((frameCount+1)*1000000/fps)-timestamp});
    try{encoder.encode(image,{keyFrame:frameCount%fps===0});frameCount++;}
    finally{image.close();}
   }
   async function encodeHold(image,count){
    try{
     for(let i=0;i<count&&!failed;i++){
      if(encoder.encodeQueueSize>=6)await encoder.flush();
      if(!failed)encode(image);
     }
    }catch(error){fail('Could not encode the still frame.',error);}
    finally{image.close();hold=null;}
   }
   status.textContent=current.kind==='session'?'Recording session · shot '+(current.index+1)+' of '+current.entries.length:'Recording '+current.framing+'…';
   return {
    ready:()=>failed||(!hold&&encoder.encodeQueueSize<6),
    frame(count=1){
     if(failed)return;
     try{
      view.paint();
      if(count===1)encode(view.canvas);
      else hold=encodeHold(new VideoFrame(view.canvas,{timestamp:0}),count);
     }catch(error){fail(error.message+' The shot can still finish.',error);}
    },
    cancel:()=>fail('Recording canceled before the shot finished.'),
    async finish(){
     try{
      await hold;if(failed||current.failed)return;
      await encoder.flush();if(failed||current.failed)return;
      current.frameCount=frameCount;
      if(current.kind==='session'&&current.index+1<current.entries.length){
       current.index++;
       bridge().restore(current.entries[current.index].capture);
       await window.BilliardsClipView.restoreView(current.entries[current.index].view||current.originalView);
       window.BilliardsClipView.prepare(current.framing);
       await settleView();armed=true;byId('animate').click();
       if(armed)throw Error('No executable shot at session position '+(current.index+1));
       return;
      }
      encoder.close();current.muxer.finalize();
      const file=JSON.parse(JSON.stringify(current.entries[0].file));
      if(current.kind==='session')file.recordingShots=current.entries.map(s=>({...s.file,recordingView:s.view||current.originalView}));
      const suffix=current.kind==='pair'?(current.index===0?' - Current':' - Stroke'):'';
      file.name=current.stem+suffix;if(file.layout)file.layout.name=current.stem+suffix;
      await save(current.stem+suffix,new Blob([current.target.buffer],{type:'video/mp4'}),file);
      if(current.kind==='pair'&&current.index===0){
       byId('undoShot').click();
       current.index=1;current.framing='stroke';current.encoder=null;current.frameCount=0;
       window.BilliardsClipView.prepare('stroke');
       await settleView();armed=true;byId('animate').click();
       if(armed)throw Error('Could not replay the shot for Table + Stroke.');
       return;
      }
      nameInput.value=nextName(current.stem);
      if(current.kind==='session'){bridge().restore(current.original);await window.BilliardsClipView.restoreView(current.originalView);}
      job=null;update();
     }catch(error){
      if(current.kind==='session'){bridge().restore(current.original);await window.BilliardsClipView.restoreView(current.originalView);}
      fail(error.message,error);
     }
    }
   };
  }catch(error){fail('Could not start recording. '+error.message,error);return null;}
 }
 window.BilliardsShotRecorder={begin,
  async saveNarrated(stem,blob){if(job||preparing)throw Error('Wait for recording to finish.');await save(await unusedName(safeName(stem),'single'),blob,null);}
 };
 update();
})();
