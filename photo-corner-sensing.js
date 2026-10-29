/* Bounded, orientation-independent cloth-region fitting with rail/pocket evidence. */
(function(root){
'use strict';
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x),area=p=>Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a.x*b.y-b.x*a.y;},0))/2;
function hull(points){const p=points.sort((a,b)=>a.x-b.x||a.y-b.y),a=[],b=[];for(const q of p){while(a.length>1&&cross(a.at(-2),a.at(-1),q)<=0)a.pop();a.push(q);}for(let i=p.length-1;i>=0;i--){const q=p[i];while(b.length>1&&cross(b.at(-2),b.at(-1),q)<=0)b.pop();b.push(q);}return a.slice(0,-1).concat(b.slice(0,-1));}
function fit(points){if(points.length<8)return null;let use=points;let line;for(let k=0;k<3;k++){const x=use.reduce((s,p)=>s+p.x,0)/use.length,y=use.reduce((s,p)=>s+p.y,0)/use.length;let xx=0,yy=0,xy=0;for(const p of use){xx+=(p.x-x)**2;yy+=(p.y-y)**2;xy+=(p.x-x)*(p.y-y);}const t=.5*Math.atan2(2*xy,xx-yy),nx=-Math.sin(t),ny=Math.cos(t);line={nx,ny,c:nx*x+ny*y};const ranked=points.map(p=>({p,d:Math.abs(nx*p.x+ny*p.y-line.c)})).sort((a,b)=>a.d-b.d);use=ranked.slice(0,Math.max(8,Math.floor(points.length*.82))).map(v=>v.p);}return line;}
function intersect(a,b){const d=a.nx*b.ny-b.nx*a.ny;if(Math.abs(d)<.08)return null;return {x:(a.c*b.ny-b.c*a.ny)/d,y:(a.nx*b.c-b.nx*a.c)/d};}
function detect(img,{allowApproximate=false}={}){
 const {width:W,height:H,data}=img||{};if(!data||W<80||H<80)return null;
 const scale=Math.min(1,480/Math.max(W,H)),w=Math.round(W*scale),h=Math.round(H*scale),n=w*h,pixels=new Uint8Array(n*3),hues=new Float32Array(n),sats=new Float32Array(n),values=new Float32Array(n),hist=new Float64Array(36);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const at=y*w+x,i=(Math.min(H-1,Math.round(y/scale))*W+Math.min(W-1,Math.round(x/scale)))*4,R=data[i]/255,G=data[i+1]/255,B=data[i+2]/255,hi=Math.max(R,G,B),lo=Math.min(R,G,B),delta=hi-lo,s=delta/Math.max(.001,hi);let hue=delta?60*(hi===R?((G-B)/delta+6)%6:hi===G?(B-R)/delta+2:(R-G)/delta+4):0;hues[at]=hue;sats[at]=s;values[at]=hi;pixels[at*3]=data[i];pixels[at*3+1]=data[i+1];pixels[at*3+2]=data[i+2];if(s>.22&&hi>.12&&hi<.96)hist[Math.floor(hue/10)%36]++;}
 const modes=Array.from(hist,(_,i)=>({h:i*10+5,count:hist[(i+35)%36]+hist[i]+hist[(i+1)%36]})).sort((a,b)=>b.count-a.count),chosen=[];
 const hd=(a,b)=>Math.min(Math.abs(a-b),360-Math.abs(a-b));for(const m of modes){if(m.count<n*.025)break;if(chosen.every(t=>hd(t.h,m.h)>20))chosen.push(m);if(chosen.length===3)break;}
 let best=null,approximate=null;
 // A visible cloth outline can be useful for manual adjustment without meeting
 // the stricter rail/pocket checks. Never promote it to a confident calibration.
 function suggest(corners,component,railSupport=0,pocketSupport=0){
  if(!allowApproximate||corners.some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<1||p.y<1||p.x>w-2||p.y>h-2))return;
  if(corners.some((a,i)=>cross(a,corners[(i+1)%4],corners[(i+2)%4])<=0))return;
  const lengths=corners.map((a,i)=>Math.hypot(a.x-corners[(i+1)%4].x,a.y-corners[(i+1)%4].y)),A=area(corners),fill=component/A;
  if(Math.min(...lengths)<Math.min(w,h)*.12||Math.max(...lengths)/Math.min(...lengths)>7||A<n*.09||A>n*.94||fill<.60||fill>1.18)return;
  const score=A*(.6*Math.min(1,fill)+.4*railSupport+.025*pocketSupport);
  if(approximate&&score<=approximate.score)return;
  let first=0;for(let i=1;i<4;i++)if(corners[i].x+corners[i].y<corners[first].x+corners[first].y)first=i;
  approximate={corners:[...corners.slice(first),...corners.slice(0,first)].map(p=>({x:p.x/scale,y:p.y/scale})),approximate:true,confidence:null,railSupport,pocketSupport,score};
 }
 for(const minValue of [.10,.25,.40]){if(best)break;for(const mode of chosen){const mask=new Uint8Array(n),seen=new Uint8Array(n);for(let i=0;i<n;i++)mask[i]=sats[i]>.20&&values[i]>minValue&&hd(hues[i],mode.h)<25?1:0;
  for(let start=0;start<n;start++){if(!mask[start]||seen[start])continue;const q=[start];seen[start]=1;const boundary=[];
   for(let j=0;j<q.length;j++){const at=q[j],x=at%w,y=Math.floor(at/w);let edge=false;for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,k=yy*w+xx;if(xx<0||yy<0||xx>=w||yy>=h||!mask[k]){edge=true;continue;}if(!seen[k]){seen[k]=1;q.push(k);}}if(edge)boundary.push({x,y});}
   if(q.length<n*.09||boundary.length<80)continue;
   const outline=hull(boundary);if(outline.length<4)continue;const initialArea=area(outline),quad=outline.slice();while(quad.length>4){let at=0,min=Infinity;for(let i=0;i<quad.length;i++){const v=Math.abs(cross(quad[(i+quad.length-1)%quad.length],quad[i],quad[(i+1)%quad.length]));if(v<min){min=v;at=i;}}quad.splice(at,1);}
   if(area(quad)<initialArea*.80)continue;
   suggest(quad,q.length);
   const edgeGroups=[[],[],[],[]],limit=Math.max(4,Math.hypot(w,h)*.045);
   for(const p of boundary){let at=-1,dist=limit;for(let k=0;k<4;k++){const a=quad[k],b=quad[(k+1)%4],len=Math.hypot(b.x-a.x,b.y-a.y),d=Math.abs(cross(a,b,p))/len,t=((p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y))/(len*len);if(d<dist&&t>.07&&t<.93){dist=d;at=k;}}if(at>=0)edgeGroups[at].push(p);}
   const lines=edgeGroups.map(fit);if(lines.some(l=>!l))continue;let corners=lines.map((l,i)=>intersect(lines[(i+3)%4],l));if(corners.some(p=>!p||p.x<1||p.y<1||p.x>w-2||p.y>h-2))continue;
   if(corners.some((a,i)=>cross(a,corners[(i+1)%4],corners[(i+2)%4])<=0))continue;
   const lengths=corners.map((a,i)=>Math.hypot(a.x-corners[(i+1)%4].x,a.y-corners[(i+1)%4].y));if(Math.min(...lengths)<Math.min(w,h)*.12||Math.max(...lengths)/Math.min(...lengths)>7)continue;
   const A=area(corners);if(A<n*.09||A>n*.94||q.length/A<.60||q.length/A>1.18)continue;
   const cx=corners.reduce((s,p)=>s+p.x,0)/4,cy=corners.reduce((s,p)=>s+p.y,0)/4;let rail=0,samples=0,pockets=0;
   const sample=(x,y)=>{x=Math.round(x);y=Math.round(y);return x>=0&&y>=0&&x<w&&y<h?y*w+x:null;};
   for(let k=0;k<4;k++){const a=corners[k],b=corners[(k+1)%4];for(let t=.15;t<.9;t+=.14){const x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t,dx=cx-x,dy=cy-y,len=Math.hypot(dx,dy),inside=sample(x+dx/len*5,y+dy/len*5),outside=sample(x-dx/len*5,y-dy/len*5);if(inside==null||outside==null)continue;samples++;if(!mask[outside]||Math.abs(values[inside]-values[outside])>.09)rail++;}
    // Dark pocket openings near the four intersections provide supporting evidence.
    let dark=0,count=0;for(let dy=-7;dy<=7;dy+=2)for(let dx=-7;dx<=7;dx+=2){const i=sample(a.x+dx,a.y+dy);if(i!=null){count++;if(values[i]<.22)dark++;}}if(dark/Math.max(1,count)>.16)pockets++;
   }
   const railSupport=rail/Math.max(1,samples);suggest(corners,q.length,railSupport,pockets);if(railSupport<.42)continue;
   if(minValue>.10&&(pockets<2||railSupport<.65))continue;
   if(minValue>.10&&mode.h>20&&mode.h<70&&pockets<2)continue;
   const confidence=Math.min(.96,.4+railSupport*.25+(q.length/A)*.16+pockets*.035),score=A*confidence;
   if(!best||score>best.score){let first=0;for(let i=1;i<4;i++)if(corners[i].x+corners[i].y<corners[first].x+corners[first].y)first=i;corners=[...corners.slice(first),...corners.slice(0,first)].map(p=>({x:p.x/scale,y:p.y/scale}));best={corners,confidence,railSupport,pocketSupport:pockets,score};}
  }
 }
 }
 return best||approximate;
}
// Search only inside each user frame edge, near its direction. Mask boundaries
// and black outside pixels are not rail evidence. Unresolved edges stay put.
function guided(img,quad,{woodBoundary=false,manualSnap=false}={}){
 const {width:w,height:h,data}=img||{};if(!data||!Array.isArray(quad)||quad.length!==4)return null;
 const lengths=quad.map((p,i)=>Math.hypot(p.x-quad[(i+1)%4].x,p.y-quad[(i+1)%4].y));
 if(Math.min(...lengths)<30||quad.some((p,i)=>cross(p,quad[(i+1)%4],quad[(i+2)%4])<=0))return null;
 const center=quad.reduce((a,p)=>({x:a.x+p.x/4,y:a.y+p.y/4}),{x:0,y:0});
 const sample=(x,y)=>{x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=w||y>=h)return null;const i=(y*w+x)*4;return [data[i],data[i+1],data[i+2]];};
 const median=v=>v.sort((a,b)=>a-b)[Math.floor(v.length/2)],colors=[];
 for(let y=-2;y<=2;y++)for(let x=-2;x<=2;x++){const c=sample(center.x+x*Math.min(...lengths)*.035,center.y+y*Math.min(...lengths)*.035);if(c&&Math.max(...c)>30)colors.push(c);}
 if(colors.length<10)return null;const cloth=[0,1,2].map(i=>median(colors.map(c=>c[i]))),distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
 if(manualSnap&&(Math.max(...cloth)-Math.min(...cloth))/Math.max(1,Math.max(...cloth))<.15)return null;
 const range=Math.max(6,Math.min(...lengths)*(woodBoundary?.14:.075)),probe=Math.max(2,Math.min(...lengths)*.008),lines=[],edges=[];
 for(let edge=0;edge<4;edge++){
  const a=quad[edge],b=quad[(edge+1)%4],len=lengths[edge],dx=(b.x-a.x)/len,dy=(b.y-a.y)/len,nx=-dy,ny=dx;
  let best=null;
  const slopes=manualSnap?Array.from({length:13},(_,i)=>(i-6)*.02):[-.025,0,.025];
  // Small endpoint-offset differences allow a slight angular correction.
  for(let shift=woodBoundary?-range:probe*1.5;shift<=range;shift+=Math.max(1,probe/2))for(const slope of slopes){
   const delta=slope*len;if(Math.abs(delta)>range)continue;
   let support=0,total=0,strength=0;const sections=[0,0,0];
   for(let j=0;j<21;j++){
    const t=.12+j*.76/20,offset=shift+delta*(t-.5);if((!woodBoundary&&offset<probe*1.2)||Math.abs(offset)>range)continue;
    const x=a.x+(b.x-a.x)*t+nx*offset,y=a.y+(b.y-a.y)*t+ny*offset;
    const inside=sample(x+nx*probe,y+ny*probe),outside=sample(x-nx*probe,y-ny*probe);
    if(!inside||!outside||Math.max(...outside)<18||Math.max(...inside)<18)continue;
    total++;const contrast=distance(inside,outside);
    const chroma=c=>{const sum=Math.max(1,c[0]+c[1]+c[2]);return c.map(v=>v/sum);};
    const colorBoundary=!woodBoundary||(distance(chroma(inside),chroma(cloth))<.15&&distance(chroma(outside),chroma(cloth))>.20);
    if(colorBoundary&&contrast>24&&distance(inside,cloth)<60&&distance(outside,cloth)>distance(inside,cloth)+12){support++;sections[Math.min(2,Math.floor(j/7))]++;strength+=Math.min(100,contrast);}
   }
   const ratio=support/21,score=ratio+strength/21000-Math.abs(shift)/range*.025;
   if(total>=16&&support>=12&&(!manualSnap||sections.every(n=>n>=2))&&(!best||score>best.score))best={shift,delta,ratio,score};
  }
  const offset=best?.shift||0,delta=best?.delta||0;
  const p={x:a.x+nx*(offset-delta/2),y:a.y+ny*(offset-delta/2)},q={x:b.x+nx*(offset+delta/2),y:b.y+ny*(offset+delta/2)};
  const vx=q.x-p.x,vy=q.y-p.y,l=Math.hypot(vx,vy),normal={nx:-vy/l,ny:vx/l};
  let fitted={...normal,c:normal.nx*p.x+normal.ny*p.y};
  if(manualSnap&&best){
   const points=[];
   for(let j=0;j<41;j++){
    const t=.10+j*.80/40;if(Math.abs(t-.5)<.06)continue;
    const bx=p.x+(q.x-p.x)*t,by=p.y+(q.y-p.y)*t;let peak=null;
    for(let shift=-probe*2;shift<=probe*2;shift+=.5){
     const x=bx+normal.nx*shift,y=by+normal.ny*shift,inside=sample(x+normal.nx*probe,y+normal.ny*probe),outside=sample(x-normal.nx*probe,y-normal.ny*probe);
     if(!inside||!outside||Math.min(Math.max(...inside),Math.max(...outside))<18)continue;
     const sum=c=>Math.max(1,c[0]+c[1]+c[2]),chroma=c=>c.map(v=>v/sum(c));
     if(distance(chroma(inside),chroma(cloth))>.15||distance(chroma(outside),chroma(cloth))<.20)continue;
     const score=distance(inside,outside)-Math.abs(shift)*.5;
     if(score>24&&distance(inside,cloth)<60&&(!peak||score>peak.score))peak={x,y,score};
    }
    if(peak)points.push(peak);
   }
   if(points.length>=22){const precise=fit(points);if(precise)fitted=precise;}
  }
  lines.push(fitted);edges.push({edge,kind:edge%2===0?'long':'short',refined:!!best,support:best?.ratio||0});
 }
 if(!edges.some(e=>e.refined))return null;
 const corners=lines.map((line,i)=>intersect(lines[(i+3)%4],line));
 if(corners.some((p,i)=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||Math.hypot(p.x-quad[i].x,p.y-quad[i].y)>range*2)||corners.some((p,i)=>cross(p,corners[(i+1)%4],corners[(i+2)%4])<=0))return null;
 return {corners,approximate:true,confidence:null,guided:true,edges,railSupport:null,pocketSupport:null};
}

