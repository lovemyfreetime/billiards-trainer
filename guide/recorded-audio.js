/* Completed Chase recordings shared by the table and Analyze guides. */
(function(global){
'use strict';
let pending;
function load(){return pending||(pending=fetch('./guide/recorded-audio.json?v=presets-recovery-v13').then(r=>{if(!r.ok)throw Error('Recorded audio catalog unavailable');return r.json()}));}
function merge(topics,data,page){
 for(const record of data.records){
  if(record.page!==page&&record.page!=='Shared')continue;
  const index=topics.findIndex(t=>t.id===record.topic.id);
  if(index<0)topics.push({...record.topic});else topics[index]={...topics[index],...record.topic};
  delete topics[index<0?topics.length-1:index].deviceSpeech;
 }
}
function map(data,page){
 for(const record of data.records){
  if(record.page!==page||record.kind==='Menu option')continue;
  for(const target of record.targets){
   if(!target.startsWith('#')&&!target.startsWith('.')&&!target.startsWith('['))continue;
   const text=target.match(/ \(text: ([^)]+)\)$/);
   // Geometry and state-dependent parts of one canvas are resolved separately.
   if(/ \(/.test(target)&&!text)continue;
   const selector=text?target.slice(0,text.index):target;
   try{document.querySelectorAll(selector).forEach(el=>{
    if(text&&el.textContent.trim().replace(/\s+/g,' ')!==text[1])return;
    el.dataset.guideTopic=record.topic.id;
    // Labels and whitespace in a checkbox row must narrate the same item.
    if(el.id){document.querySelectorAll('label[for="'+CSS.escape(el.id)+'"]').forEach(label=>{label.dataset.guideTopic=record.topic.id});}
    const check=el.closest('.check');if(check)check.dataset.guideTopic=record.topic.id;
   });}catch(_){} // Documentary targets are not all CSS selectors.
  }
 }
 const extras=page==='Main'?{'#fullRackSelect':'main-pick-and-play-full-racks','#startFullRack':'main-start-full-rack','#randomSetup':'main-random-ball-count'}:{};
 for(const [selector,id] of Object.entries(extras))document.querySelector(selector)?.setAttribute('data-guide-topic',id);
}
const table={
 'cue-ball-diagram-direct-tip-quick':'main-shot-1-cue-tip-contact',
 'shot-two-planning-quick':'main-second-cue-ball-move',
 'cue-ball-placement-quick':'main-cue-ball-move',
 'ball-placement-quick':'main-object-ball-move',
 'marker-rotation-quick':'main-marker-rotate',
 'marker-resizing-quick':'main-marker-corner-resize',
 'table-markers-quick':'main-marker-drag',
 'ghost-ball-quick':'main-ghost-ball',
 'tangent-line-quick':'main-tangent-line',
 'aiming-line-quick':'main-aiming-line',
 'trajectory-lines-quick':'main-predicted-path',
 'cushion-response-quick':'main-rail-cushion',
 'table-orientation-quick':'main-empty-cloth'
};
function tableTopic(id){return table[id]||id;}
function resolve(event,data,page){
 const el=event.target instanceof Element?event.target:null;if(!el)return null;
 if(page==='Main'&&(el.id==='tipCanvas'||el.id==='tipCanvas2')){
  const rect=el.getBoundingClientRect(),width=Math.max(30,Math.min(44,rect.width*.20)),start=rect.width-width-8;
  const shot=el.id==='tipCanvas2'?2:1;
  if(event.clientX-rect.left>=start)return 'main-shot-'+shot+'-power-meter-'+(event.clientX-rect.left<start+width/2?'c':'p');
  return 'main-shot-'+shot+'-cue-tip-contact';
 }
 if(page==='Main'&&el.id==='canvas')return tableTopic(global.billiardsGuideTableTopicAt?.(event.clientX,event.clientY));
 if(page==='Analyze'){
  if(el.id==='photoAnalyzerCanvas')return global.billiardsGuidePhotoTopicAt?.(event.clientX,event.clientY)||'analyze-photo-wheel-zoom';
  if(el.id==='photoCalibrationDiagram')return 'analyze-calibration-diagram';
  const diagram=el.closest('#photoCalibrationDiagram');
  if(diagram){const pocket=el.closest('[data-pocket]'),rail=el.closest('[data-rail]');
   if(pocket)return 'analyze-pocket-'+pocket.dataset.pocket;
   if(rail)return 'analyze-rail-'+rail.dataset.rail;
  }
 }
 return el.closest('[data-guide-topic]')?.dataset.guideTopic||null;
}
global.BilliardsRecordedAudio={load,merge,map,resolve,tableTopic};
})(window);
