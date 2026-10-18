const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {create}=require('../trainer-action-history.js');
const source=fs.readFileSync('index.html','utf8');
function extract(name){const a=source.indexOf('    function '+name+'('),begin=source.indexOf('{',a);assert(a>=0,name);let d=0;for(let i=begin;i<source.length;i++){if(source[i]==='{')d++;if(source[i]==='}'&&--d===0)return source.slice(a,i+1);}throw Error(name);}
const clone=s=>JSON.parse(JSON.stringify(s));
const state=n=>({balls:[{id:0,x:.2+n*.2,y:.5},{id:1,x:1+n*.1,y:.3,active:n<2}],freeAim:{x:1+n*.1,y:.5},speed:2+n*.1,follow:.1*n,sideSpin:n?-.1*n:0,pocketedLog:n>=2?[1]:[],shot2Enabled:n===1,shot2:{x:.8,y:.4},preview:null});
const A=state(0),B=state(1),C=state(2),events=[];
const c={S:clone(C),undoStack:[clone(A),clone(B)],redoStack:[],runHistory:[clone(A),clone(B),clone(C)],animation:null,actionHistory:create(),actionPointer:false,actionKeys:false,actionUndoTimer:0,clearTimeout(){},syncActionUndo(){},updateRunCount(){},saveState(){},syncProjector(){},toast(){},window:{dispatchEvent:e=>events.push(e.type)},CustomEvent:class{constructor(type){this.type=type}},cleanSnapshot(){return clone(c.S)},restoreSnapshot(s){c.S=clone(s)},simulate(){throw Error('Redo must restore, not resimulate');}};
vm.createContext(c);for(const n of ['captureActionState','finishActionUndo','beginActionUndo','restoreActionState','undoLastAction','redoLastAction','captureShotHistoryState','undoLastShot','redoLastShot'])vm.runInContext(extract(n),c);
vm.runInContext('undoLastShot()',c);assert.deepEqual(c.S,B);assert.equal(c.undoStack.length,1);assert.equal(c.redoStack.length,1);assert.equal(c.runHistory.length,2);
vm.runInContext('undoLastShot()',c);assert.deepEqual(c.S,A);assert.equal(c.redoStack.length,2);
vm.runInContext('redoLastShot()',c);assert.deepEqual(c.S,B);assert.equal(c.redoStack.length,1);assert.equal(c.undoStack.length,1);
vm.runInContext('redoLastShot()',c);assert.deepEqual(c.S,C);assert.equal(c.redoStack.length,0);assert.equal(c.runHistory.length,3);assert.equal(c.undoStack.length,2);
// Shot navigation itself is recoverable through the independent action history.
vm.runInContext('undoLastAction()',c);assert.deepEqual(c.S,B);assert.equal(c.redoStack.length,1);
vm.runInContext('redoLastAction()',c);assert.deepEqual(c.S,C);assert.equal(c.redoStack.length,0);
vm.runInContext('undoLastShot();beginActionUndo();finishActionUndo()',c);assert.equal(c.redoStack.length,1,'No-op navigation preserves shot redo');
vm.runInContext('beginActionUndo()',c);c.S.follow=.9;vm.runInContext('finishActionUndo()',c);assert.equal(c.redoStack.length,0,'A real adjustment invalidates shot redo');
vm.runInContext('undoLastAction()',c);assert.equal(c.redoStack.length,1,'Undoing that adjustment restores its previous available shot redo');
c.animation={};const frozen=JSON.stringify(c.S),count=c.redoStack.length;vm.runInContext('redoLastShot();undoLastShot();redoLastAction();undoLastAction()',c);assert.equal(JSON.stringify(c.S),frozen);assert.equal(c.redoStack.length,count);
assert(events.includes('billiards:redo-complete'));console.log('Shot redo: multi-shot round trips, pocketed balls, two-shot planning, exact settings, action-history interoperation, branch invalidation, and animation guards pass.');
