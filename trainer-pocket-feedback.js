/* Presentation from the actual preview; pocket glow is not a probability claim. */
(function(root){
 'use strict';
 const chance=typeof module==='object'&&module.exports?require('./trainer-shot-chance.js'):root.BilliardsShotChance;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function analyze(s,preview,id){
  const pockets=chance.pockets(s),event=preview?.pocketEvents?.find(e=>e.id===id),path=preview?.paths?.[id]||[],R=s.ballR;
  const selected=event?pockets.reduce((a,b)=>Math.hypot(a.x-event.x,a.y-event.y)<Math.hypot(b.x-event.x,b.y-event.y)?a:b):null;
  return pockets.map(p=>{
   const base={name:p.name,center:{x:p.x,y:p.y},strength:0,entry:null};
   if(p!==selected||path.length<2)return base;
   let end=path.findIndex(q=>Math.hypot(q.x-p.x,q.y-p.y)<R*3);if(end<1)end=path.length-1;
   let start=Math.max(0,end-1);while(start>0&&Math.hypot(path[end].x-path[start].x,path[end].y-path[start].y)<R*2)start--;
   const a=path[start],b=path[end],length=Math.hypot(b.x-a.x,b.y-a.y);if(length<1e-6)return base;
   const u={x:(b.x-a.x)/length,y:(b.y-a.y)/length},normal=u.x*p.nx+u.y*p.ny;
   if(normal<=.01)return base;
   const t=((p.x-a.x)*p.nx+(p.y-a.y)*p.ny)/normal;
   const entry={x:a.x+u.x*t,y:a.y+u.y*t};if(t<0||Math.hypot(entry.x-p.x,entry.y-p.y)>.14)return base;
   const miss=Math.abs((p.x-a.x)*u.y-(p.y-a.y)*u.x),half=Math.max(.002,(p.mouth*Math.abs(normal)-2*R)/2),f=clamp(1-miss/half,0,1),centered=f*f*(3-2*f);
   return {...base,strength:.18+.82*centered,entry};
  });
 }
 const api={analyze};if(typeof module==='object'&&module.exports)module.exports=api;else root.BilliardsPocketFeedback=api;
})(typeof window==='object'?window:globalThis);
