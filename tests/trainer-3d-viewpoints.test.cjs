const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('trainer-3d.js','utf8'),orbit=require('../table-orbit.js');
const helpers=source.slice(source.indexOf(' function viewTangent('),source.indexOf(' function disable('));
const c={window:{BilliardsTableOrbit:orbit,BilliardsTableConstruction:require('../trainer-table-construction.js')},document:{getElementById:()=>({getBoundingClientRect:()=>({width:1365,height:700})}),body:{classList:{contains:()=>false}}},stage:{},innerWidth:1365,active:true,lastFrame:{L:2.54,W:1.27,R:.028575,aim:{cue:{x:.3,y:.4},target:{x:1.8,y:.8}}},cameraState:{},previousCueCamera:null,viewLocked:false,clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),requestRender(){}};
vm.createContext(c);vm.runInContext(helpers,c);const copy=()=>JSON.parse(JSON.stringify(c.cameraState));
for(const heading of [0,.37,Math.PI/2,2.46,Math.PI,-1.81]){
 c.cameraState.azimuth=heading;c.standing();const first=copy();
 assert.equal(first.azimuth,heading);
 for(const x of [-1.424,1.424])for(const z of [-.789,.789]){
  const along=x*Math.sin(heading)+z*Math.cos(heading),right=x*Math.cos(heading)-z*Math.sin(heading);
  const aspect=1365/700,tan=orbit.viewTangent(aspect),depth=first.radius-along*Math.cos(first.elevation);
  assert(Math.abs(right)/(depth*tan*aspect)<=.900001);
  assert(Math.abs(along*Math.sin(first.elevation))/(depth*tan)<=.840001);
 }
 c.standing();assert.deepEqual(copy(),first);
}
console.log('Full View fits the rails at six headings and repeat taps preserve orientation.');
