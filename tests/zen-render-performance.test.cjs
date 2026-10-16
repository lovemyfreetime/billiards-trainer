const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('index.html','utf8');
function extract(name){const a=source.indexOf('    function '+name+'(');assert(a>=0,name);const begin=source.indexOf('{',a);let depth=0;for(let i=begin;i<source.length;i++){if(source[i]==='{')depth++;if(source[i]==='}'&&--depth===0)return source.slice(a,i+1);}throw Error('Unclosed function '+name);}
// A stream of pointer positions must paint the newest position once per frame,
// with no solver, storage, or delayed frame backlog on the pointer path.
let frames=new Map(),id=0,painted=[],solves=0,current=0;
const dragContext={publishZenAimFeedback(){},drag:{kind:'ball'},S:{},simulate:()=>{solves++;return{firstEvent:'contact'}},zenDragFrame:0,requestAnimationFrame:f=>{frames.set(++id,f);return id},cancelAnimationFrame:i=>frames.delete(i),draw:()=>painted.push(current),refreshPreview:()=>solves++};
vm.createContext(dragContext);vm.runInContext(extract('requestZenDragPaint')+extract('finishZenDragPaint'),dragContext);
for(current=0;current<300;current++)vm.runInContext('requestZenDragPaint()',dragContext);
assert.equal(frames.size,1);assert.equal(solves,0);
current=299;const callback=frames.values().next().value;frames.clear();callback();assert.deepEqual(painted,[299]);
current=350;vm.runInContext('requestZenDragPaint();finishZenDragPaint()',dragContext);assert.equal(frames.size,0);assert.equal(solves,1);
// Expensive full-table diffusion is allowed only on initial paint or resize.
let filtered=0,created=0,liveBlits=0;const strokes=[];
const fakeContext=()=>new Proxy({createLinearGradient:()=>({addColorStop(){}}),stroke(){strokes.push({color:this.strokeStyle,width:this.lineWidth})}}, {get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>{if(k==='filter')filtered++;o[k]=v;return true}});
const art={};
const renderContext={zenTableFrame:null,zenGuideFrame:null,zenRecoloredTable:()=>art,document:{createElement:()=>{created++;return{width:0,height:0,getContext:()=>fakeContext()}}},canvas:{width:2400,height:1400},DPR:2,S:{speed:2.42,tableL:2,tableW:1,ballR:.03,preview:{paths:{0:[{x:.2,y:.5},{x:1,y:.5}]}}},ZEN_ASSET_GEOM:{width:1678,height:937,x0:298,x1:1379,y0:120,y1:650},ctx:{drawImage:()=>liveBlits++},drag:null,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),shotPowerState:()=>null,cueBall:()=>({x:.2,y:.5})};
vm.createContext(renderContext);vm.runInContext(extract('drawZenTable')+extract('zenPathPower')+extract('drawZenGuides'),renderContext);
const map=p=>({x:100+p.x*500,y:100+p.y*500});renderContext.map=map;
vm.runInContext('drawZenTable(map);drawZenGuides(map)',renderContext);const initialFilters=filtered,initialCreated=created;
for(let i=0;i<120;i++)vm.runInContext('drawZenTable(map);drawZenGuides(map)',renderContext);
assert.equal(filtered,initialFilters,'Stationary blur must not rerun on live frames');assert.equal(created,initialCreated,'No new full-size surfaces on live frames');assert.equal(liveBlits,242);
renderContext.drag={kind:'ball'};vm.runInContext('drawZenGuides(map)',renderContext);assert.equal(liveBlits,242,'Stale guides stay out of a ball drag');
renderContext.drag=null;renderContext.S.preview={paths:{0:[{x:.4,y:.5},{x:1,y:.5}]}};vm.runInContext('drawZenGuides(map)',renderContext);assert.equal(created,initialCreated,'Guides reuse their surface for a new prediction');assert.equal(filtered,0,'Matte guides never apply blur filters');
const beforeResize=created;renderContext.canvas.width=2600;vm.runInContext('drawZenTable(map);drawZenGuides(map)',renderContext);assert(created>beforeResize,'Both cached layers resize correctly');
console.log('Zen drag: 300 pointer updates coalesce to one latest-position paint; prediction runs once on release.');
console.log('Zen render: 120 unchanged frames allocate no surfaces and perform no blur; prediction and resize invalidate caches.');

// Each cushion contact attenuates the cue tracer, including the hard visibility floor.
renderContext.S.preview={paths:{0:Array.from({length:11},(_,t)=>({x:.2+t*.1,y:.5,t}))},railEvents:Array.from({length:8},(_,i)=>({id:0,x:.25+i*.1,y:.5,t:i+.5}))};
renderContext.shotPowerState=()=>({currentCueImpact:2,requiredCueImpact:1,currentPocketArrival:.2,pocketResidualTarget:.2});
strokes.length=0;vm.runInContext('drawZenGuides(map)',renderContext);
const cue=strokes.filter(s=>s.width===1.25).map(s=>Number(s.color.match(/,([^,]+)\)$/)[1]));
assert.equal(cue.length,9);assert.equal(cue[0],.24000000000000002);assert(Math.abs(cue[1]-.20)<1e-9);assert.equal(cue.at(-1),.08);assert(cue.every(a=>a>=.08));
console.log('Zen tracer: cue opacity drops .04 per rail and remains visible at the .08 floor, with a narrow low-opacity halo and no blur.');

// The reference art and collision coordinates must share an invertible 2:1 map.
renderContext.document.body={classList:{contains:className=>className==='zen-mode'}};
renderContext.ORIGINAL_ASSET_GEOM=renderContext.ZEN_ASSET_GEOM;
vm.runInContext(extract('controlMap'),renderContext);
for(const [width,height] of [[1363,936],[1920,1080],[1200,800],[700,900]]){
 renderContext.canvas.width=width*2;renderContext.canvas.height=height*2;
 const m=vm.runInContext('controlMap()',renderContext),a=m.map({x:0,y:0}),b=m.map({x:2,y:1});
 assert(Math.abs((b.x-a.x)/(b.y-a.y)-2)<1e-9,'Regulation aspect survives viewport changes');
 const q=m.inv(m.map({x:.7,y:.3}));assert(Math.abs(q.x-.7)<1e-9&&Math.abs(q.y-.3)<1e-9,'Ball dragging uses the same coordinate map as the image');
 assert(a.x>=0&&a.y>=0&&b.x<=width&&b.y<=height,'Playing surface stays inside the viewport');
}
console.log('Zen reference alignment: regulation aspect, viewport fit, and drag-coordinate round trips pass at four sizes.');

// Aim drags solve the latest target once per frame and paint the actual
// contact/ghost/path prediction, while ball dragging remains solver-free.
dragContext.drag={kind:'aim'};const solvesBefore=solves;
for(let i=0;i<100;i++)vm.runInContext('requestZenDragPaint()',dragContext);
assert.equal(frames.size,1);const aimFrame=frames.values().next().value;frames.clear();aimFrame();
assert.equal(solves,solvesBefore+1);assert.equal(dragContext.S.firstEvent,'contact');
renderContext.drag={kind:'aim'};const beforeAim=liveBlits;
vm.runInContext('drawZenGuides(map)',renderContext);assert.equal(liveBlits,beforeAim+1,'Aiming renders the full prediction instead of a cursor circle');
assert(!source.includes('function drawZenDragAim('),'The temporary cursor-only guide is removed');
console.log('Zen aim drag: latest target predicts once per frame; the ghost ball and full paths remain visible.');
