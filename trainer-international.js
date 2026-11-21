(function(root){
'use strict';
const tables={
 pool:{},
 carom:{tableL:2.84,tableW:1.42,ballR:.03075,cloth:'#28768a',nose:.037,muRoll:.008,fastMuRoll:.0045,muSpin:.022},
 snooker:{tableL:3.569,tableW:1.778,ballR:.02625,cloth:'#27653d',cornerMouth:.086,sideMouth:.092,muSlide:.21,muRoll:.0128,spinDeceleration:22,nap:.025,baulk:.737,d:.292,black:.324},
 blackball:{tableL:1.829,tableW:.9145,ballR:.0254,cloth:'#2a674c',cornerMouth:.082,sideMouth:.088,muRoll:.016,baulk:.366},
 pyramid:{tableL:3.50,tableW:1.75,ballR:.034,cloth:'#2c6b45',cornerMouth:.072,sideMouth:.082,nose:.042,muRoll:.013}
};
const setups={
 carom3:['carom','carom','Three-Cushion'],
 caromStraight:['carom','carom','Straight Rail'],
 carom4:['carom','carom4','Four-Ball Carom'],
 snooker15:['snooker','snooker','15-Red Snooker'],
 snookerPlus:['snooker','snookerPlus','Snooker Plus'],
 englishBilliards:['snooker','english','English Billiards'],
 blackballRY:['blackball','blackball','Blackball — Red / Yellow'],
 blackballBY:['blackball','blackballBlue','Blackball — Blue / Yellow'],
 pyramid15:['pyramid','pyramid','Russian Pyramid']
};
const sets={classic:15,tv:15,black:15,carom:2,carom4:3,snooker:21,snookerPlus:23,english:2,blackball:15,blackballBlue:15,pyramid:15};
const cue='#f5f3e9',yellow='#efd035',red='#cf3035',blue='#2360b9',pink='#ed79ad',black='#15181d';
const snookerColors=[yellow,'#24824c','#825135',blue,pink,black,'#ed8829','#7944a0'];
const snookerNames=['Yellow','Green','Brown','Blue','Pink','Black','Orange','Purple'];
const owns=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
const tableType=key=>owns(tables,key)?key:'pool';
const ballSet=key=>owns(sets,key)?key:'classic';
const poolSet=key=>['classic','tv','black'].includes(ballSet(key));
const maxId=key=>sets[ballSet(key)];
function ball(set,id){
 const value=ballSet(set);
 if(value==='classic')return null;
 if(poolSet(value)){
  const base=id>8?id-8:id;
  if(!id)return null;
  return {color:value==='black'&&base===5?'#763bb1':({4:pink,7:'#a8744d'})[base],
   stripe:id>8,ground:value==='black'?'#16181c':cue,badge:value==='black'?'#16181c':'#faf8ee',
   ink:value==='black'?'#f9f4e8':'#161c20',number:id};
 }
 if(value==='carom'||value==='carom4'||value==='english'){
  const color=[cue,yellow,red,red][id];
  const name=['White cue ball','Yellow cue ball','Red','Red'][id];
  return {color,name,dots:id<2&&value!=='english'};
 }
 if(value==='pyramid')return {color:id?'#f3e8d3':'#7c162d',name:id?'Ball '+id:'Crimson cue ball',number:id||null,badge:null,ink:'#791a24'};
 if(value==='blackball'||value==='blackballBlue'){
  if(id===8)return {color:black,name:'Black',number:8,badge:'#faf8ee',ink:'#161c20'};
  return {color:id===0?cue:id>8?yellow:value==='blackballBlue'?blue:red,name:id===0?'Cue ball':id>8?'Yellow':value==='blackballBlue'?'Blue':'Red'};
 }
 if(!id)return {color:cue,name:'Cue ball'};
 return id<=15?{color:red,name:'Red'}:{color:snookerColors[id-16],name:snookerNames[id-16]};
}
function setup(key){
 if(!owns(setups,key))return null;
 const [type,set,name]=setups[key],table=tables[type],{tableL:L,tableW:W,ballR:R}=table,mid=W/2;
 const balls=[];
 const place=(id,x,y=mid)=>balls.push({id,n:id?String(id):'CB',x,y,active:true});
 const triangle=(ids,x,size=5)=>{
  let i=0;
  for(let row=0;row<size;row++)for(let col=0;col<=row;col++)place(ids[i++],x+row*Math.sqrt(3)*R,mid+(2*col-row)*R);
 };
 if(type==='carom'){
  place(0,L/4,mid-.1825);place(1,L/4);place(2,L*3/4);
  if(set==='carom4')place(3,L/2);
 }else if(type==='snooker'){
  const x=table.baulk,pinkX=L*3/4;
  place(0,x-table.d*.5,mid);
  if(set==='english'){place(2,L-table.black);}
  else{
   place(16,x,mid+table.d);place(17,x,mid-table.d);place(18,x);
   place(19,L/2);place(20,pinkX);place(21,L-table.black);
   triangle(Array.from({length:15},(_,i)=>i+1),pinkX+2*R+.0005);
   if(set==='snookerPlus'){place(22,(L/2+pinkX)/2);place(23,(x+L/2)/2);}
  }
 }else if(type==='blackball'){
  place(0,table.baulk*.8);triangle([1,9,2,3,8,10,11,4,12,5,6,13,7,14,15],L*3/4-2*Math.sqrt(3)*R);
 }else{
  place(0,L/4);triangle(Array.from({length:15},(_,i)=>i+1),L*3/4);
 }
 return {type,set,name,table,balls};
}
function caromRebound(b,nx,ny,R,height,restitution,tangentialRetention){
    const rise = height / R - 1;
    if (Math.abs(rise) >= 1) return false;
    const span = Math.sqrt(1 - rise * rise);
    const tx = -ny, ty = nx;
    const vn = b.vx * nx + b.vy * ny, vt = b.vx * tx + b.vy * ty;
    const wn = b.wx * nx + b.wy * ny, wt = b.wx * tx + b.wy * ty;
    if (vn >= 0) return false;
    // Resolve at the raised cushion nose in its normal and two tangent directions.
    // A solid sphere has inverse effective tangential mass 1 + mR²/I = 3.5.
    const normalImpulse = -(1 + restitution) * vn * span;
    const tangentSlip = vt - R * (span * b.wz + rise * wn);
    const faceSlip = rise * vn + R * wt;
    const slip = Math.hypot(tangentSlip, faceSlip);
    const frictionScale = slip ? Math.min(1 / 3.5, .18 * normalImpulse / slip) : 0;
    const along = -frictionScale * tangentSlip, up = -frictionScale * faceSlip;
    const normalOut = vn + span * normalImpulse + rise * up;
    // Tuning the ball diameter can put the nose almost over its pole. Use the
    // planar rail response if projecting the impulse onto the bed cannot separate it.
    if (normalOut <= 0) return false;
    const tangentOut = (vt + along) * tangentialRetention;
    b.vx = normalOut * nx + tangentOut * tx;
    b.vy = normalOut * ny + tangentOut * ty;
    b.wx += 2.5 / R * (up * tx - rise * along * nx);
    b.wy += 2.5 / R * (up * ty - rise * along * ny);
    b.wz -= 2.5 / R * span * along;
    return true;
}
const api={caromRebound,tables,setups,tableType,ballSet,poolSet,maxId,ball,setup};
if(typeof module==='object'&&module.exports)module.exports=api;else root.BilliardsInternational=api;
})(typeof window==='object'?window:globalThis);
