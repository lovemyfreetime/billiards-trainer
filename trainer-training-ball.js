(function(root){
 'use strict';
 const styles=['current','spots','split','stripe'],speeds=[1,.5,.25,.125];
 const normalize=q=>{if(!Array.isArray(q)||q.length!==4||!q.every(Number.isFinite))return [0,0,0,1];const n=Math.hypot(...q);return n>1e-12?q.map(v=>v/n):[0,0,0,1];};
 function multiply(a,b){return normalize([a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]]);}
 function axisAngle(axis,angle){const n=Math.hypot(...axis);if(n<1e-12)return [0,0,0,1];const s=Math.sin(angle/2)/n;return [axis[0]*s,axis[1]*s,axis[2]*s,Math.cos(angle/2)];}
 function rotate(q,v){const [x,y,z,w]=normalize(q),[a,b,c]=v,tx=2*(y*c-z*b),ty=2*(z*a-x*c),tz=2*(x*b-y*a);return [a+w*tx+y*tz-z*ty,b+w*ty+z*tx-x*tz,c+w*tz+x*ty-y*tx];}
 function between(a,b){const dot=a.reduce((s,v,i)=>s+v*b[i],0);if(dot<-.999999){let axis=[0,-a[2],a[1]];if(Math.hypot(...axis)<.01)axis=[-a[2],0,a[0]];return axisAngle(axis,Math.PI);}return normalize([a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0],1+dot]);}
 function integrate(q,wx,wy,wz,dt){const axis=[-wx,-wz,-wy],n=Math.hypot(...axis);return n>1e-10?multiply(axisAngle(axis,n*dt),q):q.slice();}
 function slerp(a,b,t){a=normalize(a);b=normalize(b);let d=a.reduce((s,v,i)=>s+v*b[i],0);if(d<0){b=b.map(v=>-v);d=-d;}if(d>.9995)return normalize(a.map((v,i)=>v+(b[i]-v)*t));const theta=Math.acos(Math.min(1,d)),s=Math.sin(theta);return a.map((v,i)=>(v*Math.sin((1-t)*theta)+b[i]*Math.sin(t*theta))/s);}
 function sample(frames,time){
  if(time<=frames[0][0].t)return frames[0];if(time>=frames.at(-1)[0].t)return frames.at(-1);
  let lo=0,hi=frames.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(frames[m][0].t<=time)lo=m;else hi=m;}
  const a=frames[lo],b=frames[hi],f=(time-a[0].t)/(b[0].t-a[0].t);
  return a.map((v,i)=>{const w=b[i],out={...v,t:time};for(const k of ['x','y','z','vx','vy','vz','wx','wy','wz'])out[k]=v[k]+(w[k]-v[k])*f;if(v.orientation&&w.orientation)out.orientation=slerp(v.orientation,w.orientation,f);return out;});
 }
 const white=[245,243,233],red=[207,34,43],black=[20,23,27],gray=[150,155,150];
 function color(style,n){
  if(style==='split')return n[0]>=0?red:white;
  // The same spherical band as rows 78..177 of the existing 256-row stripe map.
  if(style==='stripe')return Math.abs(n[1])<Math.sin(Math.PI*50/256)?black:white;
  // Generic six-spot training pattern, with equal angular-size spherical caps.
  if(style==='spots')return Math.max(...n.map(Math.abs))>=Math.cos(.19)?red:white;
  return Math.max(...n.map(Math.abs))>=Math.cos(.085)?gray:white;
 }
 function texture(style){const c=document.createElement('canvas');c.width=512;c.height=256;const ctx=c.getContext('2d'),im=ctx.createImageData(512,256);for(let y=0;y<256;y++){const theta=(y+.5)*Math.PI/256;for(let x=0;x<512;x++){const phi=(x+.5)*2*Math.PI/512,n=[-Math.cos(phi)*Math.sin(theta),Math.cos(theta),Math.sin(phi)*Math.sin(theta)],rgb=color(style,n),i=(y*512+x)*4;im.data.set([...rgb,255],i);}}ctx.putImageData(im,0,0);return c;}
 function sphere(canvas,style,q,basis={right:[1,0,0],up:[0,1,0],front:[0,0,1]}){
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,r=Math.min(w,h)*.46,im=ctx.createImageData(w,h),inv=normalize(q).map((v,i)=>i<3?-v:v);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const u=(x+.5-w/2)/r,v=(h/2-y-.5)/r,z2=1-u*u-v*v;if(z2<0)continue;const z=Math.sqrt(z2),n=basis.right.map((a,i)=>a*u+basis.up[i]*v+basis.front[i]*z),rgb=color(style,rotate(inv,n)),light=.6+.4*Math.max(0,(-u+v+2*z)/Math.sqrt(6)),i=(y*w+x)*4;im.data.set([...rgb.map(a=>Math.round(a*light)),Math.min(255,Math.round(z2*r*255))],i);}
  ctx.putImageData(im,0,0);return canvas;
 }
 function motion(b,R){if(!b)return '';if(b.z>R+.001)return 'Airborne';const v=Math.hypot(b.vx||0,b.vy||0),side=Math.abs((b.wz||0)*R)>.01;if(v<.002)return side?'Spinning in place':'At rest';const roll=R*(-b.wx*b.vy+b.wy*b.vx)/v,slip=Math.hypot(b.vx-R*b.wy,b.vy+R*b.wx);let label=slip<.008?'Natural roll':Math.hypot(b.wx,b.wy)*R<.008?'Stun · sliding':roll<-.008?'Backspin · sliding':roll>v+.008?'Overspin · sliding':'Forward spin · sliding';return label+(side?' + side spin':'');}
 const api={styles,speeds,normalize,multiply,axisAngle,rotate,between,integrate,slerp,sample,color,texture,sphere,motion};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BilliardsTrainingBall=api;
})(typeof window==='undefined'?globalThis:window);
