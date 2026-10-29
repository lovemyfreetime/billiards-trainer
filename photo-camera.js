(function(root){
 'use strict';
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function valid(q){return q.length===4&&q.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))&&q.every((p,i)=>{const b=q[(i+1)%4],c=q[(i+2)%4];return (b.x-p.x)*(c.y-b.y)-(b.y-p.y)*(c.x-b.x)>.002;});}
 function project(s){
  return [[-1,-.5],[1,-.5],[1,.5],[-1,.5]].map(([x,y])=>{
   const z=1+s.tiltX*x+s.tiltY*y*2,xx=x/z,yy=y/z,co=Math.cos(s.angle),si=Math.sin(s.angle);
   return {x:s.x+s.size*(xx*co-yy*si),y:s.y+s.size*(xx*si+yy*co)};
  });
 }
 function transform(q,a,b,aspect=1){
  q=q.map(p=>({x:p.x*aspect,y:p.y}));a=a.map(p=>({x:p.x*aspect,y:p.y}));b=b.map(p=>({x:p.x*aspect,y:p.y}));
  const ac={x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2},bc={x:(b[0].x+b[1].x)/2,y:(b[0].y+b[1].y)/2};
  const d=p=>Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y),angle=p=>Math.atan2(p[1].y-p[0].y,p[1].x-p[0].x);
  const scale=clamp(d(b)/Math.max(.01,d(a)),.2,5),r=angle(b)-angle(a),co=Math.cos(r),si=Math.sin(r);
  return q.map(p=>({x:(bc.x+scale*((p.x-ac.x)*co-(p.y-ac.y)*si))/aspect,y:bc.y+scale*((p.x-ac.x)*si+(p.y-ac.y)*co)}));
 }
 function capture(video,q,enabled){
  const w=video.videoWidth||video.naturalWidth,h=video.videoHeight||video.naturalHeight;
  const points=enabled?q.map(p=>({x:p.x*w,y:p.y*h})): [{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}];
  const pad=enabled?Math.ceil(Math.min(w,h)*.025):0;
  const x=Math.max(0,Math.floor(Math.min(...points.map(p=>p.x)))-pad),y=Math.max(0,Math.floor(Math.min(...points.map(p=>p.y)))-pad);
  const width=Math.min(w,Math.ceil(Math.max(...points.map(p=>p.x)))+pad)-x,height=Math.min(h,Math.ceil(Math.max(...points.map(p=>p.y)))+pad)-y;
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#000';ctx.fillRect(0,0,width,height);ctx.save();ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x-x,p.y-y):ctx.moveTo(p.x-x,p.y-y));ctx.closePath();ctx.clip();ctx.drawImage(video,-x,-y);ctx.restore();
  return {canvas,corners:enabled?points.map(p=>({x:(p.x-x)/width,y:(p.y-y)/height})):null};
 }
 let active=null;
 async function open({onCapture,onFallback,onError,file=null}){
  if(active)return;const previous=document.activeElement;
  const modal=document.createElement('div');modal.id='tableCamera';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label',file?'Photo table frame':'Table camera');
  modal.innerHTML='<div class="tableCameraBar"><button data-action="close" aria-label="Close camera">Close</button><button data-action="overlay" aria-pressed="true">Frame On</button><button data-action="mode" aria-pressed="false">Tilt</button><button data-action="swap">Swap Ends</button><button data-action="reset">Reset</button><button data-action="fallback">Device Camera</button><button data-action="snap" disabled>Take Photo</button></div><div class="tableCameraStage"><video autoplay muted playsinline></video><svg aria-label="Adjust table frame"></svg></div><div class="tableCameraHint" role="status">Opening camera…</div>';
  if(file){modal.querySelector('[role=status]').textContent='Opening image…';modal.querySelector('[data-action=close]').setAttribute('aria-label','Close photo frame');modal.querySelector('video').replaceWith(document.createElement('img'));modal.querySelector('img').alt='Selected pool table photo';modal.querySelector('[data-action=fallback]').hidden=true;modal.querySelector('[data-action=snap]').textContent='Use Frame';}
  document.body.append(modal);const video=modal.querySelector('video,img'),svg=modal.querySelector('svg'),hint=modal.querySelector('[role=status]'),snap=modal.querySelector('[data-action=snap]');
  let stream=null,imageURL=null,closed=false,enabled=true,mode='tilt',q=[],gesture=null;const fingers=new Map();
  function close(){if(closed)return;closed=true;stream?.getTracks().forEach(t=>t.stop());video.srcObject=null;if(imageURL)URL.revokeObjectURL(imageURL);resize.disconnect();document.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',close);modal.remove();active=null;previous?.focus();}
  function key(e){if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();}else if(e.key==='Tab'){const buttons=[...modal.querySelectorAll('button:not(:disabled):not([hidden])')],i=buttons.indexOf(document.activeElement);e.preventDefault();buttons[(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}}
  function visibility(){if(document.hidden)close();}
  active={close};document.addEventListener('keydown',key);document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',close);
  function draw(){
   const r=video.getBoundingClientRect(),stage=video.parentElement.getBoundingClientRect();svg.style.left=(r.left-stage.left)+'px';svg.style.top=(r.top-stage.top)+'px';svg.style.width=r.width+'px';svg.style.height=r.height+'px';svg.setAttribute('viewBox','0 0 1000 1000');svg.setAttribute('preserveAspectRatio','none');
   svg.style.display=enabled?'block':'none';const poly=q.map(p=>`${p.x*1000},${p.y*1000}`).join(' ');
   const cal=root.BilliardsPhotoCalibration,fit=cal?.fit([{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}],q);
   const map=p=>{const v=fit?cal.apply(fit.H,p):{x:.5,y:.5};return {x:v.x*1000,y:v.y*1000};};
   const head=map({x:.25,y:.5}),foot=map({x:.75,y:.5}),dotRX=4500/Math.max(1,r.width),dotRY=4500/Math.max(1,r.height);
   const triangle=[{x:.75,y:.5},{x:.86,y:.32},{x:.86,y:.68}].map(map).map(p=>p.x+','+p.y).join(' ');
   svg.innerHTML='<path fill="rgba(0,0,0,.78)" fill-rule="evenodd" d="M0 0H1000V1000H0Z M'+q.map(p=>`${p.x*1000} ${p.y*1000}`).join('L')+'Z"/><polygon points="'+poly+'" fill="transparent" stroke="#a3efd0" stroke-width="2" vector-effect="non-scaling-stroke"/>'+q.map((p,i)=>'<circle data-corner="'+i+'" cx="'+p.x*1000+'" cy="'+p.y*1000+'" r="18" fill="#dbfff0" stroke="#20614a" stroke-width="2"/>').join('');
   svg.insertAdjacentHTML('beforeend','<g pointer-events="none" fill="#f3e7ba" stroke="#f3e7ba"><polygon points="'+triangle+'" fill="none" stroke-width="2" vector-effect="non-scaling-stroke"/><ellipse cx="'+head.x+'" cy="'+head.y+'" rx="'+dotRX+'" ry="'+dotRY+'"/><ellipse cx="'+foot.x+'" cy="'+foot.y+'" rx="'+dotRX+'" ry="'+dotRY+'"/></g>');
   svg.dataset.headX=String(head.x);svg.dataset.headY=String(head.y);
  }
  function reset(){const aspect=(video.videoWidth||video.naturalWidth)/(video.videoHeight||video.naturalHeight)||16/9;q=project({x:.5,y:.5,size:Math.min(.32,.60/aspect),angle:0,tiltX:0,tiltY:0}).map(p=>({x:p.x,y:.5+(p.y-.5)*aspect}));draw();}
  function message(){hint.textContent='One finger: '+(mode==='tilt'?'tilt perspective':'move frame')+'. Two fingers: move, pinch to resize, twist to rotate. Drag corners to match the inner cushion edges. Put the triangle at the rack end; Swap Ends reverses it.';}
  const resize=new ResizeObserver(()=>draw());resize.observe(video.parentElement);reset();
  const point=e=>{const r=svg.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};};
  function begin(corner=-1){gesture={points:[...fingers.values()].map(p=>({...p})),q:q.map(p=>({...p})),corner};}
  svg.addEventListener('pointerdown',e=>{if(!enabled)return;e.preventDefault();svg.setPointerCapture(e.pointerId);fingers.set(e.pointerId,point(e));const p=point(e),r=svg.getBoundingClientRect();let corner=q.findIndex(v=>Math.hypot((v.x-p.x)*r.width,(v.y-p.y)*r.height)<28);begin(fingers.size===1?corner:-1);});
  svg.addEventListener('pointermove',e=>{
   if(!fingers.has(e.pointerId))return;e.preventDefault();fingers.set(e.pointerId,point(e));const p=[...fingers.values()];let next;
   if(p.length>=2&&gesture.points.length>=2)next=transform(gesture.q,gesture.points,p,svg.clientWidth/svg.clientHeight);
   else {const dx=p[0].x-gesture.points[0].x,dy=p[0].y-gesture.points[0].y;
    if(gesture.corner>=0)next=gesture.q.map((v,i)=>i===gesture.corner?{x:v.x+dx,y:v.y+dy}:{...v});
    else if(mode==='move')next=gesture.q.map(v=>({x:v.x+dx,y:v.y+dy}));
    else {const cx=gesture.q.reduce((a,v)=>a+v.x/4,0),cy=gesture.q.reduce((a,v)=>a+v.y/4,0);next=gesture.q.map(v=>{const x=v.x-cx,y=v.y-cy,z=1+clamp(dx*3,-1,1)*x+clamp(dy*3,-1,1)*y;return {x:cx+x/z,y:cy+y/z};});}
   }
   if(valid(next)){
    // Keep touch handles away from toolbar hit targets and viewport clipping.
    const mx=Math.min(.12,24/svg.clientWidth),my=Math.min(.12,24/svg.clientHeight);
    const minX=Math.min(...next.map(v=>v.x)),maxX=Math.max(...next.map(v=>v.x)),minY=Math.min(...next.map(v=>v.y)),maxY=Math.max(...next.map(v=>v.y));
    const scale=Math.min(1,(1-2*mx)/(maxX-minX),(1-2*my)/(maxY-minY)),cx=(minX+maxX)/2,cy=(minY+maxY)/2;
    next=next.map(v=>({x:cx+(v.x-cx)*scale,y:cy+(v.y-cy)*scale}));
    const left=Math.min(...next.map(v=>v.x)),right=Math.max(...next.map(v=>v.x)),top=Math.min(...next.map(v=>v.y)),bottom=Math.max(...next.map(v=>v.y));
    const sx=left<mx?mx-left:right>1-mx?1-mx-right:0,sy=top<my?my-top:bottom>1-my?1-my-bottom:0;
    q=next.map(v=>({x:v.x+sx,y:v.y+sy}));draw();
   }
  });
  function end(e){fingers.delete(e.pointerId);if(fingers.size)begin();else gesture=null;}
  for(const type of ['pointerup','pointercancel','lostpointercapture'])svg.addEventListener(type,end);
  modal.querySelector('.tableCameraBar').addEventListener('click',async e=>{
   const action=e.target.dataset.action;if(!action)return;
   if(action==='close')close();
   if(action==='fallback'){close();onFallback();}
   if(action==='overlay'){enabled=!enabled;e.target.textContent=enabled?'Frame On':'Frame Off';e.target.setAttribute('aria-pressed',String(enabled));draw();}
   if(action==='mode'){mode=mode==='tilt'?'move':'tilt';e.target.textContent=mode==='tilt'?'Tilt':'Move';e.target.setAttribute('aria-pressed',String(mode==='move'));message();}
   if(action==='reset')reset();
   if(action==='swap'){q=[q[2],q[3],q[0],q[1]];draw();}
   if(action==='snap'&&(video.videoWidth||video.naturalWidth)&&!snap.disabled){
    snap.disabled=true;try{const result=capture(video,q,enabled);const blob=await new Promise(resolve=>result.canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Capture failed');if(closed)return;close();onCapture(blob,result.corners);}catch(err){hint.textContent='Could not capture. Please try again.';snap.disabled=false;}
   }
  });
  modal.querySelector('button').focus();
  try{
   if(file){imageURL=URL.createObjectURL(file);video.src=imageURL;await video.decode();if(closed)return;reset();message();snap.disabled=false;return;}
   if(!navigator.mediaDevices?.getUserMedia)throw Error('Live camera unavailable');
   stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false});
   if(closed){stream.getTracks().forEach(t=>t.stop());return;}
   video.srcObject=stream;await video.play();if(closed)return;reset();message();snap.disabled=false;
  }catch(err){if(file&&onError&&!closed){close();onError(err);return;}if(!closed)hint.textContent=file?'This image could not be opened. Close and select a PNG, JPG or WEBP image.':'Live camera unavailable or permission denied. Allow camera access and reopen, or use Device Camera.';}
 }
 const api={open,close:()=>active?.close(),project,transform,valid,capture};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.BilliardsTableCamera=api;
})(typeof window==='object'?window:globalThis);
