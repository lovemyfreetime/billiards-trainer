const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('index.html','utf8'),start=source.indexOf('    function bankKickShotCandidates('),end=source.indexOf('    function bankKickSetupNeeded(',start),ctx={};
vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
for(const rails of [1,2,3,4]){
 const candidates=ctx.bankKickShotCandidates(rails),max=rails>=3?6:5;
 assert.equal(Math.max(...candidates.map(c=>c.speed)),max);
 assert(candidates.every(c=>c.speed>0&&c.speed<=max&&Math.abs(c.follow)<=.5&&Math.abs(c.sideSpin)<=.5&&Math.hypot(c.follow,c.sideSpin)<=.5));
 const firstSpin=candidates.findIndex(c=>c.follow||c.sideSpin);
 assert(candidates.slice(0,firstSpin).some(c=>c.speed===max),'Full center-ball speed range precedes English');
 assert(candidates.some(c=>c.follow===.5)&&candidates.some(c=>c.follow===-.5));
 assert(candidates.some(c=>c.sideSpin===.5)&&candidates.some(c=>c.sideSpin===-.5));
 assert(candidates.some(c=>c.follow&&c.sideSpin),'Combined follow/draw and English is searched');
}
console.log('Bank/Kick recommendations: rail-dependent 5/6 m/s limits, center-ball-first search, both signs of 50% tip offsets and moderate combined spin passed.');
