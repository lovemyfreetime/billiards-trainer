const assert = require('node:assert/strict');
const {caromRebound, tables} = require('../trainer-international');
const {nose, ballR:radius} = tables.carom;
const energy = b => .5*(b.vx**2+b.vy**2) + .2*radius**2*(b.wx**2+b.wy**2+b.wz**2);
let shots = 0;
for (const vx of [-.02,-.5,-1,-2,-4]) for (const vy of [-2,0,1,4]) {
  for (const wx of [-150,-20,0,20,150]) for (const wy of [-150,-20,0,20,150]) {
    for (const wz of [-150,0,150]) for (const rebound of [.3,.9,1]) {
      const ball={vx,vy,wx,wy,wz}, before=energy(ball);
      assert(caromRebound(ball,1,0,radius,nose,rebound,1));
      assert(ball.vx>0 && energy(ball)<=before+1e-10);
      shots++;
    }
  }
}
// Non-contact, separating motion and incompatible custom diameters fall back
// before altering either the linear or angular state.
for (const [vx, height] of [[-1,2*radius],[-1,.001],[1,nose]]) {
  const ball={vx,vy:0,wx:0,wy:0,wz:0}, before={...ball};
  assert.equal(caromRebound(ball,1,0,radius,height,.9,1),false);
  assert.deepEqual(ball,before);
}
console.log(shots+' raised-nose carom impacts separated without energy gain.');
