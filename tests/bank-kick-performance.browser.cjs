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
 await set('bank',rails,target,ball);
 await page.waitForTimeout(250);assert.equal((await state()).bankKick.solution,null,'Restore/draw never starts a search');assert.equal(await page.locator('#bankKickCalculate').getAttribute('aria-busy'),'false');
 await page.evaluate(()=>{window.searchBeats=0;window.searchMaxGap=0;window.searchGaps=[];const epoch=performance.now();let last=epoch;window.searchTicker=setInterval(()=>{const now=performance.now();searchMaxGap=Math.max(searchMaxGap,now-last);if(now-last>150)searchGaps.push({at:now-epoch,gap:now-last});last=now;searchBeats++;},40);});
 await page.locator('#bankKickCalculate').click();await page.waitForTimeout(150);
 assert.equal(await page.locator('#bankKickCalculate').getAttribute('aria-busy'),'true');
 await page.evaluate(()=>{const e=document.querySelector('#speed');e.value='.8';e.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.equal((await state()).speed,.8,'Controls edit live state during a search');
 await page.waitForFunction(()=>document.querySelector('#bankKickCalculate').getAttribute('aria-busy')==='false'&&document.querySelector('#bankKickSpeedOutput').textContent!=='—',{},{timeout:60000});const plan=(await state()).bankKick.solution;assert.equal(await page.locator('#bankKickCalculate').getAttribute('aria-busy'),'false');assert(plan.pocketReserveDiamonds>=.5&&plan.pocketReserveDiamonds<=1.1);assert(Number.isFinite(plan.shotDiamonds));assert.equal(await page.locator('#bankKickSpeedDiamonds').innerText(),plan.shotDiamonds.toFixed(1)+' ♦');assert.notEqual(await page.locator('#bankKickSpeedDiamonds').evaluate(e=>getComputedStyle(e).color),await page.locator('#bankKickSpeedValue').evaluate(e=>getComputedStyle(e).color));
 const timing=await page.evaluate(()=>{clearInterval(searchTicker);return {beats:searchBeats,maxGap:searchMaxGap,gaps:searchGaps};});console.log('Search responsiveness:',timing,'batches',plan.searchDiagnostics);assert(timing.beats>5);assert(plan.searchDiagnostics.maxSliceMs<100,'Each search batch yields promptly rather than blocking for the whole calculation');
 await page.evaluate(()=>{window.busyReruns=0;window.searchObserver=new MutationObserver(()=>{if(document.querySelector('#bankKickCalculate').getAttribute('aria-busy')==='true')busyReruns++;});searchObserver.observe(document.querySelector('#bankKickCalculate'),{attributes:true,attributeFilter:['aria-busy']});for(const [id,value] of [['speed','5'],['follow','1'],['sideSpin','-1']]){const e=document.getElementById(id);e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));}});
 await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>busyReruns),0,'Shot adjustments must not restart calculation');assert.equal((await state()).bankKick.solution.angle,plan.angle);assert.equal((await state()).speed,5);
 await page.locator('#bankKickUseSpeed').click();await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>busyReruns),0,'Use setup must not restart calculation');assert.deepEqual((await page.evaluate(()=>billiardsTourBridge.predict())).pocketEvents.find(e=>e.id===1),plan.verifiedPocket);
 await page.locator('#bankKickCalculate').click();await page.waitForTimeout(100);assert.equal(await page.locator('#bankKickCalculate').innerText(),'Cancel');await page.locator('#bankKickCalculate').click();await page.waitForTimeout(250);assert.equal(await page.locator('#bankKickCalculate').getAttribute('aria-busy'),'false');assert.equal((await state()).bankKick.solution,null,'Cancelled jobs must not commit a stale result');
 await page.locator('#bankKickCalculate').click();await page.waitForTimeout(100);await page.locator('#bankKickClose').click();await page.waitForTimeout(250);assert.equal((await state()).bankKick.mode,null);assert.equal(await page.locator('#bankKickCalculate').getAttribute('aria-busy'),'false');
 assert.deepEqual(errors,[]);console.log('Bank/Kick: explicit single-run calculation, responsive controls, no reruns on edits/apply, cancel/close and gentle verified pocket arrival passed.');await context.close();
}
}finally{await browser.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1});
