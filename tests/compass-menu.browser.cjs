const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),{chromium}=require('playwright');
const dir='test-results/compass-menu';fs.mkdirSync(dir,{recursive:true});
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a)),near=(a,b,m,t=.002)=>assert(Math.abs(a-b)<t,m+': '+a+' vs '+b);
(async()=>{
 const server=cp.spawn(process.execPath,['tests/range-server.cjs','8831']);await new Promise(r=>server.stdout.once('data',r));let browser;const failures=[];
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  for(const [width,height,touch,mobile] of [[1366,768,false,false],[1024,768,true,false],[844,390,true,true]]){
   const name=width+'x'+height,context=await browser.newContext({viewport:{width,height},screen:{width,height},hasTouch:touch,isMobile:mobile,serviceWorkers:'block',reducedMotion:'reduce',userAgent:mobile?'Mozilla/5.0 (Linux; Android 16; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36':undefined});
   await context.addInitScript(()=>{window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}};});
   const page=await context.newPage(),errors=[];page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));const cdp=touch?await context.newCDPSession(page):null;
   const state=()=>page.evaluate(()=>billiardsTourBridge.capture().state),compass=()=>page.evaluate(()=>billiardsCompassControls.state());
   const project=q=>page.evaluate(q=>billiardsCompassControls.project(q),q);
   const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const start=async p=>{if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y}]});else{await page.mouse.move(p.x,p.y);await page.mouse.down();}};
   const move=async p=>{if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x,y:p.y}]});else await page.mouse.move(p.x,p.y);};
   const end=async cancel=>{if(touch)await cdp.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});else{if(cancel)await page.keyboard.press('Escape');await page.mouse.up();}await settle();};
   const drag=async(a,b,cancel=false)=>{await start(a);for(let i=1;i<=5;i++)await move({x:a.x+(b.x-a.x)*i/5,y:a.y+(b.y-a.y)*i/5});await end(cancel);};
   const fixture=async(linked=false)=>{await page.evaluate(linked=>{const s=billiardsTourBridge.capture();Object.assign(s.state,{allowMissingCueBall:true,balls:linked?[{id:1,n:'1',x:1.3,y:.66,active:true}]:[],activeShot:1,shot2Enabled:false,pocketedLog:[],teachingCompass:{enabled:true,x:1.27,y:.635,angle:.35,sizePct:24,linkedBallId:linked?1:null}});billiardsTourBridge.restore(s);},linked);await settle();};
   const hit=async(p,kind)=>{const actual=await page.evaluate(p=>{const e=document.elementFromPoint(p.x,p.y);return {action:e?.dataset.compassAction,element:e?.outerHTML.slice(0,160)};},p);assert.equal(actual.action,kind,'Visible compass geometry is hit correctly: '+JSON.stringify(actual));};
   try{
    await page.goto('http://127.0.0.1:8831/?train=1');await page.waitForFunction(()=>window.billiardsMenuReady&&window.billiardsCompassControls);
    let header;
    for(const mode of ['2d','3d','2d','3d']){
     if(await page.evaluate(()=>Billiards3D.active)!==(mode==='3d')){await page.locator('#table3DToggle').click();await page.waitForFunction(active=>Billiards3D.active===active,mode==='3d');}
     await settle();if(!await page.locator('body').evaluate(e=>e.classList.contains('phone-controls-open')))await page.locator('#phoneControls').click();
     const data=await page.evaluate(()=>{const panel=document.querySelector('#panel').getBoundingClientRect();return Object.fromEntries(['#panel h1','#menuHeaderActions','#btg-pool-launchers','#trainerUpdateCheck','#shotSection'].map(s=>{const e=document.querySelector(s),r=e.getBoundingClientRect(),c=getComputedStyle(e);return [s,{x:r.x-panel.x,y:r.y-panel.y,width:r.width,height:r.height,font:c.font,padding:c.padding}];}));});
     assert.equal(await page.locator('#trainerUpdateCheck').evaluate(e=>e.parentElement.id),'trainerUpdateRow','Updates remains in shared row after every view transition');
     if(header)for(const [s,a]of Object.entries(data)){const b=header[s];for(const k of ['x','y','width','height'])assert(Math.abs(a[k]-b[k])<1,name+' '+mode+' '+s+' header '+k+': '+JSON.stringify({actual:a,expected:b}));assert.equal(a.font,b.font,s+' font matches across modes');}
     else header=data;
     await page.screenshot({path:dir+'/'+name+'-'+mode+'-header.png'});await page.locator('#phoneControls').click();
    }
    console.log(name+': shared header identical after 2D→3D→2D→3D');
    for(const mode of ['2d','3d']){
     if(await page.evaluate(()=>Billiards3D.active)!==(mode==='3d')){await page.locator('#table3DToggle').click();await page.waitForFunction(active=>Billiards3D.active===active,mode==='3d');}
     await fixture();assert.equal(await page.locator('.compassHandle').count(),0,'Four extra dots and four squares are gone');assert.equal(await page.locator('.compassHit').count(),3,'Only invisible rim and axis hit strokes remain');
     for(const element of await page.locator('.compassHit').all())assert.equal(await element.evaluate(e=>getComputedStyle(e).stroke),'rgba(0, 0, 0, 0)','Hit areas do not repaint the original compass');
     for(const [i,angle]of [.2,1.4,2.7,4,5.4].entries()){
      await fixture();const before=await compass(),camera=mode==='3d'?await page.evaluate(()=>Billiards3D.camera()):null;
      const a=await project({x:before.x+Math.cos(angle)*before.radius,y:before.y+Math.sin(angle)*before.radius});await hit(a,'resize');
      const factor=i%2?.85:1.15,b=await project({x:before.x+Math.cos(angle)*before.radius*factor,y:before.y+Math.sin(angle)*before.radius*factor});
      await start(a);await move(a);near((await compass()).radius,before.radius,'No resize snap',1e-5);await move(b);await end(false);const after=await compass();
      assert(i%2?after.sizePct<before.sizePct:after.sizePct>before.sizePct,'Rim resizes inward and outward at arbitrary bearings');near(after.angle,before.angle,'Resize preserves angle');near(after.x,before.x,'Resize keeps center X');near(after.y,before.y,'Resize keeps center Y');
      if(camera)assert.deepEqual(await page.evaluate(()=>Billiards3D.camera()),camera,'Rim drag does not move 3D camera');
      await page.keyboard.press('Control+z');near((await compass()).sizePct,before.sizePct,'Rim drag undo');
     }
     for(const axis of [0,1])for(const sign of [-1,1]){
      await fixture();const before=await compass(),bearing=before.angle+axis*Math.PI/2,distance=before.radius*.6;
      const point=a=>({x:before.x+Math.cos(a)*distance,y:before.y+Math.sin(a)*distance});const a=await project(point(bearing));await hit(a,'rotate');await start(a);
      for(let step=1;step<=12;step++){const delta=sign*2*Math.PI*step/12;await move(await project(point(bearing+delta)));near((await compass()).angle,wrap(before.angle+delta),'Either line rotates across all quadrants',.015);}
      await end(false);const after=await compass();near(after.angle,before.angle,'A full turn finishes at the original direction');near(after.sizePct,before.sizePct,'Rotation preserves size');near(after.x,before.x,'Rotation keeps center X');near(after.y,before.y,'Rotation keeps center Y');
     }
     await fixture();let before=await compass(),a=await project({x:before.x+before.radius*Math.cos(.2),y:before.y+before.radius*Math.sin(.2)}),b=await project({x:before.x+before.radius*1.2*Math.cos(.2),y:before.y+before.radius*1.2*Math.sin(.2)});await drag(a,b,true);near((await compass()).sizePct,before.sizePct,'Cancel restores compass size');
     await fixture(true);const linked=await state();await page.locator('.compassHit.rotate[data-axis="1"]').press('ArrowRight');const after=await state();assert.deepEqual(after.balls,linked.balls,'Linked compass rotation leaves object ball fixed');near(Math.hypot(after.teachingCompass.x-after.balls[0].x,after.teachingCompass.y-after.balls[0].y),2*after.ballR,'Linked ghost center keeps one ball-diameter offset',1e-5);
     await fixture();await page.evaluate(()=>document.activeElement?.blur());await page.screenshot({path:dir+'/'+name+'-'+mode+'-compass.png'});
     assert.deepEqual(errors,[]);console.log(name+' '+mode+': invisible rim at five bearings, both lines ±360°, no snap, camera preservation, cancellation, linking, keyboard and undo passed');
    }
   }catch(e){console.error(name+': '+e.stack);failures.push(name+': '+e.message);await page.screenshot({path:dir+'/'+name+'-failure.png'}).catch(()=>{});}
   finally{await context.close();}
  }
  assert.deepEqual(failures,[]);
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
