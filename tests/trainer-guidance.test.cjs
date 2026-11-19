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
