/* Quiet status in Cue options; no modal, flashing warning, or automatic drawer. */
(()=>{
 'use strict';
 const host=document.getElementById('featureCueOptions'),api=window.billiardsCueSetup;if(!host||!api)return;
 const section=document.createElement('section');section.className='cueAppearanceOptions cueStrokeOptions';
 section.innerHTML='<div class="tableControlTitle">Stroke &amp; rail clearance</div><p>The cue rises automatically at rails and pockets. At the contact limit, the tip moves to the nearest playable point.</p><label for="cueStrokeStyle">Stroke length</label><select id="cueStrokeStyle"><option value="auto">Auto</option><option value="short">Short</option><option value="normal">Normal</option><option value="long">Long</option></select><label for="cueFinishHold">Hold the finish <output id="cueFinishHoldValue"></output></label><input id="cueFinishHold" type="range" min="0.5" max="4" step="0.5"><output id="cueClearanceStatus"></output>';
 host.append(section);const byId=id=>document.getElementById(id),style=byId('cueStrokeStyle'),hold=byId('cueFinishHold'),status=byId('cueClearanceStatus');
 style.onchange=()=>api.set({style:style.value});hold.oninput=()=>api.set({hold:Number(hold.value)});
 const shootButtons=document.querySelectorAll('#animate,#animate2,[data-trainer-action="animate"]');
 function label(el,text){if(el&&el.textContent!==text)el.textContent=text;}
 function sync(){
  const state=api.state(),cue=state.cue;
  style.value=state.preferences.style;hold.value=state.preferences.hold;
  style.disabled=hold.disabled=state.busy;label(byId('cueFinishHoldValue'),Number(hold.value).toFixed(1)+' s');
  if(!cue)return;
  const number=cue.id==='CB2'?2:1,angle=cue.elevation.toFixed(1);
  const info=cue.blocked?'No clear stroke at this aim. Change the aim or move the cue ball.':
   `Cue ${angle}°${cue.automatic?' · auto clearance':''} · backstroke ${Math.round(cue.stroke.backstroke*100)} cm · follow-through ${Math.round(cue.stroke.followThrough*100)} cm`;
  label(status,info);
  label(byId(number===2?'elev2Text':'elevText'),cue.automatic?'Auto':'');
  label(byId('tableElevation'+number+'Value'),angle+'°');
  for(const id of [number===2?'cueElevation2':'cueElevation',number===2?'elev2Number':'elevNumber','tableElevation'+number]){
   const input=byId(id);
   if(input&&input.value!==angle&&!(input.type==='number'&&input===document.activeElement))input.value=angle;
  }
  for(const button of shootButtons){
   button.classList.toggle('cueTargetBlocked',cue.blocked);
   if(button.getAttribute('aria-disabled')!==String(cue.blocked))button.setAttribute('aria-disabled',String(cue.blocked));
   const title=cue.blocked?info:'';
   if(button.title!==title)button.title=title;
  }
 }
 // Use the live solved contact during adjustment instead of probing five
 // additional hypothetical shots on the pointer's critical path.
 for(const [id,which]of [['tipCanvas',1],['tipCanvas2',2]]){
  const face=byId(id);if(!face)continue;
  const wrap=document.createElement('div');wrap.className='cueReachabilityWrap';face.before(wrap);wrap.append(face);
  const shade=document.createElement('div');shade.className='cueReachabilityShade';shade.hidden=true;wrap.append(shade);
  function mark(){const cue=api.state(which).cue;shade.hidden=!(cue?.blocked||cue?.contactLimited);shade.style.height='12%';}
  face.addEventListener('pointerdown',mark);
  face.addEventListener('pointermove',e=>{if(e.buttons)mark();});
  for(const type of ['pointerup','pointercancel','pointerleave'])face.addEventListener(type,()=>{shade.hidden=true;});
 }
 window.addEventListener('billiards:2d-render',sync);sync();
})();