// Detect the cap/cloth transition before masking. All four supported edges are
// required before applying a physical inset; missing rails preserve user geometry.
function insetFromBoundary(boundaryCorners,{tableLength=2.54,tableWidth=1.27,cushionInset=.0492125}={}){
 const cal=root.BilliardsPhotoCalibration||(typeof require==='function'?require('./photo-calibration.js'):null);
 if(!cal||!(tableLength>0&&tableWidth>0&&cushionInset>0&&cushionInset<tableWidth*.1))return null;
 const L=tableLength+2*cushionInset,W=tableWidth+2*cushionInset;
 const outer=[{x:0,y:0},{x:L,y:0},{x:L,y:W},{x:0,y:W}],transform=cal.fit(outer,boundaryCorners);
 if(!transform)return null;
 const corners=[{x:cushionInset,y:cushionInset},{x:L-cushionInset,y:cushionInset},{x:L-cushionInset,y:W-cushionInset},{x:cushionInset,y:W-cushionInset}].map(p=>cal.apply(transform.H,p));
 if(!cal.validQuad(corners))return null;
 return {corners,boundaryCorners,cushionInset,tableLength,tableWidth};
}
// The K-55 dimension is a starting point, not an image measurement. Where a
// darker cushion meets a brighter bed, snap each projected edge to that nose.
// Leave edges at their physical inset when the image has insufficient evidence.
function refineCushionNoses(img,inset){
 const {width:w,height:h,data}=img||{},cal=root.BilliardsPhotoCalibration||(typeof require==='function'?require('./photo-calibration.js'):null);
 if(!data||!inset?.corners||!cal)return inset;
 const unit=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}],H=cal.fit(unit,inset.boundaryCorners);
 if(!H)return inset;
 const L=inset.tableLength||2.54,W=inset.tableWidth||1.27,d=inset.cushionInset;
 const fx=d/(L+2*d),fy=d/(W+2*d),edges=[],lines=[];
 const median=v=>v.sort((a,b)=>a-b)[Math.floor(v.length/2)];
 const light=p=>{const x=Math.round(p.x),y=Math.round(p.y);if(x<0||y<0||x>=w||y>=h)return null;const k=(y*w+x)*4;return .2126*data[k]+.7152*data[k+1]+.0722*data[k+2];};
 for(let edge=0;edge<4;edge++){
  const f=edge%2===0?fy:fx,point=(t,k,slope=0)=>{k+=slope*(t-.5);return cal.apply(H.H,edge===0?{x:t,y:k*f}:edge===1?{x:1-k*f,y:t}:edge===2?{x:1-t,y:1-k*f}:{x:k*f,y:1-t});};
  // Sample in table coordinates so the near and far ends get different pixel
  // offsets. Ignore corners and side pockets; require agreement along the rail.
  let best=null,bestStep=null;
  for(let k=.8;k<=3.5;k+=.05)for(const slope of [-.4,-.2,0,.2,.4]){
   const scores=[],steps=[];let supported=0,stepSupport=0,weakSupported=0;
   for(let j=0;j<33;j++){
    const t=.12+.76*j/32;if(Math.abs(t-.5)<.08)continue;
    const c=light(point(t,k,slope)),a=light(point(t,k-.30,slope)),b=light(point(t,k+.30,slope)),wideA=light(point(t,k-.60,slope)),wideB=light(point(t,k+.60,slope));
    if(c===null||a===null||b===null||wideA===null||wideB===null||Math.min(a,b,c,wideA,wideB)<8)continue;
    const ridge=Math.max(Math.min(a,b)-c,(Math.min(wideA,wideB)-c)*.85),step=Math.max(Math.abs(b-a),Math.abs(wideB-wideA)*.7);
    scores.push(ridge);steps.push(step);
    if(ridge>4)supported++;if(ridge>3)weakSupported++;if(step>16)stepSupport++;
   }
   const support=supported/26,score=scores.length>=22?median(scores)-Math.abs(k-1)*.4-Math.abs(slope)*.3:0;
   if(((support>=.54&&score>4)||(weakSupported/26>=.80&&score>3))&&(!best||score>best.score))best={k,slope,score,support:Math.max(support,weakSupported/26)};
   const stepScore=steps.length>=22?median(steps)-Math.abs(k-1)*.65-Math.abs(slope)*.3:0;
   if(stepSupport/26>=.65&&stepScore>18&&(!bestStep||stepScore>bestStep.score))bestStep={k,slope,score:stepScore,support:stepSupport/26};
  }
  best=best||bestStep;
  const k=best?.k??1,slope=best?.slope||0,a=point(0,k,slope),b=point(1,k,slope),len=Math.hypot(b.x-a.x,b.y-a.y),line={nx:-(b.y-a.y)/len,ny:(b.x-a.x)/len};line.c=line.nx*a.x+line.ny*a.y;lines.push(line);
  edges.push({edge,refined:!!best,support:best?.support||0,factor:k,slope});
 }
 const corners=lines.map((line,i)=>intersect(lines[(i+3)%4],line));
 if(!cal.validQuad(corners))return {...inset,noseEvidence:edges};
 return {...inset,corners,noseEvidence:edges};
}
function woodGuided(img,quad,options={}){
 const boundary=guided(img,quad,{woodBoundary:true});
 if(!boundary||boundary.edges.some(e=>!e.refined))return null;
 const projected=insetFromBoundary(boundary.corners,options),inset=refineCushionNoses(img,projected);
 return inset?{...boundary,...inset,method:'wood-cloth-inset',approximate:true}:null;
}

