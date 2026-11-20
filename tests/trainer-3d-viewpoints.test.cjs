const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('trainer-3d.js','utf8'),orbit=require('../table-orbit.js');
const helpers=source.slice(source.indexOf(' function viewTangent('),source.indexOf(' function disable('));
const c={transitionFrom(){},window:{BilliardsTableOrbit:orbit,BilliardsTableConstruction:require('../trainer-table-construction.js')},document:{getElementById:()=>({getBoundingClientRect:()=>({width:1365,height:700})}),body:{classList:{contains:()=>false}}},stage:{},innerWidth:1365,active:true,lastFrame:{L:2.54,W:1.27,R:.028575,aim:{cue:{x:.3,y:.4},target:{x:1.8,y:.8}}},cameraState:{},previousCueCamera:null,viewLocked:false,clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),requestRender(){}};
c.closeNextView=()=>{};
vm.createContext(c);vm.runInContext(helpers,c);const copy=()=>JSON.parse(JSON.stringify(c.cameraState));
for(const [heading,expected] of [[0,0],[.37,0],[1.42,0],[Math.PI/2,0],[-Math.PI/2,0],[1.82,Math.PI],[Math.PI,Math.PI],[-1.81,Math.PI],[7.75,0],[-9.5,Math.PI]]){
 c.cameraState.azimuth=heading;c.standing();const first=copy();
 assert.equal(first.azimuth,expected);
 assert.deepEqual(first.target,{x:0,y:0,z:0});
 const rail=c.window.BilliardsTableConstruction.railWidth, halfLength=c.lastFrame.L/2+rail, halfWidth=c.lastFrame.W/2+rail;
 let maxX=0,maxY=0;
 for(const z of [-halfWidth,halfWidth])for(const height of [0,.044]){
  const aspect=1365/700,tan=orbit.viewTangent(aspect),depth=first.radius-z*Math.cos(first.elevation)-height*Math.sin(first.elevation);
  maxX=Math.max(maxX,halfLength/(depth*tan*aspect));
  maxY=Math.max(maxY,Math.abs(height*Math.cos(first.elevation)-z*Math.sin(first.elevation))/(depth*tan));
 }
 assert(maxX<=.960001 && maxY<=.880001 && (maxX>.95999 || maxY>.87999),'Whole outer rail fits and fills the limiting dimension');
 c.standing();assert.deepEqual(copy(),first);
}
console.log('Full View keeps the nearer long rail, fills the viewport and holds on a repeat tap at ten headings.');
