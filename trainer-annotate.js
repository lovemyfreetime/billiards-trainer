/* Compact table annotations and table-only PNG snapshots. */
(() => {
 'use strict';
 const stage=document.getElementById('stageWrap'),group=document.getElementById('trainerAnnotateGroup');
 if(!stage||!group)return;
 const layer=document.createElement('canvas');layer.id='trainerAnnotationCanvas';layer.setAttribute('aria-label','Table annotations');stage.append(layer);
 const interaction=document.createElementNS('http://www.w3.org/2000/svg','svg');interaction.id='trainerAnnotationInput';interaction.setAttribute('aria-hidden','true');const hitArea=document.createElementNS('http://www.w3.org/2000/svg','polygon');hitArea.setAttribute('fill','transparent');interaction.append(hitArea);stage.append(interaction);
 const ctx=layer.getContext('2d'),tools=[...group.querySelectorAll('[data-annotate-tool]')],color=document.getElementById('trainerAnnotateColor');
 let activeTool='',items=[],gesture=null,dpr=1;
 const currentColor=()=>color?.value||'#ff4d4d',clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const is3d=()=>!!window.Billiards3D?.active;
 function frame(){
  if(is3d()){
   const b=window.billiardsTourBridge?.snapshot?.(),L=b?.tableL,W=b?.tableW;if(!L||!W)return null;
   const project=p=>{const q=window.Billiards3D.project(p,0);return q&&q.visible?{x:q.x-stage.getBoundingClientRect().left,y:q.y-stage.getBoundingClientRect().top}:null;};
   const x=L*.0471,y=W*.0948,corners=[{x:-x,y:-y},{x:L+x,y:-y},{x:L+x,y:W+y},{x:-x,y:W+y}],surface=[{x:0,y:0},{x:L,y:0},{x:L,y:W},{x:0,y:W}],map=p=>project({x:p.x*L,y:p.y*W});
   const projectedCorners=corners.map(project),projectedSurface=surface.map(project);if(projectedCorners.some(p=>!p)||projectedSurface.some(p=>!p))return null;
   return {L,W,corners:projectedCorners,surface:projectedSurface,map};
  }
  const f=window.billiardsTourBridge?.annotationFrame?.();return f?{...f,L:f.length,W:f.width}:null;
 }
 function size(){dpr=Math.max(1,Math.min(2,devicePixelRatio||1));const r=stage.getBoundingClientRect();layer.width=Math.max(1,Math.round(r.width*dpr));layer.height=Math.max(1,Math.round(r.height*dpr));layer.style.width=r.width+'px';layer.style.height=r.height+'px';ctx.setTransform(dpr,0,0,dpr,0,0);paint();}
 function screen(p,f){return f.map(p);}
 function paint(){const r=stage.getBoundingClientRect(),f=frame();ctx.clearRect(0,0,r.width,r.height);if(!f){hitArea.setAttribute('points','');return;}hitArea.setAttribute('points',f.surface.map(p=>`${p.x},${p.y}`).join(' '));
  for(const item of [...items,...(gesture?.item?[gesture.item]:[])]){const pts=item.points.map(p=>screen(p,f));if(pts.some(p=>!p))continue;ctx.save();ctx.strokeStyle=item.color;ctx.fillStyle=item.color;ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
   if(item.tool==='circle'){const center=pts[0],a=item.points[0],b=item.points[1],radius=Math.hypot((b.x-a.x)*f.L,(b.y-a.y)*f.W),px=f.map({x:a.x+radius/f.L,y:a.y}),py=f.map({x:a.x,y:a.y+radius/f.W}),rx=px?Math.hypot(px.x-center.x,px.y-center.y):Math.hypot(pts[1].x-center.x,pts[1].y-center.y),ry=py?Math.hypot(py.x-center.x,py.y-center.y):rx;ctx.ellipse(center.x,center.y,Math.max(2,rx),Math.max(2,ry),0,0,Math.PI*2);ctx.stroke();}
   else{ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);ctx.stroke();if(item.tool==='arrow'&&pts.length>=2){const a=pts.at(-2),b=pts.at(-1),angle=Math.atan2(b.y-a.y,b.x-a.x),head=12;ctx.beginPath();ctx.moveTo(b.x-head*Math.cos(angle-Math.PI/6),b.y-head*Math.sin(angle-Math.PI/6));ctx.lineTo(b.x,b.y);ctx.lineTo(b.x-head*Math.cos(angle+Math.PI/6),b.y-head*Math.sin(angle+Math.PI/6));ctx.stroke();}}
   ctx.restore();
  }
 }
 function point(ev){if(is3d()){const q=window.Billiards3D.tablePoint?.(ev);if(!q)return null;const s=window.billiardsTourBridge?.snapshot?.();return s?.tableL&&s?.tableW?{x:q.x/s.tableL,y:q.y/s.tableW}:null;}return window.billiardsTourBridge?.annotationFrame?.().inverse({x:ev.clientX,y:ev.clientY})||null;}
 function choose(tool){activeTool=activeTool===tool?'':tool;interaction.classList.toggle('active',!!activeTool);for(const b of tools)b.setAttribute('aria-pressed',String(b.dataset.annotateTool===activeTool));layer.setAttribute('aria-label',activeTool?`Annotate table: ${activeTool}`:'Table annotations');}
 tools.forEach(b=>b.addEventListener('click',()=>choose(b.dataset.annotateTool)));
 group.querySelector('#trainerAnnotateClear').addEventListener('click',()=>{items=[];paint();});
 group.querySelector('#trainerAnnotateSnapshot').addEventListener('click',async()=>{
  const was3d=is3d();if(was3d)window.Billiards3D.prepareSnapshot();else if(document.getElementById('tableZoom')?.getAttribute('aria-pressed')==='true')document.getElementById('tableZoom').click();
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  if(was3d)window.Billiards3D.renderSnapshot();
  const f=frame(),source=was3d?document.getElementById('table3DCanvas'):document.getElementById('canvas');if(!f||!source){window.alert('The full table is not ready for a snapshot.');return;}
  const polygon=f.corners,rect=stage.getBoundingClientRect(),xs=polygon.map(p=>p.x),ys=polygon.map(p=>p.y),left=Math.max(0,Math.floor(Math.min(...xs))),top=Math.max(0,Math.floor(Math.min(...ys))),right=Math.min(rect.width,Math.ceil(Math.max(...xs))),bottom=Math.min(rect.height,Math.ceil(Math.max(...ys))),w=right-left,h=bottom-top;if(w<2||h<2)return;
  const out=document.createElement('canvas'),scale=was3d?Math.min(2,devicePixelRatio||1):Math.max(1,Math.min(2,devicePixelRatio||1));out.width=Math.round(w*scale);out.height=Math.round(h*scale);const c=out.getContext('2d');c.scale(scale,scale);c.beginPath();polygon.forEach((p,i)=>i?c.lineTo(p.x-left,p.y-top):c.moveTo(p.x-left,p.y-top));c.closePath();c.clip();
  const sourceRect=source.getBoundingClientRect();c.drawImage(source,sourceRect.left-rect.left-left,sourceRect.top-rect.top-top,sourceRect.width,sourceRect.height);
  c.drawImage(layer,-left,-top,rect.width,rect.height);
  out.toBlob(blob=>{if(!blob)return;const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='billiards-table-snapshot.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);},'image/png');
 });
 interaction.addEventListener('pointerdown',ev=>{if(!activeTool||ev.button!==0)return;const p=point(ev);if(!p)return;ev.preventDefault();ev.stopPropagation();interaction.setPointerCapture(ev.pointerId);gesture={id:ev.pointerId,item:{tool:activeTool,color:currentColor(),points:[p,{...p}]}};paint();});
 interaction.addEventListener('pointermove',ev=>{if(!gesture||gesture.id!==ev.pointerId)return;const p=point(ev);if(!p)return;ev.preventDefault();ev.stopPropagation();const pts=gesture.item.points;if(gesture.item.tool==='draw')pts.push(p);else pts[1]=p;paint();});
 function end(ev){if(!gesture||gesture.id!==ev.pointerId)return;ev.preventDefault();ev.stopPropagation();if(gesture.item.points.length>1&&gesture.item.tool!=='draw'||gesture.item.points.length>2)items.push(gesture.item);gesture=null;paint();}
 interaction.addEventListener('pointerup',end);interaction.addEventListener('pointercancel',end);
 window.addEventListener('billiards:2d-render',()=>{if(!is3d())paint();});
 window.addEventListener('resize',size);window.addEventListener('billiards:3d-render',paint);if(window.ResizeObserver)new ResizeObserver(size).observe(stage);size();
})();
