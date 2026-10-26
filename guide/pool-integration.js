/* Pool-table inspection mappings. Uses existing, approved narration recordings. */
(function(){
'use strict';
async function init(){
 const recorded=await BilliardsRecordedAudio.load();
 const stage=document.getElementById('stageWrap');
 if(!stage||!window.BilliardsGuide||document.body.classList.contains('projector'))return;
 const response=await fetch('./guide/pool-audio-map.json?v=resources-v1');
 if(!response.ok)throw Error('Pool Guide audio map could not load');
 const catalog=await response.json();
 BilliardsRecordedAudio.merge(catalog.topics,recorded,'Main');
 const host=document.createElement('div');
 host.id='bt-guide-pool-root';host.className='btg-pool-mode';
 host.setAttribute('aria-label','Pool table audio Guide');stage.append(host);
 // Guide keyboard controls must not bubble into the trainer's shot shortcuts.
 host.addEventListener('keydown',event=>event.stopPropagation());
 const modal=document.getElementById('photoAnalyzerModal');
 function mapControls(){
  for(const [id,topic] of Object.entries(catalog.assignments)){
   const el=document.getElementById(id);if(!el||el.dataset.guideTopic===topic)continue;
   el.dataset.guideTopic=topic;
   // Include a field's printed label without assigning unrelated parent panels.
   const row=el.closest('.fineRow,.row,.check,.metric');
   if(row)row.dataset.guideTopic=topic;
  }
  for(const button of document.querySelectorAll('#panel .sectionToggle')){
   const label=button.querySelector('span')?.textContent.trim();
   if(catalog.sections[label])button.dataset.guideTopic=catalog.sections[label];
  }
  const advanced=document.querySelector('[data-advanced="physicsAdvanced"]');
  if(advanced)advanced.dataset.guideTopic='physics-calibration-intro-quick';
  for(const button of document.querySelectorAll('[data-preset]'))button.dataset.guideTopic='calibration-table-ball-dimensions-quick';
  BilliardsRecordedAudio.map(recorded,'Main');
 }
 BilliardsRecordedAudio.map(recorded,'Main');
 mapControls();
 // Elevation side views and marker visibility buttons are created by the trainer.
 const observer=new MutationObserver(mapControls);
 observer.observe(document.getElementById('app'),{childList:true,subtree:true});
 const launchers=document.getElementById('btg-pool-launchers');
 const guideButton=document.getElementById('btg-pool-guide');
 const exploreButton=document.getElementById('btg-pool-explore');
 const startButton=document.getElementById('btg-pool-start');
 launchers.dataset.btgAllow='1';
 const ids=[...new Set([...Object.values(catalog.assignments),...Object.values(catalog.sections),...catalog.canvasTopics,catalog.powerMeterTopic])];
 // Explorer mappings explain controls; they must not remove lessons from Guide.
 for(const topic of catalog.topics)topic.explorerOnly=topic.category==='reference'||topic.category==='explore';
 for(const [category,groups] of Object.entries(catalog.curriculum)){
  let order=0;
  for(const group of groups)for(const id of group.topics){
   const topic=catalog.topics.find(t=>t.id===id);
   if(!topic||topic.category!==category)throw Error('Invalid Guide curriculum: '+id);
   topic.group=group.title;topic.guideOrder=order++;
  }
 }
 await BilliardsPracticeLayouts.attach(catalog.topics);
 await BilliardsLearning.attach(catalog.topics);
 await BilliardsLessonPractice.attach(catalog.topics);
 let tour=null,lessonPractice=null,layoutRequest=0,lastProfileWidth=0;
 const guide=BilliardsGuide.mount(host,{
  loadLayout:url=>lessonPractice?lessonPractice.resetUrl(url):BilliardsPracticeLayouts.apply(url),
  onTopicChange(topic){
   const request=++layoutRequest;
   if(tour?.select(topic)===false)return false;
   if(topic?.category==='start')return true;
   if(topic?.category==='more'){lessonPractice?.select(null);return true;}
   if(lessonPractice?.select(topic)===false)return false;
   if(topic?.scene||!topic?.setups?.length)return true;
   if(window.billiardsTourBridge?.snapshot().busy)return false;
   // A slower response from a previous lesson must never overwrite the current table.
   BilliardsPracticeLayouts.apply(topic.setups[0].url,{shouldApply:()=>request===layoutRequest&&guide.getState().enabled&&guide.getState().topicId===topic.id&&!window.billiardsTourBridge?.snapshot().busy}).then(applied=>{if(applied!==false&&request===layoutRequest)lessonPractice?.loaded(topic);}).catch(error=>{if(request===layoutRequest)globalThis.alert(error.message)});
   return true;
  },
  onTryShot:()=>guide.getState().category==='start'?tour?.tryShot():lessonPractice?.tryShot(),
  onResourcePractice:topic=>{guide.pause();if(topic.scene)window.billiardsTourBridge?.loadLesson(topic.scene);},
  onPlaybackProgress:(topic,time,playing)=>tour?.progress(topic,time,playing),
  onPlaybackStart:()=>guide.getState().category==='start'?tour?.listening():lessonPractice?.listening(),
  onRendered:()=>{tour?.placeControls();lessonPractice?.placeControls();positionPlayer();},
  onPlaybackStop:()=>guide.getState().category==='start'?tour?.hold(false):lessonPractice?.hold(false),
  onLessonEnd:(topic,state)=>topic?.category==='start'?tour?.ended(topic,state):lessonPractice?.ended(topic,state),
  getPracticeSetups:()=>tour?.setups()||[],
  loadPracticeSetup:url=>tour.load(url),
  onStateChange(state){
   if(!state.enabled)layoutRequest++;
   tour?.sync(state);lessonPractice?.sync(state);
   guideButton.setAttribute('aria-pressed',String(state.enabled&&state.category!=='start'));
   startButton.setAttribute('aria-pressed',String(!!tour?.getState().active||(state.enabled&&state.category==='start')));
   exploreButton.setAttribute('aria-pressed',String(state.exploring));
  },
  poolMode:true,storageKey:'billiards-pool-guide-v1',topics:catalog.topics,resources:catalog.resources,exploreTopicIds:ids,
  isActive:()=>!modal.classList.contains('open')&&!document.body.classList.contains('table-3d'),
  resolveTopic(event,element){
   const direct=BilliardsRecordedAudio.resolve(event,recorded,'Main');if(direct)return direct;
   const target=event.target;
   if(target?.id==='canvas')return BilliardsRecordedAudio.tableTopic(window.billiardsGuideTableTopicAt?.(event.clientX,event.clientY))||'main-empty-cloth';
   if(target?.id==='tipCanvas'||target?.id==='tipCanvas2'){
    const rect=target.getBoundingClientRect();
    const meterWidth=Math.max(30,Math.min(44,rect.width*.20));
    const ballAreaWidth=rect.width-meterWidth-8;
    if(Number.isFinite(event.clientX)&&event.clientX-rect.left>=ballAreaWidth)return target.id==='tipCanvas2'?'main-shot-2-power-meter-c':'main-shot-1-power-meter-c';
   }
   return element?.dataset.guideTopic;
  },
  allowNavigation(event){
   const target=event.target instanceof Element?event.target:null;
   if(!target)return false;
   const disclosure=target.closest('.sectionToggle,.advancedToggle,#cueRailBtn,#cuePopupClose,#quickLayoutRecall,#layoutQuickClose');
   if(event.type.startsWith('key')){
    if(event.key==='Tab')return true;
    if(event.type==='keydown'&&disclosure&&(event.key==='Enter'||event.key===' ')){event.preventDefault();disclosure.click();}
    return false;
   }
   if(disclosure)return true;
   // Keep screen navigation available. Guide is paused before opening Analyze.
   if(target.closest('#analyzePhotoBtn,#cameraCaptureBtn'))return false;
   // Scroll through the side panel without adjusting a slider underneath the pointer.
   return event.type==='wheel'&&!!target.closest('#panel')&&!target.closest('input,canvas');
  }
 });
 function showLearningIn2D(){if(!document.body.classList.contains('table-3d'))return;document.getElementById('table3DToggle')?.click();requestAnimationFrame(()=>{if(document.body.classList.contains('phone-focus')&&!document.body.classList.contains('phone-controls-open'))document.getElementById('phoneControls')?.click();});}
 for(const launcher of [startButton,guideButton,exploreButton])launcher.addEventListener('click',showLearningIn2D,{capture:true});
 guideButton.addEventListener('click',()=>{if(guide.getState().enabled&&guide.getState().category!=='start')guide.setEnabled(false);else guide.openGuide()});
 exploreButton.addEventListener('click',()=>guide.setExploring(!guide.getState().exploring));
 window.billiardsPoolAudioMap=catalog;
 tour=await BilliardsGetStartedTour.mount(guide);
 if(tour)tour.steps.forEach((step,index)=>{const topic=catalog.topics.find(t=>t.id===step.topicId);if(!topic)throw Error('Quick Start lesson unavailable: '+step.topicId);topic.guideOrder=index;});
 lessonPractice=BilliardsLessonPractice.mount(guide,host);
 window.billiardsLessonPractice=lessonPractice;
 window.billiardsGetStartedTour=tour;
 startButton.addEventListener('click',()=>tour?tour.start():guide.openCategory('start'));
 for(const id of ['analyzePhotoBtn','cameraCaptureBtn'])document.getElementById(id)?.addEventListener('click',()=>{if(!guide.getState().exploring){guide.setEnabled(false);guide.setExploring(false)}},true);
 // Also pause if Analyze is opened through another trainer action.
 const modalObserver=new MutationObserver(()=>{if(modal.classList.contains('open')){tour?.pause();guide.setEnabled(false);guide.setExploring(false)}});
 modalObserver.observe(modal,{attributes:true,attributeFilter:['class']});
 // The player stays in the top margin; the jump profile fits the remaining width.
 function positionPlayer(){
  host.style.removeProperty('top');
  const profile=window.billiardsTourBridge?.flightProfileBounds?.(),width=profile?profile.right-profile.left:0;
  if(Math.abs(width-lastProfileWidth)>.5){lastProfileWidth=width;requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));}
 }
 for(const event of ['resize','input','change','click'])window.addEventListener(event,()=>requestAnimationFrame(positionPlayer));
 if(window.ResizeObserver)new ResizeObserver(positionPlayer).observe(stage);
 // Leaving 2D stops audio, pending lessons and narration spotlights together.
 let was3D=false;
 function sync3D(){const in3D=document.body.classList.contains('table-3d');if(in3D&&!was3D){tour?.pause();guide.setEnabled(false);guide.setExploring(false);}was3D=in3D;}
 new MutationObserver(sync3D).observe(document.body,{attributes:true,attributeFilter:['class']});sync3D();
 window.billiardsPoolGuide=guide;
 window.billiardsPoolAudioMap=catalog;
}
function start(){init().catch(error=>console.error('Pool Guide:',error))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
