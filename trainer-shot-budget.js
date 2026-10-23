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
function format(value){return value>0&&value<.05?'<0.1':Number(Math.max(0,value).toFixed(1)).toString();}
function exchange(event){
 const donor=event.before[0].percent-event.after[0].percent>=event.before[1].percent-event.after[1].percent?0:1,receiver=1-donor;
 return {donor,receiver,source:event.before[donor],target:event.before[receiver],given:event.before[donor].percent-event.after[donor].percent,received:event.after[receiver].percent-event.before[receiver].percent};
}
function segmentIntersects(box,a,b){
 let lo=0,hi=1;const dx=b.x-a.x,dy=b.y-a.y;
 for(const [p,q] of [[-dx,a.x-box.left],[dx,box.right-a.x],[-dy,a.y-box.top],[dy,box.bottom-a.y]]){
  if(Math.abs(p)<1e-9){if(q<0)return false;continue;}
  const r=q/p;if(p<0)lo=Math.max(lo,r);else hi=Math.min(hi,r);if(lo>hi)return false;
 }
 return true;
}
function placeBadge(rows,anchor,options={}){
 const occupied=options.occupied||[],fontSize=options.fontSize||(options.width<600?9:10),row=fontSize+(options.rowGap??2),pad=options.pad??2;
 const w=Math.max(...rows.map(r=>options.measureText?options.measureText(r.text,fontSize):r.text.length*fontSize*.62))+pad*2,h=rows.length*row+pad*2;
 const bounds=options.bounds||{left:3,top:3,right:(options.width||Infinity)-3,bottom:(options.height||Infinity)-3};
 const clear=box=>box.left>=bounds.left&&box.right<=bounds.right&&box.top>=bounds.top&&box.bottom<=bounds.bottom&&!occupied.some(b=>box.left<b.right+6&&box.right>b.left-6&&box.top<b.bottom+6&&box.bottom>b.top-6)&&!(options.segments||[]).some(([a,b])=>segmentIntersects({left:box.left-4,right:box.right+4,top:box.top-4,bottom:box.bottom+4},a,b));
 // Search nearest clear space first, including diagonal positions around a hit.
 for(const distance of options.distances||[12,20,28,44,64,90,124,164,216,280,360,460,600]){
  for(let i=0;i<16;i++){
   const angle=-Math.PI/2+i*Math.PI/8,dx=Math.cos(angle),dy=Math.sin(angle);
   const x=anchor.x+dx*(distance+w/2),y=anchor.y+dy*(distance+h/2);
   const box={left:x-w/2,right:x+w/2,top:y-h/2,bottom:y+h/2};
   if(!clear(box))continue;
   occupied.push(box);return {box,anchor,rows,fontSize,row,pad};
  }
 }
 return null;
}
function contactLabels(preview,map,options={}){
 const result=[];
 for(const event of preview?.budgetContacts||[]){
  const {target,received}=exchange(event);
  if(received<=.005)continue;
  const text=format(received)+'%'+(Number.isFinite(preview.strokeFeel)?' · '+format(preview.strokeFeel*received/100)+'D':'');
  const rows=[{text:(target.id===0?'CB':'B'+target.name)+' loss · '+text,color:'#f0f4ed'}];
  const card=placeBadge(rows,map(event),options);if(card)result.push({...card,event});
 }
 return result;
}
function journey(preview){
 const items=(preview?.budgetContacts||[]).map((event,index)=>({kind:'ball',t:event.t,event,index}));
 for(const [id,points] of Object.entries(preview?.budgetPaths||{})){
  let previous=points[0];if(!previous)continue;
  for(let i=1;i<points.length;i++){
   const point=points[i];
   if(!['before','pocket','end'].includes(point.kind))continue;
   const loss=previous.percent-point.percent;
   if(Math.abs(loss)>.00001)items.push({kind:'travel',id:+id,t:point.t,from:previous.percent,to:point.percent,loss});
   if(point.kind==='before'){
    const after=points[i+1];
    if(after?.kind==='after'&&after.t===point.t){
     const ball=(preview.budgetContacts||[]).some(e=>e.t===point.t&&e.before.some(p=>p.id===+id&&Math.abs(p.percent-point.percent)<1e-8));
     if(!ball)items.push({kind:'cushion',id:+id,t:point.t,x:point.x,y:point.y,from:point.percent,to:after.percent,loss:point.percent-after.percent});
     previous=after;i++;continue;
    }
   }else items.push({kind:point.kind,id:+id,t:point.t,to:point.percent});
   previous=point;
  }
 }
 const order={travel:0,ball:1,cushion:1,pocket:2,end:2};
 return items.sort((a,b)=>a.t-b.t||order[a.kind]-order[b.kind]);
}
function railLabels(preview,map,options={}){
 const losses=[];
 for(const item of journey(preview).filter(item=>item.kind==='cushion'&&item.loss>.005)){
  const anchor=map(item),last=losses.at(-1);
  if(last&&last.id===item.id&&item.t-last.t<.05&&Math.hypot(anchor.x-last.anchor.x,anchor.y-last.anchor.y)<10){last.loss+=item.loss;last.t=item.t;last.parts.push([item.from,item.to]);}
  else losses.push({...item,anchor,parts:[[item.from,item.to]]});
 }
 const cards=[];
 for(const item of losses){
  const diamondLoss=Number.isFinite(preview.strokeFeel)?preview.strokeFeel*item.loss/100:null;
  const text='Rail loss · '+format(item.loss)+'%'+(diamondLoss!==null?' · '+format(diamondLoss)+'D':'');
  const card=placeBadge([{text,color:'#f0f4ed'}],item.anchor,options);
  if(card)cards.push({...card,type:'rail-loss',loss:item.loss,diamondLoss,parts:item.parts,id:item.id});
 }
 return cards;
}
function drawContacts(ctx,cards){
 ctx.save();ctx.textAlign='left';ctx.textBaseline='middle';
 for(const card of cards){
  const {box,anchor,rows,fontSize,row,pad}=card;
  const x=Math.max(box.left,Math.min(box.right,anchor.x)),y=Math.max(box.top,Math.min(box.bottom,anchor.y));
  if(card.type!=='overlap'){
   ctx.strokeStyle='#b8dce24d';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(anchor.x,anchor.y);ctx.lineTo(x,y);ctx.stroke();
   ctx.fillStyle='#5a99a5c7';ctx.beginPath();ctx.roundRect(box.left,box.top,box.right-box.left,box.bottom-box.top,3);ctx.fill();
  }
  ctx.font='600 '+fontSize+'px Segoe UI, sans-serif';
  rows.forEach((r,i)=>{const x=box.left+pad,y=box.top+pad+row*(i+.5);if(card.type==='overlap'){ctx.strokeStyle='#153c4866';ctx.lineWidth=2;ctx.strokeText(r.text,x,y);}ctx.fillStyle=card.type==='overlap'?'#ffffff':r.color;ctx.fillText(r.text,x,y);});
 }
 ctx.restore();
}
function labels(preview,map,options={}){
 const result=[],occupied=options.occupied||[],width=options.width||Infinity,height=options.height||Infinity;
 const number=value=>format(value),fontSize=width<600?9:11;
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
const api={energy,create,labels,draw,contactLabels,drawContacts,format,exchange,placeBadge,segmentIntersects,journey,railLabels};
if(typeof module==='object'&&module.exports)module.exports=api;
else root.BilliardsShotBudget=api;
})(typeof window==='object'?window:globalThis);
