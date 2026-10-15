const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('guide/guide.js','utf8');function source(name){const a=src.indexOf(' function '+name+'(');return src.slice(a,src.indexOf('\n function ',a+10));}
const topics=[{id:'welcome-guide',category:'fundamentals',categoryWelcome:true,guideWelcome:true},{id:'welcome-fundamentals',category:'fundamentals',categoryWelcome:true},{id:'first',category:'fundamentals',level:0}],state={category:'more',level:0,enabled:false,autoplay:true,topicId:'old',position:12,detailsOpen:true},calls=[];
const env={state,topics,sequenceIndex:2,setEnabled(v){state.enabled=v},choose(id){state.topicId=id;calls.push(id)},play(){calls.push('play')},openCategory(){throw Error('Unexpected fallback')},selected(){return topics.find(t=>t.id===state.topicId)},save(){},render(){},playback:{pause(){}}};
vm.createContext(env);vm.runInContext(source('openGuide')+source('availableLessons')+source('advanceLesson'),env);
env.openGuide();assert.equal(state.autoplay,true);assert.equal(state.position,0);assert.equal(env.sequenceIndex,0);assert.equal(state.detailsOpen,false);assert.deepEqual(calls,['welcome-guide','play']);
assert.deepEqual(Array.from(env.availableLessons(),t=>t.id),['first']);
state.autoplay=true;env.advanceLesson();assert.equal(state.topicId,'first','Auto starts selected category after welcome');env.advanceLesson();assert.equal(state.topicId,'first','End does not loop');
env.openGuide();assert.equal(state.topicId,'welcome-guide');assert.equal(state.autoplay,true);
const records=JSON.parse(fs.readFileSync('guide/recorded-audio.json')).records;const welcome=records.find(r=>r.topic.guideWelcome);assert.equal(welcome.page,'Shared');assert.ok(fs.statSync(welcome.topic.audio.split("?")[0]).size>1000);assert.ok(!welcome.topic.resourceUrl);
console.log('Guide welcome opens/reopens at zero, stays out of lessons, defaults Auto on, and Auto advances into category.');
