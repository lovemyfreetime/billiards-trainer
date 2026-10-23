const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
function extract(name){const a=html.indexOf('    function '+name+'('),begin=html.indexOf('{',a);assert(a>=0,name);let depth=0;for(let i=begin;i<html.length;i++){if(html[i]==='{')depth++;if(html[i]==='}'&&--depth===0)return html.slice(a,i+1);}throw Error(name);}
const budget=require('../trainer-shot-budget.js');
const c={Math,Map,Set,window:{BilliardsShotBudget:budget}};vm.createContext(c);
vm.runInContext(html.slice(html.indexOf('    const APK ='),html.indexOf('    const ORIGINAL_TABLE_ASSET =')),c);
for(const name of ['defaultState','simulate'])vm.runInContext(extract(name),c);
function solve(frames=false){
 for(let attempt=0;attempt<100;attempt++)try{return c.simulate(frames);}catch(e){const missing=/^(\w+) is not defined$/.exec(e.message);if(!missing)throw e;vm.runInContext(extract(missing[1]),c);}
 throw Error('Physics dependencies did not resolve');
}
function setup(speed,angle,heading=0,follow=0,side=0){
 c.S=c.defaultState();Object.assign(c.S,{tableL:2.54,tableW:1.27,speed,follow,sideSpin:side});
 const origin={x:.55,y:.4},distance=.7,aim=heading+angle*Math.PI/180;
 c.S.balls=[{id:0,n:'CB',...origin,active:true},{id:1,n:'1',x:origin.x+distance*Math.cos(heading),y:origin.y+distance*Math.sin(heading),active:true}];
 c.S.freeAim={x:origin.x+distance*Math.cos(aim),y:origin.y+distance*Math.sin(aim)};
}

for(const [speed,angle,follow,side] of [[1,0,0,0],[2,.15,0,0],[3,1,-.7,.4],[4,-1,.8,-.5]]){
 setup(speed,angle,0,follow,side);const plain=solve();c.S.showShotBudget=true;const tracked=solve();
 assert.deepEqual(tracked.finalBalls,plain.finalBalls,'Tracking never changes physics');
 assert.deepEqual(tracked.paths,plain.paths,'Existing path geometry and styling inputs stay identical');
 assert.deepEqual(tracked.firstBallContact,plain.firstBallContact);
 assert.equal(tracked.budgetPaths[0][0].percent,100);
 assert(tracked.initialEnergy>=.5*speed*speed);
 for(const points of Object.values(tracked.budgetPaths))for(const p of points)assert(Number.isFinite(p.percent)&&p.percent>=0);
 assert(tracked.budgetPaths[0].some(p=>p.kind==='before'));assert(tracked.budgetPaths[1].some(p=>p.kind==='after'));
 // The first transfer uses the same denominator for both balls.
 const ca=tracked.budgetPaths[0].find(p=>p.kind==='after'),oa=tracked.budgetPaths[1].find(p=>p.kind==='after');
 const cb=tracked.budgetPaths[0].find(p=>p.kind==='before');
 assert(ca.percent+oa.percent<=cb.percent+1e-7,'Ball contact cannot create total mechanical energy');
}
vm.runInContext(extract('trainerDemoLayout'),c);c.S=c.defaultState();Object.assign(c.S,c.trainerDemoLayout(c.S.tableL,c.S.tableW,c.S.ballR));c.S.showShotBudget=true;
const pocketed=solve();assert(pocketed.pocketEvents.length);
for(const event of pocketed.pocketEvents){const points=pocketed.budgetPaths[event.id];assert(points);assert.equal(points.at(-1).kind,'pocket');assert(points.at(-1).percent>0,'Energy carried into a pocket is not fabricated as zero');}
// Layout labels beside the original sampled lines: rotated, upright, and clear of one another.
const map=p=>({x:50+p.x*400,y:50+p.y*400});
const occupied=[];const labels=budget.labels(pocketed,map,{width:1200,height:700,occupied});assert(labels.length>2);
for(const label of labels){assert(Math.abs(label.angle)<=Math.PI/2);assert(Math.abs(Math.hypot(label.x-label.linePoint.x,label.y-label.linePoint.y)-14)<1e-9);}
for(let i=0;i<occupied.length;i++)for(let j=i+1;j<occupied.length;j++){const a=occupied[i],b=occupied[j];assert(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top);}
const reverse={paths:{0:[{x:2,y:.4,t:0},{x:.2,y:.5,t:1}]},budgetPaths:{0:[{x:2,y:.4,t:0,kind:'start',percent:100},{x:.2,y:.5,t:1,kind:'end',percent:0}]}};
assert(budget.labels(reverse,map,{width:1200,height:700}).every(p=>Math.abs(p.angle)<=Math.PI/2));
const ball={vx:2,vy:0,vz:0,wx:0,wy:0,wz:100,z:.03};assert(budget.energy(ball,.03)>2,'Stored spin is included');
assert(html.indexOf('id="shotBudget"')<html.indexOf('id="jumpMasseFeatures"'));assert(html.indexOf('id="jumpMasseFeatures"')<html.indexOf('id="tipArea"'));
assert(html.includes('grid-template-columns:repeat(2,minmax(0,1fr))'));assert(!html.includes('3D JUMP / MASSÉ FEATURES'));
console.log('Shot budget: motion + spin, shared energy baseline, unchanged simulation/paths, collision records, pocket residual, upright offset labels, collision avoidance and equal button placement pass.');
