(function(root){
'use strict';
function energy(ball,radius,gravity=9.81){
 const v2=ball.vx**2+ball.vy**2+(ball.vz||0)**2;
 const w2=(ball.wx||0)**2+(ball.wy||0)**2+(ball.wz||0)**2;
 return .5*v2+.2*radius*radius*w2+gravity*Math.max(0,(ball.z||radius)-radius);
}
function create(cue,radius,gravity=9.81,reference={}){
 const initial=energy(cue,radius,gravity),paths={};
 const strokeSpeed=reference.speed||Math.hypot(cue.vx,cue.vy,cue.vz||0),table=reference.table||[];
 function lookup(speed){
  if(!table.length)return null;
  let lo=0,hi=table.length-1;
  while(hi-lo>1){const mid=(lo+hi)>>1;if(table[mid].speed<speed)lo=mid;else hi=mid;}
  const a=table[lo],b=table[hi],f=Math.max(0,Math.min(1,(speed-a.speed)/(b.speed-a.speed)));
  return a.diamonds+(b.diamonds-a.diamonds)*f;
 }
 const base=lookup(strokeSpeed),strokeFeel=reference.diamonds??base;
 // One common energy budget makes travel and contact deductions additive.
 // D is a share of the calibrated launch stroke, not literal travel remaining.
 function feel(percent){
  return Number.isFinite(strokeFeel)?strokeFeel*Math.max(0,percent)/100:null;
 }
 function record(ball,kind,t){
  const e=energy(ball,radius,gravity);
  if(!paths[ball.id]&&e<1e-12)return;
  const points=paths[ball.id]||(paths[ball.id]=[]);
  const percent=initial>1e-12?100*e/initial:0;
  points.push({x:ball.x,y:ball.y,t,percent,feel:feel(percent),kind});
 }
 record(cue,'start',0);
 return {paths,initial,strokeFeel,record};
}
function labels(preview,map,options={}){
 const result=[],occupied=options.occupied||[],width=options.width||Infinity,height=options.height||Infinity;
 const number=value=>Number(value.toFixed(1)).toString(),fontSize=width<600?9:11;
 for(const [id,samples] of Object.entries(preview?.budgetPaths||{})){
  const raw=preview.paths?.[id];if(!raw||raw.length<2||!samples.length)continue;
  const path=raw.map(p=>({...map(p),t:p.t,s:0}));
  for(let i=1;i<path.length;i++)path[i].s=path[i-1].s+Math.hypot(path[i].x-path[i-1].x,path[i].y-path[i-1].y);
  const length=path.at(-1).s;if(length<35)continue;
  function at(distance){
   const s=Math.max(0,Math.min(length,distance));let i=1;
   while(i<path.length-1&&path[i].s<s)i++;
   const a=path[i-1],b=path[i];if(b.s-a.s<.01)return null;
   const f=(s-a.s)/(b.s-a.s);
   return {x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,angle:Math.atan2(b.y-a.y,b.x-a.x),t:a.t+(b.t-a.t)*f,s};
  }
  function station(t){
   let i=1;while(i<path.length-1&&path[i].t<t)i++;
   const a=path[i-1],b=path[i],f=b.t>a.t?Math.max(0,Math.min(1,(t-a.t)/(b.t-a.t))):0;
   return a.s+(b.s-a.s)*f;
  }
  function reading(t,key){
   let i=0;while(i<samples.length-1&&samples[i+1].t<=t)i++;
   const a=samples[i],b=samples[Math.min(i+1,samples.length-1)];
   if(!Number.isFinite(a[key]))return null;
   if(a.t===b.t||a.kind==='before'||b.kind==='after'||!Number.isFinite(b[key]))return a[key];
   const f=Math.max(0,Math.min(1,(t-a.t)/(b.t-a.t)));
   return a[key]+(b[key]-a[key])*f;
  }
  function place(distance,text,color,type,sides=[1,-1],offsets=[14],extra={}){
   const p=at(distance);if(!p)return null;
   let angle=p.angle;if(angle>Math.PI/2)angle-=Math.PI;if(angle< -Math.PI/2)angle+=Math.PI;
   const tw=text.length*fontSize*.62+4,th=fontSize+4;
   for(const offset of offsets)for(const side of sides){
    const x=p.x-Math.sin(p.angle)*offset*side,y=p.y+Math.cos(p.angle)*offset*side;
    const bw=Math.abs(Math.cos(angle))*tw+Math.abs(Math.sin(angle))*th,bh=Math.abs(Math.sin(angle))*tw+Math.abs(Math.cos(angle))*th;
    const box={left:x-bw/2,right:x+bw/2,top:y-bh/2,bottom:y+bh/2};
    if(box.left<3||box.top<3||box.right>width-3||box.bottom>height-3||occupied.some(b=>box.left<b.right+4&&box.right>b.left-4&&box.top<b.bottom+4&&box.bottom>b.top-4))continue;
    occupied.push(box);const item={x,y,angle,text,id:Number(id),linePoint:{x:p.x,y:p.y},color,type,side,offset,fontSize,...extra};result.push(item);return item;
   }
   return null;
  }
  // Contact loss uses the common initial-energy denominator, so a 70 -> 36
  // reading produces -34%, rather than an unrelated local loss percentage.
  const losses=[];
  for(let i=0;i<samples.length-1;i++){
   const before=samples[i],after=samples[i+1];
   if(before.kind!=='before'||after.kind!=='after'||before.t!==after.t)continue;
   const loss=before.percent-after.percent;if(loss<=.005)continue;
   const s=station(before.t),last=losses.at(-1);
   if(last&&Math.abs(last.s-s)<10){last.loss+=loss;last.after=after.percent;last.parts.push([before.percent,after.percent]);}
   else losses.push({s,loss,before:before.percent,after:after.percent,parts:[[before.percent,after.percent]]});
  }
  for(const loss of losses){
   const text='−'+(loss.loss<.1?'<0.1':loss.loss<1?number(loss.loss):Math.round(loss.loss))+'%';
   const diamondLoss=Number.isFinite(preview.strokeFeel)?preview.strokeFeel*loss.loss/100:null;
   const extra={loss:loss.loss,diamondLoss,before:loss.before,after:loss.after,parts:loss.parts};
   let placed=false;
   for(const offset of [30,46,62]){
    if(placed)break;
    for(const side of [1,-1]){
     const nr=result.length,nb=occupied.length;
     const pct=place(loss.s,text,'#ff7777','loss',[side],[offset],extra);
     const diamonds=pct&&diamondLoss!==null?place(loss.s,'−'+(diamondLoss<.1?'<0.1':number(diamondLoss))+'D','#ff7777','diamond-loss',[-side],[offset],extra):null;
     if(pct&&(diamondLoss===null||diamonds)){placed=true;break;}
     result.length=nr;occupied.length=nb;
    }
   }
   if(!placed)place(loss.s,text+(diamondLoss!==null?' / −'+number(diamondLoss)+'D':''),'#ff7777','loss',[1,-1],[30,46,62],extra);
  }
  const first=samples[0],last=samples.at(-1),endS=Math.max(length*.7,length-46);
  const candidates=[{s:Math.min(64,length*.3),percent:first.percent,feel:first.feel,start:true},{s:endS,percent:last.percent,feel:last.feel,end:true}];
  for(const p of samples)if(p.kind==='before'||p.kind==='after')candidates.push({s:station(p.t)+(p.kind==='before'?-30:30),percent:p.percent,feel:p.feel});
  for(let s=145;s<length-65;s+=170){const p=at(s);if(p)candidates.push({s,percent:reading(p.t,'percent'),feel:reading(p.t,'feel')});}
  const used=[];let count=0;
  for(const candidate of candidates){
   if(count>=14||candidate.s<8||candidate.s>length-8||used.some(s=>Math.abs(s-candidate.s)<55))continue;
   const color=Number(id)===0?'#ffffff':Number(id)===preview.firstBallContact?.objId?'#ffe5a0':'#a5d7ff';
   const energyText=Math.max(0,Math.round(candidate.percent))+'%';
   let feelText=Number.isFinite(candidate.feel)?number(Math.max(0,candidate.feel))+'D':null;

   let item=null;
   // Reserve a readable pair together, rather than placing the percentage first
   // and leaving no room for its feel value on the opposite side.
   for(const shift of candidate.start||candidate.end?[0,-24,24,-48,48]:[0]){
    if(item)break;
    const distance=candidate.s+shift;if(distance<8||distance>length-8)continue;
    for(const offset of candidate.start||candidate.end?[14,26,42]:[14]){
     if(item)break;
     for(const side of [1,-1]){
      const startResult=result.length,startBoxes=occupied.length;
      const energyItem=place(distance,energyText,color,'energy',[side],[offset],{percent:candidate.percent});
      const feelItem=energyItem&&feelText?place(distance,feelText,'#69e5ff','feel',[-side],[offset],{feel:candidate.feel,strokeFeel:preview.strokeFeel,endpoint:!!candidate.end,percent:candidate.percent}):null;
      if(energyItem&&(!feelText||feelItem)){item=energyItem;break;}
      result.length=startResult;occupied.length=startBoxes;
     }
    }
   }
   if(!item)item=place(candidate.s,energyText,color,'energy',[1,-1],[14],{percent:candidate.percent});
   if(item){used.push(candidate.s);count++;}

  }
 }
 return result;
}
function draw(ctx,items){
 ctx.save();ctx.font='700 11px Segoe UI, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
 for(const p of items){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.font='700 '+(p.fontSize||11)+'px Segoe UI, sans-serif';ctx.strokeStyle='#07100fe6';ctx.lineWidth=3.5;ctx.strokeText(p.text,0,0);ctx.fillStyle=p.color||(p.id===0?'#ffffff':'#ffe5a0');ctx.fillText(p.text,0,0);ctx.restore();}
 ctx.restore();
}
const api={energy,create,labels,draw};
if(typeof module==='object'&&module.exports)module.exports=api;
else root.BilliardsShotBudget=api;
})(typeof window==='object'?window:globalThis);
