const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function source(name){const start=html.indexOf('    function '+name+'(');assert.ok(start>0);return html.slice(start,html.indexOf('\n    function ',start+10));}
function node(){return {dataset:{},children:[],style:{setProperty(k,v){this[k]=v;}},setAttribute(k,v){this[k]=v;},appendChild(n){this.children.push(n);},replaceChildren(){this.children=[];}};}
const strip=node(),count=node(),canvas={width:1000,height:500,getBoundingClientRect:()=>({left:20,top:30,width:500,height:250})};
const state={imageReady:true,sourceCanvas:{width:2000,height:1000},viewZoom:1,viewCenterX:1000,viewCenterY:500,corners:[{x:10,y:20}],detections:[{id:'0'},{id:'8'},{id:'ignore'}]};
function render(){const z=state.viewZoom;state.viewX=state.viewCenterX-1000/z;state.viewY=state.viewCenterY-500/z;state.displayScaleX=z/2;state.displayScaleY=z/2;}
const env={photoVision:state,$:id=>({photoAnalyzerCanvas:canvas,photoBallStrip:strip,photoBallCount:count})[id],document:{createElement:node},pvReviewKey:d=>d._reviewKey||(d._reviewKey="test"+state.detections.indexOf(d)),pvFocusPhotoDetection(){},renderPhotoAnalyzer:render};
vm.createContext(env);
for(const name of ['pvClampViewCenter','pvCanvasPixelFromClient','pvSourcePointFromClient','pvPhotoWheelZoom','renderPhotoBallSummary'])vm.runInContext(source(name),env);
render();
let prevented=0,stopped=0;
const event={clientX:320,clientY:180,deltaY:-120,deltaMode:0,preventDefault(){prevented++;},stopPropagation(){stopped++;}};
const before=env.pvSourcePointFromClient(320,180),original=JSON.stringify([state.corners,state.detections]);
env.pvPhotoWheelZoom(event);
assert.ok(state.viewZoom>1);const after=env.pvSourcePointFromClient(320,180);
assert.ok(Math.abs(before.x-after.x)<1e-8&&Math.abs(before.y-after.y)<1e-8,'Zoom keeps the photo point under the cursor');
assert.equal(prevented,1);assert.equal(stopped,1);
for(let i=0;i<30;i++)env.pvPhotoWheelZoom(event);
assert.equal(state.viewZoom,6);
for(let i=0;i<40;i++)env.pvPhotoWheelZoom({...event,deltaY:120});
assert.equal(state.viewZoom,1);assert.equal(state.viewCenterX,1000);assert.equal(state.viewCenterY,500);
assert.equal(JSON.stringify([state.corners,state.detections]),original,'Zoom never alters calibration or ball positions');
state.imageReady=false;env.pvPhotoWheelZoom(event);assert.equal(state.viewZoom,1);
env.renderPhotoBallSummary();assert.equal(count.textContent,'3 detected · 2 assigned · 1 to review');
assert.deepEqual(strip.children.map(n=>n.textContent),['C','8','?']);
state.detections[1].id='11';env.renderPhotoBallSummary();
assert.deepEqual(strip.children.map(n=>n.textContent),['C','11','?']);assert.ok(strip.children[1].className.includes('stripe'));
state.detections[2].id='1';env.renderPhotoBallSummary();assert.equal(count.textContent,'3 detected · 3 assigned');
state.detections.splice(0,1);env.renderPhotoBallSummary();assert.equal(count.textContent,'2 detected · 2 assigned');
assert.deepEqual(strip.children.map(n=>n.textContent),['11','1']);
state.detections=[];env.renderPhotoBallSummary();assert.equal(count.textContent,'0 detected · 0 assigned');assert.equal(strip.children.length,0);
console.log('Photo wheel zoom preserves the cursor anchor and calibration; ball summary tracks assignments, stripes, deletions and reset.');
