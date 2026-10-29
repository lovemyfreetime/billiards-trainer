const assert=require('node:assert/strict'),cp=require('node:child_process'),{chromium}=require('playwright');

(async()=>{
 const server=cp.spawn(process.execPath,['tests/range-server.cjs','8848']);
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const viewport of [{width:1366,height:900},{width:1024,height:768},{width:844,height:390},{width:390,height:844}]){
   const touch=viewport.width<1000,context=await browser.newContext({viewport,hasTouch:touch,serviceWorkers:'block'}),page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.goto((process.env.PHOTO_CORNER_TEST_URL||'http://127.0.0.1:8848/')+'?train=1');
   await page.waitForFunction(()=>window.billiardsWalkthroughBridge&&window.BilliardsCornerSensing?.suggest);
   if(!await page.locator('#analyzePhotoBtn').isVisible())await page.locator('#phoneControls').click();
   await page.locator('#analyzePhotoBtn').click();
   assert.equal(await page.locator('#photoRackType,#photoLightingMode,#photoIdentityMode').count(),0,'Analysis has no settings dropdowns');
   assert.equal(await page.locator('.photoAnalyzerToolbar select').count(),0,'Saved images do not occupy the action row');
   assert.equal(await page.locator('#photoAiModeBtn').isVisible(),false,'Recognition runs automatically');
   const bar=await page.locator('#phoneAnalyzeBar').boundingBox();assert(bar.height<=42,'Only one action row');
   const rows=await page.locator('.photoAnalyzerToolbar button:visible').evaluateAll(buttons=>buttons.map(b=>{const r=b.getBoundingClientRect();return {id:b.id,center:r.y+r.height/2};}));
   assert(Math.max(...rows.map(r=>r.center))-Math.min(...rows.map(r=>r.center))<3,'Toolbar actions share one line: '+JSON.stringify(rows));
   assert.equal(await page.locator('.photoAnalyzerHeader').isVisible(),false);
   await page.locator('#phonePhotosButton').click();assert(await page.locator('#photoArchiveSelect').isVisible());assert(await page.locator('#photoWelcomePlay').isVisible());await page.keyboard.press('Escape');
   const png=await page.evaluate(()=>{
    const canvas=document.createElement('canvas');canvas.width=720;canvas.height=480;const ctx=canvas.getContext('2d');
    ctx.fillStyle='rgb(16,60,41)';ctx.fillRect(0,0,720,480);ctx.fillStyle='rgb(25,155,105)';ctx.fillRect(70,70,581,341);
    return canvas.toDataURL('image/png').split(',')[1];
   });
   await page.locator('#photoFileInput').setInputFiles({name:'manual-corner-starter.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
   await page.locator('#tableCamera [data-action=overlay]').click();await page.locator('#tableCamera [data-action=snap]').click();
   await page.waitForFunction(()=>billiardsWalkthroughBridge.snapshot().imageReady);
   await page.locator('#photoAutoRailsBtn').click();
   const before=await page.evaluate(()=>billiardsWalkthroughBridge.snapshot());
   assert.equal(before.corners.length,4);assert.equal(before.cornersValid,true);assert.equal(before.cornerSensingEvidence.approximate,true);assert.equal(before.cornerSensingEvidence.confidence,null);
   assert.match(await page.locator('#photoAnalyzerStatus').innerText(),/Suggested four corners/);
   assert.equal(await page.locator('#photoAnalyzeNow').isEnabled(),true);assert.equal(before.analysisRevision,0,'Suggesting corners never starts ball analysis');
   const bounds=await page.locator('#photoAnalyzerCanvas').boundingBox(),corner=before.corners[0],x=bounds.x+corner.x/720*bounds.width,y=bounds.y+corner.y/480*bounds.height;
   if(touch){
    const session=await context.newCDPSession(page);
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+12,y:y+12}]});
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
   }else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+12,y+12,{steps:3});await page.mouse.up();}
   const adjusted=await page.evaluate(()=>billiardsWalkthroughBridge.snapshot());
   assert(Math.hypot(adjusted.corners[0].x-corner.x,adjusted.corners[0].y-corner.y)>3,'Suggested corner can be dragged');
   assert.deepEqual(adjusted.corners.slice(1),before.corners.slice(1),'Adjusting one corner preserves the other three');
   await page.evaluate(()=>{BilliardsCornerSensing.suggest=()=>null;});
   await page.locator('#photoAutoRailsBtn').click();
   assert.deepEqual((await page.evaluate(()=>billiardsWalkthroughBridge.snapshot())).corners,adjusted.corners,'No new outline preserves manual corrections');
   assert.match(await page.locator('#photoAnalyzerStatus').innerText(),/No usable table outline/);
   await page.locator('#photoWalkthroughBtn').click();
   await page.locator('#photoWalkthroughNext').click();
   await page.locator('#photoWalkthroughNext').click();
   assert.equal(await page.evaluate(()=>billiardsAnalyzeWalkthrough.getState().id),'orientation');
   await page.locator('#photoWalkthroughNext').click();
   assert.equal(await page.evaluate(()=>billiardsAnalyzeWalkthrough.getState().id),'analyze','Orientation leads directly to automatic recognition');
   await page.locator('#photoWalkthroughStop').click();
   assert.deepEqual(errors,[]);await context.close();
   console.log(viewport.width+'x'+viewport.height+': visible Corner Sensing, four approximate markers, '+(touch?'touch':'mouse')+' correction, no auto-analysis and failure preservation passed.');
  }
 }finally{if(browser)await browser.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
