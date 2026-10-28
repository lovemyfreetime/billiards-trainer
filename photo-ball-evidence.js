/* Conservative visual evidence: support learned identities without inventing
   palette certainty or replacing strong number/pattern evidence with cloth hue. */
(function(root){
'use strict';
const distance=(a,b)=>Math.min(Math.abs(a-b)%360,360-Math.abs(a-b)%360);
function adjust(scores,appearance,ids){
 const a=appearance||{},rank=scores.map((v,i)=>({v,i})).sort((x,y)=>y.v-x.v),top=rank[0],second=rank[1];
 const strong=top&&top.v>=.45&&top.v-(second?.v||0)>=.22;
 const hueStrength=Math.max(0,Math.min(1,((a.hueStrength||0)-.3)/.6));
 const coverage=Math.max(0,Math.min(1,((a.colorPixels||0)-.10)/.35));
 const evidence=hueStrength*coverage,targets={1:54,2:215,3:2,4:285,5:30,6:125,7:350};
 return scores.map((score,i)=>{
  const id=Number(ids[i]),base=id>8?id-8:id;let support=0;
  // Color is supporting evidence. Never create a high score from absent neural
  // evidence, and protect a clear learned winner across alternative ball sets.
  if(id!==0&&id!==8&&Number.isFinite(a.dominantHue)&&evidence>.1){
   const d=distance(a.dominantHue,targets[base]);
   support+=evidence*(d<28?.18:d>80?-.12:0);
  }
  const stripe=(a.outerWhite||0)>.22&&(a.color||0)>.12;
  const solid=(a.outerWhite||0)<.10&&(a.color||0)>.40;
  if(id>=9&&stripe)support+=.10;
  if(id>=1&&id<=7&&solid)support+=.08;
  if(id===0&&(a.white||0)>.55&&(a.color||0)<.10)support+=.12;
  if(id===8&&(a.dark||0)>.35)support+=.10;
  if(strong)support*=.2;
  return Math.max(0,Math.min(1,score*(1+Math.max(-.18,Math.min(.25,support)))));
 });
}
function tableBounds(corners,width,height){
 if(!Array.isArray(corners)||corners.length!==4||corners.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return {x:0,y:0,width,height};
 const xs=corners.map(p=>p.x),ys=corners.map(p=>p.y),dx=Math.max(...xs)-Math.min(...xs),dy=Math.max(...ys)-Math.min(...ys);
 const x=Math.max(0,Math.floor(Math.min(...xs)-dx*.04)),y=Math.max(0,Math.floor(Math.min(...ys)-dy*.08));
 const right=Math.min(width,Math.ceil(Math.max(...xs)+dx*.04)),bottom=Math.min(height,Math.ceil(Math.max(...ys)+dy*.08));
 return right-x>=32&&bottom-y>=32?{x,y,width:right-x,height:bottom-y}:{x:0,y:0,width,height};
}
const api={adjust,tableBounds};if(typeof module==='object'&&module.exports)module.exports=api;else root.BilliardsBallEvidence=api;
})(typeof window==='object'?window:globalThis);
