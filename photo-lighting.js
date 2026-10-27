/* Exposure assistance changes luminance only; identity colors use original pixels. */
(function(root){
'use strict';
function balance(img){const {width:w,height:h,data}=img,out=new Uint8ClampedArray(data),hist=new Uint32Array(256);let n=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(Math.hypot(x-w/2,y-h/2)<Math.min(w,h)*.27){const i=(y*w+x)*4;hist[Math.max(data[i],data[i+1],data[i+2])]++;n++;}let sum=0,median=128;for(let i=0;i<256;i++){sum+=hist[i];if(sum>=n*.5){median=i;break;}}const gamma=Math.max(.65,Math.min(1.45,Math.log(.58)/Math.log(Math.max(.04,Math.min(.96,median/255)))));for(let i=0;i<out.length;i+=4){const hi=Math.max(data[i],data[i+1],data[i+2]);if(!hi)continue;const gain=Math.pow(hi/255,gamma)*255/hi;for(let k=0;k<3;k++)out[i+k]=Math.min(255,Math.round(data[i+k]*gain));}return {width:w,height:h,data:out,gamma};}
const api={balance};if(typeof module==='object'&&module.exports)module.exports=api;else root.BilliardsPhotoLighting=api;
})(typeof window==='object'?window:globalThis);
