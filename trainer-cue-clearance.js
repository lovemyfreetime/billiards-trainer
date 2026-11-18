/* Shared physical cue envelope against the table's actual Zen-derived construction.
 * Metres throughout. Compliance caps are selected simulation allowances, not a
 * measurement of a particular rubber compound. Wood and slate never compress. */
(function(root){
 'use strict';
 const construction=typeof module==='object'&&module.exports?require('./trainer-table-construction.js'):root.BilliardsTableConstruction;
 const LENGTH=58*.0254,ALLOWANCE=Object.freeze({cushion:.009,pocket:.0045,wood:0,slate:0});
 const PROFILE=Object.freeze([[0,0],[.0006,.0038],[.002,.0059],[.003,.006375],[.025,.006375],[.33,.006375],[.50,.0074],[.718,.0105],[.748,.0108],[1.05,.0132],[1.43,.015875],[LENGTH,.015875]]);
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],sub=(a,b)=>a.map((v,i)=>v-b[i]),add=(a,b,s=1)=>a.map((v,i)=>v+b[i]*s),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const square=v=>dot(v,v);
 function radius(s){for(let i=1;i<PROFILE.length;i++)if(s<=PROFILE[i][0]){const a=PROFILE[i-1],b=PROFILE[i];return a[1]+(b[1]-a[1])*clamp((s-a[0])/(b[0]-a[0]),0,1);}return PROFILE.at(-1)[1];}
 function box(points){return [0,1,2].map(i=>[Math.min(...points.map(p=>p[i])),Math.max(...points.map(p=>p[i]))]);}
 function near(a,b,r){return a.every((v,i)=>v[0]-r<=b[i][1]&&v[1]+r>=b[i][0]);}
 function inPoly(p,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[2]>p[2])!==(b[2]>p[2])&&p[0]<(b[0]-a[0])*(p[2]-a[2])/(b[2]-a[2])+a[0])yes=!yes;}return yes;}
 function pointSegment(p,a,b){const d=sub(b,a),t=clamp(dot(sub(p,a),d)/(square(d)||1),0,1);return square(sub(p,add(a,d,t)));}
 function segmentDistance(a,b,c,d){const u=sub(b,a),v=sub(d,c),w=sub(a,c),A=dot(u,u),B=dot(u,v),C=dot(v,v),D=dot(u,w),E=dot(v,w),den=A*C-B*B;let s=den>1e-20?clamp((B*E-C*D)/den,0,1):0,t=C?clamp((B*s+E)/C,0,1):0;s=A?clamp((B*t-D)/A,0,1):0;t=C?clamp((B*s+E)/C,0,1):0;return square(sub(add(a,u,s),add(c,v,t)));}
 function pointTriangle(p,a,b,c){const ab=sub(b,a),ac=sub(c,a),ap=sub(p,a),d1=dot(ab,ap),d2=dot(ac,ap);if(d1<=0&&d2<=0)return square(ap);const bp=sub(p,b),d3=dot(ab,bp),d4=dot(ac,bp);if(d3>=0&&d4<=d3)return square(bp);const vc=d1*d4-d3*d2;if(vc<=0&&d1>=0&&d3<=0)return square(sub(p,add(a,ab,d1/(d1-d3))));const cp=sub(p,c),d5=dot(ab,cp),d6=dot(ac,cp);if(d6>=0&&d5<=d6)return square(cp);const vb=d5*d2-d1*d6;if(vb<=0&&d2>=0&&d6<=0)return square(sub(p,add(a,ac,d2/(d2-d6))));const va=d3*d6-d5*d4;if(va<=0&&(d4-d3)>=0&&(d5-d6)>=0)return square(sub(p,add(b,sub(c,b),(d4-d3)/((d4-d3)+(d5-d6)))));const sum=va+vb+vc;if(Math.abs(sum)<1e-24)return Math.min(pointSegment(p,a,b),pointSegment(p,b,c),pointSegment(p,c,a));return square(sub(p,add(add(a,ab,vb/sum),ac,vc/sum)));}
 function segmentTriangle(a,b,t){const [c,d,e]=t,ab=sub(b,a),n=cross(sub(d,c),sub(e,c)),den=dot(n,ab);if(Math.abs(den)>1e-18){const f=dot(n,sub(c,a))/den;if(f>=0&&f<=1&&pointTriangle(add(a,ab,f),c,d,e)<1e-18)return 0;}return Math.min(pointTriangle(a,c,d,e),pointTriangle(b,c,d,e),segmentDistance(a,b,c,d),segmentDistance(a,b,d,e),segmentDistance(a,b,e,c));}
 function verticalInside(p,triangles){let low=Infinity,high=-Infinity;for(const [a,b,c]of triangles){const den=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);if(Math.abs(den)<1e-15)continue;const u=((b[2]-c[2])*(p[0]-c[0])+(c[0]-b[0])*(p[2]-c[2]))/den,v=((c[2]-a[2])*(p[0]-c[0])+(a[0]-c[0])*(p[2]-c[2]))/den;if(u>=0&&v>=0&&u+v<=1){const h=u*a[1]+v*b[1]+(1-u-v)*c[1];low=Math.min(low,h);high=Math.max(high,h);}}return p[1]>low&&p[1]<high;}
 function triangulate(profile){const ids=profile.map((_,i)=>i),out=[],turn=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),area=profile.reduce((n,a,i)=>{const b=profile[(i+1)%profile.length];return n+a[0]*b[1]-b[0]*a[1];},0),sign=Math.sign(area);while(ids.length>3){let cut=false;for(let j=0;j<ids.length;j++){const a=ids[(j+ids.length-1)%ids.length],b=ids[j],c=ids[(j+1)%ids.length];if(turn(profile[a],profile[b],profile[c])*sign<=1e-15)continue;if(ids.some(k=>k!==a&&k!==b&&k!==c&&[turn(profile[a],profile[b],profile[k]),turn(profile[b],profile[c],profile[k]),turn(profile[c],profile[a],profile[k])].every(v=>v*sign>=-1e-15)))continue;out.push([a,b,c]);ids.splice(j,1);cut=true;break;}if(!cut)throw Error('Invalid cushion profile');}out.push(ids);return out;}
 let cached=null,cachedKey='',solves=0;
 function geometry(f){const key=[f.L,f.W,f.R].join('/');if(key===cachedKey)return cached;const p=construction.plan(f),objects=[];
  const mesh=(material,triangles)=>{const lower=ALLOWANCE[material],shift=v=>[v[0],v[1]-lower,v[2]],soft=triangles.map(t=>t.map(shift));objects.push({material,triangles:soft,original:triangles,bounds:box(soft.flat()),boxes:soft.map(box)});};
  for(const r of p.rails){const rows=[0,1].map(end=>p.profile.map(([v,h])=>r.at(end,v*r.depth,h))),tri=[];for(let i=0;i<p.profile.length;i++){const j=(i+1)%p.profile.length;tri.push([rows[0][i],rows[1][i],rows[1][j]],[rows[0][i],rows[1][j],rows[0][j]]);} // The lower nose profile is concave; triangulate exactly as the rendered cap.
   for(const row of rows)for(const face of triangulate(p.profile))tri.push(face.map(i=>row[i]));mesh('cushion',tri);
  }
  for(const pocket of p.pockets)for(let i=0;i<pocket.backPath.length-1;i++){
   const inner=j=>{const path=pocket.innerBackPath,v=path[j],a=path[Math.max(0,j-1)],b=path[Math.min(path.length-1,j+1)],dx=b[0]-a[0],dz=b[2]-a[2],len=Math.hypot(dx,dz)||1;return [v[0]-dz/len*p.linerInset,p.capHeight+.0006,v[2]+dx/len*p.linerInset];};
   const top=[inner(i),inner(i+1),pocket.backPath[i+1].map((v,k)=>k===1?p.capHeight+.0006:v),pocket.backPath[i].map((v,k)=>k===1?p.capHeight+.0006:v)],bottom=top.map(v=>[v[0],-.025,v[2]]),tri=[[...top.slice(0,3)],[top[0],top[2],top[3]],[...bottom.slice(0,3)],[bottom[0],bottom[2],bottom[3]]];for(let j=0;j<4;j++){const k=(j+1)%4;tri.push([top[j],bottom[j],bottom[k]],[top[j],bottom[k],top[k]]);}mesh('pocket',tri);
  }
  cachedKey=key;
  const outer = planarPolygon(p.outer);
  const solidLayers = [
   {material:'wood', height:p.capHeight, outer, holes:[planarPolygon(p.inside)]},
   {material:'slate', height:0, outer, holes:p.pockets.map(q => planarPolygon(q.dropPath))}
  ];
  return cached={plan:p,objects,solidLayers};
 }
 function contact(data){return [data.x+data.R*(data.dx*data.rear-data.dy*data.sideR),data.z+data.R*data.height,data.y+data.R*(data.dy*data.rear+data.dx*data.sideR)];}
 // The union of every cue position from impact through the entire backstroke.
 // Each tapered interval is enclosed by a capsule using its larger endpoint radius.
 // At 25 mm interval length the taper overestimate is under 0.35 mm, without gaps.
 function envelope(data,backstroke=.13,follow=0){const a=data.elevation*Math.PI/180,back=[-data.dx*Math.cos(a),Math.sin(a),-data.dy*Math.cos(a)],c=contact(data),breaks=[-follow,...PROFILE.map(v=>v[0]-follow).filter(v=>v>-follow),LENGTH+backstroke];const segments=[];for(let j=1;j<breaks.length;j++){const start=breaks[j-1],end=breaks[j],count=Math.max(1,Math.ceil((end-start)/.025));for(let i=0;i<count;i++){const q=start+(end-start)*i/count,w=start+(end-start)*(i+1)/count,r=Math.max(radius(q+follow),radius(w+follow))+.00015;const u=add(c,back,q),v=add(c,back,w);segments.push({a:u,b:v,r,bounds:box([u,v])});}}return segments;}
 // Precompute planar edges once. Most shaft samples are entirely inside the
 // wood cutout or far from a pocket. Bounds reject those without vector allocation.
 function planarPolygon(points) {
  const bounds = box(points);
  const edges = points.map((a,i) => {
   const b = points[(i+1)%points.length], dx=b[0]-a[0], dz=b[2]-a[2];
   return {x:a[0],z:a[2],dx,dz,invLength2:1/(dx*dx+dz*dz||1),
    left:Math.min(a[0],b[0]),right:Math.max(a[0],b[0]),bottom:Math.min(a[2],b[2]),top:Math.max(a[2],b[2])};
  });
  return {edges,left:bounds[0][0],right:bounds[0][1],bottom:bounds[2][0],top:bounds[2][1]};
 }
 // -1 outside, 0 touching an edge, 1 inside.
 function diskLocation(x,z,r,poly) {
  if(x+r<poly.left || x-r>poly.right || z+r<poly.bottom || z-r>poly.top) return -1;
  let inside=false;
  for(const e of poly.edges) {
   if(z+r<e.bottom || z-r>e.top) continue;
   if(z>=e.bottom && z<e.top && x<e.x+(z-e.z)*e.dx/e.dz) inside=!inside;
   if(x+r<e.left || x-r>e.right) continue;
   const ax=x-e.x,az=z-e.z,t=clamp((ax*e.dx+az*e.dz)*e.invLength2,0,1);
   if((ax-t*e.dx)**2+(az-t*e.dz)**2<=r*r) return 0;
  }
  return inside?1:-1;
 }
 function hardCollision(seg,g) {
  const [x,y,z]=seg.a,dx=seg.b[0]-x,dy=seg.b[1]-y,dz=seg.b[2]-z;
  const r=Math.hypot(seg.r,.0015);
  for(const layer of g.solidLayers) {
   if(Math.min(y,seg.b[1])-r>layer.height) continue;
   if(layer.material==='wood' && seg.bounds[0][0]-r>-g.plan.L/2 && seg.bounds[0][1]+r<g.plan.L/2 &&
      seg.bounds[2][0]-r>-g.plan.W/2 && seg.bounds[2][1]+r<g.plan.W/2) continue;
   const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy,dz)/.003));
   for(let i=0;i<=steps;i++) {
    const f=i/steps,h=Math.max(0,y+dy*f-layer.height);
    if(h>r) continue;
    const px=x+dx*f,pz=z+dz*f,width=Math.sqrt(r*r-h*h);
    if(diskLocation(px,pz,width,layer.outer)>=0 && !layer.holes.some(hole=>diskLocation(px,pz,width,hole)>0)) return layer.material;
   }
  }
  return null;
 }
 function obstruction(data,g,backstroke=.13,follow=0,balls=[]){const centered={...data,x:data.x-g.plan.L/2,y:data.y-g.plan.W/2},segments=envelope(centered,backstroke,follow),whole=box(segments.flatMap(s=>[s.a,s.b])),candidates=g.objects.filter(o=>near(whole,o.bounds,.017));for(const seg of segments){const hard=hardCollision(seg,g);if(hard)return {material:hard};for(const o of candidates){if(!near(seg.bounds,o.bounds,seg.r))continue;for(let i=0;i<o.triangles.length;i++)if(near(seg.bounds,o.boxes[i],seg.r)&&segmentTriangle(seg.a,seg.b,o.triangles[i])<seg.r*seg.r)return {material:o.material};if(verticalInside(seg.a,o.triangles))return {material:o.material};}for(const b of balls)if(b.active!==false&&b.id!==data.id&&b.id!=='CB2'&&pointSegment([b.x-g.plan.L/2,b.z||data.R,b.y-g.plan.W/2],seg.a,seg.b)<(seg.r+data.R)**2)return {material:'ball',id:b.id};}return null;}
 function strokeSettings(speed=1.5,style='auto',hold=2){const scale={auto:1,short:.65,normal:1,long:1.3}[style]||1,power=clamp(speed/4,0,1);return {backstroke:clamp((.075+.09*power)*scale,.04,.22),followThrough:clamp((.055+.09*power)*scale,.025,.19),finishHold:clamp(+hold||0,.5,4),followTime:.18,withdrawTime:.24,style};}
 const results=new Map();
 function solve(data,f,settings={},balls=[]){const g=geometry(f),stroke=strokeSettings(settings.speed,settings.style,settings.hold),key=JSON.stringify([data,f.L,f.W,f.R,stroke,balls.filter(b=>b.active!==false&&b.id!==data.id).map(b=>[b.id,b.x,b.y,b.z])]);if(results.has(key))return results.get(key);solves++;
  const preferred=clamp(data.elevation||0,0,70);
  const verticalLimit=Math.sqrt(Math.max(0,.25-data.sideR**2));
  function poseAt(elevation) {
   const t=elevation*Math.PI/180,sin=Math.sin(t),cos=Math.cos(t);
   const requested=data.rear*sin+data.height*cos;
   const follow=clamp(requested,-verticalLimit,verticalLimit);
   if(Math.abs(follow-requested)<1e-10) return {...data,elevation,localFollowR:follow};
   // At the grip limit use the nearest legal contact on the raised cue face,
   // the same contact the player would obtain by raising the cue manually.
   const depth=Math.sqrt(Math.max(0,1-data.sideR**2-follow**2));
   return {...data,elevation,rear:-depth*cos+follow*sin,height:depth*sin+follow*cos,localFollowR:follow};
  }
  let resolved=poseAt(preferred);
  const hit=obstruction(resolved,g,stroke.backstroke,0,balls);
  let blocked=false;
  if(hit) {
   const clear=angle=>!obstruction(poseAt(angle),g,stroke.backstroke,0,balls);
   // A nearby object ball can close the steep end while leaving an
   // intermediate window open. Search that case before declaring it blocked.
   function upperBound() {
    if(clear(70)) return 70;
    for(let angle=preferred;angle<70;angle+=1)if(clear(angle))return angle;
    return null;
   }
   let upper=upperBound();
   if(upper===null){stroke.backstroke=.04;upper=upperBound();}
   if(upper===null) { blocked=true; resolved=poseAt(70); }
   else {
    let low=preferred,high=upper;
    if(clear(preferred)) high=preferred;
    else while(high-low>.025) {
     const mid=(low+high)/2;
     if(clear(mid)) high=mid; else low=mid;
    }
    resolved=poseAt(high);
   }
  }
  let travel=stroke.followThrough;if(!blocked&&obstruction(resolved,g,stroke.backstroke,travel,[])){let a=0,b=travel;for(let i=0;i<12;i++){const mid=(a+b)/2;if(obstruction(resolved,g,stroke.backstroke,mid,[]))b=mid;else a=mid;}travel=a;}
  const out={...resolved,blocked,preferredElevation:preferred,automatic:resolved.elevation>preferred+.025,contactLimited:Math.abs(resolved.height-data.height)>1e-8,localSideR:data.sideR,limiter:hit?.material||null,stroke:{...stroke,followThrough:travel,finishAt:stroke.followTime,withdrawAt:stroke.followTime+stroke.finishHold,hideAt:stroke.followTime+stroke.finishHold+stroke.withdrawTime},allowance:ALLOWANCE};
  if(results.size>=256)results.delete(results.keys().next().value);results.set(key,out);return out;
 }
 function planFinish(data, frames) {
  const stroke = {...data.stroke};
  const angle = data.elevation * Math.PI / 180;
  const forward = [data.dx * Math.cos(angle), -Math.sin(angle), data.dy * Math.cos(angle)];
  const impact = contact(data);
  const end = add(impact, forward, -LENGTH - stroke.backstroke);
  const reach = add(impact, forward, stroke.followThrough);
  const clearance = data.R + .003;
  const broadRadius = clearance + PROFILE.at(-1)[1] + .001;
  const nearby = [];

  // Only the initial departure of the struck ball is exempt. After separation,
  // even a sideways bank back across the shaft must be checked.
  let departed = false;
  for (let i = 1; i < frames.length; i++) {
   const previous = frames[i - 1], current = frames[i];
   const time = previous[0].t;
   if (time > stroke.hideAt) break;
   for (let j = 0; j < current.length; j++) {
    const ball = current[j];
    const last = previous[j]?.id === ball.id ? previous[j] : previous.find(p => p.id === ball.id);
    if (!last || last.active === false) continue;
    const from = [last.x, last.z ?? data.R, last.y];
    const to = [ball.x, ball.z ?? data.R, ball.y];
    if (ball.id === data.id && !departed) {
     if (dot(sub(to, from), forward) >= 0) {
      if (pointSegment(to, end, reach) > broadRadius ** 2) departed = true;
      continue;
     }
     departed = true;
    }
    if (segmentDistance(from, to, end, reach) <= broadRadius ** 2) nearby.push({time, from, to});
   }
  }
  if (!nearby.length) return stroke;

  // This envelope contains every pose from a full finish to full withdrawal.
  // Getting out before a ball reaches it also protects the butt end of the cue.
  function firstConflict(travel) {
   const segments = envelope(data, stroke.backstroke, travel);
   for (const event of nearby) {
    if (segments.some(s => segmentDistance(event.from, event.to, s.a, s.b) <= (clearance + s.r) ** 2)) return event.time;
   }
   return Infinity;
  }
  let travel = stroke.followThrough;
  let conflict = firstConflict(travel);
  if (!Number.isFinite(conflict)) return stroke;
  // A ball reversing almost at impact can enter the *planned* long finish
  // before the tip would get there. Shorten the finish first, then find the
  // deadline for that shorter stroke instead of snapping the full cue back.
  while (conflict < .24 && travel > 0) {
   travel = travel > .004 ? travel / 2 : 0;
   conflict = firstConflict(travel);
  }
  stroke.followThrough = travel;
  if (!Number.isFinite(conflict)) return stroke;
  const margin = Math.min(.04, conflict * .15);
  const available = Math.max(0, conflict - margin);
  stroke.withdrawTime = Math.min(stroke.withdrawTime, available * .65);
  stroke.withdrawAt = Math.min(stroke.withdrawAt, available - stroke.withdrawTime);
  stroke.finishAt = Math.min(stroke.finishAt, stroke.withdrawAt);
  stroke.hideAt = stroke.withdrawAt + stroke.withdrawTime;
  stroke.returnClearance = true;
  stroke.conflictAt = conflict;
  return stroke;
 }
 function depression(vertex,pose,material){if(!pose?.visible||vertex[1]<.024)return 0;const axis=pose.back,co=Math.hypot(axis[0],axis[2]);if(co<.25)return 0;const dx=vertex[0]-pose.tip[0],dz=vertex[2]-pose.tip[2],q=(dx*axis[0]+dz*axis[2])/(co*co);if(q<0||q>LENGTH)return 0;const x=pose.tip[0]+axis[0]*q,z=pose.tip[2]+axis[2]*q,lateral=Math.hypot(vertex[0]-x,vertex[2]-z),r=radius(q),blend=.012;if(lateral>r+blend)return 0;const bottom=pose.tip[1]+axis[1]*q-r/co,weight=clamp((r+blend-lateral)/blend,0,1);return clamp(vertex[1]-bottom+.0002,0,ALLOWANCE[material]||0)*weight;}
 const api={triangulate,depression,ALLOWANCE,PROFILE,LENGTH,radius,geometry,envelope,obstruction,solve,strokeSettings,planFinish,contact,diagnostics:()=>({solves,cached:results.size}),pointSegment,segmentDistance};if(typeof module==='object'&&module.exports)module.exports=api;else root.BilliardsCueClearance=api;
})(typeof window==='object'?window:globalThis);
