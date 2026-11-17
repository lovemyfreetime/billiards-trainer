const assert=require('node:assert/strict'),cue=require('../trainer-cue3d');
assert.equal(cue.LENGTH,1.4731999999999998);assert(Math.abs(cue.LENGTH/.05715-58/2.25)<1e-10);
function data(elevation,side=0,follow=0,angle=.7){const a=elevation*Math.PI/180,r=Math.sqrt(1-side*side-follow*follow);return{id:0,x:.8,y:.5,z:.028575,R:.028575,dx:Math.cos(angle),dy:Math.sin(angle),rear:-r*Math.cos(a)+follow*Math.sin(a),height:r*Math.sin(a)+follow*Math.cos(a),sideR:side,elevation};}
for(const elevation of [0,3,15,35,70])for(const [side,follow]of [[0,0],[.5,-.3],[-.4,.4]]){
 const d=data(elevation,side,follow),p=cue.pose(d,0);assert(Math.abs(Math.hypot(p.contact[0]-d.x,p.contact[1]-d.z,p.contact[2]-d.y)-d.R)<1e-10,'Contact sits on cue-ball sphere');assert.deepEqual(p.tip,p.contact);assert(Math.abs(p.back[1]-Math.sin(elevation*Math.PI/180))<1e-10);assert(Math.abs(Math.hypot(...p.back)-1)<1e-10);
}
const d=data(3),address=cue.pose(d),back=cue.pose(d,-.30),forward=cue.pose(d,-.10),impact=cue.pose(d,0);
assert.equal(address.gap,.008);assert.equal(back.gap,.13);assert(forward.gap<back.gap&&forward.gap>0);assert(Math.abs(impact.gap)<1e-12);assert.equal(cue.pose(d,.7).visible,false);
const ball={x:d.x+d.dx*.001,y:d.y+d.dy*.001,z:d.R,active:true},soft=cue.pose(d,.05,ball);assert(Math.hypot(soft.tip[0]-ball.x,soft.tip[1]-ball.z,soft.tip[2]-ball.y)>=d.R-1e-8,'Follow-through does not pass through a slow-moving ball');
const low=cue.playerCamera(d,{height:.12}),raised=cue.playerCamera(d,{height:.28});assert(Math.abs(raised.eye[1]-low.eye[1]-.16)<1e-10);assert.deepEqual(low.eye.filter((_,i)=>i!==1),raised.eye.filter((_,i)=>i!==1));assert.equal(d.elevation,3);assert(raised.elevation>low.elevation);
for(const finish of ['blackSilver','carbon','wood']){assert(cue.setFinish(finish));assert.equal(cue.getFinish(),finish);}assert.equal(cue.setFinish('other'),false);
console.log('58-inch scale, exact spin/elevation contacts, full backstroke-to-impact, soft-shot clearance, three finishes and independent player-eye height passed.');

let clock=-cue.PRE_ROLL,frames=0;while(clock<0){clock=cue.advanceTime(clock,2,1,10);frames++;}assert.equal(clock,0);assert(frames>=14);assert.equal(cue.advanceTime(0,2,1,10),.05);assert.equal(cue.advanceTime(.5,2,1,10),2.5);
