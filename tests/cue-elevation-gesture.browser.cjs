'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),{chromium}=require('playwright');
const out='test-results/ball-controls';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const server=cp.spawn(process.execPath,['tests/range-server.cjs','8831']);await new Promise(r=>server.stdout.once('data',r));let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage']});
  for(const touch of [false,true]){
   const context=await browser.newContext({viewport:{width:touch?1024:1600,height:900},hasTouch:touch,serviceWorkers:'block'});
   await context.addInitScript(()=>{window.BilliardsWindowsHostAvailable=window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}};});
   const page=await context.newPage(),errors=[];page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
   const cdp=touch?await context.newCDPSession(page):null;
   const start=async p=>{if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});else{await page.mouse.move(p.x,p.y);await page.mouse.down();}};
   const move=async p=>{if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[p]});else await page.mouse.move(p.x,p.y);};
   const end=async(cancel=false)=>{if(touch)await cdp.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});else await page.mouse.up();await page.waitForTimeout(30);};
   const state=()=>page.evaluate(()=>billiardsTourBridge.capture().state);
   const angle=async which=>{const s=await state();return which===2?s.shot2.cueElevationDeg:s.cueElevationDeg;};
   const setup=async(which=1,airborne=false,elevation=3)=>{
    await page.evaluate(({which,airborne,elevation})=>{const snap=billiardsTourBridge.capture();Object.assign(snap.state,{tableL:2.54,tableW:1.27,balls:[{id:0,n:'CB',x:.7,y:.635,active:true}],freeAim:{x:1.7,y:.635},showCueVisuals:true,showCueStick:true,showShot1:true,showShot2:true,shot2Enabled:which===2,activeShot:which,airbornePhysics:airborne,cueElevationDeg:elevation,follow:0,sideSpin:0,speed:1.5,shot2:{x:1.2,y:.7,freeAim:{x:2,y:.7},cueElevationDeg:elevation,follow:0,sideSpin:0,speed:1.5}});billiardsTourBridge.restore(snap);},{which,airborne,elevation});
    if(await page.locator('#table3DDrawer').isVisible()&&await page.locator('#table3DDrawer').getAttribute('aria-expanded')!=='true')await page.locator('#table3DDrawer').click();
    await page.locator('#cueElevationView'+which).scrollIntoViewIfNeeded();
   };
   // Start on the visible shaft, then change its angle around the tip without a grab jump.
   const points=which=>page.locator('#cueElevationView'+which).evaluate(node=>{const g=node.cueGeometry,r=node.getBoundingClientRect(),f=.72,dx=(g.buttX-g.tipX)*f,dy=(g.buttY-g.tipY)*f;return {start:{x:r.left+node.clientLeft+g.tipX+dx,y:r.top+node.clientTop+g.tipY+dy},pivot:{x:r.left+node.clientLeft+g.tipX,y:r.top+node.clientTop+g.tipY},dx,dy};});
   const turn=async(which,delta,cancel=false)=>{const p=await points(which),a=delta*Math.PI/180;await start(p.start);const before=await angle(which);const target={x:p.pivot.x+p.dx*Math.cos(a)-p.dy*Math.sin(a),y:p.pivot.y-p.dx*Math.sin(a)+p.dy*Math.cos(a)};for(let i=1;i<=4;i++)await move({x:p.start.x+(target.x-p.start.x)*i/4,y:p.start.y+(target.y-p.start.y)*i/4});await end(cancel);return {before,after:await angle(which)};};
   await page.goto('http://127.0.0.1:8831/?train=1');await page.waitForFunction(()=>window.billiardsCueSetup&&window.billiardsMenuReady);
   for(const mode of ['2d','3d']){
    if(mode==='3d'){await page.locator('#table3DToggle').click();await page.waitForFunction(()=>Billiards3D.active);}
    await setup();const before=await state(),camera=mode==='3d'?await page.evaluate(()=>Billiards3D.camera()):null;
    let result=await turn(1,8);assert.equal(result.before,3,'Grabbing does not jump');assert(Math.abs(result.after-11)<.3,'Dragging shaft upward raises elevation '+JSON.stringify(result));
    result=await turn(1,-6);assert(Math.abs(result.after-5)<.3,'Dragging downward lowers elevation');
    const after=await state();for(const key of ['balls','speed','follow','sideSpin','freeAim'])assert.deepEqual(after[key],before[key],key+' unchanged');
    if(camera)assert.deepEqual(await page.evaluate(()=>Billiards3D.camera()),camera,'Cue drag leaves camera unchanged');
    assert.equal(await page.locator('#elevNumber').inputValue(),(await angle(1)).toFixed(1));
    await page.evaluate(()=>document.getElementById('undoAction').click());assert(Math.abs(await angle(1)-11)<.3,'One drag is one undo action');
    await page.evaluate(()=>document.getElementById('redoAction').click());assert(Math.abs(await angle(1)-5)<.3,'Drag can be redone');
    await turn(1,60);assert.equal(await angle(1),15,'Normal elevation limit');
    await turn(1,-60);assert.equal(await angle(1),0,'Lower limit');
    await setup(2,true,20);result=await turn(2,12);assert(Math.abs(result.after-32)<.3,'Shot 2 elevation is independent');assert.equal(await angle(1),20);
    await turn(2,60);assert.equal(await angle(2),70,'Jump / Massé elevation limit');
    await setup(1,true,20);await turn(1,5,touch);const stopped=await angle(1);await move({x:30,y:30});assert.equal(await angle(1),stopped,'Released/cancelled drag stops');
    const face=page.locator('#cueElevationView1');await face.scrollIntoViewIfNeeded();await face.screenshot({path:out+'/'+(touch?'touch':'mouse')+'-'+mode+'-elevation.png'});
   }
   await setup();const saved=await angle(1);await page.reload();await page.waitForFunction(()=>window.billiardsCueSetup);assert.equal(await angle(1),saved,'Elevation persists after reload');
   assert.deepEqual(errors,[]);await context.close();console.log((touch?'Touch':'Mouse')+': 2D/3D elevation drag, no grab jump, both shots, normal/jump limits, undo/redo, cancellation and reload passed');
  }
 }finally{await browser?.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
