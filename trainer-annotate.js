/* Compact table annotations and table-only PNG snapshots. */
(() => {
 'use strict';
 const stage=document.getElementById('stageWrap'),group=document.getElementById('trainerAnnotateGroup');
 if(!stage||!group)return;
 const layer=document.createElement('canvas');layer.id='trainerAnnotationCanvas';layer.setAttribute('aria-label','Table annotations');stage.append(layer);
 const interaction=document.createElementNS('http://www.w3.org/2000/svg','svg');interaction.id='trainerAnnotationInput';interaction.setAttribute('aria-hidden','true');const hitArea=document.createElementNS('http://www.w3.org/2000/svg','polygon');hitArea.setAttribute('fill','transparent');interaction.append(hitArea);stage.append(interaction);
 const ctx=layer.getContext('2d'),tools=[...group.querySelectorAll('[data-annotate-tool]')],color=document.getElementById('trainerAnnotateColor');
 let activeTool='',items=[],gesture=null,dpr=1;
 const folderButton=group.querySelector('#trainerSnapshotFolder');
 folderButton.addEventListener('click',()=>{
  if(window.BilliardsAndroid?.openSnapshotFolder){
   window.BilliardsAndroid.openSnapshotFolder();
  }else{
   status.textContent=window.BilliardsAndroid
    ?'Open folder requires the updated Android app. Snapshots are in Pictures / Billiards Trainer / Snapshots.'
    :'Open your browser’s Downloads list to find snapshots. Browsers cannot open a download folder from a webpage.';
  }
 });
 let currentView=false,locked=false,savedState;
 const fullButton=group.querySelector('#trainerSnapshotFull');
 const currentButton=group.querySelector('#trainerSnapshotCurrent');
 const snapshotGroup=group.querySelector('#trainerSnapshotGroup');
 function selectView(current){
  currentView=current;
  fullButton.setAttribute('aria-pressed',String(!current));
  currentButton.setAttribute('aria-pressed',String(current));
  snapshotGroup.classList.toggle('current-view',current);
 }
 fullButton.addEventListener('click',()=>selectView(false));
 currentButton.addEventListener('click',()=>selectView(true));
 const history=[];
 const undo=group.querySelector('#trainerAnnotateUndo');
 const clear=group.querySelector('#trainerAnnotateClear');
 const lock=group.querySelector('#trainerAnnotateLock');
 const status=group.querySelector('#trainerSnapshotStatus');
 const native=window.BilliardsAndroid;
 if(native)status.textContent='Snapshots save to Pictures / Billiards Trainer / Snapshots.';
 function updateTools(){
  interaction.classList.toggle('active',!!activeTool&&!locked);
  for(const button of tools){
   button.disabled=locked;
   button.setAttribute('aria-pressed',String(!locked&&button.dataset.annotateTool===activeTool));
  }
  undo.disabled=locked||!history.length;
  clear.disabled=locked||!items.length;
  color.disabled=locked;
  lock.textContent=locked?'Unlock annotations':'Lock annotations';
  lock.setAttribute('aria-pressed',String(locked));
 }
 function persist(){
  savedState={items,locked};
  window.billiardsTourBridge?.saveAnnotations?.(savedState);
  updateTools();
 }
 function restoreAnnotations(){
  const saved=window.billiardsTourBridge?.annotations?.();
  if(saved===savedState)return;
  savedState=saved;history.length=0;gesture=null;activeTool='';
  items=validItems(saved?.items);
  locked=!!saved?.locked;
  updateTools();
 }
 function validItems(input){
  if(!Array.isArray(input))return [];
  return input.slice(0,500).filter(item=>item&&['line','arrow','circle','draw'].includes(item.tool)
   &&/^#[0-9a-f]{6}$/i.test(item.color)&&Array.isArray(item.points)&&item.points.length>=2
   &&item.points.length<=1000&&item.points.every(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)
    &&Math.abs(p.x)<=10&&Math.abs(p.y)<=10));
 }
 function remember(){
  history.push(items.slice());
  if(history.length>100)history.shift();
 }
 undo.onclick=()=>{if(!locked&&history.length){items=history.pop();persist();paint();}};
 lock.addEventListener('click',()=>{locked=!locked;gesture=null;activeTool='';persist();paint();});
 const currentColor=()=>color?.value||'#ff4d4d',clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const is3d=()=>!!window.Billiards3D?.active;
 function frame(){
  if(is3d()){
   const b=window.billiardsTourBridge?.snapshot?.(),L=b?.tableL,W=b?.tableW;if(!L||!W)return null;
   const project=p=>{const q=window.Billiards3D.project(p,0);return q&&q.visible?{x:q.x-stage.getBoundingClientRect().left,y:q.y-stage.getBoundingClientRect().top}:null;};
   const x=L*.0471,y=W*.0948,corners=[{x:-x,y:-y},{x:L+x,y:-y},{x:L+x,y:W+y},{x:-x,y:W+y}],surface=[{x:0,y:0},{x:L,y:0},{x:L,y:W},{x:0,y:W}],map=p=>project({x:p.x*L,y:p.y*W});
   const projectedCorners=corners.map(project),projectedSurface=surface.map(project);
   return {L,W,corners:projectedCorners,surface:projectedSurface,map};
  }
  const f=window.billiardsTourBridge?.annotationFrame?.();return f?{...f,L:f.length,W:f.width}:null;
 }
 function size(){dpr=Math.max(1,Math.min(2,devicePixelRatio||1));const r=stage.getBoundingClientRect();layer.width=Math.max(1,Math.round(r.width*dpr));layer.height=Math.max(1,Math.round(r.height*dpr));layer.style.width=r.width+'px';layer.style.height=r.height+'px';ctx.setTransform(dpr,0,0,dpr,0,0);paint();}
 function screen(p,f){return f.map(p);}
 function paint(hit){restoreAnnotations();const r=stage.getBoundingClientRect(),f=frame();ctx.clearRect(0,0,r.width,r.height);if(!f){hitArea.setAttribute('points','');return;}hitArea.setAttribute('points',(f.surface.every(Boolean)?f.surface:[]).map(p=>`${p.x},${p.y}`).join(' '));
  let erased;
  const stroke=item=>{if(hit){ctx.lineWidth=28;if(ctx.isPointInStroke(hit.x*dpr,hit.y*dpr))erased=item;}else ctx.stroke();};
  for(const item of [...items,...(gesture?.item?[gesture.item]:[])]){const pts=item.points.map(p=>screen(p,f));if(pts.some(p=>!p))continue;ctx.save();ctx.strokeStyle=item.color;ctx.fillStyle=item.color;ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
   if(item.tool==='circle'){
    const center=item.points[0],edge=item.points[1];
    const radius=Math.hypot((edge.x-center.x)*f.L,(edge.y-center.y)*f.W);
    let started=false;
    for(let step=0;step<=96;step++){
     const angle=step*Math.PI*2/96;
     const p=f.map({x:center.x+Math.cos(angle)*radius/f.L,y:center.y+Math.sin(angle)*radius/f.W});
     if(!p){started=false;continue;}
     if(started)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);
     started=true;
    }
    stroke(item);
   }
   else{ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);stroke(item);if(item.tool==='arrow'&&pts.length>=2){const a=pts.at(-2),b=pts.at(-1),angle=Math.atan2(b.y-a.y,b.x-a.x),head=12;ctx.beginPath();ctx.moveTo(b.x-head*Math.cos(angle-Math.PI/6),b.y-head*Math.sin(angle-Math.PI/6));ctx.lineTo(b.x,b.y);ctx.lineTo(b.x-head*Math.cos(angle+Math.PI/6),b.y-head*Math.sin(angle+Math.PI/6));stroke(item);}}
   ctx.restore();
  }
  return erased;
 }
 function point(ev){if(is3d()){const q=window.Billiards3D.tablePoint?.(ev);if(!q)return null;const s=window.billiardsTourBridge?.snapshot?.();return s?.tableL&&s?.tableW?{x:q.x/s.tableL,y:q.y/s.tableW}:null;}return window.billiardsTourBridge?.annotationFrame?.().inverse({x:ev.clientX,y:ev.clientY})||null;}
 function choose(tool){
  if(locked)return;
  activeTool=activeTool===tool?'':tool;
  updateTools();
  layer.setAttribute('aria-label',activeTool?'Annotate table: '+activeTool:'Table annotations');
 }
 tools.forEach(b=>b.addEventListener('click',()=>choose(b.dataset.annotateTool)));
 group.querySelector('#trainerAnnotateClear').addEventListener('click',()=>{if(!locked&&items.length){remember();items=[];persist();paint();}});
 group.querySelector('#trainerAnnotateSnapshot').addEventListener('click',async()=>{
  if(native&&!native.saveTrainerExport){status.textContent='Install the updated Android app to save PNG snapshots.';return;}
  const name=group.querySelector('#trainerSnapshotName').value.trim().replace(/\.png$/i,'').replace(/[\x00-\x1f<>:"/\\|?*]/g,'-').replace(/^[. ]+|[. ]+$/g,'')||'Billiards table snapshot';
  const filename=name+'.png';
  const captureCurrentView=currentView;
  const was3d=is3d();
  if(!captureCurrentView){
   if(was3d)window.Billiards3D.prepareSnapshot();
   else if(document.getElementById('tableZoom')?.getAttribute('aria-pressed')==='true')document.getElementById('tableZoom').click();
  }
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  if(was3d)window.Billiards3D.renderSnapshot();
  paint();
  const source=document.getElementById(was3d?'table3DCanvas':'canvas');
  const f=captureCurrentView?null:frame();
  if(!source||(!captureCurrentView&&(!f||f.corners.some(p=>!p)))){
   status.textContent='The table is not ready for a snapshot.';
   return;
  }
  const rect=stage.getBoundingClientRect();
  const polygon=captureCurrentView?null:f.corners;
  let left=0,top=0,right=rect.width,bottom=rect.height;
  if(captureCurrentView){
   const visible=source.getBoundingClientRect();
   left=Math.max(0,visible.left-rect.left,-rect.left);
   top=Math.max(0,visible.top-rect.top,-rect.top);
   right=Math.min(rect.width,visible.right-rect.left,window.innerWidth-rect.left);
   bottom=Math.min(rect.height,visible.bottom-rect.top,window.innerHeight-rect.top);
  }else{
   left=Math.max(0,Math.floor(Math.min(...polygon.map(p=>p.x))));
   top=Math.max(0,Math.floor(Math.min(...polygon.map(p=>p.y))));
   right=Math.min(rect.width,Math.ceil(Math.max(...polygon.map(p=>p.x))));
   bottom=Math.min(rect.height,Math.ceil(Math.max(...polygon.map(p=>p.y))));
  }
  const w=right-left,h=bottom-top;
  if(w<2||h<2){status.textContent='The table is outside the visible area.';return;}
  const out=document.createElement('canvas');
  const scale=Math.max(1,Math.min(2,devicePixelRatio||1));
  out.width=Math.round(w*scale);out.height=Math.round(h*scale);
  const c=out.getContext('2d');
  c.scale(scale,scale);
  if(polygon){
   c.beginPath();
   polygon.forEach((p,i)=>i?c.lineTo(p.x-left,p.y-top):c.moveTo(p.x-left,p.y-top));
   c.closePath();c.clip();
  }
  const sourceRect=source.getBoundingClientRect();c.drawImage(source,sourceRect.left-rect.left-left,sourceRect.top-rect.top-top,sourceRect.width,sourceRect.height);
  c.drawImage(layer,-left,-top,rect.width,rect.height);
  if(native){
   const path=native.saveTrainerExport(filename,out.toDataURL('image/png'));
   status.textContent=path?'Saved to '+path:'Could not save the PNG.';
   return;
  }
  out.toBlob(blob=>{
   if(!blob){status.textContent='Could not create the PNG.';return;}
   const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();
   setTimeout(()=>URL.revokeObjectURL(a.href),10000);
   status.textContent='Download requested: '+filename+' — check browser Downloads.';
  },'image/png');
 });
 function erase(ev){
  const rect=stage.getBoundingClientRect(),item=paint({x:ev.clientX-rect.left,y:ev.clientY-rect.top});
  if(item){if(!gesture.changed)remember();gesture.changed=true;items=items.filter(entry=>entry!==item);persist();}
  paint();
 }
 interaction.addEventListener('pointerdown',ev=>{if(locked||!activeTool||gesture||ev.button!==0)return;const p=point(ev);if(!p)return;ev.preventDefault();ev.stopPropagation();interaction.setPointerCapture(ev.pointerId);if(activeTool==='erase'){gesture={id:ev.pointerId};erase(ev);return;}gesture={id:ev.pointerId,item:{tool:activeTool,color:currentColor(),points:[p,{...p}]}};paint();});
 interaction.addEventListener('pointermove',ev=>{if(!gesture||gesture.id!==ev.pointerId)return;const p=point(ev);if(!p)return;ev.preventDefault();ev.stopPropagation();if(!gesture.item){erase(ev);return;}const pts=gesture.item.points;if(gesture.item.tool==='draw'){if(pts.length>=999)pts.splice(1,1);pts.push(p);}else pts[1]=p;paint();});
 function end(ev){
  if(!gesture||gesture.id!==ev.pointerId)return;
  ev.preventDefault();ev.stopPropagation();
  const item=gesture.item,p=ev.type==='pointerup'?point(ev):null;
  if(item&&p){
   if(item.tool==='draw')item.points.push(p);else item.points[1]=p;
   if(item.points.some(q=>Math.hypot(q.x-item.points[0].x,q.y-item.points[0].y)>.001)){remember();items=items.concat(item);persist();}
  }
  gesture=null;paint();
 }
 interaction.addEventListener('pointerup',end);interaction.addEventListener('pointercancel',end);
 window.addEventListener('billiards:2d-render',()=>{if(!is3d())paint();});
 // Render events must not become eraser hit-test arguments.
 window.addEventListener('resize',size);window.addEventListener('billiards:3d-render',()=>paint());if(window.ResizeObserver)new ResizeObserver(size).observe(stage);size();
})();
