const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync('index.html','utf8');
function extract(name){const at=src.indexOf('    function '+name+'('),end=src.indexOf('\n    function ',at+5);assert(at>=0);return src.slice(at,end);}
const rows=[[1],[11,5],[2,8,10],[9,7,14,4],[6,15,13,3,12]];
for(const [L,W,R] of [[2.032,1.016,.028575],[2.54,1.27,.028575],[1.9812,.9906,.028575]]){
 let result;
 const ctx={S:{tableL:L,tableW:W,ballR:R},finishRackSetup:(balls,msg,mode)=>result={balls,msg,mode}};
 vm.runInNewContext(extract('ultimateEightBallRack')+';ultimateEightBallRack();',ctx);
 const eight=result.balls.find(b=>b.id===8);
 assert(Math.abs(eight.x-L*.75)<1e-12);assert.equal(eight.y,W*.5);
 assert.equal(result.balls.length,16);assert.equal(new Set(result.balls.map(b=>b.id)).size,16);
 assert.equal(result.mode,'8ball');
 const apex=result.balls.find(b=>b.id===1);
 assert(apex.x<eight.x);
 for(let row=0;row<5;row++)for(let k=0;k<rows[row].length;k++){
  const b=result.balls.find(b=>b.id===rows[row][k]);
  assert(Math.abs(b.x-(apex.x+row*Math.sqrt(3)*R))<1e-12);
  assert(Math.abs(b.y-(W*.5+(k-row/2)*2*R))<1e-12);
  assert(b.x>=R&&b.x<=L-R&&b.y>=R&&b.y<=W-R);
 }
 for(const a of result.balls)for(const b of result.balls)if(a.id!==b.id)assert(Math.hypot(a.x-b.x,a.y-b.y)>=2*R-1e-12);
}
let selected='',calls=[];
const ctx={$:()=>({value:selected}),syncProjector:()=>{},randomThreeBallRack:()=>calls.push('rack3'),randomEightBallRack:()=>calls.push('rack8'),randomNineBallRack:()=>calls.push('rack9'),randomTenBallRack:()=>calls.push('rack10'),ultimateEightBallRack:()=>calls.push('ultimate8')};
vm.runInNewContext(extract('startFullRack'),ctx);
for(selected of ['rack3','rack8','rack9','rack10','ultimate8'])vm.runInNewContext('startFullRack()',ctx);
assert.deepEqual(calls,['rack3','rack8','rack9','rack10','ultimate8']);
assert(!src.match(/<select id="randomSetup"[\s\S]*?<\/select>/)[0].includes('value="rack'));
assert(src.indexOf('id="fullRackGroup"')<src.indexOf('>LAYOUT SETUP<'));
console.log('Full-rack dispatch, reference order, exact foot spot, spacing, and menu separation passed.');
