const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('trainer-3d.js','utf8'),orbit=require('../table-orbit.js');
const helpers=source.slice(source.indexOf(' function viewTangent('),source.indexOf(' function disable('));
const c={window:{BilliardsTableOrbit:orbit},document:{getElementById:()=>({getBoundingClientRect:()=>({width:1365,height:700})}),body:{classList:{contains:()=>false}}},stage:{},innerWidth:1365,active:true,lastFrame:{L:2.54,W:1.27,R:.028575,aim:{cue:{x:.3,y:.4},target:{x:1.8,y:.8}}},cameraState:{},viewPreset:null,fullSide:0,cueWide:false,clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),requestRender(){}};
vm.createContext(c);vm.runInContext(helpers,c);const copy=()=>JSON.parse(JSON.stringify(c.cameraState));
c.standing();const a=copy();c.standing(true);const b=copy();assert.equal(b.azimuth,a.azimuth+Math.PI);assert.equal(b.radius,a.radius);assert.equal(b.elevation,a.elevation);c.standing(true);assert.deepEqual(copy(),a);
c.alongShot(true);const near=copy();c.alongShot(true);const wide=copy();assert(Math.abs(wide.radius-near.radius*1.15**5)<1e-10);assert.equal(wide.elevation,near.elevation);assert.equal(wide.azimuth,near.azimuth);assert.deepEqual(wide.target,near.target);c.alongShot(true);assert.deepEqual(copy(),near);c.standing(true);assert.equal(c.cameraState.azimuth,0);c.alongShot(true);assert.deepEqual(copy(),near);
console.log('Opposite long-rail Full View and repeat Cue View five-step zoom preserve angle, target and scene.');
