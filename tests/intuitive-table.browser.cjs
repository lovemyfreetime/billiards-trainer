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
  await page.locator('#table3DToggle').tap();await page.waitForFunction(()=>Billiards3D.active&&Billiards3D.cueModel()?.referenceReady);await page.waitForFunction(()=>!Billiards3D.camera().transitioning);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const touch=await context.newCDPSession(page),send=async(type,p)=>{await touch.send('Input.dispatchTouchEvent',{type,touchPoints:p?[p]:[]});await settle();};
  const project=(p,h=0)=>page.evaluate(([q,h])=>{const {x,y}=Billiards3D.project(q,h);return {x,y};},[p,h]);
  const before=await page.evaluate(()=>({camera:Billiards3D.camera(),state:billiardsTourBridge.capture().state}));
  const start=await project({x:1.1,y:1.05});await send('touchStart',start);await send('touchMove',{x:start.x+65,y:start.y+12});await send('touchEnd');
  const after=await page.evaluate(()=>({camera:Billiards3D.camera(),state:billiardsTourBridge.capture().state}));
  assert(Math.abs(after.camera.azimuth-before.camera.azimuth)>.05);assert.deepEqual(after.state.freeAim,before.state.freeAim);assert.deepEqual(after.state.balls,before.state.balls);
  await page.locator('#table3DReturnView').tap();await page.waitForFunction(()=>!Billiards3D.camera().transitioning);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const restored=await page.evaluate(()=>Billiards3D.camera());assert(Math.abs(restored.azimuth-before.camera.azimuth)<1e-6);assert.equal(restored.radius,before.camera.radius);
  const ballScreen=await project({x:1.3,y:.9});await send('touchStart',ballScreen);await send('touchMove',{x:ballScreen.x+45,y:ballScreen.y+10});await send('touchEnd');assert.deepEqual(await page.evaluate(()=>billiardsTourBridge.capture().state.balls),before.state.balls,'ordinary touching does not relocate physical balls');
  await page.locator('#table3DReturnView').tap();await page.waitForFunction(()=>!Billiards3D.camera().transitioning);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const aim=await page.evaluate(()=>billiardsTourBridge.capture().state.freeAim),handle=await project(aim),camera=await page.evaluate(()=>Billiards3D.camera());
  await send('touchStart',handle);await send('touchMove',{x:handle.x-18,y:handle.y+9});await send('touchEnd');
  await page.screenshot({path:'test-results/intuitive-table/handle.png'});
  assert.notDeepEqual(await page.evaluate(()=>billiardsTourBridge.capture().state.freeAim),aim);assert.equal((await page.evaluate(()=>Billiards3D.camera())).azimuth,camera.azimuth,'aim edit leaves inspection camera still');
  await page.locator('#table3DCueView').tap();await page.waitForFunction(()=>Billiards3D.camera().playerView&&!Billiards3D.camera().transitioning);await settle();
  const cueHeld=await page.evaluate(()=>({camera:Billiards3D.camera(),state:billiardsTourBridge.capture().state}));
  await send('touchStart',{x:400,y:270});await send('touchMove',{x:460,y:280});await send('touchEnd');
  assert.equal(await page.evaluate(()=>Billiards3D.camera().playerView),false);
  assert.deepEqual(await page.evaluate(()=>billiardsTourBridge.capture().state.freeAim),cueHeld.state.freeAim);
  await page.locator('#table3DReturnView').tap();await page.waitForFunction(()=>!Billiards3D.camera().transitioning);await settle();
  assert(await page.evaluate(()=>Billiards3D.camera().playerView));assert.equal(await page.evaluate(()=>Billiards3D.camera().playerEyeHeight),cueHeld.camera.playerEyeHeight);
  await page.locator('#table3DFullView').tap();await page.waitForFunction(()=>!Billiards3D.camera().transitioning);await settle();
  if(await page.evaluate(()=>document.body.classList.contains('phone-tray-hidden')))await page.locator('#phoneTrayToggle').tap();
  await page.locator('#table3DLock').tap();assert(await page.evaluate(()=>Billiards3D.locked));
  const R=await page.evaluate(()=>billiardsTourBridge.capture().state.ballR),ball=await project({x:.7,y:.35},R),destination=await project({x:.8,y:.4},R);
  await send('touchStart',ball);await send('touchMove',destination);await send('touchEnd');
  const movedBall=await page.evaluate(()=>billiardsTourBridge.capture().state.balls.find(b=>b.id===3));assert(Math.hypot(movedBall.x-.8,movedBall.y-.4)<.01,'intentional arrangement moves the physical ball');
  await page.locator('#table3DLock').tap();assert.equal(await page.evaluate(()=>Billiards3D.locked),false);
  await page.locator('#phoneTrayToggle').tap();
  await page.evaluate(()=>billiardsGuidance.replan());
  fs.mkdirSync('test-results/intuitive-table',{recursive:true});await page.screenshot({path:'test-results/intuitive-table/tablet.png'});
  // Exercise the real playback/commit boundary with a short straight pocket shot.
  await page.evaluate(()=>{const setup=billiardsTourBridge.capture();Object.assign(setup.state,{balls:[{id:0,n:'CB',x:1.7,y:.3,active:true},{id:1,n:'1',x:2.2,y:.1,active:true},{id:2,n:'2',x:1.4,y:.8,active:true},{id:3,n:'3',x:.6,y:.4,active:true}],setupMode:'9ball',shot2Enabled:false,guidanceBreak:false,guidanceScratch:false,angleLock:false,speed:1.5,follow:0,sideSpin:0,shotPlaybackSpeed:8});billiardsTourBridge.restore(setup);billiardsGuidance.replan();});
  await page.evaluate(()=>document.getElementById('animate').click());
  await page.waitForFunction(()=>document.getElementById('animate').dataset.running==='false',null,{timeout:30000});
  state=await page.evaluate(()=>billiardsTourBridge.capture().state);
  assert(!state.balls.some(b=>b.id===1),'first object ball pockets in the real simulation');assert.equal(state.guidancePlan.ballId,2,'real shot commit selects the next numbered ball');
  await page.evaluate(()=>document.getElementById('undoShot').click());assert((await page.evaluate(()=>billiardsTourBridge.capture().state)).balls.some(b=>b.id===1));
  await page.evaluate(()=>document.getElementById('redoShot').click());
  for(const id of [2,3]){
   assert.equal(await page.evaluate(()=>billiardsGuidance.status().plan.ballId),id);
   await page.evaluate(()=>document.getElementById('animate').click());await page.waitForFunction(()=>document.getElementById('animate').dataset.running==='false',null,{timeout:30000});
   assert(!await page.evaluate(id=>billiardsTourBridge.capture().state.balls.some(b=>b.id===id),id),'ordered run pockets ball '+id);
  }
  assert.equal(await page.evaluate(()=>billiardsGuidance.status().plan.kind),'complete');
  await page.waitForFunction(()=>Billiards3D.cueModel()?.visible===false);
  await page.screenshot({path:'test-results/intuitive-table/run-complete.png'});
  await page.evaluate(()=>{const setup=billiardsTourBridge.capture();Object.assign(setup.state,{balls:[{id:0,n:'CB',x:1.7,y:.3,active:true},{id:1,n:'1',x:2.2,y:.1,active:true},{id:2,n:'2',x:1.4,y:.8,active:true},{id:3,n:'3',x:.6,y:.4,active:true}],pocketedLog:[],guidancePlan:null,guidanceBreak:false,guidanceScratch:false,angleLock:false,speed:1.5,follow:0,sideSpin:0,shotPlaybackSpeed:8,shot2Enabled:true,shot2Initialized:true,shot2:{x:1.7,y:.3,freeAim:{x:.6,y:.4},speed:.93,follow:-.2,sideSpin:.15,cueElevationDeg:3,angleLock:false,autoFollow:false,autoGhostLock:false,preview:null}});setup.state.freeAim=BilliardsGuidance.suggest(setup.state).aim;billiardsTourBridge.restore(setup);});
  await page.evaluate(()=>document.getElementById('animate').click());await page.waitForFunction(()=>document.getElementById('animate').dataset.running==='false',null,{timeout:30000});
  const manual=await page.evaluate(()=>billiardsTourBridge.capture().state);assert.equal(manual.shot2Enabled,false);assert.equal(manual.speed,.93);assert.equal(manual.follow,-.2);assert.equal(manual.sideSpin,.15);assert.equal(manual.guidancePlan,null,'manual Shot 2 takes priority over automatic targeting');
  await page.evaluate(()=>document.getElementById('resetLayoutQuick').click());state=await page.evaluate(()=>billiardsTourBridge.capture().state);assert.equal(state.trainingBallStyle,'spots');assert(state.showRestingCueBall&&state.showFullGhostBall);assert.equal(state.showImpact,false);
  await page.evaluate(()=>{const state=billiardsTourBridge.capture().state;localStorage.setItem('billiardTrainerSavedLayoutsV1',JSON.stringify([{id:'legacy-check',name:'Legacy layout',tableL:state.tableL,tableW:state.tableW,ballR:state.ballR,balls:[{id:0,n:'CB',x:.7,y:.5,active:true}],freeAim:{x:1.3,y:.5},trainingBallStyle:'current',setupMode:'custom'}]));const option=document.createElement('option');option.value='legacy-check';option.textContent='Legacy layout';document.getElementById('layoutSelect').append(option);document.getElementById('layoutSelect').value='legacy-check';document.getElementById('loadLayoutBtn').click();});
  assert.equal(await page.evaluate(()=>billiardsTourBridge.capture().state.trainingBallStyle),'spots','legacy layout recall preserves personal ball appearance');
  assert.deepEqual(errors,[]);console.log('Tablet: persisted preferences, safe inspection, protected balls, explicit aim editing, exact return view, full three-ball run, completion, manual Shot 2, Cue View return, deliberate ball arrangement, Undo and layout-reset preferences passed.');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
