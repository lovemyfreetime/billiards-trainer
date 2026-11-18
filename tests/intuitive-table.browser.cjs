const assert=require('node:assert/strict'),fs=require('node:fs'),{spawn}=require('node:child_process'),{chromium}=require('playwright');
(async()=>{
 const server=spawn(process.execPath,['tests/range-server.cjs','8896']);let browser;
 try{
  await new Promise(r=>server.stdout.once('data',r));
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1024,height:640},isMobile:true,hasTouch:true,serviceWorkers:'block'});
  await context.addInitScript(()=>{window.BilliardsWindowsHostAvailable=window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}};});
  const page=await context.newPage(),errors=[];fs.mkdirSync('test-results/intuitive-table',{recursive:true});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8896/?train=1');await page.waitForFunction(()=>window.billiardsMenuReady&&window.billiardsGuidance);
  await page.evaluate(()=>{
   const setup=billiardsTourBridge.capture();Object.assign(setup.state,{balls:[{id:0,n:'CB',x:1,y:.63,active:true},{id:1,n:'1',x:1.85,y:.25,active:true},{id:2,n:'2',x:1.3,y:.9,active:true},{id:3,n:'3',x:.7,y:.35,active:true}],freeAim:{x:1.7,y:.6},setupMode:'9ball',guidanceEnabled:true,guidanceBreak:false,shot2Enabled:false,activeShot:1,angleLock:false,showCueStick:true,showTable:true,trainingBallStyle:'spots',showFullGhostBall:true,showRestingCueBall:true,showImpact:false,shotPlaybackSpeed:8});billiardsTourBridge.restore(setup);billiardsGuidance.replan();BilliardsCue3D.setFinish('carbon');
  });
  assert.equal(await page.evaluate(()=>billiardsGuidance.status().plan.ballId),1);
  await page.reload();await page.waitForFunction(()=>window.billiardsMenuReady&&window.billiardsGuidance);
  let state=await page.evaluate(()=>billiardsTourBridge.capture().state);assert.equal(state.trainingBallStyle,'spots');assert.equal(state.showImpact,false);assert(state.showRestingCueBall&&state.showFullGhostBall);assert.equal(await page.evaluate(()=>BilliardsCue3D.getFinish()),'carbon');
  await page.locator('#table3DToggle').tap();await page.waitForFunction(()=>Billiards3D.active&&Billiards3D.cueModel()?.referenceReady);await page.waitForTimeout(850);
  const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const touch=await context.newCDPSession(page),send=async(type,p)=>{await touch.send('Input.dispatchTouchEvent',{type,touchPoints:p?[p]:[]});await settle();};
  const project=p=>page.evaluate(q=>{const {x,y}=Billiards3D.project(q);return {x,y};},p);
  const before=await page.evaluate(()=>({camera:Billiards3D.camera(),state:billiardsTourBridge.capture().state}));
  const start=await project({x:1.1,y:1.05});await send('touchStart',start);await send('touchMove',{x:start.x+65,y:start.y+12});await send('touchEnd');
  const after=await page.evaluate(()=>({camera:Billiards3D.camera(),state:billiardsTourBridge.capture().state}));
  assert(Math.abs(after.camera.azimuth-before.camera.azimuth)>.05);assert.deepEqual(after.state.freeAim,before.state.freeAim);assert.deepEqual(after.state.balls,before.state.balls);
  await page.locator('#table3DReturnView').tap();await page.waitForTimeout(850);
  const restored=await page.evaluate(()=>Billiards3D.camera());assert(Math.abs(restored.azimuth-before.camera.azimuth)<1e-6);assert.equal(restored.radius,before.camera.radius);
  const ballScreen=await project({x:1.3,y:.9});await send('touchStart',ballScreen);await send('touchMove',{x:ballScreen.x+45,y:ballScreen.y+10});await send('touchEnd');assert.deepEqual(await page.evaluate(()=>billiardsTourBridge.capture().state.balls),before.state.balls,'ordinary touching does not relocate physical balls');
  await page.locator('#table3DReturnView').tap();await page.waitForTimeout(850);
  await page.evaluate(()=>{window.__trainerInputTrace=[];});
  const aim=await page.evaluate(()=>billiardsTourBridge.capture().state.freeAim),handle=await project(aim),camera=await page.evaluate(()=>Billiards3D.camera());
  console.log('Handle screen',JSON.stringify(await page.evaluate(p=>({point:p,target:document.elementFromPoint(p.x,p.y)?.id,locked:Billiards3D.locked}),handle)));
  await send('touchStart',handle);await send('touchMove',{x:handle.x-18,y:handle.y+9});await send('touchEnd');
  console.log('Aim handle result',JSON.stringify(await page.evaluate(()=>({trace:window.__trainerInputTrace,aim:billiardsTourBridge.capture().state.freeAim,camera:Billiards3D.camera(),handles:billiardsGuidance.aimHandles()}))));
  await page.screenshot({path:'test-results/intuitive-table/handle.png'});
  assert.notDeepEqual(await page.evaluate(()=>billiardsTourBridge.capture().state.freeAim),aim);assert.equal((await page.evaluate(()=>Billiards3D.camera())).azimuth,camera.azimuth,'aim edit leaves inspection camera still');
  await page.evaluate(()=>billiardsGuidance.replan());
  fs.mkdirSync('test-results/intuitive-table',{recursive:true});await page.screenshot({path:'test-results/intuitive-table/tablet.png'});
  // Exercise the real playback/commit boundary with a short straight pocket shot.
  await page.evaluate(()=>{const setup=billiardsTourBridge.capture();Object.assign(setup.state,{balls:[{id:0,n:'CB',x:1.7,y:.3,active:true},{id:1,n:'1',x:2.2,y:.1,active:true},{id:2,n:'2',x:1.4,y:.8,active:true},{id:3,n:'3',x:.6,y:.4,active:true}],setupMode:'9ball',shot2Enabled:false,guidanceBreak:false,guidanceScratch:false,angleLock:false,speed:1.5,follow:0,sideSpin:0,shotPlaybackSpeed:8});billiardsTourBridge.restore(setup);billiardsGuidance.replan();});
  await page.evaluate(()=>document.getElementById('animate').click());
  await page.waitForFunction(()=>document.getElementById('animate').dataset.running==='false',null,{timeout:30000});
  state=await page.evaluate(()=>billiardsTourBridge.capture().state);
  assert(!state.balls.some(b=>b.id===1),'first object ball pockets in the real simulation');assert.equal(state.guidancePlan.ballId,2,'real shot commit selects the next numbered ball');
  await page.evaluate(()=>document.getElementById('undoShot').click());assert((await page.evaluate(()=>billiardsTourBridge.capture().state)).balls.some(b=>b.id===1));
  await page.evaluate(()=>document.getElementById('resetLayoutQuick').click());state=await page.evaluate(()=>billiardsTourBridge.capture().state);assert.equal(state.trainingBallStyle,'spots');assert(state.showRestingCueBall&&state.showFullGhostBall);assert.equal(state.showImpact,false);
  assert.deepEqual(errors,[]);console.log('Tablet: persisted preferences, safe inspection, protected balls, explicit aim editing, exact return view, actual pocket/next-ball handoff, Undo and layout-reset preferences passed.');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
