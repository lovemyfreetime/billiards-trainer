const assert=require('node:assert/strict'),cp=require('node:child_process'),fs=require('node:fs'),{chromium}=require('playwright');
const dir='test-results/workspace';fs.mkdirSync(dir,{recursive:true});
const near=(a,b,message,tolerance=1e-5)=>assert(Math.abs(a-b)<tolerance,message+`: ${a} vs ${b}`);
(async()=>{
 const server=cp.spawn(process.execPath,['tests/range-server.cjs','8821']);await new Promise(r=>server.stdout.once('data',r));
 let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  for(const touch of [false,true]){
   const context=await browser.newContext({viewport:{width:touch?1024:1366,height:768},hasTouch:touch,serviceWorkers:'block'});
   await context.addInitScript(()=>{window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}};});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
   const cdp=touch?await context.newCDPSession(page):null;
   const start=async p=>{if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y}]});else{await page.mouse.move(p.x,p.y);await page.mouse.down();}};
   const move=async p=>{if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x,y:p.y}]});else await page.mouse.move(p.x,p.y);};
   const end=async(cancel=false)=>{if(touch)await cdp.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});else if(cancel)await page.keyboard.press('Escape');else await page.mouse.up();};
   const drag=async(a,b,cancel=false)=>{await start(a);for(let i=1;i<=6;i++)await move({x:a.x+(b.x-a.x)*i/6,y:a.y+(b.y-a.y)*i/6});await end(cancel);};
   const state=()=>page.evaluate(()=>billiardsTourBridge.capture().state);
   const project=(q,height=0)=>page.evaluate(({q,height})=>Billiards3D.active?Billiards3D.project(q,height):billiardsCompassControls.project(q),{q,height});
   const middle=async selector=>{const r=await page.locator(selector).boundingBox();assert(r,selector+' visible');return {x:r.x+r.width/2,y:r.y+r.height/2};};
   const fixture=async(compass=false,linked=false)=>page.evaluate(async ({compass,linked})=>{
    const s=billiardsTourBridge.capture();s.state.balls=linked?[{id:1,n:'1',x:1.3,y:.66,active:true}]:[];
    Object.assign(s.state,{allowMissingCueBall:true,shot2Enabled:false,activeShot:1,pocketedLog:[],teachingCompass:{enabled:compass,x:1.25,y:.64,angle:.35,sizePct:35,linkedBallId:linked?1:null}});
    billiardsTourBridge.restore(s);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
   },{compass,linked});
   try{
    await page.goto('http://127.0.0.1:8821/?train=1');await page.waitForFunction(()=>window.billiardsCompassControls&&window.billiardsWorkspaceBallDrag);
    for(const mode of ['2d','3d']){
     if(mode==='3d'){await page.locator('#table3DToggle').click();await page.waitForFunction(()=>Billiards3D.active);await page.locator('#table3DLock [data-adjust=edit]').click();await page.locator('#phoneTrayToggle').click();}
     await fixture();
     for(let id=0;id<=15;id++){
      const chip=page.locator(`#workspaceBalls [data-ball-id="${id}"]`);await chip.scrollIntoViewIfNeeded();
      const q={x:1.2,y:.55},target=await project(q);
      await drag(await middle(`#workspaceBalls [data-ball-id="${id}"]`),target);
      let s=await state(),ball=s.balls.find(b=>b.id===id);assert(ball,`${mode} ${id} placed from tray`);
      near(ball.x,q.x,`${mode} ${id} x`,.015);near(ball.y,q.y,`${mode} ${id} y`,.015);
      const camera=mode==='3d'?await page.evaluate(()=>Billiards3D.camera()):null;
      const source=await project(ball,mode==='3d'?s.ballR:0),tray=await middle('#workspaceBallShelf');
      await start(source);await move({x:source.x,y:source.y+20});await move(tray);
      assert(await page.locator('#workspaceBallShelf').evaluate(e=>e.classList.contains('ball-drop-ready')),`${mode} ${id} tray highlights`);
      await end();s=await state();assert(!s.balls.some(b=>b.id===id),`${mode} ${id} returned to tray`);
      assert(!s.pocketedLog.includes(id),'Stored ball is not counted as pocketed');assert(await chip.isEnabled());
      if(camera)assert.deepEqual(await page.evaluate(()=>Billiards3D.camera()),camera,'Ball transfer preserves camera');
      if(id===0||id===15){await page.keyboard.press('Control+z');assert((await state()).balls.some(b=>b.id===id),'Tray removal undo restores ball');await page.keyboard.press('Control+Shift+z');assert(!(await state()).balls.some(b=>b.id===id),'Tray removal redo');}
     }
     // A release outside the playing surface does not add a ball.
     await drag(await middle('#workspaceBalls [data-ball-id="15"]'),await middle('#workspaceClearBalls'));
     assert.equal((await state()).balls.length,0,'Invalid tray drop is harmless');
     if(touch){
      const q={x:1.2,y:.55};await drag(await middle('#workspaceBalls [data-ball-id="0"]'),await project(q));
      const before=await state();await drag(await project(before.balls[0],mode==='3d'?before.ballR:0),await middle('#workspaceBallShelf'),true);
      assert.deepEqual((await state()).balls,before.balls,'Canceled table drag restores ball');await fixture();
     }
     console.log(`${touch?'touch':'mouse'} ${mode}: all 16 balls transferred both ways, undo/redo and invalid drops passed`);
     await fixture(true);await page.waitForFunction(()=>document.querySelectorAll('.compassHandle:not([hidden])').length===8);
     for(const kind of ['rotate','resize'])for(let i=0;i<4;i++){
      await fixture(true);const before=(await state()).teachingCompass;
      const a=await middle(`[data-handle="${kind}${i}"]`);
      const logical=await page.evaluate(p=>billiardsCompassControls.point({clientX:p.x,clientY:p.y}),a);
      const dx=logical.x-before.x,dy=logical.y-before.y,angle=.23;
      const q=kind==='rotate'?{x:before.x+dx*Math.cos(angle)-dy*Math.sin(angle),y:before.y+dx*Math.sin(angle)+dy*Math.cos(angle)}:{x:before.x+dx*1.15,y:before.y+dy*1.15};
      const camera=mode==='3d'?await page.evaluate(()=>Billiards3D.camera()):null;
      await start(a);await move(a);near((await state()).teachingCompass.angle,before.angle,'No rotation snap');
      await move(await project(q));await end();const after=(await state()).teachingCompass;
      near(after.x,before.x,'Center x retained');near(after.y,before.y,'Center y retained');
      if(kind==='rotate'){near(after.angle-before.angle,angle,'Each dot rotates with grab offset',.015);near(after.sizePct,before.sizePct,'Rotation preserves size');}
      else{assert(after.sizePct>before.sizePct+2,'Each square enlarges compass');near(after.angle,before.angle,'Resize preserves rotation');}
      if(camera)assert.deepEqual(await page.evaluate(()=>Billiards3D.camera()),camera,'Compass does not move camera');
      await page.keyboard.press('Control+z');near((await state()).teachingCompass.sizePct,before.sizePct,'Compass size undo');near((await state()).teachingCompass.angle,before.angle,'Compass rotation undo');
     }
     await fixture(true,true);const linked=await state(),ball=linked.balls[0];
     await page.locator('[data-handle="rotate1"]').press('ArrowRight');const linkedAfter=await state();
     assert.deepEqual(linkedAfter.balls,linked.balls,'Linked rotation leaves object ball fixed');
     near(Math.hypot(linkedAfter.teachingCompass.x-ball.x,linkedAfter.teachingCompass.y-ball.y),2*linkedAfter.ballR,'Linked ghost center remains one diameter from object');
     assert.notEqual(linkedAfter.teachingCompass.angle,linked.teachingCompass.angle);
     await fixture(true);await page.screenshot({path:`${dir}/${touch?'touch':'mouse'}-${mode}-direct-controls.png`});
     await fixture();assert(await page.locator('#compassHandles').isHidden());
     console.log(`${touch?'touch':'mouse'} ${mode}: eight compass handles, stable pivots, linked ball, camera preservation and undo passed`);
    }
    assert.deepEqual(errors,[]);
   }catch(e){await page.screenshot({path:`${dir}/${touch?'touch':'mouse'}-direct-failure.png`});throw e;}finally{await context.close();}
  }
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
