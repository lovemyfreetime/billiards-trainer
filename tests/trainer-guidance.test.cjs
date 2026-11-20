const assert=require('node:assert/strict'),g=require('../trainer-guidance.js');
const state={tableL:2.54,tableW:1.27,ballR:.028575,setupMode:'9ball',activePlayer:1,balls:[{id:0,x:.45,y:.65},{id:1,x:1.1,y:.65},{id:2,x:1.7,y:.35},{id:3,x:2,y:.9}]};
const before=structuredClone(state),one=g.suggest(state);
assert.equal(one.ballId,1);assert(one.aim);assert.deepEqual(state,before,'suggestion must not mutate table');
assert.equal(g.suggest({...state,balls:state.balls.filter(b=>b.id!==1)}).ballId,2);
assert.equal(g.suggest({...state,balls:[state.balls[0]]}).kind,'complete');
assert.equal(g.suggest({...state,balls:state.balls.slice(1)}).kind,'placement');
assert.equal(g.suggest({...state,guidanceBreak:true}).kind,'break');
const eight={...state,setupMode:'8ball',guidanceGroups:{1:'stripes'},balls:[state.balls[0],{id:1,x:1.1,y:.65},{id:8,x:1.7,y:.35},{id:9,x:2,y:.9}]};
assert.equal(g.suggest(eight).ballId,9);
assert.equal(g.suggest({...eight,balls:eight.balls.filter(b=>b.id!==9)}).ballId,8);
assert.notEqual(g.suggest({...eight,guidanceGroups:{}}).ballId,8);
const crowded={...state,balls:[state.balls[0],{id:1,x:1.4,y:.65},...Array.from({length:12},(_,i)=>({id:i+2,x:1.4+Math.cos(i*Math.PI/6)*.06,y:.65+Math.sin(i*Math.PI/6)*.06}))]};
const blocked=g.suggest(crowded);assert.equal(blocked.kind,'blocked');assert.equal(blocked.ballId,1,'never choose an easier illegal target');
const settings={showImpact:false,showRestingCueBall:true,trainingBallStyle:'spots',shotPlaybackSpeed:0,balls:[{id:0}],speed:5};
const saved=g.preferences(settings),fresh={showImpact:true,showRestingCueBall:false,trainingBallStyle:'current',shotPlaybackSpeed:1};
g.restorePreferences(fresh,JSON.parse(JSON.stringify(saved)));assert.equal(fresh.showImpact,false);assert.equal(fresh.shotPlaybackSpeed,0);assert.equal(fresh.trainingBallStyle,'spots');assert(!('balls' in saved));assert(!('speed' in saved));
console.log('Ordered continuation, legal groups, blocked targets, break/completion, immutable planning and false/zero preference recovery passed.');
assert.deepEqual(g.eligibleBalls({...state,guidanceMode:'any'}).map(b=>b.id),[1,2,3]);
assert.deepEqual(g.eligibleBalls({...eight,guidanceMode:'order'}).map(b=>b.id),[1]);
assert.deepEqual(g.eligibleBalls({...eight,setupMode:'custom',guidanceMode:'groups'}).map(b=>b.id),[9]);
const liveBalls=state.balls.map(b=>({...b,active:true}));
const preview={settled:true,firstBallContact:{objId:1},pocketEvents:[{id:1}],finalBalls:liveBalls.filter(b=>b.id!==1)};
assert(g.afterShot(state,preview,1));
assert.equal(g.afterShot(state,{...preview,finalBalls:preview.finalBalls.filter(b=>b.id!==2)},1),null);
assert.equal(g.afterShot(state,{...preview,firstBallContact:{objId:2},pocketEvents:[{id:2}]},2),null);

const defense={...state,setupMode:'8ball',guidanceMode:'any',guidanceGroups:{1:'stripes',2:'solids'},speed:1.25,follow:0,sideSpin:0,
 balls:[{id:0,x:.55,y:.67},{id:1,x:1.73,y:.65},{id:8,x:1.25,y:.65},{id:9,x:.97,y:.50}]};
const protective={settled:true,firstBallContact:{objId:9,t:.6},pocketEvents:[],
 railEvents:[{id:9,t:1,rail:'top rail'}],
 finalBalls:defense.balls.map(b=>({...b,active:true}))};
