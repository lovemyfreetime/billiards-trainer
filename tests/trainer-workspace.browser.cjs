const assert=require('node:assert/strict'),cp=require('node:child_process'),fs=require('node:fs'),{chromium}=require('playwright');
const dir='test-results/workspace';fs.mkdirSync(dir,{recursive:true});
const overlaps=(a,b)=>a.x<b.x+b.width-1&&a.x+a.width>b.x+1&&a.y<b.y+b.height-1&&a.y+a.height>b.y+1;
(async()=>{
 const server=cp.spawn(process.execPath,['tests/range-server.cjs','8820']);await new Promise(r=>server.stdout.once('data',r));
 let browser; const failures=[];
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  for(const viewport of [{width:1366,height:768},{width:1024,height:768},{width:740,height:360},{width:390,height:844}]){
   const context=await browser.newContext({viewport,serviceWorkers:'block'});
   await context.addInitScript(()=>{window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}}});
   const page=await context.newPage(),errors=[];page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
   const shot=()=>page.evaluate(()=>billiardsTourBridge.capture().state);
   const reachable=async selector=>{const el=page.locator(selector);assert(await el.isVisible(),selector+' visible');const box=await el.boundingBox();assert(box&&box.width>0&&box.height>0,selector+' sized');assert(await el.evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),selector+' not covered');return box;};
   const screenshot=tag=>page.screenshot({path:`${dir}/${viewport.width}-${tag}.png`});
   try{
    await page.goto('http://127.0.0.1:8820/?train=1');await page.waitForFunction(()=>window.billiardsTourBridge&&window.billiardsWorkspaceSync);
    await page.locator('#workspace-setup summary').click();await page.locator('#table3DRackToggle').click();await page.locator('#table3DRackMenu [data-rack=rack9]').click();assert.equal((await shot()).balls.filter(b=>b.active&&!b.marker).length,10,'Setup racks the 2D table');
    await page.evaluate(()=>billiardsTourBridge.apply({id:'workspace',title:'Workspace',balls:[[0,.25,.5],[1,.65,.5],[2,.75,.25]],target:1,pocket:[1,1],speed:2.4,followPercent:0,sidePercent:0},{tableL:2.54,tableW:1.27}));
    await reachable('#btZenLauncher .experience-toggle');await reachable('#appCloseControl');await screenshot('2d');
    assert.equal(await page.locator('#panel').isVisible(),false);
    const initial=await shot();await page.locator('#phoneControls').click();assert(await page.locator('#panel').isVisible());await screenshot('drawer');await page.locator('#phoneControls').click();assert.deepEqual(await shot(),initial,'Drawer preserves the shot');
    for(const [group,ids]of Object.entries({setup:['analyzePhotoBtn','cameraCaptureBtn','quickLayoutRecall'],plan:['kickToolToggle','bankToolToggle','teachingCompassToggle'],view:['tableZoom','btg-fullscreen','table3DToggle']})){
     await page.locator('#workspace-'+group+' summary').click();for(const id of ids)assert(await page.locator('#'+id).isVisible(),id+' is discoverable in '+group);await screenshot(group);await page.keyboard.press('Escape');
    }
    await page.locator('#workspace-plan summary').click();await page.locator('#teachingCompassToggle').click();await page.locator('#workspace-plan summary').click();
    assert.equal(await page.locator('#teachingCompassToggle').getAttribute('aria-pressed'),'true');
    for(const [label,id]of [['.compassSideLabel','compassSize'],['.compassTopLabel','compassRotate']])assert(!overlaps(await page.locator(label).boundingBox(),await page.locator('#'+id).boundingBox()),'Compass label clears its slider');
    await screenshot('compass');await page.locator('#teachingCompassToggle').click();
    await page.locator('#phoneControls').click();await page.locator('#toggleShot2').click();await page.locator('#phoneControls').click();
    if((await shot()).activeShot!==2)await page.locator('#phoneAimChoice').click();
    for(const id of ['aimRoller2','tableSpeed2','bottomFollow2','bottomSide2','phoneTip2'])await reachable('#'+id);
    const beforeSecond=await shot();await page.locator('#tableSpeed2').press('ArrowRight');await page.locator('#bottomFollow2').press('ArrowRight');await page.locator('#bottomSide2').press('ArrowRight');
    const second=await shot();assert(second.shot2.speed>beforeSecond.shot2.speed);assert(second.shot2.follow>beforeSecond.shot2.follow);assert(second.shot2.sideSpin>beforeSecond.shot2.sideSpin);
    await page.evaluate(()=>{const snap=billiardsTourBridge.capture();snap.state.shot2CueBallOnly=true;billiardsTourBridge.restore(snap);});
    for(const id of ['aimRoller2','tableSpeed2','bottomFollow2','bottomSide2','phoneTip2'])await reachable('#'+id);
    await screenshot('shot-two');
    await page.locator('#phoneAimChoice').click();assert.equal((await shot()).activeShot,1);assert.equal((await shot()).speed,initial.speed);assert.equal((await shot()).follow,initial.follow);
    assert(await page.locator('#aimRoller').isVisible());assert(!(await page.locator('#aimRoller2').isVisible()));
    await page.evaluate(()=>{const snap=billiardsTourBridge.capture();snap.state.pocketedLog=[3];billiardsTourBridge.restore(snap);});
    assert.equal(await page.locator('#workspaceBalls button').count(),16);
    await page.locator('#workspaceBalls [data-ball-id="3"]').click();assert((await shot()).balls.some(b=>b.id===3));assert(!(await shot()).pocketedLog.includes(3));assert(await page.locator('#workspaceBalls [data-ball-id="3"]').isDisabled());
    await page.locator('#phoneTrayToggle').click();assert(!(await page.locator('#workspaceBalls').isVisible()));await page.locator('#phoneTrayToggle').click();
    const geometry=async()=>{
     const ids=['stageWrap','phoneAimRail','phoneSpeedRail',...(await page.locator('#workspaceBallShelf').isVisible()?['workspaceBallShelf']:[]),'bottomSpin1'];const boxes={};for(const id of ids)boxes[id]=await page.locator('#'+id).boundingBox();
     for(const id of ids.slice(1))assert(!overlaps(boxes.stageWrap,boxes[id]),'Table clears '+id+': '+JSON.stringify(boxes));
     if(boxes.workspaceBallShelf)assert(!overlaps(boxes.workspaceBallShelf,boxes.bottomSpin1),'Balls clear spin');
     const spin=await page.locator('#bottomSpin1').boundingBox(),shoot=await page.locator('[data-trainer-action=animate]').boundingBox();assert(!overlaps(spin,shoot),'Shoot clears spin');
     for(const [id,box]of Object.entries(boxes))assert(box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width+1&&box.y+box.height<=viewport.height+1,id+' within viewport');
    };
    await geometry();assert((await reachable('#phoneSpeedRail')).width>=50);assert((await reachable('#phoneAimRail')).width>=50);assert((await reachable('[data-trainer-action=animate]')).height>=64);assert((await reachable('#bottomFollow1')).height>=40);await screenshot('shot-controls');
    if(viewport.width===1366){
     const beforeAim=await shot(),cue=beforeAim.balls.find(b=>b.id===0),angle=s=>Math.atan2(s.freeAim.y-cue.y,s.freeAim.x-cue.x);
     const roller=await page.locator('#aimRoller').boundingBox();await page.mouse.move(roller.x+roller.width/2,roller.y+roller.height/2);await page.mouse.down();await page.mouse.move(roller.x+roller.width/2,roller.y+roller.height/2+12);await page.mouse.up();
     assert(Math.abs(angle(await shot())-angle(beforeAim)-.15*Math.PI/180)<1e-8,'Edge aim keeps its precision');
     const preShot=await shot();await page.locator('[data-trainer-action=animate]').click();
     await page.waitForFunction(()=>!billiardsZenControls.status().busy&&billiardsZenControls.status().undo,{timeout:30000});
     await page.locator('[data-trainer-action=undoShot]').click();assert.deepEqual((await shot()).balls,preShot.balls,'Undo restores balls');
     await page.locator('[data-trainer-action=redoShot]').click();await page.waitForFunction(()=>!billiardsZenControls.status().busy);
     await page.locator('[data-trainer-action=undoShot]').click();assert.deepEqual((await shot()).balls,preShot.balls,'Redo remains reversible');
    }
    const before3d=await shot();await page.locator('#workspace-view summary').click();await page.locator('#table3DToggle').click();await page.waitForFunction(()=>Billiards3D.active);await page.keyboard.press('Escape');
    await geometry();await screenshot('3d');assert.deepEqual(await shot(),before3d,'View switch preserves shot settings and balls');
    for(const selector of ['#table3DLock','#table3DPan','#table3DRotate','#table3DZoomSlider','#table3DZoomIn','#table3DZoomOut','#table3DRackToggle','#phoneTrayToggle','#table3DViews button:nth-child(2)','#btZenLauncher .experience-toggle','#appCloseControl'])await reachable(selector);
    await page.locator('#table3DLock').click();assert(await page.locator('body').evaluate(e=>e.classList.contains('table-3d-locked')));await page.locator('#table3DLock').click();assert(!(await page.locator('body').evaluate(e=>e.classList.contains('table-3d-locked'))));
    await page.locator('#table3DPan').click();assert.equal(await page.locator('#table3DPan').getAttribute('aria-pressed'),'true');await page.locator('#table3DRotate').click();
    await page.locator('#table3DZoomIn').click();await page.locator('#table3DViews button').filter({hasText:'Full View'}).click();
    await page.locator('#phoneTrayToggle').click();await geometry();await reachable('#workspaceBalls [data-ball-id="4"]');await screenshot('3d-tray');await page.locator('#phoneTrayToggle').click();
    await page.locator('#phoneAimChoice').click();for(const id of ['aimRoller2','tableSpeed2','bottomFollow2','bottomSide2','phoneTip2'])await reachable('#'+id);await screenshot('3d-shot-two');await page.locator('#phoneAimChoice').click();
    for(const id of ['kickToolToggle','bankToolToggle']){await page.locator('#workspace-plan summary').click();await page.locator('#'+id).click();const panel=await reachable('#bankKickRoutePanel');assert(!overlaps(panel,await page.locator('#phoneControls').boundingBox()),id+' clears Tools');assert(!overlaps(panel,await page.locator('#appCloseControl').boundingBox()),id+' clears Close');await screenshot(id);await page.locator('#workspace-plan summary').click();await page.locator('#'+id).click();}
    await page.locator('#table3DToggle').click();await page.waitForFunction(()=>!Billiards3D.active);await page.keyboard.press('Escape');
    assert.deepEqual(await shot(),before3d,'Return to 2D preserves both shots');assert.deepEqual(errors,[]);console.log(viewport.width+': geometry, drawer, grouped tools, two-shot controls, tray and 3D transition passed');
   }catch(error){await screenshot('failure');failures.push(viewport.width+': '+error.stack);console.error(failures.at(-1));}finally{await context.close();}
  }
  for(const [path,selector]of [['/play.html','#playModeSwitch .experience-toggle'],['/companion.html','#companionExperience .experience-toggle'],['/?zen=1','#zenMode']]){
   const context=await browser.newContext({viewport:{width:1024,height:768},serviceWorkers:'block'});await context.addInitScript(()=>{window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=true;window.__closeMessages=[];window.chrome={webview:{postMessage(m){window.__closeMessages.push(m)}}};});const page=await context.newPage();
   try{await page.goto('http://127.0.0.1:8820'+path);await page.locator('#appCloseControl').waitFor({state:'visible'});await page.locator('#appCloseControl').click();assert(await page.evaluate(()=>__closeMessages.some(m=>m.type==='close-app')),'Shared native close dispatch');
    if(!path.includes('zen')){const toggle=page.locator(selector);assert(await toggle.isVisible());const b=await toggle.boundingBox();assert(b.x<70&&b.y<70,'Experience in upper-left');await toggle.click();const links=await page.locator('.experience-menu:popover-open a').evaluateAll(a=>a.map(e=>e.href));assert(links.some(u=>u.endsWith('/welcome.html')));assert(links.some(u=>u.includes('/?zen=1')));if(path.includes('companion'))assert(!links.some(u=>u.includes('companion.html?')));await page.keyboard.press('Escape');}
    await page.screenshot({path:dir+'/'+(path.includes('companion')?'companion':path.includes('zen')?'zen':'play')+'-navigation.png'});
   }catch(e){failures.push(path+': '+e.stack);}finally{await context.close();}
  }
  assert.deepEqual(failures,[],'All workspace sizes and navigation pass');
 }finally{await browser?.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
