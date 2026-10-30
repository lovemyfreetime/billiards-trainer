const assert=require('node:assert/strict'),cal=require('../photo-calibration'),sensing=require('../photo-corner-sensing');
for(const outer of [[{x:65,y:55},{x:740,y:55},{x:740,y:405},{x:65,y:405}],[{x:190,y:50},{x:630,y:90},{x:750,y:420},{x:50,y:380}]]){
 const unit=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}],H=cal.fit(unit,outer),width=800,height=460,data=new Uint8ClampedArray(width*height*4),options={tableLength:2.2352,tableWidth:1.1176},inset=sensing.insetFromBoundary(outer,options),d=.0492125,fx=d/(options.tableLength+2*d),fy=d/(options.tableWidth+2*d),factor=1.8;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const p=cal.apply(H.inverse,{x,y}),d=Math.min(p.x/fx,(1-p.x)/fx,p.y/fy,(1-p.y)/fy),inside=d>=0;
  // Bright cushion, darker bed and a narrow nose shadow: the previous detector
  // only accepted the opposite brightness step and missed this boundary.
  const gain=inside?(d<factor?1.12:1)-.55*Math.exp(-(((d-factor)/.20)**2)):0;
  const color=inside?[25*gain,140*gain,195*gain]:[110,70,40];data.set([...color,255],(y*width+x)*4);
 }
 const r=sensing.refineCushionNoses({width,height,data},inset),expected=[{x:fx*factor,y:fy*factor},{x:1-fx*factor,y:fy*factor},{x:1-fx*factor,y:1-fy*factor},{x:fx*factor,y:1-fy*factor}].map(p=>cal.apply(H.H,p));
 assert(r.noseEvidence.every(e=>e.refined),'all four nose shadows supported');
 r.corners.forEach((p,i)=>assert(Math.hypot(p.x-expected[i].x,p.y-expected[i].y)<3,JSON.stringify({p,expected:expected[i]})));
 const again=sensing.refineCushionNoses({width,height,data},inset);assert.deepEqual(again,r,'same source and boundary produce identical corners');
}
console.log('Perspective nose shadows, reversed brightness and deterministic repeat sensing passed.');
// A lengthwise image starts with a short top edge. Reorder the detected outer
// seam before calculating any physical distances, rather than rotating the
// already-inset result afterward.
{
 const {scene}=require('./photo-corner-sensing.test.cjs');
 const image=scene([{x:270,y:30},{x:460,y:40},{x:530,y:440},{x:190,y:430}]);
 const r=sensing.calibrate(image,null,{tableLength:2.54,tableWidth:1.27});
 assert(r,'portrait outline found');
 const q=r.boundaryCorners,length=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 assert(length(q[0],q[1])+length(q[2],q[3])>length(q[1],q[2])+length(q[3],q[0]),'table length is fitted to long rails before insetting');
 const expected=sensing.insetFromBoundary([{x:460,y:40},{x:530,y:440},{x:190,y:430},{x:270,y:30}],{tableLength:2.54,tableWidth:1.27});
 r.boundaryCorners.forEach((p,i)=>assert(Math.hypot(p.x-expected.boundaryCorners[i].x,p.y-expected.boundaryCorners[i].y)<3,'precise boundary stays near actual seam'));
 r.corners.forEach((p,i)=>assert(Math.hypot(p.x-expected.corners[i].x,p.y-expected.corners[i].y)<3,'portrait physical inset uses the correct axis'));
 console.log('Lengthwise photo calibration applies length/width before the physical inset.');
}
// Faint, broad nose shadows need a wider probe; small angle differences must
// adjust endpoints instead of shifting the whole rail by one constant amount.
{
 const width=800,height=460,outer=[{x:100,y:60},{x:700,y:60},{x:700,y:390},{x:100,y:390}],options={tableLength:2.54,tableWidth:1.27},base=sensing.insetFromBoundary(outer,options),d=base.cushionInset,fx=d/(options.tableLength+2*d),fy=d/(options.tableWidth+2*d),data=new Uint8ClampedArray(width*height*4);
 const slopes=[.4,-.4,.2,-.2],factor=1.7;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const u=(x-100)/600,v=(y-60)/330,inside=u>=0&&u<=1&&v>=0&&v<=1;
  const offsets=[v/fy-factor-slopes[0]*(u-.5),(1-u)/fx-factor-slopes[1]*(v-.5),(1-v)/fy-factor-slopes[2]*(.5-u),u/fx-factor-slopes[3]*(.5-v)];
  const shadow=Math.max(...offsets.map(z=>Math.exp(-((z/.55)**2)))),gain=1-.065*shadow,color=inside?[35*gain,145*gain,195*gain]:[125,90,60];data.set([...color,255],(y*width+x)*4);
 }
 const result=sensing.refineCushionNoses({width,height,data},base);assert(result.noseEvidence.every(e=>e.refined),'all four broad faint noses found');
 result.noseEvidence.forEach((e,i)=>{assert(Math.abs(e.factor-factor)<=.11,'faint nose offset');assert(Math.abs(e.slope-slopes[i])<=.21,'small rail angle recovered')});
 const locked=sensing.refineCushionNoses({width,height,data},base,{parallelRails:true});
 assert(locked.noseEvidence.every(e=>e.refined&&e.slope===0),'frame fitting retains detected offsets with shared rail directions');
 assert(Math.abs(locked.corners[0].y-locked.corners[1].y)<1e-6,'top nose follows the outer rail');
 assert(Math.abs(locked.corners[1].x-locked.corners[2].x)<1e-6,'side nose follows the outer rail');
 console.log('Broad low-contrast noses and perspective rail-direction constraint pass.');
}
