'use strict';
// A single speaking lease for the whole table. Actual speech completion releases
// it; a bounded lease also recovers if a phone disconnects without an acknowledgement.
function createAudioQueue(now=Date.now){
 let active=null,waiting=[],quietUntil=0;
 function expire(){const t=now();if(active&&t>=active.until){active=null;quietUntil=t+800;}waiting=waiting.filter(a=>t-a.seen<3000);}
 return {
  request(owner,id,revision){
   expire();const t=now();let item=waiting.find(a=>a.owner===owner&&a.id===id);
   if(active?.owner===owner&&active.id===id)return {granted:true,remaining:Math.max(0,active.until-t-2000)};
   waiting=waiting.filter(a=>a.owner!==owner||a.id===id);
   if(!item){item={owner,id,revision,seen:t};waiting.push(item);}else item.seen=t;
   if(!active&&t>=quietUntil&&waiting[0]===item){waiting.shift();active={...item,until:t+14000};return {granted:true,remaining:12000};}
   return {granted:false};
  },
  finish(owner,id){waiting=waiting.filter(a=>a.owner!==owner||a.id!==id);if(active?.owner===owner&&active.id===id){active=null;quietUntil=now()+800;}},
  // Do not release an active lease on a game update or removal: the phone may
  // still be speaking. It stops and acknowledges, or its lease safely expires.
  invalidate(){waiting=[];},
  remove(owner){waiting=waiting.filter(a=>a.owner!==owner);}
 };
}
module.exports={createAudioQueue};
