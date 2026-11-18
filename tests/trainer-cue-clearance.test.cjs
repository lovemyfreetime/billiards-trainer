const assert=require('node:assert/strict'),c=require('../trainer-cue-clearance'),cue=require('../trainer-cue3d');
const f={L:2.54,W:1.27,R:.028575},g=c.geometry(f);
function data(x,y,dx=0,dy=1,follow=0,side=0,elevation=3){const a=elevation*Math.PI/180,r=Math.sqrt(1-follow*follow-side*side);return {id:0,x,y,z:f.R,R:f.R,dx,dy,rear:-r*Math.cos(a)+follow*Math.sin(a),height:r*Math.sin(a)+follow*Math.cos(a),sideR:side,elevation};}
assert.deepEqual(c.ALLOWANCE,{cushion:.009,pocket:.0045,wood:0,slate:0});
const open=c.solve(data(.65,.635),f,{speed:1.5,hold:2});assert.equal(open.elevation,3);assert(!open.blocked);
let previous=3;for(const distance of [.24,.12,.08,.04]){const input=data(.65,distance),solved=c.solve(input,f,{speed:1.5,hold:2});assert(!solved.blocked);assert(solved.elevation>previous);assert.equal(c.obstruction(solved,g,solved.stroke.backstroke),null);assert.equal(c.obstruction(solved,g,solved.stroke.backstroke,solved.stroke.followThrough),null);assert.deepEqual(c.contact(solved),c.contact(input),'Auto elevation preserves the physical target exactly');assert(Math.hypot(solved.localFollowR,solved.localSideR)<=.5+1e-8);previous=solved.elevation;}
const low=c.solve(data(.65,.04,0,1,-.5),f,{speed:1.5,hold:2});assert(low.blocked,'Inaccessible draw point is not silently moved');
const ordinary=c.solve(data(.65,.08),f,{speed:1.5,hold:2}),pocket=c.solve(data(1.27,.08),f,{speed:1.5,hold:2});assert(pocket.elevation<ordinary.elevation,'Actual side-pocket opening allows a lower cue than the adjacent rail');
const hard=c.obstruction(data(.65,.24),g,.13);assert.equal(hard.material,'wood','Wood behind the cushion is a separate hard limit');
// A slope, not a flat rail-height approximation: at the cushion nose a lower
// top segment permits the cue beneath the backing height, with the chosen give.
const r=g.plan.rails[0],nose=r.at(0,0,g.plan.noseHeight);assert(g.plan.profile[0][1]<g.plan.capHeight);assert(g.plan.profile[4][1]===g.plan.capHeight);assert.equal(c.geometry(f).plan.profile,g.plan.profile);
const count=c.diagnostics().solves;for(let i=0;i<100;i++)assert.equal(c.solve(data(.65,.08),f,{speed:1.5,hold:2}),ordinary);assert.equal(c.diagnostics().solves,count,'Static shots do not rerun the solver');
const slight=c.solve(data(.65,.0801),f,{speed:1.5,hold:2});assert(Math.abs(slight.elevation-ordinary.elevation)<.1,'Tiny position changes do not switch material modes or jump angles');
const steep=c.solve(data(1.27,.635,1,0,0,0,28),f,{speed:1.5,hold:2});assert(steep.stroke.followThrough<open.stroke.followThrough,'Steeper strokes stop before hitting the slate');assert.equal(c.obstruction(steep,g,steep.stroke.backstroke,steep.stroke.followThrough),null);
const short=c.solve(data(.65,.635),f,{speed:1.5,style:'short',hold:2}),long=c.solve(data(.65,.635),f,{speed:1.5,style:'long',hold:2});assert(short.stroke.backstroke<long.stroke.backstroke);assert(short.stroke.followThrough<long.stroke.followThrough);assert.deepEqual(c.contact(short),c.contact(long));assert.equal(short.elevation,long.elevation);
assert.equal(cue.pose(open,1).phase,'finish');assert(cue.pose(open,1).visible);assert.equal(cue.pose(open,2.1).phase,'finish');assert(!cue.pose(open,2.5).visible);
const frames=[0,.1,.2,.3,.4,.5,.6,.7,.8].map(t=>[{id:0,x:open.x,y:open.y+(t<.4?t:.8-t),z:f.R,t,active:true}]);const retreat=c.planFinish(open,frames);assert(retreat.returnClearance);assert(retreat.hideAt<retreat.conflictAt);assert(retreat.withdrawAt<open.stroke.withdrawAt);const quiet=c.planFinish(open,frames.slice(0,4));assert(!quiet.returnClearance);assert.equal(quiet.withdrawAt,open.stroke.withdrawAt);
const p=cue.pose(ordinary),target=[ordinary.x,ordinary.z,0];assert.equal(c.depression(target,p,'wood'),0);assert.equal(c.depression(target,p,'slate'),0);assert(c.depression([100,.04,100],p,'cushion')===0);
// A second ball approaching from the side also cancels the held finish.
const other=[0,.1,.2,.3,.4,.5].map(t=>[{id:0,x:open.x,y:open.y+t,z:f.R,t,active:true},{id:1,x:open.x+.3-t*.6,y:open.y-.05,z:f.R,t,active:true}]);assert(c.planFinish(open,other).returnClearance);
console.log('Actual rail/pocket geometry, hard wood/slate, material caps, fixed tip target, cached stability, stroke limits, 2-second finish and swept returning-ball clearance passed.');
