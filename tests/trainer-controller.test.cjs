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
  test('Triangle toggles view and L2 temporarily controls camera',()=>{a.button(3);assert(a.w.Billiards3D.active);a.input(6,1);a.pad.axes=[1,.5,.5,.5];const before=a.count('adjust');a.step(160);a.pad.axes=[0,0,0,0];a.button(12);a.input(6,0);a.step();assert.equal(a.count('adjust'),before);assert(a.calls.some(c=>c[0]==='camera'&&c[1].rotateX&&c[1].zoomBy));assert(a.calls.some(c=>c[0]==='camera'&&c[1].zoomBy));a.pad.axes=[1,0,0,0];a.step();a.pad.axes=[0,0,0,0];assert(a.count('adjust')>before);a.button(11);assert.equal(a.count('reset'),1);a.button(3);});
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

for (const requested of [200, 500, 1200, 2400]) {
  const c = setup();
  try {
    c.enable();
    c.w.BilliardsController.open(); c.step();
    const slider = c.w.document.querySelector('[aria-label="Cursor speed"]');
    assert.equal(slider.value, '1200', 'New cursor default is faster than the old 500px/s');
    slider.value = String(requested); slider.dispatchEvent(new c.w.Event('input'));
    assert.equal(JSON.parse(c.saved()).cursorSpeed, requested);
    c.w.document.getElementById('trainerControllerClose').click(); c.step();
    c.button(10);
    const cursor = c.w.document.getElementById('trainerControllerCursor');
    const before = parseFloat(cursor.style.left);
    c.pad.axes = [1, 0, 0, 0]; c.step(48);
    assert(Math.abs(parseFloat(cursor.style.left) - before - requested * .048) < .001, 'Cursor follows selected pixels per second');
    c.pad.axes = [0,0,0,0]; c.step();
    const stopped = cursor.style.left; c.step(96); assert.equal(cursor.style.left, stopped, 'No glide after release');
    const saved = c.saved(), reloaded = setup({saved});
    try { assert.equal(reloaded.w.document.querySelector('[aria-label="Cursor speed"]').value, String(requested)); } finally { reloaded.close(); }
    console.log('PASS: cursor speed ' + requested + ' px/s, persistence, and immediate stop');
  } finally { c.close(); }
}

const menu = setup();
try {
  const d = menu.w.document;
  d.getElementById('panel').insertAdjacentHTML('afterbegin','<div class="section"><button class="sectionToggle" id="menuA">A</button><div class="sectionBody"><button id="menuClick">Action</button><input id="menuRange" type="range" min="0" max="10" step="1" value="5"><select id="menuSelect"><option>A</option><option>B</option></select><button id="menuDisabled" disabled>Disabled</button></div></div><div class="section"><button class="sectionToggle" id="menuB">B</button><div class="sectionBody"><button>Other</button></div></div>');
  for (const b of d.querySelectorAll('.sectionToggle')) b.onclick=()=>b.parentElement.classList.toggle('open');
  let clicks=0, scrolls=0;
  d.getElementById('menuClick').onclick=()=>clicks++;
  menu.w.HTMLElement.prototype.scrollIntoView=function(){scrolls++;};
  menu.enable(); menu.button(10); menu.button(13);
  assert(menu.w.BilliardsController.status().menuMode);
  assert.equal(d.activeElement.id,'menuA','Starts at first major heading');
  menu.button(13); assert.equal(d.activeElement.id,'menuB');
  menu.button(12); menu.button(0);
  assert(d.getElementById('menuA').parentElement.classList.contains('open'));
  assert.equal(d.activeElement.id,'menuClick'); menu.button(0); assert.equal(clicks,1);
  menu.button(13); assert.equal(d.activeElement.id,'menuRange'); menu.button(15); assert.equal(d.getElementById('menuRange').value,'6');
  menu.button(13); assert.equal(d.activeElement.id,'menuSelect'); menu.button(15); assert.equal(d.getElementById('menuSelect').selectedIndex,1);
  menu.button(13); assert.equal(d.activeElement.id,'menuClick','Disabled control skipped and controls wrap');
  const shots=menu.count('shoot'), undos=menu.count('undo'), redos=menu.count('redo');
  menu.button(7); menu.button(1); assert.equal(menu.count('shoot'),shots); assert.equal(menu.count('redo'),redos);
  d.elementFromPoint=()=>d.getElementById('menuClick');menu.pad.axes=[.5,0,0,0];menu.step();menu.pad.axes=[0,0,0,0];menu.button(0);assert.equal(clicks,2,'Cursor picks and activates controls');
  menu.button(2); assert.equal(d.activeElement.id,'menuA','Square returns to headings');
  menu.button(2); assert(!menu.w.BilliardsController.status().menuMode);assert.equal(menu.count('undo'),undos,'Exit press must never undo');
  menu.step();menu.button(2);assert.equal(menu.count('undo'),undos+1,'Normal Undo restored');
  assert(scrolls>5,'Focused headings and controls scroll into view');
  menu.button(10);menu.button(13);menu.button(0);menu.w.dispatchEvent(new menu.w.Event('blur'));
  assert(!menu.w.BilliardsController.status().menuMode);assert.equal(d.querySelector('.controllerMenuFocus'),null);
  console.log('PASS: menu headings, section navigation, activation, values, pointer selection, Square back, safe exit, scrolling and blur');
} finally { menu.close(); }

