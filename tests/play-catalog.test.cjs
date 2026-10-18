const assert=require('node:assert/strict'),E=require('../play-engine'),C=require('../play-catalog');
const create=(game,n)=>E.create({game,mode:'real',seed:42,names:Array.from({length:n||E.games[game].min},(_,i)=>'P'+i)});
const ready=s=>s.phase==='placement'?E.reduce(s,{type:'ready'}):s;
const shot=(s,potted=[],extra={})=>E.reduce(ready(s),{type:'shot',potted,...extra});
assert.equal(Object.keys(E.games).length,20);
for(const id of Object.keys(C.games)){let s=create(id);const before=JSON.stringify(s);if(s.phase==='placement')E.reduce(s,{type:'ready'});assert.equal(JSON.stringify(s),before,'reducers do not mutate input');assert.deepEqual(create(id),s,'seeded games replay identically');}
let s=create('kelly');s=shot(s,[s.players[0].target]);assert.equal(s.phase,'result');assert.deepEqual(s.result.winners,[0]);
s=create('kelly');const target=s.players[1].target;s=shot(s,[target]);assert.notEqual(s.players[1].target,target);assert.equal(s.phase,'ready');
s=create('bounty');const t=s.players[0].target;s=shot(s,[t]);assert.equal(s.players[0].score,3);assert.equal(s.active,1);for(let i=1;i<10;i++)s=shot(s);assert.equal(s.phase,'result');
s=create('blackjack');for(let h=0;h<3;h++){let limit=0;while(s.phase!=='hand-result'&&limit++<10)s=E.reduce(ready(s),{type:'stand'});assert.equal(s.phase,'hand-result');s=E.reduce(s,{type:'next-hand'});}assert.equal(s.phase,'result');assert.equal(C.total([12,25]),12);assert.equal(C.total([12,8]),21);
s=create('cribbage');s=shot(s,[1]);assert.deepEqual(s.held,[1]);s=shot(s,[]);assert(s.remaining.includes(1));assert.equal(s.active,1);s=shot(s,[2,13]);assert.equal(s.players[1].score,1);s=shot(s,[15]);assert(s.remaining.includes(15));
s=create('bingo');for(let r=0;r<3;r++)for(let p=0;p<2;p++){s=E.reduce(s,{type:'task',index:r});s=shot(s,[],{made:true});}assert.equal(s.phase,'result');assert.deepEqual(s.result.winners,[0,1]);
s=create('turf');for(let i=0;i<16;i++)s=shot(s,[],{made:true,pockets:[i%2?'TM':'TL']});assert.equal(s.phase,'result');assert.deepEqual(s.players.map(p=>p.score),[8,8]);
s=create('battleship');s=E.reduce(s,{type:'fleet-lock'});s=E.reduce(s,{type:'fleet-lock'});const cells=[...s.players[1].fleet];for(const cell of cells){s=shot(s,[],{made:true});assert.equal(s.phase,'attack');s=E.reduce(s,{type:'attack',cell});if(s.phase!=='result')s=shot(s);}assert.equal(s.phase,'result');
s=create('golf');for(let i=0;i<6;i++)s=shot(s,[1],{pockets:[s.targetPocket]});assert.equal(s.phase,'result');assert.equal(s.players[0].score,6);
s=create('golf');s=shot(s,[1],{pockets:['BL'],scratch:true});assert.equal(s.attempt,3);assert.deepEqual(s.remaining,[1]);
s=create('saboteur');let count=0;while(s.phase!=='result'&&count++<50){if(s.phase==='vote')s=E.reduce(s,{type:'vote',index:s.saboteur});else s=shot(s,[],{made:true});}assert.equal(s.phase,'result');assert.match(s.result.text,/Crew wins/);
s=create('horse');let steps=0;while(s.phase!=='result'&&steps++<100){if(s.phase==='task')s=E.reduce(s,{type:'task',index:0});else s=shot(s,[],{made:s.active===s.leader});}assert.equal(s.phase,'result');
s=create('equalizer');for(let i=0;i<10;i++)s=shot(s,[1,2,3]);assert.equal(s.phase,'result');assert.deepEqual(s.players.map(p=>p.score),[5,5]);
assert.equal(C.bowlingScore(Array.from({length:10},(_,i)=>i===9?[10,10,10]:[10])),300);assert.equal(C.bowlingScore(Array.from({length:10},(_,i)=>i===9?[5,5,5]:[5,5])),150);assert.equal(C.bowlingScore(Array.from({length:10},()=>[4,5])),90);
s=create('bowliards');let visits=0;while(s.phase!=='result'&&visits++<100){if(s.freeBreak)s=shot(s);else s=shot(s,[...s.remaining]);}assert.equal(s.phase,'result');assert.equal(s.players[0].score,300);
s=create('ring');for(let i=0;i<5;i++)s=shot(s,[...s.remaining]);assert.equal(s.phase,'result');assert.equal(s.players[0].score,6);assert.equal(s.players[1].score,6);assert.equal(s.players[2].score,3);
s=create('three');for(let i=0;i<3;i++)s=shot(s,[1,2,3]);assert.equal(s.phase,'result');assert.equal(s.players[0].score,3);
s=create('speed');for(let i=0;i<2;i++){s=E.reduce(ready(s),{type:'start-run',now:1000});s=E.reduce(s,{type:'penalty'});s=E.reduce(s,{type:'finish-run',now:6000});}assert.equal(s.phase,'result');assert.deepEqual(s.players[0].times,[15,15]);
s=create('speed');s=E.reduce(ready(s),{type:'start-run',now:1000});s=E.reduce(s,{type:'interrupt'});s=E.reduce(s,{type:'finish-run',now:6000});assert.equal(s.players[0].times[0],null);
s=create('highlow');s=shot(s,[1,2,3,4,5,6,7,8]);assert.equal(s.wins[0],1);s=shot(s,[1,2,3,4,5,6,7,8]);assert.equal(s.wins[1],1);s=shot(s,[1,2,3,4,5,6,7,8]);assert.equal(s.phase,'result');
// Auto reports enforce contact and route requirements.
s=create('kelly');s=shot(s,[s.players[0].target],{auto:true,firstContact:15,railAfter:true});assert.notEqual(s.phase,'result');
s=create('bingo');s=E.reduce(s,{type:'task',index:0});const before=JSON.stringify(s);s=shot(s,[1],{auto:true,firstContact:1,railAfter:true,pockets:[{id:1,pocket:'BL'}]});assert.equal(s.players[0].marks.length,0);assert.notEqual(JSON.stringify(s),before);
console.log('Catalog: 16 games, deterministic transitions, full matches, secret replacement, ties, private votes, fleets, task validation, bowling 300/150/90, time penalties/interruption, and contact fouls passed.');
for(const [task,detail,expected] of [[3,{bank:false},0],[3,{bank:true},1],[4,{kick:false},0],[4,{kick:true},1],[5,{cueFinish:{x:.5,y:.8}},1],[5,{cueFinish:{x:.5,y:.2}},0],[6,{cueFinish:{x:.5,y:.1}},1]]){let g=create('bingo');g=E.reduce(g,{type:'task',index:g.players[0].board.indexOf(task)});g=shot(g,[1],{auto:true,firstContact:1,railAfter:true,pockets:[{id:1,pocket:g.targetPocket}],...detail});assert.equal(g.players[0].marks.length,expected);}
let g=create('equalizer'),layouts=[];for(let i=0;i<10;i++){if(i%2===0)layouts.push(JSON.stringify(g.scene));g=shot(g,[1,2,3]);}assert.equal(new Set(layouts).size,5);
