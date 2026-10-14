/* Locate a ball's visible body in a native photo patch, excluding surrounding cloth. */
(function(root){
'use strict';
function inspect(img){
 const {width:w,height:h,data:d}=img,median=a=>a.sort((a,b)=>a-b)[Math.floor(a.length/2)],channels=[[],[],[]];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(x<w*.12||x>w*.88||y<h*.12||y>h*.88){const i=(y*w+x)*4;for(let k=0;k<3;k++)channels[k].push(d[i+k]);}
 const cloth=channels.map(median),mask=new Uint8Array(w*h),seen=new Uint8Array(w*h),parts=[];
 for(let i=0;i<w*h;i++){const j=i*4;mask[i]=Math.hypot(d[j]-cloth[0],d[j+1]-cloth[1],d[j+2]-cloth[2])>65?1:0;}
 for(let i=0;i<mask.length;i++)if(mask[i]&&!seen[i]){const queue=[i];seen[i]=1;let x0=w,y0=h,x1=0,y1=0,sx=0,sy=0;
  for(let n=0;n<queue.length;n++){const at=queue[n],x=at%w,y=Math.floor(at/w);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);sx+=x;sy+=y;
   for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,j=yy*w+xx;if(xx>=0&&xx<w&&yy>=0&&yy<h&&mask[j]&&!seen[j]){seen[j]=1;queue.push(j);}}
  }
  const bw=x1-x0+1,bh=y1-y0+1;
  if(queue.length>30&&bw>5&&bh>5&&bw/bh>.45&&bw/bh<2.2&&queue.length/(bw*bh)>.30&&x0>0&&y0>0&&x1<w-1&&y1<h-1)parts.push({x0,y0,x1,y1,cx:sx/queue.length,cy:sy/queue.length,r:Math.max(bw,bh)/2,area:queue.length});
 }
 parts.sort((a,b)=>Math.hypot(a.cx-w/2,a.cy-h/2)-Math.hypot(b.cx-w/2,b.cy-h/2));
 const body=parts[0];return body?{...body,centered:Math.hypot(body.cx-w/2,body.cy-h/2)<body.r*.7}:null;
}
function duplicate(candidate,others){return !!candidate&&!candidate.centered&&others.some(o=>o&&Math.hypot(o.cx-candidate.cx,o.cy-candidate.cy)<Math.min(o.r,candidate.r)*.55);}
const api={inspect,duplicate};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BilliardsBallCrops=api;
})(typeof window!=='undefined'?window:globalThis);
