(function(root){
'use strict';
const railWidth=.15875;
// Presentation dimensions in metres. Mouths and jaw slopes come from the live
// collision model; the separate slate shelf/drop and rail profile follow real construction.
function plan(f){
 const G=f.G||{cornerMouth:.110,cornerLeg:.110/Math.SQRT2,cornerJawOut:.043,cornerThroatInset:.014,sideMouth:.120,sideThroat:.096,sideJawOut:.026};
 const cushionWidth=.050,capHeight=.044,noseHeight=f.R*2*.635,backDraft=13.5*Math.PI/180;
 const c=G.cornerLeg,s=G.sideMouth/2,cs=(c-G.cornerThroatInset)/G.cornerJawOut,ss=(s-G.sideThroat/2)/G.sideJawOut,L=f.L/2,W=f.W/2;
 const rail=(a,b,n,sa,sb,pocket,aOut,bOut)=>{
  const length=Math.hypot(b[0]-a[0],b[1]-a[1]),u=[(b[0]-a[0])/length,(b[1]-a[1])/length];
  const at=(end,v,h)=>{const draft=(noseHeight-h)*Math.tan(backDraft)*(end?-1:1),along=(end?length:0)+(end?sb:sa)*Math.min(v,end?bOut:aOut)+draft;return [a[0]+u[0]*along+n[0]*v,h,a[1]+u[1]*along+n[1]*v];};
  return {a,b,n,u,length,sa,sb,pocket,aOut,bOut,at};
 };
 const co=G.cornerJawOut,so=G.sideJawOut;
 const rails=[rail([-L+c,-W],[-s,-W],[0,-1],-cs,ss,2,co,so),rail([s,-W],[L-c,-W],[0,-1],-ss,cs,3,so,co),rail([L,-W+c],[L,W-c],[1,0],-cs,cs,4,co,co),rail([L-c,W],[s,W],[0,1],-cs,ss,5,co,so),rail([-s,W],[-L+c,W],[0,1],-ss,cs,6,so,co),rail([-L,W-c],[-L,-W+c],[-1,0],-cs,cs,1,co,co)];
 const pockets=[[1,-1,-1],[2,0,-1],[3,1,-1],[4,1,1],[5,0,1],[6,-1,1]].map(([id,sx,sz])=>{
  const corner=sx!==0,n=[corner?sx*Math.SQRT1_2:0,corner?sz*Math.SQRT1_2:sz],t=[-n[1],n[0]],origin=[sx*L,sz*W],front=corner?-c*Math.SQRT1_2:0;
  const shelf=corner?.030:.004,rn=corner?.063:.059,rt=corner?.067:.067,centerN=front+shelf+rn,rear=corner?.122:.128;
  const at=(v,q,h=0)=>[origin[0]+n[0]*v+t[0]*q,h,origin[1]+n[1]*v+t[1]*q];
  const local=p=>[(p[0]-origin[0])*n[0]+(p[2]-origin[1])*n[1],(p[0]-origin[0])*t[0]+(p[2]-origin[1])*t[1]];
  const ellipse=(angle,inset=0,h=0)=>at(centerN+(rn-inset)*Math.cos(angle),(rt-inset)*Math.sin(angle),h);
  return {id,corner,n,t,origin,front,shelf,rn,rt,centerN,rear,at,local,ellipse};
 });
 const inside=[];
 rails.forEach((r,i)=>{
  const a=r.at(0,cushionWidth,capHeight),b=r.at(1,cushionWidth,capHeight),next=rails[(i+1)%6].at(0,cushionWidth,capHeight),p=pockets[r.pocket-1];
  inside.push(a,b);const aa=p.local(b),bb=p.local(next),samples=[b];
  // Flare behind the throat into a broad recess; the boot must not look like a pipe.
  const bez=(a,b,c,d,t)=>a*(1-t)**3+3*b*t*(1-t)**2+3*c*t*t*(1-t)+d*t*t*t;
  const width=p.corner?.071:.075;
  for(let j=1;j<=32;j++){const t=j/32;samples.push(p.at(bez(aa[0],aa[0]+.018,p.rear,p.rear,t),bez(aa[1],-width,-width,0,t),capHeight));}
  for(let j=1;j<=32;j++){const t=j/32;samples.push(p.at(bez(p.rear,p.rear,bb[0]+.018,bb[0],t),bez(0,width,width,bb[1],t),capHeight));}
  p.backPath=samples;
  // The slate opening has a rounded front and continues underneath the boot.
  // A separate closed ellipse would leave an exposed cloth tongue at its rear.
  p.dropPath=[...samples,...Array.from({length:49},(_,j)=>p.ellipse(Math.PI/2+j/48*Math.PI)),samples[0]];
  inside.push(...samples.slice(1));
 });
 // Rounded nose, sloping cloth top, underside and backing. Nose at the same
 // horizontal position as the physics rail; height is 63.5% of ball diameter.
 const baseProfile=[[0,noseHeight],[.0008,noseHeight+.0017],[.0035,noseHeight+.0030],[.012,noseHeight+.0049],[cushionWidth,capHeight],[cushionWidth,.003],[.009,.008],[.0025,noseHeight-.004],[.0005,noseHeight-.0015]],profile=[];
 // Vertices at each jaw end keep the end faces on the actual collision segments.
 for(let i=0;i<baseProfile.length;i++){const a=baseProfile[i],b=baseProfile[(i+1)%baseProfile.length];profile.push(a);for(const v of [co,so].filter(v=>v>Math.min(a[0],b[0])&&v<Math.max(a[0],b[0])).sort((u,v)=>a[0]<b[0]?u-v:v-u))profile.push([v,a[1]+(b[1]-a[1])*(v-a[0])/(b[0]-a[0])]);}
 return {L:f.L,W:f.W,R:f.R,G,railWidth,cushionWidth,capHeight,noseHeight,backDraft,rails,pockets,inside,profile,linerWidth:.006,linerInset:.0008,edgeRadius:.0012};
}
const api={plan,railWidth};if(typeof module==='object'&&module.exports)module.exports=api;else root.BilliardsTableConstruction=api;
})(typeof window==='object'?window:globalThis);
