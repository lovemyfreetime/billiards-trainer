/* Player-eye setup and cue appearance live with the existing View and Cue options. */
(() => {
 'use strict';
 const view=document.querySelector('#workspace-view .workspaceToolGroup'),options=document.getElementById('featureCueOptions'),model=window.BilliardsCue3D;
 if(!view||!options||!model)return;
 let saved={};try{saved=JSON.parse(localStorage.getItem('trainer.playerView.v1'))||{};}catch{}
 let height=Math.max(.08,Math.min(.40,Number(saved.height)||.12)),locked=saved.locked!==false;
 const appearance=document.createElement('section');appearance.className='cueAppearanceOptions';
 appearance.innerHTML='<div class="tableControlTitle">3D Cue</div><label for="trainerCueFinish">Cue finish</label><select id="trainerCueFinish"><option value="blackSilver">Black &amp; silver</option><option value="carbon">Carbon fiber</option><option value="wood">Wood</option></select><img src="./icons/approved-full-cue.png" alt="Approved full-length black-and-silver cue reference" class="cueAppearanceReference">';
 options.append(appearance);const finish=document.getElementById('trainerCueFinish');finish.value=model.getFinish();finish.onchange=()=>{model.setFinish(finish.value);window.Billiards3D?.refresh();};
 const box=document.createElement('section');box.id='playerViewOptions';
 box.innerHTML='<button type="button" id="playerViewButton" aria-pressed="false">Player View</button><div class="playerViewPresets" role="group" aria-label="Player eye height presets"><button type="button" id="playerViewLow">Low</button><button type="button" id="playerViewRaised">Raised</button></div><label for="playerEyeHeight">Eye height above cue <output id="playerEyeHeightValue"></output></label><input id="playerEyeHeight" type="range" min="8" max="40" step="1"><label class="playerViewLock"><input id="playerViewLock" type="checkbox"> Lock Player View between shots</label><output id="playerCueAngle"></output>';
 view.prepend(box);
 const byId=id=>document.getElementById(id),slider=byId('playerEyeHeight'),lock=byId('playerViewLock'),button=byId('playerViewButton');slider.value=Math.round(height*100);lock.checked=locked;
 function save(){try{localStorage.setItem('trainer.playerView.v1',JSON.stringify({height,locked}));}catch{}}
 function apply(){return window.Billiards3D?.playerView({height,locked});}
 async function open(){
  if(window.billiardsTrainingBall?.state().busy)return;
  const follow=byId('followMode');if(follow?.getAttribute('aria-checked')==='true')follow.click();
  const camera=window.Billiards3D;if(!camera.active&&!await camera.enable())return;
  apply();if(document.body.classList.contains('phone-controls-open'))byId('phoneControls').click();
  byId('workspace-picker').open=false;save();sync();
 }
 button.onclick=open;
 for(const [id,value]of [['playerViewLow',.12],['playerViewRaised',.28]])byId(id).onclick=()=>{height=value;slider.value=Math.round(height*100);save();open();};
 slider.oninput=()=>{height=Number(slider.value)/100;save();if(window.Billiards3D?.camera().playerView)apply();sync();};
 lock.onchange=()=>{locked=lock.checked;save();if(window.Billiards3D?.camera().playerView)apply();sync();};
 function sync(){
  const camera=window.Billiards3D?.camera(),state=window.billiardsTrainingBall?.state(),busy=!!state?.busy,active=!!(window.Billiards3D?.active&&camera?.playerView);
  button.setAttribute('aria-pressed',String(active));button.disabled=slider.disabled=lock.disabled=finish.disabled=busy;
  byId('playerEyeHeightValue').textContent=Math.round(height*100)+' cm';
  for(const [id,value]of [['playerViewLow',.12],['playerViewRaised',.28]]){byId(id).disabled=busy;byId(id).setAttribute('aria-pressed',String(active&&Math.abs(value-height)<.005));}
  const pose=window.Billiards3D?.cueModel();byId('playerCueAngle').textContent=pose?'Cue elevation '+pose.elevation.toFixed(1)+'°':'';
 }
 window.addEventListener('billiards:2d-render',sync);window.addEventListener('billiards:3d-render',sync);sync();
})();
