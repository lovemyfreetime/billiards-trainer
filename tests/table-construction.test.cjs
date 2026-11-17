const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),{plan}=require('../trainer-table-construction.js'),ref=require('../trainer-zen-shapes.js');
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(ref.source)).digest('hex'),ref.sha256,'Contours belong to the unchanged Zen asset');
assert.deepEqual(ref.registration,{width:1678,height:937,x0:298,x1:1379,y0:120,y1:650});
assert.deepEqual(ref.rails[0],{fore:[[337,120],[806,120]],back:[[315,98],[814,98]],pocket:2},'Measured Zen top-left cushion anchors');
assert.deepEqual(ref.outer[0],[286,58]);assert.equal(ref.sights.length,18);
for(const p of ref.pockets)assert(p.fitMedianErrorPixels<1.5,'Visible cut-edge fit within the source pixel resolution');
for(const [L,W,R]of [[2.54,1.27,.028575],[2.2352,1.1176,.028575],[2.032,1.016,.028575],[2.54,1.27,.02625]]){
 const p=plan({L,W,R});assert.equal(p.pockets.length,6);assert.equal(p.rails.length,6);assert.equal(p.noseHeight,2*R*.635);
 const inverse=v=>[(v[0]+L/2)/L*1081+298,(v[2]+W/2)/W*530+120];
 const close=(a,b)=>a.forEach((v,i)=>assert(Math.abs(v-b[i])<1e-8));
 p.rails.forEach((r,i)=>{for(const end of [0,1]){close(inverse(r.at(end,0,p.noseHeight)),ref.rails[i].fore[end]);close(inverse(r.at(end,r.depth,p.capHeight)),ref.rails[i].back[end]);}assert(r.depth>.035&&r.depth<.06);});
 p.pockets.forEach((q,i)=>{assert(q.backPath.length>20&&q.frontPath.length>20);close(inverse(q.center),ref.pockets[i].centre);q.contour.forEach((v,j)=>close(inverse(v),ref.pockets[i].contour[j]));assert(q.visualMouth>2*R);assert(q.frontPath.every(v=>v[1]===0));});
 p.outer.forEach((v,i)=>close(inverse(v),ref.outer[i]));p.sights.forEach((v,i)=>close(inverse(v),ref.sights[i]));assert(p.linerWidth<.007);assert(p.edgeRadius<=.0012);
}
console.log('Zen shape reference: source hash, six measured cushion polygons, six source pocket cuts, rounded outer rail and round sight positions match at four table/ball sizes.');
