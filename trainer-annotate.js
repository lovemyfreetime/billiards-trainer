/* Compact table annotations and table-only PNG snapshots. */
(() => {
 'use strict';
 const stage=document.getElementById('stageWrap'),group=document.getElementById('trainerAnnotateGroup');
 if(!stage||!group)return;
 const layer=document.createElement('canvas');layer.id='trainerAnnotationCanvas';layer.setAttribute('aria-label','Table annotations');stage.append(layer);
 const interaction=document.createElementNS('http://www.w3.org/2000/svg','svg');interaction.id='trainerAnnotationInput';interaction.setAttribute('aria-hidden','true');const hitArea=document.createElementNS('http://www.w3.org/2000/svg','polygon');hitArea.setAttribute('fill','transparent');interaction.append(hitArea);stage.append(interaction);
 const ctx=layer.getContext('2d'),tools=[...group.querySelectorAll('[data-annotate-tool]')],color=document.getElementById('trainerAnnotateColor');
 let activeTool='',items=[],gesture=null,dpr=1,selectedText=null;
 const textEditor=group.querySelector('#trainerTextEditor');
 const textInput=group.querySelector('#trainerAnnotationText');
 const rotationInput=group.querySelector('#trainerTextRotation');
 const angleOutput=group.querySelector('#trainerTextAngle');
 let textEditRecorded=false;
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
 let snapshotMode='full',locked=false,savedState;
 const fullButton=group.querySelector('#trainerSnapshotFull');
 const currentButton=group.querySelector('#trainerSnapshotCurrent');
 const strokeButton=group.querySelector('#trainerSnapshotStroke');
 const snapshotGroup=group.querySelector('#trainerSnapshotGroup');
 const snapshotName=group.querySelector('#trainerSnapshotName');
 const defaultSnapshotName=mode=>mode==='stroke'?'Billiards table and stroke':'Billiards table snapshot';
 function selectView(mode){
  snapshotMode=mode;
  fullButton.setAttribute('aria-pressed',String(mode==='full'));
  currentButton.setAttribute('aria-pressed',String(mode==='current'));
  strokeButton.setAttribute('aria-pressed',String(mode==='stroke'));
  snapshotGroup.classList.toggle('current-view',mode==='current');
  snapshotGroup.classList.toggle('table-stroke',mode==='stroke');
  snapshotName.placeholder=defaultSnapshotName(mode);
  status.textContent=mode==='stroke'?'Tap Snapshot to save the table with Shot Info on the right.'
   :mode==='current'?'Tap Snapshot to save the current view.':'Tap Snapshot to save the full table.';
 }
 fullButton.addEventListener('click',()=>selectView('full'));
 currentButton.addEventListener('click',()=>selectView('current'));
 strokeButton.addEventListener('click',()=>selectView('stroke'));
 const inlineText=document.createElement('textarea');
 inlineText.id='trainerInlineText';inlineText.hidden=true;inlineText.maxLength=160;
 inlineText.setAttribute('aria-label','Edit table label');stage.append(inlineText);
 const handles={};
 for(const [kind,symbol] of [['rotate','↻'],['resize','↔']]){
  const handle=document.createElementNS(interaction.namespaceURI,'g');
  handle.id='trainerTextHandle'+kind;handle.dataset.textHandle=kind;handle.classList.add('textHandle');
  const circle=document.createElementNS(interaction.namespaceURI,'circle');
  circle.setAttribute('r','14');circle.setAttribute('fill','#244d72');circle.setAttribute('stroke','#e6f4ff');
  const label=document.createElementNS(interaction.namespaceURI,'text');
  label.textContent=symbol;label.setAttribute('text-anchor','middle');label.setAttribute('dy','.35em');
  label.setAttribute('fill','#fff');label.setAttribute('font-size','20');
  const title=document.createElementNS(interaction.namespaceURI,'title');title.textContent=kind==='rotate'?'Rotate text':'Resize text';
  handle.append(title,circle,label);interaction.append(handle);handles[kind]=handle;handle.style.display='none';
 }
 function editOnTable(){
  if(!selectedText||locked)return;
  const f=frame(),p=f?.map(selectedText.points[0]);if(!p)return;
  inlineText.value=selectedText.text;inlineText.hidden=false;
  inlineText.style.left=clamp(p.x-130,4,Math.max(4,stage.clientWidth-264))+'px';
  inlineText.style.top=clamp(p.y-40,4,Math.max(4,stage.clientHeight-90))+'px';
  inlineText.focus();
 }
 inlineText.addEventListener('input',()=>{
  textInput.value=inlineText.value;
  if(inlineText.value.trim())updateSelectedText({text:inlineText.value});
 });
 inlineText.addEventListener('focus',()=>{textEditRecorded=false;});
 inlineText.addEventListener('blur',()=>{inlineText.hidden=true;textEditRecorded=false;});
 inlineText.addEventListener('keydown',ev=>{ev.stopPropagation();if(ev.key==='Escape'||(ev.key==='Enter'&&(ev.ctrlKey||ev.metaKey))){ev.preventDefault();inlineText.blur();}});
 const history=[];
 const undo=group.querySelector('#trainerAnnotateUndo');
 const clear=group.querySelector('#trainerAnnotateClear');
 const lock=group.querySelector('#trainerAnnotateLock');
 const status=group.querySelector('#trainerSnapshotStatus');
 const native=window.BilliardsAndroid;
 if(native)status.textContent='Snapshots save to Pictures / Billiards Trainer / Snapshots.';
 function updateTools(){
  interaction.classList.toggle('active',!!activeTool&&!locked);
  if(locked||activeTool!=='text')inlineText.hidden=true;
  for(const button of tools){
   button.disabled=locked;
   button.setAttribute('aria-pressed',String(!locked&&button.dataset.annotateTool===activeTool));
  }
  undo.disabled=locked||!history.length;
  clear.disabled=locked||!items.length;
  color.disabled=locked;
  textEditor.hidden=locked||activeTool!=='text';
  if(selectedText&&!items.includes(selectedText))selectedText=null;
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
  savedState=saved;history.length=0;gesture=null;activeTool='';selectedText=null;
  items=validItems(saved?.items);
  locked=!!saved?.locked;
  updateTools();
 }
 function validItems(input){
  if(!Array.isArray(input))return [];
  return input.slice(0,500).filter(item=>{
   if(!item||!['line','arrow','circle','draw','text'].includes(item.tool)
    ||!/^#[0-9a-f]{6}$/i.test(item.color)||!Array.isArray(item.points)
    ||item.points.length<(item.tool==='text'?1:2)||item.points.length>1000
    ||!item.points.every(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<=10&&Math.abs(p.y)<=10))return false;
   return item.tool!=='text'||(typeof item.text==='string'&&item.text.trim().length>0&&item.text.length<=160
    &&item.points.length===1&&Number.isFinite(item.rotation)&&item.rotation>=0&&item.rotation<=360
    &&(item.scale===undefined||(Number.isFinite(item.scale)&&item.scale>=.15&&item.scale<=6)));
  });
 }
 function remember(){
  history.push(items.slice());
  if(history.length>100)history.shift();
 }
 undo.onclick=()=>{if(!locked&&history.length){items=history.pop();persist();paint();}};
 lock.addEventListener('click',()=>{locked=!locked;gesture=null;activeTool='';selectedText=null;persist();paint();});
 const currentColor=()=>color?.value||'#ff4d4d',clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function selectText(item){
  selectedText=item;
  textInput.value=item.text;
  rotationInput.value=String(item.rotation);
  angleOutput.textContent=item.rotation+'°';
  color.value=item.color;
  textEditRecorded=false;
 }
 function updateSelectedText(changes){
  if(locked||!selectedText)return;
  if(!textEditRecorded){remember();textEditRecorded=true;}
  const previous=selectedText;
  selectedText={...previous,...changes};
  items=items.map(item=>item===previous?selectedText:item);
  persist();paint();
 }
 textInput.addEventListener('input',()=>{
  if(textInput.value.trim())updateSelectedText({text:textInput.value.slice(0,160)});
 });
 rotationInput.addEventListener('input',()=>{
  const rotation=Number(rotationInput.value);
  angleOutput.textContent=rotation+'°';
  updateSelectedText({rotation});
 });
 for(const control of [textInput,rotationInput,color]){
  control.addEventListener('focus',()=>{textEditRecorded=false;});
  control.addEventListener('blur',()=>{textEditRecorded=false;});
 }
 color.addEventListener('input',()=>{if(activeTool==='text')updateSelectedText({color:currentColor()});});
 group.querySelector('#trainerNewText').addEventListener('click',()=>{
  if(locked)return;
  selectedText=null;textInput.value='';rotationInput.value='0';angleOutput.textContent='0°';
  textInput.focus();paint();
 });
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
 function paintText(item,f,hit,showSelection){
  const center=item.points[0],origin=f.map(center);
  const angle=item.rotation*Math.PI/180,unit=f.W*.045*(item.scale||1);
  const along=f.map({x:center.x+Math.cos(angle)*unit/f.L,y:center.y+Math.sin(angle)*unit/f.W});
  const down=f.map({x:center.x-Math.sin(angle)*unit/f.L,y:center.y+Math.cos(angle)*unit/f.W});
  if(!origin||!along||!down)return false;
  ctx.save();
  ctx.transform((along.x-origin.x)/32,(along.y-origin.y)/32,(down.x-origin.x)/32,(down.y-origin.y)/32,origin.x,origin.y);
  ctx.font='600 32px system-ui, sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=item.color;
  const lines=item.text.split('\n');
  const width=Math.max(...lines.map(line=>ctx.measureText(line).width));
  const height=lines.length*38;
  ctx.beginPath();ctx.rect(-width/2-7,-height/2,width+14,height);
  const found=hit?ctx.isPointInPath(hit.x*dpr,hit.y*dpr):false;
  if(!hit){
   lines.forEach((line,index)=>ctx.fillText(line,0,(index-(lines.length-1)/2)*38));
   if(showSelection&&item===selectedText&&activeTool==='text'&&!locked){
    ctx.strokeStyle='#e6f4ff';ctx.lineWidth=1.5;ctx.setLineDash([5,4]);ctx.stroke();
   }
  }
  if(!hit&&showSelection&&item===selectedText&&activeTool==='text'&&!locked){
   const transform=ctx.getTransform();
   for(const [kind,y] of [['rotate',-height/2],['resize',height/2]]){
    const x=width/2+7;
    const px=(transform.a*x+transform.c*y+transform.e)/dpr;
    const py=(transform.b*x+transform.d*y+transform.f)/dpr;
    handles[kind].setAttribute('transform',`translate(${px} ${py})`);handles[kind].style.display='';
   }
  }
  ctx.restore();
  return found;
 }
 function paint(hit,showSelection=true){for(const handle of Object.values(handles))handle.style.display='none';restoreAnnotations();const r=stage.getBoundingClientRect(),f=frame();ctx.clearRect(0,0,r.width,r.height);if(!f){hitArea.setAttribute('points','');return;}hitArea.setAttribute('points',(f.surface.every(Boolean)?f.surface:[]).map(p=>`${p.x},${p.y}`).join(' '));
  let erased;
  const stroke=item=>{if(hit){ctx.lineWidth=28;if(ctx.isPointInStroke(hit.x*dpr,hit.y*dpr))erased=item;}else ctx.stroke();};
  for(const item of [...items,...(gesture?.item?[gesture.item]:[])]){
   if(item.tool==='text'){if(paintText(item,f,hit,showSelection))erased=item;continue;}
   const pts=item.points.map(p=>screen(p,f));if(pts.some(p=>!p))continue;ctx.save();ctx.strokeStyle=item.color;ctx.fillStyle=item.color;ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
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
 function point(ev){
  if(!is3d())return window.billiardsTourBridge?.annotationFrame?.().inverse({x:ev.clientX,y:ev.clientY})||null;
  const q=window.Billiards3D.tablePoint?.(ev),s=window.billiardsTourBridge?.snapshot?.();
  if(q&&s?.tableL&&s?.tableW)return {x:q.x/s.tableL,y:q.y/s.tableW};
  if(!selectedText||(!gesture?.text&&!ev.target.closest?.('[data-text-handle]')))return null;
  // Continue a label gesture when its handle extends past the cloth edge.
  const f=frame(),a=selectedText.points[0],o=f.map(a),x=f.map({x:a.x+.001,y:a.y}),y=f.map({x:a.x,y:a.y+.001});
  if(!o||!x||!y)return null;
  const r=stage.getBoundingClientRect(),dx=ev.clientX-r.left-o.x,dy=ev.clientY-r.top-o.y;
  const ax=x.x-o.x,ay=x.y-o.y,bx=y.x-o.x,by=y.y-o.y,det=ax*by-ay*bx;
  return Math.abs(det)>1e-9?{x:a.x+.001*(dx*by-dy*bx)/det,y:a.y+.001*(ax*dy-ay*dx)/det}:null;
 }
 function choose(tool){
  if(locked)return;
  activeTool=activeTool===tool?'':tool;
  selectedText=null;
  updateTools();
  if(activeTool==='text')textInput.focus();
  layer.setAttribute('aria-label',activeTool?'Annotate table: '+activeTool:'Table annotations');
 }
 tools.forEach(b=>b.addEventListener('click',()=>choose(b.dataset.annotateTool)));
 group.querySelector('#trainerAnnotateClear').addEventListener('click',()=>{if(!locked&&items.length){remember();items=[];persist();paint();}});
 group.querySelector('#trainerAnnotateSnapshot').addEventListener('click',async()=>{
  if(native&&!native.saveTrainerExport){status.textContent='Install the updated Android app to save PNG snapshots.';return;}
  const mode=snapshotMode;
  const name=snapshotName.value.trim().replace(/\.png$/i,'').replace(/[\x00-\x1f<>:"/\\|?*]/g,'-').replace(/^[. ]+|[. ]+$/g,'')||defaultSnapshotName(mode);
  const filename=name+'.png';
  const includesShotInfo=mode==='stroke';
  let stroke;
  if(includesShotInfo){
   try{stroke=window.billiardsTourBridge?.strokeSnapshot?.();}
   catch(error){console.error(error);status.textContent='Could not read Shot Info for the PNG.';return;}
   if(!stroke){status.textContent='Shot Info is not ready. Try the snapshot again.';return;}
  }
  prepareCapture(mode);
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  if(is3d())window.Billiards3D.renderSnapshot();
  const area=captureArea(mode);
  if(!area){status.textContent='The table is not ready for a snapshot.';return;}
  const scale=Math.max(1,Math.min(2,devicePixelRatio||1));
  let out=document.createElement('canvas');
  out.width=Math.round(area.w*scale);out.height=Math.round(area.h*scale);
  const c=out.getContext('2d');
  c.scale(scale,scale);
  drawCapture(c,area);
  paint();
  if(includesShotInfo){
   try{out=withStroke(out.width/scale,out.height/scale,stroke,scale,out);}
   catch(error){console.error(error);status.textContent='Could not add Shot Info to the PNG.';return;}
  }
  if(native){
   const path=native.saveTrainerExport(filename,out.toDataURL('image/png'));
   status.textContent=path?(includesShotInfo?'Saved with Shot Info to ':'Saved to ')+path:'Could not save the PNG.';
   return;
  }
  out.toBlob(blob=>{
   if(!blob){status.textContent='Could not create the PNG.';return;}
   const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();
   setTimeout(()=>URL.revokeObjectURL(a.href),10000);
   status.textContent=(includesShotInfo?'Download with Shot Info requested: ':'Download requested: ')+filename+' — check browser Downloads.';
  },'image/png');
 });
 function prepareCapture(mode){
  if(mode==='current'||mode==='stroke-current')return;
  if(is3d())window.Billiards3D.prepareSnapshot();
  else if(document.getElementById('tableZoom')?.getAttribute('aria-pressed')==='true')document.getElementById('tableZoom').click();
 }
 function captureArea(mode){
  const source=document.getElementById(is3d()?'table3DCanvas':'canvas');
  const current=mode==='current'||mode==='stroke-current';
  const polygon=current?null:frame()?.corners;
  if(!source||(!current&&(!polygon||polygon.some(p=>!p))))return null;
  const rect=stage.getBoundingClientRect(),visible=source.getBoundingClientRect();
  const left=Math.max(0,polygon?Math.floor(Math.min(...polygon.map(p=>p.x))):visible.left-rect.left,-rect.left);
  const top=Math.max(0,polygon?Math.floor(Math.min(...polygon.map(p=>p.y))):visible.top-rect.top,-rect.top);
  const right=Math.min(rect.width,polygon?Math.ceil(Math.max(...polygon.map(p=>p.x))):Math.min(visible.right,innerWidth)-rect.left);
  const bottom=Math.min(rect.height,polygon?Math.ceil(Math.max(...polygon.map(p=>p.y))):Math.min(visible.bottom,innerHeight)-rect.top);
  const w=right-left,h=bottom-top;
  return w>=2&&h>=2?{source,polygon,rect,visible,left,top,w,h}:null;
 }
 function drawCapture(c,{source,polygon,rect,visible,left,top,w,h}){
  paint(undefined,false);
  c.save();
  c.beginPath();
  if(polygon){
   polygon.forEach((p,i)=>i?c.lineTo(p.x-left,p.y-top):c.moveTo(p.x-left,p.y-top));
   c.closePath();
  }else c.rect(0,0,w,h);
  c.clip();
  c.drawImage(source,visible.left-rect.left-left,visible.top-rect.top-top,visible.width,visible.height);
  c.drawImage(layer,-left,-top,rect.width,rect.height);
  c.restore();
 }
 function clipFraming(){
  if(is3d()){
   const {azimuth,elevation,radius,target}=window.Billiards3D.camera();
   return [azimuth,elevation,radius,target.x,target.y,target.z].join(':');
  }
  const zoom=window.BilliardsTableZoom;
  if(!zoom)return '';
  const a=zoom.mapPoint({x:0,y:0}),b=zoom.mapPoint({x:1,y:1});
  return [a.x,a.y,b.x,b.y].join(':');
 }
 window.BilliardsClipView={
  get mode(){return snapshotMode;},
  captureView(){return {three:is3d(),camera:is3d()?window.Billiards3D.camera():null,zoom:window.BilliardsTableZoom?.snapshot()};},
  async restoreView(saved){
   if(!saved)return;
   if(saved.three&&!is3d()){
    document.getElementById('table3DToggle').click();
    const until=performance.now()+10000;
    while(!is3d()&&performance.now()<until)await new Promise(r=>setTimeout(r,30));
    if(!is3d())throw Error('The saved 3D view is unavailable.');
   }else if(!saved.three&&is3d())window.Billiards3D.disable();
   if(saved.three)window.Billiards3D.restoreCamera(saved.camera);
   else window.BilliardsTableZoom?.restore(saved.zoom);
  },
  prepare:prepareCapture,
  create(mode,width,height){
   if(is3d())window.Billiards3D.renderSnapshot();
   const area=captureArea(mode);
   if(!area)throw Error('The table is outside the recording view.');
   const camera=clipFraming(),stageWidth=stage.clientWidth,stageHeight=stage.clientHeight;
   const canvas=document.createElement('canvas');
   canvas.width=width;canvas.height=height;
   const c=canvas.getContext('2d',{alpha:false});
   c.fillStyle='#101820';c.fillRect(0,0,width,height);
   let compositionW=area.w,compositionH=area.h;
   const panel=(mode==='stroke'||mode==='stroke-current')?withStroke(area.w,area.h,window.billiardsTourBridge.strokeSnapshot(),1):null;
   if(panel){compositionW=panel.width;compositionH=panel.height;}
   const fit=Math.min(width/compositionW,height/compositionH);
   c.translate((width-compositionW*fit)/2,(height-compositionH*fit)/2);
   c.scale(fit,fit);
   if(panel)c.drawImage(panel,0,0);
   c.translate(0,(compositionH-area.h)/2);
   return {canvas,paint(){
    if(stage.clientWidth!==stageWidth||stage.clientHeight!==stageHeight||clipFraming()!==camera)
     throw Error('The recording view changed.');
    if(is3d())window.Billiards3D.renderSnapshot();
    c.fillStyle='#101820';c.fillRect(0,0,area.w,area.h);
    drawCapture(c,area);
   }};
  },
  // Unlike shot playback, a camera clip intentionally allows the framing to
  // change from one frame to the next. Build each frame from the live stage.
  createLive(mode,width,height){
   const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
   const c=canvas.getContext('2d',{alpha:false});
   const table=document.createElement('canvas');
   return {canvas,paint(){
    if(is3d())window.Billiards3D.renderSnapshot();
    const area=captureArea(mode==='stroke'?'current':mode);
    if(!area)throw Error('The table is outside the recording view.');
    table.width=Math.max(1,Math.ceil(area.w));table.height=Math.max(1,Math.ceil(area.h));
    drawCapture(table.getContext('2d'),area);
    const framed=(mode==='stroke'||mode==='stroke-current')
     ?withStroke(area.w,area.h,window.billiardsTourBridge.strokeSnapshot(),1,table):table;
    c.setTransform(1,0,0,1,0,0);c.fillStyle='#101820';c.fillRect(0,0,width,height);
    const fit=Math.min(width/framed.width,height/framed.height);
    c.drawImage(framed,(width-framed.width*fit)/2,(height-framed.height*fit)/2,framed.width*fit,framed.height*fit);
   }};
  }
 };
 function withStroke(w,h,shot,scale,table){
  const percent=value=>Number.isFinite(value)?value.toFixed(1)+'%':'—';
  const diamonds=value=>Number.isFinite(value)?value.toFixed(1)+' ♦':'—';
  const rows=[
   ['Speed',shot.speed.toFixed(2)+' m/s'],
   ['Power',shot.diamonds.toFixed(1)+' ♦'],
   ['Follow',Math.max(0,shot.followPercent)+'%'],
   ['Draw',Math.max(0,-shot.followPercent)+'%'],
   ['Left',Math.max(0,-shot.sidePercent)+'%'],
   ['Right',Math.max(0,shot.sidePercent)+'%'],
   ['Overlap',percent(shot.overlapPercent)],
   ['Cut angle',Number.isFinite(shot.cutDegrees)?shot.cutDegrees.toFixed(1)+'°':'—'],
   ['Exit angle',Number.isFinite(shot.exitDegrees)?shot.exitDegrees.toFixed(1)+'°':'—'],
   ['Cue elevation',shot.elevation.toFixed(1)+'°'],
   ['Cue at object (C)',diamonds(shot.cueImpactDiamonds)],
   ['Object at pocket (P)',diamonds(shot.pocketArrivalDiamonds)]
  ];
  const result=document.createElement('canvas'),panelW=340;
  const rowTop=58,rowHeight=31,tipY=rowTop+rows.length*rowHeight+10,panelH=tipY+210+14;
  result.width=Math.round((w+panelW)*scale);result.height=Math.round(Math.max(h,panelH)*scale);
  const c=result.getContext('2d');c.scale(scale,scale);
  const height=result.height/scale;
  c.fillStyle='#101820';c.fillRect(0,0,w+panelW,height);
  if(table)c.drawImage(table,0,(height-h)/2,w,h);
  c.fillStyle='#1c2a35';c.fillRect(w,0,panelW,height);
  c.fillStyle='#ffc78a';c.font='700 23px system-ui';c.fillText('Shot Info',w+18,38);
  c.font='600 16px system-ui';c.textBaseline='middle';
  rows.forEach(([label,value],index)=>{
   const y=rowTop+index*rowHeight,boxX=w+218,boxW=104;
   c.fillStyle=index%2===0?'#294252':'#20333f';c.fillRect(w+8,y-2,panelW-16,30);
   c.fillStyle='#415766';c.fillRect(w+8,y+28,panelW-16,1);
   c.fillStyle='#f1f5f9';c.textAlign='center';c.fillText(label,(w+boxX)/2,y+13);
   c.beginPath();c.roundRect(boxX,y,boxW,26,5);
   c.fillStyle='#101b24';c.fill();c.strokeStyle='#8297a8';c.lineWidth=1;c.stroke();
   c.fillStyle='#fff';c.textAlign='center';c.fillText(value,boxX+boxW/2,y+13,boxW-8);
  });
  c.drawImage(shot.tip,w+20,tipY,300,210);
  return result;
 }
 function erase(ev){
  const rect=stage.getBoundingClientRect(),item=paint({x:ev.clientX-rect.left,y:ev.clientY-rect.top});
  if(item){if(!gesture.changed)remember();gesture.changed=true;items=items.filter(entry=>entry!==item);persist();}
  paint();
 }
 function startText(ev,p){
  const kind=ev.target.closest?.('[data-text-handle]')?.dataset.textHandle;
  if(kind&&selectedText){gesture={id:ev.pointerId,text:selectedText,start:p,changed:false,handle:kind};inlineText.blur();return;}
  const rect=stage.getBoundingClientRect(),f=frame();
  const hit=f?[...items].reverse().find(item=>item.tool==='text'&&paintText(item,f,{x:ev.clientX-rect.left,y:ev.clientY-rect.top},false)):null;
  if(hit){
   selectText(hit);
   gesture={id:ev.pointerId,text:hit,start:p,changed:false};
  }else{
   if(selectedText){selectedText=null;inlineText.blur();paint();return;}
   const text=textInput.value.trim().slice(0,160);
   if(!text){textInput.focus();paint();return;}
   const item={tool:'text',color:currentColor(),text,rotation:Number(rotationInput.value),scale:1,points:[p]};
   remember();items=items.concat(item);selectText(item);persist();
   gesture={id:ev.pointerId,text:item,start:p,changed:true};
   textInput.blur();
  }
  paint();
 }
 function moveText(p){
  const original=gesture.text,anchor=original.points[0];
  let changes;
  if(gesture.handle){
   const f=frame(),dx=(p.x-anchor.x)*f.L,dy=(p.y-anchor.y)*f.W;
   const sx=(gesture.start.x-anchor.x)*f.L,sy=(gesture.start.y-anchor.y)*f.W;
   if(gesture.handle==='rotate'){
    const rotation=((original.rotation+(Math.atan2(dy,dx)-Math.atan2(sy,sx))*180/Math.PI)%360+360)%360;
    if(Math.abs(rotation-original.rotation)<.1&&!gesture.changed)return;
    changes={rotation};rotationInput.value=String(Math.round(rotation));angleOutput.textContent=Math.round(rotation)+'°';
   }else{
    const scale=clamp((original.scale||1)*Math.hypot(dx,dy)/Math.max(.001,Math.hypot(sx,sy)),.15,6);
    if(Math.abs(scale-(original.scale||1))<.005&&!gesture.changed)return;
    changes={scale};
   }
  }else{
   const position={x:clamp(anchor.x+p.x-gesture.start.x,0,1),y:clamp(anchor.y+p.y-gesture.start.y,0,1)};
   if(Math.hypot(position.x-anchor.x,position.y-anchor.y)<.003&&!gesture.changed)return;
   changes={points:[position]};
  }
  if(!gesture.changed){remember();gesture.changed=true;}
  const previous=selectedText;
  selectedText={...original,...changes};
  items=items.map(item=>item===previous?selectedText:item);
  persist();paint();
 }
 interaction.addEventListener('pointerdown',ev=>{if(locked||!activeTool||gesture||ev.button!==0)return;const p=point(ev);if(!p)return;ev.preventDefault();ev.stopPropagation();interaction.setPointerCapture(ev.pointerId);if(activeTool==='text'){startText(ev,p);return;}if(activeTool==='erase'){gesture={id:ev.pointerId};erase(ev);return;}gesture={id:ev.pointerId,item:{tool:activeTool,color:currentColor(),points:[p,{...p}]}};paint();});
 interaction.addEventListener('pointermove',ev=>{if(!gesture||gesture.id!==ev.pointerId)return;const p=point(ev);if(!p)return;ev.preventDefault();ev.stopPropagation();if(gesture.text){moveText(p);return;}if(!gesture.item){erase(ev);return;}const pts=gesture.item.points;if(gesture.item.tool==='draw'){if(pts.length>=999)pts.splice(1,1);pts.push(p);}else pts[1]=p;paint();});
 function end(ev){
  if(!gesture||gesture.id!==ev.pointerId)return;
  ev.preventDefault();ev.stopPropagation();
  if(gesture.text){const p=ev.type==='pointerup'?point(ev):null;if(p)moveText(p);const edit=ev.type==='pointerup'&&!gesture.changed&&!gesture.handle;gesture=null;paint();if(edit)editOnTable();return;}
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
