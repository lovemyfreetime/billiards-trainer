'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),P=require('../companion-search.js'),K=require('../companion-dev/app-knowledge.cjs');
const state={tableL:2.54,tableW:1.27,ballR:.028575,balls:[{id:0,x:.7,y:.6,active:true},{id:1,x:.3,y:.2,active:true},{id:2,x:1.27,y:.2,active:true}]};
const result={settled:true,firstBallContact:{objId:1,t:.2},pocketed:[1],finalBalls:[{id:0,x:.5,y:.6,active:true},{id:1,x:0,y:0,active:false},{id:2,x:1.27,y:.2,active:true}],railEvents:[]};
test('9-ball practice rejects scratches, wrong contact, off-table and unfinished predictions',()=>{
 assert(P.legality(state,result).legal);
 for(const [patch,reason]of [[{settled:false},'simulation_not_settled'],[{firstBallContact:{objId:2,t:.2}},'wrong_or_missing_first_contact'],[{pocketed:[0,1],finalBalls:result.finalBalls.map(b=>b.id===0?{...b,active:false}:b)},'scratch_or_cue_off_table'],[{pocketed:[]},'ball_off_table']])assert(P.legality(state,{...result,...patch}).reasons.includes(reason));
 const nineState={...state,balls:[...state.balls,{id:9,x:2,y:1,active:true}]},nineResult={...result,pocketed:[1,9],finalBalls:[...result.finalBalls,{id:9,x:2.54,y:1.27,active:false}]};assert(P.legality(nineState,nineResult).won);
 assert(!P.legality(nineState,{...nineResult,firstBallContact:{objId:2}}).won);
});
test('path proximity detects near side-pocket passes even with a safe endpoint',()=>{
 const geometry={mouths:[[{x:1.21,y:0},{x:1.33,y:0}]],jaws:[]},R=state.ballR;
 const close=P.clearance([{x:.8,y:.3},{x:1.27,y:.035},{x:1.7,y:.5}],geometry,R),far=P.clearance([{x:.8,y:.3},{x:1.27,y:.25},{x:1.7,y:.5}],geometry,R);
 assert(close<.01);assert(far>.2);assert(P.clearance([{x:1.27,y:.4},{x:1.27,y:-.1}],geometry,R)<0);
});
test('bounded generation samples power and both spin axes and ignores nonphysical markers',()=>{
 const all=P.candidates(state,()=>0),first=all.slice(0,50);assert(first.length);for(const key of ['speed','follow','sideSpin'])assert(new Set(first.map(c=>c.shot[key])).size>1,key);
 assert.deepEqual(P.candidates({...state,balls:[...state.balls,{id:1000,x:.5,y:.4,marker:true,active:true}]},()=>0),all);
});
test('new tools validate strict budgets and cannot smuggle ball positions into a shot',()=>{
 assert.equal(K.callName({name:'trainer.search_runout'}),'search_runout');K.validateSimulationCall('search_runout',{game:'9-ball',maxSimulations:360});assert.throws(()=>K.validateSimulationCall('search_runout',{game:'8-ball',maxSimulations:360}));assert.throws(()=>K.validateSimulationCall('search_runout',{game:'9-ball',maxSimulations:6000}));assert.throws(()=>K.validateSimulationCall('simulate_shot',{stateId:'root',shot:{...state,speed:2}}));
 const t=K.tools[0].tools.find(t=>t.name==='simulate_shot');assert.equal(t.parameters.properties.shot.additionalProperties,false);assert.equal(t.parameters.additionalProperties,false);
});
test('search enforces task scope and cancellation before spending engine budget',async()=>{
 let calls=0;const session={state:()=>state,simulate:()=>{calls++;throw Error('Should not run');}};
 await assert.rejects(()=>P.search(session,{game:'8-ball'}),/9-ball/);await assert.rejects(()=>P.search({...session,state:()=>({...state,balls:[...state.balls,{id:3},{id:4}]})},{game:'9-ball'}),/three/);
 const controller=new AbortController();controller.abort();await assert.rejects(()=>P.search(session,{game:'9-ball',maxSimulations:60},{signal:controller.signal}),{name:'AbortError'});assert.equal(calls,0);
});

test('recorded path compaction preserves endpoints and cushion turns',()=>{const points=[{x:0,y:0},{x:.5,y:.5},{x:1,y:1},{x:1.5,y:.5},{x:2,y:0}];assert.deepEqual(P.compactPath(points),[points[0],points[2],points[4]]);});
