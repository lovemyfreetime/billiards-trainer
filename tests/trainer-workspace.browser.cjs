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
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   const shot=()=>page.evaluate(()=>billiardsTourBridge.capture().state);
   const screenshot=tag=>page.screenshot({path:`${dir}/${viewport.width}-${tag}.png`});
   try{
    await page.goto('http://127.0.0.1:8820/?train=1');await page.waitForFunction(()=>window.billiardsTourBridge&&window.billiardsWorkspaceSync);
    await page.locator('#workspace-setup summary').click();await page.locator('#table3DRackToggle').click();await page.locator('#table3DRackMenu [data-rack=rack9]').click();assert.equal((await shot()).balls.filter(b=>b.active&&!b.marker).length,10,'Setup racks the 2D table');
    await page.evaluate(()=>billiardsTourBridge.apply({id:'workspace',title:'Workspace',balls:[[0,.25,.5],[1,.65,.5],[2,.75,.25]],target:1,pocket:[1,1],speed:2.4,followPercent:0,sidePercent:0},{tableL:2.54,tableW:1.27}));
    await screenshot('2d');
    assert.equal(await page.locator('#panel').isVisible(),false);
    const initial=await shot();await page.locator('#phoneControls').click();assert(await page.locator('#panel').isVisible());await screenshot('drawer');await page.locator('#phoneControls').click();assert.deepEqual(await shot(),initial,'Drawer preserves the shot');
    for(const [group,ids]of Object.entries({setup:['analyzePhotoBtn','cameraCaptureBtn','quickLayoutRecall'],plan:['kickToolToggle','bankToolToggle','teachingCompassToggle'],view:['tableZoom','btg-fullscreen','table3DToggle']})){
     await page.locator('#workspace-'+group+' summary').click();for(const id of ids)assert(await page.locator('#'+id).isVisible(),id+' is discoverable in '+group);await screenshot(group);await page.keyboard.press('Escape');
    }
    await page.locator('#phoneControls').click();await page.locator('#toggleShot2').click();await page.locator('#phoneControls').click();
    if((await shot()).activeShot!==2)await page.locator('#phoneAimChoice').click();
    await page.locator('#tableSpeed2').evaluate(e=>{e.value='3.1';e.dispatchEvent(new Event('input',{bubbles:true}));});
    await page.locator('#bottomFollow2').evaluate(e=>{e.value='.2';e.dispatchEvent(new Event('input',{bubbles:true}));});
    const second=await shot();assert.equal(second.shot2.speed,3.1);assert.equal(second.shot2.follow,.2);
    await page.locator('#phoneAimChoice').click();assert.equal((await shot()).activeShot,1);assert.equal((await shot()).speed,initial.speed);assert.equal((await shot()).follow,initial.follow);
    assert(await page.locator('#aimRoller').isVisible());assert(!(await page.locator('#aimRoller2').isVisible()));
    await page.evaluate(()=>{const snap=billiardsTourBridge.capture();snap.state.pocketedLog=[3];billiardsTourBridge.restore(snap);});
    assert.equal(await page.locator('#workspaceBalls button').count(),16);
    await page.locator('#workspaceBalls [data-ball-id="3"]').click();assert((await shot()).balls.some(b=>b.id===3));assert(!(await shot()).pocketedLog.includes(3));assert(await page.locator('#workspaceBalls [data-ball-id="3"]').isDisabled());
    await page.locator('#phoneTrayToggle').click();assert(!(await page.locator('#workspaceBalls').isVisible()));await page.locator('#phoneTrayToggle').click();
    const geometry=async()=>{
     const ids=['stageWrap','phoneAimRail','phoneSpeedRail','workspaceBallShelf','bottomSpin1'];const boxes={};for(const id of ids)boxes[id]=await page.locator('#'+id).boundingBox();
     for(const id of ids.slice(1))assert(!overlaps(boxes.stageWrap,boxes[id]),'Table clears '+id+': '+JSON.stringify(boxes));
     assert(!overlaps(boxes.workspaceBallShelf,boxes.bottomSpin1),'Balls clear spin');
     const spin=await page.locator('#bottomSpin1').boundingBox(),shoot=await page.locator('[data-trainer-action=animate]').boundingBox();assert(!overlaps(spin,shoot),'Shoot clears spin');
     for(const [id,box]of Object.entries(boxes))assert(box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width+1&&box.y+box.height<=viewport.height+1,id+' within viewport');
    };
    await geometry();await screenshot('shot-controls');
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
    await page.locator('#workspace-view summary').click();assert(await page.locator('#table3DZoomSlider').isVisible());await page.locator('#table3DToggle').click();await page.waitForFunction(()=>!Billiards3D.active);await page.keyboard.press('Escape');
    assert.deepEqual(await shot(),before3d,'Return to 2D preserves both shots');assert.deepEqual(errors,[]);console.log(viewport.width+': geometry, drawer, grouped tools, two-shot controls, tray and 3D transition passed');
   }catch(error){await screenshot('failure');failures.push(viewport.width+': '+error.stack);console.error(failures.at(-1));}finally{await context.close();}
  }
  assert.deepEqual(failures,[],'All workspace sizes pass');
 }finally{await browser?.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
