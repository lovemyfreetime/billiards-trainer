const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('trainer-3d.js','utf8');
const body=source.slice(source.indexOf(' function ballRoomRadiance('),source.indexOf(' function createEngine('));
const context={};vm.createContext(context);vm.runInContext(body,context);
const radiance=context.ballRoomRadiance;
const direction=(x,y,z)=>{const l=Math.hypot(x,y,z);return [x/l,y/l,z/l];};
assert.deepEqual(Array.from(radiance(...direction(-1.8,3.2,1.2))),[250,247,238]);
assert(radiance(...direction(3,3.2,1.2))[0]<100,'Outside rectangle remains quiet ceiling');
assert(radiance(...direction(-1.8,-3.2,1.2))[0]<30,'No second panel below table');
for(let i=0;i<1000;i++){
 const d=direction(Math.sin(i),Math.cos(i*.7),Math.sin(i*.3));
 assert(radiance(...d).every(v=>Number.isInteger(v)&&v>=0&&v<=255));
 assert.deepEqual(Array.from(radiance(...d)),Array.from(radiance(...d)),'World direction is deterministic');
}
assert(source.includes('roughness:.18,metalness:0,envMapIntensity:1'));
assert(source.includes('scene.environment=room;scene.environmentIntensity=.85'));
assert(source.includes('radiance *= 8.0;'));
assert(source.includes('reflectedLight.directSpecular *= 0.12;'));
assert(radiance(...direction(-4,3.2,1.2))[0]>200, 'Broad panel covers a wide overhead angle');
assert(source.includes('if(cue)group.children[0].quaternion.fromArray(orientation)'),'Cue rotation preserved');
console.log('PASS: filled rectangular panel, dark lower environment, bounded fixed-direction radiance, resin and rotation contracts');
