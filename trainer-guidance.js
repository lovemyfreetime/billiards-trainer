/* Event-driven, geometry-only next-shot suggestions. No physics or camera mutation. */
(function(root){
 'use strict';
 const preferenceKeys=['trainingBallStyle','showImpact','showFullGhostBall','showRestingCueBall','showTipBadge','showShotLine','showCueStick','showPaths','showGrid','showDiamonds','showTable','showAngleLockControl','shot2CueBallOnly','shotPlaybackSpeed','guidanceEnabled','guidanceOrder','aimZones'];
 const copy=value=>JSON.parse(JSON.stringify(value));
 function preferences(state){return Object.fromEntries(preferenceKeys.filter(k=>state[k]!==undefined).map(k=>[k,copy(state[k])]));}
 function restorePreferences(state,saved){for(const k of preferenceKeys)if(Object.hasOwn(saved||{},k)&&typeof saved[k]===typeof state[k])state[k]=copy(saved[k]);return state;}
 function distanceToSegment(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
 function suggest(s){
  const balls=s.balls.filter(b=>b.active!==false&&!b.marker&&Number.isInteger(b.id)&&b.id>=0),cue=balls.find(b=>b.id===0),objects=balls.filter(b=>b.id>0),R=s.ballR;
  if(!cue)return {kind:'placement'};
  if(!objects.length)return {kind:'complete'};
  let eligible=objects,group=s.guidanceGroups?.[s.activePlayer||1]||'open';
  const ordered=/^(3|6|7|9|10)ball$/.test(s.setupMode)||s.guidanceOrder==='order'&&s.setupMode!=='8ball';
  if(s.setupMode==='8ball'){
   if(group==='solids'||group==='stripes'){eligible=objects.filter(b=>group==='solids'?b.id<8:b.id>8);if(!eligible.length)eligible=objects.filter(b=>b.id===8);}
   else eligible=objects.filter(b=>b.id!==8);
  }else if(ordered){eligible=[objects.reduce((a,b)=>a.id<b.id?a:b)];}
  if(!eligible.length)return {kind:'complete'};
  const clear=(a,b,exclude)=>balls.every(p=>exclude.includes(p.id)||distanceToSegment(p,a,b)>=2*R+.001);
  if(s.guidanceBreak){const ball=eligible.reduce((a,b)=>a.x<b.x?a:b);return {kind:'break',ballId:ball.id,aim:{x:ball.x,y:ball.y}};}
  const pockets=[{name:'top left',x:0,y:0},{name:'top middle',x:s.tableL/2,y:0},{name:'top right',x:s.tableL,y:0},{name:'bottom left',x:0,y:s.tableW},{name:'bottom middle',x:s.tableL/2,y:s.tableW},{name:'bottom right',x:s.tableL,y:s.tableW}];
  const candidates=[];
  for(const ball of eligible)for(const pocket of pockets){
   const out=Math.hypot(pocket.x-ball.x,pocket.y-ball.y),ux=(pocket.x-ball.x)/out,uy=(pocket.y-ball.y)/out;
   if(!Number.isFinite(ux))continue;
   const aim={x:ball.x-2*R*ux,y:ball.y-2*R*uy},into=Math.hypot(aim.x-cue.x,aim.y-cue.y);
   if(into<R*.1||aim.x<R||aim.y<R||aim.x>s.tableL-R||aim.y>s.tableW-R)continue;
   const cosine=((aim.x-cue.x)*ux+(aim.y-cue.y)*uy)/into;
   if(cosine<.22||!clear(cue,aim,[0,ball.id])||!clear(ball,pocket,[0,ball.id]))continue;
   // Reject near-parallel entries along a cushion into a side pocket.
   if(pocket.x===s.tableL/2&&Math.abs(uy)<.45)continue;
   candidates.push({kind:'pot',ballId:ball.id,pocket:pocket.name,aim,score:3*(1-cosine)+into+out*.65});
  }
  candidates.sort((a,b)=>a.score-b.score||a.ballId-b.ballId||a.pocket.localeCompare(b.pocket));
  if(candidates.length)return candidates[0];
  // Offer a clear legal contact when there is no direct pot; never invent a kick.
  for(const ball of eligible){const d=Math.hypot(ball.x-cue.x,ball.y-cue.y),aim={x:ball.x-(ball.x-cue.x)/d*2*R,y:ball.y-(ball.y-cue.y)/d*2*R};if(d>2*R&&clear(cue,aim,[0,ball.id]))return {kind:'contact',ballId:ball.id,aim};}
  return {kind:'blocked',ballId:eligible.slice().sort((a,b)=>a.id-b.id)[0].id};
 }
 const api={preferences,restorePreferences,suggest};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.BilliardsGuidance=api;
})(typeof window==='object'?window:globalThis);
