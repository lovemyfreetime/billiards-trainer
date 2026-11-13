const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('trainer-3d.js','utf8'),c={};vm.createContext(c);
vm.runInContext(source.slice(source.indexOf(' function updateCueFollow('),source.indexOf(' function disable(')),c);
const frame=(angle,t=0)=>({L:2.54,W:1.27,R:.028575,animating:true,balls:[{id:0,x:.9,y:.6,z:.028575,active:true,vx:Math.cos(angle),vy:Math.sin(angle),t}],aim:{cue:{x:.9,y:.6},target:{x:1.9,y:.6}}});
for(const side of ['behind','front','left','right'])for(let angle=-Math.PI;angle<=Math.PI;angle+=.1){
 const state={followSide:side};const f=frame(angle);assert(c.updateCueFollow(state,f));
 const x=Math.sin(state.azimuth),y=Math.cos(state.azimuth),forward=x*Math.cos(angle)+y*Math.sin(angle),left=x*Math.sin(angle)-y*Math.cos(angle);
 if(side==='behind')assert(forward<-.999);if(side==='front')assert(forward>.999);if(side==='left')assert(left>.999);if(side==='right')assert(left<-.999);
 assert(Math.abs(state.target.x-(f.balls[0].x-f.L/2))<1e-12);assert(Math.abs(state.target.z-(f.balls[0].y-f.W/2))<1e-12);
}
const state={followSide:'behind'};c.updateCueFollow(state,frame(0));c.updateCueFollow(state,frame(Math.PI,.01));assert(state.followHeading>0&&state.followHeading<Math.PI,'Rail rebound turns smoothly');
for(let t=.02;t<.5;t+=.01)c.updateCueFollow(state,frame(Math.PI,t));assert(Math.abs(state.followHeading-Math.PI)<.002);
const frozen=JSON.stringify(state);c.updateCueFollow(state,frame(Math.PI,state.followTime));assert.equal(JSON.stringify(state),frozen,'Repeated paused renders do not drift');
const stopped=frame(0,.7);stopped.balls[0].vx=stopped.balls[0].vy=0;c.updateCueFollow(state,stopped);assert.equal(state.followHeading,JSON.parse(frozen).followHeading,'At rest holds the last direction');
c.updateCueFollow(state,frame(0,0));assert.equal(state.followHeading,0,'Replay starts with the initial direction');
const seek=frame(-1,.1);c.updateCueFollow(state,seek);c.updateCueFollow(state,frame(.7,.05));assert.equal(state.followHeading,.7,'Backward step reorients to the sampled direction');
const jump=frame(0,1);jump.balls[0].z=.2;c.updateCueFollow(state,jump);assert.equal(state.target.y,.2,'Follow stays with airborne cue ball');
jump.balls[0].active=false;const before=JSON.stringify(state);assert.equal(c.updateCueFollow(state,jump),false);assert.equal(JSON.stringify(state),before,'Scratch holds final camera position');
const ready=frame(0);ready.animating=false;ready.aim.target={x:.9,y:1};const setup={followSide:'behind'};c.updateCueFollow(setup,ready);assert(Math.abs(setup.followHeading-Math.PI/2)<1e-10);
console.log('Four relative follow sides, heading turns, paused stability, rest, replay, backward seek, jump and scratch passed.');
