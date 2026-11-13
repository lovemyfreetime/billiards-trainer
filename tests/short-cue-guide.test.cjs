const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('index.html','utf8');
function extract(name){const start=source.indexOf('    function '+name+'(');assert(start>=0);const begin=source.indexOf('{',start);let depth=0;for(let i=begin;i<source.length;i++){if(source[i]==='{')depth++;if(source[i]==='}'&&--depth===0)return source.slice(start,i+1);}throw Error(name);}
const c={S:{tableL:2.54,tableW:1.27,ballR:.028575},Math};vm.createContext(c);
for(const n of ['rayEnd','shortCueGuideSegment'])vm.runInContext(extract(n),c);
for(const [L,W]of [[2.54,1.27],[2.2352,1.1176],[2.1336,1.0668]]){
 Object.assign(c.S,{tableL:L,tableW:W});
 for(const cb of [{x:L/2,y:W/2},{x:.029,y:.029},{x:L-.029,y:W-.029}])for(let i=0;i<360;i+=7){
  const a=i*Math.PI/180,d={x:Math.cos(a),y:Math.sin(a)},p=c.shortCueGuideSegment(cb,d);if(!p)continue;
  const [start,end]=p,dist=Math.hypot(end.x-cb.x,end.y-cb.y);
  assert(dist<=L/8+1e-10);assert(Math.abs((end.x-cb.x)*d.y-(end.y-cb.y)*d.x)<1e-10);
  assert(end.x>=-1e-10&&end.x<=L+1e-10&&end.y>=-1e-10&&end.y<=W+1e-10);
  assert(Math.hypot(start.x-cb.x,start.y-cb.y)>c.S.ballR);
  if(cb.x===L/2)assert(Math.abs(dist-L/8)<1e-10,'One diamond from center at every angle');
 }
}
console.log('Short guide: one diamond across table sizes and aim angles, aligned, outside cue ball, clipped to cloth, no position changes.');
