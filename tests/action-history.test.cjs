const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {create}=require('../trainer-action-history.js');
const snap=(x,shotCount=0)=>({state:{balls:[{id:0,x,y:.5}],freeAim:{x:1,y:.5},speed:2.42,follow:0,sideSpin:0},undo:Array.from({length:shotCount},()=>({})),history:Array.from({length:shotCount+1},()=>({}))});
const store=create(3);
store.begin(snap(.2));store.commit(snap(.2));assert.equal(store.count,0,'No-op taps do not consume undo');
store.begin(snap(.2));for(let i=0;i<300;i++)store.begin(snap(.2+i*.001));store.commit(snap(.8));assert.equal(store.count,1);assert.equal(store.undo().state.balls[0].x,.2,'A whole drag restores its initial point');
for(let i=0;i<5;i++){store.begin(snap(i));store.commit(snap(i+1));}assert.equal(store.count,3);assert.equal(store.undo().state.balls[0].x,4);assert.equal(store.undo().state.balls[0].x,3);assert.equal(store.undo().state.balls[0].x,2);assert.equal(store.undo(),null);
store.begin(snap(.5));store.commit(snap(.5,1));assert.equal(store.count,1,'Shot-history changes are reversible even when ball positions match');
// Exercise the engine's actual transaction boundaries and restoration functions.
const source=fs.readFileSync('index.html','utf8');
function extract(name){const a=source.indexOf('    function '+name+'('),begin=source.indexOf('{',a);assert(a>=0,name);let depth=0;for(let i=begin;i<source.length;i++){if(source[i]==='{')depth++;if(source[i]==='}'&&--depth===0)return source.slice(a,i+1);}throw Error(name);}
const initial={balls:[{id:0,x:.2,y:.5}],freeAim:{x:1,y:.5},speed:2.42,follow:0,sideSpin:0,preview:{huge:true},shot2:{preview:{huge:true}}};
let restored=0;
const c={S:initial,actionHistory:create(),redoStack:[],undoStack:[{shot:'original'}],runHistory:[{run:'start'},{run:'end'}],animation:null,actionPointer:false,actionKeys:false,actionUndoTimer:0,clearTimeout(){},syncActionUndo(){},updateRunCount(){},saveState(){},syncProjector(){},toast(){},restoreSnapshot(s){c.S=JSON.parse(JSON.stringify(s));restored++;}};
vm.createContext(c);for(const n of ['captureActionState','finishActionUndo','beginActionUndo','restoreActionState','undoLastAction','redoLastAction'])vm.runInContext(extract(n),c);
vm.runInContext('beginActionUndo()',c);c.actionPointer=true;c.S.balls[0].x=.9;vm.runInContext('finishActionUndo()',c);assert.equal(c.actionHistory.count,0,'Pointer motion does not finalize a gesture');c.actionPointer=false;vm.runInContext('finishActionUndo()',c);assert.equal(c.actionHistory.count,1);
c.S.speed=4;c.undoStack=[];c.runHistory=[];vm.runInContext('undoLastAction()',c);assert.equal(c.S.balls[0].x,.2);assert.equal(c.S.speed,2.42);assert.equal(c.undoStack[0].shot,'original');assert.equal(c.runHistory.length,2);assert.equal(c.S.shot2.preview,null,'Derived previews are excluded');assert.equal(restored,1);
vm.runInContext('beginActionUndo()',c);c.S.follow=.8;c.animation={};vm.runInContext('finishActionUndo()',c);assert.equal(c.actionHistory.count,0);assert(c.actionHistory.pending,'Animation retains pre-shot transaction');c.animation=null;vm.runInContext('finishActionUndo();undoLastAction()',c);assert.equal(c.S.follow,0);
console.log('Action undo: no-op filtering, whole-gesture grouping, bounded multi-step history, shot-stack preservation, animation boundaries, and exact state restoration pass.');
// Redo preserves the complete forward state, and a new edit forks history.
const forward=create(3);forward.begin(snap(.2));forward.commit(snap(.8));
assert.equal(forward.undo(snap(.8)).state.balls[0].x,.2);assert.equal(forward.redoCount,1);
forward.begin(snap(.2));forward.commit(snap(.2));assert.equal(forward.redoCount,1,'A no-op or opening a picker preserves redo');
assert.equal(forward.redo(snap(.2)).state.balls[0].x,.8);assert.equal(forward.redoCount,0);assert.equal(forward.count,1);
forward.undo(snap(.8));forward.begin(snap(.2));forward.commit(snap(.4));assert.equal(forward.redoCount,0,'A new real edit discards the forward branch');
// Test the same restoration functions that Zen invokes, including shot history.
c.actionHistory=create();c.redoStack=[];c.S=JSON.parse(JSON.stringify(initial));
vm.runInContext('beginActionUndo()',c);c.S.follow=.4;c.S.sideSpin=-.25;c.S.freeAim={x:1.2,y:.8};vm.runInContext('finishActionUndo()',c);
const edited=JSON.stringify(c.S,(k,v)=>k==='preview'?null:v);vm.runInContext('undoLastAction();redoLastAction()',c);assert.equal(JSON.stringify(c.S),edited);assert.equal(c.actionHistory.redoCount,0);
vm.runInContext('undoLastAction();beginActionUndo();finishActionUndo()',c);assert.equal(c.actionHistory.redoCount,1);
vm.runInContext('beginActionUndo()',c);c.S.speed=3.1;vm.runInContext('finishActionUndo()',c);assert.equal(c.actionHistory.redoCount,0);
console.log('Action redo: exact aim/spin/position and shot-stack restoration, no-op preservation, and new-edit invalidation pass.');
