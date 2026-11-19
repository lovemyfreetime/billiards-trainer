/* Player-eye setup and cue appearance live with the existing View and Cue options. */
(() => {
 'use strict';
 const view=document.querySelector('#workspace-view .workspaceToolGroup'),options=document.getElementById('featureCueOptions'),model=window.BilliardsCue3D;
 if(!view||!options||!model)return;
 let saved={};try{saved=JSON.parse(localStorage.getItem('trainer.playerView.v1'))||{};}catch{}
 let height=model.clampEyeHeight(saved.height),locked=saved.locked!==false;
 const appearance=document.createElement('section');appearance.className='cueAppearanceOptions';
 appearance.innerHTML='<div class="tableControlTitle">3D Cue</div><label for="trainerCueFinish">Cue finish</label><select id="trainerCueFinish"><option value="blackSilver">Black &amp; silver</option><option value="carbon">Carbon fiber</option><option value="wood">Wood</option></select><img src="./icons/approved-full-cue.png" alt="Approved full-length black-and-silver cue reference" class="cueAppearanceReference">';
 options.append(appearance);const finish=document.getElementById('trainerCueFinish');finish.value=model.getFinish();finish.onchange=()=>{model.setFinish(finish.value);window.Billiards3D?.refresh();};
 const box=document.createElement('section');box.id='playerViewOptions';
 box.innerHTML='<button type="button" id="playerViewButton" aria-pressed="false">Cue View</button><div class="playerViewPresets" role="group" aria-label="Cue View eye height presets"><button type="button" id="playerViewLow">Low</button><button type="button" id="playerViewRaised">Raised</button></div><label for="playerEyeHeight">Eye height above cue <output id="playerEyeHeightValue"></output></label><input id="playerEyeHeight" type="range" step="0.1"><label class="playerViewLock"><input id="playerViewLock" type="checkbox"> Keep Cue View between shots</label><output id="playerCueAngle"></output>';
 view.prepend(box);
 const byId=id=>document.getElementById(id),slider=byId('playerEyeHeight'),lock=byId('playerViewLock'),button=byId('playerViewButton');
 slider.min=model.EYE_HEIGHT_INCHES.min;slider.max=model.EYE_HEIGHT_INCHES.max;lock.checked=locked;
 function save(){try{localStorage.setItem('trainer.playerView.v1',JSON.stringify({height,locked}));}catch{}}
 function apply(){return window.Billiards3D?.playerView({height,locked});}
 async function open(){
  if(window.billiardsPlayback?.state().recording)return;
  const follow=byId('followMode');if(follow?.getAttribute('aria-checked')==='true')follow.click();
  const camera=window.Billiards3D;if(!camera.active&&!await camera.enable())return;
  apply();if(document.body.classList.contains('phone-controls-open'))byId('phoneControls').click();
  byId('workspace-picker').open=false;save();sync();
 }
 async function toggle(){
  const camera=window.Billiards3D;
  if(camera?.active&&camera.camera().playerView){camera.exitCueView();sync();}
  else await open();
 }
 window.billiardsCueView={toggle,apply};
 button.onclick=toggle;
 for(const [id,value]of [['playerViewLow',.12],['playerViewRaised',.28]])byId(id).onclick=()=>{height=value;save();if(window.Billiards3D?.camera().playerView)apply();sync();};
 slider.oninput=()=>{height=Number(slider.value)*model.METERS_PER_INCH;save();if(window.Billiards3D?.camera().playerView)apply();sync();};
 lock.onchange=()=>{locked=lock.checked;save();if(window.Billiards3D?.camera().playerView)apply();sync();};
 let lastState;
 function sync(){
  const camera=window.Billiards3D?.camera(),state=window.billiardsPlayback?.state(),busy=!!state?.recording,active=!!(window.Billiards3D?.active&&camera?.playerView&&byId('table3DNextView')?.getAttribute('aria-pressed')!=='true');
  const pose=window.Billiards3D?.cueModel(),angle=pose?.elevation.toFixed(1);
  const stateKey=[active,busy,height,locked,angle].join('/');
  if(stateKey===lastState)return;
  lastState=stateKey;
  const bottom=byId('table3DCueView');
  if(bottom&&bottom.getAttribute('aria-pressed')!==String(active))bottom.setAttribute('aria-pressed',String(active));
  if(button.getAttribute('aria-pressed')!==String(active))button.setAttribute('aria-pressed',String(active));button.disabled=slider.disabled=lock.disabled=finish.disabled=busy;
  const inches=(height/model.METERS_PER_INCH).toFixed(1);
  slider.value=inches;slider.setAttribute('aria-valuetext',inches+' inches');
  byId('playerEyeHeightValue').textContent=inches+' in';
  for(const [id,value]of [['playerViewLow',.12],['playerViewRaised',.28]]){byId(id).disabled=busy;byId(id).setAttribute('aria-pressed',String(Math.abs(value-height)<.005));}
  byId('playerCueAngle').textContent=pose?'Cue elevation '+angle+'°':'';
 }
 window.addEventListener('billiards:2d-render',sync);window.addEventListener('billiards:3d-render',sync);sync();
})();
