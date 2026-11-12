const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('../companion-core.js'),B=require('../companion-backups.js');
const clone=x=>JSON.parse(JSON.stringify(x));
function ready(s){s.agreed=true;s.stage=3;s.practiceStep=2;return s;}
test('multiple unfinished solo, companion and coaching sessions survive reload and switching',()=>{
 const state=C.fresh(),a=ready(C.start(state,['Solo']));a.baseline[0]='Control speed';C.attempt(a,true);
 const saved=clone(a),b=C.start(state,['Player','Coach'],{roles:['player','coach']}),c=C.start(state,['Friends','Partner']);
 assert.deepEqual(a,saved);C.resume(state,b.id);C.resume(state,a.id);assert.deepEqual(a,saved);
 const memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};C.save(storage,state);
 const restored=C.load(storage);assert.equal(restored.sessions.length,3);assert.equal(restored.activeId,a.id);assert.deepEqual(restored.sessions.find(s=>s.id===a.id),saved);assert.equal(c.status,'active');
});
test('solo attempts always stay with the player; coaches have notes but no shooting turns',()=>{
 const state=C.fresh(),solo=ready(C.start(state,['Solo']));for(let i=0;i<11;i++)C.attempt(solo,true);assert.equal(C.seat(solo),0);
 const coached=ready(C.start(state,['Player','Coach'],{roles:['player','coach']}));coached.takeaways[1]='Shorter explanation';for(let i=0;i<11;i++)C.attempt(coached,true);assert(coached.attempts.every(a=>a.seat===0));assert.deepEqual(C.units(coached),[[0]]);C.validate(state);
});
test('adding people preserves old seats, results, audio and other sessions sharing the original roster',()=>{
 const state=C.fresh(),older=ready(C.start(state,['A','B']));older.voice.push({id:'audio',seat:1,createdAt:'now',seconds:2});C.attempt(older,true);const saved=clone(older);
 const current=ready(C.start(state,['A','B']));assert.equal(older.pairId,current.pairId);current.baseline[0]='Keep me';current.voice.push({id:'audio-current',seat:1,createdAt:'now',seconds:2});C.attempt(current,false);
 const results=clone(current.attempts),audio=clone(current.voice);C.addParticipant(state,current.id,'Coach',{role:'coach'});C.addParticipant(state,current.id,'New player');
 assert.deepEqual(older,saved);assert.deepEqual(C.names(state,older),['A','B']);assert.deepEqual(C.names(state,current),['A','B','Coach','New player']);assert.deepEqual(current.attempts,results);assert.deepEqual(current.voice,audio);assert.deepEqual(current.baseline,['Keep me','','','']);assert.deepEqual(C.units(current),[[0,1,3]]);C.validate(state);
});
test('participant additions target the chosen group and invalid additions never mutate state',()=>{
 const state=C.fresh(),s=ready(C.start(state,['A','B','C','D'],{format:'partners'}));C.addParticipant(state,s.id,'E',{unit:1});assert.deepEqual(C.units(s),[[0,1],[2,3,4]]);
 for(const [name,options] of [[' a ',{}],['',{}],['Z',{role:'unknown'}],['Z',{unit:9}]]){const before=JSON.stringify(state);assert.throws(()=>C.addParticipant(state,s.id,name,options));assert.equal(JSON.stringify(state),before);}
 for(const options of [{roles:['coach']},{roles:['invalid']}]){const before=JSON.stringify(state);assert.throws(()=>C.start(state,['Only'],options));assert.equal(JSON.stringify(state),before);}
});
test('completed sessions reopen for further contributions without erasing the finished work',()=>{
 const state=C.fresh(),s=ready(C.start(state,['A']));s.takeaways[0]='Saved discovery';C.attempt(s,true);C.finish(state,s);const other=C.start(state,['B']);C.resume(state,s.id);assert.equal(s.status,'active');assert.equal(s.takeaways[0],'Saved discovery');assert.equal(s.attempts.length,1);assert.equal(other.status,'active');C.validate(state);
});
test('old shared rosters cannot overwrite an expanded session and new coached copies round trip',()=>{
 const state=C.fresh(),s=ready(C.start(state,['A','B'])),old=C.packet(state,s.id);C.addParticipant(state,s.id,'Coach',{role:'coach'});const before=JSON.stringify(state);assert.throws(()=>C.receive(state,old),/groups changed/);assert.equal(JSON.stringify(state),before);
 const imported=C.receive(C.fresh(),C.packet(state,s.id));assert.deepEqual(C.names(imported,imported.sessions[0]),['A','B','Coach']);assert.deepEqual(C.roles(imported.sessions[0]),['player','player','coach']);
});
test('full backups preserve multiple active sessions, coach roles and exact audio after a roster addition',async()=>{
 const state=C.fresh(),s=C.start(state,['Solo']);s.voice.push({id:'voice',seat:0,createdAt:'now',seconds:1});C.addParticipant(state,s.id,'Coach',{role:'coach'});C.start(state,['Other','Friend']);
 const bytes=Buffer.from([1,3,5,7]),blob=new Blob([bytes],{type:'audio/ogg'}),payload=await B.build(state,C,async()=>({blob}),async b=>'data:audio/ogg;base64,'+Buffer.from(await b.arrayBuffer()).toString('base64'));
 const restored=B.validate(payload,C);assert.deepEqual(restored.state,state);assert.deepEqual(Buffer.from(await restored.audio[0].blob.arrayBuffer()),bytes);
});
