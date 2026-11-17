(function(root){
'use strict';
const reference=typeof module==='object'&&module.exports?require('./trainer-zen-shapes.js'):null;
const railWidth=.154;
function plan(f){
 const ref=reference||root.BilliardsZenShapes,A=ref.registration,G=f.G||{cornerMouth:.110,sideMouth:.120};
 const pixel=(p,h=0)=>[(p[0]-A.x0)/(A.x1-A.x0)*f.L-f.L/2,h,(p[1]-A.y0)/(A.y1-A.y0)*f.W-f.W/2];
 const capHeight=.044,noseHeight=f.R*2*.635;
 const rails=ref.rails.map(q=>{
  const [a,b]=q.fore.map(p=>pixel(p)),back=q.back.map(p=>pixel(p)),length=Math.hypot(b[0]-a[0],b[2]-a[2]),u=[(b[0]-a[0])/length,(b[2]-a[2])/length],n=[u[1],-u[0]],depth=Math.abs((back[0][0]-a[0])*n[0]+(back[0][2]-a[2])*n[1]);
  const at=(end,v,h)=>{const fore=end?b:a,t=v/depth;return [fore[0]+(back[end][0]-fore[0])*t,h,fore[2]+(back[end][2]-fore[2])*t];};
  return {a:[a[0],a[2]],b:[b[0],b[2]],back,n,u,length,depth,pocket:q.pocket,at};
 });
 const pockets=ref.pockets.map((q,i)=>{
  const [sx,sz]=[[-1,-1],[0,-1],[1,-1],[1,1],[0,1],[-1,1]][i],corner=sx!==0,n=[corner?sx*Math.SQRT1_2:0,corner?sz*Math.SQRT1_2:sz],t=[-n[1],n[0]],origin=[sx*f.L/2,sz*f.W/2],center=pixel(q.centre),contour=q.contour.map(p=>pixel(p));
  const at=(v,w,h=0)=>[origin[0]+n[0]*v+t[0]*w,h,origin[1]+n[1]*v+t[1]*w],local=p=>[(p[0]-origin[0])*n[0]+(p[2]-origin[1])*n[1],(p[0]-origin[0])*t[0]+(p[2]-origin[1])*t[1]],c=local(center);
  return {id:i+1,corner,n,t,origin,center,centerN:c[0],centerT:c[1],contour,source:q,at,local};
 });
 const inside=[];
 rails.forEach((r,i)=>{
  const a=r.at(0,r.depth,capHeight),b=r.at(1,r.depth,capHeight),next=rails[(i+1)%6].at(0,rails[(i+1)%6].depth,capHeight),p=pockets[r.pocket-1],q=p.source;
  const angle=v=>Math.atan2(v[2]-p.center[2],v[0]-p.center[0]),start=angle(b),finish=angle(next),tau=Math.PI*2;
  let sweep=(finish-start+tau)%tau;
  const polar=p.contour.map(v=>({v,theta:(angle(v)-start+tau)%tau})).sort((a,b)=>a.theta-b.theta);
  p.backPath=[b,...polar.filter(v=>v.theta>1e-5&&v.theta<sweep-1e-5).map(v=>[v.v[0],capHeight,v.v[2]]),next];
  p.frontPath=[[next[0],0,next[2]],...polar.filter(v=>v.theta>sweep+1e-5).map(v=>v.v),[b[0],0,b[2]]];
  p.dropPath=[...p.backPath,...p.frontPath.slice(1)];
  const nose=r.at(1,0,noseHeight),nose2=rails[(i+1)%6].at(0,0,noseHeight),foreN=(p.local(nose)[0]+p.local(nose2)[0])/2;
  p.front=Math.min(...p.frontPath.map(v=>p.local(v)[0]));p.rear=Math.max(...p.backPath.map(v=>p.local(v)[0]));p.shelf=p.front-foreN;p.visualMouth=Math.hypot(nose[0]-nose2[0],nose[2]-nose2[2]);
  inside.push(a,b,...p.backPath.slice(1));
 });
 const cushionWidth=rails.reduce((n,r)=>n+r.depth,0)/6;
 const profile=[[0,noseHeight],[.02,noseHeight+.0017],[.07,noseHeight+.0030],[.25,noseHeight+.0049],[1,capHeight],[1,.003],[.18,.008],[.05,noseHeight-.004],[.01,noseHeight-.0015]];
 const outer=ref.outer.map(p=>pixel(p)),margin=Math.max(...outer.map(v=>Math.max(Math.abs(v[0])-f.L/2,Math.abs(v[2])-f.W/2)));
 return {L:f.L,W:f.W,R:f.R,G,reference:ref,pixel,outer,railWidth:margin,cushionWidth,capHeight,noseHeight,rails,pockets,inside,profile,linerWidth:ref.rimWidth*f.L/(A.x1-A.x0),linerInset:.0003,edgeRadius:.0012,sights:ref.sights.map(p=>pixel(p,capHeight+.0003)),sightRadius:ref.sightRadius*f.L/(A.x1-A.x0)};
}
const api={plan,railWidth};if(typeof module==='object'&&module.exports)module.exports=api;else root.BilliardsTableConstruction=api;
})(typeof window==='object'?window:globalThis);
