const {chromium}=require('playwright'),assert=require('node:assert/strict'),cp=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const out=path.resolve('test-results/spin-lab');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const server=cp.spawn(process.execPath,['tests/range-server.cjs','8839']);let browser,p;
 try{
  await new Promise((r,j)=>{server.stdout.once('data',r);server.once('error',j)});
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block',hasTouch:true});p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  // Observe the real table draw calls; no production logic is replaced.
  await p.addInitScript(()=>{
   window.__tableStrokes=[];
   const proto=CanvasRenderingContext2D.prototype,clear=proto.clearRect,stroke=proto.stroke;
   proto.clearRect=function(...a){if(this.canvas.id==='canvas')window.__tableStrokes=[];return clear.apply(this,a);};
   proto.stroke=function(...a){if(this.canvas.id==='canvas')window.__tableStrokes.push({color:this.strokeStyle,width:this.lineWidth});return stroke.apply(this,a);};
  });
  await p.goto('http://127.0.0.1:8839/?train=1');await p.waitForFunction(()=>window.billiardsTrainingBall&&window.BilliardsSpinLabUI);
  await p.evaluate(()=>billiardsTourBridge.apply({id:'options-test',title:'Options test',balls:[[0,.25,.5],[1,.6,.5]],target:1,pocket:[1,1],speed:.5,followPercent:0,sidePercent:0},{tableL:2.54,tableW:1.27}));
  await p.getByRole('button',{name:/FEATURES & OPTIONS/}).click();
  assert.deepEqual(await p.locator('.featureOptionsGroup>legend').allTextContents(),['Table','Cue','Aiming','Other']);
  assert.equal(await p.locator('#featureCueOptions #trainerTrainingBall').count(),1);
  assert.equal(await p.locator('[data-ball-preset],[data-ball-axis]').count(),0);
  const state=()=>p.evaluate(()=>billiardsTourBridge.capture().state);
  const baseline=await p.evaluate(()=>billiardsTourBridge.predict());
  await p.locator('#trainingBallStyle').selectOption('split');await p.locator('#trainingBallPreview').scrollIntoViewIfNeeded();
  const box=await p.locator('#trainingBallPreview').boundingBox();assert.equal(box.width,128);assert.equal(box.height,128);
  // Native touch input follows the same pointer path as a finger on the preview.
  const before=(await state()).balls.find(b=>b.id===0).orientation,cdp=await context.newCDPSession(p);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+64,y:box.y+64}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+90,y:box.y+80}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.notDeepEqual((await state()).balls.find(b=>b.id===0).orientation,before,'Finger drag rotates markings');
  assert.deepEqual(await p.evaluate(()=>billiardsTourBridge.predict()),baseline,'Appearance does not change shot physics');
  for(const id of ['showImpact','showTipBadge','showPaths'])await p.locator('#'+id).uncheck();
  const hasStroke=(color,width)=>p.evaluate(({color,width})=>__tableStrokes.some(s=>s.color===color&&Math.abs(s.width-width)<.01),{color,width});
  assert(await hasStroke('#6fff58',1.55),'Shot 1 line starts visible');
  await p.locator('#showShotLine').uncheck();assert(!await hasStroke('#6fff58',1.55));assert(await hasStroke('#d34c3d',5),'Cue stick stays independently visible');
  await p.locator('#showCueStick').uncheck();assert(!await hasStroke('#d34c3d',5));
  assert((await state()).balls.some(b=>b.id===0&&b.active),'Cue ball remains on table');
  assert.deepEqual(await p.evaluate(()=>billiardsTourBridge.predict()),baseline,'Visibility does not change shot physics');
  await p.reload();await p.waitForFunction(()=>window.billiardsTrainingBall);assert.equal((await state()).showShotLine,false);assert.equal((await state()).showCueStick,false);
  await p.evaluate(()=>{const saved=billiardsTourBridge.capture();saved.state.shot2Enabled=true;saved.state.shot2Initialized=true;saved.state.activeShot=2;Object.assign(saved.state.shot2,{x:.6,y:.9,freeAim:{x:1.5,y:.9},angleLock:false,sideSpin:.3,follow:0,speed:.5});billiardsTourBridge.restore(saved);});
  async function options(){const menu=p.locator('#phoneControls:visible, #table3DDrawer:visible').first();if(!await p.getByRole('button',{name:/FEATURES & OPTIONS/}).isVisible())await menu.click();if(!await p.locator('#showShotLine').isVisible())await p.getByRole('button',{name:/FEATURES & OPTIONS/}).click();}
  for(const mode of ['2d','3d']){
   if(mode==='3d'){await p.locator('#table3DToggle').click();await p.waitForFunction(()=>Billiards3D?.active);}
   await options();
   assert(!await hasStroke('#00e5ff',1.45));
   await p.locator('#showShotLine').check();assert(await hasStroke('#6fff58',1.55));assert(await hasStroke('#00e5ff',1.45),'Shot 2 line enabled');
   assert(!await hasStroke('#d34c3d',5));assert(!await hasStroke('#267d91',5));
   await p.locator('#showShotLine').uncheck();assert(!await hasStroke('#6fff58',1.55));assert(!await hasStroke('#00e5ff',1.45));
   await p.locator('#showCueStick').check();assert(await hasStroke('#d34c3d',5));assert(await hasStroke('#267d91',5));
   await p.locator('#showCueStick').uncheck();assert(!await hasStroke('#d34c3d',5));assert(!await hasStroke('#267d91',5));
   if(mode==='3d'){const ids=await p.evaluate(()=>Billiards3D.renderedBalls().map(b=>b.id));assert(ids.includes(0)&&ids.includes('CB2'));}
   await p.locator('#trainerTrainingBall').scrollIntoViewIfNeeded();await p.screenshot({path:path.join(out,'features-options-'+mode+'.png')});
  }
  for(const [name,width,height] of [['tablet',1024,768],['phone-landscape',844,390],['phone-portrait',390,844]]){
   await p.setViewportSize({width,height});await options();await p.locator('#trainingBallPreview').scrollIntoViewIfNeeded();
   const r=await p.locator('#trainingBallPreview').boundingBox(),panel=await p.locator('#panel').boundingBox();assert(r.x>=panel.x&&r.x+r.width<=panel.x+panel.width+1,name);
   await p.screenshot({path:path.join(out,'features-options-'+name+'.png')});
  }
  assert.deepEqual(errors,[]);console.log('PASS: four groups, compact cue selector, removed buttons, touch rotation, independent shot-line and cue controls for both shots in 2D/3D, persistence, unchanged physics and responsive layout.');
 }catch(error){if(p)await p.screenshot({path:path.join(out,'features-options-failure.png')}).catch(()=>{});throw error;}finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
