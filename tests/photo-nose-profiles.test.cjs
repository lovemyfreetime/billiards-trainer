const assert=require('node:assert/strict'),cal=require('../photo-calibration'),sensing=require('../photo-corner-sensing');
for(const outer of [[{x:65,y:55},{x:740,y:55},{x:740,y:405},{x:65,y:405}],[{x:190,y:50},{x:630,y:90},{x:750,y:420},{x:50,y:380}]]){
 const unit=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}],H=cal.fit(unit,outer),width=800,height=460,data=new Uint8ClampedArray(width*height*4),options={tableLength:2.2352,tableWidth:1.1176},inset=sensing.insetFromBoundary(outer,options),fx=.03175/(options.tableLength+.0635),fy=.03175/(options.tableWidth+.0635),factor=1.8;
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
