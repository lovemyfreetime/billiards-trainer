const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
function source(name){const start=html.indexOf('    function '+name+'(');assert.ok(start>0);return html.slice(start,html.indexOf('\n    function ',start+10));}
const balls=[{id:'ignore',nx:.1,ny:.2},{id:'ignore',nx:.6,ny:.5},{id:'8',nx:.8,ny:.7}];
const state={corners:[{},{},{},{}],detections:balls,viewZoom:1,displayScaleX:1,displayScaleY:1};
let focused=0,listRenders=0,photoRenders=0;
const row={getBoundingClientRect:()=>({top:600}),querySelector:()=>({focus(opts){assert.equal(opts.preventScroll,true);focused++;}})};
const pane={scrollTop:0,getBoundingClientRect:()=>({top:100}),querySelector:()=>({getBoundingClientRect:()=>({height:90})})};
const env={S:{ballR:.02,tableL:1,tableW:1},photoVision:state,pvReviewSeq:1,pvCalibration:()=>({H:[]}),applyHomography:(_,x,y)=>({x:x*1000,y:y*500}),pvSourceToCanvas:p=>p,
 $:id=>id==='photoAnalyzerCanvas'?{width:1000,getBoundingClientRect:()=>({width:500})}:{querySelector:selector=>{assert.ok(selector.includes(state.reviewFocusKeys[0]));return row;}},
 document:{querySelector:()=>pane},renderPhotoDetectionList(){listRenders++;},renderPhotoAnalyzer(){photoRenders++;}};
vm.createContext(env);for(const name of ['pvReviewKey','pvPhotoMarkerRadius','pvPhotoDetectionHit','pvFocusPhotoDetection'])vm.runInContext(source(name),env);
assert.equal(env.pvPhotoDetectionHit({x:600,y:250}),balls[1]);
assert.equal(env.pvPhotoDetectionHit({x:100,y:100}),balls[0]);
assert.equal(env.pvPhotoDetectionHit({x:400,y:400}),null);
const original=JSON.stringify(balls.map(d=>[d.id,d.nx,d.ny]));
env.pvFocusPhotoDetection(balls[1]);
assert.equal(state.reviewFocusKeys[0],env.pvReviewKey(balls[1]));assert.equal(focused,1);
assert.equal(pane.scrollTop,402,'The matching row is positioned below the sticky summary');
assert.equal(state.viewZoom,2.5);assert.equal(state.viewCenterX,600);assert.equal(state.viewCenterY,250);
assert.equal(JSON.stringify(balls.map(d=>[d.id,d.nx,d.ny])),original,'Reviewing never changes identities or table positions');
state.viewZoom=4;env.pvFocusPhotoDetection(balls[2]);assert.equal(state.viewZoom,4);
assert.notEqual(env.pvReviewKey(balls[0]),env.pvReviewKey(balls[1]),'Each unassigned detection has its own shortcut');
balls.splice(1,1);env.pvFocusPhotoDetection({id:'8'});assert.equal(listRenders,2);assert.equal(photoRenders,2);
state.corners=[];assert.equal(env.pvPhotoDetectionHit({x:100,y:100}),null);
console.log('Review navigation distinguishes unassigned balls, focuses the matching row, centers photo zoom, and preserves calibration and identities.');
