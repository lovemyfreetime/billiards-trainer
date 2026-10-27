/* Ordered-cushion inverse search. Every candidate is evaluated by the Trainer's
   simulation, including cloth drag, cushion friction, spin and pocket openings. */
(function(root){
 'use strict';
 function seedAngle(source,target,rails){
  let p={...target};
  for(let i=rails.length-1;i>=0;i--){const r=rails[i];p=r.axis==='h'?{x:p.x,y:2*r.fixed-p.y}:{x:2*r.fixed-p.x,y:p.y};}
  return Math.atan2(p.y-source.y,p.x-source.x);
 }
 function solve({source,target,rails,evaluate,tolerance=.004}){
  if(!rails.length||rails.length>4||rails.some((r,i)=>!r||i&&r.name===rails[i-1].name))return null;
  const seed=seedAngle(source,target,rails),samples=[];
  function test(angle){const value=evaluate(angle);if(value&&Number.isFinite(value.distance))samples.push({...value,angle});return value;}
  // Cover all headings, with extra samples around the unfolded geometric seed.
  for(let i=0;i<240;i++)test(seed-Math.PI+2*Math.PI*i/240);
  for(let i=-12;i<=12;i++)test(seed+i*.0025);
  if(!samples.length)return null;
  samples.sort((a,b)=>a.distance-b.distance);
  const starts=samples.slice(0,4);
  for(const start of starts){
   let center=start.angle,step=Math.PI/120;
   for(let i=0;i<17;i++){
    let best={distance:Infinity,angle:center};
    for(const angle of [center-step,center,center+step]){const v=test(angle);if(v&&v.distance<best.distance)best={...v,angle};}
    center=best.angle;step*=.5;
   }
  }
  samples.sort((a,b)=>a.distance-b.distance);
  return samples[0].distance<=tolerance?samples[0]:null;
 }
 const api={seedAngle,solve};if(typeof module==='object'&&module.exports)module.exports=api;else root.BilliardsBankKickRouting=api;
})(typeof window==='object'?window:globalThis);
