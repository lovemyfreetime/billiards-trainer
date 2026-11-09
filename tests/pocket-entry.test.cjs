const assert=require('node:assert/strict');
const {mouths,analyze}=require('../trainer-pocket-entry.js');
const {placeBadge}=require('../trainer-shot-budget.js');

const g={L:2.2352,W:1.1176,R:.028575,sideMouth:.120,cornerLeg:.110/Math.SQRT2};
const start={x:g.L/2,y:g.W*.45};
const line=(point,from=start)=>analyze(g,{objPos:from,normal:{x:point.x-from.x,y:point.y-from.y}});
const top={x:g.L/2,y:0};
const center=line(top);
assert.equal(mouths(g).length,6);
assert.equal(center.label,'0 · CENTER');
assert.equal(center.name,'TM');
assert(Math.abs(center.mouthWidth-.120)<1e-9);
assert(Math.abs(center.halfMouth-.060)<1e-9);
assert.equal(line({x:top.x+center.halfMouth*2/3,y:0}).label,'R +2');
assert.equal(line({x:top.x-center.halfMouth/3,y:0}).label,'L -1');

// The old ball-clearance gate marked this as a red miss. A tapered jaw can
// still accept it, so the reading is a position index, not a pocketing verdict.
const formerlyOut=line({x:top.x+(.120-2*g.R)*.75,y:0});
assert.match(formerlyOut.label,/^R \+\d+$/);
assert(!formerlyOut.label.includes('OUT'));
const beyondMouth=line({x:top.x+center.halfMouth*1.2,y:0});
assert.equal(beyondMouth.label,'R +4');
assert.equal(beyondMouth.out,undefined);
assert.equal(beyondMouth.ticks,undefined);

for(const mouth of mouths(g)){
  const origin={x:g.L/2,y:g.W/2};
  const midpoint={x:(mouth.a.x+mouth.b.x)/2,y:(mouth.a.y+mouth.b.y)/2};
  const reading=line(midpoint,origin);
  assert.equal(reading.name,mouth.name);
  assert.equal(reading.value,0,`${mouth.name} has true zero center`);
  if(mouth.kind==='corner')assert(Math.abs(reading.mouthWidth-.110)<1e-9);
}

const obstacles=[{left:125,right:175,top:120,bottom:180}];
const card=placeBadge([{text:'Pocket entry R +2'}],{x:150,y:150},{
  width:400,height:300,fontSize:11,pad:0,occupied:obstacles,
  measureText:text=>text.length*7,
  bounds:{left:20,right:380,top:20,bottom:280},
  acceptBox:box=>box.left>=30&&box.right<=370&&box.top>=30&&box.bottom<=270
});
assert(card,'Place text on cloth even when the preferred location is occupied');
assert(card.box.right<=119||card.box.left>=181||card.box.bottom<=114||card.box.top>=186,
  'Badge never intersects ball clearance region');

assert.equal(analyze(g,null),null);
assert.equal(analyze(g,{objPos:start,normal:{x:0,y:0}}),null);
console.log('Pocket Entry center/offset, tapered-jaw neutral indexing, six pockets and collision placement passed.');
