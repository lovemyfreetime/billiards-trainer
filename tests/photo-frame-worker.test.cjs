const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const width=800,height=460,data=new Uint8ClampedArray(width*height*4);
for(let y=0;y<height;y++)for(let x=0;x<width;x++)data.set(x>100&&x<700&&y>80&&y<380?[35,145,85,255]:[125,90,60,255],(y*width+x)*4);
let result;const context=vm.createContext({Uint8Array,Uint8ClampedArray,Float32Array,Float64Array,console});context.self=context;context.postMessage=value=>result=structuredClone(value);context.importScripts=(...paths)=>paths.forEach(path=>vm.runInContext(fs.readFileSync(path,'utf8'),context));
vm.runInContext(fs.readFileSync('photo-frame-worker.js','utf8'),context);
context.onmessage({data:{img:{width,height,data},quad:[{x:100,y:80},{x:700,y:80},{x:700,y:380},{x:100,y:380}],options:{tableLength:2.54,tableWidth:1.27,parallelRails:true}}});
assert.equal(result.error,undefined);assert.equal(result.evidence.method,'wood-cloth-inset');assert.equal(result.evidence.corners.length,4);assert(result.evidence.noseEvidence.every(e=>e.slope===0));
context.onmessage({data:{img:{width,height,data},quad:[null,null,null,null]}});assert.equal(typeof result.error,'string','worker failures return an actionable error instead of hanging');
console.log('Worker imports, image transfer, perspective rail fit and failure response passed.');
