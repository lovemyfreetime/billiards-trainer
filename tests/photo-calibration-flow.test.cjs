// Exercises the actual UI handlers with lightweight DOM/canvas stubs; does not verify browser rendering.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const C=require('../photo-calibration.js');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
function source(name,next){const start=html.indexOf('    function '+name+'(');assert.ok(start>0);return html.slice(start,html.indexOf(next||'\n    function ',start+10));}
const controls=new Map();function $(id){if(!controls.has(id))controls.set(id,{id,value:'',innerHTML:'',textContent:'',disabled:false,hidden:false,events:{},classList:{remove(){},toggle(){}},setAttribute(k,v){this[k]=v},addEventListener(k,f){this.events[k]=f}});return controls.get(id);}
const image={width:1000,height:700},pixels=new Uint8ClampedArray(image.width*image.height*4).fill(90);
const state={imageReady:true,regionEnd:'full',regionDiamonds:4,corners:[],refinements:[],refining:false,pendingDiamond:null,calibrationCache:null,detections:[],imageVersion:1,sourceCanvas:image,analysisCanvas:image,sourceCtx:{getImageData:()=>({data:pixels})},analysisCtx:{getImageData:()=>({data:pixels})}};
const sandbox={window:{BilliardsPhotoCalibration:C},photoVision:state,S:{tableL:2,tableW:1},$,console,renderPhotoDetectionList(){},renderPhotoAnalyzer(){},pvSourceToCanvas:p=>p,document:{createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})}};
vm.createContext(sandbox);
vm.runInContext(source('pvRegion','    function pvStatus(').replace(/const photoCal[^\n]+\n/,''),sandbox); // These functions refer to the declared module below.
vm.runInContext('const photoCal=window.BilliardsPhotoCalibration;',sandbox);
for(const name of ['pvStatus','pvResetDetectionsAndCorners','pvHandlePhotoTap','applyHomography','warpPhotoTopDown'])vm.runInContext(source(name),sandbox);
vm.runInContext(source('imagePointToNormalized','    // ================== END PHOTO ANALYZER'),sandbox);
sandbox.pvSetupCalibration();assert.equal($('photoRefineAlignment').disabled,true);
const H=[720,80,100,30,380,90,.1,.1,1];
for(const end of ['full','head','foot']){
 $('photoRegion').value=end;$('photoRegion').events.change();
 if(end!=='full'){$('photoRegionExtent').value='4';$('photoRegionExtent').events.input();}
 assert.equal(state.corners.length,0);assert.equal($('photoAnalyzeNow').disabled,true);
 const r=C.region(end,4);for(const p of C.anchors(r))sandbox.pvHandlePhotoTap(C.apply(H,p));
 assert.equal($('photoAnalyzeNow').disabled,false);assert.equal($('photoRefineAlignment').disabled,false);
 const ball={x:(r.x0+r.x1)/2,y:.6},photo=C.apply(H,ball),q=sandbox.imagePointToNormalized(photo);
 assert.ok(Math.hypot(q.x-ball.x,q.y-ball.y)<1e-7);
 state.addMissedMode=true;sandbox.pvHandlePhotoTap(photo);assert.equal(state.detections.length,1);assert.ok(Math.abs(state.detections[0].nx-ball.x)<1e-7);
 const warp=sandbox.warpPhotoTopDown(80,40);assert.equal(warp.canvas.width,Math.round(80*(r.x1-r.x0)));assert.equal(warp.canvas.height,40);
 $('photoRefineAlignment').events.click();assert.equal(state.refining,true);assert.equal(state.addMissedMode,false);
 const diamond=C.diamonds().find(p=>p.x>=r.x0&&p.x<=r.x1);sandbox.pvSelectDiamond(diamond.id);sandbox.pvHandlePhotoTap(C.apply(H,diamond));
 assert.equal(state.refinements.length,1);assert.equal(state.pendingDiamond,null);assert.equal(state.detections.length,0);
 sandbox.pvSelectDiamond(diamond.id);sandbox.pvHandlePhotoTap(C.apply(H,diamond));assert.equal(state.refinements.length,1);
 assert.equal($('photoRefineClear').hidden,false);$('photoRefineClear').events.click();assert.equal(state.refinements.length,0);
 $('photoRefineAlignment').events.click();assert.equal(state.refining,false);
 if(end!=='full'){$('photoRegionExtent').value='5';$('photoRegionExtent').events.input();assert.equal(state.corners.length,0);assert.equal($('photoAnalyzeNow').disabled,true);}
}
// Crossing corners must never enable analysis/refinement.
sandbox.pvResetDetectionsAndCorners();for(const p of [{x:0,y:0},{x:100,y:100},{x:100,y:0},{x:0,y:100}])sandbox.pvHandlePhotoTap(p);
assert.equal($('photoAnalyzeNow').disabled,true);assert.equal($('photoRefineAlignment').disabled,true);
console.log('UI handler flow passed: region changes → clockwise marks → cropped warp → full-table ball coordinates → diamond refinement → clear/reset.');
