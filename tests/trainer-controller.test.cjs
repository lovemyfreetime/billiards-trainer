// Deterministic DOM tests of the production adapter. Browser/physics integration
// is covered separately by trainer-controller.browser.cjs, not by these fakes.
const {JSDOM} = require('jsdom');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname,'../trainer-controller.js'),'utf8');
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('PASS: '+name); }
function setup({native=false, saved=null, mapping='standard'}={}) {
  const dom = new JSDOM('<!doctype html><body class="trainer-workspace"><canvas id="canvas"></canvas><aside id="panel"><fieldset id="featureAimingOptions"></fieldset></aside><nav id="workspaceTools"><details id="workspace-view"><summary>View</summary><div class="workspaceToolGroup"></div></details></nav><button id="animate">Shoot</button><button id="table3DToggle">3D</button><div id="trainerAnnotateGroup"><input id="trainerSnapshotName"></div></body>',{url:'https://trainer.test/?train=1',runScripts:'outside-only',pretendToBeVisual:true});
  const w = dom.window, calls = [], frames = new Map(); let now = 0, id = 0, connected = true;
  let state = {projector:false,busy:false,activeShot:1,shot2Enabled:false,speed:1,side:0,follow:0,aim:0};
  const pad = {id:'DualShock test',index:0,mapping,connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({value:0,pressed:false}))};
  w.document.hasFocus = () => true;
  w.requestAnimationFrame = fn => {frames.set(++id,fn);return id;}; w.cancelAnimationFrame = key => frames.delete(key);
  w.HTMLElement.prototype.getClientRects = function() {return this.hidden || this.closest('[hidden]') ? [] : [{}];};
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.HTMLDialogElement.prototype.showModal = function(){this.open=true;};
  w.HTMLDialogElement.prototype.close = function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
  w.document.elementFromPoint = () => w.document.getElementById('canvas');
  w.billiardsControllerControls = {
    state:()=>({...state}),finish:()=>{},
    adjust:delta=>{calls.push(['adjust',delta]);for(const key of ['speed','side','follow','aim'])state[key]+=delta[key]||0;},
    shoot:()=>calls.push(['shoot']), undo:()=>calls.push(['undo']),redo:()=>calls.push(['redo']),
    select:n=>{if(n===1||state.shot2Enabled)state.activeShot=n;calls.push(['select',n]);},
    pointer:(type,x,y)=>{calls.push([type,x,y]);return true;}
  };
  w.Billiards3D={active:false,controllerMove:delta=>calls.push(['camera',delta]),resetView:()=>calls.push(['reset'])};
  w.document.getElementById('table3DToggle').onclick=()=>{w.Billiards3D.active=!w.Billiards3D.active;calls.push(['view']);};
  if(native)w.BilliardsAndroid={controllerInputVersion:()=>1,setControllerEnabled:value=>calls.push(['host',value])};
  Object.defineProperty(w.navigator,'getGamepads',{value:()=>connected?[pad]:[]});
  if(saved)w.localStorage.setItem('billiards.controller.v1',saved);
  w.eval(source);
  const step = (ms=48) => {for(let t=0;t<ms;t+=16){now+=16;const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(now));}};
  const input = (i,value) => {pad.buttons[i]={value,pressed:value>.5};};
  const button = i => {input(i,1);step();input(i,0);step();};
  const count = action => calls.filter(c=>c[0]===action).length;
  const enable = () => {w.BilliardsController.open();const box=w.document.getElementById('trainerControllerEnabled');box.checked=true;box.dispatchEvent(new w.Event('change'));step();w.document.getElementById('trainerControllerClose').click();step();};
  const api = {w,pad,state,calls,step,input,button,count,enable,close:()=>dom.window.close(),saved:()=>w.localStorage.getItem('billiards.controller.v1'),connected(value){connected=value;w.dispatchEvent(new w.Event(value?'gamepadconnected':'gamepaddisconnected'));step();},native(pads){w.dispatchEvent(new w.CustomEvent('billiards:controller-state',{detail:pads}));step();}};
  return api;
}
const a=setup();
try {
  test('optional mode leaves the table alone',()=>{a.pad.axes=[1,1,1,1];a.step(160);assert.equal(a.count('adjust'),0);a.pad.axes=[0,0,0,0];});
  a.enable();
  test('standard controller becomes ready after neutral',()=>assert(a.w.BilliardsController.status().armed));
  test('dead zone rejects drift',()=>{a.pad.axes=[.08,-.08,.08,-.08];a.step(160);assert.equal(a.count('adjust'),0);a.pad.axes=[0,0,0,0];});
  test('sticks control aim, speed, English and follow',()=>{a.pad.axes=[1,-1,1,-1];a.step(160);a.pad.axes=[0,0,0,0];a.step();assert(a.state.aim>0&&a.state.speed>1&&a.state.side>0&&a.state.follow>0);});
  test('R1 does not create a second shot',()=>{a.button(5);assert.equal(a.state.activeShot,1);assert.equal(a.state.shot2Enabled,false);});
  test('bumpers select existing shots',()=>{a.state.shot2Enabled=true;a.button(5);assert.equal(a.state.activeShot,2);a.button(4);assert.equal(a.state.activeShot,1);});
  test('D-pad adjusts fine aim and speed',()=>{const aim=a.state.aim,speed=a.state.speed;a.button(15);a.button(12);assert(a.state.aim>aim&&a.state.speed>speed);});
  test('trigger requires deliberate threshold and full release',()=>{a.input(7,.7);a.step();assert.equal(a.count('shoot'),0);a.input(7,.85);a.step();a.input(7,.75);a.step();a.input(7,.9);a.step(160);assert.equal(a.count('shoot'),1);a.input(7,.1);a.step();a.input(7,.9);a.step();assert.equal(a.count('shoot'),2);a.input(7,0);a.step();});
  test('dialog pauses every table action',()=>{a.button(9);const before=a.calls.length;a.pad.axes=[1,-1,1,-1];a.button(7);a.button(2);a.button(3);assert.equal(a.calls.length,before);a.pad.axes=[0,0,0,0];a.w.document.getElementById('trainerControllerClose').click();a.step();});
  test('closing dialog while trigger held cannot fire',()=>{a.w.BilliardsController.open();a.step();a.input(7,1);a.step();a.w.document.getElementById('trainerControllerClose').click();a.step(160);assert.equal(a.count('shoot'),2);a.input(7,0);a.step();assert(a.w.BilliardsController.status().armed);});
  test('OPTIONS opens and closes settings after release',()=>{a.button(9);assert(a.w.document.getElementById('trainerControllerDialog').open);a.button(9);assert(!a.w.document.getElementById('trainerControllerDialog').open);});
  test('disconnect and reconnect require neutral',()=>{a.connected(false);a.input(7,1);a.connected(true);a.step(160);assert.equal(a.count('shoot'),2);a.input(7,0);a.step();});
  test('focus loss cancels and requires neutral on return',()=>{a.w.dispatchEvent(new a.w.Event('blur'));a.input(7,1);a.w.dispatchEvent(new a.w.Event('focus'));a.step(160);assert.equal(a.count('shoot'),2);a.input(7,0);a.step();});
  test('animation blocks input and held trigger afterward',()=>{a.state.busy=true;a.input(7,1);a.pad.axes=[1,-1,1,-1];const before=a.count('adjust');a.step();a.state.busy=false;a.step(160);assert.equal(a.count('shoot'),2);assert.equal(a.count('adjust'),before);a.input(7,0);a.pad.axes=[0,0,0,0];a.step();});
  test('text editing pauses input without stealing keyboard',()=>{const field=a.w.document.getElementById('trainerSnapshotName');field.focus();a.button(7);assert.equal(a.count('shoot'),2);let prevented;const ev=new a.w.KeyboardEvent('keydown',{key:'ArrowRight',code:'ArrowRight',bubbles:true,cancelable:true});field.dispatchEvent(ev);prevented=ev.defaultPrevented;assert.equal(prevented,false);field.blur();a.step();});
  test('open menus suppress shots',()=>{a.w.document.getElementById('workspace-view').open=true;a.button(7);assert.equal(a.count('shoot'),2);a.w.document.getElementById('workspace-view').open=false;a.step();});
  test('Square/Circle call existing shot history',()=>{a.button(2);a.button(1);assert.equal(a.count('undo'),1);assert.equal(a.count('redo'),1);});
  test('Triangle toggles view and L2 temporarily controls camera',()=>{a.button(3);assert(a.w.Billiards3D.active);a.input(6,1);a.pad.axes=[1,.5,.5,.5];const before=a.count('adjust');a.step(160);a.pad.axes=[0,0,0,0];a.button(12);a.input(6,0);a.step();assert.equal(a.count('adjust'),before);assert(a.calls.some(c=>c[0]==='camera'&&c[1].rotateX&&c[1].panX));assert(a.calls.some(c=>c[0]==='camera'&&c[1].zoomBy));a.pad.axes=[1,0,0,0];a.step();a.pad.axes=[0,0,0,0];assert(a.count('adjust')>before);a.button(11);assert.equal(a.count('reset'),1);a.button(3);});
  test('L3 cursor and Cross drag share pointer down/move/up',()=>{a.button(10);assert(a.w.BilliardsController.status().pointerMode);a.input(0,1);a.step();a.pad.axes=[1,0,0,0];a.step(100);a.pad.axes=[0,0,0,0];a.input(0,0);a.step();assert.equal(a.count('pointerdown'),1);assert(a.count('pointermove')>0);assert.equal(a.count('pointerup'),1);});
  test('focus loss cancels an in-progress ball drag',()=>{a.input(0,1);a.step();a.w.dispatchEvent(new a.w.Event('blur'));assert.equal(a.count('pointercancel'),1);assert(!a.w.BilliardsController.status().pointerMode);a.input(0,0);a.w.dispatchEvent(new a.w.Event('focus'));a.step();});
  test('custom button mapping and inverse axes persist',()=>{a.w.BilliardsController.open();a.step();const select=a.w.document.querySelector('[data-button="2"]');select.value='reset';select.dispatchEvent(new a.w.Event('change'));const invert=a.w.document.querySelector('[aria-label="Reverse English"]');invert.checked=true;invert.dispatchEvent(new a.w.Event('change'));a.w.document.getElementById('trainerControllerClose').click();a.step();a.button(2);assert.equal(a.count('reset'),2);const before=a.state.side;a.pad.axes=[0,0,1,0];a.step(160);a.pad.axes=[0,0,0,0];assert(a.state.side<before);const parsed=JSON.parse(a.saved());assert.equal(Object.values(parsed.profiles)[0].buttons[2],'reset');});
  const b=setup({saved:a.saved()});
  try {test('reload restores enabled mode and saved per-device profile',()=>{b.step();b.button(2);assert(b.w.BilliardsController.enabled);assert.equal(b.count('reset'),1);});} finally {b.close();}
  test('first neutral frame after a shot rearms the next press',()=>{const original=a.w.billiardsControllerControls.shoot,before=a.count('shoot');a.w.billiardsControllerControls.shoot=()=>{original();a.state.busy=true;};a.button(7);assert.equal(a.count('shoot'),before+1);a.state.busy=false;a.step(16);assert(a.w.BilliardsController.status().armed);a.button(7);assert.equal(a.count('shoot'),before+2);a.state.busy=false;a.w.billiardsControllerControls.shoot=original;a.step();});
  test('disabled mode stops scheduling work',()=>{a.w.BilliardsController.open();a.step();const box=a.w.document.getElementById('trainerControllerEnabled');box.checked=false;box.dispatchEvent(new a.w.Event('change'));a.w.document.getElementById('trainerControllerClose').click();a.step();a.pad.axes=[1,1,1,1];const before=a.count('adjust');a.step(500);assert.equal(a.count('adjust'),before);});
} finally {a.close();}
const n=setup({native:true});
try {
  n.enable();
  const pad={id:'Wireless Controller (1356:2508)',index:7,mapping:'standard',ready:false,axes:[0,0,0,0],buttons:Array(17).fill(0)};
  test('native bridge takes priority over browser reporting',()=>{n.native([pad]);assert.equal(n.w.BilliardsController.status().source,'android');assert(!n.w.BilliardsController.status().armed);assert(n.calls.some(c=>c[0]==='host'&&c[1]===true));});
  test('native axes arm only after a real neutral motion sample',()=>{pad.ready=true;n.native([pad]);assert(n.w.BilliardsController.status().armed);pad.axes=[1,0,0,0];n.native([pad]);n.step(160);assert(n.state.aim>0);pad.axes=[0,0,0,0];n.native([pad]);});
  test('native trigger maps once and PS stays unassigned',()=>{pad.buttons[7]=1;n.native([pad]);n.step(160);assert.equal(n.count('shoot'),1);pad.buttons[7]=0;n.native([pad]);pad.buttons[16]=1;n.native([pad]);assert.equal(n.count('shoot'),1);});
  test('native unplug clears connection and cancels input',()=>{n.native([]);assert.equal(n.w.BilliardsController.status().connected,false);assert.equal(n.w.BilliardsController.status().armed,false);});
} finally {n.close();}
const raw=setup({mapping:''});
try {test('nonstandard gamepads never inherit a shooting button',()=>{raw.enable();raw.input(7,1);raw.step(160);assert.equal(raw.count('shoot'),0);assert.equal(raw.w.BilliardsController.status().armed,false);});} finally {raw.close();}
console.log(`${passed} controller adapter checks passed. Browser renderer and physical hardware are separate checks.`);
