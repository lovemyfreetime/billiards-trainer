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
const ctx={$:()=>({value:selected}),syncProjector:()=>{},randomThreeBallRack:()=>calls.push('rack3'),randomEightBallRack:()=>calls.push('rack8'),randomNineBallRack:()=>calls.push('rack9'),randomTenBallRack:()=>calls.push('rack10'),ultimateEightBallRack:()=>calls.push('ultimate8'),sixBallRack:()=>calls.push('rack6'),sevenBallRack:()=>calls.push('rack7'),straightPoolOpenRack:()=>calls.push('straight14')};
vm.runInNewContext(extract('startFullRack'),ctx);
for(selected of ['rack3','rack6','rack7','rack8','rack9','rack10','ultimate8','straight14'])vm.runInNewContext('startFullRack()',ctx);
assert.deepEqual(calls,['rack3','rack6','rack7','rack8','rack9','rack10','ultimate8','straight14']);
assert(!src.match(/<select id="randomSetup"[\s\S]*?<\/select>/)[0].includes('value="rack'));
assert(src.indexOf('id="fullRackGroup"')<src.indexOf('>LAYOUT SETUP<'));
console.log('Full-rack dispatch, reference order, exact foot spot, spacing, and menu separation passed.');

for(const [L,W,R] of [[2.032,1.016,.028575],[2.54,1.27,.028575],[1.9812,.9906,.028575]]) {
 for(const [name,count,mode] of [['sixBallRack',6,'6ball'],['sevenBallRack',7,'7ball'],['straightPoolOpenRack',14,'straight']]) {
  let result;
  const ctx={S:{tableL:L,tableW:W,ballR:R},shuffleRackIds:a=>a,finishRackSetup:(balls,msg,mode)=>result={balls,msg,mode}};
  vm.runInNewContext(extract(name)+';'+name+'();',ctx);
  const balls=result.balls;
  assert.equal(balls.length,count+1);assert.equal(new Set(balls.map(b=>b.id)).size,count+1);assert.equal(result.mode,mode);
  for(const b of balls)assert(b.active&&b.x>=R&&b.x<=L-R&&b.y>=R&&b.y<=W-R);
  for(const a of balls)for(const b of balls)if(a.id!==b.id)assert(Math.hypot(a.x-b.x,a.y-b.y)>=2*R-1e-12);
  if(name==='sixBallRack') {
   assert.equal(balls.find(b=>b.id===1).x,L*.75);
   assert.equal(balls.find(b=>b.id===6).y,W*.5);
   assert(Math.abs(balls.find(b=>b.id===6).x-(L*.75+2*Math.sqrt(3)*R))<1e-12);
  }
  if(name==='sevenBallRack') {
   const center=balls.find(b=>b.id===7);
   assert(Math.abs(balls.find(b=>b.id===1).x-L*.75)<1e-12);
   for(let id=1;id<=6;id++) {
    const b=balls.find(b=>b.id===id),next=balls.find(b=>b.id===id%6+1);
    assert(Math.abs(Math.hypot(b.x-center.x,b.y-center.y)-2*R)<1e-12);
    assert((b.x-center.x)*(next.y-center.y)-(b.y-center.y)*(next.x-center.x)>0);
   }
  }
  if(name==='straightPoolOpenRack') {
   assert(!balls.some(b=>b.id!==0&&Math.hypot(b.x-L*.75,b.y-W*.5)<1e-12));
   for(let row=1;row<5;row++)assert.equal(balls.filter(b=>Math.abs(b.x-(L*.75+row*Math.sqrt(3)*R))<1e-12).length,row+1);
   assert(!balls.some(b=>b.id===15));
  }
 }
}
console.log('Six-ball, seven-ball clockwise hexagon, and open-front straight-pool geometry passed on three table sizes.');
for(const script of src.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(script[1]);
console.log('Inline scripts parse.');

// House racks: verify anchors, touching distances, mirrored Ls and dispatch.
for (const [L,W,R] of [[2.032,1.016,.028575],[2.54,1.27,.028575],[1.9812,.9906,.028575]]) {
 const expected={original:[[0,0],[Math.sqrt(3),-1],[Math.sqrt(3),1]],crosswise:[[0,0],[0,-2],[0,2]],backwards:[[0,-1],[0,1],[Math.sqrt(3),0]],straight:[[0,0],[2,0],[4,0]],ll:[[0,0],[2,0],[2,-2]],lr:[[0,0],[2,0],[2,2]]};
 for (const [formation,offsets] of Object.entries(expected)) {
  let result;
  const ctx={S:{tableL:L,tableW:W,ballR:R},cueBall:()=>null,rackCueBallIfNeeded:()=>{},finishRackSetup:(balls,msg,mode)=>result={balls,msg,mode}};
  vm.runInNewContext(extract('randomThreeBallRack')+`;randomThreeBallRack('${formation}')`,ctx);
  assert.equal(result.mode,'3ball');assert.equal(result.balls.length,4);
  assert.equal(new Set(result.balls.map(b=>b.id)).size,4);
  const objects=result.balls.slice(1);
  objects.forEach((b,i)=>{
   assert(Math.abs(b.x-(L*.75+offsets[i][0]*R))<1e-12);
   assert(Math.abs(b.y-(W*.5+offsets[i][1]*R))<1e-12);
   assert(b.active&&b.x>=R&&b.x<=L-R&&b.y>=R&&b.y<=W-R);
   assert(objects.some(c=>c!==b&&Math.abs(Math.hypot(c.x-b.x,c.y-b.y)-2*R)<1e-12));
  });
  for(const a of result.balls)for(const b of result.balls)if(a!==b)assert(Math.hypot(a.x-b.x,a.y-b.y)>=2*R-1e-12);
 }
}
const variants=['crosswise','backwards','straight','ll','lr'];
let chosen='',dispatched=[];
const dispatchCtx={$:()=>({value:chosen}),syncProjector:()=>{},randomThreeBallRack:v=>dispatched.push(v)};
vm.runInNewContext(extract('startFullRack'),dispatchCtx);
for(const variant of variants){chosen='rack3-'+variant;vm.runInNewContext('startFullRack()',dispatchCtx);assert(src.includes('value="'+chosen+'"'));}
assert.deepEqual(dispatched,variants);
console.log('All six three-ball formations: exact anchors, contact, no overlaps, table bounds and picker dispatch passed.');