const drain=iterator=>{let step;do{step=iterator.next();}while(!step.done);return step.value;};
const mock=outcome=>function*(){return outcome;};
const safe=drain(g.recommendSafety(defense,[],mock(protective)));
assert.equal(safe.ballId,9,'eight-ball defense obeys the suit even with Any Ball selected');
assert.deepEqual(safe.leave.targets,[1],'picks the opposite suit for the opponent');
assert.equal(safe.passed,5);
assert.equal(drain(g.recommendSafety(defense,[],mock({...protective,firstBallContact:{objId:1,t:.6}}))),null,'wrong first ball');
assert.equal(drain(g.recommendSafety(defense,[],mock({...protective,railEvents:[]}))),null,'must drive a ball to a rail');
assert.equal(drain(g.recommendSafety(defense,[],mock({...protective,pocketEvents:[{id:0}]}))),null,'must avoid a scratch');
assert.equal(drain(g.recommendSafety(defense,[{ballId:9,probability:.8},{ballId:8,probability:.7}],mock(protective))),null,'a strong verified finish wins over safety');
console.log('Eight-ball safety eligibility, full-route priority and checks for fouls and scratch passed.');

const cluster={...state,speed:1,follow:0,sideSpin:0,planSpeed:false,planFollow:false,planSpin:false,
 balls:[{id:0,x:.72,y:.62},{id:1,x:1.12,y:.62},{id:2,x:1.18,y:.62},{id:3,x:1.24,y:.62}]};
const contactTrial={
 settled:true,firstBallContact:{objId:1,t:.1,objPos:cluster.balls[1]},pocketEvents:[{id:1,pocket:'TM'}],railEvents:[],
 paths:{0:[cluster.balls[0],cluster.balls[0]]},collisionEvents:[{ids:[0,3],t:.2}]
};
const survivors=cluster.balls.filter(b=>b.id!==1).map(b=>({...b,active:true}));
const opened=survivors.map(b=>b.id===3?{...b,x:1.65,y:.66}:b);
const [breakout]=drain(g.runout(cluster,mock({...contactTrial,finalBalls:opened}),1));
assert.equal(breakout.contact.kind,'Breakout');
assert.deepEqual(breakout.contact.balls,[2,3]);
const [incidental]=drain(g.runout(cluster,mock({...contactTrial,finalBalls:survivors}),1));
assert.equal(incidental.contact.kind,'Extra contact','touching a cluster without opening it earns no breakout credit');
console.log('Runout contact scoring distinguishes an opened cluster from incidental contact.');

const relay={...cluster,balls:cluster.balls.map(b=>b.id===3?{...b,id:9}:b)};
const launch={ids:[0,1],t:.1},strikeRelay={ids:[0,9],t:.2},strikeNext={ids:[9,2],t:.3};
const relayed={...contactTrial,finalBalls:relay.balls.filter(b=>b.id!==1).map(b=>
 ({...b,active:true,...(b.id===2?{x:1.2,y:.20}:{})}))};
const runRelay=collisionEvents=>drain(g.runout(relay,mock({...relayed,collisionEvents}),1))[0];
assert.deepEqual(runRelay([launch,strikeRelay,strikeNext]).contact.sequence,[0,9,2]);
assert.deepEqual(runRelay([launch,{ids:[1,2],t:.2}]).contact.sequence,[0,1,2]);
assert.equal(runRelay([launch,strikeNext,strikeRelay]).contact.sequence,undefined,'a contact before the relay cannot be credited to it');
assert.equal(drain(g.runout(relay,mock({...relayed,collisionEvents:[launch,strikeRelay,strikeNext],pocketEvents:[{id:1,pocket:'TM'},{id:0}]}),1)).length,0);
console.log('Breakout attribution requires a legal pot and follows cue-ball relays and scoring-ball contacts in order.');

const combination={...state,guidanceMode:'order',balls:[state.balls[0],state.balls[1],state.balls[2],{id:9,x:2.2,y:.24}]};
const comboPreview={settled:true,firstBallContact:{objId:1,t:.1},pocketEvents:[{id:9,pocket:'TR'}],
 finalBalls:combination.balls.filter(b=>b.id!==9).map(b=>({...b,active:true}))};
