/* Shared training-ball setup and shot playback controls. */
(() => {
 'use strict';
 const math=window.BilliardsTrainingBall,bridge=()=>window.billiardsTrainingBall,play=()=>window.billiardsPlayback;
 const video=document.getElementById('trainerClipTools');if(!video||!math||!bridge())return;
 const group=document.createElement('section');group.id='trainerTrainingBall';group.className='tableControlGroup layoutSetupGroup';
 group.innerHTML='<div class="tableControlTitle">CUE BALL</div><label for="trainingBallStyle">Ball appearance</label><select id="trainingBallStyle"><option value="current">Current cue ball</option><option value="spots">Six red spots</option><option value="split">Half red / white</option><option value="stripe">Black stripe</option></select><canvas id="trainingBallPreview" width="200" height="200" role="img" aria-label="Cue-facing ball preview. Drag to rotate the ball."></canvas><div class="hint">Drag the ball to rotate its markings. The blue ring shows cue-tip contact.</div><output id="trainingBallStatus" class="hint"></output>';
 document.getElementById('featureCueOptions').append(group);
 const row=document.createElement('div');row.className='trainingPlaybackSettings';row.innerHTML='<label for="trainerPlaybackSpeed">Shot playback speed</label><select id="trainerPlaybackSpeed" aria-describedby="trainerPlaybackHelp"><option value="1">Normal</option><option value="0.5">½ speed</option><option value="0.25">¼ speed</option><option value="0.125">⅛ speed</option></select><button id="trainerShowPlayback" type="button">Show playback controls</button><button id="trainerStopPlayback" type="button">Stop playback</button><div id="trainerPlaybackHelp" class="hint">Record shot saves this speed. Camera recorder captures the live demonstration.</div>';
 video.querySelector('#trainerClipArm').closest('.row').before(row);
 const bar=document.createElement('section');bar.id='trainerPlaybackBar';bar.setAttribute('aria-label','Shot playback');bar.innerHTML='<div id="trainerPlaybackBody" hidden><label class="playbackSpeedLabel">Speed <select id="trainerPlaybackQuickSpeed" aria-label="Quick playback speed"><option value="1">Normal</option><option value="0.5">½</option><option value="0.25">¼</option><option value="0.125">⅛</option></select></label><button id="trainerPlaybackPause" type="button" title="Play or pause shot">Play</button><button id="trainerPlaybackBack" type="button" aria-label="Previous shot frame" title="Previous shot frame">‹</button><button id="trainerPlaybackStep" type="button" aria-label="Next shot frame" title="Next shot frame">›</button><button id="trainerPlaybackReplay" type="button" title="Replay the last shot without changing the layout">Replay</button><button id="trainerPlaybackCloseup" type="button">Close-up</button><div class="playbackFollowOptions" role="group" aria-label="Follow camera"><label class="playbackFollow"><input id="trainerPlaybackFollowFront" data-follow-side="front" type="checkbox" aria-label="Follow from front">Front</label><label class="playbackFollow"><input id="trainerPlaybackFollow" data-follow-side="behind" type="checkbox" aria-label="Follow from behind">Behind</label><label class="playbackFollow"><input id="trainerPlaybackFollowLeft" data-follow-side="left" type="checkbox" aria-label="Follow from left">Left</label><label class="playbackFollow"><input id="trainerPlaybackFollowRight" data-follow-side="right" type="checkbox" aria-label="Follow from right">Right</label></div><button id="trainerPlaybackHide" type="button" aria-label="Hide playback controls" title="Hide controls; keep playback and camera following">×</button><output id="trainerPlaybackStatus"></output></div>';
 document.body.append(bar);
 const byId=id=>document.getElementById(id),preview=byId('trainingBallPreview'),style=byId('trainingBallStyle'),speed=byId('trainerPlaybackSpeed'),quick=byId('trainerPlaybackQuickSpeed'),body=byId('trainerPlaybackBody');
 let previewKey='',lastViewKey='',drag=null,opened=false,lastSync=-Infinity;
 const basis=d=>({right:[-d.y,0,d.x],up:[0,1,0],front:[-d.x,0,-d.y]});
 function position(){
  const camera=byId('trainerCameraBar');let top=8;
  if(innerWidth<=620&&innerHeight>innerWidth){
   for(const el of document.querySelectorAll('#table3DToggle,#phoneControls,[data-trainer-action=undoShot],[data-trainer-action=redoShot]')){const r=el.getBoundingClientRect();if(r.width&&r.height&&r.top<innerHeight/2)top=Math.max(top,r.bottom+8);}
  }
  if(camera&&!camera.hidden)top=Math.max(top,camera.getBoundingClientRect().bottom+8);
  bar.style.top=Math.max(8,Math.min(top,innerHeight-bar.getBoundingClientRect().height-8))+'px';
 }
 function show(value){opened=value;body.hidden=!value;bar.classList.toggle('expanded',value);byId('trainerShowPlayback').setAttribute('aria-expanded',String(value));byId('trainerShowPlayback').textContent=value?'Hide playback controls':'Show playback controls';position();}
 byId('trainerShowPlayback').setAttribute('aria-controls','trainerPlaybackBar');byId('trainerShowPlayback').setAttribute('aria-expanded','false');
 byId('trainerPlaybackHide').onclick=()=>show(false);byId('trainerShowPlayback').onclick=()=>show(!opened);
 for(const select of [speed,quick])select.onchange=()=>{play().speed(Number(select.value));if(Number(select.value)<1)show(true);sync();};
 byId('trainerPlaybackPause').onclick=()=>{play().pause();sync();};
 byId('trainerPlaybackBack').onclick=()=>{play().step(-1);sync();};byId('trainerPlaybackStep').onclick=()=>{play().step(1);sync();};
 byId('trainerPlaybackReplay').onclick=()=>{play().replay();sync();};
 byId('trainerPlaybackCloseup').onclick=()=>window.Billiards3D?.focusCue();
 for(const input of bar.querySelectorAll('[data-follow-side]'))input.onchange=e=>{window.Billiards3D?.followCue(e.target.checked,input.dataset.followSide);sync();};
 byId('trainerStopPlayback').onclick=()=>{play().stop();sync();};
 style.onchange=()=>{bridge().set(style.value);previewKey='';sync();};
 function trackball(event){const r=preview.getBoundingClientRect(),x=(event.clientX-r.left-r.width/2)/(r.width*.46),y=(r.top+r.height/2-event.clientY)/(r.height*.46),n=Math.hypot(x,y);return n>1?[x/n,y/n,0]:[x,y,Math.sqrt(1-x*x-y*y)];}
 preview.onpointerdown=e=>{if(e.button!==0||bridge().state().busy||!bridge().state().hasCue)return;e.preventDefault();const state=bridge().state();drag={point:trackball(e),q:state.orientation,view:basis(state.aim)};preview.setPointerCapture(e.pointerId);};
 preview.onpointermove=e=>{if(!drag)return;e.preventDefault();const local=math.between(drag.point,trackball(e)),axis=drag.view.right.map((v,i)=>v*local[0]+drag.view.up[i]*local[1]+drag.view.front[i]*local[2]),q=[...axis,local[3]];bridge().set(style.value,math.multiply(q,drag.q));};
 preview.onpointerup=preview.onpointercancel=()=>{drag=null;};
 function sync(fromDraw=false){
  const now=performance.now(),p=play().state();if(fromDraw&&p.running&&!p.paused&&now-lastSync<100)return;lastSync=now;
  const state=bridge().state();style.value=state.style;speed.value=quick.value=String(p.speed);
  for(const el of group.querySelectorAll('button'))el.disabled=state.busy||!state.hasCue;style.disabled=state.busy;preview.classList.toggle('busy',state.busy||!state.hasCue);
  for(const el of [speed,quick,byId('trainerPlaybackPause'),byId('trainerPlaybackBack'),byId('trainerPlaybackStep')])el.disabled=p.recording;
  byId('trainerPlaybackReplay').disabled=p.recording||(!p.hasReplay&&!p.running);
  byId('trainerPlaybackPause').textContent=p.running&&!p.paused?'Pause':'Play';
  byId('trainerPlaybackPause').setAttribute('aria-label',p.running&&!p.paused?'Pause shot':'Play shot');
  byId('trainerPlaybackStatus').textContent=p.running?(p.recording?'Recording · ':p.paused?'Paused · ':'')+p.time.toFixed(3)+' s · '+p.motion:p.recording?'Preparing or saving video…':'Choose a speed, then Play or Record shot';
  const in3D=!!window.Billiards3D?.active,camera=window.Billiards3D?.camera();byId('trainerPlaybackCloseup').disabled=!in3D||p.recording;
  for(const input of bar.querySelectorAll('[data-follow-side]')){input.disabled=!in3D||p.recording;input.checked=!!camera?.followCue&&input.dataset.followSide===(camera.followSide||'behind');}
  byId('trainerStopPlayback').disabled=p.recording||(!p.running&&!camera?.followCue);
  byId('trainingBallStatus').textContent=!state.hasCue?'Place a cue ball on the table to set its orientation.':state.busy?'Orientation is locked during playback.':'Shot '+state.shot+' · Rotation changes the markings only.';
  const key=JSON.stringify([state.style,state.orientation,state.aim,state.tip]);
  if(key!==previewKey&&preview.offsetParent){previewKey=key;math.sphere(preview,state.style,state.orientation,basis(state.aim));const c=preview.getContext('2d'),x=100+state.tip.x*92,y=100-state.tip.y*92;c.beginPath();c.arc(x,y,5,0,Math.PI*2);c.strokeStyle='#071b25';c.lineWidth=4;c.stroke();c.strokeStyle='#64e8ff';c.lineWidth=2;c.stroke();}
  const viewKey=String(in3D)+String(byId('trainerCameraBar')?.hidden);if(viewKey!==lastViewKey){lastViewKey=viewKey;position();}
 }
 window.BilliardsSpinLabUI={sync};
 window.addEventListener('resize',position);window.addEventListener('billiards:camera-recording-change',position);
 new MutationObserver(()=>{position();sync();}).observe(document.body,{attributes:true,attributeFilter:['class']});
 group.closest('.section')?.querySelector('.sectionToggle')?.addEventListener('click',()=>requestAnimationFrame(sync));
 document.addEventListener('click',e=>{if(e.target.closest('#panel')&&!e.target.closest('#trainerTrainingBall'))requestAnimationFrame(sync);});
 for(const event of ['pointerdown','pointermove','touchstart','wheel'])bar.addEventListener(event,e=>e.stopPropagation());
 sync();
})();
