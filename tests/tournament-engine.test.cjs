const assert=require('node:assert/strict');const E=require('../tournament-engine.js');
const config=(n,format='double',extra={})=>({name:'Test Night',entries:Array.from({length:n},(_,i)=>`Player ${i+1}`),format,tables:4,race:3,lowerRace:2,finalRace:4,draw:'seeded',...extra});
function finish(n,format,extra={},pick=0){let s=E.create(config(n,format,extra));const losses=Object.fromEntries(s.entries.map(e=>[e.id,0]));let games=0;
 while(s.phase!=='complete'){
  if(s.phase==='group-review'){s=E.reduce(s,{type:'advance-groups'});continue;}
  const ready=E.ready(s);assert(ready.length,'No bracket deadlocks');const m=ready[(games*7)%ready.length];assert(m.players.every(Boolean));assert.notEqual(...m.players);
  const winner=(games+pick)%2,score=winner?[0,m.race]:[m.race,0];const loser=m.players[1-winner];losses[loser]++;
  s=E.reduce(s,{type:'result',id:m.id,scores:score});games++;assert(games<10000);
 }
 E.validate(s);assert(s.champion);if(format==='double'&&extra.resetFinal!==false){assert(games>=2*n-2&&games<=2*n-1);for(const [id,l]of Object.entries(losses))assert(id===s.champion?l<=1:l===2,`${n}: ${id} losses ${l}`);}if(format==='single')assert.equal(games,n-1);return {s,games};}
for(let n=2;n<=70;n++){finish(n,'single');finish(n,'double');}
for(const n of [95,127,128,129,192,255,256]){finish(n,'single');finish(n,'double');}
for(const n of [2,3,7,16,31,64]){finish(n,'groups');finish(n,'chip');}
finish(37,'double',{resetFinal:false});
let s=E.create(config(7));const untouched=JSON.stringify(s),m=E.ready(s)[0];s=E.reduce(s,{type:'assign',id:m.id,table:1});assert.equal(JSON.parse(untouched).matches.find(x=>x.id===m.id).status,'ready');const next=E.ready(s)[0];assert.throws(()=>E.reduce(s,{type:'assign',id:next.id,table:1}),/already/);assert.throws(()=>E.reduce(s,{type:'result',id:m.id,scores:[1,0]}));assert.throws(()=>E.reduce(s,{type:'result',id:m.id,scores:[3,3]}));s=E.reduce(s,{type:'unassign',id:m.id});assert.equal(s.matches.find(x=>x.id===m.id).status,'ready');
assert.throws(()=>E.create(config(257)));assert.throws(()=>E.create(config(1)));assert.throws(()=>E.create(config(4,'single',{entries:['A','A']})));assert.throws(()=>E.create(config(4,'single',{entryType:'doubles'})));E.create(config(2,'double',{entryType:'doubles',entries:[{members:['A','B']},{members:['C','D']}]}));
assert.throws(()=>E.create(config(2,'double',{entryType:'doubles',entries:[{members:['A','B']},{members:['A','C']}]})));
let invalid=E.create(config(4));invalid.matches[0].players=[null,null];assert.throws(()=>E.validate(invalid));
let a=E.create(config(16,'single',{draw:'random'}),()=>0.25),b=E.create(config(16,'single',{draw:'random'}),()=>0.75);assert.notDeepEqual(a.order,b.order);assert.deepEqual(E.seedOrder(8),[1,8,4,5,2,7,3,6]);
// Both final paths: unbeaten champion skips reset; challenger forces a deciding match.
for(const reset of [false,true]){let x=E.create(config(8));while(!E.ready(x).some(m=>m.id==='F1')){const m=E.ready(x)[0];x=E.reduce(x,{type:'result',id:m.id,scores:[m.race,0]});}const f=E.ready(x).find(m=>m.id==='F1');x=E.reduce(x,{type:'result',id:f.id,scores:reset?[0,f.race]:[f.race,0]});assert.equal(x.phase,reset?'running':'complete');assert.equal(x.matches.find(m=>m.id==='F2').status,reset?'ready':'skipped');}
console.log('Tournament engine: arbitrary counts 2–256, single/double complete paths, both finals, byes, groups, chips, tables, scores, draws, and immutable actions pass.');
