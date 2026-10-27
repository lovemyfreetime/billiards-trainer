const assert=require('node:assert/strict'),cp=require('node:child_process'),{chromium}=require('playwright');
(async()=>{const server=cp.spawn(process.execPath,['tests/range-server.cjs','8822']);await new Promise(r=>server.stdout.once('data',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'],...(process.env.LIVE_URL?{proxy:{server:process.env.HTTPS_PROXY}}:{})});try{
for(const mobile of [false]){
 const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1366,height:900},isMobile:mobile,hasTouch:mobile,ignoreHTTPSErrors:true,serviceWorkers:'block'});
 await context.addInitScript(()=>{window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}};});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.LIVE_URL||'http://127.0.0.1:8822/?train=1');await page.waitForFunction(()=>window.billiardsTourBridge&&window.Billiards3D);
 const base=await page.evaluate(()=>billiardsTourBridge.capture().state);
 async function set(mode,rails,target,ball={x:1.3,y:.65},cue={x:.4,y:.6},speed=6,extra={}){await page.evaluate(({mode,rails,target,ball,cue,speed,base,extra})=>{const snap=billiardsTourBridge.capture();Object.assign(snap.state,base,{tableL:2.032,tableW:1.016,speed,sideSpin:0,follow:0,airbornePhysics:false,activeShot:1,shot2Enabled:false,balls:[{id:0,n:'CB',...cue,active:true},{id:1,n:'1',...ball,active:true}],bankKick:{mode,phase:rails.length?null:'zero',zero:target,rails,railName:rails[0]||null,ballId:rails.length?1:null,routeVersion:2,requested:!!rails.length}},extra);billiardsTourBridge.restore(snap);},{mode,rails,target,ball,cue,speed,base,extra});}
 const state=()=>page.evaluate(()=>billiardsTourBridge.capture().state);
 async function solved(count){await page.waitForFunction(()=>!!billiardsTourBridge.capture().state.bankKick.solution,{},{timeout:60000});const sol=(await state()).bankKick.solution;assert.equal(sol.bounces.length,count);assert(sol.reached);return sol;}
 async function applyAndVerify(mode,rails){
  const plan=await solved(rails.length);assert.match(await page.locator('#bankKickSpeedOutput').innerText(),new RegExp(plan.shotSpeed.toFixed(2)));assert.notEqual(await page.locator('#bankKickFollowOutput').innerText(),'—');assert.notEqual(await page.locator('#bankKickSpinOutput').innerText(),'—');assert(plan.fullShot,'Guide must verify the complete cue-ball shot');
  const before=await state();if(await page.locator('#bankKickUseSpeed').isVisible()){await page.locator('#bankKickUseSpeed').click();await page.waitForTimeout(150);await solved(rails.length);}
  const prediction=await page.evaluate(()=>billiardsTourBridge.predict()),after=await state();
  assert.equal(after.follow,plan.shotFollow);assert.equal(after.sideSpin,plan.shotSide);assert.deepEqual(after.balls,before.balls);
  assert.equal(prediction.firstBallContact.objId,1);
  const carrier=mode==='bank'?1:0,hitTime=prediction.firstBallContact.t;
  const hits=prediction.railEvents.filter(e=>e.id===carrier&&(mode!=='kick'||e.t<=hitTime));
  assert.deepEqual(hits.slice(0,rails.length).map(e=>e.rail.replace(' rail','')),rails);
  if(plan.verifiedPocket){assert(prediction.pocketed.includes(1),'The actual Execute Shot predictor must pocket the banked ball');assert.deepEqual(prediction.pocketEvents.find(e=>e.id===1),plan.verifiedPocket,'Guide and real shot have identical pocket position, time and speed');}
  return plan;
 }

 const rails=['bottom','right'],target={x:0,y:0},ball={x:1.3,y:.8};
 await set('bank',rails,target,ball,undefined,6,{follow:1,sideSpin:1,cueElevationDeg:70,airbornePhysics:true,freeAim:{x:-10,y:-10},angleLock:true});
 const exaggerated=await state(),first=await solved(2);
 console.log('Independent bank:',first.shotSpeed,first.shotFollow,first.shotSide);
 assert(first.shotSpeed<=(rails.length>=3?6:5));assert(Math.abs(first.shotFollow)<=.5);assert(Math.abs(first.shotSide)<=.5);assert(!first.scratch);
 assert.equal((await state()).follow,1);assert.equal((await state()).speed,6,'Planning leaves controls untouched');
 await applyAndVerify('bank',rails);
 await set('bank',rails,target,ball,undefined,.2,{follow:-1,sideSpin:-1,cueElevationDeg:0,freeAim:{x:10,y:10}});
 const other=await solved(2);
 for(const key of ['angle','shotSpeed','shotFollow','shotSide','verifiedPocket'])assert.deepEqual(other[key],first[key],key+' must not depend on current controls');
 await set('bank',rails,target,ball,undefined,6,{activeShot:2,shot2Enabled:true,shot2Initialized:true,shot2:{...exaggerated.shot2,x:.4,y:.6,speed:6,follow:1,sideSpin:-1,cueElevationDeg:70,freeAim:{x:9,y:9},angleLock:true}});
 const second=await solved(2);assert(second.shotSpeed<=(rails.length>=3?6:5));assert(Math.abs(second.shotFollow)<=.5&&Math.abs(second.shotSide)<=.5);
 await page.locator('#bankKickUseSpeed').click();await page.waitForTimeout(200);const applied=(await state()).shot2;assert.equal(applied.speed,second.shotSpeed);assert.equal(applied.follow,second.shotFollow);assert.equal(applied.sideSpin,second.shotSide);
 await set('bank',['bottom','right','top'],{x:0,y:1.016},{x:1.3,y:.8});
 const extended=await solved(3);assert(extended.shotSpeed>4&&extended.shotSpeed<=6,'A three-rail route can use modestly more power');assert.equal(extended.shotFollow,0);assert.equal(extended.shotSide,0);await applyAndVerify('bank',['bottom','right','top']);
 await set('bank',rails,target,ball,undefined,6,{muRoll:10});
 await page.waitForFunction(()=>/No practical shot/.test(document.querySelector('#bankKickRouteStatus').textContent),{},{timeout:60000});assert.equal((await state()).bankKick.solution,null);
 assert.deepEqual(errors,[]);console.log('Practical bank: independent aim/speed/spin/elevation, unchanged controls until apply, exact executed physics, shot 2 and bounded failure passed.');await context.close();
}
}finally{await browser.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1});
