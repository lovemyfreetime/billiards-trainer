const assert=require('node:assert/strict'),E=require('../photo-ball-evidence');
const ids=Array.from({length:16},(_,i)=>i),scores=Array(16).fill(.002);scores[0]=.82;scores[14]=.09;
let out=E.adjust(scores,{dominantHue:125,colorPixels:.7,hueStrength:.95,color:.7,outerWhite:.1},ids);
assert.equal(out.indexOf(Math.max(...out)),0,'A cloth-colored reflection cannot overpower clear cue evidence');
assert(out[14]<.12,'Heuristics cannot manufacture a stripe prediction from weak evidence');
const pink=Array(16).fill(.001);pink[4]=.78;pink[3]=.08;
out=E.adjust(pink,{dominantHue:345,colorPixels:.75,hueStrength:.98,color:.8,outerWhite:0},ids);
assert.equal(out.indexOf(Math.max(...out)),4,'An alternate pink 4 must retain clear learned identity');
const shiftedOrange=Array(16).fill(.001);shiftedOrange[5]=.42;shiftedOrange[7]=.42;
out=E.adjust(shiftedOrange,{dominantHue:350,colorPixels:.75,hueStrength:.98,color:.8,outerWhite:0,colorMedianVal:.80},ids);
assert(out[5]>out[7],'A bright orange 5 remains ahead of maroon 7 when warm lighting shifts its hue toward red');
const shiftedMaroon=Array(16).fill(.001);shiftedMaroon[5]=.42;shiftedMaroon[7]=.42;
out=E.adjust(shiftedMaroon,{dominantHue:30,colorPixels:.75,hueStrength:.98,color:.8,outerWhite:0,colorMedianVal:.40},ids);
assert(out[7]>out[5],'A dark maroon 7 remains ahead of orange 5 when lighting shifts its hue toward orange');
const absent=E.adjust(Array(16).fill(0),{dominantHue:215,colorPixels:.9,hueStrength:1},ids);
assert(absent.every(v=>v===0),'Color alone cannot fabricate identity certainty');
const bounds=E.tableBounds([{x:200,y:150},{x:800,y:150},{x:800,y:450},{x:200,y:450}],1000,600);
assert(bounds.x<200&&bounds.y<150&&bounds.width<1000&&bounds.height<600);
assert.deepEqual(E.tableBounds([],1000,600),{x:0,y:0,width:1000,height:600});
console.log('Bounded appearance support, cue and alternate-set protection, absent evidence, and table focus bounds passed.');

const fs=require('node:fs'),vm=require('node:vm'),html=fs.readFileSync('index.html','utf8');
const ctx={photoVision:{rackType:'auto'},PV_AI_CLASSES:['14_ball','6_ball'],pvInferRackType:()=>({mode:'9ball',confidence:.84}),pvRackMaxBall:()=>9};
vm.createContext(ctx);
for(const name of ['pvAIClassToBallId','pvApplyRackContext']){
 const at=html.indexOf('    function '+name+'('),tail=html.slice(at),end=tail.slice(10).search(/\n    (?:async )?function /);
 vm.runInContext(tail.slice(0,end+10),ctx);
}
const list=[{aiOrder:[{i:0,v:.9},{i:1,v:.05}]}];
ctx.pvApplyRackContext(list);
assert.equal(list[0].aiOrder[0].v,.9,'An Auto 9-ball guess cannot suppress a visible 14');
ctx.photoVision.rackType='9ball';ctx.pvApplyRackContext(list);
assert.equal(list[0].aiOrder.length,1,'Explicit rack restrictions still apply');
assert.equal(list[0].aiOrder[0].i,1);
console.log('Auto rack hints preserve visible high balls; explicit rack selection still restricts legal identities.');
