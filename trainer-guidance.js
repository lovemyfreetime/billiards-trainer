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
 function legalIndirectPot(state,first,target){
  const group=order(state),balls=live(state).filter(b=>b.id>0);
  if(state.setupMode==='9ball'||state.setupMode==='10ball'){
   return first===Math.min(...balls.map(b=>b.id))&&(target!==10||balls.length===1);
  }
  if(state.setupMode==='8ball'||['solids','stripes','open'].includes(group)){
   const allowed=eligibleBalls(state.setupMode==='8ball'?safetyState(state):state,balls);
   return allowed.some(b=>b.id===first)&&allowed.some(b=>b.id===target);
  }
  return group==='any';
 }
 function afterShot(state,preview,target,first=target){
  if(!preview?.settled||preview.firstBallContact?.objId!==first||
     (first===target?!eligibleBalls(state).some(b=>b.id===target):!legalIndirectPot(state,first,target)))return null;
  if(preview.pocketEvents.length!==1||preview.pocketEvents[0].id!==target)return null;
  if(!preview.finalBalls.some(b=>b.id===0&&b.active))return null;
  const survivors=new Set(preview.finalBalls.filter(b=>b.active).map(b=>b.id));
  if(live(state).some(b=>b.id!==target&&!survivors.has(b.id)))return null;
  let guidanceGroups=state.guidanceGroups;
  if(order(state)==='open')guidanceGroups={...guidanceGroups,[state.activePlayer||1]:target<8?'solids':'stripes'};
  const wonRack=state.setupMode==='9ball'&&target===9&&first===Math.min(...live(state).filter(b=>b.id>0).map(b=>b.id));
  return {...settledLayout(state,preview),guidanceGroups,wonRack};
 }
 function afterScoringShot(state,preview){
  return afterShot(state,preview,preview?.pocketEvents?.[0]?.id,preview?.firstBallContact?.objId);
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
 function clusterPairs(state){
  const objects=live(state).filter(b=>b.id>0),group=order(state),limit=2.8*state.ballR;
  const relevant=b=>group==='solids'?b.id<=8:group==='stripes'?b.id>=8:true;
  return objects.flatMap((a,i)=>objects.slice(i+1).flatMap(b=>
   (relevant(a)||relevant(b))&&Math.hypot(a.x-b.x,a.y-b.y)<limit?[[a.id,b.id]]:[]));
 }
 function assessContact(state,after,preview,shot,pairs,leave){
  const other=new Set(),cueBumps=new Set(),paths=new Map([[0,[0]]]);
  for(const event of preview.collisionEvents||[]){
   if(event.t<preview.firstBallContact.t)continue;
   const [a,b]=event.ids;
   if(paths.has(a)&&!paths.has(b))paths.set(b,[...paths.get(a),b]);
   else if(paths.has(b)&&!paths.has(a))paths.set(a,[...paths.get(b),a]);
   const ids=event.ids.filter(id=>id!==0&&id!==shot.ballId&&id!==shot.firstId&&id!==shot.kissId);
   for(const id of ids){other.add(id);if(event.ids.includes(0))cueBumps.add(id);}
  }
  if(shot.kissId&&paths.has(shot.kissId))other.add(shot.kissId);
  if(!other.size)return {cost:0};
  const laid=new Map(live(after).map(b=>[b.id,b]));
  const newPairs=clusterPairs(after).filter(([a,b])=>!pairs.some(([x,y])=>a===x&&b===y||a===y&&b===x)).length;
  const opened=pairs.filter(([a,b])=>{
   const left=laid.get(a),right=laid.get(b);
   if(!left||!right||!other.has(a)&&!other.has(b))return false;
   if(Math.hypot(left.x-right.x,left.y-right.y)<3.5*state.ballR)return false;
   return [a,b].some(id=>model.options(after,id).some(shot=>shot.probability>=.25));
  });
  const available=candidates(after),insurance=new Set(available.filter(shot=>shot.probability>=.4).map(shot=>shot.ballId));
  const restored={...after,balls:after.balls.map(b=>other.has(b.id)?state.balls.find(old=>old.id===b.id)||b:b)};
  for(const target of eligibleBalls(after)){
   const access=s=>Math.max(0,...model.options(s,target.id).map(route=>route.probability||0));
   const sequence=paths.get(target.id);
   const openedAccess=sequence?.length>1&&leave>-.75?access(after):0;
   if(openedAccess>=.30&&openedAccess-access(restored)>=.15){
    return {kind:'Breakout',balls:[...new Set([...sequence.slice(1).filter(id=>id!==shot.ballId),...opened.flat()])],
     sequence,cost:-.29+.28*newPairs};
   }
  }
  if(opened.length&&leave>-.4)return {kind:'Breakout',balls:[...new Set(opened.flat())],cost:-.23-.08*Math.min(2,insurance.size)+.28*newPairs};
  if(shot.kissId)other.delete(shot.kissId);
  if(!other.size)return {cost:0};
  const [next]=available,cue=laid.get(0),ball=next&&laid.get(next.ballId);
  const distance=ball?Math.hypot(cue.x-ball.x,cue.y-ball.y)/(state.tableL/8):Infinity;
  const moved=b=>Math.hypot(b.x-laid.get(b.id).x,b.y-laid.get(b.id).y)>state.ballR*.3;
  if(live(state).some(b=>cueBumps.has(b.id)&&laid.has(b.id)&&moved(b))&&next?.probability>=.45&&next.cutAngle<=45&&distance>=.75&&distance<=2)
   return {kind:'Position nudge',balls:[...cueBumps],cost:.08+.28*newPairs};
  return {kind:'Extra contact',balls:[...other],cost:.31+.28*newPairs};
 }
 function safetyState(state,opponent=false){
  if(state.setupMode==='9ball')return {...state,guidanceMode:'order'};
  const player=state.activePlayer||1,group=state.guidanceGroups?.[player]||'open';
  const targetGroup=opponent?(group==='solids'?'stripes':group==='stripes'?'solids':'open'):group;
  return {...state,guidanceMode:'groups',guidanceGroups:{[player]:targetGroup}};
 }
 function preContactRails(preview){
  return preview.railEvents.filter(e=>e.id===0&&e.t<preview.firstBallContact.t).length;
 }
 function reflectedTargets(state,ball){
  const r=state.ballR;
  return [['x',r],['x',state.tableL-r],['y',r],['y',state.tableW-r]].map(([axis,rail])=>
   {return {axis,rail,point:{...ball,[axis]:2*rail-ball[axis]}};});
 }
 function openKickLanes(state,balls,cue,ball){
  return reflectedTargets(state,ball).filter(({axis,rail,point})=>{
   const fraction=(rail-cue[axis])/(point[axis]-cue[axis]);
   if(!(fraction>0&&fraction<1))return false;
   const bounce={x:cue.x+fraction*(point.x-cue.x),y:cue.y+fraction*(point.y-cue.y)};
   const span=axis==='x'?state.tableW:state.tableL,v=axis==='x'?bounce.y:bounce.x,r=state.ballR;
   if(v<2*r||v>span-2*r||axis==='y'&&Math.abs(v-span/2)<2*r)return false;
   return balls.every(b=>b.id===0||b.id===ball.id||
    Math.min(distanceToSegment(b,cue,bounce),distanceToSegment(b,bounce,ball))>=2*r);
  }).length;
 }
 function qualifyingRail(state,preview){
  const cushions={'left rail':b=>b.x,'right rail':b=>state.tableL-b.x,'top rail':b=>b.y,'bottom rail':b=>state.tableW-b.y};
  return preview.railEvents.some(e=>{
   const ball=state.balls.find(b=>b.id===e.id),distance=cushions[e.rail];
   return ball&&distance&&e.t>preview.firstBallContact.t&&distance(ball)>state.ballR+.0005;
  });
 }
 function safetyLeave(state,preview){
  if(!preview?.settled||preview.pocketEvents.length||
     !eligibleBalls(safetyState(state)).some(b=>b.id===preview.firstBallContact?.objId)||
     !qualifyingRail(state,preview))return null;
  const after=safetyState(settledLayout(state,preview),true),balls=live(after);
  if(balls.length!==live(state).length)return null;
  const cue=balls.find(b=>b.id===0),targets=eligibleBalls(after),radius=2*state.ballR;
  if(!cue||!targets.length)return null;
  let direct=0,distance=Infinity,exposure=0,kickLanes=0;
  for(const ball of targets){
   direct=Math.max(direct,...model.options(after,ball.id).map(shot=>shot.probability||0));
   const dx=ball.x-cue.x,dy=ball.y-cue.y,d=Math.hypot(dx,dy);
   distance=Math.min(distance,d/(state.tableL/8));
   if(d<=radius){exposure=3;continue;}
   const angle=Math.atan2(dy,dx),half=Math.asin(radius/d);
   let visible=0;
   for(const edge of [-.8,0,.8]){
    const delta=half*edge,dir=angle+delta;
    const length=d*Math.cos(delta)-Math.sqrt(radius*radius-(d*Math.sin(delta))**2);
    const hit={x:cue.x+Math.cos(dir)*length,y:cue.y+Math.sin(dir)*length};
    if(balls.every(b=>b.id===0||b.id===ball.id||distanceToSegment(b,cue,hit)>=radius))visible++;
   }
   exposure=Math.max(exposure,visible);
   if(!visible)kickLanes=Math.max(kickLanes,openKickLanes(state,balls,cue,ball));
  }
  if(direct>.15||exposure===3&&distance<4)return null;
  return {cue,targets:targets.map(b=>b.id),direct,exposure,distance,kickLanes,
   score:3-exposure+Math.min(distance,7)*.16-3*direct-kickLanes*.13};
 }
 function* safetyReplies(state,simulate,compensate){
  const balls=live(state),cue=balls.find(b=>b.id===0),radius=2*state.ballR;
  const targets=eligibleBalls(state).sort((a,b)=>distance(a,cue)-distance(b,cue));
  const targetIds=new Set(targets.map(ball=>ball.id));
  const indirect=indirectCandidates(state,true,true);
  const seeds=[...candidates(state).slice(0,3),...indirect.filter(shot=>targetIds.has(shot.ballId)).slice(0,2),
   ...indirect.filter(shot=>!targetIds.has(shot.ballId)).slice(0,2)].map(shot=>({
   aim:heading(cue,shot.aim),follow:shot.follow??0,speeds:[1,1.8,2.6]
  }));
  for(const ball of targets.slice(0,4)){
   const d=distance(cue,ball);
   if(d<=radius)continue;
   const angle=heading(cue,ball),half=Math.asin(radius/d);
   for(const cut of [-.85,-.45,0,.45,.85])seeds.push({aim:angle+cut*half,follow:0,speeds:[.85,1.55]});
   for(const {point} of reflectedTargets(state,ball)){
    const d=distance(cue,point);
    if(d>radius)seeds.push({aim:heading(cue,point),follow:0,speeds:[1.65]});
   }
  }
  const replies=[];
  for(const {aim,follow,speeds} of seeds)for(const speed of speeds){
   const controls={freeAim:along(cue,aim-compensate(state,0,follow),state.tableL),
    speed,follow,sideSpin:0,cueElevationDeg:0,angleLock:false};
   const preview=yield* simulate(state,controls);
   yield;
   const hit=preview?.firstBallContact;
   if(!preview?.settled||!targetIds.has(hit?.objId)||!preview.finalBalls.some(b=>b.id===0&&b.active)||
      preview.pocketEvents.some(e=>e.id===0)||(!preview.pocketEvents.length&&!qualifyingRail(state,preview)))continue;
   const pots=preview.pocketEvents.map(event=>event.id),after=settledLayout(state,preview);
   if(pots.includes(8)&&!targetIds.has(8))continue;
   replies.push({after,preview,continues:pots.some(id=>targetIds.has(id)),wins:pots.includes(8)});
  }
  return replies;
 }
 function defenseOutlook(state){
  const [shot]=candidates(state);
  const indirect=indirectCandidates(state,true)[0];
  return Math.max(shot?.probability||0,.65*(indirect?.probability||0));
 }
 function* safetyExchange(state,shot,simulate,compensate){
  const after=settledLayout(state,shot.preview),opponent=safetyState(after,true),own=safetyState(after);
  const replies=yield* safetyReplies(opponent,simulate,compensate);
  if(!replies.length)return {cost:0};
  let threat=0;
  const escapes=[];
  for(const reply of replies){
   if(reply.wins)return {cost:2.6};
   if(reply.continues){
    threat=Math.max(threat,1+.75*defenseOutlook({...opponent,balls:reply.after.balls}));
    continue;
   }
   const returned={...own,balls:reply.after.balls},attack=defenseOutlook(returned);
   const cue=live(returned).find(ball=>ball.id===0);
   const [target]=eligibleBalls(returned).sort((a,b)=>distance(cue,a)-distance(cue,b));
   if(target)escapes.push({returned,attack,clearance:distance(cue,target)});
  }
  escapes.sort((a,b)=>a.attack-b.attack||b.clearance-a.clearance);
  let recovery=0;
  const distinct=[];
  for(const escape of escapes){
   const balls=escape.returned.balls;
   if(distinct.some(other=>other.returned.balls.length===balls.length&&balls.every(ball=>
    other.returned.balls.some(previous=>previous.id===ball.id&&distance(previous,ball)<state.ballR))))continue;
   distinct.push(escape);
   if(distinct.length===2)break;
  }
  for(const {returned,attack} of distinct){
   let cost=.85*(1-attack);
   if(attack<.35){
    const counters=yield* safetyReplies(returned,simulate,compensate);
    const canReturn=counters.some(reply=>reply.continues||
     defenseOutlook({...opponent,balls:reply.after.balls})<.18);
    if(canReturn)cost*=.45;
    const pairs=clusterPairs(returned);
    if(pairs.length&&counters.some(reply=>reply.continues&&
     assessContact(returned,reply.after,reply.preview,{ballId:reply.preview.pocketEvents[0].id,
      firstId:reply.preview.firstBallContact.objId},pairs,leaveQuality(reply.after,false)).kind==='Breakout'))cost*=.65;
   }
   recovery=Math.max(recovery,cost);
  }
  return {cost:Math.max(threat,recovery)};
 }
 function* recommendSafety(state,shots,simulate,compensate=()=>0){
  if(!['8ball','9ball'].includes(state.setupMode)||state.guidanceBreak)return null;
  const own=safetyState(state),balls=live(own),cue=balls.find(b=>b.id===0);
  if(!cue)return null;
  const targets=eligibleBalls(own).sort((a,b)=>Math.hypot(a.x-cue.x,a.y-cue.y)-Math.hypot(b.x-cue.x,b.y-cue.y));
  if(!targets.length)return null;
  const group=order(own),potted=new Set(shots.map(shot=>shot.ballId));
  if(state.setupMode==='9ball'&&shots.some(shot=>shot.ballId===9&&shot.kind&&shot.kind!=='pot'))return null;
  const run=state.setupMode==='9ball'?balls.filter(b=>b.id>0):balls.filter(b=>{
   const first=shots[0]?.ballId;
   const chosen=group==='open'?(first<8?'solids':'stripes'):group;
   return b.id===8||b.id>0&&(chosen==='solids'?b.id<8:b.id>8);
  });
  // Keep a verified, reasonable full runout ahead of a defensive suggestion.
  if(run.length&&run.every(b=>potted.has(b.id))&&shots.every(shot=>shot.probability>=.28))return null;
  // Reaching the foreground search limit is expected on larger racks.
  const soundStart=shots.slice(0,3).every(shot=>shot.probability>=.38);
  if(run.length>6&&soundStart&&(shots.length>=6||shots.length>=3&&
     (!clusterPairs(own).length||shots.slice(0,3).some(shot=>shot.contact?.kind==='Breakout'))))return null;
  const finalists=[];
  for(const ball of targets.slice(0,4)){
   const dx=ball.x-cue.x,dy=ball.y-cue.y,d=Math.hypot(dx,dy);
   if(d<=2*state.ballR)continue;
   const angle=Math.atan2(dy,dx),half=Math.asin(2*state.ballR/d);
   const speeds=state.planSpeed===false?[state.speed]:[.6,.9,1.25,1.65,2.1];
   const spins=state.planSpin===false?[state.sideSpin]:[0];
   const follows=state.planFollow===false?[state.follow]:[0,-.32,.32];
   for(const speed of speeds)for(const sideSpin of spins)for(const follow of follows){
    for(const cut of [-.94,-.75,-.43,0,.43,.75,.94]){
     const aim=angle+half*cut-compensate(own,sideSpin,follow);
     const freeAim={x:cue.x+d*Math.cos(aim),y:cue.y+d*Math.sin(aim)};
     const controls={freeAim,speed,sideSpin,follow,cueElevationDeg:0,angleLock:false};
     const preview=yield* simulate(own,controls);
     const leave=safetyLeave(state,preview);
     if(leave&&preview.firstBallContact.objId===ball.id&&preContactRails(preview)===0)
      finalists.push({ballId:ball.id,controls,preview,leave,aim,d,score:leave.score-.16*Math.abs(follow)-.05*speed});
     yield;
    }
   }
  }
  function* verify(options){
   const exchange=state.setupMode==='8ball'&&['solids','stripes'].includes(group);
   const verified=[];
   options.sort((a,b)=>b.score-a.score);
   for(const shot of options.slice(0,8)){
    let passed=1;
    const error=(state.guidanceAimErrorDeg||.15)*Math.PI/180;
    for(const [speedOffset,aimOffset] of [[.95,error],[.95,-error],[1.05,error],[1.05,-error]]){
     const freeAim={x:cue.x+shot.d*Math.cos(shot.aim+aimOffset),y:cue.y+shot.d*Math.sin(shot.aim+aimOffset)};
     const tested=yield* simulate(own,{...shot.controls,freeAim,speed:shot.controls.speed*speedOffset});
     if(safetyLeave(state,tested)&&tested.firstBallContact.objId===shot.ballId&&preContactRails(tested)===Number(!!shot.kick))passed++;
     yield;
    }
    if(passed!==5)continue;
    const verifiedShot={...shot,passed,
     reason:shot.leave.exposure===0?(shot.leave.kickLanes?'Hides the legal targets':'Hides the legal targets and closes simple kick lanes'):
      shot.leave.exposure<3?'Limits the opponent to an edge':'Leaves a low-percentage shot at distance'};
    if(!exchange)return verifiedShot;
    if(verified.some(old=>old.ballId===shot.ballId&&distance(old.leave.cue,shot.leave.cue)<state.ballR))continue;
    verified.push(verifiedShot);
    if(verified.length===3)break;
   }
   for(const shot of verified){
    const {cost}=yield* safetyExchange(state,shot,simulate,compensate);
    shot.score-=cost;
   }
   return verified.sort((a,b)=>b.score-a.score)[0]||null;
  }
  const direct=yield* verify(finalists);
  if(direct)return direct;
  // If a direct safety doesn't hold, try a one-cushion kick at a legal ball.
  const kicks=[],r=state.ballR;
  for(const ball of targets.slice(0,3)){
   for(const {point} of reflectedTargets(state,ball)){
    const dx=point.x-cue.x,dy=point.y-cue.y,d=Math.hypot(dx,dy);
    if(d<=2*r)continue;
    const speeds=state.planSpeed===false?[state.speed]:[1.1,1.55,2.05,2.55];
    const sideSpin=state.planSpin===false?state.sideSpin:0,follow=state.planFollow===false?state.follow:0;
    for(const speed of speeds)for(const cut of [-.84,-.48,0,.48,.84]){
     const aim=Math.atan2(dy,dx)+Math.asin(2*r/d)*cut-compensate(own,sideSpin,follow);
     const freeAim={x:cue.x+d*Math.cos(aim),y:cue.y+d*Math.sin(aim)};
     const controls={freeAim,speed,sideSpin,follow,cueElevationDeg:0,angleLock:false};
     const preview=yield* simulate(own,controls);
     const leave=safetyLeave(state,preview),hit=preview.firstBallContact;
     if(leave&&hit.objId===ball.id&&preContactRails(preview)===1)
      kicks.push({ballId:ball.id,controls,preview,leave,aim,d,kick:true,score:leave.score-.05*speed});
     yield;
    }
   }
  }
  const kicked=yield* verify(kicks);
  if(kicked)return kicked;
  return yield* foulFallback(state,simulate,compensate,!shots.length);
 }
 function strokeClearanceCost(state,cue,aim){
  const r=state.ballR,dx=aim.x-cue.x,dy=aim.y-cue.y,length=Math.hypot(dx,dy)||1;
  const ux=dx/length,uy=dy/length;
  const edge=Math.min(cue.x,cue.y,state.tableL-cue.x,state.tableW-cue.y);
  const behindX=ux>0?cue.x/ux:ux<0?(state.tableL-cue.x)/-ux:Infinity;
  const behindY=uy>0?cue.y/uy:uy<0?(state.tableW-cue.y)/-uy:Infinity;
  const afterTip=Math.min(behindX,behindY)-r;
  const railPenalty=.48*Math.max(0,(3*r-edge)/(2*r))+.50*Math.max(0,(5*r-afterTip)/(5*r));
  let bridgePenalty=0;
  for(const nearby of state.balls){
   if(nearby.id===0||nearby.marker||nearby.active===false)continue;
   const x=nearby.x-cue.x,y=nearby.y-cue.y;
   const behind=-(x*ux+y*uy),lateral=Math.abs(x*uy-y*ux);
   if(behind<=0||behind>9*r||lateral>=1.35*r)continue;
   const elevation=Math.atan2(r+.006,Math.max(.001,behind-r));
   bridgePenalty=Math.max(bridgePenalty,1.5*elevation*(1-lateral/(1.35*r)));
  }
  return railPenalty+bridgePenalty;
 }
 function positionQuality(state,shot,following,wideSearch){
  const r=state.ballR,cue=state.balls.find(b=>b.id===0);
  const ball=state.balls.find(b=>b.id===shot.ballId);
  const distance=Math.hypot(cue.x-ball.x,cue.y-ball.y)/(state.tableL/8);
  const cut=shot.cutAngle;
  const crowding=3*Math.max(0,.75-distance);
  const distanceCost=.17*Math.abs(distance-1.15)+.70*Math.max(0,distance-2)+crowding;
  const steepCost=.054*Math.max(0,cut-40);
  const clearance=strokeClearanceCost(state,cue,shot.aim);
  const finish=following.length===0;
  // A finishing ball needs pocketing margin. A route ball needs an angle out.
  const angleCost=finish
   ? .018*Math.max(0,cut-7)+.027*Math.max(0,cut-24)
   : .024*Math.max(0,16-cut)+.017*Math.max(0,cut-30);
  if(wideSearch){
   const diameters=shot.cueDistance/(2*r);
   const travel=.068*Math.max(0,diameters-4)+.22*Math.max(0,2.5-diameters);
   const straight=finish?0:.075*Math.max(0,12-cut);
   return .55*shot.probability-travel-steepCost-straight-crowding-clearance-angleCost;
  }
  let shape=0;
  if(following.length){
   // The signed tangent determines which side a rolling cue ball can travel toward.
   const nx=(shot.point.x-ball.x)/shot.objectDistance,ny=(shot.point.y-ball.y)/shot.objectDistance;
   const tx=(shot.aim.x-cue.x)/shot.cueDistance,ty=(shot.aim.y-cue.y)/shot.cueDistance;
   const normal=tx*nx+ty*ny,rx=tx-.65*normal*nx,ry=ty-.65*normal*ny;
   const exit=Math.hypot(rx,ry);
   shape=.50*Math.max(...following.map(next=>{
    const open=(a,b)=>state.balls.every(obstacle=>obstacle.active===false||obstacle.marker||
     obstacle.id===0||obstacle.id===shot.ballId||obstacle.id===next.id||distanceToSegment(obstacle,a,b)>=2*r);
    const zones=model.pockets(state).flatMap(pocket=>{
     const a=heading(next,pocket),mouth=pocket.mouth*Math.abs(Math.cos(a)*pocket.nx+Math.sin(a)*pocket.ny);
     const d=state.tableL/8;
     return mouth>2*r&&open(next,pocket)?[along(next,a+Math.PI,d),along(next,a+Math.PI,1.6*d)]:[];
    }).filter(p=>p.x>=3*r&&p.x<=state.tableL-3*r&&p.y>=3*r&&p.y<=state.tableW-3*r&&open(p,next));
    return Math.max(-.4,...zones.map(zone=>{
     const x=zone.x-shot.aim.x,y=zone.y-shot.aim.y,travel=Math.hypot(x,y);
     return (rx*x+ry*y)/(exit*Math.max(travel,r))-.55*travel/state.tableL;
    }));
   }));
  }
  return .55*shot.probability-distanceCost-steepCost+shape-clearance-angleCost;
 }
 function rankPositions(state,shots,wideSearch){
  const objects=live(state).filter(b=>b.id>0), group=order(state);
  return shots.map(shot=>{
   const remaining=objects.filter(b=>b.id!==shot.ballId);
   const following=group==='open'?eligibleBalls({...state,guidanceMode:'groups',
    guidanceGroups:{[state.activePlayer||1]:shot.ballId<8?'solids':'stripes'}},remaining):eligibleBalls(state,remaining);
   return {shot,quality:positionQuality(state,shot,following,wideSearch)};
  }).sort((a,b)=>b.quality-a.quality);
 }
 function leaveQuality(state,wideSearch,path){
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
  const options=new Set(available.filter(s=>s.probability>=.4&&s.cutAngle<=50).map(s=>s.ballId)).size;
  const approach=path?.findLast(p=>Math.hypot(cue.x-p.x,cue.y-p.y)>=2*r);
  const approachLength=approach&&Math.hypot(cue.x-approach.x,cue.y-approach.y);
  // Favor a route that feeds into the long part of the position zone.
  const aligned=approachLength?Math.abs((dx*(cue.x-approach.x)+dy*(cue.y-approach.y))/(len*approachLength)):0;
  return quality+.55*room+.10*Math.min(2,Math.max(0,options-1))+.18*room*aligned;
 }
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const heading=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
 const along=(a,angle,d)=>({x:a.x+d*Math.cos(angle),y:a.y+d*Math.sin(angle)});
 const angleDiff=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
 function ballInHandReply(state){
  const after=safetyState(state,true),objects=live(after).filter(b=>b.id>0),r=state.ballR,diam=2*r;
  const targets=eligibleBalls(after,objects),ids=new Set(targets.map(b=>b.id));
  const clear=(a,b,...ignore)=>objects.every(p=>ignore.includes(p.id)||distanceToSegment(p,a,b)>=diam+.0005);
  function placements(aim,direction){
   return [.09,.18,.34].flatMap(d=>[-.85,-.50,-.25,0,.25,.50,.85].map(side=>along(aim,direction+Math.PI+side,d)))
    .filter(p=>p.x>=r&&p.x<=state.tableL-r&&p.y>=r&&p.y<=state.tableW-r&&objects.every(b=>distance(p,b)>=diam+.001));
  }
  let direct=0,earlyNine=false,tested=0;
  const pockets=model.pockets(state),nine=state.setupMode==='9ball'&&objects.find(b=>b.id===9);
  for(const ball of targets){
   for(const pocket of pockets){
    const direction=heading(ball,pocket),aim=along(ball,direction,-diam);
    if(!clear(ball,pocket,ball.id)||aim.x<r||aim.y<r||aim.x>state.tableL-r||aim.y>state.tableW-r)continue;
    for(const cue of placements(aim,direction)){
     const shot=model.options({...after,balls:[{id:0,...cue},...objects]},ball.id).find(c=>c.pocket===pocket.name);
     direct=Math.max(direct,shot?.probability||0);tested++;
     if(direct>=.32)return {direct,earlyNine,tested,ties:0};
    }
   }
   if(nine&&nine.id!==ball.id&&distance(nine,ball)<.45){
    for(const pocket of pockets){
     if(distance(nine,pocket)>.42||!clear(nine,pocket,ball.id,9))continue;
     const direction=heading(nine,pocket),aim=along(nine,direction,-diam),entry=heading(ball,aim);
     if(angleDiff(direction,entry)>.65||!clear(ball,aim,ball.id,9))continue;
     const relay=along(ball,entry,-diam);
     if(placements(relay,entry).some(cue=>clear(cue,relay,ball.id,9)))earlyNine=true;
    }
   }
  }
  const ties=clusterPairs(after).filter(([a,b])=>ids.has(a)||ids.has(b)).length;
  return {direct,earlyNine,tested,ties};
 }
 function* foulFallback(state,simulate,compensate,allowReview){
  if(state.setupMode==='9ball'&&state.guidanceConsecutiveFouls>=2)return null;
  const own=safetyState(state),balls=live(state),cue=balls.find(b=>b.id===0),r=state.ballR;
  const ownIds=new Set(eligibleBalls(own).map(b=>b.id)),opponent=eligibleBalls(safetyState(state,true));
  if(!cue||!opponent.length)return null;
  const before=ballInHandReply(state),options=[];
  function inspect(preview,first){
   if(!preview?.settled||preview.pocketEvents.length||preview.firstBallContact?.objId!==first||
      ownIds.has(first)&&qualifyingRail(state,preview))return null;
   const after=settledLayout(state,preview);
   if(live(after).length!==balls.length)return null;
   const reply=ballInHandReply(after);
   if(reply.earlyNine||reply.direct>=.24||!reply.ties||reply.ties<=before.ties&&reply.direct+.10>=before.direct)return null;
   return reply;
  }
  const moves=balls.filter(b=>b.id>0&&distance(cue,b)>2*r)
   .flatMap(ball=>{
    const target=opponent.some(b=>b.id===ball.id)?balls.filter(b=>b.id>0&&b.id!==ball.id):opponent;
    return target.filter(b=>distance(ball,b)>2.15*r).map(other=>({ball,other}));
   })
   .sort((a,b)=>Number(ownIds.has(b.ball.id))-Number(ownIds.has(a.ball.id))||
    distance(a.ball,a.other)+distance(cue,a.ball)*.4-distance(b.ball,b.other)-distance(cue,b.ball)*.4);
  for(const {ball,other} of moves.slice(0,12)){
   const direction=heading(ball,other),sideSpin=state.planSpin===false?state.sideSpin:0;
   const follow=state.planFollow===false?state.follow:0;
   for(const off of [-.065,-.05,-.035,0,.035,.05,.065]){
    const destination=along(other,direction+Math.PI/2,off),entry=heading(ball,destination);
    const aim=along(ball,entry,-2*r);
    if(angleDiff(heading(cue,aim),entry)>1.25)continue;
    const theta=heading(cue,aim)-compensate(own,sideSpin,follow),radius=distance(cue,aim);
    const base=Math.max(.48,Math.sqrt((distance(cue,ball)+distance(ball,other))*1.06));
    const speeds=state.planSpeed===false?[state.speed]:[.8,1,1.18,1.26,1.29,1.37,1.58].map(f=>base*f);
    let nearest;
    function* check(speed){
     const controls={freeAim:along(cue,theta,radius),speed,sideSpin,follow,cueElevationDeg:0,angleLock:false};
     const preview=yield* simulate(own,controls),reply=inspect(preview,ball.id);
     if(reply)options.push({ballId:ball.id,controls,preview,reply,theta,radius});
     const rest=preview.finalBalls?.find(b=>b.id===ball.id&&b.active);
     if(rest&&preview.firstBallContact?.objId===ball.id&&!preview.pocketEvents.length){
      const closeness=distance(rest,destination),travel=distance(rest,ball);
      if(travel>.1&&closeness<.40&&(!nearest||closeness<nearest.closeness))
       nearest={closeness,estimate:speed*Math.sqrt(Math.max(.05,distance(ball,destination)-2*r)/travel)};
     }
     yield;
    }
    for(const speed of speeds)yield* check(speed);
    if(nearest&&state.planSpeed!==false){
     const estimate=nearest.estimate;
     for(const ratio of [.96,1,1.04])yield* check(estimate*ratio);
    }
   }
  }
  options.sort((a,b)=>b.reply.ties-a.reply.ties||a.reply.direct-b.reply.direct||a.controls.speed-b.controls.speed);
  let review=null;
  const reason=state.setupMode==='9ball'?'Opponent gets ball in hand · Check your foul count':'Opponent gets ball in hand';
  for(const shot of options.slice(0,6)){
   const error=(state.guidanceAimErrorDeg||.15)*Math.PI/180;
   let passed=1;
   for(const [factor,offset] of [[.95,-error],[.95,error],[1.05,-error],[1.05,error]]){
    const controls={...shot.controls,speed:shot.controls.speed*factor,freeAim:along(cue,shot.theta+offset,shot.radius)};
    if(inspect(yield* simulate(own,controls),shot.ballId))passed++;
    yield;
   }
   const option={...shot,passed,intentionalFoul:true,reason};
   if(passed===5)return option;
   if(!review||passed>review.passed)review=option;
  }
  return allowReview&&review?{...review,reviewOnly:true,reason:'Tight control required · '+reason}:null;
 }
 function deflectionAims(start,block,target,diameter,allowFrozen=false){
  const separation=distance(start,block);
  if(!allowFrozen&&separation<=diameter+.0005)return [];
  const d=Math.max(diameter+.0001,separation);
  const angle=heading(start,block),half=Math.asin(diameter/d),seeds=[];
  for(const [retained,follow] of [[0,-.35],[.28,0],[.62,.42]]){
   let best;
   for(let sample=-24;sample<=24;sample++){
    const cut=half*sample/25,entry=angle+cut,alongLine=d*Math.sin(cut);
    const impact=along(start,entry,d*Math.cos(cut)-Math.sqrt(diameter**2-alongLine**2));
    const normal=heading(impact,block),transfer=(1-retained)*Math.cos(entry-normal);
    const rx=Math.cos(entry)-transfer*Math.cos(normal),ry=Math.sin(entry)-transfer*Math.sin(normal);
    if(Math.hypot(rx,ry)<.12)continue;
    const error=angleDiff(Math.atan2(ry,rx),heading(impact,target));
    if(!best||error<best.error)best={entry,impact,follow,error};
   }
   if(best?.error<.17)seeds.push(best);
  }
  return seeds;
 }
 function indirectCandidates(state,allowOrdinary,includeOffSuit=false){
  const balls=live(state),cue=balls.find(b=>b.id===0),objects=balls.filter(b=>b.id>0);
  if(objects.length<2||!cue)return [];
  if(!allowOrdinary&&order(state)!=='order')return [];
  const diam=2*state.ballR,pockets=model.pockets(state),choices=[];
  const next=objects.slice().sort((a,b)=>a.id-b.id)[1];
  const clear=(a,b,...ids)=>balls.every(p=>ids.includes(p.id)||distanceToSegment(p,a,b)>=diam-.0005);
  const isPocketLine=(ball,pocket)=>{
   const a=heading(ball,pocket),aperture=pocket.mouth*Math.abs(Math.cos(a)*pocket.nx+Math.sin(a)*pocket.ny)-diam;
   return aperture>.008&&distance(ball,pocket)<.72;
  };
  function add(kind,first,ball,pocket,aim,cost,follow,kissId){
   if(!clear(cue,aim,0,first.id)||aim.x<state.ballR||aim.x>state.tableL-state.ballR||aim.y<state.ballR||aim.y>state.tableW-state.ballR)return;
   const cueDistance=distance(cue,aim),objectDistance=distance(ball,pocket);
   if(cueDistance<.005)return;
   const probability=.82*Math.exp(-cost-1.25*objectDistance-.22*cueDistance);
   if(probability<.16)return;
   choices.push({kind,ballId:ball.id,firstId:first.id,kissId,pocket:pocket.name,point:pocket,aim,follow,
    probability,objectDistance,cueDistance,cutAngle:0});
  }
  for(const first of eligibleBalls(state)){
   for(const ball of objects){
    if(first.id===ball.id)continue;
    const gap=distance(first,ball)-diam;
    const breaksOutNext=order(state)==='order'&&ball.id===next?.id&&
     objects.some(other=>other.id!==first.id&&other.id!==ball.id&&distance(other,ball)<diam*1.8);
    if(gap>state.tableL*(breaksOutNext ? .50 : .28))continue;
    if(gap<=state.tableL*.28&&(legalIndirectPot(state,first.id,ball.id)||includeOffSuit&&ball.id!==8)){
     for(const pocket of pockets){
      if(!allowOrdinary&&(ball.id!==9||distance(ball,pocket)>.32))continue;
      if(!isPocketLine(ball,pocket)||!clear(ball,pocket,0,first.id,ball.id))continue;
      const departure=heading(ball,pocket),target=along(ball,departure,-diam);
      const entry=distance(first,target)<.004?departure:heading(first,target);
      const comboCut=angleDiff(entry,departure),aim=along(first,entry,-diam),cueCut=angleDiff(heading(cue,aim),entry);
      if(comboCut<.91&&cueCut<1.08&&clear(first,target,0,first.id,ball.id)){
       add('Combination',first,ball,pocket,aim,.24+gap*1.8+comboCut*.70+cueCut*.50,0);
      }
      for(const seed of deflectionAims(cue,first,target,diam)){
       if(clear(seed.impact,target,0,first.id,ball.id))
        add('Cue-ball carom',first,ball,pocket,seed.impact,.48+gap*1.4+seed.error*3,seed.follow);
      }
     }
    }
    for(const pocket of pockets){
     if(!allowOrdinary&&!breaksOutNext&&(first.id!==9||distance(first,pocket)>.32))continue;
     if(!isPocketLine(first,pocket)&&!(breaksOutNext&&distance(ball,pocket)<.55))continue;
     for(const seed of deflectionAims(first,ball,pocket,diam,true)){
      if(!clear(first,seed.impact,0,first.id,ball.id)||!clear(seed.impact,pocket,0,first.id,ball.id))continue;
      const aim=along(first,seed.entry,-diam);
      if(angleDiff(heading(cue,aim),seed.entry)<1.08)
       add('Object-ball kiss',first,first,pocket,aim,.56+gap*1.4+seed.error*3,seed.follow,ball.id);
     }
    }
   }
  }
  return choices.sort((a,b)=>b.probability-a.probability);
 }
 function verifiesIndirect(shot,preview){
  if(shot.kind==='pot')return true;
  if(shot.kind==='Bank')return preview.railEvents.some(e=>e.id===shot.ballId&&e.rail===shot.bankRail&&
   e.t>=preview.firstBallContact.t&&e.t<preview.pocketEvents[0].t);
  const first=shot.kind==='Cue-ball carom'?0:shot.firstId;
  const second=shot.kissId||shot.ballId,t=preview.firstBallContact.t;
  const delivery=preview.collisionEvents?.find(e=>e.t>=t&&e.ids.includes(second));
  return delivery?.ids.includes(first)&&(!shot.bankRail||preview.railEvents.some(e=>
   e.id===shot.firstId&&e.rail===shot.bankRail&&e.t>=t&&e.t<delivery.t));
 }
 function bankedContactCandidates(state,includeBreakoutBanks=false){
  const balls=live(state),cue=balls.find(b=>b.id===0);
  if(!cue)return [];
  const r=state.ballR,diam=2*r;
  const rails=[['x',r,'left rail'],['x',state.tableL-r,'right rail'],
   ['y',r,'top rail'],['y',state.tableW-r,'bottom rail']];
  const pockets=model.pockets(state),choices=[],rebound=(state.railTang||.9)/(state.railRest||.9);
  const nextId=balls.filter(b=>b.id>0).map(b=>b.id).sort((a,b)=>a-b)[1];
  for(const first of eligibleBalls(state)){
   if(includeBreakoutBanks&&breakoutContacts(state,first.id).length){
    const clear=(a,b)=>balls.every(p=>!p.id||p.id===first.id||distanceToSegment(p,a,b)>=diam-.001);
    for(const pocket of pockets)for(const [axis,rail,bankRail] of rails){
     const alongRail=axis==='x'?'y':'x',width=axis==='x'?state.tableW:state.tableL;
     const inbound=Math.abs(first[axis]-rail),outbound=Math.abs(pocket[axis]-rail);
     if(inbound<diam||outbound<diam)continue;
     const u=first[alongRail]+(pocket[alongRail]-first[alongRail])*inbound/(inbound+rebound*outbound);
     const bounce={[axis]:rail,[alongRail]:u};
     if(u<diam||u>width-diam||axis==='y'&&Math.abs(u-width/2)<diam)continue;
     const entry=heading(first,bounce),aim=along(first,entry,-diam),cut=angleDiff(heading(cue,aim),entry);
     if(cut>1.10||!clear(cue,aim)||!clear(first,bounce)||!clear(bounce,pocket))continue;
     const objectDistance=distance(first,bounce)+distance(bounce,pocket),cost=.55*cut+.09*objectDistance;
     choices.push({kind:'Bank',ballId:first.id,firstId:first.id,bankRail,pocket:pocket.name,point:pocket,
      aim,follow:0,cost,priority:cost,probability:.55*Math.exp(-cost),cueDistance:distance(cue,aim),
      objectDistance,cutAngle:cut*180/Math.PI});
    }
   }
   for(const second of balls){
    if(!second.id||second.id===first.id)continue;
    const clear=(a,b)=>balls.every(p=>!p.id||p.id===first.id||p.id===second.id||distanceToSegment(p,a,b)>=diam-.001);
    for(const pocket of pockets){
     if(distance(second,pocket)>.48)continue;
     const combo=legalIndirectPot(state,first.id,second.id);
     const pocketAngle=heading(second,pocket),target=along(second,pocketAngle,-diam);
     for(const [axis,rail,bankRail] of rails){
      const alongRail=axis==='x'?'y':'x',width=axis==='x'?state.tableW:state.tableL;
      const outbound=Math.abs(second[axis]-rail),inbound=Math.abs(first[axis]-rail);
      if(inbound<diam||outbound<diam)continue;
      const best={};
      for(const scale of [.78,1,1.24]){
       const tangent=rebound*scale;
       const center=first[alongRail]+(second[alongRail]-first[alongRail])*inbound/(inbound+tangent*outbound);
       for(let sample=-12;sample<=12;sample++){
        const u=center+sample*(diam/8),bounce={[axis]:rail,[alongRail]:u};
        if(u<diam||u>width-diam||axis==='y'&&Math.abs(u-width/2)<diam||!clear(first,bounce))continue;
        const entry=heading(first,bounce),aim=along(first,entry,-diam),cueCut=angleDiff(heading(cue,aim),entry);
        if(cueCut>1.22||!clear(cue,aim)||distance(cue,aim)<diam)continue;
        const dx=second.x-bounce.x,dy=second.y-bounce.y;
        const reflected={x:(bounce.x-first.x)*(axis==='x'?-1:tangent),y:(bounce.y-first.y)*(axis==='y'?-1:tangent)};
        const angle=Math.atan2(reflected.y,reflected.x),alongLine=dx*Math.cos(angle)+dy*Math.sin(angle);
        const offset=dx*Math.sin(angle)-dy*Math.cos(angle);
        if(alongLine<=0||Math.abs(offset)>=diam)continue;
        const impact=along(bounce,angle,alongLine-Math.sqrt(diam**2-offset**2));
        if(!clear(bounce,impact))continue;
        const normal=heading(impact,second),transfer=Math.cos(angle-normal);
        if(combo&&clear(second,pocket)&&distance(impact,target)<diam*.7)
         save('Bank combination',second,angleDiff(normal,pocketAngle));
        for(const retained of [0,.17,.36]){
         const out=Math.atan2(Math.sin(angle)-(1-retained)*transfer*Math.sin(normal),Math.cos(angle)-(1-retained)*transfer*Math.cos(normal));
         if(clear(impact,pocket))save('Bank kiss',first,angleDiff(out,heading(impact,pocket)));
        }
        function save(kind,ball,error){
         if(error>.23)return;
         const objectDistance=distance(first,bounce)+distance(bounce,impact)+distance(impact,pocket);
         const assistsNext=order(state)==='order'&&second.id===nextId;
         const cost=error*2+cueCut*.55+objectDistance*.09;
         if(best[kind]?.cost<=cost)return;
         best[kind]={kind,ballId:ball.id,firstId:first.id,kissId:kind==='Bank kiss'?second.id:undefined,
          bankRail,pocket:pocket.name,point:pocket,aim,follow:0,cost,priority:cost-(assistsNext ? .20 : 0),
          probability:.58*Math.exp(-cost),cueDistance:distance(cue,aim),objectDistance,cutAngle:cueCut*180/Math.PI};
        }
       }
      }
      choices.push(...Object.values(best));
     }
    }
   }
  }
  return choices.sort((a,b)=>a.priority-b.priority);
 }
 function repositionValue(before,after){
  let benefit=0;
  for(const ball of eligibleBalls(after)){
   const old=before.balls.find(b=>b.id===ball.id);
   if(!old||distance(old,ball)<before.ballR*1.5)continue;
   const fixed={...after,balls:after.balls.map(b=>b.id===ball.id?old:b)};
   const chance=s=>Math.max(0,...model.options(s,ball.id).map(p=>p.probability||0));
   benefit=Math.max(benefit,chance(after)-chance(fixed));
  }
  return .44*benefit;
 }
 function breakoutContacts(state,scoringBall){
  const balls=live(state).filter(b=>b.id>0&&b.id!==scoringBall),r=state.ballR;
  const next=eligibleBalls(state,balls);
  const targets=[];
  for(const ball of next){
   const nearby=balls.filter(b=>b.id!==ball.id&&distance(b,ball)<state.tableL/8);
   const edge=Math.min(ball.x,ball.y,state.tableL-ball.x,state.tableW-ball.y);
   if(edge>4*r&&!nearby.some(b=>distance(b,ball)<4*r))continue;
   targets.push(ball);
   for(const relay of nearby)targets.push(along(relay,heading(relay,ball),-2*r));
  }
  return targets;
 }
 function* searchRunout(state,simulate,depth,compensate,wideSearch,onProgress,onAlternative){
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
    const pairs=clusterPairs(node.state);
    const count=live(node.state).filter(b=>b.id>0).length;
    const needsPosition=count>1;
    const direct=candidates(node.state);
    const routes=rankPositions(node.state,direct,wideSearch).slice(0,step?4:7);
    const indirect=indirectCandidates(node.state,wideSearch||!direct.some(shot=>shot.probability>.35));
    const indirectKinds=new Set();
    for(const shot of indirect){
     const key=[shot.kind,shot.ballId,shot.firstId,shot.kissId,shot.pocket].join('/');
     if(indirectKinds.has(key))continue;
     indirectKinds.add(key);
     routes.push({shot,quality:-(shot.cueDistance/state.tableL)});
     if(indirectKinds.size>=(step?2:4))break;
    }
    if(!step||!direct.some(shot=>shot.probability>.4)){
     const banks=bankedContactCandidates(node.state,!step);
     const shortlisted=banks.filter(shot=>shot.kind!=='Bank').slice(0,step?1:3);
     if(!step)shortlisted.push(...banks.filter(shot=>shot.kind==='Bank').slice(0,2));
     for(const shot of shortlisted)
      routes.push({shot,quality:-shot.cost});
    }
    for(const {shot,quality} of routes){
     const indirect=shot.kind!=='pot';
     const base=Math.max(.78,Math.min(2.7,Math.sqrt((shot.cueDistance+shot.objectDistance/(Math.cos(shot.cutAngle*Math.PI/180)**2+.05))*1.15)));
     const dx=shot.aim.x-cue.x,dy=shot.aim.y-cue.y;
     const object=node.state.balls.find(b=>b.id===shot.ballId);
     const breakout=indirect&&shot.kind!=='Bank'?[]:breakoutContacts(node.state,shot.ballId);
     const breakoutSeeds=[];
     const farLeave=live(node.state).some(b=>b.id>0&&b.id!==shot.ballId&&Math.hypot(b.x-object.x,b.y-object.y)>state.tableL*.5);
     const strokes=needsPosition?(farLeave?[...pitches,...longTravel]:[...pitches]):pitches.slice(0,10);
     if(needsPosition&&!wideSearch)strokes.unshift(...positionTrials);
     if(count===2&&!indirect&&!wideSearch)strokes.push(
      [1.18,.24,0],[1.42,.28,0],[1.68,.30,0],[1.87,.38,0],[2.06,.42,0],
      [1.55,.22,-.15],[1.55,.22,.15],[1.82,.36,-.16],[1.82,.36,.16],
      [1.98,.31,-.12],[1.98,.31,.12]);
     if(pairs.length)strokes.push([1.48,.33,0],[1.8,.65,0],[2.16,.32,0],[1.65,-.52,0],[1.62,.25,-.42],[1.62,.25,.42]);
     if(needsPosition&&!wideSearch&&shot.cutAngle<24)
      strokes.push([.85,-.28,0],[1.18,-.35,0],[1.45,.65,0],[1.75,.65,0]);
     if(needsPosition&&shot.cutAngle<24)strokes.push([1.62,-.87,0],[1.95,-.87,0],[2.30,-.95,0]);
     if(!step&&hasManualStroke)strokes.unshift([manual.speed/base,manual.follow,manual.sideSpin]);
     if(breakout.length)strokes.push(
      [.9,-.34,0],[1.10,-.55,0],[1.27,-.7,0],[1.5,-.83,0],
      [1.34,-.47,-.19],[1.34,-.47,.19],[1.58,-.62,-.15],[1.58,-.62,.15]);
     if(indirect)strokes.splice(0,strokes.length,
      [.87,shot.follow,0],[1.12,shot.follow,0],[1.35,shot.follow,0],[1.66,shot.follow,0],
      [1.1,Math.max(-1,shot.follow-.15),0],[1.35,Math.min(1,shot.follow+.15),0],
      [1.05,0,0],[1.3,0,0],[1.12,.25,0],[1.35,-.60,0]);
     if(shot.kind==='Cue-ball carom')strokes.push(
      [1.65/base,shot.follow-.25,0],[1.65/base,shot.follow-.10,0],
      [1.9/base,shot.follow-.10,0],[1.65/base,shot.follow+.10,0]);
     if(shot.bankRail){
      const pace=Math.sqrt((.8*shot.objectDistance+.5*shot.cueDistance)/
       Math.max(.35,Math.cos(shot.cutAngle*Math.PI/180)**2))*1.67;
      strokes.splice(0,strokes.length,...[.78,.94,1.06,1.17,1.28,1.40,1.53].flatMap(factor=>{
       const power=pace*factor/base;
       return shot.kind==='Bank'?[[power,-.60,0],[power,-.72,0],[power,-.87,-.04],[power,-.87,.04]]:
        [[power,.08,.04],[power,0,0],[power,.25,.15]];
      }));
     }
     const tried=new Set();
     const current=step?node.shots.at(-1).controls:state;
     let strongest=null;
     function record(controls,preview){
      const after=afterShot(node.state,preview,shot.ballId,shot.firstId);
      if(!after||preview.pocketEvents[0].pocket!==pocketCodes[shot.pocket]||!verifiesIndirect(shot,preview))return false;
      const path=preview.paths[0],rest=after.balls.find(b=>b.id===0);
      if(breakout.length){
       const exit=path.filter(p=>p.t>=preview.firstBallContact.t);
       const miss=Math.min(...exit.map((p,i)=>Math.min(...breakout.map(target=>
        distanceToSegment(target,exit[Math.max(0,i-1)],p)))));
       if(miss<node.state.ballR*8)breakoutSeeds.push({controls,miss});
      }
      const travel=path.reduce((distance,p,i)=>i?distance+Math.hypot(p.x-path[i-1].x,p.y-path[i-1].y):0,0);
      const rails=preview.railEvents.filter(e=>e.id===0&&e.t>preview.firstBallContact.t).length;
      const position=step?quality:0;
      const spinCost=(wideSearch ? .075 : .20)*Math.abs(controls.follow)+(wideSearch ? .10 : .25)*Math.abs(controls.sideSpin);
      const terminal=after.wonRack||!eligibleBalls(after).length||!['order','any'].includes(order(after))&&shot.ballId===8;
      const leave=terminal?0:leaveQuality(after,wideSearch,path);
      const contact=assessContact(node.state,after,preview,shot,pairs,leave);
      const score=node.score+Math.log(Math.max(.01,shot.probability))+position+repositionValue(node.state,after)
       -.17*travel/state.tableL-.05*rails-spinCost-contact.cost-(indirect ? .16 : 0);
      const rank=score+leave;
      const shots=[...node.shots,{...shot,controls,preview,start:{x:cue.x,y:cue.y},rest,contact}];
      next.push({state:after,start:node.state,shots,score,rank,leave,terminal,speedMisses:node.speedMisses});
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
      let makes=0;
      const aimTrials=shot.bankRail?[0,.003,-.003,.006,-.006,.010,-.010,.015,-.015,.022,-.022,.031,-.031]:
       indirect?[0,.004,-.004,.01,-.01,.017,-.017,.025,-.025]:[0,.004,-.004];
      for(const adjustment of aimTrials){
       const delta=adjustment-squirt;
       const freeAim={x:cue.x+dx*Math.cos(delta)-dy*Math.sin(delta),y:cue.y+dx*Math.sin(delta)+dy*Math.cos(delta)};
       const controls={freeAim,speed,follow,sideSpin,cueElevationDeg,angleLock:false};
       const preview=yield* simulate(node.state,controls);
       yield;
       if(record(controls,preview)&&++makes>=(indirect?3:1))break;
      }
     }
     function* refine(seed,refinements){
      for(const [pace,draw,english] of refinements){
       if(pace&&state.planSpeed===false||draw&&state.planFollow===false||english&&state.planSpin===false)continue;
       const speed=seed.speed+pace;
       if(speed<=0||speed>7)continue;
       const follow=Math.max(-1,Math.min(1,seed.follow+draw)),sideSpin=Math.max(-1,Math.min(1,seed.sideSpin+english));
       const correction=compensate(node.state,seed.sideSpin,seed.follow)-compensate(node.state,sideSpin,follow);
       const aim=seed.freeAim,freeAim=along(cue,heading(cue,aim)+correction,distance(cue,aim));
       const controls={...seed,speed,follow,sideSpin,freeAim};
       record(controls,yield* simulate(node.state,controls));
       yield;
      }
     }
     if(strongest&&!indirect&&!wideSearch){
      yield* refine(strongest.controls,count===2
       ?[[-.14,0,0],[-.07,0,0],[.07,0,0],[.14,0,0],[0,-.10,0],[0,.10,0],[0,0,-.10],[0,0,.10]]
       :[[-.08,0,0],[.08,0,0]]);
     }
     if(breakoutSeeds.length&&!wideSearch){
      breakoutSeeds.sort((a,b)=>a.miss-b.miss);
      const seeds=new Map();
      for(const {controls} of breakoutSeeds){
       const key=Math.round(controls.follow*8);
       if(!seeds.has(key))seeds.set(key,controls);
       if(seeds.size===2)break;
      }
      for(const seed of seeds.values()){
       yield* refine(seed,[[-.13,0,0],[.13,0,0],[0,-.12,0],[0,.12,0],[0,0,-.12],[0,0,.12]]);
      }
     }
    }
   }
   const rank=(a,b)=>Number(b.terminal)-Number(a.terminal)||(wideSearch?0:a.speedMisses-b.speedMisses)||b.rank-a.rank;
   function* holds(node,countAll=false){
    const shot=node.shots.at(-1),{controls,start,ballId,pocket}=shot,theta=heading(start,controls.freeAim),d=distance(start,controls.freeAim);
    const aimError=(state.guidanceAimErrorDeg||.15)*Math.PI/180;
    let passed=1;
    for(const [factor,offset] of [[.95,-aimError],[.95,aimError],[1.05,-aimError],[1.05,aimError]]){
     const freeAim=along(start,theta+offset,d);
     const p=yield* simulate(node.start,{...controls,speed:controls.speed*factor,freeAim});
     const leave=afterShot(node.start,p,ballId,shot.firstId);
     const safe=leave&&p.pocketEvents[0].pocket===pocketCodes[pocket]&&verifiesIndirect(shot,p)&&
        (node.terminal||leaveQuality(leave,wideSearch)>=-.45);
     if(safe)passed++;
     yield;
     if(!safe&&!countAll)break;
    }
    return passed;
   }
   next.sort(rank);
   if(!step&&!wideSearch&&onAlternative){
    let alternative=null;
    for(const node of next.filter(n=>n.shots[0].bankRail&&
     (n.shots[0].kind!=='Bank'||n.shots[0].contact.kind==='Breakout')&&
     (n.terminal||candidates(n.state).length)).slice(0,5)){
     node.passed=yield* holds(node,true);
     if(!alternative||node.passed>alternative.passed)alternative={...node.shots[0],passed:node.passed};
    }
    if(alternative)onAlternative(alternative);
   }
   beam=[];
   const distinct=new Set();
   let indirectChecks=0;
   for(const node of next){
    const shot=node.shots.at(-1),{ballId,pocket,rest}=shot,cell=state.ballR*4;
    const {speed,follow,sideSpin}=shot.controls;
    const position=[node.state.balls.map(b=>[b.id,Math.floor(b.x/cell),Math.floor(b.y/cell)]),ballId,pocket,Math.floor(rest.x/cell),Math.floor(rest.y/cell)];
    if(!wideSearch)position.push(Math.round(speed*12),Math.round(follow*4),Math.round(sideSpin*4));
    if(shot.kind!=='pot')position.push(Math.round(heading(shot.start,shot.controls.freeAim)*2000));
    const key=JSON.stringify(position);
    if(distinct.has(key))continue;
    if(shot.kind!=='pot'){
     if(indirectChecks++>=9)continue;
     if((node.passed??(yield* holds(node)))!==5)continue;
    }
    distinct.add(key);beam.push(node);
    if(beam.length===(wideSearch?7:9))break;
   }
   for(const node of beam){
    const shot=node.shots.at(-1);
    for(const factor of [.95,1.05]){
     const preview=yield* simulate(node.start,{...shot.controls,speed:shot.controls.speed*factor});
     const leave=afterShot(node.start,preview,shot.ballId,shot.firstId);
     const samePocket=leave&&preview.pocketEvents[0].pocket===pocketCodes[shot.pocket];
     if(!samePocket)node.speedMisses++;
     let penalty=wideSearch&&!samePocket ? .46 : 0;
     if(samePocket&&!node.terminal){
      const varied=leaveQuality(leave,wideSearch);
      penalty=.23*Math.max(0,.85-varied)+.20*Math.max(0,node.leave-varied);
     }
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
 function* runout(state,simulate,depth=3,compensate=()=>0,onProgress,onAlternative){
  if(!live(state).some(b=>b.id===0))return [];
  let best=yield* searchRunout(state,simulate,depth,compensate,false,onProgress,onAlternative);
  // If the close-position search stalls, try more varied cue-ball leaves.
  if(!best.terminal&&best.shots.length<depth){
   const fallback=yield* searchRunout(state,simulate,depth,compensate,true);
   if(fallback.shots.length>best.shots.length||fallback.terminal&&!best.terminal)best=fallback;
  }
  return best.shots.map((shot,i)=>{
   const upcoming=best.shots[i+1];
   if(!upcoming||upcoming.kind!=='pot')return shot;
   const object=upcoming.preview.firstBallContact.objPos,dx=upcoming.point.x-object.x,dy=upcoming.point.y-object.y;
   const offset=(dx*(shot.rest.y-object.y)-dy*(shot.rest.x-object.x))/(Math.hypot(dx,dy)||1);
   return {...shot,leaveSide:Math.abs(offset)<state.ballR*.35?'on line':offset>0?'right':'left'};
  });
 }
 const api={preferences,restorePreferences,suggest,order,eligibleBalls,afterShot,afterScoringShot,afterBreak,afterUnpocketedShot,runout,recommendSafety};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.BilliardsGuidance=api;
})(typeof window==='object'?window:globalThis);