function calibrate(img,quad,options={}){
 let boundary=quad?.length===4?guided(img,quad,{woodBoundary:true}):null;
 if(!boundary||boundary.edges.some(e=>!e.refined)){
  boundary=suggestOutline(img);
  if(boundary&&quad?.length===4){
   const candidates=unitRotations(boundary.corners);
   boundary={...boundary,corners:candidates.sort((a,b)=>a.reduce((s,p,i)=>s+Math.hypot(p.x-quad[i].x,p.y-quad[i].y),0)-b.reduce((s,p,i)=>s+Math.hypot(p.x-quad[i].x,p.y-quad[i].y),0))[0],guided:true};
  }
 }
 if(!boundary)return null;
 // Physical length must follow a long rail before fitting the homography.
 // Camera frames already encode that axis; unguided image outlines start at TL.
 if(!quad?.length){
  const cal=root.BilliardsPhotoCalibration||(typeof require==='function'?require('./photo-calibration.js'):null);
  if(cal)boundary={...boundary,corners:cal.orderDetectedCorners(boundary.corners)};
 }
 const projected=insetFromBoundary(boundary.corners,options);
 return projected?{...boundary,...refineCushionNoses(img,projected),method:'wood-cloth-inset',approximate:true}:null;
}
// Rough manual marks constrain a local four-line search. Never fall back to a
// whole-image cloth outline here: a loose cloth patch must not redefine the table.
function snap(img,quad,options={}){
 const cal=root.BilliardsPhotoCalibration||(typeof require==='function'?require('./photo-calibration.js'):null);
 if(!cal||!Array.isArray(quad)||quad.length!==4||!cal.validQuad(quad))return null;
 const boundary=guided(img,quad,{woodBoundary:true,manualSnap:true});
 if(!boundary)return null;
 const projected=insetFromBoundary(boundary.corners,options);
 if(!projected)return null;
 const supported=boundary.edges.map(e=>e.refined),count=supported.filter(Boolean).length;
 if(count<2)return null;
 const inset=count===4?refineCushionNoses(img,projected):projected;
 const lines=quad.map((a,i)=>{
  const points=supported[i]?inset.corners:quad,p=points[i],q=points[(i+1)%4],len=Math.hypot(q.x-p.x,q.y-p.y),line={nx:-(q.y-p.y)/len,ny:(q.x-p.x)/len};line.c=line.nx*p.x+line.ny*p.y;return line;
 });
 const corners=lines.map((l,i)=>intersect(lines[(i+3)%4],l));
 if(corners.some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))||!cal.validQuad(corners))return null;
 const limit=Math.min(...quad.map((p,i)=>Math.hypot(p.x-quad[(i+1)%4].x,p.y-quad[(i+1)%4].y)))*.24;
 if(corners.some((p,i)=>Math.hypot(p.x-quad[i].x,p.y-quad[i].y)>limit)||area(corners)/area(quad)<.60||area(corners)/area(quad)>1.4)return null;
 return {...boundary,...inset,corners,method:'manual-rail-snap',snappedEdges:count,approximate:true,confidence:null};
}

