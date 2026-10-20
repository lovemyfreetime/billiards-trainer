const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('guide/guide.js','utf8');
const fn=source.slice(source.indexOf(' function skipRecording('),source.indexOf(' function clearHighlight()'));
const tracks=[{id:'first',audio:['a.mp3','b.mp3']},{id:'second',audio:['c.mp3']}];
const state={topicId:'first',position:24};let loaded=[],played=0,sequenceIndex=1;
const ctx={state,speech:null,audio:{paused:false,currentTime:24,pause(){this.paused=true},play(){played++;this.paused=false;return Promise.resolve()}},playback:{pause(){ctx.audio.pause()},play(){return ctx.audio.play()}},cancelSpeech(){},selected:()=>tracks.find(t=>t.id===state.topicId),audioFiles:t=>t.audio,availableLessons:()=>tracks,loadSequenceTrack(t,i){loaded.push([t.id,i]);ctx.sequenceIndex=i;ctx.audio.currentTime=0},choose(id){state.topicId=id;ctx.sequenceIndex=0},play(){played++},save(){},render(){},sequenceIndex};vm.createContext(ctx);vm.runInContext(fn,ctx);
ctx.skipRecording(-1);assert.deepEqual(loaded,[['first',0]]);assert.equal(state.position,0);assert.equal(played,1);
ctx.audio.paused=true;ctx.skipRecording(1);assert.deepEqual(loaded.at(-1),['first',1]);assert.equal(played,1,'Paused skips must remain paused');
ctx.skipRecording(1);assert.equal(state.topicId,'second');ctx.skipRecording(-1);assert.equal(state.topicId,'first');
ctx.sequenceIndex=0;ctx.audio.currentTime=12;ctx.skipRecording(-1);assert.equal(ctx.audio.currentTime,0);
console.log('Previous/next audio tracks and lessons preserve playback state; first-file rewind works.');

tracks.push({id:"welcome",audio:["welcome.mp3"]});ctx.availableLessons=()=>tracks.slice(0,2);state.topicId="welcome";ctx.sequenceIndex=0;ctx.audio.currentTime=12;ctx.skipRecording(-1);assert.equal(state.topicId,"welcome","Previous at the welcome must not jump to the final lesson");assert.equal(ctx.audio.currentTime,0);

state.topicId="first";ctx.sequenceIndex=1;ctx.audio.paused=false;ctx.choose=()=>false;const beforeRejected=played;ctx.skipRecording(1);assert.equal(played,beforeRejected,"Rejected lesson navigation must not replay the previous lesson");
state.topicId='first';ctx.sequenceIndex=1;ctx.audio.paused=true;ctx.playback.starting=true;ctx.choose=id=>{state.topicId=id;ctx.sequenceIndex=0;return true};const beforeWarmupSkip=played;ctx.skipRecording(1);assert.equal(state.topicId,'second');assert.equal(played,beforeWarmupSkip+1,'Next during output warmup must continue the pending narration');
