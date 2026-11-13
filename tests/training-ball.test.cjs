const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M=require('../trainer-training-ball.js'),identity=[0,0,0,1],R=.028575;
const near=(a,b,tol=1e-9)=>assert(Math.abs(a-b)<tol,`${a} != ${b}`);
// A natural roll to table +X rotates the bottom of the displayed sphere to -X.
const q=M.integrate(identity,0,1/R,0,.001),bottom=M.rotate(q,[0,-R,0]);
near(bottom[0],-.001,3e-7);near(Math.hypot(...q),1);
for(const axis of [[1,0,0],[0,1,0],[0,0,1]])for(const sign of [-1,1])assert.deepEqual(M.color('spots',axis.map(v=>v*sign)),[207,34,43]);
assert.deepEqual(M.color('split',[1,0,0]),[207,34,43]);assert.deepEqual(M.color('split',[-1,0,0]),[245,243,233]);
assert.deepEqual(M.color('stripe',[1,0,0]),[20,23,27]);assert.deepEqual(M.color('stripe',[0,1,0]),[245,243,233]);
for(let i=0;i<100;i++){const a=M.axisAngle([1,2,3],i),b=M.axisAngle([-2,1,4],i/3);near(Math.hypot(...M.slerp(a,b,.37)),1);}
const ball={z:R,vx:1,vy:0,wx:0,wy:0,wz:0};
assert.equal(M.motion(ball,R),'Stun · sliding');
assert.equal(M.motion({...ball,wy:1/R},R),'Natural roll');
assert.equal(M.motion({...ball,wy:-1/R},R),'Backspin · sliding');
assert.equal(M.motion({...ball,wz:10},R),'Stun · sliding + side spin');
assert.equal(M.motion({...ball,wy:1/R,wz:10},R),'Natural roll + side spin');
// Run the real fixed-step physics with the orientation module installed.
const html=fs.readFileSync('index.html','utf8');
function extract(name){let a=html.indexOf('    function '+name+'(');if(a<0)a=html.indexOf('    function* '+name+'(');assert(a>=0,name);const begin=html.indexOf('{',html.indexOf(')',a));let depth=0;for(let i=begin;i<html.length;i++){if(html[i]==='{')depth++;if(html[i]==='}'&&--depth===0)return html.slice(a,i+1);}throw Error(name);}
const c={Math,Map,Set,window:{BilliardsTrainingBall:M}};vm.createContext(c);
vm.runInContext(html.slice(html.indexOf('    const APK ='),html.indexOf('    const ORIGINAL_TABLE_ASSET =')),c);
for(const name of ['defaultState','simulate'])vm.runInContext(extract(name),c);
function solve(frames){for(let i=0;i<100;i++)try{return c.simulate(frames);}catch(e){const missing=/^(\w+) is not defined$/.exec(e.message);if(!missing)throw e;vm.runInContext(extract(missing[1]),c);}throw Error('Dependencies unresolved');}
for(const follow of [-.7,0,.7])for(const sideSpin of [0,.5]){
 c.S=c.defaultState();Object.assign(c.S,{speed:.5,follow,sideSpin,cueElevationDeg:0,freeAim:{x:2,y:.635},balls:[{id:0,n:'CB',x:.5,y:.635,active:true,orientation:M.axisAngle([1,1,0],.7)}]});
 const before=JSON.stringify(c.S),preview=solve(false),shot=solve(true);
 assert.deepEqual(shot.finalBalls,preview.finalBalls,'Dense animation cannot change physics');assert.equal(JSON.stringify(c.S),before);
 const frames=shot.frames;assert(frames.length>60);near(frames[0][0].t,0);
 for(let i=1;i<frames.length;i++){near(frames[i][0].t-frames[i-1][0].t,1/600,1e-10);near(Math.hypot(...frames[i][0].orientation),1);}
 const initial=frames[0][0],end=frames.at(-1)[0];
 assert.deepEqual(initial.orientation,c.S.balls[0].orientation);assert.deepEqual(shot.cueOrientation,end.orientation);
 const labels=new Set(frames.map(f=>M.motion(f[0],R)));
 assert([...labels].some(s=>s.startsWith('Natural roll')),'Friction reaches rolling');
 if(follow<0)assert([...labels].some(s=>s.startsWith('Backspin')));
 if(!follow)assert(M.motion(initial,R).startsWith('Stun'));
 const quarter=M.sample(frames,1/240)[0];near(quarter.t,1/240);near(Math.hypot(...quarter.orientation),1);
}
// Tune real arrival spin for stop/cut-stun shots instead of equating center tip to stun.
function contactSetup(offset=0,distance=.6,follow=0){
 c.S=c.defaultState();Object.assign(c.S,{speed:2,follow,sideSpin:0,cueElevationDeg:0,freeAim:{x:2,y:.635},balls:[{id:0,n:'CB',x:.5,y:.635,active:true},{id:1,n:'1',x:.5+distance,y:.635+offset,active:true}]});
}
for(const offset of [0,R]){
 let low=-1,high=0;
 for(let i=0;i<32;i++){const follow=(low+high)/2;contactSetup(offset,.6,follow);const hit=solve(false).firstBallContact;assert(hit);if(hit.motion.slipRatio>1)low=follow;else high=follow;}
 contactSetup(offset,.6,(low+high)/2);const shot=solve(true),hit=shot.firstBallContact;
 near(hit.motion.slipRatio,1,1e-7);
 if(!offset){const end=shot.finalBalls.find(b=>b.id===0);assert(Math.hypot(end.x-hit.cuePos.x,end.y-hit.cuePos.y)<.03,'Straight stun produces the modeled stop shot');}
 else{const after=shot.frames.find(f=>f[0].t>hit.t+1/600)[0];assert(Math.abs(after.vx*hit.normal.x+after.vy*hit.normal.y)/Math.hypot(after.vx,after.vy)<.15,'Cut stun initially follows the tangent, allowing modeled throw/restitution');}
}
contactSetup(0,.15);const short=solve(false).firstBallContact.motion.slipRatio;
contactSetup(0,.9);const long=solve(false).firstBallContact.motion.slipRatio;
assert(short>long+.15,'Center-ball arrival spin changes with travel distance');
const Layout=require('../trainer-layout-files.js'),defaults=c.defaultState();
const saved={...defaults,shot2:{...defaults.shot2,orientation:M.axisAngle([1,2,3],.7)}};
assert.deepEqual(Layout.settings(saved,defaults).shot2.orientation,saved.shot2.orientation,'Shot 2 orientation survives a session load');
// Rendering and recording clocks must sample the same simulated timeline.
let queued=[],recorded=[],commits=0;
const frames=Array.from({length:601},(_,i)=>[{id:0,t:i/600,x:i/600,y:0,z:R,vx:1,vy:0,vz:0,wx:0,wy:0,wz:0,active:true,orientation:identity}]);
const p={window:{BilliardsTrainingBall:M},S:{shotPlaybackSpeed:1},performance:{now:()=>0},requestAnimationFrame:f=>queued.push(f),cancelAnimationFrame:()=>{queued=[];},animation:null,syncHistoryButtons(){},draw(){},cueTipsFor3D:()=>[],commitAnimatedShot(){commits++;p.animation=null;},updateUI(){},saveState(){},refreshPreview(){},cleanSnapshot(){return JSON.parse(JSON.stringify(p.S));}};
vm.createContext(p);vm.runInContext(extract('startShotPlayback'),p);
for(const speed of M.speeds){
 queued=[];recorded=[];p.S.shotPlaybackSpeed=speed;
 p.window.BilliardsShotRecorder={begin:()=>({ready:()=>true,frame:n=>recorded.push({t:p.animation.time,count:n||1}),finish(){},cancel(){throw Error('Unexpected cancel');}})};
 p.startShotPlayback({frames},{});p.S.shotPlaybackSpeed=.75;let clock=0;while(queued.length){queued.shift()(clock+=17);assert(clock<50000);}
 assert.equal(recorded[0].count,60);assert.equal(recorded.at(-1).count,60);near(recorded.at(-1).t,1);
 const moving=recorded.slice(1,-1);assert.equal(moving.length,30/speed-1);
 moving.forEach((f,i)=>near(f.t,(i+1)*speed/30));
}
assert.equal(commits,4);
delete p.window.BilliardsShotRecorder;queued=[];p.S.shotPlaybackSpeed=.25;
p.startShotPlayback({frames},{},{paused:true});assert.equal(queued.length,0,'Paused playback schedules no redraws');near(p.animation.time,0);
p.animation.sample(.5);assert.equal(queued.length,0);near(p.animation.time,.5);
assert.deepEqual(p.animation.current[0].orientation,identity);
vm.runInContext(html.slice(html.indexOf('    window.billiardsPlayback='),html.indexOf('    window.billiardsTrainingBall=')),p);
p.animation.setPaused(false);assert.equal(queued.length,1);p.animation.setPaused(false);assert.equal(queued.length,1,'Resume cannot duplicate animation loops');
p.animation.setPaused(true);assert.equal(queued.length,0,'Pause cancels the pending frame');
for(let i=0;i<5;i++){
 p.S={shotPlaybackSpeed:.125,balls:[{id:0,x:.5,y:.6}]};const saved=JSON.parse(JSON.stringify(p.S));
 p.startShotPlayback({frames},saved,{paused:true});p.animation.sample(.5);
 assert(p.window.billiardsPlayback.stop());assert.equal(p.animation,null);assert.equal(queued.length,0);
 assert.equal(p.S.shotPlaybackSpeed,1);assert.equal(JSON.stringify(p.S.balls),JSON.stringify(saved.balls));
}
const finalState={shotPlaybackSpeed:.5,balls:[{id:0,x:2,y:.7}]};p.S={shotPlaybackSpeed:.5};
p.startShotPlayback({frames},{balls:[{id:0,x:.5,y:.6}]},{replay:true,restore:finalState,paused:true});
p.window.billiardsPlayback.stop();assert.equal(JSON.stringify(p.S.balls),JSON.stringify(finalState.balls),'Closing replay restores the ending layout');
assert.equal(commits,4,'Closing playback never commits a shot');
console.log('No paused frame loop; five stop cycles restore layout and normal speed; replay restores final layout.');
console.log('Training patterns, quaternion direction, slide/stun/draw/roll, stop/cut-stun impacts, 600 Hz sampling, unchanged physics, pause and all four recording speeds passed.');
