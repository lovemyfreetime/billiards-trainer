/* Reject only uniformly felt-colored patches; uncertain ball surfaces survive. */
(function(root){
'use strict';
function inspect(img,diameter){
 const {width:w,height:h,data}=img||{},fail={isCloth:false};
 if(!data||w<32||h<32||diameter<16||data.length<w*h*4)return fail;
 const cx=(w-1)/2,cy=(h-1)/2,r=diameter/2,ring=[];
 function pixel(x,y){x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=w||y>=h)return null;const i=(y*w+x)*4;return Array.from(data.slice(i,i+3));}
 // Fit gentle lighting gradients from a surrounding ring. Do not interpret a
 // patch with nearby balls, rails or mixed background as empty cloth.
 for(let i=0;i<64;i++){const a=i*Math.PI/32,x=Math.cos(a),y=Math.sin(a),p=pixel(cx+r*1.65*x,cy+r*1.65*y);if(!p)return fail;ring.push({x,y,p});}
 const base=[0,1,2].map(k=>ring.reduce((n,s)=>n+s.p[k],0)/64);
 const hi=Math.max(...base),lo=Math.min(...base);if(hi<55||(hi-lo)/hi<.18)return fail;
 const gx=[0,1,2].map(k=>ring.reduce((n,s)=>n+s.x*s.p[k],0)/32),gy=[0,1,2].map(k=>ring.reduce((n,s)=>n+s.y*s.p[k],0)/32);
 function distance(p,x,y){return Math.hypot(...p.map((v,k)=>v-base[k]-gx[k]*x-gy[k]*y));}
 const residual=ring.map(s=>distance(s.p,s.x,s.y)).sort((a,b)=>a-b);
 if(residual[57]>14||residual[63]>26)return fail;
 let total=0,contrast=0;const errors=[];
 for(let y=Math.ceil(cy-r*1.16);y<=cy+r*1.16;y++)for(let x=Math.ceil(cx-r*1.16);x<=cx+r*1.16;x++){
  if(Math.hypot(x-cx,y-cy)>r*1.16)continue;const p=pixel(x,y);if(!p)return fail;
  const error=distance(p,(x-cx)/(r*1.65),(y-cy)/(r*1.65));total++;errors.push(error);if(error>22)contrast++;
 }
 errors.sort((a,b)=>a-b);
 // Even a small number patch, stripe, rim or ball shadow is enough to retain
 // a candidate. Missing ball-body segmentation alone never removes it.
 const fraction=contrast/Math.max(1,total);
 return {isCloth:fraction<.008&&errors[Math.floor(errors.length*.98)]<18,contrastFraction:fraction};
}
const api={inspect};if(typeof module==='object'&&module.exports)module.exports=api;else root.BilliardsClothFilter=api;
})(typeof window==='object'?window:globalThis);
