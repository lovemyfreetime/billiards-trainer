/* Conditional success estimates, not population make rates. See docs/shot-chance-model.md. */
(function(root){
 'use strict';
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),length=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const unit=(a,b)=>{const d=length(a,b);return {x:(b.x-a.x)/d,y:(b.y-a.y)/d};};
 const cross=(a,b)=>a.x*b.y-a.y*b.x;
 const dot=(a,b)=>a.x*b.x+a.y*b.y;
 const valid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
 function erf(x){const sign=Math.sign(x),a=Math.abs(x),t=1/(1+.3275911*a);return sign*(1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-a*a));}
 const cdf=x=>(1+erf(x/Math.SQRT2))/2;
 const interval=(half,sigma,bias=0)=>half>0?clamp(cdf((half-bias)/Math.max(1e-9,sigma))-cdf((-half-bias)/Math.max(1e-9,sigma)),0,1):0;
 const spread=s=>clamp(Number(s.guidanceAimErrorDeg)||.15,.03,2)*Math.PI/180;
 const railSpread=s=>clamp(Number(s.guidanceRailErrorDeg)||.35,.05,3)*Math.PI/180;
 function pockets(s){
  const L=s.tableL,W=s.tableW,g=s.pocketGeometry||{},corner=g.cornerMouth||.110,side=g.sideMouth||.120,a=corner/Math.SQRT2/2;
  return [{name:'top left',x:a,y:a,nx:-Math.SQRT1_2,ny:-Math.SQRT1_2,mouth:corner},
   {name:'top middle',x:L/2,y:0,nx:0,ny:-1,mouth:side},
   {name:'top right',x:L-a,y:a,nx:Math.SQRT1_2,ny:-Math.SQRT1_2,mouth:corner},
   {name:'bottom left',x:a,y:W-a,nx:-Math.SQRT1_2,ny:Math.SQRT1_2,mouth:corner},
   {name:'bottom middle',x:L/2,y:W,nx:0,ny:1,mouth:side},
   {name:'bottom right',x:L-a,y:W-a,nx:Math.SQRT1_2,ny:Math.SQRT1_2,mouth:corner}];
 }
 function distanceToSegment(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
 function clear(s,a,b,exclude){return s.balls.every(p=>p.active===false||p.marker||exclude.includes(p.id)||distanceToSegment(p,a,b)>=2*s.ballR+.0005);}
 function exitDirection(cue,ball,heading,R){
  const v={x:Math.cos(heading),y:Math.sin(heading)},to={x:ball.x-cue.x,y:ball.y-cue.y},along=dot(to,v),disc=4*R*R-cross(to,v)**2;
  if(along<=0||disc<=0)return null;
  const t=along-Math.sqrt(disc);if(t<0)return null;
  return {x:(to.x-v.x*t)/(2*R),y:(to.y-v.y*t)/(2*R)};
 }
 function sensitivity(cue,ball,aim,R){
  const heading=Math.atan2(aim.y-cue.y,aim.x-cue.x),h=.000001,a=exitDirection(cue,ball,heading-h,R),b=exitDirection(cue,ball,heading+h,R);
  return a&&b?Math.abs(Math.atan2(cross(a,b),dot(a,b))/(2*h)):Infinity;
 }
 function aperture(s,p,u){return Math.max(0,(p.mouth*Math.abs(p.nx*u.x+p.ny*u.y)-2*s.ballR)/2);}
 // Bounded memoization: draws and camera changes reuse estimates; no simulation/search in the render loop.
 const cache=new Map();
 function options(s,ballId){
  const key=JSON.stringify([s.tableL,s.tableW,s.ballR,s.guidanceAimErrorDeg,s.pocketGeometry,ballId,s.balls.map(b=>[b.id,b.x,b.y,b.active,b.marker])]);
  if(cache.has(key))return cache.get(key);
  const cue=s.balls.find(b=>b.id===0&&b.active!==false),ball=s.balls.find(b=>b.id===ballId&&b.active!==false&&!b.marker);
  if(!cue||!ball||!valid(cue)||!valid(ball))return [];
  const result=pockets(s).map(p=>{
   const u=unit(ball,p),out=length(ball,p),aim={x:ball.x-2*s.ballR*u.x,y:ball.y-2*s.ballR*u.y},into=length(cue,aim),v=unit(cue,aim),cosine=dot(v,u),half=aperture(s,p,u);
   let reason='';
   if(!valid(aim)||into<.0001||cosine<=.01||aim.x<s.ballR||aim.y<s.ballR||aim.x>s.tableL-s.ballR||aim.y>s.tableW-s.ballR)reason='No direct cut';
   else if(!clear(s,cue,aim,[0,ballId])||!clear(s,ball,p,[0,ballId]))reason='Blocked';
   else if(!half)reason='Narrow entry';
   const amplification=sensitivity(cue,ball,aim,s.ballR),sigma=Math.hypot(out*amplification*spread(s),s.ballR*.04);
   return {kind:'pot',ballId,pocket:p.name,point:{x:p.x,y:p.y},aim,probability:reason?null:interval(half,sigma),cutAngle:Math.acos(clamp(cosine,-1,1))*180/Math.PI,cueDistance:into,objectDistance:out,margin:half,sigma,reason};
  });
  if(cache.size>=24)cache.clear();cache.set(key,result);return result;
 }
 function route(s,sol){
  if(!sol?.reached||!sol.fullShot||sol.scratch)return null;
  const ball=s.balls.find(b=>b.id===sol.ballId&&b.active!==false),cue=s.balls.find(b=>b.id===0&&b.active!==false);
  if(!cue||!ball||!sol.bounces?.length||!valid(sol.target))return null;
  const contact=sol.contactKick,location=sol.locationKick,bank=sol.mode==='bank',target=contact?ball:sol.target;
  const nodes=[bank?ball:cue,...sol.bounces,target];if(nodes.some(p=>!valid(p)))return null;
  const distances=nodes.slice(1).map((p,i)=>length(nodes[i],p)),travel=distances.reduce((a,b)=>a+b,0),last=nodes.at(-2),u=unit(last,target);
  let amplification=1;
  if(bank){const initial=unit(ball,nodes[1]),ghost={x:ball.x-2*s.ballR*initial.x,y:ball.y-2*s.ballR*initial.y};amplification=sensitivity(cue,ball,ghost,s.ballR);}
  // Independent angular cushion error, propagated over the distance remaining after each rebound.
  let variance=(travel*spread(s)*amplification)**2+(s.ballR*.04)**2;
  for(let i=0;i<sol.bounces.length;i++){const remaining=distances.slice(i+1).reduce((a,b)=>a+b,0),before=unit(nodes[i],nodes[i+1]),after=unit(nodes[i+1],nodes[i+2]);const turn=Math.acos(clamp(dot(before,after),-1,1));variance+=(remaining*railSpread(s)*(1+Math.abs(sol.shotSide||0))*Math.max(.5,Math.sin(turn/2)))**2;}
  let half,bias=0,outcome;
  if(contact){half=2*s.ballR;outcome='Contact';const path=sol.points||[],end=path.at(-1);if(valid(end)&&length(last,end)>1e-6)bias=cross({x:ball.x-last.x,y:ball.y-last.y},unit(last,end));}
  else if(location&&!sol.intentionalCuePocket){half=s.ballR*.35;outcome='Reach zone';}
  else{const p=pockets(s).reduce((a,b)=>length(a,target)<length(b,target)?a:b);if(length(p,target)>.15)return null;half=aperture(s,p,u);outcome=bank?'Bank pocket':'Kick pocket';
   if(!bank&&!location){const obj=s.balls.find(b=>b.id===sol.ballId),objectPath=sol.objectPath||[];if(!objectPath.length||!obj)return null;const first=objectPath[0],end=objectPath.at(-1),d=length(first,end);variance+=(d*travel/(2*s.ballR)*spread(s))**2;}
  }
  return {probability:interval(half,Math.sqrt(variance),bias),outcome,rails:sol.bounces.length,point:contact?{x:ball.x,y:ball.y}:sol.target,assumption:'reference-accuracy',model:'angular-tolerance-v1'};
 }
 function text(p){return p==null?'—':p>.975?'>95%':p<.025?'<5%':'~'+Math.round(p*20)*5+'%';}
 function color(p,best=false){return p==null?'#b6c2c9':best?'#79efa1':p<.35?'#ff9d8d':'#f2d77a';}
 const api={pockets,options,route,text,color,sensitivity,interval};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.BilliardsShotChance=api;
})(typeof window==='object'?window:globalThis);