assert.equal(g.afterScoringShot(combination,comboPreview).wonRack,true,'WPA 9-ball can finish on a legal combination or carom');
assert.equal(g.afterScoringShot(combination,{...comboPreview,firstBallContact:{objId:2,t:.1}}),null,'the lowest ball must be first');
assert.equal(g.afterScoringShot(combination,{...comboPreview,pocketEvents:[{id:9},{id:0}]}),null,'a pocketed 9 and cue ball do not win the rack');
const eightCombo={...combination,setupMode:'8ball',guidanceMode:'groups',guidanceGroups:{1:'solids'},balls:[...combination.balls,{id:8,x:2,y:.3}]};
assert.equal(g.afterScoringShot(eightCombo,comboPreview),null,'pocketing an opposing stripe does not continue solids');
const tenCombo={...combination,setupMode:'10ball',balls:combination.balls.map(b=>b.id===9?{...b,id:10}:b)};
assert.equal(g.afterScoringShot(tenCombo,{...comboPreview,pocketEvents:[{id:10}]}),null,'the early 10 is spotted under WPA rules');
console.log('Indirect pots preserve group/first-contact legality and allow a legal early nine.');

const railNudge={...state,guidanceMode:'order',speed:1.5,follow:0,sideSpin:0,
 balls:[[0,.6638,1.2413],[3,1.2773,.8065],[6,2.4552,.2223],[8,1.8345,.6413],[9,2.4785,.2783]]
 .map(([id,x,y])=>({id,x,y,active:true}))};
const defensiveFoul={settled:true,firstBallContact:{objId:3,t:.2},pocketEvents:[],railEvents:[],
 finalBalls:railNudge.balls.map(b=>b.id===3?{...b,x:2.4855,y:.155}:b)};
const fallback=drain(g.recommendSafety(railNudge,[],mock(defensiveFoul)));
assert(fallback?.intentionalFoul,'newly tied-up 3 can justify evaluating ball-in-hand as a last resort');
assert.equal(fallback.passed,5);
assert.equal(drain(g.recommendSafety({...railNudge,guidanceConsecutiveFouls:2},[],mock(defensiveFoul))),null,'never recommend a third consecutive foul');
assert.equal(drain(g.recommendSafety(railNudge,[],mock({...defensiveFoul,finalBalls:railNudge.balls}))),null,'no benefit when the opponent has a clear ball-in-hand pot');
console.log('Intentional-foul fallback requires worse ball-in-hand options and guards against a third foul.');

const exchange={...defense,guidanceGroups:{1:'solids',2:'stripes'},balls:[
 {id:0,x:.55,y:.67},{id:2,x:.97,y:.50},{id:6,x:.8,y:.95},{id:8,x:1.25,y:.65},{id:9,x:1.73,y:.65}
]};
const solidSafety={...protective,firstBallContact:{objId:2,t:.6},
 railEvents:[{id:2,t:1,rail:'top rail'}],finalBalls:exchange.balls.map(ball=>({...ball,active:true}))};
let opponentTries=0,returnTries=0;
function* exchangeTrial(layout){
 const suit=layout.guidanceGroups[1];
 if(suit==='stripes'){
  opponentTries++;
  return {...solidSafety,firstBallContact:{objId:9,t:.6},pocketEvents:[{id:6,t:1}],
   finalBalls:solidSafety.finalBalls.filter(ball=>ball.id!==6).map(ball=>ball.id===2?{...ball,x:1.73,y:.65}:
    ball.id===9?{...ball,x:.97,y:.50}:ball)};
 }
 if(!layout.balls.some(ball=>ball.id===6)){
  returnTries++;
  return null;
 }
 return solidSafety;
}
assert(drain(g.recommendSafety(exchange,[],exchangeTrial)));
assert(opponentTries>0,'assigned-group safety examines an opponent reply');
assert(returnTries>0,'an off-suit-only pot returns the inning with the potted solid removed');
console.log('Eight-ball safety looks for a counter from the actual layout after an opponent pockets only a solid.');

