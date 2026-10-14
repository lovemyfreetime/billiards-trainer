/* Prepare the output before advancing narration; keep it open between tracks. */
(function(global){
'use strict';
function create(audio){
 let context=null,source=null,keepAlive=null,generation=0,starting=false,releaseTimer=null,warmUntil=0;
 function prepare(){
  if(context)return context;
  const AudioContext=global.AudioContext||global.webkitAudioContext;
  if(!AudioContext)return null;
  try{
   context=new AudioContext();
   source=context.createMediaElementSource(audio);source.connect(context.destination);
   const buffer=context.createBuffer(1,context.sampleRate,context.sampleRate);
   keepAlive=context.createBufferSource();keepAlive.buffer=buffer;keepAlive.loop=true;
   keepAlive.connect(context.destination);keepAlive.start();
   return context;
  }catch(_){context?.close().catch(()=>{});context=null;return null;}
 }
 function pause(){generation++;starting=false;audio.pause();clearTimeout(releaseTimer);
  releaseTimer=setTimeout(()=>{if(audio.paused&&!starting)context?.suspend().catch(()=>{});},30000);
 }
 async function play(){
  const token=++generation;starting=true;clearTimeout(releaseTimer);
  // Resume inside the click handler, before any await, to retain user activation.
  const existed=!!context,output=prepare(),wasRunning=existed&&output?.state==='running';
  try{
   if(output){await output.resume();
    // Warm only a newly opened output. The narration clock remains at zero.
    if(!wasRunning)warmUntil=Date.now()+1000;
    const delay=Math.max(0,warmUntil-Date.now());
    if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
   }
   if(token!==generation)return;
   await audio.play();
  }finally{if(token===generation)starting=false;}
 }
 function release(){pause();clearTimeout(releaseTimer);context?.suspend().catch(()=>{});}
 function destroy(){generation++;starting=false;clearTimeout(releaseTimer);audio.pause();keepAlive?.stop();source?.disconnect();context?.close().catch(()=>{});}
 return {play,pause,release,destroy,get starting(){return starting}};
}
global.BilliardsAudioStartup={create};
})(window);
