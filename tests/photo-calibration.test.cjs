const assert=require('node:assert/strict');
const C=require('../photo-calibration.js');
const trueH=[760,95,130,60,420,90,.28,.17,1];
function near(a,b,tol=1e-7){assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<tol,JSON.stringify({a,b}));}
for(const end of ['full','head','foot'])for(const size of [2,4,5,6,8]){
  const r=C.region(end,size),points=C.anchors(r),images=points.map(p=>C.apply(trueH,p));
  const fit=C.fit(points,images);assert.ok(fit);assert.ok(C.validQuad(images));
  for(const p of [{x:r.x0,y:0},{x:(r.x0+r.x1)/2,y:.63},{x:r.x1,y:1}]){
    near(C.apply(fit.H,p),C.apply(trueH,p));near(C.apply(fit.inverse,C.apply(trueH,p)),p);
  }
}
// A mirrored/rotated photograph preserves pocket identity when taps follow P order.
const rotated=[-100,-500,650,700,0,80,.15,.22,1];
const a=C.anchors(C.region('foot',4));
const f=C.fit(a,a.map(p=>C.apply(rotated,p)));near(C.apply(f.inverse,C.apply(rotated,{x:.83,y:.27})),{x:.83,y:.27});
assert.equal(C.fit([{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0}],a),null);
assert.equal(C.fit(a,[...a.slice(0,3),{x:NaN,y:0}]),null);
assert.equal(C.validQuad([{x:0,y:0},{x:1,y:1},{x:1,y:0},{x:0,y:1}]),false);
assert.equal(C.validQuad([{x:0,y:0},{x:1,y:0},{x:1,y:0},{x:0,y:1}]),false);
assert.equal(C.diamonds().length,18);assert.equal(new Set(C.diamonds().map(p=>p.id)).size,18);
// Extra rail points improve a noisy four-corner fit across the observed cloth.
const anchors=C.anchors(C.region()),noisy=anchors.map((p,i)=>{const q=C.apply(trueH,p);return {x:q.x+[5,-7,4,-3][i],y:q.y+[-6,5,-4,7][i]};});
const basic=C.fit(anchors,noisy),refs=C.diamonds(),refined=C.fit(anchors.concat(refs),noisy.concat(refs.map(p=>C.apply(trueH,p))));
function error(fit){let sum=0;for(let x=.1;x<1;x+=.1)for(let y=.1;y<1;y+=.1){const p={x,y},a=C.apply(fit.H,p),b=C.apply(trueH,p);sum+=Math.hypot(a.x-b.x,a.y-b.y);}return sum;}
assert.ok(error(refined)<error(basic));
console.log('Photo calibration: regions, perspective, orientation, refinement, and degenerate inputs passed.');
