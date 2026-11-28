/* Camera-only shot routes. Never change the simulator's paths or ball states. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.BilliardsShotFollow=api;
})(globalThis,function(){
 'use strict';
 const EPS=1e-7;
 const eventOrder=(a,b)=>a.t-b.t;
 // A receiving ball must be launched by the contact, not just touch the carrier.
 // Pre-impact approach distinguishes a pass from a ball coming the other way.
 function transfer(a,b,c,before){
  if(!before||c.normal<.008)return null;
  const along=ball=>ball.vx*c.nx+ball.vy*c.ny+ball.vz*c.nz;
  const after=[along(a),-along(b)];
  const motion=[Math.hypot(a.vx,a.vy),Math.hypot(b.vx,b.vy)];
  const canReceive=i=>after[i]<-.012&&before[i]-after[i]>.012&&motion[i]>.02;
  let from;
  if(canReceive(1)&&before[0]>Math.max(.009,before[1]+.004))from=0;
  else if(canReceive(0)&&before[1]>Math.max(.009,before[0]+.004))from=1;
  // Frozen neighbours can get a real impulse in the same contact group.
  else if(Math.max(Math.abs(before[0]),Math.abs(before[1]))<.012&&canReceive(0)!==canReceive(1))
   from=canReceive(1)?0:1;
  if(from===undefined)return null;
  return {from:from===0?a.id:b.id,to:from===0?b.id:a.id,takesOver:motion[1-from]>=Math.max(.04,motion[from]*1.15)};
 }
 function plan(sim){
  const start={id:0,t:0},first=sim?.firstBallContact;
  if(!first||!Number.isFinite(first.t))return {segments:[start],pocket:null};
  const firstIds=[...new Set([first.objId,...(first.objIds||[])])].filter(id=>Number.isInteger(id)&&id>0);
  if(!firstIds.length)return {segments:[start],pocket:null};
  const contacts=(sim.collisionEvents||[]).filter(e=>Number.isInteger(e.from)&&Number.isInteger(e.to)&&e.from>0&&e.to>0&&e.from!==e.to&&e.t>=first.t-EPS).sort(eventOrder);
  const pots=(sim.pocketEvents||[]).filter(e=>e.id>0&&Number.isFinite(e.t)&&e.t>=first.t-EPS).sort(eventOrder);
  function routeFor(id){
   const head={id,t:first.t},seen=new Map([[id,{steps:[head],takeover:false}]]);
   // First arrival to a ball is enough: later routes cannot make an earlier
   // subsequent impact reachable. Process simultaneous contacts as a group.
   for(let i=0;i<contacts.length;){
    let end=i+1;
    while(end<contacts.length&&contacts[end].t-contacts[i].t<=EPS)end++;
    let changed=true;
    for(let pass=0;changed&&pass<end-i;pass++){
     changed=false;
     for(let j=i;j<end;j++){
      const e=contacts[j],prior=seen.get(e.from);
      if(!prior||seen.has(e.to))continue;
      seen.set(e.to,{steps:[...prior.steps,{id:e.to,t:Math.max(prior.steps.at(-1).t,e.t)}],
       takeover:prior.steps.length===1?e.takesOver:prior.takeover});changed=true;
     }
    }
    i=end;
   }
   // Keep a caroming ball in frame if it still drops. But follow a real
   // combination pass when the receiver takes over and reaches a pocket first.
   const own=pots.find(p=>p.id===id);
   const pocket=pots.find(p=>{
    const route=seen.get(p.id);
    return route&&route.steps.at(-1).t<=p.t+EPS&&(!own||p.id===id||route.takeover);
   });
   if(pocket)return {segments:[start,...seen.get(pocket.id).steps],pocket};
   // On a miss or a pocketless table, hand off only if the shot transfers
   // motion to the next ball. Do not chase an unrelated cluster bump.
   const segments=[start,head],used=new Set([id]);let current=id;
   for(const e of contacts){
    if(e.from!==current||!e.takesOver||used.has(e.to))continue;
    segments.push({id:e.to,t:Math.max(segments.at(-1).t,e.t)});used.add(e.to);current=e.to;
   }
   return {segments,pocket:null};
  }
  const primary=routeFor(firstIds[0]);
  if(primary.pocket)return primary;
  for(const id of firstIds.slice(1)){
   const route=routeFor(id);if(route.pocket)return route;
  }
  return primary;
 }
 function at(route,t){
  if(!route?.segments.length)return {id:0,pocket:null};
  let id=route.segments[0].id;
  for(const step of route.segments){
   if(step.t>t+EPS)break;
   id=step.id;
  }
  return {id,pocket:route.pocket?.id===id&&t+EPS>=route.pocket.t?route.pocket:null};
 }
 return {transfer,plan,at};
});