function cornerTargets(img,options={}){
 const initial=calibrate(img,null,options);
 return initial?snap(img,initial.corners,options):null;
}
function snapPoint(point,targets){
 if(!targets?.corners||!Number.isFinite(point?.x)||!Number.isFinite(point?.y))return null;
 const q=targets.corners,limit=Math.min(...q.map((p,i)=>Math.hypot(p.x-q[(i+1)%4].x,p.y-q[(i+1)%4].y)))*.18;
 let nearest=null;
 q.forEach((p,i)=>{const distance=Math.hypot(point.x-p.x,point.y-p.y);if(targets.edges[i].refined&&targets.edges[(i+3)%4].refined&&distance<=limit&&(!nearest||distance<nearest.distance))nearest={point:{...p},corner:i,distance};});
 return nearest;
}

function unitRotations(q){return q.map((_,i)=>q.slice(i).concat(q.slice(0,i)));}
function suggestOutline(img){return detect(img,{allowApproximate:true});}
const api={cornerTargets,snapPoint,snap,calibrate,detect,guided,woodGuided,insetFromBoundary,refineCushionNoses,suggest:img=>detect(img,{allowApproximate:true})};if(typeof module==='object'&&module.exports)module.exports=api;else root.BilliardsCornerSensing=api;
})(typeof window==='object'?window:globalThis);
