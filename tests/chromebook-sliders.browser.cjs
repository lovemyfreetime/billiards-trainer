const assert=require('node:assert/strict'),cp=require('node:child_process'),{chromium}=require('playwright');
(async()=>{
 const port=process.env.TEST_PORT||'8803';
 const server=cp.spawn(process.execPath,['tests/range-server.cjs',port]);await new Promise(r=>server.stdout.once('data',r));
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
  const version=await browser.version(),major=Number(version.split('.')[0]);
  for(const spec of [{name:'Chromebook mouse',viewport:{width:1366,height:768}},{name:'Chromebook touch / older browser',viewport:{width:1280,height:720},hasTouch:true,forceLegacy:true}]){
   const legacy=spec.forceLegacy||major<124,uaVersion=spec.forceLegacy?'106.0.5249.0':version;
   const context=await browser.newContext({viewport:spec.viewport,hasTouch:!!spec.hasTouch,userAgent:'Mozilla/5.0 (X11; CrOS x86_64 15117.112.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/'+uaVersion+' Safari/537.36',serviceWorkers:'block'});
   await context.addInitScript(disablePopovers=>{window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}};if(disablePopovers)for(const name of ['showPopover','hidePopover','togglePopover'])Object.defineProperty(HTMLElement.prototype,name,{value:undefined,configurable:true});},!!spec.forceLegacy);
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+port+'/?train=1');await page.waitForFunction(()=>window.billiardsTourBridge&&window.Billiards3D);
   await page.locator('#table3DToggle').click();await page.waitForFunction(()=>Billiards3D.active);assert.match(await page.locator('#tableSpeed1Feel').textContent(),/^\d+\.\d ♦$/,'Diamond feel appears on first entry, before changing speed');await page.locator('#table3DToggle').click();
   await page.evaluate(()=>billiardsTourBridge.apply({balls:[[0,.25,.5],[1,.65,.5]],target:1,pocket:[1,1],speed:2.4},{tableL:2.54,tableW:1.27}));await page.locator('#table3DToggle').click();await page.waitForFunction(()=>Billiards3D.active);
   assert.equal(await page.locator('#appDisplayControl').isVisible(),false,'Trainer has one fullscreen control, including old Chrome');assert.equal(await page.locator('#appDisplayMenu').isVisible(),false,'No empty fullscreen-help overlay');
   const aim=await page.locator('#phoneAimRail').boundingBox(),speed=await page.locator('#phoneSpeedRail').boundingBox(),aimTrack=await page.locator('#aimRoller .rollerTrack').boundingBox(),range=await page.locator('#tableSpeed1').boundingBox(),shoot=await page.locator('[data-trainer-action=animate]').boundingBox();
   assert(aim.height>400&&speed.height>400&&aimTrack.height>300&&range.height>300,'Side rails and their actual tracks stay full height');assert(Math.abs(speed.y+speed.height+12-shoot.y)<1);assert(Math.abs(aim.y+aim.height+12-shoot.y)<1);
   assert.equal(await page.locator('#tableSpeed1').evaluate(e=>getComputedStyle(e).appearance),legacy?'slider-vertical':'auto','Older Chrome uses its native vertical range appearance');
   const camera=await page.evaluate(()=>Billiards3D.camera()),before=Number(await page.locator('#tableSpeed1').inputValue()),x=range.x+range.width/2,y=range.y+range.height*.55;
   if(spec.hasTouch){const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-60}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
   else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y-60,{steps:4});await page.mouse.up();}
   assert(Math.abs(Number(await page.locator('#tableSpeed1').inputValue())-before-.6)<.001,'Dragging upward increases speed');assert.deepEqual(await page.evaluate(()=>Billiards3D.camera()),camera,'Speed adjustment does not move the table');
   await page.locator('#tableSpeed1').focus();const prior=Number(await page.locator('#tableSpeed1').inputValue());await page.keyboard.press('ArrowUp');assert(Number(await page.locator('#tableSpeed1').inputValue())>prior,'Keyboard up also increases speed');
   const menu=page.locator('.experience-menu--train'),toggle=page.locator('#btZenLauncher .experience-toggle');assert.equal(await menu.isVisible(),false,'No stray experience icons when the menu is closed');await toggle.click();assert(await menu.isVisible());assert.equal(await toggle.getAttribute('aria-expanded'),'true');await page.keyboard.press('Escape');assert.equal(await menu.isVisible(),false);
   await page.locator('#phoneControls').click();assert(await page.locator('#trainerUpdateCheck').isVisible(),'Tools provides a direct update check');await page.locator('#analyzePhotoBtn').click();await page.locator('#phonePhotosButton').click();assert(await page.locator('#phonePhotoMenu').isVisible());await page.keyboard.press('Escape');assert.equal(await page.locator('#phonePhotoMenu').isVisible(),false);
   assert.deepEqual(errors,[]);await context.close();console.log(spec.name+' (engine '+version+'): long vertical rails, mouse/touch/keyboard speed and compatible menus passed');
  }
 }finally{await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
