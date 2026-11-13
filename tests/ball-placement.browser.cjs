const assert=require('node:assert/strict'),cp=require('node:child_process'),{chromium}=require('playwright');
(async()=>{
 const server=cp.spawn(process.execPath,['tests/range-server.cjs','8817']);await new Promise(r=>server.stdout.once('data',r));
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
  for(const touch of [false,true]){
   const ctx=await browser.newContext({viewport:{width:1280,height:800},hasTouch:touch,serviceWorkers:'block'}),p=await ctx.newPage(),errors=[];
   p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.TRAINER_URL||'http://127.0.0.1:8817/?train=1');await p.waitForFunction(()=>window.billiardsTourBridge&&window.Billiards3D);
   await p.evaluate(()=>{const s=billiardsTourBridge.capture();Object.assign(s.state,{speed:1,follow:0,sideSpin:0,shot2Enabled:false,activeShot:1,showAngleLockControl:false,angleLock:false,setupMode:'custom',freeAim:{x:1.5,y:.635},balls:[{id:0,n:'CB',x:.5,y:.635,active:true},{id:1,n:'1',x:1.5,y:.635,active:true},{id:2,n:'2',x:1.25,y:.42,active:true}]});billiardsTourBridge.restore(s);});
   const state=()=>p.evaluate(()=>billiardsTourBridge.capture().state);
   const check=s=>{const b=s.balls.filter(b=>b.active&&!b.marker);for(let i=0;i<b.length;i++)for(let j=0;j<i;j++)assert(Math.hypot(b[i].x-b[j].x,b[i].y-b[j].y)>=2*s.ballR-1e-8,`Overlap ${b[i].id}/${b[j].id}`);};
   const settle=()=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   async function point(b,is3D){return p.evaluate(({b,is3D})=>{if(is3D)return Billiards3D.project(b,billiardsTourBridge.capture().state.ballR);const s=billiardsTourBridge.capture().state,q=billiardsTourBridge.annotationFrame().map({x:b.x/s.tableL,y:b.y/s.tableW}),r=document.getElementById('stageWrap').getBoundingClientRect();return {x:q.x+r.left,y:q.y+r.top};},{b,is3D});}
   async function drag(from,to,is3D){const a=await point(from,is3D),b=await point(to,is3D);if(touch){const cd=await ctx.newCDPSession(p);await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});for(let i=1;i<=6;i++){await cd.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+(b.x-a.x)*i/6,y:a.y+(b.y-a.y)*i/6}]});check(await state());}await cd.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cd.detach();}else{await p.mouse.move(a.x,a.y);await p.mouse.down();for(let i=1;i<=6;i++){await p.mouse.move(a.x+(b.x-a.x)*i/6,a.y+(b.y-a.y)*i/6);check(await state());}await p.mouse.up();}await settle();check(await state());}
   for(const is3D of [false,true]){
    if(is3D){await p.locator('#table3DToggle').click();await p.waitForFunction(()=>Billiards3D.active);await p.locator('#table3DLock [data-adjust=edit]').click();await settle();}
    const before=await state(),fixed=before.balls.find(b=>b.id===1);await drag(before.balls.find(b=>b.id===2),fixed,is3D);
    let after=await state(),moved=after.balls.find(b=>b.id===2);assert.deepEqual(after.balls.find(b=>b.id===1),fixed,'Stationary ball must not move');assert.notDeepEqual(moved,before.balls.find(b=>b.id===2),'Real pointer drag must move the selected ball');
    assert(Math.hypot(moved.x-fixed.x,moved.y-fixed.y)<2*after.ballR+.006,'Dragged ball finishes touching the obstruction');
    const openDrawer=!(await p.locator('#undoAction').isVisible());if(openDrawer)await p.locator('#phoneControls').click();
    await p.locator('#undoAction').click();assert.deepEqual((await state()).balls,before.balls,'Undo restores placement');await p.locator('#redoAction').click();assert.deepEqual((await state()).balls,after.balls,'Redo restores legal placement');
    if(openDrawer)await p.locator('#phoneControls').click();
    await drag(after.balls.find(b=>b.id===0),fixed,is3D);check(await state());
    // Exact coordinate input also traverses the shared event handlers.
    await p.evaluate(()=>{const s=billiardsTourBridge.capture().state,a=s.balls.find(b=>b.id===2),b=s.balls.find(b=>b.id===1);billiards3DTableInput('pointerdown',a,{pointerId:9});billiards3DTableInput('pointermove',b,{pointerId:9,buttons:1});billiards3DTableInput('pointerup',b,{pointerId:9});});check(await state());
    console.log(`${touch?'Touch':'Mouse'} ${is3D?'3D':'2D'} placement and action history passed.`);
   }
   // Loading an old broken session must repair its visible coordinates too.
   await p.evaluate(()=>{const s=billiardsTourBridge.capture();for(const b of s.state.balls){b.x=1.4;b.y=.6;}billiardsTourBridge.restore(s);});check(await state());
   const beforeShot=await state(),prediction=await p.evaluate(()=>billiardsTourBridge.predict());
   await p.locator('[data-trainer-action=animate]').click();await p.waitForFunction(()=>billiardsTourBridge.snapshot().busy);await p.waitForFunction(()=>!billiardsTourBridge.snapshot().busy,null,{timeout:45000});check(await state());
   const final=(await state()).balls;for(const b of final){const expected=prediction.finalBalls.find(x=>x.id===b.id);if(expected&&b.active)assert(Math.hypot(b.x-expected.x,b.y-expected.y)<1e-8,'Execution matches prediction');}
   await p.locator('[data-trainer-action=undoShot]').click();assert.deepEqual((await state()).balls,beforeShot.balls,'Shot Undo preserves repaired setup');
   assert.deepEqual(errors,[]);console.log(`${touch?'Touch':'Mouse'}: 2D/3D drag, contact, unchanged neighbors, Undo/Redo, exact drop, restored overlaps, prediction/execution and Shot Undo passed.`);await ctx.close();
  }
 }finally{await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
