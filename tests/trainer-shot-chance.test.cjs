const assert=require('node:assert/strict'),chance=require('../trainer-shot-chance.js'),guide=require('../trainer-guidance.js');
const state={tableL:2.54,tableW:1.27,ballR:.028575,setupMode:'9ball',balls:[{id:0,x:.4,y:.9},{id:1,x:.7,y:1}]};
const original=structuredClone(state),options=chance.options(state,1),pots=options.filter(p=>p.probability!==null),best=pots.slice().sort((a,b)=>b.probability-a.probability)[0];
assert.equal(options.length,6);assert.equal(best.pocket,'bottom right');assert(best.objectDistance>Math.min(...pots.map(p=>p.objectDistance))+.3,'best pocket need not be the nearest feasible pocket');
assert.equal(guide.suggest(state).pocket,best.pocket);assert.deepEqual(state,original);
for(const p of pots){assert(p.probability>=0&&p.probability<=1);const worse=chance.options({...state,guidanceAimErrorDeg:.6},1).find(q=>q.pocket===p.pocket);assert(worse.probability<p.probability,'greater aim spread lowers the conditional chance');}
const blockers={...state,balls:[...state.balls,{id:2,x:(state.balls[0].x+best.aim.x)/2,y:(state.balls[0].y+best.aim.y)/2}]};
assert.equal(chance.options(blockers,1).find(p=>p.pocket===best.pocket).reason,'Blocked');
const kick={fullShot:true,reached:true,mode:'kick',contactKick:true,ballId:1,target:state.balls[1],bounces:[{x:1.5,y:.03}],points:[state.balls[0],{x:1.5,y:.03},{x:.75,y:.94}],shotSide:0};
const contact=chance.route(state,kick);assert.equal(contact.outcome,'Contact');assert(contact.probability>0&&contact.probability<1);assert(chance.route({...state,guidanceRailErrorDeg:1.5},kick).probability<contact.probability);
assert.equal(chance.route(state,{...kick,reached:false}),null);assert.equal(chance.route(state,{...kick,scratch:true}),null,'unverified or scratching routes receive no success odds');
const bank={...kick,mode:'bank',contactKick:false,target:{x:2.54,y:0},bounces:[{x:1.9,y:1.24}]};assert.equal(chance.route(state,bank).outcome,'Bank pocket');
assert.equal(chance.text(null),'—');assert(!chance.text(1).includes('100'));assert.notEqual(chance.color(.1),chance.color(.8,true));
console.log('Shot chances: farther highest-percentage pocket, six alternatives, immutable estimates, aim/rail uncertainty, blockers, contact vs pocket and unsupported-route handling passed.');
