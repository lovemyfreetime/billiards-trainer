const assert=require('node:assert/strict'),fs=require('node:fs'),{spawn}=require('node:child_process'),{chromium}=require('playwright');
(async()=>{
 const server=spawn(process.execPath,['tests/range-server.cjs','8898']);let browser;
 try{
  await new Promise(r=>server.stdout.once('data',r));browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  const context=await browser.newContext({viewport:{width:1024,height:640},isMobile:true,hasTouch:true,serviceWorkers:'block'});await context.addInitScript(()=>{window.BilliardsWindowsHostAvailable=window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}};});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8898/?train=1');await page.waitForFunction(()=>window.billiardsMenuReady&&window.billiardsGuidance);
  const setup=async(cue='missing')=>page.evaluate(cue=>{const snap=billiardsTourBridge.capture();Object.assign(snap.state,{tableL:2.54,tableW:1.27,activeShot:1,shot2Enabled:false,setupMode:'9ball',guidanceBreak:false,guidanceScratch:false,guidanceEnabled:true,showPocketChances:true,showPocketGhost:true,showPocketGlow:true,showTable:true,showShotLine:true,showShot1:true,showCueVisuals:true,allowMissingCueBall:cue==='missing',balls:[...(cue==='missing'?[]:[{id:0,n:'CB',x:.6,y:.8,active:cue!=='inactive'}]),{id:1,n:'1',x:1.27,y:.3,active:true},{id:2,n:'2',x:1.9,y:.8,active:true}],speed:1.5,follow:0,sideSpin:0,angleLock:false,bankKick:{mode:null,phase:null,rails:[]}});billiardsTourBridge.restore(snap);},cue);
  await setup();await page.locator('#table3DToggle').tap();await page.waitForFunction(()=>Billiards3D.active&&!Billiards3D.camera().transitioning);
  if(await page.evaluate(()=>document.body.classList.contains('phone-tray-hidden')))await page.locator('#phoneTrayToggle').tap();
  const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await settle();
  const cdp=await context.newCDPSession(page),send=async(type,p)=>{await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:p?[p]:[]});await settle();};
  const point=(q,h=0)=>page.evaluate(([q,h])=>{const p=Billiards3D.project(q,h);return {x:p.x,y:p.y};},[q,h]);
  async function dragCue(q){const box=await page.locator('#workspaceBalls [data-ball-id="0"]').boundingBox();assert(box);await send('touchStart',{x:box.x+box.width/2,y:box.y+box.height/2});const target=await point(q);await send('touchMove',target);await send('touchEnd');await settle();return page.evaluate(()=>billiardsTourBridge.capture().state.balls.filter(b=>b.id===0));}
  assert(await page.locator('#workspaceBalls [data-ball-id="0"]').isEnabled());assert.match(await page.locator('#table3DLock strong').innerText(),/^Locked$/);
  let cue=await dragCue({x:1.27,y:.8});assert.equal(cue.length,1);assert(cue[0].active&&Math.abs(cue[0].x-1.27)<.02);assert.match(await page.locator('#table3DLock strong').innerText(),/^Unlocked$/);assert.equal(await page.locator('#table3DLock').getAttribute('aria-checked'),'true');
  cue=await dragCue({x:1.1,y:.75});assert.equal(cue.length,1);assert(Math.hypot(cue[0].x-1.1,cue[0].y-.75)<.02,'an already-present cue ball can be deliberately repositioned from the tray');
  await setup('inactive');cue=await dragCue({x:1.27,y:.8});assert.equal(cue.length,1);assert(cue[0].active,'stale inactive cue is revived rather than rejected or duplicated');
  await page.locator('#table3DLock').tap();assert.match(await page.locator('#table3DLock strong').innerText(),/^Locked$/);
  assert.equal(await page.locator('#table3DPlan').isVisible(),false);
  assert.equal(await page.locator('#table3DPlanVisibility').count(),0);
  assert.match(await page.locator('#table3DShotOrder').getAttribute('aria-label'),/^Ball Detection/);
  const dims=await page.evaluate(()=>['phoneTrayToggle','table3DRackToggle','table3DShotOrder','workspaceClearBalls','table3DLock'].map(id=>{
   const {x,y,width,height}=document.getElementById(id).getBoundingClientRect();return {x,y,width,height};
  }));
  assert(dims.every(d=>Math.abs(d.width-dims[0].width)<.5&&Math.abs(d.height-dims[0].height)<.5&&Math.abs(d.y-dims[0].y)<.5));
  assert(dims.every((d,i)=>!i||d.x>=dims[i-1].x+dims[i-1].width-.5),'Buttons do not overlap');
  const switchButton=page.getByRole('switch',{name:'Move balls'});
  const color=()=>switchButton.evaluate(e=>getComputedStyle(e).backgroundColor);
  const thumb=()=>switchButton.locator('.ballLockTrack').evaluate(e=>getComputedStyle(e,'::after').transform);
  await switchButton.locator('.ballLockLabel').tap();await page.waitForFunction(()=>getComputedStyle(document.querySelector('#table3DLock')).backgroundColor==='rgb(36, 70, 58)');
  assert.equal(await color(),'rgb(36, 70, 58)');assert.equal(await thumb(),'matrix(1, 0, 0, 1, 9, 0)');
  await switchButton.locator('.ballLockTrack').tap();await page.waitForFunction(()=>getComputedStyle(document.querySelector('#table3DLock')).backgroundColor==='rgb(68, 44, 50)');
  assert.equal(await color(),'rgb(68, 44, 50)');assert.equal(await thumb(),'none');
  const packed=await page.locator('#workspaceBalls').evaluate(e=>{const a=[...e.children].map(b=>b.getBoundingClientRect());return {width:e.getBoundingClientRect().width,first:a[0],last:a.at(-1),gap:a[1].left-a[0].right,count:a.length};});assert.equal(packed.count,16);assert(packed.gap<7,'balls use compact gaps instead of stretched grid cells');
  // Use an actual center-pocket prediction, then inspect the render output.
  await page.evaluate(()=>{const snap=billiardsTourBridge.capture();Object.assign(snap.state,{balls:[{id:0,n:'CB',x:1.27,y:.8,active:true},{id:1,n:'1',x:1.27,y:.3,active:true},{id:2,n:'2',x:1.9,y:.8,active:true}],freeAim:{x:1.27,y:.1},guidancePlan:null,guidanceBreak:false,showPocketGlow:true,showPocketGhost:true});billiardsTourBridge.restore(snap);});
  await page.waitForFunction(()=>billiardsGuidance.pocketFeedback().some(p=>p.strength>.8&&p.entry));
  const feedback=await page.evaluate(()=>billiardsGuidance.pocketFeedback().find(p=>p.strength>0));assert.equal(feedback.name,'top middle');
  await page.waitForFunction(()=>Billiards3D.ghostGuides().some(g=>g.kind==='pocket'));
  const ghost=await page.evaluate(()=>Billiards3D.ghostGuides().find(g=>g.kind==='pocket'));assert.equal(ghost.coreColor,0xffdb55);assert(Math.hypot(ghost.x-feedback.entry.x,ghost.y-feedback.entry.y)<1e-8);assert((await page.evaluate(()=>Billiards3D.pocketGeometry())).some(p=>p.glow>.075&&p.glow<=.10));
  await page.waitForFunction(()=>!billiardsGuidance.comparisonStatus().pending&&billiardsGuidance.comparisonStatus().tested===1920);assert((await page.evaluate(()=>billiardsGuidance.comparisonStatus())).maxSliceMs<80);
  const held=await page.evaluate(()=>({aim:billiardsTourBridge.capture().state.freeAim,speed:billiardsTourBridge.capture().state.speed,side:billiardsTourBridge.capture().state.sideSpin}));
  await page.locator('#table3DCueView').tap();await page.waitForFunction(()=>!Billiards3D.camera().transitioning);await settle();
  const labels=await page.evaluate(()=>Billiards3D.overlayLabels().filter(l=>l.id.startsWith('pocket-chance')));assert.equal(labels.length,6);assert(labels.every(l=>l.rail&&l.railPoint&&l.depthTest&&l.color==='#fff'));
  const q=labels[0].rotation,normalY=2*(q[1]*q[2]-q[0]*q[3]);assert(Math.abs(normalY)>.8,'pocket percentages tilt slightly at the cushion edge');
  const middle=labels.find(l=>l.pocketName==='top middle'),hit=await point(middle.railPoint,middle.center[1]);await page.touchscreen.tap(hit.x,hit.y);await page.waitForFunction(()=>!document.getElementById('pocketRouteDetails').hidden);assert.equal(await page.locator('#pocketRouteDetails .pocketRouteRow').count()>=3,true);assert.match(await page.locator('#pocketRouteDetails').innerText(),/Direct[\s\S]*Bank[\s\S]*Kick/);
  assert.deepEqual(await page.evaluate(()=>({aim:billiardsTourBridge.capture().state.freeAim,speed:billiardsTourBridge.capture().state.speed,side:billiardsTourBridge.capture().state.sideSpin})),held,'inspecting alternatives leaves stroke and aim unchanged');
  fs.mkdirSync('test-results/intuitive-table',{recursive:true});await page.screenshot({path:'test-results/intuitive-table/rail-pocket-options.png'});await page.getByRole('button',{name:'Close pocket options',exact:true}).tap();
  await page.evaluate(()=>document.getElementById('showPocketGhost').click());await page.waitForFunction(()=>!Billiards3D.ghostGuides().some(g=>g.kind==='pocket'));await page.reload();await page.waitForFunction(()=>window.billiardsMenuReady);assert.equal(await page.evaluate(()=>billiardsTourBridge.capture().state.showPocketGhost),false,'pocket ghost preference is remembered');
  assert.deepEqual(errors,[]);console.log('Pocket UI: missing/inactive/existing cue tray drag, sole-cue invariant, lock status, compact full tray, actual centered-pot light/yellow entry ghost, remembered toggle, bounded comparisons, low Cue View cushion labels and non-mutating route details passed.');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
