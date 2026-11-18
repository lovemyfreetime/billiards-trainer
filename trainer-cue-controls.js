/* Quiet status in Cue options; no modal, flashing warning, or automatic drawer. */
(()=>{
 'use strict';
 const host=document.getElementById('featureCueOptions'),api=window.billiardsCueSetup;if(!host||!api)return;
 const section=document.createElement('section');section.className='cueAppearanceOptions cueStrokeOptions';
 section.innerHTML='<div class="tableControlTitle">Stroke &amp; rail clearance</div><p>Auto clearance keeps your tip target and raises the cue only as needed. Cue elevation is also available in Shot controls.</p><label for="cueStrokeStyle">Stroke length</label><select id="cueStrokeStyle"><option value="auto">Auto</option><option value="short">Short</option><option value="normal">Normal</option><option value="long">Long</option></select><label for="cueFinishHold">Hold the finish <output id="cueFinishHoldValue"></output></label><input id="cueFinishHold" type="range" min="0.5" max="4" step="0.5"><output id="cueClearanceStatus"></output>';
 host.append(section);const byId=id=>document.getElementById(id),style=byId('cueStrokeStyle'),hold=byId('cueFinishHold'),status=byId('cueClearanceStatus');
 style.onchange=()=>api.set({style:style.value});hold.oninput=()=>api.set({hold:Number(hold.value)});
 function sync(){const state=api.state(),cue=state.cue;style.value=state.preferences.style;hold.value=state.preferences.hold;style.disabled=hold.disabled=state.busy;byId('cueFinishHoldValue').textContent=Number(hold.value).toFixed(1)+' s';if(!cue)return;status.textContent=cue.blocked?'This tip target cannot clear the rail. Move the tip higher.':`Cue ${cue.elevation.toFixed(1)}°${cue.automatic?' · auto clearance':''} · backstroke ${Math.round(cue.stroke.backstroke*100)} cm · follow-through ${Math.round(cue.stroke.followThrough*100)} cm`;
  for(const [id,value]of [['elevText',cue.elevation.toFixed(1)+'°'],['tableElevation'+(cue.id==='CB2'?2:1)+'Value',cue.elevation.toFixed(1)+'°']])if(byId(id))byId(id).textContent=value;
  // Prevent every input method (including gamepad) from striking an unreachable
  // target. The main shoot handler independently enforces the same condition.
  for(const b of document.querySelectorAll('#animate,#animate2,[data-trainer-action="animate"]')){b.classList.toggle('cueTargetBlocked',!!cue.blocked);b.setAttribute('aria-disabled',String(!!cue.blocked));b.title=cue.blocked?'Move the tip target higher to clear the rail':'';}
 }
 // Show a restrained mask only while the student is choosing a tip point.
 // The current horizontal offset is retained; no per-frame grid or flashing state.
 for(const [id,which]of [['tipCanvas',1],['tipCanvas2',2]]){
  const face=byId(id);if(!face)continue;const wrap=document.createElement('div');wrap.className='cueReachabilityWrap';face.before(wrap);wrap.append(face);const shade=document.createElement('div');shade.className='cueReachabilityShade';shade.hidden=true;shade.title='Lower tip targets need more rail clearance';wrap.append(shade);let timer;
  face.addEventListener('pointerdown',()=>{clearTimeout(timer);timer=setTimeout(()=>{const cue=api.state(which).cue;if(!cue||!cue.limiter)return;const raw=billiardsTourBridge.capture().state,shot=which===2?raw.shot2:raw;let boundary=-1;for(const f of [-1,-.75,-.5,-.25,0])if(!api.reachable(shot.sideSpin,f,which))boundary=f;else break;if(boundary>-1){shade.style.height=(25+boundary*25)+'%';shade.hidden=false;}},40);});
  for(const type of ['pointerup','pointercancel','pointerleave'])face.addEventListener(type,()=>{clearTimeout(timer);shade.hidden=true;});
 }
 window.addEventListener('billiards:2d-render',sync);window.addEventListener('billiards:3d-render',sync);sync();
})();
