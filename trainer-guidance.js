/* Geometry for immediate hints and candidate generation for simulated runouts. */
(function(root){
 'use strict';
 const preferenceKeys=['trainingBallStyle','showImpact','showFullGhostBall','showRestingCueBall','showTipBadge','showShotLine','showCueStick','showPaths','showGrid','showDiamonds','showTable','showAngleLockControl','shot2CueBallOnly','shotPlaybackSpeed','guidanceEnabled','planSpeed','planFollow','planSpin','guidanceOrder','showPocketChances','showPocketGhost','showPocketGlow','guidanceAimErrorDeg','guidanceRailErrorDeg','aimZones'];
 const copy=value=>JSON.parse(JSON.stringify(value));
 function preferences(state){return Object.fromEntries(preferenceKeys.filter(k=>state[k]!==undefined).map(k=>[k,copy(state[k])]));}
 function restorePreferences(state,saved){for(const k of preferenceKeys)if(Object.hasOwn(saved||{},k)&&typeof saved[k]===typeof state[k])state[k]=copy(saved[k]);return state;}
 function distanceToSegment(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
 const model=typeof module==='object'&&module.exports?require('./trainer-shot-chance.js'):root.BilliardsShotChance;
 const live=s=>s.balls.filter(b=>b.active!==false&&!b.marker&&Number.isInteger(b.id)&&b.id>=0);
 function order(s){
  if(s.guidanceMode==='order'||s.guidanceMode==='any')return s.guidanceMode;
  if(s.guidanceMode==='groups'||s.setupMode==='8ball')return s.guidanceGroups?.[s.activePlayer||1]||'open';
  return /^(6|7|9|10)ball$/.test(s.setupMode)||s.guidanceOrder==='order'?'order':'any';
 }
 function eligibleBalls(s,objects=live(s).filter(b=>b.id>0)){
  const group=order(s);
  if(group==='open'||group==='solids'||group==='stripes'){
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
  const survivors=new Set(preview.finalBalls.filter(b=>b.active).map(b=>b.id));
  if(live(state).some(b=>b.id!==target&&!survivors.has(b.id)))return null;
  let guidanceGroups=state.guidanceGroups;
  if(order(state)==='open')guidanceGroups={...guidanceGroups,[state.activePlayer||1]:target<8?'solids':'stripes'};
  return {...settledLayout(state,preview),guidanceGroups};
 }
 function settledLayout(state,preview){
  const balls=preview.finalBalls.filter(b=>b.active).map(b=>({...state.balls.find(old=>old.id===b.id),...b}));
  return {...state,balls};
 }
 function afterBreak(state,preview){
  const contact=preview?.firstBallContact?.objId;
  if(!preview?.settled||!contact||!preview.finalBalls.some(b=>b.id===0&&b.active))return null;
  if(order(state)==='order'&&!eligibleBalls(state).some(b=>b.id===contact))return null;
  const winningBall={'8ball':8,'9ball':9,'10ball':10}[state.setupMode];
  if(winningBall&&preview.pocketEvents.some(b=>b.id===winningBall))return null;
  return {...settledLayout(state,preview),guidanceBreak:false,guidanceScratch:false};
 }
 function afterUnpocketedShot(state,preview){
  if(!preview?.settled||preview.pocketEvents.length||!preview.finalBalls.some(b=>b.id===0&&b.active))return null;
  if(!eligibleBalls(state).some(b=>b.id===preview.firstBallContact?.objId))return null;
  return settledLayout(state,preview);
 }
 function positionQuality(state,shot,following,wideSearch){
  const r=state.ballR,cue=state.balls.find(b=>b.id===0);
  const ball=state.balls.find(b=>b.id===shot.ballId);
  const distance=Math.hypot(cue.x-ball.x,cue.y-ball.y)/(state.tableL/8);
  const cut=shot.cutAngle;
  const crowding=3*Math.max(0,.75-distance);
  const distanceCost=.15*distance+.65*Math.max(0,distance-2)+crowding;
  const steepCost=.036*Math.max(0,cut-45);
  const railRoom=Math.min(cue.x,cue.y,state.tableL-cue.x,state.tableW-cue.y)/r;
  if(wideSearch){
   const diameters=shot.cueDistance/(2*r);
   const travel=.068*Math.max(0,diameters-4)+.22*Math.max(0,2.5-diameters);
   const straight=live(state).filter(b=>b.id>0).length>1?.075*Math.max(0,12-cut):0;
   return .55*shot.probability-travel-steepCost-straight-crowding-.34*Math.max(0,1-railRoom/4);
  }
  let shape=0;
  if(following.length){
   // The signed tangent determines which side a rolling cue ball can travel toward.
   const nx=(shot.point.x-ball.x)/shot.objectDistance,ny=(shot.point.y-ball.y)/shot.objectDistance;
   const tx=(shot.aim.x-cue.x)/shot.cueDistance,ty=(shot.aim.y-cue.y)/shot.cueDistance;
   const normal=tx*nx+ty*ny,rx=tx-.65*normal*nx,ry=ty-.65*normal*ny;
   const exit=Math.hypot(rx,ry);
   shape=.30*Math.max(...following.map(next=>{
    const x=next.x-shot.aim.x,y=next.y-shot.aim.y;
    return (rx*x+ry*y)/(exit*Math.max(Math.hypot(x,y),r));
   }));
  }
  return .55*shot.probability-distanceCost-steepCost+shape-.34*Math.max(0,1-railRoom/4);
 }
 function rankPositions(state,shots,wideSearch){
  const objects=live(state).filter(b=>b.id>0), group=order(state);
  return shots.map(shot=>{
   const remaining=objects.filter(b=>b.id!==shot.ballId);
   const following=group==='open'
    ?remaining.filter(b=>shot.ballId<8?b.id<8:b.id>8)
    :eligibleBalls(state,remaining);
   return {shot,quality:positionQuality(state,shot,following,wideSearch)};
  }).sort((a,b)=>b.quality-a.quality);
 }
 function leaveQuality(state,wideSearch){
  const available=candidates(state);
  if(!available.length)return eligibleBalls(state).length?-5:0;
  const [{shot:best,quality}]=rankPositions(state,available,wideSearch);
  const cue=state.balls.find(b=>b.id===0),r=state.ballR;
  // Measure usable space near the leave, including either side of the shot line.
  const dx=best.aim.x-cue.x,dy=best.aim.y-cue.y,len=Math.hypot(dx,dy)||1;
  const scoreAt=(x,y)=>{
   if(x<r||x>state.tableL-r||y<r||y>state.tableW-r||state.balls.some(b=>b.id!==0&&Math.hypot(x-b.x,y-b.y)<2*r))return 0;
   const balls=state.balls.map(b=>b.id===0?{...b,x,y}:b);
   const alternate=model.options({...state,balls},best.ballId).find(c=>c.pocket===best.pocket);
   return alternate?.probability!=null&&alternate.cutAngle<50?alternate.probability:0;
  };
  const spread=2*r,room=[[dx,dy],[-dx,-dy],[-dy,dx],[dy,-dx]].reduce((sum,[x,y])=>sum+scoreAt(cue.x+x/len*spread,cue.y+y/len*spread),0)/4;
  return quality+.55*room;
 }
 function* searchRunout(state,simulate,depth,compensate,wideSearch,onProgress){
  let beam=[{state,shots:[],score:0,rank:0,speedMisses:0}],best=beam[0];
  const pitches=[[.74,.24,0],[.9,0,0],[1,0,0],[1,.5,0],[1,-.48,0],[1.15,.8,0],[1.22,-.75,0],
   [1.32,0,0],[1.52,.28,0],[1.7,-.15,0],[1.02,.2,-.34],[1.02,.2,.34],
   [1.34,-.15,-.42],[1.34,-.15,.42],[1.52,.48,-.3],[1.52,.48,.3]];
  const longTravel=[[1.75,-.10,0],[2.02,-.10,0],[2.28,-.10,0],[2.54,-.10,0],[2.8,-.10,0],[3.05,-.10,0],
   [2.24,.18,0],[2.7,.18,0],[2.5,-.15,-.23],[2.5,-.15,.23]];
  const positionTrials=[[.62,.15,0],[.82,0,0],[1.12,.15,0],[1.42,.15,0],[1.62,0,0],
   [.88,.15,-.18],[.88,.15,.18],[1.18,.15,-.18],[1.18,.15,.18],[1.53,.15,-.48],[1.53,.15,.48]];
  const pocketCodes={'top left':'TL','top middle':'TM','top right':'TR','bottom left':'BL','bottom middle':'BM','bottom right':'BR'};
  const manual={freeAim:state.freeAim,speed:state.speed,follow:state.follow,sideSpin:state.sideSpin,cueElevationDeg:state.cueElevationDeg||0,angleLock:false};
  const hasManualStroke=Number.isFinite(manual.freeAim?.x)&&Number.isFinite(manual.freeAim?.y)&&
   [manual.speed,manual.follow,manual.sideSpin].every(Number.isFinite);
  const manualPreview=hasManualStroke?yield* simulate(state,manual):null;
  for(let step=0;step<depth&&beam.length;step++){
   const next=[];
   for(const node of beam){
    const cue=node.state.balls.find(b=>b.id===0);
    const needsPosition=live(node.state).filter(b=>b.id>0).length>1;
    const routes=rankPositions(node.state,candidates(node.state),wideSearch);
    for(const {shot,quality} of routes.slice(0,step?4:7)){
     const base=Math.max(.78,Math.min(2.7,Math.sqrt((shot.cueDistance+shot.objectDistance/(Math.cos(shot.cutAngle*Math.PI/180)**2+.05))*1.15)));
     const dx=shot.aim.x-cue.x,dy=shot.aim.y-cue.y;
     const object=node.state.balls.find(b=>b.id===shot.ballId);
     const farLeave=live(node.state).some(b=>b.id>0&&b.id!==shot.ballId&&Math.hypot(b.x-object.x,b.y-object.y)>state.tableL*.5);
     const strokes=needsPosition?(farLeave?[...pitches,...longTravel]:[...pitches]):pitches.slice(0,10);
     if(needsPosition&&!wideSearch)strokes.unshift(...positionTrials);
     if(needsPosition&&!wideSearch&&shot.cutAngle<24)
      strokes.push([.85,-.28,0],[1.18,-.35,0],[1.45,.65,0],[1.75,.65,0]);
     if(needsPosition&&shot.cutAngle<24)strokes.push([1.62,-.87,0],[1.95,-.87,0],[2.30,-.95,0]);
     if(!step&&hasManualStroke)strokes.unshift([manual.speed/base,manual.follow,manual.sideSpin]);
     const tried=new Set();
     const current=step?node.shots.at(-1).controls:state;
     let strongest=null;
     function record(controls,preview){
      const after=afterShot(node.state,preview,shot.ballId);
      if(!after||preview.pocketEvents[0].pocket!==pocketCodes[shot.pocket])return false;
      const path=preview.paths[0],rest=after.balls.find(b=>b.id===0);
      const travel=path.reduce((distance,p,i)=>i?distance+Math.hypot(p.x-path[i-1].x,p.y-path[i-1].y):0,0);
      const rails=preview.railEvents.filter(e=>e.id===0&&e.t>preview.firstBallContact.t).length;
      const position=step?quality:0;
      const spinCost=(wideSearch ? .075 : .20)*Math.abs(controls.follow)+(wideSearch ? .10 : .25)*Math.abs(controls.sideSpin);
      const score=node.score+Math.log(Math.max(.01,shot.probability))+position-.17*travel/state.tableL-.05*rails-spinCost;
      const terminal=!eligibleBalls(after).length||!['order','any'].includes(order(after))&&shot.ballId===8;
      const rank=score+(terminal?0:leaveQuality(after,wideSearch));
      const shots=[...node.shots,{...shot,controls,preview,start:{x:cue.x,y:cue.y},rest}];
      next.push({state:after,start:node.state,shots,score,rank,terminal,speedMisses:node.speedMisses});
      if(!strongest||rank>strongest.rank)strongest={controls,rank};
      return true;
     }
     if(!step&&manualPreview)record(manual,manualPreview);
     for(const [pace,draw,english] of strokes){
      const speed=state.planSpeed===false?current.speed:Math.min(wideSearch?6:7,base*pace),cueElevationDeg=0;
      const follow=state.planFollow===false?current.follow:draw;
      const sideSpin=state.planSpin===false?current.sideSpin:english;
      const key=[speed,follow,sideSpin].join('/');
      if(tried.has(key))continue;
      tried.add(key);
      const squirt=compensate(node.state,sideSpin,follow);
      // The simulator resolves cut-induced throw; probe either side of geometric aim when needed.
      for(const adjustment of [0,.004,-.004]){
       const delta=adjustment-squirt;
       const freeAim={x:cue.x+dx*Math.cos(delta)-dy*Math.sin(delta),y:cue.y+dx*Math.sin(delta)+dy*Math.cos(delta)};
       const controls={freeAim,speed,follow,sideSpin,cueElevationDeg,angleLock:false};
       const preview=yield* simulate(node.state,controls);
       yield;
       if(record(controls,preview))break;
      }
     }
     if(strongest&&state.planSpeed!==false&&!wideSearch){
      const seed=strongest.controls;
      for(const offset of [-.08,.08]){
       const speed=seed.speed+offset;
       if(speed<=0||speed>7)continue;
       const controls={...seed,speed};
       record(controls,yield* simulate(node.state,controls));
       yield;
      }
     }
    }
   }
   const rank=(a,b)=>(wideSearch?0:a.speedMisses-b.speedMisses)||b.rank-a.rank;
   next.sort(rank);
   beam=[];
   const distinct=new Set();
   for(const node of next){
    const {ballId,pocket,rest}=node.shots.at(-1),cell=state.ballR*4;
    const {speed,follow,sideSpin}=node.shots.at(-1).controls;
    const position=[node.state.balls.map(b=>b.id),ballId,pocket,Math.floor(rest.x/cell),Math.floor(rest.y/cell)];
    if(!wideSearch)position.push(Math.round(speed*12),Math.round(follow*4),Math.round(sideSpin*4));
    const key=JSON.stringify(position);
    if(distinct.has(key))continue;
    distinct.add(key);beam.push(node);
    if(beam.length===(wideSearch?7:9))break;
   }
   for(const node of beam){
    const shot=node.shots.at(-1);
    for(const factor of [.95,1.05]){
     const preview=yield* simulate(node.start,{...shot.controls,speed:shot.controls.speed*factor});
     const leave=afterShot(node.start,preview,shot.ballId);
     const samePocket=leave&&preview.pocketEvents[0].pocket===pocketCodes[shot.pocket];
     if(!samePocket)node.speedMisses++;
     const penalty=samePocket?(node.terminal?0:Math.max(0,.85-leaveQuality(leave,wideSearch))*.23):(wideSearch ? .46 : 0);
     node.rank-=penalty;node.score-=penalty;
     yield;
    }
   }
   beam.sort(rank);
   if(beam.length){
    best=beam.find(node=>node.terminal)||beam[0];
    onProgress?.(best.shots);
   }
   if(best.terminal)break;
   beam=beam.slice(0,depth>3?4:5);
  }
  return best;
 }
 function* runout(state,simulate,depth=3,compensate=()=>0,onProgress){
  if(!live(state).some(b=>b.id===0))return [];
  let best=yield* searchRunout(state,simulate,depth,compensate,false,onProgress);
  // If the close-position search stalls, try more varied cue-ball leaves.
  if(!best.terminal&&best.shots.length<depth){
   const fallback=yield* searchRunout(state,simulate,depth,compensate,true);
   if(fallback.shots.length>best.shots.length||fallback.terminal&&!best.terminal)best=fallback;
  }
  return best.shots.map((shot,i)=>{
   const upcoming=best.shots[i+1];
   if(!upcoming)return shot;
   const object=upcoming.preview.firstBallContact.objPos,dx=upcoming.point.x-object.x,dy=upcoming.point.y-object.y;
   const offset=(dx*(shot.rest.y-object.y)-dy*(shot.rest.x-object.x))/(Math.hypot(dx,dy)||1);
   return {...shot,leaveSide:Math.abs(offset)<state.ballR*.35?'on line':offset>0?'right':'left'};
  });
 }
 const api={preferences,restorePreferences,suggest,order,eligibleBalls,afterShot,afterBreak,afterUnpocketedShot,runout};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.BilliardsGuidance=api;
})(typeof window==='object'?window:globalThis);
