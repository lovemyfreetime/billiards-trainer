const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
function extract(name){let a=html.indexOf('    function '+name+'(');if(a<0)a=html.indexOf('    function* '+name+'(');assert(a>=0,name);const begin=html.indexOf('{',html.indexOf(')',a));let depth=0;for(let i=begin;i<html.length;i++){if(html[i]==='{')depth++;if(html[i]==='}'&&--depth===0)return html.slice(a,i+1);}throw Error(name);}
const c={Math,Map,Set,window:{}};vm.createContext(c);
vm.runInContext(html.slice(html.indexOf('    const APK ='),html.indexOf('    const ORIGINAL_TABLE_ASSET =')),c);
for(const n of ['defaultState','simulate'])vm.runInContext(extract(n),c);
function solve(frames){for(let i=0;i<100;i++)try{return c.simulate(frames,null,true);}catch(e){const m=/^(\w+) is not defined$/.exec(e.message);if(!m)throw e;vm.runInContext(extract(m[1]),c);}throw Error('Dependencies unresolved');}
const ball=(id,x,y)=>({id,n:id?String(id):'CB',x,y,active:true});
const energy=(frame,R)=>frame.filter(b=>b.active).reduce((sum,b)=>sum+.5*(b.vx*b.vx+b.vy*b.vy+(b.vz||0)**2)+.2*R*R*(b.wx*b.wx+b.wy*b.wy+b.wz*b.wz),0);
for(const speed of [6,6.5,7])for(const kind of ['head','cut','rail','rack']){
 c.S=c.defaultState();Object.assign(c.S,{speed,follow:0,sideSpin:0,cueElevationDeg:0,airbornePhysics:false,showShotBudget:false});
 const R=c.S.ballR;c.S.balls=[ball(0,.5,.635)];c.S.freeAim={x:2.3,y:.635};
 if(kind==='head'||kind==='cut')c.S.balls.push(ball(1,1,.635+(kind==='cut'?R*1.25:0)));
 if(kind==='rack'){let id=1;for(let row=0;row<5;row++)for(let col=0;col<=row;col++)c.S.balls.push(ball(id++,1.6+row*Math.sqrt(3)*R,.635+(col-row/2)*2*R));}
 if(kind==='rail')c.S.freeAim={x:1.3,y:.12};
 const before=JSON.stringify(c.S),preview=solve(false),shot=solve(true);
 assert.equal(JSON.stringify(c.S),before,'Prediction cannot alter the setup');
 assert.deepEqual(shot.finalBalls,preview.finalBalls,'Preview and execution have identical physics');
 if(kind!=='rail')assert(shot.firstBallContact,'Expected object-ball contact at '+speed+' / '+kind);
 else assert(shot.railEvents.length,'Expected cushion contact');
 const initial=energy(shot.frames[0],R);
 for(const frame of shot.frames){
  assert(energy(frame,R)<=initial*1.01+1e-8,'No numerical energy gain at '+speed+' / '+kind);
  for(const b of frame)for(const k of ['x','y','vx','vy','wx','wy','wz'])assert(Number.isFinite(b[k]),'Finite '+k);
 }
 const live=shot.finalBalls.filter(b=>b.active);
 for(let i=0;i<live.length;i++)for(let j=i+1;j<live.length;j++)assert(Math.hypot(live[i].x-live[j].x,live[i].y-live[j].y)>=2*R-.0005,'Final balls do not stack');
 if(kind==='rack')assert(shot.finalBalls.filter(b=>b.id&&Math.hypot(b.x-c.S.balls[b.id].x,b.y-c.S.balls[b.id].y)>.05).length>=8,'Break spreads the rack');
 console.log(speed+' m/s '+kind+': finite, dissipative, identical preview/execution');
}
console.log('6.0–7.0 m/s: head-on, cut, cushion and full-rack stability passed.');
