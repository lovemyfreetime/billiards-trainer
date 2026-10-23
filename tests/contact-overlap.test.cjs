const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
function extract(name){const a=html.indexOf('    function '+name+'('),begin=html.indexOf('{',a);assert(a>=0,name);let depth=0;for(let i=begin;i<html.length;i++){if(html[i]==='{')depth++;if(html[i]==='}'&&--depth===0)return html.slice(a,i+1);}throw Error(name);}
const c={Math,Map,Set};vm.createContext(c);
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
let cases=0;
// Independent straight-line geometry: impact parameter = distance*sin(aim error).
for(const heading of [0,.37])for(const angle of [0,.15,-.15,1,-1])for(const speed of [.5,1,2,3,4,6]){
 setup(speed,angle,heading);
 const snapshot=JSON.stringify(c.S),result=solve(),hit=result.firstBallContact;
 assert(hit,'Direct shot must contact object');
 const offset=.7*Math.sin(angle*Math.PI/180),diameter=2*c.S.ballR;
 assert(Math.abs(hit.overlap-100*(1-Math.abs(offset)/diameter))<1e-8,'Overlap must match geometry at every speed');
 assert(Math.abs(hit.cutAngle-Math.asin(Math.abs(offset)/diameter))<3e-8,'Actual collision normal must match first-touch geometry');
 assert(Math.abs(Math.hypot(hit.objPos.x-hit.cuePos.x,hit.objPos.y-hit.cuePos.y)-diameter)<1e-12,'Impact centers must be exactly one diameter apart');
 assert.equal(JSON.stringify(c.S),snapshot,'Prediction must not modify saved aim, speed or balls');
 cases++;
}
// Follow/draw without English cannot change a direct shot's contact geometry.
for(const follow of [-1,1])for(const speed of [1,3,6]){
 setup(speed,.15,.37,follow);const hit=solve().firstBallContact;
 assert(Math.abs(hit.overlap-100*(1-.7*Math.sin(.15*Math.PI/180)/(2*c.S.ballR)))<1e-8);
}
// Preserve the real speed response with English, rather than freezing the UI number.
const english=[];for(const speed of [1,2,4]){setup(speed,0,0,0,.5);english.push(solve().firstBallContact.overlap);}
assert(Math.max(...english)-Math.min(...english)>1,'Swerve still changes contact with English');
// Animation and preview must use the same corrected impact response.
setup(2,.15);const preview=solve(),animated=solve(true);
assert.deepEqual(animated.firstBallContact,preview.firstBallContact);assert.deepEqual(animated.finalBalls,preview.finalBalls);
assert(animated.frames.length>0);
console.log(`${cases} straight-shot cases: speed invariance, left/right symmetry, exact cut and contact positions passed; follow/draw, real English response, preview/execution and state preservation passed.`);
// Dense break shots exercise consecutive contacts and initially frozen pairs.
for(const rows of [2,3,5])for(const speed of [2,6]){
 c.S=c.defaultState();c.S.speed=speed;
 c.S.balls=[{id:0,n:'CB',x:c.S.tableL*.25,y:c.S.tableW*.5,active:true}];
 let id=1;for(let row=0;row<rows;row++)for(let col=0;col<=row;col++)c.S.balls.push({id,n:String(id++),x:c.S.tableL*.75+row*Math.sqrt(3)*c.S.ballR,y:c.S.tableW*.5+(col-row/2)*2*c.S.ballR,active:true});
 c.S.freeAim={x:c.S.tableL*.75,y:c.S.tableW*.5};
 const result=solve();assert(result.firstBallContact);assert(Math.abs(result.firstBallContact.overlap-100)<1e-8);
 for(const ball of result.finalBalls)assert([ball.x,ball.y,ball.z].every(Number.isFinite),'Dense rack break remains finite');
}
console.log('Three-, six- and fifteen-ball tight rack breaks remain valid at both tested speeds.');