const twoWayLayout={...cluster,balls:[{id:0,x:.60,y:.30},{id:1,x:1.3,y:.35},{id:2,x:1.7,y:.65}]};
const twoWayAim=g.suggest(twoWayLayout);
const twoWayAngle=Math.atan2(twoWayAim.aim.y-.30,twoWayAim.aim.x-.60);
const pockets={'top left':'TL','top middle':'TM','top right':'TR','bottom left':'BL','bottom middle':'BM','bottom right':'BR'};
const made={...contactTrial,firstBallContact:{objId:1,t:.1},pocketEvents:[{id:1,pocket:pockets[twoWayAim.pocket]}],
 collisionEvents:[],finalBalls:twoWayLayout.balls.filter(ball=>ball.id!==1).map(ball=>({...ball,active:true}))};
const coveredMiss={...made,pocketEvents:[],railEvents:[{id:1,t:.5,rail:'top rail'}],finalBalls:[
 {id:0,x:.55,y:.67,active:true},{id:1,x:1.73,y:.65,active:true},{id:2,x:1.25,y:.65,active:true}
]};
const missOffset=.35*Math.PI/180;
function* twoWayTrial(layout,{freeAim}){
 const delta=Math.atan2(freeAim.y-.30,freeAim.x-.60)-twoWayAngle;
 return Math.abs(Math.abs(Math.atan2(Math.sin(delta),Math.cos(delta)))-missOffset)<1e-6?coveredMiss:made;
}
assert.deepEqual(drain(g.runout(twoWayLayout,twoWayTrial,1))[0]?.twoWay,{covered:2,missed:2});
assert.equal(drain(g.runout({...twoWayLayout,setupMode:'straight'},twoWayTrial,1))[0]?.twoWay,undefined);
console.log('Two-way probes recognize verified miss cover in rotation and bypass it in straight pool.');

const twoWayEight={...twoWayLayout,setupMode:'8ball',guidanceMode:'groups',guidanceGroups:{1:'solids'},
 balls:[...twoWayLayout.balls.slice(0,2),{...twoWayLayout.balls[2],id:9}]};
const eightMiss={...coveredMiss,finalBalls:coveredMiss.finalBalls.map(ball=>
 ball.id===1?{...ball,id:9}:ball.id===2?{...ball,id:1}:ball)};
const eightMade={...made,finalBalls:made.finalBalls.map(ball=>ball.id===2?{...ball,id:9}:ball)};
function* twoWayEightTrial(layout,controls,scratch=false){
 const {freeAim,speed}=controls;
 const delta=Math.atan2(freeAim.y-.30,freeAim.x-.60)-twoWayAngle;
 if(Math.abs(Math.abs(Math.atan2(Math.sin(delta),Math.cos(delta)))-missOffset)>1e-6)return eightMade;
 if(scratch&&speed<1)return {...eightMiss,pocketEvents:[{id:0}]};
 return eightMiss;
}
assert.deepEqual(drain(g.runout(twoWayEight,twoWayEightTrial,1))[0]?.twoWay,{covered:4,missed:4});
assert.equal(drain(g.runout(twoWayEight,(s,c)=>twoWayEightTrial(s,c,true),1))[0]?.twoWay,undefined,
 'a scratch in the slower miss probe defeats the two-way designation');

const defendedPocket={...exchange,balls:[...exchange.balls,{id:10,x:.095,y:.10}]};
const deniedPocket={...solidSafety,railEvents:[],pocketEvents:[{id:10,pocket:'TL',t:1}],
 collisionEvents:[{t:.8,ids:[0,10]}],finalBalls:solidSafety.finalBalls};
function* defensiveCarom(layout){
 return layout.guidanceGroups[1]==='solids'?deniedPocket:null;
}
const denial=drain(g.recommendSafety(defendedPocket,[],defensiveCarom));
assert.equal(denial?.passed,5);
assert.match(denial.reason,/Carom denies the top left pocket for ball 10/);
assert.equal(drain(g.recommendSafety(defendedPocket,[],mock({...deniedPocket,pocketEvents:[{id:8}]}))),null,
 'the 8 cannot be pocketed to claim a defensive advantage');

