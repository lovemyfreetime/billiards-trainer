const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(process.env.TRAINER_SOURCE||'index.html','utf8');
function extract(name){const a=html.indexOf('    function '+name+'(');assert(a>=0,name);const begin=html.indexOf('{',a);let depth=0;for(let i=begin;i<html.length;i++){if(html[i]==='{')depth++;if(html[i]==='}'&&--depth===0)return html.slice(a,i+1);}throw Error(name);}
const c={Math,Set,document:{body:{classList:{contains:()=>false}}}};vm.createContext(c);
c.pocketModel=()=>({L:c.S.tableL,W:c.S.tableW});
for(const name of ['clamp','logicalPockets','keepCueOnTable','finishDraggedBall'])vm.runInContext(extract(name),c);
for(const name of ['legalBallPosition','repairBallOverlaps','normalizeBallSet','cloneBallsForPhysics'])if(html.includes('    function '+name+'('))vm.runInContext(extract(name),c);
const ball=(id,x,y,extra={})=>({id,n:id?String(id):'CB',x,y,active:true,...extra});
function setup(balls){c.S={tableL:2.54,tableW:1.27,ballR:.028575,balls,freeAim:{x:1.2,y:.6},angleLock:false};}
function valid(balls=c.S.balls){const R=c.S.ballR,live=balls.filter(b=>b.active!==false&&!b.marker);for(const b of live){assert(b.x>=R-1e-9&&b.x<=c.S.tableL-R+1e-9);assert(b.y>=R-1e-9&&b.y<=c.S.tableW-R+1e-9);for(const a of live)if(a!==b)assert(Math.hypot(a.x-b.x,a.y-b.y)>=2*R-1e-9,`Balls ${a.id} and ${b.id} intersect`);}}
// Public drop completion reproduces the reported fault on the pre-fix source.
for(const id of [0,2]){
 setup([ball(id,.7,.6),ball(1,1,.6)]);const fixed=JSON.stringify(c.S.balls[1]);
 c.finishDraggedBall(id,{x:1,y:.6});valid();assert.equal(JSON.stringify(c.S.balls[1]),fixed);
 assert(Math.abs(c.S.balls[0].x-(1-2*c.S.ballR))<1e-9,'Identical drop stays touching on the approach side');
}
// Frozen balls, markers, and pocketed balls retain their intended semantics.
setup([ball(0,.5,.6),ball(1,.5+2*.028575,.6),ball(1000,.5,.6,{marker:true}),ball(2,.5,.6,{active:false})]);
const frozen=JSON.stringify(c.S.balls);c.normalizeBallSet();assert.equal(JSON.stringify(c.S.balls.slice(0,2)),JSON.stringify(JSON.parse(frozen).slice(0,2)));valid();
// Resolve a dense legacy pile, including near rails and pockets; repeat is stable.
for(const point of [{x:1,y:.6},{x:.028575,y:.6},{x:.028575,y:.028575}]){
 setup(Array.from({length:16},(_,id)=>ball(id,point.x,point.y)));
 c.normalizeBallSet();valid();const saved=JSON.stringify(c.S.balls);c.normalizeBallSet();assert.equal(JSON.stringify(c.S.balls),saved);
}
// Ordinary tight racks must not be loosened by restoration or prediction.
setup([ball(0,.5,.6)]);let id=1;for(let row=0;row<5;row++)for(let col=0;col<=row;col++)c.S.balls.push(ball(id++,1.5+row*Math.sqrt(3)*c.S.ballR,.635+(col-row/2)*2*c.S.ballR));
const rack=JSON.stringify(c.S.balls);c.normalizeBallSet();assert.equal(JSON.stringify(c.S.balls),rack);valid();
// Moving the selected ball cannot push neighboring balls or cross the cushions.
let seed=12026;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
for(let i=0;i<400;i++){
 const moving=c.S.balls[i%16],others=JSON.stringify(c.S.balls.filter(b=>b!==moving));
 const target=i%3?c.S.balls[(i+1)%16]:{x:random()*2.7-.08,y:random()*1.4-.06};
 c.finishDraggedBall(moving.id,target);valid();assert.equal(JSON.stringify(c.S.balls.filter(b=>b!==moving)),others);
}
// Shot 2 replaces CB1 in its alternate setup; it must still avoid object balls.
setup([ball(0,.5,.6),ball(1,1,.6)]);
assert.deepEqual(JSON.parse(JSON.stringify(c.legalBallPosition({x:.5,y:.6},{id:0,x:.7,y:.6}))),{x:.5,y:.6});
const alternate=c.legalBallPosition({x:1,y:.6},{id:0,x:.7,y:.6});assert(Math.hypot(alternate.x-1,alternate.y-.6)>=2*c.S.ballR-1e-9);
// Prediction repairs its copy without silently rewriting the saved setup.
setup([ball(0,.5,.6),ball(1,1,.6),ball(2,1,.6)]);const original=JSON.stringify(c.S);valid(c.cloneBallsForPhysics());assert.equal(JSON.stringify(c.S),original);
console.log('Ball placement: cue/object drops, frozen contacts, 16-ball piles, rails, markers, pocketed balls, 400 placements, Shot 2 and prediction isolation passed.');
