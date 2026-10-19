'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{createHost,view}=require('./server.cjs'),E=require('../play-engine'),C=require('../play-catalog');
test('local room approvals, private projections, scoped decisions, revocation and reset',async t=>{
 const host=createHost({port:0,bind:'127.0.0.1'}),ready=await host.listen(),base='http://127.0.0.1:'+ready.port;t.after(()=>{host.server.closeAllConnections();host.server.close();});
 async function api(route,token,data,extra={}){const res=await fetch(base+'/api/'+route,{method:data?'POST':'GET',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(data?{'Content-Type':'application/json'}:{}),...extra},body:data?JSON.stringify(data):undefined});return {status:res.status,...await res.json()};}
 const hostData=()=>api('host',host.hostToken);
 assert.equal((await api('host','wrong')).status,403);
 assert.equal((await api('host',host.hostToken,undefined,{Origin:'https://foreign.example'})).status,403);
 const initial=await hostData();let state=E.create({game:'poker',names:['Jeff','Cindy'],mode:'real',seed:123});
 let posted=await api('host/state',host.hostToken,{state,newGame:true});assert.equal(posted.status,200);
 const jeff=await api('join',null,{invite:initial.invite,name:'Jeff',seat:0}),cindy=await api('join',null,{invite:initial.invite,name:'Cindy'});assert.equal(jeff.status,201);
 const pending=await api('player',jeff.token);assert.equal(pending.approved,false);assert.equal(pending.view,null);
 const people=(await hostData()).members;
 assert.equal((await api('host/seat',host.hostToken,{id:people[0].id,seat:0})).status,200);
 assert.equal((await api('host/seat',host.hostToken,{id:people[1].id,seat:0})).status,409);
 await api('host/seat',host.hostToken,{id:people[1].id,seat:1});
 state=E.reduce(state,{type:'ready'});state=E.reduce(state,{type:'shot',potted:[1],made:true,rails:4});assert.equal(state.phase,'choose');
 posted=await api('host/state',host.hostToken,{state});
 const j=await api('player',jeff.token),c=await api('player',cindy.token);
 assert.deepEqual(j.view.private.choices,state.pending.map(E.cardLabel));assert(!c.view.private.choices);assert.deepEqual(c.view.private.hand,[]);
 for(const packet of [j,c]){assert(!('rng' in packet.view));assert(!('deck' in packet.view));assert(packet.view.players.every(p=>!('hand' in p)&&!('target' in p)&&!('fleet' in p)));}
 assert.equal((await api('action',cindy.token,{type:'choose',index:0,revision:posted.revision})).status,403);
 await api('host/state',host.hostToken,{state:{...state,localPaused:true}});const paused=await api('player',jeff.token);assert.equal(paused.view.paused,true);assert.deepEqual(paused.view.actions,[]);assert.equal((await api('action',jeff.token,{type:'choose',index:0,revision:paused.revision})).status,403);posted=await api('host/state',host.hostToken,{state});
 assert.equal((await api('action',jeff.token,{type:'shot',revision:posted.revision})).status,403);
 assert.equal((await api('action',jeff.token,{type:'choose',index:0,revision:posted.revision-1})).status,409);
 assert.equal((await api('action',jeff.token,{type:'choose',index:0,revision:posted.revision})).status,202);
 assert.equal((await api('action',jeff.token,{type:'choose',index:1,revision:posted.revision})).status,409);
 const event=(await hostData()).events[0];assert.equal(event.seat,0);state=E.reduce(state,event.event);await api('host/state',host.hostToken,{state,ack:[event.id]});assert.equal((await hostData()).events.length,0);
 assert.deepEqual((await api('player',jeff.token)).view.private.hand,state.players[0].hand.map(E.cardLabel));assert.deepEqual((await api('player',cindy.token)).view.private.hand,[]);
 const qr=await api('host/qr',host.hostToken,{url:`http://127.0.0.1:${ready.port}/join#invite=${initial.invite}`});assert.equal(qr.status,200);assert(qr.image.startsWith('data:image/png;base64,'));
 assert.equal((await api('host/qr',host.hostToken,{url:'https://evil.example/'})).status,400);
 const awaiting=E.reduce(E.reduce(E.create({game:'poker',names:['Jeff','Cindy'],mode:'real',seed:123}),{type:'ready'}),{type:'shot',potted:[1],made:true});posted=await api('host/state',host.hostToken,{state:awaiting});
 assert.equal((await api('action',jeff.token,{type:'choose',index:0,revision:posted.revision})).status,202);
 await api('host/remove',host.hostToken,{id:people[0].id});assert.equal((await hostData()).events.length,0,'Removing a player cancels their pending decision');assert.equal((await api('player',jeff.token)).status,401);
 await api('host/end',host.hostToken,{});assert.equal((await api('player',cindy.token)).status,401);assert.equal((await api('join',null,{invite:initial.invite,name:'Old invite'})).status,403);
 assert.equal((await fetch(base+'/local-host/server.cjs')).status,404);
 assert.equal((await fetch(base+'/api/player?token='+cindy.token)).status,401);
});
test('secret targets, saboteur identities, fleets and pending choices never cross seats',()=>{
 for(const game of ['kelly','bounty','blackjack','saboteur','battleship']){
  const names=Array.from({length:E.games[game].min},(_,i)=>'Player '+i),s=E.create({game,names,mode:'real',seed:123});
  for(let seat=0;seat<names.length;seat++){
   const v=view(s,seat);assert.equal(v.you,seat);assert(v.players.every(p=>Object.keys(p).sort().join(',')==='id,name,stat'));
   if(['kelly','bounty'].includes(game))assert.equal(v.private.target,s.players[seat].target);
   if(game==='saboteur'){assert.equal(v.private.role,seat===s.saboteur?'Saboteur':'Crew');assert(!('saboteur' in v));assert(!('votes' in v));}
   if(game==='battleship')assert.deepEqual(v.private.fleet,s.players[seat].fleet);
   if(game==='blackjack')assert.deepEqual(v.private.hand,s.players[seat].hand.map(E.cardLabel));
  }
 }
});

test('private voting follows the voter seat rather than the previous shooting seat',()=>{const s=E.create({game:'saboteur',names:['A','B','C','D'],mode:'real',seed:123});s.phase='vote';s.voteSeat=2;s.active=0;assert.equal(view(s,2).active,2);assert.deepEqual(view(s,2).actions,['vote']);assert.deepEqual(view(s,0).actions,[]);});
