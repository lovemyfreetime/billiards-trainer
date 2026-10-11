const assert=require('node:assert/strict'),F=require('../photo-cloth-filter'),fs=require('node:fs'),vm=require('node:vm');
function patch(ball=null,{gradient=false,line=false,noise=0,neighbor=false}={}){const width=96,height=96,data=new Uint8ClampedArray(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4,n=noise?((x*17+y*23)%7-3)*noise:0,v=gradient?(x-48)*.25+(y-48)*.13:0;let p=[25+v+n,112+v+n,155+v+n];if(ball&&Math.hypot(x-47.5,y-47.5)<24)p=ball;if(line&&Math.abs(y-48)<1)p=[235,235,235];if(neighbor&&Math.hypot(x-85,y-48)<19)p=[235,235,235];data.set([...p,255],i);}return {width,height,data};}
assert.equal(F.inspect(patch(),48).isCloth,true);
assert.equal(F.inspect(patch(null,{gradient:true,noise:1}),48).isCloth,true,'Textured cloth and a gentle lighting gradient');
for(const color of [[235,235,225],[20,20,20],[230,45,40],[30,60,160],[30,115,125]])assert.equal(F.inspect(patch(color),48).isCloth,false,'Real ball '+color);
assert.equal(F.inspect(patch(null,{line:true}),48).isCloth,false,'White string line is uncertain, not empty cloth');
assert.equal(F.inspect(patch(null,{neighbor:true}),48).isCloth,false,'Mixed neighboring background');
assert.equal(F.inspect(patch(),8).isCloth,false,'Unresolved image');
const html=fs.readFileSync('index.html','utf8'),start=html.indexOf('    function pvFilterDuplicateReviews('),end=html.indexOf('\n    function ',start+10),env={window:{BilliardsBallCrops:{duplicate:()=>false}},pvPhotoBody:()=>null,pvIsEmptyCloth:(x)=>x<.5};vm.createContext(env);vm.runInContext(html.slice(start,end),env);
const cloth={id:'ignore',nx:.2,ny:.5},real={id:'ignore',nx:.7,ny:.5},manual={id:'ignore',nx:.2,ny:.5,manual:true},assigned={id:'8',nx:.2,ny:.5};assert.deepEqual(Array.from(env.pvFilterDuplicateReviews([cloth,real,manual,assigned])),[real,manual,assigned]);
console.log('Plain/gradient felt rejected; cue, 8, colored balls, lines, neighbors, manual and assigned detections retained.');
const C=require('../photo-calibration');
function source(name){const start=html.indexOf('    function '+name+'(');return html.slice(start,html.indexOf('\n    function ',start+10));}
const native={window:{BilliardsClothFilter:F},S:{tableL:2,tableW:1,ballR:.05},photoVision:{},pvCalibration(){return native.fit},applyHomography:(H,x,y)=>C.apply(H,{x,y})};vm.createContext(native);vm.runInContext(source('pvIsEmptyCloth'),native);
for(const H of [[900,0,30,0,450,30,0,0,1],[810,100,50,-25,450,80,.15,.06,1],[0,-450,550,900,0,30,0,0,1]]){
 native.fit={H};const inverse=C.inverse(H),width=1000,height=1000;
 for(const ball of [false,true]){const data=new Uint8ClampedArray(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const q=C.apply(inverse,{x,y}),isBall=ball&&Math.hypot((q.x-.5)*2,q.y-.5)<.05;data.set(isBall?[235,235,230,255]:[25,112,155,255],(y*width+x)*4);}
 native.photoVision.analysisCanvas={width,height};native.photoVision.analysisCtx={getImageData(x,y,w,h){const out=new Uint8ClampedArray(w*h*4);for(let yy=0;yy<h;yy++)out.set(data.subarray(((yy+y)*width+x)*4,((yy+y)*width+x+w)*4),yy*w*4);return{width:w,height:h,data:out};}};
 assert.equal(native.pvIsEmptyCloth(.5,.5),!ball,'Native perspective/rotation sampling keeps ball and rejects cloth');}
}
console.log('Native sampling passed for straight, oblique, and rotated photographs.');
