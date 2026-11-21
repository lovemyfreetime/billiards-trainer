/* Continuous planar contacts against the same cushion nose used by both table views.
   Units are metres and seconds. A pocket gate remains a profile-specific capture model. */
(function(root){
'use strict';
const timeSlop=1e-11;
function jawContact(b,remaining,R,jaw){
 const {x,y,vx,vy}=b,speed2=vx*vx+vy*vy;
 if(!speed2)return null;
 const ex=x+vx*remaining,ey=y+vy*remaining;
 if(Math.max(x,ex)<jaw.x0||Math.min(x,ex)>jaw.x1||Math.max(y,ey)<jaw.y0||Math.min(y,ey)>jaw.y1)return null;
 let best=null;
 function consider(t,nx,ny,push=0){
  if(t < -timeSlop || t>remaining+timeSlop || vx*nx+vy*ny>=-1e-9)return;
  t=Math.max(0,Math.min(remaining,t));
  if(!best||t<best.t)best={kind:'jaw',t,nx,ny,push,jaw:jaw.id};
 }
 for(const edge of jaw.edges){
  const {a,ux,uy,len}=edge,dx=x-a.x,dy=y-a.y,along=dx*ux+dy*uy,normal=-dx*uy+dy*ux;
  const vn=-vx*uy+vy*ux;
  if(vn){
   const sign=vn<0?1:-1,t=(sign*R-normal)/vn;
   const at=along+t*(vx*ux+vy*uy);
   if(at>=0&&at<=len)consider(t,-uy*sign,ux*sign);
  }
  // Layouts restored in light contact can begin a drift slightly inside the nose.
  const closest=Math.max(0,Math.min(len,along)),sx=dx-ux*closest,sy=dy-uy*closest,d=Math.hypot(sx,sy);
  if(d>1e-12 && d<R-1e-10)consider(0,sx/d,sy/d,R-d);
 }
 for(const p of jaw.points){
  const dx=x-p.x,dy=y-p.y,approach=dx*vx+dy*vy;
  if(approach>=0)continue;
  const cross=dx*vy-dy*vx,disc=R*R*speed2-cross*cross;
  if(disc<=0)continue;
  const t=(dx*dx+dy*dy-R*R)/(-approach+Math.sqrt(disc));
  consider(t,(dx+t*vx)/R,(dy+t*vy)/R);
 }
 return best;
}
// Intersect the centre trajectory with each inward-facing half-plane of the gate.
function gateTime(b,gate,remaining){
 let enter=0,leave=remaining;
 for(const [nx,ny,limit] of gate){
  const d=limit-nx*b.x-ny*b.y,v=nx*b.vx+ny*b.vy;
  if(!v){if(d<0)return Infinity;continue;}
  const t=d/v;
  if(v<0)enter=Math.max(enter,t);else leave=Math.min(leave,t);
  if(enter>leave)return Infinity;
 }
 return enter;
}
function prepare(G,paths,planes){
 const {L,W,R}=G;
 const jaws=paths.map(({points},id)=>{
  const edges=points.slice(1).map((b,i)=>{const a=points[i],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);return {a,ux:dx/len,uy:dy/len,len};});
  return {id,points,edges,x0:Math.min(...points.map(p=>p.x))-R,x1:Math.max(...points.map(p=>p.x))+R,
   y0:Math.min(...points.map(p=>p.y))-R,y1:Math.max(...points.map(p=>p.y))+R};
 });
 const half=G.sideThroat/2-R*.65,depth=G.sideJawOut*.73,diagonal=G.cornerThroatInset-G.cornerJawOut*.25;
 const width=Math.SQRT2*(G.cornerMouth/2-R*.66),gates=[];
 if(half>0)for(const [name,ny,limit] of [['TM',1,-depth],['BM',-1,-W-depth]]){
  gates.push({name,planes:[[1,0,L/2+half],[-1,0,-L/2+half],[0,ny,limit]]});
 }
 if(width>0)for(const [name,sx,sy,x0,y0] of [['TL',1,1,0,0],['TR',-1,1,L,0],['BL',1,-1,0,W],['BR',-1,-1,L,W]]){
  const local=[[1,1,diagonal],[1,-1,width],[-1,1,width],[-1,0,.10],[0,-1,.10]];
  gates.push({name,planes:local.map(([x,y,d])=>[sx*x,sy*y,d+sx*x*x0+sy*y*y0])});
 }
 function first(b,time,capture){
  let hit=null;
  for(const plane of planes){
   const dist=(b[plane.axis]-plane.bound)*plane.sign,v=b['v'+plane.axis]*plane.sign;
   if(v>=0)continue;
   const t=Math.max(0,-dist/v);
   if(t>time || (hit&&t>=hit.t))continue;
   const coordinate=b[plane.along]+b['v'+plane.along]*t;
   if(plane.spans.some(([a,c])=>coordinate>=a&&coordinate<=c))continue;
   hit={kind:'rail',t,plane,nx:plane.axis==='x'?plane.sign:0,ny:plane.axis==='y'?plane.sign:0};
  }
  for(const jaw of jaws){
   const j=jawContact(b,hit?hit.t:time,R,jaw);
   if(j && (!hit || j.t<hit.t-timeSlop))hit=j;
  }
  if(capture)for(const gate of gates){
   const t=gateTime(b,gate.planes,time);
   if(Number.isFinite(t)&&(!hit||t<hit.t-timeSlop))hit={kind:'pocket',t,name:gate.name};
  }
  return hit;
 }
 function advance(b,dt,capture,respond){
  const dx=b.vx*dt,dy=b.vy*dt,x=b.x-dx,y=b.y-dy;
  if(Math.min(x,b.x)>R && Math.max(x,b.x)<L-R && Math.min(y,b.y)>R && Math.max(y,b.y)<W-R)return;
  // Each rounded nose turns outwards from the rail line. Its ball-radius
  // offset stays outside the open playable centre rectangle.
  b.x=x;b.y=y;b.travel-=Math.hypot(dx,dy);
  let remaining=dt;
  for(let i=0;i<16&&b.active&&remaining>0;i++){
   const hit=first(b,remaining,capture),travel=hit?hit.t:remaining;
   b.x+=b.vx*travel;b.y+=b.vy*travel;b.travel+=Math.hypot(b.vx,b.vy)*travel;
   remaining-=travel;
   if(!hit)break;
   if(hit.kind==='rail')b[hit.plane.axis]=hit.plane.bound;
   if(hit.push){b.x+=hit.push*hit.nx;b.y+=hit.push*hit.ny;}
   b.freeDrift=false;
   respond(b,hit,dt-remaining);
  }
 }
 function pocketAt({x,y}){
  return gates.find(gate=>gate.planes.every(([nx,ny,d])=>nx*x+ny*y<=d))?.name || null;
 }
 return {first,advance,pocketAt};
}
const api={prepare};if(typeof module==='object'&&module.exports)module.exports=api;else root.BilliardsSnookerBoundary=api;
})(globalThis);
