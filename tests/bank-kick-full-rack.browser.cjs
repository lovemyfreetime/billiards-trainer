const assert=require('node:assert/strict'),cp=require('node:child_process'),{chromium}=require('playwright');
// Reconstructed from the reported 11-ball bank screenshot. Keep every visible
// object ball; a two-ball-only regression would miss the original time limit.
const pixels=[[0,497,837],[1,1268,655],[2,1354,619],[3,719,725],[4,366,839],[5,396,917],[6,1213,890],[7,981,619],[8,1147,630],[10,996,919],[11,551,876],[12,1395,419],[13,1124,556],[14,878,851],[15,1329,493]];
(async()=>{
 const server=cp.spawn(process.execPath,['tests/range-server.cjs','8832']);await new Promise(r=>server.stdout.once('data',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'],...(process.env.LIVE_URL?{proxy:{server:process.env.HTTPS_PROXY}}:{})});
 try{
  for(const mobile of [false,true].filter(mobile=>!process.env.BANK_RACK_CASE||process.env.BANK_RACK_CASE===(mobile?'phone':'desktop'))){
   const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1366,height:900},isMobile:mobile,hasTouch:mobile,ignoreHTTPSErrors:true,serviceWorkers:'block'});
   await context.addInitScript(()=>{window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}};});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.LIVE_URL||'http://127.0.0.1:8832/?train=1');await page.waitForFunction(()=>window.billiardsTourBridge);
   async function restore(blocked=false){await page.evaluate(({pixels,blocked})=>{
    const snap=billiardsTourBridge.capture(),L=2.54,W=1.27,point=(x,y)=>({x:(x-50)/1395*L,y:(y-277)/694*W});
    const balls=pixels.map(([id,x,y])=>({id,n:id===0?'CB':String(id),...point(x,y),active:true}));
    if(blocked){const cb=balls[0],ob=balls.find(b=>b.id===11);balls.push({id:9,n:'9',x:(cb.x+ob.x)/2,y:(cb.y+ob.y)/2,active:true});}
    Object.assign(snap.state,{tableL:L,tableW:W,ballR:.028575,muRoll:.01,muSlide:.25,activeShot:1,shot2Enabled:false,speed:4.61,follow:0,sideSpin:0,cueElevationDeg:3,airbornePhysics:false,freeAim:point(543,846),balls,bankKick:{mode:'bank',phase:null,zero:{x:L/2,y:0},rails:['bottom'],ballId:11,requested:false,routeVersion:2}});billiardsTourBridge.restore(snap);
   },{pixels,blocked});}
   await restore();const aligned=await page.evaluate(()=>billiardsTourBridge.predict());assert(aligned.pocketed.includes(11),'The manually aligned screenshot bank is valid');
   const cdp=await context.newCDPSession(page);if(mobile)await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
   const start=Date.now();await page.locator('#bankKickCalculate').click();await page.waitForFunction(()=>document.querySelector('#bankKickCalculate').getAttribute('aria-busy')==='false',{},{timeout:45000});const elapsed=Date.now()-start;
   const plan=await page.evaluate(()=>billiardsTourBridge.capture().state.bankKick.solution);console.log(mobile?'Slow phone':'Desktop','search',elapsed,plan&&{speed:plan.shotSpeed,reserve:plan.pocketReserveDiamonds});assert(plan,'Full-rack one-rail bank must complete before its time limit');assert(elapsed<(mobile?35000:15000),'Avoid the original near-30-second desktop search');assert(plan.pocketReserveDiamonds>=.5&&plan.pocketReserveDiamonds<=(mobile?1.5:1),'A slower device can retain its nearest verified pocket-pace result at the time limit');
   await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});await page.locator('#bankKickUseSpeed').click();
   const prediction=await page.evaluate(()=>billiardsTourBridge.predict()),state=await page.evaluate(()=>billiardsTourBridge.capture().state);assert.equal(state.balls.length,15,'All blockers remain on the real table');assert.equal(prediction.firstBallContact.objId,11);assert(prediction.pocketed.includes(11));assert(!prediction.pocketed.includes(0));assert.deepEqual(prediction.pocketEvents.find(e=>e.id===11),plan.verifiedPocket,'Accepted guide matches the complete real shot');assert.deepEqual(prediction.railEvents.filter(e=>e.id===11&&e.t<plan.verifiedPocket.t).map(e=>e.rail),['bottom rail']);
   await page.screenshot({path:'/tmp/full-rack-bank-'+(mobile?'phone':'desktop')+'.png'});
   if(!mobile){
    await page.locator('#animate').click();await page.waitForFunction(()=>billiardsTourBridge.capture().state.pocketedLog.includes(11),{},{timeout:30000});await page.waitForFunction(()=>!billiardsTourBridge.snapshot().busy,{},{timeout:30000});
    await restore(true);assert.equal((await page.evaluate(()=>billiardsTourBridge.predict())).firstBallContact.objId,9,'The added blocker must intercept the shot');
    await page.locator('#bankKickCalculate').click();await page.waitForFunction(()=>document.querySelector('#bankKickCalculate').getAttribute('aria-busy')==='false',{},{timeout:45000});assert.equal(await page.evaluate(()=>billiardsTourBridge.capture().state.bankKick.solution),null,'Fast preliminary screening must never accept a shot through a blocker');
   }
   assert.deepEqual(errors,[]);console.log((mobile?'Phone at 4× CPU slowdown':'Desktop')+': full-rack 11-ball bank in '+elapsed+' ms, '+plan.shotSpeed.toFixed(2)+' m/s, '+plan.pocketReserveDiamonds.toFixed(2)+' diamond reserve; full-scene pot verified'+(!mobile?', actual execution and blocker rejection passed.':'.'));await context.close();
  }
 }finally{await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
