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
const api={detect,suggest:img=>detect(img,{allowApproximate:true})};if(typeof module==='object'&&module.exports)module.exports=api;else root.BilliardsCornerSensing=api;
})(typeof window==='object'?window:globalThis);
