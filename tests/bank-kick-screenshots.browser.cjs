const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),{chromium}=require('playwright');
const L=2.032,W=1.016,point=(x,y)=>({x:(x-53)/1428*L,y:(y-282)/715*W});
// Approximate table positions reconstructed from the user's November 13 screenshots.
const layouts=[
 {name:'cue-pocket-right',mode:'kick',cue:point(145,565),target:{x:0,y:W},rails:['right'],id:0},
 {name:'bank-short-top',mode:'bank',cue:point(472,935),ball:point(461,770),target:{x:0,y:W},rails:['top'],id:9},
 {name:'bank-long-top',mode:'bank',cue:point(507,734),ball:point(470,381),target:{x:0,y:W},rails:['top'],id:9},
 {name:'bank-left-across',mode:'bank',cue:point(370,899),ball:point(216,814),target:{x:L,y:0},rails:['left'],id:9},
 {name:'kick-top-pocket',mode:'kick',cue:point(370,899),ball:point(216,814),target:{x:0,y:W},rails:['top'],id:9},
 {name:'bank-two-rails',mode:'bank',cue:point(370,899),ball:point(216,814),target:{x:L,y:W},rails:['left','top'],id:9},
 {name:'cue-pocket-left',mode:'kick',cue:{x:L-point(145,565).x,y:point(145,565).y},target:{x:L,y:W},rails:['left'],id:0},
 {name:'cue-pocket-top',mode:'kick',cue:{x:.7,y:.7},target:{x:L,y:W},rails:['top'],id:0},
 {name:'cue-pocket-bottom',mode:'kick',cue:{x:.7,y:.3},target:{x:L,y:0},rails:['bottom'],id:0},
 {name:'kick-contact',mode:'kick',cue:{x:.4,y:.6},ball:{x:1.4,y:.4},target:{x:1.4,y:.4},rails:['bottom'],id:9}
];
(async()=>{
 const server=cp.spawn(process.execPath,['tests/range-server.cjs','8860']);await new Promise(r=>server.stdout.once('data',r));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  fs.mkdirSync('test-results/kick-bank',{recursive:true});
  for(const mobile of [false,true]){
   const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile,serviceWorkers:'block'});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8860/?train=1');await page.waitForFunction(()=>window.billiardsTourBridge&&window.Billiards3D);
   const base=await page.evaluate(()=>billiardsTourBridge.capture());
   const read=()=>page.evaluate(()=>billiardsTourBridge.capture().state);
   const selected=mobile?layouts.filter(c=>['bank-left-across','cue-pocket-right','kick-top-pocket'].includes(c.name)):layouts;
   for(const c of selected){
    await page.evaluate(({base,c,L,W})=>{const snap=structuredClone(base);Object.assign(snap.state,{tableL:L,tableW:W,ballR:.028575,muRoll:.01,muSlide:.25,activeShot:1,shot2Enabled:false,speed:1.5,follow:.5,sideSpin:-.5,cueElevationDeg:50,airbornePhysics:true,freeAim:{x:L,y:W/2},angleLock:false,autoGhostLock:false,ghostLock:null,showShotLine:false,showPaths:false,showShot1:true,balls:[{id:0,n:'CB',...c.cue,active:true},...(c.ball?[{id:9,n:'9',...c.ball,active:true}]:[])],bankKick:{mode:c.mode,phase:null,zero:c.target,rails:c.rails,railName:c.rails[0],ballId:c.id,requested:false,routeVersion:2}});billiardsTourBridge.restore(snap);},{base,c,L,W});
    if(mobile&&!await page.evaluate(()=>Billiards3D.active)){if(await page.locator('#phoneControls').getAttribute('aria-expanded')!=='true')await page.locator('#phoneControls').click();await page.locator('#table3DToggle').click();await page.waitForFunction(()=>Billiards3D.active);}
    const before=await read(),started=Date.now();await page.locator('#bankKickCalculate').click();
    await page.waitForFunction(()=>document.querySelector('#bankKickCalculate').getAttribute('aria-busy')==='false',{},{timeout:35000});
    const sol=(await read()).bankKick.solution,elapsed=Date.now()-started;
    assert(sol?.reached,c.name+': '+await page.locator('#bankKickRouteStatus').textContent());
    assert(elapsed<20000,c.name+' ordinary route should not need the 30 second deadline');
    assert.equal((await read()).speed,before.speed,'Calculation does not alter current controls');
    assert.deepEqual(sol.bounces.map(b=>b.rail.name),c.rails);assert(!sol.scratch);
    await page.evaluate(()=>{window.reruns=0;window.bankObserver?.disconnect();window.bankObserver=new MutationObserver(()=>{if(document.querySelector('#bankKickCalculate').getAttribute('aria-busy')==='true')window.reruns++;});bankObserver.observe(document.querySelector('#bankKickCalculate'),{attributes:true,attributeFilter:['aria-busy']});});
    await page.locator('#bankKickUseSpeed').click();
    const applied=await read(),prediction=await page.evaluate(()=>billiardsTourBridge.predict());
    assert.equal(applied.speed,sol.shotSpeed);assert.equal(applied.follow,sol.shotFollow);assert.equal(applied.sideSpin,sol.shotSide);assert.deepEqual(applied.freeAim,sol.aim);
    assert(applied.showShotLine&&applied.showPaths,'Applying a route exposes the ordinary aim and preview');assert(!applied.angleLock&&!applied.autoGhostLock&&!applied.airbornePhysics);
    assert.deepEqual(applied.balls,before.balls,'Apply preserves every ball position');
    assert.equal(await page.locator('#bankKickUseSpeed').innerText(),'Ready');assert(await page.locator('#bankKickUseSpeed').isDisabled());assert(await page.locator('#bankKickCalculate').isHidden());assert.match(await page.locator('#bankKickRouteStatus').innerText(),/Setup applied/);
    if(sol.verifiedPocket)assert.deepEqual(prediction.pocketEvents.find(e=>e.id===c.id),sol.verifiedPocket,'Actual shot equals calculated pocket result');
    if(c.id===0)assert(sol.intentionalCuePocket&&prediction.pocketed.includes(0));else{assert.equal(prediction.firstBallContact.objId,c.id);assert(!prediction.pocketed.includes(0));}
    assert.equal(await page.evaluate(()=>reruns),0,'Use setup cannot restart the search');
    if(['bank-left-across','cue-pocket-right'].includes(c.name)){
     await page.screenshot({path:'test-results/kick-bank/'+c.name+(mobile?'-phone':'-desktop')+'.png'});
     // Use the same button the customer uses, then verify the completed shot and Undo.
     if(mobile&&await page.locator('#phoneControls').getAttribute('aria-expanded')!=='true')await page.locator('#phoneControls').click();
     await page.locator('#animate').click();await page.waitForFunction(()=>billiardsPlayback.state().running);await page.waitForFunction(()=>!billiardsPlayback.state().running,{},{timeout:30000});
     const ending=await read();
     if(c.id===0){const cue=ending.balls.find(b=>b.id===0);assert.equal(cue.x,before.balls[0].x);assert.equal(cue.y,before.balls[0].y);assert(await page.locator('#undoShot').isEnabled(),'Executed cue drill enters shot history');}
     else assert(!ending.balls.some(b=>b.id===c.id),'Execute Shot removes the pocketed object ball');
     await page.locator('#undoShot').click();
     assert.deepEqual((await read()).balls.map(({id,x,y,active})=>({id,x,y,active})),before.balls.map(({id,x,y,active})=>({id,x,y,active})),'Undo restores the exact layout');
    }
    console.log(JSON.stringify({layout:c.name,mode:mobile?'phone touch 3D':'desktop 2D',elapsed,shotSpeed:sol.shotSpeed,follow:sol.shotFollow,side:sol.shotSide,reserve:sol.pocketReserveDiamonds,maxSliceMs:sol.searchDiagnostics.maxSliceMs}));
   }
   assert.deepEqual(errors,[]);await context.close();
  }
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
