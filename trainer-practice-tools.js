/* Read-only rolling-reference eligibility; never changes the shot solver. */
(function(root){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function counterValue(value){return clamp(Number.isFinite(+value)?Math.trunc(+value):0,0,999)}
function rollingReference(contact,table){
 const c=contact,m=c?.motion,a=c?.after,R=table.ballR;
 if(!m||!a||table.airbornePhysics||!Number.isFinite(c.cutAngle)||!c.incoming||!c.cuePos)return null;
 if(![m.speed,m.slipRatio,m.sideRatio,m.objectSpeed,m.elevation,a.vx,a.vy,a.wx,a.wy,R,table.tableL,table.tableW].every(Number.isFinite))return null;
 const min=Math.asin(.25),max=Math.asin(.75),v=m.speed;
 // 1/4–3/4 hit, natural roll at impact, nearly level/no meaningful sidespin.
 // 8% slip and 10% side-spin ratios are conservative display tolerances.
 if(c.cutAngle<min||c.cutAngle>max||!(v>=.12)||m.slipRatio>.08||m.sideRatio>.10||Math.abs(m.appliedSide||0)>.10||m.objectSpeed>.03||m.elevation>10)return null;
 const ux=a.vx-R*a.wy,uy=a.vy+R*a.wx,slip=Math.hypot(ux,uy),mu=table.muSlide,g=9.81;
 if(!(mu>0))return null;
 const time=slip/(3.5*mu*g),length=table.tableL/4;
 const sx=a.vx*time-(slip?ux/slip:0)*.5*mu*g*time*time,sy=a.vy*time-(slip?uy/slip:0)*.5*mu*g*time*time;
 // At firm speed the cue ball initially follows its tangent then curves; do not
 // suggest a short, straight natural-angle reference while that curve dominates.
 if(Math.hypot(sx,sy)>table.tableL*9/128)return null;
 const sign=Math.sign(c.signedOffset);if(!sign)return null;
 const rx=a.vx-ux/3.5,ry=a.vy-uy/3.5;
 const exit=Math.atan2(c.incoming.x*ry-c.incoming.y*rx,c.incoming.x*rx+c.incoming.y*ry)*180/Math.PI;
 if(Math.abs(exit)<23||Math.abs(exit)>37||Math.sign(exit)!==-sign)return null;
 const angle=-sign*Math.PI/6,cos=Math.cos(angle),sin=Math.sin(angle),d={x:c.incoming.x*cos-c.incoming.y*sin,y:c.incoming.x*sin+c.incoming.y*cos};
 let endLength=length;
 for(const [pos,dir,maxPos]of [[c.cuePos.x,d.x,table.tableL-R],[c.cuePos.y,d.y,table.tableW-R]]){
  if(dir>1e-9)endLength=Math.min(endLength,(maxPos-pos)/dir);
  else if(dir< -1e-9)endLength=Math.min(endLength,(R-pos)/dir);
 }
 if(endLength<R*2)return null;
 return {start:{...c.cuePos},end:{x:c.cuePos.x+d.x*endLength,y:c.cuePos.y+d.y*endLength},direction:d,length:endLength,settleDistance:Math.hypot(sx,sy),cutDegrees:c.cutAngle*180/Math.PI};
}
function compassMarks(rotation=0){return {dots:Array.from({length:72},(_,i)=>({degrees:i*5,angle:rotation+i*Math.PI/36,major:i%2===0})),spokes:[30,150,210,330].map(degrees=>({degrees,angle:rotation+degrees*Math.PI/180}))}}
const api={counterValue,rollingReference,compassMarks};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BilliardsPracticeTools=api;
})(typeof window!=='undefined'?window:globalThis);
