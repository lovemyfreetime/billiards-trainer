/* Bounded ideal-rail alternatives. Full-physics verification stays with the existing Calculate tool. */
(function(root){
 'use strict';
 const chance=typeof module==='object'&&module.exports?require('./trainer-shot-chance.js'):root.BilliardsShotChance;
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),unit=(a,b)=>{const d=dist(a,b);return {x:(b.x-a.x)/d,y:(b.y-a.y)/d};};
 const dot=(a,b)=>a.x*b.x+a.y*b.y;
 function rails(s){return {top:{name:'top',axis:'y',at:s.ballR},bottom:{name:'bottom',axis:'y',at:s.tableW-s.ballR},left:{name:'left',axis:'x',at:s.ballR},right:{name:'right',axis:'x',at:s.tableL-s.ballR}};}
 function* orders(max=4,prefix=[]){for(const name of ['top','right','bottom','left']){if(prefix.at(-1)===name)continue;const next=[...prefix,name];yield next;if(next.length<max)yield* orders(max,next);}}
 function solid(s,name,p){const g=s.pocketGeometry||{},leg=(g.cornerMouth||.110)/Math.SQRT2+s.ballR*.25;
  return name==='top'||name==='bottom'?p.x>leg&&p.x<s.tableL-leg&&Math.abs(p.x-s.tableL/2)>(g.sideMouth||.120)/2+s.ballR*.25:p.y>leg&&p.y<s.tableW-leg;}
 function trace(s,source,target,order){
  const all=rails(s);let mirror={...target};for(const name of order.slice().reverse()){const r=all[name];mirror[r.axis]=2*r.at-mirror[r.axis];}
  let v=unit(source,mirror),p={...source};if(!Number.isFinite(v.x))return null;const points=[p],bounces=[];
  for(const name of order){
   const hits=Object.values(all).map(r=>({r,t:(r.at-p[r.axis])/v[r.axis]})).filter(h=>Number.isFinite(h.t)&&h.t>1e-6).sort((a,b)=>a.t-b.t);
   const hit=hits[0];if(!hit||hit.r.name!==name)return null;
   p={x:p.x+v.x*hit.t,y:p.y+v.y*hit.t};if(!solid(s,name,p))return null;
   points.push(p);bounces.push({...p,rail:{name}});v={...v,[hit.r.axis]:-v[hit.r.axis]};
  }
  const end={x:target.x-p.x,y:target.y-p.y},t=dot(end,v);if(t<=0||Math.abs(end.x*v.y-end.y*v.x)>1e-5)return null;
  for(const r of Object.values(all)){const d=(r.at-p[r.axis])/v[r.axis];if(d>1e-6&&d<t-1e-6&&solid(s,r.name,{x:p.x+v.x*d,y:p.y+v.y*d}))return null;}
  return {points:[...points,{...target}],bounces};
 }
 function segmentDistance(p,a,b){const x=b.x-a.x,y=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*x+(p.y-a.y)*y)/(x*x+y*y||1)));return Math.hypot(p.x-a.x-t*x,p.y-a.y-t*y);}
 function clear(s,points,id,carrier){return points.slice(1).every((p,i)=>s.balls.every(b=>b.active===false||b.marker||b.id===0||b.id===id&&(carrier==='object'||i===points.length-2)||segmentDistance(b,points[i],p)>=2*s.ballR+.0005));}
 function ghost(s,cue,ball,out){const g={x:ball.x-2*s.ballR*out.x,y:ball.y-2*s.ballR*out.y};return g.x>=s.ballR&&g.x<=s.tableL-s.ballR&&g.y>=s.ballR&&g.y<=s.tableW-s.ballR&&dot(unit(cue,g),out)>.01&&clear(s,[cue,g],ball.id,'object')?g:null;}
 function keep(list,value){if(!value||!Number.isFinite(value.probability))return;list.push(value);list.sort((a,b)=>b.probability-a.probability||a.rails.length-b.rails.length);if(list.length>3)list.pop();}
 function* compare(s,id,maxRails=4){
  const cue=s.balls.find(b=>b.id===0&&b.active!==false),ball=s.balls.find(b=>b.id===id&&b.active!==false&&!b.marker);
  const groups=chance.options(s,id).map(d=>({pocket:d.pocket,point:d.point,direct:d.probability===null?[]:[{...d,type:'Direct',verification:'geometry',rails:[]}],bank:[],kick:[]})),contact=[];
  if(!cue||!ball)return {groups,contact,tested:0,maxRails};let tested=0;
  const pockets=chance.pockets(s);
  for(const order of orders(Math.max(1,Math.min(4,maxRails)))){
   for(let i=0;i<pockets.length;i++){
    const p=pockets[i],group=groups[i],bank=trace(s,ball,p,order);
    if(bank&&clear(s,bank.points,id,'object')){
     const g=ghost(s,cue,ball,unit(ball,bank.points[1]));
     if(g){const sol={mode:'bank',ballId:id,target:p,points:bank.points,cuePath:[cue,g],bounces:bank.bounces,shotSide:0};const c=chance.estimateGeometryRoute(s,sol);if(c)keep(group.bank,{...c,type:'Bank',verification:'geometry',ballId:id,pocket:p.name,point:group.point,rails:order,aim:g,nominal:sol});}
    }
    const out=unit(ball,p),g={x:ball.x-2*s.ballR*out.x,y:ball.y-2*s.ballR*out.y},kick=g.x>=s.ballR&&g.x<=s.tableL-s.ballR&&g.y>=s.ballR&&g.y<=s.tableW-s.ballR?trace(s,cue,g,order):null;
    if(kick&&clear(s,kick.points,id,'cue')&&clear(s,[ball,p],id,'object')&&dot(unit(kick.points.at(-2),g),out)>.01){
     const sol={mode:'kick',ballId:id,target:p,points:kick.points,objectPath:[ball,p],bounces:kick.bounces,shotSide:0};const c=chance.estimateGeometryRoute(s,sol);if(c)keep(group.kick,{...c,type:'Kick',verification:'geometry',ballId:id,pocket:p.name,point:group.point,rails:order,nominal:sol});
    }
    tested+=2;
   }
   const path=trace(s,cue,ball,order);
   if(path&&clear(s,path.points,id,'cue')){const u=unit(path.points.at(-2),ball),end={x:ball.x-2*s.ballR*u.x,y:ball.y-2*s.ballR*u.y},points=[...path.points.slice(0,-1),end];const sol={mode:'kick',contactKick:true,ballId:id,target:ball,points,bounces:path.bounces,shotSide:0};const c=chance.estimateGeometryRoute(s,sol);if(c)keep(contact,{...c,type:'Kick contact',verification:'geometry',ballId:id,rails:order,nominal:sol});}
   yield {tested};
  }
  return {groups,contact,tested,maxRails};
 }
 const api={compare,trace,orders};if(typeof module==='object'&&module.exports)module.exports=api;else root.BilliardsRouteOptions=api;
})(typeof window==='object'?window:globalThis);
