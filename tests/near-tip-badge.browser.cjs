'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),{chromium}=require('playwright');
(async()=>{const server=cp.spawn(process.execPath,['tests/range-server.cjs','8836']);await new Promise(r=>server.stdout.once('data',r));let browser;
try{browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage']});
for(const [width,height,mobile]of [[1366,900,false],[1024,768,true],[844,390,true]]){
 const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:mobile,serviceWorkers:'block'});await context.addInitScript(()=>{window.BilliardsWindowsHostAvailable=window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}};});
 const page=await context.newPage(),errors=[];page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8836/?train=1');await page.waitForFunction(()=>window.billiardsMenuReady);
 await page.evaluate(()=>{const s=billiardsTourBridge.capture();Object.assign(s.state,{guidanceEnabled:false,balls:[{id:0,n:'CB',x:.6,y:.6,active:true}],freeAim:{x:1.5,y:.6},showTipBadge:true,showCueVisuals1:true,showCueVisuals2:true,shot2Enabled:true,shot2Initialized:true,activeShot:1,shot2:{x:1.3,y:.8,freeAim:{x:2,y:.8},follow:0,sideSpin:0,speed:1.5,cueElevationDeg:3}});billiardsTourBridge.restore(s);});
 for(const mode of ['2d','3d']){
  if(mode==='3d'){await page.locator('#table3DToggle').click();await page.waitForFunction(()=>Billiards3D.active&&!Billiards3D.camera().transitioning);}
  for(const which of [1,2]){const badge=page.locator('#nearTipBadge'+which);await badge.waitFor({state:'visible'});const box=await badge.boundingBox();assert(box.x>=0&&box.y>=0&&box.x+box.width<=width&&box.y+box.height<=height,'Badge fits viewport');}
  assert(await page.locator('#phoneTip1').isVisible(),'Bottom control is retained');
  const before=await page.evaluate(()=>billiardsTourBridge.capture().state);const box=await page.locator('#nearTipBadge1').boundingBox();
  await page.touchscreen.tap(box.x+40,box.y+23);const after=await page.evaluate(()=>billiardsTourBridge.capture().state);assert(after.follow>0&&after.sideSpin>0,'Near badge adjusts contact');assert.deepEqual(after.balls,before.balls);assert.deepEqual(after.freeAim,before.freeAim);
  await page.evaluate(()=>{const n=document.getElementById('showTipBadge');n.checked=false;n.dispatchEvent(new Event('change',{bubbles:true}));});await page.locator('#nearTipBadge1').waitFor({state:'hidden'});assert(await page.locator('#nearTipBadge2').isHidden());assert(await page.locator('#phoneTip1').isVisible());
  await page.evaluate(()=>{const n=document.getElementById('showTipBadge');n.checked=true;n.dispatchEvent(new Event('change',{bubbles:true}));});await page.locator('#nearTipBadge1').waitFor({state:'visible'});
  fs.mkdirSync('test-results/ball-controls',{recursive:true});await page.locator('#nearTipBadge1').screenshot({path:`test-results/ball-controls/near-tip-${width}-${mode}.png`});
 }
 await page.reload();await page.waitForFunction(()=>window.billiardsMenuReady);await page.locator('#nearTipBadge1').waitFor({state:'visible'});assert.deepEqual(errors,[]);console.log(`${width}x${height}: both badges, toggle, touch contact, preserved aim/balls/bottom control, reload and 2D/3D passed`);await context.close();
}
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
