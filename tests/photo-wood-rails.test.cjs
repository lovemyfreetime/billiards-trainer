const assert=require('node:assert/strict'),cal=require('../photo-calibration'),{woodGuided}=require('../photo-corner-sensing');
for(const outer of [[{x:100,y:80},{x:700,y:80},{x:700,y:380},{x:100,y:380}],[{x:190,y:60},{x:650,y:100},{x:750,y:400},{x:60,y:370}]]){
 const unit=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}],H=cal.fit(unit,outer),width=800,height=460,data=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const p=cal.apply(H.inverse,{x,y}),inside=p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1;data.set([...(inside?[35,145,85]:[125,90,60]),255],(y*width+x)*4);}
 const guide=outer.map(p=>({x:p.x+5,y:p.y-6})),r=woodGuided({width,height,data},guide);assert(r,'find boundary near approximate frame');assert.equal(r.method,'wood-cloth-inset');
 const inset=.0492125,L=2.54+2*inset,W=1.27+2*inset;
 const expected=[{x:inset/L,y:inset/W},{x:1-inset/L,y:inset/W},{x:1-inset/L,y:1-inset/W},{x:inset/L,y:1-inset/W}].map(p=>cal.apply(H.H,p));
 r.corners.forEach((p,i)=>assert(Math.hypot(p.x-expected[i].x,p.y-expected[i].y)<9,'perspective-correct inset'));
 const reversed=[guide[2],guide[3],guide[0],guide[1]],swap=woodGuided({width,height,data},reversed);assert(swap);assert(Math.hypot(swap.corners[0].x-r.corners[2].x,swap.corners[0].y-r.corners[2].y)<4);
 data.fill(0);assert.equal(woodGuided({width,height,data},guide),null,'black image cannot imply rails');
}
console.log('Wood boundaries, loose frames, perspective inset, reversed orientation and missing-evidence rejection passed.');
