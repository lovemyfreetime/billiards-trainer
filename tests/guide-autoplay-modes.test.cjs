const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('guide/guide.js','utf8');
function source(name){const a=src.indexOf(' function '+name+'(');return src.slice(a,src.indexOf('\n function ',a+10));}
const state={category:'start',autoplay:true,enabled:true,topicId:'start',exploring:false};let played=0;
const env={state,topics:[{id:'welcome-fundamentals',category:'fundamentals',categoryWelcome:true},{id:'welcome-drills',category:'drills',categoryWelcome:true}],sequenceIndex:0,availableLessons:()=>[{id:state.category+'-one'}],setEnabled(v){state.enabled=v},choose(id){state.topicId=id},play(){played++},save(){},render(){},audio:{pause(){}},playback:{pause(){}}};vm.createContext(env);vm.runInContext(source('openCategory'),env);vm.runInContext(source('advanceLesson'),env);
env.openCategory('fundamentals');assert.equal(state.autoplay,false,'Guide must not inherit Get Started autoplay');
state.topicId='fundamentals-one';env.advanceLesson();assert.equal(played,1,'Guide welcome plays but does not auto-advance');
env.openCategory('start');assert.equal(state.autoplay,true);assert.equal(played,2,'Get Started plays from opening gesture');
env.openCategory('drills');assert.equal(state.autoplay,false);
assert.ok(!src.includes('speechSynthesis')&&!src.includes('SpeechSynthesisUtterance'),'No browser voice can override an MP3');
const catalog=JSON.parse(fs.readFileSync('guide/pool-audio-map.json'));assert.ok(catalog.topics.every(t=>!t.deviceSpeech));
const runtime=JSON.parse(fs.readFileSync('guide/recorded-audio.json'));assert.ok(runtime.records.every(r=>r.topic.audio&&!r.topic.deviceSpeech));
console.log('Guide starts with autoplay off; Get Started starts on; browser-voice fallback is absent.');
