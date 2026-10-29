/* Local diagnostic harness. Original photographs and outputs stay outside the public repo. */
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),{chromium}=require('playwright');
(async()=>{
 const input=path.resolve(process.argv[2]),output=path.resolve(process.argv[3]),cases=JSON.parse(fs.readFileSync(input));
 const source=fs.readFileSync(process.env.PHOTO_SOURCE||'index.html','utf8'),C=require('../photo-calibration'),rows=fs.existsSync(output)?JSON.parse(fs.readFileSync(output)):[];
 const done=new Set(rows.map(r=>r.index)),server=cp.spawn(process.execPath,['tests/range-server.cjs',process.env.PORT||'8844']);
 await new Promise(r=>server.stdout.once('data',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 const page=await browser.newPage({viewport:{width:1366,height:1000},serviceWorkers:'block'});
 await page.addInitScript(()=>{window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}};});
 await page.route('**/?train=1',route=>route.fulfill({contentType:'text/html',body:source.replace('    window.billiardsWalkthroughBridge={',`    window.__pvAudit={
 setOptions(input){photoVision.lightingMode=input.lighting||'original';photoVision.rackType=input.rack||'auto';},
 detail(){return {size:{width:photoVision.analysisCanvas.width,height:photoVision.analysisCanvas.height},calibrationH:pvCalibration()?.H,ready:photoAI.ready,engine:photoVision.lastAnalysisEngine,corners:photoVision.corners,detections:photoVision.detections.map(d=>({...d,thumb:undefined,photoBodyKey:undefined,photoBody:undefined}))};},
 setCorners(input){photoVision.regionEnd=input.region?'custom':'full';if(input.region)photoVision.customBounds=input.region;photoVision.corners=input.corners;photoVision.refinements=[];pvCalibrationChanged();},
 raw:()=>photoVision.analysisCanvas.toDataURL('image/jpeg',.92)
 };
    window.billiardsWalkthroughBridge={`)}));
 if(process.env.PHOTO_CORNER)await page.route('**/photo-corner-sensing.js*',route=>route.fulfill({contentType:'application/javascript',body:fs.readFileSync(process.env.PHOTO_CORNER,'utf8')}));
 await page.goto('http://127.0.0.1:'+(process.env.PORT||'8844')+'/?train=1');
 await page.locator('#analyzePhotoBtn').click();
 for(const item of cases){
  if(done.has(item.index))continue;
  const row={index:item.index,path:item.path,name:item.name};
  try{
   const file=path.resolve(path.dirname(input),item.path);
   // Downloads can still be completing when a long batch begins.
   await page.locator('#photoFileInput').setInputFiles(file);
   await page.waitForFunction(()=>billiardsWalkthroughBridge.snapshot().imageReady,{},{timeout:30000});
   await page.locator('#photoAutoRailsBtn').click();
   const auto=await page.evaluate(()=>billiardsWalkthroughBridge.snapshot());
   Object.assign(row,{autoCorners:auto.corners,cornerEvidence:auto.cornerSensingEvidence,autoCornersValid:auto.cornersValid});
   if(item.corners)await page.evaluate(input=>__pvAudit.setCorners(input),{corners:item.corners,region:item.region});
   const corners=await page.evaluate(()=>billiardsWalkthroughBridge.snapshot());
   if(!corners.cornersValid||(!item.corners&&!corners.cornerSensingEvidence)){row.rejectedCorners=true;}
   else if(!process.env.PHOTO_CORNERS_ONLY){
    await page.evaluate(input=>__pvAudit.setOptions(input),{lighting:item.lighting||'original',rack:item.rack||'auto'});
    const before=corners.analysisRevision,start=performance.now();
    await page.locator('#photoAnalyzeNow').click();
    await page.waitForFunction(before=>{const s=billiardsWalkthroughBridge.snapshot();return !s.busy&&(s.analysisRevision>before||s.analysisError);},before,{timeout:180000});
    const snap=await page.evaluate(()=>billiardsWalkthroughBridge.snapshot());
    Object.assign(row,await page.evaluate(()=>__pvAudit.detail()),{milliseconds:Math.round(performance.now()-start),error:snap.analysisError});
    const H=row.calibrationH||C.fit(C.anchors(C.region('full')),row.corners)?.H;
    if(H)for(const d of row.detections)d.image=C.apply(H,{x:d.nx,y:d.ny});
   }
  }catch(e){row.error=String(e).slice(0,500);}
  rows.push(row);fs.writeFileSync(output,JSON.stringify(rows,null,2)+'\n');
  console.log(JSON.stringify({index:row.index,engine:row.engine,ms:row.milliseconds,count:row.detections?.length,corners:row.rejectedCorners?'manual':'auto',error:row.error||undefined}));
 }
 }finally{await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
