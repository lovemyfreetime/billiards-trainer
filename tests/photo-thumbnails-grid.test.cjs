const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),C=require('../photo-calibration.js');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
function source(name){const start=html.indexOf('    function '+name+'(');assert.ok(start>0);return html.slice(start,html.indexOf('\n    function ',start+10));}
const photo={width:2000,height:1000},crops=[];
const env={window:{},photoVision:{imageReady:true,sourceCanvas:photo,viewZoom:1},S:{ballR:.02,tableL:1,tableW:.5},pvCalibration:()=>({H:[]}),applyHomography:(_,x,y)=>({x:x*2000,y:y*1000}),
 pvSquareCropCanvas(src,box,pad,size){assert.equal(src,photo);crops.push({box,pad,size});return {photo,box};},pvThumbFromCanvas:crop=>'photo:'+crop.box.x1};
vm.createContext(env);vm.runInContext(source('pvEnsureDetectionThumb'),env);
const d={id:'ignore',nx:.4,ny:.5};env.pvEnsureDetectionThumb(d);assert.ok(Math.abs(Number(d.thumb.slice(6))-760)<1e-8);
d.id='13';env.photoVision.viewZoom=6;env.pvEnsureDetectionThumb(d);assert.equal(crops.length,1,'Identity and zoom changes retain the same real photo crop');
const other={id:'ignore',nx:.8,ny:.2};env.pvEnsureDetectionThumb(other);assert.notEqual(d.thumb,other.thumb);
const ai={id:'ignore',thumb:'existing AI photo'};env.pvEnsureDetectionThumb(ai);assert.equal(ai.thumb,'existing AI photo');
const paths=[];let path=[],dash=[];
const ctx={save(){},restore(){},beginPath(){path=[];},moveTo(x,y){path.push({x,y});},lineTo(x,y){path.push({x,y});},closePath(){},clip(){},fill(){},stroke(){paths.push({path,dash,alpha:this.strokeStyle});},setLineDash(v){dash=v;}};
C.references(ctx,p=>p,.065);
const halves=paths.filter(p=>p.dash.length);assert.equal(halves.length,12);
assert.deepEqual(halves.slice(0,8).map(p=>p.path[0].x),[1,3,5,7,9,11,13,15].map(i=>i/16));
assert.deepEqual(halves.slice(8).map(p=>p.path[0].y),[1,3,5,7].map(i=>i/8));
assert.ok(paths.every(p=>Number(p.alpha.match(/,([^,]+)\)$/)[1])<=.065));
console.log('Real photo thumbnails persist through assignment and zoom; faint half-diamond lines subdivide each diamond square into four.');
