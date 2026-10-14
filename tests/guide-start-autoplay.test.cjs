const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('guide/guide.js','utf8');function source(name){const a=src.indexOf(' function '+name+'(');return src.slice(a,src.indexOf('\n function ',a+10));}
const lessons=[{id:'first',category:'start',level:0,audio:['a']},{id:'last',category:'start',level:2,audio:['b']}],state={category:'start',topicId:'last',level:0,autoplay:false,position:70,enabled:false},calls=[];
const env={state,sequenceIndex:2,topics:lessons,availableLessons:()=>lessons,setEnabled(v){state.enabled=v;calls.push('enabled')},choose(id){state.topicId=id;calls.push(id)},play(){calls.push('play')},audio:{pause(){calls.push('pause')}},playback:{pause(){calls.push('pause')}},save(){},render(){}};vm.createContext(env);vm.runInContext(source('openCategory'),env);vm.runInContext(source('advanceLesson'),env);
env.openCategory('start');assert.equal(state.autoplay,true);assert.equal(state.topicId,'first');assert.equal(env.sequenceIndex,0);assert.deepEqual(calls,['enabled','first','play']);
calls.length=0;env.advanceLesson();assert.equal(state.topicId,'last');assert.deepEqual(calls,['last','play']);
calls.length=0;env.advanceLesson();assert.equal(state.topicId,'last');assert.deepEqual(calls,['pause'],'End of playlist stops, never chooses first or plays again');
env.openCategory('start');assert.equal(state.topicId,'first','Reopening starts at first');
vm.runInContext(source('availableLessons'),env);assert.equal(env.availableLessons().length,2,'Get Started has no level restriction');
const analyze=fs.readFileSync('guide/analyze-integration.js','utf8');const chunks=analyze.split('"id": "analyze-start-').slice(1);assert.equal(chunks.length,7);for(const chunk of chunks){const files=JSON.parse(chunk.match(/"audio": (\[[^\]]+\])/)[1]);assert.ok(files.length);for(const path of files)assert.ok(fs.statSync(path.replace('./','')).size>100);}
console.log('Both Start mounts use first-file autoplay; last lesson stops; Get Started ignores level; all seven Analyze steps have existing MP3 recordings.');
