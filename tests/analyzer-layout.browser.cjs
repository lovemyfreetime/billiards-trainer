const fs=require('node:fs'),assert=require('node:assert/strict'),cp=require('node:child_process'),{chromium}=require('playwright'),files=require('../trainer-layout-files');
const dir='test-results/analyzer-layout';fs.mkdirSync(dir,{recursive:true});
const layout={name:'Analyzer review',tableL:2.54,tableW:1.27,ballR:.028575,balls:[[0,.25,.5],[5,.48,.35],[8,.55,.7],[11,.78,.3],[15,.8,.7]].map(([id,x,y])=>({id,x:x*2.54,y:y*1.27,active:true}))};
const file=Buffer.from(JSON.stringify(files.create(layout))),ua='Mozilla/5.0 (Linux; Android 16; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36';
(async()=>{
 const server=cp.spawn(process.execPath,['tests/range-server.cjs','8830']);await new Promise(r=>server.stdout.once('data',r));let browser;const failures=[];
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  for(const [width,height,mobile,mode] of [[2048,1280,false,'2d'],[1366,768,false,'3d'],[1024,768,false,'2d'],[844,390,true,'2d'],[844,390,true,'3d'],[640,360,true,'2d']]){
   const name=width+'x'+height+'-'+mode,context=await browser.newContext({viewport:{width,height},screen:{width,height},hasTouch:true,isMobile:mobile,userAgent:mobile?ua:undefined,serviceWorkers:'block',acceptDownloads:true});
   await context.addInitScript(()=>{
    window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}};window.__photoTexts=[];
    const p=CanvasRenderingContext2D.prototype,draw=p.drawImage,text=p.fillText;
    p.drawImage=function(...args){if(this.canvas.id==='photoAnalyzerCanvas')window.__photoTexts=[];return draw.apply(this,args);};
    p.fillText=function(value,x,y,...rest){if(this.canvas.id==='photoAnalyzerCanvas')window.__photoTexts.push({text:String(value),x,y,font:this.font});return text.call(this,value,x,y,...rest);};
   });
   const page=await context.newPage(),errors=[];page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
   const shot=()=>page.evaluate(()=>billiardsTourBridge.capture().state),snapshot=()=>page.evaluate(()=>billiardsWalkthroughBridge.snapshot());
   try{
    await page.goto('http://127.0.0.1:8830/?train=1');await page.waitForFunction(()=>window.billiardsMenuReady&&window.billiardsWalkthroughBridge);
    if(mode==='3d'){await page.locator('#table3DToggle').tap();await page.waitForFunction(()=>Billiards3D.active);}
    await page.locator('#workspace-picker > summary').tap();await page.locator('#workspace-setup > summary').tap();await page.locator('#analyzePhotoBtn').tap();
    await page.locator('#photoLayoutFileInput').setInputFiles({name:'review.billiards.json',mimeType:'application/json',buffer:file});
    await page.waitForFunction(()=>billiardsWalkthroughBridge.snapshot().detectionCount===5&&document.querySelector('#photoFilesFooter .bt-saved-files select'));
    const geometry=await page.evaluate(()=>{
     const box=s=>document.querySelector(s).getBoundingClientRect().toJSON();
     const controls=[...document.querySelectorAll('#photoMainActions button,#photoSecondaryTools .photoAnalyzerToolbar button')].filter(e=>e.getBoundingClientRect().height>0);
     return {bar:box('#phoneAnalyzeBar'),summary:box('.photoReviewSummary'),pane:box('.photoReview'),footer:box('#photoFilesFooter'),name:box('#photoLayoutName'),saved:box('#photoFilesFooter .bt-saved-files select'),controls:controls.map(e=>({id:e.id,...e.getBoundingClientRect().toJSON()})),status:box('#photoAnalyzerStatus')};
    });
    assert(geometry.bar.height<=36,'Top actions stay on one thin line: '+geometry.bar.height);assert(geometry.footer.height<=40,'Bottom bar is compact');
    assert(geometry.summary.y>=geometry.bar.bottom-1&&geometry.summary.x>=geometry.pane.x-1&&geometry.summary.right<=geometry.pane.right+1,'Ball references are back above the review cards');
    assert(await page.locator('.photoReview>.photoReviewSummary').count());
    if(width>=1024){const last=geometry.controls.find(b=>b.id==='photoWalkthroughBtn');assert(geometry.bar.right-last.right<=40,'Actions fill the top line up to Close');}
    assert(Math.abs(geometry.name.width-geometry.saved.width)<1,'Layout-name and saved-file fields match widths');assert(geometry.name.width>180,'Both file fields expand to fill the bottom bar');
    for(const b of geometry.controls)assert(Math.abs(b.y+b.height/2-geometry.bar.y-geometry.bar.height/2)<2,b.id+' stays on the same top line');
    const primary=geometry.controls.filter(b=>['photoChooseImage','photoAnalyzeNow','photoAddMissed'].includes(b.id));assert(primary.every(b=>b.height>=28&&b.width>=96),'Main image/analyze/add actions remain prominent');
    assert.equal(await page.locator('#photoMoreTools').isVisible(),false,'Tools toggle is removed');
    const actions=geometry.controls.filter(b=>b.id!=='photoAnalyzerClose').sort((a,b)=>a.x-b.x);assert.equal(actions.at(-1).id,'photoWalkthroughBtn','Walkthrough is the last top action');
    const order=['photoChooseImage','photoTakeImage','photoFrameImage','photoAutoRailsBtn','photoFindCorners','photoFineTune','photoAnalyzeNow','photoAddMissed','phonePhotosButton','photoResetCorners','photoWalkthroughBtn'];assert.deepEqual(actions.map(b=>b.id),order.filter(id=>actions.some(b=>b.id===id)),'Actions follow acquisition, alignment, analysis, review and help');
    const filled=await page.evaluate(()=>{const e=document.querySelector('#photoFilesFooter'),buttons=[...e.querySelectorAll('button')].filter(b=>b.getBoundingClientRect().width);return {right:e.getBoundingClientRect().right,last:Math.max(...buttons.map(b=>b.getBoundingClientRect().right))};});assert(filled.right-filled.last<=8,'Bottom bar uses its full width');
    assert(geometry.status.height<=1,'Routine instruction/status line does not consume image height');
    const drawing=await page.evaluate(()=>({texts:window.__photoTexts,canvas:{width:photoAnalyzerCanvas.width,height:photoAnalyzerCanvas.height},rect:photoAnalyzerCanvas.getBoundingClientRect().toJSON()}));
    assert(!drawing.texts.some(t=>/inside corner|cushion line|wheel|pinch/.test(t.text)),'Verbose canvas words are removed');
    for(const b of layout.balls){const t=drawing.texts.find(t=>t.text===(b.id===0?'CB':String(b.id)));assert(t,'Ball '+b.id+' has a number badge');const sx=drawing.canvas.width/1280,sy=drawing.canvas.height/680,x=(40+b.x/layout.tableL*1200)*sx,y=(40+b.y/layout.tableW*600)*sy,r=(layout.ballR/layout.tableL*1200*sx+layout.ballR/layout.tableW*600*sy)/2;assert(Math.hypot(t.x-x,t.y-y)>r+8,'Number badge sits outside ball '+b.id);}
    await page.screenshot({path:dir+'/'+name+'-review.png'});
    const before=await snapshot(),badge=drawing.texts.find(t=>t.text==='5');
    await page.touchscreen.tap(drawing.rect.x+badge.x/drawing.canvas.width*drawing.rect.width,drawing.rect.y+badge.y/drawing.canvas.height*drawing.rect.height);
    assert.equal(await page.locator('.photoDetectionRow.reviewFocus select').inputValue(),'5','Outside number badge selects the matching review row');
    assert.deepEqual((await snapshot()).detections,before.detections,'Reviewing a badge cannot move or rename balls');assert.deepEqual((await snapshot()).corners,before.corners);
    await page.locator('.photoDetectionRow.reviewFocus select').selectOption('6');const corrected=await snapshot();assert(corrected.detections.some(d=>d.id==='6'));
    await page.locator('#photoLayoutName').fill('Compact review');
    await page.locator('#photoApplyTable').tap();await page.waitForFunction(()=>!document.querySelector('#photoAnalyzerModal').classList.contains('open'));
    const state=await shot();assert.deepEqual(state.balls.filter(b=>b.active).map(b=>b.id).sort((a,b)=>a-b),[0,6,8,11,15]);
    for(const b of layout.balls){const applied=state.balls.find(n=>n.id===(b.id===5?6:b.id));assert(Math.hypot(applied.x-b.x,applied.y-b.y)<1e-8,'Apply preserves original table coordinates');}
    assert.deepEqual(errors,[]);console.log(name+': single top line, larger equal fields, workflow order, outside number badges, badge selection, identity correction and Apply passed');
   }catch(e){console.error(name+': '+e.stack);failures.push(name+': '+e.message);await page.screenshot({path:dir+'/'+name+'-failure.png'}).catch(()=>{});}
   finally{await context.close();}
  }
  assert.deepEqual(failures,[]);
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
