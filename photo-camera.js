(function(root){
 'use strict';
 function valid(q){return q.length===4&&q.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))&&q.every((p,i)=>{const b=q[(i+1)%4],c=q[(i+2)%4];return (b.x-p.x)*(c.y-b.y)-(b.y-p.y)*(c.x-b.x)>1e-6;});}
 function visibleArea(q){
  let poly=q;
  for(const [axis,edge,sign] of [['x',0,1],['x',1,-1],['y',0,1],['y',1,-1]]){
   const out=[];
   for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],insideA=sign*(a[axis]-edge)>=0,insideB=sign*(b[axis]-edge)>=0;
    if(insideA)out.push(a);
    if(insideA!==insideB){const t=(edge-a[axis])/(b[axis]-a[axis]);out.push({x:a.x+t*(b.x-a.x),y:a.y+t*(b.y-a.y)});}
   }poly=out;
  }
  return Math.abs(poly.reduce((sum,p,i)=>{const b=poly[(i+1)%poly.length];return sum+p.x*b.y-b.x*p.y;},0))/2;
 }
 function mediaBounds(w,h,width,height,cover=true){
  const scale=(cover?Math.max:Math.min)(width/w,height/h);
  return {x:(width-w*scale)/2,y:(height-h*scale)/2,width:w*scale,height:h*scale,scale};
 }
 function sourceCorners(q,bounds,width,height){return q.map(p=>({x:(p.x*width-bounds.x)/bounds.width,y:(p.y*height-bounds.y)/bounds.height}));}
 function capture(source,q,enabled){
  const w=source.videoWidth||source.naturalWidth,h=source.videoHeight||source.naturalHeight;
  if(!w||!h)throw Error('Image is not ready');
  if(enabled&&(!valid(q)||visibleArea(q)<1e-6))throw Error('Move the frame over the image');
  const points=enabled?q.map(p=>({x:p.x*w,y:p.y*h})):[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}];
  const pad=enabled?Math.ceil(Math.min(w,h)*.025):0,x=Math.max(0,Math.floor(Math.min(...points.map(p=>p.x)))-pad),y=Math.max(0,Math.floor(Math.min(...points.map(p=>p.y)))-pad);
  const width=Math.min(w,Math.ceil(Math.max(...points.map(p=>p.x)))+pad)-x,height=Math.min(h,Math.ceil(Math.max(...points.map(p=>p.y)))+pad)-y;
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');ctx.fillStyle='#000';ctx.fillRect(0,0,width,height);ctx.save();ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x-x,p.y-y):ctx.moveTo(p.x-x,p.y-y));ctx.closePath();ctx.clip();ctx.drawImage(source,-x,-y);ctx.restore();
  return {canvas,corners:enabled?points.map(p=>({x:(p.x-x)/width,y:(p.y-y)/height})):null};
 }
 let active=null;
 async function open({onCapture,onFallback,onError,file=null}){
  if(active)return;
  // Use the same trusted-gesture fullscreen entry as Trainer 3D.
  root.BilliardsDisplay?.enter(true);
  const previous=document.activeElement,modal=document.createElement('div');modal.id='tableCamera';modal.className=file?'tableCameraPhoto':'';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label',file?'Photo table frame':'Table camera');
  modal.innerHTML='<div class="tableCameraStage">'+(file?'<img alt="Selected pool table photo">':'<video autoplay muted playsinline></video>')+'<svg aria-label="Rigid 3D table frame" role="img"></svg></div><div class="tableCameraBar"><button data-action="close">Close</button><button data-action="overlay" aria-pressed="true">Frame On</button><button data-action="move" aria-pressed="false" title="Slide the frame without rotating">Hand</button><button data-action="rotate" aria-pressed="true">Rotate</button><button data-action="minus" aria-label="Shrink frame">−</button><button data-action="plus" aria-label="Enlarge frame">+</button><button data-action="top">Top</button><button data-action="swap">Swap Ends</button><button data-action="reset">Reset</button><button data-action="retry" hidden>Retry Camera</button><button data-action="settings" hidden>Camera Settings</button><button data-action="fallback"'+(file?' hidden':'')+'>Device Camera</button><button data-action="snap" disabled>'+(file?'Use Frame':'Take Photo')+'</button></div><div class="tableCameraHint" role="status">'+(file?'Opening image…':'Opening camera…')+'</div>';
  document.body.append(modal);
  const media=modal.querySelector('video,img'),svg=modal.querySelector('svg'),stage=modal.querySelector('.tableCameraStage'),hint=modal.querySelector('[role=status]'),snap=modal.querySelector('[data-action=snap]'),orbit=root.BilliardsTableOrbit;
  let stream=null,imageURL=null,closed=false,enabled=true,panning=false,ready=false,busy=false,T=null,camera=null,q=[],sourceQuad=[],swapped=false;
  const pointers=new Map(),state={continuousTilt:true,maxElevation:110*Math.PI/180,azimuth:0,elevation:Math.PI/3,radius:3,target:{x:0,y:0,z:0}},L=2,W=1,R=.028575;
  const corners=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}];
  function stop(){stream?.getTracks().forEach(t=>t.stop());stream=null;if(!file)media.srcObject=null;}
  function close(){if(closed)return;closed=true;stop();if(imageURL)URL.revokeObjectURL(imageURL);resize.disconnect();document.removeEventListener('keydown',key,true);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',close);modal.remove();active=null;previous?.focus();}
  function key(e){if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();}else if(e.key==='Tab'){const buttons=[...modal.querySelectorAll('button:not(:disabled):not([hidden])')],i=buttons.indexOf(document.activeElement);e.preventDefault();buttons[(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}}
  function visibility(){if(document.hidden&&stream&&!busy)close();}
  document.addEventListener('keydown',key,true);document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',close);
  function projected(p){const v=new T.Vector3((swapped?1-p.x:p.x)*L-L/2,0,(swapped?1-p.y:p.y)*W-W/2).project(camera);return {x:(v.x+1)/2,y:(1-v.y)/2,z:v.z};}
  function update(){if(!camera)return;orbit.updateCamera(camera,state,stage.clientWidth/Math.max(1,stage.clientHeight));}
  function draw(){
   if(closed||!camera)return;update();q=corners.map(projected);const width=stage.clientWidth,height=stage.clientHeight,w=media.videoWidth||media.naturalWidth,h=media.videoHeight||media.naturalHeight;
   const bounds=w&&h?mediaBounds(w,h,width,height,!file):null;sourceQuad=bounds?sourceCorners(q,bounds,width,height):[];
   const inImage=valid(sourceQuad)&&visibleArea(sourceQuad)>1e-6&&q.every(p=>p.z>-1&&p.z<1);
   svg.style.display=enabled&&ready?'block':'none';snap.disabled=!ready||busy||(enabled&&!inImage);
   svg.setAttribute('viewBox','0 0 '+width+' '+height);
   const pt=p=>`${p.x*width},${p.y*height}`,poly=q.map(pt).join(' '),head=projected({x:.25,y:.5}),foot=projected({x:.75,y:.5}),triangle=[{x:.75,y:.5},{x:.86,y:.32},{x:.86,y:.68}].map(projected).map(pt).join(' ');
   svg.innerHTML='<polygon points="'+poly+'" fill="transparent" stroke="'+(inImage?'#a3efd0':'#ffd283')+'" stroke-width="2"/>';
   svg.insertAdjacentHTML('beforeend','<g pointer-events="none" fill="#f3e7ba" stroke="#f3e7ba"><polygon points="'+triangle+'" fill="none" stroke-width="2"/><circle cx="'+head.x*width+'" cy="'+head.y*height+'" r="4"/><circle cx="'+foot.x*width+'" cy="'+foot.y*height+'" r="4"/></g>');
   svg.dataset.headX=String(head.x);svg.dataset.headY=String(head.y);
   if(ready)hint.textContent=enabled&&!inImage?'Move the frame over the image to select a visible area.':'Drag: '+(panning?'slide without rotating':'rotate and tilt')+'. Wheel: zoom. Two fingers: move and pinch. Only inside the frame is analyzed.';
  }
  function reset(top=false){if(!camera)return;state.azimuth=0;state.elevation=(top?90:60)*Math.PI/180;state.target={x:0,y:0,z:0};state.radius=1.5;swapped=false;
   const width=stage.clientWidth,height=stage.clientHeight,w=media.videoWidth||media.naturalWidth||width,h=media.videoHeight||media.naturalHeight||height,b=mediaBounds(w,h,width,height,!file);
   for(let step=0;step<90;step++){update();const ps=corners.map(projected);if(ps.every(p=>p.x>.08&&p.x<.92&&p.y>.13&&p.y<.87&&p.x*width>b.x+10&&p.x*width<b.x+b.width-10&&p.y*height>b.y+10&&p.y*height<b.y+b.height-10))break;state.radius*=1.035;}draw();
  }
  const resize=new ResizeObserver(draw);resize.observe(stage);
  const actions={get panning(){return panning;},pan(dx,dy){update();orbit.pan(T,camera,state,dx,dy,stage.clientHeight);},zoom(factor){orbit.zoom(state,factor,L,R);},orbit(dx,dy){orbit.orbit(state,dx,dy);}};
  svg.addEventListener('pointerdown',e=>{if(!ready||!enabled||e.button!==0)return;e.preventDefault();e.stopPropagation();svg.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,multi:pointers.size>0});if(pointers.size>1)for(const p of pointers.values())p.multi=true;});
  svg.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;e.preventDefault();e.stopPropagation();orbit.move(pointers,e,actions);draw();});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])svg.addEventListener(type,e=>{pointers.delete(e.pointerId);});
  svg.addEventListener('wheel',e=>{if(!ready)return;e.preventDefault();actions.zoom(Math.exp(Math.max(-120,Math.min(120,e.deltaY))*.002));draw();},{passive:false});
  function failure(error){ready=false;snap.disabled=true;svg.style.display='none';stop();modal.querySelector('[data-action=retry]').hidden=false;
   const name=error?.name||'Error',native=!!root.BilliardsAndroid;
   if(native&&!root.BilliardsAndroid.cameraPermissionState)hint.textContent='This installed app needs the camera-permission update. For now, use Device Camera, then align the photo frame.';
   else if(name==='NotAllowedError'||name==='SecurityError'){hint.textContent=native?'Camera access is blocked. Allow Camera in Android Settings → Apps → Billiards Trainer → Permissions, then Retry Camera.':'Camera access is blocked. Allow Camera for this site in your browser and enable Android Camera access, then Retry Camera.';modal.querySelector('[data-action=settings]').hidden=!root.BilliardsAndroid?.openCameraSettings;}
   else if(name==='NotReadableError'||name==='AbortError')hint.textContent='The camera could not start. Close other camera apps, then Retry Camera.';
   else if(name==='NotFoundError')hint.textContent='No camera was found. Check that Android Camera access is on, then Retry Camera.';
   else hint.textContent='Live camera is unavailable ('+name+'). Retry Camera or use Device Camera.';
   modal.dataset.cameraError=name;
  }
  async function startCamera(){if(busy||closed)return;busy=true;ready=false;snap.disabled=true;stop();hint.textContent='Requesting camera access…';
   try{
    if(!navigator.mediaDevices?.getUserMedia)throw Object.assign(Error('Camera API unavailable'),{name:'NotSupportedError'});
    let acquired;try{acquired=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false});}catch(e){if(e.name!=='OverconstrainedError')throw e;acquired=await navigator.mediaDevices.getUserMedia({video:true,audio:false});}
    if(closed){acquired.getTracks().forEach(t=>t.stop());return;}stream=acquired;media.srcObject=stream;await media.play();if(closed)return;ready=true;modal.querySelector('[data-action=retry]').hidden=true;modal.querySelector('[data-action=settings]').hidden=true;delete modal.dataset.cameraError;
   }catch(error){if(!closed)failure(error);}finally{busy=false;if(ready){reset();draw();}}
  }
  modal.querySelector('.tableCameraBar').addEventListener('click',async e=>{
   const action=e.target.closest('button')?.dataset.action;if(!action)return;
   if(action==='close')close();
   if(action==='fallback'){close();onFallback?.();}
   if(action==='retry')startCamera();
   if(action==='settings')root.BilliardsAndroid?.openCameraSettings?.();
   if(action==='overlay'){enabled=!enabled;e.target.textContent=enabled?'Frame On':'Frame Off';e.target.setAttribute('aria-pressed',String(enabled));draw();}
   if(action==='move'||action==='rotate'){pointers.clear();panning=action==='move';modal.querySelector('[data-action=move]').setAttribute('aria-pressed',String(panning));modal.querySelector('[data-action=rotate]').setAttribute('aria-pressed',String(!panning));draw();}
   if(action==='plus'||action==='minus'){actions.zoom(action==='plus'?.88:1/.88);draw();}
   if(action==='top'||action==='reset')reset(action==='top');
   if(action==='swap'){swapped=!swapped;draw();}
   if(action==='snap'&&!snap.disabled){busy=true;snap.disabled=true;try{const result=capture(media,sourceQuad,enabled),blob=await new Promise(resolve=>result.canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Capture failed');if(closed)return;close();onCapture(blob,result.corners);}catch(error){if(!closed){busy=false;draw();hint.textContent=error.message;}}}
  });
  active={close,snapshot:()=>({state:JSON.parse(JSON.stringify(state)),quad:q.map(p=>({...p})),sourceQuad:sourceQuad.map(p=>({...p})),panning,ready,engine:'Three.js / shared Trainer 3D camera',table:{L,W}})};
  modal.querySelector('button').focus();
  try{T=await import('./vendor/three/three-renderer.js?v=4');if(closed)return;camera=new T.PerspectiveCamera(44,1,.01,100);
   if(file){imageURL=URL.createObjectURL(file);media.src=imageURL;await media.decode();if(closed)return;ready=true;reset();}
   else await startCamera();
  }catch(error){if(closed)return;if(file){if(onError){close();onError(error);}else hint.textContent='Could not open this image.';}else failure(error);}
 }
 const api={open,close:()=>active?.close(),snapshot:()=>active?.snapshot(),valid,visibleArea,mediaBounds,sourceCorners,capture};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.BilliardsTableCamera=api;
})(typeof window==='object'?window:globalThis);
