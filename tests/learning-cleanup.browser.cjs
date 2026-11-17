const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),{chromium}=require('playwright');
const dir='test-results/learning-cleanup';fs.mkdirSync(dir,{recursive:true});
(async()=>{const server=cp.spawn(process.execPath,['tests/range-server.cjs','8832']);await new Promise(r=>server.stdout.once('data',r));let browser;
try{browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
for(const [width,height,mobile] of [[2048,1280,false],[1366,768,false],[1024,768,false],[844,390,true]]){
 const context=await browser.newContext({viewport:{width,height},screen:{width,height},hasTouch:true,isMobile:mobile,serviceWorkers:'block',userAgent:mobile?'Mozilla/5.0 (Linux; Android 16; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36':undefined});
 await context.addInitScript(()=>{window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}};});
 const page=await context.newPage(),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 try{await page.goto('http://127.0.0.1:8832/?train=1');await page.waitForFunction(()=>window.billiardsPoolGuide&&window.billiardsGetStartedTour&&window.billiardsAnalyzeGuide);
 assert.equal(await page.locator('#btg-pool-explore,#btg-analyze-explore').count(),0,'Explorer buttons are removed from both pages');
 await page.evaluate(()=>{billiardsPoolGuide.setExploring(true);billiardsAnalyzeGuide.setExploring(true);});
 assert.equal(await page.evaluate(()=>billiardsPoolGuide.getState().exploring||billiardsAnalyzeGuide.getState().exploring||document.body.classList.contains('btg-inspection')),false,'Old Explorer activation cannot intercept controls');
 const tour=await page.evaluate(()=>billiardsGetStartedTour.steps);assert.equal(tour.length,7);assert(!tour.some(t=>/explorer/i.test(t.text)||t.topicId==='get-started-explore'));
 assert.equal(await page.evaluate(()=>billiardsPoolAudioMap.topics.some(t=>t.id==='get-started-explore'||t.id==='main-main-explorer-mode')),false);
 await page.locator('#phoneControls').click();await page.locator('#btg-pool-guide').click();await page.waitForFunction(()=>billiardsPoolGuide.getState().enabled);await page.evaluate(()=>billiardsPoolGuide.pause());
 assert(await page.locator('#bt-guide-pool-root [data-action="play-pause"]').isVisible(),'Guide player remains available');
 await page.locator('#btg-pool-start').click();await page.waitForFunction(()=>billiardsPoolGuide.getState().category==='start');await page.evaluate(()=>{billiardsPoolGuide.pause();billiardsGetStartedTour.pause();});
 assert.equal(await page.locator('#bt-guide-pool-root select option:not([value=""])').count(),7,'Get Started exposes the seven retained lessons');
 await page.evaluate(()=>billiardsPoolGuide.setEnabled(false));
 const speed=await page.locator('#speedNumber').inputValue();await page.locator('#speedPlus').click();assert(Number(await page.locator('#speedNumber').inputValue())>Number(speed),'Trainer controls still operate');await page.locator('#phoneControls').click();
 for(const mode of ['2d','3d']){
  if(await page.evaluate(()=>Billiards3D.active)!==(mode==='3d')){await page.locator('#table3DToggle').click();await page.waitForFunction(active=>Billiards3D.active===active,mode==='3d');}
  for(const open of [false,true]){
   if(await page.locator('body').evaluate(e=>e.classList.contains('phone-controls-open'))!==open)await page.locator('#phoneControls').click();
   await page.evaluate(()=>{const s=billiardsTourBridge.capture();Object.assign(s.state,{balls:[{id:0,n:'CB',x:.6,y:.635,active:true},{id:1,n:'1',x:1.2,y:.635,active:true}],activeShot:1,shot2Enabled:false,speed:3,follow:0,sideSpin:0,cueElevationDeg:30,airbornePhysics:true,showPaths:true,freeAim:{x:1.2,y:.635}});billiardsTourBridge.restore(s);});
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const g=await page.evaluate(()=>{const box=s=>document.querySelector(s).getBoundingClientRect().toJSON(),f=document.querySelector('#phoneFlightCanvas');return{visible:getComputedStyle(f).display!=='none',profile:f.getBoundingClientRect().toJSON(),picker:box('#workspace-picker > summary'),actions:box('#workspaceTopActions'),speed:box('#phoneSpeedRail')};});
   if(g.visible){assert(g.profile.x>=g.picker.right+10,'Jump strip clears picker');assert(g.profile.right<=Math.min(g.actions.x,g.speed.x)-10,'Jump strip clears corner actions and speed');assert(g.profile.width>=120,'Jump plot retains usable width');}
   else assert(open&&width===1024,'Only narrow open-panel view uses the existing in-table profile');
   await page.screenshot({path:dir+'/'+width+'x'+height+'-'+mode+'-'+(open?'open':'closed')+'.png'});
  }
 }
 await page.evaluate(()=>billiardsPoolGuide.setEnabled(false));
 await page.locator('#workspace-picker > summary').click();await page.locator('#workspace-setup > summary').click();await page.locator('#analyzePhotoBtn').click();await page.waitForFunction(()=>photoAnalyzerModal.classList.contains('open'));
 assert(await page.locator('#photoWalkthroughBtn').isVisible(),'Analyze Walkthrough remains reachable');assert.equal(await page.locator('#btg-analyze-explore').count(),0);assert.deepEqual(errors,[]);
 console.log(width+'x'+height+': Explorer absent/inactive; Guide and seven-step Get Started work; speed input works; Jump clears corner controls in 2D/3D with menus open/closed; Analyze opens without errors');
 }catch(e){await page.screenshot({path:dir+'/'+width+'-failure.png'}).catch(()=>{});throw e;}finally{await context.close();}
}
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1});
