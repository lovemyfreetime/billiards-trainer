const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('index.html','utf8');
function extract(name){const a=source.indexOf('    function '+name+'(');assert(a>=0,name);const begin=source.indexOf('{',a);let depth=0;for(let i=begin;i<source.length;i++){if(source[i]==='{')depth++;if(source[i]==='}'&&--depth===0)return source.slice(a,i+1);}throw Error('Unclosed function '+name);}
// A stream of pointer positions must paint the newest position once per frame,
// with no solver, storage, or delayed frame backlog on the pointer path.
let frames=new Map(),id=0,painted=[],solves=0,current=0;
const dragContext={zenDragFrame:0,requestAnimationFrame:f=>{frames.set(++id,f);return id},cancelAnimationFrame:i=>frames.delete(i),draw:()=>painted.push(current),refreshPreview:()=>solves++};
vm.createContext(dragContext);vm.runInContext(extract('requestZenDragPaint')+extract('finishZenDragPaint'),dragContext);
for(current=0;current<300;current++)vm.runInContext('requestZenDragPaint()',dragContext);
assert.equal(frames.size,1);assert.equal(solves,0);
current=299;const callback=frames.values().next().value;frames.clear();callback();assert.deepEqual(painted,[299]);
current=350;vm.runInContext('requestZenDragPaint();finishZenDragPaint()',dragContext);assert.equal(frames.size,0);assert.equal(solves,1);
// Expensive full-table diffusion is allowed only on initial paint or resize.
let filtered=0,created=0,liveBlits=0;
const fakeContext=()=>new Proxy({createLinearGradient:()=>({addColorStop(){}})}, {get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>{if(k==='filter')filtered++;o[k]=v;return true}});
const art={};
const renderContext={zenTableFrame:null,zenGuideFrame:null,zenRecoloredTable:()=>art,document:{createElement:()=>{created++;return{width:0,height:0,getContext:()=>fakeContext()}}},canvas:{width:2400,height:1400},DPR:2,S:{tableL:2,tableW:1,ballR:.03,preview:{paths:{0:[{x:.2,y:.5},{x:1,y:.5}]}}},ORIGINAL_ASSET_GEOM:{width:2530,height:1380,x0:109,x1:2421,y0:110,y1:1270},ctx:{drawImage:()=>liveBlits++},drag:null,cueBall:()=>({x:.2,y:.5})};
vm.createContext(renderContext);vm.runInContext(extract('drawZenTable')+extract('drawZenGuides'),renderContext);
const map=p=>({x:100+p.x*500,y:100+p.y*500});renderContext.map=map;
vm.runInContext('drawZenTable(map);drawZenGuides(map)',renderContext);const initialFilters=filtered,initialCreated=created;
for(let i=0;i<120;i++)vm.runInContext('drawZenTable(map);drawZenGuides(map)',renderContext);
assert.equal(filtered,initialFilters,'Stationary blur must not rerun on live frames');assert.equal(created,initialCreated,'No new full-size surfaces on live frames');assert.equal(liveBlits,242);
renderContext.drag={kind:'ball'};vm.runInContext('drawZenGuides(map)',renderContext);assert.equal(liveBlits,242,'Stale guides stay out of a ball drag');
renderContext.drag=null;renderContext.S.preview={paths:{0:[{x:.4,y:.5},{x:1,y:.5}]}};vm.runInContext('drawZenGuides(map)',renderContext);assert(filtered>initialFilters,'Guides rebuild after a new prediction');
const beforeResize=created;renderContext.canvas.width=2600;vm.runInContext('drawZenTable(map);drawZenGuides(map)',renderContext);assert(created>beforeResize,'Both cached layers resize correctly');
console.log('Zen drag: 300 pointer updates coalesce to one latest-position paint; prediction runs once on release.');
console.log('Zen render: 120 unchanged frames allocate no surfaces and perform no blur; prediction and resize invalidate caches.');