const pocketClear={...state,setupMode:'8ball',guidanceMode:'groups',guidanceGroups:{1:'solids'},speed:1.7,follow:0,sideSpin:0,
 balls:[[0,1.45,.70],[1,1.27,.24],[2,.45,.34],[3,.46,.53],[8,1.8,1],[9,.095,.10],[10,2.27,.81]]
  .map(([id,x,y])=>({id,x,y,active:true}))};
function* pocketClearTrial(layout,{sideSpin,follow},actualContact=true){
 const nudge=sideSpin>.15&&follow>-.3;
 return {settled:true,firstBallContact:{objId:1,t:.1,objPos:layout.balls[1]},pocketEvents:[{id:1,pocket:'TM',t:.2}],
  railEvents:[{id:0,rail:'top rail',t:.3}],collisionEvents:nudge&&actualContact?[{ids:[0,9],t:.4}]:[],
  paths:{0:[{...layout.balls[0],t:0},{x:1.2,y:.24,t:.1},{x:.11,y:.03,t:.3},{x:.33,y:.22,t:.4},{x:.72,y:.76,t:.8}]},
  finalBalls:layout.balls.filter(ball=>ball.id!==1).map(ball=>ball.id===0?{...ball,x:.72,y:.76}:ball.id===9&&nudge?{...ball,x:.19,y:.43}:ball)};
}
const [clearPlan]=drain(g.runout(pocketClear,pocketClearTrial,1));
assert.equal(clearPlan.contact.kind,'Pocket clear');
assert.equal(clearPlan.contact.cushions,1);
assert.deepEqual(clearPlan.contact.lanes,[{ballId:2,pocket:'top left'},{ballId:3,pocket:'top left'}]);
assert.equal(drain(g.runout(pocketClear,(s,c)=>pocketClearTrial(s,c,false),1))[0]?.contact.kind,undefined,
 'cannot credit a nudge without contact in the simulated route');
console.log('Eight-ball planning checks two-way speed errors, defensive caroms and multi-ball pocket clearance.');

const thinRailBreakout={...pocketClear,tableL:2.2352,tableW:1.1176,
 balls:[[0,.6972,.1566],[1,1.7955,.5635],[2,1.93,1.0687],[5,.6277,1.0515],[8,1.684,.663],
  [9,1.823,.835],[10,1.496,.961],[11,1.351,.0438],[12,1.914,.0469],[13,.171,.535],[14,2.114,.389],[15,2.148,1.089]]
  .map(([id,x,y])=>({id,x,y,active:true}))};
function* thinRailBreakoutTrial(layout,{speed,follow,sideSpin}){
 if(Math.abs(speed-3.55)>.01||follow||sideSpin)return null;
 return {settled:true,firstBallContact:{objId:1,t:.1,objPos:layout.balls[1]},pocketEvents:[{id:1,pocket:'TR',t:.3}],
  railEvents:[{id:0,rail:'right rail',t:.4},{id:0,rail:'bottom rail',t:.5}],collisionEvents:[{ids:[0,2],t:.6}],
  paths:{0:[{...layout.balls[0],t:0},{x:1.78,y:.61,t:.1},{x:2.20,y:.93,t:.4},
   {x:2.01,y:1.089,t:.5},{x:1.96,y:1.057,t:.6},{x:1.927,y:.98,t:1}]},
  finalBalls:layout.balls.filter(ball=>ball.id!==1).map(ball=>ball.id===0?{...ball,x:1.927,y:.98}:
   ball.id===2?{...ball,x:1.125,y:.445}:ball)};
}
const [thinBreakout]=drain(g.runout(thinRailBreakout,thinRailBreakoutTrial,1));
assert.equal(thinBreakout?.ballId,1,'find the firm thin pot when standard position speeds miss it');
assert.equal(thinBreakout.contact.kind,'Breakout');
assert.equal(thinBreakout.contact.cushions,2);
assert.deepEqual(thinBreakout.contact.sequence,[0,2]);

