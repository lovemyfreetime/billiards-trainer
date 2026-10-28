const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),src=fs.readFileSync('index.html','utf8'),start=src.indexOf('    function assessBankKickShot('),end=src.indexOf('\n    function',start+10),ctx={S:{ballR:.028575},nearestLogicalPocket:()=>null,clamp:(v,a,b)=>Math.max(a,Math.min(b,v))};vm.createContext(ctx);vm.runInContext(src.slice(start,end),ctx);
const t={mode:'kick',ballId:0,rails:['bottom','right'],zero:{x:.925,y:.5}},p={firstBallContact:null,railEvents:[{id:0,rail:'bottom rail',t:1},{id:0,rail:'right rail',t:2},{id:0,rail:'top rail',t:4}],pocketEvents:[],paths:{0:[{x:.925,y:.5,t:0},{x:1.5,y:.9,t:1},{x:1.9,y:.8,t:2},{x:.6,y:.4,t:3},{x:.1,y:.1,t:4}]}};
assert(ctx.assessBankKickShot(t,p,0)?.reached,'Location kick needs no object collision');
assert.equal(ctx.assessBankKickShot(t,{...p,firstBallContact:{objId:1,t:2.5}},0),null,'Other balls cannot be ignored in a location kick');
assert.equal(ctx.assessBankKickShot({...t,rails:['right','bottom']},p,0),null);
assert.equal(ctx.assessBankKickShot({...t,zero:{x:.8,y:.9}},p,0)?.reached,false,'Passing target before the selected rails is not a completed route');
assert.equal(ctx.assessBankKickShot({...t,ballId:1},p,0),null,'Object-ball kicks still require real collision');
assert(ctx.assessBankKickShot(t,{...p,pocketEvents:[{id:0,t:5}]},0)?.scratch,'Cue-ball scratches remain identified');
console.log('Cue-only route acceptance checks destination after ordered rails, rejects object collisions, preserves object-kick requirements and detects scratches.');
