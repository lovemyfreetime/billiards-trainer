const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{create}=require('../trainer-action-history.js');
const html=fs.readFileSync('index.html','utf8');function extract(name){const a=html.indexOf('function '+name+'('),b=html.indexOf('{',a);let depth=0;for(let i=b;i<html.length;i++){if(html[i]==='{')depth++;if(html[i]==='}'&&--depth===0)return html.slice(a,i+1);}throw Error(name);}
let zen=true;const history=create();const before={balls:[{id:0,x:.5,y:.3},{id:9,x:1,y:.4}],pocketedLog:[1,2],speed:4,follow:.5,sideSpin:-.3,shot2Enabled:true,allowMissingCueBall:false};
const copy=v=>JSON.parse(JSON.stringify(v));const c={S:copy(before),animation:null,document:{body:{classList:{contains:()=>zen}}},beginActionUndo(){history.begin({state:copy(c.S),undo:[],history:[],redo:[]})},normalizeBallSet(){assert(c.S.allowMissingCueBall)},resetRunHistory(){},updateUI(){},refreshPreview(){},saveState(){},syncProjector(){}};
vm.createContext(c);vm.runInContext(extract('freshZenTable'),c);assert(c.freshZenTable());assert.equal(c.S.balls.length,0);assert.equal(c.S.pocketedLog.length,0);assert(c.S.allowMissingCueBall);assert.equal(c.S.speed,2.42);assert.equal(c.S.follow,0);assert.equal(c.S.sideSpin,0);assert.equal(c.S.shot2Enabled,false);
history.commit({state:copy(c.S),undo:[],history:[],redo:[]});assert.deepEqual(history.undo({state:copy(c.S),undo:[],history:[],redo:[]}).state,before,'Fresh table can be undone without losing ball positions or shot settings');
c.S=copy(before);c.animation={};assert.equal(c.freshZenTable(),false);assert.deepEqual(c.S,before,'Cannot clear during a shot');c.animation=null;zen=false;assert.equal(c.freshZenTable(),false);assert.deepEqual(c.S,before,'Fresh-table operation is Zen-only');
console.log('Fresh table: clears balls and resets controls, supports action undo, blocks active shots, and preserves the main trainer.');
// Exercise placement after clearing: the old null aim crashed when the cue
// returned and prediction tried to read the aim point.
zen=true;c.animation=null;c.S={...copy(before),tableL:2,tableW:1,ballR:.03};
c.Math=Math;c.clamp=(v,a,b)=>Math.max(a,Math.min(b,v));c.onPlayingSurface=q=>q.x>0&&q.x<2&&q.y>0&&q.y<1;c.keepCueOnTable=q=>q;c.toast=()=>{};c.cueBall=()=>c.S.balls.find(b=>b.id===0);c.norm=v=>{const n=Math.hypot(v.x,v.y);return {x:v.x/n,y:v.y/n}};
vm.runInContext(extract('aimDirection'),c);vm.runInContext(extract('returnPocketBall'),c);c.refreshPreview=()=>{const direction=c.aimDirection();assert(Number.isFinite(direction.x)&&Number.isFinite(direction.y),'Post-clear aim must remain valid for prediction');};
for(let repeat=0;repeat<3;repeat++){assert(c.freshZenTable());assert.doesNotThrow(()=>c.returnPocketBall(0,{x:.5,y:.5}));assert.doesNotThrow(()=>c.returnPocketBall(1,{x:1,y:.5}));assert.deepEqual(Array.from(c.S.balls,b=>b.id),[0,1],'Cue and object balls can be placed after every clear');}
console.log('Fresh table regression: clear → place cue → place object → predict succeeds across repeated resets.');

c.Billiards3D={active:true};assert(c.freshZenTable(),"3D tray can clear the table without Zen mode");c.returnPocketBall(0,{x:.5,y:.5});assert(c.S.balls.some(b=>b.id===0),"3D tray can restore the cue ball");
