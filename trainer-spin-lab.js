/* Shared training-ball setup and shot playback controls. */
(() => {
 'use strict';
 const math=window.BilliardsTrainingBall,bridge=()=>window.billiardsTrainingBall,play=()=>window.billiardsPlayback;
 const video=document.getElementById('trainerClipTools');if(!video||!math||!bridge())return;
 const group=document.createElement('section');group.id='trainerTrainingBall';group.className='tableControlGroup layoutSetupGroup';
 group.innerHTML='<div class="tableControlTitle">CUE BALL</div><label for="trainingBallStyle">Ball appearance</label><select id="trainingBallStyle"><option value="current">Current cue ball</option><option value="spots">Six red spots</option><option value="split">Half red / white</option><option value="stripe">Black stripe</option></select><canvas id="trainingBallPreview" width="200" height="200" role="img" aria-label="Cue-facing ball preview. Drag to rotate the ball."></canvas><div class="hint">Drag the ball to rotate its markings. The blue ring shows cue-tip contact.</div><output id="trainingBallStatus" class="hint"></output>';
 document.getElementById('featureCueOptions').append(group);
 const motions=[['1','Regular Motion'],['0.5','Slow Motion'],['0.25','Really Slow Motion'],['0.125','Super Slow Motion']];
 const motionOptions=motions.map(([value,label])=>'<option value="'+value+'">'+label+'</option>').join('');
 const row=document.createElement('div');row.className='trainingPlaybackSettings';row.innerHTML='<label for="trainerPlaybackSpeed">Motion</label><select id="trainerPlaybackSpeed" aria-describedby="trainerPlaybackHelp">'+motionOptions+'</select><button id="trainerShowPlayback" type="button">Show playback controls</button><button id="trainerStopPlayback" type="button">Stop playback</button><div id="trainerPlaybackHelp" class="hint">Record shot saves this speed. Camera recorder captures the live demonstration.</div>';
 video.querySelector('#trainerClipArm').closest('.row').before(row);
 const bar=document.createElement('section');bar.id='trainerPlaybackBar';bar.setAttribute('aria-label','Shot playback');bar.innerHTML='<div id="trainerPlaybackBody" hidden><label class="playbackSpeedLabel">Motion <select id="trainerPlaybackQuickSpeed" aria-label="Playback motion">'+motionOptions+'</select></label><button id="trainerPlaybackPause" type="button" title="Play or pause shot">Play</button><button id="trainerPlaybackBack" type="button" aria-label="Previous shot frame" title="Previous shot frame">‹</button><button id="trainerPlaybackStep" type="button" aria-label="Next shot frame" title="Next shot frame">›</button><button id="trainerPlaybackReplay" type="button" title="Replay the last shot without changing the layout">Replay</button><button id="trainerPlaybackCloseup" type="button">Close-up</button><button id="trainerPlaybackWide" type="button">Wide</button><div class="playbackFollowOptions" role="group" aria-label="Follow camera"><label class="playbackFollow"><input id="trainerPlaybackFollowFront" data-follow-side="front" type="checkbox" aria-label="Follow from front">Front</label><label class="playbackFollow"><input id="trainerPlaybackFollow" data-follow-side="behind" type="checkbox" aria-label="Follow from behind">Behind</label><label class="playbackFollow"><input id="trainerPlaybackFollowLeft" data-follow-side="left" type="checkbox" aria-label="Follow from left">Left</label><label class="playbackFollow"><input id="trainerPlaybackFollowRight" data-follow-side="right" type="checkbox" aria-label="Follow from right">Right</label></div><button id="trainerPlaybackHide" type="button" aria-label="Hide playback controls" title="Hide controls; keep playback and camera following">×</button><output id="trainerPlaybackStatus"></output></div>';
 document.body.append(bar);
 const byId=id=>document.getElementById(id),preview=byId('trainingBallPreview'),style=byId('trainingBallStyle'),speed=byId('trainerPlaybackSpeed'),quick=byId('trainerPlaybackQuickSpeed'),body=byId('trainerPlaybackBody');
 const menu=byId('workspace-motion'),summary=menu?.querySelector('summary');
 const followMenu=byId('workspace-follow');
 const distances=[['close','Close-up'],['wide','Wide']];
 const views=[['front','Front'],['behind','Behind'],['left','Left'],['right','Right']];
 const preferenceKey='trainer.playbackLocks.v1';
 let stored={};
 try { stored=JSON.parse(localStorage.getItem(preferenceKey)) || {}; } catch {}
 const speedLock=makeLock(menu,'Lock motion','motionLock',motions.some(([v])=>v===stored.speed));
 const followLock=makeLock(followMenu,'Lock follow view','followLock',stored.view==='close'||views.some(([v])=>v===stored.view));
 let selectedView=followLock.checked && stored.view!=='close' ? stored.view : 'behind';
 let selectedDistance=followLock.checked && stored.distance==='wide' ? 'wide' : 'close';
 let followEnabled=followLock.checked && stored.followEnabled===true;
 let returnCamera=null, activation=null;

 function makeLock(details,label,id,checked){
  const row=document.createElement('label'),input=document.createElement('input');
  row.className='playbackLock';input.type='checkbox';input.id=id;input.checked=checked;
  input.onchange=savePreferences;row.append(input,label);
  details?.querySelector('.workspaceToolGroup').append(row);
  return input;
 }
 function savePreferences(){
  try {
   const saved={};
   if(speedLock.checked)saved.speed=String(play().state().speed);
   if(followLock.checked){saved.view=selectedView;saved.distance=selectedDistance;saved.followEnabled=followEnabled;}
   localStorage.setItem(preferenceKey,JSON.stringify(saved));
  }catch{}
 }
 function choices(details,items,attribute,choose,container){
  if(!details)return [];
  return items.map(([value,label])=>{
   const button=document.createElement('button');
   button.type='button';button.textContent=label;button.dataset[attribute]=value;
   button.onclick=()=>{
    if(attribute!=='distance'){details.open=false;details.querySelector('summary').focus();}
    choose(value);
   };
   if(container)container.append(button);
   else details.querySelector('.workspaceToolGroup').insertBefore(button,details.querySelector('.playbackLock'));
   return button;
  });
 }
 function setSpeed(value){
  const ok=play().speed(Number(value));
  if(ok)savePreferences();
  return ok;
 }
 const motionButtons=choices(menu,motions,'speed',setSpeed);
 const distanceGroup=document.createElement('div');
 distanceGroup.className='followDistances';distanceGroup.setAttribute('role','group');distanceGroup.setAttribute('aria-label','Follow distance');
 followMenu?.querySelector('.workspaceToolGroup').prepend(distanceGroup);
 const followToggle=document.createElement('button');
 followToggle.id='followMode';followToggle.type='button';followToggle.setAttribute('role','switch');
 followToggle.setAttribute('aria-label','Follow View');
 followToggle.innerHTML='Follow View <span class="followModeState">Off</span>';
 distanceGroup.before(followToggle);
 followToggle.onclick=()=>setFollowEnabled(!followEnabled);
 const distanceButtons=choices(followMenu,distances,'distance',value=>selectView(selectedView,value),distanceGroup);
 const followButtons=choices(followMenu,views,'view',side=>selectView(side));

 function applyView(){
  const camera=window.Billiards3D;
  if(!followEnabled||!camera?.active||!bridge().state().hasCue)return false;
  if(!returnCamera)returnCamera=camera.camera();
  camera.followCue(true,selectedView,selectedDistance);
  return true;
 }
 async function selectView(view,distance=selectedDistance){
  const camera=window.Billiards3D;
  if(!followEnabled||!camera||play().state().recording||!bridge().state().hasCue)return false;
  selectedView=view;selectedDistance=distance;
  savePreferences();sync();
  if(!camera.active){
   if(!activation)activation=camera.enable().finally(()=>{activation=null;});
   if(!await activation)return false;
  }
  return applyView();
 }
 async function setFollowEnabled(value){
  if(play().state().recording)return;
  followEnabled=value;
  if(value){
   if(!await selectView(selectedView))followEnabled=false;
  }else{
   const camera=window.Billiards3D;
   if(camera?.active && camera.camera().followCue){
    if(returnCamera)camera.restoreCamera({...returnCamera,followCue:false});
    else camera.followCue(false);
   }
   returnCamera=null;
  }
  savePreferences();sync();
 }
 function onCameraReady(){
  if(followEnabled && !activation)applyView();
 }
 function onPlaybackStart(){
  if(window.Billiards3D?.active && menu)applyView();
 }
 function onPlaybackEnd(){
  if(!speedLock.checked && play().state().speed!==1)play().speed(1);
  if(!followEnabled){sync();return;}
  if(followLock.checked){
   applyView();
  }else{
   followEnabled=false;
   selectedView='behind';selectedDistance='close';
   if(returnCamera && window.Billiards3D?.active)window.Billiards3D.restoreCamera(returnCamera);
   returnCamera=null;
  }
  sync();
 }
 let previewKey='',lastViewKey='',drag=null,opened=false,lastSync=-Infinity;
 const basis=d=>({right:[-d.y,0,d.x],up:[0,1,0],front:[-d.x,0,-d.y]});
 function position(){
  const camera=byId('trainerCameraBar');let top=8;
  if(innerWidth<=620&&innerHeight>innerWidth){
   for(const el of document.querySelectorAll('#table3DToggle,#phoneControls,[data-trainer-action=undoShot],[data-trainer-action=redoShot]')){const r=el.getBoundingClientRect();if(r.width&&r.height&&r.top<innerHeight/2)top=Math.max(top,r.bottom+8);}
  }
  const nav=byId('workspaceTools');
  if(nav && nav.getClientRects().length && opened){
   const tools=nav.getBoundingClientRect(), playback=bar.getBoundingClientRect();
   if(tools.right+6>playback.left)top=Math.max(top,tools.bottom+8);
  }
  if(camera&&!camera.hidden)top=Math.max(top,camera.getBoundingClientRect().bottom+8);
  bar.style.top=Math.max(8,Math.min(top,innerHeight-bar.getBoundingClientRect().height-8))+'px';
 }
 function show(value){opened=value;body.hidden=!value;bar.classList.toggle('expanded',value);byId('trainerShowPlayback').setAttribute('aria-expanded',String(value));byId('trainerShowPlayback').textContent=value?'Hide playback controls':'Show playback controls';position();}
 byId('trainerShowPlayback').setAttribute('aria-controls','trainerPlaybackBar');byId('trainerShowPlayback').setAttribute('aria-expanded','false');
 byId('trainerPlaybackHide').onclick=()=>show(false);byId('trainerShowPlayback').onclick=()=>show(!opened);
 for(const select of [speed,quick])select.onchange=()=>{play().speed(Number(select.value));savePreferences();if(Number(select.value)<1)show(true);sync();};
 byId('trainerPlaybackPause').onclick=async()=>{
  if(menu && followEnabled && !play().state().running && !window.Billiards3D.active && !await selectView(selectedView))return;
  play().pause();sync();
 };
 byId('trainerPlaybackBack').onclick=()=>{play().step(-1);sync();};byId('trainerPlaybackStep').onclick=()=>{play().step(1);sync();};
 byId('trainerPlaybackReplay').onclick=()=>{play().replay();sync();};
 byId('trainerPlaybackCloseup').onclick=()=>selectView(selectedView,'close');
 byId('trainerPlaybackWide').onclick=()=>selectView(selectedView,'wide');
 for(const input of bar.querySelectorAll('[data-follow-side]'))input.onchange=e=>{if(e.target.checked)selectView(input.dataset.followSide);else setFollowEnabled(false);};
 byId('trainerStopPlayback').onclick=()=>{play().stop();sync();};
 style.onchange=()=>{bridge().set(style.value);previewKey='';sync();};
 function trackball(event){const r=preview.getBoundingClientRect(),x=(event.clientX-r.left-r.width/2)/(r.width*.46),y=(r.top+r.height/2-event.clientY)/(r.height*.46),n=Math.hypot(x,y);return n>1?[x/n,y/n,0]:[x,y,Math.sqrt(1-x*x-y*y)];}
 preview.onpointerdown=e=>{if(e.button!==0||bridge().state().busy||!bridge().state().hasCue)return;e.preventDefault();const state=bridge().state();drag={point:trackball(e),q:state.orientation,view:basis(state.aim)};preview.setPointerCapture(e.pointerId);};
 preview.onpointermove=e=>{if(!drag)return;e.preventDefault();const local=math.between(drag.point,trackball(e)),axis=drag.view.right.map((v,i)=>v*local[0]+drag.view.up[i]*local[1]+drag.view.front[i]*local[2]),q=[...axis,local[3]];bridge().set(style.value,math.multiply(q,drag.q));};
 preview.onpointerup=preview.onpointercancel=()=>{drag=null;};
 function sync(fromDraw=false){
  const now=performance.now(),p=play().state();if(fromDraw&&p.running&&!p.paused&&now-lastSync<100)return;lastSync=now;
  const state=bridge().state();style.value=state.style;speed.value=quick.value=String(p.speed);
  for(const b of motionButtons){b.setAttribute('aria-pressed',String(b.dataset.speed===speed.value));b.disabled=p.recording;}
  if(menu){menu.classList.toggle('slowed',p.speed!==1);summary.setAttribute('aria-label','Motion: '+speed.selectedOptions[0].textContent);}
  for(const el of group.querySelectorAll('button'))el.disabled=state.busy||!state.hasCue;style.disabled=state.busy;preview.classList.toggle('busy',state.busy||!state.hasCue);
  for(const el of [speed,quick,byId('trainerPlaybackPause'),byId('trainerPlaybackBack'),byId('trainerPlaybackStep')])el.disabled=p.recording;
  byId('trainerPlaybackReplay').disabled=p.recording||(!p.hasReplay&&!p.running);
  byId('trainerPlaybackPause').textContent=p.running&&!p.paused?'Pause':'Play';
  byId('trainerPlaybackPause').setAttribute('aria-label',p.running&&!p.paused?'Pause shot':'Play shot');
  byId('trainerPlaybackStatus').textContent=p.running?(p.recording?'Recording · ':p.paused?'Paused · ':'')+p.time.toFixed(3)+' s · '+p.motion:p.recording?'Preparing or saving video…':'Choose a speed, then Play or Record shot';
  const in3D=!!window.Billiards3D?.active,camera=window.Billiards3D?.camera();
  const followOptionsDisabled=!followEnabled||!state.hasCue||p.recording;
  const checked=String(followEnabled);
  if(followToggle.getAttribute('aria-checked')!==checked){
   followToggle.setAttribute('aria-checked',checked);
   followToggle.lastElementChild.textContent=followEnabled?'On':'Off';
  }
  followToggle.disabled=p.recording||(!followEnabled&&!state.hasCue);
  byId('trainerPlaybackCloseup').disabled=byId('trainerPlaybackWide').disabled=followOptionsDisabled;
  for(const [value,id] of [['close','trainerPlaybackCloseup'],['wide','trainerPlaybackWide']]){
   byId(id).setAttribute('aria-pressed',String(in3D && camera.followCue && selectedDistance===value));
  }
  if(!in3D && !activation)returnCamera=null;
  for(const button of distanceButtons){button.disabled=followOptionsDisabled;button.setAttribute('aria-pressed',String(selectedDistance===button.dataset.distance));}
  for(const button of followButtons){button.disabled=followOptionsDisabled;button.setAttribute('aria-pressed',String(selectedView===button.dataset.view));}
  if(followMenu){
   followMenu.classList.toggle('followEnabled',followEnabled);
   followMenu.querySelector('summary').setAttribute('aria-label',followEnabled?'Follow View on: '+(selectedDistance==='wide'?'Wide':'Close-up')+', '+views.find(([value])=>value===selectedView)[1]:'Follow View off');
  }
  for(const input of bar.querySelectorAll('[data-follow-side]')){input.disabled=followOptionsDisabled;input.checked=followEnabled&&in3D&&!!camera?.followCue&&input.dataset.followSide===(camera.followSide||'behind');}
  byId('trainerStopPlayback').disabled=p.recording||(!p.running&&!camera?.followCue);
  byId('trainingBallStatus').textContent=!state.hasCue?'Place a cue ball on the table to set its orientation.':state.busy?'Orientation is locked during playback.':'Shot '+state.shot+' · Rotation changes the markings only.';
  const key=JSON.stringify([state.style,state.orientation,state.aim,state.tip]);
  if(key!==previewKey&&preview.offsetParent){previewKey=key;math.sphere(preview,state.style,state.orientation,basis(state.aim));const c=preview.getContext('2d'),x=100+state.tip.x*92,y=100-state.tip.y*92;c.beginPath();c.arc(x,y,5,0,Math.PI*2);c.strokeStyle='#071b25';c.lineWidth=4;c.stroke();c.strokeStyle='#64e8ff';c.lineWidth=2;c.stroke();}
  const viewKey=String(in3D)+String(byId('trainerCameraBar')?.hidden);if(viewKey!==lastViewKey){lastViewKey=viewKey;position();}
 }
 window.BilliardsSpinLabUI={sync,onPlaybackStart,onPlaybackEnd,onCameraReady};
 if(menu)play().speed(Number(speedLock.checked?stored.speed:1));
 if(menu){
  // Consume the complete cloth gesture so tapping to exit cannot also aim or move a ball.
  const stage=byId('stageWrap');
  let exitGesture=null, suppressClick=false;
  stage.addEventListener('pointerdown',event=>{
   suppressClick=false;
   const state=play().state();
   if(!event.isPrimary || event.button!==0 || !state.running || state.recording || !event.target.matches('canvas'))return;
   exitGesture={id:event.pointerId,x:event.clientX,y:event.clientY};
   stage.setPointerCapture(event.pointerId);
   event.preventDefault();event.stopImmediatePropagation();
  },true);
  for(const type of ['pointermove','pointerup','pointercancel'])stage.addEventListener(type,event=>{
   if(exitGesture?.id!==event.pointerId)return;
   event.preventDefault();event.stopImmediatePropagation();
   if(type==='pointermove')return;
   const tap=type==='pointerup'&&Math.hypot(event.clientX-exitGesture.x,event.clientY-exitGesture.y)<=10;
   exitGesture=null;suppressClick=true;
   if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);
   if(tap)play().stop();
  },true);
  stage.addEventListener('click',event=>{if(suppressClick){suppressClick=false;event.preventDefault();event.stopImmediatePropagation();}},true);
  document.addEventListener('keydown',event=>{
   if(event.key==='Escape' && play().state().running && !play().state().recording){
    event.preventDefault();event.stopImmediatePropagation();play().stop();
   }
  },true);
 }
 window.addEventListener('resize',position);window.addEventListener('billiards:camera-recording-change',position);
 new MutationObserver(()=>{position();sync();}).observe(document.body,{attributes:true,attributeFilter:['class']});
 group.closest('.section')?.querySelector('.sectionToggle')?.addEventListener('click',()=>requestAnimationFrame(sync));
 document.addEventListener('click',e=>{if(e.target.closest('#panel')&&!e.target.closest('#trainerTrainingBall'))requestAnimationFrame(sync);});
 for(const event of ['pointerdown','pointermove','touchstart','wheel'])bar.addEventListener(event,e=>e.stopPropagation());
 sync();
})();
