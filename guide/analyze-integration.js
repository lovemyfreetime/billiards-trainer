/* Analyze Guide: existing recordings and approved narration transcripts. */
(function(){
'use strict';
async function init(){
 const host=document.getElementById('bt-guide-root');
 const launcher=document.getElementById('btg-analyze-launch');
 const modal=document.getElementById('photoAnalyzerModal');
 if(!host||!launcher||!modal||!window.BilliardsGuide)return;
 launcher.dataset.btgAllow='1';
 document.getElementById('photoAnalyzerClose').dataset.btgAllow='1';
 const explorer=document.getElementById('btg-analyze-explore');
 explorer.dataset.btgAllow='1';
 host.addEventListener('keydown',event=>event.stopPropagation());
 const topics=[
  {
    "id": "analysis-overview-quick",
    "title": "Image analysis overview",
    "category": "explore",
    "level": 0,
    "audio": [
      "./guide/audio/analysis-overview-quick.mp3"
    ],
    "summary": "Image analysis overview",
    "text": "Image analysis helps you build a practice arrangement from a still image. Import an image or capture one with the camera, review the detected balls, and correct the layout before using it on the table."
  },
  {
    "id": "image-intro",
    "title": "Image analysis introduction",
    "category": "explore",
    "level": 0,
    "audio": [
      "./guide/audio/photo-analysis-intro-quick.mp3",
      "./guide/audio/analysis-overview-quick.mp3"
    ],
    "summary": "Image analysis introduction",
    "text": "Image Analysis lets you recreate a real table arrangement inside the trainer. Start with a clear still photograph, review the ball positions, and make any needed corrections before practicing the shot.\n\nImage analysis helps you build a practice arrangement from a still image. Import an image or capture one with the camera, review the detected balls, and correct the layout before using it on the table."
  },
  {
    "id": "image-choose",
    "title": "Choosing an image",
    "category": "explore",
    "level": 0,
    "audio": [
      "./guide/audio/photo-choose-image-quick.mp3"
    ],
    "summary": "Choosing an image",
    "text": "Use Choose Image to select a picture of the pool table. A photograph that shows the entire playing surface and all visible balls will give you the best starting point for building an accurate layout."
  },
  {
    "id": "photo-camera-snapshot-quick",
    "title": "Taking a camera snapshot",
    "category": "explore",
    "level": 0,
    "audio": [
      "./guide/audio/photo-camera-snapshot-quick.mp3"
    ],
    "summary": "Taking a camera snapshot",
    "text": "Use Image Camera to capture a still picture of the table. Position the camera so the playing surface is clearly visible, then capture the image and review it before continuing."
  },
  {
    "id": "photo-camera-angle-quick",
    "title": "Camera angle",
    "category": "explore",
    "level": 0,
    "audio": [
      "./guide/audio/photo-camera-angle-quick.mp3"
    ],
    "summary": "Camera angle",
    "text": "For easier ball placement, photograph the table from as high and as centered a position as practical. Try to include all four corners of the playing surface and avoid steep viewing angles."
  },
  {
    "id": "photo-lighting-quick",
    "title": "Lighting and clarity",
    "category": "explore",
    "level": 0,
    "audio": [
      "./guide/audio/photo-lighting-quick.mp3"
    ],
    "summary": "Lighting and clarity",
    "text": "Use even lighting so the balls and rails are easy to distinguish. Avoid strong reflections, deep shadows, or motion blur. A clear photograph makes it easier to review the detected positions."
  },
  {
    "id": "photo-table-boundaries-quick",
    "title": "Reviewing the table boundaries",
    "category": "explore",
    "level": 0,
    "audio": [
      "./guide/audio/photo-table-boundaries-quick.mp3"
    ],
    "summary": "Reviewing the table boundaries",
    "text": "Before working with individual balls, check that the table boundaries in the image match the actual playing surface. If the alignment looks wrong, correct the available table reference points before transferring the layout."
  },
  {
    "id": "photo-perspective-quick",
    "title": "Understanding perspective",
    "category": "explore",
    "level": 0,
    "audio": [
      "./guide/audio/photo-perspective-quick.mp3"
    ],
    "summary": "Understanding perspective",
    "text": "A camera photograph can make the far end of the table appear narrower than the near end. The analysis process uses table geometry to translate image positions into a top-down practice layout. Review the result and lets you adjust the alignment as needed."
  },
  {
    "id": "image-balls",
    "title": "Detecting visible balls",
    "category": "explore",
    "level": 0,
    "audio": [
      "./guide/audio/photo-ball-detection-quick.mp3",
      "./guide/audio/photo-verify-identities-quick.mp3"
    ],
    "summary": "Detecting visible balls",
    "text": "After loading an image, examine the balls identified by the analysis. Compare each detected position with the image and look for any missed balls or markers that do not belong.\n\nOnce the visible balls are assigned, compare their numbers and positions with the original image. Take a moment to verify the cue ball and the intended target ball before planning your shot."
  },
  {
    "id": "photo-assign-ball-quick",
    "title": "Assigning ball identities",
    "category": "explore",
    "level": 0,
    "audio": [
      "./guide/audio/photo-assign-ball-quick.mp3"
    ],
    "summary": "Assigning ball identities",
    "text": "A detected ball may initially be labeled Unassigned. Select that ball and choose its correct identity. Use the image as your reference, and repeat until the balls needed for your practice layout are identified."
  },
  {
    "id": "photo-cue-ball-quick",
    "title": "Recognizing the cue ball",
    "category": "fundamentals",
    "level": 0,
    "audio": [
      "./guide/audio/photo-cue-ball-quick.mp3"
    ],
    "summary": "Recognizing the cue ball",
    "text": "Identify the cue ball carefully. Its location determines the starting point for every planned shot, so verify its position and identity before studying the aiming guides."
  },
  {
    "id": "photo-correct-ball-position-quick",
    "title": "Correcting a ball position",
    "category": "explore",
    "level": 0,
    "audio": [
      "./guide/audio/photo-correct-ball-position-quick.mp3"
    ],
    "summary": "Correcting a ball position",
    "text": "If a detected ball is slightly out of place, adjust its position to match the image. Small placement errors can change the cut angle, contact point, and predicted path."
  },
  {
    "id": "photo-missed-ball-quick",
    "title": "Handling missed detections",
    "category": "explore",
    "level": 0,
    "audio": [
      "./guide/audio/photo-missed-ball-quick.mp3"
    ],
    "summary": "Handling missed detections",
    "text": "If a ball visible in the image was not detected, use the available editing controls to add it to the layout. Position it by comparing nearby rails, diamonds, and other balls."
  },
  {
    "id": "photo-false-detection-quick",
    "title": "Handling false detections",
    "category": "explore",
    "level": 0,
    "audio": [
      "./guide/audio/photo-false-detection-quick.mp3"
    ],
    "summary": "Handling false detections",
    "text": "If the analysis identifies something that is not a ball, remove that incorrect detection using the available editing controls. Check the image again to make sure the remaining layout represents the real table."
  },
  {
    "id": "photo-verify-identities-quick",
    "title": "Checking ball numbers",
    "category": "explore",
    "level": 0,
    "audio": [
      "./guide/audio/photo-verify-identities-quick.mp3"
    ],
    "summary": "Checking ball numbers",
    "text": "Once the visible balls are assigned, compare their numbers and positions with the original image. Take a moment to verify the cue ball and the intended target ball before planning your shot."
  },
  {
    "id": "image-apply",
    "title": "Transferring the arrangement",
    "category": "explore",
    "level": 0,
    "audio": [
      "./guide/audio/photo-transfer-layout-quick.mp3"
    ],
    "summary": "Transferring the arrangement",
    "text": "When the image arrangement looks correct, use the available control to bring it into the trainer table. Check the transferred positions before you begin aiming or adjusting shot settings."
  },
  {
    "id": "photo-compare-layout-quick",
    "title": "Comparing image and table",
    "category": "explore",
    "level": 0,
    "audio": [
      "./guide/audio/photo-compare-layout-quick.mp3"
    ],
    "summary": "Comparing image and table",
    "text": "Compare the practice layout with the source image. Pay special attention to balls near cushions, clustered balls, and narrow gaps. Correct any differences that could change the shot you want to study."
  },
  {
    "id": "photo-plan-shot-quick",
    "title": "Planning a shot from an image",
    "category": "explore",
    "level": 0,
    "audio": [
      "./guide/audio/photo-plan-shot-quick.mp3"
    ],
    "summary": "Planning a shot from an image",
    "text": "With the transferred layout on the trainer table, choose the cue ball and your intended target. Use the aiming and geometry guides to explore the contact point and possible cue-ball route before selecting Execute Shot."
  },
  {
    "id": "photo-analysis-limitations-advanced",
    "title": "Reviewing ball positions in the image",
    "category": "explore",
    "level": 2,
    "audio": [
      "./guide/audio/photo-analysis-limitations-advanced.mp3"
    ],
    "summary": "Reviewing ball positions in the image",
    "text": "Review the transferred ball positions before practicing. If a ball is partly hidden, close to a cushion, or difficult to identify in the image, adjust its position or identity to match the image."
  },
  {
    "id": "image-corners",
    "title": "Aligning a photographed table",
    "category": "explore",
    "level": 0,
    "audio": [
      "./guide/audio/photo-auto-corners-quick.mp3",
      "./guide/audio/photo-table-boundaries-quick.mp3"
    ],
    "summary": "Aligning a photographed table",
    "text": "After selecting Choose Image, try Auto Corners. If the corners are misplaced, set them manually in pocket order: pocket 1, then pocket 3, pocket 4, and pocket 6. The last side connects back to pocket 1. This keeps the photograph aligned with the trainer’s pocket numbering. Use Reset Corners if you need to start over.\n\nBefore working with individual balls, check that the table boundaries in the image match the actual playing surface. If the alignment looks wrong, correct the available table reference points before transferring the layout."
  },
  {
    "id": "photo-rack-analyze-quick",
    "title": "Rack selection and ball analysis",
    "category": "explore",
    "level": 0,
    "audio": [
      "./guide/audio/photo-rack-analyze-quick.mp3"
    ],
    "summary": "Rack selection and ball analysis",
    "text": "Choose the appropriate rack setting, or leave it on Auto. Select Analyze Balls to identify balls in the photograph. Review the results and use the identity dropdowns to correct any numbers."
  },
  {
    "id": "photo-ball-suggestions-advanced",
    "title": "Reviewing identity suggestions",
    "category": "explore",
    "level": 2,
    "audio": [
      "./guide/audio/photo-ball-suggestions-advanced.mp3"
    ],
    "summary": "Reviewing identity suggestions",
    "text": "Detected-ball cards may show suggested identities and confidence indicators. Compare those suggestions with the photograph, then choose the correct identity from the dropdown."
  },
  {
    "id": "photo-add-missed-ball-quick",
    "title": "Adding or removing a detection",
    "category": "explore",
    "level": 0,
    "audio": [
      "./guide/audio/photo-add-missed-ball-quick.mp3"
    ],
    "summary": "Adding or removing a detection",
    "text": "If a ball was missed, select Add Missed Ball and click or touch its center in the photograph. Assign the ball identity afterward. If an incorrect detection appears, use Delete to remove it."
  },
  {
    "id": "photo-zoom-pan-quick",
    "title": "Inspecting the photograph",
    "category": "explore",
    "level": 0,
    "audio": [
      "./guide/audio/photo-zoom-pan-quick.mp3"
    ],
    "summary": "Inspecting the photograph",
    "text": "Zoom into the image to inspect positions and ball numbers. Move around the enlarged view to examine different parts of the table, then return to the full view before finishing your arrangement."
  },
  {
    "id": "photo-saved-images-quick",
    "title": "Saved image controls",
    "category": "explore",
    "level": 0,
    "audio": [
      "./guide/audio/photo-saved-images-quick.mp3"
    ],
    "summary": "Saved image controls",
    "text": "Use Saved Images to return to a photograph you worked with before. Select an image and choose Open. The nearby controls also let you remove a saved image or save and download the current image."
  },
  {
    "id": "image-apply-save",
    "title": "Applying a photographed layout",
    "category": "explore",
    "level": 0,
    "audio": [
      "./guide/audio/photo-apply-save-layout-quick.mp3"
    ],
    "summary": "Applying a photographed layout",
    "text": "When the ball identities and positions are correct, choose Apply to Trainer Table to transfer the arrangement. To keep it for future practice, enter a layout name and select Apply + Save Layout."
  }
];
 const assignments={
  "photoChooseImage": "image-choose",
  "photoTakeImage": "photo-camera-snapshot-quick",
  "photoCaptureFrame": "photo-camera-snapshot-quick",
  "photoRotateBtn": "photo-camera-angle-quick",
  "photoAutoRailsBtn": "image-corners",
  "photoResetCorners": "image-corners",
  "photoRackType": "photo-rack-analyze-quick",
  "photoAnalyzeNow": "image-balls",
  "photoAddMissed": "photo-add-missed-ball-quick",
  "photoAiModeBtn": "image-ai-mode",
  "photoArchiveSelect": "photo-saved-images-quick",
  "photoArchiveLoad": "photo-saved-images-quick",
  "photoArchiveDelete": "photo-saved-images-quick",
  "photoArchiveSave": "photo-saved-images-quick",
  "photoArchiveExport": "photo-saved-images-quick",
  "photoLayoutName": "image-apply-save",
  "photoApplyTable": "image-apply",
  "photoApplySave": "image-apply-save",
  "photoAnalyzerCanvas": "photo-zoom-pan-quick",
  "photoAnalyzerVideo": "photo-camera-snapshot-quick"
};
 topics.push({id:'image-ai-mode',title:'AI detection mode',category:'explore',level:0,audio:[],deviceSpeech:true,
  summary:'Enable or disable the trained ball detector.',
  text:'The AI button enables or disables the trained ball detector. Ready means the models are loaded. Auto or Loading means they are preparing. Retry restarts a failed load. With AI off, Analyze Balls uses the original detector. Review the detected identities and positions before applying your layout.'});
 // Auto Corners already covers the reset action; keep its explanation focused.
 const corners=topics.find(t=>t.id==='image-corners');
 corners.audio=corners.audio.slice(0,1);corners.text=corners.text.split('\n\n')[0];
 function applyMappings(){
  for(const [id,topic] of Object.entries(assignments)){
   const el=document.getElementById(id);if(el)el.dataset.guideTopic=topic;
  }
  const selectors={
   '.photoDetectionRow':'photo-verify-identities-quick',
   '.photoDetectionDot':'photo-correct-ball-position-quick',
   '.photoDetectionRow select':'photo-assign-ball-quick',
   '.photoDetectionRow button':'photo-false-detection-quick',
   '.photoLikelyRow, .photoDetectionConfidence':'photo-ball-suggestions-advanced',
   '.photoReviewInstruction':'photo-assign-ball-quick',
   '.photoMissedBallInstruction':'photo-add-missed-ball-quick',
   '.photoSavedGroup .photoToolHeading':'photo-saved-images-quick',
   '.photoSetupGroup .photoToolHeading':'image-corners',
   '.photoToolGroup:first-child .photoToolHeading':'image-choose'
  };
  for(const [selector,topic] of Object.entries(selectors))
   modal.querySelectorAll(selector).forEach(el=>{el.dataset.guideTopic=topic;});
 }
 applyMappings();
 topics.forEach(t=>{t.explorerOnly=true});
 const response=await fetch('./guide/pool-audio-map.json?v=pool-mapping1');
 if(!response.ok)throw Error('Analyze Guide lessons could not load');
 const training=await response.json();
 const controlTopics=new Set([...Object.values(training.assignments),...Object.values(training.sections),...training.canvasTopics,training.powerMeterTopic]);
 topics.push(...training.topics.filter(t=>['fundamentals','physics','drills','exercises'].includes(t.category)&&!controlTopics.has(t.id)));
 host.dataset.btgAllow='1';
 const guide=BilliardsGuide.mount(host,{
  topics,exploreTopicIds:topics.map(t=>t.id),
  onStateChange(state){launcher.setAttribute('aria-pressed',String(state.enabled));explorer.setAttribute('aria-pressed',String(state.exploring));},
  allowNavigation(e){
   if(e.type==='keydown'&&e.key==='Tab')return true;
   return e.type==='wheel'&&!!e.target.closest('.photoReview')&&!e.target.closest('input,select,button');
  }
 });
 new MutationObserver(applyMappings).observe(document.getElementById('photoDetectionList'),{childList:true,subtree:true});
 new MutationObserver(()=>{if(!modal.classList.contains('open')){guide.setEnabled(false);guide.setExploring(false)}}).observe(modal,{attributes:true,attributeFilter:['class']});
 launcher.addEventListener('click',()=>guide.setEnabled(!guide.getState().enabled));
 explorer.addEventListener('click',()=>guide.setExploring(!guide.getState().exploring));
 window.billiardsAnalyzeGuide=guide;
 window.billiardsAnalyzeAudioMap={topics,assignments};
}
function start(){init().catch(error=>console.error('Analyze Guide:',error))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
