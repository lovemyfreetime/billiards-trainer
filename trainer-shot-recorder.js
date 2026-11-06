/* Record one simulated shot at a time, with fixed output timestamps. */
(() => {
 'use strict';
 const tools=document.getElementById('trainerClipTools');
 if(!tools||window.BilliardsAndroid||!window.VideoEncoder||!window.VideoFrame)return;
 const arm=document.getElementById('trainerClipArm'),folderButton=document.getElementById('trainerClipFolder');
 const setupButton=document.getElementById('trainerClipSetup'),status=document.getElementById('trainerClipStatus');
 const nameInput=document.getElementById('trainerClipName'),defaultName='Shot 01';
 const width=1920,height=1080,fps=30;
 const config={codec:'avc1.42002a',width,height,framerate:fps,bitrate:8000000,latencyMode:'realtime',avc:{format:'avc'}};
 let muxerLibrary,folder,pending,latestSetup,working=false;
 nameInput.value='';
 tools.hidden=false;
 folderButton.hidden=!window.showDirectoryPicker;
 function setWorking(value){
  working=value;
  arm.disabled=value;
  folderButton.disabled=value;
  nameInput.disabled=value;
 }
 function clipName(){
  const name=nameInput.value.trim().replace(/(?:\.mp4|\.session\.billiards\.json)$/i,'')
   .replace(/[\x00-\x1f<>:"/\\|?*]/g,'-').replace(/^[. ]+|[. ]+$/g,'');
  return name?(/\d$/.test(name)?name:name+' 01'):defaultName;
 }
 function nextName(name){
  const match=/^(.*?)(\d+)$/.exec(name);
  if(!match)return name+' 01';
  return match[1]+String(BigInt(match[2])+1n).padStart(match[2].length,'0');
 }
 async function availableName(name){
  if(!folder)return name;
  const existing=new Set();
  for await(const file of folder.keys())existing.add(file.toLowerCase());
  while(existing.has((name+'.mp4').toLowerCase())||existing.has((name+'.session.billiards.json').toLowerCase())){
   name=nextName(name);
  }
  return name;
 }
 function download(name,blob){
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;
  link.download=name;
  link.click();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
 }
 async function write(name,blob){
  const file=await folder.getFileHandle(name,{create:true}),stream=await file.createWritable();
  try{await stream.write(blob);await stream.close();}
  catch(error){await stream.abort().catch(()=>{});throw error;}
 }
 folderButton.onclick=async()=>{
  setWorking(true);
  try{
   const selected=await window.showDirectoryPicker({id:'billiards-shot-clips',startIn:'downloads',mode:'readwrite'});
   folder=selected;
   status.textContent='Clips and setups will save to '+folder.name+'.';
  }catch(error){
   if(error.name!=='AbortError')status.textContent='Could not open the clip folder. Clips can still use Downloads.';
  }finally{setWorking(false);}
 };
 setupButton.onclick=()=>{if(latestSetup)download(latestSetup.name,latestSetup.blob);};
 arm.onclick=async()=>{
  if(working||window.billiardsTourBridge.snapshot().busy){
   status.textContent='Wait for the current shot to finish before recording.';
   return;
  }
  setWorking(true);
  let request;
  try{
   if(!(await VideoEncoder.isConfigSupported(config)).supported){
    status.textContent='1080p H.264 recording is unavailable on this device.';
    return;
   }
   muxerLibrary??=await import('./vendor/mp4-muxer-5.2.2/mp4-muxer.mjs');
   const framing=window.BilliardsClipView.mode;
   window.BilliardsClipView.prepare(framing);
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   if(window.billiardsTourBridge.snapshot().busy){
    status.textContent='Wait for the current shot to finish before recording.';
    return;
   }
   request=pending={framing,name:await availableName(clipName()),started:false};
   document.getElementById('animate').click();
   if(pending)status.textContent='Set up a shot before recording.';
  }catch(error){
   status.textContent='Could not prepare video recording.';
   console.error(error);
  }finally{
   pending=null;
   if(!request?.started)setWorking(false);
  }
 };
 function begin(){
  if(!pending)return null;
  const request=pending,{framing,name}=request;
  pending=null;
  let encoder,failed=false,frameCount=0;
  function fail(message,error){
   if(failed)return;
   failed=true;
   if(encoder&&encoder.state!=='closed')encoder.close();
   setWorking(false);
   status.textContent=message;
   if(error)console.error(error);
  }
  try{
   const view=window.BilliardsClipView.create(framing,width,height);
   const target=new muxerLibrary.ArrayBufferTarget();
   const muxer=new muxerLibrary.Muxer({target,video:{codec:'avc',width,height,frameRate:fps},fastStart:'in-memory'});
   const file=window.billiardsTourBridge.exportFile();
   file.name=file.layout.name=name;
   const setup=new Blob([JSON.stringify(file,null,2)],{type:'application/json'});
   encoder=new VideoEncoder({
    output:(chunk,metadata)=>{try{muxer.addVideoChunk(chunk,metadata);}catch(error){fail('Could not build the MP4.',error);}},
    error:error=>fail('Video encoding failed. The shot can still finish.',error)
   });
   encoder.configure(config);
   request.started=true;
   status.textContent='Recording shot…';
   return {
    ready:()=>failed||encoder.encodeQueueSize<6,
    frame(){
     if(failed)return;
     let image;
     try{
      view.paint();
      const timestamp=Math.round(frameCount*1000000/fps);
      image=new VideoFrame(view.canvas,{timestamp,duration:Math.round((frameCount+1)*1000000/fps)-timestamp});
      encoder.encode(image,{keyFrame:frameCount%fps===0});
      frameCount++;
     }catch(error){fail(error.message+' The shot can still finish.',error);}
     finally{image?.close();}
    },
    cancel:()=>fail('Recording canceled before the shot finished.'),
    async finish(){
     if(failed)return;
     try{
      await encoder.flush();
      if(failed)return;
      encoder.close();
      muxer.finalize();
      const filename=name+'.mp4',clip=new Blob([target.buffer],{type:'video/mp4'});
      latestSetup={name:name+'.session.billiards.json',blob:setup};
      nameInput.value=nextName(name);
      setupButton.hidden=false;
      if(folder){
       try{await write(filename,clip);}
       catch(error){
        download(filename,clip);
        download(latestSetup.name,setup);
        status.textContent='Folder save failed. Check Downloads for the clip and setup.';
        return;
       }
       try{await write(latestSetup.name,setup);}
       catch(error){
        download(latestSetup.name,setup);
        status.textContent='Saved '+filename+' to '+folder.name+'. Check Downloads for its setup.';
        return;
       }
       setupButton.hidden=true;
       status.textContent='Saved '+filename+' and its setup to '+folder.name+'.';
      }else{
       download(filename,clip);
       download(latestSetup.name,setup);
       status.textContent='Check Downloads for '+filename+' and its setup.';
      }
     }catch(error){fail('Could not finish saving the clip.',error);}
     finally{setWorking(false);}
    }
   };
  }catch(error){fail('Could not start video recording.',error);return null;}
 }
 window.BilliardsShotRecorder={begin};
})();
