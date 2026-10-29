const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const html=fs.readFileSync('index.html','utf8');
const ctx={PV_AI_CLASSES:Array.from({length:16},(_,i)=>i===0?'Cue-Ball':`${i}_ball`),photoVision:{rackType:'8ball'}};
vm.createContext(ctx);
for(const name of ['pvAIClassToBallId','pvHueDistanceDeg','pvPoolColorFamily','pvManualRackIdentityScore']){
 const at=html.indexOf(`    function ${name}(`),tail=html.slice(at),end=tail.slice(10).search(/\n    (?:async )?function /);
 assert(at>=0&&end>=0,`find ${name} in analyzer`);
 vm.runInContext(tail.slice(0,end+10),ctx);
}
function score(id,hue,colorMedianVal){
 const entry=id=>({i:id,v:.42});
 return ctx.pvManualRackIdentityScore({
  aiOrder:[entry(5),entry(7)],
  appearance:{dominantHue:hue,hueStrength:.98,colorPixels:.75,color:.8,outerWhite:0,colorMedianVal}
 },String(id));
}
assert(score(5,350,.80)>score(7,350,.80),'bright orange shell favors 5 when warm light shifts hue toward maroon');
assert(score(7,30,.40)>score(5,30,.40),'dark maroon shell favors 7 when warm light shifts hue toward orange');
console.log('Manual rack assignment uses median shell brightness to separate orange 5 and maroon 7 under shifted hue.');
