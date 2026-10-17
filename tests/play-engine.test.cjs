const assert=require('node:assert/strict');
const E=require('../play-engine.js');
const create=(game,names=game==='ghost'?['A']:game==='cutthroat'?['A','B','C']:['A','B'])=>E.reduce(E.create({game,names,seed:1234}),{type:'ready'});
const step=(s,x)=>E.reduce(s,{type:'shot',potted:[],...x});
const ready=s=>s.phase==='placement'?E.reduce(s,{type:'ready'}):s;
let s=create('killer');const initial=structuredClone(s);
s=step(s,{});assert.equal(s.phase,'placement');assert.equal(s.breakRetry,1);assert.equal(s.players[0].lives,3);
s=step(ready(s),{});assert.equal(s.players[0].lives,2);assert.equal(s.active,1);
s=step(s,{potted:[1],foul:true,scratch:true});assert.equal(s.players[1].lives,2);assert(s.remaining.includes(1));
assert.deepEqual(initial,create('killer'),'pure reducers do not mutate input');
s=ready(s);while(s.phase!=='result')s=ready(step(s,{foul:true}));assert.equal(s.result.winners.length,1);
s=create('cutthroat');s=step(s,{potted:[1,2,3,4,5]});assert.equal(s.active,1);assert(!E.alive(s,0));
s=step(s,{potted:[11],foul:true,scratch:true});assert(E.alive(s,0));assert(s.remaining.includes(1));assert(s.remaining.includes(11));assert.equal(s.phase,'placement');
s=create('cutthroat');s=step(s,{potted:Array.from({length:15},(_,i)=>i+1)});assert.deepEqual(s.remaining,[1,6,11]);assert.equal(s.phase,'placement');assert.equal(s.result,null);
s=create('cutthroat');s=step(s,{potted:[6,7,8,9,10,11,12,13,14,15]});assert.deepEqual(s.result.winners,[0]);
s=create('ghost');s=step(s,{potted:[3],auto:true,firstContact:1,scratch:true,foul:true});assert(s.remaining.includes(3));assert.equal(s.phase,'placement');s=ready(s);s=step(s,{potted:[2],auto:true,firstContact:2,railAfter:true});assert.equal(s.points[1],1,'wrong first gives ghost rack');
s=create('ghost');s=step(s,{potted:[1,2,3]});assert.equal(s.points[0],1);s=ready(s);for(let i=1;i<5;i++){s=step(s,{potted:[1,2,3]});if(i<4)s=ready(s);}assert.equal(s.result.text,'You beat the ghost!');
s=create('poker');for(let turn=0;turn<10;turn++){s=ready(s);s=step(s,{potted:turn===0?[1]:[],made:true});assert.equal(s.phase,'choose');const before=structuredClone(s);const choice=E.reduce(s,{type:'choose',index:0});assert.equal(choice.players[s.active].hand.at(-1),s.pending[0]);assert.deepEqual(s,before);s=choice;}
assert.equal(s.phase,'result');assert(s.players.every(p=>p.hand.length===5));assert.equal(new Set(s.players.flatMap(p=>p.hand)).size,10);
let x=create('poker',['A','B','C','D','E','F']);for(let i=0;i<30;i++){x=ready(x);x=step(x,{made:true,potted:i===0?[1]:[]});x=E.reduce(x,{type:'choose',index:1});}assert.equal(x.phase,'result');assert.equal(new Set(x.players.flatMap(p=>p.hand)).size,30,'deck recycling never duplicates a held card');
const hand=cards=>E.rankHand(cards).value;
assert.equal(E.rankHand([12,0,1,2,3]).label,'Straight flush');assert.deepEqual(hand([12,0,1,2,3]),[8,5]);
assert(E.compare(hand([8,9,10,11,12]),hand([0,13,26,39,1]))>0);
assert.equal(E.rankHand([0,13,2,15,3]).label,'Two pair');
assert.throws(()=>E.reduce(create('killer'),{type:'shot',potted:[1,1]}));
assert.throws(()=>E.create({game:'cutthroat',names:['A','B']}));
// Exercise transitions over many games, including incomplete racks and repeated fouls.
for(const game of Object.keys(E.games)){for(let seed=1;seed<=50;seed++){let g=E.create({game,names:game==='ghost'?['A']:game==='cutthroat'?['A','B','C']:['A','B','C'],seed});for(let n=0;n<250&&g.phase!=='result';n++){if(g.phase==='placement')g=E.reduce(g,{type:'ready'});else if(g.phase==='choose')g=E.reduce(g,{type:'choose',index:n%2});else g=step(g,{potted:n%3&&g.remaining.length?[g.remaining[0]]:[],foul:n%7===0,made:n%3!==0});assert.equal(new Set(g.remaining).size,g.remaining.length);assert(g.players.every(p=>p.lives>=0));assert(g.active>=0&&g.active<g.players.length);}}}
console.log('Play engine: complete games, break retries, foul precedence, revival, ghost rotation, deck exhaustion, hand ranking, immutability and 200 varied sessions pass.');
