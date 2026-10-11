/* Conservative table-spot rejection. Dimensions are measured on the calibrated
 * cloth plane, never in a stretched preview. A dark color or spot position alone
 * must not remove a real ball. */
(function(root){
'use strict';
function nearSpot(nx,ny){return Number.isFinite(nx)&&Number.isFinite(ny)&&Math.min(Math.abs(nx-.25),Math.abs(nx-.75))<=.04&&Math.abs(ny-.5)<=.07;}
function median(values){values.sort((a,b)=>a-b);return values[Math.floor(values.length/2)]||0;}
function inspect(image,ballDiameter){
 const {width:w,height:h,data}=image||{};
 const fail={isSpot:false};
 if(!data||w<32||h<32||!(ballDiameter>=16))return fail;
 const cx=(w-1)/2,cy=(h-1)/2,br=ballDiameter/2;
 function pixel(x,y){x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=w||y>=h)return null;const i=(y*w+x)*4;return [data[i],data[i+1],data[i+2]];}
 function hsv(p){const hi=Math.max(...p),lo=Math.min(...p);return {v:hi,s:(hi-lo)/Math.max(1,hi)};}
 // Median surrounding cloth ignores narrow string lines and isolated shadows.
 const channels=[[],[],[]];for(let a=0;a<64;a++){const t=a*Math.PI/32,p=pixel(cx+br*1.65*Math.cos(t),cy+br*1.65*Math.sin(t));if(!p)return fail;p.forEach((v,i)=>channels[i].push(v));}
 const cloth=channels.map(median),clothHSV=hsv(cloth);
 if(clothHSV.s<.22||clothHSV.v<55)return fail;
 function white(p){const q=hsv(p);return q.v>150&&q.s<.27;}
 function marked(p){const q=hsv(p);return Math.hypot(...p.map((v,i)=>v-cloth[i]))>48&&(q.s<clothHSV.s*.72||q.v<clothHSV.v*.52);}
 // Find a compact white center. Off-center highlights and wide white ball
 // surfaces do not provide the centered-dot evidence required by this filter.
 const limit=Math.ceil(br*.42),seen=new Set(),blobs=[];
 for(let y=Math.round(cy)-limit;y<=Math.round(cy)+limit;y++)for(let x=Math.round(cx)-limit;x<=Math.round(cx)+limit;x++){
  const key=y*w+x;if(seen.has(key)||!pixel(x,y)||!white(pixel(x,y)))continue;
  const stack=[[x,y]],points=[];seen.add(key);
  while(stack.length){const [xx,yy]=stack.pop();points.push([xx,yy]);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=xx+dx,ny=yy+dy,k=ny*w+nx;if(Math.abs(nx-cx)>limit||Math.abs(ny-cy)>limit||seen.has(k))continue;seen.add(k);const p=pixel(nx,ny);if(p&&white(p))stack.push([nx,ny]);}}
  if(points.length<4)continue;
  const x0=points.reduce((n,p)=>n+p[0],0)/points.length,y0=points.reduce((n,p)=>n+p[1],0)/points.length;
  if(Math.hypot(x0-cx,y0-cy)>br*.30)continue;
  blobs.push({x:x0,y:y0,n:points.length});
 }
 blobs.sort((a,b)=>Math.hypot(a.x-cx,a.y-cy)-Math.hypot(b.x-cx,b.y-cy));
 if(!blobs.length)return fail;
 const dot=blobs[0];
 function fraction(radius,test){let count=0;for(let a=0;a<48;a++){const t=a*Math.PI/24,p=pixel(dot.x+radius*Math.cos(t),dot.y+radius*Math.sin(t));if(!p)return 0;if(test(p))count++;}return count/48;}
 // Find the disc boundary by angular coverage. Thin crosshair lines cannot
 // inflate the disc radius, unlike a connected-component bounding box.
 let discRadius=0;for(let r=br*.18;r<=br*1.18;r+=.5){if(fraction(r,marked)>=.77)discRadius=r;}
 const ratio=discRadius/br;
 if(ratio<.24||ratio>.70)return {...fail,diameterRatio:ratio};
 const dotArea=dot.n/(Math.PI*discRadius*discRadius);
 if(dotArea<.018||dotArea>.24)return {...fail,diameterRatio:ratio};
 if(fraction(discRadius*.62,p=>marked(p)&&!white(p))<.77)return fail;
 // Cloth must resume just outside the disc in most directions. A ball body,
 // broad shadow or another ball nearby makes this uncertain: retain it.
 const clothMatch=p=>Math.hypot(...p.map((v,i)=>v-cloth[i]))<48;
 if(fraction(discRadius*1.4,clothMatch)<.72||fraction(br*.95,clothMatch)<.72)return fail;
 return {isSpot:true,diameterRatio:ratio,dotArea};
}
const api={nearSpot,inspect};if(typeof module==='object'&&module.exports)module.exports=api;else root.BilliardsTableSpots=api;
})(typeof window==='object'?window:globalThis);
