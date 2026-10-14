/* Native media playback: preserve the uploaded recording and browser volume path. */
(function(global){
'use strict';
function create(audio){
 let generation=0,starting=false;
 function pause(){generation++;starting=false;audio.pause();}
 async function play(){
  const token=++generation;starting=true;
  try{await audio.play();}finally{if(token===generation)starting=false;}
 }
 return {play,pause,release:pause,destroy:pause,get starting(){return starting}};
}
global.BilliardsAudioStartup={create};
})(window);
