const {rollingReference,counterValue,compassMarks}=require('../trainer-practice-tools.js'),assert=require('node:assert/strict');
const R=.028575,table={ballR:R,tableL:2.54,tableW:1.27,muSlide:.25};
function contact(cut=30,sign=1,v=1){const a=cut*Math.PI/180,n={x:Math.cos(a),y:sign*Math.sin(a)};return {cuePos:{x:1,y:.6},incoming:{x:1,y:0},signedOffset:sign*.02,cutAngle:a,motion:{speed:v,slipRatio:0,sideRatio:0,objectSpeed:0,elevation:3},after:{vx:v*(1-n.x*n.x),vy:-v*n.x*n.y,wx:0,wy:v/R}}}
for(const sign of [-1,1])for(const angle of [15,30,45]){const ref=rollingReference(contact(angle,sign),table);assert(ref);assert(Math.abs(Math.atan2(ref.direction.y,ref.direction.x)*180/Math.PI+sign*30)<1e-8);assert(Math.abs(ref.length-table.tableL/4)<1e-8)}
for(const angle of [0,10,50,75,90])assert.equal(rollingReference(contact(angle),table),null);
for(const change of [{slipRatio:.5},{slipRatio:2},{sideRatio:.3},{objectSpeed:.3},{elevation:15},{speed:0}]){const c=contact();Object.assign(c.motion,change);assert.equal(rollingReference(c,table),null)}
assert.equal(rollingReference(contact(30,1,5),table),null);assert.equal(rollingReference(contact(),{...table,airbornePhysics:true}),null);assert.equal(rollingReference(null,table),null);
const near=contact();near.cuePos={x:2.5,y:.05};assert.equal(rollingReference(near,table),null);
for(const [input,value]of [[-4,0],[1002,999],['17',17],[2.9,2],[NaN,0],[Infinity,0]])assert.equal(counterValue(input),value);
console.log('Both cut directions, fractional-hit boundaries, rolling/spin/elevation/speed exclusions, rail clipping and 000–999 limits passed.');

const marks=compassMarks(Math.PI/7);assert.equal(marks.dots.length,72);assert.equal(marks.dots.filter(m=>m.major).length,36);assert.deepEqual(marks.spokes.map(m=>m.degrees),[30,150,210,330]);assert.ok(Math.abs(marks.spokes[0].angle-Math.PI/7-Math.PI/6)<1e-9);
