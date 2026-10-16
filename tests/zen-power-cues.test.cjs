const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function extract(source,name){const a=source.indexOf('function '+name+'('),begin=source.indexOf('{',a);assert(a>=0,name);let d=0;for(let i=begin;i<source.length;i++){if(source[i]==='{')d++;if(source[i]==='}'&&--d===0)return source.slice(a,i+1);}throw Error(name);}
const zen=fs.readFileSync('zen-mode.js','utf8'),html=fs.readFileSync('index.html','utf8');
const c={Math,S:{speed:.25},clamp:(v,a,b)=>Math.max(a,Math.min(b,v))};vm.createContext(c);
vm.runInContext(extract(zen,'zenSpeedReferenceStrength')+extract(zen,'zenCenterStrength')+extract(html,'zenPathPower'),c);
assert.equal(c.zenCenterStrength(0,-1,1),1);assert.equal(c.zenCenterStrength(-1,-1,1),0);assert.equal(c.zenCenterStrength(1,-1,1),0);assert.equal(c.zenCenterStrength(-.4,-1,1),c.zenCenterStrength(.4,-1,1));
const refs=[.2,.5,.8],strength=x=>c.zenSpeedReferenceStrength(x,0,1,refs);
for(const ref of refs){assert.equal(strength(ref),1);assert(strength(ref-.01)<strength(ref-.005));assert(Math.abs(strength(ref-.01)-strength(ref+.01))<1e-12);assert.equal(strength(ref+.03),0);}
assert.equal(c.zenSpeedReferenceStrength(.5,0,1,[]),0,'No fabricated references when calibration is unavailable');
let analysis=null;c.shotPowerState=(which,includeFeel)=>{assert.equal(which,1);assert.equal(includeFeel,false,'Skip expensive lag descriptions on live aiming');return analysis;};
assert.equal(c.zenPathPower().cue,0);c.S.speed=6;assert.equal(c.zenPathPower().cue,1);assert.equal(c.zenPathPower().object,0);
analysis={currentCueImpact:1,requiredCueImpact:1,currentPocketArrival:.3,pocketResidualTarget:.2};let power=c.zenPathPower();assert.equal(power.cue,.5);assert(Math.abs(power.object-.75)<1e-12);
analysis.currentCueImpact=10;analysis.currentPocketArrival=0;power=c.zenPathPower();assert.equal(power.cue,1);assert.equal(power.object,0,'C and P intensities remain independent');
console.log('Zen power cues: exact symmetric zero cue, calibrated reference peaks and falloff, C/P meter normalization, bounded independent path intensities, and lightweight live analysis pass.');
