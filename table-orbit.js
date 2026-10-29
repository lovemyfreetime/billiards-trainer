/* Shared rigid-table camera controls for Trainer 3D and the photo viewfinder. */
(function(root){
 'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function viewTangent(aspect){return Math.tan(29*Math.PI/180)/Math.max(1,aspect);}
 function orbit(state,dx,dy){state.azimuth+=dx;state.elevation=clamp(state.elevation+dy,2*Math.PI/180,88*Math.PI/180);}
 function zoom(state,factor,L,R){state.radius=clamp(state.radius*factor,Math.max(R*5,L*.06),L*8);}
 function updateCamera(camera,state,aspect){
  camera.aspect=aspect;camera.fov=2*Math.atan(viewTangent(aspect))*180/Math.PI;camera.updateProjectionMatrix();
  const target=state.target||{x:0,y:0,z:0},horizontal=state.radius*Math.cos(state.elevation);
  camera.position.set(target.x+Math.sin(state.azimuth)*horizontal,target.y+state.radius*Math.sin(state.elevation),target.z+Math.cos(state.azimuth)*horizontal);
  camera.lookAt(target.x,target.y,target.z);camera.updateMatrixWorld(true);
 }
 function pan(T,camera,state,dx,dy,height){
  const scale=2*state.radius*Math.tan(camera.fov*Math.PI/360)/Math.max(1,height);
  const right=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,0),up=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,1),shift=right.multiplyScalar(-dx*scale).addScaledVector(up,dy*scale);
  const target=state.target||(state.target={x:0,y:0,z:0});target.x+=shift.x;target.y+=shift.y;target.z+=shift.z;
 }
 function move(pointers,e,actions){
  const p=pointers.get(e.pointerId);if(!p)return;
  if(pointers.size===2){const q=[...pointers].find(([id])=>id!==e.pointerId)[1],before=Math.hypot(p.x-q.x,p.y-q.y),after=Math.hypot(e.clientX-q.x,e.clientY-q.y);actions.pan((e.clientX-p.x)/2,(e.clientY-p.y)/2);if(before>8&&after>8)actions.zoom(before/after);}
  else if(!p.multi){if(actions.panning)actions.pan(e.clientX-p.x,e.clientY-p.y);else actions.orbit(-(e.clientX-p.x)*.008,(e.clientY-p.y)*.006);}
  pointers.set(e.pointerId,{...p,x:e.clientX,y:e.clientY});
 }
 const api={viewTangent,orbit,zoom,updateCamera,pan,move};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.BilliardsTableOrbit=api;
})(typeof window==='object'?window:globalThis);
