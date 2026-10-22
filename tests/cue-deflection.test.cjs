const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('index.html','utf8'),env={Math,Number,Object};
function extract(name){const start=source.indexOf('    function '+name+'('),brace=source.indexOf('{',start);assert(start>=0,name);let depth=0;for(let i=brace;i<source.length;i++){if(source[i]==='{')depth++;else if(source[i]==='}'&&!--depth)return source.slice(start,i+1);}throw Error(name);}
vm.createContext(env);
vm.runInContext(source.slice(source.indexOf('    const APK ='),source.indexOf('    const ORIGINAL_TABLE_ASSET =')),env);
for(const name of ['clamp','currentCuePreset','effectiveTipOffsetValues','cueSquirtAngleFor'])vm.runInContext(extract(name),env);
const degrees=(side,follow,ratio)=>env.cueSquirtAngleFor(side,follow,ratio)*180/Math.PI;
const presets=vm.runInContext('CUE_SHAFT_PRESETS',env);
// Preserve the physical equation and its independent reference benchmarks.
assert(Math.abs(Math.abs(degrees(.906,0,20.151))-2.50)<.04);
assert(Math.abs(Math.abs(degrees(.906,0,29.158))-1.80)<.04);
for(const ratio of [8,20.151,presets.standard,presets.low,60]){
 assert.equal(degrees(0,-1,ratio),0);
 let previous=0;
 for(let i=1;i<=100;i++){
  const side=i/100,right=degrees(side,0,ratio),left=degrees(-side,0,ratio);
  assert(right<0&&left>0);assert(Math.abs(right+left)<1e-12);
  assert(Math.abs(right)>previous);previous=Math.abs(right);
 }
}
for(const side of [.1,.25,.44,.5,.75,1])for(const follow of [-1,-.9,0,.9,1]){
 const standard=Math.abs(degrees(side,follow,presets.standard)),low=Math.abs(degrees(side,follow,presets.low));
 assert(low<standard,'Low-deflection stays below Standard');
 assert(standard<Math.abs(degrees(side,follow,20.151)),'Revised Standard reduces initial squirt');
 assert(low<Math.abs(degrees(side,follow,29.158)),'Revised Low also reduces initial squirt');
}
assert(Math.abs(degrees(.44,-.9,presets.standard))<.85);
assert(Math.abs(degrees(.44,-.9,presets.low))<.65);
for(const [initial,preset,ratio]of [
 [{cueEndmassRatio:20.151},'standard',presets.standard],
 [{cuePreset:'standard',cueEndmassRatio:20.151},'standard',presets.standard],
 [{cuePreset:'low',cueEndmassRatio:29.158},'low',presets.low],
 [{cueEndmassRatio:29.158},'low',presets.low],
 [{},'low',presets.low],
 [{cuePreset:'standard'},'standard',presets.standard],
 [{cuePreset:'low'},'low',presets.low],
 [{cuePreset:'custom',cueEndmassRatio:20.151},'custom',20.151],
 [{cuePreset:'custom',cueEndmassRatio:29.158},'custom',29.158],
 [{cuePreset:'custom',cueEndmassRatio:35},'custom',35],
 [{cueEndmassRatio:42},'custom',42]
]){
 env.S={...initial,speed:2.48,follow:-.9,sideSpin:.44,freeAim:{x:1,y:2}};
 assert.equal(env.currentCuePreset(),preset);assert.equal(env.S.cueEndmassRatio,ratio);
 const first=JSON.stringify(env.S);env.currentCuePreset();assert.equal(JSON.stringify(env.S),first,'Migration is idempotent');
 assert.equal(env.S.speed,2.48);assert.equal(env.S.follow,-.9);assert.equal(env.S.sideSpin,.44);assert.deepEqual(env.S.freeAim,{x:1,y:2});
}
console.log('Cue deflection: physical reference benchmarks, sign/symmetry, monotonic offset response, both reduced shaft presets, legacy migration and exact Custom preservation pass.');
