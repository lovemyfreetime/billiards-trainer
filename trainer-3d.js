/* Optional 3D view with camera controls and projected Trainer editing. */
(() => {
 'use strict';
 if(new URLSearchParams(location.search).has('projector')||new URLSearchParams(location.search).get('zen')==='1')return;
 const stage=document.getElementById('stageWrap'),source=document.getElementById('canvas');
 if(!stage||!source)return;
 const button=document.createElement('button');button.type='button';button.id='table3DToggle';button.textContent='3D';button.setAttribute('aria-pressed','false');
 const status=document.createElement('span');status.id='table3DStatus';status.setAttribute('role','status');
 const views=document.createElement('nav');views.id='table3DViews';views.setAttribute('aria-label','Table viewpoints');views.append(button);stage.append(views,status);
 const tools=document.createElement('nav');tools.id='table3DTools';tools.hidden=true;tools.setAttribute('aria-label','3D camera controls');
 const action=(label,title,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-label',title);b.title=title;b.onclick=fn;tools.append(b);return b;};
 const standingButton=action('Full View','Fit the full table from the nearest long rail',()=>{
  const heading=cameraState.azimuth,follow=document.getElementById('followMode');
  if(follow?.getAttribute('aria-checked')==='true')follow.click();
  standing(heading);
 });
 const alongButton=action('Cue View','Toggle Cue View',()=>window.billiardsCueView?.toggle());
 const zoomIn=action('+','Zoom camera in',()=>zoom(1/1.15)),zoomOut=action('−','Zoom camera out',()=>zoom(1.15));
 const viewLock=action('Lock view','Lock view for ball placement and aiming',()=>setViewLocked(!viewLocked));viewLock.id='table3DLock';viewLock.setAttribute('aria-pressed','false');views.append(standingButton,alongButton,viewLock);stage.append(tools);for(const b of [standingButton,alongButton,viewLock])b.hidden=true;
 const panButton=action('','Move table: drag to slide the view',()=>chooseCameraMode(true));panButton.id='table3DPan';panButton.setAttribute('aria-pressed','false');panButton.innerHTML='<svg width=18 height=18 viewBox="0 0 24 24" aria-hidden=true><path d="M7 12V6a1.5 1.5 0 0 1 3 0v5-7a1.5 1.5 0 0 1 3 0v7-6a1.5 1.5 0 0 1 3 0v7-4a1.5 1.5 0 0 1 3 0v7c0 4-2 6-6 6h-1c-2 0-3-1-4-2l-4-5c-1-2 1-3 2-2l3 2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';panButton.title='Move table: drag with one finger or mouse. Two fingers always slide and pinch.';const rotateButton=action('','Rotate table: drag to orbit and tilt the view',()=>chooseCameraMode(false));rotateButton.id='table3DRotate';rotateButton.setAttribute('aria-pressed','false');rotateButton.innerHTML='<svg width=18 height=18 viewBox="0 0 24 24" aria-hidden=true><path d="M19 8a8 8 0 1 0 1 8M19 3v6h-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';zoomIn.id='table3DZoomIn';zoomOut.id='table3DZoomOut';
 const zoomSlider=document.createElement('input');zoomSlider.id='table3DZoomSlider';zoomSlider.type='range';zoomSlider.min='0';zoomSlider.max='100';zoomSlider.step='.1';zoomSlider.setAttribute('aria-label','3D zoom');
 const zoomGroup=document.createElement('div');zoomGroup.id='table3DZoomGroup';zoomGroup.append(zoomOut,zoomSlider,zoomIn);
 zoomSlider.addEventListener('input',()=>{if(!lastFrame)return;const min=Math.max(lastFrame.R*5,lastFrame.L*.06),max=lastFrame.L*8;cameraState.radius=Math.exp(Math.log(max)+(Math.log(min)-Math.log(max))*Number(zoomSlider.value)/100);requestRender();});
 for(const type of ['pointerdown','touchstart','wheel'])zoomGroup.addEventListener(type,event=>event.stopPropagation());
 const trayToggle=action('▤','Show or hide all 16 balls',()=>togglePopover(tray,trayToggle));trayToggle.id='table3DTrayToggle';trayToggle.setAttribute('aria-expanded','false');trayToggle.setAttribute('aria-controls','table3DTray');
 const rackToggle=action('△','Choose a rack or randomize',()=>togglePopover(rackMenu,rackToggle));rackToggle.id='table3DRackToggle';rackToggle.setAttribute('aria-expanded','false');rackToggle.setAttribute('aria-controls','table3DRackMenu');
 tools.replaceChildren(trayToggle,rackToggle,zoomGroup,rotateButton,panButton);
 const tray=document.createElement('section');tray.id='table3DTray';tray.className='table3DPopover';tray.hidden=true;tray.setAttribute('aria-label','Ball tray');
 const trayCount=document.createElement('output');trayCount.setAttribute('aria-live','polite');tray.append(trayCount);
 const clear=document.createElement('button');clear.type='button';clear.textContent='Clear table';clear.onclick=()=>{window.billiards3DBallControls?.clear();syncBallTools();};tray.append(clear);
 const trayBalls=document.createElement('div');trayBalls.className='table3DTrayBalls';tray.append(trayBalls);
 const colors=['#f4f4ed','#f6d21f','#2678ff','#e84132','#744ac4','#f07a22','#2e9c4d','#7b2d20','#111'];
 const ballButtons=Array.from({length:16},(_,id)=>{
  const b=document.createElement('button');b.type='button';b.dataset.ballId=id;b.textContent=id||'C';b.className='table3DTrayBall';b.style.setProperty('--ball-color',colors[id>8?id-8:id]);if(id>8)b.classList.add('stripe');
  let start=null,moved=false;
  b.addEventListener('pointerdown',e=>{if(e.button!==0||b.disabled)return;start={x:e.clientX,y:e.clientY};moved=false;b.setPointerCapture(e.pointerId);});
  b.addEventListener('pointermove',e=>{if(start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>6)moved=true;});
  b.addEventListener('pointerup',e=>{if(!start)return;start=null;if(moved){const q=engine?.tablePoint(e);if(q)window.billiards3DBallControls?.place(id,q);syncBallTools();}});
  b.addEventListener('pointercancel',()=>{start=null;moved=true;});
  b.onclick=()=>{if(!moved)window.billiards3DBallControls?.place(id);moved=false;syncBallTools();};trayBalls.append(b);return b;
 });
 const rackMenu=document.createElement('section');rackMenu.id='table3DRackMenu';rackMenu.className='table3DPopover';rackMenu.hidden=true;rackMenu.setAttribute('role','dialog');rackMenu.setAttribute('aria-label','Choose rack or randomize');
 const random=document.createElement('button');random.type='button';random.className='table3DRandom';random.textContent='Random';random.setAttribute('aria-label','Randomize current balls');random.onclick=()=>{if(window.billiards3DBallControls?.status().busy)return;document.getElementById('shuffleTableLayout')?.click();closePopovers();};rackMenu.append(random);
 const labels={rack6:'6',rack7:'7',rack8:'8',rack9:'9',rack10:'10',straight14:'S',ultimate8:'U',rack3:'3'};
 const rackButtons=Object.entries(labels).map(([value,label],i)=>{const b=document.createElement('button');b.type='button';b.dataset.rack=value;b.textContent=label;const option=[...document.getElementById('fullRackSelect').options].find(o=>o.value===value);b.setAttribute('aria-label','Set up '+option.textContent);const a=(-90+i*45)*Math.PI/180;b.style.left=(50+37*Math.cos(a))+'%';b.style.top=(50+37*Math.sin(a))+'%';b.onclick=()=>{if(window.billiards3DBallControls?.status().busy)return;const select=document.getElementById('fullRackSelect');select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));document.getElementById('startFullRack').click();closePopovers();syncBallTools();};rackMenu.append(b);return b;});
 stage.append(tray,rackMenu);
 function closePopovers(){tray.hidden=true;rackMenu.hidden=true;trayToggle.setAttribute('aria-expanded','false');rackToggle.setAttribute('aria-expanded','false');}
 function positionPopover(pop,anchor){const r=anchor.getBoundingClientRect(),w=pop.offsetWidth,h=pop.offsetHeight;pop.style.left=Math.max(6,Math.min(innerWidth-w-6,r.left))+'px';pop.style.top=Math.max(6,Math.min(innerHeight-h-6,r.top-h-8))+'px';}
 function togglePopover(pop,anchor){if(!active&&pop!==rackMenu)return;const show=pop.hidden;closePopovers();if(show){pop.hidden=false;anchor.setAttribute('aria-expanded','true');syncBallTools();positionPopover(pop,anchor);}}
 let ballToolsKey='';
 function syncBallTools(){const data=window.billiards3DBallControls?.status();if(!data)return;const key=JSON.stringify([data.busy,data.balls,data.pocketed]);if(key===ballToolsKey)return;ballToolsKey=key;clear.disabled=data.busy||!data.balls.length;trayCount.textContent=data.pocketed.length+' pocketed';for(const b of ballButtons){const id=+b.dataset.ballId,present=data.balls.includes(id),pocketed=data.pocketed.includes(id);b.disabled=data.busy||present;b.classList.toggle('on-table',present);b.classList.toggle('pocketed',pocketed);b.setAttribute('aria-label',(id?'Ball '+id:'Cue ball')+(present?' on table':pocketed?' pocketed — tap or drag to return':' — tap or drag to add'));}rackToggle.disabled=data.busy;random.disabled=data.busy;rackButtons.forEach(b=>b.disabled=data.busy);}
 document.addEventListener('pointerdown',e=>{if(!rackMenu.contains(e.target)&&!rackToggle.contains(e.target)){rackMenu.hidden=true;rackToggle.setAttribute('aria-expanded','false');}});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(!tray.hidden||!rackMenu.hidden)){closePopovers();e.stopPropagation();}},true);
 window.addEventListener('resize',()=>{if(!tray.hidden)positionPopover(tray,trayToggle);if(!rackMenu.hidden)positionPopover(rackMenu,rackToggle);});
 const phoneBox=document.createElement('div');phoneBox.id='table3DPhoneControls';phoneBox.setAttribute('role','group');phoneBox.setAttribute('aria-label','3D table controls');phoneBox.hidden=true;stage.append(phoneBox);
 const panel=document.getElementById('panel'),drawer=document.createElement('button'),dismiss=document.createElement('button');
 drawer.type='button';drawer.id='table3DDrawer';drawer.setAttribute('aria-controls','panel');
 dismiss.type='button';dismiss.id='table3DDismiss';dismiss.setAttribute('aria-label','Close tools');dismiss.hidden=true;document.body.append(dismiss);stage.append(drawer);
 function setDrawer(open){
  open=!!open&&active&&!document.body.classList.contains('phone-focus');
  document.body.classList.toggle('table-3d-tools-open',open);drawer.setAttribute('aria-expanded',String(open));drawer.setAttribute('aria-label',open?'Close tools':'Open tools');drawer.textContent=open?'× Tools':'☰ Tools';dismiss.hidden=!open;
  if(!open&&panel?.contains(document.activeElement))drawer.focus();
 }
 drawer.onclick=()=>setDrawer(!document.body.classList.contains('table-3d-tools-open'));dismiss.onclick=()=>setDrawer(false);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('table-3d-tools-open')){setDrawer(false);e.preventDefault();}});
 const shotActions=document.createElement('nav');shotActions.id='table3DShotActions';shotActions.setAttribute('aria-label','Shot actions');
 for(const [id,label] of [['animate','Execute Shot'],['undoShot','Undo']]){const original=document.getElementById(id),copy=document.createElement('button');copy.type='button';copy.textContent=label;copy.onclick=()=>original?.click();const sync=()=>{copy.disabled=!original||original.disabled;};if(original)new MutationObserver(sync).observe(original,{attributes:true,attributeFilter:['disabled']});sync();shotActions.append(copy);}
 stage.append(shotActions);
 panel?.addEventListener('click',e=>{if(e.target.closest('#animate,#undoShot,#redoShot,#resetLayoutQuick'))setDrawer(false);});
 let active=false,viewLocked=false,panEnabled=false,loading=false,lastFrame=null,engine=null,scheduled=0;
 let previousCueCamera=null,inspectionCamera=null,cameraTransition=null,visualCamera=null;
 const returnView=action('Return to shot view','Restore the view before inspection',()=>{if(!inspectionCamera)return;const saved=inspectionCamera;inspectionCamera=null;previousCueCamera=saved.cue;window.Billiards3D.restoreCamera(saved.camera);returnView.hidden=true;});
 returnView.id='table3DReturnView';returnView.hidden=true;views.append(returnView);
 function rememberInspection(){if(!inspectionCamera){inspectionCamera={camera:window.Billiards3D.camera(),cue:previousCueCamera};returnView.hidden=false;}}
 const VIEW_TRANSITION_MS=3200,CUE_APPROACH_MS=4800;
 let cueApproachProgress=1,cueRoutineProgress=1;
 function transitionFrom(from,kind='view'){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  cameraTransition=reduced?null:{from:JSON.parse(JSON.stringify(visualCamera||from)),start:performance.now(),duration:kind==='cue'?CUE_APPROACH_MS:VIEW_TRANSITION_MS,kind};
  cueApproachProgress=reduced?1:kind==='cue'?0:1;cueRoutineProgress=cueApproachProgress;
 }
 function stopTransition(){if(cameraTransition&&visualCamera)Object.assign(cameraState,visualCamera,{target:{...visualCamera.target}});cameraTransition=null;cueApproachProgress=1;cueRoutineProgress=1;}
 function blendCamera(a,b,t){
  const u=t*t*t*(t*(t*6-15)+10),turn=Math.atan2(Math.sin(b.azimuth-a.azimuth),Math.cos(b.azimuth-a.azimuth)),ta=a.target||{x:0,y:0,z:0},tb=b.target||{x:0,y:0,z:0};
  return {...b,azimuth:a.azimuth+turn*u,elevation:a.elevation+(b.elevation-a.elevation)*u,radius:a.radius+(b.radius-a.radius)*u,target:Object.fromEntries(['x','y','z'].map(k=>[k,ta[k]+(tb[k]-ta[k])*u]))};
 }
 function renderedCamera(){
  if(!cameraTransition){visualCamera={...cameraState,target:{...cameraState.target}};return cameraState;}
  const tr=cameraTransition,t=Math.min(1,(performance.now()-tr.start)/tr.duration),b=cameraState;
  if(t===1){cameraTransition=null;cueApproachProgress=1;cueRoutineProgress=1;visualCamera={...b,target:{...b.target}};return b;}
  let out;
  if(tr.kind==='cue'&&lastFrame?.cuePose){
   cueRoutineProgress=t;
   const p=window.BilliardsCue3D.playerCamera(lastFrame.cuePose,{height:Math.max(.42,b.playerEyeHeight+.26),distance:1.15,approach:true});
   const wide={...b,azimuth:p.azimuth,elevation:p.elevation,radius:p.radius,target:{x:p.target[0]-lastFrame.L/2,y:p.target[1],z:p.target[2]-lastFrame.W/2}};
   out=t<.38?blendCamera(tr.from,wide,t/.38):blendCamera(wide,b,(t-.38)/.62);
   cueApproachProgress=Math.max(0,(t-.38)/.62);
  }else out=blendCamera(tr.from,b,t);
  visualCamera=out;requestRender();return out;
 }
 alongButton.id='table3DCueView';standingButton.id='table3DFullView';alongButton.setAttribute('aria-pressed','false');
 const cameraState={azimuth:0,elevation:.5,radius:3,target:null};
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function positionToggle(){
  if(!active||document.body.classList.contains('phone-focus'))return;
  const zoom=document.getElementById('tableZoom');if(!zoom)return;
  const left=Number.parseFloat(zoom.style.left)||0,top=Number.parseFloat(zoom.style.top)||0;
  views.style.left=clamp(left,4,Math.max(4,stage.clientWidth-views.offsetWidth-4))+'px';
  views.style.top=clamp(top+42,4,Math.max(4,stage.clientHeight-views.offsetHeight-4))+'px';
 }
 function dock(){
  const tablet=active&&!/Windows/i.test(navigator.userAgent)&&(navigator.maxTouchPoints||0)>0&&innerWidth>=768&&innerHeight>=500;if(document.body.classList.contains('table-3d-tablet')!==tablet)document.body.classList.toggle('table-3d-tablet',tablet);
  const shelf=document.getElementById('phoneToolShelf'),phone=document.body.classList.contains('phone-focus');
  if(phone&&active){phoneBox.hidden=false;phoneBox.append(views,tools);stage.append(phoneBox,status,button);}
  else if(!active){phoneBox.hidden=true;stage.append(tools,status);views.prepend(button);const row=document.getElementById('trainerUpdateRow');if(row)row.prepend(views);else stage.append(views);}
  else{phoneBox.hidden=true;views.prepend(button);stage.append(tools,views,status);positionToggle();}
  window.billiardsWorkspaceDock?.();
  if(document.body.classList.contains('zen-mode'))disable();
  if(document.body.classList.contains('phone-focus')&&document.body.classList.contains('table-3d-tools-open'))setDrawer(false);
 }
 new MutationObserver(dock).observe(document.body,{attributes:true,attributeFilter:['class']});dock();
 function syncCameraMode(){
  const moving=active&&!viewLocked;
  document.body.classList.toggle('table-3d-pan',moving&&panEnabled);document.body.classList.toggle('table-3d-rotate',moving&&!panEnabled);
  panButton.setAttribute('aria-pressed',String(active&&panEnabled));rotateButton.setAttribute('aria-pressed',String(active&&!panEnabled));
  document.getElementById('table3DCanvas')?.style.removeProperty('cursor');
 }
 function chooseCameraMode(pan){setPanEnabled(pan);}
 function setPanEnabled(value){engine?.cancelInput();panEnabled=!!value;syncCameraMode();}
 function setViewLocked(value){
  engine?.cancelInput();viewLocked=!!value;document.body.classList.toggle('table-3d-locked',active&&viewLocked);syncCameraMode();
  viewLock.replaceChildren();
  const title=document.createElement('span'),hint=document.createElement('small');title.textContent=viewLocked?'Done moving':'Move balls';hint.textContent=viewLocked?'Balls unlocked':'Drag any ball';viewLock.append(title,hint);
  viewLock.setAttribute('aria-pressed',String(viewLocked));
  viewLock.setAttribute('aria-label',viewLocked?'Done moving balls':'Move balls on the table');
  viewLock.title=viewLocked?'Drag any ball, including the cue ball. Tap Done moving to protect them; choosing a view or Shoot also finishes.':'Move any ball, including the cue ball. Changes are kept as you move.';
  document.getElementById('table3DCanvas')?.setAttribute('aria-label',viewLocked?'Balls unlocked. Drag any ball. Tap Done moving when ready.':'Drag to inspect the table. Drag the aim handle or use Aim to adjust the shot.');
 }
 for(const id of ['teachingCompassToggle','bankToolToggle','kickToolToggle'])document.getElementById(id)?.addEventListener('click',()=>{if(!active)return;setViewLocked(true);setDrawer(false);if(document.body.classList.contains('phone-controls-open'))document.getElementById('phoneControls').click();});
 viewLock.onclick=()=>setViewLocked(!viewLocked);
 document.getElementById('startFullRack')?.addEventListener('click',()=>{if(active&&document.body.classList.contains('phone-tray-hidden'))document.getElementById('phoneTrayToggle')?.click();});
 document.getElementById('animate')?.addEventListener('click',()=>{if(active){if(viewLocked)setViewLocked(false);stopTransition();}},true);
 function fitViewLabels(){
  if(!active)return;
  for(const el of [button,standingButton,alongButton,...viewLock.querySelectorAll('.table3DAdjustmentLabel')]){
   if(!el.clientWidth||!el.clientHeight)continue;
   let size=el.classList.contains('table3DAdjustmentLabel')?9:(innerWidth<=1000?9:11);
   el.style.fontSize=size+'px';
   const range=document.createRange();range.selectNodeContents(el);
   const fits=()=>{const text=range.getBoundingClientRect();return text.width<=el.clientWidth-6&&text.height<=el.clientHeight-6;};
   while(size>6.5&&!fits()){size-=.5;el.style.fontSize=size+'px';}
  }
 }
 if(window.ResizeObserver)new ResizeObserver(fitViewLabels).observe(phoneBox);
 function requestRender(){if(lastFrame){const min=Math.max(lastFrame.R*5,lastFrame.L*.06),max=lastFrame.L*8;zoomSlider.value=String(100*(Math.log(max)-Math.log(cameraState.radius))/(Math.log(max)-Math.log(min)));}if(!active||!engine||scheduled)return;scheduled=requestAnimationFrame(()=>{scheduled=0;if(active){engine.render();window.dispatchEvent(new Event('billiards:3d-render'));}});}
 function orbit(dx,dy){rememberInspection();stopTransition();if(cameraState.playerView)leaveCueView(false,viewLocked);window.BilliardsTableOrbit.orbit(cameraState,dx,dy);requestRender();}
 function zoom(factor){rememberInspection();stopTransition();if(cameraState.playerView)leaveCueView(false,viewLocked);if(!lastFrame)return;window.BilliardsTableOrbit.zoom(cameraState,factor,lastFrame.L,lastFrame.R);requestRender();}
 // Keep the longer screen dimension at a natural 58° field of view.
 function viewTangent(aspect){return window.BilliardsTableOrbit.viewTangent(aspect);}
 function leaveCueView(restore, adjustmentMode=previousCueCamera?.editMode) {
  const from={...cameraState,target:{...cameraState.target}};
  cameraState.playerView=false;
  cameraState.playerInShot=false;
  if(previousCueCamera) {
   if(restore) Object.assign(cameraState,previousCueCamera.pose);
   if(viewLocked!==adjustmentMode) setViewLocked(adjustmentMode);
   previousCueCamera=null;
  }
  if(restore)transitionFrom(from);
  requestRender();
 }
 function standing(heading=cameraState.azimuth) {
  if(!lastFrame)return;
  if(viewLocked)setViewLocked(false);
  const from={...cameraState,target:{...cameraState.target}};
  leaveCueView(false);
  cameraState.followCue=false;
  const rect=(active?document.getElementById('table3DCanvas'):stage).getBoundingClientRect();
  const aspect=rect.width/Math.max(1,rect.height),tan=viewTangent(aspect);
  // At an end-on tie either long rail is equally near. Use the head-left view.
  const azimuth=Math.cos(heading)<-1e-10?Math.PI:0;
  const elevation=Math.PI/3,cs=Math.cos(elevation),sn=Math.sin(elevation);
  const rail=window.BilliardsTableConstruction.railWidth;
  const halfLength=lastFrame.L/2+rail,halfWidth=lastFrame.W/2+rail;
  let radius=.94;
  for(const z of [-halfWidth,halfWidth]) {
   for(const height of [0,.044]) {
    const depthOffset=cs*z+sn*height,up=cs*height-sn*z;
    radius=Math.max(radius,depthOffset+halfLength/(tan*aspect*.96),depthOffset+Math.abs(up)/(tan*.88));
   }
  }
  Object.assign(cameraState,{target:{x:0,y:0,z:0},azimuth,radius,elevation});transitionFrom(from);
  requestRender();
 }
 // Follow the direction of travel without moving the ball or its simulation clock.
 function updateCueFollow(state,f,snap=false){
  const b=f.balls.find(b=>b.id===0&&b.active);if(!b)return false;
  // A cloth edit changes the aim point through a ray cast from this camera.
  // Keep that projection fixed until a shot starts or the user picks a new view.
  if(!snap && !f.animating && Number.isFinite(state.followHeading)){
   state.followAnimating=false;
   return true;
  }
  const moving=f.animating&&Math.hypot(b.vx||0,b.vy||0)>.004;
  let heading=state.followHeading;
  if(moving){
   const desired=Math.atan2(b.vy,b.vx),time=Number.isFinite(b.t)?b.t:0;
   if(snap||!Number.isFinite(heading)||!state.followAnimating||time<state.followTime)heading=desired;
   else{const dt=Math.max(0,time-state.followTime),turn=Math.atan2(Math.sin(desired-heading),Math.cos(desired-heading));heading+=turn*(1-Math.exp(-dt/.06));}
   state.followTime=time;
  }else if(!Number.isFinite(heading)){
   const a=f.aim;heading=a?Math.atan2(a.target.y-a.cue.y,a.target.x-a.cue.x):0;
  }
  state.followHeading=heading;state.followAnimating=!!f.animating;
  if(moving)state.followHasMotion=true;
  const offset={behind:0,front:Math.PI,left:-Math.PI/2,right:Math.PI/2}[state.followSide]||0;
  state.azimuth=Math.atan2(-Math.cos(heading),-Math.sin(heading))+offset;
  state.target={x:b.x-f.L/2,y:Number.isFinite(b.z)?Math.max(f.R,b.z):f.R,z:b.y-f.W/2};
  return true;
 }
 function disable(){if(!active)return;if(cameraState.playerView)leaveCueView(true);closePopovers();setDrawer(false);active=false;document.body.classList.remove('table-3d','table-3d-locked','table-3d-pan','table-3d-rotate');button.setAttribute('aria-pressed','false');button.textContent='3D';for(const b of [button,standingButton,alongButton])b.style.removeProperty('font-size');tools.hidden=true;for(const b of [standingButton,alongButton,viewLock])b.hidden=true;engine?.stop();window.dispatchEvent(new Event('resize'));}
 async function enable(){
  if(active)return true;if(loading)return false;loading=true;button.disabled=true;status.textContent='';
  // Request within the entry gesture, before loading WebGL can consume activation.
  window.BilliardsDisplay?.enter(true);
  try{if(!engine){const [three]=await Promise.all([import('./vendor/three/three-renderer.js?v=4'),import('./trainer-table-construction.js?v=2'),import('./trainer-zen-shapes.js?v=1')]);engine=createEngine(three);}if(document.getElementById('tableZoom')?.getAttribute('aria-pressed')==='true')document.getElementById('tableZoom').click();
   active=true;document.body.classList.add('table-3d');button.setAttribute('aria-pressed','true');button.textContent='2D';tools.hidden=false;for(const b of [standingButton,alongButton,viewLock])b.hidden=false;positionToggle();
   if(document.body.classList.contains('phone-controls-open'))document.getElementById('phoneControls').click();
   window.billiardsControlLayout?.();dock();setDrawer(false);window.dispatchEvent(new Event('resize'));standing();setViewLocked(viewLocked);setPanEnabled(panEnabled);window.BilliardsSpinLabUI?.onCameraReady();requestRender();
  }catch(error){disable();status.textContent='3D view is unavailable on this device. The top-down table is ready.';console.warn('3D camera unavailable:',error.message);}
  finally{loading=false;button.disabled=false;}
  return active;
 }
 button.onclick=()=>active?disable():enable();
 window.Billiards3D={arrangeBalls(value){if(viewLocked!==!!value)setViewLocked(value);},enable,get active(){return active;},get locked(){return active&&viewLocked;},get panning(){return active&&panEnabled;},project(point,height=0){return engine?.project(point,height)||null;},update(frame){lastFrame=frame;if(active){syncBallTools();engine?.update(frame);requestRender();}},disable,
  focusCue(){
   if(!active||!lastFrame)return false;
   const b=lastFrame.balls.find(b=>b.id===0&&b.active);
   if(!b)return false;
   const wide=cameraState.followDistance==='wide';
   cameraState.radius=wide?Math.max(lastFrame.L*.42,lastFrame.R*28):Math.max(.35,lastFrame.R*12);
   cameraState.elevation=wide ? .52 : .35;
   cameraState.target={x:b.x-lastFrame.L/2,y:lastFrame.R,z:b.y-lastFrame.W/2};
   if(cameraState.followCue)updateCueFollow(cameraState,lastFrame,true);
   requestRender();
   return true;
  },
  followCue(value,side=cameraState.followSide||'behind',distance=cameraState.followDistance||'close'){
   cameraState.followSide=['front','behind','left','right'].includes(side)?side:'behind';
   cameraState.followDistance=distance==='wide'?'wide':'close';
   if(value&&cameraState.playerView)leaveCueView(false);
   if(value&&!cameraState.followCue){cameraState.followHeading=undefined;cameraState.followHasMotion=false;}
   cameraState.followCue=!!value;
   if(value)this.focusCue();
   window.BilliardsSpinLabUI?.sync();
  },
  playerView(settings={}){
   if(!active||!lastFrame?.cuePose)return false;
   if(viewLocked)setViewLocked(false);
   const from={...cameraState,target:{...cameraState.target}};
   if(!cameraState.playerView)previousCueCamera={editMode:viewLocked,pose:{azimuth:cameraState.azimuth,elevation:cameraState.elevation,radius:cameraState.radius,target:{...cameraState.target}}};
   cameraState.playerView=true;cameraState.playerViewLock=settings.locked!==false;cameraState.playerEyeHeight=window.BilliardsCue3D.clampEyeHeight(settings.height);cameraState.playerDistance=.75;cameraState.playerInShot=false;cameraState.followCue=false;transitionFrom(from,'cue');requestRender();return true;
  },exitCueView(){leaveCueView(true);},refresh(){requestRender();},
  camera(){return {transitioning:!!cameraTransition,transitionDuration:cameraTransition?.duration||0,approachProgress:cueApproachProgress,playerView:!!cameraState.playerView,playerViewLock:!!cameraState.playerViewLock,playerEyeHeight:cameraState.playerEyeHeight||.12,playerDistance:cameraState.playerDistance||.75,azimuth:cameraState.azimuth,elevation:cameraState.elevation,radius:cameraState.radius,target:{...cameraState.target},followCue:!!cameraState.followCue,followSide:cameraState.followSide||'behind',followDistance:cameraState.followDistance||'close',followHeading:cameraState.followHeading,followHasMotion:!!cameraState.followHasMotion,...engine?.projection()};},restoreCamera(saved){
   if(!saved||![saved.azimuth,saved.elevation,saved.radius,saved.target?.x,saved.target?.y,saved.target?.z].every(Number.isFinite))return false;
   const from={...cameraState,target:{...cameraState.target}};
   Object.assign(cameraState,{playerView:!!saved.playerView,playerViewLock:!!saved.playerViewLock,playerEyeHeight:window.BilliardsCue3D.clampEyeHeight(saved.playerEyeHeight),playerDistance:saved.playerDistance||.75,playerInShot:false,azimuth:saved.azimuth,elevation:saved.elevation,radius:saved.radius,target:{...saved.target},followCue:!!saved.followCue,followSide:['front','behind','left','right'].includes(saved.followSide)?saved.followSide:'behind',followDistance:saved.followDistance==='wide'?'wide':'close',followHeading:saved.followHeading,followHasMotion:!!saved.followHasMotion,followAnimating:false});
   transitionFrom(from);requestRender();window.BilliardsSpinLabUI?.sync();return true;
  },prepareSnapshot(){standing(0);},renderSnapshot(){engine?.render();},tablePlanePoint(event){return engine?.tablePlanePoint(event)||null;},tablePoint(event){return engine?.tablePoint(event)||null;},renderedBalls(){return engine?.ballViews()||[];},ghostGuides(){return engine?.ghostViews()||[];},pocketGeometry(){return engine?.pocketViews()||[];},railGeometry(){return engine?.railViews()||[];},contactMarkers(){return engine?.contactViews()||[];},cueModel(){return engine?.cueView()||null;},overlayLabels(){return engine?.labelViews()||[];}};
 window.addEventListener('resize',()=>{dock();positionToggle();requestRender();});new MutationObserver(positionToggle).observe(document.getElementById('tableZoom'),{attributes:true,attributeFilter:['style']});document.addEventListener('visibilitychange',()=>{if(!document.hidden)requestRender();});
 function createEngine(T){
  const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setClearColor(0x080d13);renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
  const canvas=renderer.domElement;canvas.style.removeProperty('display');canvas.id='table3DCanvas';canvas.tabIndex=0;canvas.setAttribute('aria-label','3D table. Drag to rotate and tilt. Use Lock view for ball placement and aiming.');canvas.setAttribute('role','img');stage.append(canvas);
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(44,1,.01,100),table=new T.Group(),balls=new T.Group();scene.add(table,balls);scene.fog=new T.Fog(0x080d13,7,25);
  scene.add(new T.HemisphereLight(0xf2f5f4,0x303941,.75));
  const light=new T.DirectionalLight(0xfff8ed,1.8);light.position.set(-3,5,2);light.castShadow=true;
  light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:.2,far:14});light.shadow.normalBias=.002;light.shadow.bias=-.00015;scene.add(light);
  // A quiet room reflection gives polished resin a soft overhead sheen.
  const roomCanvas=document.createElement('canvas');roomCanvas.width=512;roomCanvas.height=256;
  const roomCtx=roomCanvas.getContext('2d'),roomGradient=roomCtx.createLinearGradient(0,0,0,256);
  roomGradient.addColorStop(0,'#a0aaad');roomGradient.addColorStop(.5,'#505c62');roomGradient.addColorStop(1,'#192126');roomCtx.fillStyle=roomGradient;roomCtx.fillRect(0,0,512,256);
  roomCtx.filter='blur(6px)';roomCtx.fillStyle='#f4f2e8';roomCtx.fillRect(45,28,155,38);roomCtx.fillRect(290,28,165,38);
  const room=new T.CanvasTexture(roomCanvas);room.mapping=T.EquirectangularReflectionMapping;room.colorSpace=T.SRGBColorSpace;scene.environment=room;scene.environmentIntensity=.55;
  const floor=new T.Mesh(new T.PlaneGeometry(100,100),new T.MeshStandardMaterial({color:0x131b21,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.82;floor.receiveShadow=true;scene.add(floor);
  const textureCanvas=document.createElement('canvas'),textureCtx=textureCanvas.getContext('2d'),texture=new T.CanvasTexture(textureCanvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const surfaceMaterial=new T.MeshStandardMaterial({map:texture,color:0xcbd4cf,roughness:.98,envMapIntensity:.15}),bodyMaterial=new T.MeshStandardMaterial({color:0x252b30,roughness:.64}),legMaterial=new T.MeshStandardMaterial({color:0x20272c,roughness:.6});
  const sphere=new T.SphereGeometry(1,40,28),ballMeshes=new Map(),materials=new Map(),contacts=new Map(),contactGroup=new T.Group();scene.add(contactGroup);let dimensions='',dirty=true,lastSize='',frame=null,pocketSpecs=[];const rollStep=new T.Quaternion(),rollAxis=new T.Vector3();
  const ghostGroup=new T.Group(),ghostMeshes=new Map();scene.add(ghostGroup);
  const realCue=window.BilliardsCue3D?.create(T,scene,renderer,requestRender);
  // Teaching text stays flat on its original cloth location; only its heading follows the view.
  const cameraLabels=new Map(),labelGeometry=new T.PlaneGeometry(1,1),clothNormal=new T.Vector3(0,1,0),clothRotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),-Math.PI/2);
  function updateCameraLabels(f){
   const visible=new Set();
   for(const data of f.cameraLabels||[]){
    visible.add(data.id);let label=cameraLabels.get(data.id);
    if(!label){const image=document.createElement('canvas'),map=new T.CanvasTexture(image);map.colorSpace=T.SRGBColorSpace;map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());label=new T.Mesh(labelGeometry,new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,depthTest:true,toneMapped:false}));label.renderOrder=1;scene.add(label);cameraLabels.set(data.id,label);}
    const key=JSON.stringify([data.rows,data.size,data.rowGap,data.weight,data.stroke,data.color]);
    if(label.userData.key!==key){
     const image=label.material.map.image,c=image.getContext('2d'),resolution=4,size=data.size*resolution,line=(data.size+data.rowGap)*resolution,pad=2*resolution;
     c.font=data.weight+' '+size+'px Segoe UI, sans-serif';const width=Math.ceil(Math.max(...data.rows.map(t=>c.measureText(t).width)))+pad*2;
     label.material.map.dispose();image.width=width;image.height=line*data.rows.length+pad*2;
     c.font=data.weight+' '+size+'px Segoe UI, sans-serif';c.textBaseline='middle';c.lineWidth=2*resolution;c.strokeStyle='#153c4866';c.fillStyle=data.color||'#fff';
     data.rows.forEach((text,i)=>{if(data.stroke)c.strokeText(text,pad,pad+line*(i+.5));c.fillText(text,pad,pad+line*(i+.5));});
     label.material.map.needsUpdate=true;label.userData.key=key;
    }
    label.visible=true;label.position.set(data.point.x-f.L/2,.0002,data.point.y-f.W/2);
    label.quaternion.setFromAxisAngle(clothNormal,cameraState.azimuth).multiply(clothRotation);
    label.scale.set(data.width+4*data.unitsPerPixel,data.height+4*data.unitsPerPixel,1);
    label.material.opacity=data.opacity;label.userData.data=data;
   }
   for(const [id,label]of cameraLabels)if(!visible.has(id))label.visible=false;
  }

  const ghostMaterial=new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.14,depthWrite:false,toneMapped:false});
  const ghostCoreMaterial=new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.82,depthWrite:false,toneMapped:false});
  // A world-up core stays centered from every viewing direction, including cue height.
  const ghostCore=new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0,-.94,0),new T.Vector3(0,.94,0)]),1,.022,8,false);
  function updateGhosts(f){
   const visible=new Set();
   for(const guide of f.animating?[]:(f.ghostBalls||[])){
    visible.add(guide.kind);let group=ghostMeshes.get(guide.kind);
    if(!group){
     group=new T.Group();const shell=new T.Mesh(sphere,ghostMaterial),core=new T.Mesh(ghostCore,ghostCoreMaterial);
     shell.renderOrder=1;core.renderOrder=2;group.add(shell,core);ghostGroup.add(group);ghostMeshes.set(guide.kind,group);
    }
    group.userData.guide=guide;group.visible=true;group.position.set(guide.x-f.L/2,Math.max(f.R,guide.z||f.R),guide.y-f.W/2);group.scale.setScalar(f.R);
   }
   for(const [kind,group]of ghostMeshes)if(!visible.has(kind))group.visible=false;
  }
  function ballMaterial(id,style='current'){
   const key=id===0?'cue-'+style:id;
   if(materials.has(key))return materials.get(key);
   const map=new T.CanvasTexture(window.BilliardsBallArt.texture(id,style));map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
   const material=new T.MeshStandardMaterial({map,roughness:.20,metalness:0,envMapIntensity:.85});
   materials.set(key,material);return material;
  }
  const contactCanvas=document.createElement('canvas');contactCanvas.width=contactCanvas.height=64;const contactCtx=contactCanvas.getContext('2d'),contactGradient=contactCtx.createRadialGradient(32,32,2,32,32,30);
  contactGradient.addColorStop(0,'rgba(0,0,0,.24)');contactGradient.addColorStop(.45,'rgba(0,0,0,.13)');contactGradient.addColorStop(1,'rgba(0,0,0,0)');contactCtx.fillStyle=contactGradient;contactCtx.fillRect(0,0,64,64);
  const contactTexture=new T.CanvasTexture(contactCanvas),contactGeometry=new T.PlaneGeometry(1,1);contactGeometry.rotateX(-Math.PI/2);
  const tipMarkers=new Map(),tipGroup=new T.Group();scene.add(tipGroup);
  const tipRing=new T.SphereGeometry(1.006,24,10,0,Math.PI*2,0,.12),tipDot=new T.SphereGeometry(1.009,24,10,0,Math.PI*2,0,.085);
  const tipRingMaterial=new T.MeshBasicMaterial({color:0xfff8df,toneMapped:false}),tipDotMaterial=new T.MeshBasicMaterial({color:0xff3535,toneMapped:false});
  function updateTipMarkers(f){
   const showing=new Set();
   for(const tip of f.cueTips||[]){
    const ball=ballMeshes.get(tip.id);if(!ball?.visible)continue;showing.add(tip.id);let marker=tipMarkers.get(tip.id);
    if(!marker){marker=new T.Group();marker.add(new T.Mesh(tipRing,tipRingMaterial),new T.Mesh(tipDot,tipDotMaterial));tipGroup.add(marker);tipMarkers.set(tip.id,marker);}
    const direction=new T.Vector3(tip.dx*tip.rear-tip.dy*tip.sideR,tip.height,tip.dy*tip.rear+tip.dx*tip.sideR).normalize();
    marker.visible=true;marker.position.copy(ball.position);marker.scale.setScalar(f.R);marker.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction);marker.userData.tip={...tip,normal:direction.toArray()};
   }
   for(const [id,marker]of tipMarkers)if(!showing.has(id))marker.visible=false;
  }
  function box(w,h,d,x,y,z,material){const mesh=new T.Mesh(new T.RoundedBoxGeometry(w,h,d,2,Math.min(.014,h*.2,w*.1,d*.1)),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;table.add(mesh);}
  let tablePlan=null,materialMapsReady=0;
  function materialMap(file,srgb=false){
   const tile=document.createElement('canvas');tile.width=tile.height=1024;const paint=tile.getContext('2d');paint.fillStyle='#ffffff';paint.fillRect(0,0,1024,1024);
   const map=new T.CanvasTexture(tile);if(srgb)map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=1000;map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
   // Keep GPU storage dimensions stable when the photographed material arrives.
   const image=new Image();image.onload=()=>{paint.drawImage(image,0,0,1024,1024);map.needsUpdate=true;materialMapsReady++;requestRender();};image.src='./icons/table-materials/'+file;return map;
  }
  const woodMap=materialMap('walnut-diff.jpg',true),woodRoughness=materialMap('walnut-rough.jpg');
  const woodMaterial=new T.MeshStandardMaterial({map:woodMap,roughnessMap:woodRoughness,color:0x79523e,roughness:.26,envMapIntensity:.9});
  const weave=document.createElement('canvas');weave.width=weave.height=128;const weavePaint=weave.getContext('2d'),weavePixels=weavePaint.createImageData(128,128);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4,v=128+((x+y)%2?8:-8)+((x*17+y*31)%7-3);weavePixels.data.set([v,v,v,255],i);}weavePaint.putImageData(weavePixels,0,0);
  const clothBump=new T.CanvasTexture(weave);clothBump.wrapS=clothBump.wrapT=1000;clothBump.repeat.set(24,12);surfaceMaterial.bumpMap=clothBump;surfaceMaterial.bumpScale=.000005;
  const cushionBump=new T.CanvasTexture(weave);cushionBump.wrapS=cushionBump.wrapT=1000;
  const cushionMaterial=new T.MeshStandardMaterial({color:0x2e7487,roughness:.93,bumpMap:cushionBump,bumpScale:.000006,envMapIntensity:.12,side:T.DoubleSide});
  const pocketLiner=new T.MeshStandardMaterial({color:0x0b0d0e,roughness:.85,side:T.DoubleSide,envMapIntensity:.08});
  const pocketLip=new T.MeshStandardMaterial({color:0x111416,roughness:.8,side:T.DoubleSide,envMapIntensity:.12});
  const sightMaterial=new T.MeshStandardMaterial({color:0xddd9c9,roughness:.32,envMapIntensity:.45});
  function tableKey(f){return [f.L,f.W,f.R,JSON.stringify(f.G||{}),f.showDiamonds].join(':');}
  function polygon(points){const s=new T.Shape();points.forEach((p,i)=>i?s.lineTo(p[0],-p[2]):s.moveTo(p[0],-p[2]));s.closePath();return s;}
  function addMesh(vertices,indices,material,tag,uvs=null){
   const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);if(uvs)geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.computeVertexNormals();
   const mesh=new T.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=false;mesh.userData.construction=tag;table.add(mesh);return mesh;
  }
  function joinRows(rows,material,tag){
   const vertices=[],indices=[];for(const row of rows)for(const p of row)vertices.push(...p);
   const count=rows[0].length;for(let i=1;i<rows.length;i++)for(let j=1;j<count;j++){const a=(i-1)*count+j-1,b=i*count+j-1;indices.push(a,b,a+1,a+1,b,b+1);}return addMesh(vertices,indices,material,tag);
  }
  function addCushion(r,plan){
   const profile=plan.profile,vertices=[],uvs=[],indices=[],count=profile.length;
   const rows=Math.ceil(r.length/.012);
   for(let row=0;row<=rows;row++)for(const [t,h]of profile){const a=r.at(0,t*r.depth,h),b=r.at(1,t*r.depth,h),fraction=row/rows;vertices.push(...a.map((v,i)=>v+(b[i]-v)*fraction));uvs.push(fraction*r.length/.12,t*r.depth/.12);}
   for(let row=0;row<rows;row++)for(let j=0;j<count;j++){const k=(j+1)%count,a=row*count,b=(row+1)*count;indices.push(a+j,a+k,b+j,a+k,b+k,b+j);}
   for(const end of [0,1]){
    const shape=new T.Shape();profile.forEach(([t,h],i)=>i?shape.lineTo(t*r.depth,h):shape.moveTo(t*r.depth,h));shape.closePath();
    const face=new T.ShapeGeometry(shape),pos=face.attributes.position,base=vertices.length/3;
    for(let j=0;j<pos.count;j++){const v=pos.getX(j),h=pos.getY(j);vertices.push(...r.at(end,v,h));uvs.push(v/.12,h/.12);}
    const order=face.index.array;for(let j=0;j<order.length;j+=3)indices.push(base+order[j],base+order[j+(end?2:1)],base+order[j+(end?1:2)]);face.dispose();
   }
   const mesh=addMesh(vertices,indices,cushionMaterial,'cushion',uvs);mesh.userData.elastic='cushion';mesh.userData.undeformed=mesh.geometry.attributes.position.array.slice();
  }
  let elasticKey='';
  function updateElastic(f){
   const pose=realCue?.status(),key=pose&&pose.visible?JSON.stringify([pose.tip,pose.back,f.L,f.W]):'rest';if(key===elasticKey)return;elasticKey=key;
   let reach=null;
   if(pose?.visible){
    const axis=pose.back,tip=pose.tip,cos=Math.hypot(axis[0],axis[2]);
    if(cos>=.25){
     const top=tablePlan.capHeight+.002+.016/cos;
     const length=axis[1]>0?Math.min(pose.length,(top-tip[1])/axis[1]):pose.length;
     if(length>=0){
      const x=tip[0]-f.L/2,z=tip[2]-f.W/2,endX=x+axis[0]*length,endZ=z+axis[2]*length;
      reach={left:Math.min(x,endX)-.03,right:Math.max(x,endX)+.03,bottom:Math.min(z,endZ)-.03,top:Math.max(z,endZ)+.03};
     }
    }
   }
   for(const mesh of table.children){
    const original=mesh.userData.undeformed;if(!original)continue;
    if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
    const bounds=mesh.geometry.boundingBox;
    const near=reach&&reach.left<=bounds.max.x&&reach.right>=bounds.min.x&&reach.bottom<=bounds.max.z&&reach.top>=bounds.min.z;
    if(!near&&!mesh.userData.deformed)continue;
    const attr=mesh.geometry.attributes.position;
    let changed=false,deformed=false;
    for(let i=0;i<attr.count;i++){
     const j=i*3+1;
     const dent=near?window.BilliardsCueClearance.depression([original[j-1]+f.L/2,original[j],original[j+1]+f.W/2],pose,mesh.userData.elastic):0;
     const y=Math.fround(original[j]-dent);
     if(y!==original[j])deformed=true;
     if(attr.array[j]!==y){attr.array[j]=y;changed=true;}
    }
    mesh.userData.deformed=deformed;
    if(changed){attr.needsUpdate=true;mesh.geometry.computeVertexNormals();}
   }
  }
  function pocketNormal(path,i,closed=false){const last=path.length-1,a=path[closed?(i===0?last-1:i-1):Math.max(0,i-1)],b=path[closed?(i>=last-1?i===last-1?last:1:i+1):Math.min(last,i+1)],dx=b[0]-a[0],dz=b[2]-a[2],length=Math.hypot(dx,dz)||1;return [dz/length,-dx/length];}
  function addPocket(p,plan){
   const radius=plan.edgeRadius;
   const circle=p.dropPath.map((v,i)=>{const [nx,nz]=pocketNormal(p.dropPath,i,true);return [v[0]-nx*radius,-radius,v[2]-nz*radius];});
   const hole=polygon(circle),floorGeometry=new T.ShapeGeometry(hole,48);floorGeometry.rotateX(-Math.PI/2);const floor=new T.Mesh(floorGeometry,pocketLiner);floor.position.y=-.19;floor.receiveShadow=true;floor.userData.construction='well-floor';table.add(floor);
   joinRows([circle,circle.map(v=>[v[0],-.19,v[2]])],pocketLiner,'well-wall');
   // Cloth follows the machined, rounded slate cut; no black mouth disk or tube.
   const bevel=[];for(let j=0;j<=12;j++){const theta=j/12*Math.PI/2,inset=radius*Math.sin(theta),h=-radius*(1-Math.cos(theta));bevel.push(p.frontPath.map((v,i)=>{const [nx,nz]=pocketNormal(p.frontPath,i);return [v[0]-nx*inset,h,v[2]-nz*inset];}));}
   const edge=joinRows(bevel,surfaceMaterial,'slate-roundover'),positions=edge.geometry.attributes.position,uvs=[];
   for(let i=0;i<positions.count;i++)uvs.push((positions.getX(i)+(plan.L+2*plan.railWidth)/2)/(plan.L+2*plan.railWidth),((plan.W+2*plan.railWidth)/2-positions.getZ(i))/(plan.W+2*plan.railWidth));
   edge.geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));p.edge=edge;
   const inner=[],outer=[];
   p.innerBackPath.forEach((v,i)=>{const [nx,nz]=pocketNormal(p.innerBackPath,i),back=p.backPath[i];inner.push([v[0]-nx*plan.linerInset,plan.capHeight+.0006,v[2]-nz*plan.linerInset]);outer.push([back[0],plan.capHeight+.0006,back[2]]);});
   // The liner has thickness and sits inside the wood, avoiding coplanar faces.
   const liner=joinRows([inner.map(v=>[v[0],-.025,v[2]]),inner],pocketLip,'flush-pocket-liner');liner.userData.elastic='pocket';liner.userData.undeformed=liner.geometry.attributes.position.array.slice();
   // A flat, separately shaded flange avoids the inflated rolled-rubber appearance.
   const flange=joinRows([inner,outer],pocketLip,'pocket-flange');flange.userData.elastic='pocket';flange.userData.undeformed=flange.geometry.attributes.position.array.slice();
   const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');x.fillStyle='#dedacb';x.font='600 42px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText(p.id,32,34);
   const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;const material=new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,toneMapped:false});material.userData.pocketOwned=true;
   const label=new T.Mesh(new T.PlaneGeometry(.021,.021),material);const pos=p.at(p.rear+.023,0,plan.capHeight+.001);label.position.fromArray(pos);label.rotation.set(-Math.PI/2,0,-Math.atan2(p.n[0],p.n[1]));table.add(label);
  }
  function rebuild(f){
   for(const child of [...table.children]){table.remove(child);child.geometry.dispose();for(const m of Array.isArray(child.material)?child.material:[child.material])if(m.userData.pocketOwned){m.map?.dispose();m.dispose();}}
   elasticKey='';const plan=tablePlan=window.BilliardsTableConstruction.plan(f),margin=plan.railWidth,w=f.L+margin*2,d=f.W+margin*2;
   pocketSpecs=plan.pockets.map(p=>({...p,probe:new T.Vector3(...p.center),shelfProbe:new T.Vector3(...p.at(p.front-.005,p.centerT)),back:new T.Vector3(...p.at(p.innerRear+plan.linerWidth*.5,p.centerT)),wood:new T.Vector3(...p.at(p.rear+.006,p.centerT))}));
   const outline=polygon(plan.outer);for(const p of pocketSpecs)outline.holes.push(polygon(p.dropPath));
   const geometry=new T.ShapeGeometry(outline,32);geometry.rotateX(-Math.PI/2);const uv=geometry.attributes.uv,positions=geometry.attributes.position;
   for(let i=0;i<positions.count;i++)uv.setXY(i,(positions.getX(i)+w/2)/w,(d/2-positions.getZ(i))/d);
   const bed=new T.Mesh(geometry,surfaceMaterial);bed.receiveShadow=true;bed.userData.construction='slate';table.add(bed);
   const caseGeometry=new T.ExtrudeGeometry(outline,{depth:.255,steps:1,curveSegments:32,bevelEnabled:false});caseGeometry.rotateX(-Math.PI/2);const body=new T.Mesh(caseGeometry,bodyMaterial);body.position.y=-.26;body.castShadow=true;body.receiveShadow=true;table.add(body);
   const capOutline=polygon(plan.outer);capOutline.holes.push(polygon(plan.inside));
   const capGeometry=new T.ExtrudeGeometry(capOutline,{depth:.076,steps:1,curveSegments:32,bevelEnabled:false});capGeometry.rotateX(-Math.PI/2);
   const capUV=capGeometry.attributes.uv,capP=capGeometry.attributes.position;
   for(let i=0;i<capP.count;i++){const x=capP.getX(i),z=capP.getZ(i),end=Math.abs(x)>f.L/2+plan.cushionWidth&&Math.abs(z)<f.W/2;capUV.setXY(i,(end?x:z)/1.8,(end?z:x)/1.8);}
   const cap=new T.Mesh(capGeometry,[woodMaterial,pocketLip]);cap.position.y=-.032;cap.castShadow=true;cap.receiveShadow=false;cap.userData.construction='rail-cap';table.add(cap);
   for(const r of plan.rails)addCushion(r,plan);
   if(f.showDiamonds!==false)for(const point of plan.sights){
    const shape=new T.Shape();shape.absarc(0,0,plan.sightRadius,0,Math.PI*2,false);const geometry=new T.ShapeGeometry(shape,16);geometry.rotateX(-Math.PI/2);const mesh=new T.Mesh(geometry,sightMaterial);mesh.position.fromArray(point);mesh.userData.sight=true;mesh.userData.radius=plan.sightRadius;table.add(mesh);
   }
   for(const p of pocketSpecs)addPocket(p,plan);
   for(const x of [-w*.36,w*.36])for(const z of [-d*.31,d*.31])box(.12,.54,.12,x,-.54,z,legMaterial);
   dimensions=tableKey(f);renderer.shadowMap.needsUpdate=true;
  }
  const pointers=new Map();let edit=null,lastTap=null;
  // Screen-space panning translates camera and target together, preserving the
  // current tilt and shot-line angle even when looking nearly across the cloth.
  function pan(dx,dy){rememberInspection();stopTransition();if(cameraState.playerView)leaveCueView(false,viewLocked);
   window.BilliardsTableOrbit.pan(T,camera,cameraState,dx,dy,canvas.getBoundingClientRect().height);requestRender();
  }
  function overControls(e){return [...document.querySelectorAll('#phoneAimRail,#phoneSpeedRail,#phoneActions,.aimControlRow.activeAim,.tableSpeedControl.activeSpeed,.bottomSpinGroup.activeSpin,.phoneTipControl')].some(el=>{const r=el.getBoundingClientRect();return r.width&&r.height&&e.clientX>=r.left-5&&e.clientX<=r.right+5&&e.clientY>=r.top-5&&e.clientY<=r.bottom+5;});}
  const inputRay=new T.Raycaster();
  function cast(e){const r=canvas.getBoundingClientRect();scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);inputRay.setFromCamera({x:2*(e.clientX-r.left)/r.width-1,y:1-2*(e.clientY-r.top)/r.height},camera);}
  function planePoint(height=0){const direction=inputRay.ray.direction;if(Math.abs(direction.y)<1e-6)return null;const distance=(height-inputRay.ray.origin.y)/direction.y;if(distance<0)return null;return inputRay.ray.at(distance,new T.Vector3());}
  function logical(p){const f=frame||lastFrame;return p&&f?{x:p.x+f.L/2,y:p.z+f.W/2}:null;}
  function pick(e){
   const f=frame||lastFrame;if(!f||f.animating)return null;cast(e);
   const obstruction=inputRay.intersectObjects(table.children,true).find(hit=>!hit.object.material?.userData?.pocketOwned);
   const hit=inputRay.intersectObjects([...ballMeshes.values()].filter(g=>g.visible),true)[0];
   if(!f.animating&&!(viewLocked&&hit&&(!obstruction||hit.distance<obstruction.distance+.00001))){
    for(const handle of window.billiardsGuidance?.aimHandles()||[]){
     const v=new T.Vector3(handle.point.x-f.L/2,0,handle.point.y-f.W/2).project(camera),r=canvas.getBoundingClientRect();
     if(v.z>=-1&&v.z<=1&&Math.hypot(e.clientX-r.left-(v.x+1)*r.width/2,e.clientY-r.top-(1-v.y)*r.height/2)<(e.pointerType==='touch'?20:12))return {editable:true,handle:true,shot:handle.shot,point:{...handle.point},height:0,offset:{x:0,z:0}};
    }
   }
   if(hit&&(!obstruction||hit.distance<obstruction.distance+.00001)){
    const group=hit.object.parent,point=planePoint(f.R);if(!point)return null;
    return {editable:true,ball:true,point:logical(group.position),height:f.R,offset:{x:point.x-group.position.x,z:point.z-group.position.z}};
   }
   const point=obstruction?.point||planePoint();if(!point)return null;
   const q=logical(point);if(q.x<-.3||q.x>f.L+.3||q.y<-.3||q.y>f.W+.3)return null;
   const surface=logical(planePoint()),onCloth=surface&&surface.x>=0&&surface.x<=f.L&&surface.y>=0&&surface.y<=f.W&&(!obstruction||Math.abs(obstruction.point.y)<.004);
   return {editable:onCloth||!!f.railEditing,point:onCloth?surface:q,height:0,offset:{x:0,z:0}};
  }
  function forward(type,point,e,aimShot=edit?.aimShot){return window.billiards3DTableInput?.(type,point,{aimShot,tableClient:{clientX:e.clientX,clientY:e.clientY},buttons:e.buttons??0,pointerId:e.pointerId||1,pointerType:e.pointerType||'mouse',shiftKey:!!e.shiftKey,altKey:!!e.altKey,ctrlKey:!!e.ctrlKey,metaKey:!!e.metaKey,deltaY:e.deltaY||0,deltaX:e.deltaX||0,deltaMode:e.deltaMode||0});}
  function finishEdit(type,event){
   const current=edit;
   edit=null;
   forward(type,current.last,event,current.aimShot);
   if(cameraState.playerView){transitionFrom({...cameraState,target:{...cameraState.target}});requestRender();}
  }
  function cancelInput(){if(edit)finishEdit('pointercancel',{pointerId:edit.id,pointerType:edit.pointerType});pointers.clear();}
  function pointerDown(e,outside=false){
   if(!active||e.button!==0||overControls(e))return;stopTransition();e.preventDefault();e.stopPropagation();canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});
   {if(edit){if(e.pointerId===edit.id)return;const first=edit;finishEdit('pointercancel',{pointerId:first.id,pointerType:first.pointerType});pointers.set(first.id,{x:first.cx,y:first.cy,sx:first.cx,sy:first.cy,multi:true,pendingViewDrag:true});}const hit=outside?null:pick(e);if(pointers.size===0&&hit?.editable&&(hit.handle||viewLocked&&hit.ball||lastFrame?.railEditing||lastFrame?.overlayEditing)){edit={aimShot:hit.handle?(hit.shot||1):0,id:e.pointerId,cx:e.clientX,cy:e.clientY,pointerType:e.pointerType,height:hit.height,offset:hit.offset,last:hit.point};if(!forward('pointerdown',hit.point,e))edit=null;return;}}
   pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,multi:pointers.size>0,pendingViewDrag:true});if(pointers.size>1){for(const p of pointers.values())p.multi=true;lastTap=null;}
  }
  canvas.addEventListener('pointerdown',e=>pointerDown(e));
  stage.addEventListener('pointerdown',e=>{if(e.target===stage)pointerDown(e,true);});
  canvas.addEventListener('pointermove',e=>{
   if(!pointers.has(e.pointerId)){if(!edit){if(!viewLocked){canvas.style.cursor=pick(e)?.handle?'crosshair':'grab';return;}cast(e);const q=logical(planePoint());if(q)forward('pointermove',q,e);canvas.style.cursor=source.style.cursor||'crosshair';return;}if(edit.id!==e.pointerId)return;e.preventDefault();e.stopPropagation();cast(e);const p=planePoint(edit.height);if(!p)return;const q=logical(new T.Vector3(p.x-edit.offset.x,0,p.z-edit.offset.z));edit.last=q;edit.cx=e.clientX;edit.cy=e.clientY;forward('pointermove',q,e);return;}
   const p=pointers.get(e.pointerId);if(!p)return;e.preventDefault();e.stopPropagation();
   // An off-cloth tap can generate small pointer moves on a tablet.
   if(p.pendingViewDrag){
    if(Math.hypot(e.clientX-p.sx,e.clientY-p.sy)<6)return;
    for(const point of pointers.values())point.pendingViewDrag=false;
   }
   window.BilliardsTableOrbit.move(pointers,e,{pan,zoom,orbit,panning:panEnabled});
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{
   if(edit?.id===e.pointerId)finishEdit(type==='pointerup'?'pointerup':'pointercancel',e);
   const point=pointers.get(e.pointerId);
   if(!viewLocked&&type==='pointerup'&&pointers.size===1&&point&&!point.multi&&!panEnabled&&Math.hypot(e.clientX-point.sx,e.clientY-point.sy)<6){const now=performance.now();if(lastTap&&now-lastTap.time<350&&Math.hypot(e.clientX-lastTap.x,e.clientY-lastTap.y)<20){focusBall(e);lastTap=null;}else lastTap={time:now,x:e.clientX,y:e.clientY};}else if(type!=='lostpointercapture')lastTap=null;
   pointers.delete(e.pointerId);e.stopPropagation();
  });
  canvas.addEventListener('wheel',e=>{e.preventDefault();e.stopPropagation();if(viewLocked&&pick(e)?.editable){cast(e);const p=logical(planePoint());if(p)forward('wheel',p,e);}else zoom(Math.exp(clamp(e.deltaY,-120,120)*.002));},{passive:false});
  function focusBall(e){cast(e);const hit=inputRay.intersectObjects([...ballMeshes.values()].filter(g=>g.visible),true)[0];if(!hit)return;const p=hit.object.parent.position;cameraState.target={x:p.x,y:p.y,z:p.z};cameraState.radius=.55;cameraState.elevation=8*Math.PI/180;requestRender();}
  canvas.addEventListener('keydown',e=>{if(viewLocked&&e.key.startsWith('Arrow')){e.preventDefault();return;}const actions={ArrowLeft:()=>orbit(-.08,0),ArrowRight:()=>orbit(.08,0),ArrowUp:()=>orbit(0,.06),ArrowDown:()=>orbit(0,-.06),'+':()=>zoom(.9),'-':()=>zoom(1.1),Escape:disable};if(actions[e.key]){e.preventDefault();e.stopPropagation();actions[e.key]();}});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();disable();status.textContent='3D graphics paused. The top-down table is ready.';});
  return {cueView(){return realCue?.status()||null;},labelViews(){return [...cameraLabels.values()].filter(m=>m.visible).map(m=>({...m.userData.data,center:m.position.toArray(),scale:m.scale.toArray(),rotation:m.quaternion.toArray(),depthTest:m.material.depthTest,azimuth:cameraState.azimuth}));},cancelInput,pan,tablePlanePoint(e){cast(e);return logical(planePoint());},tablePoint(e){cast(e);const q=logical(planePoint()),f=frame||lastFrame;return q&&f&&q.x>=0&&q.x<=f.L&&q.y>=0&&q.y<=f.W?q:null;},contactViews(){return [...tipMarkers].filter(([,m])=>m.visible).map(([id,m])=>({id,...m.userData.tip,center:m.position.toArray()}));},railViews(){return table.children.filter(m=>m.userData.sight).map(m=>({x:m.position.x,y:m.position.y,z:m.position.z,width:2*m.userData.radius,length:2*m.userData.radius}));},project(point,height=0){const f=frame||lastFrame;if(!f)return null;camera.updateMatrixWorld(true);const v=new T.Vector3(point.x-f.L/2,height,point.y-f.W/2).project(camera),r=canvas.getBoundingClientRect();return {x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2,visible:v.z>=-1&&v.z<=1};},ghostViews(){return [...ghostMeshes.values()].filter(g=>g.visible).map(g=>({...g.userData.guide,center:g.position.toArray(),radius:g.scale.x,opacity:ghostMaterial.opacity,coreOpacity:ghostCoreMaterial.opacity,coreColor:ghostCoreMaterial.color.getHex(),coreVertical:g.quaternion.toArray(),depthWrite:ghostMaterial.depthWrite}));},ballViews(){return [...ballMeshes].filter(([,g])=>g.visible).map(([id,g])=>({id,x:g.position.x,y:g.position.y,z:g.position.z,rotation:g.children[0].quaternion.toArray()}));},pocketViews(){scene.updateMatrixWorld(true);const ray=new T.Raycaster();return pocketSpecs.map(p=>{const height=v=>{ray.set(new T.Vector3(v.x,1,v.z),new T.Vector3(0,-1,0));return ray.intersectObjects(table.children,true).find(hit=>!hit.object.material?.userData?.pocketOwned)?.point.y;};ray.set(new T.Vector3(...p.at(p.centerN,0,.02)),new T.Vector3(p.n[0],0,p.n[1]));const lining=ray.intersectObjects(table.children,true)[0]?.object.userData.construction;return {id:p.id,lining,woodTextureWidth:woodMap.image.width,floorHeight:height(p.probe),backHeight:height(p.back),woodHeight:height(p.wood),shelfHeight:height(p.shelfProbe),shelfDepth:p.shelf,mouth:p.corner?tablePlan.G.cornerMouth:tablePlan.G.sideMouth,capHeight:tablePlan.capHeight,noseHeight:tablePlan.noseHeight,materialMapsReady,reference:tablePlan.reference.source,referenceSHA256:tablePlan.reference.sha256,visualMouth:p.visualMouth,linerWidth:tablePlan.linerWidth,linerInset:tablePlan.linerInset,edgeMaxHeight:Math.max(...p.edge.geometry.attributes.position.array.filter((v,i)=>i%3===1)),edgeMinHeight:Math.min(...p.edge.geometry.attributes.position.array.filter((v,i)=>i%3===1)),edgeTopNormalY:p.edge.geometry.attributes.normal.getY(24),woodTint:woodMaterial.color.getHex(),profile:tablePlan.profile};});},projection(){return {verticalFov:camera.fov,horizontalFov:2*Math.atan(Math.tan(camera.fov*Math.PI/360)*camera.aspect)*180/Math.PI};},stop(){cancelInput();},update(f){if(f.animating&&edit)cancelInput();frame=f;dirty=true;renderer.shadowMap.needsUpdate=true;},render(){
   const f=frame||lastFrame;if(!f)return;const rect=canvas.getBoundingClientRect();if(rect.width<1||rect.height<1)return;
   const size=rect.width+':'+rect.height;if(size!==lastSize){renderer.setSize(rect.width,rect.height);camera.aspect=rect.width/rect.height;camera.fov=2*Math.atan(viewTangent(camera.aspect))*180/Math.PI;camera.updateProjectionMatrix();lastSize=size;}
   if(dimensions!==tableKey(f))rebuild(f);
   if(dirty){const px=tablePlan.railWidth,pz=tablePlan.railWidth,a=f.map({x:-px,y:-pz}),b=f.map({x:f.L+px,y:f.W+pz}),ratio=source.width/source.clientWidth,w=Math.max(1,Math.round((b.x-a.x)*ratio)),h=Math.max(1,Math.round((b.y-a.y)*ratio));if(textureCanvas.width!==w||textureCanvas.height!==h){
    // WebGL texture storage is immutable. Reallocate after the tray or viewport
    // changes size so guides stay aligned and old edge pixels cannot remain.
    texture.dispose();textureCanvas.width=w;textureCanvas.height=h;
   }textureCtx.clearRect(0,0,w,h);textureCtx.drawImage(source,a.x*ratio,a.y*ratio,w,h,0,0,w,h);texture.needsUpdate=true;dirty=false;}
   // The finger is located on the cloth using this camera. Keep its projection
   // steady through the edit, then align with the completed shot on release.
   if(cameraState.playerView&&f.cuePose&&!edit){
    if(cameraState.playerInShot&&!f.animating&&!cameraState.playerViewLock)leaveCueView(true);
    else if(!f.animating||!cameraState.playerInShot){const p=window.BilliardsCue3D.playerCamera(f.cuePose,{height:cameraState.playerEyeHeight,distance:cameraState.playerDistance});Object.assign(cameraState,{azimuth:p.azimuth,elevation:p.elevation,radius:p.radius,target:{x:p.target[0]-f.L/2,y:p.target[1],z:p.target[2]-f.W/2}});}
    cameraState.playerInShot=!!f.animating;
   }
   if(cameraState.followCue)updateCueFollow(cameraState,f);
   const target=cameraState.target||{x:0,y:0,z:0};
   window.BilliardsTableOrbit.updateCamera(camera,renderedCamera(),camera.aspect);
   const visible=new Set();
   for(const b of f.balls){
    if(!b.active||b.marker)continue;visible.add(b.id);let group=ballMeshes.get(b.id);
    if(!group){group=new T.Group();const mesh=new T.Mesh(sphere,ballMaterial(b.id==='CB2'?0:b.id));mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);balls.add(group);ballMeshes.set(b.id,group);
     const contact=new T.Mesh(contactGeometry,new T.MeshBasicMaterial({map:contactTexture,transparent:true,depthWrite:false,toneMapped:false}));contactGroup.add(contact);contacts.set(b.id,contact);
    }
    const cue=b.id===0||b.id==='CB2';
    if(cue)group.children[0].material=ballMaterial(0,f.trainingBallStyle||'current');
    const orientation=cue?window.BilliardsTrainingBall.normalize(b.orientation):null;
    if(cue)group.children[0].quaternion.fromArray(orientation);
    const centerHeight=Number.isFinite(b.z)?Math.max(f.R,b.z):f.R,oldPosition=group.position.clone();
    group.visible=true;group.position.set(b.x-f.L/2,centerHeight,b.y-f.W/2);group.scale.setScalar(f.R);
    const viewKey=[cameraState.azimuth,cameraState.elevation,cameraState.radius,target.x,target.y,target.z].join(':');
    if(!cue&&!f.animating&&(group.userData.viewKey!==viewKey||(!group.userData.animating&&oldPosition.distanceTo(group.position)>.00001))){
     const dir=camera.position.clone().sub(group.position).normalize();group.children[0].quaternion.setFromUnitVectors(new T.Vector3(0,0,1),dir);group.children[0].rotateZ(((Number(b.id)||0)%5-2)*.06);
    }
    if(!cue&&f.animating&&Number.isFinite(b.t)){
     const reset=!group.userData.animating||b.t<(group.userData.lastTime||0),elapsed=Math.max(0,b.t-(reset?0:group.userData.lastTime));
     // Table coordinates use Z-up; the display uses Y-up, so angular velocity
     // transforms as a pseudovector. These are the simulator's actual spin rates.
     rollAxis.set(-(b.wx||0),-(b.wz||0),-(b.wy||0));
     if(!reset&&group.userData.omega)rollAxis.add(group.userData.omega).multiplyScalar(.5);
     const speed=rollAxis.length();if(speed>1e-8&&elapsed>0)group.children[0].quaternion.premultiply(rollStep.setFromAxisAngle(rollAxis.multiplyScalar(1/speed),speed*elapsed));
     group.userData.omega=new T.Vector3(-(b.wx||0),-(b.wz||0),-(b.wy||0));group.userData.lastTime=b.t;
    }
    group.userData.animating=!!f.animating;group.userData.viewKey=viewKey;
    const contact=contacts.get(b.id),height=Math.max(0,centerHeight-f.R);contact.visible=true;contact.position.set(group.position.x+f.R*.12,.001,group.position.z+f.R*.2);contact.scale.setScalar(f.R*2.8*(1+height));contact.material.opacity=1/(1+height*18);
   }
   for(const [id,group]of ballMeshes)if(!visible.has(id)){group.visible=false;contacts.get(id).visible=false;}

   updateTipMarkers(f);updateGhosts(f);if(realCue?.update({...f,cueApproachProgress,cueRoutineProgress}))requestRender();updateElastic(f);updateCameraLabels(f);renderer.render(scene,camera);
  }};
 }
})();
