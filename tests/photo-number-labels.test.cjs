const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8'),start=html.indexOf('    function pvPhotoNumberLabels('),end=html.indexOf('\n    function ',start+10);
assert(start>0);const env={Math};vm.createContext(env);vm.runInContext(html.slice(start,end),env);
const scenes=[
 [{x:100,y:100,r:12},{x:300,y:200,r:20},{x:600,y:350,r:8}],
 [{x:12,y:12,r:10},{x:788,y:12,r:10},{x:788,y:488,r:10},{x:12,y:488,r:10}],
 [{x:200,y:200,r:12},{x:228,y:200,r:12},{x:214,y:225,r:12},{x:242,y:225,r:12}]
];
for(const scene of scenes){
 const points=scene.map((p,i)=>({...p,key:'ball-'+i})),original=JSON.stringify(points),labels=env.pvPhotoNumberLabels(points,800,500);
 assert.equal(JSON.stringify(points),original,'Label layout cannot move the balls');
 assert.equal(labels.length,points.length);
 for(let i=0;i<labels.length;i++){
  const l=labels[i];assert(l,'Each visible ball gets a label');assert.equal(l.key,points[i].key);
  assert(l.x-l.r>=0&&l.y-l.r>=0&&l.x+l.r<=800&&l.y+l.r<=500,'Badge stays in the image');
  for(const p of points)assert(Math.hypot(l.x-p.x,l.y-p.y)>=l.r+p.r+3.9,'Number badge stays outside every ball');
  for(const other of labels.slice(0,i))assert(Math.hypot(l.x-other.x,l.y-other.y)>=l.r+other.r+3.9,'Number badges stay separate');
 }
}
console.log('Photo number labels: outside balls, separate, within image edges, and positions/identities preserved.');
