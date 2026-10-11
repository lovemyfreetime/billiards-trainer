const assert=require('node:assert/strict'),filter=require('../photo-table-spots.js');
function image(radius,dotRadius=radius*.20,lines=true,color=[65,55,45],dot=true){
 const width=96,height=96,data=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const d=Math.hypot(x-47.5,y-47.5);let p=[12,145,190];
  if(lines&&(Math.abs(x-47.5)<.8||Math.abs(y-47.5)<.8))p=[8,73,93];
  if(d<=radius)p=color;
  if(dot&&d<=dotRadius)p=[245,245,235];
  const i=(y*width+x)*4;data.set([...p,255],i);
 }
 return {width,height,data};
}
assert.equal(filter.nearSpot(.25,.5),true);assert.equal(filter.nearSpot(.75,.5),true);
assert.equal(filter.nearSpot(.5,.5),false);assert.equal(filter.nearSpot(.25,.1),false);
for(const radius of [8,10,13,16])assert.equal(filter.inspect(image(radius),48).isSpot,true,'small spot '+radius);
// A real 8-ball on either spot, including a plain white number patch, survives.
for(const radius of [20,24,28])assert.equal(filter.inspect(image(radius,radius*.3,false,[15,15,18]),48).isSpot,false,'8 ball '+radius);
assert.equal(filter.inspect(image(24,24,false,[245,245,230]),48).isSpot,false,'cue ball');
assert.equal(filter.inspect(image(24,5,false,[210,35,25]),48).isSpot,false,'colored ball');
assert.equal(filter.inspect(image(12,2,true,[40,40,40],false),48).isSpot,false,'no white dot');
assert.equal(filter.inspect(image(12,9),48).isSpot,false,'large white patch');
assert.equal(filter.inspect(image(12),8).isSpot,false,'too few source pixels');
assert.equal(filter.inspect({width:0,height:0,data:[]},48).isSpot,false);
console.log('Table spot tests passed: small centered spots rejected; full-sized 8/cue/colored balls and ambiguous patterns retained.');
// Exercise the actual native-pixel sampling adapter under perspective, rotation
// and partial-table calibration. A real ball at the same spot must remain.
const fs=require('node:fs'),vm=require('node:vm'),C=require('../photo-calibration.js');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
function source(name){const start=html.indexOf('    function '+name+'(');return html.slice(start,html.indexOf('\n    function ',start+10));}
const env={window:{BilliardsTableSpots:filter},S:{tableL:2,tableW:1,ballR:.025},photoVision:{},pvCalibration(){return env.fit;}};vm.createContext(env);
for(const name of ['applyHomography','pvIsTableSpot'])vm.runInContext(source(name),env);
for(const H of [[1500,0,70,0,760,70,0,0,1],[1250,280,70,-80,560,120,.25,.13,1],[0,-760,900,1500,0,70,0,0,1]]){
 env.fit={H};const inverse=C.inverse(H),width=1700,height=1700;
 for(const radius of [.5,1]){
  const data=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const q=C.apply(inverse,{x,y}),dx=(q.x-.75)*2/.025,dy=(q.y-.5)/.025,r=Math.hypot(dx,dy);
   const p=r<radius*.2?[245,245,235]:r<radius?[35,30,25]:[12,145,190];data.set([...p,255],(y*width+x)*4);
  }
  env.photoVision.analysisCanvas={width,height};
  env.photoVision.analysisCtx={getImageData(x,y,w,h){const d=new Uint8ClampedArray(w*h*4);for(let yy=0;yy<h;yy++)d.set(data.subarray(((y+yy)*width+x)*4,((y+yy)*width+x+w)*4),yy*w*4);return {width:w,height:h,data:d};}};
  assert.equal(env.pvIsTableSpot(.75,.5),radius===.5,'perspective spot / real eight ball');
  assert.equal(env.pvIsTableSpot(.5,.5),false,'position alone never removes a candidate');
 }
}
console.log('Native pixel adapter passed: perspective and rotated views reject a small spot and retain a full-sized eight ball at the identical location.');
