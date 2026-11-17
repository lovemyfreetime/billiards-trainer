const assert=require('node:assert/strict'),{plan}=require('../trainer-table-construction.js');
for(const [L,W,R]of [[2.54,1.27,.028575],[2.2352,1.1176,.028575],[2.032,1.016,.028575],[2.54,1.27,.02625]]){
 const p=plan({L,W,R});assert.equal(p.pockets.length,6);assert.equal(p.rails.length,6);
 assert(p.railWidth>=.1016&&p.railWidth<=.1905);assert.equal(p.noseHeight,2*R*.635);assert(p.cushionWidth>=.0476&&p.cushionWidth<=.054);assert(p.profile.length>5);
 for(const r of p.rails){for(const [end,q]of [[0,r.a],[1,r.b]]){const nose=r.at(end,0,p.noseHeight);assert(Math.hypot(nose[0]-q[0],nose[2]-q[1])<1e-10,'Nose exactly on the simulation boundary');const limit=end?r.bOut:r.aOut,a=r.at(end,limit,p.noseHeight),b=r.at(end,p.cushionWidth,p.noseHeight);assert(Math.abs((a[0]-b[0])*r.u[0]+(a[2]-b[2])*r.u[1])<1e-10,'Facing stops tapering at the real jaw endpoint');}assert(r.length>0);assert(r.sa<0&&r.sb>0,'Both facings taper back into the rail');}
 assert(p.linerWidth<=.006&&p.linerInset<.001,'Small flat boot with submillimetre intrusion');assert(p.edgeRadius<=.0012,'Fine cloth roll, no thick welt');
 for(const v of p.pockets){assert(v.backPath.length>40,'Curved boot at every pocket');assert(Math.abs(v.ellipse(Math.PI)[0]-v.at(v.front+v.shelf,0)[0])<1e-9);assert(v.shelf>0);assert(v.corner?v.shelf>=.0254&&v.shelf<=.05715:v.shelf<=.009525);for(let i=0;i<96;i++){const q=v.ellipse(i*Math.PI/48);assert(Math.abs(q[0])<L/2+p.railWidth&&Math.abs(q[2])<W/2+p.railWidth,'Drop remains inside the actual table case');}}
}
console.log('Construction geometry: six curved slate cuts, real shelves, 63.5%-diameter noses, tapered facings, rail widths and invariant collision endpoints passed.');
