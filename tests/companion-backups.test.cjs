const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('../companion-core.js'),B=require('../companion-backups.js');
const encode=async blob=>'data:'+blob.type+';base64,'+Buffer.from(await blob.arrayBuffer()).toString('base64');
function session(){const state=C.fresh();C.start(state,['Backup Alex','Backup Sam']);state.revision=4;return state;}
test('a complete recovery copy preserves individual notes, groups, results and the exact audio bytes',async()=>{
 const state=session(),s=state.sessions[0];s.stage=3;s.practiceStep=2;s.baseline=['Short position','Rushing'];s.takeaways=['Larger target','Pause'];C.attempt(s,true);s.voice.push({id:'voice-1',seat:1,createdAt:new Date().toISOString(),seconds:1});
 const blob=new Blob([new Uint8Array([1,2,3,254,255])],{type:'audio/ogg'}),payload=await B.build(state,C,async()=>({blob}),encode),checked=B.validate(payload,C);
 assert.deepEqual(checked.state,state);assert.deepEqual(new Uint8Array(await checked.audio[0].blob.arrayBuffer()),new Uint8Array(await blob.arrayBuffer()));
 state.sessions[0].baseline[0]='Changed after backup';assert.equal(payload.state.sessions[0].baseline[0],'Short position');assert.equal(checked.audio[0].sessionId,s.id);
});
test('missing audio and malformed restore records never become a complete backup',async()=>{
 const state=session();state.sessions[0].voice.push({id:'voice-1',seat:0,createdAt:'now',seconds:1});
 await assert.rejects(B.build(state,C,async()=>null,encode),/missing/);
 const payload={format:'billiards-play-together',version:1,state,audio:[]};assert.throws(()=>B.validate(payload,C),/incomplete/);
 payload.audio=[{id:'voice-1',sessionId:state.sessions[0].id,data:'data:text/html;base64,AA=='}];assert.throws(()=>B.validate(payload,C),/Invalid audio/);
 payload.audio[0].data='data:audio/ogg;base64,AA==';payload.audio[0].sessionId='different';assert.throws(()=>B.validate(payload,C),/Invalid audio/);
 payload.audio[0].sessionId=state.sessions[0].id;state.sessions[0].voice.push({...state.sessions[0].voice[0]});assert.throws(()=>B.validate(payload,C),/Duplicate/);
});
test('retention keeps five recent copies and updates a time window without growing indefinitely',()=>{
 const rows=Array.from({length:5},(_,i)=>({id:'auto-'+i,savedAt:i,revision:i,signature:String(i)}));
 const added=B.retention(rows,{id:'keep-before-delete',savedAt:6,revision:6});assert.equal(added.length,5);assert.equal(added[0].id,'keep-before-delete');assert(!added.some(x=>x.id==='auto-0'));
 const replaced=B.retention(added,{id:'auto-4',savedAt:7,revision:7});assert.equal(replaced.length,5);assert.equal(replaced.filter(x=>x.id==='auto-4').length,1);assert(replaced.some(x=>x.id==='keep-before-delete'));
});
test('late writes from another window cannot displace a newer recovery copy',()=>{
 const latest={id:'new',savedAt:10,revision:20,signature:'new'};
 assert.equal(B.plan([latest],{id:'late',savedAt:30,revision:19,signature:'old'},true).save,false);
 assert.equal(B.plan([latest],{id:'same',savedAt:30,revision:20,signature:'new'}).save,false);
 assert.equal(B.plan([latest],{id:'protected',savedAt:30,revision:20,signature:'new'},true).save,true);
 assert.equal(B.plan([latest],{id:'changed',savedAt:30,revision:21,signature:'changed'}).save,true);
});
test('legacy manual backups without automatic-backup metadata still restore',()=>{
 const payload={format:'billiards-play-together',version:1,state:session(),audio:[]};assert.deepEqual(B.validate(payload,C).state,payload.state);
 const invalid=structuredClone(payload);invalid.state.sessions[0].stage=99;assert.throws(()=>B.validate(invalid,C),/Invalid session/);
});