const drawer = setup();
try {
  const d=drawer.w.document,panel=d.getElementById('panel');
  panel.insertAdjacentHTML('afterbegin','<div class="section"><button class="sectionToggle" id="drawerHeading">TABLE / BALLS</button><div class="sectionBody"><button id="drawerControl">Control</button></div></div>');
  const toggle=d.createElement('button');toggle.id='phoneControls';d.body.append(toggle);
  const sync=()=>{const open=d.body.classList.contains('phone-controls-open');panel.toggleAttribute('inert',!open);panel.style.display=open?'block':'none';toggle.setAttribute('aria-expanded',String(open));};
  toggle.onclick=()=>{d.body.classList.toggle('phone-controls-open');sync();};sync();
  d.getElementById('drawerHeading').onclick=()=>d.getElementById('drawerHeading').parentElement.classList.toggle('open');
  drawer.enable();drawer.button(10);drawer.button(13);
  assert(d.body.classList.contains('phone-controls-open'),'Menu entry opens the closed Tools drawer');
  assert.equal(d.activeElement.id,'drawerHeading','Sidebar heading is selected, not toolbar fallback');
  drawer.button(0);assert.equal(d.activeElement.id,'drawerControl');
  drawer.button(2);assert.equal(d.activeElement.id,'drawerHeading');assert(d.body.classList.contains('phone-controls-open'));
  drawer.button(2);assert(!d.body.classList.contains('phone-controls-open'),'Final Square closes the drawer opened by menu navigation');
  assert.equal(drawer.count('undo'),0);drawer.step();drawer.button(2);assert.equal(drawer.count('undo'),1);
  console.log('PASS: closed Tools drawer opens, focuses sidebar, Square backs out and closes it without accidental Undo');
} finally {drawer.close();}

const cameraMap=setup();
try {
  cameraMap.enable();cameraMap.button(3);cameraMap.input(6,1);
  cameraMap.pad.axes=[.7,-.5,.9,-.8];cameraMap.input(12,1);cameraMap.input(15,1);
  const start=cameraMap.count('adjust');cameraMap.step(96);
  const frames=cameraMap.calls.filter(c=>c[0]==='camera').slice(-6);
  assert(frames.length>=5);
  for(const [,v] of frames){assert(v.rotateX<0&&v.rotateY<0&&v.zoomBy<0&&v.panX>0&&v.panY<0,'Orbit, zoom and diagonal pan simultaneous every frame');}
  assert.equal(cameraMap.count('adjust'),start,'Camera modifier never changes shot settings');
  cameraMap.input(12,0);cameraMap.input(15,0);cameraMap.pad.axes=[0,0,1,0];cameraMap.step();
  const stopped=cameraMap.calls.filter(c=>c[0]==='camera').at(-1)[1];
  assert.equal(stopped.panX,0);assert.equal(stopped.panY,0);assert.equal(stopped.zoomBy,0,'Right horizontal axis no longer pans or zooms');
  cameraMap.pad.axes=[0,0,0,1];cameraMap.step();assert(cameraMap.calls.filter(c=>c[0]==='camera').at(-1)[1].zoomBy>0,'Stick down zooms out');
  cameraMap.input(6,0);cameraMap.step(96);assert(cameraMap.count('adjust')>start,'Releasing L2 restores spin/follow controls');
  cameraMap.pad.axes=[0,0,0,0];cameraMap.button(3);cameraMap.input(6,1);const cameras=cameraMap.count('camera');cameraMap.button(12);assert.equal(cameraMap.count('camera'),cameras,'2D keeps normal D-pad speed rather than nonexistent orbit');
  console.log('PASS: simultaneous L2 orbit, continuous zoom, D-pad pan, neutral stop, release restoration and 2D fallback');
} finally {cameraMap.close();}

