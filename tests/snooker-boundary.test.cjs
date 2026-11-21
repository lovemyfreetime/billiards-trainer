const assert = require('node:assert/strict');
const {prepare} = require('../trainer-snooker-boundary');
const R = .02625;
const G = {L:3.569, W:1.778, R, sideThroat:.0736, sideJawOut:.020,
  cornerMouth:.086, cornerThroatInset:.011, cornerJawOut:.034};
const horizontal = {points:[{x:1,y:0},{x:1.15,y:0}]};
const boundary = prepare(G,[horizontal],[]);
const close = (actual,expected) => assert(Math.abs(actual-expected)<1e-10,
  'expected '+expected+' but received '+actual);
const shot = (x,y,vx,vy) => ({x,y,vx,vy});
const flat = boundary.first(shot(1.06,.15,0,-10),.03,false);
assert.equal(flat.kind,'jaw');
close(flat.t,(.15-R)/10);
close(flat.nx,0);close(flat.ny,1);
// The endpoint, rather than the infinite extension of the segment, is struck.
const cap = boundary.first(shot(1-R*.6,.15,0,-10),.03,false);
assert.equal(cap.kind,'jaw');
close(cap.t,(.15-R*.8)/10);
close(cap.nx,-.6);close(cap.ny,.8);
assert.equal(boundary.first(shot(1-R-.0001,.15,0,-10),.03,false),null);
// Resolve a time step that passes completely through the jaw at this speed.
const moving = {...shot(1.06,-.15,0,-10),travel:.30,active:true};
let contacts=0;
boundary.advance(moving,.03,false,(ball,hit,elapsed)=>{
  contacts++;
  close(elapsed,flat.t);
  ball.vy=-ball.vy;
});
assert.equal(contacts,1);
close(moving.y,.15+2*R);close(moving.travel,.30);
// All pocket labels survive table reflection. A cushion wins a simultaneous gate crossing.
const gates=prepare(G,[],[]);
for(const [x,y,name] of [[0,0,'TL'],[G.L,0,'TR'],[0,G.W,'BL'],[G.L,G.W,'BR'],
  [G.L/2,-.02,'TM'],[G.L/2,G.W+.02,'BM']])assert.equal(gates.pocketAt({x,y}),name);
const depth=G.sideJawOut*.73, towards=shot(G.L/2,.20,0,-3);
const gate=gates.first(towards,.1,true);
assert.equal(gate.name,'TM');close(gate.t,(.20+depth)/3);
assert.equal(gates.first(towards,.1,false),null);
const atGate=prepare(G,[],[{axis:'y',along:'x',bound:-depth,sign:1,spans:[]}]);
assert.equal(atGate.first(towards,.1,true).kind,'rail');
console.log('Snooker planar contacts passed face, cap, near miss, swept rebound, travel, six gates and simultaneous rail/gate checks.');
