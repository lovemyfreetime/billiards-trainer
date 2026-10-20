/* Local, recorded Chase narration only. Speaker buttons never select a substitute voice. */
(function(){'use strict';
const catalog=window.BilliardsPlayNarrationCatalog||{},speaker='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor"/><path d="M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',pause='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zm6 0h4v14h-4z" fill="currentColor"/></svg>';
let audio=null,ids=[],index=0,active=null,generation=0;
function status(parent,message){let node=parent.querySelector('.play-narration-status');if(!node){node=document.createElement('p');node.className='play-narration-status';node.setAttribute('role','status');parent.append(node);}node.textContent=message;}
function update(){document.querySelectorAll('[data-play-narration]').forEach(b=>{const playing=b===active&&audio&&!audio.paused;b.innerHTML=playing?pause:speaker;b.setAttribute('aria-pressed',String(!!playing));b.setAttribute('aria-label',(playing?'Pause ':'Play ')+(b.dataset.narrationLabel||'Chase narration'));b.title=(playing?'Pause ':'Play ')+(b.dataset.narrationLabel||'Chase narration');});}
function stop(){generation++;if(audio){audio.pause();audio.removeAttribute('src');audio.load();}audio=null;active=null;ids=[];index=0;update();}
async function playNext(token){
 if(token!==generation||!active)return;
 const record=catalog[ids[index]];if(!record||record.recordingStatus!=='recorded'){status(active.parentElement,'This Chase recording is not installed yet.');stop();return;}
 const current=audio||(audio=new Audio());current.src=new URL(record.src,document.baseURI).href;current.preload='auto';current.onplay=current.onpause=update;
 current.onended=()=>{if(token!==generation)return;if(++index<ids.length)playNext(token);else stop();};
 current.onerror=()=>{if(token!==generation)return;status(active.parentElement,'Could not load this Chase recording. Try again.');stop();};
 try{await current.play();if(token!==generation){current.pause();return;}update();}catch(error){if(token!==generation)return;if(error.name==='AbortError'&&current.paused){update();return;}status(active.parentElement,'Tap the speaker to try playing Chase narration again.');stop();}
}
function attach(parent,keys,options={}){
 const idsForButton=Array.isArray(keys)?keys:[keys],b=document.createElement('button');b.type='button';b.className='play-speaker'+(options.className?' '+options.className:'');b.dataset.playNarration=idsForButton.join(',');b.dataset.narrationLabel=options.label||'Chase narration';b.innerHTML=speaker;b.setAttribute('aria-label','Play '+b.dataset.narrationLabel);b.setAttribute('aria-pressed','false');b.title='Play '+b.dataset.narrationLabel;
 b.onclick=async event=>{event?.stopPropagation();if(active===b&&audio){if(audio.paused){try{await audio.play();}catch{status(parent,'Tap again to retry narration.');}}else audio.pause();update();return;}
 stop();window.BilliardsAudio?.cancel();window.BilliardsLocalSession?.cancelSpeech();active=b;ids=idsForButton;index=0;await playNext(generation);};parent.append(b);return b;
}
function backdrop(dialog,close){let outside=false;const isOutside=e=>{const r=dialog.getBoundingClientRect();return e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom);};dialog.addEventListener('pointerdown',e=>outside=isOutside(e));dialog.addEventListener('click',e=>{if(outside&&isOutside(e)){outside=false;stop();close();}outside=false;});dialog.addEventListener('close',stop);dialog.addEventListener('cancel',stop);}
window.BilliardsNarration={attach,stop,backdrop,speaking:()=>!!audio&&!audio.paused};
window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});document.addEventListener('billiards-native-pause',stop);
})();