const roomLayout={...twoWayLayout,planFollow:true,balls:[...twoWayLayout.balls,{id:3,x:1.27,y:.74}]};
const nearestDiamond=roomLayout.tableL/8;
function* crowdingTrial(layout,controls){
 return {...made,finalBalls:[
  {id:0,x:1.27,y:.65,active:true},{id:2,x:1.7,y:.65,active:true},
  {id:3,x:1.27,y:controls.follow>.1?.94:.74,active:true}
 ]};
}
const [roomPlan]=drain(g.runout(roomLayout,crowdingTrial,1));
assert(roomPlan,'keep a route to the next legal ball');
const landing=roomPlan.preview.finalBalls.find(ball=>ball.id===0);
const neighbor=roomPlan.preview.finalBalls.find(ball=>ball.id===3);
assert(Math.hypot(neighbor.x-landing.x,neighbor.y-landing.y)>=.75*nearestDiamond,
 'give the off-target 3 room even though the distance to the 2 is identical');
console.log('Runout ranking prefers clearance around the leave from an off-target ball.');

const railRoomLayout={...twoWayLayout,planFollow:true};
function* railClearanceTrial(layout,controls){
 return {...made,finalBalls:[
  {id:0,x:.55,y:controls.follow>.1?.19:.06,active:true},{id:2,x:.32,y:.35,active:true}
 ]};
}
const [railRoomPlan]=drain(g.runout(railRoomLayout,railClearanceTrial,1));
assert(railRoomPlan?.rest.y>=.5*railRoomLayout.tableL/8,'prefer a leave at least half a diamond off the cushion');
function* onlyTightRailRoute(layout,controls){
 return yield* railClearanceTrial(layout,{...controls,follow:0});
}
assert.equal(drain(g.runout(railRoomLayout,onlyTightRailRoute,1))[0]?.rest.y,.06,
 'keep the tight rail leave when it is the available continuation');
console.log('Runout ranking prefers cushion clearance and retains a tight fallback.');

const cushionSearchLayout={...twoWayLayout,planSpin:true};
for(const railCount of [2,3,4]){
 let extraTrials=0;
 function* cushionSearchTrial(layout,controls){
  const longer=Math.abs(controls.sideSpin-.27)<1e-8;
  if(longer)extraTrials++;
  const names=['left rail','top rail','right rail','bottom rail'];
  return {...made,railEvents:names.slice(0,longer?railCount:1).map((rail,index)=>({id:0,t:.2+index*.1,rail})),
   finalBalls:[
    {id:0,x:longer?1.27:.06,y:longer?.65:.12,active:true},
    {id:2,x:1.7,y:.65,active:true}
   ]};
 }
 const [cushionPlan]=drain(g.runout(cushionSearchLayout,cushionSearchTrial,1));
 assert.equal(cushionPlan?.preview.railEvents.length,railCount,
  'consider each longer simulated cushion count when the basic leave is poor');
 assert(extraTrials>0&&extraTrials<16,'keep the extension bounded');
}
console.log('Runout search can choose two-, three-, and four-cushion leaves from a bounded trial set.');

const earlyPosition={...state,guidanceMode:'order',speed:1.5,follow:0,sideSpin:0,
 balls:[[0,.55,.53],[1,.23,.22],[2,.62,.40],[3,.85,.73],[9,2.1,.6]].map(([id,x,y])=>({id,x,y,active:true}))};
const nearbyOpening={...earlyPosition,
 balls:[[0,.79,.66],[1,.55,.50],[2,1.9,1.05]].map(([id,x,y])=>({id,x,y,active:true}))};
const likelyPocket=g.obviousOpening(nearbyOpening);
assert.equal(likelyPocket.pocket,'top left');
assert(likelyPocket.objectDistance>2*state.tableL/8&&likelyPocket.objectDistance<3*state.tableL/8);
assert.equal(g.obviousOpening({...nearbyOpening,balls:[...nearbyOpening.balls,{id:3,x:.31,y:.28,active:true}]}),null,
 'a blocked nearby pocket is not a likely opening');
const nearRail={...state,guidanceMode:'order',balls:[{id:0,x:1,y:.04},{id:1,x:1.2,y:.045}]};
assert.equal(g.suggest(nearRail).pocket,'top middle','fixture offers a high-margin side pocket');
assert.equal(g.obviousOpening(nearRail).pocket,'top right','first pass favors a playable corner along the rail');
assert.equal(g.obviousOpening({...nearRail,balls:[{id:0,x:.37,y:.20},nearRail.balls[1]]}).pocket,'top middle',
 'the side pocket stays eligible when the corners are unavailable');
