const assert=require('node:assert/strict'),fs=require('node:fs'),{spawn}=require('node:child_process'),{chromium}=require('playwright');
(async()=>{
 const server=spawn(process.execPath,['tests/range-server.cjs','8897']);let browser;
 try{
  await new Promise(r=>server.stdout.once('data',r));browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  const context=await browser.newContext({viewport:{width:1024,height:640},isMobile:true,hasTouch:true,serviceWorkers:'block'});
  await context.addInitScript(()=>{window.BilliardsWindowsHostAvailable=window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}};});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8897/?train=1');await page.waitForFunction(()=>window.billiardsGuidance&&window.billiardsMenuReady);
  await page.evaluate(()=>{const snap=billiardsTourBridge.capture();Object.assign(snap.state,{activeShot:1,shot2Enabled:false,tableL:2.54,tableW:1.27,showTable:true,showCueStick:true,showPocketChances:true,showShotLine:true,showShot1:true,showCueVisuals:true,guidanceAimErrorDeg:.15,guidanceRailErrorDeg:.35,guidanceEnabled:true,guidanceBreak:false,guidanceScratch:false,setupMode:'9ball',angleLock:false,balls:[{id:0,n:'CB',x:.4,y:.9,active:true},{id:1,n:'1',x:.7,y:1,active:true}],speed:1.5,sideSpin:0,follow:0,airbornePhysics:false,bankKick:{mode:null,phase:null,rails:[]}});billiardsTourBridge.restore(snap);billiardsGuidance.replan();});
  const choices=await page.evaluate(()=>billiardsGuidance.chances());assert.equal(choices.length,6);assert.equal(choices.filter(c=>c.best).length,1);assert.equal(choices.find(c=>c.best).pocket,'bottom right');assert.match(choices.find(c=>c.best).text,/Best.*%/);
  assert.equal(await page.evaluate(()=>billiardsGuidance.status().plan.pocket),'bottom right');
  await page.locator('#table3DToggle').tap();await page.waitForFunction(()=>Billiards3D.active&&!Billiards3D.camera().transitioning&&Billiards3D.cueModel()?.referenceReady);
  await page.waitForFunction(()=>Billiards3D.overlayLabels().filter(l=>l.id.startsWith('pocket-chance')).length===6);
  assert.equal(await page.evaluate(()=>Billiards3D.overlayLabels().find(l=>l.rows[0].startsWith('Best')).color),'#79efa1');
  await page.evaluate(()=>document.getElementById('showPocketChances').click());assert.deepEqual(await page.evaluate(()=>billiardsGuidance.chances()),[]);await page.evaluate(()=>document.getElementById('showPocketChances').click());
  if(await page.evaluate(()=>document.body.classList.contains('phone-tray-hidden')))await page.locator('#phoneTrayToggle').tap();
  async function allBallsFit(){await page.waitForFunction(()=>{const tray=document.getElementById('workspaceBalls'),r=tray.getBoundingClientRect();if(r.bottom>innerHeight+1||r.right>innerWidth+1||r.left<0)return false;return [...tray.children].every(b=>{const q=b.getBoundingClientRect();return q.width>=24&&q.height>=24&&q.left>=r.left-1&&q.right<=r.right+1&&q.top>=r.top-1&&q.bottom<=r.bottom+1;});});assert.equal(await page.locator('#workspaceBalls .workspaceBall').count(),16);}
  await allBallsFit();assert.match(await page.locator('#table3DLock').innerText(),/Move balls/);await page.locator('#table3DLock').tap();assert.match(await page.locator('#table3DLock').innerText(),/Done moving.*Balls unlocked/s);assert(await page.evaluate(()=>Billiards3D.locked));
  await page.locator('#table3DFullView').tap();assert.equal(await page.evaluate(()=>Billiards3D.locked),false,'View change finishes moving without a separate commit');assert.equal(await page.evaluate(()=>Billiards3D.camera().transitionDuration),3200);await page.waitForFunction(()=>!Billiards3D.camera().transitioning);
  const start=Date.now(),balls=await page.evaluate(()=>billiardsTourBridge.capture().state.balls);
  await page.locator('#table3DCueView').tap();assert.equal(await page.evaluate(()=>Billiards3D.camera().transitionDuration),4800);await page.waitForTimeout(120);assert(await page.evaluate(()=>Billiards3D.cueModel().presentation.opacity>.7),'the visible cue does not disappear abruptly when entering Cue View');await page.waitForTimeout(1980);
  const midway=await page.evaluate(()=>({camera:Billiards3D.camera(),cue:Billiards3D.cueModel()}));assert(midway.camera.transitioning&&midway.camera.approachProgress<.6);assert(midway.cue.presentation.opacity<.8,'Cue lowers during the approach instead of snapping to address');
  await page.waitForFunction(()=>!Billiards3D.camera().transitioning);assert(Date.now()-start>=4500);assert.deepEqual(await page.evaluate(()=>billiardsTourBridge.capture().state.balls),balls);
  fs.mkdirSync('test-results/intuitive-table',{recursive:true});await page.screenshot({path:'test-results/intuitive-table/cue-approach.png'});
  await page.locator('#table3DFullView').tap();await page.waitForFunction(()=>!Billiards3D.camera().transitioning);await page.screenshot({path:'test-results/intuitive-table/pocket-chances-tablet.png'});
  await page.setViewportSize({width:844,height:390});await allBallsFit();await page.waitForTimeout(800);await allBallsFit();await page.screenshot({path:'test-results/intuitive-table/full-tray-phone.png'});
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#table3DCueView').tap();assert.equal(await page.evaluate(()=>Billiards3D.camera().transitioning),false,'Reduced motion removes approach');await page.locator('#table3DFullView').tap();
  // Use the existing complete physics solver; no synthetic successful route is inserted.
  for(const mode of ['kick','bank']){
   await page.evaluate(mode=>{const snap=billiardsTourBridge.capture();Object.assign(snap.state,{activeShot:1,shot2Enabled:false,tableL:2.032,tableW:1.016,guidanceBreak:false,guidanceScratch:false,showPocketChances:true,balls:[{id:0,n:'CB',x:.4,y:.6,active:true},{id:1,n:'1',x:1.3,y:mode==='bank'?.8:.65,active:true}],speed:2.25,sideSpin:0,follow:0,angleLock:false,airbornePhysics:false,bankKick:{mode,phase:null,zero:mode==='kick'?{x:1.3,y:.65}:{x:0,y:0},rails:mode==='kick'?['top']:['bottom','right'],railName:'top',ballId:1,routeVersion:2,requested:false}});billiardsTourBridge.restore(snap);},mode);
   await page.locator('#bankKickCalculate').click();await page.waitForFunction(()=>billiardsTourBridge.capture().state.bankKick.solution||document.getElementById('bankKickCalculate').getAttribute('aria-busy')==='false',null,{timeout:35000});
   const result=await page.evaluate(()=>({solution:billiardsTourBridge.capture().state.bankKick.solution,markers:billiardsGuidance.chances()}));assert(result.solution?.reached,await page.locator('#bankKickRouteStatus').innerText());assert.equal(result.markers.length,1);assert.equal(result.markers[0].outcome,mode==='kick'?'Contact':'Bank pocket');assert(Number.isFinite(result.markers[0].probability));assert.match(await page.locator('#bankKickRouteStatus').innerText(),/Est\./);
   await page.screenshot({path:'test-results/intuitive-table/'+mode+'-chance.png'});
  }
  assert.deepEqual(errors,[]);console.log('Tablet/phone: six pocket percentages, farther best pocket, coloured 3D markers, full 16-ball tray, Move/Done, automatic protection, timed slow cue approach, reduced motion and actual calculated bank/kick chance labels passed.');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
