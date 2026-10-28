const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),src=fs.readFileSync('index.html','utf8'),start=src.indexOf('    function assessBankKickShot('),end=src.indexOf('\n    function',start+10),ctx={S:{ballR:.028575},bankKickTargetsContact:()=>false,nearestLogicalPocket:()=>null,clamp:(v,a,b)=>Math.max(a,Math.min(b,v))};vm.createContext(ctx);vm.runInContext(src.slice(start,end),ctx);
const t={mode:'kick',ballId:0,rails:['bottom','right'],zero:{x:.925,y:.5}},p={firstBallContact:null,railEvents:[{id:0,rail:'bottom rail',t:1},{id:0,rail:'right rail',t:2},{id:0,rail:'top rail',t:4}],pocketEvents:[],paths:{0:[{x:.925,y:.5,t:0},{x:1.5,y:.9,t:1},{x:1.9,y:.8,t:2},{x:.6,y:.4,t:3},{x:.1,y:.1,t:4}]}};
assert(ctx.assessBankKickShot(t,p,0)?.reached,'Location kick needs no object collision');
assert.equal(ctx.assessBankKickShot(t,{...p,firstBallContact:{objId:1,t:2.5}},0),null,'Other balls cannot be ignored in a location kick');
assert.equal(ctx.assessBankKickShot({...t,rails:['right','bottom']},p,0),null);
assert.equal(ctx.assessBankKickShot({...t,zero:{x:.8,y:.9}},p,0)?.reached,false,'Passing target before the selected rails is not a completed route');
assert.equal(ctx.assessBankKickShot({...t,ballId:1},p,0),null,'Object-ball kicks still require real collision');
assert(ctx.assessBankKickShot(t,{...p,pocketEvents:[{id:0,t:5}]},0)?.scratch,'Cue-ball scratches remain identified');
console.log('Cue-only route acceptance checks destination after ordered rails, rejects object collisions, preserves object-kick requirements and detects scratches.');

const helperStart=src.indexOf('    function bankKickTargetsContact('),helperEnd=src.indexOf('\n    function',helperStart+10);vm.runInContext(src.slice(helperStart,helperEnd),ctx);ctx.S.balls=[{id:0,x:1.5,y:.5,active:true},{id:1,x:.925,y:.5,active:true}];
const contactPlan={...t,ballId:1},contactPreview={...p,firstBallContact:{objId:1,t:2.8,overlap:80,cuePos:{x:.98,y:.5}}};assert(ctx.bankKickTargetsContact(contactPlan));assert(ctx.assessBankKickShot(contactPlan,contactPreview,0)?.reached,'Targeting the object ball means make contact, not move it back to its starting point');assert.equal(ctx.bankKickTargetsContact({...contactPlan,zero:{x:0,y:0}}),false,'A separate destination retains the existing object-ball route');assert.equal(ctx.bankKickTargetsContact({...contactPlan,mode:'bank'}),false);assert.equal(ctx.assessBankKickShot(contactPlan,{...contactPreview,firstBallContact:{objId:2,t:2.8}},0),null);
console.log('Kick endpoint on an object ball requires contact after the rails; a separate destination and Bank retain their existing goals.');

ctx.nearestLogicalPocket=()=>({x:0,y:0});assert.equal(ctx.bankKickTargetsContact(contactPlan),false,'An explicit pocket destination retains pocketing semantics even near a ball');