let earlyTrials=0;
function* earlyPositionTrial(layout){
 earlyTrials++;
 assert.equal(layout.balls.some(ball=>ball.id===1),true,'only simulate the current shot');
 return {...made,pocketEvents:[{id:1,pocket:'TL'}],
  finalBalls:layout.balls.filter(ball=>ball.id!==1).map(ball=>ball.id===0?{...ball,x:.23,y:.27}:ball)};
}
const early=drain(g.runout(earlyPosition,earlyPositionTrial,6));
assert.equal(early.length,1);
assert.equal(early[0].pocket,'top left');
assert.deepEqual(early[0].quickPosition,{ballId:2,pocket:'bottom right'});
assert.equal(early[0].leaveSide,'right');
assert(earlyTrials<=36);
assert.equal(drain(g.recommendSafety(earlyPosition,early,()=>{throw Error('verified first shot should be ready');})),null);
function* crowdedEarlyTrial(layout){
 if(!layout.balls.some(ball=>ball.id===1))return null;
 const result=yield* earlyPositionTrial(layout);
 return {...result,finalBalls:result.finalBalls.map(ball=>ball.id===0?{...ball,x:.10,y:.27}:ball)};
}
assert.equal(drain(g.runout(earlyPosition,crowdedEarlyTrial,1))[0]?.quickPosition,undefined,
 'a marginal continuation that cannot be verified needs the full search');
console.log('Fast 9-ball verifies just shot one and returns the pocket and shape on ball two.');

let firstTrials=0;
const fastPot=drain(g.firstShot(earlyPosition,function*(layout,controls){
 firstTrials++;
 return yield* earlyPositionTrial(layout,controls);
}));
assert.equal(fastPot?.ballId,1);
assert(firstTrials<=27);
assert.equal(drain(g.firstShot(earlyPosition,mock({...made,pocketEvents:[{id:1,pocket:'TL'},{id:0}]}))),null,
 'fast results must reject scratches');

const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const scheduler=html.slice(html.indexOf('    function scheduleRunout('),html.indexOf('    function planDuringPlayback('));
function plannerClock({background=false,first=null,fail=false}={}){
 const source={},job={source,background,pending:true,shots:[]},queue=[];
 const events=[];
 let now=0;
 const context={
  animation:null,S:{preview:source,guidanceEnabled:true},runoutJob:background?null:job,forecastJob:background?job:null,
  performance:{now:()=>now},setTimeout(fn,delay){queue.push({fn,delay});},allowBackgroundPlan:()=>true,
  simulateRunoutStroke(){},cueSquirtAngleFor(){},draw(){},Event,console:{error(){}},
  runoutStatus:()=>job,window:{
   dispatchEvent(){events.push({at:now,pending:job.pending,shots:job.shots.length});},
   BilliardsGuidance:{
    *firstShot(){if(fail)throw Error('test');return first;},
    *runout(){while(true){now+=2;yield;}},
    *recommendSafety(){return null;}
   }
  }
 };
 vm.createContext(context);
 vm.runInContext(scheduler,context);
 context.scheduleRunout({},6,job,false);
 return {job,events,stop:context.stopRunout,drain(){
  while(queue.length){const {fn,delay}=queue.shift();now+=Math.max(1,delay);fn();}
  return now;
 }};
}
const foreground=plannerClock({first:fastPot});
assert(foreground.drain()>=4000&&foreground.events.at(-1).at<4020);
assert.deepEqual(foreground.events[0],{at:1,pending:true,shots:1});
assert.equal(foreground.job.shots[0],fastPot);
assert.equal(foreground.job.pending,false);
assert(foreground.job.limitReached);
const background=plannerClock({background:true});
assert(background.drain()>=2500&&background.events.at(-1).at<2520);
assert.equal(background.job.pending,false);
assert.deepEqual(background.job.shots,[]);
const stopped=plannerClock();
assert(stopped.stop());stopped.drain();
assert.equal(stopped.job.pending,false);
assert(stopped.job.cancelled);
const failed=plannerClock({fail:true});failed.drain();
assert.equal(failed.job.pending,false);
assert(failed.job.failed);
console.log('Planner offers a verified first shot and ends on deadline, cancel or error.');
