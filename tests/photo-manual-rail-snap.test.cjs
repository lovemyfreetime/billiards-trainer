const assert=require('node:assert/strict'),cal=require('../photo-calibration'),{snap,insetFromBoundary}=require('../photo-corner-sensing');
const unit=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}],options={tableLength:2.54,tableWidth:1.27};
for(const outer of [[{x:100,y:80},{x:700,y:80},{x:700,y:380},{x:100,y:380}],[{x:190,y:60},{x:650,y:100},{x:750,y:400},{x:60,y:370}]]){
 const H=cal.fit(unit,outer),width=800,height=460,data=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const p=cal.apply(H.inverse,{x,y}),inside=p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1;
  // Loose same-colored break cloth extends across the left wood seam.
  const patch=p.x>-.12&&p.x<.04&&p.y>.35&&p.y<.55;
  data.set([...(inside||patch?[35,145,85]:[125,90,60]),255],(y*width+x)*4);
 }
 const expected=insetFromBoundary(outer,options).corners,rough=expected.map((p,i)=>({x:p.x+[10,-9,12,-8][i],y:p.y+[-12,9,-8,11][i]})),img={width,height,data};
 const before=JSON.stringify(rough),r=snap(img,rough,options);assert(r,'rough marks find local rail seams');assert.equal(r.snappedEdges,4);
 r.corners.forEach((p,i)=>assert(Math.hypot(p.x-expected[i].x,p.y-expected[i].y)<7,JSON.stringify({p,expected:expected[i]})));
 assert.equal(JSON.stringify(rough),before,'input corners not mutated');assert.deepEqual(snap(img,rough,options).corners,r.corners,'stable retry');
 const reversed=[rough[2],rough[3],rough[0],rough[1]],swapped=snap(img,reversed,options);assert(swapped);assert(Math.hypot(swapped.corners[0].x-r.corners[2].x,swapped.corners[0].y-r.corners[2].y)<4,'preserve table ends');
}
const blank={width:800,height:460,data:new Uint8ClampedArray(800*460*4).fill(100)},q=[{x:100,y:80},{x:700,y:80},{x:700,y:380},{x:100,y:380}];assert.equal(snap(blank,q,options),null,'no edge evidence never triggers global search');
// A bright cloth object well outside the search band must not attract the fit.
for(let y=5;y<45;y++)for(let x=250;x<650;x++)blank.data.set([35,145,85,255],(y*800+x)*4);
assert.equal(snap(blank,q,options),null,'remote cloth patch is ignored');
assert.equal(snap(blank,[q[0],q[2],q[1],q[3]],options),null,'crossed marks are rejected');
console.log('Rough corners, perspective, break-cloth interruptions, bounded search, repeatability and failure preservation pass.');
{
 const width=800,height=460,data=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)data.set([...(x<100||(x<=700&&y>=80&&y<=380)?[35,145,85]:[125,90,60]),255],(y*width+x)*4);
 const rough=[{x:118,y:89},{x:687,y:91},{x:688,y:368},{x:117,y:369}],r=snap({width,height,data},rough,options);assert(r);assert.equal(r.snappedEdges,3,'supported rails can snap without inventing the missing one');
 const a=rough[3],b=rough[0];for(const p of [r.corners[3],r.corners[0]])assert(Math.abs((b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x))<1e-5,'unresolved rail line stays exactly at user marks');
 console.log('Three-rail partial snap preserves the unresolved user rail line.');
}
{
 const {snapPoint}=require('../photo-corner-sensing'),corners=[{x:100,y:80},{x:700,y:80},{x:700,y:380},{x:100,y:380}],targets={corners,edges:Array.from({length:4},()=>({refined:true}))};
 assert.deepEqual(snapPoint({x:118,y:91},targets).point,corners[0],'a single rough drop snaps to intersection');
 assert.equal(snapPoint({x:400,y:230},targets),null,'never pull a distant click across the image');targets.edges[3].refined=false;
 assert.equal(snapPoint({x:118,y:91},targets),null,'both intersecting rail lines must be supported');
 console.log('Single-corner attraction is bounded and requires both adjoining rails.');
}
