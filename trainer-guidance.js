/* Geometry for immediate hints and candidate generation for simulated runouts. */
(function(root){
 'use strict';
 const preferenceKeys=['trainingBallStyle','showImpact','showFullGhostBall','showRestingCueBall','showTipBadge','showShotLine','showCueStick','showPaths','showGrid','showDiamonds','showTable','showAngleLockControl','shot2CueBallOnly','shotPlaybackSpeed','guidanceEnabled','guidanceOrder','showPocketChances','showPocketGhost','showPocketGlow','guidanceAimErrorDeg','guidanceRailErrorDeg','aimZones'];
 const copy=value=>JSON.parse(JSON.stringify(value));
 function preferences(state){return Object.fromEntries(preferenceKeys.filter(k=>state[k]!==undefined).map(k=>[k,copy(state[k])]));}
 function restorePreferences(state,saved){for(const k of preferenceKeys)if(Object.hasOwn(saved||{},k)&&typeof saved[k]===typeof state[k])state[k]=copy(saved[k]);return state;}
 function distanceToSegment(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
 const model=typeof module==='object'&&module.exports?require('./trainer-shot-chance.js'):root.BilliardsShotChance;
 const live=s=>s.balls.filter(b=>b.active!==false&&!b.marker&&Number.isInteger(b.id)&&b.id>=0);
 function order(s){
  if(s.setupMode==='8ball')return s.guidanceGroups?.[s.activePlayer||1]||'open';
  return /^(6|7|9|10)ball$/.test(s.setupMode)||s.guidanceOrder==='order'?'order':'any';
 }
 function eligibleBalls(s,objects=live(s).filter(b=>b.id>0)){
  const group=order(s);
  if(s.setupMode==='8ball'){
   if(group==='solids'||group==='stripes'){
    const own=objects.filter(b=>group==='solids'?b.id<8:b.id>8);
    return own.length?own:objects.filter(b=>b.id===8);
   }
   return objects.filter(b=>b.id!==8);
  }
  return group==='order'&&objects.length?[objects.reduce((a,b)=>a.id<b.id?a:b)]:objects;
 }
 function candidates(s){
  return eligibleBalls(s).flatMap(ball=>model.options(s,ball.id)).filter(c=>c.probability!==null)
   .sort((a,b)=>b.probability-a.probability||a.ballId-b.ballId||a.pocket.localeCompare(b.pocket));
 }
 function suggest(s){
  const balls=live(s),cue=balls.find(b=>b.id===0),R=s.ballR;
  if(!cue)return {kind:'placement'};
  const eligible=eligibleBalls(s);
  if(!eligible.length)return {kind:'complete'};
  const clear=(a,b,exclude)=>balls.every(p=>exclude.includes(p.id)||distanceToSegment(p,a,b)>=2*R+.001);
  if(s.guidanceBreak){const ball=eligible.reduce((a,b)=>a.x<b.x?a:b);return {kind:'break',ballId:ball.id,aim:{x:ball.x,y:ball.y}};}
  const [best]=candidates(s);
  if(best)return {...best,model:'angular-tolerance-v1'};
  // Offer a clear legal contact when there is no direct pot; never invent a kick.
  for(const ball of eligible){const d=Math.hypot(ball.x-cue.x,ball.y-cue.y),aim={x:ball.x-(ball.x-cue.x)/d*2*R,y:ball.y-(ball.y-cue.y)/d*2*R};if(d>2*R&&clear(cue,aim,[0,ball.id]))return {kind:'contact',ballId:ball.id,aim};}
  return {kind:'blocked',ballId:eligible.slice().sort((a,b)=>a.id-b.id)[0].id};
 }
 function afterShot(state,preview,target){
  if(!preview?.settled||preview.firstBallContact?.objId!==target||!eligibleBalls(state).some(b=>b.id===target))return null;
  if(preview.pocketEvents.length!==1||preview.pocketEvents[0].id!==target)return null;
  if(!preview.finalBalls.some(b=>b.id===0&&b.active))return null;
  let guidanceGroups=state.guidanceGroups;
  if(order(state)==='open')guidanceGroups={...guidanceGroups,[state.activePlayer||1]:target<8?'solids':'stripes'};
  const balls=preview.finalBalls.filter(b=>b.active).map(b=>({...state.balls.find(old=>old.id===b.id),...b}));
  return {...state,balls,guidanceGroups};
 }
 function leaveQuality(state){
  const [best]=candidates(state);
  if(!best)return eligibleBalls(state).length?-4:0;
  const cue=state.balls.find(b=>b.id===0),r=state.ballR;
  // Measure usable space near the leave, including either side of the shot line.
  const dx=best.aim.x-cue.x,dy=best.aim.y-cue.y,len=Math.hypot(dx,dy)||1;
  const scoreAt=(x,y)=>{
   if(x<r||x>state.tableL-r||y<r||y>state.tableW-r||state.balls.some(b=>b.id!==0&&Math.hypot(x-b.x,y-b.y)<2*r))return 0;
   const balls=state.balls.map(b=>b.id===0?{...b,x,y}:b);
   return model.options({...state,balls},best.ballId).find(c=>c.pocket===best.pocket)?.probability||0;
  };
  const spread=2*r,room=[[dx,dy],[-dx,-dy],[-dy,dx],[dy,-dx]].reduce((sum,[x,y])=>sum+scoreAt(cue.x+x/len*spread,cue.y+y/len*spread),0)/4;
  const railRoom=Math.min(cue.x,cue.y,state.tableL-cue.x,state.tableW-cue.y)/r;
  return .7*best.probability+.6*room-.24*Math.max(0,1-railRoom/4);
 }
 function* runout(state,simulate,depth=3){
  if(!live(state).some(b=>b.id===0))return [];
  let beam=[{state,shots:[],score:0,rank:0}],best=beam[0];
  const pitches=[[1,0],[1,.38],[1,-.35],[.8,.18],[1.25,0],[1.3,.58],[1.35,-.57]];
  const pocketCodes={'top left':'TL','top middle':'TM','top right':'TR','bottom left':'BL','bottom middle':'BM','bottom right':'BR'};
  for(let step=0;step<depth&&beam.length;step++){
   const next=[];
   for(const node of beam){
    const cue=node.state.balls.find(b=>b.id===0);
    for(const shot of candidates(node.state).slice(0,step?5:7)){
     const base=Math.max(.78,Math.min(2.7,Math.sqrt((shot.cueDistance+shot.objectDistance/(Math.cos(shot.cutAngle*Math.PI/180)**2+.05))*1.15)));
     const dx=shot.aim.x-cue.x,dy=shot.aim.y-cue.y;
     for(const [pace,follow] of pitches){
      const speed=base*pace,sideSpin=0,cueElevationDeg=0;
      // The simulator resolves cut-induced throw; probe either side of geometric aim when needed.
      for(const delta of [0,.004,-.004]){
       const freeAim={x:cue.x+dx*Math.cos(delta)-dy*Math.sin(delta),y:cue.y+dx*Math.sin(delta)+dy*Math.cos(delta)};
       const controls={freeAim,speed,follow,sideSpin,cueElevationDeg,angleLock:false};
       const preview=yield* simulate(node.state,controls);
       yield;
       const after=afterShot(node.state,preview,shot.ballId);
       if(!after||preview.pocketEvents[0].pocket!==pocketCodes[shot.pocket])continue;
       const path=preview.paths[0],rest=after.balls.find(b=>b.id===0);
       const travel=path.reduce((distance,p,i)=>i?distance+Math.hypot(p.x-path[i-1].x,p.y-path[i-1].y):0,0);
       const rails=preview.railEvents.filter(e=>e.id===0&&e.t>preview.firstBallContact.t).length;
       const score=node.score+Math.log(Math.max(.01,shot.probability))-.24*travel/state.tableL-.09*rails-.12*Math.abs(follow);
       const terminal=!eligibleBalls(after).length||after.setupMode==='8ball'&&shot.ballId===8;
       const rank=score+(terminal||step===depth-1?0:leaveQuality(after));
       const shots=[...node.shots,{...shot,controls,preview,start:{x:cue.x,y:cue.y},rest}];
       next.push({state:after,start:node.state,shots,score,rank,terminal});
       break;
      }
     }
    }
   }
   next.sort((a,b)=>b.rank-a.rank);
   beam=[];
   const distinct=new Set();
   for(const node of next){
    const {ballId,pocket,rest}=node.shots.at(-1),cell=state.ballR*4;
    const key=JSON.stringify([node.state.balls.map(b=>b.id),ballId,pocket,Math.floor(rest.x/cell),Math.floor(rest.y/cell)]);
    if(distinct.has(key))continue;
    distinct.add(key);beam.push(node);
    if(beam.length===7)break;
   }
   for(const node of beam){
    const shot=node.shots.at(-1);
    for(const factor of [.95,1.05]){
     const preview=yield* simulate(node.start,{...shot.controls,speed:shot.controls.speed*factor});
     const leave=afterShot(node.start,preview,shot.ballId);
     const samePocket=leave&&preview.pocketEvents[0].pocket===pocketCodes[shot.pocket];
     const penalty=!samePocket ? .46 : node.terminal ? 0 : Math.max(0,.85-leaveQuality(leave))*.23;
     node.rank-=penalty;node.score-=penalty;
     yield;
    }
   }
   beam.sort((a,b)=>b.rank-a.rank);
   if(beam.length)best=beam.find(node=>node.terminal)||beam[0];
   if(best.terminal)break;
   beam=beam.slice(0,5);
  }
  return best.shots.map((shot,i)=>{
   const upcoming=best.shots[i+1];
   if(!upcoming)return shot;
   const object=upcoming.preview.firstBallContact.objPos,dx=upcoming.point.x-object.x,dy=upcoming.point.y-object.y;
   const offset=(dx*(shot.rest.y-object.y)-dy*(shot.rest.x-object.x))/(Math.hypot(dx,dy)||1);
   return {...shot,leaveSide:Math.abs(offset)<state.ballR*.35?'on line':offset>0?'right':'left'};
  });
 }
 const api={preferences,restorePreferences,suggest,order,eligibleBalls,afterShot,runout};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.BilliardsGuidance=api;
})(typeof window==='object'?window:globalThis);
