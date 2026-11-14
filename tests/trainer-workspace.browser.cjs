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
   const speedReadouts=async which=>{
    const values={};for(const suffix of ['Value','Feel','Lag']){const el=page.locator(`#tableSpeed${which}Wrap .phoneSpeed${suffix}`);assert(await el.isVisible(),suffix+' visible for shot '+which);values[suffix]=await el.evaluate(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect(),rail=e.closest('.tableSpeedControl').getBoundingClientRect();return {text:e.textContent,color:s.color,font:s.font,top:Math.round(r.top-rail.top),bottom:Math.round(rail.bottom-r.bottom)};});}
    assert.match(values.Feel.text,/♦/);assert.match(values.Lag.text,/lag/);assert.equal(values.Feel.color,'rgb(105, 229, 255)','Keep cyan diamond ratings');return values;
   };
   const trayControls=async()=>{const b=await reachable('#phoneTrayToggle'),r=await reachable('#table3DRackToggle'),c=await reachable('#workspaceClearBalls');assert(b.x+b.width<=r.x&&r.x+r.width<=c.x,'Balls, Rack, Clear are adjacent in order');assert.equal(await page.locator('#table3DRackToggle').evaluate(e=>e.parentElement.id),'workspaceBallShelf');assert((await page.locator('#workspaceBalls').boundingBox()).width>=34,'Tray retains a whole ball target');};
   const openAiming=async()=>{if(!(await page.locator('body').evaluate(e=>e.classList.contains('phone-controls-open'))))await page.locator('#phoneControls').click();const section=page.locator('.section').filter({has:page.locator('#featureAimingOptions')});if(!(await section.evaluate(e=>e.classList.contains('open'))))await section.locator('.sectionToggle').click();await page.locator('#workspaceAimTools').scrollIntoViewIfNeeded();};
   const clearAndUndo=async()=>{const before=await shot();await reachable('#workspaceClearBalls');await page.locator('#workspaceClearBalls').click();const cleared=await shot();assert.equal(cleared.balls.length,0);assert.equal(cleared.shot2Enabled,false);assert.deepEqual(cleared.pocketedLog,[]);for(const key of ['speed','follow','sideSpin','tableL','tableW','muRoll','railRest'])assert.equal(cleared[key],before[key],'Clear preserves '+key);await page.keyboard.press('Control+z');assert.deepEqual((await shot()).balls,before.balls,'Clear is action-undoable');assert.equal((await shot()).shot2Enabled,before.shot2Enabled);};
   const motion=async()=>{
    const summary=page.locator('#workspace-motion summary'),button=page.locator('#workspace-motion button');
    assert(await summary.evaluate(e=>e.parentElement.previousElementSibling.id==='workspace-view'));
    assert(!overlaps(await reachable('#workspace-motion summary'),await page.locator('#appCloseControl').boundingBox()),'Motion clears Close');await summary.click();
    assert.deepEqual(await button.allTextContents(),['Regular Motion','Slow Motion','Really Slow Motion','Super Slow Motion']);
    await screenshot('motion');for(const rate of ['0.5','0.25','0.125','1']){
     await page.locator('#workspace-motion button[data-speed="'+rate+'"]').click();
     assert.deepEqual(await page.evaluate(()=>[billiardsPlayback.state().speed,trainerPlaybackSpeed.value,trainerPlaybackQuickSpeed.value]),[Number(rate),rate,rate]);
     await summary.click();assert.equal(await page.locator('#workspace-motion button[aria-pressed=true]').getAttribute('data-speed'),rate);
    }await page.keyboard.press('Escape');
    await page.locator('#trainerPlaybackSpeed').evaluate(e=>{e.value='0.25';e.dispatchEvent(new Event('change'));});assert.equal(await page.locator('#workspace-motion button[aria-pressed=true]').getAttribute('data-speed'),'0.25');
    await page.locator('#trainerPlaybackQuickSpeed').selectOption('1');await page.locator('#trainerPlaybackHide').click();
   };
   const analyzer=async(mode)=>{
    await page.locator('#workspace-setup summary').click();await page.locator('#analyzePhotoBtn').click();
    assert(await page.locator('#photoAnalyzerStatus').evaluate(e=>e.parentElement.id==='phoneAnalyzeBar'));assert(!(await page.locator('#phoneAnalyzeBar').innerText()).split('\n').includes('null'));
    for(const id of ['photoChooseImage','photoAnalyzeNow','photoAddMissed','photoMoreTools','photoAnalyzerClose'])await reachable('#'+id);
    assert.equal(await page.locator('#photoAnalyzeNow').textContent(),'Analyze Balls');assert.equal(await page.locator('#photoAddMissed').textContent(),'Add Missed Ball');
    const extra=page.locator('#photoMoreTools');if(await extra.getAttribute('aria-expanded')==='false')await extra.click();
    for(const id of ['photoFindCorners','photoAutoRailsBtn','photoWalkthroughBtn'])assert(await page.locator('#'+id).isVisible());
    await page.locator('#phonePhotosButton').click();assert(await page.locator('#photoArchiveSelect').isVisible());await page.keyboard.press('Escape');
    if(viewport.width===1366){
     const fixture=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=720;c.height=420;const x=c.getContext('2d');x.fillStyle='#257e8b';x.fillRect(0,0,c.width,c.height);x.fillStyle='white';x.beginPath();x.arc(225,190,10,0,Math.PI*2);x.fill();return c.toDataURL().split(',')[1];});
     if(mode==='3d'){await page.locator('#photoAnalyzerClose').click();await page.locator('#workspace-setup summary').click();await page.evaluate(()=>{const c=document.createElement('canvas');c.width=720;c.height=420;const ctx=c.getContext('2d');ctx.fillStyle='#257e8b';ctx.fillRect(0,0,720,420);window.__testCameraFixture=c;Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async()=>{const stream=c.captureStream(10);setTimeout(()=>{ctx.fillRect(0,0,720,420);},100);return stream;}});});await page.locator('#cameraCaptureBtn').click();}else await page.locator('#photoFileInput').setInputFiles({name:'table.png',mimeType:'image/png',buffer:Buffer.from(fixture,'base64')});
     await page.locator('#tableCamera [data-action=snap]').click();await page.waitForFunction(()=>!photoAnalyzeNow.disabled);
     const rev=await page.evaluate(()=>billiardsWalkthroughBridge.snapshot().analysisRevision);
     await page.locator('#photoAnalyzeNow').click();await page.waitForFunction(v=>{const s=billiardsWalkthroughBridge.snapshot();return !s.busy&&(s.analysisRevision>v||s.analysisError);},rev,{timeout:120000});
     assert.equal(await page.evaluate(()=>billiardsWalkthroughBridge.snapshot().analysisError),'');
     await page.locator('#photoAddMissed').click();const cv=page.locator('#photoAnalyzerCanvas'),box=await cv.boundingBox();await cv.click({position:{x:box.width*.5,y:box.height*.5}});
     await page.locator('#photoDetectionList select').last().selectOption('14');await screenshot(mode+'-analyze');await page.locator('#photoApplyTable').click();assert((await shot()).balls.some(b=>b.id===14&&b.active));
    }else{await screenshot(mode+'-analyze');await page.locator('#photoAnalyzerClose').click();}
    assert(!(await page.locator('#photoAnalyzerModal').isVisible()));assert.equal(await page.evaluate(()=>!!Billiards3D.active),mode==='3d');
   };
   try{
    await page.goto('http://127.0.0.1:8820/?train=1');await page.waitForFunction(()=>window.billiardsTourBridge&&window.billiardsWorkspaceSync);
    await motion();await analyzer('2d');await trayControls();await page.locator('#table3DRackToggle').click();await screenshot('rack');await page.locator('#table3DRackMenu [data-rack=rack9]').click();assert.equal((await shot()).balls.filter(b=>b.active&&!b.marker).length,10,'Tray Rack sets up the 2D table');
    await page.evaluate(()=>billiardsTourBridge.apply({id:'workspace',title:'Workspace',balls:[[0,.25,.5],[1,.65,.5],[2,.75,.25]],target:1,pocket:[1,1],speed:2.4,followPercent:0,sidePercent:0},{tableL:2.54,tableW:1.27}));
    await reachable('#btZenLauncher .experience-toggle');await reachable('#appCloseControl');await screenshot('2d');
    assert.equal(await page.locator('#panel').isVisible(),false);
    const initial=await shot();await page.locator('#phoneControls').click();assert(await page.locator('#panel').isVisible());await screenshot('drawer');await page.locator('#phoneControls').click();assert.deepEqual(await shot(),initial,'Drawer preserves the shot');
    for(const [group,ids]of Object.entries({setup:['analyzePhotoBtn','cameraCaptureBtn','quickLayoutRecall'],view:['tableZoom','btg-fullscreen']})){
     await page.locator('#workspace-'+group+' summary').click();for(const id of ids)assert(await page.locator('#'+id).isVisible(),id+' is discoverable in '+group);await screenshot(group);await page.keyboard.press('Escape');
    }
    assert.equal(await page.locator('#workspace-setup summary').textContent(),'Import');assert.equal(await page.locator('#workspaceFit').textContent(),'Full Table');
    await page.locator('#workspace-setup summary').click();const stack=await Promise.all(['analyzePhotoBtn','cameraCaptureBtn','quickLayoutRecall'].map(id=>reachable('#'+id)));assert(stack.every(b=>Math.abs(b.x-stack[0].x)<1&&Math.abs(b.width-stack[0].width)<1));assert(stack[0].y+stack[0].height<=stack[1].y&&stack[1].y+stack[1].height<=stack[2].y);await page.keyboard.press('Escape');
    await page.evaluate(()=>BilliardsTableZoom.restore({enabled:true,scale:2,x:-.3,y:-.2}));await page.locator('#workspace-view summary').click();await page.locator('#workspaceFit').click();assert.deepEqual(await page.evaluate(()=>BilliardsTableZoom.snapshot()),{enabled:false,scale:1,x:0,y:0},'Full Table restores the complete table');assert.deepEqual(await shot(),initial,'Full Table leaves shot state unchanged');
    const speed2d=await speedReadouts(1);
    assert.equal(await page.locator('#workspace-plan').count(),0);for(const id of ['kickToolToggle','bankToolToggle','teachingCompassToggle']){assert(!(await page.locator('#'+id).isVisible()),id+' stays in drawer');assert(await page.locator('#'+id).evaluate(e=>!!e.closest('#featureAimingOptions')));}
    await openAiming();await page.locator('#teachingCompassToggle').click();
    assert.equal(await page.locator('#teachingCompassToggle').getAttribute('aria-pressed'),'true');
    for(const [label,id]of [['.compassSideLabel','compassSize'],['.compassTopLabel','compassRotate']])assert(!overlaps(await page.locator(label).boundingBox(),await page.locator('#'+id).boundingBox()),'Compass label clears its slider');
    await screenshot('compass');await page.locator('#teachingCompassToggle').click();await page.locator('#phoneControls').click();
    await page.locator('#phoneControls').click();await page.locator('#toggleShot2').click();await page.locator('#phoneControls').click();
    if((await shot()).activeShot!==2)await page.locator('#phoneAimChoice').click();
    for(const id of ['aimRoller2','tableSpeed2','bottomFollow2','bottomSide2','phoneTip2'])await reachable('#'+id);
    const beforeSecond=await shot();await page.locator('#tableSpeed2').press('ArrowRight');await page.locator('#bottomFollow2').press('ArrowRight');await page.locator('#bottomSide2').press('ArrowRight');
    const second=await shot();assert(second.shot2.speed>beforeSecond.shot2.speed);assert(second.shot2.follow>beforeSecond.shot2.follow);assert(second.shot2.sideSpin>beforeSecond.shot2.sideSpin);
    await page.evaluate(()=>{const snap=billiardsTourBridge.capture();snap.state.shot2CueBallOnly=true;billiardsTourBridge.restore(snap);});
    for(const id of ['aimRoller2','tableSpeed2','bottomFollow2','bottomSide2','phoneTip2'])await reachable('#'+id);
    await speedReadouts(2);await screenshot('shot-two');
    await page.locator('#phoneAimChoice').click();assert.equal((await shot()).activeShot,1);assert.equal((await shot()).speed,initial.speed);assert.equal((await shot()).follow,initial.follow);
    assert(await page.locator('#aimRoller').isVisible());assert(!(await page.locator('#aimRoller2').isVisible()));
    await page.evaluate(()=>{const snap=billiardsTourBridge.capture();snap.state.pocketedLog=[3];billiardsTourBridge.restore(snap);});
    assert.equal(await page.locator('#workspaceBalls button').count(),16);
    await page.locator('#workspaceBalls [data-ball-id="3"]').click();assert((await shot()).balls.some(b=>b.id===3));assert(!(await shot()).pocketedLog.includes(3));assert(await page.locator('#workspaceBalls [data-ball-id="3"]').isDisabled());
    await page.locator('#phoneTrayToggle').click();assert(!(await page.locator('#workspaceBalls').isVisible()));await page.locator('#phoneTrayToggle').click();
    const geometry=async()=>{
     const tools=await reachable('#phoneControls');for(const id of ['workspace-setup','workspace-view'])assert(!overlaps(tools,await page.locator('#'+id+' summary').boundingBox()),'Tools clears '+id);
     const ids=['stageWrap','phoneAimRail','phoneSpeedRail',...(await page.locator('#workspaceBallShelf').isVisible()?['workspaceBallShelf']:[]),'bottomSpin1'];const boxes={};for(const id of ids)boxes[id]=await page.locator('#'+id).boundingBox();
     for(const id of ids.slice(1))assert(!overlaps(boxes.stageWrap,boxes[id]),'Table clears '+id+': '+JSON.stringify(boxes));
     if(boxes.workspaceBallShelf)assert(!overlaps(boxes.workspaceBallShelf,boxes.bottomSpin1),'Balls clear spin');
     const spin=await page.locator('#bottomSpin1').boundingBox(),shoot=await reachable('[data-trainer-action=animate]');assert(!overlaps(spin,shoot),'Shoot clears spin');assert(shoot.height>=128,'Shoot spans two rows');
     if(boxes.workspaceBallShelf)assert(!overlaps(boxes.workspaceBallShelf,shoot),'Tray clears tall Shoot');
     const tip=await reachable('#phoneTip1');assert(tip.width>=(viewport.width<=600?56:72),'Larger cue-tip badge');assert(!overlaps(tip,await page.locator('#bottomFollow1').boundingBox()));assert(!overlaps(tip,await page.locator('#bottomSide1').boundingBox()));
     const mode=await reachable('#table3DToggle'),experience=await reachable('#btZenLauncher .experience-toggle');assert(mode.x>=experience.x+experience.width&&mode.x-experience.x-experience.width<=8,'Mode directly follows experience');assert.equal(mode.y,experience.y);
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
    await clearAndUndo();const modePosition=await page.locator('#table3DToggle').boundingBox();
    const before3d=await shot();await page.locator('#table3DToggle').click();await page.waitForFunction(()=>Billiards3D.active);await page.keyboard.press('Escape');
    await geometry();await screenshot('3d');assert.deepEqual(await page.locator('#table3DToggle').boundingBox(),modePosition,'Mode switch stays at exactly the same position');assert.deepEqual(await shot(),before3d,'View switch preserves shot settings and balls');
    const speed3d=await speedReadouts(1);for(const type of ['Value','Feel'])for(const key of ['text','color','font','top'])assert.equal(speed3d[type][key],speed2d[type][key],'Top speed readouts match in both modes');for(const key of ['text','color','font','bottom'])assert.equal(speed3d.Lag[key],speed2d.Lag[key],'Lag readout matches in both modes');
    for(const selector of ['#table3DLock','#table3DPan','#table3DRotate','#table3DZoomSlider','#table3DZoomIn','#table3DZoomOut','#table3DRackToggle','#phoneTrayToggle','#table3DViews button:nth-child(2)','#btZenLauncher .experience-toggle','#appCloseControl']){const box=await reachable(selector);assert(!overlaps(box,await page.locator('[data-trainer-action=animate]').boundingBox()),selector+' clears tall Shoot');}
    assert((await reachable('#table3DZoomSlider')).width>=44,'Camera zoom retains a usable drag target');
    await page.locator('#table3DLock [data-adjust=edit]').click();assert(await page.locator('body').evaluate(e=>e.classList.contains('table-3d-locked')));await page.locator('#table3DLock [data-adjust=view]').click();assert(!(await page.locator('body').evaluate(e=>e.classList.contains('table-3d-locked'))));
    await page.locator('#table3DPan').click();assert.equal(await page.locator('#table3DPan').getAttribute('aria-pressed'),'true');await page.locator('#table3DRotate').click();
    await page.locator('#table3DZoomIn').click();await page.locator('#table3DViews button').filter({hasText:'Full View'}).click();
    await page.locator('#phoneTrayToggle').click();await geometry();await trayControls();await reachable('#workspaceBalls [data-ball-id="4"]');if(viewport.width>700){const rail=await page.locator('#phoneSpeedRail').boundingBox(),shoot=await reachable('[data-trainer-action=animate]');const gap=shoot.y-rail.y-rail.height;assert(gap>=0&&gap<=10,'3D speed rail ends above Shoot: '+gap);}await screenshot('3d-tray');await clearAndUndo();await page.locator('#phoneTrayToggle').click();
    await page.locator('#phoneAimChoice').click();for(const id of ['aimRoller2','tableSpeed2','bottomFollow2','bottomSide2','phoneTip2'])await reachable('#'+id);await speedReadouts(2);await screenshot('3d-shot-two');await page.locator('#phoneAimChoice').click();
    for(const id of ['kickToolToggle','bankToolToggle']){await openAiming();await page.locator('#'+id).click();const panel=await reachable('#bankKickRoutePanel');assert(!overlaps(panel,await page.locator('#phoneControls').boundingBox()),id+' clears Tools');assert(!overlaps(panel,await page.locator('#appCloseControl').boundingBox()),id+' clears Close');await screenshot(id);await openAiming();await page.locator('#'+id).click();}
    await motion();await analyzer('3d');const beforeReturn=await shot();await page.locator('#table3DToggle').click();await page.waitForFunction(()=>!Billiards3D.active);await page.keyboard.press('Escape');
    assert.deepEqual(await shot(),beforeReturn,'Return to 2D preserves both shots');assert.deepEqual(errors,[]);console.log(viewport.width+': geometry, drawer, grouped tools, two-shot controls, tray and 3D transition passed');
   }catch(error){await screenshot('failure');failures.push(viewport.width+': '+error.stack);console.error(failures.at(-1));}finally{await context.close();}
  }
  for(const navWidth of [1024,390])for(const [path,selector]of [['/play.html','#playModeSwitch .experience-toggle'],['/companion.html','#companionExperience .experience-toggle'],['/?zen=1','#zenMode']]){
   const context=await browser.newContext({viewport:{width:navWidth,height:768},serviceWorkers:'block'});await context.addInitScript(()=>{window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=true;window.__closeMessages=[];window.chrome={webview:{postMessage(m){window.__closeMessages.push(m)}}};});const page=await context.newPage();
   try{await page.goto('http://127.0.0.1:8820'+path);await page.locator('#appCloseControl').waitFor({state:'visible'});await page.locator('#appCloseControl').click();assert(await page.evaluate(()=>__closeMessages.some(m=>m.type==='close-app')),'Shared native close dispatch');
    if(!path.includes('zen')){const toggle=page.locator(selector);assert(await toggle.isVisible());const b=await toggle.boundingBox();assert(b.x<70&&b.y<70,'Experience in upper-left');await toggle.click();const links=await page.locator('.experience-menu:popover-open a').evaluateAll(a=>a.map(e=>e.href));assert(links.some(u=>u.endsWith('/welcome.html')));assert(links.some(u=>u.includes('/?zen=1')));if(path.includes('companion'))assert(!links.some(u=>u.includes('companion.html?')));await page.keyboard.press('Escape');
     if(path.includes('companion')){const back=await page.locator('.back-link').boundingBox();assert(back.x>=b.x+b.width,'Back to Play stays to the right of experience');}
     else {const games=page.locator('#playNew');assert(await games.evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),'Games remains uncovered by window controls');}
    }
    await page.screenshot({path:dir+'/'+navWidth+'-'+(path.includes('companion')?'companion':path.includes('zen')?'zen':'play')+'-navigation.png'});
   }catch(e){failures.push(path+': '+e.stack);}finally{await context.close();}
  }
  assert.deepEqual(failures,[],'All workspace sizes and navigation pass');
 }finally{await browser?.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
