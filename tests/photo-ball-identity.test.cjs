'use strict';
const assert=require('node:assert/strict');
const identity=require('../photo-ball-identity');

function constantForest(classes,counts){return {classes,trees:[{children_left:[-1],children_right:[-1],feature:[-2],threshold:[-2],value:[counts]}]};}
function model(color=[.05,.20,.30,.10,.10,.05,.05,.05,.10],stripe=[.70,.30]){
 return {schema:1,featureVersion:'body-hsv-90-v1',version:'body-hsv-90-v2',cropPadding:.12,mixture:.25,trainingSamples:84,color:constantForest([0,1,2,3,4,5,6,7,8],color),stripe:constantForest([0,1],stripe)};
}
function image(r=100,g=140,b=180){const data=new Uint8ClampedArray(224*224*4);for(let i=0;i<data.length;i+=4){data[i]=r;data[i+1]=g;data[i+2]=b;data[i+3]=255;}return {width:224,height:224,data};}
const ids=Array.from({length:16},(_,i)=>String(i)),input=image();

const features=identity.extract(input);assert.equal(features.length,90);assert(features instanceof Float64Array);assert([...features].every(Number.isFinite));
const neural=Array(16).fill(1),calibrated=identity.calibrate(neural,input,ids,model());
assert(Math.abs(calibrated.scores.reduce((a,b)=>a+b,0)-1)<1e-12,'fused scores form a normalized posterior');
assert(Math.abs(calibrated.visualScores.reduce((a,b)=>a+b,0)-1)<1e-12,'visual identity scores form a normalized posterior');
assert(Math.abs(calibrated.visualScores[0]-.05)<1e-12,'cue ball uses only its family posterior');
assert(Math.abs(calibrated.visualScores[8]-.10)<1e-12,'black ball uses only its family posterior');
assert(Math.abs(calibrated.visualScores[1]-.14)<1e-12,'solid uses family × non-stripe posterior');
assert(Math.abs(calibrated.visualScores[9]-.06)<1e-12,'stripe uses family × stripe posterior');
assert(Math.abs(calibrated.scores[9]-.75/16-.25*.06)<1e-12,'mixture applies 25% visual evidence after neural normalization');
assert(Math.abs(calibrated.colorConfidence-.30)<1e-12);assert(Math.abs(calibrated.patternConfidence-.70)<1e-12);assert.equal(calibrated.modelVersion,'body-hsv-90-v2');

const absent=identity.calibrate(Array(16).fill(0),input,ids,model());
assert.deepEqual(absent.scores,Array(16).fill(0),'absent neural evidence remains all zero');
assert.deepEqual(absent.visualScores,Array(16).fill(0));
assert.throws(()=>identity.extract({width:223,height:224,data:input.data}),/224×224/);
assert.throws(()=>identity.calibrate(neural,input,ids,{schema:2}),/model metadata/);
assert.throws(()=>identity.calibrate(neural,input,ids.slice(0,1),model()),/16 neural scores/);
assert.throws(()=>identity.calibrate(Array(16).fill(-1),input,ids,model()),/nonnegative/);

const boundaryModel=model();boundaryModel.color={classes:[0,1,2,3,4,5,6,7,8],trees:[{
 children_left:[1,-1,-1],children_right:[2,-1,-1],feature:[0,-2,-2],threshold:[Math.fround(.1),-2,-2],
 value:[[0,0,0,0,0,0,0,0,0],[0,5,0,0,0,0,0,0,0],[0,0,5,0,0,0,0,0,0]]
}]};
const atThreshold=new Float64Array(90);atThreshold[0]=.1;
assert.equal(identity.predict(atThreshold,boundaryModel).color.prediction,1,'float32 feature equal to threshold takes <= branch');
atThreshold[0]=.10000001;
assert.equal(identity.predict(atThreshold,boundaryModel).color.prediction,2,'float32 feature above threshold takes right branch');

const neuralCue=Array(16).fill(.001);neuralCue[0]=.9;
const contradictCue=model([.01,.01,.01,.01,.01,.01,.01,.01,.92],[.5,.5]);
const retainedCue=identity.calibrate(neuralCue,image(255,255,255),ids,contradictCue);
assert.deepEqual(retainedCue.scores,neuralCue.map(x=>x/neuralCue.reduce((a,b)=>a+b,0)),'strong neutral cue evidence preserves its normalized neural distribution');
const colored=identity.calibrate(neuralCue,image(20,60,230),ids,contradictCue);
assert.notDeepEqual(colored.scores,neuralCue.map(x=>x/neuralCue.reduce((a,b)=>a+b,0)),'saturated colored crop does not invoke the cue safeguard');
const stripePixels=new Uint8ClampedArray(224*224*4);
for(let y=0;y<224;y++)for(let x=0;x<224;x++){const i=(y*224+x)*4,isWhite=y>=80&&y<140;stripePixels[i]=isWhite?245:20;stripePixels[i+1]=isWhite?245:60;stripePixels[i+2]=isWhite?245:230;stripePixels[i+3]=255;}
const striped=identity.calibrate(neuralCue,{width:224,height:224,data:stripePixels},ids,contradictCue);
assert.notDeepEqual(striped.scores,neuralCue.map(x=>x/neuralCue.reduce((a,b)=>a+b,0)),'white stripe face on a colored body does not invoke the cue safeguard');
console.log('Ball identity feature extraction, posterior mapping, normalization, zero evidence, input validation, model mixture, and float32 tree boundaries passed.');

// The actual app pipeline always applies Enhanced, even with an old mode value.
(async()=>{
 const fs=require('node:fs'),vm=require('node:vm'),html=fs.readFileSync('index.html','utf8');
 const start=html.indexOf('    async function pvRunAIClassifierRotationEnsemble('),end=html.indexOf('    async function pvDetectWithAI()',start);
 let checked=0;
 const env={photoVision:{identityMode:'neural',lightingMode:'original'},PV_AI_CLASSES:['1_ball','2_ball'],console,
  pvRotateCanvasQuarter:c=>c,pvAnalyzeBallAppearance:()=>({}),pvAIClassToBallId:i=>String(i+1),
  pvRunAIClassifier:async()=>({top:{i:0},combined:[.8,.2],adjusted:[.8,.2],probs:[.8,.2]}),
  window:{BilliardsBallIdentity:{calibrate(){checked++;return {scores:[.1,.9]};}}}};
 vm.createContext(env);vm.runInContext(html.slice(start,end),env);
 const result=await env.pvRunAIClassifierRotationEnsemble({width:224,height:224,getContext:()=>({getImageData:()=>image()})},[]);
 assert.equal(checked,1);assert.equal(result.top.i,1);assert.deepEqual(Array.from(result.adjusted),[.1,.9]);
 console.log('Enhanced recognition is unconditional in the app pipeline; an old mode value cannot bypass it.');
})().catch(error=>{console.error(error);process.exitCode=1;});
