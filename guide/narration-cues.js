/* Word-aligned narration cues. Presentation only: never activate a trainer control. */
(function(global){
'use strict';
let pending;
function load(){return pending||(pending=fetch('./guide/narration-cues.json?v=guided-cues-v1').then(r=>{if(!r.ok)throw Error('Narration cues unavailable');return r.json();}));}
function mount(host,{page='Main'}={}){
 let data=null,current=null,frame=0,source=null,signature='',disposed=false;
 const layer=document.createElement('div');layer.className='btg-cue-layer';layer.setAttribute('aria-hidden','true');document.body.append(layer);
 load().then(value=>{data=value;if(source)update(...source);}).catch(error=>console.warn(error.message));
 const visible=el=>!!el&&!el.hidden&&el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden';
 function clear(){current=null;signature='';layer.replaceChildren();cancelAnimationFrame(frame);frame=0;}
 function stop(){source=null;clear();}
 function selectElement(cue){
  const binding=data.bindings[cue.target];if(!binding)return null;
  const scoped=selector=>selector.startsWith('@guide ')?host.querySelectorAll(selector.slice(7)):document.querySelectorAll(selector);
  const candidates=(cue.selectors||binding.selectors||[]).flatMap(s=>{try{return [...scoped(s)]}catch(_){return []}});
  const controls=candidates.map(el=>el.tagName==='OPTION'?el.closest('select'):el);return controls.find(visible)||controls[0]||null;
 }
 function reveal(el){
  if(!el)return;
  if(el.closest('#cuePopup')&&!document.getElementById('cuePopup').classList.contains('open'))document.getElementById('cueRailBtn')?.click();
  if(el.closest('#layoutQuickPanel')&&!document.getElementById('layoutQuickPanel').classList.contains('open'))document.getElementById('quickLayoutRecall')?.click();
  // Only disclosure/navigation changes; no click on a shot, input, or feature switch.
  for(let p=el.parentElement;p;p=p.parentElement){if(p.matches('.section'))p.classList.add('open');if(p.tagName==='DETAILS')p.open=true;}
  const advanced=el.closest('.advancedBody');if(advanced){advanced.classList.add('open');document.querySelector('[data-advanced="'+advanced.id+'"]')?.classList.add('open');}
  const panel=el.closest('#panel');if(panel){if(document.body.classList.contains('phone-layout')&&!document.body.classList.contains('phone-controls-open'))document.getElementById('phoneControls')?.click();const a=el.getBoundingClientRect(),b=panel.getBoundingClientRect();if(a.top<b.top+12||a.bottom>b.bottom-12)panel.scrollTop+=a.top-b.top-Math.min(50,b.height*.15);}
  else if(!el.closest('#bt-guide-pool-root')){const r=el.getBoundingClientRect();if(r.bottom>innerHeight||r.top<0)el.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});}
 }
 function paint(){
  if(!current||disposed)return;
  const binding=data.bindings[current.target];let boxes=[];
  if(binding?.region&&page==='Main')boxes=global.billiardsTourBridge?.narrationRegions(binding.region)||[];
  else{const el=selectElement(current);if(visible(el)){const r=el.getBoundingClientRect();boxes=[{x:r.x,y:r.y,width:r.width,height:r.height}];}}
  while(layer.children.length>boxes.length)layer.lastChild.remove();
  boxes.forEach((r,i)=>{let node=layer.children[i];if(!node){node=document.createElement('div');node.className='btg-cue-ring';layer.append(node);}const pad=binding?.region?5:4;Object.assign(node.style,{left:(r.x-pad)+'px',top:(r.y-pad)+'px',width:Math.max(12,r.width+pad*2)+'px',height:Math.max(12,r.height+pad*2)+'px'});node.dataset.target=current.target;});
  layer.dataset.target=current.target;frame=requestAnimationFrame(paint);
 }
 function update(topic,time,playing,src){
  source=[topic,time,playing,src];
  if(!playing||!topic||disposed){clear();return;}
  if(!data)return;
  const file=(src||'').split('/').pop().split('?')[0],track=data.tracks[file];
  const cues=track?.cues||[],cue=cues.find(c=>time>=c.start&&time<c.end);
  if(!cue){clear();return;}
  const key=file+':'+cue.start+':'+cue.target;
  if(signature===key)return;
  clear();signature=key;current=cue;
  const binding=data.bindings[cue.target];if(binding?.region){const canvas=document.getElementById('canvas');const r=canvas?.getBoundingClientRect();if(r&&(r.top<0||r.bottom>innerHeight))canvas.scrollIntoView({block:'nearest',behavior:'instant'});}
  else reveal(selectElement(cue));
  paint();
 }
 return {update,clear:stop,destroy(){disposed=true;stop();layer.remove();},getState(){return {target:current?.target||null,track:source?.[3]||null,ready:!!data};}};
}
global.BilliardsNarrationCues={load,mount};
})(window);
