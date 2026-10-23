(function(root){
'use strict';
function energy(ball,radius,gravity=9.81){
 const v2=ball.vx**2+ball.vy**2+(ball.vz||0)**2;
 const w2=(ball.wx||0)**2+(ball.wy||0)**2+(ball.wz||0)**2;
 return .5*v2+.2*radius*radius*w2+gravity*Math.max(0,(ball.z||radius)-radius);
}
function create(cue,radius,gravity=9.81){
 const initial=energy(cue,radius,gravity),paths={};
 function record(ball,kind,t){
  const e=energy(ball,radius,gravity);
  if(!paths[ball.id]&&e<1e-12)return;
  const points=paths[ball.id]||(paths[ball.id]=[]);
  points.push({x:ball.x,y:ball.y,t,percent:initial>1e-12?100*e/initial:0,kind});
 }
 record(cue,'start',0);
 return {paths,initial,record};
}
function labels(preview,map,options={}){
 const result=[],occupied=options.occupied||[],width=options.width||Infinity,height=options.height||Infinity;
 for(const [id,samples] of Object.entries(preview?.budgetPaths||{})){
  const raw=preview.paths?.[id];if(!raw||raw.length<2||!samples.length)continue;
  const path=raw.map((p,i)=>({...map(p),t:p.t,s:0}));
  for(let i=1;i<path.length;i++)path[i].s=path[i-1].s+Math.hypot(path[i].x-path[i-1].x,path[i].y-path[i-1].y);
  const length=path.at(-1).s;if(length<35)continue;
  function at(distance){
   const s=Math.max(0,Math.min(length,distance));let i=1;
   while(i<path.length-1&&path[i].s<s)i++;
   let a=path[i-1],b=path[i];
   if(b.s-a.s<.01)return null;
   const f=(s-a.s)/(b.s-a.s),angle=Math.atan2(b.y-a.y,b.x-a.x);
   return {x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,angle,t:a.t+(b.t-a.t)*f,s};
  }
  function station(t){
   let i=1;while(i<path.length-1&&path[i].t<t)i++;
   const a=path[i-1],b=path[i],f=b.t>a.t?Math.max(0,Math.min(1,(t-a.t)/(b.t-a.t))):0;
   return a.s+(b.s-a.s)*f;
  }
  function percent(t){
   let i=0;while(i<samples.length-1&&samples[i+1].t<=t)i++;
   const a=samples[i],b=samples[Math.min(i+1,samples.length-1)];
   if(a.t===b.t||a.kind==='before'||b.kind==='after')return a.percent;
   const f=Math.max(0,Math.min(1,(t-a.t)/(b.t-a.t)));
   return a.percent+(b.percent-a.percent)*f;
  }
  const first=samples[0],last=samples.at(-1);
  const candidates=[{s:Math.min(48,length*.3),percent:first.percent},{s:Math.max(length*.75,length-24),percent:last.percent}];
  for(const p of samples)if(p.kind==='before'||p.kind==='after')candidates.push({s:station(p.t)+(p.kind==='before'?-26:26),percent:p.percent});
  for(let s=110;s<length-55;s+=140){const point=at(s);if(point)candidates.push({s,percent:percent(point.t)});}
  const used=[];let count=0;
  for(const candidate of candidates){
   if(count>=18||candidate.s<8||candidate.s>length-8||used.some(s=>Math.abs(s-candidate.s)<38))continue;
   const p=at(candidate.s);if(!p)continue;
   const text=Math.max(0,Math.round(candidate.percent))+'%',tw=text.length*7+4,th=15;
   let angle=p.angle;if(angle>Math.PI/2)angle-=Math.PI;if(angle< -Math.PI/2)angle+=Math.PI;
   for(const side of [1,-1]){
    const x=p.x-Math.sin(p.angle)*14*side,y=p.y+Math.cos(p.angle)*14*side;
    const bw=Math.abs(Math.cos(angle))*tw+Math.abs(Math.sin(angle))*th,bh=Math.abs(Math.sin(angle))*tw+Math.abs(Math.cos(angle))*th;
    const box={left:x-bw/2,right:x+bw/2,top:y-bh/2,bottom:y+bh/2};
    if(box.left<3||box.top<3||box.right>width-3||box.bottom>height-3||occupied.some(b=>box.left<b.right+5&&box.right>b.left-5&&box.top<b.bottom+5&&box.bottom>b.top-5))continue;
    occupied.push(box);used.push(candidate.s);result.push({x,y,angle,text,id:Number(id),linePoint:{x:p.x,y:p.y},percent:candidate.percent,color:Number(id)===0?'#ffffff':Number(id)===preview.firstBallContact?.objId?'#ffe5a0':'#a5d7ff'});count++;break;
   }
  }
 }
 return result;
}
function draw(ctx,items){
 ctx.save();ctx.font='700 11px Segoe UI, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
 for(const p of items){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.strokeStyle='#07100fe6';ctx.lineWidth=3.5;ctx.strokeText(p.text,0,0);ctx.fillStyle=p.color||(p.id===0?'#ffffff':'#ffe5a0');ctx.fillText(p.text,0,0);ctx.restore();}
 ctx.restore();
}
const api={energy,create,labels,draw};
if(typeof module==='object'&&module.exports)module.exports=api;
else root.BilliardsShotBudget=api;
})(typeof window==='object'?window:globalThis);
