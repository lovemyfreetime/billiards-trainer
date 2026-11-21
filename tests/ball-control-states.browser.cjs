'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),{chromium}=require('playwright');
const out='test-results/ball-controls';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const server=cp.spawn(process.execPath,['tests/range-server.cjs','8828']);await new Promise(resolve=>server.stdout.once('data',resolve));let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage']});
  for(const spec of [{width:1920,height:1080},{width:1366,height:768},{width:1024,height:768},{width:844,height:390,mobile:true}]){
   const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},hasTouch:!!spec.mobile,isMobile:!!spec.mobile,userAgent:spec.mobile?'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36':undefined,serviceWorkers:'block'});
   await context.addInitScript(()=>{window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}};});
   const page=await context.newPage(),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
   const snapshot=()=>page.evaluate(()=>billiardsTourBridge.capture().state);
   const color=selector=>page.locator(selector).evaluate(node=>getComputedStyle(node).backgroundColor);
   const state=async enabled=>{await page.waitForFunction(value=>document.getElementById('table3DShotOrder').dataset.enabled===String(value),enabled);assert.equal(await page.evaluate(()=>billiardsGuidance.status().enabled),enabled);};
   const power=async enabled=>{await page.locator('#table3DShotOrder').click();await page.locator('#table3DOrderMenu [data-detection='+(enabled?'on':'off')+']').click();await state(enabled);};
   await page.goto('http://127.0.0.1:8828/?train=1');await page.waitForFunction(()=>window.billiardsTourBridge&&window.billiardsGuidance&&window.Billiards3D);
   await page.evaluate(()=>{billiardsTourBridge.apply({id:'ball-control-states',balls:[[0,.25,.5],[1,.65,.5],[2,.75,.25]],target:1,pocket:[1,1],speed:1.5,followPercent:0,sidePercent:0},{tableL:2.54,tableW:1.27});const saved=billiardsTourBridge.capture();saved.state.guidanceEnabled=true;saved.state.guidanceMode='order';billiardsTourBridge.restore(saved);});
   await state(true);const before=await snapshot();await power(false);
   assert.equal(await color('#table3DShotOrder'),'rgb(206, 51, 68)');assert.equal(await color('#table3DOrderMenu [data-detection=off]'),await color('#table3DShotOrder'));
   assert.deepEqual((await snapshot()).balls,before.balls,'Off preserves ball positions');assert.match(await page.locator('#table3DShotOrder').getAttribute('aria-label'),/Off/);
   await page.screenshot({path:out+'/'+spec.width+'-2d-off.png'});
   await page.locator('#table3DOrderMenu [data-order=any]').click();await state(false);assert.equal((await snapshot()).guidanceMode,'any','Choosing a mode does not silently enable detection');
   await page.reload();await page.waitForFunction(()=>window.billiardsGuidance&&window.Billiards3D);await state(false);assert.equal((await snapshot()).guidanceMode,'any','Off and mode survive reload');
   await power(true);await page.locator('#table3DOrderMenu [data-order=order]').click();await state(true);const green=await color('#table3DShotOrder');assert.equal(green,'rgb(61, 213, 109)');
   await page.locator('#table3DToggle').click();await page.waitForFunction(()=>Billiards3D.active);await state(true);
   if(!await page.locator('#table3DLock').isVisible())await page.locator('#phoneTrayToggle').click();
   assert.equal(await page.locator('#table3DLock').getAttribute('aria-checked'),'false');assert.match(await page.locator('#table3DLock').textContent(),/Locked/);
   assert.equal(await color('#table3DLock'),'rgb(206, 51, 68)','Locked is the same stronger red as detection Off');
   assert.equal(await color('#table3DRotate'),green,'Detection uses the existing active green');
   await page.locator('#table3DLock').click();await page.waitForFunction(()=>getComputedStyle(document.getElementById('table3DLock')).backgroundColor==='rgb(61, 213, 109)');assert(await page.evaluate(()=>Billiards3D.locked));assert.match(await page.locator('#table3DLock').textContent(),/Unlocked/);assert.equal(await color('#table3DLock'),green);
   await page.screenshot({path:out+'/'+spec.width+'-3d-on-unlocked.png'});
   await power(false);await page.keyboard.press('Escape');await page.locator('#table3DLock').click();await page.waitForFunction(()=>getComputedStyle(document.getElementById('table3DLock')).backgroundColor==='rgb(206, 51, 68)');assert.equal(await color('#table3DShotOrder'),await color('#table3DLock'));assert.equal(await page.evaluate(()=>Billiards3D.locked),false);
   await page.screenshot({path:out+'/'+spec.width+'-3d-off-locked.png'});
   await page.locator('#table3DToggle').click();await page.waitForFunction(()=>!Billiards3D.active);await state(false);assert.equal((await snapshot()).guidanceMode,'order');
   assert.deepEqual(errors,[]);await context.close();console.log(spec.width+'x'+spec.height+': On/Off behavior, saved mode, 2D/3D continuity, exact shared colors and locking passed');
  }
 }finally{await browser?.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
