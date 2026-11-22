(function(root){
'use strict';
const reference=typeof module==='object'&&module.exports?require('./trainer-zen-shapes.js'):null;
const equipment=reference?require('./trainer-international.js'):root.BilliardsInternational;
const railWidth=.154;
function roundedJaws(G){
 if(G.type!=='snooker')return [];
 const {L,W,sideMouth,sideThroat,sideJawOut:so}=G;
 const sm=sideMouth/2,st=sideThroat/2,paths=[];
 function add(a,b,tangent,outward){
  const reach=Math.hypot(b.x-a.x,b.y-a.y)*.55;
  const control={x:a.x+tangent.x*reach,y:a.y+tangent.y*reach};
  const points=Array.from({length:13},(_,i)=>{
   const t=i/12,u=1-t;
   return {x:u*u*a.x+2*u*t*control.x+t*t*b.x,y:u*u*a.y+2*u*t*control.y+t*t*b.y};
  });
  paths.push({points,outward});
 }
 for(const ySign of [1,-1]){
  const y=ySign===1?0:W;
  for(const xSign of [1,-1]){
   add({x:L/2-xSign*sm,y},{x:L/2-xSign*st,y:y-ySign*so},{x:xSign,y:0},{x:0,y:-ySign});
   const x=xSign===1?0:L;
   const nose=equipment.snookerCorner.nose;
   for(const horizontal of [true,false]){
    const points=nose.map(({depth,halfWidth})=>{
     const along=(halfWidth-depth)*Math.SQRT1_2,across=-(halfWidth+depth)*Math.SQRT1_2;
     return {x:x+xSign*(horizontal?along:across),y:y+ySign*(horizontal?across:along)};
    });
    paths.push({points,corner:true,outward:horizontal?{x:0,y:-ySign}:{x:-xSign,y:0}});
   }
  }
 }
 return paths;
}
// Sweep the straight cushion's section into the throat. The backing turns
// toward the rail as the nose turns outward, without changing normal sign.
function jawSections(jaw,plan){
 const {points,outward}=jaw,first=points[0],last=points.at(-1);
 const x=first.x-plan.L/2,z=first.y-plan.W/2;
 const rail=plan.rails.find(r=>[r.a,r.b].some(([a,b])=>Math.hypot(a-x,b-z)<1e-7));
 const end=Math.hypot(rail.b[0]-x,rail.b[1]-z)<1e-7?1:0;
 const start=rail.at(end,rail.depth,plan.capHeight);
 const alongX=outward.x===0?Math.sign(last.x-first.x):0;
 const alongY=outward.y===0?Math.sign(last.y-first.y):0;
 const along=(last.x-first.x)*alongX+(last.y-first.y)*alongY;
 const throatDepth=(last.x-first.x)*outward.x+(last.y-first.y)*outward.y;
 const tipDepth=Math.min(rail.depth*.28,along*.75);
 const rearDepth=Math.max(rail.depth,throatDepth)+.002;
 const rear=[x+alongX*(along-tipDepth)+outward.x*rearDepth,
  z+alongY*(along-tipDepth)+outward.y*rearDepth];
 return points.map((point,i)=>{
  const t=i/(points.length-1),nose=[point.x-plan.L/2,plan.noseHeight,point.y-plan.W/2];
  const back=[start[0]+t*(rear[0]-start[0]),plan.capHeight,start[2]+t*(rear[1]-start[2])];
  return {nose,back};
 });
}
function pocketlessPlan(f,ref,G){
 const halfL=f.L/2,halfW=f.W/2,depth=.04,margin=.125,capHeight=.044,noseHeight=G.nose||.037;
 const ring=(d,h)=>[[-halfL-d,h,-halfW-d],[halfL+d,h,-halfW-d],[halfL+d,h,halfW+d],[-halfL-d,h,halfW+d]];
 const noses=ring(0,0),backs=ring(depth,0);
 const rails=noses.map((a,i)=>{
  const j=(i+1)%4,b=noses[j],length=Math.hypot(b[0]-a[0],b[2]-a[2]),u=[(b[0]-a[0])/length,(b[2]-a[2])/length],n=[u[1],-u[0]];
  const at=(end,v,h)=>{const k=end?j:i,point=noses[k],back=backs[k];return [point[0]+(back[0]-point[0])*v/depth,h,point[2]+(back[2]-point[2])*v/depth];};
  return {a:[a[0],a[2]],b:[b[0],b[2]],length,depth,u,n,at};
 });
 const sights=[];
 for(let i=1;i<8;i++)for(const z of [-halfW-.065,halfW+.065])sights.push([(i/8-.5)*f.L,capHeight+.0003,z]);
 for(let i=1;i<4;i++)for(const x of [-halfL-.065,halfL+.065])sights.push([x,capHeight+.0003,(i/4-.5)*f.W]);
 const profile=[[0,noseHeight],[.15,noseHeight+.003],[1,capHeight],[1,.003],[.1,.008]];
 return {L:f.L,W:f.W,R:f.R,G,reference:ref,outer:ring(margin,0),inside:ring(depth,capHeight),railWidth:margin,
  cushionWidth:depth,capHeight,noseHeight,rails,pockets:[],profile,sights,sightRadius:.007};
}
function plan(f){
 const ref=reference||root.BilliardsZenShapes,A=ref.registration,G=f.G||{cornerMouth:.110,sideMouth:.120};
 if(G.pocketless)return pocketlessPlan(f,ref,G);
 function scale(value,knots){
  let i=1;
  while(i<knots.length-1&&value>knots[i][0])i++;
  const [a,x]=knots[i-1],[b,y]=knots[i];
  return x+(value-a)*(y-x)/(b-a);
 }
 const custom=G.type&&G.type!=='pool',sm=G.sideMouth/2;
 // Keep the traced woodwork and side pockets at their existing registration.
 // Move only the corner ends of the straight rubber to the fitted template.
 const cl=G.type==='snooker'?.086/Math.SQRT2:G.cornerLeg;
 const xKnots=[[A.x0,0],[337,cl],[806,f.L/2-sm],[873,f.L/2+sm],[1340,f.L-cl],[A.x1,f.L]];
 const yKnots=[[A.y0,0],[160,cl],[612,f.W-cl],[A.y1,f.W]];
 const pixel=(p,h=0)=>[custom?scale(p[0]===805&&p[1]===650?806:p[0],xKnots)-f.L/2:(p[0]-A.x0)/(A.x1-A.x0)*f.L-f.L/2,h,
  custom?scale(p[1],yKnots)-f.W/2:(p[1]-A.y0)/(A.y1-A.y0)*f.W-f.W/2];
 const capHeight=.044,noseHeight=G.nose||f.R*2*.635;
 const rails=ref.rails.map(q=>{
  const [a,b]=q.fore.map(p=>pixel(p)),back=q.back.map(p=>pixel(p)),length=Math.hypot(b[0]-a[0],b[2]-a[2]),u=[(b[0]-a[0])/length,(b[2]-a[2])/length],n=[u[1],-u[0]],depth=Math.abs((back[0][0]-a[0])*n[0]+(back[0][2]-a[2])*n[1]);
  if(G.type==='snooker')for(const [i,fore] of [a,b].entries()){
   const axis=Math.abs(u[0])>.5?0:2,half=(axis===0?f.L:f.W)/2;
   if(Math.abs(fore[axis])>half/2)fore[axis]=Math.sign(fore[axis])*(half-equipment.snookerCorner.leg);
   back[i]=[fore[0]+n[0]*depth,0,fore[2]+n[1]*depth];
  }
  const at=(end,v,h)=>{const fore=end?b:a,t=v/depth;return [fore[0]+(back[end][0]-fore[0])*t,h,fore[2]+(back[end][2]-fore[2])*t];};
  return {a:[a[0],a[2]],b:[b[0],b[2]],back,n,u,length:Math.hypot(b[0]-a[0],b[2]-a[2]),depth,pocket:q.pocket,at};
 });
 const pockets=ref.pockets.map((q,i)=>{
  const [sx,sz]=[[-1,-1],[0,-1],[1,-1],[1,1],[0,1],[-1,1]][i],corner=sx!==0,n=[corner?sx*Math.SQRT1_2:0,corner?sz*Math.SQRT1_2:sz],t=[-n[1],n[0]],origin=[sx*f.L/2,sz*f.W/2],center=pixel(q.centre),contour=q.contour.map(p=>pixel(p));
  const at=(v,w,h=0)=>[origin[0]+n[0]*v+t[0]*w,h,origin[1]+n[1]*v+t[1]*w],local=p=>[(p[0]-origin[0])*n[0]+(p[2]-origin[1])*n[1],(p[0]-origin[0])*t[0]+(p[2]-origin[1])*t[1]],c=local(center);
  return {id:i+1,corner,n,t,origin,center,centerN:c[0],centerT:c[1],contour,source:q,at,local};
 });
 const inside=[];
 const throats=new Map();
 const anchor=(x,z)=>x.toFixed(7)+','+z.toFixed(7);
 if(G.type==='snooker' && Number.isFinite(G.sideJawOut)){
  for(const jaw of roundedJaws({...G,L:f.L,W:f.W})){
   const rows=jawSections(jaw,{L:f.L,W:f.W,rails,noseHeight,capHeight});
   const first=rows[0].nose;
   throats.set(anchor(first[0],first[2]),rows.at(-1));
  }
 }
 rails.forEach((r,i)=>{
  const following=rails[(i+1)%6],p=pockets[r.pocket-1];
  const left=throats.get(anchor(...r.b)),right=throats.get(anchor(...following.a));
  const a=r.at(0,r.depth,capHeight),end=r.at(1,r.depth,capHeight);
  const b=left?.back||end,next=right?.back||following.at(0,following.depth,capHeight);
  const angle=v=>Math.atan2(v[2]-p.center[2],v[0]-p.center[0]),start=angle(left?.nose||b),finish=angle(right?.nose||next),tau=Math.PI*2;
  let sweep=(finish-start+tau)%tau;
  const polar=p.contour.map(v=>({v,theta:(angle(v)-start+tau)%tau})).sort((a,b)=>a.theta-b.theta);
  const onRay=theta=>{const dx=Math.cos(theta),dz=Math.sin(theta),cross=(x,z,u,v)=>x*v-z*u;let distance=Infinity;for(let j=0;j<p.contour.length;j++){const a=p.contour[j],b=p.contour[(j+1)%p.contour.length],x=a[0]-p.center[0],z=a[2]-p.center[2],sx=b[0]-a[0],sz=b[2]-a[2],den=cross(dx,dz,sx,sz);if(Math.abs(den)<1e-12)continue;const r=cross(x,z,sx,sz)/den,t=cross(x,z,dx,dz)/den;if(r>=0&&t>=-1e-8&&t<=1+1e-8)distance=Math.min(distance,r);}return [p.center[0]+dx*distance,capHeight,p.center[2]+dz*distance];};
  const lipEnd=row=>[row.nose[0],capHeight,row.nose[2]];
  const innerStart=left?lipEnd(left):onRay(start),innerEnd=right?lipEnd(right):onRay(finish);
  // Blend the traced liner into the physical throat at both ends. Keeping
  // the next stock tracing point unadjusted would leave a notch at the joint.
  const refStart=left?onRay(start):innerStart,refEnd=right?onRay(finish):innerEnd;
  function contourPoint(sample,t,h){
   const v=sample.v,a=(1-t)**3,b=t**3;
   return [v[0]+a*(innerStart[0]-refStart[0])+b*(innerEnd[0]-refEnd[0]),h,
    v[2]+a*(innerStart[2]-refStart[2])+b*(innerEnd[2]-refEnd[2])];
  }
  p.innerBackPath=[innerStart,...polar.filter(v=>v.theta>1e-5&&v.theta<sweep-1e-5).map(v=>contourPoint(v,v.theta/sweep,capHeight)),innerEnd];
  const firstWidth=(b[0]-innerStart[0])*Math.cos(start)+(b[2]-innerStart[2])*Math.sin(start),lastWidth=(next[0]-innerEnd[0])*Math.cos(finish)+(next[2]-innerEnd[2])*Math.sin(finish),middleWidth=ref.rimWidth*f.L/(A.x1-A.x0);
  p.backPath=p.innerBackPath.map((v,j)=>{if(j===0)return b;if(j===p.innerBackPath.length-1)return next;const t=j/(p.innerBackPath.length-1),width=(1-t)*firstWidth+t*lastWidth+Math.sin(Math.PI*t)*(middleWidth-(firstWidth+lastWidth)/2),dx=v[0]-p.center[0],dz=v[2]-p.center[2],length=Math.hypot(dx,dz);return [v[0]+dx/length*width,capHeight,v[2]+dz/length*width];});
  if(left && right){
   const residue=(back,inner,angle,width)=>[back[0]-inner[0]-Math.cos(angle)*width,back[2]-inner[2]-Math.sin(angle)*width];
   const first=residue(b,innerStart,start,firstWidth),last=residue(next,innerEnd,finish,lastWidth);
   for(let j=1;j<p.backPath.length-1;j++){
    const t=j/(p.backPath.length-1),v=p.backPath[j];
    v[0]+=first[0]*(1-t)**3+last[0]*t**3;
    v[2]+=first[1]*(1-t)**3+last[1]*t**3;
   }
  }
  p.frontPath=[[innerEnd[0],0,innerEnd[2]],...polar.filter(v=>v.theta>sweep+1e-5).map(v=>contourPoint(v,(tau-v.theta)/(tau-sweep),0)),[innerStart[0],0,innerStart[2]]];
  if(G.type==='snooker'&&p.corner){
   const {nose,fall}=equipment.snookerCorner,sign=Math.sign(p.local(innerEnd)[1]);
   const tail=nose.filter(row=>row.depth>fall.at(-1).depth);
   const half=[...fall,...tail];
   p.frontPath=[...half.slice(1).reverse().map(r=>p.at(r.depth,sign*r.halfWidth)),
    ...half.map(r=>p.at(r.depth,-sign*r.halfWidth))];
  }
  p.dropPath=[...p.backPath,...p.frontPath.slice(1)];p.innerRear=Math.max(...p.innerBackPath.map(v=>p.local(v)[0]));
  const nose=r.at(1,0,noseHeight),nose2=rails[(i+1)%6].at(0,0,noseHeight),foreN=(p.local(nose)[0]+p.local(nose2)[0])/2;
  p.front=Math.min(...p.frontPath.map(v=>p.local(v)[0]));p.rear=Math.max(...p.backPath.map(v=>p.local(v)[0]));p.shelf=p.front-foreN;p.visualMouth=G.type==='snooker'&&p.corner?equipment.snookerCorner.mouth:Math.hypot(nose[0]-nose2[0],nose[2]-nose2[2]);
  inside.push(a,end,...(left?[b]:[]),...p.backPath.slice(1));
 });
 const cushionWidth=rails.reduce((n,r)=>n+r.depth,0)/6;
 const profile=[[0,noseHeight],[.02,noseHeight+.0017],[.07,noseHeight+.0030],[.25,noseHeight+.0049],[1,capHeight],[1,.003],[.18,.008],[.05,noseHeight-.004],[.01,noseHeight-.0015]];
 const outer=ref.outer.map(p=>pixel(p)),margin=Math.max(...outer.map(v=>Math.max(Math.abs(v[0])-f.L/2,Math.abs(v[2])-f.W/2)));
 return {L:f.L,W:f.W,R:f.R,G,reference:ref,pixel,outer,railWidth:margin,cushionWidth,capHeight,noseHeight,rails,pockets,inside,profile,linerWidth:ref.rimWidth*f.L/(A.x1-A.x0),linerInset:.0003,edgeRadius:.0012,sights:ref.sights.map(p=>pixel(p,capHeight+.0003)),sightRadius:ref.sightRadius*f.L/(A.x1-A.x0)};
}
const api={plan,railWidth,roundedJaws,jawSections};if(typeof module==='object'&&module.exports)module.exports=api;else root.BilliardsTableConstruction=api;
})(typeof window==='object'?window:globalThis);
