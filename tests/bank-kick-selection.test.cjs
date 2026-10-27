const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('index.html','utf8'),start=src.indexOf('    function bankKickPick('),end=src.indexOf('\n    function ',start+5);
let state;const ctx={S:{ballR:.028575,tableL:2.032,tableW:1.016,balls:[{id:1,x:1.3,y:.65,active:true}]},bankKickState:()=>state,nearestRailToPoint:q=>q.rail?{name:q.rail}:null,nearestLogicalPocket:q=>q.pocket?{x:0,y:0}:null,toast(){},syncBankKickControls(){},draw(){},saveState(){},clamp:(v,a,b)=>Math.max(a,Math.min(b,v))};vm.createContext(ctx);vm.runInContext(src.slice(start,end),ctx);
function tap(q){ctx.q=q;return vm.runInContext('bankKickPick(q)',ctx);}
for(let n=1;n<=4;n++){
 state={mode:'bank',phase:'zero',rails:[],zero:null,ballId:null};tap({x:0,y:0,pocket:true});assert.equal(state.phase,'rail');
 const rails=['bottom','right','top','left'].slice(0,n);for(const rail of rails)tap({x:0,y:0,rail});
 assert.deepEqual(Array.from(state.rails),rails);tap({x:1.3,y:.65});assert.equal(state.ballId,1);assert.equal(state.phase,null);
}
state={mode:'kick',phase:'kickStart',rails:[],zero:null,ballId:null};tap({x:0,y:0,rail:'bottom'});tap({x:0,y:0,rail:'right'});tap({x:1.3,y:.65});assert.equal(state.phase,'zeroEnd');tap({x:0,y:0,pocket:true});assert.equal(state.phase,null);assert.equal(state.ballId,1);
state={mode:'kick',phase:'kickStart',rails:[],zero:null,ballId:null};tap({x:0,y:0,pocket:true});assert.equal(state.phase,'rail');tap({x:0,y:0,rail:'bottom'});tap({x:0,y:0,rail:'bottom'});assert.equal(state.rails.length,1);for(const rail of ['right','top','left','bottom'])tap({x:0,y:0,rail});assert.equal(state.rails.length,4);tap({x:1.3,y:.65});assert.equal(state.phase,null);
assert.equal(tap({x:1,y:.5}),false,'Completed tool releases ordinary table gestures');
console.log('Ordered Bank/Kick selection: 1–4 rails, both Kick orders, ball completion, repeated-rail prevention and four-rail limit passed.');
