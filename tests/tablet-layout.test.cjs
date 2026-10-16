const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('index.html','utf8');
const start=source.indexOf('    function controlMap()');
const end=source.indexOf('    let cuePopupTimer',start);
const A={width:2530,height:1380,x0:109,x1:2421,y0:110,y1:1270};
for(const [w,h] of [[430,170],[600,275],[800,330],[390,660]])for(const shot2Enabled of [false,true]){
 const sandbox={canvas:{width:w,height:h},DPR:1,S:{tableL:2,tableW:1,shot2Enabled},ORIGINAL_ASSET_GEOM:A,document:{body:{classList:{contains:k=>k==='phone-layout'}}}};
 vm.createContext(sandbox);vm.runInContext(source.slice(start,end),sandbox);
 const M=vm.runInContext('controlMap()',sandbox),tl=M.map({x:-2*A.x0/2312,y:-A.y0/1160}),br=M.map({x:2*(2530-109)/2312,y:(1380-110)/1160});
 const left=w>h&&w>600?168:126,right=shot2Enabled?left:12;
 assert(tl.x>=left-1e-6&&br.x<=w-right+1e-6,'Artwork clears both visible control banks');
 assert(tl.y>=42-1e-6&&br.y<=h-26+1e-6,'Artwork clears toolbar and ball tray');
 assert(Math.abs((M.corners[1].x-M.corners[0].x)/(M.corners[3].y-M.corners[0].y)-2)<1e-6,'True 2:1 playfield');
 const p={x:.31,y:.72},q=M.inv(M.map(p));assert(Math.hypot(q.x-p.x,q.y-p.y)<1e-10,'Pointer coordinates match table');
 if(!shot2Enabled){sandbox.S.shot2Enabled=true;const dual=vm.runInContext('controlMap()',sandbox);assert(M.scale>=dual.scale,'Single shot reclaims unused right controls');}
}
console.log('Tablet geometry: artwork clears controls, toolbar and tray at four viewport sizes; both shot modes keep 2:1 bounds and exact pointer mapping.');