const zen=setup();
try {
 zen.w.document.body.classList.add('zen-mode');zen.enable();
 const before=zen.count('adjust');zen.pad.axes=[1,-1,.5,-.5];zen.step(96);zen.pad.axes=[0,0,0,0];
 assert(zen.count('adjust')>before);zen.button(7);assert.equal(zen.count('shoot'),1);zen.button(2);assert.equal(zen.count('undo'),1);
 zen.button(10);assert(zen.w.BilliardsController.status().pointerMode);zen.button(12);assert(!zen.w.BilliardsController.status().menuMode,'Zen does not enter hidden Trainer sidebar');
 const popup=zen.w.document.createElement('div');popup.className='zen-popover-open';zen.w.document.body.append(popup);zen.button(7);assert.equal(zen.count('shoot'),1,'Zen menu blocks shots');
 console.log('PASS: Zen shared sticks, Shoot, Undo, cursor and popup interlock');
} finally {zen.close();}

for(const trayId of ['workspaceBalls','zenRack']) {
 const drag=setup();
 try {
  const w=drag.w,d=w.document;w.PointerEvent=class extends w.MouseEvent {constructor(type,opts){super(type,opts);Object.defineProperty(this,'pointerId',{value:opts.pointerId});}};
  const tray=d.createElement('div');tray.id=trayId;const ball=d.createElement('button');ball.dataset.ballId='4';tray.append(ball);d.body.append(tray);
  let events=[],clicks=0,hit=ball;d.elementFromPoint=()=>hit;
  for(const type of ['pointerdown','pointermove','pointerup','pointercancel'])ball.addEventListener(type,e=>events.push([type,e.clientX,e.clientY]));ball.onclick=()=>clicks++;
  drag.enable();drag.button(10);drag.button(0);assert.equal(clicks,1,'Stationary Cross preserves ordinary tray click');
  events=[];drag.input(0,1);drag.step();drag.pad.axes=[.5,-.5,0,0];drag.step(96);drag.pad.axes=[0,0,0,0];hit=d.getElementById('canvas');drag.input(0,0);drag.step();
  assert.equal(events[0][0],'pointerdown');assert(events.some(e=>e[0]==='pointermove'));assert.equal(events.at(-1)[0],'pointerup');assert.equal(clicks,1,'Drag must not also click default placement');
  assert.notEqual(events.at(-1)[1],events[0][1]);assert.notEqual(events.at(-1)[2],events[0][2]);
  hit=ball;events=[];drag.input(0,1);drag.step();drag.pad.axes=[-.5,0,0,0];drag.step();drag.pad.axes=[0,0,0,0];hit=d.body;drag.input(0,0);drag.step();assert.equal(events.at(-1)[0],'pointercancel','Outside-table drop cancels');
  hit=ball;events=[];drag.input(0,1);drag.step();drag.w.dispatchEvent(new w.Event('blur'));assert.equal(events.at(-1)[0],'pointercancel','Focus loss cancels');
  drag.input(0,0);drag.w.dispatchEvent(new w.Event('focus'));drag.step();drag.button(10);events=[];drag.input(0,1);drag.step();ball.disabled=true;drag.step();assert.equal(events.at(-1)[0],'pointercancel','Disabled ball cancels');
  console.log('PASS: '+trayId+' controller hold drag, release coordinates, tap preservation and cancellation');
 } finally {drag.close();}
}

const combos=setup();
try {
 combos.enable();combos.w.BilliardsController.open();combos.step();const d=combos.w.document;
 const change=(label,value)=>{const s=d.querySelector('[aria-label="'+label+'"]');s.value=String(value);s.dispatchEvent(new combos.w.Event('change'));};
 assert.equal(d.querySelectorAll('.controllerComboRow').length,4);
 change('Combination 1 action','fineUp');
 change('Combination 2 button',12);assert.match(d.getElementById('trainerControllerComboError').textContent,/already/);assert.equal(d.querySelector('[aria-label="Combination 2 button"]').value,'13');
 change('Combination 1 button',6);assert.match(d.getElementById('trainerControllerComboError').textContent,/different/);
 change('Combination 1 action','shoot');d.getElementById('trainerControllerClose').click();combos.step();
 combos.input(6,1);combos.button(12);assert.equal(combos.count('shoot'),1,'Remapped chord performs action');
 combos.input(12,1);combos.step();assert.equal(combos.count('shoot'),2);combos.input(6,0);combos.step();combos.input(6,1);combos.step();assert.equal(combos.count('shoot'),2,'Modifier release/repress cannot retrigger held target');
 const before=combos.count('adjust');combos.input(6,0);combos.step();assert.equal(combos.count('adjust'),before,'Partial chord release never triggers base speed action');combos.input(12,0);combos.step();combos.button(12);assert(combos.count('adjust')>before,'Normal target returns after release');
 const saved=JSON.parse(combos.saved());assert.equal(Object.values(saved.profiles)[0].combos[0].action,'shoot');
 combos.w.BilliardsController.open();combos.step();d.getElementById('trainerControllerReset').click();assert.equal(d.querySelector('[aria-label="Combination 1 action"]').value,'panUp');
 console.log('PASS: editable chord defaults, persistence, duplicate/self conflict rejection, target precedence, safe rearm and reset');
}finally{combos.close();}
