const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('zen-mode.js','utf8');
function extract(name){const a=source.indexOf('function '+name+'('),begin=source.indexOf('{',a);assert(a>=0,name);let depth=0;for(let i=begin;i<source.length;i++){if(source[i]==='{')depth++;if(source[i]==='}'&&--depth===0)return source.slice(a,i+1);}throw Error(name);}
let now=0,id=0,opened=0;const timers=new Map();
const c={ZEN_HOVER_DELAY:600,ZEN_FADE_DURATION:1800,zenPopoverStates:new WeakMap(),zenReducedMotion:()=>false,runZenSceneTransition:fn=>fn(),setTimeout(fn,delay){timers.set(++id,{at:now+delay,fn});return id},clearTimeout(id){timers.delete(id)}};
const advance=ms=>{now+=ms;for(const [id,t]of [...timers])if(t.at<=now){timers.delete(id);t.fn()}};
vm.createContext(c);vm.runInContext(extract('zenHoverDelay'),c);
const intent=c.zenHoverDelay(()=>opened++);
intent.schedule();advance(599);assert.equal(opened,0);advance(1);assert.equal(opened,1);
intent.schedule();advance(250);intent.cancel();advance(1000);assert.equal(opened,1,'Leaving or quick-clicking cancels the pending picker');
intent.schedule();advance(300);intent.schedule();advance(599);assert.equal(opened,1);advance(1);assert.equal(opened,2,'Re-entering receives a fresh full dwell');
let frames=[],positions=0;const classes=new Set(),panel={hidden:true,classList:{add:k=>classes.add(k),remove:k=>classes.delete(k)},setAttribute(){},getBoundingClientRect:()=>({width:168,height:168})};
c.requestAnimationFrame=fn=>frames.push(fn);vm.runInContext(extract('showZenPopover')+extract('hideZenPopover'),c);
c.showZenPopover(panel,()=>positions++);assert.equal(panel.hidden,false);assert(!classes.has('zen-popover-open'),'First frame starts from the collapsed/faded state');frames.shift()();assert(classes.has('zen-popover-open'));
c.showZenPopover(panel,()=>positions++);assert.equal(frames.length,0,'Moving focus inside an open picker does not restart its animation');
c.hideZenPopover(panel);advance(1800);c.showZenPopover(panel,()=>{});c.hideZenPopover(panel);frames.shift()();assert(!panel.hidden,'Closing remains painted for the full fade-out');assert(panel.inert,'Closing choices immediately stop accepting input');assert(!classes.has('zen-popover-open'),'A queued animation never revives a dismissed picker');advance(1799);assert(!panel.hidden);advance(1);assert(panel.hidden);
c.showZenPopover(panel,()=>{});frames.shift()();c.hideZenPopover(panel);advance(900);c.showZenPopover(panel,()=>{});advance(1800);assert(!panel.hidden,'Re-entering reverses a closing fade without an old timer hiding it');assert(classes.has('zen-popover-open'));c.hideZenPopover(panel);advance(1800);
// Picking a history mode must execute exactly once, close, and cancel hover intent.
const trace=[];let busy=false;const available={undo:true,redo:true,undoAction:true,redoAction:true};
c.historyMode='undoShot';c.engine={status:()=>({busy,...available})};for(const key of ['undoShot','redoShot','undoAction','redoAction'])c.engine[key]=()=>trace.push(key);
c.historyTool={close(){intent.cancel();trace.push('close')},focusAnchor(){trace.push('focus')}};c.sync=()=>trace.push('sync');vm.runInContext(extract('chooseHistoryMode'),c);
for(const [key,availability]of [['undoShot','undo'],['redoShot','redo'],['undoAction','undoAction'],['redoAction','redoAction']]){
 trace.length=0;intent.schedule();c.chooseHistoryMode({key,available:availability});assert.equal(c.historyMode,key);assert.deepEqual(trace,['close',key,'focus','sync']);advance(1000);assert.equal(opened,2,'Selection cancels any pending picker reopening');
}
trace.length=0;busy=true;c.chooseHistoryMode({key:'undoShot',available:'undo'});assert.equal(trace.length,0);busy=false;available.redo=false;c.chooseHistoryMode({key:'redoShot',available:'redo'});assert.equal(trace.length,0);
console.log('Zen popovers: 600ms dwell, cancellation on quick click/leave, matched 1800ms fade-out, reversible closing, no delayed resurrection, immediate execution of all four history modes, and unavailable/busy guards pass.');
