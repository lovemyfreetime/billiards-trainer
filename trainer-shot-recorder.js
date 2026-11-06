/* Record one simulated shot at a time, with fixed output timestamps. */
(() => {
 'use strict';
 const tools=document.getElementById('trainerClipTools');
 if(!tools||window.BilliardsAndroid||!window.VideoEncoder||!window.VideoFrame)return;
 const arm=document.getElementById('trainerClipArm'),folderButton=document.getElementById('trainerClipFolder');
 const setupButton=document.getElementById('trainerClipSetup'),status=document.getElementById('trainerClipStatus');
 const width=1920,height=1080,fps=30;
 const config={codec:'avc1.42002a',width,height,framerate:fps,bitrate:8000000,latencyMode:'realtime',avc:{format:'avc'}};
 let muxerLibrary,folder,mode,number=1,latestSetup,working=false;
 tools.hidden=false;
 folderButton.hidden=!window.showDirectoryPicker;
 function setWorking(value){
  working=value;
  arm.disabled=value;
  folderButton.disabled=value||!!mode;
 }
 function setArmed(value){
  arm.setAttribute('aria-pressed',String(value));
  arm.textContent=value?'Cancel recording':'Record shot';
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
   let next=1;
   for await(const name of selected.keys()){
    const match=/^(\d+)\.(?:mp4|session\.billiards\.json)$/i.exec(name);
    if(match)next=Math.max(next,Number(match[1])+1);
   }
   folder=selected;
   number=next;
   status.textContent='Clips and setups will save to '+folder.name+'.';
  }catch(error){
   if(error.name!=='AbortError')status.textContent='Could not open the clip folder. Clips can still use Downloads.';
  }finally{setWorking(false);}
 };
 setupButton.onclick=()=>{if(latestSetup)download(latestSetup.name,latestSetup.blob);};
 arm.onclick=async()=>{
  if(mode){
   mode=null;
   setArmed(false);
   setWorking(false);
   status.textContent='Recording canceled.';
   return;
  }
  if(window.billiardsTourBridge.snapshot().busy){
   status.textContent='Wait for the shot to finish before arming a clip.';
   return;
  }
  setWorking(true);
  try{
   if(!(await VideoEncoder.isConfigSupported(config)).supported){
    status.textContent='1080p H.264 recording is unavailable on this device.';
    return;
   }
   muxerLibrary??=await import('./vendor/mp4-muxer-5.2.2/mp4-muxer.mjs');
   if(window.billiardsTourBridge.snapshot().busy){
    status.textContent='Wait for the shot to finish before arming a clip.';
    return;
   }
   mode=window.BilliardsClipView.mode;
   window.BilliardsClipView.prepare(mode);
   setArmed(true);
   status.textContent='Ready. Execute Shot to record the next clip.';
  }catch(error){
   mode=null;
   status.textContent='Could not prepare video recording.';
   console.error(error);
  }finally{setWorking(false);}
 };
 function begin(){
  if(!mode||working)return null;
  const framing=mode;
  mode=null;
  setArmed(false);
  setWorking(true);
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
   const setup=new Blob([JSON.stringify(window.billiardsTourBridge.exportFile(),null,2)],{type:'application/json'});
   encoder=new VideoEncoder({
    output:(chunk,metadata)=>{try{muxer.addVideoChunk(chunk,metadata);}catch(error){fail('Could not build the MP4.',error);}},
    error:error=>fail('Video encoding failed. The shot can still finish.',error)
   });
   encoder.configure(config);
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
      const stem=String(number++).padStart(2,'0');
      const filename=stem+'.mp4',clip=new Blob([target.buffer],{type:'video/mp4'});
      latestSetup={name:stem+'.session.billiards.json',blob:setup};
      setupButton.hidden=false;
      if(folder){
       try{await write(filename,clip);}
       catch(error){
        download(filename,clip);
        status.textContent='Folder save failed. Check Downloads for '+filename+' and use Save setup.';
        return;
       }
       try{await write(latestSetup.name,setup);}
       catch(error){
        status.textContent='Saved '+filename+' to '+folder.name+'. Use Save setup to download its setup.';
        return;
       }
       setupButton.hidden=true;
       status.textContent='Saved '+filename+' and its setup to '+folder.name+'.';
      }else{
       download(filename,clip);
       status.textContent='Check Downloads for '+filename+'. Use Save setup for its starting layout.';
      }
     }catch(error){fail('Could not finish saving the clip.',error);}
     finally{setWorking(false);}
    }
   };
  }catch(error){fail('Could not start video recording.',error);return null;}
 }
 window.BilliardsShotRecorder={begin};
})();
