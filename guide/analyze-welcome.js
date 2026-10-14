/* Explain the value of image practice before the action-aware walkthrough. */
(function(global){
'use strict';
const text='Welcome to Table Analysis. Turn any real-world layout into a playable practice drill. Snap a photo of your table or grab a screenshot from a pro match, confirm the ball positions, and load it straight onto the cloth. Tap Walkthrough to get started.';
function init(){
 const modal=document.getElementById('photoAnalyzerModal'),panel=document.getElementById('photoAnalyzerWelcome'),button=document.getElementById('photoWelcomePlay');
 if(!modal||!panel||!button||!global.BilliardsAudioStartup)return;
 const audio=new Audio('./guide/audio/analyze-page-welcome.mp3?v=analyze-welcome-v16');audio.preload='auto';audio.volume=.8;audio.dataset.analyzeWelcome='1';
 const output=global.BilliardsAudioStartup.create(audio);let opened=false,active=false;
 document.getElementById('photoWelcomeText').textContent=text;
 function sync(){button.textContent=output.starting||!audio.paused?'Pause welcome':audio.ended?'Replay welcome':'Play welcome';button.setAttribute('aria-label',button.textContent);}
 function stop(){active=false;output.release();audio.currentTime=0;panel.hidden=true;sync();}
 function play(){output.play().catch(()=>{}).finally(sync);sync();}
 function open(){active=true;global.billiardsPoolGuide?.setEnabled(false);global.billiardsAnalyzeGuide?.setExploring(false);panel.hidden=false;document.getElementById('photoWelcomeRead').open=false;audio.currentTime=0;play();}
 button.addEventListener('click',()=>{if(!audio.paused||output.starting)output.pause();else{if(audio.ended)audio.currentTime=0;play();}sync();});
 document.getElementById('photoWelcomeStop').addEventListener('click',stop);
 for(const name of ['playing','pause','ended','error'])audio.addEventListener(name,sync);
 // Stop before another activity can begin its own narration or open a picker.
 modal.addEventListener('click',event=>{if(active&&!event.target.closest('#photoAnalyzerWelcome')&&event.target.closest('button,select,input'))stop();},true);
 modal.addEventListener('change',event=>{if(active&&!event.target.closest('#photoAnalyzerWelcome'))stop();},true);
 function check(){const isOpen=modal.classList.contains('open');if(isOpen&&!opened)open();else if(!isOpen&&opened)stop();opened=isOpen;}
 new MutationObserver(check).observe(modal,{attributes:true,attributeFilter:['class']});check();
 global.billiardsAnalyzeWelcome={stop,text};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window);
