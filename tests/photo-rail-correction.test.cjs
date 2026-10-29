const assert=require('node:assert/strict'),cal=require('../photo-calibration'),sensing=require('../photo-corner-sensing');
const width=900,height=600,outer=[{x:190,y:60},{x:700,y:85},{x:840,y:540},{x:60,y:505}],unit=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}],H=cal.fit(unit,outer),options={tableLength:1.1176,tableWidth:2.2352},base=sensing.insetFromBoundary(outer,options),d=base.cushionInset,fx=d/(options.tableLength+2*d),fy=d/(options.tableWidth+2*d);
function scene(factors,blank=-1){
 const data=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const p=cal.apply(H.inverse,{x,y}),dist=[p.y/fy,(1-p.x)/fx,(1-p.y)/fy,p.x/fx],ts=[p.x,p.y,1-p.x,1-p.y];
  const inside=dist.every(v=>v>=0);let gain=1;
  if(inside)for(let i=0;i<4;i++)if(i!==blank){
   // Local balls and a loose cloth hide part of the true nose. A much stronger
   // parallel shadow farther into the bed must not pull this rail inward.
   if(ts[i]<.28||ts[i]>.40)gain-=.20*Math.exp(-(((dist[i]-factors[i])/.16)**2));
   gain-=.52*Math.exp(-(((dist[i]-3.05)/.18)**2));
  }
  const color=inside?[30*gain,155*gain,100*gain]:[120,85,50];data.set([...color,255],(y*width+x)*4);
 }
 return {width,height,data};
}
const factors=[.55,1.05,1.50,1.25],r=sensing.refineCushionNoses(scene(factors),base);
r.noseEvidence.forEach((e,i)=>{assert(e.refined,'visible rail '+i);assert(Math.abs(e.factor-factors[i])<.16,JSON.stringify({edge:i,actual:e.factor,expected:factors[i]}));});
const partial=sensing.refineCushionNoses(scene(factors,1),base);
assert.equal(partial.noseEvidence[1].refined,false,'blank rail retains physical estimate');
assert.equal(partial.noseEvidence[1].factor,1);
console.log('Independent perspective rail offsets recover outward and inward noses, reject distant shadows, and preserve an unsupported rail.');
for(let edge=0;edge<4;edge++){
 const moved=sensing.moveEdge(outer,edge,{x:9,y:14});assert(moved);
 for(const i of [(edge+2)%4,(edge+3)%4])assert(Math.hypot(moved[i].x-outer[i].x,moved[i].y-outer[i].y)<1e-6,'opposite rail endpoints unchanged');
 for(const i of [(edge+3)%4,(edge+1)%4])assert(Math.abs((outer[(i+1)%4].x-outer[i].x)*(moved[i].y-outer[i].y)-(outer[(i+1)%4].y-outer[i].y)*(moved[i].x-outer[i].x))<1e-6,'adjacent rail stays on its original line');
}
assert.equal(sensing.moveEdge(outer,0,{x:0,y:10000}),null,'reject crossing or excessive movement');
console.log('Whole-edge correction preserves the opposite rail and both adjacent rail lines.');
