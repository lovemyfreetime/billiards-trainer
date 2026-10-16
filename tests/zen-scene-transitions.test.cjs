const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('zen-mode.js','utf8');
function extract(name){const a=source.indexOf('function '+name+'('),begin=source.indexOf('{',a);assert(a>=0,name);let depth=0;for(let i=begin;i<source.length;i++){if(source[i]==='{')depth++;if(source[i]==='}'&&--depth===0)return source.slice(a,i+1);}throw Error(name);}
let next=0,frames=new Map(),timers=new Map(),paint=0,created=[],draws=[],reduced=false;
const stage={children:[],append(el){this.children.push(el)}};
const canvas={width:2000,height:1000,parentElement:stage};
function overlay(){const classes=new Set();const el={width:0,height:0,opacity:'1',classList:{add:k=>classes.add(k),contains:k=>classes.has(k)},setAttribute(){},getBoundingClientRect(){return{width:1000,height:500}},remove(){stage.children=stage.children.filter(x=>x!==el)},getContext(){return {globalAlpha:1,drawImage(image){draws.push({source:image,alpha:this.globalAlpha})}}}};created.push(el);return el;}
const c={ZEN_FADE_DURATION:1800,zenSceneFade:null,zenReducedMotion:()=>reduced,document:{getElementById:()=>canvas,createElement:()=>overlay()},getComputedStyle:el=>({opacity:el.opacity}),requestAnimationFrame(fn){frames.set(++next,fn);return next},cancelAnimationFrame:id=>frames.delete(id),setTimeout(fn,delay){timers.set(++next,{fn,delay});return next},clearTimeout:id=>timers.delete(id)};
vm.createContext(c);vm.runInContext(extract('cancelZenSceneTransition')+extract('runZenSceneTransition'),c);
const frame=()=>{const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn())};
assert.equal(c.runZenSceneTransition(()=>{paint++;return 9}),9);assert.equal(paint,1,'State changes synchronously once');assert.equal(stage.children.length,1);assert.equal(created[0].width,2000);assert.equal(created[0].height,1000);assert.equal(draws[0].source,canvas);
frame();assert(created[0].classList.contains('zen-scene-reveal'));assert.equal([...timers.values()][0].delay,1800);
created[0].opacity='.4';draws=[];const stale=[...timers.values()][0].fn;
c.runZenSceneTransition(()=>paint++);assert.equal(stage.children.length,1,'Only one transition overlay is retained');assert.equal(draws[0].source,canvas);assert.equal(draws[1].source,created[0]);assert.equal(draws[1].alpha,.4,'A rapid next choice starts from the visible blend');stale();assert.equal(stage.children.length,1,'An old cleanup cannot remove a newer transition');
frame();[...timers.values()][0].fn();assert.equal(stage.children.length,0);assert.equal(c.zenSceneFade,null);
c.runZenSceneTransition(()=>paint++);c.cancelZenSceneTransition();frame();assert.equal(stage.children.length,0);assert.equal(timers.size,0,'Direct manipulation cancels the cosmetic overlay without deferred work');
reduced=true;const count=created.length;c.runZenSceneTransition(()=>paint++);assert.equal(created.length,count,'Reduced motion changes state without allocating an overlay');
reduced=false;assert.throws(()=>c.runZenSceneTransition(()=>{throw Error('change failed')}),/change failed/);assert.equal(stage.children.length,0,'A failed action never leaves the old frame covering the table');
console.log('Zen scene transitions: exact synchronous actions, 1800ms compositor fade, snapshot sizing, rapid-action blend continuity, bounded overlays, safe cleanup, direct-manipulation cancellation, reduced motion and exception recovery pass.');
