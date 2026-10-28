const assert=require('node:assert/strict'),{detect,suggest}=require('../photo-corner-sensing');
function scene(quad,cloth=[30,155,120],W=720,H=480){const data=new Uint8ClampedArray(W*H*4);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const inside=quad.every((a,i)=>{const b=quad[(i+1)%4];return (b.x-a.x)*(y-a.y)-(b.y-a.y)*(x-a.x)>=0;}),i=(y*W+x)*4,gain=.55+.7*x/W,noise=((x*13+y*7)%9)-4;for(let k=0;k<3;k++)data[i+k]=inside?Math.max(0,cloth[k]*gain+noise):[45,34,29][k];data[i+3]=255;}
 for(const p of quad)for(let y=Math.max(0,p.y-10);y<Math.min(H,p.y+10);y++)for(let x=Math.max(0,p.x-10);x<Math.min(W,p.x+10);x++)if(Math.hypot(x-p.x,y-p.y)<10){const i=(y*W+x)*4;data[i]=data[i+1]=data[i+2]=9;}
 // White/color balls and interruptions do not define the cloth boundary.
 const center={x:quad.reduce((s,p)=>s+p.x,0)/4,y:quad.reduce((s,p)=>s+p.y,0)/4};for(let y=center.y-8;y<center.y+8;y++)for(let x=center.x-8;x<center.x+8;x++){const i=(Math.round(y)*W+Math.round(x))*4;data[i]=240;data[i+1]=240;data[i+2]=225;}
 return {width:W,height:H,data};}
const cases=[
 [{x:70,y:70},{x:650,y:70},{x:650,y:410},{x:70,y:410}],
 [{x:200,y:50},{x:570,y:90},{x:675,y:410},{x:35,y:390}],
 [{x:235,y:30},{x:460,y:55},{x:510,y:445},{x:190,y:430}],
 [{x:260,y:35},{x:665,y:270},{x:465,y:450},{x:50,y:220}],
 [{x:30,y:55},{x:330,y:35},{x:350,y:255},{x:20,y:265}],
];
// Similar-colored surroundings merge with cloth at low exposure thresholds.
// The brighter rectangular bed is visible, but there is no pocket evidence.
function suggestionScene(){
 const width=720,height=480,data=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const color=x>=70&&x<=650&&y>=70&&y<=410?[25,155,105]:[16,60,41],i=(y*width+x)*4;
  for(let k=0;k<3;k++)data[i+k]=color[k];data[i+3]=255;
 }
 return {width,height,data};
}
if(require.main===module){
for(const color of [[25,155,105],[25,120,190],[155,35,65]])for(const quad of cases){const start=performance.now(),r=detect(scene(quad,color));assert(r,'corner detection '+JSON.stringify(quad));for(const p of quad)assert(Math.min(...r.corners.map(c=>Math.hypot(c.x-p.x,c.y-p.y)))<8,JSON.stringify({expected:p,got:r.corners}));assert(r.railSupport>.4);assert(performance.now()-start<1500);}
const distant=scene([{x:300,y:240},{x:405,y:240},{x:450,y:310},{x:270,y:310}]);assert.equal(detect(distant),null,'Small ambiguous colored regions need manual corners');
const blank={width:160,height:120,data:new Uint8ClampedArray(160*120*4).fill(90)};assert.equal(detect(blank),null);const cropped=scene([{x:0,y:0},{x:719,y:0},{x:719,y:479},{x:0,y:479}]);assert.equal(detect(cropped),null);
const approximate=suggest(suggestionScene());assert.equal(detect(suggestionScene()),null,'A starter outline does not pass strict automatic calibration');
assert(approximate?.approximate);assert.equal(approximate.confidence,null,'Do not represent a rough outline as confident calibration');
for(const p of cases[0])assert(Math.min(...approximate.corners.map(c=>Math.hypot(c.x-p.x,c.y-p.y)))<3);
assert.deepEqual(suggest(scene(cases[0])),detect(scene(cases[0])),'Prefer the existing strict fit when available');
for(const image of [blank,cropped,distant])assert.equal(suggest(image),null,'Suggestions still need a visible plausible outline');
console.log('15 green/blue/red, angled, rotated, portrait and off-center scenes with gradients, balls and pocket cutouts pass; blank/clipped scenes reject.');
console.log('An approximate manual starter survives missing pocket evidence without changing strict detection or inventing blank/clipped outlines.');
}
module.exports={scene,cases,suggestionScene};
