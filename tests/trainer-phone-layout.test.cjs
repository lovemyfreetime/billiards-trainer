const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
function extract(name){const a=html.indexOf('function '+name+'('),b=html.indexOf('{',a);assert(a>=0,name);let d=0;for(let i=b;i<html.length;i++){if(html[i]==='{')d++;if(html[i]==='}'&&--d===0)return html.slice(a,i+1);}throw Error(name);}
const A={width:2530,height:1380,x0:109,x1:2421,y0:110,y1:1270};
const c={canvas:{width:696,height:201},DPR:1,S:{tableL:2,tableW:1,ballR:.03,shot2Enabled:false,sideSpin:0},ORIGINAL_ASSET_GEOM:A,document:{body:{classList:{contains:k=>k==='phone-layout'}}}};
vm.createContext(c);vm.runInContext(extract('controlMap'),c);
for(const [w,h] of [[430,162],[580,162],[696,201],[915,334],[390,660]])for(const dual of [false,true]){
 c.canvas.width=w;c.canvas.height=h;c.S.shot2Enabled=dual;const m=c.controlMap(),tl=m.map({x:-2*A.x0/2312,y:-A.y0/1160}),br=m.map({x:2*(2530-109)/2312,y:(1380-110)/1160});
 const left=w>h&&w>600?168:126,right=dual?left:12,top=w>h&&h<260?32:42;
 assert(tl.x>=left-1e-6&&br.x<=w-right+1e-6,'Artwork clears visible control banks');assert(tl.y>=top-1e-6&&br.y<=h-26+1e-6,'Artwork clears tools and dropped balls');
 const p={x:.31,y:.72},q=m.inv(m.map(p));assert(Math.hypot(q.x-p.x,q.y-p.y)<1e-10,'Touch coordinates match resized table');
 assert(Math.abs((m.corners[1].x-m.corners[0].x)/(m.corners[3].y-m.corners[0].y)-2)<1e-9,'Playing surface keeps its 2:1 shape');
}
c.canvas.width=696;c.canvas.height=201;c.S.shot2Enabled=false;assert(c.controlMap().scale>1.25*((179-42-26)/(A.height/1160)),'Short browser view gains at least 25% table size');
let direction={x:1,y:0},paths=[];c.isProjector=false;c.cueBall=()=>({x:.7,y:.4});c.aimDirection=()=>direction;c.strikeDirection=()=>direction;c.cueVisualsVisible=()=>false;c.pathPoly=points=>paths.push(points);c.extendedAimEnd=()=>{throw Error('Phone aiming must stop at the rail')};
vm.runInContext(extract('rayEnd')+extract('drawAim'),c);
for(const [x,y]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1]]){direction={x,y};paths=[];c.drawAim(p=>p);const end=paths[0][1];assert(end.x>=0&&end.x<=2&&end.y>=0&&end.y<=1,'Phone aim line stays on the playing surface');}
console.log('Trainer phone: 5 viewports, both shot modes, safe toolbar/tray bounds, exact touch mapping, larger short-screen table and rail-bounded aim pass.');
