/* Practice checkpoints use the existing compact Guide player and its one audio element. */
(function(global){
'use strict';
async function mount(guide){
 const bridge=global.billiardsTourBridge;
 if(!bridge||!guide)return null;
 const response=await fetch('./guide/get-started-tour.json?v=compact-start-v21');
 if(!response.ok)throw Error('Get Started lessons unavailable');
 const {steps}=await response.json();
 let index=0,original=null,profile=null,checkpoint=null,loading=false;
 const active=()=>{const s=guide.getState();return s.enabled&&s.category==='start'};
 const topicId=i=>global.billiardsPoolAudioMap?.topics.filter(t=>t.category==='start'&&!t.explorerOnly)[i]?.id;
 function select(topic){
  if(topic?.category!=='start')return true;
  const next=steps.findIndex(s=>topic.title.replace(/^\d+\.\s*/, '')===s.title);
  if(next<0)return true;
  if(bridge.snapshot().busy)return false;
  if(!original){original=bridge.capture();profile=original.state;}
  index=next;loading=true;bridge.apply(steps[index],profile);checkpoint=bridge.capture();loading=false;return true;
 }
 function start(){
  if(active()){guide.setEnabled(false);return;}
  if(bridge.snapshot().busy)return;
  original=bridge.capture();profile=original.state;guide.openCategory('start');
 }
 function tryShot(){guide.pause();if(document.body.classList.contains('phone-controls-open'))document.getElementById('phoneControls')?.click();}
 function retry(){if(!checkpoint||bridge.snapshot().busy)return false;guide.pause();bridge.restore(checkpoint);return true;}
 function setups(){return steps.map((s,i)=>({title:(i+1)+'. '+s.title,url:s.layout,audio:s.audio,id:topicId(i)}));}
 async function load(url){
  const i=steps.findIndex(s=>s.layout===url);if(i<0)throw Error('Practice layout unavailable');
  if(bridge.snapshot().busy)throw Error('Wait for the shot to finish before loading a layout.');
  guide.selectTopic(topicId(i));guide.tryShot();
 }
 document.addEventListener('pointerdown',event=>{
  if(active()&&!event.target.closest('#bt-guide-pool-root')&&event.target.closest('#canvas,#tipCanvas,#tipCanvas2,#phoneTip1,#phoneTip2,#stageWrap input,#phoneActions button,#panel input,#panel button,#pocketTray'))guide.pause();
 },true);
 document.addEventListener('keydown',event=>{if(active()&&!event.target.closest('#bt-guide-pool-root')&&['Enter',' '].includes(event.key))guide.pause();},true);
 document.addEventListener('input',event=>{if(active()&&!event.target.closest('#bt-guide-pool-root'))guide.pause();},true);
 document.addEventListener('click',event=>{
  if(!active())return;
  if(event.target.closest('#resetLayoutQuick,#resetLayout')){event.preventDefault();event.stopImmediatePropagation();retry();}
 },true);
 return {start,select,tryShot,retry,setups,load,pause:()=>guide.pause(),exit(){guide.setEnabled(false);if(original)bridge.restore(original);},getState:()=>({active:active(),index,stepId:steps[index].id,loading}),steps};
}
global.BilliardsGetStartedTour={mount};
})(window);
