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
 p.outer.forEach((v,i)=>close(inverse(v),ref.outer[i]));p.sights.forEach((v,i)=>close(inverse(v),ref.sights[i]));assert(Math.abs(p.linerWidth-ref.rimWidth*L/1081)<1e-10);for(const q of p.pockets)assert.equal(q.backPath.length,q.innerBackPath.length,'Flat collar connects inner cut to cushion-registered outer edge');assert(p.edgeRadius<=.0012);
}
console.log('Zen shape reference: source hash, six measured cushion polygons, six source pocket cuts, rounded outer rail and round sight positions match at four table/ball sizes.');
const {tables:{snooker},snookerCorner}=require('../trainer-international');
const L=snooker.tableL,W=snooker.tableW,R=snooker.ballR;
const G={...snooker,type:'snooker',L,W,cornerLeg:snookerCorner.leg,
 cornerThroatInset:snookerCorner.inset,cornerJawOut:snookerCorner.out,
 sideThroat:.8*snooker.sideMouth,sideJawOut:.026*snooker.sideMouth/.120};
const construction=require('../trainer-table-construction'),table=plan({L,W,R,G});
const area=(a,b,c)=>(b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]);
for(const jaw of construction.roundedJaws(G)){
 const rows=construction.jawSections(jaw,table),first=rows[0];
 const matches=table.rails.flatMap(rail=>[0,1].map(end=>({nose:rail.at(end,0,table.noseHeight),back:rail.at(end,rail.depth,table.capHeight)})))
  .filter(end=>Math.hypot(end.nose[0]-first.nose[0],end.nose[2]-first.nose[2])<1e-7);
 assert.equal(matches.length,1);
 for(let k=0;k<3;k++)assert(Math.abs(matches[0].back[k]-first.back[k])<1e-8);
 const winding=Math.sign(area(first.nose,first.back,rows[1].nose));
 for(let i=1;i<rows.length;i++){
  const a=rows[i-1],b=rows[i];
  assert(winding*area(a.nose,a.back,b.nose)>1e-10,'Nose-side triangle folds');
  assert(winding*area(a.back,b.back,b.nose)>1e-10,'Backing-side triangle folds');
 }
}
console.log('All 12 snooker jaws meet the straight cushion profile and preserve triangle orientation.');

// Recover the actual clear width from rendered/physical vertices in world space.
const boundary=require('../trainer-snooker-boundary').prepare({...G,R},construction.roundedJaws(G),[]);
for(const pocket of table.pockets.filter(p=>p.corner)){
 const jaws=construction.roundedJaws(G).filter(j=>j.corner && j.points.every(pt=>
  Math.hypot(pt.x-L/2-pocket.origin[0],pt.y-W/2-pocket.origin[1])<.15));
 assert.equal(jaws.length,2);
 let minimum=Infinity;
 for(const a of jaws[0].points)for(const b of jaws[1].points)minimum=Math.min(minimum,Math.hypot(a.x-b.x,a.y-b.y));
 assert(Math.abs(minimum-.089)<1e-8,'Minimum physical gap between cushion noses');
 assert(Math.abs(pocket.visualMouth-.0895)<1e-8,'Width at slate fall');
 for(const t of [-.010,0,.010]){
  const edge=pocket.frontPath.map(pocket.local).filter(([v])=>v<-.004);
  const i=edge.findIndex((p,i)=>i && (edge[i-1][1]-t)*(p[1]-t)<=0);
  assert(i>0);
  const [a,b]=edge.slice(i-1,i+1),depth=a[0]+(t-a[1])/(b[1]-a[1])*(b[0]-a[0]);
  for(const [offset,inside] of [[-.0001,false],[.0001,true]]){
   const [x,,z]=pocket.at(depth+offset,t);
   assert.equal(!!boundary.pocketAt({x:x+L/2,y:z+W/2}),inside,'Capture follows the visible slate lip');
  }
 }
}
console.log('Four template-fit snooker corners passed jaw gaps, fall widths and capture crossings.');
