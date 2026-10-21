/* Non-Get-Started lessons: load before narration, then offer a practice window. */
(function(global){
'use strict';
// One felt-anchored prompt shared by the two lesson players.
let promptOwner=null,promptAction=null;
const prompt=document.createElement('button');prompt.type='button';prompt.className='btg-lesson-prompt';prompt.hidden=true;
prompt.innerHTML='<strong>Tap to try this lesson</strong><span>The next lesson will start shortly.</span><span>Tap the screen to play this layout.</span>';
document.getElementById('stageWrap').append(prompt);
function positionPrompt(){const b=global.billiardsTourBridge?.feltBounds();if(!b)return;const compact=b.width<340||b.height<150,gap=compact?4:12,width=compact?Math.min(160,b.width-gap*2):Math.min(270,b.width*.62);prompt.dataset.compact=String(compact);prompt.querySelector('strong').textContent=compact?'Tap to try':'Tap to try this lesson';prompt.querySelector('span').textContent=compact?'Next lesson shortly':'The next lesson will start shortly.';prompt.setAttribute('aria-label','The next lesson will start shortly. Tap the screen to play this layout.');prompt.style.left=(b.right-width-gap)+'px';prompt.style.top=(b.top+gap)+'px';prompt.style.width=width+'px';}
prompt.addEventListener('click',()=>promptAction?.());
global.addEventListener('resize',positionPrompt);new ResizeObserver(positionPrompt).observe(document.getElementById('stageWrap'));
global.BilliardsPracticePrompt={show(owner,action){promptOwner=owner;promptAction=action;prompt.hidden=false;positionPrompt();},hide(owner){if(promptOwner===owner){prompt.hidden=true;promptOwner=null;promptAction=null;}}};
let pending;
function load(){return pending||(pending=fetch('./guide/topic-scenes.json?v=lesson-scenes-v1').then(r=>{if(!r.ok)throw Error('Topic layouts unavailable');return r.json();}));}
async function attach(topics){const data=await load();for(const t of topics){const scene=data.topics[t.id];if(scene){t.scene=scene;t.setups=[scene.setup];if(t.learning)t.learning.setups=t.setups;}}return data;}
function mount(guide,host,{seconds=5}={}){
 const bridge=global.billiardsTourBridge;
 let current=null,checkpoint=null,phase='idle',deadline=0,interval=null,epoch=0,practicing=false,blocked=null;
 const footer=document.createElement('div');footer.className='btg-practice-next';footer.hidden=true;
 footer.innerHTML='<div class="btg-countdown"><span>Next lesson in</span><strong role="timer" aria-live="off">5</strong><span>Tap the table to try this layout.</span></div><button type="button" class="btg-next-lesson">Next Lesson ▶</button><p class="btg-last-lesson">Final lesson — try this layout.</p>';
 const timer=footer.querySelector('[role="timer"]'),next=footer.querySelector('button');
 const state=()=>guide.getState();
 function active(){const s=state();return !!current&&s.enabled&&!s.exploring&&s.category!=='start'&&s.topicId===current.id;}
 function placeControls(){const slot=host.querySelector('[data-guide-slot="practice"]');if(slot&&current&&state().category!=='start'&&footer.parentNode!==slot)slot.append(footer);}
 function cancel(){epoch++;clearInterval(interval);interval=null;deadline=0;global.BilliardsPracticePrompt.hide('guide');}
 function render(){
  placeControls();footer.hidden=!active()||phase==='listening'||phase==='idle';footer.dataset.phase=phase;
  const counting=phase==='countdown';if(active()&&counting)global.BilliardsPracticePrompt.show('guide',()=>guide.tryShot());else global.BilliardsPracticePrompt.hide('guide');footer.querySelector('.btg-countdown').hidden=!counting;
  const more=guide.hasNextLesson();next.hidden=counting||!more;next.disabled=bridge.snapshot().busy;
  footer.querySelector('.btg-last-lesson').hidden=counting||more;
  const remaining=deadline?Math.max(0,Math.ceil((deadline-performance.now())/1000)):seconds;
  timer.textContent=String(remaining);timer.setAttribute('aria-label',`Next lesson in ${remaining} seconds. Tap the table to practice.`);
 }
 function hold(pause=true){cancel();practicing=true;phase='practice';if(pause)guide.pause();render();}
 function select(topic){
  if(state().exploring||!topic?.setups?.length||topic.category==='start'||topic.explorerOnly){cancel();current=null;phase='idle';render();return true;}
  if(bridge.snapshot().busy)return false;
  cancel();checkpoint=null;
  if(topic.scene&&bridge.loadLesson(topic.scene)===false)return false;
  current=topic;if(topic.scene)checkpoint=bridge.capture();phase=topic.recordingStatus==='pending'?'practice':'listening';practicing=false;render();return true;
 }
 function listening(){if(current){cancel();practicing=false;phase='listening';render();}}
 function sync(s){if(!s.enabled||s.exploring||s.category==='start'||(current&&s.topicId!==current.id)){cancel();footer.hidden=true;return;}if(!s.autoplay&&phase==='countdown')hold(false);render();}
 function advance(){if(!active()||bridge.snapshot().busy)return false;cancel();return guide.nextLesson();}
 next.addEventListener('click',advance);
 function ended(topic,s){
  if(!active()||topic?.id!==current.id)return false;
  cancel();practicing=false;
  if(!s.autoplay||!guide.hasNextLesson()){hold(false);return true;}
  phase='countdown';const token=epoch;deadline=performance.now()+seconds*1000;render();
  interval=setInterval(()=>{if(token!==epoch)return;if(!active()){cancel();render();return;}render();if(performance.now()>=deadline){if(bridge.snapshot().busy){hold(false);return;}advance();}},100);
  return true;
 }
 function retry(){if(!active()||!checkpoint||bridge.snapshot().busy)return false;hold();bridge.restore(checkpoint);render();return true;}
 async function resetUrl(url){
  if(current?.setups?.[0]?.url!==url)return global.BilliardsPracticeLayouts.apply(url);
  if(!retry())throw Error('Wait for the shot to finish before resetting the layout.');
 }
 // The first tap transfers control without moving a ball or accidentally aiming.
 const stop=e=>{if(e.cancelable)e.preventDefault();e.stopImmediatePropagation();};
 let clearBlocked;
 function handoff(e){
  if(blocked){
   if((e.type==='pointerdown'||e.type==='touchstart')&&blocked.ended){clearTimeout(clearBlocked);blocked=null;}
   else{if(e.type.startsWith('pointer')&&e.pointerId!==blocked.id)return;stop(e);if(['pointerup','pointercancel','touchend','mouseup'].includes(e.type)){blocked.ended=true;clearBlocked=setTimeout(()=>{blocked=null;},1000);}if(e.type==='click'){clearTimeout(clearBlocked);blocked=null;}return;}
  }
  if(!active()||practicing||!e.target.closest?.('#canvas,.btg-lesson-prompt')||!['pointerdown','mousedown','touchstart'].includes(e.type))return;
  blocked={id:e.pointerId,ended:false};stop(e);guide.tryShot();
 }
 for(const name of ['pointerdown','pointermove','pointerup','pointercancel','mousedown','mousemove','mouseup','touchstart','touchmove','touchend','click'])global.addEventListener(name,handoff,{capture:true,passive:false});
 document.addEventListener('pointerdown',e=>{
  if(!active()||e.target.closest('#btg-fullscreen,#phoneControls,#phoneDismiss'))return;
  if(e.target.closest('#bt-guide-pool-root')){if(phase==='countdown'&&e.target.closest('select,[data-action="Read"],[data-action="More"],[data-action="Practice"]'))hold();return;}
  if(e.target.closest('#stageWrap input,#panel input,#panel button,#tipCanvas,#tipCanvas2,#phoneTip1,#phoneTip2,#phoneActions button,#pocketTray'))hold();
 },true);
 document.addEventListener('input',e=>{if(active()&&!e.target.closest('#bt-guide-pool-root'))hold();},true);
 document.addEventListener('click',e=>{if(active()&&e.target.closest('#resetLayoutQuick,#resetLayout')){e.preventDefault();e.stopImmediatePropagation();retry();}},true);
 for(const event of ['billiards:shot-complete','billiards:undo-complete'])global.addEventListener(event,()=>{if(active())render();});
 return {loaded(topic){if(current?.id===topic.id){checkpoint=bridge.capture();render();}},select,listening,sync,ended,retry,resetUrl,placeControls,hold,tryShot:()=>hold(),getState:()=>({active:active(),topicId:current?.id,phase,remaining:deadline?Math.max(0,Math.ceil((deadline-performance.now())/1000)):null})};
}
global.BilliardsLessonPractice={attach,load,mount};
})(window);
