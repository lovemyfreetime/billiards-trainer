const assert=require('node:assert/strict'),cp=require('node:child_process'),{chromium}=require('playwright');
(async()=>{const server=cp.spawn(process.execPath,['tests/range-server.cjs','8822']);await new Promise(r=>server.stdout.once('data',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'],...(process.env.LIVE_URL?{proxy:{server:process.env.HTTPS_PROXY}}:{})});try{
for(const mobile of [false,true]){
 const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1366,height:900},isMobile:mobile,hasTouch:mobile,ignoreHTTPSErrors:true,serviceWorkers:'block'});
 await context.addInitScript(()=>{window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}};});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.LIVE_URL||'http://127.0.0.1:8822/?train=1');await page.waitForFunction(()=>window.billiardsTourBridge&&window.Billiards3D);
 const base=await page.evaluate(()=>billiardsTourBridge.capture().state);
 async function set(mode,rails,target,ball={x:1.3,y:.65},cue={x:.4,y:.6},speed=6,extra={}){await page.evaluate(({mode,rails,target,ball,cue,speed,base,extra})=>{const snap=billiardsTourBridge.capture();Object.assign(snap.state,base,{tableL:2.032,tableW:1.016,speed,sideSpin:0,follow:0,airbornePhysics:false,activeShot:1,shot2Enabled:false,balls:[{id:0,n:'CB',...cue,active:true},{id:1,n:'1',...ball,active:true}],bankKick:{mode,phase:rails.length?null:'zero',zero:target,rails,railName:rails[0]||null,ballId:rails.length?1:null,routeVersion:2,requested:!!rails.length}},extra);billiardsTourBridge.restore(snap);},{mode,rails,target,ball,cue,speed,base,extra});}
 const state=()=>page.evaluate(()=>billiardsTourBridge.capture().state);
 async function solved(count){await page.waitForFunction(()=>!!billiardsTourBridge.capture().state.bankKick.solution,{},{timeout:60000});const sol=(await state()).bankKick.solution;assert.equal(sol.bounces.length,count);assert(sol.reached);return sol;}
 async function applyAndVerify(mode,rails){
  await page.waitForFunction(()=>!!billiardsTourBridge.capture().state.bankKick.solution||/No practical shot/.test(document.querySelector('#bankKickRouteStatus').textContent),{},{timeout:60000});
  if(!(await state()).bankKick.solution){assert.match(await page.locator('#bankKickRouteStatus').innerText(),/No practical shot/);return null;}
  const plan=await solved(rails.length);assert(plan.shotSpeed<=(rails.length>=3?6:5));assert(Math.abs(plan.shotFollow)<=.5&&Math.abs(plan.shotSide)<=.5);assert(!plan.scratch);assert.match(await page.locator('#bankKickSpeedOutput').innerText(),new RegExp(plan.shotSpeed.toFixed(2)));assert.notEqual(await page.locator('#bankKickFollowOutput').innerText(),'—');assert.notEqual(await page.locator('#bankKickSpinOutput').innerText(),'—');assert(plan.fullShot,'Guide must verify the complete cue-ball shot');
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
 if(!mobile){
 await set('bank',['bottom'],{x:0,y:0},{x:1.3,y:.65},{x:1.487,y:.484});await applyAndVerify('bank',['bottom']);
 await set('bank',['bottom','right'],{x:0,y:0},{x:1.3,y:.8});await applyAndVerify('bank',['bottom','right']);
 await page.locator('#animate').click();await page.waitForFunction(()=>billiardsTourBridge.capture().state.pocketedLog.includes(1),{},{timeout:30000});
 await set('bank',['bottom','right'],{x:0,y:0},{x:1.3,y:.8},undefined,6,{follow:1,sideSpin:.26});await applyAndVerify('bank',['bottom','right']);
 await set('bank',['bottom','right','top'],{x:0,y:1.016},{x:1.3,y:.8});await applyAndVerify('bank',['bottom','right','top']);
 await set('bank',['bottom','top','bottom','top'],{x:2.032,y:1.016},{x:.3,y:.5},{x:.229,y:.312},6,{muRoll:.002,railRest:1,railTang:1});const four=await applyAndVerify('bank',['bottom','top','bottom','top']);if(four)assert.equal(four.scratch,(await page.evaluate(()=>billiardsTourBridge.predict())).pocketed.includes(0));if(four?.scratch)assert.match(await page.locator('#bankKickRouteStatus').innerText(),/scratch/i);
 await set('kick',['bottom'],{x:2.032,y:0},{x:1.3,y:.4});await applyAndVerify('kick',['bottom']);
 const kicks=[[{x:1.0609298357,y:.6928765768},{x:.8675562404,y:.6418211887}],[{x:1.3324658513,y:.4831880186},{x:1.1658567895,y:.3725470654}],[{x:.3388150444,y:.2196625482},{x:.1621589740,y:.3134315878}],[{x:.5106782124,y:.6545010524},{x:.6604397466,y:.7870585225}]];
 for(let n=1;n<=4;n++){const rails=['bottom','right','top','left'].slice(0,n);await set('kick',rails,kicks[n-1][1],kicks[n-1][0],{x:1.3,y:.65});await applyAndVerify('kick',rails);}
 await set('bank',['bottom','right'],{x:0,y:0},{x:1.3,y:.8},undefined,1.5);const suggested=await solved(2);assert(suggested.shotSpeed>1.5);assert.equal((await state()).speed,1.5,'Planning never silently changes cue speed');await applyAndVerify('bank',['bottom','right']);
 }
 if(!mobile){
 await set(null,[],null,{x:1.3,y:.8});
 const flatTap=async q=>{const p=await page.evaluate(q=>{const b=billiardsTourBridge.feltBounds(),r=document.querySelector('#stageWrap').getBoundingClientRect(),s=billiardsTourBridge.capture().state;return {x:r.left+b.left+q.x/s.tableL*b.width,y:r.top+b.top+q.y/s.tableW*b.height};},q);await page.mouse.click(p.x,p.y);};
 await page.locator('#bankToolToggle').click();assert.match(await page.locator('#bankKickTarget').getAttribute('class'),/next/);assert(await page.locator('#bankKickCalculate').isDisabled());await flatTap({x:.01,y:.01});assert.match(await page.locator('[data-bank-rail="0"]').getAttribute('class'),/next/);await flatTap({x:.65,y:1.026});assert.match(await page.locator('#bankKickCalculate').getAttribute('class'),/ready/);assert.match(await page.locator('[data-bank-rail="1"]').getAttribute('class'),/next/);await flatTap({x:2.042,y:.5});await flatTap({x:1.3,y:.8});assert.equal((await state()).bankKick.solution,null);await page.locator('#bankKickCalculate').click();await solved(2);await page.screenshot({path:'/tmp/route-steps-2d.png'});assert.deepEqual((await state()).bankKick.rails,['bottom','right']);
 }
 // Real mouse/touch taps in 3D share the ordered-selection flow with 2D.
 await set(null,[],null,{x:1.3,y:.8});if(mobile)await page.locator('#phoneControls').click();await page.locator('#table3DToggle').click();await page.waitForFunction(()=>Billiards3D.active);await page.waitForTimeout(250);
 async function tool(id){if(await page.locator('#phoneControls').getAttribute('aria-expanded')!=='true')await page.locator('#phoneControls').click();await page.locator('#'+id).click();}
 async function tap(q,height=0){const p=await page.evaluate(({q,height})=>Billiards3D.project(q,height),{q,height});if(mobile)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);}
 await tool('bankToolToggle');await tap({x:0,y:0});assert.equal((await state()).bankKick.phase,'rail');
 await tap({x:.6,y:1.056},.035);await tap({x:2.07,y:.5},.035);assert.deepEqual((await state()).bankKick.rails,['bottom','right']);await tap({x:1.3,y:.8},.028575);assert.equal((await state()).bankKick.solution,null);await page.locator('#bankKickCalculate').click();await solved(2);assert.equal((await state()).bankKick.phase,null);assert.equal((await state()).bankKick.ballId,1);
 assert(await page.locator('#bankKickRoutePanel').isVisible());await page.screenshot({path:'/tmp/route-steps-'+(mobile?'phone':'desktop')+'.png'});await page.locator('[data-bank-rail="1"]').click();assert.equal((await state()).bankKick.phase,'editRail');await tap({x:-.04,y:.5},.035);assert.deepEqual((await state()).bankKick.rails,['bottom','left']);assert.equal((await state()).bankKick.solution,null);assert.equal((await state()).bankKick.requested,false);await page.locator('#bankKickClose').click();assert.equal((await state()).bankKick.mode,null);
 assert.deepEqual(errors,[]);console.log((mobile?'Phone touch':'Desktop mouse')+': ordered 3D rail/ball selection, undo rail and close passed'+(!mobile?'; full cue-to-object physics, executed bank, 1–4 rail requests with practical limits, spin and applied shot setup passed.':'.'));await context.close();
}
}finally{await browser.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1});
