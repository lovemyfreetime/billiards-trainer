const assert=require('node:assert/strict'),test=require('node:test'),{transfer,plan,at}=require('../trainer-shot-follow.js');
const first={objId:1,objIds:[1],t:.44};
const pocket=(id,t)=>({id,t,x:1.27,y:-.03,pocket:'TM'});
const pass=(from,to,t,takesOver=true)=>({from,to,t,takesOver});
const ids=p=>p.segments.map(s=>s.id);
test('a direct pot follows cue, then the first object, then the pocket',()=>{
 const p=plan({firstBallContact:first,pocketEvents:[pocket(1,1.2)]});
 assert.deepEqual(ids(p),[0,1]);assert.equal(at(p,.43).id,0);assert.equal(at(p,.44).id,1);
 assert.equal(at(p,1.199).pocket,null);assert.equal(at(p,1.2).pocket.pocket,'TM');
 assert.equal(at(p,.43).id,0,'replay can seek backwards');
});
test('banks and caroms keep the original object in frame if it pockets',()=>{
 const p=plan({firstBallContact:first,railEvents:[{id:1,t:.55}],
  collisionEvents:[pass(1,2,.8,false)],pocketEvents:[pocket(2,1),pocket(1,1.3)]});
 assert.deepEqual(ids(p),[0,1]);assert.equal(p.pocket.id,1);
});
test('a combination tracks the chronological chain to the pocket',()=>{
 const p=plan({firstBallContact:first,collisionEvents:[pass(1,2,.67),pass(2,3,.9),pass(4,5,.96)],
  pocketEvents:[pocket(5,1),pocket(3,1.1)]});
 assert.deepEqual(ids(p),[0,1,2,3]);assert.equal(at(p,.70).id,2);assert.equal(at(p,1.1).pocket.id,3);
});
test('a combination wins over an original ball that drops later',()=>{
 const p=plan({firstBallContact:first,collisionEvents:[pass(1,2,.7)],pocketEvents:[pocket(2,1),pocket(1,1.4)]});
 assert.deepEqual(ids(p),[0,1,2]);assert.equal(p.pocket.id,2);
});
test('frozen-ball contacts can hand the shot onward at the same event time',()=>{
 const p=plan({firstBallContact:first,collisionEvents:[pass(2,3,.66),pass(1,2,.66)],pocketEvents:[pocket(3,1)]});
 assert.deepEqual(ids(p),[0,1,2,3]);assert.equal(at(p,.66).id,3);
});
test('misses retain the contacted ball unless another demonstrably takes over',()=>{
 const p=plan({firstBallContact:first,collisionEvents:[pass(1,2,.8,false),pass(1,3,.9)],pocketEvents:[pocket(2,.7),pocket(4,1.1)]});
 assert.deepEqual(ids(p),[0,1,3]);assert.equal(p.pocket,null);
 assert.deepEqual(ids(plan({pocketEvents:[pocket(0,1)]})),[0]);
});
test('the contact pass uses actual receiving motion, not ID order',()=>{
 const c={nx:1,ny:0,nz:0,normal:.8},a={id:5,vx:.05,vy:0,vz:0},b={id:3,vx:1,vy:0,vz:0};
 assert.deepEqual(transfer(a,b,c,[1.05,0]),{from:5,to:3,takesOver:true});
 assert.equal(transfer(a,b,c,[.015,.9]),null);
 assert.equal(transfer(a,b,{...c,normal:.001},[1,0]),null);
 assert.deepEqual(transfer(a,b,c,[0,0]),{from:5,to:3,takesOver:true});
});
