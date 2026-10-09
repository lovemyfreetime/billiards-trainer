/* Isolated Analyze-page Guide mount. No changes to production main.
   Narration wiring is intentionally deferred until verified audio manifest paths are provided. */
(function(){
'use strict';
function init(){
 const host=document.getElementById('bt-guide-root');
 const launcher=document.getElementById('btg-analyze-launch');
 if(!host||!launcher||!window.BilliardsGuide)return;
 launcher.dataset.btgAllow='1';
 const topics=[
  {id:'image-intro',title:'Image analysis introduction',category:'explore',level:0,summary:'Understand how the image analysis workspace is used.',text:'Choose a pool-table image and review the detected layout before applying it.'},
  {id:'image-choose',title:'Choose Image',category:'start',level:0,summary:'Load a photograph of the table.',text:'Choose Image opens a photograph for analysis.'},
  {id:'image-corners',title:'Aligning a photographed table',category:'fundamentals',level:0,summary:'Align the photograph to the table corners.',text:'Use Auto Corners and review the alignment before analyzing balls.'},
  {id:'image-balls',title:'Analyze Balls',category:'fundamentals',level:0,summary:'Review the detected balls and correct mistakes.',text:'Analyze Balls identifies candidate ball positions; verify them before applying.'},
  {id:'image-apply',title:'Apply to Trainer',category:'exercises',level:0,summary:'Transfer the reviewed layout to the trainer.',text:'Apply the reviewed layout when you are satisfied with its accuracy.'}
 ];
 const mapping=[
  ['photoChooseImage','image-choose'],
  ['photoAutoCorners','image-corners'],
  ['photoAnalyzeBalls','image-balls']
 ];
 for(const [id,topic] of mapping){const el=document.getElementById(id);if(el)el.dataset.guideTopic=topic;}
 const guide=BilliardsGuide.mount(host,{topics});
 // Launcher must remain available even when the Guide's inspection shield is active.
 launcher.addEventListener('click',()=>{
   const toggle=host.querySelector('.btg-toolbar button');
   if(toggle)toggle.click();
 });
 window.billiardsAnalyzeGuide=guide;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
