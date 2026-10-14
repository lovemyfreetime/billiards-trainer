/* Analyze Guide: existing recordings and approved narration transcripts. */
(function(){
'use strict';
async function init(){
 const recorded=await BilliardsRecordedAudio.load();
 const host=document.getElementById('bt-guide-root');
 const started=document.getElementById('btg-analyze-start');
 const modal=document.getElementById('photoAnalyzerModal');
 if(!host||!started||!modal||!window.BilliardsGuide)return;
 if(started)started.dataset.btgAllow='1';
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
    "text": "After selecting Choose Image, try Corner Sensing. If the corners are misplaced, set them manually by matching the highlighted diagram points: pocket 1, then pocket 3, pocket 4, and pocket 6. The first two points follow one long rail in either portrait or landscape. The last side connects back to pocket 1. This keeps the photograph aligned with the trainer’s pocket numbering. Use Reset Corners if you need to start over.\n\nBefore working with individual balls, check that the table boundaries in the image match the actual playing surface. If the alignment looks wrong, correct the available table reference points before transferring the layout."
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
 topics.push({id:'image-ai-mode',title:'AI detection mode',category:'explore',level:0,audio:['./guide/audio/analyze-ai-detector-mode-and-readiness.mp3'],
  summary:'Enable or disable the trained ball detector.',
  text:'The AI button enables or disables the trained ball detector. Ready means the models are loaded. Auto or Loading means they are preparing. Retry restarts a failed load. With AI off, Analyze Balls uses the original detector. Review the detected identities and positions before applying your layout.'});
 // Corner Sensing already covers the reset action; keep its explanation focused.
 const corners=topics.find(t=>t.id==='image-corners');
 corners.audio=corners.audio.slice(0,1);corners.text=corners.text.split('\n\n')[0];
 BilliardsRecordedAudio.merge(topics,recorded,'Analyze');
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
  BilliardsRecordedAudio.map(recorded,'Analyze');
 }
 applyMappings();
 topics.forEach(t=>{t.explorerOnly=t.category==='reference'||t.category==='explore'});
 topics.push(...[
  {
    "id": "analyze-start-choose-photo",
    "title": "1. Choose a photo",
    "category": "start",
    "level": 0,
    "audio": ["./guide/audio/photo-analysis-intro-quick.mp3", "./guide/audio/photo-choose-image-quick.mp3", "./guide/audio/photo-lighting-quick.mp3"],
    "summary": "Bring a real table into the analyzer.",
    "text": "Choose Image opens a photograph from your device. Keep the original portrait or landscape orientation. Use a sharp photograph showing the cloth, the balls, and enough rail or pocket references to mark the visible area. You do not need to show the entire table."
  },
  {
    "id": "analyze-start-coverage",
    "title": "2. Choose the visible table area",
    "category": "start",
    "level": 0,
    "audio": ["./guide/audio/photo-camera-angle-quick.mp3", "./guide/audio/photo-perspective-quick.mp3"],
    "summary": "Match coverage to what the photograph shows.",
    "text": "Open Custom Table Layouts. Choose full table, left half, right half, or another available coverage. Use Custom for a middle section or quarter region. Move the boundary lines on the table diagram to the matching diamond positions. Pocket numbers always run clockwise from pocket 1; pocket 2 and pocket 5 are the middle pockets."
  },
  {
    "id": "analyze-start-corners",
    "title": "3. Mark and refine alignment",
    "category": "start",
    "level": 0,
    "audio": ["./guide/audio/photo-auto-corners-quick.mp3", "./guide/audio/photo-table-boundaries-quick.mp3"],
    "summary": "Connect photo references to the trainer table.",
    "text": "Use Corner Sensing as a starting point when appropriate, or Reset Corners and mark the four boundary points in the prompted order. For a partial image, these points describe the selected region rather than the whole table. Custom Table Layouts lets you add visible pocket and diamond references. Mark the exact reference requested; a diamond is not a pocket. Add clear references on both rail directions when possible."
  },
  {
    "id": "analyze-start-analyze",
    "title": "4. Analyze and review balls",
    "category": "start",
    "level": 0,
    "audio": ["./guide/audio/photo-rack-analyze-quick.mp3", "./guide/audio/photo-ball-detection-quick.mp3", "./guide/audio/photo-verify-identities-quick.mp3", "./guide/audio/photo-assign-ball-quick.mp3", "./guide/audio/photo-false-detection-quick.mp3", "./guide/audio/photo-missed-ball-quick.mp3"],
    "summary": "Confirm every detected ball.",
    "text": "Run Analyze after setting the table alignment. Review the detected count and the ball icons. Solids run from 1 to 8, stripes from 9 to 15, the cue ball is above the 8, and question marks appear below. Click a photo marker or a summary icon to reach its list entry. Assign uncertain balls, correct numbers, and remove false detections before applying the layout."
  },
  {
    "id": "analyze-start-inspect",
    "title": "5. Zoom and check placement",
    "category": "start",
    "level": 0,
    "audio": ["./guide/audio/photo-zoom-pan-quick.mp3"],
    "summary": "Look closely at uncertain detections.",
    "text": "Use the mouse wheel over the photograph to zoom. Drag the zoomed image to see another area, or use the thin side and bottom pan bars. Compare the original photo with each ball thumbnail and its marker. Check that table spots have not been assigned as balls and that nearby balls remain separate."
  },
  {
    "id": "analyze-start-apply",
    "title": "6. Name and apply the layout",
    "category": "start",
    "level": 0,
    "audio": ["./guide/audio/photo-transfer-layout-quick.mp3", "./guide/audio/photo-apply-save-layout-quick.mp3"],
    "summary": "Move the reviewed layout to the trainer.",
    "text": "Enter a Layout Name. Apply to Trainer Table transfers the reviewed ball positions to the main table. Apply and Save also stores the named layout. Check the resulting positions on the trainer; the selected photo region is placed in its proper position on the full table."
  },
  {
    "id": "analyze-start-share",
    "title": "7. Save, share, and resume",
    "category": "start",
    "level": 0,
    "audio": ["./guide/audio/save-recall-layout-intro-quick.mp3"],
    "summary": "Keep a layout or continue a session.",
    "text": "Save Table File downloads a shareable .billiards.json layout. Someone else can use Load Table File on either page. Loading on Analyze stages the layout for review; then choose Apply to Trainer Table or Apply and Save. Save Session File on the trainer includes the session state. Auto-save Folder, where supported, keeps the latest session in a folder you choose. Saved Files lists layouts and sessions saved or imported on this device. Use Add Files to include earlier downloads, or Refresh Folder to read the connected folder."
  }
]);
 for(const t of topics){if(t.category==='start'){const steps={
 'analyze-start-choose-photo':['analyze-choose-table-image','analyze-image-camera-heading'],
 'analyze-start-coverage':['analyze-coverage-full','analyze-coverage-custom'],
 'analyze-start-corners':['analyze-corner-setup-walkthrough'],
 'analyze-start-analyze':['analyze-analyze-balls','analyze-assign-identity','analyze-delete-candidate'],
 'analyze-start-inspect':['analyze-photo-wheel-zoom','analyze-photo-drag-pan'],
 'analyze-start-apply':['analyze-name-analyzed-table-layout','analyze-apply-to-trainer-table'],
 'analyze-start-share':['analyze-save-analyzed-layout-json-file','analyze-load-shared-table-file-into-analyze']};
 const selected=(steps[t.id]||[]).map(id=>topics.find(x=>x.id===id)).filter(Boolean);if(selected.length){t.audio=selected.map(x=>x.audio);t.text=selected.map(x=>x.text).join('\n\n');}}}
 host.dataset.btgAllow='1';
 await BilliardsPracticeLayouts.attach(topics);
 const guide=BilliardsGuide.mount(host,{
  loadLayout:BilliardsPracticeLayouts.apply,
  resolveTopic(e,el){return BilliardsRecordedAudio.resolve(e,recorded,'Analyze')||el?.dataset.guideTopic},
  topics,initialCategory:'start',storageKey:'billiards-analyze-start-v1',startOnly:true,exploreTopicIds:topics.map(t=>t.id),
  onStateChange(state){started?.setAttribute('aria-pressed',String(state.enabled&&state.category==='start'));explorer.setAttribute('aria-pressed',String(state.exploring));},
  allowNavigation(e){
   if(e.type==='keydown'&&e.key==='Tab')return true;
   return e.type==='wheel'&&!!e.target.closest('.photoReview')&&!e.target.closest('input,select,button');
  }
 });
 new MutationObserver(applyMappings).observe(document.getElementById('photoDetectionList'),{childList:true,subtree:true});
 new MutationObserver(()=>{if(!modal.classList.contains('open')){guide.setEnabled(false);guide.setExploring(false)}}).observe(modal,{attributes:true,attributeFilter:['class']});
 started?.addEventListener('click',()=>{const s=guide.getState();if(s.enabled&&s.category==='start')guide.setEnabled(false);else guide.openCategory('start')});
 explorer.addEventListener('click',()=>guide.setExploring(!guide.getState().exploring));
 window.billiardsAnalyzeGuide=guide;
 window.billiardsAnalyzeAudioMap={topics,assignments};
}
function start(){init().catch(error=>console.error('Analyze Guide:',error))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
