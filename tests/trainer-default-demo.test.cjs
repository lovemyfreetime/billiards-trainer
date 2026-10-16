const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
function extract(name){const a=html.indexOf('function '+name+'('),begin=html.indexOf('{',a);assert(a>=0,name);let d=0;for(let i=begin;i<html.length;i++){if(html[i]==='{')d++;if(html[i]==='}'&&--d===0)return html.slice(a,i+1);}throw Error(name);}
const c={Math,Map,Set,console};vm.createContext(c);
vm.runInContext(html.slice(html.indexOf('    const APK ='),html.indexOf('    const ORIGINAL_TABLE_ASSET =')),c);
for(const name of ['trainerDemoLayout','defaultState','simulate'])vm.runInContext(extract(name),c);
vm.runInContext('var S=defaultState()',c);
let prediction;
for(let attempt=0;attempt<80;attempt++){
 try{prediction=c.simulate(false);break;}catch(error){const match=/^(\w+) is not defined$/.exec(error.message);if(!match)throw error;vm.runInContext(extract(match[1]),c);}
}
assert(prediction,'Physics dependency loading completed');
assert(prediction.pocketEvents.some(p=>p.id===1&&p.x>c.S.tableL*.9&&p.y>c.S.tableW*.9),'Demo pockets the 1-ball in pocket 4');
assert(prediction.finalBalls.some(b=>b.id===2&&b.active),'2-ball remains on the table');
assert.equal(c.S.balls[0].y,c.S.tableW*.5);assert.equal(c.S.balls[1].y,c.S.tableW*.5);assert.equal(c.S.balls[2].x,c.S.tableL*.75);assert.equal(c.S.balls[2].y,c.S.tableW*.25);
assert(html.includes("isZenPage?'billiardTrainerZenState':'billiardTrainerState'"));assert(html.includes("isZenPage?'billiardTrainerZenProgress':'billiardTrainerProgress'"));
console.log('Trainer default: aligned cue/1, ready pocket-4 shot, 2-ball at foot-string/upper-diamond intersection, and separate Zen persistence pass.');

for(const [length,width]of [[78,39],[80,40],[88,44],[100,50]]){c.S=c.defaultState();c.S.tableL=length*.0254;c.S.tableW=width*.0254;Object.assign(c.S,c.trainerDemoLayout(c.S.tableL,c.S.tableW,c.S.ballR));const p=c.simulate(false);assert(p.pocketEvents.some(e=>e.id===1&&e.x>c.S.tableL*.9&&e.y>c.S.tableW*.9),'Pocket 4 demo works at '+length+' inches');assert(p.finalBalls.some(b=>b.id===2&&b.active));}
const stored=new Map();c.localStorage={setItem:(key,value)=>stored.set(key,value)};c.STATE_STORE_KEY='billiardTrainerState';c.PROGRESS_STORE_KEY='billiardTrainerProgress';c.runHistory=[{balls:c.S.balls}];c.lastSavedHistory=null;c.lastSavedHistoryLength=0;c.lastSavedHistoryEnd=null;c.scheduleSessionFolder=()=>{};vm.runInContext(extract('saveState'),c);c.saveState();const trainerState=stored.get('billiardTrainerState'),trainerProgress=stored.get('billiardTrainerProgress');c.STATE_STORE_KEY='billiardTrainerZenState';c.PROGRESS_STORE_KEY='billiardTrainerZenProgress';c.S={balls:[],allowMissingCueBall:true};c.runHistory=[{balls:[]}];c.saveState();assert.equal(stored.get('billiardTrainerState'),trainerState);assert.equal(stored.get('billiardTrainerProgress'),trainerProgress);assert.equal(JSON.parse(stored.get('billiardTrainerZenState')).balls.length,0);
console.log('Zen saves leave both trainer state and trainer shot history untouched.');
