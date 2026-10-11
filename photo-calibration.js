/* Table coordinates stay fixed: P1 clockwise through P6; head left, foot right. */
(function(root){
  'use strict';
  const pockets=[{x:0,y:0},{x:.5,y:0},{x:1,y:0},{x:1,y:1},{x:.5,y:1},{x:0,y:1}];
  function region(end='full',diamonds=4,custom){
    if(end==='custom')return customRegion(custom);
    const span=end==='full'?1:Math.max(2,Math.min(8,Math.round(Number(diamonds)||4)))/8;
    return {x0:end==='foot'?1-span:0,x1:end==='foot'?1:span};
  }
  function customRegion(r={x0:.25,x1:.75,y0:0,y1:1}){
    const snap=(v,n,f)=>Math.max(0,Math.min(1,Math.round((Number.isFinite(Number(v))?Number(v):f)*n)/n));
    let x0=snap(r.x0,16,.25),x1=snap(r.x1,16,.75),y0=snap(r.y0,8,0),y1=snap(r.y1,8,1);
    x0=Math.min(x0,15/16);x1=Math.max(x0+1/16,x1);y0=Math.min(y0,7/8);y1=Math.max(y0+1/8,y1);
    return {x0,x1,y0,y1};
  }
  function anchors(r){return [{x:r.x0,y:r.y0??0},{x:r.x1,y:r.y0??0},{x:r.x1,y:r.y1??1},{x:r.x0,y:r.y1??1}];}
  function diamonds(){
    const result=[];
    for(let i=1;i<8;i++)if(i!==4){
      result.push({id:'top-'+i,x:i/8,y:0,label:'R'+(i<4?1:2)+' · diamond '+(i<4?i:i-4)});
      result.push({id:'bottom-'+i,x:i/8,y:1,label:'R'+(i<4?5:4)+' · diamond '+(i<4?4-i:8-i)});
    }
    for(let j=1;j<4;j++){
      result.push({id:'right-'+j,x:1,y:j/4,label:'R3 · diamond '+j});
      result.push({id:'left-'+j,x:0,y:j/4,label:'R6 · diamond '+(4-j)});
    }
    return result;
  }
  function apply(H,p){const z=H[6]*p.x+H[7]*p.y+H[8];return {x:(H[0]*p.x+H[1]*p.y+H[2])/z,y:(H[3]*p.x+H[4]*p.y+H[5])/z};}
  function multiply(a,b){return a.map((_,i)=>{const r=Math.floor(i/3),c=i%3;return a[r*3]*b[c]+a[r*3+1]*b[3+c]+a[r*3+2]*b[6+c];});}
  function inverse(H){
    const [a,b,c,d,e,f,g,h,i]=H;
    const result=[e*i-f*h,c*h-b*i,b*f-c*e,f*g-d*i,a*i-c*g,c*d-a*f,d*h-e*g,b*g-a*h,a*e-b*d];
    const det=a*result[0]+b*result[3]+c*result[6];
    return Math.abs(det)>1e-12?result.map(v=>v/det):null;
  }
  function solve(A,b){
    const M=A.map((r,i)=>r.concat(b[i])),n=b.length;
    for(let c=0;c<n;c++){
      let k=c;for(let r=c+1;r<n;r++)if(Math.abs(M[r][c])>Math.abs(M[k][c]))k=r;
      if(Math.abs(M[k][c])<1e-10)return null;
      [M[k],M[c]]=[M[c],M[k]];
      const v=M[c][c];for(let j=c;j<=n;j++)M[c][j]/=v;
      for(let r=0;r<n;r++)if(r!==c){const v=M[r][c];for(let j=c;j<=n;j++)M[r][j]-=v*M[c][j];}
    }
    return M.map(r=>r[n]);
  }
  function normalize(points){
    const c=points.reduce((a,p)=>({x:a.x+p.x/points.length,y:a.y+p.y/points.length}),{x:0,y:0});
    const dist=points.reduce((v,p)=>v+Math.hypot(p.x-c.x,p.y-c.y)/points.length,0);
    const s=dist>1e-12?Math.SQRT2/dist:1;
    const T=[s,0,-s*c.x,0,s,-s*c.y,0,0,1];
    return {T,points:points.map(p=>apply(T,p))};
  }
  function fit(src,dst){
    if(src.length!==dst.length||src.length<4||[...src,...dst].some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return null;
    const S=normalize(src),D=normalize(dst),rows=[],rhs=[];
    S.points.forEach((p,i)=>{const q=D.points[i];rows.push([p.x,p.y,1,0,0,0,-q.x*p.x,-q.x*p.y],[0,0,0,p.x,p.y,1,-q.y*p.x,-q.y*p.y]);rhs.push(q.x,q.y);});
    const A=Array.from({length:8},()=>Array(8).fill(0)),b=Array(8).fill(0);
    rows.forEach((r,k)=>{for(let i=0;i<8;i++){b[i]+=r[i]*rhs[k];for(let j=0;j<8;j++)A[i][j]+=r[i]*r[j];}});
    const h=solve(A,b);if(!h)return null;
    const H=multiply(multiply(inverse(D.T),h.concat(1)),S.T);
    if(!H.every(Number.isFinite)||!inverse(H))return null;
    const rms=Math.sqrt(src.reduce((v,p,i)=>{const q=apply(H,p);return v+(q.x-dst[i].x)**2+(q.y-dst[i].y)**2;},0)/src.length);
    return Number.isFinite(rms)?{H,inverse:inverse(H),rms}:null;
  }
  function validQuad(points){
    if(points.length!==4)return false;
    const turns=points.map((p,i)=>{const q=points[(i+1)%4],r=points[(i+2)%4];return (q.x-p.x)*(r.y-q.y)-(q.y-p.y)*(r.x-q.x);});
    return turns.every(v=>v>1e-6)||turns.every(v=>v< -1e-6);
  }
  // Draw in normalized table coordinates, with any perspective mapping.
  function references(ctx,map,alpha=.10){
    function path(points,fill=false){ctx.beginPath();points.forEach((p,i)=>{const q=map(p);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);});if(fill){ctx.closePath();ctx.fill();}else ctx.stroke();}
    ctx.save();ctx.strokeStyle='rgba(255,255,255,'+alpha+')';ctx.fillStyle='rgba(255,255,255,'+(alpha*.35)+')';ctx.lineWidth=1;
    path([{x:0,y:0},{x:.25,y:0},{x:.25,y:1},{x:0,y:1}],true);
    for(let i=1;i<8;i++)path([{x:i/8,y:0},{x:i/8,y:1}]);
    for(let j=1;j<4;j++)path([{x:0,y:j/4},{x:1,y:j/4}]);
    path([{x:.75,y:.5},{x:.84,y:.5-.18},{x:.84,y:.5+.18},{x:.75,y:.5}]);
    // Half-diamond lines divide each diamond square into four smaller squares.
    ctx.strokeStyle='rgba(255,255,255,'+(alpha*.65)+')';ctx.setLineDash([2,4]);
    for(let i=1;i<16;i+=2)path([{x:i/16,y:0},{x:i/16,y:1}]);
    for(let j=1;j<8;j+=2)path([{x:0,y:j/8},{x:1,y:j/8}]);
    ctx.restore();
  }
  const api={pockets,region,customRegion,anchors,diamonds,fit,apply,inverse,validQuad,references};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.BilliardsPhotoCalibration=api;
})(typeof window!=='undefined'?window:globalThis);
