const assert=require('node:assert/strict'),C=require('../photo-calibration'),B=require('../photo-ball-crops');
const H=[800,60,90,40,410,80,.12,.15,1];
for(const r of [C.region('custom',4,{x0:.25,x1:.75,y0:0,y1:1}),C.region('custom',4,{x0:0,x1:.5,y0:0,y1:.5}),C.region('custom',4,{x0:.5,x1:1,y0:.5,y1:1})]){
 const a=C.anchors(r),fit=C.fit(a,a.map(p=>C.apply(H,p))),ball={x:r.x0+(r.x1-r.x0)*.6,y:r.y0+(r.y1-r.y0)*.7},q=C.apply(fit.inverse,C.apply(H,ball));
 assert.ok(Math.hypot(q.x-ball.x,q.y-ball.y)<1e-7,'Cropped image remains in full-table coordinates');
}
function patch(cx,cy,r){const w=160,data=new Uint8ClampedArray(w*w*4);for(let y=0;y<w;y++)for(let x=0;x<w;x++){const ball=Math.hypot(x-cx,y-cy)<r,i=(y*w+x)*4;data.set(ball?[230,225,220,255]:[20,95,145,255],i);}return {width:w,height:w,data};}
const actual=B.inspect(patch(80,80,22)),offset=B.inspect(patch(109,80,22));assert.ok(actual.centered);assert.ok(!offset.centered);
assert.ok(B.duplicate(offset,[{cx:109,cy:80,r:22,centered:true}]));assert.ok(!B.duplicate(actual,[{cx:109,cy:80,r:22}]));assert.ok(!B.duplicate(offset,[{cx:145,cy:80,r:22}]));
assert.equal(B.inspect(patch(300,300,1)),null);console.log('Custom middle / quarter perspectives preserve placement; cloth-centered duplicate reviews rejected and real neighboring ball retained.');
