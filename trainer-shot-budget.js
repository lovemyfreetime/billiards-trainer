(function(root){
'use strict';
function energy(ball,radius,gravity=9.81){
 const v2=ball.vx**2+ball.vy**2+(ball.vz||0)**2;
 const w2=(ball.wx||0)**2+(ball.wy||0)**2+(ball.wz||0)**2;
 return .5*v2+.2*radius*radius*w2+gravity*Math.max(0,(ball.z||radius)-radius);
}
function create(cue,radius,gravity=9.81,reference={}){
 const initial=energy(cue,radius,gravity),paths={},contacts=[];
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
 function contact(a,b,t){
  const snapshot=ball=>{const percent=initial>1e-12?100*energy(ball,radius,gravity)/initial:0;return {id:ball.id,name:ball.id===0?'CB':String(ball.n||ball.id),x:ball.x,y:ball.y,percent,feel:feel(percent)};};
  const before=[snapshot(a),snapshot(b)];
  const vx=a.vx-b.vx,vy=a.vy-b.vy,speed=Math.hypot(vx,vy);
  const lateral=speed?Math.abs(vx*(b.y-a.y)-vy*(b.x-a.x))/speed:0;
  const overlap=100*Math.max(0,Math.min(1,1-lateral/(2*radius)));
  record(a,'before',t);record(b,'before',t);
  return (a,b)=>{
   record(a,'after',t);record(b,'after',t);
   const after=[snapshot(a),snapshot(b)],incoming=before[0].percent+before[1].percent;
   contacts.push({t,before,after,incoming,loss:incoming-after[0].percent-after[1].percent,overlap,x:(a.x+b.x)/2,y:(a.y+b.y)/2});
  };
 }
 return {paths,contacts,initial,strokeFeel,record,contact};
}
function contactLabels(preview,map,options={}){
 const result=[],occupied=options.occupied||[],width=options.width||Infinity,height=options.height||Infinity;
 const fontSize=width<600?9:11,row=fontSize+7,pad=9;
 const number=v=>Number(Math.max(0,v).toFixed(1)).toString();
 const amount=p=>number(p)+'%'+(Number.isFinite(preview.strokeFeel)?' / '+number(preview.strokeFeel*p/100)+'D':'');
 for(const event of preview?.budgetContacts||[]){
  // Identify the ball giving energy, regardless of simulation array order.
  const donor=event.before[0].percent-event.after[0].percent>=event.before[1].percent-event.after[1].percent?0:1,receiver=1-donor;
  const source=event.before[donor],target=event.before[receiver],given=source.percent-event.after[donor].percent;
  const rows=[
   {text:Math.round(event.overlap)+'% overlap · % of shot',color:'#b7c8ce'},
   {text:'Incoming total  '+amount(event.incoming),color:'#ffffff'},
   {text:source.name+' keeps  '+amount(event.after[donor].percent),color:source.id===0?'#ffffff':'#ffe5a0'},
   {text:target.name+(target.percent<.01?' receives  ':' carries  ')+amount(event.after[receiver].percent),color:target.id===0?'#ffffff':'#ffe5a0'},
   {text:source.name+' gives  −'+amount(given),color:'#ff9999'},
   {text:'Collision loss  '+amount(event.loss),color:'#ff7777'}
  ];
  const w=Math.max(...rows.map(r=>r.text.length))*fontSize*.62+pad*2,h=rows.length*row+pad*2,anchor=map(event);
  let box=null;
  for(const gap of [36,72,116,164]){
   for(const [dx,dy] of [[-w-gap,-h/2],[gap,-h/2],[-w/2,-h-gap],[-w/2,gap],[-w-gap,-h-gap],[gap,-h-gap],[-w-gap,gap],[gap,gap]]){
    const left=Math.max(4,Math.min(width-w-4,anchor.x+dx)),top=Math.max(4,Math.min(height-h-4,anchor.y+dy));
    const candidate={left,top,right:left+w,bottom:top+h};
    if(occupied.some(b=>candidate.left<b.right+6&&candidate.right>b.left-6&&candidate.top<b.bottom+6&&candidate.bottom>b.top-6))continue;
    box=candidate;break;
   }
   if(box)break;
  }
  if(!box)continue;
  occupied.push(box);result.push({box,anchor,rows,fontSize,row,pad,event});
 }
 return result;
}
function drawContacts(ctx,cards){
 ctx.save();ctx.textAlign='left';ctx.textBaseline='middle';
 for(const card of cards){
  const {box,anchor,rows,fontSize,row,pad}=card;
  const x=Math.max(box.left,Math.min(box.right,anchor.x)),y=Math.max(box.top,Math.min(box.bottom,anchor.y));
  ctx.strokeStyle='#a4d9e299';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(anchor.x,anchor.y);ctx.lineTo(x,y);ctx.stroke();
  ctx.fillStyle='#0c171eeb';ctx.strokeStyle='#68818f';ctx.beginPath();ctx.roundRect(box.left,box.top,box.right-box.left,box.bottom-box.top,7);ctx.fill();ctx.stroke();
  ctx.font='600 '+fontSize+'px Segoe UI, sans-serif';
  rows.forEach((r,i)=>{ctx.fillStyle=r.color;ctx.fillText(r.text,box.left+pad,box.top+pad+row*(i+.5));});
 }
 ctx.restore();
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
  // Sample the whole path: a global reading cap used to spend every slot on
  // early contacts and leave later cushion-to-cushion legs unlabelled.
  const used=[];
  for(const candidate of candidates){
   if(candidate.s<8||candidate.s>length-8||used.some(s=>Math.abs(s-candidate.s)<55))continue;
   const color=Number(id)===0?'#ffffff':Number(id)===preview.firstBallContact?.objId?'#ffe5a0':'#a5d7ff';
   const energyText=Math.max(0,Math.round(candidate.percent))+'%';
   let feelText=Number.isFinite(candidate.feel)?number(Math.max(0,candidate.feel))+'D':null;

   let item=null;
   // Reserve a readable pair together, rather than placing the percentage first
   // and leaving no room for its feel value on the opposite side.
   for(const shift of candidate.start||candidate.end?[0,-24,24,-48,48]:[0]){
    if(item)break;
    const distance=candidate.s+shift;if(distance<8||distance>length-8)continue;
    for(const offset of [14,26,42]){
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
   // In a tight space keep both units in one label instead of silently
   // dropping the diamond reading when its opposite-side position is blocked.
   if(!item)item=place(candidate.s,energyText+(feelText?' / '+feelText:''),color,'energy',[1,-1],[14,26,42],{percent:candidate.percent,feel:candidate.feel});
   if(item)used.push(candidate.s);

  }
 }
 return result;
}
function draw(ctx,items){
 ctx.save();ctx.font='700 11px Segoe UI, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
 for(const p of items){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.font='700 '+(p.fontSize||11)+'px Segoe UI, sans-serif';ctx.strokeStyle='#07100fe6';ctx.lineWidth=3.5;ctx.strokeText(p.text,0,0);ctx.fillStyle=p.color||(p.id===0?'#ffffff':'#ffe5a0');ctx.fillText(p.text,0,0);ctx.restore();}
 ctx.restore();
}
const api={energy,create,labels,draw,contactLabels,drawContacts};
if(typeof module==='object'&&module.exports)module.exports=api;
else root.BilliardsShotBudget=api;
})(typeof window==='object'?window:globalThis);
