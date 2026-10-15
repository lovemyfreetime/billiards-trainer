/* Practice, between-lesson countdown and first-tap handoff in the compact Guide. */
(function(global){
'use strict';
async function mount(guide){
 const bridge=global.billiardsTourBridge,host=document.getElementById('bt-guide-pool-root');
 if(!bridge||!guide||!host)return null;
 const response=await fetch('./guide/get-started-tour.json?v=chase-20261015');
 if(!response.ok)throw Error('Get Started lessons unavailable');
 const {steps,transition,completion}=await response.json(),seconds=transition?.seconds||10;
 let index=0,original=null,profile=null,checkpoint=null,loading=false,practicing=false,phase='listening',deadline=0,timer=null,advanceTimer=null,voiceTimer=null,epoch=0;
 const announcement=new Audio();announcement.preload='auto';announcement.volume=.8;announcement.dataset.getStartedTransition='1';
 const voice=global.BilliardsAudioStartup.create(announcement);
 const footer=document.createElement('div');footer.className='btg-practice-next';footer.hidden=true;
 footer.innerHTML='<div class="btg-countdown"><span>Next lesson in</span><strong role="timer" aria-live="off">10</strong><span>Tap the table to try this shot.</span></div><button type="button" class="btg-next-lesson">Next Lesson ▶</button><p class="btg-last-lesson">Final lesson</p>';
 function placeControls(){const slot=host.querySelector('[data-guide-slot="practice"]');if(slot&&footer.parentNode!==slot)slot.append(footer);}
 placeControls();const counter=footer.querySelector('[role="timer"]'),nextButton=footer.querySelector('button');
 const active=()=>{const s=guide.getState();return s.enabled&&s.category==='start'};
 const hasNext=()=>index+1<steps.length;
 const topicId=i=>global.billiardsPoolAudioMap?.topics.filter(t=>t.category==='start'&&!t.explorerOnly)[i]?.id;
 function attention(target){for(const id of ['btg-pool-guide','btg-pool-explore'])document.getElementById(id)?.classList.toggle('btg-tour-attention',id===target);}
 function clearAttention(){attention(null);}
 function progress(topic,time,playing){
  if(!active()||index!==steps.length-1||topic?.id!==topicId(index)||!playing){clearAttention();return;}
  const id=time>=2&&time<6.8?'btg-pool-guide':time>=6.8&&time<11.8?'btg-pool-explore':null;
  attention(id);
 }
 announcement.addEventListener('timeupdate',()=>{if(active()&&!hasNext()&&phase==='announcing'&&!announcement.paused){const t=announcement.currentTime;attention(t>=5.6&&t<8.4?'btg-pool-guide':t>=8.4&&t<11.8?'btg-pool-explore':null)}});
 announcement.addEventListener('pause',clearAttention);
 announcement.addEventListener('ended',clearAttention);
 function cancel(){clearAttention();epoch++;clearInterval(timer);clearTimeout(advanceTimer);clearTimeout(voiceTimer);timer=advanceTimer=voiceTimer=null;deadline=0;voice.pause();}
 function render(){
  footer.hidden=!active()||phase==='listening'||(!hasNext()&&phase==='announcing');footer.dataset.phase=phase;placeControls();
  const counting=phase==='countdown'||phase==='announcing';footer.querySelector('.btg-countdown').hidden=!counting;nextButton.hidden=counting||!hasNext();footer.querySelector('.btg-last-lesson').hidden=counting||hasNext();
  const remaining=deadline?Math.max(0,Math.ceil((deadline-performance.now())/1000)):seconds;
  if(counter.textContent!==String(remaining))counter.textContent=remaining;
  const label=hasNext()?'Next lesson in ':'Get Started closes in ';counter.setAttribute('aria-label',label+remaining+' seconds');counter.title=hasNext()?transition.text:completion?.text||label+remaining+' seconds';footer.querySelector('.btg-countdown>span').textContent=label;nextButton.disabled=bridge.snapshot().busy;
 }
 function hold(pause=true){cancel();practicing=true;phase='practice';if(pause)guide.pause();render();setTimeout(render,0);}
 function listening(){cancel();practicing=false;phase='listening';render();}
 function sync(state){
  if(!state.enabled||state.category!=='start'){if(timer||voiceTimer||advanceTimer||phase!=='listening')cancel();phase='listening';}
  else if(!state.autoplay&&(phase==='countdown'||phase==='announcing'))hold(false);
  render();
 }
 function next(){if(!active()||!hasNext()||bridge.snapshot().busy)return false;cancel();return guide.nextLesson();}
 function finish(){if(!active())return;cancel();phase='complete';guide.setEnabled(false);render();}
 nextButton.addEventListener('click',next);
 function beginCountdown(token){
  if(token!==epoch||!active()||phase==='countdown')return;if(!hasNext()){finish();return;}clearTimeout(voiceTimer);voiceTimer=null;phase='countdown';deadline=performance.now()+(hasNext()?seconds:(completion?.seconds||seconds))*1000;render();
  timer=setInterval(()=>{
   if(token!==epoch||!active())return;
   render();if(performance.now()>=deadline){clearInterval(timer);timer=null;advanceTimer=setTimeout(()=>{if(token===epoch){if(hasNext())next();else finish();}},100);}
  },100);
 }
 function ended(topic,state){
  if(topic?.category!=='start'||!active())return false;
  cancel();practicing=false;
  if(!state.autoplay){hold(false);return true;}
  const token=epoch;
  const prompt=hasNext()?transition:completion;
  if(prompt?.recordingStatus==='recorded'&&prompt.audio){
   phase='announcing';announcement.src=prompt.audio;announcement.load();
   const onPlaying=()=>{announcement.removeEventListener('playing',onPlaying);if(phase==='announcing'){clearTimeout(voiceTimer);voiceTimer=null;if(hasNext())beginCountdown(token);else announcement.addEventListener('ended',()=>{if(token===epoch&&active()&&phase==='announcing')finish()},{once:true})}};
   announcement.addEventListener('playing',onPlaying,{once:true});
   voiceTimer=setTimeout(()=>{if(token===epoch&&phase==='announcing'){voice.pause();announcement.removeEventListener('playing',onPlaying);beginCountdown(token)}},3000);
   voice.play().catch(()=>{announcement.removeEventListener('playing',onPlaying);beginCountdown(token)});render();
  }else beginCountdown(token);
  return true;
 }
 function select(topic){
  if(topic?.category!=='start')return true;
  const nextIndex=steps.findIndex(s=>topic.title.replace(/^\d+\.\s*/, '')===s.title);
  if(nextIndex<0)return true;if(bridge.snapshot().busy)return false;
  cancel();practicing=false;phase='listening';
  if(!original){original=bridge.capture();profile=original.state;}
  index=nextIndex;loading=true;bridge.apply(steps[index],profile);checkpoint=bridge.capture();loading=false;render();return true;
 }
 function start(){if(active()){guide.setEnabled(false);return;}if(bridge.snapshot().busy)return;original=bridge.capture();profile=original.state;guide.openCategory('start');}
 function tryShot(){hold();if(document.body.classList.contains('phone-controls-open'))document.getElementById('phoneControls')?.click();}
 function retry(){if(!checkpoint||bridge.snapshot().busy)return false;hold();bridge.restore(checkpoint);render();return true;}
 function setups(){return steps.map((s,i)=>({title:(i+1)+'. '+s.title,url:s.layout,audio:s.audio,id:topicId(i)}));}
 async function load(url){const i=steps.findIndex(s=>s.layout===url);if(i<0)throw Error('Practice layout unavailable');if(bridge.snapshot().busy)throw Error('Wait for the shot to finish before loading a layout.');guide.selectTopic(topicId(i));guide.tryShot();}
 // Consume the whole first gesture, including compatibility mouse/click events.
 // Its sole job is handing control to the player; a second gesture may aim/drag.
 let blocked=null,clearBlocked=null;
 const stop=event=>{if(event.cancelable)event.preventDefault();event.stopImmediatePropagation();};
 function handoff(event){
  if((event.type==='pointerdown'||(!global.PointerEvent&&['mousedown','touchstart'].includes(event.type)))&&blocked?.ended){clearTimeout(clearBlocked);blocked=null;}
  if(blocked){
   if(event.type.startsWith('pointer')&&event.pointerId!==blocked.id)return;
   stop(event);
   if(['pointerup','pointercancel','touchend','mouseup'].includes(event.type)){blocked.ended=true;clearBlocked=setTimeout(()=>{blocked=null},1200);}
   if(event.type==='click'){clearTimeout(clearBlocked);blocked=null;}
   return;
  }
  if(!active()||practicing||!event.target.closest?.('#canvas'))return;
  if(!['pointerdown','mousedown','touchstart'].includes(event.type))return;
  blocked={id:event.pointerId,ended:false};stop(event);guide.tryShot();
 }
 for(const name of ['pointerdown','pointermove','pointerup','pointercancel','mousedown','mousemove','mouseup','touchstart','touchmove','touchend','click'])global.addEventListener(name,handoff,{capture:true,passive:false});
 document.addEventListener('pointerdown',event=>{
  if(!active())return;
  if(event.target.closest('#bt-guide-pool-root')){if((timer||voiceTimer||advanceTimer)&&event.target.closest('select,[data-action="Read"],[data-action="More"],[data-action="Practice"]'))hold();return;}
  if(event.target.closest('#tipCanvas,#tipCanvas2,#phoneTip1,#phoneTip2,#stageWrap input,#phoneActions button,#panel input,#panel button,#pocketTray')){hold();setTimeout(render,0);}
 },true);
 document.addEventListener('keydown',event=>{if(active()&&!event.target.closest('#bt-guide-pool-root')&&['Enter',' '].includes(event.key))hold();},true);
 document.addEventListener('input',event=>{if(active()&&!event.target.closest('#bt-guide-pool-root'))hold();},true);
 document.addEventListener('click',event=>{if(active()&&event.target.closest('#resetLayoutQuick,#resetLayout')){event.preventDefault();event.stopImmediatePropagation();retry();}},true);
 for(const event of ['billiards:shot-complete','billiards:undo-complete'])global.addEventListener(event,()=>{if(active()&&!loading)render();});
 return {progress,placeControls,start,select,tryShot,retry,setups,load,listening,sync,ended,hold,next,pause(){hold()},exit(){guide.setEnabled(false);if(original)bridge.restore(original);},getState:()=>({active:active(),index,stepId:steps[index].id,loading,practicing,phase,remaining:deadline?Math.max(0,Math.ceil((deadline-performance.now())/1000)):null}),steps,transition};
}
global.BilliardsGetStartedTour={mount};
})(window);
