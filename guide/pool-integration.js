/* Pool-table inspection mappings. Uses existing, approved narration recordings. */
(function(){
'use strict';
async function init(){
 const stage=document.getElementById('stageWrap');
 if(!stage||!window.BilliardsGuide||document.body.classList.contains('projector'))return;
 const response=await fetch('./guide/pool-audio-map.json?v=pool-mapping1');
 if(!response.ok)throw Error('Pool Guide audio map could not load');
 const catalog=await response.json();
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
 }
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
 for(const topic of catalog.topics)topic.explorerOnly=topic.category==='explore'||(topic.category!=='start'&&ids.includes(topic.id));
 const guide=BilliardsGuide.mount(host,{
  onStateChange(state){
   guideButton.setAttribute('aria-pressed',String(state.enabled&&state.category!=='start'));
   startButton.setAttribute('aria-pressed',String(state.enabled&&state.category==='start'));
   exploreButton.setAttribute('aria-pressed',String(state.exploring));
  },
  poolMode:true,storageKey:'billiards-pool-guide-v1',topics:catalog.topics,exploreTopicIds:ids,
  isActive:()=>!modal.classList.contains('open'),
  resolveTopic(event,element){
   const target=event.target;
   if(target?.id==='canvas')return window.billiardsGuideTableTopicAt?.(event.clientX,event.clientY)||'table-orientation-quick';
   if(target?.id==='tipCanvas'||target?.id==='tipCanvas2'){
    const rect=target.getBoundingClientRect();
    const meterWidth=Math.max(30,Math.min(44,rect.width*.20));
    const ballAreaWidth=rect.width-meterWidth-8;
    if(Number.isFinite(event.clientX)&&event.clientX-rect.left>=ballAreaWidth)return catalog.powerMeterTopic;
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
   if(target.closest('#analyzePhotoBtn,#cameraCaptureBtn,#btg-analyze-launch,#photoAnalyzerClose'))return true;
   // Scroll through the side panel without adjusting a slider underneath the pointer.
   return event.type==='wheel'&&!!target.closest('#panel')&&!target.closest('input,canvas');
  }
 });
 guideButton.addEventListener('click',()=>{if(guide.getState().enabled&&guide.getState().category!=='start')guide.setEnabled(false);else guide.openCategory('fundamentals')});
 exploreButton.addEventListener('click',()=>guide.setExploring(!guide.getState().exploring));
 startButton.addEventListener('click',()=>{if(guide.getState().enabled&&guide.getState().category==='start')guide.setEnabled(false);else guide.openCategory('start')});
 for(const id of ['analyzePhotoBtn','cameraCaptureBtn'])document.getElementById(id)?.addEventListener('click',()=>{guide.setEnabled(false);guide.setExploring(false)},true);
 // Also pause if Analyze is opened through another trainer action.
 const modalObserver=new MutationObserver(()=>{if(modal.classList.contains('open')){guide.setEnabled(false);guide.setExploring(false)}});
 modalObserver.observe(modal,{attributes:true,attributeFilter:['class']});
 window.billiardsPoolGuide=guide;
 window.billiardsPoolAudioMap=catalog;
}
function start(){init().catch(error=>console.error('Pool Guide:',error))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
