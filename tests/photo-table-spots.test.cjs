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
// Regression for pale/wide adhesive spots: the face is bright enough that a
// fixed white threshold used to merge it into the central dot.
const pale=image(19,3.8,true,[185,165,145]);
for(let y=0;y<96;y++)for(let x=0;x<96;x++){
 const r=Math.hypot(x-47.5,y-47.5);if(r>17.8&&r<=19)pale.data.set([228,222,212,255],(y*96+x)*4);
}
assert.equal(filter.inspect(pale,48).isSpot,true,'wide pale disc with bright rim');
assert.equal(filter.inspect(image(19,3.8,false,[20,20,22]),48).isSpot,false,'slightly smaller dark eight ball');
assert.equal(filter.inspect(image(19,3.8,false,[185,185,185]),48).isSpot,false,'bright ball body without an adhesive rim');
const offset=image(12),shifted=image(0,0,false,[12,145,190],false);
for(let y=0;y<96;y++)for(let x=0;x<88;x++)shifted.data.set(offset.data.subarray((y*96+x)*4,(y*96+x+1)*4),(y*96+x+8)*4);
assert.equal(filter.inspect(shifted,48).isSpot,true,'detector center displaced from the white dot');
assert.equal(filter.nearSpot(.30,.60),true,'imprecise perspective alignment');
console.log('Pale/wide and displaced spots rejected; smaller dark eight balls and bright ball bodies retained.');
// Foot-spot evidence supports a dot painted on cloth as well as an adhesive disc.
for(const color of [[245,245,235],[15,15,18]])for(const radius of [3,6,10])assert.equal(filter.inspectRackMark(image(radius,0,false,color,false),48).isSpot,true,'printed rack dot');
for(const radius of [19,24])assert.equal(filter.inspectRackMark(image(radius,0,false,[15,15,18],false),48).isSpot,false,'full-sized ball is not rack evidence');
assert.equal(filter.inspectRackMark(image(0,0,false,[12,145,190],false),48).isSpot,false,'empty cloth');
assert.match(filter.rackCheckMessage(true,false),/selected foot end/);
assert.match(filter.rackCheckMessage(false,true),/Flip Ends/);
assert.match(filter.rackCheckMessage(true,true),/both ends/);
assert.match(filter.rackCheckMessage(false,false),/no clear/);
assert.match(filter.rackCheckMessage(null,null),/outside/);
// Actual UI check searches both spots, skips cropped positions and caches unchanged fits.
const ui={textContent:''};env.$=()=>ui;env.photoVision.imageReady=true;env.photoVision.imageVersion=1;env.pvRegion=()=>({x0:0,x1:1,y0:0,y1:1});
vm.runInContext(source('pvCheckFootSpot'),env);
let calls=0;env.pvIsTableSpot=(x,y,check)=>{calls++;assert.equal(check,true);return Math.abs(x-.75)<.001;};
env.pvCheckFootSpot();assert.match(ui.textContent,/selected foot end/);const firstCalls=calls;env.pvCheckFootSpot();assert.equal(calls,firstCalls,'unchanged calibration avoids repeated pixel scanning');
env.pvRegion=()=>({x0:0,x1:.5,y0:0,y1:1});env.pvIsTableSpot=x=>Math.abs(x-.25)<.001;env.pvCheckFootSpot();assert.match(ui.textContent,/Flip Ends/);
env.pvRegion=()=>({x0:0,x1:.5,y0:0,y1:.25});env.pvCheckFootSpot();assert.match(ui.textContent,/outside/);
env.fit=null;env.pvCheckFootSpot();assert.match(ui.textContent,/four corners/);
console.log('Foot spot check passed: printed/adhesive dots, uncertain ends, cropped coverage and cached UI checks.');
