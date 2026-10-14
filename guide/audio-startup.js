/* Native output warmup protects the first word; original narration is never processed. */
(function(global){
'use strict';
const script=global.document?.currentScript?.src;
const warmupUrl=script?new URL('./audio/output-warmup.wav',script).href:null;
function create(audio){
 let generation=0,starting=false,cancelWarmup=null;
 const warmup=warmupUrl&&global.Audio?new global.Audio(warmupUrl):null;
 if(warmup){warmup.preload='auto';warmup.dataset.audioWarmup='1';}
 function pause(){generation++;starting=false;cancelWarmup?.();warmup?.pause();audio.pause();}
 function prepare(){
  if(!warmup)return Promise.resolve();
  return new Promise(resolve=>{
   let timer,done=false;
   function finish(){if(done)return;done=true;clearTimeout(timer);warmup.removeEventListener('ended',finish);warmup.removeEventListener('error',finish);if(cancelWarmup===finish)cancelWarmup=null;warmup.pause();resolve();}
   cancelWarmup=finish;warmup.currentTime=0;warmup.addEventListener('ended',finish);warmup.addEventListener('error',finish);timer=setTimeout(finish,1500);
   warmup.play().catch(finish);
  });
 }
 async function play(){
  cancelWarmup?.();const token=++generation;starting=true;
  try{if(warmup&&(audio.currentTime<.05||audio.ended))await prepare();if(token!==generation)return;await audio.play();}finally{if(token===generation)starting=false;}
 }
 return {play,pause,release:pause,destroy:pause,get starting(){return starting}};
}
global.BilliardsAudioStartup={create};
})(window);
