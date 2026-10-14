/* Action-aware Analyze walkthrough. No action is completed by a timer alone. */
(function(root){
'use strict';
const steps=[
 {id:'choose',title:'Choose an image',targets:['photoChooseImage','photoArchiveSelect','photoArchiveLoad','photoLoadTableFile'],text:'Tap Choose Image to begin. You can also open a saved image, load a saved table file, or use the current image. Back revisits a step. Next confirms choices. The walkthrough waits for required actions.'},
 {id:'picker',title:'Select and open',targets:['photoChooseImage','photoArchiveSelect','photoArchiveLoad','photoLoadTableFile'],text:'Select your image and choose Open in the device window. For a saved image, select its name and tap Open. For a table file, select the file and open it. We will continue when it has loaded.'},
 {id:'find',title:'Open corner setup',targets:['photoFindCorners'],text:'Your image is loaded. Tap Find / Add Corners to open the table diagram. For a partial table image, choose the matching coverage in Custom Table Layouts before marking the corners.'},
 {id:'corners',title:'Identify four corners',targets:['photoAnalyzerCanvas','photoCalibrationDiagram','photoOrientation','photoRegion','photoAutoRailsBtn'],text:'Match each highlighted numbered reference on the diagram to the inside cushion edge in your image. Notice the orientation: Top or Bottom is portrait; Left or Right is landscape. For a full table in Auto, pocket one becomes top right in portrait and top left in landscape. Corner Sensing can estimate a full-table outline. Check all four markers.'},
 {id:'orientation',title:'Confirm orientation',targets:['photoOrientation','photoFlipEnds','photoCalibrationDiagram'],text:'Check the head, break, and kitchen end against your image. Choose Top or Bottom for portrait, or Left or Right for landscape. Use Flip Ends if reversed. Check the foot spot message and the four numbered markers. Tap Next when the orientation and alignment are correct.'},
 {id:'rack',title:'Confirm rack type',targets:['photoRackType'],text:'Leave Rack on Auto, or select the game shown in your image. Use Custom for a drill or an unusual arrangement. Select a different rack type, or tap Next to keep the current choice.'},
 {id:'analyze',title:'Analyze the balls',targets:['photoAnalyzeNow'],text:'Tap Analyze Balls. The walkthrough waits for analysis to finish. AI Ready shows the detector status; if the trained detector is unavailable, the app can use its local fallback.'},
 {id:'review',title:'Review every ball',targets:['photoDetectionList','photoBallStrip','photoAddMissed'],text:'Check every ball number and position. Tap an image marker or ball icon to find its review entry. Correct identities and delete false detections. Add Missed Ball places one ball per activation. Zoom and pan to check closely. Tap Next when all remaining balls have unique identities and the layout looks right.'},
 {id:'save',title:'Keep an image or file?',targets:['photoArchiveSave','photoArchiveExport','photoSaveTableFile'],text:'Saving here is optional. Save Image keeps the image on this device. Download saves an image copy. Save Table File downloads a shareable layout. These are separate from saving a named Trainer layout. Choose any you want, then tap Next, or simply tap Next to skip.'},
 {id:'apply',title:'Send the layout to Trainer',targets:['photoLayoutName','photoApplyTable','photoApplySave'],text:'Choose Apply to Trainer Table to practice now. Or enter a layout name and choose Apply plus Save Layout to keep it for reuse on this device. The walkthrough finishes only after the layout is successfully applied.'},
 {id:'complete',title:'Ready to practice',targets:[],text:'Your reviewed layout is now on the Trainer table. If you chose Apply plus Save, the named layout is also saved on this device. You can now practice the arrangement.'}
];
function createMachine(){
 let active=false,index=0,baseline=0,lastImage=0,analysis=0,loadBaseline=null,backViewing=false;
 const state=()=>({active,index,id:steps[index].id});
 function start(s){active=true;index=0;backViewing=false;baseline=s.imageVersion;lastImage=s.imageVersion;analysis=s.analysisRevision;loadBaseline=s.loadedTableFile;return state();}
 function stop(){active=false;return state();}
 function ready(s){
  const id=steps[index].id;
  if(id==='choose'||id==='picker')return s.imageReady;
  if(id==='find')return s.cornersValid;
  if(id==='corners'||id==='orientation')return s.cornersValid&&!s.busy;
  if(id==='analyze')return s.analysisRevision>analysis&&!s.busy;
  if(id==='review'||id==='apply')return s.reviewReady&&!s.busy;
  return !s.busy&&(id!=='save'||!s.archiveBusy);
 }
 function update(s,event){
  if(!active)return state();
  if(event==='applied'){index=10;active=false;return state();}
  if(s.loadedTableFile&&s.loadedTableFile!==loadBaseline){loadBaseline=s.loadedTableFile;lastImage=s.imageVersion;index=7;return state();}
  if(s.imageVersion!==lastImage){lastImage=s.imageVersion;index=1;}
  if(index===1&&!backViewing&&s.imageReady&&s.imageVersion!==baseline){baseline=s.imageVersion;index=2;}
  if(index===2&&event==='find')index=3;
  if(index===3&&s.cornersValid&&!backViewing)index=4;
  if(index>=4&&index<=9&&!s.cornersValid&&!s.loadedTableFile)index=3;
  if(index===5&&event==='rack'){backViewing=false;index=6;}
  if(index===6&&s.analysisRevision>analysis&&!s.busy){analysis=s.analysisRevision;index=7;}
  if(index>=8&&!s.reviewReady)index=7;
  return state();
 }
 function next(s){
  if(!active||!ready(s))return state();backViewing=false;
  if(index===0||index===1){baseline=s.imageVersion;lastImage=s.imageVersion;loadBaseline=s.loadedTableFile;index=s.loadedTableFile?7:2;}
  else if(index===2)index=4;
  else if(index===6)index=7;
  else if(index<9)index++;
  return state();
 }
 function request(s){if(active){baseline=s.imageVersion;lastImage=s.imageVersion;index=1;backViewing=false;}return state();}
 function back(s){if(active&&index>0){index--;backViewing=true;if(index===1)baseline=s.imageVersion;if(index===6)analysis=s.analysisRevision;}return state();}
 return {start,stop,state,ready,update,next,back,request};
}
function mount(bridge){
 const $=id=>document.getElementById(id),machine=createMachine(),panel=$('photoWalkthroughPanel'),launcher=$('photoWalkthroughBtn');
 let interval=null,last='',audio=new Audio(),output=root.BilliardsAudioStartup.create(audio),muted=false,playToken=0;
 audio.volume=.8;audio.preload='auto';
 const snap=()=>bridge.snapshot();
 function stopAudio(){playToken++;output.pause();audio.currentTime=0;}
 function narrate(){
  stopAudio();if(muted)return;
  const step=steps[machine.state().index],token=playToken;
  audio.dataset.walkthroughStep=step.id;audio.src='./guide/audio/analyze-walkthrough-'+step.id+'.mp3?v=walkthrough-v11';audio.load();
  output.play().catch(()=>{if(token===playToken)$('photoWalkthroughDetail').textContent='Tap Replay to hear this instruction. The written instruction is available above.';});
 }
 function text(id,value){const el=$(id);if(el.textContent!==value)el.textContent=value;}
 function render(){
  const s=machine.state(),snapshot=snap(),step=steps[s.index];panel.hidden=!s.active;launcher.setAttribute('aria-pressed',String(s.active));
  if(!s.active||last!==s.id)document.querySelectorAll('.walkthroughTarget').forEach(el=>el.classList.remove('walkthroughTarget'));
  if(!s.active){clearInterval(interval);interval=null;return;}
  if(last!==s.id)for(const id of step.targets)$(id)?.classList.add('walkthroughTarget');
  text('photoWalkthroughTitle',(s.index+1)+' / 10 · '+step.title);
  text('photoWalkthroughText',step.text);
  $('photoWalkthroughBack').disabled=s.index===0;
  $('photoWalkthroughNext').disabled=!machine.ready(snapshot)||s.id==='apply';
  $('photoWalkthroughNext').textContent=s.id==='choose'?'Use Current Image':s.id==='save'?'Next / Skip':'Next';
  text('photoWalkthroughDetail',s.id==='corners'?snapshot.cornerHint:s.id==='orientation'?snapshot.orientationHint+' '+snapshot.footSpotHint:s.id==='analyze'&&snapshot.busy?'Analysis is running.':s.id==='review'?snapshot.reviewHint:s.id==='save'?snapshot.archiveBusy?'Saving image…':snapshot.imageSaved?'Image saved on this device. Save other copies if wanted, then Next.':'Optional: choose saves above, or Next to skip.':s.id==='picker'?'Waiting for an image or table file to finish loading. Cancelled? Back returns to Choose Image.':'');
  if(last!==s.id){if(['corners','orientation'].includes(s.id))bridge.openCalibration();last=s.id;narrate();}
 }
 function update(event){machine.update(snap(),event);render();}
 function stop(){machine.stop();last='';stopAudio();render();}
 function start(){root.billiardsAnalyzeGuide?.setEnabled(false);root.billiardsAnalyzeGuide?.setExploring(false);machine.start(snap());last='';render();interval=setInterval(()=>update(),250);}
 launcher.addEventListener('click',()=>machine.state().active?stop():start());
 $('photoWalkthroughBack').addEventListener('click',()=>{machine.back(snap());render();});
 $('photoWalkthroughNext').addEventListener('click',()=>{machine.next(snap());render();});
 $('photoWalkthroughReplay').addEventListener('click',narrate);
 $('photoWalkthroughMute').addEventListener('click',()=>{muted=!muted;$('photoWalkthroughMute').textContent=muted?'Audio Off':'Audio On';$('photoWalkthroughMute').setAttribute('aria-pressed',String(muted));if(muted)stopAudio();else narrate();});
 $('photoWalkthroughStop').addEventListener('click',stop);
 for(const id of ['btg-analyze-start','btg-analyze-explore','photoAnalyzerClose'])$(id).addEventListener('click',stop,true);
 $('photoAnalyzerModal').addEventListener('click',event=>{
  if(!machine.state().active)return;
  const id=event.target.closest('button,select')?.id;
  if(['photoChooseImage','photoArchiveLoad','photoLoadTableFile'].includes(id)&&machine.state().index<=1){machine.request(snap());render();}
  if(id==='photoFindCorners')setTimeout(()=>update('find'),0);
 },false);
 $('photoRackType').addEventListener('change',()=>setTimeout(()=>update('rack'),0));
 $('photoFileInput').addEventListener('cancel',()=>{if(machine.state().id==='picker'){machine.back(snap());render();}});
 new MutationObserver(()=>{if(!$('photoAnalyzerModal').classList.contains('open')&&machine.state().active)stop();}).observe($('photoAnalyzerModal'),{attributes:true,attributeFilter:['class']});
 const applied=()=>{if(!machine.state().active)return;machine.update(snap(),'applied');last='complete';render();narrate();};
 return {start,stop,notify:update,applied,getState:machine.state};
}
const api={steps,createMachine,mount};if(typeof module==='object'&&module.exports)module.exports=api;else root.BilliardsAnalyzeWalkthrough=api;
})(typeof window==='object'?window:globalThis);
