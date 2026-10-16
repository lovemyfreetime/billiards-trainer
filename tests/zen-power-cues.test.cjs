const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function extract(source,name){const a=source.indexOf('function '+name+'('),begin=source.indexOf('{',a);assert(a>=0,name);let d=0;for(let i=begin;i<source.length;i++){if(source[i]==='{')d++;if(source[i]==='}'&&--d===0)return source.slice(a,i+1);}throw Error(name);}
const zen=fs.readFileSync('zen-mode.js','utf8'),html=fs.readFileSync('index.html','utf8');
const c={Math,S:{speed:.25},clamp:(v,a,b)=>Math.max(a,Math.min(b,v))};vm.createContext(c);
vm.runInContext(extract(zen,'zenSpeedReferenceStrength')+extract(zen,'zenCenterStrength')+extract(zen,'zenOverlapStrength')+extract(zen,'setZenThumbGlow')+extract(html,'zenPathPower')+extract(html,'zenPathGlow'),c);
assert.equal(c.zenCenterStrength(0,-1,1),1);assert.equal(c.zenCenterStrength(-1,-1,1),0);assert.equal(c.zenCenterStrength(1,-1,1),0);assert.equal(c.zenCenterStrength(-.4,-1,1),c.zenCenterStrength(.4,-1,1));
const refs=[.2,.5,.8],strength=x=>c.zenSpeedReferenceStrength(x,0,1,refs);
for(const ref of refs){assert.equal(strength(ref),1);assert(strength(ref-.01)<strength(ref-.005));assert(Math.abs(strength(ref-.01)-strength(ref+.01))<1e-12);assert.equal(strength(ref+.03),0);}
assert.equal(c.zenSpeedReferenceStrength(.5,0,1,[]),0,'No fabricated references when calibration is unavailable');
let analysis=null;c.shotPowerState=(which,includeFeel)=>{assert.equal(which,1);assert.equal(includeFeel,false,'Skip expensive lag descriptions on live aiming');return analysis;};
assert.equal(c.zenPathPower().cue,0);c.S.speed=6;assert.equal(c.zenPathPower().cue,1);assert.equal(c.zenPathPower().object,0);
analysis={currentCueImpact:1,requiredCueImpact:1,currentPocketArrival:.3,pocketResidualTarget:.2};let power=c.zenPathPower();assert.equal(power.cue,.5);assert(Math.abs(power.object-.75)<1e-12);
analysis.currentCueImpact=10;analysis.currentPocketArrival=0;power=c.zenPathPower();assert.equal(power.cue,1);assert.equal(power.object,0,'C and P intensities remain independent');
console.log('Zen power cues: exact symmetric zero cue, calibrated reference peaks and falloff, C/P meter normalization, bounded independent path intensities, and lightweight live analysis pass.');

for(const [overlap,strength]of [[null,0],[0,0],[25,.25],[50,.5],[100,1],[120,1]])assert.equal(c.zenOverlapStrength(overlap),strength);
const properties={};const thumb={style:{setProperty:(key,value)=>properties[key]=value}};c.setZenThumbGlow(thumb,1);assert.equal(properties['--zen-thumb-tint'],'rgba(208,184,145,0.8)');assert.equal(properties['--zen-thumb-halo'],'rgba(208,184,145,0.2)');c.setZenThumbGlow(thumb,0);assert.equal(properties['--zen-thumb-tint'],'rgba(208,184,145,0)');assert.equal(properties['--zen-thumb-halo'],'rgba(208,184,145,0)');
assert(!zen.includes('data-kind=follow],[data-kind=spin])::before'),'Fixed center markers are removed');
console.log('Warm thumb glow: full overlap peaks, missed balls extinguish, partial hits scale continuously, and every cue uses the ring color without fixed center marks.');
let previewEvent=null;c.document={body:{classList:{contains:()=>true}}};c.window={dispatchEvent:event=>previewEvent=event};c.CustomEvent=class{constructor(type,options){this.type=type;this.detail=options.detail;}};vm.runInContext(extract(html,'publishZenAimFeedback'),c);c.S.preview={firstBallContact:{overlap:87.5}};c.publishZenAimFeedback();assert.equal(previewEvent.detail.overlap,87.5);c.S.preview={firstBallContact:null};c.publishZenAimFeedback();assert.equal(previewEvent.detail.overlap,0,'Missing contact immediately extinguishes aim feedback');

for(const channel of ['cue','object']){let previous=-1;for(let speed=.25;speed<=6;speed+=.25){c.S.speed=speed;const glow=c.zenPathGlow(c.zenPathPower(),channel);assert(glow>=previous,'Glow keeps growing even when C/P meters saturate');assert(glow>=0&&glow<=1);previous=glow;}c.S.speed=.25;assert.equal(c.zenPathGlow(c.zenPathPower(),channel),0);}
c.S.speed=6;analysis.currentCueImpact=2;analysis.currentPocketArrival=.4;assert.equal(c.zenPathGlow(c.zenPathPower(),'cue'),1);assert.equal(c.zenPathGlow(c.zenPathPower(),'object'),1);
console.log('Path halo: speed controls the full brightness range, C/P remain independent, and maximum power reaches a full glow without early saturation.');
